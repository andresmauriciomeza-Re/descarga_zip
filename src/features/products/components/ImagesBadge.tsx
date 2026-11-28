import { type Producto, imagenesDe } from "@/features/products/utils/products";
import { Image as ImageIcon } from "lucide-react";

/** Indicador de cuántas imágenes tiene un producto, en la segunda línea de la
    columna Nombre del listado (P13). Va debajo del nombre (y no a su lado)
    para no ensanchar la columna ni recortar el nombre. Sin imágenes no se
    pinta nada, para dejar intactas las filas de los productos de antes. */
export function BadgeImagenes({ p }: { p: Producto }) {
  const n = imagenesDe(p).length;
  if (n === 0) return null;
  return (
    <span
      className="mt-0.5 inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-muted-foreground whitespace-nowrap"
      title={`${n} ${n === 1 ? "imagen" : "imágenes"} del producto · la primera es la portada`}
    >
      <ImageIcon className="w-3 h-3" />
      {n} {n === 1 ? "imagen" : "imágenes"}
    </span>
  );
}
