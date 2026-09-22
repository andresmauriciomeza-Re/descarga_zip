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
const MONO = "'JetBrains Mono', monospace";

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

// ─────────────────────────── GESTIÓN PRODUCTOS ───────────────────────────

interface Producto {
  id: string;
  imagen: string;
  nombre: string;
  idCategoria: string;
  precioUnitario: number;
  unidadVenta: string;
  stockDisponible: number;
}

const CATEGORIAS_PRODUCTO = [
  { id: "CAT-001", nombre: "Pizzas" },
  { id: "CAT-002", nombre: "Lasañas" },
  { id: "CAT-003", nombre: "Bebidas" },
];

const INITIAL_PRODUCTOS: Producto[] = [
  {
    id: "PROD-001",
    imagen:
      "https://images.unsplash.com/photo-1564936281403-5cc7543df8e2?w=300&h=300&fit=crop&auto=format",
    nombre: "Margarita Clásica",
    idCategoria: "CAT-001",
    precioUnitario: 24000,
    unidadVenta: "und",
    stockDisponible: 50,
  },
  {
    id: "PROD-002",
    imagen:
      "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=300&h=300&fit=crop&auto=format",
    nombre: "Pepperoni Premium",
    idCategoria: "CAT-001",
    precioUnitario: 28000,
    unidadVenta: "und",
    stockDisponible: 40,
  },
  {
    id: "PROD-003",
    imagen:
      "https://images.unsplash.com/photo-1571407970349-bc81e71e5080?w=300&h=300&fit=crop&auto=format",
    nombre: "Cuatro Quesos",
    idCategoria: "CAT-002",
    precioUnitario: 30000,
    unidadVenta: "und",
    stockDisponible: 30,
  },
  {
    id: "PROD-004",
    imagen:
      "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=300&h=300&fit=crop&auto=format",
    nombre: "Especial La Sirena",
    idCategoria: "CAT-002",
    precioUnitario: 32000,
    unidadVenta: "und",
    stockDisponible: 25,
  },
  {
    id: "PROD-005",
    imagen:
      "https://images.unsplash.com/photo-1702716059239-385baacdabdc?w=300&h=300&fit=crop&auto=format",
    nombre: "Veggie Mediterránea",
    idCategoria: "CAT-003",
    precioUnitario: 26000,
    unidadVenta: "und",
    stockDisponible: 20,
  },
];

interface RInsumo { nombre: string; cantidad: number; unidad: string; }
interface FichaVersion {
  version: number;
  idReceta: string;
  tiempoPreparacion: number;
  porciones: number;
  insumos: RInsumo[];
}
const UNIDADES_FICHA = ["kg", "g", "lt", "ml", "und", "paq", "caja"];

function emptyFichaVersion(n: number): FichaVersion {
  return { version: n, idReceta: `REC-${String(n).padStart(3,"0")}`, tiempoPreparacion: 0, porciones: 1, insumos: [] };
}

