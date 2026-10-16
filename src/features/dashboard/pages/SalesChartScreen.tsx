import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import type { Venta } from "@/features/ventas/pages/VentasScreen";
import type { GestionCompra, OrdenCompra, OrdenItem } from "@/features/orden-compra/pages/OrdenCompraScreen";
import {
  esFechaISO,
  hoyISO,
} from "@/shared/utils/fechas";

const SERIF = "var(--font-titulo)";
const DOW_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MON_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// ── helpers ──────────────────────────────────────────────────────────
function fmtCOP(n: number) { return "$" + Math.round(n).toLocaleString("es-CO"); }
function getDow(y: number, m: number, d: number) { return new Date(y, m - 1, d).getDay(); }
function futureDay(y: number, m: number, d: number, hoy: Date) {
  return new Date(y, m - 1, d) > hoy;
}
function todayDay(y: number, m: number, d: number, hoy: Date) {
  return y === hoy.getFullYear() && m === hoy.getMonth() + 1 && d === hoy.getDate();
}

// ── Build week structure dynamically (datos reales) ──────────────────
interface DayEntry {
  day: number;
  label: string;
  ventas: number;
  revenue: number;
  isToday: boolean;
  isFuture: boolean;
}
interface WeekEntry {
  idx: number;
  label: string;
  range: string;
  days: DayEntry[];
  totalVentas: number;
  totalRevenue: number;
  /** true = todos los días de la semana ya pasaron (solo entonces se muestra %). */
  terminada: boolean;
}

function buildWeeks(
  year: number,
  month: number,
  porFecha: Map<string, { unidades: number; ingresos: number }>,
  hoy: Date,
): WeekEntry[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const abbr = MON_ES[month - 1].slice(0, 3).toLowerCase();
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
        label: `${DOW_ES[dow]} ${d}`,
        ventas: future ? 0 : (dato?.unidades ?? 0),
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
      label: `Semana ${idx + 1}`,
      range: `${start} – ${end} ${abbr}`,
      days,
      totalVentas: days.reduce((s, d) => s + d.ventas, 0),
      totalRevenue: days.reduce((s, d) => s + d.revenue, 0),
      terminada: ultimoPasado,
    });
  }
  return weeks;
}

// ── Shared tooltip ───────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, isCOP }: { active?: boolean; payload?: { value: number }[]; label?: string; isCOP?: boolean }) {
  if (!active || !payload?.length || !payload[0].value) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-muted-foreground mb-0.5">{label}</p>
      <p className="font-bold text-foreground">{isCOP ? fmtCOP(payload[0].value) : `${payload[0].value} producto${payload[0].value === 1 ? "" : "s"}`}</p>
    </div>
  );
}

// ── Custom XAxis tick (hoy en rojo) ──────────────────────────────────
function WeekTick({ x, y, payload, days }: { x?: number; y?: number; payload?: { index: number; value: string }; days: DayEntry[] }) {
  if (x === undefined || y === undefined || !payload) return null;
  const entry = days[payload?.index ?? 0];
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill={entry?.isToday ? "#C62828" : "var(--foreground)"} fontSize={10} fontWeight={entry?.isToday ? "bold" : "normal"}>
        {payload.value}
      </text>
    </g>
  );
}

// ── Bar color helper ─────────────────────────────────────────────────
function barFill(d: DayEntry) {
  if (d.isFuture) return "var(--border)";
  if (d.isToday)  return "#ef5350";
  return "#C62828";
}

