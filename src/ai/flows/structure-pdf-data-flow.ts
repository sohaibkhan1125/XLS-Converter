
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
  date: z.string().describe("The date of the transaction. IMPORTANT: You must format this as YYYY-MM-DD. You MUST infer the correct year from the statement context and use that specific year (e.g., 2023, 2024). Do not literally output 'YYYY'."),
  description: z.string().describe("The full description, narration, or particulars of the transaction."),
  debit: z.number().optional().describe("The withdrawal or 'Paid Out' amount (money out), as a positive number. Look for keywords like Withdrawal, Debit, Payment Sent, DR, or Dr."),
  credit: z.number().optional().describe("CRITICAL: The deposit or 'Paid In' amount (money in), as a positive number. You must explicitly search for columns or text indicating Credit, Deposit, Received, Transfer In, CR, or Cr. This is a very important field to find if it exists."),
  balance: z.number().nullable().describe("CRITICAL: The running balance after the transaction. If a balance value is not present for a transaction row, you MUST output null for this field. The 'balance' key must always be present in the output for every transaction."),
}).describe("A single transaction line item.");
export type Transaction = z.infer<typeof TransactionSchema>;


const StructuredPdfDataOutputSchema = z.object({
  transactions: z.array(TransactionSchema).describe("An array of all financial transactions found on the statement."),
});
export type StructuredPdfDataOutput = z.infer<typeof StructuredPdfDataOutputSchema>;


const StructurePdfDataInputSchema = z.object({
  rawText: z.string().describe("The raw text extracted from the PDF document, potentially including an OCR output from a scanned document."),
});
export type StructurePdfDataInput = z.infer<typeof StructurePdfDataInputSchema>;


export async function structurePdfData(input: StructurePdfDataInput): Promise<StructuredPdfDataOutput> {
  return structurePdfDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractBankStatementTransactionsPrompt',
  input: {schema: StructurePdfDataInputSchema},
  output: {schema: StructuredPdfDataOutputSchema},
  prompt: `You are an expert financial data extraction system that reads and converts bank statement PDFs into structured JSON with 100% data completeness and accuracy.

Your task is to extract all transaction data — including both “Paid In” (credits) and “Paid Out” (debits) — from bank statement PDFs of any layout or structure.

**CRITICAL EXTRACTION RULES:**

1.  **Comprehensive Data Recognition**:
    *   Identify every transaction row, even if the PDF layout is misaligned, irregular, or from a scanned document.
    *   Do not rely only on table detection — use both text alignment and context clues to find transaction lines.

2.  **“Paid In” (Credit) Column Detection (Highest Priority)**:
    *   You MUST explicitly search for all credited amounts or incoming transactions, even if not clearly labeled.
    *   Common indicators for the "credit" field include columns or text with words like: **Credit, Deposit, Received, Transfer In, Cash In, Refund, Interest, Payment Received, CR, Cr.**
    *   Always extract the numeric value associated with these words and place it under the \`credit\` field in the JSON.
    *   Even if there’s no clear “Paid In” header, you must infer it logically based on context or positive transaction patterns in the balance.

3.  **“Paid Out” (Debit) Column Detection**:
    *   Detect outgoing transactions indicated by words like: **Withdrawal, Debit, Payment Sent, Transfer Out, Bill Payment, DR, Dr.**
    *   Place these numeric values under the \`debit\` field in the JSON.

4.  **Date and Year Inference**:
    *   This is a critical rule. You MUST find the year for the statement (e.g., from a 'Statement Period' line like 'Feb 1, 2024 - Feb 29, 2024').
    *   You MUST apply this year to every single transaction date.
    *   Format all dates as **YYYY-MM-DD**. Do not use the literal string "YYYY"; use the actual year you found (e.g., "2024-02-05").

5.  **Balance Field is MANDATORY**:
    *   The 'balance' is the running balance *after* the transaction and is a critical field.
    *   For every single transaction, you MUST provide a value for the 'balance'.
    *   If a running balance is visible on the same line as the transaction, you must extract it.
    *   If it is genuinely not present on a specific transaction line, you MUST output **null** for the 'balance' field. Do not omit the 'balance' key.

6.  **Data Cleaning & Final Output**:
    *   Ignore everything outside the transaction table (headers, footers, bank details, summaries, etc.).
    *   Do not include "Balance brought forward" or similar summary lines in the final transaction list.
    *   Each transaction is a single, distinct row. Do not merge lines.
    *   If a transaction has a value for 'debit' but not 'credit', the 'credit' key should be omitted from that transaction's JSON object (and vice-versa). The 'balance' key must always be present.

**EXAMPLE:**

**Input Text Snippet:**
\`\`\`
Statement Period: Feb 1, 2024 - Feb 29, 2024
...
Date       Narration                     Withdrawals     Deposits        Balance
1 Feb      Balance brought forward                                     40,000.00
3 Feb      Card payment - High St Petrol 24.50                           39,975.50
4 Feb      Direct debit - Green Mobile   20.00                           39,955.50
5 Feb      Salary - Acme Corp                            5,000.00        44,955.50
\`\`\`

**Correct JSON Output for this Snippet:**
\`\`\`json
{
  "transactions": [
    { "date": "2024-02-03", "description": "Card payment - High St Petrol", "debit": 24.50, "balance": 39975.50 },
    { "date": "2024-02-04", "description": "Direct debit - Green Mobile", "debit": 20.00, "balance": 39955.50 },
    { "date": "2024-02-05", "description": "Salary - Acme Corp", "credit": 5000.00, "balance": 44955.50 }
  ]
}
\`\`\`
*(Notice "credit" was correctly mapped from "Deposits" and "Balance brought forward" was ignored.)*

Now, process the following full text from the document and provide the structured JSON output.

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
    // A valid transaction must have a non-empty date and description, and the balance field must be present (even if null).
    const cleanedTransactions = output.transactions.filter(t => {
        const hasDate = t.date && typeof t.date === 'string' && t.date.trim() !== '';
        const hasDescription = t.description && typeof t.description === 'string' && t.description.trim() !== '';
        // The balance field is mandatory in our schema (can be null), so we just check for its existence.
        const balanceIsPresent = t.balance !== undefined;

        // A transaction should have either a debit or a credit.
        const hasMonetaryValue = (t.debit !== undefined && t.debit !== null) || (t.credit !== undefined && t.credit !== null);

        return hasDate && hasDescription && balanceIsPresent && hasMonetaryValue;
    });

    return { transactions: cleanedTransactions };
  }
);
