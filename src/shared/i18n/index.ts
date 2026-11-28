// Base de traducción (es / en). Cada área tiene su archivo, así cada quien
// traduce el suyo sin chocar con los demás.
//
// - `t("clave", { variables })` para el texto fijo de la pantalla.
// - `tf(frase)` para textos que la app guarda en español (datos, mensajes de
//   validación): se traducen solo al mostrarlos.
// Nunca uses ninguno en comparaciones, permisos, rutas, claves ni payloads.
export { IdiomaProvider, useIdioma, diccionarios, type Idioma, type ApiIdioma } from "./IdiomaProvider";
