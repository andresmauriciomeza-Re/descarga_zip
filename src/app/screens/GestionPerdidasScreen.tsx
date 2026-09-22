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
import { CalendarDropdown } from "../components/CalendarDropdown";

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

// ─────────────────────────── SHARED HELPERS ───────────────────────────

const fmtCOP = (n: number) => `$${n.toLocaleString("es-CO")}`;
const inputCls =
  "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

// ─────────────────────────── GESTIÓN PÉRDIDAS ───────────────────────────

interface Perdida {
  id: string;
  idVenta: string;
  usuario: string;
  fecha: string;
  imagenProducto: string;
  precioUnitario: number;
  cantidadPerdida: number;
}

// Ventas disponibles para asociar a una pérdida
interface VentaDetalle {
  id: string;
  usuario: string;
  fecha: string;
  productos: string;
  cantidad: number;
  total: number;
  estado: string;
}

const TODAS_LAS_VENTAS: VentaDetalle[] = [
  {
    id: "VEN-001",
    usuario: "María González",
    fecha: "2024-01-15",
    productos: "Margarita Clásica x2",
    cantidad: 2,
    total: 56000,
    estado: "Entregado",
  },
  {
    id: "VEN-002",
    usuario: "Carlos Martínez",
    fecha: "2024-01-15",
    productos: "Pepperoni Premium x1",
    cantidad: 1,
    total: 28000,
    estado: "En proceso",
  },
  {
    id: "VEN-003",
    usuario: "Ana Rodríguez",
    fecha: "2024-01-16",
    productos: "Cuatro Quesos x3",
    cantidad: 3,
    total: 90000,
    estado: "Pendiente",
  },
  {
    id: "VEN-004",
    usuario: "Jorge Vargas",
    fecha: "2024-01-16",
    productos: "Especial La Sirena x1",
    cantidad: 1,
    total: 32000,
    estado: "Cancelado",
  },
  {
    id: "VEN-005",
    usuario: "Patricia Soto",
    fecha: "2024-01-17",
    productos: "Hawaiana x2, Pepperoni x1",
    cantidad: 3,
    total: 54000,
    estado: "Pendiente",
  },
  {
    id: "VEN-006",
    usuario: "Luis Herrera",
    fecha: "2024-01-17",
    productos: "Cuatro Quesos x2",
    cantidad: 2,
    total: 70000,
    estado: "Cancelado",
  },
  {
    id: "VEN-007",
    usuario: "Sandra Ríos",
    fecha: "2024-01-18",
    productos: "Pepperoni Premium x1",
    cantidad: 1,
    total: 28000,
    estado: "Cancelado",
  },
  {
    id: "VTA-004",
    usuario: "Jorge Vargas",
    fecha: "2024-01-16",
    productos: "Especial La Sirena x1",
    cantidad: 1,
    total: 32000,
    estado: "Cancelado",
  },
];

const VENTAS_PERDIDAS_DETAIL: Record<string, VentaDetalle> =
  Object.fromEntries(TODAS_LAS_VENTAS.map((p) => [p.id, p]));

const PRODUCT_IMAGES: Record<string, string> = {
  "VEN-004":
    "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=300&h=300&fit=crop&auto=format",
  "VEN-006":
    "https://images.unsplash.com/photo-1680405620826-83b0f0f61b28?w=300&h=300&fit=crop&auto=format",
  "VEN-007":
    "https://images.unsplash.com/photo-1573821663912-6df460f9c684?w=300&h=300&fit=crop&auto=format",
  "VTA-004":
    "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=300&h=300&fit=crop&auto=format",
};

const INITIAL_PERDIDAS: Perdida[] = [
  {
    id: "PER-001",
    idVenta: "VEN-004",
    usuario: "Jorge Vargas",
    fecha: "2024-01-16",
    imagenProducto: PRODUCT_IMAGES["VEN-004"],
    precioUnitario: 32000,
    cantidadPerdida: 1,
  },
  {
    id: "PER-002",
    idVenta: "VTA-004",
    usuario: "Jorge Vargas",
    fecha: "2024-01-17",
    imagenProducto: PRODUCT_IMAGES["VTA-004"],
    precioUnitario: 32000,
    cantidadPerdida: 2,
  },
  {
    id: "PER-003",
    idVenta: "VEN-006",
    usuario: "Luis Herrera",
    fecha: "2024-01-18",
    imagenProducto: PRODUCT_IMAGES["VEN-006"],
    precioUnitario: 60000,
    cantidadPerdida: 1,
  },
];

