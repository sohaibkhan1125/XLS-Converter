
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
      if (typeof window !== 'undefined') {
        const adminSetupComplete = localStorage.getItem('admin_setup_complete') === 'true';
        const adminEmail = localStorage.getItem('admin_user_email');

        if (user && adminSetupComplete && adminEmail && user.email === adminEmail) {
          // This is the admin user; don't set them as currentUser for the main site context.
          setCurrentUser(null);
        } else {
          // This is a regular user, no user, or admin checks didn't match.
          setCurrentUser(user);
        }
      } else {
        // Fallback for non-browser environments (e.g., initial SSR state if applicable)
        setCurrentUser(user);
      }
      setLoading(false);
    }, (error) => {
      console.error("Main AuthState Error:", error);
      // It's important to set loading to false even on error to unblock UI.
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
      // Prevent admin email from signing up as a regular user
      if (typeof window !== 'undefined') {
        const adminSetupComplete = localStorage.getItem('admin_setup_complete') === 'true';
        const adminEmail = localStorage.getItem('admin_user_email');
        if (adminSetupComplete && adminEmail && values.email === adminEmail) {
          throw { code: 'auth/admin-email-conflict', message: 'This email is reserved for admin use.' };
        }
      }
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      // setCurrentUser(userCredential.user); // onAuthStateChanged will handle this
      return userCredential.user;
    } catch (error) {
      console.error("Sign up error:", error);
      throw error as AuthError; // Rethrow to be caught by AuthForm
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      // Prevent admin from signing in as a regular user via main login form
       if (typeof window !== 'undefined') {
        const adminSetupComplete = localStorage.getItem('admin_setup_complete') === 'true';
        const adminEmail = localStorage.getItem('admin_user_email');
        if (adminSetupComplete && adminEmail && values.email === adminEmail) {
           // Instead of throwing error, we can just let them sign in via Firebase,
           // but onAuthStateChanged will nullify them for AuthContext.
           // Or, provide a specific message:
          throw { code: 'auth/admin-login-attempt', message: 'Admin accounts should use the /admin login page.' };
        }
      }
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      // setCurrentUser(userCredential.user); // onAuthStateChanged will handle this
      return userCredential.user;
    } catch (error) {
      console.error("Sign in error:", error);
      throw error as AuthError; // Rethrow to be caught by AuthForm
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true); // Indicate activity
    try {
      await firebaseSignOut(auth);
      // setCurrentUser(null); // onAuthStateChanged will handle this
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

  // Render children only when not loading to prevent premature rendering based on stale auth state.
  // This can be a simple loader or null until auth state is resolved.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
