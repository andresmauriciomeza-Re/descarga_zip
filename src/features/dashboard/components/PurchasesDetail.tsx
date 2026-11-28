import { type WeekEntry, SERIF, fmtCOP } from "@/features/dashboard/utils/dashboard";
import type { OrdenItem } from "@/features/purchase-orders/utils/purchase-orders";
import { motion } from "motion/react";
import { ChevronLeft } from "lucide-react";

// ── Week detail: Compras ─────────────────────────────────────────────
export function ComprasDetail({ week, items, total, onBack }: { week: WeekEntry; items: OrdenItem[]; total: number; onBack: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button onClick={onBack} className="p-2 max-md:p-3 rounded-xl hover:bg-muted cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Compras · {week.range}</p>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: SERIF }}>{week.label}</h2>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-700">{fmtCOP(total)}</p>
          <p className="text-xs text-muted-foreground">total en insumos</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-semibold">Sin compras registradas esta semana</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Insumos comprados</p>
            <p className="text-xs text-muted-foreground">{items.length} ítems</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[35rem]">
              <thead className="bg-muted/50">
                <tr>{["Insumo","Cantidad","Precio unit.","Subtotal"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((x, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{x.nombre}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">{x.cantidad} {x.unidad}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">{fmtCOP(x.costoUnitario)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground tabular-nums">{fmtCOP(x.cantidad * x.costoUnitario)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 border-t border-border">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-bold text-foreground">Total</td>
                  <td className="px-4 py-3 text-sm font-bold text-blue-700 tabular-nums">{fmtCOP(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
