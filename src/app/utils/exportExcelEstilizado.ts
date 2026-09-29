import ExcelJS from "exceljs";

export type AlineacionExcel = "left" | "center" | "right";

export interface ColumnaExcel<T> {
  header: string;
  valor: (fila: T) => string | number;
  alineacion?: AlineacionExcel;
  esEstado?: boolean;
  numFmt?: string;
}

export interface OpcionesExcel<T> {
  datos: T[];
  columnas: ColumnaExcel<T>[];
  titulo: string;
  nombreHoja: string;
  nombreArchivo: string;
  coloresEstado?: Record<string, { texto: string; fondo: string }>;
  fecha?: Date;
}

const ROJO_MARCA = "FFC62828";
const ROJO_BORDE = "FF8E1B1B";
const GRIS_ZEBRA = "FFF5F5F5";
const GRIS_BORDE = "FFD9D9D9";
const NEGRO_TEXTO = "FF1A1A1A";
const ANCHO_MIN = 10;
const ANCHO_MAX = 46;

function fechaLocal(d: Date) {
  return d.toLocaleDateString("en-CA");
}

function anchoDeContenido(cabecera: string, valores: (string | number)[]) {
  const largos = valores.map((v) => String(v).length);
  const max = Math.max(cabecera.length, ...largos, 0);
  return Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, max + 3));
}

export async function exportarExcelEstilizado<T>({
  datos,
  columnas,
  titulo,
  nombreHoja,
  nombreArchivo,
  coloresEstado = {},
  fecha = new Date(),
}: OpcionesExcel<T>): Promise<string> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "S.I.V.PRO — La Sirena Pizza";
  wb.created = fecha;

  const ws = wb.addWorksheet(nombreHoja, {
    views: [{ state: "frozen", xSplit: 0, ySplit: 3 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const totalCols = columnas.length;
  const bordeFino = (color: string) => ({ style: "thin" as const, color: { argb: color } });
  const bordeCelda = (color: string) => ({
    top: bordeFino(color),
    left: bordeFino(color),
    bottom: bordeFino(color),
    right: bordeFino(color),
  });

  const matriz: (string | number)[][] = datos.map((fila) => columnas.map((c) => c.valor(fila)));

  columnas.forEach((col, i) => {
    ws.getColumn(i + 1).width = anchoDeContenido(col.header, matriz.map((r) => r[i]));
  });

  ws.mergeCells(1, 1, 1, totalCols);
  const celdaTitulo = ws.getCell(1, 1);
  celdaTitulo.value = "La Sirena Pizza";
  celdaTitulo.font = { name: "Calibri", size: 16, bold: true, color: { argb: NEGRO_TEXTO } };
  celdaTitulo.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 26;

  ws.mergeCells(2, 1, 2, totalCols);
  const celdaSubtitulo = ws.getCell(2, 1);
  celdaSubtitulo.value = `S.I.V.PRO — ${titulo}`;
  celdaSubtitulo.font = { name: "Calibri", size: 11, bold: true, color: { argb: ROJO_MARCA } };
  celdaSubtitulo.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(2).height = 18;

  const filaHeader = 3;
  columnas.forEach((col, i) => {
    const celda = ws.getCell(filaHeader, i + 1);
    celda.value = col.header;
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROJO_MARCA } };
    celda.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    celda.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    celda.border = bordeCelda(ROJO_BORDE);
  });
  ws.getRow(filaHeader).height = 24;

  datos.forEach((fila, r) => {
    const numeroFila = filaHeader + 1 + r;
    const zebra = r % 2 === 1 ? GRIS_ZEBRA : "FFFFFFFF";

    columnas.forEach((col, c) => {
      const celda = ws.getCell(numeroFila, c + 1);
      const valor = matriz[r][c];
      celda.value = valor;

      if (col.numFmt && typeof valor === "number") {
        celda.numFmt = col.numFmt;
      }

      const alineacion: AlineacionExcel =
        col.alineacion ?? (typeof valor === "number" ? "right" : "left");
      celda.alignment = { vertical: "middle", horizontal: alineacion };
      celda.font = { name: "Calibri", size: 11, color: { argb: NEGRO_TEXTO } };
      celda.border = bordeCelda(GRIS_BORDE);

      if (col.esEstado) {
        const clave = String(valor);
        const tono = coloresEstado[clave];
        if (tono) {
          celda.font = { name: "Calibri", size: 11, bold: true, color: { argb: tono.texto } };
          celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tono.fondo } };
        }
        celda.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebra } };
      }
    });
  });

  const archivo = `${nombreArchivo}_${fechaLocal(fecha)}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return archivo;
}
