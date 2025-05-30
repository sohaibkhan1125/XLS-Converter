
"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { AdSettings } from '@/types/site-settings';
import { subscribeToAdSettings } from '@/lib/firebase-ads-service';

const SCRIPT_ID = 'dynamic-ad-loader-script';

export default function AdScriptInjector() {
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = subscribeToAdSettings((settings) => {
      setAdSettings(settings);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const existingScript = document.getElementById(SCRIPT_ID);
    
    // Don't inject on admin or auth pages
    if (pathname.startsWith('/admin') || pathname === '/login' || pathname === '/signup') {
      if (existingScript) {
        existingScript.remove();
      }
      return;
    }

    if (adSettings?.adLoaderScript && adSettings.adLoaderScript.trim() !== "") {
      // The script provided from the admin panel should ideally be self-sufficient 
      // for loading and displaying ads if no manual ad unit placement in the site's content is desired.
      // For example, scripts like Google AdSense Auto Ads work this way.
      if (existingScript) {
        // If script content changed, remove old and add new
        if (existingScript.innerHTML !== adSettings.adLoaderScript) {
          existingScript.remove();
          const newScript = document.createElement('script');
          newScript.id = SCRIPT_ID;
          newScript.innerHTML = adSettings.adLoaderScript;
          // Note: For scripts that require attributes like async, defer, or type="module",
          // and are provided as external <script src="..."></script> tags, 
          // this injection method (innerHTML) might need adjustment.
          // However, for inline JS blobs or document.write-style ad tags, innerHTML is standard.
          document.head.appendChild(newScript);
        }
      } else {
        const newScript = document.createElement('script');
        newScript.id = SCRIPT_ID;
        newScript.innerHTML = adSettings.adLoaderScript;
        document.head.appendChild(newScript);
      }
    } else {
      // If script is removed or empty, remove existing script from head
      if (existingScript) {
        existingScript.remove();
      }
    }

    // Cleanup function to remove script if component unmounts 
    // or if navigating to an excluded page.
    return () => {
      const scriptToRemoveOnUnmount = document.getElementById(SCRIPT_ID);
      if (scriptToRemoveOnUnmount && (pathname.startsWith('/admin') || pathname === '/login' || pathname === '/signup')) {
        scriptToRemoveOnUnmount.remove();
      }
    };
  }, [adSettings, pathname]);

  return null; // This component does not render anything itself
}
