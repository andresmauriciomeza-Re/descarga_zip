import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Eye, Pencil, ChevronLeft, ChevronRight, FileText, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { EstadoSwitch } from "../components/EstadoSwitch";

const SERIF = "'DM Serif Display', serif";
const MONO  = "'JetBrains Mono', monospace";

const AVATAR_COLORS = [
  "bg-red-500","bg-blue-500","bg-emerald-500",
  "bg-purple-500","bg-amber-500","bg-pink-500","bg-indigo-500","bg-teal-500",
];

export interface Cliente {
  id: string;
  nombre: string;
  iniciales: string;
  avatarColor: string;
  correo: string;
  pedidos: number;
  activo: boolean;
}

export const INITIAL_CLIENTES: Cliente[] = [
  { id:"CLI-001", nombre:"María González",    iniciales:"MG", avatarColor:"bg-red-500",     correo:"maria.gonzalez@gmail.com",   pedidos:12, activo:true  },
  { id:"CLI-002", nombre:"Carlos Martínez",   iniciales:"CM", avatarColor:"bg-blue-500",    correo:"carlos.m@hotmail.com",        pedidos:7,  activo:true  },
  { id:"CLI-003", nombre:"Ana Rodríguez",     iniciales:"AR", avatarColor:"bg-emerald-500", correo:"ana.rodriguez@outlook.com",   pedidos:3,  activo:true  },
  { id:"CLI-004", nombre:"Jorge Vargas",      iniciales:"JV", avatarColor:"bg-purple-500",  correo:"jorge.vargas@gmail.com",      pedidos:0,  activo:false },
  { id:"CLI-005", nombre:"Patricia Soto",     iniciales:"PS", avatarColor:"bg-amber-500",   correo:"patricia.soto@yahoo.com",     pedidos:5,  activo:true  },
  { id:"CLI-006", nombre:"Luis Herrera",      iniciales:"LH", avatarColor:"bg-pink-500",    correo:"lherrera@gmail.com",          pedidos:9,  activo:true  },
  { id:"CLI-007", nombre:"Sandra Ríos",       iniciales:"SR", avatarColor:"bg-indigo-500",  correo:"sandrios@gmail.com",          pedidos:2,  activo:false },
  { id:"CLI-008", nombre:"Tomás Jiménez",     iniciales:"TJ", avatarColor:"bg-teal-500",    correo:"tomas.j@gmail.com",           pedidos:4,  activo:true  },
  { id:"CLI-009", nombre:"Valentina Mora",    iniciales:"VM", avatarColor:"bg-red-500",     correo:"valmora@hotmail.com",         pedidos:1,  activo:true  },
  { id:"CLI-010", nombre:"Andrés Castillo",   iniciales:"AC", avatarColor:"bg-blue-500",    correo:"andres.castillo@gmail.com",   pedidos:6,  activo:true  },
];

const PER_PAGE = 5;

