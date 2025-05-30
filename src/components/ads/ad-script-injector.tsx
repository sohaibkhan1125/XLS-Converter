
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
    
    // Don't inject on auth pages
    if (pathname.startsWith('/admin') || pathname === '/login' || pathname === '/signup') {
      if (existingScript) {
        existingScript.remove();
      }
      return;
    }

    if (adSettings?.adLoaderScript && adSettings.adLoaderScript.trim() !== "") {
      if (existingScript) {
        // If script content changed, remove old and add new
        if (existingScript.innerHTML !== adSettings.adLoaderScript) {
          existingScript.remove();
          const newScript = document.createElement('script');
          newScript.id = SCRIPT_ID;
          newScript.innerHTML = adSettings.adLoaderScript;
          // Some ad scripts might need to be async or defer, but innerHTML scripts execute immediately
          // If specific attributes are needed, they should be part of the saved script string or handled differently.
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

    // Cleanup function to remove script if component unmounts (though this component is likely in root layout)
    return () => {
      const scriptToRemoveOnUnmount = document.getElementById(SCRIPT_ID);
      if (scriptToRemoveOnUnmount && (pathname.startsWith('/admin') || pathname === '/login' || pathname === '/signup')) {
        // Ensure it's removed if navigating away to an excluded page
        // This might be redundant given the check at the start of the effect, but safe.
        scriptToRemoveOnUnmount.remove();
      }
    };
  }, [adSettings, pathname]);

  return null; // This component does not render anything itself
}
