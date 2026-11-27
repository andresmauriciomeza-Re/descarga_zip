import type { ResumenPagosVenta } from "@/features/sales/services/salesApi";
import { fmtCOP } from "@/features/sales/utils/sales";

export function ContadorPagos({ resumen }: { resumen?: ResumenPagosVenta }) {
  return (
    <p className="text-xs text-muted-foreground">
      {resumen
        ? `Recibido: ${fmtCOP(resumen.recibido)} · En revisión: ${fmtCOP(resumen.en_revision)} · Falta: ${fmtCOP(resumen.falta)}`
        : "Resumen de pagos no disponible"}
    </p>
  );
}
