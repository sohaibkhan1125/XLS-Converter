
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
import { LogOut, Menu, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import type { NavbarSettings, NavItem } from '@/types/navbar';
import { subscribeToNavbarSettings } from '@/lib/firebase-navbar-service';

const DEFAULT_NAV_LINKS: NavItem[] = [
  { id: 'home', href: '/', label: 'Home' },
  { id: 'pricing', href: '/pricing', label: 'Pricing' },
  { id: 'about', href: '/about', label: 'About' },
  { id: 'contact', href: '/contact', label: 'Contact' },
  { id: 'privacy', href: '/privacy', label: 'Privacy Policy' },
];

export default function AppHeader() {
  const { currentUser, signOut, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [navbarSettings, setNavbarSettings] = useState<Partial<NavbarSettings> | null>(null);
  const [navItems, setNavItems] = useState<NavItem[]>(DEFAULT_NAV_LINKS);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    setIsLoadingSettings(true);
    const unsubscribe = subscribeToNavbarSettings((settings) => {
      if (settings) {
        setNavbarSettings(settings);
        setNavItems(settings.navItems && settings.navItems.length > 0 ? settings.navItems : DEFAULT_NAV_LINKS);
      } else {
        // No settings found in Firestore, use defaults
        setNavbarSettings({ siteTitle: "XLSConvert", logoUrl: undefined }); // Provide default object
        setNavItems(DEFAULT_NAV_LINKS);
      }
      setIsLoadingSettings(false);
    });
    return () => unsubscribe();
  }, []);

  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  const siteTitle = navbarSettings?.siteTitle || "XLSConvert";
  const logoUrl = navbarSettings?.logoUrl;

  return (
    <header className="sticky top-0 z-50 border-b bg-card shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <AppLogo logoUrl={logoUrl} siteTitle={siteTitle} />

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {isLoadingSettings ? (
            Array.from({ length: DEFAULT_NAV_LINKS.length }).map((_, index) => (
              <div key={index} className="h-4 w-20 animate-pulse rounded-md bg-muted"></div>
            ))
          ) : (
            navItems.map((link) => (
              <Link key={link.id} href={link.href} className="text-muted-foreground hover:text-primary transition-colors">
                {link.label}
              </Link>
            ))
          )}
        </nav>

        <div className="flex items-center gap-2">
          {authLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>
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
                <Link href="/login">Log In</Link>
              </Button>
              <Button variant="default" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/signup">Sign Up</Link>
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
                <nav className="flex flex-col gap-4">
                  {isLoadingSettings ? (
                     Array.from({ length: DEFAULT_NAV_LINKS.length }).map((_, index) => (
                      <div key={index} className="h-6 w-3/4 animate-pulse rounded-md bg-muted mb-2"></div>
                    ))
                  ) : (
                    navItems.map((link) => (
                      <Link 
                        key={link.id} 
                        href={link.href} 
                        className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {link.label}
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
                      Log In
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
