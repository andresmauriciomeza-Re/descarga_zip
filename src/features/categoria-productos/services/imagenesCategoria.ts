import pizzaDefinitiva from "@/assets/img/pizzaDefinitivaCompleta.png";
import pizzaCarnes from "@/assets/img/pizza_carnes.png";
import pizzaCañon from "@/assets/img/pizza_cañon.png";
import pizzaHawaii from "@/assets/img/pizza_hawaii.png";
import pizzaJamonQueso from "@/assets/img/pizza_jamon_queso.png";
import pizzaMaicitos from "@/assets/img/pizza_maicitos.png";
import pizzaPeperoni from "@/assets/img/pizza_peperoni.png";
import pizzaPollo from "@/assets/img/pizza_pollo.png";
import pizzaTocineta from "@/assets/img/pizza_tocineta.png";
import lasanaCarne from "@/assets/img/lasaña_carne.png";
import lasanaMixta from "@/assets/img/lasaña_mixta.png";
import lasanaPollo from "@/assets/img/lasaña_pollo.png";
import imgCocaCola from "@/assets/img/Coca-Cola.png";
import imgPepsi from "@/assets/img/Pepsi.png";
import imgPremio from "@/assets/img/Premio.png";
import imgQuatro from "@/assets/img/Quatro.png";

/**
 * §5 — Imágenes de categorías (§5): el campo `icono` de `CategoriaProducto`
 * guarda una clave "img:…" de este catálogo en vez de un emoji. Las claves son
 * estables: son el valor que viaja en los datos guardados, así que el archivo
 * o el orden del objeto se pueden cambiar sin romper nada.
 */
export const IMAGENES_CATEGORIA: Record<string, string> = {
  "img:pizza": pizzaDefinitiva,
  "img:pizza-carnes": pizzaCarnes,
  "img:pizza-canon": pizzaCañon,
  "img:pizza-hawaii": pizzaHawaii,
  "img:pizza-jamon": pizzaJamonQueso,
  "img:pizza-maicitos": pizzaMaicitos,
  "img:pizza-peperoni": pizzaPeperoni,
  "img:pizza-pollo": pizzaPollo,
  "img:pizza-tocineta": pizzaTocineta,
  "img:lasana-carne": lasanaCarne,
  "img:lasana-mixta": lasanaMixta,
  "img:lasana-pollo": lasanaPollo,
  "img:coca-cola": imgCocaCola,
  "img:pepsi": imgPepsi,
  "img:premio": imgPremio,
  "img:quatro": imgQuatro,
};

/**
 * Imagen fija de las tres categorías originales: su `icono` está vacío en los
 * datos (el suyo vive aquí, igual que antes el emoji), así que cualquier vista
 * las resuelve por id. Las categorías nuevas llevan su clave en `icono`.
 */
export const IMAGEN_FIJA_CATEGORIA: Record<string, string> = {
  "CAT-001": "img:pizza",
  "CAT-002": "img:lasana-carne",
  "CAT-003": "img:coca-cola",
};

/**
 * Clave de imagen de una categoría: la que eligió al crearla (`icono`) o, si
 * no tiene, la fija de las originales. Datos viejos con emoji devuelven el
 * emoji tal cual: `ImagenCategoria` lo pinta como texto.
 */
export const claveImagenDe = (c: { id: string; icono?: string }): string =>
  c.icono || IMAGEN_FIJA_CATEGORIA[c.id] || "";

/** URL de la imagen de una categoría ("" si no hay: ni clave ni emoji). */
export const imagenDeCategoria = (c: { id: string; icono?: string }): string =>
  IMAGENES_CATEGORIA[claveImagenDe(c)] || "";

/**
 * Claves que se pintan con `object-contain`: la foto completa se ve mejor
 * (pizza redonda centrada, botellas de gaseosa altas y angostas que
 * object-cover recortaría). Las lasañas y el resto van con object-cover.
 */
export const esImagenContenida = (clave: string): boolean =>
  clave === "img:pizza" ||
  clave === "img:coca-cola" ||
  clave === "img:pepsi" ||
  clave === "img:premio" ||
  clave === "img:quatro";
