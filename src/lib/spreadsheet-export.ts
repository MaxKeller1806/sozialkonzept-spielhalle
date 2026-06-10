import * as XLSX from "xlsx";

export function rowsToXlsxBuffer(
  sheetName: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): Buffer {
  const data = [headers, ...rows.map((row) => row.map((cell) => cell ?? ""))];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
  return Buffer.from(
    XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
  );
}
