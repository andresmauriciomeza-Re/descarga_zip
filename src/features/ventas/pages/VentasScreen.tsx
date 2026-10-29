import React, { useEffect, useState, useMemo, useRef, type ReactNode } from "react";
import { hora12 } from "@/shared/utils/hora";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  Check,
  Clock,
  AlertCircle,
  ShieldCheck,
  ShieldX,
  Printer,
  FileText,
  Download,
  ImageIcon,
  Undo2,
  CalendarDays,
  Upload,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { BotonDescargarExcel } from "@/shared/components/BotonDescargarExcel";
import { filtrarDocumento, MarcaObligatorio, normalizarNombre, validarDocumento } from "@/shared/components/campo";
import { OPCIONES_TIPO_DOCUMENTO } from "@/shared/utils/tiposDocumento";
import { VisorImagen } from "@/shared/components/VisorImagen";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginador";
import { ActionIcons } from "@/shared/components/ActionIcons";
import { buscarClientePorDocumento, buscarClientesPorNombre, type ClientePorNombreApi } from "@/shared/services/authService";
import type { ApiErrorConEstado } from "@/types/api";
import { hoyISO } from "@/shared/utils/fechas";
import { descargarFactura, imprimirFactura } from "@/features/ventas/services/facturaVenta";
import { exportToExcel } from "@/features/ventas/services/exportExcel";
import { crearVentaPanel, anularVentaApi, marcarDevolucionApi, obtenerVentaPanel, obtenerVentasPanel, verificarVentaApi } from "../services/ventasApi";
import { useSubirArchivo } from "@/shared/hooks/useSubirArchivo";
import {
  ESTADOS_ANULABLES,
  type EstadoVenta,
} from "@/features/ventas/services/estadosVenta";

const SERIF = "var(--font-titulo)";
const MONO = "var(--font-texto)";

// ─────────────────────────── CATÁLOGO DEL SISTEMA ───────────────────────────

// El pedido nuevo usa el mismo catálogo que el resto de la aplicación, recibido
// por prop desde `App.tsx`. Antes esta pantalla traía su propia copia local con
// seis pizzas inventadas, así que era imposible pedir una lasaña o una bebida
// aunque el menú ya las tuviera.
interface ProductoMenu {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  sizes: { label: string; price: number }[];
  extras: { label: string; price: number }[];
  status: "disponible" | "no disponible";
  rating: number;
  sales: number;
}

// ─────────────────────────── LOCAL CONFIRM MODAL ───────────────────────────

function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  tone = "peligro",
  children,
  confirmDisabled = false,
  confirmLabel = "Sí, confirmar",
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** "aviso" pinza el botón en naranja, para acciones que no son destructivas
      (p. ej. registrar una devolución). */
  tone?: "peligro" | "aviso";
  /** Slot opcional entre el mensaje y los botones. Lo usa el rechazo del pago
      para pedir el motivo obligatorio (y el texto cuando es "Otro"). */
  children?: ReactNode;
  /** Apaga el botón de confirmar sin desmontar el modal (falta elegir el
      motivo o escribir el detalle de "Otro"). El clic nunca llega a
      `onConfirm`. */
  confirmDisabled?: boolean;
  confirmLabel?: string;
}) {
  const esAviso = tone === "aviso";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border"
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              esAviso ? "bg-orange-100" : "bg-red-100"
            }`}
          >
            <AlertCircle
              className={`w-5 h-5 ${esAviso ? "text-orange-600" : "text-red-600"}`}
            />
          </div>
          <h3
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            {title}
          </h3>
        </div>
        <p className={`leading-relaxed text-muted-foreground ${children ? "mb-4" : "mb-6"}`}>
          {message}
        </p>
        {children}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`flex-1 py-3 text-white rounded-xl font-semibold transition-colors active:scale-95 ${
              confirmDisabled
                ? "bg-red-600/50 opacity-50 cursor-not-allowed"
                : `${
                    esAviso ? "bg-orange-600 hover:bg-orange-700" : "bg-red-600 hover:bg-red-700"
                  } cursor-pointer`
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Bloque de comprobante (input oculto + vista previa + "Quitar") que comparten
 * los modales que adjuntan un soporte: sube a Cloudinary con las mismas reglas
 * de `useSubirArchivo` (JPG/PNG/WEBP/PDF, máx. 5 MB).
 * Se dejó de usar en la verificación de pago (el rechazo ya no pide adjunto y
 * su motivo se elige en el modal de confirmación); lo retoman los modales de
 * anulación, donde el comprobante de la devolución es opcional.
 */
function CampoComprobante({
  fileRef,
  url,
  onQuitar,
  subiendo,
  onSubir,
  etiquetaBoton,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  url: string | null;
  onQuitar: () => void;
  subiendo: boolean;
  onSubir: (file: File) => void;
  etiquetaBoton: string;
}) {
  const esPdf = !!url && (url.startsWith("data:application/pdf") || url.endsWith(".pdf"));
  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          onSubir(file);
          e.target.value = "";
        }}
      />
      {url ? (
        <div className="relative rounded-xl overflow-hidden border border-border">
          {esPdf ? (
            <div className="flex items-center gap-2 p-3 text-sm text-foreground">
              <FileText className="w-4 h-4 text-primary" /> Comprobante adjunto
            </div>
          ) : (
            <img src={url} alt="Comprobante" className="w-full object-contain max-h-56" />
          )}
          <button
            onClick={onQuitar}
            className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer"
            aria-label="Quitar comprobante"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={subiendo}
          className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-border text-center hover:border-primary/40 cursor-pointer transition-colors"
        >
          <Upload className="w-6 h-6 text-muted-foreground/50" />
          <span className="text-sm font-semibold text-foreground">
            {subiendo ? "Subiendo..." : etiquetaBoton}
          </span>
          <span className="text-xs text-muted-foreground">JPG, PNG, WEBP o PDF · máx 5 MB</span>
        </button>
      )}
    </>
  );
}

// ─────────────────────────── VENTAS TYPES & DATA ───────────────────────────

/** Claves internas de estado: se definen en `estadosVenta.ts` (punto C2), que
 *  es la tabla de transiciones que comparte el panel, el checkout, Orden de
 *  Producción y el backend; este alias conserva el nombre con el que se
 *  referencia en todo el frontend. */
export type VentaStatus = EstadoVenta;

/** Estado de devolución se asigna desde el flujo de Devoluciones. */
export const VENTA_STATUS_MANUALES: VentaStatus[] = ["Devolucion"];

/** Estados que solo asigna el flujo (nunca una mano en la tabla):
    Anulado y En espera. La tabla completa vive en `estadosVenta.ts`. */
export const VENTA_STATUS_FLUJO: VentaStatus[] = ["Anulado", "En espera"];

/** Motivo de rechazo: es el literal que queda guardado en
    `tb_venta.motivo_rechazo` (varchar 100). Puede ser uno de los motivos
    fijos o "Otro: <texto escrito por el usuario>". */
export type MotivoRechazo = string;

/** Opciones que ofrece el panel al rechazar un pago. El backend valida la
    misma lista (más "Otro: <texto>"): ver `validarMotivoRechazo`. */
export type MotivoRechazoOpcion =
  | "Comprobante falso"
  | "La imagen no corresponde a un comprobante"
  | "Comprobante borroso"
  | "Otro";

export const MOTIVOS_RECHAZO: { value: MotivoRechazoOpcion; label: string }[] = [
  { value: "Comprobante falso", label: "Comprobante falso" },
  { value: "La imagen no corresponde a un comprobante", label: "La imagen no corresponde a un comprobante" },
  { value: "Comprobante borroso", label: "Comprobante borroso" },
  { value: "Otro", label: "Otro" },
];

/** Máximo de caracteres del texto que acompaña al motivo "Otro" (el backend
    valida el mismo tope antes de guardar "Otro: <texto>" en motivo_rechazo). */
export const MOTIVO_OTRO_MAX = 80;

export const etiquetaMotivoRechazo = (motivo?: MotivoRechazo) => motivo || "—";

/** Motivo de anulación: el literal que queda en `tb_venta.motivo_rechazo`
    cuando se anula desde el listado del panel. La misma lista la valida el
    backend (`validarMotivoAnulacion`). */
export type MotivoAnulacion =
  | "Cliente canceló el pedido"
  | "Error al registrar el pedido"
  | "Producto no disponible"
  | "Otro";

export const MOTIVOS_ANULACION: { value: MotivoAnulacion; label: string }[] = [
  { value: "Cliente canceló el pedido", label: "Cliente canceló el pedido" },
  { value: "Error al registrar el pedido", label: "Error al registrar el pedido" },
  { value: "Producto no disponible", label: "Producto no disponible" },
  { value: "Otro", label: "Otro" },
];

/** Porcentaje del total que la pizzería devuelve al anular según el motivo:
    "Cliente canceló el pedido" deja el 20 % (se devuelve el 80 %); el resto
    de los motivos, incluido "Otro", devuelven el 100 %. El backend calcula lo
    mismo para guardar `tb_venta.monto_reembolso`. */
export const porcentajeReembolsoAnulacion = (motivo: MotivoAnulacion | "") =>
  motivo === "Cliente canceló el pedido" ? 0.8 : 1;

/** Un comprobante de una venta: el inicial de pago o el del dinero faltante. */
export interface ComprobanteVenta {
  url: string;
  tipo: "pago" | "faltante";
  fecha: string;
  hora: string;
}

/** Devuelve los comprobantes de una venta en orden (pago inicial primero).
    Es compatible con ventas viejas que solo traen `comprobante` (un string):
    en ese caso se trata como un único comprobante de pago. */
export const comprobantesDe = (v: Venta): ComprobanteVenta[] => {
  if (v.comprobantes && v.comprobantes.length > 0) return v.comprobantes;
  if (v.comprobante) return [{ url: v.comprobante, tipo: "pago", fecha: v.fecha, hora: "" }];
  return [];
};

export interface HistorialEntry { estado: VentaStatus; hora: string; }

export interface PagoVenta {
  id: number;
  tipo: string;
  comprobante?: string;
  cantidadPagar: number;
  depositado: number;
  faltante: number;
  estado: string;
}

interface DetalleProd {
  nombre: string;
  precio: number;
  cantidad: number;
  imagen?: string;
  tamaño?: string;
  extras?: string[];
  /** Id del producto en el catálogo de Productos. Lo guarda `registrarPedido`
      (App) para que la Orden de Producción no dependa del nombre. */
  productoId?: string;
  /** Línea exacta de la venta en el backend (tb_detalle_venta). La devolución
      la registra por línea, así que cada producto debe poder señalarse. */
  idDetalleVenta?: number;
}

