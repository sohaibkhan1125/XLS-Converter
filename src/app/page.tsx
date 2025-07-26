
"use client";

import { useState, useEffect } from 'react';
import FileUploader from '@/components/core/file-uploader';
import DataPreview from '@/components/core/data-preview';
import LimitDialog from '@/components/core/limit-dialog';
import LoadingSpinner from '@/components/core/loading-spinner';
import FeatureSection from '@/components/core/feature-section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Download, Trash2, Zap, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { checkConversionLimit, recordConversion, formatTime, type LimitStatus, getActivePlan, type ActivePlan } from '@/lib/local-storage-limits';
import { exportToExcel } from '@/lib/excel-export';
import { extractTextFromPdf, convertAllPdfPagesToImageUris, formatStructuredDataForExcel } from '@/lib/pdf-utils';
import { extractTextFromImage as extractTextFromImageAI } from '@/ai/flows/extract-text-from-image';
import { structurePdfData as structurePdfDataAI, type StructuredPdfDataOutput, type Transaction } from '@/ai/flows/structure-pdf-data-flow';
import { uploadUserDocuments } from '@/lib/firebase-document-service'; // Import the upload service
import type { GeneralSiteSettings, PageSEOInfo } from '@/types/site-settings';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/language-context';
import Link from 'next/link';

const MIN_TEXT_LENGTH_FOR_TEXT_PDF = 100;
const GENERIC_APP_NAME = "PDF to Excel Converter"; // Generic fallback

export default function HomePage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [excelReadyData, setExcelReadyData] = useState<string[][] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitDialogContent, setLimitDialogContent] = useState<{
    userType: 'guest' | 'loggedIn';
    timeToWaitFormatted?: string;
    onPlan?: boolean;
    planName?: string;
    isPlanExhausted?: boolean;
  }>({ userType: 'guest' });

  const { currentUser } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const [displayedSiteTitle, setDisplayedSiteTitle] = useState<string>(GENERIC_APP_NAME);
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const { getTranslation } = useLanguage();

  useEffect(() => {
    if (currentUser) {
      setActivePlan(getActivePlan(currentUser.uid));
    } else {
      setActivePlan(null);
    }
  }, [currentUser]);


  useEffect(() => {
    const unsubscribe = subscribeToGeneralSettings((settings) => {
      const currentSiteTitle = settings?.siteTitle || GENERIC_APP_NAME;
      setDisplayedSiteTitle(currentSiteTitle);

      if (settings?.seoSettings && settings.seoSettings[pathname]) {
        const seoData = settings.seoSettings[pathname];
        if (seoData?.title) {
          document.title = seoData.title;
        } else {
          document.title = currentSiteTitle; // Fallback document title to site title
        }
        
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
      } else {
         document.title = currentSiteTitle; // Fallback document title
      }
    });
    return () => unsubscribe();
  }, [pathname]);


  const handleFileSelect = async (files: File[]) => {
    if (!files || files.length === 0) return;

    if (!currentUser) {
        toast({
            variant: "destructive",
            title: "Login Required",
            description: "Please log in or create an account to upload and save documents.",
        });
        router.push('/login?redirect=/documents');
        return;
    }

    setIsLoading(true);
    setLoadingStep(`Uploading ${files.length} document(s)...`);
    setError(null);

    try {
        await uploadUserDocuments(currentUser.uid, files);
        toast({
            title: "Upload Successful!",
            description: `${files.length} document(s) have been saved to your account. Redirecting...`,
        });
        router.push('/documents');
        // Do not turn off loading here, let the redirect happen.
        // If redirect fails, the user can manually navigate.
        // Or we can add a timeout to turn off loading. For now, this is cleaner.

    } catch (err: any) {
        const errorMessage = err.message || "An unknown error occurred during upload.";
        console.error("Detailed error in handleFileSelect (upload):", err);
        setError(errorMessage);
        toast({ variant: "destructive", title: "Upload Failed", description: errorMessage, duration: 9000 });
        setIsLoading(false); // IMPORTANT: Stop loading on error
    }
  };


  const handleClearSelection = () => {
    setSelectedFiles([]);
    setExcelReadyData(null);
    setError(null);
    setLoadingStep("");
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary flex items-center justify-center">
            <Zap className="mr-2 h-8 w-8 text-primary" /> {getTranslation('pageTitle')}
          </CardTitle>
          <CardDescription className="text-center text-lg text-muted-foreground">
            {getTranslation('pageDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileUploader 
            onFilesSelect={handleFileSelect}
            disabled={isLoading}
            isSubscribed={!!currentUser}
            dragText={getTranslation('fileUploaderDrag')}
            orText={getTranslation('fileUploaderOr')}
            clickText={getTranslation('fileUploaderClick')}
          />

          {isLoading && (
            <div className="py-10">
              <LoadingSpinner message={loadingStep || 'Processing...'} />
            </div>
          )}

          {error && !isLoading && (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

        </CardContent>
      </Card>

      <LimitDialog
        isOpen={showLimitDialog}
        onOpenChange={setShowLimitDialog}
        userType={limitDialogContent.userType}
        timeToWaitFormatted={limitDialogContent.timeToWaitFormatted}
        onPlan={limitDialogContent.onPlan}
        planName={limitDialogContent.planName}
        isPlanExhausted={limitDialogContent.isPlanExhausted}
      />

      <FeatureSection siteTitle={displayedSiteTitle} />
    </div>
  );
}
