
"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PricingCard from '@/components/pricing/pricing-card';
import { PRICING_PLANS, type Plan as PlanType } from '@/config/pricing';
import { useToast } from '@/hooks/use-toast';
import { activatePlan, type PlanDetails } from '@/lib/local-storage-limits';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const handleSelectPlan = (planId: PlanType['id'], cycle: 'monthly' | 'annual') => {
    const selectedPlan = PRICING_PLANS.find(p => p.id === planId);
    if (!selectedPlan) return;

    const planDetailsToActivate: PlanDetails = {
      id: selectedPlan.id,
      name: selectedPlan.name,
      conversions: cycle === 'monthly' ? selectedPlan.monthlyConversions : selectedPlan.annualConversions,
      cycle: cycle,
      price: cycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.annualPrice,
    };

    const activatedPlan = activatePlan(currentUser ? currentUser.uid : null, planDetailsToActivate);

    toast({
      title: `${activatedPlan.name} Plan Activated!`,
      description: `You now have ${activatedPlan.totalConversions} conversions. This plan is billed ${activatedPlan.billingCycle}.`,
      duration: 5000,
    });

    // Here, you would typically redirect to a payment gateway or a confirmation page.
    // For now, we just show a toast.
    // Example: router.push('/checkout?planId=' + planId + '&cycle=' + cycle);
  };

  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl lg:text-6xl">
          Find the Perfect Plan
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-xl text-muted-foreground">
          Choose the plan that best suits your PDF to Excel conversion needs. Get more with annual billing!
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
          You can start with our free tier (1 conversion for guests, 5 for logged-in users) to test out the service.
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
            <h4 className="font-medium text-foreground">Can I change my plan later?</h4>
            <p className="text-muted-foreground">Yes, you can upgrade or downgrade your plan at any time. Changes will apply from the next billing cycle.</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground">What happens if I exceed my monthly/annual conversions?</h4>
            <p className="text-muted-foreground">If you exceed your plan's conversion limit, you'll be prompted to upgrade your plan or wait until your quota renews. Alternatively, you can purchase conversion packs (coming soon).</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground">Is there a free trial?</h4>
            <p className="text-muted-foreground">We offer a free tier with limited conversions so you can try our service. Guests get 1 conversion, and signed-up users get 5 conversions, resetting every 24 hours if not on a paid plan.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
