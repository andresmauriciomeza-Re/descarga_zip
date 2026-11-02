import type { ReactNode } from "react";
import { FiltroPeriodo } from "@/shared/components/FiltroPeriodo";
import type { Periodo } from "@/shared/utils/fechas";

const SERIF = "var(--font-titulo)";

/** Tarjeta común de las gráficas del Dashboard: título, descripción y, si se
    pasa `periodo`/`onPeriodo`, su propio filtro Diario/Semanal/Mensual. Todas
    las gráficas usan este componente para que el encabezado sea idéntico. */
export function ChartCard({
  titulo,
  etiqueta,
  periodo,
  onPeriodo,
  controlAdicional,
  children,
}: {
  titulo: string;
  etiqueta: string;
  /** Si se pasa junto a `onPeriodo`, muestra el filtro propio de la gráfica. */
  periodo?: Periodo;
  onPeriodo?: (p: Periodo) => void;
  controlAdicional?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-bold text-foreground" style={{ fontFamily: SERIF }}>
            {titulo}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{etiqueta}</p>
        </div>
        {periodo !== undefined && onPeriodo && (
          <div className="flex max-w-full items-center justify-end gap-2 flex-wrap">
            <FiltroPeriodo
              value={periodo}
              onChange={onPeriodo}
              size="sm"
              ariaLabel={`Filtro de ${titulo}`}
            />
            <div className="flex w-auto max-w-full shrink-0 justify-end sm:w-48">
              {controlAdicional}
            </div>
          </div>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
