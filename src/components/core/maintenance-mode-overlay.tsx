
"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { GeneralSiteSettings } from '@/types/site-settings';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';
import AppLogo from '@/components/layout/app-logo'; // For displaying the site logo
import { Construction } from 'lucide-react'; // Icon for maintenance

const DEFAULT_SITE_TITLE_FALLBACK = "XLSConvert";

export default function MaintenanceModeOverlay() {
  const [settings, setSettings] = useState<GeneralSiteSettings | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = subscribeToGeneralSettings((fetchedSettings) => {
      setSettings(fetchedSettings);
    });
    return () => unsubscribe();
  }, []);

  const isMaintenanceModeActive = settings?.maintenanceModeEnabled || false;
  const isAdminRoute = pathname.startsWith('/admin');

  if (!isMaintenanceModeActive || isAdminRoute) {
    return null; // Don't render anything if maintenance mode is off or if it's an admin page
  }

  const siteTitle = settings?.siteTitle || DEFAULT_SITE_TITLE_FALLBACK;
  const logoUrl = settings?.logoUrl;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background text-foreground p-8"
      aria-live="polite"
      role="alertdialog"
      aria-labelledby="maintenance-title"
      aria-describedby="maintenance-description"
    >
      <div className="text-center space-y-6 bg-card p-10 rounded-xl shadow-2xl max-w-lg w-full">
        <div className="mb-6">
          <AppLogo logoUrl={logoUrl} siteTitle={siteTitle} />
        </div>
        
        <Construction className="h-16 w-16 text-primary mx-auto animate-pulse" />
        
        <h1 id="maintenance-title" className="text-4xl font-extrabold text-primary">
          Site Under Maintenance
        </h1>
        <p id="maintenance-description" className="text-lg text-muted-foreground">
          We're working hard to improve your experience. The site will be back online shortly.
        </p>
        <p className="text-sm text-muted-foreground">
          Thank you for your patience.
        </p>
      </div>
    </div>
  );
}
