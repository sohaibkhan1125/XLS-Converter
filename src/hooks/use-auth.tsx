
"use client";

import type { User, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
  type UserCredential
} from 'firebase/auth';
import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react'; // Removed useCallback as it's not strictly needed with the new effect structure
import { auth } from '@/lib/firebase';
import { checkIfAdminUserExistsInFirestore } from '@/lib/firebase-admin-service'; 
import { createUserProfileInFirestore } from '@/lib/firebase-user-service';

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface SignInData {
  email: string;
  password: string;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<User | null>;
  signIn: (data: SignInData) => Promise<User | null>;
  signInWithGoogle: () => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const parseDisplayName = (displayName: string | null): { firstName: string; lastName: string } => {
  if (!displayName) return { firstName: 'User', lastName: '' };
  const nameParts = displayName.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');
  return { firstName, lastName };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This function will be called by onAuthStateChanged
    const handleAuthStateChange = async (user: User | null) => {
      setLoading(true); // Start loading when auth state might be changing
      if (user) {
        try {
          const isActualAdmin = await checkIfAdminUserExistsInFirestore(user.uid);
          if (isActualAdmin) {
            setCurrentUser(null); // Admins should not be "current users" in the public context
          } else {
            setCurrentUser(user); // Set current user if not an admin
          }
        } catch (e) {
          console.error("Error during admin check in AuthProvider's onAuthStateChanged:", e);
          setCurrentUser(null); // Fallback: if admin check fails, assume not a valid public user session
        }
      } else {
        setCurrentUser(null); // No user, set current user to null
      }
      setLoading(false); // Finish loading after processing
    };

    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange, (error) => {
      console.error("Main AuthState Error in onAuthStateChanged listener:", error);
      setCurrentUser(null); 
      setLoading(false);
    });
      
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []); // Empty dependency array: runs once on mount, cleans up on unmount

  const signUp = async (data: SignUpData): Promise<User | null> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      if (userCredential.user) {
        // Profile creation for new email/password sign-ups
        await createUserProfileInFirestore(
          userCredential.user.uid,
          data.firstName,
          data.lastName,
          data.email
        );
        // onAuthStateChanged will handle setting currentUser and loading state
        return userCredential.user;
      }
      return null;
    } catch (error) {
      console.error("Sign up error:", error);
      throw error as AuthError; 
    }
  };

  const signIn = async (data: SignInData): Promise<User | null> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      if (userCredential.user) {
        // Prevent admins from using public sign-in
        const isActualAdmin = await checkIfAdminUserExistsInFirestore(userCredential.user.uid);
        if (isActualAdmin) {
          await firebaseSignOut(auth); // Sign out immediately; onAuthStateChanged will handle context
          throw new Error("Admin accounts should use the admin login panel.");
        }
        // onAuthStateChanged will handle setting currentUser and loading state
        return userCredential.user;
      }
      return null;
    } catch (error) {
      console.error("Sign in error:", error);
      throw error as AuthError; 
    }
  };

  const signInWithGoogle = async (): Promise<User | null> => {
    const provider = new GoogleAuthProvider();
    try {
      const result: UserCredential = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user) {
        // Prevent admins from using public Google sign-in
        const isActualAdmin = await checkIfAdminUserExistsInFirestore(user.uid);
        if (isActualAdmin) {
          await firebaseSignOut(auth); // Sign out immediately; onAuthStateChanged will handle context
          throw new Error("Admin accounts should use the admin login panel for Google Sign-In.");
        }
        
        const additionalInfo = getAdditionalUserInfo(result);
        if (additionalInfo?.isNewUser) {
          const { firstName, lastName } = parseDisplayName(user.displayName);
          await createUserProfileInFirestore(user.uid, firstName, lastName, user.email!);
        }
        // onAuthStateChanged will handle setting currentUser and loading state
        return user;
      }
      return null;
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("Google Sign-In popup closed by user.");
        // loading state will be handled by onAuthStateChanged (or not change if auth state didn't change)
        return null;
      }
      console.error("Google Sign in error:", error);
      throw error as AuthError;
    }
  };

  const signOutUser = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle setting currentUser to null and updating loading state.
    } catch (error) {
      console.error("Sign out error:", error);
      // If onAuthStateChanged doesn't fire on error (it should on success),
      // ensure loading is handled if it was set true at start of an operation.
      // But here, onAuthStateChanged is the main handler.
    }
  };

  const value = {
    currentUser,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut: signOutUser, // Use the renamed function
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
