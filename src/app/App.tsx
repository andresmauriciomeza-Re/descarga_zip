import { useState, useEffect, useMemo, useRef } from "react";
import { Toaster, toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  ShoppingCart,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Search,
  Star,
  Package,
  Users,
  TrendingUp,
  Plus,
  Minus,
  Trash2,
  Edit,
  LogOut,
  Home,
  ShoppingBag,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Settings,
  FileText,
  BarChart2,
  Truck,
  UserCircle,
  Bell,
  Moon,
  Sun,
  MapPin,
  CreditCard,
  ArrowRight,
  Tag,
  DollarSign,
  Layers,
  Grid,
  MoreHorizontal,
  Check,
  Phone,
  RefreshCw,
  Eye,
  UtensilsCrossed,
  Mail,
  Edit2,
  User,
  Upload,
  ImageIcon,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Archive,
  Lock,
  ClipboardList,
  Banknote,
  PackageCheck,
  CircleCheck,
  IdCard,
} from "lucide-react";

import { CalendarDropdown } from "./components/CalendarDropdown";
import logoBlanco from "@/imports/logo-blanco.png";
import logoClaro from "@/imports/logoclaro2.png";
import pizzaHero from "@/imports/image-23.png";
import lasanaCarne from "@/imports/lasaña_carne.png";
import lasanaMixta from "@/imports/lasaña_mixta.png";
import lasanaPollo from "@/imports/lasaña_pollo.png";
import imgQuatro from "@/imports/Quatro.png";
import imgPremio from "@/imports/Premio.png";
import imgPepsi from "@/imports/Pepsi.png";
import imgCocaCola from "@/imports/Coca-Cola.png";
import imagenLocal from "@/imports/imagen_local.png";
import { GestionConfigScreen, INITIAL_ROLES, KEY, type Rol, type AccesosMap } from "./screens/GestionConfigScreen";
import { GestionClientesScreen, INITIAL_CLIENTES, type Cliente } from "./screens/GestionClientesScreen";
import { GestionUsuariosScreen, INIT_USUARIOS, type Usuario } from "./screens/GestionUsuariosScreen";
import { GestionEmpleadosScreen, INITIAL_EMPLEADOS, type Empleado } from "./screens/GestionEmpleadosScreen";
import { OrdenProduccionScreen } from "./screens/OrdenProduccionScreen";
import { RecetasScreen } from "./screens/RecetasScreen";
import {
  GestionInsumosScreen,
  INITIAL_INSUMOS,
} from "./screens/GestionInsumosScreen";
import type { Insumo } from "./screens/GestionInsumosScreen";
import {
  PurchasesScreen,
  INITIAL_PURCHASES,
} from "./screens/PurchasesScreen";
import {
  SuppliersScreen,
  INITIAL_SUPPLIERS,
} from "./screens/SuppliersScreen";
import {
  SalesChartScreen,
  HOURLY_TODAY,
} from "./screens/SalesChartScreen";
import { ProductoTerminadoScreen } from "./screens/ProductoTerminadoScreen";
import { MiPerfilScreen } from "./screens/MiPerfilScreen";
import { ProductosPerecederosScreen } from "./screens/ProductosPerecederosScreen";
import {
  OrdenCompraScreen,
  NuevaOrdenCompraPage,
  INITIAL_ORDENES,
  INITIAL_GESTIONES,
  PROVEEDORES_INIT,
} from "./screens/OrdenCompraScreen";
import type {
  OrdenCompra,
  GestionCompra,
  ProveedorRef,
} from "./screens/OrdenCompraScreen";
import { GestionCompraScreen, NuevaCompraPage } from "./screens/GestionCompraScreen";
import { RecepcionCompraScreen } from "./screens/RecepcionCompraScreen";
import { VentasScreen, type Venta, type VentaStatus, type DevolucionTipo, INITIAL_VENTAS } from "./screens/VentasScreen";
import { GestionProductosScreen, INITIAL_PRODUCTOS, type Producto } from "./screens/GestionProductosScreen";
import { CategoriaProductoScreen } from "./screens/CategoriaProductoScreen";
import { MisPedidosScreen } from "./screens/MisPedidosScreen";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─────────────────────────── TYPES ───────────────────────────

type Screen =
  | "landing"
  | "catalog"
  | "product-detail"
  | "cart"
  | "login"
  | "register"
  | "dashboard"
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
  | "gestion-config"
  | "client-profile"
  | "clientes"
  | "perecederos"
  | "orden-compra"
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
  status: "activo" | "agotado" | "pausado";
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

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Margarita Clásica",
    description:
      "Salsa de tomate casera, mozzarella fresca y albahaca del jardín. La pizza que nos hizo famosos en Medellín desde 1994.",
    price: 14000,
    image:
      "https://images.unsplash.com/photo-1664309641932-0e03e0771b97?w=600&h=600&fit=crop&auto=format",
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "activo",
    rating: 4.9,
    sales: 1240,
  },
  {
    id: 2,
    name: "Pepperoni Suprema",
    description:
      "Generosa porción de pepperoni importado, queso mozzarella derretido y la salsa secreta de La Sirena.",
    price: 14000,
    image:
      "https://images.unsplash.com/photo-1573821663912-6df460f9c684?w=600&h=600&fit=crop&auto=format",
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "activo",
    rating: 4.8,
    sales: 980,
  },
  {
    id: 3,
    name: "La Sirena Especial",
    description:
      "Nuestra pizza insignia. Camarones al ajillo, queso crema, mozzarella, tomate cherry y rúcula fresca.",
    price: 14000,
    image:
      "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600&h=600&fit=crop&auto=format",
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "activo",
    rating: 4.95,
    sales: 756,
  },
  {
    id: 4,
    name: "Cuatro Quesos",
    description:
      "Mozzarella, provolone, queso azul y parmesano reggiano. Para los verdaderos amantes del queso.",
    price: 14000,
    image:
      "https://images.unsplash.com/photo-1680405620826-83b0f0f61b28?w=600&h=600&fit=crop&auto=format",
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "activo",
    rating: 4.7,
    sales: 620,
  },
  {
    id: 5,
    name: "Hawaiana Tropical",
    description:
      "Piña caramelizada, jamón serrano, mozzarella y salsa BBQ. Dulce y salada en perfecta armonía.",
    price: 14000,
    image:
      "https://images.unsplash.com/photo-1607811253515-57ef7723099d?w=600&h=600&fit=crop&auto=format",
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "activo",
    rating: 4.6,
    sales: 540,
  },
  {
    id: 6,
    name: "Veggie Mediterránea",
    description:
      "Pimentones de colores, aceitunas kalamata, queso feta, espinaca fresca y tomates cherry.",
    price: 14000,
    image:
      "https://images.unsplash.com/photo-1702716059239-385baacdabdc?w=600&h=600&fit=crop&auto=format",
    category: "Pizzas",
    sizes: SIZES_DEFAULT,
    extras: [],
    status: "pausado",
    rating: 4.5,
    sales: 380,
  },
  // ── Lasañas (CAT-002): precio único $20.000, presentación única "Normal" ──
  {
    id: 7,
    name: "Lasaña de Carne",
    description: "Lasaña de carne.",
    price: 20000,
    image: lasanaCarne,
    category: "Lasaña",
    sizes: SIZES_LASANA,
    extras: [],
    status: "activo",
    rating: 0,
    sales: 0,
  },
  {
    id: 8,
    name: "Lasaña Mixta",
    description: "Lasaña mixta.",
    price: 20000,
    image: lasanaMixta,
    category: "Lasaña",
    sizes: SIZES_LASANA,
    extras: [],
    status: "activo",
    rating: 0,
    sales: 0,
  },
  {
    id: 9,
    name: "Lasaña de Pollo",
    description: "Lasaña de pollo.",
    price: 20000,
    image: lasanaPollo,
    category: "Lasaña",
    sizes: SIZES_LASANA,
    extras: [],
    status: "activo",
    rating: 0,
    sales: 0,
  },
  // ── Bebidas (CAT-003): botella 2.5 L, precio único $8.000, sin tamaños ──
  {
    id: 10,
    name: "Quatro",
    description: "Botella de 2.5 L.",
    price: 8000,
    image: imgQuatro,
    category: "Bebidas",
    sizes: [],
    extras: [],
    status: "activo",
    rating: 0,
    sales: 0,
  },
  {
    id: 11,
    name: "Premio Rojo",
    description: "Botella de 2.5 L.",
    price: 8000,
    image: imgPremio,
    category: "Bebidas",
    sizes: [],
    extras: [],
    status: "activo",
    rating: 0,
    sales: 0,
  },
  {
    id: 12,
    name: "Pepsi",
    description: "Botella de 2.5 L.",
    price: 8000,
    image: imgPepsi,
    category: "Bebidas",
    sizes: [],
    extras: [],
    status: "activo",
    rating: 0,
    sales: 0,
  },
  {
    id: 13,
    name: "Coca-Cola",
    description: "Botella de 2.5 L.",
    price: 8000,
    image: imgCocaCola,
    category: "Bebidas",
    sizes: [],
    extras: [],
    status: "activo",
    rating: 0,
    sales: 0,
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

const SERIF = "'DM Serif Display', serif";
const MONO = "'JetBrains Mono', monospace";

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
  activo: "bg-emerald-100 text-emerald-800",
  agotado: "bg-red-100 text-red-700",
  pausado: "bg-yellow-100 text-yellow-800",
};

