
"use client";

import { useEffect, useState, type ReactNode } from 'react'; 
import { useRouter, usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/hooks/use-admin-auth';
import AdminHeader from '@/components/admin/layout/admin-header';
import AdminSidebar from '@/components/admin/layout/admin-sidebar';

function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const { adminUser, loading: authLoading } = useAdminAuth(); 
  const router = useRouter();
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted || authLoading) return; 

    const isAuthPage = pathname === '/admin/login' || pathname === '/admin/signup';

    // If not an admin user and not on an auth page (login/signup), redirect to login.
    // This now also protects /admin itself if the user is not authenticated.
    if (!adminUser && !isAuthPage) {
      router.replace('/admin/login');
    }
    
    // If an admin user is logged in and tries to access login/signup, redirect to dashboard.
    if (adminUser && isAuthPage) {
      router.replace('/admin/dashboard');
    }

  }, [adminUser, authLoading, router, pathname, hasMounted]);

  if (!hasMounted) {
    return <div className="flex h-screen items-center justify-center"><p>Initializing Admin UI...</p></div>;
  }

  if (authLoading && !adminUser && (pathname !== '/admin/login' && pathname !== '/admin/signup')) {
    // Show a more persistent loading screen if auth is loading and we are not on auth pages
    // and there's no adminUser yet (prevents brief flash of content before redirect)
    return <div className="flex h-screen items-center justify-center"><p>Loading Admin Data...</p></div>;
  }
  
  // For login and signup pages, render children directly without full layout
  // This allows them to have their own simpler layout (e.g. centered form)
  if (pathname === '/admin/login' || pathname === '/admin/signup') {
    // If user is already logged in, the useEffect above will redirect them,
    // otherwise, show the login/signup page.
    // If authLoading is still true here but user is null, it's fine to show the page,
    // as auth pages handle their own internal loading/redirects for already logged-in users.
    return <>{children}</>;
  }
  
  // If we reach here, and there's no adminUser, it means the redirect effect hasn't kicked in yet
  // or there's a brief moment before redirection. Show a loading/redirecting message.
  // The primary protection is the useEffect hook.
  if (!adminUser) {
     return <div className="flex h-screen items-center justify-center"><p>Redirecting to login...</p></div>;
  }

  // Render full layout for authenticated admin areas (e.g., /admin/dashboard, /admin itself if logged in)
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

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminProtectedLayout>{children}</AdminProtectedLayout>
    </AdminAuthProvider>
  );
}
