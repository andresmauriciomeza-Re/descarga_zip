import api from "@/shared/services/api";
import { type ConfigCategoria } from "@/shared/utils/configCategoria";
import {
  idInsumoApiDesdeFront,
  idInsumoFront,
  type DestinoFicha,
  type FichaVersion,
  type RInsumo,
} from "@/shared/utils/fichas";

/** Fila de insumo de una ficha tal como la devuelve el backend. */
export interface FichaLineaApi {
  id_insumo: number | string;
  nombre: string;
  unidad_insumo: string;
  cantidad: number | string;
  medida: string;
}

/** Ficha técnica tal como la devuelve el backend (GET /fichas, /fichas/vigentes
    y POST /fichas). `sinCambios` solo viaja en la respuesta de POST cuando el
    servidor no creó versión nueva porque el contenido era idéntico. */
export interface FichaApi {
  id_ft: number | string;
  id_producto: number | string | null;
  id_insumo: number | string | null;
  version: number | string;
  fecha_inicio: string;
  fecha_final: string | null;
  vigente: boolean;
  cantidad: number | string;
  medida: string;
  porciones: number | string | null;
  tiempo_preparacion: number | string | null;
  pasos: string[] | null;
  total: number | string;
  insumos: FichaLineaApi[];
  sinCambios?: boolean;
}

/** Cuerpo de POST /api/fichas (versión nueva). */
export interface FichaPayloadApi {
  id_producto?: number;
  id_insumo?: number;
  /** Producto: siempre 1 "und". Producto insumo: la "Cantidad a hacer". */
  cantidad: number;
  medida: string;
  /** Porciones del PRIMER tamaño (productos); las demás se derivan solas. */
  porciones?: number | null;
  tiempo_preparacion?: number | null;
  pasos: string[];
  insumos: { id_insumo: number; cantidad: number; medida: string }[];
}

/** Helper de error compartido por los servicios de producción. */
export const mensajeErrorFichas = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

/** Porciones por tamaño de una ficha de PRODUCTO: los tamaños que define la
    categoría (CONFIG_CATEGORIA) con el primero = `porciones` de la base (es el
    único que se guarda en la tabla) y la Grande de pizza fija en 8, que es lo
    que muestra el editor y por lo que no se pierde nada al guardar. Sin
    configuración no se arma la lista (el editor muestra "Único"). */
const porcionesPorTamanoDe = (
  config: ConfigCategoria | null | undefined,
  porcionesBase: number,
): FichaVersion["porcionesPorTamano"] => {
  const tamanos = config?.tamanos;
  if (!tamanos || tamanos.length === 0) return undefined;
  return tamanos.map((t, i) =>
    i === 0
      ? { tamano: t.tamano, porciones: porcionesBase }
      : { tamano: t.tamano, porciones: t.tamano === "Grande" ? 8 : t.porciones },
  );
};

/** Ficha del backend → `FichaVersion` del frontend. `config` es la
    configuración de la categoría del DUEÑO (solo aplica a las fichas de
    producto); las fichas de producto insumo guardan `rendimiento` = cantidad. */
export const mapearFichaApi = (
  f: FichaApi,
  config?: ConfigCategoria | null,
): FichaVersion => {
  const esInsumo = f.id_insumo != null && f.id_insumo !== "";
  const destino: DestinoFicha = esInsumo
    ? { tipo: "producto-insumo", insumoId: idInsumoFront(f.id_insumo as number | string) }
    : { tipo: "producto", productoId: String(f.id_producto) };
  const porciones = Number(f.porciones ?? 1) || 1;
  return {
    version: Number(f.version),
    idReceta: String(Number(f.id_ft)).padStart(3, "0"),
    idFt: Number(f.id_ft),
    destino,
    tiempoPreparacion: Number(f.tiempo_preparacion ?? 0) || 0,
    ...(esInsumo ? { rendimiento: Number(f.cantidad) || 1 } : {}),
    porciones,
    ...(esInsumo ? {} : { porcionesPorTamano: porcionesPorTamanoDe(config, porciones) }),
    insumos: (f.insumos ?? []).map((l): RInsumo => ({
      insumoId: idInsumoFront(l.id_insumo),
      nombre: l.nombre,
      cantidad: Number(l.cantidad),
      unidad: l.medida || l.unidad_insumo,
    })),
    pasos: (f.pasos ?? []).filter((p) => typeof p === "string" && p.trim() !== ""),
    fechaInicio: f.fecha_inicio,
    fechaFin: f.fecha_final ?? null,
  };
};

