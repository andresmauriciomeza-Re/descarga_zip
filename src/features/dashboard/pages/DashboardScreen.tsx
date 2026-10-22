import { useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
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
  ShoppingBag,
  Truck,
  Users,
} from "lucide-react";

import { KEY, type AccesosMap } from "@/features/roles/pages/GestionConfigScreen";
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
import { ChartCard } from "@/shared/components/ChartCard";
import { FiltroPeriodo } from "@/shared/components/FiltroPeriodo";

const SERIF = "var(--font-titulo)";
const MONO = "var(--font-texto)";
const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`;

/** Rango real de atención (utils/hora.ts): 4 p. m. a 10 p. m. */
const HORAS_HOY = [16, 17, 18, 19, 20, 21, 22];

const DOW_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// ── Tooltip único de todas las gráficas: valores exactos (COP, unidades o
// conteos) según la función `formatear` que recibe cada una ───────────
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

export function DashboardScreen({
  navigate,
  ventas,
  gestiones,
  ordenes,
  noConformidades,
  insumos,
  ordenesProduccion,
  clientes,
  loggedInUser,
  loggedInRoleName,
  tieneRolActivo,
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
  hasDashboardAccess: boolean;
  accesos: AccesosMap;
  // Inventarios cableados desde App.tsx (se usan en los próximos indicadores).
  productos: Producto[];
  insumos: Insumo[];
  proveedores: ProveedorRef[];
  ordenesProduccion: OrdenProduccion[];
  clientes: Cliente[];
}) {
  const firstName = (loggedInUser?.nombre ?? "Empleado").split(" ")[0];
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

  // ── Filtro global de los indicadores: Diario · Semanal · Mensual ──
  const [periodo, setPeriodo] = useState<Periodo>("semana");

  /**
   * Regla única de ingresos: SOLO las ventas Completado suman dinero y
   * conteo. La misma función se usa en las tarjetas Y en todas las gráficas
   * de ventas para que los números nunca se contradigan. Las ventas que
   * todavía no se entregan (Por verificar, En espera, Por entregar), las
   * anuladas, las devoluciones y los rechazos no cuentan; las devoluciones
   * se siguen contando aparte.
   */
  const esVentaIngresante = (v: Venta) => v.estado === "Completado";

  /** Ventas que suman dentro de un periodo dado (filtro de cada gráfica). */
  const ventasEn = (p: Periodo) =>
    ventas.filter((v) => enPeriodo(v.fecha, p) && esVentaIngresante(v));

  // ── Filtro propio de cada gráfica (todas arrancan en Semanal) ──
  const [fVentas, setFVentas] = useState<Periodo>("semana");
  const [fClientes, setFClientes] = useState<Periodo>("semana");
  const [fProductos, setFProductos] = useState<Periodo>("semana");
  const [fOC, setFOC] = useState<Periodo>("semana");
  const [fProv, setFProv] = useState<Periodo>("semana");
  const [fNC, setFNC] = useState<Periodo>("semana");

  // Filtro global → tarjetas de indicadores.
  const ventasPeriodo = ventas.filter((v) => enPeriodo(v.fecha, periodo));
  const ingresantesGlobal = ventasPeriodo.filter(esVentaIngresante);

  const ingresosPeriodo = ingresantesGlobal.reduce((s, v) => s + v.total, 0);

  // Devoluciones registradas en el periodo (fila en tb_devolucion), contadas
  // por la FECHA DE LA DEVOLUCIÓN (tb_devolucion.fecha) y no por la de la
  // venta; si esa fecha no viene, se cae a la de la venta. Mismo enPeriodo que
  // las tarjetas de Ingresos y Ventas.
  const devolucionesPeriodo = ventas.filter(
    (v) => v.idDevolucion != null && enPeriodo(v.devolucionFecha ?? v.fecha, periodo),
  );

  // ── Tarjetas (exactamente 4) ──
  const etiquetaPeriodoTxt = etiquetaPeriodo(periodo);
  const tarjetas: {
    label: string;
    value: string;
    sub?: string;
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
      value: String(ingresantesGlobal.length),
      Icon: ShoppingBag,
      bg: "bg-blue-50",
      ic: "text-blue-600",
      screen: "ventas-pedidos",
    },
    {
      // Devoluciones ya conectadas: cuenta las registradas en el periodo según
      // la fecha de la devolución. Sin `sub`, muestra la etiqueta del periodo
      // ("Hoy" / "Esta semana" / "Este mes") como Ingresos y Ventas.
      label: "Devoluciones",
      value: String(devolucionesPeriodo.length),
      Icon: RotateCcw,
      bg: "bg-orange-50",
      ic: "text-orange-600",
      screen: "devoluciones",
    },
    {
      // El módulo de productos no conformes todavía no está conectado.
      label: "Productos no conformes",
      value: "—",
      sub: "Sin conectar",
      Icon: AlertTriangle,
      bg: "bg-red-50",
      ic: "text-red-600",
      screen: "perecederos",
    },
  ];

  // ── 1. Top 10 clientes: pedidos vs valor (unión de ambos top 10) ──
  const clientesAgg = Object.values(
    ventasEn(fClientes).reduce<Record<string, { nombre: string; pedidos: number; total: number }>>(
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
    ventasEn(fProductos)
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

  // ── Órdenes y compras por gráfica (sin anuladas) ──
  const ordenesEn = (p: Periodo) =>
    ordenes.filter((o) => o.estado !== "Anulado" && esFechaISO(o.fecha) && enPeriodo(o.fecha, p));
  const gestionesEn = (p: Periodo) =>
    gestiones.filter((g) => g.estado !== "Anulado" && esFechaISO(g.fechaFactura) && enPeriodo(g.fechaFactura, p));

  // ── Eje X estandarizado de las gráficas de compras, órdenes y no
  // conformes: "dia" → un grupo "Hoy", "semana" → Lun–Dom, "mes" → Semana 1–5. ──
  interface GrupoEje {
    clave: string;
    etiqueta: string;
    extraer: (fecha: string) => string;
  }
  const gruposEje = (p: Periodo): GrupoEje[] =>
    p === "dia"
      ? [{ clave: hoyISO(), etiqueta: "Hoy", extraer: (f) => f }]
      : p === "semana"
        ? Array.from({ length: 7 }, (_, i) => {
            const d = agregarDias(lunesDe(new Date()), i);
            const iso = fechaISO(d);
            return { clave: iso, etiqueta: `${DOW_CORTO[d.getDay()]} ${d.getDate()}`, extraer: (f: string) => f };
          })
        : [1, 2, 3, 4, 5].map((s) => ({
            clave: String(s),
            etiqueta: `Semana ${s}`,
            extraer: (f: string) => String(semanaDelMes(f)),
          }));

  // ── 1. Gráfica combinada de ventas: barras = unidades, línea = ingresos.
  // El eje X se estandariza según SU filtro: "dia" por hora (4–10 p. m.),
  // "semana" por día (Lun–Dom) y "mes" por Semana 1–5. ──
  interface PuntoVenta {
    etiqueta: string;
    ingresos: number;
    unidades: number;
  }
  const ventasGrafica = ventasEn(fVentas);
  const dataVentasGrafica: PuntoVenta[] =
    fVentas === "dia"
      ? (() => {
          const hoy = hoyISO();
          return HORAS_HOY.map((h) => {
            const fila = ventasGrafica.filter(
              (v) => v.fecha === hoy && Math.floor(minutosHora(horaVenta(v)) / 60) === h,
            );
            return {
              etiqueta: `${h - 12}pm`,
              ingresos: fila.reduce((s, v) => s + v.total, 0),
              unidades: fila.reduce((s, v) => s + (v.cantidad || 0), 0),
            };
          });
        })()
      : gruposEje(fVentas).map((g) => {
          const fila = ventasGrafica.filter((v) => esFechaISO(v.fecha) && g.extraer(v.fecha) === g.clave);
          return {
            etiqueta: g.etiqueta,
            ingresos: fila.reduce((s, v) => s + v.total, 0),
            unidades: fila.reduce((s, v) => s + (v.cantidad || 0), 0),
          };
        });

  // ── 4. Órdenes de compra vs compras (eje X según el filtro de la gráfica) ──
  const ordenesGrafica = ordenesEn(fOC);
  const gestionesGrafica = gestionesEn(fOC);
  const dataOCvsCompras = gruposEje(fOC).map((g) => ({
    etiqueta: g.etiqueta,
    ordenes: ordenesGrafica
      .filter((o) => g.extraer(o.fecha) === g.clave)
      .reduce((t, o) => t + o.items.reduce((si, i) => si + i.cantidad * i.costoUnitario, 0), 0),
    compras: gestionesGrafica
      .filter((ga) => g.extraer(ga.fechaFactura) === g.clave)
      .reduce((t, ga) => t + ga.valorTotal, 0),
  }));

  // ── 5. Compras por proveedor: eje X del filtro, una serie por proveedor ──
  const gestionesProv = gestionesEn(fProv);
  const proveedoresPorTotal = [...gestionesProv.reduce<Map<string, number>>((acc, g) => {
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
  const dataProveedores = gruposEje(fProv).map((g) => {
    const fila: Record<string, string | number> = { etiqueta: g.etiqueta };
    nombresProveedores.forEach((p) => (fila[p] = 0));
    gestionesProv.forEach((ga) => {
      if (g.extraer(ga.fechaFactura) !== g.clave) return;
      const crudo = (ga.proveedor ?? "").trim() || "Sin proveedor";
      const p = proveedoresTop.has(crudo) ? crudo : "Otros";
      fila[p] = Number(fila[p] ?? 0) + ga.valorTotal;
    });
    return fila;
  });
  const hayComprasProveedores = gestionesProv.length > 0;

  // ── 6. No conformes: módulo todavía sin conectar ──
  // La gráfica ya no lee datos de ejemplo: cuando el módulo de productos no
  // conformes se conecte al backend, aquí se vuelve a calcular la serie.

  const vacio = (valores: number[]) => valores.every((v) => !v);
  const cop = (v: number) => fmt(v);
  const und = (v: number) => `${v} ${v === 1 ? "unidad" : "unidades"}`;
  /** Etiqueta del eje X según el filtro de CADA gráfica (títulos/etiquetas). */
  const ejeDe = (p: Periodo) =>
    p === "dia" ? "de hoy" : p === "semana" ? "por día (lun–dom)" : "por semana del mes";

  // ÚNICA regla de acceso del Dashboard. El permiso "Dashboard::Dashboard"
  // (o la cuenta super admin, calculado en App.tsx como `hasDashboardAccess`)
  // decide QUIÉN ve esta vista; dentro de ella, `puedeVer` decide qué módulos
  // muestra según el permiso "Ver" de cada sub-opción. Ventas ya NO abre el
  // Dashboard: el acoplamiento `|| cv` existía cuando Inicio y Dashboard
  // eran la misma pantalla y se eliminó junto con la vista de módulos.
  const puedeVer = (permKey: string) =>
    hasDashboardAccess || (accesos[permKey]?.includes("Ver") ?? false);

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

  // ── Vista "Inicio" del empleado (sin permiso Dashboard) ────────────────
  // Diseño original restaurado: saludo dinámico + fecha + chip del rol, KPIs
  // (máx. 4), accesos rápidos (solo módulos con permiso "Crear") y hasta 2
  // tablas con "Ver todos →", todo según los permisos "Ver" del rol.
  // Los registros no guardan quién los creó, así que las tablas son del día
  // en general ("Ventas de hoy"), no "Mis ventas".
  if (!hasDashboardAccess) {
    const ver = (m: string, s: string) => accesos[KEY(m, s)]?.includes("Ver") ?? false;
    const crear = (m: string, s: string) => accesos[KEY(m, s)]?.includes("Crear") ?? false;

    const hoy = hoyISO();
    const ventasHoy = ventas.filter((v) => v.fecha === hoy && esVentaIngresante(v));
    const totalVendidoHoy = ventasHoy.reduce((s, v) => s + v.total, 0);
    const porVerificar = ventas.filter((v) => v.estado === "Por verificar");
    const devoluciones = ventas.filter((v) => v.devolucionTipo !== undefined);
    // Devoluciones registradas y aún sin resolver (tb_devolucion.estado =
    // 'Pendiente'): sin filtro de periodo, porque son las que faltan por
    // resolver hoy.
    const devolucionesPendientes = ventas.filter(
      (v) => v.idDevolucion != null && v.devolucionResuelta === false,
    );
    const ordenesEnCurso = ordenesProduccion.filter(
      (o) => o.estadoOrden === "pendiente" || o.estadoOrden === "en-proceso",
    );
    const insumosBajo = insumos.filter((i) => i.stockActual < i.stockMinimo);
    const ocPorRecibir = ordenes.filter((o) => o.estado === "Enviado");
    const clientesActivos = clientes.filter((c) => c.activo);

    // KPIs — máximo 4, en orden de prioridad según permisos del rol.
    type KpiEmp = { label: string; value: string; sub: string; Icon: typeof Package; bg: string; ic: string };
    const kpisEmp = [
      ver("Ventas", "Ventas") && { label: "Ventas de hoy", value: String(ventasHoy.length), sub: fmt(totalVendidoHoy), Icon: ShoppingBag, bg: "bg-blue-50", ic: "text-blue-600" },
      ver("Ventas", "Ventas") && { label: "Pedidos por verificar pago", value: String(porVerificar.length), sub: "Pago sin confirmar", Icon: ClipboardList, bg: "bg-amber-50", ic: "text-amber-600" },
      ver("Ventas", "Clientes") && { label: "Clientes", value: String(clientesActivos.length), sub: "Registrados en el sistema", Icon: Users, bg: "bg-violet-50", ic: "text-violet-600" },
      // Devoluciones ya conectadas: las registradas que siguen 'Pendiente' de
      // resolver (sin importar el periodo).
      ver("Ventas", "Devoluciones") && { label: "Devoluciones pendientes", value: String(devolucionesPendientes.length), sub: "Por resolver", Icon: RefreshCw, bg: "bg-orange-50", ic: "text-orange-600" },
      ver("Producción", "Orden de Producción") && { label: "Órdenes en curso", value: String(ordenesEnCurso.length), sub: "Pendientes y en proceso", Icon: Layers, bg: "bg-sky-50", ic: "text-sky-600" },
      // El módulo de productos no conformes todavía no está conectado.
      ver("Producción", "Producto No Conforme") && { label: "No conformes pendientes", value: "—", sub: "Sin conectar", Icon: AlertTriangle, bg: "bg-red-50", ic: "text-red-600" },
      ver("Compras", "Insumos") && { label: "Insumos bajo mínimo", value: String(insumosBajo.length), sub: "Stock por debajo del mínimo", Icon: Package, bg: "bg-emerald-50", ic: "text-emerald-600" },
      ver("Compras", "Orden de Compra") && { label: "Compras por recibir", value: String(ocPorRecibir.length), sub: "Órdenes enviadas al proveedor", Icon: Truck, bg: "bg-cyan-50", ic: "text-cyan-600" },
    ].filter(Boolean).slice(0, 4) as KpiEmp[];

    // Accesos rápidos — solo módulos con permiso "Crear".
    type AccesoRapido = { label: string; Icon: typeof Package; screen: Screen };
    const accesosRapidos: AccesoRapido[] = [
      crear("Ventas", "Ventas") && { label: "Ventas", Icon: ShoppingBag, screen: "ventas-pedidos" as Screen },
      crear("Ventas", "Clientes") && { label: "Clientes", Icon: Users, screen: "clientes" as Screen },
      crear("Ventas", "Devoluciones") && { label: "Devoluciones", Icon: RefreshCw, screen: "devoluciones" as Screen },
      crear("Producción", "Productos") && { label: "Productos", Icon: Package, screen: "gestion-productos" as Screen },
      crear("Producción", "Orden de Producción") && { label: "Producción", Icon: Layers, screen: "production-orders" as Screen },
      crear("Compras", "Insumos") && { label: "Insumos", Icon: Archive, screen: "supplies" as Screen },
      crear("Compras", "Proveedores") && { label: "Proveedores", Icon: Truck, screen: "suppliers" as Screen },
      crear("Compras", "Orden de Compra") && { label: "Orden de Compra", Icon: ClipboardList, screen: "orden-compra" as Screen },
      crear("Compras", "Compra") && { label: "Compras", Icon: FileText, screen: "gestion-compra" as Screen },
      crear("Configuración", "Roles") && { label: "Roles", Icon: Settings, screen: "gestion-roles" as Screen },
      crear("Configuración", "Usuarios") && { label: "Usuarios", Icon: Users, screen: "users" as Screen },
    ].filter(Boolean) as AccesoRapido[];

    // Tablas — máximo 2, en orden de prioridad: Ventas de hoy y la siguiente
    // con permiso (Devoluciones → Producción → Insumos).
    const ventasHoyTabla = [...ventasHoy]
      .map((venta, index) => ({ venta, index }))
      .sort((a, b) => {
        const porHora = minutosHora(horaVenta(b.venta)) - minutosHora(horaVenta(a.venta));
        return porHora !== 0 ? porHora : a.index - b.index;
      })
      .slice(0, 5)
      .map(({ venta }) => venta);
    const devolucionesTabla = [...devoluciones]
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, 5);
    const ordenesTabla = [...ordenesEnCurso]
      .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
      .slice(0, 5);
    const insumosTabla = insumosBajo.slice(0, 5);

    const ESTADO_VENTA: Record<Venta["estado"], string> = {
      "Por verificar": "Por verificar",
      "En espera": "En espera",
      "Por entregar": "Por entregar",
      Completado: "Completado",
      Devolucion: "Devuelta",
      Anulado: "Rechazado",
    };
    const ESTADO_OP: Record<string, string> = {
      pendiente: "Pendiente",
      "en-proceso": "En producción",
      completada: "Completada",
      cancelada: "Cancelada",
    };

    /** Envoltorio estándar de tabla del inicio: título + "Ver todos →". */
    const TablaInicio = ({ titulo, destino, cols, vacio, filas }: {
      titulo: string;
      destino: Screen;
      cols: string[];
      vacio: string;
      filas: ReactNode;
    }) => (
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>{titulo}</h2>
          <button
            onClick={() => navigate(destino)}
            className="text-primary text-sm font-semibold hover:underline cursor-pointer flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {cols.map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filas ?? (
                <tr>
                  <td colSpan={cols.length} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {vacio}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );

    return (
      <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        {/* Header: saludo dinámico + fecha + chip del rol activo */}
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
          /* Sin permisos "Ver" en ningún módulo / sin rol activo */
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
            {/* KPIs (máx. 4) */}
            {kpisEmp.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {kpisEmp.map(({ label, value, sub, Icon, bg, ic }) => (
                  <div key={label} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
                      <Icon className={`w-5 h-5 ${ic}`} />
                    </div>
                    <p className="text-2xl font-bold text-foreground mb-0.5" style={{ fontFamily: MONO }}>{value}</p>
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Accesos rápidos (solo módulos con permiso Crear) */}
            {accesosRapidos.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Accesos rápidos</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {accesosRapidos.map(({ label, Icon, screen }) => (
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

            {/* Tabla 1: Ventas de hoy */}
            {ver("Ventas", "Ventas") && (
              <TablaInicio
                titulo="Ventas de hoy"
                destino="ventas-pedidos"
                cols={["Cliente", "Monto", "Hora", "Estado"]}
                vacio="Aún no hay ventas hoy"
                filas={ventasHoyTabla.length === 0 ? null : ventasHoyTabla.map((venta) => (
                  <tr key={venta.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-foreground">{venta.usuario?.trim() || "Venta general"}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>{fmt(venta.total)}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{hora12(horaVenta(venta))}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{ESTADO_VENTA[venta.estado] ?? venta.estado}</td>
                  </tr>
                ))}
              />
            )}

            {/* Tabla 2: Devoluciones (si el rol las ve) */}
            {ver("Ventas", "Devoluciones") && (
              <TablaInicio
                titulo="Devoluciones"
                destino="devoluciones"
                cols={["Cliente", "Monto", "Fecha"]}
                vacio="No hay devoluciones registradas"
                filas={devolucionesTabla.length === 0 ? null : devolucionesTabla.map((venta) => (
                  <tr key={venta.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-foreground">{venta.usuario?.trim() || "Venta general"}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>{fmt(venta.devolucionMonto ?? venta.total)}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{venta.fecha}</td>
                  </tr>
                ))}
              />
            )}

            {/* Tabla 2 (alternativa): Órdenes en curso */}
            {(!ver("Ventas", "Devoluciones")) && ver("Producción", "Orden de Producción") && (
              <TablaInicio
                titulo="Órdenes en curso"
                destino="production-orders"
                cols={["Orden", "Cliente", "Estado"]}
                vacio="No hay órdenes en producción"
                filas={ordenesTabla.length === 0 ? null : ordenesTabla.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>{o.id}</td>
                    <td className="px-4 py-3.5 text-sm text-foreground">{o.cliente?.trim() || "Sin cliente"}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{ESTADO_OP[o.estadoOrden] ?? o.estadoOrden}</td>
                  </tr>
                ))}
              />
            )}

            {/* Tabla 2 (alternativa): Insumos bajo mínimo */}
            {(!ver("Ventas", "Devoluciones")) && (!ver("Producción", "Orden de Producción")) && ver("Compras", "Insumos") && (
              <TablaInicio
                titulo="Insumos bajo mínimo"
                destino="supplies"
                cols={["Insumo", "Stock", "Mínimo"]}
                vacio="No hay insumos bajo mínimo"
                filas={insumosTabla.length === 0 ? null : insumosTabla.map((i) => (
                  <tr key={i.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-foreground">{i.nombre}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>{i.stockActual}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{i.stockMinimo}</td>
                  </tr>
                ))}
              />
            )}
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
        </div>
      </div>

      {/* Tarjetas (exactamente 4) + filtro global */}
      <div className="mb-7">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
              Indicadores comerciales
            </h2>
            <FiltroPeriodo
              value={periodo}
              onChange={setPeriodo}
              ariaLabel="Filtro de los indicadores"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tarjetas.map(({ label, value, sub, Icon, bg, ic, screen }) => (
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
                <p className="text-[11px] text-muted-foreground mt-1">{sub ?? etiquetaPeriodoTxt}</p>
              </button>
            ))}
          </div>
        </div>

      {/* 6 gráficas con datos reales — permiso Dashboard. Cada una lleva su
          propio filtro Diario/Semanal/Mensual. */}
      <div className="mb-8">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
              Estadísticas
            </h2>
            <p className="text-xs text-muted-foreground">
              Cada gráfica tiene su propio filtro de periodo
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1. Ventas del periodo: barras (unidades) + línea (ingresos) */}
            <ChartCard
              titulo="Ventas del periodo"
              etiqueta={`Ingresos y unidades vendidas ${
                fVentas === "dia" ? "por hora (4–10 p. m.)" : ejeDe(fVentas)
              } (COP)`}
              periodo={fVentas}
              onPeriodo={setFVentas}
            >
              {vacio(dataVentasGrafica.flatMap((d) => [d.ingresos, d.unidades])) ? (
                <SinDatos texto="Sin ventas en este periodo" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={dataVentasGrafica} margin={{ left: -8, right: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis yAxisId="und" allowDecimals={false} tick={{ fontSize: 10 }} />
                    <YAxis
                      yAxisId="cop"
                      orientation="right"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                    />
                    <Tooltip
                      content={<GrafTooltip formatear={(serie, v) => (serie === "ingresos" ? cop(v) : und(v))} />}
                    />
                    <Legend />
                    <Bar yAxisId="und" dataKey="unidades" name="Unidades" fill="#C62828" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="cop" dataKey="ingresos" name="Ingresos" stroke="#16A34A" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => navigate("sales-chart")}
                  className="text-primary text-xs font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Ver detalle por semana <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </ChartCard>

            {/* 2. Top 10 clientes: pedidos vs valor */}
            <ChartCard
              titulo="Top 10 clientes frecuentes vs mayores consumidores"
              etiqueta="Unión del top 10 por pedidos y del top 10 por valor, ordenada por pedidos"
              periodo={fClientes}
              onPeriodo={setFClientes}
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
            </ChartCard>

            {/* 3. Top 10 productos más vendidos */}
            <ChartCard
              titulo="Top 10 productos más vendidos"
              etiqueta="Suma de detalle[].cantidad de las ventas del periodo (unidades)"
              periodo={fProductos}
              onPeriodo={setFProductos}
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
            </ChartCard>

            {/* 4. Órdenes de compra vs compras (eje X según su filtro) */}
            <ChartCard
              titulo="Órdenes de compra vs compras"
              etiqueta={`Valor de órdenes creadas vs facturas registradas ${ejeDe(fOC)}, sin anuladas (COP)`}
              periodo={fOC}
              onPeriodo={setFOC}
            >
              {vacio(dataOCvsCompras.flatMap((d) => [d.ordenes, d.compras])) ? (
                <SinDatos texto="Sin compras ni órdenes en este periodo" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dataOCvsCompras} margin={{ left: -4, right: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} interval={0} height={40} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                    <Tooltip content={<GrafTooltip formatear={(_, v) => cop(v)} />} />
                    <Legend />
                    <Bar dataKey="ordenes" name="Órdenes de compra" fill="#1565C0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="compras" name="Compras (facturas)" fill="#C62828" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* 5. Compras por proveedor: eje X del filtro, serie = proveedor */}
            <ChartCard
              titulo="Compras por proveedor"
              etiqueta={`Facturas no anuladas ${ejeDe(fProv)}, una serie por proveedor (top 8 + Otros, COP)`}
              periodo={fProv}
              onPeriodo={setFProv}
            >
              {!hayComprasProveedores ? (
                <SinDatos texto="Sin compras registradas en este periodo" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dataProveedores} margin={{ left: -4, right: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} interval={0} height={40} />
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
            </ChartCard>

            {/* 6. No conformes: módulo sin conectar (todavía no hay fuente
                real de datos, así que no se muestran datos de ejemplo). */}
            <ChartCard
              titulo="Productos no conformes"
              etiqueta="Módulo sin conectar"
              periodo={fNC}
              onPeriodo={setFNC}
            >
              <SinDatos texto="Sin conectar" />
            </ChartCard>
          </div>
        </div>

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

      {/* Últimas ventas */}
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
