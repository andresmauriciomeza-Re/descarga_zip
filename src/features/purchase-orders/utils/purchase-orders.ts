import type { ModoIva } from "@/features/purchases/services/vat";
import type { TipoPersona } from "@/features/suppliers/hooks/useSupplierForm";
import type { EstadoOption } from "@/shared/components/StatusSelect";
import { calcularLineaIva, sumarTotales } from "@/features/purchases/services/vat";

// ��������� TYPES ���������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

export type EstadoOrden = "Borrador" | "Enviado" | "Completado" | "Anulado";

export type EstadoGestion = "Recibido" | "Anulado";

export interface OrdenItem {
  rowId: string;
  idInsumo: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  costoUnitario: number;
  precioUnitario: number;
  /** Porcentaje de IVA de la línea (0–100). */
  iva?: number;
  /** Compras (IVA): base imponible de la línea guardada al crear la factura.
   *  Se recalcula en el backend con la misma fórmula (ver
   *  la fórmula de IVA del backend (src/utils/compras.js → calcularImporteLinea)). */
  baseSinIva?: number;
  /** Compras (IVA): valor del IVA de la línea en pesos. */
  montoIva?: number;
  /** Tratamiento de IVA propio de la línea; líneas antiguas usan "incluido". */
  modoIva?: ModoIva;
  /** true = insumo agregado en recepción (no venía en la OC original) */
  esNoSolicitado?: boolean;
  /** P14: qué es el ítem de la factura: insumo del catálogo o producto del
   *  módulo de productos. Opcional para no romper las órdenes/compras ya
   *  guardadas (se leen como insumo). */
  tipoItem?: "insumo" | "producto";
  /** Precio de VENTA al público del producto (catálogo de productos). Sólo
   *  se llena cuando `tipoItem === "producto"` y sirve para mostrar
   *  "Producto · Venta" en el detalle de la compra. Opcional: la Orden de
   *  Compra NO lo captura (se crea desde el catálogo de insumos/productos
   *  sin precio de venta) y las líneas antiguas no lo traen. */
  precioVenta?: number;
  /** Ajuste de bebidas: unidades que trae la paca/caja de ESTA línea (12 si
   *  la bebida se pidió en "Paca x12"). Opcional: las líneas viejas y las de
   *  unidad suelta no lo traen y se leen como 1. */
  unidadesPorEmpaque?: number;
  /** Compras (presentaciones, regla 2.2): cantidad de la línea convertida a
   *  la unidad base del insumo y esa unidad base (los deriva el backend al
   *  guardar; de solo lectura para el panel). */
  unidadesBase?: number;
  unidadBase?: string;
  /** Compras (presentaciones, regla 2.2): cuántas unidades base trae cada
   *  unidad de la línea, si la presentación la tiene configurada. */
  factorPresentacion?: number;
  /** Estado línea-a-línea del puente temporal con Productos API. */
  stockApiAplicado?: boolean;
  stockApiRevertido?: boolean;
  stockApiPendiente?: boolean;
  stockApiPendienteReversa?: boolean;
  subtotal?: number;
  cantidadRecibida?: number;
  cantidadPendiente?: number;
  facturado?: boolean;
  idCategoriaInsumo?: number;
  esNuevoInsumo?: boolean;
}

export interface ItemRecibido {
  rowId: string;
  idInsumo: string;
  nombre: string;
  cantidadSolicitada: number;
  cantidadPendiente?: number;
  unidadesPendientesBase?: number;
  pendiente?: number;
  facturado?: boolean;
  idCategoriaInsumo?: number;
  esNuevoInsumo?: boolean;
  cantidadRecibida: number;
  unidad: string;
  unidadSolicitada?: string;
  precioReferencia: number;
  costoUnitario: number;
  precioUnitario: number;
  iva?: number;
  ivaAntesDeExento?: number;
  /** IVA por línea (regla 2.1). */
  modoIva?: ModoIva;
  /** P14: de qué catálogo salió la línea. Las filas pedidas en la OC ya
   *  heredan su `tipoItem`; los "no solicitados" de Recepción pueden ser
   *  insumo o producto según el selector. Opcional: las líneas antiguas se
   *  leen como insumo. */
  tipoItem?: "insumo" | "producto";
  /** Precio de VENTA al público del producto, para mostrar "Producto ·
   *  Venta" en el detalle. Sólo aplica a líneas de tipo producto. */
  precioVenta?: number;
  /** Ajuste de bebidas: unidades por paca/caja de la línea (las filas de la
   *  OC heredan el empaque). Opcional: se lee como 1 si no viene. */
  unidadesPorEmpaque?: number;
  /** Compras (presentaciones, regla 2.2): cantidad recibida en la unidad
   *  base del insumo y esa unidad base (los deriva el backend). */
  unidadesBase?: number;
  unidadBase?: string;
  factorPresentacion?: number;
}

