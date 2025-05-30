"use client";

import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy, TextItem } from 'pdfjs-dist/types/src/display/api';

// Dynamically import and set the workerSrc.
// This is crucial for pdfjs-dist to work correctly in Next.js.
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

export async function extractTextFromPdf(fileBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page: PDFPageProxy = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => (item as TextItem).str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText.trim();
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF.");
  }
}

export async function convertPdfPageToImageUri(fileBuffer: ArrayBuffer, pageNumber: number = 1): Promise<string> {
  try {
    const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new Error(`Page number ${pageNumber} is out of range (1-${pdf.numPages}).`);
    }

    const page: PDFPageProxy = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 }); // Adjust scale as needed for quality/performance

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error("Could not get canvas context.");
    }
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;
    
    // Return as PNG data URI. Could also use 'image/jpeg'.
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error("Error converting PDF page to image:", error);
    throw new Error("Failed to convert PDF page to image.");
  }
}

// Basic heuristic parser for text to table data
export function parseTextToTableData(text: string): string[][] {
  if (!text) return [];

  const lines = text.split('\n').filter(line => line.trim() !== '');
  const table: string[][] = [];

  for (const line of lines) {
    // Try splitting by multiple spaces (2 or more) or tabs
    // Replace tabs with a common delimiter (e.g., 4 spaces) to normalize
    const normalizedLine = line.replace(/\t/g, '    '); 
    const cells = normalizedLine.split(/ {2,}/).map(cell => cell.trim()).filter(cell => cell !== '');
    
    // If a line results in at least 2 cells, consider it part of a table.
    // This is a very basic heuristic.
    if (cells.length > 0) { // Changed from >1 to >0 to include single column data
      table.push(cells);
    }
  }
  
  // Further improvement: if all rows have 1 cell, it might not be a table.
  // But for now, this is a starting point.
  // If no rows have multiple cells, maybe split by single space for some lines
  if (table.every(row => row.length === 1) && table.length > 1) {
    // Re-process if it looks like a list of items rather than a structured table
    // For example, if lines are "Value1 Value2 Value3"
    const reprocessedTable: string[][] = [];
    for (const line of lines) {
        const cells = line.split(/\s+/).map(cell => cell.trim()).filter(cell => cell !== '');
        if (cells.length > 0) {
            reprocessedTable.push(cells);
        }
    }
    if(reprocessedTable.length > 0 && !reprocessedTable.every(row => row.length === 1)) {
        return reprocessedTable;
    }
  }


  return table.length > 0 ? table : [[text]]; // If no table structure found, return the whole text as a single cell
}
