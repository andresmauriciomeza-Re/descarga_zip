import { useId, useState, type RefObject } from "react";
import { MensajeError } from "@/shared/components/FormInputs";
import { TERMINOS_CONDICIONES, TITULO_TERMINOS } from "@/shared/utils/termsAndConditions";
import { X } from "lucide-react";

/**
 * Clases glass de Login y Registro: ahora viven en
 * `@/shared/styles/authGlass` y se reutilizan en los modales de contraseña.
 */

export function AceptacionTerminos({ aceptados, onChange, error, inputRef }: {
  aceptados: boolean;
  onChange: (aceptados: boolean) => void;
  error?: string;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const [abierto, setAbierto] = useState(false);
  const id = useId();
  return (
    <div>
      <div className="flex items-start max-md:items-center gap-2 text-sm text-foreground dark:text-white">
        <input id={id} ref={inputRef} type="checkbox" checked={aceptados} onChange={(e) => onChange(e.target.checked)}
          aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
          className="mt-1 max-md:mt-0 max-md:w-6 max-md:h-6 accent-primary" />
        <span className="max-md:flex max-md:flex-wrap max-md:items-center"><label htmlFor={id} className="max-md:inline-flex max-md:items-center max-md:min-h-11">Acepto los&nbsp;</label>
          <button type="button" onClick={() => setAbierto(true)} className="text-primary font-semibold underline cursor-pointer max-md:min-h-11">términos y condiciones</button>
        </span>
      </div>
      <MensajeError id={`${id}-error`} err={error} />
      {abierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby={`${id}-titulo`} onKeyDown={(e) => { if (e.key === "Escape") setAbierto(false); }}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex justify-between gap-4 mb-4">
              <h2 id={`${id}-titulo`} className="font-bold text-foreground">{TITULO_TERMINOS}</h2>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar términos y condiciones" className="p-1 max-md:p-3.5 max-md:-m-2.5 text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm text-foreground">{TERMINOS_CONDICIONES.map((texto) => <p key={texto}>{texto}</p>)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
