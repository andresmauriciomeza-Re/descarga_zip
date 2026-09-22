import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Eye, Pencil, Trash2, X, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const SERIF = "'DM Serif Display', serif";

function ConfirmModal({
  title, message, onConfirm, onCancel,
}: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }} transition={{ duration: 0.18 }}
        className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: SERIF }}>{title}</h3>
        </div>
        <p className="text-muted-foreground mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors active:scale-95 cursor-pointer">Sí, confirmar</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────── SUPPLIERS ───────────────────────────

type SupplierStatus = "activo" | "inactivo";

interface Supplier {
  id: string;
  nit: string;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  asesorComercial: string;
  estado: SupplierStatus;
}

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: "PROV-001", nit: "900.123.456-1",
    nombre: "Distribuidora La Cosecha",
    telefono: "604 321 0001", email: "cosecha@proveedores.co",
    direccion: "Cra 50 #30-10, Medellín",
    asesorComercial: "Carlos Mejía",
    estado: "activo",
  },
  {
    id: "PROV-002", nit: "800.654.321-2",
    nombre: "Quesos del Norte S.A.S.",
    telefono: "604 321 0002", email: "quesos@norte.co",
    direccion: "Cll 80 #45-20, Bello",
    asesorComercial: "Ana Restrepo",
    estado: "activo",
  },
  {
    id: "PROV-003", nit: "700.111.222-3",
    nombre: "Carnes Premium Ltda.",
    telefono: "604 321 0003", email: "ventas@carnespremium.co",
    direccion: "Av. 33 #76-60, Medellín",
    asesorComercial: "Jorge Ríos",
    estado: "inactivo",
  },
  {
    id: "PROV-004", nit: "901.777.888-4",
    nombre: "Bebidas y Más",
    telefono: "604 321 0004", email: "pedidos@bebidasmas.co",
    direccion: "Cra 65 #12-40, Itagüí",
    asesorComercial: "Luisa Palacio",
    estado: "activo",
  },
];

const INITIAL_PURCHASES_REF = [
  { id: "COM-001", idProveedor: "PROV-001" },
  { id: "COM-002", idProveedor: "PROV-003" },
  { id: "COM-003", idProveedor: "PROV-002" },
  { id: "COM-004", idProveedor: "PROV-001" },
  { id: "COM-005", idProveedor: "PROV-004" },
];

const SUPPLIER_STATUS_COLOR: Record<SupplierStatus, string> = {
  activo:   "bg-emerald-100 text-emerald-800",
  inactivo: "bg-red-100 text-red-700",
};

const emptySupplier = (): Omit<Supplier, "id"> => ({
  nit: "",
  nombre: "",
  telefono: "",
  email: "",
  direccion: "",
  asesorComercial: "",
  estado: "activo",
});

