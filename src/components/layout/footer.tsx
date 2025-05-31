
"use client";

import Link from 'next/link';
import AppLogo from './app-logo';
import { useState, useEffect } from 'react';
import type { GeneralSiteSettings, NavItem } from '@/types/site-settings'; // Updated type import
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service'; // Updated service import

const mainSiteLinks: NavItem[] = [ // Use NavItem type for consistency
  { id: 'home', href: '/', label: 'Home' },
  { id: 'pricing', href: '/pricing', label: 'Pricing' },
  { id: 'about', href: '/about', label: 'About' },
  { id: 'contact', href: '/contact', label: 'Contact' },
  { id: 'privacy', href: '/privacy', label: 'Privacy Policy' },
];
const DEFAULT_SITE_TITLE = "XLSConvert";

export default function AppFooter() {
  const [generalSettings, setGeneralSettings] = useState<Partial<GeneralSiteSettings> | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    setIsLoadingSettings(true);
    const unsubscribe = subscribeToGeneralSettings((settings) => {
      if (settings) {
        setGeneralSettings(settings);
      } else {
        // Default values if nothing in Firestore
        setGeneralSettings({ siteTitle: DEFAULT_SITE_TITLE, logoUrl: undefined });
      }
      setIsLoadingSettings(false);
    });
    return () => unsubscribe();
  }, []);

  // Use default title if settings are loading or not set
  const displayTitle = isLoadingSettings ? DEFAULT_SITE_TITLE : (generalSettings?.siteTitle || DEFAULT_SITE_TITLE);
  const displayLogoUrl = isLoadingSettings ? undefined : generalSettings?.logoUrl;

  return (
    <footer className="border-t bg-card text-card-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex-shrink-0">
            <AppLogo logoUrl={displayLogoUrl} siteTitle={displayTitle} />
          </div>
          <nav className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm">
            {mainSiteLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-primary transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-8 text-center text-sm text-muted-foreground border-t border-border pt-8">
          © {new Date().getFullYear()} {displayTitle}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
