import type { ReactElement } from "react";
import { Navigate, Route, Routes, matchPath, useLocation } from "react-router";
import type { Screen } from "@/shared/utils/screen";

/** URL de cada pantalla. Al agregar una pantalla en `screen.ts`, TypeScript
    obliga a darle aquí su ruta. */
export const RUTAS: Record<Screen, string> = {
  // Públicas
  landing: "/",
  catalog: "/menu",
  "product-detail": "/menu/:id",
  cart: "/cart",
  login: "/login",
  register: "/register",
  "mis-pedidos": "/my-orders",
  "client-profile": "/profile",
  "store-profile": "/account",
  licencias: "/licenses",
  // Panel
  dashboard: "/admin",
  inicio: "/admin/home",
  "sales-chart": "/admin/sales-chart",
  "ventas-pedidos": "/admin/sales",
  devoluciones: "/admin/returns",
  "gestion-productos": "/admin/products",
  "finished-products": "/admin/finished-products",
  "cat-producto": "/admin/product-categories",
  supplies: "/admin/supplies",
  "production-orders": "/admin/production-orders",
  perecederos: "/admin/non-conforming-products",
  suppliers: "/admin/suppliers",
  "orden-compra": "/admin/purchase-orders",
  "nueva-orden-compra": "/admin/purchase-orders/new",
  "orden-detalle": "/admin/purchase-orders/:id",
  "recepcion-compra": "/admin/purchase-orders/:id/reception",
  "gestion-compra": "/admin/purchases",
  "nueva-compra": "/admin/purchases/new",
  clientes: "/admin/customers",
  users: "/admin/users",
  empleados: "/admin/employees",
  "gestion-roles": "/admin/roles",
  profile: "/admin/profile",
  // Pantallas antiguas sin entrada en el menú actual
  "manage-products": "/admin/manage-products",
  clients: "/admin/clients",
  reports: "/admin/reports",
  roles: "/admin/legacy-roles",
  permissions: "/admin/permissions",
  access: "/admin/access",
  "supply-categories": "/admin/supply-categories",
  "product-categories": "/admin/legacy-product-categories",
  sales: "/admin/legacy-sales",
};

const RUTA_LICENCIAS_ANTERIOR = "/licencias";

// Las rutas fijas se prueban antes que las que llevan `:id`
// (`/admin/purchase-orders/new` no es una orden con id "new").
const POR_PRIORIDAD = (Object.entries(RUTAS) as [Screen, string][]).sort(
  ([, a], [, b]) => Number(a.includes(":")) - Number(b.includes(":")),
);

/** Pantalla (y registro, si la ruta lo lleva) que corresponde a una URL. */
export const leerRuta = (pathname: string): { screen: Screen; id?: string } | null => {
  if (matchPath(RUTA_LICENCIAS_ANTERIOR, pathname)) return { screen: "licencias" };
  for (const [screen, patron] of POR_PRIORIDAD) {
    const coincidencia = matchPath(patron, pathname);
    if (coincidencia) return { screen, id: coincidencia.params.id };
  }
  return null;
};

/** URL de una pantalla. Sin `id`, las pantallas de detalle caen a su listado. */
export const rutaDe = (screen: Screen, id?: string | number | null): string => {
  const patron = RUTAS[screen];
  if (!patron.includes(":id")) return patron;
  if (id === undefined || id === null || id === "") return patron.slice(0, patron.indexOf("/:id"));
  return patron.replace(":id", encodeURIComponent(String(id)));
};

function RedireccionLicencias() {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: RUTAS.licencias, search, hash }} replace />;
}

/** Todas las rutas comparten `shell`, que decide qué pintar según la pantalla:
    así no se desmonta (ni pierde datos) al navegar. */
export function AppRoutes({ shell }: { shell: ReactElement }) {
  return (
    <Routes>
      <Route path={RUTA_LICENCIAS_ANTERIOR} element={<RedireccionLicencias />} />
      <Route element={shell}>
        {Object.values(RUTAS).map((path) => (
          <Route key={path} path={path} element={null} />
        ))}
        {/* URL desconocida: `shell` la lleva al inicio. */}
        <Route path="*" element={null} />
      </Route>
    </Routes>
  );
}
