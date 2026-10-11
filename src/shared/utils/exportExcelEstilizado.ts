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

// ─── GESTIÓN DE COMPRAS CON INSUMOS ───────────────────────────────────────────

export interface GestionCompraConInsumos {
  id: string;
  numeroFactura: string;
  proveedor: string;
  nit: string;
  fechaFactura: string;
  estado: string;
  subtotalSinIva: number;
  totalIva: number;
  totalPagado: number;
  motivoAnulacion?: string;
  items: Array<{
    nombre: string;
    tipo: "Solicitado" | "No solicitado" | "—";
    cantidad: number;
    unidad: string;
    costoUnitario: number;
    iva: number;
  }>;
}

export interface ExportarGestionComprasConInsumosOptions {
  compras: GestionCompraConInsumos[];
  nombreArchivo: string;
  fecha?: Date;
}

export async function exportarGestionComprasConInsumosExcel({
  compras,
  nombreArchivo,
  fecha = new Date(),
}: ExportarGestionComprasConInsumosOptions): Promise<string> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "S.I.V.PRO — La Sirena Pizza";
  wb.created = fecha;

  const ws = wb.addWorksheet("Gestión de Compras", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 3 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const ROJO_MARCA = "FFC62828";
  const ROJO_BORDE = "FF8E1B1B";
  const GRIS_CLARO = "FFF3F4F6";
  const GRIS_ZEBRA = "FFF5F5F5";
  const GRIS_BORDE = "FFD9D9D9";
  const NEGRO_TEXTO = "FF1A1A1A";
  const ANCHO_MIN = 10;
  const ANCHO_MAX = 46;

  function anchoDeContenido(cabecera: string, valores: (string | number)[]) {
    const largos = valores.map((v) => String(v).length);
    const max = Math.max(cabecera.length, ...largos, 0);
    return Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, max + 3));
  }

  const bordeFino = (color: string) => ({ style: "thin" as const, color: { argb: color } });
  const bordeCelda = (color: string) => ({
    top: bordeFino(color),
    left: bordeFino(color),
    bottom: bordeFino(color),
    right: bordeFino(color),
  });

  const totalCols = 9;

  ws.mergeCells(1, 1, 1, totalCols);
  const celdaTitulo = ws.getCell(1, 1);
  celdaTitulo.value = "La Sirena Pizza";
  celdaTitulo.font = { name: "Calibri", size: 16, bold: true, color: { argb: NEGRO_TEXTO } };
  celdaTitulo.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 26;

  ws.mergeCells(2, 1, 2, totalCols);
  const celdaSubtitulo = ws.getCell(2, 1);
  celdaSubtitulo.value = `S.I.V.PRO — Listado de Gestión de Compras con Insumos`;
  celdaSubtitulo.font = { name: "Calibri", size: 11, bold: true, color: { argb: ROJO_MARCA } };
  celdaSubtitulo.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(2).height = 18;

  const headersCompra = ["N° Factura", "Proveedor", "NIT", "Fecha de factura", "Estado", "Subtotal", "IVA", "Total pagado", "Motivo de anulación"];
  const filaHeader = 3;
  headersCompra.forEach((header, i) => {
    const celda = ws.getCell(filaHeader, i + 1);
    celda.value = header;
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROJO_MARCA } };
    celda.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    celda.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    celda.border = bordeCelda(ROJO_BORDE);
  });
  ws.getRow(filaHeader).height = 24;

  const estiloCompra = {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: GRIS_CLARO } },
    font: { name: "Calibri", size: 11, bold: true, color: { argb: NEGRO_TEXTO } },
    border: bordeCelda(GRIS_BORDE),
    alignment: { vertical: "middle", horizontal: "left" },
  };

  const estiloInsumoHeader = {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: ROJO_MARCA } },
    font: { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } },
    border: bordeCelda(ROJO_BORDE),
    alignment: { vertical: "middle", horizontal: "left", wrapText: true },
  };

  const estiloInsumo = (zebra: string) => ({
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: zebra } },
    font: { name: "Calibri", size: 11, color: { argb: NEGRO_TEXTO } },
    border: bordeCelda(GRIS_BORDE),
    alignment: { vertical: "middle", horizontal: "left" },
  });

  const estiloNumero = (zebra: string) => ({
    ...estiloInsumo(zebra),
    alignment: { vertical: "middle", horizontal: "right" },
  });

  let currentRow = filaHeader + 1;

  for (const compra of compras) {
    const compraData = [
      compra.numeroFactura || "—",
      compra.proveedor,
      compra.nit,
      compra.fechaFactura,
      compra.estado,
      compra.subtotalSinIva,
      compra.totalIva,
      compra.totalPagado,
      compra.motivoAnulacion || "",
    ];
    compraData.forEach((valor, i) => {
      const celda = ws.getCell(currentRow, i + 1);
      celda.value = typeof valor === "number" ? valor : valor;
      if (typeof valor === "number") {
        celda.numFmt = "#,##0";
      }
      Object.assign(celda, estiloCompra);
      if (i >= 5) {
        celda.alignment = { vertical: "middle", horizontal: "right" };
      }
      if (i === 8) {
        celda.alignment = { vertical: "middle", horizontal: "left" };
      }
    });
    ws.getRow(currentRow).height = 22;
    currentRow++;

    const headersInsumo = ["Insumo", "Tipo", "Cantidad", "Unidad", "Monto unitario", "IVA %", "Subtotal"];
    headersInsumo.forEach((header, i) => {
      const celda = ws.getCell(currentRow, i + 1);
      celda.value = header;
      Object.assign(celda, estiloInsumoHeader);
    });
    ws.getRow(currentRow).height = 20;
    currentRow++;

    if (compra.items.length === 0) {
      const celda = ws.getCell(currentRow, 1);
      celda.value = "Sin insumos";
      celda.font = { name: "Calibri", size: 11, italic: true, color: { argb: "FF9CA3AF" } };
      celda.border = bordeCelda(GRIS_BORDE);
      ws.mergeCells(currentRow, 1, currentRow, totalCols);
      ws.getRow(currentRow).height = 20;
      currentRow++;
    } else {
      for (let idx = 0; idx < compra.items.length; idx++) {
        const item = compra.items[idx];
        const subtotal = item.cantidad * item.costoUnitario;
        const zebra = idx % 2 === 1 ? GRIS_ZEBRA : "FFFFFFFF";

        const insumoData = [
          item.nombre,
          item.tipo,
          item.cantidad,
          item.unidad,
          item.costoUnitario,
          item.iva,
          subtotal,
        ];

        insumoData.forEach((valor, i) => {
          const celda = ws.getCell(currentRow, i + 1);
          celda.value = typeof valor === "number" ? valor : valor;
          if (typeof valor === "number") {
            if (i === 4 || i === 6) {
              celda.numFmt = "#,##0";
            } else if (i === 5) {
              celda.numFmt = "0";
            }
          }
          const estilo = (i === 2 || i === 4 || i === 5 || i === 6) ? estiloNumero(zebra) : estiloInsumo(zebra);
          Object.assign(celda, estilo);
        });
        ws.getRow(currentRow).height = 20;
        currentRow++;
      }
    }

    currentRow++;
  }

  const allValues: (string | number)[][] = Array.from({ length: totalCols }, () => []);

  for (let row = 3; row < currentRow; row++) {
    for (let col = 1; col <= totalCols; col++) {
      const cell = ws.getCell(row, col);
      if (cell.value != null) {
        allValues[col - 1].push(String(cell.value));
      }
    }
  }

  headersCompra.forEach((header, i) => {
    ws.getColumn(i + 1).width = anchoDeContenido(header, allValues[i]);
  });

  const archivo = `${nombreArchivo}-${fecha.toLocaleDateString("en-CA")}.xlsx`;
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

