import type { Screen } from "@/shared/utils/screen";
import type { Rol } from "@/features/roles/utils/roles";
import { ETIQUETA_INICIO_EMPLEADO } from "@/shared/utils/screen";
import { Store } from "lucide-react";
import { useIdioma } from "@/shared/i18n";
import { LanguageSelector } from "@/shared/components/LanguageSelector";
import { CambiarRolMenu } from "@/shared/components/SwitchRoleMenu";
import { RutaPagina } from "@/shared/components/panel/PageBreadcrumb";
import { NAV_SECTIONS } from "@/shared/utils/navigation";

export function AdminTopBar({
  current,
  navigate,
  userName,
  roleName,
  homeScreen,
  rolesParaCambiar = [], ordenAEditar,
  onCambiarRol,
}: {
  current: Screen;
  navigate: (s: Screen) => void;
  userName: string;
  roleName: string;
  homeScreen: Screen;
  /** Roles distintos al activo que SÍ tienen pantallas: los que ofrece el
   *  menú "Cambiar de rol" (los vacíos no se ofrecen). */
  rolesParaCambiar?: Rol[]; ordenAEditar?: unknown;
  onCambiarRol?: (rolId: string) => void;
}) {
  const { t } = useIdioma();
  const labels: Partial<Record<Screen, string>> = {
    dashboard: "Dashboard",
    inicio: ETIQUETA_INICIO_EMPLEADO,
    "manage-products": "Gestión de productos",
    clients: "Gestión de clientes",
    reports: "Reportes e informes",
    roles: "Roles",
    permissions: "Permisos",
    users: "Usuarios",
    empleados: "Gestión de empleados",
    access: "Gestión de acceso",
    perecederos: "Productos no conformes",
    "orden-compra": "Orden de Compra",
    "nueva-orden-compra": ordenAEditar ? "Cambiar el pedido" : "Hacer un pedido",
    "gestion-compra": "Gestión de Compras",
    "nueva-compra": "Anotar una factura",
    supplies: "Insumos",
    suppliers: "Proveedores",
    "production-orders": "Orden de Producción",
    "finished-products": "Producto terminado",
    sales: "Gestión de ventas",
    "supply-categories": "Categorías de insumos",
    "product-categories": "Categorías de productos",
    profile: "Mi perfil",
    "sales-chart": "Estadísticas",
    "ventas-pedidos": "Ventas",
    devoluciones: "Devoluciones",
    clientes: "Clientes",
    "gestion-roles": "Roles",
    "gestion-productos": "Productos",
    "cat-producto": "Categoría Productos",
    "recepcion-compra": "Recibir la mercancía",
  };
  // Módulo al que pertenece la pantalla actual (para «Estás en: Módulo › Pantalla»).
  const pantallaNombre = labels[current] ?? String(current);
  const moduloNombre = (() => {
    if (current === homeScreen) return undefined;
    const clave: Screen =
      current === "nueva-orden-compra" ? "orden-compra"
        : current === "nueva-compra" ? "gestion-compra"
          : current;
    const sec = NAV_SECTIONS.find((s) =>
      (s.items as { screen: Screen }[]).some((it) => it.screen === clave)
    );
    return sec && sec.key !== "dashboard" && sec.key !== "inicio" ? sec.label : undefined;
  })();
  const nombreHome = homeScreen === "dashboard" ? "Dashboard" : ETIQUETA_INICIO_EMPLEADO;

  return (
    <>
      <header className="pn-header">
        <div className="pn-header__acciones ml-auto flex flex-wrap items-center justify-end gap-3 max-md:gap-2">
          {onCambiarRol && (
            <CambiarRolMenu
              roles={rolesParaCambiar}
              rolActivoNombre={roleName}
              onSelect={onCambiarRol}
              claseBoton="pn-header__btn"
            />
          )}
          <LanguageSelector className="pn-header__btn" />
          <button type="button" onClick={() => navigate("landing")} className="pn-header__btn">
            <Store size={24} aria-hidden="true" />
            <span>{t("menu.verTienda")}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("profile")}
            className="pn-header__btn pn-header__perfil"
            aria-label={`${t("menu.miPerfil", { nombre: userName })}${roleName ? `, ${roleName}` : ""}`}
          >
            <span className="pn-header__avatar" aria-hidden="true">
              {userName.charAt(0).toUpperCase()}
            </span>
            <span className="pn-header__nombre">
              <span>{userName}</span>
              <span className="pn-header__solo-escritorio">{roleName}</span>
            </span>
          </button>
        </div>
      </header>
      <RutaPagina
        modulo={moduloNombre}
        pantalla={current === homeScreen ? nombreHome : pantallaNombre}
      />
    </>
  );
}
