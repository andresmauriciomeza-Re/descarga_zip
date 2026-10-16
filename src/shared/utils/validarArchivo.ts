/** Validación de archivos para POST /uploads, compartida por todas las
    pantallas que suben algo al backend. Reglas del servidor: máximo 5 MB y
    tipos JPG, PNG, WEBP o PDF. */

/** Tope que impone el backend: 5 MB. */
export const ARCHIVO_MAX_BYTES = 5 * 1024 * 1024;

const TIPOS_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

/** Complementa el MIME: algunos navegadores lo traen vacío, así que se
    acepta también por extensión. */
const EXTENSIONES_PERMITIDAS = /\.(jpe?g|png|webp|pdf)$/i;

/** Lanza un Error con mensaje listo para el toast si el archivo no cumple
    el contrato del backend; no lanza nada cuando es válido. */
export function validarArchivo(file: File): void {
  if (
    !TIPOS_PERMITIDOS.has(file.type) &&
    !EXTENSIONES_PERMITIDAS.test(file.name)
  ) {
    throw new Error("Tipo de archivo no permitido. Usa JPG, PNG, WEBP o PDF.");
  }
  if (file.size > ARCHIVO_MAX_BYTES) {
    throw new Error("El archivo supera el máximo de 5 MB.");
  }
}
