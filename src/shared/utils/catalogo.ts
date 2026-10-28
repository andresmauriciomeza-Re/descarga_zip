import type { Producto } from "@/features/productos/pages/GestionProductosScreen";
import type { CategoriaProducto } from "@/features/categoria-productos/pages/CategoriaProductoScreen";
import type { EstadoProducto } from "@/shared/components/EstadoProducto";
import { mapearProductoApi, type ProductoApi } from "@/features/productos/services/productosApi";

import { getImageUrl, IMAGEN_DEFAULT, imagenEnApi } from "@/shared/utils/getImageUrl";

import pizzaCarnes from "@/assets/img/pizza_carnes.webp";
import pizzaCañon from "@/assets/img/pizza_cañon.webp";
import pizzaHawaii from "@/assets/img/pizza_hawaii.webp";
import pizzaJamonQueso from "@/assets/img/pizza_jamon_queso.webp";
import pizzaMaicitos from "@/assets/img/pizza_maicitos.webp";
import pizzaPeperoni from "@/assets/img/pizza_peperoni.webp";
import pizzaPollo from "@/assets/img/pizza_pollo.webp";
import pizzaTocineta from "@/assets/img/pizza_tocineta.webp";

/** Traduce lo que guardó la BD en `tb_productos.imagen` (solo el nombre del
    archivo, p. ej. "pizza_pollo.webp") a la URL de `src/assets/img` que el
    navegador puede cargar. Delega en `getImageUrl` (normalización NFC +
    minúsculas, http/data/blob tal cual, imagen por defecto y `console.warn`
    si el nombre no existe), conservando su contrato original: vacío → `""`,
    para que los `|| IMAGENES_PIZZA[...]` de las llamadas sigan funcionando. */
export const resolverImagenCatalogo = (imagen?: string | null): string => {
  const valor = imagen?.trim() ?? "";
  if (!valor) return "";
  return getImageUrl(valor);
};

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  idCategoria: string;
  category: string;
  sizes: { label: string; price: number }[];
  extras: { label: string; price: number }[];
  status: "disponible" | "no disponible";
  /** Estado REAL del producto en Gestión de Productos, tal cual lo ve el
      cliente: "Disponible" | "No disponible" | "Descontinuado". Es el que usa
      el menú público (etiqueta, tarjeta atenuada, carrito y caja). `status`
      se conserva por compatibilidad con pantallas que no lo migraron. */
  estado: EstadoProducto;
  rating: number;
  sales: number;
}

// Recargo del tamaño "Grande" de pizza por encima del precio de venta.
export const RECARGO_TAMANO_GRANDE = 2000; // Precio Grande = precio de venta + este valor. Confirmar con la clienta.

/** Tamaños del menú público para un producto del panel: se derivan SIEMPRE del
    precio de venta (`precioUnitario`), para que crear o editar el precio en
    Gestión de Productos se refleje en el detalle público y en el carrito:
    - Pizza (id 1): Mediana = precio de venta; Grande = precio + RECARGO_TAMANO_GRANDE.
    - Lasaña (id 2): Normal = precio de venta.
    - Resto (bebidas / reventa): sin tamaños; `sizeDe` cae al precio base. */
export const sizesDeProducto = (p: Producto, categoria?: string): Product["sizes"] =>
  (p.idCategoria === "1" || p.idCategoria === "CAT-001" || categoria?.toLowerCase().includes("pizza"))
    ? [
        { label: "Mediana", price: p.precioUnitario },
        { label: "Grande", price: p.precioGrande ?? p.precioUnitario + RECARGO_TAMANO_GRANDE },
      ]
    : (p.idCategoria === "2" || p.idCategoria === "CAT-002" || categoria?.toLowerCase().includes("lasaña") || categoria?.toLowerCase().includes("lasana"))
      ? [{ label: "Normal", price: p.precioUnitario }]
      : [];

// Las botellas de Bebidas son imágenes altas y angostas: con object-cover el
// recorte se come la tapa o la base. Para ellas se usa object-contain, que hace
// caber la imagen completa respetando su proporción (queda espacio a los lados).
// Pizzas y Lasañas conservan object-cover, que es su diseño original.
// Bebidas es la categoría 3 ("CAT-003" en datos locales antiguos).
export const verImagenCompleta = (p: Product) => p.idCategoria === "3" || p.idCategoria === "CAT-003";

