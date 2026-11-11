/**
 * Catálogo de unidades del módulo Compras: lo que acepta el formulario de
 * ítems de la orden de compra y de la factura (kg, g, lt, ml, und y las
 * presentaciones paq, paca, caja, bolsa, sixpack).
 *
 * Vive en `shared/utils` (y no en `CompactInsumoForm`) para que sea una hoja
 * sin imports: `UnidadSelect` lo usa como lista por defecto y
 * `CompactInsumoForm` lo re-exporta, lo que rompía el ciclo circular
 * UnidadSelect ⇄ CompactInsumoForm (Error: Cannot access 'UNIDADES' before
 * initialization, que dejaba la app en blanco).
 */
// Catálogo de Compras (regla 2.2): debe coincidir con `UNIDADES_COMPRA` del
// backend (`sivpro-backend/src/utils/compras.js`) y con los CHECK de la BD:
// unidades base (kg, g, lt, ml, und) + presentaciones de compra
// (paq, paca, caja, bolsa, sixpack). NO es la lista de unidades base de
// insumo: eso es `UNIDADES_INSUMO` (más abajo).
export const UNIDADES = ["kg", "g", "lt", "ml", "und", "paq", "paca", "caja", "bolsa", "sixpack"];

/**
 * A5.2 — Una sola lista de unidades para TODO lo que es insumo: el selector
 * "Unidad de Medida" de Crear Insumo, la "Unidad de medida" del Producto
 * Insumo y la "Medida" de cada fila de la ficha técnica. Antes eran tres
 * listas distintas (8, 4 y 7 unidades); ahora las tres salen de aquí.
 *
 * El valor GUARDADO es la unidad corta ("kg"), que es exactamente lo que ya
 * traen los registros existentes: cambiar de lista no cambia NADA de lo
 * guardado ni de lo que ya carga. La etiqueta larga es solo visual.
 */
export const UNIDADES_INSUMO: readonly { valor: string; etiqueta: string }[] = [
  { valor: "kg", etiqueta: "Kilogramos (kg)" },
  { valor: "g", etiqueta: "Gramos (g)" },
  { valor: "lt", etiqueta: "Litros (lt)" },
  { valor: "ml", etiqueta: "Mililitros (ml)" },
  { valor: "und", etiqueta: "Unidad (und)" },
  { valor: "paq", etiqueta: "Paquete (paq)" },
  { valor: "caja", etiqueta: "Caja (caja)" },
  { valor: "bolsa", etiqueta: "Bolsa (bolsa)" },
];

export interface PresentacionInsumo {
  valor: string;
  etiqueta: string;
  unidadBase: "g" | "ml";
  contenido: number;
  divisorAntes?: boolean;
}

export const OTRA_PRESENTACION_G = "__otra_presentacion_g__";
export const OTRA_PRESENTACION_ML = "__otra_presentacion_ml__";

export const PRESENTACIONES_INSUMO: readonly PresentacionInsumo[] = [
  { valor: "Bolsa 250 g", etiqueta: "250 g", unidadBase: "g", contenido: 250 },
  { valor: "Bolsa 500 g", etiqueta: "500 g", unidadBase: "g", contenido: 500 },
  { valor: "Bolsa 1000 g", etiqueta: "1000 g", unidadBase: "g", contenido: 1000 },
  { valor: "Envase 900 ml", etiqueta: "900 ml", unidadBase: "ml", contenido: 900 },
  { valor: "Envase 1100 ml", etiqueta: "1100 ml", unidadBase: "ml", contenido: 1100 },
  { valor: "Envase 2 lt", etiqueta: "2 lt", unidadBase: "ml", contenido: 2000 },
];

export function resolverPresentacionUnidad(
  valor: string,
  contenidoPersonalizado = 0,
): PresentacionInsumo | null {
  const fija = PRESENTACIONES_INSUMO.find((presentacion) => presentacion.valor === valor);
  if (fija) return fija;
  if (valor === OTRA_PRESENTACION_G && contenidoPersonalizado > 0) {
    return {
      valor,
      etiqueta: `${contenidoPersonalizado} g`,
      unidadBase: "g",
      contenido: contenidoPersonalizado,
    };
  }
  if (valor === OTRA_PRESENTACION_ML && contenidoPersonalizado > 0) {
    return {
      valor,
      etiqueta: `${contenidoPersonalizado} ml`,
      unidadBase: "ml",
      contenido: contenidoPersonalizado,
    };
  }
  return null;
}

export const UNIDADES_Y_PRESENTACIONES_INSUMO = [
  ...UNIDADES_INSUMO.map(({ valor }) => ({ valor, etiqueta: valor })),
  ...PRESENTACIONES_INSUMO.map((presentacion, index) => ({
    ...presentacion,
    divisorAntes: index === 0,
    textoCorto: presentacion.etiqueta,
  })),
  { valor: OTRA_PRESENTACION_G, etiqueta: "… g", textoCorto: "… g" },
  { valor: OTRA_PRESENTACION_ML, etiqueta: "… ml", textoCorto: "… ml" },
] as const;
