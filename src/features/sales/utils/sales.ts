import type { EstadoVenta } from "@/features/sales/services/saleStatuses";

/** Claves internas de estado: se definen en `estadosVenta.ts` (punto C2), que
 *  es la tabla de transiciones que comparte el panel, el checkout, Orden de
 *  Producción y el backend; este alias conserva el nombre con el que se
 *  referencia en todo el frontend. */
export type VentaStatus = EstadoVenta;

export type EstadoClienteVenta =
  | "Pendiente"
  | "En espera"
  | "Aceptado"
  | "En proceso"
  | "Por entregar"
  | "Completado"
  | "Rechazado"
  | "Anulado"
  | "Devolución";

/** Motivo de rechazo: es el literal que queda guardado en
    `tb_venta.motivo_rechazo` (varchar 100). Puede ser uno de los motivos
    fijos o "Otro: <texto escrito por el usuario>". */
export type MotivoRechazo = string;

/** Un comprobante de una venta: el inicial de pago o el del dinero faltante. */
export interface ComprobanteVenta {
  url: string;
  tipo: "pago" | "faltante";
  fecha: string;
  hora: string;
}

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

export interface DetalleProd {
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
  fechaCompletado?: string;
  horaCompletado?: string;
  productos: string;
  cantidad: number;
  total: number;
  estado: VentaStatus;
  estadoCliente?: EstadoClienteVenta | VentaStatus;
  estadoOrden?: string;
  ventaLocal?: boolean;
  horaCompletadoLocal?: string;
  finVentaLocalMs?: number;
  finCalentamientoMs?: number;
  detalle?: DetalleProd[];
  metodoPago?: string;
  comprobante?: string;
  direccionRecogida?: string;
  horaRecogida?: string;
  tiempoPreparacionMin?: number;
  /** Teléfono del cliente si lo dejó en el formulario de datos del checkout. */
  telefono?: string;
  historial?: HistorialEntry[];
  /** Id de la fila de tb_devolucion de esta venta. Hace falta para resolverla
      (PATCH /devoluciones/:id/resolver); ausente si nunca se marcó. */
  idDevolucion?: number;
  bloqueoCambioSabor?: boolean;
  /** Fecha en que se registró la devolución (tb_devolucion.fecha), en formato
      ISO. Es la que usa el Dashboard para contar devoluciones por periodo. */
  devolucionFecha?: string;
  /** Venta nueva que creó el canje de esta devolución (si la hubo). */
  idVentaReemplazo?: number;
  devolucionTipo?: DevolucionTipo;
  devolucionResuelta?: boolean;
  devolucionNota?: string;
  devolucionMonto?: number;
  metodoReembolso?: Exclude<MetodoPago, "">;
  /** Motivo por el que el cliente devuelve, escrito al gestionar la devolución. */
  devolucionMotivo?: string;
  /** Motivo de cada línea devuelta, indexado por posición del detalle. */
  devolucionMotivos?: Record<string, { motivo: string; descripcion: string }>;
  /** Comprobantes de la venta (pago inicial y dinero faltante). Opcional por
      compatibilidad con ventas viejas: si no está, se usa `comprobante`. */
  comprobantes?: ComprobanteVenta[];
  pagos?: PagoVenta[];
  /** El listado informa si hay comprobante sin transferir su contenido. */
  tieneComprobante?: boolean;
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

export const VENTA_STATUS_LABEL: Record<VentaStatus, string> = {
  "Por entregar": "Por entregar",
  Devolucion: "Devolución",
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
