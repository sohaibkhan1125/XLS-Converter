
"use client";

import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/core/loading-spinner';
import { FileText, UploadCloud, Trash2, AlertCircle, FileSpreadsheet, Download } from 'lucide-react';
import { format } from 'date-fns';

// --- Configuration for the new feature ---
const MAX_FILE_COUNT = 10;
const TIME_WINDOW_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEY_PREFIX = "XLSCONVERT_AWS_DOCS_";

interface StoredDocument {
    id: string; // A unique ID for the file, e.g., filename + timestamp
    filename: string;
    uploadDate: number; // Unix timestamp
    size: number; // size in bytes
    // In a real S3 implementation, you'd store the S3 key/URL here
    // s3_key: string; 
}

// --- Main Component ---
export default function DocumentsPage() {
    const { currentUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [documents, setDocuments] = useState<StoredDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCombining, setIsCombining] = useState(false);

    // --- Local Storage Management for Documents ---

    const getStorageKey = useCallback(() => {
        if (!currentUser) return null;
        return `${STORAGE_KEY_PREFIX}${currentUser.uid}`;
    }, [currentUser]);

    const getStoredDocuments = useCallback((): StoredDocument[] => {
        const key = getStorageKey();
        if (!key || typeof window === 'undefined') return [];
        try {
            const item = localStorage.getItem(key);
            const storedDocs: StoredDocument[] = item ? JSON.parse(item) : [];
            // Filter out files older than 24 hours
            const now = Date.now();
            return storedDocs.filter(doc => (now - doc.uploadDate) < TIME_WINDOW_MS);
        } catch (e) {
            console.error("Failed to parse stored documents:", e);
            return [];
        }
    }, [getStorageKey]);

    const saveStoredDocuments = useCallback((docs: StoredDocument[]) => {
        const key = getStorageKey();
        if (!key || typeof window === 'undefined') return;
        localStorage.setItem(key, JSON.stringify(docs));
        setDocuments(docs); // Update state
    }, [getStorageKey]);

    // --- Component Effects ---
    
    useEffect(() => {
        if (!authLoading && !currentUser) {
            router.push('/login');
        } else if (currentUser) {
            setIsLoading(true);
            const userDocs = getStoredDocuments();
            saveStoredDocuments(userDocs); // This also cleans up old files and updates state
            setIsLoading(false);
        }
    }, [currentUser, authLoading, router, getStoredDocuments, saveStoredDocuments]);
    
    // --- Event Handlers ---

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            if (e.target.files[0].type !== "application/pdf") {
                toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select a PDF file.' });
                return;
            }
            if (e.target.files[0].size > 10 * 1024 * 1024) { // 10MB limit
                toast({ variant: 'destructive', title: 'File Too Large', description: 'Please select a file smaller than 10MB.' });
                return;
            }
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !currentUser) return;

        const currentDocs = getStoredDocuments();
        if (currentDocs.length >= MAX_FILE_COUNT) {
            toast({ variant: 'destructive', title: 'Limit Reached', description: `You cannot upload more than ${MAX_FILE_COUNT} documents in a 24-hour period.` });
            return;
        }

        setIsUploading(true);
        setError(null);
        
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const token = await currentUser.getIdToken();
            const response = await fetch('/api/documents', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Upload failed.');

            // ** AWS Integration Point **
            // The API response should ideally return the S3 key or a unique identifier.
            // For now, we simulate this by creating a new document record.
            const newDoc: StoredDocument = {
                id: `${selectedFile.name}-${Date.now()}`,
                filename: selectedFile.name,
                uploadDate: Date.now(),
                size: selectedFile.size,
            };
            
            saveStoredDocuments([...currentDocs, newDoc]);

            toast({ title: 'Success', description: `${selectedFile.name} uploaded successfully.` });
            setSelectedFile(null);
            if (document.getElementById('pdf-upload')) {
                (document.getElementById('pdf-upload') as HTMLInputElement).value = '';
            }
        } catch (err: any) {
            setError(err.message);
            toast({ variant: 'destructive', title: 'Upload Error', description: err.message });
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleDelete = async (docId: string) => {
        if (!currentUser) return;
        
        // ** AWS Integration Point **
        // Before removing from local storage, you would call your API 
        // to delete the actual file from your S3 bucket.
        // e.g., await fetch(`/api/documents?fileKey=${doc.s3_key}`, { method: 'DELETE' });

        const updatedDocs = documents.filter(d => d.id !== docId);
        saveStoredDocuments(updatedDocs);
        toast({ title: 'Success', description: 'File removed successfully.' });
    };

    const handleCombineAndDownload = async () => {
        if (documents.length === 0) {
            toast({ variant: 'destructive', title: 'No Files', description: 'There are no documents to combine.' });
            return;
        }
        setIsCombining(true);
        toast({ title: 'Processing...', description: 'Combining files into a single Excel sheet. This may take a moment.' });
        
        // ** AWS Integration Point **
        // This part would involve fetching each file from S3, processing it,
        // and combining the data. This is a complex, long-running task.
        // A robust solution would use a backend job queue.
        // For this demo, we'll simulate it with a delay.
        await new Promise(resolve => setTimeout(resolve, 2000));

        // For now, let's just create a dummy Excel file.
        // To make this real, you'd fetch, process, and use the excel-export utility.
        const dummyData = [
            ["Feature", "Status"],
            ["Combine from S3", "Placeholder - Ready for implementation"],
            ["Number of Files", documents.length],
            ["Download Timestamp", new Date().toLocaleString()]
        ];
        const { exportToExcel } = await import('@/lib/excel-export');
        exportToExcel(dummyData, `combined_statements_${Date.now()}.xlsx`);

        setIsCombining(false);
    };

    // --- Render Logic ---

    if (authLoading || !currentUser) {
        return (
            <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
                <LoadingSpinner message="Loading your documents..." />
            </div>
        );
    }
    
    const storagePercentage = (documents.length / MAX_FILE_COUNT) * 100;

    return (
        <div className="space-y-8">
            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold flex items-center"><FileText className="mr-3 text-primary" />Your Document Storage</CardTitle>
                    <CardDescription>
                        Upload up to 10 bank statement PDFs. Files are stored for 24 hours. Combine them into a single Excel file at any time.
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left side: Upload and Actions */}
                <div className="lg:col-span-1 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Upload New Document</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input
                                id="pdf-upload"
                                type="file"
                                accept="application/pdf"
                                onChange={handleFileChange}
                                disabled={isUploading || documents.length >= MAX_FILE_COUNT}
                            />
                            <Button 
                                onClick={handleUpload} 
                                disabled={!selectedFile || isUploading || documents.length >= MAX_FILE_COUNT}
                                className="w-full"
                            >
                                {isUploading ? <LoadingSpinner message="Uploading..." /> : <><UploadCloud className="mr-2 h-4 w-4" /> Upload File</>}
                            </Button>
                             {documents.length >= MAX_FILE_COUNT && (
                                <Alert variant="destructive" className="text-xs">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Storage Full</AlertTitle>
                                    <AlertDescription>
                                        Delete a file to upload a new one.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Button 
                                onClick={handleCombineAndDownload} 
                                disabled={isCombining || documents.length === 0}
                                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                            >
                                {isCombining ? <LoadingSpinner message="Combining..."/> : <><Download className="mr-2 h-4 w-4" /> Combine & Download Excel</>}
                            </Button>
                             <p className="text-xs text-muted-foreground mt-2">Combine all currently stored files into one Excel workbook.</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Right side: Stored Files */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Stored Files (Last 24 Hours)</CardTitle>
                            <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                                <span>{documents.length} / {MAX_FILE_COUNT} files used</span>
                                <span>{storagePercentage.toFixed(0)}%</span>
                            </div>
                            <Progress value={storagePercentage} className="w-full mt-2" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <LoadingSpinner message="Fetching documents..." />
                            ) : error ? (
                                <Alert variant="destructive">
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            ) : documents.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                                    <FileSpreadsheet className="mx-auto h-12 w-12 mb-4" />
                                    <p>Your document storage is empty.</p>
                                    <p className="text-sm">Upload a file to get started.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Filename</TableHead>
                                                <TableHead>Size</TableHead>
                                                <TableHead>Uploaded</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {documents.map((doc) => (
                                                <TableRow key={doc.id}>
                                                    <TableCell className="font-medium truncate max-w-xs">{doc.filename}</TableCell>
                                                    <TableCell>{(doc.size / 1024 / 1024).toFixed(2)} MB</TableCell>
                                                    <TableCell>{format(new Date(doc.uploadDate), 'p')}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="destructive" size="icon" onClick={() => handleDelete(doc.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                            <span className="sr-only">Delete</span>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

