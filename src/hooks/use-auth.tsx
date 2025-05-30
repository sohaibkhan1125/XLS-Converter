
"use client";

import type { User, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithRedirect, // Changed from signInWithPopup
  getRedirectResult   // Added for handling redirect
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
  signInWithGoogle: () => Promise<void>; // Return type changed to Promise<void>
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeOnAuthStateChanged: (() => void) | undefined;

    // Process the redirect result from Google Sign-In first
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          // User signed in via redirect.
          // onAuthStateChanged will also fire and set the user,
          // but this ensures we capture the credential from redirect.
          setCurrentUser(result.user); 
          // You could add specific success handling here if needed, e.g., toast or redirect.
        }
      })
      .catch((error: AuthError) => {
        // Handle errors from redirect.
        // These errors occur after returning from Google.
        console.error("Google sign in redirect error:", error);
        // Example: error.code === 'auth/account-exists-with-different-credential'
        // You might want to surface this error to the user, e.g., via a toast or error state.
      })
      .finally(() => {
        // After processing redirect, set up the persistent auth state listener.
        // This is critical and will also set loading to false.
        unsubscribeOnAuthStateChanged = onAuthStateChanged(auth, (user) => {
          setCurrentUser(user);
          setLoading(false);
        });
      });
      
    return () => {
      if (unsubscribeOnAuthStateChanged) {
        unsubscribeOnAuthStateChanged();
      }
    };
  }, []);

  const signUp = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      setCurrentUser(userCredential.user);
      // setLoading(false) will be handled by onAuthStateChanged
      return userCredential.user;
    } catch (error) {
      console.error("Sign up error:", error);
      setLoading(false); // Ensure loading is false on direct error
      throw error as AuthError;
    }
  };

  const signIn = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      setCurrentUser(userCredential.user);
      // setLoading(false) will be handled by onAuthStateChanged
      return userCredential.user;
    } catch (error) {
      console.error("Sign in error:", error);
      setLoading(false); // Ensure loading is false on direct error
      throw error as AuthError;
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    setLoading(true); // Set loading true before initiating redirect
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
      // Page will redirect, so no user object to return here.
      // setLoading(false) will be handled by the useEffect and onAuthStateChanged after redirect.
    } catch (error) {
      console.error("Google sign in initiation error:", error);
      setLoading(false); // If redirect initiation fails, set loading false.
      throw error as AuthError; // Re-throw for AuthForm to handle
    }
  };

  const signOut = async (): Promise<void> => {
    // setLoading(true); // Not strictly needed as onAuthStateChanged will handle UI update
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null); // Explicitly set user to null
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      // setLoading(false); // onAuthStateChanged handles this
    }
  };

  const value = {
    currentUser,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };

  // Render children only when not loading to prevent flash of unauthenticated content,
  // or when redirect processing is complete.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
