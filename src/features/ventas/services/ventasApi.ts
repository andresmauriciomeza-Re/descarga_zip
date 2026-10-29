import api from '@/shared/services/api';
import { crearError401Checkout } from '@/shared/services/api';
import { obtenerToken } from '@/shared/services/authService';
import { IMAGENES_PIZZA, resolverImagenCatalogo } from '@/shared/utils/catalogo';
import type { Venta, VentaStatus, ComprobanteVenta } from '../pages/VentasScreen';

export interface PagoVentaApi {
  id_pago: number;
  tipo: string;
  fecha: string;
  comprobante: string | null;
  cantidad_pagar: number | string;
  depositado: number | string;
  faltante: number | string;
  estado: string;
}

export interface VentaApi {
  id_venta: number;
  id_cliente: number;
  fecha: string;
  hora_recogida: string | null;
  monto: number | string;
  estado: VentaStatus;
  fecha_estado: string | null;
  motivo_rechazo: string | null;
  /** Quién dejó la venta en 'Anulado': 'Administrador' o 'Cliente'. */
  anulado_por?: string | null;
  /** Valor que la pizzería devuelve (numeric → string en pg). */
  monto_reembolso?: number | string | null;
  /** Comprobante de la devolución del dinero, subido al anular. */
  comprobante_anulacion?: string | null;
  /** Segundos que quedan de la ventana de 10 minutos para anular (0 si ya
      pasó). Se calcula en el backend con el reloj de la base. */
  segundos_restantes_anulacion?: number | string | null;
  id_usuario?: string;
  cliente_nombre?: string;
  tipo_documento?: string;
  correo?: string | null;
  telefono?: string | null;
  detalles?: Array<{
    id_detalle_venta: number;
    id_producto: number;
    nombre: string;
    imagen: string | null;
    cantidad: number;
    precio_unitario: number | string;
    sub_total: number | string;
    tamano: string | null;
  }>;
  pagos?: PagoVentaApi[];
  /** Devolución asociada (LEFT JOIN con tb_devolucion en el listado). */
  id_devolucion?: number | string | null;
  /** Fecha en que se registró la devolución (tb_devolucion.fecha). */
  devolucion_fecha?: string | null;
  /** 'Pendiente' o 'Resuelta' (CHECK ck_devolucion_estado). */
  devolucion_estado?: string | null;
  /** 'Dinero' | 'Producto' | 'Excedente' | 'Devuelta' (ck_devolucion_tipo).
      'Devuelta' es el estado inicial, antes de resolver. */
  devolucion_tipo?: string | null;
  devolucion_monto?: number | string | null;
  devolucion_nota?: string | null;
  /** Venta nueva que creó el canje de esta devolución, si la hubo. */
  id_venta_reemplazo?: number | string | null;
  /** Motivo registrado por línea de la venta devuelta. */
  devolucion_lineas?: Array<{
    id_detalle_venta: number;
    motivo: string;
    descripcion_motivo: string | null;
  }>;
}

const formatDateBogota = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date.slice(0, 10);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(parsed);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const formatTime = (time?: string | null) => (time ? time.slice(0, 5) : '');

