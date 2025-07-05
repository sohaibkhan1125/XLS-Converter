
'use server';
/**
 * @fileOverview Analyzes raw PDF text from bank statements and extracts a list of transactions.
 *
 * - structurePdfData - A function that processes text to extract transaction data.
 * - StructurePdfDataInput - The input type for the structurePdfData function.
 * - TransactionListOutput - The return type (list of transactions) for the structurePdfData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TransactionSchema = z.object({
  date: z.string().describe("The date of the transaction in YYYY-MM-DD format."),
  description: z.string().describe("The full description of the transaction, including any notes or locations."),
  amount: z.number().describe("The transaction amount. Use a negative number for withdrawals, debits, card payments, and fees. Use a positive number for deposits, credits, and incoming payments."),
});

const TransactionListOutputSchema = z.object({
  transactions: z.array(TransactionSchema).describe("An array of all financial transactions found on the statement."),
});
export type TransactionListOutput = z.infer<typeof TransactionListOutputSchema>;


const StructurePdfDataInputSchema = z.object({
  rawText: z.string().describe("The raw text extracted from the PDF document, potentially including OCR output."),
});
export type StructurePdfDataInput = z.infer<typeof StructurePdfDataInputSchema>;


export async function structurePdfData(input: StructurePdfDataInput): Promise<TransactionListOutput> {
  return structurePdfDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTransactionsPrompt',
  input: {schema: StructurePdfDataInputSchema},
  output: {schema: TransactionListOutputSchema},
  prompt: `You are an expert financial data extraction assistant. Your sole task is to analyze the provided raw text from a bank statement and extract only the financial transactions into a structured JSON format.

**Instructions:**
1.  **Focus Exclusively on Transactions**: Ignore all other information such as bank names, addresses, account holder details, summary boxes, opening/closing balances, and marketing text.
2.  **Extract Transaction Details**: For each individual transaction line item, you must extract the following three fields:
    *   \`date\`: The date the transaction occurred. Format it as "YYYY-MM-DD".
    *   \`description\`: The full, detailed description of the transaction as it appears on the statement.
    *   \`amount\`: The monetary value of the transaction.
3.  **Format the 'Amount' Correctly**:
    *   Represent withdrawals, debits, payments, and fees as **negative** numbers (e.g., -24.50).
    *   Represent deposits, credits, and incoming payments as **positive** numbers (e.g., 2575.00).
    *   Do not use currency symbols. The output must be a valid JSON number.
4.  **Structure the Output**: The final output must be a JSON object that strictly adheres to the 'TransactionListOutputSchema'. It should contain a single key, "transactions", which is an array of transaction objects.
5.  **Handle Ambiguity**: If a line item is clearly not a transaction, do not include it. If you cannot determine the date, description, or amount for a row that looks like a transaction, do not include it.

**Example of desired output format:**
\`\`\`json
{
  "transactions": [
    { "date": "2019-02-01", "description": "Card payment - High St Petrol Station", "amount": -24.50 },
    { "date": "2019-02-04", "description": "Your Job BiWeekly Payment", "amount": 2575.00 }
  ]
}
\`\`\`

**Input Text from Bank Statement**:
{{{rawText}}}

**Output JSON (strictly follow the 'TransactionListOutputSchema')**:
`,
});

const structurePdfDataFlow = ai.defineFlow(
  {
    name: 'structurePdfDataFlow',
    inputSchema: StructurePdfDataInputSchema,
    outputSchema: TransactionListOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to structure transaction data. Output was null.");
    }
    if (!output.transactions || !Array.isArray(output.transactions)) {
        console.warn("AI output for structured data was missing 'transactions' array. Returning empty list.", output);
        return { transactions: [] };
    }
    return output;
  }
);
