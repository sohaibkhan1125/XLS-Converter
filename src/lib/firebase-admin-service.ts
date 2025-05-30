
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp, query, limit } from 'firebase/firestore';
import { firestore } from './firebase'; // Ensure firestore is exported from firebase.ts

const ADMIN_COLLECTION = 'admins';

/**
 * Checks if a user with the given UID is registered as an admin in Firestore.
 */
export async function checkIfAdminUserExistsInFirestore(uid: string): Promise<boolean> {
  if (!uid) return false;
  try {
    const adminDocRef = doc(firestore, ADMIN_COLLECTION, uid);
    const adminDocSnap = await getDoc(adminDocRef);
    return adminDocSnap.exists();
  } catch (error) {
    console.error("Error checking if admin user exists in Firestore:", error);
    // In case of error, assume user is not admin to be safe
    return false;
  }
}

/**
 * Checks if any admin documents exist in the Firestore 'admins' collection.
 * This is used to determine if the initial admin setup has been performed.
 */
export async function checkIfAnyAdminSetupInFirestore(): Promise<boolean> {
  try {
    const adminsCollectionRef = collection(firestore, ADMIN_COLLECTION);
    // Query for just one document to see if any exist, more efficient than getDocs()
    const q = query(adminsCollectionRef, limit(1));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking if any admin exists in Firestore:", error);
    // If an error occurs (e.g. permission issues), it's safer to assume setup might be needed or handle appropriately.
    // For now, returning false might lead to signup page if DB is inaccessible. Consider implications.
    return false;
  }
}

/**
 * Adds a new admin user to the Firestore 'admins' collection.
 * Typically called only once during the initial admin setup.
 */
export async function addAdminToFirestore(uid: string, email: string | null): Promise<void> {
  if (!uid) throw new Error("UID is required to add an admin to Firestore.");
  try {
    const adminDocRef = doc(firestore, ADMIN_COLLECTION, uid);
    await setDoc(adminDocRef, {
      email: email || 'N/A', // Store email for reference, handle null case
      createdAt: serverTimestamp(), // Use Firestore server timestamp
    });
  } catch (error) {
    console.error("Error adding admin to Firestore:", error);
    throw error; // Re-throw to be handled by caller
  }
}
