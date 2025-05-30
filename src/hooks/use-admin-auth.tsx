
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
import { auth } from '@/lib/firebase'; // Reusing the existing Firebase auth instance
import type { AuthFormValues } from '@/components/admin/admin-auth-form'; // Will create this

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
      // Here, we might need a way to distinguish admin users if the same Firebase project is used
      // For now, any user logging in through admin flow is considered an adminUser for this context
      setAdminUser(user);
      setLoading(false);
    }, (error) => {
      console.error("Admin AuthState Error:", error);
      setLoading(false);
    });
      
    return () => unsubscribe();
  }, []);

  const adminSignUp = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      setAdminUser(userCredential.user);
      // Set localStorage flag upon successful first admin signup
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_setup_complete', 'true');
      }
      return userCredential.user;
    } catch (error) {
      console.error("Admin Sign up error:", error);
      setLoading(false);
      throw error as AuthError;
    } finally {
      setLoading(false); // Ensure loading is false
    }
  };

  const adminSignIn = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      setAdminUser(userCredential.user);
      return userCredential.user;
    } catch (error) {
      console.error("Admin Sign in error:", error);
      setLoading(false);
      throw error as AuthError;
    } finally {
      setLoading(false); // Ensure loading is false
    }
  };

  const adminSignOut = async (): Promise<void> => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setAdminUser(null);
    } catch (error) {
      console.error("Admin Sign out error:", error);
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

  return <AdminAuthContext.Provider value={value}>{!loading ? children : <div className="flex h-screen items-center justify-center"><p>Loading Admin Authentication...</p></div>}</AdminAuthContext.Provider>;
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
