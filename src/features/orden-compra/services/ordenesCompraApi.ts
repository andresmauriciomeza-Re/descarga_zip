import api from "@/shared/services/api";
import type {
  EstadoOrden,
  ItemRecibido,
  OrdenCompra,
  OrdenItem,
  Recepcion,
} from "@/features/orden-compra/pages/OrdenCompraScreen";

/** Ítem de orden/compra tal como lo devuelve el backend. */
export interface ItemCompraApi {
  id_dorcompra?: number | string;
  id_dcompra?: number | string;
  id_insumo: number | string | null;
  id_producto: number | string | null;
  /** 'insumo' | 'producto' (el backend lo deriva de las columnas). */
  tipo_item?: string | null;
  nombre: string;
  cantidad: number | string;
  medida: string;
  precio_unitario: number | string;
  iva: number | string;
  subtotal?: number | string;
  base_sin_iva?: number | string;
  monto_iva?: number | string;
  es_no_solicitado?: boolean | null;
  precio_venta?: number | string | null;
}

/** Orden de compra tal como la devuelve el backend. */
export interface OrdenCompraApi {
  id_ocompra: number | string;
  id_proveedor: number | string;
  proveedor_nombre: string | null;
  fecha: string;
  total: number | string;
  /** 'Borrador' | 'Enviado' | 'Completado' | 'Anulado' */
  estado: string;
  fecha_estado?: string | null;
  historial_estados: { estado: string; fecha_estado: string }[];
  items: ItemCompraApi[];
  recepcion: RecepcionResumenApi | null;
  compras: { id_compra: number | string; n_factura: string; estado: string; total: number | string }[];
}

/** Resumen de recepción guardado por el backend (`tb_recepcion_orden`). */
export interface RecepcionResumenApi {
  items: {
    id_insumo: number | string | null;
    id_producto: number | string | null;
    nombre: string;
    solicitada: number | string;
    recibida: number | string;
    pendiente: number | string;
    unidad: string;
  }[];
  extras?: (ItemCompraApi & { recibida?: number | string })[];
  compras?: (number | string)[];
  actualizado?: string;
}

/** Helper de error (los 409 conservan su mensaje del servidor). */
export const mensajeErrorOrdenesCompra = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

/** Ítem del backend → modelo del panel. */
export const mapearItemCompraApi = (row: ItemCompraApi): OrdenItem => {
  const esProducto = row.tipo_item === "producto" || (row.tipo_item == null && row.id_producto != null);
  const id = esProducto
    ? String(row.id_producto)
    : `INS-${row.id_insumo}`;
  return {
    rowId: String(row.id_dorcompra ?? row.id_dcompra ?? `${id}-${row.nombre}`),
    idInsumo: id,
    nombre: row.nombre,
    cantidad: Number(row.cantidad),
    unidad: row.medida,
    costoUnitario: Number(row.precio_unitario),
    precioUnitario: Number(row.precio_unitario),
    iva: Number(row.iva ?? 0),
    ...(row.base_sin_iva == null ? {} : { baseSinIva: Number(row.base_sin_iva) }),
    ...(row.monto_iva == null ? {} : { montoIva: Number(row.monto_iva) }),
    ...(row.es_no_solicitado ? { esNoSolicitado: true } : {}),
    tipoItem: esProducto ? "producto" : "insumo",
    ...(row.precio_venta == null ? {} : { precioVenta: Number(row.precio_venta) }),
  };
};

/** Ítem del panel → cuerpo de la API. */
export const payloadItemCompra = (
  i: OrdenItem,
): {
  id_insumo?: number;
  id_producto?: number;
  cantidad: number;
  medida: string;
  precio_unitario: number;
  iva: number;
  precio_venta?: number;
} => {
  const esProducto = i.tipoItem === "producto";
  return {
    ...(esProducto
      ? { id_producto: Number(i.idInsumo) }
      : { id_insumo: Number(String(i.idInsumo).replace(/^INS-/, "")) }),
    cantidad: i.cantidad,
    medida: i.unidad,
    precio_unitario: i.precioUnitario ?? i.costoUnitario,
    iva: i.iva ?? 0,
    ...(i.precioVenta != null ? { precio_venta: i.precioVenta } : {}),
  };
};

