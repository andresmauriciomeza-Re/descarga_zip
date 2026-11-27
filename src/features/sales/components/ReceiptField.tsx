import React from "react";
import { esComprobantePdf } from "@/shared/utils/receipt";
import { FileText, X, Upload } from "lucide-react";

/**
 * Bloque de comprobante (input oculto + vista previa + "Quitar") que comparten
 * los modales que adjuntan un soporte: sube a Cloudinary con las mismas reglas
 * de `useSubirArchivo` (JPG/PNG/WEBP/PDF, máx. 5 MB).
 * Se dejó de usar en la verificación de pago (el rechazo ya no pide adjunto y
 * su motivo se elige en el modal de confirmación); lo retoman los modales de
 * anulación, donde el comprobante de la devolución es opcional.
 */
export function CampoComprobante({
  fileRef,
  url,
  onQuitar,
  subiendo,
  onSubir,
  etiquetaBoton,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  url: string | null;
  onQuitar: () => void;
  subiendo: boolean;
  onSubir: (file: File) => void;
  etiquetaBoton: string;
}) {
  const esPdf = !!url && esComprobantePdf(url);
  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          onSubir(file);
          e.target.value = "";
        }}
      />
      {url ? (
        <div className="relative rounded-xl overflow-hidden border border-border">
          {esPdf ? (
            <div className="flex items-center gap-2 p-3 text-sm text-foreground">
              <FileText className="w-4 h-4 text-primary" /> Comprobante adjunto
            </div>
          ) : (
            <img src={url} alt="Comprobante" className="w-full object-contain max-h-56" />
          )}
          <button
            onClick={onQuitar}
            className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer"
            aria-label="Quitar comprobante"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={subiendo}
          className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-border text-center hover:border-primary/40 cursor-pointer transition-colors"
        >
          <Upload className="w-6 h-6 text-muted-foreground/50" />
          <span className="text-sm font-semibold text-foreground">
            {subiendo ? "Subiendo..." : etiquetaBoton}
          </span>
          <span className="text-xs text-muted-foreground">JPG, PNG, WEBP o PDF · máx 5 MB</span>
        </button>
      )}
    </>
  );
}
