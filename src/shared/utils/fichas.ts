/**
 * Modelo único de las fichas técnicas del sistema.
 *
 * Antes había dos registros de recetas independientes: la "receta" que vivía
 * dentro del Producto Insumo (`Insumo.composicion` / `descripcion` /
 * `tiempoPreparacion`, en Compras > Insumos) y la "ficha técnica" del Producto
 * (con versiones, en Producción > Productos). Aquí vive UNA sola ficha:
 *
 *   - la versión del registro la conserva el mismo array de siempre;
 *   - `destino` dice a qué registro pertenece (Producto Insumo o Producto);
 *   - las filas de insumos llevan `insumoId` (catálogo real de Insumos) y
 *     conservan `nombre` para mostrarlo y como respaldo de las fichas viejas.
 *
 * Los campos legacy del `Insumo` (`composicion`, `descripcion`,
 * `tiempoPreparacion`) se conservan en el modelo SIN sincronizarse con esta
 * ficha: son solo el respaldo de los registros creados antes de la
 * unificación. Nada los vuelve a escribir; los lee el fallback de Orden de
 * Producción para líneas antiguas y `fichaDesdeLegacyInsumo` para migrar.
 */
import type { Insumo } from "@/features/insumos/pages/GestionInsumosScreen";
import { resolverInsumo } from "@/features/productos/components/InsumoSearchField";

/** Fila de insumo de la ficha. `insumoId` es el id real del catálogo; las
    fichas guardadas antes de este campo no lo traen y se completan al cargar
    (`migrarFichasLegacy`) por coincidencia exacta de nombre. */
export interface RInsumo {
  insumoId?: string;
  nombre: string;
  cantidad: number;
  unidad: string;
}

/** Tamaños que admite la lista "Porciones por tamaño" de la ficha. */
export const TAMANOS_FICHA = ["Grande", "Mediana", "Normal"] as const;
export type TamanoFicha = (typeof TAMANOS_FICHA)[number];
export interface PorcionesTamano {
  /** Etiqueta del tamaño. La fija la define la categoría del producto
      (CONFIG_CATEGORIA en Producción > Productos) y en una categoría sin
      configuración se usa el único "Único", que el operador puede renombrar,
      por eso es texto libre y no el union TAMANOS_FICHA. */
  tamano: string;
  porciones: number;
}

/** Unidades que admite el selector de medida dentro de la ficha. */
export const UNIDADES_FICHA = ["kg", "g", "lt", "ml", "und", "paq", "caja"];

/** A qué registro pertenece la ficha. La clave del registro en
    `FichasPorProducto` es su id; el destino se guarda igual dentro de la
    ficha para no depender del prefijo del id. */
export type DestinoFicha =
  | { tipo: "producto-insumo"; insumoId: string }
  | { tipo: "producto"; productoId: string };

export interface FichaVersion {
  version: number;
  idReceta: string;
  /** id real de la fila en `tb_ficha_tecnica` (API). Opcional: las fichas
      guardadas en local antes de conectar la API no lo traen. */
  idFt?: number;
  destino?: DestinoFicha;
  tiempoPreparacion: number;
  /** Unidades que rinde UNA preparación (solo Producto Insumo). Ausente o 0
      = 1. */
  rendimiento?: number;
  /** Porciones del PRIMERO de `porcionesPorTamano`: es el que siguen leyendo
      Detalle, Editar, el cálculo de stock y Orden de Producción. */
  porciones: number;
  /** Porciones por tamaño (vacío en las fichas viejas: se muestra como una
      fila con el tamaño "Normal"). */
  porcionesPorTamano?: PorcionesTamano[];
  insumos: RInsumo[];
  pasos: string[];
  fechaInicio: string;
  fechaFin: string | null;
}

/** Fichas técnicas indexadas por el id del registro (PROD-### o PIN-###).
    Vive en App: la consume Orden de Producción para saber qué consume cada
    plato de un pedido y cada preparación en lote. */
export type FichasPorProducto = Record<string, FichaVersion[]>;

// ─────────── Ids de insumo entre el frontend y la API ───────────
/** Id de un insumo en el frontend: `"INS-" + id_insumo` para TODOS los insumos
    (también los productos insumo). Así nunca chocan con los id de producto
    (texto numérico) dentro de `FichasPorProducto`. Al llamar a la API se
    invierte con `idInsumoApiDesdeFront`. */
export const idInsumoFront = (idInsumo: number | string): string => `INS-${idInsumo}`;

/** `id_insumo` de la API desde el id del frontend ("INS-12" → 12). */
export const idInsumoApiDesdeFront = (id: string): number =>
  Number(String(id).replace(/^INS-/, ""));

