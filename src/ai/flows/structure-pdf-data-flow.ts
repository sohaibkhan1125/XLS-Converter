
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
  prompt: `You are an expert financial data extraction assistant specializing in converting PDF bank statements into structured data. You are designed to work with a variety of standard bank statements, including those from Pakistan and other international banks (in English).

Your task is to analyze the provided raw text from a bank statement and extract key information into a clean, structured JSON format.

**Instructions:**
1.  **Extract Header Information**: First, find and extract the following essential details from the statement. If a field is not found, leave it blank.
    *   \`bankName\`: The name of the bank.
    *   \`bankAddress\`: The full address of the bank or branch.
    *   \`accountHolder\`: The name of the person or company who owns the account.
    *   \`accountNumber\`: The account number.
    *   \`statementPeriod\`: The date range of the statement (e.g., "Jan 01, 2023 to Jan 31, 2023").

2.  **Extract Transaction Table**: Find the main transaction table and process each row.
    *   For each transaction, extract the following columns:
        *   \`date\`: The date of the transaction. Format it consistently as "YYYY-MM-DD".
        *   \`description\`: The full transaction description, narration, or particulars.
        *   \`debit\`: The withdrawal or debit amount. **This should be a positive number.** If the column doesn't exist or is empty for a row, omit this field.
        *   \`credit\`: The deposit or credit amount. **This should be a positive number.** If the column doesn't exist or is empty for a row, omit this field.
        *   \`balance\`: The running balance after the transaction.
    *   Ensure each transaction is a separate object in the 'transactions' array.

3.  **Data Cleaning**:
    *   **IGNORE** all irrelevant text like terms & conditions, page numbers, marketing slogans, contact information, headers, and footers that are not part of the core data.
    *   Do not include summary rows (like 'Opening Balance' or 'Closing Balance') in the transaction list. Only include actual transaction line items.
    *   If a row is clearly not a transaction, do not include it.

4.  **Final Output**: The final output MUST be a JSON object that strictly adheres to the 'StructuredPdfDataOutputSchema'. It must contain a 'header' object and a 'transactions' array.

**Example of desired output format:**
\`\`\`json
{
  "header": {
    "bankName": "Anytown Bank Corp.",
    "bankAddress": "123 Finance St, Business City, 12345",
    "accountHolder": "JOHN DOE",
    "accountNumber": "123-456-789",
    "statementPeriod": "01/02/2019 - 28/02/2019"
  },
  "transactions": [
    { "date": "2019-02-01", "description": "Card payment - High St Petrol Station", "debit": 24.50, "balance": 5125.50 },
    { "date": "2019-02-04", "description": "Your Job BiWeekly Payment", "credit": 2575.00, "balance": 7700.50 }
  ]
}
\`\`\`

**Input Text from Bank Statement**:
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
