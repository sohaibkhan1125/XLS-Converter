
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; // To redirect on logout

export default function AdminDashboardPage() {
  const { adminUser, adminSignOut, loading } = useAdminAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await adminSignOut();
      toast({ title: "Logged Out", description: "Admin successfully logged out." });
      router.push('/admin/login'); // Explicit redirect after sign out
    } catch (error) {
      toast({ variant: "destructive", title: "Logout Error", description: "Failed to log out admin." });
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><p>Loading Dashboard...</p></div>;
  }

  if (!adminUser) {
    // This should ideally be caught by the layout redirect, but as a fallback:
    // router.replace('/admin/login'); // This can cause hydration issues if called directly in render
    return <div className="flex h-full items-center justify-center"><p>Redirecting to login...</p></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to the Admin Dashboard</CardTitle>
          <CardDescription>
            You are logged in as: {adminUser.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>This is a placeholder for your admin panel content. You can add statistics, user management, content management, and other administrative tools here.</p>
          <div className="mt-6">
            <Button onClick={handleSignOut} variant="destructive">
              Sign Out Admin
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for future admin panel sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Site Statistics</CardTitle></CardHeader>
          <CardContent><p>Graphs and numbers will go here.</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
          <CardContent><p>A list of users or user management tools will go here.</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
