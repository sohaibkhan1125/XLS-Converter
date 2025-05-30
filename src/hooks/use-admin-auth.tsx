
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
    setLoading(true);
    if (user) {
      const isFirestoreAdmin = await checkIfAdminUserExistsInFirestore(user.uid);
      if (isFirestoreAdmin) {
        setAdminUser(user);
      } else {
        setAdminUser(null); 
        // If a non-admin user somehow is authenticated with Firebase session
        // but not in Firestore /admins, they are not considered an adminUser.
        // No need to sign them out here as they might be a regular site user.
        // The admin panel routes will protect themselves based on adminUser.
      }
    } else {
      setAdminUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
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
        // This error will be caught by AdminAuthForm and displayed
        throw new Error("Admin account already exists. Signup is not allowed.");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      if (userCredential.user) {
        await addAdminToFirestore(userCredential.user.uid, userCredential.user.email);
        // onAuthStateChanged will trigger validation and set adminUser for this new admin
        return userCredential.user; 
      }
      return null;
    } catch (error) {
      console.error("Admin Sign up error:", error);
      throw error; // Let the form handle the error type
    } finally {
       // setLoading(false) will be handled by the onAuthStateChanged/validateAndSetAdminUser flow
    }
  };

  const adminSignIn = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      if (userCredential.user) {
        const isFirestoreAdmin = await checkIfAdminUserExistsInFirestore(userCredential.user.uid);
        if (isFirestoreAdmin) {
          // The onAuthStateChanged should handle setting adminUser.
          // To ensure adminUser is set for this specific call for immediate UI updates:
          setAdminUser(userCredential.user);
          setLoading(false);
          return userCredential.user;
        } else {
          // User authenticated with Firebase, but not in /admins collection.
          await firebaseSignOut(auth); // Sign them out of Firebase session.
          setAdminUser(null);
          setLoading(false);
          throw new Error("User is not authorized as an admin."); // This error is caught by AdminAuthForm
        }
      }
      setLoading(false); // Should not reach here if userCredential.user is null
      return null;
    } catch (error) {
      console.error("Admin Sign in error:", error);
      setAdminUser(null); 
      setLoading(false); 
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
      // Ensure loading is false even on error
      setLoading(false);
    } 
    // setLoading(false) is also handled by onAuthStateChanged flow implicitly
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
