
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
import { ShieldAlert, TrendingUp, Users } from 'lucide-react'; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConversionChart from '@/components/admin/dashboard/conversion-chart';
import { getTotalConversionsCount, getAggregatedConversionData, type ChartDataPoint } from '@/lib/firebase-analytics-service';

type TimeRangeFilter = '24h' | '7d' | '30d';

export default function AdminDashboardPage() {
  const { adminUser, adminSignOut, loading: authLoading } = useAdminAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [adminUsersList, setAdminUsersList] = useState<AdminUserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [errorLoadingUsers, setErrorLoadingUsers] = useState<string | null>(null);

  const [totalConversions, setTotalConversions] = useState<number | null>(null);
  const [isLoadingTotalConversions, setIsLoadingTotalConversions] = useState(true);
  
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeFilter>('24h');
  const [conversionChartData, setConversionChartData] = useState<ChartDataPoint[]>([]);
  const [isLoadingChartData, setIsLoadingChartData] = useState(true);

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

  const fetchTotalConversions = useCallback(async () => {
    if (!adminUser) return;
    setIsLoadingTotalConversions(true);
    try {
      const count = await getTotalConversionsCount();
      setTotalConversions(count);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch total conversions." });
      setTotalConversions(0); // Fallback
    } finally {
      setIsLoadingTotalConversions(false);
    }
  }, [adminUser, toast]);

  const fetchChartData = useCallback(async (range: TimeRangeFilter) => {
    if (!adminUser) return;
    setIsLoadingChartData(true);
    try {
      const data = await getAggregatedConversionData(range);
      setConversionChartData(data);
    } catch (error) {
      toast({ variant: "destructive", title: "Chart Error", description: `Failed to fetch conversion data for ${range}.` });
      setConversionChartData([]); // Fallback
    } finally {
      setIsLoadingChartData(false);
    }
  }, [adminUser, toast]);

  useEffect(() => {
    fetchAdminUsers();
    fetchTotalConversions();
  }, [fetchAdminUsers, fetchTotalConversions]);

  useEffect(() => {
    fetchChartData(selectedTimeRange);
  }, [fetchChartData, selectedTimeRange]);

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

  const getChartTitleAndDescription = (range: TimeRangeFilter) => {
    switch (range) {
      case '24h': return { title: 'Conversions - Last 24 Hours', description: 'Hourly breakdown of conversions.' };
      case '7d': return { title: 'Conversions - Last 7 Days', description: 'Daily breakdown of conversions.' };
      case '30d': return { title: 'Conversions - Last 30 Days', description: 'Daily breakdown of conversions.' };
      default: return { title: 'Conversion Data', description: '' };
    }
  };

  const chartConfig = getChartTitleAndDescription(selectedTimeRange);

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
            <Users className="h-5 w-5 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingTotalConversions ? <span className="text-sm">Loading...</span> : totalConversions ?? 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Total PDF to Excel conversions processed.
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Conversion Analytics</CardTitle>
           <Tabs value={selectedTimeRange} onValueChange={(value) => setSelectedTimeRange(value as TimeRangeFilter)}>
            <TabsList className="grid w-full grid-cols-3 md:w-[400px] mt-2">
              <TabsTrigger value="24h">Last 24 Hours</TabsTrigger>
              <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
              <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {isLoadingChartData ? (
            <div className="h-[350px] flex items-center justify-center">
              <LoadingSpinner message={`Loading ${selectedTimeRange} conversion data...`} />
            </div>
          ) : (
            <ConversionChart 
              data={conversionChartData}
              title={chartConfig.title}
              description={chartConfig.description}
              dataKeyX="name"
              dataKeyY="conversions"
            />
          )}
        </CardContent>
      </Card>

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
