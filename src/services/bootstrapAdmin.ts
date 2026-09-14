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

const STANDARD_BRANCHES: { name: string; location: string }[] = [
  { name: 'Kigali', location: 'Kigali' },
  { name: 'Musanze', location: 'Musanze' },
  { name: 'Muhanga', location: 'Muhanga' },
];

export async function bootstrapAdmin(
  fbUser: firebase.User,
  companyNameInput?: string
): Promise<UserProfile | null> {
  try {
    const uid = fbUser.uid;
    const email = (fbUser.email || '').trim().toLowerCase();
    const name =
      fbUser.displayName && fbUser.displayName.trim()
        ? fbUser.displayName.trim()
        : email.split('@')[0] || 'Admin';

    // company doc must be created first (ownerUid == uid, self-claim).
    const companyRef = db.collection('companies').doc(uid);
    const companySnap = await companyRef.get();
    const companyName =
      companySnap.exists
        ? String((companySnap.data() as any)?.companyName || companyNameInput || 'NG Hardware')
        : companyNameInput || companyNameInput?.trim() || 'NG Hardware';

    if (!companySnap.exists) {
      await companyRef.set({
        companyId: uid,
        companyName,
        ownerUid: uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }

    // user admin profile (matches the "Admin signup" branch exactly).
    await db.collection('users').doc(uid).set(
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
        // branch seeding is best-effort; ignore duplicates/rules
      }
    }

    const finalSnap = await db.collection('users').doc(uid).get();
    if (!finalSnap.exists) return null;
    return finalSnap.data() as UserProfile;
  } catch (err) {
    console.warn('bootstrapAdmin failed:', err);
    return null;
  }
}