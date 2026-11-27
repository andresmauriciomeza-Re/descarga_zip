import { useEffect, useState, type ReactNode } from "react";
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
import { AlertTriangle, Archive, ClipboardList, DollarSign, FileText, IdCard, Layers, Lock, Package, RefreshCw, RotateCcw, Settings, ShoppingBag, Truck, Users } from "lucide-react";

import { KEY, type AccesosMap } from "@/features/roles/utils/roles";
import type { Venta } from "@/features/sales/utils/sales";
import type { GestionCompra, OrdenCompra, ProveedorRef } from "@/features/purchase-orders/utils/purchase-orders";
import type { NoConformidad } from "@/features/non-conforming-products/utils/non-conforming-products";
import type { Producto } from "@/features/products/pages/ProductsScreen";
import type { Insumo } from "@/features/supplies/utils/supplies";
import type { Cliente } from "@/features/customers/utils/customers";
import type { OrdenProduccion } from "@/features/production-orders/utils/production-orders";
import { listarClientes } from "@/shared/services/authService";
import { formatearHora, minutosDeHora } from "@/shared/utils/time";
import {
  hoyBogota,
  agregarDias,
  enPeriodo,
  esFechaISO,
  etiquetaPeriodo,
  fechaISO,
  hoyISO,
  lunesDe,
  semanaDelMes,
  type Periodo,
} from "@/shared/utils/dates";
import type { Screen } from "@/shared/utils/screen";
import { ChartCard } from "@/shared/components/ChartCard";
import { FiltroPeriodo } from "@/shared/components/PeriodFilter";
import { useIsMobile } from "@/shared/components/ui/use-mobile";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { EncabezadoPagina } from "@/shared/components/panel/PageHeader";
import { EstadoPill, type TonoPill } from "@/shared/components/panel/StatusPill";
import { TarjetaFila } from "@/shared/components/panel/RowCard";
import { VacioEstado } from "@/shared/components/panel/EmptyState";
import { SelectorMes } from "@/features/dashboard/components/MonthSelector";
import { GrafTooltip, SinDatos } from "@/features/dashboard/components/ChartHelpers";
import { EstadoVentas } from "@/features/dashboard/components/SalesStatus";
import { TarjetaIndicador } from "@/features/dashboard/components/MetricCard";
import type { MesDisponible } from "@/features/dashboard/utils/dashboard";

