import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Eye, Pencil, Trash2, X, ChevronLeft, ChevronRight, AlertCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const SERIF = "'DM Serif Display', serif";
const PER_PAGE = 5;

// Catálogo de productos (relación con Tb_Productos)
const CATALOGO_PRODUCTOS = [
  { id: "PROD-001", nombre: "Margarita Clásica"    },
  { id: "PROD-002", nombre: "Pepperoni Premium"    },
  { id: "PROD-003", nombre: "Cuatro Quesos"        },
  { id: "PROD-004", nombre: "Especial La Sirena"   },
  { id: "PROD-005", nombre: "Veggie Mediterránea"  },
  { id: "PROD-006", nombre: "Hawaiana Tropical"    },
];

// Catálogo de insumos (relación con Tb_Insumo)
const CATALOGO_INSUMOS_REC = [
  { id: "INS-001", nombre: "Queso Mozzarella"   },
  { id: "INS-002", nombre: "Salsa de Tomate"    },
  { id: "INS-003", nombre: "Pepperoni"           },
  { id: "INS-004", nombre: "Masa Pre-elaborada"  },
  { id: "INS-005", nombre: "Champiñones"         },
  { id: "INS-006", nombre: "Albahaca Fresca"     },
  { id: "INS-007", nombre: "Jamón Serrano"       },
  { id: "INS-008", nombre: "Piña en Trozos"      },
  { id: "INS-009", nombre: "Aceitunas Negras"    },
  { id: "INS-010", nombre: "Cebolla Morada"      },
  { id: "INS-011", nombre: "Pimentón"            },
];

// Representa una fila de Tb_Detalle_Recetas
interface DetalleInsumo { idInsumo: string; cantidadInsumo: number; }

// Representa Tb_Recetas — SIN nombreReceta, descripcion, idInsumo (ya corregido)
interface Receta {
  id: string;              // Id_receta
  idProducto: string;      // Id_producto (FK)
  tiempoPreparacion: number; // Tiempo_Preparacion
  porciones: number;         // Porciones
  insumos: DetalleInsumo[];  // filas de Tb_Detalle_Recetas asociadas
}

// IDs sincronizados con OrdenProduccionScreen (REC-001..REC-006)
const INITIAL_RECETAS: Receta[] = [
  { id:"REC-001", idProducto:"PROD-001", tiempoPreparacion:25, porciones:8,
    insumos:[{idInsumo:"INS-001",cantidadInsumo:200},{idInsumo:"INS-002",cantidadInsumo:100},{idInsumo:"INS-004",cantidadInsumo:1},{idInsumo:"INS-006",cantidadInsumo:10}] },
  { id:"REC-002", idProducto:"PROD-002", tiempoPreparacion:28, porciones:8,
    insumos:[{idInsumo:"INS-003",cantidadInsumo:150},{idInsumo:"INS-001",cantidadInsumo:250},{idInsumo:"INS-002",cantidadInsumo:100},{idInsumo:"INS-004",cantidadInsumo:1}] },
  { id:"REC-003", idProducto:"PROD-003", tiempoPreparacion:30, porciones:8,
    insumos:[{idInsumo:"INS-001",cantidadInsumo:150},{idInsumo:"INS-004",cantidadInsumo:1},{idInsumo:"INS-002",cantidadInsumo:80}] },
  { id:"REC-004", idProducto:"PROD-004", tiempoPreparacion:35, porciones:8,
    insumos:[{idInsumo:"INS-002",cantidadInsumo:120},{idInsumo:"INS-001",cantidadInsumo:200},{idInsumo:"INS-004",cantidadInsumo:1},{idInsumo:"INS-010",cantidadInsumo:50},{idInsumo:"INS-011",cantidadInsumo:30}] },
  { id:"REC-005", idProducto:"PROD-005", tiempoPreparacion:27, porciones:8,
    insumos:[{idInsumo:"INS-011",cantidadInsumo:60},{idInsumo:"INS-009",cantidadInsumo:40},{idInsumo:"INS-001",cantidadInsumo:180},{idInsumo:"INS-004",cantidadInsumo:1}] },
  { id:"REC-006", idProducto:"PROD-006", tiempoPreparacion:28, porciones:8,
    insumos:[{idInsumo:"INS-008",cantidadInsumo:100},{idInsumo:"INS-007",cantidadInsumo:80},{idInsumo:"INS-001",cantidadInsumo:200},{idInsumo:"INS-004",cantidadInsumo:1}] },
];

