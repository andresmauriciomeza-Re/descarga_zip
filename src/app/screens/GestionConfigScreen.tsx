import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, Pencil, Trash2, X, AlertCircle, Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";

const SERIF = "'DM Serif Display', serif";

// ── Árbol de módulos / sub-opciones del sistema ──────────────────────
export const MENU_TREE = [
  { modulo: "Compras",    subs: ["Insumos", "Proveedores", "Orden de Compra", "Compra"] },
  { modulo: "Producción", subs: ["Categoría de Producto", "Productos", "Orden de Producción", "Producto No Conforme"] },
  { modulo: "Ventas",     subs: ["Clientes", "Ventas", "Devoluciones"] },
];

export const ACCIONES = ["Ver", "Crear", "Editar", "Eliminar"] as const;
export type Accion = typeof ACCIONES[number];

// AccesosMap: "Módulo::SubOpcion" → Accion[]
export type AccesosMap = Record<string, Accion[]>;

export const KEY = (modulo: string, sub: string) => `${modulo}::${sub}`;

export const fullAccesos = (): AccesosMap => {
  const m: AccesosMap = {};
  MENU_TREE.forEach(({ modulo, subs }) =>
    subs.forEach(sub => { m[KEY(modulo, sub)] = [...ACCIONES]; })
  );
  return m;
};

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  accesos: AccesosMap;
  activo: boolean;
}

export const INITIAL_ROLES: Rol[] = [
  {
    id: "ROL-001", nombre: "Administrador", descripcion: "Acceso total al sistema.", activo: true,
    accesos: fullAccesos(),
  },
  {
    id: "ROL-002", nombre: "Cliente", descripcion: "Acceso al portal de pedidos en línea.", activo: true,
    accesos: { [KEY("Ventas","Ventas")]: ["Ver","Crear"] },
  },
  {
    id: "ROL-003", nombre: "Usuario", descripcion: "Acceso básico al sistema.", activo: true,
    accesos: { [KEY("Ventas","Clientes")]: ["Ver"] },
  },
];

export const countAccesos = (accesos: AccesosMap) =>
  Object.values(accesos).filter(v => v.length > 0).length;

export function nextRolId(roles: Rol[]) {
  const nums = roles.map(r => parseInt(r.id.replace("ROL-",""),10)).filter(n => !isNaN(n));
  return `ROL-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3,"0")}`;
}

export const accionColors: Record<Accion, string> = {
  Ver:      "bg-blue-100 text-blue-700 border-blue-200",
  Crear:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  Editar:   "bg-amber-100 text-amber-700 border-amber-200",
  Eliminar: "bg-red-100 text-red-700 border-red-200",
};

// ── Confirm modal ─────────────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
        className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <h3 className="font-bold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer">Eliminar</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── RolModal — árbol izquierdo + CRUD derecho ─────────────────────────
