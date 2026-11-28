import type { ReactNode } from "react";

export type TonoPill = "verde" | "ambar" | "azul" | "rojo" | "gris" | "morado";

/** Estado con color + puntico + texto (nunca solo color). */
export function EstadoPill({ tono, children }: { tono: TonoPill; children: ReactNode }) {
  return <span className={`pn-pill pn-pill--${tono}`}>{children}</span>;
}
