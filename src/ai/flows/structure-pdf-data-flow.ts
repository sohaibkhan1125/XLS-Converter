
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
  balance: z.number().optional().describe("CRITICAL: The running balance after the transaction. This field is mandatory and must not be skipped if a balance value exists on the line."),
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
  prompt: `You are a specialized AI assistant for converting bank statement PDFs into structured data. Your ONLY task is to extract the transaction table.

**Key Rules to Follow:**

1.  **Analyze Layout Automatically:** Bank statements have different formats. You must analyze the structure automatically to identify the transaction data.

2.  **Ignore Header & Summary Details:** You MUST completely ignore all data outside the main transaction table. This includes:
    *   Account holder name, account number, bank name, bank address, account type.
    *   Any "Account Summary" section (like starting balance, total deposits, total withdrawals).
    *   Page numbers, logos, headers, footers, and marketing messages.

3.  **Focus ONLY on Transaction Table:**
    *   Your entire focus is extracting the list of individual transactions.
    *   Each transaction must be represented as a separate object in the output array.

4.  **Standardize Output Columns:**
    *   You must identify columns in the PDF and map them to the required output fields.
    *   PDF "Date" column -> \`date\` field.
    *   PDF "Description" or "Narration" column -> \`description\` field.
    *   PDF "Money Out", "Debit", or "Withdrawal" column -> \`debit\` field (as a positive number).
    *   PDF "Money In", "Credit", or "Deposit" column -> \`credit\` field (as a positive number).
    *   PDF "Balance" or "Running Balance" column -> \`balance\` field.

5.  **Handle Data Cleanly:**
    *   Each transaction MUST be in its own row. Do not merge multiple transactions.
    *   If a value for a field (like debit or credit) is not present for a transaction, that specific field should be null or omitted, but the rest of the transaction data must be extracted.

6. **Prioritize the 'Balance' Column**: The \`balance\` field is the most important field after the date and description. You MUST extract the running balance for every single transaction row. If a row has monetary values, it will have a balance. Do not omit it.


**Example Mapping:**

If the PDF has a row:
\`05/06/2024 | ATM Withdrawal Karachi | | 5,000 | 45,000\`

The output for this transaction should be:
\`{ "date": "2024-06-05", "description": "ATM Withdrawal Karachi", "debit": 5000, "balance": 45000 }\`

If the PDF has a row:
\`06/06/2024 | Salary Credit from ABC Company | 50,000 | | 95,000\`

The output for this transaction should be:
\`{ "date": "2024-06-06", "description": "Salary Credit from ABC Company", "credit": 50000, "balance": 95000 }\`


**Final Output:** The JSON output must strictly adhere to the 'StructuredPdfDataOutputSchema' and contain only the 'transactions' array.

Process the following text and provide the structured JSON.

**Input Text:**
{{{rawText}}}
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
    
    // Safety check and data cleansing
    if (!output.transactions || !Array.isArray(output.transactions)) {
        console.warn("AI output was missing 'transactions' array. Returning empty list.");
        return { transactions: [] };
    }

    // Filter out any invalid or incomplete transaction entries returned by the AI.
    // A valid transaction must have a non-empty date and description.
    const cleanedTransactions = output.transactions.filter(t => {
        const hasDate = t.date && t.date.trim() !== '';
        const hasDescription = t.description && t.description.trim() !== '';
        return hasDate && hasDescription;
    });

    return { transactions: cleanedTransactions };
  }
);
