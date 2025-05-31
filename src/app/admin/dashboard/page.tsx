
"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminUsersList, type AdminUserData } from '@/lib/firebase-admin-service';
import LoadingSpinner from '@/components/core/loading-spinner';
import { format } from 'date-fns';
import { ShieldAlert, TrendingUp } from 'lucide-react'; 
import { subscribeToDailyConversionCount } from '@/lib/firebase-metrics-service'; 

function getTodayUTCDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD format in UTC
}

export default function AdminDashboardPage() {
  const { adminUser, adminSignOut, loading: authLoading } = useAdminAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [adminUsersList, setAdminUsersList] = useState<AdminUserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [errorLoadingUsers, setErrorLoadingUsers] = useState<string | null>(null);
  const [dailyConversions, setDailyConversions] = useState<number | null>(null); 
  const [isLoadingConversions, setIsLoadingConversions] = useState(true);


  const fetchAdminUsers = useCallback(async () => {
    if (!adminUser) {
      console.log("[AdminDashboard] fetchAdminUsers: No admin user, skipping fetch.");
      return;
    }
    console.log("[AdminDashboard] fetchAdminUsers: Fetching admin users list.");
    setIsLoadingUsers(true);
    setErrorLoadingUsers(null);
    try {
      const users = await getAdminUsersList();
      setAdminUsersList(users);
    } catch (error) {
      console.error("[AdminDashboard] fetchAdminUsers: Failed to fetch admin users:", error);
      setErrorLoadingUsers("Could not load admin user data. Please try again.");
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch admin users list." });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [adminUser, toast]);

  useEffect(() => {
    fetchAdminUsers();
  }, [fetchAdminUsers]);

  // Effect for subscribing to daily conversion counts
  useEffect(() => {
    if (!adminUser) {
      console.log("[AdminDashboard] ConversionsSubscriptionEffect: No admin user, not subscribing.");
      // If auth is still loading, and we don't have an adminUser yet, we might want to wait.
      // However, if authLoading is false and adminUser is null, then there's no admin.
      if (!authLoading) setIsLoadingConversions(false); // Stop loading if definitely no admin
      return;
    }
    console.log(`[AdminDashboard] ConversionsSubscriptionEffect: Admin user detected (UID: ${adminUser.uid}). Setting up subscription.`);
    setIsLoadingConversions(true);
    const todayUTCString = getTodayUTCDateString();
    console.log(`[AdminDashboard] ConversionsSubscriptionEffect: Subscribing for date (UTC): ${todayUTCString}`);

    const unsubscribe = subscribeToDailyConversionCount(todayUTCString, (count) => {
      console.log(`[AdminDashboard] ConversionsSubscriptionEffect: Received new count for ${todayUTCString}: ${count}`);
      setDailyConversions(count);
      setIsLoadingConversions(false);
    });

    return () => {
      console.log(`[AdminDashboard] ConversionsSubscriptionEffect: Unsubscribing from daily conversion count for ${todayUTCString}.`);
      unsubscribe();
    }
  }, [adminUser, authLoading]); // Rerun if adminUser or authLoading changes


  const handleSignOut = async () => {
    try {
      await adminSignOut();
      toast({ title: "Logged Out", description: "Admin successfully logged out." });
      router.push('/admin/login');
    } catch (error) {
      toast({ variant: "destructive", title: "Logout Error", description: "Failed to log out admin." });
    }
  };

  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner message="Loading Dashboard..." /></div>;
  }

  // Redirect if not an admin user (even if auth has finished loading)
  // This check is important if the user's admin status changes or if they land here without being an admin.
  if (!adminUser) {
    console.log("[AdminDashboard] Render: No admin user after auth check. Redirecting or showing loading for redirect.");
    // If router hasn't redirected yet from layout, show loading.
    // The layout should ideally handle the redirect.
    return <div className="flex h-full items-center justify-center"><LoadingSpinner message="Verifying admin access..." /></div>;
  }
  console.log("[AdminDashboard] Render: Admin user verified, rendering dashboard content.");


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard Overview</CardTitle>
          <CardDescription>
            Welcome, {adminUser.email}. Manage your application settings and view user data.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Button onClick={handleSignOut} variant="destructive">
              Sign Out Admin
            </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2"> 
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Admin Users</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingUsers ? <span className="text-sm">Loading...</span> : adminUsersList.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently registered administrators.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Conversions (UTC)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingConversions ? (
                <span className="text-sm">Loading...</span>
              ) : dailyConversions !== null ? (
                dailyConversions
              ) : (
                '0' // Default to 0 if null after loading
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Total PDF conversions processed today.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Users List</CardTitle>
          <CardDescription>List of all registered administrators.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <LoadingSpinner message="Loading admin users..." />
          ) : errorLoadingUsers ? (
            <p className="text-destructive">{errorLoadingUsers}</p>
          ) : adminUsersList.length === 0 ? (
            <p>No admin users found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Date Joined</TableHead>
                  <TableHead>Admin UID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminUsersList.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      {user.createdAt ? format(user.createdAt, 'PPP p') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
