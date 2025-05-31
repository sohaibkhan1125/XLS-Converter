
"use client";

import { doc, getDoc, setDoc, onSnapshot, type Unsubscribe, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { firestore, storage, auth } from './firebase';
import type { GeneralSiteSettings } from '@/types/site-settings';

const SETTINGS_COLLECTION = 'site_settings';
const GENERAL_SETTINGS_DOC_ID = 'general_config';
const SHARED_LOGO_STORAGE_PATH = 'site_settings/shared_logo';

// Firestore functions
export async function getGeneralSettings(): Promise<GeneralSiteSettings | null> {
  try {
    const docRef = doc(firestore, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as GeneralSiteSettings;
    }
    // Return a default empty object if no settings are found, 
    // so components don't break trying to access properties of null.
    return { siteTitle: '', logoUrl: undefined, navItems: [], adLoaderScript: '' };
  } catch (error) {
    console.error("Error fetching general settings:", error);
    throw error;
  }
}

export async function updateGeneralSettings(settings: Partial<GeneralSiteSettings>): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    console.log("Attempting to update general settings. Admin UID:", currentUser?.uid, "Settings:", settings);
    if (!currentUser) {
      throw new Error("Authentication required to update general settings.");
    }

    const docRef = doc(firestore, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC_ID);
    await setDoc(docRef, { ...settings, lastUpdated: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error("Error updating general settings in Firestore:", error);
    throw error;
  }
}

export function subscribeToGeneralSettings(
  callback: (settings: GeneralSiteSettings | null) => void
): Unsubscribe {
  const docRef = doc(firestore, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC_ID);
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as GeneralSiteSettings);
    } else {
      // Provide default empty settings if document doesn't exist
      callback({ siteTitle: 'XLSConvert', logoUrl: undefined, navItems: [], adLoaderScript: '' });
    }
  }, (error) => {
    console.error("Error in general settings subscription:", error);
    callback(null); 
  });
  return unsubscribe;
}

// Firebase Storage functions for the shared logo
export async function uploadSharedSiteLogo(file: File): Promise<string> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Authentication required to upload site logo.");
    }

    const fileExtension = file.name.split('.').pop();
    const logoFileName = `shared_logo_${Date.now()}.${fileExtension}`;
    const storageRefInstance = ref(storage, `${SHARED_LOGO_STORAGE_PATH}/${logoFileName}`);
    const snapshot = await uploadBytes(storageRefInstance, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading shared site logo:", error);
    throw error;
  }
}

export async function deleteSharedSiteLogo(logoUrl: string): Promise<void> {
  if (!logoUrl || logoUrl.startsWith('blob:')) {
    console.warn("Attempted to delete an invalid or blob URL (shared logo) from Firebase Storage:", logoUrl);
    return; 
  }
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Authentication required to delete shared site logo.");
    }
    const storageRefInstance = ref(storage, logoUrl);
    await deleteObject(storageRefInstance);
    console.log("Successfully deleted old shared logo from Firebase Storage:", logoUrl);
  } catch (error) {
    if ((error as any).code === 'storage/object-not-found') {
      console.warn('Old shared logo not found in storage, skipping deletion:', logoUrl);
    } else {
      console.error("Error deleting shared logo from Firebase Storage:", error);
      throw error; 
    }
  }
}
