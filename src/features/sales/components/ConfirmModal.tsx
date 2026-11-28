import { type ReactNode, useEffect } from "react";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";

// ─────────────────────────── LOCAL CONFIRM MODAL ───────────────────────────

export function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  tone = "peligro",
  children,
  confirmDisabled = false,
  confirmLabel = "Sí, confirmar",
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** "aviso": el botón de la acción va en rojo lleno (no es destructiva). */
  tone?: "peligro" | "aviso";
  /** Slot opcional entre el mensaje y los botones (motivo del rechazo). */
  children?: ReactNode;
  /** Apaga el botón de confirmar sin desmontar el diálogo. */
  confirmDisabled?: boolean;
  confirmLabel?: string;
}) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCancel]);
  return (
    <>
      <div className="pn-dialogo-fondo" onClick={onCancel} />
      <div className="pn-dialogo" role="alertdialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        <div className="pn-dialogo__caja">
          <strong>Qué va a pasar:</strong>
          {message}
        </div>
        {children}
        <div className="pn-dialogo__botones">
          <BotonAccion variante="oscuro" onClick={onCancel}>No, dejarlo como está</BotonAccion>
          <BotonAccion variante={tone === "aviso" ? "principal" : "peligro"} disabled={confirmDisabled} onClick={onConfirm}>
            {confirmLabel}
          </BotonAccion>
        </div>
      </div>
    </>
  );
}
