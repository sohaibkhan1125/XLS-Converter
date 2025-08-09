
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
import { FileText, UploadCloud, Trash2, AlertCircle, FileSpreadsheet, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';

const MAX_FILE_COUNT = 10;

interface StoredDocument {
    _id: string;
    fileName: string;
    cloudinaryUrl: string;
    uploadedAt: string; // ISO string date
    userId: string;
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

    const fetchDocuments = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        setError(null);
        try {
            const idToken = await currentUser.getIdToken();
            const response = await fetch('/api/documents', {
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch documents.');
            }
            const userDocs = await response.json();
            setDocuments(userDocs);
        } catch (err: any) {
            setError(err.message);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your documents.' });
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, toast]);

    useEffect(() => {
        if (!authLoading && !currentUser) {
            router.push('/login?redirect=/documents');
        } else if (currentUser) {
            fetchDocuments();
        }
    }, [currentUser, authLoading, router, fetchDocuments]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== "application/pdf") {
                toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select a PDF file.' });
                return;
            }
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                toast({ variant: 'destructive', title: 'File Too Large', description: 'Please select a file smaller than 10MB.' });
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !currentUser) return;
        
        if (documents.length >= MAX_FILE_COUNT) {
            toast({ variant: 'destructive', title: 'Limit Reached', description: `You can store a maximum of ${MAX_FILE_COUNT} files.` });
            return;
        }

        setIsUploading(true);
        setError(null);
        
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const idToken = await currentUser.getIdToken();
            const response = await fetch('/api/documents', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${idToken}` },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            toast({ title: 'Success', description: `${selectedFile.name} uploaded successfully.` });
            setSelectedFile(null); // Clear selection
             const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
             if (fileInput) fileInput.value = '';
            await fetchDocuments(); // Refresh the list
        } catch (err: any) {
            setError(err.message);
            toast({ variant: 'destructive', title: 'Upload Error', description: err.message });
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleDelete = async (docId: string) => {
        if (!currentUser) return;
        
        const originalDocuments = [...documents];
        setDocuments(docs => docs.filter(d => d._id !== docId)); // Optimistic UI update

        try {
            const idToken = await currentUser.getIdToken();
            const response = await fetch('/api/documents', {
                method: 'DELETE',
                headers: { 
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ docId }),
            });

            if (!response.ok) {
                 const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete file.');
            }

            toast({ title: 'Success', description: 'File removed successfully.' });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not remove file. Please try again.'});
            setDocuments(originalDocuments); // Revert UI on error
        }
    };

    if (authLoading || (!currentUser && !authLoading)) {
        return (
            <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
                <LoadingSpinner message="Verifying access..." />
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
                        Upload up to {MAX_FILE_COUNT} PDF files. Files are automatically removed after 24 hours.
                    </CardDescription>
                </CardHeader>
            </Card>

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
                                Delete a file or wait for older files to expire to upload a new one.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

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
                                        <TableHead>Uploaded</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documents.map((doc) => (
                                        <TableRow key={doc._id}>
                                            <TableCell className="font-medium truncate max-w-xs">{doc.fileName}</TableCell>
                                            <TableCell>{format(new Date(doc.uploadedAt), 'PP p')}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                 <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    onClick={() => window.open(doc.cloudinaryUrl, '_blank')}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    <span className="sr-only">View</span>
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    asChild
                                                >
                                                   <a href={`${doc.cloudinaryUrl}?fl_attachment`} download={doc.fileName}>
                                                        <Download className="h-4 w-4" />
                                                        <span className="sr-only">Download</span>
                                                   </a>
                                                </Button>
                                                <Button variant="destructive" size="icon" onClick={() => handleDelete(doc._id)}>
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
    );
}
