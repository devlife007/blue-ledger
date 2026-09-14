import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import firebase from 'firebase/compat/app';
import { auth, db } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { authApi } from '../services/api';
import { bootstrapAdmin } from '../services/bootstrapAdmin';

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
          // Firestore is the source of truth for profiles. No REST/backend call
          // on the critical path (the local API server is optional).
          const docSnap = await db.collection('users').doc(firebaseUser.uid).get();
          if (docSnap.exists) {
            const firestoreProfile = docSnap.data() as UserProfile;
            setProfile(firestoreProfile);
            // Best-effort mirror to the optional backend (never blocks auth).
            try {
              await authApi.registerProfile({
                uid: firestoreProfile.uid,
                name: firestoreProfile.name,
                email: firestoreProfile.email,
                companyName: firestoreProfile.companyName,
                companyId: firestoreProfile.companyId,
                role: firestoreProfile.role,
              });
            } catch {
              // Backend offline or missing — Firestore profile is already active.
            }
          } else {
            // Console-created user with no profile yet. Bootstrap via the
            // client-side path the deployed rules already allow (companies +
            // users + branches). No Cloud Function / billing plan needed.
            const provisioned = await bootstrapAdmin(firebaseUser, 'NG Hardware');
            if (provisioned) setProfile(provisioned);
            else setProfile(null);
          }
        } catch (err) {
          console.warn('Failed to fetch Firestore profile:', err);
          setProfile(null);
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
      const docSnap = await db.collection('users').doc(currentUser.uid).get();
      if (docSnap.exists) {
        const firestoreProfile = docSnap.data() as UserProfile;
        setProfile(firestoreProfile);
        return firestoreProfile;
      }
      // Profile missing (e.g. console-created user). Bootstrap client-side.
      const provisioned = await bootstrapAdmin(currentUser, 'NG Hardware');
      if (provisioned) {
        setProfile(provisioned);
        return provisioned;
      }
      setProfile(null);
      return null;
    } catch (err) {
      console.warn('refreshProfile failed:', err);
      setProfile(null);
      return null;
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
