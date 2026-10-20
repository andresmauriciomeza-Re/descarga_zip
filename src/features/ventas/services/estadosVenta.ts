/** Estados de tb_venta, con los mismos nombres y transiciones del backend. */
export type EstadoVenta =
  | 'Por verificar'
  | 'En espera'
  | 'Por entregar'
  | 'Completado'
  | 'Devolucion'
  | 'Anulado';

export type DisparadorVenta =
  | 'verificacion'
  | 'cliente'
  | 'produccion-y-recogida'
  | 'devolucion';

export interface TransicionVenta {
  desde: EstadoVenta;
  a: EstadoVenta;
  disparador: DisparadorVenta;
}

export const TRANSICIONES_VENTA: readonly TransicionVenta[] = [
  { desde: 'Por verificar', a: 'En espera', disparador: 'verificacion' },
  { desde: 'Por verificar', a: 'Por entregar', disparador: 'verificacion' },
  { desde: 'Por verificar', a: 'Anulado', disparador: 'verificacion' },
  { desde: 'En espera', a: 'Por verificar', disparador: 'cliente' },
  { desde: 'En espera', a: 'Anulado', disparador: 'verificacion' },
  { desde: 'Por entregar', a: 'Completado', disparador: 'produccion-y-recogida' },
  { desde: 'Completado', a: 'Devolucion', disparador: 'devolucion' },
];

export const puedeTransicionar = (desde: EstadoVenta, a: EstadoVenta): boolean =>
  TRANSICIONES_VENTA.some((transicion) => transicion.desde === desde && transicion.a === a);

export const ESTADOS_FINALES: readonly EstadoVenta[] = [
  'Completado',
  'Devolucion',
  'Anulado',
];
