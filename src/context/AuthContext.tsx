import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import firebase from 'firebase/compat/app';
import { auth, db } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: firebase.User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  getToken: () => Promise<string>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const getToken = useCallback(async (): Promise<string> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return '';
    return currentUser.getIdToken();
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          let backendProfile: UserProfile = await authApi.getProfile();
          setProfile(backendProfile);
        } catch (err) {
          // Backend profile missing or server unavailable. Fall back to Firestore,
          // then push the Firestore profile to MongoDB so tenant keys (companyId)
          // stay consistent between both stores.
          console.warn('Backend profile sync failed, checking Firestore:', err);
          try {
            const docSnap = await db.collection('users').doc(firebaseUser.uid).get();
            const firestoreProfile = docSnap.exists
              ? (docSnap.data() as UserProfile)
              : null;
            if (firestoreProfile) {
              setProfile(firestoreProfile);
              try {
                await authApi.registerProfile({
                  uid: firestoreProfile.uid,
                  name: firestoreProfile.name,
                  email: firestoreProfile.email,
                  companyName: firestoreProfile.companyName,
                  companyId: firestoreProfile.companyId,
                  role: firestoreProfile.role,
                });
              } catch (e) {
                console.warn('Failed to mirror profile to backend:', e);
              }
            } else {
              const userDoc = await db.collection('companies').doc(firebaseUser.uid).get();
              if (userDoc.exists) {
                const company = userDoc.data() as { companyName?: string };
                setProfile({
                  uid: firebaseUser.uid,
                  name: firebaseUser.displayName || firebaseUser.email || '',
                  email: firebaseUser.email || '',
                  role: UserRole.ADMIN,
                  companyId: firebaseUser.uid,
                  companyName: company?.companyName,
                  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                } as UserProfile);
              } else {
                setProfile(null);
                const createdRecently =
                  !!firebaseUser.metadata?.creationTime &&
                  Date.now() - new Date(firebaseUser.metadata.creationTime).getTime() < 20000;
                if (createdRecently) {
                  setTimeout(async () => {
                    try {
                      const retrySnap = await db
                        .collection('users')
                        .doc(firebaseUser.uid)
                        .get();
                      if (retrySnap.exists) setProfile(retrySnap.data() as UserProfile);
                    } catch {
                      // ignore retry failure
                    }
                  }, 1500);
                }
              }
            }
          } catch (e) {
            console.warn('Failed to fetch Firestore profile:', e);
            setProfile(null);
          }
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = useCallback(async () => {
    await auth.signOut();
  }, []);

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    try {
      const backendProfile = await authApi.getProfile();
      setProfile(backendProfile);
      return backendProfile;
    } catch {
      try {
        const docSnap = await db.collection('users').doc(currentUser.uid).get();
        if (!docSnap.exists) return null;
        const firestoreProfile = docSnap.data() as UserProfile;
        setProfile(firestoreProfile);
        return firestoreProfile;
      } catch {
        return null;
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signOut, getToken, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
