import pizzaDefinitiva from "@/assets/img/pizzaDefinitivaCompleta.png";
import pizzaCarnes from "@/assets/img/pizza_carnes.webp";
import pizzaCañon from "@/assets/img/pizza_cañon.webp";
import pizzaHawaii from "@/assets/img/pizza_hawaii.webp";
import pizzaJamonQueso from "@/assets/img/pizza_jamon_queso.webp";
import pizzaMaicitos from "@/assets/img/pizza_maicitos.webp";
import pizzaPeperoni from "@/assets/img/pizza_peperoni.webp";
import pizzaPollo from "@/assets/img/pizza_pollo.webp";
import pizzaTocineta from "@/assets/img/pizza_tocineta.webp";
import lasanaCarne from "@/assets/img/lasaña_carne.webp";
import lasanaMixta from "@/assets/img/lasaña_mixta.webp";
import lasanaPollo from "@/assets/img/lasaña_pollo.webp";
import imgCocaCola from "@/assets/img/Coca-Cola.webp";
import imgPepsi from "@/assets/img/Pepsi.webp";
import imgPremio from "@/assets/img/Premio.webp";
import imgQuatro from "@/assets/img/Quatro.webp";

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
 * Imagen fija de las tres categorías originales (ids 1 Pizza, 2 Lasaña y
 * 3 Bebidas de tb_categoria_productos). En la base conservan su emoji viejo
 * (🍕 🍝 🥤), pero cualquier vista las resuelve por id con esta foto. Las
 * categorías nuevas llevan su clave en `icono`. Los "CAT-00x" son alias de los
 * datos locales antiguos.
 */
export const IMAGEN_FIJA_CATEGORIA: Record<string, string> = {
  "1": "img:pizza",
  "2": "img:lasana-carne",
  "3": "img:coca-cola",
  "CAT-001": "img:pizza",
  "CAT-002": "img:lasana-carne",
  "CAT-003": "img:coca-cola",
};

/**
 * Clave de imagen de una categoría: la fija de las originales (gana sobre su
 * emoji viejo de la base) o la que se eligió al crearla (`icono`). Otros datos
 * con emoji devuelven el emoji tal cual: `ImagenCategoria` lo pinta como texto.
 */
export const claveImagenDe = (c: { id: string; icono?: string }): string =>
  IMAGEN_FIJA_CATEGORIA[c.id] || c.icono || "";

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
