
"use client";

import { AdminAuthForm, type AuthFormValues } from "@/components/admin/admin-auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link"; 
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import LoadingSpinner from "@/components/core/loading-spinner";

export default function AdminLoginPage() {
  const { adminSignIn, adminUser, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // If a validated adminUser exists (from useAdminAuth, which checks Firestore), redirect to dashboard
    if (!authLoading && adminUser) {
      router.replace("/admin/dashboard");
    }
  }, [adminUser, authLoading, router]);

  const handleLogin = async (values: AuthFormValues) => {
    setIsSubmitting(true);
    try {
      await adminSignIn(values);
      toast({ title: "Admin Login Successful", description: "Redirecting to dashboard..." });
      // Redirect is handled by useEffect for adminUser state change (from useAdminAuth)
      // or by AdminProtectedLayout if already on dashboard path.
    } catch (error: any) {
      // AdminAuthForm handles displaying Firebase errors like 'auth/invalid-credential'
      // and custom errors like "User is not authorized as an admin." from useAdminAuth hook.
      console.error("Admin Login page caught specific error:", error.message);
      // No need to re-toast here if AdminAuthForm handles it.
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading if auth is resolving and no adminUser has been confirmed yet
  if (authLoading && !adminUser) { 
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner message="Loading Admin Session..." />
      </div>
    );
  }
  
  // If adminUser exists (validated by useAdminAuth), useEffect will redirect. 
  // This state primarily shows the login form if no admin is logged in and auth is not loading.
  if (!authLoading && adminUser) { // This case should ideally be handled by useEffect redirection
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
          <CardDescription>Access the XLSConvert administration area.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminAuthForm 
            onSubmit={handleLogin} 
            submitButtonText="Log In" 
            isLoading={isSubmitting || authLoading} // Form is loading if submitting or auth is generally resolving
          />
          {/* Link to admin signup is typically not shown after initial setup. 
              The /admin root page handles routing to signup if needed. */}
        </CardContent>
      </Card>
    </div>
  );
}
