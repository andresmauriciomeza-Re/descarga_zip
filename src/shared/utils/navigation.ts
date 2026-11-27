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
