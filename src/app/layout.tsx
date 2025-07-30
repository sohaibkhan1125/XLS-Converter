
"use client";

import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import { usePathname } from 'next/navigation';
import { LanguageProvider } from '@/context/language-context';
import AppInitializer from '@/components/core/app-initializer';

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

  const mainClassName = isAdminRoute
    ? "flex-grow"
    : "flex-grow container mx-auto px-4 py-8 pt-24 pb-8";

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        {/* Basic meta tags. Title and description will be set by pages or AppInitializer */}
      </head>
      <body className={`${geistSans.variable} antialiased font-sans flex flex-col min-h-screen`} suppressHydrationWarning={true}>
        <AuthProvider>
          <LanguageProvider>
            <AppInitializer>
              <main className={mainClassName}>
                {children}
              </main>
            </AppInitializer>
            <Toaster />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
