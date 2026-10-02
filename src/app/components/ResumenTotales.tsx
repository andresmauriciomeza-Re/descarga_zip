const MONO = "var(--font-texto)";

const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`;

/** Resumen de totales del pedido: subtotal con el recuento de
    productos, recogida gratuita en el local y total en grande.
    Reemplaza el JSX que estaba duplicado en el panel "Resumen" del
    carrito y en el modal de pago (checkout paso 1). */
export function ResumenTotales({
  cantidadProductos,
  subtotal,
  className,
}: {
  cantidadProductos: number;
  subtotal: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex justify-between text-muted-foreground">
        <span>
          Subtotal ({cantidadProductos} productos)
        </span>
        <span style={{ fontFamily: MONO }}>{fmt(subtotal)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Recogida en el local</span>
        <span>Gratis</span>
      </div>
      <div className="border-t border-border pt-2 flex justify-between items-center font-bold text-base text-primary">
        <span>Total</span>
        <span style={{ fontFamily: MONO }}>{fmt(subtotal)}</span>
      </div>
    </div>
  );
}
