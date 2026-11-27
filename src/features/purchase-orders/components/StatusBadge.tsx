import { type EstadoOrden, ESTADO_CONFIG } from "@/features/purchase-orders/utils/purchase-orders";

// ��������� SHARED UI ��������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

export function EstadoBadge({ e }: { e: EstadoOrden }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ESTADO_CONFIG[e]}`}>
      {e}
    </span>
  );
}
