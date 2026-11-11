import api from "@/shared/services/api";
import { idInsumoApiDesdeFront } from "@/shared/utils/fichas";

/**
 * Presentaciones de compra (regla 2.2): cuántas unidades base trae cada
 * presentación de un insumo.
 *
 * Contrato del backend (README "Compras: IVA por ítem y presentaciones"):
 * - `GET  /api/insumos/:id/presentaciones` → lista configuradas.
 * - `POST /api/insumos/:id/presentaciones` → upsert con body
 *   `{ presentacion, unidades_base, estado? }`.
 */

/** Empaques de compra: se compran por presentación y necesitan factor
 *  (cuántas unidades base trae cada uno). Coincide con `PRESENTACIONES_COMPRA`
 *  del backend (`sivpro-backend/src/validators/insumos.validator.js`). */
export const PRESENTACIONES_COMPRA = ["paq", "paca", "caja", "bolsa", "sixpack"] as const;

/** true si la unidad es un empaque de compra (paq, paca, caja, bolsa, sixpack). */
export const esEmpaque = (unidad: string | null | undefined): boolean =>
  (PRESENTACIONES_COMPRA as readonly string[]).includes(String(unidad ?? "").trim());

/** Valor seleccionado del desplegable que abre "Otra presentación…". */
export const OTRA_PRESENTACION = "__otra_presentacion__";

export interface PresentacionConfigurada {
  /** Presentación de compra ("paca", "sixpack", …). */
  presentacion: string;
  /** Cuántas unidades base del insumo trae cada una de esa presentación. */
  unidadesBase: number;
}

interface PresentacionApi {
  id_presentacion?: number;
  id_insumo?: number;
  presentacion: string;
  unidades_base: number | string;
  estado?: boolean;
}

/** Helper de error: los 400/409 conservan su mensaje en español del servidor. */
export const mensajeErrorPresentaciones = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const normalizar = (row: PresentacionApi): PresentacionConfigurada | null => {
  const presentacion = typeof row.presentacion === "string" ? row.presentacion.trim() : "";
  const unidadesBase = Number(row.unidades_base);
  if (!presentacion) return null;
  if (!Number.isFinite(unidadesBase) || unidadesBase <= 0) return null;
  return { presentacion, unidadesBase };
};

/** Presentaciones configuradas de un insumo. Sin configurar devuelve []. */
export const listarPresentaciones = async (
  idInsumo: string | number,
): Promise<PresentacionConfigurada[]> => {
  const id = idInsumoApiDesdeFront(String(idInsumo));
  if (!Number.isFinite(id) || id <= 0) return [];
  const { data } = await api.get<PresentacionApi[]>(`/insumos/${id}/presentaciones`);
  return (Array.isArray(data) ? data : [])
    .filter((row) => row.estado !== false)
    .map(normalizar)
    .filter((row): row is PresentacionConfigurada => row !== null);
};

/** Crea o actualiza (upsert) la presentación de un insumo. */
export const guardarPresentacion = async (
  idInsumo: string | number,
  presentacion: string,
  unidadesBase: number,
): Promise<PresentacionConfigurada> => {
  const id = idInsumoApiDesdeFront(String(idInsumo));
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Selecciona un insumo del catálogo para guardar la presentación.");
  }
  const { data } = await api.post<PresentacionApi | PresentacionConfigurada>(
    `/insumos/${id}/presentaciones`,
    {
      presentacion: presentacion.trim(),
      unidades_base: unidadesBase,
      estado: true,
    },
  );
  // El backend responde la fila guardada; si viniera vacía se asume la enviada.
  const guardada = normalizar({
    presentacion: (data as PresentacionApi)?.presentacion ?? presentacion,
    unidades_base: (data as PresentacionApi)?.unidades_base ?? unidadesBase,
    estado: true,
  });
  return guardada ?? { presentacion: presentacion.trim(), unidadesBase };
};

/**
 * Medidas COMPATIBLES con la unidad base del insumo (caso A: medida directa):
 * la propia unidad base y su pareja de conversión (kg↔g, lt↔ml).
 */
export const unidadesCompatibles = (unidadBase: string | null | undefined): string[] => {
  const base = String(unidadBase ?? "").trim();
  if (!base) return [];
  const pareja: Record<string, string> = { kg: "g", g: "kg", lt: "ml", ml: "lt" };
  return pareja[base] ? [base, pareja[base]] : [base];
};

/**
 * Cuántas unidades base equivale UNA unidad de la presentación, para medidas
 * directas (caso A): 1 g = 0,001 kg, 1 kg = 1000 g, 1 ml = 0,001 lt, etc.
 * Devuelve null cuando no hay conversión conocida (presentaciones de compra:
 * para esas manda el factor configurado).
 */
export const factorUnidadDirecta = (
  presentacion: string,
  unidadBase: string | null | undefined,
): number | null => {
  const p = String(presentacion ?? "").trim();
  const base = String(unidadBase ?? "").trim();
  if (!p || !base) return null;
  if (p === base) return 1;
  const tabla: Record<string, number> = {
    "g:kg": 0.001,
    "kg:g": 1000,
    "ml:lt": 0.001,
    "lt:ml": 1000,
  };
  const factor = tabla[`${p}:${base}`];
  return factor === undefined ? null : factor;
};

/**
 * Factor de la línea: unidades base por UNA unidad de la presentación
 * elegida. `null` = empaque sin factor configurado (no se puede agregar la
 * línea hasta configurarlo).
 */
export const factorDePresentacion = (
  presentacion: string,
  unidadBase: string | null | undefined,
  configuradas: readonly PresentacionConfigurada[],
): number | null => {
  const p = String(presentacion ?? "").trim();
  const base = String(unidadBase ?? "").trim();
  if (!p || !base) return null;
  if (p === base) return 1;
  const directo = factorUnidadDirecta(p, base);
  if (directo !== null) return directo;
  if (!esEmpaque(p)) return null;
  const configurada = configuradas.find((c) => c.presentacion === p);
  return configurada ? configurada.unidadesBase : null;
};
