
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/use-admin-auth'; 
import LoadingSpinner from '@/components/core/loading-spinner';
import { checkIfAnyAdminSetupInFirestore } from '@/lib/firebase-admin-service';

export default function AdminRootPage() {
  const router = useRouter();
  const { adminUser, loading: authLoading } = useAdminAuth(); 
  const [setupCheckLoading, setSetupCheckLoading] = useState(true);
  const [isAdminSetup, setIsAdminSetup] = useState(false);

  useEffect(() => {
    async function checkAdminSetup() {
      setSetupCheckLoading(true);
      const anyAdminExists = await checkIfAnyAdminSetupInFirestore();
      setIsAdminSetup(anyAdminExists);
      setSetupCheckLoading(false);
    }
    checkAdminSetup();
  }, []);

  useEffect(() => {
    if (setupCheckLoading || authLoading) return; // Wait for both checks to complete

    if (adminUser) { // Validated admin user
      router.replace('/admin/dashboard');
    } else { // No validated admin user
      if (isAdminSetup) {
        router.replace('/admin/login');
      } else {
        router.replace('/admin/signup');
      }
    }
  }, [adminUser, authLoading, setupCheckLoading, isAdminSetup, router]);

  if (setupCheckLoading || authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <LoadingSpinner message="Initializing Admin Panel..." />
      </div>
    );
  }
  
  // Fallback or brief content before redirect kicks in
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <LoadingSpinner message="Redirecting..." />
    </div>
  );
}
