
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
  prompt: `You are an expert financial data extraction assistant. Your task is to analyze the raw text from a bank statement and convert it into a structured JSON format. The text can be messy and columns may not align perfectly. Your primary goal is to identify each transaction row and correctly assign the date, description, debit, credit, and balance. Pay close attention to the column mappings and data cleaning instructions.

**Key Information to Extract:**

1.  **Header Data**:
    *   \`bankName\`: The name of the bank. (If not present, infer from context or leave blank).
    *   \`bankAddress\`: The bank's address.
    *   \`accountHolder\`: The name of the account holder.
    *   \`accountNumber\`: The account number.
    *   \`statementPeriod\`: The date range the statement covers.

2.  **Transaction Table**:
    *   Process each line item in the main transaction table.
    *   **Date**: The date of the transaction. Format as YYYY-MM-DD. Sometimes the date applies to the transaction on the same line or the line immediately below it.
    *   **Description**: The full transaction description. If a description spans multiple lines, combine them into one string.
    *   **Debit**: The withdrawal amount. This often comes from a "Money out" or "Debit" column. It MUST be a positive number.
    *   **Credit**: The deposit amount. This often comes from a "Money in" or "Credit" column. It MUST be a positive number.
    *   **Balance**: The running balance after the transaction.

**Crucial Data Cleaning Rules:**
*   **IGNORE** summary lines like "Balance brought forward", "Total money in", "Total money out", and "Balance at...". These are not individual transactions.
*   **IGNORE** page headers, footers, and any other text that is not part of the header details or the transaction list.
*   If a row does not contain a debit or a credit, it is likely not a transaction and should be skipped.

**Example Conversion:**

Given the following input text snippet:
\`\`\`
16 High Street. Anytown, Anyshire YZ99 1XY
 Mr John Smith 
Account number: 99988877 
Your current account statement: 
1 February  to 1 March, 2019
Date
 Description
 Balance brought forward 
1 February 
3 February 
4 February 
Card payment - High St Petrol Station
 Direct debit - Green Mobile Phone Bill
 Cash Withdrawal - YourBank, Anytown 
High Street, timed 17:30 31 Jan
 YourJob BiWeekly Payment
17 February Card payment - High St Petrol Station 
Money Money Balance
 out
 24.50
 20.00
 30.00
 40.00
 In
 2,575.00
40,000.00
39,975.50
39,955.50
39,925.50
42,500.50
42,710.50
\`\`\`

The desired JSON output for this snippet would be:
\`\`\`json
{
  "header": {
    "bankAddress": "16 High Street. Anytown, Anyshire YZ99 1XY",
    "accountHolder": "Mr John Smith",
    "accountNumber": "99988877",
    "statementPeriod": "1 February to 1 March, 2019"
  },
  "transactions": [
    { "date": "2019-02-01", "description": "Card payment - High St Petrol Station", "debit": 24.50, "balance": 39975.50 },
    { "date": "2019-02-03", "description": "Direct debit - Green Mobile Phone Bill", "debit": 20.00, "balance": 39955.50 },
    { "date": "2019-02-04", "description": "Cash Withdrawal - YourBank, Anytown High Street, timed 17:30 31 Jan", "debit": 30.00, "balance": 39925.50 },
    { "date": "2019-02-04", "description": "YourJob BiWeekly Payment", "credit": 2575.00, "balance": 42500.50 },
    { "date": "2019-02-17", "description": "Card payment - High St Petrol Station", "debit": 40.00, "balance": 42710.50 }
  ]
}
\`\`\`

Now, process the following full bank statement text.

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
