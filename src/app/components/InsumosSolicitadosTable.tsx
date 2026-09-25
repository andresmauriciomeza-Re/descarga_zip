import React from "react";
import { Trash2 } from "lucide-react";

export interface InsumoSolicitadoRow {
  rowId: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
}

function fmtCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function InsumosSolicitadosTable({
  items,
  onRemove,
  showActions = true,
  totalLabel = "Total estimado",
}: {
  items: InsumoSolicitadoRow[];
  onRemove?: (rowId: string) => void;
  showActions?: boolean;
  totalLabel?: string;
}) {
  const total = items.reduce(
    (sum, item) => sum + item.cantidad * item.precioUnitario,
    0
  );
  const columnCount = showActions ? 6 : 5;

  return (
    <div className="bg-muted/30 rounded-xl border border-border overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Insumos solicitados
        </p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
          <tr>
            {["Nombre", "Cantidad", "Unidad", "P. unitario", "Subtotal"].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left font-semibold">
                {h}
              </th>
            ))}
            {showActions && <th className="px-3 py-2.5" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={columnCount}
                className="px-3 py-8 text-center text-xs text-muted-foreground"
              >
                Sin insumos agregados
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.rowId} className="hover:bg-muted/20">
                <td className="px-3 py-2.5 text-sm font-medium text-foreground">
                  {item.nombre}
                </td>
                <td className="px-3 py-2.5 text-sm">{item.cantidad}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {item.unidad}
                </td>
                <td className="px-3 py-2.5 text-sm">
                  {fmtCOP(item.precioUnitario)}
                </td>
                <td className="px-3 py-2.5 text-sm font-semibold">
                  {fmtCOP(item.cantidad * item.precioUnitario)}
                </td>
                {showActions && (
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => onRemove?.(item.rowId)}
                      className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
        {items.length > 0 && (
          <tfoot className="bg-muted/50 border-t border-border">
            <tr>
              <td
                colSpan={showActions ? 5 : 4}
                className="px-3 py-2 text-xs font-bold text-muted-foreground text-right uppercase tracking-wider"
              >
                {totalLabel}
              </td>
              <td className="px-3 py-2 text-sm font-bold text-foreground">
                {fmtCOP(total)}
              </td>
              {showActions && <td />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
