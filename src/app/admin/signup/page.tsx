
"use client";

import { AdminAuthForm, type AuthFormValues } from "@/components/admin/admin-auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { checkIfAnyAdminSetupInFirestore } from "@/lib/firebase-admin-service";
import LoadingSpinner from "@/components/core/loading-spinner";

export default function AdminSignupPage() {
  const { adminSignUp, adminUser, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminSetupComplete, setAdminSetupComplete] = useState<boolean | null>(null); // null means loading

  useEffect(() => {
    async function checkSetup() {
      const isSetup = await checkIfAnyAdminSetupInFirestore();
      setAdminSetupComplete(isSetup);
      if (isSetup && !adminUser) { // If setup is done and no admin logged in, redirect to login
        router.replace('/admin/login');
      }
    }
    checkSetup();
  }, [router, adminUser]);

  useEffect(() => {
    // If admin is already logged in (and validated), redirect to dashboard
    if (!authLoading && adminUser) {
      router.replace('/admin/dashboard');
    }
  }, [adminUser, authLoading, router]);

  const handleSignup = async (values: AuthFormValues) => {
    setIsSubmitting(true);
    try {
      await adminSignUp(values); 
      toast({ title: "Admin Account Created", description: "Redirecting to dashboard..." });
      // Redirect is handled by useEffect for adminUser state change
    } catch (error: any) {
      // Error is handled by AdminAuthForm, but specific signup logic error here:
      if (error.message === "Admin account already exists. Signup is not allowed.") {
         toast({ variant: "destructive", title: "Signup Blocked", description: error.message });
         router.replace('/admin/login'); // Redirect if blocked
      } else {
        // General auth errors are handled in AdminAuthForm
        console.error("Admin Signup page error:", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authLoading || adminSetupComplete === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner message="Checking Admin Setup..." />
      </div>
    );
  }

  if (adminSetupComplete && !adminUser) { // If setup is done, and no admin logged in (useEffect above should have redirected)
     return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">Admin Signup Not Available</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              An admin account has already been set up for this application.
            </CardDescription>
            <Button asChild className="mt-6 w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/admin/login">Go to Admin Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If adminSetupComplete is false, or if somehow an admin is logged in and adminSetupComplete is false (unlikely)
  // Show the signup form
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Create Initial Admin Account</CardTitle>
          <CardDescription>Set up the first administrator account for XLSConvert.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminAuthForm 
            onSubmit={handleSignup} 
            submitButtonText="Create Admin Account" 
            isLoading={isSubmitting || authLoading}
          />
           <p className="mt-4 text-center text-xs text-muted-foreground">
            This form is for initial admin setup only.
           </p>
        </CardContent>
      </Card>
    </div>
  );
}
