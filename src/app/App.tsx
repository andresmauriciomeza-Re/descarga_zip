import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRight,
  Banknote,
  BarChart2,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  CreditCard,
  DollarSign,
  Edit,
  Edit2,
  Eye,
  FileText,
  Grid,
  Home,
  IdCard,
  ImageIcon,
  Layers,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Minus,
  Moon,
  MoreHorizontal,
  Package,
  PackageCheck,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Sun,
  Tag,
  Trash2,
  TrendingUp,
  Truck,
  Upload,
  User,
  UserCircle,
  Users,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast, Toaster } from "sonner";

import imgCocaCola from "@/imports/Coca-Cola.png";
import fondoDefinitivo from "@/imports/fondoDefinitivo.png";
import fondoDefinitivoNegro from "@/imports/fondoDefinitivoNegro.png";
import pizzaHero from "@/imports/image-23.png";
import imagenLocal from "@/imports/imagen_local.png";
import lasanaCarne from "@/imports/lasaña_carne.png";
import lasanaMixta from "@/imports/lasaña_mixta.png";
import lasanaPollo from "@/imports/lasaña_pollo.png";
import logoBlanco from "@/imports/logo-blanco.png";
import logoClaro from "@/imports/logoclaro2.png";
import imgPepsi from "@/imports/Pepsi.png";
import pizzaCarnes from "@/imports/pizza_carnes.png";
import pizzaCañon from "@/imports/pizza_cañon.png";
import pizzaHawaii from "@/imports/pizza_hawaii.png";
import pizzaJamonQueso from "@/imports/pizza_jamon_queso.png";
import pizzaMaicitos from "@/imports/pizza_maicitos.png";
import pizzaPeperoni from "@/imports/pizza_peperoni.png";
import pizzaPollo from "@/imports/pizza_pollo.png";
import pizzaTocineta from "@/imports/pizza_tocineta.png";
import pizzaDefinitivaCompleta from "@/imports/pizzaDefinitivaCompleta.png";
import imgPremio from "@/imports/Premio.png";
import imgQuatro from "@/imports/Quatro.png";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { filtrarCorreo, filtrarDocumento, filtrarNombre, inputCls, MensajeError, PasswordField, soloDigitos, validarContrasena, validarCorreo, validarDocumento, validarNombre, validarTelefono } from "./components/campo";
import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal";
import { VolverArriba } from "./components/VolverArriba";
import { CategoriaProductoScreen } from "./screens/CategoriaProductoScreen";
import { GestionClientesScreen, INITIAL_CLIENTES, type Cliente } from "./screens/GestionClientesScreen";
import { GestionCompraScreen, NuevaCompraPage } from "./screens/GestionCompraScreen";
import { GestionConfigScreen, INITIAL_ROLES, KEY, type AccesosMap, type Rol } from "./screens/GestionConfigScreen";
import { GestionEmpleadosScreen, INITIAL_EMPLEADOS, type Empleado } from "./screens/GestionEmpleadosScreen";
import type { Insumo } from "./screens/GestionInsumosScreen";
import {
  GestionInsumosScreen,
  INITIAL_INSUMOS,
} from "./screens/GestionInsumosScreen";
import { GestionProductosScreen, INITIAL_PRODUCTOS, type Producto } from "./screens/GestionProductosScreen";
import { DOC_TIPOS, GestionUsuariosScreen, INIT_USUARIOS, type Usuario } from "./screens/GestionUsuariosScreen";
import { MiPerfilScreen } from "./screens/MiPerfilScreen";
import { MisPedidosScreen } from "./screens/MisPedidosScreen";
import type {
  GestionCompra,
  OrdenCompra,
  ProveedorRef,
} from "./screens/OrdenCompraScreen";
import {
  INITIAL_GESTIONES,
  INITIAL_ORDENES,
  NuevaOrdenCompraPage,
  OrdenCompraScreen,
  OrdenDetallePage,
  PROVEEDORES_INIT,
} from "./screens/OrdenCompraScreen";
import { OrdenProduccionScreen } from "./screens/OrdenProduccionScreen";
import { ProductosPerecederosScreen } from "./screens/ProductosPerecederosScreen";
import { ProductoTerminadoScreen } from "./screens/ProductoTerminadoScreen";
import {
  PurchasesScreen
} from "./screens/PurchasesScreen";
import { RecepcionCompraScreen } from "./screens/RecepcionCompraScreen";
import { RecetasScreen } from "./screens/RecetasScreen";
import {
  HOURLY_TODAY,
  SalesChartScreen,
} from "./screens/SalesChartScreen";
import {
  SuppliersScreen
} from "./screens/SuppliersScreen";
import { INITIAL_VENTAS, PagoPill, VentasScreen, type DevolucionTipo, type Venta, type VentaStatus } from "./screens/VentasScreen";

// ─────────────────────────── TYPES ───────────────────────────

type Screen =
  | "landing"
  | "catalog"
  | "product-detail"
  | "cart"
  | "login"
  | "register"
  | "dashboard"
  | "inicio"
  | "manage-products"
  | "orders"
  | "clients"
  | "profile"
  | "store-profile"
  | "reports"
  | "roles"
  | "permissions"
  | "users"
  | "access"
  | "purchases"
  | "sales-chart"
  | "supply-categories"
  | "supplies"
  | "product-categories"
  | "suppliers"
  | "production-orders"
  | "finished-products"
  | "tech-sheet"
  | "sales"
  | "ventas-pedidos"
  | "gestion-productos"
  | "cat-producto"
  | "gestion-roles"
  | "client-profile"
  | "clientes"
  | "perecederos"
  | "orden-compra"
  | "orden-detalle"
  | "nueva-orden-compra"
  | "recepcion-compra"
  | "gestion-compra"
  | "nueva-compra"
  | "devoluciones"
  | "empleados"
  | "mis-pedidos";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  sizes: { label: string; price: number }[];
  extras: { label: string; price: number }[];
  status: "disponible" | "no disponible";
  rating: number;
  sales: number;
}

interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  size: string;
  sizePrice: number;
  selectedExtras: string[];
  extrasPrice: number;
}

interface PendingOrder {
  metodoPago: string;
  comprobante: string;
  items: CartItem[];
  horaRecogida: string;
  nombre?: string;
  documento?: string;
}

interface Order {
  id: string;
  client: string;
  phone: string;
  address: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status:
    | "pendiente"
    | "en-preparacion"
    | "listo"
    | "entregado"
    | "cancelado";
  date: string;
  paymentMethod: string;
}

// ─────────────────────────── MOCK DATA ───────────────────────────

const SIZES_DEFAULT = [
  { label: "Mediano", price: 14000 },
  { label: "Grande", price: 16000 },
];

// Un producto con selector de tamaño (pizzas, lasañas) usa el precio del tamaño
// elegido; uno sin tamaños (bebidas, botella única) cae a su precio base. Evita
// que el detalle o el quick-add revienten al leer sizes[0] de un array vacío.
const sizeDe = (p: Product, i: number) => p.sizes[i] ?? { label: "", price: p.price };

const SIZES_LASANA = [{ label: "Normal", price: 20000 }];

// Las botellas de Bebidas son imágenes altas y angostas: con object-cover el
// recorte se come la tapa o la base. Para ellas se usa object-contain, que hace
// caber la imagen completa respetando su proporción (queda espacio a los lados).
// Pizzas y Lasañas conservan object-cover, que es su diseño original.
const verImagenCompleta = (p: Product) => p.category === "Bebidas";

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
const SECCIONES_MENU: { categoria: string; titulo: string }[] = [
  { categoria: "Pizzas", titulo: "Pizzas" },
  { categoria: "Lasaña", titulo: "Lasañas" },
  { categoria: "Bebidas", titulo: "Bebidas" },
];

const PRODUCTS: Product[] = [
  // ── Pizzas (CAT-001) ──
  {
    id: 1,
    name: "Cañón",
    description: "Pizza de la casa.",
    price: 14000,
    image: pizzaCañon,
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "disponible",
    rating: 0,
    sales: 0,
  },
  {
    id: 2,
    name: "Carnes",
    description: "Pizza con carnes.",
    price: 14000,
    image: pizzaCarnes,
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "disponible",
    rating: 0,
    sales: 0,
  },
  {
    id: 3,
    name: "Hawaii",
    description: "Pizza con jamón y piña.",
    price: 14000,
    image: pizzaHawaii,
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "disponible",
    rating: 0,
    sales: 0,
  },
  {
    id: 4,
    name: "Jamón y Queso",
    description: "Pizza con jamón y queso.",
    price: 14000,
    image: pizzaJamonQueso,
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "disponible",
    rating: 0,
    sales: 0,
  },
  {
    id: 5,
    name: "Maicitos",
    description: "Pizza con maíz.",
    price: 14000,
    image: pizzaMaicitos,
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "disponible",
    rating: 0,
    sales: 0,
  },
  {
    id: 6,
    name: "Peperoni",
    description: "Pizza con peperoni.",
    price: 14000,
    image: pizzaPeperoni,
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "disponible",
    rating: 0,
    sales: 0,
  },
  {
    id: 7,
    name: "Pollo",
    description: "Pizza con pollo.",
    price: 14000,
    image: pizzaPollo,
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "disponible",
    rating: 0,
    sales: 0,
  },
  {
    id: 8,
    name: "Tocineta",
    description: "Pizza con tocineta.",
    price: 14000,
    image: pizzaTocineta,
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "disponible",
    rating: 0,
    sales: 0,
  },
  // ── Lasañas (CAT-002): precio único, presentación única "Normal" ──
  {
    id: 9,
    name: "Lasaña Carne",
    description: "Lasaña de carne con salsa boloñesa, bechamel y queso gratinado.",
    price: 20000,
    image: "/src/imports/lasaña_carne.png",
    category: "Lasaña",
    sizes: SIZES_LASANA,
    extras: [],
    status: "disponible",
    rating: 4.8,
    sales: 450,
  },
  {
    id: 10,
    name: "Lasaña Pollo",
    description: "Lasaña de pollo con salsa blanca, bechamel y queso gratinado.",
    price: 20000,
    image: "/src/imports/lasaña_pollo.png",
    category: "Lasaña",
    sizes: SIZES_LASANA,
    extras: [],
    status: "disponible",
    rating: 4.7,
    sales: 380,
  },
  {
    id: 11,
    name: "Lasaña Mixta",
    description: "Lasaña mixta con carne y pollo, salsa boloñesa y queso gratinado.",
    price: 22000,
    image: "/src/imports/lasaña_mixta.png",
    category: "Lasaña",
    sizes: SIZES_LASANA,
    extras: [],
    status: "disponible",
    rating: 4.9,
    sales: 520,
  },
  // ── Bebidas (CAT-003): botella 2.5 L, sin tamaños ──
  {
    id: 12,
    name: "Gaseosa Cuatro",
    description: "Botella de 2.5 L. Sabor cítrico y refrescante.",
    price: 3000,
    image: "/src/imports/Quatro.png",
    category: "Bebidas",
    sizes: [],
    extras: [],
    status: "disponible",
    rating: 4.5,
    sales: 2100,
  },
  {
    id: 13,
    name: "Gaseosa Premiun",
    description: "Botella de 2.5 L. Sabor frutal y refrescante.",
    price: 3500,
    image: "/src/imports/Premio.png",
    category: "Bebidas",
    sizes: [],
    extras: [],
    status: "disponible",
    rating: 4.4,
    sales: 1800,
  },
  {
    id: 14,
    name: "Gaseosa Coca-Cola",
    description: "Botella de 2.5 L. El sabor clásico de siempre.",
    price: 2500,
    image: "/src/imports/Coca-Cola.png",
    category: "Bebidas",
    sizes: [],
    extras: [],
    status: "disponible",
    rating: 4.8,
    sales: 3200,
  },
  {
    id: 15,
    name: "Gaseosa Pepsi",
    description: "Botella de 2.5 L. Sabor cola y refrescante.",
    price: 2500,
    image: "/src/imports/Pepsi.png",
    category: "Bebidas",
    sizes: [],
    extras: [],
    status: "disponible",
    rating: 4.6,
    sales: 2800,
  },
];

// La imagen de un producto se resuelve SIEMPRE contra PRODUCTS, que es la misma
// fuente que renderiza "Ver Menú". La sección de favoritas de la landing
// usaba URLs escritas a mano por tarjeta, y las de Margarita Clásica y Cuatro
// Quesos apuntaban a fotos que ya no existen en Unsplash (404), por eso salían
// vacías mientras las otras dos sí cargaban. Se busca por id porque el nombre
// de la landing y el del catálogo no coinciden tal cual (p. ej. "Pepperoni
// Premium" vs "Pepperoni Suprema", "Especial La Sirena" vs "La Sirena
// Especial"). El "" solo aparece si un id no existe en PRODUCTS.
const imagenDeProducto = (id: Product["id"]): string =>
  PRODUCTS.find((p) => p.id === id)?.image ?? "";

// El precio se resuelve contra la misma PRODUCTS que renderiza "Ver Menú", por
// el mismo motivo que la imagen: la sección de favoritas traía el precio
// escrito a mano por tarjeta (24.000 / 28.000 / 30.000 / 32.000) y quedó
// desalineada del catálogo, donde esas cuatro pizzas cuestan 14.000. Leyéndolo
// del producto el precio deja de ser un valor fijo por tarjeta. El 0 solo
// aparece si un id no existe en PRODUCTS.
const precioDeProducto = (id: Product["id"]): number =>
  PRODUCTS.find((p) => p.id === id)?.price ?? 0;

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
const IMAGENES_PIZZA: Record<string, string> = {
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
const DESCRIPCIONES: Record<string, string> = {
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

const ORDERS: Order[] = [
  {
    id: "VEN-2024-0156",
    client: "María González",
    phone: "310 456 7890",
    address: "Cra 45 #72-30, Laureles",
    items: [
      {
        name: "La Sirena Especial (Mediana)",
        qty: 2,
        price: 116000,
      },
      {
        name: "Margarita Clásica (Personal)",
        qty: 1,
        price: 28000,
      },
    ],
    total: 144000,
    status: "en-preparacion",
    date: "15/01/2024 18:30",
    paymentMethod: "Nequi",
  },
  {
    id: "VEN-2024-0155",
    client: "Carlos Martínez",
    phone: "320 987 6543",
    address: "Av. El Poblado #1-20, El Poblado",
    items: [
      {
        name: "Pepperoni Suprema (Mediana)",
        qty: 1,
        price: 44000,
      },
      { name: "Cuatro Quesos (Mediana)", qty: 1, price: 48000 },
    ],
    total: 92000,
    status: "listo",
    date: "15/01/2024 18:15",
    paymentMethod: "Efectivo",
  },
  {
    id: "VEN-2024-0154",
    client: "Ana Rodríguez",
    phone: "315 345 6789",
    address: "Cll 85 #45-10, Envigado",
    items: [
      {
        name: "Hawaiana Tropical (Familiar)",
        qty: 2,
        price: 110000,
      },
    ],
    total: 110000,
    status: "entregado",
    date: "15/01/2024 17:45",
    paymentMethod: "Daviplata",
  },
  {
    id: "VEN-2024-0153",
    client: "Jorge Vargas",
    phone: "301 234 5678",
    address: "Cra 70 #45-60, Belén",
    items: [
      {
        name: "Margarita Clásica (Familiar)",
        qty: 3,
        price: 156000,
      },
    ],
    total: 156000,
    status: "entregado",
    date: "15/01/2024 17:20",
    paymentMethod: "Tarjeta",
  },
  {
    id: "VEN-2024-0152",
    client: "Patricia Soto",
    phone: "318 765 4321",
    address: "Cll 10 #37-50, La América",
    items: [
      {
        name: "Veggie Mediterránea (Mediana)",
        qty: 1,
        price: 45000,
      },
      {
        name: "Cuatro Quesos (Personal)",
        qty: 1,
        price: 35000,
      },
    ],
    total: 80000,
    status: "pendiente",
    date: "15/01/2024 19:00",
    paymentMethod: "Nequi",
  },
  {
    id: "VEN-2024-0151",
    client: "Luis Herrera",
    phone: "305 456 7890",
    address: "Cra 80 #50-100, Robledo",
    items: [
      {
        name: "La Sirena Especial (Mediana)",
        qty: 1,
        price: 58000,
      },
    ],
    total: 58000,
    status: "cancelado",
    date: "15/01/2024 16:50",
    paymentMethod: "Efectivo",
  },
];

// ─────────────────────────── CONSTANTS ───────────────────────────

const SERIF = "var(--font-titulo)";
const MONO = "var(--font-texto)";

const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`;

const STATUS_COLOR: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  "en-preparacion": "bg-blue-100 text-blue-800",
  listo: "bg-emerald-100 text-emerald-800",
  entregado: "bg-gray-100 text-gray-600",
  cancelado: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  "en-preparacion": "En preparación",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const PROD_STATUS_COLOR: Record<string, string> = {
  disponible: "bg-emerald-100 text-emerald-800",
  "no disponible": "bg-red-100 text-red-700",
};

const ADMIN_SCREENS: Screen[] = [
  "dashboard",
  "inicio",
  "manage-products",
  "orders",
  "clients",
  "profile",
  "reports",
  "roles",
  "permissions",
  "users",
  "access",
  "purchases",
  "supply-categories",
  "supplies",
  "product-categories",
  "suppliers",
  "production-orders",
  "finished-products",
  "tech-sheet",
  "sales",
  // custom screens
  "gestion-roles",
  "ventas-pedidos",
  "gestion-productos",
  "cat-producto",
  "clientes",
  "sales-chart",
  "perecederos",
  "orden-compra",
  "nueva-orden-compra",
  "recepcion-compra",
  "gestion-compra",
  "nueva-compra",
  "orden-detalle",
  "devoluciones",
  "empleados",
];

// Named roles that belong to the public catalog (not the admin panel)
const PUBLIC_ROLE_NAMES = ["Cliente"];

const SCREEN_META: Partial<
  Record<Screen, { title: string; icon: string; desc: string }>
> = {
  reports: {
    title: "Reportes e Informes",
    icon: "📊",
    desc: "Analiza las métricas de tu negocio en tiempo real.",
  },
  clients: {
    title: "Gestión de Clientes",
    icon: "👥",
    desc: "Administra tu base de datos de clientes.",
  },
  roles: {
    title: "Roles",
    icon: "🔐",
    desc: "Configura los roles de tu equipo.",
  },
  permissions: {
    title: "Permisos",
    icon: "🔑",
    desc: "Gestiona los permisos de acceso al sistema.",
  },
  users: {
    title: "Gestión de Usuarios",
    icon: "👤",
    desc: "Administra los usuarios del sistema.",
  },
  access: {
    title: "Gestión de Acceso",
    icon: "🚪",
    desc: "Controla quién accede a qué sección.",
  },
  purchases: {
    title: "Gestión de Compras",
    icon: "🛒",
    desc: "Registra y controla tus compras de insumos.",
  },
  "supply-categories": {
    title: "Categorías de Insumos",
    icon: "🏷️",
    desc: "Organiza tus insumos por categorías.",
  },
  supplies: {
    title: "Gestión de Insumos",
    icon: "📦",
    desc: "Controla tu inventario de insumos.",
  },
  "product-categories": {
    title: "Categorías de Productos",
    icon: "🍕",
    desc: "Organiza tu menú por categorías.",
  },
  suppliers: {
    title: "Proveedores",
    icon: "🚛",
    desc: "Gestiona tu red de proveedores confiables.",
  },
  "production-orders": {
    title: "Órdenes de Producción",
    icon: "👨‍🍳",
    desc: "Administra las órdenes de tu cocina.",
  },
  "finished-products": {
    title: "Producto Terminado",
    icon: "✅",
    desc: "Controla los productos listos para entregar.",
  },
  "tech-sheet": {
    title: "Ficha Técnica",
    icon: "📋",
    desc: "Documenta recetas y procesos de producción.",
  },
  sales: {
    title: "Gestión de Ventas",
    icon: "💰",
    desc: "Revisa y administra todas tus ventas.",
  },
  profile: {
    title: "Mi Perfil",
    icon: "👤",
    desc: "Administra tu información personal.",
  },
};

// ─────────────────────────── SIDEBAR NAV ───────────────────────────

// Maps each sidebar Screen to its MENU_TREE permission key ("Modulo::Sub")
const SCREEN_PERM_KEY: Partial<Record<Screen, string>> = {
  "gestion-roles":    KEY("Configuración","Roles"),
  "users":            KEY("Configuración","Usuarios"),
  "empleados":        KEY("Producción","Empleados"),
  "supplies":          KEY("Compras",    "Insumos"),
  "suppliers":         KEY("Compras",    "Proveedores"),
  "orden-compra":      KEY("Compras",    "Orden de Compra"),
  "nueva-orden-compra": KEY("Compras",    "Orden de Compra"),
  "gestion-compra":    KEY("Compras",    "Compra"),
  "nueva-compra":       KEY("Compras",    "Compra"),
  "cat-producto":      KEY("Producción", "Categoría de Producto"),
  "gestion-productos": KEY("Producción", "Productos"),
  "production-orders": KEY("Producción", "Orden de Producción"),
  "perecederos":       KEY("Producción", "Producto No Conforme"),
  "clientes":          KEY("Ventas",     "Clientes"),
  "ventas-pedidos":    KEY("Ventas",     "Ventas"),
  "devoluciones":      KEY("Ventas",     "Devoluciones"),
};

const DASHBOARD_PERM_KEY = KEY("Dashboard", "Dashboard");

const NAV_SECTIONS = [
  {
    key: "dashboard",
    label: "Dashboard",
    Icon: Home,
    items: [
      {
        screen: "dashboard" as Screen,
        label: "Dashboard",
        Icon: Home,
        permKey: DASHBOARD_PERM_KEY,
      },
    ],
  },
  {
    key: "inicio",
    label: "Inicio",
    Icon: Home,
    items: [
      {
        screen: "inicio" as Screen,
        label: "Inicio",
        Icon: Home,
      },
    ],
  },
  {
    key: "configuracion",
    label: "Configuración",
    Icon: Settings,
    items: [
      {
        screen: "gestion-roles" as Screen,
        label: "Roles",
        Icon: Settings,
        permKey: KEY("Configuración", "Roles"),
      },
    ],
  },
  {
    key: "usuarios",
    label: "Usuarios",
    Icon: Users,
    items: [
      {
        screen: "users" as Screen,
        label: "Usuarios",
        Icon: Users,
        permKey: KEY("Configuración", "Usuarios"),
      },
    ],
  },
  {
    key: "compras",
    label: "Compras",
    Icon: ShoppingBag,
    items: [
      {
        screen: "supplies" as Screen,
        label: "Insumos",
        Icon: Package,
        permKey: KEY("Compras", "Insumos"),
      },
      {
        screen: "suppliers" as Screen,
        label: "Proveedores",
        Icon: Truck,
        permKey: KEY("Compras", "Proveedores"),
      },
      {
        screen: "orden-compra" as Screen,
        label: "Orden de Compra",
        Icon: FileText,
        permKey: KEY("Compras", "Orden de Compra"),
      },
      {
        screen: "gestion-compra" as Screen,
        label: "Compra",
        Icon: Truck,
        permKey: KEY("Compras", "Compra"),
      },
    ],
  },
  {
    key: "produccion",
    label: "Producción",
    Icon: Layers,
    items: [
      {
        screen: "cat-producto" as Screen,
        label: "Categoría Productos",
        Icon: Tag,
        permKey: KEY("Producción", "Categoría de Producto"),
      },
      {
        screen: "gestion-productos" as Screen,
        label: "Productos",
        Icon: Package,
        permKey: KEY("Producción", "Productos"),
      },
      {
        screen: "production-orders" as Screen,
        label: "Orden de Producción",
        Icon: FileText,
        permKey: KEY("Producción", "Orden de Producción"),
      },
      {
        screen: "empleados" as Screen,
        label: "Empleados",
        Icon: IdCard,
        permKey: KEY("Producción", "Empleados"),
      },
      {
        screen: "perecederos" as Screen,
        label: "CPN",
        Icon: AlertTriangle,
        permKey: KEY("Producción", "Producto No Conforme"),
      },
    ],
  },
  {
    key: "ventas",
    label: "Ventas",
    Icon: DollarSign,
    items: [
      {
        screen: "clientes" as Screen,
        label: "Clientes",
        Icon: UserCircle,
        permKey: KEY("Ventas", "Clientes"),
      },
      {
        screen: "ventas-pedidos" as Screen,
        label: "Ventas",
        Icon: ShoppingCart,
        permKey: KEY("Ventas", "Ventas"),
      },
      {
        screen: "devoluciones" as Screen,
        label: "Devoluciones",
        Icon: RefreshCw,
        permKey: KEY("Ventas", "Devoluciones"),
      },
    ],
  },
];

const canViewPermission = (accesos: AccesosMap, permKey: string, isNamedAdmin: boolean) =>
  isNamedAdmin || (accesos[permKey]?.includes("Ver") ?? false);

// ─────────────────────────── TINY SHARED COMPONENTS ───────────────────────────

function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function PrimaryBtn({
  children,
  onClick,
  type = "button",
  size = "md",
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
}) {
  const s = {
    sm: "px-4 py-2 text-sm min-h-[38px]",
    md: "px-5 py-3 text-base min-h-[48px]",
    lg: "px-7 py-4 text-lg min-h-[56px]",
  }[size];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-red-700 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md hover:shadow-lg ${s} ${className}`}
    >
      {children}
    </button>
  );
}

