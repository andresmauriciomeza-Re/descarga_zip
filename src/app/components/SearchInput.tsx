import { Search } from "lucide-react";

/**
 * Buscador unificado de los listados del dashboard. Reutiliza exactamente el
 * diseño del buscador de Gestión Proveedor: lupa a la izquierda, fondo gris
 * muy claro, borde fino, esquinas redondeadas y un ancho máximo de 384px
 * (`max-w-sm`) para que ningún módulo ocupe toda la pantalla. En pantallas
 * angostas el `w-full` del wrapper lo lleva al 100% del ancho disponible.
 *
 * `wrapperClassName` permite ajustar sólo el contenedor cuando el buscador
 * comparte fila con otros filtros (p. ej. `w-full max-w-sm` dentro de un
 * `flex flex-wrap items-center gap-3`), manteniendo el mismo tamaño.
 */
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Clases del contenedor. Por defecto, fila propia con margen inferior. */
  wrapperClassName?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  wrapperClassName = "mb-5 max-w-sm",
}: SearchInputProps) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}
