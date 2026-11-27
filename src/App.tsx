import { AlertTriangle, Archive, ArrowLeft, ArrowRight, Banknote, Check, CheckCircle, ChevronLeft, ChevronRight, CircleCheck, ClipboardList, CreditCard, Eye, FileText, ImageIcon, KeyRound, Lock, LogOut, Mail, MapPin, Minus, PackageCheck, Pencil, Phone, Plus, QrCode, RefreshCw, Search, ShieldCheck, ShoppingBag, ShoppingCart, Star, Trash2, Upload, User, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Component, Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { useIsMobile } from "@/shared/components/ui/use-mobile";

import imgCocaCola from "@/assets/img/Coca-Cola.webp";
import fondoMenu from "@/assets/img/fondo_menu.webp";
import lasanaCarne from "@/assets/img/lasaña_carne.webp";
import lasanaMixta from "@/assets/img/lasaña_mixta.webp";
import lasanaPollo from "@/assets/img/lasaña_pollo.webp";
import imgPepsi from "@/assets/img/Pepsi.webp";
import pizzaCarnes from "@/assets/img/pizza_carnes.webp";
import pizzaCañon from "@/assets/img/pizza_cañon.webp";
import pizzaHawaii from "@/assets/img/pizza_hawaii.webp";
import pizzaJamonQueso from "@/assets/img/pizza_jamon_queso.webp";
import pizzaMaicitos from "@/assets/img/pizza_maicitos.webp";
import pizzaPeperoni from "@/assets/img/pizza_peperoni.webp";
import pizzaPollo from "@/assets/img/pizza_pollo.webp";
import pizzaTocineta from "@/assets/img/pizza_tocineta.webp";
import imgPremio from "@/assets/img/Premio.webp";
import imgQuatro from "@/assets/img/Quatro.webp";
import { filtrarCorreo, filtrarNombre, normalizarNombre as normalizarNombrePersona, MarcaObligatorio, soloDigitos, validarCorreo, validarDocumento, validarNombre, validarTelefono, validarTelefonoOpcional } from "@/shared/components/FormInputs";
import { ConfirmDeleteModal } from "@/shared/components/ConfirmDeleteModal";
import { ResumenTotales } from "@/shared/components/TotalsSummary";
import { BloqueQrPago, CargaComprobanteCheckout, PAYMENT_INFO, useQrPago } from "@/shared/components/TransferPaymentStep";
import { RUTA_LICENCIAS, esRutaLicencias, useRutaLicencias } from "@/features/legal/navigation";
import { VolverArriba } from "@/shared/components/BackToTop";
import { HORA_APERTURA, HORA_CIERRE, HORA_ULTIMA_RECOGIDA, MINUTOS_RECOGIDA, formatearHora, minutosDeHora } from "@/shared/utils/time";
import { agregarDias, fechaISO, type Periodo } from "@/shared/utils/dates";
import { limpiarNumeroInput, numeroDeInput } from "@/shared/utils/numberInput";
import { crearVentaCliente, obtenerVentasPanel, verificarVentaApi, ventaApiAVenta } from "@/features/sales/services/salesApi";
import type { Screen } from "@/shared/utils/screen";
import { esPantalla } from "@/shared/utils/screen";
import { SECCIONES_MENU, productoACatalogo, productoApiAProducto, limiteStockDe, categoriaApiACategoria, verImagenCompleta, estadoDeProducto, productoDisponible, etiquetaEstadoMenu, type Product } from "@/shared/utils/catalog";
import { disponiblePizza } from "@/shared/utils/pizzaStock";
import { getImageUrl, onErrorImagen } from "@/shared/utils/getImageUrl";
import { obtenerCatalogo } from "@/shared/services/catalogService";
import { subirArchivo } from "@/shared/services/uploadService";
import { useValidacionFormulario } from "@/shared/hooks/useFormValidation";
import { actualizarPerfil, borrarToken, obtenerPerfil, obtenerToken } from "@/shared/services/authService";
import { crearError401Checkout, es401GenericoCheckout, registrarManejadorCierreSesion } from "@/shared/services/api";
import type { ApiErrorConEstado } from "@/types/api";
import { CategoriaProductoScreen, type CategoriaProducto, type CategoriaGuardar, type EstadoCategoria } from "@/features/product-categories/pages/ProductCategoriesScreen";
import type { Cliente } from "@/features/customers/pages/CustomersScreen";
import { GestionCompraScreen, NuevaCompraPage } from "@/features/purchases/pages/PurchasesScreen";
import { GestionConfigScreen, INITIAL_ROLES, completarRolesSemilla, KEY, ACCION_EXCEL, SUBS_CON_EXCEL, fullAccesos, type AccesosMap, type Rol } from "@/features/roles/pages/RolesScreen";
import { GestionEmpleadosScreen, type Contratacion } from "@/features/employees/pages/EmployeesScreen";
import { obtenerMiContratacion } from "@/shared/services/employeesService";
import type { CategoriaInsumo, Insumo } from "@/features/supplies/pages/SuppliesScreen";
import {
  GestionInsumosScreen,
  INITIAL_INSUMOS,
} from "@/features/supplies/pages/SuppliesScreen";
import { GestionProductosScreen, INITIAL_PRODUCTOS, INITIAL_FICHAS, imagenesDe, normalizarIdsFicha, TIPOS_PRODUCTO, tipoDe, type Producto, type FichasPorProducto, type FichaVersion } from "@/features/products/pages/ProductsScreen";
import { migrarFichasLegacy } from "@/shared/utils/technicalSheets";
import { listarGestion, crearProducto, editarProducto, cambiarEstadoProducto, productoPanelACreacion, productoPanelAEdicion, mensajeErrorProductos, type EstadoProductoManual } from "@/features/products/services/productsApi";
import { listarCategoriasInsumo, listarInsumos, mensajeErrorInsumos } from "@/features/supplies/services/suppliesApi";
import { mapearFichasApi, obtenerFichasVigentes } from "@/features/products/services/technicalSheetsApi";
import { listarOrdenesProduccion, mensajeErrorOrdenes } from "@/features/production-orders/services/productionOrdersApi";
import { listarProveedores, mensajeErrorProveedores } from "@/features/suppliers/services/suppliersApi";
import { listarOrdenesCompra, mensajeErrorOrdenesCompra } from "@/features/purchase-orders/services/purchaseOrdersApi";
import { listarCompras, mensajeErrorCompras } from "@/features/purchases/services/purchasesApi";
import { configDeCategoria, type ConfigCategoria } from "@/shared/utils/categoryConfig";
import { mismoNombre } from "@/shared/utils/names";
import { etiquetaTipoDocumento } from "@/shared/utils/documentTypes";
import { EstadoMenuBadge, AgotadoMenuBadge, NoDisponibleOverlay } from "@/shared/components/MenuStatusBadge";
import { EstadoSelect } from "@/shared/components/StatusSelect";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginator";
import { GhostBtn } from "@/shared/components/buttons/GhostButton";
import { PrimaryBtn } from "@/shared/components/buttons/PrimaryButton";
import { ActionIcons } from "@/shared/components/buttons/ActionIcons";
import { GestionUsuariosScreen, claveDoc, docValida, idRolCliente, type Usuario } from "@/features/users/pages/UsersScreen";
import { CambiarContrasenaModal } from "@/shared/components/ChangePasswordModal";
import { ActivarCuentaModal } from "@/shared/components/ActivateAccountModal";
import { verificarCorreo } from "@/shared/services/verificationService";
import type {
  GestionCompra,
  OrdenCompra,
  OrdenItem,
  ProveedorRef,
} from "@/features/purchase-orders/pages/PurchaseOrdersScreen";
import {
  INITIAL_GESTIONES,
  INITIAL_ORDENES,
  NuevaOrdenCompraPage,
  OrdenCompraScreen,
  OrdenDetallePage,
  PROVEEDORES_INIT,
} from "@/features/purchase-orders/pages/PurchaseOrdersScreen";
import {
  OrdenProduccionScreen,
  INITIAL_ORDENES as INITIAL_ORDENES_PRODUCCION,
  crearOrdenPedido,
  crearOrdenPreparacion,
  crearOrdenReemplazo,
  siguienteOrdenId,
  normalizarNombre,
  type Faltante,
  type OrdenProduccion,
} from "@/features/production-orders/pages/ProductionOrdersScreen";
import { ProductosPerecederosScreen, type NoConformidad } from "@/features/non-conforming-products/pages/NonConformingProductsScreen";
import { listarNoConformidades, mensajeErrorNoConformes } from "@/features/non-conforming-products/services/nonConformingApi";
import { cambiarEstadoCategoria, crearCategoria, editarCategoria, eliminarCategoria, listarCategoriasGestion, mensajeErrorCategorias } from "@/features/product-categories/services/categoriesApi";
import { PagoPill, VentasScreen, type DevolucionTipo, type Venta } from "@/features/sales/pages/SalesScreen";
import type { CartItem } from "@/types/cart";
import { SERIF, MONO } from "@/shared/utils/fonts";
import { DIRECCION_LOCAL, aperturaRecogidaTexto, cierreRecogidaTexto } from "@/shared/utils/storeInfo";
import { DASHBOARD_PERM_KEY, NAV_SECTIONS, canViewPermission } from "@/shared/utils/navigation";
import { PublicNav } from "@/layout/components/Header";
import { Sidebar } from "@/layout/components/Sidebar";
import { AdminTopBar } from "@/layout/components/AdminTopBar";
import { BottomNav } from "@/layout/components/BottomNav";
import { Landing } from "@/layout/pages/Landing";
import { normalizarNombreRol } from "@/shared/utils/roleName";
import { AVATAR_PALETTE } from "@/shared/utils/avatar";
import { LoginScreen } from "@/features/auth/pages/LoginScreen";
import { RegisterScreen } from "@/features/auth/pages/RegisterScreen";
import { esRolCliente, armarRolesSesion, clavePersona, leerRolActivo, escribirRolActivo, SESION_STORAGE_KEY, INACTIVIDAD_MS, ACTIVIDAD_THROTTLE_MS, type SesionGuardada, leerSesionGuardada, escribirSesionGuardada, borrarSesionGuardada } from "@/features/auth/hooks/useSession";

// ─── Code splitting (React.lazy) ───
// Estas pantallas se importan SOLO como componente (no comparten constants ni
// funciones con App), así que se cargan bajo demanda para reducir el bundle
// inicial. Cada wrapper resuelve el export nominal correspondiente como `default`.
const ProductoTerminadoScreen = lazy(() => import("@/features/products/pages/FinishedProductScreen").then((m) => ({ default: m.ProductoTerminadoScreen })));
const RecepcionCompraScreen = lazy(() => import("@/features/purchase-orders/pages/PurchaseReceptionScreen").then((m) => ({ default: m.RecepcionCompraScreen })));
const SalesChartScreen = lazy(() => import("@/features/dashboard/pages/SalesChartScreen").then((m) => ({ default: m.SalesChartScreen })));
const DashboardScreen = lazy(() => import("@/features/dashboard/pages/DashboardScreen").then((m) => ({ default: m.DashboardScreen })));
const SuppliersScreen = lazy(() => import("@/features/suppliers/pages/SuppliersScreen").then((m) => ({ default: m.SuppliersScreen })));
const DevolucionesScreen = lazy(() => import("@/features/returns/pages/ReturnsScreen").then((m) => ({ default: m.DevolucionesScreen })));
const MisPedidosScreen = lazy(() => import("@/features/sales/pages/MyOrdersScreen").then((m) => ({ default: m.MisPedidosScreen })));
const LicenciasScreen = lazy(() => import("@/features/legal/pages/LicensesScreen").then((m) => ({ default: m.LicenciasScreen })));
const MiPerfilScreen = lazy(() => import("@/features/users/pages/MyProfileScreen").then((m) => ({ default: m.MiPerfilScreen })));
const GestionClientesScreen = lazy(() => import("@/features/customers/pages/CustomersScreen").then((m) => ({ default: m.GestionClientesScreen })));

// ─────────────────────────── TYPES ───────────────────────────

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
    estado: "Disponible",
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
    estado: "Disponible",
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
    estado: "Disponible",
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
    estado: "Disponible",
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
    estado: "Disponible",
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
    estado: "Disponible",
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
    estado: "Disponible",
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
    estado: "Disponible",
    rating: 0,
    sales: 0,
  },
  // ── Lasañas (CAT-002): precio único, presentación única "Normal" ──
  {
    id: 9,
    name: "Lasaña Carne",
    description: "Lasaña de carne con salsa boloñesa, bechamel y queso gratinado.",
    price: 20000,
    image: lasanaCarne,
    idCategoria: "CAT-002",
    category: "Lasaña",
    sizes: SIZES_LASANA,
    extras: [],
    status: "disponible",
    estado: "Disponible",
    rating: 4.8,
    sales: 450,
  },
  {
    id: 10,
    name: "Lasaña Pollo",
    description: "Lasaña de pollo con salsa blanca, bechamel y queso gratinado.",
    price: 20000,
    image: lasanaPollo,
    idCategoria: "CAT-002",
    category: "Lasaña",
    sizes: SIZES_LASANA,
    extras: [],
    status: "disponible",
    estado: "Disponible",
    rating: 4.7,
    sales: 380,
  },
  {
    id: 11,
    name: "Lasaña Mixta",
    description: "Lasaña mixta con carne y pollo, salsa boloñesa y queso gratinado.",
    price: 22000,
    image: lasanaMixta,
    idCategoria: "CAT-002",
    category: "Lasaña",
    sizes: SIZES_LASANA,
    extras: [],
    status: "disponible",
    estado: "Disponible",
    rating: 4.9,
    sales: 520,
  },
  // ── Bebidas (CAT-003): botella 2.5 L, sin tamaños ──
  {
    id: 12,
    name: "Gaseosa Cuatro",
    description: "Botella de 2.5 L. Sabor cítrico y refrescante.",
    price: 3000,
    image: imgQuatro,
    idCategoria: "CAT-003",
    category: "Bebidas",
    sizes: [],
    extras: [],
    status: "disponible",
    estado: "Disponible",
    rating: 4.5,
    sales: 2100,
  },
  {
    id: 13,
    name: "Gaseosa Premium",
    description: "Botella de 2.5 L. Sabor frutal y refrescante.",
    price: 3500,
    image: imgPremio,
    idCategoria: "CAT-003",
    category: "Bebidas",
    sizes: [],
    extras: [],
    status: "disponible",
    estado: "Disponible",
    rating: 4.4,
    sales: 1800,
  },
  {
    id: 14,
    name: "Gaseosa Coca-Cola",
    description: "Botella de 2.5 L. El sabor clásico de siempre.",
    price: 2500,
    image: imgCocaCola,
    idCategoria: "CAT-003",
    category: "Bebidas",
    sizes: [],
    extras: [],
    status: "disponible",
    estado: "Disponible",
    rating: 4.8,
    sales: 3200,
  },
  {
    id: 15,
    name: "Gaseosa Pepsi",
    description: "Botella de 2.5 L. Sabor cola y refrescante.",
    price: 2500,
    image: imgPepsi,
    idCategoria: "CAT-003",
    category: "Bebidas",
    sizes: [],
    extras: [],
    status: "disponible",
    estado: "Disponible",
    rating: 4.6,
    sales: 2800,
  },
];

/** WhatsApp del local (número colombiano, sin prefijo). El enlace usa el
    prefijo 57 y el texto visible se agrupa como "320 882 0029". */
const WHATSAPP_LOCAL = "3208820029";
const WHATSAPP_LOCAL_VISIBLE = WHATSAPP_LOCAL.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
const WHATSAPP_LOCAL_URL = `https://wa.me/57${WHATSAPP_LOCAL}`;

/** Logo de WhatsApp (lucide-react no incluye iconos de marca). */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

// ─────────────────────────── CONSTANTS ───────────────────────────

const ultimaRecogidaTexto = formatearHora(
  Math.floor(HORA_ULTIMA_RECOGIDA / 60) + ":" + String(HORA_ULTIMA_RECOGIDA % 60).padStart(2, "0"),
);

