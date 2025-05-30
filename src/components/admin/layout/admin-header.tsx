
"use client";

import { Button } from '@/components/ui/button';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { LogOut, Shield, Home } from 'lucide-react'; // Added Home icon
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function AdminHeader() {
  const { adminUser, adminSignOut, loading } = useAdminAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await adminSignOut();
      toast({ title: "Logged Out", description: "Admin successfully logged out." });
      // Router will redirect via layout effect
    } catch (error) {
      toast({ variant: "destructive", title: "Logout Error", description: "Failed to log out." });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/admin/dashboard" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
          <Shield className="h-7 w-7" />
          <span className="text-xl font-semibold">Admin Panel</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/" className="flex items-center">
              <Home className="mr-1 h-4 w-4" />
              View Site
            </Link>
          </Button>

          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>
          ) : adminUser ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {adminUser.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-1 h-4 w-4" />
                Logout
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
