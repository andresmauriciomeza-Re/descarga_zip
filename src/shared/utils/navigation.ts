import { KEY, type AccesosMap } from "@/features/roles/pages/RolesScreen";
import { AlertTriangle, DollarSign, FileText, Home, IdCard, Layers, Package, RefreshCw, Settings, ShoppingBag, ShoppingCart, Tag, Truck, UserCircle, Users } from "lucide-react";
import type { Screen } from "@/shared/utils/screen";
import { ETIQUETA_INICIO_EMPLEADO } from "@/shared/utils/screen";

export const DASHBOARD_PERM_KEY = KEY("Dashboard", "Dashboard");

export const NAV_SECTIONS = [
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
        label: "Productos no conformes",
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

export const canViewPermission = (accesos: AccesosMap, permKey: string) =>
  accesos[permKey]?.includes("Ver") ?? false;

export const SCREEN_META: Partial<
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

export const ADMIN_SCREENS: Screen[] = [
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

// Maps each sidebar Screen to its MENU_TREE permission key ("Modulo::Sub")
export const SCREEN_PERM_KEY: Partial<Record<Screen, string>> = {
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
export const PANTALLAS_CON_PERMISO = NAV_SECTIONS.flatMap(s => s.items)
  .filter(i => typeof (i as { permKey?: string }).permKey === "string")
  .map(i => ({ screen: i.screen, permKey: (i as { permKey?: string }).permKey as string }));
