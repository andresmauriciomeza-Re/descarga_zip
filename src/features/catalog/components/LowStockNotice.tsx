import { avisoStockBajoCls } from "@/features/catalog/utils/lineLimits";

/** Aviso "¡Quedan solo {N}!" del detalle y de la fila del carrito. */
export function AvisoStockBajo({
  max,
  className = "",
}: {
  max: number;
  className?: string;
}) {
  return (
    <p
      className={`text-xs font-semibold border rounded-xl px-3 py-1.5 ${avisoStockBajoCls(max)} ${className}`}
    >
      ¡Quedan solo {max}!
    </p>
  );
}
