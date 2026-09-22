import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Eye, Pencil, Trash2, X, ChevronLeft, ChevronRight, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { CalendarDropdown } from "../components/CalendarDropdown";

const SERIF = "'DM Serif Display', serif";

type EstadoOrden = "pendiente" | "en-proceso" | "completada" | "cancelada";

const ESTADO_COLOR: Record<EstadoOrden, string> = {
  pendiente:    "bg-yellow-100 text-yellow-800",
  "en-proceso": "bg-blue-100 text-blue-800",
  completada:   "bg-emerald-100 text-emerald-800",
  cancelada:    "bg-red-100 text-red-700",
};

const ESTADO_LABEL: Record<EstadoOrden, string> = {
  pendiente:    "Pendiente",
  "en-proceso": "En Proceso",
  completada:   "Completada",
  cancelada:    "Cancelada",
};

// Catálogo de recetas (con tiempo de preparación en minutos)
const RECETAS = [
  { id: "REC-001", nombre: "Margarita Clásica",   tiempoPrep: 20 },
  { id: "REC-002", nombre: "Pepperoni Premium",   tiempoPrep: 25 },
  { id: "REC-003", nombre: "Cuatro Quesos",       tiempoPrep: 30 },
  { id: "REC-004", nombre: "Especial La Sirena",  tiempoPrep: 35 },
  { id: "REC-005", nombre: "Veggie Mediterránea", tiempoPrep: 20 },
  { id: "REC-006", nombre: "Hawaiana Tropical",   tiempoPrep: 25 },
];

interface OrdenProduccion {
  id: string;
  idReceta: string;
  fechaEntrega: string;   // "YYYY-MM-DD"
  horaEntrega: string;    // "HH:MM" — hora de entrega
  cantidadPro: number;
  estadoOrden: EstadoOrden;
  observacion: string;
}

const INITIAL_ORDENES: OrdenProduccion[] = [
  { id:"ORD-001", idReceta:"REC-001", fechaEntrega:"2024-01-15", horaEntrega:"19:00", cantidadPro:20, estadoOrden:"completada",  observacion:"Turno mañana sin novedades." },
  { id:"ORD-002", idReceta:"REC-002", fechaEntrega:"2024-01-15", horaEntrega:"20:30", cantidadPro:15, estadoOrden:"en-proceso",  observacion:"Pendiente revisión de calidad." },
  { id:"ORD-003", idReceta:"REC-003", fechaEntrega:"2024-01-16", horaEntrega:"18:00", cantidadPro:10, estadoOrden:"pendiente",   observacion:"" },
  { id:"ORD-004", idReceta:"REC-004", fechaEntrega:"2024-01-16", horaEntrega:"21:00", cantidadPro:0,  estadoOrden:"cancelada",   observacion:"Falta mozzarella." },
  { id:"ORD-005", idReceta:"REC-005", fechaEntrega:"2024-01-17", horaEntrega:"19:30", cantidadPro:8,  estadoOrden:"en-proceso",  observacion:"" },
];

const PER_PAGE = 5;

const emptyForm = (): Omit<OrdenProduccion, "id"> => ({
  idReceta: "REC-001", fechaEntrega: "", horaEntrega: "",
  cantidadPro: 0, estadoOrden: "pendiente", observacion: "",
});

// Calcula hora de inicio restando tiempo de preparación a la hora de entrega
function calcInicio(horaEntrega: string, tiempoPrep: number): string {
  if (!horaEntrega) return "—";
  const [hh, mm] = horaEntrega.split(":").map(Number);
  const totalMin = hh * 60 + mm - tiempoPrep;
  if (totalMin < 0) return "—";
  const ih = Math.floor(totalMin / 60);
  const im = totalMin % 60;
  return `${String(ih).padStart(2, "0")}:${String(im).padStart(2, "0")}`;
}

