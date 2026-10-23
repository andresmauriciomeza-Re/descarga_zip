import api from "@/shared/services/api";
import type { AxiosResponse } from "axios";
import type { FaltanteUnidad } from "@/shared/utils/disponibilidad";
import { idInsumoApiDesdeFront, idInsumoFront } from "@/shared/utils/fichas";
import {
  type EstadoOrden,
  type InsumoRequerido,
  type LineaOrden,
  type OrdenProduccion,
  type TipoOrden,
} from "@/features/orden-produccion/pages/OrdenProduccionScreen";

/** Fila de línea de orden tal como la devuelve el backend. */
export interface LineaOrdenApi {
  id_detalle_op: number | string;
  id_producto: number | string | null;
  id_insumo: number | string | null;
  id_ft: number | string | null;
  version_ficha: number | string | null;
  nombre: string;
  tamano: string | null;
  cantidad_estimada: number | string;
  cantidad_real: number | string | null;
  merma: number | string | null;
  unidad: string;
}

/** Orden tal como la devuelve el backend (`op.*` + `lineas`). */
export interface OrdenApi {
  id_orden_produccion: number | string;
  tipo: "Preparacion" | "Pedido";
  id_venta: number | string | null;
  fecha_solicitada: string;
  hora_solicitada: string | null;
  estado: "Pendiente" | "En proceso" | "Completada" | "Cancelada";
  observacion: string | null;
  venta_numero: string | null;
  cliente: string | null;
  fecha_creacion: string;
  fecha_en_proceso: string | null;
  fecha_completada: string | null;
  fecha_cancelada: string | null;
  descripcion_preparacion: string | null;
  tiempo_preparacion_min: number | string | null;
  insumos_descontados: boolean | null;
  productos_descontados: boolean | null;
  stock_aplicado: boolean | null;
  historial: TransicionApi[] | string | null;
  insumos_requeridos: RequeridoApi[] | string | null;
  lineas: LineaOrdenApi[];
}

interface TransicionApi {
  de: string | null;
  a: string;
  fechaHora: string;
  detalle?: string | null;
}

interface RequeridoApi {
  id_insumo: number | string | null;
  nombre: string;
  requerido: number | string | null;
  stock: number | string | null;
  falta: number | string | null;
  unidad: string | null;
  motivo?: string | null;
}

/** Faltante del 409 de la API (o de GET /:id/requeridos). */
export interface FaltanteApi {
  id_insumo: number | string | null;
  nombre: string;
  requerido: number | string | null;
  stock: number | string | null;
  falta: number | string | null;
  unidad: string | null;
  motivo?: string | null;
}

/** Error de la API con sus `faltantes` (el interceptor compartido de `api`
    solo conserva message+status). */
export interface ErrorConFaltantes extends Error {
  status?: number;
  faltantes?: FaltanteApi[];
}

export const mensajeErrorOrdenes = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

/** Faltantes del servidor → modelo de pantalla (`FaltanteUnidad`). */
export const mapearFaltanteApi = (f: FaltanteApi): FaltanteUnidad => ({
  insumoId: f.id_insumo == null ? "" : idInsumoFront(f.id_insumo),
  nombre: f.nombre,
  requerido: Number(f.requerido ?? 0),
  stock: Number(f.stock ?? 0),
  falta: Number(f.falta ?? 0),
  unidad: f.unidad ?? "und",
  ...(f.motivo ? { motivoTexto: f.motivo } : {}),
});

const estadoAFront = (estado: OrdenApi["estado"]): EstadoOrden =>
  estado === "En proceso"
    ? "en-proceso"
    : estado === "Completada"
      ? "completada"
      : estado === "Cancelada"
        ? "cancelada"
        : "pendiente";

const parsearJson = <T>(valor: T | string | null | undefined): T => {
  if (typeof valor === "string") {
    try {
      return JSON.parse(valor) as T;
    } catch {
      return [] as unknown as T;
    }
  }
  return (valor ?? []) as T;
};

/** Orden del backend → modelo de la pantalla. El `fichaSnapshot` NO se arma
    aquí: se pide con `GET /api/fichas` cuando se abre "Ver ficha" (guardando
    el `idFt` de cada línea). */
