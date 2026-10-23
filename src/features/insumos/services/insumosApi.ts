import api from "@/shared/services/api";
import type { CategoriaInsumo, Insumo } from "@/features/insumos/pages/GestionInsumosScreen";
import { mapearFichaApi, type FichaApi } from "@/features/productos/services/fichasApi";
import { idInsumoFront, type FichaVersion } from "@/shared/utils/fichas";

/** Fila de categoría de insumos tal como la devuelve el backend. */
export interface CategoriaInsumoApi {
  id_categoria_insumo: number | string;
  nombre: string;
  estado: boolean;
}

/** Insumo tal como lo devuelve el backend (`mapearInsumo` del servidor). */
export interface InsumoApi {
  id_insumo: number | string;
  id_categoria_insumo: number | string;
  categoria_nombre: string;
  nombre: string;
  /** 'Insumo' | 'Producto insumo' */
  tipo: string;
  unidad_medida: string;
  stock_actual: number | string;
  stock_minimo: number | string;
  stock_maximo: number | string | null;
  costo_unitario: number | string;
  costo_maximo: number | string | null;
  iva: number | string;
  descripcion: string | null;
  tiempo_preparacion: number | string | null;
  /** true = activo. */
  estado: boolean;
  /** Solo en los 'Producto insumo'. */
  ficha_vigente?: FichaApi | null;
  /** Solo en la respuesta de POST /insumos con `crear_orden_produccion`. */
  orden_produccion?: { id_orden_produccion: number | string };
}

/** Resultado de crear un insumo: el registro y, si se pidió, su orden. */
export interface InsumoCreado {
  insumo: Insumo;
  ficha: FichaVersion | null;
  /** "OP-xxx" (id del frontend) de la orden creada con `crear_orden_produccion`. */
  ordenId: string | null;
}

/** Helper de error (mismo patrón que `mensajeErrorProductos`). */
export const mensajeErrorInsumos = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

/** 'Insumo' ↔ "Insumo" · 'Producto insumo' ↔ "ProductoInsumo" */
const tipoAFront = (tipo: string): string =>
  tipo === "Producto insumo" ? "ProductoInsumo" : "Insumo";
const tipoAApi = (tipo: string): string =>
  tipo === "ProductoInsumo" ? "Producto insumo" : "Insumo";

export const idInsumoFrontDesdeApi = idInsumoFront;

export const mapearCategoriaApi = (c: CategoriaInsumoApi): CategoriaInsumo => ({
  id: String(c.id_categoria_insumo),
  nombre: c.nombre,
  estado: c.estado,
});

/** Insumo del backend → modelo del frontend. La ficha vigente viaja aparte
    (para no repetirla dentro del registro). */
export const mapearInsumoApi = (row: InsumoApi): { insumo: Insumo; ficha: FichaVersion | null } => {
  const insumo: Insumo = {
    id: idInsumoFront(row.id_insumo),
    nombre: row.nombre,
    unidadMedida: row.unidad_medida,
    costoUnitario: Number(row.costo_unitario ?? 0),
    precioUnitario: null,
    iva: row.iva == null ? null : Number(row.iva),
    tipo: tipoAFront(row.tipo),
    stockActual: Number(row.stock_actual ?? 0),
    stockMinimo: Number(row.stock_minimo ?? 0),
    categoriaId: String(row.id_categoria_insumo),
    estado: row.estado ? "activo" : "inactivo",
    descripcion: row.descripcion ?? undefined,
    tiempoPreparacion:
      row.tiempo_preparacion == null ? undefined : Number(row.tiempo_preparacion),
  };
  const ficha = row.ficha_vigente ? mapearFichaApi(row.ficha_vigente, null) : null;
  return { insumo, ficha };
};

/** Lista del backend → `{ insumos, fichas }`, con la ficha vigente de cada
    producto insumo indexada por su id de frontend ("INS-###"). */
export const mapearInsumosApi = (
  rows: InsumoApi[],
): { insumos: Insumo[]; fichas: Record<string, FichaVersion[]> } => {
  const insumos: Insumo[] = [];
  const fichas: Record<string, FichaVersion[]> = {};
  for (const row of rows) {
    const { insumo, ficha } = mapearInsumoApi(row);
    insumos.push(insumo);
    if (ficha) fichas[insumo.id] = [ficha];
  }
  return { insumos, fichas };
};

export const listarCategoriasInsumo = async (): Promise<CategoriaInsumo[]> => {
  const { data } = await api.get<CategoriaInsumoApi[]>("/categorias-insumos");
  return data.map(mapearCategoriaApi);
};

export const listarInsumos = async (filtros?: {
  tipo?: string;
  estado?: boolean;
}): Promise<{ insumos: Insumo[]; fichas: Record<string, FichaVersion[]> }> => {
  const params: Record<string, string> = {};
  if (filtros?.tipo) params.tipo = tipoAApi(filtros.tipo);
  if (filtros?.estado !== undefined) params.estado = String(filtros.estado);
  const { data } = await api.get<InsumoApi[]>("/insumos", { params });
  return mapearInsumosApi(data);
};

/** Ficha de un producto insumo como la espera el backend en POST /insumos. */
export interface FichaInsumoPayload {
  /** La "Cantidad a hacer". */
  cantidad: number;
  tiempo_preparacion: number;
  pasos?: string[];
  insumos: { id_insumo: number; cantidad: number; medida: string }[];
}

export const crearInsumo = async (payload: {
  nombre: string;
  tipo: "Insumo" | "Producto insumo";
  id_categoria_insumo: number;
  unidad_medida: string;
  stock_minimo?: number;
  descripcion?: string;
  costo_unitario?: number;
  iva?: number;
  ficha?: FichaInsumoPayload;
  crear_orden_produccion?: boolean;
}): Promise<InsumoCreado> => {
  const { data } = await api.post<InsumoApi>("/insumos", payload);
  const { insumo, ficha } = mapearInsumoApi(data);
  return {
    insumo,
    ficha,
    ordenId: data.orden_produccion
      ? `OP-${String(Number(data.orden_produccion.id_orden_produccion)).padStart(3, "0")}`
      : null,
  };
};

/** Edición: el formulario solo cambia el stock mínimo (el resto de campos se
    conservan tal como están en el servidor), igual que antes de conectar. */
export const actualizarInsumo = async (
  id: string,
  payload: { stock_minimo: number },
): Promise<Insumo> => {
  const idInsumo = Number(String(id).replace(/^INS-/, ""));
  const { data } = await api.put<InsumoApi>(`/insumos/${idInsumo}`, payload);
  return mapearInsumoApi(data).insumo;
};

export const cambiarEstadoInsumo = async (id: string, estado: boolean): Promise<Insumo> => {
  const idInsumo = Number(String(id).replace(/^INS-/, ""));
  const { data } = await api.patch<InsumoApi>(`/insumos/${idInsumo}/estado`, { estado });
  return mapearInsumoApi(data).insumo;
};

export const eliminarInsumo = async (id: string): Promise<void> => {
  const idInsumo = Number(String(id).replace(/^INS-/, ""));
  await api.delete(`/insumos/${idInsumo}`);
};