const emptyForm = (): Omit<Receta,"id"> => ({
  idProducto: "PROD-001", tiempoPreparacion: 20, porciones: 8,
  insumos: [{ idInsumo: "INS-001", cantidadInsumo: 0 }],
});

export function RecetasScreen() {
  const [recetas,    setRecetas]    = useState<Receta[]>(INITIAL_RECETAS);
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem,   setEditItem]   = useState<Receta | null>(null);
  const [detailItem, setDetailItem] = useState<Receta | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [form,       setForm]       = useState(emptyForm());

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const iCls = "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const prodNombre   = (id: string) => CATALOGO_PRODUCTOS.find(p => p.id === id)?.nombre ?? id;
  const insumoNombre = (id: string) => CATALOGO_INSUMOS_REC.find(i => i.id === id)?.nombre ?? id;

  const filtered = useMemo(() =>
    recetas.filter(r =>
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.idProducto.toLowerCase().includes(search.toLowerCase()) ||
      prodNombre(r.idProducto).toLowerCase().includes(search.toLowerCase())
    ), [recetas, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const validarForm = (v: Omit<Receta,"id">) => {
    if (!v.idProducto) { toast.error("Selecciona el producto"); return false; }
    if (v.insumos.length === 0) { toast.error("Agrega al menos un insumo"); return false; }
    const vacios = v.insumos.some(i => !i.idInsumo || i.cantidadInsumo <= 0);
    if (vacios) { toast.error("Cada insumo debe tener cantidad mayor a 0"); return false; }
    const ids = v.insumos.map(i => i.idInsumo);
    if (new Set(ids).size !== ids.length) { toast.error("No repitas el mismo insumo en la receta"); return false; }
    return true;
  };

  const handleCreate = () => {
    if (!validarForm(form)) return;
    const newId = `REC-${String(recetas.length + 1).padStart(3,"0")}`;
    setRecetas(p => [...p, { id: newId, ...form }]);
    setShowCreate(false); setForm(emptyForm());
    toast.success("Receta creada correctamente");
  };

  const handleEdit = () => {
    if (!editItem) return;
    if (!validarForm(editItem)) return;
    setRecetas(p => p.map(r => r.id === editItem.id ? editItem : r));
    setEditItem(null);
    toast.success("Receta actualizada");
  };

  const handleDelete = (id: string) => {
    setRecetas(p => p.filter(r => r.id !== id));
    setDeleteId(null);
    toast.success("Receta eliminada");
  };

  // Shared form fields — igual a Tb_Recetas + Tb_Detalle_Recetas
  const FormFields = ({ v, set }: {
    v: Omit<Receta,"id">;
    set: (f: Omit<Receta,"id">) => void;
  }) => {
    const updateInsumo = (idx: number, field: keyof DetalleInsumo, value: string | number) => {
      const nuevos = v.insumos.map((ins, i) => i === idx ? { ...ins, [field]: value } : ins);
      set({ ...v, insumos: nuevos });
    };
    const addInsumo = () => set({ ...v, insumos: [...v.insumos, { idInsumo: "INS-001", cantidadInsumo: 0 }] });
    const removeInsumo = (idx: number) => set({ ...v, insumos: v.insumos.filter((_, i) => i !== idx) });

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* ID Producto */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">ID Producto *</label>
            <select value={v.idProducto} onChange={e => set({ ...v, idProducto: e.target.value })}
              className={iCls + " cursor-pointer"}>
              {CATALOGO_PRODUCTOS.map(p => (
                <option key={p.id} value={p.id}>{p.id} — {p.nombre}</option>
              ))}
            </select>
          </div>
          {/* Tiempo preparación */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Tiempo Preparación (min) *</label>
            <input type="number" min={1} value={v.tiempoPreparacion}
              onChange={e => set({ ...v, tiempoPreparacion: Number(e.target.value) })}
              className={iCls} />
          </div>
          {/* Porciones */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Porciones *</label>
            <input type="number" min={1} value={v.porciones}
              onChange={e => set({ ...v, porciones: Number(e.target.value) })}
              className={iCls} />
          </div>
        </div>

        {/* Sección Insumos — representa Tb_Detalle_Recetas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-muted-foreground">Insumos de la receta *</label>
            <button type="button" onClick={addInsumo}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Agregar insumo
            </button>
          </div>
          <div className="space-y-2">
            {v.insumos.map((ins, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select value={ins.idInsumo} onChange={e => updateInsumo(idx, "idInsumo", e.target.value)}
                  className={iCls + " cursor-pointer flex-1"}>
                  {CATALOGO_INSUMOS_REC.map(i => (
                    <option key={i.id} value={i.id}>{i.id} — {i.nombre}</option>
                  ))}
                </select>
                <input type="number" min={0} step="0.01" value={ins.cantidadInsumo}
                  onChange={e => updateInsumo(idx, "cantidadInsumo", Number(e.target.value))}
                  placeholder="Cantidad" className={iCls + " w-28"} />
                <button type="button" onClick={() => removeInsumo(idx)}
                  disabled={v.insumos.length === 1}
                  className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const Modal = ({ title, onClose, onConfirm, label, children }: {
    title: string; onClose: () => void; onConfirm: () => void; label: string; children: React.ReactNode;
  }) => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
          exit={{ scale:.95, opacity:0 }} transition={{ duration:.15 }}
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Ficha Técnica</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{recetas.length} recetas registradas</p>
        </div>
        <button onClick={() => { setForm(emptyForm()); setShowCreate(true); }}
          className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md text-sm">
          <Plus className="w-4 h-4" /> Crear Receta
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por ID o producto..."
          className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["ID Receta","ID Producto","Tiempo Prep.","Porciones","Insumos","Acciones"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-14 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">📋</p><p>No se encontraron recetas</p>
                </td></tr>
              ) : paged.map(r => {
                const isExpanded = expandedId === r.id;
                return (
                  <React.Fragment key={r.id}>
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 text-sm font-mono font-semibold text-foreground">{r.id}</td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-mono font-semibold text-foreground">{r.idProducto}</p>
                        <p className="text-xs text-muted-foreground">{prodNombre(r.idProducto)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-center text-foreground">{r.tiempoPreparacion} min</td>
                      <td className="px-4 py-3.5 text-sm text-center text-foreground">{r.porciones}</td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : r.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer transition-colors"
                        >
                          {r.insumos.length} insumo{r.insumos.length !== 1 ? "s" : ""}
                          <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setDetailItem(r)} title="Ver detalle"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => setEditItem({ ...r })} title="Editar"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteId(r.id)} title="Eliminar"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-muted/30">
                        <td colSpan={6} className="px-6 py-3">
                          <div className="flex flex-wrap gap-2">
                            {r.insumos.map((i, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-xl text-xs">
                                <span className="font-mono font-semibold text-muted-foreground">{i.idInsumo}</span>
                                <span className="text-foreground font-medium">{insumoNombre(i.idInsumo)}</span>
                                <span className="text-muted-foreground">· {i.cantidadInsumo}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
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
          title: "Crear Receta",
          onClose: () => setShowCreate(false),
          onConfirm: handleCreate,
          label: "Crear Receta",
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
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
              exit={{ scale:.95, opacity:0 }} transition={{ duration:.15 }}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Detalle — {detailItem.id}</h3>
                <button onClick={() => setDetailItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="px-5 py-4 space-y-2">
                {[
                  { l:"ID Receta",          v: detailItem.id },
                  { l:"ID Producto",        v: `${detailItem.idProducto} — ${prodNombre(detailItem.idProducto)}` },
                  { l:"Tiempo Preparación", v: `${detailItem.tiempoPreparacion} minutos` },
                  { l:"Porciones",          v: `${detailItem.porciones} porciones` },
                ].map(({ l, v }) => (
                  <div key={l} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-4">
                    <span className="text-sm text-muted-foreground font-medium shrink-0">{l}</span>
                    <span className="text-sm font-semibold text-foreground text-right">{v}</span>
                  </div>
                ))}
                <div className="pt-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Insumos (Tb_Detalle_Recetas)</p>
                  <div className="space-y-1.5">
                    {detailItem.insumos.map((i, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-2 bg-muted rounded-xl text-sm">
                        <span className="text-foreground font-medium">{insumoNombre(i.idInsumo)}</span>
                        <span className="text-muted-foreground font-mono text-xs">{i.cantidadInsumo}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
              exit={{ scale:.95, opacity:0 }} transition={{ duration:.15 }}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Eliminar receta</h3>
              </div>
              <p className="text-muted-foreground mb-6">¿Seguro que deseas eliminar la receta <strong>{deleteId}</strong>? Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">Cancelar</button>
                <button onClick={() => handleDelete(deleteId)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 cursor-pointer active:scale-95">Eliminar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
