import { formatearFechaHora, formatearHora } from "@/shared/utils/time";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PackageCheck, X, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { EstadoSelect } from "@/shared/components/StatusSelect";
import { SearchInput } from "@/shared/components/SearchInput";
import { PaginadorGrande } from "@/shared/components/panel/LargePaginator";
import { TarjetaFila } from "@/shared/components/panel/RowCard";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { useFinishedProducts } from "@/features/products/hooks/useFinishedProducts";
import type { ProductoTerminado, EstadoEntrega } from "@/features/products/utils/products";

const SERIF = "var(--font-titulo)";

const ESTADO_COLOR: Record<EstadoEntrega, string> = {
  listo:      "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  entregado:  "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
};
const ESTADO_LABEL: Record<EstadoEntrega, string> = {
  listo:     "Listo",
  entregado: "Entregado",
};

interface PizzaStock {
  id: string;
  nombre: string;
  stockMediana: number;
  stockGrande: number;
}



export function ProductoTerminadoScreen({ pizzas = [] }: { pizzas?: PizzaStock[] }) {

  const { productos, setProductos, search, setSearch, page, setPage, PER_PAGE, filtered, paged, listos, entregados } = useFinishedProducts();
  // Estado del modal de entrega
  const [confirmItem,  setConfirmItem]  = useState<ProductoTerminado | null>(null);
  const [recalentado,  setRecalentado]  = useState(false);




  const openConfirm = (item: ProductoTerminado) => {
    setConfirmItem(item);
    setRecalentado(false);
  };

  const handleConfirmarEntrega = () => {
    if (!confirmItem) return;
    // Fecha local, no UTC: `toISOString()` en Colombia (UTC-5) después de las 19:00
  // contaba el día siguiente como entregado hoy.
  const hoy = new Date().toLocaleDateString("en-CA");
    setProductos(prev => prev.map(p =>
      p.id === confirmItem.id
        ? { ...p, estadoEntrega: "entregado", recalentado, fechaEntregaReal: hoy }
        : p
    ));
    setConfirmItem(null);
    toast.success(`Entrega confirmada — ${confirmItem.nombreReceta}${recalentado ? " · recalentada ✓" : ""}`);
  };

  return (
    <div className="px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
            Producto Terminado
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {productos.length} producto{productos.length === 1 ? "" : "s"} · {listos} listos para entrega · {entregados} entregados
          </p>
        </div>
      </div>

      {/* KPI chips */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm font-semibold text-blue-800">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          {listos} listos para entregar
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {entregados} entregados hoy
        </div>
      </div>

      <section className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">Stock de pizzas por tamaño</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Existencias en porciones; se actualizan desde producción y ventas.</p>
        </div>
        <div>
          <table className="pn-tabla-adapta w-full break-words">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["Pizza", "Mediana (porciones)", "Grande (porciones)"].map((heading) => (
                  <th key={heading} className="px-4 py-2.5 text-left font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pizzas.map((pizza) => (
                <tr key={pizza.id}>
                  <td className="px-4 py-2.5 text-sm font-medium text-foreground">{pizza.nombre}</td>
                  {[pizza.stockMediana, pizza.stockGrande].map((stock, index) => (
                    <td key={index} data-etiqueta={index === 0 ? "Mediana (porciones)" : "Grande (porciones)"} className={`px-4 py-2.5 text-sm font-semibold ${stock <= 0 ? "text-red-600 dark:text-red-400" : stock <= 10 ? "text-yellow-600 dark:text-yellow-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {stock} porc.{stock <= 0 ? " · Agotado" : stock <= 10 ? " · Stock bajo" : ""}
                    </td>
                  ))}
                </tr>
              ))}
              {pizzas.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-5 text-sm text-center text-muted-foreground">No hay pizzas en el catálogo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={v => { setSearch(v); setPage(1); }}
        placeholder="Buscar por ID u orden de producción..."
      />

      {/* Listado: la misma fila de los demás módulos */}
      {paged.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl px-4 py-14 text-center text-muted-foreground mb-4">
          <p className="text-4xl mb-3">📦</p>
          <p>No se encontraron productos</p>
        </div>
      ) : (
        <div className="pn-lista">
          {paged.map(p => (
            <TarjetaFila
              key={p.id}
              pre={`${p.id} · ${p.idReceta}`}
              nombre={p.nombreReceta}
              datos={[
                {
                  etiqueta: "Entrega",
                  valor: (
                    <span className="inline-flex flex-wrap items-center gap-1">
                      {formatearFechaHora(p.fechaEntrega)}
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {formatearHora(p.horaEntrega) || "—"}
                    </span>
                  ),
                },
                { etiqueta: "Porciones / tamaño", valor: `${p.cantidad} porc. · ${p.tamano}` },
                { etiqueta: "Recalentado", valor: p.estadoEntrega === "entregado" ? (p.recalentado ? "Sí" : "No") : "—" },
              ]}
              estado={
                /* La única transición es listo → entregado y pasa por el MISMO
                   modal de confirmación del botón; entregado es estado final. */
                <EstadoSelect
                  value={p.estadoEntrega}
                  onChange={next => {
                    if (next === p.estadoEntrega) return;
                    openConfirm(p);
                  }}
                  options={[
                    {
                      value: p.estadoEntrega,
                      label: ESTADO_LABEL[p.estadoEntrega],
                      color: ESTADO_COLOR[p.estadoEntrega],
                    },
                    ...(p.estadoEntrega === "listo"
                      ? [{
                          value: "entregado" as EstadoEntrega,
                          label: ESTADO_LABEL.entregado,
                          color: ESTADO_COLOR.entregado,
                        }]
                      : []),
                  ]}
                  disabled={p.estadoEntrega === "entregado"}
                />
              }
              acciones={p.estadoEntrega === "listo" ? (
                <BotonAccion variante="principal" icono={PackageCheck} onClick={() => openConfirm(p)}>
                  Marcar como Entregada
                </BotonAccion>
              ) : undefined}
            />
          ))}
        </div>
      )}

      <PaginadorGrande pagina={page} total={filtered.length} porPagina={PER_PAGE} onCambiar={setPage} />

      {/* ── Modal: Confirmar Entrega ── */}
      <AnimatePresence>
        {confirmItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <PackageCheck className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-base font-bold text-foreground" style={{ fontFamily: SERIF }}>
                    Confirmar Entrega
                  </h3>
                </div>
                <button onClick={() => setConfirmItem(null)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-5 space-y-4">
                {/* Texto de confirmación */}
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl border border-border">
                  <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">¿Confirmar entrega de este producto?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {confirmItem.nombreReceta} · {confirmItem.cantidad} porc. · {confirmItem.tamano} · {formatearHora(confirmItem.horaEntrega)}
                    </p>
                  </div>
                </div>

                {/* Checkbox recalentado */}
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={recalentado}
                    onChange={e => setRecalentado(e.target.checked)}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">¿Se recalentó antes de entregar?</p>
                    <p className="text-xs text-muted-foreground">Marcar si el producto fue recalentado previo a la entrega</p>
                  </div>
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${recalentado ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"}`}>
                    {recalentado ? "Sí" : "No"}
                  </span>
                </label>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-5 py-4 border-t border-border">
                <button
                  onClick={() => setConfirmItem(null)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarEntrega}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
                >
                  Confirmar Entrega
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
