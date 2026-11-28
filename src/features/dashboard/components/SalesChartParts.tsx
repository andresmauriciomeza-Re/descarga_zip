import { fmtCOP, type DayEntry } from "@/features/dashboard/utils/dashboard";

// ── Shared tooltip ───────────────────────────────────────────────────
export function ChartTooltip({ active, payload, label, isCOP }: { active?: boolean; payload?: { value: number; name?: string; dataKey?: string }[]; label?: string; isCOP?: boolean }) {
  if (!active || !payload?.length || payload.every((dato) => !dato.value)) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-muted-foreground mb-0.5">{label}</p>
      {payload.map((dato, index) => (
        <p key={index} className="font-bold text-foreground">
          {dato.name ?? dato.dataKey}: {isCOP ? fmtCOP(dato.value) : dato.dataKey === "porciones" ? `${dato.value} porciones` : `${dato.value} unidades`}
        </p>
      ))}
    </div>
  );
}

// ── Custom XAxis tick (hoy en rojo) ──────────────────────────────────
export function WeekTick({ x, y, payload, days }: { x?: number; y?: number; payload?: { index: number; value: string }; days: DayEntry[] }) {
  if (x === undefined || y === undefined || !payload) return null;
  const entry = days[payload?.index ?? 0];
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill={entry?.isToday ? "#991B1B" : "var(--foreground)"} fontSize={12} fontWeight={entry?.isToday ? "bold" : "normal"}>
        {payload.value}
      </text>
    </g>
  );
}
