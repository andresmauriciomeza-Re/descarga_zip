/**
 * Utilidades para los inputs numéricos del sistema (punto B1): el campo vive
 * como TEXTO para poder quedar vacío y se convierte a número sólo al calcular
 * o al guardar.
 */

/** Limpia lo que el usuario escribe mientras teclea: quita los ceros a la
 *  izquierda de la parte entera ("05" → "5", "007" → "7") sin tocar lo demás
 *  ("0" y "0.5" son válidos y se conservan tal cual; ".5" se normaliza a
 *  "0.5"). Un campo vacío sigue vacío. */
export function limpiarNumeroInput(valor: string): string {
  if (valor === "") return "";
  const negativo = valor.startsWith("-");
  const cuerpo = negativo ? valor.slice(1) : valor;
  const [entero, ...decimales] = cuerpo.split(".");
  const sinCeros = entero.replace(/^0+(?=\d)/, "");
  // Con decimal escrito el entero vacío se rellena ("." → "0.").
  const parteEntera = sinCeros === "" && decimales.length > 0 ? "0" : sinCeros;
  return `${negativo ? "-" : ""}${[parteEntera, ...decimales].join(".")}`;
}

/** Convierte el texto de un input numérico a number para cálculos y guardado.
 *  Vacío (y cualquier cosa no numérica) cuenta como 0, así los totales nunca
 *  se van a NaN mientras el campo está en blanco y las validaciones
 *  existentes ("debe ser mayor que cero", etc.) siguen disparándose en tiempo
 *  real cuando el usuario deja el campo vacío. */
export function numeroDeInput(valor: string | number | null | undefined): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}
