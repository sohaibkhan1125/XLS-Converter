
"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { GeneralSiteSettings } from '@/types/site-settings'; // Updated type import
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service'; // Updated service import

const SCRIPT_ID = 'dynamic-ad-loader-script';

export default function AdScriptInjector() {
  const [generalSettings, setGeneralSettings] = useState<GeneralSiteSettings | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = subscribeToGeneralSettings((settings) => {
      setGeneralSettings(settings);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const existingScript = document.getElementById(SCRIPT_ID);
    
    if (pathname.startsWith('/admin') || pathname === '/login' || pathname === '/signup') {
      if (existingScript) {
        existingScript.remove();
      }
      return;
    }

    const adLoaderScript = generalSettings?.adLoaderScript;

    if (adLoaderScript && adLoaderScript.trim() !== "") {
      if (existingScript) {
        if (existingScript.innerHTML !== adLoaderScript) {
          existingScript.remove();
          const newScript = document.createElement('script');
          newScript.id = SCRIPT_ID;
          newScript.innerHTML = adLoaderScript;
          document.head.appendChild(newScript);
        }
      } else {
        const newScript = document.createElement('script');
        newScript.id = SCRIPT_ID;
        newScript.innerHTML = adLoaderScript;
        document.head.appendChild(newScript);
      }
    } else {
      if (existingScript) {
        existingScript.remove();
      }
    }

    return () => {
      const scriptToRemoveOnUnmount = document.getElementById(SCRIPT_ID);
      if (scriptToRemoveOnUnmount && (pathname.startsWith('/admin') || pathname === '/login' || pathname === '/signup')) {
        scriptToRemoveOnUnmount.remove();
      }
    };
  }, [generalSettings, pathname]);

  return null; 
}