// "mixto" es una devolución donde cada producto se compensó de forma distinta:
// unos se canjearon por producto y otros se devolvieron en dinero.
export type DevolucionTipo = "producto" | "dinero" | "mixto";

export interface Venta {
  id: string;
  usuario: string;
  /** Documento del cliente. Lo piden tanto el checkout del invitado como el
      pedido que crea el administrador, así que en la práctica siempre llega. */
  documento?: string;
  tipoDocumento?: string;
  fecha: string;
  productos: string;
  cantidad: number;
  total: number;
  estado: VentaStatus;
  detalle?: DetalleProd[];
  metodoPago?: string;
  comprobante?: string;
  horaRecogida?: string;
  /** Teléfono del cliente si lo dejó en el formulario de datos del checkout. */
  telefono?: string;
  historial?: HistorialEntry[];
  /** Id de la fila de tb_devolucion de esta venta. Hace falta para resolverla
      (PATCH /devoluciones/:id/resolver); ausente si nunca se marcó. */
  idDevolucion?: number;
  /** Fecha en que se registró la devolución (tb_devolucion.fecha), en formato
      ISO. Es la que usa el Dashboard para contar devoluciones por periodo. */
  devolucionFecha?: string;
  /** Venta nueva que creó el canje de esta devolución (si la hubo). */
  idVentaReemplazo?: number;
  devolucionTipo?: DevolucionTipo;
  devolucionResuelta?: boolean;
  devolucionNota?: string;
  devolucionMonto?: number;
  /** Motivo por el que el cliente devuelve, escrito al gestionar la devolución. */
  devolucionMotivo?: string;
  /** Motivo de cada línea devuelta, indexado por posición del detalle. */
  devolucionMotivos?: Record<string, { motivo: string; descripcion: string }>;
  /** Comprobantes de la venta (pago inicial y dinero faltante). Opcional por
      compatibilidad con ventas viejas: si no está, se usa `comprobante`. */
  comprobantes?: ComprobanteVenta[];
  pagos?: PagoVenta[];
  montoPagado?: number;
  /** Motivo por el que se rechazó el pago (estado Anulado). */
  motivoRechazo?: MotivoRechazo;
  /** Valor que falta por pagar cuando la venta quedó En espera. */
  montoFaltante?: number;
  /** URL del comprobante con el que el admin devolvió el dinero al cliente. */
  comprobanteDevolucion?: string;
  /** Quién dejó la venta en Anulado: 'Administrador' o 'Cliente'. */
  anuladoPor?: string;
  /** Valor a devolver al cliente (80 % o 100 % según el motivo). */
  montoReembolso?: number;
  /** Comprobante de la devolución del dinero subido al anular. */
  comprobanteAnulacion?: string;
  /** Segundos que quedan de la ventana de 10 minutos para anular, medidos
      por el backend al cargar la lista (0 = ventana cerrada). */
  segundosRestantesAnulacion?: number;
}

/** Colores de estado de la venta, con variante dark (fondo translúcido
    oscuro y texto claro del mismo tono) para el pill de la tabla y los
    badges de detalle/historial. */
const VENTA_STATUS_COLOR: Record<VentaStatus, string> = {
  "Por entregar": "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  Devolucion: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
  "Por verificar": "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  Completado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  Anulado: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  "En espera": "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300",
};

const VENTA_STATUS_LABEL: Record<VentaStatus, string> = {
  "Por entregar": "Por entregar",
  Devolucion: "Devuelta",
  "Por verificar": "Por verificar",
  Completado: "Completado",
  Anulado: "Rechazado",
  "En espera": "En espera",
};

/** Etiqueta de estado para UNA venta concreta: "Anulado" tapa dos flujos
    distintos — el rechazo de pago (que se pinta "Rechazado") y la
    anulación/cancelación, la única que trae `montoReembolso` porque devuelve
    dinero. El detalle y la lista usan la misma regla. */
export const etiquetaEstadoVenta = (p: Venta) =>
  p.estado === "Anulado" && p.montoReembolso !== undefined
    ? "Anulado"
    : VENTA_STATUS_LABEL[p.estado];

/** Etiquetas PARA EL CLIENTE de cada estado (tabla de la sección 3). El panel
    admin usa `VENTA_STATUS_LABEL`; el portal del cliente estas. */
export const VENTA_STATUS_LABEL_CLIENTE: Record<VentaStatus, string> = {
  "Por verificar": "Por verificar",
  "En espera": "En espera",
  "Por entregar": "Por entregar",
  Completado: "Completado",
  Devolucion: "Devuelta",
  Anulado: "Rechazado",
};

// Punto C2: ya NO existe el desplegable de estado en la tabla. La columna es
// de solo lectura y los avances los produce el flujo: verificación de pago,
// orden de producción y la hora de recogida (§13). La venta pasa a
// "Completado" sola, al llegar su hora de entrega (sin botón manual).
// La tabla completa de transiciones vive en `services/estadosVenta.ts`.

/** Métodos de pago. "Efectivo" solo existe para los pedidos que genera el
    administrador (pedidos tomados en el local). */
export const METODO_PAGO_BASE = ["Nequi", "Bancolombia"] as const;
export const METODO_PAGO_ADMIN = [...METODO_PAGO_BASE, "Efectivo"] as const;

export type MetodoPago = (typeof METODO_PAGO_ADMIN)[number] | "";

const METODO_PAGO_ESTILO: Record<
  Exclude<MetodoPago, "">,
  { pill: string; btn: string }
> = {
  Nequi:       { pill: "bg-purple-100 text-purple-800", btn: "bg-purple-600 border-purple-600" },
  Bancolombia: { pill: "bg-yellow-100 text-yellow-800",  btn: "bg-yellow-500 border-yellow-500" },
  Efectivo:    { pill: "bg-emerald-100 text-emerald-800", btn: "bg-emerald-600 border-emerald-600" },
};

const nowHora = () =>
  new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

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