// ─── ÓRDENES DE COMPRA CON INSUMOS ────────────────────────────────────────────

export interface OrdenConInsumos {
  id: string;
  proveedor: string;
  fecha: string;
  estado: string;
  items: Array<{
    nombre: string;
    cantidad: number;
    unidad: string;
    costoUnitario: number;
    iva: number;
  }>;
  recepcion?: {
    itemsExtra: Array<{
      nombre: string;
      cantidad: number;
      unidad: string;
      costoUnitario: number;
      iva: number;
      facturaNumero: string;
    }>;
  };
}

export interface ExportarOrdenesConInsumosOptions {
  ordenes: OrdenConInsumos[];
  proveedores: Array<{ nombre: string; nit: string }>;
  nombreArchivo: string;
  fecha?: Date;
}

export async function exportarOrdenesConInsumosExcel({
  ordenes,
  proveedores,
  nombreArchivo,
  fecha = new Date(),
}: ExportarOrdenesConInsumosOptions): Promise<string> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "S.I.V.PRO — La Sirena Pizza";
  wb.created = fecha;

  const ws = wb.addWorksheet("Órdenes de Compra", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 3 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const GRIS_CLARO = "FFF3F4F6";

  const bordeFino = (color: string) => ({ style: "thin" as const, color: { argb: color } });
  const bordeCelda = (color: string) => ({
    top: bordeFino(color),
    left: bordeFino(color),
    bottom: bordeFino(color),
    right: bordeFino(color),
  });

  const totalCols = 6;

  ws.mergeCells(1, 1, 1, totalCols);
  const celdaTitulo = ws.getCell(1, 1);
  celdaTitulo.value = "La Sirena Pizza";
  celdaTitulo.font = { name: "Calibri", size: 16, bold: true, color: { argb: NEGRO_TEXTO } };
  celdaTitulo.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 26;

  ws.mergeCells(2, 1, 2, totalCols);
  const celdaSubtitulo = ws.getCell(2, 1);
  celdaSubtitulo.value = `S.I.V.PRO — Listado de Órdenes de Compra con Insumos`;
  celdaSubtitulo.font = { name: "Calibri", size: 11, bold: true, color: { argb: ROJO_MARCA } };
  celdaSubtitulo.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(2).height = 18;

  const headersOrden = ["N° Orden", "Proveedor", "NIT", "Fecha", "Estado", "Total"];
  const filaHeader = 3;
  headersOrden.forEach((header, i) => {
    const celda = ws.getCell(filaHeader, i + 1);
    celda.value = header;
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROJO_MARCA } };
    celda.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    celda.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    celda.border = bordeCelda(ROJO_BORDE);
  });
  ws.getRow(filaHeader).height = 24;

  const estiloOrden = {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: GRIS_CLARO } },
    font: { name: "Calibri", size: 11, bold: true, color: { argb: NEGRO_TEXTO } },
    border: bordeCelda(GRIS_BORDE),
    alignment: { vertical: "middle", horizontal: "left" },
  };

  const estiloInsumoHeader = {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: ROJO_MARCA } },
    font: { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } },
    border: bordeCelda(ROJO_BORDE),
    alignment: { vertical: "middle", horizontal: "left", wrapText: true },
  };

  const estiloInsumo = (zebra: string) => ({
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: zebra } },
    font: { name: "Calibri", size: 11, color: { argb: NEGRO_TEXTO } },
    border: bordeCelda(GRIS_BORDE),
    alignment: { vertical: "middle", horizontal: "left" },
  });

  const estiloNumero = (zebra: string) => ({
    ...estiloInsumo(zebra),
    alignment: { vertical: "middle", horizontal: "right" },
  });

  let currentRow = filaHeader + 1;

  for (const orden of ordenes) {
    const prov = proveedores.find(p => p.nombre === orden.proveedor);
    const nit = prov?.nit ?? "";
    const totalOrden = orden.items.reduce((s, item) => s + item.cantidad * item.costoUnitario, 0);

    const ordenData = [orden.id, orden.proveedor, nit, orden.fecha, orden.estado, totalOrden];
    ordenData.forEach((valor, i) => {
      const celda = ws.getCell(currentRow, i + 1);
      celda.value = typeof valor === "number" ? valor : valor;
      if (typeof valor === "number") {
        celda.numFmt = "#,##0";
      }
      Object.assign(celda, estiloOrden);
      if (i === 5) {
        celda.alignment = { vertical: "middle", horizontal: "right" };
      }
    });
    ws.getRow(currentRow).height = 22;
    currentRow++;

    const headersInsumo = ["Insumo", "Cantidad", "Unidad", "Monto unitario", "IVA %", "Subtotal"];
    headersInsumo.forEach((header, i) => {
      const celda = ws.getCell(currentRow, i + 1);
      celda.value = header;
      Object.assign(celda, estiloInsumoHeader);
    });
    ws.getRow(currentRow).height = 20;
    currentRow++;

    if (orden.items.length === 0) {
      const celda = ws.getCell(currentRow, 1);
      celda.value = "Sin insumos";
      celda.font = { name: "Calibri", size: 11, italic: true, color: { argb: "FF9CA3AF" } };
      celda.border = bordeCelda(GRIS_BORDE);
      ws.mergeCells(currentRow, 1, currentRow, totalCols);
      ws.getRow(currentRow).height = 20;
      currentRow++;
    } else {
      for (let idx = 0; idx < orden.items.length; idx++) {
        const item = orden.items[idx];
        const subtotal = item.cantidad * item.costoUnitario;
        const zebra = idx % 2 === 1 ? GRIS_ZEBRA : "FFFFFFFF";

        const insumoData = [
          item.nombre,
          item.cantidad,
          item.unidad,
          item.costoUnitario,
          item.iva,
          subtotal,
        ];

        insumoData.forEach((valor, i) => {
          const celda = ws.getCell(currentRow, i + 1);
          celda.value = typeof valor === "number" ? valor : valor;
          if (typeof valor === "number") {
            if (i === 3 || i === 5) {
              celda.numFmt = "#,##0";
            } else if (i === 4) {
              celda.numFmt = "0";
            }
          }
          const estilo = (i === 1 || i === 3 || i === 4 || i === 5) ? estiloNumero(zebra) : estiloInsumo(zebra);
          Object.assign(celda, estilo);
        });
        ws.getRow(currentRow).height = 20;
        currentRow++;
      }
    }

    if (orden.recepcion?.itemsExtra && orden.recepcion.itemsExtra.length > 0) {
      const facturaNumeros = [...new Set(orden.recepcion.itemsExtra.map(e => e.facturaNumero).filter(Boolean))];
      const subtituloFacturas = facturaNumeros.length > 0 
        ? `Insumos no solicitados (Factura${facturaNumeros.length > 1 ? 's' : ''} ${facturaNumeros.join(', ')})`
        : "Insumos no solicitados";
      
      const celdaSubtitulo = ws.getCell(currentRow, 1);
      celdaSubtitulo.value = subtituloFacturas;
      celdaSubtitulo.font = { name: "Calibri", size: 10, italic: true, bold: true, color: { argb: NEGRO_TEXTO } };
      celdaSubtitulo.border = bordeCelda(GRIS_BORDE);
      celdaSubtitulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      ws.mergeCells(currentRow, 1, currentRow, totalCols);
      ws.getRow(currentRow).height = 20;
      currentRow++;

      for (let idx = 0; idx < orden.recepcion.itemsExtra.length; idx++) {
        const item = orden.recepcion.itemsExtra[idx];
        const subtotal = item.cantidad * item.costoUnitario;
        const zebra = idx % 2 === 1 ? GRIS_ZEBRA : "FFFFFFFF";

        const insumoData = [
          item.nombre,
          item.cantidad,
          item.unidad,
          item.costoUnitario,
          item.iva,
          subtotal,
        ];

        insumoData.forEach((valor, i) => {
          const celda = ws.getCell(currentRow, i + 1);
          celda.value = typeof valor === "number" ? valor : valor;
          if (typeof valor === "number") {
            if (i === 3 || i === 5) {
              celda.numFmt = "#,##0";
            } else if (i === 4) {
              celda.numFmt = "0";
            }
          }
          const estilo = (i === 1 || i === 3 || i === 4 || i === 5) ? estiloNumero(zebra) : estiloInsumo(zebra);
          Object.assign(celda, estilo);
        });
        ws.getRow(currentRow).height = 20;
        currentRow++;
      }
    }

    currentRow++;
  }

  const allValues: (string | number)[][] = Array.from({ length: totalCols }, () => []);
  
  for (let row = 3; row < currentRow; row++) {
    for (let col = 1; col <= totalCols; col++) {
      const cell = ws.getCell(row, col);
      if (cell.value != null) {
        allValues[col - 1].push(String(cell.value));
      }
    }
  }

  headersOrden.forEach((header, i) => {
    ws.getColumn(i + 1).width = anchoDeContenido(header, allValues[i]);
  });

  const archivo = `${nombreArchivo}-${fecha.toLocaleDateString("en-CA")}.xlsx`;
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

