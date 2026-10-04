import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

/** Los tres estados posibles del producto. */
export const ESTADOS_PRODUCTO = ["Disponible", "No disponible", "Descontinuado"] as const;
export type EstadoProducto = (typeof ESTADOS_PRODUCTO)[number];

/** Color fuerte de cada estado. UN solo lugar: lo usan el index, Ver detalle,
    el modal de confirmación, ProductCard y el Excel. */
export const ESTADO_COLORES: Record<EstadoProducto, string> = {
  Disponible: "#2E7D32",
  "No disponible": "#E65100",
  Descontinuado: "#6B7280",
};

/** Pastilla de estado: fondo suave del color, texto del color fuerte y un
    punto de color a la izquierda. Se ve igual en listado, detalle y modal. */
export function EstadoBadge({
  estado,
  className = "",
}: {
  estado: EstadoProducto;
  className?: string;
}) {
  const color = ESTADO_COLORES[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold whitespace-nowrap ${className}`}
      style={{ backgroundColor: color + "1A", color, fontSize: 13 }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {estado}
    </span>
  );
}

/** Selector de estado del index: el disparador es el EstadoBadge con un
    ChevronDown; el menú es redondeado y cada opción se ve como su badge, con
    check en la actual. Sin permiso de edición (`disabled`) queda solo el
    badge, sin flecha. */
export function EstadoProductoSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: EstadoProducto;
  onChange: (estado: EstadoProducto) => void;
  disabled?: boolean;
}) {
  if (disabled) return <EstadoBadge estado={value} />;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Cambiar estado (actual: ${value})`}
          className="inline-flex items-center gap-0.5 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <EstadoBadge estado={value} />
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="rounded-2xl shadow-lg border border-border p-1.5 min-w-[10rem]">
        {ESTADOS_PRODUCTO.map((e) => (
          // Fondo naranja del hover: `--accent` (#e65100) con texto blanco
          // tapaba la pastilla. Se anula SOLO aquí (cn() usa twMerge, así que
          // pisa el focus:bg-accent que viene de ui/dropdown-menu.tsx sin
          // editar ese archivo). El check y las pastillas siguen igual.
          <DropdownMenuItem
            key={e}
            onSelect={() => {
              if (e !== value) onChange(e);
            }}
            className="rounded-xl cursor-pointer flex items-center justify-between gap-2 px-1.5 py-1.5 focus:bg-transparent focus:text-foreground data-[highlighted]:bg-transparent"
          >
            <EstadoBadge estado={e} />
            {e === value && <Check className="w-4 h-4 text-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
