
"use client";

import { useState, useEffect } from "react";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { getActivePlan, type ActivePlan } from '@/lib/local-storage-limits';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/core/loading-spinner';
import { ExternalLink, Settings as SettingsIcon } from 'lucide-react';
import { format } from 'date-fns';

const PAYPAL_SUBSCRIPTION_MANAGEMENT_URL = "https://www.paypal.com/myaccount/autopay/";

export default function SettingsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
    if (currentUser) {
      setIsLoadingPlan(true);
      const plan = getActivePlan(currentUser.uid);
      setActivePlan(plan);
      setIsLoadingPlan(false);
    }
  }, [currentUser, authLoading, router]);

  if (authLoading || isLoadingPlan || !currentUser) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <LoadingSpinner message="Loading your settings..." />
      </div>
    );
  }

  const conversionsUsed = activePlan?.usedConversions || 0;
  const totalConversions = activePlan?.totalConversions || 0;
  const progressPercentage = totalConversions > 0 ? (conversionsUsed / totalConversions) * 100 : 0;

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-primary" />
            <div className="flex flex-col">
              <CardTitle className="text-3xl font-bold">Your Subscription</CardTitle>
              <CardDescription>View and manage your current plan details.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {activePlan ? (
            <div className="space-y-4 rounded-lg border p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-semibold text-foreground">{activePlan.name} Plan</h3>
                  <p className="text-muted-foreground capitalize">{activePlan.billingCycle}</p>
                </div>
                <Badge variant={activePlan.isTrial ? "secondary" : "default"} className={activePlan.isTrial ? "bg-yellow-400 text-yellow-900" : "bg-green-500 text-white"}>
                  {activePlan.isTrial && activePlan.trialEndsAt ? `Trial (ends ${format(new Date(activePlan.trialEndsAt), 'MMM d, yyyy')})` : "Active"}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Conversions Used</span>
                  <span>{conversionsUsed.toLocaleString()} / {totalConversions.toLocaleString()}</span>
                </div>
                <Progress value={progressPercentage} aria-label={`${conversionsUsed} of ${totalConversions} conversions used`} />
              </div>

              <p className="text-sm text-muted-foreground">
                Your plan renews on {format(new Date(activePlan.activatedAt).setMonth(new Date(activePlan.activatedAt).getMonth() + (activePlan.billingCycle === 'monthly' ? 1 : 12)), 'MMMM d, yyyy')}.
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-lg text-muted-foreground">You are currently on the Free tier.</p>
              <p className="text-sm text-muted-foreground">Upgrade to unlock more conversions and features.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t pt-6">
          <Button asChild variant="outline">
            <a href={PAYPAL_SUBSCRIPTION_MANAGEMENT_URL} target="_blank" rel="noopener noreferrer">
              Manage in PayPal <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild>
            <a href="/pricing">
              {activePlan ? "Change Plan" : "View Pricing Plans"}
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
