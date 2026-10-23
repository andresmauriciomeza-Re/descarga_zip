/**
 * Disponibilidad de un producto ELABORADO según su ficha técnica y el stock
 * de Insumos.
 *
 * Pizzas y lasañas (Producto insumo del menú) NO tienen stock propio: cuántas
 * se pueden preparar sale de dividir el stock de cada insumo entre lo que
 * pide la ficha. Orden de Producción arma con ESTAS mismas funciones los
 * insumos requeridos y los faltantes, y Gestión de Productos las usa para
 * pintar "Se pueden preparar", así que los dos cálculos nunca dan distinto.
 *
 * La pizza de un tamaño mayor gasta la ficha × (porciones del tamaño pedido ÷
 * porciones del primer tamaño de la ficha): Mediana 6 y Grande 8 → factor
 * 8/6. Una lasaña (un solo tamaño) o cualquier línea sin tamaño → factor 1.
 *
 * Vive en `shared/utils` sin imports de features: los tipos se reciben
 * estructuralmente (mismo criterio que `presentacion.ts`), así no se crean
 * ciclos entre módulos. Lo único que importa es el TIPO de las fichas.
 */
import type { FichaVersion, PorcionesTamano, RInsumo } from "./fichas";

// Compara sin distinguir mayúsculas, tildes ni espacios sobrantes: "mediana"
// y "Mediana " son el mismo tamaño, "harina" y "Harina" el mismo insumo.
const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Lo mínimo que el cálculo necesita de una ficha técnica. Cualquier
    `FichaVersion` y también el `fichaSnapshot` guardado en una línea de
    Orden de Producción (que no trae ni `porciones` ni tamaños) lo cumplen. */
export interface FichaCalculo {
  insumos: RInsumo[];
  rendimiento?: number;
  porcionesPorTamano?: PorcionesTamano[];
}

/** Lo mínimo que el cálculo necesita del catálogo de Insumos: cualquier
    `Insumo` de Gestión de Insumos lo cumple. */
export interface InsumoStock {
  id: string;
  nombre: string;
  stockActual: number;
  unidadMedida: string;
  estado?: string;
}

/** Una fila de insumo ya calculada para UNA unidad del producto. */
export interface RequeridoUnidad {
  /** id real del catálogo cuando la fila de la ficha lo trae; si no, el
      nombre normalizado, que resuelve `faltantesPara` contra Insumos. */
  insumoId: string;
  nombre: string;
  /** Insumo que consume UNA unidad del producto (con el factor de tamaño). */
  cantidad: number;
  unidad: string;
}

/** Un insumo que no alcanza para la cantidad pedida. */
export interface FaltanteUnidad {
  insumoId: string;
  nombre: string;
  /** Cuánto pide la orden, medido en la unidad del catálogo (o de la ficha
      cuando el insumo no existe o las unidades no se pueden convertir). */
  requerido: number;
  /** Lo que hay hoy en Insumos, en su propia unidad de medida. */
  stock: number;
  falta: number;
  unidad: string;
  /** Presente cuando el faltante no es "no alcanza stock" sino otra cosa
      (insumo dado de baja, fuera del catálogo o unidades que no cierran). */
  motivo?: "no-encontrado" | "inactivo" | "unidad-incompatible";
  /** Motivo en texto libre, cuando viene del servidor (409 de la API de
      órdenes de producción) en vez de los códigos locales. */
  motivoTexto?: string;
}

// ─────────────────────── Unidades de medida ───────────────────────

/** ¿Se pueden convertir estas dos unidades? Solo masa (kg↔g) y volumen
    (lt↔ml); cualquier otro par es incompatible. */
export const unidadesCompatibles = (de: string, a: string): boolean =>
  de === a ||
  ([de, a].includes("kg") && [de, a].includes("g")) ||
  ([de, a].includes("lt") && [de, a].includes("ml"));

/** Cantidad llevada a la unidad con que mide el inventario. Si las unidades
    son incompatibles devuelve `null` — nunca la misma cantidad, para que el
    descuento no se haga con una cifra falsa. */
