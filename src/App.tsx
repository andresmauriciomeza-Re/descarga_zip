import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  CreditCard,
  DollarSign,
  Eye,
  FileText,
  Grid,
  Home,
  IdCard,
  ImageIcon,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Minus,
  Moon,
  Package,
  PackageCheck,
  Pencil,
  Phone,
  Plus,
  QrCode,
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
  Truck,
  Upload,
  User,
  UserCircle,
  Users,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { useIsMobile } from "@/shared/components/ui/use-mobile";

import imgCocaCola from "@/assets/img/Coca-Cola.png";
import fondoBienvenidoDark from "@/assets/img/bienvenido-la-sirena-dark.webp";
import fondoBienvenidoLight from "@/assets/img/bienvenido-la-sirena-light.webp";
import pizzaHero from "@/assets/img/image-23.png";
import imagenLocal from "@/assets/img/imagen_local.png";
import lasanaCarne from "@/assets/img/lasaña_carne.png";
import lasanaMixta from "@/assets/img/lasaña_mixta.png";
import lasanaPollo from "@/assets/img/lasaña_pollo.png";
import logoBlanco from "@/assets/img/logo-blanco.png";
import logoClaro from "@/assets/img/logoclaro2.png";
import imgPepsi from "@/assets/img/Pepsi.png";
import pizzaCarnes from "@/assets/img/pizza_carnes.png";
import pizzaCañon from "@/assets/img/pizza_cañon.png";
import pizzaHawaii from "@/assets/img/pizza_hawaii.png";
import pizzaJamonQueso from "@/assets/img/pizza_jamon_queso.png";
import pizzaMaicitos from "@/assets/img/pizza_maicitos.png";
import pizzaPeperoni from "@/assets/img/pizza_peperoni.png";
import pizzaPollo from "@/assets/img/pizza_pollo.png";
import pizzaTocineta from "@/assets/img/pizza_tocineta.png";
import imgPremio from "@/assets/img/Premio.png";
import imgQuatro from "@/assets/img/Quatro.png";
import StatsMarquee from "@/features/landing/components/StatsMarquee";
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
import QRCode from "qrcode";
import { filtrarCorreo, filtrarDocumento, filtrarNombre, MensajeError, PasswordField, RequisitosContrasena, soloDigitos, validarContrasena, validarCorreo, validarDocumento, validarNombre, validarTelefono, validarTelefonoOpcional } from "@/shared/components/campo";
import {
  AUTH_GLASS_BUTTON_SECONDARY,
  AUTH_GLASS_CARD,
  AUTH_GLASS_OVERLAY,
  authGlassInputCls,
  authInputCls,
} from "@/shared/styles/authGlass";
import { ConfirmDeleteModal } from "@/shared/components/ConfirmDeleteModal";
import { ResumenTotales } from "@/shared/components/ResumenTotales";
import { PAYMENT_INFO, PasoPagoTransferencia } from "@/shared/components/PasoPagoTransferencia";
import { VolverArriba } from "@/shared/components/VolverArriba";
import { HORA_APERTURA, HORA_CIERRE, HORA_ULTIMA_RECOGIDA, MINUTOS_RECOGIDA, hora12, minutosDeHora } from "@/shared/utils/hora";
import { agregarDias, fechaISO } from "@/shared/utils/fechas";
import { limpiarNumeroInput, numeroDeInput } from "@/shared/utils/numeroInput";
import { migrarIdsVenta, siguienteIdVenta } from "@/features/ventas/services/siguienteIdVenta";
import { puedeTransicionar } from "@/features/ventas/services/estadosVenta";
import type { Screen } from "@/shared/utils/screen";
import { ETIQUETA_INICIO_EMPLEADO } from "@/shared/utils/screen";
import { DESCRIPCIONES, IMAGENES_PIZZA, SECCIONES_MENU, nombreCategoria, productoACatalogo, sizesDeProducto, verImagenCompleta, type Product } from "@/shared/utils/catalogo";
import { useSubirArchivo } from "@/shared/hooks/useSubirArchivo";
import { useValidacionFormulario } from "@/shared/hooks/useValidacionFormulario";
import { actualizarPerfil, borrarToken, login as loginApi, obtenerPerfil, obtenerToken, registrarCliente, restablecerContrasena, solicitarCodigoRecuperacion, verificarCodigoRecuperacion } from "@/shared/services/authService";
import type { ApiErrorConEstado, UsuarioApi } from "@/types/api";
import { CategoriaProductoScreen, INITIAL_CATEGORIAS, estadoDe, type CategoriaProducto } from "@/features/categoria-productos/pages/CategoriaProductoScreen";
import { claveImagenDe } from "@/features/categoria-productos/services/imagenesCategoria";
import { ImagenCategoria } from "@/features/categoria-productos/components/ImagenCategoria";
import { GestionClientesScreen, INITIAL_CLIENTES, type Cliente } from "@/features/clientes/pages/GestionClientesScreen";
import { GestionCompraScreen, NuevaCompraPage } from "@/features/compra/pages/GestionCompraScreen";
import { GestionConfigScreen, INITIAL_ROLES, completarRolesSemilla, KEY, ACCION_EXCEL, SUBS_CON_EXCEL, type AccesosMap, type Rol } from "@/features/roles/pages/GestionConfigScreen";
import { GestionEmpleadosScreen, INITIAL_EMPLEADOS, type Contratacion, type Empleado } from "@/features/empleados/pages/GestionEmpleadosScreen";
import type { Insumo } from "@/features/insumos/pages/GestionInsumosScreen";
import {
  GestionInsumosScreen,
  INITIAL_INSUMOS,
} from "@/features/insumos/pages/GestionInsumosScreen";
import { GestionProductosScreen, INITIAL_PRODUCTOS, INITIAL_FICHAS, normalizarIdsFicha, type Producto, type FichasPorProducto, type FichaVersion } from "@/features/productos/pages/GestionProductosScreen";
import { migrarFichasLegacy } from "@/shared/utils/fichas";
import { OPCIONES_TIPO_DOCUMENTO, etiquetaTipoDocumento } from "@/shared/utils/tiposDocumento";
import { ESTADO_COLORES } from "@/shared/components/EstadoProducto";
import { EstadoSelect } from "@/shared/components/EstadoSelect";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginador";
import { ActionIcons } from "@/shared/components/ActionIcons";
import { CambiarRolMenu } from "@/shared/components/CambiarRolMenu";
import { GestionUsuariosScreen, INIT_USUARIOS, claveDoc, docValida, idRolCliente, type Usuario } from "@/features/usuarios/pages/GestionUsuariosScreen";
import { MiPerfilScreen } from "@/features/usuarios/pages/MiPerfilScreen";
import { CambiarContrasenaModal } from "@/shared/components/CambiarContrasenaModal";
import { PasoCodigoVerificacion } from "@/shared/components/PasoCodigoVerificacion";
import { PasoNuevaContrasena } from "@/shared/components/PasoNuevaContrasena";
import { MisPedidosScreen } from "@/features/ventas/pages/MisPedidosScreen";
import type {
  GestionCompra,
  OrdenCompra,
  ProveedorRef,
} from "@/features/orden-compra/pages/OrdenCompraScreen";
import {
  INITIAL_GESTIONES,
  INITIAL_ORDENES,
  NuevaOrdenCompraPage,
  OrdenCompraScreen,
  OrdenDetallePage,
  PROVEEDORES_INIT,
} from "@/features/orden-compra/pages/OrdenCompraScreen";
import {
  OrdenProduccionScreen,
  INITIAL_ORDENES as INITIAL_ORDENES_PRODUCCION,
  crearOrdenPedido,
  crearOrdenReemplazo,
  siguienteOrdenId,
  normalizarNombre,
  type OrdenProduccion,
} from "@/features/orden-produccion/pages/OrdenProduccionScreen";
import { ProductosPerecederosScreen, INITIAL_NO_CONFORMIDADES, type NoConformidad } from "@/features/cpn/pages/ProductosPerecederosScreen";
import { ProductoTerminadoScreen } from "@/features/productos/pages/ProductoTerminadoScreen";
import {
  PurchasesScreen
} from "@/features/compras/pages/PurchasesScreen";
import { RecepcionCompraScreen } from "@/features/orden-compra/pages/RecepcionCompraScreen";
import {
  SalesChartScreen,
} from "@/features/dashboard/pages/SalesChartScreen";
import { DashboardScreen } from "@/features/dashboard/pages/DashboardScreen";
import {
  SuppliersScreen
} from "@/features/proveedores/pages/SuppliersScreen";
import { INITIAL_VENTAS, PagoPill, VentasScreen, comprobantesDe, type ComprobanteVenta, type DevolucionTipo, type Venta, type VentaStatus } from "@/features/ventas/pages/VentasScreen";
import { DevolucionesScreen } from "@/features/devoluciones/pages/DevolucionesScreen";

// ─────────────────────────── TYPES ───────────────────────────

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

/** Resumen del pedido que se acaba de registrar, para la pantalla de
    confirmación. Lo crea el checkout al enviar (handleConfirm y
    submitAsGuest) y el login al retomar el pedido que un invitado
    dejó a medio hacer (handleLogin). */
interface PedidoResumen {
  id: string;
  items: CartItem[];
  total: number;
  nombre: string;
  documento?: string;
  /** Teléfono del cliente, si lo dejó en el formulario de datos. */
  telefono?: string;
  hora: string;
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
  { label: "Mediana", price: 14000 },
  { label: "Grande", price: 16000 },
];

// Un producto con selector de tamaño (pizzas, lasañas) usa el precio del tamaño
// elegido; uno sin tamaños (bebidas, botella única) cae a su precio base. Evita
// que el detalle o el quick-add revienten al leer sizes[0] de un array vacío.
const sizeDe = (p: Product, i: number) => p.sizes[i] ?? { label: "", price: p.price };

const SIZES_LASANA = [{ label: "Normal", price: 20000 }];

