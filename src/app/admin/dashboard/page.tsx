
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminUsersList, type AdminUserData } from '@/lib/firebase-admin-service';
import LoadingSpinner from '@/components/core/loading-spinner';
import { format } from 'date-fns';
import { Users } from 'lucide-react';

export default function AdminDashboardPage() {
  const { adminUser, adminSignOut, loading: authLoading } = useAdminAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [adminUsersList, setAdminUsersList] = useState<AdminUserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [errorLoadingUsers, setErrorLoadingUsers] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAdminUsers() {
      if (!adminUser) return; // Only fetch if admin is logged in

      setIsLoadingUsers(true);
      setErrorLoadingUsers(null);
      try {
        const users = await getAdminUsersList();
        setAdminUsersList(users);
      } catch (error) {
        console.error("Failed to fetch admin users:", error);
        setErrorLoadingUsers("Could not load admin user data. Please try again.");
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch admin users list." });
      } finally {
        setIsLoadingUsers(false);
      }
    }
    fetchAdminUsers();
  }, [adminUser, toast]);

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

  if (!adminUser) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner message="Redirecting to login..." /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
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

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Admin Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
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
