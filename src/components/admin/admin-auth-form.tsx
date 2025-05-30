
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
import LoadingSpinner from "@/components/core/loading-spinner"; // Import LoadingSpinner

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export type AuthFormValues = z.infer<typeof formSchema>;

interface AdminAuthFormProps {
  onSubmit: (values: AuthFormValues) => Promise<any>;
  submitButtonText: string;
  isLoading?: boolean; // General loading state passed from parent page (e.g., auth context loading)
}

export function AdminAuthForm({ onSubmit, submitButtonText, isLoading = false }: AdminAuthFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // Form-specific submission loading

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function handleSubmit(values: AuthFormValues) {
    setFormError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      // Success is handled by parent page (e.g., redirect)
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAuthError(err: any) {
    let errorMessage = "An unexpected error occurred. Please try again.";
    // Prefer err.message if it's a custom error thrown from hooks
    if (err.message) {
        errorMessage = err.message;
    } else if (err.code) { // Fallback to Firebase error codes
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = "Invalid email or password.";
          break;
        case 'auth/email-already-in-use':
          errorMessage = "This email is already registered.";
          break;
        case 'auth/too-many-requests':
            errorMessage = "Too many attempts. Please try again later.";
            break;
        default: // Keep default message for unhandled Firebase codes
          errorMessage = `An unexpected error occurred: ${err.code}`; 
      }
    }
    setFormError(errorMessage);
  }

  const actualIsLoading = isLoading || isSubmitting; // Combine parent loading with form submitting state

  return (
    <div className="space-y-6">
      {formError && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
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
                  <Input placeholder="admin@example.com" {...field} type="email" disabled={actualIsLoading} />
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
                  <Input placeholder="••••••••" {...field} type="password" disabled={actualIsLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={actualIsLoading}>
            {actualIsLoading ? <LoadingSpinner message="Processing..." /> : submitButtonText}
          </Button>
        </form>
      </Form>
    </div>
  );
}
