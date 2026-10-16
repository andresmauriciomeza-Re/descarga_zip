import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginadorProps {
  /** Página actual (1-based). */
  pagina: number;
  /** Total de páginas; si es <= 1 no se renderiza nada. */
  totalPaginas: number;
  /** Cambia a la página indicada. */
  onCambio: (pagina: number) => void;
}

/**
 * Paginador unificado de las listas del panel: 5 filas por página,
 * fuera y debajo de la card, centrado, con `mt-4` y `gap-4`.
 * Se oculta automáticamente cuando solo hay una página.
 */
export function Paginador({ pagina, totalPaginas, onCambio }: PaginadorProps) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-4 mt-4">
      <button
        onClick={() => onCambio(Math.max(1, pagina - 1))}
        disabled={pagina === 1}
        aria-label="Página anterior"
        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => onCambio(n)}
          aria-current={n === pagina ? "page" : undefined}
          className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${
            n === pagina
              ? "bg-primary text-white"
              : "hover:bg-muted text-muted-foreground"
          }`}
        >
          {n}
        </button>
      ))}
      <button
        onClick={() => onCambio(Math.min(totalPaginas, pagina + 1))}
        disabled={pagina === totalPaginas}
        aria-label="Página siguiente"
        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
