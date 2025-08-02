
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PricingCard from '@/components/pricing/pricing-card';
import { PRICING_PLANS, type Plan as PlanType } from '@/config/pricing';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { GeneralSiteSettings } from '@/types/site-settings';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';
import LoadingSpinner from '@/components/core/loading-spinner';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const { currentUser, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const [siteTitle, setSiteTitle] = useState<string>("Our Service");
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const fetchSettings = useCallback(() => {
    setIsLoadingSettings(true);
    const unsubscribe = subscribeToGeneralSettings((settings) => {
      setSiteTitle(settings?.siteTitle || "Our Service");
      setIsLoadingSettings(false);
      if (settings?.seoSettings && settings.seoSettings[pathname]) {
        const seoData = settings.seoSettings[pathname];
        if (seoData?.title) document.title = seoData.title;
        
        let descriptionTag = document.querySelector('meta[name="description"]');
        if (!descriptionTag) {
          descriptionTag = document.createElement('meta');
          descriptionTag.setAttribute('name', 'description');
          document.head.appendChild(descriptionTag);
        }
        if (seoData?.description) descriptionTag.setAttribute('content', seoData.description);

        let keywordsTag = document.querySelector('meta[name="keywords"]');
        if (!keywordsTag) {
          keywordsTag = document.createElement('meta');
          keywordsTag.setAttribute('name', 'keywords');
          document.head.appendChild(keywordsTag);
        }
        if (seoData?.keywords) keywordsTag.setAttribute('content', seoData.keywords);
      } else if (settings?.siteTitle) {
        document.title = `Pricing - ${settings.siteTitle}`;
      }
    });
    return () => unsubscribe();
  }, [pathname]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (isLoadingSettings || authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <LoadingSpinner message="Loading pricing information..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl lg:text-6xl">
          Find the Perfect Plan
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-xl text-muted-foreground">
          Choose the plan that best suits your PDF to Excel conversion needs. Get more with annual billing!
          All paid plans include an initial 7-day trial period.
        </p>
      </div>

      <div className="flex justify-center mb-10">
        <Tabs value={billingCycle} onValueChange={(value) => setBillingCycle(value as 'monthly' | 'annual')} className="w-auto">
          <TabsList className="grid w-full grid-cols-2 md:w-auto">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annual">Annual (Save ~50%)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch justify-center">
        {PRICING_PLANS.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            currentUser={currentUser}
          />
        ))}
      </div>

      <div className="mt-16 text-center">
        <h3 className="text-2xl font-semibold text-foreground">Not sure which plan is right for you?</h3>
        <p className="text-muted-foreground mt-2 mb-6">
          You can start with our free tier (1 conversion for guests, 5 for logged-in users) to test out the service before choosing a paid plan.
        </p>
        {!currentUser && (
           <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/signup">Sign Up for Free Conversions</Link>
          </Button>
        )}
        {currentUser && (
           <Button asChild size="lg" variant="outline">
            <Link href="/">Go to Converter</Link>
          </Button>
        )}
      </div>

      <div className="mt-16 p-8 bg-card rounded-lg shadow-md">
        <h3 className="text-2xl font-semibold text-center text-primary mb-6">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground">How does the 7-day trial period work with paid plans?</h4>
            <p className="text-muted-foreground">When you purchase a plan, the first 7 days are considered a trial period. You get full access to the plan's features and conversion limits. If you're not satisfied, you can request a refund within these 7 days (subject to terms). The payment covers the entire first billing cycle (month or year).</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground">Can I change my plan later?</h4>
            <p className="text-muted-foreground">Yes, you can upgrade or downgrade your plan. Changes will typically apply from the next billing cycle. Please <Link href="/contact" className="text-primary underline">contact us</Link> for assistance.</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground">What happens if I exceed my conversions?</h4>
            <p className="text-muted-foreground">If you exceed your plan's conversion limit, you'll be prompted to upgrade your plan or wait for your quota to renew at the start of your next billing cycle.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
