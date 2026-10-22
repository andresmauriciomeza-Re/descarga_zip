import type { EstadoProducto } from "./EstadoProducto";

/** Etiqueta de estado del MENÚ PÚBLICO (tarjetas del catálogo, favoritas de la
    landing y detalle). A diferencia del `EstadoBadge` del panel —fondo suave y
    texto de color, que sobre fotos claras, oscuras o de cuadritos se perdía—
    esta usa fondo SÓLIDO, texto blanco en negrita de 12 px, forma de píldora,
    sombra suave (shadow-md) y un anillo blanco semitransparente (ring) que la
    separa de cualquier fondo. El puntito circular a la izquierda del texto
    conserva el lenguaje visual de `EstadoBadge`.

    - Disponible: verde emerald (emerald-600 en claro, emerald-500 en oscuro,
      que es el que mantiene contraste sobre fondo oscuro).
    - No disponible: gris zinc-700 (legible en ambos modos).
    - Descontinuado: no se llega a pintar en el menú (esos productos se
      filtran), pero queda mapeado por si otra pantalla lo usa. */
const FONDO_ESTADO: Record<EstadoProducto, string> = {
  Disponible: "bg-emerald-600 dark:bg-emerald-500",
  "No disponible": "bg-zinc-700",
  Descontinuado: "bg-zinc-800",
};

export function EstadoMenuBadge({
  estado,
  className = "",
}: {
  estado: EstadoProducto;
  /** Posicionamiento externo (p. ej. "absolute top-3 left-3 z-10"). */
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-bold whitespace-nowrap shadow-md ring-1 ring-white/40 ${FONDO_ESTADO[estado]} ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-white shrink-0" aria-hidden="true" />
      {estado}
    </span>
  );
}

/** Franja centrada sobre la foto de una tarjeta "No disponible": fondo oscuro
    semitransparente con blur, texto blanco. Se pinta encima de la imagen en
    gris y complementa a `EstadoMenuBadge`. */
export function NoDisponibleOverlay({ className = "" }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <span className="bg-black/60 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md ring-1 ring-white/20">
        No disponible hoy
      </span>
    </span>
  );
}
