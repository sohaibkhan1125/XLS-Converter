
"use client"; 

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react";
import type { GeneralSiteSettings } from '@/types/site-settings';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';

const DEFAULT_SITE_TITLE_FALLBACK = "XLSConvert";

export default function ContactPage() {
  const [siteTitle, setSiteTitle] = useState<string>(DEFAULT_SITE_TITLE_FALLBACK);

  useEffect(() => {
    const unsubscribe = subscribeToGeneralSettings((settings) => {
      if (settings && settings.siteTitle) {
        setSiteTitle(settings.siteTitle);
      } else {
        setSiteTitle(DEFAULT_SITE_TITLE_FALLBACK);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-12">
      <section className="text-center py-10 bg-card shadow-lg rounded-lg">
        <h1 className="text-5xl font-extrabold text-primary mb-4">Get in Touch</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          We&apos;d love to hear from you! Whether you have a question, feedback, or just want to say hello, feel free to reach out.
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-10">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Contact Form</CardTitle>
            <CardDescription>Send us a message directly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="you@example.com" />
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="Regarding your service..." />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Your message here..." rows={5} />
              </div>
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                Send Message
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Our Contact Information</CardTitle>
            <CardDescription>Other ways to connect with us.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-muted-foreground">
            <div className="flex items-start gap-4">
              <Mail className="h-6 w-6 text-accent mt-1 shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">Email Us</h3>
                <p>For general inquiries: <a href="mailto:info@xlsconvert.com" className="text-primary hover:underline">info@xlsconvert.com</a></p>
                <p>For support: <a href="mailto:support@xlsconvert.com" className="text-primary hover:underline">support@xlsconvert.com</a></p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Phone className="h-6 w-6 text-accent mt-1 shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">Call Us</h3>
                <p>Mon - Fri, 9am - 5pm (EST)</p>
                <p>+1 (555) 123-4567</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <MapPin className="h-6 w-6 text-accent mt-1 shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground">Our Office</h3>
                <p>{siteTitle}</p>
                <p>123 Innovation Drive</p>
                <p>Tech City, TX 75001, USA</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="bg-card p-8 rounded-lg shadow-lg mt-12">
        <h2 className="text-3xl font-semibold text-foreground mb-6 text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-primary">How long does it take to get a response?</h4>
            <p className="text-muted-foreground">We aim to respond to all inquiries within 24-48 business hours.</p>
          </div>
          <div>
            <h4 className="font-medium text-primary">Do you offer enterprise solutions?</h4>
            <p className="text-muted-foreground">Yes, please contact us directly to discuss your enterprise needs and we can tailor a solution for you.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
