
"use client";

import React, { useCallback } from 'react';
import { useDropzone, type FileWithPath } from 'react-dropzone';
import { UploadCloud, FileText, XCircle, Files } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploaderProps {
  onFilesSelect: (files: File[]) => void;
  selectedFiles: File[];
  clearSelection: () => void;
  disabled?: boolean;
  isSubscribed?: boolean; // Can be used for plan-based limits in future
  dragText?: string;
  orText?: string;
  clickText?: string;
}

const MAX_FILES_LOGGED_IN = 5;

export default function FileUploader({ 
  onFilesSelect, 
  selectedFiles, 
  clearSelection, 
  disabled = false,
  isSubscribed = false, // True for any logged-in user now
  dragText = "Drag & drop a PDF file here",
  orText = "or",
  clickText = "Click to select file"
}: FileUploaderProps) {
  
  const onDrop = useCallback((acceptedFiles: FileWithPath[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      onFilesSelect(acceptedFiles);
    }
  }, [onFilesSelect]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: isSubscribed ? MAX_FILES_LOGGED_IN : 1,
    multiple: isSubscribed,
    disabled,
  });

  const uploaderText = isSubscribed 
    ? dragText.replace('a PDF file', `up to ${MAX_FILES_LOGGED_IN} PDF files`)
    : dragText;
  
  const selectedFileCount = selectedFiles.length;

  if (selectedFileCount > 0 && !isSubscribed) { // Only show this view for single-file uploader
    return (
      <Card className="border-dashed border-2 border-primary/50 bg-primary/5">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
          {selectedFileCount === 1 ? (
             <FileText className="h-12 w-12 text-primary mb-4" />
          ) : (
             <Files className="h-12 w-12 text-primary mb-4" />
          )}
          <p className="text-lg font-medium text-foreground mb-1">
            {selectedFileCount === 1 ? selectedFiles[0].name : `${selectedFileCount} files selected`}
          </p>
          {selectedFileCount === 1 && (
             <p className="text-sm text-muted-foreground mb-4">({(selectedFiles[0].size / 1024).toFixed(2)} KB)</p>
          )}
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
          <p className="text-lg font-semibold text-primary">{uploaderText.replace('&', 'and')} ...</p>
        ) : (
          <>
            <p className="text-lg font-semibold text-foreground">{uploaderText}</p>
            <p className="text-muted-foreground mb-4">{orText}</p>
            <Button type="button" onClick={open} variant="outline" disabled={disabled}>
              {clickText}
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Max file size: 10MB each. PDF only. {isSubscribed && `Max ${MAX_FILES_LOGGED_IN} files.`}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
