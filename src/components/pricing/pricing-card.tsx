
"use client";

import type React from 'react';
import { PayPalButtons, usePayPalScriptReducer, type PayPalButtonsComponentProps } from "@paypal/react-paypal-js";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/core/loading-spinner';
import { cn } from '@/lib/utils';
import type { Plan, PlanFeature } from '@/config/pricing';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PricingCardProps {
  plan: Plan;
  billingCycle: 'monthly' | 'annual';
  onSelectPlan: (planId: Plan['id'], cycle: 'monthly' | 'annual') => void;
}

export default function PricingCard({ plan, billingCycle, onSelectPlan }: PricingCardProps) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const { toast } = useToast();

  const displayPrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  const displayConversions = billingCycle === 'monthly' ? plan.monthlyConversions : plan.annualConversions;
  const cycleAdverb = billingCycle === 'monthly' ? 'month' : 'year';

  const paypalButtonOptions: PayPalButtonsComponentProps = {
    style: { 
      layout: "vertical", 
      tagline: false, 
      height: 48,
      // color: plan.highlight ? "blue" : "gold", // Example: PayPal button color customization
      // shape: 'pill',
    },
    disabled: false, // Can be dynamically set, e.g. based on auth state or plan conditions
    createOrder: async (_data, actions) => {
      return actions.order.create({
        purchase_units: [{
          amount: {
            value: displayPrice.toFixed(2), // Ensure value is a string with 2 decimal places
            currency_code: "USD" // Assuming USD, should match provider currency
          },
          description: `${plan.name} Plan - ${billingCycle}ly`
        }]
      });
    },
    onApprove: async (data, actions) => {
      try {
        const captureDetails = await actions.order?.capture();
        // Check if captureDetails is defined, as capture() might not always return details (e.g. if already captured)
        if (captureDetails) {
          toast({
            title: "Payment Successful!",
            description: `Order ID: ${captureDetails.id}. Thank you for your purchase.`,
          });
        } else {
           toast({
            title: "Payment Approved!",
            description: `Order ID: ${data.orderID}. Thank you for your purchase.`,
          });
        }
        // Call the original function to activate the plan in localStorage
        onSelectPlan(plan.id, billingCycle);
      } catch (error) {
        console.error("PayPal Capture Error:", error);
        toast({
          variant: "destructive",
          title: "Payment Capture Failed",
          description: "There was an issue processing your payment. Please try again or contact support.",
        });
      }
    },
    onError: (err) => {
      console.error("PayPal Button Error:", err);
      toast({
        variant: "destructive",
        title: "PayPal Error",
        description: "An error occurred with PayPal. Please ensure your details are correct or try again later.",
      });
    },
    onCancel: () => {
      toast({
        title: "Payment Cancelled",
        description: "You have cancelled the payment process.",
      });
    }
  };

  return (
    <Card className={cn(
      "flex flex-col shadow-lg transition-all duration-300 ease-in-out",
      plan.highlight ? "border-primary border-2 scale-105 ring-4 ring-primary/20" : "hover:shadow-xl",
      "bg-card"
    )}>
      <CardHeader className="items-center text-center p-6">
        {plan.icon && <plan.icon className={cn("h-12 w-12 mb-4", plan.highlight ? "text-primary" : "text-accent")} />}
        <CardTitle className="text-2xl font-bold text-foreground">{plan.name}</CardTitle>
        <CardDescription className="text-muted-foreground h-10"> {/* Fixed height for description */}
          {plan.id === 'starter' && `Ideal for individuals and occasional use.`}
          {plan.id === 'professional' && `Perfect for professionals and frequent users.`}
          {plan.id === 'business' && `Tailored for businesses and high-volume needs.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow p-6 space-y-6">
        <div className="text-center">
          <span className="text-4xl font-extrabold text-foreground">${displayPrice}</span>
          <span className="text-sm text-muted-foreground">/{cycleAdverb}</span>
        </div>
        <ul className="space-y-3">
          <li className="flex items-start">
            <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
            <span className="text-foreground">
              {displayConversions} conversions/{cycleAdverb}
            </span>
          </li>
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              {feature.available ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5 shrink-0" />
              )}
              <span className={cn(feature.available ? "text-foreground" : "text-muted-foreground line-through")}>
                {feature.text}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="p-6 mt-auto min-h-[80px] flex items-center justify-center"> {/* Ensure footer has some min height */}
        {isPending ? (
          <LoadingSpinner message="Loading payment options..." />
        ) : isRejected ? (
          <p className="text-destructive text-center text-sm">
            Could not load PayPal. Please refresh the page or check your internet connection.
          </p>
        ) : (
          <div className="w-full">
            <PayPalButtons {...paypalButtonOptions} />
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
