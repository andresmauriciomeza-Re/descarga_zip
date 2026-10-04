import React, { useState } from "react";
import { Check, Package, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { UNIDADES } from "./CompactInsumoForm";
import { calcularLineaIva } from "../utils/iva";

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

/**
 * Número seguro para los inputs en modo edición: vacío o basura → 0, y nunca
 * NaN (Number("") es 0, pero Number("abc") es NaN y arruina todos los cálculos
 * de la fila: quedaría "$ NaN" y totales NaN).
 */
function toNum(v: string | number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Altura fija de TODOS los controles de edición (32 px) para que las 4 celdas
// queden idénticas y la fila no cambie de alto al entrar o salir de edición.
const cellInputCls =
  "w-full h-8 px-1.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 " +
  // Los spinners del input numérico se comen ~18px de una celda fija angosta;
  // sin ellos el valor (ej. "12500") entra completo y se sigue escribiendo con
  // el teclado.
  "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

// Símbolo "%" a la derecha DENTRO del input de IVA (el valor va a la izquierda,
// así no se pisa con el símbolo en valores de 1 a 3 dígitos).
const sufijoIva = (
  <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-[11px] text-muted-foreground">
    %
  </span>
);

type DraftRow = Pick<InsumoSolicitadoRow, "cantidad" | "unidad" | "precioUnitario" | "iva">;

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
  modoIva = false,
  ivaIncluido = false,
  enPagina = false,
  className = "",
}: {
  items: InsumoSolicitadoRow[];
  onRemove?: (rowId: string) => void;
  onUpdate?: (rowId: string, patch: DraftRow) => void;
  showActions?: boolean;
  titulo?: string;
  tono?: "normal" | "amber";
  subtotalLabel?: string;
  mostrarIva?: boolean;
  mostrarTotal?: boolean;
  totalLabel?: string;
  modoIva?: boolean;
  ivaIncluido?: boolean;
  enPagina?: boolean;
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
      iva: item.iva,
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setDraft(null);
  };

  const commitEdit = () => {
    if (editId && draft) {
      // Nunca se reemplaza la fila: sólo entran estos 4 campos editables, así
      // que id, nombre y unidad se conservan siempre (mergeRow hace lo mismo
      // para el borrador en pantalla).
      const cantidad = toNum(draft.cantidad);
      const precioUnitario = toNum(draft.precioUnitario);
      const iva = toNum(draft.iva);

      if (cantidad <= 0) {
        toast.error("La cantidad debe ser mayor a 0.");
        return; // se queda en modo edición, no se pierde lo escrito
      }
      if (precioUnitario <= 0) {
        toast.error("El monto unitario debe ser mayor a 0.");
        return;
      }
      if (iva < 0 || iva > 100) {
        toast.error("El IVA debe estar entre 0 y 100.");
        return;
      }

      onUpdate?.(editId, {
        cantidad,
        unidad: draft.unidad,
        precioUnitario,
        iva,
      });
    }

    cancelEdit();
  };

  const calcularLinea = (row: InsumoSolicitadoRow) =>
    modoIva
      ? calcularLineaIva({
          cantidad: row.cantidad,
          montoUnitario: row.precioUnitario,
          porcentajeIva: row.iva,
          ivaIncluido,
        })
      : (() => {
          const subtotal = row.cantidad * row.precioUnitario;
          return {
            baseSinIva: subtotal,
            montoIva: subtotal * (row.iva / 100),
            subtotalConIva: subtotal + subtotal * (row.iva / 100),
          };
        })();

  const totales = items.reduce(
    (acc, item) => {
      const d = editId === item.rowId ? draft : null;
      const row = d ? mergeRow(item, d) : item;
      const l = calcularLinea(row);
      acc.baseSinIva += l.baseSinIva;
      acc.montoIva += l.montoIva;
      acc.total += l.subtotalConIva;
      return acc;
    },
    { baseSinIva: 0, montoIva: 0, total: 0 }
  );

  const subtotalGeneral = modoIva ? totales.baseSinIva : items.reduce((sum, item) => {
    const d = editId === item.rowId ? draft : null;
    const cantidad = d ? d.cantidad : item.cantidad;
    const precio = d ? d.precioUnitario : item.precioUnitario;
    return sum + cantidad * precio;
  }, 0);
  const ivaGeneral = modoIva ? totales.montoIva : items.reduce((sum, item) => {
    const d = editId === item.rowId ? draft : null;
    const cantidad = d ? d.cantidad : item.cantidad;
    const precio = d ? d.precioUnitario : item.precioUnitario;
    const subtotal = cantidad * precio;
    return sum + subtotal * (item.iva / 100);
  }, 0);
  const total = modoIva ? totales.total : subtotalGeneral + ivaGeneral;

  const mostrarColsIva = modoIva || mostrarIva;
  const colIvaSimple = mostrarColsIva && enPagina;
  const headers = ["Nombre", "Cantidad", "Unidad", "Monto unitario"];
  if (mostrarColsIva) {
    if (colIvaSimple || !modoIva) headers.push("IVA");
    else { headers.push("IVA (%)"); headers.push("Monto IVA"); }
  }
  headers.push(modoIva && !enPagina ? "Subtotal (con IVA)" : "Subtotal");
  const columnCount = headers.length + (showActions ? 1 : 0);
  const colSpanPie = headers.length - 1;
  const labelSubtotal = modoIva && !enPagina ? "Subtotal sin IVA" : subtotalLabel;
  const ivaDeLinea = (row: InsumoSolicitadoRow) =>
    modoIva
      ? calcularLinea(row).montoIva
      : row.cantidad * row.precioUnitario * (row.iva / 100);

  // align-middle: en modo edición los inputs son cajas inline y, con el valor
  // por defecto (baseline), quedaban desplazados respecto a las celdas de
  // texto; así los 4 controles quedan centrados verticalmente en la fila.
  const tdBase = "align-middle px-1.5 " + (enPagina ? "py-2" : "py-2.5");

  /**
   * Anchos fijos de columna para `table-layout: fixed`. Sólo "Nombre" queda
   * sin ancho para que se lleve todo el espacio que sobra; los demás son
   * valores fijos en px calculados para que la tabla quepa en los ~502 px de
   * la columna derecha a 1366×768 SIN scroll horizontal y con la columna de
   * Acciones (lápiz + basurero) siempre visible. Si la pantalla es más
   * angosta, `min-w` conserva el ancho mínimo y el scroll queda dentro del
   * contenedor de la tabla.
   */
  const ANCHOS: Record<string, number | undefined> = {
    Cantidad: 68,
    Unidad: 56,
    "Monto unitario": 68,
    IVA: 60,
    "IVA (%)": 60,
    "Monto IVA": 73,
    Subtotal: 83,
    "Subtotal (con IVA)": 126,
  };
  const ANCHO_ACCIONES = 66;
  const colgroup = (
    <colgroup>
      {headers.map((h) => (
        <col key={h} style={ANCHOS[h] ? { width: ANCHOS[h] } : undefined} />
      ))}
      {showActions && <col style={{ width: ANCHO_ACCIONES }} />}
    </colgroup>
  );

  const renderTbody = () => (
    <tbody className={"divide-y " + (esAmber ? "divide-amber-100" : "divide-border")}>
      {items.length === 0 ? (
        <tr>
          <td
            colSpan={columnCount}
            className={"text-center text-xs text-muted-foreground px-3 " + (enPagina ? "py-6" : "py-8")}
          >
            {enPagina ? (
              <span className="inline-flex items-center gap-2">
                <Package className="w-5 h-5 text-muted-foreground/40" />
                Aún no has agregado insumos
              </span>
            ) : (
              "Sin insumos agregados"
            )}
          </td>
        </tr>
      ) : (
        items.map((item) => {
          const draftRow = editId === item.rowId ? draft : null;
          const row = draftRow ? mergeRow(item, draftRow) : item;

          return (
            <tr key={item.rowId} className="hover:bg-muted/20">
              <td className={tdBase + " text-sm font-medium text-foreground"}>
                <div
                  className="line-clamp-2 break-words"
                  title={item.nombre}
                >
                  {item.nombre}
                </div>
              </td>

              <td className={tdBase + " text-sm"}>
                {draftRow ? (
                  <input
                    type="number"
                    min={0}
                    value={draftRow.cantidad}
                    onChange={(e) =>
                      setDraft({
                        ...draftRow,
                        cantidad: toNum(e.target.value),
                      })
                    }
                    className={cellInputCls}
                  />
                ) : (
                  row.cantidad
                )}
              </td>

              <td className={tdBase + " text-xs text-muted-foreground"}>
                {draftRow ? (
                  <select
                    value={draftRow.unidad}
                    onChange={(e) =>
                      setDraft({ ...draftRow, unidad: e.target.value })
                    }
                    className={cellInputCls + " appearance-none cursor-pointer"}
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

              <td className={tdBase + " text-sm"}>
                {draftRow ? (
                  <input
                    type="number"
                    min={0}
                    value={draftRow.precioUnitario}
                    onChange={(e) =>
                      setDraft({
                        ...draftRow,
                        precioUnitario: toNum(e.target.value),
                      })
                    }
                    className={cellInputCls}
                  />
                ) : (
                  fmtCOP(row.precioUnitario)
                )}
              </td>

              {colIvaSimple && (
                <td className={tdBase + " text-xs"}>
                  {draftRow ? (
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={draftRow.iva}
                        onChange={(e) =>
                          setDraft({
                            ...draftRow,
                            iva: toNum(e.target.value),
                          })
                        }
                        className={cellInputCls}
                      />
                      {sufijoIva}
                    </div>
                  ) : (
                    <span className="text-[13px] text-foreground/80">{row.iva}%</span>
                  )}
                  {/* Mientras se edita el monto no se pinta: quedaba "$ 0"
                      debajo del input y agrandaba la fila. */}
                  {!draftRow && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {fmtCOP(ivaDeLinea(row))}
                    </p>
                  )}
                </td>
              )}

              {!colIvaSimple && modoIva && (
                <td className={tdBase + " text-xs text-muted-foreground"}>
                  {draftRow ? (
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={draftRow.iva}
                        onChange={(e) =>
                          setDraft({
                            ...draftRow,
                            iva: toNum(e.target.value),
                          })
                        }
                        className={cellInputCls}
                      />
                      {sufijoIva}
                    </div>
                  ) : (
                    row.iva + "%"
                  )}
                </td>
              )}

              {!colIvaSimple && modoIva && (
                <td className={tdBase + " text-xs text-muted-foreground whitespace-nowrap"}>
                  {fmtCOP(calcularLinea(row).montoIva)}
                </td>
              )}

              {!colIvaSimple && !modoIva && mostrarColsIva && (
                <td className={tdBase + " text-xs text-muted-foreground"}>
                  {row.iva}%
                </td>
              )}

              <td className={tdBase + " text-sm font-semibold"}>
                {modoIva
                  ? fmtCOP(calcularLinea(row).subtotalConIva)
                  : fmtCOP(row.cantidad * row.precioUnitario)}
              </td>

              {showActions && (
                <td className={tdBase + " whitespace-nowrap"}>
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
  );

  const renderTfoot = () => (
    <>
      {items.length > 0 && !enPagina && (
        <tfoot
          className={"border-t " +
            (esAmber ? "bg-amber-50 border-amber-200" : "bg-muted/50 border-border")}
        >
          <tr>
            <td
              colSpan={colSpanPie}
              className={"px-1.5 py-2 text-xs font-bold text-right uppercase tracking-wider " +
                (esAmber ? "text-amber-700" : "text-muted-foreground")}
            >
              {labelSubtotal}
            </td>
            <td className={"px-1.5 py-2 text-sm font-bold " + (esAmber ? "text-amber-700" : "text-foreground")}>
              {fmtCOP(subtotalGeneral)}
            </td>
            {showActions && <td />}
          </tr>
          {mostrarIva && (
            <tr>
              <td
                colSpan={colSpanPie}
                className="px-1.5 py-2 text-xs font-bold text-muted-foreground text-right uppercase tracking-wider"
              >
                IVA
              </td>
              <td className="px-1.5 py-2 text-sm font-bold text-foreground">
                {fmtCOP(ivaGeneral)}
              </td>
              {showActions && <td />}
            </tr>
          )}
          {mostrarTotal && (
            <tr>
              <td
                colSpan={colSpanPie}
                className="px-1.5 py-2 text-xs font-bold text-muted-foreground text-right uppercase tracking-wider"
              >
                {totalLabel}
              </td>
              <td className="px-1.5 py-2 text-sm font-bold text-foreground">
                {fmtCOP(total)}
              </td>
              {showActions && <td />}
            </tr>
          )}
        </tfoot>
      )}
    </>
  );

  const renderTotalesExternos = () =>
    enPagina && items.length > 0 && (
      <div className="flex items-baseline justify-end gap-5 shrink-0 px-3 py-1.5 border-t border-border">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {labelSubtotal}
        </span>
        <span className="text-sm font-semibold text-foreground">
          {fmtCOP(subtotalGeneral)}
        </span>
        {mostrarIva && (
          <>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              IVA
            </span>
            <span className="text-sm font-semibold text-foreground">
              {fmtCOP(ivaGeneral)}
            </span>
          </>
        )}
        {mostrarTotal && (
          <>
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
              {totalLabel}
            </span>
            <span className="text-lg font-bold text-foreground">
              {fmtCOP(total)}
            </span>
          </>
        )}
      </div>
    );

  if (enPagina) {
    return (
      <div className={"flex flex-col flex-1 min-h-0 " + className}>
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="table-fixed w-full min-w-[500px] text-sm [&_td]:py-2">
            {colgroup}
            <thead
              className={"text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b border-border " +
                (esAmber ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground")}
            >
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="px-1.5 py-1.5 text-left font-semibold bg-muted"
                  >
                    {h}
                  </th>
                ))}
                {showActions && (
                  <th className="px-1.5 py-1.5 bg-muted" />
                )}
              </tr>
            </thead>
            {renderTbody()}
            {renderTfoot()}
          </table>
        </div>

        {renderTotalesExternos()}
      </div>
    );
  }

  return (
    <div
      className={"rounded-xl border overflow-hidden flex flex-col " +
        (esAmber ? "bg-amber-50/40 border-amber-200" : "bg-muted/30 border-border") +
        " " + className}
    >
      {!enPagina && (
        <div
          className={"px-3 py-2 border-b shrink-0 " +
            (esAmber ? "border-amber-200 bg-amber-100/50" : "border-border bg-muted/30")}
        >
          <p
            className={"text-xs font-bold uppercase tracking-wider " +
              (esAmber ? "text-amber-700" : "text-muted-foreground")}
          >
            {titulo}
          </p>
        </div>
      )}
      <div
        className={"flex-1 min-h-0 overflow-auto " +
          (enPagina && items.length === 0 ? "flex items-center" : "")}
      >
        <table className={"table-fixed w-full min-w-[500px] text-sm " + (enPagina ? "[&_td]:py-2" : "")}>
          {colgroup}
          <thead
            className={"text-[10px] uppercase tracking-wider " +
              (esAmber ? "bg-amber-50 text-amber-700" : "bg-muted/50 text-muted-foreground")}
          >
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className={"px-1.5 " + (enPagina ? "py-1.5" : "py-2.5") + " text-left font-semibold " +
                    (enPagina
                      ? "sticky top-0 z-10 border-b border-border " +
                        (esAmber ? "bg-amber-50" : "bg-muted")
                      : "")}
                >
                  {h}
                </th>
              ))}
              {showActions && (
                <th
                  className={"px-1.5 py-2.5 " +
                    (enPagina
                      ? "sticky top-0 z-10 border-b border-border " +
                        (esAmber ? "bg-amber-50" : "bg-muted")
                      : "")}
                />
              )}
            </tr>
          </thead>
          {renderTbody()}
          {renderTfoot()}
        </table>
      </div>

      {renderTotalesExternos()}
    </div>
  );
}