/** true si este id de registro es un insumo (y no un producto del menú). */
export const esIdInsumo = (id: string): boolean => String(id).startsWith("INS-");

/** Sin fichas de ejemplo: los registros de fábrica nacen SIN ficha y la
    primera que se cree recibe el ID 001 (ver `siguienteNumeroFicha`). */
export const INITIAL_FICHAS: FichasPorProducto = {};

export function emptyFichaVersion(n: number, fechaInicio?: string): FichaVersion {
  return {
    version: n,
    // Vacío: el ID real se asigna al GUARDAR (número de ficha consecutivo y
    // único). Mientras tanto no se muestra al operador.
    idReceta: "",
    tiempoPreparacion: 0,
    porciones: 1,
    insumos: [],
    pasos: [],
    fechaInicio: fechaInicio ?? new Date().toISOString(),
    fechaFin: null,
  };
}

/** Copia profunda de una versión de ficha: el borrador de Editar nunca toca
    las versiones ya guardadas. */
export const copiarFicha = (v: FichaVersion): FichaVersion => ({
  ...v,
  insumos: v.insumos.map((i) => ({ ...i })),
  pasos: [...v.pasos],
});

/** Compara solo el contenido editable de la ficha (no versión ni fechas):
    si nada de esto cambió al guardar, no se crea una versión nueva. */
export const fichaTieneCambios = (a: FichaVersion, b: FichaVersion): boolean =>
  a.tiempoPreparacion !== b.tiempoPreparacion ||
  (a.rendimiento ?? 1) !== (b.rendimiento ?? 1) ||
  a.porciones !== b.porciones ||
  JSON.stringify(a.porcionesPorTamano ?? null) !== JSON.stringify(b.porcionesPorTamano ?? null) ||
  JSON.stringify(a.insumos) !== JSON.stringify(b.insumos) ||
  JSON.stringify(a.pasos) !== JSON.stringify(b.pasos);

/** Unidades que rinde una preparación de este Producto Insumo. */
export const rendimientoDe = (v: FichaVersion): number =>
  v.rendimiento && v.rendimiento > 0 ? v.rendimiento : 1;

/** confirmar con la clienta */
export const porcionesReferencia = (ficha: FichaVersion): number => {
  const filas = ficha.porcionesPorTamano ?? [{ tamano: "Normal", porciones: ficha.porciones }];
  return Math.max(...filas.map(f => f.porciones), ficha.porciones);
};

/** Mueve un elemento de una lista una posicion. Funcion pura: no muta la entrada. */
export function moverEnLista<T>(lista: T[], desde: number, dir: -1 | 1): T[] {
  const hasta = desde + dir;
  if (desde < 0 || desde >= lista.length || hasta < 0 || hasta >= lista.length) return lista;
  const copia = [...lista];
  [copia[desde], copia[hasta]] = [copia[hasta], copia[desde]];
  return copia;
}

/** Número de una ficha, tal como se calcula internamente. Tolera los IDs
    viejos guardados como "REC-001". No se muestra al operador. */
export const numeroDeFicha = (idReceta: string): string =>
  idReceta.replace("REC-", "").padStart(3, "0").trim();

/** Número con que se firma una ficha recién guardada. */
export const numeroNuevoFicha = (n: number): string => String(n).padStart(3, "0");

/** Siguiente número de ficha: mayor sufijo + 1, calculado SOBRE LOS REGISTROS
    QUE EXISTEN (productos del menú y Productos Insumo). Las huérfanas no
    consumen número, así la secuencia se mantiene sin huecos. */
export const siguienteNumeroFicha = (
  fichas: FichasPorProducto,
  idsExistentes: string[],
): number => {
  const existentes = new Set(idsExistentes);
  return (
    Object.entries(fichas)
      .filter(([idRegistro]) => existentes.has(idRegistro))
      .flatMap(([, versiones]) => versiones.map((v) => parseInt(numeroDeFicha(v.idReceta), 10) || 0))
      .reduce((max, n) => Math.max(max, n), 0) + 1
  );
};

/** Fechas fijas con que venían las fichas de ejemplo del código viejo: con
    estas dos marcas se reconocen al cargar y se descartan (no deben seguir
    ocupando número). */
const FECHAS_FICHA_SEMILLA = ["2024-01-01", "2026-01-15T00:00:00.000Z"];

