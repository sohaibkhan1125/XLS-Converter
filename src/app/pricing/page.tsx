
"use client";

import { useState, useEffect } from 'react';
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PricingCard from '@/components/pricing/pricing-card';
import { PRICING_PLANS, type Plan as PlanType } from '@/config/pricing';
import { useToast } from '@/hooks/use-toast';
import { activatePlan, type PlanDetails } from '@/lib/local-storage-limits';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { GeneralSiteSettings } from '@/types/site-settings';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';

const PAYPAL_CLIENT_ID = "AQS8CKbKYudDa2HRF17WPTWoA_oAUUWPR7ciQCk-oF-2jeiHS6rU1h5GNL-zXZ5zdtppGWFwQIxSXaQb";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = subscribeToGeneralSettings((settings) => {
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
      }
    });
    return () => unsubscribe();
  }, [pathname]);

  const handleSelectPlan = (planId: PlanType['id'], cycle: 'monthly' | 'annual') => {
    const selectedPlan = PRICING_PLANS.find(p => p.id === planId);
    if (!selectedPlan) return;

    const planDetailsToActivate: PlanDetails = {
      id: selectedPlan.id,
      name: selectedPlan.name,
      conversions: cycle === 'monthly' ? selectedPlan.monthlyConversions : selectedPlan.annualConversions,
      cycle: cycle,
      price: cycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.annualPrice,
      trialDays: selectedPlan.trialDays, // Pass trialDays
    };

    const activatedPlan = activatePlan(currentUser ? currentUser.uid : null, planDetailsToActivate);

    if (activatedPlan.isTrial) {
      toast({
        title: `${activatedPlan.name} Trial Started!`,
        description: `Your ${selectedPlan.trialDays}-day free trial has begun. You have ${activatedPlan.totalConversions} conversions available.`,
        duration: 7000,
      });
    } else {
      // This part is now typically reached after PayPal payment success
      toast({
        title: `${activatedPlan.name} Plan Activated!`,
        description: `You now have ${activatedPlan.totalConversions} conversions. This plan is billed ${activatedPlan.billingCycle}. Your conversions will be available immediately.`,
        duration: 7000,
      });
    }
  };

  return (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: "USD" }}>
      <div className="container mx-auto py-12 px-4 md:px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl lg:text-6xl">
            Find the Perfect Plan
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-muted-foreground">
            Choose the plan that best suits your PDF to Excel conversion needs. Get more with annual billing!
            All plans now include a 7-day free trial.
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <Tabs value={billingCycle} onValueChange={(value) => setBillingCycle(value as 'monthly' | 'annual')} className="w-auto">
            <TabsList className="grid w-full grid-cols-2 md:w-[200px]">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="annual">Annual (Save ~50%)</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {PRICING_PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              billingCycle={billingCycle}
              onSelectPlan={handleSelectPlan}
            />
          ))}
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-2xl font-semibold text-foreground">Not sure which plan is right for you?</h3>
          <p className="text-muted-foreground mt-2 mb-6">
            You can start with our free tier (1 conversion for guests, 5 for logged-in users) to test out the service before starting a trial or paid plan.
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
              <h4 className="font-medium text-foreground">How does the 7-day free trial work?</h4>
              <p className="text-muted-foreground">Select any plan to start your 7-day free trial. You'll get access to the plan's conversion limits for 7 days. No credit card required to start the trial. After the trial, you can choose to subscribe to continue using the plan.</p>
            </div>
            <div>
              <h4 className="font-medium text-foreground">Can I change my plan later?</h4>
              <p className="text-muted-foreground">Yes, you can upgrade or downgrade your plan at any time. Changes will apply from the next billing cycle or after your current trial ends.</p>
            </div>
            <div>
              <h4 className="font-medium text-foreground">What happens if I exceed my conversions during the trial or on a plan?</h4>
              <p className="text-muted-foreground">If you exceed your plan's conversion limit (trial or paid), you'll be prompted to upgrade your plan or wait until your quota renews. Alternatively, you can purchase conversion packs (coming soon).</p>
            </div>
          </div>
        </div>
      </div>
    </PayPalScriptProvider>
  );
}
