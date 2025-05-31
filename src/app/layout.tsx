
"use client"; 

import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import AppHeader from '@/components/layout/header';
import AppFooter from '@/components/layout/footer';
import AdScriptInjector from '@/components/ads/ad-script-injector';
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
  // const isAuthPage = pathname === '/login' || pathname === '/signup'; // Not directly used for layout class

  const [siteTitle, setSiteTitle] = useState<string | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = subscribeToGeneralSettings((settings) => {
      if (settings && settings.siteTitle) {
        setSiteTitle(settings.siteTitle);
        document.title = `${settings.siteTitle} - PDF to Excel Converter`;
      } else {
        setSiteTitle(undefined); // Explicitly set to undefined if not found
        document.title = DEFAULT_FALLBACK_TITLE;
      }
    });
    return () => unsubscribe();
  }, []);

  // Determine main class based on route
  const mainClassName = isAdminRoute 
    ? "flex-grow" 
    : "flex-grow container mx-auto px-4 py-8 pt-24 pb-8";

  return (
    <html lang="en">
      <head>
        {/* 
          The <title> tag here is a fallback for initial server render or if JS is disabled.
          It will be dynamically updated by the useEffect hook above.
          For robust SEO with dynamic titles from client components, more advanced Next.js patterns
          (like using generateMetadata with server components higher up if possible) might be needed,
          or relying on search engines to execute JS.
        */}
        <title>{siteTitle ? `${siteTitle} - PDF to Excel Converter` : DEFAULT_FALLBACK_TITLE}</title>
        <meta name="description" content={`Easily convert your PDF files to structured Excel spreadsheets with ${siteTitle || 'our service'}.`} />
      </head>
      <body className={`${geistSans.variable} antialiased font-sans flex flex-col min-h-screen`}>
        <AuthProvider>
          {!isAdminRoute && <AppHeader />}
          <AdScriptInjector /> 
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
