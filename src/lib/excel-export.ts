import * as XLSX from 'xlsx';

export function exportToExcel(data: string[][], fileName: string = 'converted_data.xlsx'): void {
  if (!data || data.length === 0) {
    console.error("No data to export.");
    return;
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  XLSX.writeFile(workbook, fileName);
}
