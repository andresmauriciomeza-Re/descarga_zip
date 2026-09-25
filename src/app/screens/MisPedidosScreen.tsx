import { useState } from "react";
import {
  ChevronDown,
  Clock,
  CreditCard,
  MapPin,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Venta, VentaStatus } from "./VentasScreen";

const SERIF = "'DM Serif Display', serif";
const MONO = "'JetBrains Mono', monospace";

const fmtCOP = (n: number) => `$${n.toLocaleString("es-CO")}`;

const ESTADO: Record<
  VentaStatus,
  { label: string; color: string; mensaje: string }
> = {
  "por-verificar": {
    label: "Verificando pago",
    color: "bg-amber-100 text-amber-800",
    mensaje: "Estamos revisando tu comprobante de pago.",
  },
  venta: {
    label: "Confirmado",
    color: "bg-blue-100 text-blue-800",
    mensaje:
      "Tu pago fue confirmado. Pasa a recoger tu pedido a la hora indicada.",
  },
  completado: {
    label: "Entregado",
    color: "bg-emerald-100 text-emerald-800",
    mensaje: "Pedido entregado. ¡Gracias por elegir La Sirena!",
  },
  perdida: {
    label: "Devolución",
    color: "bg-orange-100 text-orange-800",
    mensaje: "Este pedido tiene una devolución registrada.",
  },
};

function Dato({
  Icon,
  titulo,
  valor,
}: {
  Icon: LucideIcon;
  titulo: string;
  valor: string;
}) {
  return (
    <div className="flex items-start gap-3 bg-muted/50 rounded-xl px-4 py-3">
      <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <div>
        <p className="text-xs text-muted-foreground font-medium">{titulo}</p>
        <p className="text-base font-semibold text-foreground">{valor}</p>
      </div>
    </div>
  );
}

interface Props {
  pedidos: Venta[];
  usuarioNombre: string;
  onVerMenu: () => void;
}

export function MisPedidosScreen({ pedidos, usuarioNombre, onVerMenu }: Props) {
  const [abierto, setAbierto] = useState<string | null>(null);

  const misPedidos = pedidos
    .filter((p) => p.usuario === usuarioNombre)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1
        className="text-3xl font-bold text-foreground"
        style={{ fontFamily: SERIF }}
      >
        Mis pedidos
      </h1>
      <p className="text-muted-foreground mt-1 mb-6">
        {misPedidos.length === 0
          ? "Aún no has hecho pedidos."
          : `Has hecho ${misPedidos.length} pedido${misPedidos.length !== 1 ? "s" : ""}.`}
      </p>

      {misPedidos.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-lg font-semibold text-foreground mb-4">
            Todavía no tienes pedidos
          </p>
          <button
            onClick={onVerMenu}
            className="px-6 py-3 min-h-[48px] bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
          >
            Ver el menú
          </button>
        </div>
      )}

      <div className="space-y-4">
        {misPedidos.map((p) => {
          const est = ESTADO[p.estado];
          const abierta = abierto === p.id;

          return (
            <div
              key={p.id}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              {/* Resumen */}
              <button
                onClick={() => setAbierto(abierta ? null : p.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-bold text-muted-foreground">
                      Pedido #{p.id}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${est.color}`}
                    >
                      {est.label}
                    </span>
                  </div>
                  <p className="text-base font-semibold text-foreground mt-1 truncate">
                    {p.productos}
                  </p>
                  <p className="text-sm text-muted-foreground">{p.fecha}</p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className="text-lg font-bold text-primary"
                    style={{ fontFamily: MONO }}
                  >
                    {fmtCOP(p.total)}
                  </p>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground ml-auto transition-transform ${abierta ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {/* Detalle completo */}
              {abierta && (
                <div className="border-t border-border px-5 py-5 space-y-5">
                  <p className="text-sm text-muted-foreground">{est.mensaje}</p>

                  {p.estado === "perdida" && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-start gap-3">
                      <RefreshCw className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-orange-900">
                          {p.devolucionResuelta
                            ? p.devolucionTipo === "producto"
                              ? "Devolución resuelta: canje por producto"
                              : "Devolución resuelta: reembolso en dinero"
                            : "Devolución en gestión"}
                        </p>
                        {p.devolucionNota && (
                          <p className="text-sm text-orange-800 mt-0.5">
                            {p.devolucionNota}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Productos */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Productos
                    </p>
                    {p.detalle && p.detalle.length > 0 ? (
                      <div className="space-y-3">
                        {p.detalle.map((d, i) => (
                          <div key={i} className="flex items-center gap-3">
                            {d.imagen ? (
                              <img
                                src={d.imagen}
                                alt={d.nombre}
                                className="w-14 h-14 rounded-xl object-cover bg-muted shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                <ShoppingBag className="w-5 h-5 text-muted-foreground/50" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-semibold text-foreground">
                                {d.nombre}
                              </p>
                              {d.extras && d.extras.length > 0 && (
                                <p className="text-sm text-muted-foreground">
                                  Extras: {d.extras.join(", ")}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                {d.cantidad} × {fmtCOP(d.precio)}
                              </p>
                            </div>
                            <p
                              className="text-base font-bold text-foreground shrink-0"
                              style={{ fontFamily: MONO }}
                            >
                              {fmtCOP(d.precio * d.cantidad)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-base text-foreground">{p.productos}</p>
                    )}
                  </div>

                  {/* Datos del pedido */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {p.horaRecogida && (
                      <Dato
                        Icon={Clock}
                        titulo="Hora de recogida"
                        valor={p.horaRecogida}
                      />
                    )}
                    {p.metodoPago && (
                      <Dato
                        Icon={CreditCard}
                        titulo="Método de pago"
                        valor={p.metodoPago}
                      />
                    )}
                    <Dato
                      Icon={MapPin}
                      titulo="Recoger en"
                      valor="La Sirena Pizza · Cra. 45 #104-30, Laureles"
                    />
                  </div>

                  {/* Comprobante */}
                  {p.comprobante && p.comprobante.startsWith("data:image") && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Comprobante de pago
                      </p>
                      <img
                        src={p.comprobante}
                        alt="Comprobante de pago"
                        className="w-full max-h-56 object-contain rounded-xl border border-border bg-muted"
                      />
                    </div>
                  )}

                  {/* Seguimiento */}
                  {p.historial && p.historial.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Seguimiento
                      </p>
                      <ol className="space-y-2">
                        {p.historial.map((h, i) => (
                          <li key={i} className="flex items-center gap-3 text-sm">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                            <span className="font-semibold text-foreground">
                              {ESTADO[h.estado].label}
                            </span>
                            <span className="text-muted-foreground">
                              · {h.hora}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-base font-semibold text-foreground">
                      Total
                    </span>
                    <span
                      className="text-xl font-bold text-primary"
                      style={{ fontFamily: MONO }}
                    >
                      {fmtCOP(p.total)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
