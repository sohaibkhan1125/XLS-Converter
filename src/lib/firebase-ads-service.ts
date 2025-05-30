
import { doc, getDoc, setDoc, onSnapshot, type Unsubscribe, serverTimestamp } from 'firebase/firestore';
import { firestore } from './firebase';
import type { AdSettings } from '@/types/site-settings';

const ADS_SETTINGS_COLLECTION = 'site_settings';
const ADS_SETTINGS_DOC_ID = 'ads_config';

export async function getAdSettings(): Promise<AdSettings | null> {
  try {
    const docRef = doc(firestore, ADS_SETTINGS_COLLECTION, ADS_SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as AdSettings;
    }
    return null; // No settings found
  } catch (error) {
    console.error("Error fetching ad settings:", error);
    throw error;
  }
}

export async function updateAdSettings(settings: Partial<AdSettings>): Promise<void> {
  try {
    const docRef = doc(firestore, ADS_SETTINGS_COLLECTION, ADS_SETTINGS_DOC_ID);
    // Use serverTimestamp for lastUpdated if you add such a field
    await setDoc(docRef, { ...settings, lastUpdated: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error("Error updating ad settings:", error);
    throw error;
  }
}

export function subscribeToAdSettings(
  callback: (settings: AdSettings | null) => void
): Unsubscribe {
  const docRef = doc(firestore, ADS_SETTINGS_COLLECTION, ADS_SETTINGS_DOC_ID);
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as AdSettings);
    } else {
      callback(null); // No settings configured
    }
  }, (error) => {
    console.error("Error in ad settings subscription:", error);
    callback(null); // Notify on error
  });
  return unsubscribe;
}
