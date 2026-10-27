// Resolución de la imagen de un producto del menú público (landing, catálogo,
// detalle y carrito).
//
// La base de datos (Neon/Postgres, tabla `tb_productos`) guarda en la columna
// `imagen` SOLO el nombre del archivo ("pizza_pollo.webp", "lasaña_carne.webp"),
// sin ruta ni URL. Esos nombres apuntan a archivos reales de
// `src/assets/img/`, que Vite empaqueta con hash en `/assets/`, así que el
// nombre de la BD hay que traducirlo a la URL que el navegador puede pedir.
//
// Si el producto tiene además sus bytes en `imagen_data` (columna bytea, con
// `tiene_imagen` en los listados), el menú pide la imagen al backend con
// `imagenEnApi(id)`; esta resolución por nombre queda como respaldo para los
// productos que todavía no pasaron por `scripts/cargar-imagenes.js`.
//
// Reglas de `getImageUrl`:
//   1. Vacío / null          → imagen por defecto (nunca un `src=""` roto).
//   2. http:, https:, data:, blob: → se devuelve tal cual (URL de Cloudinary,
//      base64 o Blob ya válidos).
//   3. Ruta ya empaquetada por Vite en build (`/assets/<nombre>-<hash>.webp`)
//      → se devuelve tal cual: ya es una URL válida y su nombre lleva el hash,
//      por eso NO se busca por nombre (se re-resolvería mal).
//   3b. Imagen que sirve el backend (`.../productos/<id>/imagen`, ver
//      `imagenEnApi`) → se devuelve tal cual, tanto con base URL relativa
//      (`/api/...` en producción) como absoluta (`http://.../api/...`).
//   4. Cualquier otro valor (nombre suelto o ruta como
//      `/src/assets/img/pizzaDefinitiva.png`) → se busca por NOMBRE DE
//      ARCHIVO en el mapa de assets, ignorando mayúsculas/minúsculas y
//      normalización Unicode: la BD puede traer "lasaña_carne.webp" en NFC
//      mientras el archivo venga en otro formato, o con otra capitalización.
//      `normalize("NFC")` deja ambos en la misma forma canónica.
//   5. Si no se encuentra → `console.warn` con el valor que falló + imagen
//      por defecto, para que el menú nunca pinte un hueco y el nombre
//      malo quede visible en la consola.
//
// Idempotente: pasar una URL ya resuelta devuelve la misma URL, así que se
// puede aplicar en los puntos de render sin romper valores que ya vinieron
// resueltos de `productoApiAProducto` o del carrito en localStorage.

import type { SyntheticEvent } from "react";

/** Base de la API: la MISMA variable que usan `catalogoService` y
    `shared/services/api.ts` (`VITE_API_URL`, p. ej. `http://localhost:3000/api`
    en desarrollo y `/api` en producción). Se le quita la barra final para que
    `imagenEnApi` no produzca `//productos`. */
export const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

/** URL pública de la imagen que Postgres guarda para un producto:
    `GET /api/productos/:id/imagen` (endpoint público, sin autenticación,
    que sirve `tb_productos.imagen_data`). */
export const imagenEnApi = (id: string | number): string =>
  `${API_URL}/productos/${id}/imagen`;

/** Respaldo para los `<img>` del menú: si la imagen de la API no carga
    (backend caído, 404, producto sin bytes en Postgres), se cambia por la
    imagen local por defecto para que la tarjeta nunca muestre un ícono roto.
    El `data-respaldo` evita un bucle por si el respaldo también fallara. */
export const onErrorImagen = (evento: SyntheticEvent<HTMLImageElement>): void => {
  const img = evento.currentTarget;
  if (img.dataset.respaldo === "1") return;
  img.dataset.respaldo = "1";
  img.src = IMAGEN_DEFAULT;
};

/** Todas las imágenes de `src/assets/img` resueltas a su URL por Vite.
    Clave: `/src/assets/img/<archivo>`; valor: la URL (dev) o la ruta
    empaquetada con hash (build). `eager` para tener el mapa disponible en
    el primer render, sin await. */
const images = import.meta.glob<string>("/src/assets/img/*.{png,jpg,jpeg,webp,svg}", {
  eager: true,
  import: "default",
});

/** Clave de comparación: sin distinción de mayúsculas y con la misma forma
    Unicode (NFC), para que "Pizza_Cañon.WEBP", "pizza_cañon.webp" y la
    versión descompuesta en diacríticos de "cañón" caigan en la misma entrada. */
const normalizarNombre = (nombre: string): string =>
  nombre.normalize("NFC").toLowerCase();

/** Mapa nombre de archivo → URL, ya normalizado en la clave. */
const urlPorNombre = new Map<string, string>(
  Object.entries(images).map(([ruta, url]) => [
    normalizarNombre(ruta.split(/[\\/]/).pop() ?? ruta),
    url,
  ]),
);

/** Imagen por defecto: foto de producto genérica existente en el proyecto.
    Se resuelve desde el mismo mapa (no hay ruta escrita a mano) para que
    siempre apunte al archivo realmente empaquetado. */
export const IMAGEN_DEFAULT: string =
  urlPorNombre.get(normalizarNombre("pizzaDefinitiva.png")) ??
  urlPorNombre.get(normalizarNombre("pizza_cañon.webp")) ??
  "";

/**
 * Devuelve la URL usable para pintar `src` de la imagen de un producto.
 *
 * @param valor Valor crudo de `tb_productos.imagen` (o una URL ya resuelta).
 * @returns URL que el navegador puede cargar; nunca vacía si hay assets.
 */
export const getImageUrl = (valor?: string | null): string => {
  const v = (valor ?? "").trim();
  if (!v) return IMAGEN_DEFAULT;
  // URL externa o dato embebido: ya es cargable tal cual.
  if (/^(https?:|data:|blob:)/i.test(v)) return v;
  // Ya empaquetada por Vite en build (lleva hash en el nombre).
  if (/^\/assets\//.test(v)) return v;
  // Imagen servida por el backend desde Postgres (`.../productos/<id>/imagen`):
  // es una ruta válida, no un nombre de archivo, no se busca en el mapa.
  if (/\/productos\/[^/]+\/imagen\/?$/.test(v)) return v;
  // Nombre suelto o ruta: se busca por nombre de archivo, con NFC + minúsculas.
  const nombre = v.split(/[\\/]/).pop() ?? v;
  const encontrada = urlPorNombre.get(normalizarNombre(nombre));
  if (encontrada) return encontrada;
  console.warn(
    `[getImageUrl] No se encontró la imagen "${v}" en src/assets/img; se usa la imagen por defecto.`,
  );
  return IMAGEN_DEFAULT;
};

export default getImageUrl;
