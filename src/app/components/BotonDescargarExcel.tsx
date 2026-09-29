import { FileSpreadsheet } from "lucide-react";

export function BotonDescargarExcel({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Descargar Excel"
      className="inline-flex items-center gap-2 px-5 py-3 bg-card border border-[#2E7D32] text-foreground font-semibold rounded-xl shadow-sm hover:bg-[#2E7D32]/10 hover:shadow-md active:scale-95 transition-all cursor-pointer text-sm"
    >
      <FileSpreadsheet className="w-[18px] h-[18px] text-[#2E7D32] shrink-0" />
      Descargar Excel
    </button>
  );
}
