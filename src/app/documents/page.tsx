
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, FileText, Upload, Trash2, Download, CirclePlay, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import LoadingSpinner from '@/components/core/loading-spinner';
import FileUploader from '@/components/core/file-uploader';

import {
  getUserDocuments,
  deleteUserDocument,
  uploadUserDocuments,
  type UserDocument,
  downloadFileFromStorage,
} from '@/lib/firebase-document-service';

import { extractTextFromPdf, convertAllPdfPagesToImageUris, formatStructuredDataForExcel } from '@/lib/pdf-utils';
import { extractTextFromImage as extractTextFromImageAI } from '@/ai/flows/extract-text-from-image';
import { structurePdfData as structurePdfDataAI, type StructuredPdfDataOutput, type Transaction } from '@/ai/flows/structure-pdf-data-flow';
import { exportToExcel } from '@/lib/excel-export';
import { useLanguage } from '@/context/language-context';

const MIN_TEXT_LENGTH_FOR_TEXT_PDF = 100;
const MAX_FILES_PER_UPLOAD = 5;

export default function DocumentsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { getTranslation } = useLanguage();

  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [docToDelete, setDocToDelete] = useState<UserDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  const fetchDocuments = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const userDocs = await getUserDocuments(currentUser.uid);
      setDocuments(userDocs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load your documents.' });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFilesUpload = async (files: File[]) => {
    if (!currentUser || files.length === 0) return;

    if (files.length > MAX_FILES_PER_UPLOAD) {
      toast({
        variant: 'destructive',
        title: 'Too Many Files',
        description: `You can upload a maximum of ${MAX_FILES_PER_UPLOAD} files at a time.`,
      });
      return;
    }

    setIsUploading(true);
    try {
      await uploadUserDocuments(currentUser.uid, files);
      toast({ title: 'Upload Successful', description: `${files.length} document(s) have been uploaded.` });
      fetchDocuments(); // Refresh the list
      setShowUploadDialog(false); // Close dialog on success
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteClick = (doc: UserDocument) => {
    setDocToDelete(doc);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!docToDelete || !currentUser) return;
    setIsDeleting(true);
    try {
      await deleteUserDocument(currentUser.uid, docToDelete.id, docToDelete.storagePath);
      toast({ title: 'Document Deleted', description: `"${docToDelete.fileName}" has been deleted.` });
      setDocuments(prev => prev.filter(d => d.id !== docToDelete.id));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Could not delete document: ${error.message}` });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDocToDelete(null);
    }
  };
  
  const processAndDownload = async (docsToProcess: UserDocument[]) => {
    if (docsToProcess.length === 0 || !currentUser) return;
    
    setIsProcessing(true);
    let allTransactions: Transaction[] = [];

    try {
      for (let i = 0; i < docsToProcess.length; i++) {
        const doc = docsToProcess[i];
        const progressPrefix = docsToProcess.length > 1 ? `(File ${i + 1}/${docsToProcess.length}) ` : '';
        setProcessingStatus(`${progressPrefix}Downloading "${doc.fileName}"...`);

        const fileBuffer = await downloadFileFromStorage(doc.storagePath);
        
        setProcessingStatus(`${progressPrefix}Extracting text from "${doc.fileName}"...`);
        const directText = await extractTextFromPdf(fileBuffer);
        let rawTextOutput: string;

        if (directText && directText.length > MIN_TEXT_LENGTH_FOR_TEXT_PDF) {
          rawTextOutput = directText;
        } else {
          setProcessingStatus(`${progressPrefix}Scanning pages of "${doc.fileName}" with OCR...`);
          const imageDataUris = await convertAllPdfPagesToImageUris(fileBuffer);
          let ocrTextFromAllPages = '';
          for (let pageIndex = 0; pageIndex < imageDataUris.length; pageIndex++) {
              setProcessingStatus(`${progressPrefix}"${doc.fileName}" - OCR on page ${pageIndex + 1}/${imageDataUris.length}...`);
              const aiOcrResult = await extractTextFromImageAI({ photoDataUri: imageDataUris[pageIndex] });
              if (aiOcrResult?.extractedText) ocrTextFromAllPages += aiOcrResult.extractedText + '\n\n';
          }
          if (!ocrTextFromAllPages) throw new Error(`OCR failed to extract text from ${doc.fileName}.`);
          rawTextOutput = ocrTextFromAllPages;
        }
        
        setProcessingStatus(`${progressPrefix}Structuring data from "${doc.fileName}"...`);
        const structuredDataResult = await structurePdfDataAI({ rawText: rawTextOutput });
        
        if (structuredDataResult?.transactions) {
          allTransactions.push(...structuredDataResult.transactions);
        }
      }

      if (allTransactions.length === 0) throw new Error("No transactions could be extracted.");

      setProcessingStatus("Aggregating data for Excel...");
      allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const excelData = formatStructuredDataForExcel({ transactions: allTransactions });
      
      const excelFileName = docsToProcess.length > 1 ? 'consolidated_statements.xlsx' : `${docsToProcess[0].fileName.replace('.pdf', '')}.xlsx`;
      exportToExcel(excelData, excelFileName);

      toast({ title: 'Conversion Successful', description: 'Your Excel file is downloading.' });

    } catch (err: any) {
      console.error("Processing error:", err);
      toast({ variant: 'destructive', title: 'Processing Error', description: err.message, duration: 9000 });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };


  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <LoadingSpinner message="Loading your documents..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-3xl font-bold text-primary flex items-center gap-2">
              <FileText /> My Documents
            </CardTitle>
            <CardDescription>Upload, manage, and convert your PDF statements.</CardDescription>
          </div>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" /> Upload New Documents
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload PDF Statements</DialogTitle>
              </DialogHeader>
              {isUploading ? (
                 <div className="py-10"><LoadingSpinner message="Uploading..." /></div>
              ) : (
                <FileUploader
                  onFilesSelect={handleFilesUpload}
                  selectedFiles={[]}
                  clearSelection={() => {}}
                  isSubscribed={true} // Allow multiple files
                  dragText={`Drag & drop up to ${MAX_FILES_PER_UPLOAD} PDF files here`}
                  clickText="Click to select files"
                />
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isProcessing ? (
             <div className="text-center py-10"><LoadingSpinner message={processingStatus || 'Processing documents...'} /></div>
          ) : documents.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-lg text-muted-foreground">You haven&apos;t uploaded any documents yet.</p>
              <p className="text-sm text-muted-foreground">Click the &quot;Upload&quot; button to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Date Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.fileName}</TableCell>
                      <TableCell>{(doc.fileSize / 1024).toFixed(2)} KB</TableCell>
                      <TableCell>{format(new Date(doc.uploadedAt), 'PPp')}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => processAndDownload([doc])}>
                              <Download className="mr-2 h-4 w-4" /> Convert to Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteClick(doc)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {documents.length > 0 && !isProcessing && (
           <CardContent className="border-t pt-6 text-center">
             <Button size="lg" onClick={() => processAndDownload(documents)} disabled={isProcessing}>
              {isProcessing ? (
                 <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <CirclePlay className="mr-2 h-5 w-5" />
              )}
               Convert All ({documents.length}) to One Excel File
            </Button>
           </CardContent>
        )}
      </Card>
      
       <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the file &quot;{docToDelete?.fileName}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {isDeleting ? <LoadingSpinner message="Deleting..." /> : "Yes, delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
