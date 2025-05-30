
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
    // If a validated adminUser exists, redirect to dashboard
    if (!authLoading && adminUser) {
      router.replace("/admin/dashboard");
    }
  }, [adminUser, authLoading, router]);

  const handleLogin = async (values: AuthFormValues) => {
    setIsSubmitting(true);
    try {
      await adminSignIn(values);
      toast({ title: "Admin Login Successful", description: "Redirecting to dashboard..." });
      // Redirect is handled by useEffect for adminUser state change or layout's auth state change
    } catch (error: any) {
      // AdminAuthForm handles basic Firebase errors
      // Specific error "User is not authorized as an admin." from useAdminAuth hook is also handled by AdminAuthForm.
      console.error("Admin Login page error caught:", error);
      if (error.message === "User is not authorized as an admin.") {
        // toast is handled by AdminAuthForm, but if we want specific toast here
        // toast({ variant: "destructive", title: "Access Denied", description: error.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading && !adminUser) { // Show loading if auth is resolving and no adminUser yet
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner message="Loading Admin Session..." />
      </div>
    );
  }
  
  // If adminUser exists, useEffect will redirect. If not, and not loading, show form.
  // This handles the case where user lands on /admin/login directly while already logged in as admin.
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
          <CardDescription>Access the XLSConvert administration area.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminAuthForm 
            onSubmit={handleLogin} 
            submitButtonText="Log In" 
            isLoading={isSubmitting || authLoading} 
          />
          {/* Removed link to admin signup as it's conditional */}
          {/* <p className="mt-4 text-center text-xs text-muted-foreground">
            Need to create an admin account? <Link href="/admin/signup" className="underline">Sign Up</Link>.
          </p> */}
        </CardContent>
      </Card>
    </div>
  );
}