/** Filas del backend → mapa `FichasPorProducto`. La clave es el id del dueño
    en el frontend: `String(id_producto)` o `"INS-" + id_insumo`. Si llegan dos
    versiones del mismo dueño (no debería con /vigentes) se conserva el orden. */
export const mapearFichasApi = (
  filas: FichaApi[],
  configDeProducto: (idProducto: string) => ConfigCategoria | null = () => null,
): Record<string, FichaVersion[]> => {
  const mapa: Record<string, FichaVersion[]> = {};
  for (const fila of filas) {
    const esInsumo = fila.id_insumo != null && fila.id_insumo !== "";
    const clave = esInsumo
      ? idInsumoFront(fila.id_insumo as number | string)
      : String(fila.id_producto);
    const config = esInsumo ? null : configDeProducto(clave);
    mapa[clave] = [...(mapa[clave] ?? []), mapearFichaApi(fila, config)];
  }
  return mapa;
};

/** `FichaVersion` → cuerpo de POST /fichas. `resolverIdInsumo` devuelve el
    `id_insumo` de la API de cada fila (por su `insumoId` o por nombre, según
    lo que traiga la ficha); si devuelve null esa fila no existe en la API. */
export const payloadFicha = (
  v: FichaVersion,
  dueno: { id_producto: number } | { id_insumo: number; unidadMedida: string },
  resolverIdInsumo: (fila: RInsumo) => number | null,
): FichaPayloadApi => {
  const enBase = "id_producto" in dueno;
  return {
    ...(enBase ? { id_producto: dueno.id_producto } : { id_insumo: (dueno as { id_insumo: number }).id_insumo }),
    cantidad: enBase ? 1 : Number(v.rendimiento) || 1,
    medida: enBase ? "und" : (dueno as { unidadMedida: string }).unidadMedida,
    porciones: enBase ? v.porciones : null,
    tiempo_preparacion: v.tiempoPreparacion > 0 ? v.tiempoPreparacion : null,
    pasos: v.pasos,
    insumos: v.insumos.map((l) => ({
      id_insumo: resolverIdInsumo(l) ?? 0,
      cantidad: l.cantidad,
      medida: l.unidad,
    })),
  };
};

/** Fichas de producto guardadas en local antes de conectar la API (respaldo de
    la fase 1, `sivpro.fichasProductos.v1-respaldo-fase1`). No se cargan solas:
    solo alimentan el botón "Subir ficha guardada" de Gestión de Productos. */
export const leerFichasRespaldoFase1 = (): Record<string, FichaVersion[]> => {
  try {
    const raw = localStorage.getItem("sivpro.fichasProductos.v1-respaldo-fase1");
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, FichaVersion[]>;
  } catch {
    return {};
  }
};

/** TODAS las versiones de la ficha de un dueño (historial). `GET /api/fichas`
    exige exactamente uno de los dos parámetros. */
export const obtenerFichasDe = async (
  dueno: { id_producto: number } | { id_insumo: number },
): Promise<FichaApi[]> => {
  const params =
    "id_producto" in dueno ? { id_producto: dueno.id_producto } : { id_insumo: dueno.id_insumo };
  const { data } = await api.get<FichaApi[]>("/fichas", { params });
  return data;
};

/** Fichas vigentes de TODO (productos y productos insumo). */
export const obtenerFichasVigentes = async (): Promise<FichaApi[]> => {
  const { data } = await api.get<FichaApi[]>("/fichas/vigentes");
  return data;
};

/** Crea una versión nueva. El backend responde 201 con la ficha nueva o 200
    con `sinCambios: true` cuando el contenido era el mismo. */
export const crearFicha = async (payload: FichaPayloadApi): Promise<FichaApi> => {
  const { data } = await api.post<FichaApi>("/fichas", payload);
  return data;
};
