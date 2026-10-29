import React, { useState, useMemo, useRef, useEffect } from "react";
// Bloque 3: el "+ Crear insumo" comparte el mismo catálogo de categorías
// obligatorias (A5.1) que usa Gestión de Insumos.
import { CATEGORIAS_INSUMO, type CategoriaInsumo, type Insumo } from "@/features/insumos/pages/GestionInsumosScreen";
import { crearInsumo, mensajeErrorInsumos } from "@/features/insumos/services/insumosApi";
import type { Producto } from "@/features/productos/pages/GestionProductosScreen";
// Bloque 2: "+ Crear producto" con el mismo modal que Nueva Compra y
// Recepción (reemplaza al NuevoProductoModal local, que se eliminó).
import { CrearProductoModal } from "@/features/productos/components/CrearProductoModal";
import type { CategoriaProducto } from "@/features/categoria-productos/pages/CategoriaProductoScreen";
import { motion, AnimatePresence } from "motion/react";
import { CompactInsumoForm, UNIDADES, type InsumoSuggestion } from "@/features/compras/components/CompactInsumoForm";
import { InsumosSolicitadosTable, type InsumoSolicitadoRow } from "@/features/compras/components/InsumosSolicitadosTable";
import { EstadoSelect, type EstadoOption } from "@/shared/components/EstadoSelect";
import { UnidadSelect } from "@/features/compras/components/UnidadSelect";
// Bloque 3 (A5.2): el modal de Nuevo Insumo usa la MISMA lista de unidades
// (con etiqueta larga) que Crear Insumo en Gestión de Insumos.
import { UNIDADES_INSUMO } from "@/shared/utils/unidades";
// Bloque 3: comparación de nombres (sin tildes ni mayúsculas) y nombre con
// mayúscula inicial, compartidos con Gestión de Insumos y Productos.
import { mismoNombre, nombreLimpio, nombreParaGuardar } from "@/shared/utils/nombres";
import { EstadoHistorialTooltip } from "@/features/compras/components/EstadoHistorialTooltip";
import { SegmentadoButtons } from "@/shared/components/SegmentadoButtons";
import { useProveedorForm, soloLetras, nombreGuardado, datosNuevosProveedor, contactoGuardado, type TipoPersona, type ProveedorFormValues } from "@/features/compras/hooks/useProveedorForm";
import { crearProveedor, mensajeErrorProveedores } from "@/features/proveedores/services/proveedoresApi";
import { ProveedorFormCampos } from "@/features/compras/components/ProveedorForm";
import { TipoPersonaSelector } from "@/features/compras/components/TipoPersonaSelector";
import {
  Plus, Search, Eye, Pencil, Trash2, X, ArrowLeft,
  AlertCircle, Send, Ban, Check, ClipboardCheck,
  AlertTriangle, CheckCircle2, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { exportarMultiExcelEstilizado, exportarOrdenesConInsumosExcel, type OrdenConInsumos } from "@/shared/utils/exportExcelEstilizado";
import { limpiarNumeroInput, numeroDeInput } from "@/shared/utils/numeroInput";
import { aplicarStockCompra, historialCompraDe, type SetCatalogo } from "@/features/compras/services/inventario";
import {
  actualizarOrdenCompra,
  cambiarEstadoOrdenCompra,
  crearOrdenCompra,
  mensajeErrorOrdenesCompra,
  obtenerOrdenCompra,
} from "@/features/orden-compra/services/ordenesCompraApi";
import { listarCompras } from "@/features/compras/services/comprasApi";
import {
  contenidoDe,
  empaqueDe,
  nombreBuscable,
  presentacionCompra,
} from "@/shared/utils/presentacion";
import { BotonDescargarExcel } from "@/shared/components/BotonDescargarExcel";
import { SearchInput } from "@/shared/components/SearchInput";
import { ActionIcons, CLASE_BASE, CLASE_HOVER } from "@/shared/components/ActionIcons";
import { Paginador } from "@/shared/components/Paginador";

const SERIF = "var(--font-titulo)";

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
  iva: number;
  /** Compras (IVA): base imponible de la línea guardada al crear la factura.
   *  Se recalcula en el backend con la misma fórmula (ver
   *  `db/migracion_iva_compras.sql`). */
  baseSinIva?: number;
  /** Compras (IVA): valor del IVA de la línea en pesos. */
  montoIva?: number;
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
  pendiente?: number;
  facturado?: boolean;
  idCategoriaInsumo?: number;
  esNuevoInsumo?: boolean;
  cantidadRecibida: number;
  unidad: string;
  precioReferencia: number;
  costoUnitario: number;
  precioUnitario: number;
  iva: number;
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
  /** Compras (IVA): true = los montos unitarios de la factura ya traen el IVA
   *  incluido ("Sí, IVA incluido"). Las compras antiguas, sin el campo, se
   *  leen como "Sí, IVA incluido" con IVA 0 % (se ven igual que antes). */
  ivaIncluido?: boolean;
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

export const PROVEEDORES_INIT: ProveedorRef[] = [];

const ESTADO_CONFIG: Record<EstadoOrden, string> = {
  Borrador: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
  Enviado: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  Completado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  Anulado: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
};

/**
 * Clave normalizada de un estado: sin tildes, sin espacios y en minúsculas.
 * Así "Bórrador", " BORRADOR " y "borrador" se comparan igual (los datos
 * pueden llegar así desde la base).
 */
const claveEstado = (estado?: string) =>
  (estado ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();

/**
 * Sólo las órdenes en Borrador se pueden editar: es la condición del lápiz en
 * el listado, del guard de entrada al formulario y de la validación al guardar.
 */
const esBorrador = (estado?: string) => claveEstado(estado) === "borrador";

/** Ancho reservado del botón de editar (p-1.5 + ícono w-4 = 28px) para que,
    en las filas sin lápiz, los iconos [Ver] [Editar] [OC] sigan alineados. */
const SLOT_EDITAR = "block shrink-0 p-1.5 w-7 h-7";

/**
 * La Orden de Compra solo avanza: desde cada estado se ofrecen los siguientes.
 * Los estados finales (Completado/Anulado) quedan con una única opción y el
 * selector deshabilitado.
 */
const ESTADOS_ADELANTE: Record<EstadoOrden, EstadoOrden[]> = {
  Borrador: ["Borrador", "Enviado", "Anulado"],
  // Enviado puede pasar a Completado A MANO (con confirmación); el cambio
  // automático por recepción completa se mantiene igual.
  Enviado: ["Enviado", "Completado", "Anulado"],
  Completado: ["Completado"],
  Anulado: ["Anulado"],
};

/** Opciones del selector de estado de una orden, con el color de su badge. */
const opcionesEstado = (estado: EstadoOrden): EstadoOption<EstadoOrden>[] =>
  ESTADOS_ADELANTE[estado].map((e) => ({ value: e, label: e, color: ESTADO_CONFIG[e] }));

/**
 * Ancho compartido por los formularios de Orden de Compra y de Gestión de Compras,
 * para que ambos módulos se vean igual de compactos.
 */
export const FORM_MAXW = "max-w-4xl";
/** Ancho del contenido cuando el formulario va a pantalla completa (no modal):
 *  ocupa casi todo el panel para que las dos columnas (40 % / 60 %) quepan en
 *  1366×768 sin scroll. */
const FORM_MAXW_PAGINA = "max-w-[1200px]";
/** Inputs en pantalla completa: mismo estilo que `iCls` pero con 40px EXACTOS
 *  (py-2.5 + border da 42px), igual que la fila de insumos y el pie. */
const iPaginaCls =
  "w-full h-10 px-3 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
/** Sección con título pequeño en mayúsculas y línea divisoria: mismo estilo
 *  que el formulario Nuevo Proveedor. */
const seccionCls =
  "text-[11px] leading-none font-bold uppercase tracking-widest text-muted-foreground pb-1.5 border-b border-border";

// ��������� INITIAL DATA ���������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

export const INITIAL_ORDENES: OrdenCompra[] = [];
const _INITIAL_ORDENES_SEED_REMOVED: OrdenCompra[] = [
  {
    id: "001",
    proveedor: "Molinos del Valle",
    fecha: "2024-02-05",
    estado: "Enviado",
    historialEstados: [{ estado: "Enviado", fechaHora: "2024-02-05" }],
    items: [
      { rowId: "r1", idInsumo: "INS-001", nombre: "Harina de trigo", cantidad: 100, unidad: "kg", costoUnitario: 3500, precioUnitario: 3500, iva: 0 },
      { rowId: "r2", idInsumo: "INS-006", nombre: "Levadura", cantidad: 5000, unidad: "g", costoUnitario: 80, precioUnitario: 80, iva: 0 },
    ],
  },
  {
    id: "002",
    proveedor: "Lácteos La Esperanza",
    fecha: "2024-02-08",
    estado: "Enviado",
    historialEstados: [{ estado: "Enviado", fechaHora: "2024-02-08" }],
    items: [
      { rowId: "r3", idInsumo: "INS-002", nombre: "Queso mozzarella", cantidad: 20, unidad: "kg", costoUnitario: 18000, precioUnitario: 18000, iva: 0 },
      { rowId: "r4", idInsumo: "INS-005", nombre: "Aceite de oliva", cantidad: 10, unidad: "lt", costoUnitario: 15000, precioUnitario: 15000, iva: 0 },
    ],
  },
  {
    id: "003",
    proveedor: "Distribuidora Sur",
    fecha: "2024-02-10",
    estado: "Borrador",
    historialEstados: [{ estado: "Borrador", fechaHora: "2024-02-10" }],
    items: [
      { rowId: "r5", idInsumo: "INS-003", nombre: "Salsa de tomate", cantidad: 30, unidad: "lt", costoUnitario: 5000, precioUnitario: 5000, iva: 0 },
      { rowId: "r6", idInsumo: "INS-004", nombre: "Pepperoni", cantidad: 15, unidad: "kg", costoUnitario: 22000, precioUnitario: 22000, iva: 0 },
    ],
  },
  {
    id: "004",
    proveedor: "Carnes Premium",
    fecha: "2024-02-01",
    estado: "Completado",
    historialEstados: [{ estado: "Completado", fechaHora: "2024-02-01" }],
    items: [
      { rowId: "r7", idInsumo: "INS-008", nombre: "Jamón serrano", cantidad: 10, unidad: "kg", costoUnitario: 28000, precioUnitario: 28000, iva: 0 },
    ],
    recepcion: {
      fechaRecepcion: "2024-02-02",
      usarLotes: false,
      items: [
        { rowId: "rr1", idInsumo: "INS-008", nombre: "Jamón serrano", cantidadSolicitada: 10, cantidadRecibida: 10, unidad: "kg", precioReferencia: 28000, costoUnitario: 28000, precioUnitario: 28000, iva: 0 },
      ],
      itemsExtra: [],
    },
  },
  {
    id: "005",
    proveedor: "Verduras Express",
    fecha: "2024-01-28",
    estado: "Anulado",
    historialEstados: [{ estado: "Anulado", fechaHora: "2024-01-28" }],
    items: [
      { rowId: "r8", idInsumo: "INS-007", nombre: "Champiñones", cantidad: 25, unidad: "kg", costoUnitario: 12000, precioUnitario: 12000, iva: 0 },
    ],
  },
];

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

// ��������� HELPERS ������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

function fmtCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function calcTotal(items: OrdenItem[]) {
  return items.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0);
}

function nextOrdenId(items: OrdenCompra[]) {
  const nums = items.map(i => parseInt(i.id, 10)).filter(x => !isNaN(x));
  return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
}

function addDays(d: string, days: number) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + days);
  // Fecha local, no UTC: `dt` se movió en hora local, así que `toISOString()`
  // lo convertía a UTC y en Colombia (UTC-5) devolvía el día anterior.
  return dt.toLocaleDateString("en-CA");
}

/** Formatea fecha/hora en formato: 30/09/2026 3:45 p. m. */
function formatearFechaHora(fechaHora: string): string {
  try {
    // "2026-10-01" (solo fecha) se parsea como UTC y en Colombia (UTC-5)
    // caería al día anterior a las 7 p. m.: se lee como hora local.
    const esSoloFecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaHora.trim());
    const d = esSoloFecha ? new Date(`${fechaHora.trim()}T00:00:00-05:00`) : new Date(fechaHora);
    if (isNaN(d.getTime())) return fechaHora;
    const fecha = d.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Bogota",
    });
    const hora = d.toLocaleTimeString("es-CO", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Bogota",
    });
    return `${fecha} ${hora}`;
  } catch {
    return fechaHora;
  }
}

/**
 * Fecha CON hora del último cambio de estado (01/10/2026 8:35 p. m.), la que se
 * muestra bajo el badge en el listado. Las órdenes sin historial caen en su
 * fecha de creación.
 */
function fechaUltimoCambio(o: OrdenCompra): string {
  const historial = o.historialEstados ?? [];
  const ultimo = historial[historial.length - 1];
  return formatearFechaHora(ultimo ? ultimo.fechaHora : o.fecha);
}

// ��������� SHARED UI ��������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