export interface Recepcion {
  items: ItemRecibido[];
  itemsExtra: ItemRecibido[];
  usarLotes: boolean;
  fechaRecepcion: string;
}

export interface OrdenCompra {
  id: string;
  proveedor: string;
  fecha: string;
  estado: EstadoOrden;
  items: OrdenItem[];
  recepcion?: Recepcion;
  proveedorNit?: string;
  total?: number;
  facturado?: number;
  porFacturar?: number;
  totalFacturas?: number;
  facturas?: string[];
  motivoAnulacion?: string;
  historialEstados?: { estado: EstadoOrden; fechaHora: string; motivo?: string | null }[];
}

export interface GestionCompra {
  id: string;
  ordenId: string;
  proveedor?: string;
  proveedorId?: string;
  numeroFactura: string;
  fechaFactura: string;
  valorTotal: number;
  estado: EstadoGestion;
  items?: OrdenItem[];
  compraCreada?: boolean;
  /** Compras (IVA): suma de las bases imponibles (sin IVA) de las líneas. */
  subtotalSinIva?: number;
  /** Compras (IVA): suma del IVA de las líneas. */
  totalIva?: number;
  /** Compras (IVA): total pagado = subtotalSinIva + totalIva (= valorTotal). */
  totalPagado?: number;
  /** Punto 6: trazabilidad de la anulación. El motivo es obligatorio en la UI
   *  (botón "Anular" deshabilitado mientras esté vacío) y la fecha queda en el
   *  mismo instante del cambio de estado. */
  motivoAnulacion?: string;
  fechaAnulacion?: string;
}

// ��������� CONSTANTS ������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

export interface ProveedorRef {
  id: string;
  nombre: string;
  nit: string;
  asesorComercial: string;
  telefono: string;
  email: string;
  direccion: string;
  estado: "activo" | "inactivo";
  /** Punto 12: opcional para no romper los registros heredados (semillas y
   *  datos guardados antes del campo); el alta siempre lo trae. "" = sin
   *  elegir todavía (solo posible en el formulario, nunca en lo guardado). */
  tipoPersona?: TipoPersona | "";
}

/**
 * Clave normalizada de un estado: sin tildes, sin espacios y en minúsculas.
 * Así "Bórrador", " BORRADOR " y "borrador" se comparan igual (los datos
 * pueden llegar así desde la base).
 */
