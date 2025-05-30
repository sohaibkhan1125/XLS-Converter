
"use client";

import Link from 'next/link';
import AppLogo from './app-logo';
import { useState, useEffect } from 'react';
import type { FooterSettings } from '@/types/footer';
import { subscribeToFooterSettings } from '@/lib/firebase-footer-service'; // Assuming this service exists

const mainSiteLinks = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy Policy' },
];

export default function AppFooter() {
  const [footerSettings, setFooterSettings] = useState<Partial<FooterSettings> | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    setIsLoadingSettings(true);
    const unsubscribe = subscribeToFooterSettings((settings) => {
      if (settings) {
        setFooterSettings(settings);
      } else {
        // Default values if nothing in Firestore
        setFooterSettings({ footerSiteTitle: "XLSConvert", footerLogoUrl: undefined });
      }
      setIsLoadingSettings(false);
    });
    return () => unsubscribe();
  }, []);

  // Use default title if settings are loading or not set
  const displayTitle = isLoadingSettings ? "XLSConvert" : (footerSettings?.footerSiteTitle || "XLSConvert");
  const displayLogoUrl = isLoadingSettings ? undefined : footerSettings?.footerLogoUrl;

  return (
    <footer className="border-t bg-card text-card-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex-shrink-0">
            {/* Pass dynamic or default values to AppLogo */}
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