export const mapearRecepcion = (r: RecepcionResumenApi | null | undefined): Recepcion | undefined => {
  if (!r) return undefined;
  const fila = (x: {
    id_insumo: number | string | null;
    id_producto: number | string | null;
    nombre: string;
    solicitada?: number | string;
    recibida?: number | string;
    unidad?: string;
    cantidad?: number | string;
    medida?: string;
  }): ItemRecibido => ({
    rowId: `${x.id_producto ?? x.id_insumo ?? x.nombre}-${x.nombre}`,
    idInsumo: x.id_producto != null ? String(x.id_producto) : `INS-${x.id_insumo}`,
    nombre: x.nombre,
    cantidadSolicitada: Number(x.solicitada ?? x.cantidad ?? 0),
    cantidadRecibida: Number(x.recibida ?? 0),
    unidad: x.unidad ?? x.medida ?? "und",
    precioReferencia: 0,
    costoUnitario: 0,
    precioUnitario: 0,
    iva: 0,
  });
  return {
    items: (r.items ?? []).map(fila),
    itemsExtra: (r.extras ?? []).map((x) => fila({ ...x, solicitada: x.cantidad ?? 0 })),
    usarLotes: false,
    fechaRecepcion: String(r.actualizado ?? "").slice(0, 10),
  };
};

export const mapearOrdenCompraApi = (row: OrdenCompraApi): OrdenCompra => ({
  id: String(row.id_ocompra),
  proveedor: row.proveedor_nombre ?? "",
  fecha: String(row.fecha ?? "").slice(0, 10),
  estado: row.estado as EstadoOrden,
  items: (row.items ?? []).map(mapearItemCompraApi),
  recepcion: mapearRecepcion(row.recepcion),
  historialEstados: (row.historial_estados ?? []).map((h) => ({
    estado: h.estado as EstadoOrden,
    fechaHora: h.fecha_estado,
  })),
});

export const listarOrdenesCompra = async (filtros?: {
  estado?: string;
  id_proveedor?: number;
}): Promise<OrdenCompra[]> => {
  const params: Record<string, string> = {};
  if (filtros?.estado) params.estado = filtros.estado;
  if (filtros?.id_proveedor) params.id_proveedor = String(filtros.id_proveedor);
  const { data } = await api.get<OrdenCompraApi[]>("/ordenes-compra", { params });
  return data.map(mapearOrdenCompraApi);
};

export const obtenerOrdenCompra = async (id: string): Promise<OrdenCompra> => {
  const { data } = await api.get<OrdenCompraApi>(`/ordenes-compra/${Number(id)}`);
  return mapearOrdenCompraApi(data);
};

export const crearOrdenCompra = async (payload: {
  id_proveedor: number;
  estado_inicial?: "Borrador" | "Enviado";
  items: OrdenItem[];
}): Promise<OrdenCompra> => {
  const { data } = await api.post<OrdenCompraApi>("/ordenes-compra", {
    id_proveedor: payload.id_proveedor,
    estado_inicial: payload.estado_inicial ?? "Borrador",
    items: payload.items.map(payloadItemCompra),
  });
  return mapearOrdenCompraApi(data);
};

/** Edición: solo se permite en Borrador (lo garantiza el servidor). */
export const actualizarOrdenCompra = async (
  id: string,
  payload: { id_proveedor: number; items: OrdenItem[] },
): Promise<OrdenCompra> => {
  const { data } = await api.put<OrdenCompraApi>(`/ordenes-compra/${Number(id)}`, {
    id_proveedor: payload.id_proveedor,
    items: payload.items.map(payloadItemCompra),
  });
  return mapearOrdenCompraApi(data);
};

/** Cambio de estado (las transiciones del frontend). Anulado exige `motivo`. */
export const cambiarEstadoOrdenCompra = async (
  id: string,
  estado: EstadoOrden,
  motivo?: string,
): Promise<OrdenCompra> => {
  const { data } = await api.patch<OrdenCompraApi>(`/ordenes-compra/${Number(id)}/estado`, {
    estado,
    ...(motivo ? { motivo } : {}),
  });
  return mapearOrdenCompraApi(data);
};

/** Recepción de compra (parcial o completa). El backend crea la compra, suma
    el stock y deja la OC en Enviado (si falta algo) o Completado. */
export const recibirOrdenCompra = async (
  id: string,
  payload: {
    n_factura: string;
    fecha: string;
    iva_incluido: boolean;
    items: OrdenItem[];
    items_no_solicitados: OrdenItem[];
  },
): Promise<{
  compra: unknown;
  estado: EstadoOrden;
  estado_orden?: EstadoOrden;
  recepcion: RecepcionResumenApi | null;
}> => {
  const { data } = await api.post<{
    compra: unknown;
    estado_orden?: EstadoOrden;
    estado?: EstadoOrden;
    recepcion: RecepcionResumenApi | null;
  }>(`/ordenes-compra/${Number(id)}/recepcion`, {
    n_factura: payload.n_factura,
    fecha: payload.fecha,
    iva_incluido: payload.iva_incluido,
    items: payload.items.map(payloadItemCompra),
    items_no_solicitados: payload.items_no_solicitados.map(payloadItemCompra),
  });
  return {
    compra: data.compra,
    estado: (data.estado_orden ?? data.estado ?? "Enviado") as EstadoOrden,
    recepcion: data.recepcion ?? null,
  };
};