export const mapearOrdenApi = (row: OrdenApi): OrdenProduccion => {
  const tipo: TipoOrden = row.tipo === "Pedido" ? "pedido" : "preparacion";
  const lineas = (row.lineas ?? []).map((l): LineaOrden => {
    const esPedido = l.id_producto != null && l.id_producto !== "";
    return {
      idProducto: esPedido ? String(l.id_producto) : idInsumoFront(l.id_insumo as number | string),
      ...(esPedido ? { productoId: String(l.id_producto) } : {}),
      nombre: l.nombre,
      unidad: l.unidad,
      cantidadEstimada: Number(l.cantidad_estimada),
      ...(l.tamano ? { tamano: l.tamano } : {}),
      ...(l.cantidad_real == null ? {} : { cantidadReal: Number(l.cantidad_real) }),
      ...(l.merma == null ? {} : { merma: Number(l.merma) }),
      ...(esPedido && l.id_ft == null ? { sinFicha: true } : {}),
      idDetalleOp: Number(l.id_detalle_op),
      idFt: l.id_ft == null ? null : Number(l.id_ft),
      versionFicha: l.version_ficha == null ? null : Number(l.version_ficha),
    };
  });
  const requeridos = parsearJson<RequeridoApi[]>(row.insumos_requeridos).map(
    (r): InsumoRequerido => ({
      insumoId: r.id_insumo == null ? "" : idInsumoFront(r.id_insumo),
      nombre: r.nombre,
      cantidad: Number(r.requerido ?? 0),
      unidad: r.unidad ?? "und",
    }),
  );
  const historial = parsearJson<TransicionApi[]>(row.historial).map((h) => ({
    de: h.de ? estadoAFront(h.de as OrdenApi["estado"]) : estadoAFront(row.estado),
    a: estadoAFront(h.a as OrdenApi["estado"]),
    fechaHora: h.fechaHora,
    ...(h.detalle ? { detalle: h.detalle } : {}),
  }));
  return {
    id: `OP-${String(Number(row.id_orden_produccion)).padStart(3, "0")}`,
    idApi: Number(row.id_orden_produccion),
    tipo,
    lineas,
    insumosRequeridos: requeridos,
    ...(row.id_venta == null ? {} : { ventaId: String(row.id_venta) }),
    ventaNumero: row.venta_numero,
    cliente: row.cliente,
    fechaSolicitada: String(row.fecha_solicitada).slice(0, 10),
    horaSolicitada: row.hora_solicitada ?? "",
    estadoOrden: estadoAFront(row.estado),
    observacion: row.observacion ?? "",
    creadaEn: row.fecha_creacion,
    inicioProduccion: row.fecha_en_proceso,
    entregaEstimada: row.fecha_completada ?? row.fecha_cancelada ?? null,
    historial,
    ...(row.descripcion_preparacion
      ? { descripcionPreparacion: row.descripcion_preparacion }
      : {}),
    ...(row.tiempo_preparacion_min == null
      ? {}
      : { tiempoPreparacionMin: Number(row.tiempo_preparacion_min) }),
    ...(row.insumos_descontados ? { insumosDescontados: true } : {}),
    ...(row.productos_descontados ? { productosDescontados: true } : {}),
    ...(row.stock_aplicado ? { stockAplicado: true } : {}),
  };
};

/** Lanza el error del servidor conservando el `faltantes` de los 409. El
    interceptor compartido de `api` solo conserva message+status, así que para
    estos endpoints se acepta la respuesta con `validateStatus` y se arma el
    error aquí (sin tocar `shared/services`). */
async function conFaltantes<T>(peticion: Promise<AxiosResponse<T>>): Promise<T> {
  const { data, status } = await peticion;
  if (status >= 400) {
    const cuerpo = (data as unknown as { error?: { message?: string; faltantes?: FaltanteApi[] } })
      ?.error;
    const err: ErrorConFaltantes = new Error(
      cuerpo?.message ?? "No se pudo completar la operación de órdenes de producción.",
    );
    err.status = status;
    err.faltantes = cuerpo?.faltantes ?? [];
    throw err;
  }
  return data;
}

const crudo = { validateStatus: () => true } as const;

export const listarOrdenesProduccion = async (filtros?: {
  estado?: string;
  tipo?: string;
}): Promise<OrdenProduccion[]> => {
  const params: Record<string, string> = {};
  if (filtros?.estado) params.estado = filtros.estado;
  if (filtros?.tipo) params.tipo = filtros.tipo;
  const { data } = await api.get<OrdenApi[]>("/ordenes-produccion", { params });
  return data.map(mapearOrdenApi);
};

export const obtenerOrdenProduccion = async (id: string): Promise<OrdenProduccion> => {
  const idApi = Number(String(id).replace(/^OP-/, ""));
  const { data } = await api.get<OrdenApi>(`/ordenes-produccion/${idApi}`);
  return mapearOrdenApi(data);
};

