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
      filtran), pero queda mapeado por si otra pantalla lo usa.
    - Agotado: rojo, SOLO cuando el estado es "Disponible" y el stock REAL del
      catálogo público es 0 (`stock`), sin descontar lo que ya hay en el
      carrito. Con `stock` undefined (dato no enviado) se pinta el estado tal
      cual, y con "No disponible" nunca cambia. */
const FONDO_ESTADO: Record<EstadoProducto, string> = {
  Disponible: "bg-emerald-600 dark:bg-emerald-500",
  "No disponible": "bg-zinc-700",
  Descontinuado: "bg-zinc-800",
};

/** Estilo base compartido por las píldoras del menú público (`EstadoMenuBadge`
    y `AgotadoMenuBadge`): fondo sólido, texto blanco en negrita de 12 px,
    forma de píldora, sombra suave (shadow-md) y anillo blanco semitransparente
    (ring). El COLOR de fondo lo pone cada componente. */
const BASE_PILDONA =
  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-bold whitespace-nowrap shadow-md ring-1 ring-white/40";
/** Puntito circular blanco a la izquierda del texto (lenguaje visual del panel). */
const PUNTITO = "w-2 h-2 rounded-full bg-white shrink-0";

export function EstadoMenuBadge({
  estado,
  stock,
  className = "",
}: {
  estado: EstadoProducto;
  /** Stock REAL del catálogo (sin descontar el carrito). Con `estado`
      "Disponible" y `stock === 0` se pinta "Agotado" en rojo; `undefined` =
      sin dato, el estado se pinta tal cual. */
  stock?: number;
  /** Posicionamiento externo (p. ej. "absolute top-3 left-3 z-10"). */
  className?: string;
}) {
  const agotado = estado === "Disponible" && stock === 0;
  const fondo = agotado ? "bg-red-600 dark:bg-red-500" : FONDO_ESTADO[estado];
  const texto = agotado ? "Agotado" : estado;
  return (
    <span
      className={`${BASE_PILDONA} ${fondo} ${className}`}
    >
      <span className={PUNTITO} aria-hidden="true" />
      {texto}
    </span>
  );
}

/** Píldora roja "Agotado" del menú público: MISMO tamaño, forma y estilo que
    `EstadoMenuBadge` (comparten `BASE_PILDONA` y `PUNTITO`); solo el fondo es
    rojo. Se pinta en la MISMA esquina superior izquierda que el badge de
    estado, y `etiquetaEstadoMenu` (App) garantiza que nunca salen los dos a la
    vez, así que no se superponen. */
export function AgotadoMenuBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`${BASE_PILDONA} bg-red-600 ${className}`}>
      <span className={PUNTITO} aria-hidden="true" />
      Agotado
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
