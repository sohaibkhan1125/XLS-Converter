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

// Renders errors or successfull transactions on the screen.
function Message({ content }: { content: string }) {
    if (!content) return null;
    return <p className="mt-4 text-center text-muted-foreground">{content}</p>;
}

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
    
    const paypalGatewaySettings = generalSettings?.paymentGateways?.find(pg => pg.id === 'paypal' && pg.enabled && pg.credentials.clientId);
    const paypalClientId = paypalGatewaySettings?.credentials.clientId;

    if (!paypalClientId) {
        return (
            <div className="text-center text-destructive">
                <p>Payment processing is not configured correctly.</p>
                <p>Please contact support or an administrator.</p>
            </div>
        );
    }
    
    const initialOptions = {
        "client-id": paypalClientId,
        "enable-funding": "paylater,venmo,card",
        "disable-funding": "ideal",
        "currency": "USD",
        "data-page-type": "product-details",
        "components": "buttons",
        "data-sdk-integration-source": "developer-studio",
    };

    const handleSuccessfulPayment = () => {
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
            description: `You now have ${activatedPlan.totalConversions} conversions. This plan is billed ${activatedPlan.billingCycle}.`,
            duration: 7000,
        });
        
        // Redirect to a confirmation or home page after successful payment and activation
        router.push('/'); 
    };

    return (
        <Card className="w-full max-w-md shadow-xl">
             <CardHeader>
                <CardTitle className="text-2xl text-center">Checkout</CardTitle>
                <CardDescription className="text-center">
                    You are purchasing the <span className="font-semibold text-primary">{plan.name}</span> plan ({cycle}).
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center mb-6">
                    <p className="text-lg text-muted-foreground">Total:</p>
                    <p className="text-4xl font-bold text-foreground">${price.toFixed(2)}</p>
                </div>
                <PayPalScriptProvider options={initialOptions}>
                    <PayPalButtons
                        style={{
                            shape: "rect",
                            layout: "vertical",
                            color: "gold",
                            label: "paypal",
                        }}
                        createOrder={async () => {
                            try {
                                const response = await fetch("/api/orders", {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        planId: plan.id,
                                        billingCycle: cycle
                                    }),
                                });

                                const orderData = await response.json();

                                if (orderData.id) {
                                    return orderData.id;
                                } else {
                                    const errorDetail = orderData?.details?.[0];
                                    const errorMessage = errorDetail
                                        ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
                                        : JSON.stringify(orderData);

                                    throw new Error(errorMessage);
                                }
                            } catch (error) {
                                console.error(error);
                                setMessage(`Could not initiate PayPal Checkout...${error}`);
                                toast({ variant: 'destructive', title: 'Checkout Error', description: `Could not initiate PayPal Checkout.` });
                            }
                        }}
                        onApprove={async (data, actions) => {
                            try {
                                const response = await fetch(
                                    `/api/orders/${data.orderID}/capture`,
                                    {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                        },
                                    }
                                );

                                const orderData = await response.json();
                                const errorDetail = orderData?.details?.[0];

                                if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
                                    return actions.restart();
                                } else if (errorDetail) {
                                    throw new Error(
                                        `${errorDetail.description} (${orderData.debug_id})`
                                    );
                                } else {
                                    const transaction = orderData.purchase_units[0].payments.captures[0];
                                    setMessage(`Transaction ${transaction.status}: ${transaction.id}.`);
                                    console.log("Capture result", orderData, JSON.stringify(orderData, null, 2));
                                    handleSuccessfulPayment(); // Activate plan on success
                                }
                            } catch (error) {
                                console.error(error);
                                setMessage(`Sorry, your transaction could not be processed...${error}`);
                                toast({ variant: 'destructive', title: 'Payment Error', description: `Your transaction could not be processed.` });
                            }
                        }}
                    />
                </PayPalScriptProvider>
                <Message content={message} />
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
