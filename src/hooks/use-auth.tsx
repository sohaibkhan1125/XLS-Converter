
"use client";

import type { User, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  GoogleAuthProvider, // Added
  signInWithPopup,    // Added
  getAdditionalUserInfo, // Added
  type UserCredential    // Added
} from 'firebase/auth';
import type React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  signInWithGoogle: () => Promise<User | null>; // Added
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to parse name from displayName
const parseDisplayName = (displayName: string | null): { firstName: string; lastName: string } => {
  if (!displayName) return { firstName: 'User', lastName: '' };
  const nameParts = displayName.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');
  return { firstName, lastName };
};

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
        // Check if user profile exists for non-admins, create if not (e.g., after Google sign-in)
        // This scenario is mostly handled by signInWithGoogle, but as a fallback or for other providers later.
        // For email/password, profile is created explicitly during signUp.
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
        await createUserProfileInFirestore(
          userCredential.user.uid,
          data.firstName,
          data.lastName,
          data.email
        );
        return userCredential.user;
      }
      return null;
    } catch (error) {
      console.error("Sign up error:", error);
      throw error as AuthError; 
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
        setCurrentUser(userCredential.user); // onAuthStateChanged will also set this
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

  const signInWithGoogle = async (): Promise<User | null> => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result: UserCredential = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user) {
        const isActualAdmin = await checkIfAdminUserExistsInFirestore(user.uid);
        if (isActualAdmin) {
          await firebaseSignOut(auth);
          setCurrentUser(null);
          setLoading(false);
          throw new Error("Admin accounts should use the admin login panel for Google Sign-In.");
        }
        
        const additionalInfo = getAdditionalUserInfo(result);
        if (additionalInfo?.isNewUser) {
          const { firstName, lastName } = parseDisplayName(user.displayName);
          await createUserProfileInFirestore(user.uid, firstName, lastName, user.email!);
        }
        // onAuthStateChanged will handle setting currentUser
        return user;
      }
      return null;
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("Google Sign-In popup closed by user."); // Changed from console.error
        setLoading(false);
        return null;
      }
      // For all other errors, log as error and re-throw
      console.error("Google Sign in error:", error);
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
    } finally {
      setLoading(false); // Ensure loading is set to false after signOut operation.
    }
  };

  const value = {
    currentUser,
    loading,
    signUp,
    signIn,
    signInWithGoogle, // Added
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
