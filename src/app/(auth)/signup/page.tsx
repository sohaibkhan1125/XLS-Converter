
"use client";

import { AuthForm, type AuthFormValues } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { GeneralSiteSettings } from '@/types/site-settings';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';

const DEFAULT_SITE_TITLE_FALLBACK = "XLSConvert";

export default function SignupPage() {
  const { signUp, currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false); 
  const [siteTitle, setSiteTitle] = useState<string>(DEFAULT_SITE_TITLE_FALLBACK);

  useEffect(() => {
    const unsubscribe = subscribeToGeneralSettings((settings) => {
      if (settings && settings.siteTitle) {
        setSiteTitle(settings.siteTitle);
      } else {
        setSiteTitle(DEFAULT_SITE_TITLE_FALLBACK);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authLoading && currentUser) {
      router.push("/");
    }
  }, [currentUser, authLoading, router]);

  const handleSignup = async (values: AuthFormValues) => {
    setIsLoading(true);
    try {
      await signUp(values);
      toast({ title: "Signup Successful", description: `Welcome to ${siteTitle}!` });
      // router.push("/"); // This will be handled by useEffect above
    } catch (error: any) {
      // Error is handled by AuthForm
      console.error("Signup page error (Email/Pass):", error);
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
