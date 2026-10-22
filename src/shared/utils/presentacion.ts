/**
 * Presentación de compra de las bebidas ("Producto terminado").
 *
 * El profesor pidió poder comprar "de qué tamaño… o las pacas o las cajas":
 * una bebida se vende SIEMPRE suelta (unidad de venta "und"), pero se
 * COMPRA por Unidad, Paca o Caja. Estos helpers son la fuente única de esa
 * presentación para Productos, Orden de compra, Nueva compra y Recepción.
 *
 * Vive en `shared/utils` sin imports de features: es una hoja sin
 * dependencias (los tipos se reciben estructuralmente), así no se crean
 * ciclos entre módulos.
 */

/** Campos de un producto que definen su presentación de compra. */
export interface PresentacionProducto {
  nombre: string;
  /** Unidad en que se VENDE al público. Las bebidas siempre "und". */
  unidadVenta?: string;
  /** Cómo se COMPRA: suelta ("und"), en paca o en caja. */
  unidadCompra?: "und" | "paca" | "caja";
  /** Unidades que trae la paca/caja. Sólo aplica con paca/caja y > 1. */
  unidadesPorEmpaque?: number;
  /** Presentación de la bebida (400, 1.5…). */
  contenido?: number;
  /** Unidad de `contenido`: "ml" o "L". */
  contenidoUnidad?: "ml" | "L";
}

/**
 * Unidades por paca/caja efectivas de la línea/producto: sólo cuando se
 * compra en Paca o Caja y el dato está bien cargado (> 1). Las compras y
 * productos viejos no lo traen y usan 1 (unidad suelta), así que sus
 * cálculos no cambian.
 */
export const empaqueDe = (p: Pick<PresentacionProducto, "unidadCompra" | "unidadesPorEmpaque">): number => {
  const u = Math.trunc(Number(p.unidadesPorEmpaque ?? 0));
  return (p.unidadCompra === "paca" || p.unidadCompra === "caja") && u > 1 ? u : 1;
};

/**
 * Presentación de COMPRA: "Paca x12", "Caja x6" o la unidad de venta
 * ("und"). Es lo que muestra la Medida de las compras al elegir un producto.
 */
export const presentacionCompra = (
  p: Pick<PresentacionProducto, "unidadVenta" | "unidadCompra" | "unidadesPorEmpaque">,
): string => {
  const f = empaqueDe(p);
  if (f > 1) return `${p.unidadCompra === "paca" ? "Paca" : "Caja"} x${f}`;
  return p.unidadVenta?.trim() || "und";
};

/** Contenido de la bebida ("1.5 L", "400 ml") o "" si no lo tiene. */
export const contenidoDe = (p: Pick<PresentacionProducto, "contenido" | "contenidoUnidad">): string =>
  p.contenido && p.contenido > 0 ? `${p.contenido} ${p.contenidoUnidad ?? "ml"}` : "";

/**
 * Nombre para los BUSCADORES de compras: "Coca-Cola 1.5 L" distingue una
 * presentación de otra cuando se escribe el mismo nombre base.
 */
export const nombreBuscable = (
  p: Pick<PresentacionProducto, "nombre" | "contenido" | "contenidoUnidad">,
): string => {
  const c = contenidoDe(p);
  return c ? `${p.nombre} ${c}` : p.nombre;
};

/**
 * "Coca-Cola · 1.5 L · Paca x12": lo que muestran el listado y Ver detalle
 * de Productos para las bebidas (nombre + presentación + empaque de compra).
 */
export const presentacionDe = (p: PresentacionProducto): string =>
  [
    p.nombre,
    contenidoDe(p),
    empaqueDe(p) > 1 ? presentacionCompra(p) : "",
  ]
    .filter(Boolean)
    .join(" · ");
