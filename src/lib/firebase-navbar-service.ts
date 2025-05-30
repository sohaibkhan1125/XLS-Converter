
import { doc, getDoc, setDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { firestore, storage, auth } from './firebase'; // Added auth
import type { NavbarSettings } from '@/types/navbar';

const NAVBAR_SETTINGS_COLLECTION = 'site_settings';
const NAVBAR_SETTINGS_DOC_ID = 'navbar';
const LOGO_STORAGE_PATH = 'site_settings/logo';

// Firestore functions
export async function getNavbarSettings(): Promise<NavbarSettings | null> {
  try {
    const docRef = doc(firestore, NAVBAR_SETTINGS_COLLECTION, NAVBAR_SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as NavbarSettings;
    }
    return null;
  } catch (error) {
    console.error("Error fetching navbar settings:", error);
    throw error;
  }
}

export async function updateNavbarSettings(settings: Partial<NavbarSettings>): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    console.log("Attempting to update navbar settings. Authenticated admin UID:", currentUser?.uid, "Settings:", settings);
    if (!currentUser) {
      console.error("No authenticated user found when trying to update navbar settings.");
      throw new Error("Authentication required to update navbar settings.");
    }
    // Check if user is an admin (client-side check, server rules are definitive)
    // This logic is primarily handled by useAdminAuth ensuring only admins reach here.
    // const isAdmin = await checkIfAdminUserExistsInFirestore(currentUser.uid); // `checkIfAdminUserExistsInFirestore` would need to be imported
    // if (!isAdmin) {
    //   console.error("User is not authorized as admin to update navbar settings.");
    //   throw new Error("User is not authorized as admin.");
    // }

    const docRef = doc(firestore, NAVBAR_SETTINGS_COLLECTION, NAVBAR_SETTINGS_DOC_ID);
    await setDoc(docRef, settings, { merge: true });
  } catch (error) {
    console.error("Error updating navbar settings in Firestore:", error);
    throw error;
  }
}

export function subscribeToNavbarSettings(
  callback: (settings: NavbarSettings | null) => void
): Unsubscribe {
  const docRef = doc(firestore, NAVBAR_SETTINGS_COLLECTION, NAVBAR_SETTINGS_DOC_ID);
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as NavbarSettings);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error in navbar settings subscription:", error);
    callback(null); // Notify on error
  });
  return unsubscribe;
}

// Firebase Storage functions
export async function uploadSiteLogo(file: File): Promise<string> {
  try {
    const currentUser = auth.currentUser;
    console.log("Attempting to upload site logo. Authenticated admin UID:", currentUser?.uid);
    if (!currentUser) {
      console.error("No authenticated user found when trying to upload site logo.");
      throw new Error("Authentication required to upload site logo.");
    }

    const fileExtension = file.name.split('.').pop();
    const logoFileName = `site_logo_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, `${LOGO_STORAGE_PATH}/${logoFileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading site logo:", error);
    throw error;
  }
}

export async function deleteSiteLogo(logoUrl: string): Promise<void> {
  if (!logoUrl || logoUrl.startsWith('blob:')) {
    console.warn("Attempted to delete an invalid or blob URL from Firebase Storage:", logoUrl);
    return; // Do not attempt to delete local blob URLs or empty URLs from storage
  }
  try {
    const currentUser = auth.currentUser;
    console.log("Attempting to delete site logo from Storage. Authenticated admin UID:", currentUser?.uid, "Logo URL:", logoUrl);
     if (!currentUser) {
      console.error("No authenticated user found when trying to delete site logo from Storage.");
      throw new Error("Authentication required to delete site logo.");
    }
    const storageRef = ref(storage, logoUrl); // Firebase SDK can parse the full URL
    await deleteObject(storageRef);
    console.log("Successfully deleted old logo from Firebase Storage:", logoUrl);
  } catch (error) {
    console.error("Error deleting site logo from Firebase Storage:", error);
    // Re-throw the error so the calling function (e.g., handleSubmit in UI) can catch it
    // and update UI state accordingly (e.g., stop loading spinner).
    throw error;
  }
}
