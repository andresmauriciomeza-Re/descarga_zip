import { type OrdenCompra, type GestionCompra, type OrdenItem, calcTotal, type EstadoOrden, fmtCOP, totalLineaOrden } from "@/features/purchase-orders/utils/purchase-orders";
import { useState, useMemo } from "react";
import { formatearFechaHora } from "@/shared/utils/time";
import { type TonoPill, EstadoPill } from "@/shared/components/panel/StatusPill";
import { BotonRuta } from "@/shared/components/buttons/BreadcrumbButton";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { ArrowLeft } from "lucide-react";
import { SeccionFormulario } from "@/shared/components/panel/FormSection";
import { etiquetaModoIvaSimple } from "@/features/purchases/services/vat";
import { esEmpaque, etiquetaPresentacion } from "@/shared/utils/units";
import { DatosDetalle, Historial } from "@/shared/components/panel/DetailData";

export function OrdenDetallePageContenido({
  orden,
  gestiones,
  onBack,
  onVerFactura,
}: {
  orden: OrdenCompra;
  gestiones: GestionCompra[];
  onBack: () => void;
  onVerFactura?: (gestion: GestionCompra) => void;
}) {
  const facturas = gestiones.filter(g => g.ordenId === orden.id && (g.numeroFactura ?? "") !== "");
  // Sólo las compras NO anuladas dejan un insumo "Facturado": una factura
  // anulada devuelve sus insumos a pendientes (respaldo cuando la línea no
  // trae `facturado` del backend).
  const insumosFacturados = new Set(
    facturas.filter(g => g.estado !== "Anulado").flatMap(g => (g.items ?? []).map(i => i.idInsumo))
  );
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<string | null>(facturas[0]?.id ?? null);

  const facturaActual = facturas.find(f => f.id === facturaSeleccionada) ?? facturas[0];

  /**
   * Regla del módulo: un insumo es "solicitado" si su id está en el detalle de
   * la Orden de Compra; todo lo que no esté (llegó de más en la recepción) es
   * "no solicitado". El `esNoSolicitado` del guardado queda como respaldo para
   * datos viejos sin id comparable.
   */
  const idsOrden = useMemo(() => new Set(orden.items.map(i => i.idInsumo)), [orden.items]);
  const esSolicitado = (i: OrdenItem) =>
    idsOrden.has(i.idInsumo) || (i.esNoSolicitado === false && idsOrden.size === 0);

  const itemsFactura = facturaActual?.items ?? [];
  const solicitados = itemsFactura.filter(i => esSolicitado(i));
  const noSolicitados = itemsFactura.filter(i => !esSolicitado(i));
  const totalPagado = calcTotal(itemsFactura);

  /** Fecha y hora del último cambio de estado (sin prefijos). */
  const historial = orden.historialEstados ?? [];
  const ultimoCambio = historial[historial.length - 1];
  const fechaEstado = formatearFechaHora(
    ultimoCambio?.fechaHora ?? orden.recepcion?.fechaRecepcion ?? orden.fecha
  );

  /** Las tablas miden según sus filas; solo con muchas filas scrollean solas.
      En móvil (columnas apiladas) siempre pueden desplazar en horizontal. */
  const FILAS_SCROLL = 15;
  const claseTabla = (filas: number) =>
    `rounded-xl border border-border ${filas > FILAS_SCROLL ? "max-h-[55vh] overflow-auto" : "overflow-x-auto"}`;

  const tonoEstado: Record<EstadoOrden, TonoPill> = { Borrador: "gris", Enviado: "azul", Completado: "verde", Anulado: "rojo" };
  const numero = orden.id.replace(/^\D+-?0*/, "") || orden.id;

  /** Filas de una factura (solicitados / no solicitados): mismos valores de siempre. */
  const filasFactura = (items: OrdenItem[], noPedido: boolean) => (
    <div className="pn-permisos">
      {items.map(item => (
        <div key={item.rowId} className="pn-permisos__fila" style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,2fr) auto auto" }}>
          <strong>{item.nombre}</strong>
          <span>{item.cantidad} {item.unidad} · {fmtCOP(item.costoUnitario)}</span>
          {noPedido ? <EstadoPill tono="ambar">No se pidió</EstadoPill> : <span />}
          <strong>{fmtCOP(totalLineaOrden(item))}</strong>
        </div>
      ))}
    </div>
  );

  return (
    <div className="pn-contenido" style={{ maxWidth: "68.75rem" }}>
      <BotonRuta>
        <BotonAccion icono={ArrowLeft} onClick={onBack}>Volver a la lista</BotonAccion>
      </BotonRuta>

      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h1 style={{ font: "700 2.125rem/1.15 var(--font-titulo)", margin: 0 }}>Orden de compra #{numero}</h1>
        <EstadoPill tono={tonoEstado[orden.estado]}>{orden.estado}</EstadoPill>
      </div>
      <p className="pn-seccion__ayuda" style={{ marginBottom: "1.25rem" }}>
        {orden.proveedor} · {orden.fecha} · {orden.estado} el {fechaEstado}
      </p>
      {orden.estado === "Anulado" && orden.motivoAnulacion && (
        <div className="pn-dialogo__caja pn-dialogo__caja--ambar">
          <strong>Por qué se anuló:</strong>
          {orden.motivoAnulacion}
        </div>
      )}

      <div className="grid gap-5">
        <SeccionFormulario titulo="Qué se pidió">
          <div className="pn-permisos">
            {orden.items.map(item => {
              const facturado = item.facturado ?? insumosFacturados.has(item.idInsumo);
              return (
                <div key={item.rowId} className="pn-permisos__fila" style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,2fr) auto auto" }}>
                  <div>
                    <strong>{item.nombre}</strong>
                    <div style={{ fontSize: "1rem", color: "var(--gris-texto)" }}>{etiquetaModoIvaSimple(item.modoIva ?? "incluido")}</div>
                  </div>
                  <span>
                    {item.cantidad}
                    {esEmpaque(item.unidad)
                      ? ` · ${etiquetaPresentacion(item.unidad, item.factorPresentacion, item.unidadBase)}`
                      : ` ${item.unidad}`}
                    {" · "}{fmtCOP(item.precioUnitario)}
                  </span>
                  <EstadoPill tono={facturado ? "verde" : "ambar"}>{facturado ? "Completo" : "Falta"}</EstadoPill>
                  <strong>{fmtCOP(item.subtotal ?? item.cantidad * item.precioUnitario)}</strong>
                </div>
              );
            })}
          </div>
          <p style={{ font: "700 1.625rem var(--font-titulo)", margin: "1rem 0 0", textAlign: "right" }}>
            Total con IVA: {fmtCOP(orden.total ?? calcTotal(orden.items))}
          </p>
        </SeccionFormulario>

        <SeccionFormulario titulo="Facturas">
          {facturas.length === 0 ? (
            <p className="pn-seccion__ayuda">Todavía no hay facturas de esta orden.</p>
          ) : (
            <>
              <div className="pn-opciones" role="group" aria-label="Facturas de la orden" style={{ marginBottom: "1rem" }}>
                {facturas.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    className="pn-opcion"
                    aria-pressed={f.id === facturaSeleccionada}
                    onClick={() => setFacturaSeleccionada(f.id)}
                  >
                    Factura {f.numeroFactura}
                  </button>
                ))}
              </div>
              {facturaActual && (
                <div className="grid gap-4">
                  <DatosDetalle datos={[
                    { etiqueta: "Número de factura", valor: facturaActual.numeroFactura },
                    { etiqueta: "Fecha en que llegó", valor: facturaActual.fechaFactura },
                    { etiqueta: "Estado", valor: <EstadoPill tono={facturaActual.estado === "Recibido" ? "verde" : "rojo"}>{facturaActual.estado}</EstadoPill> },
                    { etiqueta: "Total", valor: fmtCOP(facturaActual.valorTotal) },
                  ]} />
                  <div>
                    <h3 className="pn-resumen__area">Lo que se pidió y llegó</h3>
                    {filasFactura(solicitados, false)}
                    <p style={{ textAlign: "right", fontWeight: 700, fontSize: "1.1875rem", margin: "0.5rem 0 0" }}>
                      Subtotal de lo pedido: {fmtCOP(calcTotal(solicitados))}
                    </p>
                  </div>
                  {noSolicitados.length > 0 && (
                    <div>
                      <h3 className="pn-resumen__area">Llegó algo que no se pidió</h3>
                      {filasFactura(noSolicitados, true)}
                      <p style={{ textAlign: "right", fontWeight: 700, fontSize: "1.1875rem", margin: "0.5rem 0 0" }}>
                        Subtotal de lo que no se pidió: {fmtCOP(calcTotal(noSolicitados))}
                      </p>
                    </div>
                  )}
                  <p style={{ font: "700 1.625rem var(--font-titulo)", margin: 0, textAlign: "right" }}>
                    Total pagado: {fmtCOP(totalPagado)}
                  </p>
                </div>
              )}
            </>
          )}
        </SeccionFormulario>

        {historial.length > 0 && (
          <SeccionFormulario titulo="Historial">
            <Historial
              pasos={historial.map(h => ({
                titulo: h.estado + (h.motivo ? ` · ${h.motivo}` : ""),
                hora: formatearFechaHora(h.fechaHora),
                hecho: true,
              }))}
            />
          </SeccionFormulario>
        )}
      </div>
    </div>
  );
}
