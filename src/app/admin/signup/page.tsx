
"use client";

import { AdminAuthForm, type AuthFormValues } from "@/components/admin/admin-auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function AdminSignupPage() {
  const { adminSignUp, adminUser, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // If admin is already logged in, redirect to dashboard
    if (!authLoading && adminUser) {
      router.replace('/admin/dashboard');
    }
  }, [adminUser, authLoading, router]);

  const handleSignup = async (values: AuthFormValues) => {
    setIsSubmitting(true);
    try {
      await adminSignUp(values); 
      toast({ title: "Admin Account Created", description: "Redirecting to dashboard..." });
      // Redirect is handled by useEffect or the auth state change in layout
    } catch (error: any) {
      // Error is handled by AdminAuthForm
      console.error("Admin Signup page error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading or form, redirect if already logged in
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading Admin Session...</p>
      </div>
    );
  }
  
  // If user is somehow logged in and lands here, useEffect will redirect them.
  // This ensures form is shown if not logged in.

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Create Admin Account</CardTitle>
          <CardDescription>Set up an administrator account for XLSConvert.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminAuthForm 
            onSubmit={handleSignup} 
            submitButtonText="Create Admin Account" 
            isLoading={isSubmitting}
          />
           <p className="mt-4 text-center text-xs text-muted-foreground">
            Already have an admin account? <Link href="/admin/login" className="underline">Log In</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
