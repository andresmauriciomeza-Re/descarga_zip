import React from "react";
import { Package, Pencil, Trash2 } from "lucide-react";
import { calcularLineaIva } from "@/features/compras/services/iva";
// Mismo estilo que la columna Acciones de ActionIcons: el lápiz y el basurero
// de esta tabla deben verse grises y con hover neutro, nunca azules ni rojos.
import { CLASE_BASE, CLASE_HOVER } from "@/shared/components/ActionIcons";

export interface InsumoSolicitadoRow {
  rowId: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  iva: number;
  /** P14: de qué catálogo salió la línea (insumo o producto). Opcional:
   *  las filas antiguas se leen como insumo y la Orden de Compra no lo
   *  necesita para calcular nada. */
  tipoItem?: "insumo" | "producto";
  /** Precio de VENTA al público del producto: se muestra como
   *  "Producto · Venta: $ X" bajo el nombre cuando hay tipo producto. */
  precioVenta?: number;
  /** Ajuste de bebidas: unidades que trae la paca/caja de la línea (las
   *  filas de la OC heredan el empaque). Se lee como 1 si no viene. */
  unidadesPorEmpaque?: number;
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
  onEdit,
  rowEditando = null,
  sinScrollX = false,
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
  mostrarSubtotal = true,
  textoVacioPagina,
  className = "",
}: {
  items: InsumoSolicitadoRow[];
  onRemove?: (rowId: string) => void;
  /** Lápiz de la fila: en vez de editar EN LÍNEA (se eliminó), carga el ítem
   *  en el formulario de la izquierda de la pantalla llamante. */
  onEdit?: (item: InsumoSolicitadoRow) => void;
  /** rowId del ítem cargado en el formulario: su fila se resalta suavemente
   *  mientras se edita. */
  rowEditando?: string | null;
  /** Queda fijo al ancho del panel (sin `min-width` ni scroll horizontal):
   *  sólo lo usa la tabla editable de la Orden de Compra. Los demás usos
   *  conservan el ancho mínimo y el scroll de siempre. */
  sinScrollX?: boolean;
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
  /** Punto 3.3: false en la Orden de Compra — la tabla del formulario lleva
   *  las columnas literales del plan (sin Subtotal por fila). */
  mostrarSubtotal?: boolean;
  /** Texto de la fila vacía en modo página (p. ej. "Aún no has agregado
   *  ítems" cuando la orden admite insumos Y productos). */
  textoVacioPagina?: string;
  className?: string;
}) {
  const esAmber = tono === "amber";

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
      const l = calcularLinea(item);
      acc.baseSinIva += l.baseSinIva;
      acc.montoIva += l.montoIva;
      acc.total += l.subtotalConIva;
      return acc;
    },
    { baseSinIva: 0, montoIva: 0, total: 0 }
  );

  const subtotalGeneral = modoIva ? totales.baseSinIva : items.reduce((sum, item) => {
    return sum + item.cantidad * item.precioUnitario;
  }, 0);
  const ivaGeneral = modoIva ? totales.montoIva : items.reduce((sum, item) => {
    const subtotal = item.cantidad * item.precioUnitario;
    return sum + subtotal * (item.iva / 100);
  }, 0);
  const total = modoIva ? totales.total : subtotalGeneral + ivaGeneral;

  const mostrarColsIva = modoIva || mostrarIva;
  const colIvaSimple = mostrarColsIva && enPagina;
  const headers = ["Nombre", "Cantidad", "Medida", "Monto unitario"];
  if (mostrarColsIva) {
    if (colIvaSimple || !modoIva) headers.push("IVA");
    else { headers.push("IVA (%)"); headers.push("Monto IVA"); }
  }
  // Punto 3.3: en el formulario de la Orden de Compra la tabla lleva las
  // columnas literales del plan (sin Subtotal por fila: el resumen de abajo
  // ya trae Subtotal / IVA / Total).
  if (mostrarSubtotal) headers.push(modoIva && !enPagina ? "Subtotal (con IVA)" : "Subtotal");
  const columnCount = headers.length + (showActions ? 1 : 0);
  const colSpanPie = headers.length - 1;
  const labelSubtotal = modoIva && !enPagina ? "Subtotal sin IVA" : subtotalLabel;
  const ivaDeLinea = (row: InsumoSolicitadoRow) =>
    modoIva
      ? calcularLinea(row).montoIva
      : row.cantidad * row.precioUnitario * (row.iva / 100);

  // align-middle: las celdas con dos líneas (nombre + etiqueta, IVA + monto)
  // quedan centradas verticalmente respecto a las de una sola línea.
  const tdBase =
    "align-middle " +
    (sinScrollX ? "px-1 " : "px-1.5 ") +
    (enPagina ? "py-2" : "py-2.5");

  /**
   * Anchos fijos de columna para `table-layout: fixed`. Sólo "Nombre" queda
   * sin ancho para que se lleve todo el espacio que sobra; los demás son
   * valores fijos en px calculados para que la tabla quepa en los ~502 px de
   * la columna derecha a 1366×768 SIN scroll horizontal y con la columna de
   * Acciones (lápiz + basurero) siempre visible. Si la pantalla es más
   * angosta, `min-w` conserva el ancho mínimo y el scroll queda dentro del
   * contenedor de la tabla (salvo con `sinScrollX`, que lo desactiva).
   */
  const ANCHOS: Record<string, number | undefined> = {
    Cantidad: sinScrollX ? 54 : 68,
    Medida: sinScrollX ? 48 : 56,
    "Monto unitario": sinScrollX ? 66 : 68,
    IVA: sinScrollX ? 48 : 60,
    "IVA (%)": sinScrollX ? 48 : 60,
    "Monto IVA": sinScrollX ? 58 : 73,
    Subtotal: sinScrollX ? 68 : 83,
    "Subtotal (con IVA)": sinScrollX ? 88 : 126,
  };
  const ANCHO_ACCIONES = sinScrollX ? 76 : 66;
  const ANCHO_MINIMO = 500;
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
                {textoVacioPagina ?? "Aún no has agregado insumos"}
              </span>
            ) : (
              "Sin insumos agregados"
            )}
          </td>
        </tr>
      ) : (
        items.map((item) => {
          // Fila cargada en el formulario de la izquierda: se resalta
          // suavemente mientras se edita (la edición NO ocurre en la fila).
          const enEdicion = rowEditando === item.rowId;

          return (
            <tr
              key={item.rowId}
              className={`hover:bg-muted/20 transition-colors ${enEdicion ? "bg-primary/5" : ""}`}
            >
              <td className={tdBase + " text-sm font-medium text-foreground min-w-0"}>
                <div
                  className={sinScrollX ? "truncate" : "line-clamp-2 break-words"}
                  title={item.nombre}
                >
                  {item.nombre}
                </div>
                {/* P14: debajo del nombre se deja ver de qué catálogo salió la
                    línea y, si es producto, su precio de venta al público
                    (dato informativo: NO entra en los cálculos de la factura,
                    que usan siempre el monto unitario). */}
                {(item.tipoItem ?? "insumo") === "producto" && (
                  <div className="text-[11px] font-normal text-muted-foreground mt-0.5">
                    Producto
                    {!sinScrollX && item.precioVenta != null && item.precioVenta > 0 && (
                      <> · Venta: {fmtCOP(item.precioVenta)}</>
                    )}
                  </div>
                )}
              </td>

              <td className={tdBase + " text-sm"}>
                {item.cantidad}
              </td>

              {/* Punto 3.3: la medida es de SOLO LECTURA (la define el ítem
                  del catálogo): no se edita ni al agregar ni al editar. */}
              <td className={tdBase + " text-xs text-muted-foreground"}>
                {item.unidad}
              </td>

              <td className={tdBase + " text-sm"}>
                {fmtCOP(item.precioUnitario)}
              </td>

              {colIvaSimple && (
                <td className={tdBase + " text-xs"}>
                  <span className="text-[13px] text-foreground/80">{item.iva}%</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {fmtCOP(ivaDeLinea(item))}
                  </p>
                </td>
              )}

              {!colIvaSimple && modoIva && (
                <td className={tdBase + " text-xs text-muted-foreground"}>
                  {item.iva + "%"}
                </td>
              )}

              {!colIvaSimple && modoIva && (
                <td className={tdBase + " text-xs text-muted-foreground whitespace-nowrap"}>
                  {fmtCOP(calcularLinea(item).montoIva)}
                </td>
              )}

              {!colIvaSimple && !modoIva && mostrarColsIva && (
                <td className={tdBase + " text-xs text-muted-foreground"}>
                  {item.iva}%
                </td>
              )}

              {mostrarSubtotal && (
                <td className={tdBase + " text-sm font-semibold"}>
                  {modoIva
                    ? fmtCOP(calcularLinea(item).subtotalConIva)
                    : fmtCOP(item.cantidad * item.precioUnitario)}
                </td>
              )}

              {showActions && (
                <td className={tdBase + " whitespace-nowrap"}>
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        title="Editar ítem"
                        className={`${CLASE_BASE} ${CLASE_HOVER}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove?.(item.rowId)}
                      title="Eliminar insumo"
                      className={`${CLASE_BASE} ${CLASE_HOVER}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
        <div
          className={
            "flex-1 min-h-0 " +
            // `sinScrollX`: la tabla se queda en el ancho del panel (sin
            // desplazamiento horizontal); los demás usos conservan el
            // `overflow-auto` de siempre con su `min-width`.
            (sinScrollX ? "overflow-y-auto overflow-x-hidden" : "overflow-auto")
          }
        >
          <table
            className="table-fixed w-full text-sm [&_td]:py-2"
            style={sinScrollX ? undefined : { minWidth: ANCHO_MINIMO }}
          >
            {colgroup}
            <thead
              className={"text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b border-border " +
                (esAmber ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground")}
            >
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className={`${sinScrollX ? "px-1" : "px-1.5"} py-1.5 text-left font-semibold bg-muted`}
                  >
                    {h}
                  </th>
                ))}
                {showActions && (
                  <th className={`${sinScrollX ? "px-1" : "px-1.5"} py-1.5 bg-muted`} />
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
        className={
          "flex-1 min-h-0 " +
          (sinScrollX ? "overflow-y-auto overflow-x-hidden" : "overflow-auto") +
          (enPagina && items.length === 0 ? " flex items-center" : "")
        }
      >
        <table
          className={"table-fixed w-full text-sm " + (enPagina ? "[&_td]:py-2" : "")}
          style={sinScrollX ? undefined : { minWidth: ANCHO_MINIMO }}
        >
          {colgroup}
          <thead
            className={"text-[10px] uppercase tracking-wider " +
              (esAmber ? "bg-amber-50 text-amber-700" : "bg-muted/50 text-muted-foreground")}
          >
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className={(sinScrollX ? "px-1 " : "px-1.5 ") + (enPagina ? "py-1.5" : "py-2.5") + " text-left font-semibold " +
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
                  className={(sinScrollX ? "px-1 py-2.5 " : "px-1.5 py-2.5 ") +
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