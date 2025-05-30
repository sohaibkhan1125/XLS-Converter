
"use client"; // Required for usePathname

import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import AppHeader from '@/components/layout/header';
import AppFooter from '@/components/layout/footer';
import AdScriptInjector from '@/components/ads/ad-script-injector'; // Import AdScriptInjector
import { usePathname } from 'next/navigation'; // Import usePathname

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');
  const isAuthPage = pathname === '/login' || pathname === '/signup';


  // Determine main class based on route
  const mainClassName = isAdminRoute 
    ? "flex-grow" 
    : "flex-grow container mx-auto px-4 py-8 pt-24 pb-8";

  return (
    <html lang="en">
      <head>
        <title>XLSConvert - PDF to Excel Converter</title>
        <meta name="description" content="Easily convert your PDF files to structured Excel spreadsheets." />
      </head>
      <body className={`${geistSans.variable} antialiased font-sans flex flex-col min-h-screen`}>
        <AuthProvider>
          {!isAdminRoute && <AppHeader />}
          {/* AdScriptInjector will internally handle not running on admin/auth pages */}
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
