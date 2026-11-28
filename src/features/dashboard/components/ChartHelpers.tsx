import { VacioEstado } from "@/shared/components/panel/EmptyState";
import { BarChart3 } from "lucide-react";
import { useIdioma } from "@/shared/i18n";

// ── Tooltip único de todas las gráficas: valores exactos (COP, unidades o
// conteos) según la función `formatear` que recibe cada una ───────────
export function GrafTooltip({
  active,
  payload,
  label,
  formatear,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; name?: string; value?: number | null }>;
  label?: string;
  formatear?: (serie: string, valor: number) => string;
}) {
  // Los días que todavía no llegan vienen vacíos (null): no se muestran.
  const visibles = (payload ?? []).filter((p) => p.value !== null && p.value !== undefined);
  if (!active || !visibles.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-lg text-base">
      <p className="font-semibold text-muted-foreground mb-0.5">{label}</p>
      {visibles.map((p, i) => (
        <p key={i} className="font-bold text-foreground">
          {p.name ?? p.dataKey}:{" "}
          {formatear
            ? formatear(String(p.dataKey ?? ""), Number(p.value ?? 0))
            : String(p.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

/** Estado vacío de cada gráfica cuando no hay datos en el periodo. */
export function SinDatos({ texto }: { texto?: string }) {
  const { t } = useIdioma();
  return (
    <VacioEstado icono={BarChart3} titulo={texto ?? t("dashboard.sinDatos")}>
      {t("dashboard.sinDatosAyuda")}
    </VacioEstado>
  );
}
