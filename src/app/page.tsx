
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
import { checkConversionLimit, recordConversion, formatTime, type LimitStatus } from '@/lib/local-storage-limits';
import { exportToExcel } from '@/lib/excel-export';
import { extractTextFromPdf, convertPdfPageToImageUri, formatStructuredDataForExcel } from '@/lib/pdf-utils';
import { extractTextFromImage as extractTextFromImageAI } from '@/ai/flows/extract-text-from-image';
import { structurePdfData as structurePdfDataAI, type StructuredPdfDataOutput } from '@/ai/flows/structure-pdf-data-flow';
import type { GeneralSiteSettings, PageSEOInfo } from '@/types/site-settings';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/language-context';

const MIN_TEXT_LENGTH_FOR_TEXT_PDF = 100;
const GENERIC_APP_NAME = "PDF to Excel Converter"; // Generic fallback

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
  const { getTranslation } = useLanguage();

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


  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setExcelReadyData(null);
    setError(null);
    setLoadingStep("");

    const limitStatus: LimitStatus = checkConversionLimit(currentUser ? currentUser.uid : null);
    if (!limitStatus.allowed) {
      setLimitDialogContent({
        userType: currentUser ? 'loggedIn' : 'guest',
        timeToWaitFormatted: limitStatus.timeToWaitMs ? formatTime(limitStatus.timeToWaitMs) : undefined,
        onPlan: limitStatus.onPlan,
        planName: limitStatus.planName,
        isPlanExhausted: limitStatus.isPlanExhausted,
      });
      setShowLimitDialog(true);
      setSelectedFile(null); // Clear selection as we can't proceed
      return;
    }

    setIsLoading(true);
    try {
      const fileBuffer = await file.arrayBuffer();
      let rawTextOutput: string;

      setLoadingStep("Extracting text from PDF...");
      const directText = await extractTextFromPdf(fileBuffer);

      if (directText && directText.length > MIN_TEXT_LENGTH_FOR_TEXT_PDF) {
        rawTextOutput = directText;
        toast({ title: "Text Extracted", description: "Successfully extracted text directly from PDF." });
      } else {
        toast({ title: "Image PDF Detected", description: "Attempting OCR for text extraction. This may take a moment." });
        setLoadingStep("Performing OCR on PDF image...");
        const imageDataUri = await convertPdfPageToImageUri(fileBuffer, 1); 
        if (!imageDataUri) {
            throw new Error("Failed to convert PDF page to image data URI.");
        }
        const aiOcrResult = await extractTextFromImageAI({ photoDataUri: imageDataUri });
        if (!aiOcrResult || !aiOcrResult.extractedText) {
          throw new Error("OCR process failed to extract text from image-based PDF.");
        }
        rawTextOutput = aiOcrResult.extractedText;
        toast({ title: "OCR Successful", description: "Text extracted using OCR." });
      }
      
      setLoadingStep("Structuring transaction data with AI...");
      toast({ title: "Structuring Data", description: "AI is analyzing the document for transactions. This can take a few moments." });
      const structuredDataResult: StructuredPdfDataOutput = await structurePdfDataAI({ rawText: rawTextOutput });
      
      if (!structuredDataResult || (!structuredDataResult.transactions && !structuredDataResult.header)) {
        console.warn("AI structuring returned no transactions or an unexpected result:", structuredDataResult);
        toast({ variant: "destructive", title: "AI Structuring Issue", description: "AI could not find any transactions in the document." });
      }

      setLoadingStep("Formatting data for Excel...");
      const excelData = formatStructuredDataForExcel(structuredDataResult);
      setExcelReadyData(excelData);
      
      recordConversion(currentUser ? currentUser.uid : null);
      const newLimitStatus = checkConversionLimit(currentUser ? currentUser.uid : null);
      let conversionToastDescription = "PDF data processed and structured. Ready for preview/download.";
      if (newLimitStatus.onPlan && newLimitStatus.planName) {
        conversionToastDescription += ` ${newLimitStatus.remaining} ${newLimitStatus.planName} conversions remaining.`;
      } else {
        conversionToastDescription += ` ${newLimitStatus.remaining} free conversions remaining.`;
      }
      toast({ title: "Conversion Successful", description: conversionToastDescription });

    } catch (err: any) {
      console.error("Detailed error in handleFileSelect:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
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
      toast({ variant: "destructive", title: "Processing Error", description: displayMessage });
      setExcelReadyData(null);
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setExcelReadyData(null);
    setError(null);
    setLoadingStep("");
  };

  const handleDownload = () => {
    if (excelReadyData && selectedFile) {
      const fileName = selectedFile.name.replace(/\.pdf$/i, '.xlsx');
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
            onFileSelect={handleFileSelect} 
            selectedFile={selectedFile}
            clearSelection={handleClearSelection}
            disabled={isLoading}
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
              <AlertTitle>Error Processing PDF</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {excelReadyData && !isLoading && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Data Preview (Excel Layout)</h2>
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
