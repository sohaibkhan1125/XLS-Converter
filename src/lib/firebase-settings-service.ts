
"use client";

import { doc, getDoc, setDoc, onSnapshot, type Unsubscribe, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { firestore, storage, auth } from './firebase';
import type { GeneralSiteSettings, SocialLink, CustomScript, PageSEOInfo, PaymentGatewaySetting, PaymentGatewayType } from '@/types/site-settings';
import { DEFAULT_LIGHT_THEME_ID } from '@/config/themes';
// import { Landmark, CreditCard } from 'lucide-react'; // Icons are set in default settings now

const SETTINGS_COLLECTION = 'site_settings';
const GENERAL_SETTINGS_DOC_ID = 'general_config';
const SHARED_LOGO_STORAGE_PATH = 'site_settings/shared_logo';

export const PREDEFINED_SOCIAL_MEDIA_PLATFORMS: Omit<SocialLink, 'url' | 'enabled'>[] = [
  { id: 'facebook', name: 'Facebook', iconName: 'Facebook' },
  { id: 'twitter', name: 'Twitter', iconName: 'Twitter' },
  { id: 'instagram', name: 'Instagram', iconName: 'Instagram' },
  { id: 'linkedin', name: 'Linkedin', iconName: 'Linkedin' },
  { id: 'youtube', name: 'Youtube', iconName: 'Youtube' },
  { id: 'github', name: 'Github', iconName: 'Github' },
];

// Define the known payment gateways and their static configuration
export const PREDEFINED_PAYMENT_GATEWAYS_CONFIG: Pick<PaymentGatewaySetting, 'id' | 'name' | 'iconName'>[] = [
  { id: 'paypal', name: 'PayPal', iconName: 'Landmark' }, // Landmark icon for PayPal
  { id: 'stripe', name: 'Stripe', iconName: 'CreditCard' },
];


const DEFAULT_ROBOTS_TXT_CONTENT = `User-agent: *
Allow: /
# Sitemap: Replace_this_with_your_full_sitemap_url/sitemap.xml
`;

const DEFAULT_SITEMAP_XML_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>REPLACE_THIS_WITH_YOUR_DOMAIN/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- Add more URLs here -->
</urlset>
`;

const DEFAULT_GENERAL_SETTINGS: GeneralSiteSettings = {
  siteTitle: 'XLSConvert',
  logoUrl: null, // Changed from undefined to null
  navItems: [],
  adLoaderScript: '',
  socialLinks: PREDEFINED_SOCIAL_MEDIA_PLATFORMS.map(p => ({ ...p, url: '', enabled: false })),
  customScripts: [],
  activeThemeId: DEFAULT_LIGHT_THEME_ID,
  seoSettings: {},
  robotsTxtContent: DEFAULT_ROBOTS_TXT_CONTENT,
  sitemapXmlContent: DEFAULT_SITEMAP_XML_CONTENT,
  maintenanceModeEnabled: false,
  paymentGateways: [ // Default structure for known payment gateways
    {
      id: 'paypal',
      name: 'PayPal',
      iconName: 'Landmark',
      enabled: false,
      credentials: { clientId: '' },
    },
    {
      id: 'stripe',
      name: 'Stripe',
      iconName: 'CreditCard',
      enabled: false,
      credentials: { clientId: '', clientSecret: '' },
    },
  ],
};


// Helper function to merge settings safely
function mergeSettings(savedData?: Partial<GeneralSiteSettings>): GeneralSiteSettings {
    const data = savedData || {};
    return {
        ...DEFAULT_GENERAL_SETTINGS, // Start with all defaults
        ...data, // Overlay with saved data
        socialLinks: PREDEFINED_SOCIAL_MEDIA_PLATFORMS.map(defaultPlatform => {
            const savedLink = data.socialLinks?.find(sl => sl.id === defaultPlatform.id);
            return savedLink ? { ...defaultPlatform, ...savedLink } : { ...defaultPlatform, url: '', enabled: false };
        }),
        customScripts: data.customScripts || DEFAULT_GENERAL_SETTINGS.customScripts,
        paymentGateways: PREDEFINED_PAYMENT_GATEWAYS_CONFIG.map(defaultGatewayConfig => {
            const defaultFullGateway = DEFAULT_GENERAL_SETTINGS.paymentGateways!.find(dfg => dfg.id === defaultGatewayConfig.id)!;
            const savedGateway = data.paymentGateways?.find(sg => sg.id === defaultGatewayConfig.id);
            return {
                ...defaultFullGateway,
                ...savedGateway,
                credentials: {
                    ...defaultFullGateway.credentials,
                    ...(savedGateway?.credentials || {}),
                },
            };
        }),
        siteTitle: data.siteTitle || DEFAULT_GENERAL_SETTINGS.siteTitle,
        activeThemeId: data.activeThemeId || DEFAULT_GENERAL_SETTINGS.activeThemeId,
        robotsTxtContent: data.robotsTxtContent === undefined ? DEFAULT_GENERAL_SETTINGS.robotsTxtContent : data.robotsTxtContent,
        sitemapXmlContent: data.sitemapXmlContent === undefined ? DEFAULT_GENERAL_SETTINGS.sitemapXmlContent : data.sitemapXmlContent,
        maintenanceModeEnabled: data.maintenanceModeEnabled === undefined ? DEFAULT_GENERAL_SETTINGS.maintenanceModeEnabled : data.maintenanceModeEnabled,
        logoUrl: data.logoUrl ?? DEFAULT_GENERAL_SETTINGS.logoUrl,
    };
}


// Firestore functions
export async function getGeneralSettings(): Promise<GeneralSiteSettings> {
  try {
    const docRef = doc(firestore, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return mergeSettings(docSnap.data() as Partial<GeneralSiteSettings>);
    }
    return mergeSettings(); // Return fully merged defaults
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
    const cleanedSettings: Partial<GeneralSiteSettings> = {};
    for (const key in settings) {
      if (Object.prototype.hasOwnProperty.call(settings, key)) {
        const k = key as keyof GeneralSiteSettings;
        if (settings[k] !== undefined) {
          cleanedSettings[k] = settings[k];
        }
      }
    }
    
    if (cleanedSettings.paymentGateways !== undefined && !Array.isArray(cleanedSettings.paymentGateways)) {
        console.warn("PaymentGateways provided but not an array, defaulting to empty array for update.", cleanedSettings.paymentGateways);
        cleanedSettings.paymentGateways = [];
    }


    const settingsToSave = {
      ...cleanedSettings,
      lastUpdated: serverTimestamp()
    };

    if (Object.keys(cleanedSettings).length === 0 && Object.keys(settings).length > 0) {
        console.warn("UpdateGeneralSettings called with only undefined values. Only 'lastUpdated' will be set.");
    }

    await setDoc(docRef, settingsToSave, { merge: true });
  } catch (error) {
    console.error("Error updating general settings in Firestore:", error);
    throw error;
  }
}

export function subscribeToGeneralSettings(
  callback: (settings: GeneralSiteSettings) => void
): Unsubscribe {
  const docRef = doc(firestore, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC_ID);
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const merged = mergeSettings(docSnap.data() as Partial<GeneralSiteSettings>);
      callback(merged);
    } else {
      callback(mergeSettings()); // Return fully merged defaults
    }
  }, (error) => {
    console.error("Error in general settings subscription:", error);
    callback(mergeSettings()); // Fallback to defaults on error
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
    console.log("Attempting to upload site logo. Admin UID:", currentUser.uid);

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
    console.log("Attempting to delete shared site logo. Admin UID:", currentUser.uid, "URL:", logoUrl);
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