// ── Week card (shown in month grid) ─────────────────────────────────
function WeekCard({ week, comprasTotal, onVentas, onCompras, prevWeek, isCompras }: {
  week: WeekEntry; comprasTotal: number;
  onVentas: () => void; onCompras: () => void;
  prevWeek?: WeekEntry; isCompras: boolean;
}) {
  // Sin % si la semana no terminó o si no hay semana previa con ventas:
  // así nunca aparece un "-100%" de una semana a medio camino.
  const delta = prevWeek && prevWeek.totalVentas > 0 && week.terminada
    ? Math.round(((week.totalVentas - prevWeek.totalVentas) / prevWeek.totalVentas) * 100)
    : null;
  const noData = week.days.every(d => d.isFuture) && comprasTotal === 0;
  const hasCom = comprasTotal > 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 hover:shadow-md hover:border-primary/30 transition-all flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{week.label}</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">{week.range}</p>
        </div>
        <div className="text-right">
          {noData && !hasCom ? (
            <span className="text-xs text-muted-foreground font-medium">Pendiente</span>
          ) : (
            <>
              <p className="text-xl font-bold text-foreground">
                {isCompras ? fmtCOP(comprasTotal) : week.totalVentas}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isCompras ? "en insumos" : "productos"}
              </p>
              {!isCompras && week.totalRevenue > 0 && (
                <p className="text-[10px] text-emerald-600 font-semibold">{fmtCOP(week.totalRevenue)}</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mini chart */}
      <div className="h-12 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          {isCompras ? (
            <BarChart data={[{ v: comprasTotal }]} barSize={28} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
              <Bar key="bar" dataKey="v" radius={[3,3,0,0]} fill={hasCom ? "#1565c0" : "transparent"} isAnimationActive={false} />
            </BarChart>
          ) : (
            <BarChart data={week.days} barSize={9} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
              <Bar
                key="bar"
                dataKey="ventas"
                radius={[3,3,0,0]}
                isAnimationActive={false}
                shape={(props) => {
                  const { x, y, width, height, index } = props as { x?: number; y?: number; width?: number; height?: number; index?: number };
                  const fill = barFill(week.days[index ?? 0]);
                  return <rect x={x} y={y} width={width} height={height} fill={fill} rx={3} ry={3} />;
                }}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between">
        {!isCompras && delta !== null ? (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${delta > 0 ? "bg-emerald-100 text-emerald-700" : delta < 0 ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`}>
            {delta > 0 ? <TrendingUp className="w-3 h-3"/> : delta < 0 ? <TrendingDown className="w-3 h-3"/> : <Minus className="w-3 h-3"/>}
            {delta > 0 ? "+" : ""}{delta}%
          </span>
        ) : <span />}
        <div className="flex gap-3">
          {!noData && <button onClick={onVentas} className="text-xs font-semibold text-primary hover:underline cursor-pointer">Ver ventas →</button>}
          {hasCom && <button onClick={onCompras} className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">Ver compras →</button>}
        </div>
      </div>
    </div>
  );
}

// ── Week detail: Ventas ───────────────────────────────────────────────
function VentasDetail({ week, onBack }: { week: WeekEntry; onBack: () => void }) {
  const maxV = Math.max(...week.days.map(d => d.ventas), 1);
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ventas · {week.range}</p>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: SERIF }}>{week.label}</h2>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{week.totalVentas} <span className="text-sm font-normal text-muted-foreground">productos</span></p>
          <p className="text-sm font-semibold text-emerald-600">{fmtCOP(week.totalRevenue)} COP</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 mb-5">
        <p className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Productos vendidos por día</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={week.days} barSize={32} margin={{ top: 8, bottom: 8, left: -16, right: 8 }}>
            <CartesianGrid key="grid" vertical={false} stroke="var(--border)" />
            <XAxis key="x" dataKey="label" tick={(props) => <WeekTick {...(props as { x?: number; y?: number; payload?: { index: number; value: string } })} days={week.days} />} axisLine={false} tickLine={false} height={40} />
            <YAxis key="y" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip key="tip" content={(p) => <ChartTooltip {...(p as { active?: boolean; payload?: { value: number }[]; label?: string })} />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
            <Bar
              key="bar"
              dataKey="ventas"
              radius={[4,4,0,0]}
              isAnimationActive={false}
              shape={(props) => {
                const { x, y, width, height, index } = props as { x?: number; y?: number; width?: number; height?: number; index?: number };
                const fill = barFill(week.days[index ?? 0]);
                return <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />;
              }}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border flex-wrap">
          {[["#C62828","Días pasados"],["#ef5350","Hoy"],["var(--border)","Días futuros"]].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: c }} />
              <span className="text-xs text-muted-foreground">{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Detalle por día</p>
        </div>
        {week.days.map((d, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-border last:border-0">
            <span className={`w-16 shrink-0 text-sm font-semibold ${d.isToday ? "text-primary" : d.isFuture ? "text-muted-foreground/50" : "text-foreground"}`}>
              {d.label}
            </span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.round((d.ventas / maxV) * 100)}%`, background: d.isToday ? "#ef5350" : "#C62828", opacity: d.isFuture ? 0 : 1 }} />
            </div>
            <span className="w-28 text-right text-sm shrink-0">
              {d.isFuture ? <span className="text-muted-foreground/40">—</span> : (
                <><span className="font-bold text-foreground">{d.ventas}</span> <span className="text-muted-foreground text-xs">· {fmtCOP(d.revenue)}</span></>
              )}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Week detail: Compras ─────────────────────────────────────────────
function ComprasDetail({ week, items, total, onBack }: { week: WeekEntry; items: OrdenItem[]; total: number; onBack: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Compras · {week.range}</p>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: SERIF }}>{week.label}</h2>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-700">{fmtCOP(total)}</p>
          <p className="text-xs text-muted-foreground">total en insumos</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-semibold">Sin compras registradas esta semana</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Insumos comprados</p>
            <p className="text-xs text-muted-foreground">{items.length} ítems</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-muted/50">
                <tr>{["Insumo","Cantidad","Precio unit.","Subtotal"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((x, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{x.nombre}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">{x.cantidad} {x.unidad}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">{fmtCOP(x.costoUnitario)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground tabular-nums">{fmtCOP(x.cantidad * x.costoUnitario)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 border-t border-border">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-bold text-foreground">Total</td>
                  <td className="px-4 py-3 text-sm font-bold text-blue-700 tabular-nums">{fmtCOP(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
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
  const [tab, setTab] = useState<"ventas" | "compras">("ventas");
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [detailMode, setDetailMode] = useState<"ventas" | "compras">("ventas");

  const hoy = new Date();
  const hoyStr = hoyISO();

  // Índice real de ventas por fecha (excluye anuladas y devueltas).
  const porFecha = new Map<string, { unidades: number; ingresos: number }>();
  ventas.forEach((v) => {
    if (!esFechaISO(v.fecha) || v.estado === "anulado" || v.estado === "perdida") return;
    const dato = porFecha.get(v.fecha) ?? { unidades: 0, ingresos: 0 };
    dato.unidades += v.detalle?.reduce((s, d) => s + d.cantidad, 0) ?? v.cantidad ?? 0;
    dato.ingresos += v.total;
    porFecha.set(v.fecha, dato);
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
    ...ventas.map((v) => v.fecha),
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
      mesesDisponibles.push({ year: y, month: m, label: `${MON_ES[m - 1]} ${y}` });
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
  const weeks = buildWeeks(year, month, porFecha, hoy);

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

  const TAB_CLS = (t: "ventas" | "compras") =>
    `px-5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${tab === t ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted"}`;

  return (
    <div className="px-4 sm:px-6 py-6">
      <AnimatePresence mode="wait">
        {selectedWeek === null ? (
          <motion.div key={`month-${key}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {/* Back + title */}
            <div className="mb-6">
              <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-2">
                <ChevronLeft className="w-3.5 h-3.5" /> Dashboard
              </button>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Estadísticas</h1>
                  <p className="text-sm text-muted-foreground mt-1">Resumen de ventas y compras por semana</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex gap-1 bg-muted rounded-xl p-1">
                    <button className={TAB_CLS("ventas")} onClick={() => setTab("ventas")}>Ventas</button>
                    <button className={TAB_CLS("compras")} onClick={() => setTab("compras")}>Compras</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Month navigation — wrap para no desbordar en móvil */}
            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button onClick={() => changeMonth(-1)} disabled={idxMes === 0} className="p-2 rounded-xl hover:bg-muted disabled:opacity-30 cursor-pointer transition-colors" aria-label="Mes anterior">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-foreground min-w-36 text-center">{label}</h2>
                <button onClick={() => changeMonth(1)} disabled={idxMes === mesesDisponibles.length - 1} className="p-2 rounded-xl hover:bg-muted disabled:opacity-30 cursor-pointer transition-colors" aria-label="Mes siguiente">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              {/* Month totals */}
              <div className="flex gap-4">
                {tab === "ventas" ? (
                  <>
                    <div className="text-right">
                      <p className="text-xl font-bold text-foreground">{monthTotalVentas}</p>
                      <p className="text-xs text-muted-foreground">productos</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-emerald-600">{fmtCOP(monthTotalRevenue)}</p>
                      <p className="text-xs text-muted-foreground">ingresos</p>
                    </div>
                  </>
                ) : (
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-700">{fmtCOP(monthTotalCompras)}</p>
                    <p className="text-xs text-muted-foreground">en insumos</p>
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
