import type { RefObject } from "react";

/**
 * Abre el calendario nativo de un `<input type="date">`.
 *
 * En Chrome/Edge/Firefox recientes, hacer clic o enfocar el campo NO despliega
 * el picker: hay que llamar `showPicker()` de forma explícita. Sin esto, en
 * "Recepción de compra" y en "Nueva Compra" el usuario debe pulsar el pequeño
 * ícono del navegador para elegir la fecha.
 *
 * Se usa SOLO desde `onClick` (nunca desde `onFocus`). Antes se disparaba en
 * ambos eventos y, en un campo que ya tenía fecha, la secuencia era:
 *   1. `focus`  → `showPicker()` abre el calendario;
 *   2. `click`  → segunda llamada, que ya no tiene "user gesture" válida y
 *      lanza `NotAllowedError` (verificado en Chrome y Edge).
 * Es decir, cada clic generaba una excepción silenciada por el `try/catch`.
 * Con una única llamada desde `onClick` el calendario se abre a la primera y
 * sin errores.
 *
 * La llamada se DIFIERE un frame con `requestAnimationFrame` para que corra
 * después del procesamiento nativo del clic (foco + posición del cursor), que
 * es lo que hace que Chrome/Edge no cierre el picker recién abierto. El gesto
 * del usuario se conserva dentro de ese frame, de modo que `showPicker()` no
 * vuelve a exigir un clic previo.
 *
 * Se envuelve en `try/catch` porque `showPicker()` lanza `InvalidStateError`
 * cuando el input está oculto o no está en el documento (p. ej. al desmontar),
 * y no queremos que un fallo del calendario rompa el formulario.
 *
 * Uso: `onClick={() => abrirPicker(ref)}` en el input que tenga el `ref`.
 */
export function abrirPicker(ref: RefObject<HTMLInputElement | null> | null | undefined) {
  const el = ref?.current;
  if (!el) return;
  requestAnimationFrame(() => {
    try {
      el.showPicker();
    } catch {
      /* sin soporte (Safari viejo) o input no visible: el input nativo sigue
         siendo usable con el ícono del navegador */
    }
  });
}