export function OrdenProduccionScreen({ canCreate = true, canEdit = true, canDelete = true }: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean } = {}) {
  const [ordenes,    setOrdenes]    = useState<OrdenProduccion[]>(INITIAL_ORDENES);
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem,   setEditItem]   = useState<OrdenProduccion | null>(null);
  const [detailItem, setDetailItem] = useState<OrdenProduccion | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [form,       setForm]       = useState(emptyForm());
  const [confirmEstado, setConfirmEstado] = useState<{
    id: string; current: EstadoOrden; next: EstadoOrden;
  } | null>(null);

  const iCls = "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const recetaNombre  = (id: string) => RECETAS.find(r => r.id === id)?.nombre ?? id;
  const recetaPrep    = (id: string) => RECETAS.find(r => r.id === id)?.tiempoPrep ?? 0;

  // Conteo de órdenes por hora de entrega (para el badge informativo)
  const horaCount = useMemo(() => {
    const map: Record<string, number> = {};
    ordenes.forEach(o => {
      if (o.horaEntrega) map[o.horaEntrega] = (map[o.horaEntrega] ?? 0) + 1;
    });
    return map;
  }, [ordenes]);

  const filtered = useMemo(() =>
    ordenes.filter(o =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      recetaNombre(o.idReceta).toLowerCase().includes(search.toLowerCase())
    ), [ordenes, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const handleCreate = () => {
    if (!form.fechaEntrega) { toast.error("La fecha de entrega es obligatoria"); return; }
    const newId = `ORD-${String(ordenes.length + 1).padStart(3, "0")}`;
    setOrdenes(p => [{ id: newId, ...form }, ...p]);
    setShowCreate(false); setForm(emptyForm());
    toast.success("Orden de producción creada");
  };

  const handleEdit = () => {
    if (!editItem) return;
    setOrdenes(p => p.map(o => o.id === editItem.id ? editItem : o));
    setEditItem(null);
    toast.success("Orden actualizada");
  };

  const handleDelete = (id: string) => {
    setOrdenes(p => p.filter(o => o.id !== id));
    setDeleteId(null);
    toast.success("Orden eliminada");
  };

  // Shared form fields
  const FormFields = ({ v, set }: {
    v: Omit<OrdenProduccion, "id">;
    set: (f: Omit<OrdenProduccion, "id">) => void;
  }) => {
    const prep      = recetaPrep(v.idReceta);
    const inicio    = calcInicio(v.horaEntrega, prep);
    const inicioOk  = inicio !== "—";

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* ID Receta */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">ID Receta *</label>
          <select value={v.idReceta} onChange={e => set({ ...v, idReceta: e.target.value })}
            className={iCls + " cursor-pointer"}>
            {RECETAS.map(r => (
              <option key={r.id} value={r.id}>{r.id} — {r.nombre} ({r.tiempoPrep} min)</option>
            ))}
          </select>
        </div>

        {/* Inicio de Producción — readonly, calculado */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Inicio de Producción</label>
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm ${inicioOk ? "bg-muted/60 border-border text-foreground" : "bg-muted/30 border-border text-muted-foreground"}`}>
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className={inicioOk ? "font-semibold" : "italic opacity-60"}>
              {inicioOk ? `Inicio: ${inicio}` : "Selecciona hora de entrega para calcular"}
            </span>
            {inicioOk && (
              <span className="ml-auto text-xs text-muted-foreground">
                ({prep} min antes de {v.horaEntrega})
              </span>
            )}
          </div>
        </div>

        {/* Fecha y Hora de Entrega */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha y Hora de Entrega *</label>
          <CalendarDropdown value={v.fechaEntrega} onChange={f => set({ ...v, fechaEntrega: f })} />
        </div>
        <div className="flex flex-col justify-end">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Hora (HH:MM)</label>
          <input
            type="time"
            value={v.horaEntrega}
            onChange={e => set({ ...v, horaEntrega: e.target.value })}
            className={iCls}
          />
        </div>

        {/* Cantidad producida */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad Producida</label>
          <input type="number" min={0} value={v.cantidadPro}
            onChange={e => set({ ...v, cantidadPro: Number(e.target.value) })}
            className={iCls} />
        </div>
        {/* Estado */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado Orden</label>
          <select value={v.estadoOrden} onChange={e => set({ ...v, estadoOrden: e.target.value as EstadoOrden })}
            className={iCls + " cursor-pointer"}>
            {(Object.keys(ESTADO_LABEL) as EstadoOrden[]).map(s => (
              <option key={s} value={s}>{ESTADO_LABEL[s]}</option>
            ))}
          </select>
        </div>
        {/* Observación */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Observación</label>
          <textarea value={v.observacion} onChange={e => set({ ...v, observacion: e.target.value })}
            rows={3} placeholder="Notas adicionales sobre esta orden..."
            className={iCls + " resize-none"} />
        </div>
      </div>
    );
  };

  // Modal wrapper
  const Modal = ({ title, onClose, onConfirm, label, children }: {
    title: string; onClose: () => void; onConfirm: () => void; label: string; children: React.ReactNode;
  }) => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
          className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border my-4">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="px-5 py-4">{children}</div>
          <div className="flex gap-3 px-5 py-4 border-t border-border">
            <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">Cancelar</button>
            <button onClick={onConfirm} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">{label}</button>
          </div>
        </motion.div>
      </div>
    </div>
  );

  // Confirm delete modal
  const ConfirmDelete = ({ id, onCancel }: { id: string; onCancel: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
        className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Eliminar orden</h3>
        </div>
        <p className="text-muted-foreground mb-6">¿Seguro que deseas eliminar la orden <strong>{id}</strong>? Esta acción no se puede deshacer.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">Cancelar</button>
          <button onClick={() => handleDelete(id)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 cursor-pointer active:scale-95">Eliminar</button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Orden Producción</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{ordenes.length} órdenes registradas</p>
        </div>
        {canCreate && (
          <button onClick={() => { setForm(emptyForm()); setShowCreate(true); }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md text-sm">
            <Plus className="w-4 h-4" /> Crear Orden de Producción
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por ID orden o receta..."
          className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["ID Orden","ID Receta","Fecha Orden","Hora Entrega","Cant. Producida","Estado Orden","Acciones"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-14 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">👨‍🍳</p><p>No se encontraron órdenes</p>
                </td></tr>
              ) : paged.map(o => (
                <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5 text-sm font-mono font-semibold text-foreground">{o.id}</td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs font-mono font-semibold text-foreground">{o.idReceta}</p>
                    <p className="text-xs text-muted-foreground">{recetaNombre(o.idReceta)}</p>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{o.fechaEntrega}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        {o.horaEntrega || <span className="text-muted-foreground font-normal italic text-xs">—</span>}
                      </span>
                      {o.horaEntrega && (horaCount[o.horaEntrega] ?? 0) >= 2 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 whitespace-nowrap">
                          {horaCount[o.horaEntrega]} órdenes a esta hora
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm font-bold text-center text-foreground">{o.cantidadPro}</td>
                  <td className="px-4 py-3.5">
                    <select value={o.estadoOrden}
                      onChange={e => {
                        const next = e.target.value as EstadoOrden;
                        if (next === o.estadoOrden) return;
                        e.target.value = o.estadoOrden;
                        setConfirmEstado({ id: o.id, current: o.estadoOrden, next });
                      }}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${ESTADO_COLOR[o.estadoOrden]}`}>
                      {(Object.keys(ESTADO_LABEL) as EstadoOrden[]).map(s => (
                        <option key={s} value={s}>{ESTADO_LABEL[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setDetailItem(o)} title="Ver detalle"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer"><Eye className="w-4 h-4" /></button>
                      {canEdit && <button onClick={() => setEditItem({ ...o })} title="Editar"
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"><Pencil className="w-4 h-4" /></button>}
                      {canDelete && <button onClick={() => setDeleteId(o.id)} title="Eliminar"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-center">
          {totalPages > 1 && (
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
          )}
        </div>
      )}

      {/* Modal: Crear */}
      <AnimatePresence>
        {showCreate && Modal({
          title: "Crear Orden de Producción",
          onClose: () => setShowCreate(false),
          onConfirm: handleCreate,
          label: "Crear Orden",
          children: FormFields({ v: form, set: setForm })
        })}
      </AnimatePresence>

      {/* Modal: Editar */}
      <AnimatePresence>
        {editItem && Modal({
          title: `Editar — ${editItem.id}`,
          onClose: () => setEditItem(null),
          onConfirm: handleEdit,
          label: "Guardar",
          children: FormFields({ v: editItem, set: v => setEditItem({ ...editItem, ...v }) })
        })}
      </AnimatePresence>

      {/* Modal: Ver detalle */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Detalle — {detailItem.id}</h3>
                <button onClick={() => setDetailItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="px-5 py-4 space-y-2">
                {[
                  { l: "ID Orden",            v: detailItem.id },
                  { l: "ID Receta",           v: `${detailItem.idReceta} — ${recetaNombre(detailItem.idReceta)}` },
                  { l: "Fecha Entrega",        v: detailItem.fechaEntrega },
                  { l: "Hora Entrega",         v: detailItem.horaEntrega || "—" },
                  { l: "Inicio de Producción", v: calcInicio(detailItem.horaEntrega, recetaPrep(detailItem.idReceta)) },
                  { l: "Cantidad Producida",   v: `${detailItem.cantidadPro} und.` },
                  { l: "Estado Orden",         v: ESTADO_LABEL[detailItem.estadoOrden] },
                ].map(({ l, v }) => (
                  <div key={l} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-4">
                    <span className="text-sm text-muted-foreground font-medium shrink-0">{l}</span>
                    <span className="text-sm font-semibold text-foreground text-right">{v}</span>
                  </div>
                ))}
                {detailItem.observacion && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Observación</p>
                    <p className="text-sm text-foreground bg-muted rounded-xl px-3 py-2">{detailItem.observacion}</p>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-border">
                <button onClick={() => setDetailItem(null)} className="w-full py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">Cerrar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm delete */}
      <AnimatePresence>
        {deleteId && ConfirmDelete({ id: deleteId, onCancel: () => setDeleteId(null) })}
      </AnimatePresence>

      {/* Confirm estado change */}
      <AnimatePresence>
        {confirmEstado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
              className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>¿Desea cambiar el estado de la compra?</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                La orden <strong className="text-foreground">{confirmEstado.id}</strong> pasará de:
              </p>
              <div className="flex items-center gap-3 mb-5 px-3 py-3 rounded-xl bg-muted/50 border border-border">
                <span className={`font-semibold px-2.5 py-1 rounded-full text-xs ${ESTADO_COLOR[confirmEstado.current]}`}>{ESTADO_LABEL[confirmEstado.current]}</span>
                <span className="text-muted-foreground text-sm">→</span>
                <span className={`font-semibold px-2.5 py-1 rounded-full text-xs ${ESTADO_COLOR[confirmEstado.next]}`}>{ESTADO_LABEL[confirmEstado.next]}</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmEstado(null)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                  Cancelar
                </button>
                <button onClick={() => {
                  setOrdenes(p => p.map(x => x.id === confirmEstado.id ? { ...x, estadoOrden: confirmEstado.next } : x));
                  toast.success(`Estado cambiado a: ${ESTADO_LABEL[confirmEstado.next]}`);
                  setConfirmEstado(null);
                }}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
