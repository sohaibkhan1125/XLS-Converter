
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
  accountType: z.string().optional().describe("The type of the account, e.g., 'Checking', 'Savings'."),
  statementPeriod: z.string().optional().describe("The period the statement covers, e.g., '01/01/2023 - 31/01/2023'."),
}).describe("Key metadata from the top of the bank statement.");

const TransactionSchema = z.object({
  date: z.string().describe("The date of the transaction in YYYY-MM-DD format."),
  description: z.string().describe("The full description, narration, or particulars of the transaction."),
  debit: z.number().optional().describe("The withdrawal amount (money out), as a positive number."),
  credit: z.number().optional().describe("The deposit amount (money in), as a positive number."),
  balance: z.number().optional().describe("The running balance after the transaction."),
}).describe("A single transaction line item.");

const StatementSummarySchema = z.object({
    openingBalance: z.number().optional().describe("The opening balance at the start of the statement period."),
    closingBalance: z.number().optional().describe("The closing balance at the end of the statement period."),
    totalDebits: z.number().optional().describe("The sum of all debit transactions for the period, if available on the statement."),
    totalCredits: z.number().optional().describe("The sum of all credit transactions for the period, if available on the statement."),
}).describe("Summary figures for the statement period.");


const StructuredPdfDataOutputSchema = z.object({
  header: StatementHeaderSchema,
  transactions: z.array(TransactionSchema).describe("An array of all financial transactions found on the statement."),
  summary: StatementSummarySchema.optional().describe("Optional summary of the statement's totals."),
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
  prompt: `You are an expert financial data extraction AI. Your task is to accurately extract and convert the important financial data from the provided bank statement text into a clean and well-structured JSON format. The text comes from a PDF and may have been processed with OCR, so it might contain minor layout inconsistencies.

**Extraction Rules:**

1.  **Extract Header Metadata:** At the top of the document, find and extract the following details into the 'header' section of the JSON output:
    *   Bank Name (\`bankName\`)
    *   Branch Address (\`bankAddress\`)
    *   Account Holder's Name (\`accountHolder\`)
    *   Account Number (\`accountNumber\`)
    *   Account Type (\`accountType\`)
    *   Statement Period / Date Range (\`statementPeriod\`)

2.  **Extract Transaction Table:** Locate the main table of transactions. For each transaction row, you must extract the following data into the 'transactions' array. Each field must be populated if the data exists on the line.
    *   **Column A: \`date\`**: The date of the transaction.
    *   **Column B: \`description\`**: The full transaction description or narration.
    *   **Column C: \`debit\`**: The withdrawal amount (money out). This must be a positive number.
    *   **Column D: \`credit\`**: The deposit amount (money in). This must be a positive number.
    *   **Column E: \`balance\`**: The running balance after the transaction. **It is critical to extract the running balance for each transaction if it is present in the text.** Do not skip this field.

3.  **Extract Summary Figures:** Find the summary section and extract these values into the 'summary' object:
    *   Opening Balance (\`openingBalance\`)
    *   Closing Balance (\`closingBalance\`)
    *   Total Debits / Total money out (\`totalDebits\`)
    *   Total Credits / Total money in (\`totalCredits\`)

4.  **Focus on Clean Data:**
    *   Ignore all decorative or unnecessary text like marketing messages, general advice, terms & conditions, page numbers, or any text not relevant to the account details, transactions, or summary.
    *   Do not merge multiple pieces of data (e.g., date and description) into one field.
    *   If a specific field for a transaction is not present (e.g., a line item has a debit but no credit), leave the missing field null, but keep the structure for other transactions intact.
    *   The AI should be intelligent enough to skip irrelevant sections and focus only on the detailed transaction list.

**Objective:** The final JSON output must be neat, usable, and structured logically, so it can be easily converted into an Excel file.

Now, process the following text from the bank statement.

**Input Text:**
{{{rawText}}}

**Output JSON (strictly follow the 'StructuredPdfDataOutputSchema', ensuring the 'balance' field is populated for every transaction where it exists on the statement)**:
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
