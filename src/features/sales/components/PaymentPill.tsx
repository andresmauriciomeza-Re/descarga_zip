import { METODO_PAGO_ESTILO, type MetodoPago } from "@/features/sales/utils/sales";

/** Etiqueta del método de pago con su color. "Efectivo" es exclusivo de los
    pedidos que crea el administrador. Se exporta para que Devoluciones muestre
    el mismo color sin duplicar la tabla de métodos. */
export function PagoPill({ metodo }: { metodo?: string }) {
  const est = METODO_PAGO_ESTILO[metodo as Exclude<MetodoPago, "">];
  if (!est) {
    return (
      <span className="text-xs text-muted-foreground italic">—</span>
    );
  }
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${est.pill}`}
    >
      {metodo}
    </span>
  );
}
