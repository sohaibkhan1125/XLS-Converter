
"use client";

import { AuthForm, type AuthFormValues } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (values: AuthFormValues) => {
    setIsLoading(true);
    try {
      await signIn(values);
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push("/");
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
      await signInWithGoogle();
      toast({ title: "Google Login Successful", description: "Welcome!" });
      router.push("/");
    } catch (error: any) {
      // Error is handled by AuthForm
      console.error("Login page error (Google):", error);
      // Re-throw to be caught by AuthForm's internal error handler
      throw error; 
    } finally {
      setIsLoading(false);
    }
  };

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
