import type { CartItem } from "@/types/cart";
import type { Screen } from "@/shared/utils/screen";
import { type LineaLimiteRef, type LimiteLinea, mensajeMaximoDe } from "@/features/catalog/utils/lineLimits";
import { useEffect, useRef, useState } from "react";
import { useValidacionFormulario } from "@/shared/hooks/useFormValidation";
import { toast } from "sonner";
import { obtenerToken } from "@/shared/services/authService";
import { subirArchivo } from "@/shared/services/uploadService";
import { es401GenericoCheckout } from "@/shared/services/api";
import type { ApiErrorConEstado } from "@/types/api";
import { estadoDeProducto, productoDisponible } from "@/shared/utils/catalog";
import { HORA_APERTURA, HORA_CIERRE, HORA_ULTIMA_RECOGIDA, MINUTOS_RECOGIDA, formatearHora, minutosDeHora } from "@/shared/utils/time";
import { filtrarNombre, normalizarNombre as normalizarNombrePersona, MarcaObligatorio, soloDigitos, validarDocumento, validarNombre, validarTelefonoOpcional } from "@/shared/components/FormInputs";
import { BloqueQrPago, CargaComprobanteCheckout, PAYMENT_INFO, useQrPago } from "@/shared/components/TransferPaymentStep";
import { DIRECCION_LOCAL, aperturaRecogidaTexto, cierreRecogidaTexto } from "@/shared/utils/storeInfo";
import { SERIF, MONO } from "@/shared/utils/fonts";
import { ArrowLeft, ArrowRight, CheckCircle, CreditCard, MapPin, Minus, Phone, Plus, RefreshCw, ShoppingBag, Trash2, X } from "lucide-react";
import { fmt } from "@/shared/utils/currency";
import { ResumenTotales } from "@/features/cart/components/TotalsSummary";
import { PrimaryBtn } from "@/shared/components/buttons/PrimaryButton";
import { GhostBtn } from "@/shared/components/buttons/GhostButton";
import { getImageUrl, onErrorImagen } from "@/shared/utils/getImageUrl";
import { EstadoMenuBadge } from "@/shared/components/MenuStatusBadge";
import { CantidadInput } from "@/features/catalog/components/QuantityInput";
import { AvisoStockBajo } from "@/features/catalog/components/LowStockNotice";
import { AnimatePresence, motion } from "motion/react";
import { type PedidoResumen } from "@/types/cart";
import { WHATSAPP_LOCAL_URL, WHATSAPP_LOCAL_VISIBLE, ultimaRecogidaTexto } from "@/shared/utils/storeInfo";
import { WhatsAppIcon } from "@/features/cart/components/WhatsAppIcon";

// Los datos de las cuentas de pago (PAYMENT_INFO) viven ahora en el componente
// compartido PasoPagoTransferencia, usado por el checkout y por el modal
// "Completar pago" de Mis pedidos.

/** El horario de atención, el parser de horas y el formato "6:30 p. m." viven
    en `utils/hora.ts` para compartirlos con las pantallas que muestran la hora
    de recogida (Ventas, Mis Pedidos, Producción). La recogida es siempre hoy y
    el último horario ofrecido es 9:45 p. m. */