export function ventaApiAVenta(row: VentaApi): Venta {
  const pagos = row.pagos ?? [];
  const detalles = row.detalles ?? [];
  const comprobantes: ComprobanteVenta[] = pagos
    .filter((pago) => Boolean(pago.comprobante))
    .map((pago, index) => ({
      url: pago.comprobante!,
      tipo: index === 0 ? 'pago' : 'faltante',
      fecha: pago.fecha ? formatDateBogota(pago.fecha) : formatDateBogota(row.fecha),
      hora: '',
    }));
  const totalPagado = pagos.reduce((suma, pago) => suma + Number(pago.depositado || 0), 0);
  const faltante = pagos.length ? Number(pagos[pagos.length - 1].faltante || 0) : 0;
  const horaEstado = row.fecha_estado
    ? new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: true,
      }).format(new Date(row.fecha_estado))
    : '';
  const productos = detalles.map((detalle) =>
    `${detalle.nombre}${detalle.tamano ? ` (${detalle.tamano})` : ''} x${detalle.cantidad}`,
  ).join(', ');
  return {
    id: String(row.id_venta),
    usuario: row.cliente_nombre ?? 'Cliente',
    documento: row.id_usuario ?? undefined,
    fecha: formatDateBogota(row.fecha),
    productos,
    cantidad: detalles.reduce((suma, detalle) => suma + detalle.cantidad, 0),
    total: Number(row.monto),
    estado: row.estado,
    detalle: detalles.map((detalle) => ({
      nombre: detalle.nombre,
      precio: Number(detalle.precio_unitario),
      cantidad: detalle.cantidad,
      // Misma imagen que el catálogo: la BD guarda nombres/rutas locales que
      // hay que resolver a los assets empaquetados (igual que productoACatalogo).
      imagen: resolverImagenCatalogo(detalle.imagen) || IMAGENES_PIZZA[detalle.nombre] || undefined,
      tamaño: detalle.tamano ?? undefined,
      productoId: String(detalle.id_producto),
      idDetalleVenta: detalle.id_detalle_venta,
    })),
    metodoPago: pagos[0]?.tipo,
    comprobante: comprobantes[0]?.url,
    comprobantes,
    pagos: pagos.map((pago) => ({
      id: pago.id_pago,
      tipo: pago.tipo,
      comprobante: pago.comprobante ?? undefined,
      cantidadPagar: Number(pago.cantidad_pagar),
      depositado: Number(pago.depositado),
      faltante: Number(pago.faltante),
      estado: pago.estado,
    })),
    montoPagado: totalPagado,
    montoFaltante: faltante,
    // El motivo es texto libre: los fijos ("Comprobante falso", "Comprobante
    // borroso", …) y también "Otro: <texto escrito>". Sin motivo = la venta se
    // anuló desde el panel o el cliente la canceló (sin detalle de verificación).
    motivoRechazo: row.motivo_rechazo ?? undefined,
    anuladoPor: row.anulado_por ?? undefined,
    montoReembolso: row.monto_reembolso == null ? undefined : Number(row.monto_reembolso),
    comprobanteAnulacion: row.comprobante_anulacion ?? undefined,
    // Mis pedidos y el detalle del panel leen `comprobanteDevolucion`: es la
    // misma URL que sube el panel al anular (o que deja el cliente al cancelar).
    comprobanteDevolucion: row.comprobante_anulacion ?? undefined,
    segundosRestantesAnulacion:
      row.segundos_restantes_anulacion == null ? 0 : Number(row.segundos_restantes_anulacion),
    horaRecogida: formatTime(row.hora_recogida),
    historial: horaEstado ? [{ estado: row.estado, hora: horaEstado }] : [],
    // ── Devolución (tb_devolucion) ──
    ...(row.id_devolucion == null
      ? {}
      : {
          idDevolucion: Number(row.id_devolucion),
          /** Fecha de la devolución (tb_devolucion.fecha), no la de la venta. */
          devolucionFecha: row.devolucion_fecha ? formatDateBogota(row.devolucion_fecha) : undefined,
          idVentaReemplazo:
            row.id_venta_reemplazo == null ? undefined : Number(row.id_venta_reemplazo),
          // 'Devuelta' es el valor inicial (aún sin resolver): sin tipo ni
          // monto; la UI decide por `devolucionResuelta`.
          ...(row.devolucion_estado === 'Resuelta'
            ? {
                devolucionResuelta: true,
                // 'Excedente' = canje con saldo mixto (dinero + producto).
                devolucionTipo:
                  row.devolucion_tipo === 'Producto'
                    ? ('producto' as const)
                    : row.devolucion_tipo === 'Excedente'
                      ? ('mixto' as const)
                      : ('dinero' as const),
                devolucionMonto:
                  row.devolucion_monto == null ? undefined : Number(row.devolucion_monto),
                ...(row.devolucion_nota ? { devolucionNota: row.devolucion_nota } : {}),
              }
            : { devolucionResuelta: false }),
          // Motivo por línea, indexado por la posición del detalle (igual que
          // lo escribe DevolucionesScreen al gestionar).
          ...(row.devolucion_lineas && row.devolucion_lineas.length > 0
            ? {
                devolucionMotivos: Object.fromEntries(
                  row.devolucion_lineas
                    .map((linea) => {
                      const indice = detalles.findIndex(
                        (d) => d.id_detalle_venta === linea.id_detalle_venta,
                      );
                      return indice < 0
                        ? null
                        : [
                            String(indice),
                            { motivo: linea.motivo, descripcion: linea.descripcion_motivo ?? '' },
                          ] as const;
                    })
                    .filter((entrada): entrada is readonly [string, { motivo: string; descripcion: string }] => entrada !== null),
                ),
              }
            : {}),
        }),
  };
}

export async function obtenerMisVentas() {
  const { data } = await api.get<VentaApi[]>('/ventas/mias');
  return data.map(ventaApiAVenta);
}

