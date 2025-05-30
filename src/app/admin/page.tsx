
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/use-admin-auth'; 
import LoadingSpinner from '@/components/core/loading-spinner';

export default function AdminRootPage() {
  const router = useRouter();
  const { adminUser, loading } = useAdminAuth(); 

  useEffect(() => {
    if (loading) return; // Wait for auth state to resolve

    if (adminUser) {
      router.replace('/admin/dashboard');
    } else {
      router.replace('/admin/login');
    }
  }, [adminUser, loading, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <LoadingSpinner message="Initializing Admin Panel..." />
    </div>
  );
}
