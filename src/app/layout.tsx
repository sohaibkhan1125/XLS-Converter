
import type { Metadata } from 'next';
import { Geist } from 'next/font/google'; // Using Geist Sans as per existing setup
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import AppHeader from '@/components/layout/header';
import AppFooter from '@/components/layout/footer'; // Import the new footer

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'XLSConvert - PDF to Excel Converter',
  description: 'Easily convert your PDF files to structured Excel spreadsheets.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased font-sans flex flex-col min-h-screen`}>
        <AuthProvider>
          <AppHeader />
          {/* Added pt-16 for sticky header height (h-16 is 4rem = 64px), py-8 becomes pt-24 pb-8 */}
          <main className="flex-grow container mx-auto px-4 py-8 pt-24 pb-8">
            {children}
          </main>
          <AppFooter /> {/* Add the new footer */}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
