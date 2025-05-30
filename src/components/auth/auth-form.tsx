
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
import { Terminal } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export type AuthFormValues = z.infer<typeof formSchema>;

interface AuthFormProps {
  onSubmit: (values: AuthFormValues) => Promise<any>; // For email/password
  submitButtonText: string;
  isLoading?: boolean; // General loading state for the form
}

export function AuthForm({ onSubmit, submitButtonText, isLoading = false }: AuthFormProps) {
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
        // Removed Google Sign-In specific errors as the button is removed.
        // case 'auth/popup-closed-by-user':
        //   setError("Google Sign-In cancelled. Please try again.");
        //   break;
        // case 'auth/account-exists-with-different-credential':
        //    setError("An account already exists with this email address using a different sign-in method.");
        //    break;
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
    </div>
  );
}