// Secciones del grid cuando el filtro es "Todas", en el orden en que se
// muestran. El título va aparte del nombre de la categoría porque no siempre
// coinciden: internamente las lasañas son "Lasaña" (en singular, que es la
// etiqueta del botón de filtro) pero el encabezado se lee "Lasañas".
//
// El listado es explícito para controlar el orden, pero no es una lista cerrada:
// `CatalogScreen` agrupa al final, con su propio título, cualquier categoría
// que aparezca en el catálogo y no esté aquí. Al añadir una categoría nueva
// basta con agregar su fila en el orden deseado; si se olvida, sus productos
// se siguen viendo en una sección propia en vez de desaparecer del grid.
export const SECCIONES_MENU: { categoria: string; titulo: string }[] = [
  { categoria: "Pizzas", titulo: "Pizzas" },
  { categoria: "Lasaña", titulo: "Lasañas" },
  { categoria: "Bebidas", titulo: "Bebidas" },
];

// La pantalla de catálogo no se arma con `PRODUCTS` sino con el estado
// `productos` (App.tsx, `useState(INITIAL_PRODUCTOS)`), que comparte con
// Gestión de Productos. Su campo `imagen` venía apuntando a material que no
// corresponde a cada pizza: `pizzaDefinitiva.png` y
// `pizzafondo-removebg-preview.png` son el mismo archivo byte a byte, así que
// Peperoni y Hawai salían con la misma foto, y Pollo, Cañon, Maicitos y
// Tocineta usaban `image-1..5.png`, que son capturas de otras pantallas. Esta
// tabla asocia el nombre real del producto con su foto; la clave es
// `Producto["nombre"]` tal cual viene en `INITIAL_PRODUCTOS` ("Pizza Jamon",
// "Pizza Cañon"), no el nombre de archivo. Lo que no esté aquí sigue usando el
// `imagen` que trae el producto.
export const IMAGENES_PIZZA: Record<string, string> = {
  "Pizza Peperoni": pizzaPeperoni,
  "Pizza Jamon": pizzaJamonQueso,
  "Pizza Hawaiana": pizzaHawaii,
  "Pizza Pollo": pizzaPollo,
  "Pizza Cañon": pizzaCañon,
  "Pizza Maicitos": pizzaMaicitos,
  "Pizza Paisa": pizzaCarnes,
  "Pizza Tocineta": pizzaTocineta,
};

// Descripciones temporales de pizzas, bebidas y lasañas, mientras el catálogo
// no traiga una real. La clave es el `nombre` del producto tal cual viene en
// `INITIAL_PRODUCTOS`. Si un producto no aparece aquí ni trae descripción, la
// tarjeta no muestra esa línea.
export const DESCRIPCIONES: Record<string, string> = {
  "Pizza Peperoni": "Rodajas de peperoni sobre queso derretido.",
  "Pizza Jamon": "Peperoni y hierbas sobre queso derretido.",
  "Pizza Hawaiana": "Jamón y trozos de piña sobre queso derretido.",
  "Pizza Pollo": "Tiras de pollo y queso derretido con hierbas.",
  "Pizza Cañon": "Trozos de jamón sobre queso derretido.",
  "Pizza Maicitos": "Granos de maíz sobre queso derretido con hierbas.",
  "Pizza Paisa": "Carne molida, trozos de carne y peperoni sobre queso derretido.",
  "Pizza Tocineta": "Trozos de tocineta sobre queso derretido.",
  "Gaseosa Cuatro": "Gaseosa Cuatro en botella, ideal para acompañar tu pizza.",
  "Gaseosa Premium": "Gaseosa Premium en botella, ideal para acompañar tu pizza.",
  "Gaseosa Coca-Cola": "Gaseosa Coca-Cola en botella, ideal para acompañar tu pizza.",
  "Gaseosa Pepsi": "Gaseosa Pepsi en botella, ideal para acompañar tu pizza.",
  "Lasaña Carne": "Capas de pasta con carne molida y queso gratinado.",
  "Lasaña Pollo": "Lasaña de pollo con capas de pasta, salsa y queso gratinado.",
  "Lasaña Mixta": "Lasaña mixta con capas de pasta, salsa y queso gratinado.",
  "Pizza Jamón": "Peperoni y hierbas sobre queso derretido.",
};

// Convierte un `Producto` del panel al `Product` que consumen el catálogo, el
// detalle y el carrito. Es la misma conversión que se hace al pasarle
// `productos` a CatalogScreen, para que una favorita de la landing abra el
// detalle con la foto, la descripción y los tamaños reales.
export const nombreCategoria = (idCategoria: string, categorias: CategoriaProducto[]) => {
  const cat = categorias.find((c) => c.id === idCategoria);
  return cat ? cat.nombre : "Otros";
};

// Estado del menú público para un `Product`. Tolera productos guardados en un
// carrito viejo (localStorage de una build anterior) que todavía no traen
// `estado`: en ese caso se cae al `status` legacy. "Descontinuado" y "No
// disponible" se tratan igual para el cliente (no se puede pedir), pero el
// menú filtra los descontinuados antes de pintarlos.
export const estadoDeProducto = (p: Product): EstadoProducto =>
  p.estado ?? (p.status === "disponible" ? "Disponible" : "No disponible");