// ─── MULTI HOJA ───────────────────────────────────────────────────────────────

export interface HojaExcel<T> {
  nombreHoja: string;
  datos: T[];
  columnas: ColumnaExcel<T>[];
  titulo: string;
  coloresEstado?: Record<string, { texto: string; fondo: string }>;
}

export interface OpcionesMultiExcel {
  hojas: HojaExcel<any>[];
  nombreArchivo: string;
  fecha?: Date;
}

export async function exportarMultiExcelEstilizado({
  hojas,
  nombreArchivo,
  fecha = new Date(),
}: OpcionesMultiExcel): Promise<string> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "S.I.V.PRO — La Sirena Pizza";
  wb.created = fecha;

  const bordeFino = (color: string) => ({ style: "thin" as const, color: { argb: color } });
  const bordeCelda = (color: string) => ({
    top: bordeFino(color),
    left: bordeFino(color),
    bottom: bordeFino(color),
    right: bordeFino(color),
  });

  for (const hoja of hojas) {
    const ws = wb.addWorksheet(hoja.nombreHoja, {
      views: [{ state: "frozen", xSplit: 0, ySplit: 3 }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const totalCols = hoja.columnas.length;

    const matriz: (string | number)[][] = hoja.datos.map((fila) =>
      hoja.columnas.map((c) => c.valor(fila))
    );

    hoja.columnas.forEach((col, i) => {
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
    celdaSubtitulo.value = `S.I.V.PRO — ${hoja.titulo}`;
    celdaSubtitulo.font = { name: "Calibri", size: 11, bold: true, color: { argb: ROJO_MARCA } };
    celdaSubtitulo.alignment = { vertical: "middle", horizontal: "left" };
    ws.getRow(2).height = 18;

    const filaHeader = 3;
    hoja.columnas.forEach((col, i) => {
      const celda = ws.getCell(filaHeader, i + 1);
      celda.value = col.header;
      celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROJO_MARCA } };
      celda.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      celda.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      celda.border = bordeCelda(ROJO_BORDE);
    });
    ws.getRow(filaHeader).height = 24;

    hoja.datos.forEach((fila, r) => {
      const numeroFila = filaHeader + 1 + r;
      const zebra = r % 2 === 1 ? GRIS_ZEBRA : "FFFFFFFF";

      hoja.columnas.forEach((col, c) => {
        const celda = ws.getCell(numeroFila, c + 1);
        const valor = matriz[r][c];
        celda.value = valor;

        if (col.numFmt && typeof valor === "number") {
          celda.numFmt = col.numFmt;
        }

        const alineacion = col.alineacion ?? (typeof valor === "number" ? "right" : "left");
        celda.alignment = { vertical: "middle", horizontal: alineacion };
        celda.font = { name: "Calibri", size: 11, color: { argb: NEGRO_TEXTO } };
        celda.border = bordeCelda(GRIS_BORDE);

        if (col.esEstado) {
          const clave = String(valor);
          const tono = hoja.coloresEstado?.[clave];
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
  }

  const archivo = `${nombreArchivo}_${fecha.toLocaleDateString("en-CA")}.xlsx`;
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