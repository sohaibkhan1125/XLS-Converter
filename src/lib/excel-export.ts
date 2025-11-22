
import * as XLSX from 'xlsx';

export function exportToExcel(data: string[][], fileName: string = 'converted_data.xlsx'): void {
  if (!data || data.length === 0) {
    console.error("No data to export.");
    return;
  }
  
  // Use skipHeader: true to prevent XLSX from trying to auto-parse the first row as headers
  // and potentially misinterpreting data types. We treat all data as plain text.
  const worksheet = XLSX.utils.aoa_to_sheet(data, { skipHeader: true });

  // Set column widths to prevent data from being cut off.
  // The widths are in number of characters.
  const colWidths = [
    { wch: 15 }, // Date
    { wch: 40 }, // Description
    { wch: 15 }, // Paid Out
    { wch: 15 }, // Paid In
    { wch: 20 }, // Balance
  ];
  worksheet['!cols'] = colWidths;
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  XLSX.writeFile(workbook, fileName);
}
