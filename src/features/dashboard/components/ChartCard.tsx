import type { ReactNode } from "react";
import { FiltroPeriodo } from "@/features/dashboard/components/PeriodFilter";
import type { Periodo } from "@/shared/utils/dates";

const SERIF = "var(--font-titulo)";

/** Tarjeta común de las gráficas del Dashboard: título, una frase corta y, si se
    pasa `periodo`/`onPeriodo`, sus propios botones Hoy / Esta semana / Este mes.
    Todas las gráficas usan este componente para que el encabezado sea idéntico. */
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
    <section className="pn-seccion" style={{ minWidth: 0 }}>
      <h3 className="font-bold text-foreground" style={{ fontFamily: SERIF, fontSize: "1.4375rem", lineHeight: 1.3 }}>
        {titulo}
      </h3>
      <p className="pn-seccion__ayuda" style={{ marginBottom: "0.875rem" }}>{etiqueta}</p>
      {periodo !== undefined && onPeriodo && (
        <div className="flex flex-col gap-3 mb-4">
          <FiltroPeriodo
            value={periodo}
            onChange={onPeriodo}
            size="sm"
            ariaLabel={`Periodo de ${titulo}`}
          />
          {controlAdicional}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}
