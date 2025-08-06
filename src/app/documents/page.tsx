
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
import { FileText, UploadCloud, Trash2, AlertCircle, Package } from 'lucide-react';
import { format } from 'date-fns';

interface StoredDocument {
    _id: string;
    filename: string;
    uploadDate: string;
    length: number; // size in bytes
}

const MAX_FILE_COUNT = 10;

export default function DocumentsPage() {
    const { currentUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [documents, setDocuments] = useState<StoredDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    useEffect(() => {
        if (!authLoading && !currentUser) {
            router.push('/login');
        }
    }, [currentUser, authLoading, router]);

    const fetchDocuments = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        setError(null);
        try {
            const token = await currentUser.getIdToken();
            const response = await fetch('/api/documents', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch documents.');
            }
            const data = await response.json();
            setDocuments(data);
        } catch (err: any) {
            setError(err.message);
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, toast]);
    
    useEffect(() => {
        if (currentUser) {
            fetchDocuments();
        }
    }, [currentUser, fetchDocuments]);
    
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            if (e.target.files[0].size > 10 * 1024 * 1024) { // 10MB limit
                toast({ variant: 'destructive', title: 'File Too Large', description: 'Please select a file smaller than 10MB.' });
                return;
            }
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !currentUser) return;

        if (documents.length >= MAX_FILE_COUNT) {
            toast({ variant: 'destructive', title: 'Limit Reached', description: `You cannot upload more than ${MAX_FILE_COUNT} documents.` });
            return;
        }

        setIsUploading(true);
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

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed.');
            }

            toast({ title: 'Success', description: `${selectedFile.name} uploaded successfully.` });
            setSelectedFile(null); // Reset file input
            fetchDocuments(); // Refresh the list
        } catch (err: any) {
            setError(err.message);
            toast({ variant: 'destructive', title: 'Upload Error', description: err.message });
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleDelete = async (fileId: string) => {
        if (!currentUser) return;
        
        // Optimistic UI update
        const originalDocuments = [...documents];
        setDocuments(docs => docs.filter(d => d._id !== fileId));

        try {
            const token = await currentUser.getIdToken();
            const response = await fetch(`/api/documents?fileId=${fileId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete file.');
            }
            toast({ title: 'Success', description: 'File deleted successfully.' });
        } catch (err: any) {
            setError(err.message);
            toast({ variant: 'destructive', title: 'Deletion Error', description: err.message });
            setDocuments(originalDocuments); // Revert on error
        }
    };

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
                    <CardTitle className="text-3xl font-bold flex items-center"><FileText className="mr-3 text-primary" />Your Stored Documents</CardTitle>
                    <CardDescription>Upload, manage, and view your PDF files here. You can store up to 10 documents.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Upload New Document</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                            <Input
                                id="pdf-upload"
                                type="file"
                                accept="application/pdf"
                                onChange={handleFileChange}
                                className="flex-grow"
                                disabled={isUploading || documents.length >= MAX_FILE_COUNT}
                            />
                            <Button 
                                onClick={handleUpload} 
                                disabled={!selectedFile || isUploading || documents.length >= MAX_FILE_COUNT}
                                className="w-full sm:w-auto"
                            >
                                {isUploading ? <LoadingSpinner message="Uploading..." /> : <><UploadCloud className="mr-2 h-4 w-4" /> Upload File</>}
                            </Button>
                        </CardContent>
                         {documents.length >= MAX_FILE_COUNT && (
                            <CardContent>
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Storage Full</AlertTitle>
                                    <AlertDescription>
                                        You have reached your storage limit of {MAX_FILE_COUNT} documents. Please delete a file to upload a new one.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        )}
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Storage Usage</CardTitle>
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
                                <div className="text-center py-10 text-muted-foreground">
                                    <Package className="mx-auto h-12 w-12 mb-4" />
                                    <p>You haven't uploaded any documents yet.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Filename</TableHead>
                                            <TableHead>Size</TableHead>
                                            <TableHead>Upload Date</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {documents.map((doc) => (
                                            <TableRow key={doc._id}>
                                                <TableCell className="font-medium truncate max-w-xs">{doc.filename}</TableCell>
                                                <TableCell>{(doc.length / 1024 / 1024).toFixed(2)} MB</TableCell>
                                                <TableCell>{format(new Date(doc.uploadDate), 'PPp')}</TableCell>
                                                <TableCell className="text-right">
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
                </CardContent>
            </Card>
        </div>
    );
}