const PRODUCTS: Product[] = [
  // ── Pizzas (CAT-001) ──
  {
    id: 1,
    name: "Cañón",
    description: "Pizza de la casa.",
    price: 14000,
    image: pizzaCañon,
    idCategoria: "CAT-001",
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
    idCategoria: "CAT-001",
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
    idCategoria: "CAT-001",
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
    idCategoria: "CAT-001",
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
    idCategoria: "CAT-001",
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
    idCategoria: "CAT-001",
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
    idCategoria: "CAT-001",
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
    idCategoria: "CAT-001",
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
    image: "/src/assets/img/lasaña_carne.png",
    idCategoria: "CAT-002",
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
    image: "/src/assets/img/lasaña_pollo.png",
    idCategoria: "CAT-002",
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
    image: "/src/assets/img/lasaña_mixta.png",
    idCategoria: "CAT-002",
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
    image: "/src/assets/img/Quatro.png",
    idCategoria: "CAT-003",
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
    image: "/src/assets/img/Premio.png",
    idCategoria: "CAT-003",
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
    image: "/src/assets/img/Coca-Cola.png",
    idCategoria: "CAT-003",
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
    image: "/src/assets/img/Pepsi.png",
    idCategoria: "CAT-003",
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

/** Dirección única del local, usada en el pie de la Landing, en la tarjeta
    "Dónde recoger tu pedido" y en las órdenes de demostración. El mapa de
    Google Maps se arma con esta misma cadena (ver `DIRECCION_LOCAL_MAPA`). */
const DIRECCION_LOCAL = "Cra. 45 #104-30, Laureles, Medellín, Antioquia";

const ORDERS: Order[] = [
  {
    id: "VEN-2024-0156",
    client: "María González",
    phone: "310 456 7890",
    address: DIRECCION_LOCAL,
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

/** Colores del pill de estado de la tabla. Incluye los valores del tipo
    (`disponible`/`no disponible`, con el que nacen los productos) y los del
    desplegable (`activo`/`agotado`/`pausado`), que es lo que hoy se puede
    elegir en Manage Products. */
const PROD_STATUS_COLOR: Record<string, string> = {
  disponible: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  "no disponible": "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  activo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  agotado: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  pausado: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
};

const PROD_STATUS_LABEL: Record<string, string> = {
  disponible: "Activo",
  "no disponible": "No disponible",
  activo: "Activo",
  agotado: "Agotado",
  pausado: "Pausado",
};

/** Estados que ofrece el desplegable (los de siempre de Manage Products). */
const PROD_STATUS_OPCIONES = ["activo", "agotado", "pausado"] as const;

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

// Administrador y Cliente se detectan SIEMPRE por el NOMBRE del rol (sin
// tildes ni mayúsculas), nunca por los ids "ROL-001"/"ROL-002": el administrador
// puede renombrarlos o restaurar semillas, y los ids son solo anclas de
// migración para los datos viejos.
const normalizarNombreRol = (nombre: string) =>
  nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
const esRolAdministrador = (rol: Rol | null | undefined) =>
  !!rol && normalizarNombreRol(rol.nombre) === "administrador";
const esRolCliente = (rol: Rol | null | undefined) =>
  !!rol && normalizarNombreRol(rol.nombre) === "cliente";

// Clave de persona para el cruce Usuario ↔ Empleado: tipo y número de
// documento, que el usuario NO puede editar (a diferencia del correo). Si el
// documento no está, se cae al correo minúsculo como último recurso.
const clavePersona = (tipoDocumento: string, numeroDocumento: string, correo: string): string => {
  const k = claveDoc(tipoDocumento, numeroDocumento);
  return docValida(k) ? `doc:${k}` : `correo:${correo.trim().toLowerCase()}`;
};

// Rol activo persistido por usuario: un mapa { [usuarioId]: rolId } que se
// conserva al cerrar sesión para el próximo login.
const ROL_ACTIVO_STORAGE_KEY = "sivpro.rolActivo.v1";
const leerRolActivo = (usuarioId: string | null | undefined): string | null => {
  if (!usuarioId) return null;
  try {
    const raw = localStorage.getItem(ROL_ACTIVO_STORAGE_KEY);
    if (!raw) return null;
    const m: unknown = JSON.parse(raw);
    if (m && typeof m === "object" && !Array.isArray(m)) {
      const v = (m as Record<string, unknown>)[usuarioId];
      return typeof v === "string" && v ? v : null;
    }
  } catch {
    // Dato corrupto: no hay rol guardado, se usa el primero de la persona.
  }
  return null;
};
const escribirRolActivo = (usuarioId: string | null | undefined, rolId: string | null) => {
  if (!usuarioId) return;
  try {
    const raw = localStorage.getItem(ROL_ACTIVO_STORAGE_KEY);
    const m: Record<string, string> = raw
      ? (JSON.parse(raw) as Record<string, string>)
      : {};
    if (rolId) m[usuarioId] = rolId;
    else delete m[usuarioId];
    localStorage.setItem(ROL_ACTIVO_STORAGE_KEY, JSON.stringify(m));
  } catch {
    // localStorage bloqueado: el cambio de rol vive solo en memoria.
  }
};

// ─────────────────────────── SESIÓN PERSISTENTE ───────────────────────────
// La sesión (usuario + rol activo + pantalla) se guarda en localStorage para
// que F5 no la borre, y se cierra sola tras 15 minutos de inactividad. La
// clave es compartida entre pestañas: la actividad de cualquier pestaña mantiene
// viva la sesión y cerrarla en una la cierra en todas (evento `storage`).
const SESION_STORAGE_KEY = "sivpro.sesion.v1";
const INACTIVIDAD_MS = 15 * 60 * 1000;
/** Mínimo entre escrituras de `ultimaActividad` para no saturar localStorage. */
const ACTIVIDAD_THROTTLE_MS = 30 * 1000;

interface SesionGuardada {
  userId: string;
  rolActivo: string | null;
  /** Última pantalla vista, para restaurarla tras recargar. */
  screen: string;
  ultimaActividad: number;
}

const leerSesionGuardada = (): SesionGuardada | null => {
  try {
    const raw = localStorage.getItem(SESION_STORAGE_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as SesionGuardada;
    if (
      m &&
      typeof m === "object" &&
      typeof m.userId === "string" &&
      m.userId &&
      typeof m.ultimaActividad === "number"
    ) {
      return m;
    }
  } catch {
    // Dato corrupto: no hay sesión que restaurar.
  }
  return null;
};

const escribirSesionGuardada = (s: SesionGuardada) => {
  try {
    localStorage.setItem(SESION_STORAGE_KEY, JSON.stringify(s));
  } catch {
    // localStorage bloqueado: la sesión vive solo en memoria.
  }
};

const borrarSesionGuardada = () => {
  try {
    localStorage.removeItem(SESION_STORAGE_KEY);
  } catch {
    // localStorage bloqueado.
  }
};


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
    label: ETIQUETA_INICIO_EMPLEADO,
    Icon: Home,
    items: [
      {
        screen: "inicio" as Screen,
        label: ETIQUETA_INICIO_EMPLEADO,
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
        screen: "empleados" as Screen,
        label: "Empleados",
        Icon: IdCard,
        permKey: KEY("Producción", "Empleados"),
      },
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

const canViewPermission = (accesos: AccesosMap, permKey: string) =>
  accesos[permKey]?.includes("Ver") ?? false;

// Pantallas del panel que dependen de un permiso (todas las de la barra
// lateral menos "Inicio", que es universal dentro del panel). Se usan para
// decidir si un rol "tiene pantallas" y para calcular a cuál entrar primero.
const PANTALLAS_CON_PERMISO = NAV_SECTIONS.flatMap(s => s.items)
  .filter(i => typeof (i as { permKey?: string }).permKey === "string")
  .map(i => ({ screen: i.screen, permKey: (i as { permKey?: string }).permKey as string }));

// ¿Este rol/mapa de accesos permite ver AL MENOS UNA pantalla del panel?
// (No basta con tener permisos de escritura en algo: "tiene pantallas" se
// define por el privilegio Ver de las pantallas de la barra lateral.)
const rolTienePantallas = (accesos?: AccesosMap): boolean =>
  !!accesos && PANTALLAS_CON_PERMISO.some(i => canViewPermission(accesos, i.permKey));

// Pantalla de entrada del panel para un mapa de accesos: el Dashboard si el rol
// lo puede ver; si no, la primera pantalla permitida siguiendo el orden de la
// barra lateral; y si no puede ver ninguna, null (ese rol no entra al panel).
const primeraPantallaPermitida = (accesos: AccesosMap): Screen | null => {
  return PANTALLAS_CON_PERMISO.find(i => canViewPermission(accesos, i.permKey))?.screen ?? null;
};

// ─────────────────────────── TINY SHARED COMPONENTS ───────────────────────────

function Badge({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={style}
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
  abierto,
  onClose,
  darkMode,
  userRole,
  accesos,
  isNamedAdmin,
  hasDashboardAccess,
  esMovil = false,
  onCerrarMovil,
  firstNavRef,
}: {
  current: Screen;
  navigate: (s: Screen) => void;
  /** true = menú visible; false = totalmente oculto (fuera de pantalla). */
  abierto: boolean;
  /** Cierra el menú (escritorio) y devuelve el foco al botón hamburguesa. */
  onClose: () => void;
  darkMode: boolean;
  userRole: string;
  accesos: AccesosMap;
  isNamedAdmin: boolean;
  hasDashboardAccess: boolean;
  /** true en viewport < 768px: el aside pasa a panel deslizante. */
  esMovil?: boolean;
  onCerrarMovil?: () => void;
  /** Ref mutable que recibe la primera opción del menú al abrir (para el foco). */
  firstNavRef?: { current: HTMLButtonElement | null };
}) {
  // Grupos del menú: todos cerrados al entrar; cada módulo se abre solo con
  // clic (no hay ningún efecto que los reabra según la pantalla activa).
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (k: string) =>
    setOpen((p) => ({ ...p, [k]: !p[k] }));
  // En móvil navegar cierra el panel para que no tape la pantalla.
  const ir = (s: Screen) => {
    navigate(s);
    if (esMovil) onCerrarMovil?.();
  };
  const asideRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  // Con el menú oculto queda fuera de pantalla pero seguiría siendo enfocable
  // con Tab: se marca inert + aria-hidden. Al abrir se registra la primera
  // opción para mover el foco desde el botón hamburguesa.
  useLayoutEffect(() => {
    const el = asideRef.current;
    if (!el) return;
    if (abierto) {
      el.removeAttribute("inert");
      el.removeAttribute("aria-hidden");
      if (firstNavRef) {
        firstNavRef.current = navRef.current?.querySelector("button") ?? null;
      }
    } else {
      el.setAttribute("inert", "");
      el.setAttribute("aria-hidden", "true");
      if (firstNavRef) firstNavRef.current = null;
    }
  }, [abierto, firstNavRef]);
  const active = (s: Screen) =>
    current === s ||
    (s === "orden-compra" && current === "nueva-orden-compra") ||
    (s === "gestion-compra" && current === "nueva-compra");

  // Returns true if the current user can "Ver" the given permission key. Es la
  // misma regla que aplica el guard de ruta y el Dashboard: rol semilla o
  // permiso. Ver `isNamedAdmin` para por qué el atajo se ancla al id.
  const canView = (permKey: string) =>
    canViewPermission(accesos, permKey);

  return (
    <aside
      ref={asideRef}
      role="navigation"
      aria-label="Menú principal"
      className={`fixed left-0 top-0 h-full w-60 bg-sidebar text-sidebar-foreground flex flex-col z-30 shadow-xl transition-transform duration-200 motion-reduce:transition-none ${
        esMovil ? "max-w-[80vw]" : ""
      } ${abierto ? "translate-x-0" : "-translate-x-full"}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border shrink-0">
        <div className="relative shrink-0">
          <img src={darkMode ? logoBlanco : logoClaro} alt="S.I.V.PRO Logo" className="object-contain shrink-0 w-10 h-10" />
        </div>
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
          onClick={onClose}
          className="ml-auto p-1 rounded text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors cursor-pointer"
          aria-label="Cerrar menú"
          title="Cerrar menú"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable nav */}
      <nav
        ref={navRef}
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
                    onClick={() => ir(it.screen)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${active(it.screen) ? "bg-primary text-white" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
                  >
                    <it.Icon className="w-4 h-4 shrink-0" />
                    <span>{it.label}</span>
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
                <span className="flex-1 text-left">{sec.label}</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${open[sec.key] ? "rotate-180" : ""}`}
                />
              </button>

              {open[sec.key] && (
                <div className="ml-2 border-l border-sidebar-border pl-2 space-y-0.5 mt-0.5">
                  {allItems.map((it) => (
                    <button
                      key={it.screen}
                      onClick={() => ir(it.screen)}
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
      <div className="max-w-7xl mx-auto px-6 h-full flex flex-wrap items-center justify-between gap-x-3">
        {/* Logo */}
        <button
          onClick={() => navigate("landing")}
          className="flex items-center gap-3 cursor-pointer group min-w-0"
        >
          <img src={darkMode ? logoBlanco : logoClaro} alt="S.I.V.PRO Logo" className="object-contain shrink-0 w-11 h-11 md:w-14 md:h-14 lg:w-16 lg:h-16" />
          {/* Punto 1.1: `min-w-0` + `truncate` — a 375 px el texto cede y se
              corta con puntos en vez de empujar el botón de tema fuera de la
              pantalla. */}
          <div className="leading-none min-w-0">
            <p
              className="font-bold text-[17px] text-foreground leading-tight truncate"
              style={{ fontFamily: SERIF }}
            >
              La Sirena
            </p>
            <p className="hidden sm:block text-[11px] text-muted-foreground font-medium tracking-wide mt-0.5 truncate">
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
              <motion.span
                key={count}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-[#DC2626] text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-red-100 shadow-sm"
              >
                {count}
              </motion.span>
            )}
          </button>

          {/* Profile / Login — en móvil (<768 px) el acceso a sesión lo da la
              barra inferior ("Ingresar"), así que este botón del header solo
              existe desde md para que nunca se vean las dos opciones a la vez. */}
          {isLoggedIn ? (
            <button
              onClick={() =>
                navigate(isStaff ? "store-profile" : "client-profile")
              }
              className={`hidden md:flex w-10 h-10 rounded-full items-center justify-center transition-colors cursor-pointer shadow-sm font-bold text-sm text-white ${
                loggedInUser?.avatarColor ?? (isStaff ? "bg-primary hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700")
              }`}
              title="Mi perfil"
            >
              {(loggedInUser?.iniciales.charAt(0) ?? (isStaff ? "G" : "S")).toUpperCase()}
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="hidden md:inline-flex px-3 sm:px-4 py-2.5 bg-[#DC2626] text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md shadow-red-900/20 whitespace-nowrap"
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
  menuVisible,
  menuButtonRef,
  navigate,
  darkMode,
  setDarkMode,
  userName,
  roleName,
  homeScreen,
  rolesParaCambiar = [],
  onCambiarRol,
}: {
  current: Screen;
  onToggleSidebar: () => void;
  /** true si el menú está visible (para aria-label / aria-expanded). */
  menuVisible: boolean;
  /** Ref del propio botón hamburguesa (el foco vuelve aquí al cerrar). */
  menuButtonRef: { current: HTMLButtonElement | null };
  navigate: (s: Screen) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  userName: string;
  roleName: string;
  homeScreen: Screen;
  /** Roles distintos al activo que SÍ tienen pantallas: los que ofrece el
   *  menú "Cambiar de rol" (los vacíos no se ofrecen). */
  rolesParaCambiar?: Rol[];
  onCambiarRol?: (rolId: string) => void;
}) {
  const labels: Partial<Record<Screen, string>> = {
    dashboard: "Dashboard",
    inicio: ETIQUETA_INICIO_EMPLEADO,
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
    sales: "Gestión de ventas",
    "supply-categories": "Categorías de insumos",
    "product-categories": "Categorías de productos",
    profile: "Mi perfil",
  };
  return (
    <header className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border h-14 flex items-center px-4 gap-2 shadow-sm">
      <button
        ref={menuButtonRef}
        onClick={onToggleSidebar}
        className="p-2 min-w-11 min-h-11 flex items-center justify-center rounded-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground"
        aria-label={menuVisible ? "Cerrar menú" : "Abrir menú"}
        title={menuVisible ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={menuVisible}
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground ml-2 min-w-0 overflow-hidden">
        <button
          onClick={() => navigate(homeScreen)}
          className="hover:text-foreground transition-colors cursor-pointer shrink-0"
        >
          {homeScreen === "dashboard" ? "Dashboard" : ETIQUETA_INICIO_EMPLEADO}
        </button>
        {current !== homeScreen && (
          <>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <span className="text-foreground font-medium min-w-0 truncate">
              {labels[current] ?? current}
            </span>
          </>
        )}
      </div>
      <div className="ml-auto flex items-center gap-0">
        {onCambiarRol && (
          <div className="mr-1">
            <CambiarRolMenu
              roles={rolesParaCambiar}
              rolActivoNombre={roleName}
              onSelect={onCambiarRol}
            />
          </div>
        )}
        <button
          onClick={() => navigate("landing")}
          className="p-2 min-w-11 min-h-11 flex items-center justify-center rounded-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground"
        >
          <Store className="w-5 h-5" />
        </button>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 min-w-11 min-h-11 flex items-center justify-center rounded-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground"
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
  current,
  isLoggedIn,
  isStaff,
  loggedInUser,
  onLogin,
}: {
  navigate: (s: Screen) => void;
  current: Screen;
  isLoggedIn: boolean;
  isStaff: boolean;
  loggedInUser: { iniciales: string; avatarColor: string } | null;
  /** Abre el modal de Iniciar sesión (lo que hacía el botón "Más"). */
  onLogin: () => void;
}) {
  const items = [
    { s: "landing" as Screen, Icon: Home, label: "Inicio" },
    ...(isLoggedIn
      ? [{ s: "mis-pedidos" as Screen, Icon: ShoppingBag, label: "Mis pedidos" }]
      : []),
    { s: "catalog" as Screen, Icon: Grid, label: "Menú" },
  ];
  // Punto 2.1: "Carrito" y "Más" dejan la barra inferior. El carrito ya vive
  // en el botón rojo del header (y en el badge del contenido), y lo que antes
  // abría el cajón "Más" ahora es "Perfil": mismo destino que el avatar del
  // header (`store-profile` para staff / `client-profile` para cliente, para
  // no chocar con el guard de rutas del panel).
  const perfilScreen: Screen = isStaff ? "store-profile" : "client-profile";
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
            <span className="text-xs font-medium min-w-0 truncate max-w-[5rem]">{label}</span>
          </button>
        ))}
        {isLoggedIn ? (
          <button
            onClick={() => navigate(perfilScreen)}
            className={`flex flex-col items-center gap-1 py-2 px-3 cursor-pointer transition-colors ${current === perfilScreen ? "text-primary" : "text-muted-foreground"}`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold leading-none shadow-sm ${loggedInUser?.avatarColor ?? "bg-primary"}`}
            >
              {(loggedInUser?.iniciales.charAt(0) ?? "U").toUpperCase()}
            </span>
            <span className="text-xs font-medium min-w-0 truncate max-w-[5rem]">Perfil</span>
          </button>
        ) : (
          <button
            onClick={onLogin}
            className="flex flex-col items-center gap-1 py-2 px-3 cursor-pointer text-muted-foreground"
          >
            <UserCircle className="w-5 h-5" />
            <span className="text-xs font-medium min-w-0 truncate max-w-[5rem]">Ingresar</span>
          </button>
        )}
      </div>
    </nav>
  );
}

// ─────────────────────────── LANDING ───────────────────────────

function LandingScreen({
  navigate,
  setProduct,
  onCategoryNavigate,
  categorias,
  productos,
  onOpenDetail,
}: {
  navigate: (s: Screen) => void;
  setProduct: (p: Product) => void;
  onCategoryNavigate: (cat: string) => void;
  /** Categorías creadas en el módulo del admin. Las tres originales NO entran
      acá: su ícono y su nombre están en las tarjetas de arriba. Solo se suman
      las que trae su propio ícono, es decir las nuevas. */
  categorias: CategoriaProducto[];
  /** Productos del panel de administración: es el mismo estado `Producto[]`
      de Gestión de Productos, así que el nombre real vive en `nombre`. */
  productos: Producto[];
  /** Abre el detalle guardando la pantalla de origen. */
  onOpenDetail: (p: Product) => void;
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
          <div className="px-5 sm:px-10 md:px-16 lg:px-20 pt-24 pb-16 max-w-xl">
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
                  `sm:items-center` les devuelve su ancho natural en fila.
                  Por debajo de `md` este botón lleva un velo oscuro propio
                  (`max-md:bg-black/45`): sin fondo dependía de lo que se viera
                  detrás de la imagen del hero y en móvil se veía transparente. */}
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
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 max-md:bg-black/45 border-2 border-white/70 text-white font-bold text-base rounded-xl hover:bg-white/10 hover:border-white active:scale-95 transition-all duration-200 cursor-pointer backdrop-blur-sm"
                >
                  Ver menú completo
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              {/* Estadísticas del hero — tarjeta oscura con divisores, NO la
                  franja roja de ancho completo de más abajo: esa se mantiene
                  igual y las dos conviven. Va dentro de la columna izquierda,
                  debajo de los botones. */}
              {/* grid de 3 columnas IGUALES en una sola fila (antes flex-wrap,
                  que a 360 px bajaba "30 años / De tradición" a una segunda
                  fila). `divide-x` conserva los divisores verticales; `min-w-0`
                  en cada celda evita que la cifra o la etiqueta desborden. */}
              <div className="mt-10 w-full grid grid-cols-3 items-stretch rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 px-1.5 sm:px-3 py-4 divide-x divide-white/15">
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
                    className="min-w-0 px-1.5 sm:px-5 text-center"
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
        <StatsMarquee />
      </section>

      {/* ── SECCIÓN 2: Categorías ── */}
      <section className="bg-muted pt-16 md:pt-20 pb-10 md:pb-12">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
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

          {/* Cards — grid 3/2/1 columnas al ancho completo del contenedor
              (mismo ancho que "Las favoritas"), cards de alto mínimo generoso. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categorias
              .filter((c) => estadoDe(c) !== "Inactivo")
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => onCategoryNavigate(c.nombre)}
                  className="group min-h-[220px] md:min-h-[260px] bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg hover:-translate-y-1 hover:scale-105 active:scale-100 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-3 px-4 py-6"
                >
                  {/* Imagen de la categoría 140×140 (§5): resuelve la imagen
                      fija de las originales, la que se eligió al crearla y,
                      en datos viejos, el emoji como texto. */}
                  <ImagenCategoria
                    clave={claveImagenDe(c)}
                    className="w-[140px] h-[140px]"
                    alt={c.nombre}
                    emojiClassName="text-[96px] leading-none"
                  />
                  <p
                    className="text-xl font-bold text-foreground text-center leading-snug"
                    style={{ fontFamily: SERIF }}
                  >
                    {c.nombre}
                  </p>
                </button>
              ))}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 3: Las favoritas de nuestros clientes ── */}
      <section className="bg-muted pt-10 md:pt-12 pb-16 md:pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-10">
            <h2
              className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground"
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

          {/* Cards — punto 2.2: en móvil pasan a grid de 1 columna (antes
              carrusel con `overflow-x-auto`, donde la última tarjeta quedaba
              cortada a 360 px). Escritorio sin cambios. */}
          <div
            className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4"
          >
            {(() => {
              const normalizar = (valor: string | undefined) =>
                (valor ?? "")
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .trim()
                  .replace(/^pizza\s+/, "");
              const favoritas = ["Cañón", "Hawaii", "Jamón y Queso", "Maicitos"];
              const lista = productos ?? [];
              return favoritas.map((nombre, i) => {
                const objetivo = normalizar(nombre);
                // Prefijo en ambos sentidos: el catálogo trae "Pizza Hawai" y
                // "Pizza Jamon", mientras la tarjeta habla de "Hawaii" y
                // "Jamón y Queso". Un nombre vacío nunca empareja.
                const producto = lista.find((p) => {
                  const actual = normalizar(p.nombre);
                  return (
                    actual !== "" &&
                    objetivo !== "" &&
                    (actual.startsWith(objetivo) || objetivo.startsWith(actual))
                  );
                });
                if (!producto) return null;
                const favorita = productoACatalogo(producto, categorias);
                return (
                  <motion.div
                    key={producto.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.45 }}
                    onClick={() => onOpenDetail(favorita)}
                    className="group w-full md:w-auto bg-card rounded-[20px] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.03] transition-all duration-300 cursor-pointer flex flex-col"
                  >
                    {/* Image */}
                    <div className="relative h-52 bg-muted overflow-hidden">
                      <img
                        src={favorita.image}
                        alt={favorita.name}
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
                        {favorita.name}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 flex-1 mb-4">
                        {favorita.description}
                      </p>

                      {/* Price + Rating */}
                      <div className="flex items-center justify-between mt-auto">
                        <span
                          className="text-[#DC2626] text-lg font-semibold"
                          style={{ fontFamily: MONO }}
                        >
                          $ {favorita.price.toLocaleString("es-CO")}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              });
            })()}
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
              <div className="flex items-center gap-3">
                <img
                  src={logoBlanco}
                  alt="Logo"
                  className="w-11 h-11 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full object-contain shrink-0"
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
                  <span>{DIRECCION_LOCAL}</span>
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
  /** Siguen llegando desde CatalogScreen; ya no se usan acá porque la tarjeta
      dejó de tener el stepper [− cantidad +]. */
  cart: CartItem[];
  updateQty: (id: string, qty: number) => void;
}) {
  return (
    <motion.div
      data-producto-id={p.id}
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
        <div className="absolute top-3 right-3 z-10">
          {/* Mismos colores de estado que el panel (ESTADO_COLORES). */}
          <Badge
            className="border-0"
            style={{
              backgroundColor: ESTADO_COLORES[p.status === "disponible" ? "Disponible" : "No disponible"] + "1A",
              color: ESTADO_COLORES[p.status === "disponible" ? "Disponible" : "No disponible"],
            }}
          >
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
            {/* Solo ícono: el botón nunca se transforma. Cada clic suma 1
                unidad (quickAdd deduplica dentro de setCart) y dispara el
                toast, sin abrir el carrito. El tamaño se elige en el detalle
                ("Ver más" o la imagen). */}
            <button
              onClick={() => onQuickAdd(p)}
              disabled={p.status !== "disponible"}
              title="Agregar al carrito"
              aria-label={`Agregar ${p.name} al carrito`}
              className="flex items-center justify-center min-w-[40px] min-h-[40px] p-2 bg-primary text-white rounded-xl hover:bg-red-700 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
  search,
  setSearch,
  productos,
  onOpenDetail,
  cart,
  updateQty,
  categorias,
}: {
  navigate: (s: Screen) => void;
  setProduct: (p: Product) => void;
  quickAdd: (p: Product) => void;
  initialCat?: string;
  /** Página del catálogo, controlada por App para que sobreviva al detalle. */
  page: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  /** Búsqueda del catálogo, controlada por App para que sobreviva al detalle. */
  search: string;
  setSearch: (s: string) => void;
  /** Productos del panel de administrador. */
  productos: Product[];
  /** Abre el detalle guardando la pantalla de origen. */
  onOpenDetail: (p: Product) => void;
  cart: CartItem[];
  updateQty: (id: string, delta: number) => void;
  /** Categorías del admin, para filtros dinámicos. */
  categorias: CategoriaProducto[];
}) {
  const [cat, setCat] = useState(initialCat);
  const isMobile = useIsMobile();
  const productosSeguros = Array.isArray(productos) ? productos : [];
  const categoriasSeguras = Array.isArray(categorias) ? categorias : [];
  // 9 = 3 columnas del grid, así cada página cierra en filas completas.
  // En móvil: 6 por página (2 columnas de 3).
  const PER_PAGE = isMobile ? 6 : 9;

  // Botones de filtro. Se derivan de los PRODUCTOS que se están listando y no
  // de la lista de categorías del admin: así, aunque una categoría se haya
  // guardado con otro id o quede marcada como inactiva en localStorage, el menú
  // siempre muestra sus botones (antes no salía ninguno y solo se veía "Todas").
  const filtros = useMemo(() => {
    const porId = new Map<string, string>();
    productosSeguros.forEach((p) => {
      const id = p.idCategoria ?? "";
      if (!id || porId.has(id)) return;
      const nombre =
        categoriasSeguras.find((c) => c.id === id)?.nombre ||
        p.category ||
        "Otros";
      porId.set(id, nombre);
    });
    return [...porId.entries()].map(([id, nombre]) => ({ id, nombre }));
  }, [productosSeguros, categoriasSeguras]);

  const nombreFiltroActivo = filtros.find((f) => f.id === cat)?.nombre;

  // Si la categoría guardada ya no existe en el catálogo (se renombró o se
  // borró en el admin), el filtro quedaba apuntando a nada y la lista salía
  // vacía: se vuelve a "Todas" para que siempre se vean productos.
  useEffect(() => {
    if (cat !== "Todas" && !filtros.some((f) => f.id === cat)) setCat("Todas");
  }, [cat, filtros]);

  const filtered = useMemo(
    () =>
      productosSeguros.filter(
        (p) =>
          (cat === "Todas" ||
            p.idCategoria === cat ||
            (nombreFiltroActivo !== undefined && p.category === nombreFiltroActivo)) &&
          (search === "" ||
            (p.name ?? "")
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            (p.description ?? "")
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [search, cat, nombreFiltroActivo, productosSeguros],
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

  // La página vuelve a 1 solo en los handlers de categoría y búsqueda, no en un
  // efecto de montaje: al montar, `page` puede ser 2 (guardada de una visita
  // anterior) y este efecto la borraba antes de que el usuario viera nada.
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const abrirDetalle = (p: Product) => {
    onOpenDetail(p);
  };

  const agregarAlCarrito = (p: Product) => {
    quickAdd(p);
    // Una pizza se agrega con su tamaño por defecto (Mediana) y eso se dice en
    // el toast; las lasañas y bebidas conservan su mensaje original.
    const tamano = p.sizes.length > 1 ? ` ${sizeDe(p, 0).label}` : "";
    toast.success(`${p.name}${tamano} agregada al carrito`, {
      action: {
        label: "Ver carrito",
        onClick: () => navigate("cart"),
      },
    });
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar pizza..."
            className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            key="Todas"
            onClick={() => {
              setCat("Todas");
              setPage(1);
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${cat === "Todas" ? "bg-primary text-white shadow" : "bg-muted text-muted-foreground hover:bg-border"}`}>
              Todas
            </button>
          {filtros.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCat(c.id);
                setPage(1);
              }}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${cat === c.id ? "bg-primary text-white shadow" : "bg-muted text-muted-foreground hover:bg-border"}`}>
                {c.nombre}
              </button>
            ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-6xl mb-4">🔍</p>
          <h3 className="text-xl font-bold mb-2 text-foreground">
            {productosSeguros.length === 0 ? "No hay productos disponibles" : "Sin resultados"}
          </h3>
          <p className="text-muted-foreground">
            {productosSeguros.length === 0
              ? "Vuelve a intentarlo más tarde."
              : "No encontramos pizzas con ese nombre. ¡Intenta con otro!"}
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
              cart={cart}
              updateQty={updateQty}
            />
          ))}
        </div>
      )}

      <div className="mt-8 pb-20 md:pb-4">
        <p className="text-sm text-muted-foreground text-center mb-3">
          Mostrando {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} de {filtered.length} producto{filtered.length === 1 ? "" : "s"}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => irAPagina(Math.max(1, page - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
              className="inline-flex items-center gap-1 px-3 py-2 min-h-[40px] rounded-lg border border-border text-sm font-semibold cursor-pointer hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (n) => (
                <button
                  key={n}
                  onClick={() => irAPagina(n)}
                  aria-current={n === page ? "page" : undefined}
                  className={`w-10 h-10 min-h-[40px] min-w-[40px] rounded-lg text-sm font-semibold cursor-pointer ${
                    n === page
                      ? "bg-primary text-white"
                      : "border border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {n}
                </button>
              ),
            )}
            <button
              onClick={() => irAPagina(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              aria-label="Página siguiente"
              className="inline-flex items-center gap-1 px-3 py-2 min-h-[40px] rounded-lg border border-border text-sm font-semibold cursor-pointer hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <VolverArriba />
    </div>
  );
}

// ─────────────────────────── PRODUCT DETAIL ───────────────────────────

function ProductDetailScreen({
  product,
  navigate,
  addDetailed,
  onBack,
  backLabel,
}: {
  product: Product;
  navigate: (s: Screen, options?: { restaurar?: boolean }) => void;
  addDetailed: (item: CartItem) => void;
  onBack: () => void;
  backLabel: string;
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
    setQty(1);
    toast.success(`${product.name} ${size.label} × ${qty} agregada al carrito`, {
      action: {
        label: "Ver carrito",
        onClick: () => navigate("cart"),
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {backLabel}
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
              pizzas ofrecen una elección real entre Mediana y Grande. */}
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

// Los datos de las cuentas de pago (PAYMENT_INFO) viven ahora en el componente
// compartido PasoPagoTransferencia, usado por el checkout y por el modal
// "Completar pago" de Mis pedidos.

/** El horario de atención, el parser de horas y el formato "6:30 p. m." viven
    en `utils/hora.ts` para compartirlos con las pantallas que muestran la hora
    de recogida (Ventas, Mis Pedidos, Producción). La recogida es siempre hoy y
    el último horario ofrecido es 9:45 p. m. */

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
  confirmationData,
  onClearConfirmation,
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
    clienteTelefono?: string,
  ) => string;
  isLoggedIn: boolean;
  /** Nombre del usuario en sesión; se muestra en el resumen y la confirmación. */
  clienteSesion?: string;
  onRequireLogin: (order: PendingOrder) => void;
  /** Resumen del pedido ya registrado que se viene a mostrar (llega
      del login, cuando un invitado inicia sesión con el pedido a
      medio hacer). */
  confirmationData?: PedidoResumen;
  /** Limpia `orderConfirmation` en App al salir de la confirmación. */
  onClearConfirmation?: () => void;
}) {
  const [payment, setPayment] = useState("Nequi");
  const [checkoutStep, setCheckoutStep] = useState<0 | 1 | 2 | 3>(
    0,
  );
  const [comprobante, setComprobante] = useState<string>("");
  const { subir, subiendo } = useSubirArchivo();
  const [horaRecogida, setHoraRecogida] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestDocument, setGuestDocument] = useState("");
  /** Teléfono del cliente: opcional, pero se guarda con el pedido para que el
      local pueda avisarle algo antes de la recogida. */
  const [guestPhone, setGuestPhone] = useState("");
  /** Marca el campo como tocado para mostrar el error mientras se escribe
      (validación en tiempo real) sin gritarle al cliente desde el primer
      carácter. */
  const [tocadoDoc, setTocadoDoc] = useState(false);
  const [tocadoNombre, setTocadoNombre] = useState(false);
  const [tocadoTel, setTocadoTel] = useState(false);
  /** true apenas se intenta avanzar con el formulario inválido: así aparecen
      todos los errores juntos aunque el campo no se haya tocado. */
  const [intentoDatos, setIntentoDatos] = useState(false);
  // Trampa de Tab, foco al primer inválido y aria (lógica compartida). El
  // teléfono es opcional: entra al orden solo para el foco, sin trampa.
  const validacionDatos = useValidacionFormulario([
    "documento", "nombre", "telefono",
  ]);
  const [loading, setLoading] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState(
    Boolean(confirmationData),
  );
  // Resumen del pedido que se acaba de registrar (id, productos,
  // total, cliente y hora): alimenta la pantalla de confirmación.
  // En el flujo invitado→login arranca desde `confirmationData`.
  const [pedidoResumen, setPedidoResumen] = useState<PedidoResumen | null>(
    confirmationData ?? null,
  );
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

  // ── Validación de la hora de recogida ──
  // Se puede elegir cualquier minuto dentro del horario de atención
  // (4:00 PM – 10:00 PM), no solo horas exactas.
  const horaFueraDeRango = (valor: string) => {
    const m = minutosDeHora(valor);
    return m !== null && (m < HORA_APERTURA || m > HORA_CIERRE);
  };
  const horaYaPaso = (valor: string) => {
    const m = minutosDeHora(valor);
    if (m === null) return false;
    const ahora = new Date().getHours() * 60 + new Date().getMinutes();
    return m <= ahora;
  };

  // ── Horarios que ofrece el selector de recogida ──
  // La recogida es siempre hoy, así que solo se listan los horarios futuros
  // dentro del horario de atención (4:00 p. m. – 9:45 p. m.), en intervalos
  // de 15 minutos. El input nativo desapareció a propósito: mostraba "a. m."
  // y no se le podía ocultar.
  const ahoraMinutos = new Date().getHours() * 60 + new Date().getMinutes();
  const minutosDisponiblesDe = (hora: number) =>
    MINUTOS_RECOGIDA.filter((m) => hora * 60 + m > ahoraMinutos);
  const horasDisponibles: number[] = [];
  for (
    let h = Math.floor(HORA_APERTURA / 60);
    h <= Math.floor(HORA_ULTIMA_RECOGIDA / 60);
    h++
  ) {
    if (minutosDisponiblesDe(h).length > 0) horasDisponibles.push(h);
  }
  /** true cuando ya cerró el día de hoy: no queda ningún horario que ofrecer. */
  const sinHorariosHoy = horasDisponibles.length === 0;
  const [horaSel, minutoSel] = horaRecogida
    ? [
        parseInt(horaRecogida.split(":")[0], 10),
        parseInt(horaRecogida.split(":")[1] ?? "0", 10),
      ]
    : [null, null];
  const seleccionValida =
    horaSel !== null &&
    minutoSel !== null &&
    horasDisponibles.includes(horaSel) &&
    minutosDisponiblesDe(horaSel).includes(minutoSel);
  // Si el horario elegido quedó atrás (pasó el tiempo mientras el cliente
  // revisaba el resumen), la selección se limpia y vuelve a pedirse.
  useEffect(() => {
    if (horaRecogida && !seleccionValida) setHoraRecogida("");
  }, [horaRecogida, seleccionValida]);

  // ── Validación del formulario "Datos para enviar tu pedido" ──
  // Se recalcula en cada render, así que el mensaje cambia mientras se escribe;
  // solo se pinta si el campo ya se tocó o si se intentó avanzar.
  const errDocumento = validarDocumento(guestDocument, "CC");
  const errNombre = validarNombre(guestName);
  const errTelefono = validarTelefonoOpcional(guestPhone);
  // El hook suma sus propios campos "visibles" (trampa de Tab / envío) a los
  // flags `tocado*` y `intentoDatos` que ya usaba este formulario.
  const verErrDoc =
    tocadoDoc || intentoDatos || validacionDatos.estaVisible("documento")
      ? errDocumento
      : null;
  const verErrNom =
    tocadoNombre || intentoDatos || validacionDatos.estaVisible("nombre")
      ? errNombre
      : null;
  const verErrTel =
    tocadoTel || intentoDatos || validacionDatos.estaVisible("telefono")
      ? errTelefono
      : null;
  const datosValidos = !errDocumento && !errNombre && !errTelefono;

  // QR de pago de la cuenta elegida (Nequi o Bancolombia). Se genera en el
  // cliente para que el recuadro funcione sin depender de ningún servicio
  // externo; si falla, el recuadro muestra el mensaje de reserva.
  const [qrDataUrl, setQrDataUrl] = useState("");
  useEffect(() => {
    let vivo = true;
    const base = PAYMENT_INFO[payment]?.qr ?? "";
    const payload = base
      ? `${base}${base.includes("?") ? "&" : "?"}valor=${subtotal}`
      : "";
    if (!payload) {
      setQrDataUrl("");
      return;
    }
    QRCode.toDataURL(payload, {
      margin: 1,
      width: 260,
      color: { dark: "#141414", light: "#ffffff" },
    })
      .then((url) => vivo && setQrDataUrl(url))
      .catch(() => vivo && setQrDataUrl(""));
    return () => {
      vivo = false;
    };
  }, [payment, subtotal]);

  /** Último paso: registra la venta con los datos del formulario (invitado)
      o con los de la sesión. Los datos YA se pidieron en el paso 3, así que
      aquí no se vuelve a interrumpir el flujo. */
  const handleConfirm = () => {
    if (!comprobante) {
      toast.error("Por favor sube el comprobante de pago");
      return;
    }
    if (!horaRecogida) {
      toast.error("Por favor selecciona la hora de recogida");
      return;
    }
    const minutos = minutosDeHora(horaRecogida);
    if (minutos === null || minutos < HORA_APERTURA || minutos > HORA_CIERRE) {
      toast.error("La hora debe estar entre 4:00 PM y 10:00 PM");
      return;
    }
    if (horaYaPaso(horaRecogida)) {
      toast.error("Esta hora no está disponible — ya pasó");
      return;
    }
    if (!isLoggedIn && !datosValidos) {
      // Nunca debería pasar (el paso 3 ya validó), pero el pedido no se
      // registra a medias si el formulario quedó en un estado inválido.
      setIntentoDatos(true);
      setCheckoutStep(3);
      toast.error("Revisa tus datos para enviar el pedido");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const idVenta = onOrder(
        payment,
        comprobante,
        [...cart],
        horaRecogida,
        nombreCliente || undefined,
        guestDocument.trim() || undefined,
        guestPhone.trim() || undefined,
      );
      // Resumen del pedido ANTES de vaciar el carrito: es lo que
      // muestra la pantalla de confirmación.
      setPedidoResumen({
        id: idVenta,
        items: [...cart],
        total: cart.reduce((s, i) => s + cartTotal(i), 0),
        nombre: nombreCliente,
        documento: guestDocument.trim() || undefined,
        telefono: guestPhone.trim() || undefined,
        hora: hora12(horaRecogida),
      });
      clear();
      setLoading(false);
      setCheckoutStep(0);
      setPedidoConfirmado(true);
    }, 1400);
  };

  /** Paso 1 del checkout: valida el formulario de datos y pasa al resumen. */
  const continuarDatos = () => {
    setIntentoDatos(true);
    if (!datosValidos) {
      toast.error(
        errDocumento ??
          errNombre ??
          errTelefono ??
          "Revisa los datos de tu pedido",
      );
      // Muestra todos los errores y lleva el foco al primer campo inválido.
      validacionDatos.enfocarPrimero({
        documento: errDocumento,
        nombre: errNombre,
        telefono: errTelefono,
      });
      return;
    }
    setCheckoutStep(1);
  };

  if (pedidoConfirmado && pedidoResumen) {
    const horaEtiqueta = hora12(pedidoResumen.hora);
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-7xl mb-6">⏳</div>
        <h2
          className="text-2xl font-bold mb-2 text-foreground"
          style={{ fontFamily: SERIF }}
        >
          ¡Pedido recibido!
        </h2>

        {/* a) Pedido: número, estado y mensaje de verificación. Ocupa el
            ancho completo, igual que el encabezado. */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4 text-left">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" /> Pedido{" "}
              {pedidoResumen.id}
            </h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Por verificar
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Estamos verificando tu comprobante de pago. Esto tardará unos
            pocos minutos; te confirmaremos cuando tu pedido esté listo.
          </p>
        </div>

        {/* b) Dos columnas: cliente y recogida a la izquierda; productos y
            totales a la derecha. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start text-left">
          {/* Productos con su desglose y totales. En "pedido recibido" los
              productos van a la derecha y cliente/recogida a la izquierda. */}
          <div className="order-2 md:order-2 bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-foreground mb-3">Productos</h3>
            <div className="space-y-3 mb-4">
              {pedidoResumen.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.size ? `${item.size} · ` : ""}x{item.quantity}
                    </p>
                  </div>
                  <span
                    className="text-sm font-bold text-foreground shrink-0"
                    style={{ fontFamily: MONO }}
                  >
                    {fmt((item.sizePrice + item.extrasPrice) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <ResumenTotales subtotal={pedidoResumen.total} />
          </div>

          {/* Cliente + dónde recoger. */}
          <div className="order-1 md:order-1 space-y-6">
            {pedidoResumen.nombre && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-bold text-foreground mb-2">Cliente</h3>
                <p className="text-foreground font-semibold">
                  {pedidoResumen.nombre}
                </p>
                {pedidoResumen.documento && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Documento: {pedidoResumen.documento}
                  </p>
                )}
                {pedidoResumen.telefono && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Teléfono: {pedidoResumen.telefono}
                  </p>
                )}
              </div>
            )}

            {/* Recogida: hora, dirección, teléfono y horario. */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Dónde
                recoger tu pedido
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Podrás pasar por tu pedido a la hora estipulada.
              </p>
              <div className="mb-4 border-l-2 border-primary/60 pl-3">
                <p className="text-xs text-muted-foreground">Hora de recogida</p>
                <p className="text-base font-bold text-primary">{horaEtiqueta}</p>
              </div>
              <p className="text-foreground font-semibold">
                La Sirena Pizza
              </p>
              <p className="text-muted-foreground text-sm">
                {DIRECCION_LOCAL}
              </p>

              {/* Mapa de Google Maps del local (sin API key). */}
              <div className="mt-3 overflow-hidden rounded-xl border border-border">
                <iframe
                  title="Ubicación de La Sirena Pizza en Google Maps"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(DIRECCION_LOCAL)}&output=embed`}
                  loading="lazy"
                  className="w-full h-[150px] border-0"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <a
                href={`https://www.google.com/maps?q=${encodeURIComponent(DIRECCION_LOCAL)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <MapPin className="w-3.5 h-3.5" /> Abrir en Google Maps
              </a>

              <div className="mt-3 pt-3 border-t border-border space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> 604 234 5678
                </p>
                <p className="text-xs font-semibold text-primary">
                  Horario: jueves a domingo, de 4:00 p. m. a 10:00 p. m.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          {isLoggedIn && (
            <PrimaryBtn
              onClick={() => {
                onClearConfirmation?.();
                navigate("mis-pedidos");
              }}
              size="lg"
            >
              Ver mis pedidos
            </PrimaryBtn>
          )}
          <GhostBtn
            onClick={() => {
              onClearConfirmation?.();
              navigate("landing");
            }}
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
                    <div className="flex items-center justify-end gap-6">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Precio unitario</p>
                        <p className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>
                          {fmt(item.sizePrice + item.extrasPrice)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Subtotal</p>
                        <p className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>
                          {fmt(cartTotal(item))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resumen + CTA. Sticky en escritorio: con muchos productos el
              recuadro acompaña el scroll y el total y el botón de pago
              siempre están a la vista. */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="font-bold mb-3 text-foreground flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary" />{" "}
                Resumen
              </h3>
              {/* Solo recogida y total: la fila "Subtotal (N productos)" se
                  quitó del recuadro (el cambio aplica igual en el modal de
                  pago y en la confirmación, porque es el mismo componente). */}
              <ResumenTotales
                subtotal={subtotal}
                className="space-y-2 mb-4 text-sm"
              />
              <PrimaryBtn
                // Sin sesión lo primero es el formulario de datos; con sesión
                // se entra directo al resumen como siempre.
                onClick={() => setCheckoutStep(isLoggedIn ? 1 : 3)}
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
              className="bg-card rounded-2xl w-full max-w-4xl shadow-2xl border border-border my-4"
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
                          <span className="text-sm text-foreground" style={{ fontFamily: MONO }}>
                            {item.quantity} × {fmt(item.sizePrice + item.extrasPrice)}
                          </span>
                          <span
                            className="text-sm font-bold text-foreground"
                            style={{ fontFamily: MONO }}
                          >
                            {fmt(cartTotal(item))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Mismas filas que el panel "Resumen" del carrito, para
                      que el cliente lea el mismo desglose en las dos vistas.
                      La divisoria ya viene dentro de ResumenTotales. */}
                  <ResumenTotales
                    subtotal={subtotal}
                    className="mt-4 space-y-2 text-sm"
                  />
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

                  {/* Hora de recogida: dos selects (hora y minutos de 15 en
                      15), siempre en p. m., de 4:00 p. m. a 9:45 p. m., y solo
                      con los horarios que aún no pasaron hoy. */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Hora de recogida
                    </p>
                    <div className="mb-3 border-l-2 border-primary/60 pl-3 text-sm text-muted-foreground">
                      <p>
                        Atendemos de <strong className="text-foreground">4:00 p. m.</strong> a{" "}
                        <strong className="text-foreground">10:00 p. m.</strong>
                      </p>
                      <p className="text-xs mt-0.5">
                        El último horario de recogida es{" "}
                        <strong className="text-foreground">9:45 p. m.</strong>
                      </p>
                    </div>
                    <div
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-muted focus-within:ring-2 focus-within:ring-primary/30 transition-all ${
                        horaFueraDeRango(horaRecogida)
                          ? "border-red-400 focus-within:ring-red-300"
                          : "border-border"
                      }`}
                    >
                      <span className="text-base shrink-0">🕐</span>
                      <select
                        value={seleccionValida && horaSel !== null ? horaSel : ""}
                        disabled={sinHorariosHoy}
                        aria-label="Hora de recogida, de 4:00 p. m. a 9:45 p. m."
                        onChange={(e) => {
                          const nuevaHora = Number(e.target.value);
                          const minutos = minutosDisponiblesDe(nuevaHora);
                          const minutoActual = minutos.includes(minutoSel ?? -1)
                            ? (minutoSel as number)
                            : minutos[0];
                          setHoraRecogida(
                            `${String(nuevaHora).padStart(2, "0")}:${String(minutoActual).padStart(2, "0")}`,
                          );
                        }}
                        className="flex-1 bg-transparent text-sm text-foreground focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                      >
                        <option value="" disabled>
                          --:--
                        </option>
                        {horasDisponibles.map((h) => (
                          <option key={h} value={h}>
                            {`${h > 12 ? h - 12 : h}:00 p. m.`}
                          </option>
                        ))}
                      </select>
                      <select
                        value={
                          seleccionValida && minutoSel !== null ? minutoSel : ""
                        }
                        disabled={
                          sinHorariosHoy ||
                          horaSel === null ||
                          !horasDisponibles.includes(horaSel)
                        }
                        aria-label="Minutos de la hora de recogida"
                        onChange={(e) => {
                          if (horaSel === null) return;
                          setHoraRecogida(
                            `${String(horaSel).padStart(2, "0")}:${String(
                              Number(e.target.value),
                            ).padStart(2, "0")}`,
                          );
                        }}
                        className="w-14 bg-transparent text-sm text-foreground focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                      >
                        <option value="" disabled>
                          --
                        </option>
                        {(
                          horaSel !== null ? minutosDisponiblesDe(horaSel) : []
                        ).map((m) => (
                          <option key={m} value={m}>
                            {String(m).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>
                    {sinHorariosHoy ? (
                      <p className="text-xs mt-1.5 font-medium flex items-center gap-1 text-red-500">
                        ⚠ Ya no hay horarios disponibles para hoy
                      </p>
                    ) : (
                      horaRecogida && (
                        <p
                          className={`text-xs mt-1.5 font-medium flex items-center gap-1 ${
                            horaYaPaso(horaRecogida)
                              ? "text-red-500"
                              : horaFueraDeRango(horaRecogida)
                                ? "text-red-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {horaFueraDeRango(horaRecogida)
                            ? "⚠ Esta hora está fuera de nuestro horario de atención (4:00 PM – 10:00 PM)"
                            : horaYaPaso(horaRecogida)
                              ? "⚠ Esta hora no está disponible — ya pasó"
                              : `Recogerás a las ${hora12(horaRecogida)}`}
                        </p>
                      )
                    )}
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
                    if (sinHorariosHoy) {
                      toast.error("Ya no hay horarios disponibles para hoy");
                      return;
                    }
                    if (!horaRecogida) {
                      toast.error("Por favor ingresa la hora de recogida");
                      return;
                    }
                    const minutos = minutosDeHora(horaRecogida);
                    if (minutos === null || minutos < HORA_APERTURA || minutos > HORA_CIERRE) {
                      toast.error("La hora debe estar entre 4:00 PM y 10:00 PM");
                      return;
                    }
                    if (horaYaPaso(horaRecogida)) {
                      toast.error("Esta hora no está disponible — ya pasó");
                      return;
                    }
                    setCheckoutStep(2);
                  }}
                  disabled={sinHorariosHoy}
                  className={`flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors active:scale-95 flex items-center justify-center gap-2 ${
                    sinHorariosHoy
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
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
                  Primero tus datos: con ellos quedamos a nombre de quién va el
                  pedido. Después revisas el resumen y el pago.
                </p>
                <div className="space-y-3 mb-5">
                  {/* 1) Documento — obligatorio, 6 a 10 dígitos. */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Documento <span className="text-primary">*</span>
                    </label>
                    <input
                      value={guestDocument}
                      onChange={(e) => {
                        setGuestDocument(soloDigitos(e.target.value).slice(0, 10));
                        setTocadoDoc(true);
                      }}
                      onBlur={() => setTocadoDoc(true)}
                      onKeyDown={validacionDatos.onKeyDownCampo("documento", {
                        validar: () => errDocumento,
                      })}
                      placeholder="Ej: 1234567890"
                      inputMode="numeric"
                      ref={validacionDatos.refCampo("documento")}
                      {...validacionDatos.ariaCampo("documento", verErrDoc)}
                      className={`w-full px-4 py-2.5 bg-muted rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                        verErrDoc ? "border-red-400 bg-red-50/30" : "border-border"
                      }`}
                    />
                    <p
                      id={verErrDoc ? validacionDatos.idError("documento") : undefined}
                      className={`text-xs mt-1 ${
                        verErrDoc ? "text-red-500 dark:text-red-400" : "text-muted-foreground"
                      }`}
                    >
                      {verErrDoc ?? "Entre 6 y 10 dígitos"}
                    </p>
                  </div>

                  {/* 2) Nombre — obligatorio. */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Nombre completo <span className="text-primary">*</span>
                    </label>
                    <input
                      value={guestName}
                      onChange={(e) => {
                        setGuestName(filtrarNombre(e.target.value));
                        setTocadoNombre(true);
                      }}
                      onBlur={() => setTocadoNombre(true)}
                      onKeyDown={validacionDatos.onKeyDownCampo("nombre", {
                        validar: () => errNombre,
                      })}
                      placeholder="Ej: Laura Martínez"
                      ref={validacionDatos.refCampo("nombre")}
                      {...validacionDatos.ariaCampo("nombre", verErrNom)}
                      className={`w-full px-4 py-2.5 bg-muted rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                        verErrNom ? "border-red-400 bg-red-50/30" : "border-border"
                      }`}
                    />
                    {verErrNom && (
                      <p id={validacionDatos.idError("nombre")} className="text-xs text-red-500 dark:text-red-400 mt-1">
                        {verErrNom}
                      </p>
                    )}
                  </div>

                  {/* 3) Teléfono — opcional. */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Número de teléfono{" "}
                      <span className="text-muted-foreground font-normal">
                        (opcional)
                      </span>
                    </label>
                    <input
                      value={guestPhone}
                      onChange={(e) => {
                        setGuestPhone(soloDigitos(e.target.value).slice(0, 10));
                        setTocadoTel(true);
                      }}
                      onBlur={() => setTocadoTel(true)}
                      placeholder="Ej: 310 555 1234"
                      inputMode="tel"
                      ref={validacionDatos.refCampo("telefono")}
                      {...validacionDatos.ariaCampo("telefono", verErrTel)}
                      className={`w-full px-4 py-2.5 bg-muted rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                        verErrTel ? "border-red-400 bg-red-50/30" : "border-border"
                      }`}
                    />
                    {verErrTel && (
                      <p id={validacionDatos.idError("telefono")} className="text-xs text-red-500 dark:text-red-400 mt-1">
                        {verErrTel}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={continuarDatos}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 flex items-center justify-center gap-2"
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
              className="bg-card rounded-2xl w-full max-w-3xl shadow-2xl border border-border my-4"
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
              {/* Body: dos columnas — izquierda cuenta + QR, derecha
                  comprobante. El cuerpo del pago es un componente compartido
                  (PasoPagoTransferencia) que también usa el modal
                  "Completar pago" de Mis pedidos. */}
              <PasoPagoTransferencia
                payment={payment}
                subtotal={subtotal}
                qrDataUrl={qrDataUrl}
                comprobante={comprobante}
                onQuitarComprobante={() => {
                  setComprobante("");
                  if (fileRef.current) fileRef.current.value = "";
                }}
                subiendo={subiendo}
                fileRef={fileRef}
                onFileChange={(file) => {
                  void subir(file, "comprobantes").then((url) => {
                    if (url) setComprobante(url);
                  });
                }}
              />
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
  onGuardarPerfil,
  onPasswordSaved,
  perfilCargando,
  perfilError,
  onReintentarPerfil,
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
  /** Guarda correo y teléfono en el backend (PUT /auth/perfil). */
  onGuardarPerfil: (datos: {
    correo: string;
    telefono: string;
  }) => Promise<{ ok: boolean; campo?: "correo" | "telefono" | "general"; mensaje?: string }>;
  /** Tras guardar la contraseña con éxito: toast, cierre de sesión y login
   *  con el correo ya escrito. */
  onPasswordSaved?: (correo: string) => void;
  perfilCargando?: boolean;
  perfilError?: string | null;
  onReintentarPerfil?: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [showCambiarContrasena, setShowCambiarContrasena] = useState(false);
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

  const tipoDocumento = loggedInUser?.tipoDocumento
    ? etiquetaTipoDocumento(loggedInUser.tipoDocumento)
    : "—";

  const handleGuardar = async () => {
    const ec = validarCorreo(correo);
    const et = validarTelefono(telefono);
    if (ec || et) {
      setErrores({
        correo: ec ?? undefined,
        telefono: et ?? undefined,
      });
      return;
    }
    setGuardando(true);
    try {
      // Guardado real contra PUT /auth/perfil (no solo memoria local).
      const resultado = await onGuardarPerfil({
        correo: correo.trim().toLowerCase(),
        telefono: telefono.trim(),
      });
      if (!resultado.ok) {
        if (resultado.campo === "correo") setErrores({ correo: resultado.mensaje });
        else if (resultado.campo === "telefono") setErrores({ telefono: resultado.mensaje });
        else toast.error(resultado.mensaje ?? "No se pudo guardar el perfil. Inténtalo de nuevo.");
        return;
      }
      setGuardado({
        correo: correo.trim().toLowerCase(),
        telefono: telefono.trim(),
      });
      setEditando(false);
      setErrores({});
      toast.success("Perfil actualizado correctamente");
    } finally {
      setGuardando(false);
    }
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
      {/* Carga / error de GET /auth/me: los datos locales se ven mientras
          llegan; si el servidor falla, se puede reintentar. */}
      {perfilCargando && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" aria-hidden />
          Cargando tu información desde el servidor…
        </div>
      )}
      {perfilError && (
        <div className="mb-4 flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50/60 text-sm text-red-700">
          <span className="flex-1 min-w-[200px]">{perfilError}</span>
          {onReintentarPerfil && (
            <button
              onClick={onReintentarPerfil}
              disabled={perfilCargando}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer transition-colors disabled:opacity-60"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden />
              Reintentar
            </button>
          )}
        </div>
      )}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Avatar */}
        <div className="flex flex-wrap items-center gap-5 px-6 py-6 border-b border-border bg-muted/30">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0 ml-auto">
              <button
                onClick={() => setShowCambiarContrasena(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-border bg-white dark:bg-card text-foreground text-sm font-semibold rounded-xl hover:bg-muted active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <KeyRound className="w-4 h-4" />
                Cambiar contraseña
              </button>
              <button
                onClick={() => {
                  setCorreo(guardado.correo);
                  setTelefono(guardado.telefono);
                  setErrores({});
                  setEditando(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Pencil className="w-4 h-4" /> Editar
              </button>
            </div>
          )}
          {editando && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0 ml-auto">
              <button
                disabled
                title="Termina de editar tu perfil primero"
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-border bg-white dark:bg-card text-foreground text-sm font-semibold rounded-xl opacity-60 cursor-not-allowed shrink-0"
              >
                <KeyRound className="w-4 h-4" />
                Cambiar contraseña
              </button>
            </div>
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
                <User className="w-3.5 h-3.5" /> Nombre completo
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
                <Phone className="w-3.5 h-3.5" /> Número de teléfono
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
                onClick={() => void handleGuardar()}
                disabled={guardando}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 cursor-pointer transition-all disabled:opacity-60"
              >
                <Check className="w-4 h-4" /> {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => navigate("catalog")}
                className="flex items-center gap-2 px-5 py-2.5 bg-muted text-foreground rounded-xl text-sm font-semibold hover:bg-border cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Volver al Menú
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

      {showCambiarContrasena && loggedInUser && (
        <CambiarContrasenaModal
          correo={loggedInUser.correo}
          onClose={() => setShowCambiarContrasena(false)}
          onCambioExitoso={() => {
            // Éxito: se cierra el modal y se cierra la sesión (con el correo
            // ya escrito en la pantalla de Iniciar sesión).
            setShowCambiarContrasena(false);
            onPasswordSaved?.(loggedInUser.correo);
          }}
        />
      )}
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
  const RELLENO_CLARO =
    "linear-gradient(to bottom, #85613f 0%, #b57740 15%, #4c4a08 35%, #944a1a 50%, #391101 66%, #ca7331 85%, #2a0c01 100%)";
  const RELLENO_OSCURO =
    "linear-gradient(to bottom, #1e120a 0%, #482710 15%, #17120a 30%, #391503 50%, #0a0200 66%, #401b08 85%, #000000 100%)";
  return (
    <div className="relative min-h-screen bg-muted">
      {/* Fondo unico de TODA la pantalla, con IMAGEN POR TEMA.

          `bienvenido-la-sirena-light.webp` (1994x789) y
          `bienvenido-la-sirena-dark.webp` (1993x789) son las dos versiones de la
          misma escena de bienvenida EXTENDIDA (~2.5:1): logo de Pizzeria La
          Sirena, titulo, subtitulo y tres beneficios a la IZQUIERDA; el lado
          derecho (horno y cocina) es decoracion pura y es donde se apoya la
          tarjeta. Su ratio ya cubre holgadamente cualquier escritorio, asi que
          NO hace falta relleno lateral, copia desenfocada ni mascara de
          fundido: una sola capa `cover` basta.

          Se usan los .webp (252 KB y 222 KB) y no los .png originales (2.42 MB
          y 2.20 MB) porque el peso al vuelo se reduce ~90%. Los .png siguen en
          `src/assets/img/` como respaldo, pero NO se importan, asi que no
          entran al build.

          POR QUE DOS CAPAS Y NO UN `src={darkMode ? a : b}`:
          con un solo `<img>` el cambio de tema obliga a descargar la imagen nueva
          en ese preciso instante, y hasta que llega se ve el `bg-muted` del
          contenedor (fondo "vacio"). Aqui las DOS capas estan siempre en el DOM,
          asi que el navegador las precarga al montar la pantalla. El cambio de
          tema es entonces solo un `opacity`, sin peticion nueva y sin parpadeo.

          `transition-opacity duration-500` da el fundido. `darkMode` llega por
          prop desde el `useState` de App, asi que al pulsar la luna la capa
          visible se cruza al instante y sin recargar la pagina.

          CADA CAPA ES UN SOLO DIV HIJO con la imagen del tema:

          - `background-size: cover` + `background-position: left center` +
            `background-repeat: no-repeat` llenan TODO el viewport manteniendo
            el ratio natural. Gracias al anclaje a la IZQUIERDA, el logo, el
            titulo, el subtitulo y los tres beneficios (que viven en esa banda
            izquierda de la foto) SIEMPRE se ven completos y nunca se recortan
            por ese lado. Cuando la ventana es mas ancha que ~2.5:1 lo que se
            recorta es solo decoracion por la derecha; `overflow-hidden` del
            exterior recorta ese desbordamiento.

          - El div exterior lleva `background: RELLENO_*`, un degradado VERTICAL
            cuyos paradas son los tonos muestreados en el borde derecho de cada
            imagen. Hoy es SOLO un respaldo por si la imagen tarda en cargar.

          El `bg-muted` del contenedor se conserva como red de seguridad para el
          breve instante en que aun no ha llegado ninguna de las dos.

          Sin `alt` ni `role="img"`: es decorativo y anunciarlo a un lector de
          pantalla es ruido. No se pierde nada porque TODO el texto de los
          formularios vive dentro de las tarjetas, que si se anuncian. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 z-0 overflow-hidden transition-opacity duration-500 ${
          darkMode ? "opacity-0" : "opacity-100"
        }`}
        style={{ background: RELLENO_CLARO }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${fondoBienvenidoLight})`,
            backgroundSize: "cover",
            backgroundPosition: "left center",
            backgroundRepeat: "no-repeat",
          }}
        />
      </div>
      <div
        aria-hidden="true"
        className={`absolute inset-0 z-0 overflow-hidden transition-opacity duration-500 ${
          darkMode ? "opacity-100" : "opacity-0"
        }`}
        style={{ background: RELLENO_OSCURO }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${fondoBienvenidoDark})`,
            backgroundSize: "cover",
            backgroundPosition: "left center",
            backgroundRepeat: "no-repeat",
          }}
        />
      </div>

      {/* Velo SOLO EN MOVIL Y TABLET (`lg:hidden`).

          A partir de 1024px la tarjeta se ancla a la derecha (`sm:justify-end`
          + `lg:justify-end`) y hay ancho de sobra para que convivan la tarjeta y
          la zona izquierda de la imagen, que es la que lleva logo y textos.

          Por debajo de eso la tarjeta ocupa casi todo el ancho y queda montada
          sobre la imagen completa, donde ademas puede recortarse la parte
          superior/inferior del texto segun la altura del viewport. El velo baja
          el contraste del fondo para que la tarjeta (opaca: `bg-card`) separe
          claramente del fondo en AMBOS temas.

          Va en negro para los dos temas a proposito: en claro un velo claro
          (p. ej. `bg-background/60`, blanco) acercaria el fondo al color de la
          tarjeta y empeoraria justo el separacion que se quiere lograr. En
          oscuro la imagen ya es oscura, pero el velo refuerza el contraste con
          los textos claros del formulario. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 bg-black/30 dark:bg-black/55 lg:hidden"
      />

      {/* Capa del contenido, la mas alta de las tres (fondo `z-0`, velo `z-10`,
          contenido `z-20`). El orden va explicito en el `z-index` y no depende
          del orden del DOM.

          `min-h-screen` y no `h-screen`: asi la pagina hace scroll normal cuando
          la tarjeta no cabe, en vez de recortarse, y el fondo la acompana
          porque las capas son `inset-0` del contenedor: al crecer este, crecen
          ellas y con `auto 100%` la foto vuelve a ocupar el alto completo. */}
      <div className={`relative z-20 flex min-h-screen ${contentClassName}`}>
        {children}
      </div>

      {overlay}
    </div>
  );
}

// ─────────────────────────── LOGIN ───────────────────────────

/** Puente API → estado local: arma la ficha `Usuario` que conoce el panel a
    partir del usuario que devolvió el backend y el rol local equivalente. */
const construirUsuarioLocal = (usuarioApi: UsuarioApi, rolLocal: Rol): Usuario => {
  const partes = usuarioApi.nombre.trim().split(/\s+/);
  const iniciales = (
    partes.length > 1
      ? (partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")
      : (partes[0] ?? "").slice(0, 2)
  ).toUpperCase();
  return {
    id: String(usuarioApi.id),
    nombre: usuarioApi.nombre,
    iniciales,
    avatarColor: AVATAR_PALETTE[0],
    correo: usuarioApi.correo,
    telefono: usuarioApi.telefono ?? "",
    tipoDocumento: usuarioApi.tipoDocumento ?? (usuarioApi.documento ? "CC" : ""),
    numeroDocumento: usuarioApi.numeroDocumento ?? usuarioApi.documento ?? "",
    rolIds: [rolLocal.id],
    rolId: rolLocal.id,
    activo: true,
  };
};

/**
 * Clases glass de Login y Registro: ahora viven en
 * `@/shared/styles/authGlass` y se reutilizan en los modales de contraseña.
 */

function LoginScreen({
  navigate,
  onLogin,
  usuarios,
  roles,
  onUsuarioNuevo,
  darkMode,
  loginNotice,
  initialEmail,
}: {
  navigate: (s: Screen) => void;
  // Devuelve { ok, mensaje }: ok=false es la señal para que esta pantalla muestre
  // el motivo y NO considere la sesión iniciada (p. ej. sin roles activos).
  onLogin: (user: Usuario) => { ok: boolean; mensaje?: string };
  usuarios: Usuario[];
  /** Roles locales: con ellos el puente traduce `usuarios.rol` del API al id
      de rol del panel. */
  roles: Rol[];
  /** Registra en el estado `usuarios` la ficha armada con datos del API. */
  onUsuarioNuevo: (user: Usuario) => void;
  darkMode: boolean;
  loginNotice?: boolean;
  /** Correo que queda escrito al llegar desde el cambio de contraseña:
   *  la sesión acaba de cerrarse y así el usuario solo escribe la clave. */
  initialEmail?: string;
}) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  // Motivo por el que App rechazó el login (sin roles activos, sin pantallas…):
  // se muestra como mensaje en la propia pantalla en lugar de un toast de éxito.
  const [rechazo, setRechazo] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);

  // Trampa de Tab, foco al primer inválido y aria (lógica compartida).
  const validacion = useValidacionFormulario(["email", "password"]);

  const validate = () => {
    const e: typeof errors = {};
    e.email = validarCorreo(email) ?? undefined;
    e.password = password ? undefined : "La contraseña es obligatoria";
    setErrors(e);
    if (e.email || e.password) validacion.enfocarPrimero(e);
    return !e.email && !e.password;
  };

  const handleLogin = async () => {
    if (!validate()) {
      return;
    }
    setRechazo(null);
    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const { usuario: usuarioApi } = await loginApi(trimmedEmail, password);

      // Puente API → estado local: la sesión, los roles y el menú siguen
      // resolviendo contra el listado local de cuentas.
      const correoApi = (usuarioApi.correo || trimmedEmail).trim().toLowerCase();
      const user = usuarios.find(
        u => u.correo.trim().toLowerCase() === correoApi,
      );

      if (user && !user.activo) {
        borrarToken();
        setErrors({
          email: "Credenciales incorrectas",
          password: "Verifica tu correo y contraseña",
        });
        toast.error("Tu cuenta está inactiva. Contacta al administrador.");
        return;
      }

      let cuenta: Usuario;
      if (user) {
        cuenta = user;
      } else {
        const nombreRolApi = (usuarioApi.rol ?? "").trim();
        const rolLocal = roles.find(
          r => normalizarNombreRol(r.nombre) === normalizarNombreRol(nombreRolApi),
        );
        if (!rolLocal) {
          borrarToken();
          toast.error("Tu cuenta no tiene un rol configurado en el panel.");
          return;
        }
        cuenta = construirUsuarioLocal(usuarioApi, rolLocal);
        onUsuarioNuevo(cuenta);
      }

      // Navigation and session state are handled by App.tsx.
      const respuesta = onLogin(cuenta);
      if (respuesta && respuesta.ok === false) {
        // El login fue RECHAZADO en App: muestra el motivo y no navega.
        borrarToken();
        const mensaje = respuesta.mensaje ?? "Tu cuenta no tiene roles activos. Contacta al administrador.";
        setRechazo(mensaje);
        toast.error(mensaje);
        return;
      }
      setRechazo(null);
      const firstName = cuenta.nombre.split(" ")[0];
      toast.success(`¡Bienvenid${firstName.endsWith("a") ? "a" : "o"}, ${firstName}!`, {
        description: "Has ingresado correctamente.",
      });
    } catch (err) {
      const status = (err as ApiErrorConEstado).status;
      const mensaje = err instanceof Error ? err.message : "No se pudo conectar con el servidor.";
      if (status === 401) {
        setErrors({
          email: "Credenciales incorrectas",
          password: "Verifica tu correo y contraseña",
        });
      } else {
        // 429 (mensaje del backend) y fallo de conexión: el interceptor ya
        // extrajo el texto que corresponde.
        toast.error(mensaje);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      contentClassName="items-start justify-center sm:justify-end px-4 py-6 lg:px-8 lg:pr-16 xl:pr-12"
      darkMode={darkMode}
      overlay={
        <AnimatePresence>
          {showForgot && (
            <ForgotPasswordModal
              onClose={() => setShowForgot(false)}
            />
          )}
        </AnimatePresence>
      }
    >
      {/* Contenido del login. El fondo por tema, el velo de movil y el
          `z-index` de esta capa viven en `AuthLayout` (mas arriba): aqui solo va
          la tarjeta y las clases de posicionamiento que se le pasan en
          `contentClassName`.

          `items-start` + `my-auto` en la tarjeta en vez de `items-center`: con
          el centrado clasico de flex, una tarjeta mas alta que la pantalla se
          empuja hacia arriba y la flecha de volver queda recortada sin forma de
          llegar a ella. Con `my-auto` los margenes automaticos absorben el
          espacio sobrante (centrado) y valen 0 cuando no hay, dejando la
          tarjeta arriba y todo accesible con scroll.

          `sm:justify-end` manda la tarjeta a la derecha ya desde 640px: el
          fondo de La Sirena ancla a la IZQUIERDA su logo y sus textos, y
          empujar la tarjeta al borde derecho cuanto antes es lo que evita que
          se monte sobre ellos. Por debajo de 640px la tarjeta es de ancho
          completo, asi que ahi el `justify-center` no se nota. `px-4` son los
          margenes laterales (16px) y `lg:px-8` los ensancha en escritorio.

          El ancho es `max-w-[480px]`, propio de esta pantalla: el login es un
          formulario corto (2 campos) y una tarjeta angosta no se monta sobre
          el logo de La Sirena ni sobre los tres beneficios del pie de la
          imagen. Crear cuenta usa `max-w-[540px]`, un poco mas ancho por su
          grilla de 2 columnas pero aun asi compacto para que quepe en un
          viewport de 1280x720. En movil `w-full` manda y la
          tarjeta llena el ancho disponible. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative my-auto ${AUTH_GLASS_CARD} w-full max-w-[480px] px-5 py-8 sm:px-10 sm:py-8`}
      >
        <button
          onClick={() => navigate("landing")}
          title="Volver al inicio"
          className={`absolute top-5 left-5 ${AUTH_GLASS_BUTTON_SECONDARY}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      <div className="text-center mb-6">
        <img src={darkMode ? logoBlanco : logoClaro} alt="S.I.V.PRO Logo" className="h-16 w-auto object-contain mx-auto mb-2" />

          <h1
            className="text-2xl font-bold text-foreground dark:text-white"
            style={{ fontFamily: SERIF }}
          >
            Bienvenido a La Sirena
          </h1>
          <p className="text-sm mt-2 text-foreground/75 dark:text-white/75">
            Ingresa tus datos para continuar
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleLogin();
          }}
        >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2 dark:text-white">
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
              ref={validacion.refCampo("email")}
              onKeyDown={validacion.onKeyDownCampo("email", {
                errores: errors,
                validar: () => validarCorreo(email),
                aplicar: (campo, err) =>
                  setErrors((p) => ({ ...p, [campo]: err ?? undefined })),
              })}
              className={authInputCls(errors.email, "h-12")}
              {...validacion.ariaCampo("email", errors.email)}
            />
            <MensajeError id={validacion.idError("email")} err={errors.email} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2 dark:text-white">
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
              inputRef={validacion.refCampo("password")}
              onKeyDown={validacion.onKeyDownCampo("password", {
                errores: errors,
                validar: () =>
                  password ? null : "La contraseña es obligatoria",
                aplicar: (campo, err) =>
                  setErrors((p) => ({ ...p, [campo]: err ?? undefined })),
              })}
              ariaInvalid={Boolean(errors.password)}
              ariaDescribedBy={
                errors.password ? validacion.idError("password") : undefined
              }
              cls={authInputCls(errors.password, "h-12")}
            />
            <MensajeError id={validacion.idError("password")} err={errors.password} />
          </div>
        </div>
        <div className="text-right mt-2">
          <button
            type="button"
            onClick={() => setShowForgot(true)}
            className="text-sm text-primary font-medium hover:underline cursor-pointer"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <PrimaryBtn
          type="submit"
          size="md"
          className="w-full mt-5 h-12"
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : null}
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </PrimaryBtn>
        </form>

        {rechazo && (
          <p className="text-center text-sm font-semibold text-red-600 mb-3">
            {rechazo}
          </p>
        )}

        {loginNotice && (
          <p className="text-center text-sm font-semibold text-red-600 mb-3">
            Debes iniciar sesión para poder hacer un pedido.
          </p>
        )}

        <p className="text-center text-sm text-foreground/75 mt-4 dark:text-white/75">
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

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<
    "email" | "code" | "password" | "done"
  >("email");
  const [forgotEmail, setForgotEmail] = useState("");
  // El código vive aquí (no en el paso) porque lo necesita el restablecer.
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  // Error que el paso de código pinta al montar (p. ej. el código caducó
  // mientras se escribía la contraseña nueva).
  const [errorCodigo, setErrorCodigo] = useState<string | undefined>();

  // Trampa de Tab, foco al primer inválido y aria del paso de correo. Los
  // pasos de código y contraseña viven en componentes compartidos que ya
  // traen esta lógica consigo.
  const validacion = useValidacionFormulario(["forgotEmail"]);

  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [onClose]);

  const sendCode = async () => {
    const err = validarCorreo(forgotEmail);
    if (err) {
      setErrores({ forgotEmail: err });
      validacion.enfocarPrimero({ forgotEmail: err });
      return;
    }
    // El backend siempre responde 200 exista o no el correo (para no revelar
    // cuentas), así que el aviso de éxito es neutro y no depende del resultado.
    const correo = forgotEmail.trim().toLowerCase();
    setErrores({});
    setLoading(true);
    try {
      await solicitarCodigoRecuperacion(correo);
      setErrorCodigo(undefined);
      setStep("code");
      toast.success("Si el correo está registrado, te enviamos un código.");
    } catch (e) {
      // 429 (demasiadas solicitudes) y fallo de conexión: el interceptor ya
      // extrajo el texto; no se avanza de paso.
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Los pasos de código y contraseña son los MISMOS componentes que usa el
  // modal de "Cambiar contraseña"; aquí solo se pegan las llamadas a la API.
  const reenviarCodigo = async () => {
    await solicitarCodigoRecuperacion(forgotEmail.trim().toLowerCase());
  };

  const verificarCodigo = async (codigoCompleto: string) => {
    try {
      const res = await verificarCodigoRecuperacion(
        forgotEmail.trim().toLowerCase(),
        codigoCompleto,
      );
      if (res.valido !== true) {
        // Defensa: el contrato manda 400, pero un 200 con valido=false se
        // trata igual que código inválido y no se avanza.
        throw new Error("El código es incorrecto o venció.");
      }
      setErrorCodigo(undefined);
      setStep("password");
    } catch (e) {
      const err = e as ApiErrorConEstado;
      if (err.message === "El código es incorrecto o venció.") {
        throw err; // el paso del código lo pinta bajo las casillas
      }
      // 429 y fallo de conexión: se avisa y se vuelve al correo, porque el
      // código no se pudo validar.
      toast.error(err.message);
      if (err.status === 429) setStep("email");
    }
  };

  const cambiarPassword = async (nueva: string) => {
    // Guardado real contra el backend: el código ya se verificó en el paso
    // anterior, pero el servidor lo vuelve a validar. La contraseña nueva no
    // se guarda en estado, localStorage ni consola.
    try {
      await restablecerContrasena(
        forgotEmail.trim().toLowerCase(),
        code.join(""),
        nueva,
      );
      setStep("done");
    } catch (e) {
      const err = e as ApiErrorConEstado;
      if (err.message === "El código es incorrecto o venció.") {
        // Caducó o quedó invalidado entre pasos: se pide de nuevo.
        setErrorCodigo(err.message);
        setStep("code");
        return;
      }
      if (err.status === 429) {
        // Demasiadas solicitudes: se reinicia el flujo desde el correo.
        toast.error(err.message);
        setCode(["", "", "", "", "", ""]);
        setStep("email");
        return;
      }
      // Fallo de conexión u otro error del servidor (p. ej. la contraseña
      // no cumple los requisitos): se reintenta desde este mismo paso sin
      // perder el código; el paso lo pinta bajo el campo.
      throw err;
    }
  };

  return (
      <div
        className={AUTH_GLASS_OVERLAY}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className={`relative my-auto ${AUTH_GLASS_CARD} w-full max-w-sm p-7`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar recuperación de contraseña"
          className={`absolute top-4 right-4 ${AUTH_GLASS_BUTTON_SECONDARY}`}
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
                className="text-xl font-bold text-foreground dark:text-white"
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
              <label className="block text-sm font-semibold text-foreground dark:text-white mb-1.5">
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
                ref={validacion.refCampo("forgotEmail")}
                onKeyDown={validacion.onKeyDownCampo("forgotEmail", {
                  errores,
                  validar: () => validarCorreo(forgotEmail),
                  aplicar: (campo, err) =>
                    setErrores((p) => ({ ...p, [campo]: err ?? "" })),
                })}
                className={authGlassInputCls(errores.forgotEmail ? "err" : "neutro")}
                {...validacion.ariaCampo("forgotEmail", errores.forgotEmail)}
              />
              <MensajeError id={validacion.idError("forgotEmail")} err={errores.forgotEmail} />
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

        {/* ── Paso 2: Solo código OTP (componente compartido) ── */}
        {step === "code" && (
          <PasoCodigoVerificacion
            codigo={code}
            onCodigoChange={setCode}
            correoDestino={forgotEmail}
            onVerificar={verificarCodigo}
            onReenviar={reenviarCodigo}
            onVolverOtroCorreo={() => {
              setErrorCodigo(undefined);
              setStep("email");
            }}
            errorInicial={errorCodigo}
          />
        )}

        {/* ── Paso 3: Nueva contraseña (componente compartido) ── */}
        {step === "password" && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <h2
                className="text-xl font-bold text-foreground dark:text-white"
                style={{ fontFamily: SERIF }}
              >
                Nueva contraseña
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Elige una contraseña segura para tu cuenta.
              </p>
            </div>
            <PasoNuevaContrasena onGuardar={cambiarPassword} />
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
              className="text-xl font-bold text-foreground dark:text-white mb-2"
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
  setClientes,
  darkMode,
}: {
  navigate: (s: Screen) => void;
  usuarios: Usuario[];
  setUsuarios: React.Dispatch<React.SetStateAction<Usuario[]>>;
  empleados: Empleado[];
  clientes: Cliente[];
  setClientes: React.Dispatch<React.SetStateAction<Cliente[]>>;
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
        if (k === "password") {
          next.password = value ? validarContrasena(value) ?? "" : "";
          // Al escribir la contraseña se recalcula también el confirm: si el
          // usuario repitió la contraseña antes y luego cambió la primera,
          // el mensaje de "no coinciden" no debe quedarse pegado (ni ocultar
          // un desajuste que acaba de producirse).
          next.confirm = form.confirm
            ? value === form.confirm
              ? ""
              : "Las contraseñas no coinciden"
            : "";
        }
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

  // El botón "Crear cuenta" queda apagado hasta que todos los campos
  // obligatorios estén llenos, la contraseña cumpla las 5 reglas y el
  // confirmar coincida. Se recalcula en cada render a partir del estado,
  // así el check de la lista y el botón nunca se contradicen.
  const formValido =
    form.docType !== "" &&
    form.docNum.trim() !== "" &&
    form.name.trim() !== "" &&
    form.email.trim() !== "" &&
    form.phone.trim() !== "" &&
    form.password !== "" &&
    form.confirm !== "" &&
    validarContrasena(form.password) === null &&
    form.password === form.confirm;

  // ── Trampa de Tab, foco al primer inválido y aria ──
  // Lógica compartida en src/shared/hooks/useValidacionFormulario.ts. El
  // orden coincide con el del tabulador de la tarjeta.
  const validacion = useValidacionFormulario([
    "docType", "docNum", "name", "email", "phone", "password", "confirm",
  ]);

  /** Validador en vivo de cada campo, para que la trampa de Tab no dependa
   *  de que el error ya esté calculado en `errores` (campo vacío y sin
   *  tocar todavía). Mismas reglas que `register`. */
  const validadorDe = (k: string): (() => string | null) => {
    switch (k) {
      case "docType":
        return () => (form.docType ? null : "Selecciona el tipo de documento");
      case "docNum":
        return () => validarDocumento(form.docNum, form.docType);
      case "name":
        return () => validarNombre(form.name);
      case "email":
        return () => validarCorreo(form.email);
      case "phone":
        return () => validarTelefono(form.phone);
      case "password":
        return () => validarContrasena(form.password);
      case "confirm":
        return () =>
          form.password !== form.confirm ? "Las contraseñas no coinciden" : null;
    }
  };

  /** onKeyDown de cada campo: Tab con error no sale del campo (el error se
   *  escribe en `errores` para pintarlo) y Enter en las contraseñas envía,
   *  igual que antes. Shift+Tab y el clic con el mouse no se tocan. */
  const teclaEnRegistro =
    (campo: string) =>
    (e: React.KeyboardEvent<HTMLElement>) => {
      validacion.onKeyDownCampo(campo, {
        errores,
        validar: validadorDe(campo),
        aplicar: (c, err) => setErrores((p) => ({ ...p, [c]: err ?? "" })),
      })(e);
      if (e.key === "Enter" && (campo === "password" || campo === "confirm"))
        register();
    };

  const register = async () => {
    const errs: Record<string, string> = {};

    if (!form.name.trim()) errs.name = "El nombre completo es obligatorio";
    else errs.name = validarNombre(form.name) ?? undefined;
    if (!form.email) errs.email = "El correo electrónico es obligatorio";
    else errs.email = validarCorreo(form.email) ?? undefined;
    if (!form.phone) errs.phone = "El número de teléfono es obligatorio";
    else errs.phone = validarTelefono(form.phone) ?? undefined;
    if (!form.docType) errs.docType = "Selecciona el tipo de documento";

    const docTrim = form.docNum.trim();
    if (!docTrim) errs.docNum = "El número de documento es obligatorio";
    else if (form.docType === "CC" && !/^\d{6,10}$/.test(docTrim))
      errs.docNum = "La CC debe tener entre 6 y 10 dígitos";
    else errs.docNum = validarDocumento(docTrim, form.docType) ?? undefined;

    if (!errs.docNum) {
      const clave = `${form.docType}||${docTrim}`.toLowerCase();
      // §1.3: un documento que solo existe en un cliente (o usuario) SIN correo
      // — el que nació en una venta — no bloquea el registro: se completa esa
      // misma persona con sus datos al final. Con correo ya puesto sí cuenta
      // como documento registrado.
      const docDuplicado =
        usuarios.some(u => `${u.tipoDocumento}||${u.numeroDocumento}`.toLowerCase() === clave && u.correo.trim() !== "") ||
        empleados.some(e => `${e.tipoDocumento}||${e.numeroDocumento}`.toLowerCase() === clave && e.correo.trim() !== "") ||
        clientes.some(c => `${c.tipoDocumento}||${c.numeroDocumento}`.toLowerCase() === clave && c.correo.trim() !== "");
      if (docDuplicado) errs.docNum = "Este documento ya está registrado";
    }

    if (!errs.email) {
      const em = form.email.trim().toLowerCase();
      // Un correo vacío nunca coincide con otro correo vacío: si no, todos los
      // registros sin correo serían "la misma persona".
      const correoDuplicado =
        usuarios.some(u => u.correo.trim() !== "" && u.correo.trim().toLowerCase() === em) ||
        empleados.some(e => e.correo.trim() !== "" && e.correo.trim().toLowerCase() === em) ||
        clientes.some(c => c.correo.trim() !== "" && c.correo.trim().toLowerCase() === em);
      if (correoDuplicado) errs.email = "Este correo ya está registrado";
    }

    // Mismas reglas que el resto de formularios (fuente única en campo.tsx).
    const passwordError = validarContrasena(form.password);
    if (passwordError) errs.password = passwordError;
    if (form.password !== form.confirm)
      errs.confirm = "Las contraseñas no coinciden";

    setErrores(errs);
    if (Object.values(errs).some(Boolean)) {
      // Con errores no se envía: se muestran todos y el foco va al primer
      // campo inválido (los mensajes ya se pintan desde `errores`).
      validacion.enfocarPrimero(errs);
      return;
    }

    setLoading(true);
    try {
      await registrarCliente({
        tipoDocumento: form.docType,
        numeroDocumento: form.docNum.trim(),
        nombre: form.name.trim(),
        correo: form.email.trim().toLowerCase(),
        telefono: form.phone.trim(),
        contrasena: form.password,
      });

      const correoNuevo = form.email.trim().toLowerCase();
      // §1.3: si el documento pertenece a un cliente creado desde una venta
      // (sin correo), el registro lo COMPLETA en vez de duplicarlo: se llena
      // su correo — obligatorio, o la sincronización volvería a dejar el
      // usuario sin correo — y el usuario que creó esa sincronización se
      // actualiza (correo, teléfono y contraseña) en lugar de crearse otro.
      const claveDocRegistro = `${form.docType}||${docTrim}`.toLowerCase();
      const mismaDoc = (x: { tipoDocumento: string; numeroDocumento: string }) =>
        `${x.tipoDocumento}||${x.numeroDocumento}`.toLowerCase() === claveDocRegistro;
      const clienteSinCorreo = clientes.find(c => mismaDoc(c) && c.correo.trim() === "");
      if (clienteSinCorreo) {
        setClientes(prev =>
          prev.map(c => (c.id === clienteSinCorreo.id ? { ...c, correo: correoNuevo } : c)),
        );
      }
      const usuarioExistente = usuarios.find(
        u => u.correo.trim().toLowerCase() === correoNuevo && u.correo.trim() !== "",
      );
      if (!usuarioExistente) {
        const usuarioPorDoc = usuarios.find(u => mismaDoc(u) && u.correo.trim() === "");
        if (usuarioPorDoc) {
          // Misma persona ya presente en Gestión de Usuarios (vino de la
          // sincronización con el cliente): se actualiza, no se duplica.
          setUsuarios(p =>
            p.map(u =>
              u.id === usuarioPorDoc.id
                ? {
                    ...u,
                    correo: correoNuevo,
                    telefono: form.phone.trim(),
                    contrasena: form.password,
                  }
                : u,
            ),
          );
        } else {
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
            correo: correoNuevo,
            telefono: form.phone.trim(),
            tipoDocumento: form.docType,
            numeroDocumento: form.docNum.trim(),
            rolId: "ROL-002",
            rolIds: ["ROL-002"],
            activo: true,
          };
          setUsuarios((p) => [...p, nuevoUsuario]);
        }
      }
      toast.success("¡Cuenta creada exitosamente! Ya puedes ingresar.");
      navigate("login");
    } catch (e) {
      const mensaje =
        e instanceof Error ? e.message : "No se pudo conectar con el servidor.";
      // Llaves del mapa verificadas contra `errs` de las validaciones locales
      // y contra el JSX de RegisterScreen: docType y docNum se leen en sus
      // inputs y name/email/phone/password en el map de campos; son las
      // mismas llaves, así que el texto del backend cae en su <MensajeError>.
      const mapa: Record<string, { campo: string; texto: string }> = {
        "Este documento ya está registrado.": {
          campo: "docNum",
          texto: "Este documento ya está registrado",
        },
        "El número de documento no es válido.": {
          campo: "docNum",
          texto: "El número de documento no es válido",
        },
        "Tipo de documento no válido.": {
          campo: "docType",
          texto: "Tipo de documento no válido",
        },
        "El nombre no es válido.": {
          campo: "name",
          texto: "El nombre no es válido",
        },
        "Este correo ya está registrado.": {
          campo: "email",
          texto: "Este correo ya está registrado",
        },
        "Ingresa un correo válido y sin espacios.": {
          campo: "email",
          texto: "Ingresa un correo válido y sin espacios",
        },
        "El teléfono debe tener solo números, entre 7 y 15 dígitos.": {
          campo: "phone",
          texto: "El teléfono debe tener solo números, entre 7 y 15 dígitos",
        },
        "La contraseña no cumple los requisitos.": {
          campo: "password",
          texto: "La contraseña no cumple los requisitos",
        },
      };
      const hit = mapa[mensaje];
      if (hit) {
        setErrores((prev) => ({ ...prev, [hit.campo]: hit.texto }));
        // El selector de tipo doc borra su error inline al cambiar de tipo,
        // así que su mensaje del servidor se refuerza además en toast.
        if (hit.campo === "docType") toast.error(mensaje);
      } else {
        // 429, sin conexión, 500, 503 u otros: el texto ya viene del
        // interceptor y no se navega.
        toast.error(mensaje);
      }
    } finally {
      setLoading(false);
    }
   };

   return (
    <AuthLayout contentClassName="items-start justify-center sm:justify-end px-4 py-3 lg:px-8 lg:pr-16 xl:pr-12" darkMode={darkMode}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative my-auto ${AUTH_GLASS_CARD} w-full max-w-[540px] px-5 py-6 sm:px-7 sm:py-4`}
      >
        <button
          onClick={() => navigate("landing")}
          title="Volver al inicio"
          className={`absolute top-5 left-5 ${AUTH_GLASS_BUTTON_SECONDARY}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center mb-3">
          {/* El logo va en `h-10` (40px) con `mb-1`: el registro es la tarjeta
              mas alta de las dos pantallas de auth, y el area visible real del
              equipo (Windows 150% + Chrome con pestañas) es de ~1280x585, muy
              inferior al viewport nominal. El login, mas corto, conserva su
              `h-16`. */}
          <img src={darkMode ? logoBlanco : logoClaro} alt="S.I.V.PRO Logo" className="h-10 w-auto object-contain mx-auto mb-1" />

          <h1
            className="text-xl font-bold text-foreground dark:text-white"
            style={{ fontFamily: SERIF }}
          >
            Crear cuenta
          </h1>
          {/* Subtitulo "Completa tus datos para registrarte" eliminado: con el
              area visible real de ~1280x585 la tarjeta no cabia sin scroll y
              este era el unico bloque que podia quitarse sin tocar inputs,
              textos ni logo. */}
        </div>

        {/* Grid y no `space-y`: hace falta para que los campos puedan COMPARTIR
            fila. Fila 1 = Tipo doc + Numero (grid `3fr_2fr` dentro de una celda
            de ancho completo: Tipo doc mas ancho para que el label del select
            no se corte, Numero mas corto), Fila 2 = Nombre completo (ancho
            completo), Fila 3 = Correo + Telefono, Fila 4 = Contrasena +
            Confirmar, Fila 5 = checklist de requisitos. El flag `full` de cada
            descriptor marca los campos que se llevan las 2 columnas (hoy solo
            "Nombre completo"). En movil (<640px) el grid cae a 1 columna y
            todo se apila.

            `gap-x-3` (12px) separa las dos columnas y `gap-y-2` (8px) las
            filas; `mb-1` (4px) dentro de cada celda separa label e input. */}
        <div className="grid gap-x-3 gap-y-2 sm:grid-cols-2">
          <div className="sm:col-span-2 grid gap-3 sm:grid-cols-[3fr_2fr]">
            <div className="min-w-0">
              <label className="block text-sm font-semibold mb-1 text-foreground dark:text-white">
                Tipo doc.
              </label>
              <select
                value={form.docType}
                ref={validacion.refCampo("docType")}
                onChange={(e) => {
                  setForm((p) => ({ ...p, docType: e.target.value }));
                  if (form.docNum) {
                     setErrores((p) => ({ ...p, docNum: form.docNum ? validarDocumento(form.docNum, e.target.value) ?? "" : "" }));
                  }
                  if (errores.docType) setErrores((p) => ({ ...p, docType: "" }));
                }}
                onKeyDown={teclaEnRegistro("docType")}
                className={`${authInputCls(errores.docType, "cursor-pointer h-10 pl-3 pr-8")} [&>option]:bg-white [&>option]:text-neutral-900 dark:[&>option]:bg-neutral-800 dark:[&>option]:text-white`}
                {...validacion.ariaCampo("docType", errores.docType)}
              >
                {OPCIONES_TIPO_DOCUMENTO.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <MensajeError id={validacion.idError("docType")} err={errores.docType} />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-semibold mb-1 text-foreground dark:text-white">
                Número de documento
              </label>
              <input
                value={form.docNum}
                 onChange={(e) => setVal("docNum")(filtrarDocumento(e.target.value, form.docType))}
                type="text"
                 inputMode="numeric"
                 placeholder="Ej: 12345678"
                ref={validacion.refCampo("docNum")}
                onKeyDown={teclaEnRegistro("docNum")}
                className={authInputCls(errores.docNum, "h-10")}
                {...validacion.ariaCampo("docNum", errores.docNum)}
              />
              <MensajeError id={validacion.idError("docNum")} err={errores.docNum} />
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
              placeholder: "gloria@gmail.com",
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
            },
            {
              label: "Confirmar contraseña",
              key: "confirm" as const,
              placeholder: "Repite tu contraseña",
              type: "password",
            },
          ].map(({ label, key, placeholder, type, numeric, full }) => (
            <div key={key} className={full ? "sm:col-span-2 min-w-0" : "min-w-0"}>
              <label className="block text-sm font-semibold mb-1 text-foreground dark:text-white">
                {label}
              </label>
              {type === "password" ? (
                <PasswordField
                  value={form[key]}
                  onChange={setVal(key)}
                  onKeyDown={teclaEnRegistro(key)}
                  placeholder={placeholder}
                  autoComplete="new-password"
                  cls={authInputCls(errores[key], "h-10")}
                  pad="pr-9"
                  inputRef={validacion.refCampo(key)}
                  ariaInvalid={Boolean(errores[key])}
                  ariaDescribedBy={errores[key] ? validacion.idError(key) : undefined}
                />
              ) : (
                <input
                  value={form[key]}
                  onChange={numeric ? setDigitos(key) : set(key)}
                  type={type}
                  inputMode={numeric ? "numeric" : undefined}
                  placeholder={placeholder}
                  ref={validacion.refCampo(key)}
                  onKeyDown={teclaEnRegistro(key)}
                  className={authInputCls(errores[key], "h-10")}
                  {...validacion.ariaCampo(key, errores[key])}
                />
              )}
              <MensajeError id={validacion.idError(key)} err={errores[key]} />
            </div>
          ))}

          {/* Lista de requisitos en tiempo real, como FILA PROPIA de ancho
              completo justo debajo de la pareja Contraseña / Confirmar.

              `grid` de 3 columnas `max-content` (fila 1 = mayuscula, largo,
              espacios; fila 2 = minuscula, numero) alineadas en columna:
              mayuscula/minuscula en la col 1, largo/numero en la col 2.
              `justify-start` las alinea a la izquierda. En movil (<640px)
              cae a `grid-cols-1`. Los `order-*` por `nth-child` reordenan
              solo A LA VISTA el array de REGLAS_CONTRASENA (que va numero
              antes que minuscula, y espacios al final) sin tocar campo.tsx,
              donde ese orden sigue sirviendo a las demas pantallas que
              listan los requisitos en vertical. */}
          <div className="sm:col-span-2 min-w-0">
            <RequisitosContrasena
              valor={form.password}
              className="mt-1 grid grid-cols-1 sm:grid-cols-[max-content_max-content_max-content] justify-start gap-x-3 gap-y-1 [&>li:nth-child(2)]:order-1 [&>li:nth-child(1)]:order-2 [&>li:nth-child(5)]:order-3 [&>li:nth-child(4)]:order-4 [&>li:nth-child(3)]:order-5 [&>li.text-muted-foreground]:text-foreground/75 [&>li.text-emerald-600]:text-emerald-900 dark:[&>li.text-emerald-600]:text-emerald-400"
            />
          </div>
        </div>

        <PrimaryBtn
          onClick={register}
          size="md"
          className="w-full mt-3 h-10 min-h-0!"
           disabled={loading || !formValido}
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </PrimaryBtn>

        <p className="text-center text-sm text-foreground/75 mt-2 dark:text-white/75">
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
      idCategoria: "CAT-001",
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
    <div className="px-4 sm:px-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            Gestión de productos
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {products.length} producto{products.length === 1 ? "" : "s"} en total
          </p>
        </div>
        <PrimaryBtn onClick={() => setCreating(true)} size="md">
          <Plus className="w-4 h-4" /> Nuevo producto
        </PrimaryBtn>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar producto..."
          wrapperClassName="flex-1 max-w-sm"
        />
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
                      {/* Pill de estado (diseño de Proveedores). Misma regla
                          que el select nativo: elegir lo que ya se muestra no
                          hace nada y el resto llama a changeStatus. */}
                      <EstadoSelect
                        value={p.status as string}
                        onChange={(nuevo) => {
                          if (PROD_STATUS_LABEL[nuevo] === PROD_STATUS_LABEL[p.status]) return;
                          changeStatus(p.id, nuevo as Product["status"]);
                        }}
                        options={[
                          {
                            value: p.status,
                            label: PROD_STATUS_LABEL[p.status],
                            color: PROD_STATUS_COLOR[p.status],
                          },
                          ...PROD_STATUS_OPCIONES.filter(
                            (s) =>
                              PROD_STATUS_LABEL[s] !== PROD_STATUS_LABEL[p.status],
                          ).map((s) => ({
                            value: s as string,
                            label: PROD_STATUS_LABEL[s],
                            color: PROD_STATUS_COLOR[s],
                          })),
                        ]}
                      />
                    </td>
                    <td
                      className="px-4 py-3.5 text-sm text-muted-foreground"
                      style={{ fontFamily: MONO }}
                    >
                      {p.sales.toLocaleString("es-CO")}
                    </td>
                    <td className="px-4 py-3.5">
                      <ActionIcons
                        onEdit={() => setEditP({ ...p })}
                        onDelete={() => setDeleteId(p.id)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Pagination (unificada, fuera de la card) */}
      {filtered.length > 0 && (
        <Paginador pagina={page} totalPaginas={totalPages} onCambio={setPage} />
      )}

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
                    // 0 = vacío: no arranca mostrando "0" ni vuelve a 0 si el
                    // usuario lo borra (punto B1); al guardar sigue siendo 0.
                    value={editP.price === 0 ? "" : editP.price}
                    placeholder="0"
                    onChange={(e) =>
                      setEditP((p) =>
                        p
                          ? {
                              ...p,
                              price: numeroDeInput(limpiarNumeroInput(e.target.value)),
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
                    // Texto vacío hasta que el usuario escriba; los ceros a la
                    // izquierda se limpian al teclear (punto B1).
                    value={newP.price}
                    onChange={(e) =>
                      setNewP((p) => ({
                        ...p,
                        price: limpiarNumeroInput(e.target.value),
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
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

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

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(
    Math.max(0, (page - 1) * PER_PAGE),
    page * PER_PAGE,
  );
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), Math.max(1, totalPages)));
  }, [totalPages]);

  const updateStatus = (id: string, s: Order["status"]) => {
    setOrders((p) =>
      p.map((o) => (o.id === id ? { ...o, status: s } : o)),
    );
    toast.success("Estado de la venta actualizado");
  };

  return (
    <div className="px-4 sm:px-6 py-6">
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
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar por cliente o código..."
          wrapperClassName="flex-1 max-w-sm"
        />
        <select
          value={statusF}
          onChange={(e) => {
            setStatusF(e.target.value);
            setPage(1);
          }}
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
          paged.map((order) => (
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

      {/* Paginación (unificada, fuera de la card) */}
      {filtered.length > 0 && (
        <Paginador
          pagina={page}
          totalPaginas={totalPages}
          onCambio={setPage}
        />
      )}
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
// Bandera de la migración ÚNICA del permiso Dashboard (ver leerRolesPersistidos).
const MIGRACION_DASHBOARD_PERMISO_KEY = "sivpro.migracion.dashboardPermiso.v1";
const marcarMigracionDashboard = () => {
  try { localStorage.setItem(MIGRACION_DASHBOARD_PERMISO_KEY, "1"); } catch { /* localStorage bloqueado */ }
};

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

// Migración de roles ya guardados: al añadir el privilegio "Descargar Excel",
// el Administrador que ya estuviera en localStorage se quedó con los 4 CRUD y
// sin la acción nueva, y perdería el botón que sí ve uno recién creado (que sale
// de `fullAccesos()`, ya con la acción). Se le devuelve.
//
// Va anclada al rol SEMILLA `ROL-001`, igual que `isNamedAdmin`, y NO se aplica
// a los demás roles a propósito. Los que alguien configuró a mano se guardaron
// sin esta acción porque aún no existía, así que su configuración se respeta
// tal cual: si el privilegio se añadiera a cualquier rol, recargar la página
// repondría en secreto una acción que ese usuario había quitado, y el permiso
// "Descargar Excel" no serviría para nada.
const RESTAURAR_EXCEL_AL_ADMIN = "ROL-001";

const restaurarDescargaExcel = (rol: Rol): Rol => {
  if (rol.id !== RESTAURAR_EXCEL_AL_ADMIN) return rol;
  const accesos: AccesosMap = {};
  let cambio = false;
  (Object.keys(rol.accesos) as string[]).forEach(k => {
    const actuales = rol.accesos[k] ?? [];
    if (SUBS_CON_EXCEL.includes(k) && !actuales.includes(ACCION_EXCEL)) {
      accesos[k] = [...actuales, ACCION_EXCEL];
      cambio = true;
    } else {
      accesos[k] = actuales;
    }
  });
  return cambio ? { ...rol, accesos } : rol;
};

const leerRolesPersistidos = (): Rol[] => {
  try {
    const raw = localStorage.getItem(ROLES_STORAGE_KEY);
    if (!raw) {
      // Sin datos guardados: la semilla ya trae el permiso Dashboard en el rol
      // Administrador (fullAccesos) y ningún otro rol lo tiene. Se marca la
      // migración como hecha para que no toque permisos dados después por el
      // super admin.
      marcarMigracionDashboard();
      return INITIAL_ROLES;
    }
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(esRolValido)) {
      const lista = (parsed as Rol[]).map(rol => {
        const renombrado = rol.id === "ROL-003" && rol.nombre === "Usuario"
          ? { ...rol, nombre: "Empleado", descripcion: "Acceso operativo al sistema." }
          : rol;
        return restaurarDescargaExcel(renombrado);
      });
      // §2: el rol guardado "Mesera" se renombra a "Mesero" ANTES de completar
      // la semilla, o `completarRolesSemilla` agregaría un segundo rol. Se
      // compara el nombre normalizado exacto (sin tildes, minúsculas, trim);
      // NO con `claveGeneroRol`, porque "mesera" y "mesero" dan la misma clave
      // y el rol se encontraría a sí mismo. Si ya existe un "Mesero", el
      // "Mesera" se deja como está y la semilla no duplica por clave de género.
      const normalizar = (v: string) =>
        v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const yaHayMesero = lista.some(r => normalizar(r.nombre) === "mesero");
      const listaRenombrada = yaHayMesero
        ? lista
        : lista.map(r => (normalizar(r.nombre) === "mesera" ? { ...r, nombre: "Mesero" } : r));
      // § Dashboard: migración ÚNICA (bandera "sivpro.migracion.dashboardPermiso.v1").
      // En datos viejos la clave "Dashboard::Dashboard" podía estar en cualquier
      // rol (fue una celda más del editor). La primera vez se la quita a todo
      // rol que no sea Administrador y se la agrega a Administrador si faltaba.
      // Después de esa primera ejecución NUNCA se vuelve a tocar el permiso:
      // los cambios que haga el super admin en Crear/Editar rol se conservan
      // al recargar la página.
      let migrados = listaRenombrada;
      try {
        if (!localStorage.getItem(MIGRACION_DASHBOARD_PERMISO_KEY)) {
          migrados = listaRenombrada.map(rol => {
            if (normalizar(rol.nombre) === "administrador") {
              if (rol.accesos[DASHBOARD_PERM_KEY]?.includes("Ver")) return rol;
              return { ...rol, accesos: { ...rol.accesos, [DASHBOARD_PERM_KEY]: ["Ver"] } };
            }
            if (!(DASHBOARD_PERM_KEY in rol.accesos)) return rol;
            const accesosSinDash: AccesosMap = { ...rol.accesos };
            delete accesosSinDash[DASHBOARD_PERM_KEY];
            return { ...rol, accesos: accesosSinDash };
          });
          // Se persisten los roles migrados ANTES de marcar la bandera: si la
          // escritura falla, la bandera no queda puesta y se reintenta en la
          // próxima carga.
          localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(migrados));
          marcarMigracionDashboard();
        }
      } catch {
        // localStorage bloqueado: la migración se aplica solo en memoria.
      }
      return completarRolesSemilla(migrados);
    }
  } catch {
    // Datos corruptos o localStorage bloqueado: se cae a la semilla.
    marcarMigracionDashboard();
  }
  return INITIAL_ROLES;
};

// ── Lectura de usuarios (la clave se LEE, no se Escribe) ───────────────
// `sivpro.usuarios.v1` se sigue leyendo por si queda algo guardado de una
// build anterior (y por el backfill de `contrasena` de abajo), pero ya NO se
// escribe: en este prototipo no hay backend y las credenciales no deben quedar
// en el navegador. Alta, edición y cambio de contraseña viven solo en el
// `useState` de App y por eso se pierden al recargar (F5).
//
// ATENCIÓN con mezclar: si algún día se vuelve a persistir el array, se
// guardarían también las ediciones de "Mi Perfil" y los interruptores de
// Activo/Inactivo de la pantalla de Usuarios… y las contraseñas.
// Para vaciar la clave a mano: localStorage.removeItem(USUARIOS_STORAGE_KEY).
const USUARIOS_STORAGE_KEY = "sivpro.usuarios.v1";
const CUENTAS_PRUEBA_IDS = new Set(["USR-001", "USR-002", "USR-010"]);

const DOCS_SEMILLA_PURGAR: ReadonlySet<string> = new Set([
  "cc||11223344",
  "cc||22334455",
  "cc||33445566",
  "cc||44556677",
  "cc||55667788",
  "cc||66778899",
  "cc||77889900",
  "cc||99001122",
  "cc||10111213",
]);

const esUsuarioValido = (u: unknown): u is Usuario => {
  if (!u || typeof u !== "object") return false;
  const usr = u as Usuario;
  // Se comprueban también `iniciales` y `avatarColor` porque la tabla las
  // pinta tal cual: un registro corrupto que las traiga ausentes llegaría hasta
  // el avatar en vez de descartarse aquí.
  // `rolIds` (multi-rol) se acepta ausente en registros viejos: los que solo
  // traen `rolId` se migran en la normalización de abajo.
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

// Lista de cargos/roles de un registro guardado. Los datos viejos solo traían
// `rolId` (un solo rol); los nuevos traen `rolIds`. El espejo `rolId` se
// conserva siempre apuntando al PRIMER rol de la lista.
const rolIdsDe = (rolIds: unknown, rolId: unknown): string[] => {
  if (Array.isArray(rolIds)) {
    const limpio = rolIds.filter((x): x is string => typeof x === "string" && x.trim() !== "");
    if (limpio.length > 0) return limpio;
  }
  return typeof rolId === "string" && rolId.trim() !== "" ? [rolId] : [];
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
        .filter((usuario) => !DOCS_SEMILLA_PURGAR.has(`${(usuario.tipoDocumento ?? "").trim().toLowerCase()}||${(usuario.numeroDocumento ?? "").trim()}`))
        .map((usuario) => ({ ...usuario, correo: usuario.correo.trim().toLowerCase() }));
      return [...cuentasPrueba, ...otrosUsuarios].map(u => {
        const ids = rolIdsDe(u.rolIds, u.rolId);
        return {
          ...u,
          // Multi-rol + espejo: `rolIds` manda, `rolId` refleja el primero.
          rolIds: ids,
          rolId: ids[0] ?? "",
          // Backfill para registros viejos sin contraseña propia.
          contrasena: u.contrasena ?? "123456",
        };
      });
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
//
// EXCEPCIÓN IMPORTANTE: `contrasena` NO se serializa. Las credenciales no se
// guardan en el navegador (mismo criterio que el bloque de usuarios), así que
// el efecto de escritura quita ese campo y `normalizarEmpleado` de abajo lo
// repone con "123456" al leer. Las contraseñas que el usuario cambie durante
// la sesión viven solo en memoria.
const EMPLEADOS_STORAGE_KEY = "sivpro.empleados.v1";

const esEmpleadoValido = (e: unknown): e is Empleado => {
  if (!e || typeof e !== "object") return false;
  const emp = e as unknown as {
    id?: unknown; nombre?: unknown; correo?: unknown; telefono?: unknown;
    tipoDocumento?: unknown; numeroDocumento?: unknown; activo?: unknown;
    fechaInicio?: unknown; fechaFinal?: unknown;
    rolIds?: unknown; rolId?: unknown; cargo?: unknown;
  };
  // `rolIds` es el campo nuevo; los registros viejos traían `rolId` + `cargo`
  // (texto libre), así que se acepta cualquiera de las dos formas para que una
  // base guardada antes de esta feature no se descarte entera (y con ella el
  // historial de contrataciones).
  const tieneCargos =
    (Array.isArray(emp.rolIds) && emp.rolIds.length > 0) ||
    typeof emp.rolId === "string" ||
    typeof emp.cargo === "string";
  return (
    typeof emp.id === "string" &&
    typeof emp.nombre === "string" &&
    typeof emp.correo === "string" &&
    typeof emp.telefono === "string" &&
    typeof emp.tipoDocumento === "string" &&
    typeof emp.numeroDocumento === "string" &&
    typeof emp.activo === "boolean" &&
    typeof emp.fechaInicio === "string" &&
    typeof emp.fechaFinal === "string" &&
    tieneCargos
  );
};

// CARGO = ROL. Migra un registro viejo (`cargo` texto + `rolId`) al modelo de
// multi-rol: si el texto del cargo coincide con el NOMBRE de un rol guardado,
// ese rol es su cargo; si no, se conserva el `rolId` que traía (p. ej. la
// Administradora, cuyo cargo legado "Administración" no es un rol).
const migrarCargos = (rolIds: unknown, rolId: unknown, cargo: unknown, roles: Rol[]): string[] => {
  if (Array.isArray(rolIds)) {
    const limpio = rolIds.filter((x): x is string => typeof x === "string" && x.trim() !== "");
    if (limpio.length > 0) return limpio;
  }
  if (typeof cargo === "string" && cargo.trim() !== "") {
    const porNombre = roles.find(r => r.nombre.trim().toLowerCase() === cargo.trim().toLowerCase());
    if (porNombre) return [porNombre.id];
    // El cargo legado "Administración" no es un rol: se cambia por el rol
    // "Auxiliar administrativo". EXCEPCIÓN: si el empleado traía el rol
    // Administrador (la cuenta de Gloria), se conserva tal cual — "Administración"
    // era su etiqueta antigua, nunca el cargo de apoyo.
    const esAdmin = typeof rolId === "string" &&
      roles.find(r => r.id === rolId)?.nombre.trim().toLowerCase() === "administrador";
    if (cargo.trim().toLowerCase() === "administración" && !esAdmin) {
      const auxiliar = roles.find(r => r.nombre.trim().toLowerCase() === "auxiliar administrativo");
      if (auxiliar) return [auxiliar.id];
    }
    // Seeds heredadas con cargos eliminados: se reasignan a Cajero/Mesero (que
    // sustituyen esos cargos en la nueva semilla).
    const remap = new Map<string, string>([
      ["domiciliario", "cajero"], ["auxiliar administrativo", "cajero"],
      ["cocinero", "mesero"], ["auxiliar de cocina", "mesero"], ["operador de producción", "mesero"],
    ]);
    const destino = remap.get(cargo.trim().toLowerCase());
    if (destino) {
      const r = roles.find(x => x.nombre.trim().toLowerCase() === destino);
      if (r) return [r.id];
    }
  }
  return typeof rolId === "string" && rolId.trim() !== "" ? [rolId] : [];
};

// `contrataciones` se normaliza en vez de exigirla: si un array quedó guardado
// por una build anterior a esta feature, descartar el registro entero perdería
// también sus datos de contacto. Un histórico ausente se trata como vacío, y
// cada entrada vieja (`cargo` + `rolId`) se migra a `rolIds` con la misma regla
// de arriba.
const normalizarEmpleado = (e: Empleado, roles: Rol[]): Empleado => {
  const crudo = e as unknown as {
    cargo?: unknown; rolId?: unknown; rolIds?: unknown; contrataciones?: unknown;
  };
  // Se quitan los campos viejos (`cargo` texto y su `rolId` espejo) para que no
  // sobrevivan en la memoria ni se re-serialicen al guardar.
  const { cargo, rolId, rolIds: _legacy, ...resto } = crudo;
  // Todo empleado tiene SIEMPRE los roles base "Empleado" y "Cliente". La cuenta
  // de super administrador (Gloria) queda tal cual: no recibe roles de empleado.
  const esSuperAdmin = e.id === "EMP-001" || e.correo.trim().toLowerCase() === "gloria@lasirena.com";
  const peso = (lista: string[]) => {
    const vivos = lista.filter(id => roles.some(r => r.id === id));
    // Ids perdidos por la purge de seed (ROL-006…010) se remap a Cajero/Mesero.
    const mapId = new Map<string, string>([
      ["ROL-006", "Cajero"], ["ROL-010", "Cajero"],
      ["ROL-007", "Mesero"], ["ROL-008", "Mesero"], ["ROL-009", "Mesero"],
    ]);
    lista.forEach(id => {
      const n = mapId.get(id);
      if (n) {
        const r = roles.find(x => x.nombre.trim().toLowerCase() === n.toLowerCase());
        if (r) vivos.push(r.id);
      }
    });
    return esSuperAdmin ? [...new Set(vivos)] : [...new Set([
      ...vivos,
      roles.find(r => r.nombre.trim().toLowerCase() === "empleado")?.id ?? "",
      roles.find(r => r.nombre.trim().toLowerCase() === "cliente")?.id ?? "",
    ].filter(x => x))];
  };
  return {
    ...(resto as unknown as Empleado),
    rolIds: peso(migrarCargos(crudo.rolIds, rolId, cargo, roles)),
    contrasena: typeof e.contrasena === "string" ? e.contrasena : "123456",
    contrataciones: (Array.isArray(crudo.contrataciones) ? crudo.contrataciones : []).map(c => {
      const vieja = c as unknown as { id?: unknown; fechaInicio?: unknown; fechaFinal?: unknown; cargo?: unknown; rolId?: unknown; rolIds?: unknown };
      return {
        id: typeof vieja.id === "string" ? vieja.id : `${crudo as unknown as Empleado["id"]}-C01`,
        fechaInicio: typeof vieja.fechaInicio === "string" ? vieja.fechaInicio : "",
        fechaFinal: typeof vieja.fechaFinal === "string" ? vieja.fechaFinal : "",
        rolIds: peso(migrarCargos(vieja.rolIds, vieja.rolId, vieja.cargo, roles)),
      };
    }),
  };
};

const leerEmpleadosPersistidos = (): Empleado[] => {
  // Los roles se leen aparte porque la migración de `cargo` (texto) a `rolIds`
  // necesita los NOMBRES guardados para empatarlos.
  const roles = leerRolesPersistidos();
  try {
    const raw = localStorage.getItem(EMPLEADOS_STORAGE_KEY);
    if (!raw) return INITIAL_EMPLEADOS;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(esEmpleadoValido)) {
      return (parsed as Empleado[])
        .filter(e => !DOCS_SEMILLA_PURGAR.has(`${(e.tipoDocumento ?? "").trim().toLowerCase()}||${(e.numeroDocumento ?? "").trim()}`))
        .map(e => normalizarEmpleado(e, roles));
    }
  } catch {
    // Datos corruptos o localStorage bloqueado: se cae a la semilla.
  }
  return INITIAL_EMPLEADOS;
};

// ── Persistencia de categorías (TEMPORAL) ──────────────────────────────
// Mismo criterio que la de roles, usuarios y empleados: las categorías vivían
// solo en el `useState` de la pantalla de Categoría Producto, así que el alta se
// perdía al salir del módulo y el landing no tenía forma de leerlas. Ahora la
// lista vive en App y se guarda en localStorage, que es la única fuente que el
// landing público (mismo origen, sin sesión) puede leer sin backend.
//
// AVISO DE ALCANCE: es una persistencia por navegador, no compartida entre
// equipos. Al guardar el array entero también sobreviven al F5 las ediciones y
// los borrados. Para volver a la semilla:
// localStorage.removeItem(CATEGORIAS_STORAGE_KEY).
const CATEGORIAS_STORAGE_KEY = "sivpro.categorias.v1";

const esCategoriaValida = (c: unknown): c is CategoriaProducto => {
  if (!c || typeof c !== "object") return false;
  const cat = c as CategoriaProducto;
  // `icono` y `estado` se aceptan ausentes: las tres categorías originales no
  // lo llevan (el suyo está escrito en el landing) y el dato guardado antes de
  // que existiera el estado tampoco. Con estado inválido NO se acepta la lista:
  // volvería a la semilla y se perderían todas las categorías guardadas.
  return (
    typeof cat.id === "string" &&
    typeof cat.nombre === "string" &&
    (cat.icono === undefined || typeof cat.icono === "string") &&
    (cat.estado === undefined || cat.estado === "Activo" || cat.estado === "Inactivo")
  );
};

const leerCategoriasPersistidas = (): CategoriaProducto[] => {
  try {
    const raw = localStorage.getItem(CATEGORIAS_STORAGE_KEY);
    if (!raw) return INITIAL_CATEGORIAS;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(esCategoriaValida)) {
      return parsed as CategoriaProducto[];
    }
  } catch {
    // Datos corruptos o localStorage bloqueado: se cae a la semilla.
  }
  return INITIAL_CATEGORIAS;
};

// ── Persistencia de producción (cocina) ─────────────────────────────────
// Las órdenes de producción, los insumos, las ventas y las fichas técnicas
// vivían solo en el `useState` del módulo: al salir y volver se perdía todo, y
// en el caso de las órdenes tampoco había forma de que el pedido se creara
// solo. Ahora cada lista se guarda entera en localStorage.
//
// Igual que categorías: es por navegador, no compartida entre equipos, y basta
// con quitar la clave para volver a la semilla.
//   sivpro.ordenesProduccion.v1 → órdenes de producción
//   sivpro.insumos.v1          → catálogo de insumos (con Producto Insumo)
//   sivpro.ventas.v1           → ventas, con su detalle y estado
//   sivpro.fichasProductos.v1  → fichas técnicas por producto
const ORDENES_PRODUCCION_STORAGE_KEY = "sivpro.ordenesProduccion.v1";
const INSUMOS_STORAGE_KEY = "sivpro.insumos.v1";
const VENTAS_STORAGE_KEY = "sivpro.ventas.v1";
const FICHAS_STORAGE_KEY = "sivpro.fichasProductos.v1";
const NO_CONFORMIDADES_STORAGE_KEY = "sivpro.noConformidades.v1";

/** Lectura genérica: si no hay nada guardado, o hay algo corrupto o con otra
    forma, se usa la semilla en vez de romper el arranque. */
const leerListaPersistida = <T,>(clave: string, semilla: T[], esValida: (x: unknown) => boolean): T[] => {
  try {
    const raw = localStorage.getItem(clave);
    if (!raw) return semilla;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(esValida)) return parsed as T[];
  } catch {
    // Datos corruptos o localStorage bloqueado: se cae a la semilla.
  }
  return semilla;
};

const esObjeto = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);

/** Las órdenes guardadas pueden ser de una versión anterior del rediseño: solo
    se acepta lo que tiene la forma nueva, así que una lista vieja se descarta
    entera y vuelve la semilla en vez de mezclar modelos. */
const esOrdenProduccionValida = (x: unknown) =>
  esObjeto(x) &&
  typeof x.id === "string" &&
  typeof x.tipo === "string" &&
  typeof x.estadoOrden === "string" &&
  Array.isArray(x.lineas) &&
  Array.isArray(x.insumosRequeridos);

const esInsumoValido = (x: unknown) =>
  esObjeto(x) && typeof x.id === "string" && typeof x.nombre === "string";

const esVentaValida = (x: unknown) => esObjeto(x) && typeof x.id === "string";

const esFichasValidas = (x: unknown) =>
  esObjeto(x) && Object.values(x).every((v) => Array.isArray(v));

const leerOrdenesPersistidas = () =>
  leerListaPersistida<OrdenProduccion>(ORDENES_PRODUCCION_STORAGE_KEY, INITIAL_ORDENES_PRODUCCION, esOrdenProduccionValida);
const leerInsumosPersistidos = () =>
  leerListaPersistida<Insumo>(INSUMOS_STORAGE_KEY, INITIAL_INSUMOS, esInsumoValido);

/** Arranque del catálogo de insumos: manda lo guardado (orden y contenido) y
    la semilla solo completa los campos que falten en un registro viejo, así
    una base anterior no pierde stock ni categorías. Si no hay nada guardado
    (primer arranque o storage corrupto) se usa la semilla completa. */
const mezclarInsumosPersistidos = (): Insumo[] => {
  try {
    const guardados = leerListaPersistida<Insumo>(INSUMOS_STORAGE_KEY, [], esInsumoValido);
    if (guardados.length === 0) return INITIAL_INSUMOS;
    return guardados.map((g) => {
      const semilla = INITIAL_INSUMOS.find((s) => s.id === g.id);
      // Registros viejos de `sivpro.insumos.v1` traen `stockMaximo` y
      // `costoMaximo`, campos que ya no existen en el modelo: se descartan
      // aquí para no arrastrarlos durante la sesión ni reescribirlos.
      const limpio: Record<string, unknown> = { ...(semilla ? { ...semilla, ...g } : g) };
      delete limpio.stockMaximo;
      delete limpio.costoMaximo;
      return limpio as unknown as Insumo;
    });
  } catch {
    return INITIAL_INSUMOS;
  }
};

/**
 * Semillas con fechas relativas a hoy. Las pantallas de Semilla traían fechas
 * fijas (2024 / septiembre 2026): con los filtros Diario · Semanal · Mensual
 * del Dashboard eso dejaba las gráficas vacías casi siempre. Aquí solo se
 * recoloca la fecha de cada ítem de la semilla hacia atrás desde hoy; si el
 * usuario ya guardó datos en `localStorage`, esos no se tocan (la semilla solo
 * se usa cuando no hay nada guardado o está corrupto).
 *
 * `diasAtras` reparte los ítems por índice para cubrir hoy, la semana y el mes
 * completos (p. ej. ventas: [0, 0, 1, 2, 3, 4, 6, 9, 0] deja tres ventas de
 * hoy a distintas horas y el resto esparcidas por la semana/mes).
 */
const semillaConFechasRelativas = <T,>(
  semilla: T[],
  campo: keyof T,
  diasAtras: number[],
): T[] => {
  const hoy = new Date();
  return semilla.map((item, i) => ({
    ...item,
    [campo]: fechaISO(agregarDias(hoy, -(diasAtras[i % diasAtras.length] ?? 0))),
  })) as T[];
};

/** Punto C1: al arrancar se reescriben los IDs legacy de venta ("VEN-001",
 *  "VEN-2024-015x") al numérico canónico y se remapea el `ventaId` de las
 *  órdenes de producción GUARDADAS, así el vínculo pedido ↔ orden sobrevive
 *  al cambio de formato. Las órdenes se reescriben en su propia clave ANTES
 *  de que `leerOrdenesPersistidas` las lea (ventas se declara antes que
 *  órdenesProduccion en el componente). */
const migrarIdsVentasEnArranque = (ventas: Venta[]): Venta[] => {
  try {
    const { ventas: migradas, mapa } = migrarIdsVenta(ventas) as {
      ventas: Venta[];
      mapa: Record<string, string>;
    };
    if (Object.keys(mapa).length === 0) return migradas;
    // Las ventas se reescriben en su clave para que el cambio sea permanente.
    localStorage.setItem(VENTAS_STORAGE_KEY, JSON.stringify(migradas));
    const rawOrdenes = localStorage.getItem(ORDENES_PRODUCCION_STORAGE_KEY);
    if (rawOrdenes) {
      const ordenes: unknown = JSON.parse(rawOrdenes);
      if (Array.isArray(ordenes)) {
        const remapeadas = ordenes.map((o) =>
          esObjeto(o) && typeof o.ventaId === "string" && mapa[o.ventaId]
            ? { ...o, ventaId: mapa[o.ventaId] }
            : o
        );
        localStorage.setItem(
          ORDENES_PRODUCCION_STORAGE_KEY,
          JSON.stringify(remapeadas)
        );
      }
    }
    return migradas;
  } catch {
    // localStorage bloqueado o JSON ilegible: se sigue con lo leído tal cual.
    return ventas;
  }
};

const leerVentasPersistidas = () =>
  migrarIdsVentasEnArranque(
    leerListaPersistida<Venta>(
      VENTAS_STORAGE_KEY,
      // [0, 0, 1, 2, 3, 4, 6, 9, 0]: hoy (2 ventas a distintas horas + la
      // "completado" 18:30), ayer, y el resto esparcido por la semana/mes.
      semillaConFechasRelativas(INITIAL_VENTAS, "fecha", [0, 0, 1, 2, 3, 4, 6, 9, 0]),
      esVentaValida,
    )
  );
const esNoConformidadValida = (x: unknown) =>
  esObjeto(x) &&
  typeof x.id === "string" &&
  typeof x.tipo === "string" &&
  typeof x.estado === "string" &&
  typeof x.fechaRegistro === "string";

const leerNoConformidadesPersistidas = () =>
  leerListaPersistida<NoConformidad>(
    NO_CONFORMIDADES_STORAGE_KEY,
    // [0, 1, 2, 4, 6, 9]: una hoy y el resto repartida por la semana/mes.
    semillaConFechasRelativas(INITIAL_NO_CONFORMIDADES, "fechaRegistro", [0, 1, 2, 4, 6, 9]),
    esNoConformidadValida,
  );

// ── Persistencia del stock de Productos (por SESIÓN) ──────────────────
// A diferencia del resto, este va en `sessionStorage`: el descuento de stock
// sobrevive al F5 (recargas y las 45 → 40 siguen ahí) pero se borra al cerrar
// la pestaña/navegación del navegador. Así, al volver a arrancar `npm run` el
// stock vuelve a la semilla (45 pizzas de jamón, 50 peperoni, …), que es el
// comportamiento pedido sin backend.
// §6: la clave sube a v2 porque el vocabulario de tipos de producto cambió
// ("Producto terminado"/"Producto de reventa" → "Producto insumo"/"Producto
// terminado"): los productos guardados en v1 se descartan y vuelven a la
// semilla, evitando que un "Producto terminado" viejo (con ficha) se lea como
// el nuevo "Producto terminado" (sin ficha).
const PRODUCTOS_STORAGE_KEY = "sivpro.productos.v2";

const esProductoValido = (x: unknown) =>
  esObjeto(x) &&
  typeof x.id === "string" &&
  typeof x.nombre === "string" &&
  typeof x.stockDisponible === "number";

const leerProductosPersistidos = (): Producto[] => {
  try {
    const raw = sessionStorage.getItem(PRODUCTOS_STORAGE_KEY);
    if (!raw) return INITIAL_PRODUCTOS;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(esProductoValido)) {
      return parsed as Producto[];
    }
  } catch {
    // Datos corruptos o sessionStorage bloqueado: se cae a la semilla.
  }
  return INITIAL_PRODUCTOS;
};

/** ¿Esta sesión arranca con stock de Productos ya guardado? Se consulta en el
    primer render (antes de que el efecto de escritura rellene el storage). */
const hayStockDeSesion = (): boolean => {
  try {
    return sessionStorage.getItem(PRODUCTOS_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

const leerFichasPersistidas = () => {
  try {
    const raw = localStorage.getItem(FICHAS_STORAGE_KEY);
    if (!raw) return INITIAL_FICHAS;
    const parsed: unknown = JSON.parse(raw);
    // Solo se valida la forma. La limpieza (descartar huérfanas y fichas
    // semilla) y la reasignación de ID se hacen en el arranque del estado,
    // donde ya están disponibles TODOS los IDs de la sesión: productos del
    // menú e insumos (los Productos Insumo también tienen ficha).
    if (esFichasValidas(parsed)) return parsed as FichasPorProducto;
  } catch {
    // Datos corruptos o localStorage bloqueado: se cae a la semilla.
  }
  return INITIAL_FICHAS;
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
  "sivpro.token.v1",
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

class LandingErrorBoundary extends Component<
  { resetKey: Screen; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[LandingErrorBoundary] Error al renderizar una ruta pública", error, info);
  }

  componentDidUpdate(prevProps: { resetKey: Screen }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <h1 className="text-2xl font-bold text-foreground">No se pudo cargar esta sección</h1>
          <p className="mt-2 text-muted-foreground">
            Intenta volver al inicio y abrirla nuevamente.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  /** Snapshot de la sesión al cargar la página, leído UNA sola vez.
      Permite que F5 no borre la sesión (se restaura usuario, rol y pantalla)
      y detectar una sesión expirada por inactividad para avisar. */
  const [sesionArranque] = useState(() => {
    const s = leerSesionGuardada();
    if (!s) return { estado: "ninguna" as const };
    if (Date.now() - s.ultimaActividad >= INACTIVIDAD_MS) {
      borrarSesionGuardada();
      return { estado: "expirada" as const };
    }
    return { estado: "activa" as const, s };
  });
  const sesionActiva = sesionArranque.estado === "activa" ? sesionArranque.s : null;
  /** Pantalla que se restaura desde la sesión (si era válida) o "landing". */
  const [screen, setScreen] = useState<Screen>(
    (sesionActiva?.screen as Screen) || "landing",
  );
  /** Venta cuya devolución se debe abrir ya lista. La pone el botón "Gestionar"
      de la tabla de ventas para no obligar a buscarla otra vez en el módulo. */
  const [devolucionAAbrir, setDevolucionAAbrir] = useState<string | null>(null);
  const [ordenAAbrir, setOrdenAAbrir] = useState<string | null>(null);
  const [ordenRecepcion, setOrdenRecepcion] =
    useState<OrdenCompra | null>(null);
  const [ordenDetalle, setOrdenDetalle] = useState<OrdenCompra | null>(null);
  const [ordenAEditar, setOrdenAEditar] = useState<OrdenCompra | null>(null);
  const [ordenCompraPage, setOrdenCompraPage] = useState(1);
  // El carrito arranca desde lo que quedó guardado: sin esto, recargar la
  // página, cambiar de categoría o abrir el detalle de otro producto borraba
  // lo que el cliente había agregado sin haber iniciado sesión. El catálogo y
  // la compra no cambian: solo se recupera el estado que ya estaba en pantalla.
  const [cart, setCart] = useState<CartItem[]>(leerCarritoGuardado);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(sesionActiva !== null);
  const [ventas, setVentas] = useState<Venta[]>(leerVentasPersistidas);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [orderConfirmation, setOrderConfirmation] = useState<PedidoResumen | null>(null);
  const [loginNotice, setLoginNotice] = useState(false);
  // Correo que queda precargado en "Iniciar sesión" cuando se llega desde el
  // cambio de contraseña: la sesión acaba de cerrarse y así el usuario solo
  // tiene que escribir la clave nueva. Vive aquí (y no dentro de LoginScreen)
  // porque quien lo conoce es el flujo que cierra la sesión.
  const [loginEmailPre, setLoginEmailPre] = useState("");
  // Catálogo de productos. Lo consumen GestionProductosScreen y
  // OrdenProduccionScreen (`productos` / `setProductos`). El merge de develop
  // trajó las dos pantallas pero no este estado: `INITIAL_PRODUCTOS` y el tipo
  // `Producto` quedaron importados y sin usar, y App reventaba con
  // "ReferenceError: productos is not defined" al renderizar el dashboard.
  const [productos, setProductos] = useState<Producto[]>(leerProductosPersistidos);
  // Capturado en el primer render: si la sesión arranca SIN stock persistido,
  // el catálogo volvió a la semilla y las marcas "productosDescontados" de las
  // órdenes guardadas en localStorage apuntan a descuentos que ya no existen
  // (el efecto de abajo las limpia para no duplicar movimientos).
  const arranqueSinStock = useRef(!hayStockDeSesion());
  // Fichas técnicas por producto. Las crea Gestión de Productos y las lee
  // Orden de Producción para saber qué insumos (y Productos Insumo) consume
  // cada plato de un pedido.
  const [fichasPorProducto, setFichasPorProducto] =
    useState<FichasPorProducto>(() => {
      // Migración al modelo único + normalización de IDs, UNA sola vez y con
      // los IDs reales de esta sesión (productos del menú e insumos, porque
      // los Productos Insumo también guardan ficha). Migrar antes de
      // normalizar hace que las fichas recién creadas desde el legado ya
      // entren con número en la serie.
      const insumosSemilla = mezclarInsumosPersistidos();
      const idsExistentes = [
        ...leerProductosPersistidos().map((p) => p.id),
        ...insumosSemilla.map((i) => i.id),
      ];
      return normalizarIdsFicha(
        migrarFichasLegacy(leerFichasPersistidas(), insumosSemilla),
        idsExistentes,
      );
    });
  // Órdenes de producción. Antes vivían dentro de OrdenProduccionScreen, así que
  // se perdían al salir del módulo y no había forma de crear el pedido solo.
  const [ordenesProduccion, setOrdenesProduccion] =
    useState<OrdenProduccion[]>(leerOrdenesPersistidas);
  // No conformidades (módulo Productos no conformes). Subidas a App para que
  // Orden de Producción pueda registrar mermas y sobrevivan al F5.
  const [noConformidades, setNoConformidades] =
    useState<NoConformidad[]>(leerNoConformidadesPersistidas);
  // Categorías de producto. Las consume el módulo de Categoría Producto (que
  // las crea, edita y borra) y el landing público, que pinta una tarjeta por
  // cada categoría nueva. Ver `leerCategoriasPersistidas`.
  const [categorias, setCategorias] = useState<CategoriaProducto[]>(leerCategoriasPersistidas);
  // Catálogo del picker de pedidos (VentasScreen) y del canje de devoluciones,
  // armado con el estado `productos` en vez del mock `PRODUCTS`: los nombres
  // ("Pizza Jamon") son los del panel, así el detalle de la venta resuelve el
  // Producto real (id y stock) al crear la orden de producción.
  const productosMenu = useMemo(
    () => productos.map((p) => productoACatalogo(p, categorias)),
    [productos, categorias],
  );
  const [userRole, setUserRole] = useState("Administrador");
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(sesionActiva?.userId ?? null);
  // Id del rol ACTIVO de la sesión. Se inicializa en el login y lo cambia el
  // menú "Cambiar de rol"; también se persiste en `sivpro.rolActivo.v1`.
  const [rolActivoId, setRolActivoId] = useState<string | null>(sesionActiva?.rolActivo ?? null);
  const [roles, setRoles] = useState<Rol[]>(leerRolesPersistidos);
  const [usuarios, setUsuarios] = useState<Usuario[]>(leerUsuariosPersistidos);
  const [empleados, setEmpleados] = useState<Empleado[]>(leerEmpleadosPersistidos);
  const [clientes, setClientes] = useState<Cliente[]>(INITIAL_CLIENTES);

  // Mantiene el listado general como la unión de las cuentas de empleados y
  // clientes. Los perfiles que coinciden por tipo y número de documento
  // (`clavePersona`) son una sola cuenta.
  useEffect(() => {
    setUsuarios(prev => {
      const next = [...prev];
      const porClave = new Map(
        next.map(usuario => [clavePersona(usuario.tipoDocumento, usuario.numeroDocumento, usuario.correo), usuario]),
      );
      let changed = false;
      const siguienteId = () => {
        const max = next.reduce((value, usuario) => {
          const numero = parseInt(usuario.id.replace("USR-", ""), 10) || 0;
          return Math.max(value, numero);
        }, 0);
        return `USR-${String(max + 1).padStart(3, "0")}`;
      };

      empleados.forEach(empleado => {
        const clave = clavePersona(empleado.tipoDocumento, empleado.numeroDocumento, empleado.correo);
        const base = {
          nombre: empleado.nombre,
          iniciales: empleado.iniciales,
          avatarColor: empleado.avatarColor,
          correo: empleado.correo,
          telefono: empleado.telefono,
          tipoDocumento: empleado.tipoDocumento,
          numeroDocumento: empleado.numeroDocumento,
          rolIds: [...empleado.rolIds],
          rolId: empleado.rolIds[0] ?? "",
          activo: empleado.activo,
        };
        const existente = porClave.get(clave);
        if (existente) {
          const actualizado = { ...existente, ...base };
          if (JSON.stringify(actualizado) !== JSON.stringify(existente)) {
            const indice = next.findIndex(usuario => usuario.id === existente.id);
            next[indice] = actualizado;
            porClave.set(clave, actualizado);
            changed = true;
          }
        } else {
          // Solo al CREAR: el usuario nuevo nace con la contraseña de su ficha
          // de empleado para poder entrar con ella. `base` no lleva
          // `contrasena` a propósito, así que la rama de arriba (actualizar)
          // jamás pisa la contraseña que el usuario cambió en "Mi perfil" o en
          // "Restablecer contraseña".
          const nuevo = { id: siguienteId(), ...base, contrasena: empleado.contrasena };
          next.push(nuevo);
          porClave.set(clave, nuevo);
          changed = true;
        }
      });

      const clavesEmpleado = new Set(empleados.map(e =>
        clavePersona(e.tipoDocumento, e.numeroDocumento, e.correo),
      ));
      clientes.forEach(cliente => {
        const clave = clavePersona(cliente.tipoDocumento, cliente.numeroDocumento, cliente.correo);
        if (clavesEmpleado.has(clave)) return;
        const existente = porClave.get(clave);
        const base = {
          nombre: cliente.nombre,
          iniciales: cliente.iniciales,
          avatarColor: cliente.avatarColor,
          correo: cliente.correo,
          telefono: existente?.telefono ?? "",
          tipoDocumento: cliente.tipoDocumento,
          numeroDocumento: cliente.numeroDocumento,
          rolIds: [idRolCliente(roles)],
          rolId: idRolCliente(roles),
          activo: cliente.activo,
        };
        if (existente) {
          const actualizado = { ...existente, ...base };
          if (JSON.stringify(actualizado) !== JSON.stringify(existente)) {
            const indice = next.findIndex(usuario => usuario.id === existente.id);
            next[indice] = actualizado;
            porClave.set(clave, actualizado);
            changed = true;
          }
        } else {
          const nuevo = { id: siguienteId(), ...base };
          next.push(nuevo);
          porClave.set(clave, nuevo);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [empleados, clientes, roles]);

  // Fuente de lectura del listado general: combina cualquier cuenta existente
  // con los perfiles de Clientes y Empleados, sin repetir personas (por
  // documento via `clavePersona`).
  const usuariosUnificados = useMemo(() => {
    const next = [...usuarios];
    const porClave = new Map(
      next.map(usuario => [clavePersona(usuario.tipoDocumento, usuario.numeroDocumento, usuario.correo), usuario]),
    );
    const siguienteId = () => {
      const max = next.reduce((value, usuario) => {
        const numero = parseInt(usuario.id.replace("USR-", ""), 10) || 0;
        return Math.max(value, numero);
      }, 0);
      return `USR-${String(max + 1).padStart(3, "0")}`;
    };

    empleados.forEach(empleado => {
      const clave = clavePersona(empleado.tipoDocumento, empleado.numeroDocumento, empleado.correo);
      const base = {
        nombre: empleado.nombre,
        iniciales: empleado.iniciales,
        avatarColor: empleado.avatarColor,
        correo: empleado.correo,
        telefono: empleado.telefono,
        tipoDocumento: empleado.tipoDocumento,
        numeroDocumento: empleado.numeroDocumento,
        rolIds: [...empleado.rolIds],
        rolId: empleado.rolIds[0] ?? "",
        activo: empleado.activo,
      };
      const existente = porClave.get(clave);
      if (existente) {
        const actualizado = { ...existente, ...base };
        const indice = next.findIndex(usuario => usuario.id === existente.id);
        next[indice] = actualizado;
        porClave.set(clave, actualizado);
      } else {
        // Misma regla que en el efecto de arriba: la contraseña se copia SOLO
        // al crear, nunca al actualizar (el listado unificado no debe pisarla).
        const nuevo = { id: siguienteId(), ...base, contrasena: empleado.contrasena };
        next.push(nuevo);
        porClave.set(clave, nuevo);
      }
    });

    const clavesEmpleado = new Set(empleados.map(e =>
      clavePersona(e.tipoDocumento, e.numeroDocumento, e.correo),
    ));
    clientes.forEach(cliente => {
      const clave = clavePersona(cliente.tipoDocumento, cliente.numeroDocumento, cliente.correo);
      const existente = porClave.get(clave);
      if (clavesEmpleado.has(clave)) return;
      const base = {
        nombre: cliente.nombre,
        iniciales: cliente.iniciales,
        avatarColor: cliente.avatarColor,
        correo: cliente.correo,
        telefono: existente?.telefono ?? "",
        tipoDocumento: cliente.tipoDocumento,
        numeroDocumento: cliente.numeroDocumento,
        rolIds: [idRolCliente(roles)],
        rolId: idRolCliente(roles),
        activo: cliente.activo,
      };
      if (existente) {
        const actualizado = { ...existente, ...base };
        const indice = next.findIndex(usuario => usuario.id === existente.id);
        next[indice] = actualizado;
        porClave.set(clave, actualizado);
      } else {
        const nuevo = { id: siguienteId(), ...base };
        next.push(nuevo);
        porClave.set(clave, nuevo);
      }
    });

    return next;
  }, [usuarios, empleados, clientes, roles]);

  // Derived display values for top bar and sidebar permissions
  const loggedInUser = loggedInUserId ? usuarios.find(u => u.id === loggedInUserId) ?? null : null;
  const loggedInUserName = loggedInUser?.nombre ?? "Gloria";
  // Nombre con el que se guardan y se buscan los pedidos del usuario en sesión
  const pedidosUsuarioNombre =
    loggedInUser?.nombre ??
    (userRole === "Cliente" ? "Sebastián Gómez" : "Gloria Inés Vargas");
  // ── Sesión multi-rol ───────────────────────────────────────────────
  // La ficha de empleado de la cuenta de sesión, por DOCUMENTO (el correo es
  // editable; el documento no). `null` si la persona no tiene ficha.
  const claveCuentaSesion = loggedInUser
    ? clavePersona(loggedInUser.tipoDocumento, loggedInUser.numeroDocumento, loggedInUser.correo)
    : "";
  const correoSesion = loggedInUser?.correo.trim().toLowerCase() ?? "";
  const loggedInEmpleado = loggedInUser
    ? empleados.find(e => clavePersona(e.tipoDocumento, e.numeroDocumento, e.correo) === claveCuentaSesion) ?? null
    : null;

  // Roles de la persona en sesión. La fuente es la ficha de empleado si existe
  // (multi-rol operativo); si no, el propio usuario (cliente, admin o rol
  // personalizado). Un rol desactivado o borrado no cuenta.
  const rolIdsSesion: string[] = (() => {
    if (loggedInEmpleado?.rolIds?.length) return [...loggedInEmpleado.rolIds];
    if (loggedInUser) {
      return loggedInUser.rolIds?.length ? [...loggedInUser.rolIds] : [loggedInUser.rolId];
    }
    // Sesión legacy "Cliente" (p. ej. portal público sin registro de usuario).
    if (userRole === "Cliente") {
      const cliente = roles.find(r => esRolCliente(r) && r.activo);
      return cliente ? [cliente.id] : [];
    }
    return [];
  })();
  const rolesSesion: Rol[] = [];
  const rolesSesionVistos = new Set<string>();
  for (const id of rolIdsSesion) {
    const r = roles.find(rr => rr.id === id && rr.activo) ?? null;
    if (r && !rolesSesionVistos.has(r.id)) { rolesSesionVistos.add(r.id); rolesSesion.push(r); }
  }

  // Rol ACTIVO de la sesión. Prioridad: estado (cambio manual con "Cambiar de
  // rol") → guardado en localStorage (persiste al cerrar sesión) → primero.
  const rolActivoIdGuardado = loggedInUser ? leerRolActivo(loggedInUser.id) : null;
  const rolActivoIdValido =
    rolActivoId && rolesSesion.some(r => r.id === rolActivoId)
      ? rolActivoId
      : rolActivoIdGuardado && rolesSesion.some(r => r.id === rolActivoIdGuardado)
        ? rolActivoIdGuardado
        : rolesSesion[0]?.id ?? null;
  const loggedInRol = rolesSesion.find(r => r.id === rolActivoIdValido) ?? null;
  const loggedInRoleName = loggedInRol?.nombre ?? userRole;
  // Permisos SOLO del rol activo: la sesión ya no fusiona los mapas de todos
  // los roles de la persona.
  const loggedInAccesos: AccesosMap = loggedInRol?.accesos ?? {};

  // "Administrador"/"Cliente" se reconocen SIEMPRE por nombre, nunca por id:
  // los id solo son anclas de migración.
  const isNamedAdmin = esRolAdministrador(loggedInRol);
  // § Dashboard por PERMISO, no por nombre de rol: la cuenta super admin
  // (Gloria, USR-001 / gloria@lasirena.com) siempre; los demás únicamente con
  // el privilegio "Ver" de "Dashboard::Dashboard" del rol activo. El rol
  // "Administrador" lo conserva porque su semilla (fullAccesos) ya incluye la
  // clave y la migración única "sivpro.migracion.dashboardPermiso.v1" se la
  // agrega a los datos viejos; si super admin se la quita, deja de verlo.
  const esSuperAdminSesion =
    loggedInUser !== null &&
    (loggedInUser.id === "USR-001" ||
      loggedInUser.correo.trim().toLowerCase() === "gloria@lasirena.com");
  const hasDashboardAccess =
    esSuperAdminSesion || (loggedInAccesos[DASHBOARD_PERM_KEY]?.includes("Ver") ?? false);
  const adminHomeScreen: Screen = hasDashboardAccess ? "dashboard" : "inicio";

  // Cliente público = solo el rol "Cliente" y sin ficha de empleado. El
  // "Cliente/Empleado" (persona con ficha) ya NO es cliente público: va al
  // panel y ofrece el cambio de rol.
  const esClientePublicoSesion =
    rolesSesion.length > 0 && rolesSesion.every(esRolCliente) && loggedInEmpleado === null;
  const isStaff = isLoggedIn && loggedInUser !== null && !esClientePublicoSesion;

  // Los roles que ofrece el menú "Cambiar de rol": los EXTRAS (ni Administrador
  // ni Cliente ni Empleado) que siguen activos del empleado. No se filtran más
  // por "tener pantallas": Inicio siempre está disponible y el cambio de rol
  // debe ofrecerlos todos.
  const rolesParaCambiar = rolesSesion.filter(r =>
    r.id !== loggedInRol?.id &&
    !(normalizarNombreRol(r.nombre) === "administrador" || normalizarNombreRol(r.nombre) === "cliente" || normalizarNombreRol(r.nombre) === "empleado"),
  );

  const cambiarRolActivo = (rolId: string) => {
    const siguiente = rolesSesion.find(r => r.id === rolId && r.activo) ?? null;
    if (!siguiente) return;
    setRolActivoId(siguiente.id);
    if (loggedInUser) escribirRolActivo(loggedInUser.id, siguiente.id);
    setUserRole(siguiente.nombre);
    toast.success(`Ahora estás como ${siguiente.nombre}`);
    // Si la pantalla actual ya no está permitida por el rol nuevo, vuelve a la
    // primera pantalla que ese rol sí permite. "dashboard" solo lo es si el rol
    // siguiente tiene el permiso Dashboard (o la sesión es super admin).
    const dashSiguiente =
      esSuperAdminSesion || (siguiente.accesos[DASHBOARD_PERM_KEY]?.includes("Ver") ?? false);
    const permKeyActual = SCREEN_PERM_KEY[screen];
    const permitida =
      screen === "dashboard"
        ? dashSiguiente
        : permKeyActual
          ? (siguiente.accesos[permKeyActual]?.includes("Ver") ?? false)
          : true; // "inicio" y pantallas sin permKey siempre son un fallback seguro
    if (!permitida) {
      navigate(dashSiguiente ? "dashboard" : "inicio");
    }
  };

  // Returns action permissions for a given screen based on the logged-in user's role
  const getPerms = (s: Screen) => {
    const key = SCREEN_PERM_KEY[s];
    if (!key) return { canCreate: true, canEdit: true, canDelete: true, canExportExcel: true };
    const acts = loggedInAccesos[key] ?? [];
    return {
      canCreate: acts.includes("Crear"),
      canEdit:   acts.includes("Editar"),
      canDelete: acts.includes("Eliminar"),
      // Aparte del CRUD: sin este permiso no se monta el botón "Descargar
      // Excel", así que el `.xlsx` no se puede generar desde la interfaz.
      canExportExcel: acts.includes(ACCION_EXCEL),
    };
  };

  // Un solo estado para escritorio: true = menú completo visible,
  // false = menú totalmente oculto (sin franja de íconos). Se persiste en
  // localStorage; en celular no se guarda (el drawer siempre arranca cerrado).
  const [menuAbierto, setMenuAbierto] = useState(() => {
    try {
      const v = localStorage.getItem("sivpro.menuAbierto.v1");
      return v === null ? true : v !== "false";
    } catch {
      return true;
    }
  });
  // En celular/tablet el sidebar no cabe (240px fijos sobre ~375px de ancho):
  // se oculta y el botón del topbar lo abre como panel deslizante.
  const esMovil = useIsMobile();
  const [sidebarMovilAbierto, setSidebarMovilAbierto] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstNavRef = useRef<HTMLButtonElement | null>(null);

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
  const esClientePublico = esClientePublicoSesion;
  const isAdminRole = hasValidSession && !esClientePublico;
  const isAdmin = ADMIN_SCREENS.includes(screen) && isAdminRole;

  // Guardar la preferencia de menú en escritorio (no en celular).
  useEffect(() => {
    if (esMovil) return;
    try {
      localStorage.setItem("sivpro.menuAbierto.v1", String(menuAbierto));
    } catch {
      // almacenamiento no disponible (modo privado, cuota llena, etc.)
    }
  }, [menuAbierto, esMovil]);

  // Si la ventana pasa de móvil a escritorio con el drawer abierto, se cierra.
  useEffect(() => {
    if (!esMovil) setSidebarMovilAbierto(false);
  }, [esMovil]);

  // Mientras el drawer móvil está abierto la página de fondo no se desplaza.
  // El cleanup también restaura el overflow al desmontar.
  useEffect(() => {
    if (!isAdmin || !esMovil || !sidebarMovilAbierto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isAdmin, esMovil, sidebarMovilAbierto]);

  // Escape cierra el drawer móvil y devuelve el foco al botón hamburguesa.
  useEffect(() => {
    if (!isAdmin || !esMovil || !sidebarMovilAbierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarMovilAbierto(false);
        setTimeout(() => menuButtonRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAdmin, esMovil, sidebarMovilAbierto]);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<Product>(PRODUCTS[0]);
  const [catalogCat, setCatalogCat] = useState("Todas");
  // La página del catálogo vive aquí, igual que la categoría: si viviera dentro
  // de CatalogScreen se perdería al abrir el detalle de un producto (la pantalla
  // se desmonta) y al volver se restauraría el scroll guardado de la página 2
  // sobre el grid de la página 1, que es otra tanda de productos.
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [detalleOrigen, setDetalleOrigen] = useState<Screen>("landing");
  const [orders] = useState<Order[]>(ORDERS);
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>(
    // Órdenes 2024 → relativas a hoy: [0, 1, 3, 6, 10] cubre hoy, la semana
    // y el mes para el filtro del Dashboard.
    semillaConFechasRelativas(INITIAL_ORDENES, "fecha", [0, 1, 3, 6, 10]),
  );
  const [gestiones, setGestiones] = useState<GestionCompra[]>(
    // Facturas ago/sept 2026 → relativas a hoy: [0, 1, 2, 4, 6].
    semillaConFechasRelativas(INITIAL_GESTIONES, "fechaFactura", [0, 1, 2, 4, 6]),
  );
  const [insumos, setInsumos] =
    useState<Insumo[]>(() => mezclarInsumosPersistidos());
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

  // Cada alta, edición o borrado de categoría se guarda en localStorage: es lo
  // que permite que la tarjeta nueva del landing siga ahí después del F5. En la
  // primera carga se escribe la semilla, que es la misma que trae el módulo.
  useEffect(() => {
    try {
      localStorage.setItem(CATEGORIAS_STORAGE_KEY, JSON.stringify(categorias));
    } catch {
      // El almacenamiento puede estar bloqueado o sin cuota: la lista sigue
      // en memoria durante la sesión.
    }
  }, [categorias]);

  // Mitad que faltaba del par leer/escribir de los roles: `leerRolesPersistidos`
  // lee `sivpro.roles.v1`, pero nada la escribía, así que cualquier rol creado
  // en "Gestión de Usuarios" desaparecía con el F5 (y el permiso que alguien
  // le había dado dejaba de servir al recargar). Ningún dato de credencial
  // entra aquí: solo id, nombre, descripción, activo y accesos.
  useEffect(() => {
    try {
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
    } catch {
      // Almacenamiento bloqueado o sin cuota: los roles siguen en memoria.
    }
  }, [roles]);

  // Igual para empleados: sin esta escritura, el alta de un empleado y su
  // historial de contrataciones se perdían en cada F5.
  //
  // `contrasena` se DEJA FUERA a propósito (ver EMPLEADOS_STORAGE_KEY): las
  // credenciales no se guardan en el navegador. Al leer, `normalizarEmpleado`
  // repone "123456" a los registros que lleguen sin ella, que es exactamente
  // lo que ocurre tras guardar aquí.
  useEffect(() => {
    try {
      const sinContrasena = empleados.map(
        ({ contrasena: _sinContrasena, ...resto }) => resto,
      );
      localStorage.setItem(EMPLEADOS_STORAGE_KEY, JSON.stringify(sinContrasena));
    } catch {
      // Almacenamiento bloqueado o sin cuota: los empleados siguen en memoria.
    }
  }, [empleados]);

  // Cada cambio de órdenes, insumos, ventas o fichas se guarda en localStorage
  // para que el trabajo de cocina sobrevive al F5: en la cocina se entra y sale
  // del módulo muchas veces por turno, y perder las órdenes en proceso obligaba
  // a rehacerlas a mano.
  useEffect(() => {
    try {
      localStorage.setItem(ORDENES_PRODUCCION_STORAGE_KEY, JSON.stringify(ordenesProduccion));
    } catch {
      // El almacenamiento puede estar bloqueado o sin cuota: la lista sigue
      // en memoria durante la sesión.
    }
  }, [ordenesProduccion]);

  useEffect(() => {
    try {
      localStorage.setItem(INSUMOS_STORAGE_KEY, JSON.stringify(insumos));
    } catch {
      // El almacenamiento puede estar bloqueado o sin cuota.
    }
  }, [insumos]);

  useEffect(() => {
    try {
      localStorage.setItem(NO_CONFORMIDADES_STORAGE_KEY, JSON.stringify(noConformidades));
    } catch {
      // El almacenamiento puede estar bloqueado o sin cuota.
    }
  }, [noConformidades]);

  useEffect(() => {
    try {
      localStorage.setItem(VENTAS_STORAGE_KEY, JSON.stringify(ventas));
    } catch {
      // El almacenamiento puede estar bloqueado o sin cuota.
    }
  }, [ventas]);

  // ── Sincronización de ventas entre pestañas (Fase 3.1) ──
  // Cuando otra pestaña (p. ej. el admin) cambia una venta, esta pestaña la
  // recibe sin recargar. El `storage` solo se dispara en las OTRAS pestañas, y
  // solo se aplica el cambio si el JSON realmente difiere del actual, para no
  // entrar en bucles de escritura.
  const ventasRef = useRef(ventas);
  useEffect(() => {
    ventasRef.current = ventas;
  }, [ventas]);
  useEffect(() => {
    const onVentasStorage = (e: StorageEvent) => {
      if (e.key !== VENTAS_STORAGE_KEY || e.newValue === null) return;
      if (e.newValue === JSON.stringify(ventasRef.current)) return;
      try {
        const nueva: unknown = JSON.parse(e.newValue);
        if (Array.isArray(nueva)) setVentas(nueva as Venta[]);
      } catch {
        // JSON corrupto: se ignora.
      }
    };
    window.addEventListener("storage", onVentasStorage);
    return () => window.removeEventListener("storage", onVentasStorage);
  }, []);

  // ── Avance automático del estado de la venta (§13) ──
  // El estado NO se cambia a mano: sigue el proceso del pedido. Acá se
  // resuelve el último salto, el que ningún humano debe tocar: un pedido
  // que quedó "por entregar" (llega ahí cuando su orden de producción se
  // completa, punto C2) pasa solo a "completado" cuando se cumple la hora de
  // recogida que eligió el cliente. Es el segundo disparador de ese salto:
  // el primero es el botón "Entregar" de VentasScreen; ambos están
  // registrados en services/estadosVenta.ts. Un "por-verificar" NO se
  // autocumple: ese salto exige que el admin revise el comprobante, que es
  // una decisión humana.
  useEffect(() => {
    const marcarCompletados = () => {
      setVentas((prev) => {
        const ahora = new Date();
        let cambio = false;
        const siguientes = prev.map((v) => {
          if (v.estado !== "venta") return v;
          const minutos = minutosDeHora(v.horaRecogida);
          if (minutos === null) return v;
          const horaHoy = ahora.getHours() * 60 + ahora.getMinutes();
          const fechaVenta = new Date(`${v.fecha}T00:00:00`);
          const mismoDia =
            isNaN(fechaVenta.getTime()) ||
            fechaVenta.toDateString() === ahora.toDateString();
          // Hoy se compara contra la hora actual; una fecha anterior ya
          // venció. Si la fecha no se pudo leer, solo se usa la hora.
          const vencido = mismoDia ? minutos <= horaHoy : true;
          if (!vencido) return v;
          cambio = true;
          return {
            ...v,
            estado: "completado" as VentaStatus,
            historial: [
              ...(v.historial ?? []),
              {
                estado: "completado" as VentaStatus,
                hora: ahora.toLocaleTimeString("es-CO", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
            ],
          };
        });
        return cambio ? siguientes : prev;
      });
    };
    marcarCompletados();
    const id = window.setInterval(marcarCompletados, 60000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FICHAS_STORAGE_KEY, JSON.stringify(fichasPorProducto));
    } catch {
      // El almacenamiento puede estar bloqueado o sin cuota.
    }
  }, [fichasPorProducto]);

  // Stock de Productos: se escribe en sessionStorage (ver PRODUCTOS_STORAGE_KEY)
  // para que un F5 conserve el descuento pero un cierre de pestaña lo reinicie.
  useEffect(() => {
    try {
      sessionStorage.setItem(PRODUCTOS_STORAGE_KEY, JSON.stringify(productos));
    } catch {
      // El almacenamiento puede estar bloqueado o sin cuota: el stock sigue
      // en memoria durante la sesión.
    }
  }, [productos]);

  // Arranque con stock fresco (sesión nueva): las órdenes de la sesión anterior
  // quedaron en localStorage con `productosDescontados`, pero el stock de
  // Productos ya volvió a la semilla. Sin limpiarla, una devolución pendiente
  // "repondría" unidades que nunca salieron (45 → 50). Solo se toca esta marca:
  // insumos y el resto del flujo siguen persistidos como hasta ahora.
  useEffect(() => {
    if (!arranqueSinStock.current) return;
    arranqueSinStock.current = false;
    setOrdenesProduccion((prev) =>
      prev.some((o) => o.productosDescontados)
        ? prev.map((o) =>
            o.productosDescontados ? { ...o, productosDescontados: false } : o,
          )
        : prev,
    );
  }, []);

  // Creación automática de la orden de producción (§3a / P2) — punto C2:
  // cuando una venta queda PAGADA y pasa a "en-preparacion" se le crea sola
  // una orden tipo "Pedido" en Pendiente. Mientras la venta está
  // "por-verificar" no se crea nada, que es justo cuando NO se prepara. Y
  // cuando esa orden se completa (callback `onVentaLista` más abajo) la venta
  // vuelve a avanzar, a "venta" ("Por entregar").
  //
  // El filtro es por ESTADO, no por transición, así que cubre los flujos:
  // - Ventas web: nacen en "por-verificar" (registrarPedido) y, al aprobarlas
  //   en VentasScreen, pasan a "en-preparacion" → el efecto reacciona.
  // - Ventas del admin: VentasScreen las crea directamente en
  //   "en-preparacion" (vía setVentas) → el efecto las detecta aunque nunca
  //   "pasaron" por otro estado.
  // - Datos previos al C2: una venta ya en "venta" (o en "completado" con
  //   Efectivo) sin orden también la arma, para que no se quede sin producir.
  // `crearOrdenPedido` arma TODOS los ítems de la venta en UNA sola orden
  // (pizza de cañón + lasaña mixta = una orden con ambas líneas), nunca una
  // orden por producto.
  //
  // Se salta la PRIMERA ejecución (el montaje): en ella ya vienen ventas de
  // la semilla y de lo que se cargó de localStorage, y no es un cambio de
  // estado sino el arranque. A partir de ahí, cada venta que aparece
  // preparada sin orden genera la suya. La clave anti-duplicados es `ventaId`:
  // una venta = una sola orden, y el updater vuelve a comprobarlo contra el
  // estado final por si acaso.
  const vigilaVentasRef = useRef(false);
  useEffect(() => {
    if (!vigilaVentasRef.current) {
      vigilaVentasRef.current = true;
      return;
    }
    const conOrden = new Set(ordenesProduccion.map((o) => o.ventaId).filter(Boolean) as string[]);
    const preparable = (v: Venta) =>
      v.estado === "en-preparacion" ||
      v.estado === "venta" ||
      (v.estado === "completado" && v.metodoPago === "Efectivo");
    const nuevas = ventas.filter((v) => preparable(v) && !conOrden.has(v.id));
    if (nuevas.length === 0) return;

    const creada: OrdenProduccion[] = [];
    let id = siguienteOrdenId(ordenesProduccion);
    for (const v of nuevas) {
      creada.push(crearOrdenPedido(v, { productos, fichas: fichasPorProducto, insumos }, id));
      id = `OP-${String(parseInt(id.replace("OP-", ""), 10) + 1).padStart(3, "0")}`;
    }
    setOrdenesProduccion((p) => {
      // Defensa por `ventaId`: si alguna orden del mismo ventaId ya entró en
      // `p` (carrera rara con el buscador manual), no se vuelve a crear.
      const yaTiene = new Set(p.map((o) => o.ventaId).filter(Boolean) as string[]);
      return [...creada.filter((o) => !o.ventaId || !yaTiene.has(o.ventaId)), ...p];
    });
    creada.forEach((o) =>
      toast.success(`Orden de producción ${o.id} creada para la venta ${o.ventaNumero}`),
    );
  }, [ventas, ordenesProduccion, productos, fichasPorProducto, insumos]);

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
      // Punto 2.3: la pantalla entrante tarda en montarse (`AnimatePresence
      // mode="wait"`), y al montarse las imágenes del landing aún no han
      // cargado, así que el documento puede estar más bajo que `top` y el
      // scroll se limita al máximo disponible (quedaba en otra sección).
      // Se reintenta con rAF + `setTimeout` hasta llegar al tope guardado o
      // agotar el tiempo (~3 s): cuando el documento crece por la carga de
      // imágenes, el siguiente intento ya alcanza la posición. Antes se
      // cortaba en cuanto el scroll llegaba al fondo del documento TEMPORAL
      // (imágenes sin cargar), que era mucho más arriba que el tope guardado.
      const MAX_INTENTOS = 60;
      let intentos = 0;
      const intentar = () => {
        intentos += 1;
        const doc = document.documentElement;
        const alcanzable = Math.min(
          top,
          Math.max(0, doc.scrollHeight - window.innerHeight),
        );
        window.scrollTo({ top: alcanzable, behavior: "auto" });
        if (window.scrollY !== top && intentos < MAX_INTENTOS) {
          window.setTimeout(intentar, 50);
        }
      };
      // Un doble frame para que el DOM de la pantalla entrante exista al menos.
      requestAnimationFrame(() => window.requestAnimationFrame(intentar));
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /** Desde la tabla de ventas, "Gestionar" salta al módulo de devoluciones con el
      modal de esa venta ya abierto. */
  const abrirGestionDevolucion = (id: string) => {
    setDevolucionAAbrir(id);
    navigate("devoluciones");
  };

  /** Desde Insumos, "Programar producción" salta a Orden de Producción con el
      modal de crear ya abierto y el Producto Insumo preseleccionado. */
  const abrirOrdenProduccion = (idProductoInsumo: string) => {
    setOrdenAAbrir(idProductoInsumo);
    navigate("production-orders");
  };

  const openLogin = () => {
    setLoginNotice(false);
    setLoginEmailPre("");
    navigate("login");
  };

  /** Puente API → estado local: la ficha que arma el login cuando el correo
      no existía en el listado. Sin estar en `usuarios`, `loggedInUser` no
      resolvería y la sesión se cerraría sola. Un correo vacío nunca compara
      igual a otro vacío: si no, todos los usuarios sin correo serían "el
      mismo". */
  const agregarUsuarioLocal = (nuevo: Usuario) => {
    const em = (v: string) => v.trim().toLowerCase();
    setUsuarios((prev) =>
      prev.some(
        (u) =>
          u.id === nuevo.id ||
          (em(u.correo) !== "" && em(u.correo) === em(nuevo.correo)),
      )
        ? prev
        : [...prev, nuevo],
    );
  };

  /** §1 — Al registrar una venta desde el panel, el cliente se crea (o se le
      suma un pedido) ANTES de guardar la venta. Reglas:
      - Ya existe como cliente → +1 pedido, sin tocar el nombre.
      - Existe solo como usuario o empleado → no se crea nada nuevo.
      - No existe en ningún lado → Cliente nuevo (correo vacío, que después
        se completa en el registro público). */
  const registrarClienteVenta = (
    datos: { tipoDocumento: string; numeroDocumento: string; nombre: string },
  ): "creado" | "existente" => {
    const tipo = datos.tipoDocumento.trim();
    const numero = datos.numeroDocumento.trim();
    const clave = `${tipo.toLowerCase()}||${numero}`;
    const mismaClave = (c: { tipoDocumento?: string; numeroDocumento?: string }) =>
      `${(c.tipoDocumento ?? "").trim().toLowerCase()}||${(c.numeroDocumento ?? "").trim()}` === clave;

    if (clientes.some(mismaClave)) {
      setClientes((prev) =>
        prev.map((c) => (mismaClave(c) ? { ...c, pedidos: c.pedidos + 1 } : c)),
      );
      return "existente";
    }
    if (usuariosUnificados.some(mismaClave)) return "existente";

    const nombre = datos.nombre.trim();
    const iniciales = nombre
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
    setClientes((prev) => {
      const maxNum = prev.reduce(
        (max, c) => Math.max(max, parseInt(c.id.replace("CLI-", "")) || 0),
        0,
      );
      return [
        {
          id: `CLI-${String(maxNum + 1).padStart(3, "0")}`,
          nombre,
          iniciales,
          avatarColor: AVATAR_PALETTE[prev.length % AVATAR_PALETTE.length],
          correo: "",
          tipoDocumento: tipo,
          numeroDocumento: numero,
          pedidos: 1,
          activo: true,
        },
        ...prev,
      ];
    });
    return "creado";
  };

  const handleLogin = (user: Usuario): { ok: boolean; mensaje?: string } => {
    // Cruce canónico Usuario ↔ Empleado: documento.
    const claveCuenta = clavePersona(user.tipoDocumento, user.numeroDocumento, user.correo);
    const empleado = empleados.find(e => clavePersona(e.tipoDocumento, e.numeroDocumento, e.correo) === claveCuenta) ?? null;
    const rolIdsCuenta = (empleado?.rolIds?.length ? empleado.rolIds : (user.rolIds?.length ? user.rolIds : [user.rolId])).filter(Boolean);
    const rolesActivos: Rol[] = [];
    const visto = new Set<string>();
    for (const id of rolIdsCuenta) {
      const r = roles.find(rr => rr.id === id && rr.activo) ?? null;
      if (r && !visto.has(r.id)) { visto.add(r.id); rolesActivos.push(r); }
    }
    // Cliente público: solo el rol Cliente y sin ficha de empleado → landing
    // (portal público, nunca el panel).
    const esClientePublico = rolesActivos.length > 0 && rolesActivos.every(esRolCliente) && empleado === null;

    if (!esClientePublico) {
      if (rolesActivos.length === 0) {
        return { ok: false, mensaje: "Tu cuenta no tiene roles activos. Contacta al administrador." };
      }
      // El bloqueo "sin pantallas" ya NO aplica: Inicio siempre está disponible
      // para cualquiera con cuenta válida. El bloqueo restante es por cuenta
      // inactiva o rol base Empleado inactivo.
      const empleadoInactivo = !!empleado ? !empleado.activo : !user.activo;
      const rolEmpleadoInactivo = roles.some(
        r => normalizarNombreRol(r.nombre) === "empleado" && !r.activo,
      );
      if (empleadoInactivo || rolEmpleadoInactivo) {
        return { ok: false, mensaje: "Tu cuenta no tiene roles activos. Contacta al administrador." };
      }
    }

    setIsLoggedIn(true);
    setLoginNotice(false);
    setLoginEmailPre("");

    const orderToResume = pendingOrder;
    if (orderToResume) {
      // El nombre que queda registrado es el del invitado (si lo
      // llegó a escribir) o el de la cuenta que inicia sesión.
      const nombrePedido = orderToResume.nombre?.trim() || user.nombre;
      const idVenta = registrarPedido(
        orderToResume.metodoPago,
        orderToResume.comprobante,
        orderToResume.items,
        orderToResume.horaRecogida,
        nombrePedido,
        orderToResume.documento,
      );
      setCart([]);
      // Confirmación como objeto (no solo la hora) para que la
      // pantalla del carrito muestre exactamente lo mismo que tras
      // un pedido normal: número, productos, cliente y recogida.
      setOrderConfirmation({
        id: idVenta,
        hora: hora12(orderToResume.horaRecogida),
        nombre: nombrePedido,
        documento: orderToResume.documento?.trim(),
        items: orderToResume.items,
        total: orderToResume.items.reduce(
          (s, i) => s + (i.sizePrice + i.extrasPrice) * i.quantity,
          0,
        ),
      });
      window.setTimeout(() => {
        setPendingOrder(null);
        navigate("cart");
      }, 0);
    }

    setLoggedInUserId(user.id);
    const guardado = leerCarritosDeUsuarios()[user.id] ?? [];
    setCart((prev) => fusionarCarritos(prev, guardado));

    // Rol activo inicial: el ÚLTIMO ROL EXTRA usado guardado en localStorage,
    // si sigue asignado y activo; si no, el primer rol extra; si no hay extras,
    // el rol base "Empleado".
    const baseEs = (n: string) => {
      const x = normalizarNombreRol(n);
      return x === "administrador" || x === "cliente" || x === "empleado";
    };
    const rolesExtra = rolesActivos.filter(r => !baseEs(r.nombre));
    const rolEmpleadoActivo = rolesActivos.find(r => normalizarNombreRol(r.nombre) === "empleado") ?? null;
    const guardadoRolId = leerRolActivo(user.id);
    let rolInicial: Rol | null = null;
    if (esClientePublico) {
      rolInicial = rolesActivos.find(r => normalizarNombreRol(r.nombre) === "cliente") ?? rolesActivos[0] ?? null;
    } else {
      if (guardadoRolId) {
        const cand = rolesActivos.find(r => r.id === guardadoRolId);
        if (cand && !baseEs(cand.nombre) && cand.activo) rolInicial = cand;
      }
      if (!rolInicial) rolInicial = rolesExtra[0] ?? rolEmpleadoActivo ?? rolesActivos[0] ?? null;
    }
    const inicialId = rolInicial?.id ?? null;
    setRolActivoId(inicialId);
    escribirRolActivo(user.id, inicialId);
    const nextRole = rolInicial?.nombre ?? "Empleado";
    // P9: el cliente público SIEMPRE cae en la landing; un empleado NUNCA:
    // Dashboard solo si la sesión es super admin o el rol activo tiene el
    // permiso "Dashboard::Dashboard"; si no, "Inicio" (siempre disponible).
    const userEsSuperAdmin =
      user.id === "USR-001" || user.correo.trim().toLowerCase() === "gloria@lasirena.com";
    const hasDashRolInicial =
      userEsSuperAdmin || !!(rolInicial && rolInicial.accesos[DASHBOARD_PERM_KEY]?.includes("Ver"));
    const nextScreen = esClientePublico
      ? "landing"
      : hasDashRolInicial
        ? "dashboard"
        : "inicio";

    setUserRole(nextRole);
    if (!orderToResume) {
      navigate(nextScreen);
    }
    return { ok: true };
  };

  const quickAdd = (product: Product) => {
    const size = sizeDe(product, 0);
    setCart((prev) => {
      const existing = prev.find(
        (i) =>
          i.product.id === product.id &&
          i.selectedExtras.length === 0,
      );
      if (existing) {
        return prev.map((i) =>
          i.id === existing.id
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [
        ...prev,
        {
          id: `${product.id}-${Date.now()}`,
          product,
          quantity: 1,
          size: size.label,
          sizePrice: size.price,
          selectedExtras: [],
          extrasPrice: 0,
        },
      ];
    });
  };

  // Punto 2.4: agregar desde el detalle acumulaba unidades en líneas separadas
  // aunque el producto, el tamaño y los extras fueran idénticos (quickAdd y
  // fusionarCarritos ya lo hacían). Se reutiliza `mismaConfig`: si la misma
  // configuración ya está en el carrito, se suman las unidades a esa línea (la
  // primera que entró); si no, se agrega al final.
  const addDetailed = (item: CartItem) =>
    setCart((p) => {
      const i = p.findIndex((x) => mismaConfig(x, item));
      if (i === -1) return [...p, item];
      return p.map((x, idx) =>
        idx === i
          ? { ...x, quantity: x.quantity + item.quantity }
          : x,
      );
    });

  const registrarPedido = (
    metodoPago: string,
    comprobante: string,
    items: CartItem[],
    horaRecogida: string,
    clienteNombre?: string,
    clienteDocumento?: string,
    clienteTelefono?: string,
  ): string => {
    // ID único (punto C1): el generador ÚNICO es `siguienteIdVenta`, que
    // devuelve el siguiente numérico canónico ("10", "11", …) contra los ids
    // reales existentes (no contra el largo de la lista, que se desincroniza
    // si se borra o se importa una venta).
    const newVenta: Venta = {
      id: siguienteIdVenta(ventas),
      usuario: clienteNombre?.trim() || pedidosUsuarioNombre,
      documento: clienteDocumento?.trim() || undefined,
      telefono: clienteTelefono?.trim() || undefined,
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
      // Se guarda ya en formato 12 h ("6:30 p. m."): así todas las pantallas
      // muestran la recogida igual, sin depender del locale del navegador.
      horaRecogida: hora12(horaRecogida),
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
        tamaño: i.size,
        // El id del producto del catálogo de Productos. Se guarda para que la
        // Orden de Producción no tenga que deducir el producto del nombre
        // ("Pizza Peperoni — Mediana"); si el nombre no está en el catálogo
        // queda sin id y se resuelve por nombre.
        productoId: productos.find((p) => normalizarNombre(p.nombre) === normalizarNombre(i.product.name))?.id,
      })),
    };
    setVentas((prev) => [newVenta, ...prev]);
    return newVenta.id;
  };

  /** El cliente envía el comprobante del dinero faltante: se agrega a la venta
      como segundo comprobante (tipo "faltante") y la venta vuelve a estado
      "Por verificar" para que el admin la revise otra vez. */
  const completarFaltante = (ventaId: string, comprobanteUrl: string) => {
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString("en-CA");
    const hora = ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    setVentas((prev) =>
      prev.map((v) => {
        if (v.id !== ventaId) return v;
        const base = comprobantesDe(v);
        const nuevo: ComprobanteVenta = { url: comprobanteUrl, tipo: "faltante", fecha, hora };
        return {
          ...v,
          estado: "por-verificar" as VentaStatus,
          comprobantes: [...base, nuevo],
          // `comprobante` se conserva apuntando al pago inicial (compatibilidad
          // con vistas viejas que solo leen ese campo).
          comprobante: base[0]?.url ?? v.comprobante,
          historial: [...(v.historial ?? []), { estado: "por-verificar" as VentaStatus, hora }],
        };
      }),
    );
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
  /** Cierra la sesión.
   *
   * `silenciarAviso` evita el toast "Has cerrado sesión correctamente" cuando
   * el cierre es un paso interno (p. ej. tras cambiar la contraseña, donde el
   * aviso es otro y dos toasts seguidos solo enredan).
   * `aviso` permite reemplazar el mensaje de cierre (p. ej. inactividad).
   * `destino` permite ir directo a "login" sin pasar por la landing. */
  const logout = async (opciones?: {
    silenciarAviso?: boolean;
    aviso?: string;
    destino?: Screen;
  }) => {
    const silenciarAviso = opciones?.silenciarAviso ?? false;
    const aviso = opciones?.aviso ?? "Has cerrado sesión correctamente";
    const destino: Screen = opciones?.destino ?? "landing";
    try {
      const endpoint = import.meta.env.VITE_AUTH_LOGOUT_URL;
      if (endpoint) {
        await fetch(endpoint, { method: "POST", credentials: "include" });
      }
    } catch {
      // La sesión local debe cerrarse aunque el servidor no responda.
    } finally {
      clearAuthStorage();
      borrarToken();
      borrarSesionGuardada();
      setIsLoggedIn(false);
      setUserRole("");
      setLoggedInUserId(null);
      setRolActivoId(null);
      navigate(destino, { replace: true });
      if (!silenciarAviso) {
        toast.success(aviso);
      }
    }
  };

  /** Refresca el perfil del usuario de la sesión desde GET /auth/me y hace
   *  merge en la lista local `usuarios` (nombre, correo, teléfono, tipo y
   *  número de documento). Se usa al restaurar la sesión (F5) y al entrar a
   *  las pantallas de perfil: así el teléfono y el documento no dependen de
   *  lo que haya quedado en el estado local. */
  const [perfilEstado, setPerfilEstado] = useState<"idle" | "cargando" | "error">("idle");
  const [perfilErrorMsg, setPerfilErrorMsg] = useState<string | null>(null);

  const refrescarPerfil = async () => {
    if (!obtenerToken() || !loggedInUserId) return;
    setPerfilEstado("cargando");
    try {
      const perfil = await obtenerPerfil();
      const id = String(perfil.id);
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                nombre: perfil.nombre || u.nombre,
                correo: (perfil.correo || u.correo).trim().toLowerCase(),
                telefono: perfil.telefono || u.telefono,
                tipoDocumento: perfil.tipoDocumento || u.tipoDocumento,
                numeroDocumento: perfil.numeroDocumento || u.numeroDocumento,
              }
            : u,
        ),
      );
      setPerfilEstado("idle");
      setPerfilErrorMsg(null);
    } catch (error) {
      setPerfilEstado("error");
      setPerfilErrorMsg(
        error instanceof Error
          ? `No pudimos cargar tu información del servidor: ${error.message}`
          : "No pudimos cargar tu información del servidor. Inténtalo de nuevo.",
      );
    }
  };

  /** Guarda SOLO correo y teléfono contra PUT /auth/perfil y actualiza la
   *  lista local con la respuesta del servidor. */
  const guardarPerfilBackend = async (datos: {
    correo: string;
    telefono: string;
  }): Promise<{ ok: boolean; campo?: "correo" | "telefono" | "general"; mensaje?: string }> => {
    try {
      const perfil = await actualizarPerfil(datos);
      const id = String(perfil.id);
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                correo: (perfil.correo || datos.correo).trim().toLowerCase(),
                telefono: perfil.telefono || datos.telefono,
              }
            : u,
        ),
      );
      return { ok: true };
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : "No se pudo guardar el perfil.";
      const status = (error as { status?: number }).status;
      // 409 = correo ya registrado (lo dice el backend para el campo correo).
      if (status === 409 || /correo/i.test(mensaje)) {
        return { ok: false, campo: "correo", mensaje };
      }
      return { ok: false, campo: "general", mensaje };
    }
  };

  /** Refresca el perfil al restaurar la sesión (F5) y cada vez que se entra a
   *  una pantalla de perfil. El estado de carga/error lo pintan las pantallas. */
  useEffect(() => {
    if (!isLoggedIn || !loggedInUserId) return;
    if (
      screen === "client-profile" ||
      screen === "store-profile" ||
      screen === "profile"
    ) {
      void refrescarPerfil();
    }
  }, [screen, isLoggedIn, loggedInUserId]);

  useEffect(() => {
    if (sesionActiva && obtenerToken() && loggedInUserId) {
      void refrescarPerfil();
    }
    // Solo al montar la app: la sesión de arranque es la del F5.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Final del cambio de contraseña desde "Mi perfil": aviso, cierre de
   *  sesión con la MISMA función del botón "Cerrar sesión" (el carrito se
   *  conserva) y llegada a "Iniciar sesión" con el correo ya escrito. */
  const trasCambiarContrasena = async (correo: string) => {
    toast.success(
      "Contraseña actualizada. Inicia sesión con tu nueva contraseña.",
    );
    // El correo se fija ANTES de navegar: si se hiciera después, LoginScreen
    // ya se habría montado con `initialEmail` vacío y `useState` no lo tomaría.
    setLoginEmailPre(correo);
    await logout({ silenciarAviso: true, destino: "login" });
  };

  const isAuth = screen === "login" || screen === "register";

  useEffect(() => {
    if (isLoggedIn && !hasValidSession && !pendingOrder) void logout();
  }, [isLoggedIn, hasValidSession, pendingOrder]);

  // ── Sesión persistente y cierre por inactividad ─────────────────────
  // Marca de tiempo de la última actividad del usuario (mouse, tecla, clic,
  // scroll o toque). Vive en un ref para no re-renderizar en cada evento.
  const ultimaActividadRef = useRef<number>(
    sesionActiva?.ultimaActividad ?? Date.now(),
  );

  // Aviso si la sesión se borró por haber pasado más de 15 min sin actividad.
  useEffect(() => {
    if (sesionArranque.estado === "expirada") {
      toast("Tu sesión se cerró por inactividad");
    }
  }, [sesionArranque.estado]);

  // Persiste la sesión (usuario + rol activo + pantalla) mientras haya login.
  // Al cerrar sesión, `logout` ya borra la clave.
  useEffect(() => {
    if (!isLoggedIn || !loggedInUserId) return;
    escribirSesionGuardada({
      userId: loggedInUserId,
      rolActivo: rolActivoId,
      screen,
      ultimaActividad: ultimaActividadRef.current,
    });
  }, [isLoggedIn, loggedInUserId, rolActivoId, screen]);

  // Inactividad: escucha de eventos de actividad con throttle (máx. una vez
  // cada 30 s) y un intervalo que revisa cada 30 s si pasaron 15 min. Usa refs
  // para no depender de valores que cambian en cada render (si no, el intervalo
  // se re-crearía sin cesar y nunca detectaría la inactividad).
  const logoutRef = useRef(logout);
  useEffect(() => {
    logoutRef.current = logout;
  });
  const sesionActualRef = useRef({ loggedInUserId, rolActivoId, screen });
  useEffect(() => {
    sesionActualRef.current = { loggedInUserId, rolActivoId, screen };
  }, [loggedInUserId, rolActivoId, screen]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const registrarActividad = () => {
      const ahora = Date.now();
      if (ahora - ultimaActividadRef.current < ACTIVIDAD_THROTTLE_MS) return;
      ultimaActividadRef.current = ahora;
      // Mantener viva la sesión en localStorage (valor compartido entre
      // pestañas) para que la actividad de esta alimente el chequeo global.
      const { loggedInUserId: uid, rolActivoId: rid, screen: scr } = sesionActualRef.current;
      if (uid) {
        escribirSesionGuardada({
          userId: uid,
          rolActivo: rid,
          screen: scr,
          ultimaActividad: ahora,
        });
      }
    };

    const eventos: (keyof WindowEventMap)[] = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];
    for (const ev of eventos) window.addEventListener(ev, registrarActividad, { passive: true });

    const intervalo = window.setInterval(() => {
      // Revisar la marca guardada (que otras pestañas pudieron refrescar).
      const guardada = leerSesionGuardada();
      const ultima = Math.max(
        ultimaActividadRef.current,
        guardada?.ultimaActividad ?? 0,
      );
      if (Date.now() - ultima >= INACTIVIDAD_MS) {
        void logoutRef.current({ silenciarAviso: true, aviso: "Tu sesión se cerró por inactividad" });
      }
    }, 30 * 1000);

    return () => {
      for (const ev of eventos) window.removeEventListener(ev, registrarActividad);
      window.clearInterval(intervalo);
    };
  }, [isLoggedIn]);

  // Sincronización entre pestañas: cerrar sesión en una la cierra en todas, y
  // la actividad de otra pestaña mantiene viva la de esta.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SESION_STORAGE_KEY) return;
      if (e.newValue === null) {
        // Otra pestaña cerró sesión.
        if (isLoggedIn) void logoutRef.current({ silenciarAviso: true, aviso: "Se cerró la sesión en otra pestaña" });
        return;
      }
      // Otra pestaña refrescó la actividad: adoptar la marca más reciente.
      try {
        const s = JSON.parse(e.newValue) as SesionGuardada;
        if (typeof s.ultimaActividad === "number" && s.ultimaActividad > ultimaActividadRef.current) {
          ultimaActividadRef.current = s.ultimaActividad;
        }
      } catch {
        // Dato corrupto: se ignora.
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isLoggedIn]);

  // La confirmación de pedido solo vive mientras se ve el carrito:
  // antes se asignaba (en el login y al enviar) y jamás se limpiaba,
  // así que volver al carrito después de un pedido volvía a mostrar
  // "¡Pedido recibido!". Al cambiar de pantalla se borra; los botones
  // de la propia confirmación también la limpian antes de navegar.
  useEffect(() => {
    if (screen !== "cart") setOrderConfirmation(null);
  }, [screen]);

  // P9 — guard de rutas del panel: un cliente público (`esClientePublico`) NO
  // es `isAdminRole`, así que si de algún modo aterriza en una pantalla del
  // panel (`ADMIN_SCREENS`, que cubre todos los módulos del back-office) se le
  // manda de vuelta a la landing. Lo mismo aplica a una sesión inválida. El
  // rol "Cliente" solo da acceso al portal público (landing / catálogo /
  // mis-pedidos), nunca al panel.
  if (
    (!hasValidSession || !isAdminRole) &&
    ADMIN_SCREENS.includes(screen)
  ) {
    setTimeout(() => navigate("landing", { replace: true }), 0);
  }

  // "Mis pedidos" requiere sesión válida. Antes este guard navegaba
  // desde el render (setTimeout dentro del cuerpo del componente);
  // ahora corre como efecto, después de pintar. Un cliente logueado
  // (rol "Cliente" o con ficha en usuarios) tiene sesión válida y
  // NO es redirigido a la landing.
  useEffect(() => {
    if (!hasValidSession && screen === "mis-pedidos") {
      navigate("landing", { replace: true });
    }
  }, [hasValidSession, screen, navigate]);

  // Dashboard and Inicio are mutually exclusive landing screens. Other admin
  // screens remain protected by their module permission below.
  if (isLoggedIn && isAdminRole && screen === "dashboard" && !hasDashboardAccess) {
    setTimeout(() => navigate("inicio"), 0);
  }
  if (isLoggedIn && isAdminRole && screen === "inicio" && hasDashboardAccess) {
    setTimeout(() => navigate("dashboard"), 0);
  }
  // El detalle de la gráfica (sales-chart) forma parte del Dashboard: solo lo
  // abre quien tiene el permiso Dashboard (o la super admin); si otro rol
  // llega ahí, se le devuelve a "inicio".
  if (isLoggedIn && isAdminRole && screen === "sales-chart" && !hasDashboardAccess) {
    setTimeout(() => navigate("inicio"), 0);
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
    ? esMovil
      ? ""
      : menuAbierto
        ? "ml-60"
        : "ml-0"
    : "";

  const isLockedScreen = isAdmin && (
    screen === "clientes" || screen === "users" || screen === "empleados" ||
    // Módulo de Compra / Orden de Compra: ocupa el viewport y scrollea por dentro
    screen === "orden-compra" || screen === "nueva-orden-compra" ||
    screen === "recepcion-compra" || screen === "gestion-compra" ||
    screen === "nueva-compra" || screen === "orden-detalle" ||
    // Proveedores: ocupa el viewport y sin scroll de página (la tabla se
    // pagina en bloques de 5 en vez de crecer hasta hacer scroll).
    screen === "suppliers"
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
          // Todas las alertas del sistema (landing y panel) duran 2 segundos.
          duration: 2000,
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
          abierto={esMovil ? sidebarMovilAbierto : menuAbierto}
          onClose={() => {
            setMenuAbierto(false);
            setTimeout(() => menuButtonRef.current?.focus(), 0);
          }}
          darkMode={darkMode}
           userRole={userRole}
           accesos={loggedInAccesos}
          isNamedAdmin={isNamedAdmin}
          hasDashboardAccess={hasDashboardAccess}
          esMovil={esMovil}
          onCerrarMovil={() => {
            setSidebarMovilAbierto(false);
            setTimeout(() => menuButtonRef.current?.focus(), 0);
          }}
          firstNavRef={firstNavRef}
        />
      )}

      <div
        className={`transition-[margin] duration-200 motion-reduce:transition-none ${sideW} flex flex-col min-h-screen${isLockedScreen ? " h-dvh min-h-dvh overflow-hidden" : ""}`}
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
            onToggleSidebar={() => {
              if (esMovil) {
                if (!sidebarMovilAbierto) {
                  setSidebarMovilAbierto(true);
                  requestAnimationFrame(() => firstNavRef.current?.focus());
                } else {
                  setSidebarMovilAbierto(false);
                }
              } else if (!menuAbierto) {
                setMenuAbierto(true);
                requestAnimationFrame(() => firstNavRef.current?.focus());
              } else {
                setMenuAbierto(false);
              }
            }}
            menuVisible={esMovil ? sidebarMovilAbierto : menuAbierto}
            menuButtonRef={menuButtonRef}
            navigate={navigate}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            userName={loggedInUserName}
            roleName={loggedInRoleName}
            homeScreen={adminHomeScreen}
            rolesParaCambiar={rolesParaCambiar}
            onCambiarRol={isStaff ? cambiarRolActivo : undefined}
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
            isLockedScreen ? " overflow-y-auto" : "",
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
              <LandingErrorBoundary resetKey={screen}>
              {screen === "landing" && (
                <LandingScreen
                  navigate={navigate}
                  setProduct={setSelectedProduct}
                  onCategoryNavigate={(cat) => {
                    setCatalogCat(cat);
                    navigate("catalog");
                  }}
                  categorias={categorias}
                  productos={productos}
                  onOpenDetail={(p) => {
                    setDetalleOrigen("landing");
                    setSelectedProduct(p);
                    navigate("product-detail");
                  }}
                />
              )}
              {screen === "catalog" && (
                <CatalogScreen
                  navigate={navigate}
                  setProduct={setSelectedProduct}
                  quickAdd={quickAdd}
                  initialCat={catalogCat}
                  page={catalogPage}
                  setPage={setCatalogPage}
                  search={catalogSearch}
                  setSearch={setCatalogSearch}
                  onOpenDetail={(p) => {
                    setDetalleOrigen("catalog");
                    setSelectedProduct(p);
                    navigate("product-detail");
                  }}
                  cart={cart}
                  updateQty={updateQty}
                  categorias={categorias}
                  productos={productos
                    // Un producto "Descontinuado" no aparece en el catálogo
                    // público; "No disponible" sí aparece pero no se puede
                    // agregar (el botón queda deshabilitado en ProductCard).
                    .filter((p) => p.estado !== "Descontinuado")
                    .map((p) => ({
                    id: parseInt(p.id.replace("PROD-", ""), 10) || 0,
                    name: p.nombre,
                    description: DESCRIPCIONES[p.nombre] ?? "",
                    price: p.precioUnitario,
                    idCategoria: p.idCategoria,
                    image: IMAGENES_PIZZA[p.nombre] || p.imagen || "https://images.unsplash.com/photo-1564936281403-5cc7543df8e2?w=600&h=600&fit=crop",
                    category: nombreCategoria(p.idCategoria, categorias),
                    sizes: sizesDeProducto(p),
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
                  onBack={() => {
                    navigate(detalleOrigen, { restaurar: true });
                    // Al volver al catálogo, hace scroll a la tarjeta del producto
                    // que se abrió (data-producto-id en ProductCard). Mismo criterio
                    // de reintentos que `navigate(restaurar)`: la tarjeta tarda en
                    // montarse por la transición de salida (AnimatePresence).
                    if (detalleOrigen === "catalog") {
                      let intentosCard = 0;
                      const buscarTarjeta = () => {
                        intentosCard += 1;
                        const el = document.querySelector(`[data-producto-id="${selectedProduct.id}"]`);
                        if (!el) {
                          // Mismo presupuesto amplio que `navigate(restaurar)`:
                          // la tarjeta tarda en montarse por la transición de
                          // salida (AnimatePresence) y en aparecer las imágenes.
                          if (intentosCard < 40) window.setTimeout(buscarTarjeta, 50);
                          return;
                        }
                        el.scrollIntoView({ block: "center" });
                      };
                      requestAnimationFrame(buscarTarjeta);
                    }
                  }}
                  backLabel={detalleOrigen === "catalog" ? "Volver al menú" : "Volver al inicio"}
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
                  confirmationData={orderConfirmation ?? undefined}
                  onClearConfirmation={() => setOrderConfirmation(null)}
                  clienteSesion={loggedInUser?.nombre}
                />
              )}
              {screen === "mis-pedidos" && (
                <MisPedidosScreen
                  pedidos={ventas}
                  usuarioNombre={pedidosUsuarioNombre}
                  onVerMenu={() => navigate("catalog")}
                  onCompletarFaltante={completarFaltante}
                />
              )}
              {screen === "login" && (
                  <LoginScreen
                    navigate={navigate}
                    usuarios={usuarios}
                    roles={roles}
                    onUsuarioNuevo={agregarUsuarioLocal}
                    darkMode={darkMode}
                    loginNotice={loginNotice}
                    initialEmail={loginEmailPre}
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
                  setClientes={setClientes}
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
                  onGuardarPerfil={guardarPerfilBackend}
                  onPasswordSaved={trasCambiarContrasena}
                  perfilCargando={perfilEstado === "cargando"}
                  perfilError={perfilEstado === "error" ? perfilErrorMsg : null}
                  onReintentarPerfil={() => void refrescarPerfil()}
                />
              )}
              {((screen === "dashboard" && hasDashboardAccess) || (screen === "inicio" && !hasDashboardAccess)) && (
                <DashboardScreen
                  navigate={navigate}
                  ventas={ventas}
                  gestiones={gestiones}
                  ordenes={ordenes}
                  noConformidades={noConformidades}
                  productos={productos}
                  insumos={insumos}
                  proveedores={proveedores}
                  ordenesProduccion={ordenesProduccion}
                  clientes={clientes}
                  loggedInUser={loggedInUser}
                  loggedInRoleName={loggedInRoleName}
                  tieneRolActivo={loggedInRol !== null}
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
                  insumos={insumos}
                  productos={productos}
                  ordenesProduccion={ordenesProduccion}
                  noConformidades={noConformidades}
                  setNoConformidades={setNoConformidades}
                  // P17b: el descuento de stock al registrar un producto no
                  // conforme necesita poder escribir en el inventario de
                  // productos (sin esto el descuento es no-op).
                  setProductos={setProductos}
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
                  // Punto 3.2: el modal que abre este listado necesita el
                  // catálogo para buscar por tipo "Producto".
                  productos={productos}
                  onAbrirRecepcion={(orden) => {
                    setOrdenRecepcion(orden);
                    setScreen("recepcion-compra");
                  }}
                  onNuevaOrden={() => {
                    setOrdenAEditar(null);
                    navigate("nueva-orden-compra");
                  }}
                  onEditarOrden={(orden) => {
                    setOrdenAEditar(orden);
                    navigate("nueva-orden-compra");
                  }}
                  page={ordenCompraPage}
                  setPage={setOrdenCompraPage}
                  onVerDetalle={(orden) => {
                    setOrdenDetalle(orden);
                    setScreen("orden-detalle");
                  }}
                />
              )}
              {/* Nueva Orden de Compra: PANTALLA COMPLETA dentro del panel
                  (igual que Recepción y Ver detalle), sin modal y sin scroll
                  de página. El listado queda desmontado mientras se crea. */}
              {screen === "nueva-orden-compra" && (
                <NuevaOrdenCompraPage
                  ordenes={ordenes}
                  setOrdenes={setOrdenes}
                  proveedores={proveedores}
                  setProveedores={setProveedores}
                  insumos={insumos}
                  productos={productos}
                  setInsumos={setInsumos}
                  onBack={() => {
                    setOrdenAEditar(null);
                    navigate("orden-compra");
                  }}
                  orden={ordenAEditar}
                />
              )}
              {screen === "recepcion-compra" && ordenRecepcion && (
                <RecepcionCompraScreen
                  orden={ordenRecepcion}
                  insumos={insumos}
                  setInsumos={setInsumos}
                  gestiones={gestiones}
                  setGestiones={setGestiones}
                  proveedores={proveedores}
                  onGuardar={(recepcion, estado) => {
                    setOrdenes((prev) =>
                      prev.map((o) => {
                        if (o.id !== ordenRecepcion.id) return o;
                        const base = { ...o, estado, recepcion };
                        // Deja fecha y hora del cambio: es la que muestra el
                        // detalle de la orden al lado del badge de estado.
                        return estado === o.estado
                          ? base
                          : {
                              ...base,
                              historialEstados: [
                                ...(o.historialEstados ?? []),
                                { estado, fechaHora: new Date().toISOString() },
                              ],
                            };
                      })
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
                  onEditar={() => {}}
                  onAbrirRecepcion={() => {}}
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
                  // Control de inventario: al anular una compra hay que
                  // devolver al stock lo que ella sumó (productos incluidos).
                  productos={productos}
                  setInsumos={setInsumos}
                  setProductos={setProductos}
                  onNuevaCompra={() => navigate("nueva-compra")}
                />
              )}
              {/* Nueva Compra: PANTALLA COMPLETA dentro del panel (igual que
                  Recepción), sin modal y sin scroll de página. */}
              {screen === "nueva-compra" && (
                <NuevaCompraPage
                  gestiones={gestiones}
                  setGestiones={setGestiones}
                  proveedores={proveedores}
                  setProveedores={setProveedores}
                  insumos={insumos}
                  productos={productos}
                  // Al guardar, los ítems comprados suman su stock (son
                  // opcionales: sin ellos la compra se guarda igual).
                  setInsumos={setInsumos}
                  setProductos={setProductos}
                  onBack={() => navigate("gestion-compra")}
                />
              )}
              {screen === "suppliers" && (
                <SuppliersScreen
                  {...getPerms("suppliers")}
                  ordenes={ordenes}
                  gestiones={gestiones}
                  proveedores={proveedores}
                  setProveedores={setProveedores}
                />
              )}
              {screen === "ventas-pedidos" && (
                <VentasScreen
                  {...getPerms("ventas-pedidos")}
                  pedidos={ventas}
                  setPedidos={setVentas}
                  productos={productosMenu}
                  clientes={clientes}
                  usuarios={usuariosUnificados}
                  empleados={empleados}
                  onRegistrarClienteVenta={registrarClienteVenta}
                  onGestionarDevolucion={abrirGestionDevolucion}
                />
              )}
              {screen === "devoluciones" && (
                <DevolucionesScreen
                  pedidos={ventas}
                  setPedidos={setVentas}
                  productos={productos}
                  setProductos={setProductos}
                  ordenes={ordenesProduccion}
                  setOrdenes={setOrdenesProduccion}
                  fichasPorProducto={fichasPorProducto}
                  insumos={insumos}
                  categorias={categorias}
                  abrirDevolucionId={devolucionAAbrir}
                  onAbierta={() => setDevolucionAAbrir(null)}
                />
              )}
              {screen === "gestion-productos" && (
                <GestionProductosScreen
                  {...getPerms("gestion-productos")}
                  productos={productos}
                  setProductos={setProductos}
                  insumos={insumos}
                  fichas={fichasPorProducto}
                  setFichas={setFichasPorProducto}
                  categorias={categorias}
                />
              )}
              {screen === "cat-producto" && (
                <CategoriaProductoScreen
                  categorias={categorias}
                  setCategorias={setCategorias}
                  {...getPerms("cat-producto")}
                />
              )}
               {screen === "gestion-roles" && (
                <GestionConfigScreen
                  userRole={userRole}
                  roles={roles}
                  setRoles={setRoles}
                  rolUserCounts={(() => {
                    const counts: Record<string, number> = {};
                    const sumar = (id: string) => { counts[id] = (counts[id] ?? 0) + 1; };
                    empleados.forEach(e => e.rolIds.forEach(sumar));
                    usuariosUnificados.forEach(u => {
                      // Los que YA tienen ficha ya se contaron por empleado: solo
                      // cuentan los que NO tienen (rol personalizado, cliente, etc.).
                      const tieneFicha = empleados.some(e =>
                        clavePersona(e.tipoDocumento, e.numeroDocumento, e.correo) ===
                        clavePersona(u.tipoDocumento, u.numeroDocumento, u.correo),
                      );
                      if (tieneFicha) return;
                      const ids = u.rolIds?.length ? u.rolIds : [u.rolId];
                      ids.forEach(sumar);
                    });
                    return counts;
                  })()}
                  canVer={isNamedAdmin || (loggedInAccesos[KEY("Configuración","Roles")] ?? []).includes("Ver")}
                  canCreate={getPerms("gestion-roles").canCreate}
                  canEdit={getPerms("gestion-roles").canEdit}
                  canDelete={getPerms("gestion-roles").canDelete}
                  accesosPropios={loggedInAccesos}
                  loggedInRolId={loggedInRol?.id ?? null}
                  usuarios={usuariosUnificados}
                />
              )}
              {screen === "sales-chart" && (
                <SalesChartScreen
                  ventas={ventas}
                  gestiones={gestiones}
                  ordenes={ordenes}
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
                  roles={roles}
                  sesionCorreo={correoSesion}
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
                  setClientes={setClientes}
                  canVer={isNamedAdmin || (loggedInAccesos[KEY("Configuración","Usuarios")] ?? []).includes("Ver")}
                  canCreate={getPerms("users").canCreate}
                  canEdit={getPerms("users").canEdit}
                  canDelete={getPerms("users").canDelete}
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
                  insumos={insumos}
                  setInsumos={setInsumos}
                  ventas={ventas}
                  fichasPorProducto={fichasPorProducto}
                  ordenes={ordenesProduccion}
                  setOrdenes={setOrdenesProduccion}
                  noConformidades={noConformidades}
                  setNoConformidades={setNoConformidades}
                  // Punto C2: al completarse la orden de producción de una
                  // venta, ésta sale de cocina y pasa a "venta" ("Por
                  // entregar"); recién ahí la cierra el botón "Entregar" o la
                  // hora de recogida (§13). La transición se valida contra la
                  // tabla de `estadosVenta.ts`.
                  onVentaLista={(ventaId) => {
                    setVentas((prev) =>
                      prev.map((v) => {
                        if (v.id !== ventaId || !puedeTransicionar(v.estado, "venta")) return v;
                        const hora = new Date().toLocaleTimeString("es-CO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        return {
                          ...v,
                          estado: "venta" as VentaStatus,
                          historial: [
                            ...(v.historial ?? []),
                            { estado: "venta" as VentaStatus, hora },
                          ],
                        };
                      }),
                    );
                    toast.success(`Pedido ${ventaId} listo para recoger`);
                  }}
                  abrirOrdenId={ordenAAbrir}
                  setOrdenAAbrir={setOrdenAAbrir}
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
                  onGuardarPerfil={guardarPerfilBackend}
                  onPasswordSaved={trasCambiarContrasena}
                  perfilCargando={perfilEstado === "cargando"}
                  perfilError={perfilEstado === "error" ? perfilErrorMsg : null}
                  onReintentarPerfil={() => void refrescarPerfil()}
                  contrataciones={loggedInEmpleado?.contrataciones}
                  rolNombreDe={(rolId) => roles.find(r => r.id === rolId)?.nombre ?? rolId}
                  rolesParaCambiar={rolesParaCambiar}
                  onCambiarRol={cambiarRolActivo}
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
                  onGuardarPerfil={guardarPerfilBackend}
                  onPasswordSaved={trasCambiarContrasena}
                  perfilCargando={perfilEstado === "cargando"}
                  perfilError={perfilEstado === "error" ? perfilErrorMsg : null}
                  onReintentarPerfil={() => void refrescarPerfil()}
                  contrataciones={loggedInEmpleado?.contrataciones}
                  rolNombreDe={(rolId) => roles.find(r => r.id === rolId)?.nombre ?? rolId}
                  rolesParaCambiar={rolesParaCambiar}
                  onCambiarRol={cambiarRolActivo}
                />
              )}
              {screen === "supplies" && (
                <GestionInsumosScreen
                  {...getPerms("supplies")}
                  insumos={insumos}
                  setInsumos={setInsumos}
                  fichas={fichasPorProducto}
                  setFichas={setFichasPorProducto}
                  idsConFicha={[
                    ...productos.map((p) => p.id),
                    ...insumos.map((i) => i.id),
                  ]}
                  abrirOrdenProduccion={abrirOrdenProduccion}
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
                  "supplies",
                  "sales-chart",
                  "perecederos",
                  "orden-compra",
                  "nueva-orden-compra",
                  "recepcion-compra",
                  "gestion-compra",
                  "nueva-compra",
                  // El detalle real se pinta arriba (screen === "orden-detalle");
                  // sin estar acá, GenericAdmin se sumaba debajo y repetía el
                  // placeholder "En desarrollo · Volver al inicio".
                  "orden-detalle",
                  "devoluciones",
                ].includes(screen) && (
                  <GenericAdmin
                    screen={screen}
                    navigate={navigate}
                    homeScreen={adminHomeScreen}
                  />
                )}
              </LandingErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* P12: se eliminó el footer de administración ("S.I.V.PRO — Panel
            Administrativo") para que no se muestre en ningún módulo del panel.
            El footer público del landing no se toca. `isLockedScreen` sigue
            vivo porque lo usa el contenedor de arriba (alto fijo del viewport). */}

        {/* Mobile bottom nav */}
        {!isAdmin && !isAuth && (
          <BottomNav
            navigate={navigate}
            current={screen}
            isLoggedIn={isLoggedIn}
            isStaff={isStaff}
            loggedInUser={loggedInUser ? {
              iniciales: loggedInUser.iniciales,
              avatarColor: loggedInUser.avatarColor,
            } : null}
            onLogin={openLogin}
          />
        )}
      </div>

      {/* Fondo del sidebar deslizante en celular/tablet: va DESPUÉS del contenido
          (mismo z-index que el topbar) para quedar por encima de él, y por debajo
          del aside (z-30), que sigue siendo el elemento visible. */}
      {isAdmin && esMovil && sidebarMovilAbierto && (
        <div
          className="fixed inset-0 z-20 bg-black/50"
          onClick={() => setSidebarMovilAbierto(false)}
          aria-hidden
        />
      )}

      <style>{`
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }

        /* 4.5 — Contenedores de tabla: scrollbar fina SIEMPRE visible, aunque
           el resto de la app oculte la suya. Las reglas por clase ganan en
           especificidad a las globales de arriba. */
        .overflow-x-auto, .overflow-auto {
          -ms-overflow-style: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(117, 117, 117, 0.55) transparent;
        }
        .overflow-x-auto::-webkit-scrollbar,
        .overflow-auto::-webkit-scrollbar {
          display: block;
          width: 6px;
          height: 6px;
        }
        .overflow-x-auto::-webkit-scrollbar-track,
        .overflow-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb,
        .overflow-auto::-webkit-scrollbar-thumb {
          background-color: rgba(117, 117, 117, 0.55);
          border-radius: 9999px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb:hover,
        .overflow-auto::-webkit-scrollbar-thumb:hover {
          background-color: rgba(117, 117, 117, 0.85);
        }
      `}</style>
    </div>
  );
}
