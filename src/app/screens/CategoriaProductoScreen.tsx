import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

const SERIF = "'DM Serif Display', serif";

// ─────────────────────────── LOCAL CONFIRM MODAL ───────────────────────────

function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <h3
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            {title}
          </h3>
        </div>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors active:scale-95 cursor-pointer"
          >
            Sí, confirmar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────── CATEGORÍA PRODUCTO ───────────────────────────

interface CategoriaProducto {
  id: string;
  nombre: string;
}

const INITIAL_CATEGORIAS: CategoriaProducto[] = [
  { id: "CAT-001", nombre: "Pizzas" },
  { id: "CAT-002", nombre: "Lasañas" },
  { id: "CAT-003", nombre: "Bebidas" },
];

function SmModal({
  title,
  onClose,
  onConfirm,
  confirmLabel,
  children,
}: {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.16 }}
        className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3
            className="text-lg font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="flex gap-3 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function CategoriaProductoScreen({ canCreate = true, canEdit = true, canDelete = true }: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean } = {}) {
  const [categorias, setCategorias] = useState<
    CategoriaProducto[]
  >(INITIAL_CATEGORIAS);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] =
    useState<CategoriaProducto | null>(null);
  const [detailItem, setDetailItem] =
    useState<CategoriaProducto | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formNombre, setFormNombre] = useState("");

  const inputCls =
    "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const filtered = useMemo(
    () =>
      categorias.filter(
        (c) =>
          c.id.toLowerCase().includes(search.toLowerCase()) ||
          c.nombre.toLowerCase().includes(search.toLowerCase()),
      ),
    [categorias, search],
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE,
  );

  const handleCreate = () => {
    if (!formNombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const newId = `CAT-${String(categorias.length + 1).padStart(3, "0")}`;
    setCategorias((p) => [
      ...p,
      { id: newId, nombre: formNombre.trim() },
    ]);
    setShowCreate(false);
    setFormNombre("");
    toast.success("Categoría creada correctamente");
  };

  const handleEdit = () => {
    if (!editItem || !editItem.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setCategorias((p) =>
      p.map((x) => (x.id === editItem.id ? editItem : x)),
    );
    setEditItem(null);
    toast.success("Categoría actualizada");
  };

  const handleDelete = (id: string) => {
    setCategorias((p) => p.filter((x) => x.id !== id));
    setDeleteId(null);
    toast.success("Categoría eliminada");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            Categoría Producto
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {categorias.length} categorías registradas
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => {
              setFormNombre("Pizzas");
              setShowCreate(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md text-sm"
          >
            <Plus className="w-4 h-4" /> Crear Categoría
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por ID o nombre..."
          className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {[
                  "ID Categoría",
                  "Nombre Categoría",
                  "Acciones",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    <p className="text-4xl mb-3">🏷️</p>
                    <p>No se encontraron categorías</p>
                  </td>
                </tr>
              ) : (
                paged.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-sm font-mono font-semibold text-foreground">
                      {c.id}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-foreground">
                      {c.nombre}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setDetailItem(c)}
                          title="Ver detalle"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => setEditItem({ ...c })}
                            title="Editar"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteId(c.id)}
                            title="Eliminar"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-center mt-4">
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setPage((p) => Math.max(1, p - 1))
                }
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from(
                { length: totalPages },
                (_, i) => i + 1,
              ).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Crear ── */}
      <AnimatePresence>
        {showCreate && (
          <SmModal
            title="Crear Categoría"
            onClose={() => setShowCreate(false)}
            onConfirm={handleCreate}
            confirmLabel="Crear"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  ID Categoría
                </label>
                <div
                  className={
                    inputCls +
                    " bg-muted/60 text-muted-foreground cursor-not-allowed font-mono"
                  }
                >
                  CAT-
                  {String(categorias.length + 1).padStart(
                    3,
                    "0",
                  )}{" "}
                  (automático)
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Nombre Categoría *
                </label>
                <select
                  value={formNombre}
                  onChange={(e) =>
                    setFormNombre(e.target.value)
                  }
                  className={inputCls + " cursor-pointer"}
                >
                  <option value="Pizzas">Pizzas</option>
                  <option value="Lasañas">Lasañas</option>
                  <option value="Bebidas">Bebidas</option>
                </select>
              </div>
            </div>
          </SmModal>
        )}
      </AnimatePresence>

      {/* ── Editar ── */}
      <AnimatePresence>
        {editItem && (
          <SmModal
            title={`Editar — ${editItem.id}`}
            onClose={() => setEditItem(null)}
            onConfirm={handleEdit}
            confirmLabel="Guardar"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  ID Categoría
                </label>
                <div
                  className={
                    inputCls +
                    " bg-muted/60 text-muted-foreground cursor-not-allowed font-mono"
                  }
                >
                  {editItem.id}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Nombre Categoría *
                </label>
                <select
                  value={editItem.nombre}
                  onChange={(e) =>
                    setEditItem(
                      (x) =>
                        x && { ...x, nombre: e.target.value },
                    )
                  }
                  className={inputCls + " cursor-pointer"}
                >
                  <option value="Pizzas">Pizzas</option>
                  <option value="Lasañas">Lasañas</option>
                  <option value="Bebidas">Bebidas</option>
                </select>
              </div>
            </div>
          </SmModal>
        )}
      </AnimatePresence>

      {/* ── Ver detalle ── */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3
                  className="text-lg font-bold text-foreground"
                  style={{ fontFamily: SERIF }}
                >
                  Detalle — {detailItem.id}
                </h3>
                <button
                  onClick={() => setDetailItem(null)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                {[
                  {
                    label: "ID Categoría",
                    value: detailItem.id,
                  },
                  {
                    label: "Nombre Categoría",
                    value: detailItem.nombre,
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-4"
                  >
                    <span className="text-sm text-muted-foreground font-medium shrink-0">
                      {label}
                    </span>
                    <span className="text-sm font-semibold text-foreground text-right">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 border-t border-border">
                <button
                  onClick={() => setDetailItem(null)}
                  className="w-full py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Eliminar ── */}
      <AnimatePresence>
        {deleteId && (
          <ConfirmModal
            title="Eliminar categoría"
            message={`¿Seguro que deseas eliminar la categoría ${deleteId}? Esta acción no se puede deshacer.`}
            onConfirm={() => handleDelete(deleteId)}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
