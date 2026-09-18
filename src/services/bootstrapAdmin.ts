import firebase from 'firebase/compat/app';
import { db } from '../firebase';
import { UserProfile, UserRole } from '../types';

// First-time provisioning without Cloud Functions.
//
// The deployed Firestore rules already whitelist these exact write shapes:
//   - companies/{uid} create:  ownerUid == uid && companyId == uid
//   - users/{uid} create:      the "Admin signup" branch
//                              (role 'admin', companyId == uid,
//                               email == request.auth.token.email, exact keys)
//   - branches create:         isAdmin() && companyId == myCompanyId()
//
// So a console-created admin account can bootstrap itself purely via the
// client SDK on first sign-in. No billing-plan / Cloud Function needed.
//
// Note on concurrency: sign-in triggers BOTH handleSignin (Auth.tsx) and
// AuthContext.onAuthStateChanged, so this module runs only ONE provisioning
// pass per process (deduped via a shared in-flight promise) and retries the
// read after the write (persistence may serve a stale cache briefly).

const STANDARD_BRANCHES: { name: string; location: string }[] = [
  { name: 'Kigali', location: 'Kigali' },
  { name: 'Musanze', location: 'Musanze' },
  { name: 'Muhanga', location: 'Muhanga' },
];

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

let inFlight: Promise<UserProfile | null> | null = null;

export function bootstrapAdmin(
  fbUser: firebase.User,
  companyNameInput?: string
): Promise<UserProfile | null> {
  if (inFlight) return inFlight;
  inFlight = provision(fbUser, companyNameInput).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function provision(
  fbUser: firebase.User,
  companyNameInput?: string
): Promise<UserProfile | null> {
  const uid = fbUser.uid;
  const email = (fbUser.email || '').trim().toLowerCase();
  const name =
    fbUser.displayName && fbUser.displayName.trim()
      ? fbUser.displayName.trim()
      : email.split('@')[0] || 'Admin';

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const done = await provisionOnce(uid, name, email, companyNameInput);
      if (done) return done;
    } catch (err) {
      console.warn(`bootstrapAdmin attempt ${attempt + 1} failed:`, err);
    }
    await sleep(350 * (attempt + 1));
  }
  return null;
}

async function provisionOnce(
  uid: string,
  name: string,
  email: string,
  companyNameInput?: string
): Promise<UserProfile | null> {
  // Already provisioned by a previous click -> return the profile.
  const userRef = db.collection('users').doc(uid);
  const existingSnap = await userRef.get();
  if (existingSnap.exists) return existingSnap.data() as UserProfile;

  // company doc must be created first (ownerUid == uid, self-claim).
  const companyRef = db.collection('companies').doc(uid);
  const companySnap = await companyRef.get();
  const companyName = companySnap.exists
    ? String((companySnap.data() as any)?.companyName || companyNameInput || 'NG Hardware')
    : (companyNameInput || 'NG Hardware').trim() || 'NG Hardware';

  if (!companySnap.exists) {
    await companyRef.set({
      companyId: uid,
      companyName,
      ownerUid: uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  // user admin profile (matches the "Admin signup" branch exactly).
  await userRef.set(
    {
      uid,
      name,
      companyName,
      email,
      role: UserRole.ADMIN,
      companyId: uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // seed standard branches (create rule: isAdmin() && companyId == myCompanyId()).
  try {
    const branchSnap = await db
      .collection('branches')
      .where('companyId', '==', uid)
      .limit(1)
      .get();
    if (branchSnap.empty) {
      for (const b of STANDARD_BRANCHES) {
        try {
          await db.collection('branches').add({
            companyId: uid,
            name: b.name,
            location: b.location,
            description: '',
            isActive: true,
            createdBy: uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        } catch {
          // ignore per-branch failures
        }
      }
    }
  } catch {
    // branch seeding is best-effort
  }

  // Re-read with retries so we never return null after a successful write.
  for (let i = 0; i < 4; i++) {
    const snap = await userRef.get();
    if (snap.exists) return snap.data() as UserProfile;
    await sleep(250);
  }
  return null;
}