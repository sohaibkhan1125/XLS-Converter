
"use client";

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/hooks/use-admin-auth';
import AdminHeader from '@/components/admin/layout/admin-header';
import AdminSidebar from '@/components/admin/layout/admin-sidebar';

function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const { adminUser, loading } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/admin/login' || pathname === '/admin/signup';
    const isAdminRootPage = pathname === '/admin';

    if (!adminUser && !isAuthPage && !isAdminRootPage) {
      router.replace('/admin/login');
    }
  }, [adminUser, loading, router, pathname]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><p>Loading Admin...</p></div>;
  }

  // For login, signup, and initial /admin redirector, don't render full layout
  if (pathname === '/admin/login' || pathname === '/admin/signup' || pathname === '/admin') {
    return <>{children}</>;
  }
  
  // Render full layout for authenticated admin areas like dashboard
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
