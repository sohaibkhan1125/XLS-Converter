
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react"; // Assuming Google icon is not available or add one if you have it

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export type AuthFormValues = z.infer<typeof formSchema>;

interface AuthFormProps {
  onSubmit: (values: AuthFormValues) => Promise<any>; // For email/password
  onGoogleSignIn?: () => Promise<any>; // For Google Sign-In
  submitButtonText: string;
  isLoading?: boolean; // General loading state for the form
}

export function AuthForm({ onSubmit, onGoogleSignIn, submitButtonText, isLoading = false }: AuthFormProps) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function handleSubmit(values: AuthFormValues) {
    setError(null);
    try {
      await onSubmit(values);
    } catch (err: any) {
      handleAuthError(err);
    }
  }

  async function handleGoogleSignInClick() {
    setError(null);
    if (onGoogleSignIn) {
      try {
        await onGoogleSignIn();
      } catch (err: any) {
        handleAuthError(err);
      }
    }
  }

  function handleAuthError(err: any) {
    if (err.code) {
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential': // Common for wrong email/pass or user not found
          setError("Invalid email or password.");
          break;
        case 'auth/email-already-in-use':
          setError("This email is already registered.");
          break;
        case 'auth/popup-closed-by-user':
          setError("Google Sign-In cancelled. Please try again.");
          break;
        case 'auth/account-exists-with-different-credential':
           setError("An account already exists with this email address using a different sign-in method.");
           break;
        default:
          setError(err.message || "An unexpected error occurred.");
      }
    } else {
      setError(err.message || "An unexpected error occurred. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="your@email.com" {...field} type="email" disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input placeholder="••••••••" {...field} type="password" disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
            {isLoading ? "Processing..." : submitButtonText}
          </Button>
        </form>
      </Form>

      {onGoogleSignIn && (
        <>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            type="button"
            onClick={handleGoogleSignInClick}
            disabled={isLoading}
            className="w-full"
          >
            {/* Replace with actual Google icon if you add one, e.g., <GoogleIcon className="mr-2 h-4 w-4" /> */}
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
            Continue with Google
          </Button>
        </>
      )}
    </div>
  );
}
