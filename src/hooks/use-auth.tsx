
"use client";

import type { User, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
} from 'firebase/auth';
import type React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import type { AuthFormValues } from '@/components/auth/auth-form';
import { checkIfAdminUserExistsInFirestore } from '@/lib/firebase-admin-service'; // Import the check

interface AuthContextType {
  currentUser: User | null; // This user is confirmed NOT to be an admin
  loading: boolean;
  signUp: (values: AuthFormValues) => Promise<User | null>;
  signIn: (values: AuthFormValues) => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null); // Raw Firebase auth user
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Validated non-admin user
  const [loading, setLoading] = useState(true);

  const validateAndSetCurrentUser = useCallback(async (user: User | null) => {
    if (user) {
      const isActualAdmin = await checkIfAdminUserExistsInFirestore(user.uid);
      if (isActualAdmin) {
        setCurrentUser(null); // If user is an admin, don't set them as currentUser for main site
      } else {
        setCurrentUser(user); // User is not an admin, set as currentUser
      }
    } else {
      setCurrentUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribeOnAuthStateChanged = onAuthStateChanged(auth, (user) => {
      setLoading(true);
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

  const signUp = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      // Check if the email being used for signup is an admin email
      // This check is a bit indirect here, as we don't have UID yet.
      // A more robust check might involve querying Firestore by email if admins collection is small,
      // or simply relying on the onAuthStateChanged logic to filter out admins.
      // For now, we proceed with signup and let onAuthStateChanged handle filtering.
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      // onAuthStateChanged will validate if this new user is an admin and set currentUser accordingly.
      // We return the Firebase user here, the context will sort out if it's an admin.
      return userCredential.user;
    } catch (error) {
      console.error("Sign up error:", error);
      throw error as AuthError; 
    } finally {
      // setLoading will be handled by onAuthStateChanged flow
    }
  };

  const signIn = async (values: AuthFormValues): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      // onAuthStateChanged will validate if this user is an admin.
      // For this specific signIn action, we can also do an immediate check.
      if (userCredential.user) {
        const isActualAdmin = await checkIfAdminUserExistsInFirestore(userCredential.user.uid);
        if (isActualAdmin) {
          // User is an admin, sign them out of Firebase for this context
          // or simply don't set them as currentUser.
          // For main site, they shouldn't appear logged in.
          await firebaseSignOut(auth); // Optional: Force sign out if admin tries main login
          setCurrentUser(null);
          setLoading(false);
          throw new Error("Admin accounts should use the admin login."); // Or a more user-friendly error
        }
        // Not an admin, onAuthStateChanged would handle setting currentUser.
        // To ensure immediate feedback for this signIn:
        setCurrentUser(userCredential.user);
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

  const signOut = async (): Promise<void> => {
    setLoading(true); 
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set firebaseUser and currentUser to null.
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      // setLoading(false) handled by onAuthStateChanged flow
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
