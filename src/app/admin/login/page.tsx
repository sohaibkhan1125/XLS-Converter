
"use client";

import { AdminAuthForm, type AuthFormValues } from "@/components/admin/admin-auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link"; 
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import LoadingSpinner from "@/components/core/loading-spinner";
// Removed: import type { GeneralSiteSettings } from '@/types/site-settings';
// Removed: import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';

const DEFAULT_SITE_TITLE_FALLBACK = "XLSConvert";

export default function AdminLoginPage() {
  const { adminSignIn, adminUser, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Removed: const [siteTitle, setSiteTitle] = useState<string>(DEFAULT_SITE_TITLE_FALLBACK);

  // Removed: useEffect for subscribeToGeneralSettings

  useEffect(() => {
    if (!authLoading && adminUser) {
      router.replace("/admin/dashboard");
    }
  }, [adminUser, authLoading, router]);

  const handleLogin = async (values: AuthFormValues) => {
    setIsSubmitting(true);
    try {
      await adminSignIn(values);
      toast({ title: "Admin Login Successful", description: "Redirecting to dashboard..." });
    } catch (error: any) {
      console.error("Admin Login page caught specific error:", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
 
  if (authLoading && !adminUser) { 
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner message="Loading Admin Session..." />
      </div>
    );
  }
  
  if (!authLoading && adminUser) { 
     return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner message="Redirecting to Dashboard..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Admin Panel Login</CardTitle>
          <CardDescription>Access the {DEFAULT_SITE_TITLE_FALLBACK} administration area.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminAuthForm 
            mode="login"
            onSubmit={handleLogin} 
            submitButtonText="Log In" 
            isLoading={isSubmitting || authLoading} 
          />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an admin account?{" "}
            <Link href="/admin/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
