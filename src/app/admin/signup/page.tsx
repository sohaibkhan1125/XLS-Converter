
"use client";

import { AdminAuthForm, type AuthFormValues } from "@/components/admin/admin-auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Added this import
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
  const [allowSignup, setAllowSignup] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !authLoading) {
      const isAdminSetupComplete = localStorage.getItem('admin_setup_complete') === 'true';
      if (isAdminSetupComplete && !adminUser) {
        // If setup is complete but user somehow lands here and is not logged in, redirect to login
        router.replace('/admin/login');
      } else if (adminUser) {
        // If an admin is already logged in, go to dashboard
        router.replace('/admin/dashboard');
      } else {
        // Allow signup only if setup is not complete
        setAllowSignup(!isAdminSetupComplete);
      }
    }
  }, [adminUser, authLoading, router]);

  const handleSignup = async (values: AuthFormValues) => {
    setIsSubmitting(true);
    try {
      await adminSignUp(values); // This will set 'admin_setup_complete' in localStorage via the hook
      toast({ title: "Admin Account Created", description: "Redirecting to dashboard..." });
      // Redirect is handled by useEffect or the auth state change
    } catch (error: any) {
      // Error is handled by AdminAuthForm
      console.error("Admin Signup page error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || (typeof window !== 'undefined' && localStorage.getItem('admin_setup_complete') === 'true' && !adminUser && !authLoading)) {
     // This case might already be handled by redirect to login, but as a fallback:
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Checking admin setup...</p>
      </div>
    );
  }
  
  if (!allowSignup && !authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md shadow-xl text-center">
            <CardHeader>
                <CardTitle>Admin Setup Complete</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>
                    The initial admin account has already been set up.
                </CardDescription>
                <Button asChild className="mt-4">
                    <Link href="/admin/login">Go to Admin Login</Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Create Admin Account</CardTitle>
          <CardDescription>Set up the first administrator account for XLSConvert.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminAuthForm 
            onSubmit={handleSignup} 
            submitButtonText="Create Admin Account" 
            isLoading={isSubmitting}
          />
           <p className="mt-4 text-center text-xs text-muted-foreground">
            If admin account is already set up, please go to <Link href="/admin/login" className="underline">admin login</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
