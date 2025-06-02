"use client";

import { doc, getDoc, setDoc, onSnapshot, type Unsubscribe, serverTimestamp } from 'firebase/firestore';
import { firestore, auth } from './firebase';
import type { AllPopupSettings, PopupConfig, PopupType } from '@/types/popup-settings';
import { DEFAULT_POPUP_SETTINGS } from '@/types/popup-settings';

const SETTINGS_COLLECTION = 'site_settings';
const POPUPS_CONFIG_DOC_ID = 'popups_config'; // Single document to hold all popup settings

/**
 * Fetches all popup configurations from Firestore.
 * Returns default settings if no configuration is found.
 */
export async function getPopupSettings(): Promise<AllPopupSettings> {
  try {
    const docRef = doc(firestore, SETTINGS_COLLECTION, POPUPS_CONFIG_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<AllPopupSettings>;
      // Merge with defaults to ensure all popup types are present
      return {
        bottomPopup: { ...DEFAULT_POPUP_SETTINGS.bottomPopup, ...data.bottomPopup },
        topNavbarPopup: { ...DEFAULT_POPUP_SETTINGS.topNavbarPopup, ...data.topNavbarPopup },
        centerScreenPopup: { ...DEFAULT_POPUP_SETTINGS.centerScreenPopup, ...data.centerScreenPopup },
        lastUpdated: data.lastUpdated || serverTimestamp(),
      };
    }
    return { ...DEFAULT_POPUP_SETTINGS, lastUpdated: serverTimestamp() }; // Return deep copy of defaults
  } catch (error) {
    console.error("Error fetching popup settings:", error);
    // In case of error, return defaults to prevent app crash
    return { ...DEFAULT_POPUP_SETTINGS, lastUpdated: serverTimestamp() };
  }
}

/**
 * Updates all popup configurations in Firestore.
 * Requires admin authentication.
 */
export async function updatePopupSettings(settings: AllPopupSettings): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Authentication required to update popup settings.");
    }
    // Note: Admin check (e.g., exists in 'admins' collection) should ideally happen here
    // or be enforced by Firestore rules for `/site_settings/popups_config`.
    // For now, relying on admin panel access control.

    const docRef = doc(firestore, SETTINGS_COLLECTION, POPUPS_CONFIG_DOC_ID);
    const settingsToSave: AllPopupSettings = {
      ...settings,
      lastUpdated: serverTimestamp(),
    };
    // Ensure individual popups also get a lastUpdated timestamp if they were modified.
    // This might be redundant if the top-level lastUpdated is sufficient.
    // settingsToSave.bottomPopup.lastUpdated = serverTimestamp();
    // settingsToSave.topNavbarPopup.lastUpdated = serverTimestamp();
    // settingsToSave.centerScreenPopup.lastUpdated = serverTimestamp();
    
    await setDoc(docRef, settingsToSave, { merge: true }); // Merge to not overwrite other potential fields in site_settings if this doc was shared (it's not, currently)
  } catch (error) {
    console.error("Error updating popup settings in Firestore:", error);
    throw error;
  }
}

/**
 * Subscribes to real-time updates for popup configurations.
 * @param callback Function to call with the latest popup settings.
 * @returns Unsubscribe function.
 */
export function subscribeToPopupSettings(
  callback: (settings: AllPopupSettings) => void
): Unsubscribe {
  const docRef = doc(firestore, SETTINGS_COLLECTION, POPUPS_CONFIG_DOC_ID);
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<AllPopupSettings>;
       // Merge with defaults to ensure all popup types are present
      const fullSettings = {
        bottomPopup: { ...DEFAULT_POPUP_SETTINGS.bottomPopup, ...data.bottomPopup },
        topNavbarPopup: { ...DEFAULT_POPUP_SETTINGS.topNavbarPopup, ...data.topNavbarPopup },
        centerScreenPopup: { ...DEFAULT_POPUP_SETTINGS.centerScreenPopup, ...data.centerScreenPopup },
        lastUpdated: data.lastUpdated,
      };
      callback(fullSettings);
    } else {
      callback({ ...DEFAULT_POPUP_SETTINGS }); // Return deep copy of defaults
    }
  }, (error) => {
    console.error("Error in popup settings subscription:", error);
    callback({ ...DEFAULT_POPUP_SETTINGS }); // Fallback to defaults on error
  });
  return unsubscribe;
}

// You'll also need to update Firestore security rules to allow admins to read/write to 'site_settings/popups_config'.
// Example rule (add to your existing rules):
/*
match /site_settings/popups_config {
  // Allow public read if popups are for everyone, or restrict if needed.
  // For now, assuming admin reads/writes, frontend reads.
  allow read: if true; // Or if request.auth != null for logged-in users only
  
  // Allow write access only if the requesting user is an admin.
  allow write: if request.auth != null && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}
*/