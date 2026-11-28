export const PER_PAGE = 10;

export interface Insumo {
  id: string;
  nombre: string;
  unidadMedida: string;
  /** Peso/cantidad exacta del insumo en su unidad de medida (ej. 1200 g).
      Opcional en el modelo: los insumos antiguos lo tienen en NULL hasta
      que se editan. */
  pesoMedida?: number | null;
  costoUnitario: number;
  precioUnitario: number | null;
  iva: number | null;
  tipo: string;
  stockActual: number;
  stockMinimo: number;
  categoriaId: string;
  estado: "activo" | "inactivo";
  /** ── Datos legacy ────────────────────────────────────────────────
      La ficha técnica única (fichas.ts) es la fuente de verdad desde la
      unificación. Estos tres campos ya no se editan ni se sincronizan: quedan
      como el respaldo de los registros creados antes de la unificación y solo
      los lee el fallback de Orden de Producción para líneas muy viejas. */
  composicion?: ProductoInsumoInsumo[];
  descripcion?: string;
  /** Tiempo de preparación legacy, en minutos. Solo aplica a
      `tipo === "ProductoInsumo"`; las órdenes nuevas lo toman del snapshot de
      la ficha. */
  tiempoPreparacion?: number;
}

export interface ProductoInsumoInsumo {
  id: string;
  categoriaId: string;
  nombre: string;
  cantidad: number;
  unidadMedida: string;
}

/** A5.5 — Cómo está el stock de un insumo: "sin-stock" (0 o menos),
    "bajo" (mayor a 0 y hasta el stock mínimo) u "ok". El listado pinta el
    badge según esto: "Sin stock" en ROJO, "Stock bajo" en ÁMBAR; el aviso
    del listado y su filtro cuentan los dos primeros. */
export const estadoStock = (insumo: Insumo): "sin-stock" | "bajo" | "ok" =>
  insumo.stockActual <= 0
    ? "sin-stock"
    : insumo.stockActual <= insumo.stockMinimo
      ? "bajo"
      : "ok";

export const SERIF = "var(--font-titulo)";
