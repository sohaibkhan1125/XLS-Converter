
"use client";

import type React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Plan, PlanFeature } from '@/config/pricing';
import { CheckCircle2, XCircle } from 'lucide-react'; // Import XCircle for unavailable features

interface PricingCardProps {
  plan: Plan;
  billingCycle: 'monthly' | 'annual';
  onSelectPlan: (planId: Plan['id'], cycle: 'monthly' | 'annual') => void;
}

export default function PricingCard({ plan, billingCycle, onSelectPlan }: PricingCardProps) {
  const displayPrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  const displayConversions = billingCycle === 'monthly' ? plan.monthlyConversions : plan.annualConversions;
  const cycleAdverb = billingCycle === 'monthly' ? 'month' : 'year';

  const handleSelect = () => {
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
      <CardFooter className="p-6 mt-auto">
        <Button
          onClick={handleSelect}
          className={cn(
            "w-full text-lg py-3",
            plan.highlight ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-accent hover:bg-accent/90 text-accent-foreground"
          )}
          size="lg"
        >
          {plan.ctaText || 'Choose Plan'}
        </Button>
      </CardFooter>
    </Card>
  );
}
