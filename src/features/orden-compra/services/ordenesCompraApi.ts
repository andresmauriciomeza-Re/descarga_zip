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
  cantidad_recibida?: number | string;
  cantidad_pendiente?: number | string;
  facturado?: boolean;
}

/** Orden de compra tal como la devuelve el backend. */
export interface OrdenCompraApi {
  id_ocompra: number | string;
  id_proveedor: number | string;
  proveedor_nombre: string | null;
  proveedor_nit?: string | null;
  fecha: string;
  total: number | string;
  facturado?: number | string;
  por_facturar?: number | string;
  total_facturas?: number | string;
  facturas?: string[];
  /** 'Borrador' | 'Enviado' | 'Completado' | 'Anulado' */
  estado: string;
  fecha_estado?: string | null;
  motivo_anulacion?: string | null;
  historial_estados: { estado: string; fecha_estado: string; motivo?: string | null }[];
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
    facturado?: boolean;
    unidad: string;
  }[];
  extras?: (ItemCompraApi & { recibida?: number | string })[];
  compras?: (number | string)[];
  actualizado?: string;
}

/** Respuesta paginada de órdenes de compra cuando se envían `page` o `limit`. */
export interface OrdenesCompraPaginadas {
  data: OrdenCompra[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
    ...(row.subtotal == null ? {} : { subtotal: Number(row.subtotal) }),
    ...(row.base_sin_iva == null ? {} : { baseSinIva: Number(row.base_sin_iva) }),
    ...(row.monto_iva == null ? {} : { montoIva: Number(row.monto_iva) }),
    ...(row.es_no_solicitado ? { esNoSolicitado: true } : {}),
    ...(row.cantidad_recibida == null ? {} : { cantidadRecibida: Number(row.cantidad_recibida) }),
    ...(row.cantidad_pendiente == null ? {} : { cantidadPendiente: Number(row.cantidad_pendiente) }),
    ...(row.facturado == null ? {} : { facturado: Boolean(row.facturado) }),
    tipoItem: esProducto ? "producto" : "insumo",
    ...(row.precio_venta == null ? {} : { precioVenta: Number(row.precio_venta) }),
  };
};

/** Ítem del panel → cuerpo de la API. Soporta insumos nuevos no solicitados (Regla 9). */
export const payloadItemCompra = (
  i: OrdenItem,
): {
  id_insumo?: number;
  id_producto?: number;
  nombre?: string;
  id_categoria_insumo?: number;
  cantidad: number;
  medida: string;
  precio_unitario: number;
  iva: number;
  precio_venta?: number;
} => {
  const esNuevoInsumo =
    Boolean(i.esNuevoInsumo) ||
    (i.idCategoriaInsumo != null && String(i.idInsumo).startsWith("INS-NUEVO-"));
  if (esNuevoInsumo && i.idCategoriaInsumo != null) {
    return {
      nombre: i.nombre,
      id_categoria_insumo: Number(i.idCategoriaInsumo),
      cantidad: i.cantidad,
      medida: i.unidad,
      precio_unitario: i.precioUnitario ?? i.costoUnitario,
      iva: i.iva ?? 0,
    };
  }
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
    pendiente?: number | string;
    facturado?: boolean;
    unidad?: string;
    cantidad?: number | string;
    medida?: string;
  }): ItemRecibido => ({
    rowId: `${x.id_producto ?? x.id_insumo ?? x.nombre}-${x.nombre}`,
    idInsumo: x.id_producto != null ? String(x.id_producto) : `INS-${x.id_insumo}`,
    nombre: x.nombre,
    cantidadSolicitada: Number(x.solicitada ?? x.cantidad ?? 0),
    cantidadRecibida: Number(x.recibida ?? 0),
    ...(x.pendiente == null ? {} : { pendiente: Number(x.pendiente) }),
    ...(x.facturado == null ? {} : { facturado: Boolean(x.facturado) }),
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
  ...(row.proveedor_nit ? { proveedorNit: row.proveedor_nit } : {}),
  fecha: String(row.fecha ?? "").slice(0, 10),
  estado: row.estado as EstadoOrden,
  total: Number(row.total ?? 0),
  facturado: Number(row.facturado ?? 0),
  porFacturar: row.por_facturar == null ? Number(row.total ?? 0) : Number(row.por_facturar),
  totalFacturas: Number(row.total_facturas ?? 0),
  facturas: row.facturas ?? [],
  ...(row.motivo_anulacion ? { motivoAnulacion: row.motivo_anulacion } : {}),
  items: (row.items ?? []).map(mapearItemCompraApi),
  recepcion: mapearRecepcion(row.recepcion),
  historialEstados: (row.historial_estados ?? []).map((h) => ({
    estado: h.estado as EstadoOrden,
    fechaHora: h.fecha_estado,
    ...(h.motivo ? { motivo: h.motivo } : {}),
  })),
});

export const listarOrdenesCompra = async (filtros?: {
  estado?: string;
  id_proveedor?: number;
  desde?: string;
  hasta?: string;
  q?: string;
}): Promise<OrdenCompra[]> => {
  const params: Record<string, string> = {};
  if (filtros?.estado) params.estado = filtros.estado;
  if (filtros?.id_proveedor) params.id_proveedor = String(filtros.id_proveedor);
  if (filtros?.desde) params.desde = filtros.desde;
  if (filtros?.hasta) params.hasta = filtros.hasta;
  if (filtros?.q) params.q = filtros.q;
  const { data } = await api.get<OrdenCompraApi[]>("/ordenes-compra", { params });
  return data.map(mapearOrdenCompraApi);
};

export const listarOrdenesCompraPaginado = async (filtros?: {
  page?: number;
  limit?: number;
  estado?: string;
  id_proveedor?: number;
  desde?: string;
  hasta?: string;
  q?: string;
}): Promise<OrdenesCompraPaginadas> => {
  const params: Record<string, string> = {
    page: String(filtros?.page ?? 1),
    limit: String(filtros?.limit ?? 20),
  };
  if (filtros?.estado) params.estado = filtros.estado;
  if (filtros?.id_proveedor) params.id_proveedor = String(filtros.id_proveedor);
  if (filtros?.desde) params.desde = filtros.desde;
  if (filtros?.hasta) params.hasta = filtros.hasta;
  if (filtros?.q) params.q = filtros.q;
  const { data } = await api.get<{
    data: OrdenCompraApi[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>("/ordenes-compra", { params });
  return {
    data: (data.data ?? []).map(mapearOrdenCompraApi),
    total: Number(data.total ?? 0),
    page: Number(data.page ?? 1),
    limit: Number(data.limit ?? 20),
    totalPages: Number(data.totalPages ?? 1),
  };
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
    estado_inicial: "Borrador",
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

/** Eliminación física: solo permitida en estado Borrador (DELETE /api/ordenes-compra/:id). */
export const eliminarOrdenCompra = async (
  id: string,
): Promise<{ message: string; id_ocompra: number }> => {
  const { data } = await api.delete<{ message: string; id_ocompra: number }>(
    `/ordenes-compra/${Number(id)}`,
  );
  return data;
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
