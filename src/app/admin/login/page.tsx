
"use client";

import { AdminAuthForm, type AuthFormValues } from "@/components/admin/admin-auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link"; // Added for consistency, though not strictly needed if no signup link from login
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function AdminLoginPage() {
  const { adminSignIn, adminUser, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // Redirect is handled by useEffect or layout's auth state change
    } catch (error: any) {
      // Error is handled by AdminAuthForm
      console.error("Admin Login page error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) { // Only show loading if auth is truly loading
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading Admin Session...</p>
      </div>
    );
  }
  // If user is logged in, useEffect will redirect. If not, show form.

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
            isLoading={isSubmitting} 
          />
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Need to create an admin account? <Link href="/admin/signup" className="underline">Sign Up</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