// Self-contained create/edit modal with pedido autocomplete
// Defined outside GestionPerdidasScreen so React never remounts it on parent re-renders.
function PerdidaModal({
  title,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  initial: Omit<Perdida, "id">;
  onClose: () => void;
  onSave: (v: Omit<Perdida, "id">) => void;
}) {
  const [idVenta, setIdVenta] = useState(initial.idVenta);
  const [ventaQ, setVentaQ] = useState(initial.idVenta);
  const [showVentas, setShowVentas] = useState(false);
  const [usuario, setUsuario] = useState(initial.usuario);
  const [fecha, setFecha] = useState(initial.fecha);
  const [precioU, setPrecioU] = useState(
    initial.precioUnitario,
  );
  const [cantidad, setCantidad] = useState(
    initial.cantidadPerdida,
  );

  const ventasFiltradas = TODAS_LAS_VENTAS.filter(
    (p) =>
      ventaQ === "" ||
      p.id.toLowerCase().includes(ventaQ.toLowerCase()) ||
      p.usuario
        .toLowerCase()
        .includes(ventaQ.toLowerCase()) ||
      p.productos
        .toLowerCase()
        .includes(ventaQ.toLowerCase()),
  );

  const selVenta = VENTAS_PERDIDAS_DETAIL[idVenta];

  const maxCantidad = selVenta?.cantidad ?? 999;

  const selectVenta = (p: VentaDetalle) => {
    setIdVenta(p.id);
    setVentaQ(p.id);
    setUsuario(p.usuario);
    if (p.cantidad > 0)
      setPrecioU(Math.round(p.total / p.cantidad));
    // Ajustar cantidad perdida al máximo de la venta
    setCantidad((prev) => Math.min(prev, p.cantidad));
    setShowVentas(false);
  };

  const save = () => {
    if (!idVenta || !fecha) {
      toast.error("ID Venta y Fecha son obligatorios");
      return;
    }
    const img =
      PRODUCT_IMAGES[idVenta] ||
      "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=300&h=300&fit=crop&auto=format";
    onSave({
      idVenta,
      usuario,
      fecha,
      imagenProducto: img,
      precioUnitario: precioU,
      cantidadPerdida: cantidad,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.16 }}
        className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border my-4"
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
        <div className="px-5 py-4 space-y-4">
          {/* ID Venta con autocomplete */}
          <div className="relative">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              ID Venta *
            </label>
            <input
              value={ventaQ}
              onChange={(e) => {
                setVentaQ(e.target.value);
                setIdVenta("");
                setShowVentas(true);
              }}
              onFocus={() => setShowVentas(true)}
              onBlur={() =>
                setTimeout(() => setShowVentas(false), 160)
              }
              placeholder="Busca por ID, usuario o producto..."
              className={inputCls}
              autoComplete="off"
            />
            {showVentas && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                {ventasFiltradas.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    Sin resultados
                  </p>
                ) : (
                  ventasFiltradas.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={() => selectVenta(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors cursor-pointer border-b border-border last:border-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {p.id} — {p.usuario}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {p.productos}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${p.estado === "Cancelado" ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`}
                        >
                          {p.estado}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
            {selVenta && (
              <p className="text-xs text-emerald-600 mt-1 font-medium">
                ✓ {selVenta.productos} ·{" "}
                {fmtCOP(selVenta.total)}
              </p>
            )}
          </div>

          {/* Usuario */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Usuario al que se aplica
            </label>
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Nombre del usuario"
              className={inputCls}
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Fecha *
            </label>
            <CalendarDropdown
              value={fecha}
              onChange={setFecha}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Precio unitario (COP)
              </label>
              <input
                type="number"
                value={precioU}
                onChange={(e) =>
                  setPrecioU(Number(e.target.value))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Cantidad perdida
                {selVenta && (
                  <span className="ml-1 font-normal text-muted-foreground/70">
                    (máx. {maxCantidad})
                  </span>
                )}
              </label>
              <input
                type="number"
                min={1}
                max={maxCantidad}
                value={cantidad}
                onChange={(e) => {
                  const v = Math.max(
                    1,
                    Math.min(
                      Number(e.target.value),
                      maxCantidad,
                    ),
                  );
                  setCantidad(v);
                }}
                className={inputCls}
              />
              {cantidad >= maxCantidad && selVenta && (
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  ⚠ Máximo alcanzado ({maxCantidad} de la
                  venta)
                </p>
              )}
            </div>
          </div>

          {/* Resumen */}
          {precioU > 0 && cantidad > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-red-50 rounded-xl border border-red-100">
              <span className="text-sm font-medium text-red-700">
                {cantidad} ud. perdidas · Total pérdida
              </span>
              <span
                className="text-base font-bold text-red-700"
                style={{ fontFamily: MONO }}
              >
                {fmtCOP(precioU * cantidad)}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95"
          >
            Registrar pérdida
          </button>
        </div>
      </motion.div>
      </div>
    </div>
  );
}

export function GestionPerdidasScreen({
  perdidas,
  setPerdidas,
  onVentaMarcadaPerdida,
  onPerdidaEliminada,
}: {
  perdidas: Perdida[];
  setPerdidas: React.Dispatch<React.SetStateAction<Perdida[]>>;
  onVentaMarcadaPerdida: (idVenta: string) => void;
  onPerdidaEliminada: (idVenta: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Perdida | null>(
    null,
  );
  const [detailItem, setDetailItem] = useState<Perdida | null>(
    null,
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pendingPerdidaSave, setPendingPerdidaSave] = useState<{
    data: Omit<Perdida, "id"> & { id?: string };
    mode: "create" | "edit";
  } | null>(null);

  const emptyForm = (): Omit<Perdida, "id"> => ({
    idVenta: "",
    usuario: "",
    fecha: "",
    imagenProducto: "",
    precioUnitario: 0,
    cantidadPerdida: 1,
  });
  const [form, setForm] = useState(emptyForm());

  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const filtered = useMemo(
    () =>
      perdidas.filter(
        (p) =>
          p.id.toLowerCase().includes(search.toLowerCase()) ||
          p.idVenta
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          p.usuario
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [perdidas, search],
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE,
  );

  const handleCreate = () => {
    if (!form.idVenta || !form.fecha) {
      toast.error("ID Venta y Fecha son obligatorios");
      return;
    }
    const newId = `PER-${String(perdidas.length + 1).padStart(3, "0")}`;
    const img =
      PRODUCT_IMAGES[form.idVenta] ||
      "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=300&h=300&fit=crop&auto=format";
    const pedido = VENTAS_PERDIDAS_DETAIL[form.idVenta];
    setPerdidas((p) => [
      {
        id: newId,
        ...form,
        usuario: form.usuario || pedido?.usuario || "",
        imagenProducto: img,
      },
      ...p,
    ]);
    onVentaMarcadaPerdida(form.idVenta);
    setShowCreate(false);
    setForm(emptyForm());
    toast.success(
      "Pérdida registrada — venta marcada como Pérdida",
    );
  };

  const handleEdit = () => {
    if (!editItem) return;
    setPerdidas((p) =>
      p.map((x) => (x.id === editItem.id ? editItem : x)),
    );
    setEditItem(null);
    toast.success("Pérdida actualizada");
  };

  const handleDelete = (id: string) => {
    const perdida = perdidas.find((x) => x.id === id);
    setPerdidas((p) => p.filter((x) => x.id !== id));
    if (perdida) onPerdidaEliminada(perdida.idVenta);
    setDeleteId(null);
    toast.success(
      "Pérdida eliminada — venta vuelve a estado Venta",
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            Gestión Pérdidas
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {perdidas.length} pérdidas registradas
          </p>
        </div>
        <button
          onClick={() => {
            setForm(emptyForm());
            setShowCreate(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md text-sm"
        >
          <Plus className="w-4 h-4" /> Crear Pérdida
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por ID Pérdida o ID Venta..."
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
                  "ID Pérdida",
                  "ID Venta",
                  "Usuario",
                  "Fecha",
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
                    colSpan={5}
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    <p className="text-4xl mb-3">📉</p>
                    <p>No se encontraron pérdidas</p>
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
                    <td className="px-4 py-3.5 text-sm font-mono text-foreground">
                      {p.idVenta}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-foreground">
                      {p.usuario || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                      {p.fecha}
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
                        <button
                          onClick={() => setEditItem({ ...p })}
                          title="Editar"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(p.id)}
                          title="Eliminar"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          <PerdidaModal
            title="Registrar Pérdida"
            initial={form}
            onClose={() => setShowCreate(false)}
            onSave={(v) => {
              setShowCreate(false);
              setPendingPerdidaSave({
                data: v,
                mode: "create",
              });
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Editar ── */}
      <AnimatePresence>
        {editItem && (
          <PerdidaModal
            key={editItem.id}
            title={`Editar — ${editItem.id}`}
            initial={editItem}
            onClose={() => setEditItem(null)}
            onSave={(v) => {
              setEditItem(null);
              setPendingPerdidaSave({
                data: { ...editItem, ...v },
                mode: "edit",
              });
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Ver detalle ── */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="bg-card rounded-2xl w-full max-w-4xl shadow-2xl border border-border my-4"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3
                  className="text-lg font-bold text-foreground"
                  style={{ fontFamily: SERIF }}
                >
                  Pérdida — {detailItem.id}
                </h3>
                <button
                  onClick={() => setDetailItem(null)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 3-column body */}
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
                {/* LEFT — Información de la pérdida */}
                <div className="px-5 py-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                    Información de la pérdida
                  </p>
                  <div className="space-y-3">
                    {[
                      { l: "ID Pérdida", v: detailItem.id },
                      {
                        l: "ID Venta",
                        v: detailItem.idVenta,
                      },
                      {
                        l: "Usuario",
                        v: detailItem.usuario || "—",
                      },
                      { l: "Fecha", v: detailItem.fecha },
                    ].map(({ l, v }) => (
                      <div key={l}>
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">
                          {l}
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {v}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CENTER — Información de la venta */}
                <div className="px-5 py-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                    Información de la venta
                  </p>
                  {(() => {
                    const ped =
                      VENTAS_PERDIDAS_DETAIL[
                        detailItem.idVenta
                      ];
                    if (!ped)
                      return (
                        <p className="text-sm text-muted-foreground italic">
                          Venta no encontrada
                        </p>
                      );
                    return (
                      <div className="space-y-3">
                        {[
                          { l: "ID Venta", v: ped.id },
                          { l: "Usuario", v: ped.usuario },
                          { l: "Fecha", v: ped.fecha },
                          { l: "Productos", v: ped.productos },
                          {
                            l: "Cantidad",
                            v: String(ped.cantidad),
                          },
                          { l: "Total", v: fmtCOP(ped.total) },
                          { l: "Estado", v: ped.estado },
                        ].map(({ l, v }) => (
                          <div key={l}>
                            <p className="text-xs text-muted-foreground font-medium mb-0.5">
                              {l}
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                              {v}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* RIGHT — Detalle de pérdida */}
                <div className="px-5 py-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                    Detalle de pérdida
                  </p>
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-muted mb-4 shadow-sm">
                    <img
                      src={detailItem.imagenProducto}
                      alt="Producto perdido"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-xs text-muted-foreground font-medium">
                        ID Producto
                      </span>
                      <span className="text-xs font-semibold text-foreground font-mono">
                        {detailItem.idVenta}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-xs text-muted-foreground font-medium">
                        Precio unitario
                      </span>
                      <span
                        className="text-xs font-semibold text-foreground"
                        style={{ fontFamily: MONO }}
                      >
                        {fmtCOP(detailItem.precioUnitario)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-xs text-muted-foreground font-medium">
                        Cantidad perdida
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {detailItem.cantidadPerdida} ud.
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-sm font-bold text-foreground">
                        Total a pagar
                      </span>
                      <span
                        className="text-sm font-bold text-red-600"
                        style={{ fontFamily: MONO }}
                      >
                        {fmtCOP(
                          detailItem.precioUnitario *
                            detailItem.cantidadPerdida,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-border">
                <button
                  onClick={() => setDetailItem(null)}
                  className="w-full py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Eliminar ── */}
      <AnimatePresence>
        {deleteId && (
          <ConfirmModal
            title="Eliminar pérdida"
            message={`¿Seguro que deseas eliminar la pérdida ${deleteId}? Esta acción no se puede deshacer.`}
            onConfirm={() => handleDelete(deleteId)}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Confirmar guardado pérdida ── */}
      <AnimatePresence>
        {pendingPerdidaSave && (
          <ConfirmModal
            title={
              pendingPerdidaSave.mode === "create"
                ? "Registrar pérdida"
                : "Guardar cambios"
            }
            message={
              pendingPerdidaSave.mode === "create"
                ? `¿Estás seguro de registrar esta pérdida? La venta ${pendingPerdidaSave.data.idVenta} será marcada como Pérdida.`
                : `¿Estás seguro de guardar los cambios en esta pérdida?`
            }
            onConfirm={() => {
              const { data, mode } = pendingPerdidaSave;
              if (mode === "create") {
                const newId = `PER-${String(perdidas.length + 1).padStart(3, "0")}`;
                const img =
                  PRODUCT_IMAGES[data.idVenta] ||
                  "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=300&h=300&fit=crop&auto=format";
                setPerdidas((p) => [
                  { id: newId, ...data, imagenProducto: img },
                  ...p,
                ]);
                onVentaMarcadaPerdida(data.idVenta);
                setForm(emptyForm());
                toast.success(
                  "Pérdida registrada — venta marcada como Pérdida",
                );
              } else {
                setPerdidas((p) =>
                  p.map((x) =>
                    x.id === (data as Perdida).id
                      ? (data as Perdida)
                      : x,
                  ),
                );
                toast.success("Pérdida actualizada");
              }
              setPendingPerdidaSave(null);
            }}
            onCancel={() => setPendingPerdidaSave(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export { INITIAL_PERDIDAS };
export type { Perdida };
