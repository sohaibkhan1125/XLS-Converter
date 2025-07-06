
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
  balance: z.number().optional().describe("The running balance after the transaction. This is a critical field and must be extracted if present."),
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
  prompt: `You are a highly specialized AI for extracting transaction data from bank statements. Your single purpose is to parse the raw text of a bank statement and convert it into a structured JSON object.

**Primary Directive:** Extract the list of transactions. For every single transaction row you find, you MUST extract the date, description, any money out (debit), any money in (credit), and **most importantly, the running balance after the transaction.**

**Strict Extraction Rules:**
- **FOCUS ON THE TABLE:** Your entire focus is the transaction table.
- **IGNORE EVERYTHING ELSE:** You must completely ignore all other text. This includes bank logos, addresses, account holder details, summaries, opening/closing balances, marketing text, page numbers, headers, and footers.
- **MANDATORY FIELDS:** For each transaction, you must provide:
  - \`date\`: The transaction date.
  - \`description\`: The complete transaction description.
  - \`debit\`: The withdrawal amount.
  - \`credit\`: The deposit amount.
  - \`balance\`: The running balance **after** the transaction. This is not optional. If a running balance is visible for a transaction line, you must extract it.
- **CLEANLINESS:**
  - Do not merge columns.
  - If a debit or credit value is not present for a transaction, that specific field should be null, but the \`balance\` must still be extracted if available.
  - Any row that does not represent a financial transaction (i.e., has no debit or credit) must be ignored.

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
     if (!output.transactions || !Array.isArray(output.transactions)) {
        console.warn("AI output was missing 'transactions' array. Initializing empty list.");
        output.transactions = [];
    }
    return output;
  }
);