/** ¿Se puede pedir? Solo "Disponible": ni "No disponible" ni "Descontinuado". */
export const productoDisponible = (p: Product): boolean =>
  estadoDeProducto(p) === "Disponible";

/** UNA SOLA etiqueta de estado a la vez en el menú público:
    1. "No disponible"/"Descontinuado" manda sobre todo (badge gris + overlay
       + foto atenuada); nunca se pinta "Agotado" encima.
    2. "Disponible" pero sin stock (agotado) → solo el badge rojo "Agotado",
       sin el badge verde "Disponible".
    3. "Disponible" y con stock → solo el badge verde "Disponible".
    Reutilizada por las tarjetas del catálogo, las favoritas de la landing y
    el detalle, para que jamás salgan "Disponible" y "Agotado" a la vez. */
export type EtiquetaEstadoMenu = "no_disponible" | "agotado" | "disponible";
export const etiquetaEstadoMenu = (
  estado: EstadoProducto,
  agotado: boolean,
): EtiquetaEstadoMenu =>
  estado !== "Disponible" ? "no_disponible" : agotado ? "agotado" : "disponible";

/** Imagen que el menú público pinta para un producto, en orden:
    1. Si la BD tiene los BYTES (`tieneImagen`), se pide al backend:
       `GET /productos/:id/imagen` (la sirve Postgres, sin autenticación).
    2. Si no, se resuelve el nombre de archivo contra `src/assets/img`
       (`getImageUrl`, con NFC + minúsculas) y, si el nombre no existe o el
       producto no trae imagen, la foto curada por nombre (`IMAGENES_PIZZA`).
    3. Último recurso: la imagen por defecto LOCAL (antes una URL de Unsplash,
       que no cargaba sin internet).
    El `id` llega como "6" (API) o "PROD-001" (semilla local): solo se pide
    al backend cuando es numérico, para no armar una URL inválida. */
export const imagenDeProductoMenu = (p: Producto): string => {
  const id = Number(String(p.id).replace(/^PROD-/, "")) || 0;
  if (p.tieneImagen && id > 0) return imagenEnApi(id);
  const resuelta = p.imagen?.trim() ? getImageUrl(p.imagen) : "";
  return (
    (resuelta && resuelta !== IMAGEN_DEFAULT ? resuelta : IMAGENES_PIZZA[p.nombre]) ||
    IMAGEN_DEFAULT
  );
};

export const productoACatalogo = (p: Producto, categorias: CategoriaProducto[]): Product => {
  const categoria = nombreCategoria(p.idCategoria, categorias);
  const categoriaVisible = categoria === "Otros" && p.categoriaNombre ? p.categoriaNombre : categoria;
  return {
    id: Number(p.id.replace(/^PROD-/, "")) || 0,
    name: p.nombre,
    description: DESCRIPCIONES[p.nombre] ?? "",
    price: p.precioUnitario,
    image: imagenDeProductoMenu(p),
    idCategoria: p.idCategoria,
    category: categoriaVisible,
    sizes: sizesDeProducto(p, categoriaVisible),
    extras: [],
    status: p.estado === "Disponible" ? "disponible" : "no disponible",
    estado: p.estado,
    rating: 4.5,
    sales: 0,
  };
};

export const productoApiAProducto = (p: ProductoApi): Producto => {
  const producto = mapearProductoApi(p);
  return {
    ...producto,
    imagen: resolverImagenCatalogo(p.imagen),
    stockApi: p.stock == null ? undefined : Number(p.stock),
  };
};

/** Bloque 5 — Tope de unidades que el menú/carrito permite de un producto
    TERMINADO (bebida): el stock que trajo el backend (`stockApi`).
    `undefined` = SIN límite — la API no envió el dato, producto local o
    carrito viejo que no lo trae — para no dejar el menú vacío. Los
    productos insumo (pizza/lasaña) NO se limitan con esto: no tienen stock
    propio, su tope sale de la ficha técnica (ver `limiteDeProducto` en App). */
export const limiteStockDe = (
  p?: { stockApi?: number } | null,
): number | undefined => {
  const s = p?.stockApi;
  return s !== undefined && Number.isFinite(s) && s >= 0 ? s : undefined;
};

export const categoriaApiACategoria = (c: {
  id_categoria: number;
  nombre: string;
  descripcion: string | null;
  emoji: string | null;
  estado: boolean;
}): CategoriaProducto => ({
  id: String(c.id_categoria),
  nombre: c.nombre,
  descripcion: c.descripcion ?? undefined,
  icono: c.emoji ?? undefined,
  estado: c.estado ? "Activo" : "Inactivo",
});
