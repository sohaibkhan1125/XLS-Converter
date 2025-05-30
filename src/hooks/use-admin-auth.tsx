
"use client";

import type { User, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
} from 'firebase/auth';
import type React from 'react';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { auth } from '@/lib/firebase'; 
import type { AuthFormValues } from '@/components/admin/admin-auth-form'; 
import { 
  checkIfAdminUserExistsInFirestore, 
  checkIfAnyAdminSetupInFirestore, 
  addAdminToFirestore 
} from '@/lib/firebase-admin-service';

interface AdminAuthContextType {
  adminUser: User | null; // This user is confirmed to be an admin via Firestore
  loading: boolean; // Covers Firebase Auth and Firestore checks
  adminSignUp: (values: AuthFormValues) => Promise<User | null>;
  adminSignIn: (values: AuthFormValues) => Promise<User | null>;
  adminSignOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null); // Raw Firebase auth user
  const [adminUser, setAdminUser] = useState<User | null>(null); // Validated admin user
  const [loading, setLoading] = useState(true);

  const validateAndSetAdminUser = useCallback(async (user: User | null) => {
    if (user) {
      const isFirestoreAdmin = await checkIfAdminUserExistsInFirestore(user.uid);
      if (isFirestoreAdmin) {
        setAdminUser(user);
      } else {
        setAdminUser(null); // Firebase user exists but is not in Firestore /admins
        // Optionally sign them out of Firebase if they shouldn't be here at all
        // await firebaseSignOut(auth); 
      }
    } else {
      setAdminUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(true); // Start loading when Firebase auth state changes
      setFirebaseUser(user); // Store raw Firebase user
      validateAndSetAdminUser(user);
    }, (error) => {
      console.error("Admin AuthState Error:", error);
      setFirebaseUser(null);
      setAdminUser(null);
      setLoading(false);
    });
      
    return () => unsubscribe();
  }, [validateAndSetAdminUser]);

  const adminSignUp = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      const anyAdminExists = await checkIfAnyAdminSetupInFirestore();
      if (anyAdminExists) {
        throw new Error("Admin account already exists. Signup is not allowed.");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      if (userCredential.user) {
        await addAdminToFirestore(userCredential.user.uid, userCredential.user.email);
        // onAuthStateChanged will trigger validation and set adminUser
        // No need to call setAdminUser directly here to avoid race conditions with onAuthStateChanged
        return userCredential.user; 
      }
      return null;
    } catch (error) {
      console.error("Admin Sign up error:", error);
      throw error; // Let the form handle the error type
    } finally {
      // setLoading(false) will be handled by the onAuthStateChanged flow
    }
  };

  const adminSignIn = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      // Firebase auth successful. onAuthStateChanged will fire, triggering validateAndSetAdminUser.
      // That validation will determine if this Firebase user is a *true* admin.
      // We need to ensure that this promise resolves *after* Firestore validation completes for this specific sign-in action.

      if (userCredential.user) {
        const isFirestoreAdmin = await checkIfAdminUserExistsInFirestore(userCredential.user.uid);
        if (isFirestoreAdmin) {
          // The onAuthStateChanged might have already run, but to be sure for this specific call:
          setAdminUser(userCredential.user); 
          setLoading(false);
          return userCredential.user;
        } else {
          // Firebase auth succeeded, but user is not in Firestore admins.
          await firebaseSignOut(auth); // Sign them out of Firebase as they are not a valid admin.
          setAdminUser(null);
          setLoading(false);
          throw new Error("User is not authorized as an admin.");
        }
      }
      setLoading(false);
      return null;
    } catch (error) {
      console.error("Admin Sign in error:", error);
      setAdminUser(null); // Ensure adminUser is null on error
      setLoading(false); // Ensure loading is false on error
      throw error; 
    }
  };

  const adminSignOut = async (): Promise<void> => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set firebaseUser to null, which then sets adminUser to null.
    } catch (error) {
      console.error("Admin Sign out error:", error);
    } finally {
      // setLoading(false) handled by onAuthStateChanged flow
    }
  };

  const value = {
    adminUser,
    loading,
    adminSignUp,
    adminSignIn,
    adminSignOut,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
