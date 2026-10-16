import React, { useEffect, useState, useMemo, useRef } from "react";
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
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Printer,
  FileText,
  Download,
  ImageIcon,
  Ban,
  Undo2,
  CalendarDays,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { BotonDescargarExcel } from "@/shared/components/BotonDescargarExcel";
import { filtrarDocumento, validarDocumento } from "@/shared/components/campo";
import { OPCIONES_TIPO_DOCUMENTO } from "@/shared/utils/tiposDocumento";
import { EstadoSelect } from "@/shared/components/EstadoSelect";
import { VisorImagen } from "@/shared/components/VisorImagen";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginador";
import { ActionIcons } from "@/shared/components/ActionIcons";
import { useSubirArchivo } from "@/shared/hooks/useSubirArchivo";
import { hoyISO } from "@/shared/utils/fechas";
import { descargarFactura, imprimirFactura } from "@/features/ventas/services/facturaVenta";
import { exportToExcel } from "@/features/ventas/services/exportExcel";

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
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** "aviso" pinza el botón en naranja, para acciones que no son destructivas
      (p. ej. registrar una devolución). */
  tone?: "peligro" | "aviso";
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
        <p className="text-muted-foreground mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 text-white rounded-xl font-semibold transition-colors active:scale-95 cursor-pointer ${
              esAviso
                ? "bg-orange-600 hover:bg-orange-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            Sí, confirmar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────── VENTAS TYPES & DATA ───────────────────────────

export type VentaStatus =
  | "venta"
  | "perdida"
  | "por-verificar"
  | "completado"
  | "anulado"
  | "rechazado"
  | "en-espera";

/** "anulado" y "perdida" ya no se eligen desde el desplegable de estado de la
    tabla: se aplican con los botones de acción (anular / devolución). */
export const VENTA_STATUS_MANUALES: VentaStatus[] = ["perdida", "anulado"];

/** Estados que solo asigna el flujo de verificación (nunca el selector):
    "rechazado" (rechazo con motivo) y "en-espera" (falta completar el pago). */
export const VENTA_STATUS_FLUJO: VentaStatus[] = ["rechazado", "en-espera"];

/** Motivos estandarizados de rechazo de pago. */
export type MotivoRechazo = "comprobante-falso" | "dinero-faltante";

export const MOTIVOS_RECHAZO: { value: MotivoRechazo; label: string }[] = [
  { value: "comprobante-falso", label: "Comprobante falso" },
  { value: "dinero-faltante", label: "Dinero faltante" },
];

export const MOTIVO_RECHAZO_LABEL: Record<MotivoRechazo, string> = {
  "comprobante-falso": "Comprobante falso",
  "dinero-faltante": "Dinero faltante",
};

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
  /** Motivo por el que se rechazó el pago (solo en estado "rechazado"). */
  motivoRechazo?: MotivoRechazo;
  /** Valor que falta por pagar cuando la venta quedó "en-espera". */
  montoFaltante?: number;
  /** URL del comprobante con el que el admin devolvió el dinero al cliente. */
  comprobanteDevolucion?: string;
}

/** Colores de estado de la venta, con variante dark (fondo translúcido
    oscuro y texto claro del mismo tono) para el pill de la tabla y los
    badges de detalle/historial. */
const VENTA_STATUS_COLOR: Record<VentaStatus, string> = {
  venta:           "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  perdida:         "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
  "por-verificar": "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  completado:      "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  anulado:         "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  rechazado:       "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  // Naranja/violeta, deliberadamente distinto a los demás para que "en espera"
  // no se confunda con "por verificar" (ámbar) ni con "devolución" (naranja).
  "en-espera":     "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300",
};

const VENTA_STATUS_LABEL: Record<VentaStatus, string> = {
  venta:           "Por entregar",
  perdida:         "Devolución",
  "por-verificar": "Por verificar",
  completado:      "Completado",
  anulado:         "Anulado",
  rechazado:       "Rechazado",
  "en-espera":     "En espera",
};

/** Etiquetas PARA EL CLIENTE de cada estado (tabla de la sección 3). El panel
    admin usa `VENTA_STATUS_LABEL`; el portal del cliente estas. */
export const VENTA_STATUS_LABEL_CLIENTE: Record<VentaStatus, string> = {
  "por-verificar": "Verificando pago",
  venta:           "Listo para recoger",
  completado:      "Entregado",
  rechazado:       "Rechazado",
  "en-espera":     "Falta completar el pago",
  perdida:         "Devolución",
  anulado:         "Anulado",
};

/** Estados ofrecidos por el desplegable de la tabla, en el orden fijo del
    flujo de verificación: Por verificar → Por entregar → Completado. Los
    anulados y las devoluciones se aplican con sus botones de acción, y los
    estados "rechazado"/"en-espera" los asigna el flujo (nunca el selector);
    por eso no aparecen aquí. */
export const VENTA_STATUS_SELECCIONABLES: VentaStatus[] = [
  "por-verificar",
  "venta",
  "completado",
];

/** Métodos de pago. "Efectivo" solo existe para los pedidos que genera el
    administrador (pedidos tomados en el local). */
export const METODO_PAGO_BASE = ["Nequi", "Bancolombia"] as const;
export const METODO_PAGO_ADMIN = [...METODO_PAGO_BASE, "Efectivo"] as const;

export type MetodoPago = (typeof METODO_PAGO_ADMIN)[number] | "";

const METODO_PAGO_ESTILO: Record<
  Exclude<MetodoPago, "">,
  { pill: string; btn: string; icono: string }
> = {
  Nequi:       { pill: "bg-purple-100 text-purple-800", btn: "bg-purple-600 border-purple-600", icono: "💜" },
  Bancolombia: { pill: "bg-yellow-100 text-yellow-800",  btn: "bg-yellow-500 border-yellow-500",  icono: "🏦" },
  Efectivo:    { pill: "bg-emerald-100 text-emerald-800", btn: "bg-emerald-600 border-emerald-600", icono: "💵" },
};

