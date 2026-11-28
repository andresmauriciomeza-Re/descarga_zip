import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import type { Venta } from "@/features/sales/utils/sales";
import type { GestionCompra, OrdenCompra, OrdenItem } from "@/features/purchase-orders/utils/purchase-orders";
import {
  esFechaISO,
  hoyISO,
} from "@/shared/utils/dates";
import { WeekCard } from "@/features/dashboard/components/WeekCard";
import { VentasDetail } from "@/features/dashboard/components/SalesDetail";
import { ComprasDetail } from "@/features/dashboard/components/PurchasesDetail";
import { SERIF, type DayEntry, type WeekEntry } from "@/features/dashboard/utils/dashboard";
import { useIdioma } from "@/shared/i18n";

const DOW_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MON_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
// Solo etiquetas visibles: las fechas se calculan con números, no con estos nombres.
const DOW_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getDow(y: number, m: number, d: number) { return new Date(y, m - 1, d).getDay(); }
function futureDay(y: number, m: number, d: number, hoy: Date) {
  return new Date(y, m - 1, d) > hoy;
}
function todayDay(y: number, m: number, d: number, hoy: Date) {
  return y === hoy.getFullYear() && m === hoy.getMonth() + 1 && d === hoy.getDate();
}

function buildWeeks(
  year: number,
  month: number,
  porFecha: Map<string, { unidades: number; porciones: number; ingresos: number }>,
  hoy: Date,
  dias: string[],
  meses: string[],
  nombreSemana: (n: number) => string,
): WeekEntry[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const abbr = meses[month - 1].slice(0, 3).toLowerCase();
  const weeks: WeekEntry[] = [];

  for (let start = 1, idx = 0; start <= daysInMonth; start += 7, idx++) {
    const end = Math.min(start + 6, daysInMonth);
    const days: DayEntry[] = [];
    for (let d = start; d <= end; d++) {
      const dow = getDow(year, month, d);
      const future = futureDay(year, month, d, hoy);
      const today = todayDay(year, month, d, hoy);
      const dato = porFecha.get(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
      days.push({
        day: d,
        label: `${dias[dow]} ${d}`,
        unidades: future ? 0 : (dato?.unidades ?? 0),
        porciones: future ? 0 : (dato?.porciones ?? 0),
        revenue: future ? 0 : (dato?.ingresos ?? 0),
        isToday: today,
        isFuture: future,
      });
    }
    const ultimoDia = new Date(year, month - 1, end);
    const ultimoPasado = new Date(ultimoDia.getFullYear(), ultimoDia.getMonth(), ultimoDia.getDate())
      < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    weeks.push({
      idx,
      label: nombreSemana(idx + 1),
      range: `${start} – ${end} ${abbr}`,
      days,
      totalVentas: days.reduce((s, d) => s + d.unidades + d.porciones, 0),
      totalUnidades: days.reduce((s, d) => s + d.unidades, 0),
      totalPorciones: days.reduce((s, d) => s + d.porciones, 0),
      totalRevenue: days.reduce((s, d) => s + d.revenue, 0),
      terminada: ultimoPasado,
    });
  }
  return weeks;
}

// ── Main screen ───────────────────────────────────────────────────────
export function SalesChartScreen({
  ventas,
  gestiones,
  onBack,
}: {
  ventas: Venta[];
  gestiones: GestionCompra[];
  /** Órdenes de compra cableadas desde App.tsx (reservadas para el módulo). */
  ordenes?: OrdenCompra[];
  onBack: () => void;
}) {
  const { idioma, t, formatoMoneda } = useIdioma();
  // Moneda COP en el formato del idioma, sin decimales.
  const fmtCOP = (n: number) => formatoMoneda(Math.round(n));
  const nombresMes = idioma === "es" ? MON_ES : MON_EN;
  const [tab, setTab] = useState<"ventas" | "compras">("ventas");
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [detailMode, setDetailMode] = useState<"ventas" | "compras">("ventas");

  const hoy = new Date();
  const hoyStr = hoyISO();

  // Ventas completadas indexadas por la fecha del cierre.
  const porFecha = new Map<string, { unidades: number; porciones: number; ingresos: number }>();
  ventas.forEach((v) => {
    const fecha = v.fechaCompletado ?? v.fecha;
    if (v.estado !== "Completado" || !esFechaISO(fecha)) return;
    const dato = porFecha.get(fecha) ?? { unidades: 0, porciones: 0, ingresos: 0 };
    if (v.detalle?.length) {
      for (const detalle of v.detalle) {
        if (detalle.tamaño === "Mediana" || detalle.tamaño === "Grande") {
          dato.porciones += detalle.cantidad;
        } else {
          dato.unidades += detalle.cantidad;
        }
      }
    } else {
      dato.unidades += v.cantidad ?? 0;
    }
    dato.ingresos += v.total;
    porFecha.set(fecha, dato);
  });

  // Compras no anuladas indexadas por fecha de factura.
  const gestionesValidas = gestiones.filter((g) => g.estado !== "Anulado" && esFechaISO(g.fechaFactura));
  const comprasPorFecha = new Map<string, { total: number; items: OrdenItem[] }>();
  gestionesValidas.forEach((g) => {
    const dato = comprasPorFecha.get(g.fechaFactura) ?? { total: 0, items: [] };
    dato.total += g.valorTotal;
    dato.items.push(...(g.items ?? []));
    comprasPorFecha.set(g.fechaFactura, dato);
  });

  // ── Meses navegables REALES: del primer mes con datos al mes actual ──
  const fechasDatos = [
    ...porFecha.keys(),
    ...gestiones.map((g) => g.fechaFactura),
  ].filter(esFechaISO);
  const primeraFecha = fechasDatos.length
    ? fechasDatos.reduce((a, b) => (a < b ? a : b))
    : hoyStr;
  const claveMesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const clavePrimerMes = primeraFecha.slice(0, 7) < claveMesActual ? primeraFecha.slice(0, 7) : claveMesActual;

  const mesesDisponibles: { year: number; month: number; label: string }[] = [];
  {
    let y = Number(clavePrimerMes.slice(0, 4));
    let m = Number(clavePrimerMes.slice(5, 7));
    while (y < hoy.getFullYear() || (y === hoy.getFullYear() && m <= hoy.getMonth() + 1)) {
      mesesDisponibles.push({ year: y, month: m, label: `${nombresMes[m - 1]} ${y}` });
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
  }

  const [mesClave, setMesClave] = useState(claveMesActual);
  const idxMes = Math.max(
    0,
    mesesDisponibles.findIndex((m) => `${m.year}-${String(m.month).padStart(2, "0")}` === mesClave),
  );
  const { year, month, label } = mesesDisponibles[idxMes] ?? mesesDisponibles[mesesDisponibles.length - 1];
  const key = `${year}-${month}`;
  const weeks = buildWeeks(year, month, porFecha, hoy, idioma === "es" ? DOW_ES : DOW_EN, nombresMes, (n) => t("dashboard.semanaN", { n }));

  const comprasDeLaSemana = (week: WeekEntry) => {
    const desde = new Date(year, month - 1, week.days[0].day);
    const hasta = new Date(year, month - 1, week.days[week.days.length - 1].day);
    let total = 0;
    const items: OrdenItem[] = [];
    comprasPorFecha.forEach((dato, fecha) => {
      const d = new Date(`${fecha}T00:00:00`);
      if (d >= desde && d <= hasta) {
        total += dato.total;
        items.push(...dato.items);
      }
    });
    return { total, items };
  };
  const comprasSemana = weeks.map(comprasDeLaSemana);

  const monthTotalVentas = weeks.reduce((s, w) => s + w.totalVentas, 0);
  const monthTotalRevenue = weeks.reduce((s, w) => s + w.totalRevenue, 0);
  const monthTotalCompras = comprasSemana.reduce((s, c) => s + c.total, 0);

  const changeMonth = (dir: -1 | 1) => {
    const n = idxMes + dir;
    if (n < 0 || n >= mesesDisponibles.length) return;
    const m = mesesDisponibles[n];
    setMesClave(`${m.year}-${String(m.month).padStart(2, "0")}`);
    setSelectedWeek(null);
  };

  const openDetail = (wIdx: number, mode: "ventas" | "compras") => {
    setSelectedWeek(wIdx);
    setDetailMode(mode);
  };

  const TAB_CLS = (pestana: "ventas" | "compras") =>
    `px-5 py-2 max-md:min-h-11 rounded-xl text-sm font-semibold transition-all cursor-pointer ${tab === pestana ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted"}`;

  return (
    <div className="px-4 sm:px-6 py-6">
      <AnimatePresence mode="wait">
        {selectedWeek === null ? (
          <motion.div key={`month-${key}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {/* Back + title */}
            <div className="mb-6">
              <button onClick={onBack} className="flex items-center gap-1 max-md:min-h-11 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-2">
                <ChevronLeft className="w-3.5 h-3.5" /> Dashboard
              </button>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>{t("dashboard.estadisticas")}</h1>
                  <p className="text-sm text-muted-foreground mt-1">{t("dashboard.e.resumen")}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex gap-1 bg-muted rounded-xl p-1">
                    <button className={TAB_CLS("ventas")} onClick={() => setTab("ventas")}>{t("dashboard.d.ventas")}</button>
                    <button className={TAB_CLS("compras")} onClick={() => setTab("compras")}>{t("dashboard.d.compras")}</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Month navigation — wrap para no desbordar en móvil */}
            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button onClick={() => changeMonth(-1)} disabled={idxMes === 0} className="p-2 max-md:p-3 rounded-xl hover:bg-muted disabled:opacity-30 cursor-pointer transition-colors" aria-label={t("dashboard.e.mesAnterior")}>
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-foreground min-w-36 text-center">{label}</h2>
                <button onClick={() => changeMonth(1)} disabled={idxMes === mesesDisponibles.length - 1} className="p-2 max-md:p-3 rounded-xl hover:bg-muted disabled:opacity-30 cursor-pointer transition-colors" aria-label={t("dashboard.e.mesSiguiente")}>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              {/* Month totals */}
              <div className="flex gap-4">
                {tab === "ventas" ? (
                  <>
                    <div className="text-right">
                      <p className="text-xl font-bold text-foreground">{monthTotalVentas}</p>
                      <p className="text-xs text-muted-foreground">{t("dashboard.e.productos")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-emerald-600">{fmtCOP(monthTotalRevenue)}</p>
                      <p className="text-xs text-muted-foreground">{t("dashboard.e.ingresos")}</p>
                    </div>
                  </>
                ) : (
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-700">{fmtCOP(monthTotalCompras)}</p>
                    <p className="text-xs text-muted-foreground">{t("dashboard.e.enInsumos")}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Week cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {weeks.map((week, i) => (
                <WeekCard
                  key={week.idx}
                  week={week}
                  comprasTotal={comprasSemana[i]?.total ?? 0}
                  onVentas={() => openDetail(i, "ventas")}
                  onCompras={() => openDetail(i, "compras")}
                  prevWeek={i > 0 ? weeks[i - 1] : undefined}
                  isCompras={tab === "compras"}
                />
              ))}
            </div>
          </motion.div>
        ) : detailMode === "ventas" ? (
          <VentasDetail
            key={`ventas-${selectedWeek}`}
            week={weeks[selectedWeek]}
            onBack={() => setSelectedWeek(null)}
          />
        ) : (
          <ComprasDetail
            key={`compras-${selectedWeek}`}
            week={weeks[selectedWeek]}
            items={comprasSemana[selectedWeek]?.items ?? []}
            total={comprasSemana[selectedWeek]?.total ?? 0}
            onBack={() => setSelectedWeek(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