const ADMIN_SCREENS: Screen[] = [
  "dashboard",
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
  "gestion-config",
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
  "devoluciones",
  "empleados",
];

// Named roles that belong to the public catalog (not the admin panel)
const PUBLIC_ROLE_NAMES = ["Cliente", "Usuario"];

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
  "dashboard":        KEY("Dashboard",    "Dashboard"),
  "gestion-config":   KEY("Configuración","Configuración"),
  "users":            KEY("Configuración","Usuarios"),
  "empleados":        KEY("Configuración","Empleados"),
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

// Permiso que controla la visibilidad del acceso directo "Dashboard" del sidebar
const DASHBOARD_PERM_KEY = KEY("Dashboard", "Dashboard");

const NAV_SECTIONS = [
  {
    key: "configuracion",
    label: "Configuración",
    Icon: Settings,
    items: [
      {
        screen: "gestion-config" as Screen,
        label: "Configuración",
        Icon: Settings,
        permKey: KEY("Configuración", "Configuración"),
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
      {
        screen: "empleados" as Screen,
        label: "Empleados",
        Icon: IdCard,
        permKey: KEY("Configuración", "Empleados"),
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
        screen: "perecederos" as Screen,
        label: "Productos No Conformes",
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
  size = "md",
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
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

function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <h3
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            {title}
          </h3>
        </div>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors active:scale-95 cursor-pointer"
          >
            Sí, confirmar
          </button>
        </div>
      </motion.div>
    </div>
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
}: {
  current: Screen;
  navigate: (s: Screen) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  darkMode: boolean;
  userRole: string;
  accesos: AccesosMap;
  isNamedAdmin: boolean;
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
    isNamedAdmin || (accesos[permKey]?.includes("Ver") ?? false);

  // Cuántos ítems del nav superan el filtro de permisos. Se usa junto con
  // `active("dashboard")` para no dejar al usuario sin salida: si el guard de
  // ruta lo manda al dashboard, el botón debe existir para poder moverse.
  const visibleNavItems = NAV_SECTIONS.reduce(
    (acc, sec) =>
      acc + ((sec as any).items ?? []).filter((it: any) => it.permKey && canView(it.permKey)).length,
    0
  );
  const showDashboard =
    canView(DASHBOARD_PERM_KEY) || visibleNavItems === 0 || active("dashboard");

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-sidebar text-sidebar-foreground flex flex-col z-30 shadow-xl transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}
    >
      {/* Header */}
      <div
        className={`flex items-center border-b border-sidebar-border shrink-0 ${collapsed ? "justify-center px-2 py-4" : "gap-3 px-4 py-5"}`}
      >
        <div className="relative shrink-0">
          <img src={darkMode ? logoBlanco : logoClaro} alt="S.I.V.PRO Logo" className={`object-contain shrink-0 ${darkMode ? "w-10 h-10" : "h-10 w-auto"}`} />
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

      {/* Dashboard shortcut — controlado por el permiso Dashboard::Dashboard */}
      {showDashboard && (
        <div className="px-2 pt-3 pb-1 shrink-0">
          <button
            onClick={() => navigate("dashboard")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${active("dashboard") ? "bg-primary text-white" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
          >
            <Home className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{current === "users" ? "Menú" : "Dashboard"}</span>}
          </button>
        </div>
      )}

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
              it.permKey ? canView(it.permKey) : isNamedAdmin
            );

          // Hide entire module if no sub-items are visible
          if (allItems.length === 0) return null;

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
          <img src={darkMode ? logoBlanco : logoClaro} alt="S.I.V.PRO Logo" className={`object-contain shrink-0 ${darkMode ? "w-11 h-11" : "h-11 w-auto"}`} />
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
              onClick={() => navigate("login")}
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
}: {
  current: Screen;
  onToggleSidebar: () => void;
  navigate: (s: Screen) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  userName: string;
  roleName: string;
}) {
  const labels: Partial<Record<Screen, string>> = {
    dashboard: "Inicio",
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
    perecederos: "Productos No Conformes",
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
          onClick={() => navigate("dashboard")}
          className="hover:text-foreground transition-colors cursor-pointer"
        >
          Inicio
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
      <button
        onClick={() => navigate("landing")}
        className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground"
        title="Ver tienda"
      >
        <Home className="w-5 h-5" />
      </button>
      <div className="ml-auto flex items-center gap-3">
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
          className="flex items-center gap-2 cursor-pointer"
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
  cart,
  isLoggedIn,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  navigate: (s: Screen) => void;
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
    (p) => p.status === "activo",
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

              {/* CTAs */}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate("catalog")}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-[#DC2626] text-white font-bold text-base rounded-xl hover:bg-red-700 active:scale-95 transition-all duration-200 shadow-2xl shadow-red-900/40 cursor-pointer"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Ordenar ahora
                </button>
                <button
                  onClick={() => navigate("catalog")}
                  className="inline-flex items-center gap-3 px-8 py-4 border-2 border-white/70 text-white font-bold text-base rounded-xl hover:bg-white/10 hover:border-white active:scale-95 transition-all duration-200 cursor-pointer backdrop-blur-sm"
                >
                  Ver menú completo
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 1: Estadísticas ── */}
      <section className="bg-[#DC2626] py-12 md:py-14">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              {
                emoji: "📦",
                value: "+5.200",
                label: "Ventas entregadas",
              },
              {
                emoji: "⚡",
                value: "25 min",
                label: "Entrega promedio",
              },
              {
                emoji: "🏆",
                value: "30 años",
                label: "De tradición",
              },
            ].map(({ emoji, value, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 text-center"
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
                name: "Margarita Clásica",
                description:
                  "La reina de las pizzas. Salsa de tomate casera, mozzarella fresca y albahaca.",
                rating: 4.8,
              },
              {
                productoId: 2,
                name: "Pepperoni Premium",
                description:
                  "Generosa capa de pepperoni importado, mozzarella abundante y salsa secreta.",
                rating: 4.9,
              },
              {
                productoId: 4,
                name: "Cuatro Quesos",
                description:
                  "Mozzarella, cheddar, parmesano y gorgonzola en perfecta armonía.",
                rating: 4.7,
              },
              {
                productoId: 3,
                name: "Especial La Sirena",
                description:
                  "Nuestra pizza insignia desde 1994. Pollo a la plancha y tocineta crocante.",
                rating: 5.0,
              },
            ].map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
                onClick={() => navigate("catalog")}
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

function CatalogScreen({
  navigate,
  setProduct,
  quickAdd,
  initialCat = "Todas",
}: {
  navigate: (s: Screen) => void;
  setProduct: (p: Product) => void;
  quickAdd: (p: Product) => void;
  initialCat?: string;
}) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState(initialCat);
  const cats = ["Todas", "Pizzas", "Bebidas", "Lasaña"];

  const filtered = useMemo(
    () =>
      PRODUCTS.filter(
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
    [search, cat],
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
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
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
            >
              <button
                className={`relative w-full overflow-hidden h-48 bg-muted cursor-pointer block ${verImagenCompleta(p) ? "p-2" : ""}`}
                onClick={() => {
                  setProduct(p);
                  navigate("product-detail");
                }}
              >
                <img
                  src={p.image}
                  alt={p.name}
                  className={`block w-full h-full group-hover:scale-105 transition-transform duration-500 ${verImagenCompleta(p) ? "object-contain" : "object-cover"}`}
                />
                <div className="absolute top-3 right-3">
                  <Badge
                    className={PROD_STATUS_COLOR[p.status]}
                  >
                    {p.status === "activo"
                      ? "Disponible"
                      : p.status === "agotado"
                        ? "Agotado"
                        : "Pausado"}
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
                      onClick={() => {
                        setProduct(p);
                        navigate("product-detail");
                      }}
                      className="px-3 py-2 text-sm font-semibold border border-border rounded-xl hover:bg-muted transition-colors cursor-pointer text-foreground"
                    >
                      Ver más
                    </button>
                    <button
                      onClick={() => {
                        quickAdd(p);
                        toast.success(`¡${p.name} agregada!`);
                      }}
                      disabled={p.status !== "activo"}
                      className="px-3 py-2 text-sm font-semibold bg-primary text-white rounded-xl hover:bg-red-700 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
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
  navigate: (s: Screen) => void;
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
    navigate("cart");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate("catalog")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 cursor-pointer transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al menú
      </button>

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
  ) => void;
}) {
  const [payment, setPayment] = useState("Nequi");
  const [checkoutStep, setCheckoutStep] = useState<0 | 1 | 2>(
    0,
  );
  const [comprobante, setComprobante] = useState<string>("");
  const [horaRecogida, setHoraRecogida] = useState("");
  const [loading, setLoading] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] =
    useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cartTotal = (item: CartItem) =>
    (item.sizePrice + item.extrasPrice) * item.quantity;
  const subtotal = cart.reduce((s, i) => s + cartTotal(i), 0);

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
    setLoading(true);
    setTimeout(() => {
      onOrder(payment, comprobante, [...cart], horaRecogida);
      clear();
      setLoading(false);
      setCheckoutStep(0);
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
          Esto tardará unos pocos minutos — te confirmaremos
          cuando tu pedido esté listo.
        </p>

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm font-semibold text-amber-700">
            Esperando confirmación
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 mb-4 text-left">
          <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Dónde
            recoger tu pedido
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Podrás pasar a recogerlo una vez que tu pedido sea
            confirmado.
          </p>
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
              Horario: Jue – Dom · 4:00 pm – 10:00 pm
            </p>
          </div>
        </div>

        {horaRecogida && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl px-5 py-3.5 mb-6 flex items-center gap-3">
            <span className="text-xl">🕐</span>
            <div className="text-left">
              <p className="text-xs text-muted-foreground font-medium">
                Hora de recogida solicitada
              </p>
              <p className="text-base font-bold text-primary">
                {horaRecogida}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <PrimaryBtn onClick={() => navigate("mis-pedidos")} size="lg">
            Ver mis pedidos
          </PrimaryBtn>
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
                    <span
                      className="font-bold text-foreground"
                      style={{ fontFamily: MONO }}
                    >
                      {fmt(cartTotal(item))}
                    </span>
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
                        <span
                          className="text-sm font-bold text-foreground shrink-0"
                          style={{ fontFamily: MONO }}
                        >
                          {fmt(cartTotal(item))}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                    <span className="text-sm font-bold text-foreground">
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
                    {/* Business hours badge */}
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 mb-2 w-fit">
                      <span>🟢</span>
                      Atendemos de <strong>4:00 PM</strong> a <strong>10:00 PM</strong>
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
                        onChange={(e) => setHoraRecogida(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
                      />
                    </div>
                    {/* Example hint */}
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Ej: <span className="font-semibold text-foreground">06:30 PM</span> — usa el formato HH:MM y selecciona AM/PM
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
                  disabled={loading || !comprobante}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {loading
                    ? "Confirmando..."
                    : "Confirmar pedido"}
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
  } | null;
  loggedInRoleName: string;
  isStaff: boolean;
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

  const handleGuardar = () => {
    const ec = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
      ? "Formato de correo no válido"
      : null;
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
      correo: correo.trim(),
      telefono: telefono.trim(),
    });
    if (loggedInUser)
      onUpdateUser(loggedInUser.id, { correo: correo.trim(), telefono: telefono.trim() });
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
                    setCorreo(e.target.value);
                    setErrores((p) => ({
                      ...p,
                      correo: undefined,
                    }));
                  }}
                  className={iCls(errores.correo)}
                  autoFocus
                />
                {errores.correo && (
                  <p className="text-xs text-red-500 mt-1">
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
                  <p className="text-xs text-red-500 mt-1">
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
                  onClick={() => navigate("dashboard")}
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

// ─────────────────────────── LOGIN ───────────────────────────

function LoginScreen({
  navigate,
  onLogin,
  usuarios,
}: {
  navigate: (s: Screen) => void;
  onLogin: (role: string, email: string) => void;
  usuarios: Usuario[];
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
    if (!email.includes("@"))
      e.email = "Correo electrónico no válido";
    if (password.length < 6)
      e.password =
        "La contraseña debe tener mínimo 6 caracteres";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = () => {
    if (!validate()) return;

    const trimmedEmail = email.trim().toLowerCase();

    // Legacy customer account (not in the employee directory)
    if (trimmedEmail === "sebas@gmail.com" && password === "1234567") {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        onLogin("Usuario", "sebas@gmail.com");
        toast.success("¡Bienvenido, Sebas! 👋", { description: "Has ingresado correctamente." });
        navigate("catalog");
      }, 1500);
      return;
    }

    // Look up against the employee directory
    const user = usuarios.find(u => u.correo.toLowerCase() === trimmedEmail);

    if (!user) {
      setErrors({
        email: "Credenciales incorrectas",
        password: "Verifica tu correo y contraseña",
      });
      return;
    }

    if (!user.activo) {
      toast.error("Tu cuenta está inactiva. Contacta al administrador.");
      return;
    }

    // All system users share the password "123456"
    if (password !== "123456") {
      setErrors({
        email: "Credenciales incorrectas",
        password: "Verifica tu correo y contraseña",
      });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Navigation is handled by the onLogin callback in App.tsx,
      // which resolves the named role and picks catalog vs dashboard.
      onLogin("Administrador", user.correo);
      const firstName = user.nombre.split(" ")[0];
      toast.success(`¡Bienvenid${user.nombre.split(" ")[0].endsWith("a") ? "a" : "o"}, ${firstName}!`, {
        description: "Has ingresado correctamente.",
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-md p-8"
      >
        <div className="text-center mb-8">
          <img src={logoClaro} alt="S.I.V.PRO Logo" className="h-24 w-auto object-contain mx-auto mb-4" />
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

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Correo electrónico
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="gloria@lasirena.com"
              className={`w-full px-4 py-3 bg-muted rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.email ? "border-red-400" : "border-border"}`}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">
                {errors.email}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Contraseña
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              className={`w-full px-4 py-3 bg-muted rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.password ? "border-red-400" : "border-border"}`}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password}
              </p>
            )}
          </div>
          <div className="text-right">
            <button
              onClick={() => setShowForgot(true)}
              className="text-sm text-primary font-medium hover:underline cursor-pointer"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>

        <PrimaryBtn
          onClick={handleLogin}
          size="lg"
          className="w-full mb-4"
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : null}
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </PrimaryBtn>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative text-center">
            <span className="px-3 bg-card text-muted-foreground text-sm">
              o continúa con
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: "Google", icon: "G" },
            { label: "Apple", icon: "🍎" },
          ].map(({ label, icon }) => (
            <button
              key={label}
              onClick={() =>
                toast.info(`Continuando con ${label}...`)
              }
              className="flex items-center justify-center gap-2 py-3 border border-border rounded-xl hover:bg-muted transition-colors cursor-pointer text-sm font-medium text-foreground"
            >
              <span className="font-bold">{icon}</span> {label}
            </button>
          ))}
        </div>

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

      {/* ── Modal: Olvidé mi contraseña ── */}
      <AnimatePresence>
        {showForgot && (
          <ForgotPasswordModal
            onClose={() => setShowForgot(false)}
          />
        )}
      </AnimatePresence>
    </div>
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
    if (!forgotEmail.includes("@")) {
      toast.error("Ingresa un correo válido");
      return;
    }
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
      toast.error("Ingresa el código completo");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("password");
    }, 1000);
  };

  const changePassword = () => {
    if (newPass.length < 6) {
      toast.error(
        "La contraseña debe tener mínimo 6 caracteres",
      );
      return;
    }
    if (newPass !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-sm p-7"
      >
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
                onChange={(e) => setForgotEmail(e.target.value)}
                type="email"
                placeholder="gloria@lasirena.com"
                className="w-full px-4 py-3 bg-muted rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
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
            <div className="flex justify-center gap-2 mb-6">
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
                  className="w-10 h-12 text-center text-lg font-bold bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                />
              ))}
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
                <input
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 bg-muted rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Confirmar contraseña
                </label>
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  type="password"
                  placeholder="Repite tu contraseña"
                  className="w-full px-4 py-3 bg-muted rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
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
              onClick={() => setStep("code")}
              className="w-full py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              ← Volver al código
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
  { code: "TI",  label: "TI · Tarjeta de Identidad" },
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
}: {
  navigate: (s: Screen) => void;
  usuarios: Usuario[];
  setUsuarios: React.Dispatch<React.SetStateAction<Usuario[]>>;
  empleados: Empleado[];
  clientes: Cliente[];
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
  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const register = () => {
    if (!form.name || !form.email || !form.phone) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    if (!form.email.includes("@")) {
      toast.error("Correo electrónico no válido");
      return;
    }
    if (!form.docType) {
      toast.error("Selecciona el tipo de documento");
      return;
    }
    if (!form.docNum.trim()) {
      toast.error("Ingresa el número de documento");
      return;
    }
    if (form.docType !== "PP" && !/^\d+$/.test(form.docNum.trim())) {
      toast.error("El número de documento solo debe contener números");
      return;
    }
    const clave = `${form.docType}||${form.docNum.trim()}`.toLowerCase();
    const docDuplicado =
      usuarios.some(u => `${u.tipoDocumento}||${u.numeroDocumento}`.toLowerCase() === clave) ||
      empleados.some(e => `${e.tipoDocumento}||${e.numeroDocumento}`.toLowerCase() === clave) ||
      clientes.some(c => `${c.tipoDocumento}||${c.numeroDocumento}`.toLowerCase() === clave);
    if (docDuplicado) {
      toast.error("Este documento ya está registrado");
      return;
    }
    const correoDuplicado =
      usuarios.some(u => u.correo.trim().toLowerCase() === form.email.trim().toLowerCase()) ||
      empleados.some(e => e.correo.trim().toLowerCase() === form.email.trim().toLowerCase()) ||
      clientes.some(c => c.correo.trim().toLowerCase() === form.email.trim().toLowerCase());
    if (correoDuplicado) {
      toast.error("Este correo ya está registrado");
      return;
    }
    if (form.password.length < 6) {
      toast.error(
        "La contraseña debe tener mínimo 6 caracteres",
      );
      return;
    }
    if (form.password !== form.confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
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
        correo: form.email.trim(),
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-md p-8"
      >
        <div className="text-center mb-6">
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

        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="sm:w-48 sm:shrink-0">
              <label className="block text-sm font-semibold mb-1.5 text-foreground">
                Tipo doc.
              </label>
              <select
                value={form.docType}
                onChange={(e) => setForm((p) => ({ ...p, docType: e.target.value }))}
                className="w-full px-4 py-3 bg-muted rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                {DOC_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold mb-1.5 text-foreground">
                Número de documento
              </label>
              <input
                value={form.docNum}
                onChange={(e) =>
                  setForm((p) => ({ ...p, docNum: e.target.value.replace(/[\s.]/g, "") }))
                }
                type="text"
                inputMode={form.docType === "PP" ? "text" : "numeric"}
                placeholder={form.docType === "PP" ? "AB123456" : "Ej: 12345678"}
                className="w-full px-4 py-3 bg-muted rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          {[

            {
              label: "Nombre completo",
              key: "name" as const,
              placeholder: "Gloria Muñoz",
              type: "text",
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
              placeholder: "310 123 4567",
              type: "tel",
            },
            {
              label: "Contraseña",
              key: "password" as const,
              placeholder: "Mínimo 6 caracteres",
              type: "password",
            },
            {
              label: "Confirmar contraseña",
              key: "confirm" as const,
              placeholder: "Repite tu contraseña",
              type: "password",
            },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <label className="block text-sm font-semibold mb-1.5 text-foreground">
                {label}
              </label>
              <input
                value={form[key]}
                onChange={set(key)}
                type={type}
                placeholder={placeholder}
                className="w-full px-4 py-3 bg-muted rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
        </div>

        <PrimaryBtn
          onClick={register}
          size="lg"
          className="w-full mb-4"
          disabled={loading}
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
    </div>
  );
}
// ─────────────────────────── DASHBOARD ───────────────────────────

function DashboardScreen({
  navigate,
  orders,
  loggedInUser,
  loggedInRoleName,
  tieneRolActivo,
  isNamedAdmin,
  accesos,
}: {
  navigate: (s: Screen) => void;
  orders: Order[];
  loggedInUser: { nombre: string } | null;
  loggedInRoleName: string;
  // false = el rol fue borrado, está desactivado o el usuario no tiene rol.
  // Distingue "no tienes permisos" de "ya no existe tu rol".
  tieneRolActivo: boolean;
  isNamedAdmin: boolean;
  accesos: AccesosMap;
}) {
  const firstName = (loggedInUser?.nombre ?? "Gloria").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const dateStr = new Date().toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // ÚNICA regla de acceso de la app. Antes había dos: `canSee` (con atajo por
  // nombre de rol) y `tieneVer` (sin atajo), y cada una servía a una capa
  // distinta — menú y rutas usaban una, los KPIs del Dashboard la otra. Por eso
  // un admin podía tener control total en la navegación y al mismo tiempo ver
  // el badge de "no sos administrador". Ahora las dos capas llaman a esto.
  const puedeVer = (permKey: string) =>
    isNamedAdmin || (accesos[permKey]?.includes("Ver") ?? false);

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
  const ccfg = puedeVer(KEY("Configuración", "Configuración"));
  const cus  = puedeVer(KEY("Configuración", "Usuarios"));
  const cemp = puedeVer(KEY("Configuración", "Empleados"));
  const cdb  = puedeVer(KEY("Dashboard",  "Dashboard"));

  // El panel completo del Dashboard (KPIs, gráfica y "Ingresos hoy") se abre con
  // "Ver" en Dashboard y en Ventas. Antes exigía Configuración::Configuración,
  // un permiso de otra sección decidiendo sobre dinero, y por eso un gerente de
  // ventas sin acceso a Configuración perdía el widget de ingresos. El nombre
  // viejo ("esAdminCompleto") tampoco describía lo que comprobaba.
  const vePanelCompleto = cdb && cv;

  // noAccess: true only when the user cannot see ANY sub-opción. La condición
  // por nombre de rol sobra: el administrador original tiene fullAccesos(), así
  // que `.every(v => !v)` ya da false sin necesidad de exceptuarlo.
  const noAccess =
    [cv, ccl, ci, cpr, coc, cco, cp, ccp, cop, cpe, ccfg, cus, cemp, cdb].every(v => !v);

  // KPIs — cada uno ligado a su sub-opción
  type KpiDef = { label: string; value: string; sub: string; Icon: any; bg: string; ic: string; trend: string };
  const kpis: KpiDef[] = [
    cv           && { label: "Ventas hoy",   value: "24",         sub: "+3 en la última hora",  Icon: ShoppingBag, bg: "bg-blue-50",    ic: "text-blue-600",    trend: "+12%" },
    vePanelCompleto && { label: "Ingresos hoy", value: "$1.248.000", sub: "Meta: $1.500.000",       Icon: DollarSign,  bg: "bg-emerald-50", ic: "text-emerald-600", trend: "+8%"  },
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
    ccfg && { label: "Configuración", Icon: Settings,       screen: "gestion-config"    as Screen },
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

      {/* Sales chart — permiso de Ventas (Ventas::Ventas) */}
      {cv && (
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
              <XAxis key="x" dataKey="hora" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip key="tip" content={({ active, payload, label }: any) =>
                active && payload?.length ? (
                  <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
                    <p className="font-semibold text-muted-foreground mb-0.5">{label}</p>
                    <p className="font-bold text-foreground">{payload[0].value} productos</p>
                  </div>
                ) : null
              } />
              <Bar key="bar" dataKey="ventas" radius={[4, 4, 0, 0]} isAnimationActive={false}
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
                  {["Venta", "Cliente", "Total", "Estado", "Pago", "Hora"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 text-sm font-mono font-medium text-foreground">{o.id}</td>
                    <td className="px-4 py-3.5 text-sm text-foreground">{o.client}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>{fmt(o.total)}</td>
                    <td className="px-4 py-3.5">
                      <Badge className={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{o.paymentMethod}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{o.date.split(" ")[1]}</td>
                  </tr>
                ))}
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
      status: "activo",
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
          <ConfirmModal
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
}: {
  screen: Screen;
  navigate: (s: Screen) => void;
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
            onClick={() => navigate("dashboard")}
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

const SERIF_DEV = "'DM Serif Display', serif";
const MONO_DEV  = "'JetBrains Mono', monospace";
const fmtCOPDev = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const nowHoraDev = () =>
  new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

// Producto del menú elegido como canje de la devolución.
type Reemplazo = { id: number; nombre: string; precio: number; cantidad: number; imagen?: string };

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
  // Resumen que se muestra al confirmar, una vez la devolución ya quedó cerrada.
  const [resumen, setResumen] = useState<{
    unidadesDevueltas: number;
    compensacion: Reemplazo[];
    valorComp: number;
    dinero: number;
    unidadesDinero: number;
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

  // Producto de canje del menú. Tope: las unidades devueltas, para que el canje
  // no supere lo que entra.
  const setReemplazo = (prod: Product, delta: number) => {
    setActiva((prev) => {
      if (!prev) return prev;
      const dd = pedidos.find((p) => p.id === prev.id)?.detalle ?? [];
      const devueltosTot = dd.reduce((s, d, i) => s + (prev.devueltos[i] ?? 0), 0);
      const curQty = prev.compensacion.find((c) => c.id === prod.id)?.cantidad ?? 0;
      const nuevo = Math.max(0, curQty + delta);
      if (nuevo > devueltosTot) return prev;
      const rest = prev.compensacion.filter((c) => c.id !== prod.id);
      const nueva = nuevo === 0 ? rest : [...rest, { id: prod.id, nombre: prod.name, precio: prod.price, cantidad: nuevo, imagen: prod.image }];
      return { ...prev, compensacion: nueva };
    });
  };

  const devActiva = activa ? pedidos.find((p) => p.id === activa.id) ?? null : null;
  const detalleAct = devActiva?.detalle ?? [];
  const totalActRaw = devActiva?.total || detalleAct.reduce((s, d) => s + d.precio * d.cantidad, 0) || 0;
  const totalDevueltos = activa ? detalleAct.reduce((s, d, i) => s + (activa.devueltos[i] ?? 0), 0) : 0;
  const totalComp = activa ? activa.compensacion.reduce((s, c) => s + c.cantidad, 0) : 0;
  const valorComp = activa ? activa.compensacion.reduce((s, c) => s + c.cantidad * c.precio, 0) : 0;

  // Reparto: el canje se queda con las primeras `totalComp` unidades devueltas
  // y las que sobran se devuelven en dinero. Así una devolución mixta reparte
  // el mismo total entre las dos opciones sin pedir asignación unidad por unidad.
  const sinCanjear = Math.max(0, totalDevueltos - totalComp);
  const dineroPorLinea = (() => {
    let resto = sinCanjear;
    return detalleAct.map((d, i) => {
      const aDinero = Math.min(activa?.devueltos[i] ?? 0, resto);
      resto -= aDinero;
      return aDinero * d.precio;
    });
  })();
  // El dinero solo cuenta si la opción "producto por dinero" está activa. Sin
  // detalle de productos no hay unidades que repartir, así que se reembolsa el
  // total de la venta.
  const conDinero = activa?.reembolsoDinero ?? false;
  const montoReembolso = !conDinero
    ? 0
    : detalleAct.length > 0
      ? dineroPorLinea.reduce((s, n) => s + n, 0)
      : totalActRaw;
  const unidadesDinero = conDinero ? sinCanjear : 0;

  const textoComp = activa?.compensacion.map((c) => `${c.cantidad}x ${c.nombre}`).join(", ") ?? "";
  const puedeConfirmar = !!activa && totalDevueltos > 0 && (totalComp > 0 || montoReembolso > 0);
  const modoGlobal: DevolucionTipo =
    totalComp > 0 && montoReembolso > 0 ? "mixto" : totalComp > 0 ? "producto" : "dinero";

  // "Aún puedes hacer…": lo que todavía falta decidir de cada opción.
  const faltan: string[] = [];
  if (totalDevueltos === 0) {
    faltan.push("Elegir qué productos devuelve el cliente.");
  } else if (sinCanjear > 0) {
    faltan.push(
      `Producto por producto: faltan ${sinCanjear} ${sinCanjear === 1 ? "unidad" : "unidades"} por canjear.`,
    );
    if (!conDinero) {
      faltan.push("Producto por dinero: activar la devolución de las unidades que no se canjean.");
    }
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
      montoReembolso > 0 ? `Devolución: ${fmtCOPDev(montoReembolso)}` : null,
      activa.notaDinero.trim() ? `Nota: ${activa.notaDinero.trim()}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    setResumen({
      unidadesDevueltas: totalDevueltos,
      compensacion: activa.compensacion,
      valorComp,
      dinero: montoReembolso,
      unidadesDinero,
    });
    resolverDev(devActiva.id, modoGlobal, nota);
    import("sonner").then(({ toast }) =>
      toast.success(
        modoGlobal === "mixto"
          ? "Devolución mixta registrada"
          : modoGlobal === "producto"
            ? "Devolución resuelta — canje por producto registrado"
            : "Devolución resuelta — reembolso en dinero registrado",
        {
          description: totalComp > 0
            ? `Compensación elegida: ${textoComp} · Dinero a devolver: ${fmtCOPDev(montoReembolso)}`
            : `Dinero a devolver: ${fmtCOPDev(montoReembolso)}`,
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
                          ? "bg-orange-50/20 hover:bg-orange-50/40"
                          : "bg-emerald-50/20 hover:bg-emerald-50/40"
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
                        {dev.metodoPago ? (
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                              dev.metodoPago === "Nequi"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {dev.metodoPago === "Nequi" ? "💜" : "🏦"} {dev.metodoPago}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            pendiente
                              ? "bg-orange-100 text-orange-800"
                              : "bg-emerald-100 text-emerald-800"
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
                                ? "bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 cursor-pointer"
                                : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                            }`}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Gestionar
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetalleDevolucion(dev)}
                            title="Visualizar devolución"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-muted text-foreground hover:bg-border transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Visualizar
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
              className="bg-card rounded-2xl w-full max-w-2xl shadow-2xl border border-border flex flex-col max-h-[88vh]"
            >
              {/* Header modal */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-5 h-5 text-orange-600" />
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

              {/* Cuerpo modal */}
              <div className="p-5 overflow-y-auto space-y-4">
                {/* Paso 1: qué unidades entran de vuelta */}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    ¿Qué devuelve el cliente?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Marca las unidades de cada producto que entran de vuelta. Ese total es el que se
                    reparte entre las dos compensaciones de abajo.
                  </p>
                </div>

                {detalleAct.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Esta venta no tiene detalle de productos registrado, así que no hay productos
                    que compensar.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detalleAct.map((d, i) => {
                      const q = activa.devueltos[i] ?? 0;
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                            q > 0 ? "border-orange-300 bg-orange-50/40" : "border-border bg-white"
                          }`}
                        >
                          {d.imagen ? (
                            <img src={d.imagen} alt={d.nombre} className="w-9 h-9 rounded-lg object-cover bg-muted shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-muted shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{d.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              x{d.cantidad} en el pedido · {fmtCOPDev(d.precio)} c/u
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setDevQty(i, d.cantidad, -1)}
                              disabled={q === 0}
                              className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-foreground">{q}</span>
                            <button
                              type="button"
                              onClick={() => setDevQty(i, d.cantidad, 1)}
                              disabled={q >= d.cantidad}
                              className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Paso 2: las dos compensaciones. Se pueden usar las dos a la vez y
                    abrir una nunca confirma nada: solo cambia el panel visible. */}
                <div className="space-y-2 pt-1">
                  <p className="text-sm font-semibold text-foreground">
                    Elige la compensación
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Puedes usar una sola o las dos a la vez. Al abrir una te devuelve a este
                    selector para que elijas la otra; nada se confirma hasta que pulses{" "}
                    <span className="font-semibold">Confirmar</span>.
                  </p>
                </div>

                <div className="space-y-2">
                  {/* Opción 1: producto por producto */}
                  <button
                    onClick={() =>
                      setActiva((p) => (p ? { ...p, paso: p.paso === "producto" ? null : "producto" } : p))
                    }
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      activa.paso === "producto" || totalComp > 0
                        ? "border-blue-500 bg-blue-50"
                        : "border-border bg-white hover:border-blue-300"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                      <PackageCheck className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">Producto por producto</p>
                      <p className="text-xs text-muted-foreground">
                        {totalComp > 0
                          ? `${totalComp} de ${totalDevueltos} canjeadas · ${textoComp}`
                          : "Cambiarlo por otro producto del menú"}
                      </p>
                    </div>
                    {totalComp > 0 && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>

                  {/* Opción 2: producto por dinero */}
                  <button
                    onClick={() =>
                      setActiva((p) =>
                        p
                          ? {
                              ...p,
                              paso: p.paso === "dinero" ? null : "dinero",
                              reembolsoDinero: p.paso === "dinero" ? false : true,
                            }
                          : p,
                      )
                    }
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      activa.paso === "dinero" || conDinero
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-border bg-white hover:border-emerald-300"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <Banknote className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">Producto por dinero</p>
                      <p className="text-xs text-muted-foreground">
                        {conDinero
                          ? `${unidadesDinero} ${unidadesDinero === 1 ? "unidad" : "unidades"} · ${fmtCOPDev(montoReembolso)}`
                          : "Devolver su valor"}
                      </p>
                    </div>
                    {conDinero && (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                </div>

                {/* Panel: producto por producto */}
                {activa.paso === "producto" && (
                  <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                        Producto por producto
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiva((p) => (p ? { ...p, paso: null } : p))}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline cursor-pointer shrink-0"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Volver a elegir
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white border border-blue-200">
                      <p className="text-xs font-semibold text-foreground">Unidades a canjear</p>
                      <p className="text-xs text-muted-foreground">
                        {totalComp} de {totalDevueltos}
                      </p>
                    </div>

                    {activa.compensacion.length > 0 && (
                      <div className="bg-white border border-blue-200 rounded-xl px-3 py-2">
                        {activa.compensacion.map((r) => (
                          <div key={r.id} className="flex justify-between gap-2 text-xs text-blue-900 py-0.5">
                            <span className="truncate">• {r.cantidad}x {r.nombre}</span>
                            <span className="font-semibold whitespace-nowrap">
                              {fmtCOPDev(r.cantidad * r.precio)}
                            </span>
                          </div>
                        ))}
                        <p className="text-xs text-blue-700 mt-1 border-t border-blue-200 pt-1.5">
                          Valor del canje: {fmtCOPDev(valorComp)}
                        </p>
                      </div>
                    )}

                    {totalDevueltos === 0 ? (
                      <p className="text-xs font-semibold text-orange-600">
                        Marca primero cuántas unidades devuelve el cliente.
                      </p>
                    ) : totalComp === 0 ? (
                      <p className="text-xs font-semibold text-orange-600">
                        Falta elegir el producto de canje.
                      </p>
                    ) : null}

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {PRODUCTS.filter((p) => p.status === "activo").map((prod) => {
                        const cant = activa.compensacion.find((r) => r.id === prod.id)?.cantidad ?? 0;
                        return (
                          <div
                            key={prod.id}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                              cant > 0 ? "bg-blue-50 border-blue-300" : "bg-white border-border"
                            }`}
                          >
                            <img src={prod.image} alt={prod.name} className="w-9 h-9 rounded-lg object-cover bg-muted shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{prod.name}</p>
                              <p className="text-xs text-muted-foreground">{fmtCOPDev(prod.price)}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setReemplazo(prod, -1)}
                                disabled={cant === 0}
                                className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-foreground">{cant}</span>
                              <button
                                type="button"
                                onClick={() => setReemplazo(prod, 1)}
                                disabled={totalDevueltos === 0 || totalComp >= totalDevueltos}
                                className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Panel: producto por dinero */}
                {activa.paso === "dinero" && (
                  <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                        Producto por dinero
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setActiva((p) => (p ? { ...p, paso: null, reembolsoDinero: false } : p))
                        }
                        className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer shrink-0"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Volver a elegir
                      </button>
                    </div>

                    {montoReembolso > 0 ? (
                      <div className="bg-white border border-emerald-200 rounded-xl px-3 py-2.5">
                        <p className="text-xs text-muted-foreground">Se devolverá al cliente</p>
                        <p className="text-2xl font-bold text-emerald-700" style={{ fontFamily: MONO_DEV }}>
                          {fmtCOPDev(montoReembolso)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {unidadesDinero} de {totalDevueltos}{" "}
                          {unidadesDinero === 1 ? "unidad sin canjear" : "unidades sin canjear"} · método
                          original: <span className="font-semibold">{devActiva.metodoPago || "No registrado"}</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-orange-600">
                        Marca primero cuántas unidades devuelve el cliente para calcular el monto.
                      </p>
                    )}

                    {detalleAct.length > 0 && dineroPorLinea.some((n) => n > 0) && (
                      <div className="bg-white border border-emerald-200 rounded-xl px-3 py-2 space-y-1">
                        {detalleAct.map((d, i) =>
                          dineroPorLinea[i] > 0 ? (
                            <div key={i} className="flex justify-between gap-2 text-xs text-emerald-900">
                              <span className="truncate">• {d.nombre}</span>
                              <span className="font-semibold whitespace-nowrap">
                                {fmtCOPDev(dineroPorLinea[i])}
                              </span>
                            </div>
                          ) : null,
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Nota del reembolso (opcional)
                      </label>
                      <input
                        type="text"
                        value={activa.notaDinero}
                        onChange={(e) => setActiva((p) => (p ? { ...p, notaDinero: e.target.value } : p))}
                        placeholder="Ej: Transferido por Nequi el 10/09..."
                        className="w-full px-3 py-2.5 bg-white rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      />
                    </div>
                  </div>
                )}

                {/* Aviso + único botón que cierra la devolución */}
                <div className="rounded-2xl border-2 border-border bg-muted/40 p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <CircleCheck className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        ¿Estás seguro de confirmar esta devolución?
                      </p>
                      {faltan.length > 0 ? (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs text-muted-foreground">Aún puedes hacer:</p>
                          {faltan.map((f) => (
                            <p key={f} className="text-xs font-semibold text-orange-600">
                              • {f}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Las dos compensaciones están listas. Al confirmar la devolución queda
                          registrada y ya no se puede deshacer.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Lo que se va a aplicar al confirmar */}
                  <div className="bg-white border border-border rounded-xl divide-y divide-border">
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <p className="text-xs font-semibold text-foreground">Producto por producto</p>
                      <p className="text-xs font-semibold text-right truncate pl-2">
                        {totalComp > 0 ? (
                          <span className="text-blue-700">{textoComp} · {fmtCOPDev(valorComp)}</span>
                        ) : (
                          <span className="text-muted-foreground">No se canjeó nada</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <p className="text-xs font-semibold text-foreground">Producto por dinero</p>
                      <p className="text-xs font-semibold text-right pl-2">
                        {montoReembolso > 0 ? (
                          <span className="text-emerald-700" style={{ fontFamily: MONO_DEV }}>
                            {fmtCOPDev(montoReembolso)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No se devuelve dinero</span>
                        )}
                      </p>
                    </div>
                  </div>

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
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <CircleCheck className="w-5 h-5 text-emerald-600" />
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
                  <div className="px-3 py-2 bg-blue-50 border-b border-blue-200">
                    <p className="text-xs font-bold text-blue-900">Producto por producto</p>
                  </div>
                  {resumen.compensacion.length === 0 ? (
                    <p className="px-3 py-2.5 text-xs text-muted-foreground italic">
                      No se canjeó ningún producto.
                    </p>
                  ) : (
                    resumen.compensacion.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0"
                      >
                        {r.imagen ? (
                          <img src={r.imagen} alt={r.nombre} className="w-9 h-9 rounded-lg object-cover bg-muted shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-muted shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">{r.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.cantidad} {r.cantidad === 1 ? "unidad" : "unidades"} elegida
                            {r.cantidad === 1 ? "" : "s"} como compensación
                          </p>
                        </div>
                        <p className="text-sm font-bold text-blue-700 shrink-0" style={{ fontFamily: MONO_DEV }}>
                          {fmtCOPDev(r.cantidad * r.precio)}
                        </p>
                      </div>
                    ))
                  )}
                  {resumen.compensacion.length > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border-t border-blue-200">
                      <p className="text-xs font-semibold text-blue-900">Valor del canje</p>
                      <p className="text-sm font-bold text-blue-700" style={{ fontFamily: MONO_DEV }}>
                        {fmtCOPDev(resumen.valorComp)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-200">
                    <p className="text-xs font-bold text-emerald-900">Producto por dinero</p>
                  </div>
                  <div className="px-3 py-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {resumen.dinero > 0
                        ? `${resumen.unidadesDinero} ${resumen.unidadesDinero === 1 ? "unidad" : "unidades"} sin canjear`
                        : "Sin unidades pendientes de reembolso"}
                    </p>
                    <p className="text-xl font-bold text-emerald-700 shrink-0" style={{ fontFamily: MONO_DEV }}>
                      {fmtCOPDev(resumen.dinero)}
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
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {devolucionDetalle.metodoPago || "No registrado"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Estado</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      devolucionDetalle.devolucionResuelta
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-orange-100 text-orange-800"
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
      return parsed as Rol[];
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
      return parsed as Usuario[];
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

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [ordenRecepcion, setOrdenRecepcion] =
    useState<OrdenCompra | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ventas, setVentas] = useState<Venta[]>(INITIAL_VENTAS);
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
  // Derived display values for top bar and sidebar permissions
  const loggedInUser = loggedInUserId ? usuarios.find(u => u.id === loggedInUserId) ?? null : null;
  const loggedInUserName = loggedInUser?.nombre ?? "Gloria";
  // Nombre con el que se guardan y se buscan los pedidos del usuario en sesión
  const pedidosUsuarioNombre =
    loggedInUser?.nombre ??
    (userRole === "Usuario" ? "Sebastián Gómez" : "Gloria Inés Vargas");
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
  // True when the logged-in user has a back-office role (not a pure public customer)
  const isStaff = isLoggedIn && loggedInUser !== null && !PUBLIC_ROLE_NAMES.includes(loggedInRoleName);

  // El usuario de la sesión puede tener ficha de empleado además de la de
  // usuario. El vínculo entre ambas listas es el correo (ver `upsertUsuario` en
  // la pantalla de Empleados), porque no comparten identificador.
  const loggedInEmpleado = loggedInUser
    ? empleados.find(e => e.correo.trim().toLowerCase() === loggedInUser.correo.trim().toLowerCase()) ?? null
    : null;

  // Returns action permissions for a given screen based on the logged-in user's role
  const getPerms = (s: Screen) => {
    const key = SCREEN_PERM_KEY[s];
    if (!key || isNamedAdmin) return { canCreate: true, canEdit: true, canDelete: true };
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

  const navigate = (s: Screen) => {
    setScreen(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setDrawerOpen(false);
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

  const logout = () => {
    setIsLoggedIn(false);
    setUserRole("Administrador");
    setLoggedInUserId(null);
    navigate("landing");
    toast.success("Has cerrado sesión correctamente");
  };

  // Only admin role can access admin screens; clients are redirected
  const isAdminRole = userRole === "Administrador";
  const isAdmin = ADMIN_SCREENS.includes(screen) && isAdminRole;
  const isAuth = screen === "login" || screen === "register";

  // If a client somehow lands on an admin screen, send them back
  if (
    isLoggedIn &&
    !isAdminRole &&
    ADMIN_SCREENS.includes(screen)
  ) {
    setTimeout(() => navigate("catalog"), 0);
  }

  if (!isLoggedIn && screen === "mis-pedidos") {
    setTimeout(() => navigate("login"), 0);
  }

  // Permission guard: redirect admin-level users to dashboard if their named
  // role doesn't grant "Ver" on the current screen. "store-profile" (perfil de
  // la tienda, que se muestra dentro del layout de la tienda) queda exento de
  // esta regla; el resto de pantallas de administración siguen protegidas.
  if (isLoggedIn && isAdminRole && screen !== "dashboard" && screen !== "profile" && screen !== "store-profile") {
    // Toda pantalla de administración con permKey queda cubierta por esta regla.
    // La lista legacy ADMIN_ONLY_SCREENS se eliminó: sus tres pantallas
    // (gestion-config, users, empleados) ya declaran permKey en SCREEN_PERM_KEY,
    // así que el fallback nunca se disparaba.
    const permKey = SCREEN_PERM_KEY[screen];
    if (permKey && !isNamedAdmin && !(loggedInAccesos[permKey]?.includes("Ver") ?? false)) {
      setTimeout(() => navigate("dashboard"), 0);
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
    screen === "nueva-compra"
  );

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: "'DM Sans', sans-serif",
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
        />
      )}

      <div
        className={`transition-all duration-300 ${sideW} flex flex-col min-h-screen${isLockedScreen ? " h-dvh min-h-dvh overflow-hidden" : ""}`}
      >
        {/* Public navbar */}
        {!isAdmin && !isAuth && (
          <PublicNav
            navigate={navigate}
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
                  onOrder={(
                    metodoPago,
                    comprobante,
                    items,
                    horaRecogida,
                  ) => {
                    const newVenta: Venta = {
                      id: `VEN-${String(ventas.length + 1).padStart(3, "0")}`,
                      usuario: pedidosUsuarioNombre,
                      fecha: new Date().toLocaleDateString("en-CA"),
                      productos: items
                        .map(
                          (i) =>
                            `${i.product.name} x${i.quantity}`,
                        )
                        .join(", "),
                      cantidad: items.reduce(
                        (s, i) => s + i.quantity,
                        0,
                      ),
                      total: items.reduce(
                        (s, i) =>
                          s +
                          (i.sizePrice + i.extrasPrice) *
                            i.quantity,
                        0,
                      ),
                      estado: "por-verificar" as VentaStatus,
                      metodoPago,
                      comprobante,
                      horaRecogida,
                      detalle: items.map((i) => ({
                        nombre: `${i.product.name} — ${i.size}`,
                        precio: i.sizePrice + i.extrasPrice,
                        cantidad: i.quantity,
                        imagen: i.product.image,
                        extras: i.selectedExtras,
                      })),
                    };
                    setVentas((prev) => [newVenta, ...prev]);
                  }}
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
                  onLogin={(role: string, loginEmail: string) => {
                    setIsLoggedIn(true);
                    const u = usuarios.find(x => x.correo.toLowerCase() === loginEmail.toLowerCase());
                    setLoggedInUserId(u?.id ?? null);

                    if (role === "Usuario") {
                      // Legacy public customer (sebas@gmail.com) — LoginScreen already navigates to catalog
                      setUserRole("Usuario");
                      return;
                    }

                    // Employee login: resolve named role to decide admin panel vs catalog
                    const namedRol = u ? roles.find(r => r.id === u.rolId) ?? null : null;
                    const goPublic = namedRol ? PUBLIC_ROLE_NAMES.includes(namedRol.nombre) : false;
                    setUserRole(goPublic ? "Usuario" : "Administrador");
                    navigate(goPublic ? "catalog" : "dashboard");
                  }}
                />
              )}
              {screen === "register" && (
                <RegisterScreen
                  navigate={navigate}
                  usuarios={usuarios}
                  setUsuarios={setUsuarios}
                  empleados={empleados}
                  clientes={clientes}
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
                  } : null}
                  loggedInRoleName={loggedInRoleName}
                  isStaff={isStaff}
                  onUpdateUser={(id, data) => {
                    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
                  }}
                />
              )}
              {screen === "dashboard" && (
                <DashboardScreen
                  navigate={navigate}
                  orders={orders}
                  loggedInUser={loggedInUser}
                  loggedInRoleName={loggedInRoleName}
                  tieneRolActivo={loggedInRol !== null}
                  isNamedAdmin={isNamedAdmin}
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
                  onNuevaOrden={() => navigate("nueva-orden-compra")}
                />
              )}
              {screen === "nueva-orden-compra" && (
                <NuevaOrdenCompraPage
                  ordenes={ordenes}
                  setOrdenes={setOrdenes}
                  proveedores={proveedores}
                  setProveedores={setProveedores}
                  insumos={insumos}
                  onBack={() => navigate("orden-compra")}
                />
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
              {screen === "gestion-compra" && (
                <GestionCompraScreen
                  {...getPerms("gestion-compra")}
                  gestiones={gestiones}
                  setGestiones={setGestiones}
                  ordenes={ordenes}
                  setOrdenes={setOrdenes}
                  insumos={insumos}
                  proveedores={proveedores}
                  setProveedores={setProveedores}
                  onNuevaCompra={() => navigate("nueva-compra")}
                />
              )}
              {screen === "nueva-compra" && (
                <NuevaCompraPage
                  gestiones={gestiones}
                  setGestiones={setGestiones}
                  proveedores={proveedores}
                  setProveedores={setProveedores}
                  insumos={insumos}
                  onBack={() => navigate("gestion-compra")}
                />
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
              {screen === "gestion-config" && (
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
                  onBack={() => setScreen("dashboard")}
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
                  usuarios={usuarios}
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
                  "manage-products",
                  "orders",
                  "purchases",
                  "suppliers",
                  "ventas-pedidos",
                  "gestion-productos",
                  "cat-producto",
                  "gestion-config",
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