/** Fecha local en formato YYYY-MM-DD (el que espera CalendarDropdown). */
const hoyFecha = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

  // Interfaz para productos seleccionados en el picker
  interface ProductoSeleccionado {
    id: number;
    nombre: string;
    precio: number;
    cantidad: number;
    tamaño: string;
  }

  /** Modal exclusivo del panel de administrador: el pedido se toma en el local,
      frente al cliente, así que no se pide estado ni comprobante. La fecha se
      carga sola con el día en que se hace el pedido y la hora de recogida se
      auto-asigna en el backend (25 minutos de preparación).
      Vive a nivel de módulo (no dentro del render de `VentasScreen`) para que
      los re-renders del panel no lo desmonten y pierda lo que se está
      escribiendo. */
  function VentaModal({
    onClose,
    onConfirm,
    productos,
  }: {
    onClose: () => void;
    onConfirm: (v: Omit<Venta, "id">) => Promise<boolean>;
    productos: ProductoMenu[];
  }) {
    const [documento, setDocumento] = useState("");
    const [tipoDocumento, setTipoDocumento] = useState("CC");
    const [usuario, setUsuario] = useState("");
    // La fecha no es un campo: el pedido se toma hoy, así que se calcula al
    // guardar. Sin estado no hay forma de editarla.
    const fecha = hoyFecha();
    const [metodoPago, setMetodoPago] = useState<MetodoPago>("");
    const [selProductos, setSelProductos] = useState<ProductoSeleccionado[]>(
      [],
    );
    /** Estado "guardando": bloquea el botón Guardar mientras el pedido se
        registra. El `ref` es la barrera real anti doble clic (el `disabled`
        del botón no alcanza si llegan dos clics en el mismo tick). */
    const [guardando, setGuardando] = useState(false);
    const guardandoRef = useRef(false);

    type EstadoBusquedaDocumento = "inactivo" | "pendiente" | "buscando" | "registrado" | "no-encontrado" | "error";
    const [estadoBusqueda, setEstadoBusqueda] = useState<EstadoBusquedaDocumento>("inactivo");
    const [clienteInactivo, setClienteInactivo] = useState(false);
    const busquedaId = useRef(0);
    const busquedaNombreId = useRef(0);
    const clienteElegidoPorNombre = useRef(false);
    const nombreClienteElegido = useRef("");
    const usuarioActual = useRef(usuario);
    const campoNombreRef = useRef<HTMLInputElement>(null);
    const [resultadosNombre, setResultadosNombre] = useState<ClientePorNombreApi[]>([]);
    const [buscandoNombre, setBuscandoNombre] = useState(false);
    const [listaNombreAbierta, setListaNombreAbierta] = useState(false);
    const [indiceNombreActivo, setIndiceNombreActivo] = useState(-1);
    const documentoActual = useRef(documento);
    const tipoActual = useRef(tipoDocumento);
    const digitosDe = (valor: string) => valor.replace(/\D/g, "");

    const consultarDocumento = async (
      valor = documentoActual.current,
      tipo = tipoActual.current,
    ): Promise<EstadoBusquedaDocumento | "obsoleto"> => {
      const numero = valor.trim();
      if (digitosDe(numero).length < 6) return "inactivo";
      const id = ++busquedaId.current;
      setEstadoBusqueda("buscando");
      try {
        const resultado = await buscarClientePorDocumento(numero, tipo);
        if (
          id !== busquedaId.current ||
          numero !== documentoActual.current.trim() ||
          tipo !== tipoActual.current
        ) return "obsoleto";
        usuarioActual.current = resultado.nombre;
        setUsuario(resultado.nombre);
        setClienteInactivo(!resultado.estado);
        setEstadoBusqueda("registrado");
        return "registrado";
      } catch (error) {
        if (
          id !== busquedaId.current ||
          numero !== documentoActual.current.trim() ||
          tipo !== tipoActual.current
        ) return "obsoleto";
        const status = (error as ApiErrorConEstado).status;
        setClienteInactivo(false);
        if (status === 404) {
          setEstadoBusqueda("no-encontrado");
          return "no-encontrado";
        }
        setEstadoBusqueda("error");
        return "error";
      }
    };

    useEffect(() => {
      const numero = documento.trim();
      if (clienteElegidoPorNombre.current && numero === documentoActual.current.trim()) return;
      if (digitosDe(numero).length < 6) {
        setEstadoBusqueda("inactivo");
        return;
      }
      setEstadoBusqueda("pendiente");
      const id = busquedaId.current;
      const timer = window.setTimeout(() => {
        if (id === busquedaId.current) void consultarDocumento(numero, tipoDocumento);
      }, 500);
      return () => {
        window.clearTimeout(timer);
        busquedaId.current += 1;
      };
    }, [documento, tipoDocumento]);

    useEffect(() => {
      const termino = usuario.trim();
      const id = ++busquedaNombreId.current;
      if (
        (estadoBusqueda === "registrado" && !clienteElegidoPorNombre.current) ||
        (clienteElegidoPorNombre.current && normalizarNombre(termino) === nombreClienteElegido.current) ||
        termino.length < 3
      ) {
        setResultadosNombre([]);
        setBuscandoNombre(false);
        setListaNombreAbierta(false);
        setIndiceNombreActivo(-1);
        return;
      }
      setListaNombreAbierta(true);
      setBuscandoNombre(true);
      const timer = window.setTimeout(() => {
        void buscarClientesPorNombre(termino)
          .then((resultados) => {
            if (id !== busquedaNombreId.current || termino !== usuarioActual.current.trim()) return;
            setResultadosNombre(resultados);
            setIndiceNombreActivo(-1);
          })
          .catch(() => {
            if (id !== busquedaNombreId.current || termino !== usuarioActual.current.trim()) return;
            setResultadosNombre([]);
          })
          .finally(() => {
            if (id === busquedaNombreId.current && termino === usuarioActual.current.trim()) setBuscandoNombre(false);
          });
      }, 300);
      return () => window.clearTimeout(timer);
    }, [usuario, estadoBusqueda]);

    const elegirClientePorNombre = (cliente: ClientePorNombreApi) => {
      busquedaNombreId.current += 1;
      clienteElegidoPorNombre.current = true;
      const numero = String(cliente.documento);
      documentoActual.current = numero;
      tipoActual.current = cliente.tipoDocumento;
      nombreClienteElegido.current = normalizarNombre(cliente.nombre);
      setDocumento(numero);
      setTipoDocumento(cliente.tipoDocumento);
      usuarioActual.current = cliente.nombre;
      setUsuario(cliente.nombre);
      setClienteInactivo(!cliente.estado);
      setEstadoBusqueda("registrado");
      setListaNombreAbierta(false);
      setResultadosNombre([]);
    };

    const manejarTeclasNombre = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        setListaNombreAbierta(false);
        return;
      }
      if (!listaNombreAbierta || resultadosNombre.length === 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setIndiceNombreActivo(indice => (indice + 1) % resultadosNombre.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setIndiceNombreActivo(indice => (indice <= 0 ? resultadosNombre.length - 1 : indice - 1));
      } else if (event.key === "Enter" && indiceNombreActivo >= 0) {
        event.preventDefault();
        elegirClientePorNombre(resultadosNombre[indiceNombreActivo]);
      }
    };

    const desvincularCliente = () => {
      busquedaId.current += 1;
      busquedaNombreId.current += 1;
      clienteElegidoPorNombre.current = false;
      nombreClienteElegido.current = "";
      documentoActual.current = "";
      tipoActual.current = "CC";
      setDocumento("");
      setTipoDocumento("CC");
      setClienteInactivo(false);
      setEstadoBusqueda("inactivo");
      setListaNombreAbierta(false);
      setResultadosNombre([]);
    };

    const borrarClienteYNombre = () => {
      if (estadoBusqueda === "registrado") desvincularCliente();
      else {
        busquedaNombreId.current += 1;
        setResultadosNombre([]);
        setListaNombreAbierta(false);
      }
      usuarioActual.current = "";
      setUsuario("");
      window.requestAnimationFrame(() => campoNombreRef.current?.focus());
    };

    const cambiarDocumento = (valor: string) => {
      const estabaRegistrado = estadoBusqueda === "registrado";
      busquedaId.current += 1;
      clienteElegidoPorNombre.current = false;
      nombreClienteElegido.current = "";
      documentoActual.current = valor;
      setDocumento(valor);
      setEstadoBusqueda(digitosDe(valor).length >= 6 ? "pendiente" : "inactivo");
      setClienteInactivo(false);
      if (estabaRegistrado) {
        usuarioActual.current = "";
        setUsuario("");
      }
    };


    // Product picker state
    const [showPicker, setShowPicker] = useState(false);
    const [prodSearch, setProdSearch] = useState("");
    // Categoría activa del selector. Filtrar por categoría es lo que deja ver
    // todos los productos de una vez, sin barra de desplazamiento.
    const [catPicker, setCatPicker] = useState("Todas");

    // Las bebidas del menú llegan sin tamaños: se venden de una sola
    // presentación. Sin esto, el picker leería `sizes[0]` de un arreglo vacío
    // y reventaría al pedir una gaseosa.
    const variantesDe = (p: ProductoMenu) =>
      p.sizes.length > 0 ? p.sizes : [{ label: "Única", price: p.price }];

    const disponiblesMenu = useMemo(
      () => productos.filter((p) => p.status === "disponible"),
      [productos],
    );
    const categoriasPicker = useMemo(
      () => ["Todas", ...new Set(disponiblesMenu.map((p) => p.category))],
      [disponiblesMenu],
    );
    const filteredProds = disponiblesMenu.filter(
      (p) =>
        p.name
          .toLowerCase()
          .includes(prodSearch.toLowerCase()) &&
        (catPicker === "Todas" || p.category === catPicker),
    );

    const toggleProduct = (p: ProductoMenu) => {
      setSelProductos((prev) => {
        const exists = prev.find((x) => x.id === p.id);
        if (exists) return prev.filter((x) => x.id !== p.id);
        const defaultSize = variantesDe(p)[0];
        return [
          ...prev,
          {
            id: p.id,
            nombre: p.name,
            precio: defaultSize.price,
            cantidad: 1,
            tamaño: defaultSize.label,
          },
        ];
      });
    };

    const updateQty = (id: number, qty: number) => {
      if (qty < 1) {
        setSelProductos((p) => p.filter((x) => x.id !== id));
        return;
      }
      setSelProductos((p) =>
        p.map((x) =>
          x.id === id ? { ...x, cantidad: qty } : x,
        ),
      );
    };

    const updateTamaño = (id: number, tamaño: string) => {
      const prod = productos.find((p) => p.id === id);
      const sizeObj = prod
        ? variantesDe(prod).find((s) => s.label === tamaño)
        : undefined;
      setSelProductos((p) =>
        p.map((x) =>
          x.id === id
            ? {
                ...x,
                tamaño,
                precio: sizeObj?.price ?? x.precio,
              }
            : x,
        ),
      );
    };

    const totalCalculado = selProductos.reduce(
      (s, p) => s + p.precio * p.cantidad,
      0,
    );
    const cantidadTotal = selProductos.reduce(
      (s, p) => s + p.cantidad,
      0,
    );
    const productosStr = selProductos
      .map((p) => `${p.nombre} (${p.tamaño}) x${p.cantidad}`)
      .join(", ");

    /** Valida el formulario y devuelve los datos del pedido. `false` = no se
        puede guardar (falta un dato o la consulta del cliente falló). */
    const prepararPedido = async (): Promise<Omit<Venta, "id"> | null> => {
      if (!usuario.trim()) {
        toast.error("El nombre del cliente es obligatorio");
        return null;
      }
      const errDoc = validarDocumento(documento, tipoDocumento);
      if (errDoc) {
        toast.error(errDoc);
        return null;
      }
      if (selProductos.length === 0) {
        toast.error("Agrega al menos un producto");
        return null;
      }
      if (!metodoPago) {
        toast.error("Selecciona el método de pago");
        return null;
      }
      let estadoCliente: EstadoBusquedaDocumento | "obsoleto" = estadoBusqueda;
      if (digitosDe(documento).length >= 6 && estadoCliente !== "registrado" && estadoCliente !== "no-encontrado") {
        estadoCliente = await consultarDocumento(documento, tipoDocumento);
      }
      if (estadoCliente === "error" || estadoCliente === "obsoleto") {
        toast.error("No se pudo verificar el documento. Intenta de nuevo antes de guardar.");
        return null;
      }
      if (digitosDe(documento).length >= 6 && estadoCliente !== "registrado" && estadoCliente !== "no-encontrado") {
        toast.error("Espera a que termine la búsqueda del cliente.");
        return null;
      }
      // Solo la respuesta 404 confirma que se debe crear la ficha local. Un
      // resultado registrado en PostgreSQL nunca pasa por este callback.
      // Punto C2: el pago se recibe en el momento (nada que verificar), pero
      // la pizza todavía hay que hacerla, así que TODOS los pedidos tomados en
      // el local nacen "Por verificar" y el flujo los va avanzando.
      const finalEstado: VentaStatus = "Por verificar";
      const detalle: DetalleProd[] = selProductos.map((p) => ({
        nombre: p.nombre,
        precio: p.precio,
        cantidad: p.cantidad,
        imagen: productos.find((x) => x.id === p.id)?.image,
        tamaño: p.tamaño === "Única" ? undefined : p.tamaño,
        productoId: String(p.id),
      }));
      return {
        usuario: normalizarNombre(usuario),
        documento: documento.trim(),
        tipoDocumento,
        fecha,
        estado: finalEstado,
        productos: productosStr,
        cantidad: cantidadTotal,
        total: totalCalculado,
        detalle,
        metodoPago,
        historial: [{ estado: finalEstado, hora: nowHora() }],
      };
    };

    const handleSave = async () => {
      // Barrera anti doble clic: el segundo clic no llega a la API.
      if (guardandoRef.current) return;
      guardandoRef.current = true;
      setGuardando(true);
      try {
        const pedido = await prepararPedido();
        if (!pedido) {
          guardandoRef.current = false;
          setGuardando(false);
          return;
        }
        const ok = await onConfirm(pedido);
        if (!ok) {
          // El guardado falló: el botón vuelve a estar disponible.
          guardandoRef.current = false;
          setGuardando(false);
        }
      } catch {
        guardandoRef.current = false;
        setGuardando(false);
      }
    };

    const iCls =
      "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.16 }}
          className={`bg-card rounded-2xl w-full shadow-2xl border border-border flex flex-col my-4 transition-all ${
            showPicker ? "max-w-7xl max-h-[92vh]" : "max-w-5xl max-h-[90vh]"
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <h3
              className="text-lg font-bold text-foreground"
              style={{ fontFamily: SERIF }}
            >
              Nuevo pedido
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-6 flex-1 min-h-0 overflow-y-auto">
          {/* ── Izquierda: datos del pedido ── */}
          <div className="space-y-4">
            {/* Documento del cliente — búsqueda en tiempo real */}
            <div className="relative">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                 Documento del cliente <MarcaObligatorio />
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 min-w-0">
                  <input
                    value={documento}
                    onChange={(e) => cambiarDocumento(filtrarDocumento(e.target.value, tipoDocumento))}
                    onBlur={() => {
                      if (digitosDe(documento).length >= 6) void consultarDocumento(documento, tipoDocumento);
                    }}
                    placeholder="Escribe el documento…"
                    inputMode="numeric"
                    className={`${iCls} w-full`}
                    autoComplete="off"
                  />
                </div>
              </div>
              {estadoBusqueda === "registrado" && (
                <>
                  <p className="text-xs mt-1 font-medium text-emerald-600">✓ Cliente registrado</p>
                  {clienteInactivo && <p role="status" className="text-xs mt-1 font-medium text-amber-600">⚠ Cliente inactivo</p>}
                </>
              )}
              {estadoBusqueda === "no-encontrado" && (
                <p className="text-xs mt-1 font-medium text-muted-foreground">Documento no registrado — se creará un cliente nuevo</p>
              )}
              {estadoBusqueda === "pendiente" && <p className="text-xs mt-1 text-muted-foreground">Esperando documento completo…</p>}
              {estadoBusqueda === "buscando" && <p className="text-xs mt-1 text-muted-foreground">Buscando cliente…</p>}
              {estadoBusqueda === "error" && <p role="alert" className="text-xs mt-1 font-medium text-red-600">No se pudo verificar el documento. Revisa la conexión e inténtalo de nuevo.</p>}
            </div>

            {/* Nombre del cliente: editable solo si el backend confirma que es nuevo */}
            <div className="relative">
              {estadoBusqueda === "no-encontrado" && <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo de documento <MarcaObligatorio /></label>}
              {estadoBusqueda === "no-encontrado" && <select value={tipoDocumento} onChange={(e) => { tipoActual.current = e.target.value; setTipoDocumento(e.target.value); }} className={`${iCls} mb-2`}>
                {OPCIONES_TIPO_DOCUMENTO.filter(t => ["CC", "CE", "PP", "Pasaporte"].includes(t.code)).map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
              </select>}
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                 Nombre del cliente <MarcaObligatorio />
              </label>
              <div className="relative">
                <input
                ref={campoNombreRef}
                value={usuario}
                onChange={(e) => {
                  const valor = e.target.value;
                  if (estadoBusqueda === "registrado") desvincularCliente();
                  usuarioActual.current = valor;
                  setUsuario(valor);
                  setResultadosNombre([]);
                  setIndiceNombreActivo(-1);
                  setBuscandoNombre(valor.trim().length >= 3);
                  setListaNombreAbierta(valor.trim().length >= 3);
                }}
                onBlur={() => {
                  const nombre = normalizarNombre(usuario);
                  usuarioActual.current = nombre;
                  setUsuario(nombre);
                  setListaNombreAbierta(false);
                }}
                onKeyDown={manejarTeclasNombre}
                placeholder="Escribe el nombre del cliente..."
                className={`${iCls} ${usuario ? "pr-10" : ""}`}
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={listaNombreAbierta}
                aria-controls="resultados-clientes-nombre"
              />
              {usuario && (
                <button
                  type="button"
                  aria-label="Borrar nombre y cliente seleccionado"
                  title="Borrar nombre y cliente"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={borrarClienteYNombre}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {listaNombreAbierta && usuario.trim().length >= 3 && (
                <div id="resultados-clientes-nombre" role="listbox" className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                  {buscandoNombre ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Buscando clientes…</p>
                  ) : resultadosNombre.length > 0 ? (
                    resultadosNombre.map((cliente, indice) => (
                      <button
                        key={String(cliente.documento)}
                        type="button"
                        role="option"
                        aria-selected={indice === indiceNombreActivo}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => elegirClientePorNombre(cliente)}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted ${indice === indiceNombreActivo ? "bg-muted" : ""}`}
                      >
                        <span className="min-w-0 truncate text-foreground">{cliente.nombre} — {cliente.tipoDocumento} {cliente.documento}</span>
                        {!cliente.estado && <span className="shrink-0 text-xs font-semibold text-amber-600">Inactivo</span>}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-muted-foreground">No hay clientes con ese nombre</p>
                  )}
                </div>
              )}
            </div>
            </div>

            {/* Fecha — informative. El pedido se toma hoy y no se puede cambiar. */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Fecha del pedido
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-xl border border-dashed border-border">
                <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold text-foreground">
                  {new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
                  Automática
                </span>
              </div>
            </div>

            {/* Método de pago — incluye Efectivo, exclusivo del administrador */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                 Método de pago <MarcaObligatorio />
              </label>
              <div className="flex gap-2">
                {METODO_PAGO_ADMIN.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetodoPago(m)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                      metodoPago === m
                        ? `${METODO_PAGO_ESTILO[m].btn} text-white`
                        : "bg-muted border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Derecha: productos del pedido ── */}
          <div className="space-y-4">
            {/* Selector de productos */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-muted-foreground">
                   Productos <MarcaObligatorio />
                </label>
                {selProductos.length > 0 && (
                  <span className="text-xs text-primary font-semibold">
                    {selProductos.length} seleccionados
                  </span>
                )}
              </div>

              {/* Productos seleccionados */}
              {selProductos.length > 0 && (
                <div className="mb-2 space-y-2 max-h-72 overflow-y-auto">
                  {selProductos.map((p) => {
                    const prodData = productos.find(
                      (x) => x.id === p.id,
                    );
                    return (
                      <div
                        key={p.id}
                        className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5"
                      >
                        {/* Fila 1: nombre + eliminar */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {p.nombre}
                          </span>
                          <button
                            onClick={() =>
                              setSelProductos((prev) =>
                                prev.filter(
                                  (x) => x.id !== p.id,
                                ),
                              )
                            }
                            className="text-muted-foreground hover:text-red-500 cursor-pointer shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {/* Fila 2: tamaño + cantidad + precio */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Selector de tamaño */}
                          {/* Selector de tamaño. Los productos de una sola
                              presentación (bebidas) no muestran este grupo. */}
                          {prodData && prodData.sizes.length > 0 && (
                          <div className="flex rounded-lg overflow-hidden border border-border shrink-0">
                            {prodData.sizes.map(
                              (s) => (
                                <button
                                  key={s.label}
                                  type="button"
                                  onClick={() =>
                                    updateTamaño(p.id, s.label)
                                  }
                                  className={`px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${p.tamaño === s.label ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-border"}`}
                                >
                                  {s.label}
                                </button>
                              ),
                            )}
                          </div>
                          )}
                          {/* Cantidad */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                updateQty(p.id, p.cantidad - 1)
                              }
                              className="w-6 h-6 rounded bg-muted flex items-center justify-center cursor-pointer hover:bg-border text-foreground font-bold text-xs"
                            >
                              −
                            </button>
                            <span className="w-5 text-center text-sm font-bold text-foreground">
                              {p.cantidad}
                            </span>
                            <button
                              onClick={() =>
                                updateQty(p.id, p.cantidad + 1)
                              }
                              className="w-6 h-6 rounded bg-muted flex items-center justify-center cursor-pointer hover:bg-border text-foreground font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                          {/* Precio unitario + total */}
                          <span
                            className="ml-auto flex items-baseline gap-1.5"
                          >
                            <span
                              className="text-[11px] text-muted-foreground"
                              style={{ fontFamily: MONO }}
                            >
                              ${p.precio.toLocaleString("es-CO")} c/u
                            </span>
                            <span
                              className="text-xs font-bold text-primary"
                              style={{ fontFamily: MONO }}
                            >
                              $
                              {(
                                p.precio * p.cantidad
                              ).toLocaleString("es-CO")}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Botón abrir picker. El catálogo se muestra aparte, a todo el
                  ancho del modal, para que quepan los productos sin scroll. */}
              <button
                type="button"
                onClick={() => {
                  setProdSearch("");
                  setShowPicker((p) => !p);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-muted-foreground hover:border-primary/40 cursor-pointer transition-colors"
              >
                <span>
                  {selProductos.length === 0
                    ? "Seleccionar productos del catálogo..."
                    : "Agregar más productos..."}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showPicker ? "rotate-180" : ""}`}
                />
              </button>

              {/* Catálogo: vive dentro de la columna derecha para que el modal
                  siga teniendo sus dos mitades. La rejilla scrollea por dentro
                  para no empujar nada hacia abajo. */}
              {showPicker && (
                <div className="mt-2 border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-3 py-2.5 border-b border-border bg-muted/30 flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-32">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        value={prodSearch}
                        onChange={(e) => setProdSearch(e.target.value)}
                        placeholder="Buscar producto..."
                        className="w-full pl-8 pr-3 py-1.5 bg-card rounded-lg border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {categoriasPicker.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCatPicker(c)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                            catPicker === c
                              ? "bg-primary text-white border-transparent"
                              : "bg-card text-foreground border-border hover:border-primary/40"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
                      {filteredProds.map((p) => {
                        const selItem = selProductos.find((x) => x.id === p.id);
                        const sel = !!selItem;
                        return (
                          <div
                            key={p.id}
                            className={`rounded-xl border p-2 flex flex-col gap-1.5 transition-colors ${
                              sel
                                ? "border-primary/40 bg-primary/5"
                                : "border-border bg-card"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleProduct(p)}
                                className="shrink-0 cursor-pointer"
                              >
                                <div
                                  className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                                    sel ? "bg-primary border-primary" : "border-border"
                                  }`}
                                >
                                  {sel && <Check className="w-3 h-3 text-white" />}
                                </div>
                              </button>
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-8 h-8 rounded-lg object-cover bg-muted shrink-0"
                              />
                              <p className="text-[11px] font-semibold text-foreground leading-tight line-clamp-2">
                                {p.name}
                              </p>
                            </div>

                            <div className="flex gap-1.5">
                              {variantesDe(p).map((s) => {
                                const active = sel && selItem?.tamaño === s.label;
                                return (
                                  <button
                                    key={s.label}
                                    type="button"
                                    onClick={() => {
                                      if (!sel) {
                                        setSelProductos((prev) => [
                                          ...prev,
                                          { id: p.id, nombre: p.name, precio: s.price, cantidad: 1, tamaño: s.label },
                                        ]);
                                      } else {
                                        updateTamaño(p.id, s.label);
                                      }
                                    }}
                                    className={`flex-1 min-w-0 rounded-lg border px-1.5 py-1 text-left transition-colors cursor-pointer ${
                                      active
                                        ? "border-primary bg-primary text-white"
                                        : "border-border bg-muted/40 hover:border-primary/40"
                                    }`}
                                  >
                                    <span className="block text-[10px] font-semibold truncate">
                                      {s.label}
                                    </span>
                                    <span
                                      className={`block text-[10px] truncate ${
                                        active ? "opacity-80" : "text-muted-foreground"
                                      }`}
                                      style={{ fontFamily: MONO }}
                                    >
                                      ${(s.price / 1000).toFixed(0)}k
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {filteredProds.length === 0 && (
                      <p className="px-3 py-4 text-xs text-muted-foreground italic">
                        Sin productos en esta categoría.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Resumen total */}
            {selProductos.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-xl border border-border">
                <span className="text-sm text-muted-foreground font-medium">
                  {cantidadTotal} producto
                  {cantidadTotal !== 1 ? "s" : ""} · Total
                </span>
                <span
                  className="text-base font-bold text-primary"
                  style={{ fontFamily: MONO }}
                >
                  ${totalCalculado.toLocaleString("es-CO")}
                </span>
              </div>
            )}
          </div>
          </div>

          <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              Cancelar
            </button>            <button
              onClick={() => void handleSave()}
              disabled={guardando}
              className={`flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors active:scale-95 ${guardando ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </motion.div>
        </div>
      </div>
    );
  }
// ─────────────────────────── VENTAS SCREEN ───────────────────────────

export function VentasScreen({
  pedidos,
  setPedidos,
  productos,
  onGestionarDevolucion,
  canCreate: _canCreate = true,
  canEdit = true,
  canExportExcel = true,
}: {
  pedidos: Venta[];
  setPedidos: React.Dispatch<React.SetStateAction<Venta[]>>;
  productos: ProductoMenu[];
  /** Lleva a la pantalla de devoluciones con esa venta ya seleccionada. */
  onGestionarDevolucion: (id: string) => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canExportExcel?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [detailItem, setDetailItem] = useState<Venta | null>(
    null,
  );
  // ── Verificación de pago ──
  // Motivo elegido en el modal de rechazo (vacío = ninguno todavía).
  const [motivoSel, setMotivoSel] = useState<MotivoRechazoOpcion | "">("");
  // Texto escrito cuando el motivo es "Otro": obligatorio, máx. 80 caracteres.
  const [motivoOtroTexto, setMotivoOtroTexto] = useState("");
  // Confirmación de verificación: aprobar el pago o rechazar con motivo.
  const [confirmVerif, setConfirmVerif] = useState<"aprobar" | "rechazar" | null>(null);
  // Modal "Pedir dinero faltante" (estado En espera).
  const [modalFaltante, setModalFaltante] = useState(false);
  const [montoFaltanteValor, setMontoFaltanteValor] = useState("");
  // ── Anulación desde el listado (primeros 10 minutos) ──
  /** Venta que se va a anular (null = modal cerrado). */
  const [ventaAnular, setVentaAnular] = useState<Venta | null>(null);
  const [anularMotivoSel, setAnularMotivoSel] = useState<MotivoAnulacion | "">("");
  const [anularOtroTexto, setAnularOtroTexto] = useState("");
  const [anularUrl, setAnularUrl] = useState<string | null>(null);
  const { subir: subirAnulacion, subiendo: subiendoAnulacion } = useSubirArchivo();
  const anularFileRef = useRef<HTMLInputElement | null>(null);
  /** Imagen abierta en el visor ampliado (comprobante u otro). */
  const [visorSrc, setVisorSrc] = useState<string | null>(null);
  /** Venta cuya factura se va a emitir, para elegir entre electrónica y física. */
  const [facturaVenta, setFacturaVenta] = useState<Venta | null>(null);

  /** Modal para enviar factura por correo. */
  const [enviarFacturaModal, setEnviarFacturaModal] = useState(false);
  const [facturaParaEnviar, setFacturaParaEnviar] = useState<Venta | null>(null);
  const [correoEnviar, setCorreoEnviar] = useState("");
  const [errorCorreo, setErrorCorreo] = useState("");

  /** Última hora registrada en el historial: es la hora en que se colocó el
      estado actual y la que se muestra a la derecha de la columna Estado. */
  const horaEstado = (p: Venta) =>
    p.historial?.[p.historial.length - 1]?.hora ?? "—";

  // ── Flujo de verificación de pago (Fase 3) ──

  /** Limpia todo el estado transitorio del panel/modal de verificación. */
  const resetVerificacion = () => {
    setMotivoSel("");
    setMotivoOtroTexto("");
    setConfirmVerif(null);
    setModalFaltante(false);
    setMontoFaltanteValor("");
  };

  const abrirDetalle = (v: Venta) => {
    resetVerificacion();
    setDetailItem(v);
    void obtenerVentaPanel(v.id).then(setDetailItem).catch((error) => toast.error(error instanceof Error ? error.message : "No se pudo cargar el detalle de la venta."));
  };
  const cerrarDetalle = () => {
    resetVerificacion();
    setDetailItem(null);
  };

  /** Aprobar el pago (punto C2): la venta pasa a "En preparación" y su orden
      de producción se crea sola (la escucha el efecto de App). Sólo cuando la
      orden se completa vuelve a avanzar, a "Por entregar". */
  const ejecutarVerificacion = async (id: string, payload: Parameters<typeof verificarVentaApi>[1]) => {
    try {
      await verificarVentaApi(id, payload);
      const respuesta = await (await import("../services/ventasApi")).obtenerVentasPanel();
      setPedidos(respuesta);
      toast.success(payload.accion === "aceptar" ? "Pago aprobado — orden de producción creada" : payload.accion === "monto_faltante" ? "Se notificó el saldo pendiente al cliente" : "Venta rechazada");
      cerrarDetalle();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo actualizar la venta."); }
  };

  const aprobarPago = (id: string) => {
    void ejecutarVerificacion(id, { accion: "aceptar" });
  };

  // ── Anulación desde el listado: ventana de 10 minutos ──
  // El backend calcula, al cargar la lista, cuántos segundos quedaban de la
  // ventana. Aquí se descuenta lo transcurrido desde esa carga para que el
  // botón se deshabilite solo; el límite real lo aplica siempre el servidor.
  const [ahora, setAhora] = useState(() => Date.now());
  const cargadoEnRef = useRef(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    cargadoEnRef.current = Date.now();
    setAhora(Date.now());
  }, [pedidos]);

  /** Segundos que aún quedan de la ventana de anulación de una venta. */
  const segundosAnulacion = (p: Venta) =>
    Math.max(0, (p.segundosRestantesAnulacion ?? 0) - Math.floor((ahora - cargadoEnRef.current) / 1000));

  /** ¿El botón "Anular" aplica a la fila? Sólo en estados anulables y
      mientras corran los primeros 10 minutos. */
  const puedeAnular = (p: Venta) =>
    ESTADOS_ANULABLES.includes(p.estado) && segundosAnulacion(p) > 0;

  /** Abre el modal de anulación ya limpio. */
  const abrirAnular = (v: Venta) => {
    setAnularMotivoSel("");
    setAnularOtroTexto("");
    setAnularUrl(null);
    setVentaAnular(v);
  };
  const cerrarAnular = () => setVentaAnular(null);

  /** Motivo que se envía: los fijos tal cual y "Otro" como "Otro: <texto>"
      (mismo formato que espera `validarMotivoAnulacion` en el servidor). */
  const motivoAnulacionFinal = () =>
    anularMotivoSel === "Otro" ? `Otro: ${anularOtroTexto.trim()}` : anularMotivoSel;

  const puedeConfirmarAnulacion =
    anularMotivoSel !== "" &&
    (anularMotivoSel !== "Otro" ||
      (anularOtroTexto.trim() !== "" && anularOtroTexto.trim().length <= MOTIVO_OTRO_MAX));

  /** Anula la venta elegida (motivo obligatorio, comprobante opcional) y
      recarga la lista. Si el backend rechaza la operación (por ejemplo, si se
      pasaron los 10 minutos), sólo avisa y la pantalla no cambia. */
  const anularVentaSeleccionada = async () => {
    const venta = ventaAnular;
    if (!venta || !puedeConfirmarAnulacion) return;
    try {
      await anularVentaApi(venta.id, {
        motivo: motivoAnulacionFinal(),
        comprobante: anularUrl ?? undefined,
      });
      setPedidos(await obtenerVentasPanel());
      cerrarAnular();
      toast.success(`Venta #${venta.id} anulada`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo anular la venta.");
    }
  };

  // ── Devolución desde el listado ──
  /** Venta que se va a marcar como devolución (null = sin modal). */
  const [ventaDevolver, setVentaDevolver] = useState<Venta | null>(null);
  const devolviendoRef = useRef(false);

  /** Marca la venta como devolución en el backend (Completado → Devolucion,
      con fila pendiente en tb_devolucion) y lleva a la pantalla de
      Devoluciones para gestionar el canje o la devolución del dinero. Si el
      backend rechaza la transición, sólo se avisa y la lista no cambia. */
  const confirmarDevolucionVenta = async () => {
    const venta = ventaDevolver;
    if (!venta || devolviendoRef.current) return;
    devolviendoRef.current = true;
    try {
      await marcarDevolucionApi(venta.id);
      setPedidos(await obtenerVentasPanel());
      setVentaDevolver(null);
      onGestionarDevolucion(venta.id);
      toast.success(`Venta #${venta.id} marcada como devolución`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la devolución.");
    } finally {
      devolviendoRef.current = false;
    }
  };

  /** Motivo de rechazo que se envía al backend: los motivos fijos viajan tal
      cual y "Otro" se guarda con el texto escrito, como "Otro: <texto>"
      (mismo formato que espera `validarMotivoRechazo` en el servidor). */
  const motivoRechazoFinal = () =>
    motivoSel === "Otro" ? `Otro: ${motivoOtroTexto.trim()}` : motivoSel;

  /** ¿Se puede confirmar el rechazo? Exige motivo y, si es "Otro", un texto
      obligatorio de hasta MOTIVO_OTRO_MAX caracteres. */
  const puedeConfirmarRechazo =
    motivoSel !== "" &&
    (motivoSel !== "Otro" || (motivoOtroTexto.trim() !== "" && motivoOtroTexto.trim().length <= MOTIVO_OTRO_MAX));

  /** Rechazar el pago: estado final "Rechazado", con el motivo elegido en el
      modal de confirmación. No pide comprobante ni devuelve dinero. */
  const rechazarPago = (id: string) => {
    if (!puedeConfirmarRechazo) return;
    void ejecutarVerificacion(id, { accion: "rechazar", motivo_rechazo: motivoRechazoFinal() });
  };

  /** Pedir el dinero faltante: la venta pasa a "En espera" con el monto. */
  const pedirFaltante = (id: string) => {
    const pagado = parseInt(montoFaltanteValor.replace(/\D/g, "")) || 0;
    void ejecutarVerificacion(id, { accion: "monto_faltante", pagado });
  };

  /** Cambio de estado: YA NO existe desde la tabla (punto C2). La columna es
      de solo lectura y cada avance sale de `estadosVenta.ts` (verificación,
      orden de producción y la hora de recogida). */

  const fmtCOP = (n: number) => `$${n.toLocaleString("es-CO")}`;

  // El listado de Ventas NO incluye las ventas en "Devolucion": una vez la
  // venta pasa a devolución vive solo en el módulo Devoluciones. La venta NUEVA
  // que nace de un canje (venta de reemplazo) sí sigue aquí, porque su estado
  // es "Por entregar" (o el que le toque), nunca "Devolucion".
  const ventasListado = useMemo(
    () => pedidos.filter((p) => p.estado !== "Devolucion"),
    [pedidos],
  );

  const exportExcel = () => {
    exportToExcel(
      ventasListado.map((p) => ({
        id: p.id,
        cliente: p.usuario,
        documento: p.documento ?? "",
        fecha: p.fecha,
        horaRecogida: hora12(p.horaRecogida),
        productos: p.productos,
        cantidad: p.cantidad,
        total: fmtCOP(p.total),
        estado: etiquetaEstadoVenta(p),
        horaEstado: horaEstado(p),
        metodoPago: p.metodoPago,
      })),
      [
        { key: "id", label: "ID" },
        { key: "cliente", label: "Cliente" },
        { key: "documento", label: "Documento" },
        { key: "fecha", label: "Fecha del pedido" },
        { key: "horaRecogida", label: "Hora de recogida" },
        { key: "productos", label: "Productos" },
        { key: "cantidad", label: "Cantidad" },
        { key: "total", label: "Total" },
        { key: "estado", label: "Estado" },
        { key: "horaEstado", label: "Hora del estado" },
        { key: "metodoPago", label: "Método de Pago" },
      ],
      "ventas"
    );
    toast.success("Excel descargado");
  };

  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const filtered = useMemo(
    () =>
      ventasListado.filter(
        (p) =>
          p.id.toLowerCase().includes(search.toLowerCase()) ||
          p.usuario
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          p.productos
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [ventasListado, search],
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE,
  );

  // Si el buscador o un borrado reducen el total, `page` puede quedar apuntando
  // más allá de la última página: la tabla salía vacía sin mensaje de "sin
  // resultados" y "Siguiente" ya no avanzaba (hacía `min(totalPages, p + 1)`).
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);


  return (
    <div className="px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            Gestión Ventas
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {ventasListado.length} ventas registradas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canExportExcel && <BotonDescargarExcel onClick={exportExcel} />}
          {_canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
            >
              <span className="text-lg leading-none">+</span>
              Nuevo pedido
            </button>
          )}
        </div>
      </div>

      {/* Banner — pagos por verificar */}
      {(() => {
        const pendientes = pedidos.filter(
          (p) => p.estado === "Por verificar",
        );
        if (pendientes.length === 0) return null;
        return (
          <div className="flex items-center gap-4 px-5 py-4 mb-5 bg-amber-50 border border-amber-200 rounded-2xl dark:bg-amber-500/10 dark:border-amber-500/25">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 dark:bg-amber-500/15">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {pendientes.length}{" "}
                {pendientes.length === 1
                  ? "pedido pendiente de verificación"
                  : "pedidos pendientes de verificación"}
              </p>
              <p className="text-xs text-amber-700 mt-0.5 dark:text-amber-300/80">
                Revisa el comprobante de pago y aprueba o
                rechaza cada pedido.
              </p>
            </div>
            <span className="shrink-0 text-xs font-bold px-3 py-1 rounded-full bg-amber-200 text-amber-900 animate-pulse dark:bg-amber-500/20 dark:text-amber-300 dark:animate-none">
              ● Requiere acción
            </span>
          </div>
        );
      })()}

      {/* Search */}
      <SearchInput
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Buscar por #, cliente o producto..."
      />

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {[
                  "ID",
                  "Cliente",
                  "Hora de recogida",
                  "Método de Pago",
                  "Total",
                  "Estado",
                  "Hora de estado",
                  "Acciones",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    <p className="text-4xl mb-3">📋</p>
                    <p>No se encontraron ventas</p>
                  </td>
                </tr>
              ) : (
                paged.map((p) => (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                       p.estado === "Por verificar"
                        ? "bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-500/5 dark:hover:bg-amber-500/10"
                         : p.estado === "En espera"
                          ? "bg-violet-50/60 hover:bg-violet-50 dark:bg-violet-500/5 dark:hover:bg-violet-500/10"
                          : "hover:bg-muted/20"
                    }`}
                  >
                    <td className="px-4 py-3.5 text-sm font-mono font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        {p.id}
                        {p.estado === "Por verificar" && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-foreground">
                      {p.usuario}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                      {p.horaRecogida ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                          {hora12(p.horaRecogida)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <PagoPill metodo={p.metodoPago} />
                    </td>
                    <td className="px-4 py-3.5 text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>
                      {fmtCOP(p.total)}
                    </td>
                    <td className="px-4 py-3.5">
                      {/* Punto C2: el estado es de SOLO LECTURA. La venta avanza
                          sola por el flujo (verificación → en preparación →
                          orden de producción → por entregar → completado) y en
                          la columna sólo se muestra el badge con su hora. */}
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${VENTA_STATUS_COLOR[p.estado]}`}
                      >
                        {etiquetaEstadoVenta(p)}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap"
                      style={{ fontFamily: MONO }}
                    >
                      {horaEstado(p)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {p.estado === "Por verificar" && (
                          <button
                            onClick={() => abrirDetalle(p)}
                            title="Verificar pago"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer text-xs font-semibold"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Verificar
                          </button>
                        )}
                        <ActionIcons onView={() => abrirDetalle(p)} />
                        {/* "Anular": sólo en estados anulables y dentro de los
                            primeros 10 minutos. Fuera de la ventana queda
                            atenuado y explica por qué. */}
                        {canEdit && ESTADOS_ANULABLES.includes(p.estado) && (
                          <button
                            onClick={() => { if (puedeAnular(p)) abrirAnular(p); }}
                            title={puedeAnular(p) ? "Anular venta" : "Solo se puede anular en los primeros 10 minutos"}
                            aria-label={puedeAnular(p) ? "Anular venta" : "Solo se puede anular en los primeros 10 minutos"}
                            className={`p-1.5 rounded-lg transition-colors ${
                              puedeAnular(p)
                                ? "text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                                : "text-muted-foreground/50 cursor-not-allowed"
                            }`}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        {/* Devolución: marca la venta como devuelta en el
                            backend y abre su gestión (canje o dinero). */}
                        {p.estado === "Completado" && (
                          <button
                            onClick={() => setVentaDevolver(p)}
                            title="Registrar devolución"
                            aria-label="Registrar devolución"
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Undo2 className="w-4 h-4" />
                          </button>
                        )}
                        {/* Imprimir factura: electrónica (se descarga el documento)
                            o física (sale por la impresora del sistema). */}
                        {!(["Por verificar", "En espera"].includes(p.estado)) && p.estado !== "Anulado" && (
                          <button
                            onClick={() => setFacturaVenta(p)}
                            title="Imprimir factura"
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > 0 && (
        <Paginador pagina={page} totalPaginas={totalPages} onCambio={setPage} />
      )}

      {/* ── Ver detalle — pantalla completa ── */}
      <AnimatePresence>
        {detailItem && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-background overflow-y-auto"
          >
            <div className="max-w-4xl mx-auto px-6 py-6">
              {/* Top bar */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={cerrarDetalle}
                  className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Volver a ventas
                </button>
                <span className="text-border">·</span>
                <span className="text-sm text-muted-foreground">Venta {detailItem.id}</span>
                <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${VENTA_STATUS_COLOR[detailItem.estado]}`}>
                  {etiquetaEstadoVenta(detailItem)}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-foreground mb-6" style={{ fontFamily: SERIF }}>
                Detalle de venta — ID {detailItem.id}
              </h1>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* COL 1 — Info + historial */}
                <div className="space-y-5">
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                      Información
                    </p>
                    <div className="space-y-3">
                      {[
                        { label: "ID Venta", value: detailItem.id },
                        { label: "Cliente",  value: detailItem.usuario },
                        ...(detailItem.documento
                          ? [{ label: "Documento", value: detailItem.documento }]
                          : []),
                        { label: "Fecha del pedido", value: detailItem.fecha },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
                          <p className="text-sm font-semibold text-foreground">{value}</p>
                        </div>
                      ))}
                      {detailItem.horaRecogida && (
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-0.5">Hora de recogida</p>
                          <p className="text-sm font-semibold text-foreground">🕐 {hora12(detailItem.horaRecogida)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">Método de pago</p>
                        {detailItem.metodoPago ? (
                          <PagoPill metodo={detailItem.metodoPago} />
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No registrado</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Historial */}
                  {detailItem.historial && detailItem.historial.length > 0 && (
                    <div className="bg-card border border-border rounded-2xl p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                        Historial de estados
                      </p>
                      <div className="space-y-3">
                        {detailItem.historial.map((h, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="flex flex-col items-center shrink-0">
                              <div className={`w-2.5 h-2.5 rounded-full ${i === detailItem.historial!.length - 1 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                              {i < detailItem.historial!.length - 1 && (
                                <div className="w-px flex-1 min-h-[20px] bg-border mt-1" />
                              )}
                            </div>
                            <div className="flex-1 flex items-center gap-2 pb-2">
                              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${VENTA_STATUS_COLOR[h.estado]}`}>
                                {VENTA_STATUS_LABEL[h.estado]}
                              </span>
                              <span className="text-xs text-muted-foreground ml-auto">{h.hora}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* COL 2 — Productos */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                    Productos del pedido
                  </p>
                  {detailItem.detalle && detailItem.detalle.length > 0 ? (
                    <div className="space-y-2">
                      {detailItem.detalle.map((d, i) => (
                        <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                          {d.imagen && (
                            <img src={d.imagen} alt={d.nombre} className="w-12 h-12 rounded-xl object-cover bg-muted shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{d.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {fmtCOP(d.precio)} × {d.cantidad}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-primary shrink-0" style={{ fontFamily: MONO }}>
                            {fmtCOP(d.precio * d.cantidad)}
                          </p>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-3 border-t border-border mt-1">
                        <span className="text-sm font-bold text-foreground">Total</span>
                        <span className="text-lg font-bold text-primary" style={{ fontFamily: MONO }}>
                          {fmtCOP(detailItem.detalle.reduce((s, d) => s + d.precio * d.cantidad, 0))}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">{detailItem.productos}</p>
                  )}
                </div>

                {/* COL 3 — Comprobante + verificación */}
                <div className="space-y-5">
                  {/* Comprobante(s) de transferencia: si hay más de uno (pago
                      inicial + dinero faltante), se muestran rotulados. */}
                  {(() => {
                    const comps = comprobantesDe(detailItem);
                    const etiquetas = ["Comprobante 1 — Pago inicial", "Comprobante 2 — Dinero faltante"];
                    return (
                      <div className="bg-card border border-border rounded-2xl p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                          Comprobante de transferencia
                        </p>
                        {comps.length > 0 ? (
                          <div className="space-y-3">
                            {comps.map((c, i) => (
                              <div key={i}>
                                {comps.length > 1 && (
                                  <p className="text-[11px] font-semibold text-foreground mb-1">
                                    {etiquetas[i] ?? `Comprobante ${i + 1}`}
                                    {(c.fecha || c.hora) && (
                                      <span className="text-muted-foreground font-normal">
                                        {" · "}
                                        {c.fecha}{c.hora ? ` ${c.hora}` : ""}
                                      </span>
                                    )}
                                  </p>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setVisorSrc(c.url)}
                                  title="Ampliar comprobante"
                                  className="block w-full rounded-xl overflow-hidden border border-border bg-muted cursor-zoom-in hover:border-primary/40 transition-colors"
                                >
                                  <img src={c.url} alt="Comprobante" className="w-full object-contain max-h-60" />
                                  <span className="block text-[11px] text-muted-foreground py-1">Clic para ampliar</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed border-border text-center">
                            <ImageIcon className="w-7 h-7 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">Sin comprobante</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Anulado: quién la anuló, el motivo, el valor a devolver y
                      el comprobante si lo hay. Un rechazo de verificación no
                      tiene `montoReembolso`, así que conserva su rótulo. */}
                  {detailItem.estado === "Anulado" && (() => {
                    const esAnulacion = detailItem.montoReembolso !== undefined;
                    const comprobante = detailItem.comprobanteAnulacion ?? detailItem.comprobanteDevolucion;
                    const titulo = detailItem.anuladoPor === "Cliente"
                      ? "Cancelado por el cliente"
                      : esAnulacion
                        ? "Venta anulada"
                        : "Pago rechazado";
                    return (
                      <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldX className="w-4 h-4 text-red-600 shrink-0" />
                          <p className="text-sm font-semibold text-red-900">{titulo}</p>
                        </div>
                        {detailItem.anuladoPor && (
                          <p className="text-sm text-red-800 mb-1">
                            Anulada por:{" "}
                            <span className="font-semibold">{detailItem.anuladoPor}</span>
                          </p>
                        )}
                        <p className="text-sm text-red-800 mb-1">
                          Motivo:{" "}
                          <span className="font-semibold">
                            {etiquetaMotivoRechazo(detailItem.motivoRechazo)}
                          </span>
                        </p>
                        {esAnulacion && (
                          <p className="text-sm text-red-800 mb-1">
                            Valor a devolver:{" "}
                            <span className="font-bold" style={{ fontFamily: MONO }}>
                              {fmtCOP(detailItem.montoReembolso ?? 0)}
                            </span>
                          </p>
                        )}
                        {comprobante && (
                          <div className="mt-3">
                            <p className="text-[11px] font-semibold text-red-800 mb-1">Comprobante de devolución</p>
                            {comprobante.endsWith(".pdf") ? (
                              <a
                                href={comprobante}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-semibold text-red-700 hover:border-red-400 transition-colors"
                              >
                                <FileText className="w-4 h-4 shrink-0" /> Abrir comprobante (PDF)
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setVisorSrc(comprobante)}
                                title="Ampliar comprobante de devolución"
                                className="block w-full rounded-xl overflow-hidden border border-red-200 bg-white cursor-zoom-in hover:border-red-400 transition-colors"
                              >
                                <img src={comprobante} alt="Comprobante de devolución" className="w-full object-contain max-h-56" />
                                <span className="block text-[11px] text-red-700 py-1">Clic para ampliar</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* En espera: se solicitó el dinero faltante. */}
                  {detailItem.estado === "En espera" && (
                    <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-violet-600 shrink-0" />
                        <p className="text-sm font-semibold text-violet-900">Falta completar el pago</p>
                      </div>
                      <p className="text-sm text-violet-800">
                        Total: <span className="font-bold">{fmtCOP(detailItem.total)}</span> · Recibido: <span className="font-bold">{fmtCOP(detailItem.montoPagado ?? 0)}</span> · Saldo: <span className="font-bold">{fmtCOP(detailItem.montoFaltante ?? 0)}</span>. El pedido
                        espera el comprobante del dinero restante.
                      </p>
                      <div className="mt-4">
                        <button onClick={() => setConfirmVerif("rechazar")} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-semibold text-white transition-colors active:scale-95 cursor-pointer">
                          <ShieldX className="w-4 h-4" /> Rechazar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Verificación de pago */}
                  {detailItem.estado === "Por verificar" && (() => {
                    const totalVenta = detailItem.total ||
                      (detailItem.detalle?.reduce((s, d) => s + d.precio * d.cantidad, 0) ?? 0);
                    const pagoInicial = detailItem.montoFaltante ? totalVenta - detailItem.montoFaltante : null;
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 dark:bg-amber-500/10 dark:border-amber-500/25">
                        <div className="flex items-center gap-2 mb-4">
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Verificación de pago</p>
                        </div>
                        <div className="space-y-3 mb-4">
                          <div className="bg-white dark:bg-card rounded-xl border border-amber-200 dark:border-amber-500/25 px-4 py-3">
                            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300/80 uppercase tracking-wide mb-0.5">Total a cobrar</p>
                            <p className="text-xl font-bold text-foreground" style={{ fontFamily: MONO }}>{fmtCOP(totalVenta)}</p>
                          </div>
                          {pagoInicial !== null && (
                            <>
                              <div className="bg-white dark:bg-card rounded-xl border border-amber-200 dark:border-amber-500/25 px-4 py-3">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Pagado inicialmente</p>
                                <p className="text-lg font-bold text-foreground" style={{ fontFamily: MONO }}>{fmtCOP(pagoInicial)}</p>
                              </div>
                              <div className="bg-white dark:bg-card rounded-xl border border-amber-200 dark:border-amber-500/25 px-4 py-3">
                                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300/80 uppercase tracking-wide mb-0.5">Faltante solicitado</p>
                                <p className="text-lg font-bold text-foreground" style={{ fontFamily: MONO }}>{fmtCOP(detailItem.montoFaltante ?? 0)}</p>
                              </div>
                            </>
                          )}
                          {/* Motivo: ya NO se elige aquí. Se pide en el modal
                              de confirmación que abre "Rechazar". */}
                        </div>

                        {/* Tres acciones: Aceptar, Monto faltante y Rechazar. */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmVerif("rechazar")}
                            title="Rechazar pago"
                            className="flex-1 flex items-center justify-center px-1 whitespace-nowrap py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors active:scale-95 cursor-pointer"
                          >
                            Rechazar
                          </button>
                          <button onClick={() => setModalFaltante(true)} className="flex-1 flex items-center justify-center px-1 whitespace-nowrap py-2.5 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 cursor-pointer transition-colors active:scale-95">
                            Monto faltante
                          </button>
                          <button onClick={() => setConfirmVerif("aprobar")} className="flex-1 flex items-center justify-center px-1 whitespace-nowrap py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors active:scale-95 cursor-pointer">
                            Aceptar
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Crear pedido ── */}
      <AnimatePresence>
        {showCreate && (
          <VentaModal
            productos={productos}
            onClose={() => setShowCreate(false)}
            onConfirm={async (v) => {
              try {
                const { id } = await crearVentaPanel({
                  cliente: {
                    tipo_documento: (v as Venta).tipoDocumento ?? "CC",
                    numero_documento: v.documento ?? "",
                    nombre: v.usuario,
                  },
                  // Sin hora: el backend auto-asigna ahora + 25 minutos
                  // (pedido tomado en local, tiempo de preparación).
                  productos: (v.detalle ?? []).map((detalle) => ({
                    id_producto: Number(detalle.productoId),
                    cantidad: detalle.cantidad,
                    tamano: detalle.tamaño ?? null,
                  })),
                  pago: { tipo: v.metodoPago ?? "" },
                });
                const ventasActualizadas = await obtenerVentasPanel();
                setPedidos(ventasActualizadas);
                setShowCreate(false);
                toast.success(`Pedido #${id} registrado correctamente`);
                return true;
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "No se pudo registrar el pedido.");
                return false;
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Verificación: confirmar Aprobar / Rechazar (el motivo se elige
             aquí mismo, en un modal que exige al menos una opción) ── */}
      <AnimatePresence>
        {confirmVerif && detailItem && (() => {
          const esRechazo = confirmVerif === "rechazar";
          const motivoFinal = esRechazo && puedeConfirmarRechazo ? motivoRechazoFinal() : "";
          return (
            <ConfirmModal
              title={esRechazo ? "Rechazar pago" : "Aprobar pago"}
              tone={esRechazo ? "peligro" : "aviso"}
              message={
                esRechazo
                  ? `¿Rechazar el pago${motivoFinal ? ` por ${motivoFinal}` : ""}? La venta quedará Rechazado.`
                  : "¿Aceptar el pago? Se creará la orden de producción y el pedido quedará Por entregar."
              }
              confirmLabel={esRechazo ? "Confirmar rechazo" : "Sí, confirmar"}
              confirmDisabled={esRechazo && !puedeConfirmarRechazo}
              onConfirm={() => {
                if (esRechazo) rechazarPago(detailItem.id);
                else aprobarPago(detailItem.id);
                setConfirmVerif(null);
              }}
              onCancel={() => setConfirmVerif(null)}
            >
              {esRechazo && (
                <div className="mb-5 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Motivo del rechazo *
                  </p>
                  <div className="space-y-1.5">
                    {MOTIVOS_RECHAZO.map((m) => (
                      <label
                        key={m.value}
                        className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                          motivoSel === m.value
                            ? "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <input
                          type="radio"
                          name="motivo-rechazo-verificacion"
                          value={m.value}
                          checked={motivoSel === m.value}
                          onChange={() => setMotivoSel(m.value)}
                          className="mt-0.5 accent-red-600 cursor-pointer"
                        />
                        <span className="text-sm text-foreground leading-snug">{m.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* "Otro": exige el texto que quedará como "Otro: <texto>". */}
                  {motivoSel === "Otro" && (
                    <div>
                      <label
                        htmlFor="motivo-rechazo-otro"
                        className="block text-xs font-semibold text-muted-foreground mb-1"
                      >
                        Describe el motivo *
                      </label>
                      <textarea
                        id="motivo-rechazo-otro"
                        value={motivoOtroTexto}
                        onChange={(e) => setMotivoOtroTexto(e.target.value.slice(0, MOTIVO_OTRO_MAX))}
                        maxLength={MOTIVO_OTRO_MAX}
                        rows={2}
                        placeholder="Ej.: el cliente envió una foto de otro pedido"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-red-400"
                      />
                      <div className="flex justify-between gap-3 mt-1">
                        <p className="text-[11px] text-red-600">
                          {motivoOtroTexto.trim() === "" ? "El texto es obligatorio." : ""}
                        </p>
                        <p className="text-[11px] text-muted-foreground shrink-0" style={{ fontFamily: MONO }}>
                          {motivoOtroTexto.length}/{MOTIVO_OTRO_MAX}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ConfirmModal>
          );
        })()}
      </AnimatePresence>

      {/* ── Pedir dinero faltante (→ En espera) ── */}
      <AnimatePresence>
        {modalFaltante && detailItem && (() => {
          const totalVenta = detailItem.total ||
            (detailItem.detalle?.reduce((s, d) => s + d.precio * d.cantidad, 0) ?? 0);
          const monto = parseInt(montoFaltanteValor.replace(/\D/g, "")) || 0;
          const valido = montoFaltanteValor !== "" && monto >= 0 && monto < totalVenta;
          return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <p className="font-bold text-foreground">Pedir dinero faltante</p>
                  <button onClick={() => setModalFaltante(false)} className="p-1 rounded-lg hover:bg-muted cursor-pointer" aria-label="Cerrar">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    El pedido pasa a <span className="font-semibold">En espera</span> y el cliente podrá enviar el comprobante del dinero restante.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Valor recibido *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej.: 25000"
                      value={montoFaltanteValor ? fmtCOP(monto) : ""}
                      onChange={(e) => setMontoFaltanteValor(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:border-primary"
                      style={{ fontFamily: MONO }}
                    />
                    {monto > 0 && !valido && (
                      <p className="text-xs text-red-600 mt-1">
                        El valor recibido debe ser menor al total ({fmtCOP(totalVenta)}).
                      </p>
                    )}
                    {montoFaltanteValor !== "" && valido && <p className="text-xs text-muted-foreground mt-1">Saldo pendiente calculado: {fmtCOP(totalVenta - monto)}</p>}
                  </div>
                </div>
                <div className="flex gap-2 px-5 pb-5">
                  <button
                    onClick={() => setModalFaltante(false)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => { if (valido) pedirFaltante(detailItem.id); }}
                    disabled={!valido}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${valido ? "bg-violet-600 hover:bg-violet-700 cursor-pointer" : "bg-violet-600/50 opacity-50 cursor-not-allowed"}`}
                  >
                    Confirmar
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Registrar devolución (venta Completado → Devolucion): aviso, no
             confirmación destructiva — la gestión real (canje/dinero) ocurre
             en la pantalla de Devoluciones ── */}
      <AnimatePresence>
        {ventaDevolver && (
          <ConfirmModal
            title="Registrar devolución"
            tone="aviso"
            message={`¿Marcar la venta #${ventaDevolver.id} de ${ventaDevolver.usuario} como devolución? Luego se gestiona el canje o la devolución del dinero.`}
            confirmLabel="Sí, registrar devolución"
            onCancel={() => setVentaDevolver(null)}
            onConfirm={() => void confirmarDevolucionVenta()}
          />
        )}
      </AnimatePresence>

      {/* ── Anular venta (sólo los primeros 10 minutos): motivo obligatorio,
             comprobante opcional y valor a devolver según el motivo ── */}
      <AnimatePresence>
        {ventaAnular && (() => {
          const porcentaje = porcentajeReembolsoAnulacion(anularMotivoSel);
          const total = ventaAnular.total;
          return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                      <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">Anular venta</p>
                      <p className="text-xs text-muted-foreground truncate">
                        Pedido #{ventaAnular.id} · {ventaAnular.usuario}
                      </p>
                    </div>
                  </div>
                  <button onClick={cerrarAnular} className="p-1 rounded-lg hover:bg-muted cursor-pointer" aria-label="Cerrar">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  <p className="text-sm text-muted-foreground">
                    La venta quedará en <span className="font-semibold">Anulado</span> y sus pagos como{" "}
                    <span className="font-semibold">Rechazado</span>. Sólo se puede anular dentro de los primeros
                    10 minutos de haber creado el pedido.
                  </p>

                  {/* Motivo obligatorio: la misma lista que valida el backend. */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                      Motivo de la anulación *
                    </p>
                    <div className="space-y-1.5">
                      {MOTIVOS_ANULACION.map((m) => (
                        <label
                          key={m.value}
                          className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                            anularMotivoSel === m.value
                              ? "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          <input
                            type="radio"
                            name="motivo-anulacion"
                            value={m.value}
                            checked={anularMotivoSel === m.value}
                            onChange={() => setAnularMotivoSel(m.value)}
                            className="mt-0.5 accent-red-600 cursor-pointer"
                          />
                          <span className="text-sm text-foreground leading-snug">{m.label}</span>
                        </label>
                      ))}
                    </div>

                    {/* "Otro": exige el texto que quedará como "Otro: <texto>". */}
                    {anularMotivoSel === "Otro" && (
                      <div className="mt-2">
                        <label
                          htmlFor="motivo-anulacion-otro"
                          className="block text-xs font-semibold text-muted-foreground mb-1"
                        >
                          Describe el motivo *
                        </label>
                        <textarea
                          id="motivo-anulacion-otro"
                          value={anularOtroTexto}
                          onChange={(e) => setAnularOtroTexto(e.target.value.slice(0, MOTIVO_OTRO_MAX))}
                          maxLength={MOTIVO_OTRO_MAX}
                          rows={2}
                          placeholder="Ej.: el cliente pidió cambiar la hora de recogida"
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-red-400"
                        />
                        <div className="flex justify-between gap-3 mt-1">
                          <p className="text-[11px] text-red-600">
                            {anularOtroTexto.trim() === "" ? "El texto es obligatorio." : ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground shrink-0" style={{ fontFamily: MONO }}>
                            {anularOtroTexto.length}/{MOTIVO_OTRO_MAX}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comprobante de la devolución: OPCIONAL. */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                      Comprobante de la devolución (opcional)
                    </p>
                    <CampoComprobante
                      fileRef={anularFileRef}
                      url={anularUrl}
                      onQuitar={() => setAnularUrl(null)}
                      subiendo={subiendoAnulacion}
                      onSubir={(file) => {
                        void subirAnulacion(file, "comprobantes").then((url) => {
                          if (url) setAnularUrl(url);
                        });
                      }}
                      etiquetaBoton="Adjuntar comprobante"
                    />
                  </div>

                  {/* Valor a devolver según el motivo. */}
                  <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Total del pedido</span>
                      <span className="font-semibold" style={{ fontFamily: MONO }}>{fmtCOP(total)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Motivo</span>
                      <span className="font-semibold text-right">
                        {anularMotivoSel
                          ? anularMotivoSel === "Otro"
                            ? anularOtroTexto.trim() || "Otro"
                            : anularMotivoSel
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm border-t border-border pt-1.5">
                      <span className="font-semibold text-foreground">
                        Valor a devolver ({Math.round(porcentaje * 100)} %)
                      </span>
                      <span className="font-bold text-red-600" style={{ fontFamily: MONO }}>
                        {fmtCOP(Math.round(total * porcentaje))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 px-5 pb-5">
                  <button
                    onClick={cerrarAnular}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => void anularVentaSeleccionada()}
                    disabled={!puedeConfirmarAnulacion}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                      puedeConfirmarAnulacion
                        ? "bg-red-600 hover:bg-red-700 cursor-pointer"
                        : "bg-red-600/50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    Anular venta
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Elegir cómo emitir la factura ── */}
      <AnimatePresence>
        {facturaVenta && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Printer className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">Imprimir factura</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Pedido #{facturaVenta.id} · {facturaVenta.usuario}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFacturaVenta(null)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    descargarFactura(facturaVenta);
                    toast.success("Factura electrónica descargada");
                    setFacturaVenta(null);
                  }}
                  className="w-full flex items-center gap-3 p-3.5 text-left bg-card border border-border rounded-xl hover:border-violet-400 hover:bg-violet-500/5 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">Factura electrónica</p>
                    <p className="text-xs text-muted-foreground">
                      Descarga el documento con los datos de la venta
                    </p>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFacturaParaEnviar(facturaVenta);
                    setCorreoEnviar("");
                    setErrorCorreo("");
                    setEnviarFacturaModal(true);
                    setFacturaVenta(null);
                  }}
                  className="w-full flex items-center gap-3 p-3.5 text-left bg-card border border-border rounded-xl hover:border-sky-400 hover:bg-sky-500/5 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      Enviar factura a correo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Descarga y envía la factura al correo electrónico
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    imprimirFactura(facturaVenta);
                    toast.success("Enviando a la impresora");
                    setFacturaVenta(null);
                  }}
                  className="w-full flex items-center gap-3 p-3.5 text-left bg-card border border-border rounded-xl hover:border-emerald-400 hover:bg-emerald-500/5 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Printer className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">Factura física</p>
                    <p className="text-xs text-muted-foreground">
                      Ticket de 80 mm para la impresora del sistema
                    </p>
                  </div>
                </button>

                <p className="pt-1 text-[11px] text-muted-foreground text-center">
                  Total a facturar:{" "}
                  <span className="font-bold text-foreground">
                    {fmtCOP(facturaVenta.total)}
                  </span>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Visor ampliado del comprobante (clic en la miniatura del detalle). */}
      <VisorImagen
        src={visorSrc}
        alt="Comprobante de pago"
        onClose={() => setVisorSrc(null)}
      />
    </div>
  );
}