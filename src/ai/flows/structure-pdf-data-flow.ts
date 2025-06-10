
'use server';
/**
 * @fileOverview Analyzes raw PDF text from bank statements and structures it into a hierarchical format
 * suitable for conversion to a well-formatted Excel file.
 *
 * - structurePdfData - A function that processes text to identify headers, paragraphs, tables, etc.
 * - StructurePdfDataInput - The input type for the structurePdfData function.
 * - StructuredPdfDataOutput - The return type (structured data) for the structurePdfData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TableSchema = z.object({
  headers: z.array(z.string()).optional().describe("Column headers for the table. Infer if not explicit."),
  rows: z.array(z.array(z.string())).describe("Data rows, where each inner array is a row of cells."),
});

const ContentBlockSchema = z.object({
  type: z.enum(["documentTitle", "header", "paragraph", "table", "keyValueList", "spacer"])
    .describe("Type of content block: documentTitle (for the main title), header (for section titles or prominent text), paragraph (for general text), table, keyValueList (e.g., 'Account Name: John Doe'), or spacer (to indicate a visual break)."),
  title: z.string().optional().describe("Optional title for this block (e.g., 'Account Details', 'Transaction History')."),
  lines: z.array(z.string()).optional().describe("Array of text lines (for header or paragraph types). Join wrapped lines intelligently."),
  items: z.array(z.object({ key: z.string().describe("The key in a key-value pair."), value: z.string().describe("The value in a key-value pair.") })).optional().describe("For key-value lists."),
  table: TableSchema.optional().describe("Table data if the block is a table."),
});

const StructuredPdfDataOutputSchema = z.object({
  blocks: z.array(ContentBlockSchema).describe("Array of content blocks representing the structured PDF content. The order of blocks should reflect the visual order in the PDF."),
}).describe("Structured representation of the PDF content, designed to preserve layout and hierarchy for Excel export.");
export type StructuredPdfDataOutput = z.infer<typeof StructuredPdfDataOutputSchema>;

const StructurePdfDataInputSchema = z.object({
  rawText: z.string().describe("The raw text extracted from the PDF document, potentially including OCR output."),
});
export type StructurePdfDataInput = z.infer<typeof StructurePdfDataInputSchema>;


export async function structurePdfData(input: StructurePdfDataInput): Promise<StructuredPdfDataOutput> {
  return structurePdfDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'structurePdfDataPrompt',
  input: {schema: StructurePdfDataInputSchema},
  output: {schema: StructuredPdfDataOutputSchema},
  prompt: `You are an expert data extraction and structuring assistant. Your task is to analyze the provided raw text from a PDF bank statement and convert it into a structured JSON format, specifically adhering to the 'StructuredPdfDataOutputSchema'. The goal is to represent the PDF's content in a way that can be easily converted into a well-formatted Excel sheet, preserving the visual layout and hierarchy of the original document, and ensuring it's usable for financial or accounting purposes.

**Bank Statement Specific Instructions:**
When processing the bank statement, ensure the following information is captured and structured appropriately within the 'blocks' array:
1.  **Bank Name**
2.  **Bank Address**
3.  **Account Holder Name**
4.  **Account Number**
5.  **Account Title** (if distinct from Account Holder Name)
These items can be represented as 'keyValueList' blocks or individual 'header'/'paragraph' blocks based on their presentation in the PDF.

6.  **Transactions Table**: Identify the main transactions table. This table should be represented as a 'table' type block with the following headers in this specific order:
    *   **Date**
    *   **Description / Particulars**
    *   **Withdrawal**
    *   **Deposit**
    *   **Balance**
    Ensure data under these columns is correctly aligned and rows are cleanly separated. Do not merge all data into a single row or cell; use proper table structure for transactions.

**General Structuring Rules (Follow Meticulously):**

1.  **Block Identification**: Segment the text into logical blocks. Each block should correspond to a distinct visual element or section in the PDF (e.g., the bank's name and address at the top, a section for account holder details, a table of transactions, a summary section).
2.  **Block Typing**: For each identified block, assign one of the following types:
    *   \\\`documentTitle\\\`: For the main title of the document (e.g., "Bank Statement", "Account Statement").
    *   \\\`header\\\`: For section titles (e.g., "Account Summary", "Transaction Details") or prominent standalone text that acts as a heading.
    *   \\\`paragraph\\\`: For blocks of free-form text.
    *   \\\`table\\\`: For structured tabular data, especially the transactions table.
    *   \\\`keyValueList\\\`: For lists of label-value pairs (e.g., "Account Number: 12345", "Statement Date: 01/01/2024").
    *   \\\`spacer\\\`: Use this type to represent significant visual gaps or separations between unrelated blocks if it helps maintain the layout. Generate a block with just \\\`{"type": "spacer"}\\\`.
3.  **Line Handling**:
    *   For \\\`header\\\` and \\\`paragraph\\\` types, store the content in the \\\`lines\\\` array.
    *   Intelligently join lines that are clearly wrapped continuations of a single sentence or data entry. Do not join lines that represent distinct items or rows.
    *   Preserve meaningful line breaks that separate distinct pieces of information within a header or paragraph block.
4.  **Table Structuring (\\\`table\\\` type)**:
    *   For the main transactions table, use the headers: "Date", "Description / Particulars", "Withdrawal", "Deposit", "Balance". For other tables, identify column \\\`headers\\\`. If headers are not explicit, try to infer them or leave the \\\`headers\\\` array empty/omitted.
    *   Extract data \\\`rows\\\`. Each inner array in \\\`rows\\\` should represent one row of the table, with cell values as strings.
    *   Ensure data alignment: values must correspond to the correct columns. Empty cells should be represented as empty strings or null.
    *   Handle multi-line text within a single PDF table cell: combine it into a single string for the Excel cell, using spaces or newlines (\\n) if appropriate for readability within that cell.
5.  **Key-Value Lists (\\\`keyValueList\\\` type)**:
    *   Extract pairs into the \\\`items\\\` array, where each item is an object with \\\`key\\\` and \\\`value\\\` strings.
    *   Example: "Account Holder: John Doe" becomes \\\`{ key: "Account Holder", value: "John Doe" }\\\`.
6.  **Titles**: If a block has an obvious title (e.g., "Customer Information"), capture it in the \\\`title\\\` field of the block. The document's main title (like "Bank Statement") should use the \\\`documentTitle\\\` type.
7.  **Order**: The \\\`blocks\\\` array must maintain the top-to-bottom visual order of elements as they appear in the PDF.
8.  **Text Cleaning**: Remove excessive whitespace. Correct obvious OCR errors if confident (e.g., "Acc0unt" to "Account").
9.  **Completeness**: Try to capture all meaningful textual content from the PDF. The output should be clean, readable, and usable for financial or accounting purposes.

**Input Text**:
{{{rawText}}}

**Output JSON (strictly follow the 'StructuredPdfDataOutputSchema')**:
`,
});

const structurePdfDataFlow = ai.defineFlow(
  {
    name: 'structurePdfDataFlow',
    inputSchema: StructurePdfDataInputSchema,
    outputSchema: StructuredPdfDataOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to structure PDF data. Output was null.");
    }
    // Basic validation, though Zod handles schema validation
    if (!output.blocks || !Array.isArray(output.blocks)) {
        console.warn("AI output for structured data was missing blocks or blocks was not an array. Returning empty blocks.", output);
        return { blocks: [] };
    }
    return output;
  }
);

