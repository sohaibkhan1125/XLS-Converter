
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
    // Only run this check if not already logged in as admin
    if (!authLoading && !adminUser) {
        checkSetup();
    } else if (authLoading) {
        // If auth is loading, defer the setup check until auth status is known
        // to avoid redirecting to login if an admin session is being restored.
    } else if (adminUser) {
        // If admin is already logged in, no need to check setup or show signup.
        // The layout or main admin page will redirect to dashboard.
    }
  }, [router, adminUser, authLoading]);

  useEffect(() => {
    // If admin is already logged in (and validated by useAdminAuth), redirect to dashboard
    if (!authLoading && adminUser) {
      router.replace('/admin/dashboard');
    }
  }, [adminUser, authLoading, router]);

  const handleSignup = async (values: AuthFormValues) => {
    setIsSubmitting(true);
    try {
      await adminSignUp(values); 
      toast({ title: "Admin Account Created", description: "Please log in to continue." });
      router.push('/admin/login'); // Redirect to login after successful first admin signup
    } catch (error: any) {
      // AdminAuthForm will display most Firebase errors.
      // Specific error from adminSignUp (e.g., "Admin account already exists...")
      if (error.message === "Admin account already exists. Signup is not allowed.") {
         toast({ variant: "destructive", title: "Signup Blocked", description: error.message });
         setAdminSetupComplete(true); // Mark setup as complete to trigger UI change or redirect
         router.replace('/admin/login'); 
      } else {
        // Let AdminAuthForm handle other auth errors by re-throwing or relying on its internal state
        console.error("Admin Signup page error:", error.message);
        // AdminAuthForm should display this if it's a Firebase error
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Show loading spinner if auth is resolving or admin setup status is unknown
  if (authLoading || adminSetupComplete === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner message="Checking Admin Setup..." />
      </div>
    );
  }

  // If admin setup is already complete and no admin is logged in, show "Signup Not Available"
  if (adminSetupComplete && !adminUser) { 
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
  
  // If adminSetupComplete is false (meaning no admin exists in Firestore), show the signup form.
  // Or if somehow an admin is logged in and adminSetupComplete is false (should be handled by redirect above)
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
            isLoading={isSubmitting || authLoading} // Form is loading if submitting or auth is resolving
          />
           <p className="mt-4 text-center text-xs text-muted-foreground">
            This form is for initial admin setup only.
           </p>
        </CardContent>
      </Card>
    </div>
  );
}
