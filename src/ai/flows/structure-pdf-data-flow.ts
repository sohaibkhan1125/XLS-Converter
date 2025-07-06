
'use server';
/**
 * @fileOverview Analyzes raw PDF text from bank statements and extracts structured data.
 *
 * - structurePdfData - A function that processes text to extract bank statement data.
 * - StructurePdfDataInput - The input type for the structurePdfData function.
 * - StructuredPdfDataOutput - The return type for the structurePdfData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';


const StatementHeaderSchema = z.object({
  bankName: z.string().optional().describe("The name of the bank."),
  bankAddress: z.string().optional().describe("The address of the bank branch."),
  accountHolder: z.string().optional().describe("The name of the account holder."),
  accountNumber: z.string().optional().describe("The bank account number."),
  statementPeriod: z.string().optional().describe("The period the statement covers, e.g., '01/01/2023 - 31/01/2023'."),
}).describe("Essential header information from the bank statement.");

const TransactionSchema = z.object({
  date: z.string().describe("The date of the transaction in YYYY-MM-DD format."),
  description: z.string().describe("The full description, narration, or particulars of the transaction."),
  debit: z.number().optional().describe("The withdrawal amount (as a positive number)."),
  credit: z.number().optional().describe("The deposit amount (as a positive number)."),
  balance: z.number().optional().describe("The running balance after the transaction."),
}).describe("A single transaction line item.");

const StructuredPdfDataOutputSchema = z.object({
  header: StatementHeaderSchema,
  transactions: z.array(TransactionSchema).describe("An array of all financial transactions found on the statement."),
});
export type StructuredPdfDataOutput = z.infer<typeof StructuredPdfDataOutputSchema>;


const StructurePdfDataInputSchema = z.object({
  rawText: z.string().describe("The raw text extracted from the PDF document, potentially including OCR output."),
});
export type StructurePdfDataInput = z.infer<typeof StructurePdfDataInputSchema>;


export async function structurePdfData(input: StructurePdfDataInput): Promise<StructuredPdfDataOutput> {
  return structurePdfDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractBankStatementPrompt',
  input: {schema: StructurePdfDataInputSchema},
  output: {schema: StructuredPdfDataOutputSchema},
  prompt: `You are an expert financial data extraction AI. Your task is to accurately extract and convert the important financial data from the provided bank statement text into a clean and well-structured JSON format, ready for Excel conversion. The text comes from a PDF and may have been processed with OCR, so it might contain minor layout inconsistencies.

**Extraction Rules:**

1.  **Focus only on essential information.** Ignore all decorative or unnecessary data like marketing messages, general advice, terms & conditions, page numbers, or any other text not relevant to the account details or transactions.

2.  **Extract Key Metadata:** Identify and extract the following details into the 'header' section of the JSON output:
    *   Bank Name
    *   Bank Branch Address
    *   Account Holder's Name
    *   Account Number
    *   Statement Period (if available)

3.  **Extract Transaction Data:** Identify the main transaction table and extract each transaction into the 'transactions' array. Each transaction object must have the following fields:
    *   \`date\`: The date of the transaction.
    *   \`description\`: The full transaction description or narration.
    *   \`debit\`: The withdrawal amount (money out). This must be a positive number.
    *   \`credit\`: The deposit amount (money in). This must be a positive number.
    *   \`balance\`: The running balance after the transaction.

**Formatting Requirements:**

*   **Clean and Consistent Rows:** Each transaction must be a separate object in the JSON array. Do not merge multiple transactions.
*   **Accurate Column Mapping:** Ensure data is accurately mapped. Do not mix multiple pieces of data (e.g., date and description) into one field.
*   **Handle Missing Data:** If a specific field for a transaction is not present (e.g., balance is missing for one row), leave that field null or omit it, but keep the structure for other transactions intact.
*   **Intelligent Section Skipping:** The AI should be intelligent enough to skip irrelevant sections (like summary boxes) and focus only on the detailed transaction list.

**Objective:** The final JSON output should be neat, usable, and structured logically, so it can be easily converted into an Excel file for financial review or import into accounting tools.

Now, process the following text from the bank statement.

**Input Text:**
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
      throw new Error("AI failed to structure transaction data. Output was null.");
    }
    // Ensure the basic structure is present to avoid downstream errors
    if (!output.header) {
      console.warn("AI output was missing 'header'. Initializing empty header.");
      output.header = {};
    }
     if (!output.transactions || !Array.isArray(output.transactions)) {
        console.warn("AI output was missing 'transactions' array. Initializing empty list.");
        output.transactions = [];
    }
    return output;
  }
);
