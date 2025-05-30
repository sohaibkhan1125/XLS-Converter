
"use client";

import { AdminAuthForm, type AuthFormValues } from "@/components/admin/admin-auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import LoadingSpinner from "@/components/core/loading-spinner";
import Link from "next/link";

export default function AdminSignupPage() {
  const { adminSignUp, adminUser, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      router.push('/admin/login'); // Redirect to login after successful admin signup
    } catch (error: any) {
      // AdminAuthForm will display most Firebase errors.
      // Specific error from adminSignUp (e.g., "Admin account already exists...")
      // This specific check is removed from adminSignUp hook as per new requirements.
      // Errors like "email-already-in-use" will be handled by AdminAuthForm.
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

  if (!authLoading && adminUser) { // Should be redirected by useEffect
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
          <CardDescription>Set up an administrator account for XLSConvert.</CardDescription>
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
