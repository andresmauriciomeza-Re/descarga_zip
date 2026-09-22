import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const SERIF = "'DM Serif Display', serif";
const TODAY = { y: 2026, m: 8, d: 20 };
const DOW_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MON_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const CLOSED_DOW = [1, 2, 3]; // Lun, Mar, Mié

const MONTHS_NAV = [
  { year: 2026, month: 6, label: "Junio 2026" },
  { year: 2026, month: 7, label: "Julio 2026" },
  { year: 2026, month: 8, label: "Agosto 2026" },
];

// ── helpers ──────────────────────────────────────────────────────────
function fmtCOP(n: number) { return "$" + Math.round(n).toLocaleString("es-CO"); }
function getDow(y: number, m: number, d: number) { return new Date(y, m - 1, d).getDay(); }
function closedDay(y: number, m: number, d: number) { return CLOSED_DOW.includes(getDow(y, m, d)); }
function futureDay(y: number, m: number, d: number) {
  return new Date(y, m - 1, d) > new Date(TODAY.y, TODAY.m - 1, TODAY.d);
}
function todayDay(y: number, m: number, d: number) {
  return y === TODAY.y && m === TODAY.m && d === TODAY.d;
}

// ── Sales data: products sold per open day ───────────────────────────
const SALES: Record<string, Record<number, number>> = {
  "2026-6": {
    4: 68, 5: 84, 6: 97, 7: 71,
    11: 74, 12: 91, 13: 103, 14: 78,
    18: 82, 19: 95, 20: 108, 21: 69,
    25: 79, 26: 88, 27: 95, 28: 73,
  },
  "2026-7": {
    2: 71, 3: 86, 4: 99, 5: 74,
    9: 77, 10: 92, 11: 106, 12: 80,
    16: 83, 17: 95, 18: 112, 19: 76,
    23: 75, 24: 90, 25: 104, 26: 79,
    30: 82, 31: 94,
  },
  "2026-8": {
    1: 45, 2: 52,
    6: 71, 7: 89, 8: 94, 9: 38,
    13: 85, 14: 102, 15: 67, 16: 43,
    20: 34,
  },
};

// Price per product per day (14,000–16,000 COP)
const PRICE: Record<string, Record<number, number>> = {
  "2026-6": {
    4: 15200, 5: 14800, 6: 15500, 7: 14300,
    11: 15000, 12: 15300, 13: 14700, 14: 15100,
    18: 14900, 19: 15400, 20: 15600, 21: 14500,
    25: 15000, 26: 14800, 27: 15200, 28: 14600,
  },
  "2026-7": {
    2: 15100, 3: 14900, 4: 15400, 5: 14700,
    9: 15000, 10: 15200, 11: 15500, 12: 14800,
    16: 14600, 17: 15300, 18: 15700, 19: 14400,
    23: 15000, 24: 14900, 25: 15100, 26: 15300,
    30: 15200, 31: 14800,
  },
  "2026-8": {
    1: 14500, 2: 15000,
    6: 14800, 7: 15200, 8: 15500, 9: 14300,
    13: 15000, 14: 15400, 15: 14700, 16: 15100,
    20: 15000,
  },
};

// ── Compras data: weekly purchase costs (COP) ────────────────────────
const COMPRAS_W: Record<string, number[]> = {
  "2026-6": [2450000, 2680000, 2750000, 2560000, 0],
  "2026-7": [2310000, 2540000, 2780000, 2620000, 1250000],
  "2026-8": [1920000, 2380000, 1450000, 0, 0],
};

type CItem = { nombre: string; cantidad: number; unidad: string; precio: number };

