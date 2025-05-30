"use client";

import { useState, useEffect } from 'react';
import FileUploader from '@/components/core/file-uploader';
import DataPreview from '@/components/core/data-preview';
import LimitDialog from '@/components/core/limit-dialog';
import LoadingSpinner from '@/components/core/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Download, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { checkConversionLimit, recordConversion, formatTime } from '@/lib/local-storage-limits';
import { exportToExcel } from '@/lib/excel-export';
import { extractTextFromPdf, convertPdfPageToImageUri, parseTextToTableData } from '@/lib/pdf-utils';
import { extractTextFromImage as extractTextFromImageAI } from '@/ai/flows/extract-text-from-image';

const MIN_TEXT_LENGTH_FOR_TEXT_PDF = 100; // Heuristic: if PDF has less than this many chars, assume image-based.

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<string[][] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitDialogUserType, setLimitDialogUserType] = useState<'guest' | 'loggedIn'>('guest');
  const [limitDialogTimeToWait, setLimitDialogTimeToWait] = useState<string | undefined>(undefined);

  const { currentUser } = useAuth();
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setExtractedData(null);
    setError(null);

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
      let textOutput: string;

      // Try direct text extraction first
      const directText = await extractTextFromPdf(fileBuffer);

      if (directText && directText.length > MIN_TEXT_LENGTH_FOR_TEXT_PDF) {
        textOutput = directText;
        toast({ title: "Text Extracted", description: "Successfully extracted text directly from PDF." });
      } else {
        // If not much text, assume image-based PDF and use OCR AI flow
        toast({ title: "Image PDF Detected", description: "Attempting OCR for text extraction. This may take a moment." });
        const imageDataUri = await convertPdfPageToImageUri(fileBuffer, 1); // OCR first page
        const aiResult = await extractTextFromImageAI({ photoDataUri: imageDataUri });
        if (!aiResult || !aiResult.extractedText) {
          throw new Error("OCR process failed to extract text.");
        }
        textOutput = aiResult.extractedText;
        toast({ title: "OCR Successful", description: "Text extracted using OCR." });
      }
      
      const tableData = parseTextToTableData(textOutput);
      setExtractedData(tableData);
      recordConversion(currentUser ? currentUser.uid : null);
      toast({ title: "Conversion Successful", description: "PDF data processed and ready for preview/download." });

    } catch (err: any) {
      console.error("Processing error:", err);
      setError(err.message || "An unknown error occurred during processing.");
      toast({ variant: "destructive", title: "Processing Error", description: err.message || "Failed to process PDF." });
      setExtractedData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setExtractedData(null);
    setError(null);
  };

  const handleDownload = () => {
    if (extractedData && selectedFile) {
      const fileName = selectedFile.name.replace(/\.pdf$/i, '.xlsx');
      exportToExcel(extractedData, fileName);
      toast({ title: "Download Started", description: `${fileName} is being downloaded.` });
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary">PDF to Excel Converter</CardTitle>
          <CardDescription className="text-center text-lg text-muted-foreground">
            Upload your PDF, preview the extracted data, and download it as an Excel file.
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
            </div>
          )}

          {error && !isLoading && (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error Processing PDF</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {extractedData && !isLoading && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Data Preview</h2>
              <DataPreview data={extractedData} />
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
    </div>
  );
}
