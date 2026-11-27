import type { EstadoGestion } from "@/features/purchase-orders/utils/purchase-orders";
import { ESTADO_CONFIG } from "@/features/purchases/utils/purchases";

/** Badge de estado, con el mismo estilo que el detalle de Orden de Compra. */
export function EstadoBadge({ e }: { e: EstadoGestion }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ESTADO_CONFIG[e]}`}>
      {e}
    </span>
  );
}
