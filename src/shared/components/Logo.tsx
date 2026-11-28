import type { ImgHTMLAttributes } from "react";
// `?no-inline`: como archivo aparte, para que el navegador baje solo el que use.
import blanco64 from "@/assets/img/logo-blanco-64.webp?no-inline";
import blanco128 from "@/assets/img/logo-blanco-128.webp?no-inline";
import claro64 from "@/assets/img/logoclaro2-64.webp?no-inline";
import claro128 from "@/assets/img/logoclaro2-128.webp?no-inline";

const VARIANTES = {
  /** Letras blancas, para fondos oscuros. */
  blanco: [blanco64, blanco128],
  /** Letras negras, para fondos claros. */
  claro: [claro64, claro128],
};

/** Logo de la pizzería. El tamaño visible lo pone cada lugar con sus clases. */
export function Logo({ variante, ...props }: { variante: keyof typeof VARIANTES } & ImgHTMLAttributes<HTMLImageElement>) {
  const [x1, x2] = VARIANTES[variante];
  return <img src={x1} srcSet={`${x1} 1x, ${x2} 2x`} width={64} height={64} {...props} />;
}
