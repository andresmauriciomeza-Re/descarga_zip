import { useState } from "react";
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
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  ClipboardList,
  DollarSign,
  FileText,
  IdCard,
  Layers,
  Lock,
  Package,
  RefreshCw,
  RotateCcw,
  Settings,
  ShoppingCart,
  ShoppingBag,
  Tag,
  Truck,
  UserCircle,
  Users,
} from "lucide-react";

import { KEY, ACCIONES, ACCION_EXCEL, accionColors, type AccesosMap } from "@/features/roles/pages/GestionConfigScreen";
import type { Venta } from "@/features/ventas/pages/VentasScreen";
import type {
  GestionCompra,
  OrdenCompra,
  ProveedorRef,
} from "@/features/orden-compra/pages/OrdenCompraScreen";
import type { NoConformidad } from "@/features/cpn/pages/ProductosPerecederosScreen";
import type { Producto } from "@/features/productos/pages/GestionProductosScreen";
import type { Insumo } from "@/features/insumos/pages/GestionInsumosScreen";
import type { Cliente } from "@/features/clientes/pages/GestionClientesScreen";
import type { OrdenProduccion } from "@/features/orden-produccion/pages/OrdenProduccionScreen";
import { hora12, minutosDeHora } from "@/shared/utils/hora";
import {
  agregarDias,
  enPeriodo,
  esFechaISO,
  etiquetaPeriodo,
  fechaISO,
  hoyISO,
  lunesDe,
  semanaDelMes,
  type Periodo,
} from "@/shared/utils/fechas";
import type { Screen } from "@/shared/utils/screen";

