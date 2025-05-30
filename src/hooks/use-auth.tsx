
"use client";

import type { User, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  // GoogleAuthProvider, // No longer needed
  // signInWithRedirect, // No longer needed
  // getRedirectResult   // No longer needed
} from 'firebase/auth';
import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import type { AuthFormValues } from '@/components/auth/auth-form';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signUp: (values: AuthFormValues) => Promise<User | null>;
  signIn: (values: AuthFormValues) => Promise<User | null>;
  // signInWithGoogle: () => Promise<void>; // Removed
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeOnAuthStateChanged = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
      
    return () => {
      unsubscribeOnAuthStateChanged();
    };
  }, []);

  const signUp = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      setCurrentUser(userCredential.user);
      return userCredential.user;
    } catch (error) {
      console.error("Sign up error:", error);
      setLoading(false);
      throw error as AuthError;
    }
  };

  const signIn = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      setCurrentUser(userCredential.user);
      return userCredential.user;
    } catch (error) {
      console.error("Sign in error:", error);
      setLoading(false);
      throw error as AuthError;
    }
  };

  // signInWithGoogle function removed

  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const value = {
    currentUser,
    loading,
    signUp,
    signIn,
    // signInWithGoogle, // Removed
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
