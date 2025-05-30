
"use client";

import { useEffect, useState, type ReactNode } from 'react'; // Added useState
import { useRouter, usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/hooks/use-admin-auth';
import AdminHeader from '@/components/admin/layout/admin-header';
import AdminSidebar from '@/components/admin/layout/admin-sidebar';

function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const { adminUser, loading: authLoading } = useAdminAuth(); // Renamed loading to authLoading for clarity
  const router = useRouter();
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted || authLoading) return; // Wait for mount and auth state to resolve

    const isAuthPage = pathname === '/admin/login' || pathname === '/admin/signup';
    const isAdminRootPage = pathname === '/admin';

    if (!adminUser && !isAuthPage && !isAdminRootPage) {
      router.replace('/admin/login');
    }
  }, [adminUser, authLoading, router, pathname, hasMounted]);

  if (!hasMounted) {
    // This is rendered on the server and initially on the client before useEffect runs
    return <div className="flex h-screen items-center justify-center"><p>Initializing Admin UI...</p></div>;
  }

  if (authLoading) {
    // This is rendered on the client if auth is still loading after mount
    return <div className="flex h-screen items-center justify-center"><p>Loading Admin Data...</p></div>;
  }

  // For login, signup, and initial /admin redirector, don't render full layout
  if (pathname === '/admin/login' || pathname === '/admin/signup' || pathname === '/admin') {
    return <>{children}</>;
  }
  
  // Render full layout for authenticated admin areas like dashboard
  if (!adminUser) {
    // This case should ideally be handled by the redirect effect, but as a fallback during transition:
     return <div className="flex h-screen items-center justify-center"><p>Redirecting to login...</p></div>;
  }

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
