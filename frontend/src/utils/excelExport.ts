import * as XLSX from 'xlsx';

export const downloadXlsx = (
  filename: string,
  sheetName: string,
  headers: string[],
  rows: Array<Array<string | number>>
) => {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
};
