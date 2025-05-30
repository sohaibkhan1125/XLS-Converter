
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/use-admin-auth'; 
import LoadingSpinner from '@/components/core/loading-spinner';

export default function AdminRootPage() {
  const router = useRouter();
  // useAdminAuth must be called within AdminAuthProvider,
  // which is in AdminRootLayout. This page itself is a child of that layout.
  const { adminUser, loading } = useAdminAuth(); 

  useEffect(() => {
    if (typeof window === 'undefined' || loading) return;

    const isAdminSetupComplete = localStorage.getItem('admin_setup_complete') === 'true';

    if (!isAdminSetupComplete) {
      router.replace('/admin/signup');
    } else {
      if (adminUser) {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/admin/login');
      }
    }
  }, [adminUser, loading, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <LoadingSpinner message="Initializing Admin Panel..." />
    </div>
  );
}