export const claveEstado = (estado?: string) =>
  (estado ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();

export const SERIF = "var(--font-titulo)";

export const ESTADO_CONFIG: Record<EstadoOrden, string> = {
  Borrador: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
  Enviado: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  Completado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  Anulado: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
};

/**
 * La Orden de Compra solo avanza: desde cada estado se ofrecen los siguientes.
 * Los estados finales (Completado/Anulado) quedan con una única opción y el
 * selector deshabilitado.
 */
export const ESTADOS_ADELANTE: Record<EstadoOrden, EstadoOrden[]> = {
  Borrador: ["Borrador", "Enviado", "Anulado"],
  // Enviado puede pasar a Completado A MANO (con confirmación); el cambio
  // automático por recepción completa se mantiene igual.
  Enviado: ["Enviado", "Completado", "Anulado"],
  Completado: ["Completado"],
  Anulado: ["Anulado"],
};

/** Opciones del selector de estado de una orden, con el color de su badge. */
export const opcionesEstado = (estado: EstadoOrden): EstadoOption<EstadoOrden>[] =>
  ESTADOS_ADELANTE[estado].map((e) => ({ value: e, label: e, color: ESTADO_CONFIG[e] }));

/**
 * Ancho compartido por los formularios de Orden de Compra y de Gestión de Compras,
 * para que ambos módulos se vean igual de compactos.
 */
export const FORM_MAXW = "max-w-4xl";

/** Ancho del contenido cuando el formulario va a pantalla completa (no modal):
 *  ocupa casi todo el panel para que las dos columnas (40 % / 60 %) quepan en
 *  1366×768 sin scroll. */
export const FORM_MAXW_PAGINA = "max-w-[1200px]";

/** Inputs en pantalla completa: mismo estilo que `iCls` pero con 40px EXACTOS
 *  (py-2.5 + border da 42px), igual que la fila de insumos y el pie. */
export const iPaginaCls =
  "w-full h-10 max-md:min-h-11 px-3 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

// ��������� HELPERS ������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

export function fmtCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function calcularIvaLineaOrden(item: OrdenItem) {
  return calcularLineaIva({
    cantidad: item.cantidad,
    montoUnitario: item.precioUnitario ?? item.costoUnitario,
    porcentajeIva: item.iva ?? 0,
    modoIva: item.modoIva ?? "incluido",
  });
}

export function totalLineaOrden(item: OrdenItem) {
  return calcularIvaLineaOrden(item).subtotalConIva;
}

export function calcTotal(items: OrdenItem[]) {
  return sumarTotales(items.map(calcularIvaLineaOrden)).totalPagado;
}

export const iCls = "w-full px-3 py-2.5 max-md:min-h-11 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

// ��������� ORDEN MODAL ������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

export interface OrdenFormData {
  proveedor: string;
  fecha: string;
  estado: EstadoOrden | EstadoGestion;
  items: OrdenItem[];
  numeroFactura?: string;
}

/**
 * Payload que emite `NuevoInsumoModal` al guardar: el insumo nace con tipo
 * "Insumo" en el catálogo y se selecciona en "Agregar insumo".
 */
export type NuevoInsumoCreado = {
  id: string;
  nombre: string;
  unidadMedida: string;
  precioUnitario: number;
  iva: number;
  /** Bloque 3: categoría obligatoria del catálogo de insumos (A5.1). */
  categoriaId: string;
};

export const PROVEEDORES_INIT: ProveedorRef[] = [];

/** Sección con título pequeño en mayúsculas y línea divisoria: mismo estilo
 *  que el formulario Nuevo Proveedor. */

// ��������� INITIAL DATA ���������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

export const INITIAL_ORDENES: OrdenCompra[] = [];

export const INITIAL_GESTIONES: GestionCompra[] = [
  {
    id: "001",
    ordenId: "",
    proveedor: "Distribuidora La Cosecha",
    proveedorId: "6",
    numeroFactura: "FAC-2026-0301",
    fechaFactura: "2026-08-05",
    valorTotal: 410000,
    estado: "Recibido",
    items: [
      { rowId: "g001-1", idInsumo: "INS-001", nombre: "Tomate", cantidad: 40, unidad: "kg", costoUnitario: 7500, precioUnitario: 7500, iva: 0 },
      { rowId: "g001-2", idInsumo: "INS-002", nombre: "Cebolla", cantidad: 10, unidad: "kg", costoUnitario: 6500, precioUnitario: 6500, iva: 0 },
      { rowId: "g001-3", idInsumo: "INS-003", nombre: "Papa", cantidad: 15, unidad: "kg", costoUnitario: 3000, precioUnitario: 3000, iva: 0 },
    ],
  },
  {
    id: "002",
    ordenId: "",
    proveedor: "Quesos del Norte S.A.S.",
    proveedorId: "7",
    numeroFactura: "FAC-2026-0318",
    fechaFactura: "2026-08-19",
    valorTotal: 560000,
    estado: "Recibido",
    items: [
      { rowId: "g002-1", idInsumo: "INS-011", nombre: "Queso mozzarella", cantidad: 20, unidad: "kg", costoUnitario: 18000, precioUnitario: 18000, iva: 0 },
      { rowId: "g002-2", idInsumo: "INS-012", nombre: "Queso gouda", cantidad: 20, unidad: "kg", costoUnitario: 10000, precioUnitario: 10000, iva: 0 },
    ],
  },
  {
    id: "003",
    ordenId: "",
    proveedor: "Carnes Premium Ltda.",
    proveedorId: "8",
    numeroFactura: "FAC-2026-0329",
    fechaFactura: "2026-09-01",
    valorTotal: 190000,
    estado: "Anulado",
    items: [
      { rowId: "g003-1", idInsumo: "INS-021", nombre: "Res madurada", cantidad: 25, unidad: "kg", costoUnitario: 7600, precioUnitario: 7600, iva: 0 },
    ],
  },
  {
    id: "004",
    ordenId: "",
    proveedor: "Bebidas y Más",
    proveedorId: "9",
    numeroFactura: "FAC-2026-0347",
    fechaFactura: "2026-09-12",
    valorTotal: 275500,
    estado: "Recibido",
    items: [
      { rowId: "g004-1", idInsumo: "INS-031", nombre: "Gaseosa cola 1.5 L", cantidad: 60, unidad: "und", costoUnitario: 3200, precioUnitario: 3200, iva: 0 },
      { rowId: "g004-2", idInsumo: "INS-032", nombre: "Agua en bolsa 500 ml", cantidad: 100, unidad: "und", costoUnitario: 835, precioUnitario: 835, iva: 0 },
    ],
  },
  {
    id: "005",
    ordenId: "",
    proveedor: "Molinos del Valle",
    proveedorId: "1",
    numeroFactura: "FAC-2026-0360",
    fechaFactura: "2026-09-20",
    valorTotal: 750000,
    estado: "Recibido",
    items: [
      { rowId: "g005-1", idInsumo: "INS-041", nombre: "Harina de trigo", cantidad: 50, unidad: "kg", costoUnitario: 6000, precioUnitario: 6000, iva: 0 },
      { rowId: "g005-2", idInsumo: "INS-042", nombre: "Azúcar rubia", cantidad: 25, unidad: "kg", costoUnitario: 5200, precioUnitario: 5200, iva: 0 },
      { rowId: "g005-3", idInsumo: "INS-043", nombre: "Aceite vegetal", cantidad: 32, unidad: "lt", costoUnitario: 10000, precioUnitario: 10000, iva: 0 },
    ],
  },
];
