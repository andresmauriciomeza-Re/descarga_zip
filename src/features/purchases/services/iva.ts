/**
 * Utilidad única de cálculo de IVA para Compras.
 *
 * Esta es la ÚNICA implementación de la fórmula en el frontend: tanto el
 * formulario de compra como la recepción y la vista de detalle deben
 * importar `calcularLineaIva` (no reimplementar la cuenta).
 *
 * El backend usa exactamente la misma fórmula y el mismo redondeo
 * (`sivpro-backend/src/utils/compras.js` → `calcularImporteLinea` y
 * `redondearDosDecimales` en `src/utils/insumos.js`).
 *
 * Reglas por modo de IVA (regla 2.1, catálogo `MODOS_IVA`):
 * - 'incluido' → el monto unitario YA incluye el IVA:
 *     subtotal = round(cantidad × montoUnitario)
 *     baseSinIva = round(subtotal / (1 + iva/100))
 *     montoIva   = round(subtotal − baseSinIva)
 * - 'mas_iva'  → el monto unitario es la base; el IVA se suma aparte:
 *     baseSinIva = round(cantidad × montoUnitario)
 *     montoIva   = round(baseSinIva × iva/100)
 *     subtotal   = round(baseSinIva + montoIva)
 * - 'exento'   → tarifa 0 % aunque la línea traiga otro porcentaje:
 *     baseSinIva = subtotal = round(cantidad × montoUnitario), montoIva = 0
 *
 * Retrocompatibilidad: si la línea no trae `modoIva`, se usa el booleano
 * `ivaIncluido` (true → 'incluido', false → 'mas_iva') y, si tampoco hay
 * booleano, 'incluido' (el valor por defecto). Así las pantallas viejas, que
 * solo pasan `ivaIncluido`, siguen calculando igual que antes.
 *
 * Redondeo: 2 decimales en TODAS las operaciones, idéntico al del backend
 * (`Math.round((valor + Number.EPSILON) * 100) / 100`).
 *
 * Identidad que siempre se cumple por línea:
 *     baseSinIva + montoIva = subtotalConIva
 * Totales:
 *     totalSinIva + totalIva = totalPagado
 */

/** Tratamiento de IVA por línea (catálogo `MODOS_IVA` del backend). */
export type ModoIva = "incluido" | "mas_iva" | "exento";

/** Los tres modos permitidos, en el mismo orden que el backend. */
export const MODOS_IVA: readonly ModoIva[] = ["incluido", "mas_iva", "exento"];

export const ETIQUETA_MODO_IVA: Record<ModoIva, { etiqueta: string; ayuda: string }> = {
  incluido: { etiqueta: "IVA incluido", ayuda: "el monto ya trae el IVA" },
  mas_iva: { etiqueta: "IVA adicional", ayuda: "el IVA se suma al monto" },
  exento: { etiqueta: "Sin IVA", ayuda: "no lleva IVA" },
};

export const ayudaModoIva = (modo: ModoIva): string => {
  const { etiqueta, ayuda } = ETIQUETA_MODO_IVA[modo];
  return `${etiqueta}: ${ayuda}`;
};

export const formatearModoIva = (modo: ModoIva, porcentaje?: number): string =>
  modo === "exento"
    ? ETIQUETA_MODO_IVA[modo].etiqueta
    : porcentaje == null
      ? "Ingresa el IVA."
      : `${ETIQUETA_MODO_IVA[modo].etiqueta} ${porcentaje} %`;

export const formatearModoIvaEnTabla = (modo: ModoIva, porcentaje?: number): string =>
  formatearModoIva(modo, porcentaje).replace(/ %$/, "\u00a0%");

export const formatearChipIva = (modo: ModoIva, porcentaje: number): string => {
  if (modo === "exento") return ETIQUETA_MODO_IVA[modo].etiqueta;
  return modo === "mas_iva" ? `+${porcentaje} %` : `Incl. ${porcentaje} %`;
};

/**
 * Punto 8: SOLO el modo de IVA para la línea bajo el nombre en las tablas de
 * Nueva Compra y Orden de Compra — "IVA incluido" | "IVA adicional" |
 * "Sin IVA", SIN porcentaje ni números.
 *
 * No cambia `formatearModoIva`/`formatearModoIvaEnTabla` porque esas salidas
 * las sigue usando Recepción de compra.
 */
export const etiquetaModoIvaSimple = (modo: ModoIva): string =>
  ETIQUETA_MODO_IVA[modo].etiqueta;

/**
 * Punto 8: texto de la columna IVA de Compra/Orden SIN el prefijo "Incl.":
 * `19 %` (incluido), `+19 %` (adicional) y `Sin IVA` (exento).
 * `formatearChipIva` conserva "Incl. 19 %" para Recepción.
 */
export const chipIvaSinPrefijo = (modo: ModoIva, porcentaje: number): string => {
  if (modo === "exento") return ETIQUETA_MODO_IVA[modo].etiqueta;
  return modo === "mas_iva" ? `+${porcentaje} %` : `${porcentaje} %`;
};

export interface LineaIvaInput {
  cantidad: number;
  montoUnitario: number;
  porcentajeIva: number;
  /** Modo de IVA de la línea (IVA por ítem). Si viene, manda sobre el
   *  booleano `ivaIncluido`. Acepta también booleano por comodidad
   *  (true → 'incluido', false → 'mas_iva'). */
  modoIva?: ModoIva | boolean | null;
  /** Retrocompatibilidad: true → 'incluido', false → 'mas_iva'. Si la línea
   *  no trae `modoIva`, este booleano decide (era el único input antes). */
  ivaIncluido?: boolean | null;
}

