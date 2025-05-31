
"use client"; 

import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import AppHeader from '@/components/layout/header';
import AppFooter from '@/components/layout/footer';
import AdScriptInjector from '@/components/ads/ad-script-injector';
import CustomScriptInjector from '@/components/core/custom-script-injector'; // Added
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { GeneralSiteSettings } from '@/types/site-settings';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const DEFAULT_FALLBACK_TITLE = "XLSConvert - PDF to Excel Converter";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');

  const [siteTitle, setSiteTitle] = useState<string | undefined>(undefined);
  const [siteDescription, setSiteDescription] = useState<string>(`Easily convert your PDF files to structured Excel spreadsheets.`);


  useEffect(() => {
    const unsubscribe = subscribeToGeneralSettings((settings) => {
      const currentTitle = settings?.siteTitle || DEFAULT_FALLBACK_TITLE.split(" - ")[0];
      if (settings && settings.siteTitle) {
        setSiteTitle(settings.siteTitle);
        document.title = `${settings.siteTitle} - PDF to Excel Converter`;
        setSiteDescription(`Easily convert your PDF files to structured Excel spreadsheets with ${settings.siteTitle}.`);
      } else {
        setSiteTitle(undefined); 
        document.title = DEFAULT_FALLBACK_TITLE;
        setSiteDescription(`Easily convert your PDF files to structured Excel spreadsheets.`);
      }
    });
    return () => unsubscribe();
  }, []);

  const mainClassName = isAdminRoute 
    ? "flex-grow" 
    : "flex-grow container mx-auto px-4 py-8 pt-24 pb-8";

  return (
    <html lang="en">
      <head>
        <title>{siteTitle ? `${siteTitle} - PDF to Excel Converter` : DEFAULT_FALLBACK_TITLE}</title>
        <meta name="description" content={siteDescription} />
      </head>
      <body className={`${geistSans.variable} antialiased font-sans flex flex-col min-h-screen`}>
        <AuthProvider>
          {!isAdminRoute && <AppHeader />}
          <AdScriptInjector /> 
          <CustomScriptInjector /> {/* Added CustomScriptInjector */}
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