const COMPRAS_ITEMS: Record<string, CItem[][]> = {
  "2026-6": [
    [
      { nombre: "Queso Mozzarella",   cantidad: 40,  unidad: "kg",  precio: 18000 },
      { nombre: "Salsa de Tomate",    cantidad: 30,  unidad: "lt",  precio: 8000  },
      { nombre: "Masa Pre-elaborada", cantidad: 120, unidad: "und", precio: 3500  },
      { nombre: "Pepperoni",          cantidad: 8,   unidad: "kg",  precio: 25000 },
      { nombre: "Bebidas 350ml",      cantidad: 96,  unidad: "und", precio: 2500  },
    ],
    [
      { nombre: "Queso Mozzarella",   cantidad: 44,  unidad: "kg",  precio: 18000 },
      { nombre: "Salsa de Tomate",    cantidad: 32,  unidad: "lt",  precio: 8000  },
      { nombre: "Masa Pre-elaborada", cantidad: 130, unidad: "und", precio: 3500  },
      { nombre: "Jamón Serrano",      cantidad: 5,   unidad: "kg",  precio: 32000 },
      { nombre: "Bebidas 350ml",      cantidad: 104, unidad: "und", precio: 2500  },
    ],
    [
      { nombre: "Queso Mozzarella",   cantidad: 46,  unidad: "kg",  precio: 18000 },
      { nombre: "Salsa de Tomate",    cantidad: 34,  unidad: "lt",  precio: 8000  },
      { nombre: "Masa Pre-elaborada", cantidad: 135, unidad: "und", precio: 3500  },
      { nombre: "Pepperoni",          cantidad: 10,  unidad: "kg",  precio: 25000 },
      { nombre: "Albahaca Fresca",    cantidad: 3,   unidad: "kg",  precio: 9000  },
    ],
    [
      { nombre: "Queso Mozzarella",   cantidad: 42,  unidad: "kg",  precio: 18000 },
      { nombre: "Salsa de Tomate",    cantidad: 30,  unidad: "lt",  precio: 8000  },
      { nombre: "Masa Pre-elaborada", cantidad: 125, unidad: "und", precio: 3500  },
      { nombre: "Aceitunas Negras",   cantidad: 8,   unidad: "kg",  precio: 14000 },
      { nombre: "Bebidas 350ml",      cantidad: 100, unidad: "und", precio: 2500  },
    ],
    [],
  ],
  "2026-7": [
    [
      { nombre: "Queso Mozzarella",   cantidad: 38,  unidad: "kg",  precio: 18000 },
      { nombre: "Salsa de Tomate",    cantidad: 28,  unidad: "lt",  precio: 8000  },
      { nombre: "Masa Pre-elaborada", cantidad: 115, unidad: "und", precio: 3500  },
      { nombre: "Pepperoni",          cantidad: 7,   unidad: "kg",  precio: 25000 },
      { nombre: "Bebidas 350ml",      cantidad: 90,  unidad: "und", precio: 2500  },
    ],
    [
      { nombre: "Queso Mozzarella",   cantidad: 42,  unidad: "kg",  precio: 18000 },
      { nombre: "Salsa de Tomate",    cantidad: 31,  unidad: "lt",  precio: 8000  },
      { nombre: "Masa Pre-elaborada", cantidad: 128, unidad: "und", precio: 3500  },
      { nombre: "Champiñones",        cantidad: 15,  unidad: "kg",  precio: 12000 },
      { nombre: "Bebidas 350ml",      cantidad: 98,  unidad: "und", precio: 2500  },
    ],
    [
      { nombre: "Queso Mozzarella",   cantidad: 48,  unidad: "kg",  precio: 18000 },
      { nombre: "Salsa de Tomate",    cantidad: 35,  unidad: "lt",  precio: 8000  },
      { nombre: "Masa Pre-elaborada", cantidad: 140, unidad: "und", precio: 3500  },
      { nombre: "Pepperoni",          cantidad: 11,  unidad: "kg",  precio: 25000 },
      { nombre: "Pimentón",           cantidad: 10,  unidad: "kg",  precio: 5000  },
    ],
    [
      { nombre: "Queso Mozzarella",   cantidad: 43,  unidad: "kg",  precio: 18000 },
      { nombre: "Salsa de Tomate",    cantidad: 32,  unidad: "lt",  precio: 8000  },
      { nombre: "Masa Pre-elaborada", cantidad: 128, unidad: "und", precio: 3500  },
      { nombre: "Jamón Serrano",      cantidad: 6,   unidad: "kg",  precio: 32000 },
      { nombre: "Bebidas 350ml",      cantidad: 104, unidad: "und", precio: 2500  },
    ],
    [
      { nombre: "Queso Mozzarella",   cantidad: 20,  unidad: "kg",  precio: 18000 },
      { nombre: "Masa Pre-elaborada", cantidad: 60,  unidad: "und", precio: 3500  },
      { nombre: "Bebidas 350ml",      cantidad: 48,  unidad: "und", precio: 2500  },
    ],
  ],
  "2026-8": [
    [
      { nombre: "Queso Mozzarella",   cantidad: 36,  unidad: "kg",  precio: 18000 },
      { nombre: "Salsa de Tomate",    cantidad: 27,  unidad: "lt",  precio: 8000  },
      { nombre: "Masa Pre-elaborada", cantidad: 110, unidad: "und", precio: 3500  },
      { nombre: "Pepperoni",          cantidad: 7,   unidad: "kg",  precio: 25000 },
      { nombre: "Bebidas 350ml",      cantidad: 88,  unidad: "und", precio: 2500  },
    ],
    [
      { nombre: "Queso Mozzarella",   cantidad: 42,  unidad: "kg",  precio: 18000 },
      { nombre: "Salsa de Tomate",    cantidad: 30,  unidad: "lt",  precio: 8000  },
      { nombre: "Masa Pre-elaborada", cantidad: 125, unidad: "und", precio: 3500  },
      { nombre: "Pepperoni",          cantidad: 9,   unidad: "kg",  precio: 25000 },
      { nombre: "Champiñones",        cantidad: 12,  unidad: "kg",  precio: 12000 },
    ],
    [
      { nombre: "Queso Mozzarella",   cantidad: 28,  unidad: "kg",  precio: 18000 },
      { nombre: "Salsa de Tomate",    cantidad: 20,  unidad: "lt",  precio: 8000  },
      { nombre: "Masa Pre-elaborada", cantidad: 85,  unidad: "und", precio: 3500  },
      { nombre: "Bebidas 350ml",      cantidad: 68,  unidad: "und", precio: 2500  },
    ],
    [], [],
  ],
};