const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`;

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
  "clients",
  "profile",
  "reports",
  "roles",
  "permissions",
  "users",
  "access",
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

// ─────────────────────────── SESIÓN PERSISTENTE ───────────────────────────
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
  "gestion-roles": KEY("Configuración", "Roles"),
  "users": KEY("Configuración", "Usuarios"),
  "empleados": KEY("Producción", "Empleados"),
  "supplies": KEY("Compras", "Insumos"),
  "suppliers": KEY("Compras", "Proveedores"),
  "orden-compra": KEY("Compras", "Orden de Compra"),
  "nueva-orden-compra": KEY("Compras", "Orden de Compra"),
  "gestion-compra": KEY("Compras", "Compra"),
  "nueva-compra": KEY("Compras", "Compra"),
  "cat-producto": KEY("Producción", "Categoría de Producto"),
  "gestion-productos": KEY("Producción", "Productos"),
  "production-orders": KEY("Producción", "Orden de Producción"),
  "perecederos": KEY("Producción", "Producto No Conforme"),
  "clientes": KEY("Ventas", "Clientes"),
  "ventas-pedidos": KEY("Ventas", "Ventas"),
  "devoluciones": KEY("Ventas", "Devoluciones"),
};

// Pantallas del panel que dependen de un permiso (todas las de la barra
// lateral menos "Inicio", que es universal dentro del panel). Se usan para
// decidir si un rol "tiene pantallas" y para calcular a cuál entrar primero.
const PANTALLAS_CON_PERMISO = NAV_SECTIONS.flatMap(s => s.items)
  .filter(i => typeof (i as { permKey?: string }).permKey === "string")
  .map(i => ({ screen: i.screen, permKey: (i as { permKey?: string }).permKey as string }));

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

// ─────────────────────────── CATALOG ───────────────────────────

// ── Bloque 5: topes del carrito ──

/** Lo que el tope necesita saber de una línea del carrito: el producto, su
    tamaño y —si ya está en el carrito— su id, para excluir la línea de los
    consumos ajenos. `CartItem` lo cumple tal cual. */
type LineaLimiteRef = {
  id?: string;
  product: { name: string };
  size?: string;
};

/** Tope de UNA línea del carrito (Bloque 5): `max` es el TOTAL de unidades
    que esa línea puede tener (undefined = sin límite), `elaborado` dice si
    es un producto insumo (para elegir el mensaje de máximo) y `stock` es el
    STOCK REAL del catálogo público SIN descontar el carrito (undefined = la
    API no lo envió). `stock` es lo que el menú pinta como "Agotado":
    `max === 0` también ocurre con stock > 0 cuando el carrito ya se llevó
    todas las unidades, y eso NO es agotado. */
type LimiteLinea = { max: number | undefined; elaborado: boolean; stock?: number };

/** Mensaje exacto al llegar al máximo (Bloque 5, punto 4): tanto pizzas/
    lasañas (pre-hechas) como bebidas se limitan por su STOCK FÍSICO, así que
    ambos hablan de unidades disponibles. */
const mensajeMaximoDe = (
  nombre: string,
  max: number,
  tamano: string | undefined,
  elaborado: boolean,
): string =>
  elaborado
  ? ["Mediana", "Grande"].includes(tamano ?? "")
    ? `Solo ${max === 1 ? "queda" : "quedan"} ${max} ${max === 1 ? "porción" : "porciones"} de ${nombre} ${tamano} ${max === 1 ? "disponible" : "disponibles"}`
    : `Solo quedan ${max} ${nombre}${tamano ? ` ${tamano}` : ""} disponibles`
    : `Máximo disponible: ${max}. No hay más unidades de ${nombre}`;

/** Cantidad ajustada al rango permitido: nunca baja de 1 y nunca pasa del
    máximo (si se pasa —escribiendo o sumando— se ajusta sola y el aviso lo
    dispara quien la recibe). `max` undefined = sin límite. */
const ajustarCantidad = (cantidad: number, max?: number): number =>
  Math.min(
    Math.max(1, Math.round(cantidad) || 1),
    Math.max(1, max ?? Infinity),
  );

/** Bebida con poco stock (Bloque 5, punto 5): ≤10 disponibles ámbar,
    ≤5 rojo. Solo aplica a productos terminados. */
const avisoStockBajoCls = (max: number): string =>
  max <= 5
    ? "bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400"
    : "bg-amber-100 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400";

/** Aviso "¡Quedan solo {N}!" del detalle y de la fila del carrito. */
function AvisoStockBajo({
  max,
  className = "",
}: {
  max: number;
  className?: string;
}) {
  return (
    <p
      className={`text-xs font-semibold border rounded-xl px-3 py-1.5 ${avisoStockBajoCls(max)} ${className}`}
    >
      ¡Quedan solo {max}!
    </p>
  );
}

/** Campo de cantidad entre − y + (Bloque 5, punto 3): escribible con el
    teclado, mínimo 1; si se escribe más del máximo se ajusta solo y sale
    el mensaje. `max` undefined = sin límite. */
function CantidadInput({
  value,
  max,
  mensajeMaximo,
  onChange,
}: {
  value: number;
  /** undefined = sin límite. */
  max: number | undefined;
  /** Texto que avisa si se escribe sobre el máximo. */
  mensajeMaximo: string;
  onChange: (nueva: number) => void;
}) {
  // Texto en edición: permite borrar al vacío sin pelearse con el valor
  // controlado; al salir del campo vuelve a mostrar la cantidad real.
  const [texto, setTexto] = useState<string | null>(null);
  const tope = Math.max(1, max ?? Infinity);
  return (
    <input
      type="number"
      min={1}
      value={texto ?? String(value)}
      aria-label="Cantidad"
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw.trim() === "") {
          setTexto("");
          return;
        }
        const n = Number(raw);
        if (!Number.isFinite(n)) {
          setTexto(raw);
          return;
        }
        const entero = Math.round(n);
        // Punto 3: se escribe más del máximo → se ajusta sola y sale el aviso.
        if (entero > tope) toast.warning(mensajeMaximo);
        const ajustada = Math.min(Math.max(1, entero), tope);
        setTexto(String(ajustada));
        if (ajustada !== value) onChange(ajustada);
      }}
      onBlur={() => setTexto(null)}
      className="w-12 text-center text-sm max-md:text-base max-md:min-h-11 font-bold bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-lg py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

// Tarjeta de producto del catálogo. Vive fuera de `CatalogScreen` porque el
// grid se pinta por dos caminos —grid único al elegir una categoría y grid por
// secciones con "Todas"— y los dos tienen que mostrar exactamente la misma
// tarjeta. `index` solo escalona la animación dentro de su propia fila.
function ProductCard({
  product: p,
  index,
  onOpen,
  onQuickAdd,
  cart,
  limiteDe,
}: {
  product: Product;
  index: number;
  onOpen: (p: Product) => void;
  onQuickAdd: (p: Product) => void;
  cart: CartItem[];
  /** Sigue llegando desde CatalogScreen, pero ya no se usa acá: la tarjeta
      no tiene stepper [− cantidad +], solo el botón rápido de +1. */
  updateQty: (id: string, qty: number) => void;
  /** Bloque 5 — Tope de la línea que completaría el botón rápido, con TODO
      el carrito; lo calcula App (panel, fichas e insumos). */
  limiteDe: (linea: LineaLimiteRef) => LimiteLinea;
}) {
  // Estado real del producto (menú público). "Descontinuado" no llega acá:
  // CatalogScreen lo filtra antes de armar el grid.
  const estado = estadoDeProducto(p);
  const noDisponible = estado !== "Disponible";
  // Bloque 5 — El botón suma 1 con el tamaño por defecto, pero si ya hay una
  // línea sin extras de ESTE producto el +1 se acumula en ella (mismo
  // criterio que `quickAdd`), así que el tope es el de ESA línea.
  const tamanoDefecto = sizeDe(p, 0).label;
  const enCarrito = cart.find(
    (i) => i.product.id === p.id && i.size === tamanoDefecto && i.selectedExtras.length === 0,
  );
  const tope = limiteDe(enCarrito ?? { product: p, size: tamanoDefecto });
  const max = tope.max;
  const adicional =
    max === undefined ? undefined : max - (enCarrito?.quantity ?? 0);
  // Punto 6: no queda nada por agregar = "Agotado" (sin cambiar el estado
  // del producto; la etiqueta de estado sigue pintándose igual).
  const agotado = adicional !== undefined && adicional <= 0;
  const agotadoMenu = p.category.toLowerCase().includes("pizza")
    ? p.sizes.length > 0 && p.sizes.every((size) => {
      const disponible = limiteDe({ product: p, size: size.label }).max;
      return disponible !== undefined && disponible <= 0;
    })
    : agotado;
  // Una sola etiqueta de estado a la vez (ver `etiquetaEstadoMenu`).
  const etiqueta = etiquetaEstadoMenu(estado, agotadoMenu);
  // Precio atenuado cuando el cliente no puede pedirlo: estado no disponible
  // o sin stock ("Agotado"). La FOTO se atenúa solo con "No disponible" (se
  // ve inline en su className).
  const atenuada = etiqueta !== "disponible";
  const mensajeMax =
    max === undefined
      ? ""
      : max === 0
        ? "Agotado"
        : mensajeMaximoDe(
          p.name,
          max,
          enCarrito?.size || tamanoDefecto,
          tope.elaborado,
        );
  return (
    <motion.div
      data-producto-id={p.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onOpen(p)}
      className="group bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-all duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-lg cursor-pointer"
    >
      <button
        className={`relative w-full overflow-hidden h-48 bg-muted cursor-pointer block ${verImagenCompleta(p) ? "p-2" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          onOpen(p);
        }}
      >
        <img
          src={getImageUrl(p.image)}
          alt={p.name}
          onError={onErrorImagen}
          className={`block w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${etiqueta === "no_disponible" ? "grayscale opacity-60" : ""
            } ${verImagenCompleta(p) ? "object-contain" : "object-cover"}`}
        />
        {/* Etiqueta de estado: fondo sólido, arriba a la izquierda con 12 px
            de separación, legible sobre cualquier foto (claras, oscuras o de
            cuadritos) y en ambos modos. Una sola a la vez: si está agotado se
            oculta el verde y el "Agotado" ocupa esta misma esquina. */}
        {etiqueta !== "agotado" && (
          <EstadoMenuBadge
            estado={estado}
            className="absolute top-3 left-3 z-10"
          />
        )}
        {/* Punto 6: máximo 0 = Agotado (sin cambiar el estado del producto).
            Ocupa la MISMA esquina superior izquierda y el mismo estilo de
            píldora que el badge de estado; `etiquetaEstadoMenu` garantiza que
            solo se pinta uno de los dos. */}
        {etiqueta === "agotado" && (
          <AgotadoMenuBadge className="absolute top-3 left-3 z-10" />
        )}
        {etiqueta === "no_disponible" && (
          <NoDisponibleOverlay className="absolute inset-0 z-10" />
        )}
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
        <div className="flex items-center justify-between gap-3">
          {p.category.toLowerCase().includes("pizza") ? (
            <div className="min-w-0 space-y-1 text-sm font-semibold" style={{ fontFamily: MONO }}>
              {p.sizes.map((size) => {
                const stock = limiteStockDe(p, size.label);
                const agotadoTamano = stock === 0;
                return (
                  <p
                    key={size.label}
                    className={agotadoTamano || atenuada ? "text-muted-foreground opacity-60" : "text-foreground"}
                  >
                    {size.label} {fmt(size.price)} / porción{stock !== undefined && (agotadoTamano ? " · Agotado" : ` · Quedan ${stock} porciones`)}
                  </p>
                );
              })}
            </div>
          ) : (
            <div>
              <span className={`font-bold text-lg ${atenuada ? "text-muted-foreground opacity-60" : "text-foreground"}`} style={{ fontFamily: MONO }}>
                {fmt(p.price)}
              </span>
              {limiteStockDe(p) !== undefined && <p className="text-xs text-muted-foreground">{limiteStockDe(p) === 0 ? "Agotado" : `Quedan ${limiteStockDe(p)}`}</p>}
            </div>
          )}
          <div className="flex gap-2">
            {/* Solo ícono: el botón nunca se transforma. Cada clic suma 1
                unidad (quickAdd deduplica dentro de setCart) y dispara el
                toast, sin abrir el carrito. El tamaño se elige en el detalle
                ("Ver más" o la imagen). */}
            <button
              onClick={(event) => {
                event.stopPropagation();
                onQuickAdd(p);
              }}
              // Puntos 4 y 6: no disponible o sin nada que agregar (tope en
              // 0 o ya en el máximo) → el botón queda deshabilitado.
              disabled={noDisponible || agotado}
              title={
                noDisponible
                  ? "No disponible por ahora"
                  : agotado
                    ? mensajeMax
                    : "Agregar al carrito"
              }
              aria-label={
                noDisponible
                  ? `${p.name} no está disponible por ahora`
                  : agotado
                    ? `${p.name} agotado`
                    : `Agregar ${p.name} al carrito`
              }
              className="flex items-center justify-center min-w-[40px] min-h-[40px] max-md:min-w-11 max-md:min-h-11 p-2 bg-primary text-white rounded-xl hover:bg-red-700 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer motion-reduce:active:scale-100"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          </div>
        </div>
        <PrimaryBtn
          onClick={(event) => {
            event.stopPropagation();
            onOpen(p);
          }}
          size="sm"
          className="w-full mt-3 max-md:min-h-11"
        >
          Ver detalle
        </PrimaryBtn>
      </div>
    </motion.div>
  );
}

