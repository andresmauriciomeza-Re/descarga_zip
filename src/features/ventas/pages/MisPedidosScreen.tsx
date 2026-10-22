import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Clock,
  CreditCard,
  MapPin,
  ShoppingBag,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  X,
  CheckCircle,
  Eye,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import type { Venta, VentaStatus } from "./VentasScreen";
import { hora12 } from "@/shared/utils/hora";
import { hoyISO } from "@/shared/utils/fechas";
import { useSubirArchivo } from "@/shared/hooks/useSubirArchivo";
import { PasoPagoTransferencia, PAYMENT_INFO, useQrPago } from "@/shared/components/PasoPagoTransferencia";
import { VisorImagen } from "@/shared/components/VisorImagen";
import { cancelarVentaApi, obtenerMisVentas, subirComprobanteVenta } from "../services/ventasApi";

const SERIF = "var(--font-titulo)";
const MONO = "var(--font-texto)";

const fmtCOP = (n: number) => `$${n.toLocaleString("es-CO")}`;

/** Etiquetas y mensajes PARA EL CLIENTE de cada estado de la venta (la tabla
    de la sección 3 difiere de los nombres del panel admin). */
const ESTADO: Record<
  VentaStatus,
  { label: string; color: string; mensaje: string }
> = {
  "Por verificar": {
    label: "Por verificar",
    color: "bg-amber-100 text-amber-800",
    mensaje: "Estamos revisando tu comprobante de pago.",
  },
  // Punto C2: estado nuevo entre "pago verificado" y "listo para recoger":
  // la venta espera a que su orden de producción se complete en cocina.
  "Por entregar": {
    label: "Por entregar",
    color: "bg-blue-100 text-blue-800",
    mensaje: "Tu pago fue confirmado. Tu pedido está listo para recoger.",
  },
  Completado: {
    label: "Completado",
    color: "bg-emerald-100 text-emerald-800",
    mensaje: "Pedido entregado. ¡Gracias por elegir La Sirena!",
  },
  Devolucion: {
    label: "Devuelta",
    color: "bg-orange-100 text-orange-800",
    mensaje: "Este pedido tiene una devolución registrada.",
  },
  Anulado: {
    label: "Rechazado",
    color: "bg-red-100 text-red-700",
    mensaje: "El comprobante de este pedido fue rechazado.",
  },
  "En espera": {
    label: "En espera",
    color: "bg-violet-100 text-violet-800",
    mensaje: "Falta un valor por pagar para completar tu pedido.",
  },
};

/** Estado a mostrar para UN pedido concreto: el estado "Anulado" tapa dos
    flujos — el comprobante rechazado (Rechazado) y la anulación/cancelación,
    la única que trae `montoReembolso` porque devuelve dinero. */
const estadoCliente = (p: Venta): (typeof ESTADO)[Venta["estado"]] =>
  p.estado === "Anulado" && p.montoReembolso !== undefined
    ? {
        label: "Anulado",
        color: ESTADO.Anulado.color,
        mensaje: "Este pedido fue anulado por la pizzería.",
      }
    : ESTADO[p.estado];

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
  pedidos?: Venta[];
  usuarioNombre: string;
  onVerMenu: () => void;
}

