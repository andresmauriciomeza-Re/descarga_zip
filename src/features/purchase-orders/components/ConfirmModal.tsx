import React from "react";
import { motion } from "motion/react";
import { SERIF } from "@/features/purchase-orders/utils/purchase-orders";

// ��������� CONFIRM MODAL ������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

export function ConfirmModal({
  title, body, detail, confirmLabel = "Confirmar", danger = false, icon, onConfirm, onCancel, showMotivo = false, motivo, onMotivoChange, loading = false,
}: {
  // `body` es opcional: hay confirmaciones que solo llevan `detail` como
  // advertencia (p. ej. "¿Está seguro de los cambios?"). Antes era obligatorio y
  // esas 3 llamadas fallaban el typecheck mientras en runtime pintaban un <p> vacío.
  title: string; body?: string; detail?: string; confirmLabel?: string;
  danger?: boolean; icon?: React.ReactNode; onConfirm: () => void; onCancel: () => void;
  showMotivo?: boolean; motivo?: string; onMotivoChange?: (value: string) => void;
  loading?: boolean;
}) {
  // Punto 6: sin motivo no hay anulación. Mientras el campo esté vacío el botón
  // de confirmación queda bloqueado y el aviso se mantiene visible (no aparece
  // solo tras un clic fallido).
  const motivoVacio = showMotivo && !(motivo ?? "").trim();

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border"
      >
        {icon && <div className="mb-3">{icon}</div>}
        <h3 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: SERIF }}>{title}</h3>
        {body && <p className="text-sm text-muted-foreground mb-1 leading-relaxed">{body}</p>}
        {detail && (
          <p className={`text-sm font-semibold mb-5 ${danger ? "text-red-600" : "text-amber-600"}`}>{detail}</p>
        )}
        {!detail && <div className="mb-5" />}
        {showMotivo && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Motivo de anulación</label>
            <textarea
              value={motivo || ""}
              onChange={e => onMotivoChange?.(e.target.value)}
              placeholder="Escribe el motivo de la anulación..."
              className="w-full px-3 py-2 max-md:min-h-11 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              rows={3}
            />
            {/* Punto 6: aviso permanente mientras el motivo siga vacío. */}
            {motivoVacio && (
              <p className="text-xs font-semibold text-red-600 mt-1.5">
                Debes escribir el motivo de la anulación
              </p>
            )}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 max-md:min-h-11 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={motivoVacio || loading}
            aria-disabled={motivoVacio || loading}
            className={`flex-1 py-2.5 max-md:min-h-11 rounded-xl text-sm font-semibold text-white transition-colors ${
              motivoVacio
                ? "bg-red-300 cursor-not-allowed"
                : "cursor-pointer active:scale-95 " + (danger ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-red-700")
            }`}
          >
            {loading ? "Guardando…" : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
