import { ChevronLeft, ChevronRight } from "lucide-react";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { useIdioma } from "@/shared/i18n";

export const REGISTROS_POR_PAGINA = 10;

/** «‹ Anteriores · Página 1 de 2 · 10 por página · Siguientes ›». */
export function PaginadorGrande({
  pagina,
  total,
  porPagina = REGISTROS_POR_PAGINA,
  onCambiar,
}: {
  /** Página actual, desde 1. */
  pagina: number;
  /** Total de registros (no de páginas). */
  total: number;
  porPagina?: number;
  onCambiar: (pagina: number) => void;
}) {
  const { t } = useIdioma();
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (total <= porPagina) return null;
  return (
    <nav className="pn-paginador" aria-label={t("comun.paginacion")}>
      <BotonAccion icono={ChevronLeft} disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>
        {t("comun.anteriores")}
      </BotonAccion>
      <span className="pn-paginador__info" aria-live="polite">
        {t("comun.pagina", { pagina, paginas, porPagina })}
      </span>
      <BotonAccion disabled={pagina >= paginas} onClick={() => onCambiar(pagina + 1)}>
        {t("comun.siguientes")}
        <ChevronRight size={22} aria-hidden="true" />
      </BotonAccion>
    </nav>
  );
}