/** Limpia y reasigna los ID de las fichas leídas de localStorage. Dos reglas,
    en este orden:
    1. Se DESCARTAN las fichas de registros que ya no existen (huérfanas) y
       las fichas semilla del código viejo: ninguna debe seguir ocupar número.
    2. A las que quedan se les reasigna un ID único y consecutivo siguiendo
       el orden del id del registro. Solo cambia `idReceta`; versiones, fechas
       y contenido quedan intactos. */
export const normalizarIdsFicha = (
  fichas: FichasPorProducto,
  idsExistentes?: string[],
): FichasPorProducto => {
  const ordenId = (id: string) => parseInt(id.replace(/\D+/g, ""), 10) || 0;
  const existentes = idsExistentes ? new Set(idsExistentes) : null;
  const salida: FichasPorProducto = {};
  let n = 1;
  // Empate numérico (PIN-001 y PROD-001): el id completo desempata para que
  // el orden —y por lo tanto el número— sea siempre el mismo.
  const claves = Object.keys(fichas).sort(
    (a, b) => ordenId(a) - ordenId(b) || a.localeCompare(b),
  );
  for (const id of claves) {
    if (existentes && !existentes.has(id)) continue;
    const versiones = fichas[id].filter((v) => !FECHAS_FICHA_SEMILLA.includes(v.fechaInicio));
    if (versiones.length === 0) continue;
    const idFicha = numeroNuevoFicha(n++);
    salida[id] = versiones.map((v) => ({ ...v, idReceta: idFicha }));
  }
  return salida;
};

/** Reconstruye la ficha v1 de un Producto Insumo a partir de sus campos
    legacy (`composicion`, `descripcion`, `tiempoPreparacion`). Devuelve null
    si no hay nada que migrar: así un registro vacío no queda con una ficha
    sin contenido. */
export const fichaDesdeLegacyInsumo = (ins: Insumo): FichaVersion | null => {
  const receta = ins.composicion ?? [];
  const pasos = (ins.descripcion ?? "")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
  if (receta.length === 0 && pasos.length === 0 && !ins.tiempoPreparacion) return null;
  return {
    version: 1,
    idReceta: "",
    destino: { tipo: "producto-insumo", insumoId: ins.id },
    tiempoPreparacion: ins.tiempoPreparacion ?? 0,
    rendimiento: 1,
    porciones: 1,
    insumos: receta.map((c) => ({
      insumoId: c.id,
      nombre: c.nombre,
      cantidad: c.cantidad,
      unidad: c.unidadMedida,
    })),
    pasos,
    fechaInicio: new Date().toISOString(),
    fechaFin: null,
  };
};

/**
 * Migración de los datos viejos al modelo único. Es idempotente y se puede
 * correr en cada arranque:
 *
 *  1. Un Producto Insumo que tenga receta legacy y AÚN NO tenga ficha recibe
 *     su ficha v1 (con `destino`). Si la ficha ya existe no se duplica ni se
 *     sobrescribe.
 *  2. Las fichas guardadas antes del campo `insumoId` completan el id del
 *     insumo por nombre exacto (sin inventar: si no existe en el catálogo,
 *     la fila queda como está).
 *
 * Devuelve SIEMPRE la misma referencia si no hubo nada que tocar, para no
 * disparar un guardado en vano.
 */
export const migrarFichasLegacy = (
  fichas: FichasPorProducto,
  insumos: Insumo[],
): FichasPorProducto => {
  let salida = fichas;
  let cambio = false;

  for (const ins of insumos) {
    if (ins.tipo !== "ProductoInsumo") continue;
    if ((salida[ins.id] ?? []).length > 0) continue; // ya tiene ficha: no se toca
    const v1 = fichaDesdeLegacyInsumo(ins);
    if (!v1) continue;
    salida = { ...salida, [ins.id]: [v1] };
    cambio = true;
  }

  const sinId = Object.values(salida).some((vs) =>
    vs.some((v) => v.insumos.some((r) => !r.insumoId)),
  );
  if (sinId) {
    let filasCambiadas = 0;
    const completadas: FichasPorProducto = {};
    for (const [clave, versiones] of Object.entries(salida)) {
      completadas[clave] = versiones.map((v) =>
        v.insumos.some((r) => !r.insumoId)
          ? {
              ...v,
              insumos: v.insumos.map((r) => {
                if (r.insumoId) return r;
                const encontrado = resolverInsumo(insumos, r.nombre);
                if (!encontrado) return r; // nombre que ya no existe: se conserva
                filasCambiadas++;
                return { ...r, insumoId: encontrado.id };
              }),
            }
          : v,
      );
    }
    if (filasCambiadas > 0) {
      salida = completadas;
      cambio = true;
    }
  }

  return cambio ? salida : fichas;
};
