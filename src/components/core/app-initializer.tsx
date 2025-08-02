
"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

import AppHeader from '@/components/layout/header';
import AppFooter from '@/components/layout/footer';
import AdScriptInjector from '@/components/ads/ad-script-injector';
import CustomScriptInjector from '@/components/core/custom-script-injector';
import MaintenanceModeOverlay from '@/components/core/maintenance-mode-overlay';
import PopupInjector from '@/components/core/popup-injector';

import type { GeneralSiteSettings } from '@/types/site-settings';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';
import { PREDEFINED_THEMES, DEFAULT_LIGHT_THEME_ID } from '@/config/themes';

export const DEFAULT_SITE_NAME_FALLBACK = "Bank Statement Converter - Convert PDF File into Excel";
const DEFAULT_FALLBACK_DESCRIPTION = "Easily convert your PDF files to structured Excel spreadsheets.";

// Helper function to update or create a meta tag
function setMetaTag(property: 'name' | 'property', content: string, value: string) {
  if (typeof document === 'undefined') return;

  let element = document.querySelector(`meta[${property}="${content}"]`) as HTMLMetaElement;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(property, content);
    document.head.appendChild(element);
  }
  element.setAttribute('content', value);
}

/**
 * This component handles all the application's client-side initialization logic,
 * such as theme loading, popups, and dynamic header/footer rendering.
 * This keeps the root layout clean and prevents dependency issues.
 */
export default function AppInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');
  const [activeThemeId, setActiveThemeId] = useState<string>(DEFAULT_LIGHT_THEME_ID);

  // Initialize dynamic theme and metadata
  useEffect(() => {
    // Set default metadata on mount
    document.title = DEFAULT_SITE_NAME_FALLBACK;
    setMetaTag('name', 'description', DEFAULT_FALLBACK_DESCRIPTION);
    setMetaTag('property', 'og:title', DEFAULT_SITE_NAME_FALLBACK);
    setMetaTag('property', 'og:description', DEFAULT_FALLBACK_DESCRIPTION);
    if (typeof window !== 'undefined') {
        setMetaTag('property', 'og:url', window.location.href);
    }


    // Subscribe to settings for dynamic updates
    const unsubscribe = subscribeToGeneralSettings((settings) => {
      const themeId = settings?.activeThemeId || DEFAULT_LIGHT_THEME_ID;
      setActiveThemeId(themeId);
    });

    return () => unsubscribe();
  }, []);

  // Update OG URL whenever pathname changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMetaTag('property', 'og:url', window.location.href);
    }
  }, [pathname]);


  // Apply the theme whenever the activeThemeId changes
  useEffect(() => {
    const applyTheme = (themeId: string) => {
      const theme = PREDEFINED_THEMES.find(t => t.id === themeId) || PREDEFINED_THEMES.find(t => t.id === DEFAULT_LIGHT_THEME_ID);
      if (theme) {
        const root = document.documentElement;
        Object.entries(theme.colors).forEach(([key, value]) => {
          const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          if (value) {
            root.style.setProperty(cssVarName, value);
          }
        });
        if (theme.isDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };
    applyTheme(activeThemeId);
  }, [activeThemeId]);


  return (
    <>
      <MaintenanceModeOverlay />
      <PopupInjector />
      {!isAdminRoute && <AppHeader />}
      <AdScriptInjector />
      <CustomScriptInjector />
      
      {children}
      
      {!isAdminRoute && <AppFooter />}
    </>
  );
}