function Modal({
  title, onClose, onConfirm, confirmLabel = "Guardar", children,
}: {
  title: string; onClose: () => void; onConfirm: () => void; confirmLabel?: string; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.16 }}
          className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="px-5 py-4 space-y-4">{children}</div>
          <div className="flex gap-3 px-5 py-4 border-t border-border">
            <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">Cancelar</button>
            <button onClick={onConfirm} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">{confirmLabel}</button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function SuppliersScreen({ canCreate = true, canEdit = true, canDelete = true }: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean } = {}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [search,    setSearch]    = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editItem,   setEditItem]   = useState<Supplier | null>(null);
  const [detailItem, setDetailItem] = useState<Supplier | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [confirmToggleId, setConfirmToggleId] = useState<string | null>(null);
  const [form, setForm] = useState(emptySupplier());

  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const filtered = useMemo(
    () => suppliers.filter(s =>
      s.nit.toLowerCase().includes(search.toLowerCase()) ||
      s.nombre.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.asesorComercial.toLowerCase().includes(search.toLowerCase())
    ),
    [suppliers, search],
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const inputCls = "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const disabledCls = "w-full px-3 py-2.5 bg-muted/40 rounded-xl border border-border text-sm text-muted-foreground cursor-not-allowed select-none";

  const handleCreate = () => {
    if (!form.nit || !form.nombre || !form.telefono || !form.email) {
      toast.error("NIT, nombre, teléfono y email son obligatorios");
      return;
    }
    const newId = `PROV-${String(suppliers.length + 1).padStart(3, "0")}`;
    setSuppliers(p => [{ id: newId, ...form }, ...p]);
    setShowCreate(false);
    setForm(emptySupplier());
    toast.success("Proveedor creado exitosamente");
  };

  const handleEdit = () => {
    if (!editItem) return;
    setSuppliers(p => p.map(s => s.id === editItem.id ? editItem : s));
    setEditItem(null);
    toast.success("Proveedor editado exitosamente");
  };

  const handleDelete = (id: string) => {
    if (INITIAL_PURCHASES_REF.some(c => c.idProveedor === id)) {
      toast.error("No se puede eliminar: el proveedor tiene compras asignadas");
      setDeleteId(null);
      return;
    }
    setSuppliers(p => p.filter(s => s.id !== id));
    setDeleteId(null);
    toast.success("Proveedor eliminado");
  };

  const applyToggleEstado = (id: string) => {
    setSuppliers(p => p.map(x =>
      x.id === id ? { ...x, estado: x.estado === "activo" ? "inactivo" : "activo" } : x
    ));
    const nuevoEstado = suppliers.find(s => s.id === id)?.estado === "activo" ? "Inactivo" : "Activo";
    toast.success(`Estado cambiado a ${nuevoEstado}`);
    setConfirmToggleId(null);
  };

  // Campos para CREAR — layout 2 columnas con secciones
  const CreateFields = () => (
    <div className="space-y-6">
      {/* Sección: Identificación */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
          Identificación del proveedor
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">NIT *</label>
            <input value={form.nit} onChange={e => setForm(p => ({ ...p, nit: e.target.value }))}
              placeholder="900.123.456-1" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Distribuidora La Cosecha" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Sección: Contacto */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
          Contacto
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Asesor Comercial</label>
            <input value={form.asesorComercial} onChange={e => setForm(p => ({ ...p, asesorComercial: e.target.value }))}
              placeholder="Carlos Mejía" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Teléfono *</label>
            <input type="tel" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
              placeholder="604 321 0001" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="ventas@proveedor.co" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Dirección</label>
            <input value={form.direccion} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))}
              placeholder="Cra 50 #30-10, Medellín" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Sección: Configuración */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
          Configuración
        </p>
        <div className="w-1/2 pr-1.5">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
          <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value as SupplierStatus }))}
            className={inputCls + " cursor-pointer"}>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
      </div>
    </div>
  );

  // Campos para EDITAR — mismo layout 2 columnas, NIT y Nombre bloqueados
  const EditFields = () => editItem ? (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
          Identificación del proveedor
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">NIT</label>
            <div className={disabledCls}>{editItem.nit}</div>
            <p className="text-[10px] text-muted-foreground mt-1">No se puede modificar</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre</label>
            <div className={disabledCls}>{editItem.nombre}</div>
            <p className="text-[10px] text-muted-foreground mt-1">No se puede modificar</p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
          Contacto
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Asesor Comercial</label>
            <input value={editItem.asesorComercial} onChange={e => setEditItem(x => x && { ...x, asesorComercial: e.target.value })}
              placeholder="Carlos Mejía" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Teléfono</label>
            <input type="tel" value={editItem.telefono} onChange={e => setEditItem(x => x && { ...x, telefono: e.target.value })}
              className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Email</label>
            <input type="email" value={editItem.email} onChange={e => setEditItem(x => x && { ...x, email: e.target.value })}
              className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Dirección</label>
            <input value={editItem.direccion} onChange={e => setEditItem(x => x && { ...x, direccion: e.target.value })}
              className={inputCls} />
          </div>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
          Configuración
        </p>
        <div className="w-1/2 pr-1.5">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
          <select value={editItem.estado} onChange={e => setEditItem(x => x && { ...x, estado: e.target.value as SupplierStatus })}
            className={inputCls + " cursor-pointer"}>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Gestión Proveedor</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{suppliers.length} proveedores registrados</p>
        </div>
        {canCreate && (
          <button onClick={() => { setForm(emptySupplier()); setShowCreate(true); }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md text-sm">
            <Plus className="w-4 h-4" /> Crear Proveedor
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por NIT, nombre, asesor o email..."
          className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["NIT", "Nombre", "Teléfono", "Email", "Asesor Comercial", "Estado", "Acciones"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-muted-foreground">
                    <p className="text-4xl mb-3">🚛</p>
                    <p>No se encontraron proveedores</p>
                  </td>
                </tr>
              ) : paged.map(s => (
                <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5 text-sm font-mono font-semibold text-foreground">{s.nit}</td>
                  <td className="px-4 py-3.5 text-sm font-medium text-foreground">{s.nombre}</td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{s.telefono}</td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{s.asesorComercial || "—"}</td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => setConfirmToggleId(s.id)}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all active:scale-95 hover:opacity-80 ${SUPPLIER_STATUS_COLOR[s.estado]}`}>
                      {s.estado === "activo" ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setDetailItem(s)} title="Ver detalle"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer">
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <button onClick={() => setEditItem({ ...s })} title="Editar"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setDeleteId(s.id)} title="Eliminar"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center mt-4">
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* ── Modal: Crear Proveedor (centrado, 2 columnas) ── */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.16 }}
                className="bg-card rounded-2xl w-full max-w-xl shadow-2xl border border-border my-4"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Crear Proveedor</h3>
                  <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="px-6 py-5">
                  {CreateFields()}
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-border">
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">Cancelar</button>
                  <button onClick={handleCreate} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">Crear</button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Editar (nombre y NIT bloqueados) ── */}
      <AnimatePresence>
        {editItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.16 }}
                className="bg-card rounded-2xl w-full max-w-xl shadow-2xl border border-border my-4"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Editar — {editItem.id}</h3>
                  <button onClick={() => setEditItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="px-6 py-5">
                  {EditFields()}
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-border">
                  <button onClick={() => setEditItem(null)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">Cancelar</button>
                  <button onClick={handleEdit} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">Guardar</button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Ver detalle ── */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.16 }}
                className="bg-card rounded-2xl w-full max-w-xl shadow-2xl border border-border my-4">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Detalle — {detailItem.id}</h3>
                  <button onClick={() => setDetailItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="px-6 py-5 space-y-6">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
                      Identificación del proveedor
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">NIT</p>
                        <div className={disabledCls}>{detailItem.nit}</div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Nombre</p>
                        <div className={disabledCls}>{detailItem.nombre}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
                      Contacto
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Asesor Comercial</p>
                        <div className={disabledCls}>{detailItem.asesorComercial || "—"}</div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Teléfono</p>
                        <div className={disabledCls}>{detailItem.telefono}</div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Email</p>
                        <div className={disabledCls}>{detailItem.email}</div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Dirección</p>
                        <div className={disabledCls}>{detailItem.direccion || "—"}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
                      Configuración
                    </p>
                    <div className="w-1/2 pr-1.5">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Estado</p>
                      <div className={disabledCls}>{detailItem.estado === "activo" ? "Activo" : "Inactivo"}</div>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-border">
                  <button onClick={() => setDetailItem(null)}
                    className="w-full py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirmar cambio de estado ── */}
      <AnimatePresence>
        {confirmToggleId && (() => {
          const sup = suppliers.find(s => s.id === confirmToggleId);
          if (!sup) return null;
          const nuevoEstado = sup.estado === "activo" ? "Inactivo" : "Activo";
          return (
            <ConfirmModal
              title="Cambiar estado"
              message={`¿Deseas cambiar el estado del proveedor "${sup.nombre}" a "${nuevoEstado}"?`}
              onConfirm={() => applyToggleEstado(confirmToggleId)}
              onCancel={() => setConfirmToggleId(null)}
            />
          );
        })()}
      </AnimatePresence>

      {/* ── Confirmar eliminación ── */}
      <AnimatePresence>
        {deleteId && (
          <ConfirmModal
            title="Eliminar proveedor"
            message={`¿Seguro que deseas eliminar al proveedor ${deleteId}? Esta acción no se puede deshacer.`}
            onConfirm={() => handleDelete(deleteId)}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