export interface LineaIvaResultado {
  /** Monto de la línea sin IVA (base imponible). */
  baseSinIva: number;
  /** IVA de la línea. */
  montoIva: number;
  /** Subtotal de la línea con IVA (cantidad × monto unitario). */
  subtotalConIva: number;
}

/** Redondeo a 2 decimales, idéntico al `redondearDosDecimales` del backend. */
export const redondearDosDecimales = (valor: number): number =>
  Math.round((Number(valor) + Number.EPSILON) * 100) / 100;

const numeroValido = (n: unknown): number => {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
};

/**
 * Normaliza cualquier entrada a uno de `MODOS_IVA`. Acepta booleanos por
 * retrocompatibilidad (true → 'incluido', false → 'mas_iva'); null/undefined/
 * vacío cae en 'incluido' (el valor por defecto). Lanza error si el valor no
 * es válido (mismo criterio que el backend, que responde 400).
 */
export function normalizarModoIva(valor: unknown): ModoIva {
  if (valor === true) return "incluido";
  if (valor === false) return "mas_iva";
  if (valor === undefined || valor === null || valor === "") return "incluido";
  if (typeof valor === "string" && MODOS_IVA.includes(valor.trim() as ModoIva)) {
    return valor.trim() as ModoIva;
  }
  throw new Error(
    `El modo de IVA «${String(valor)}» no es válido. Use: ${MODOS_IVA.join(", ")}.`,
  );
}

/**
 * Retrocompatibilidad (regla 2.1): si la línea no trae `modoIva`, se toma el
 * IVA global (true → 'incluido', false → 'mas_iva') y, si tampoco hay
 * global, 'incluido'.
 */
export function resolverModoIva(
  item: { modoIva?: ModoIva | boolean | null } | null | undefined,
  ivaIncluidoGlobal?: boolean | null,
): ModoIva {
  const modo = item?.modoIva;
  // String() evita la comparación TS contra "" cuando el tipo es booleano;
  // "" significa "sin modo" y cae en el global, igual que en el backend.
  if (modo !== undefined && modo !== null && String(modo) !== "") return normalizarModoIva(modo);
  if (typeof ivaIncluidoGlobal === "boolean") return ivaIncluidoGlobal ? "incluido" : "mas_iva";
  return "incluido";
}

/**
 * Dato derivado (regla 2.1): `tb_compras.iva_incluido` es opcional. true si
 * todas las líneas son 'incluido', false si todas son 'mas_iva' y null si hay
 * mezcla o alguna línea exenta. Mismo criterio que el backend.
 */
export function derivarIvaIncluidoGlobal(
  items: Array<{ modoIva?: ModoIva | boolean | null }> | null | undefined,
  ivaIncluidoGlobal?: boolean | null,
): boolean | null {
  const lista = Array.isArray(items) ? items : [];
  if (!lista.length) {
    return typeof ivaIncluidoGlobal === "boolean" ? ivaIncluidoGlobal : null;
  }
  const modos = lista.map((item) => resolverModoIva(item, ivaIncluidoGlobal));
  if (modos.every((modo) => modo === "incluido")) return true;
  if (modos.every((modo) => modo === "mas_iva")) return false;
  return null;
}

/**
 * Calcula base sin IVA, IVA y subtotal con IVA de una línea de compra.
 * Función única y reutilizable (frontend + referencia para el backend).
 *
 * El porcentaje se limita a 0–100 (mismo dominio que valida el backend).
 */
export function calcularLineaIva(input: LineaIvaInput): LineaIvaResultado {
  const cantidad = numeroValido(input.cantidad);
  const montoUnitario = numeroValido(input.montoUnitario);
  const modo = resolverModoIva({ modoIva: input.modoIva }, input.ivaIncluido);
  const porcentajeIva =
    modo === "exento"
      ? 0
      : Math.min(Math.max(numeroValido(input.porcentajeIva), 0), 100);

  if (modo === "incluido") {
    // El subtotal de la línea es cantidad × monto (IVA adentro).
    const subtotalConIva = redondearDosDecimales(cantidad * montoUnitario);
    const baseSinIva = redondearDosDecimales(subtotalConIva / (1 + porcentajeIva / 100));
    const montoIva = redondearDosDecimales(subtotalConIva - baseSinIva);
    return { baseSinIva, montoIva, subtotalConIva };
  }

  const baseSinIva = redondearDosDecimales(cantidad * montoUnitario);
  const montoIva = redondearDosDecimales((baseSinIva * porcentajeIva) / 100);
  const subtotalConIva = redondearDosDecimales(baseSinIva + montoIva);
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
 * Cada total se redondea a 2 decimales (como hace el backend al persistir).
 */
export function sumarTotales(lineas: LineaIvaResultado[]): TotalesIva {
  const acumulado = lineas.reduce<TotalesIva>(
    (acc, l) => ({
      totalSinIva: acc.totalSinIva + l.baseSinIva,
      totalIva: acc.totalIva + l.montoIva,
      totalPagado: acc.totalPagado + l.subtotalConIva,
    }),
    { totalSinIva: 0, totalIva: 0, totalPagado: 0 },
  );
  return {
    totalSinIva: redondearDosDecimales(acumulado.totalSinIva),
    totalIva: redondearDosDecimales(acumulado.totalIva),
    totalPagado: redondearDosDecimales(acumulado.totalPagado),
  };
}
