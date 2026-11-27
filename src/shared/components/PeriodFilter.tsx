import type { Periodo } from "@/shared/utils/dates";

/** Opciones del filtro de periodo: Hoy · Esta semana · Este mes. Los valores
    internos (dia, semana, mes) no cambian; solo el texto que ve la persona. */
const OPCIONES: { id: Periodo; label: string }[] = [
  { id: "dia", label: "Hoy" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mes" },
];

/** Botones grandes de periodo (Dashboard: filtro global y filtro propio
    de cada gráfica). Un solo componente para todos con el mismo estilo. */
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
    <div className="pn-opciones" role="group" aria-label={ariaLabel}>
      {OPCIONES.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-pressed={value === p.id}
          onClick={() => onChange(p.id)}
          className="pn-opcion"
          style={size === "sm" ? { minHeight: 50, padding: "0 18px" } : undefined}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
