
"use client";

import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy, TextItem } from 'pdfjs-dist/types/src/display/api';
import type { StructuredPdfDataOutput } from '@/ai/flows/structure-pdf-data-flow';

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


export function formatStructuredDataForExcel(structuredData: StructuredPdfDataOutput | null): string[][] {
  if (!structuredData) {
    return [["AI processing failed to return data."]];
  }

  const excelData: (string | number | undefined)[][] = [];
  const { header, transactions, summary } = structuredData;

  // Add header information
  if (header) {
    if (header.bankName) excelData.push(['Bank Name', header.bankName]);
    if (header.bankAddress) excelData.push(['Bank Address', header.bankAddress]);
    if (header.accountHolder) excelData.push(['Account Holder', header.accountHolder]);
    if (header.accountNumber) excelData.push(['Account Number', header.accountNumber]);
    if (header.accountType) excelData.push(['Account Type', header.accountType]);
    if (header.statementPeriod) excelData.push(['Statement Period', header.statementPeriod]);
  }

  // Add a spacer row
  if (excelData.length > 0) {
    excelData.push([]);
  }

  // Add opening balance from summary
  if (summary?.openingBalance !== undefined) {
      excelData.push(['Opening Balance', '', '', '', summary.openingBalance]);
      excelData.push([]); // Add another spacer
  }

  // Add transaction table if it exists
  if (transactions && transactions.length > 0) {
    const transactionHeaders = ['Date', 'Description / Particulars', 'Debit', 'Credit', 'Balance'];
    excelData.push(transactionHeaders);

    const dataRows = transactions.map(t => [
      t.date || '',
      t.description || '',
      t.debit, // Keep as number for Excel
      t.credit, // Keep as number for Excel
      t.balance, // Keep as number for Excel
    ]);
    excelData.push(...dataRows);
  }

  // Add a spacer row before summary totals
  if (summary && (summary.totalDebits !== undefined || summary.totalCredits !== undefined || summary.closingBalance !== undefined)) {
      excelData.push([]);
  }

  // Add summary totals
  if (summary) {
      if(summary.totalDebits !== undefined || summary.totalCredits !== undefined) {
          const totalsRow = [
              'Totals', // Label in the first column
              '',       // Empty description
              summary.totalDebits,
              summary.totalCredits,
              '' // No balance for total line
          ];
          excelData.push(totalsRow);
      }
      if (summary.closingBalance !== undefined) {
          excelData.push(['Closing Balance', '', '', '', summary.closingBalance]);
      }
  }


  if (excelData.length === 0) {
     return [["No financial data could be extracted from the document."]];
  }
  
  // Convert all cells to string for the final output array type, handling undefined
  return excelData.map(row => row.map(cell => (cell === undefined || cell === null) ? '' : String(cell)));
}


/**
 * @deprecated This function is too simplistic for complex PDF layouts. 
 * Use AI-driven structuring (structurePdfDataFlow) and formatStructuredDataForExcel instead.
 */
export function parseTextToTableData(text: string): string[][] {
  console.warn("parseTextToTableData is deprecated. Use AI-driven structuring.");
  if (!text) return [];

  const lines = text.split('\n').filter(line => line.trim() !== '');
  const table: string[][] = [];

  for (const line of lines) {
    const normalizedLine = line.replace(/\t/g, '    '); 
    const cells = normalizedLine.split(/ {2,}/).map(cell => cell.trim()).filter(cell => cell !== '');
    
    if (cells.length > 0) { 
      table.push(cells);
    }
  }
  
  if (table.every(row => row.length === 1) && table.length > 1) {
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

  return table.length > 0 ? table : [[text]]; 
}
