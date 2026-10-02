import React, { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { UNIDADES } from "./CompactInsumoForm";

export interface InsumoSolicitadoRow {
  rowId: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  iva: number;
}

function fmtCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

const cellInputCls =
  "px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary/30";

type DraftRow = Pick<InsumoSolicitadoRow, "cantidad" | "unidad" | "precioUnitario">;

function mergeRow(item: InsumoSolicitadoRow, draft: DraftRow): InsumoSolicitadoRow {
  return { ...item, ...draft };
}

export function InsumosSolicitadosTable({
  items,
  onRemove,
  onUpdate,
  showActions = true,
  titulo = "Insumos solicitados",
  tono = "normal",
  subtotalLabel = "Subtotal",
  mostrarIva = true,
  mostrarTotal = true,
  totalLabel = "Total estimado",
  className = "",
}: {
  items: InsumoSolicitadoRow[];
  onRemove?: (rowId: string) => void;
  /** Habilita la edición en línea de cantidad, unidad y precio unitario. */
  onUpdate?: (rowId: string, patch: DraftRow) => void;
  showActions?: boolean;
  /** Titulo de la tabla (p. ej. "Insumos recibidos"). */
  titulo?: string;
  /** "amber" pinta la tabla como insumos no solicitados. */
  tono?: "normal" | "amber";
  /** Etiqueta de la fila de subtotal del pie. */
  subtotalLabel?: string;
  /** Muestra la fila de IVA (los detalles de compra no lo usan). */
  mostrarIva?: boolean;
  /** Muestra la fila final con `totalLabel`. */
  mostrarTotal?: boolean;
  totalLabel?: string;
  /** Clases del contenedor; usar "flex-1 min-h-0" para que la tabla scrollee sola. */
  className?: string;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRow | null>(null);
  const esAmber = tono === "amber";

  const startEdit = (item: InsumoSolicitadoRow) => {
    setEditId(item.rowId);
    setDraft({
      cantidad: item.cantidad,
      unidad: item.unidad,
      precioUnitario: item.precioUnitario,
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setDraft(null);
  };

  const commitEdit = () => {
    if (editId && draft) {
      onUpdate?.(editId, {
        cantidad: Math.max(0, draft.cantidad),
        unidad: draft.unidad,
        precioUnitario: Math.max(0, draft.precioUnitario),
      });
    }

    cancelEdit();
  };

  // Punto 1: El Subtotal de cada fila es cantidad × precio (sin IVA).
  // El IVA se suma aparte en el Total general.
  const subtotalGeneral = items.reduce((sum, item) => {
    const d = editId === item.rowId ? draft : null;
    const cantidad = d ? d.cantidad : item.cantidad;
    const precio = d ? d.precioUnitario : item.precioUnitario;
    return sum + cantidad * precio;
  }, 0);
  const ivaGeneral = items.reduce((sum, item) => {
    const d = editId === item.rowId ? draft : null;
    const cantidad = d ? d.cantidad : item.cantidad;
    const precio = d ? d.precioUnitario : item.precioUnitario;
    const subtotal = cantidad * precio;
    return sum + subtotal * (item.iva / 100);
  }, 0);
  const total = subtotalGeneral + ivaGeneral;
  const columnCount = (showActions ? 7 : 6) - (mostrarIva ? 0 : 1);
  // El pie alinea la etiqueta bajo "Monto unitario"; el valor cae en "Subtotal"
  // y, si hay acciones, la última columna queda para los botones.
  const colSpanPie = mostrarIva ? 5 : 4;

  return (
    <div
      className={`rounded-xl border overflow-hidden flex flex-col ${
        esAmber ? "bg-amber-50/40 border-amber-200" : "bg-muted/30 border-border"
      } ${className}`}
    >
      <div
        className={`px-3 py-2 border-b shrink-0 ${
          esAmber ? "border-amber-200 bg-amber-100/50" : "border-border bg-muted/30"
        }`}
      >
        <p
          className={`text-xs font-bold uppercase tracking-wider ${
            esAmber ? "text-amber-700" : "text-muted-foreground"
          }`}
        >
          {titulo}
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-sm">
        <thead
          className={`text-xs uppercase tracking-wider ${
            esAmber ? "bg-amber-50 text-amber-700" : "bg-muted/50 text-muted-foreground"
          }`}
        >
          <tr>
            {["Nombre", "Cantidad", "Unidad", "Monto unitario", ...(mostrarIva ? ["IVA"] : []), "Subtotal"].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left font-semibold">
                {h}
              </th>
            ))}
            {showActions && <th className="px-3 py-2.5" />}
          </tr>
        </thead>
        <tbody className={`divide-y ${esAmber ? "divide-amber-100" : "divide-border"}`}>
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
            items.map((item) => {
              const draftRow: DraftRow | null =
                editId === item.rowId ? draft : null;
              const row: InsumoSolicitadoRow = draftRow ? mergeRow(item, draftRow) : item;

              return (
                <tr key={item.rowId} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5 text-sm font-medium text-foreground">
                    {item.nombre}
                  </td>

                  <td className="px-3 py-2.5 text-sm">
                    {draftRow ? (
                      <input
                        type="number"
                        min={0}
                        value={draftRow.cantidad}
                        onChange={(e) =>
                          setDraft({
                            ...draftRow,
                            cantidad: Number(e.target.value),
                          })
                        }
                        className={`${cellInputCls} w-16`}
                      />
                    ) : (
                      row.cantidad
                    )}
                  </td>

                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {draftRow ? (
                      <select
                        value={draftRow.unidad}
                        onChange={(e) =>
                          setDraft({ ...draftRow, unidad: e.target.value })
                        }
                        className={`${cellInputCls} w-[72px] cursor-pointer`}
                      >
                        {UNIDADES.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    ) : (
                      row.unidad
                    )}
                  </td>

                  <td className="px-3 py-2.5 text-sm">
                    {draftRow ? (
                      <input
                        type="number"
                        min={0}
                        value={draftRow.precioUnitario}
                        onChange={(e) =>
                          setDraft({
                            ...draftRow,
                            precioUnitario: Number(e.target.value),
                          })
                        }
                        className={`${cellInputCls} w-24`}
                      />
                    ) : (
                      fmtCOP(row.precioUnitario)
                    )}
                  </td>

                  {mostrarIva && (
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {row.iva}%
                    </td>
                  )}

                  <td className="px-3 py-2.5 text-sm font-semibold">
                    {fmtCOP(row.cantidad * row.precioUnitario)}
                  </td>

                  {showActions && (
                    <td className="px-3 py-2.5">
                      {draftRow ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={commitEdit}
                            title="Guardar cambios"
                            className="p-1 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            title="Cancelar"
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {onUpdate && (
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              title="Editar insumo"
                              className="p-1 rounded text-blue-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onRemove?.(item.rowId)}
                            title="Eliminar insumo"
                            className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
        {items.length > 0 && (
          <tfoot
            className={`border-t ${
              esAmber ? "bg-amber-50 border-amber-200" : "bg-muted/50 border-border"
            }`}
          >
            <tr>
              <td
                colSpan={colSpanPie}
                className={`px-3 py-2 text-xs font-bold text-right uppercase tracking-wider ${
                  esAmber ? "text-amber-700" : "text-muted-foreground"
                }`}
              >
                {subtotalLabel}
              </td>
              <td className={`px-3 py-2 text-sm font-bold ${esAmber ? "text-amber-700" : "text-foreground"}`}>
                {fmtCOP(subtotalGeneral)}
              </td>
              {showActions && <td />}
            </tr>
            {mostrarIva && (
              <tr>
                <td
                  colSpan={colSpanPie}
                  className="px-3 py-2 text-xs font-bold text-muted-foreground text-right uppercase tracking-wider"
                >
                  IVA
                </td>
                <td className="px-3 py-2 text-sm font-bold text-foreground">
                  {fmtCOP(ivaGeneral)}
                </td>
                {showActions && <td />}
              </tr>
            )}
            {mostrarTotal && (
              <tr>
                <td
                  colSpan={colSpanPie}
                  className="px-3 py-2 text-xs font-bold text-muted-foreground text-right uppercase tracking-wider"
                >
                  {totalLabel}
                </td>
                <td className="px-3 py-2 text-sm font-bold text-foreground">
                  {fmtCOP(total)}
                </td>
                {showActions && <td />}
              </tr>
            )}
          </tfoot>
        )}
        </table>
      </div>
    </div>
  );
}
