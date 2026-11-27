import { type Venta, estadoCliente, PASOS_PEDIDO, type EstadoClienteVenta, ESTADO } from "@/features/sales/utils/sales";

export function BarraProgresoPedido({ pedido }: { pedido: Venta }) {
  const estado = estadoCliente(pedido);
  const estadoProgreso =
    estado === "En espera" || estado === "Por verificar" ? "Pendiente" : estado;
  const indiceActual = PASOS_PEDIDO.indexOf(estadoProgreso as EstadoClienteVenta);
  if (indiceActual < 0) return null;

  return (
    <div className="px-5 pb-4" aria-label={`Progreso: ${ESTADO[estadoProgreso]?.label ?? estadoProgreso}`}>
      <ol className="flex w-full">
        {PASOS_PEDIDO.map((paso, indice) => {
          const anterior = indice < indiceActual;
          const actual = indice === indiceActual;
          return (
            <li key={paso} className="relative flex-1 text-center">
              {indice > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-0 right-1/2 top-3 h-0.5 ${
                    indice <= indiceActual ? "bg-emerald-500" : "bg-border"
                  }`}
                />
              )}
              {indice < PASOS_PEDIDO.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-1/2 right-0 top-3 h-0.5 ${
                    indice < indiceActual ? "bg-emerald-500" : "bg-border"
                  }`}
                />
              )}
              <span
                className={`relative z-10 mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  actual
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/20"
                    : anterior
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground"
                }`}
                aria-current={actual ? "step" : undefined}
              >
                {anterior ? "✓" : indice + 1}
              </span>
              <span
                className={`mt-1 hidden text-[10px] leading-tight sm:block ${
                  actual ? "font-bold text-foreground" : "text-muted-foreground"
                }`}
              >
                {ESTADO[paso].label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-1 text-center text-xs font-semibold text-foreground sm:hidden">
        {ESTADO[estadoProgreso]?.label ?? estadoProgreso}
      </p>
    </div>
  );
}
