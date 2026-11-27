import type { ModoIva } from "@/features/purchases/services/vat";
import type { TipoPersona } from "@/features/suppliers/hooks/useSupplierForm";

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
