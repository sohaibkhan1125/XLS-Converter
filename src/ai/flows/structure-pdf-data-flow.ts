
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
  debit: z.number().optional().describe("The withdrawal amount (money out), as a positive number."),
  credit: z.number().optional().describe("The deposit amount (money in), as a positive number. This is a critical field to find."),
  balance: z.number().nullable().describe("CRITICAL: The running balance after the transaction. If a balance value is not present for a transaction row, you MUST output null for this field. The 'balance' key must always be present in the output for every transaction."),
}).describe("A single transaction line item.");
export type Transaction = z.infer<typeof TransactionSchema>;


const StructuredPdfDataOutputSchema = z.object({
  transactions: z.array(TransactionSchema).describe("An array of all financial transactions found on the statement."),
});
export type StructuredPdfDataOutput = z.infer<typeof StructuredPdfDataOutputSchema>;


const StructurePdfDataInputSchema = z.object({
  rawText: z.string().describe("The raw text extracted from the PDF document, potentially including an OCR output."),
});
export type StructurePdfDataInput = z.infer<typeof StructurePdfDataInputSchema>;


export async function structurePdfData(input: StructurePdfDataInput): Promise<StructuredPdfDataOutput> {
  return structurePdfDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractBankStatementTransactionsPrompt',
  input: {schema: StructurePdfDataInputSchema},
  output: {schema: StructuredPdfDataOutputSchema},
  prompt: `You are an expert financial data extraction AI. Your task is to analyze raw text from a bank statement and convert ONLY the transaction table into a structured JSON format.

**CRITICAL RULES:**

1.  **PROCESS ALL PAGES:** The provided text may come from multiple pages of a document. You MUST process the entire text from start to finish to find all transactions across all pages.

2.  **IGNORE ALL METADATA:** You MUST ignore everything outside the transaction tables. This includes headers, footers, bank names, account holder details, addresses, and summary sections. Your output should ONLY contain the list of transactions.

3.  **FOCUS ON TRANSACTION ROWS:** A transaction row contains a date, a description, and at least one monetary value (debit, credit, or balance).

4.  **COLUMN ALIASES (VERY IMPORTANT):** Bank statements use different names for columns. It is CRITICAL that you recognize these variations:
    *   For **'debit'** (money out), look for columns named "Withdrawals", "Payments", "Money Out", "Debit", "Charges", or similar terms.
    *   For **'credit'** (money in), you MUST look for columns named "Deposits", "Receipts", "Money In", "Credit", "Paid In", or similar terms. This is a critical field; do not miss it.

5.  **MANDATORY FIELDS:** For every single transaction row you identify, you MUST extract the 'date', 'description', and 'balance' fields. The 'balance' is the running balance after the transaction and is the most critical field.

6.  **THE 'balance' FIELD IS NOT OPTIONAL:** For every single transaction, you MUST provide a value for the 'balance'. If a running balance is visible on the same line as the transaction, you must extract it. If it is genuinely not present on a specific transaction line, you MUST output 'null' for the 'balance' field. Do not omit the 'balance' key.

7.  **YEAR INFERENCE AND DATE FORMATTING:** This is the most important date rule. You MUST find the year for the statement (e.g., from a 'Statement Period' line like 'Feb 1, 2024 - Feb 29, 2024'). You MUST apply this year to every single transaction date. Format all dates as YYYY-MM-DD. DO NOT use the literal string "YYYY"; use the actual year you found (e.g., "2024-02-05").

8.  **MONETARY FIELDS:** Extract 'debit' and 'credit' amounts. If one is not present for a transaction, omit that specific field from the JSON object for that transaction. For example, if there is no debit, the transaction object should have 'credit' and 'balance', but no 'debit' key.

9.  **CLEAN DATA:**
    *   Do not merge lines. Each transaction is a single, distinct row.
    *   Do not include "Balance brought forward" or similar summary lines in the transaction list.

**EXAMPLE:**

**Input Text Snippet:**
\`\`\`
Statement Period: Feb 1, 2024 - Feb 29, 2024
...
Date Narration Withdrawals Deposits Balance
1 Feb Balance brought forward 40,000.00
3 Feb Card payment - High St Petrol 24.50 39,975.50
4 Feb Direct debit - Green Mobile 20.00 39,955.50
5 Feb Salary - Acme Corp 5,000.00 44,955.50
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
*(Notice the "description" was correctly mapped from "Narration" and "credit" was mapped from "Deposits". "Balance brought forward" is completely ignored.)*

Now, process the following full text and provide the structured JSON.

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
        const hasDate = t.date && typeof t.date === 'string' && t.date.trim() !== '';
        const hasDescription = t.description && typeof t.description === 'string' && t.description.trim() !== '';
        return hasDate && hasDescription;
    });

    return { transactions: cleanedTransactions };
  }
);
