
"use client";

import { doc, getDoc, setDoc, onSnapshot, type Unsubscribe, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { firestore, storage, auth } from './firebase';
import type { FooterSettings } from '@/types/footer';

const FOOTER_SETTINGS_COLLECTION = 'site_settings';
const FOOTER_SETTINGS_DOC_ID = 'footer';
const FOOTER_LOGO_STORAGE_PATH = 'site_settings/footer_logo';

// Firestore functions
export async function getFooterSettings(): Promise<FooterSettings | null> {
  try {
    const docRef = doc(firestore, FOOTER_SETTINGS_COLLECTION, FOOTER_SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as FooterSettings;
    }
    return null;
  } catch (error) {
    console.error("Error fetching footer settings:", error);
    throw error;
  }
}

export async function updateFooterSettings(settings: Partial<FooterSettings>): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    console.log("Attempting to update footer settings. Authenticated admin UID:", currentUser?.uid, "Settings:", settings);
    if (!currentUser) {
      console.error("No authenticated user found when trying to update footer settings.");
      throw new Error("Authentication required to update footer settings.");
    }

    const docRef = doc(firestore, FOOTER_SETTINGS_COLLECTION, FOOTER_SETTINGS_DOC_ID);
    await setDoc(docRef, { ...settings, lastUpdated: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error("Error updating footer settings in Firestore:", error);
    throw error;
  }
}

export function subscribeToFooterSettings(
  callback: (settings: FooterSettings | null) => void
): Unsubscribe {
  const docRef = doc(firestore, FOOTER_SETTINGS_COLLECTION, FOOTER_SETTINGS_DOC_ID);
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as FooterSettings);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error in footer settings subscription:", error);
    callback(null); // Notify on error
  });
  return unsubscribe;
}

// Firebase Storage functions
export async function uploadFooterLogo(file: File): Promise<string> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Authentication required to upload footer logo.");
    }

    const fileExtension = file.name.split('.').pop();
    const logoFileName = `footer_logo_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, `${FOOTER_LOGO_STORAGE_PATH}/${logoFileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading footer logo:", error);
    throw error;
  }
}

export async function deleteFooterLogo(logoUrl: string): Promise<void> {
  if (!logoUrl || logoUrl.startsWith('blob:')) {
    console.warn("Attempted to delete an invalid or blob URL (footer logo) from Firebase Storage:", logoUrl);
    return; 
  }
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Authentication required to delete footer logo.");
    }
    const storageRef = ref(storage, logoUrl);
    await deleteObject(storageRef);
    console.log("Successfully deleted old footer logo from Firebase Storage:", logoUrl);
  } catch (error) {
    // If the object does not exist, Firebase throws 'storage/object-not-found'
    // We can choose to ignore this error or log it as a warning.
    if ((error as any).code === 'storage/object-not-found') {
      console.warn('Old footer logo not found in storage, skipping deletion:', logoUrl);
    } else {
      console.error("Error deleting footer logo from Firebase Storage:", error);
      throw error; // Re-throw other errors
    }
  }
}
