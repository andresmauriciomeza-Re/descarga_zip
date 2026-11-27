import type { FichaVersion } from "@/shared/utils/technicalSheets";
import { rangoVersion } from "@/features/products/utils/products";

/** Selector de versiones de la ficha: pastillas con clic que muestran el
    número y el rango de fechas de cada versión. */
export function VersionPills({
  versiones,
  activo,
  onSelect,
}: {
  versiones: FichaVersion[];
  /** Índice seleccionado dentro de `versiones`; -1 cuando lo activo es el
      borrador (pantalla Editar), que se pinta aparte. */
  activo: number;
  onSelect: (idx: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {versiones.map((v, i) => (
        <button
          key={v.version}
          type="button"
          onClick={() => onSelect(i)}
          title={rangoVersion(v)}
          className={`flex flex-col items-start px-3 py-1 rounded-lg cursor-pointer transition-colors ${
            i === activo ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-border"
          }`}
        >
          <span className="text-xs font-bold leading-tight">v{v.version}</span>
          <span className={`text-[10px] leading-tight ${i === activo ? "text-white/80" : ""}`}>
            {rangoVersion(v)}
          </span>
        </button>
      ))}
    </div>
  );
}
