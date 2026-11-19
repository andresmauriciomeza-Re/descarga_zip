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
