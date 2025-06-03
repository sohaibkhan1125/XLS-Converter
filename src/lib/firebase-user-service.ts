
import { doc, setDoc, serverTimestamp, type FieldValue } from 'firebase/firestore';
import { firestore } from './firebase';

const USERS_COLLECTION = 'users';

export interface UserProfileData {
  firstName: string;
  lastName: string;
  email: string;
  createdAt: FieldValue;
  // You can add more fields here later, e.g., photoURL, preferences, etc.
}

/**
 * Creates a user profile document in Firestore.
 * @param uid The user's unique ID from Firebase Authentication.
 * @param firstName The user's first name.
 * @param lastName The user's last name.
 * @param email The user's email.
 */
export async function createUserProfileInFirestore(
  uid: string,
  firstName: string,
  lastName: string,
  email: string
): Promise<void> {
  if (!uid) {
    console.error("UID is required to create a user profile in Firestore.");
    throw new Error("User UID not provided for profile creation.");
  }
  if (!firstName || !lastName) {
    console.warn("First name or last name is missing for profile creation. UID:", uid);
    // Decide if this should be an error or just a warning. For now, proceed.
  }
  try {
    const userDocRef = doc(firestore, USERS_COLLECTION, uid);
    const profileData: UserProfileData = {
      firstName,
      lastName,
      email,
      createdAt: serverTimestamp(),
    };
    await setDoc(userDocRef, profileData);
    console.log(`User profile created in Firestore for UID: ${uid}`);
  } catch (error) {
    console.error("Error creating user profile in Firestore for UID:", uid, error);
    // If profile creation fails, the auth user might still exist.
    // Consider error handling strategies like trying to delete the auth user,
    // or logging for manual reconciliation.
    throw error; // Re-throw the error to be handled by the calling function.
  }
}
