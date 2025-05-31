
"use client";

import { AdminAuthForm, type AuthFormValues } from "@/components/admin/admin-auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import LoadingSpinner from "@/components/core/loading-spinner";
import Link from "next/link";
// Removed: import type { GeneralSiteSettings } from '@/types/site-settings';
// Removed: import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';

const DEFAULT_SITE_TITLE_FALLBACK = "XLSConvert";

export default function AdminSignupPage() {
  const { adminSignUp, adminUser, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Removed: const [siteTitle, setSiteTitle] = useState<string>(DEFAULT_SITE_TITLE_FALLBACK);

  // Removed: useEffect for subscribeToGeneralSettings

  useEffect(() => {
    if (!authLoading && adminUser) {
      router.replace('/admin/dashboard');
    }
  }, [adminUser, authLoading, router]);

  const handleSignup = async (values: AuthFormValues) => {
    setIsSubmitting(true);
    try {
      await adminSignUp(values); 
      toast({ title: "Admin Account Created", description: "Please log in to continue." });
      router.push('/admin/login'); 
    } catch (error: any) {
      console.error("Admin Signup page error:", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authLoading && !adminUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  if (!authLoading && adminUser) { 
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner message="Redirecting to dashboard..." />
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Create Admin Account</CardTitle>
          <CardDescription>Set up an administrator account for {DEFAULT_SITE_TITLE_FALLBACK}.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminAuthForm 
            mode="signup"
            onSubmit={handleSignup} 
            submitButtonText="Sign Up" 
            isLoading={isSubmitting || authLoading}
          />
           <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an admin account?{" "}
            <Link href="/admin/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
