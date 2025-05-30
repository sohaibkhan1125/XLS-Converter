"use client";

import { useCallback } from 'react';
import { useDropzone, type FileWithPath } from 'react-dropzone';
import { UploadCloud, FileText, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  clearSelection: () => void;
  disabled?: boolean;
}

export default function FileUploader({ onFileSelect, selectedFile, clearSelection, disabled = false }: FileUploaderProps) {
  const onDrop = useCallback((acceptedFiles: FileWithPath[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    multiple: false,
    disabled,
  });

  if (selectedFile) {
    return (
      <Card className="border-dashed border-2 border-primary/50 bg-primary/5">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
          <FileText className="h-12 w-12 text-primary mb-4" />
          <p className="text-lg font-medium text-foreground mb-1">{selectedFile.name}</p>
          <p className="text-sm text-muted-foreground mb-4">({(selectedFile.size / 1024).toFixed(2)} KB)</p>
          <Button onClick={clearSelection} variant="destructive" size="sm" disabled={disabled}>
            <XCircle className="mr-2 h-4 w-4" /> Clear Selection
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      {...getRootProps()} 
      className={`border-dashed border-2 hover:border-primary transition-colors cursor-pointer 
                  ${isDragActive ? 'border-primary bg-primary/10' : 'border-input'}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <CardContent className="p-10 flex flex-col items-center justify-center text-center min-h-[200px]">
        <input {...getInputProps()} />
        <UploadCloud className={`h-12 w-12 mb-4 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
        {isDragActive ? (
          <p className="text-lg font-semibold text-primary">Drop the PDF file here ...</p>
        ) : (
          <>
            <p className="text-lg font-semibold text-foreground">Drag & drop a PDF file here</p
            <p className="text-muted-foreground mb-4">or</p>
            <Button type="button" onClick={open} variant="outline" disabled={disabled}>
              Click to select file
            </Button>
            <p className="text-xs text-muted-foreground mt-4">Max file size: 10MB. PDF only.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
