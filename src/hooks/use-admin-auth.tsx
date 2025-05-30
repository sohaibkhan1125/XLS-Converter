
"use client";

import type { User, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
} from 'firebase/auth';
import type React from 'react';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase'; 
import type { AuthFormValues } from '@/components/admin/admin-auth-form'; 

interface AdminAuthContextType {
  adminUser: User | null;
  loading: boolean;
  adminSignUp: (values: AuthFormValues) => Promise<User | null>;
  adminSignIn: (values: AuthFormValues) => Promise<User | null>;
  adminSignOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAdminUser(user); // Directly set the user from Firebase
      setLoading(false);
    }, (error) => {
      console.error("Admin AuthState Error:", error);
      setAdminUser(null);
      setLoading(false);
    });
      
    return () => unsubscribe();
  }, []);

  const adminSignUp = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      // onAuthStateChanged will set adminUser
      return userCredential.user;
    } catch (error) {
      console.error("Admin Sign up error:", error);
      throw error as AuthError; // Firebase AuthError will be caught by the form
    } finally {
      setLoading(false); 
    }
  };

  const adminSignIn = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      // onAuthStateChanged will set adminUser
      return userCredential.user; 
    } catch (error) {
      console.error("Admin Sign in error:", error);
      throw error as AuthError; // Firebase AuthError will be caught by the form
    } finally {
      setLoading(false);
    }
  };

  const adminSignOut = async (): Promise<void> => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set adminUser to null
    } catch (error) {
      console.error("Admin Sign out error:", error);
      // Optionally rethrow or handle
    } finally {
      setLoading(false);
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
