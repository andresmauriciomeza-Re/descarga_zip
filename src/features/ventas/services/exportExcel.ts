import * as XLSX from "xlsx";

/**
 * Descarga los datos proporcionados como un archivo Excel (.xlsx).
 * @param rows  Array de objetos planos (cada uno = una fila).
 * @param cols  Definición de columnas: { key, label } — el label va como encabezado.
 * @param filename  Nombre del archivo sin extensión (se agrega .xlsx automáticamente).
 */
export function exportToExcel<T extends Record<string, unknown>>(
  rows: T[],
  cols: { key: keyof T & string; label: string }[],
  filename: string
): void {
  const header = cols.map(c => c.label);
  const data = rows.map(row => cols.map(c => {
    const val = row[c.key];
    return val === null || val === undefined ? "" : String(val);
  }));

  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
