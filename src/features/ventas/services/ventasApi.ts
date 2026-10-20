import api from '@/shared/services/api';
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
      imagen: detalle.imagen ?? undefined,
      tamaño: detalle.tamano ?? undefined,
      productoId: String(detalle.id_producto),
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
    motivoRechazo: row.motivo_rechazo === 'Comprobante falso' || row.motivo_rechazo === 'Dinero faltante'
      ? row.motivo_rechazo
      : undefined,
    horaRecogida: formatTime(row.hora_recogida),
    historial: horaEstado ? [{ estado: row.estado, hora: horaEstado }] : [],
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
  const { data } = await api.post<VentaApi>('/ventas', payload);
  return { id: String(data.id_venta), total: Number(data.monto), venta: ventaApiAVenta(data) };
}

export async function crearVentaPanel(payload: {
  cliente: { tipo_documento: string; numero_documento: string; nombre: string };
  hora_recogida: string;
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

export async function subirComprobanteVenta(id: string, payload: { tipo: string; comprobante: string }) {
  await api.post(`/ventas/${id}/comprobantes`, payload);
}
