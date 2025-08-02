
"use client";

import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import { usePathname } from 'next/navigation';
import { LanguageProvider } from '@/context/language-context';
import AppInitializer, { DEFAULT_SITE_NAME_FALLBACK } from '@/components/core/app-initializer';

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
        {/* Default Open Graph tags */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={DEFAULT_SITE_NAME_FALLBACK} />
        <meta property="og:image" content="https://placehold.co/1200x630.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

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
