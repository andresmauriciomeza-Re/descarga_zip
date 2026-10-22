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
  | 'devolucion'
  | 'anulacion';

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
  // Anulación desde el listado del panel: sólo dentro de los primeros 10
  // minutos desde creación (esa regla de tiempo vive en el backend).
  { desde: 'Por entregar', a: 'Anulado', disparador: 'anulacion' },
  { desde: 'Por entregar', a: 'Completado', disparador: 'produccion-y-recogida' },
  { desde: 'Completado', a: 'Devolucion', disparador: 'devolucion' },
];

/** Ventana (segundos) en la que una venta todavía se puede anular/cancelar,
    contada desde su fecha de creación. El backend es quien la aplica; aquí es
    sólo la vista (botón del listado y contador). */
export const SEGUNDOS_ANULACION = 10 * 60;

/** Estados desde los que el panel ofrece "Anular" (verbatim a los estados
    anulables del backend `TRANSICIONES_VENTA`). */
export const ESTADOS_ANULABLES: readonly EstadoVenta[] = [
  'Por verificar',
  'En espera',
  'Por entregar',
];

export const puedeTransicionar = (desde: EstadoVenta, a: EstadoVenta): boolean =>
  TRANSICIONES_VENTA.some((transicion) => transicion.desde === desde && transicion.a === a);

export const ESTADOS_FINALES: readonly EstadoVenta[] = [
  'Completado',
  'Devolucion',
  'Anulado',
];
