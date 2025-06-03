
"use client";

import type React from 'react';
import { PayPalButtons, usePayPalScriptReducer, type PayPalButtonsComponentProps } from "@paypal/react-paypal-js";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/core/loading-spinner';
import { Button } from '@/components/ui/button'; // Added Button
import { cn } from '@/lib/utils';
import type { Plan, PlanFeature } from '@/config/pricing';
import { CheckCircle2, XCircle, Clock } from 'lucide-react'; // Added Clock for trial
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
    },
    disabled: false,
    createOrder: async (_data, actions) => {
      return actions.order.create({
        purchase_units: [{
          amount: {
            value: displayPrice.toFixed(2),
            currency_code: "USD"
          },
          description: `${plan.name} Plan - ${billingCycle}ly`
        }]
      });
    },
    onApprove: async (data, actions) => {
      try {
        const captureDetails = await actions.order?.capture();
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
        onSelectPlan(plan.id, billingCycle); // Activate plan after successful payment
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

  const handleStartTrial = () => {
    onSelectPlan(plan.id, billingCycle);
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
        {plan.trialDays && plan.trialDays > 0 && (
          <div className="text-center text-sm font-medium text-accent-foreground bg-accent/80 p-2 rounded-md flex items-center justify-center gap-2">
            <Clock className="h-4 w-4" />
            Includes {plan.trialDays}-Day Free Trial
          </div>
        )}
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
      <CardFooter className="p-6 mt-auto min-h-[80px] flex items-center justify-center">
        {plan.trialDays && plan.trialDays > 0 ? (
          <Button 
            onClick={handleStartTrial} 
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            size="lg"
          >
            {plan.ctaText || `Start ${plan.trialDays}-Day Free Trial`}
          </Button>
        ) : (
          isPending ? (
            <LoadingSpinner message="Loading payment options..." />
          ) : isRejected ? (
            <p className="text-destructive text-center text-sm">
              Could not load PayPal. Please refresh the page or check your internet connection.
            </p>
          ) : (
            <div className="w-full">
              <PayPalButtons {...paypalButtonOptions} />
            </div>
          )
        )}
      </CardFooter>
    </Card>
  );
}
