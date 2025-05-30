
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
      // For admin context, we need to ensure this user is indeed the admin.
      // This can be complex if main site users can also authenticate.
      // For now, AdminProtectedLayout handles redirection based on adminUser state.
      // We can enhance this by checking if user.email matches stored admin_user_email
      // if admin_setup_complete is true.
      if (typeof window !== 'undefined') {
        const adminSetupComplete = localStorage.getItem('admin_setup_complete') === 'true';
        const adminEmail = localStorage.getItem('admin_user_email');
        if (user && adminSetupComplete && adminEmail && user.email === adminEmail) {
          setAdminUser(user);
        } else if (user && !adminSetupComplete) {
          // If setup is not complete, any user signing up via admin flow is potentially the admin
          // This path is mainly for the brief period during/after signup before redirect.
          // The signup page logic should robustly check admin_setup_complete.
          setAdminUser(user); 
        } else {
          setAdminUser(null);
        }
      } else {
        setAdminUser(null); // Default to null if not in browser (SSR initial state)
      }
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
      // setAdminUser(userCredential.user); // onAuthStateChanged will handle this
      // Set localStorage flags upon successful first admin signup
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_setup_complete', 'true');
        localStorage.setItem('admin_user_email', userCredential.user.email || '');
      }
      return userCredential.user;
    } catch (error) {
      console.error("Admin Sign up error:", error);
      throw error as AuthError;
    } finally {
      setLoading(false); 
    }
  };

  const adminSignIn = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      // setAdminUser(userCredential.user); // onAuthStateChanged will handle this
      // We need to ensure only the registered admin can sign in.
      if (typeof window !== 'undefined') {
        const adminSetupComplete = localStorage.getItem('admin_setup_complete') === 'true';
        const adminEmail = localStorage.getItem('admin_user_email');
        if (adminSetupComplete && adminEmail && userCredential.user.email === adminEmail) {
          return userCredential.user;
        } else {
          // If not the registered admin, sign them out immediately from this context
          await firebaseSignOut(auth); 
          throw { code: 'auth/invalid-admin-user', message: 'This account is not authorized for admin access.' };
        }
      }
      // Should not reach here if localStorage check fails
      return userCredential.user; 
    } catch (error) {
      console.error("Admin Sign in error:", error);
      throw error as AuthError;
    } finally {
      setLoading(false);
    }
  };

  const adminSignOut = async (): Promise<void> => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // setAdminUser(null); // onAuthStateChanged will handle this
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

  // Avoid rendering children until loading is complete to prevent layout shifts or premature access checks
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