const SERIF = "var(--font-titulo)";
const MONO = "var(--font-texto)";
const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`;
// Colores de las series: rojo, verde y azul (nunca solo rojo contra verde).
const C_ROJO = "var(--rojo)";
const C_VERDE = "var(--verde)";
const C_AZUL = "#1E5BB8";
/** Texto de «cuándo» para las frases de las gráficas. */
const cuando = (p: Periodo) => (p === "dia" ? "hoy" : p === "semana" ? "esta semana" : "este mes");
const ESTADO_VENTA_TXT: Record<Venta["estado"], string> = {
  "Por verificar": "Por verificar",
  "En espera": "En espera",
  "Por entregar": "Por entregar",
  Completado: "Completado",
  Devolucion: "Devuelta",
  Anulado: "Rechazado",
};
const ESTADO_VENTA_TONO: Record<Venta["estado"], TonoPill> = {
  "Por verificar": "ambar",
  "En espera": "azul",
  "Por entregar": "morado",
  Completado: "verde",
  Devolucion: "gris",
  Anulado: "rojo",
};
const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function mesesDesdeFechas(fechas: string[], mesActual: string): MesDisponible[] {
  const fechasValidas = fechas.filter(
    (fecha) => esFechaISO(fecha) && fecha.slice(0, 7) <= mesActual,
  );
  const primerMes = fechasValidas.length
    ? fechasValidas.reduce((minimo, fecha) => {
        const clave = fecha.slice(0, 7);
        return clave < minimo ? clave : minimo;
      }, mesActual)
    : mesActual;
  const meses: MesDisponible[] = [];
  let anio = Number(primerMes.slice(0, 4));
  let mes = Number(primerMes.slice(5, 7));
  while (`${anio}-${String(mes).padStart(2, "0")}` <= mesActual) {
    const clave = `${anio}-${String(mes).padStart(2, "0")}`;
    meses.push({
      clave,
      etiqueta: `${MESES_ES[mes - 1].charAt(0).toUpperCase()}${MESES_ES[mes - 1].slice(1)} ${anio}`,
    });
    mes += 1;
    if (mes > 12) {
      mes = 1;
      anio += 1;
    }
  }
  return meses;
}

/** Rango real de atención (utils/hora.ts): 4 p. m. a 10 p. m. */
const HORAS_HOY = [16, 17, 18, 19, 20, 21, 22];

const DOW_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/**
 * Tarjeta de indicador: ícono en su cuadrito de color, número grande, nombre
 * debajo y el subtítulo (el periodo "Hoy"/"Esta semana"/"Este mes" o el texto
 * fijo que corresponda). La usan IGUAL el Dashboard del admin ("Indicadores
 * comerciales") y el Inicio del empleado: un solo componente para que los
 * estilos nunca se desalineen.
 */
const ENLACE_POR_PANTALLA: Partial<Record<Screen, string>> = {
  "ventas-pedidos": "Ver las ventas",
  devoluciones: "Ver devoluciones",
  perecederos: "Ver productos no conformes",
  "production-orders": "Ver las órdenes",
  "gestion-compra": "Ver las compras",
  supplies: "Ver los insumos",
  clientes: "Ver los clientes",
};

export function DashboardScreen({
  navigate,
  ventas,
  ventasCargando,
  ventasError,
  puedeVerVentas,
  ordenesCompraCargando,
  errorOrdenesCompra,
  comprasCargando,
  errorCompras,
  noConformesCargando,
  errorNoConformes,
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
  periodoInicio,
  onPeriodoInicio,
}: {
  navigate: (s: Screen) => void;
  ventas: Venta[];
  ventasCargando: boolean;
  ventasError: string | null;
  puedeVerVentas: boolean;
  ordenesCompraCargando: boolean;
  errorOrdenesCompra: string | null;
  comprasCargando: boolean;
  errorCompras: string | null;
  noConformesCargando: boolean;
  errorNoConformes: string | null;
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
  /** Periodo del INICIO del empleado (Diario por defecto). Vive en App para
      conservarse al cambiar de rol con el selector del encabezado. */
  periodoInicio: Periodo;
  onPeriodoInicio: (p: Periodo) => void;
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

  // En celular las etiquetas de fecha del eje X no caben en horizontal:
  // se giran (solo presentación; en escritorio el objeto es null y no cambia nada).
  const esMovil = useIsMobile();
  const ejeXMovil = esMovil
    ? { angle: -45, textAnchor: "end" as const, height: 56 }
    : null;

  // ── Filtro global de los indicadores: Diario · Semanal · Mensual ──
  const [periodo, setPeriodo] = useState<Periodo>("semana");

  // "Clientes activos" del Inicio del empleado sale del API (GET /clientes), no
  // del estado local (que arranca vacío y por eso mostraba 0). Solo se consulta
  // si el rol activo tiene el MISMO permiso que exige la tarjeta
  // (Ventas::Clientes → Ver): un rol sin ese permiso nunca pide la lista.
  const puedeConsultarClientes = accesos[KEY("Ventas", "Clientes")]?.includes("Ver") ?? false;
  const [clientesActivos, setClientesActivos] = useState<number | null>(null);
  useEffect(() => {
    if (!puedeConsultarClientes) {
      setClientesActivos(null);
      return;
    }
    let cancelado = false;
    void listarClientes()
      .then((filas) => {
        if (cancelado) return;
        // Mismo criterio que Gestión de Clientes: activo = ficha activa y
        // cuenta activa (cliente_estado y usuario_estado).
        setClientesActivos(filas.filter((c) => c.cliente_estado && c.usuario_estado).length);
      })
      .catch(() => {
        // Sin permiso efectivo o sin conexión: la tarjeta no se muestra en vez
        // de enseñar un 0 engañoso.
        if (!cancelado) setClientesActivos(null);
      });
    return () => {
      cancelado = true;
    };
  }, [puedeConsultarClientes]);

  /**
   * Regla única de ingresos: SOLO las ventas Completado suman dinero y
   * conteo. La misma función se usa en las tarjetas Y en todas las gráficas
   * de ventas para que los números nunca se contradigan. Las ventas que
   * todavía no se entregan (Por verificar, En espera, Por entregar), las
   * anuladas, las devoluciones y los rechazos no cuentan; las devoluciones
   * se siguen contando aparte.
   */
  const esVentaIngresante = (v: Venta) => v.estado === "Completado";
  const fechaIngreso = (v: Venta) => v.fechaCompletado ?? v.fecha;

  const mesActual = hoyISO().slice(0, 7);
  const enPeriodoGrafica = (fecha: string, p: Periodo, mes: string) =>
    p === "mes"
      ? esFechaISO(fecha) && fecha.slice(0, 7) === mes
      : enPeriodo(fecha, p);

  const ventasCompletadas = ventas.filter(esVentaIngresante);
  const ventasConDetalle = ventasCompletadas.filter((v) => (v.detalle?.length ?? 0) > 0);
  const ordenesNoAnuladas = ordenes.filter(
    (o) => o.estado !== "Anulado" && esFechaISO(o.fecha),
  );
  const gestionesNoAnuladas = gestiones.filter(
    (g) => g.estado !== "Anulado" && esFechaISO(g.fechaFactura),
  );

  const mesesVentas = mesesDesdeFechas(ventasCompletadas.map(fechaIngreso), mesActual);
  const mesesClientes = mesesVentas;
  const mesesProductos = mesesDesdeFechas(ventasConDetalle.map(fechaIngreso), mesActual);
  const mesesOrdenesCompras = mesesDesdeFechas(
    [
      ...ordenesNoAnuladas.map((o) => o.fecha),
      ...gestionesNoAnuladas.map((g) => g.fechaFactura),
    ],
    mesActual,
  );
  const mesesProveedores = mesesDesdeFechas(
    gestionesNoAnuladas.map((g) => g.fechaFactura),
    mesActual,
  );
  const mesesNoConformes = mesesDesdeFechas(
    noConformidades.map((n) => n.fechaRegistro),
    mesActual,
  );

  /** Ventas que suman dentro de un periodo dado (filtro de cada gráfica). */
  const ventasEn = (p: Periodo, mes: string) =>
    ventasCompletadas.filter((v) => enPeriodoGrafica(fechaIngreso(v), p, mes));
  const estadoCargaVentas: "cargando" | "error" | "permiso" | null =
    !puedeVerVentas ? "permiso" : ventasCargando ? "cargando" : ventasError ? "error" : null;

  // ── Filtro propio de cada gráfica (todas arrancan en Semanal) ──
  const [fVentas, setFVentas] = useState<Periodo>("semana");
  const [fClientes, setFClientes] = useState<Periodo>("semana");
  const [fProductos, setFProductos] = useState<Periodo>("semana");
  const [fOC, setFOC] = useState<Periodo>("semana");
  const [fProv, setFProv] = useState<Periodo>("semana");
  const [fNC, setFNC] = useState<Periodo>("semana");
  const [mesVentas, setMesVentas] = useState(mesActual);
  const [mesClientes, setMesClientes] = useState(mesActual);
  const [mesProductos, setMesProductos] = useState(mesActual);
  const [mesOC, setMesOC] = useState(mesActual);
  const [mesProv, setMesProv] = useState(mesActual);
  const [mesNC, setMesNC] = useState(mesActual);

  const estadoCargaOrdenesCompras =
    ordenesCompraCargando || comprasCargando
      ? "cargando"
      : errorOrdenesCompra || errorCompras
        ? "error"
        : null;
  const errorCargaOrdenesCompras = errorOrdenesCompra ?? errorCompras;
  const estadoCargaCompras =
    comprasCargando ? "cargando" : errorCompras ? "error" : null;
  const estadoCargaNoConformes =
    noConformesCargando ? "cargando" : errorNoConformes ? "error" : null;

  // Filtro global → tarjetas de indicadores.
  const ingresantesGlobal = ventasCompletadas.filter((v) => enPeriodo(fechaIngreso(v), periodo));

  const ingresosPeriodo = ingresantesGlobal.reduce((s, v) => s + v.total, 0);

  // Devoluciones registradas en el periodo (fila en tb_devolucion), contadas
  // por la FECHA DE LA DEVOLUCIÓN (tb_devolucion.fecha) y no por la de la
  // venta; si esa fecha no viene, se cae a la de la venta. Mismo enPeriodo que
  // las tarjetas de Ingresos y Ventas.
  const devolucionesPeriodo = ventas.filter(
    (v) => v.idDevolucion != null && enPeriodo(v.devolucionFecha ?? v.fecha, periodo),
  );

  // Productos no conformes (API) registrados en el periodo, por fecha_registro
  // (ya es fecha de Bogotá) con el mismo enPeriodo que el resto.
  const noConformesPeriodo = noConformidades.filter((n) => enPeriodo(n.fechaRegistro, periodo));

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
      value: estadoCargaVentas ? "—" : fmt(ingresosPeriodo),
      Icon: DollarSign,
      bg: "bg-emerald-50",
      ic: "text-emerald-600",
      screen: "ventas-pedidos",
    },
    {
      label: "Ventas",
      value: estadoCargaVentas ? "—" : String(ingresantesGlobal.length),
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
      value: estadoCargaVentas ? "—" : String(devolucionesPeriodo.length),
      Icon: RotateCcw,
      bg: "bg-orange-50",
      ic: "text-orange-600",
      screen: "devoluciones",
    },
    {
      // Registros de productos no conformes del periodo (sin `sub`: muestra
      // la etiqueta del periodo, igual que Devoluciones).
      label: "Productos no conformes",
      value: String(noConformesPeriodo.length),
      Icon: AlertTriangle,
      bg: "bg-red-50",
      ic: "text-red-600",
      screen: "perecederos",
    },
  ];

  // ── 1. Top 10 clientes: pedidos vs valor (unión de ambos top 10) ──
  const clientesAgg = Object.values(
    ventasEn(fClientes, mesClientes).reduce<Record<string, { nombre: string; pedidos: number; total: number }>>(
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
    ventasEn(fProductos, mesProductos)
      .flatMap((v) => v.detalle ?? [])
      .reduce<Record<string, { nombre: string; unidades: number; porciones: number }>>((acc, det) => {
        const actual = acc[det.nombre] ?? { nombre: det.nombre, unidades: 0, porciones: 0 };
        if (det.tamaño === "Mediana" || det.tamaño === "Grande") {
          actual.porciones += det.cantidad;
        } else {
          actual.unidades += det.cantidad;
        }
        acc[det.nombre] = actual;
        return acc;
      }, {}),
  )
    .sort((a, b) => b.unidades + b.porciones - a.unidades - a.porciones)
    .slice(0, 10);

  // ── Órdenes y compras por gráfica (sin anuladas) ──
  const ordenesEn = (p: Periodo, mes: string) =>
    ordenesNoAnuladas.filter((o) => enPeriodoGrafica(o.fecha, p, mes));
  const gestionesEn = (p: Periodo, mes: string) =>
    gestionesNoAnuladas.filter((g) => enPeriodoGrafica(g.fechaFactura, p, mes));

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
  // El eje diario incluye el horario habitual y cualquier cierre fuera de él.
  // "semana" por día (Lun–Dom) y "mes" por Semana 1–5. ──
  interface PuntoVenta {
    etiqueta: string;
    // null = todavía no llega ese día/hora: se dibuja vacío (no como $0).
    ingresos: number | null;
    unidades: number | null;
    porciones: number | null;
  }
  const hoyIso = hoyISO();
  const horaActual = hoyBogota().getHours();
  /** Grupo del eje X (día o semana del mes) que aún no ha llegado. */
  const grupoFuturo = (p: Periodo, mes: string, clave: string) =>
    p === "semana"
      ? clave > hoyIso
      : p === "mes"
        ? mes === mesActual && Number(clave) > semanaDelMes(hoyIso)
        : false;
  const vaciarSiFuturo = (futuro: boolean, punto: { etiqueta: string; ingresos: number; unidades: number; porciones: number }): PuntoVenta =>
    futuro ? { etiqueta: punto.etiqueta, ingresos: null, unidades: null, porciones: null } : punto;
  const cantidadesVenta = (venta: Venta) => {
    if (!venta.detalle?.length) return { unidades: venta.cantidad || 0, porciones: 0 };
    return venta.detalle.reduce(
      (total, detalle) => {
        if (detalle.tamaño === "Mediana" || detalle.tamaño === "Grande") {
          total.porciones += detalle.cantidad;
        } else {
          total.unidades += detalle.cantidad;
        }
        return total;
      },
      { unidades: 0, porciones: 0 },
    );
  };
  const ventasGrafica = ventasEn(fVentas, mesVentas);
  const dataVentasGrafica: PuntoVenta[] =
    fVentas === "dia"
      ? (() => {
          const horaIngreso = (v: Venta) => Math.floor(minutosHora(v.horaCompletado ?? horaVenta(v)) / 60);
          const horas = [...new Set([...HORAS_HOY, ...ventasGrafica.map(horaIngreso)])].sort((a, b) => a - b);
          return horas.map((h) => {
            const fila = ventasGrafica.filter((v) => horaIngreso(v) === h);
            return vaciarSiFuturo(h > horaActual, {
              etiqueta: h < 0 ? "Sin hora" : formatearHora(`${h}:00`, { sinMinutos: true }),
              ingresos: fila.reduce((s, v) => s + v.total, 0),
              unidades: fila.reduce((s, v) => s + cantidadesVenta(v).unidades, 0),
              porciones: fila.reduce((s, v) => s + cantidadesVenta(v).porciones, 0),
            });
          });
        })()
      : gruposEje(fVentas).map((g) => {
          const fila = ventasGrafica.filter((v) => g.extraer(fechaIngreso(v)) === g.clave);
          return vaciarSiFuturo(grupoFuturo(fVentas, mesVentas, g.clave), {
            etiqueta: g.etiqueta,
            ingresos: fila.reduce((s, v) => s + v.total, 0),
            unidades: fila.reduce((s, v) => s + cantidadesVenta(v).unidades, 0),
            porciones: fila.reduce((s, v) => s + cantidadesVenta(v).porciones, 0),
          });
        });

  // ── 4. Órdenes de compra vs compras (eje X según el filtro de la gráfica) ──
  const ordenesGrafica = ordenesEn(fOC, mesOC);
  const gestionesGrafica = gestionesEn(fOC, mesOC);
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
  const gestionesProv = gestionesEn(fProv, mesProv);
  const proveedoresPorTotal = [...gestionesProv.reduce<Map<string, number>>((acc, g) => {
    const p = (g.proveedor ?? "").trim() || "Sin proveedor";
    acc.set(p, (acc.get(p) ?? 0) + g.valorTotal);
    return acc;
  }, new Map())].sort((a, b) => b[1] - a[1]);
  const TOP_PROVEEDORES = 8;
  const proveedoresTop = new Set(proveedoresPorTotal.slice(0, TOP_PROVEEDORES).map(([p]) => p));
  const PALETA = [C_ROJO, C_AZUL, C_VERDE, "#F59E0B", "#6a1b9a", "#00838f", "#e65100", "#37474f", "#ad1457"];
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

  // ── 6. Productos no conformes: registros por tipo, eje X del filtro ──
  // Se cuentan registros (no cantidades: mezclan und, kg, g…).
  const TIPOS_NC = ["Producto", "Producto insumo", "Venta"] as const;
  const COLOR_TIPO_NC: Record<(typeof TIPOS_NC)[number], string> = {
    Producto: C_ROJO,
    "Producto insumo": "#F59E0B",
    Venta: C_AZUL,
  };
  const noConformesGrafica = noConformidades.filter(
    (n) => esFechaISO(n.fechaRegistro) && enPeriodoGrafica(n.fechaRegistro, fNC, mesNC),
  );
  const dataNoConformes = gruposEje(fNC).map((g) => {
    const fila: Record<string, string | number> = { etiqueta: g.etiqueta };
    TIPOS_NC.forEach((t) => {
      fila[t] = noConformesGrafica.filter((n) => n.tipo === t && g.extraer(n.fechaRegistro) === g.clave).length;
    });
    return fila;
  });

  const vacio = (valores: Array<number | null>) => valores.every((v) => !v);
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
    const ventasHoy = ventasCompletadas.filter((v) => fechaIngreso(v) === hoy);
    const devoluciones = ventas.filter((v) => v.devolucionTipo !== undefined);
    const ordenesEnCurso = ordenesProduccion.filter(
      (o) => o.estadoOrden === "pendiente" || o.estadoOrden === "en-proceso",
    );
    const insumosBajo = insumos.filter((i) => i.stockActual < i.stockMinimo);

    // ── Tarjetas por MÓDULO + filtro Diario · Semanal · Mensual ────────────
    // Una tarjeta por cada módulo con permiso "Ver" del rol activo, con sus
    // mini cifras. Lo que tiene fecha se filtra con el MISMO `enPeriodo` del
    // Dashboard (referencia `hoyBogota()`: corte en hora de Colombia) y lo que
    // es un estado o un stock queda sin filtro. REGLA: el empleado NO ve
    // dinero (ingresos ni totales en pesos), solo cantidades.
    const ventasPeriodo = ventas.filter((v) => enPeriodo(v.fecha, periodoInicio));
    const opsPeriodo = ordenesProduccion.filter((o) => enPeriodo(o.fechaSolicitada, periodoInicio));
    const comprasPeriodo = gestiones.filter(
      (g) => g.estado !== "Anulado" && esFechaISO(g.fechaFactura) && enPeriodo(g.fechaFactura, periodoInicio),
    );
    // Devoluciones registradas en el periodo: MISMO criterio que la tarjeta
    // "Devoluciones" del Dashboard del admin — cuenta las ventas con idDevolucion
    // por la FECHA DE LA DEVOLUCIÓN (devolucionFecha; si no viene, la de la
    // venta), con el mismo `enPeriodo`.
    const devolucionesPeriodoEmp = ventas.filter(
      (v) => v.idDevolucion != null && enPeriodo(v.devolucionFecha ?? v.fecha, periodoInicio),
    );
    // Productos no conformes registrados en el periodo del Inicio (por
    // fecha_registro, mismo enPeriodo).
    const noConformesPeriodoEmp = noConformidades.filter((n) => enPeriodo(n.fechaRegistro, periodoInicio));
    // ── Tarjetas del inicio: UNA cifra por tarjeta, IGUAL que "Indicadores
    // comerciales" del admin (mismo componente `TarjetaIndicador`). Máximo 3
    // en una fila, en orden de prioridad y según el permiso "Ver" del rol
    // activo. Lo que tiene fecha se filtra con el MISMO `enPeriodo` del
    // Dashboard (referencia `hoyBogota()`: corte en hora de Colombia) y lo que
    // es un estado o un stock no depende del periodo. REGLA: el empleado NO ve
    // dinero (ingresos ni totales en pesos), solo cantidades.
    const etiqueta = etiquetaPeriodo(periodoInicio);
    type TarjetaEmp = { label: string; value: string; sub: string; Icon: typeof Package; bg: string; ic: string; screen: Screen };
    const tarjetasEmp: TarjetaEmp[] = [
      ver("Ventas", "Ventas") && {
        label: "Pedidos recibidos", value: String(ventasPeriodo.filter((v) => v.estado !== "Anulado").length),
        sub: etiqueta, Icon: ShoppingBag, bg: "bg-blue-50", ic: "text-blue-600", screen: "ventas-pedidos" as Screen,
      },
      ver("Ventas", "Ventas") && {
        label: "Por verificar", value: String(ventasPeriodo.filter((v) => v.estado === "Por verificar").length),
        sub: etiqueta, Icon: ClipboardList, bg: "bg-amber-50", ic: "text-amber-600", screen: "ventas-pedidos" as Screen,
      },
      ver("Ventas", "Devoluciones") && {
        label: "Devoluciones", value: String(devolucionesPeriodoEmp.length),
        sub: etiqueta, Icon: RefreshCw, bg: "bg-orange-50", ic: "text-orange-600", screen: "devoluciones" as Screen,
      },
      ver("Producción", "Orden de Producción") && {
        label: "Órdenes de producción pendientes",
        value: String(opsPeriodo.filter((o) => o.estadoOrden === "pendiente").length),
        sub: etiqueta, Icon: Layers, bg: "bg-sky-50", ic: "text-sky-600", screen: "production-orders" as Screen,
      },
      ver("Producción", "Producto No Conforme") && {
        label: "No conformes pendientes",
        value: String(noConformesPeriodoEmp.filter((n) => n.estado === "Pendiente").length),
        sub: etiqueta, Icon: AlertTriangle, bg: "bg-red-50", ic: "text-red-600", screen: "perecederos" as Screen,
      },
      ver("Compras", "Compra") && {
        label: "Compras registradas", value: String(comprasPeriodo.length),
        sub: etiqueta, Icon: FileText, bg: "bg-teal-50", ic: "text-teal-600", screen: "gestion-compra" as Screen,
      },
      ver("Compras", "Insumos") && {
        label: "Insumos bajo mínimo", value: String(insumosBajo.length),
        sub: "Stock por debajo del mínimo", Icon: Package, bg: "bg-emerald-50", ic: "text-emerald-600", screen: "supplies" as Screen,
      },
      clientesActivos !== null && ver("Ventas", "Clientes") && {
        label: "Clientes activos", value: String(clientesActivos),
        sub: "Registrados en el sistema", Icon: Users, bg: "bg-violet-50", ic: "text-violet-600", screen: "clientes" as Screen,
      },
    ].filter(Boolean).slice(0, 3) as TarjetaEmp[];
    // Columnas de la fila de tarjetas según cuántas haya (máx. 3): la fila se
    // ajusta al ancho completo sin dejar huecos a la derecha. En celular van
    // siempre una por fila.
    const colsTarjetas =
      tarjetasEmp.length >= 3 ? "lg:grid-cols-3" : tarjetasEmp.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-1";

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

    const ESTADO_VENTA = ESTADO_VENTA_TXT;
    const ESTADO_OP: Record<string, string> = {
      pendiente: "Pendiente",
      "en-proceso": "En proceso",
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
          <h2 className="pn-h2">{titulo}</h2>
          <BotonAccion variante="normal" onClick={() => navigate(destino)}>
            Ver todos ›
          </BotonAccion>
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
      <div className="pn-contenido max-w-6xl mx-auto">
        {/* Header: saludo dinámico + fecha + chip del rol activo */}
        <EncabezadoPagina
          titulo={`¡${greeting}, ${firstName}!`}
          descripcion={
            <>
              {dateStr}
              <span className="ml-3 align-middle"><EstadoPill tono="rojo">{tieneRolActivo ? loggedInRoleName : "sin rol"}</EstadoPill></span>
            </>
          }
        />

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
            {/* Tarjetas por MÓDULO (una por cada módulo con permiso "Ver") con
                sus mini cifras, y el filtro Diario · Semanal · Mensual arriba a
                la derecha (mismo componente que el Dashboard del admin). */}
            {tarjetasEmp.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <h2 className="pn-h2">Resumen de tus módulos</h2>
                  <FiltroPeriodo
                    value={periodoInicio}
                    onChange={onPeriodoInicio}
                    ariaLabel="Filtro de las tarjetas del inicio"
                  />
                </div>
                <div className={`pn-kpis ${colsTarjetas}`}>
                  {tarjetasEmp.map(({ label, value, sub, Icon, screen }) => (
                    <TarjetaIndicador
                      key={label}
                      label={label}
                      value={value}
                      sub={sub}
                      Icon={Icon}
                      enlace={ENLACE_POR_PANTALLA[screen]}
                      onClick={() => navigate(screen)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Accesos rápidos (solo módulos con permiso Crear) */}
            {accesosRapidos.length > 0 && (
              <div className="mb-8">
                <h2 className="pn-h2 mb-3">Accesos rápidos</h2>
                <div className="pn-accesos">
                  {accesosRapidos.map(({ label, Icon, screen }) => (
                    <BotonAccion key={label} icono={Icon} className="pn-boton--grande" onClick={() => navigate(screen)}>
                      {label}
                    </BotonAccion>
                  ))}
                </div>
              </div>
            )}

            {/* Tabla 1: Ventas de hoy (el empleado NO ve dinero: se muestra la
                cantidad de productos en lugar del monto) */}
            {ver("Ventas", "Ventas") && (
              <TablaInicio
                titulo="Ventas de hoy"
                destino="ventas-pedidos"
                cols={["Cliente", "Productos", "Hora", "Estado"]}
                vacio="Aún no hay ventas hoy"
                filas={ventasHoyTabla.length === 0 ? null : ventasHoyTabla.map((venta) => (
                  <tr key={venta.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-foreground">{venta.usuario?.trim() || "Venta general"}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>{venta.cantidad}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{formatearHora(horaVenta(venta))}</td>
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
                cols={["Cliente", "Productos", "Fecha"]}
                vacio="No hay devoluciones registradas"
                filas={devolucionesTabla.length === 0 ? null : devolucionesTabla.map((venta) => (
                  <tr key={venta.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-foreground">{venta.usuario?.trim() || "Venta general"}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>{venta.cantidad}</td>
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
    <div className="pn-contenido">
      {/* Header */}
      <EncabezadoPagina titulo={`¡${greeting}, ${firstName}!`} descripcion={dateStr} />

      {/* Tarjetas (exactamente 4) + filtro global */}
      <div className="mb-7">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h2 className="pn-h2">Cómo va el negocio</h2>
            <FiltroPeriodo
              value={periodo}
              onChange={setPeriodo}
              ariaLabel="Filtro de los indicadores"
            />
          </div>
          {estadoCargaVentas && (
            <div className="mb-4">
              <EstadoVentas estado={estadoCargaVentas} error={ventasError} />
            </div>
          )}
          <div className="pn-kpis">
            {tarjetas.map(({ label, value, sub, Icon, screen }) => (
              <TarjetaIndicador
                key={label}
                label={label}
                value={value}
                sub={sub ?? etiquetaPeriodoTxt}
                Icon={Icon}
                enlace={ENLACE_POR_PANTALLA[screen]}
                alerta={label === "Productos no conformes" && noConformesPeriodo.length > 0}
                onClick={() => navigate(screen)}
              />
            ))}
          </div>
        </div>

      {/* 6 gráficas con datos reales — permiso Dashboard. Cada una lleva su
          propio filtro Diario/Semanal/Mensual. */}
      <div className="mb-8">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h2 className="pn-h2">
              Estadísticas
            </h2>
            <p className="text-base text-muted-foreground">
              Cada gráfica tiene sus propios botones de periodo
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1. Ventas del periodo: barras (unidades) + línea (ingresos) */}
            <ChartCard
              titulo="Ventas del periodo"
              etiqueta="Lo que se vendió: cantidades en barras y el dinero que entró en la línea verde"
              periodo={fVentas}
              onPeriodo={setFVentas}
              controlAdicional={
                <SelectorMes periodo={fVentas} mes={mesVentas} meses={mesesVentas} onChange={setMesVentas} />
              }
            >
              {estadoCargaVentas ? (
                <EstadoVentas estado={estadoCargaVentas} error={ventasError} />
              ) : vacio(dataVentasGrafica.flatMap((d) => [d.ingresos, d.unidades, d.porciones])) ? (
                <SinDatos texto={`Todavía no hay ventas ${cuando(fVentas)}`} />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={dataVentasGrafica} margin={{ left: -8, right: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 14 }} interval={0} {...ejeXMovil} />
                    <YAxis yAxisId="und" allowDecimals={false} tick={{ fontSize: 14 }} />
                    <YAxis
                      yAxisId="cop"
                      orientation="right"
                      tick={{ fontSize: 14 }}
                      tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                    />
                    <Tooltip
                      content={<GrafTooltip formatear={(serie, v) => serie === "ingresos" ? cop(v) : serie === "porciones" ? `${v} ${v === 1 ? "porción" : "porciones"}` : und(v)} />}
                    />
                    <Legend wrapperStyle={{ fontSize: 16 }} />
                    <Bar yAxisId="und" dataKey="unidades" name="Unidades" fill={C_ROJO} radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="und" dataKey="porciones" name="Porciones" fill={C_AZUL} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="cop" dataKey="ingresos" name="Ingresos" stroke={C_VERDE} strokeWidth={3} dot={{ r: 4 }} connectNulls={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              <div className="flex justify-end mt-3">
                <BotonAccion onClick={() => navigate("sales-chart")}>Ver el detalle por semana ›</BotonAccion>
              </div>
            </ChartCard>

            {/* 2. Top 10 clientes: pedidos vs valor */}
            <ChartCard
              titulo="Top 10 clientes"
              etiqueta="Quiénes más compran y quiénes más dinero han gastado"
              periodo={fClientes}
              onPeriodo={setFClientes}
              controlAdicional={
                <SelectorMes
                  periodo={fClientes}
                  mes={mesClientes}
                  meses={mesesClientes}
                  onChange={setMesClientes}
                />
              }
            >
              {estadoCargaVentas ? (
                <EstadoVentas estado={estadoCargaVentas} error={ventasError} />
              ) : dataClientes.length === 0 ? (
                <SinDatos texto={`Todavía no hay compras de clientes ${cuando(fClientes)}`} />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={dataClientes} margin={{ left: -8, right: 4, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="nombre" tick={{ fontSize: 14 }} interval={0} angle={-35} textAnchor="end" height={100} />
                    <YAxis yAxisId="pedidos" allowDecimals={false} tick={{ fontSize: 14 }} />
                    <YAxis yAxisId="valor" orientation="right" tick={{ fontSize: 14 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                    <Tooltip content={<GrafTooltip formatear={(serie, v) => (serie === "total" ? cop(v) : `${v} ${v === 1 ? "pedido" : "pedidos"}`)} />} />
                    <Legend wrapperStyle={{ fontSize: 16 }} />
                    <Bar yAxisId="pedidos" dataKey="pedidos" name="Pedidos" fill={C_ROJO} radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="valor" dataKey="total" name="Valor comprado" fill={C_AZUL} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* 3. Top 10 productos más vendidos */}
            <ChartCard
              titulo="Top 10 productos más vendidos"
              etiqueta="Lo que más se vende: pizzas por porciones y lo demás por unidades"
              periodo={fProductos}
              onPeriodo={setFProductos}
              controlAdicional={
                <SelectorMes
                  periodo={fProductos}
                  mes={mesProductos}
                  meses={mesesProductos}
                  onChange={setMesProductos}
                />
              }
            >
              {estadoCargaVentas ? (
                <EstadoVentas estado={estadoCargaVentas} error={ventasError} />
              ) : dataProductos.length === 0 ? (
                <SinDatos texto={`Todavía no se ha vendido ningún producto ${cuando(fProductos)}`} />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={dataProductos} layout="vertical" margin={{ left: 8, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 14 }} />
                    <YAxis type="category" dataKey="nombre" width={150} tick={{ fontSize: 14 }} />
                    <Tooltip content={<GrafTooltip formatear={(serie, v) => serie === "porciones" ? `${v} ${v === 1 ? "porción" : "porciones"}` : und(v)} />} />
                    <Legend wrapperStyle={{ fontSize: 16 }} />
                    <Bar dataKey="unidades" name="Unidades" fill={C_AZUL} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="porciones" name="Porciones" fill={C_ROJO} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* 4. Órdenes de compra vs compras (eje X según su filtro) */}
            <ChartCard
              titulo="Órdenes de compra vs compras"
              etiqueta="Lo que se pidió a los proveedores y lo que realmente se compró, en pesos"
              periodo={fOC}
              onPeriodo={setFOC}
              controlAdicional={
                <SelectorMes periodo={fOC} mes={mesOC} meses={mesesOrdenesCompras} onChange={setMesOC} />
              }
            >
              {estadoCargaOrdenesCompras ? (
                <EstadoVentas
                  estado={estadoCargaOrdenesCompras}
                  error={errorCargaOrdenesCompras}
                  textoCargando="Cargando órdenes y compras…"
                  textoError="No fue posible cargar órdenes de compra y compras."
                />
              ) : vacio(dataOCvsCompras.flatMap((d) => [d.ordenes, d.compras])) ? (
                <SinDatos texto={`Todavía no hay compras ni órdenes ${cuando(fOC)}`} />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={dataOCvsCompras} margin={{ left: -4, right: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 14 }} interval={0} height={48} {...ejeXMovil} />
                    <YAxis tick={{ fontSize: 14 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                    <Tooltip content={<GrafTooltip formatear={(_, v) => cop(v)} />} />
                    <Legend wrapperStyle={{ fontSize: 16 }} />
                    <Bar dataKey="ordenes" name="Órdenes de compra" fill={C_AZUL} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="compras" name="Compras (facturas)" fill={C_ROJO} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* 5. Compras por proveedor: eje X del filtro, serie = proveedor */}
            <ChartCard
              titulo="Compras por proveedor"
              etiqueta="A qué proveedores se les compra más, en pesos"
              periodo={fProv}
              onPeriodo={setFProv}
              controlAdicional={
                <SelectorMes periodo={fProv} mes={mesProv} meses={mesesProveedores} onChange={setMesProv} />
              }
            >
              {estadoCargaCompras ? (
                <EstadoVentas
                  estado={estadoCargaCompras}
                  error={errorCompras}
                  textoCargando="Cargando compras…"
                  textoError="No fue posible cargar las compras."
                />
              ) : !hayComprasProveedores ? (
                <SinDatos texto={`Todavía no hay compras a proveedores ${cuando(fProv)}`} />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={dataProveedores} margin={{ left: -4, right: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 14 }} interval={0} height={48} {...ejeXMovil} />
                    <YAxis tick={{ fontSize: 14 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                    <Tooltip content={<GrafTooltip formatear={(_, v) => cop(v)} />} />
                    <Legend wrapperStyle={{ fontSize: 16 }} />
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

            {/* 6. Productos no conformes: registros por tipo (eje X según su filtro) */}
            <ChartCard
              titulo="Productos no conformes"
              etiqueta="Cuántos productos salieron mal, según el tipo"
              periodo={fNC}
              onPeriodo={setFNC}
              controlAdicional={
                <SelectorMes periodo={fNC} mes={mesNC} meses={mesesNoConformes} onChange={setMesNC} />
              }
            >
              {estadoCargaNoConformes ? (
                <EstadoVentas
                  estado={estadoCargaNoConformes}
                  error={errorNoConformes}
                  textoCargando="Cargando productos no conformes…"
                  textoError="No fue posible cargar los productos no conformes."
                />
              ) : noConformesGrafica.length === 0 ? (
                <SinDatos texto={`No hay productos no conformes ${cuando(fNC)}`} />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={dataNoConformes} margin={{ left: -4, right: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 14 }} interval={0} height={48} {...ejeXMovil} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 14 }} />
                    <Tooltip content={<GrafTooltip formatear={(_, v) => `${v} ${v === 1 ? "registro" : "registros"}`} />} />
                    <Legend wrapperStyle={{ fontSize: 16 }} />
                    {TIPOS_NC.map((t, i) => (
                      <Bar
                        key={t}
                        dataKey={t}
                        name={t}
                        stackId="nc"
                        fill={COLOR_TIPO_NC[t]}
                        radius={i === TIPOS_NC.length - 1 ? [4, 4, 0, 0] : undefined}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>

      {/* Quick actions */}
      {quickActions.length > 0 && (
        <div className="mb-8">
          <h2 className="pn-h2 mb-3">Accesos rápidos</h2>
          <div className="pn-accesos">
            {quickActions.map(({ label, Icon, screen }) => (
              <BotonAccion key={label} icono={Icon} className="pn-boton--grande" onClick={() => navigate(screen)}>
                {label}
              </BotonAccion>
            ))}
          </div>
        </div>
      )}

      {/* Últimas ventas */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 className="pn-h2">Últimas ventas</h2>
          <BotonAccion onClick={() => navigate("ventas-pedidos")}>Ver todas las ventas ›</BotonAccion>
        </div>
        {estadoCargaVentas ? (
          <EstadoVentas estado={estadoCargaVentas} error={ventasError} />
        ) : ventasRecientes.length === 0 ? (
          <VacioEstado icono={ShoppingBag} titulo="Todavía no hay ventas registradas">
            Cuando se registre la primera venta, aparecerá aquí.
          </VacioEstado>
        ) : (
          <div className="pn-lista">
            {ventasRecientes.map((venta) => (
              <TarjetaFila
                key={venta.id}
                nombre={venta.usuario?.trim() || "Venta general"}
                datos={[
                  { etiqueta: "Monto", valor: fmt(venta.total) },
                  { etiqueta: "Hora", valor: formatearHora(horaVenta(venta)) },
                ]}
                estado={
                  <EstadoPill tono={ESTADO_VENTA_TONO[venta.estado] ?? "gris"}>
                    {ESTADO_VENTA_TXT[venta.estado] ?? venta.estado}
                  </EstadoPill>
                }
              />
            ))}
          </div>
        )}
      </section>

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