// ── Build week structure dynamically ─────────────────────────────────
interface DayEntry {
  day: number;
  label: string;
  ventas: number;
  revenue: number;
  isClosed: boolean;
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
}

function buildWeeks(year: number, month: number): WeekEntry[] {
  const key = `${year}-${month}`;
  const sales = SALES[key] ?? {};
  const prices = PRICE[key] ?? {};
  const daysInMonth = new Date(year, month, 0).getDate();
  const abbr = MON_ES[month - 1].slice(0, 3).toLowerCase();
  const weeks: WeekEntry[] = [];

  for (let start = 1, idx = 0; start <= daysInMonth; start += 7, idx++) {
    const end = Math.min(start + 6, daysInMonth);
    const days: DayEntry[] = [];
    for (let d = start; d <= end; d++) {
      const dow = getDow(year, month, d);
      const closed = CLOSED_DOW.includes(dow);
      const future = futureDay(year, month, d);
      const today = todayDay(year, month, d);
      const ventas = closed || future ? 0 : (sales[d] ?? 0);
      const price = prices[d] ?? 15000;
      days.push({ day: d, label: `${DOW_ES[dow]} ${d}`, ventas, revenue: ventas * price, isClosed: closed, isToday: today, isFuture: future });
    }
    weeks.push({
      idx,
      label: `Semana ${idx + 1}`,
      range: `${start} – ${end} ${abbr}`,
      days,
      totalVentas: days.reduce((s, d) => s + d.ventas, 0),
      totalRevenue: days.reduce((s, d) => s + d.revenue, 0),
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
      <p className="font-bold text-foreground">{isCOP ? fmtCOP(payload[0].value) : `${payload[0].value} productos`}</p>
    </div>
  );
}

// ── Custom XAxis tick (shows "No abrimos" for closed days) ───────────
function WeekTick({ x, y, payload, days }: { x?: number; y?: number; payload?: { index: number; value: string }; days: DayEntry[] }) {
  if (x === undefined || y === undefined || !payload) return null;
  const entry = days[payload?.index ?? 0];
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill={entry?.isToday ? "#C62828" : "var(--foreground)"} fontSize={10} fontWeight={entry?.isToday ? "bold" : "normal"}>
        {payload.value}
      </text>
      {entry?.isClosed && (
        <text x={0} y={0} dy={26} textAnchor="middle" fill="var(--muted-foreground)" fontSize={8} fontStyle="italic">No abrimos</text>
      )}
    </g>
  );
}

// ── Bar color helper ─────────────────────────────────────────────────
function barFill(d: DayEntry) {
  if (d.isClosed) return "transparent";
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
  const delta = prevWeek && prevWeek.totalVentas > 0
    ? Math.round(((week.totalVentas - prevWeek.totalVentas) / prevWeek.totalVentas) * 100)
    : null;
  const noData = week.days.every(d => d.isFuture || d.isClosed);
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
                shape={(props: any) => {
                  const { x, y, width, height, index } = props;
                  const fill = barFill(week.days[index]);
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
        <div className="flex-1">
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
            <XAxis key="x" dataKey="label" tick={(props) => <WeekTick {...props} days={week.days} />} axisLine={false} tickLine={false} height={40} />
            <YAxis key="y" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip key="tip" content={(p) => <ChartTooltip {...p as any} />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
            <Bar
              key="bar"
              dataKey="ventas"
              radius={[4,4,0,0]}
              isAnimationActive={false}
              shape={(props: any) => {
                const { x, y, width, height, index } = props;
                const fill = barFill(week.days[index]);
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
            <span className={`w-16 shrink-0 text-sm font-semibold ${d.isToday ? "text-primary" : d.isClosed ? "text-muted-foreground/40" : d.isFuture ? "text-muted-foreground/50" : "text-foreground"}`}>
              {d.label}
            </span>
            {d.isClosed ? (
              <span className="text-xs text-muted-foreground/50 italic">No abrimos</span>
            ) : (
              <>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.round((d.ventas / maxV) * 100)}%`, background: d.isToday ? "#ef5350" : "#C62828", opacity: d.isFuture ? 0 : 1 }} />
                </div>
                <span className="w-28 text-right text-sm shrink-0">
                  {d.isFuture ? <span className="text-muted-foreground/40">—</span> : (
                    <><span className="font-bold text-foreground">{d.ventas}</span> <span className="text-muted-foreground text-xs">· {fmtCOP(d.revenue)}</span></>
                  )}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Week detail: Compras ─────────────────────────────────────────────
function ComprasDetail({ week, items, total, onBack }: { week: WeekEntry; items: CItem[]; total: number; onBack: () => void }) {
  const computed = items.reduce((s, x) => s + x.cantidad * x.precio, 0);
  const displayTotal = computed > 0 ? computed : total;
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Compras · {week.range}</p>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: SERIF }}>{week.label}</h2>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-700">{fmtCOP(displayTotal)}</p>
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
            <table className="w-full">
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
                    <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">{fmtCOP(x.precio)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground tabular-nums">{fmtCOP(x.cantidad * x.precio)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 border-t border-border">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-bold text-foreground">Total</td>
                  <td className="px-4 py-3 text-sm font-bold text-blue-700 tabular-nums">{fmtCOP(displayTotal)}</td>
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
export function SalesChartScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<"ventas" | "compras">("ventas");
  const [monthIdx, setMonthIdx] = useState(2); // 0=Jun, 1=Jul, 2=Aug
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [detailMode, setDetailMode] = useState<"ventas" | "compras">("ventas");

  const { year, month, label } = MONTHS_NAV[monthIdx];
  const key = `${year}-${month}`;
  const weeks = buildWeeks(year, month);
  const comprasW = COMPRAS_W[key] ?? [];
  const comprasItems = COMPRAS_ITEMS[key] ?? [];

  const monthTotalVentas = weeks.reduce((s, w) => s + w.totalVentas, 0);
  const monthTotalRevenue = weeks.reduce((s, w) => s + w.totalRevenue, 0);
  const monthTotalCompras = comprasW.reduce((s, v) => s + v, 0);

  const changeMonth = (dir: -1 | 1) => {
    setMonthIdx(i => Math.max(0, Math.min(2, i + dir)));
    setSelectedWeek(null);
  };

  const openDetail = (wIdx: number, mode: "ventas" | "compras") => {
    setSelectedWeek(wIdx);
    setDetailMode(mode);
  };

  const TAB_CLS = (t: "ventas" | "compras") =>
    `px-5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${tab === t ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted"}`;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <AnimatePresence mode="wait">
        {selectedWeek === null ? (
          <motion.div key="month-view" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
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

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <button onClick={() => changeMonth(-1)} disabled={monthIdx === 0} className="p-2 rounded-xl hover:bg-muted disabled:opacity-30 cursor-pointer transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-foreground min-w-36 text-center">{label}</h2>
                <button onClick={() => changeMonth(1)} disabled={monthIdx === 2} className="p-2 rounded-xl hover:bg-muted disabled:opacity-30 cursor-pointer transition-colors">
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
                  comprasTotal={comprasW[i] ?? 0}
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
            items={comprasItems[selectedWeek] ?? []}
            total={comprasW[selectedWeek] ?? 0}
            onBack={() => setSelectedWeek(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Mini chart data for Dashboard (today: 4pm–10pm) ──────────────────
export const HOURLY_TODAY = [
  { hora: "4pm",  ventas: 3 },
  { hora: "5pm",  ventas: 6 },
  { hora: "6pm",  ventas: 8 },
  { hora: "7pm",  ventas: 7 },
  { hora: "8pm",  ventas: 6 },
  { hora: "9pm",  ventas: 4 },
];
