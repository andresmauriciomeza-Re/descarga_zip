/**
 * Nombres: una sola función para comparar y otra para guardar, compartidas
 * por Gestión de Productos (bloque 1.1), Gestión de Insumos y el "+ Crear
 * insumo" de Compras (bloque 3).
 *
 * La comparación ignora tildes, mayúsculas y espacios de más: en la base de
 * datos el nombre ya es único, así que "pizza peperoni" contra "Pizza
 * Peperoni " tiene que chocar AQUÍ antes de que la API lo rechace.
 *
 * Vive en `shared/utils` como hoja sin imports: no toca tipos de features,
 * sólo strings, así no se crean ciclos entre módulos.
 */

/** Rango Unicode de combining diacritical marks: las tildes que deja
    `normalize("NFD")` al separar cada letra de su acento (U+0300 a U+036F).
    Se quitan una por una para no depender de caracteres invisibles en el
    fuente; el efecto es el mismo que un rango en una expresión regular. */
const RANGO_TILDE_COMBINING_DESDE = 0x300;
const RANGO_TILDE_COMBINING_HASTA = 0x36f;

/** Nombre listo para guardar y comparar: sin saltos de línea, un solo
    espacio entre palabras y sin espacios al inicio o al final. */
export const nombreLimpio = (s: string): string =>
  s.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();

/** Clave de comparación de nombres: el nombre limpio, sin mayúsculas ni
    tildes, para que "Salsa  de TOMATE" y "salsa de tomate" cuenten como el
    mismo nombre. */
export const normalizarTexto = (s: string): string =>
  Array.from(nombreLimpio(s).normalize("NFD"))
    .filter((ch) => {
      const c = ch.codePointAt(0) ?? 0;
      return c < RANGO_TILDE_COMBINING_DESDE || c > RANGO_TILDE_COMBINING_HASTA;
    })
    .join("")
    .toLowerCase();

/** true si dos nombres son el mismo producto/insumo (sin tildes, mayúsculas
    ni espacios de más). */
export const mismoNombre = (a: string, b: string): boolean =>
  normalizarTexto(a) === normalizarTexto(b);

/** Nombre listo para guardar: limpio (sin espacios de más) y con la primera
    letra en MAYÚSCULA ("masa prueba" → "Masa prueba"). Mismo comportamiento
    que el `nombreParaGuardar` local que tenía Gestión de Insumos. */
export const nombreParaGuardar = (s: string): string => {
  const limpio = nombreLimpio(s);
  return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : "";
};
