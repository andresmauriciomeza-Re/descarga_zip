import type { RefObject } from "react";

/**
 * Abre el calendario nativo de un `<input type="date">`.
 *
 * En Chrome/Edge/Firefox recientes, hacer clic o enfocar el campo NO despliega
 * el picker: hay que llamar `showPicker()` de forma explícita. Sin esto, en
 * "Recepción de compra" y en "Nueva Compra" el usuario debe pulsar el pequeño
 * ícono del navegador para elegir la fecha.
 *
 * Se envuelve en `try/catch` porque `showPicker()` lanza `InvalidStateError`
 * cuando el input está oculto o no está en el documento (p. ej. al desmontar),
 * y no queremos que un fallo del calendario rompa el formulario.
 *
 * Uso: `onClick={() => abrirPicker(ref)}` y `onFocus={() => abrirPicker(ref)}`
 * en el input que tenga el `ref`.
 */
export function abrirPicker(ref: RefObject<HTMLInputElement | null> | null | undefined) {
  const el = ref?.current;
  if (!el) return;
  try {
    el.showPicker();
  } catch {
    /* sin soporte (Safari viejo) o input no visible: el input nativo sigue
       siendo usable con el ícono del navegador */
  }
}
