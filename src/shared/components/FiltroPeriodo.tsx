import type { Periodo } from "@/shared/utils/fechas";

/** Opciones del filtro de periodo: Diario · Semanal · Mensual (el antiguo
    "Total" se eliminó para que siempre haya un rango acotado). */
const OPCIONES: { id: Periodo; label: string }[] = [
  { id: "dia", label: "Diario" },
  { id: "semana", label: "Semanal" },
  { id: "mes", label: "Mensual" },
];

/** Control segmentado de periodo (Dashboard: filtro global y filtro propio
    de cada gráfica). Un solo componente para no duplicar el JSX del pill. */
export function FiltroPeriodo({
  value,
  onChange,
  size = "md",
  ariaLabel = "Filtro de periodo",
}: {
  value: Periodo;
  onChange: (p: Periodo) => void;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  return (
    <div className="flex gap-1 bg-muted rounded-xl p-1" role="group" aria-label={ariaLabel}>
      {OPCIONES.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-pressed={value === p.id}
          onClick={() => onChange(p.id)}
          className={`rounded-lg font-semibold cursor-pointer transition-all ${
            size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-1.5 text-sm"
          } ${
            value === p.id
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
