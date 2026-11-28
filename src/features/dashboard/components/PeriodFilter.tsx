import type { Periodo } from "@/shared/utils/dates";
import { useIdioma } from "@/shared/i18n";

/** Opciones del filtro de periodo: Hoy · Esta semana · Este mes. Los valores
    internos (dia, semana, mes) no cambian; solo el texto que ve la persona. */
const OPCIONES: { id: Periodo; clave: string }[] = [
  { id: "dia", clave: "comun.hoy" },
  { id: "semana", clave: "comun.estaSemana" },
  { id: "mes", clave: "comun.esteMes" },
];

/** Botones grandes de periodo (Dashboard: filtro global y filtro propio
    de cada gráfica). Un solo componente para todos con el mismo estilo. */
export function FiltroPeriodo({
  value,
  onChange,
  size = "md",
  ariaLabel,
}: {
  value: Periodo;
  onChange: (p: Periodo) => void;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  const { t } = useIdioma();
  return (
    <div className="pn-opciones" role="group" aria-label={ariaLabel ?? t("comun.filtroPeriodo")}>
      {OPCIONES.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-pressed={value === p.id}
          onClick={() => onChange(p.id)}
          className="pn-opcion"
          style={size === "sm" ? { minHeight: "3.125rem", padding: "0 1.125rem" } : undefined}
        >
          {t(p.clave)}
        </button>
      ))}
    </div>
  );
}
