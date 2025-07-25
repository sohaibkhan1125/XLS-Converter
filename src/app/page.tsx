
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
    const file = files[0];
    if (!file) return;

    setSelectedFile(file);
    setExcelReadyData(null);
    setError(null);
    setLoadingStep("");

    const limitStatus: LimitStatus = checkConversionLimit(currentUser ? currentUser.uid : null, 1);
    
    if (!limitStatus.allowed) {
      setLimitDialogContent({
        userType: currentUser ? 'loggedIn' : 'guest',
        timeToWaitFormatted: limitStatus.timeToWaitMs ? formatTime(limitStatus.timeToWaitMs) : undefined,
        onPlan: limitStatus.onPlan,
        planName: limitStatus.planName,
        isPlanExhausted: limitStatus.isPlanExhausted
      });
      setShowLimitDialog(true);
      setSelectedFile(null); // Clear selection
      return;
    }

    setIsLoading(true);

    try {
      const fileBuffer = await file.arrayBuffer();
      let rawTextOutput: string;

      setLoadingStep(`Extracting text from PDF...`);
      const directText = await extractTextFromPdf(fileBuffer);

      if (directText && directText.length > MIN_TEXT_LENGTH_FOR_TEXT_PDF) {
        rawTextOutput = directText;
        toast({ title: "Text Extracted", description: `Successfully extracted text from ${file.name}.` });
      } else {
        toast({ title: "Image PDF Detected", description: `Scanning all pages of ${file.name} with OCR. This may take a moment.` });
        setLoadingStep(`Performing OCR on all PDF pages...`);
        const imageDataUris = await convertAllPdfPagesToImageUris(fileBuffer);

        let ocrTextFromAllPages = '';
        for (let pageIndex = 0; pageIndex < imageDataUris.length; pageIndex++) {
            setLoadingStep(`OCR on page ${pageIndex + 1}/${imageDataUris.length}...`);
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
      
      setLoadingStep(`Structuring transaction data with AI...`);
      toast({ title: "Structuring Data", description: `AI is analyzing ${file.name} for transactions.` });
      const structuredDataResult: StructuredPdfDataOutput = await structurePdfDataAI({ rawText: rawTextOutput });
      
      if (!structuredDataResult || !structuredDataResult.transactions || structuredDataResult.transactions.length === 0) {
        throw new Error("No transactions could be extracted from the file.");
      }

      // **FIX:** Show results to user immediately, before saving the file.
      setLoadingStep("Formatting data for Excel...");
      const excelData = formatStructuredDataForExcel(structuredDataResult);
      setExcelReadyData(excelData);
      
      // Stop the main loading indicator now, as user has their result.
      setIsLoading(false);
      setLoadingStep("");

      toast({ title: "Conversion Successful", description: "Data processed and structured. Ready for preview/download." });

      // **FIX:** Record conversion and save document in the background *after* showing results.
      recordConversion(currentUser ? currentUser.uid : null);
      if (currentUser) {
        // No need to show "Saving..." to the user, it happens silently.
        // We can add a small, non-blocking toast notification if we want.
        uploadUserDocuments(currentUser.uid, [file]).then(() => {
          toast({ title: "Document Saved", description: `${file.name} has been added to your Documents page.` });
        }).catch((uploadError) => {
          console.error("Background document save failed:", uploadError);
          toast({ variant: "destructive", title: "Save Failed", description: `Could not save ${file.name} to your documents.` });
        });
      }

    } catch (err: any) {
      console.error("Detailed error in handleFileSelect:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
      let displayMessage = "Processing failed. ";
      if (err.message) {
        displayMessage += err.message;
      } else {
        displayMessage += "An unknown error occurred.";
      }
      setError(displayMessage);
      toast({ variant: "destructive", title: "Processing Error", description: displayMessage, duration: 9000 });
      setExcelReadyData(null);
      // Ensure loading is stopped on error
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
      const fileName = `${selectedFile.name.replace(/\.pdf$/i, '')}.xlsx`;
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
            onFilesSelect={handleFileSelect} 
            selectedFiles={selectedFile ? [selectedFile] : []}
            clearSelection={handleClearSelection}
            disabled={isLoading}
            isSubscribed={!!currentUser} // Allow multiple files for logged-in users
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
              <h2 className="text-2xl font-semibold text-foreground">Data Preview</h2>
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
