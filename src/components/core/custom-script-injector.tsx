
"use client";

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import type { GeneralSiteSettings, CustomScript } from '@/types/site-settings';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';

const SCRIPT_TAG_PREFIX = 'custom-header-script-';

export default function CustomScriptInjector() {
  const [generalSettings, setGeneralSettings] = useState<GeneralSiteSettings | null>(null);
  const pathname = usePathname();
  const injectedScriptIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = subscribeToGeneralSettings((settings) => {
      setGeneralSettings(settings);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Do not inject on admin or auth pages
    if (pathname.startsWith('/admin') || pathname === '/login' || pathname === '/signup') {
      // Clean up any scripts if navigating to admin/auth pages
      injectedScriptIds.current.forEach(scriptId => {
        const existingScriptTag = document.getElementById(scriptId);
        if (existingScriptTag) {
          existingScriptTag.remove();
        }
      });
      injectedScriptIds.current.clear();
      return;
    }

    const scriptsToInject = generalSettings?.customScripts || [];
    const currentScriptIdsInDOM = new Set<string>();

    // Inject or update scripts
    scriptsToInject.forEach(scriptConfig => {
      const scriptTagId = `${SCRIPT_TAG_PREFIX}${scriptConfig.id}`;
      currentScriptIdsInDOM.add(scriptTagId);
      let existingScriptTag = document.getElementById(scriptTagId) as HTMLScriptElement | null;

      if (scriptConfig.enabled && scriptConfig.scriptContent && scriptConfig.scriptContent.trim() !== "") {
        if (existingScriptTag) {
          // If script content changed, remove and re-add.
          // Simple innerHTML update might not re-execute script tags.
          if (existingScriptTag.innerHTML !== scriptConfig.scriptContent) {
            existingScriptTag.remove();
            existingScriptTag = null; // Force re-creation
          }
        }

        if (!existingScriptTag) {
          const newScript = document.createElement('script');
          newScript.id = scriptTagId;
          // It's generally safer to set textContent for inline scripts
          // If scriptContent includes <script> tags, this needs careful handling.
          // For now, assuming scriptContent is the JS code itself OR a full <script> tag string.
          // If it's a full tag, we parse it. Otherwise, we set textContent.
          if (scriptConfig.scriptContent.trim().toLowerCase().startsWith('<script')) {
            // This is a bit rudimentary. For production, a more robust parser might be needed
            // or clear instructions to users on script format.
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = scriptConfig.scriptContent; // Let browser parse the script tag
            const parsedScript = tempDiv.firstChild as HTMLScriptElement | null;
            if (parsedScript && parsedScript.tagName === 'SCRIPT') {
              newScript.type = parsedScript.type || 'text/javascript';
              if(parsedScript.src) newScript.src = parsedScript.src;
              if(parsedScript.async) newScript.async = parsedScript.async;
              if(parsedScript.defer) newScript.defer = parsedScript.defer;
              newScript.innerHTML = parsedScript.innerHTML; // Content between <script></script>
            } else {
               // Fallback if parsing fails or it's not a script tag, treat as inline JS
               newScript.innerHTML = scriptConfig.scriptContent;
            }
          } else {
             newScript.innerHTML = scriptConfig.scriptContent; // Assumed to be JS code
          }
          
          document.head.appendChild(newScript);
          injectedScriptIds.current.add(scriptTagId);
        }
      } else {
        // Script is disabled or empty, remove if it exists
        if (existingScriptTag) {
          existingScriptTag.remove();
          injectedScriptIds.current.delete(scriptTagId);
        }
      }
    });

    // Clean up scripts that are no longer in settings or were removed
    injectedScriptIds.current.forEach(injectedId => {
      if (!currentScriptIdsInDOM.has(injectedId)) {
        const scriptToRemove = document.getElementById(injectedId);
        if (scriptToRemove) {
          scriptToRemove.remove();
        }
        injectedScriptIds.current.delete(injectedId);
      }
    });

  }, [generalSettings, pathname]);

  return null; 
}