export function GestionClientesScreen({ canCreate: _canCreate = true, canEdit = true, canDelete: _canDelete = true, clientes, setClientes, empleados, usuarios }: {
  canCreate?: boolean; canEdit?: boolean; canDelete?: boolean;
  clientes: Cliente[];
  setClientes: React.Dispatch<React.SetStateAction<Cliente[]>>;
  empleados: { correo: string }[];
  usuarios: { correo: string }[];
}) {
  const [search,       setSearch]     = useState("");
  const [filterEstado, setFiltro]     = useState("todos");
  const [sortBy,       setSortBy]     = useState("nombre");
  const [page,         setPage]       = useState(1);
  const [detailItem,   setDetailItem] = useState<Cliente | null>(null);
  const [editItem,     setEditItem]   = useState<Cliente | null>(null);
  const [showCreate,   setShowCreate] = useState(false);
  const [newNombre,    setNewNombre]  = useState("");
  const [newCorreo,    setNewCorreo]  = useState("");
  const [newTelefono,  setNewTelefono]= useState("");
  const [newActivo,    setNewActivo]  = useState(true);
  const [createErrors, setCreateErrors] = useState<{ nombre?: string; correo?: string }>({});
  const [editErrors,   setEditErrors] = useState<{ nombre?: string; correo?: string }>({});
  const [editPrevCorreo, setEditPrevCorreo] = useState<string | null>(null);

  const total   = clientes.length;
  const activos = clientes.filter(c => c.activo).length;
  const inact   = clientes.filter(c => !c.activo).length;

  const filtered = useMemo(() => {
    let r = clientes.filter(c => {
      const q = search.toLowerCase();
      const matchQ = !q || c.nombre.toLowerCase().includes(q) || c.correo.toLowerCase().includes(q);
      const matchE = filterEstado === "todos" || (filterEstado === "activo" ? c.activo : !c.activo);
      return matchQ && matchE;
    });
    if (sortBy === "estado") r = [...r].sort((a,b) => Number(b.activo) - Number(a.activo));
    else                     r = [...r].sort((a,b) => a.nombre.localeCompare(b.nombre));
    return r;
  }, [clientes, search, filterEstado, sortBy]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged      = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const toggleEstado = (id: string) => {
    setClientes(p => p.map(c => c.id === id ? { ...c, activo: !c.activo } : c));
    toast.success("Estado del cliente actualizado");
  };

  const handleEdit = () => {
    if (!editItem) return;
    const errs: { nombre?: string; correo?: string } = {};
    if (!editItem.nombre.trim()) errs.nombre = "El nombre es obligatorio";
    if (!editItem.correo.trim()) errs.correo = "El correo es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editItem.correo.trim())) errs.correo = "Formato de correo no válido";
    else {
      const em = editItem.correo.trim().toLowerCase();
      const otro = (correo: string) => correo.trim().toLowerCase() !== (editPrevCorreo ?? "").trim().toLowerCase();
      const duplicado =
        clientes.some(c => c.id !== editItem.id && otro(c.correo) && c.correo.trim().toLowerCase() === em) ||
        empleados.some(e => otro(e.correo) && e.correo.trim().toLowerCase() === em) ||
        usuarios.some(u => otro(u.correo) && u.correo.trim().toLowerCase() === em);
      if (duplicado) errs.correo = "Este correo ya está registrado";
    }
    if (Object.keys(errs).length) { setEditErrors(errs); return; }
    const nuevasIniciales = editItem.nombre.trim().split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
    setClientes(p => p.map(c => c.id === editItem.id ? { ...editItem, iniciales: nuevasIniciales } : c));
    setEditItem(null);
    setEditPrevCorreo(null);
    setEditErrors({});
    toast.success("Cliente actualizado correctamente");
  };

  const resetCreate = () => {
    setNewNombre(""); setNewCorreo(""); setNewTelefono("");
    setNewActivo(true); setCreateErrors({});
  };

  const handleCreate = () => {
    const errs: { nombre?: string; correo?: string } = {};
    if (!newNombre.trim()) errs.nombre = "El nombre es obligatorio";
    if (!newCorreo.trim()) {
      errs.correo = "El correo es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCorreo.trim())) {
      errs.correo = "Formato de correo no válido";
    } else {
      const em = newCorreo.trim().toLowerCase();
      const duplicado =
        clientes.some(c => c.correo.trim().toLowerCase() === em) ||
        empleados.some(e => e.correo.trim().toLowerCase() === em) ||
        usuarios.some(u => u.correo.trim().toLowerCase() === em);
      if (duplicado) errs.correo = "Este correo ya está registrado";
    }
    if (Object.keys(errs).length) { setCreateErrors(errs); return; }

    const maxNum = clientes.reduce((max, c) => {
      const n = parseInt(c.id.replace("CLI-", "")) || 0;
      return Math.max(max, n);
    }, 0);
    const newId = `CLI-${String(maxNum + 1).padStart(3, "0")}`;
    const iniciales = newNombre.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    const avatarColor = AVATAR_COLORS[(clientes.length) % AVATAR_COLORS.length];

    setClientes(prev => [
      { id: newId, nombre: newNombre.trim(), iniciales, avatarColor, correo: newCorreo.trim(), pedidos: 0, activo: newActivo },
      ...prev,
    ]);
    setShowCreate(false);
    resetCreate();
    toast.success(`Cliente ${newNombre.trim()} creado correctamente`);
  };

  const iCls = "px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer";

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Clientes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Usuarios registrados con tipo cliente en La Sirena</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => toast.info("Generando reporte de clientes...")}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" /> Generar reporte
          </button>
          {_canCreate && (
            <button
              onClick={() => { resetCreate(); setShowCreate(true); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <UserPlus className="w-4 h-4" /> Crear cliente
            </button>
          )}
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total clientes", value: total,   cls: "text-foreground",       bg: "bg-card"       },
          { label: "Activos",        value: activos, cls: "text-emerald-600",       bg: "bg-emerald-50" },
          { label: "Inactivos",      value: inact,   cls: "text-muted-foreground", bg: "bg-muted"      },
        ].map(({ label, value, cls, bg }) => (
          <div key={label} className={`${bg} border border-border rounded-2xl p-4`}>
            <p className={`text-3xl font-bold ${cls}`}>{value}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre, correo o estado..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={filterEstado} onChange={e => { setFiltro(e.target.value); setPage(1); }} className={iCls}>
          <option value="todos">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={iCls}>
          <option value="nombre">Ordenar por nombre</option>
          <option value="estado">Ordenar por estado</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["Cliente","Correo","Pedidos","Estado","Acciones"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-14 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">👥</p><p>No se encontraron clientes</p>
                </td></tr>
              ) : paged.map(c => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${c.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {c.iniciales}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{c.nombre}</p>
                        <p className="text-xs text-muted-foreground font-mono">{c.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{c.correo}</td>
                  <td className="px-4 py-3.5 text-sm font-bold text-center text-foreground" style={{ fontFamily: MONO }}>{c.pedidos}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.activo ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
                      {c.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setDetailItem(c)} title="Ver detalle"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer">
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <button onClick={() => { setEditItem({ ...c }); setEditPrevCorreo(c.correo); setEditErrors({}); }} title="Editar"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      <EstadoSwitch activo={c.activo} onToggle={() => toggleEstado(c.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-center">
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i+1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal: Ver detalle */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
              exit={{ scale:.95, opacity:0 }} transition={{ duration:.15 }}
              className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Detalle Cliente</h3>
                <button onClick={() => setDetailItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center gap-4 pb-4 mb-4 border-b border-border">
                  <div className={`w-14 h-14 rounded-full ${detailItem.avatarColor} flex items-center justify-center text-white text-lg font-bold`}>
                    {detailItem.iniciales}
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-base">{detailItem.nombre}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{detailItem.id}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { l: "Correo",          v: detailItem.correo },
                    { l: "Pedidos totales", v: String(detailItem.pedidos) },
                    { l: "Estado",          v: detailItem.activo ? "Activo" : "Inactivo" },
                  ].map(({ l, v }) => (
                    <div key={l} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-4">
                      <span className="text-sm text-muted-foreground font-medium shrink-0">{l}</span>
                      <span className="text-sm font-semibold text-foreground text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-5 py-4 border-t border-border">
                <button onClick={() => setDetailItem(null)}
                  className="w-full py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Crear cliente */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
                exit={{ scale:.95, opacity:0 }} transition={{ duration:.15 }}
                className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Crear Cliente</h3>
                  <button onClick={() => { setShowCreate(false); resetCreate(); }}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Nombre completo <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      value={newNombre}
                      onChange={e => { setNewNombre(e.target.value); if (createErrors.nombre) setCreateErrors(p => ({ ...p, nombre: undefined })); }}
                      placeholder="Ej: Laura Martínez"
                      autoFocus
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${createErrors.nombre ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    />
                    {createErrors.nombre && <p className="text-xs text-red-500 mt-1">{createErrors.nombre}</p>}
                  </div>

                  {/* Correo */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Correo electrónico <span className="text-primary">*</span>
                    </label>
                    <input
                      type="email"
                      value={newCorreo}
                      onChange={e => { setNewCorreo(e.target.value); if (createErrors.correo) setCreateErrors(p => ({ ...p, correo: undefined })); }}
                      placeholder="correo@ejemplo.com"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${createErrors.correo ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    />
                    {createErrors.correo && <p className="text-xs text-red-500 mt-1">{createErrors.correo}</p>}
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Teléfono <span className="text-muted-foreground font-normal">(opcional)</span>
                    </label>
                    <input
                      type="tel"
                      value={newTelefono}
                      onChange={e => setNewTelefono(e.target.value)}
                      placeholder="3001234567"
                      className="w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  {/* Estado */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                    <select
                      value={newActivo ? "activo" : "inactivo"}
                      onChange={e => setNewActivo(e.target.value === "activo")}
                      className="w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 px-5 py-4 border-t border-border">
                  <button onClick={() => { setShowCreate(false); resetCreate(); }}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleCreate}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                    Crear cliente
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Editar cliente */}
      <AnimatePresence>
        {editItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
              exit={{ scale:.95, opacity:0 }} transition={{ duration:.15 }}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Editar Cliente</h3>
                <button onClick={() => setEditItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div className="flex items-center gap-3 pb-2">
                  <div className={`w-12 h-12 rounded-full ${editItem.avatarColor} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {editItem.nombre.trim().split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{editItem.nombre}</p>
                    <p className="text-xs font-mono text-muted-foreground">{editItem.id}</p>
                  </div>
                </div>
                {[
                  { label: "Nombre completo", field: "nombre" as const, type: "text"  },
                  { label: "Correo",          field: "correo" as const, type: "email" },
                ].map(({ label, field, type }) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
                    <input type={type} value={editItem[field]}
                      onChange={e => { setEditItem(x => x && ({ ...x, [field]: e.target.value })); if (editErrors[field]) setEditErrors(p => ({ ...p, [field]: undefined })); }}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${editErrors[field] ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`} />
                    {editErrors[field] && <p className="text-xs text-red-500 mt-1">{editErrors[field]}</p>}
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Pedidos</label>
                  <input type="number" value={editItem.pedidos}
                    onChange={e => setEditItem(x => x && ({ ...x, pedidos: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                  <select value={editItem.activo ? "activo" : "inactivo"}
                    onChange={e => setEditItem(x => x && ({ ...x, activo: e.target.value === "activo" }))}
                    className="w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 px-5 py-4 border-t border-border">
                <button onClick={() => setEditItem(null)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                  Cancelar
                </button>
                <button onClick={handleEdit}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                  Guardar cambios
                </button>
              </div>
            </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
