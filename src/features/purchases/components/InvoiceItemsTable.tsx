import { type ItemFactura, fmtCOP } from "@/features/purchases/utils/purchases";
import { calcularLineaIva, sumarTotales, etiquetaModoIvaSimple, resolverModoIva, chipIvaSinPrefijo } from "@/features/purchases/services/vat";
import { etiquetaPresentacion } from "@/shared/utils/units";

// ─── P14: TABLA DE ÍTEMAS DE LA FACTURA ──────────────────────────────────────

/**
 * P14: tabla de los ítems agregados en la Nueva compra.
 *
 * Punto 3.3: columnas LITERALES del plan — Nombre | Cantidad | Medida |
 * Monto unitario | IVA | Acciones (editar/eliminar) — con el resumen
 * Subtotal / IVA / Total debajo.
 *
 * Es LOCAL y no reutiliza `InsumosSolicitadosTable`: la edición se carga en el
 * formulario de la izquierda y conserva la fila original. Los cálculos son
 * los mismos: `calcularLineaIva` con la opción de precios elegida, de modo que
 * la suma incluye por igual insumos y productos.
 */
export function TablaItemsFactura({
  items,
  onEdit,
  onRemove,
  enPagina = false,
  rowEditando = null,
  className = "",
  soloLectura = false,
}: {
  items: ItemFactura[];
  /** Lápiz: carga la fila en el formulario de la izquierda. */
  onEdit: (row: ItemFactura) => void;
  onRemove: (rowId: string) => void;
  /** Misma estructura que la tabla compartida: sin card ni título. */
  enPagina?: boolean;
  /** Fila cargada en el formulario (se resalta suavemente). */
  rowEditando?: string | null;
  className?: string;
  /** Detalle de una factura: sin los botones «Cambiar» y «Quitar». */
  soloLectura?: boolean;
}) {
  // Fórmula única (`iva.ts`): cada línea usa su propio `modoIva`; las líneas
  // viejas sin modo se leen como 'incluido' (mismo fallback que el backend).
  const linea = (row: ItemFactura) =>
    calcularLineaIva({
      cantidad: row.cantidad,
      montoUnitario: row.precioUnitario,
      porcentajeIva: row.iva,
      modoIva: row.modoIva ?? "incluido",
    });

  const totales = sumarTotales(items.map(linea));

  // Punto 3.3: columnas del plan con Nombre flexible y sin scroll horizontal.
  // Fase 4: "Cantidad + presentación" van juntas en UNA columna (antes
  // CANTIDAD y MEDIDA se superponían en los anchos fijos) y el IVA se muestra
  // como chip con el modo de la línea.
  const headers = ["Nombre", "Cantidad + presentación", "Monto unitario", "IVA", "Subtotal"];
  const ANCHOS: Record<string, string> = {
    "Cantidad + presentación": "5.375rem",
    "Monto unitario": "5.125rem",
    IVA: "3.625rem",
    Subtotal: "4.125rem",
  };
  const ANCHO_ACCIONES = "7rem";
  const columnCount = headers.length + 1;
  const td = "align-middle px-1 " + (enPagina ? "py-1.5" : "py-2.5");
  /** Columnas numéricas: se alinean a la derecha para que las cifras se lean
      como columnas de datos (punto 2.8c). */
  const NUMERICA = new Set(["Cantidad + presentación", "Monto unitario", "IVA", "Subtotal"]);

  return (
    <div
      className={
        (enPagina
          ? "flex flex-col flex-1 min-h-0 "
          : "rounded-xl border border-border bg-muted/30 overflow-hidden flex flex-col ") +
        className
      }
    >
      {!enPagina && (
        <div className="px-3 py-2 border-b border-border bg-muted/30 shrink-0">
          <p className="text-base font-bold uppercase tracking-wider text-muted-foreground">
            Ítems de la factura
          </p>
        </div>
      )}

      <div
        className={
          // Punto 2.8c: sin `flex items-center` cuando está vacío — centraba
          // el mensaje en toda la altura restante y dejaba EL HUECO GRANDE
          // entre "Precios con IVA incluido" y la tabla. Ahora el aviso queda
          // pegado a la cabecera.
          "flex-1 min-h-0 overflow-auto"
        }
      >
        {/* Punto 2.8c: sin `[&_td]:py-2` en página — esa regla pisaba el
            `py-1.5` de las celdas y las filas no se compactaban. */}
        <table
          className="pn-tabla-compra w-full"
        >
          <colgroup>
            {headers.map((h) => (
              <col key={h} style={{ width: ANCHOS[h] }} />
            ))}
            {!soloLectura && <col style={{ width: ANCHO_ACCIONES }} />}
          </colgroup>
          <thead
            className={
              "text-base uppercase tracking-wider " +
              (enPagina
                ? "sticky top-0 z-10 border-b border-border bg-muted text-muted-foreground"
                : "bg-muted/50 text-muted-foreground")
            }
          >
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className={
                    "px-1 font-semibold leading-tight whitespace-normal " +
                    (NUMERICA.has(h) ? "text-right " : "text-left ") +
                    (enPagina ? "py-1.5 bg-muted" : "py-2.5")
                  }
                >
                  {h === "Cantidad + presentación" ? (
                    <>Cantidad +<br />presentación</>
                  ) : h === "Monto unitario" ? (
                    <>Monto<br />unitario</>
                  ) : h}
                </th>
              ))}
              {!soloLectura && <th className={"px-1 " + (enPagina ? "py-1.5 bg-muted" : "py-2.5")} />}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="text-center max-md:text-left text-base font-medium text-muted-foreground/80 px-3 max-md:px-4 py-6"
                >
                  {enPagina ? "Aún no has agregado ítems" : "Sin ítems agregados"}
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const l = linea(row);
                const editandoFila = rowEditando === row.rowId;
                return (
                  <tr
                    key={row.rowId}
                    className={`hover:bg-muted/20 transition-colors ${
                      editandoFila ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className={td + " min-w-0 text-lg font-medium text-foreground"}>
                      <div className="truncate" title={row.nombre}>
                        {row.nombre}
                      </div>
                      <div className="text-base font-normal text-muted-foreground mt-0.5 break-words">
                        {(row.tipoItem ?? "insumo") === "producto" && "Producto · "}
                        {etiquetaModoIvaSimple(resolverModoIva(row, null))}
                      </div>
                    </td>
                    <td data-etiqueta="Cantidad" className={td + " text-right"}>
                      <div className="text-lg text-foreground">{row.cantidad}</div>
                      <div className="text-base text-muted-foreground break-words">
                        {etiquetaPresentacion(row.unidad, row.factorPresentacion, row.unidadBase, row.pesoMedida, row.tamanoUnidad)}
                      </div>
                    </td>
                    <td data-etiqueta="Monto unitario" className={td + " text-lg text-right whitespace-nowrap"}>
                      {fmtCOP(row.precioUnitario)}
                    </td>
                    <td data-etiqueta="IVA" className={td + " text-right"}>
                      <span
                        className="inline-block px-1.5 py-0.5 rounded-full text-base font-semibold whitespace-nowrap bg-muted text-muted-foreground border border-border"
                      >
                        {chipIvaSinPrefijo(resolverModoIva(row, null), row.iva)}
                      </span>
                      <p className="text-base text-muted-foreground mt-0.5 truncate">
                        {fmtCOP(l.montoIva)}
                      </p>
                    </td>
                    <td data-etiqueta="Subtotal" className={td + " text-lg font-semibold text-foreground text-right whitespace-nowrap"}>
                      {fmtCOP(l.subtotalConIva)}
                    </td>
                    {!soloLectura && (
                    <td className={td + " whitespace-nowrap"}>
                      {/* Mientras la fila está cargada en el formulario se
                          ocultan sus acciones (sin mover la columna). */}
                      <div
                        className={`flex flex-wrap items-center gap-2${editandoFila ? " invisible" : ""}`}
                        aria-hidden={editandoFila || undefined}
                      >
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          title="Editar ítem"
                          className="pn-boton pn-boton--normal"
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(row.rowId)}
                          title="Eliminar ítem"
                          className="pn-boton pn-boton--peligro"
                        >
                          Quitar
                        </button>
                      </div>
                    </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Punto 2.8c: el pie de totales vive DENTRO del scroller, pegado a la
            última fila. Antes era hermano del scroller y quedaba anclado al
            fondo de la columna, dejando un hueco grande (medido: 345 px a
            1366×768 con 1 ítem) entre la tabla y "Total pagado". Con muchas
            filas el scroller sigue absorbiendo el desborde. */}
        {items.length > 0 && (
          <div
            className={
              "flex flex-wrap items-baseline justify-end gap-x-5 gap-y-1 px-3 py-2 border-t border-border"
            }
          >
            <span className="text-base font-bold text-muted-foreground">
              Sin IVA
            </span>
            <span className="text-lg font-semibold text-foreground">
              {fmtCOP(totales.totalSinIva)}
            </span>
            <span className="text-base font-bold text-muted-foreground">
              IVA
            </span>
            <span className="text-lg font-semibold text-foreground">{fmtCOP(totales.totalIva)}</span>
            <span className="text-base font-bold text-muted-foreground">
              Total pagado
            </span>
            <span style={{ font: "700 1.75rem var(--font-titulo)" }}>{fmtCOP(totales.totalPagado)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