function EstadoBadge({ e }: { e: EstadoOrden }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ESTADO_CONFIG[e]}`}>
      {e}
    </span>
  );
}

const iCls = "w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

// ��������� CONFIRM MODAL ������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

export function ConfirmModal({
  title, body, detail, confirmLabel = "Confirmar", danger = false, icon, onConfirm, onCancel, showMotivo = false, motivo, onMotivoChange, loading = false,
}: {
  // `body` es opcional: hay confirmaciones que solo llevan `detail` como
  // advertencia (p. ej. "¿Está seguro de los cambios?"). Antes era obligatorio y
  // esas 3 llamadas fallaban el typecheck mientras en runtime pintaban un <p> vacío.
  title: string; body?: string; detail?: string; confirmLabel?: string;
  danger?: boolean; icon?: React.ReactNode; onConfirm: () => void; onCancel: () => void;
  showMotivo?: boolean; motivo?: string; onMotivoChange?: (value: string) => void;
  loading?: boolean;
}) {
  // Punto 6: sin motivo no hay anulación. Mientras el campo esté vacío el botón
  // de confirmación queda bloqueado y el aviso se mantiene visible (no aparece
  // solo tras un clic fallido).
  const motivoVacio = showMotivo && !(motivo ?? "").trim();

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border"
      >
        {icon && <div className="mb-3">{icon}</div>}
        <h3 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: SERIF }}>{title}</h3>
        {body && <p className="text-sm text-muted-foreground mb-1 leading-relaxed">{body}</p>}
        {detail && (
          <p className={`text-sm font-semibold mb-5 ${danger ? "text-red-600" : "text-amber-600"}`}>{detail}</p>
        )}
        {!detail && <div className="mb-5" />}
        {showMotivo && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Motivo de anulación</label>
            <textarea
              value={motivo || ""}
              onChange={e => onMotivoChange?.(e.target.value)}
              placeholder="Escribe el motivo de la anulación..."
              className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              rows={3}
            />
            {/* Punto 6: aviso permanente mientras el motivo siga vacío. */}
            {motivoVacio && (
              <p className="text-xs font-semibold text-red-600 mt-1.5">
                Debes escribir el motivo de la anulación
              </p>
            )}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={motivoVacio || loading}
            aria-disabled={motivoVacio || loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
              motivoVacio
                ? "bg-red-300 cursor-not-allowed"
                : "cursor-pointer active:scale-95 " + (danger ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-red-700")
            }`}
          >
            {loading ? "Guardando…" : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ��������� NUEVO PROVEEDOR MODAL ������������������������������������������������������������������������������������������������������������������������������������������������������������

export function NuevoProveedorModal({
  onGuardar, onClose, nombreInicial = "", existentes = [],
}: {
  onGuardar: (p: ProveedorRef) => void;
  onClose: () => void;
  nombreInicial?: string;
  /** Punto 1: proveedores ya existentes. Sirven para dos cosas: detectar NIT
      repetido con las mismas reglas del módulo Proveedores y generar el id
      numérico del nuevo registro (mismo cálculo que "Crear Proveedor"). */
  existentes?: ProveedorRef[];
}) {
  // Punto 1: mismas validaciones que el formulario del módulo Proveedores
  // (useProveedorForm). El nombre llega del buscador y se filtra con las
  // reglas del formulario para no arrancar con un valor inválido.
  const nombreSemilla = soloLetras(nombreInicial);
  const form = useProveedorForm(
    {
      nombre: nombreSemilla,
      nombres: nombreSemilla,
      razonSocial: nombreInicial.trim(),
      nit: "",
      telefono: "",
      email: "",
      asesorComercial: "",
      direccion: "",
      estado: "activo",
      // Punto 3.1: igual que el alta del módulo Proveedores, el formulario
      // arranca con "Persona Natural" preseleccionado (el control segmentado
      // permite cambiar a Jurídica en un toque).
      tipoPersona: "Persona Natural",
    },
    existentes,
  );
  /** "Guardando…" mientras habla la API: bloquea el doble clic. */
  const [guardando, setGuardando] = useState(false);

  const submit = async () => {
    if (guardando) return;
    // Fase 2: el botón NO envía con errores. Se pintan todos los mensajes que
    // falten y el foco va al primer campo inválido (el DOM se recorre en orden
    // visual gracias a `data-prov-campo`).
    if (form.enfocarPrimeroInvalido()) {
      toast.error("Revisa los campos del formulario");
      return;
    }
    setGuardando(true);
    try {
      const v = form.values;
      // Bloque 3: el proveedor se da de alta contra la API (con el id real que
      // devuelve el servidor) y el resto de la app lo recibe ya mapeado.
      // `contactoGuardado` es el MISMO mapeo del módulo Proveedores: en
      // Jurídica toma el Contacto comercial y en Natural llena asesor/teléfono/
      // email con los datos del propio proveedor (el backend los exige).
      const creado = await crearProveedor({
        id: "",
        nombre: nombreGuardado(v),
        nit: v.nit.trim(),
        ...contactoGuardado(v),
        direccion: v.direccion.trim(),
        estado: v.estado,
        tipoPersona: v.tipoPersona,
        ...datosNuevosProveedor(v),
      });
      onGuardar(creado);
    } catch (error) {
      const mensaje = mensajeErrorProveedores(error, "No se pudo crear el proveedor.");
      const visible = (campo: string) => !!document.querySelector(`[data-prov-campo="${campo}"]`);
      let campo: keyof ProveedorFormValues | null = null;
      if (/nit/i.test(mensaje) && visible("nit")) campo = "nit";
      else if (/documento/i.test(mensaje) && visible("numeroDocumento")) campo = "numeroDocumento";
      else if (/correo|email/i.test(mensaje)) {
        if (visible("contactoEmail")) campo = "contactoEmail";
        else if (visible("email")) campo = "email";
      }
      if (campo) {
        form.setErrorServidor(campo, mensaje);
        const el = document.querySelector<HTMLElement>(`[data-prov-campo="${campo}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus();
      } else {
        toast.error(mensaje);
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        // Sin borde exterior (estilo "sin cards con borde"): la separación la
        // dan las líneas divisorias del encabezado y del pie.
        className="bg-card rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)]"
      >
        {/* Encabezado FIJO: título + subtítulo y, en la misma fila a la
            derecha (o abajo en móvil), el selector Persona Natural / Persona Jurídica. */}
        <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-3 border-b border-border shrink-0">
          <div className="min-w-[180px] flex-1">
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Nuevo Proveedor</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Completa la información de contacto del proveedor.</p>
          </div>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <TipoPersonaSelector
              valor={form.values.tipoPersona}
              onChange={(tipo) => {
                form.marcarTocado("tipoPersona");
                form.setCampo("tipoPersona", tipo);
              }}
              error={form.obtenerError("tipoPersona")}
            />
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Único contenedor con scroll dentro del modal (prohibido scroll doble). */}
        <div className="px-4 sm:px-6 py-5 overflow-y-auto flex-1 min-h-0">
          {/* Punto 1: mismo formulario de proveedor que el módulo Proveedores. */}
          <ProveedorFormCampos form={form} />
        </div>
        <div className="flex justify-end gap-3 px-4 sm:px-6 py-3 border-t border-border shrink-0">
          <button onClick={onClose} className="px-5 h-10 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => void submit()}
            // Fase 2: habilitado siempre; si hay errores, `submit` los pinta y
            // enfoca el primero en lugar de guardar.
            disabled={guardando}
            className="px-5 h-10 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary transition-all"
          >
            {guardando ? "Guardando…" : "Crear Proveedor"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

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

/** Construye el Insumo que nace desde "+ Crear insumo": entra al catálogo como
 *  tipo "Insumo" con stocks en cero y CON la categoría elegida en el modal
 *  (bloque 3: antes quedaba vacía y había que reclasificarlo a mano). */
export function insumoDeAlta(ins: NuevoInsumoCreado): Insumo {
  return {
    id: ins.id,
    nombre: ins.nombre,
    unidadMedida: ins.unidadMedida,
    costoUnitario: ins.precioUnitario,
    precioUnitario: ins.precioUnitario,
    iva: ins.iva,
    tipo: "Insumo",
    stockActual: 0,
    stockMinimo: 0,
    categoriaId: ins.categoriaId,
    estado: "activo",
  };
}

export function OrdenModal({
  mode, orden, proveedores, insumos, productos, categorias, tipo = "orden", fullPage = false, onClose, onGuardar, onNuevoProveedor,
  onCrearInsumo,
  onCrearProducto,
  categoriasInsumo,
}: {
  mode: "create" | "edit" | "view";
  orden?: OrdenCompra;
  proveedores: ProveedorRef[];
  insumos: Insumo[];
  /** Punto 3.3: catálogo de productos del módulo de Productos — la otra mitad
   *  del selector "Tipo" (Insumo | Producto) del formulario. */
  productos?: Producto[];
  /** Bloque 2: categorías del panel para el "+ Crear producto" (sólo las de
   *  tipo "Producto terminado" se ofrecen). */
  categorias?: CategoriaProducto[];
  /** "orden" = Orden de Compra · "compra" = Compra (Gestión de Compra) */
  tipo?: "orden" | "compra";
  /** Renderiza el formulario como una página independiente en vez de modal. */
  fullPage?: boolean;
  onClose: () => void;
  onGuardar: (d: OrdenFormData) => void | Promise<void>;
  onNuevoProveedor: (p: ProveedorRef) => string;
  /** Punto 5: crea el insumo en el catálogo (tipo "Insumo") desde "+ Crear insumo". */
  onCrearInsumo?: (ins: NuevoInsumoCreado) => void;
  /** Bloque 2.2: categorías de insumos desde la API para el modal de alta. */
  categoriasInsumo?: CategoriaInsumo[];
  /** Crea el producto en el catálogo (tipo "Producto terminado") desde
   *  "+ Crear producto" (bloque 2): recibe el Producto COMPLETO que arma
   *  CrearProductoModal (precio 0, sin imagen, "No disponible"). */
  onCrearProducto?: (prod: Producto) => Promise<Producto>;
}) {
  const isView = mode === "view";
  const isCompra = tipo === "compra";
  const isPage = fullPage;
  // Fecha local, no UTC: `toISOString()` en Colombia (UTC-5) después de las 19:00
  // daba el día siguiente, y `today` es el `max` del date-picker de vencimiento.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  const [form, setForm] = useState<OrdenFormData>({
    proveedor: orden?.proveedor ?? "",
    fecha: orden?.fecha ?? today,
    estado: isCompra
      ? "Recibido"
      : (orden?.estado === "Enviado" ? "Enviado" : "Borrador"),
    items: orden?.items.map(i => ({ ...i })) ?? [],
    numeroFactura: "",
  });
  const pf = (p: Partial<OrdenFormData>) => setForm(f => ({ ...f, ...p }));

  const [showNuevoProv, setShowNuevoProv] = useState(false);
  const [showNuevoInsumo, setShowNuevoInsumo] = useState(false);
  const [showNuevoProducto, setShowNuevoProducto] = useState(false);
  const [showSendConf, setShowSendConf] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Historial de cambios de estado
  const [estadoHistorial, setEstadoHistorial] = useState<{ estado: EstadoOrden; fecha: string }[]>(() => {
    if (orden?.estado) {
      return [{ estado: orden.estado, fecha: orden.fecha }];
    }
    return [{ estado: "Borrador" as EstadoOrden, fecha: today }];
  });

  // Buscador de proveedor (autocomplete por nombre, NIT, asesor o email)
  const [provQuery, setProvQuery] = useState(mode === "create" ? "" : (orden?.proveedor ?? ""));
  const [showProvSug, setShowProvSug] = useState(false);
  const provRef = useRef<HTMLDivElement>(null);

  /** Cerrar: vuelve directo al listado sin confirmación. */
  const salir = () => {
    onClose();
  };

  const provSugs = useMemo(() => {
    const q = provQuery.trim().toLowerCase();
    const base = q
      ? proveedores.filter(p =>
          p.nombre.toLowerCase().includes(q) ||
          p.nit.toLowerCase().includes(q) ||
          p.asesorComercial.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
        )
      : proveedores;
    return base.slice(0, 3);
  }, [proveedores, provQuery]);

  const provExiste = useMemo(
    () => provSugs.length > 0,
    [provSugs]
  );

  const [aNombre, setANombre] = useState("");
  const [aCant, setACant] = useState(1);
  const [aUnidad, setAUnidad] = useState(UNIDADES[0]);
  // Ajuste de bebidas: unidades por paca/caja de la línea que se está
  // agregando (undefined = unidad suelta). Se carga del producto elegido y
  // se guarda en `OrdenItem.unidadesPorEmpaque`.
  const [aEmpaque, setAEmpaque] = useState<number | undefined>(undefined);
  const [aPrecio, setAPrecio] = useState(0);
  const [aIva, setAIva] = useState(0);
  const [aFromCat, setAFromCat] = useState(false);
  // Punto 3.3: tipo de ítem del formulario (botones Insumo | Producto). Por
  // defecto "insumo", como manda el plan.
  const [aTipoItem, setATipoItem] = useState<"insumo" | "producto">("insumo");
  // Id del insumo elegido del catálogo. Antes `addItem` fabricaba
  // `idInsumo: INS-${Date.now()}`, un id que no existía en el catálogo: se perdía
  // el enlace que Recepción usa para no volver a ofrecer un insumo ya recibido y
  // para agrupar las líneas por insumo.
  const [aInsumoId, setAInsumoId] = useState("");
  const [aShowSug, setAShowSug] = useState(false);
  const sugRef = useRef<HTMLDivElement>(null);

  // Estado para edición de fila (lápiz de la tabla en modo pantalla completa)
  const [editando, setEditando] = useState<string | null>(null);
  const nombreRef = useRef<HTMLInputElement>(null);

  // ������ Validación en tiempo real (patrón de MiPerfilScreen) ������������������������������������������������������
  const [tocado, setTocado] = useState({ proveedor: false, fecha: false });
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  // En "compra" el estado siempre trae un valor por defecto.
  const errorProveedor = form.proveedor.trim()
    ? undefined
    : "Selecciona o crea un proveedor.";
  const errorFecha = form.fecha ? undefined : "Selecciona la fecha de la orden.";
  const errorNumeroFactura =
    isCompra && !form.numeroFactura?.trim()
      ? "El número de factura es obligatorio."
      : undefined;
  const errorItems = form.items.length > 0 ? undefined : "Agrega al menos un ítem a la orden.";

  const formValido =
    !errorProveedor && !errorFecha && !errorNumeroFactura && !errorItems && !!form.estado;
  const algunoTocado = tocado.proveedor || tocado.fecha;
  const marcarTocado = (campo: "proveedor" | "fecha") =>
    setTocado((t) => ({ ...t, [campo]: true }));

  /** Labels: 13px en gris oscuro en pantalla completa; xs gris en el modal. */
  const labelCls = isPage
    ? "block text-[13px] leading-tight font-medium text-foreground/70 mb-1"
    : "block text-xs font-semibold text-muted-foreground mb-1.5";

  /** Clase del input: resalta en rojo cuando el campo visible es inválido. */
  const campoCls = (error?: string) =>
    `${isPage ? iPaginaCls : iCls} transition-colors ${error ? "border-red-400 focus:ring-red-300" : ""}`;

  const suggestions = useMemo<InsumoSuggestion[]>(() => {
    const q = aNombre.trim().toLowerCase();

    // Punto 3.3: el buscador mira un catálogo u otro según el tipo de ítem
    // elegido (mismo criterio que la Nueva compra).
    if (aTipoItem === "producto") {
      // Punto 3.2: sólo se compran "Producto terminado" (bebidas y reventa).
      // Con sólo `estado === "Disponible"` entraban también Pizzas y Lasañas,
      // que son "Producto insumo" (se producen, no se compran al proveedor).
      // Bloque 2.5: se compran productos aunque estén "No disponible" (los
      // recién creados con "+ Crear producto" nacen así); sólo se excluyen
      // los DESCONTINUADOS, que ya no vuelven a comprarse.
      const base = (productos ?? []).filter(
        (p) => p.estado !== "Descontinuado" && p.tipo === "Producto terminado",
      );
      // El buscador mira también el contenido ("coca 1.5") para distinguir
      // presentaciones del mismo producto.
      const filtrados = q
        ? base.filter((p) => nombreBuscable(p).toLowerCase().includes(q))
        : base;
      // Corrección 4 (punto B1) + ajuste: el monto de un producto en la OC es
      // su `costoUnitario` (POR UNIDAD en el catálogo) por las unidades de la
      // presentación: con "Paca x12" se pide el precio de la paca. Si viene
      // en 0 queda vacío y el usuario lo escribe. NUNCA se usa el precio de
      // venta como monto.
      return filtrados.slice(0, 3).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        contenido: contenidoDe(p) || undefined,
        unidadMedida: presentacionCompra(p),
        costoUnitario: Number(p.costoUnitario || 0) * empaqueDe(p),
      }));
    }

    const soloInsumos = insumos.filter(i => (i.tipo ?? "Insumo") === "Insumo" && i.estado === "activo");
    if (q.length === 0) return soloInsumos.slice(0, 3);
    return soloInsumos.filter(i => i.nombre.toLowerCase().includes(q)).slice(0, 3);
  }, [insumos, productos, aNombre, aTipoItem]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (sugRef.current && !sugRef.current.contains(e.target as Node)) setAShowSug(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (provRef.current && !provRef.current.contains(e.target as Node)) setShowProvSug(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const selectSug = (ins: Insumo) => {
    // Punto 2: el precio del catálogo viene en `costoUnitario` (number), que es
    // el mismo que muestra la lista desplegable. `precioUnitario` es null en las
    // semillas, por eso el Monto unitario quedaba en 0.
    setANombre(ins.nombre);
    setAUnidad(UNIDADES.includes(ins.unidadMedida) ? ins.unidadMedida : UNIDADES[0]);
    setAPrecio(Number(ins.costoUnitario ?? ins.precioUnitario ?? 0));
    setAIva(Number(ins.iva ?? 0));
    setAInsumoId(ins.id);
    setAFromCat(true);
    setAShowSug(false);
  };

  /** Punto 3.3: catálogo de productos. Igual que con el insumo, se copian
   *  nombre, unidad de venta y monto; el producto no tiene IVA propio, así
   *  que sin historial la línea queda en 0 % y el usuario puede ajustarlo en
   *  el formulario (con historial de compra se trae ese %).
   *  Corrección 4: el monto es `costoUnitario` (o 0 = vacío para escribirlo);
   *  el precio de venta NUNCA se usa como monto. */
  const seleccionarProducto = (p: Producto) => {
    setANombre(p.nombre);
    // Ajuste de bebidas: la Medida (solo lectura) muestra la presentación
    // de compra y la línea guarda el empaque de la paca/caja.
    setAUnidad(presentacionCompra(p));
    const factor = empaqueDe(p);
    setAEmpaque(factor > 1 ? factor : undefined);
    // Corrección 4: el monto es `costoUnitario` (POR UNIDAD) por las
    // unidades de la presentación — con "Paca x12" el precio de la paca —
    // o 0 = vacío para escribirlo; el precio de venta NUNCA es el monto.
    // Ajuste: con historial de compra se precarga el último monto SIN IVA y
    // su % (la OC no suma IVA); sin historial (productos viejos) manda el
    // costo del catálogo por presentación, como siempre.
    // Punto C2: si existe `montoDigitado` (el monto TAL CUAL digitado, sin
    // convertir) manda ÉL; `montoSinIva` queda como fallback.
    const hist = historialCompraDe(p);
    setAPrecio(
      hist ? (hist.montoDigitado ?? hist.montoSinIva) : Number(p.costoUnitario || 0) * factor
    );
    setAIva(hist ? hist.iva : 0);
    setAInsumoId(p.id);
    setAFromCat(true);
    setAShowSug(false);
  };

  // Punto 5: "+ Crear insumo" (primera opción del combo). Crea el insumo en el
  // catálogo vía el padre y lo selecciona en "Agregar insumo" con su unidad,
  // monto e IVA — igual que si se hubiera elegido una sugerencia existente.
  const handleNuevoInsumo = (ins: NuevoInsumoCreado) => {
    onCrearInsumo?.(ins);
    setANombre(ins.nombre);
    setAUnidad(UNIDADES.includes(ins.unidadMedida) ? ins.unidadMedida : UNIDADES[0]);
    setAPrecio(ins.precioUnitario);
    setAIva(ins.iva);
    setAInsumoId(ins.id);
    setAFromCat(true);
    setAShowSug(false);
    setShowNuevoInsumo(false);
    toast.success(`Insumo "${ins.nombre}" creado`);
  };

  const handleNuevoProducto = async (prod: Producto) => {
    const creado = await onCrearProducto?.(prod);
    if (!creado) throw new Error("No se pudo crear el producto en el servidor.");
    // Bloque 2: se selecciona como si viniera del desplegable — presentación,
    // empaque y monto salen del propio producto y queda listo para la fila.
    seleccionarProducto(creado);
    setAShowSug(false);
    setShowNuevoProducto(false);
    toast.success(`Producto "${creado.nombre}" creado`);
    return creado;
  };

  const addItem = () => {
    // Modo edición (lápiz de la tabla): la fila está cargada arriba, así que
    // solo se reemplaza y se deja el formulario listo para el siguiente.
    if (editando) {
      if (!aNombre.trim()) { toast.error("Ingresa el nombre del ítem."); return; }
      if (form.items.some(i => i.rowId !== editando && (i.tipoItem ?? "insumo") === aTipoItem && i.nombre.toLowerCase() === aNombre.trim().toLowerCase())) {
        toast.error("Este ítem ya está en la orden.");
        return;
      }
      actualizarItem(editando, {
        nombre: aNombre.trim(),
        cantidad: aCant,
        // Unidad de la fila: "und" si la medida quedó vacía (producto sin
        // elegir); con presentación cargada va "Paca x12" tal cual.
        unidad: aUnidad.trim() || "und",
        precioUnitario: aPrecio,
        iva: aIva,
        // Punto 3.3: el ítem puede haber cambiado de catálogo (insumo ↔
        // producto) mientras estaba cargado en el formulario.
        tipoItem: aTipoItem,
        // Ajuste: el empaque sólo aplica a producto; al quitarlo se limpia.
        unidadesPorEmpaque:
          aTipoItem === "producto" && aEmpaque && aEmpaque > 1 ? aEmpaque : undefined,
        ...(aInsumoId ? { idInsumo: aInsumoId } : {}),
      });
      limpiarFilaInsumo();
      return;
    }

    if (!aNombre.trim()) { toast.error("Ingresa el nombre del ítem."); return; }
    if (form.items.some(i => (i.tipoItem ?? "insumo") === aTipoItem && i.nombre.toLowerCase() === aNombre.trim().toLowerCase())) {
      toast.error("Este ítem ya está en la orden.");
      return;
    }
    // Se conserva el id del catálogo cuando la línea viene de una sugerencia; si
    // el nombre se escribió a mano se genera uno secuencial. `Date.now()` no sirve
    // como id de fila: dos additions en el mismo milisegundo colisionaban.
    const nextRow = form.items.reduce((max, i) => {
      const n = parseInt(i.rowId.replace(/^r/, ""), 10);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0) + 1;
    pf({
      items: [...form.items, {
        rowId: `r${nextRow}`,
        idInsumo: aInsumoId || `INS-M-${nextRow}`,
        nombre: aNombre.trim(),
        cantidad: aCant,
        // Medida: "und" si no se eligió nada (producto a mano); con un ítem
        // del catálogo elegido trae su unidad / presentación de compra.
        unidad: aUnidad.trim() || "und",
        costoUnitario: aPrecio,
        precioUnitario: aPrecio,
        iva: aIva,
        // Punto 3.3: la fila guarda de qué catálogo salió (insumo/producto).
        tipoItem: aTipoItem,
        // Ajuste de bebidas: sólo las líneas de producto en paca/caja
        // guardan el empaque (unidad suelta ⇒ sin el dato, se lee como 1).
        ...(aTipoItem === "producto" && aEmpaque && aEmpaque > 1
          ? { unidadesPorEmpaque: aEmpaque }
          : {}),
      }],
    });
    limpiarFilaInsumo();
  };

  /** Deja la fila "Agregar insumo" lista para el siguiente insumo: campos en
   *  cero, sin modo edición y foco de vuelta en el buscador de Nombre.
   *  Ajuste: la Medida (solo lectura) vuelve a vacía para producto y a
   *  `UNIDADES[0]` para insumo — igual que al abrir el formulario — y el
   *  empaque se limpia siempre. El tipo que se guarda por closure puede ser
   *  el VIEJO al cambiar Insumo/Producto, así que quien cambia el tipo pasa
   *  el nuevo EXPLÍCITO (nunca se usa como callback directo). */
  const limpiarFilaInsumo = (tipo: "insumo" | "producto" = aTipoItem) => {
    setANombre(""); setACant(1); setAPrecio(0); setAIva(0);
    setAUnidad(tipo === "producto" ? "" : UNIDADES[0]);
    setAEmpaque(undefined);
    setAFromCat(false); setAInsumoId(""); setAShowSug(false);
    setEditando(null);
    nombreRef.current?.focus();
  };

  /** Lápiz de la tabla: carga el ítem en el formulario "Agregar ítem" de la
   *  izquierda (con su tipo y su empaque de paca/caja, para poder
   *  actualizarlos). El botón pasa a "Guardar cambios" y la fila queda
   *  resaltada en la tabla hasta guardar o cancelar. */
  const editarItem = (row: InsumoSolicitadoRow) => {
    setEditando(row.rowId);
    setATipoItem(row.tipoItem ?? "insumo");
    setANombre(row.nombre);
    setACant(row.cantidad);
    setAUnidad(row.unidad);
    setAEmpaque(row.unidadesPorEmpaque && row.unidadesPorEmpaque > 1 ? row.unidadesPorEmpaque : undefined);
    setAPrecio(row.precioUnitario);
    setAIva(row.iva);
    setAFromCat(false);
    setAShowSug(false);
    nombreRef.current?.focus();
  };

  /** Patch de la línea en edición: conserva TODOS los datos de la fila (id,
   *  nombre, idInsumo, costo...) y sólo pisa los campos del formulario. */
  const actualizarItem = (rowId: string, patch: Partial<OrdenItem>) => {
    pf({
      items: form.items.map((i) =>
        i.rowId === rowId
          ? {
              ...i,
              ...patch,
              // `costoUnitario` es el precio que usan calcTotal, el PDF y las
              // facturas: se mueve junto con `precioUnitario`.
              costoUnitario: patch.precioUnitario ?? i.costoUnitario,
            }
          : i
      ),
    });
  };

  const selectProv = (p: ProveedorRef) => {
    setProvQuery(p.nombre);
    pf({ proveedor: p.nombre });
    setShowProvSug(false);
  };

  const handleNuevoProv = (p: ProveedorRef) => {
    const nombre = onNuevoProveedor(p);
    setProvQuery(nombre);
    pf({ proveedor: nombre });
    setShowNuevoProv(false);
    toast.success(`Proveedor "${nombre}" creado`);
  };

  const handleGuardar = async () => {
    if (guardando) return;
    setIntentoGuardar(true);

    if (!form.proveedor.trim()) { toast.error("Selecciona o crea un proveedor."); return; }
    if (!form.fecha) { toast.error("Selecciona la fecha de la orden."); return; }
    if (isCompra && !form.numeroFactura?.trim()) { toast.error("El número de factura es obligatorio."); return; }
    if (form.items.length === 0) { toast.error("Agrega al menos un ítem."); return; }
    setGuardando(true);
    try {
      await onGuardar(form);
    } finally {
      setGuardando(false);
    }
  };

  /** Subtítulo de la cabecera (solo cuando aporta algo). */
  const subtitulo =
    isView || mode === "edit"
      ? orden
        ? `${orden.proveedor} · ${orden.fecha}`
        : ""
      : isPage
        ? isCompra
          ? "Registra una factura de proveedor"
          : "Crea una orden de compra para un proveedor"
        : "";

  return (
    <>
      <div
        className={
          isPage
            ? `w-full p-4 ${FORM_MAXW_PAGINA} mx-auto h-full flex flex-col overflow-hidden`
            : "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-hidden"
        }
      >
        <div
          className={
            isPage
              ? "w-full h-full flex flex-col"
              : "h-full flex items-center justify-center p-4"
          }
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`flex flex-col w-full ${isPage ? FORM_MAXW_PAGINA : FORM_MAXW}${
              isPage
                ? " h-full"
                : " max-h-[calc(100dvh-2rem)] bg-card rounded-2xl shadow-2xl border border-border my-4"
            }`}
          >
            {/* Cabecera: ← + título + subtítulo en pantalla completa; X en el
                modal. Volver pide confirmación si hay datos escritos. */}
            <div className={`flex items-center justify-between gap-3 px-5 ${isPage ? "py-1.5" : "py-4"} border-b border-border shrink-0`}>
              <div className="flex items-center gap-3 min-w-0">
                {isPage && (
                  <button
                    onClick={salir}
                    title="Volver"
                    className="shrink-0 p-2 -ml-1 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="min-w-0">
                  <h3
                    className={`${isPage ? "text-lg" : "text-base"} font-bold text-foreground`}
                    style={{ fontFamily: SERIF }}
                  >
                    {mode === "create"
                      ? (isCompra ? "Nueva Compra" : "Nueva Orden de Compra")
                      : mode === "edit" ? `Editar OC ${orden?.id}` : `Orden ${orden?.id}`}
                  </h3>
                  {subtitulo && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitulo}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isView && orden && <EstadoBadge e={orden.estado} />}
                {!isPage && (
                  <button onClick={salir} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div
              className={
                isPage
                  ? "flex-1 min-h-0 px-5 py-3 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden"
                  : "flex-1 min-h-0 px-5 py-5 flex flex-col gap-5 overflow-y-auto"
              }
            >
              {/* Columna IZQUIERDA — formulario (50 %). En el modal es solo un
                  grupo vertical: mantiene el mismo flujo de antes. */}
              <div
                className={
                  isPage
                    ? "w-full lg:w-[50%] shrink-0 lg:pr-6 min-h-0 flex flex-col gap-6 lg:overflow-y-auto"
                    : "flex flex-col gap-5"
                }
              >
              {/* Status banners */}
              {isView && orden?.estado === "Completado" && orden.recepcion && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Recepción guardada el <strong className="ml-1">{orden.recepcion.fechaRecepcion}</strong>. Esta orden ya no es editable.
                </div>
              )}
              {isView && orden?.estado === "Enviado" && (
                <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Orden enviada al proveedor. Pendiente de Recepción.
                </div>
              )}
              {isView && orden?.estado === "Anulado" && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                  <Ban className="w-4 h-4 shrink-0" />
                  Esta orden ha sido anulada.
                </div>
              )}

              {/* Sección 1 — "Datos de la orden" (el título solo existe en
                  pantalla completa; en el modal el `<section>` solo agrupa
                  para mantener el mismo espaciado de antes). */}
              <section className={`flex flex-col ${isPage ? "gap-2 shrink-0" : "gap-5"}`}>
                {isPage && <p className={seccionCls}>Datos de la orden</p>}

                {/* Detalle (vista): 3 columnas. Creación en pantalla completa:
                    Fila 1: Proveedor * (ancho completo)
                    Fila 2: Fecha * | Estado *
                    En el modal se conserva la rejilla de 2/3. */}
                <div
                  className={`grid gap-4 shrink-0 ${
                    isView
                      ? "grid-cols-2 md:grid-cols-3"
                      : isPage
                        ? "grid-cols-1"
                        : "grid-cols-2"
                  }`}
                >
                  <div className="relative col-span-2">
                    <label className={labelCls}>Proveedor {!isView && <span className="text-red-500">*</span>}</label>
                    {isView
                      ? <p className="text-sm font-semibold text-foreground py-2">{form.proveedor}</p>
                      : (
                        <div className="relative" ref={provRef}>
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <input
                            value={provQuery}
                            onChange={e => {
                              setProvQuery(e.target.value);
                              pf({ proveedor: e.target.value });
                              setShowProvSug(true);
                            }}
                            onFocus={() => setShowProvSug(true)}
                            onBlur={() => marcarTocado("proveedor")}
                            placeholder="Buscar por nombre, NIT, asesor o email..."
                            className={`${campoCls((tocado.proveedor || intentoGuardar) ? errorProveedor : undefined)} pl-10`}
                            aria-invalid={!!((tocado.proveedor || intentoGuardar) && errorProveedor)}
                          />
                          {/* Punto 6: el desplegable va por encima de todo el
                              formulario (z-50), para que el badge de Estado no
                              se monte sobre la lista. */}
                          {showProvSug && (
                            <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                              {/* Opción "+ Crear proveedor" PRIMERA */}
                              <button
                                type="button"
                                onMouseDown={e => { e.preventDefault(); setShowProvSug(false); setShowNuevoProv(true); }}
                                className="w-full text-left px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary/10 cursor-pointer inline-flex items-center gap-2 border-b border-border"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Crear proveedor {provQuery.trim() && `"${provQuery.trim()}"`}
                              </button>
                              <hr className="my-0.5 border-border" />
                              {/* Resultados - máximo 3 */}
                              {provSugs.slice(0, 3).map(p => (
                                <button
                                  key={p.nit}
                                  type="button"
                                  onMouseDown={() => selectProv(p)}
                                  className={`w-full text-left px-3 py-2.5 text-xs hover:bg-muted cursor-pointer border-b border-border last:border-0 ${form.proveedor === p.nombre ? "bg-muted/60" : ""}`}
                                >
                                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                                    {p.nombre}
                                    {form.proveedor === p.nombre && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                  </p>
                                  <p className="text-muted-foreground">
                                    NIT {p.nit}
                                    {p.asesorComercial && <> · Asesor: {p.asesorComercial}</>}
                                  </p>
                                </button>
                              ))}
                              {provSugs.length === 0 && (
                                <div className="px-3 py-2.5 text-xs text-muted-foreground text-center border-b border-border">
                                  Sin resultados
                                </div>
                              )}
                              {provSugs.length > 3 && (
                                <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                                  +{provSugs.length - 3} más...
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    {!isView && (tocado.proveedor || intentoGuardar) && errorProveedor && (
                      <p className={isPage ? "absolute left-0 top-full text-xs text-red-500" : "text-xs text-red-500 mt-1 ml-0.5"}>{errorProveedor}</p>
                    )}
                  </div>

                  {!isView && isPage && (
                    <>
                      <div className="relative">
                        <label className={labelCls}>Fecha <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          value={form.fecha}
                          onChange={e => pf({ fecha: e.target.value })}
                          onBlur={() => marcarTocado("fecha")}
                          readOnly
                          className={campoCls((tocado.fecha || intentoGuardar) ? errorFecha : undefined)}
                          aria-invalid={!!((tocado.fecha || intentoGuardar) && errorFecha)}
                        />
                        {(tocado.fecha || intentoGuardar) && errorFecha && (
                          <p className="absolute left-0 top-full text-xs text-red-500">{errorFecha}</p>
                        )}
                        {/* Fecha con hora en gris pequeño debajo del input */}
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {/* Fecha y hora real en zona America/Bogota */}
                          {formatearFechaHora(orden?.historialEstados?.[0]?.fechaHora ?? orden?.fecha ?? new Date().toISOString())}
                        </p>
                      </div>

                      <div className="relative">
                        <label className={labelCls}>Estado <span className="text-red-500">*</span></label>
                        {/* EstadoSelect (Radix) con portal z-[100] */}
                        <EstadoSelect
                          value={form.estado}
                          onChange={(nuevoEstado) => {
                            setEstadoHistorial(prev => [...prev, { estado: nuevoEstado as EstadoOrden, fecha: today }]);
                            pf({ estado: nuevoEstado });
                          }}
                          options={opcionesEstado(form.estado as EstadoOrden)}
                          disabled={mode === "create"}
                        />
                        {estadoHistorial.length > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {estadoHistorial[estadoHistorial.length - 1].fecha}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {!isView && !isPage && (
                    <>
                      <div className="relative">
                        <label className={labelCls}>Fecha <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          value={form.fecha}
                          onChange={e => pf({ fecha: e.target.value })}
                          onBlur={() => marcarTocado("fecha")}
                          readOnly
                          className={campoCls((tocado.fecha || intentoGuardar) ? errorFecha : undefined)}
                          aria-invalid={!!((tocado.fecha || intentoGuardar) && errorFecha)}
                        />
                        {(tocado.fecha || intentoGuardar) && errorFecha && (
                          <p className="text-xs text-red-500 mt-1 ml-0.5">{errorFecha}</p>
                        )}
                      </div>
                      <div onMouseDown={() => setShowProvSug(false)}>
                        <label className={labelCls}>Estado <span className="text-red-500">*</span></label>
                        {/* Punto 6: el trigger va SIN z-index ni position con z. Con
                            `relative z-40` el badge "Borrador" se montaba sobre el
                            desplegable del Proveedor (z-50) y tapaba los resultados.
                            El menú va en portal (z-[100]) y sigue por encima de todo. */}
                        <EstadoSelect
                          value={form.estado}
                          onChange={(nuevoEstado) => {
                            setEstadoHistorial(prev => [...prev, { estado: nuevoEstado as EstadoOrden, fecha: today }]);
                            pf({ estado: nuevoEstado });
                          }}
                          options={opcionesEstado(form.estado as EstadoOrden)}
                          disabled={mode === "create"}
                        />
                        {estadoHistorial.length > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {estadoHistorial[estadoHistorial.length - 1].fecha}
                          </p>
                        )}
                        {mode !== "create" && (
                          <button
                            type="button"
                            onClick={() => {
                              // Mostrar historial completo
                              alert(estadoHistorial.map(h => `${h.estado} - ${h.fecha}`).join('\n'));
                            }}
                            className="text-[11px] text-primary hover:underline mt-0.5"
                          >
                            Ver historial
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* Sección 2 — "Agregar ítem": fila con buscador, stepper y
                  botón en una sola línea. En pantalla completa es el ÚLTIMO
                  bloque de la columna izquierda (la tabla vive en la derecha). */}
              {!isView && (
                <section className={`flex flex-col ${isPage ? "gap-3 shrink-0" : "gap-5"}`}>
                  {/* Punto 2.6: en página el "Tipo" sale del hueco de
                      Medida y sube a la fila de título, a la derecha del
                      título; el formulario ya no lo recibe (`campoExtra` solo
                      en el modal, donde el título sigue dentro de la card). */}
                  {isPage ? (
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className={seccionCls}>Agregar ítem</p>
                      <div className="flex items-center gap-2">
                        <label className="block text-[11px] font-semibold text-muted-foreground">
                          Tipo
                        </label>
                        <SegmentadoButtons
                          valor={aTipoItem}
                          onChange={(valor) => {
                            const nuevo = valor as "insumo" | "producto";
                            if (nuevo === aTipoItem) return;
                            setATipoItem(nuevo);
                            // Al cambiar de catálogo el ítem cargado ya no
                            // sirve: se limpia la fila (la Medida según el
                            // tipo NUEVO) y el buscador empieza a mirar la
                            // otra lista.
                            limpiarFilaInsumo(nuevo);
                          }}
                          opciones={[
                            { valor: "insumo", etiqueta: "Insumo" },
                            { valor: "producto", etiqueta: "Producto" },
                          ]}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className={seccionCls}>Agregar ítem</p>
                  )}
                  <CompactInsumoForm
                    containerRef={sugRef}
                    titulo={isPage ? "" : "Agregar ítem"}
                    nombre={aNombre}
                    onNombreChange={(value) => {
                      setANombre(value);
                      setAFromCat(false);
                      setAInsumoId("");
                      // En producto, escribir a mano suelta la presentación:
                      // la Medida queda vacía y el empaque se limpia.
                      if (aTipoItem === "producto") {
                        setAUnidad("");
                        setAEmpaque(undefined);
                      }
                      setAShowSug(true);
                    }}
                    onNombreFocus={() => setAShowSug(true)}
                    cantidad={aCant}
                    onCantidadChange={setACant}
                    unidad={aUnidad}
                    onUnidadChange={setAUnidad}
                    // Punto 3.3: la Medida es texto de SOLO LECTURA (la define
                    // el ítem del catálogo), en vez del UnidadSelect editable.
                    medidaSoloLectura
                    precio={aPrecio}
                    onPrecioChange={setAPrecio}
                    iva={aIva}
                    onIvaChange={setAIva}
                    onAgregar={addItem}
                    suggestions={suggestions}
                    showSuggestions={aShowSug}
                    onSelectSuggestion={(suggestion) => {
                      if (aTipoItem === "producto") {
                        const p = (productos ?? []).find((x) => x.id === suggestion.id);
                        // Guarda por si el catálogo cambió mientras estaba
                        // abierto el desplegable.
                        if (p) seleccionarProducto(p);
                        return;
                      }
                      selectSug(suggestion as Insumo);
                    }}
                    onCrearInsumo={() => {
                      setAShowSug(false);
                      setShowNuevoInsumo(true);
                    }}
                    onCrearProducto={() => {
                      setAShowSug(false);
                      setShowNuevoProducto(true);
                    }}
                    compacto={isPage}
                    buttonLabel={editando ? "Guardar cambios" : "Agregar"}
                    onCancelar={editando ? () => limpiarFilaInsumo() : undefined}
                    variante="compacta"
                    // Punto 3.3: el atajo "+ Crear insumo/producto" según tipo.
                    ocultarCrearInsumo={aTipoItem === "producto"}
                    ocultarCrearProducto={aTipoItem === "insumo"}
                    placeholder={
                      aTipoItem === "producto" ? "Buscar producto..." : "Buscar insumo..."
                    }
                    // Punto 2.6: el selector de tipo vive en el hueco de
                    // Medida SOLO en el modal; en página ya subió a la fila de
                    // título de arriba, así que no se pasa `campoExtra`.
                    campoExtra={
                      isPage ? undefined : (
                      <div className="min-w-[118px]">
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                          Tipo
                        </label>
                        <SegmentadoButtons
                          valor={aTipoItem}
                          onChange={(valor) => {
                            const nuevo = valor as "insumo" | "producto";
                            if (nuevo === aTipoItem) return;
                            setATipoItem(nuevo);
                            // Al cambiar de catálogo el ítem cargado ya no
                            // sirve: se limpia la fila (la Medida según el
                            // tipo NUEVO) y el buscador empieza a mirar la
                            // otra lista.
                            limpiarFilaInsumo(nuevo);
                          }}
                          opciones={[
                            { valor: "insumo", etiqueta: "Insumo" },
                            { valor: "producto", etiqueta: "Producto" },
                          ]}
                        />
                      </div>
                      )
                    }
                  />
                  {/* Aviso de insumos: en pantalla completa va justo debajo de
                      la fila (solo empuja la tabla al aparecer); en el modal,
                      con el mismo margen de 20px de antes. */}
                  {!isView && errorItems && (algunoTocado || intentoGuardar) && (
                    <p className={`text-xs text-red-500 ${isPage ? "mt-1 ml-0.5" : "mt-5 ml-0.5"}`}>
                      {errorItems}
                    </p>
                  )}
                </section>
              )}
              </div>

              {/* Columna DERECHA (50 %) — ítems de la orden, totales y
                  botones. Separada de la izquierda por una línea vertical. */}
              <div
                className={
                  isPage
                    ? "w-full lg:w-[50%] min-w-0 min-h-0 flex flex-col gap-3 lg:border-l lg:border-border lg:pl-6"
                    : "flex flex-col gap-5"
                }
              >
                {/* Cabecera de la tabla: contador. Punto 3.3: la orden admite
                    insumos Y productos, así que se habla de "ítems". */}
                {isPage && !isView && (
                  <div className="shrink-0">
                    <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-border">
                      <p className="text-[11px] leading-none font-bold uppercase tracking-widest text-muted-foreground">
                        Ítems de la orden
                      </p>
                      <span className="text-xs font-medium text-muted-foreground">
                        {form.items.length} {form.items.length === 1 ? "ítem" : "ítems"}
                      </span>
                    </div>
                  </div>
                )}

              {isView ? (
                <div className="flex flex-col gap-4">
                  {/* Recepcion detail — acumulado de todas las facturas de la OC */}
                  {orden?.recepcion && (
                    <div className="bg-emerald-50/40 rounded-xl border border-emerald-200 overflow-hidden">
                      <div className="px-3 py-2 border-b border-emerald-200 bg-emerald-100/60">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Insumos recibidos</p>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="text-xs text-muted-foreground uppercase tracking-wider">
                          <tr>
                            {["Nombre", "Solicitado", "Recibido", "Unidad", "P. real", "Subtotal"].map(h => (
                              <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-100">
                          {[...orden.recepcion.items, ...orden.recepcion.itemsExtra].map(item => (
                            <tr key={item.rowId}>
                              <td className="px-3 py-2 font-medium text-foreground">
                                {item.nombre}
                                {item.cantidadSolicitada === 0 && (
                                  <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full">
                                    No solicitado
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground text-xs">{item.cantidadSolicitada || "—"}</td>
                              <td className="px-3 py-2 font-semibold">{item.cantidadRecibida}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">{item.unidad}</td>
                              <td className="px-3 py-2">{fmtCOP(item.costoUnitario)}</td>
                              <td className="px-3 py-2 font-semibold">{fmtCOP(item.cantidadRecibida * item.costoUnitario)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-emerald-100/60 border-t border-emerald-200">
                          <tr>
                            <td colSpan={5} className="px-3 py-2 text-xs font-bold text-muted-foreground text-right uppercase">
                              Total recibido
                            </td>
                            <td className="px-3 py-2 text-sm font-bold text-foreground">
                              {fmtCOP([...orden.recepcion.items, ...orden.recepcion.itemsExtra].reduce(
                                (s, i) => s + i.cantidadRecibida * i.costoUnitario, 0
                              ))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                  <InsumosSolicitadosTable
                    items={form.items}
                    showActions={false}
                    enPagina={isPage}
                    className={isPage ? "flex-1 min-h-0" : ""}
                  />
                </div>
              ) : (
                <>
                  <InsumosSolicitadosTable
                    items={form.items}
                    showActions
                    onRemove={(rowId) => {
                      if (editando === rowId) limpiarFilaInsumo();
                      pf({ items: form.items.filter((i) => i.rowId !== rowId) });
                    }}
                    onEdit={editarItem}
                    rowEditando={editando}
                    sinScrollX
                    totalLabel="Total estimado"
                    enPagina={isPage}
                    className={isPage ? "flex-1 min-h-0" : ""}
                    // Punto 3.3: mismas columnas literales que la Nueva compra
                    // (Nombre | Cantidad | Medida | Monto unitario | IVA |
                    // Acciones) — sin Subtotal por fila — y texto vacío en
                    // "ítems" porque la orden admite insumos y productos.
                    titulo="Ítems de la orden"
                    mostrarSubtotal={false}
                    textoVacioPagina="Aún no has agregado ítems"
                  />

                  {/* Acciones: en pantalla completa van al final de ESTA columna
                      (siempre visibles); en el modal siguen en el pie general. */}
                  {isPage && (
                    <div className="flex gap-3 shrink-0 pt-1">
                      <button
                        onClick={salir}
                        className="flex-1 h-10 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleGuardar}
                        disabled={!formValido || guardando}
                        className="flex-1 h-10 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
                      >
                        <Check className="w-4 h-4" />
                        {guardando ? "Guardando…" : mode === "edit" ? "Guardar cambios" : "Guardar"}
                      </button>
                    </div>
                  )}
                </>
              )}
              </div>
            </div>

            {/* Footer del modal — solo en creación; en detalle se cierra con
                la X del encabezado. */}
            {!isView && !isPage && (
              <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
                <button
                  onClick={salir}
                  className="flex-1 h-10 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={!formValido || guardando}
                  className="flex-1 h-10 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
                >
                  <Check className="w-4 h-4" />
                  {guardando ? "Guardando…" : mode === "edit" ? "Guardar cambios" : "Guardar"}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showNuevoProv && (
          <NuevoProveedorModal
            nombreInicial={provQuery.trim()}
            existentes={proveedores}
            onGuardar={handleNuevoProv}
            onClose={() => setShowNuevoProv(false)}
          />
        )}
      </AnimatePresence>
      {/* Punto 5: "+ Crear insumo" abre el modal de alta y, al guardar, el
          insumo queda en el catálogo y seleccionado en "Agregar insumo". */}
      <AnimatePresence>
        {showNuevoInsumo && (
          <NuevoInsumoModal
            nombreInicial={aNombre.trim()}
            insumosExistentes={insumos}
            onGuardar={handleNuevoInsumo}
            categoriasInsumo={categoriasInsumo}
            onClose={() => setShowNuevoInsumo(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showNuevoProducto && (
          <CrearProductoModal
            onClose={() => setShowNuevoProducto(false)}
            onGuardar={handleNuevoProducto}
            nombreInicial={aNombre.trim()}
            productos={productos ?? []}
            categorias={categorias ?? []}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSendConf && (
          <ConfirmModal
            title="¿Confirmas el envío?"
            body={`Enviar OC a ${form.proveedor}.`}
            detail="No podrás editarla después del envío."
            confirmLabel="Enviar"
            icon={
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
            }
            onConfirm={() => { onGuardar(form); setShowSendConf(false); }}
            onCancel={() => setShowSendConf(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ��������� NUEVA ORDEN COMPRA ��� PÁGINA INDEPENDIENTE ���������������������������������������������������������������������������������������������

interface NuevaOrdenCompraPageProps {
  ordenes: OrdenCompra[];
  setOrdenes: React.Dispatch<React.SetStateAction<OrdenCompra[]>>;
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  insumos: Insumo[];
  /** Punto 3.3: catálogo de productos para el selector "Tipo". */
  productos: Producto[];
  /** Bloque 2: categorías y alta de productos desde "+ Crear producto" (el
   *  callback viene de App y agrega al catálogo del panel). */
  categorias?: CategoriaProducto[];
  onCrearProducto?: (p: Producto) => Promise<Producto>;
  /** Bloque 2.2: categorías de insumos desde la API para el modal de alta. */
  categoriasInsumo?: CategoriaInsumo[];
  /** Punto 5: alta de insumos desde "+ Crear insumo" (catálogo, tipo "Insumo"). */
  setInsumos: React.Dispatch<React.SetStateAction<Insumo[]>>;
  onNuevoProveedor?: (p: ProveedorRef) => void;
  onBack: () => void;
  /** Orden a editar (modo edición). Si no se pasa, es modo creación. */
  orden?: OrdenCompra;
}

export function NuevaOrdenCompraPage({
  ordenes,
  setOrdenes,
  proveedores,
  setProveedores,
  insumos,
  productos,
  categorias,
  onCrearProducto,
  categoriasInsumo,
  setInsumos,
  onNuevoProveedor,
  onBack,
  orden,
}: NuevaOrdenCompraPageProps) {
  const isEdit = !!orden;
  // La orden a editar se relee de `ordenes` por id: App guarda una copia en
  // `ordenAEditar` y podría quedar desfasada si el estado cambia después.
  const ordenViva = isEdit ? (ordenes.find(o => o.id === orden?.id) ?? orden) : undefined;

  // Entrada directa a la edición (deep link, botón guardado, etc.): si la orden
  // ya NO está en Borrador no se pinta el formulario, se avisa y se vuelve al
  // listado. Mismo mensaje que la validación de `handleGuardar`.
  // `onBack` es una flecha inline en App (identidad nueva en cada render), así
  // que las deps son sólo el id y el estado de la orden.
  useEffect(() => {
    if (!ordenViva || esBorrador(ordenViva.estado)) return;
    toast.error("Solo se pueden editar órdenes en estado Borrador");
    onBack();
  }, [orden?.id, ordenViva?.estado]);

  // Punto 5: el insumo creado en el formulario pasa al catálogo global.
  const handleCrearInsumo = (ins: NuevoInsumoCreado) =>
    setInsumos(prev => [insumoDeAlta(ins), ...prev]);

  const handleGuardar = async (data: OrdenFormData) => {
    const idProveedor = Number(proveedores.find((p) => p.nombre === data.proveedor)?.id ?? 0);
    if (!idProveedor) {
      toast.error("Elige un proveedor válido para la orden.");
      return;
    }
    const items = data.items.filter((i) => i.idInsumo && i.cantidad > 0);
    try {
      if (isEdit && orden) {
        // Validación backend: solo se puede editar en estado Borrador
        if (!esBorrador(orden.estado)) {
          toast.error("Solo se pueden editar órdenes en estado Borrador");
          return;
        }
        const actualizada = await actualizarOrdenCompra(orden.id, {
          id_proveedor: idProveedor,
          items,
        });
        // El estado se cambia por su transición (PATCH /estado), no al editar.
        const trasEstado =
          data.estado !== actualizada.estado
            ? await cambiarEstadoOrdenCompra(actualizada.id, data.estado as EstadoOrden)
            : actualizada;
        setOrdenes(prev => prev.map(o => o.id === orden.id ? trasEstado : o));
        toast.success(`OC ${orden.id} actualizada`);
      } else {
        const creada = await crearOrdenCompra({
          id_proveedor: idProveedor,
          estado_inicial: "Borrador",
          items,
        });
        setOrdenes(prev => [creada, ...prev]);
        toast.success(`OC ${creada.id} guardada como ${creada.estado}`);
      }
      onBack();
    } catch (error) {
      toast.error(mensajeErrorOrdenesCompra(error, "No se pudo guardar la orden."));
    }
  };

  const handleNuevoProveedor = (p: ProveedorRef) => {
    // Actualizar el estado global de proveedores en App.tsx para que el
    // listado de Proveedores lo vea inmediatamente.
    setProveedores(prev => [p, ...prev.filter(x => x.id !== p.id && x.nombre.toLowerCase() !== p.nombre.toLowerCase())]);
    onNuevoProveedor?.(p);
    return p.nombre;
  };

  return (
    <OrdenModal
      mode={isEdit ? "edit" : "create"}
      tipo="orden"
      orden={orden}
      // Pantalla completa dentro del panel (no modal): cabecera con ← y
      // pie Cancelar/Guardar siempre visibles, sin scroll de página.
      fullPage
      proveedores={proveedores}
      insumos={insumos}
      productos={productos}
      // Bloque 2: "+ Crear producto" con las categorías del panel.
      categorias={categorias}
      categoriasInsumo={categoriasInsumo}
      onCrearProducto={onCrearProducto}
      onClose={onBack}
      onGuardar={handleGuardar}
      onNuevoProveedor={handleNuevoProveedor}
      onCrearInsumo={handleCrearInsumo}
    />
  );
}

// ��������� RECEPCION MODAL ������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

function RecepcionModal({
  orden, insumos, onGuardar, onAnular, onClose,
}: {
  orden: OrdenCompra;
  insumos: Insumo[];
  onGuardar: (rec: Recepcion) => void;
  onAnular: () => void;
  onClose: () => void;
}) {
  // Fecha local, no UTC (en Colombia tras las 19:00 `toISOString()` daba mañana).
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  type ItemRow = ItemRecibido & { malEstado: boolean };

  const [items, setItems] = useState<ItemRow[]>(() =>
    orden.items.map(i => ({
      rowId: i.rowId,
      idInsumo: i.idInsumo,
      nombre: i.nombre,
      cantidadSolicitada: i.cantidad,
      cantidadRecibida: i.cantidad,
      unidad: i.unidad,
      precioReferencia: i.costoUnitario,
      costoUnitario: i.costoUnitario,
      precioUnitario: i.precioUnitario,
      iva: i.iva,
      malEstado: false,
    }))
  );
  const [itemsExtra, setItemsExtra] = useState<ItemRecibido[]>([]);
  const [usarLotes, setUsarLotes] = useState(false);
  const [showGuardarConf, setShowGuardarConf] = useState(false);
  const [showAnularConf, setShowAnularConf] = useState(false);

  const [exNombre, setExNombre] = useState("");
  const [exCant, setExCant] = useState(1);
  const [exUnidad, setExUnidad] = useState(UNIDADES[0]);
  const [exPrecio, setExPrecio] = useState(0);
  const [exShowSug, setExShowSug] = useState(false);
  const exRef = useRef<HTMLDivElement>(null);

  const exSugs = useMemo(() =>
    exNombre.trim().length >= 1
      ? insumos.filter(i => i.nombre.toLowerCase().includes(exNombre.toLowerCase())).slice(0, 6)
      : [],
    [insumos, exNombre]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (exRef.current && !exRef.current.contains(e.target as Node)) setExShowSug(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const updRec = (rowId: string, v: number) =>
    setItems(p => p.map(i => i.rowId === rowId ? { ...i, cantidadRecibida: v } : i));
  const updPrice = (rowId: string, v: number) =>
    setItems(p => p.map(i => i.rowId === rowId ? { ...i, costoUnitario: v } : i));
  const togMal = (rowId: string) =>
    setItems(p => p.map(i => i.rowId === rowId ? { ...i, malEstado: !i.malEstado } : i));

  const addExtra = () => {
    if (!exNombre.trim()) { toast.error("Ingresa el nombre del insumo."); return; }
    setItemsExtra(p => [...p, {
      rowId: `ex-${Date.now()}`,
      idInsumo: `INS-EX-${Date.now()}`,
      nombre: exNombre.trim(),
      cantidadSolicitada: 0,
      cantidadRecibida: exCant,
      unidad: exUnidad,
      precioReferencia: exPrecio,
      costoUnitario: exPrecio, precioUnitario: exPrecio, iva: 0
    }]);
    setExNombre(""); setExCant(1); setExPrecio(0);
  };

  const hayMal = items.some(i => i.malEstado);
  const totalRec = [...items, ...itemsExtra].reduce(
    (s, i) => s + i.cantidadRecibida * i.costoUnitario, 0
  );

  const doGuardar = () => {
    onGuardar({
      items: items.map(({ malEstado: _m, ...rest }) => rest),
      itemsExtra,
      usarLotes,
      fechaRecepcion: today,
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-card rounded-2xl w-full max-w-5xl shadow-2xl border border-border my-4"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground" style={{ fontFamily: SERIF }}>
                  Formulario de Recepción
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  OC {orden.id} · {orden.proveedor} · Fecha: {today}
                </p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-5">
              {/* Mal estado banner */}
              {hayMal && (
                <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Hay insumos marcados en <strong>mal estado</strong>. Puede anular la OC o continuar con Recepción parcial.
                  </span>
                  <button
                    onClick={() => setShowAnularConf(true)}
                    className="ml-auto shrink-0 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-red-700"
                  >
                    Anular OC
                  </button>
                </div>
              )}

              {/* Items table */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Insumos del pedido
                </p>
                <div className="bg-muted/30 rounded-xl border border-border overflow-x-auto">
                  <table className="w-full text-sm min-w-[780px]">
                    <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                      <tr>
                        {["Nombre", "Solicitado", "Recibido", "Unidad", "P. referencia", "P. real", "Subtotal", "Mal estado"].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map(item => {
                        const parcial = item.cantidadRecibida > 0 && item.cantidadRecibida < item.cantidadSolicitada;
                        const sinEnt = item.cantidadRecibida === 0;
                        return (
                          <tr
                            key={item.rowId}
                            className={`${item.malEstado ? "bg-red-50/70" : sinEnt ? "bg-amber-50/40" : parcial ? "bg-yellow-50/30" : ""}`}
                          >
                            <td className="px-3 py-2.5 font-medium text-foreground">{item.nombre}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{item.cantidadSolicitada}</td>
                            <td className="px-3 py-2.5">
                              {/* 0 = vacío (punto B1): al borrar no reaparece el 0. */}
                              <input
                                type="number" min={0}
                                value={item.cantidadRecibida === 0 ? "" : item.cantidadRecibida}
                                placeholder="0"
                                onChange={e => updRec(item.rowId, numeroDeInput(limpiarNumeroInput(e.target.value)))}
                                className="w-20 px-2 py-2 bg-background border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">{item.unidad}</td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtCOP(item.precioReferencia)}</td>
                            <td className="px-3 py-2.5">
                              <input
                                type="number" min={0}
                                value={item.costoUnitario === 0 ? "" : item.costoUnitario}
                                placeholder="0"
                                onChange={e => updPrice(item.rowId, numeroDeInput(limpiarNumeroInput(e.target.value)))}
                                className="w-28 px-2 py-2 bg-background border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-sm font-semibold">
                              {fmtCOP(item.cantidadRecibida * item.costoUnitario)}
                            </td>
                            <td className="px-3 py-2.5">
                              <button
                                onClick={() => togMal(item.rowId)}
                                title="Marcar mal estado"
                                className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${item.malEstado ? "bg-red-500 text-white" : "bg-muted text-muted-foreground hover:bg-red-100 hover:text-red-600"}`}
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-muted/50 border-t border-border">
                      <tr>
                        <td colSpan={6} className="px-3 py-2 text-xs font-bold text-muted-foreground text-right uppercase tracking-wider">
                          Total recibido
                        </td>
                        <td className="px-3 py-2 text-sm font-bold text-foreground">{fmtCOP(totalRec)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Extra items */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Insumos adicionales recibidos
                </p>
                {itemsExtra.length > 0 && (
                  <div className="bg-violet-50/40 rounded-xl border border-violet-200 overflow-hidden mb-3">
                    <table className="w-full text-sm">
                      <thead className="bg-violet-100/60 text-xs text-muted-foreground uppercase tracking-wider">
                        <tr>
                          {["Nombre", "Cant. recibida", "Unidad", "P. unitario", "Subtotal", ""].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-violet-100">
                        {itemsExtra.map(item => (
                          <tr key={item.rowId}>
                            <td className="px-3 py-2 font-medium text-foreground">{item.nombre}</td>
                            <td className="px-3 py-2">{item.cantidadRecibida}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{item.unidad}</td>
                            <td className="px-3 py-2">{fmtCOP(item.costoUnitario)}</td>
                            <td className="px-3 py-2 font-semibold">
                              {fmtCOP(item.cantidadRecibida * item.costoUnitario)}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => setItemsExtra(p => p.filter(i => i.rowId !== item.rowId))}
                                title="Eliminar insumo"
                                className={`${CLASE_BASE} ${CLASE_HOVER}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div ref={exRef} className="p-3 bg-muted/40 border border-border rounded-xl flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-muted-foreground w-full">
                    Agregar insumo no pedido:
                  </p>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    <input
                      value={exNombre}
                      onChange={e => { setExNombre(e.target.value); setExShowSug(true); }}
                      onFocus={() => setExShowSug(true)}
                      placeholder="Buscar insumo..."
                      className="pl-7 pr-2 py-2 w-44 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    {exShowSug && exSugs.length > 0 && (
                      <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden">
                        {exSugs.map(ins => (
                          <button
                            key={ins.id}
                            type="button"
                            onMouseDown={() => {
                              setExNombre(ins.nombre);
                              setExUnidad(ins.unidadMedida);
                              setExPrecio(ins.costoUnitario);
                              setExShowSug(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted cursor-pointer border-b border-border last:border-0"
                          >
                            <p className="font-semibold text-foreground">{ins.nombre}</p>
                            <p className="text-muted-foreground">
                              {ins.unidadMedida} · ${ins.costoUnitario.toLocaleString("es-CO")}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Nace en 1 (regla del alta de insumo) y borra a vacío sin
                      volver a 0 (punto B1). */}
                  <input
                    type="number" min={1}
                    value={exCant === 0 ? "" : exCant}
                    onChange={e => setExCant(numeroDeInput(limpiarNumeroInput(e.target.value)))}
                    placeholder="Cant."
                    className="w-16 px-2 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <select
                    value={exUnidad}
                    onChange={e => setExUnidad(e.target.value)}
                    className="w-16 px-2 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none cursor-pointer"
                  >
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input
                    type="number" value={exPrecio || ""}
                    onChange={e => setExPrecio(Number(e.target.value))}
                    placeholder="P. unit."
                    className="w-24 px-2 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    onClick={addExtra}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-red-700 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </div>
              </div>

              {/* Lotes toggle */}
              <div className="flex items-center justify-between px-4 py-3.5 bg-muted/30 rounded-xl border border-border">
                <div>
                  <p className="text-sm font-semibold text-foreground">Usar lotes</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Asigna fecha de vencimiento automática (Recepción + 7 días)
                  </p>
                </div>
                <button
                  onClick={() => setUsarLotes(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${usarLotes ? "bg-primary" : "bg-muted border border-border"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${usarLotes ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              {usarLotes && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-amber-50/40 border border-amber-200 rounded-xl overflow-hidden"
                >
                  <div className="px-4 py-2 bg-amber-100/60 border-b border-amber-200">
                    <p className="text-xs font-semibold text-amber-800">
                      Fechas de vencimiento asignadas automáticamente
                    </p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr>
                        {["Insumo", "Cant. recibida", "Fecha Recepción", "Fecha vencimiento"].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {items.map(item => (
                        <tr key={item.rowId}>
                          <td className="px-3 py-2 font-medium">{item.nombre}</td>
                          <td className="px-3 py-2">
                            {item.cantidadRecibida}{" "}
                            <span className="text-xs text-muted-foreground">{item.unidad}</span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{today}</td>
                          <td className="px-3 py-2 font-semibold text-amber-800">{addDays(today, 7)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowGuardarConf(true)}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 inline-flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Guardar Recepción
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showGuardarConf && (
          <ConfirmModal
            title="¿Está seguro de los cambios?"
            detail="Una vez guardado no se podrá modificar."
            confirmLabel="Confirmar"
            icon={
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            }
            onConfirm={doGuardar}
            onCancel={() => setShowGuardarConf(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAnularConf && (
          <ConfirmModal
            title="-+Anular Orden de Compra?"
            body="Se anulará la OC por insumos en mal estado (devolución al proveedor)."
            detail="Esta acción no puede revertirse."
            confirmLabel="Anular OC"
            danger={true}
            icon={
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
            }
            onConfirm={onAnular}
            onCancel={() => setShowAnularConf(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ��������� MAIN SCREEN ������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

interface Props {
  ordenes: OrdenCompra[];
  setOrdenes: React.Dispatch<React.SetStateAction<OrdenCompra[]>>;
  gestiones: GestionCompra[];
  setGestiones: React.Dispatch<React.SetStateAction<GestionCompra[]>>;
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  insumos: Insumo[];
  setInsumos?: React.Dispatch<React.SetStateAction<Insumo[]>>;
  onNuevoProveedor?: (p: ProveedorRef) => void;
  onAbrirRecepcion?: (orden: OrdenCompra) => void;
  onVerDetalle: (orden: OrdenCompra) => void;
  onNuevaOrden: () => void;
  onEditarOrden: (orden: OrdenCompra) => void;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  canCreate?: boolean;
  canEdit?: boolean;
  canExportExcel?: boolean;
  /** Punto 3.2: catálogo de Productos para el buscador "Producto" del modal
   *  que se abre desde este listado (antes llegaba `undefined` y salía vacío). */
  productos?: Producto[];
  /** Punto B7: sin él la anulación se igual no revierte el stock de
   *  productos de sus facturas (ver `handleAnularOrden`). */
  setProductos?: SetCatalogo<Producto>;
  onRecargarCatalogo?: () => Promise<void>;
  /** Recarga el listado COMPLETO de órdenes tras un cambio de estado (p. ej.
   *  marcar Completado a mano): el badge y el botón "OC" salen del backend. */
  onRecargarOrdenes?: () => Promise<void>;
  /** Bloque 2: categorías y alta de productos desde "+ Crear producto" del
   *  OrdenModal que abre este listado. */
  categorias?: CategoriaProducto[];
  onCrearProducto?: (p: Producto) => Promise<Producto>;
  /** Bloque 2.2: categorías de insumos desde la API para el modal de alta. */
  categoriasInsumo?: CategoriaInsumo[];
  /** Carga de la lista desde la API y su error ("Reintentar"): nunca datos de
      ejemplo cuando falla. */
  cargando?: boolean;
  errorCarga?: string | null;
  onReintentar?: () => void;
}

export function OrdenCompraScreen({
  ordenes, setOrdenes, gestiones, setGestiones,
  proveedores, setProveedores,
   insumos, setInsumos, productos, setProductos, onRecargarCatalogo, onRecargarOrdenes, categorias, categoriasInsumo, onCrearProducto, onNuevoProveedor, onAbrirRecepcion, onVerDetalle, onNuevaOrden, onEditarOrden,
  cargando = false,
  errorCarga,
  onReintentar,
  page, setPage,
  canCreate = true, canEdit = true,
  canExportExcel = true,
}: Props) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "view"; orden?: OrdenCompra } | null>(null);
  const [recepcionOrden, setRecepcionOrden] = useState<OrdenCompra | null>(null);
  const [sendConfirm, setSendConfirm] = useState<OrdenCompra | null>(null);
  const [anularConfirm, setAnularConfirm] = useState<OrdenCompra | null>(null);
  /** Motivo de la anulación (lo exige el servidor). */
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [anulandoOrden, setAnulandoOrden] = useState(false);
  const [estadoConfirm, setEstadoConfirm] = useState<{ id: string; from: EstadoOrden; next: EstadoOrden } | null>(null);

  const getFacturas = (oid: string) => gestiones.filter((g) => g.ordenId === oid && (g.numeroFactura ?? "") !== "");

  const filtered = useMemo(() =>
    ordenes.filter(o => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const facturas = getFacturas(o.id);
      const facturasTexto = [...(o.facturas ?? []), ...facturas.map(f => f.numeroFactura ?? "")].join(" ");
      // Find provider NIT
      const prov = proveedores.find(p => p.nombre === o.proveedor);
      const nit = o.proveedorNit || prov?.nit || "";
      return (o.proveedor ?? "").toLowerCase().includes(q)
        || (o.id ?? "").toLowerCase().includes(q)
        || nit.toLowerCase().includes(q)
        || facturasTexto.toLowerCase().includes(q)
        || (o.estado ?? "").toLowerCase().includes(q)
        || (o.fecha ?? "").toLowerCase().includes(q);
    }),
    [ordenes, search, gestiones, proveedores]);

  // Filas por página según el alto disponible (ResizeObserver): la tabla nunca
  // hace scroll vertical, se pagina. Con la tabla oculta (<768px) queda en 5.
  const PER_PAGE = 5;

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageActual = Math.min(Math.max(page, 1), Math.max(1, totalPages));
  const paged = filtered.slice((pageActual - 1) * PER_PAGE, pageActual * PER_PAGE);

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [setPage, totalPages]);

  /** Facturas (compras) registradas para una orden. */
  const facturasDeOrden = (oid: string) => gestiones.filter((g) => g.ordenId === oid);

  /** Ids de insumos ya registrados en compras no anuladas de la orden. */
  const registradosEnOrden = (oid: string) => {
    const set = new Set<string>();
    for (const g of gestiones) {
      if (g.ordenId !== oid) continue;
      if (g.estado === "Anulado") continue;
      for (const it of g.items ?? []) set.add(it.idInsumo);
    }
    return set;
  };

  /** id_proveedor de la API desde el nombre que usa el formulario (el
      selector de proveedor guarda el nombre, como siempre). */
  const idProveedorDeNombre = (nombre: string): number => {
    const p = proveedores.find((x) => x.nombre === nombre);
    return p ? Number(p.id) || 0 : 0;
  };

  const handleGuardarOrden = async (data: OrdenFormData) => {
    const idProveedor = idProveedorDeNombre(data.proveedor);
    if (!idProveedor) {
      toast.error("Elige un proveedor válido para la orden.");
      return;
    }
    const items = data.items.filter((i) => i.idInsumo && i.cantidad > 0);
    try {
      if (modal?.mode === "create") {
        const creada = await crearOrdenCompra({
          id_proveedor: idProveedor,
          estado_inicial: "Borrador",
          items,
        });
        setOrdenes(p => [creada, ...p]);
        toast.success(`OC ${creada.id} guardada como ${creada.estado}`);
      } else if (modal?.mode === "edit" && modal.orden) {
        // Validación de backend: solo se puede editar en estado Borrador
        if (!esBorrador(modal.orden.estado)) {
          toast.error("Solo se pueden editar órdenes en estado Borrador");
          return;
        }
        // El estado no se edita desde el formulario: si la orden queda
        // "Enviado" se cambia por su transición (PATCH /estado).
        const actualizada = await actualizarOrdenCompra(modal.orden.id, {
          id_proveedor: idProveedor,
          items,
        });
        const trasEstado =
          data.estado !== actualizada.estado
            ? await cambiarEstadoOrdenCompra(actualizada.id, data.estado as EstadoOrden)
            : actualizada;
        setOrdenes(p => p.map(o => o.id === modal.orden!.id ? trasEstado : o));
        toast.success(`OC ${trasEstado.id} actualizada`);
      }
      setModal(null);
    } catch (error) {
      // 409/400 del servidor: el mensaje se muestra y no se cambia nada.
      toast.error(mensajeErrorOrdenesCompra(error, "No se pudo guardar la orden."));
    }
  };

  const handleNuevoProveedorLocal = (p: ProveedorRef): string => {
    setProveedores(prev => [p, ...prev.filter(x => x.id !== p.id && x.nombre.toLowerCase() !== p.nombre.toLowerCase())]);
    onNuevoProveedor?.(p);
    return p.nombre;
  };

  const handleEnviarOrden = async (o: OrdenCompra) => {
    try {
      const actualizada = await cambiarEstadoOrdenCompra(o.id, "Enviado");
      setOrdenes(p => p.map(x => x.id === o.id ? actualizada : x));
      toast.success(`OC ${o.id} enviada al proveedor`);
    } catch (error) {
      toast.error(mensajeErrorOrdenesCompra(error, "No se pudo enviar la orden."));
    } finally {
      setSendConfirm(null);
    }
  };

  const handleAnularOrden = async (o: OrdenCompra) => {
    if (anulandoOrden) return;
    const motivo = (motivoAnulacion ?? "").trim();
    if (!motivo) {
      toast.error("Debes escribir el motivo de la anulación");
      return;
    }
    setAnulandoOrden(true);
    try {
      // El backend anula la orden y SUS compras devolviendo el stock que
      // hubieran sumado (y recalculando la recepción). Un 409 muestra su
      // mensaje y no se cambia nada.
      // Decisión D1: se anula la orden con su motivo; las compras Recibido y el stock no se tocan.
      const actualizada = await cambiarEstadoOrdenCompra(o.id, "Anulado", motivo);
      setOrdenes((prev) => prev.map((x) => (x.id === o.id ? actualizada : x)));
      setOrdenes((prev) => prev.map((x) => (x.id === o.id ? actualizada : x)));
      // Las compras asociadas quedaron "Anulado" en la base: se recargan.
      // Las compras asociadas conservan su estado (Decisión D1).
      // El stock del catálogo no cambia al anular la orden.
      toast.success(`OC ${o.id} anulada`);
      setAnularConfirm(null);
      setRecepcionOrden(null);
      setMotivoAnulacion("");
    } catch (error) {
      toast.error(mensajeErrorOrdenesCompra(error, "No se pudo anular la orden."));
    } finally {
      setAnulandoOrden(false);
    }
  };

  const handleCambiarEstado = async (id: string, next: EstadoOrden) => {
    // "Anulado" siempre pide motivo: se abre su modal en vez de cambiar el
    // estado a pelo (el servidor exige el motivo).
    if (next === "Anulado") {
      setEstadoConfirm(null);
      setMotivoAnulacion("");
      setAnularConfirm(ordenes.find((o) => o.id === id) ?? null);
      return;
    }
    try {
      const actualizada = await cambiarEstadoOrdenCompra(id, next);
      setOrdenes(p => p.map(x => x.id === id ? actualizada : x));
      // La lista completa se resincroniza con GET /ordenes-compra: así el
      // badge (p. ej. Completado a mano) y el botón "OC" quedan tal cual los
      // calcula el backend, sin recargar la página.
      await onRecargarOrdenes?.();
      toast.success(`Estado cambiado a: ${next}`);
    } catch (error) {
      toast.error(mensajeErrorOrdenesCompra(error, "No se pudo cambiar el estado."));
    } finally {
      setEstadoConfirm(null);
    }
  };

  const handleDownload = async () => {
    // Exportar todas las órdenes (filtradas) con sus insumos agrupados en una sola hoja
    const ordenesParaExcel: OrdenConInsumos[] = filtered.map(o => {
      // Buscar facturas de esta orden para obtener el número de factura de los insumos no solicitados
      const facturasOrden = gestiones.filter(g => g.ordenId === o.id && g.numeroFactura);
      // Mapa de idInsumo -> numeroFactura para insumos no solicitados
      const extraFacturaMap = new Map<string, string>();
      for (const f of facturasOrden) {
        for (const it of f.items ?? []) {
          if (it.esNoSolicitado) {
            extraFacturaMap.set(it.idInsumo, f.numeroFactura);
          }
        }
      }
      
      return {
        id: o.id,
        proveedor: o.proveedor,
        fecha: o.fecha,
        estado: o.estado,
        items: o.items.map(item => ({
          nombre: item.nombre,
          cantidad: item.cantidad,
          unidad: item.unidad,
          costoUnitario: item.costoUnitario,
          iva: item.iva,
        })),
        recepcion: o.recepcion?.itemsExtra && o.recepcion.itemsExtra.length > 0
          ? {
              itemsExtra: o.recepcion.itemsExtra.map(item => ({
                nombre: item.nombre,
                cantidad: item.cantidadRecibida,
                unidad: item.unidad,
                costoUnitario: item.costoUnitario,
                iva: item.iva ?? 0,
                facturaNumero: extraFacturaMap.get(item.idInsumo) || "",
              })),
            }
          : undefined,
      };
    });
    
    await exportarOrdenesConInsumosExcel({
      ordenes: ordenesParaExcel,
      proveedores,
      nombreArchivo: "ordenes-de-compra",
    });
    toast.success("Excel descargado");
  };

  // PDF generation for individual order
  const handleDownloadPDF = (orden: OrdenCompra) => {
    // Dynamic import of jsPDF to avoid SSR issues
    import("jspdf").then(({ jsPDF }) => {
      import("jspdf-autotable").then(() => {
        const doc = new jsPDF();
        const prov = proveedores.find(p => p.nombre === orden.proveedor);
        const nit = orden.proveedorNit || prov?.nit || "";
        const asesor = prov?.asesorComercial ?? "";
        const telefono = prov?.telefono ?? "";
        const email = prov?.email ?? "";
        
        // Header - La Sirena
        doc.setFontSize(20);
        doc.setTextColor(220, 38, 38); // Red color
        doc.text("La Sirena Pizza", 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("S.I.V.PRO - Sistema de Gestión", 14, 26);
        
        // Order info
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Orden de Compra N° ${orden.id}`, 14, 36);
        doc.text(`Fecha: ${orden.fecha}`, 14, 42);
        doc.text(`Estado: ${orden.estado}`, 14, 48);
        
        // Provider info
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("Proveedor:", 14, 56);
        doc.setFont(undefined, 'normal');
        doc.text(orden.proveedor, 14, 62);
        if (nit) doc.text(`NIT: ${nit}`, 14, 68);
        if (asesor) doc.text(`Asesor: ${asesor}`, 14, 74);
        if (telefono) doc.text(`Tel: ${telefono}`, 14, 80);
        if (email) doc.text(`Email: ${email}`, 14, 86);
        
        // Items table
        const tableData = orden.items.map(item => [
          item.nombre,
          item.cantidad.toString(),
          item.unidad,
          new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(item.costoUnitario),
          `${item.iva}%`,
          new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(item.cantidad * item.costoUnitario),
        ]);
        
        (doc as any).autoTable({
          startY: 95,
          head: [["Insumo", "Cantidad", "Unidad", "Monto unit.", "IVA %", "Subtotal"]],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [220, 38, 38], textColor: 255 },
          styles: { fontSize: 9 },
        });
        
        // Totals
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        const total = orden.items.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`Total: ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(total)}`, 14, finalY);
        
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("La Sirena Pizza - Medellín, Colombia - S.I.V.PRO", 105, 290, { align: "center" });
        
        doc.save(`orden-compra-${orden.id}-${new Date().toLocaleDateString("en-CA")}.pdf`);
        toast.success("PDF generado");
      });
    }).catch(() => {
      toast.error("Error generando PDF. Instale jspdf y jspdf-autotable.");
    });
  };

  return (
    <div className="px-4 md:px-6 pt-3 pb-2 h-full min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-4 mb-3 shrink-0 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
            Órdenes de Compra
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Crea y gestiona las Órdenes de compra a proveedores
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExportExcel && <BotonDescargarExcel onClick={handleDownload} />}
          {canCreate && (
            <button
              onClick={(e) => {
                onNuevaOrden();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Crear Orden
            </button>
          )}
        </div>
      </div>

      <div className="relative mb-3 max-w-sm shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por Nº orden, proveedor, NIT, factura o estado…"
          className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Punto 2.5: la card medía todo el alto restante y se estiraba hasta el
          fondo (hueco vacío bajo la última fila). Ahora mide su contenido y el
          paginador queda pegado debajo. La tabla NO hace scroll vertical: se
          pagina en filas fijas de 5; sólo queda scroll horizontal en tablet y
          scroll vertical en móvil (tarjetas). */}
      {/* Carga desde la API y su error con "Reintentar": nunca datos de
          ejemplo cuando falla. */}
      {cargando ? (
        <div className="bg-card border border-border rounded-2xl px-4 py-14 text-center text-muted-foreground shrink-0">
          Cargando órdenes de compra…
        </div>
      ) : errorCarga ? (
        <div className="bg-card border border-border rounded-2xl px-4 py-14 text-center text-muted-foreground shrink-0">
          <p className="font-semibold text-foreground">{errorCarga}</p>
          {onReintentar && (
            <button
              type="button"
              onClick={onReintentar}
              className="mt-3 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer"
            >
              Reintentar
            </button>
          )}
        </div>
      ) : (
      <div className="flex flex-col bg-card border border-border rounded-2xl overflow-hidden shrink-0">
        <div className="overflow-x-auto">
          {/* Escritorio/tablet (>=768px): tabla. Las 3 columnas de dinero y la
              fecha sólo existen desde 1440px; por debajo se fusionan en Total y
              la fecha va bajo el N° de orden. */}
          <table className="hidden md:table w-full table-fixed md:min-w-[780px]">
            <thead className="bg-muted text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap sticky top-0 left-0 z-30 bg-muted w-[16%] min-[1440px]:w-[9%]">N° Orden</th>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap sticky top-0 z-20 bg-muted w-[19%] min-[1440px]:w-[15%]">Proveedor</th>
                <th className="hidden min-[1440px]:table-cell px-3 py-3 text-left font-semibold whitespace-nowrap sticky top-0 z-20 bg-muted w-[8%]">Fecha</th>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap sticky top-0 z-20 bg-muted w-[13%] min-[1440px]:w-[9%]">N° Factura</th>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap sticky top-0 z-20 bg-muted w-[18%] min-[1440px]:w-[10%]">Total</th>
                <th className="hidden min-[1440px]:table-cell px-3 py-3 text-left font-semibold whitespace-nowrap sticky top-0 z-20 bg-muted w-[11%]">Facturado</th>
                <th className="hidden min-[1440px]:table-cell px-3 py-3 text-left font-semibold whitespace-nowrap sticky top-0 z-20 bg-muted w-[11%]">Por facturar</th>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap sticky top-0 z-20 bg-muted w-[18%] min-[1440px]:w-[13%]">Estado</th>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap sticky top-0 right-0 z-30 bg-muted w-[16%] min-[1440px]:w-[14%]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0
                ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-14 text-center text-muted-foreground">
                      <p className="text-4xl mb-3">📋</p>
                      <p className="font-semibold">No se encontraron órdenes</p>
                    </td>
                  </tr>
                )
                : paged.map(o => {
                  const facturas = getFacturas(o.id);
                  const totalOrden = o.total ?? calcTotal(o.items);
                  const totalFacturado = o.facturado ?? facturas.reduce((s, f) => s + f.valorTotal, 0);
                  const porFacturar = o.porFacturar ?? Math.max(0, totalOrden - totalFacturado);
                    // Find provider NIT
                    const prov = proveedores.find(p => p.nombre === o.proveedor);
                    const nit = o.proveedorNit || prov?.nit || "";
                    return (
                      <tr key={o.id} className="group hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2.5 sticky left-0 z-10 bg-card group-hover:bg-muted/20">
                          <p className="text-sm font-mono font-semibold text-foreground whitespace-nowrap">{o.id}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-nowrap min-[1440px]:hidden">{o.fecha}</p>
                        </td>
                         <td className="px-3 py-2.5 overflow-hidden">
                           <p className="text-sm text-foreground break-words" title={o.proveedor}>{o.proveedor}</p>
                           {nit && <p className="text-[11px] text-muted-foreground font-mono truncate" title={`NIT ${nit}`}>NIT {nit}</p>}
                         </td>
                         <td className="hidden min-[1440px]:table-cell px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{o.fecha}</td>
                       <td className="px-3 py-2.5 text-xs overflow-hidden">
                         {facturas.length > 0 ? (
                           <>
                             {facturas.map((f) => (
                               <span key={f.id} className="block font-mono font-semibold text-emerald-700 truncate" title={f.numeroFactura}>
                                 {f.numeroFactura}
                               </span>
                             ))}
                           </>
                         ) : (
                           (o.facturas ?? []).length > 0 ? (
                             <>
                               {(o.facturas ?? []).map((nf) => (
                                 <span key={nf} className="block font-mono font-semibold text-emerald-700 truncate" title={nf}>
                                   {nf}
                                 </span>
                               ))}
                             </>
                           ) : (
                             <span className="text-muted-foreground">—</span>
                           )
                         )}
                       </td>
                       <td className="px-3 py-2.5">
                         <p className="text-sm font-semibold text-foreground whitespace-nowrap">{fmtCOP(totalOrden)}</p>
                         {/* Sólo hasta 1399px: el total arriba y el desglose en
                             texto pequeño debajo (fusiona las 3 columnas). */}
                         <p className="text-[11px] leading-tight mt-0.5 text-muted-foreground min-[1440px]:hidden">
                           {totalFacturado > 0 ? (
                             <>
                               Facturado <span className="font-semibold text-emerald-700">{fmtCOP(totalFacturado)}</span>
                               {" · "}Por facturar <span className="font-semibold text-amber-700">{fmtCOP(porFacturar)}</span>
                             </>
                           ) : (
                             <>
                               Por facturar <span className="font-semibold text-amber-700">{fmtCOP(porFacturar)}</span>
                             </>
                           )}
                         </p>
                       </td>
                       <td className="hidden min-[1440px]:table-cell px-3 py-2.5 text-sm text-emerald-700 font-semibold whitespace-nowrap">
                         {totalFacturado > 0 ? fmtCOP(totalFacturado) : "—"}
                       </td>
                       <td className="hidden min-[1440px]:table-cell px-3 py-2.5 text-sm text-amber-700 font-semibold whitespace-nowrap">
                         {porFacturar > 0 ? fmtCOP(porFacturar) : "—"}
                       </td>
                        <td className="px-3 py-2.5 overflow-hidden">
                        <EstadoSelect
                          value={o.estado}
                          onChange={(nuevoEstado) => {
                            if (nuevoEstado === o.estado) return;
                            setEstadoConfirm({ id: o.id, from: o.estado, next: nuevoEstado });
                          }}
                          options={opcionesEstado(o.estado)}
                          disabled={o.estado === "Anulado" || o.estado === "Completado"}
                        />
                         <p className="text-[11px] text-muted-foreground mt-1 whitespace-nowrap">{fechaUltimoCambio(o)}</p>
                        {/* El tooltip envuelve SOLO el botón y su cuadro se pinta
                            en un portal al <body>: ni la tabla ni el footer lo
                            recortan. */}
                        <EstadoHistorialTooltip
                          historial={o.historialEstados ?? []}
                          estadoColors={ESTADO_CONFIG}
                        >
                          <button
                            type="button"
                            className="text-[11px] text-primary hover:underline mt-0.5"
                          >
                            Ver historial
                          </button>
                        </EstadoHistorialTooltip>
                      </td>
                       <td className="px-3 py-2.5 sticky right-0 z-10 bg-card group-hover:bg-muted/20">
                         <div className="flex items-center gap-1 flex-nowrap">
                          <button
                            onClick={() => onVerDetalle(o)}
                            title="Ver detalle"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* Editar sólo en Borrador: `onEditarOrden` conecta con
                              setOrdenAEditar + navigate("nueva-orden-compra").
                              En el resto de estados se reserva el mismo ancho
                              (SLOT_EDITAR) para que [Ver] [Editar] [OC] no se
                              muevan entre filas. */}
                          {esBorrador(o.estado) ? (
                            <button
                              onClick={() => onEditarOrden(o)}
                              title="Editar orden"
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          ) : (
                            <span aria-hidden className={SLOT_EDITAR} />
                          )}
                          {o.estado === "Enviado" && o.items.some(item => !item.facturado && !registradosEnOrden(o.id).has(item.idInsumo)) && (
                            <button
                              onClick={() => onAbrirRecepcion?.(o)}
                              title="Registrar recepción"
                              className="flex items-center gap-1.5 ml-0.5 px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-semibold hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              {/* Sólo desde 1440px: por debajo el botón va con
                                  el ícono solo, con el mismo tooltip. */}
                              <span className="hidden min-[1440px]:inline">OC</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {/* Celular (<768px): cada orden como tarjeta. */}
          <div className="md:hidden divide-y divide-border">
            {paged.length === 0
              ? (
                <div className="px-4 py-12 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="font-semibold">No se encontraron órdenes</p>
                </div>
              )
              : paged.map(o => {
                const facturas = getFacturas(o.id);
                const totalOrden = o.total ?? calcTotal(o.items);
                const totalFacturado = o.facturado ?? facturas.reduce((s, f) => s + f.valorTotal, 0);
                const porFacturar = o.porFacturar ?? Math.max(0, totalOrden - totalFacturado);
                const prov = proveedores.find(p => p.nombre === o.proveedor);
                const nit = o.proveedorNit || prov?.nit || "";
                return (
                  <div key={o.id} className="p-4">
                    {/* N° de orden y estado arriba */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-mono font-semibold text-foreground">{o.id}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-nowrap">{fechaUltimoCambio(o)}</p>
                      </div>
                      <EstadoSelect
                        value={o.estado}
                        onChange={(nuevoEstado) => {
                          if (nuevoEstado === o.estado) return;
                          setEstadoConfirm({ id: o.id, from: o.estado, next: nuevoEstado });
                        }}
                        options={opcionesEstado(o.estado)}
                        disabled={o.estado === "Anulado" || o.estado === "Completado"}
                        className="shrink-0"
                      />
                    </div>

                    {/* Proveedor con NIT */}
                    <div className="mt-2.5 min-w-0">
                      <p className="text-sm text-foreground break-words">{o.proveedor}</p>
                      {nit && <p className="text-[11px] text-muted-foreground font-mono">NIT {nit}</p>}
                    </div>

                    {/* Fecha de la orden */}
                    <p className="text-xs text-muted-foreground mt-1.5">{o.fecha}</p>

                    {facturas.length > 0 && (
                      <p className="text-xs mt-1.5">
                        <span className="text-muted-foreground">Factura </span>
                        {facturas.map((f, i) => (
                          <span key={f.id} className="font-mono font-semibold text-emerald-700">
                            {i > 0 ? " · " : ""}{f.numeroFactura}
                          </span>
                        ))}
                      </p>
                    )}

                    {/* Total, facturado y por facturar */}
                    <div className="mt-2.5 rounded-xl bg-muted/50 border border-border px-3 py-2 space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className="text-sm font-semibold text-foreground">{fmtCOP(totalOrden)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">Facturado</span>
                        <span className="text-xs font-semibold text-emerald-700">
                          {totalFacturado > 0 ? fmtCOP(totalFacturado) : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">Por facturar</span>
                        <span className="text-xs font-semibold text-amber-700">
                          {porFacturar > 0 ? fmtCOP(porFacturar) : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Acciones abajo — mismas reglas que la tabla: editar sólo
                        en Borrador y botón OC sólo cuando la orden está Enviado
                        y le faltan insumos por recibir. */}
                    <div className="mt-2.5 flex items-center gap-1 flex-wrap">
                      <button
                        onClick={() => onVerDetalle(o)}
                        title="Ver detalle"
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {esBorrador(o.estado) && (
                        <button
                          onClick={() => onEditarOrden(o)}
                          title="Editar orden"
                          className={`${CLASE_BASE} ${CLASE_HOVER}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {o.estado === "Enviado" && o.items.some(item => !item.facturado && !registradosEnOrden(o.id).has(item.idInsumo)) && (
                        <button
                          onClick={() => onAbrirRecepcion?.(o)}
                          title="Registrar recepción"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-semibold hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" /> OC
                        </button>
                      )}
                      <EstadoHistorialTooltip
                        historial={o.historialEstados ?? []}
                        estadoColors={ESTADO_CONFIG}
                      >
                        <button
                          type="button"
                          className="ml-auto text-[11px] text-primary hover:underline px-2 py-2"
                        >
                          Ver historial
                        </button>
                      </EstadoHistorialTooltip>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      )}

      {/* Paginador fuera y debajo de la card (unificado). */}
      {filtered.length > 0 && (
        <Paginador pagina={pageActual} totalPaginas={totalPages} onCambio={setPage} />
      )}

      <AnimatePresence>
        {modal && (
          <OrdenModal
            mode={modal.mode}
            orden={modal.orden}
            proveedores={proveedores}
            insumos={insumos}
            // Punto 3.2: sin el catálogo el buscador "Producto" de este modal
            // no tenía con qué filtrar y quedaba siempre vacío.
            productos={productos}
            // Bloque 2: "+ Crear producto" con las categorías del panel.
            categorias={categorias}
            categoriasInsumo={categoriasInsumo}
            onCrearProducto={onCrearProducto}
            onClose={() => setModal(null)}
            onGuardar={handleGuardarOrden}
            onNuevoProveedor={handleNuevoProveedorLocal}
            onCrearInsumo={(ins) => setInsumos?.(prev => [insumoDeAlta(ins), ...prev])}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sendConfirm && (
          <ConfirmModal
            title="-+Enviar Orden de Compra?"
            body={`Enviar OC ${sendConfirm.id} a ${sendConfirm.proveedor}.`}
            detail="No podrás editarla después del envío."
            confirmLabel="Enviar"
            icon={
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
            }
            onConfirm={() => handleEnviarOrden(sendConfirm)}
            onCancel={() => setSendConfirm(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {anularConfirm && (
          <ConfirmModal
            title="Anular Orden"
            body={`-+Deseas anular la OC ${anularConfirm.id}?`}
            detail={
              facturasDeOrden(anularConfirm.id).length > 0
                ? "Las facturas ya recibidas en Gestión de Compras conservarán su estado y stock. Esta acción no puede revertirse."
                : "Esta acción no puede revertirse."
            }
            confirmLabel="Anular"
            loading={anulandoOrden}
            danger={true}
            showMotivo
            motivo={motivoAnulacion}
            onMotivoChange={setMotivoAnulacion}
            icon={
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
            }
            onConfirm={() => void handleAnularOrden(anularConfirm)}
            onCancel={() => !anulandoOrden && setAnularConfirm(null)}
          />
        )}
        {estadoConfirm && (
          <ConfirmModal
            title={
              estadoConfirm.next === "Completado"
                ? "¿Marcar la orden como Completada?"
                : `-+Cambiar el estado a ${estadoConfirm.next}?`
            }
            body={`La orden ${estadoConfirm.id} pasará de ${estadoConfirm.from} a ${estadoConfirm.next}.`}
            detail={
              estadoConfirm.next === "Anulado"
                ? "Una orden anulada no puede volver a un estado anterior."
                : estadoConfirm.next === "Completado"
                  ? "Ya no se podrán registrar más facturas en esta orden."
                  : "La orden avanzará en el flujo de estados."
            }
            confirmLabel={estadoConfirm.next === "Anulado" ? "Anular" : `Cambiar a ${estadoConfirm.next}`}
            danger={estadoConfirm.next === "Anulado"}
            icon={
              estadoConfirm.next === "Anulado" ? (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-red-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Send className="w-5 h-5 text-blue-600" />
                </div>
              )
            }
            onConfirm={() => handleCambiarEstado(estadoConfirm.id, estadoConfirm.next)}
            onCancel={() => setEstadoConfirm(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── NUEVO INSUMO MODAL ───────────────────────────────────────────────────────

export function NuevoInsumoModal({
  onGuardar, onClose, nombreInicial = "", insumosExistentes = [],
  categoriasInsumo = CATEGORIAS_INSUMO,
  persistirEnApi = true,
}: {
  onGuardar: (ins: NuevoInsumoCreado) => void;
  onClose: () => void;
  nombreInicial?: string;
  insumosExistentes?: { nombre: string }[];
  persistirEnApi?: boolean;
  /** Bloque 3: categorías de insumos (A5.1: la categoría es OBLIGATORIA,
   *  igual que en Crear Insumo de Gestión de Insumos). Por defecto el mismo
   *  catálogo `CATEGORIAS_INSUMO`; cada pantalla puede pasar el suyo. */
  categoriasInsumo?: CategoriaInsumo[];
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [categoriaId, setCategoriaId] = useState("");
  const [unidad, setUnidad] = useState(UNIDADES_INSUMO[0].valor);
  const [precio, setPrecio] = useState(0);
  const [iva, setIva] = useState(0);
  const [tocado, setTocado] = useState({ nombre: false, categoria: false, unidad: false, precio: false, iva: false });
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  /** "Guardando…" mientras habla la API: bloquea el doble clic. */
  const [guardando, setGuardando] = useState(false);

  // Bloque 3: mismas reglas que Gestión de Insumos — nombre único comparando
  // sin tildes ni mayúsculas de más (`mismoNombre`) y categoría obligatoria.
  const errorNombre = nombreLimpio(nombre)
    ? (insumosExistentes.some(i => mismoNombre(i.nombre, nombre))
      ? "Ya existe un insumo con ese nombre"
      : undefined)
    : "El nombre es obligatorio.";
  const errorCategoria = categoriaId ? undefined : "Selecciona una categoría.";
  const errorUnidad = unidad ? undefined : "Selecciona una unidad.";
  const errorPrecio = precio > 0 ? undefined : "El monto debe ser mayor que cero.";
  const errorIva = iva >= 0 && iva <= 100 ? undefined : "El IVA debe estar entre 0 y 100.";

  const formValido = !errorNombre && !errorCategoria && !errorUnidad && !errorPrecio && !errorIva;

  const marcarTocado = (campo: "nombre" | "categoria" | "unidad" | "precio" | "iva") =>
    setTocado((t) => ({ ...t, [campo]: true }));

  const submit = async () => {
    setIntentoGuardar(true);
    if (!formValido || guardando) return;
    if (!persistirEnApi) {
      onGuardar({
        id: `INS-NUEVO-${Date.now()}`,
        nombre: nombreParaGuardar(nombre),
        unidadMedida: unidad,
        precioUnitario: precio,
        iva,
        categoriaId,
      });
      return;
    }
    setGuardando(true);
    try {
      // 3.4: el insumo se da de alta contra la API (tipo "Insumo", con el
      // costo y el IVA del modal) y el payload que sale es el del SERVIDOR:
      // así el catálogo recibe el id real ("INS-###") y no uno inventado.
      const creado = await crearInsumo({
        nombre: nombreParaGuardar(nombre),
        tipo: "Insumo",
        id_categoria_insumo: Number(categoriaId),
        unidad_medida: unidad,
        costo_unitario: precio,
        iva,
      });
      onGuardar({
        id: creado.insumo.id,
        nombre: creado.insumo.nombre,
        unidadMedida: creado.insumo.unidadMedida,
        precioUnitario: creado.insumo.costoUnitario,
        iva: creado.insumo.iva ?? iva,
        categoriaId: creado.insumo.categoriaId,
      });
    } catch (error) {
      // 409 (nombre repetido) o 400: mensaje del servidor, modal abierto.
      toast.error(mensajeErrorInsumos(error, "No se pudo crear el insumo."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Nuevo Insumo</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Crea un insumo para agregar a la orden.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nombre *</label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onBlur={() => marcarTocado("nombre")}
              autoFocus
              placeholder="Nombre del insumo"
              className={`${iCls} transition-colors ${(tocado.nombre || intentoGuardar) && errorNombre ? "border-red-400 focus:ring-red-300" : ""}`}
            />
            {(tocado.nombre || intentoGuardar) && errorNombre && (
              <p className="text-xs text-red-500 mt-1 ml-0.5">{errorNombre}</p>
            )}
          </div>
          {/* Bloque 3 (A5.1): la categoría es obligatoria, igual que en
              Crear Insumo de Gestión de Insumos — sin ella el insumo queda
              sin clasificar en el catálogo. */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Categoría *</label>
            <select
              value={categoriaId}
              onChange={e => { setCategoriaId(e.target.value); marcarTocado("categoria"); }}
              onBlur={() => marcarTocado("categoria")}
              className={`${iCls} transition-colors ${(tocado.categoria || intentoGuardar) && errorCategoria ? "border-red-400 focus:ring-red-300" : ""}`}
            >
              <option value="">Seleccionar</option>
              {/* Solo categorías activas (las de la API traen `estado`). */}
              {categoriasInsumo.filter(c => c.estado !== false).map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            {(tocado.categoria || intentoGuardar) && errorCategoria && (
              <p className="text-xs text-red-500 mt-1 ml-0.5">{errorCategoria}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Unidad</label>
              {/* Select personalizado (Radix, igual que los estados): el
                  `<select>` nativo desplegaba la lista CUADRADA y con el azul
                  del navegador. Bloque 3 (A5.2): con la lista compartida
                  UNIDADES_INSUMO (etiqueta larga, mismo valor guardado). */}
              <UnidadSelect
                value={unidad}
                unidades={UNIDADES_INSUMO}
                onChange={(v) => {
                  setUnidad(v);
                  marcarTocado("unidad");
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">IVA (%)</label>
              {/* Vacío = 0 % al guardar (punto B1); el 0 es un valor válido. */}
              <input
                type="number"
                min={0}
                max={100}
                value={iva === 0 ? "" : iva}
                placeholder="0"
                onChange={e => setIva(numeroDeInput(limpiarNumeroInput(e.target.value)))}
                onBlur={() => marcarTocado("iva")}
                className={iCls}
              />
              {(tocado.iva || intentoGuardar) && errorIva && (
                <p className="text-xs text-red-500 mt-1 ml-0.5">{errorIva}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Monto unitario *</label>
            <input
              type="number"
              min={0}
              value={precio || ""}
              onChange={e => setPrecio(Number(e.target.value))}
              onBlur={() => marcarTocado("precio")}
              className={iCls}
            />
            {(tocado.precio || intentoGuardar) && errorPrecio && (
              <p className="text-xs text-red-500 mt-1 ml-0.5">{errorPrecio}</p>
            )}
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => void submit()}
            disabled={!formValido || guardando}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary transition-all"
          >
            {guardando ? "Guardando…" : "Crear Insumo"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── ORDEN DETALLE PAGE ───────────────────────────────────────────────────────

interface OrdenDetallePageProps {
  orden: OrdenCompra;
  gestiones: GestionCompra[];
  onBack: () => void;
  onEditar: (orden: OrdenCompra) => void;
  onAbrirRecepcion: (orden: OrdenCompra) => void;
}

export function OrdenDetallePage({
  orden,
  gestiones,
  onBack,
  onVerFactura,
}: OrdenDetallePageProps & { onVerFactura?: (gestion: GestionCompra) => void }) {
  const [ordenDetalle, setOrdenDetalle] = useState<OrdenCompra>(orden);
  useEffect(() => {
    setOrdenDetalle(orden);
    let cancelado = false;
    obtenerOrdenCompra(orden.id)
      .then((fresca) => {
        if (!cancelado) setOrdenDetalle(fresca);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [orden]);
  return <OrdenDetallePageContenido orden={ordenDetalle} gestiones={gestiones} onBack={onBack} onVerFactura={onVerFactura} />;
}

function OrdenDetallePageContenido({
  orden,
  gestiones,
  onBack,
  onVerFactura,
}: {
  orden: OrdenCompra;
  gestiones: GestionCompra[];
  onBack: () => void;
  onVerFactura?: (gestion: GestionCompra) => void;
}) {
  const facturas = gestiones.filter(g => g.ordenId === orden.id && (g.numeroFactura ?? "") !== "");
  // Sólo las compras NO anuladas dejan un insumo "Facturado": una factura
  // anulada devuelve sus insumos a pendientes (respaldo cuando la línea no
  // trae `facturado` del backend).
  const insumosFacturados = new Set(
    facturas.filter(g => g.estado !== "Anulado").flatMap(g => (g.items ?? []).map(i => i.idInsumo))
  );
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<string | null>(facturas[0]?.id ?? null);

  const facturaActual = facturas.find(f => f.id === facturaSeleccionada) ?? facturas[0];

  /**
   * Regla del módulo: un insumo es "solicitado" si su id está en el detalle de
   * la Orden de Compra; todo lo que no esté (llegó de más en la recepción) es
   * "no solicitado". El `esNoSolicitado` del guardado queda como respaldo para
   * datos viejos sin id comparable.
   */
  const idsOrden = useMemo(() => new Set(orden.items.map(i => i.idInsumo)), [orden.items]);
  const esSolicitado = (i: OrdenItem) =>
    idsOrden.has(i.idInsumo) || (i.esNoSolicitado === false && idsOrden.size === 0);

  const itemsFactura = facturaActual?.items ?? [];
  const solicitados = itemsFactura.filter(i => esSolicitado(i));
  const noSolicitados = itemsFactura.filter(i => !esSolicitado(i));
  const totalPagado = itemsFactura.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0);

  /** Fecha y hora del último cambio de estado (sin prefijos). */
  const historial = orden.historialEstados ?? [];
  const ultimoCambio = historial[historial.length - 1];
  const fechaEstado = formatearFechaHora(
    ultimoCambio?.fechaHora ?? orden.recepcion?.fechaRecepcion ?? orden.fecha
  );

  /** Las tablas miden según sus filas; solo con muchas filas scrollean solas.
      En móvil (columnas apiladas) siempre pueden desplazar en horizontal. */
  const FILAS_SCROLL = 15;
  const claseTabla = (filas: number) =>
    `rounded-xl border border-border ${filas > FILAS_SCROLL ? "max-h-[55vh] overflow-auto" : "overflow-x-auto"}`;

  return (
    <div className="px-4 sm:px-6 pt-5 pb-4 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 mb-5 pb-5 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          title="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
            Orden {orden.id}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {orden.proveedor} · {orden.fecha}
          </p>
        </div>
        <div className="ml-auto">
          <EstadoBadge e={orden.estado} />
        </div>
      </div>

      {/* Dos columnas — apiladas en móvil, fila desde lg */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-0 overflow-y-auto lg:overflow-hidden">
        {/* Columna izquierda — Orden de Compra */}
        <div className="flex-1 min-w-0 flex flex-col lg:overflow-y-auto lg:pr-6">
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Orden de Compra
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Info de la orden */}
          <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">N° Orden</p>
              <p className="text-sm font-semibold text-foreground">{orden.id}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Proveedor</p>
              <p className="text-sm font-semibold text-foreground">{orden.proveedor}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Fecha</p>
              <p className="text-sm font-semibold text-foreground">{orden.fecha}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Estado</p>
              <div className="flex items-center gap-2">
                <EstadoBadge e={orden.estado} />
                <span className="text-[11px] text-muted-foreground">{fechaEstado}</span>
              </div>
              {orden.estado === "Anulado" && orden.motivoAnulacion && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 break-words">
                  Motivo de anulación: {orden.motivoAnulacion}
                </p>
              )}
              <div className="hidden">
              </div>
            </div>
          </div>

          {/* Tabla de insumos pedidos */}
          <div className="flex flex-col shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Insumos pedidos
              </h3>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className={claseTabla(orden.items.length)}>
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider sticky top-0">
                  <tr>
                    {["Nombre", "Cantidad", "Unidad", "Monto unitario", "Subtotal"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orden.items.map(item => {
                    const facturado = item.facturado ?? insumosFacturados.has(item.idInsumo);
                    return (
                      <tr key={item.rowId} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {item.nombre}
                            {facturado && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                                Facturado
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.cantidad}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{item.unidad}</td>
                        <td className="px-4 py-3">{fmtCOP(item.precioUnitario)}</td>
                        <td className="px-4 py-3 font-semibold">{fmtCOP(item.subtotal ?? item.cantidad * item.precioUnitario)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total de la orden */}
          <div className="mt-4 pt-4 border-t border-border shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total</span>
              <span className="text-lg font-bold text-foreground">{fmtCOP(orden.total ?? calcTotal(orden.items))}</span>
            </div>
          </div>
        </div>

        {/* Divisor — horizontal apilado, vertical en fila */}
        <div className="h-px w-full lg:h-auto lg:w-px bg-border shrink-0" />

        {/* Columna derecha — Facturas */}
        <div className="flex-1 min-w-0 flex flex-col lg:overflow-y-auto lg:pl-6">
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Facturas
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          {facturas.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Sin facturas registradas</p>
            </div>
          ) : (
            <>
              {/* Chips de facturas */}
              <div className="flex flex-wrap gap-2 mb-4 shrink-0">
                {facturas.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFacturaSeleccionada(f.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      f.id === facturaSeleccionada
                        ? "bg-primary text-white shadow-md"
                        : "bg-muted text-foreground hover:bg-border"
                    }`}
                  >
                    <span className="font-mono">{f.numeroFactura}</span>
                  </button>
                ))}
              </div>

              {/* Detalle de la factura seleccionada */}
              {facturaActual && (
                <div className="flex flex-col">
                  <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">N° Factura</p>
                      <p className="text-sm font-semibold text-foreground font-mono">{facturaActual.numeroFactura}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Fecha de recepción</p>
                      <p className="text-sm font-semibold text-foreground">{facturaActual.fechaFactura}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Estado</p>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${facturaActual.estado === "Recibido" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        {facturaActual.estado}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Total</p>
                      <p className="text-sm font-bold text-foreground">{fmtCOP(facturaActual.valorTotal)}</p>
                    </div>
                  </div>

                  {/* Tabla de insumos de la factura — separar solicitados y no solicitados */}
                  <div className="flex flex-col shrink-0">
                    {/* Insumos solicitados (los que estaban en la OC) */}
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Insumos solicitados
                        </h3>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <div className={claseTabla(solicitados.length)}>
                        <table className="w-full text-sm min-w-[560px]">
                          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider sticky top-0">
                            <tr>
                              {["Nombre", "Cantidad", "Unidad", "Monto unitario", "Subtotal"].map(h => (
                                <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {solicitados.map(item => (
                              <tr key={item.rowId} className="hover:bg-muted/20">
                                <td className="px-4 py-3 font-medium text-foreground">{item.nombre}</td>
                                <td className="px-4 py-3 text-muted-foreground">{item.cantidad}</td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">{item.unidad}</td>
                                <td className="px-4 py-3">{fmtCOP(item.costoUnitario)}</td>
                                <td className="px-4 py-3 font-semibold">{fmtCOP(item.cantidad * item.costoUnitario)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-muted/50 border-t border-border">
                            <tr>
                              <td colSpan={4} className="px-4 py-2 text-xs font-bold text-muted-foreground text-right uppercase">
                                Subtotal solicitados
                              </td>
                              <td className="px-4 py-2 text-sm font-bold text-foreground">
                                {fmtCOP(solicitados.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Insumos no solicitados (agregados en la recepción) */}
                    {noSolicitados.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700">
                            Insumos no solicitados
                          </h3>
                          <div className="h-px flex-1 bg-amber-200" />
                        </div>
                        <div className={claseTabla(noSolicitados.length).replace("border-border", "border-amber-200")}>
                          <table className="w-full text-sm min-w-[560px]">
                            <thead className="bg-amber-50/50 text-xs text-amber-700 uppercase tracking-wider sticky top-0">
                              <tr>
                                {["Nombre", "Cantidad", "Unidad", "Monto unitario", "Subtotal"].map(h => (
                                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-100">
                              {noSolicitados.map(item => (
                                <tr key={item.rowId} className="hover:bg-amber-50/50">
                                  <td className="px-4 py-3 font-medium text-foreground">{item.nombre}</td>
                                  <td className="px-4 py-3 text-muted-foreground">{item.cantidad}</td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.unidad}</td>
                                  <td className="px-4 py-3">{fmtCOP(item.costoUnitario)}</td>
                                  <td className="px-4 py-3 font-semibold">{fmtCOP(item.cantidad * item.costoUnitario)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-amber-50/50 border-t border-amber-200">
                              <tr>
                                <td colSpan={4} className="px-4 py-2 text-xs font-bold text-amber-700 text-right uppercase">
                                  Subtotal no solicitados
                                </td>
                                <td className="px-4 py-2 text-sm font-bold text-amber-700">
                                  {fmtCOP(noSolicitados.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0))}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Total pagado (solicitados + no solicitados) */}
                    <div className="mt-4 pt-4 border-t border-border shrink-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total pagado</span>
                        <span className="text-lg font-bold text-foreground">{fmtCOP(totalPagado)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
