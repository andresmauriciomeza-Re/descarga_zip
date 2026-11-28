import { type WeekEntry, SERIF, fmtCOP, barFill } from "@/features/dashboard/utils/dashboard";
import { motion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from "recharts";
import { WeekTick, ChartTooltip } from "@/features/dashboard/components/SalesChartParts";

// ── Week detail: Ventas ───────────────────────────────────────────────
export function VentasDetail({ week, onBack }: { week: WeekEntry; onBack: () => void }) {
  const maxV = Math.max(...week.days.map(d => d.unidades + d.porciones), 1);
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button onClick={onBack} className="p-2 max-md:p-3 rounded-xl hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ventas · {week.range}</p>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: SERIF }}>{week.label}</h2>
        </div>
        <div className="text-right max-md:basis-full max-md:text-left">
          <p className="text-2xl font-bold text-foreground">{week.totalUnidades} <span className="text-sm font-normal text-muted-foreground">unidades</span> · {week.totalPorciones} <span className="text-sm font-normal text-muted-foreground">porciones</span></p>
          <p className="text-sm font-semibold text-emerald-600">{fmtCOP(week.totalRevenue)} COP</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 mb-5">
        <p className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Unidades y porciones vendidas por día</p>
        <div style={{ height: "13.75rem" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={week.days} barSize={32} margin={{ top: 8, bottom: 8, left: -16, right: 8 }}>
              <CartesianGrid key="grid" vertical={false} stroke="var(--border)" />
              <XAxis key="x" dataKey="label" tick={(props) => <WeekTick {...(props as { x?: number; y?: number; payload?: { index: number; value: string } })} days={week.days} />} axisLine={false} tickLine={false} height={40} />
              <YAxis key="y" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip key="tip" content={(p) => <ChartTooltip {...(p as { active?: boolean; payload?: { value: number; name?: string; dataKey?: string }[]; label?: string })} />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
              <Bar
                key="unidades"
                dataKey="unidades"
                name="Unidades"
                stackId="cantidades"
                radius={[4,4,0,0]}
                isAnimationActive={false}
                shape={(props) => {
                  const { x, y, width, height, index } = props as { x?: number; y?: number; width?: number; height?: number; index?: number };
                  const fill = barFill(week.days[index ?? 0]);
                  return <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />;
                }}
              />
              <Bar key="porciones" dataKey="porciones" name="Porciones" stackId="cantidades" fill="#F97316" radius={[4,4,0,0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border flex-wrap">
          {[["var(--rojo)","Días pasados"],["#ef5350","Hoy"],["var(--border)","Días futuros"]].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: c }} />
              <span className="text-xs text-muted-foreground">{l}</span>
            </div>
          ))}
          <span className="text-xs text-muted-foreground">Naranja: porciones · Rojo: unidades</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Detalle por día</p>
        </div>
        {week.days.map((d, i) => (
          <div key={i} className="flex items-center gap-4 max-md:flex-wrap max-md:gap-x-3 max-md:gap-y-1 px-5 py-3 border-b border-border last:border-0">
            <span className={`w-16 shrink-0 text-sm font-semibold ${d.isToday ? "text-primary" : d.isFuture ? "text-muted-foreground/50" : "text-foreground"}`}>
              {d.label}
            </span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full flex" style={{ width: `${Math.round(((d.unidades + d.porciones) / maxV) * 100)}%`, opacity: d.isFuture ? 0 : 1 }}>
                <span className="h-full" style={{ width: `${d.unidades + d.porciones > 0 ? (d.unidades / (d.unidades + d.porciones)) * 100 : 0}%`, background: d.isToday ? "#ef5350" : "var(--rojo)" }} />
                <span className="h-full bg-orange-500" style={{ width: `${d.unidades + d.porciones > 0 ? (d.porciones / (d.unidades + d.porciones)) * 100 : 0}%` }} />
              </div>
            </div>
            <span className="w-28 max-md:w-full max-md:pl-[4.75rem] max-md:text-left text-right text-sm shrink-0">
              {d.isFuture ? <span className="text-muted-foreground/40">—</span> : (
                <><span className="font-bold text-foreground">{d.unidades} und · {d.porciones} porc.</span> <span className="text-muted-foreground text-xs">· {fmtCOP(d.revenue)}</span></>
              )}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
