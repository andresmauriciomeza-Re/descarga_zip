import type { EstadoGestion } from "@/features/purchase-orders/utils/purchase-orders";
import type { ModoIva } from "@/features/purchases/services/vat";

export const SERIF = "var(--font-titulo)";

export const ESTADO_CONFIG: Record<EstadoGestion, string> = {
  "Recibido":   "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  "Anulado":    "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
};

export function fmtCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

// ─── NUEVA COMPRA ─────────────────────────────────────────────────────────────

export const iCls =
  "w-full px-3 py-2.5 min-h-[2.875rem] bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

// Anchos compactos de los campos superiores, en línea con el detalle de Orden de Compra
export const campoCortoCls = "max-w-[11.25rem]"; // Fecha de factura · Estado

/** Sección con título pequeño en mayúsculas y línea divisoria: mismo estilo
 *  que el formulario Nuevo Proveedor. */

/** Labels de las guías: 13px en gris oscuro (pantalla completa). */
export const labelPaginaCls = "block text-[0.8125rem] leading-tight font-medium text-foreground/70 mb-1";

export const labelModalCls = "block text-xs font-semibold text-muted-foreground mb-1.5";

/** Detalle de compra (vista): rejilla compacta de resumen — label pequeño en
 *  mayúsculas gris y valor en negrita, sin cards anidadas. */
export const labelDatoCls =
  "block text-[0.6875rem] leading-none font-bold uppercase tracking-widest text-muted-foreground mb-1.5";

export const valorDatoCls = "block text-sm font-semibold text-foreground break-words";

/** Inputs en pantalla completa: mismo estilo que `iCls` pero con 2.875rem
 *  EXACTOS, como la fila de insumos y el selector de IVA ( así todos los controles del formulario miden lo mismo). */
export const iPaginaCls =
  "w-full h-[2.875rem] px-3 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

/** P14: qué se está agregando a la factura de compra. Mismos valores que
 *  `OrdenItem.tipoItem`, para que el dato guardado sea compatible con las
 *  compras que nacen de una Orden de Compra. */
export type TipoItem = "insumo" | "producto";

export type ItemFactura = {
  rowId: string;
  idInsumo: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  costoUnitario: number;
  precioUnitario: number;
  /** Porcentaje de IVA de la línea (0–100). */
  iva: number;
  /** Modo real de IVA por línea. */
  modoIva?: ModoIva;
  /** Valores guardados de la línea (se recalculan en el backend). */
  baseSinIva?: number;
  montoIva?: number;
  /** P14: insumo del catálogo o producto del módulo de productos. */
  tipoItem?: TipoItem;
  /** Precio de VENTA al público del producto (sólo `tipoItem === "producto"`).
   *  Se copia del catálogo al agregar el ítem y se muestra como
   *  "Producto · Venta: $ X" bajo el nombre. Opcional: las líneas antiguas
   *  y las de insumos no lo traen. */
  precioVenta?: number;
  /** Ajuste de bebidas: unidades que trae la paca/caja de ESTA línea (12 si
   *  se compró "Paca x12"). Opcional: las líneas viejas y las de unidad
   *  suelta no lo traen y se leen como 1. */
  unidadesPorEmpaque?: number;
  /** Presentaciones (regla 2.2): cuántas unidades base trae la presentación
   *  en que se compró la línea (p. ej. 20 si la factura la trae en "paca").
   *  Viaja al backend como `factor_presentacion`; opcional para las líneas
   *  en unidad base o en presentaciones ya configuradas del insumo. */
  factorPresentacion?: number;
  unidadBase?: string;
  /** Peso exacto del insumo (900 ml): sólo para la etiqueta de la tabla. */
  pesoMedida?: number | null;
  /** Bebidas: tamaño de una unidad ("400 ml"), sólo para la etiqueta. */
  tamanoUnidad?: string;
  stockApiAplicado?: boolean;
  stockApiRevertido?: boolean;
  stockApiPendiente?: boolean;
  stockApiPendienteReversa?: boolean;
};

export interface NuevaCompraData {
  proveedor: string;
  proveedorId?: string;
  numeroFactura: string;
  fechaFactura: string;
  valorTotal: number;
  estado: EstadoGestion;
  items: ItemFactura[];
  /** Suma de las bases (sin IVA) de las líneas. */
  subtotalSinIva: number;
  /** Suma del IVA de las líneas. */
  totalIva: number;
  /** Total pagado = subtotalSinIva + totalIva (= valorTotal). */
  totalPagado: number;
}