const SERIF = "var(--font-titulo)";
const MONO = "var(--font-texto)";
const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`;

/** Rango real de atención (utils/hora.ts): 4 p. m. a 10 p. m. */
const HORAS_HOY = [16, 17, 18, 19, 20, 21, 22];

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
  { id: "total", label: "Total" },
];

/** §3 — Vista "Inicio" del empleado: TODOS los sub-módulos con su pantalla
 *  (los mismos del sidebar, vía SCREEN_PERM_KEY de App.tsx), para armar las
 *  tarjetas de accesos rápidos según el permiso "Ver" del rol activo. */
const MODULOS_INICIO: {
  permKey: string;
  screen: Screen;
  nombre: string;
  Icon: typeof Package;
  descripcion: string;
}[] = [
  { permKey: KEY("Configuración", "Roles"), screen: "gestion-roles", nombre: "Roles", Icon: Settings, descripcion: "Configura roles y permisos" },
  { permKey: KEY("Configuración", "Usuarios"), screen: "users", nombre: "Usuarios", Icon: Users, descripcion: "Consulta los usuarios del sistema" },
  { permKey: KEY("Producción", "Empleados"), screen: "empleados", nombre: "Empleados", Icon: IdCard, descripcion: "Administra los empleados y sus roles" },
  { permKey: KEY("Compras", "Insumos"), screen: "supplies", nombre: "Insumos", Icon: Package, descripcion: "Controla el inventario de insumos" },
  { permKey: KEY("Compras", "Proveedores"), screen: "suppliers", nombre: "Proveedores", Icon: Truck, descripcion: "Administra los proveedores" },
  { permKey: KEY("Compras", "Orden de Compra"), screen: "orden-compra", nombre: "Orden de Compra", Icon: FileText, descripcion: "Crea y envía órdenes de compra" },
  { permKey: KEY("Compras", "Compra"), screen: "gestion-compra", nombre: "Compra", Icon: Truck, descripcion: "Registra las facturas de compra" },
  { permKey: KEY("Producción", "Categoría de Producto"), screen: "cat-producto", nombre: "Categoría de Productos", Icon: Tag, descripcion: "Organiza el menú por categorías" },
  { permKey: KEY("Producción", "Productos"), screen: "gestion-productos", nombre: "Productos", Icon: Package, descripcion: "Administra el menú y sus fichas técnicas" },
  { permKey: KEY("Producción", "Orden de Producción"), screen: "production-orders", nombre: "Orden de Producción", Icon: FileText, descripcion: "Programa y sigue la producción de la cocina" },
  { permKey: KEY("Producción", "Producto No Conforme"), screen: "perecederos", nombre: "Productos no conformes", Icon: AlertTriangle, descripcion: "Registra productos e insumos no conformes" },
  { permKey: KEY("Ventas", "Clientes"), screen: "clientes", nombre: "Clientes", Icon: UserCircle, descripcion: "Consulta y administra los clientes" },
  { permKey: KEY("Ventas", "Ventas"), screen: "ventas-pedidos", nombre: "Ventas", Icon: ShoppingCart, descripcion: "Registra pedidos y consulta el estado de las ventas" },
  { permKey: KEY("Ventas", "Devoluciones"), screen: "devoluciones", nombre: "Devoluciones", Icon: RefreshCw, descripcion: "Gestiona las devoluciones de ventas" },
];

// ── Tooltip compartido: valores exactos (COP o unidades) ──────────────
function GrafTooltip({
  active,
  payload,
  label,
  formatear,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; name?: string; value?: number }>;
  label?: string;
  formatear?: (serie: string, valor: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-muted-foreground mb-0.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold text-foreground">
          {p.name ?? p.dataKey}:{" "}
          {formatear
            ? formatear(String(p.dataKey ?? ""), Number(p.value ?? 0))
            : String(p.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

/** Estado vacío de cada gráfica cuando no hay datos en el periodo. */
function SinDatos({ texto = "No hay datos en este periodo" }: { texto?: string }) {
  return (
    <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground text-center px-4 rounded-xl bg-muted/30">
      {texto}
    </div>
  );
}

/** Tooltip de "Comportamiento de ventas": ingresos COP + N° de ventas. */
function TooltipVentas({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { ingresos?: number; nVentas?: number } }>;
  label?: string;
}) {
  const punto = payload?.[0]?.payload;
  if (!active || !punto) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-muted-foreground mb-0.5">{label}</p>
      <p className="font-bold text-foreground">Ingresos: {fmt(punto.ingresos ?? 0)}</p>
      <p className="font-bold text-foreground">
        {punto.nVentas ?? 0} venta{punto.nVentas === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function GraficaCard({
  titulo,
  etiqueta,
  children,
}: {
  titulo: string;
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="font-bold text-foreground mb-0.5" style={{ fontFamily: SERIF }}>
        {titulo}
      </h3>
      <p className="text-xs text-muted-foreground mb-4">{etiqueta}</p>
      {children}
    </div>
  );
}

export function DashboardScreen({
  navigate,
  ventas,
  gestiones,
  ordenes,
  noConformidades,
  loggedInUser,
  loggedInRoleName,
  tieneRolActivo,
  isNamedAdmin,
  hasDashboardAccess,
  accesos,
}: {
  navigate: (s: Screen) => void;
  ventas: Venta[];
  gestiones: GestionCompra[];
  ordenes: OrdenCompra[];
  noConformidades: NoConformidad[];
  loggedInUser: { nombre: string } | null;
  loggedInRoleName: string;
  // false = el rol fue borrado, está desactivado o el usuario no tiene rol.
  // Distingue "no tienes permisos" de "ya no existe tu rol".
  tieneRolActivo: boolean;
  isNamedAdmin: boolean;
  hasDashboardAccess: boolean;
  accesos: AccesosMap;
  // Inventarios cableados desde App.tsx (se usan en los próximos indicadores).
  productos: Producto[];
  insumos: Insumo[];
  proveedores: ProveedorRef[];
  ordenesProduccion: OrdenProduccion[];
  clientes: Cliente[];
}) {
  const firstName = (loggedInUser?.nombre ?? "Gloria").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const dateStr = new Date().toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const horaVenta = (venta: Venta) =>
    venta.historial?.[venta.historial.length - 1]?.hora ?? venta.horaRecogida ?? "Sin hora";
  // Parser compartido (utils/hora.ts): entiende tanto "18:30" como
  // "6:30 p. m.", que es el formato en el que se guarda la recogida.
  const minutosHora = (hora: string) => minutosDeHora(hora) ?? -1;
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

  // ── Filtro global: Semana (lun–dom) | Mes actual | Total histórico ──
  const [periodo, setPeriodo] = useState<Periodo>("mes");

  /**
   * Regla única de exclusión para Ingresos, Ventas y las gráficas de ventas:
   * anuladas (el pedido no se concretó) y "perdida" (devolución gestionada)
   * no suman dinero ni conteo. Las devoluciones se cuentan aparte.
   */
  const ventaExcluida = (v: Venta) => v.estado === "anulado" || v.estado === "perdida";
  const ventasPeriodo = ventas.filter((v) => enPeriodo(v.fecha, periodo));
  const ventasValidas = ventasPeriodo.filter((v) => !ventaExcluida(v));
  const devolucionesPeriodo = ventasPeriodo.filter((v) => v.estado === "perdida");
  const ncPeriodo = noConformidades.filter((nc) => enPeriodo(nc.fechaRegistro, periodo));

  const ingresosPeriodo = ventasValidas.reduce((s, v) => s + v.total, 0);

  // ── Tarjetas (exactamente 4) ──
  const etiquetaPeriodoTxt = etiquetaPeriodo(periodo);
  const tarjetas: {
    label: string;
    value: string;
    Icon: typeof DollarSign;
    bg: string;
    ic: string;
    screen: Screen;
  }[] = [
    {
      label: "Ingresos",
      value: fmt(ingresosPeriodo),
      Icon: DollarSign,
      bg: "bg-emerald-50",
      ic: "text-emerald-600",
      screen: "ventas-pedidos",
    },
    {
      label: "Ventas",
      value: String(ventasValidas.length),
      Icon: ShoppingBag,
      bg: "bg-blue-50",
      ic: "text-blue-600",
      screen: "ventas-pedidos",
    },
    {
      label: "Devoluciones",
      value: String(devolucionesPeriodo.length),
      Icon: RotateCcw,
      bg: "bg-orange-50",
      ic: "text-orange-600",
      screen: "devoluciones",
    },
    {
      label: "Productos no conformes",
      value: String(ncPeriodo.length),
      Icon: AlertTriangle,
      bg: "bg-red-50",
      ic: "text-red-600",
      screen: "perecederos",
    },
  ];

  // ── Gráfica "Ventas hoy — 4pm a 10pm": unidades reales por hora ──
  const fechaHoy = hoyISO();
  const ventasDeHoy = ventasValidas.filter((v) => v.fecha === fechaHoy);
  const unidadesHoy = ventasDeHoy.reduce((s, v) => s + (v.cantidad || 0), 0);
  const hourlyHoy = HORAS_HOY.map((h) => ({
    hora: `${h - 12}pm`,
    ventas: ventasDeHoy
      .filter((v) => Math.floor(minutosHora(horaVenta(v)) / 60) === h)
      .reduce((s, v) => s + (v.cantidad || 0), 0),
  }));

  // ── 1. Top 10 clientes: pedidos vs valor (unión de ambos top 10) ──
  const clientesAgg = Object.values(
    ventasValidas.reduce<Record<string, { nombre: string; pedidos: number; total: number }>>(
      (acc, venta) => {
        const nombre = venta.usuario?.trim() || "Venta general";
        const actual = acc[nombre] ?? { nombre, pedidos: 0, total: 0 };
        actual.pedidos += 1;
        actual.total += venta.total;
        acc[nombre] = actual;
        return acc;
      },
      {},
    ),
  );
  const topPorPedidos = [...clientesAgg].sort((a, b) => b.pedidos - a.pedidos).slice(0, 10);
  const topPorValor = [...clientesAgg].sort((a, b) => b.total - a.total).slice(0, 10);
  const unionClientes = new Map<string, { nombre: string; pedidos: number; total: number }>();
  topPorPedidos.forEach((c) => unionClientes.set(c.nombre, c));
  topPorValor.forEach((c) => unionClientes.set(c.nombre, c));
  const dataClientes = [...unionClientes.values()].sort((a, b) => b.pedidos - a.pedidos);

  // ── 2. Top 10 productos más vendidos: Σ detalle[].cantidad ──
  const dataProductos = Object.values(
    ventasValidas
      .flatMap((v) => v.detalle ?? [])
      .reduce<Record<string, { nombre: string; vendidos: number }>>((acc, det) => {
        const actual = acc[det.nombre] ?? { nombre: det.nombre, vendidos: 0 };
        actual.vendidos += det.cantidad;
        acc[det.nombre] = actual;
        return acc;
      }, {}),
  )
    .sort((a, b) => b.vendidos - a.vendidos)
    .slice(0, 10);

  // ── Órdenes y compras del periodo (sin anuladas) ──
  const ordenesPeriodo = ordenes.filter(
    (o) => o.estado !== "Anulado" && esFechaISO(o.fecha) && enPeriodo(o.fecha, periodo),
  );
  const gestionesPeriodo = gestiones.filter(
    (g) => g.estado !== "Anulado" && esFechaISO(g.fechaFactura) && enPeriodo(g.fechaFactura, periodo),
  );

  // ── Eje X dinámico de las gráficas 3 y 4 ──
  // Semana → por día (lun–dom) · Mes → por semana del mes (Semana 1–5) ·
  // Total → por mes (últimos 12 meses con datos, orden ascendente).
  const DOW_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  interface GrupoEje {
    clave: string;
    etiqueta: string;
    /** Para "semana": clave = fecha ISO; para "mes": clave = "1".."5"; total: "YYYY-MM". */
    extraer: (fecha: string) => string;
  }
  const gruposEje: GrupoEje[] =
    periodo === "semana"
      ? Array.from({ length: 7 }, (_, i) => {
          const d = agregarDias(lunesDe(new Date()), i);
          const iso = fechaISO(d);
          return { clave: iso, etiqueta: `${DOW_CORTO[d.getDay()]} ${d.getDate()}`, extraer: (f: string) => f };
        })
      : periodo === "mes"
        ? [1, 2, 3, 4, 5].map((s) => ({
            clave: String(s),
            etiqueta: `Semana ${s}`,
            extraer: (f: string) => String(semanaDelMes(f)),
          }))
        : (() => {
            const meses = new Set<string>();
            ordenesPeriodo.forEach((o) => meses.add(o.fecha.slice(0, 7)));
            gestionesPeriodo.forEach((g) => meses.add(g.fechaFactura.slice(0, 7)));
            return [...meses].sort().slice(-12).map((m) => ({
              clave: m,
              etiqueta: `${m.slice(5, 7)}/${m.slice(0, 4)}`,
              extraer: (f: string) => f.slice(0, 7),
            }));
          })();

  // ── 3. Órdenes de compra vs compras (eje X según filtro) ──
  const dataOCvsCompras = gruposEje.map((g) => ({
    etiqueta: g.etiqueta,
    ordenes: ordenesPeriodo
      .filter((o) => g.extraer(o.fecha) === g.clave)
      .reduce((t, o) => t + o.items.reduce((si, i) => si + i.cantidad * i.costoUnitario, 0), 0),
    compras: gestionesPeriodo
      .filter((ga) => g.extraer(ga.fechaFactura) === g.clave)
      .reduce((t, ga) => t + ga.valorTotal, 0),
  }));

  // ── 4. Compras por proveedor: eje X = semanas/días/meses, una serie por proveedor ──
  const proveedoresPorTotal = [...gestionesPeriodo.reduce<Map<string, number>>((acc, g) => {
    const p = (g.proveedor ?? "").trim() || "Sin proveedor";
    acc.set(p, (acc.get(p) ?? 0) + g.valorTotal);
    return acc;
  }, new Map())].sort((a, b) => b[1] - a[1]);
  const TOP_PROVEEDORES = 8;
  const proveedoresTop = new Set(proveedoresPorTotal.slice(0, TOP_PROVEEDORES).map(([p]) => p));
  const PALETA = ["#C62828", "#1565C0", "#2e7d32", "#F59E0B", "#6a1b9a", "#00838f", "#e65100", "#37474f", "#ad1457"];
  const nombresProveedores = [
    ...[...proveedoresTop],
    ...(proveedoresPorTotal.length > TOP_PROVEEDORES ? ["Otros"] : []),
  ];
  const dataProveedores = gruposEje.map((g) => {
    const fila: Record<string, string | number> = { etiqueta: g.etiqueta };
    nombresProveedores.forEach((p) => (fila[p] = 0));
    gestionesPeriodo.forEach((ga) => {
      if (g.extraer(ga.fechaFactura) !== g.clave) return;
      const crudo = (ga.proveedor ?? "").trim() || "Sin proveedor";
      const p = proveedoresTop.has(crudo) ? crudo : "Otros";
      fila[p] = Number(fila[p] ?? 0) + ga.valorTotal;
    });
    return fila;
  });
  const hayComprasProveedores = gestionesPeriodo.length > 0;

  // ── 5. Comportamiento de ventas: selector propio Diario | Mensual | Anual ──
  const [granularidad, setGranularidad] = useState<"diario" | "mensual" | "anual">("diario");
  interface PuntoVenta {
    etiqueta: string;
    ingresos: number;
    nVentas: number;
  }
  const mapaVentas = new Map<string, PuntoVenta>();
  ventasValidas.forEach((v) => {
    if (!esFechaISO(v.fecha)) return;
    const clave =
      granularidad === "diario"
        ? v.fecha
        : granularidad === "mensual"
          ? v.fecha.slice(0, 7)
          : v.fecha.slice(0, 4);
    const punto = mapaVentas.get(clave) ?? { etiqueta: clave, ingresos: 0, nVentas: 0 };
    punto.ingresos += v.total;
    punto.nVentas += 1;
    mapaVentas.set(clave, punto);
  });
  const dataVentasSerie = [...mapaVentas.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(granularidad === "diario" ? -31 : 0)
    .map(([, p]) => ({
      ...p,
      etiqueta:
        granularidad === "diario"
          ? `${p.etiqueta.slice(8, 10)}/${p.etiqueta.slice(5, 7)}`
          : granularidad === "mensual"
            ? `${p.etiqueta.slice(5, 7)}/${p.etiqueta.slice(0, 4)}`
            : p.etiqueta,
    }));

  // ── 6. No conformes por semana del mes, apilados por tipo de solución ──
  const TIPOS_NC_TOP = 5;
  const conteoTipos = [...ncPeriodo.reduce<Map<string, number>>((acc, nc) => {
    const t = nc.tipoSolucion?.trim() || "Sin solución asignada";
    acc.set(t, (acc.get(t) ?? 0) + 1);
    return acc;
  }, new Map())].sort((a, b) => b[1] - a[1]);
  const tiposTop = conteoTipos.slice(0, TIPOS_NC_TOP).map(([t]) => t);
  const tiposNC = [...tiposTop, ...(conteoTipos.length > TIPOS_NC_TOP ? ["Otros"] : [])];
  const dataNC = [1, 2, 3, 4, 5].map((s) => {
    const fila: Record<string, string | number> = { semana: `Semana ${s}` };
    tiposNC.forEach((t) => (fila[t] = 0));
    ncPeriodo.forEach((nc) => {
      if (!esFechaISO(nc.fechaRegistro) || semanaDelMes(nc.fechaRegistro) !== s) return;
      const crudo = nc.tipoSolucion?.trim() || "Sin solución asignada";
      const t = tiposTop.includes(crudo) ? crudo : "Otros";
      fila[t] = Number(fila[t] ?? 0) + 1;
    });
    return fila;
  });

  const vacio = (valores: number[]) => valores.every((v) => !v);
  const cop = (v: number) => fmt(v);
  const und = (v: number) => `${v} ${v === 1 ? "unidad" : "unidades"}`;
  /** Etiqueta del eje X según el filtro global (para títulos/etiquetas). */
  const ejeSegunFiltro =
    periodo === "semana" ? "por día (lun–dom)" : periodo === "mes" ? "por semana del mes (Semana 1–5)" : "por mes";

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
  const cop2 = puedeVer(KEY("Producción",  "Orden de Producción"));
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
    [cv, ccl, ci, cpr, coc, cco, cp, ccp, cop2, cpe, ccfg, cus, cemp].every((v) => !v);

  // Accesos rápidos — cada uno ligado a su sub-opción
  type ActionDef = { label: string; Icon: typeof Package; screen: Screen };
  const quickActions: ActionDef[] = [
    cv  && { label: "Ventas",         Icon: ShoppingBag,   screen: "ventas-pedidos"    as Screen },
    ccl && { label: "Clientes",       Icon: Users,          screen: "clientes"          as Screen },
    cp  && { label: "Productos",      Icon: Package,        screen: "gestion-productos" as Screen },
    ci  && { label: "Insumos",        Icon: Archive,        screen: "supplies"          as Screen },
    cpr && { label: "Proveedores",    Icon: Truck,          screen: "suppliers"         as Screen },
    coc && { label: "Orden de Compra", Icon: ClipboardList, screen: "orden-compra"      as Screen },
    cop2 && { label: "Producción",    Icon: Layers,         screen: "production-orders" as Screen },
    ccfg && { label: "Roles", Icon: Settings,       screen: "gestion-roles"    as Screen },
    cus  && { label: "Usuarios",      Icon: Users,         screen: "users"             as Screen },
    cemp && { label: "Empleados",     Icon: IdCard,        screen: "empleados"         as Screen },
  ].filter(Boolean) as ActionDef[];

  // ── §3 — Vista "Inicio" del empleado (rol ≠ Administrador) ────────────
  // Sin KPIs, gráficas, indicadores ni "Últimas ventas": solo saludo, chip
  // del rol y tarjetas de los sub-módulos a los que su rol tiene acceso "Ver".
  if (!isNamedAdmin) {
    const modulos = MODULOS_INICIO.map((m) => ({
      ...m,
      acciones: accesos[m.permKey]?.filter((a) => [...ACCIONES, ACCION_EXCEL].includes(a)) ?? [],
    })).filter((m) => m.acciones.includes("Ver"));

    return (
      <div className="px-4 sm:px-6 py-6">
        {/* Header: saludo + fecha + chip del rol activo */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
            ¡{greeting}, {firstName}! 👋
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-muted-foreground capitalize">{dateStr}</p>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {tieneRolActivo ? loggedInRoleName : "sin rol"}
            </span>
          </div>
        </div>

        {noAccess ? (
          /* Módulos no configurados / sin rol activo */
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
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Estos son los módulos a los que tienes acceso con tu rol{" "}
              <span className="font-semibold text-foreground">{loggedInRoleName}</span>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {modulos.map(({ permKey, screen, nombre, Icon, descripcion, acciones }) => (
                <div
                  key={permKey}
                  className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <p className="font-bold text-sm text-foreground">{nombre}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{descripcion}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...ACCIONES, ACCION_EXCEL]
                      .filter((a) => acciones.includes(a))
                      .map((a) => (
                        <span
                          key={a}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${accionColors[a]}`}
                        >
                          {a}
                        </span>
                      ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(screen)}
                    className="mt-auto pt-1 text-xs font-semibold text-primary hover:underline cursor-pointer text-left"
                  >
                    Ir al módulo →
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6">
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

      {/* Gráfica "Ventas hoy — 4pm a 10pm" (arriba de las tarjetas) */}
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
              <p className="text-sm text-muted-foreground mt-0.5">
                {unidadesHoy} producto{unidadesHoy === 1 ? "" : "s"} vendido{unidadesHoy === 1 ? "" : "s"} hoy
              </p>
            </div>
            <span className="text-primary text-sm font-semibold flex items-center gap-1 group-hover:underline">
              Ver detalle por semana <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={hourlyHoy} barSize={22} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
              <XAxis dataKey="hora" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<GrafTooltip formatear={(_, v) => `${v} producto${v === 1 ? "" : "s"}`} />} />
              <Bar dataKey="ventas" name="Unidades" fill="#C62828" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-muted-foreground mt-2 text-right">
            Última barra = hora en curso · clic para ver ventas y compras
          </p>
        </div>
      )}

      {/* Tarjetas (exactamente 4) + filtro global */}
      {(hasDashboardAccess || cv) && (
        <div className="mb-7">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
              Indicadores comerciales
            </h2>
            <div className="flex gap-1 bg-muted rounded-xl p-1" role="group" aria-label="Filtro de periodo">
              {PERIODOS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={periodo === p.id}
                  onClick={() => setPeriodo(p.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold cursor-pointer transition-all ${
                    periodo === p.id
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tarjetas.map(({ label, value, Icon, bg, ic, screen }) => (
              <button
                key={label}
                type="button"
                onClick={() => navigate(screen)}
                className="text-left bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                    <Icon className={`w-5 h-5 ${ic}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground mb-0.5" style={{ fontFamily: MONO }}>
                  {value}
                </p>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{etiquetaPeriodoTxt}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 6 gráficas con datos reales — Administrador o permiso Dashboard */}
      {(hasDashboardAccess || isNamedAdmin) && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
              Estadísticas del periodo
            </h2>
            <p className="text-xs text-muted-foreground">
              Filtro activo: <span className="font-semibold text-foreground">{etiquetaPeriodoTxt}</span>
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1. Top 10 clientes: pedidos vs valor */}
            <GraficaCard
              titulo="Top 10 clientes frecuentes vs mayores consumidores"
              etiqueta="Unión del top 10 por pedidos y del top 10 por valor, ordenada por pedidos"
            >
              {dataClientes.length === 0 ? (
                <SinDatos texto="Sin ventas de clientes en este periodo" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dataClientes} margin={{ left: -8, right: 4, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="nombre" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={60} />
                    <YAxis yAxisId="pedidos" allowDecimals={false} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="valor" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                    <Tooltip content={<GrafTooltip formatear={(serie, v) => (serie === "valor" ? cop(v) : `${v} pedidos`)} />} />
                    <Legend />
                    <Bar yAxisId="pedidos" dataKey="pedidos" name="Pedidos" fill="#C62828" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="valor" dataKey="total" name="Valor comprado" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GraficaCard>

            {/* 2. Top 10 productos más vendidos */}
            <GraficaCard
              titulo="Top 10 productos más vendidos"
              etiqueta="Suma de detalle[].cantidad de las ventas del periodo (unidades)"
            >
              {dataProductos.length === 0 ? (
                <SinDatos texto="Sin productos vendidos en este periodo" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dataProductos} layout="vertical" margin={{ left: 8, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 10 }} />
                    <Tooltip content={<GrafTooltip formatear={(_, v) => und(v)} />} />
                    <Bar dataKey="vendidos" name="Unidades" fill="#2563EB" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GraficaCard>

            {/* 3. Órdenes de compra vs compras (eje X según filtro global) */}
            <GraficaCard
              titulo="Órdenes de compra vs compras semanales"
              etiqueta={`Valor de órdenes creadas vs facturas registradas ${ejeSegunFiltro}, sin anuladas (COP)`}
            >
              {vacio(dataOCvsCompras.flatMap((d) => [d.ordenes, d.compras])) ? (
                <SinDatos texto="Sin compras ni órdenes en este periodo" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dataOCvsCompras} margin={{ left: -4, right: 8, bottom: periodo === "total" ? 40 : 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="etiqueta"
                      tick={{ fontSize: periodo === "semana" ? 10 : 11 }}
                      interval={0}
                      angle={periodo === "total" ? -30 : 0}
                      textAnchor={periodo === "total" ? "end" : "middle"}
                      height={periodo === "total" ? 55 : 30}
                    />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                    <Tooltip content={<GrafTooltip formatear={(_, v) => cop(v)} />} />
                    <Legend />
                    <Bar dataKey="ordenes" name="Órdenes de compra" fill="#1565C0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="compras" name="Compras (facturas)" fill="#C62828" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GraficaCard>

            {/* 4. Compras por proveedor: eje X = semanas/días/meses, serie = proveedor */}
            <GraficaCard
              titulo="Compras por proveedor"
              etiqueta={`Facturas no anuladas ${ejeSegunFiltro}, una serie por proveedor (top 8 + Otros, COP)`}
            >
              {!hayComprasProveedores ? (
                <SinDatos texto="Sin compras registradas en este periodo" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dataProveedores} margin={{ left: -4, right: 8, bottom: periodo === "total" ? 40 : 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="etiqueta"
                      tick={{ fontSize: periodo === "semana" ? 10 : 11 }}
                      interval={0}
                      angle={periodo === "total" ? -30 : 0}
                      textAnchor={periodo === "total" ? "end" : "middle"}
                      height={periodo === "total" ? 55 : 30}
                    />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                    <Tooltip content={<GrafTooltip formatear={(_, v) => cop(v)} />} />
                    <Legend />
                    {nombresProveedores.map((p, i) => (
                      <Bar
                        key={p}
                        dataKey={p}
                        name={p}
                        stackId="prov"
                        fill={PALETA[i % PALETA.length]}
                        radius={i === nombresProveedores.length - 1 ? [4, 4, 0, 0] : undefined}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GraficaCard>

            {/* 5. Comportamiento de ventas: Diario | Mensual | Anual */}
            <GraficaCard
              titulo="Comportamiento de ventas"
              etiqueta={`Ingresos ($) agrupados por ${granularidad === "diario" ? "día" : granularidad === "mensual" ? "mes" : "año"}, con N° de ventas en el tooltip`}
            >
              <div className="flex gap-1 bg-muted rounded-xl p-1 mb-3 w-fit" role="group" aria-label="Granularidad de ventas">
                {(["diario", "mensual", "anual"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={granularidad === g}
                    onClick={() => setGranularidad(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-all ${
                      granularidad === g
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g === "diario" ? "Diario" : g === "mensual" ? "Mensual" : "Anual"}
                  </button>
                ))}
              </div>
              {dataVentasSerie.length === 0 ? (
                <SinDatos texto="Sin ventas en este periodo" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dataVentasSerie} margin={{ left: -8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                    <Tooltip content={<TooltipVentas />} />
                    <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#16A34A" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </GraficaCard>

            {/* 6. No conformes por semana del mes, apilados por tipo de solución */}
            <GraficaCard
              titulo="Productos no conformes por semana del mes"
              etiqueta="Conteo por fechaRegistro (Semana 1–5), apilado por tipo de solución"
            >
              {vacio(dataNC.flatMap((fila) => tiposNC.map((t) => Number(fila[t] ?? 0)))) ? (
                <SinDatos texto="Sin no conformes registrados en este periodo" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dataNC} margin={{ left: -4, right: 8, bottom: periodo === "total" ? 40 : 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="semana" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip content={<GrafTooltip formatear={(_, v) => `${v} no conforme${v === 1 ? "" : "s"}`} />} />
                    <Legend />
                    {tiposNC.map((t, i) => (
                      <Bar
                        key={t}
                        dataKey={t}
                        name={t}
                        stackId="nc"
                        fill={PALETA[i % PALETA.length]}
                        radius={i === tiposNC.length - 1 ? [4, 4, 0, 0] : undefined}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GraficaCard>
          </div>
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
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">{hora12(horaVenta(venta))}</td>
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