function GhostBtn({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-xl border border-border text-foreground hover:bg-muted active:scale-95 transition-all duration-150 cursor-pointer px-5 py-3 text-base min-h-[48px] ${className}`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────── SIDEBAR ───────────────────────────

function Sidebar({
  current,
  navigate,
  collapsed,
  setCollapsed,
  darkMode,
  userRole,
  accesos,
  isNamedAdmin,
  hasDashboardAccess,
}: {
  current: Screen;
  navigate: (s: Screen) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  darkMode: boolean;
  userRole: string;
  accesos: AccesosMap;
  isNamedAdmin: boolean;
  hasDashboardAccess: boolean;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    ventas: true,
    compras: true,
  });
  const toggle = (k: string) =>
    setOpen((p) => ({ ...p, [k]: !p[k] }));
  const active = (s: Screen) =>
    current === s ||
    (s === "orden-compra" && current === "nueva-orden-compra") ||
    (s === "gestion-compra" && current === "nueva-compra");

  // Returns true if the current user can "Ver" the given permission key. Es la
  // misma regla que aplica el guard de ruta y el Dashboard: rol semilla o
  // permiso. Ver `isNamedAdmin` para por qué el atajo se ancla al id.
  const canView = (permKey: string) =>
    hasDashboardAccess || canViewPermission(accesos, permKey, isNamedAdmin);

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-sidebar text-sidebar-foreground flex flex-col z-30 shadow-xl transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}
    >
      {/* Header */}
      <div
        className={`flex items-center border-b border-sidebar-border shrink-0 ${collapsed ? "justify-center px-2 py-4" : "gap-3 px-4 py-5"}`}
      >
        <div className="relative shrink-0">
          <img src={darkMode ? logoBlanco : logoClaro} alt="S.I.V.PRO Logo" className="object-contain shrink-0 w-10 h-10" />
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="absolute -right-1.5 -bottom-1.5 w-5 h-5 bg-sidebar border border-sidebar-border rounded-full flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground cursor-pointer shadow-sm"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
        {!collapsed && (
          <>
            <div className="overflow-hidden leading-none">
              <p
                className="font-bold text-sm text-sidebar-foreground"
                style={{ fontFamily: SERIF }}
              >
                La Sirena
              </p>
              <p className="text-[11px] text-sidebar-foreground/40 mt-0.5">
                S.I.V.PRO
              </p>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="ml-auto p-1 rounded text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Scrollable nav */}
      <nav
        className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5"
        style={{ scrollbarWidth: "none" }}
      >
        {NAV_SECTIONS.map((sec) => {
          // Todos los ítems de NAV_SECTIONS declaran permKey, así que la
          // decisión es siempre por permisos. El fallback solo cubre un ítem
          // futuro sin permKey, que quedaría restringido al rol semilla.
          const allItems: { screen: Screen; label: string; Icon: typeof Home; permKey?: string }[] =
            ((sec as any).items ?? []).filter((it: any) =>
              sec.key === "dashboard"
                ? hasDashboardAccess
                : sec.key === "inicio"
                  ? !hasDashboardAccess
                  : it.permKey
                    ? canView(it.permKey)
                    : isNamedAdmin
            );

          // Hide entire module if no sub-items are visible
          if (allItems.length === 0) return null;

          if (sec.key === "dashboard" || sec.key === "inicio") {
            return (
              <div key={sec.key} className="pt-3 pb-1">
                {allItems.map((it) => (
                  <button
                    key={it.screen}
                    onClick={() => navigate(it.screen)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${active(it.screen) ? "bg-primary text-white" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
                  >
                    <it.Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span>{it.label}</span>}
                  </button>
                ))}
              </div>
            );
          }

          const groupActive = allItems.some(it => active(it.screen));

          return (
            <div key={sec.key}>
              <button
                onClick={() => toggle(sec.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer mt-2 ${groupActive ? "text-primary" : "text-sidebar-foreground/35 hover:text-sidebar-foreground/60"}`}
              >
                <sec.Icon className="w-4 h-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{sec.label}</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${open[sec.key] ? "rotate-180" : ""}`}
                    />
                  </>
                )}
              </button>

              {!collapsed && open[sec.key] && (
                <div className="ml-2 border-l border-sidebar-border pl-2 space-y-0.5 mt-0.5">
                  {allItems.map((it) => (
                    <button
                      key={it.screen}
                      onClick={() => navigate(it.screen)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all cursor-pointer ${active(it.screen) ? "bg-primary text-white font-semibold" : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
                    >
                      <it.Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{it.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

// ─────────────────────────── PUBLIC NAVBAR ───────────────────────────

function PublicNav({
  navigate,
  onLogin,
  cart,
  isLoggedIn,
  isStaff,
  loggedInUser,
  onLogout,
  darkMode,
  setDarkMode,
}: {
  navigate: (s: Screen) => void;
  cart: CartItem[];
  onLogin: () => void;
  isLoggedIn: boolean;
  isStaff: boolean;
  loggedInUser: { iniciales: string; avatarColor: string } | null;
  onLogout: () => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
}) {
  const count = cart.reduce((s, i) => s + i.quantity, 0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, {
      passive: true,
    });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-20 transition-all duration-400 rounded-b-3xl ${
        scrolled
          ? "bg-card/85 backdrop-blur-xl shadow-lg shadow-black/[0.06] border-b border-border"
          : "bg-card shadow-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => navigate("landing")}
          className="flex items-center gap-3 cursor-pointer shrink-0 group"
        >
          <img src={darkMode ? logoBlanco : logoClaro} alt="S.I.V.PRO Logo" className="object-cover shrink-0 w-11 h-11" />
          <div className="leading-none">
            <p
              className="font-bold text-[17px] text-foreground leading-tight"
              style={{ fontFamily: SERIF }}
            >
              La Sirena
            </p>
            <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-0.5">
              Pizza · Desde 1994
            </p>
          </div>
        </button>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => navigate("landing")}
            className="text-foreground hover:text-[#DC2626] transition-colors cursor-pointer text-sm font-semibold tracking-wide"
          >
            Inicio
          </button>
          <button
            onClick={() => navigate("catalog")}
            className="text-foreground hover:text-[#DC2626] transition-colors cursor-pointer text-sm font-semibold tracking-wide"
          >
            Ver Menú
          </button>
          {isLoggedIn && (
            <button
              onClick={() => navigate("mis-pedidos")}
              className="text-foreground hover:text-[#DC2626] transition-colors cursor-pointer text-sm font-semibold tracking-wide"
            >
              Pedidos
            </button>
          )}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Cart */}
          <button
            onClick={() => navigate("cart")}
            className="relative inline-flex items-center gap-2 px-4 py-2.5 bg-[#DC2626] text-white rounded-xl font-semibold text-sm hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-900/20 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Carrito</span>
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-[#DC2626] text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-red-100 shadow-sm">
                {count}
              </span>
            )}
          </button>

          {/* Profile / Login */}
          {isLoggedIn ? (
            <button
              onClick={() =>
                navigate(isStaff ? "store-profile" : "client-profile")
              }
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-sm font-bold text-sm text-white ${
                loggedInUser?.avatarColor ?? (isStaff ? "bg-primary hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700")
              }`}
              title="Mi perfil"
            >
              {(loggedInUser?.iniciales.charAt(0) ?? (isStaff ? "G" : "S")).toUpperCase()}
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="px-4 py-2.5 bg-[#DC2626] text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md shadow-red-900/20"
            >
              Iniciar sesión
            </button>
          )}

          {/* Dark mode */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Cambiar tema"
          >
            {darkMode ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────── ADMIN TOPBAR ───────────────────────────

function AdminTopBar({
  current,
  onToggleSidebar,
  navigate,
  darkMode,
  setDarkMode,
  userName,
  roleName,
  homeScreen,
}: {
  current: Screen;
  onToggleSidebar: () => void;
  navigate: (s: Screen) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  userName: string;
  roleName: string;
  homeScreen: Screen;
}) {
  const labels: Partial<Record<Screen, string>> = {
    dashboard: "Dashboard",
    inicio: "Inicio",
    "manage-products": "Gestión de productos",
    orders: "Gestión de ventas",
    clients: "Gestión de clientes",
    reports: "Reportes e informes",
    roles: "Roles",
    permissions: "Permisos",
    users: "Gestión de usuarios",
    empleados: "Gestión de empleados",
    access: "Gestión de acceso",
    purchases: "Gestión de compras",
    perecederos: "CPN",
    "orden-compra": "Órdenes de Compra",
    "nueva-orden-compra": "Nueva Orden de Compra",
    "gestion-compra": "Gestión de Compras",
    "nueva-compra": "Nueva Compra",
    supplies: "Gestión de insumos",
    suppliers: "Proveedores",
    "production-orders": "Órdenes de producción",
    "finished-products": "Producto terminado",
    "tech-sheet": "Ficha técnica",
    sales: "Gestión de ventas",
    "supply-categories": "Categorías de insumos",
    "product-categories": "Categorías de productos",
    profile: "Mi perfil",
  };
  return (
    <header className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border h-14 flex items-center px-4 gap-2 shadow-sm">
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground ml-2">
        <button
          onClick={() => navigate(homeScreen)}
          className="hover:text-foreground transition-colors cursor-pointer"
        >
          {homeScreen === "dashboard" ? "Dashboard" : "Inicio"}
        </button>
        {current !== "dashboard" && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">
              {labels[current] ?? current}
            </span>
          </>
        )}
      </div>
      <div className="ml-auto flex items-center gap-0">
        <button
          onClick={() => navigate("landing")}
          className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground"
        >
          <Store className="w-5 h-5" />
        </button>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground"
          title={darkMode ? "Modo claro" : "Modo oscuro"}
        >
          {darkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
        <div
          className="ml-3 flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("profile")}
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm font-semibold text-foreground">{userName}</span>
            <span className="text-[11px] text-muted-foreground font-medium">{roleName}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────── BOTTOM NAV (mobile) ───────────────────────────

function BottomNav({
  navigate,
  cart,
  current,
  onMore,
}: {
  navigate: (s: Screen) => void;
  cart: CartItem[];
  current: Screen;
  onMore: () => void;
}) {
  const count = cart.reduce((s, i) => s + i.quantity, 0);
  const items = [
    { s: "landing" as Screen, Icon: Home, label: "Inicio" },
    {
      s: "mis-pedidos" as Screen,
      Icon: ShoppingBag,
      label: "Pedidos",
    },
    { s: "catalog" as Screen, Icon: Grid, label: "Menú" },
    {
      s: "supplies" as Screen,
      Icon: Package,
      label: "Inventario",
    },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16">
        {items.map(({ s, Icon, label }) => (
          <button
            key={s}
            onClick={() => navigate(s)}
            className={`flex flex-col items-center gap-1 py-2 px-3 cursor-pointer transition-colors ${current === s ? "text-primary" : "text-muted-foreground"}`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
        <button
          onClick={onMore}
          className="flex flex-col items-center gap-1 py-2 px-3 cursor-pointer text-muted-foreground relative"
        >
          <div className="relative">
            <MoreHorizontal className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
            )}
          </div>
          <span className="text-xs font-medium">Más</span>
        </button>
      </div>
    </nav>
  );
}

// ─────────────────────────── MOBILE DRAWER ───────────────────────────

function MobileDrawer({
  open,
  onClose,
  navigate,
  onLogin,
  cart,
  isLoggedIn,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  navigate: (s: Screen) => void;
  onLogin: () => void;
  cart: CartItem[];
  isLoggedIn: boolean;
  onLogout: () => void;
}) {
  const count = cart.reduce((s, i) => s + i.quantity, 0);
  const rows = [
    {
      s: "cart" as Screen,
      Icon: ShoppingCart,
      label: "Carrito",
      badge: count,
    },
    { s: "clients" as Screen, Icon: Users, label: "Clientes" },
    {
      s: "product-categories" as Screen,
      Icon: Tag,
      label: "Categorías",
    },
    {
      s: "supplies" as Screen,
      Icon: Package,
      label: "Insumos",
    },
    {
      s: "reports" as Screen,
      Icon: BarChart2,
      label: "Informes",
    },
    ...(isLoggedIn
      ? [
          {
            s: "dashboard" as Screen,
            Icon: TrendingUp,
            label: "Panel de control",
          },
        ]
      : []),
  ];
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 26,
              stiffness: 320,
            }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl md:hidden"
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-4" />
            <div className="px-4 pb-8 space-y-1 max-h-[70vh] overflow-y-auto">
              {rows.map(({ s, Icon, label, badge }: any) => (
                <button
                  key={s}
                  onClick={() => {
                    navigate(s);
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-muted transition-colors cursor-pointer text-left"
                >
                  <div className="relative">
                    <Icon className="w-5 h-5 text-primary" />
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {badge}
                      </span>
                    )}
                  </div>
                  <span className="text-base font-medium text-foreground">
                    {label}
                  </span>
                </button>
              ))}
              <div className="border-t border-border my-2" />
              {isLoggedIn ? (
                <button
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-red-50 transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-5 h-5 text-red-500" />
                  <span className="text-base font-medium text-red-500">
                    Cerrar sesión
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    navigate("login");
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-muted transition-colors cursor-pointer text-left"
                >
                  <UserCircle className="w-5 h-5 text-primary" />
                  <span className="text-base font-medium text-foreground">
                    Ingresar
                  </span>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────── LANDING ───────────────────────────

function LandingScreen({
  navigate,
  setProduct,
  onCategoryNavigate,
}: {
  navigate: (s: Screen) => void;
  setProduct: (p: Product) => void;
  onCategoryNavigate: (cat: string) => void;
}) {
  const featured = PRODUCTS.filter(
    (p) => p.status === "disponible",
  ).slice(0, 3);
  return (
    <div>
      {/* Hero – full width con imagen de fondo */}
      <section className="relative w-full min-h-screen overflow-hidden">
        {/* Imagen de fondo full-bleed */}
        <img
          src={pizzaHero}
          alt="Pizza pepperoni artesanal La Sirena recién horneada"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Contenido sobre la zona oscura izquierda */}
        <div className="relative z-10 w-full min-h-screen flex items-center">
          <div className="px-10 md:px-16 lg:px-20 pt-24 pb-16 max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white text-sm font-bold rounded-full mb-8 shadow-lg shadow-red-900/30"
              >
                ⭐ Artesanal · Medellín · Desde 1994
              </motion.div>

              {/* Main title */}
              <h1
                className="text-[clamp(3rem,8vw,5.5rem)] font-bold text-white leading-[1.0] mb-6"
                style={{ fontFamily: SERIF }}
              >
                La Sirena
                <br />
                <span className="text-[#DC2626]">
                  El sabor que
                </span>
                <br />
                conquista
              </h1>

              {/* Description */}
              <p className="text-white/70 text-lg md:text-xl leading-relaxed mb-10">
                Pizzas artesanales horneadas con tradición
                familiar. Ingredientes frescos, masa propia y
                treinta años de amor.
              </p>

              {/* CTAs — en columna solo por debajo de `sm`; en escritorio van
                  siempre en la misma fila. `flex-col` estira los dos botones al
                  ancho del contenido, así que apilados se ven del mismo tamaño;
                  `sm:items-center` les devuelve su ancho natural en fila. */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <button
                  onClick={() => navigate("catalog")}
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#DC2626] text-white font-bold text-base rounded-xl hover:bg-red-700 active:scale-95 transition-all duration-200 shadow-2xl shadow-red-900/40 cursor-pointer"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Ordenar ahora
                </button>
                <button
                  onClick={() => navigate("catalog")}
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 border-2 border-white/70 text-white font-bold text-base rounded-xl hover:bg-white/10 hover:border-white active:scale-95 transition-all duration-200 cursor-pointer backdrop-blur-sm"
                >
                  Ver menú completo
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              {/* Estadísticas del hero — tarjeta oscura con divisores, NO la
                  franja roja de ancho completo de más abajo: esa se mantiene
                  igual y las dos conviven. Va dentro de la columna izquierda,
                  debajo de los botones. */}
              <div className="mt-10 inline-flex items-stretch rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 px-1.5 sm:px-3 py-4 divide-x divide-white/15">
                {[
                  {
                    value: "+5.200",
                    label: "Ventas entregadas",
                  },
                  {
                    value: "25 min",
                    label: "Preparación promedio",
                  },
                  {
                    value: "30 años",
                    label: "De tradición",
                  },
                ].map(({ value, label }) => (
                  <div
                    key={label}
                    className="px-2 sm:px-5 text-center"
                  >
                    <p
                      // `clamp` en vez de pasos fijos: las tres celdas se
                      // reparten el ancho de la columna del hero, así que la
                      // cifra tiene que encogerse en pantallas muy angostas
                      // para que el bloque nunca desborde ni se corte.
                      className="text-[clamp(1rem,4.6vw,1.5rem)] font-bold text-white leading-none"
                      style={{ fontFamily: MONO }}
                    >
                      {value}
                    </p>
                    <p className="text-[clamp(0.625rem,2.6vw,0.75rem)] text-white/70 font-medium mt-1.5 leading-snug">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 1: Estadísticas ── */}
      <section className="bg-[#DC2626] py-12 md:py-14">
        <div className="max-w-5xl mx-auto px-6">
          {/* 3 columnas, no 4: la cuarta quedaba vacía en escritorio y el
              grupo se corría hacia la izquierda de la franja. Al ocupar cada
              estadística una columna, el bloque queda centrado en el contenedor
              y con el mismo espacio a ambos lados. */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            {[
              {
                emoji: "📦",
                value: "+5.200",
                label: "Ventas entregadas",
                className: "",
              },
              {
                emoji: "⚡",
                value: "25 min",
                label: "Entrega promedio",
                className: "",
              },
              {
                emoji: "🏆",
                value: "30 años",
                label: "De tradición",
                // En el grid de 2 columnas de mobile esta cae sola en la
                // segunda fila y quedaba pegada a la izquierda; al ocupar las
                // dos columnas se centra sola. En escritorio vuelve a ocupar
                // una sola columna.
                className: "col-span-2 md:col-span-1",
              },
            ].map(({ emoji, value, label, className }) => (
              <div
                key={label}
                className={`flex flex-col items-center gap-2 text-center ${className}`}
              >
                <span className="text-4xl leading-none">
                  {emoji}
                </span>
                <p
                  className="text-3xl md:text-4xl font-bold text-white mt-1 leading-none"
                  style={{ fontFamily: MONO }}
                >
                  {value}
                </p>
                <p className="text-white/75 text-sm font-medium">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 2: Categorías ── */}
      <section className="bg-muted py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          {/* Heading */}
          <div className="text-center mb-12">
            <h2
              className="text-4xl md:text-5xl font-bold text-foreground mb-3"
              style={{ fontFamily: SERIF }}
            >
              Nuestras categorías
            </h2>
            <p className="text-muted-foreground text-base md:text-lg">
              Descubre todo lo que tenemos para ti
            </p>
          </div>

          {/* Cards — horizontal scroll on mobile, grid on md+ */}
          <div
            className="flex gap-4 overflow-x-auto md:grid md:grid-cols-3 md:overflow-visible pb-2 md:pb-0 max-w-2xl mx-auto w-full"
            style={{
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {[
              { emoji: "🍕", label: "Pizzas" },
              { emoji: "🥤", label: "Bebidas" },
              { emoji: "🍝", label: "Lasaña" },
            ].map(({ emoji, label }) => (
              <button
                key={label}
                onClick={() => onCategoryNavigate(label)}
                className="group flex-shrink-0 w-40 md:w-auto bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg hover:-translate-y-1 hover:scale-105 active:scale-100 transition-all duration-200 cursor-pointer flex flex-col items-center gap-3 px-4 py-6"
              >
                <span className="text-4xl leading-none">
                  {emoji}
                </span>
                <p className="text-foreground text-sm font-semibold text-center leading-snug">
                  {label}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 3: Las favoritas de nuestros clientes ── */}
      <section className="bg-muted py-16 md:py-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          {/* Header row */}
          <div className="flex items-center justify-between mb-10">
            <h2
              className="text-2xl md:text-3xl font-bold text-foreground"
              style={{ fontFamily: SERIF }}
            >
              Las favoritas de nuestros clientes
            </h2>
            <button
              onClick={() => navigate("catalog")}
              className="text-[#DC2626] font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all cursor-pointer shrink-0"
            >
              Ver todas <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Cards — horizontal scroll on mobile, 4-col on desktop */}
          <div
            className="flex gap-5 overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible pb-2 md:pb-0"
            style={{
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {[
              {
                productoId: 1,
                name: "Cañón",
                description: "Pizza de la casa.",
                rating: 4.8,
              },
              {
                productoId: 2,
                name: "Carnes",
                description: "Pizza con carnes.",
                rating: 4.9,
              },
              {
                productoId: 4,
                name: "Jamón y Queso",
                description: "Pizza con jamón y queso.",
                rating: 4.7,
              },
              {
                productoId: 3,
                name: "Hawaii",
                description: "Pizza con jamón y piña.",
                rating: 5.0,
              },
            ].map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
                onClick={() => {
                  const producto = PRODUCTS.find(
                    (item) => item.id === p.productoId,
                  );
                  if (!producto) return;
                  setProduct(producto);
                  navigate("product-detail");
                }}
                className="group flex-shrink-0 w-72 md:w-auto bg-card rounded-[20px] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.03] transition-all duration-300 cursor-pointer flex flex-col"
              >
                {/* Image */}
                <div className="relative h-52 bg-muted overflow-hidden">
                  <img
                    src={imagenDeProducto(p.productoId)}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-[#DC2626] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-md">
                    <Star className="w-3 h-3 fill-white text-white" />
                    Favorita
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col flex-1">
                  <h3
                    className="text-foreground font-bold text-base mb-1.5 leading-snug"
                    style={{ fontFamily: SERIF }}
                  >
                    {p.name}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 flex-1 mb-4">
                    {p.description}
                  </p>

                  {/* Price + Rating */}
                  <div className="flex items-center justify-between mt-auto">
                    <span
                      className="text-[#DC2626] text-lg font-semibold"
                      style={{ fontFamily: MONO }}
                    >
                      $ {precioDeProducto(p.productoId).toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Nuestra Historia ── */}
      <section className="bg-card py-16 md:py-24">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left — image with floating founder card */}
            <div className="relative">
              <div className="rounded-[24px] overflow-hidden shadow-xl aspect-[4/3]">
                <img
                  src={imagenLocal}
                  alt="Interior de La Sirena Pizza — Medellín"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating founder card */}
              <div className="absolute bottom-5 left-5 bg-card rounded-2xl shadow-xl px-5 py-4 max-w-[220px]">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full bg-[#DC2626] flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ fontFamily: SERIF }}
                  >
                    G
                  </div>
                  <div>
                    <p
                      className="text-[#DC2626] font-bold text-sm leading-tight"
                      style={{ fontFamily: SERIF }}
                    >
                      Gloria Inés Vargas
                    </p>
                    <p className="text-muted-foreground text-[11px] mt-0.5 leading-tight">
                      Fundadora · La Sirena Pizza 1994
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — text content */}
            <div className="flex flex-col gap-6">
              {/* Badge */}
              <div className="inline-flex">
                <span className="px-4 py-1.5 bg-red-50 text-[#DC2626] text-sm font-semibold rounded-full border border-red-100">
                  Nuestra historia
                </span>
              </div>

              {/* Title */}
              <h2
                className="text-4xl md:text-5xl font-bold text-foreground leading-[1.1]"
                style={{ fontFamily: SERIF }}
              >
                30 años de pasión por la pizza artesanal
              </h2>

              {/* Body */}
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                En 1994, Gloria Inés abrió La Sirena con una
                receta familiar y el sueño de compartir el mejor
                sabor con Medellín. Hoy, tres décadas después,
                seguimos horneando cada pizza con el mismo amor
                de siempre.
              </p>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                Masa elaborada a mano, ingredientes
                seleccionados y el secreto inconfesable de
                nuestra salsa artesanal. Eso es La Sirena.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => navigate("catalog")}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#DC2626] text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all duration-200 shadow-md shadow-red-900/20 cursor-pointer text-sm"
                >
                  🍕 Pedir ahora
                </button>
                <button
                  onClick={() =>
                    toast.info("Llámanos: 604 234 5678")
                  }
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-card text-foreground font-semibold rounded-xl border border-border hover:bg-muted active:scale-95 transition-all duration-200 cursor-pointer text-sm"
                >
                  📞 Llamar
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Por qué La Sirena ── */}
      <section className="bg-muted py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-3xl font-bold text-center mb-12 text-foreground"
            style={{ fontFamily: SERIF }}
          >
            ¿Por qué La Sirena?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {[
              {
                icon: "🍕",
                title: "30 años de tradición",
                desc: "Desde 1994 haciendo las mejores pizzas de Medellín con la misma receta artesanal de siempre.",
              },
              {
                icon: "🌿",
                title: "Ingredientes frescos",
                desc: "Seleccionamos los mejores ingredientes locales cada día para garantizar calidad en cada mordida.",
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="bg-card rounded-2xl p-6 border border-border shadow-sm text-center"
              >
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="text-lg font-bold mb-2 text-foreground">
                  {title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{ backgroundColor: "#000000" }}
        className="py-12 rounded-t-3xl"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-8">
            {/* Brand */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <img
                  src={logoBlanco}
                  alt="Logo"
                  className="w-8 h-8 rounded-full object-contain"
                />
                <span
                  className="font-bold text-lg text-white"
                  style={{ fontFamily: SERIF }}
                >
                  La Sirena Pizza
                </span>
              </div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                Desde 1994 horneando las mejores pizzas
                artesanales de Medellín con receta familiar y
                amor auténtico.
              </p>
            </div>
            {/* Contacto */}
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                Contacto
              </h3>
              <div
                className="space-y-2 text-sm"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 shrink-0 text-red-400" />
                  <span>604 234 5678</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 shrink-0 text-red-400" />
                  <span>info@lasirena.com.co</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>
                    Cra. 45 #104-30, Laureles
                    <br />
                    Medellín, Antioquia
                  </span>
                </div>
              </div>
            </div>
            {/* Horario */}
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                Horario de atención
              </h3>
              <div
                className="space-y-1.5 text-sm"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                <div className="flex justify-between">
                  <span>Lunes – Miércoles</span>
                  <span
                    className="font-medium"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    Cerrado
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Jueves – Domingo</span>
                  <span className="font-semibold text-white">
                    4:00 pm – 10:00 pm
                  </span>
                </div>
                <p
                  className="text-xs mt-2 pt-2"
                  style={{
                    borderTop:
                      "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  Solo pedidos presenciales en local
                </p>
              </div>
            </div>
          </div>
          <div
            className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <p
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              © 2026 La Sirena Pizza · Medellín, Colombia ·
              Desde 1994
            </p>
            <p
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              NIT: 900.123.456-7 · Establecimiento de comercio
              registrado
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────── CATALOG ───────────────────────────

// Tarjeta de producto del catálogo. Vive fuera de `CatalogScreen` porque el
// grid se pinta por dos caminos —grid único al elegir una categoría y grid por
// secciones con "Todas"— y los dos tienen que mostrar exactamente la misma
// tarjeta. `index` solo escalona la animación dentro de su propia fila.
function ProductCard({
  product: p,
  index,
  onOpen,
  onQuickAdd,
}: {
  product: Product;
  index: number;
  onOpen: (p: Product) => void;
  onQuickAdd: (p: Product) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
    >
      <button
        className={`relative w-full overflow-hidden h-48 bg-muted cursor-pointer block ${verImagenCompleta(p) ? "p-2" : ""}`}
        onClick={() => onOpen(p)}
      >
        <img
          src={p.image}
          alt={p.name}
          className={`block w-full h-full group-hover:scale-105 transition-transform duration-500 ${verImagenCompleta(p) ? "object-contain" : "object-cover"}`}
        />
        <div className="absolute top-3 right-3">
          <Badge className={PROD_STATUS_COLOR[p.status]}>
            {p.status === "disponible"
              ? "Disponible"
              : "No disponible"}
          </Badge>
        </div>
      </button>
      <div className="p-4">
        <div className="mb-1">
          <h3
            className="font-bold text-base text-foreground"
            style={{ fontFamily: SERIF }}
          >
            {p.name}
          </h3>
        </div>
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2 leading-snug">
          {p.description}
        </p>
        <div className="flex items-center justify-between">
          <span
            className="font-bold text-lg text-foreground"
            style={{ fontFamily: MONO }}
          >
            {fmt(p.price)}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onOpen(p)}
              className="px-3 py-2 text-sm font-semibold border border-border rounded-xl hover:bg-muted transition-colors cursor-pointer text-foreground"
            >
              Ver más
            </button>
            <button
              onClick={() => onQuickAdd(p)}
              disabled={p.status !== "disponible"}
              className="px-3 py-2 text-sm font-semibold bg-primary text-white rounded-xl hover:bg-red-700 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CatalogScreen({
  navigate,
  setProduct,
  quickAdd,
  initialCat = "Todas",
  page,
  setPage,
  productos,
}: {
  navigate: (s: Screen) => void;
  setProduct: (p: Product) => void;
  quickAdd: (p: Product) => void;
  initialCat?: string;
  /** Página del catálogo, controlada por App para que sobreviva al detalle. */
  page: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  /** Productos del panel de administrador. */
  productos: Product[];
}) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState(initialCat);
  const cats = ["Todas", "Pizzas", "Bebidas", "Lasaña"];
  // 9 = 3 columnas del grid, así cada página cierra en filas completas.
  const PER_PAGE = 9;

  const filtered = useMemo(
    () =>
      productos.filter(
        (p) =>
          (cat === "Todas" || p.category === cat) &&
          (search === "" ||
            p.name
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            p.description
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [search, cat, productos],
  );

  // Sin paginado el menú volcaba los 13 productos de una vez, así que al
  // llegar a la última categoría había que hacer scroll largo para volver
  // arriba. Se corta
  // `filtered` ANTES de agrupar por secciones: de ese modo una página nunca
  // parte una sección a la mitad y los títulos siguen correspondiendo a lo que
  // hay debajo.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );

  // Al cambiar la búsqueda o la categoría, la página actual puede quedar más
  // allá del último resultado y el grid salía vacío; se reajusta sola.
  useEffect(() => {
    setPage(1);
  }, [search, cat]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  // Con el filtro "Todas" el grid se parte en las secciones tituladas de
  // SECCIONES_MENU; al elegir una sola categoría se deja el grid único de antes,
  // sin encabezados. Se agrupa sobre `paged`, no sobre PRODUCTS, para que la
  // búsqueda también se reparta por secciones, y las categorías sin resultados
  // se omiten en vez de dejar un título colgado sobre un grid vacío.
  const secciones = useMemo(() => {
    if (cat !== "Todas") return [];
    const porCategoria = new Map<string, Product[]>();
    for (const p of paged) {
      const lista = porCategoria.get(p.category);
      if (lista) lista.push(p);
      else porCategoria.set(p.category, [p]);
    }
    const declaradas = SECCIONES_MENU.map(
      ({ categoria, titulo }) => ({
        titulo,
        productos: porCategoria.get(categoria) ?? [],
      }),
    ).filter((s) => s.productos.length > 0);
    const conocidas = new Set(
      SECCIONES_MENU.map((s) => s.categoria),
    );
    const nuevas = [...porCategoria.entries()]
      .filter(([categoria]) => !conocidas.has(categoria))
      .map(([titulo, productos]) => ({ titulo, productos }));
    return [...declaradas, ...nuevas];
  }, [paged, cat]);

  const abrirDetalle = (p: Product) => {
    setProduct(p);
    navigate("product-detail");
  };

  const agregarAlCarrito = (p: Product) => {
    quickAdd(p);
    toast.success(`¡${p.name} agregada!`);
  };

  const irAPagina = (n: number) => {
    setPage(n);
    // El grid arranca justo debajo del buscador: sin esto el número de página
    // quedaba pegado al borde superior de la ventana y el título del menú
    // quedaba fuera de vista al cambiar de página.
    window.requestAnimationFrame(() =>
      window.scrollTo({
        top: document.getElementById("catalogo-inicio")?.offsetTop ?? 0,
        behavior: "smooth",
      }),
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8" id="catalogo-inicio">
        <h1
          className="text-3xl font-bold text-foreground"
          style={{ fontFamily: SERIF }}
        >
          Nuestro Menú
        </h1>
        <p className="text-muted-foreground mt-1">
          Elige tu pizza favorita y personalízala a tu gusto
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pizza..."
            className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${cat === c ? "bg-primary text-white shadow" : "bg-muted text-muted-foreground hover:bg-border"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-6xl mb-4">🔍</p>
          <h3 className="text-xl font-bold mb-2 text-foreground">
            Sin resultados
          </h3>
          <p className="text-muted-foreground">
            No encontramos pizzas con ese nombre. ¡Intenta con
            otro!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {paged.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              index={i}
              onOpen={abrirDetalle}
              onQuickAdd={agregarAlCarrito}
            />
          ))}
        </div>
      )}

      {filtered.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center mt-8">
          <div className="flex items-center gap-1">
            <button
              onClick={() => irAPagina(Math.max(1, page - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (n) => (
                <button
                  key={n}
                  onClick={() => irAPagina(n)}
                  aria-current={n === page ? "page" : undefined}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}
                >
                  {n}
                </button>
              ),
            )}
            <button
              onClick={() => irAPagina(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              aria-label="Página siguiente"
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <VolverArriba />
    </div>
  );
}

// ─────────────────────────── PRODUCT DETAIL ───────────────────────────

function ProductDetailScreen({
  product,
  navigate,
  addDetailed,
}: {
  product: Product;
  navigate: (s: Screen, options?: { restaurar?: boolean }) => void;
  addDetailed: (item: CartItem) => void;
}) {
  const [sizeIdx, setSizeIdx] = useState(0);
  const [extras, setExtras] = useState<string[]>([]);
  const [qty, setQty] = useState(1);

  const extrasPrice = extras.reduce(
    (sum, ex) =>
      sum +
      (product.extras.find((e) => e.label === ex)?.price ?? 0),
    0,
  );
  const sizePrice = sizeDe(product, sizeIdx).price;
  const total = (sizePrice + extrasPrice) * qty;

  const toggleExtra = (label: string) =>
    setExtras((prev) =>
      prev.includes(label)
        ? prev.filter((e) => e !== label)
        : [...prev, label],
    );

  const handleAdd = () => {
    const size = sizeDe(product, sizeIdx);
    addDetailed({
      id: `${product.id}-${Date.now()}`,
      product,
      quantity: qty,
      size: size.label,
      sizePrice,
      selectedExtras: extras,
      extrasPrice,
    });
    toast.success(`¡${product.name} agregada al carrito!`, {
      description: size.label ? `${size.label} × ${qty}` : `× ${qty}`,
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("catalog", { restaurar: true })}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al menú
        </button>
        <button
          onClick={() => navigate("landing")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <Home className="w-4 h-4" /> Volver al inicio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Image */}
        <div className={`rounded-2xl overflow-hidden bg-muted h-80 md:h-[420px] ${verImagenCompleta(product) ? "p-3" : ""}`}>
          <img
            src={product.image}
            alt={product.name}
            className={`block w-full h-full ${verImagenCompleta(product) ? "object-contain" : "object-cover"}`}
          />
        </div>

        {/* Info */}
        <div>
          <Badge className="mb-3 bg-muted text-muted-foreground">
            {product.category}
          </Badge>
          <h1
            className="text-4xl font-bold mb-2 text-foreground leading-tight"
            style={{ fontFamily: SERIF }}
          >
            {product.name}
          </h1>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-muted-foreground text-sm">
              {product.sales.toLocaleString("es-CO")} pedidos
            </span>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-6">
            {product.description}
          </p>

          {/* Tamaño: las bebidas no tienen selector (botella 2.5 L) y las
              lasañas tienen una única presentación fija "Normal". Solo las
              pizzas ofrecen una elección real entre Mediano y Grande. */}
          {product.sizes.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold mb-3 text-foreground">
                {product.sizes.length === 1
                  ? "Presentación"
                  : "Elige el tamaño"}
              </h3>
              {product.sizes.length === 1 ? (
                <div className="flex items-center justify-between p-3.5 rounded-xl border-2 border-primary bg-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <span className="font-medium text-foreground">
                      {product.sizes[0].label}
                    </span>
                  </div>
                  <span
                    className="font-bold text-foreground"
                    style={{ fontFamily: MONO }}
                  >
                    {fmt(product.sizes[0].price)}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {product.sizes.map((s, i) => (
                    <label
                      key={s.label}
                      className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${sizeIdx === i ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${sizeIdx === i ? "border-primary" : "border-muted-foreground"}`}
                        >
                          {sizeIdx === i && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <input
                          type="radio"
                          name="size"
                          className="sr-only"
                          checked={sizeIdx === i}
                          onChange={() => setSizeIdx(i)}
                        />
                        <span className="font-medium text-foreground">
                          {s.label}
                        </span>
                      </div>
                      <span
                        className="font-bold text-foreground"
                        style={{ fontFamily: MONO }}
                      >
                        {fmt(s.price)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cantidad */}
          <div className="flex items-center gap-4 mb-6">
            <span className="font-bold text-foreground">
              Cantidad
            </span>
            <div className="flex items-center gap-2 bg-muted rounded-xl p-1">
              <button
                onClick={() =>
                  setQty((q) => Math.max(1, q - 1))
                }
                className="w-9 h-9 rounded-lg bg-card flex items-center justify-center hover:bg-border transition-colors cursor-pointer shadow-sm"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span
                className="w-8 text-center font-bold text-lg"
                style={{ fontFamily: MONO }}
              >
                {qty}
              </span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-9 h-9 rounded-lg bg-card flex items-center justify-center hover:bg-border transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-xl mb-4">
            <span className="text-muted-foreground font-medium">
              Total a pagar
            </span>
            <span
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: MONO }}
            >
              {fmt(total)}
            </span>
          </div>
          <PrimaryBtn
            onClick={handleAdd}
            size="lg"
            className="w-full"
          >
            <ShoppingCart className="w-5 h-5" /> Agregar al
            carrito
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── CART ───────────────────────────

const PAYMENT_INFO: Record<
  string,
  { icon: string; lines: string[] }
> = {
  Nequi: {
    icon: "💜",
    lines: [
      "Número Nequi: 310 555 1234",
      "Titular: La Sirena Pizza",
    ],
  },
  Bancolombia: {
    icon: "🏦",
    lines: [
      "Cuenta de Ahorros: 690-1234567-89",
      "Titular: La Sirena Pizza SAS",
      "NIT: 900.123.456-7",
    ],
  },
};

function CartScreen({
  cart,
  navigate,
  updateQty,
  remove,
  clear,
  onOrder,
  isLoggedIn,
  clienteSesion,
  onRequireLogin,
  confirmationHora,
}: {
  cart: CartItem[];
  navigate: (s: Screen) => void;
  updateQty: (id: string, q: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  onOrder: (
    metodoPago: string,
    comprobante: string,
    items: CartItem[],
    horaRecogida: string,
    clienteNombre?: string,
    clienteDocumento?: string,
  ) => void;
  isLoggedIn: boolean;
  /** Nombre del usuario en sesión; se muestra en el resumen y la confirmación. */
  clienteSesion?: string;
  onRequireLogin: (order: PendingOrder) => void;
  confirmationHora?: string;
}) {
  const [payment, setPayment] = useState("Nequi");
  const [checkoutStep, setCheckoutStep] = useState<0 | 1 | 2 | 3>(
    0,
  );
  const [comprobante, setComprobante] = useState<string>("");
  const [horaRecogida, setHoraRecogida] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestDocument, setGuestDocument] = useState("");
  const [loading, setLoading] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] =
    useState(Boolean(confirmationHora));
  const [horaConfirmada, setHoraConfirmada] = useState(
    confirmationHora ?? "",
  );
  // El nombre que se acabó registrando, para mostrarlo ya en la pantalla de
  // confirmación (donde `guestName` puede seguir editable hacia atrás).
  const [nombreConfirmado, setNombreConfirmado] = useState("");
  const [documentoConfirmado, setDocumentoConfirmado] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const cartTotal = (item: CartItem) =>
    (item.sizePrice + item.extrasPrice) * item.quantity;
  const subtotal = cart.reduce((s, i) => s + cartTotal(i), 0);
  // Quién está haciendo el pedido. El nombre sí se guardaba en la venta, pero
  // el checkout no lo mostraba en ningún paso ni en la confirmación, así que el
  // cliente no tenía forma de confirmar a nombre de quién estaba comprando.
  const nombreCliente = isLoggedIn
    ? clienteSesion?.trim() || ""
    : guestName.trim();

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) =>
      setComprobante(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!comprobante) {
      toast.error("Por favor sube el comprobante de pago");
      return;
    }
    if (!horaRecogida) {
      toast.error("Por favor selecciona la hora de recogida");
      return;
    }
    if (!isLoggedIn) {
      setCheckoutStep(3);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      onOrder(payment, comprobante, [...cart], horaRecogida, nombreCliente || undefined);
      clear();
      setLoading(false);
      setCheckoutStep(0);
      setHoraConfirmada(horaRecogida);
      setNombreConfirmado(nombreCliente);
      setPedidoConfirmado(true);
    }, 1400);
  };

  const submitAsGuest = () => {
    if (!guestName.trim() || !guestDocument.trim()) {
      toast.error("Ingresa tu nombre y documento para continuar");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      // El documento se enviaba pero se quedaba en el formulario: la venta
      // guardaba solo el nombre, así que un pedido de invitado quedaba sin
      // identificación.
      onOrder(
        payment,
        comprobante,
        [...cart],
        horaRecogida,
        guestName.trim(),
        guestDocument.trim(),
      );
      clear();
      setLoading(false);
      setCheckoutStep(0);
      setHoraConfirmada(horaRecogida);
      setNombreConfirmado(guestName.trim());
      setDocumentoConfirmado(guestDocument.trim());
      setPedidoConfirmado(true);
    }, 1400);
  };

  if (pedidoConfirmado) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-7xl mb-6">⏳</div>
        <h2
          className="text-2xl font-bold mb-2 text-foreground"
          style={{ fontFamily: SERIF }}
        >
          ¡Pedido recibido!
        </h2>
         <p className="text-muted-foreground mb-2">
           Estamos verificando tu comprobante de pago.
         </p>
         <p className="text-muted-foreground mb-6 text-sm">
           Esto tardará unos pocos minutos; te confirmaremos cuando tu pedido esté listo.
         </p>
         {/* El nombre con el que quedó registrado el pedido, para que el
             cliente confirme a nombre de quién compró. */}
         {nombreConfirmado && (
           <div className="bg-card border border-border rounded-2xl p-5 mb-4 text-left">
             <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
               <ShoppingBag className="w-4 h-4 text-primary" /> Pedido
               realizado por
             </h3>
             <p className="text-foreground font-semibold">
               {nombreConfirmado}
             </p>
             {documentoConfirmado && (
               <p className="text-sm text-muted-foreground mt-0.5">
                 Documento: {documentoConfirmado}
               </p>
             )}
           </div>
         )}
         <div className="bg-card border border-border rounded-2xl p-5 mb-4 text-left">
            <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Dónde
              recoger tu pedido
            </h3>
           <p className="text-sm text-muted-foreground mb-4">
             Podrás pasar por tu pedido
             {horaConfirmada ? ` a las ${horaConfirmada}` : ""}.
           </p>
           <div className="mb-4 border-l-2 border-primary/60 pl-3">
             <p className="text-xs text-muted-foreground">Hora de recogida</p>
             <p className="text-base font-bold text-primary">
               {horaConfirmada}
             </p>
           </div>
           <p className="text-foreground font-semibold">
             La Sirena Pizza
           </p>
          <p className="text-muted-foreground text-sm">
            Cra. 45 #104-30, Laureles
          </p>
          <p className="text-muted-foreground text-sm">
            Medellín, Antioquia
          </p>
           <div className="mt-3 pt-3 border-t border-border space-y-1">
             <p className="text-xs text-muted-foreground flex items-center gap-1.5">
               <Phone className="w-3.5 h-3.5" /> 604 234 5678
             </p>
             <p className="text-xs font-semibold text-primary">
               Horario: jueves a domingo, de 4:00 p. m. a 10:00 p. m.
             </p>
           </div>
         </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {isLoggedIn && (
            <PrimaryBtn onClick={() => navigate("mis-pedidos")} size="lg">
              Ver mis pedidos
            </PrimaryBtn>
          )}
          <GhostBtn
            onClick={() => navigate("landing")}
            className="px-7 py-4 text-lg min-h-[56px]"
          >
            Volver al inicio
          </GhostBtn>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-7xl mb-6">🛒</div>
        <h2
          className="text-2xl font-bold mb-2 text-foreground"
          style={{ fontFamily: SERIF }}
        >
          Tu carrito está vacío
        </h2>
        <p className="text-muted-foreground mb-8">
          Agrega algunas pizzas deliciosas para comenzar tu
          pedido
        </p>
        <PrimaryBtn
          onClick={() => navigate("catalog")}
          size="lg"
        >
          Ver el menú
        </PrimaryBtn>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("catalog")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Seguir comprando
        </button>
        <h1
          className="text-3xl font-bold mb-6 text-foreground"
          style={{ fontFamily: SERIF }}
        >
          Tu pedido
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="bg-card border border-border rounded-2xl p-4 flex gap-4"
              >
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-20 h-20 rounded-xl object-cover shrink-0 bg-muted"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-foreground">
                        {item.product.name}
                      </h3>
                      {item.size && (
                        <p className="text-sm text-muted-foreground">
                          {item.size}
                        </p>
                      )}
                      {item.selectedExtras.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          + {item.selectedExtras.join(", ")}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => remove(item.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors cursor-pointer p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 bg-muted rounded-xl p-0.5">
                      <button
                        onClick={() =>
                          updateQty(item.id, item.quantity - 1)
                        }
                        className="w-7 h-7 rounded-lg bg-card flex items-center justify-center hover:bg-border transition-colors cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQty(item.id, item.quantity + 1)
                        }
                        className="w-7 h-7 rounded-lg bg-card flex items-center justify-center hover:bg-border transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="text-sm text-muted-foreground"
                        style={{ fontFamily: MONO }}
                      >
                        {fmt(item.sizePrice + item.extrasPrice)}{" "}
                        <span className="text-[11px] font-sans">unitario</span>
                      </span>
                      <span
                        className="font-bold text-foreground"
                        style={{ fontFamily: MONO }}
                      >
                        {fmt(cartTotal(item))}{" "}
                        <span className="text-[11px] font-sans font-normal text-muted-foreground">
                          subtotal
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resumen + CTA */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="font-bold mb-3 text-foreground flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary" />{" "}
                Resumen
              </h3>
              {/* "Subtotal" y "Total" muestran hoy la misma cifra porque el
                  pedido no tiene envío ni impuestos; se mantienen las dos
                  filas para que, cuando se agreguen esos conceptos, el
                  desglose ya tenga dónde mostrarlos sin tocar el layout. */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    Subtotal (
                    {cart.reduce((s, i) => s + i.quantity, 0)}{" "}
                    productos)
                  </span>
                  <span style={{ fontFamily: MONO }}>
                    {fmt(subtotal)}
                  </span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold text-base text-foreground">
                  <span>Total</span>
                  <span style={{ fontFamily: MONO }}>
                    {fmt(subtotal)}
                  </span>
                </div>
              </div>
              <PrimaryBtn
                onClick={() => setCheckoutStep(1)}
                size="lg"
                className="w-full"
              >
                <CreditCard className="w-5 h-5" />
                Proceder al pago
              </PrimaryBtn>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal step 1: Resumen + método de pago ── */}
      <AnimatePresence>
        {checkoutStep === 1 && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="bg-card rounded-2xl w-full max-w-2xl shadow-2xl border border-border my-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3
                  className="text-lg font-bold text-foreground"
                  style={{ fontFamily: SERIF }}
                >
                  Resumen de tu pedido
                </h3>
                <button
                  onClick={() => setCheckoutStep(0)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Body: 2 cols */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
                {/* LEFT: items */}
                <div className="px-5 py-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    Descripción del pedido
                  </p>
                  {nombreCliente && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Cliente:{" "}
                      <span className="font-semibold text-foreground">
                        {nombreCliente}
                      </span>
                    </p>
                  )}
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3"
                      >
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-10 h-10 rounded-lg object-cover shrink-0 bg-muted"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {item.product.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.size ? `${item.size} · ` : ""}x
                            {item.quantity}
                          </p>
                          {item.selectedExtras.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate">
                              +{item.selectedExtras.join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end shrink-0 text-right">
                          <span
                            className="text-xs text-muted-foreground"
                            style={{ fontFamily: MONO }}
                          >
                            {fmt(item.sizePrice + item.extrasPrice)}{" "}
                            <span className="font-sans text-[10px]">unitario</span>
                          </span>
                          <span
                            className="text-sm font-bold text-foreground"
                            style={{ fontFamily: MONO }}
                          >
                            {fmt(cartTotal(item))}{" "}
                            <span className="font-sans text-[10px] font-normal text-muted-foreground">
                              subtotal
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Mismas dos filas que el panel "Resumen" del carrito, para
                      que el cliente lea el mismo desglose en las dos vistas. */}
                  <div className="mt-4 pt-3 border-t border-border space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        Subtotal (
                        {cart.reduce((s, i) => s + i.quantity, 0)}{" "}
                        productos)
                      </span>
                      <span style={{ fontFamily: MONO }}>
                        {fmt(subtotal)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-border flex justify-between items-center">
                      <span className="font-bold text-foreground text-base">
                        Total
                      </span>
                      <span
                        className="text-base font-bold text-primary"
                        style={{ fontFamily: MONO }}
                      >
                        {fmt(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
                {/* RIGHT: payment method + pickup time */}
                <div className="px-5 py-5 space-y-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Método de pago
                    </p>
                    <div className="space-y-2">
                      {["Nequi", "Bancolombia"].map((m) => (
                        <label
                          key={m}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${payment === m ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${payment === m ? "border-primary" : "border-muted-foreground"}`}
                          >
                            {payment === m && (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                          <input
                            type="radio"
                            name="payment"
                            className="sr-only"
                            value={m}
                            checked={payment === m}
                            onChange={() => setPayment(m)}
                          />
                          <span className="text-sm font-medium text-foreground">
                            {PAYMENT_INFO[m].icon} {m}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Hora de recogida */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Hora de recogida
                    </p>
                    <div className="mb-3 border-l-2 border-primary/60 pl-3 text-sm text-muted-foreground">
                      <p>
                        Atendemos de <strong className="text-foreground">4:00 PM</strong> a{" "}
                        <strong className="text-foreground">10:00 PM</strong>
                      </p>
                      <p className="text-xs mt-0.5">
                        Ejemplo: a las <strong className="text-foreground">06:00 p. m.</strong>
                      </p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-muted focus-within:ring-2 focus-within:ring-primary/30 transition-all ${
                      horaRecogida && (() => {
                        const [h, m] = horaRecogida.split(":").map(Number);
                        const now = new Date();
                        const sel = new Date(); sel.setHours(h, m, 0, 0);
                        const open = new Date(); open.setHours(16, 0, 0, 0);
                        const close = new Date(); close.setHours(22, 0, 0, 0);
                        return sel <= now || sel < open || sel >= close;
                      })() ? "border-red-400 focus-within:ring-red-300" : "border-border"
                    }`}>
                      <span className="text-base shrink-0">🕐</span>
                      <input
                        type="time"
                        value={horaRecogida}
                        min="16:00"
                        max="21:59"
                        aria-label="Hora de recogida, por ejemplo 06:00 p. m."
                        onChange={(e) => setHoraRecogida(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Ej: <span className="font-semibold text-foreground">06:00 p. m.</span> — usa el formato HH:MM y selecciona AM/PM
                    </p>
                    {/* Past-time / out-of-hours error */}
                    {horaRecogida && (() => {
                      const [h, m] = horaRecogida.split(":").map(Number);
                      const now = new Date();
                      const sel = new Date(); sel.setHours(h, m, 0, 0);
                      const open = new Date(); open.setHours(16, 0, 0, 0);
                      const close = new Date(); close.setHours(22, 0, 0, 0);
                      if (sel < open || sel >= close) {
                        return (
                          <p className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
                            ⚠ Esta hora está fuera de nuestro horario de atención (4:00 PM – 10:00 PM)
                          </p>
                        );
                      }
                      if (sel <= now) {
                        return (
                          <p className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
                            ⚠ Esta hora no está disponible — ya pasó
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div className="flex gap-3 px-5 py-4 border-t border-border">
                <button
                  onClick={() => setCheckoutStep(0)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!horaRecogida) {
                      toast.error("Por favor ingresa la hora de recogida");
                      return;
                    }
                    const [h, m] = horaRecogida.split(":").map(Number);
                    const now = new Date();
                    const sel = new Date(); sel.setHours(h, m, 0, 0);
                    const open = new Date(); open.setHours(16, 0, 0, 0);
                    const close = new Date(); close.setHours(22, 0, 0, 0);
                    if (sel < open || sel >= close) {
                      toast.error("La hora debe estar entre 4:00 PM y 10:00 PM");
                      return;
                    }
                    if (sel <= now) {
                      toast.error("Esta hora no está disponible — ya pasó");
                      return;
                    }
                    setCheckoutStep(2);
                  }}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 flex items-center justify-center gap-2"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
            </div>
          </div>
        )}
        {checkoutStep === 3 && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4 p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3
                    className="text-xl font-bold text-foreground"
                    style={{ fontFamily: SERIF }}
                  >
                    Datos para enviar tu pedido
                  </h3>
                  <button
                    onClick={() => setCheckoutStep(0)}
                    title="Volver al carrito"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  Ingresa tus datos para continuar como invitado o inicia sesión.
                </p>
                <div className="space-y-3 mb-5">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Nombre completo
                    </label>
                    <input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Ej: Laura Martínez"
                      className="w-full px-4 py-2.5 bg-muted rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Documento
                    </label>
                    <input
                      value={guestDocument}
                      onChange={(e) => setGuestDocument(e.target.value)}
                      placeholder="Ej: 1234567890"
                      inputMode="numeric"
                      className="w-full px-4 py-2.5 bg-muted rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={submitAsGuest}
                    disabled={loading}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {loading ? "Enviando..." : "Ingresar"}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal step 2: Datos de cuenta + subir comprobante ── */}
      <AnimatePresence>
        {checkoutStep === 2 && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCheckoutStep(1)}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h3
                    className="text-lg font-bold text-foreground"
                    style={{ fontFamily: SERIF }}
                  >
                    Datos de pago · {payment}
                  </h3>
                </div>
                <button
                  onClick={() => setCheckoutStep(0)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Body */}
              <div className="px-5 py-5 space-y-5">
                {/* Account info */}
                <div className="bg-muted/50 rounded-2xl p-4 border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">
                      {PAYMENT_INFO[payment].icon}
                    </span>
                    <p className="font-bold text-foreground text-base">
                      {payment}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {PAYMENT_INFO[payment].lines.map(
                      (line, i) => (
                        <p
                          key={i}
                          className="text-sm text-foreground font-medium"
                        >
                          {line}
                        </p>
                      ),
                    )}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-2">
                    Realiza la transferencia por el valor exacto
                    de{" "}
                    <strong className="text-foreground">
                      {fmt(subtotal)}
                    </strong>{" "}
                    y sube el comprobante.
                  </p>
                </div>

                {/* Upload */}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-primary" />
                    Comprobante de pago *
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                  {comprobante ? (
                    <div className="relative rounded-xl overflow-hidden border border-border">
                      <img
                        src={comprobante}
                        alt="Comprobante"
                        className="w-full max-h-48 object-contain bg-muted"
                      />
                      <button
                        onClick={() => {
                          setComprobante("");
                          if (fileRef.current)
                            fileRef.current.value = "";
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full flex flex-col items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 cursor-pointer transition-all group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                        <ImageIcon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground">
                          Haz clic para subir
                        </p>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG o PDF · máx 10 MB
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
              {/* Footer */}
              <div className="flex gap-3 px-5 py-4 border-t border-border">
                <button
                  onClick={() => setCheckoutStep(1)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  Atrás
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {loading
                    ? "Enviando..."
                    : "Enviar"}
                </button>
              </div>
            </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────── CLIENT PROFILE ───────────────────────────

function ClientProfileScreen({
  navigate,
  onLogout,
  loggedInUser,
  loggedInRoleName,
  isStaff,
  adminHomeScreen,
  onUpdateUser,
}: {
  navigate: (s: Screen) => void;
  onLogout: () => void;
  loggedInUser: {
    id: string;
    nombre: string;
    iniciales: string;
    avatarColor: string;
    correo: string;
    telefono: string;
    tipoDocumento: string;
    numeroDocumento: string;
  } | null;
  loggedInRoleName: string;
  isStaff: boolean;
  adminHomeScreen: Screen;
  onUpdateUser: (id: string, data: { correo: string; telefono: string }) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [correo, setCorreo] = useState(loggedInUser?.correo ?? "sebas@gmail.com");
  const [telefono, setTelefono] = useState(loggedInUser?.telefono ?? "3109876543");
  const [guardado, setGuardado] = useState({
    correo: loggedInUser?.correo ?? "sebas@gmail.com",
    telefono: loggedInUser?.telefono ?? "3109876543",
  });
  const [errores, setErrores] = useState<{
    correo?: string;
    telefono?: string;
  }>({});

  useEffect(() => {
    if (loggedInUser) {
      setCorreo(loggedInUser.correo);
      setTelefono(loggedInUser.telefono);
      setGuardado({ correo: loggedInUser.correo, telefono: loggedInUser.telefono });
    }
  }, [loggedInUser?.id]);

  const iCls = (err?: string) =>
    `w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${err ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`;

  const tipoDocumento = DOC_TIPOS.find(t => t.code === loggedInUser?.tipoDocumento)?.label
    ?? loggedInUser?.tipoDocumento
    ?? "—";

  const handleGuardar = () => {
    const ec = validarCorreo(correo);
    const et = !/^\d{7,15}$/.test(telefono.replace(/\s/g, ""))
      ? "Solo números, entre 7 y 15 dígitos"
      : null;
    if (ec || et) {
      setErrores({
        correo: ec ?? undefined,
        telefono: et ?? undefined,
      });
      return;
    }
    setGuardado({
       correo: correo.trim().toLowerCase(),
      telefono: telefono.trim(),
    });
    if (loggedInUser)
       onUpdateUser(loggedInUser.id, { correo: correo.trim().toLowerCase(), telefono: telefono.trim() });
    setEditando(false);
    setErrores({});
    toast.success("Perfil actualizado correctamente");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold text-foreground"
          style={{ fontFamily: SERIF }}
        >
          Mi Perfil
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tu información de cuenta
        </p>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Avatar */}
        <div className="flex items-center gap-5 px-6 py-6 border-b border-border bg-muted/30">
          <div className={`w-16 h-16 rounded-full ${loggedInUser?.avatarColor ?? "bg-blue-600"} text-white flex items-center justify-center text-2xl font-bold shrink-0 shadow-sm`}>
            {loggedInUser?.iniciales ?? "S"}
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="text-xl font-bold text-foreground"
              style={{ fontFamily: SERIF }}
            >
              {loggedInUser?.nombre ?? "Sebastián"}
            </h2>
            <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {loggedInUser ? loggedInRoleName : "Cliente"}
            </span>
          </div>
          {!editando && (
            <button
              onClick={() => {
                setCorreo(guardado.correo);
                setTelefono(guardado.telefono);
                setErrores({});
                setEditando(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
            >
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </button>
          )}
        </div>
         {/* Fields */}
         <div className="px-6 py-6 space-y-5">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
               <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                 <FileText className="w-3.5 h-3.5" /> Tipo de documento
               </label>
               <input
                 type="text"
                 value={tipoDocumento}
                 readOnly
                 className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/40 text-sm font-medium text-muted-foreground focus:outline-none select-none"
               />
               <p className="text-[11px] text-muted-foreground mt-1">
                 Este campo no es editable
               </p>
             </div>
             <div>
               <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                 <FileText className="w-3.5 h-3.5" /> Número de documento
               </label>
               <input
                 type="text"
                 value={loggedInUser?.numeroDocumento ?? "—"}
                 readOnly
                 className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/40 text-sm font-medium text-muted-foreground focus:outline-none select-none"
               />
               <p className="text-[11px] text-muted-foreground mt-1">
                 Este campo no es editable
               </p>
             </div>
           </div>
           <div>
             <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
               <User className="w-3.5 h-3.5" /> Nombre
             </label>
             <div className="px-3 py-2.5 rounded-xl border border-border bg-muted/40 text-sm font-medium text-muted-foreground">
               {loggedInUser?.nombre ?? "Sebastián"}
             </div>
             <p className="text-[11px] text-muted-foreground mt-1">
               Este campo no es editable
             </p>
           </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
              <Mail className="w-3.5 h-3.5" /> Correo
              electrónico
            </label>
            {editando ? (
              <>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => {
                     const value = filtrarCorreo(e.target.value);
                     setCorreo(value);
                     setErrores((p) => ({ ...p, correo: validarCorreo(value) ?? undefined }));
                  }}
                  className={iCls(errores.correo)}
                  autoFocus
                />
                {errores.correo && (
                  <p className="text-xs text-red-500 mt-1 leading-tight">
                    {errores.correo}
                  </p>
                )}
              </>
            ) : (
              <div className="px-3 py-2.5 rounded-xl border border-border bg-muted text-sm text-foreground font-medium">
                {guardado.correo}
              </div>
            )}
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
              <Phone className="w-3.5 h-3.5" /> Teléfono
            </label>
            {editando ? (
              <>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => {
                    setTelefono(e.target.value);
                    setErrores((p) => ({
                      ...p,
                      telefono: undefined,
                    }));
                  }}
                  className={iCls(errores.telefono)}
                />
                {errores.telefono && (
                  <p className="text-xs text-red-500 mt-1 leading-tight">
                    {errores.telefono}
                  </p>
                )}
              </>
            ) : (
              <div className="px-3 py-2.5 rounded-xl border border-border bg-muted text-sm text-foreground font-medium">
                {guardado.telefono}
              </div>
            )}
          </div>
        </div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex flex-col sm:flex-row gap-3">
          {editando ? (
            <>
              <button
                onClick={() => {
                  setEditando(false);
                  setErrores({});
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button
                onClick={handleGuardar}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 cursor-pointer transition-all"
              >
                <Check className="w-4 h-4" /> Guardar cambios
              </button>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => navigate("catalog")}
                className="flex items-center gap-2 px-5 py-2.5 bg-muted text-foreground rounded-xl text-sm font-semibold hover:bg-border cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Volver al menú
              </button>
              {isStaff && (
                <button
                  onClick={() => navigate(adminHomeScreen)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-semibold hover:bg-primary/20 cursor-pointer transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" /> Ir a Administración
                </button>
              )}
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 cursor-pointer transition-colors sm:ml-auto"
              >
                <LogOut className="w-4 h-4" /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── AUTH LAYOUT ───────────────────────────

/**
 * Fondo comun de TODO el flujo de autenticacion: login, registro y las
 * pantallas de recuperacion / cambio de contrasena (que son los pasos del modal
 * `ForgotPasswordModal`).
 *
 * Antes cada pantalla repetia el `div` raiz y las dos imagenes, asi que cambiar
 * el fondo obligaba a editar N sitios y era facil que se desincronizasen. Ahora
 * el fondo vive aqui una sola vez y cada pantalla aporta solo:
 *
 *   - `contentClassName`: como se coloca la tarjeta (`items-start`,
 *     `justify-center`, `lg:justify-end`, `px-4 py-6 lg:px-8`...).
 *   - `children`: la tarjeta.
 *   - `overlay`: contenido `fixed` que debe quedar por ENCIMA de la tarjeta.
 *
 * `contentClassName` DEBE llevar `lg:justify-end` en escritorio. El ancho de la
 * pizza se calcula sobre el hueco que deja la tarjeta a la izquierda
 * (`100vw - 584px`); si una pantalla centra la tarjeta, la pizza se le mete
 * debajo. Ese hueco esta calibrado para una tarjeta de hasta 512px (los 448px
 * de la de registro entran de sobra), asi que mientras la tarjeta no crezca de
 * 512px el margen sigue siendo correcto.
 *
 * `overlay` va como hermano del wrapper `z-20`, no dentro, a proposito: asi un
 * modal que se abre desde dentro de una pantalla de auth sigue resolviendo su
 * `fixed inset-0 z-50` contra la raiz y no queda atrapado en la pila de la
 * tarjeta. Si se metiera dentro, el modal tendria que subir su `z-index` por
 * encima de 50 para no quedar debajo.
 */
function AuthLayout({
  children,
  overlay,
  contentClassName,
  darkMode,
}: {
  children: React.ReactNode;
  overlay?: React.ReactNode;
  contentClassName: string;
  darkMode: boolean;
}) {
  return (
    <div className="relative min-h-screen bg-muted">
      {/* Fondo unico de TODA la pantalla. Antes eran dos columnas (la foto a la
          izquierda, el formulario a la derecha); ahora el fondo es la imagen
          entera y la tarjeta flota encima, alineada a la derecha.

           `fondoDefinitivo.png` y `fondoDefinitivoNegro.png` (1536x1024, ratio
           1.5) son patrones ilustrados de ingredientes, no fotos: son puramente
           decorativos. Vienen en
          Format24bppRgb, SIN canal alfa, y ningun pixel muestreado baja de
          A250, asi que no puede transparentarse ni dejar ver el `body`.

          Por eso el `bg-muted` del contenedor es solo una red de seguridad para
          el instante en que la imagen aun no ha llegado: son 1.9 MB y se emiten
          como archivo aparte, no inlined. En operacion normal la imagen tapa el
          100% del contenedor y ese color no se ve nunca. Ojo con la tentacion
          de oscurecerlo: el patron es 83.5% casi blanco (luminancia media
          234.3), asi que un respaldo oscuro daria un salto dark->light mas
          fuerte que el blanco que se queria evitar.

          `object-cover` llena los dos ejes, asi que no puede quedar nada sin
          cubrir. El `object-center` es casi una formalidad: el patron es
          uniforme (las nueve regiones de una rejilla 3x3 miden 13-19% de color)
          y su centro de masa esta en (48.9%, 50.5%), o sea centrado. Antes
          llevaba `object-left` porque la foto de la pizza vivia en el 32%
          izquierdo y sin eso se veia la mesa vacia de la derecha; con un
          patron repartido por todo el lienzo eso ya no aplica y `center`
          describe lo que realmente pasa.

          El recorte es el de siempre: con ratio 1.5, a 16:9 y 16:10 manda el
          ancho y se ve el lienzo entero de lado a lado, perdiendo 143px
          verticales a 1366x768 y 200px a 1920x1080; en 4:3 y 5:4 (1024x768,
          1280x1024) manda el alto y se ve el 89% del ancho; en movil vertical
          baja al 31%. Al ser textura repartida, cualquier recorte se ve bien.

           Las tarjetas usan `bg-card` y sus inputs `bg-muted`, por lo que ambos
           adoptan automaticamente los tokens correspondientes al modo activo.
           En claro la separacion depende casi por completo de la sombra
           (`shadow-xl` / `shadow-2xl`), porque el `border-border` es solo
           rgba(0,0,0,0.08).

          El `alt` va vacio a proposito: esto es decorativo y anunciarlo a un
          lector de pantalla es ruido. No se pierde nada porque TODO el texto
          de los formularios esta dentro de las tarjetas, que si se anuncian. */}
      <img
        src={darkMode ? fondoDefinitivoNegro : fondoDefinitivo}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 z-0 w-full h-full object-cover object-center"
      />

      {/* Capa de la pizza, ENTRE el fondo y la tarjeta (`z-10`; el fondo es
          `z-0` y el contenido `z-20`, asi que el orden queda explicito y no
          depende del DOM).

           `pizzaDefinitivaCompleta.png` (612x407) contiene la pizza circular
           completa. Su fondo es transparente (incluidas las esquinas), asi que
           se integra con ambos patrones de fondo sin formar un recuadro blanco.
           El import de `pizzaDefinitiva.png` se conserva por compatibilidad con
           la referencia anterior, pero esta imagen ya no se utiliza.

           El ancho conserva el calculo sobre el hueco disponible junto a la
           tarjeta, con un factor intermedio de `1.55` y un tope de `115vh`.
           `left-[1vw]` separa la pizza del borde izquierdo ahora que ya no hace
           falta ocultar un corte recto. `max-w-none` evita que el preflight de
           Tailwind limite el lienzo de la imagen.

          `pointer-events-none` porque el lienzo transparente se extiende por
          debajo de la tarjeta y sin esto bloquearia los clics;
          `draggable={false}` para que no aparezca la imagen fantasma al
          arrastrar. `hidden lg:block` porque bajo 1024px la tarjeta es de ancho
          completo y no hay hueco: ahi se ve solo el patron. Sin blur, sin scale,
          sin opacity, a plena intensidad como el fondo. */}
      <img
        src={pizzaDefinitivaCompleta}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute left-[1vw] top-1/2 z-10 hidden w-[min(calc((100vw_-_584px)*1.55),115vh)] max-w-none -translate-y-1/2 select-none lg:block"
      />

      {/* Capa del contenido, la mas alta de las tres (`z-20`; fondo `z-0` y
          pizza `z-10`). Antes de la capa de la pizza esto era `z-10` y el orden
          del DOM ya bastaba, pero con tres capas superpuestas queda explicito y
          no depende de que alguien reordene el JSX.

          `min-h-screen` y no `h-screen`: asi la pagina hace scroll normal
          cuando la tarjeta no cabe, en vez de recortarse, y el fondo se estira
          acompanando. */}
      <div className={`relative z-20 flex min-h-screen ${contentClassName}`}>
        {children}
      </div>

      {overlay}
    </div>
  );
}

// ─────────────────────────── LOGIN ───────────────────────────

function LoginScreen({
  navigate,
  onLogin,
  usuarios,
  darkMode,
  loginNotice,
}: {
  navigate: (s: Screen) => void;
  onLogin: (user: Usuario) => void;
  usuarios: Usuario[];
  darkMode: boolean;
  loginNotice?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [showForgot, setShowForgot] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    e.email = validarCorreo(email) ?? undefined;
    e.password = password ? undefined : "La contraseña es obligatoria";
    console.log("[login] resultado de validación", {
      email: email.trim().toLowerCase(),
      valido: !e.email && !e.password,
      errores: e,
    });
    setErrors(e);
    return !e.email && !e.password;
  };

  const handleLogin = () => {
    console.log("[login] inicio del submit", { email, passwordPresent: Boolean(password) });
    if (!validate()) {
      console.log("[login] submit detenido por validación");
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    console.log("[login] correo normalizado", trimmedEmail);

    // Look up against the local user directory.
    const user = usuarios.find(u => u.correo.trim().toLowerCase() === trimmedEmail);
    console.log("[login] usuario encontrado", user ? {
      id: user.id,
      correo: user.correo,
      rolId: user.rolId,
      activo: user.activo,
    } : null);

    if (!user) {
      console.log("[login] credenciales inválidas: usuario no encontrado");
      setErrors({
        email: "Credenciales incorrectas",
        password: "Verifica tu correo y contraseña",
      });
      return;
    }

    if (!user.activo) {
      console.log("[login] credenciales rechazadas: cuenta inactiva");
      setErrors({
        email: "Credenciales incorrectas",
        password: "Verifica tu correo y contraseña",
      });
      toast.error("Tu cuenta está inactiva. Contacta al administrador.");
      return;
    }

    // All system users share the password "123456"
    if (password !== "123456") {
      console.log("[login] credenciales inválidas: contraseña incorrecta");
      setErrors({
        email: "Credenciales incorrectas",
        password: "Verifica tu correo y contraseña",
      });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      console.log("[login] credenciales correctas; llamando a onLogin", {
        id: user.id,
        correo: user.correo,
        rolId: user.rolId,
      });
      // Navigation and session state are handled by App.tsx.
      onLogin(user);
      const firstName = user.nombre.split(" ")[0];
      toast.success(`¡Bienvenid${user.nombre.split(" ")[0].endsWith("a") ? "a" : "o"}, ${firstName}!`, {
        description: "Has ingresado correctamente.",
      });
    }, 1500);
  };

  return (
    <AuthLayout
      contentClassName="items-start justify-center lg:justify-end px-4 py-6 lg:px-8"
      darkMode={darkMode}
      overlay={
        <AnimatePresence>
          {showForgot && (
            <ForgotPasswordModal onClose={() => setShowForgot(false)} />
          )}
        </AnimatePresence>
      }
    >
      {/* Contenido del login. El fondo, la pizza y el `z-index` de esta capa
          viven en `AuthLayout` (mas arriba): aqui solo va la tarjeta y las
          clases de posicionamiento que se le pasan en `contentClassName`.

          `items-start` + `my-auto` en la tarjeta en vez de `items-center`: con
          el centrado clasico de flex, una tarjeta mas alta que la pantalla se
          empuja hacia arriba y la flecha de volver queda recortada sin forma de
          llegar a ella. Con `my-auto` los margenes automaticos absorben el
          espacio sobrante (centrado) y valen 0 cuando no hay, dejando la
          tarjeta arriba y todo accesible con scroll.

          `lg:justify-end` manda la tarjeta a la derecha en escritorio; por
          debajo de 544px la tarjeta es de ancho completo, asi que ahi el
          `justify-center` no se nota. `px-4 lg:px-8` son los margenes.

          OJO: el fondo no es solo decorativo aqui, porque el ancho de la pizza
          se calcula sobre el hueco que deja la tarjeta (`100vw - 584px`).
          Quitar el `lg:justify-end` haria que la pizza se le metiera debajo de
          la tarjeta en pantallas anchas. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative my-auto bg-card rounded-2xl shadow-xl border border-border w-full max-w-lg p-5"
      >
        <button
          onClick={() => navigate("landing")}
          title="Volver al inicio"
          className="absolute top-5 left-5 p-2.5 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      <div className="text-center mb-4">
        <img src={darkMode ? logoBlanco : logoClaro} alt="S.I.V.PRO Logo" className="h-14 w-auto object-contain mx-auto mb-2" />

          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            Bienvenido a La Sirena
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ingresa tus datos para continuar
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleLogin();
          }}
        >
        <div className="space-y-2.5 mb-3">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              Correo electrónico
            </label>
            <input
              value={email}
              onChange={(e) => {
                 const value = filtrarCorreo(e.target.value);
                 setEmail(value);
                 setErrors((p) => ({ ...p, email: validarCorreo(value) ?? undefined }));
              }}
              type="email"
              placeholder="gloria@lasirena.com"
              className={`w-full px-4 py-2 bg-muted rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.email ? "border-red-400 bg-red-50/30" : "border-border"}`}
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1 ml-0.5 leading-tight">
                {errors.email}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              Contraseña
            </label>
            <PasswordField
              value={password}
               onChange={(v) => {
                 setPassword(v);
                 setErrors((p) => ({
                   ...p,
                   password: v ? undefined : "La contraseña es obligatoria",
                 }));
               }}
              placeholder="••••••••"
              autoComplete="current-password"
              cls={`w-full px-4 py-2 bg-muted rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.password ? "border-red-400 bg-red-50/30" : "border-border"}`}
            />
            {errors.password && (
              <p className="text-xs text-red-500 mt-1 ml-0.5 leading-tight">
                {errors.password}
              </p>
            )}
          </div>
          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-sm text-primary font-medium hover:underline cursor-pointer"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>

        <PrimaryBtn
          type="submit"
          size="md"
          className="w-full mb-3"
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : null}
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </PrimaryBtn>
        </form>

        {loginNotice && (
          <p className="text-center text-sm font-semibold text-red-600 mb-3">
            Debes iniciar sesión para poder hacer un pedido.
          </p>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {"¿No tienes cuenta? "}
          <button
            onClick={() => navigate("register")}
            className="text-primary font-semibold hover:underline cursor-pointer"
          >
            Regístrate aquí
          </button>
        </p>
      </motion.div>
    </AuthLayout>
  );
}

function ForgotPasswordModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [step, setStep] = useState<
    "email" | "code" | "password" | "done"
  >("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [onClose]);

  const startCooldown = () => {
    setResendCooldown(30);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendCode = () => {
    const err = validarCorreo(forgotEmail);
    setErrores(err ? { forgotEmail: err } : {});
    if (err) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("code");
      toast.success("Código enviado a " + forgotEmail);
      startCooldown();
    }, 1200);
  };

  const resendCode = () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Código reenviado a " + forgotEmail);
      startCooldown();
    }, 1000);
  };

  const verifyCode = () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      setErrores({ code: "Ingresa el código completo" });
      return;
    }
    setErrores({});
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("password");
    }, 1000);
  };

  const changePassword = () => {
    const errs: Record<string, string> = {};
    const passwordError = validarContrasena(newPass);
    if (passwordError) errs.newPass = passwordError;
    if (newPass !== confirm) errs.confirm = "Las contraseñas no coinciden";
    setErrores(errs);
    if (Object.values(errs).some(Boolean)) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("done");
    }, 1200);
  };

  const handleCodeInput = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[i] = val;
    setCode(next);
    if (errores.code) setErrores((p) => ({ ...p, code: "" }));
    if (val && i < 5) {
      document.getElementById(`otp-${i + 1}`)?.focus();
    }
  };

  const handleCodeKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      document.getElementById(`otp-${i - 1}`)?.focus();
    }
  };

  return (
      <div
        className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/35 backdrop-blur-sm"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="relative my-auto bg-card rounded-2xl shadow-2xl border border-border w-full max-w-sm p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar recuperación de contraseña"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        {/* ── Paso 1: Correo ── */}
        {step === "email" && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <h2
                className="text-xl font-bold text-foreground"
                style={{ fontFamily: SERIF }}
              >
                ¿Olvidaste tu contraseña?
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Ingresa tu correo y te enviaremos un código de
                verificación.
              </p>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Correo electrónico
              </label>
              <input
                value={forgotEmail}
                onChange={(e) => {
                   const value = filtrarCorreo(e.target.value);
                   setForgotEmail(value);
                   setErrores((p) => ({ ...p, forgotEmail: validarCorreo(value) ?? "" }));
                }}
                type="email"
                placeholder="gloria@lasirena.com"
                className={inputCls(errores.forgotEmail)}
              />
              <MensajeError err={errores.forgotEmail} />
            </div>
            <button
              onClick={sendCode}
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 mb-3"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : null}
              {loading ? "Enviando..." : "Enviar código"}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              Volver al inicio de sesión
            </button>
          </>
        )}

        {/* ── Paso 2: Solo código OTP ── */}
        {step === "code" && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <h2
                className="text-xl font-bold text-foreground"
                style={{ fontFamily: SERIF }}
              >
                Código enviado
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Ingresa el código de 6 dígitos enviado a{" "}
                <strong className="text-foreground">
                  {forgotEmail}
                </strong>
              </p>
            </div>
            <div className="flex justify-center gap-2 mb-6 flex-wrap">
              {code.map((c, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  value={c}
                  onChange={(e) =>
                    handleCodeInput(i, e.target.value)
                  }
                  onKeyDown={(e) => handleCodeKey(i, e)}
                  maxLength={1}
                  inputMode="numeric"
                  className={`w-10 h-12 text-center text-lg font-bold bg-muted rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground ${
                    errores.code ? "border-red-400 bg-red-50/30" : "border-border"
                  }`}
                />
              ))}
            </div>
            <div className="-mt-4 mb-4">
              <MensajeError err={errores.code} />
            </div>
            <button
              onClick={verifyCode}
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 mb-3"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : null}
              {loading ? "Verificando..." : "Verificar código"}
            </button>
            <button
              onClick={resendCode}
              disabled={resendCooldown > 0 || loading}
              className="w-full py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-60 mb-0.5"
            >
              {resendCooldown > 0
                ? `Reenviar en 00:${String(resendCooldown).padStart(2, "0")}`
                : "Reenviar código"}
            </button>
            <button
              onClick={() => setStep("email")}
              className="w-full py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              ← Ingresar otro correo
            </button>
          </>
        )}

        {/* ── Paso 3: Nueva contraseña ── */}
        {step === "password" && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <h2
                className="text-xl font-bold text-foreground"
                style={{ fontFamily: SERIF }}
              >
                Nueva contraseña
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Elige una contraseña segura para tu cuenta.
              </p>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Nueva contraseña
                </label>
                <PasswordField
                  value={newPass}
                  onChange={(v) => {
                    setNewPass(v);
                    if (errores.newPass)
                      setErrores((p) => ({ ...p, newPass: "" }));
                  }}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  cls={inputCls(errores.newPass)}
                />
                <MensajeError err={errores.newPass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Confirmar contraseña
                </label>
                <PasswordField
                  value={confirm}
                  onChange={(v) => {
                    setConfirm(v);
                    if (errores.confirm)
                      setErrores((p) => ({ ...p, confirm: "" }));
                  }}
                  placeholder="Repite tu contraseña"
                  autoComplete="new-password"
                  cls={inputCls(errores.confirm)}
                />
                <MensajeError err={errores.confirm} />
              </div>
            </div>
            <button
              onClick={changePassword}
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 mb-3"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : null}
              {loading ? "Cambiando..." : "Cambiar contraseña"}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              Volver a iniciar sesión
            </button>
          </>
        )}

        {/* ── Paso 4: Éxito ── */}
        {step === "done" && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2
              className="text-xl font-bold text-foreground mb-2"
              style={{ fontFamily: SERIF }}
            >
              ¡Contraseña actualizada!
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Tu contraseña fue cambiada exitosamente. Ya puedes
              iniciar sesión.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
            >
              Ir a iniciar sesión
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─────────────────────────── REGISTER ───────────────────────────

const DOC_OPTIONS = [
  { code: "CC",  label: "CC · Cédula de Ciudadanía" },
  { code: "CE",  label: "CE · Cédula de Extranjería" },
  { code: "PP",  label: "PP · Pasaporte" },
];

const AVATAR_PALETTE = [
  "bg-red-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
];

function RegisterScreen({
  navigate,
  usuarios,
  setUsuarios,
  empleados,
  clientes,
  darkMode,
}: {
  navigate: (s: Screen) => void;
  usuarios: Usuario[];
  setUsuarios: React.Dispatch<React.SetStateAction<Usuario[]>>;
  empleados: Empleado[];
  clientes: Cliente[];
  darkMode: boolean;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    docType: "CC",
    docNum: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const setVal =
    (k: keyof typeof form) =>
    (v: string) => {
      const value = k === "email" ? filtrarCorreo(v) : k === "name" ? filtrarNombre(v) : v;
      setForm((p) => ({ ...p, [k]: value }));
      setErrores((prev) => {
        const next = { ...prev };
        if (k === "email") next.email = validarCorreo(value) ?? "";
        if (k === "phone") next.phone = value ? validarTelefono(value) ?? "" : "";
        if (k === "docNum") next.docNum = value ? validarDocumento(value, form.docType) ?? "" : "";
        if (k === "password") next.password = value ? validarContrasena(value) ?? "" : "";
        if (k === "confirm") next.confirm = value ? value === form.password ? "" : "Las contraseñas no coinciden" : "";
        if (k === "name") next.name = validarNombre(value) ?? "";
        return next;
      });
    };
  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setVal(k)(e.target.value);
  // Igual que `set`, pero dejando solo dígitos: el teléfono nunca debe poder
  // guardar letras ni símbolos aunque se peguen desde el portapapeles.
  const setDigitos =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setVal(k)(soloDigitos(e.target.value));

  const register = () => {
    const errs: Record<string, string> = {};

    if (!form.name.trim()) errs.name = "El nombre completo es obligatorio";
    else errs.name = validarNombre(form.name) ?? undefined;
    if (!form.email) errs.email = "El correo electrónico es obligatorio";
    else errs.email = validarCorreo(form.email) ?? undefined;
    if (!form.phone) errs.phone = "El número de teléfono es obligatorio";
    else if (!/^3\d{9}$/.test(form.phone)) errs.phone = "Debe tener 10 dígitos y comenzar por 3";
    if (!form.docType) errs.docType = "Selecciona el tipo de documento";

    const docTrim = form.docNum.trim();
    if (!docTrim) errs.docNum = "El número de documento es obligatorio";
    else if (form.docType === "CC" && !/^\d{6,10}$/.test(docTrim))
      errs.docNum = "La CC debe tener entre 6 y 10 dígitos";
    else errs.docNum = validarDocumento(docTrim, form.docType) ?? undefined;

    if (!errs.docNum) {
      const clave = `${form.docType}||${docTrim}`.toLowerCase();

      const docDuplicado =
        usuarios.some(u => `${u.tipoDocumento}||${u.numeroDocumento}`.toLowerCase() === clave) ||
        empleados.some(e => `${e.tipoDocumento}||${e.numeroDocumento}`.toLowerCase() === clave) ||
        clientes.some(c => `${c.tipoDocumento}||${c.numeroDocumento}`.toLowerCase() === clave);
      if (docDuplicado) errs.docNum = "Este documento ya está registrado";
    }

    if (!errs.email) {
      const em = form.email.trim().toLowerCase();
      const correoDuplicado =
        usuarios.some(u => u.correo.trim().toLowerCase() === em) ||
        empleados.some(e => e.correo.trim().toLowerCase() === em) ||
        clientes.some(c => c.correo.trim().toLowerCase() === em);
      if (correoDuplicado) errs.email = "Este correo ya está registrado";
    }

    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password))
      errs.password = "Usa 8 caracteres, mayúscula, minúscula y número";
    if (form.password !== form.confirm)
      errs.confirm = "Las contraseñas no coinciden";

    setErrores(errs);
    if (Object.values(errs).some(Boolean)) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const maxId = usuarios.reduce((max, u) => {
        const n = parseInt(u.id.replace("USR-", ""), 10);
        return Number.isNaN(n) ? max : Math.max(max, n);
      }, 0);
      const nameParts = form.name.trim().split(/\s+/);
      const iniciales =
        (nameParts.length > 1
          ? (nameParts[0][0] ?? "") + (nameParts[1][0] ?? "")
          : nameParts[0].slice(0, 2)
        ).toUpperCase();
      const nuevoUsuario: Usuario = {
        id: "USR-" + (maxId + 1),
        nombre: form.name.trim(),
        iniciales,
        avatarColor: AVATAR_PALETTE[usuarios.length % AVATAR_PALETTE.length],
        correo: form.email.trim().toLowerCase(),
        telefono: form.phone.trim(),
        tipoDocumento: form.docType,
        numeroDocumento: form.docNum.trim(),
        rolId: "ROL-002",
        activo: true,
      };
       setUsuarios(p => [...p, nuevoUsuario]);
       toast.success(
        "¡Cuenta creada exitosamente! Ya puedes ingresar.",
      );
      navigate("login");
     }, 1500);
   };

   const registerInvalid =
     Boolean(validarNombre(form.name)) ||
     Boolean(validarCorreo(form.email)) ||
     Boolean(validarTelefono(form.phone)) ||
     Boolean(validarDocumento(form.docNum, form.docType)) ||
     Boolean(validarContrasena(form.password)) ||
     !form.confirm ||
     form.password !== form.confirm;

   return (
    <AuthLayout contentClassName="items-start justify-center px-4 py-4 lg:justify-end lg:px-8 lg:py-0" darkMode={darkMode}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-auto bg-card rounded-2xl shadow-xl border border-border w-full max-w-md p-4"
      >
        <div className="text-center mb-2">
          {/* El logo va exactamente igual que en Login (`h-14`,
              `mb-2`): mismo tratamiento visual en las dos pantallas de auth. */}
          <img src={darkMode ? logoBlanco : logoClaro} alt="S.I.V.PRO Logo" className="h-14 w-auto object-contain mx-auto mb-2" />

          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            Crear cuenta
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Completa tus datos para registrarte
          </p>
        </div>

        {/* Grid y no `space-y`: hace falta para que "Correo electronico" y
            "Telefono" compartan fila y el formulario quepa sin scroll a
            1366x768. El flag `full` de cada descriptor marca los campos que
            ocupan las 2 columnas; en movil (<640px) el grid cae a 1 columna y
            todo se apila igual que antes. */}
        <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2 mb-1">
          <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3">
            <div className="sm:w-48 sm:shrink-0">
              <label className="block text-sm font-semibold mb-1 text-foreground">
                Tipo doc.
              </label>
              <select
                value={form.docType}
                onChange={(e) => {
                  setForm((p) => ({ ...p, docType: e.target.value }));
                  if (form.docNum) {
                     setErrores((p) => ({ ...p, docNum: form.docNum ? validarDocumento(form.docNum, e.target.value) ?? "" : "" }));
                  }
                  if (errores.docType) setErrores((p) => ({ ...p, docType: "" }));
                }}
                className={inputCls(errores.docType, "cursor-pointer")}
              >
                {DOC_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <MensajeError err={errores.docType} />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold mb-1 text-foreground">
                Número de documento
              </label>
              <input
                value={form.docNum}
                 onChange={(e) => setVal("docNum")(filtrarDocumento(e.target.value, form.docType))}
                type="text"
                 inputMode="numeric"
                 placeholder="Ej: 12345678"
                className={inputCls(errores.docNum)}
              />
              <MensajeError err={errores.docNum} />
            </div>
          </div>
          {[

            {
              label: "Nombre completo",
              key: "name" as const,
              placeholder: "Gloria Muñoz",
              type: "text",
              full: true,
            },
            {
              label: "Correo electrónico",
              key: "email" as const,
              placeholder: "gloria@lasirena.com",
              type: "email",
            },
            {
              label: "Teléfono",
              key: "phone" as const,
              placeholder: "3101234567",
              type: "tel",
              numeric: true,
            },
            {
              label: "Contraseña",
              key: "password" as const,
               placeholder: "Mínimo 8 caracteres",
              type: "password",
              full: true,
            },
            {
              label: "Confirmar contraseña",
              key: "confirm" as const,
              placeholder: "Repite tu contraseña",
              type: "password",
              full: true,
            },
          ].map(({ label, key, placeholder, type, numeric, full }) => (
            <div key={key} className={full ? "sm:col-span-2 min-w-0" : "min-w-0"}>
              <label className="block text-sm font-semibold mb-1 text-foreground">
                {label}
              </label>
              {type === "password" ? (
                <PasswordField
                  value={form[key]}
                  onChange={setVal(key)}
                  placeholder={placeholder}
                  autoComplete="new-password"
                  cls={inputCls(errores[key])}
                />
              ) : (
                <input
                  value={form[key]}
                  onChange={numeric ? setDigitos(key) : set(key)}
                  type={type}
                  inputMode={numeric ? "numeric" : undefined}
                  placeholder={placeholder}
                  className={inputCls(errores[key])}
                />
              )}
              <MensajeError err={errores[key]} />
            </div>
          ))}
        </div>

        <PrimaryBtn
          onClick={register}
          size="md"
          className="w-full mb-1"
           disabled={loading || registerInvalid || Object.values(errores).some(Boolean)}
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </PrimaryBtn>

        <p className="text-center text-sm text-muted-foreground">
          {"¿Ya tienes cuenta? "}
          <button
            onClick={() => navigate("login")}
            className="text-primary font-semibold hover:underline cursor-pointer"
          >
            Ingresar
          </button>
        </p>
      </motion.div>
    </AuthLayout>
  );
}
// ─────────────────────────── DASHBOARD ───────────────────────────

function DashboardScreen({
  navigate,
  ventas,
  loggedInUser,
  loggedInRoleName,
  tieneRolActivo,
  isNamedAdmin,
  hasDashboardAccess,
  accesos,
}: {
  navigate: (s: Screen) => void;
  ventas: Venta[];
  loggedInUser: { nombre: string } | null;
  loggedInRoleName: string;
  // false = el rol fue borrado, está desactivado o el usuario no tiene rol.
  // Distingue "no tienes permisos" de "ya no existe tu rol".
  tieneRolActivo: boolean;
  isNamedAdmin: boolean;
  hasDashboardAccess: boolean;
  accesos: AccesosMap;
}) {
  const firstName = (loggedInUser?.nombre ?? "Gloria").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const dateStr = new Date().toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const horaVenta = (venta: Venta) =>
    venta.historial?.[venta.historial.length - 1]?.hora ?? venta.horaRecogida ?? "Sin hora";
  const minutosHora = (hora: string) => {
    const match = hora.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return 0;
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3]?.toUpperCase();
    if (period === "PM" && hour < 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return hour * 60 + minute;
  };
  const ventasRecientes = ventas
    .map((venta, index) => ({ venta, index }))
    .sort((a, b) => {
      const porFecha = b.venta.fecha.localeCompare(a.venta.fecha);
      if (porFecha !== 0) return porFecha;
      const porHora = minutosHora(horaVenta(b.venta)) - minutosHora(horaVenta(a.venta));
      return porHora !== 0 ? porHora : a.index - b.index;
    })
    .slice(0, 5)
    .map(({ venta }) => venta);

  const [periodoDashboard, setPeriodoDashboard] = useState<"Día" | "Mes" | "Año">("Mes");
  const clientesTop = Object.values(
    ventas.reduce<Record<string, { nombre: string; pedidos: number; total: number }>>((acc, venta) => {
      const nombre = venta.usuario?.trim() || "Venta general";
      const actual = acc[nombre] ?? { nombre, pedidos: 0, total: 0 };
      actual.pedidos += 1;
      actual.total += venta.total;
      acc[nombre] = actual;
      return acc;
    }, {}),
  ).sort((a, b) => b.pedidos - a.pedidos || b.total - a.total).slice(0, 10);

  const productosTop = Object.values(
    ventas.flatMap(venta => venta.detalle ?? []).reduce<Record<string, { nombre: string; vendidos: number }>>((acc, detalle) => {
      const actual = acc[detalle.nombre] ?? { nombre: detalle.nombre, vendidos: 0 };
      actual.vendidos += detalle.cantidad;
      acc[detalle.nombre] = actual;
      return acc;
    }, {}),
  ).sort((a, b) => b.vendidos - a.vendidos).slice(0, 10);

  const ventasPorDia = Object.values(
    ventas.reduce<Record<string, { fecha: string; ventas: number }>>((acc, venta) => {
      const fecha = venta.fecha || "Sin fecha";
      acc[fecha] = { fecha, ventas: (acc[fecha]?.ventas ?? 0) + venta.total };
      return acc;
    }, {}),
  ).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(-31);

  // ÚNICA regla de acceso de la app. Antes había dos: `canSee` (con atajo por
  // nombre de rol) y `tieneVer` (sin atajo), y cada una servía a una capa
  // distinta — menú y rutas usaban una, los KPIs del Dashboard la otra. Por eso
  // un admin podía tener control total en la navegación y al mismo tiempo ver
  // el badge de "no sos administrador". Ahora las dos capas llaman a esto.
  const puedeVer = (permKey: string) =>
    hasDashboardAccess || isNamedAdmin || (accesos[permKey]?.includes("Ver") ?? false);

  // Granular flags, one per sub-opción del sistema.
  // Se construyen con KEY() para que un renombrado en MENU_TREE rompa aquí
  // explícitamente en vez de fallar en silencio.
  const cv  = puedeVer(KEY("Ventas",      "Ventas"));
  const ccl = puedeVer(KEY("Ventas",      "Clientes"));
  const ci  = puedeVer(KEY("Compras",     "Insumos"));
  const cpr = puedeVer(KEY("Compras",     "Proveedores"));
  const coc = puedeVer(KEY("Compras",     "Orden de Compra"));
  const cco = puedeVer(KEY("Compras",     "Compra"));
  const cp  = puedeVer(KEY("Producción",  "Productos"));
  const ccp = puedeVer(KEY("Producción",  "Categoría de Producto"));
  const cop = puedeVer(KEY("Producción",  "Orden de Producción"));
  const cpe = puedeVer(KEY("Producción",  "Producto No Conforme"));
  const ccfg = puedeVer(KEY("Configuración", "Roles"));
  const cus  = puedeVer(KEY("Configuración", "Usuarios"));
  const cemp = puedeVer(KEY("Producción", "Empleados"));
  // El contenido de ventas depende únicamente del permiso de Ventas.
  const vePanelCompleto = hasDashboardAccess || cv;

  // noAccess: true only when the user cannot see ANY sub-opción. La condición
  // por nombre de rol sobra: el administrador original tiene fullAccesos(), así
  // que `.every(v => !v)` ya da false sin necesidad de exceptuarlo.
  const noAccess =
    [cv, ccl, ci, cpr, coc, cco, cp, ccp, cop, cpe, ccfg, cus, cemp].every(v => !v);

  // KPIs — cada uno ligado a su sub-opción
  type KpiDef = { label: string; value: string; sub: string; Icon: any; bg: string; ic: string; trend: string };
  const kpis: KpiDef[] = [
    cv           && { label: "Ventas registradas", value: String(ventas.length), sub: "Total acumulado", Icon: ShoppingBag, bg: "bg-blue-50", ic: "text-blue-600", trend: "" },
    cv           && { label: "Ingresos hoy", value: "$1.248.000", sub: "Meta: $1.500.000",       Icon: DollarSign,  bg: "bg-emerald-50", ic: "text-emerald-600", trend: "+8%"  },
    cp  && { label: "Productos activos",   value: "5",          sub: "1 en pausa",              Icon: Package,       bg: "bg-orange-50",  ic: "text-orange-600",  trend: ""     },
    ci  && { label: "Insumos críticos",    value: "3",          sub: "Stock bajo mínimo",       Icon: AlertTriangle, bg: "bg-red-50",     ic: "text-red-600",     trend: ""     },
    cpr && { label: "Proveedores activos", value: "8",          sub: "2 con pedido pendiente",  Icon: Truck,         bg: "bg-violet-50",  ic: "text-violet-600",  trend: ""     },
    cop && { label: "Órdenes en curso",    value: "4",          sub: "1 retrasada",             Icon: ClipboardList, bg: "bg-sky-50",     ic: "text-sky-600",     trend: ""     },
  ].filter(Boolean) as KpiDef[];

  // Accesos rápidos — cada uno ligado a su sub-opción
  type ActionDef = { label: string; Icon: any; screen: Screen };
  const quickActions: ActionDef[] = [
    cv  && { label: "Ventas",         Icon: ShoppingBag,   screen: "ventas-pedidos"    as Screen },
    ccl && { label: "Clientes",       Icon: Users,          screen: "clientes"          as Screen },
    cp  && { label: "Productos",      Icon: Package,        screen: "gestion-productos" as Screen },
    ci  && { label: "Insumos",        Icon: Archive,        screen: "supplies"          as Screen },
    cpr && { label: "Proveedores",    Icon: Truck,          screen: "suppliers"         as Screen },
    coc && { label: "Orden de Compra", Icon: ClipboardList, screen: "orden-compra"      as Screen },
    cop && { label: "Producción",     Icon: Layers,         screen: "production-orders" as Screen },
    ccfg && { label: "Roles", Icon: Settings,       screen: "gestion-roles"    as Screen },
    cus  && { label: "Usuarios",      Icon: Users,          screen: "users"             as Screen },
    cemp && { label: "Empleados",     Icon: IdCard,         screen: "empleados"         as Screen },
  ].filter(Boolean) as ActionDef[];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
          ¡{greeting}, {firstName}! 👋
        </h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-muted-foreground capitalize">{dateStr}</p>
          {!vePanelCompleto && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {tieneRolActivo ? loggedInRoleName : "sin rol"}
            </span>
          )}
        </div>
      </div>

      {/* Full Dashboard shows the chart for all modules; filtered Inicio only
          shows it when Ventas is allowed. */}
      {(hasDashboardAccess || cv) && (
        <div
          onClick={() => navigate("sales-chart")}
          className="bg-card border border-border rounded-2xl p-5 mb-7 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
        >
          <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
                Ventas hoy — 4pm a 10pm
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">34 productos vendidos hoy</p>
            </div>
            <span className="text-primary text-sm font-semibold flex items-center gap-1 group-hover:underline">
              Ver detalle por semana <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={HOURLY_TODAY} barSize={22} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
              <XAxis dataKey="hora" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip content={({ active, payload, label }: any) =>
                active && payload?.length ? (
                  <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
                    <p className="font-semibold text-muted-foreground mb-0.5">{label}</p>
                    <p className="font-bold text-foreground">{payload[0].value} productos</p>
                  </div>
                ) : null
              } />
              <Bar
                dataKey="ventas"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
                shape={(props: any) => {
                  const { x, y, width, height, index } = props;
                  const fill = index === HOURLY_TODAY.length - 1 ? "#ef5350" : "#C62828";
                  return <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />;
                }}
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-muted-foreground mt-2 text-right">
            Última barra = hora en curso · clic para ver ventas y compras
          </p>
        </div>
      )}

      {(hasDashboardAccess || cv) && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
              Indicadores comerciales
            </h2>
            <select
              value={periodoDashboard}
              onChange={event => setPeriodoDashboard(event.target.value as typeof periodoDashboard)}
              className="px-3 py-2 rounded-xl border border-border bg-card text-sm text-foreground cursor-pointer"
            >
              <option>Día</option>
              <option>Mes</option>
              <option>Año</option>
            </select>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-7">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground mb-1" style={{ fontFamily: SERIF }}>
                Top clientes: pedidos vs. valor comprado
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Datos disponibles en ventas locales</p>
              {clientesTop.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No hay datos de clientes</div>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={clientesTop} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="nombre" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={55} />
                    <YAxis yAxisId="pedidos" allowDecimals={false} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="total" orientation="right" hide />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="pedidos" dataKey="pedidos" name="Pedidos" fill="#C62828" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="total" dataKey="total" name="Valor comprado" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground mb-1" style={{ fontFamily: SERIF }}>
                Top productos más vendidos
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Unidades vendidas por producto</p>
              {productosTop.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No hay productos vendidos</div>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={productosTop} layout="vertical" margin={{ left: 15, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="nombre" width={110} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="vendidos" name="Unidades" fill="#2563EB" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground mb-1" style={{ fontFamily: SERIF }}>
                Comportamiento de ventas
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Periodo seleccionado: {periodoDashboard}</p>
              {ventasPorDia.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No hay ventas registradas</div>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={ventasPorDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="ventas" name="Ventas" stroke="#16A34A" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground mb-1" style={{ fontFamily: SERIF }}>
                Compras, proveedores y no conformes
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Se mostrarán cuando existan registros locales en estos módulos.</p>
              <div className="h-48 flex items-center justify-center rounded-xl bg-muted/40 text-sm text-muted-foreground text-center px-6">
                No hay datos suficientes para generar estas series.
              </div>
            </div>
          </div>
        </>
      )}

      {/* KPIs */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map(({ label, value, sub, Icon, bg, ic, trend }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                  <Icon className={`w-5 h-5 ${ic}`} />
                </div>
                {trend && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {trend}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground mb-0.5" style={{ fontFamily: MONO }}>{value}</p>
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      {quickActions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Accesos rápidos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {quickActions.map(({ label, Icon, screen }) => (
              <button
                key={label}
                onClick={() => navigate(screen)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl font-semibold text-sm bg-card border border-border text-foreground hover:bg-muted hover:border-primary/30 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <Icon className="w-5 h-5 text-primary" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Últimas ventas — Ventas::Ventas */}
      {cv && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Últimas ventas</h2>
            <button
              onClick={() => navigate("orders")}
              className="text-primary text-sm font-semibold hover:underline cursor-pointer flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                <tr>
                  {["Cliente", "Monto", "Hora"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ventasRecientes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No hay ventas registradas todavía
                    </td>
                  </tr>
                ) : (
                  ventasRecientes.map((venta) => (
                    <tr key={venta.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5 text-sm text-foreground">
                        {venta.usuario?.trim() || "Venta general"}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>
                        {fmt(venta.total)}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">{horaVenta(venta)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {noAccess && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">
            {tieneRolActivo ? "Sin módulos asignados" : "Sin rol asignado"}
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">
            {tieneRolActivo ? (
              <>Tu rol <span className="font-semibold">{loggedInRoleName}</span> aún no tiene permisos configurados. Contacta al administrador.</>
            ) : (
              <>Tu usuario no tiene un rol activo: fue eliminado o está desactivado. Pide al administrador que te asigne uno para poder trabajar.</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── MANAGE PRODUCTS ───────────────────────────

function ManageProductsScreen() {
  const [products, setProducts] = useState(PRODUCTS);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("todos");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editP, setEditP] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [newP, setNewP] = useState({
    name: "",
    cat: "Pizzas",
    price: "",
  });

  const PER = 5;
  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (statusF === "todos" || p.status === statusF) &&
          (search === "" ||
            p.name
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [products, search, statusF],
  );

  const paged = filtered.slice((page - 1) * PER, page * PER);
  const totalPages = Math.ceil(filtered.length / PER);

  const del = (id: number) => {
    setProducts((p) => p.filter((x) => x.id !== id));
    setDeleteId(null);
    toast.success("Producto eliminado correctamente");
  };

  const changeStatus = (id: number, s: Product["status"]) => {
    setProducts((p) =>
      p.map((x) => (x.id === id ? { ...x, status: s } : x)),
    );
    toast.success("Estado actualizado");
  };

  const save = () => {
    if (!editP) return;
    setProducts((p) =>
      p.map((x) => (x.id === editP.id ? editP : x)),
    );
    setEditP(null);
    toast.success("Producto actualizado correctamente");
  };

  const create = () => {
    if (!newP.name || !newP.price) {
      toast.error("Completa el nombre y el precio");
      return;
    }
    const prod: Product = {
      id: Date.now(),
      name: newP.name,
      description: "Nueva pizza artesanal de La Sirena.",
      price: Number(newP.price),
      image:
        "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600&h=600&fit=crop&auto=format",
      category: newP.cat,
      sizes: [
        {
          label: "Personal (25 cm)",
          price: Number(newP.price),
        },
      ],
      extras: [],
      status: "disponible",
      rating: 0,
      sales: 0,
    };
    setProducts((p) => [prod, ...p]);
    setCreating(false);
    setNewP({ name: "", cat: "Clásicas", price: "" });
    toast.success(`¡Producto "${prod.name}" creado!`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            Gestión de productos
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {products.length} productos en total
          </p>
        </div>
        <PrimaryBtn onClick={() => setCreating(true)} size="md">
          <Plus className="w-4 h-4" /> Nuevo producto
        </PrimaryBtn>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar producto..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground text-sm"
          />
        </div>
        <select
          value={statusF}
          onChange={(e) => {
            setStatusF(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none cursor-pointer"
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="agotado">Agotados</option>
          <option value="pausado">Pausados</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {[
                  "Producto",
                  "Categoría",
                  "Precio base",
                  "Estado",
                  "Ventas",
                  "Acciones",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    <div className="text-4xl mb-3">📭</div>
                    <p>No se encontraron productos</p>
                  </td>
                </tr>
              ) : (
                paged.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover bg-muted shrink-0"
                        />
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {p.name}
                          </p>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-muted-foreground">
                              {p.rating}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                      {p.category}
                    </td>
                    <td
                      className="px-4 py-3.5 text-sm font-bold text-foreground"
                      style={{ fontFamily: MONO }}
                    >
                      {fmt(p.price)}
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={p.status}
                        onChange={(e) =>
                          changeStatus(
                            p.id,
                            e.target.value as Product["status"],
                          )
                        }
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${PROD_STATUS_COLOR[p.status]}`}
                      >
                        <option value="activo">Activo</option>
                        <option value="agotado">Agotado</option>
                        <option value="pausado">Pausado</option>
                      </select>
                    </td>
                    <td
                      className="px-4 py-3.5 text-sm text-muted-foreground"
                      style={{ fontFamily: MONO }}
                    >
                      {p.sales.toLocaleString("es-CO")}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditP({ ...p })}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(p.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer text-muted-foreground hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {(page - 1) * PER + 1}–
              {Math.min(page * PER, filtered.length)} de{" "}
              {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setPage((p) => Math.max(1, p - 1))
                }
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from(
                { length: totalPages },
                (_, i) => i + 1,
              ).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${n === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId !== null && (
          <ConfirmDeleteModal
            title="Eliminar producto"
            message={`¿Seguro que deseas eliminar "${products.find((p) => p.id === deleteId)?.name}"? Esta acción no se puede deshacer.`}
            onConfirm={() => del(deleteId)}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </AnimatePresence>

      {/* Edit modal */}
      <AnimatePresence>
        {editP && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border"
            >
              <div className="flex items-center justify-between mb-5">
                <h3
                  className="text-xl font-bold text-foreground"
                  style={{ fontFamily: SERIF }}
                >
                  Editar producto
                </h3>
                <button
                  onClick={() => setEditP(null)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">
                    Nombre
                  </label>
                  <input
                    value={editP.name}
                    onChange={(e) =>
                      setEditP((p) =>
                        p
                          ? { ...p, name: e.target.value }
                          : null,
                      )
                    }
                    className="w-full px-4 py-2.5 bg-muted rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">
                    Descripción
                  </label>
                  <input
                    value={editP.description}
                    onChange={(e) =>
                      setEditP((p) =>
                        p
                          ? {
                              ...p,
                              description: e.target.value,
                            }
                          : null,
                      )
                    }
                    className="w-full px-4 py-2.5 bg-muted rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">
                    Precio base (COP)
                  </label>
                  <input
                    type="number"
                    value={editP.price}
                    onChange={(e) =>
                      setEditP((p) =>
                        p
                          ? {
                              ...p,
                              price: Number(e.target.value),
                            }
                          : null,
                      )
                    }
                    className="w-full px-4 py-2.5 bg-muted rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <GhostBtn
                  onClick={() => setEditP(null)}
                  className="flex-1 py-3 min-h-0"
                >
                  Cancelar
                </GhostBtn>
                <PrimaryBtn
                  size="md"
                  className="flex-1"
                  onClick={save}
                >
                  <Check className="w-4 h-4" /> Guardar
                </PrimaryBtn>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create modal */}
      <AnimatePresence>
        {creating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border"
            >
              <div className="flex items-center justify-between mb-5">
                <h3
                  className="text-xl font-bold text-foreground"
                  style={{ fontFamily: SERIF }}
                >
                  Nuevo producto
                </h3>
                <button
                  onClick={() => setCreating(false)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">
                    Nombre del producto
                  </label>
                  <input
                    value={newP.name}
                    onChange={(e) =>
                      setNewP((p) => ({
                        ...p,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Ej: Pizza BBQ Pollo"
                    className="w-full px-4 py-2.5 bg-muted rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">
                    Categoría
                  </label>
                  <select
                    value={newP.cat}
                    onChange={(e) =>
                      setNewP((p) => ({
                        ...p,
                        cat: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 bg-muted rounded-xl border border-border text-foreground focus:outline-none text-sm cursor-pointer"
                  >
                    {["Pizzas", "Bebidas", "Lasaña"].map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">
                    Precio base (COP)
                  </label>
                  <input
                    type="number"
                    value={newP.price}
                    onChange={(e) =>
                      setNewP((p) => ({
                        ...p,
                        price: e.target.value,
                      }))
                    }
                    placeholder="Ej: 32000"
                    className="w-full px-4 py-2.5 bg-muted rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <GhostBtn
                  onClick={() => setCreating(false)}
                  className="flex-1 py-3 min-h-0"
                >
                  Cancelar
                </GhostBtn>
                <PrimaryBtn
                  size="md"
                  className="flex-1"
                  onClick={create}
                >
                  <Plus className="w-4 h-4" /> Crear
                </PrimaryBtn>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────── ORDERS ───────────────────────────

function OrdersScreen({
  initialOrders,
}: {
  initialOrders: Order[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("todos");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          (statusF === "todos" || o.status === statusF) &&
          (search === "" ||
            o.client
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            o.id.toLowerCase().includes(search.toLowerCase())),
      ),
    [orders, search, statusF],
  );

  const updateStatus = (id: string, s: Order["status"]) => {
    setOrders((p) =>
      p.map((o) => (o.id === id ? { ...o, status: s } : o)),
    );
    toast.success("Estado de la venta actualizado");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1
          className="text-3xl font-bold text-foreground"
          style={{ fontFamily: SERIF }}
        >
          Gestión de ventas
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {filtered.length} ventas encontradas
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente o código..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
        </div>
        <select
          value={statusF}
          onChange={(e) => setStatusF(e.target.value)}
          className="px-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none cursor-pointer"
        >
          <option value="todos">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <p className="text-5xl mb-4">📋</p>
            <p className="font-bold text-foreground mb-1">
              Sin ventas
            </p>
            <p className="text-muted-foreground text-sm">
              No hay ventas que coincidan con tu búsqueda
            </p>
          </div>
        ) : (
          filtered.map((order) => (
            <div
              key={order.id}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpanded(
                    expanded === order.id ? null : order.id,
                  )
                }
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="text-left">
                    <p className="font-bold text-sm text-foreground font-mono">
                      {order.id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.client}
                    </p>
                  </div>
                  <Badge className={STATUS_COLOR[order.status]}>
                    {STATUS_LABEL[order.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span
                    className="font-bold text-foreground hidden sm:block"
                    style={{ fontFamily: MONO }}
                  >
                    {fmt(order.total)}
                  </span>
                  <span className="text-xs text-muted-foreground hidden md:block">
                    {order.date}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${expanded === order.id ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              <AnimatePresence>
                {expanded === order.id && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border px-4 py-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4 shrink-0" />
                          {order.phone}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4 shrink-0" />
                          {order.address}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CreditCard className="w-4 h-4 shrink-0" />
                          {order.paymentMethod}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          Productos
                        </p>
                        <div className="space-y-1">
                          {order.items.map((item, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-foreground">
                                {item.qty}× {item.name}
                              </span>
                              <span
                                className="font-semibold text-foreground"
                                style={{ fontFamily: MONO }}
                              >
                                {fmt(item.price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-sm font-semibold text-muted-foreground">
                          Cambiar estado:
                        </span>
                        {(
                          Object.keys(
                            STATUS_LABEL,
                          ) as Order["status"][]
                        ).map((s) => (
                          <button
                            key={s}
                            onClick={() =>
                              updateStatus(order.id, s)
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${order.status === s ? STATUS_COLOR[s] + " ring-2 ring-offset-1 ring-current" : "bg-muted text-muted-foreground hover:bg-border"}`}
                          >
                            {STATUS_LABEL[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── GENERIC ADMIN ───────────────────────────

function GenericAdmin({
  screen,
  navigate,
  homeScreen,
}: {
  screen: Screen;
  navigate: (s: Screen) => void;
  homeScreen: Screen;
}) {
  const meta = SCREEN_META[screen];
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="text-center py-20">
        <div className="text-6xl mb-6">
          {meta?.icon ?? "🔧"}
        </div>
        <h1
          className="text-3xl font-bold text-foreground mb-3"
          style={{ fontFamily: SERIF }}
        >
          {meta?.title ?? screen}
        </h1>
        <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
          {meta?.desc ??
            "Esta sección estará disponible pronto."}
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm text-muted-foreground mb-8">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          En desarrollo — próximamente disponible
        </div>
        <div>
          <button
            onClick={() => navigate(homeScreen)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-semibold cursor-pointer hover:bg-red-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── DEVOLUCIONES SCREEN ───────────────────────────

const SERIF_DEV = "var(--font-titulo)";
const MONO_DEV  = "var(--font-texto)";
const fmtCOPDev = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const nowHoraDev = () =>
  new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

// Producto del menú elegido como canje de la devolución. `tamaño` forma parte de
// la identidad: la misma pizza puede canjearse en Mediano o en Grande, y cada
// tamaño tiene su propio precio.
type Reemplazo = { id: number; nombre: string; precio: number; cantidad: number; imagen?: string; tamaño?: string };

function DevolucionesScreen({
  pedidos,
  setPedidos,
}: {
  pedidos: Venta[];
  setPedidos: React.Dispatch<React.SetStateAction<Venta[]>>;
}) {
  const devoluciones = pedidos.filter((p) => p.estado === "perdida");
  const pendientes   = devoluciones.filter((d) => !d.devolucionResuelta);
  const resueltas    = devoluciones.filter((d) => d.devolucionResuelta);

  // La devolución se resuelve con las dos opciones a la vez: una parte se canjea
  // por productos del menú y las unidades que sobren se devuelven en dinero.
  // `paso` es solo qué panel está abierto — no decide nada, porque ninguna
  // elección se confirma hasta que se pulsa el botón "Confirmar".
  const [activa, setActiva] = useState<{
    id: string;
    paso: "producto" | "dinero" | null;
    reembolsoDinero: boolean;
    notaDinero: string;
    devueltos: Record<number, number>;
    compensacion: Reemplazo[];
  } | null>(null);
  const [detalleDevolucion, setDetalleDevolucion] = useState<Venta | null>(null);
  // Categoría activa en el selector de canje. Filtrar por categoría es lo que
  // permite ver todos los productos de una vez, sin barra de desplazamiento.
  const [catCanje, setCatCanje] = useState("Todas");
  // Resumen que se muestra al confirmar, una vez la devolución ya quedó cerrada.
  const [resumen, setResumen] = useState<{
    unidadesDevueltas: number;
    valorDevuelto: number;
    compensacion: Reemplazo[];
    valorComp: number;
    dineroADar: number;
    dineroARecibir: number;
  } | null>(null);

  const resolverDev = (id: string, tipo: DevolucionTipo, nota: string) => {
    setPedidos((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              devolucionTipo: tipo,
              devolucionResuelta: true,
              devolucionNota: nota,
              historial: [...(x.historial ?? []), { estado: "perdida" as VentaStatus, hora: nowHoraDev() }],
            }
          : x,
      ),
    );
    setActiva(null);
  };

  const setDevQty = (idx: number, max: number, delta: number) => {
    setActiva((prev) => {
      if (!prev) return prev;
      const cur = prev.devueltos[idx] ?? 0;
      const nuevo = Math.max(0, Math.min(max, cur + delta));
      if (nuevo === cur) return prev;
      const devueltos = { ...prev.devueltos, [idx]: nuevo };
      // Si bajan las unidades devueltas se recorta el canje para que nunca
      // cubra más de lo que el cliente devuelve.
      const comp = prev.compensacion.map((c) => ({ ...c }));
      const dd = pedidos.find((p) => p.id === prev.id)?.detalle ?? [];
      const newTotal = dd.reduce((s, d, i) => s + (devueltos[i] ?? 0), 0);
      let compTotal = comp.reduce((s, c) => s + c.cantidad, 0);
      while (compTotal > newTotal && comp.length) {
        const last = comp[comp.length - 1];
        const drop = Math.min(last.cantidad, compTotal - newTotal);
        last.cantidad = Math.max(0, last.cantidad - drop);
        if (last.cantidad === 0) comp.pop();
        compTotal -= drop;
      }
      return { ...prev, devueltos, compensacion: comp };
    });
  };

  // Producto de canje del menú. La unidad se identifica por producto **y**
  // tamaño, así que el precio guardado es el del tamaño elegido. Tope: las
  // unidades devueltas, para que el canje no supere lo que entra.
  const setReemplazo = (prod: Product, tam: { label: string; price: number } | null, delta: number) => {
    setActiva((prev) => {
      if (!prev) return prev;
      const dd = pedidos.find((p) => p.id === prev.id)?.detalle ?? [];
      const devueltosTot = dd.reduce((s, d, i) => s + (prev.devueltos[i] ?? 0), 0);
      const etiqueta = tam?.label ?? "";
      const coincide = (c: Reemplazo) => c.id === prod.id && (c.tamaño ?? "") === etiqueta;
      const curQty = prev.compensacion.find(coincide)?.cantidad ?? 0;
      const nuevo = Math.max(0, curQty + delta);
      if (nuevo > devueltosTot) return prev;
      const rest = prev.compensacion.filter((c) => !coincide(c));
      const nueva =
        nuevo === 0
          ? rest
          : [
              ...rest,
              {
                id: prod.id,
                nombre: prod.name,
                precio: tam?.price ?? prod.price,
                cantidad: nuevo,
                imagen: prod.image,
                ...(etiqueta ? { tamaño: etiqueta } : {}),
              },
            ];
      return { ...prev, compensacion: nueva };
    });
  };

  // Categorías del catálogo, en el orden del menú, para el selector de canje.
  const categoriasCanje = (() => {
    const disponibles = PRODUCTS.filter((p) => p.status === "disponible");
    const conocidas = SECCIONES_MENU.map((s) => s.categoria);
    const enOrden = conocidas.filter((c) => disponibles.some((p) => p.category === c));
    const nuevas = [...new Set(disponibles.map((p) => p.category))].filter(
      (c) => !conocidas.includes(c),
    );
    return ["Todas", ...enOrden, ...nuevas];
  })();
  const disponiblesCanje = PRODUCTS.filter((p) => p.status === "disponible");
  const porCategoria = disponiblesCanje.filter((p) => catCanje === "Todas" || p.category === catCanje);
  // Si la categoría elegida no tiene nada disponible se muestran todos, para no
  // dejar el panel de canje en blanco.
  const productosCanje = porCategoria.length > 0 ? porCategoria : disponiblesCanje;
  // Cantidad ya canjeada de un producto en un tamaño concreto.
  const cantCanje = (prod: Product, tam: string) =>
    activa?.compensacion.find((c) => c.id === prod.id && (c.tamaño ?? "") === tam)?.cantidad ?? 0;

  const devActiva = activa ? pedidos.find((p) => p.id === activa.id) ?? null : null;
  const detalleAct = devActiva?.detalle ?? [];
  const totalActRaw = devActiva?.total || detalleAct.reduce((s, d) => s + d.precio * d.cantidad, 0) || 0;
  const totalDevueltos = activa ? detalleAct.reduce((s, d, i) => s + (activa.devueltos[i] ?? 0), 0) : 0;
  const totalComp = activa ? activa.compensacion.reduce((s, c) => s + c.cantidad, 0) : 0;
  const valorComp = activa ? activa.compensacion.reduce((s, c) => s + c.cantidad * c.precio, 0) : 0;

  // Valor de lo que el cliente devuelve: es la suma de (unidades devueltas ×
  // precio unitario) de cada línea del pedido.
  const valorDevuelto = activa
    ? detalleAct.reduce((s, d, i) => s + (activa.devueltos[i] ?? 0) * d.precio, 0)
    : 0;

  const conDinero = activa?.reembolsoDinero ?? false;
  // Unitarios que se suman en el bloque inferior izquierdo.
  const preciosSumados = activa
    ? detalleAct
        .map((d, i) => ({ d, q: activa.devueltos[i] ?? 0 }))
        .filter((x) => x.q > 0)
        .map((x) => `${x.q} × ${fmtCOPDev(x.d.precio)}`)
    : [];

  // Saldo final entre lo que entra y lo que sale. Antes solo se contemplaba el
  // dinero de las unidades sin canjear, así que un canje por un producto más
  // caro o más barato no mostraba ni el saldo a favor ni el extra a cobrar.
  //   > 0 → le debemos dinero al cliente
  //   < 0 → el cliente nos debe un extra
  const saldo = valorDevuelto - valorComp;
  // Magnitud que se muestra en vivo, con o sin la opción "Dinero" activada: así el
  // monto reacciona a cada producto que se añade al canje.
  const montoSaldo = Math.abs(saldo);
  const dineroADar = conDinero && saldo > 0 ? saldo : 0;
  const dineroARecibir = saldo < 0 ? -saldo : 0;
  // Etiqueta única para el bloque de dinero: cambia con el signo del saldo.
  const rotuloDinero =
    saldo < 0 ? "Dinero a recibir por la devolución" : "Dinero a dar por la devolución";

  const textoComp =
    activa?.compensacion.map((c) => `${c.cantidad}x ${c.nombre}${c.tamaño ? ` (${c.tamaño})` : ""}`).join(", ") ??
    "";
  const puedeConfirmar = !!activa && totalDevueltos > 0 && (totalComp > 0 || conDinero);
  const modoGlobal: DevolucionTipo =
    totalComp > 0 && (dineroADar > 0 || dineroARecibir > 0)
      ? "mixto"
      : totalComp > 0
        ? "producto"
        : "dinero";

  // "Aún puedes hacer…": lo que todavía falta decidir de cada opción.
  const faltan: string[] = [];
  if (totalDevueltos === 0) {
    faltan.push("Marca las unidades que devuelve el cliente.");
  } else if (!conDinero && saldo > 0) {
    faltan.push("Activa Dinero para devolver el saldo al cliente.");
  }

  const confirmarDevolucion = () => {
    if (!activa || !devActiva || !puedeConfirmar) return;
    const devStr = detalleAct
      .map((d, i) => {
        const q = activa.devueltos[i] ?? 0;
        return q > 0 ? `${q}x ${d.nombre}` : null;
      })
      .filter(Boolean)
      .join(", ");
    const nota = [
      devStr ? `Devolvió: ${devStr}` : null,
      totalComp > 0 ? `Canje: ${textoComp}` : null,
      dineroADar > 0 ? `Dinero a devolver: ${fmtCOPDev(dineroADar)}` : null,
      dineroARecibir > 0 ? `Extra a cobrar: ${fmtCOPDev(dineroARecibir)}` : null,
      activa.notaDinero.trim() ? `Nota: ${activa.notaDinero.trim()}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    setResumen({
      unidadesDevueltas: totalDevueltos,
      valorDevuelto,
      compensacion: activa.compensacion,
      valorComp,
      dineroADar,
      dineroARecibir,
    });
    resolverDev(devActiva.id, modoGlobal, nota);
    import("sonner").then(({ toast }) =>
      toast.success(
        modoGlobal === "mixto"
          ? "Devolución mixta registrada"
          : modoGlobal === "producto"
            ? "Devolución resuelta — cambio de producto registrado"
            : "Devolución resuelta — dinero registrado",
        {
          description:
            dineroARecibir > 0
              ? `Extra a cobrar al cliente: ${fmtCOPDev(dineroARecibir)}`
              : `Dinero a devolver: ${fmtCOPDev(dineroADar)}`,
        },
      ),
    );
  };

  const devolucionDetalle = detalleDevolucion
    ? pedidos.find((p) => p.id === detalleDevolucion.id) ?? detalleDevolucion
    : null;
  const totalDetalleDevolucion =
    devolucionDetalle?.total ||
    devolucionDetalle?.detalle?.reduce((s, d) => s + d.precio * d.cantidad, 0) ||
    0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF_DEV }}>
          Devoluciones
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {pendientes.length} pendiente{pendientes.length !== 1 ? "s" : ""} · {resueltas.length} resuelta{resueltas.length !== 1 ? "s" : ""}
        </p>
      </div>

      {devoluciones.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <p className="text-lg font-semibold text-foreground">Sin devoluciones</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Cuando una venta sea marcada como "Devolución" aparecerá aquí para su gestión.
          </p>
        </div>
      )}

      {/* Listado de devoluciones */}
      {devoluciones.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                <tr>
                  {[
                    "Venta",
                    "Cliente",
                    "Fecha",
                    "Productos",
                    "Total",
                    "Pago",
                    "Estado",
                    "Acciones",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...pendientes, ...resueltas].map((dev) => {
                  const totalDev =
                    dev.total ||
                    dev.detalle?.reduce((s, d) => s + d.precio * d.cantidad, 0) ||
                    0;
                  const pendiente = !dev.devolucionResuelta;

                  return (
                    <tr
                      key={dev.id}
                      className={`transition-colors ${
                        pendiente
                          ? "bg-orange-50/20 hover:bg-orange-50/40 dark:bg-orange-500/10 dark:hover:bg-orange-500/20"
                          : "bg-emerald-50/20 hover:bg-emerald-50/40 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20"
                      }`}
                    >
                      <td className="px-4 py-3.5 text-sm font-mono font-semibold text-foreground">
                        #{dev.id}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-medium text-foreground">
                        {dev.usuario}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                        {dev.fecha}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-foreground max-w-[240px]">
                        <span className="block truncate" title={dev.productos}>
                          {dev.productos || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-bold text-foreground whitespace-nowrap" style={{ fontFamily: MONO_DEV }}>
                        {fmtCOPDev(totalDev)}
                      </td>
                      <td className="px-4 py-3.5">
                        <PagoPill metodo={dev.metodoPago} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            pendiente
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                          }`}
                        >
                          {pendiente
                            ? "Pendiente"
                            : dev.devolucionTipo === "dinero"
                              ? "Resuelta · Dinero"
                              : dev.devolucionTipo === "producto"
                                ? "Resuelta · Canje"
                                : "Resuelta · Mixta"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            disabled={!pendiente}
                            onClick={() =>
                              pendiente &&
                                setActiva({
                                  id: dev.id,
                                  paso: null,
                                  reembolsoDinero: false,
                                  notaDinero: "",
                                  devueltos: {},
                                  compensacion: [],
                                })
                            }
                            title={pendiente ? "Gestionar devolución" : "La devolución ya está resuelta"}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              pendiente
                                ? "bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-300 dark:hover:bg-orange-500/20 cursor-pointer"
                                : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                            }`}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetalleDevolucion(dev)}
                            title="Visualizar devolución"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-muted text-foreground hover:bg-border transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de gestión */}
      <AnimatePresence>
        {activa && devActiva && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="bg-card rounded-2xl w-full max-w-7xl shadow-2xl border border-border flex flex-col max-h-[92vh]"
            >
              {/* Header modal */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center shrink-0">
                      <RefreshCw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">Gestionar devolución</p>
                    <p className="text-xs text-muted-foreground truncate">
                      #{devActiva.id} · {devActiva.usuario} · {devActiva.fecha}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiva(null)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cuerpo modal: dos columnas. Izquierda, lo que entra de vuelta.
                  Derecha, cómo se compensa. */}
              <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden grid lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] divide-y lg:divide-y-0 lg:divide-x divide-border">
                {/* ================= Columna izquierda ================= */}
                <div className="flex flex-col min-h-0">
                  <div className="px-5 py-3 border-b border-border shrink-0 flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">Qué devuelve el cliente</p>
                    {totalDevueltos > 0 && (
                      <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                        {totalDevueltos} de {detalleAct.reduce((s, d) => s + d.cantidad, 0)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-h-0 lg:overflow-y-auto p-4 space-y-2">
                    {detalleAct.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        Esta venta no tiene detalle de productos registrado, así que no hay productos
                        que compensar.
                      </p>
                    ) : (
                      detalleAct.map((d, i) => {
                        const q = activa.devueltos[i] ?? 0;
                        const [nombre, ...resto] = d.nombre.split(" — ");
                        return (
                          <div
                            key={i}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                              q > 0
                                ? "border-orange-300 bg-orange-50/40 dark:border-orange-500/40 dark:bg-orange-500/10"
                                : "border-border bg-card"
                            }`}
                          >
                            {d.imagen ? (
                              <img src={d.imagen} alt={d.nombre} className="w-9 h-9 rounded-lg object-cover bg-muted shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-muted shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{nombre}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {resto.length > 0 ? `${resto.join(" — ")} · ` : ""}
                                {fmtCOPDev(d.precio)} c/u
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setDevQty(i, d.cantidad, -1)}
                                disabled={q === 0}
                                className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-bold text-foreground">{q}</span>
                              <button
                                type="button"
                                onClick={() => setDevQty(i, d.cantidad, 1)}
                                disabled={q >= d.cantidad}
                                className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Resumen de lo que entra: unidades y dinero, con los unitarios
                      que sumando producen ese dinero. */}
                  <div className="shrink-0 border-t border-border bg-muted/30 p-4">
                    <div className="rounded-xl border border-border bg-card divide-y divide-border">
                      <div className="flex items-center justify-between px-3 py-2">
                        <p className="text-xs font-semibold text-foreground">Cantidad de productos a cambiar</p>
                        <p className="text-sm font-bold text-foreground">{totalDevueltos}</p>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <p className="text-xs font-semibold text-foreground">Cantidad de dinero</p>
                        <p className="text-base font-bold text-foreground" style={{ fontFamily: MONO_DEV }}>
                          {fmtCOPDev(valorDevuelto)}
                        </p>
                      </div>
                    </div>
                    {preciosSumados.length > 0 && (
                      <p className="text-[11px] text-muted-foreground text-right mt-1.5" style={{ fontFamily: MONO_DEV }}>
                        {preciosSumados.join("  +  ")} = {fmtCOPDev(valorDevuelto)}
                      </p>
                    )}
                  </div>
                </div>

                {/* ================= Columna derecha ================= */}
                <div className="flex flex-col min-h-0">
                  <div className="px-5 py-3 border-b border-border shrink-0">
                    <p className="text-sm font-bold text-foreground">Tipo de devolución</p>
                  </div>

                  <div className="flex-1 min-h-0 lg:overflow-y-auto p-4 space-y-3">
                    {/* Opción 1: Cambio de producto */}
                    <div
                      className={`rounded-2xl border-2 transition-all ${
                        totalComp > 0
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-500/15"
                          : "border-border bg-card"
                      }`}
                    >
                      <button
                        onClick={() =>
                          setActiva((p) => (p ? { ...p, paso: p.paso === "producto" ? null : "producto" } : p))
                        }
                        className="w-full flex items-center gap-3 p-3.5 text-left cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                          <PackageCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground">Cambio de producto</p>
                          <p className="text-xs text-muted-foreground">
                            {totalComp > 0
                              ? `${totalComp} de ${totalDevueltos} · ${fmtCOPDev(valorComp)}`
                              : "Otro producto del menú"}
                          </p>
                        </div>
                        {totalComp > 0 && (
                          <span className="w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </span>
                        )}
                      </button>

                      {activa.paso === "producto" && (
                        <div className="px-3.5 pb-3.5 space-y-2.5">
                          {activa.compensacion.length > 0 && (
                            <div className="bg-card border border-blue-200 dark:border-blue-500/30 rounded-xl px-3 py-2">
                              {activa.compensacion.map((r) => (
                                <div key={`${r.id}-${r.tamaño ?? ""}`} className="flex justify-between gap-2 text-xs text-blue-900 dark:text-blue-200 py-0.5">
                                  <span className="truncate">
                                    • {r.cantidad}x {r.nombre}
                                    {r.tamaño ? ` (${r.tamaño})` : ""}
                                  </span>
                                  <span className="font-semibold whitespace-nowrap">
                                    {fmtCOPDev(r.cantidad * r.precio)}
                                  </span>
                                </div>
                              ))}
                              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 border-t border-blue-200 dark:border-blue-500/30 pt-1.5">
                                Valor del canje: {fmtCOPDev(valorComp)}
                              </p>
                            </div>
                          )}

                          {totalDevueltos === 0 ? (
                            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                              Marca primero cuántas unidades devuelve el cliente.
                            </p>
                          ) : totalComp === 0 ? (
                            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                              Falta elegir el producto de canje.
                            </p>
                          ) : null}

                          {/* Filtro por categoría: en vez de una lista larga con
                              scroll, se elige una categoría y caben todos sus
                              productos a la vez. */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {categoriasCanje.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setCatCanje(c)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                  catCanje === c
                                    ? "bg-blue-600 dark:bg-blue-500 text-white border-transparent"
                                    : "bg-card text-foreground border-border hover:border-blue-400"
                                }`}
                              >
                                {c}
                              </button>
                            ))}
                          </div>

                          {/* Cada producto es una tarjeta; si tiene tamaños, cada
                              tamaño es una celda con su propio precio y su propio
                              contador, porque el canje es por unidad y tamaño. */}
                          <div className="grid grid-cols-4 gap-2">
                            {productosCanje.map((prod) => {
                              const variantes =
                                prod.sizes.length > 0
                                  ? prod.sizes
                                  : [{ label: "", price: prod.price }];
                              const cantTotal = variantes.reduce(
                                (s, v) => s + cantCanje(prod, v.label),
                                0,
                              );
                              return (
                                <div
                                  key={prod.id}
                                  className={`rounded-xl border p-2 flex flex-col gap-1.5 transition-all ${
                                    cantTotal > 0
                                      ? "bg-blue-50 border-blue-300 dark:bg-blue-500/15 dark:border-blue-400"
                                      : "bg-card border-border"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={prod.image}
                                      alt={prod.name}
                                      className={`w-8 h-8 rounded-lg object-cover bg-muted shrink-0 ${
                                        verImagenCompleta(prod) ? "object-contain" : ""
                                      }`}
                                    />
                                    <p className="text-[11px] font-semibold text-foreground leading-tight line-clamp-2">
                                      {prod.name}
                                    </p>
                                  </div>

                                  <div className="flex gap-1.5">
                                    {variantes.map((v) => {
                                      const cant = cantCanje(prod, v.label);
                                      const lleno = totalComp >= totalDevueltos;
                                      return (
                                        <div
                                          key={v.label || "base"}
                                          className={`flex-1 min-w-0 rounded-lg border px-1.5 py-1 ${
                                            cant > 0
                                              ? "border-blue-400 dark:border-blue-400 bg-card"
                                              : "border-border bg-muted/40"
                                          }`}
                                        >
                                          <p className="text-[10px] font-semibold text-foreground truncate">
                                            {v.label || "Única"}
                                          </p>
                                          <p
                                            className="text-[10px] text-muted-foreground truncate"
                                            style={{ fontFamily: MONO_DEV }}
                                          >
                                            {fmtCOPDev(v.price)}
                                          </p>
                                          <div className="flex items-center justify-between mt-0.5">
                                            <button
                                              type="button"
                                              onClick={() => setReemplazo(prod, v.label ? v : null, -1)}
                                              disabled={cant === 0}
                                              className="w-5 h-5 rounded bg-card border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 cursor-pointer"
                                            >
                                              <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="text-[11px] font-bold text-foreground">
                                              {cant}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => setReemplazo(prod, v.label ? v : null, 1)}
                                              disabled={totalDevueltos === 0 || lleno}
                                              className="w-5 h-5 rounded bg-card border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 cursor-pointer"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Opción 2: Dinero. El monto sigue al saldo, así que cambia en
                        tiempo real con cada producto que se elige en el canje. */}
                    <div
                      className={`rounded-2xl border-2 transition-all ${
                        conDinero || dineroARecibir > 0
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15"
                          : "border-border bg-card"
                      }`}
                    >
                      <button
                        onClick={() =>
                          setActiva((p) => (p ? { ...p, paso: p.paso === "dinero" ? null : "dinero", reembolsoDinero: p.paso === "dinero" ? false : true } : p))
                        }
                        className="w-full flex items-center gap-3 p-3.5 text-left cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <Banknote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground">Dinero</p>
                          <p className="text-xs text-muted-foreground">
                            {dineroARecibir > 0
                              ? `Extra a cobrar: ${fmtCOPDev(dineroARecibir)}`
                              : `A devolver: ${fmtCOPDev(montoSaldo)}`}
                          </p>
                        </div>
                        {conDinero && (
                          <span className="w-5 h-5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </span>
                        )}
                      </button>

                      {/* El saldo se muestra siempre: el rótulo cambia entre dar y
                          recibir según lo que reste del canje. */}
                      <div className="px-3.5 pb-3.5 space-y-2.5">
                        <div className="bg-card border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-3 py-2.5">
                          <p className="text-xs text-muted-foreground">{rotuloDinero}</p>
                          <p
                            className={`text-2xl font-bold ${
                              dineroARecibir > 0
                                ? "text-orange-600 dark:text-orange-400"
                                : "text-emerald-700 dark:text-emerald-300"
                            }`}
                            style={{ fontFamily: MONO_DEV }}
                          >
                            {fmtCOPDev(montoSaldo)}
                          </p>
                          {totalDevueltos > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: MONO_DEV }}>
                              {fmtCOPDev(valorDevuelto)} devueltos − {fmtCOPDev(valorComp)} canje
                            </p>
                          )}
                        </div>

                        {activa.paso === "dinero" && (
                          <div>
                            <input
                              type="text"
                              value={activa.notaDinero}
                              onChange={(e) => setActiva((p) => (p ? { ...p, notaDinero: e.target.value } : p))}
                              placeholder="Nota del reembolso (opcional)"
                              className="w-full px-3 py-2.5 bg-card rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-500/40"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cierre: resumen de lo que se aplicará y único botón */}
                  <div className="shrink-0 border-t border-border bg-muted/30 p-4 space-y-2.5">
                    <div className="bg-card border border-border rounded-xl divide-y divide-border">
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <p className="text-xs font-semibold text-foreground">Cambio de producto</p>
                        <p className="text-xs font-semibold text-right truncate pl-2">
                          {totalComp > 0 ? (
                            <span className="text-blue-700 dark:text-blue-300">{fmtCOPDev(valorComp)}</span>
                          ) : (
                            <span className="text-muted-foreground">No se canjeó nada</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <p className="text-xs font-semibold text-foreground">Dinero</p>
                        <p className="text-xs font-semibold text-right pl-2">
                          {dineroARecibir > 0 ? (
                            <span className="text-orange-600 dark:text-orange-400" style={{ fontFamily: MONO_DEV }}>
                              +{fmtCOPDev(dineroARecibir)}
                            </span>
                          ) : dineroADar > 0 ? (
                            <span className="text-emerald-700 dark:text-emerald-300" style={{ fontFamily: MONO_DEV }}>
                              −{fmtCOPDev(dineroADar)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">$0</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {faltan.length > 0 && (
                      <div className="space-y-0.5">
                        {faltan.map((f) => (
                          <p key={f} className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                            • {f}
                          </p>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={!puedeConfirmar}
                      onClick={confirmarDevolucion}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-foreground text-background text-sm font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Check className="w-4 h-4" strokeWidth={3} />
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: resumen de la devolución ya confirmada */}
      <AnimatePresence>
        {resumen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CircleCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">Devolución confirmada</p>
                    <p className="text-xs text-muted-foreground truncate">Resumen de la compensación</p>
                  </div>
                </div>
                <button
                  onClick={() => setResumen(null)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5 flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Unidades devueltas</p>
                  <p className="text-sm font-bold text-foreground">
                    {resumen.unidadesDevueltas}{" "}
                    {resumen.unidadesDevueltas === 1 ? "unidad" : "unidades"}
                  </p>
                </div>

                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-blue-50 dark:bg-blue-500/15 border-b border-blue-200 dark:border-blue-500/30">
                    <p className="text-xs font-bold text-blue-900 dark:text-blue-200">Cambio de producto</p>
                  </div>
                  {resumen.compensacion.length === 0 ? (
                    <p className="px-3 py-2.5 text-xs text-muted-foreground italic">
                      No se canjeó ningún producto.
                    </p>
                  ) : (
                    resumen.compensacion.map((r) => (
                      <div
                        key={`${r.id}-${r.tamaño ?? ""}`}
                        className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0"
                      >
                        {r.imagen ? (
                          <img src={r.imagen} alt={r.nombre} className="w-9 h-9 rounded-lg object-cover bg-muted shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-muted shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {r.nombre}
                            {r.tamaño ? ` · ${r.tamaño}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.cantidad} {r.cantidad === 1 ? "unidad" : "unidades"} ×{" "}
                            {fmtCOPDev(r.precio)}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-300 shrink-0" style={{ fontFamily: MONO_DEV }}>
                          {fmtCOPDev(r.cantidad * r.precio)}
                        </p>
                      </div>
                    ))
                  )}
                  {resumen.compensacion.length > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-500/15 border-t border-blue-200 dark:border-blue-500/30">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">Valor del canje</p>
                      <p className="text-sm font-bold text-blue-700 dark:text-blue-300" style={{ fontFamily: MONO_DEV }}>
                        {fmtCOPDev(resumen.valorComp)}
                      </p>
                    </div>
                  )}
                </div>

                {/* El dinero se separa en dar o recibir: el signo del saldo decide
                    cuál de los dos rótulos se muestra. */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div
                    className={`px-3 py-2 border-b ${
                      resumen.dineroARecibir > 0
                        ? "bg-orange-50 dark:bg-orange-500/15 border-orange-200 dark:border-orange-500/30"
                        : "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30"
                    }`}
                  >
                    <p
                      className={`text-xs font-bold ${
                        resumen.dineroARecibir > 0
                          ? "text-orange-900 dark:text-orange-200"
                          : "text-emerald-900 dark:text-emerald-200"
                      }`}
                    >
                      {resumen.dineroARecibir > 0
                        ? "Dinero a recibir por la devolución"
                        : "Dinero a dar por la devolución"}
                    </p>
                  </div>
                  <div className="px-3 py-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {fmtCOPDev(resumen.valorDevuelto)} devueltos − {fmtCOPDev(resumen.valorComp)} canje
                    </p>
                    <p
                      className={`text-xl font-bold shrink-0 ${
                        resumen.dineroARecibir > 0
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-emerald-700 dark:text-emerald-300"
                      }`}
                      style={{ fontFamily: MONO_DEV }}
                    >
                      {fmtCOPDev(resumen.dineroARecibir > 0 ? resumen.dineroARecibir : resumen.dineroADar)}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  La devolución quedó registrada y ya no se puede deshacer.
                </p>
              </div>

              <div className="px-5 py-4 border-t border-border">
                <button
                  onClick={() => setResumen(null)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-muted text-foreground hover:bg-border cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: visualizar devolución */}
      <AnimatePresence>
        {detalleDevolucion && devolucionDetalle && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">Detalle de devolución</p>
                    <p className="text-xs text-muted-foreground truncate">
                      #{devolucionDetalle.id} · {devolucionDetalle.usuario} · {devolucionDetalle.fecha}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDetalleDevolucion(null)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-bold text-foreground mt-0.5" style={{ fontFamily: MONO_DEV }}>
                      {fmtCOPDev(totalDetalleDevolucion)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Método de pago</p>
                    <div className="mt-1">
                      {devolucionDetalle.metodoPago ? (
                        <PagoPill metodo={devolucionDetalle.metodoPago} />
                      ) : (
                        <p className="text-sm font-semibold text-muted-foreground">No registrado</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Estado</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      devolucionDetalle.devolucionResuelta
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                        : "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200"
                    }`}
                  >
                    {devolucionDetalle.devolucionResuelta
                      ? devolucionDetalle.devolucionTipo === "dinero"
                        ? "Resuelta · Dinero"
                        : devolucionDetalle.devolucionTipo === "producto"
                          ? "Resuelta · Canje"
                          : "Resuelta · Mixta"
                      : "Pendiente de resolución"}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Productos</p>
                  {devolucionDetalle.detalle && devolucionDetalle.detalle.length > 0 ? (
                    <div className="border border-border rounded-xl overflow-hidden">
                      {devolucionDetalle.detalle.map((item, index) => (
                        <div key={`${item.nombre}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-border last:border-0">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.nombre}</p>
                            <p className="text-xs text-muted-foreground">x{item.cantidad} · {fmtCOPDev(item.precio)} c/u</p>
                          </div>
                          <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                            {fmtCOPDev(item.precio * item.cantidad)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{devolucionDetalle.productos || "Sin detalle de productos"}</p>
                  )}
                </div>

                {devolucionDetalle.devolucionNota && (
                  <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Nota de resolución</p>
                    <p className="text-sm text-foreground italic">“{devolucionDetalle.devolucionNota}”</p>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-border">
                <button
                  onClick={() => setDetalleDevolucion(null)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-muted text-foreground hover:bg-border cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────── APP ROOT ───────────────────────────

// ── Persistencia de roles (TEMPORAL) ──────────────────────────────────
// Los roles viven hoy en memoria y se perdían con cada F5, lo que hacía
// inservible un rol de "Administrador sustituto". Se guardan en localStorage
// como solución puente.
//
// ATENCIÓN: esto NO es persistencia real. Es por navegador y por máquina.
// Cuando exista backend/base de datos, este bloque debe reemplazarse por una
// llamada a la API (GET/POST de roles) y el resto del código no cambia: la
// forma `Rol` / `AccesosMap` ya es JSON-serializable sin transformaciones.
// La clave incluye versión para poder invalidar el cache al cambiar el schema.
const ROLES_STORAGE_KEY = "sivpro.roles.v1";

const esRolValido = (r: unknown): r is Rol => {
  if (!r || typeof r !== "object") return false;
  const rol = r as Rol;
  return (
    typeof rol.id === "string" &&
    typeof rol.nombre === "string" &&
    typeof rol.activo === "boolean" &&
    !!rol.accesos &&
    typeof rol.accesos === "object"
  );
};

const leerRolesPersistidos = (): Rol[] => {
  try {
    const raw = localStorage.getItem(ROLES_STORAGE_KEY);
    if (!raw) return INITIAL_ROLES;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(esRolValido)) {
      return (parsed as Rol[]).map(rol =>
        rol.id === "ROL-003" && rol.nombre === "Usuario"
          ? { ...rol, nombre: "Empleado", descripcion: "Acceso operativo al sistema." }
          : rol,
      );
    }
  } catch {
    // Datos corruptos o localStorage bloqueado: se cae a la semilla.
  }
  return INITIAL_ROLES;
};

// ── Persistencia de usuarios (TEMPORAL) ──────────────────────────────
// Mismo criterio y mismo riesgo que la de roles: los usuarios se creaban solo
// en memoria, así que cualquier alta se perdía con el F5. Se guardan en
// localStorage como solución puente, con la misma forma que el bloque de roles
// y también con versión en la clave.
//
// OJO: al persistir TODO el array se guardan también los cambios que hacen
// otras pantallas, no solo los del modal de alta: las ediciones de "Mi Perfil"
// y los interruptores de Activo/Inactivo de la pantalla de Usuarios.
// Para volver a la semilla: localStorage.removeItem(USUARIOS_STORAGE_KEY).
const USUARIOS_STORAGE_KEY = "sivpro.usuarios.v1";
const CUENTAS_PRUEBA_IDS = new Set(["USR-001", "USR-002", "USR-010"]);

const esUsuarioValido = (u: unknown): u is Usuario => {
  if (!u || typeof u !== "object") return false;
  const usr = u as Usuario;
  // Se comprueban también `iniciales` y `avatarColor` porque la tabla las
  // pinta tal cual: un registro corrupto que las traiga ausentes llegaría hasta
  // el avatar en vez de descartarse aquí.
  return (
    typeof usr.id === "string" &&
    typeof usr.nombre === "string" &&
    typeof usr.iniciales === "string" &&
    typeof usr.avatarColor === "string" &&
    typeof usr.correo === "string" &&
    typeof usr.telefono === "string" &&
    typeof usr.tipoDocumento === "string" &&
    typeof usr.numeroDocumento === "string" &&
    typeof usr.rolId === "string" &&
    typeof usr.activo === "boolean"
  );
};

const leerUsuariosPersistidos = (): Usuario[] => {
  try {
    const raw = localStorage.getItem(USUARIOS_STORAGE_KEY);
    if (!raw) return INIT_USUARIOS;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(esUsuarioValido)) {
      const persistidos = parsed as Usuario[];
      const porId = new Map(persistidos.map((usuario) => [usuario.id, usuario]));
      const cuentasPrueba = INIT_USUARIOS
        .filter((usuario) => CUENTAS_PRUEBA_IDS.has(usuario.id))
        .map((semilla) => ({
          ...semilla,
          // Las cuentas de prueba siempre conservan sus credenciales y rol.
          ...(porId.get(semilla.id) ?? {}),
          correo: semilla.correo,
          rolId: semilla.rolId,
          activo: semilla.activo,
        }));
      const otrosUsuarios = persistidos
        .filter((usuario) => !CUENTAS_PRUEBA_IDS.has(usuario.id))
        .map((usuario) => ({ ...usuario, correo: usuario.correo.trim().toLowerCase() }));
      return [...cuentasPrueba, ...otrosUsuarios];
    }
  } catch {
    // Datos corruptos o localStorage bloqueado: se cae a la semilla.
  }
  return INIT_USUARIOS;
};

// ── Persistencia de empleados (TEMPORAL) ─────────────────────────────
// Necesita una clave propia porque el historial de contrataciones vive DENTRO
// de cada empleado (`Empleado.contrataciones`), no en un array aparte: para que
// sobreviva al F5 hay que persistir el empleado completo.
//
// AVISO DE ALCANCE: al guardar el array entero también pasan a sobrevivir al F5
// las ediciones, los interruptores Activo/Inactivo y los BORRADOS de empleado,
// no solo las contrataciones. Para volver a la semilla:
// localStorage.removeItem(EMPLEADOS_STORAGE_KEY).
const EMPLEADOS_STORAGE_KEY = "sivpro.empleados.v1";

const esEmpleadoValido = (e: unknown): e is Empleado => {
  if (!e || typeof e !== "object") return false;
  const emp = e as Empleado;
  return (
    typeof emp.id === "string" &&
    typeof emp.nombre === "string" &&
    typeof emp.correo === "string" &&
    typeof emp.telefono === "string" &&
    typeof emp.tipoDocumento === "string" &&
    typeof emp.numeroDocumento === "string" &&
    typeof emp.rolId === "string" &&
    typeof emp.activo === "boolean" &&
    typeof emp.cargo === "string" &&
    typeof emp.fechaInicio === "string" &&
    typeof emp.fechaFinal === "string"
  );
};

// `contrataciones` se нормаiza en vez de exigirla: si un array quedó guardado
// por una build anterior a esta feature, descartar el registro entero perdería
// también sus datos de contacto. Un histórico ausente se trata como vacío.
const normalizarEmpleado = (e: Empleado): Empleado => ({
  ...e,
  contrasena: typeof e.contrasena === "string" ? e.contrasena : "123456",
  contrataciones: Array.isArray(e.contrataciones) ? e.contrataciones : [],
});

const leerEmpleadosPersistidos = (): Empleado[] => {
  try {
    const raw = localStorage.getItem(EMPLEADOS_STORAGE_KEY);
    if (!raw) return INITIAL_EMPLEADOS;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(esEmpleadoValido)) {
      return (parsed as Empleado[]).map(normalizarEmpleado);
    }
  } catch {
    // Datos corruptos o localStorage bloqueado: se cae a la semilla.
  }
  return INITIAL_EMPLEADOS;
};

// ── Persistencia del carrito ───────────────────────────────────────────
// El carrito vivía solo en el `useState` de App: cualquier recarga, cambio de
// categoría o ida al detalle de otro producto lo borraba, y con él todo lo que
// el cliente había armado sin haber iniciado sesión. Ahora hay dos destinos:
//
//   · CARRITO_STORAGE_KEY      → el carrito de quien NO tiene sesión abierta.
//   · CARRITOS_USUARIOS_STORAGE_KEY → { userId: CartItem[] }, el carrito que
//     pertenece a cada cuenta, para que se recupere al volver a entrar.
//
// Las dos mitades nunca cuentan dos veces lo mismo: el carrito invitado se
// borra en cuanto la sesión lo absorbe, y la fusión descarta toda línea cuyo
// `id` ya esté en pantalla (ver `fusionarCarritos`), de modo que entrar y salir
// de la cuenta las veces que sea deja siempre el mismo carrito.
//
// Para volver a cero: localStorage.removeItem(CARRITO_STORAGE_KEY) y
// localStorage.removeItem(CARRITOS_USUARIOS_STORAGE_KEY).
const CARRITO_STORAGE_KEY = "sivpro.carrito.v1";
const CARRITOS_USUARIOS_STORAGE_KEY = "sivpro.carritos.usuarios.v1";

// No hay credenciales persistidas en esta build, pero se limpian también las
// claves que usa el contrato de autenticación para evitar sesiones parciales
// si el backend se habilita o una versión anterior dejó datos en el navegador.
const AUTH_STORAGE_KEYS = [
  "token",
  "accessToken",
  "refreshToken",
  "authToken",
  "user",
  "currentUser",
  "userRole",
  "role",
  "permissions",
  "sivpro.token",
  "sivpro.user",
  "sivpro.role",
  "sivpro.permissions",
];

// Cartrito ligado a cada cuenta, indexado por `Usuario.id`.
type CarritosPorUsuario = Record<string, CartItem[]>;

// Un item se acepta solo con lo que el carrito necesita para COBRAR y PINTAR la
// línea: producto, cantidad, tamaño y extras. El resto se normaliza después. Se
// evita exigirle todos los campos de `Product` porque un campo que solo afecta
// a la ficha del producto (rating, ventas, descripción) descartaría la línea
// entera —y con ella un producto que el cliente ya había elegido— por un
// detalle que no altera ni el cobro ni el carrito.
const esCartItemValido = (i: unknown): i is CartItem => {
  if (!i || typeof i !== "object") return false;
  const item = i as CartItem;
  const prod = item.product;
  return (
    typeof item.id === "string" &&
    !!prod && typeof prod === "object" &&
    typeof prod.id === "number" &&
    typeof prod.name === "string" &&
    typeof item.quantity === "number" && item.quantity > 0 &&
    typeof item.size === "string" &&
    typeof item.sizePrice === "number" &&
    typeof item.extrasPrice === "number"
  );
};

// El producto guardado se re-resuelve contra PRODUCTS por id, igual que hacen
// `imagenDeProducto` y `precioDeProducto`: las fotos del menú son imports de
// Vite y su URL cambia en cada build, así que un carrito arrastrado desde una
// sesión anterior apuntaría a un archivo que ya no existe. Se toma el producto
// del catálogo y no al revés porque el precio que se cobra es el de la LÍNEA
// (`sizePrice` + `extrasPrice`), el que el cliente vio al agregarla. Si el id
// ya no está en el catálogo se conserva el producto guardado antes que perder
// la línea.
const productoDeCarrito = (p: Product): Product =>
  PRODUCTS.find((x) => x.id === p.id) ?? p;

// `selectedExtras` se normaliza en vez de exigirse: un carrito guardado por una
// build anterior a esta feature puede no traerlo, y un extra ausente es "sin
// extras", no una línea inválida.
const normalizarCartItem = (i: CartItem): CartItem => ({
  ...i,
  product: productoDeCarrito(i.product),
  selectedExtras: Array.isArray(i.selectedExtras)
    ? i.selectedExtras.filter((e) => typeof e === "string")
    : [],
});

const leerCarritoGuardado = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(CARRITO_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(esCartItemValido).map(normalizarCartItem);
    }
  } catch {
    // Datos corruptos o localStorage bloqueado: se arranca con carrito vacío.
  }
  return [];
};

const escribirCarritoGuardado = (items: CartItem[]) => {
  try {
    localStorage.setItem(CARRITO_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Sin cuota o con el almacenamiento deshabilitado: el carrito sigue
    // funcionando en memoria, simplemente no sobrevive a la recarga.
  }
};

const borrarCarritoGuardado = () => {
  try {
    localStorage.removeItem(CARRITO_STORAGE_KEY);
  } catch {
    // localStorage bloqueado: no hay nada que borrar.
  }
};

const leerCarritosDeUsuarios = (): CarritosPorUsuario => {
  try {
    const raw = localStorage.getItem(CARRITOS_USUARIOS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const carritos: CarritosPorUsuario = {};
      for (const [userId, items] of Object.entries(parsed as Record<string, unknown>)) {
        if (Array.isArray(items)) {
          carritos[userId] = items.filter(esCartItemValido).map(normalizarCartItem);
        }
      }
      return carritos;
    }
  } catch {
    // Datos corruptos o localStorage bloqueado: se empieza sin carritos.
  }
  return {};
};

const escribirCarritosDeUsuarios = (carritos: CarritosPorUsuario) => {
  try {
    localStorage.setItem(CARRITOS_USUARIOS_STORAGE_KEY, JSON.stringify(carritos));
  } catch {
    // Sin cuota o con el almacenamiento deshabilitado: el carrito sigue
    // funcionando en memoria, simplemente no sobrevive a la recarga.
  }
};

// Dos líneas son "el mismo producto con la misma configuración" cuando
// coinciden el producto, el tamaño y el conjunto de extras. El orden de los
// extras no cuenta: se comparan ordenados porque un cliente puede haberlos
// ticked en distinto orden en dos visitas al detalle. Es el mismo criterio con
// el que `quickAdd` agrupa las unidades de un producto sin extras, así que
// fusionar no desagrupa nada que ya se viera junto en pantalla.
const mismaConfig = (a: CartItem, b: CartItem) =>
  a.product.id === b.product.id &&
  a.size === b.size &&
  [...a.selectedExtras].sort().join("|") ===
    [...b.selectedExtras].sort().join("|");

// Al iniciar sesión, el carrito que el cliente ya tenía en pantalla (`base`, el
// local sin sesión) es el que manda: conserva su id de línea y su precio, o sea
// lo que se ve al volver al carrito. Lo que venía guardado en la cuenta se le
// suma encima cuando coincide producto, tamaño y extras, o se agrega al final
// como línea propia cuando es un producto distinto. Nada se descarta en
// ninguno de los dos casos.
const fusionarCarritos = (
  base: CartItem[],
  guardado: CartItem[],
): CartItem[] => {
  if (guardado.length === 0) return base;
  const fusionado = [...base];
  for (const item of guardado) {
    // Una línea con el MISMO id es la misma línea que ya está en pantalla, no
    // una unidad más: los ids se generan con marca de tiempo al agregar el
    // producto y sobreviven a la persistencia, así que un id repetido solo
    // puede ser la misma línea. Se conserva la de `base`, que es la que refleja
    // lo que el cliente acaba de hacer. Esto además hace la fusión
    // idempotente: entrar en la cuenta, salir y volver a entrar no duplica el
    // carrito.
    if (fusionado.some((x) => x.id === item.id)) continue;
    const i = fusionado.findIndex((x) => mismaConfig(x, item));
    if (i === -1) {
      fusionado.push(item);
    } else {
      fusionado[i] = {
        ...fusionado[i],
        quantity: fusionado[i].quantity + item.quantity,
      };
    }
  }
  return fusionado;
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [ordenRecepcion, setOrdenRecepcion] =
    useState<OrdenCompra | null>(null);
  const [showNuevaOrden, setShowNuevaOrden] = useState(false);
  const [showNuevaCompra, setShowNuevaCompra] = useState(false);
  const [ordenDetalle, setOrdenDetalle] = useState<OrdenCompra | null>(null);
  // El carrito arranca desde lo que quedó guardado: sin esto, recargar la
  // página, cambiar de categoría o abrir el detalle de otro producto borraba
  // lo que el cliente había agregado sin haber iniciado sesión. El catálogo y
  // la compra no cambian: solo se recupera el estado que ya estaba en pantalla.
  const [cart, setCart] = useState<CartItem[]>(leerCarritoGuardado);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ventas, setVentas] = useState<Venta[]>(INITIAL_VENTAS);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [orderConfirmation, setOrderConfirmation] = useState<string | null>(null);
  const [loginNotice, setLoginNotice] = useState(false);
  // Catálogo de productos. Lo consumen GestionProductosScreen y
  // OrdenProduccionScreen (`productos` / `setProductos`). El merge de develop
  // trajó las dos pantallas pero no este estado: `INITIAL_PRODUCTOS` y el tipo
  // `Producto` quedaron importados y sin usar, y App reventaba con
  // "ReferenceError: productos is not defined" al renderizar el dashboard.
  const [productos, setProductos] = useState<Producto[]>(INITIAL_PRODUCTOS);
  const [userRole, setUserRole] = useState("Administrador");
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Rol[]>(leerRolesPersistidos);
  const [usuarios, setUsuarios] = useState<Usuario[]>(leerUsuariosPersistidos);
  const [empleados, setEmpleados] = useState<Empleado[]>(leerEmpleadosPersistidos);
  const [clientes, setClientes] = useState<Cliente[]>(INITIAL_CLIENTES);

  // Mantiene el listado general como la union de las cuentas de empleados y
  // clientes. Los perfiles que comparten correo siguen siendo una sola cuenta.
  useEffect(() => {
    setUsuarios(prev => {
      const next = [...prev];
      const porCorreo = new Map(next.map(usuario => [usuario.correo.trim().toLowerCase(), usuario]));
      let changed = false;
      const siguienteId = () => {
        const max = next.reduce((value, usuario) => {
          const numero = parseInt(usuario.id.replace("USR-", ""), 10) || 0;
          return Math.max(value, numero);
        }, 0);
        return `USR-${String(max + 1).padStart(3, "0")}`;
      };

      empleados.forEach(empleado => {
        const correo = empleado.correo.trim().toLowerCase();
        const base = {
          nombre: empleado.nombre,
          iniciales: empleado.iniciales,
          avatarColor: empleado.avatarColor,
          correo: empleado.correo,
          telefono: empleado.telefono,
          tipoDocumento: empleado.tipoDocumento,
          numeroDocumento: empleado.numeroDocumento,
          rolId: empleado.rolId,
          activo: empleado.activo,
        };
        const existente = porCorreo.get(correo);
        if (existente) {
          const actualizado = { ...existente, ...base };
          if (JSON.stringify(actualizado) !== JSON.stringify(existente)) {
            const indice = next.findIndex(usuario => usuario.id === existente.id);
            next[indice] = actualizado;
            porCorreo.set(correo, actualizado);
            changed = true;
          }
        } else {
          const nuevo = { id: siguienteId(), ...base };
          next.push(nuevo);
          porCorreo.set(correo, nuevo);
          changed = true;
        }
      });

      const correosEmpleado = new Set(empleados.map(e => e.correo.trim().toLowerCase()));
      clientes.forEach(cliente => {
        const correo = cliente.correo.trim().toLowerCase();
        if (correosEmpleado.has(correo)) return;
        const existente = porCorreo.get(correo);
        const base = {
          nombre: cliente.nombre,
          iniciales: cliente.iniciales,
          avatarColor: cliente.avatarColor,
          correo: cliente.correo,
          telefono: existente?.telefono ?? "",
          tipoDocumento: cliente.tipoDocumento,
          numeroDocumento: cliente.numeroDocumento,
          rolId: "ROL-002",
          activo: cliente.activo,
        };
        if (existente) {
          const actualizado = { ...existente, ...base };
          if (JSON.stringify(actualizado) !== JSON.stringify(existente)) {
            const indice = next.findIndex(usuario => usuario.id === existente.id);
            next[indice] = actualizado;
            porCorreo.set(correo, actualizado);
            changed = true;
          }
        } else {
          const nuevo = { id: siguienteId(), ...base };
          next.push(nuevo);
          porCorreo.set(correo, nuevo);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [empleados, clientes]);

  // Fuente de lectura del listado general: combina cualquier cuenta existente
  // con los perfiles de Clientes y Empleados, sin repetir personas por correo.
  const usuariosUnificados = useMemo(() => {
    const next = [...usuarios];
    const porCorreo = new Map(next.map(usuario => [usuario.correo.trim().toLowerCase(), usuario]));
    const siguienteId = () => {
      const max = next.reduce((value, usuario) => {
        const numero = parseInt(usuario.id.replace("USR-", ""), 10) || 0;
        return Math.max(value, numero);
      }, 0);
      return `USR-${String(max + 1).padStart(3, "0")}`;
    };

    empleados.forEach(empleado => {
      const correo = empleado.correo.trim().toLowerCase();
      const base = {
        nombre: empleado.nombre,
        iniciales: empleado.iniciales,
        avatarColor: empleado.avatarColor,
        correo: empleado.correo,
        telefono: empleado.telefono,
        tipoDocumento: empleado.tipoDocumento,
        numeroDocumento: empleado.numeroDocumento,
        rolId: empleado.rolId,
        activo: empleado.activo,
      };
      const existente = porCorreo.get(correo);
      if (existente) {
        const actualizado = { ...existente, ...base };
        const indice = next.findIndex(usuario => usuario.id === existente.id);
        next[indice] = actualizado;
        porCorreo.set(correo, actualizado);
      } else {
        const nuevo = { id: siguienteId(), ...base };
        next.push(nuevo);
        porCorreo.set(correo, nuevo);
      }
    });

    const correosEmpleado = new Set(empleados.map(e => e.correo.trim().toLowerCase()));
    clientes.forEach(cliente => {
      const correo = cliente.correo.trim().toLowerCase();
      const existente = porCorreo.get(correo);
      if (correosEmpleado.has(correo)) return;
      const base = {
        nombre: cliente.nombre,
        iniciales: cliente.iniciales,
        avatarColor: cliente.avatarColor,
        correo: cliente.correo,
        telefono: existente?.telefono ?? "",
        tipoDocumento: cliente.tipoDocumento,
        numeroDocumento: cliente.numeroDocumento,
        rolId: "ROL-002",
        activo: cliente.activo,
      };
      if (existente) {
        const actualizado = { ...existente, ...base };
        const indice = next.findIndex(usuario => usuario.id === existente.id);
        next[indice] = actualizado;
        porCorreo.set(correo, actualizado);
      } else {
        const nuevo = { id: siguienteId(), ...base };
        next.push(nuevo);
        porCorreo.set(correo, nuevo);
      }
    });

    return next;
  }, [usuarios, empleados, clientes]);

  // Derived display values for top bar and sidebar permissions
  const loggedInUser = loggedInUserId ? usuarios.find(u => u.id === loggedInUserId) ?? null : null;
  const loggedInUserName = loggedInUser?.nombre ?? "Gloria";
  // Nombre con el que se guardan y se buscan los pedidos del usuario en sesión
  const pedidosUsuarioNombre =
    loggedInUser?.nombre ??
    (userRole === "Cliente" ? "Sebastián Gómez" : "Gloria Inés Vargas");
  // Un rol DESACTIVADO no concede permisos. El formulario de empleados ya
  // respetaba este flag al ofrecer roles (`roles.find(r => r.activo)`); el acceso
  // no, y por eso un rol desactivado seguía dando lo mismo que antes de apagarlo.
  // Un rol ausente (borrado) también queda sin permisos: antes `!loggedInRol`
  // concedía acceso TOTAL, de modo que borrar un rol desde Configuración
  // convertía a sus usuarios en administradores completos. Esos usuarios ahora
  // caen en la pantalla de "sin permisos" vía `noAccess`.
  const loggedInRol = loggedInUser
    ? roles.find(r => r.id === loggedInUser.rolId && r.activo) ?? null
    : null;
  const loggedInRoleName = loggedInRol?.nombre ?? userRole;
  // AccesosMap for the logged-in user's role (empty object = no permissions)
  const loggedInAccesos: AccesosMap = loggedInRol?.accesos ?? {};
  // El atajo se ancla al rol SEMILLA por id, no por nombre. Así renombrar el rol
  // no altera el acceso, y ningún rol con permisos parciales puede apropiárselo
  // por llamarse "Administrador". Cualquier otro rol —incluso con acceso
  // total— se decide únicamente por sus permisos.
  const isNamedAdmin = loggedInRol?.id === "ROL-001";
  const hasDashboardAccess =
    isNamedAdmin || (loggedInAccesos[DASHBOARD_PERM_KEY]?.includes("Ver") ?? false);
  const adminHomeScreen: Screen = hasDashboardAccess ? "dashboard" : "inicio";
  // True when the logged-in user has a back-office role (not a pure public customer)
  const isStaff = isLoggedIn && loggedInUser !== null && (
    empleados.some(e => e.correo.trim().toLowerCase() === loggedInUser.correo.trim().toLowerCase()) ||
    !PUBLIC_ROLE_NAMES.includes(loggedInRoleName)
  );

  // El usuario de la sesión puede tener ficha de empleado además de la de
  // usuario. El vínculo entre ambas listas es el correo (ver `upsertUsuario` en
  // la pantalla de Empleados), porque no comparten identificador.
  const loggedInEmpleado = loggedInUser
    ? empleados.find(e => e.correo.trim().toLowerCase() === loggedInUser.correo.trim().toLowerCase()) ?? null
    : null;

  // Returns action permissions for a given screen based on the logged-in user's role
  const getPerms = (s: Screen) => {
    const key = SCREEN_PERM_KEY[s];
    if (!key || isNamedAdmin || hasDashboardAccess) return { canCreate: true, canEdit: true, canDelete: true };
    const acts = loggedInAccesos[key] ?? [];
    return {
      canCreate: acts.includes("Crear"),
      canEdit:   acts.includes("Editar"),
      canDelete: acts.includes("Eliminar"),
    };
  };

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<Product>(PRODUCTS[0]);
  const [catalogCat, setCatalogCat] = useState("Todas");
  // La página del catálogo vive aquí, igual que la categoría: si viviera dentro
  // de CatalogScreen se perdería al abrir el detalle de un producto (la pantalla
  // se desmonta) y al volver se restauraría el scroll guardado de la página 2
  // sobre el grid de la página 1, que es otra tanda de productos.
  const [catalogPage, setCatalogPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [orders] = useState<Order[]>(ORDERS);
  const [ordenes, setOrdenes] =
    useState<OrdenCompra[]>(INITIAL_ORDENES);
  const [gestiones, setGestiones] = useState<GestionCompra[]>(
    INITIAL_GESTIONES,
  );
  const [insumos, setInsumos] =
    useState<Insumo[]>(INITIAL_INSUMOS);
  const [proveedores, setProveedores] = useState<ProveedorRef[]>(
    PROVEEDORES_INIT,
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Cada cambio del carrito se guarda donde corresponde: en la clave de
  // invitado mientras no hay sesión, y en el registro del usuario en cuanto la
  // hay. Al abrirse la sesión la clave de invitado se borra porque su contenido
  // ya quedó absorbido en el carrito de la cuenta, y dejarla ahí lo volvería a
  // sumar en el próximo inicio de sesión de ese mismo usuario.
  useEffect(() => {
    if (loggedInUserId) {
      const carritos = leerCarritosDeUsuarios();
      carritos[loggedInUserId] = cart;
      escribirCarritosDeUsuarios(carritos);
      borrarCarritoGuardado();
      return;
    }
    escribirCarritoGuardado(cart);
  }, [cart, loggedInUserId]);

  // Al abrir el detalle de un producto se guarda dónde estaba el catálogo. Como
  // la navegación es un simple `setScreen`, al volver el grid se rearmaba desde
  // arriba (el `scrollTo(0)` de más abajo) y el cliente perdía la sección y el
  // producto que estaba mirando. Se guarda por pantalla y se restaura al
  // regresar, sin tocar el resto de navegaciones que sí deben ir arriba.
  const scrollPorPantalla = useRef<Partial<Record<Screen, number>>>({});

  const navigate = (
    s: Screen,
    options?: { replace?: boolean; restaurar?: boolean },
  ) => {
    if (!options?.restaurar) {
      scrollPorPantalla.current[screen] = window.scrollY;
    }
    setScreen(s);
    if (options?.replace) {
      window.history.replaceState(null, "", "/");
    }
    if (options?.restaurar) {
      const top = scrollPorPantalla.current[s] ?? 0;
      // La pantalla entrante todavía no está pintada cuando corre este efecto,
      // así que se espera un frame para que el alto del documento sea real.
      requestAnimationFrame(() =>
        window.scrollTo({ top, behavior: "auto" }),
      );
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setDrawerOpen(false);
  };

  const openLogin = () => {
    setLoginNotice(false);
    navigate("login");
  };

  const handleLogin = (user: Usuario) => {
    console.log("[login] handleLogin recibió usuario", {
      id: user.id,
      correo: user.correo,
      rolId: user.rolId,
    });
    setIsLoggedIn(true);
    setLoginNotice(false);

    const orderToResume = pendingOrder;
    if (orderToResume) {
      registrarPedido(
        orderToResume.metodoPago,
        orderToResume.comprobante,
        orderToResume.items,
        orderToResume.horaRecogida,
        orderToResume.nombre,
        orderToResume.documento,
      );
      setCart([]);
      setOrderConfirmation(orderToResume.horaRecogida);
      window.setTimeout(() => {
        setPendingOrder(null);
        navigate("cart");
      }, 0);
    }

    setLoggedInUserId(user.id);
    const guardado = leerCarritosDeUsuarios()[user.id] ?? [];
    setCart((prev) => fusionarCarritos(prev, guardado));

    const namedRol = roles.find(r => r.id === user.rolId) ?? null;
    const isEmployee = empleados.some(
      e => e.correo.trim().toLowerCase() === user.correo.trim().toLowerCase(),
    );
    const goPublic = namedRol ? !isEmployee && PUBLIC_ROLE_NAMES.includes(namedRol.nombre) : false;
    const loginHasDashboard =
      namedRol?.id === "ROL-001" ||
      (namedRol?.accesos[DASHBOARD_PERM_KEY]?.includes("Ver") ?? false);
    const nextRole = goPublic ? "Cliente" : (namedRol?.nombre ?? "Empleado");
    const nextScreen = goPublic
      ? "catalog"
      : loginHasDashboard
        ? "dashboard"
        : "inicio";

    console.log("[login] rol y navegación", {
      rol: namedRol?.nombre ?? "sin rol",
      isEmployee,
      isStaff: isEmployee || !PUBLIC_ROLE_NAMES.includes(namedRol?.nombre ?? ""),
      nextRole,
      nextScreen,
    });

    setUserRole(nextRole);
    if (!orderToResume) {
      console.log("[login] navegando", nextScreen);
      navigate(nextScreen);
    }
  };

  const quickAdd = (product: Product) => {
    const existing = cart.find(
      (i) =>
        i.product.id === product.id &&
        i.selectedExtras.length === 0,
    );
    if (existing) {
      setCart((p) =>
        p.map((i) =>
          i.id === existing.id
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        ),
      );
    } else {
      const size = sizeDe(product, 0);
      setCart((p) => [
        ...p,
        {
          id: `${product.id}-${Date.now()}`,
          product,
          quantity: 1,
          size: size.label,
          sizePrice: size.price,
          selectedExtras: [],
          extrasPrice: 0,
        },
      ]);
    }
  };

  const addDetailed = (item: CartItem) =>
    setCart((p) => [...p, item]);

  const registrarPedido = (
    metodoPago: string,
    comprobante: string,
    items: CartItem[],
    horaRecogida: string,
    clienteNombre?: string,
    clienteDocumento?: string,
  ) => {
    const newVenta: Venta = {
      id: `VEN-${String(ventas.length + 1).padStart(3, "0")}`,
      usuario: clienteNombre?.trim() || pedidosUsuarioNombre,
      documento: clienteDocumento?.trim() || undefined,
      fecha: new Date().toLocaleDateString("en-CA"),
      productos: items
        .map((i) => `${i.product.name} x${i.quantity}`)
        .join(", "),
      cantidad: items.reduce((s, i) => s + i.quantity, 0),
      total: items.reduce(
        (s, i) => s + (i.sizePrice + i.extrasPrice) * i.quantity,
        0,
      ),
      estado: "por-verificar" as VentaStatus,
      metodoPago,
      comprobante,
      horaRecogida,
      // El historial es lo que alimenta la columna "Hora de estado" del panel
      // de ventas: sin esta entrada el pedido aparecería sin hora.
      historial: [
        {
          estado: "por-verificar" as VentaStatus,
          hora: new Date().toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ],
      detalle: items.map((i) => ({
        nombre: `${i.product.name} — ${i.size}`,
        precio: i.sizePrice + i.extrasPrice,
        cantidad: i.quantity,
        imagen: i.product.image,
        extras: i.selectedExtras,
      })),
    };
    setVentas((prev) => [newVenta, ...prev]);
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart((p) => p.filter((i) => i.id !== id));
      return;
    }
    setCart((p) =>
      p.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
    );
  };

  const remove = (id: string) => {
    setCart((p) => p.filter((i) => i.id !== id));
    toast.success("Producto eliminado del carrito");
  };

  const clearAuthStorage = () => {
    for (const storage of [window.localStorage, window.sessionStorage]) {
      try {
        for (const key of AUTH_STORAGE_KEYS) storage.removeItem(key);
      } catch {
        // El almacenamiento puede estar bloqueado por el navegador.
      }
    }

    // Solo se pueden eliminar cookies accesibles desde JavaScript.
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=", 1)[0]?.trim();
      if (name) document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  };

  // El frontend actual no tiene endpoint de logout. Si se configura uno para
  // una integración futura, la limpieza local sigue ocurriendo en finally.
  const logout = async () => {
    try {
      const endpoint = import.meta.env.VITE_AUTH_LOGOUT_URL;
      if (endpoint) {
        await fetch(endpoint, { method: "POST", credentials: "include" });
      }
    } catch {
      // La sesión local debe cerrarse aunque el servidor no responda.
    } finally {
      clearAuthStorage();
      setIsLoggedIn(false);
      setUserRole("");
      setLoggedInUserId(null);
      navigate("landing", { replace: true });
      toast.success("Has cerrado sesión correctamente");
    }
  };

  // Un usuario sin ficha o sin rol activo no es una sesión válida. La cuenta
  // legacy de cliente es la única excepción porque no tiene ficha en usuarios.
  const hasValidSession = isLoggedIn && (
    userRole === "Cliente" || (loggedInUser !== null && loggedInRol !== null)
  );

  // Un cliente público (rol "Cliente" y sin ficha de empleado) es el único que no
  // entra al panel. Cualquier otro rol —incluidos los ROL-00X personalizados—
  // entra según SUS permisos, sin programarlos nombre por nombre: antes esta
  // línea comparaba `userRole === "Administrador"`, así que un rol personalizado
  // caía en `false` y el guard de abajo lo expulsaba a la landing. Es el mismo
  // criterio de "cliente público" que ya usa el `goPublic` del login.
  const esClientePublico =
    PUBLIC_ROLE_NAMES.includes(loggedInRoleName) && loggedInEmpleado === null;
  const isAdminRole = hasValidSession && !esClientePublico;
  const isAdmin = ADMIN_SCREENS.includes(screen) && isAdminRole;
  const isAuth = screen === "login" || screen === "register";

  useEffect(() => {
    if (isLoggedIn && !hasValidSession && !pendingOrder) void logout();
  }, [isLoggedIn, hasValidSession, pendingOrder]);

  // If a client or an invalid session somehow lands on an admin screen, send
  // them out of the protected area.
  if (
    (!hasValidSession || !isAdminRole) &&
    ADMIN_SCREENS.includes(screen)
  ) {
    setTimeout(() => navigate("landing", { replace: true }), 0);
  }

  if (!hasValidSession && screen === "mis-pedidos") {
    setTimeout(() => navigate("landing", { replace: true }), 0);
  }

  // Dashboard and Inicio are mutually exclusive landing screens. Other admin
  // screens remain protected by their module permission below.
  if (isLoggedIn && isAdminRole && screen === "dashboard" && !hasDashboardAccess) {
    setTimeout(() => navigate("inicio"), 0);
  }
  if (isLoggedIn && isAdminRole && screen === "inicio" && hasDashboardAccess) {
    setTimeout(() => navigate("dashboard"), 0);
  }
  if (isLoggedIn && isAdminRole && screen !== "dashboard" && screen !== "inicio" && screen !== "profile" && screen !== "store-profile") {
    // Toda pantalla de administración con permKey queda cubierta por esta regla.
    // La lista legacy ADMIN_ONLY_SCREENS se eliminó: sus tres pantallas
    // (gestion-config, users, empleados) ya declaran permKey en SCREEN_PERM_KEY,
    // así que el fallback nunca se disparaba.
    const permKey = SCREEN_PERM_KEY[screen];
    if (permKey && !isNamedAdmin && !hasDashboardAccess && !(loggedInAccesos[permKey]?.includes("Ver") ?? false)) {
      setTimeout(() => navigate(adminHomeScreen), 0);
    }
  }

  const sideW = isAdmin
    ? sidebarCollapsed
      ? "ml-16"
      : "ml-60"
    : "";

  const isLockedScreen = isAdmin && (
    screen === "clientes" || screen === "users" || screen === "empleados" ||
    // Módulo de Compra / Orden de Compra: ocupa el viewport y scrollea por dentro
    screen === "orden-compra" || screen === "nueva-orden-compra" ||
    screen === "recepcion-compra" || screen === "gestion-compra" ||
    screen === "nueva-compra" || screen === "orden-detalle"
  );

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: "var(--font-texto)" }}
    >
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: "var(--font-texto)",
            fontSize: "15px",
          },
        }}
      />

      {/* Sidebar */}
      {isAdmin && (
        <Sidebar
          current={screen}
          navigate={navigate}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          darkMode={darkMode}
           userRole={userRole}
           accesos={loggedInAccesos}
           isNamedAdmin={isNamedAdmin}
           hasDashboardAccess={hasDashboardAccess}
        />
      )}

      <div
        className={`transition-all duration-300 ${sideW} flex flex-col min-h-screen${isLockedScreen ? " h-dvh min-h-dvh overflow-hidden" : ""}`}
      >
        {/* Public navbar */}
        {!isAdmin && !isAuth && (
          <PublicNav
            navigate={navigate}
            onLogin={openLogin}
            cart={cart}
            isLoggedIn={isLoggedIn}
            isStaff={isStaff}
            loggedInUser={loggedInUser ? { iniciales: loggedInUser.iniciales, avatarColor: loggedInUser.avatarColor } : null}
            onLogout={logout}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        )}

        {/* Admin topbar */}
        {isAdmin && (
          <AdminTopBar
            current={screen}
            onToggleSidebar={() =>
              setSidebarCollapsed((p) => !p)
            }
            navigate={navigate}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            userName={loggedInUserName}
            roleName={loggedInRoleName}
            homeScreen={adminHomeScreen}
          />
        )}

        {/* Screen content */}
        <main
          className={[
            !isAdmin && !isAuth ? "pb-20 md:pb-0" : "",
            !isAdmin && !isAuth && screen !== "landing"
              ? "pt-20"
              : "",
            isLockedScreen ? " flex-1 min-h-0" : "",
          ].join(" ")}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              className="h-full"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {screen === "landing" && (
                <LandingScreen
                  navigate={navigate}
                  setProduct={setSelectedProduct}
                  onCategoryNavigate={(cat) => {
                    setCatalogCat(cat);
                    navigate("catalog");
                  }}
                />
              )}
              {screen === "catalog" && (
                <CatalogScreen
                  key={catalogCat}
                  navigate={navigate}
                  setProduct={setSelectedProduct}
                  quickAdd={quickAdd}
                  initialCat={catalogCat}
                  page={catalogPage}
                  setPage={setCatalogPage}
                  productos={productos.map((p) => ({
                    id: parseInt(p.id.replace("PROD-", ""), 10) || 0,
                    name: p.nombre,
                    description: DESCRIPCIONES[p.nombre] ?? "",
                    price: p.precioUnitario,
                    image: IMAGENES_PIZZA[p.nombre] || p.imagen || "https://images.unsplash.com/photo-1564936281403-5cc7543df8e2?w=600&h=600&fit=crop",
                    category: p.idCategoria === "CAT-001" ? "Pizzas" : p.idCategoria === "CAT-002" ? "Lasaña" : "Bebidas",
                    sizes: p.idCategoria === "CAT-001" ? SIZES_DEFAULT : p.idCategoria === "CAT-002" ? SIZES_LASANA : [],
                    extras: [],
                    status: p.estado === "Disponible" ? "disponible" : "no disponible",
                    rating: 4.5,
                    sales: 0,
                  }))}
                />
              )}
              {screen === "product-detail" && (
                <ProductDetailScreen
                  product={selectedProduct}
                  navigate={navigate}
                  addDetailed={addDetailed}
                />
              )}
              {screen === "cart" && (
                <CartScreen
                  cart={cart}
                  navigate={navigate}
                  updateQty={updateQty}
                  remove={remove}
                  clear={() => setCart([])}
                  onOrder={registrarPedido}
                  isLoggedIn={isLoggedIn}
                  onRequireLogin={(order) => {
                    setPendingOrder(order);
                    setLoginNotice(true);
                    openLogin();
                  }}
                  confirmationHora={orderConfirmation ?? undefined}
                  clienteSesion={loggedInUser?.nombre}
                />
              )}
              {screen === "mis-pedidos" && (
                <MisPedidosScreen
                  pedidos={ventas}
                  usuarioNombre={pedidosUsuarioNombre}
                  onVerMenu={() => navigate("catalog")}
                />
              )}
              {screen === "login" && (
                  <LoginScreen
                    navigate={navigate}
                    usuarios={usuarios}
                    darkMode={darkMode}
                    loginNotice={loginNotice}
                    onLogin={handleLogin}
                />
              )}
              {screen === "register" && (
                <RegisterScreen
                  navigate={navigate}
                  usuarios={usuarios}
                  setUsuarios={setUsuarios}
                  empleados={empleados}
                  clientes={clientes}
                  darkMode={darkMode}
                />
              )}
              {screen === "client-profile" && (
                <ClientProfileScreen
                  navigate={navigate}
                  onLogout={logout}
                  loggedInUser={loggedInUser ? {
                    id: loggedInUser.id,
                    nombre: loggedInUser.nombre,
                    iniciales: loggedInUser.iniciales,
                    avatarColor: loggedInUser.avatarColor,
                    correo: loggedInUser.correo,
                    telefono: loggedInUser.telefono,
                    tipoDocumento: loggedInUser.tipoDocumento,
                    numeroDocumento: loggedInUser.numeroDocumento,
                  } : null}
                  loggedInRoleName={loggedInRoleName}
                  isStaff={isStaff}
                  adminHomeScreen={adminHomeScreen}
                  onUpdateUser={(id, data) => {
                    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
                  }}
                />
              )}
              {((screen === "dashboard" && hasDashboardAccess) || (screen === "inicio" && !hasDashboardAccess)) && (
                <DashboardScreen
                  navigate={navigate}
                  ventas={ventas}
                  loggedInUser={loggedInUser}
                  loggedInRoleName={loggedInRoleName}
                  tieneRolActivo={loggedInRol !== null}
                  isNamedAdmin={isNamedAdmin}
                  hasDashboardAccess={hasDashboardAccess}
                  accesos={loggedInAccesos}
                />
              )}
              {screen === "manage-products" && (
                <ManageProductsScreen />
              )}
              {screen === "orders" && (
                <OrdersScreen initialOrders={orders} />
              )}
              {screen === "purchases" && <PurchasesScreen />}
              {screen === "perecederos" && (
                <ProductosPerecederosScreen
                  {...getPerms("perecederos")}
                  ventasPerdidas={ventas
                    .filter((v) => v.estado === "perdida")
                    .map((v) => ({
                      id: v.id,
                      usuario: v.usuario,
                      fecha: v.fecha,
                      productos: v.productos,
                      cantidad: v.cantidad,
                      total: v.total,
                    }))}
                />
              )}
              {screen === "orden-compra" && (
                <>
                  <OrdenCompraScreen
                    {...getPerms("orden-compra")}
                    ordenes={ordenes}
                    setOrdenes={setOrdenes}
                    gestiones={gestiones}
                    setGestiones={setGestiones}
                    proveedores={proveedores}
                    setProveedores={setProveedores}
                    insumos={insumos}
                    setInsumos={setInsumos}
                    onAbrirRecepcion={(orden) => {
                      setOrdenRecepcion(orden);
                      setScreen("recepcion-compra");
                    }}
                    onNuevaOrden={() => setShowNuevaOrden(true)}
                    onVerDetalle={(orden) => {
                      setOrdenDetalle(orden);
                      setScreen("orden-detalle");
                    }}
                  />
                  {showNuevaOrden && (
                    <NuevaOrdenCompraPage
                      ordenes={ordenes}
                      setOrdenes={setOrdenes}
                      proveedores={proveedores}
                      setProveedores={setProveedores}
                      insumos={insumos}
                      onBack={() => setShowNuevaOrden(false)}
                    />
                  )}
                </>
              )}
              {screen === "recepcion-compra" && ordenRecepcion && (
                <RecepcionCompraScreen
                  orden={ordenRecepcion}
                  insumos={insumos}
                  gestiones={gestiones}
                  setGestiones={setGestiones}
                  onGuardar={(recepcion, estado) => {
                    setOrdenes((prev) =>
                      prev.map((o) =>
                        o.id === ordenRecepcion.id
                          ? {
                              ...o,
                              estado,
                              recepcion,
                            }
                          : o
                      )
                    );

                    setOrdenRecepcion(null);
                  }}
                  onBack={() => {
                    setOrdenRecepcion(null);
                    setScreen("orden-compra");
                  }}
                />
              )}
              {screen === "orden-detalle" && ordenDetalle && (
                <OrdenDetallePage
                  orden={ordenDetalle}
                  gestiones={gestiones}
                  onBack={() => {
                    setOrdenDetalle(null);
                    setScreen("orden-compra");
                  }}
                  onEditar={(orden) => {
                    setOrdenDetalle(null);
                    setScreen("orden-compra");
                    // TODO: Implementar edición
                  }}
                  onAbrirRecepcion={(orden) => {
                    setOrdenDetalle(null);
                    setScreen("orden-compra");
                    // TODO: Implementar apertura de recepción
                  }}
                />
              )}
              {screen === "gestion-compra" && (
                <>
                  <GestionCompraScreen
                    {...getPerms("gestion-compra")}
                    gestiones={gestiones}
                    setGestiones={setGestiones}
                    ordenes={ordenes}
                    setOrdenes={setOrdenes}
                    insumos={insumos}
                    proveedores={proveedores}
                    setProveedores={setProveedores}
                    onNuevaCompra={() => setShowNuevaCompra(true)}
                  />
                  {showNuevaCompra && (
                    <NuevaCompraPage
                      gestiones={gestiones}
                      setGestiones={setGestiones}
                      proveedores={proveedores}
                      setProveedores={setProveedores}
                      insumos={insumos}
                      onBack={() => setShowNuevaCompra(false)}
                    />
                  )}
                </>
              )}
              {screen === "suppliers" && <SuppliersScreen {...getPerms("suppliers")} />}
              {screen === "ventas-pedidos" && (
                <VentasScreen
                  {...getPerms("ventas-pedidos")}
                  pedidos={ventas}
                  setPedidos={setVentas}
                />
              )}
              {screen === "devoluciones" && (
                <DevolucionesScreen
                  pedidos={ventas}
                  setPedidos={setVentas}
                />
              )}
              {screen === "gestion-productos" && (
                <GestionProductosScreen
                  {...getPerms("gestion-productos")}
                  productos={productos}
                  setProductos={setProductos}
                  insumos={insumos}
                />
              )}
              {screen === "cat-producto" && (
                <CategoriaProductoScreen {...getPerms("cat-producto")} />
              )}
               {screen === "gestion-roles" && (
                <GestionConfigScreen
                  userRole={userRole}
                  roles={roles}
                  setRoles={setRoles}
                  rolUserCounts={Object.fromEntries(
                    roles.map(r => [r.id, usuarios.filter(u => u.rolId === r.id).length])
                  )}
                />
              )}
              {screen === "sales-chart" && (
                <SalesChartScreen
                  onBack={() => navigate(adminHomeScreen)}
                />
              )}
              {screen === "clientes" && (
                <GestionClientesScreen
                  {...getPerms("clientes")}
                  clientes={clientes}
                  setClientes={setClientes}
                  empleados={empleados}
                  usuarios={usuarios}
                />
              )}
               {screen === "users" && (
                 <GestionUsuariosScreen
                   userRole={userRole}
                   roles={roles}
                   usuarios={usuariosUnificados}
                  setUsuarios={setUsuarios}
                  empleados={empleados}
                  setEmpleados={setEmpleados}
                  clientes={clientes}
                />
              )}
              {screen === "empleados" && (
                <GestionEmpleadosScreen
                  roles={roles}
                  usuarios={usuarios}
                  empleados={empleados}
                  setEmpleados={setEmpleados}
                  setUsuarios={setUsuarios}
                  clientes={clientes}
                />
              )}
              {screen === "production-orders" && (
                <OrdenProduccionScreen
                  {...getPerms("production-orders")}
                  productos={productos}
                  setProductos={setProductos}
                />
              )}
              {screen === "finished-products" && (
                <ProductoTerminadoScreen />
              )}
              {screen === "store-profile" && (
                <MiPerfilScreen
                  userRole={userRole}
                  navigate={navigate as (s: string) => void}
                  onLogout={logout}
                  isStaff={isStaff}
                  loggedInUser={loggedInUser ? {
                    id: loggedInUser.id,
                    nombre: loggedInUser.nombre,
                    iniciales: loggedInUser.iniciales,
                    avatarColor: loggedInUser.avatarColor,
                    correo: loggedInUser.correo,
                    telefono: loggedInUser.telefono,
                    tipoDocumento: loggedInUser.tipoDocumento,
                    numeroDocumento: loggedInUser.numeroDocumento,
                  } : null}
                  loggedInRoleName={loggedInRoleName}
                  adminHomeScreen={adminHomeScreen}
                  onUpdateUser={(id, data) => {
                    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
                  }}
                  contrataciones={loggedInEmpleado?.contrataciones}
                  rolNombreDe={(rolId) => roles.find(r => r.id === rolId)?.nombre ?? rolId}
                  inStore
                />
              )}
              {screen === "profile" && (
                <MiPerfilScreen
                  userRole={userRole}
                  navigate={navigate as (s: string) => void}
                  onLogout={logout}
                  isStaff={isStaff}
                  loggedInUser={loggedInUser ? {
                    id: loggedInUser.id,
                    nombre: loggedInUser.nombre,
                    iniciales: loggedInUser.iniciales,
                    avatarColor: loggedInUser.avatarColor,
                    correo: loggedInUser.correo,
                    telefono: loggedInUser.telefono,
                    tipoDocumento: loggedInUser.tipoDocumento,
                    numeroDocumento: loggedInUser.numeroDocumento,
                  } : null}
                  loggedInRoleName={loggedInRoleName}
                  adminHomeScreen={adminHomeScreen}
                  onUpdateUser={(id, data) => {
                    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
                  }}
                  contrataciones={loggedInEmpleado?.contrataciones}
                  rolNombreDe={(rolId) => roles.find(r => r.id === rolId)?.nombre ?? rolId}
                />
              )}
              {screen === "tech-sheet" && <RecetasScreen />}
              {screen === "supplies" && (
                <GestionInsumosScreen
                  {...getPerms("supplies")}
                  insumos={insumos}
                  setInsumos={setInsumos}
                />
              )}
              {isAdmin &&
                ![
                  "dashboard",
                  "inicio",
                  "manage-products",
                  "orders",
                  "purchases",
                  "suppliers",
                  "ventas-pedidos",
                  "gestion-productos",
                  "cat-producto",
                   "gestion-roles",
                  "clientes",
                  "users",
                  "empleados",
                  "production-orders",
                  "finished-products",
                  "profile",
                  "tech-sheet",
                  "supplies",
                  "sales-chart",
                  "perecederos",
                  "orden-compra",
                  "nueva-orden-compra",
                  "recepcion-compra",
                  "gestion-compra",
                  "nueva-compra",
                  "devoluciones",
                ].includes(screen) && (
                  <GenericAdmin
                    screen={screen}
                    navigate={navigate}
                    homeScreen={adminHomeScreen}
                  />
                )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Admin footer (en Usuarios/Clientes/Empleados queda como fila fija, sin scroll de página) */}
        {isAdmin && (
          <footer
            className={`border-t border-border bg-card mt-auto${isLockedScreen ? " shrink-0" : ""}`}
          >
            <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <img src={darkMode ? logoBlanco : logoClaro} alt="S.I.V.PRO Logo" className="h-9 w-auto object-contain shrink-0" />
                <div>
                  <p className="text-sm font-bold text-foreground leading-tight">
                    La Sirena Pizza
                  </p>
                  <p className="text-xs text-muted-foreground">
                    S.I.V.PRO — Panel Administrativo
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                © 2026 La Sirena Pizza · Medellín, Colombia ·
                Desde 1994
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <span>(+57) 604 444 5555</span>
              </div>
            </div>
          </footer>
        )}

        {/* Mobile bottom nav */}
        {!isAdmin && !isAuth && (
          <BottomNav
            navigate={navigate}
            cart={cart}
            current={screen}
            onMore={() => setDrawerOpen(true)}
          />
        )}
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigate={navigate}
        onLogin={openLogin}
        cart={cart}
        isLoggedIn={isLoggedIn}
        onLogout={logout}
      />

      <style>{`
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
