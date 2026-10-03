const MONO = "var(--font-texto)";

const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`;

/** Resumen de totales del pedido: recogida gratuita en el local y total en
    grande. Reemplaza el JSX que estaba duplicado en el panel "Resumen" del
    carrito, en el modal de pago (checkout paso 1) y en la confirmación del
    pedido. Sin fila de Subtotal: el recuadro muestra solo la recogida, la
    divisoria y el total. */
export function ResumenTotales({
  subtotal,
  className,
}: {
  subtotal: number;
  className?: string;
}) {
  return (
    <div className={className}>
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
