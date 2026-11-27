import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Pone un botón a la derecha de la franja «Estás en: …» (RutaPagina) del panel,
 * desde cualquier pantalla: <BotonRuta><BotonAccion>Volver a la lista</BotonAccion></BotonRuta>.
 * Si la franja no está en pantalla, no pinta nada.
 */
export function BotonRuta({ children }: { children: ReactNode }) {
  const [destino, setDestino] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setDestino(document.getElementById("pn-ruta-boton"));
  }, []);
  return destino ? createPortal(children, destino) : null;
}
