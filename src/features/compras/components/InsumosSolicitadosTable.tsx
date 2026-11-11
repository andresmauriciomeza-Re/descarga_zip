import React from "react";
import { Package, Pencil, Trash2 } from "lucide-react";
import { calcularLineaIva, formatearChipIva, formatearModoIva } from "@/features/compras/services/iva";
// Mismo estilo que la columna Acciones de ActionIcons: el lápiz y el basurero
// de esta tabla deben verse grises y con hover neutro, nunca azules ni rojos.
import { CLASE_BASE, CLASE_HOVER } from "@/shared/components/ActionIcons";

export interface InsumoSolicitadoRow {
  rowId: string;
  idInsumo: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  iva?: number;
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
  modoIva?: "incluido" | "mas_iva" | "exento";
  factorPresentacion?: number;
  unidadBase?: string;
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
  subtotalLabel = "Subtotal sin IVA",
  mostrarIva = true,
  mostrarTotal = true,
  totalLabel = "Total estimado",
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
  enPagina?: boolean;
  /** Oculta la columna Subtotal por fila cuando la pantalla ya la presenta aparte. */
  mostrarSubtotal?: boolean;
  /** Texto de la fila vacía en modo página (p. ej. "Aún no has agregado
   *  ítems" cuando la orden admite insumos Y productos). */
  textoVacioPagina?: string;
  className?: string;
}) {
  const esAmber = tono === "amber";

  const calcularLinea = (row: InsumoSolicitadoRow) =>
    calcularLineaIva({
      cantidad: row.cantidad,
      montoUnitario: row.precioUnitario,
      porcentajeIva: row.iva ?? 0,
      modoIva: row.modoIva ?? "incluido",
    });

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

  const subtotalGeneral = totales.baseSinIva;
  const ivaGeneral = totales.montoIva;
  const total = totales.total;

  const headers = ["Nombre", "Cantidad + presentación", "Monto unitario"];
  if (mostrarIva) headers.push("IVA");
  if (mostrarSubtotal) headers.push("Subtotal");
  const columnCount = headers.length + (showActions ? 1 : 0);
  const colSpanPie = headers.length - 1;
  const labelSubtotal = subtotalLabel;
  const ivaDeLinea = (row: InsumoSolicitadoRow) =>
    calcularLinea(row).montoIva;
  const etiquetaModoIva = (row: InsumoSolicitadoRow) =>
    formatearModoIva(row.modoIva ?? "incluido", row.iva);
  const faltaIva = (row: InsumoSolicitadoRow) =>
    (row.modoIva ?? "incluido") !== "exento" && row.iva == null;

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
    "Cantidad + presentación": sinScrollX ? 96 : 104,
    "Monto unitario": sinScrollX ? 82 : 90,
    IVA: sinScrollX ? 68 : 82,
    Subtotal: sinScrollX ? 78 : 88,
  };
  const ANCHO_ACCIONES = sinScrollX ? 66 : 66;
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
                <div className="text-[11px] font-normal text-muted-foreground mt-0.5 break-words">
                  {(item.tipoItem ?? "insumo") === "producto" && "Producto · "}
                  {etiquetaModoIva(item)}
                  {(item.tipoItem ?? "insumo") === "producto" &&
                    !sinScrollX && item.precioVenta != null && item.precioVenta > 0 && (
                      <> · Venta: {fmtCOP(item.precioVenta)}</>
                    )}
                </div>
              </td>

              <td className={tdBase + " text-sm"}>
                <span>{item.cantidad}</span>
                <span className="block text-[11px] text-muted-foreground truncate" title={item.unidad}>
                  {item.unidad}
                </span>
              </td>

              <td className={tdBase + " text-sm"}>
                {fmtCOP(item.precioUnitario)}
              </td>

              {mostrarIva && (
                <td className={tdBase + " text-[10px] text-muted-foreground"}>
                  <span
                    className="inline-flex max-w-full rounded-full bg-muted px-1.5 py-1 font-semibold whitespace-nowrap"
                    title={`${etiquetaModoIva(item)} · IVA ${fmtCOP(ivaDeLinea(item))}`}
                  >
                    {faltaIva(item)
                      ? <span className="text-red-500">Ingresa el IVA.</span>
                      : formatearChipIva(item.modoIva ?? "incluido", item.iva ?? 0)}
                  </span>
                </td>
              )}

              {mostrarSubtotal && (
                <td className={tdBase + " text-sm font-semibold"}>
                  {fmtCOP(calcularLinea(item).subtotalConIva)}
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
                    className={`${sinScrollX ? "px-1" : "px-1.5"} py-1.5 text-left font-semibold leading-tight whitespace-normal bg-muted`}
                  >
                    {h === "Cantidad + presentación" ? (
                      <>Cantidad +<br />presentación</>
                    ) : h === "Monto unitario" ? (
                      <>Monto<br />unitario</>
                    ) : h}
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
                  className={(sinScrollX ? "px-1 " : "px-1.5 ") + (enPagina ? "py-1.5" : "py-2.5") + " text-left font-semibold leading-tight whitespace-normal " +
                    (enPagina
                      ? "sticky top-0 z-10 border-b border-border " +
                        (esAmber ? "bg-amber-50" : "bg-muted")
                      : "")}
                >
                  {h === "Cantidad + presentación" ? (
                    <>Cantidad +<br />presentación</>
                  ) : h === "Monto unitario" ? (
                    <>Monto<br />unitario</>
                  ) : h}
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