import React, { useEffect } from "react";
import { motion } from "motion/react";
import { SERIF } from "@/features/supplies/utils/supplies";

// ─── Producto Insumo: limpieza de nombres ───────────────────────────────────
// Bloque 3: `nombreLimpio`, `nombreParaGuardar` (mayúscula inicial, sólo al
// CREAR: los insumos existentes conservan su nombre tal cual) y las claves de
// comparación `normalizarTexto` / `mismoNombre` (sin tildes ni mayúsculas,
// para que "Salsa  de TOMATE" y "salsa de tomate" cuenten como el mismo
// nombre) ahora viven compartidos en `shared/utils/nombres`, junto al
// "+ Crear insumo" de Compras. Antes esta pantalla tenía su propia copia.

/**
 * Diálogo de confirmación del módulo. Se extrajo del JSX inline que usaban
 * "Crear", "Cancelar" y activar/inactivar para que el flujo de eliminar
 * reutilice exactamente el mismo estilo (fondo del tema, rounded-2xl y dos
 * botones del mismo ancho). `titulo` e `icono` son opcionales: los flujos
 * preexistentes se pintan igual que siempre. Con `soloConfirmar` se pinta un
 * ÚNICO botón (diálogo informativo, p. ej. "no se puede eliminar");
 * `cerrarConEscYOverlay` / `enfocarCancelar` solo se activan en los diálogos
 * de eliminar para no alterar el comportamiento de los demás flujos.
 */
export function ConfirmDialog({
  mensaje,
  titulo,
  icono,
  textoConfirmar = "Confirmar",
  soloConfirmar = false,
  cerrarConEscYOverlay = false,
  enfocarCancelar = false,
  onConfirmar,
  onCancelar,
}: {
  mensaje: React.ReactNode;
  titulo?: string;
  icono?: React.ReactNode;
  textoConfirmar?: string;
  /** true = un solo botón (el informativo), sin "Cancelar". */
  soloConfirmar?: boolean;
  cerrarConEscYOverlay?: boolean;
  enfocarCancelar?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  // Esc cierra sin eliminar, igual que pulsar "Cancelar".
  useEffect(() => {
    if (!cerrarConEscYOverlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cerrarConEscYOverlay, onCancelar]);

  // Foco inicial en el único botón (informativo) o en Cancelar: Enter nunca
  // elimina por accidente.
  useEffect(() => {
    if (enfocarCancelar) cancelRef.current?.focus();
  }, [enfocarCancelar]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4"
      onClick={
        cerrarConEscYOverlay
          ? (e) => {
              // Solo un clic en el overlay (fuera del diálogo) lo cierra.
              if (e.target === e.currentTarget) onCancelar();
            }
          : undefined
      }
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border p-6"
      >
        {icono && <div className="mb-3">{icono}</div>}
        {titulo && (
          <h3 className="text-lg font-bold text-foreground mb-2" style={{ fontFamily: SERIF }}>
            {titulo}
          </h3>
        )}
        <p className={`text-sm mb-5 ${titulo ? "text-muted-foreground" : "text-foreground"}`}>
          {mensaje}
        </p>
        <div className="flex gap-3">
          {!soloConfirmar && (
            <button
              ref={cancelRef}
              onClick={onCancelar}
              className="flex-1 py-2.5 max-md:min-h-11 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            ref={soloConfirmar ? cancelRef : undefined}
            onClick={onConfirmar}
            className="flex-1 py-2.5 max-md:min-h-11 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all"
          >
            {textoConfirmar}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
