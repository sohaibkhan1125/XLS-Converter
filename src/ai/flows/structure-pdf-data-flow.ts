
'use server';
/**
 * @fileOverview Analyzes raw PDF text from bank statements and extracts a structured list of transactions.
 *
 * - structurePdfData - A function that processes text to extract bank statement transactions.
 * - StructurePdfDataInput - The input type for the structurePdfData function.
 * - StructuredPdfDataOutput - The return type for the structurePdfData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';


const TransactionSchema = z.object({
  date: z.string().describe("The date of the transaction in YYYY-MM-DD format."),
  description: z.string().describe("The full description, narration, or particulars of the transaction."),
  debit: z.number().optional().describe("The withdrawal amount (money out), as a positive number."),
  credit: z.number().optional().describe("The deposit amount (money in), as a positive number."),
  balance: z.number().optional().describe("The running balance after the transaction."),
}).describe("A single transaction line item.");


const StructuredPdfDataOutputSchema = z.object({
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
  name: 'extractBankStatementTransactionsPrompt',
  input: {schema: StructurePdfDataInputSchema},
  output: {schema: StructuredPdfDataOutputSchema},
  prompt: `You are an expert financial data extraction AI. Your ONLY task is to extract the transaction table from the provided bank statement text into a clean JSON format.

**Extraction Rules:**

1.  **IGNORE ALL NON-TRANSACTION DATA:** You MUST ignore all decorative or unnecessary text. This includes bank names, addresses, logos, account holder names, account numbers, account types, statement periods, opening balances, closing balances, summary totals, marketing messages, page numbers, headers, and footers. Your sole focus is the list of transactions.

2.  **EXTRACT TRANSACTION TABLE ONLY:** Locate the main table of transactions. For each and every transaction row, you must extract the following data into the 'transactions' array.
    *   **\`date\`**: The date of the transaction.
    *   **\`description\`**: The full transaction description or narration.
    *   **\`debit\`**: The withdrawal amount (money out). This must be a positive number.
    *   **\`credit\`**: The deposit amount (money in). This must be a positive number.
    *   **\`balance\`**: The running balance after the transaction. **It is critical to extract the running balance for each transaction if it is present in the text.**

3.  **CLEAN DATA IS ESSENTIAL:**
    *   Do not merge multiple pieces of data (e.g., date and description) into one field.
    *   If a specific field for a transaction is not present (e.g., a line item has a debit but no credit), leave the missing field null.
    *   Discard any line that does not contain a monetary value (a debit or a credit), as it is not a transaction.

**Objective:** The final JSON output must contain ONLY a 'transactions' array, which can be easily converted into a clean Excel file with one transaction per row.

Now, process the following text from the bank statement.

**Input Text:**
{{{rawText}}}

**Output JSON (strictly follow the 'StructuredPdfDataOutputSchema', containing only the 'transactions' array)**:
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
     if (!output.transactions || !Array.isArray(output.transactions)) {
        console.warn("AI output was missing 'transactions' array. Initializing empty list.");
        output.transactions = [];
    }
    return output;
  }
);
