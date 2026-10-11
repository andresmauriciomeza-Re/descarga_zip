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
  IdCard,
  Layers,
  Lock,
  Package,
  Settings,
  ShoppingBag,
  Truck,
  Users,
} from "lucide-react";

import { KEY, type AccesosMap } from "@/features/roles/pages/GestionConfigScreen";
import { HOURLY_TODAY } from "@/features/dashboard/pages/SalesChartScreen";
import type { Venta } from "@/features/ventas/pages/VentasScreen";
import { hora12, minutosDeHora } from "@/shared/utils/hora";
import type { Screen } from "@/shared/utils/screen";

const SERIF = "var(--font-titulo)";
const MONO = "var(--font-texto)";
const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`;

export function DashboardScreen({
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
  // Parser compartido (utils/hora.ts): entiende tanto "18:30" como
  // "6:30 p. m.", que es el formato en el que se guarda la recogida.
  const minutosHora = (hora: string) => minutosDeHora(hora) ?? 0;
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
                    <p className="font-bold text-foreground">{payload[0].value} producto{payload[0].value === 1 ? "" : "s"}</p>
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
