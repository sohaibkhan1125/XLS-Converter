
"use client";

import Link from 'next/link';
import AppLogo from './app-logo';
import { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react'; 
import type { GeneralSiteSettings, NavItem, SocialLink } from '@/types/site-settings'; 
import { subscribeToGeneralSettings, PREDEFINED_SOCIAL_MEDIA_PLATFORMS } from '@/lib/firebase-settings-service'; 

const mainSiteLinks: NavItem[] = [ 
  { id: 'home', href: '/', label: 'Home' },
  { id: 'pricing', href: '/pricing', label: 'Pricing' },
  { id: 'about', href: '/about', label: 'About' },
  { id: 'contact', href: '/contact', label: 'Contact' },
  { id: 'privacy', href: '/privacy', label: 'Privacy Policy' },
];
const DEFAULT_SITE_TITLE_FALLBACK = "XLSConvert";
const DEFAULT_SOCIAL_LINKS: SocialLink[] = PREDEFINED_SOCIAL_MEDIA_PLATFORMS.map(p => ({
  ...p,
  url: '',
  enabled: false,
}));


export default function AppFooter() {
  const [logoUrl, setLogoUrl] = useState<string | undefined | null>(undefined);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(DEFAULT_SOCIAL_LINKS);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    setIsLoadingSettings(true);
    const unsubscribe = subscribeToGeneralSettings((settings) => {
      if (settings) {
        setLogoUrl(settings.logoUrl); // Keep dynamic logo
        // Ensure socialLinks are merged correctly if they exist, or use default
        const mergedSocialLinks = PREDEFINED_SOCIAL_MEDIA_PLATFORMS.map(p_defined => {
          const savedLink = settings.socialLinks?.find(sl => sl.id === p_defined.id);
          return savedLink ? { ...p_defined, ...savedLink } : { ...p_defined, url: '', enabled: false };
        });
        setSocialLinks(mergedSocialLinks);
      } else {
        setLogoUrl(undefined);
        setSocialLinks(DEFAULT_SOCIAL_LINKS);
      }
      setIsLoadingSettings(false);
    });
    return () => unsubscribe();
  }, []);

  const displayTitleForLogoAndCopyright = DEFAULT_SITE_TITLE_FALLBACK;
  const displayLogoUrlToPass = isLoadingSettings ? undefined : logoUrl;
  const enabledSocialLinks = socialLinks?.filter(link => link.enabled && link.url) || [];

  return (
    <footer className="border-t bg-card text-card-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="flex-shrink-0 md:col-span-1 flex justify-center md:justify-start">
            <AppLogo logoUrl={displayLogoUrlToPass} siteTitle={displayTitleForLogoAndCopyright} />
          </div>
          
          <nav className="flex flex-wrap justify-center md:col-span-1 gap-x-6 gap-y-2 text-sm">
            {mainSiteLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-primary transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>

          {enabledSocialLinks.length > 0 && (
            <div className="flex justify-center md:justify-end items-center gap-4 md:col-span-1">
              {enabledSocialLinks.map((link) => {
                // @ts-ignore - LucideIcons is an object, iconName is a key
                const IconComponent = LucideIcons[link.iconName] as LucideIcons.LucideIcon | undefined || LucideIcons.Link2;
                return (
                  <Link key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.name}
                        className="text-muted-foreground hover:text-primary transition-colors">
                    <IconComponent className="h-6 w-6" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-8 text-center text-sm text-muted-foreground border-t border-border pt-8">
          © {new Date().getFullYear()} {displayTitleForLogoAndCopyright}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
