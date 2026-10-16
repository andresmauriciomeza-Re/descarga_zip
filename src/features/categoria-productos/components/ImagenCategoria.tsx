import { IMAGENES_CATEGORIA, esImagenContenida } from "@/features/categoria-productos/services/imagenesCategoria";

/**
 * §5 — Imagen de una categoría en cualquier vista (tabla, detalle, modal y
 * landing). `clave` es la clave "img:…" del catálogo; los datos viejos con
 * emoji se pintan como texto para no romper lo que ya está guardado.
 *
 * - `img:pizza`, `img:coca-cola`, `img:pepsi`, `img:premio` y `img:quatro`
 *   van con object-contain (la foto completa, sin recorte).
 * - El resto — lasañas incluidas — van con object-cover.
 */
export function ImagenCategoria({
  clave,
  className = "w-8 h-8",
  alt = "",
  emojiClassName = "text-2xl",
}: {
  clave?: string;
  className?: string;
  alt?: string;
  emojiClassName?: string;
}) {
  if (!clave) return null;
  const url = IMAGENES_CATEGORIA[clave];
  if (!url) {
    // Emoji legacy (categorías creadas antes de §5).
    return (
      <span aria-hidden="true" className={emojiClassName}>
        {clave}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={`${className} rounded-lg ${esImagenContenida(clave) ? "object-contain" : "object-cover"}`}
    />
  );
}
