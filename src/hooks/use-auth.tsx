
"use client";

import type { User, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeOnAuthStateChanged = onAuthStateChanged(auth, (user) => {
      // Standard auth state handling, no special admin exclusion
      setCurrentUser(user);
      setLoading(false);
    }, (error) => {
      console.error("Main AuthState Error:", error);
      setCurrentUser(null); 
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
      return userCredential.user;
    } catch (error) {
      console.error("Sign up error:", error);
      throw error as AuthError; 
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      return userCredential.user;
    } catch (error) {
      console.error("Sign in error:", error);
      throw error as AuthError; 
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true); 
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
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
