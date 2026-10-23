import api from "@/shared/services/api";
import type { EstadoGestion, GestionCompra, OrdenItem } from "@/features/orden-compra/pages/OrdenCompraScreen";
import { mapearItemCompraApi, payloadItemCompra, type ItemCompraApi } from "@/features/orden-compra/services/ordenesCompraApi";

/** Compra tal como la devuelve el backend. Los ítems viajan en `items` (o en
    `detalle`, según el endpoint); los dos se aceptan al mapear. */
export interface CompraApi {
  id_compra: number | string;
  id_ocompra: number | string | null;
  id_proveedor: number | string | null;
  proveedor_nombre?: string | null;
  n_factura: string;
  fecha: string;
  iva_incluido: boolean;
  subtotal_sin_iva: number | string;
  total_iva: number | string;
  total: number | string;
  /** 'Recibido' | 'Anulado' */
  estado: string;
  motivo_anulacion?: string | null;
  fecha_anulacion?: string | null;
  items?: ItemCompraApi[];
  detalle?: ItemCompraApi[];
}

/** Helper de error (los 409 conservan su mensaje del servidor). */
export const mensajeErrorCompras = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

/** Compra del backend → modelo del panel (`GestionCompra`). */
export const mapearCompraApi = (row: CompraApi): GestionCompra => {
  const items = (row.items ?? row.detalle ?? []).map(mapearItemCompraApi);
  return {
    id: String(row.id_compra),
    ordenId: row.id_ocompra == null ? "" : String(row.id_ocompra),
    ...(row.proveedor_nombre ? { proveedor: row.proveedor_nombre } : {}),
    ...(row.id_proveedor == null ? {} : { proveedorId: String(row.id_proveedor) }),
    numeroFactura: row.n_factura,
    fechaFactura: String(row.fecha ?? "").slice(0, 10),
    valorTotal: Number(row.total),
    estado: (row.estado === "Anulado" ? "Anulado" : "Recibido") as EstadoGestion,
    items,
    compraCreada: true,
    ivaIncluido: Boolean(row.iva_incluido),
    subtotalSinIva: Number(row.subtotal_sin_iva ?? 0),
    totalIva: Number(row.total_iva ?? 0),
    totalPagado: Number(row.total ?? 0),
    ...(row.motivo_anulacion ? { motivoAnulacion: row.motivo_anulacion } : {}),
    ...(row.fecha_anulacion
      ? { fechaAnulacion: String(row.fecha_anulacion).slice(0, 10) }
      : {}),
  };
};

export const listarCompras = async (filtros?: {
  estado?: string;
  id_proveedor?: number;
  id_ocompra?: number;
}): Promise<GestionCompra[]> => {
  const params: Record<string, string> = {};
  if (filtros?.estado) params.estado = filtros.estado;
  if (filtros?.id_proveedor) params.id_proveedor = String(filtros.id_proveedor);
  if (filtros?.id_ocompra) params.id_ocompra = String(filtros.id_ocompra);
  const { data } = await api.get<CompraApi[]>("/compras", { params });
  return data.map(mapearCompraApi);
};

export const obtenerCompra = async (id: string): Promise<GestionCompra> => {
  const { data } = await api.get<CompraApi>(`/compras/${Number(id)}`);
  return mapearCompraApi(data);
};

/** Compra directa (sin orden de compra). El backend suma el stock de insumos y
    productos, actualiza costos y deja la bebida sin precio en "Disponible". */
export const crearCompra = async (payload: {
  n_factura: string;
  fecha: string;
  id_proveedor?: number | null;
  iva_incluido: boolean;
  items: OrdenItem[];
}): Promise<GestionCompra> => {
  const { data } = await api.post<CompraApi>("/compras", {
    n_factura: payload.n_factura,
    fecha: payload.fecha,
    id_proveedor: payload.id_proveedor ?? null,
    iva_incluido: payload.iva_incluido,
    items: payload.items.map((i) => payloadItemCompra(i)),
  });
  return mapearCompraApi(data);
};

/** Anula la compra devolviendo el stock. 409 si ya se usaron/vendieron
    unidades (el mensaje nombra el producto). */
export const anularCompra = async (id: string, motivo: string): Promise<GestionCompra> => {
  const { data } = await api.patch<CompraApi>(`/compras/${Number(id)}/anular`, { motivo });
  return mapearCompraApi(data);
};

export type { OrdenItem };
