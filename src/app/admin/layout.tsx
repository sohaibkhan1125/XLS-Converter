
"use client";

import { useEffect, useState, type ReactNode } from 'react'; 
import { useRouter, usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/hooks/use-admin-auth';
import AdminHeader from '@/components/admin/layout/admin-header';
import AdminSidebar from '@/components/admin/layout/admin-sidebar';
import LoadingSpinner from '@/components/core/loading-spinner'; // Import LoadingSpinner

function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const { adminUser, loading: authLoading } = useAdminAuth(); 
  const router = useRouter();
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted || authLoading) return; // Wait for client mount and auth to resolve

    const isAuthPage = pathname === '/admin/login' || pathname === '/admin/signup';
    const isAdminRootPage = pathname === '/admin';

    // If not an admin user and not on an auth page or the root admin page (which handles its own redirects),
    // redirect to login.
    if (!adminUser && !isAuthPage && !isAdminRootPage) {
      router.replace('/admin/login');
    }
    
    // If an admin user is logged in and tries to access login/signup, redirect to dashboard.
    if (adminUser && isAuthPage) {
      router.replace('/admin/dashboard');
    }

  }, [adminUser, authLoading, router, pathname, hasMounted]);

  if (!hasMounted) {
    // Generic initial loading state, same for server and client initial render
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner message="Initializing Admin UI..." /></div>;
  }

  // If auth is still loading, and we are NOT on an auth page or the root admin page, show a loading screen.
  // This prevents flashing content before redirection logic in useEffect kicks in.
  // The root /admin page has its own loading logic.
  if (authLoading && (pathname !== '/admin/login' && pathname !== '/admin/signup' && pathname !== '/admin')) {
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner message="Loading Admin Data..." /></div>;
  }
  
  // For login, signup, and the root /admin page, render children directly without the full admin layout
  // (header/sidebar). These pages handle their own layout/redirects.
  if (pathname === '/admin/login' || pathname === '/admin/signup' || pathname === '/admin') {
    // If user is already logged in and lands on these, useEffect above will redirect them.
    // If authLoading is still true here but adminUser is null, it's okay to show the page,
    // as these pages often have their own internal loading indicators or redirect logic.
    return <>{children}</>;
  }
  
  // If we reach here and there's no validated adminUser (and not authLoading),
  // it means the redirect effect hasn't kicked in or there's a brief moment.
  // The primary protection is the useEffect hook. Show a redirecting message.
  if (!adminUser && !authLoading) { // Check !authLoading here
     return <div className="flex h-screen items-center justify-center"><LoadingSpinner message="Redirecting to login..." /></div>;
  }

  // If we have a validated adminUser, render the full admin layout.
  if (adminUser) {
    return (
      <div className="flex min-h-screen flex-col">
        <AdminHeader />
        <div className="flex flex-1">
          <AdminSidebar />
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    );
  }

  // Fallback: Should be covered by other conditions, but ensures something renders
  // if auth is still loading and we are on a protected page.
  return <div className="flex h-screen items-center justify-center"><LoadingSpinner message="Loading..." /></div>;
}

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminProtectedLayout>{children}</AdminProtectedLayout>
    </AdminAuthProvider>
  );
}
