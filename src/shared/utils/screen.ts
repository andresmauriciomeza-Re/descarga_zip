// Pantallas navegables de la app. El estado de navegación vive en `App()`
// (`useState<Screen>`); la URL de cada pantalla está en `src/AppRoutes.tsx`.
const PANTALLAS = [
  "landing",
  "catalog",
  "product-detail",
  "cart",
  "login",
  "register",
  "dashboard",
  "inicio",
  "manage-products",
  "clients",
  "profile",
  "store-profile",
  "reports",
  "roles",
  "permissions",
  "users",
  "access",
  "sales-chart",
  "supply-categories",
  "supplies",
  "product-categories",
  "suppliers",
  "production-orders",
  "finished-products",
  "sales",
  "ventas-pedidos",
  "gestion-productos",
  "cat-producto",
  "gestion-roles",
  "client-profile",
  "clientes",
  "perecederos",
  "orden-compra",
  "orden-detalle",
  "nueva-orden-compra",
  "recepcion-compra",
  "gestion-compra",
  "nueva-compra",
  "devoluciones",
  "empleados",
  "mis-pedidos",
  "licencias",
] as const;

export type Screen = (typeof PANTALLAS)[number];

const pantallasValidas = new Set<string>(PANTALLAS);

export const esPantalla = (valor: string): valor is Screen =>
  pantallasValidas.has(valor);

/** Nombre del ítem de inicio de la barra lateral y del breadcrumb para los
 *  roles SIN permiso Dashboard (la "casita" de siempre). Con el permiso, la
 *  misma casita se llama "Dashboard". */
export const ETIQUETA_INICIO_EMPLEADO = "Menú";
