
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
  if (!structuredData || !structuredData.blocks || structuredData.blocks.length === 0) {
    return [["No structured data found or AI processing failed."]];
  }

  const excelRows: string[][] = [];
  let firstBlock = true;

  for (const block of structuredData.blocks) {
    if (!firstBlock) {
      // Add a spacer row between blocks, unless the block itself is a spacer
      if (block.type !== "spacer") {
        excelRows.push([]); // Empty row for spacing
      }
    }
    firstBlock = false;

    if (block.title) {
      excelRows.push([block.title]);
      // Potentially add an empty row after a title if it's not immediately followed by its content type
      // This depends on how the AI structures titles vs content
    }

    switch (block.type) {
      case "documentTitle":
      case "header":
      case "paragraph":
        if (block.lines && block.lines.length > 0) {
          block.lines.forEach(line => excelRows.push([line]));
        }
        break;
      
      case "keyValueList":
        if (block.items && block.items.length > 0) {
          block.items.forEach(item => excelRows.push([item.key, item.value]));
        }
        break;

      case "table":
        if (block.table) {
          if (block.table.headers && block.table.headers.length > 0) {
            excelRows.push(block.table.headers);
          }
          if (block.table.rows && block.table.rows.length > 0) {
            block.table.rows.forEach(row => excelRows.push(row));
          }
        }
        break;
      
      case "spacer":
        excelRows.push([]); // Explicit spacer
        break;
        
      default:
        // Handle unknown block type if necessary, or ignore
        console.warn("Unknown block type in structured data:", block.type);
        break;
    }
  }
  
  if (excelRows.length === 0) {
    return [["The PDF content was processed but resulted in no displayable data for Excel."]];
  }

  return excelRows;
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
