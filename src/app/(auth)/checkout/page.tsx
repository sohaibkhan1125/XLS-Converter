
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { PRICING_PLANS, type Plan as PlanType } from '@/config/pricing';
import { activatePlan, type PlanDetails } from '@/lib/local-storage-limits';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/core/loading-spinner';
import type { GeneralSiteSettings } from '@/types/site-settings';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

function CheckoutFlow() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { currentUser } = useAuth();
    
    const [message, setMessage] = useState("");
    const [generalSettings, setGeneralSettings] = useState<GeneralSiteSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const planId = searchParams.get('planId') as PlanType['id'];
    const cycle = searchParams.get('cycle') as 'monthly' | 'annual';
    const plan = PRICING_PLANS.find(p => p.id === planId);
    
    useEffect(() => {
        const unsubscribe = subscribeToGeneralSettings((settings) => {
            setGeneralSettings(settings);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!isLoading && (!plan || !cycle)) {
            toast({ variant: 'destructive', title: 'Invalid Plan', description: 'No plan selected. Redirecting to pricing.' });
            router.push('/pricing');
        }
        if (!isLoading && !currentUser) {
            toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to check out.' });
            router.push('/login');
        }
    }, [plan, cycle, isLoading, router, toast, currentUser]);

    if (isLoading || !plan || !cycle || !currentUser) {
        return <div className="flex h-64 items-center justify-center"><LoadingSpinner message="Loading checkout..." /></div>;
    }

    const price = cycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
    const paypalPlanId = cycle === 'monthly' ? plan.monthlyPlanId : plan.annualPlanId;
    
    // Updated logic: Find PayPal settings regardless of the 'enabled' flag to ensure checkout works if configured.
    const paypalGatewaySettings = generalSettings?.paymentGateways?.find(pg => pg.id === 'paypal' && pg.credentials.clientId);
    const paypalClientId = paypalGatewaySettings?.credentials.clientId;

    if (!paypalClientId || paypalClientId.includes('@') || !paypalPlanId || paypalPlanId.startsWith('REPLACE_')) {
        return (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Configuration Error</AlertTitle>
                <AlertDescription>
                    Payment processing is not configured correctly for this plan.
                    This could be due to an invalid PayPal Client ID or a missing PayPal Plan ID for the selected billing cycle.
                    Please contact support.
                </AlertDescription>
            </Alert>
        );
    }
    
    const initialOptions = {
        "client-id": paypalClientId,
        "vault": "true",
        "intent": "subscription",
        "currency": "USD",
    };

    const handleSuccessfulSubscription = (subscriptionID: string) => {
         const planDetailsToActivate: PlanDetails = {
            id: plan.id,
            name: plan.name,
            conversions: cycle === 'monthly' ? plan.monthlyConversions : plan.annualConversions,
            cycle: cycle,
            price: price,
            trialDays: plan.trialDays,
        };

        const activatedPlan = activatePlan(currentUser.uid, planDetailsToActivate);

        toast({
            title: `${activatedPlan.name} Plan Activated!`,
            description: `Subscription successful with ID: ${subscriptionID}. You now have ${activatedPlan.totalConversions} conversions. This plan is billed ${activatedPlan.billingCycle}.`,
            duration: 9000,
        });
        
        router.push('/'); 
    };

    return (
        <Card className="w-full max-w-md shadow-xl">
             <CardHeader>
                <CardTitle className="text-2xl text-center">Checkout Subscription</CardTitle>
                <CardDescription className="text-center">
                    You are subscribing to the <span className="font-semibold text-primary">{plan.name}</span> plan ({cycle}).
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center mb-6">
                    <p className="text-lg text-muted-foreground">Total:</p>
                    <p className="text-4xl font-bold text-foreground">${price.toFixed(2)} / {cycle === 'monthly' ? 'month' : 'year'}</p>
                </div>
                <PayPalScriptProvider options={initialOptions}>
                    <PayPalButtons
                        style={{
                            shape: "rect",
                            layout: "vertical",
                            color: "gold",
                            label: "subscribe",
                        }}
                        createSubscription={(data, actions) => {
                            return actions.subscription.create({
                                plan_id: paypalPlanId,
                            });
                        }}
                        onApprove={(data, actions) => {
                            console.log("Subscription approved:", data);
                            toast({ title: 'Processing Subscription...', description: 'Please wait while we finalize your plan.' });
                            handleSuccessfulSubscription(data.subscriptionID);
                            return Promise.resolve();
                        }}
                        onError={(err) => {
                            console.error("PayPal Subscription Error:", err);
                            toast({ variant: 'destructive', title: 'Payment Error', description: 'An error occurred with the PayPal subscription. Please try again.' });
                        }}
                    />
                </PayPalScriptProvider>
                {message && <p className="mt-4 text-center text-muted-foreground">{message}</p>}
            </CardContent>
        </Card>
    );
}

// Parent component to provide Suspense boundary for useSearchParams
export default function CheckoutPage() {
    return (
        <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
             <Suspense fallback={<LoadingSpinner message="Loading..." />}>
                <CheckoutFlow />
            </Suspense>
        </div>
    )
}