export function GestionProductosScreen({ canCreate = true, canEdit = true, canDelete = true }: { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean } = {}) {
  const [productos, setProductos] = useState<Producto[]>(
    INITIAL_PRODUCTOS,
  );
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Producto | null>(
    null,
  );
  const [detailItem, setDetailItem] = useState<Producto | null>(
    null,
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const emptyForm = (): Omit<Producto, "id"> => ({
    imagen: "",
    nombre: "",
    idCategoria: "CAT-001",
    precioUnitario: 0,
    unidadVenta: "und",
    stockDisponible: 0,
  });
  const [form, setForm] = useState(emptyForm());

  // Ficha técnica state
  const [fichas, setFichas] = useState<Record<string, FichaVersion[]>>({});
  const [fichaVersiones, setFichaVersiones] = useState<FichaVersion[]>([emptyFichaVersion(1)]);
  const [fichaVIdx, setFichaVIdx] = useState(0);
  const [fichaInsumoNombre, setFichaInsumoNombre] = useState("");
  const [fichaInsumoCantidad, setFichaInsumoCantidad] = useState(1);
  const [fichaInsumoUnidad, setFichaInsumoUnidad] = useState("kg");

  // Edit-ficha state (separate from create-ficha)
  const [editFichaVersiones, setEditFichaVersiones] = useState<FichaVersion[]>([emptyFichaVersion(1)]);
  const [editFichaVIdx, setEditFichaVIdx] = useState(0);
  const [editFichaInsumoNombre, setEditFichaInsumoNombre] = useState("");
  const [editFichaInsumoCantidad, setEditFichaInsumoCantidad] = useState(1);
  const [editFichaInsumoUnidad, setEditFichaInsumoUnidad] = useState("kg");

  const resetFichaForm = () => {
    setFichaVersiones([emptyFichaVersion(1)]);
    setFichaVIdx(0);
    setFichaInsumoNombre("");
    setFichaInsumoCantidad(1);
    setFichaInsumoUnidad("kg");
  };

  const updateFichaField = (field: keyof Omit<FichaVersion, "insumos" | "version">, value: string | number) =>
    setFichaVersiones(prev => prev.map((v, i) => i === fichaVIdx ? { ...v, [field]: value } : v));

  const addFichaInsumo = () => {
    if (!fichaInsumoNombre.trim()) return;
    setFichaVersiones(prev => prev.map((v, i) =>
      i === fichaVIdx ? { ...v, insumos: [...v.insumos, { nombre: fichaInsumoNombre.trim(), cantidad: fichaInsumoCantidad, unidad: fichaInsumoUnidad }] } : v
    ));
    setFichaInsumoNombre(""); setFichaInsumoCantidad(1);
  };

  const removeFichaInsumo = (idx: number) =>
    setFichaVersiones(prev => prev.map((v, i) =>
      i === fichaVIdx ? { ...v, insumos: v.insumos.filter((_, j) => j !== idx) } : v
    ));

  const addFichaVersion = () => {
    const last = fichaVersiones[fichaVersiones.length - 1];
    const nv: FichaVersion = {
      version: last.version + 1,
      idReceta: `REC-${String(last.version + 1).padStart(3,"0")}`,
      tiempoPreparacion: last.tiempoPreparacion,
      porciones: last.porciones,
      insumos: last.insumos.map(i => ({ ...i })),
    };
    setFichaVersiones(prev => [...prev, nv]);
    setFichaVIdx(fichaVersiones.length);
  };

  // ── Edit-ficha helpers ───────────────────────────────────────────
  const openEdit = (p: Producto) => {
    setEditItem({ ...p });
    const existing = fichas[p.id];
    setEditFichaVersiones(existing
      ? existing.map(v => ({ ...v, insumos: v.insumos.map(i => ({ ...i })) }))
      : [emptyFichaVersion(1)]);
    setEditFichaVIdx(0);
    setEditFichaInsumoNombre("");
    setEditFichaInsumoCantidad(1);
    setEditFichaInsumoUnidad("kg");
  };

  const updateEditFichaField = (field: keyof Omit<FichaVersion, "insumos" | "version">, value: string | number) =>
    setEditFichaVersiones(prev => prev.map((v, i) => i === editFichaVIdx ? { ...v, [field]: value } : v));

  const addEditFichaInsumo = () => {
    if (!editFichaInsumoNombre.trim()) return;
    setEditFichaVersiones(prev => prev.map((v, i) =>
      i === editFichaVIdx ? { ...v, insumos: [...v.insumos, { nombre: editFichaInsumoNombre.trim(), cantidad: editFichaInsumoCantidad, unidad: editFichaInsumoUnidad }] } : v
    ));
    setEditFichaInsumoNombre(""); setEditFichaInsumoCantidad(1);
  };

  const removeEditFichaInsumo = (idx: number) =>
    setEditFichaVersiones(prev => prev.map((v, i) =>
      i === editFichaVIdx ? { ...v, insumos: v.insumos.filter((_, j) => j !== idx) } : v
    ));

  const addEditFichaVersion = () => {
    const last = editFichaVersiones[editFichaVersiones.length - 1];
    const nv: FichaVersion = {
      version: last.version + 1,
      idReceta: `REC-${String(last.version + 1).padStart(3,"0")}`,
      tiempoPreparacion: last.tiempoPreparacion,
      porciones: last.porciones,
      insumos: last.insumos.map(i => ({ ...i })),
    };
    setEditFichaVersiones(prev => [...prev, nv]);
    setEditFichaVIdx(editFichaVersiones.length);
  };

  const fmtCOP = (n: number) => `$${n.toLocaleString("es-CO")}`;
  const inputCls =
    "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const catName = (id: string) =>
    CATEGORIAS_PRODUCTO.find((c) => c.id === id)?.nombre ?? id;

  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const filtered = useMemo(
    () =>
      productos.filter(
        (p) =>
          p.id.toLowerCase().includes(search.toLowerCase()) ||
          p.nombre
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          catName(p.idCategoria)
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [productos, search],
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE,
  );

  const handleCreate = () => {
    if (!form.nombre || !form.idCategoria) {
      toast.error("Nombre y categoría son obligatorios");
      return;
    }
    const newId = `PROD-${String(productos.length + 1).padStart(3, "0")}`;
    setProductos((p) => [{ id: newId, ...form }, ...p]);
    const hasficha = fichaVersiones.some(v => v.insumos.length > 0 || v.tiempoPreparacion > 0 || v.porciones > 1);
    if (hasficha) setFichas(prev => ({ ...prev, [newId]: fichaVersiones }));
    setShowCreate(false);
    setForm(emptyForm());
    resetFichaForm();
    toast.success("Producto creado correctamente");
  };

  const handleEdit = () => {
    if (!editItem) return;
    setProductos((p) =>
      p.map((x) => (x.id === editItem.id ? editItem : x)),
    );
    const hasficha = editFichaVersiones.some(v => v.insumos.length > 0 || v.tiempoPreparacion > 0 || v.porciones > 1);
    if (hasficha) setFichas(prev => ({ ...prev, [editItem.id]: editFichaVersiones }));
    setEditItem(null);
    toast.success("Producto actualizado");
  };

  const handleDelete = (id: string) => {
    setProductos((p) => p.filter((x) => x.id !== id));
    setDeleteId(null);
    toast.success("Producto eliminado");
  };

  const roCls = "w-full px-3 py-2.5 bg-muted/50 rounded-xl border border-border text-sm text-foreground";
  const FormFields = ({
    values,
    onChange,
    hideUnidad = false,
    readOnly = false,
  }: {
    values: Omit<Producto, "id">;
    onChange: (f: keyof Omit<Producto, "id">, v: string | number) => void;
    hideUnidad?: boolean;
    readOnly?: boolean;
  }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Nombre */}
      <div className="sm:col-span-2">
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Nombre *
        </label>
        <input
          value={values.nombre}
          onChange={(e) => onChange("nombre", e.target.value)}
          placeholder="Ej: Margarita Clásica"
          readOnly={readOnly}
          className={readOnly ? roCls : inputCls}
        />
      </div>
      {/* Imagen */}
      <div className="sm:col-span-2">
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Imagen del producto
        </label>
        {!readOnly && (
          <div className="flex gap-2 mb-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-muted border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Subir archivo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onChange("imagen", URL.createObjectURL(file));
                }}
              />
            </label>
            <span className="flex items-center text-xs text-muted-foreground">o</span>
            <input
              value={values.imagen.startsWith("blob:") ? "" : values.imagen}
              onChange={(e) => onChange("imagen", e.target.value)}
              placeholder="Pega una URL de imagen..."
              className="flex-1 px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}
        {values.imagen && (
          <div className="relative w-full h-40 rounded-xl overflow-hidden bg-muted border border-border">
            <img src={values.imagen} alt="Vista previa" className="w-full h-full object-cover" />
            {!readOnly && (
              <button
                type="button"
                onClick={() => onChange("imagen", "")}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
      {/* ID Categoría */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          ID Categoría *
        </label>
        <select
          value={values.idCategoria}
          onChange={(e) => onChange("idCategoria", e.target.value)}
          disabled={readOnly}
          className={readOnly ? roCls : inputCls + " cursor-pointer"}
        >
          {CATEGORIAS_PRODUCTO.map((c) => (
            <option key={c.id} value={c.id}>{c.id} — {c.nombre}</option>
          ))}
        </select>
      </div>
      {/* Precio unitario */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Precio unitario (COP)
        </label>
        <input
          type="number"
          value={values.precioUnitario}
          onChange={(e) => onChange("precioUnitario", Number(e.target.value))}
          readOnly={readOnly}
          className={readOnly ? roCls : inputCls}
        />
      </div>
      {/* Unidad de venta */}
      {!hideUnidad && (
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Unidad de venta
          </label>
          <select
            value={values.unidadVenta}
            onChange={(e) => onChange("unidadVenta", e.target.value)}
            disabled={readOnly}
            className={readOnly ? roCls : inputCls + " cursor-pointer"}
          >
            {["und", "kg", "lt", "paq", "pza", "caja"].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      )}
      {/* Stock disponible */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Stock disponible
        </label>
        <input
          type="number"
          value={values.stockDisponible}
          onChange={(e) => onChange("stockDisponible", Number(e.target.value))}
          readOnly={readOnly}
          className={readOnly ? roCls : inputCls}
        />
      </div>
    </div>
  );

  const ModalWrap = ({
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
  }) => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.16 }}
        className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border my-6"
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
    </div>
  );

  // ── Pantalla completa Crear Producto ──────────────────────────────
  if (showCreate) {
    const activeV = fichaVersiones[fichaVIdx];
    const iCls = "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
    return (
      <div className="min-h-screen bg-background">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Crear Producto</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Completa los datos del producto y su ficha técnica</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setShowCreate(false); setForm(emptyForm()); resetFichaForm(); }}
              className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
              Cancelar
            </button>
            <button onClick={handleCreate}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
              Crear
            </button>
          </div>
        </div>

        {/* Two columns */}
        <div className="flex divide-x divide-border" style={{ minHeight: "calc(100vh - 73px)" }}>

          {/* ── COLUMNA IZQUIERDA: datos del producto ── */}
          <div className="w-1/2 px-8 py-6 overflow-y-auto">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Datos del producto</p>
            <div className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: Margarita Clásica" className={iCls} />
              </div>
              {/* Imagen */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Imagen del producto</label>
                <div className="flex gap-2 mb-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-muted border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Subir archivo
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) setForm(p => ({ ...p, imagen: URL.createObjectURL(file) }));
                    }} />
                  </label>
                  <span className="flex items-center text-xs text-muted-foreground">o</span>
                  <input value={form.imagen.startsWith("blob:") ? "" : form.imagen}
                    onChange={e => setForm(p => ({ ...p, imagen: e.target.value }))}
                    placeholder="Pega una URL de imagen..."
                    className="flex-1 px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                {form.imagen && (
                  <div className="relative w-full h-44 rounded-xl overflow-hidden bg-muted border border-border">
                    <img src={form.imagen} alt="Vista previa" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setForm(p => ({ ...p, imagen: "" }))}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {/* ID Categoría */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">ID Categoría *</label>
                <select value={form.idCategoria} onChange={e => setForm(p => ({ ...p, idCategoria: e.target.value }))}
                  className={iCls + " cursor-pointer"}>
                  {CATEGORIAS_PRODUCTO.map(c => (
                    <option key={c.id} value={c.id}>{c.id} — {c.nombre}</option>
                  ))}
                </select>
              </div>
              {/* Precio + Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Precio unitario (COP)</label>
                  <input type="number" value={form.precioUnitario}
                    onChange={e => setForm(p => ({ ...p, precioUnitario: Number(e.target.value) }))} className={iCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Stock disponible</label>
                  <input type="number" value={form.stockDisponible}
                    onChange={e => setForm(p => ({ ...p, stockDisponible: Number(e.target.value) }))} className={iCls} />
                </div>
              </div>
            </div>
          </div>

          {/* ── COLUMNA DERECHA: ficha técnica ── */}
          <div className="w-1/2 px-8 py-6 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ficha Técnica</p>
              <div className="flex items-center gap-1">
                {fichaVersiones.map((v, i) => (
                  <button key={i} onClick={() => setFichaVIdx(i)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      i === fichaVIdx ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-border"
                    }`}>
                    v{v.version}
                  </button>
                ))}
                <button onClick={addFichaVersion}
                  className="px-3 py-1 rounded-lg text-xs font-semibold border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors ml-1">
                  + versión
                </button>
              </div>
            </div>

            {fichaVersiones.length > 1 && (
              <p className="text-[11px] text-muted-foreground mb-3 bg-muted/40 px-3 py-1.5 rounded-lg">
                Versión activa: <span className="font-bold text-foreground">v{activeV.version}</span> — El historial de versiones se conserva al guardar.
              </p>
            )}

            <div className="space-y-4 flex-1">
              {/* ID Receta + Tiempo + Porciones */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">ID Receta</label>
                <input value={activeV.idReceta} onChange={e => updateFichaField("idReceta", e.target.value)}
                  className={iCls} placeholder="REC-001" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Tiempo de preparación (min)</label>
                  <input type="number" min={0} value={activeV.tiempoPreparacion}
                    onChange={e => updateFichaField("tiempoPreparacion", Number(e.target.value))} className={iCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Porciones</label>
                  <input type="number" min={1} value={activeV.porciones}
                    onChange={e => updateFichaField("porciones", Number(e.target.value))} className={iCls} />
                </div>
              </div>

              {/* Insumos */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">Insumos</label>
                {activeV.insumos.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {activeV.insumos.map((ins, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-xl border border-border">
                        <span className="flex-1 text-sm font-medium text-foreground">{ins.nombre}</span>
                        <span className="text-xs text-muted-foreground font-mono">{ins.cantidad} {ins.unidad}</span>
                        <button onClick={() => removeFichaInsumo(idx)}
                          className="p-1 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 cursor-pointer transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {activeV.insumos.length === 0 && (
                  <p className="text-xs text-muted-foreground italic mb-3">Sin insumos agregados</p>
                )}
                {/* Add insumo row */}
                <div className="flex gap-2">
                  <input value={fichaInsumoNombre} onChange={e => setFichaInsumoNombre(e.target.value)}
                    placeholder="Nombre del insumo"
                    onKeyDown={e => e.key === "Enter" && addFichaInsumo()}
                    className="flex-1 px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input type="number" min={0.1} step={0.1} value={fichaInsumoCantidad}
                    onChange={e => setFichaInsumoCantidad(Number(e.target.value))}
                    className="w-20 px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <select value={fichaInsumoUnidad} onChange={e => setFichaInsumoUnidad(e.target.value)}
                    className="px-2 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none cursor-pointer">
                    {UNIDADES_FICHA.map(u => <option key={u}>{u}</option>)}
                  </select>
                  <button onClick={addFichaInsumo}
                    className="px-3 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Pantalla completa Ver Detalle ────────────────────────────────
  if (detailItem) {
    const ficha = fichas[detailItem.id] ?? null;
    const fichaV = ficha ? ficha[ficha.length - 1] : null;
    const readCls = "w-full px-3 py-2.5 bg-muted/50 rounded-xl border border-border text-sm text-foreground";
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Detalle — {detailItem.id}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Información del producto y su ficha técnica</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDetailItem(null)}
              className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
              Cerrar
            </button>
            {canEdit && (
              <button onClick={() => { openEdit(detailItem); setDetailItem(null); }}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                Editar
              </button>
            )}
          </div>
        </div>

        <div className="flex divide-x divide-border" style={{ minHeight: "calc(100vh - 73px)" }}>

          {/* COLUMNA IZQUIERDA: datos del producto */}
          <div className="w-1/2 px-8 py-6 overflow-y-auto">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Datos del producto</p>
            {FormFields({
              values: detailItem,
              onChange: () => {},
              readOnly: true,
            })}
          </div>

          {/* COLUMNA DERECHA: ficha técnica */}
          <div className="w-1/2 px-8 py-6 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ficha Técnica</p>
              {ficha && ficha.length > 1 && (
                <div className="flex items-center gap-1">
                  {ficha.map(v => (
                    <span key={v.version} className="px-3 py-1 rounded-lg text-xs font-bold bg-muted text-muted-foreground">
                      v{v.version}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {!fichaV ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Sin ficha técnica</p>
                <p className="text-xs text-muted-foreground">Este producto no tiene ficha técnica registrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">ID Receta</p>
                  <div className={readCls}>{fichaV.idReceta}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Tiempo de preparación (min)</p>
                    <div className={readCls}>{fichaV.tiempoPreparacion}</div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Porciones</p>
                    <div className={readCls}>{fichaV.porciones}</div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Insumos</p>
                  {fichaV.insumos.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Sin insumos registrados</p>
                  ) : (
                    <div className="space-y-1.5">
                      {fichaV.insumos.map((ins, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-xl border border-border">
                          <span className="flex-1 text-sm font-medium text-foreground">{ins.nombre}</span>
                          <span className="text-xs text-muted-foreground font-mono">{ins.cantidad} {ins.unidad}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {ficha && ficha.length > 1 && (
                  <p className="text-[11px] text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg">
                    Versión más reciente: <span className="font-bold text-foreground">v{fichaV.version}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Pantalla completa Editar Producto ─────────────────────────────
  if (editItem) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Editar — {editItem.id}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Modifica los datos del producto</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setEditItem(null)}
              className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
              Cancelar
            </button>
            <button onClick={handleEdit}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
              Guardar
            </button>
          </div>
        </div>

        <div className="flex divide-x divide-border" style={{ minHeight: "calc(100vh - 73px)" }}>

          {/* COLUMNA IZQUIERDA: datos editables */}
          <div className="w-1/2 px-8 py-6 overflow-y-auto">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Datos del producto</p>
            {FormFields({
              values: editItem,
              onChange: (f, v) => setEditItem((x) => x && { ...x, [f]: v }),
            })}
          </div>

          {/* COLUMNA DERECHA: ficha técnica editable */}
          {(() => {
            const activeEV = editFichaVersiones[editFichaVIdx];
            return (
              <div className="w-1/2 px-8 py-6 overflow-y-auto flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ficha Técnica</p>
                  <div className="flex items-center gap-1">
                    {editFichaVersiones.map((v, i) => (
                      <button key={i} onClick={() => setEditFichaVIdx(i)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          i === editFichaVIdx ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-border"
                        }`}>
                        v{v.version}
                      </button>
                    ))}
                    <button onClick={addEditFichaVersion}
                      className="px-3 py-1 rounded-lg text-xs font-semibold border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors ml-1">
                      + versión
                    </button>
                  </div>
                </div>

                {editFichaVersiones.length > 1 && (
                  <p className="text-[11px] text-muted-foreground mb-3 bg-muted/40 px-3 py-1.5 rounded-lg">
                    Versión activa: <span className="font-bold text-foreground">v{activeEV.version}</span> — El historial de versiones se conserva al guardar.
                  </p>
                )}

                <div className="space-y-4 flex-1">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">ID Receta</label>
                    <input value={activeEV.idReceta} onChange={e => updateEditFichaField("idReceta", e.target.value)}
                      className={inputCls} placeholder="REC-001" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Tiempo de preparación (min)</label>
                      <input type="number" min={0} value={activeEV.tiempoPreparacion}
                        onChange={e => updateEditFichaField("tiempoPreparacion", Number(e.target.value))} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Porciones</label>
                      <input type="number" min={1} value={activeEV.porciones}
                        onChange={e => updateEditFichaField("porciones", Number(e.target.value))} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-2">Insumos</label>
                    {activeEV.insumos.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {activeEV.insumos.map((ins, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-xl border border-border">
                            <span className="flex-1 text-sm font-medium text-foreground">{ins.nombre}</span>
                            <span className="text-xs text-muted-foreground font-mono">{ins.cantidad} {ins.unidad}</span>
                            <button onClick={() => removeEditFichaInsumo(idx)}
                              className="p-1 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 cursor-pointer transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {activeEV.insumos.length === 0 && (
                      <p className="text-xs text-muted-foreground italic mb-3">Sin insumos agregados</p>
                    )}
                    <div className="flex gap-2">
                      <input value={editFichaInsumoNombre} onChange={e => setEditFichaInsumoNombre(e.target.value)}
                        placeholder="Nombre del insumo"
                        onKeyDown={e => e.key === "Enter" && addEditFichaInsumo()}
                        className="flex-1 px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      <input type="number" min={0.1} step={0.1} value={editFichaInsumoCantidad}
                        onChange={e => setEditFichaInsumoCantidad(Number(e.target.value))}
                        className="w-20 px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      <select value={editFichaInsumoUnidad} onChange={e => setEditFichaInsumoUnidad(e.target.value)}
                        className="px-2 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none cursor-pointer">
                        {UNIDADES_FICHA.map(u => <option key={u}>{u}</option>)}
                      </select>
                      <button onClick={addEditFichaInsumo}
                        className="px-3 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            Gestión Producto
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {productos.length} productos registrados
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => {
              setForm(emptyForm());
              setShowCreate(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md text-sm"
          >
            <Plus className="w-4 h-4" /> Crear Producto
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por ID, nombre o categoría..."
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
                  "ID Producto",
                  "Imagen",
                  "Nombre",
                  "ID Categoría",
                  "Precio Unit.",
                  "Stock",
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
                    colSpan={8}
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    <p className="text-4xl mb-3">📦</p>
                    <p>No se encontraron productos</p>
                  </td>
                </tr>
              ) : (
                paged.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-sm font-mono font-semibold text-foreground">
                      {p.id}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                        {p.imagen ? (
                          <img
                            src={p.imagen}
                            alt={p.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            —
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-foreground">
                      {p.nombre}
                    </td>
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="text-xs font-mono font-semibold text-foreground">
                          {p.idCategoria}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {catName(p.idCategoria)}
                        </p>
                      </div>
                    </td>
                    <td
                      className="px-4 py-3.5 text-sm font-bold text-foreground"
                      style={{ fontFamily: MONO }}
                    >
                      {fmtCOP(p.precioUnitario)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-sm font-bold ${p.stockDisponible <= 5 ? "text-red-600" : p.stockDisponible <= 15 ? "text-yellow-600" : "text-emerald-600"}`}
                      >
                        {p.stockDisponible}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setDetailItem(p)}
                          title="Ver detalle"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => openEdit(p)}
                            title="Editar"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteId(p.id)}
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


      {/* ── Eliminar ── */}
      <AnimatePresence>
        {deleteId && (
          <ConfirmModal
            title="Eliminar producto"
            message={`¿Seguro que deseas eliminar el producto ${deleteId}? Esta acción no se puede deshacer.`}
            onConfirm={() => handleDelete(deleteId)}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
