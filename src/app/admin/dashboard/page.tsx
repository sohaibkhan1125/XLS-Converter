
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
import { Users, Users2, CalendarClock } from 'lucide-react'; 
import {
  getLiveUsers,
  getVisitorsLast24Hours,
  getVisitorsLast7Days,
  getVisitorsLast30Days,
  type WebsiteAnalyticsData,
} from '@/lib/google-analytics-service';

export default function AdminDashboardPage() {
  const { adminUser, adminSignOut, loading: authLoading } = useAdminAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [adminUsersList, setAdminUsersList] = useState<AdminUserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [errorLoadingUsers, setErrorLoadingUsers] = useState<string | null>(null);

  const [websiteAnalytics, setWebsiteAnalytics] = useState<WebsiteAnalyticsData>({
    liveUsers: null,
    visitors24h: null,
    visitors7d: null,
    visitors30d: null,
  });
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

  const fetchAdminUsers = useCallback(async () => {
    if (!adminUser) return;
    setIsLoadingUsers(true);
    setErrorLoadingUsers(null);
    try {
      const users = await getAdminUsersList();
      setAdminUsersList(users);
    } catch (error) {
      setErrorLoadingUsers("Could not load admin user data.");
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch admin users list." });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [adminUser, toast]);

  const fetchWebsiteAnalytics = useCallback(async () => {
    if (!adminUser) return;
    setIsLoadingAnalytics(true);
    try {
      // In a real implementation, these might be parallel promises
      const live = await getLiveUsers();
      const v24h = await getVisitorsLast24Hours();
      const v7d = await getVisitorsLast7Days();
      const v30d = await getVisitorsLast30Days();
      setWebsiteAnalytics({
        liveUsers: live,
        visitors24h: v24h,
        visitors7d: v7d,
        visitors30d: v30d,
      });
      toast({ title: "Analytics Loaded", description: "Website visitor data (mocked) loaded." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Analytics Error", description: `Failed to fetch website analytics: ${error.message}` });
      setWebsiteAnalytics({ liveUsers: 0, visitors24h: 0, visitors7d: 0, visitors30d: 0 }); // Fallback
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [adminUser, toast]);

  useEffect(() => {
    fetchAdminUsers();
    fetchWebsiteAnalytics();
  }, [fetchAdminUsers, fetchWebsiteAnalytics]);


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
    return <div className="flex h-full items-center justify-center"><LoadingSpinner message="Verifying admin access..." /></div>;
  }

  return (
    <div className="space-y-8">
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

      {/* Website Analytics Section */}
      <Card>
        <CardHeader>
          <CardTitle>Website Analytics (GA4)</CardTitle>
          <CardDescription>Real-time and historical website visitor data from Google Analytics.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Live Users"
            value={websiteAnalytics.liveUsers}
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
            isLoading={isLoadingAnalytics}
            description="Users currently on site."
          />
          <StatCard
            title="Visitors (Last 24h)"
            value={websiteAnalytics.visitors24h}
            icon={<CalendarClock className="h-5 w-5 text-muted-foreground" />}
            isLoading={isLoadingAnalytics}
            description="Total unique visitors."
          />
          <StatCard
            title="Visitors (Last 7d)"
            value={websiteAnalytics.visitors7d}
            icon={<CalendarClock className="h-5 w-5 text-muted-foreground" />}
            isLoading={isLoadingAnalytics}
            description="Total unique visitors."
          />
          <StatCard
            title="Visitors (Last 30d)"
            value={websiteAnalytics.visitors30d}
            icon={<CalendarClock className="h-5 w-5 text-muted-foreground" />}
            isLoading={isLoadingAnalytics}
            description="Total unique visitors."
          />
        </CardContent>
      </Card>
      
      {/* Admin Users List Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className='space-y-1'>
                <CardTitle className="text-xl font-medium">Admin Users</CardTitle>
                <CardDescription>List of all registered administrators.</CardDescription>
            </div>
            <Users2 className="h-6 w-6 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold mb-1">
              {isLoadingUsers ? <span className="text-sm">Loading...</span> : adminUsersList.length}
            </div>
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

// Helper component for Stat Cards
interface StatCardProps {
  title: string;
  value: number | null;
  icon: React.ReactNode;
  isLoading: boolean;
  description?: string;
}

function StatCard({ title, value, icon, isLoading, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isLoading ? <span className="text-sm">Loading...</span> : value ?? 'N/A'}
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