const nowHora = () =>
  new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

/** Etiqueta del método de pago con su color. "Efectivo" es exclusivo de los
    pedidos que crea el administrador. Se exporta para que Devoluciones muestre
    el mismo icono y color sin duplicar la tabla de métodos. */
export function PagoPill({ metodo }: { metodo?: string }) {
  const est = METODO_PAGO_ESTILO[metodo as Exclude<MetodoPago, "">];
  if (!est) {
    return (
      <span className="text-xs text-muted-foreground italic">—</span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${est.pill}`}
    >
      {est.icono} {metodo}
    </span>
  );
}

/** Fecha local en formato YYYY-MM-DD (el que espera CalendarDropdown). */
const hoyFecha = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const INITIAL_VENTAS: Venta[] = [
  {
    id: "1",
    usuario: "María González",
    fecha: "2024-01-15",
    productos: "Pizza Peperoni x2",
    cantidad: 2,
    total: 28000,
    estado: "venta",
    metodoPago: "Nequi",
    historial: [{ estado: "por-verificar", hora: "4:10 PM" }, { estado: "venta", hora: "4:15 PM" }],
    detalle: [
      {
        nombre: "Pizza Peperoni",
        precio: 14000,
        cantidad: 2,
        imagen: "/src/assets/img/pizzaDefinitiva.png",
      },
    ],
  },
  {
    id: "2",
    historial: [{ estado: "venta" as VentaStatus, hora: "5:02 PM" }],
    usuario: "Carlos Martínez",
    fecha: "2024-01-15",
    productos: "Pizza Jamon x1",
    cantidad: 1,
    total: 14000,
    estado: "venta",
    metodoPago: "Bancolombia",
    detalle: [
      {
        nombre: "Pizza Jamon",
        precio: 14000,
        cantidad: 1,
        imagen: "/src/assets/img/pizzaDefinitivaCompleta.png",
      },
    ],
  },
  {
    id: "3",
    historial: [{ estado: "por-verificar" as VentaStatus, hora: "6:30 PM" }, { estado: "venta" as VentaStatus, hora: "6:45 PM" }],
    usuario: "Ana Rodríguez",
    fecha: "2024-01-16",
    productos: "Pizza Hawai x3",
    cantidad: 3,
    total: 45000,
    estado: "venta",
    metodoPago: "Nequi",
    detalle: [
      {
        nombre: "Pizza Hawai",
        precio: 15000,
        cantidad: 3,
        imagen: "/src/assets/img/pizzafondo-removebg-preview.png",
      },
    ],
  },
  {
    id: "4",
    historial: [{ estado: "por-verificar" as VentaStatus, hora: "7:00 PM" }, { estado: "perdida" as VentaStatus, hora: "7:20 PM" }],
    usuario: "Jorge Vargas",
    fecha: "2024-01-16",
    productos: "Pizza Pollo x1",
    cantidad: 1,
    total: 15000,
    estado: "perdida",
    metodoPago: "Bancolombia",
    detalle: [
      {
        nombre: "Pizza Pollo",
        precio: 15000,
        cantidad: 1,
        imagen: "/src/assets/img/image-1.png",
      },
    ],
  },
  {
    id: "5",
    historial: [{ estado: "venta" as VentaStatus, hora: "8:05 PM" }],
    usuario: "Patricia Soto",
    fecha: "2024-01-17",
    productos: "Pizza Cañon x2, Gaseosa Cuatro x1",
    cantidad: 3,
    total: 31000,
    estado: "venta",
    metodoPago: "Nequi",
    detalle: [
      {
        nombre: "Pizza Cañon",
        precio: 16000,
        cantidad: 2,
        imagen: "/src/assets/img/image-2.png",
      },
      {
        nombre: "Gaseosa Cuatro",
        precio: 3000,
        cantidad: 1,
        imagen: "/src/assets/img/Quatro.png",
      },
    ],
  },
  {
    id: "6",
    historial: [{ estado: "perdida" as VentaStatus, hora: "9:10 PM" }],
    usuario: "Luis Herrera",
    fecha: "2024-01-17",
    productos: "Lasaña Carne x2",
    cantidad: 2,
    total: 40000,
    estado: "perdida",
    metodoPago: "Bancolombia",
    detalle: [
      {
        nombre: "Lasaña Carne",
        precio: 20000,
        cantidad: 2,
        imagen: "/src/assets/img/lasaña_carne.png",
      },
    ],
  },
  {
    id: "7",
    historial: [{ estado: "perdida" as VentaStatus, hora: "9:45 PM" }],
    usuario: "Sandra Ríos",
    fecha: "2024-01-18",
    productos: "Pizza Maicitos x1",
    cantidad: 1,
    total: 13000,
    estado: "perdida",
    metodoPago: "Nequi",
    detalle: [
      {
        nombre: "Pizza Maicitos",
        precio: 13000,
        cantidad: 1,
        imagen: "/src/assets/img/image-3.png",
      },
    ],
  },
  {
    id: "8",
    historial: [{ estado: "perdida" as VentaStatus, hora: "8:30 PM" }],
    usuario: "Jorge Vargas",
    fecha: "2024-01-16",
    productos: "Pizza Paisa x1",
    cantidad: 1,
    total: 18000,
    estado: "perdida",
    metodoPago: "Bancolombia",
    detalle: [
      {
        nombre: "Pizza Paisa",
        precio: 18000,
        cantidad: 1,
        imagen: "/src/assets/img/image-4.png",
      },
    ],
  },
  {
    id: "9",
    usuario: "Sebastián Gómez",
    fecha: "2024-01-14",
    productos: "Pizza Tocineta x1",
    cantidad: 1,
    total: 15000,
    estado: "completado",
    metodoPago: "Nequi",
    horaRecogida: "18:30",
    historial: [
      { estado: "por-verificar", hora: "5:40 PM" },
      { estado: "venta", hora: "5:46 PM" },
      { estado: "completado", hora: "6:35 PM" },
    ],
    detalle: [
      { nombre: "Pizza Tocineta — Mediana", precio: 15000, cantidad: 1, imagen: "/src/assets/img/image-5.png" },
    ],
  },
];

// ─────────────────────────── VENTAS SCREEN ───────────────────────────

export function VentasScreen({
  pedidos,
  setPedidos,
  productos,
  onGestionarDevolucion,
  clientes = [],
  usuarios = [],
  empleados = [],
  onRegistrarClienteVenta,
  canCreate: _canCreate = true,
  canEdit: _canEdit = true,
  canExportExcel = true,
}: {
  pedidos: Venta[];
  setPedidos: React.Dispatch<React.SetStateAction<Venta[]>>;
  productos: ProductoMenu[];
  /** Lleva a la pantalla de devoluciones con esa venta ya seleccionada. */
  onGestionarDevolucion: (id: string) => void;
  /** Clientes registrados en el panel. Se usan para buscar el documento en
      tiempo real al crear un pedido (§12). */
  clientes?: { nombre: string; tipoDocumento?: string; numeroDocumento: string }[];
  /** Usuarios y empleados del sistema: alimentan la misma búsqueda de
      documento para saber si la persona ya existe antes de crear un cliente. */
  usuarios?: { nombre: string; tipoDocumento: string; numeroDocumento: string }[];
  empleados?: { nombre: string; tipoDocumento: string; numeroDocumento: string }[];
  /** §1: crea o actualiza el cliente antes de guardar la venta. Devuelve
      "creado" si nació un Cliente nuevo y "existente" si ya estaba (como
      cliente, usuario o empleado). */
  onRegistrarClienteVenta?: (
    datos: { tipoDocumento: string; numeroDocumento: string; nombre: string },
  ) => "creado" | "existente";
  canCreate?: boolean;
  canEdit?: boolean;
  canExportExcel?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [detailItem, setDetailItem] = useState<Venta | null>(
    null,
  );
  // ── Verificación de pago (Fase 3) ──
  // Motivo elegido en el panel de verificación (vacío = ninguno).
  const [motivoSel, setMotivoSel] = useState<MotivoRechazo | "">("");
  // Confirmación simple (aprobar / rechazar por comprobante falso).
  const [confirmVerif, setConfirmVerif] = useState<"aprobar" | "rechazar-falso" | null>(null);
  // Modal "Pedir dinero faltante" (estado En espera).
  const [modalFaltante, setModalFaltante] = useState(false);
  const [montoFaltanteValor, setMontoFaltanteValor] = useState("");
  // Modal "Devolución del dinero recibido" (rechazo por dinero faltante).
  const [modalDevolucion, setModalDevolucion] = useState(false);
  const [devolUrl, setDevolUrl] = useState<string | null>(null);
  const { subir: subirDevol, subiendo: subiendoDevol } = useSubirArchivo();
  const devolFileRef = useRef<HTMLInputElement | null>(null);
  /** Imagen abierta en el visor ampliado (comprobante u otro). */
  const [visorSrc, setVisorSrc] = useState<string | null>(null);
  const [confirmAccionV, setConfirmAccionV] = useState<{
    id: string;
    accion: "anular" | "devolucion";
  } | null>(null);
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
    setConfirmVerif(null);
    setModalFaltante(false);
    setMontoFaltanteValor("");
    setModalDevolucion(false);
    setDevolUrl(null);
  };

  const abrirDetalle = (v: Venta) => {
    resetVerificacion();
    setDetailItem(v);
  };
  const cerrarDetalle = () => {
    resetVerificacion();
    setDetailItem(null);
  };

  /** Aprobar el pago: la venta pasa a "Por entregar" (listo para recoger). */
  const aprobarPago = (id: string) => {
    setPedidos((prev) =>
      prev.map((x) =>
        x.id === id
          ? { ...x, estado: "venta" as VentaStatus, historial: [...(x.historial ?? []), { estado: "venta" as VentaStatus, hora: nowHora() }] }
          : x,
      ),
    );
    toast.success("Pago aprobado — listo para entregar");
    cerrarDetalle();
  };

  /** Rechazar por comprobante falso: estado final "Rechazado", sin devolución. */
  const rechazarPorFalso = (id: string) => {
    setPedidos((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              estado: "rechazado" as VentaStatus,
              motivoRechazo: "comprobante-falso" as MotivoRechazo,
              historial: [...(x.historial ?? []), { estado: "rechazado" as VentaStatus, hora: nowHora() }],
            }
          : x,
      ),
    );
    toast.error("Pago rechazado — comprobante falso");
    cerrarDetalle();
  };

  /** Pedir el dinero faltante: la venta pasa a "En espera" con el monto. */
  const pedirFaltante = (id: string) => {
    const monto = parseInt(montoFaltanteValor.replace(/\D/g, "")) || 0;
    setPedidos((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              estado: "en-espera" as VentaStatus,
              motivoRechazo: "dinero-faltante" as MotivoRechazo,
              montoFaltante: monto,
              historial: [...(x.historial ?? []), { estado: "en-espera" as VentaStatus, hora: nowHora() }],
            }
          : x,
      ),
    );
    toast.info(`Se solicitó el faltante de ${fmtCOP(monto)}`);
    cerrarDetalle();
  };

  /** Rechazar por dinero faltante: guarda el comprobante de devolución y la
      venta queda "Rechazado" (estado final). */
  const rechazarPorDinero = (id: string) => {
    if (!devolUrl) return;
    setPedidos((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              estado: "rechazado" as VentaStatus,
              motivoRechazo: "dinero-faltante" as MotivoRechazo,
              comprobanteDevolucion: devolUrl,
              historial: [...(x.historial ?? []), { estado: "rechazado" as VentaStatus, hora: nowHora() }],
            }
          : x,
      ),
    );
    toast.error("Pago rechazado — dinero devuelto al cliente");
    cerrarDetalle();
  };

  /** Anular una venta: el pedido queda en el estado "anulado" y deja de contar
      como venta, sin tocar el módulo de devoluciones. */
  const anularVenta = (id: string) => {
    setPedidos((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              estado: "anulado" as VentaStatus,
              historial: [...(x.historial ?? []), { estado: "anulado" as VentaStatus, hora: nowHora() }],
            }
          : x,
      ),
    );
    toast.success("Venta anulada");
  };

  /** Registrar una devolución: la venta pasa a "Devolución" y queda disponible
      en el módulo de devoluciones para resolverla. */
  const registrarDevolucion = (id: string) => {
    setPedidos((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              estado: "perdida" as VentaStatus,
              devolucionResuelta: false,
              historial: [...(x.historial ?? []), { estado: "perdida" as VentaStatus, hora: nowHora() }],
            }
          : x,
      ),
    );
    toast.success("Devolución registrada");
  };

  /** Cambio de estado desde el menú de la columna Estado. Solo se ofrecen los
      estados seleccionables (Por verificar, Por entregar, Completado); la
      devolución y la anulación siguen yendo por sus botones, que además
      marcan campos propios de la devolución. Cada cambio queda en el
      historial, que es lo que alimenta la columna "Hora de estado". */
  const cambiarEstado = (id: string, estado: VentaStatus) => {
    setPedidos((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              estado,
              historial: [...(x.historial ?? []), { estado, hora: nowHora() }],
            }
          : x,
      ),
    );
    toast.success(`Estado actualizado: ${VENTA_STATUS_LABEL[estado]}`);
  };

  const fmtCOP = (n: number) => `$${n.toLocaleString("es-CO")}`;

  const exportExcel = () => {
    exportToExcel(
      pedidos.map((p) => ({
        id: p.id,
        cliente: p.usuario,
        documento: p.documento ?? "",
        fecha: p.fecha,
        horaRecogida: hora12(p.horaRecogida),
        productos: p.productos,
        cantidad: p.cantidad,
        total: fmtCOP(p.total),
        estado: VENTA_STATUS_LABEL[p.estado],
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
      pedidos.filter(
        (p) =>
          p.id.toLowerCase().includes(search.toLowerCase()) ||
          p.usuario
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          p.productos
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [pedidos, search],
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

  // Lista de usuarios registrados para el autocomplete
  const USUARIOS_LISTA = [
    "Gloria Inés Vargas",
    "Sebastián Gómez",
    "María González",
    "Carlos Martínez",
    "Ana Rodríguez",
    "Jorge Vargas",
    "Patricia Soto",
    "Luis Herrera",
    "Sandra Ríos",
    "Tomás Jiménez",
    "Valentina Mora",
    "Andrés Castillo",
  ];

  // Índice de documentos conocidos: clientes, usuarios y empleados (se
  // compara tipo + número de documento) más las ventas previas (solo número).
  // Alimenta la búsqueda en tiempo real del modal "Nuevo pedido" (§12): si
  // coincide exacto, se trae sola el nombre de la persona.
  type DocConocido = { tipo: string; numero: string; nombre: string };
  const DOCS_CONOCIDOS = useMemo<DocConocido[]>(() => {
    const salida: DocConocido[] = [];
    const vistos = new Set<string>();
    const add = (tipo: string, numero: string, nombre: string) => {
      const n = (numero ?? "").trim();
      if (!n) return;
      const t = (tipo ?? "").trim();
      const clave = `${t.toLowerCase()}||${n}`;
      if (vistos.has(clave)) return;
      vistos.add(clave);
      salida.push({ tipo: t, numero: n, nombre });
    };
    clientes.forEach((c) => add(c.tipoDocumento ?? "", c.numeroDocumento, c.nombre));
    usuarios.forEach((u) => add(u.tipoDocumento, u.numeroDocumento, u.nombre));
    empleados.forEach((e) => add(e.tipoDocumento, e.numeroDocumento, e.nombre));
    return salida;
  }, [clientes, usuarios, empleados]);
  // Ventas previas: solo traen el número, sin tipo, así que se indexan aparte
  // para seguir trayendo el nombre cuando se repite un documento conocido.
  const DOCS_VENTAS_PREVIAS = useMemo(() => {
    const mapa = new Map<string, string>();
    pedidos.forEach((p) => {
      const doc = (p.documento ?? "").trim();
      if (doc && !mapa.has(doc)) mapa.set(doc, p.usuario);
    });
    return mapa;
  }, [pedidos]);

  // Interfaz para productos seleccionados en el picker
  interface ProductoSeleccionado {
    id: number;
    nombre: string;
    precio: number;
    cantidad: number;
    tamaño: string;
  }

  /** Modal exclusivo del panel de administrador: el pedido se toma en el local,
      frente al cliente, así que no se pide estado, comprobante ni hora de
      recogida. La fecha se carga sola con el día en que se hace el pedido. */
  const VentaModal = ({
    onClose,
    onConfirm,
  }: {
    onClose: () => void;
    onConfirm: (
      v: Omit<Venta, "id">,
      resultadoCliente: "creado" | "existente",
    ) => void;
  }) => {
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

    // ── Búsqueda de documento en tiempo real (§12) ──
    // Mientras el admin escribe el documento, se va filtrando contra los
    // documentos conocidos (clientes del panel y ventas previas). Si hay una
    // coincidencia EXACTA, se trae sola el nombre del cliente y se marca el
    // campo como encontrado. Si no hay ninguna coincidencia exacta, se avisa
    // y el documento queda como uno nuevo.
    const [docSugerencias, setDocSugerencias] = useState<DocConocido[]>([]);
    const [docExacto, setDocExacto] = useState<string | null>(null);
    const [docTocado, setDocTocado] = useState(false);
    /** Último nombre que se trajo solo al coincidir el documento. Sirve para
        no pisar el nombre que el admin escribió a mano. */
    const [nombreTraido, setNombreTraido] = useState<string | null>(null);

    // `tipo` se recibe aparte porque al cambiar el select el estado todavía no
    // se ha actualizado en el cierre que llama a esta función.
    const buscarDocumento = (valor: string, tipo: string = tipoDocumento) => {
      const doc = valor.trim();
      setDocTocado(doc.length > 0);
      if (doc.length < 2) {
        setDocSugerencias([]);
        setDocExacto(null);
        setNombreTraido(null);
        return;
      }
      // Coincidencias parciales: contra tipo+número (clientes, usuarios y
      // empleados) y contra el número de las ventas previas.
      const parciales = DOCS_CONOCIDOS.filter((d) => d.numero.includes(doc));
      const enDocs = new Set(parciales.map((d) => d.numero));
      const previas: DocConocido[] = [];
      DOCS_VENTAS_PREVIAS.forEach((nombre, numero) => {
        if (numero.includes(doc) && !enDocs.has(numero)) {
          previas.push({ tipo: "", numero, nombre });
        }
      });
      setDocSugerencias([...parciales, ...previas].slice(0, 6));
      const clave = `${tipo.trim().toLowerCase()}||${doc}`;
      const exacto =
        DOCS_CONOCIDOS.find(
          (d) => `${d.tipo.toLowerCase()}||${d.numero}` === clave,
        )?.nombre ??
        DOCS_VENTAS_PREVIAS.get(doc) ??
        null;
      setDocExacto(exacto);
      // Coincidió el documento EXACTO: se trae el nombre solo si el campo está
      // vacío o si el nombre actual era el que se había traído antes (así no
      // se pisa lo que el admin escribió a mano para otro cliente).
      if (exacto) {
        const puedeTraer =
          !usuario.trim() ||
          !nombreTraido ||
          usuario.trim() === nombreTraido;
        if (puedeTraer) {
          setUsuario(exacto);
          setUQuery(exacto);
        }
        setNombreTraido(exacto);
      } else {
        setNombreTraido(null);
      }
    };

    // Autocomplete state
    const [uQuery, setUQuery] = useState("");
    const [showSugg, setShowSugg] = useState(false);
    const suggestions =
      uQuery.length > 0
        ? USUARIOS_LISTA.filter(
            (u) =>
              u.toLowerCase().includes(uQuery.toLowerCase()) &&
              u !== uQuery,
          )
        : [];

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

    const handleSave = () => {
      if (!usuario.trim()) {
        toast.error("El nombre del cliente es obligatorio");
        return;
      }
      const errDoc = validarDocumento(documento, tipoDocumento);
      if (errDoc) {
        toast.error(errDoc);
        return;
      }
      if (selProductos.length === 0) {
        toast.error("Agrega al menos un producto");
        return;
      }
      if (!metodoPago) {
        toast.error("Selecciona el método de pago");
        return;
      }
      // §1: primero se registra (o actualiza) el cliente con su tipo de
      // documento y DESPUÉS se crea la venta.
      const resultadoCliente: "creado" | "existente" = onRegistrarClienteVenta
        ? onRegistrarClienteVenta({
            tipoDocumento,
            numeroDocumento: documento.trim(),
            nombre: usuario.trim(),
          })
        : "existente";
      // El pago se recibe en el momento, así que el pedido nace verificado.
      // Efectivo es el único método que no deja comprobante por verificar
      // (el dinero queda en caja), así que ese pedido nace directamente
      // "Completado": es el efectivo automático del pedido tomado en el local.
      const finalEstado: VentaStatus =
        metodoPago === "Efectivo" ? "completado" : "venta";
      const detalle: DetalleProd[] = selProductos.map((p) => ({
        nombre: `${p.nombre} — ${p.tamaño}`,
        precio: p.precio,
        cantidad: p.cantidad,
                        imagen: productos.find((x) => x.id === p.id)?.image,
      }));
      onConfirm(
        {
          usuario: usuario.trim(),
          documento: documento.trim(),
          fecha,
          estado: finalEstado,
          productos: productosStr,
          cantidad: cantidadTotal,
          total: totalCalculado,
          detalle,
          metodoPago,
          historial: [{ estado: finalEstado, hora: nowHora() }],
        },
        resultadoCliente,
      );
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
                Documento del cliente *
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={tipoDocumento}
                  onChange={(e) => {
                    setTipoDocumento(e.target.value);
                    buscarDocumento(documento, e.target.value);
                  }}
                  aria-label="Tipo de documento"
                  className="px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer w-full sm:w-56 shrink-0"
                >
                  {OPCIONES_TIPO_DOCUMENTO.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1 min-w-0">
                  <input
                    value={documento}
                    onChange={(e) => {
                      const valor = filtrarDocumento(e.target.value, tipoDocumento);
                      setDocumento(valor);
                      buscarDocumento(valor);
                    }}
                    onFocus={() => {
                      if (documento.trim().length >= 2) buscarDocumento(documento);
                    }}
                    onBlur={() => setTimeout(() => setDocSugerencias([]), 150)}
                    placeholder="Escribe el documento…"
                    inputMode="numeric"
                    className={`${iCls} w-full`}
                    autoComplete="off"
                  />
                  {/* Coincidencias parciales: se muestran mientras se escribe */}
                  {docSugerencias.length > 0 && (
                    <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                      {docSugerencias.map((s) => (
                        <button
                          key={`${s.tipo}||${s.numero}`}
                          type="button"
                          onMouseDown={() => {
                            setDocumento(s.numero);
                            if (s.tipo) setTipoDocumento(s.tipo);
                            setDocExacto(s.nombre);
                            setUsuario(s.nombre);
                            setUQuery(s.nombre);
                            setNombreTraido(s.nombre);
                            setDocSugerencias([]);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer border-b border-border last:border-0 flex items-center gap-2"
                        >
                          <span className="font-mono text-xs text-muted-foreground shrink-0">
                            {s.tipo ? `${s.tipo} ` : ""}
                            {s.numero}
                          </span>
                          <span className="truncate">{s.nombre}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Estado de la búsqueda: exacto / parcial / nuevo */}
              {docTocado && documento.length >= 2 && (
                <p
                  className={`text-xs mt-1 font-medium flex items-center gap-1 ${
                    docExacto
                      ? "text-emerald-600"
                      : docSugerencias.length > 0
                        ? "text-amber-600"
                        : "text-muted-foreground"
                  }`}
                >
                  {docExacto
                    ? `✓ Cliente encontrado: ${docExacto}`
                    : docSugerencias.length > 0
                      ? `Coincidencias: ${docSugerencias.length} — sigue escribiendo para el exacto`
                      : "Documento no registrado — se creará un cliente nuevo"}
                </p>
              )}
            </div>

            {/* Usuario con autocomplete */}
            <div className="relative">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Nombre del cliente *
              </label>
              <input
                value={uQuery}
                onChange={(e) => {
                  setUQuery(e.target.value);
                  setUsuario(e.target.value);
                  setShowSugg(true);
                }}
                onFocus={() => setShowSugg(true)}
                onBlur={() =>
                  setTimeout(() => setShowSugg(false), 150)
                }
                placeholder="Escribe el nombre del cliente..."
                className={iCls}
                autoComplete="off"
              />
              {showSugg && suggestions.length > 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                  {suggestions.slice(0, 6).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onMouseDown={() => {
                        setUQuery(u);
                        setUsuario(u);
                        setShowSugg(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer border-b border-border last:border-0 flex items-center gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {u
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      {u}
                    </button>
                  ))}
                </div>
              )}
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
                Método de pago *
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
                    <span>{METODO_PAGO_ESTILO[m].icono}</span>
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
                  Productos *
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
              onClick={handleSave}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
            >
              Guardar
            </button>
          </div>
        </motion.div>
        </div>
      </div>
    );
  };

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
            {pedidos.length} ventas registradas
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
          (p) => p.estado === "por-verificar",
        );
        if (pendientes.length === 0) return null;
        return (
          <div className="flex items-center gap-4 px-5 py-4 mb-5 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900">
                {pendientes.length}{" "}
                {pendientes.length === 1
                  ? "pedido pendiente de verificación"
                  : "pedidos pendientes de verificación"}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Revisa el comprobante de pago y aprueba o
                rechaza cada pedido.
              </p>
            </div>
            <span className="shrink-0 text-xs font-bold px-3 py-1 rounded-full bg-amber-200 text-amber-900 animate-pulse">
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
                      p.estado === "por-verificar"
                        ? "bg-amber-50/60 hover:bg-amber-50"
                        : p.estado === "en-espera"
                          ? "bg-violet-50/60 hover:bg-violet-50"
                          : "hover:bg-muted/20"
                    }`}
                  >
                    <td className="px-4 py-3.5 text-sm font-mono font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        {p.id}
                        {p.estado === "por-verificar" && (
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
                      {/* Estado editable. El flujo del checkout se conserva:
                          la venta web nace "Por verificar" y el admin la
                          aprueba con el botón Verificar (→ Por entregar).
                          Desde el menú se pasa a Por entregar o Completado
                          cuando el pedido ya no avanza solo. La devolución y
                          la anulación no están aquí: van con sus botones de
                          acción, y en la columna no se ofrece ninguna acción
                          de eliminar. */}
                      <EstadoSelect
                        value={p.estado}
                        disabled={VENTA_STATUS_FLUJO.includes(p.estado)}
                        options={[
                          // Si el estado lo asignó el flujo (rechazado /
                          // en-espera), se muestra como única opción (solo
                          // pill, sin menú) para que el badge no se pierda.
                          ...(VENTA_STATUS_FLUJO.includes(p.estado)
                            ? [{ value: p.estado, label: VENTA_STATUS_LABEL[p.estado], color: VENTA_STATUS_COLOR[p.estado] }]
                            : []),
                          ...VENTA_STATUS_SELECCIONABLES.map((s) => ({
                            value: s,
                            label: VENTA_STATUS_LABEL[s],
                            color: VENTA_STATUS_COLOR[s],
                          })),
                        ]}
                        onChange={(nuevo) => {
                          if (nuevo !== p.estado) cambiarEstado(p.id, nuevo);
                        }}
                      />
                    </td>
                    <td
                      className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap"
                      style={{ fontFamily: MONO }}
                    >
                      {horaEstado(p)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {p.estado === "por-verificar" && (
                          <button
                            onClick={() => abrirDetalle(p)}
                            title="Verificar pago"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer text-xs font-semibold"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Verificar
                          </button>
                        )}
                        <ActionIcons
                          onView={() => abrirDetalle(p)}
                        />
                        {/* Anular venta: la deja en estado "anulado". Un círculo con
                            la línea en diagonal dice "anular" mejor que una papelera,
                            que parecía borrar el pedido. Una venta rechazada es
                            final: no se anula ni se devuelve. */}
                        {p.estado !== "anulado" && p.estado !== "perdida" && p.estado !== "rechazado" && (
                          <button
                            onClick={() =>
                              setConfirmAccionV({ id: p.id, accion: "anular" })
                            }
                            title="Anular venta"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        {/* Registrar devolución: pasa la venta a "Devolución". */}
                        {p.estado !== "anulado" && p.estado !== "perdida" && p.estado !== "rechazado" && (
                          <button
                            onClick={() =>
                              setConfirmAccionV({ id: p.id, accion: "devolucion" })
                            }
                            title="Registrar devolución"
                            className="p-1.5 rounded-lg hover:bg-orange-50 text-muted-foreground hover:text-orange-600 transition-colors cursor-pointer"
                          >
                            <Undo2 className="w-4 h-4" />
                          </button>
                        )}
                        {/* Imprimir factura: electrónica (se descarga el documento)
                            o física (sale por la impresora del sistema). */}
                        {p.estado !== "anulado" && (
                          <button
                            onClick={() => setFacturaVenta(p)}
                            title="Imprimir factura"
                            className="p-1.5 rounded-lg hover:bg-violet-50 text-muted-foreground hover:text-violet-600 transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                        {/* Ya en "Devolución" no tiene sentido volver a registrarla:
                            en su lugar se ofrece gestionar la que ya existe, que es
                            donde se decide el canje o la devolución del dinero.
                            Solo el icono, como las demás acciones de la fila. */}
                        {p.estado === "perdida" && (
                          <button
                            onClick={() => onGestionarDevolucion(p.id)}
                            title={
                              p.devolucionResuelta
                                ? "Ver la devolución resuelta"
                                : "Gestionar devolución"
                            }
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              p.devolucionResuelta
                                ? "text-muted-foreground hover:bg-muted"
                                : "text-muted-foreground hover:bg-orange-50 hover:text-orange-600"
                            }`}
                          >
                            <RefreshCw className="w-4 h-4" />
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
                  {VENTA_STATUS_LABEL[detailItem.estado]}
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

                  {/* Rechazado: motivo y comprobante de devolución. */}
                  {detailItem.estado === "rechazado" && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldX className="w-4 h-4 text-red-600 shrink-0" />
                        <p className="text-sm font-semibold text-red-900">Pago rechazado</p>
                      </div>
                      <p className="text-sm text-red-800 mb-1">
                        Motivo:{" "}
                        <span className="font-semibold">
                          {detailItem.motivoRechazo ? MOTIVO_RECHAZO_LABEL[detailItem.motivoRechazo] : "—"}
                        </span>
                      </p>
                      {detailItem.comprobanteDevolucion && (
                        <div className="mt-3">
                          <p className="text-[11px] font-semibold text-red-800 mb-1">Comprobante de devolución</p>
                          <button
                            type="button"
                            onClick={() => setVisorSrc(detailItem.comprobanteDevolucion ?? null)}
                            title="Ampliar comprobante de devolución"
                            className="block w-full rounded-xl overflow-hidden border border-red-200 bg-white cursor-zoom-in hover:border-red-400 transition-colors"
                          >
                            <img src={detailItem.comprobanteDevolucion} alt="Comprobante de devolución" className="w-full object-contain max-h-56" />
                            <span className="block text-[11px] text-red-700 py-1">Clic para ampliar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* En espera: se solicitó el dinero faltante. */}
                  {detailItem.estado === "en-espera" && (
                    <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-violet-600 shrink-0" />
                        <p className="text-sm font-semibold text-violet-900">Falta completar el pago</p>
                      </div>
                      <p className="text-sm text-violet-800">
                        Se solicitó al cliente un faltante de{" "}
                        <span className="font-bold">{fmtCOP(detailItem.montoFaltante ?? 0)}</span>. El pedido
                        espera el comprobante del dinero restante.
                      </p>
                    </div>
                  )}

                  {/* Verificación de pago */}
                  {detailItem.estado === "por-verificar" && (() => {
                    const totalVenta = detailItem.total ||
                      (detailItem.detalle?.reduce((s, d) => s + d.precio * d.cantidad, 0) ?? 0);
                    const pagoInicial = detailItem.montoFaltante ? totalVenta - detailItem.montoFaltante : null;
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <p className="text-sm font-semibold text-amber-900">Verificación de pago</p>
                        </div>
                        <div className="space-y-3 mb-4">
                          <div className="bg-white rounded-xl border border-amber-200 px-4 py-3">
                            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Total a cobrar</p>
                            <p className="text-xl font-bold text-foreground" style={{ fontFamily: MONO }}>{fmtCOP(totalVenta)}</p>
                          </div>
                          {pagoInicial !== null && (
                            <>
                              <div className="bg-white rounded-xl border border-amber-200 px-4 py-3">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Pagado inicialmente</p>
                                <p className="text-lg font-bold text-foreground" style={{ fontFamily: MONO }}>{fmtCOP(pagoInicial)}</p>
                              </div>
                              <div className="bg-white rounded-xl border border-amber-200 px-4 py-3">
                                <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Faltante solicitado</p>
                                <p className="text-lg font-bold text-foreground" style={{ fontFamily: MONO }}>{fmtCOP(detailItem.montoFaltante ?? 0)}</p>
                              </div>
                            </>
                          )}
                          {/* Motivo (solo si se va a rechazar). */}
                          <div className="bg-white rounded-xl border border-amber-200 px-4 py-3">
                            <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">
                              Motivo
                            </label>
                            <select
                              value={motivoSel}
                              onChange={(e) => setMotivoSel(e.target.value as MotivoRechazo | "")}
                              className="w-full bg-transparent text-sm text-foreground focus:outline-none cursor-pointer"
                            >
                              <option value="">Selecciona un motivo (solo si vas a rechazar)</option>
                              {MOTIVOS_RECHAZO.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Botones según el motivo. */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (motivoSel === "dinero-faltante") { setModalDevolucion(true); return; }
                              if (motivoSel === "comprobante-falso") setConfirmVerif("rechazar-falso");
                            }}
                            disabled={motivoSel === ""}
                            title={motivoSel === "" ? "Selecciona un motivo" : "Rechazar pago"}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-red-700 text-xs font-semibold transition-colors active:scale-95 ${
                              motivoSel === ""
                                ? "bg-red-50/50 opacity-50 cursor-not-allowed"
                                : "bg-red-50 hover:bg-red-100 cursor-pointer"
                            }`}
                          >
                            <ShieldX className="w-3.5 h-3.5" /> Rechazar
                          </button>
                          {motivoSel === "dinero-faltante" ? (
                            <button
                              onClick={() => setModalFaltante(true)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 cursor-pointer transition-colors active:scale-95"
                            >
                              <AlertCircle className="w-3.5 h-3.5" /> Pedir dinero faltante
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmVerif("aprobar")}
                              disabled={motivoSel !== ""}
                              title={motivoSel !== "" ? "No puedes aprobar con un motivo de rechazo" : "Aprobar pago"}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-semibold transition-colors active:scale-95 ${
                                motivoSel !== ""
                                  ? "bg-emerald-600/50 opacity-50 cursor-not-allowed"
                                  : "bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                              }`}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Aprobar
                            </button>
                          )}
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
            onClose={() => setShowCreate(false)}
            onConfirm={(v, resultadoCliente) => {
              const maxId = Math.max(0, ...pedidos.map((p) => parseInt(p.id) || 0));
              const newId = String(maxId + 1);
              const initHistorial: HistorialEntry[] = [{ estado: v.estado, hora: nowHora() }];
              setPedidos((prev) => [{ id: newId, ...v, historial: initHistorial }, ...prev]);
              setShowCreate(false);
              toast.success(
                resultadoCliente === "creado"
                  ? `Cliente ${v.usuario} creado y pedido #${newId} registrado`
                  : `Pedido #${newId} creado correctamente`,
              );
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Confirmar anulación / devolución ── */}
      <AnimatePresence>
        {confirmAccionV && (
          <ConfirmModal
            title={
              confirmAccionV.accion === "anular"
                ? "Anular venta"
                : "Registrar devolución"
            }
            tone={confirmAccionV.accion === "anular" ? "peligro" : "aviso"}
            message={
              confirmAccionV.accion === "anular"
                ? "¿Estás seguro de anular esta venta? El pedido quedará marcado como Anulado y dejará de contar como venta."
                : "¿Estás seguro de registrar la devolución? La venta pasará a estado Devolución y quedará en el módulo de devoluciones."
            }
            onConfirm={() => {
              if (confirmAccionV.accion === "anular") {
                anularVenta(confirmAccionV.id);
              } else {
                registrarDevolucion(confirmAccionV.id);
              }
              setConfirmAccionV(null);
            }}
            onCancel={() => setConfirmAccionV(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Verificación: confirmar Aprobar / Rechazar por comprobante falso ── */}
      <AnimatePresence>
        {confirmVerif && detailItem && (
          <ConfirmModal
            title={confirmVerif === "aprobar" ? "Aprobar pago" : "Rechazar pago"}
            tone={confirmVerif === "aprobar" ? "aviso" : "peligro"}
            message={
              confirmVerif === "aprobar"
                ? "¿Aprobar el pago? La venta pasará a Por entregar (listo para recoger)."
                : "¿Rechazar el pago por comprobante falso? La venta quedará como Rechazado (estado final)."
            }
            onConfirm={() => {
              if (confirmVerif === "aprobar") aprobarPago(detailItem.id);
              else rechazarPorFalso(detailItem.id);
              setConfirmVerif(null);
            }}
            onCancel={() => setConfirmVerif(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Pedir dinero faltante (→ En espera) ── */}
      <AnimatePresence>
        {modalFaltante && detailItem && (() => {
          const totalVenta = detailItem.total ||
            (detailItem.detalle?.reduce((s, d) => s + d.precio * d.cantidad, 0) ?? 0);
          const monto = parseInt(montoFaltanteValor.replace(/\D/g, "")) || 0;
          const valido = monto > 0 && monto < totalVenta;
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
                      Valor faltante *
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
                        El faltante debe ser mayor a $0 y menor al total ({fmtCOP(totalVenta)}).
                      </p>
                    )}
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

      {/* ── Rechazar por dinero faltante: devolución del dinero recibido ── */}
      <AnimatePresence>
        {modalDevolucion && detailItem && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <p className="font-bold text-foreground">Devolución del dinero recibido</p>
                <button onClick={() => setModalDevolucion(false)} className="p-1 rounded-lg hover:bg-muted cursor-pointer" aria-label="Cerrar">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sube el comprobante de la transferencia con la que se devuelve el dinero al cliente (a la misma cuenta). Es obligatorio para rechazar.
                </p>
                <input
                  ref={devolFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    void subirDevol(file, "comprobantes").then((url) => { if (url) setDevolUrl(url); });
                    e.target.value = "";
                  }}
                />
                {devolUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    {devolUrl.startsWith("data:application/pdf") || devolUrl.endsWith(".pdf") ? (
                      <div className="flex items-center gap-2 p-3 text-sm text-foreground">
                        <FileText className="w-4 h-4 text-primary" /> Comprobante de devolución adjunto
                      </div>
                    ) : (
                      <img src={devolUrl} alt="Comprobante de devolución" className="w-full object-contain max-h-56" />
                    )}
                    <button
                      onClick={() => setDevolUrl(null)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer"
                      aria-label="Quitar comprobante"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => devolFileRef.current?.click()}
                    disabled={subiendoDevol}
                    className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-border text-center hover:border-primary/40 cursor-pointer transition-colors"
                  >
                    <Upload className="w-6 h-6 text-muted-foreground/50" />
                    <span className="text-sm font-semibold text-foreground">
                      {subiendoDevol ? "Subiendo..." : "Subir comprobante de devolución"}
                    </span>
                    <span className="text-xs text-muted-foreground">JPG, PNG, WEBP o PDF · máx 5 MB</span>
                  </button>
                )}
              </div>
              <div className="flex gap-2 px-5 pb-5">
                <button
                  onClick={() => setModalDevolucion(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { if (devolUrl && !subiendoDevol) rechazarPorDinero(detailItem.id); }}
                  disabled={!devolUrl || subiendoDevol}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${devolUrl && !subiendoDevol ? "bg-red-600 hover:bg-red-700 cursor-pointer" : "bg-red-600/50 opacity-50 cursor-not-allowed"}`}
                >
                  Rechazar y devolver
                </button>
              </div>
            </motion.div>
          </div>
        )}
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
