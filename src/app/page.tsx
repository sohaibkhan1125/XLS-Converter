
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
import { Terminal, Download, Trash2, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { checkConversionLimit, recordConversion, formatTime, type LimitStatus, getActivePlan, type ActivePlan } from '@/lib/local-storage-limits';
import { exportToExcel } from '@/lib/excel-export';
import { extractTextFromPdf, convertAllPdfPagesToImageUris, formatStructuredDataForExcel } from '@/lib/pdf-utils';
import { extractTextFromImage as extractTextFromImageAI } from '@/ai/flows/extract-text-from-image';
import { structurePdfData as structurePdfDataAI, type StructuredPdfDataOutput, type Transaction } from '@/ai/flows/structure-pdf-data-flow';
import type { GeneralSiteSettings, PageSEOInfo } from '@/types/site-settings';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/language-context';

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


  const handleFilesSelect = async (files: File[]) => {
    setSelectedFiles(files);
    setExcelReadyData(null);
    setError(null);
    setLoadingStep("");

    if (files.length === 0) return;

    const numFiles = files.length;
    const limitStatus: LimitStatus = checkConversionLimit(currentUser ? currentUser.uid : null, numFiles);
    
    if (!limitStatus.allowed) {
      setLimitDialogContent({
        userType: currentUser ? 'loggedIn' : 'guest',
        timeToWaitFormatted: limitStatus.timeToWaitMs ? formatTime(limitStatus.timeToWaitMs) : undefined,
        onPlan: limitStatus.onPlan,
        planName: limitStatus.planName,
        isPlanExhausted: limitStatus.isPlanExhausted,
      });
      setShowLimitDialog(true);
      setSelectedFiles([]); // Clear selection as we can't proceed
      return; // CRITICAL: Stop the function here
    }

    setIsLoading(true);
    let allTransactions: Transaction[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progressPrefix = files.length > 1 ? `(File ${i + 1}/${files.length})` : '';

        const fileBuffer = await file.arrayBuffer();
        let rawTextOutput: string;

        setLoadingStep(`${progressPrefix} Extracting text from PDF...`);
        const directText = await extractTextFromPdf(fileBuffer);

        if (directText && directText.length > MIN_TEXT_LENGTH_FOR_TEXT_PDF) {
          rawTextOutput = directText;
          toast({ title: "Text Extracted", description: `Successfully extracted text from ${file.name}.` });
        } else {
          toast({ title: "Image PDF Detected", description: `Scanning all pages of ${file.name} with OCR. This may take a moment.` });
          setLoadingStep(`${progressPrefix} Performing OCR on all PDF pages...`);
          const imageDataUris = await convertAllPdfPagesToImageUris(fileBuffer);

          let ocrTextFromAllPages = '';
          for (let pageIndex = 0; pageIndex < imageDataUris.length; pageIndex++) {
              setLoadingStep(`${progressPrefix} OCR on page ${pageIndex + 1}/${imageDataUris.length}...`);
              const aiOcrResult = await extractTextFromImageAI({ photoDataUri: imageDataUris[pageIndex] });
              if (aiOcrResult && aiOcrResult.extractedText) {
                  ocrTextFromAllPages += aiOcrResult.extractedText + '\n\n';
              }
          }

          if (!ocrTextFromAllPages) {
            throw new Error(`OCR process failed to extract any text from ${file.name}.`);
          }
          rawTextOutput = ocrTextFromAllPages;
          toast({ title: "OCR Successful", description: `Text extracted from all pages of ${file.name} using OCR.` });
        }
        
        setLoadingStep(`${progressPrefix} Structuring transaction data with AI...`);
        toast({ title: "Structuring Data", description: `AI is analyzing ${file.name} for transactions.` });
        const structuredDataResult: StructuredPdfDataOutput = await structurePdfDataAI({ rawText: rawTextOutput });
        
        if (structuredDataResult && structuredDataResult.transactions) {
          allTransactions.push(...structuredDataResult.transactions);
        } else {
           console.warn(`AI structuring returned no transactions for ${file.name}:`, structuredDataResult);
           toast({ variant: "destructive", title: "AI Structuring Issue", description: `AI could not find transactions in ${file.name}.` });
        }

        // Record a conversion for each successfully processed file.
        recordConversion(currentUser ? currentUser.uid : null);
      }

      if (allTransactions.length === 0) {
        throw new Error("No transactions could be extracted from any of the provided files.");
      }

      setLoadingStep("Aggregating and formatting data for Excel...");
      // Sort all transactions by date ascending. Handle potential invalid date strings.
      allTransactions.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (isNaN(dateA)) return 1; // Put invalid dates at the end
          if (isNaN(dateB)) return -1;
          return dateA - dateB;
      });
      
      const combinedOutput: StructuredPdfDataOutput = { transactions: allTransactions };
      const excelData = formatStructuredDataForExcel(combinedOutput);
      setExcelReadyData(excelData);

      const newLimitStatus = checkConversionLimit(currentUser ? currentUser.uid : null);
      let conversionToastDescription = "All PDF data processed and structured. Ready for preview/download.";
      if (newLimitStatus.onPlan && newLimitStatus.planName) {
        conversionToastDescription += ` ${newLimitStatus.remaining} ${newLimitStatus.planName} conversions remaining.`;
      } else {
        conversionToastDescription += ` ${newLimitStatus.remaining} free conversions remaining.`;
      }
      toast({ title: "Batch Conversion Successful", description: conversionToastDescription, duration: 9000 });

    } catch (err: any) {
      console.error("Detailed error in handleFilesSelect:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
      let displayMessage = "Processing failed. ";
      if (err.message) {
        displayMessage += err.message;
      } else {
        displayMessage += "An unknown error occurred.";
      }
      if (err.details) {
        try {
          displayMessage += ` Details: ${JSON.stringify(err.details)}`;
        } catch (e) { /* ignore stringify error */ }
      }
      if (err.cause && err.cause.message) {
         displayMessage += ` Cause: ${err.cause.message}`;
      }
      
      setError(displayMessage);
      toast({ variant: "destructive", title: "Processing Error", description: displayMessage, duration: 9000 });
      setExcelReadyData(null);
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleClearSelection = () => {
    setSelectedFiles([]);
    setExcelReadyData(null);
    setError(null);
    setLoadingStep("");
  };

  const handleDownload = () => {
    if (excelReadyData) {
      const fileName = activePlan ? `${activePlan.name}_consolidated_statements.xlsx` : 'converted_data.xlsx';
      exportToExcel(excelReadyData, fileName);
      toast({ title: "Download Started", description: `${fileName} is being downloaded.` });
    }
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
            onFilesSelect={handleFilesSelect} 
            selectedFiles={selectedFiles}
            clearSelection={handleClearSelection}
            disabled={isLoading}
            isSubscribed={!!activePlan}
            dragText={getTranslation('fileUploaderDrag')}
            orText={getTranslation('fileUploaderOr')}
            clickText={getTranslation('fileUploaderClick')}
          />

          {isLoading && (
            <div className="py-10">
              <LoadingSpinner />
              {loadingStep && <p className="text-center text-muted-foreground mt-2">{loadingStep}</p>}
            </div>
          )}

          {error && !isLoading && (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error Processing PDF(s)</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {excelReadyData && !isLoading && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Data Preview (Consolidated)</h2>
              <DataPreview data={excelReadyData} />
              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="outline" onClick={handleClearSelection} disabled={isLoading}>
                  <Trash2 className="mr-2 h-4 w-4" /> Clear and Upload New
                </Button>
                <Button onClick={handleDownload} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
                  <Download className="mr-2 h-4 w-4" /> Download Excel
                </Button>
              </div>
            </div>
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
