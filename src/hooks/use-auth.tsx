
"use client";

import type { User, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
} from 'firebase/auth';
import type React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import type { AuthFormValues } from '@/components/auth/auth-form';
import { checkIfAdminUserExistsInFirestore } from '@/lib/firebase-admin-service'; 

interface AuthContextType {
  currentUser: User | null; // This user is confirmed NOT to be an admin
  loading: boolean;
  signUp: (values: AuthFormValues) => Promise<User | null>;
  signIn: (values: AuthFormValues) => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null); // Raw Firebase auth user
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Validated non-admin user
  const [loading, setLoading] = useState(true);

  const validateAndSetCurrentUser = useCallback(async (user: User | null) => {
    setLoading(true);
    if (user) {
      const isActualAdmin = await checkIfAdminUserExistsInFirestore(user.uid);
      if (isActualAdmin) {
        setCurrentUser(null); // If user is an admin, don't set them as currentUser for main site
      } else {
        setCurrentUser(user); // User is not an admin, set as currentUser
      }
    } else {
      setCurrentUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribeOnAuthStateChanged = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user); // Store raw Firebase user first
      validateAndSetCurrentUser(user); // Then validate and set current user (or null if admin)
    }, (error) => {
      console.error("Main AuthState Error:", error);
      setFirebaseUser(null);
      setCurrentUser(null); 
      setLoading(false);
    });
      
    return () => {
      unsubscribeOnAuthStateChanged();
    };
  }, [validateAndSetCurrentUser]);

  const signUp = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      // onAuthStateChanged will validate if this new user is an admin and set currentUser accordingly.
      return userCredential.user;
    } catch (error) {
      console.error("Sign up error:", error);
      throw error as AuthError; 
    } finally {
      // setLoading will be handled by onAuthStateChanged/validateAndSetCurrentUser flow
    }
  };

  const signIn = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      if (userCredential.user) {
        const isActualAdmin = await checkIfAdminUserExistsInFirestore(userCredential.user.uid);
        if (isActualAdmin) {
          await firebaseSignOut(auth); 
          setCurrentUser(null);
          setLoading(false);
          throw new Error("Admin accounts should use the admin login panel.");
        }
        // Not an admin, onAuthStateChanged would handle setting currentUser.
        // For immediate feedback:
        setCurrentUser(userCredential.user);
        setLoading(false);
        return userCredential.user;
      }
      setLoading(false); // Should not be reached if userCredential.user is null
      return null;
    } catch (error) {
      console.error("Sign in error:", error);
      setCurrentUser(null);
      setLoading(false);
      throw error as AuthError; 
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true); 
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set firebaseUser and currentUser to null.
    } catch (error) {
      console.error("Sign out error:", error);
      setLoading(false); 
    }
  };

  const value = {
    currentUser,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