export function MisPedidosScreen({ pedidos: _pedidos = [], usuarioNombre: _usuarioNombre, onVerMenu }: Props) {
  const [misPedidos, setMisPedidos] = useState<Venta[]>([]);
  const cargar = async () => {
    try { setMisPedidos(await obtenerMisVentas()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudieron cargar tus pedidos."); }
  };
  useEffect(() => { void cargar(); }, []);
  // Refresco automático cada 60 s: el backend avanza solo "Por entregar" →
  // "Completado" al llegar la hora de recogida, y este tick lo refleja sin F5.
  useEffect(() => {
    const id = setInterval(() => {
      void obtenerMisVentas().then(setMisPedidos).catch(() => {
        // Silencioso: refresco de fondo, no acción del usuario.
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Cancelación del cliente (primeros 10 minutos) ──
  // El backend calcula, al cargar la lista, cuántos segundos quedaban de la
  // ventana. Aquí se descuenta lo transcurrido desde esa carga para ocultar el
  // botón solo; el límite real lo aplica siempre el servidor.
  const [ahora, setAhora] = useState(() => Date.now());
  const cargadoEnRef = useRef(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    cargadoEnRef.current = Date.now();
    setAhora(Date.now());
  }, [misPedidos]);

  /** Segundos que aún quedan de la ventana de cancelación de un pedido. */
  const segundosCancelacion = (p: Venta) =>
    Math.max(0, (p.segundosRestantesAnulacion ?? 0) - Math.floor((ahora - cargadoEnRef.current) / 1000));

  /** ¿Puede el cliente cancelar este pedido? Sólo estados cancelables y
      mientras corran los primeros 10 minutos desde la creación. */
  const puedeCancelar = (p: Venta) =>
    (p.estado === "Por verificar" || p.estado === "En espera" || p.estado === "Por entregar") &&
    segundosCancelacion(p) > 0;

  /** Pedido que se está cancelando (null = sin modal). */
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const cancelandoEnRef = useRef(false);

  const cancelarPedido = async (id: string) => {
    if (cancelandoEnRef.current) return;
    cancelandoEnRef.current = true;
    try {
      await cancelarVentaApi(id);
      setCancelandoId(null);
      toast.success(`Pedido #${id} cancelado. Te devolvemos el 80 % del valor.`);
      await cargar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cancelar el pedido.");
    } finally {
      cancelandoEnRef.current = false;
    }
  };
  const [abierto, setAbierto] = useState<string | null>(null);
  /** Pestaña activa: todos, los de hoy o los que esperan el saldo faltante. */
  const [pestana, setPestana] = useState<"todos" | "recientes" | "pendientes">("todos");

  // ── Modal "Completar pago" (falta de dinero) ──
  const [completarId, setCompletarId] = useState<string | null>(null);
  const [paso, setPaso] = useState<1 | 2>(1);
  const [metodo, setMetodo] = useState<"Nequi" | "Bancolombia" | "">("");
  const [compComprobante, setCompComprobante] = useState("");
  const { subir, subiendo } = useSubirArchivo();
  const compFileRef = useRef<HTMLInputElement | null>(null);
  /** Visor del comprobante de devolución (rechazo por dinero faltante). */
  const [visorSrc, setVisorSrc] = useState<string | null>(null);

  const pedidosOrdenados = [...misPedidos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const pedidosHoy = pedidosOrdenados.filter((p) => p.fecha === hoyISO());
  // Con saldo faltante ("En espera"): los de la pestaña "Pedidos pendientes".
  const pendientes = pedidosOrdenados.filter(
    (p) => p.estado === "En espera" && (p.montoFaltante ?? 0) > 0,
  );
  const lista =
    pestana === "pendientes" ? pendientes : pestana === "recientes" ? pedidosHoy : pedidosOrdenados;

  // Pedido en espera del que se está completando el pago (para montos).
  const pedidoCompletar = completarId ? pedidosOrdenados.find((p) => p.id === completarId) ?? null : null;

  // QR del método elegido en el paso 2 (mismo contenido que el checkout).
  const qrDataUrl = useQrPago(
    paso === 2 && metodo && pedidoCompletar ? metodo : "",
    pedidoCompletar?.montoFaltante ?? 0,
  );

  // Si al entrar hay pedidos con saldo faltante, la pantalla abre directamente
  // en la pestaña "Pedidos pendientes" (solo al abrir: el refresco automático
  // no debe mover al usuario de la pestaña en la que esté).
  const pestanaInicialRef = useRef(false);
  useEffect(() => {
    if (pestanaInicialRef.current || misPedidos.length === 0) return;
    pestanaInicialRef.current = true;
    if (misPedidos.some((p) => p.estado === "En espera" && (p.montoFaltante ?? 0) > 0)) {
      setPestana("pendientes");
    }
  }, [misPedidos]);

  // Si se resuelve el último pendiente estando en esa pestaña, volver a
  // "todos" (la pestaña deja de existir).
  useEffect(() => {
    if (pestana === "pendientes" && pendientes.length === 0) setPestana("todos");
  }, [pestana, pendientes.length]);

  // ── Cambios de estado en tiempo real (3.7) ──
  // Compara el estado anterior con el actual de cada pedido y avisa con un
  // toast cuando cambia (aprobado, faltante solicitado, faltante resuelto,
  // rechazado). Al montar, avisa de los pedidos que ya están "En espera".
  const prevEstadosRef = useRef<Record<string, VentaStatus>>({});
  const primeraCargaRef = useRef(true);
  useEffect(() => {
    if (primeraCargaRef.current) {
      primeraCargaRef.current = false;
      for (const p of misPedidos) prevEstadosRef.current[p.id] = p.estado;
      // Aviso de pedidos que ya esperan dinero faltante.
      for (const p of misPedidos) {
        if (p.estado === "En espera") {
          toast.info(`El pedido ${p.id} espera un faltante de ${fmtCOP(p.montoFaltante ?? 0)} para completar tu pago.`);
        }
      }
      return;
    }
    for (const p of misPedidos) {
      const prev = prevEstadosRef.current[p.id];
      if (prev !== undefined && prev !== p.estado) {
        if (p.estado === "Por entregar") {
          toast.success(`Tu pedido ${p.id} está listo para recoger.`);
        } else if (p.estado === "En espera") {
          toast.info(`El pedido ${p.id}: falta ${fmtCOP(p.montoFaltante ?? 0)} para completar tu pago.`);
        } else if (p.estado === "Anulado") {
          toast.error(`El pedido ${p.id} fue rechazado.`);
        } else if (p.estado === "Completado") {
          toast.success(`Tu pedido ${p.id} fue entregado. ¡Gracias!`);
        }
      }
      prevEstadosRef.current[p.id] = p.estado;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [misPedidos]);

  // Limpieza del modal al abrir/cerrar.
  const abrirCompletar = (id: string) => {
    setCompletarId(id);
    setPaso(1);
    setMetodo("");
    setCompComprobante("");
  };
  const cerrarCompletar = () => {
    setCompletarId(null);
    setPaso(1);
    setMetodo("");
    setCompComprobante("");
  };

  const enviarFaltante = () => {
    if (!completarId || !compComprobante) return;
    void subirComprobanteVenta(completarId, { tipo: metodo, comprobante: compComprobante })
      .then(() => { toast.success("Recibimos tu comprobante, lo estamos verificando"); cerrarCompletar(); void cargar(); })
      .catch((error) => toast.error(error instanceof Error ? error.message : "No se pudo enviar el comprobante."));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1
        className="text-3xl font-bold text-foreground"
        style={{ fontFamily: SERIF }}
      >
        Mis pedidos
      </h1>

      {/* Control segmentado: todos vs. pedidos recientes (de hoy). */}
      <div
        role="tablist"
        aria-label="Filtrar mis pedidos"
        className="inline-flex items-center gap-1 mt-4 mb-4 p-1 bg-muted rounded-xl"
      >
        <button
          role="tab"
          aria-selected={pestana === "todos"}
          onClick={() => setPestana("todos")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
            pestana === "todos"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Todos mis pedidos ({misPedidos.length})
        </button>
        <button
          role="tab"
          aria-selected={pestana === "recientes"}
          onClick={() => setPestana("recientes")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
            pestana === "recientes"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Pedidos recientes ({pedidosHoy.length})
        </button>
        {pendientes.length > 0 && (
          <button
            role="tab"
            aria-selected={pestana === "pendientes"}
            onClick={() => setPestana("pendientes")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              pestana === "pendientes"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pedidos pendientes ({pendientes.length})
          </button>
        )}
      </div>

      <p className="text-muted-foreground mt-1 mb-6">
        {pestana === "pendientes"
          ? `Tienes ${lista.length} pedido${lista.length !== 1 ? "s" : ""} con saldo pendiente.`
          : lista.length === 0
            ? "Aún no has hecho pedidos."
            : `Has hecho ${lista.length} pedido${lista.length !== 1 ? "s" : ""}${pestana === "recientes" ? " hoy" : ""}.`}
      </p>

      {lista.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-lg font-semibold text-foreground mb-4">
            {pestana === "pendientes"
              ? "No tienes pedidos con saldo pendiente"
              : pestana === "recientes"
                ? "Hoy no has hecho pedidos"
                : "Todavía no tienes pedidos"}
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
        {lista.map((p) => {
          const est = estadoCliente(p);
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

              {/* Alerta de falta de pago: visible sin expandir la tarjeta. */}
              {p.estado === "En espera" && (
                <div className="px-5 pb-4 -mt-1">
                  <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-2 text-violet-900">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold">Completa el saldo de tu pedido</p>
                        <p>Total: {fmtCOP(p.total)} · Recibido: {fmtCOP(p.montoPagado ?? 0)} · Pendiente: {fmtCOP(p.montoFaltante ?? 0)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => abrirCompletar(p.id)}
                      className="px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 active:scale-95 transition-all cursor-pointer"
                    >
                      Enviar dinero faltante
                    </button>
                  </div>
                </div>
              )}

              {/* Pendientes: faltante destacado. El botón de arriba
                  ("Enviar dinero faltante") abre el modal "Completar pago",
                  donde está el QR para enviar el saldo y subir el comprobante:
                  mismo flujo, sin duplicar. */}
              {pestana === "pendientes" && p.estado === "En espera" && (
                <div className="px-5 pb-4 -mt-1">
                  <p className="text-sm font-semibold text-violet-900">
                    Monto que falta:{" "}
                    <span
                      className="text-xl font-bold text-violet-800"
                      style={{ fontFamily: MONO }}
                    >
                      {fmtCOP(p.montoFaltante ?? 0)}
                    </span>
                  </p>
                </div>
              )}

              {/* Detalle completo */}
              {abierta && (
                <div className="border-t border-border px-5 py-5 space-y-5">
                  <p className="text-sm text-muted-foreground">{est.mensaje}</p>

                  {/* Cancelar pedido: sólo dentro de los primeros 10 minutos. */}
                  {puedeCancelar(p) && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-2 text-red-900">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-semibold">¿Te arrepentiste del pedido?</p>
                          <p>
                            Puedes cancelarlo dentro de los primeros 10 minutos. Te
                            devolvemos el 80 % del valor ({fmtCOP(Math.round(p.total * 0.8))}).
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setCancelandoId(p.id)}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
                      >
                        Cancelar pedido ({segundosCancelacion(p)} s)
                      </button>
                    </div>
                  )}

                  {/* Rechazado / anulado: motivo claro, valor a devolver y
                      comprobante de devolución si lo hay. */}
                  {p.estado === "Anulado" && (() => {
                    // `montoReembolso` sólo lo trae una anulación/cancelación
                    // (con su reembolso): un rechazo de verificación no lo tiene.
                    const esAnulacion = p.montoReembolso !== undefined;
                    const mensaje = p.motivoRechazo === "Dinero faltante"
                      ? "Rechazado: el valor recibido no cubría el total y el dinero fue devuelto."
                      : p.motivoRechazo === "Comprobante falso"
                        ? "Rechazado: el comprobante de pago no fue válido."
                        : p.motivoRechazo
                          ? esAnulacion
                            ? `Pedido anulado por la pizzería: ${p.motivoRechazo}.`
                            : `Rechazado por la pizzería: ${p.motivoRechazo}.`
                          // Sin motivo de verificación = la venta fue anulada
                          // desde el panel (anular deja Anulado).
                          : "Rechazado: el pedido fue anulado por el administrador.";
                    const comp = p.comprobanteDevolucion;
                    return (
                      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-2">
                        <div className="flex items-start gap-2 text-red-900">
                          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                          <p className="text-sm">{mensaje}</p>
                        </div>
                        {esAnulacion && (
                          <p className="text-sm font-semibold text-red-800">
                            Valor a devolver: {fmtCOP(p.montoReembolso ?? 0)}
                          </p>
                        )}
                        {comp && (
                          comp.endsWith(".pdf") ? (
                            <a
                              href={comp}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:underline"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver comprobante de devolución (PDF)
                            </a>
                          ) : (
                            <button
                              onClick={() => setVisorSrc(comp)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:underline cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver comprobante de devolución
                            </button>
                          )
                        )}
                      </div>
                    );
                  })()}

                  {p.estado === "Devolucion" && (
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
                        valor={hora12(p.horaRecogida)}
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
                  {p.comprobante && (p.comprobante.startsWith("data:image") || p.comprobante.startsWith("http://") || p.comprobante.startsWith("https://")) && (
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

      {/* ── Modal: Completar pago (falta de dinero) ── */}
      {completarId && pedidoCompletar && (() => {
        const total = pedidoCompletar.total;
        const faltante = pedidoCompletar.montoFaltante ?? 0;
        const pagado = total - faltante;
        return (
          <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-card rounded-2xl w-full max-w-3xl shadow-2xl border border-border my-4">
                {/* Header: volver + cerrar */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <button
                    onClick={() => (paso === 2 ? setPaso(1) : cerrarCompletar())}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground text-sm font-semibold"
                  >
                    <ArrowLeft className="w-4 h-4" /> Volver
                  </button>
                  <p className="font-bold text-foreground" style={{ fontFamily: SERIF }}>
                    Completar pago
                  </p>
                  <button
                    onClick={cerrarCompletar}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                    aria-label="Cerrar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-5 py-5 space-y-4">
                  {/* Explicación + montos */}
                  <p className="text-sm text-muted-foreground">
                    Revisamos tu comprobante y el valor recibido no cubre el total del pedido.
                    Para continuar, envía el valor faltante.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/50 rounded-xl px-3 py-2 border border-border">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total del pedido</p>
                      <p className="text-base font-bold text-foreground" style={{ fontFamily: MONO }}>{fmtCOP(total)}</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl px-3 py-2 border border-border">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Pagado</p>
                      <p className="text-base font-bold text-foreground" style={{ fontFamily: MONO }}>{fmtCOP(pagado)}</p>
                    </div>
                    <div className="bg-violet-50 rounded-xl px-3 py-2 border border-violet-200">
                      <p className="text-[11px] text-violet-700 uppercase tracking-wide">Faltante</p>
                      <p className="text-base font-bold text-violet-800" style={{ fontFamily: MONO }}>{fmtCOP(faltante)}</p>
                    </div>
                  </div>

                  {paso === 1 ? (
                    /* Paso 1: elegir método de pago (igual que el checkout). */
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Elige el método para enviar el faltante
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {(["Nequi", "Bancolombia"] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => setMetodo(m)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold cursor-pointer transition-colors ${
                              metodo === m
                                ? "border-primary bg-primary/5 text-foreground"
                                : "border-border text-foreground hover:bg-muted/40"
                            }`}
                          >
                            <span className="text-xl">{PAYMENT_INFO[m].icon}</span> {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Paso 2: datos de pago + subir comprobante (componente compartido). */
                    <PasoPagoTransferencia
                      payment={metodo}
                      subtotal={faltante}
                      qrDataUrl={qrDataUrl}
                      comprobante={compComprobante}
                      onQuitarComprobante={() => {
                        setCompComprobante("");
                        if (compFileRef.current) compFileRef.current.value = "";
                      }}
                      subiendo={subiendo}
                      fileRef={compFileRef}
                      onFileChange={(file) => {
                        void subir(file, "comprobantes").then((url) => {
                          if (url) setCompComprobante(url);
                        });
                      }}
                    />
                  )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-5 py-4 border-t border-border">
                  {paso === 2 ? (
                    <>
                      <button
                        onClick={() => setPaso(1)}
                        className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                      >
                        Atrás
                      </button>
                      <button
                        onClick={enviarFaltante}
                        disabled={!compComprobante || subiendo}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors active:scale-95 ${
                          compComprobante && !subiendo
                            ? "bg-primary hover:bg-red-700 cursor-pointer"
                            : "bg-primary/50 opacity-50 cursor-not-allowed"
                        }`}
                      >
                        Enviar comprobante
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setPaso(2)}
                      disabled={!metodo}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors active:scale-95 ${
                        metodo ? "bg-primary hover:bg-red-700 cursor-pointer" : "bg-primary/50 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      Continuar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal: confirmar cancelación del pedido (10 minutos) ── */}
      {cancelandoId && (() => {
        const pedido = misPedidos.find((p) => p.id === cancelandoId);
        if (!pedido) return null;
        return (
          <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <p className="font-bold text-foreground" style={{ fontFamily: SERIF }}>
                    Cancelar pedido #{pedido.id}
                  </p>
                  <button
                    onClick={() => setCancelandoId(null)}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                    aria-label="Cerrar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-5 py-5 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    El pedido quedará <span className="font-semibold">cancelado</span> y te
                    devolvemos el <span className="font-semibold">80 %</span> del valor pagado.
                    Esta acción no se puede deshacer.
                  </p>
                  <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Total del pedido</span>
                      <span className="font-semibold" style={{ fontFamily: MONO }}>{fmtCOP(pedido.total)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm border-t border-border pt-1.5">
                      <span className="font-semibold text-foreground">Valor a devolver (80 %)</span>
                      <span className="font-bold text-red-600" style={{ fontFamily: MONO }}>
                        {fmtCOP(Math.round(pedido.total * 0.8))}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 px-5 pb-5">
                  <button
                    onClick={() => setCancelandoId(null)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    onClick={() => void cancelarPedido(pedido.id)}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-95 transition-colors cursor-pointer"
                  >
                    Sí, cancelar pedido
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Visor del comprobante de devolución. */}
      <VisorImagen
        src={visorSrc}
        alt="Comprobante de devolución"
        onClose={() => setVisorSrc(null)}
      />
    </div>
  );
}
