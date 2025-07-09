
"use client";

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppLogo from './app-logo';
import { Languages, LogOut, Menu } from 'lucide-react'; 
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import type { NavItem } from '@/types/site-settings'; 
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service'; 
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { useLanguage } from '@/context/language-context';
import { languages } from '@/config/translations';

const DEFAULT_NAV_LINKS: {id: string; href: string; labelKey: string}[] = [
  { id: 'home', href: '/', labelKey: 'navHome' },
  { id: 'blogs', href: '/blogs', labelKey: 'navBlogs' },
  { id: 'pricing', href: '/pricing', labelKey: 'navPricing' },
  { id: 'about', href: '/about', labelKey: 'navAbout' },
  { id: 'contact', href: '/contact', labelKey: 'navContact' },
];
const GENERIC_APP_NAME_FALLBACK = "My App"; // More generic fallback

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

  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  const isHomePage = pathname === '/';
  const navLinksToShow = isHomePage
    ? []
    : DEFAULT_NAV_LINKS;

  return (
    <header className="sticky top-0 z-50 border-b bg-card shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {isLoadingSettings ? 
            <div className="flex items-center gap-2 text-primary">
                <div className="h-7 w-7 bg-muted rounded-full animate-pulse"></div>
                <div className="h-6 w-24 bg-muted rounded animate-pulse"></div>
            </div>
            : <AppLogo logoUrl={logoUrl} siteTitle={siteTitleForLogo} />
        }

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {isLoadingSettings ? (
            Array.from({ length: navLinksToShow.length }).map((_, index) => (
              <div key={index} className="h-4 w-20 animate-pulse rounded-md bg-muted"></div>
            ))
          ) : (
            navLinksToShow.map((link) => (
              <Link key={link.id} href={link.href} className="text-muted-foreground hover:text-primary transition-colors">
                {getTranslation(link.labelKey)}
              </Link>
            ))
          )}
        </nav>

        <div className="flex items-center gap-2">
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

          {authLoading || isLoadingSettings ? (
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted sm:h-8 sm:w-20 sm:rounded-md"></div>
          ) : currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || currentUser.email || 'User'} />
                    <AvatarFallback>{getInitials(currentUser.email)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {currentUser.displayName || currentUser.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link href="/login">{getTranslation('login')}</Link>
              </Button>
              <Button variant="default" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/signup">{getTranslation('signup')}</Link>
              </Button>
            </>
          )}
          
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
                  {isLoadingSettings ? (
                     Array.from({ length: navLinksToShow.length }).map((_, index) => (
                      <div key={index} className="h-6 w-3/4 animate-pulse rounded-md bg-muted mb-2"></div>
                    ))
                  ) : (
                    navLinksToShow.map((link) => (
                      <Link 
                        key={link.id} 
                        href={link.href} 
                        className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {getTranslation(link.labelKey)}
                      </Link>
                    ))
                  )}
                  <hr className="my-4"/>
                  {!currentUser && !authLoading && (
                     <Link 
                      href="/login" 
                      className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {getTranslation('login')}
                    </Link>
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
