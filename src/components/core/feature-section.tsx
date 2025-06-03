
"use client";

import { useState, useEffect } from 'react';
import { ShieldCheck, Download, BrainCircuit, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { GeneralSiteSettings } from '@/types/site-settings';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: ShieldCheck,
    title: 'Secure Conversion',
    description: 'Your documents are processed securely and are not stored after conversion.',
  },
  {
    icon: Download,
    title: 'Instant Download',
    description: 'Quickly download your structured Excel file as soon as it’s ready.',
  },
  {
    icon: BrainCircuit,
    title: 'AI-Powered Structuring',
    description: 'Advanced AI accurately interprets PDF layouts for a clean Excel output.',
  },
];

const GENERIC_APP_NAME = "Our App";

interface FeatureSectionProps {
  siteTitle?: string; // Allow siteTitle to be passed as a prop
}

export default function FeatureSection({ siteTitle: propSiteTitle }: FeatureSectionProps) {
  const [displayedSiteTitle, setDisplayedSiteTitle] = useState<string>(propSiteTitle || GENERIC_APP_NAME);

  useEffect(() => {
    if (!propSiteTitle) { // Only subscribe if title is not passed as a prop
      const unsubscribe = subscribeToGeneralSettings((settings) => {
        setDisplayedSiteTitle(settings?.siteTitle || GENERIC_APP_NAME);
      });
      return () => unsubscribe();
    } else {
        setDisplayedSiteTitle(propSiteTitle);
    }
  }, [propSiteTitle]);

  return (
    <section className="py-12 lg:py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-primary mb-2">Why Choose {displayedSiteTitle}?</h2>
        <p className="text-lg text-muted-foreground text-center mb-10">
            Streamline your PDF to Excel workflow with powerful and intuitive features.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="items-center text-center">
                <feature.icon className="h-12 w-12 text-accent mb-3" />
                <CardTitle className="text-xl font-semibold text-foreground">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-muted-foreground">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
