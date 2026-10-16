import { useCallback, useEffect, useState, type WheelEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

/** Visor ampliado de imágenes (comprobantes, etc.): overlay a pantalla
    completa con fondo oscuro y la imagen centrada al máximo tamaño legible.
    Se cierra con la X, con la tecla Esc o con un clic fuera de la imagen.
    El zoom se alterna con clic sobre la imagen y se acerca/aleja con la
    rueda del mouse. Sin librerías extra: todo con React + Tailwind. */
export function VisorImagen({
  src,
  alt,
  onClose,
}: {
  src: string | null;
  alt?: string;
  onClose: () => void;
}) {
  // Nivel de zoom: 1 = ajuste normal; al hacer clic se amplía al doble.
  const [zoom, setZoom] = useState(false);

  // Al abrir/cerrar se restablece el zoom.
  useEffect(() => {
    setZoom(false);
  }, [src]);

  // Esc cierra el visor.
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, onClose]);

  // Rueda del mouse: acerca (deltaY < 0) o aleja (deltaY > 0).
  const onWheel = useCallback((e: WheelEvent) => {
    setZoom(e.deltaY < 0);
  }, []);

  return (
    <AnimatePresence>
      {src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onWheel={onWheel}
          className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 overflow-hidden"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={alt ?? "Visor de imagen"}
        >
          {/* Botón cerrar (X). */}
          <button
            onClick={onClose}
            aria-label="Cerrar visor"
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Indicador de zoom. */}
          <span className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 text-xs text-white/70">
            {zoom ? <ZoomIn className="w-3.5 h-3.5" /> : <ZoomOut className="w-3.5 h-3.5" />}
            {zoom ? "Zoom x2 — clic para reducir" : "Clic para ampliar · rueda para zoom"}
          </span>

          {/* Imagen centrada. El clic sobre ella no la cierra (solo amplía). */}
          <motion.img
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            src={src}
            alt={alt ?? "Comprobante ampliado"}
            onClick={(e) => { e.stopPropagation(); setZoom((z) => !z); }}
            className={`max-h-full max-w-full rounded-lg shadow-2xl transition-transform duration-200 ${
              zoom ? "scale-[2] cursor-zoom-out" : "cursor-zoom-in"
            }`}
            style={{ objectFit: "contain" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
