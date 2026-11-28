import React from "react";
import { motion } from "motion/react";
import { SERIF } from "@/features/product-categories/utils/product-categories";
import { X } from "lucide-react";

export function SmModal({
  title,
  onClose,
  onConfirm,
  confirmLabel,
  children,
  ancho = "max-w-sm",
  scroll = false,
}: {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  children: React.ReactNode;
  /** Ancho del modal; max-w-sm por defecto para que Editar quede igual. */
  ancho?: string;
  /** Con true el cuerpo scrollea por dentro (max-h-[90vh]) y header/pie
      quedan fijos. Solo lo usa el modal Crear. */
  scroll?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.16 }}
        className={`bg-card rounded-2xl w-full ${ancho} shadow-2xl border border-border ${
          scroll ? "max-h-[90vh] flex flex-col" : ""
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h3
            className="text-lg font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 max-md:p-3.5 max-md:-m-2 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div
          className={`px-5 py-4 ${
            scroll ? "flex-1 min-h-0 overflow-y-auto" : ""
          }`}
        >
          {children}
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 max-md:min-h-11 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 max-md:min-h-11 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
