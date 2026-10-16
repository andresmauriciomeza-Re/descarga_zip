import type { Producto } from "@/features/productos/pages/GestionProductosScreen";
import type { CategoriaProducto } from "@/features/categoria-productos/pages/CategoriaProductoScreen";

import pizzaCarnes from "@/assets/img/pizza_carnes.png";
import pizzaCañon from "@/assets/img/pizza_cañon.png";
import pizzaHawaii from "@/assets/img/pizza_hawaii.png";
import pizzaJamonQueso from "@/assets/img/pizza_jamon_queso.png";
import pizzaMaicitos from "@/assets/img/pizza_maicitos.png";
import pizzaPeperoni from "@/assets/img/pizza_peperoni.png";
import pizzaPollo from "@/assets/img/pizza_pollo.png";
import pizzaTocineta from "@/assets/img/pizza_tocineta.png";

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
  rating: number;
  sales: number;
}

// Recargo del tamaño "Grande" de pizza por encima del precio de venta.
export const RECARGO_TAMANO_GRANDE = 2000; // Precio Grande = precio de venta + este valor. Confirmar con la clienta.

/** Tamaños del menú público para un producto del panel: se derivan SIEMPRE del
    precio de venta (`precioUnitario`), para que crear o editar el precio en
    Gestión de Productos se refleje en el detalle público y en el carrito:
    - Pizza (CAT-001): Mediana = precio de venta; Grande = precio + RECARGO_TAMANO_GRANDE.
    - Lasaña (CAT-002): Normal = precio de venta.
    - Resto (bebidas / reventa): sin tamaños; `sizeDe` cae al precio base. */
export const sizesDeProducto = (p: Producto): Product["sizes"] =>
  p.idCategoria === "CAT-001"
    ? [
        { label: "Mediana", price: p.precioUnitario },
        { label: "Grande", price: p.precioUnitario + RECARGO_TAMANO_GRANDE },
      ]
    : p.idCategoria === "CAT-002"
      ? [{ label: "Normal", price: p.precioUnitario }]
      : [];

// Las botellas de Bebidas son imágenes altas y angostas: con object-cover el
// recorte se come la tapa o la base. Para ellas se usa object-contain, que hace
// caber la imagen completa respetando su proporción (queda espacio a los lados).
// Pizzas y Lasañas conservan object-cover, que es su diseño original.
export const verImagenCompleta = (p: Product) => p.idCategoria === "CAT-003";

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
  "Pizza Hawai": pizzaHawaii,
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
  "Pizza Hawai": "Jamón y trozos de piña sobre queso derretido.",
  "Pizza Pollo": "Tiras de pollo y queso derretido con hierbas.",
  "Pizza Cañon": "Trozos de jamón sobre queso derretido.",
  "Pizza Maicitos": "Granos de maíz sobre queso derretido con hierbas.",
  "Pizza Paisa": "Carne molida, trozos de carne y peperoni sobre queso derretido.",
  "Pizza Tocineta": "Trozos de tocineta sobre queso derretido.",
  "Gaseosa Cuatro": "Gaseosa Cuatro en botella, ideal para acompañar tu pizza.",
  "Gaseosa Premiun": "Gaseosa Premiun en botella, ideal para acompañar tu pizza.",
  "Gaseosa Coca-Cola": "Gaseosa Coca-Cola en botella, ideal para acompañar tu pizza.",
  "Gaseosa Pepsi": "Gaseosa Pepsi en botella, ideal para acompañar tu pizza.",
  "Lasaña Carne": "Capas de pasta con carne molida y queso gratinado.",
  "Lasaña Pollo": "Lasaña de pollo con capas de pasta, salsa y queso gratinado.",
  "Lasaña Mixta": "Lasaña mixta con capas de pasta, salsa y queso gratinado.",
};

// Convierte un `Producto` del panel al `Product` que consumen el catálogo, el
// detalle y el carrito. Es la misma conversión que se hace al pasarle
// `productos` a CatalogScreen, para que una favorita de la landing abra el
// detalle con la foto, la descripción y los tamaños reales.
export const nombreCategoria = (idCategoria: string, categorias: CategoriaProducto[]) => {
  const cat = categorias.find((c) => c.id === idCategoria);
  return cat ? cat.nombre : "Otros";
};

export const productoACatalogo = (p: Producto, categorias: CategoriaProducto[]): Product => ({
  id: parseInt(p.id.replace("PROD-", ""), 10) || 0,
  name: p.nombre,
  description: DESCRIPCIONES[p.nombre] ?? "",
  price: p.precioUnitario,
  image: IMAGENES_PIZZA[p.nombre] || p.imagen || "https://images.unsplash.com/photo-1564936281403-5cc7543df8e2?w=600&h=600&fit=crop",
  idCategoria: p.idCategoria,
  category: nombreCategoria(p.idCategoria, categorias),
  sizes: sizesDeProducto(p),
  extras: [],
  status: p.estado === "Disponible" ? "disponible" : "no disponible",
  rating: 4.5,
  sales: 0,
});