function CatalogScreen({
  navigate,
  setProduct,
  quickAdd,
  categoria,
  setCategoria,
  page,
  setPage,
  search,
  setSearch,
  productos,
  onOpenDetail,
  cart,
  updateQty,
  categorias,
  limiteDe,
}: {
  navigate: (s: Screen) => void;
  setProduct: (p: Product) => void;
  /** Bloque 5: devuelve si algo se agregó; si no, el mensaje de máximo. */
  quickAdd: (p: Product) => { agregado: boolean; mensaje?: string };
  categoria: string | null;
  setCategoria: (categoria: string) => void;
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
  /** Bloque 5 — Tope por línea con TODO el carrito; lo calcula App. */
  limiteDe: (linea: LineaLimiteRef) => LimiteLinea;
}) {
  const isMobile = useIsMobile();
  const productosSeguros = Array.isArray(productos) ? productos : [];
  const categoriasSeguras = Array.isArray(categorias) ? categorias : [];
  // 9 = 3 columnas del grid, así cada página cierra en filas completas.
  // En móvil: 6 por página (2 columnas de 3).
  const PER_PAGE = isMobile ? 6 : 9;

  // Productos que el menú público SÍ muestra: los descontinuados se ocultan
  // en todos los lugares del menú (catálogo, favoritas y detalle). Los
  // botones de filtro se derivan de esta misma lista, así una categoría cuyo
  // único producto se descontinuó deja de ofrecer su filtro vacío.
  const visibles = useMemo(
    () => productosSeguros.filter((p) => estadoDeProducto(p) !== "Descontinuado"),
    [productosSeguros],
  );

  // Botones de filtro. Se derivan de los PRODUCTOS que se están listando y no
  // de la lista de categorías del admin: así, aunque una categoría se haya
  // guardado con otro id o quede marcada como inactiva en localStorage, el menú
  // siempre muestra sus botones (antes no salía ninguno y solo se veía "Todas").
  const filtros = useMemo(() => {
    const porId = new Map<string, string>();
    visibles.forEach((p) => {
      const id = p.idCategoria ?? "";
      if (!id || porId.has(id)) return;
      const nombre =
        categoriasSeguras.find((c) => c.id === id)?.nombre ||
        p.category ||
        "Otros";
      porId.set(id, nombre);
    });
    return [...porId.entries()].map(([id, nombre]) => ({ id, nombre }));
  }, [visibles, categoriasSeguras]);

  const filtroActivo = categoria === "Todas" ? undefined : filtros.find((f) =>
    f.id === categoria || normalizarNombre(f.nombre) === normalizarNombre(categoria ?? "Pizzas"));
  const cat = categoria === "Todas" ? "Todas" : filtroActivo?.id ?? "Todas";
  const nombreFiltroActivo = filtroActivo?.nombre;

  // Del filtro de categoría/búsqueda salen SOLO productos visibles (sin
  // descontinuados) y ordenados: primero los disponibles y al final los no
  // disponibles, conservando el orden original dentro de cada grupo (el sort
  // de JS es estable), así "sin cambiar el resto del orden".
  const filtered = useMemo(() => {
    const porCategoriaYBusqueda = visibles.filter(
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
    );
    const peso = (p: Product) => (productoDisponible(p) ? 0 : 1);
    return [...porCategoriaYBusqueda].sort((a, b) => peso(a) - peso(b));
  }, [search, cat, nombreFiltroActivo, visibles]);

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
    const r = quickAdd(p);
    // Bloque 5 (punto 4): si no se agregó nada —la línea ya está en su
    // máximo— solo sale el aviso; el toast nunca dice "agregada al carrito"
    // sin que se haya agregado nada.
    if (r.mensaje) {
      toast.warning(r.mensaje);
      return;
    }
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
    <div className="relative min-h-[calc(100dvh-80px)]">
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-fixed dark:brightness-[0.2]"
        style={{
          backgroundImage: `url(${fondoMenu})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
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
            aria-label="Buscar pizza en el menú"
            className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            key="Todas"
            onClick={() => {
              setCategoria("Todas");
              setPage(1);
            }}
            className={`px-4 py-2.5 max-md:min-h-11 rounded-xl text-sm font-semibold transition-all cursor-pointer ${cat === "Todas" ? "bg-primary text-white shadow" : "bg-muted text-muted-foreground hover:bg-border"}`}>
            Todas
          </button>
          {filtros.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCategoria(c.id);
                setPage(1);
              }}
              className={`px-4 py-2.5 max-md:min-h-11 rounded-xl text-sm font-semibold transition-all cursor-pointer ${cat === c.id ? "bg-primary text-white shadow" : "bg-muted text-muted-foreground hover:bg-border"}`}>
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
              limiteDe={limiteDe}
            />
          ))}
        </div>
      )}

      <div className="mt-8 pb-20 md:pb-4">
        <p className="text-sm text-muted-foreground text-center mb-3">
          Mostrando {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} de {filtered.length} producto{filtered.length === 1 ? "" : "s"}
        </p>
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => irAPagina(Math.max(1, page - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
              className="inline-flex items-center gap-1 px-3 py-2 min-h-[40px] max-md:min-h-11 rounded-lg border border-border text-sm font-semibold cursor-pointer hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
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
                  className={`w-10 h-10 min-h-[40px] min-w-[40px] max-md:w-11 max-md:h-11 rounded-lg text-sm font-semibold cursor-pointer ${n === page
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
              className="inline-flex items-center gap-1 px-3 py-2 min-h-[40px] max-md:min-h-11 rounded-lg border border-border text-sm font-semibold cursor-pointer hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <VolverArriba />
      </div>
    </div>
  );
}

// ─────────────────────────── PRODUCT DETAIL ───────────────────────────

function ProductDetailScreen({
  product,
  catalogProducts,
  onOpenRelated,
  navigate,
  addDetailed,
  limiteDe,
  onBack,
  backLabel,
}: {
  product: Product;
  catalogProducts: Product[];
  onOpenRelated: (product: Product) => void;
  navigate: (s: Screen, options?: { restaurar?: boolean }) => void;
  /** Bloque 5 — Devuelve si algo se agregó; si no, el mensaje de máximo (el
      toast jamás dice "agregada" si no se agregó nada). */
  addDetailed: (item: CartItem) => { agregado: boolean; mensaje?: string };
  /** Bloque 5 — Tope de ESTE producto/tamaño considerando TODO lo que ya hay
      en el carrito (el detalle no tiene id: todo el carrito cuenta, así `max`
      son las unidades que se pueden AGREGAR); lo calcula App. */
  limiteDe: (linea: LineaLimiteRef) => LimiteLinea;
  onBack: () => void;
  backLabel: string;
}) {
  const [sizeIdx, setSizeIdx] = useState(0);
  const [extras, setExtras] = useState<string[]>([]);
  const [qty, setQty] = useState(1);

  const [imageIndex, setImageIndex] = useState(0);
  const imageDialogRef = useRef<HTMLDialogElement>(null);
  const images = product.images?.length ? product.images : [product.image];
  const activeImageIndex = imageIndex < images.length ? imageIndex : 0;
  const currentImage = images[activeImageIndex];
  const moveImage = (direction: number) => {
    setImageIndex((activeImageIndex + direction + images.length) % images.length);
  };

  const availableProducts = catalogProducts.filter((candidate) => {
    if (candidate.id === product.id || !productoDisponible(candidate)) return false;
    if (!candidate.sizes.length) return limiteStockDe(candidate) !== 0;
    return candidate.sizes.some(({ label }) => {
      if (candidate.stockPartes != null && /^(Mediana|Grande)$/.test(label)) {
        return disponiblePizza(candidate.stockPartes, label, []) > 0;
      }
      return (limiteStockDe(candidate, label) ?? candidate.stockApi) !== 0;
    });
  });
  const relatedProducts = [
    ...availableProducts.filter((candidate) => candidate.idCategoria === product.idCategoria),
    ...availableProducts.filter((candidate) => candidate.idCategoria !== product.idCategoria),
  ].slice(0, 4);

  const extrasPrice = extras.reduce(
    (sum, ex) =>
      sum +
      (product.extras.find((e) => e.label === ex)?.price ?? 0),
    0,
  );
  const sizePrice = sizeDe(product, sizeIdx).price;
  const total = (sizePrice + extrasPrice) * qty;
  // Estado del producto en el menú: la etiqueta se muestra igual que en la
  // tarjeta y, si no está disponible, el pedido se bloquea desde acá (el
  // botón "Agregar al carrito" antes ignoraba el estado).
  const estado = estadoDeProducto(product);
  const noDisponible = estado !== "Disponible";
  const esPizza = product.category.toLowerCase().includes("pizza");
  // Bloque 5 — Tope de ESTE producto/tamaño considerando TODO lo que ya hay
  // en el carrito (el detalle no tiene id: todas las líneas cuentan como
  // ajenas, así `max` son las unidades que se pueden AGREGAR ahora).
  // undefined = sin límite (sin ficha, sin stock o fuera del panel).
  const tamanoElegido = sizeDe(product, sizeIdx).label;
  const limite = limiteDe({ product, size: tamanoElegido });
  const max = limite.max;
  // La cantidad se ajusta sola si el máximo baja —al cambiar de tamaño o al
  // bajar el stock— y nunca baja de 1.
  const tope = Math.max(1, max ?? Infinity);
  useEffect(() => {
    setQty((q) => Math.max(1, Math.min(q, tope)));
  }, [tope]);
  // Punto 6: máximo 0 = Agotado (sin cambiar el estado del producto).
  const agotado = max === 0;
  // Una sola etiqueta de estado a la vez (ver `etiquetaEstadoMenu`).
  const etiqueta = etiquetaEstadoMenu(estado, agotado);
  // Punto 4: al llegar al máximo el + queda deshabilitado y sale el mensaje.
  const enTope = max !== undefined && qty >= max;
  const mensajeMax =
    max === undefined
      ? ""
      : max === 0
        ? "Agotado"
        : mensajeMaximoDe(product.name, max, tamanoElegido, limite.elaborado);
  // Punto 5: bebida con 10 o menos disponibles avisa acá (ámbar ≤10, rojo
  // ≤5); los productos insumo se rigen por su ficha técnica.
  const bajoStock =
    !limite.elaborado && max !== undefined && max > 0 && max <= 10;


  const handleAdd = () => {
    // Red de seguridad además del `disabled` del botón.
    if (noDisponible) {
      toast.error("Este producto no está disponible por ahora");
      return;
    }
    const size = sizeDe(product, sizeIdx);
    // Bloque 5: la cantidad se ajusta sola al máximo permitido (mínimo 1).
    const cantidad = Math.max(1, Math.min(qty, tope));
    const r = addDetailed({
      id: `${product.id}-${Date.now()}`,
      product,
      quantity: cantidad,
      size: size.label,
      sizePrice,
      selectedExtras: extras,
      extrasPrice,
    });
    // Punto 4: si no se agregó nada, solo el aviso de máximo; el toast nunca
    // dice "agregada al carrito" sin que se haya agregado nada.
    if (r.mensaje) {
      toast.warning(r.mensaje);
      return;
    }
    setQty(1);
    toast.success(`${product.name} ${size.label} × ${cantidad} agregada al carrito`, {
      action: {
        label: "Ver carrito",
        onClick: () => navigate("cart"),
      },
    });
  };

  return (
    <div className="relative min-h-[calc(100dvh-80px)]">
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-fixed dark:brightness-[0.2]"
        style={{
          backgroundImage: `url(${fondoMenu})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 max-md:min-h-11 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Image */}
        <div className={`grid gap-3 self-start ${images.length > 1 ? "md:grid-cols-[4rem_minmax(0,1fr)]" : ""}`}>
          <div className={`relative overflow-hidden rounded-2xl bg-muted h-80 md:h-[420px] ${images.length > 1 ? "md:col-start-2 md:row-start-1" : ""}`}>
            <button
              type="button"
              aria-label={`Ampliar imagen de ${product.name}`}
              onClick={() => imageDialogRef.current?.showModal()}
              className={`block h-full w-full cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${verImagenCompleta(product) ? "p-3" : ""}`}
            >
              <img
                key={currentImage}
                src={getImageUrl(currentImage)}
                alt={product.name}
                onError={onErrorImagen}
                className={`block w-full h-full ${verImagenCompleta(product) ? "object-contain" : "object-cover"} ${etiqueta === "no_disponible" ? "grayscale opacity-60" : ""}`}
              />
            </button>
            {/* Mismo estado que en la tarjeta del catálogo: fondo sólido,
                arriba a la izquierda con 12 px de separación. Una sola etiqueta
                a la vez: si está agotado se oculta el verde. */}
            {etiqueta !== "agotado" && (
              <EstadoMenuBadge
                estado={estado}
                className="pointer-events-none absolute top-3 left-3 z-10"
              />
            )}
            {/* Punto 6: máximo 0 = Agotado (sin cambiar el estado). Ocupa la
                MISMA esquina superior izquierda y el mismo estilo de píldora que
                el badge de estado. */}
            {etiqueta === "agotado" && (
              <AgotadoMenuBadge className="pointer-events-none absolute top-3 left-3 z-10" />
            )}
            {etiqueta === "no_disponible" && (
              <NoDisponibleOverlay className="pointer-events-none absolute inset-0 z-10" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 md:col-start-1 md:row-start-1 md:flex-col" role="group" aria-label="Imágenes del producto">
              {images.map((image, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Ver imagen ${index + 1}`}
                  aria-pressed={index === activeImageIndex}
                  onClick={() => setImageIndex(index)}
                  className="size-16 overflow-hidden rounded-lg border-2 border-border bg-muted cursor-pointer aria-pressed:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <img src={getImageUrl(image)} alt="" onError={onErrorImagen} className="size-full object-contain" />
                </button>
              ))}
            </div>
          )}
          <dialog
            ref={imageDialogRef}
            aria-label={`Imágenes de ${product.name}`}
            className="fixed inset-0 m-auto w-[min(94vw,64rem)] max-w-none rounded-xl bg-neutral-950 p-4 text-white backdrop:bg-black/85"
            onKeyDown={(event) => {
              if (images.length < 2) return;
              if (event.key === "ArrowLeft") moveImage(-1);
              if (event.key === "ArrowRight") moveImage(1);
            }}
          >
            <div className="mb-3 flex justify-end">
              <button autoFocus type="button" onClick={() => imageDialogRef.current?.close()} className="rounded-lg bg-white/15 px-3 py-2 hover:bg-white/25">
                Cerrar
              </button>
            </div>
            <div className="relative">
              <img key={currentImage} src={getImageUrl(currentImage)} alt={product.name} loading="lazy" onError={onErrorImagen} className="mx-auto max-h-[74dvh] w-full object-contain" />
              {images.length > 1 && (
                <>
                  <button type="button" aria-label="Imagen anterior" onClick={() => moveImage(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-black/75 p-2 hover:bg-black">
                    <ChevronLeft className="size-6" />
                  </button>
                  <button type="button" aria-label="Imagen siguiente" onClick={() => moveImage(1)} className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-black/75 p-2 hover:bg-black">
                    <ChevronRight className="size-6" />
                  </button>
                </>
              )}
            </div>
          </dialog>
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
          <p className="text-muted-foreground leading-relaxed mb-6">
            {product.description}
          </p>
          {esPizza && (
            <p className="mb-6 rounded-xl border border-border bg-muted/70 px-3 py-2 text-sm text-muted-foreground">
              Se vende por porción. Mediana: 1/8 de pizza · Grande: 1/6 de pizza (más grande).
            </p>
          )}

          {/* Tamaño: las bebidas no tienen selector (botella 2.5 L) y las
              lasañas tienen una única presentación fija "Normal". Solo las
              pizzas ofrecen una elección real entre Mediana y Grande. */}
          {product.sizes.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold mb-3 text-foreground">
                {product.sizes.length === 1 && !esPizza
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
                    {product.category.toLowerCase().includes("pizza") ? " / porción" : ""}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {product.sizes.map((s, i) => (
                    (() => {
                      const limiteTamano = esPizza
                        ? limiteDe({ product, size: s.label })
                        : undefined;
                      const agotadoTamano = limiteTamano?.max === 0;
                      return <label
                      key={s.label}
                      className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${agotadoTamano ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${sizeIdx === i ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"}`}
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
                          disabled={agotadoTamano}
                          onChange={() => {
                            if (!agotadoTamano) setSizeIdx(i);
                          }}
                        />
                        <span className="font-medium text-foreground">
                          {esPizza ? `${s.label} — ${fmt(s.price)} por porción` : s.label}
                          {esPizza && sizeIdx === i && (
                            <span className="block text-xs font-normal text-muted-foreground mt-1">
                              {limiteTamano?.max == null
                                ? "Disponibilidad no informada"
                                : limiteTamano.max === 0
                                  ? "Agotado"
                                  : `Disponibles: ${limiteTamano.max} ${limiteTamano.max === 1 ? "porción" : "porciones"}`}
                            </span>
                          )}
                          {esPizza && agotadoTamano && sizeIdx !== i && (
                            <span className="block text-xs font-semibold text-red-600 mt-1">Agotado</span>
                          )}
                        </span>
                      </div>
                      {!esPizza && <span
                        className="font-bold text-foreground"
                        style={{ fontFamily: MONO }}
                      >
                        {fmt(s.price)}
                      </span>}
                    </label>
                    })()
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cantidad */}
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <span className="font-bold text-foreground">
                {esPizza ? "Porciones" : "Cantidad"}
              </span>
              <div className="flex items-center gap-2 bg-muted rounded-xl p-1">
                <button
                  onClick={() =>
                    setQty((q) => Math.max(1, q - 1))
                  }
                  className="w-9 h-9 max-md:w-11 max-md:h-11 rounded-lg bg-card flex items-center justify-center hover:bg-border transition-colors cursor-pointer shadow-sm"
                >
                  <Minus className="w-4 h-4" />
                </button>
                {/* Bloque 5 (punto 3): campo editable con el teclado; si se
                    escribe más del máximo se ajusta solo y avisa. */}
                <CantidadInput
                  value={qty}
                  max={max}
                  mensajeMaximo={mensajeMax}
                  onChange={setQty}
                />
                {/* Punto 4: al estar en el máximo el + queda deshabilitado y
                    el título del botón (y el mensaje de abajo) lo dicen. */}
                <button
                  onClick={() => setQty((q) => Math.min(q + 1, tope))}
                  disabled={agotado || enTope}
                  title={
                    agotado
                      ? "Agotado"
                      : enTope
                        ? mensajeMax
                        : "Aumentar cantidad"
                  }
                  className="w-9 h-9 max-md:w-11 max-md:h-11 rounded-lg bg-card flex items-center justify-center hover:bg-border transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Puntos 4 y 5: mensaje de máximo y aviso de stock bajo de
                bebidas, visibles sin tener que pasar el cursor. */}
            {!agotado && enTope && (
              <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                {mensajeMax}
              </p>
            )}
            {bajoStock && (
              <AvisoStockBajo max={max} className="mt-2 inline-block" />
            )}
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
            // Puntos 4 y 6: no disponible o agotado → sin agregar.
            disabled={noDisponible || agotado}
            className="w-full"
          >
            <ShoppingCart className="w-5 h-5" />{" "}
            {noDisponible
              ? "No disponible por ahora"
              : agotado
                ? "Agotado"
                : esPizza
                  ? `Agregar ${qty} ${qty === 1 ? "porción" : "porciones"} al carrito`
                  : "Agregar al carrito"}
          </PrimaryBtn>
        </div>
      </div>
      {relatedProducts.length > 0 && (
        <section className="mt-10" aria-labelledby="related-products-heading">
          <h2 id="related-products-heading" className="mb-4 text-2xl font-bold text-foreground">
            También te puede gustar
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {relatedProducts.map((related) => (
              <button
                key={related.id}
                type="button"
                onClick={() => onOpenRelated(related)}
                className="overflow-hidden rounded-xl border border-border bg-card text-left cursor-pointer hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
              >
                <img
                  src={related.image}
                  alt=""
                  loading="lazy"
                  className={`aspect-[4/3] w-full ${verImagenCompleta(related) ? "object-contain" : "object-cover"}`}
                />
                <div className="p-3">
                  <p className="font-semibold text-foreground">{related.name}</p>
                  <p className="text-sm font-semibold text-primary">{fmt(related.price)}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
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
  limiteDe,
  remove,
  clear,
  onOrder,
  isLoggedIn,
  clienteSesion,
  onRequireCheckoutLogin,
  onCheckoutUnauthorized,
  abrirCheckoutTrasLogin,
  onCheckoutAbierto,
  validandoStockCheckout,
  onVerificarStock,
  confirmationData,
  onClearConfirmation,
}: {
  cart: CartItem[];
  navigate: (s: Screen) => void;
  updateQty: (id: string, q: number) => void;
  /** Bloque 5 — Tope de cada línea con TODO el carrito; lo calcula App. */
  limiteDe: (linea: LineaLimiteRef) => LimiteLinea;
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
  ) => Promise<{ id: string; total: number }>;
  isLoggedIn: boolean;
  /** Nombre del usuario en sesión; se muestra en el resumen y la confirmación. */
  clienteSesion?: string;
  onRequireCheckoutLogin: () => void;
  onCheckoutUnauthorized: () => void;
  abrirCheckoutTrasLogin: boolean;
  onCheckoutAbierto: () => void;
  validandoStockCheckout: boolean;
  onVerificarStock: () => void;
  /** Resumen del pedido ya registrado que se viene a mostrar (llega
      del login, cuando un invitado inicia sesión con el pedido a
      medio hacer). */
  confirmationData?: PedidoResumen;
  /** Limpia `orderConfirmation` en App al salir de la confirmación. */
  onClearConfirmation?: () => void;
}) {
  const [payment, setPayment] = useState("Nequi");
  const [checkoutStep, setCheckoutStep] = useState<0 | 1 | 3>(0);
  const [comprobante, setComprobante] = useState<{ url: string; nombre: string } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
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
  /** Barrera anti doble envío: el `disabled` del botón no alcanza si llegan
      dos clics en el mismo tick. */
  const enviandoRef = useRef(false);
  const validacionPago = useValidacionFormulario(["comprobante", "hora-recogida"]);

  const cambiarMetodoPago = (metodo: string) => {
    setPayment(metodo);
    if (comprobante) {
      setComprobante(null);
      toast.warning("Cambiaste el método de pago. Quitamos el comprobante anterior. Sube el del nuevo método.");
    }
  };

  const cargarComprobanteCheckout = async (file: File) => {
    if (subiendo || enviandoRef.current) return;
    if (!isLoggedIn) {
      onRequireCheckoutLogin();
      return;
    }
    if (!obtenerToken()) {
      onCheckoutUnauthorized();
      return;
    }
    setSubiendo(true);
    try {
      const url = await subirArchivo(file, "comprobantes", { checkoutAuth: true });
      if (url) setComprobante({ url, nombre: file.name });
    } catch (error) {
      if (es401GenericoCheckout(error)) {
        onCheckoutUnauthorized();
      } else if ((error as ApiErrorConEstado).status !== 401) {
        toast.error(
          error instanceof Error ? error.message : "No se pudo subir el archivo.",
        );
      }
    } finally {
      setSubiendo(false);
    }
  };

  const cartTotal = (item: CartItem) =>
    (item.sizePrice + item.extrasPrice) * item.quantity;
  const subtotal = cart.reduce((s, i) => s + cartTotal(i), 0);
  // Un producto del carrito puede pasar a "No disponible" al recargar el
  // catálogo (el efecto de App refresca `item.product`). La línea NO se borra:
  // se marca, no se puede aumentar y el pago queda bloqueado hasta que el
  // cliente la quite o la deje en 0.
  const itemsNoDisponibles = cart.filter((i) => !productoDisponible(i.product));
  // Bloque 5 (punto 7): líneas por encima de su máximo —p. ej. un carrito
  // guardado de antes con menos stock o insumos—. Se marcan en rojo con su
  // mensaje y el pago queda deshabilitado hasta que el cliente las baje; el
  // carrito NUNCA se corrige en silencio.
  const lineasExcedidas = cart.filter((i) => {
    const { max } = limiteDe(i);
    return max !== undefined && i.quantity > max;
  });
  useEffect(() => {
    if (!abrirCheckoutTrasLogin || !isLoggedIn || !obtenerToken()) return;
    onCheckoutAbierto();
    if (itemsNoDisponibles.length || lineasExcedidas.length) {
      toast.warning("Algunos productos se agotaron o ya no tienen stock suficiente. Revisa tu carrito.");
    } else if (cart.length) {
      setCheckoutStep(1);
    }
  }, [abrirCheckoutTrasLogin, isLoggedIn, cart.length, itemsNoDisponibles.length, lineasExcedidas.length, onCheckoutAbierto]);
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
    const partes = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date());
    const reloj = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
    const ahora = Number(reloj.hour) * 60 + Number(reloj.minute);
    return m <= ahora;
  };

  // ── Horarios que ofrece el selector de recogida ──
  // La recogida es siempre hoy, así que solo se listan los horarios futuros
  // dentro del horario de atención (4:00 p. m. – 9:45 p. m.), en intervalos
  // de 15 minutos. El input nativo desapareció a propósito: mostraba "a. m."
  // y no se le podía ocultar.
  const ahoraPartes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const ahoraReloj = Object.fromEntries(ahoraPartes.map((parte) => [parte.type, parte.value]));
  const ahoraMinutos = Number(ahoraReloj.hour) * 60 + Number(ahoraReloj.minute);
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
  const qrDataUrl = useQrPago(payment, subtotal);

  const validarHoraRecogida = () => {
    if (sinHorariosHoy) return "Ya no hay horarios disponibles para hoy.";
    if (!horaRecogida) return "Selecciona la hora de recogida.";
    if (minutosDeHora(horaRecogida) === null || horaFueraDeRango(horaRecogida)) {
      return `La hora debe estar entre ${aperturaRecogidaTexto} y ${cierreRecogidaTexto}.`;
    }
    if (horaYaPaso(horaRecogida)) return "Esta hora no está disponible porque ya pasó.";
  };

  const errorComprobante = subiendo
    ? "Espera a que termine de subir el comprobante."
    : !comprobante ? "Sube el comprobante de pago." : undefined;
  const errorComprobanteVisible = validacionPago.estaVisible("comprobante") ? errorComprobante : undefined;
  const errorHoraVisible = validacionPago.estaVisible("hora-recogida") ? validarHoraRecogida() : undefined;

  /** Último paso: registra la venta con los datos del formulario (invitado)
      o con los de la sesión. Los datos YA se pidieron en el paso 3, así que
      aquí no se vuelve a interrumpir el flujo. */
  const handleConfirm = async () => {
    // Ya hay un pedido en curso: no se envía otro.
    if (enviandoRef.current) return;
    if (!isLoggedIn) {
      onRequireCheckoutLogin();
      return;
    }
    if (!obtenerToken()) {
      onCheckoutUnauthorized();
      return;
    }
    const errorHora = validarHoraRecogida();
    if (errorComprobante || errorHora) {
      validacionPago.enfocarPrimero({
        comprobante: errorComprobante,
        "hora-recogida": errorHora,
      });
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
    enviandoRef.current = true;
    try {
      const creada = await onOrder(
        payment,
        comprobante.url,
        [...cart],
        horaRecogida,
        nombreCliente || undefined,
        guestDocument.trim() || undefined,
        guestPhone.trim() || undefined,
      );
      // Resumen del pedido ANTES de vaciar el carrito: es lo que
      // muestra la pantalla de confirmación.
      setPedidoResumen({
        id: creada.id,
        items: [...cart],
        total: creada.total,
        nombre: nombreCliente,
        documento: guestDocument.trim() || undefined,
        telefono: guestPhone.trim() || undefined,
        hora: formatearHora(horaRecogida),
      });
      clear();
      setLoading(false);
      setCheckoutStep(0);
      setPedidoConfirmado(true);
    } catch (error) {
      if (es401GenericoCheckout(error)) {
        onCheckoutUnauthorized();
      } else if ((error as ApiErrorConEstado).status !== 401) {
        toast.error(error instanceof Error ? error.message : "No se pudo registrar el pedido.");
      }
    } finally {
      setLoading(false);
      enviandoRef.current = false;
    }
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
    const horaEtiqueta = formatearHora(pedidoResumen.hora);
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
                      {item.product.category.toLowerCase().includes("pizza")
                        ? `${item.quantity} ${item.quantity === 1 ? "porción" : "porciones"} · ${item.size}`
                        : `${item.size ? `${item.size} · ` : ""}x${item.quantity}`}
                    </p>
                    {item.product.category.toLowerCase().includes("pizza") && (
                      <p className="text-xs text-muted-foreground">
                        {fmt(item.sizePrice + item.extrasPrice)} / porción
                      </p>
                    )}
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
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <a
                    href={WHATSAPP_LOCAL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:underline"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5" /> {WHATSAPP_LOCAL_VISIBLE}
                  </a>
                </p>
                <p className="text-xs font-semibold text-primary">
                  Horario: jueves a domingo, de {aperturaRecogidaTexto} a {cierreRecogidaTexto}
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
          className="flex items-center gap-2 max-md:min-h-11 text-muted-foreground hover:text-foreground mb-6 cursor-pointer"
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
            {cart.map((item) => {
              const itemNoDisponible = !productoDisponible(item.product);
              // Bloque 5 — Tope de ESTA línea (la propia no se cuenta dos
              // veces como consumo) y las señales para pintar la fila.
              const limite = limiteDe(item);
              const max = limite.max;
              const excedida = max !== undefined && item.quantity > max;
              const enTope = max !== undefined && item.quantity >= max;
              const bajoStock =
                !limite.elaborado && max !== undefined && max > 0 && max <= 10;
              const mensajeMax =
                max === undefined
                  ? ""
                  : mensajeMaximoDe(
                    item.product.name,
                    max,
                    item.size || undefined,
                    limite.elaborado,
                  );
              return (
                <div
                  key={item.id}
                  // Punto 7: una línea pasada del máximo se marca en rojo.
                  className={`bg-card border rounded-2xl p-4 flex gap-4 ${excedida
                      ? "border-red-400 dark:border-red-700"
                      : itemNoDisponible
                        ? "border-zinc-400 dark:border-zinc-600"
                        : "border-border"
                    }`}
                >
                  <img
                    src={getImageUrl(item.product.image)}
                    alt={item.product.name}
                    onError={onErrorImagen}
                    className={`w-20 h-20 rounded-xl object-cover shrink-0 bg-muted ${itemNoDisponible ? "grayscale opacity-60" : ""}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-foreground">
                          {item.product.name}
                        </h3>
                        {/* Estado del producto HOY en el catálogo: la línea se
                          marca pero no se borra sola. */}
                        <EstadoMenuBadge
                          estado={estadoDeProducto(item.product)}
                          className="mt-1.5"
                        />
                        {item.product.category.toLowerCase().includes("pizza") ? (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.quantity} {item.quantity === 1 ? "porción" : "porciones"} · {item.size}
                          </p>
                        ) : item.size ? (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.size}
                          </p>
                        ) : null}
                        {item.selectedExtras.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            + {item.selectedExtras.join(", ")}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => remove(item.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors cursor-pointer p-1 max-md:p-3.5 max-md:-m-2.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mt-3">
                      <div className="flex items-center gap-2 bg-muted rounded-xl p-0.5">
                        <button
                          onClick={() =>
                            updateQty(item.id, item.quantity - 1)
                          }
                          className="w-7 h-7 max-md:w-11 max-md:h-11 rounded-lg bg-card flex items-center justify-center hover:bg-border transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        {/* Bloque 5 (punto 3): campo editable con el teclado;
                          más del máximo se ajusta solo y avisa. */}
                        <CantidadInput
                          value={item.quantity}
                          max={max}
                          mensajeMaximo={mensajeMax}
                          onChange={(n) => updateQty(item.id, n)}
                        />
                        {/* Punto 4: no disponible o ya en el máximo → no se
                          puede aumentar (el título lleva el mensaje). */}
                        <button
                          onClick={() =>
                            updateQty(item.id, item.quantity + 1)
                          }
                          disabled={itemNoDisponible || enTope}
                          title={
                            itemNoDisponible
                              ? "No disponible por ahora"
                              : enTope
                                ? mensajeMax
                                : "Aumentar cantidad"
                          }
                          className="w-7 h-7 max-md:w-11 max-md:h-11 rounded-lg bg-card flex items-center justify-center hover:bg-border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-end gap-6 max-md:gap-4 ml-auto">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Precio unitario</p>
                          <p className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>
                            {fmt(item.sizePrice + item.extrasPrice)}
                            {item.product.category.toLowerCase().includes("pizza") ? " / porción" : ""}
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
                    {/* Bloque 5 (puntos 4, 5 y 7): mensaje de máximo —rojo si
                      la línea pasa del máximo, ámbar si está en él— y aviso
                      de stock bajo de bebidas, visibles sin el cursor. */}
                    {enTope && (
                      <p
                        className={`mt-2 text-xs font-semibold ${excedida
                            ? "text-red-600 dark:text-red-400"
                            : "text-amber-700 dark:text-amber-400"
                          }`}
                      >
                        {mensajeMax}
                      </p>
                    )}
                    {bajoStock && (
                      <AvisoStockBajo max={max} className="mt-2 inline-block" />
                    )}
                  </div>
                </div>
              );
            })}
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
              {/* Un producto del carrito dejó de estar disponible: no se
                  puede pagar hasta que el cliente lo quite (la línea no se
                  borra sola). */}
              {itemsNoDisponibles.length > 0 && (
                <p className="mb-3 text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl px-3 py-2 text-center">
                  Quita los productos no disponibles para continuar
                </p>
              )}
              {/* Bloque 5 (punto 7): una línea pasó de su máximo (carrito
                  guardado de antes); que el cliente la baje para pagar. El
                  carrito no se corrige en silencio. */}
              {lineasExcedidas.length > 0 && (
                <p className="mb-3 text-sm font-semibold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 rounded-xl px-3 py-2 text-center">
                  Baja las cantidades que pasan del máximo para continuar
                </p>
              )}
              <PrimaryBtn
                // El paso de pago solo se abre desde una sesión autenticada.
                onClick={() => {
                  if (!isLoggedIn) {
                    onRequireCheckoutLogin();
                    return;
                  }
                  if (!obtenerToken()) {
                    onCheckoutUnauthorized();
                    return;
                  }
                  onVerificarStock();
                }}
                size="lg"
                disabled={
                  itemsNoDisponibles.length > 0 ||
                  lineasExcedidas.length > 0 ||
                  validandoStockCheckout
                }
                className="w-full"
              >
                <CreditCard className="w-5 h-5" />
                {validandoStockCheckout ? "Revisando disponibilidad…" : "Proceder al pago"}
              </PrimaryBtn>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal step 1: Resumen + método de pago ── */}
      <AnimatePresence>
        {checkoutStep === 1 && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center sm:p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="bg-card w-full min-h-screen sm:min-h-0 sm:rounded-2xl sm:w-[94vw] sm:max-w-none shadow-2xl border border-border sm:my-4"
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
                    className="p-1.5 max-md:p-3.5 max-md:-m-2 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
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
                            src={getImageUrl(item.product.image)}
                            alt={item.product.name}
                            onError={onErrorImagen}
                            className="w-10 h-10 rounded-lg object-cover shrink-0 bg-muted"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.product.category.toLowerCase().includes("pizza")
                                ? `${item.quantity} ${item.quantity === 1 ? "porción" : "porciones"} · ${item.size}`
                                : `${item.size ? `${item.size} · ` : ""}x${item.quantity}`}
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
                              {item.product.category.toLowerCase().includes("pizza") ? " / porción" : ""}
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
                  {/* Método de pago, comprobante y recogida */}
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
                              disabled={subiendo || loading}
                              onChange={() => cambiarMetodoPago(m)}
                            />
                            <span className="text-sm font-medium text-foreground">
                              {m}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Datos de pago · {payment}</p>
                      <div className="bg-muted/50 rounded-2xl p-4 border border-border">
                        {PAYMENT_INFO[payment]?.lines.map((linea) => <p key={linea} className="text-sm font-medium text-foreground">{linea}</p>)}
                        <p className="mt-2 text-sm text-muted-foreground">Llave de la cuenta: <strong className="text-foreground">{PAYMENT_INFO[payment]?.llave}</strong></p>
                      </div>
                      <BloqueQrPago payment={payment} monto={subtotal} qrDataUrl={qrDataUrl} />
                    </div>

                    <div
                      ref={validacionPago.refCampo("comprobante")}
                      tabIndex={-1}
                      role="group"
                      aria-label="Comprobante de pago"
                      {...validacionPago.ariaCampo("comprobante", errorComprobanteVisible)}
                    >
                      <CargaComprobanteCheckout
                        monto={subtotal}
                        comprobante={comprobante}
                        onQuitarComprobante={() => setComprobante(null)}
                        subiendo={subiendo}
                        fileRef={fileRef}
                        onFileChange={(file) => void cargarComprobanteCheckout(file)}
                      />
                      {errorComprobanteVisible && (
                        <p id={validacionPago.idError("comprobante")} role="alert" className="mt-1.5 text-xs font-medium text-red-500">
                          {errorComprobanteVisible}
                        </p>
                      )}
                    </div>

                    {/* Hora de recogida: dos selects (hora y minutos de 15 en
                      15), siempre en p. m., de 4:00 p. m. a 9:45 p. m., y solo
                      con los horarios que aún no pasaron hoy. */}
                    <div
                      ref={sinHorariosHoy ? validacionPago.refCampo("hora-recogida") : undefined}
                      tabIndex={sinHorariosHoy ? -1 : undefined}
                      role="group"
                      aria-label="Hora de recogida"
                      {...(sinHorariosHoy ? validacionPago.ariaCampo("hora-recogida", errorHoraVisible) : {})}
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                        Hora de recogida *
                      </p>
                      <div className="mb-3 border-l-2 border-primary/60 pl-3 text-sm text-muted-foreground">
                        <p>
                          Atendemos de <strong className="text-foreground">{aperturaRecogidaTexto}</strong> a{" "}
                          <strong className="text-foreground">{cierreRecogidaTexto}</strong>
                        </p>
                        <p className="text-xs mt-0.5">
                          El último horario de recogida es{" "}
                          <strong className="text-foreground">{ultimaRecogidaTexto}</strong>
                        </p>
                      </div>
                      <div
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-muted focus-within:ring-2 focus-within:ring-primary/30 transition-all ${errorHoraVisible || horaFueraDeRango(horaRecogida)
                            ? "border-red-400 focus-within:ring-red-300"
                            : "border-border"
                          }`}
                      >
                        <span className="text-base shrink-0">🕐</span>
                        <select
                          ref={!sinHorariosHoy ? validacionPago.refCampo("hora-recogida") : undefined}
                          {...validacionPago.ariaCampo("hora-recogida", errorHoraVisible)}
                          value={seleccionValida && horaSel !== null ? horaSel : ""}
                          disabled={sinHorariosHoy}
                          aria-label={`Hora de recogida, de ${aperturaRecogidaTexto} a ${ultimaRecogidaTexto}`}
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
                          className="flex-1 max-md:min-h-11 max-md:-my-2.5 bg-transparent text-sm text-foreground focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                        >
                          <option value="" disabled>
                            --:--
                          </option>
                          {horasDisponibles.map((h) => (
                            <option key={h} value={h}>
                              {formatearHora(`${h}:00`)}
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
                          className="w-14 max-md:min-h-11 max-md:-my-2.5 bg-transparent text-sm text-foreground focus:outline-none cursor-pointer disabled:cursor-not-allowed"
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
                      {errorHoraVisible ? (
                        <p id={validacionPago.idError("hora-recogida")} role="alert" className="mt-1.5 text-xs font-medium text-red-500">
                          {errorHoraVisible}
                        </p>
                      ) : sinHorariosHoy ? (
                        <p className="text-xs mt-1.5 font-medium flex items-center gap-1 text-red-500">
                          ⚠ Ya no hay horarios disponibles para hoy
                        </p>
                      ) : (
                        horaRecogida && (
                          <p
                            className={`text-xs mt-1.5 font-medium flex items-center gap-1 ${horaYaPaso(horaRecogida)
                                ? "text-red-500"
                                : horaFueraDeRango(horaRecogida)
                                  ? "text-red-500"
                                  : "text-muted-foreground"
                              }`}
                          >
                            {horaFueraDeRango(horaRecogida)
                              ? `⚠ Esta hora está fuera de nuestro horario de atención (${aperturaRecogidaTexto} – ${cierreRecogidaTexto})`
                              : horaYaPaso(horaRecogida)
                                ? "⚠ Esta hora no está disponible — ya pasó"
                                : `Recogerás a las ${formatearHora(horaRecogida)}`}
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
                    className="flex-1 py-2.5 max-md:min-h-11 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="flex-1 py-2.5 max-md:min-h-11 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    {loading
                      ? "Enviando..."
                      : "Enviar pedido"}
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
                      Documento <MarcaObligatorio />
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
                      className={`w-full px-4 py-2.5 bg-muted rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${verErrDoc ? "border-red-400 bg-red-50/30" : "border-border"
                        }`}
                    />
                    <p
                      id={verErrDoc ? validacionDatos.idError("documento") : undefined}
                      className={`text-xs mt-1 ${verErrDoc ? "text-red-500 dark:text-red-400" : "text-muted-foreground"
                        }`}
                    >
                      {verErrDoc ?? "Entre 6 y 10 dígitos"}
                    </p>
                  </div>

                  {/* 2) Nombre — obligatorio. */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Nombre completo <MarcaObligatorio />
                    </label>
                    <input
                      value={guestName}
                      onChange={(e) => {
                        setGuestName(filtrarNombre(e.target.value));
                        setTocadoNombre(true);
                      }}
                      onBlur={() => { setGuestName(normalizarNombrePersona(guestName)); setTocadoNombre(true); }}
                      onKeyDown={validacionDatos.onKeyDownCampo("nombre", {
                        validar: () => errNombre,
                      })}
                      placeholder="Ej: Laura Martínez"
                      ref={validacionDatos.refCampo("nombre")}
                      {...validacionDatos.ariaCampo("nombre", verErrNom)}
                      className={`w-full px-4 py-2.5 bg-muted rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${verErrNom ? "border-red-400 bg-red-50/30" : "border-border"
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
                      className={`w-full px-4 py-2.5 bg-muted rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${verErrTel ? "border-red-400 bg-red-50/30" : "border-border"
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
  perfilPendiente,
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
  perfilPendiente: boolean;
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
              className="max-md:min-h-11 max-md:inline-flex max-md:items-center max-md:justify-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer transition-colors disabled:opacity-60"
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
          <div className={`w-16 h-16 rounded-full ${perfilPendiente ? "bg-muted border border-border" : loggedInUser?.avatarColor ?? "bg-blue-600"} text-white flex items-center justify-center text-2xl font-bold shrink-0 shadow-sm`}>
            {perfilPendiente ? null : loggedInUser?.iniciales ?? "S"}
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="text-xl font-bold text-foreground"
              style={{ fontFamily: SERIF }}
            >
              {loggedInUser?.nombre ?? (perfilPendiente ? "Cargando…" : "—")}
            </h2>
            <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {loggedInUser ? loggedInRoleName : "Cliente"}
            </span>
          </div>
          {!editando && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0 ml-auto">
              <button
                onClick={() => setShowCambiarContrasena(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 max-md:min-h-11 border border-border bg-white dark:bg-card text-foreground text-sm font-semibold rounded-xl hover:bg-muted active:scale-95 transition-all cursor-pointer shrink-0"
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
                className="inline-flex items-center gap-1.5 px-4 py-2 max-md:min-h-11 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
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
                className="inline-flex items-center gap-1.5 px-4 py-2 max-md:min-h-11 border border-border bg-white dark:bg-card text-foreground text-sm font-semibold rounded-xl opacity-60 cursor-not-allowed shrink-0"
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
              {loggedInUser?.nombre ?? (perfilPendiente ? "Cargando…" : "—")}
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
                className="flex-1 flex items-center justify-center gap-2 py-2.5 max-md:min-h-11 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button
                onClick={() => void handleGuardar()}
                disabled={guardando}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 max-md:min-h-11 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 cursor-pointer transition-all disabled:opacity-60"
              >
                <Check className="w-4 h-4" /> {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => navigate("catalog")}
                className="flex items-center gap-2 px-5 py-2.5 max-md:min-h-11 bg-muted text-foreground rounded-xl text-sm font-semibold hover:bg-border cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Volver al Menú
              </button>
              {isStaff && (
                <button
                  onClick={() => navigate(adminHomeScreen)}
                  className="flex items-center gap-2 px-5 py-2.5 max-md:min-h-11 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-semibold hover:bg-primary/20 cursor-pointer transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" /> Ir a Administración
                </button>
              )}
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-5 py-2.5 max-md:min-h-11 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 cursor-pointer transition-colors sm:ml-auto"
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

// ─────────────────────────── LOGIN ───────────────────────────

// ─────────────────────────── REGISTER ───────────────────────────

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
      estado: "Disponible",
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
// Va anclada al rol semilla `ROL-001` y NO se aplica
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

// Usuarios y clientes se cargan desde el backend en sus respectivas pantallas.

// ── Empleados (API) ──────────────────────────────────────────────────────
// Los empleados, sus cargos y su historial de contrataciones viven en la base
// (Producción > Empleados). Los datos de prueba que quedaron en el navegador NO
// se suben: se copian UNA vez a `-respaldo-empleados` (mismo patrón que
// `-respaldo-cpn`) y la clave original deja de usarse. No se borra ni se
// sobrescribe nada.
const EMPLEADOS_STORAGE_KEY = "sivpro.empleados.v1";
const EMPLEADOS_RESPALDO_KEY = `${EMPLEADOS_STORAGE_KEY}-respaldo-empleados`;
const respaldarEmpleadosLocales = () => {
  try {
    if (localStorage.getItem(EMPLEADOS_RESPALDO_KEY) === null) {
      const legado = localStorage.getItem(EMPLEADOS_STORAGE_KEY);
      if (legado !== null) localStorage.setItem(EMPLEADOS_RESPALDO_KEY, legado);
    }
  } catch {
    // Almacenamiento bloqueado: no se borra ni se sobrescribe nada.
  }
};
respaldarEmpleadosLocales();

// ── Categorías de producto (API) ─────────────────────────────────────────
// Desde la conexión a la API, la pantalla de Categoría Producto lee y escribe
// en tb_categoria_productos (GET /categorias-productos/gestion). La lista que
// vivía en localStorage (`sivpro.categorias.v1`, ids "CAT-00x") NO se sube a
// la base: se copia UNA vez a `-respaldo-categorias` (mismo patrón que
// `-respaldo-cpn`) y la clave original deja de usarse.
const CATEGORIAS_STORAGE_KEY = "sivpro.categorias.v1";
const CATEGORIAS_RESPALDO_KEY = `${CATEGORIAS_STORAGE_KEY}-respaldo-categorias`;
const respaldarCategoriasLocales = () => {
  try {
    if (localStorage.getItem(CATEGORIAS_RESPALDO_KEY) === null) {
      const legado = localStorage.getItem(CATEGORIAS_STORAGE_KEY);
      if (legado !== null) localStorage.setItem(CATEGORIAS_RESPALDO_KEY, legado);
    }
  } catch {
    // Almacenamiento bloqueado: no se borra ni se sobrescribe nada.
  }
};
respaldarCategoriasLocales();

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
//   sivpro.fichasProductos.v1  → fichas técnicas por producto
const ORDENES_PRODUCCION_STORAGE_KEY = "sivpro.ordenesProduccion.v1";
const INSUMOS_STORAGE_KEY = "sivpro.insumos.v1";
const FICHAS_STORAGE_KEY = "sivpro.fichasProductos.v1";
const NO_CONFORMIDADES_STORAGE_KEY = "sivpro.noConformidades.v1";
// Respaldo único de la fase 2 (insumos, fichas y órdenes pasan a la API).
const INSUMOS_RESPALDO_FASE2_KEY = `${INSUMOS_STORAGE_KEY}-respaldo-fase2`;
const FICHAS_RESPALDO_FASE2_KEY = `${FICHAS_STORAGE_KEY}-respaldo-fase2`;
const ORDENES_RESPALDO_FASE2_KEY = `${ORDENES_PRODUCCION_STORAGE_KEY}-respaldo-fase2`;

// Respaldo único de la fase 3 (proveedores, órdenes de compra y compras pasan
// a la API). Estas tres listas nunca se persistieron en el navegador (vivían
// en semillas en memoria), así que el respaldo copia SOLO si alguna clave
// legada llegara a existir: nunca borra nada ni sobrescribe un respaldo.
const PROVEEDORES_RESPALDO_FASE3_KEY = "sivpro.proveedores.v1-respaldo-fase3";
const ORDENES_COMPRA_RESPALDO_FASE3_KEY = "sivpro.ordenesCompra.v1-respaldo-fase3";
const COMPRAS_RESPALDO_FASE3_KEY = "sivpro.compras.v1-respaldo-fase3";

const respaldarDatosComprasFase3 = () => {
  try {
    const parejas: [string, string[]][] = [
      [PROVEEDORES_RESPALDO_FASE3_KEY, ["sivpro.proveedores.v1"]],
      [ORDENES_COMPRA_RESPALDO_FASE3_KEY, ["sivpro.ordenesCompra.v1", "sivpro.ordenCompra.v1"]],
      [COMPRAS_RESPALDO_FASE3_KEY, ["sivpro.compras.v1", "sivpro.gestiones.v1"]],
    ];
    for (const [respaldo, originales] of parejas) {
      if (localStorage.getItem(respaldo) !== null) continue;
      for (const original of originales) {
        const legado = localStorage.getItem(original);
        if (legado !== null) {
          localStorage.setItem(respaldo, legado);
          break;
        }
      }
    }
  } catch {
    // Almacenamiento bloqueado: no se borra ni se sobrescribe nada.
  }
};
respaldarDatosComprasFase3();

/** Copia los datos locales de insumos, fichas y órdenes antes de que dejen de
    leerse del navegador. Una sola vez, sin borrar nada y sin sobrescribir un
    respaldo existente (mismo criterio que `respaldarDatosProductosFase1`). */
const respaldarDatosProduccionFase2 = () => {
  try {
    const parejas: [string, string][] = [
      [INSUMOS_RESPALDO_FASE2_KEY, INSUMOS_STORAGE_KEY],
      [FICHAS_RESPALDO_FASE2_KEY, FICHAS_STORAGE_KEY],
      [ORDENES_RESPALDO_FASE2_KEY, ORDENES_PRODUCCION_STORAGE_KEY],
    ];
    for (const [respaldo, original] of parejas) {
      if (localStorage.getItem(respaldo) === null) {
        const legado = localStorage.getItem(original);
        if (legado !== null) localStorage.setItem(respaldo, legado);
      }
    }
  } catch {
    // Almacenamiento bloqueado: no se borra ni se sobrescribe nada.
  }
};
respaldarDatosProduccionFase2();

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


const esFichasValidas = (x: unknown) =>
  esObjeto(x) && Object.values(x).every((v) => Array.isArray(v));



// Productos no conformes: desde la conexión a la API ya no se leen ni se
// escriben en el navegador. Los registros locales eran de prueba y NO se suben
// a la base: se copian UNA vez a `-respaldo-cpn` (mismo patrón que la fase 2)
// y la clave original deja de usarse.
const NO_CONFORMIDADES_RESPALDO_KEY = `${NO_CONFORMIDADES_STORAGE_KEY}-respaldo-cpn`;
const respaldarNoConformidadesLocales = () => {
  try {
    if (localStorage.getItem(NO_CONFORMIDADES_RESPALDO_KEY) === null) {
      const legado = localStorage.getItem(NO_CONFORMIDADES_STORAGE_KEY);
      if (legado !== null) localStorage.setItem(NO_CONFORMIDADES_RESPALDO_KEY, legado);
    }
  } catch {
    // Almacenamiento bloqueado: no se borra ni se sobrescribe nada.
  }
};
respaldarNoConformidadesLocales();

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
const PRODUCTOS_RESPALDO_FASE1_KEY = `${PRODUCTOS_STORAGE_KEY}-respaldo-fase1`;
const FICHAS_RESPALDO_FASE1_KEY = `${FICHAS_STORAGE_KEY}-respaldo-fase1`;
const MIGRACION_FICHAS_FASE1_KEY = "sivpro.migracion.fichasProductos.fase1";

const esProductoValido = (x: unknown) =>
  esObjeto(x) &&
  typeof x.id === "string" &&
  typeof x.nombre === "string" &&
  typeof x.stockDisponible === "number";

const leerProductosParaMigracion = (): Producto[] => {
  try {
    const raw = localStorage.getItem(PRODUCTOS_RESPALDO_FASE1_KEY)
      ?? sessionStorage.getItem(PRODUCTOS_STORAGE_KEY);
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

/** Copia la información legada antes de inicializar cualquier estado nuevo.
    Nunca elimina datos del navegador y no sobrescribe un respaldo existente. */
const respaldarDatosProductosFase1 = () => {
  try {
    if (localStorage.getItem(PRODUCTOS_RESPALDO_FASE1_KEY) === null) {
      const productosLegados = sessionStorage.getItem(PRODUCTOS_STORAGE_KEY);
      if (productosLegados !== null) localStorage.setItem(PRODUCTOS_RESPALDO_FASE1_KEY, productosLegados);
    }
    if (localStorage.getItem(FICHAS_RESPALDO_FASE1_KEY) === null) {
      const fichasLegadas = localStorage.getItem(FICHAS_STORAGE_KEY);
      if (fichasLegadas !== null) localStorage.setItem(FICHAS_RESPALDO_FASE1_KEY, fichasLegadas);
    }
  } catch {
    // Si el almacenamiento está bloqueado no se elimina ni sobrescribe nada;
    // la carga desde API sigue separada y mostrará sus errores normalmente.
  }
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
const CHECKOUT_RETURN_STORAGE_KEY = "sivpro.checkout.return.v1";

const guardarRetornoCheckout = () => {
  try {
    localStorage.setItem(
      CHECKOUT_RETURN_STORAGE_KEY,
      JSON.stringify({ autorizado: true }),
    );
  } catch {
    // El checkout sigue bloqueado si el navegador no permite persistir el retorno.
  }
};

const consumirRetornoCheckout = (): boolean => {
  try {
    const raw = localStorage.getItem(CHECKOUT_RETURN_STORAGE_KEY);
    localStorage.removeItem(CHECKOUT_RETURN_STORAGE_KEY);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object"
    ) return false;
    if ("expira" in parsed && (typeof parsed.expira !== "number" || parsed.expira <= Date.now())) return false;
    if (!("autorizado" in parsed) || parsed.autorizado !== true) return false;
    return true;
  } catch {
    return false;
  }
};

const borrarRetornoCheckout = () => {
  try {
    localStorage.removeItem(CHECKOUT_RETURN_STORAGE_KEY);
  } catch {
    // El navegador puede bloquear el almacenamiento.
  }
};

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

const hayIdsProductoLegacyEnCarritos = (): boolean => {
  try {
    const contieneLegacy = (raw: string | null) => {
      if (!raw) return false;
      const parsed: unknown = JSON.parse(raw);
      const contiene = (items: unknown[]) => items.some((item) => {
        if (!item || typeof item !== "object") return false;
        const producto = (item as { product?: { id?: unknown } }).product;
        return typeof producto?.id === "string" && /^PROD-/i.test(producto.id);
      });
      if (Array.isArray(parsed)) return contiene(parsed);
      if (parsed && typeof parsed === "object") {
        return Object.values(parsed).some((items) => Array.isArray(items) && contiene(items));
      }
      return false;
    };
    return contieneLegacy(localStorage.getItem(CARRITO_STORAGE_KEY)) ||
      contieneLegacy(localStorage.getItem(CARRITOS_USUARIOS_STORAGE_KEY));
  } catch {
    return false;
  }
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
  respaldarDatosProductosFase1();
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
  const [facturaPedidoId] = useState(() => {
    const id = new URLSearchParams(window.location.search).get("factura");
    return id && /^[1-9]\d*$/.test(id) ? id : null;
  });
  // /licencias es pública y tiene URL propia: no espera a restaurar la sesión.
  const [arrancaEnLicencias] = useState(esRutaLicencias);
  const [pantallaPendiente, setPantallaPendiente] = useState(
    facturaPedidoId || arrancaEnLicencias ? null : sesionActiva?.screen ?? null,
  );
  const [screen, setScreen] = useState<Screen>(
    arrancaEnLicencias ? "licencias" : facturaPedidoId ? (sesionActiva ? "mis-pedidos" : "login") : sesionActiva ? "inicio" : "landing",
  );
  /** Venta cuya devolución se debe abrir ya lista. La pone el botón "Gestionar"
      de la tabla de ventas para no obligar a buscarla otra vez en el módulo. */
  const [devolucionAAbrir, setDevolucionAAbrir] = useState<string | null>(null);
  const [ordenAAbrir, setOrdenAAbrir] = useState<string | null>(null);
  /** Orden de producción cuyo DETALLE hay que abrir (A2.3): la pone el toast
      "Ver orden" de Insumos tras crear la orden automática de un producto
      insumo nuevo. */
  const [ordenDetalleAAbrir, setOrdenDetalleAAbrir] = useState<string | null>(null);
  const [ordenRecepcion, setOrdenRecepcion] =
    useState<OrdenCompra | null>(null);
  const [ordenDetalle, setOrdenDetalle] = useState<OrdenCompra | null>(null);
  const [ordenAEditar, setOrdenAEditar] = useState<OrdenCompra | null>(null);
  const [ordenCompraItemsIniciales, setOrdenCompraItemsIniciales] = useState<OrdenItem[]>([]);
  const [ordenCompraPage, setOrdenCompraPage] = useState(1);
  // El carrito arranca desde lo que quedó guardado: sin esto, recargar la
  // página, cambiar de categoría o abrir el detalle de otro producto borraba
  // lo que el cliente había agregado sin haber iniciado sesión. El catálogo y
  // la compra no cambian: solo se recupera el estado que ya estaba en pantalla.
  const [cart, setCart] = useState<CartItem[]>(() =>
    sesionActiva ? leerCarritosDeUsuarios()[sesionActiva.userId] ?? [] : leerCarritoGuardado(),
  );
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(sesionActiva !== null);
  // La sesión persistida no se invalida hasta recibir /auth/me. Así el primer
  // render con `usuarios` todavía vacío no se confunde con una sesión inválida.
  const [restauracionSesionLista, setRestauracionSesionLista] = useState(!sesionActiva);
  // Sesión restaurándose (F5): hay sesión guardada y GET /auth/me todavía no
  // terminó, así que los roles de la sesión aún no llegan. Mientras dure NO se
  // pinta el inicio/dashboard (ni el chip "sin rol" ni el bloque "Sin rol
  // asignado"/"Sin módulos asignados"): solo un indicador de carga. La sesión
  // NO se cierra por recargar; si /auth/me responde 401 el flujo de restauración
  // la cierra como siempre.
  const sesionRestaurandose =
    isLoggedIn && sesionActiva !== null && !restauracionSesionLista;
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [ventasCargando, setVentasCargando] = useState(true);
  const [ventasError, setVentasError] = useState<string | null>(null);
  const ventasSolicitudIdRef = useRef(0);
  const ventasFallosConsecutivosRef = useRef(0);
  // The legacy guest auto-submit branch is retained but has no producer.
  const pendingOrder: PendingOrder | null = null;
  const [abrirCheckoutTrasLogin, setAbrirCheckoutTrasLogin] = useState(false);
  const [validandoStockCheckout, setValidandoStockCheckout] = useState(false);
  const validacionStockCheckoutRef = useRef(false);
  const [orderConfirmation, setOrderConfirmation] = useState<PedidoResumen | null>(null);
  const [loginNotice, setLoginNotice] = useState(false);
  // Correo que queda precargado en "Iniciar sesión" cuando se llega desde el
  // cambio de contraseña: la sesión acaba de cerrarse y así el usuario solo
  // tiene que escribir la clave nueva. Vive aquí (y no dentro de LoginScreen)
  // porque quien lo conoce es el flujo que cierra la sesión.
  const [loginEmailPre, setLoginEmailPre] = useState("");
  // Mensaje verde que se pinta en "Iniciar sesión" (p. ej. "Contraseña creada.
  // Ya puedes iniciar sesión." al llegar desde la invitación de empleado).
  const [loginMensajeExito, setLoginMensajeExito] = useState("");
  // Token de la invitación de empleado (?activar=<token>). Al leerlo se limpia
  // la URL de inmediato, aunque el enlace resulte inválido.
  const [activacionToken, setActivacionToken] = useState<string | null>(null);
  // Periodo del INICIO del empleado (Diario por defecto; el Dashboard del admin
  // sigue en Semanal). Vive aquí y no en DashboardScreen para que se conserve
  // al cambiar de rol con el selector del encabezado: el componente puede
  // desmontarse al cambiar de pantalla y perdería su estado interno.
  const [periodoInicio, setPeriodoInicio] = useState<Periodo>("dia");
  // Catálogo de Productos del panel: solo se llena desde /productos/gestion
  // con sesión activa; un error no se reemplaza por datos de ejemplo.
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosCargando, setProductosCargando] = useState(false);
  const [errorCargaProductos, setErrorCargaProductos] = useState<string | null>(null);
  const [productosGestionCargados, setProductosGestionCargados] = useState(false);
  // Catálogo público independiente del almacenamiento local de Gestión de Productos.
  const [productosCatalogo, setProductosCatalogo] = useState<Producto[]>([]);
  const [categoriasCatalogo, setCategoriasCatalogo] = useState<CategoriaProducto[]>([]);
  // Estado de la carga del catálogo público (landing / Ver Menú). Si la API no
  // responde, el aviso fijo informa al usuario y ofrece reintentar sin que la
  // página se rompa ni cambie de diseño en el caso normal.
  const [catalogoCargando, setCatalogoCargando] = useState(true);
  const [catalogoError, setCatalogoError] = useState<string | null>(null);
  // Fichas técnicas por producto. Las crea Gestión de Productos y las lee
  // Orden de Producción para saber qué insumos (y Productos Insumo) consume
  // cada plato de un pedido. Desde la fase 2 viven en la API: el estado arranca
  // vacío y lo llena `cargarInsumosFichas` (GET /fichas/vigentes).
  const [fichasPorProducto, setFichasPorProducto] = useState<FichasPorProducto>({});
  // Órdenes de producción (API). Antes vivían dentro de OrdenProduccionScreen y
  // después en localStorage; ahora la lista viene de GET /ordenes-produccion.
  const [ordenesProduccion, setOrdenesProduccion] = useState<OrdenProduccion[]>([]);
  // Productos no conformes (API, GET /productos-no-conformes). Viven en App
  // porque los leen CPN, el detalle de Orden de Producción y el Dashboard.
  const [noConformidades, setNoConformidades] = useState<NoConformidad[]>([]);
  const [noConformesCargando, setNoConformesCargando] = useState(false);
  const [errorNoConformes, setErrorNoConformes] = useState<string | null>(null);
  const [noConformesCargados, setNoConformesCargados] = useState(false);
  // Categorías de producto de la gestión (API, GET /categorias-productos/gestion):
  // activas e inactivas, con sus productos asociados. Solo las usa la pantalla
  // de Categoría Producto; el resto de la app usa `categoriasCatalogo`.
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [categoriasCargando, setCategoriasCargando] = useState(false);
  const [errorCategorias, setErrorCategorias] = useState<string | null>(null);
  // Catálogo del picker de pedidos (VentasScreen) y del canje de devoluciones,
  // armado con el estado `productos` en vez del mock `PRODUCTS`: los nombres
  // ("Pizza Jamon") son los del panel, así el detalle de la venta resuelve el
  // Producto real (id y stock) al crear la orden de producción.
  const productosMenu = useMemo(
    () => productos.map((p) => productoACatalogo(p, categoriasCatalogo)),
    [productos, categoriasCatalogo],
  );
  const [userRole, setUserRole] = useState("Administrador");
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(sesionActiva?.userId ?? null);
  // Id del rol ACTIVO de la sesión. Se inicializa en el login y lo cambia el
  // menú "Cambiar de rol"; también se persiste en `sivpro.rolActivo.v1`.
  const [rolActivoId, setRolActivoId] = useState<string | null>(() =>
    sesionActiva
      ? sesionActiva.rolActivo ?? leerRolActivo(sesionActiva.userId)
      : null,
  );
  const recargarCatalogo = async ({ conservarCarrito = false } = {}) => {
    setCatalogoCargando(true);
    setCatalogoError(null);
    try {
      const { productos: filasProductos, categorias: filasCategorias } = await obtenerCatalogo();
      const teniaIdsAntiguos = hayIdsProductoLegacyEnCarritos();
      const productosApi = filasProductos.map(productoApiAProducto);
      const categoriasApi = filasCategorias.map(categoriaApiACategoria);
      setProductosCatalogo(productosApi);
      setCategoriasCatalogo(categoriasApi);
      const idsValidos = new Set(productosApi.map((p) => Number(p.id)));
      setCart((actuales) => {
        const validos = actuales
          .filter((item) => conservarCarrito || idsValidos.has(item.product.id))
          .map((item) => {
            const actualizado = productosApi.find((p) => Number(p.id) === item.product.id);
            if (actualizado) return { ...item, product: productoACatalogo(actualizado, categoriasApi) };
            return {
              ...item,
              product: { ...item.product, estado: "No disponible" as const, status: "no disponible" as const },
            };
          });
        if (validos.length < actuales.length) {
          toast.info("Se quitaron del carrito productos que ya no están disponibles en el catálogo.");
        }
        return validos;
      });
      if (teniaIdsAntiguos) toast.info("Se quitaron del carrito productos antiguos que ya no existen en el catálogo.");
    } catch (error) {
      console.error("No se pudo cargar el catálogo público:", error);
      const mensaje =
        error instanceof Error && error.message ? error.message : "No se pudo cargar el catálogo público.";
      setCatalogoError(mensaje);
      toast.error(mensaje);
      throw error;
    } finally {
      setCatalogoCargando(false);
    }
  };

  const cargarProductosGestion = async (): Promise<Producto[] | null> => {
    setProductosCargando(true);
    setErrorCargaProductos(null);
    try {
      const listado = await listarGestion();
      setProductos(listado);
      setProductosGestionCargados(true);
      return listado;
    } catch (error) {
      setErrorCargaProductos(mensajeErrorProductos(error, "No se pudieron cargar los productos."));
      setProductosGestionCargados(false);
      return null;
    } finally {
      setProductosCargando(false);
    }
  };

  /** Configuración de la categoría de un producto (tamaños de su ficha), con
      el catálogo que se pasa como argumento: las fichas de la API sólo traen
      las porciones del PRIMER tamaño y el resto se arma desde aquí. */
  const configDeProducto = (
    idProducto: string,
    productosCargados: Producto[],
  ): ConfigCategoria | null => {
    const p = productosCargados.find((x) => x.id === idProducto);
    return p ? configDeCategoria(p.idCategoria, p.categoriaNombre) : null;
  };

  /** Insumos, categorías de insumos y fichas vigentes (API). `productosCargados`
      es el catálogo ya leído: hace falta para derivar los tamaños de cada
      ficha. Si falla NO se vuelve a datos de ejemplo: queda el error con
      "Reintentar". */
  const cargarInsumosFichas = async (productosCargados?: Producto[]): Promise<boolean> => {
    setInsumosCargando(true);
    setErrorInsumos(null);
    try {
      const [categorias, datosInsumos, fichasVigentes] = await Promise.all([
        listarCategoriasInsumo(),
        listarInsumos(),
        obtenerFichasVigentes(),
      ]);
      setCategoriasInsumo(categorias);
      setInsumos(datosInsumos.insumos);
      // Las fichas de producto insumo ya vienen dentro de cada insumo; las de
      // producto (pizzas, lasañas) llegan por su cuenta y aquí se les añaden
      // sus "Porciones por tamaño".
      const base = productosCargados ?? productos;
      const fichasDeProducto = mapearFichasApi(
        fichasVigentes.filter((f) => f.id_insumo == null || f.id_insumo === ""),
        (id) => configDeProducto(id, base),
      );
      setFichasPorProducto({ ...datosInsumos.fichas, ...fichasDeProducto });
      return true;
    } catch (error) {
      setErrorInsumos(mensajeErrorInsumos(error, "No se pudieron cargar los insumos."));
      return false;
    } finally {
      setInsumosCargando(false);
    }
  };

  /** Órdenes de producción (API). */
  const cargarOrdenes = async (): Promise<boolean> => {
    setOrdenesCargando(true);
    setErrorOrdenes(null);
    try {
      setOrdenesProduccion(await listarOrdenesProduccion());
      return true;
    } catch (error) {
      setErrorOrdenes(mensajeErrorOrdenes(error, "No se pudieron cargar las órdenes de producción."));
      return false;
    } finally {
      setOrdenesCargando(false);
    }
  };

  /** Productos no conformes (API). */
  const cargarNoConformes = async (): Promise<boolean> => {
    setNoConformesCargando(true);
    setNoConformesCargados(false);
    setErrorNoConformes(null);
    try {
      setNoConformidades(await listarNoConformidades());
      return true;
    } catch (error) {
      setErrorNoConformes(mensajeErrorNoConformes(error, "No se pudieron cargar los productos no conformes."));
      return false;
    } finally {
      setNoConformesCargando(false);
      setNoConformesCargados(true);
    }
  };

  /** Categorías de producto de la gestión (API). */
  const cargarCategoriasGestion = async () => {
    setCategoriasCargando(true);
    setErrorCategorias(null);
    try {
      setCategorias(await listarCategoriasGestion());
    } catch (error) {
      setErrorCategorias(mensajeErrorCategorias(error, "No se pudieron cargar las categorías."));
    } finally {
      setCategoriasCargando(false);
    }
  };

  /** Proveedores (API, fase 3). */
  const cargarProveedores = async () => {
    setProveedoresCargando(true);
    setErrorProveedores(null);
    try {
      setProveedores(await listarProveedores());
    } catch (error) {
      setErrorProveedores(mensajeErrorProveedores(error, "No se pudieron cargar los proveedores."));
    } finally {
      setProveedoresCargando(false);
    }
  };

  /** Órdenes de compra (API, fase 3). */
  const cargarOrdenesCompra = async () => {
    setOrdenesCompraCargando(true);
    setOrdenesCompraCargadas(false);
    setErrorOrdenesCompra(null);
    try {
      setOrdenes(await listarOrdenesCompra());
    } catch (error) {
      setErrorOrdenesCompra(mensajeErrorOrdenesCompra(error, "No se pudieron cargar las órdenes de compra."));
    } finally {
      setOrdenesCompraCargando(false);
      setOrdenesCompraCargadas(true);
    }
  };

  /** Compras (API, fase 3). */
  const cargarCompras = async () => {
    setComprasCargando(true);
    setComprasCargadas(false);
    setErrorCompras(null);
    try {
      setGestiones(await listarCompras());
    } catch (error) {
      setErrorCompras(mensajeErrorCompras(error, "No se pudieron cargar las compras."));
    } finally {
      setComprasCargando(false);
      setComprasCargadas(true);
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !restauracionSesionLista) return;
    void (async () => {
      // Primero los productos: las fichas necesitan su categoría para armar
      // los tamaños de "Porciones por tamaño".
      const productosCargados = await cargarProductosGestion();
      await Promise.all([
        cargarInsumosFichas(productosCargados ?? productos),
        cargarOrdenes(),
        cargarNoConformes(),
        cargarProveedores(),
        cargarOrdenesCompra(),
        cargarCompras(),
      ]);
    })();
  }, [isLoggedIn, restauracionSesionLista]);

  // Las categorías de la gestión se cargan al entrar a su pantalla: el backend
  // exige el permiso "Ver" de Categoría de Producto y así nadie sin él recibe
  // un 403 de fondo.
  useEffect(() => {
    if (!isLoggedIn || !restauracionSesionLista || screen !== "cat-producto") return;
    void cargarCategoriasGestion();
  }, [isLoggedIn, restauracionSesionLista, screen]);

  useEffect(() => {
    if (!productosGestionCargados) return;
    try {
      if (localStorage.getItem(MIGRACION_FICHAS_FASE1_KEY) === "hecha") return;
      const legacy = leerProductosParaMigracion();
      const porIdLegacy = new Map(legacy.map((p) => [p.id, p.nombre]));
      const resultado: FichasPorProducto = { ...fichasPorProducto };
      const avisos: string[] = [];
      let cambio = false;
      for (const [idViejo, versiones] of Object.entries(fichasPorProducto)) {
        if (!/^PROD-/i.test(idViejo)) continue;
        const nombre = porIdLegacy.get(idViejo) ?? INITIAL_PRODUCTOS.find((p) => p.id === idViejo)?.nombre;
        const destino = nombre
          ? productos.find((p) => mismoNombre(p.nombre, nombre))
          : undefined;
        if (!destino) {
          avisos.push(nombre ?? idViejo);
          continue;
        }
        if (resultado[destino.id]) {
          avisos.push(`${nombre} (ya existe ficha para el ID ${destino.id})`);
          continue;
        }
        resultado[destino.id] = versiones.map((v) => ({
          ...v,
          destino: v.destino?.tipo === "producto" ? { ...v.destino, productoId: destino.id } : v.destino,
        }));
        delete resultado[idViejo];
        cambio = true;
      }
      if (cambio) setFichasPorProducto(resultado);
      localStorage.setItem(MIGRACION_FICHAS_FASE1_KEY, "hecha");
      if (avisos.length) toast.warning(`Fichas conservadas sin migrar: ${[...new Set(avisos)].join(", ")}`);
    } catch (error) {
      console.error("No se pudo completar la migración local de fichas:", error);
      toast.error("No se pudo migrar una parte de las fichas. Los datos originales se conservaron.");
    }
  }, [productosGestionCargados, productos]);

  useEffect(() => {
    void recargarCatalogo().catch(() => { });
  }, []);

  // SEO: título único por pantalla (sin librerías). Se actualiza al cambiar de
  // vista. Las pantallas públicas tienen título propio; las del panel usan el
  // de SCREEN_META; si no hay, se mantiene el título general del sistema.
  useEffect(() => {
    const titulosPublicos: Partial<Record<Screen, string>> = {
      landing: "La Sirena Pizza | Pizzas artesanales en Medellín",
      catalog: "Menú del restaurante | La Sirena Pizza",
      cart: "Tu carrito | La Sirena Pizza",
      "product-detail": "Detalle del producto | La Sirena Pizza",
      "mis-pedidos": "Mis pedidos | La Sirena Pizza",
      login: "Iniciar sesión | S.I.V.PRO",
      register: "Crear cuenta | La Sirena Pizza",
      licencias: "Licencias y reconocimientos | S.I.V.PRO",
      "client-profile": "Mi perfil | La Sirena Pizza",
    };
    const meta =
      titulosPublicos[screen] ??
      (SCREEN_META[screen] ? `${SCREEN_META[screen].title} | S.I.V.PRO` : undefined);
    document.title =
      meta ?? "S.I.V.PRO | Sistema de Ventas y Producción - La Sirena Pizza";
  }, [screen]);

  const aplicarProductoRespuesta = (producto: Producto, crear = false) => {
    setProductos((prev) => crear
      ? [producto, ...prev.filter((p) => p.id !== producto.id)]
      : prev.map((p) => p.id === producto.id ? producto : p));
  };

  const recargarCatalogoTrasCambio = async () => {
    try {
      await recargarCatalogo();
    } catch {
      // El guardado ya fue confirmado por el backend de Productos; el error
      // del catálogo público se muestra por recargarCatalogo y no lo revierte.
    }
  };

  const crearProductoEnServidor = async (producto: Producto) => {
    const creado = await crearProducto(productoPanelACreacion(producto));
    aplicarProductoRespuesta(creado, true);
    await recargarCatalogoTrasCambio();
    return creado;
  };

  const editarProductoEnServidor = async (producto: Producto) => {
    const anterior = productos.find((item) => item.id === producto.id);
    const guardarGaleria = !anterior ||
      JSON.stringify(imagenesDe(anterior)) !== JSON.stringify(imagenesDe(producto));
    const actualizado = await editarProducto(producto.id, productoPanelAEdicion(producto, guardarGaleria));
    aplicarProductoRespuesta(actualizado);
    await recargarCatalogoTrasCambio();
    return actualizado;
  };

  const cambiarEstadoEnServidor = async (id: string, estado: EstadoProductoManual) => {
    const resultado = await cambiarEstadoProducto(id, estado);
    aplicarProductoRespuesta(resultado.producto);
    await recargarCatalogoTrasCambio();
    return resultado;
  };

  // Categorías de producto: cada cambio confirmado por el backend actualiza la
  // lista de la gestión y refresca el catálogo público, para que landing,
  // Productos y Ventas lo vean sin F5.
  const aplicarCategoriaRespuesta = (categoria: CategoriaProducto) => {
    setCategorias((prev) => prev.some((c) => c.id === categoria.id)
      ? prev.map((c) => c.id === categoria.id ? categoria : c)
      : [...prev, categoria]);
  };

  const crearCategoriaEnServidor = async (datos: CategoriaGuardar) => {
    const creada = await crearCategoria(datos);
    aplicarCategoriaRespuesta(creada);
    await recargarCatalogoTrasCambio();
    return creada;
  };

  const editarCategoriaEnServidor = async (id: string, datos: CategoriaGuardar) => {
    const actualizada = await editarCategoria(id, datos);
    aplicarCategoriaRespuesta(actualizada);
    await recargarCatalogoTrasCambio();
    return actualizada;
  };

  const cambiarEstadoCategoriaEnServidor = async (id: string, estado: EstadoCategoria) => {
    const actualizada = await cambiarEstadoCategoria(id, estado === "Activo");
    aplicarCategoriaRespuesta(actualizada);
    await recargarCatalogoTrasCambio();
    return actualizada;
  };

  const eliminarCategoriaEnServidor = async (id: string) => {
    await eliminarCategoria(id);
    setCategorias((prev) => prev.filter((c) => c.id !== id));
    await recargarCatalogoTrasCambio();
  };

  const descontinuarProductoEnServidor = async (id: string) =>
    (await cambiarEstadoEnServidor(id, "Descontinuado")).producto;
  const [roles, setRoles] = useState<Rol[]>(leerRolesPersistidos);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

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

      clientes.forEach(cliente => {
        const clave = clavePersona(cliente.tipoDocumento, cliente.numeroDocumento, cliente.correo);
        const existente = porClave.get(clave);
        // Personal del panel (rol distinto de Cliente) no se pisa con su perfil de cliente.
        if (existente && existente.rolId && existente.rolId !== idRolCliente(roles)) return;
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
  }, [clientes, roles]);

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

    clientes.forEach(cliente => {
      const clave = clavePersona(cliente.tipoDocumento, cliente.numeroDocumento, cliente.correo);
      const existente = porClave.get(clave);
      if (existente && existente.rolId && existente.rolId !== idRolCliente(roles)) return;
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
  }, [usuarios, clientes, roles]);

  // Derived display values for top bar and sidebar permissions
  const loggedInUser = loggedInUserId ? usuarios.find(u => u.id === loggedInUserId) ?? null : null;
  const avatarGuardado = sesionActiva?.userId === loggedInUserId
    ? sesionActiva
    : null;
  const avatarParaHeader = sesionRestaurandose
    ? (avatarGuardado?.avatarInicial && avatarGuardado.avatarColor
      ? { iniciales: avatarGuardado.avatarInicial, avatarColor: avatarGuardado.avatarColor }
      : null)
    : loggedInUser
      ? { iniciales: loggedInUser.iniciales, avatarColor: loggedInUser.avatarColor }
      : null;
  const loggedInUserName = loggedInUser?.nombre ?? "Gloria";
  // Nombre con el que se guardan y se buscan los pedidos del usuario en sesión
  const pedidosUsuarioNombre =
    loggedInUser?.nombre ??
    (userRole === "Cliente" ? "Sebastián Gómez" : "Gloria Inés Vargas");
  // ── Sesión multi-rol ───────────────────────────────────────────────
  // La ficha de empleado de la cuenta de sesión, por DOCUMENTO (el correo es
  // editable; el documento no). `null` si la persona no tiene ficha.
  const correoSesion = loggedInUser?.correo.trim().toLowerCase() ?? "";

  // La autorización proviene de usuario.roles del backend. El catálogo local
  // solo aporta presentación; un rol que la API manda y la copia local no tiene
  // (p. ej. creado en otro PC) entra igual con sus permisos.
  const rolesSesion: Rol[] = armarRolesSesion(loggedInUser?.rolesSesionApi, roles);
  const esRolBaseSesion = (rol: Rol) => ["administrador", "cliente", "empleado"].includes(normalizarNombreRol(rol.nombre));
  const rolesDeTrabajo = rolesSesion.filter(rol => !esRolBaseSesion(rol));

  // Rol activo de sesión. El valor persistido por usuario se carga únicamente
  // al restaurar la sesión (F5); durante un login nuevo manda el rol inicial
  // decidido en handleLogin y los cambios manuales viven en el estado.
  const rolActivoIdValido =
    rolActivoId && rolesSesion.some(r => r.id === rolActivoId)
      ? rolActivoId
      : rolesSesion[0]?.id ?? null;
  const loggedInRol = rolesSesion.find(r => r.id === rolActivoIdValido) ?? null;
  const loggedInRoleName = loggedInRol?.nombre ?? userRole;
  // Permisos SOLO del rol activo: la sesión ya no fusiona los mapas de todos
  // los roles de la persona.
  const loggedInAccesos: AccesosMap = loggedInUser?.esSuperAdmin === true
    ? fullAccesos()
    : loggedInRol?.accesos ?? {};

  // § Dashboard por PERMISO, no por nombre de rol: la cuenta super admin
  // marcada por la API; los demás únicamente con
  // el privilegio "Ver" de "Dashboard::Dashboard" del rol activo. El rol
  // "Administrador" lo conserva porque su semilla (fullAccesos) ya incluye la
  // clave y la migración única "sivpro.migracion.dashboardPermiso.v1" se la
  // agrega a los datos viejos; si super admin se la quita, deja de verlo.
  const esSuperAdminSesion = loggedInUser?.esSuperAdmin === true;
  const hasDashboardAccess =
    esSuperAdminSesion || (loggedInAccesos[DASHBOARD_PERM_KEY]?.includes("Ver") ?? false);
  const adminHomeScreen: Screen = hasDashboardAccess ? "dashboard" : "inicio";

  // Cliente público = solo el rol "Cliente". Un empleado activo con contratación
  // vigente también trae Empleado y sus cargos, así que va al panel y ofrece el
  // cambio de rol; si está inactivo o sin contratación vigente, la API solo le
  // manda Cliente y entra como cliente.
  const esClientePublicoSesion =
    rolesSesion.length > 0 && rolesSesion.every(esRolCliente);
  const isStaff = isLoggedIn && loggedInUser !== null && !esClientePublicoSesion;

  // Historial de contrataciones de la sesión (Mi perfil). Sale de la API, no de
  // una lista local: `undefined` mientras carga o si la persona no es empleada.
  const [contratacionesSesion, setContratacionesSesion] = useState<Contratacion[] | undefined>(undefined);
  const [nombresRolesContratacion, setNombresRolesContratacion] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!isLoggedIn || !restauracionSesionLista || !loggedInUserId || esClientePublicoSesion) {
      setContratacionesSesion(undefined);
      return;
    }
    let cancelado = false;
    void obtenerMiContratacion()
      .then(({ contrataciones }) => {
        if (cancelado) return;
        const nombres = new Map<string, string>();
        for (const c of contrataciones) for (const r of c.roles) nombres.set(String(r.idRol), r.nombre);
        setNombresRolesContratacion(nombres);
        setContratacionesSesion(contrataciones.length === 0 ? undefined : contrataciones.map(c => ({
          id: String(c.idContrato),
          rolIds: c.roles.map(r => String(r.idRol)),
          fechaInicio: c.fechaInicio,
          fechaFinal: c.fechaFinal ?? "",
        })));
      })
      .catch(() => { if (!cancelado) setContratacionesSesion(undefined); });
    return () => { cancelado = true; };
  }, [isLoggedIn, restauracionSesionLista, loggedInUserId, esClientePublicoSesion]);
  const rolNombreDeContrato = (rolId: string) =>
    nombresRolesContratacion.get(rolId) ?? roles.find(r => r.id === rolId)?.nombre ?? rolId;

  // El selector refleja exactamente los otros roles asignados y activos que
  // llegaron en la respuesta de autenticación/perfil.
  const rolesParaCambiar = rolesDeTrabajo.filter(r => r.id !== loggedInRol?.id);

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
      canEdit: acts.includes("Editar"),
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
  const esMovil = useIsMobile(821);
  const [sidebarMovilAbierto, setSidebarMovilAbierto] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstNavRef = useRef<HTMLButtonElement | null>(null);

  // Un usuario sin ficha o sin rol activo no es una sesión válida. La cuenta
  // legacy de cliente es la única excepción porque no tiene ficha en usuarios.
  const hasValidSession = isLoggedIn && (
    (sesionActiva !== null && !restauracionSesionLista) ||
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

  const puedeVerPantallaPanel = (pantalla: Screen) => {
    if (pantalla === "dashboard" || pantalla === "sales-chart") return hasDashboardAccess;
    if (pantalla === "inicio") return !hasDashboardAccess;
    const permiso = SCREEN_PERM_KEY[pantalla];
    return !permiso || esSuperAdminSesion || canViewPermission(loggedInAccesos, permiso);
  };

  // Resuelve la pantalla antes de montarla, con los permisos del rol ya cargados.
  if (pantallaPendiente !== null && restauracionSesionLista && isLoggedIn) {
    const inicioSesion = isAdminRole ? adminHomeScreen : "landing";
    const pantalla = esPantalla(pantallaPendiente) ? pantallaPendiente : inicioSesion;
    // Estas vistas necesitan una orden seleccionada, que vive en memoria.
    const requiereOrden = pantalla === "recepcion-compra" || pantalla === "orden-detalle";
    const panelSinAcceso = ADMIN_SCREENS.includes(pantalla) &&
      (!isAdminRole || !puedeVerPantallaPanel(pantalla));
    setScreen(requiereOrden || panelSinAcceso ? inicioSesion : pantalla);
    setPantallaPendiente(null);
  }

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
  const [catalogCat, setCatalogCat] = useState<string | null>(null);
  // La página del catálogo vive aquí, igual que la categoría: si viviera dentro
  // de CatalogScreen se perdería al abrir el detalle de un producto (la pantalla
  // se desmonta) y al volver se restauraría el scroll guardado de la página 2
  // sobre el grid de la página 1, que es otra tanda de productos.
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [detalleOrigen, setDetalleOrigen] = useState<Screen>("landing");
  const [productoOrigenCatalogo, setProductoOrigenCatalogo] = useState<number>();
  // Órdenes de compra y compras (API, fase 3). Sin semillas: las cargan
  // `cargarOrdenesCompra`/`cargarCompras`; si falla queda el error con
  // "Reintentar" y no se vuelve a datos de ejemplo.
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [ordenesCompraCargando, setOrdenesCompraCargando] = useState(false);
  const [errorOrdenesCompra, setErrorOrdenesCompra] = useState<string | null>(null);
  const [ordenesCompraCargadas, setOrdenesCompraCargadas] = useState(false);
  const [gestiones, setGestiones] = useState<GestionCompra[]>([]);
  const [comprasCargando, setComprasCargando] = useState(false);
  const [errorCompras, setErrorCompras] = useState<string | null>(null);
  const [comprasCargadas, setComprasCargadas] = useState(false);
  // Catálogo de insumos (API). Sin semilla local: lo llena
  // `cargarInsumosFichas`; si falla se muestra el error con "Reintentar" y no
  // se vuelve a datos de ejemplo.
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [insumosCargando, setInsumosCargando] = useState(false);
  const [errorInsumos, setErrorInsumos] = useState<string | null>(null);
  // Categorías de insumos (API). Las usan Gestión de Insumos y el
  // "+ Crear insumo" de Compras; en los selectores solo entran las activas.
  const [categoriasInsumo, setCategoriasInsumo] = useState<CategoriaInsumo[]>([]);
  // Estado de carga de las órdenes de producción (API).
  const [ordenesCargando, setOrdenesCargando] = useState(false);
  const [errorOrdenes, setErrorOrdenes] = useState<string | null>(null);
  // Proveedores (API, fase 3). Sin semilla: los carga `cargarProveedores`.
  const [proveedores, setProveedores] = useState<ProveedorRef[]>([]);
  const [proveedoresCargando, setProveedoresCargando] = useState(false);
  const [errorProveedores, setErrorProveedores] = useState<string | null>(null);

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

  // Las órdenes de producción, los insumos y los productos no conformes ya NO
  // se guardan en localStorage: viven en la API (respaldos locales en las
  // claves `-respaldo-fase2` y `-respaldo-cpn`).

  // Las ventas se cargan al entrar a Ventas, al Dashboard, al Inicio y a
  // Estadísticas. El backend exige el permiso "Ver" de Ventas, salvo en la
  // pantalla de Ventas, que conserva su manejo de acceso existente.
  const puedeVerVentas =
    loggedInUser?.esSuperAdmin === true ||
    canViewPermission(loggedInAccesos, KEY("Ventas", "Ventas"));
  useEffect(() => {
    if (
      screen !== "ventas-pedidos" &&
      screen !== "dashboard" &&
      screen !== "inicio" &&
      screen !== "sales-chart"
    ) return;
    if (screen !== "ventas-pedidos" && !puedeVerVentas) return;
    let cargaEnCurso = false;
    setVentasCargando(true);
    setVentasError(null);

    const cargarVentas = async (cargaInicial: boolean) => {
      if (cargaEnCurso) return;
      cargaEnCurso = true;
      const solicitudId = ++ventasSolicitudIdRef.current;
      try {
        const filas = await obtenerVentasPanel();
        if (solicitudId !== ventasSolicitudIdRef.current) return;
        setVentas(filas);
        ventasFallosConsecutivosRef.current = 0;
        setVentasError(null);
      } catch (error) {
        if (solicitudId !== ventasSolicitudIdRef.current) return;
        ventasFallosConsecutivosRef.current += 1;
        console.error("[Ventas] No se pudieron cargar las ventas.", error);
        if (cargaInicial || ventasFallosConsecutivosRef.current >= 3) {
          const detalle = error instanceof Error ? error.message : "Intenta de nuevo más tarde.";
          setVentasError(detalle);
          if (cargaInicial) {
            toast.error(detalle || "No se pudieron cargar las ventas.");
          } else if (ventasFallosConsecutivosRef.current === 3) {
            toast.error("No se han podido actualizar las ventas tras varios intentos.");
          }
        }
      } finally {
        cargaEnCurso = false;
        if (solicitudId === ventasSolicitudIdRef.current && cargaInicial) setVentasCargando(false);
      }
    };

    void cargarVentas(true);
    // El backend puede completar automáticamente las ventas "Por entregar"
    // cuando llega su hora de recogida; el refresco mantiene la lista al día.
    const id = setInterval(() => void cargarVentas(false), 60_000);
    return () => clearInterval(id);
  }, [screen, puedeVerVentas]);

  // Las fichas técnicas tampoco se guardan en localStorage: se leen y escriben
  // en la API (`-respaldo-fase2` conserva la copia local de la fase 1).

  // ── Ventas → órdenes de producción (todo lo hace la API) ──
  // La orden de una venta la crea el backend al aceptarla (tipo "Pedido") y la
  // cancela al anularla. Los dos efectos locales que replicaban ese flujo
  // desaparecen; lo único que queda es recargar las órdenes cuando el ESTADO
  // de alguna venta cambia (aceptar, anular, pasar a devolución…),
  // comparándolo contra el valor anterior para no llamar en cada render ni en
  // cada cambio de la lista.
  const estadoVentasRef = useRef<Record<string, Venta["estado"]> | null>(null);
  useEffect(() => {
    const anterior = estadoVentasRef.current;
    const actual: Record<string, Venta["estado"]> = {};
    for (const v of ventas) actual[v.id] = v.estado;
    estadoVentasRef.current = actual;
    // La primera ejecución es la carga inicial, no un cambio de estado.
    if (anterior === null) return;
    const cambio = ventas.some((v) => anterior[v.id] !== undefined && anterior[v.id] !== v.estado);
    if (!cambio) return;
    void cargarOrdenes();
  }, [ventas]);

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
      window.history.replaceState(null, "", s === "licencias" ? RUTA_LICENCIAS : "/");
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

  useRutaLicencias(screen, navigate);

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

  /** Recarga insumos, fichas y órdenes desde la API tras una acción del módulo
      de Producción (crear un producto insumo, iniciar o completar una orden…):
      el stock de los insumos cambió en la base. */
  const recargarProduccion = async (): Promise<boolean> => {
    // CPN también: completar una preparación con merma crea su registro.
    const productosCargados = await recargarInventarioProductos();
    const resultados = await Promise.all([
      cargarInsumosFichas(productosCargados ?? productos),
      cargarOrdenes(),
      cargarNoConformes(),
    ]);
    return productosCargados !== null && resultados.every(Boolean);
  };

  const recargarInventarioProductos = async () => {
    const productosCargados = await cargarProductosGestion();
    await recargarCatalogoTrasCambio();
    return productosCargados;
  };

  /** Crear o eliminar un producto no conforme manual mueve stock en la base
      (producto de reventa o insumo): se recargan productos e insumos. */
  const recargarInventarioCpn = async () => {
    const productosCargados = await recargarInventarioProductos();
    await cargarInsumosFichas(productosCargados ?? productos);
  };

  /** "Ver orden" del toast de Insumos: salta a Orden de Producción con el
      detalle de la orden creada ya abierto. */
  const verOrdenProduccion = (idOrden: string) => {
    setOrdenDetalleAAbrir(idOrden);
    navigate("production-orders");
  };

  const openLogin = () => {
    setLoginNotice(false);
    setLoginEmailPre("");
    setLoginMensajeExito("");
    navigate("login");
  };

  // ── Invitación de empleado (?activar=<token>) ──────────────────────────
  // El enlace del correo abre la app con el token en la URL. Se lee UNA vez al
  // cargar y la URL se limpia al instante (history.replaceState), aunque el
  // enlace resulte vencido o ya usado: el token ya está en memoria. Detrás del
  // modal queda el INICIO DE SESIÓN (no la landing), que es a donde va el
  // empleado en cuanto termine de crear su contraseña.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("activar");
    if (!token) return;
    window.history.replaceState(null, "", "/");
    setActivacionToken(token);
    navigate("login");
  }, []);

  // ── Verificación de correo del registro (?verificar=<token>) ───────────
  // Igual que ?activar: se lee UNA vez, la URL se limpia al instante y se
  // confirma contra la API. Bien → login con el correo escrito y el aviso
  // verde; mal (vencido, ya usado) → login con el mensaje del backend.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("verificar");
    if (!token) return;
    window.history.replaceState(null, "", "/");
    // Se navega al login cuando responde la API: LoginScreen toma el correo
    // precargado solo al montarse.
    void verificarCorreo(token)
      .then(({ correo }) => {
        setLoginEmailPre(correo ?? "");
        setLoginMensajeExito("Correo verificado. Ya puedes iniciar sesión");
        toast.success("Correo verificado. Ya puedes iniciar sesión");
      })
      .catch((error) => {
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : "No se pudo verificar el correo.",
        );
      })
      .finally(() => navigate("login"));
  }, []);

  /** Fin del registro público: la cuenta queda pendiente de confirmar el
      correo, así que se va al login con el correo escrito y el aviso. */
  const trasRegistrarse = (correo: string, correoEnviado: boolean) => {
    const aviso = correoEnviado
      ? "Te enviamos un correo para confirmar tu cuenta"
      : "Tu cuenta quedó creada, pero no pudimos enviar el correo. Inicia sesión y usa «Reenviar correo de confirmación»";
    setLoginEmailPre(correo);
    setLoginMensajeExito(aviso);
    if (correoEnviado) toast.success(aviso);
    else toast.warning(aviso);
    navigate("login");
  };

  /** Fin de la activación: login con el correo ya escrito y el aviso verde. */
  const trasActivarCuenta = (correo: string) => {
    setActivacionToken(null);
    setLoginEmailPre(correo);
    setLoginMensajeExito("Contraseña creada. Ya puedes iniciar sesión");
    toast.success("Contraseña creada. Ya puedes iniciar sesión");
    navigate("login");
  };

  /** El enlace no sirve (vencido, ya usado o mal formado): salida al login. */
  const irALoginDesdeActivacion = () => {
    setActivacionToken(null);
    openLogin();
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

  const cierreSesionApiRef = useRef(false);
  const verificarStockYContinuar = async () => {
    const token = obtenerToken();
    if (!token || validacionStockCheckoutRef.current) return;
    validacionStockCheckoutRef.current = true;
    setValidandoStockCheckout(true);
    try {
      await recargarCatalogo({ conservarCarrito: true });
      if (obtenerToken() === token) setAbrirCheckoutTrasLogin(true);
    } catch {
      // El catálogo ya muestra el error. El cliente puede reintentar desde el carrito.
    } finally {
      validacionStockCheckoutRef.current = false;
      setValidandoStockCheckout(false);
    }
  };

  const handleLogin = (user: Usuario): { ok: boolean; mensaje?: string } => {
    setUsuarios(prev => prev.map(u => u.id === user.id ? {
      ...u,
      esSuperAdmin: user.esSuperAdmin === true,
      rolesSesionApi: user.rolesSesionApi ?? [],
    } : u));
    // Los roles de la sesión salen de lo que manda la API, aunque el rol no
    // exista en la copia local del catálogo.
    const rolesActivos: Rol[] = armarRolesSesion(user.rolesSesionApi, roles);
    // Cliente público: solo el rol Cliente → landing (portal público, nunca el
    // panel). Un empleado inactivo o sin contratación vigente llega aquí porque
    // el backend ya solo le devuelve el rol Cliente: entra y compra como cliente.
    const esClientePublico = rolesActivos.length > 0 && rolesActivos.every(esRolCliente);

    if (!esClientePublico) {
      if (rolesActivos.length === 0) {
        return { ok: false, mensaje: "Tu cuenta no tiene roles activos. Contacta al administrador." };
      }
      // El bloqueo "sin pantallas" ya NO aplica: Inicio siempre está disponible
      // para cualquiera con cuenta válida. El bloqueo restante es por cuenta
      // inactiva.
      if (!user.activo) {
        return { ok: false, mensaje: "Tu cuenta no tiene roles activos. Contacta al administrador." };
      }
    }

    cierreSesionApiRef.current = false;
    const volverAlCheckout = consumirRetornoCheckout();
    setIsLoggedIn(true);
    setLoginNotice(false);
    setLoginEmailPre("");

    const orderToResume = pendingOrder;
    if (orderToResume) {
      // El nombre que queda registrado es el del invitado (si lo
      // llegó a escribir) o el de la cuenta que inicia sesión.
      const nombrePedido = orderToResume.nombre?.trim() || user.nombre;
      void registrarPedido(
        orderToResume.metodoPago,
        orderToResume.comprobante,
        orderToResume.items,
        orderToResume.horaRecogida,
        nombrePedido,
        orderToResume.documento,
      ).then(({ id, total }) => {
        setCart([]);
        setOrderConfirmation({
          id,
          hora: formatearHora(orderToResume.horaRecogida),
          nombre: nombrePedido,
          documento: orderToResume.documento?.trim(),
          items: orderToResume.items,
          total,
        });
        window.setTimeout(() => navigate("cart"), 0);
      }).catch((error) => toast.error(error instanceof Error ? error.message : "No se pudo registrar el pedido."));
    }

    setLoggedInUserId(user.id);
    const guardado = leerCarritosDeUsuarios()[user.id] ?? [];
    setCart((prev) => fusionarCarritos(prev, guardado));

    // El backend devuelve primero el rol principal; no se infiere el rol desde
    // el nombre de cuenta ni desde las fichas locales.
    const rolesTrabajo = rolesActivos.filter(r => !["administrador", "cliente", "empleado"].includes(normalizarNombreRol(r.nombre)));
    const rolAdministrador = rolesActivos.find(r => normalizarNombreRol(r.nombre) === "administrador");
    const rolEmpleado = rolesActivos.find(r => normalizarNombreRol(r.nombre) === "empleado");
    const rolCliente = rolesActivos.find(r => normalizarNombreRol(r.nombre) === "cliente");
    // Rol activo por defecto: el primer cargo CON permisos. Un cargo sin
    // permisos (o "Empleado", que no tiene ninguno) dejaría la pantalla sin
    // módulos, así que "Empleado" es solo el ÚLTIMO recurso. La decisión toma
    // únicamente los roles que trae el API: no depende de la ficha local del
    // navegador (que en el equipo del empleado ni siquiera existe).
    const primerCargoConPermisos =
      rolesTrabajo.find(r => Object.keys(r.accesos ?? {}).length > 0) ?? null;
    const rolInicial = rolAdministrador
      ?? (esClientePublico ? rolCliente : null)
      ?? primerCargoConPermisos
      ?? rolesTrabajo[0]
      ?? rolEmpleado
      ?? rolesActivos[0]
      ?? null;
    const inicialId = rolInicial?.id ?? null;
    setRolActivoId(inicialId);
    escribirRolActivo(user.id, inicialId);
    const nextRole = rolInicial?.nombre ?? "Empleado";
    // P9: el cliente público SIEMPRE cae en la landing; un empleado NUNCA:
    // Dashboard solo si la sesión es super admin o el rol activo tiene el
    // permiso "Dashboard::Dashboard"; si no, "Inicio" (siempre disponible).
    const userEsSuperAdmin = user.esSuperAdmin === true;
    const hasDashRolInicial =
      userEsSuperAdmin || !!(rolInicial && rolInicial.accesos[DASHBOARD_PERM_KEY]?.includes("Ver"));
    const nextScreen = esClientePublico
      ? "landing"
      : hasDashRolInicial
        ? "dashboard"
        : "inicio";

    setUserRole(nextRole);
    if (volverAlCheckout) {
      navigate("cart");
      void verificarStockYContinuar();
    } else if (!orderToResume) {
      navigate(facturaPedidoId ? "mis-pedidos" : nextScreen);
    }
    return { ok: true };
  };

  /** Bloque 5 — Tope de UNA línea del carrito considerando TODO lo que ya
      hay en el carrito (punto 2):
      · Producto que NO está en el catálogo público (ningún nombre casa, está
        borrado/renombrado o el catálogo aún no cargó): sin límite.
      · Pizza: stock de porciones del tamaño de la línea. Lasaña y bebida:
        stock físico del producto. En todos los casos se descuentan las
        unidades del mismo producto/tamaño que ya hay en otras líneas.
      `max` es el TOTAL que la línea puede tener: la propia línea se excluye
      de los consumos ajenos por id; sin id —tarjeta y detalle— todo el
      carrito cuenta. El mínimo sigue siendo 1 (lo aplican los puntos que
      usan este tope).
      NO lee `productos` (Gestión de Productos): esa lista solo se carga con
      sesión, así que sin login el tope salía siempre `undefined` y las
      pizzas/lasañas con stock 0 se podían agregar. Stock y tipo salen del
      CATÁLOGO PÚBLICO, cargado igual para todos los roles. */
  const limiteDeLinea = (
    linea: LineaLimiteRef,
    carrito: CartItem[],
  ): LimiteLinea => {
    const nombre = linea.product.name;
    const mismoNombre = (n?: string) =>
      normalizarNombre(n ?? "") === normalizarNombre(nombre);
    const enCatalogo = productosCatalogo.find((p) => mismoNombre(p.nombre));
    if (!enCatalogo) return { max: undefined, elaborado: false };
    const enCategoria = categoriasCatalogo.find(
      (c) => c.id === enCatalogo.idCategoria,
    )?.nombre;
    const elaborado = tipoDe(enCatalogo, enCategoria) === "Producto insumo";
    // Lo que ya consumen las OTRAS líneas (la propia no se cuenta dos veces).
    const otras = carrito.filter((l) => l.id !== linea.id);

    // Pizzas consumen stock por tamaño; los otros productos mantienen su stock
    // habitual. El menú nunca vende más porciones de las que hay preparadas.
    const esPizza =
      enCatalogo.idCategoria === "1" ||
      enCatalogo.idCategoria === "CAT-001" ||
      enCategoria?.toLowerCase().includes("pizza") === true;
    const stock = limiteStockDe(enCatalogo, linea.size);
    if (esPizza && enCatalogo.stockPartes != null) {
      const consumo = otras.filter((l) => mismoNombre(l.product.name))
        .map((l) => ({ tamano: l.size, cantidad: l.quantity }));
      return { max: disponiblePizza(enCatalogo.stockPartes, linea.size, consumo), elaborado, stock };
    }
    if (stock === undefined || !Number.isFinite(stock)) {
      return { max: undefined, elaborado };
    }
    const enOtras = otras
      .filter((l) => mismoNombre(l.product.name) && (!esPizza || l.size === linea.size))
      .reduce((s, l) => s + (l.quantity || 0), 0);
    return { max: Math.max(0, Math.floor(stock - enOtras)), elaborado, stock };
  };

  /** Bloque 5 — Agregar 1 unidad desde la tarjeta. Devuelve si algo se
      agregó: si la línea ya está en su máximo NO se agrega nada y trae el
      mensaje de máximo, para que el toast nunca diga "agregada al carrito"
      sin que se haya agregado nada (punto 4). */
  const quickAdd = (
    product: Product,
  ): { agregado: boolean; mensaje?: string } => {
    const size = sizeDe(product, 0);
    // El botón suma 1 con el tamaño por defecto, pero si ya hay una línea
    // sin extras de ESTE producto el +1 se acumula en ella: el tope es el
    // de ESA línea (la propia no se cuenta dos veces como consumo ajeno).
    const existente = cart.find(
      (i) => i.product.id === product.id && i.size === size.label && i.selectedExtras.length === 0,
    );
    const objetivo = limiteDeLinea(
      existente ?? { product, size: size.label },
      cart,
    );
    const max = objetivo.max;
    const adicional =
      max === undefined ? undefined : max - (existente?.quantity ?? 0);
    if (max !== undefined && (adicional ?? 0) <= 0) {
      return {
        agregado: false,
        mensaje: mensajeMaximoDe(
          product.name,
          max,
          existente?.size ?? size.label,
          objetivo.elaborado,
        ),
      };
    }
    setCart((prev) => {
      if (existente) {
        return prev.map((i) =>
          i.id === existente.id
            // Si ya está en el máximo, el clic no suma (la cantidad se
            // ajusta sola); las líneas nuevas siempre entran con 1.
            ? { ...i, quantity: ajustarCantidad(i.quantity + 1, max) }
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
    return { agregado: true };
  };

  // Punto 2.4: agregar desde el detalle acumulaba unidades en líneas separadas
  // aunque el producto, el tamaño y los extras fueran idénticos (quickAdd y
  // fusionarCarritos ya lo hacían). Se reutiliza `mismaConfig`: si la misma
  // configuración ya está en el carrito, se suman las unidades a esa línea (la
  // primera que entró); si no, se agrega al final.
  /** Bloque 5 — Agregar desde el detalle. El ítem todavía no está en el
      carrito (id nuevo): todas las líneas cuentan como ajenas, así `max`
      son las unidades que se pueden AGREGAR ahora. Devuelve si algo se
      agregó y, si no, el mensaje de máximo (punto 4: el toast jamás dice
      "agregada" sin agregar nada). */
  const addDetailed = (
    item: CartItem,
  ): { agregado: boolean; mensaje?: string } => {
    const objetivo = limiteDeLinea(item, cart);
    const max = objetivo.max;
    const existente = cart.find((x) => mismaConfig(x, item));
    const actual = existente?.quantity ?? 0;
    const disponible =
      max === undefined
        ? item.quantity
        : Math.max(0, Math.min(item.quantity, max));
    if (disponible <= 0) {
      return {
        agregado: false,
        mensaje: mensajeMaximoDe(
          item.product.name,
          max ?? 0,
          (existente ?? item).size,
          objetivo.elaborado,
        ),
      };
    }
    setCart((p) => {
      const i = p.findIndex((x) => mismaConfig(x, item));
      if (i === -1) return [...p, { ...item, quantity: disponible }];
      return p.map((x, idx) =>
        idx === i
          // El tope de la línea fusionada es el `max` (que ya descuenta lo
          // que había en el carrito) más lo que había en ESTA línea.
          ? {
            ...x,
            quantity: ajustarCantidad(
              x.quantity + disponible,
              max === undefined ? undefined : max + actual,
            ),
          }
          : x,
      );
    });
    return { agregado: true };
  };

  /** Bloque 2: "+ Crear producto" desde Nueva Compra / Orden de Compra /
      Recepción. El producto entra al catálogo del panel por el MISMO setter
      que usa Gestión de Productos, vía callback: al conectar la API este será
      el único punto a cambiar (una sola llamada de creación). */
  const crearProductoDesdeCompras = async (p: Producto) => crearProductoEnServidor({
    ...p,
    tipo: TIPOS_PRODUCTO[1],
    precioUnitario: 0,
    estado: "No disponible",
    unidadVenta: "und",
  });

  const registrarPedido = async (
    metodoPago: string,
    comprobante: string,
    items: CartItem[],
    horaRecogida: string,
    clienteNombre?: string,
    clienteDocumento?: string,
    clienteTelefono?: string,
  ): Promise<{ id: string; total: number }> => {
    const itemsConId = items.map((item) => {
      const producto = productosCatalogo.find((p) => normalizarNombre(p.nombre) === normalizarNombre(item.product.name));
      return { item, id: producto ? Number(producto.id) : NaN };
    });
    if (itemsConId.some(({ id }) => !Number.isSafeInteger(id) || id <= 0)) {
      throw new Error("No se pudo identificar uno de los productos del catálogo. Actualiza la página e intenta de nuevo.");
    }
    const creada = await crearVentaCliente({
      hora_recogida: horaRecogida,
      productos: itemsConId.map(({ item, id }) => ({
        id_producto: id,
        cantidad: item.quantity,
        tamano: /bebida/i.test(item.product.category ?? "") ? null : item.size,
      })),
      pago: { tipo: metodoPago, comprobante },
    });
    setVentas((prev) => [creada.venta, ...prev]);
    return { id: creada.id, total: creada.total };
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart((p) => p.filter((i) => i.id !== id));
      return;
    }
    setCart((p) =>
      p.map((i) =>
        i.id === id
          ? {
            ...i,
            // Bloque 5: máximo el tope de ESTA línea con todo el resto
            // del carrito (la propia no se cuenta dos veces); si quien
            // edita se pasa, la cantidad se ajusta sola. El mínimo sigue
            // siendo 1 y el − en 1 sigue quitando la línea (como siempre).
            quantity: ajustarCantidad(qty, limiteDeLinea(i, p).max),
          }
          : i,
      ),
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
    conservarCarrito?: boolean;
  }) => {
    const silenciarAviso = opciones?.silenciarAviso ?? false;
    const aviso = opciones?.aviso ?? "Has cerrado sesión correctamente";
    const destino: Screen = esRutaLicencias() ? "licencias" : opciones?.destino ?? "landing";
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
      borrarRetornoCheckout();
      setIsLoggedIn(false);
      setUserRole("");
      setLoggedInUserId(null);
      setAbrirCheckoutTrasLogin(false);
      if (!opciones?.conservarCarrito) setCart(leerCarritoGuardado());
      setRolActivoId(null);
      setPantallaPendiente(null);
      navigate(destino, { replace: true });
      if (!silenciarAviso) {
        toast.success(aviso);
      }
    }
  };

  const requerirLoginCheckout = () => {
    guardarRetornoCheckout();
    openLogin();
    setLoginNotice(true);
  };

  const checkoutUnauthorized = async () => {
    if (isLoggedIn) {
      await logout({ silenciarAviso: true, destino: "login", conservarCarrito: true });
    }
    requerirLoginCheckout();
  };

  useEffect(() => registrarManejadorCierreSesion((mensaje) => {
    cierreSesionApiRef.current = true;
    void logout({ silenciarAviso: true, destino: "login" }).then(() => {
      toast.error(mensaje);
    });
  }), [logout]);

  useEffect(() => {
    if (!isLoggedIn || !obtenerToken()) return;

    let activa = true;
    let validando = false;
    const validarSesion = async () => {
      if (!activa || validando || !obtenerToken()) return;
      validando = true;
      try {
        await obtenerPerfil();
      } catch (error) {
        const status = (error as ApiErrorConEstado).status;
        if (status !== 401) {
          console.error("No se pudo validar la sesión con el servidor.", error);
        }
      } finally {
        validando = false;
      }
    };

    const intervalo = window.setInterval(() => void validarSesion(), 30 * 1000);
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "visible") void validarSesion();
    };
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    window.addEventListener("focus", validarSesion);

    return () => {
      activa = false;
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      window.removeEventListener("focus", validarSesion);
    };
  }, [isLoggedIn, loggedInUserId]);

  /** Refresca el perfil del usuario de la sesión desde GET /auth/me y hace
   *  merge en la lista local `usuarios` (nombre, correo, teléfono, tipo y
   *  número de documento). Se usa al restaurar la sesión (F5) y al entrar a
   *  las pantallas de perfil: así el teléfono y el documento no dependen de
   *  lo que haya quedado en el estado local. */
  const [perfilEstado, setPerfilEstado] = useState<"idle" | "cargando" | "error">("idle");
  const [perfilErrorMsg, setPerfilErrorMsg] = useState<string | null>(null);

  const refrescarPerfil = async (): Promise<boolean> => {
    if (!obtenerToken() || !loggedInUserId) return false;
    setPerfilEstado("cargando");
    try {
      const perfil = await obtenerPerfil();
      const id = String(perfil.id);
      const clavePerfil = clavePersona(
        perfil.tipoDocumento ?? "",
        perfil.numeroDocumento ?? "",
        perfil.correo ?? "",
      );
      const puedeCruzarPorIdentidad =
        docValida(claveDoc(perfil.tipoDocumento ?? "", perfil.numeroDocumento ?? "")) ||
        Boolean(perfil.correo?.trim());
      if (loggedInUserId !== id) setLoggedInUserId(id);
      setUsuarios(prev => {
        const existente = prev.find(u => u.id === id) ?? (
          puedeCruzarPorIdentidad
            ? prev.find(u =>
              clavePersona(u.tipoDocumento, u.numeroDocumento, u.correo) === clavePerfil,
            )
            : undefined
        );
        const rolIdsApi = (perfil.roles ?? []).flatMap(rolApi => {
          const local = roles.find(r => normalizarNombreRol(r.nombre) === normalizarNombreRol(rolApi.nombre));
          return local ? [local.id] : [];
        });
        const nombre = perfil.nombre || existente?.nombre || "";
        const base: Usuario = {
          ...(existente ?? {} as Usuario),
          id,
          nombre,
          iniciales: existente?.iniciales ?? nombre.trim().split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase(),
          avatarColor: existente?.avatarColor ?? AVATAR_PALETTE[0],
          correo: (perfil.correo || existente?.correo || "").trim().toLowerCase(),
          telefono: perfil.telefono || existente?.telefono || "",
          tipoDocumento: perfil.tipoDocumento || existente?.tipoDocumento || "",
          numeroDocumento: perfil.numeroDocumento || existente?.numeroDocumento || "",
          rolIds: rolIdsApi.length ? rolIdsApi : existente?.rolIds ?? [],
          rolId: rolIdsApi[0] ?? existente?.rolId ?? "",
          activo: existente?.activo ?? true,
          esSuperAdmin: perfil.esSuperAdmin === true,
          rolCuentaApi: perfil.rol,
          rolesSesionApi: perfil.roles ?? [],
        };
        return existente
          ? prev.map(u => u.id === existente.id ? base : u)
          : [...prev, base];
      });
      setPerfilEstado("idle");
      setPerfilErrorMsg(null);
      return true;
    } catch (error) {
      setPerfilEstado("error");
      setPerfilErrorMsg(
        error instanceof Error
          ? `No pudimos cargar tu información del servidor: ${error.message}`
          : "No pudimos cargar tu información del servidor. Inténtalo de nuevo.",
      );
      return false;
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
      if (id === loggedInUserId && loggedInUser) {
        const sesion = leerSesionGuardada();
        if (sesion?.userId === id) {
            escribirSesionGuardada({
              ...sesion,
              avatarInicial: loggedInUser.iniciales.charAt(0).toUpperCase(),
              avatarColor: loggedInUser.avatarColor,
            });
        }
      }
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
    if (sesionActiva && !restauracionSesionLista) return;
    if (!isLoggedIn || !loggedInUserId) return;
    if (
      screen === "client-profile" ||
      screen === "store-profile" ||
      screen === "profile"
    ) {
      void refrescarPerfil();
    }
  }, [screen, isLoggedIn, loggedInUserId, restauracionSesionLista]);

  useEffect(() => {
    if (!sesionActiva) return;
    let cancelado = false;
    let reintento: number | undefined;
    const restaurar = async () => {
      if (!obtenerToken()) {
        if (!cancelado && !cierreSesionApiRef.current) void logout();
        return;
      }
      const correcto = await refrescarPerfil();
      if (cancelado) return;
      if (correcto) {
        setRestauracionSesionLista(true);
        return;
      }
      if (!obtenerToken()) {
        if (!cierreSesionApiRef.current) void logout();
        return;
      }
      // Un fallo de red no prueba que el token sea inválido ni que falten roles.
      reintento = window.setTimeout(() => void restaurar(), 5000);
    };
    void restaurar();
    return () => {
      cancelado = true;
      if (reintento !== undefined) window.clearTimeout(reintento);
    };
    // La restauración solo debe iniciarse una vez por sesión persistida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesionActiva?.userId]);

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
    if (!isLoggedIn || !loggedInUserId || pantallaPendiente !== null) return;
    escribirSesionGuardada({
      userId: loggedInUserId,
      rolActivo: rolActivoId,
      screen: screen === "licencias" ? leerSesionGuardada()?.screen ?? "landing" : screen,
      ultimaActividad: ultimaActividadRef.current,
      avatarInicial: avatarParaHeader?.iniciales.charAt(0).toUpperCase(),
      avatarColor: avatarParaHeader?.avatarColor,
    });
  }, [isLoggedIn, loggedInUserId, rolActivoId, screen, pantallaPendiente, avatarParaHeader?.iniciales, avatarParaHeader?.avatarColor]);

  // Inactividad: escucha de eventos de actividad con throttle (máx. una vez
  // cada 30 s) y un intervalo que revisa cada 30 s si pasaron 15 min. Usa refs
  // para no depender de valores que cambian en cada render (si no, el intervalo
  // se re-crearía sin cesar y nunca detectaría la inactividad).
  const logoutRef = useRef(logout);
  useEffect(() => {
    logoutRef.current = logout;
  });
  const sesionActualRef = useRef({
    loggedInUserId,
    rolActivoId,
    screen: pantallaPendiente ?? screen,
    avatarInicial: avatarParaHeader?.iniciales.charAt(0).toUpperCase(),
    avatarColor: avatarParaHeader?.avatarColor,
  });
  useEffect(() => {
    sesionActualRef.current = {
      loggedInUserId,
      rolActivoId,
      screen: pantallaPendiente ?? screen,
      avatarInicial: avatarParaHeader?.iniciales.charAt(0).toUpperCase(),
      avatarColor: avatarParaHeader?.avatarColor,
    };
  }, [loggedInUserId, rolActivoId, screen, pantallaPendiente, avatarParaHeader?.iniciales, avatarParaHeader?.avatarColor]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const registrarActividad = () => {
      const ahora = Date.now();
      if (ahora - ultimaActividadRef.current < ACTIVIDAD_THROTTLE_MS) return;
      ultimaActividadRef.current = ahora;
      // Mantener viva la sesión en localStorage (valor compartido entre
      // pestañas) para que la actividad de esta alimente el chequeo global.
      const {
        loggedInUserId: uid,
        rolActivoId: rid,
        screen: scr,
        avatarInicial,
        avatarColor,
      } = sesionActualRef.current;
      if (uid) {
        escribirSesionGuardada({
          userId: uid,
          rolActivo: rid,
          screen: scr === "licencias" ? leerSesionGuardada()?.screen ?? "landing" : scr,
          ultimaActividad: ahora,
          avatarInicial,
          avatarColor,
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
    pantallaPendiente === null && (!hasValidSession || !isAdminRole) &&
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
      if (facturaPedidoId) navigate("login");
      else navigate("landing", { replace: true });
    }
  }, [facturaPedidoId, hasValidSession, screen, navigate]);

  if (pantallaPendiente === null && isAdminRole && !puedeVerPantallaPanel(screen)) {
    setTimeout(() => navigate(adminHomeScreen), 0);
  }

  const alternarMenu = () => {
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
  };

  const sideW = isAdmin
    ? esMovil
      ? ""
      : menuAbierto
        ? "ml-[280px]"
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
      className={`min-h-screen bg-background text-foreground${isAdmin ? " panel-admin" : " app-publica"}`}
      data-panel-texto-grande={isAdmin ? "" : undefined}
      style={{ fontFamily: "var(--font-texto)" }}
    >
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          // Todas las alertas del sistema (landing y panel) duran 2 segundos.
          duration: 2000,
          // En celular el botón de acción del toast ("Ver carrito") llega a 44 px.
          classNames: { actionButton: "max-md:!h-11 max-md:!px-4 max-md:!text-sm" },
          style: {
            fontFamily: "var(--font-texto)",
            fontSize: isAdmin ? "16px" : "15px",
          },
        }}
      />

      {/* Invitación de empleado: el modal "Crea tu contraseña" se abre sobre
          cualquier pantalla mientras el token de ?activar siga en memoria. */}
      {activacionToken && (
        <ActivarCuentaModal
          token={activacionToken}
          onActivada={trasActivarCuenta}
          onCerrar={() => setActivacionToken(null)}
          onIrALogin={irALoginDesdeActivacion}
        />
      )}

      {/* Sidebar */}
      {isAdmin && (
        <Sidebar
          current={screen}
          navigate={navigate}
          abierto={esMovil ? sidebarMovilAbierto : menuAbierto}
          userName={sesionRestaurandose ? "" : loggedInUserName}
          menuButtonRef={menuButtonRef}
          onToggleMenu={alternarMenu}
          accesos={loggedInAccesos}
          esSuperAdminSesion={esSuperAdminSesion}
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
        className={`transition-[margin] duration-200 motion-reduce:transition-none ${sideW} flex flex-col min-h-screen${isLockedScreen ? " h-dvh min-h-dvh overflow-hidden max-[820px]:h-[calc(100dvh-4rem)] max-[820px]:min-h-0" : ""}`}
      >
        {/* Public navbar */}
        {!isAdmin && !isAuth && (
          <PublicNav
            navigate={navigate}
            onLogin={openLogin}
            cart={cart}
            isLoggedIn={isLoggedIn}
            isStaff={isStaff}
            loggedInUser={avatarParaHeader}
            perfilPendiente={sesionRestaurandose && Boolean(sesionActiva?.userId)}
            onLogout={logout}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        )}

        {/* Admin topbar */}
        {isAdmin && (
          <AdminTopBar
            current={screen}
            onToggleSidebar={alternarMenu}
            esMovil={esMovil}
            menuVisible={esMovil ? sidebarMovilAbierto : menuAbierto}
            menuButtonRef={menuButtonRef} ordenAEditar={ordenAEditar}
            navigate={navigate}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            userName={sesionRestaurandose ? "" : loggedInUserName}
            roleName={sesionRestaurandose ? "" : loggedInRoleName}
            homeScreen={adminHomeScreen}
            rolesParaCambiar={rolesParaCambiar}
            onCambiarRol={rolesDeTrabajo.length > 0 && normalizarNombreRol(loggedInRoleName) !== "administrador" ? cambiarRolActivo : undefined}
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
          {/* Aviso fijo del catálogo público: solo aparece si la API no respondió.
              Va con posición fija para no desplazar ni alterar el layout existente
              (evita CLS y no cambia el diseño en el caso normal de éxito). */}
          {catalogoError && (
            <div
              role="alert"
              className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[min(92vw,26rem)] rounded-2xl border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-950/80 p-4 shadow-xl backdrop-blur"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-300 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                    No pudimos cargar el menú
                  </p>
                  <p className="mt-1 text-xs text-red-700/90 dark:text-red-200/80">
                    Revisa tu conexión o inténtalo de nuevo en unos segundos.
                  </p>
                  <button
                    type="button"
                    onClick={() => void recargarCatalogo().catch(() => { })}
                    disabled={catalogoCargando}
                    className="max-md:min-h-11 max-md:inline-flex max-md:items-center max-md:justify-center mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${catalogoCargando ? "animate-spin" : ""}`} />
                    {catalogoCargando ? "Reintentando…" : "Reintentar"}
                  </button>
                </div>
              </div>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              className="h-full"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Cargando">
                    <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                }
              >
                <LandingErrorBoundary resetKey={screen}>
                  {screen === "landing" && (
                    <Landing
                      navigate={navigate}
                      setProduct={setSelectedProduct}
                      onCategoryNavigate={(cat) => {
                        setCatalogCat(cat);
                        navigate("catalog");
                      }}
                      categorias={categoriasCatalogo}
                      productos={productosCatalogo}
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
                      categoria={catalogCat}
                      setCategoria={setCatalogCat}
                      page={catalogPage}
                      setPage={setCatalogPage}
                      search={catalogSearch}
                      setSearch={setCatalogSearch}
                      onOpenDetail={(p) => {
                        setDetalleOrigen("catalog");
                        setProductoOrigenCatalogo(p.id);
                        setSelectedProduct(p);
                        navigate("product-detail");
                      }}
                      cart={cart}
                      updateQty={updateQty}
                      limiteDe={(linea) => limiteDeLinea(linea, cart)}
                      categorias={categoriasCatalogo}
                      productos={productosCatalogo.map((p) => productoACatalogo(p, categoriasCatalogo))}
                    />
                  )}
                  {screen === "product-detail" && (
                    <ProductDetailScreen
                      key={selectedProduct.id}
                      product={selectedProduct}
                      catalogProducts={productosCatalogo.map((p) => productoACatalogo(p, categoriasCatalogo))}
                      onOpenRelated={(p) => {
                        setSelectedProduct(p);
                        window.scrollTo({ top: 0, behavior: "instant" });
                      }}
                      navigate={navigate}
                      addDetailed={addDetailed}
                      limiteDe={(linea) => limiteDeLinea(linea, cart)}
                      onBack={() => {
                        navigate(detalleOrigen, { restaurar: true });
                        // Al volver al catálogo, hace scroll a la tarjeta del producto
                        // que se abrió (data-producto-id en ProductCard). Mismo criterio
                        // de reintentos que `navigate(restaurar)`: la tarjeta tarda en
                        // montarse por la transición de salida (AnimatePresence).
                        if (detalleOrigen === "catalog" && productoOrigenCatalogo !== undefined) {
                          let intentosCard = 0;
                          const buscarTarjeta = () => {
                            intentosCard += 1;
                            const el = document.querySelector(`[data-producto-id="${productoOrigenCatalogo}"]`);
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
                      limiteDe={(linea) => limiteDeLinea(linea, cart)}
                      remove={remove}
                      clear={() => setCart([])}
                      onOrder={registrarPedido}
                      isLoggedIn={isLoggedIn}
                      onRequireCheckoutLogin={requerirLoginCheckout}
                      onCheckoutUnauthorized={() => void checkoutUnauthorized()}
                      abrirCheckoutTrasLogin={abrirCheckoutTrasLogin}
                      onCheckoutAbierto={() => setAbrirCheckoutTrasLogin(false)}
                      validandoStockCheckout={validandoStockCheckout}
                      onVerificarStock={() => void verificarStockYContinuar()}
                      confirmationData={orderConfirmation ?? undefined}
                      onClearConfirmation={() => setOrderConfirmation(null)}
                      clienteSesion={loggedInUser?.nombre}
                    />
                  )}
                  {screen === "mis-pedidos" && (
                    <MisPedidosScreen
                      pedidos={ventas}
                      usuarioNombre={pedidosUsuarioNombre}
                      facturaPedidoId={facturaPedidoId}
                      onVerMenu={() => navigate("catalog")}
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
                      mensajeExito={loginMensajeExito}
                      onLogin={handleLogin}
                    />
                  )}
                  {screen === "register" && (
                    <RegisterScreen
                      navigate={navigate}
                      usuarios={usuarios}
                      setUsuarios={setUsuarios}
                      clientes={clientes}
                      setClientes={setClientes}
                      darkMode={darkMode}
                      onRegistrado={trasRegistrarse}
                    />
                  )}
                  {screen === "licencias" && (
                    <LicenciasScreen onVolver={() => navigate("landing")} />
                  )}
                  {screen === "client-profile" && (
                    <ClientProfileScreen
                      navigate={navigate}
                      onLogout={logout}
                      perfilPendiente={sesionRestaurandose && Boolean(sesionActiva?.userId)}
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
                  {sesionRestaurandose && (screen === "dashboard" || screen === "inicio") ? (
                    /* Sesión restaurándose (F5): /auth/me todavía no responde y los
                       roles de la sesión no están cargados. En vez de parpadear
                       "sin rol" / "Sin rol asignado" (o "Empleado / Sin módulos
                       asignados" en el empleado), se muestra un indicador de carga
                       con el estilo de la app. */
                    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                      <RefreshCw className="w-8 h-8 text-primary animate-spin mb-4" />
                      <p className="text-sm text-muted-foreground">Cargando tu sesión…</p>
                    </div>
                  ) : (
                    ((screen === "dashboard" && hasDashboardAccess) || (screen === "inicio" && !hasDashboardAccess)) && (
                      <DashboardScreen
                        navigate={navigate}
                        ventas={ventas}
                        ventasCargando={ventasCargando}
                        ventasError={ventasError}
                        puedeVerVentas={puedeVerVentas}
                        ordenesCompraCargando={ordenesCompraCargando || !ordenesCompraCargadas}
                        errorOrdenesCompra={errorOrdenesCompra}
                        comprasCargando={comprasCargando || !comprasCargadas}
                        errorCompras={errorCompras}
                        noConformesCargando={noConformesCargando || !noConformesCargados}
                        errorNoConformes={errorNoConformes}
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
                        periodoInicio={periodoInicio}
                        onPeriodoInicio={setPeriodoInicio}
                      />
                    )
                  )}
                  {screen === "manage-products" && (
                    <ManageProductsScreen />
                  )}
                  {screen === "perecederos" && (
                    <ProductosPerecederosScreen
                      {...getPerms("perecederos")}
                      ventasSugeridas={ventas.map((v) => ({ id: v.id, usuario: v.usuario }))}
                      insumos={insumos}
                      productos={productos}
                      ordenesProduccion={ordenesProduccion}
                      noConformidades={noConformidades}
                      setNoConformidades={setNoConformidades}
                      cargando={noConformesCargando}
                      errorCarga={errorNoConformes}
                      onReintentar={() => void cargarNoConformes()}
                      // El stock lo mueve el backend (reventa o insumo): se
                      // recargan productos e insumos tras crear o eliminar.
                      onInventarioCambiado={() => void recargarInventarioCpn()}
                    />
                  )}
                  {screen === "orden-compra" && (
                    <OrdenCompraScreen
                      {...getPerms("orden-compra")}
                      ordenes={ordenes}
                      setOrdenes={setOrdenes}
                      cargando={ordenesCompraCargando}
                      errorCarga={errorOrdenesCompra}
                      onReintentar={() => void cargarOrdenesCompra()}
                      gestiones={gestiones}
                      setGestiones={setGestiones}
                      proveedores={proveedores}
                      setProveedores={setProveedores}
                      insumos={insumos}
                      setInsumos={setInsumos}
                      // Punto 3.2: el modal que abre este listado necesita el
                      // catálogo para buscar por tipo "Producto".
                      productos={productos}
                      // Punto B7: al anular la OC se devuelve también el stock
                      // de las líneas de producto de sus facturas.
                      setProductos={setProductos}
                      // Bloque 2: el "+ Crear producto" del OrdenModal necesita
                      // las categorías del panel y el alta en el catálogo.
                      categorias={categoriasCatalogo}
                      onCrearProducto={crearProductoDesdeCompras}
                      categoriasInsumo={categoriasInsumo}
                      onRecargarCatalogo={recargarInventarioCpn}
                      // Cambios de estado (p. ej. marcar Completado a mano):
                      // la lista completa se resincroniza con el backend.
                      onRecargarOrdenes={() => void cargarOrdenesCompra()}
                      onAbrirRecepcion={(orden) => {
                        setOrdenRecepcion(orden);
                        setScreen("recepcion-compra");
                      }}
                      onNuevaOrden={() => {
                        setOrdenAEditar(null);
                        setOrdenCompraItemsIniciales([]);
                        navigate("nueva-orden-compra");
                      }}
                      onEditarOrden={(orden) => {
                        setOrdenAEditar(orden);
                        setOrdenCompraItemsIniciales([]);
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
                      // Bloque 2: "+ Crear producto" con las categorías del panel.
                      categorias={categoriasCatalogo}
                      onCrearProducto={crearProductoDesdeCompras}
                      categoriasInsumo={categoriasInsumo}
                      setInsumos={setInsumos}
                      onBack={() => {
                        setOrdenAEditar(null);
                        setOrdenCompraItemsIniciales([]);
                        navigate("orden-compra");
                      }}
                      orden={ordenAEditar}
                      initialItems={ordenCompraItemsIniciales}
                    />
                  )}
                  {screen === "recepcion-compra" && ordenRecepcion && (
                    <RecepcionCompraScreen
                      orden={ordenRecepcion}
                      insumos={insumos}
                      setInsumos={setInsumos}
                      // P14: catálogo de productos para el selector de tipo de los
                      // "no solicitados". Punto B5: con `setProductos` la
                      // recepción además suma stock y escribe precios de venta.
                      productos={productos}
                      setProductos={setProductos}
                      // Bloque 2: "+ Crear producto" del desplegable de no
                      // solicitados (categorías del panel y alta en el catálogo).
                      categorias={categoriasCatalogo}
                      onCrearProducto={crearProductoDesdeCompras}
                      categoriasInsumo={categoriasInsumo}
                      onRecargarCatalogo={recargarCatalogoTrasCambio}
                      gestiones={gestiones}
                      setGestiones={setGestiones}
                      proveedores={proveedores}
                      onGuardar={async (recepcion, estado) => {
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
                        // 5.2: después de la recepción el backend cambió el stock
                        // y los precios: se recargan la OC, las compras, los
                        // insumos y los productos.
                        await Promise.all([
                          cargarOrdenesCompra(),
                          cargarCompras(),
                          cargarInsumosFichas(productos),
                          cargarProductosGestion(),
                        ]);
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
                      onEditar={() => { }}
                      onAbrirRecepcion={() => { }}
                    />
                  )}
                  {screen === "gestion-compra" && (
                    <GestionCompraScreen
                      {...getPerms("gestion-compra")}
                      gestiones={gestiones}
                      setGestiones={setGestiones}
                      cargando={comprasCargando}
                      errorCarga={errorCompras}
                      onReintentar={() => void cargarCompras()}
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
                      // Bloque 2: se pasan a CompraForm (el detalle es de sólo
                      // lectura, pero ambas pantallas quedan iguales).
                      categorias={categoriasCatalogo}
                      onCrearProducto={crearProductoDesdeCompras}
                      categoriasInsumo={categoriasInsumo}
                      onRecargarCatalogo={recargarInventarioCpn}
                      // Tras anular una compra asociada a una OC se recarga
                      // la lista COMPLETA de órdenes: el badge (Completado ↔
                      // Enviado) y el botón "OC" salen del backend.
                      onRecargarOrdenes={() => void cargarOrdenesCompra()}
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
                      // Bloque 2: "+ Crear producto" del desplegable de ítems
                      // (categorías del panel y alta en el catálogo).
                      categorias={categoriasCatalogo}
                      onCrearProducto={crearProductoDesdeCompras}
                      categoriasInsumo={categoriasInsumo}
                      onRecargarCatalogo={recargarInventarioCpn}
                      onBack={() => navigate("gestion-compra")}
                    />
                  )}
                  {screen === "suppliers" && (
                    <SuppliersScreen
                      {...getPerms("suppliers")}
                      cargando={proveedoresCargando}
                      errorCarga={errorProveedores}
                      onReintentar={() => void cargarProveedores()}
                      ordenes={ordenes}
                      gestiones={gestiones}
                      proveedores={proveedores}
                      setProveedores={setProveedores}
                    />
                  )}
                  {screen === "ventas-pedidos" && (
                    // La caja solo ofrece productos que hoy están Disponibles: si
                    // el backend marca uno como "No disponible" o "Descontinuado"
                    // desaparece del picker sin tocar VentasScreen.
                    <VentasScreen
                      {...getPerms("ventas-pedidos")}
                      pedidos={ventas}
                      setPedidos={setVentas}
                      onInventarioCambiado={recargarInventarioProductos}
                      onVentaPanelCambiada={async () => {
                        const [inventario, ordenesActualizadas] = await Promise.all([
                          recargarInventarioProductos(),
                          cargarOrdenes(),
                        ]);
                        return inventario !== null && ordenesActualizadas;
                      }}
                      onPedidoListo={(orden) => setOrdenesProduccion((prev) =>
                        prev.map((actual) => actual.id === orden.id ? orden : actual)
                      )}
                      productos={productosCatalogo
                        .filter((producto) => producto.estado === "Disponible")
                        .map((producto) => productoACatalogo(producto, categoriasCatalogo))}
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
                      categorias={categoriasCatalogo}
                      catalogoCanje={productosCatalogo.map((producto) => productoACatalogo(producto, categoriasCatalogo))}
                      abrirDevolucionId={devolucionAAbrir}
                      onAbierta={() => setDevolucionAAbrir(null)}
                      onRecargarOrdenes={async () => { await cargarOrdenes(); }}
                      onRecargarNoConformes={async () => { await cargarNoConformes(); }}
                      onRecargarInventario={async () => { await recargarInventarioProductos(); }}
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
                      categorias={categoriasCatalogo}
                      cargandoProductos={productosCargando || (isLoggedIn && !productosGestionCargados && !errorCargaProductos)}
                      errorProductos={errorCargaProductos}
                      onReintentarCarga={() => void cargarProductosGestion()}
                      onCrearEnServidor={crearProductoEnServidor}
                      onEditarEnServidor={editarProductoEnServidor}
                      onCambiarEstadoEnServidor={cambiarEstadoEnServidor}
                      onDescontinuarEnServidor={descontinuarProductoEnServidor}
                      recargarProduccion={recargarProduccion}
                      verOrdenProduccion={verOrdenProduccion}
                      abrirOrdenCompra={() => navigate("orden-compra")}
                    />
                  )}
                  {screen === "cat-producto" && (
                    <CategoriaProductoScreen
                      categorias={categorias}
                      cargando={categoriasCargando}
                      errorCarga={errorCategorias}
                      onReintentar={() => void cargarCategoriasGestion()}
                      onCrear={crearCategoriaEnServidor}
                      onEditar={editarCategoriaEnServidor}
                      onCambiarEstado={cambiarEstadoCategoriaEnServidor}
                      onEliminar={eliminarCategoriaEnServidor}
                      {...getPerms("cat-producto")}
                    />
                  )}
                  {screen === "gestion-roles" && (
                    <GestionConfigScreen
                      canVer={esSuperAdminSesion || (loggedInAccesos[KEY("Configuración", "Roles")] ?? []).includes("Ver")}
                      canCreate={getPerms("gestion-roles").canCreate}
                      canEdit={getPerms("gestion-roles").canEdit}
                      canDelete={getPerms("gestion-roles").canDelete}
                      accesosPropios={loggedInAccesos}
                      loggedInRolId={loggedInRol?.id ?? null}
                      onIrAEmpleados={() => navigate("empleados")}
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
                      usuarios={usuarios}
                      roles={roles}
                      sesionCorreo={correoSesion}
                    />
                  )}
                  {screen === "users" && (
                    <GestionUsuariosScreen
                      canVer={esSuperAdminSesion || (loggedInAccesos[KEY("Configuración", "Usuarios")] ?? []).includes("Ver")}
                      canEdit={getPerms("users").canEdit}
                      canDelete={getPerms("users").canDelete}
                      onIrAClientes={() => navigate("clientes")}
                      onIrAEmpleados={() => navigate("empleados")}
                    />
                  )}
                  {screen === "empleados" && (
                    <GestionEmpleadosScreen
                      clientes={clientes}
                    />
                  )}
                  {screen === "production-orders" && (
                    <OrdenProduccionScreen
                      {...getPerms("production-orders")}
                      productos={productos}
                      insumos={insumos}
                      setInsumos={setInsumos}
                      ventas={ventas}
                      fichasPorProducto={fichasPorProducto}
                      ordenes={ordenesProduccion}
                      setOrdenes={setOrdenesProduccion}
                      noConformidades={noConformidades}
                      cargando={ordenesCargando}
                      errorCarga={errorOrdenes}
                      onReintentar={() => void cargarOrdenes()}
                      recargarProduccion={recargarProduccion}
                      onPedidoListo={(orden) => {
                        setVentas((prev) => prev.map((venta) => {
                          if (venta.id !== orden.ventaId || !orden.estadoVenta) return venta;
                          return {
                            ...venta,
                            estado: orden.estadoVenta,
                            estadoCliente: orden.estadoVenta === "Completado"
                              ? "Completado"
                              : orden.estadoVenta === "Por entregar" ? "Por entregar" : venta.estadoCliente,
                            estadoOrden: "Completada",
                          };
                        }));
                      }}
                      esAdministradorSesion={normalizarNombreRol(loggedInRoleName) === "administrador"}
                      onNavigateTo={(destino, faltantes) => {
                        if (destino === "supplies") {
                          navigate("supplies");
                          return;
                        }
                        const items = (faltantes ?? []).map((faltante, index) => {
                          const insumo = insumos.find((item) => item.id === faltante.insumoId);
                          const precio = Number(insumo?.costoUnitario ?? insumo?.precioUnitario ?? 0);
                          return {
                            rowId: `r${index + 1}`,
                            idInsumo: faltante.insumoId,
                            nombre: faltante.nombre,
                            cantidad: faltante.falta,
                            unidad: faltante.unidad,
                            costoUnitario: precio,
                            precioUnitario: precio,
                            ...(insumo?.iva == null ? {} : { iva: Number(insumo.iva) }),
                            tipoItem: "insumo" as const,
                          };
                        });
                        setOrdenAEditar(null);
                        setOrdenCompraItemsIniciales(items);
                        navigate("nueva-orden-compra");
                      }}
                      abrirOrdenId={ordenAAbrir}
                      setOrdenAAbrir={setOrdenAAbrir}
                      detalleOrdenId={ordenDetalleAAbrir}
                      setDetalleOrdenAAbrir={setOrdenDetalleAAbrir}
                    />
                  )}
                  {screen === "finished-products" && (
                    <ProductoTerminadoScreen
                      pizzas={productosCatalogo
                        .filter((producto) => producto.categoriaNombre?.toLowerCase().includes("pizza"))
                        .map((producto) => ({
                          id: String(producto.id),
                          nombre: producto.nombre,
                          stockMediana: producto.stockMediana ?? 0,
                          stockGrande: producto.stockGrande ?? 0,
                        }))}
                    />
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
                      contrataciones={contratacionesSesion}
                      rolNombreDe={rolNombreDeContrato}
                      rolesParaCambiar={rolesParaCambiar}
                      onCambiarRol={rolesDeTrabajo.length > 0 && normalizarNombreRol(loggedInRoleName) !== "administrador" ? cambiarRolActivo : undefined}
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
                      contrataciones={contratacionesSesion}
                      rolNombreDe={rolNombreDeContrato}
                      rolesParaCambiar={rolesParaCambiar}
                      onCambiarRol={rolesDeTrabajo.length > 0 && normalizarNombreRol(loggedInRoleName) !== "administrador" ? cambiarRolActivo : undefined}
                    />
                  )}
                  {screen === "supplies" && (
                    <GestionInsumosScreen
                      {...getPerms("supplies")}
                      insumos={insumos}
                      setInsumos={setInsumos}
                      categorias={categoriasInsumo}
                      cargando={insumosCargando}
                      errorCarga={errorInsumos}
                      onReintentar={() => void cargarInsumosFichas(productos)}
                      fichas={fichasPorProducto}
                      setFichas={setFichasPorProducto}
                      idsConFicha={[
                        ...productos.map((p) => p.id),
                        ...insumos.map((i) => i.id),
                      ]}
                      productosMenu={productos.map((p) => ({ id: p.id, nombre: p.nombre }))}
                      abrirOrdenProduccion={abrirOrdenProduccion}
                      /* A2: al crear un producto insumo la API crea su orden
                         automática y el toast ofrece "Ver orden". */
                      recargarProduccion={async () => { await recargarProduccion(); }}
                      verOrdenProduccion={verOrdenProduccion}
                      abrirOrdenCompra={() => navigate("orden-compra")}
                    />
                  )}
                  {isAdmin &&
                    ![
                      "dashboard",
                      "inicio",
                      "manage-products",
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
              </Suspense>
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

        /* Scroll sin barra visible (mantiene el desplazamiento). */
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
