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
