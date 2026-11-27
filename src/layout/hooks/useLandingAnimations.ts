import { type PointerEvent as ReactPointerEvent } from "react";

/** Curva de entrada de la landing: desaceleración suave, sin rebotes. */
export const REVEAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Props de revelado al entrar en viewport. `once` evita re-animar la sección
    en cada movimiento del scroll (y al actualizar el catálogo). `x` y `scale`
    permiten variar la dirección y la profundidad sin repetir el mismo efecto. */
export const reveal = (
  delay = 0,
  y = 18,
  amount = 0.2,
  x = 0,
  scale = 1,
) => ({
  initial: { opacity: 0, y, x, scale },
  whileInView: { opacity: 1, y: 0, x: 0, scale: 1 },
  viewport: { once: true, amount },
  transition: { duration: 0.5, delay, ease: REVEAL_EASE },
});

/** Parallax de la foto de una favorita: solo puntero fino (ratón), nunca
    táctil. Escribe variables CSS, así que no re-renderiza la tarjeta y el
    navegador compone el movimiento con el zoom de hover. */
export function desplazarFotoProducto(e: ReactPointerEvent<HTMLDivElement>) {
  if (e.pointerType !== "mouse") return;
  const caja = e.currentTarget.getBoundingClientRect();
  if (caja.width === 0 || caja.height === 0) return;
  const x = ((e.clientX - caja.left) / caja.width - 0.5) * 8;
  const y = ((e.clientY - caja.top) / caja.height - 0.5) * 8;
  e.currentTarget.style.setProperty("--foto-x", `${x.toFixed(2)}px`);
  e.currentTarget.style.setProperty("--foto-y", `${y.toFixed(2)}px`);
}

export function reposarFotoProducto(e: ReactPointerEvent<HTMLDivElement>) {
  e.currentTarget.style.setProperty("--foto-x", "0px");
  e.currentTarget.style.setProperty("--foto-y", "0px");
}

export function inclinarTarjetaProducto(e: ReactPointerEvent<HTMLDivElement>) {
  if (e.pointerType !== "mouse") return;
  const caja = e.currentTarget.getBoundingClientRect();
  if (caja.width === 0 || caja.height === 0) return;
  const x = (e.clientX - caja.left) / caja.width - 0.5;
  const y = (e.clientY - caja.top) / caja.height - 0.5;
  e.currentTarget.style.setProperty("--card-tilt-x", `${(-y * 4).toFixed(2)}deg`);
  e.currentTarget.style.setProperty("--card-tilt-y", `${(x * 4).toFixed(2)}deg`);
}

export function reposarTarjetaProducto(e: ReactPointerEvent<HTMLDivElement>) {
  e.currentTarget.style.setProperty("--card-tilt-x", "0deg");
  e.currentTarget.style.setProperty("--card-tilt-y", "0deg");
}
