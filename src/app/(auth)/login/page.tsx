
"use client";

import { AuthForm, type AuthFormValues } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Keep for email/pass and potential future use
import { useState, useEffect } from "react";

export default function LoginPage() {
  const { signIn, signInWithGoogle, currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false); // Local loading for form submission

  // Redirect if user is already logged in
  useEffect(() => {
    if (!authLoading && currentUser) {
      router.push("/");
    }
  }, [currentUser, authLoading, router]);

  const handleLogin = async (values: AuthFormValues) => {
    setIsLoading(true);
    try {
      await signIn(values);
      // Success toast and navigation for email/pass are handled by onAuthStateChanged effect or here.
      // For consistency, onAuthStateChanged effect is preferred for navigation post-login.
      toast({ title: "Login Successful", description: "Welcome back!" });
      // router.push("/"); // This will be handled by useEffect above
    } catch (error: any) {
      // Error is handled by AuthForm
      console.error("Login page error (Email/Pass):", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle(); // Initiates redirect, does not return user directly
      // Toast and router.push for Google Sign-In success will be handled after redirect,
      // typically by the useEffect monitoring currentUser or by getRedirectResult in useAuth.
      // No immediate action here as page will navigate away.
    } catch (error: any) {
      // This catch block handles errors during the *initiation* of Google Sign-In.
      // Errors after redirect are handled within useAuth by getRedirectResult.
      console.error("Login page error (Google initiation):", error);
      // AuthForm's internal error handler will display this.
      setIsLoading(false); // Ensure loading is reset if initiation fails
      throw error; 
    } 
    // `finally` block here might not execute if redirect is successful,
    // as the component instance could be destroyed. setIsLoading(false) on initiation error is key.
  };

  // Prevent rendering login form if auth is still loading or user is already logged in
  if (authLoading || (!authLoading && currentUser)) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <p>Loading...</p> {/* Or a spinner component */}
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Welcome Back!</CardTitle>
          <CardDescription>Log in to access your PDF to Excel conversions.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm 
            onSubmit={handleLogin} 
            onGoogleSignIn={handleGoogleLogin}
            submitButtonText="Log In" 
            isLoading={isLoading} 
          />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
