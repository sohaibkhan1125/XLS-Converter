
"use client";

import { AdminAuthForm, type AuthFormValues } from "@/components/admin/admin-auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
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
      // Redirect is handled by useEffect
    } catch (error: any) {
      // Error is handled by AdminAuthForm
      console.error("Admin Login page error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || (!authLoading && adminUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading Admin Session...</p>
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
            isLoading={isSubmitting} 
          />
          {/* Optional: Link to signup if admin setup is not complete, but /admin handles this */}
          {/* <p className="mt-4 text-center text-xs text-muted-foreground">
            First time setup? Check <Link href="/admin/signup" className="underline">admin signup</Link>.
          </p> */}
        </CardContent>
      </Card>
    </div>
  );
}
