
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud, BrainCircuit, FileSpreadsheet, ShieldCheck, FileText, FileImage, Zap } from "lucide-react";
import type { GeneralSiteSettings } from '@/types/site-settings';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/language-context';

const GENERIC_APP_NAME = "Our Application";
const GENERIC_PAGE_TITLE = "Documentation";
const GENERIC_PAGE_DESCRIPTION = "Learn how our application works, its key features, and how we handle your data.";

export default function DocumentsPage() {
  const [displayedSiteTitle, setDisplayedSiteTitle] = useState<string>(GENERIC_APP_NAME);
  const pathname = usePathname();
  const { getTranslation } = useLanguage();

  useEffect(() => {
    const unsubscribe = subscribeToGeneralSettings((settings) => {
      const currentSiteTitle = settings?.siteTitle || GENERIC_APP_NAME;
      setDisplayedSiteTitle(currentSiteTitle);

      let pageTitle = `${GENERIC_PAGE_TITLE} - ${currentSiteTitle}`;
      let pageDescription = GENERIC_PAGE_DESCRIPTION;

      if (settings?.seoSettings && settings.seoSettings[pathname]) {
        const seoData = settings.seoSettings[pathname];
        if (seoData?.title) pageTitle = seoData.title;
        if (seoData?.description) pageDescription = seoData.description;
        
        let keywordsTag = document.querySelector('meta[name="keywords"]');
        if (!keywordsTag) {
          keywordsTag = document.createElement('meta');
          keywordsTag.setAttribute('name', 'keywords');
          document.head.appendChild(keywordsTag);
        }
        if (seoData?.keywords) keywordsTag.setAttribute('content', seoData.keywords);
      }
      document.title = pageTitle;
      let descriptionTag = document.querySelector('meta[name="description"]');
      if (!descriptionTag) {
        descriptionTag = document.createElement('meta');
        descriptionTag.setAttribute('name', 'description');
        document.head.appendChild(descriptionTag);
      }
      descriptionTag.setAttribute('content', pageDescription);
    });
    return () => unsubscribe();
  }, [pathname]);

  return (
    <div className="space-y-12">
      <section className="text-center py-10 bg-card shadow-lg rounded-lg">
        <h1 className="text-5xl font-extrabold text-primary mb-4">Documentation</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Everything you need to know about {displayedSiteTitle}.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">How It Works</CardTitle>
          <CardDescription>A simple three-step process to get your data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div className="h-16 w-px bg-border my-2"></div>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Step 1: Upload Your PDF</h3>
              <p className="text-muted-foreground">Drag and drop your PDF bank statement or select it from your device. Our system accepts both text-based and image-based (scanned) PDFs.</p>
            </div>
          </div>
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <BrainCircuit className="h-6 w-6" />
                </div>
                <div className="h-16 w-px bg-border my-2"></div>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Step 2: AI-Powered Processing</h3>
              <p className="text-muted-foreground">Our advanced AI gets to work. It first determines if the PDF contains selectable text. If not, it performs Optical Character Recognition (OCR) to extract the text. Then, it analyzes the raw text to identify and structure the transaction data, including dates, descriptions, debits, credits, and running balances.</p>
            </div>
          </div>
          <div className="flex items-start gap-6">
             <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Step 3: Preview and Download</h3>
              <p className="text-muted-foreground">Once processed, you'll see a preview of the structured data right on the page. If everything looks correct, simply click the "Download Excel" button to get your neatly organized `.xlsx` file.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Key Features</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
                <FileText className="h-8 w-8 text-accent shrink-0 mt-1" />
                <div>
                    <h4 className="font-semibold text-lg">Text-Based PDF Support</h4>
                    <p className="text-muted-foreground">For PDFs created directly from software (e-bills, etc.), our tool extracts text with perfect accuracy, ensuring a clean and reliable conversion.</p>
                </div>
            </div>
            <div className="flex gap-4">
                <FileImage className="h-8 w-8 text-accent shrink-0 mt-1" />
                <div>
                    <h4 className="font-semibold text-lg">Image-Based (Scanned) PDF Support</h4>
                    <p className="text-muted-foreground">Have a scanned paper statement? No problem. Our AI performs OCR to read the text from the image before structuring the data.</p>
                </div>
            </div>
            <div className="flex gap-4">
                <Zap className="h-8 w-8 text-accent shrink-0 mt-1" />
                <div>
                    <h4 className="font-semibold text-lg">Intelligent Data Structuring</h4>
                    <p className="text-muted-foreground">More than just text extraction, our AI understands bank statements. It correctly identifies columns for dates, descriptions, and monetary values, even with complex layouts.</p>
                </div>
            </div>
            <div className="flex gap-4">
                <ShieldCheck className="h-8 w-8 text-accent shrink-0 mt-1" />
                <div>
                    <h4 className="font-semibold text-lg">Privacy and Security</h4>
                    <p className="text-muted-foreground">We prioritize your privacy. Uploaded documents are processed in memory and are not stored on our servers after the conversion is complete. Your data remains your own.</p>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
