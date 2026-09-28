import { motion } from "motion/react";
import { AlertCircle } from "lucide-react";

const SERIF = "var(--font-titulo)";

interface ConfirmDeleteModalProps {
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}

export function ConfirmDeleteModal({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Eliminar",
}: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border p-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <h3 className="font-bold text-foreground" style={{ fontFamily: SERIF }}>
            {title}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
