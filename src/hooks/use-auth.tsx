
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
import { createContext, useContext, useEffect, useState } from 'react';
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
    const handleAuthStateChange = async (user: User | null) => {
      console.log("[AuthHook] onAuthStateChanged: Listener triggered. Incoming user UID:", user ? user.uid : 'null');
      setLoading(true);
      console.log("[AuthHook] onAuthStateChanged: Set loading to true.");

      let finalUserForContext: User | null = null;

      if (user) {
        try {
          console.log(`[AuthHook] onAuthStateChanged: Processing user: ${user.uid}, Email: ${user.email}`);
          const isActualAdmin = await checkIfAdminUserExistsInFirestore(user.uid);
          console.log(`[AuthHook] onAuthStateChanged: Is user ${user.uid} admin? ${isActualAdmin}`);
          if (isActualAdmin) {
            console.log(`[AuthHook] onAuthStateChanged: User ${user.uid} IS an admin. Context user will be null.`);
            finalUserForContext = null;
          } else {
            console.log(`[AuthHook] onAuthStateChanged: User ${user.uid} is NOT an admin. Context user will be set.`);
            finalUserForContext = user;
          }
        } catch (e) {
          console.error("[AuthHook] onAuthStateChanged: Error during admin check for user", user.uid, e);
          finalUserForContext = null; // Error during check, treat as not logged in for context
        }
      } else {
        console.log("[AuthHook] onAuthStateChanged: No Firebase user (logged out or initial state). Context user will be null.");
        finalUserForContext = null;
      }

      setCurrentUser(finalUserForContext);
      console.log("[AuthHook] onAuthStateChanged: setCurrentUser called with:", finalUserForContext ? finalUserForContext.uid : 'null');
      
      setLoading(false);
      console.log("[AuthHook] onAuthStateChanged: Set loading to false. Final context user UID (after state update):", finalUserForContext ? finalUserForContext.uid : 'null');
    };

    console.log("[AuthHook] Subscribing to onAuthStateChanged.");
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange, (error) => {
      console.error("[AuthHook] Main AuthState Error in onAuthStateChanged listener:", error);
      setCurrentUser(null); 
      setLoading(false);
    });
      
    return () => {
      console.log("[AuthHook] Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  }, []); 

  const signUp = async (data: SignUpData): Promise<User | null> => {
    console.log("[AuthHook] Attempting Email/Pass Sign-Up for:", data.email);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      if (userCredential.user) {
        console.log("[AuthHook] Email/Pass Sign-Up SUCCESS for UID:", userCredential.user.uid);
        await createUserProfileInFirestore(
          userCredential.user.uid,
          data.firstName,
          data.lastName,
          data.email
        );
        console.log("[AuthHook] Firestore profile created for new user:", userCredential.user.uid);
        // onAuthStateChanged will handle setting currentUser and loading state
        return userCredential.user;
      }
      return null;
    } catch (error) {
      console.error("[AuthHook] Email/Pass Sign-Up error:", error);
      throw error as AuthError; 
    }
  };

  const signIn = async (data: SignInData): Promise<User | null> => {
    console.log("[AuthHook] Attempting Email/Pass Sign-In for:", data.email);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      if (userCredential.user) {
        console.log("[AuthHook] Email/Pass Sign-In SUCCESS for UID:", userCredential.user.uid, "Checking if admin...");
        const isActualAdmin = await checkIfAdminUserExistsInFirestore(userCredential.user.uid);
        if (isActualAdmin) {
          console.log(`[AuthHook] Email/Pass Sign-In: User ${userCredential.user.uid} is an admin. Signing out from public flow.`);
          await firebaseSignOut(auth); 
          throw new Error("Admin accounts should use the admin login panel.");
        }
        console.log("[AuthHook] Email/Pass Sign-In: User is NOT admin.");
        // onAuthStateChanged will handle setting currentUser and loading state
        return userCredential.user;
      }
      return null;
    } catch (error) {
      console.error("[AuthHook] Email/Pass Sign-In error:", error);
      throw error as AuthError; 
    }
  };

  const signInWithGoogle = async (): Promise<User | null> => {
    const provider = new GoogleAuthProvider();
    console.log("[AuthHook] Attempting Google Sign-In.");
    try {
      const result: UserCredential = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("[AuthHook] signInWithGoogle: Firebase signInWithPopup successful. User UID:", user ? user.uid : 'null');

      if (user) {
        console.log(`[AuthHook] signInWithGoogle: Checking if user ${user.uid} is admin.`);
        const isActualAdmin = await checkIfAdminUserExistsInFirestore(user.uid);
        if (isActualAdmin) {
          console.log(`[AuthHook] signInWithGoogle: User ${user.uid} IS an admin. Signing out from public flow.`);
          await firebaseSignOut(auth); 
          throw new Error("Admin accounts should use the admin login panel for Google Sign-In.");
        }
        console.log(`[AuthHook] signInWithGoogle: User ${user.uid} is NOT an admin.`);
        
        const additionalInfo = getAdditionalUserInfo(result);
        if (additionalInfo?.isNewUser) {
          console.log(`[AuthHook] signInWithGoogle: New user ${user.uid}. Creating profile.`);
          const { firstName, lastName } = parseDisplayName(user.displayName);
          await createUserProfileInFirestore(user.uid, firstName, lastName, user.email!);
          console.log(`[AuthHook] signInWithGoogle: Profile created for new user ${user.uid}.`);
        }
        return user; // Rely on onAuthStateChanged to update context
      }
      return null;
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("[AuthHook] Google Sign-In popup closed by user.");
        return null;
      }
      console.error("[AuthHook] Google Sign-In error:", error);
      throw error as AuthError;
    }
  };

  const signOutUser = async (): Promise<void> => {
    console.log("[AuthHook] Attempting Sign-Out. Current user UID:", currentUser ? currentUser.uid : 'null');
    try {
      await firebaseSignOut(auth);
      console.log("[AuthHook] Sign-Out successful via firebaseSignOut.");
      // onAuthStateChanged will handle setting currentUser to null and updating loading state.
    } catch (error) {
      console.error("[AuthHook] Sign-Out error:", error);
    }
  };

  const value = {
    currentUser,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut: signOutUser,
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
