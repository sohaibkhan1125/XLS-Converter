
"use client"; 

import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import AppHeader from '@/components/layout/header';
import AppFooter from '@/components/layout/footer';
import AdScriptInjector from '@/components/ads/ad-script-injector';
import CustomScriptInjector from '@/components/core/custom-script-injector';
import { usePathname } from 'next/navigation';
// Removed: import { useState, useEffect } from 'react';
// Removed: import type { GeneralSiteSettings } from '@/types/site-settings';
// Removed: import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const DEFAULT_FALLBACK_TITLE = "XLSConvert - PDF to Excel Converter";
const DEFAULT_FALLBACK_DESCRIPTION = "Easily convert your PDF files to structured Excel spreadsheets.";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');

  // Removed siteTitle and siteDescription state and effect for dynamic settings

  const mainClassName = isAdminRoute 
    ? "flex-grow" 
    : "flex-grow container mx-auto px-4 py-8 pt-24 pb-8";

  return (
    <html lang="en">
      <head>
        <title>{DEFAULT_FALLBACK_TITLE}</title>
        <meta name="description" content={DEFAULT_FALLBACK_DESCRIPTION} />
      </head>
      <body className={`${geistSans.variable} antialiased font-sans flex flex-col min-h-screen`}>
        <AuthProvider>
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