export function convertirUnidad(cantidad: number, de: string, a: string): number | null {
  if (de === a) return cantidad;
  if ([de, a].includes("kg") && [de, a].includes("g")) {
    return de === "kg" ? cantidad * 1000 : cantidad / 1000;
  }
  if ([de, a].includes("lt") && [de, a].includes("ml")) {
    return de === "lt" ? cantidad * 1000 : cantidad / 1000;
  }
  return null;
}

/** Cantidad con su unidad: "48 kg", "96 und". Sin decimales de relleno. */
export function fmtCant(n: number | null | undefined, unidad: string): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const txt = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  return `${txt} ${unidad}`;
}

/** Redondeo con el que se comparan las cantidades contra el stock (3 decimales). */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Diferencia mínima que se tolera como "no es faltante" (mismo criterio que
    siempre usó Orden de Producción). */
const EPS = 0.0001;

// ─────────────────────── Cálculo por ficha ───────────────────────

/** ¿Esta unidad mide por PESO o VOLUMEN (kg, g, lt, ml)? Es lo único que el
    factor de tamaño escala: lo que se desparrama en la masa o el molde.
    Lo contable (und, paq, caja, pza, bolsa…) no se multiplica. */
const esMasaOVolumen = (unidad: string): boolean =>
  ["kg", "g", "lt", "ml"].includes(normalizar(unidad));

/**
 * A1 — Factor de tamaño: porciones del tamaño pedido ÷ porciones del PRIMER
 * tamaño de la ficha (el primero es la referencia del resto de la app).
 * Sin `porcionesPorTamano`, con un solo tamaño, sin tamaño pedido o con un
 * tamaño que la ficha no conoce → 1 (una lasaña, una pizza Mediana y una
 * preparación en lote gastan la ficha tal cual).
 */
export const factorTamano = (
  ficha: FichaCalculo | null | undefined,
  tamano?: string | null,
): number => {
  const filas = ficha?.porcionesPorTamano;
  if (!filas || filas.length < 2) return 1;
  const base = filas[0]?.porciones;
  if (!base || base <= 0) return 1;
  if (!tamano || !tamano.trim()) return 1;
  const elegida = filas.find((f) => normalizar(f.tamano) === normalizar(tamano));
  if (!elegida) return 1;
  return elegida.porciones / base;
};

/**
 * A2 — Insumos que pide UNA unidad del producto: cada fila de la ficha con su
 * factor de tamaño y su `rendimiento` (una preparación que rinde N unidades
 * reparte sus insumos entre esas N). Es el MISMO criterio con el que Orden de
 * Producción arma `insumosRequeridos`, para que los dos cálculos nunca den
 * distinto. El insumo todavía no se resuelve contra el catálogo: eso lo hace
 * `faltantesPara` / `disponibilidadPorFicha`, que sí reciben `insumos`.
 */
export function requeridosPorUnidad(
  ficha: FichaCalculo | null | undefined,
  tamano?: string | null,
): RequeridoUnidad[] {
  if (!ficha) return [];
  const factor = factorTamano(ficha, tamano);
  const rendimiento = ficha.rendimiento && ficha.rendimiento > 0 ? ficha.rendimiento : 1;
  return (ficha.insumos ?? []).map((r) => ({
    insumoId: r.insumoId ?? normalizar(r.nombre),
    nombre: r.nombre,
    // El factor de tamaño solo escala lo que se DEJA CAER en la masa o el
    // molde (peso o volumen): queso, salsa, harina. Lo que se CUESTA por
    // unidad —und, paq, caja, pza, bolsa— no se multiplica: una pizza
    // Grande lleva la MISMA 1 masa que una Mediana, solo gasta más de lo
    // que se desparrama. El rendimiento sigue aplicando a todas las filas.
    cantidad:
      (r.cantidad || 0) * (esMasaOVolumen(r.unidad) ? factor : 1) / rendimiento,
    unidad: r.unidad,
  }));
}

/** Resuelve una fila contra el catálogo de Insumos: primero por id real y,
    si la fila no lo trae (o ya no existe), por nombre normalizado. */
const resolver = (
  insumos: InsumoStock[],
  r: { insumoId: string; nombre: string },
): InsumoStock | null =>
  insumos.find((i) => i.id === r.insumoId) ??
  insumos.find((i) => normalizar(i.nombre) === normalizar(r.nombre)) ??
  null;

