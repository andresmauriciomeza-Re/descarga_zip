import { type WeekEntry, fmtCOP, barFill } from "@/features/dashboard/utils/dashboard";
import { ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ── Week card (shown in month grid) ─────────────────────────────────
export function WeekCard({ week, comprasTotal, onVentas, onCompras, prevWeek, isCompras }: {
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
                {isCompras ? fmtCOP(comprasTotal) : `${week.totalUnidades} und · ${week.totalPorciones} porc.`}
              </p>
              <p className="text-[0.625rem] text-muted-foreground">
                {isCompras ? "en insumos" : "unidades y porciones"}
              </p>
              {!isCompras && week.totalRevenue > 0 && (
                <p className="text-[0.625rem] text-emerald-600 font-semibold">{fmtCOP(week.totalRevenue)}</p>
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
          {!noData && <button onClick={onVentas} className="text-xs font-semibold text-primary hover:underline cursor-pointer max-md:min-h-11 max-md:px-1">Ver ventas →</button>}
          {hasCom && <button onClick={onCompras} className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer max-md:min-h-11 max-md:px-1">Ver compras →</button>}
        </div>
      </div>
    </div>
  );
}
