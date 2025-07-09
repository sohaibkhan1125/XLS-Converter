
"use client"; 

// Metadata type is not used when 'use client'
import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import AppHeader from '@/components/layout/header';
import AppFooter from '@/components/layout/footer';
import AdScriptInjector from '@/components/ads/ad-script-injector';
import CustomScriptInjector from '@/components/core/custom-script-injector';
import MaintenanceModeOverlay from '@/components/core/maintenance-mode-overlay'; 
import PopupInjector from '@/components/core/popup-injector'; // Import PopupInjector
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { GeneralSiteSettings } from '@/types/site-settings';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';
import { PREDEFINED_THEMES, DEFAULT_LIGHT_THEME_ID, type Theme, type ThemeColors } from '@/config/themes';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const DEFAULT_SITE_NAME_FALLBACK = "Bank Statement Converter - Convert PDF File into Excel";
const DEFAULT_FALLBACK_DESCRIPTION = "Easily convert your PDF files to structured Excel spreadsheets.";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');
  const [activeThemeId, setActiveThemeId] = useState<string>(DEFAULT_LIGHT_THEME_ID);

  useEffect(() => {
    const unsubscribe = subscribeToGeneralSettings((settings) => {
      if (settings && settings.activeThemeId) {
        setActiveThemeId(settings.activeThemeId);
      } else {
        setActiveThemeId(DEFAULT_LIGHT_THEME_ID);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const applyTheme = (themeId: string) => {
      const theme = PREDEFINED_THEMES.find(t => t.id === themeId) || PREDEFINED_THEMES.find(t => t.id === DEFAULT_LIGHT_THEME_ID);
      if (theme) {
        const root = document.documentElement;
        Object.entries(theme.colors).forEach(([key, value]) => {
          // CSS variable names are kebab-case like --primary-foreground
          const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          if (value) { // Ensure value is not undefined for optional chart colors
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


  const mainClassName = isAdminRoute 
    ? "flex-grow" 
    : "flex-grow container mx-auto px-4 py-8 pt-24 pb-8";

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <title>{DEFAULT_SITE_NAME_FALLBACK}</title>
        <meta name="description" content={DEFAULT_FALLBACK_DESCRIPTION} />
        {/* The CSS variables will be set via JS, no <style> tag needed here for theme colors */}
      </head>
      <body className={`${geistSans.variable} antialiased font-sans flex flex-col min-h-screen`}>
        <AuthProvider>
          <MaintenanceModeOverlay /> 
          <PopupInjector /> {/* Add PopupInjector here */}
          {!isAdminRoute && <AppHeader />}
          <AdScriptInjector /> 
          <CustomScriptInjector />
          <main className={mainClassName}>
            {children}
          </main>
          {!isAdminRoute && <AppFooter />}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