export async function obtenerVentasPanel() {
  const { data } = await api.get<VentaApi[]>('/ventas');
  return data.map(ventaApiAVenta);
}

export async function obtenerVentaPanel(id: string) {
  const { data } = await api.get<VentaApi>(`/ventas/${id}`);
  return ventaApiAVenta(data);
}

export async function crearVentaCliente(payload: {
  hora_recogida: string;
  productos: Array<{ id_producto: number; cantidad: number; tamano: string | null }>;
  pago: { tipo: string; comprobante: string };
}) {
  if (!obtenerToken()) throw crearError401Checkout();
  const { data } = await api.post<VentaApi>('/ventas', payload, {
    checkoutAuth: true,
  });
  return { id: String(data.id_venta), total: Number(data.monto), venta: ventaApiAVenta(data) };
}

export async function crearVentaPanel(payload: {
  cliente: { tipo_documento: string; numero_documento: string; nombre: string };
  /** Opcional: si no viene, el backend auto-asigna ahora + 25 minutos
      (pedido tomado en el local, tiempo de preparación de la pizza). */
  hora_recogida?: string;
  productos: Array<{ id_producto: number; cantidad: number; tamano: string | null }>;
  pago: { tipo: string; comprobante?: null };
}) {
  const { data } = await api.post<VentaApi>('/ventas/panel', payload);
  return { id: String(data.id_venta), total: Number(data.monto), venta: ventaApiAVenta(data) };
}

export async function verificarVentaApi(id: string, payload: {
  accion: 'aceptar' | 'monto_faltante' | 'rechazar';
  pagado?: number;
  motivo_rechazo?: string;
}) {
  await api.patch(`/ventas/${id}/verificacion`, payload);
}

/** Anula una venta desde el listado del panel. `motivo` ya viene armado
    ("Cliente canceló el pedido", … o "Otro: <texto>") y `comprobante` es la
    URL de Cloudinary del comprobante de la devolución (opcional). */
export async function anularVentaApi(id: string, payload: {
  motivo: string;
  comprobante?: string;
}) {
  await api.patch(`/ventas/${id}/anular`, payload);
}

/** Cancelación del propio cliente desde "Mis pedidos": sólo el token del
    dueño sirve (sin permiso de panel) y el backend exige que esté dentro de
    los primeros 10 minutos. El motivo es fijo: 'Cliente canceló el pedido'. */
export async function cancelarVentaApi(id: string) {
  await api.patch(`/ventas/${id}/cancelar`);
}

/** Marca una venta como devolución (Completado → Devolucion) y abre la fila
    pendiente en tb_devolucion. Idempotente: si la venta ya estaba marcada,
    devuelve la fila que ya tenía. */
export async function marcarDevolucionApi(id: string) {
  const { data } = await api.patch<VentaApi>(`/ventas/${id}/devolucion`);
  return data;
}

/** Cuerpo de la resolución de una devolución (lo que espera
    `validarResolverDevolucion` en el backend). `canje` vacío = todo en
    dinero; con canje, el backend crea la venta de reemplazo del cliente y su
    orden de producción. */
export interface ResolverDevolucionPayload {
  /** 'Excedente' es la devolución mixta (canje + saldo en dinero). */
  tipo: 'Dinero' | 'Producto' | 'Excedente';
  nota?: string;
  /** Dinero que la pizzería devuelve al cliente (>= 0). */
  monto: number;
  lineas: Array<{
    id_detalle_venta: number;
    cantidad: number;
    motivo: string;
    descripcion_motivo?: string | null;
    id_producto_reemplazo?: number | null;
    cantidad_reemplazo?: number | null;
    tamano_reemplazo?: string | null;
  }>;
  canje: Array<{ id_producto: number; cantidad: number; tamano: string | null }>;
}

/** Resuelve la devolución en el backend: registra lo devuelto por línea y, si
    hay canje, crea la NUEVA VENTA del cliente (pago ya verificado) + su orden
    de producción. Devuelve el id de la venta de reemplazo. */
export async function resolverDevolucionApi(
  idDevolucion: number,
  payload: ResolverDevolucionPayload,
) {
  const { data } = await api.patch<{ id_venta_reemplazo: number | string | null }>(
    `/devoluciones/${idDevolucion}/resolver`,
    payload,
  );
  return {
    idVentaReemplazo:
      data.id_venta_reemplazo == null ? undefined : Number(data.id_venta_reemplazo),
  };
}

export async function subirComprobanteVenta(id: string, payload: { tipo: string; comprobante: string }) {
  await api.post(`/ventas/${id}/comprobantes`, payload);
}
