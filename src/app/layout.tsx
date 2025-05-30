
"use client"; // Required for usePathname

import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import AppHeader from '@/components/layout/header';
import AppFooter from '@/components/layout/footer';
import { usePathname } from 'next/navigation'; // Import usePathname

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

// Note: Metadata export is for server components. If RootLayout becomes fully client,
// metadata might need to be handled differently (e.g. in a parent server component or page.tsx files).
// However, for this specific change, we only need usePathname for conditional rendering.
// Next.js allows 'use client' at the top of a layout while still respecting metadata.
// export const metadata: Metadata = { // This should ideally be in a server component layout or page
//   title: 'XLSConvert - PDF to Excel Converter',
//   description: 'Easily convert your PDF files to structured Excel spreadsheets.',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');

  // Determine main class based on route
  const mainClassName = isAdminRoute 
    ? "flex-grow" 
    : "flex-grow container mx-auto px-4 py-8 pt-24 pb-8";

  return (
    <html lang="en">
      <head>
        {/* Metadata can be placed here directly or managed via Next.js metadata API in page.tsx/layout.tsx server components */}
        <title>XLSConvert - PDF to Excel Converter</title>
        <meta name="description" content="Easily convert your PDF files to structured Excel spreadsheets." />
      </head>
      <body className={`${geistSans.variable} antialiased font-sans flex flex-col min-h-screen`}>
        <AuthProvider>
          {!isAdminRoute && <AppHeader />}
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
