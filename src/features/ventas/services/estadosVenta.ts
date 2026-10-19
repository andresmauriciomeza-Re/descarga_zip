/**
 * Máquina de estados de la VENTA — fuente única de verdad (punto C2).
 *
 * Este archivo NO importa React, ni React Native, ni el navegador: es sólo el
 * mapa de estados que comparten el panel de Ventas, el checkout, Orden de
 * Producción y el backend (cuando exista). Por eso puede copiarse tal cual al
 * servidor sin arrastrar nada del frontend; aquí NO se inventa ningún
 * endpoint, sólo las reglas de transición.
 *
 * Flujo completo:
 *
 *   por-verificar ──(verificar pago)──▶ en-preparacion
 *   por-verificar ──(falta dinero)────▶ en-espera ──(verificar pago)──▶ en-preparacion
 *   por-verificar ──(comprobante falso)▶ rechazado
 *   en-preparacion ──(orden de producción completada)──▶ venta   ← "Por entregar"
 *   venta ──(botón "Entregar")─────────────────────────▶ completado
 *   venta ──(hora de recogida vencida, §13)────────────▶ completado
 *   … ──(devolución)──▶ perdida      … ──(anulación)──▶ rechazado
 *
 * Las CLAVES internas de estado se conservan exactamente como existían
 * ("venta" sigue siendo "Por entregar", "completado" sigue siendo la entrega);
 * lo único nuevo es "en-preparacion", el estado que la venta mantiene mientras
 * su orden de producción está en cocina.
 */

/** Claves internas de estado de una venta. */
export type EstadoVenta =
  | "por-verificar"
  | "en-espera"
  | "rechazado"
  | "en-preparacion"
  | "venta"
  | "completado"
  | "perdida"
  | "anulado";

/** Quién produce cada transición. "hora-recogida" es el auto-completado §13
 *  (Por entregar → Completado al llegar la hora de recogida), que convive con
 *  el botón "Entregar" ("entrega"): ambos pueden cerrar la venta. */
export type DisparadorVenta =
  | "verificacion"
  | "cliente"
  | "orden-produccion"
  | "entrega"
  | "hora-recogida"
  | "devolucion"
  | "anulacion";

export interface TransicionVenta {
  desde: EstadoVenta;
  a: EstadoVenta;
  disparador: DisparadorVenta;
}

/** Tabla completa de transiciones permitidas. El panel y el backend Validan
 *  contra esta lista: un estado que no está aquí simplemente no se puede
 *  escribir a mano. */
export const TRANSICIONES_VENTA: readonly TransicionVenta[] = [
  // Verificación de pago (panel del admin).
  { desde: "por-verificar", a: "en-preparacion", disparador: "verificacion" },
  { desde: "por-verificar", a: "en-espera", disparador: "verificacion" },
  { desde: "por-verificar", a: "rechazado", disparador: "verificacion" },
  { desde: "en-espera", a: "en-preparacion", disparador: "verificacion" },
  { desde: "en-espera", a: "rechazado", disparador: "verificacion" },
  // El cliente sube el comprobante del dinero faltante: la venta vuelve a
  // "por-verificar" para que el admin la revise de nuevo.
  { desde: "en-espera", a: "por-verificar", disparador: "cliente" },
  // Cocina: la venta sale "en-preparacion" y sólo vuelve a avanzar cuando su
  // orden de producción se completa.
  { desde: "en-preparacion", a: "venta", disparador: "orden-produccion" },
  // Entrega: por botón O por la hora de recogida (§13). Los DOS disparadores
  // llevan al mismo estado final.
  { desde: "venta", a: "completado", disparador: "entrega" },
  { desde: "venta", a: "completado", disparador: "hora-recogida" },
  // Salidas excepcionales, siempre por sus botones.
  { desde: "por-verificar", a: "perdida", disparador: "devolucion" },
  { desde: "en-espera", a: "perdida", disparador: "devolucion" },
  { desde: "en-preparacion", a: "perdida", disparador: "devolucion" },
  { desde: "venta", a: "perdida", disparador: "devolucion" },
  { desde: "completado", a: "perdida", disparador: "devolucion" },
  { desde: "por-verificar", a: "rechazado", disparador: "anulacion" },
  { desde: "en-espera", a: "rechazado", disparador: "anulacion" },
  { desde: "en-preparacion", a: "rechazado", disparador: "anulacion" },
  { desde: "venta", a: "rechazado", disparador: "anulacion" },
  { desde: "completado", a: "rechazado", disparador: "anulacion" },
];

/** ¿Existe esta transición en la tabla? Todas las escrituras de estado deben
 *  pasar por aquí antes de tocar el registro. */
export const puedeTransicionar = (desde: EstadoVenta, a: EstadoVenta): boolean =>
  TRANSICIONES_VENTA.some((t) => t.desde === desde && t.a === a);

/** Disparadores permitidos para una transición (p. ej. "venta → completado"
 *  admite el botón "Entregar" y el auto-completado por hora, §13). */
export const disparadoresDe = (desde: EstadoVenta, a: EstadoVenta): DisparadorVenta[] =>
  TRANSICIONES_VENTA.filter((t) => t.desde === desde && t.a === a).map((t) => t.disparador);

/** Estados de los que ya no se avanza por flujo (quedan como registro). */
export const ESTADOS_FINALES: readonly EstadoVenta[] = ["completado", "rechazado", "perdida", "anulado"];

/**
 * Ejemplo listo para el backend: aplica una transición a un registro con
 * historial y devuelve `null` si la tabla no la permite. El frontend hoy hace
 * los mismos pasos con `setPedidos`; esta función queda como referencia
 * canónica del mismo camino.
 */
export function aplicarTransicion<
  T extends { estado: EstadoVenta; historial?: { estado: EstadoVenta; hora: string }[] },
>(venta: T, a: EstadoVenta, hora: string): T | null {
  if (!puedeTransicionar(venta.estado, a)) return null;
  return {
    ...venta,
    estado: a,
    historial: [...(venta.historial ?? []), { estado: a, hora }],
  };
}
