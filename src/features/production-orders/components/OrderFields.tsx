import { type OrdenForm, type OrdenProduccion, normalizar, lineasDeVenta, type LineaOrden, type InsumoRequerido, fmtMinutos, HORNEADO_MIN } from "@/features/production-orders/utils/production-orders";
import type { Venta } from "@/features/sales/utils/sales";
import type { Producto } from "@/features/products/utils/products";
import type { FichasPorProducto } from "@/shared/utils/technicalSheets";
import type { Insumo } from "@/features/supplies/utils/supplies";
import { useState } from "react";
import { Search, Clock } from "lucide-react";
import { formatearFechaHora } from "@/shared/utils/time";

// ─────────────────────────── Forma 2: Pedido de cliente ───────────────────────────
/** Buscador de ventas pagadas sin orden + vista en solo lectura del detalle.
    Las líneas NO se editan: salen del detalle de la venta. */
export function CamposPedido({
  form,
  set,
  ventas,
  ventasSinOrden,
  ordenes,
  productos,
  fichas,
  insumos,
}: {
  form: OrdenForm;
  set: (f: OrdenForm) => void;
  ventas: Venta[];
  ventasSinOrden: Venta[];
  ordenes: OrdenProduccion[];
  productos: Producto[];
  fichas: FichasPorProducto;
  insumos: Insumo[];
}) {
  const [q, setQ] = useState("");
  const venta = ventas.find((v) => v.id === form.ventaId);

  const lista = ventasSinOrden.filter((v) => {
    if (!q.trim()) return true;
    const t = normalizar(q);
    return normalizar(v.id).includes(t) || normalizar(v.usuario).includes(t) || normalizar(v.productos).includes(t);
  });

  const elegidas = venta ? lineasDeVenta(venta, productos, fichas, insumos) : { lineas: [] as LineaOrden[], insumos: [] as InsumoRequerido[] };

  // Se muestran también las ventas que YA tienen orden, para que se vea que
  // existen pero no se pueden volver a crear (una venta = una orden).
  const yaConOrden = ordenes.filter((o) => o.ventaId && o.ventaId !== form.ventaId).map((o) => o.ventaId as string);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
          Venta a preparar <span className="text-muted-foreground/60">(solo ventas pagadas, en preparación)</span>
        </label>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por número de venta, cliente o producto..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="max-h-48 overflow-y-auto rounded-xl border border-border divide-y divide-border">
          {lista.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              No hay ventas pagadas sin orden de producción.
            </p>
          ) : lista.map(v => (
            <button key={v.id} type="button"
              onClick={() => set({ ...form, ventaId: v.id })}
              className={`w-full text-left px-3 py-2.5 transition-colors cursor-pointer ${
                form.ventaId === v.id ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-muted/60"
              }`}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">Venta {v.id}</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">${(v.total ?? 0).toLocaleString("es-CO")}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {v.usuario} · {formatearFechaHora(v.fecha, v.horaRecogida)}
              </p>
            </button>
          ))}
        </div>
        {yaConOrden.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Las ventas {yaConOrden.map((v) => v).join(", ")} ya tienen orden de producción.
          </p>
        )}
      </div>

      {venta && (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-3 py-2 bg-muted/60 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Detalle de la venta (solo lectura)
            </div>
            {elegidas.lineas.map((l, i) => {
              return (
              <div key={i} className="flex items-start justify-between gap-3 px-3 py-2 border-t border-border">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{l.nombre}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {l.tamano ? `Tamaño ${l.tamano} · ` : ""}{l.cantidadEstimada} und
                    {l.porciones ? ` · ${l.porciones} porciones` : ""}
                  </p>
                </div>
              </div>
              );
            })}
            <div className="px-3 py-2 border-t border-border bg-muted/40 text-[11px] text-muted-foreground">
              Fecha y hora solicitadas: <strong className="text-foreground">{formatearFechaHora(venta.fecha, venta.horaRecogida)}</strong> (recogida del cliente)
            </div>
            {/* Tiempo fijo del pedido: NO sale del tiempoPreparacion de la
                ficha (eso es de "Preparación en lote"). */}
            <div className="px-3 py-2 border-t border-border bg-muted/40 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Calentamiento: <strong className="text-foreground">{fmtMinutos(HORNEADO_MIN)}</strong>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