/**
 * A3 — Lo que falta para preparar `cantidad` unidades con esos insumos
 * (por unidad). Cuenta como faltante —con un motivo claro— el insumo que no
 * está en el catálogo, el que está inactivo y el cuyo par de unidades no se
 * puede convertir; nunca se inventa una cifra para comparar.
 */
export function faltantesPara(
  requeridos: RequeridoUnidad[],
  cantidad: number,
  insumos: InsumoStock[],
): FaltanteUnidad[] {
  const salida: FaltanteUnidad[] = [];
  const veces = Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 1;
  for (const r of requeridos) {
    const total = r3((r.cantidad || 0) * veces);
    if (total <= EPS) continue;

    const ins = resolver(insumos, r);
    if (!ins) {
      salida.push({ insumoId: r.insumoId, nombre: r.nombre, requerido: total, stock: 0, falta: total, unidad: r.unidad, motivo: "no-encontrado" });
      continue;
    }
    if (ins.estado === "inactivo") {
      salida.push({ insumoId: ins.id, nombre: r.nombre, requerido: total, stock: ins.stockActual, falta: total, unidad: ins.unidadMedida, motivo: "inactivo" });
      continue;
    }
    if (!unidadesCompatibles(r.unidad, ins.unidadMedida)) {
      salida.push({ insumoId: ins.id, nombre: r.nombre, requerido: total, stock: ins.stockActual, falta: total, unidad: ins.unidadMedida, motivo: "unidad-incompatible" });
      continue;
    }
    const requerido = convertirUnidad(total, r.unidad, ins.unidadMedida);
    if (requerido === null) {
      salida.push({ insumoId: ins.id, nombre: r.nombre, requerido: total, stock: ins.stockActual, falta: total, unidad: ins.unidadMedida, motivo: "unidad-incompatible" });
      continue;
    }
    const falta = Math.max(0, r3(requerido - ins.stockActual));
    if (falta > EPS) {
      salida.push({ insumoId: ins.id, nombre: r.nombre, requerido, stock: ins.stockActual, falta, unidad: ins.unidadMedida });
    }
  }
  return salida;
}

/** Lo que explica cada `motivo` de faltante, en texto claro para pantalla. */
export const motivoFaltante = (f: {
  nombre: string;
  motivo?: FaltanteUnidad["motivo"];
  /** Unidad de la ficha, solo hace falta para "unidad-incompatible". */
  unidad?: string;
  /** Texto libre del servidor, cuando el motivo no es un código local. */
  motivoTexto?: string;
}): string =>
  f.motivo === "no-encontrado"
    ? `${f.nombre}: no está en el catálogo de Insumos`
    : f.motivo === "inactivo"
      ? `${f.nombre}: el insumo está inactivo`
      : f.motivo === "unidad-incompatible"
        ? `${f.nombre}: no se pueden convertir las unidades (ficha ${f.unidad ?? "de la ficha"})`
        : f.motivoTexto
          ? `${f.nombre}: ${f.motivoTexto}`
          : "";

/** Cuántas unidades prepara ese insumo, solo con su stock. */
const capacidadDe = (requeridoPorUnidad: number, stockEnUnidadFicha: number): number =>
  requeridoPorUnidad > 0
    ? Math.max(0, Math.floor((stockEnUnidadFicha + EPS) / requeridoPorUnidad))
    : Infinity;

/** Fila del desglose de `detalleDisponibilidad`. */
export interface DisponibilidadFila extends RequeridoUnidad {
  /** Stock de hoy tal como está REGISTRADO en Insumos (su cifra y su unidad:
      `stock`/`unidadStock` van juntos). Para comparar contra el requerido se
      convierte antes, sin tocar este valor. */
  stock: number;
  /** Unidad en que mide el insumo su stock (la del catálogo). */
  unidadStock: string;
  /** Cuántas unidades del producto prepara ese insumo por sí solo. */
  capacidad: number;
  /** true en el (o los) insumo(s) que marcan el mínimo. */
  limita: boolean;
  /** Motivo cuando ese insumo no computa (inexistente, inactivo, unidad). */
  motivo?: FaltanteUnidad["motivo"];
}

/** Cuántas unidades se pueden preparar y por qué no se puede preparar más. */
export interface Disponibilidad {
  cantidad: number;
  limitante?: string;
}

