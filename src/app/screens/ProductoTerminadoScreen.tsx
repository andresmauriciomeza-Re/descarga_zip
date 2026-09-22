import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, PackageCheck, ChevronLeft, ChevronRight, X, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const SERIF = "'DM Serif Display', serif";

type EstadoEntrega = "listo" | "entregado";

const ESTADO_COLOR: Record<EstadoEntrega, string> = {
  listo:      "bg-blue-100 text-blue-800",
  entregado:  "bg-emerald-100 text-emerald-800",
};
const ESTADO_LABEL: Record<EstadoEntrega, string> = {
  listo:     "Listo",
  entregado: "Entregado",
};

interface ProductoTerminado {
  id: string;
  idReceta: string;
  nombreReceta: string;
  fechaEntrega: string;
  horaEntrega: string;
  cantidad: number;
  estadoEntrega: EstadoEntrega;
  recalentado?: boolean;
  fechaEntregaReal?: string;
}

const INITIAL_PRODUCTOS: ProductoTerminado[] = [
  { id:"ORD-001", idReceta:"REC-001", nombreReceta:"Margarita Clásica",   fechaEntrega:"2024-01-15", horaEntrega:"19:00", cantidad:20, estadoEntrega:"entregado", recalentado:true,  fechaEntregaReal:"2024-01-15" },
  { id:"ORD-002", idReceta:"REC-002", nombreReceta:"Pepperoni Premium",   fechaEntrega:"2024-01-15", horaEntrega:"20:30", cantidad:15, estadoEntrega:"listo" },
  { id:"ORD-003", idReceta:"REC-003", nombreReceta:"Cuatro Quesos",       fechaEntrega:"2024-01-16", horaEntrega:"18:00", cantidad:10, estadoEntrega:"listo" },
  { id:"ORD-005", idReceta:"REC-005", nombreReceta:"Veggie Mediterránea", fechaEntrega:"2024-01-17", horaEntrega:"19:30", cantidad:8,  estadoEntrega:"listo" },
];

const PER_PAGE = 5;

export function ProductoTerminadoScreen() {
  const [productos, setProductos] = useState<ProductoTerminado[]>(INITIAL_PRODUCTOS);
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(1);

  // Estado del modal de entrega
  const [confirmItem,  setConfirmItem]  = useState<ProductoTerminado | null>(null);
  const [recalentado,  setRecalentado]  = useState(false);

  const filtered = useMemo(() =>
    productos.filter(p =>
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.nombreReceta.toLowerCase().includes(search.toLowerCase())
    ), [productos, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const listos    = productos.filter(p => p.estadoEntrega === "listo").length;
  const entregados = productos.filter(p => p.estadoEntrega === "entregado").length;

  const openConfirm = (item: ProductoTerminado) => {
    setConfirmItem(item);
    setRecalentado(false);
  };

  const handleConfirmarEntrega = () => {
    if (!confirmItem) return;
    const hoy = new Date().toISOString().slice(0, 10);
    setProductos(prev => prev.map(p =>
      p.id === confirmItem.id
        ? { ...p, estadoEntrega: "entregado", recalentado, fechaEntregaReal: hoy }
        : p
    ));
    setConfirmItem(null);
    toast.success(`Entrega confirmada — ${confirmItem.nombreReceta}${recalentado ? " · recalentada ✓" : ""}`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
            Producto Terminado
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {productos.length} productos · {listos} listos para entrega · {entregados} entregados
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

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por ID u orden de producción..."
          className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["ID Orden","Receta","Fecha Entrega","Hora Entrega","Cantidad","Estado","Recalentado","Acciones"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-14 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">📦</p>
                  <p>No se encontraron productos</p>
                </td></tr>
              ) : paged.map(p => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5 text-sm font-mono font-semibold text-foreground">{p.id}</td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs font-mono font-semibold text-muted-foreground">{p.idReceta}</p>
                    <p className="text-sm font-medium text-foreground">{p.nombreReceta}</p>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{p.fechaEntrega}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {p.horaEntrega || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm font-bold text-center text-foreground">{p.cantidad}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_COLOR[p.estadoEntrega]}`}>
                      {ESTADO_LABEL[p.estadoEntrega]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {p.estadoEntrega === "entregado" ? (
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${p.recalentado ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"}`}>
                        {p.recalentado ? "Sí" : "No"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {p.estadoEntrega === "listo" ? (
                      <button
                        onClick={() => openConfirm(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm whitespace-nowrap"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        Marcar como Entregada
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Entregado
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filtered.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center mt-4">
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: totalPages }, (_, i) => i+1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n===page?"bg-primary text-white":"hover:bg-muted text-muted-foreground"}`}>{n}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

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
                      {confirmItem.nombreReceta} · {confirmItem.cantidad} und. · {confirmItem.horaEntrega}
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
