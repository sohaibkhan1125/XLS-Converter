
"use client";

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import AppLogo from './app-logo';
import { Languages, Menu } from 'lucide-react'; 
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service'; 
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { useLanguage } from '@/context/language-context';
import { languages } from '@/config/translations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const GENERIC_APP_NAME_FALLBACK = "My App";

export default function AppHeader() {
  const { currentUser, signOut, loading: authLoading } = useAuth();
  const { setLanguage, getTranslation } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  
  const [logoUrl, setLogoUrl] = useState<string | undefined | null>(undefined);
  const [siteTitleForLogo, setSiteTitleForLogo] = useState<string>(GENERIC_APP_NAME_FALLBACK);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    setIsLoadingSettings(true);
    const unsubscribe = subscribeToGeneralSettings((settings) => {
      if (settings) {
        setLogoUrl(settings.logoUrl);
        setSiteTitleForLogo(settings.siteTitle || GENERIC_APP_NAME_FALLBACK);
      } else {
        setLogoUrl(undefined);
        setSiteTitleForLogo(GENERIC_APP_NAME_FALLBACK);
      }
      setIsLoadingSettings(false);
    });
    return () => unsubscribe();
  }, []);

  const isHomePage = pathname === '/';
  
  const loggedOutLinks = [
    ...(!isHomePage ? [{ id: 'home', href: '/', labelKey: 'navHome' }] : []),
    { id: 'pricing', href: '/pricing', labelKey: 'navPricing' },
    { id: 'login', href: '/login', labelKey: 'login' },
    { id: 'register', href: '/signup', labelKey: 'register' },
  ];

  const loggedInLinks = [
    ...(!isHomePage ? [{ id: 'home', href: '/', labelKey: 'navHome' }] : []),
    { id: 'pricing', href: '/pricing', labelKey: 'navPricing' },
    { id: 'documents', href: '/documents', labelKey: 'navDocuments' },
    { id: 'signout', action: signOut, labelKey: 'signout' },
  ];
  
  const mobileLinks = currentUser ? loggedInLinks : loggedOutLinks;

  return (
    <header className="sticky top-0 z-50 border-b bg-card shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left Side: Logo */}
        <div className="flex-1 flex justify-start">
         {isLoadingSettings ? 
            <div className="flex items-center gap-2 text-primary">
                <div className="h-7 w-7 bg-muted rounded-full animate-pulse"></div>
                <div className="h-6 w-24 bg-muted rounded animate-pulse"></div>
            </div>
            : <AppLogo logoUrl={logoUrl} siteTitle={siteTitleForLogo} />
        }
        </div>

        {/* Center: Desktop Navigation */}
        <nav className="hidden md:flex flex-1 justify-center items-center gap-6 text-sm font-medium">
          {authLoading || isLoadingSettings ? (
            <div className="h-4 w-4/5 animate-pulse rounded-md bg-muted"></div>
          ) : currentUser ? (
            // Logged-in Links
            loggedInLinks.map((link) => (
              link.action ? (
                <button key={link.id} onClick={link.action} className="text-muted-foreground hover:text-primary transition-colors">
                  {getTranslation(link.labelKey)}
                </button>
              ) : (
                <Link key={link.id} href={link.href!} className="text-muted-foreground hover:text-primary transition-colors">
                  {getTranslation(link.labelKey)}
                </Link>
              )
            ))
          ) : (
            // Logged-out Links
            loggedOutLinks.map((link) => (
              <Link key={link.id} href={link.href} className="text-muted-foreground hover:text-primary transition-colors">
                {getTranslation(link.labelKey)}
              </Link>
            ))
          )}
        </nav>

        {/* Right Side: Language & Mobile Menu */}
        <div className="flex flex-1 justify-end items-center gap-2">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Languages className="h-5 w-5" />
                <span className="sr-only">Change language</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Select Language</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {languages.map(lang => (
                <DropdownMenuItem key={lang.code} onSelect={() => setLanguage(lang.code)}>
                  {lang.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px] pt-10">
                <VisuallyHidden>
                  <SheetTitle>Mobile Navigation Menu</SheetTitle>
                </VisuallyHidden>
                <nav className="flex flex-col gap-4">
                   {authLoading || isLoadingSettings ? (
                     Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-6 w-3/4 animate-pulse rounded-md bg-muted mb-2"></div>
                    ))
                  ) : (
                    mobileLinks.map((link) => (
                      link.action ? (
                        <button
                          key={link.id}
                          onClick={() => { link.action(); setMobileMenuOpen(false); }}
                          className="text-lg font-medium text-foreground hover:text-primary transition-colors text-left"
                        >
                          {getTranslation(link.labelKey)}
                        </button>
                      ) : (
                        <Link 
                          key={link.id} 
                          href={link.href!} 
                          className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {getTranslation(link.labelKey)}
                        </Link>
                      )
                    ))
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
