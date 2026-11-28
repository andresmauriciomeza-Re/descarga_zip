import { type EstadoNC, ESTADO_CONFIG, type Tipo } from "@/features/non-conforming-products/utils/non-conforming-products";

export function EstadoBadge({ e }: { e: EstadoNC }) {
  return (
    <span className={`text-base font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ESTADO_CONFIG[e]}`}>
      {e}
    </span>
  );
}

export function TipoBadge({ tipo }: { tipo: Tipo }) {
  const cfg: Record<Tipo, string> = {
    Producto: "bg-blue-100 text-blue-800",
    "Producto insumo":   "bg-amber-100 text-amber-800",
    Venta:    "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-base font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${cfg[tipo]}`}>
      {tipo}
    </span>
  );
}
