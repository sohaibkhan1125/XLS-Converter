
"use client";

import { AuthForm, type AuthFormValues } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Keep for email/pass and potential future use
import { useState, useEffect } from "react";

export default function SignupPage() {
  const { signUp, signInWithGoogle, currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false); // Local loading for form submission

  // Redirect if user is already logged in
  useEffect(() => {
    if (!authLoading && currentUser) {
      router.push("/");
    }
  }, [currentUser, authLoading, router]);

  const handleSignup = async (values: AuthFormValues) => {
    setIsLoading(true);
    try {
      await signUp(values);
      toast({ title: "Signup Successful", description: "Welcome to XLSConvert!" });
      // router.push("/"); // This will be handled by useEffect above
    } catch (error: any) {
      // Error is handled by AuthForm
      console.error("Signup page error (Email/Pass):", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle(); // Initiates redirect
      // Toast and router.push for Google Sign-In success will be handled after redirect.
    } catch (error: any) {
      // This catch block handles errors during the *initiation* of Google Sign-In.
      console.error("Signup page error (Google initiation):", error);
      setIsLoading(false); // Ensure loading is reset if initiation fails
      throw error; // AuthForm will catch this
    }
    // `finally` block here might not execute if redirect is successful.
  };

  // Prevent rendering signup form if auth is still loading or user is already logged in
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
          <CardTitle className="text-3xl font-bold text-primary">Create Account</CardTitle>
          <CardDescription>Sign up to start converting your PDFs to Excel with more benefits.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm 
            onSubmit={handleSignup} 
            onGoogleSignIn={handleGoogleSignup}
            submitButtonText="Sign Up" 
            isLoading={isLoading}
          />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
