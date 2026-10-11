import { motion } from "motion/react";
import { AlertCircle } from "lucide-react";

const SERIF = "var(--font-titulo)";

interface ConfirmDeleteModalProps {
  title: string;
  message: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  /** Modo informativo (punto 3, proveedores): icono ámbar y UN solo botón
   *  "Entendido", sin Cancelar ni confirmación. Es opt-in: el resto de
   *  pantallas siguen recibiendo la alerta de confirmación de siempre. */
  informativo?: boolean;
}

export function ConfirmDeleteModal({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Eliminar",
  informativo = false,
}: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${informativo ? "bg-amber-100" : "bg-red-100"}`}>
            <AlertCircle className={`w-5 h-5 ${informativo ? "text-amber-600" : "text-red-600"}`} />
          </div>
          <h3
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            {title}
          </h3>
        </div>
        <p className="text-muted-foreground mb-6 leading-relaxed">{message}</p>
        {informativo ? (
          <button
            onClick={onCancel}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
          >
            Entendido
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 cursor-pointer active:scale-95"
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