export function CartScreen({
  cart,
  navigate,
  updateQty,
  limiteDe,
  remove,
  clear,
  onOrder,
  isLoggedIn,
  clienteSesion,
  onRequireCheckoutLogin,
  onCheckoutUnauthorized,
  abrirCheckoutTrasLogin,
  onCheckoutAbierto,
  validandoStockCheckout,
  onVerificarStock,
  confirmationData,
  onClearConfirmation,
}: {
  cart: CartItem[];
  navigate: (s: Screen) => void;
  updateQty: (id: string, q: number) => void;
  /** Bloque 5 — Tope de cada línea con TODO el carrito; lo calcula App. */
  limiteDe: (linea: LineaLimiteRef) => LimiteLinea;
  remove: (id: string) => void;
  clear: () => void;
  onOrder: (
    metodoPago: string,
    comprobante: string,
    items: CartItem[],
    horaRecogida: string,
    clienteNombre?: string,
    clienteDocumento?: string,
    clienteTelefono?: string,
  ) => Promise<{ id: string; total: number }>;
  isLoggedIn: boolean;
  /** Nombre del usuario en sesión; se muestra en el resumen y la confirmación. */
  clienteSesion?: string;
  onRequireCheckoutLogin: () => void;
  onCheckoutUnauthorized: () => void;
  abrirCheckoutTrasLogin: boolean;
  onCheckoutAbierto: () => void;
  validandoStockCheckout: boolean;
  onVerificarStock: () => void;
  /** Resumen del pedido ya registrado que se viene a mostrar (llega
      del login, cuando un invitado inicia sesión con el pedido a
      medio hacer). */
  confirmationData?: PedidoResumen;
  /** Limpia `orderConfirmation` en App al salir de la confirmación. */
  onClearConfirmation?: () => void;
}) {
  const [payment, setPayment] = useState("Nequi");
  const [checkoutStep, setCheckoutStep] = useState<0 | 1 | 3>(0);
  const [comprobante, setComprobante] = useState<{ url: string; nombre: string } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [horaRecogida, setHoraRecogida] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestDocument, setGuestDocument] = useState("");
  /** Teléfono del cliente: opcional, pero se guarda con el pedido para que el
      local pueda avisarle algo antes de la recogida. */
  const [guestPhone, setGuestPhone] = useState("");
  /** Marca el campo como tocado para mostrar el error mientras se escribe
      (validación en tiempo real) sin gritarle al cliente desde el primer
      carácter. */
  const [tocadoDoc, setTocadoDoc] = useState(false);
  const [tocadoNombre, setTocadoNombre] = useState(false);
  const [tocadoTel, setTocadoTel] = useState(false);
  /** true apenas se intenta avanzar con el formulario inválido: así aparecen
      todos los errores juntos aunque el campo no se haya tocado. */
  const [intentoDatos, setIntentoDatos] = useState(false);
  // Trampa de Tab, foco al primer inválido y aria (lógica compartida). El
  // teléfono es opcional: entra al orden solo para el foco, sin trampa.
  const validacionDatos = useValidacionFormulario([
    "documento", "nombre", "telefono",
  ]);
  const [loading, setLoading] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState(
    Boolean(confirmationData),
  );
  // Resumen del pedido que se acaba de registrar (id, productos,
  // total, cliente y hora): alimenta la pantalla de confirmación.
  // En el flujo invitado→login arranca desde `confirmationData`.
  const [pedidoResumen, setPedidoResumen] = useState<PedidoResumen | null>(
    confirmationData ?? null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  /** Barrera anti doble envío: el `disabled` del botón no alcanza si llegan
      dos clics en el mismo tick. */
  const enviandoRef = useRef(false);
  const validacionPago = useValidacionFormulario(["comprobante", "hora-recogida"]);

  const cambiarMetodoPago = (metodo: string) => {
    setPayment(metodo);
    if (comprobante) {
      setComprobante(null);
      toast.warning("Cambiaste el método de pago. Quitamos el comprobante anterior. Sube el del nuevo método.");
    }
  };

  const cargarComprobanteCheckout = async (file: File) => {
    if (subiendo || enviandoRef.current) return;
    if (!isLoggedIn) {
      onRequireCheckoutLogin();
      return;
    }
    if (!obtenerToken()) {
      onCheckoutUnauthorized();
      return;
    }
    setSubiendo(true);
    try {
      const url = await subirArchivo(file, "comprobantes", { checkoutAuth: true });
      if (url) setComprobante({ url, nombre: file.name });
    } catch (error) {
      if (es401GenericoCheckout(error)) {
        onCheckoutUnauthorized();
      } else if ((error as ApiErrorConEstado).status !== 401) {
        toast.error(
          error instanceof Error ? error.message : "No se pudo subir el archivo.",
        );
      }
    } finally {
      setSubiendo(false);
    }
  };

  const cartTotal = (item: CartItem) =>
    (item.sizePrice + item.extrasPrice) * item.quantity;
  const subtotal = cart.reduce((s, i) => s + cartTotal(i), 0);
  // Un producto del carrito puede pasar a "No disponible" al recargar el
  // catálogo (el efecto de App refresca `item.product`). La línea NO se borra:
  // se marca, no se puede aumentar y el pago queda bloqueado hasta que el
  // cliente la quite o la deje en 0.
  const itemsNoDisponibles = cart.filter((i) => !productoDisponible(i.product));
  // Bloque 5 (punto 7): líneas por encima de su máximo —p. ej. un carrito
  // guardado de antes con menos stock o insumos—. Se marcan en rojo con su
  // mensaje y el pago queda deshabilitado hasta que el cliente las baje; el
  // carrito NUNCA se corrige en silencio.
  const lineasExcedidas = cart.filter((i) => {
    const { max } = limiteDe(i);
    return max !== undefined && i.quantity > max;
  });
  useEffect(() => {
    if (!abrirCheckoutTrasLogin || !isLoggedIn || !obtenerToken()) return;
    onCheckoutAbierto();
    if (itemsNoDisponibles.length || lineasExcedidas.length) {
      toast.warning("Algunos productos se agotaron o ya no tienen stock suficiente. Revisa tu carrito.");
    } else if (cart.length) {
      setCheckoutStep(1);
    }
  }, [abrirCheckoutTrasLogin, isLoggedIn, cart.length, itemsNoDisponibles.length, lineasExcedidas.length, onCheckoutAbierto]);
  // Quién está haciendo el pedido. El nombre sí se guardaba en la venta, pero
  // el checkout no lo mostraba en ningún paso ni en la confirmación, así que el
  // cliente no tenía forma de confirmar a nombre de quién estaba comprando.
  const nombreCliente = isLoggedIn
    ? clienteSesion?.trim() || ""
    : guestName.trim();

  // ── Validación de la hora de recogida ──
  // Se puede elegir cualquier minuto dentro del horario de atención
  // (4:00 PM – 10:00 PM), no solo horas exactas.
  const horaFueraDeRango = (valor: string) => {
    const m = minutosDeHora(valor);
    return m !== null && (m < HORA_APERTURA || m > HORA_CIERRE);
  };
  const horaYaPaso = (valor: string) => {
    const m = minutosDeHora(valor);
    if (m === null) return false;
    const partes = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date());
    const reloj = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
    const ahora = Number(reloj.hour) * 60 + Number(reloj.minute);
    return m <= ahora;
  };

  // ── Horarios que ofrece el selector de recogida ──
  // La recogida es siempre hoy, así que solo se listan los horarios futuros
  // dentro del horario de atención (4:00 p. m. – 9:45 p. m.), en intervalos
  // de 15 minutos. El input nativo desapareció a propósito: mostraba "a. m."
  // y no se le podía ocultar.
  const ahoraPartes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const ahoraReloj = Object.fromEntries(ahoraPartes.map((parte) => [parte.type, parte.value]));
  const ahoraMinutos = Number(ahoraReloj.hour) * 60 + Number(ahoraReloj.minute);
  const minutosDisponiblesDe = (hora: number) =>
    MINUTOS_RECOGIDA.filter((m) => hora * 60 + m > ahoraMinutos);
  const horasDisponibles: number[] = [];
  for (
    let h = Math.floor(HORA_APERTURA / 60);
    h <= Math.floor(HORA_ULTIMA_RECOGIDA / 60);
    h++
  ) {
    if (minutosDisponiblesDe(h).length > 0) horasDisponibles.push(h);
  }
  /** true cuando ya cerró el día de hoy: no queda ningún horario que ofrecer. */
  const sinHorariosHoy = horasDisponibles.length === 0;
  const [horaSel, minutoSel] = horaRecogida
    ? [
      parseInt(horaRecogida.split(":")[0], 10),
      parseInt(horaRecogida.split(":")[1] ?? "0", 10),
    ]
    : [null, null];
  const seleccionValida =
    horaSel !== null &&
    minutoSel !== null &&
    horasDisponibles.includes(horaSel) &&
    minutosDisponiblesDe(horaSel).includes(minutoSel);
  // Si el horario elegido quedó atrás (pasó el tiempo mientras el cliente
  // revisaba el resumen), la selección se limpia y vuelve a pedirse.
  useEffect(() => {
    if (horaRecogida && !seleccionValida) setHoraRecogida("");
  }, [horaRecogida, seleccionValida]);

  // ── Validación del formulario "Datos para enviar tu pedido" ──
  // Se recalcula en cada render, así que el mensaje cambia mientras se escribe;
  // solo se pinta si el campo ya se tocó o si se intentó avanzar.
  const errDocumento = validarDocumento(guestDocument, "CC");
  const errNombre = validarNombre(guestName);
  const errTelefono = validarTelefonoOpcional(guestPhone);
  // El hook suma sus propios campos "visibles" (trampa de Tab / envío) a los
  // flags `tocado*` y `intentoDatos` que ya usaba este formulario.
  const verErrDoc =
    tocadoDoc || intentoDatos || validacionDatos.estaVisible("documento")
      ? errDocumento
      : null;
  const verErrNom =
    tocadoNombre || intentoDatos || validacionDatos.estaVisible("nombre")
      ? errNombre
      : null;
  const verErrTel =
    tocadoTel || intentoDatos || validacionDatos.estaVisible("telefono")
      ? errTelefono
      : null;
  const datosValidos = !errDocumento && !errNombre && !errTelefono;

  // QR de pago de la cuenta elegida (Nequi o Bancolombia). Se genera en el
  // cliente para que el recuadro funcione sin depender de ningún servicio
  // externo; si falla, el recuadro muestra el mensaje de reserva.
  const qrDataUrl = useQrPago(payment, subtotal);

  const validarHoraRecogida = () => {
    if (sinHorariosHoy) return "Ya no hay horarios disponibles para hoy.";
    if (!horaRecogida) return "Selecciona la hora de recogida.";
    if (minutosDeHora(horaRecogida) === null || horaFueraDeRango(horaRecogida)) {
      return `La hora debe estar entre ${aperturaRecogidaTexto} y ${cierreRecogidaTexto}.`;
    }
    if (horaYaPaso(horaRecogida)) return "Esta hora no está disponible porque ya pasó.";
  };

  const errorComprobante = subiendo
    ? "Espera a que termine de subir el comprobante."
    : !comprobante ? "Sube el comprobante de pago." : undefined;
  const errorComprobanteVisible = validacionPago.estaVisible("comprobante") ? errorComprobante : undefined;
  const errorHoraVisible = validacionPago.estaVisible("hora-recogida") ? validarHoraRecogida() : undefined;

  /** Último paso: registra la venta con los datos del formulario (invitado)
      o con los de la sesión. Los datos YA se pidieron en el paso 3, así que
      aquí no se vuelve a interrumpir el flujo. */
  const handleConfirm = async () => {
    // Ya hay un pedido en curso: no se envía otro.
    if (enviandoRef.current) return;
    if (!isLoggedIn) {
      onRequireCheckoutLogin();
      return;
    }
    if (!obtenerToken()) {
      onCheckoutUnauthorized();
      return;
    }
    const errorHora = validarHoraRecogida();
    if (errorComprobante || errorHora) {
      validacionPago.enfocarPrimero({
        comprobante: errorComprobante,
        "hora-recogida": errorHora,
      });
      return;
    }
    if (!isLoggedIn && !datosValidos) {
      // Nunca debería pasar (el paso 3 ya validó), pero el pedido no se
      // registra a medias si el formulario quedó en un estado inválido.
      setIntentoDatos(true);
      setCheckoutStep(3);
      toast.error("Revisa tus datos para enviar el pedido");
      return;
    }
    setLoading(true);
    enviandoRef.current = true;
    try {
      const creada = await onOrder(
        payment,
        comprobante.url,
        [...cart],
        horaRecogida,
        nombreCliente || undefined,
        guestDocument.trim() || undefined,
        guestPhone.trim() || undefined,
      );
      // Resumen del pedido ANTES de vaciar el carrito: es lo que
      // muestra la pantalla de confirmación.
      setPedidoResumen({
        id: creada.id,
        items: [...cart],
        total: creada.total,
        nombre: nombreCliente,
        documento: guestDocument.trim() || undefined,
        telefono: guestPhone.trim() || undefined,
        hora: formatearHora(horaRecogida),
      });
      clear();
      setLoading(false);
      setCheckoutStep(0);
      setPedidoConfirmado(true);
    } catch (error) {
      if (es401GenericoCheckout(error)) {
        onCheckoutUnauthorized();
      } else if ((error as ApiErrorConEstado).status !== 401) {
        toast.error(error instanceof Error ? error.message : "No se pudo registrar el pedido.");
      }
    } finally {
      setLoading(false);
      enviandoRef.current = false;
    }
  };

  /** Paso 1 del checkout: valida el formulario de datos y pasa al resumen. */
  const continuarDatos = () => {
    setIntentoDatos(true);
    if (!datosValidos) {
      toast.error(
        errDocumento ??
        errNombre ??
        errTelefono ??
        "Revisa los datos de tu pedido",
      );
      // Muestra todos los errores y lleva el foco al primer campo inválido.
      validacionDatos.enfocarPrimero({
        documento: errDocumento,
        nombre: errNombre,
        telefono: errTelefono,
      });
      return;
    }
    setCheckoutStep(1);
  };

  if (pedidoConfirmado && pedidoResumen) {
    const horaEtiqueta = formatearHora(pedidoResumen.hora);
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-7xl mb-6">⏳</div>
        <h2
          className="text-2xl font-bold mb-2 text-foreground"
          style={{ fontFamily: SERIF }}
        >
          ¡Pedido recibido!
        </h2>

        {/* a) Pedido: número, estado y mensaje de verificación. Ocupa el
            ancho completo, igual que el encabezado. */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4 text-left">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" /> Pedido{" "}
              {pedidoResumen.id}
            </h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Por verificar
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Estamos verificando tu comprobante de pago. Esto tardará unos
            pocos minutos; te confirmaremos cuando tu pedido esté listo.
          </p>
        </div>

        {/* b) Dos columnas: cliente y recogida a la izquierda; productos y
            totales a la derecha. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start text-left">
          {/* Productos con su desglose y totales. En "pedido recibido" los
              productos van a la derecha y cliente/recogida a la izquierda. */}
          <div className="order-2 md:order-2 bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-foreground mb-3">Productos</h3>
            <div className="space-y-3 mb-4">
              {pedidoResumen.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.product.category.toLowerCase().includes("pizza")
                        ? `${item.quantity} ${item.quantity === 1 ? "porción" : "porciones"} · ${item.size}`
                        : `${item.size ? `${item.size} · ` : ""}x${item.quantity}`}
                    </p>
                    {item.product.category.toLowerCase().includes("pizza") && (
                      <p className="text-xs text-muted-foreground">
                        {fmt(item.sizePrice + item.extrasPrice)} / porción
                      </p>
                    )}
                  </div>
                  <span
                    className="text-sm font-bold text-foreground shrink-0"
                    style={{ fontFamily: MONO }}
                  >
                    {fmt((item.sizePrice + item.extrasPrice) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <ResumenTotales subtotal={pedidoResumen.total} />
          </div>

          {/* Cliente + dónde recoger. */}
          <div className="order-1 md:order-1 space-y-6">
            {pedidoResumen.nombre && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-bold text-foreground mb-2">Cliente</h3>
                <p className="text-foreground font-semibold">
                  {pedidoResumen.nombre}
                </p>
                {pedidoResumen.documento && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Documento: {pedidoResumen.documento}
                  </p>
                )}
                {pedidoResumen.telefono && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Teléfono: {pedidoResumen.telefono}
                  </p>
                )}
              </div>
            )}

            {/* Recogida: hora, dirección, teléfono y horario. */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Dónde
                recoger tu pedido
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Podrás pasar por tu pedido a la hora estipulada.
              </p>
              <div className="mb-4 border-l-2 border-primary/60 pl-3">
                <p className="text-xs text-muted-foreground">Hora de recogida</p>
                <p className="text-base font-bold text-primary">{horaEtiqueta}</p>
              </div>
              <p className="text-foreground font-semibold">
                La Sirena Pizza
              </p>
              <p className="text-muted-foreground text-sm">
                {DIRECCION_LOCAL}
              </p>

              {/* Mapa de Google Maps del local (sin API key). */}
              <div className="mt-3 overflow-hidden rounded-xl border border-border">
                <iframe
                  title="Ubicación de La Sirena Pizza en Google Maps"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(DIRECCION_LOCAL)}&output=embed`}
                  loading="lazy"
                  className="w-full h-[150px] border-0"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <a
                href={`https://www.google.com/maps?q=${encodeURIComponent(DIRECCION_LOCAL)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <MapPin className="w-3.5 h-3.5" /> Abrir en Google Maps
              </a>

              <div className="mt-3 pt-3 border-t border-border space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> 604 234 5678
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <a
                    href={WHATSAPP_LOCAL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:underline"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5" /> {WHATSAPP_LOCAL_VISIBLE}
                  </a>
                </p>
                <p className="text-xs font-semibold text-primary">
                  Horario: jueves a domingo, de {aperturaRecogidaTexto} a {cierreRecogidaTexto}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          {isLoggedIn && (
            <PrimaryBtn
              onClick={() => {
                onClearConfirmation?.();
                navigate("mis-pedidos");
              }}
              size="lg"
            >
              Ver mis pedidos
            </PrimaryBtn>
          )}
          <GhostBtn
            onClick={() => {
              onClearConfirmation?.();
              navigate("landing");
            }}
            className="px-7 py-4 text-lg min-h-[56px]"
          >
            Volver al inicio
          </GhostBtn>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-7xl mb-6">🛒</div>
        <h2
          className="text-2xl font-bold mb-2 text-foreground"
          style={{ fontFamily: SERIF }}
        >
          Tu carrito está vacío
        </h2>
        <p className="text-muted-foreground mb-8">
          Agrega algunas pizzas deliciosas para comenzar tu
          pedido
        </p>
        <PrimaryBtn
          onClick={() => navigate("catalog")}
          size="lg"
        >
          Ver el menú
        </PrimaryBtn>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("catalog")}
          className="flex items-center gap-2 max-md:min-h-11 text-muted-foreground hover:text-foreground mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Seguir comprando
        </button>
        <h1
          className="text-3xl font-bold mb-6 text-foreground"
          style={{ fontFamily: SERIF }}
        >
          Tu pedido
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => {
              const itemNoDisponible = !productoDisponible(item.product);
              // Bloque 5 — Tope de ESTA línea (la propia no se cuenta dos
              // veces como consumo) y las señales para pintar la fila.
              const limite = limiteDe(item);
              const max = limite.max;
              const excedida = max !== undefined && item.quantity > max;
              const enTope = max !== undefined && item.quantity >= max;
              const bajoStock =
                !limite.elaborado && max !== undefined && max > 0 && max <= 10;
              const mensajeMax =
                max === undefined
                  ? ""
                  : mensajeMaximoDe(
                    item.product.name,
                    max,
                    item.size || undefined,
                    limite.elaborado,
                  );
              return (
                <div
                  key={item.id}
                  // Punto 7: una línea pasada del máximo se marca en rojo.
                  className={`bg-card border rounded-2xl p-4 flex gap-4 ${excedida
                      ? "border-red-400 dark:border-red-700"
                      : itemNoDisponible
                        ? "border-zinc-400 dark:border-zinc-600"
                        : "border-border"
                    }`}
                >
                  <img
                    src={getImageUrl(item.product.image)}
                    alt={item.product.name}
                    onError={onErrorImagen}
                    className={`w-20 h-20 rounded-xl object-cover shrink-0 bg-muted ${itemNoDisponible ? "grayscale opacity-60" : ""}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-foreground">
                          {item.product.name}
                        </h3>
                        {/* Estado del producto HOY en el catálogo: la línea se
                          marca pero no se borra sola. */}
                        <EstadoMenuBadge
                          estado={estadoDeProducto(item.product)}
                          className="mt-1.5"
                        />
                        {item.product.category.toLowerCase().includes("pizza") ? (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.quantity} {item.quantity === 1 ? "porción" : "porciones"} · {item.size}
                          </p>
                        ) : item.size ? (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.size}
                          </p>
                        ) : null}
                        {item.selectedExtras.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            + {item.selectedExtras.join(", ")}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => remove(item.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors cursor-pointer p-1 max-md:p-3.5 max-md:-m-2.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mt-3">
                      <div className="flex items-center gap-2 bg-muted rounded-xl p-0.5">
                        <button
                          onClick={() =>
                            updateQty(item.id, item.quantity - 1)
                          }
                          className="w-7 h-7 max-md:w-11 max-md:h-11 rounded-lg bg-card flex items-center justify-center hover:bg-border transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        {/* Bloque 5 (punto 3): campo editable con el teclado;
                          más del máximo se ajusta solo y avisa. */}
                        <CantidadInput
                          value={item.quantity}
                          max={max}
                          mensajeMaximo={mensajeMax}
                          onChange={(n) => updateQty(item.id, n)}
                        />
                        {/* Punto 4: no disponible o ya en el máximo → no se
                          puede aumentar (el título lleva el mensaje). */}
                        <button
                          onClick={() =>
                            updateQty(item.id, item.quantity + 1)
                          }
                          disabled={itemNoDisponible || enTope}
                          title={
                            itemNoDisponible
                              ? "No disponible por ahora"
                              : enTope
                                ? mensajeMax
                                : "Aumentar cantidad"
                          }
                          className="w-7 h-7 max-md:w-11 max-md:h-11 rounded-lg bg-card flex items-center justify-center hover:bg-border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-end gap-6 max-md:gap-4 ml-auto">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Precio unitario</p>
                          <p className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>
                            {fmt(item.sizePrice + item.extrasPrice)}
                            {item.product.category.toLowerCase().includes("pizza") ? " / porción" : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Subtotal</p>
                          <p className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>
                            {fmt(cartTotal(item))}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Bloque 5 (puntos 4, 5 y 7): mensaje de máximo —rojo si
                      la línea pasa del máximo, ámbar si está en él— y aviso
                      de stock bajo de bebidas, visibles sin el cursor. */}
                    {enTope && (
                      <p
                        className={`mt-2 text-xs font-semibold ${excedida
                            ? "text-red-600 dark:text-red-400"
                            : "text-amber-700 dark:text-amber-400"
                          }`}
                      >
                        {mensajeMax}
                      </p>
                    )}
                    {bajoStock && (
                      <AvisoStockBajo max={max} className="mt-2 inline-block" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumen + CTA. Sticky en escritorio: con muchos productos el
              recuadro acompaña el scroll y el total y el botón de pago
              siempre están a la vista. */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="font-bold mb-3 text-foreground flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary" />{" "}
                Resumen
              </h3>
              {/* Solo recogida y total: la fila "Subtotal (N productos)" se
                  quitó del recuadro (el cambio aplica igual en el modal de
                  pago y en la confirmación, porque es el mismo componente). */}
              <ResumenTotales
                subtotal={subtotal}
                className="space-y-2 mb-4 text-sm"
              />
              {/* Un producto del carrito dejó de estar disponible: no se
                  puede pagar hasta que el cliente lo quite (la línea no se
                  borra sola). */}
              {itemsNoDisponibles.length > 0 && (
                <p className="mb-3 text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl px-3 py-2 text-center">
                  Quita los productos no disponibles para continuar
                </p>
              )}
              {/* Bloque 5 (punto 7): una línea pasó de su máximo (carrito
                  guardado de antes); que el cliente la baje para pagar. El
                  carrito no se corrige en silencio. */}
              {lineasExcedidas.length > 0 && (
                <p className="mb-3 text-sm font-semibold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 rounded-xl px-3 py-2 text-center">
                  Baja las cantidades que pasan del máximo para continuar
                </p>
              )}
              <PrimaryBtn
                // El paso de pago solo se abre desde una sesión autenticada.
                onClick={() => {
                  if (!isLoggedIn) {
                    onRequireCheckoutLogin();
                    return;
                  }
                  if (!obtenerToken()) {
                    onCheckoutUnauthorized();
                    return;
                  }
                  onVerificarStock();
                }}
                size="lg"
                disabled={
                  itemsNoDisponibles.length > 0 ||
                  lineasExcedidas.length > 0 ||
                  validandoStockCheckout
                }
                className="w-full"
              >
                <CreditCard className="w-5 h-5" />
                {validandoStockCheckout ? "Revisando disponibilidad…" : "Proceder al pago"}
              </PrimaryBtn>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal step 1: Resumen + método de pago ── */}
      <AnimatePresence>
        {checkoutStep === 1 && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center sm:p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="bg-card w-full min-h-screen sm:min-h-0 sm:rounded-2xl sm:w-[94vw] sm:max-w-none shadow-2xl border border-border sm:my-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h3
                    className="text-lg font-bold text-foreground"
                    style={{ fontFamily: SERIF }}
                  >
                    Resumen de tu pedido
                  </h3>
                  <button
                    onClick={() => setCheckoutStep(0)}
                    className="p-1.5 max-md:p-3.5 max-md:-m-2 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {/* Body: 2 cols */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
                  {/* LEFT: items */}
                  <div className="px-5 py-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Descripción del pedido
                    </p>
                    {nombreCliente && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Cliente:{" "}
                        <span className="font-semibold text-foreground">
                          {nombreCliente}
                        </span>
                      </p>
                    )}
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3"
                        >
                          <img
                            src={getImageUrl(item.product.image)}
                            alt={item.product.name}
                            onError={onErrorImagen}
                            className="w-10 h-10 rounded-lg object-cover shrink-0 bg-muted"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.product.category.toLowerCase().includes("pizza")
                                ? `${item.quantity} ${item.quantity === 1 ? "porción" : "porciones"} · ${item.size}`
                                : `${item.size ? `${item.size} · ` : ""}x${item.quantity}`}
                            </p>
                            {item.selectedExtras.length > 0 && (
                              <p className="text-xs text-muted-foreground truncate">
                                +{item.selectedExtras.join(", ")}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end shrink-0 text-right">
                            <span className="text-sm text-foreground" style={{ fontFamily: MONO }}>
                              {item.quantity} × {fmt(item.sizePrice + item.extrasPrice)}
                              {item.product.category.toLowerCase().includes("pizza") ? " / porción" : ""}
                            </span>
                            <span
                              className="text-sm font-bold text-foreground"
                              style={{ fontFamily: MONO }}
                            >
                              {fmt(cartTotal(item))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Mismas filas que el panel "Resumen" del carrito, para
                      que el cliente lea el mismo desglose en las dos vistas.
                      La divisoria ya viene dentro de ResumenTotales. */}
                    <ResumenTotales
                      subtotal={subtotal}
                      className="mt-4 space-y-2 text-sm"
                    />
                  </div>
                  {/* Método de pago, comprobante y recogida */}
                  <div className="px-5 py-5 space-y-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                        Método de pago
                      </p>
                      <div className="space-y-2">
                        {["Nequi", "Bancolombia"].map((m) => (
                          <label
                            key={m}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${payment === m ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${payment === m ? "border-primary" : "border-muted-foreground"}`}
                            >
                              {payment === m && (
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <input
                              type="radio"
                              name="payment"
                              className="sr-only"
                              value={m}
                              checked={payment === m}
                              disabled={subiendo || loading}
                              onChange={() => cambiarMetodoPago(m)}
                            />
                            <span className="text-sm font-medium text-foreground">
                              {m}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Datos de pago · {payment}</p>
                      <div className="bg-muted/50 rounded-2xl p-4 border border-border">
                        {PAYMENT_INFO[payment]?.lines.map((linea) => <p key={linea} className="text-sm font-medium text-foreground">{linea}</p>)}
                        <p className="mt-2 text-sm text-muted-foreground">Llave de la cuenta: <strong className="text-foreground">{PAYMENT_INFO[payment]?.llave}</strong></p>
                      </div>
                      <BloqueQrPago payment={payment} monto={subtotal} qrDataUrl={qrDataUrl} />
                    </div>

                    <div
                      ref={validacionPago.refCampo("comprobante")}
                      tabIndex={-1}
                      role="group"
                      aria-label="Comprobante de pago"
                      {...validacionPago.ariaCampo("comprobante", errorComprobanteVisible)}
                    >
                      <CargaComprobanteCheckout
                        monto={subtotal}
                        comprobante={comprobante}
                        onQuitarComprobante={() => setComprobante(null)}
                        subiendo={subiendo}
                        fileRef={fileRef}
                        onFileChange={(file) => void cargarComprobanteCheckout(file)}
                      />
                      {errorComprobanteVisible && (
                        <p id={validacionPago.idError("comprobante")} role="alert" className="mt-1.5 text-xs font-medium text-red-500">
                          {errorComprobanteVisible}
                        </p>
                      )}
                    </div>

                    {/* Hora de recogida: dos selects (hora y minutos de 15 en
                      15), siempre en p. m., de 4:00 p. m. a 9:45 p. m., y solo
                      con los horarios que aún no pasaron hoy. */}
                    <div
                      ref={sinHorariosHoy ? validacionPago.refCampo("hora-recogida") : undefined}
                      tabIndex={sinHorariosHoy ? -1 : undefined}
                      role="group"
                      aria-label="Hora de recogida"
                      {...(sinHorariosHoy ? validacionPago.ariaCampo("hora-recogida", errorHoraVisible) : {})}
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                        Hora de recogida *
                      </p>
                      <div className="mb-3 border-l-2 border-primary/60 pl-3 text-sm text-muted-foreground">
                        <p>
                          Atendemos de <strong className="text-foreground">{aperturaRecogidaTexto}</strong> a{" "}
                          <strong className="text-foreground">{cierreRecogidaTexto}</strong>
                        </p>
                        <p className="text-xs mt-0.5">
                          El último horario de recogida es{" "}
                          <strong className="text-foreground">{ultimaRecogidaTexto}</strong>
                        </p>
                      </div>
                      <div
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-muted focus-within:ring-2 focus-within:ring-primary/30 transition-all ${errorHoraVisible || horaFueraDeRango(horaRecogida)
                            ? "border-red-400 focus-within:ring-red-300"
                            : "border-border"
                          }`}
                      >
                        <span className="text-base shrink-0">🕐</span>
                        <select
                          ref={!sinHorariosHoy ? validacionPago.refCampo("hora-recogida") : undefined}
                          {...validacionPago.ariaCampo("hora-recogida", errorHoraVisible)}
                          value={seleccionValida && horaSel !== null ? horaSel : ""}
                          disabled={sinHorariosHoy}
                          aria-label={`Hora de recogida, de ${aperturaRecogidaTexto} a ${ultimaRecogidaTexto}`}
                          onChange={(e) => {
                            const nuevaHora = Number(e.target.value);
                            const minutos = minutosDisponiblesDe(nuevaHora);
                            const minutoActual = minutos.includes(minutoSel ?? -1)
                              ? (minutoSel as number)
                              : minutos[0];
                            setHoraRecogida(
                              `${String(nuevaHora).padStart(2, "0")}:${String(minutoActual).padStart(2, "0")}`,
                            );
                          }}
                          className="flex-1 max-md:min-h-11 max-md:-my-2.5 bg-transparent text-sm text-foreground focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                        >
                          <option value="" disabled>
                            --:--
                          </option>
                          {horasDisponibles.map((h) => (
                            <option key={h} value={h}>
                              {formatearHora(`${h}:00`)}
                            </option>
                          ))}
                        </select>
                        <select
                          value={
                            seleccionValida && minutoSel !== null ? minutoSel : ""
                          }
                          disabled={
                            sinHorariosHoy ||
                            horaSel === null ||
                            !horasDisponibles.includes(horaSel)
                          }
                          aria-label="Minutos de la hora de recogida"
                          onChange={(e) => {
                            if (horaSel === null) return;
                            setHoraRecogida(
                              `${String(horaSel).padStart(2, "0")}:${String(
                                Number(e.target.value),
                              ).padStart(2, "0")}`,
                            );
                          }}
                          className="w-14 max-md:min-h-11 max-md:-my-2.5 bg-transparent text-sm text-foreground focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                        >
                          <option value="" disabled>
                            --
                          </option>
                          {(
                            horaSel !== null ? minutosDisponiblesDe(horaSel) : []
                          ).map((m) => (
                            <option key={m} value={m}>
                              {String(m).padStart(2, "0")}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errorHoraVisible ? (
                        <p id={validacionPago.idError("hora-recogida")} role="alert" className="mt-1.5 text-xs font-medium text-red-500">
                          {errorHoraVisible}
                        </p>
                      ) : sinHorariosHoy ? (
                        <p className="text-xs mt-1.5 font-medium flex items-center gap-1 text-red-500">
                          ⚠ Ya no hay horarios disponibles para hoy
                        </p>
                      ) : (
                        horaRecogida && (
                          <p
                            className={`text-xs mt-1.5 font-medium flex items-center gap-1 ${horaYaPaso(horaRecogida)
                                ? "text-red-500"
                                : horaFueraDeRango(horaRecogida)
                                  ? "text-red-500"
                                  : "text-muted-foreground"
                              }`}
                          >
                            {horaFueraDeRango(horaRecogida)
                              ? `⚠ Esta hora está fuera de nuestro horario de atención (${aperturaRecogidaTexto} – ${cierreRecogidaTexto})`
                              : horaYaPaso(horaRecogida)
                                ? "⚠ Esta hora no está disponible — ya pasó"
                                : `Recogerás a las ${formatearHora(horaRecogida)}`}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </div>
                {/* Footer */}
                <div className="flex gap-3 px-5 py-4 border-t border-border">
                  <button
                    onClick={() => setCheckoutStep(0)}
                    className="flex-1 py-2.5 max-md:min-h-11 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="flex-1 py-2.5 max-md:min-h-11 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    {loading
                      ? "Enviando..."
                      : "Enviar pedido"}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
        {checkoutStep === 3 && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4 p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3
                    className="text-xl font-bold text-foreground"
                    style={{ fontFamily: SERIF }}
                  >
                    Datos para enviar tu pedido
                  </h3>
                  <button
                    onClick={() => setCheckoutStep(0)}
                    title="Volver al carrito"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  Primero tus datos: con ellos quedamos a nombre de quién va el
                  pedido. Después revisas el resumen y el pago.
                </p>
                <div className="space-y-3 mb-5">
                  {/* 1) Documento — obligatorio, 6 a 10 dígitos. */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Documento <MarcaObligatorio />
                    </label>
                    <input
                      value={guestDocument}
                      onChange={(e) => {
                        setGuestDocument(soloDigitos(e.target.value).slice(0, 10));
                        setTocadoDoc(true);
                      }}
                      onBlur={() => setTocadoDoc(true)}
                      onKeyDown={validacionDatos.onKeyDownCampo("documento", {
                        validar: () => errDocumento,
                      })}
                      placeholder="Ej: 1234567890"
                      inputMode="numeric"
                      ref={validacionDatos.refCampo("documento")}
                      {...validacionDatos.ariaCampo("documento", verErrDoc)}
                      className={`w-full px-4 py-2.5 bg-muted rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${verErrDoc ? "border-red-400 bg-red-50/30" : "border-border"
                        }`}
                    />
                    <p
                      id={verErrDoc ? validacionDatos.idError("documento") : undefined}
                      className={`text-xs mt-1 ${verErrDoc ? "text-red-500 dark:text-red-400" : "text-muted-foreground"
                        }`}
                    >
                      {verErrDoc ?? "Entre 6 y 10 dígitos"}
                    </p>
                  </div>

                  {/* 2) Nombre — obligatorio. */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Nombre completo <MarcaObligatorio />
                    </label>
                    <input
                      value={guestName}
                      onChange={(e) => {
                        setGuestName(filtrarNombre(e.target.value));
                        setTocadoNombre(true);
                      }}
                      onBlur={() => { setGuestName(normalizarNombrePersona(guestName)); setTocadoNombre(true); }}
                      onKeyDown={validacionDatos.onKeyDownCampo("nombre", {
                        validar: () => errNombre,
                      })}
                      placeholder="Ej: Laura Martínez"
                      ref={validacionDatos.refCampo("nombre")}
                      {...validacionDatos.ariaCampo("nombre", verErrNom)}
                      className={`w-full px-4 py-2.5 bg-muted rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${verErrNom ? "border-red-400 bg-red-50/30" : "border-border"
                        }`}
                    />
                    {verErrNom && (
                      <p id={validacionDatos.idError("nombre")} className="text-xs text-red-500 dark:text-red-400 mt-1">
                        {verErrNom}
                      </p>
                    )}
                  </div>

                  {/* 3) Teléfono — opcional. */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Número de teléfono{" "}
                      <span className="text-muted-foreground font-normal">
                        (opcional)
                      </span>
                    </label>
                    <input
                      value={guestPhone}
                      onChange={(e) => {
                        setGuestPhone(soloDigitos(e.target.value).slice(0, 10));
                        setTocadoTel(true);
                      }}
                      onBlur={() => setTocadoTel(true)}
                      placeholder="Ej: 310 555 1234"
                      inputMode="tel"
                      ref={validacionDatos.refCampo("telefono")}
                      {...validacionDatos.ariaCampo("telefono", verErrTel)}
                      className={`w-full px-4 py-2.5 bg-muted rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${verErrTel ? "border-red-400 bg-red-50/30" : "border-border"
                        }`}
                    />
                    {verErrTel && (
                      <p id={validacionDatos.idError("telefono")} className="text-xs text-red-500 dark:text-red-400 mt-1">
                        {verErrTel}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={continuarDatos}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 flex items-center justify-center gap-2"
                  >
                    Continuar <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
