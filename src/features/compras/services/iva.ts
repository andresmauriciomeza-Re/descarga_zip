/**
 * Utilidad única de cálculo de IVA para Compras.
 *
 * Esta es la ÚNICA implementación de la fórmula en el frontend: tanto el
 * formulario de compra como la recepción y la vista de detalle deben
 * importar `calcularLineaIva` (no reimplementar la cuenta).
 *
 * El backend debe usar exactamente la misma fórmula (ver
 * `db/migracion_iva_compras.sql`, sección "NOTA PARA EL BACKEND").
 *
 * Reglas:
 * - ivaIncluido = true  → el monto unitario YA incluye el IVA:
 *     baseSinIva  = round(subtotalConIva / (1 + iva/100))
 *     montoIva    = subtotalConIva - baseSinIva
 *     subtotalConIva = cantidad × montoUnitario (se conserva tal cual)
 * - ivaIncluido = false → el monto unitario NO incluye el IVA:
 *     baseSinIva  = round(cantidad × montoUnitario)
 *     montoIva    = round(baseSinIva × iva/100)
 *     subtotalConIva = baseSinIva + montoIva
 *
 * Identidad que siempre se cumple por línea:
 *     baseSinIva + montoIva = subtotalConIva
 * Totales:
 *     totalSinIva + totalIva = totalPagado
 */

export interface LineaIvaInput {
  cantidad: number;
  montoUnitario: number;
  porcentajeIva: number;
  ivaIncluido: boolean;
}

export interface LineaIvaResultado {
  /** Monto de la línea sin IVA (base imponible). */
  baseSinIva: number;
  /** IVA de la línea. */
  montoIva: number;
  /** Subtotal de la línea con IVA (cantidad × monto unitario). */
  subtotalConIva: number;
}

const redondear = (n: number): number => Math.round(n);

const numeroValido = (n: unknown): number => {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
};

/**
 * Calcula base sin IVA, IVA y subtotal con IVA de una línea de compra.
 * Función única y reutilizable (frontend + referencia para el backend).
 */
export function calcularLineaIva(input: LineaIvaInput): LineaIvaResultado {
  const cantidad = numeroValido(input.cantidad);
  const montoUnitario = numeroValido(input.montoUnitario);
  const porcentajeIva = Math.min(Math.max(numeroValido(input.porcentajeIva), 0), 100);
  const ivaIncluido = !!input.ivaIncluido;

  const subtotalSinIvaCalculado = redondear(cantidad * montoUnitario);

  if (ivaIncluido) {
    // El subtotal de la línea es cantidad × monto (ya con IVA adentro).
    const subtotalConIva = subtotalSinIvaCalculado;
    const baseSinIva = redondear(subtotalConIva / (1 + porcentajeIva / 100));
    const montoIva = subtotalConIva - baseSinIva;
    return { baseSinIva, montoIva, subtotalConIva };
  }

  const baseSinIva = subtotalSinIvaCalculado;
  const montoIva = redondear((baseSinIva * porcentajeIva) / 100);
  const subtotalConIva = baseSinIva + montoIva;
  return { baseSinIva, montoIva, subtotalConIva };
}

export interface TotalesIva {
  /** Suma de baseSinIva de todas las líneas. */
  totalSinIva: number;
  /** Suma de montoIva de todas las líneas. */
  totalIva: number;
  /** Suma de subtotalConIva de todas las líneas (= totalSinIva + totalIva). */
  totalPagado: number;
}

/**
 * Suma los totales de una lista de líneas ya calculadas con `calcularLineaIva`.
 */
export function sumarTotales(lineas: LineaIvaResultado[]): TotalesIva {
  return lineas.reduce<TotalesIva>(
    (acc, l) => ({
      totalSinIva: acc.totalSinIva + l.baseSinIva,
      totalIva: acc.totalIva + l.montoIva,
      totalPagado: acc.totalPagado + l.subtotalConIva,
    }),
    { totalSinIva: 0, totalIva: 0, totalPagado: 0 },
  );
}