function RolModal({ title, initialNombre, initialDesc, initialActivo, initialAccesos, onClose, onSave, roles, rolId }: {
  title: string;
  initialNombre: string; initialDesc: string; initialActivo: boolean; initialAccesos: AccesosMap;
  onClose: () => void;
  onSave: (nombre: string, desc: string, activo: boolean, accesos: AccesosMap) => void;
  roles: Rol[];
  rolId?: string;
}) {
  const [nombre,     setNombre]     = useState(initialNombre);
  const [desc,       setDesc]       = useState(initialDesc);
  const [activo,     setActivo]     = useState(initialActivo);
  const [accesos,    setAccesos]    = useState<AccesosMap>({ ...initialAccesos });
  const [openModulo, setOpenModulo] = useState<string | null>(null);
  const [errors,     setErrors]     = useState<{ nombre?: string; modulos?: string }>({});

  const toggleOpen = (m: string) => setOpenModulo(prev => prev === m ? null : m);

  const iCls = "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  const isSubOn = (m: string, s: string) => {
    const k = KEY(m, s);
    return k in accesos && accesos[k].length > 0;
  };
  const isAllMod = (m: string, subs: string[]) => subs.every(s => isSubOn(m, s));
  const isSomeMod = (m: string, subs: string[]) => subs.some(s => isSubOn(m, s));

  const toggleModule = (m: string, subs: string[]) => {
    const allOn = isAllMod(m, subs);
    setErrors(p => ({ ...p, modulos: undefined }));
    setAccesos(prev => {
      const next = { ...prev };
      subs.forEach(s => {
        const k = KEY(m, s);
        if (allOn) delete next[k];
        else next[k] = ["Ver"];
      });
      return next;
    });
  };

  const toggleSub = (m: string, s: string) => {
    const k = KEY(m, s);
    setErrors(p => ({ ...p, modulos: undefined }));
    setAccesos(prev => {
      const next = { ...prev };
      if (k in next && next[k].length > 0) delete next[k];
      else next[k] = ["Ver"];
      return next;
    });
  };

  const toggleAccion = (m: string, s: string, accion: Accion) => {
    const k = KEY(m, s);
    setErrors(p => ({ ...p, modulos: undefined }));
    setAccesos(prev => {
      const cur = prev[k] ?? [];
      return { ...prev, [k]: cur.includes(accion) ? cur.filter(a => a !== accion) : [...cur, accion] };
    });
  };

  const selectedSubs = MENU_TREE.flatMap(({ modulo, subs }) =>
    subs.filter(sub => isSubOn(modulo, sub)).map(sub => ({ modulo, sub }))
  );

  const handleSave = () => {
    const errs: { nombre?: string; modulos?: string } = {};
    if (!nombre.trim()) errs.nombre = "El nombre del rol es obligatorio";
    else if (roles.some(r =>
      r.nombre.trim().toLowerCase() === nombre.trim().toLowerCase() && r.id !== rolId
    )) errs.nombre = "Ya existe un rol con este nombre";
    if (selectedSubs.length === 0) errs.modulos = "Selecciona al menos un módulo o sub-opción";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(nombre.trim(), desc.trim(), activo, accesos);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
        className="bg-card rounded-2xl w-full max-w-5xl shadow-2xl border border-border flex flex-col"
        style={{ maxHeight: "calc(100vh - 2rem)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
          <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        {/* Two-column body — fills remaining height */}
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border flex-1 min-h-0">

          {/* ── LEFT 50%: split into top (info) + bottom (modules) ── */}
          <div className="md:w-1/2 flex flex-col divide-y divide-border shrink-0">

            {/* TOP: Información del rol */}
            <div className="px-5 py-3 space-y-2.5 shrink-0">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Información del rol</p>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre *</label>
                <input value={nombre}
                  onChange={e => { setNombre(e.target.value); if (errors.nombre) setErrors(p => ({ ...p, nombre: undefined })); }}
                  placeholder="Ej: Cajero"
                  className={`${iCls} ${errors.nombre ? "!border-red-400 !bg-red-50/30" : ""}`} />
                {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Descripción</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
                  placeholder="Responsabilidades del rol..." className={iCls + " resize-none"} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                <select value={activo ? "activo" : "inactivo"} onChange={e => setActivo(e.target.value === "activo")}
                  className={iCls + " cursor-pointer"}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            {/* BOTTOM: Árbol de módulos (sin scroll) */}
            <div className="flex flex-col flex-1 px-5 py-3 overflow-hidden">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 shrink-0">
                Módulos y sub-opciones
                <span className="ml-2 text-primary font-semibold normal-case">{selectedSubs.length} seleccionadas</span>
              </p>
              {errors.modulos && <p className="text-xs text-red-500 mb-2">{errors.modulos}</p>}
              <div className="space-y-2">
                {MENU_TREE.map(({ modulo, subs }) => {
                  const isOpen = openModulo === modulo;
                  return (
                    <div key={modulo} className="border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2.5 px-3 py-2 bg-muted/50 hover:bg-muted transition-colors">
                        <input
                          type="checkbox"
                          checked={isAllMod(modulo, subs)}
                          ref={el => { if (el) el.indeterminate = isSomeMod(modulo, subs) && !isAllMod(modulo, subs); }}
                          onChange={() => toggleModule(modulo, subs)}
                          className="accent-primary w-4 h-4 cursor-pointer shrink-0"
                        />
                        <button
                          onClick={() => toggleOpen(modulo)}
                          className="flex items-center gap-2 flex-1 text-left cursor-pointer"
                        >
                          <span className="text-sm font-bold text-foreground flex-1">{modulo}</span>
                          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                        </button>
                      </div>
                      {isOpen && (
                        <div className="divide-y divide-border">
                          {subs.map(sub => (
                            <label key={sub} className="flex items-center gap-2.5 px-5 py-1.5 cursor-pointer hover:bg-muted/30 transition-colors">
                              <input
                                type="checkbox"
                                checked={isSubOn(modulo, sub)}
                                onChange={() => toggleSub(modulo, sub)}
                                className="accent-primary w-3.5 h-3.5 cursor-pointer"
                              />
                              <span className={`text-sm ${isSubOn(modulo, sub) ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                                {sub}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT 50%: Permisos CRUD (scrollable) ── */}
          <div className="md:w-1/2 flex flex-col min-h-0 px-5 py-4 overflow-y-auto">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 shrink-0">
              Asignar permisos al rol
            </p>

            {selectedSubs.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center flex-1">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <span className="text-2xl">🔒</span>
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Sin módulos seleccionados</p>
                <p className="text-xs text-muted-foreground max-w-44">
                  Selecciona módulos y sub-opciones a la izquierda para configurar sus permisos
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {MENU_TREE.map(({ modulo, subs }) => {
                  const activeSubs = subs.filter(sub => isSubOn(modulo, sub));
                  if (!activeSubs.length) return null;
                  return (
                    <div key={modulo}>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{modulo}</p>
                      <div className="space-y-2">
                        {activeSubs.map(sub => {
                          const k = KEY(modulo, sub);
                          const selAcc = accesos[k] ?? [];
                          const allSel = ACCIONES.every(a => selAcc.includes(a));
                          return (
                            <div key={sub} className="border border-border rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border">
                                <span className="text-sm font-semibold text-foreground">{sub}</span>
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={allSel}
                                  onClick={() => setAccesos(prev => ({ ...prev, [k]: allSel ? ["Ver"] : [...ACCIONES] }))}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border transition-all cursor-pointer active:scale-95 ${
                                    allSel
                                      ? "bg-red-100 text-red-700 border-red-200"
                                      : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                                  }`}
                                >
                                  <Check className={`w-4 h-4 ${allSel ? "" : "opacity-0"}`} />
                                  Todos
                                </button>
                              </div>
                              <div className="flex gap-1.5 flex-wrap px-3 py-2.5">
                                {ACCIONES.map(accion => {
                                  const on = selAcc.includes(accion);
                                  return (
                                    <button key={accion} onClick={() => toggleAccion(modulo, sub, accion)}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
                                        on ? accionColors[accion] : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                                      }`}
                                    >
                                      {on && <Check className="w-3 h-3" />}{accion}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-3 border-t border-border shrink-0">
          <button onClick={onClose} className="px-5 py-2 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">Guardar rol</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────
export function GestionConfigScreen({
  userRole,
  roles,
  setRoles,
  rolUserCounts,
}: {
  userRole: string;
  roles: Rol[];
  setRoles: React.Dispatch<React.SetStateAction<Rol[]>>;
  rolUserCounts: Record<string, number>;
}) {
  const [page,       setPage]      = useState(1);
  const PER_PAGE = 5;
  const [showCreate, setShowCreate]= useState(false);
  const [editItem,   setEditItem]  = useState<Rol | null>(null);
  const [detailItem, setDetailItem]= useState<Rol | null>(null);
  const [deleteId,   setDeleteId]  = useState<string | null>(null);

  const filtered = useMemo(() => roles, [roles]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const handleCreate = (nombre: string, desc: string, activo: boolean, accesos: AccesosMap) => {
    const newRol: Rol = { id: nextRolId(roles), nombre, descripcion: desc, activo, accesos };
    setRoles(p => [...p, newRol]);
    setShowCreate(false);
    toast.success(`Rol ${newRol.id} creado`);
  };

  const saveRol = (id: string | null, nombre: string, desc: string, activo: boolean, accesos: AccesosMap) => {
    if (id) {
      setRoles(p => p.map(r => r.id === id ? { ...r, nombre, descripcion: desc, activo, accesos } : r));
      setEditItem(null);
      toast.success("Rol actualizado");
    }
  };

  const handleDelete = (id: string) => {
    setRoles(p => p.filter(r => r.id !== id));
    setDeleteId(null);
    toast.success("Rol eliminado");
  };

  if (userRole !== "Administrador") {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: SERIF }}>Acceso restringido</h2>
        <p className="text-muted-foreground">Solo el Administrador puede acceder a Gestión Configuración.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Gestión Configuración</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{roles.length} roles registrados</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md">
          <Plus className="w-4 h-4" /> Crear Rol
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>{["ID Rol","Nombre","Descripción","Estado","Acciones"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-14 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">🔐</p><p>No se encontraron roles</p>
                </td></tr>
              ) : paged.map(r => (
                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5 text-sm font-mono font-semibold text-foreground">{r.id}</td>
                  <td className="px-4 py-3.5 text-sm font-medium text-foreground">{r.nombre}</td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground max-w-[160px] truncate">{r.descripcion || "—"}</td>
                  <td className="px-4 py-3.5">
                    <select value={r.activo ? "activo" : "inactivo"}
                      onChange={e => { setRoles(p => p.map(x => x.id === r.id ? { ...x, activo: e.target.value === "activo" } : x)); toast.success("Estado actualizado"); }}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${r.activo ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setDetailItem(r)} title="Ver detalle" className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => setEditItem(r)} title="Editar" className="p-1.5 rounded-lg hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors cursor-pointer"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteId(r.id)} title="Eliminar" className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-center mt-4">
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"><ChevronLeft className="w-4 h-4"/></button>
              {Array.from({length:totalPages},(_,i)=>i+1).map(n=>(
                <button key={n} onClick={()=>setPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n===page?"bg-primary text-white":"hover:bg-muted text-muted-foreground"}`}>{n}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"><ChevronRight className="w-4 h-4"/></button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <RolModal key="create" title="Crear Rol"
            initialNombre="" initialDesc="" initialActivo={true} initialAccesos={{}}
            roles={roles}
            onClose={() => setShowCreate(false)}
            onSave={handleCreate}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editItem && (
          <RolModal key={editItem.id} title={`Editar Rol — ${editItem.id}`}
            initialNombre={editItem.nombre} initialDesc={editItem.descripcion}
            initialActivo={editItem.activo} initialAccesos={{ ...editItem.accesos }}
            roles={roles} rolId={editItem.id}
            onClose={() => setEditItem(null)}
            onSave={(n,d,a,acc) => saveRol(editItem.id,n,d,a,acc)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
            <motion.div initial={{ scale:.95,opacity:0 }} animate={{ scale:1,opacity:1 }}
              exit={{ scale:.95,opacity:0 }} transition={{ duration:.15 }}
              className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border my-4">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Detalle — {detailItem.id}</h3>
                <button onClick={() => setDetailItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="px-5 py-4 space-y-2">
                {[
                  { l: "ID Rol",      v: detailItem.id },
                  { l: "Nombre",      v: detailItem.nombre },
                  { l: "Descripción", v: detailItem.descripcion || "—" },
                  { l: "Estado",      v: detailItem.activo ? "Activo" : "Inactivo" },
                  { l: "Usuarios",    v: `${rolUserCounts[detailItem.id] ?? 0} asignados` },
                ].map(({ l, v }) => (
                  <div key={l} className="flex items-center justify-between py-1.5 border-b border-border last:border-0 gap-4">
                    <span className="text-sm text-muted-foreground font-medium shrink-0">{l}</span>
                    <span className="text-sm font-semibold text-foreground text-right">{v}</span>
                  </div>
                ))}
              </div>
              {/* Accesos configurados con badges */}
              <div className="px-5 pb-4 space-y-3 max-h-60 overflow-y-auto">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground pt-1 pb-2 border-b border-border sticky top-0 bg-card">
                  Accesos configurados
                  <span className="ml-2 text-primary normal-case font-semibold">{countAccesos(detailItem.accesos)} sub-opciones</span>
                </p>
                {countAccesos(detailItem.accesos) === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Sin accesos configurados</p>
                ) : MENU_TREE.map(({ modulo, subs }) => {
                  const activeSubs = subs.filter(s => {
                    const k = KEY(modulo,s);
                    return k in detailItem.accesos && detailItem.accesos[k].length > 0;
                  });
                  if (!activeSubs.length) return null;
                  return (
                    <div key={modulo}>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{modulo}</p>
                      <div className="space-y-1.5">
                        {activeSubs.map(sub => {
                          const k = KEY(modulo,sub);
                          const perms = detailItem.accesos[k] ?? [];
                          return (
                            <div key={sub} className="flex items-center justify-between gap-3 px-3 py-2 bg-muted/30 rounded-xl">
                              <span className="text-sm font-medium text-foreground">{sub}</span>
                              <div className="flex gap-1 flex-wrap justify-end">
                                {ACCIONES.filter(a => perms.includes(a)).map(a => (
                                  <span key={a} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${accionColors[a]}`}>{a}</span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-4 border-t border-border flex gap-3">
                <button onClick={() => { setDetailItem(null); setEditItem(detailItem); }}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                  Editar rol
                </button>
                <button onClick={() => setDetailItem(null)}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors">
                  Cerrar
                </button>
              </div>
            </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (() => {
          const count = rolUserCounts[deleteId] ?? 0;
          const message = count > 0
            ? `Este rol tiene ${count} usuario${count > 1 ? "s" : ""} asignado${count > 1 ? "s" : ""}. ¿Deseas eliminarlo de todas formas? Los usuarios mantendrán el ID de rol pero perderán su referencia.`
            : `¿Seguro que deseas eliminar el rol ${deleteId}? Se eliminan también sus accesos configurados.`;
          return (
            <ConfirmModal
              title="Eliminar rol"
              message={message}
              onConfirm={() => handleDelete(deleteId)}
              onCancel={() => setDeleteId(null)}
            />
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
