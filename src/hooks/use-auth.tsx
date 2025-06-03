
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
import { checkIfAdminUserExistsInFirestore } from '@/lib/firebase-admin-service'; 
import { createUserProfileInFirestore } from '@/lib/firebase-user-service'; // Import new service

// Updated to include name fields for signup
export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// For basic email/password sign-in
export interface SignInData {
  email: string;
  password: string;
}

interface AuthContextType {
  currentUser: User | null; // This user is confirmed NOT to be an admin
  loading: boolean;
  signUp: (data: SignUpData) => Promise<User | null>;
  signIn: (data: SignInData) => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null); 
  const [currentUser, setCurrentUser] = useState<User | null>(null); 
  const [loading, setLoading] = useState(true);

  const validateAndSetCurrentUser = useCallback(async (user: User | null) => {
    setLoading(true);
    if (user) {
      const isActualAdmin = await checkIfAdminUserExistsInFirestore(user.uid);
      if (isActualAdmin) {
        setCurrentUser(null); 
      } else {
        setCurrentUser(user); 
      }
    } else {
      setCurrentUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribeOnAuthStateChanged = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user); 
      validateAndSetCurrentUser(user); 
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

  const signUp = async (data: SignUpData): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      if (userCredential.user) {
        // After successful auth user creation, create their profile in Firestore
        await createUserProfileInFirestore(
          userCredential.user.uid,
          data.firstName,
          data.lastName,
          data.email
        );
        // onAuthStateChanged will handle setting currentUser after validation.
        return userCredential.user;
      }
      return null; // Should not happen if createUserWithEmailAndPassword succeeds
    } catch (error) {
      console.error("Sign up error:", error);
      throw error as AuthError; 
    } finally {
      // setLoading will be handled by onAuthStateChanged/validateAndSetCurrentUser flow
    }
  };

  const signIn = async (data: SignInData): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      if (userCredential.user) {
        const isActualAdmin = await checkIfAdminUserExistsInFirestore(userCredential.user.uid);
        if (isActualAdmin) {
          await firebaseSignOut(auth); 
          setCurrentUser(null);
          setLoading(false);
          throw new Error("Admin accounts should use the admin login panel.");
        }
        setCurrentUser(userCredential.user);
        setLoading(false);
        return userCredential.user;
      }
      setLoading(false); 
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