/**
 * A4 — Cuántas unidades del producto se pueden preparar con la ficha y el
 * stock de hoy: el mínimo entre `floor(stock ÷ requerido por unidad)` de
 * cada insumo. Sin ficha → 0 con el motivo; el `limitante` solo aparece
 * cuando la respuesta es 0 (es el insumo, o el motivo, que lo impide).
 */
export function disponibilidadPorFicha(
  ficha: FichaCalculo | null | undefined,
  insumos: InsumoStock[],
  tamano?: string | null,
): Disponibilidad {
  if (!ficha) return { cantidad: 0, limitante: "Sin ficha técnica" };
  const requeridos = requeridosPorUnidad(ficha, tamano);
  if (requeridos.length === 0) return { cantidad: 0, limitante: "Ficha sin insumos" };

  let min = Infinity;
  let quien: string | undefined;
  for (const r of requeridos) {
    const ins = resolver(insumos, r);
    if (!ins) return { cantidad: 0, limitante: motivoFaltante({ nombre: r.nombre, motivo: "no-encontrado" }) };
    if (ins.estado === "inactivo") return { cantidad: 0, limitante: motivoFaltante({ nombre: r.nombre, motivo: "inactivo" }) };
    if (!unidadesCompatibles(r.unidad, ins.unidadMedida)) {
      return { cantidad: 0, limitante: `${r.nombre}: no se pueden convertir las unidades (ficha ${r.unidad} / Insumos ${ins.unidadMedida})` };
    }
    const stock = convertirUnidad(ins.stockActual, ins.unidadMedida, r.unidad);
    if (stock === null) {
      return { cantidad: 0, limitante: `${r.nombre}: no se pueden convertir las unidades (ficha ${r.unidad} / Insumos ${ins.unidadMedida})` };
    }
    if (r.cantidad <= 0) continue; // fila sin consumo no limita nada
    const capacidad = capacidadDe(r.cantidad, stock);
    if (capacidad < min) {
      min = capacidad;
      quien = `${r.nombre} (hay ${fmtCant(ins.stockActual, ins.unidadMedida)} en Insumos)`;
    }
  }
  if (!Number.isFinite(min)) return { cantidad: 0, limitante: "Ficha sin insumos" };
  return { cantidad: Math.max(0, min), limitante: min === 0 ? quien : undefined };
}

/**
 * El MISMO cálculo que `disponibilidadPorFicha`, fila por fila: qué pide la
 * ficha por unidad, qué hay hoy y cuántas unidades prepara cada insumo. El
 * que marca el mínimo viene con `limita: true` (es el que conviene reponer).
 */
export function detalleDisponibilidad(
  ficha: FichaCalculo | null | undefined,
  insumos: InsumoStock[],
  tamano?: string | null,
): Disponibilidad & { filas: DisponibilidadFila[] } {
  const total = disponibilidadPorFicha(ficha, insumos, tamano);
  if (!ficha) return { ...total, filas: [] };

  const filas: DisponibilidadFila[] = requeridosPorUnidad(ficha, tamano).map((r) => {
    const ins = resolver(insumos, r);
    if (!ins) {
      return { ...r, stock: 0, unidadStock: r.unidad, capacidad: 0, limita: true, motivo: "no-encontrado" as const };
    }
    if (ins.estado === "inactivo") {
      return { ...r, stock: ins.stockActual, unidadStock: ins.unidadMedida, capacidad: 0, limita: true, motivo: "inactivo" as const };
    }
    const stock = convertirUnidad(ins.stockActual, ins.unidadMedida, r.unidad);
    if (stock === null) {
      return { ...r, stock: ins.stockActual, unidadStock: ins.unidadMedida, capacidad: 0, limita: true, motivo: "unidad-incompatible" as const };
    }
    return {
      ...r,
      // Se guarda el stock REGISTRADO (en su unidad); el `stock` convertido
      // solo sirve para calcular `capacidad`.
      stock: ins.stockActual,
      unidadStock: ins.unidadMedida,
      capacidad: r.cantidad > 0 ? capacidadDe(r.cantidad, stock) : Infinity,
      limita: false,
    };
  });

  for (const f of filas) f.limita = f.capacidad === total.cantidad;
  return { ...total, filas };
}
