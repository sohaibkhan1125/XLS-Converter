
"use client";

import { AuthForm, type AuthFormSubmitValues, type SignupValues } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth, type SignUpData } from "@/hooks/use-auth"; // Import SignUpData
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const DEFAULT_SITE_TITLE_FALLBACK = "XLSConvert";

export default function SignupPage() {
  const { signUp, currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false); 

  useEffect(() => {
    if (!authLoading && currentUser) {
      router.push("/");
    }
  }, [currentUser, authLoading, router]);

  const handleSignup = async (formValues: AuthFormSubmitValues) => {
    setIsLoading(true);
    // AuthFormSubmitValues includes confirmPassword, but SignUpData for the hook does not.
    // The schema in AuthForm already validated confirmPassword.
    const signupData: SignUpData = {
      email: formValues.email,
      password: formValues.password,
      firstName: formValues.firstName,
      lastName: formValues.lastName,
    };
    try {
      await signUp(signupData);
      toast({ title: "Signup Successful", description: `Welcome to ${DEFAULT_SITE_TITLE_FALLBACK}!` });
    } catch (error: any) {
      console.error("Signup page error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || (!authLoading && currentUser)) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <p>Loading...</p> 
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
            mode="signup"
            onSubmit={handleSignup} 
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
