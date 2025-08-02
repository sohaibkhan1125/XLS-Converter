
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
import type { GeneralSiteSettings } from '@/types/site-settings';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/language-context';

const MIN_TEXT_LENGTH_FOR_TEXT_PDF = 100;
const GENERIC_APP_NAME = "PDF to Excel Converter";

// Helper to update meta tags
const updateMeta = (name: string, content: string) => {
    let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);

    const ogName = `og:${name}`;
     let ogTag = document.querySelector(`meta[property="${ogName}"]`) as HTMLMetaElement;
    if (!ogTag) {
        ogTag = document.createElement('meta');
        ogTag.setAttribute('property', ogName);
        document.head.appendChild(ogTag);
    }
    ogTag.setAttribute('content', content);
};

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

      const seoData = settings?.seoSettings?.[pathname];
      const pageTitle = seoData?.title || currentSiteTitle;
      const pageDescription = seoData?.description || "Easily convert your PDF files to structured Excel spreadsheets with AI.";
      
      document.title = pageTitle;
      updateMeta('description', pageDescription);

      let ogTitleTag = document.querySelector('meta[property="og:title"]') as HTMLMetaElement;
      if (!ogTitleTag) {
          ogTitleTag = document.createElement('meta');
          ogTitleTag.setAttribute('property', 'og:title');
          document.head.appendChild(ogTitleTag);
      }
      ogTitleTag.setAttribute('content', pageTitle);

      if (seoData?.keywords) {
        let keywordsTag = document.querySelector('meta[name="keywords"]');
        if (!keywordsTag) {
          keywordsTag = document.createElement('meta');
          keywordsTag.setAttribute('name', 'keywords');
          document.head.appendChild(keywordsTag);
        }
        keywordsTag.setAttribute('content', seoData.keywords);
      }
    });
    return () => unsubscribe();
  }, [pathname]);

  const handleFileSelect = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const userId = currentUser ? currentUser.uid : null;
    const limitStatus = checkConversionLimit(userId);
    
    if (!limitStatus.allowed) {
      setLimitDialogContent({
        userType: currentUser ? 'loggedIn' : 'guest',
        timeToWaitFormatted: limitStatus.timeToWaitMs ? formatTime(limitStatus.timeToWaitMs) : undefined,
        onPlan: limitStatus.onPlan,
        planName: limitStatus.planName,
        isPlanExhausted: limitStatus.isPlanExhausted,
      });
      setShowLimitDialog(true);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setExcelReadyData(null);
    setLoadingStep("Processing your PDF, please wait...");

    try {
      const fileBuffer = await file.arrayBuffer();
      
      setLoadingStep("Extracting text from PDF...");
      const directText = await extractTextFromPdf(fileBuffer);
      let rawTextOutput: string;

      if (directText && directText.length > MIN_TEXT_LENGTH_FOR_TEXT_PDF) {
        rawTextOutput = directText;
      } else {
        setLoadingStep("PDF has no text, using OCR to scan pages...");
        const imageDataUris = await convertAllPdfPagesToImageUris(fileBuffer);
        let ocrTextFromAllPages = '';
        for (let i = 0; i < imageDataUris.length; i++) {
          setLoadingStep(`Scanning page ${i + 1} of ${imageDataUris.length}...`);
          const aiOcrResult = await extractTextFromImageAI({ photoDataUri: imageDataUris[i] });
          if (aiOcrResult?.extractedText) ocrTextFromAllPages += aiOcrResult.extractedText + '\n\n';
        }
        if (!ocrTextFromAllPages) throw new Error("OCR failed to extract any text from the document.");
        rawTextOutput = ocrTextFromAllPages;
      }

      setLoadingStep("Structuring data with AI...");
      const structuredDataResult = await structurePdfDataAI({ rawText: rawTextOutput });

      setLoadingStep("Preparing Excel data...");
      const formattedData = formatStructuredDataForExcel(structuredDataResult);
      setExcelReadyData(formattedData);
      setSelectedFile(file);
      
      recordConversion(userId);
      toast({ title: "Conversion Successful", description: "Your data is ready for download." });

    } catch (err: any) {
      const errorMessage = err.message || "An unknown error occurred during conversion.";
      console.error("Detailed error in handleFileSelect:", err);
      setError(errorMessage);
      toast({ variant: "destructive", title: "Conversion Failed", description: errorMessage, duration: 9000 });
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleDownload = () => {
    if (excelReadyData && selectedFile) {
      const originalFileName = selectedFile.name.replace(/\.[^/.]+$/, "");
      exportToExcel(excelReadyData, `${originalFileName}.xlsx`);
    }
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setExcelReadyData(null);
    setError(null);
    setLoadingStep("");
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <h1 className="text-3xl font-bold text-primary flex items-center justify-center">
            <Zap className="mr-2 h-8 w-8" /> {getTranslation('pageTitle')}
          </h1>
          <CardDescription className="text-lg text-muted-foreground">
            {getTranslation('pageDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!excelReadyData ? (
            <FileUploader 
              onFilesSelect={handleFileSelect}
              disabled={isLoading}
              isSubscribed={false}
              dragText={getTranslation('fileUploaderDrag')}
              orText={getTranslation('fileUploaderOr')}
              clickText={getTranslation('fileUploaderClick')}
            />
          ) : (
             <div className="space-y-4">
               <Card>
                 <CardHeader className="flex flex-row items-center justify-between">
                   <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary"/>
                    <CardTitle className="text-xl">Conversion Preview</CardTitle>
                   </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleClearSelection}><Trash2 className="mr-2 h-4 w-4"/>Start Over</Button>
                      <Button size="sm" onClick={handleDownload}><Download className="mr-2 h-4 w-4"/>Download Excel</Button>
                    </div>
                 </CardHeader>
                 <CardContent>
                    <DataPreview data={excelReadyData} />
                 </CardContent>
               </Card>
            </div>
          )}

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
