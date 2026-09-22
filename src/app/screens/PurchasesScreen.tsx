import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Eye, Pencil, X, Check, ChevronLeft, ChevronRight, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { CalendarDropdown } from "../components/CalendarDropdown";
import { INITIAL_SUPPLIERS } from "./SuppliersScreen";

const SERIF = "'DM Serif Display', serif";
const MONO = "'JetBrains Mono', monospace";

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

// ─────────────────────────── PURCHASES ───────────────────────────

type PurchaseStatus =
  | "enviado"
  | "anulado"
  | "proceso"
  | "recibido";

interface InsumoLine {
  id: string;
  idInsumo: string;
  nombre: string;
  cantidad: number;
  unidadMedida: string;
  precioUnitario: number;
  subtotal: number;
}

interface Purchase {
  id: string;
  idProveedor: string;
  fecha: string;
  iva: number;
  subtotal: number;
  total: number;
  estado: PurchaseStatus;
  insumos: InsumoLine[];
}

const PURCHASE_STATUS_COLOR: Record<PurchaseStatus, string> = {
  enviado: "bg-emerald-100 text-emerald-800",
  anulado: "bg-red-100 text-red-700",
  proceso: "bg-yellow-100 text-yellow-800",
  recibido: "bg-blue-100 text-blue-800",
};

const PURCHASE_STATUS_LABEL: Record<PurchaseStatus, string> = {
  enviado: "Enviado",
  anulado: "Anulado",
  proceso: "En Proceso",
  recibido: "Recibido",
};

export const INITIAL_PURCHASES: Purchase[] = [
  {
    id: "COM-001",
    idProveedor: "PROV-001",
    fecha: "2024-01-10",
    iva: 19000,
    subtotal: 100000,
    total: 119000,
    estado: "enviado",
    insumos: [],
  },
  {
    id: "COM-002",
    idProveedor: "PROV-003",
    fecha: "2024-01-12",
    iva: 28500,
    subtotal: 150000,
    total: 178500,
    estado: "proceso",
    insumos: [],
  },
  {
    id: "COM-003",
    idProveedor: "PROV-002",
    fecha: "2024-01-14",
    iva: 9500,
    subtotal: 50000,
    total: 59500,
    estado: "enviado",
    insumos: [],
  },
  {
    id: "COM-004",
    idProveedor: "PROV-001",
    fecha: "2024-01-15",
    iva: 38000,
    subtotal: 200000,
    total: 238000,
    estado: "anulado",
    insumos: [],
  },
  {
    id: "COM-005",
    idProveedor: "PROV-004",
    fecha: "2024-01-16",
    iva: 14250,
    subtotal: 75000,
    total: 89250,
    estado: "proceso",
    insumos: [],
  },
];

const IVA_RATE = 0.19; // 19%

const emptyInsumo = (): InsumoLine => ({
  id: `INS-${Date.now()}`,
  idInsumo: "",
  nombre: "",
  cantidad: 1,
  unidadMedida: "kg",
  precioUnitario: 0,
  subtotal: 0,
});

// Catálogo de insumos disponibles para seleccionar al crear una compra
const CATALOGO_INSUMOS = [
  {
    idInsumo: "INS-001",
    nombre: "Queso Mozzarella",
    unidadMedida: "kg",
    precioUnitario: 18000,
  },
  {
    idInsumo: "INS-002",
    nombre: "Salsa de Tomate",
    unidadMedida: "lt",
    precioUnitario: 8000,
  },
  {
    idInsumo: "INS-003",
    nombre: "Pepperoni",
    unidadMedida: "kg",
    precioUnitario: 25000,
  },
  {
    idInsumo: "INS-004",
    nombre: "Masa Pre-elaborada",
    unidadMedida: "und",
    precioUnitario: 3500,
  },
  {
    idInsumo: "INS-005",
    nombre: "Champiñones",
    unidadMedida: "kg",
    precioUnitario: 12000,
  },
  {
    idInsumo: "INS-006",
    nombre: "Albahaca Fresca",
    unidadMedida: "kg",
    precioUnitario: 9000,
  },
  {
    idInsumo: "INS-007",
    nombre: "Jamón Serrano",
    unidadMedida: "kg",
    precioUnitario: 32000,
  },
  {
    idInsumo: "INS-008",
    nombre: "Piña en Trozos",
    unidadMedida: "kg",
    precioUnitario: 6000,
  },
  {
    idInsumo: "INS-009",
    nombre: "Aceitunas Negras",
    unidadMedida: "kg",
    precioUnitario: 14000,
  },
  {
    idInsumo: "INS-010",
    nombre: "Cebolla Morada",
    unidadMedida: "kg",
    precioUnitario: 4000,
  },
  {
    idInsumo: "INS-011",
    nombre: "Pimentón",
    unidadMedida: "kg",
    precioUnitario: 5000,
  },
  {
    idInsumo: "INS-012",
    nombre: "Bebidas 350ml",
    unidadMedida: "und",
    precioUnitario: 2500,
  },
];

function WideModal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.16 }}
        className="bg-card rounded-2xl w-full max-w-3xl shadow-2xl border border-border my-4"
      >
        {children}
      </motion.div>
      </div>
    </div>
  );
}

function SmallModal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.16 }}
        className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border"
      >
        {children}
      </motion.div>
    </div>
  );
}