/** `{ requeridos, faltantes }` de una orden (lo usa "Ver ficha"/diagnóstico). */
export const obtenerRequeridosOrden = async (
  id: string,
): Promise<{ requeridos: InsumoRequerido[]; faltantes: FaltanteUnidad[] }> => {
  const idApi = Number(String(id).replace(/^OP-/, ""));
  const { data } = await api.get<{ requeridos: RequeridoApi[]; faltantes: FaltanteApi[] }>(
    `/ordenes-produccion/${idApi}/requeridos`,
  );
  return {
    requeridos: (data.requeridos ?? []).map((r) => ({
      insumoId: r.id_insumo == null ? "" : idInsumoFront(r.id_insumo),
      nombre: r.nombre,
      cantidad: Number(r.requerido ?? 0),
      unidad: r.unidad ?? "und",
    })),
    faltantes: (data.faltantes ?? []).map(mapearFaltanteApi),
  };
};

/** Crear "Preparación en lote". `lineas[].id` es el id del frontend ("INS-###")
    del producto insumo a preparar. 409 con `faltantes` si no alcanza el stock. */
export const crearOrdenPreparacionApi = async (payload: {
  fecha_solicitada: string;
  hora_solicitada?: string | null;
  observacion?: string | null;
  lineas: { id: string; cantidad: number }[];
}): Promise<OrdenProduccion> => {
  const data = await conFaltantes(
    api.post<OrdenApi>(
      "/ordenes-produccion",
      {
        fecha_solicitada: payload.fecha_solicitada,
        hora_solicitada: payload.hora_solicitada ?? null,
        observacion: payload.observacion ?? null,
        lineas: payload.lineas.map((l) => ({
          id_insumo: idInsumoApiDesdeFront(l.id),
          cantidad: l.cantidad,
        })),
      },
      crudo,
    ),
  );
  return mapearOrdenApi(data);
};

export const actualizarOrdenProduccion = async (
  id: string,
  payload: {
    fecha_solicitada?: string;
    hora_solicitada?: string | null;
    observacion?: string | null;
    lineas?: { id: string; cantidad: number }[];
  },
): Promise<OrdenProduccion> => {
  const idApi = Number(String(id).replace(/^OP-/, ""));
  const data = await conFaltantes(
    api.put<OrdenApi>(
      `/ordenes-produccion/${idApi}`,
      {
        ...(payload.fecha_solicitada ? { fecha_solicitada: payload.fecha_solicitada } : {}),
        ...(payload.hora_solicitada !== undefined ? { hora_solicitada: payload.hora_solicitada } : {}),
        ...(payload.observacion !== undefined ? { observacion: payload.observacion } : {}),
        ...(payload.lineas
          ? {
              lineas: payload.lineas.map((l) => ({
                id_insumo: idInsumoApiDesdeFront(l.id),
                cantidad: l.cantidad,
              })),
            }
          : {}),
      },
      crudo,
    ),
  );
  return mapearOrdenApi(data);
};

export const eliminarOrdenProduccion = async (id: string): Promise<void> => {
  const idApi = Number(String(id).replace(/^OP-/, ""));
  await api.delete(`/ordenes-produccion/${idApi}`);
};

/** Inicia la orden (descuenta insumos). 409 con `faltantes` si no alcanza. */
export const iniciarOrdenProduccion = async (id: string): Promise<OrdenProduccion> => {
  const idApi = Number(String(id).replace(/^OP-/, ""));
  const data = await conFaltantes(
    api.post<OrdenApi>(`/ordenes-produccion/${idApi}/iniciar`, {}, crudo),
  );
  return mapearOrdenApi(data);
};

/** Completa la orden. Preparación: manda la "cantidad que salió" por línea
    (`idDetalleOp`); pedido: sin body. La merma la guarda el backend. */
export const completarOrdenProduccion = async (
  id: string,
  lineas?: { idDetalleOp: number; cantidadReal: number }[],
): Promise<OrdenProduccion> => {
  const idApi = Number(String(id).replace(/^OP-/, ""));
  const data = await conFaltantes(
    api.post<OrdenApi>(
      `/ordenes-produccion/${idApi}/completar`,
      lineas
        ? { lineas: lineas.map((l) => ({ id_detalle_op: l.idDetalleOp, cantidad_real: l.cantidadReal })) }
        : {},
      crudo,
    ),
  );
  return mapearOrdenApi(data);
};

/** Da de baja una orden (motivo + descripción del formulario actual). */
export const darBajaOrdenProduccion = async (
  id: string,
  motivo: string,
  descripcion: string,
): Promise<OrdenProduccion> => {
  const idApi = Number(String(id).replace(/^OP-/, ""));
  const { data } = await api.post<OrdenApi>(`/ordenes-produccion/${idApi}/dar-baja`, {
    motivo,
    descripcion,
  });
  return mapearOrdenApi(data);
};
