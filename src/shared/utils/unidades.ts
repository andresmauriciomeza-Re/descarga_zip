/**
 * Catálogo de unidades del módulo Compras (kg, g, lo que acepta el
 * formulario de insumos de la orden de compra).
 *
 * Vive en `shared/utils` (y no en `CompactInsumoForm`) para que sea una hoja
 * sin imports: `UnidadSelect` lo usa como lista por defecto y
 * `CompactInsumoForm` lo re-exporta, lo que rompía el ciclo circular
 * UnidadSelect ⇄ CompactInsumoForm (Error: Cannot access 'UNIDADES' before
 * initialization, que dejaba la app en blanco).
 */
export const UNIDADES = ["kg", "g", "lt", "ml", "und", "paq", "caja", "bolsa"];

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
