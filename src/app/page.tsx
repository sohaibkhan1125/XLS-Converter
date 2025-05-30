
"use client";

import { useState, useEffect } from 'react';
import FileUploader from '@/components/core/file-uploader';
import DataPreview from '@/components/core/data-preview';
import LimitDialog from '@/components/core/limit-dialog';
import LoadingSpinner from '@/components/core/loading-spinner';
import FeatureSection from '@/components/core/feature-section'; // Import FeatureSection
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Download, Trash2, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { checkConversionLimit, recordConversion, formatTime } from '@/lib/local-storage-limits';
import { exportToExcel } from '@/lib/excel-export';
import { extractTextFromPdf, convertPdfPageToImageUri, formatStructuredDataForExcel } from '@/lib/pdf-utils';
import { extractTextFromImage as extractTextFromImageAI } from '@/ai/flows/extract-text-from-image';
import { structurePdfData as structurePdfDataAI, type StructuredPdfDataOutput } from '@/ai/flows/structure-pdf-data-flow';

const MIN_TEXT_LENGTH_FOR_TEXT_PDF = 100; // Heuristic: if PDF has less than this many chars, assume image-based.

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [excelReadyData, setExcelReadyData] = useState<string[][] | null>(null); // Renamed from extractedData for clarity
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>(""); // For more granular loading messages
  const [error, setError] = useState<string | null>(null);
  
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitDialogUserType, setLimitDialogUserType] = useState<'guest' | 'loggedIn'>('guest');
  const [limitDialogTimeToWait, setLimitDialogTimeToWait] = useState<string | undefined>(undefined);

  const { currentUser } = useAuth();
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setExcelReadyData(null);
    setError(null);
    setLoadingStep("");

    const limitStatus = checkConversionLimit(currentUser ? currentUser.uid : null);
    if (!limitStatus.allowed) {
      setLimitDialogUserType(currentUser ? 'loggedIn' : 'guest');
      setLimitDialogTimeToWait(limitStatus.timeToWaitMs ? formatTime(limitStatus.timeToWaitMs) : undefined);
      setShowLimitDialog(true);
      setSelectedFile(null); // Clear selection if limit reached
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
        const imageDataUri = await convertPdfPageToImageUri(fileBuffer, 1); // OCR first page
        const aiOcrResult = await extractTextFromImageAI({ photoDataUri: imageDataUri });
        if (!aiOcrResult || !aiOcrResult.extractedText) {
          throw new Error("OCR process failed to extract text from image-based PDF.");
        }
        rawTextOutput = aiOcrResult.extractedText;
        toast({ title: "OCR Successful", description: "Text extracted using OCR." });
      }
      
      setLoadingStep("Structuring PDF data with AI...");
      toast({ title: "Structuring Data", description: "AI is analyzing the document structure. This can take a few moments." });
      const structuredDataResult: StructuredPdfDataOutput = await structurePdfDataAI({ rawText: rawTextOutput });
      
      if (!structuredDataResult || !structuredDataResult.blocks || structuredDataResult.blocks.length === 0) {
        // Even if the AI returns an empty blocks array, formatStructuredDataForExcel handles it.
        // We might want a more specific error if blocks is undefined/null after AI processing.
        console.warn("AI structuring returned no blocks or an unexpected result:", structuredDataResult);
        toast({ variant: "destructive", title: "AI Structuring Issue", description: "AI could not effectively structure the document. The output might be basic." });
      }

      setLoadingStep("Formatting data for Excel...");
      const excelData = formatStructuredDataForExcel(structuredDataResult);
      setExcelReadyData(excelData);
      
      recordConversion(currentUser ? currentUser.uid : null);
      toast({ title: "Conversion Successful", description: "PDF data processed and structured. Ready for preview/download." });

    } catch (err: any) {
      console.error("Processing error:", err);
      const errorMessage = err.message || "An unknown error occurred during processing.";
      setError(errorMessage);
      toast({ variant: "destructive", title: "Processing Error", description: errorMessage });
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
            <Zap className="mr-2 h-8 w-8 text-primary" /> XLSConvert
          </CardTitle>
          <CardDescription className="text-center text-lg text-muted-foreground">
            Upload your PDF, preview the AI-structured data, and download it as an Excel file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileUploader 
            onFileSelect={handleFileSelect} 
            selectedFile={selectedFile}
            clearSelection={handleClearSelection}
            disabled={isLoading}
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
        userType={limitDialogUserType}
        timeToWaitFormatted={limitDialogTimeToWait}
      />

      <FeatureSection /> {/* Add the FeatureSection here */}
    </div>
  );
}