export function PurchasesScreen() {
  const [purchases, setPurchases] = useState<Purchase[]>(
    INITIAL_PURCHASES,
  );
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [confirmEstado, setConfirmEstado] = useState<{ purchase: Purchase; nuevoEstado: PurchaseStatus } | null>(null);
  const [detailItem, setDetailItem] = useState<Purchase | null>(
    null,
  );
  const [editItem, setEditItem] = useState<Purchase | null>(
    null,
  );

  // ── Cabecera del formulario de crear ──
  const [form, setForm] = useState({
    idProveedor: "",
    fecha: "",
    estado: "proceso" as PurchaseStatus,
  });
  // ── IVA seleccionable del formulario de crear ──
  const [formIvaPercent, setFormIvaPercent] = useState("19");
  const [editIvaPercent, setEditIvaPercent] = useState("19");
  const [prevEstadoCompra, setPrevEstadoCompra] = useState<PurchaseStatus>("proceso");
  // ── Insumos del formulario de crear ──
  const [formInsumos, setFormInsumos] = useState<InsumoLine[]>(
    [],
  );
  const [editingInsumoId, setEditingInsumoId] = useState<
    string | null
  >(null);
  const [showInsumoList, setShowInsumoList] = useState(false);
  const [insumoSearch, setInsumoSearch] = useState("");
  // ── Estados para editar insumos en modal de editar ──
  const [showEditInsumoList, setShowEditInsumoList] =
    useState(false);
  const [editInsumoSearch, setEditInsumoSearch] = useState("");
  const [editingEditInsumoId, setEditingEditInsumoId] =
    useState<string | null>(null);
  const [editIvaManual, setEditIvaManual] = useState(0); // kept for handleEdit compat
  // ── Vencimientos (estado Recibido) ──
  const [usarLotes, setUsarLotes] = useState(false);
  const [fechaEntrada, setFechaEntrada] = useState("");
  const [lotes, setLotes] = useState<
    Record<
      string,
      { id: string; cantidad: number; fechaVenc: string }[]
    >
  >({});

  const fmtCOP = (n: number) => `$${n.toLocaleString("es-CO")}`;

  // Totales calculados desde los insumos
  const calcSubtotal = (lines: InsumoLine[]) =>
    lines.reduce((s, l) => s + l.subtotal, 0);
  const calcIva = (sub: number) => Math.round(sub * IVA_RATE);

  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const filtered = useMemo(
    () =>
      purchases.filter(
        (p) =>
          p.id.toLowerCase().includes(search.toLowerCase()) ||
          p.idProveedor
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [purchases, search],
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE,
  );

  // ── Insumo helpers ──
  const updateInsumo = (
    id: string,
    field: keyof InsumoLine,
    raw: string,
  ) => {
    setFormInsumos((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = {
          ...l,
          [field]: ["cantidad", "precioUnitario"].includes(
            field,
          )
            ? Number(raw)
            : raw,
        };
        updated.subtotal =
          updated.cantidad * updated.precioUnitario;
        return updated;
      }),
    );
  };

  const addInsumoFromCatalog = (
    cat: (typeof CATALOGO_INSUMOS)[number],
  ) => {
    // Si ya existe ese insumo en la lista, incrementa cantidad
    const existing = formInsumos.find(
      (l) => l.idInsumo === cat.idInsumo,
    );
    if (existing) {
      setFormInsumos((prev) =>
        prev.map((l) => {
          if (l.idInsumo !== cat.idInsumo) return l;
          const qty = l.cantidad + 1;
          return {
            ...l,
            cantidad: qty,
            subtotal: qty * l.precioUnitario,
          };
        }),
      );
      toast.success(`+1 ${cat.nombre}`);
    } else {
      const line: InsumoLine = {
        id: `${cat.idInsumo}-${Date.now()}`,
        idInsumo: cat.idInsumo,
        nombre: cat.nombre,
        cantidad: 1,
        unidadMedida: cat.unidadMedida,
        precioUnitario: cat.precioUnitario,
        subtotal: cat.precioUnitario,
      };
      setFormInsumos((prev) => [...prev, line]);
      toast.success(`${cat.nombre} agregado`);
    }
  };

  const removeInsumoLine = (id: string) => {
    setFormInsumos((prev) => prev.filter((l) => l.id !== id));
    if (editingInsumoId === id) setEditingInsumoId(null);
  };

  // ── Crear compra ──
  const handleCreate = () => {
    if (!form.idProveedor || !form.fecha) {
      toast.error("Completa ID Proveedor y Fecha");
      return;
    }
    const autoId = `COM-${String(purchases.length + 1).padStart(3, "0")}`;
    const sub = calcSubtotal(formInsumos);
    const newP: Purchase = {
      id: autoId,
      idProveedor: form.idProveedor,
      fecha: form.fecha,
      iva: formIva,
      subtotal: sub,
      total: sub + formIva,
      estado: form.estado,
      insumos: formInsumos,
    };
    setPurchases((p) => [newP, ...p]);
    setShowCreate(false);
    setForm({ idProveedor: "", fecha: "", estado: "proceso" });
    setFormIvaPercent("19");
    setFormInsumos([]);
    setEditingInsumoId(null);
    setShowInsumoList(false);
    toast.success("Compra creada exitosamente");
  };

  // ── Editar compra (cabecera) ──
  const handleEdit = () => {
    if (!editItem) return;
    if (!editItem.idProveedor || !editItem.fecha) {
      toast.error("ID Proveedor y Fecha son obligatorios");
      return;
    }
    const sub = calcSubtotal(editItem.insumos);
    const iva = editIvaManual;
    setPurchases((p) =>
      p.map((x) =>
        x.id === editItem.id
          ? {
              ...editItem,
              subtotal: sub,
              iva,
              total: sub + iva,
            }
          : x,
      ),
    );
    setEditItem(null);
    setShowEditInsumoList(false);
    setEditIvaManual(0);
    toast.success("Compra editada exitosamente");
  };

  const ESTADO_TRANSITIONS: Record<PurchaseStatus, PurchaseStatus[]> = {
    proceso:  ["enviado", "anulado"],
    enviado:  ["recibido", "anulado"],
    recibido: ["anulado"],
    anulado:  [],
  };

  const applyEstadoChange = (purchase: Purchase, nuevoEstado: PurchaseStatus) => {
    const updated = { ...purchase, estado: nuevoEstado };
    setPurchases(prev => prev.map(x => x.id === purchase.id ? updated : x));
    if (nuevoEstado === "recibido") {
      setPrevEstadoCompra(purchase.estado);
      setEditItem(updated);
      setEditIvaManual(updated.iva);
      setEditIvaPercent("19");
      setLotes({});
      setFechaEntrada("");
      setUsarLotes(false);
    } else {
      toast.success(`Estado: ${PURCHASE_STATUS_LABEL[nuevoEstado]}`);
    }
    setConfirmEstado(null);
  };

  // ── UI helpers ──
  const inputCls =
    "w-full px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const thCls =
    "px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap";
  const tdCls = "px-3 py-2 text-sm text-foreground";

  // Computed totals for create form
  const createSub = calcSubtotal(formInsumos);
  const formIva = Math.round(createSub * Number(formIvaPercent) / 100);
  const createTotal = createSub + formIva;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            Gestión Compras
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {purchases.length} compras registradas
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md text-sm"
        >
          <Plus className="w-4 h-4" /> Crear Compra
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por ID o proveedor..."
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
                  "ID Compra",
                  "Proveedor",
                  "Fecha",
                  "IVA",
                  "Subtotal",
                  "Total",
                  "Estado",
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
                    <p className="text-4xl mb-3">📭</p>
                    <p>No se encontraron compras</p>
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
                    <td className="px-4 py-3.5 text-sm text-foreground">
                      {INITIAL_SUPPLIERS.find(
                        (s) => s.id === p.idProveedor,
                      )?.nombre ?? p.idProveedor}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                      {p.fecha}
                    </td>
                    <td
                      className="px-4 py-3.5 text-sm text-foreground"
                      style={{ fontFamily: MONO }}
                    >
                      {fmtCOP(p.iva)}
                    </td>
                    <td
                      className="px-4 py-3.5 text-sm text-foreground"
                      style={{ fontFamily: MONO }}
                    >
                      {fmtCOP(p.subtotal)}
                    </td>
                    <td
                      className="px-4 py-3.5 text-sm font-bold text-foreground"
                      style={{ fontFamily: MONO }}
                    >
                      {fmtCOP(p.total)}
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={p.estado}
                        disabled={p.estado === "anulado"}
                        onChange={(e) => {
                          const nuevoEstado = e.target.value as PurchaseStatus;
                          setConfirmEstado({ purchase: p, nuevoEstado });
                        }}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 focus:outline-none ${p.estado === "anulado" ? "opacity-70 cursor-not-allowed" : "cursor-pointer"} ${PURCHASE_STATUS_COLOR[p.estado]}`}
                      >
                        <option value={p.estado}>{PURCHASE_STATUS_LABEL[p.estado]}</option>
                        {ESTADO_TRANSITIONS[p.estado].map((s) => (
                          <option key={s} value={s}>{PURCHASE_STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setDetailItem(p)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => p.estado === "proceso" && setEditItem({ ...p })}
                          disabled={p.estado !== "proceso"}
                          className={`p-1.5 rounded-lg transition-colors ${p.estado === "proceso" ? "hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer" : "text-muted-foreground/30 cursor-not-allowed"}`}
                          title={p.estado === "proceso" ? "Editar" : "Solo editable en estado En proceso"}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          disabled
                          className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed"
                          title="Las compras no se pueden eliminar"
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

      {/* ══ Modal: CREAR COMPRA ══ */}
      <AnimatePresence>
        {showCreate && (
          <WideModal onClose={() => setShowCreate(false)}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3
                className="text-lg font-bold text-foreground"
                style={{ fontFamily: SERIF }}
              >
                Crear Compra
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* ── Campos de cabecera ── */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Información de la compra
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ID Compra — automático */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      ID Compra
                    </label>
                    <div
                      className={
                        inputCls +
                        " bg-muted/60 text-muted-foreground cursor-not-allowed font-mono"
                      }
                    >
                      COM-
                      {String(purchases.length + 1).padStart(
                        3,
                        "0",
                      )}{" "}
                      (automático)
                    </div>
                  </div>
                  {/* ID Proveedor — dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      ID Proveedor *
                    </label>
                    <select
                      value={form.idProveedor}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          idProveedor: e.target.value,
                        }))
                      }
                      className={inputCls + " cursor-pointer"}
                    >
                      <option value="">
                        Selecciona un proveedor…
                      </option>
                      {INITIAL_SUPPLIERS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id} — {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Fecha — dropdown calendario */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Fecha *
                    </label>
                    <CalendarDropdown
                      value={form.fecha}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, fecha: v }))
                      }
                    />
                  </div>
                  {/* Estado */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Estado
                    </label>
                    <select
                      value={form.estado}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          estado: e.target
                            .value as PurchaseStatus,
                        }))
                      }
                      className={inputCls + " cursor-pointer"}
                    >
                      {(
                        Object.keys(
                          PURCHASE_STATUS_LABEL,
                        ) as PurchaseStatus[]
                      ).map((s) => (
                        <option key={s} value={s}>
                          {PURCHASE_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Subtotal (calculado) */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Subtotal (auto)
                    </label>
                    <div
                      className={
                        inputCls +
                        " bg-muted/60 text-muted-foreground cursor-not-allowed"
                      }
                      style={{ fontFamily: MONO }}
                    >
                      {fmtCOP(createSub)}
                    </div>
                  </div>
                  {/* IVA — select de porcentaje */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      IVA % — <span className="text-primary font-bold">{fmtCOP(formIva)}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formIvaPercent}
                        onChange={e => setFormIvaPercent(e.target.value.replace(/[^0-9.]/g,""))}
                        onKeyPress={e => { if (!/[0-9.]/.test(e.key)) e.preventDefault(); }}
                        className={inputCls}
                      />
                      <span className="text-sm font-bold text-muted-foreground shrink-0">%</span>
                    </div>
                  </div>
                  {/* Total (calculado) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Total (auto)
                    </label>
                    <div
                      className="px-3 py-2 bg-primary/10 rounded-xl border border-primary/20 text-primary font-bold text-sm"
                      style={{ fontFamily: MONO }}
                    >
                      {fmtCOP(createTotal)}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Tabla de insumos ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Insumos de la compra
                  </p>
                  <button
                    onClick={() => {
                      setInsumoSearch("");
                      setShowInsumoList(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar
                    Insumo
                  </button>
                </div>

                {formInsumos.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-xl py-8 text-center text-muted-foreground text-sm">
                    Sin insumos — haz clic en "Agregar Insumo"
                  </div>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            {[
                              "ID Insumo",
                              "Nombre",
                              "Cantidad",
                              "Unidad",
                              "Precio Unit.",
                              "Subtotal",
                              "",
                            ].map((h) => (
                              <th key={h} className={thCls}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {formInsumos.map((line) => {
                            const isEditing =
                              editingInsumoId === line.id;
                            return (
                              <tr
                                key={line.id}
                                className="hover:bg-muted/10"
                              >
                                {isEditing ? (
                                  <>
                                    <td className="px-2 py-1.5">
                                      <input
                                        value={line.idInsumo}
                                        onChange={(e) =>
                                          updateInsumo(
                                            line.id,
                                            "idInsumo",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="INS-001"
                                        className="w-24 px-2 py-1.5 bg-muted rounded-lg border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <input
                                        value={line.nombre}
                                        onChange={(e) =>
                                          updateInsumo(
                                            line.id,
                                            "nombre",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Mozzarella"
                                        className="w-28 px-2 py-1.5 bg-muted rounded-lg border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <input
                                        type="number"
                                        value={line.cantidad}
                                        onChange={(e) =>
                                          updateInsumo(
                                            line.id,
                                            "cantidad",
                                            e.target.value,
                                          )
                                        }
                                        className="w-16 px-2 py-1.5 bg-muted rounded-lg border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <select
                                        value={
                                          line.unidadMedida
                                        }
                                        onChange={(e) =>
                                          updateInsumo(
                                            line.id,
                                            "unidadMedida",
                                            e.target.value,
                                          )
                                        }
                                        className="w-16 px-1 py-1.5 bg-muted rounded-lg border border-border text-xs text-foreground focus:outline-none cursor-pointer"
                                      >
                                        {[
                                          "kg",
                                          "g",
                                          "lt",
                                          "ml",
                                          "und",
                                          "paq",
                                        ].map((u) => (
                                          <option
                                            key={u}
                                            value={u}
                                          >
                                            {u}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <input
                                        type="number"
                                        value={
                                          line.precioUnitario
                                        }
                                        onChange={(e) =>
                                          updateInsumo(
                                            line.id,
                                            "precioUnitario",
                                            e.target.value,
                                          )
                                        }
                                        className="w-24 px-2 py-1.5 bg-muted rounded-lg border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                                      />
                                    </td>
                                    <td
                                      className={
                                        tdCls +
                                        " font-semibold text-xs"
                                      }
                                      style={{
                                        fontFamily: MONO,
                                      }}
                                    >
                                      {fmtCOP(line.subtotal)}
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() =>
                                            setEditingInsumoId(
                                              null,
                                            )
                                          }
                                          className="p-1 rounded text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                          title="Confirmar"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() =>
                                            removeInsumoLine(
                                              line.id,
                                            )
                                          }
                                          className="p-1 rounded text-red-500 hover:bg-red-50 cursor-pointer"
                                          title="Eliminar"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td
                                      className={
                                        tdCls +
                                        " font-mono text-xs"
                                      }
                                    >
                                      {line.idInsumo || "—"}
                                    </td>
                                    <td
                                      className={
                                        tdCls + " text-xs"
                                      }
                                    >
                                      {line.nombre || "—"}
                                    </td>
                                    <td
                                      className={
                                        tdCls + " text-xs"
                                      }
                                    >
                                      {line.cantidad}
                                    </td>
                                    <td
                                      className={
                                        tdCls + " text-xs"
                                      }
                                    >
                                      {line.unidadMedida}
                                    </td>
                                    <td
                                      className={
                                        tdCls + " text-xs"
                                      }
                                      style={{
                                        fontFamily: MONO,
                                      }}
                                    >
                                      {fmtCOP(
                                        line.precioUnitario,
                                      )}
                                    </td>
                                    <td
                                      className={
                                        tdCls +
                                        " font-semibold text-xs"
                                      }
                                      style={{
                                        fontFamily: MONO,
                                      }}
                                    >
                                      {fmtCOP(line.subtotal)}
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() =>
                                            setEditingInsumoId(
                                              line.id,
                                            )
                                          }
                                          className="p-1 rounded text-muted-foreground hover:bg-muted cursor-pointer"
                                          title="Editar"
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() =>
                                            removeInsumoLine(
                                              line.id,
                                            )
                                          }
                                          className="p-1 rounded text-red-500 hover:bg-red-50 cursor-pointer"
                                          title="Eliminar"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            {/* ── Listado de insumos para seleccionar ── */}
            {showInsumoList && (
              <div className="mx-6 mb-4 border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Selecciona un insumo
                  </p>
                  <button
                    onClick={() => setShowInsumoList(false)}
                    className="p-1 rounded hover:bg-muted cursor-pointer text-muted-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-3 py-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      value={insumoSearch}
                      onChange={(e) =>
                        setInsumoSearch(e.target.value)
                      }
                      placeholder="Buscar insumo..."
                      className="w-full pl-8 pr-3 py-2 bg-muted rounded-lg border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {CATALOGO_INSUMOS.filter(
                    (c) =>
                      c.nombre
                        .toLowerCase()
                        .includes(insumoSearch.toLowerCase()) ||
                      c.idInsumo
                        .toLowerCase()
                        .includes(insumoSearch.toLowerCase()),
                  ).map((cat) => (
                    <button
                      key={cat.idInsumo}
                      onClick={() => {
                        addInsumoFromCatalog(cat);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/60 transition-colors cursor-pointer text-left border-b border-border last:border-0"
                    >
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {cat.nombre}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {cat.idInsumo} · {cat.unidadMedida}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary font-mono">{`$${cat.precioUnitario.toLocaleString("es-CO")}`}</span>
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <Plus className="w-3.5 h-3.5 text-primary" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setFormInsumos([]);
                  setForm({
                    idProveedor: "",
                    fecha: "",
                    estado: "proceso",
                  });
                  setFormIvaPercent("19");
                  setShowInsumoList(false);
                }}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
              >
                Crear Compra
              </button>
            </div>
          </WideModal>
        )}
      </AnimatePresence>

      {/* ══ Modal: EDITAR COMPRA (mismo formulario que crear) ══ */}
      <AnimatePresence>
        {editItem && (
          <WideModal
            onClose={() => {
              setEditItem(null);
              setShowEditInsumoList(false);
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3
                className="text-lg font-bold text-foreground"
                style={{ fontFamily: SERIF }}
              >
                Editar Compra — {editItem.id}
              </h3>
              <button
                onClick={() => {
                  setEditItem(null);
                  setShowEditInsumoList(false);
                }}
                className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* ── Campos de cabecera ── */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Información de la compra
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ID Compra (solo lectura) */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      ID Compra
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
                  {/* ID Proveedor */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Proveedor</label>
                    {editItem.estado === "recibido" ? (
                      <div className={inputCls + " bg-muted/60 text-muted-foreground cursor-not-allowed"}>
                        {INITIAL_SUPPLIERS.find(s => s.id === editItem.idProveedor)?.nombre ?? editItem.idProveedor}
                      </div>
                    ) : (
                      <select value={editItem.idProveedor}
                        onChange={e => setEditItem(x => x && { ...x, idProveedor: e.target.value })}
                        className={inputCls + " cursor-pointer"}>
                        <option value="">Selecciona un proveedor…</option>
                        {INITIAL_SUPPLIERS.map(s => <option key={s.id} value={s.id}>{s.id} — {s.nombre}</option>)}
                      </select>
                    )}
                  </div>
                  {/* Fecha */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha</label>
                    {editItem.estado === "recibido" ? (
                      <div className={inputCls + " bg-muted/60 text-muted-foreground cursor-not-allowed"}>{editItem.fecha}</div>
                    ) : (
                      <CalendarDropdown value={editItem.fecha} onChange={v => setEditItem(x => x && { ...x, fecha: v })} />
                    )}
                  </div>
                  {/* Estado */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                    <select value={editItem.estado}
                      onChange={e => setEditItem(x => x && { ...x, estado: e.target.value as PurchaseStatus })}
                      className={inputCls + " cursor-pointer"}>
                      {(Object.keys(PURCHASE_STATUS_LABEL) as PurchaseStatus[]).map(s => (
                        <option key={s} value={s}>{PURCHASE_STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </div>
                  {/* Subtotal calculado */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Subtotal (auto)
                    </label>
                    <div
                      className={
                        inputCls +
                        " bg-muted/60 text-muted-foreground cursor-not-allowed"
                      }
                      style={{ fontFamily: MONO }}
                    >
                      {fmtCOP(calcSubtotal(editItem.insumos))}
                    </div>
                  </div>
                  {/* IVA — número directo */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      IVA % — <span className="text-primary font-bold">{fmtCOP(Math.round(calcSubtotal(editItem.insumos) * Number(editIvaPercent) / 100))}</span>
                    </label>
                    <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={editIvaPercent}
                      onChange={e => { setEditIvaPercent(e.target.value.replace(/[^0-9.]/g,"")); setEditIvaManual(Math.round(calcSubtotal(editItem.insumos) * Number(e.target.value) / 100)); }}
                      onKeyPress={e => { if (!/[0-9.]/.test(e.key)) e.preventDefault(); }}
                      className={inputCls}
                    />
                    <span className="text-sm font-bold text-muted-foreground shrink-0">%</span>
                    </div>
                  </div>
                  {/* Total */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Total (auto)
                    </label>
                    <div
                      className="px-3 py-2 bg-primary/10 rounded-xl border border-primary/20 text-primary font-bold text-sm"
                      style={{ fontFamily: MONO }}
                    >
                      {fmtCOP(calcSubtotal(editItem.insumos) + Math.round(calcSubtotal(editItem.insumos) * Number(editIvaPercent) / 100))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Tabla de insumos ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Insumos de la compra
                  </p>
                  <button
                    onClick={() => {
                      setEditInsumoSearch("");
                      setShowEditInsumoList(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar
                    Insumo
                  </button>
                </div>

                {editItem.insumos.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-xl py-8 text-center text-muted-foreground text-sm">
                    Sin insumos — haz clic en "Agregar Insumo"
                  </div>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            {[
                              "ID Insumo",
                              "Nombre",
                              "Cantidad",
                              "Unidad",
                              "Precio Unit.",
                              "Subtotal",
                              "",
                            ].map((h) => (
                              <th key={h} className={thCls}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {editItem.insumos.map((line) => {
                            const isEditing =
                              editingEditInsumoId === line.id;
                            const updateLine = (
                              field: keyof InsumoLine,
                              raw: string,
                            ) => {
                              setEditItem((x) => {
                                if (!x) return null;
                                const insumos = x.insumos.map(
                                  (l) => {
                                    if (l.id !== line.id)
                                      return l;
                                    const up = {
                                      ...l,
                                      [field]: [
                                        "cantidad",
                                        "precioUnitario",
                                      ].includes(field)
                                        ? Number(raw)
                                        : raw,
                                    };
                                    up.subtotal =
                                      up.cantidad *
                                      up.precioUnitario;
                                    return up;
                                  },
                                );
                                const sub = insumos.reduce(
                                  (s, l) => s + l.subtotal,
                                  0,
                                );
                                return {
                                  ...x,
                                  insumos,
                                  subtotal: sub,
                                  iva: calcIva(sub),
                                  total: sub + calcIva(sub),
                                };
                              });
                            };
                            const removeLine = () => {
                              setEditItem((x) => {
                                if (!x) return null;
                                const insumos =
                                  x.insumos.filter(
                                    (l) => l.id !== line.id,
                                  );
                                const sub = insumos.reduce(
                                  (s, l) => s + l.subtotal,
                                  0,
                                );
                                return {
                                  ...x,
                                  insumos,
                                  subtotal: sub,
                                  iva: calcIva(sub),
                                  total: sub + calcIva(sub),
                                };
                              });
                              if (
                                editingEditInsumoId === line.id
                              )
                                setEditingEditInsumoId(null);
                            };
                            return (
                              <tr
                                key={line.id}
                                className="hover:bg-muted/10"
                              >
                                {isEditing ? (
                                  <>
                                    <td className="px-2 py-1.5">
                                      <input
                                        value={line.idInsumo}
                                        onChange={(e) =>
                                          updateLine(
                                            "idInsumo",
                                            e.target.value,
                                          )
                                        }
                                        className="w-20 px-2 py-1.5 bg-muted rounded-lg border border-border text-xs text-foreground focus:outline-none"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <input
                                        value={line.nombre}
                                        onChange={(e) =>
                                          updateLine(
                                            "nombre",
                                            e.target.value,
                                          )
                                        }
                                        className="w-28 px-2 py-1.5 bg-muted rounded-lg border border-border text-xs text-foreground focus:outline-none"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <input
                                        type="number"
                                        value={line.cantidad}
                                        onChange={(e) =>
                                          updateLine(
                                            "cantidad",
                                            e.target.value,
                                          )
                                        }
                                        className="w-16 px-2 py-1.5 bg-muted rounded-lg border border-border text-xs text-foreground focus:outline-none"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <select
                                        value={
                                          line.unidadMedida
                                        }
                                        onChange={(e) =>
                                          updateLine(
                                            "unidadMedida",
                                            e.target.value,
                                          )
                                        }
                                        className="w-16 px-1 py-1.5 bg-muted rounded-lg border border-border text-xs text-foreground focus:outline-none cursor-pointer"
                                      >
                                        {[
                                          "kg",
                                          "g",
                                          "lt",
                                          "ml",
                                          "und",
                                          "paq",
                                        ].map((u) => (
                                          <option
                                            key={u}
                                            value={u}
                                          >
                                            {u}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <input
                                        type="number"
                                        value={
                                          line.precioUnitario
                                        }
                                        onChange={(e) =>
                                          updateLine(
                                            "precioUnitario",
                                            e.target.value,
                                          )
                                        }
                                        className="w-24 px-2 py-1.5 bg-muted rounded-lg border border-border text-xs text-foreground focus:outline-none"
                                      />
                                    </td>
                                    <td
                                      className={
                                        tdCls +
                                        " font-semibold text-xs"
                                      }
                                      style={{
                                        fontFamily: MONO,
                                      }}
                                    >
                                      {fmtCOP(line.subtotal)}
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() =>
                                            setEditingEditInsumoId(
                                              null,
                                            )
                                          }
                                          className="p-1 rounded text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={removeLine}
                                          className="p-1 rounded text-red-500 hover:bg-red-50 cursor-pointer"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td
                                      className={
                                        tdCls +
                                        " font-mono text-xs"
                                      }
                                    >
                                      {line.idInsumo || "—"}
                                    </td>
                                    <td
                                      className={
                                        tdCls + " text-xs"
                                      }
                                    >
                                      {line.nombre || "—"}
                                    </td>
                                    <td
                                      className={
                                        tdCls + " text-xs"
                                      }
                                    >
                                      {line.cantidad}
                                    </td>
                                    <td
                                      className={
                                        tdCls + " text-xs"
                                      }
                                    >
                                      {line.unidadMedida}
                                    </td>
                                    <td
                                      className={
                                        tdCls + " text-xs"
                                      }
                                      style={{
                                        fontFamily: MONO,
                                      }}
                                    >
                                      {fmtCOP(
                                        line.precioUnitario,
                                      )}
                                    </td>
                                    <td
                                      className={
                                        tdCls +
                                        " font-semibold text-xs"
                                      }
                                      style={{
                                        fontFamily: MONO,
                                      }}
                                    >
                                      {fmtCOP(line.subtotal)}
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() =>
                                            setEditingEditInsumoId(
                                              line.id,
                                            )
                                          }
                                          className="p-1 rounded text-muted-foreground hover:bg-muted cursor-pointer"
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={removeLine}
                                          className="p-1 rounded text-red-500 hover:bg-red-50 cursor-pointer"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Catálogo de insumos para editar */}
                {showEditInsumoList && (
                  <div className="mt-3 border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Selecciona un insumo
                      </p>
                      <button
                        onClick={() =>
                          setShowEditInsumoList(false)
                        }
                        className="p-1 rounded hover:bg-muted cursor-pointer text-muted-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="px-3 py-2 border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          value={editInsumoSearch}
                          onChange={(e) =>
                            setEditInsumoSearch(e.target.value)
                          }
                          placeholder="Buscar insumo..."
                          className="w-full pl-8 pr-3 py-2 bg-muted rounded-lg border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      </div>
                    </div>
                    <div className="max-h-44 overflow-y-auto">
                      {CATALOGO_INSUMOS.filter(
                        (c) =>
                          c.nombre
                            .toLowerCase()
                            .includes(
                              editInsumoSearch.toLowerCase(),
                            ) ||
                          c.idInsumo
                            .toLowerCase()
                            .includes(
                              editInsumoSearch.toLowerCase(),
                            ),
                      ).map((cat) => (
                        <button
                          key={cat.idInsumo}
                          onClick={() => {
                            setEditItem((x) => {
                              if (!x) return null;
                              const existing = x.insumos.find(
                                (l) =>
                                  l.idInsumo === cat.idInsumo,
                              );
                              let insumos: InsumoLine[];
                              if (existing) {
                                insumos = x.insumos.map((l) =>
                                  l.idInsumo === cat.idInsumo
                                    ? {
                                        ...l,
                                        cantidad:
                                          l.cantidad + 1,
                                        subtotal:
                                          (l.cantidad + 1) *
                                          l.precioUnitario,
                                      }
                                    : l,
                                );
                              } else {
                                insumos = [
                                  ...x.insumos,
                                  {
                                    id: `${cat.idInsumo}-${Date.now()}`,
                                    idInsumo: cat.idInsumo,
                                    nombre: cat.nombre,
                                    cantidad: 1,
                                    unidadMedida:
                                      cat.unidadMedida,
                                    precioUnitario:
                                      cat.precioUnitario,
                                    subtotal:
                                      cat.precioUnitario,
                                  },
                                ];
                              }
                              const sub = insumos.reduce(
                                (s, l) => s + l.subtotal,
                                0,
                              );
                              return {
                                ...x,
                                insumos,
                                subtotal: sub,
                                iva: calcIva(sub),
                                total: sub + calcIva(sub),
                              };
                            });
                            toast.success(
                              `${cat.nombre} agregado`,
                            );
                          }}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/60 transition-colors cursor-pointer text-left border-b border-border last:border-0"
                        >
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              {cat.nombre}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {cat.idInsumo} ·{" "}
                              {cat.unidadMedida}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-primary font-mono">{`$${cat.precioUnitario.toLocaleString("es-CO")}`}</span>
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <Plus className="w-3.5 h-3.5 text-primary" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Sección Vencimientos (solo estado Recibido) ── */}
            {editItem.estado === "recibido" && (
              <div className="px-6 py-5 border-t border-border space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      if (!usarLotes) {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        const defaultVenc = d.toISOString().split("T")[0];
                        const init: Record<string, { id: string; cantidad: number; fechaVenc: string }[]> = {};
                        editItem.insumos.forEach(ins => {
                          init[ins.idInsumo] = [{ id: "L-01", cantidad: ins.cantidad, fechaVenc: defaultVenc }];
                        });
                        setLotes(init);
                      } else {
                        setLotes({});
                      }
                      setUsarLotes(p => !p);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      usarLotes
                        ? "bg-primary text-white border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {usarLotes ? "✓ Usar lotes" : "Usar lotes"}
                  </button>
                  {usarLotes && (
                    <>
                      <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <span>📦</span> Vencimientos (Solo Estado Recibido)
                      </p>
                      <div className="ml-auto flex items-center gap-2">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Fecha de entrada
                        </label>
                        <input
                          type="date"
                          value={fechaEntrada}
                          onChange={(e) => setFechaEntrada(e.target.value)}
                          className="px-2.5 py-1.5 bg-muted rounded-lg border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      </div>
                    </>
                  )}
                </div>

                {usarLotes && editItem.insumos.map((ins) => {
                  const insLotes = lotes[ins.idInsumo] ?? [];
                  const totalAsignado = insLotes.reduce(
                    (s, l) => s + l.cantidad,
                    0,
                  );
                  const totalRecibido = ins.cantidad;
                  const today = new Date();

                  const addLote = () => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    const defaultVenc = d.toISOString().split("T")[0];
                    const newLote = {
                      id: `L-${String((lotes[ins.idInsumo]?.length ?? 0) + 1).padStart(2, "0")}`,
                      cantidad: ins.cantidad,
                      fechaVenc: defaultVenc,
                    };
                    setLotes((prev) => ({
                      ...prev,
                      [ins.idInsumo]: [
                        ...(prev[ins.idInsumo] ?? []),
                        newLote,
                      ],
                    }));
                  };
                  const updateLote = (
                    id: string,
                    field: "cantidad" | "fechaVenc",
                    val: string,
                  ) => {
                    setLotes((prev) => ({
                      ...prev,
                      [ins.idInsumo]: (
                        prev[ins.idInsumo] ?? []
                      ).map((l) =>
                        l.id === id
                          ? {
                              ...l,
                              [field]:
                                field === "cantidad"
                                  ? Math.max(0, Number(val))
                                  : val,
                            }
                          : l,
                      ),
                    }));
                  };
                  const removeLote = (id: string) => {
                    setLotes((prev) => ({
                      ...prev,
                      [ins.idInsumo]: (
                        prev[ins.idInsumo] ?? []
                      ).filter((l) => l.id !== id),
                    }));
                  };

                  const diasHastaVenc = (fecha: string) => {
                    if (!fecha) return null;
                    const diff =
                      new Date(fecha).getTime() -
                      today.getTime();
                    return Math.ceil(
                      diff / (1000 * 60 * 60 * 24),
                    );
                  };

                  return (
                    <div
                      key={ins.idInsumo}
                      className="border border-border rounded-xl overflow-hidden"
                    >
                      {/* Header insumo */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50">
                        <span className="text-sm font-semibold text-foreground">
                          📦 {ins.idInsumo} — {ins.nombre}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          Recibido: {totalRecibido}{" "}
                          {ins.unidadMedida}
                        </span>
                      </div>

                      {/* Tabla lotes */}
                      {insLotes.length > 0 && (
                        <div className="px-4 py-2">
                          <div className="grid grid-cols-[60px_1fr_1fr_32px] gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1">
                            <span>Lote</span>
                            <span>
                              Cantidad ({ins.unidadMedida})
                            </span>
                            <span>Fecha Vencimiento</span>
                            <span></span>
                          </div>
                          {insLotes.map((l) => (
                            <div
                              key={l.id}
                              className="grid grid-cols-[60px_1fr_1fr_32px] gap-2 items-center mb-1.5"
                            >
                              <span className="text-xs font-mono font-semibold text-muted-foreground">
                                {l.id}
                              </span>
                              <input
                                type="number"
                                min={0}
                                value={l.cantidad}
                                onChange={(e) =>
                                  updateLote(
                                    l.id,
                                    "cantidad",
                                    e.target.value,
                                  )
                                }
                                onKeyPress={(e) => {
                                  if (!/[0-9]/.test(e.key))
                                    e.preventDefault();
                                }}
                                className="px-2 py-1.5 bg-muted rounded-lg border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                              />
                              <input
                                type="date"
                                value={l.fechaVenc}
                                onChange={(e) =>
                                  updateLote(
                                    l.id,
                                    "fechaVenc",
                                    e.target.value,
                                  )
                                }
                                className="px-2 py-1.5 bg-muted rounded-lg border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                              />
                              <button
                                onClick={() => removeLote(l.id)}
                                className="text-muted-foreground hover:text-red-500 cursor-pointer flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Agregar lote + resumen */}
                      <div className="px-4 pb-3 space-y-2">
                        <button
                          onClick={addLote}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-border rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />{" "}
                          Agregar lote
                        </button>
                        {insLotes.length > 0 && (
                          <p className="text-xs text-muted-foreground font-mono">
                            {insLotes
                              .map((l) => l.cantidad)
                              .join(" + ")}{" "}
                            = {totalAsignado} / {totalRecibido}
                            {ins.unidadMedida} asignados
                          </p>
                        )}
                        {/* Alertas de vencimiento */}
                        {insLotes.some((l) => l.fechaVenc) && (
                          <div className="flex items-start gap-1.5 px-2.5 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                            <span className="text-amber-500 text-xs mt-0.5">
                              ⚠
                            </span>
                            <p className="text-xs text-amber-700 leading-relaxed">
                              {insLotes
                                .filter((l) => l.fechaVenc)
                                .map((l) => {
                                  const dias = diasHastaVenc(
                                    l.fechaVenc,
                                  );
                                  return dias !== null
                                    ? `${l.id} (${l.cantidad} ${ins.unidadMedida}) vence en ${dias} día${dias !== 1 ? "s" : ""}`
                                    : null;
                                })
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}

            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => {
                  if (editItem.estado === "recibido") {
                    setPurchases(prev => prev.map(x => x.id === editItem.id ? { ...x, estado: prevEstadoCompra } : x));
                  }
                  setEditItem(null);
                  setShowEditInsumoList(false);
                  setUsarLotes(false);
                }}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEdit}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
              >
                {editItem.estado === "recibido"
                  ? "Guardar vencimientos"
                  : "Guardar Cambios"}
              </button>
            </div>
          </WideModal>
        )}
      </AnimatePresence>

      {/* ══ Modal: VER DETALLE ══ */}
      <AnimatePresence>
        {detailItem && (
          <WideModal onClose={() => setDetailItem(null)}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3
                className="text-lg font-bold text-foreground"
                style={{ fontFamily: SERIF }}
              >
                Detalle Compra — {detailItem.id}
              </h3>
              <button
                onClick={() => setDetailItem(null)}
                className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Campos resumen */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Información de la compra
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: "ID Compra",
                      value: detailItem.id,
                      mono: true,
                    },
                    {
                      label: "ID Proveedor",
                      value: detailItem.idProveedor,
                      mono: true,
                    },
                    {
                      label: "Fecha",
                      value: detailItem.fecha,
                      mono: false,
                    },
                    {
                      label: "Estado",
                      value:
                        PURCHASE_STATUS_LABEL[
                          detailItem.estado
                        ],
                      mono: false,
                    },
                    {
                      label: "Subtotal",
                      value: fmtCOP(detailItem.subtotal),
                      mono: true,
                    },
                    {
                      label: "IVA (19%)",
                      value: fmtCOP(detailItem.iva),
                      mono: true,
                    },
                    {
                      label: "Total",
                      value: fmtCOP(detailItem.total),
                      mono: true,
                    },
                  ].map(({ label, value, mono }) => (
                    <div
                      key={label}
                      className="bg-muted/40 rounded-xl px-4 py-3"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                        {label}
                      </p>
                      <p
                        className={`text-sm font-semibold text-foreground ${mono ? "font-mono" : ""}`}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabla insumos */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Insumos ({detailItem.insumos.length})
                </p>
                {detailItem.insumos.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-xl py-8 text-center text-muted-foreground text-sm">
                    Esta compra no tiene insumos registrados
                  </div>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            {[
                              "ID Insumo",
                              "Nombre",
                              "Cantidad",
                              "Unidad",
                              "Precio Unit.",
                              "Subtotal",
                            ].map((h) => (
                              <th key={h} className={thCls}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {detailItem.insumos.map((line) => (
                            <tr
                              key={line.id}
                              className="hover:bg-muted/10"
                            >
                              <td
                                className={
                                  tdCls + " font-mono text-xs"
                                }
                              >
                                {line.idInsumo}
                              </td>
                              <td
                                className={
                                  tdCls + " text-xs font-medium"
                                }
                              >
                                {line.nombre}
                              </td>
                              <td
                                className={tdCls + " text-xs"}
                              >
                                {line.cantidad}
                              </td>
                              <td
                                className={tdCls + " text-xs"}
                              >
                                {line.unidadMedida}
                              </td>
                              <td
                                className={tdCls + " text-xs"}
                                style={{ fontFamily: MONO }}
                              >
                                {fmtCOP(line.precioUnitario)}
                              </td>
                              <td
                                className={
                                  tdCls + " text-xs font-bold"
                                }
                                style={{ fontFamily: MONO }}
                              >
                                {fmtCOP(line.subtotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/30 border-t border-border">
                          <tr>
                            <td
                              colSpan={5}
                              className="px-3 py-2 text-xs font-bold text-right text-muted-foreground uppercase tracking-wider"
                            >
                              Total
                            </td>
                            <td
                              className="px-3 py-2 text-sm font-bold text-primary"
                              style={{ fontFamily: MONO }}
                            >
                              {fmtCOP(detailItem.total)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lotes en detalle (solo Recibido) */}
            {detailItem.estado === "recibido" && Object.keys(lotes).length > 0 && (
              <div className="px-6 py-4 border-t border-border space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <span>📦</span> Lotes registrados
                  {fechaEntrada && <span className="ml-2 text-muted-foreground font-normal normal-case">· Fecha entrada: {fechaEntrada}</span>}
                </p>
                {detailItem.insumos.map(ins => {
                  const insLotes = lotes[ins.idInsumo] ?? [];
                  if (!insLotes.length) return null;
                  return (
                    <div key={ins.idInsumo} className="border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
                        <span className="text-xs font-semibold text-foreground">{ins.idInsumo} — {ins.nombre}</span>
                        <span className="text-xs text-muted-foreground">Total: {insLotes.reduce((s,l)=>s+l.cantidad,0)} {ins.unidadMedida}</span>
                      </div>
                      <div className="divide-y divide-border">
                        {insLotes.map(l => (
                          <div key={l.id} className="flex items-center justify-between px-4 py-2 text-xs">
                            <span className="font-mono font-semibold text-muted-foreground">{l.id}</span>
                            <span className="text-foreground">{l.cantidad} {ins.unidadMedida}</span>
                            <span className="text-muted-foreground">{l.fechaVenc || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="px-6 py-4 border-t border-border">
              <button
                onClick={() => setDetailItem(null)}
                className="w-full py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </WideModal>
        )}
      </AnimatePresence>

      {/* ── Modal: Confirmar cambio de estado ── */}
      <AnimatePresence>
        {confirmEstado && (
          <ConfirmModal
            title="Cambiar estado"
            message={`¿Deseas cambiar el estado de la compra ${confirmEstado.purchase.id} a "${PURCHASE_STATUS_LABEL[confirmEstado.nuevoEstado]}"?`}
            onConfirm={() => applyEstadoChange(confirmEstado.purchase, confirmEstado.nuevoEstado)}
            onCancel={() => setConfirmEstado(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
