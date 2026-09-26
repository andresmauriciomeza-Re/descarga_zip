import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Eye, X, ArrowLeft, ChevronLeft, ChevronRight,
  FileDown, Plus, Check, Ban, CheckCircle2, Lock,
} from "lucide-react";
import { toast } from "sonner";
import type { Insumo } from "./GestionInsumosScreen";
import { CompactInsumoForm, UNIDADES } from "../components/CompactInsumoForm";
import { InsumosSolicitadosTable } from "../components/InsumosSolicitadosTable";
import {
  NuevoProveedorModal,
  ConfirmModal,
  FORM_MAXW,
  type GestionCompra,
  type OrdenCompra,
  type EstadoGestion,
  type EstadoOrden,
  type ProveedorRef,
} from "./OrdenCompraScreen";

const SERIF = "'DM Serif Display', serif";
const PER_PAGE = 5;

const ESTADO_CONFIG: Record<EstadoGestion, string> = {
  "Recibido":   "bg-emerald-100 text-emerald-800",
  "Anulado":    "bg-red-100 text-red-800",
};

/** Badge de estado, con el mismo estilo que el detalle de Orden de Compra. */
function EstadoBadge({ e }: { e: EstadoGestion }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ESTADO_CONFIG[e]}`}>
      {e}
    </span>
  );
}

function fmtCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

// ─── NUEVA COMPRA ─────────────────────────────────────────────────────────────

const iCls =
  "w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const sCls = `${iCls} appearance-none`;

// Anchos compactos de los campos superiores, en línea con el detalle de Orden de Compra
const campoCortoCls = "max-w-[180px]"; // Fecha de factura · Estado
const campoMedioCls = "max-w-[240px]"; // Número de factura
const campoLargoCls = "max-w-xs"; // Proveedor (búsqueda)

type ItemFactura = {
  rowId: string;
  idInsumo: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
};

export interface NuevaCompraData {
  proveedor: string;
  numeroFactura: string;
  fechaFactura: string;
  valorTotal: number;
  estado: EstadoGestion;
  items: ItemFactura[];
}

function CompraForm({
  proveedores,
  setProveedores,
  insumos,
  mode = "create",
  compra,
  fullPage = false,
  onClose,
  onGuardar,
}: {
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  insumos: Insumo[];
  mode?: "create" | "view";
  compra?: GestionCompra;
  fullPage?: boolean;
  onClose: () => void;
  onGuardar: (data: NuevaCompraData) => void;
}) {
  const isView = mode === "view";
  const isPage = fullPage;
  const today = new Date().toISOString().slice(0, 10);

  const [numeroFactura, setNumeroFactura] = useState(compra?.numeroFactura ?? "");
  const [fechaFactura, setFechaFactura] = useState(compra?.fechaFactura || today);
  const [estado, setEstado] = useState<EstadoGestion>(compra?.estado ?? "Recibido");
  const [items, setItems] = useState<ItemFactura[]>(compra?.items ?? []);

  const [itemNombre, setItemNombre] = useState("");
  const [itemCantidad, setItemCantidad] = useState(1);
  const [itemUnidad, setItemUnidad] = useState(UNIDADES[0]);
  const [itemPrecio, setItemPrecio] = useState(0);
  const [itemId, setItemId] = useState("");
  const [itemSugAbierto, setItemSugAbierto] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const [provQuery, setProvQuery] = useState(compra?.proveedor ?? proveedores[0]?.nombre ?? "");
  const [provSugAbierto, setProvSugAbierto] = useState(false);
  const [mostrarNuevoProveedor, setMostrarNuevoProveedor] = useState(false);
  const provRef = useRef<HTMLDivElement>(null);

  // ── Validación en tiempo real (patrón de MiPerfilScreen) ──────────────────
  const [tocado, setTocado] = useState({ numeroFactura: false, fechaFactura: false });
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  const errorNumeroFactura = numeroFactura.trim()
    ? undefined
    : "Ingresa el número de factura.";
  const errorFechaFactura = fechaFactura ? undefined : "Selecciona la fecha de la factura.";
  // El proveedor es opcional en este formulario.
  const errorItems = items.length > 0 ? undefined : "Agrega al menos un insumo a la factura.";

  const algunoTocado = tocado.numeroFactura || tocado.fechaFactura;
  const marcarTocado = (campo: "numeroFactura" | "fechaFactura") =>
    setTocado((t) => ({ ...t, [campo]: true }));

  /** Clase del input: resalta en rojo cuando el campo visible es inválido. */
  const campoCls = (error?: string) =>
    `${iCls} transition-colors ${
      error ? "border-red-400 focus:ring-red-300" : ""
    }`;

  const provSugs = useMemo(() => {
    const q = provQuery.trim().toLowerCase();
    const base = q
      ? proveedores.filter((p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.nit.toLowerCase().includes(q) ||
          p.asesorComercial.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
        )
      : proveedores;
    return base.slice(0, 6);
  }, [proveedores, provQuery]);

  const itemSugs = useMemo(
    () =>
      itemNombre.trim().length >= 1
        ? insumos
            .filter((i) => i.nombre.toLowerCase().includes(itemNombre.toLowerCase()))
            .slice(0, 6)
        : [],
    [insumos, itemNombre]
  );

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setItemSugAbierto(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (provRef.current && !provRef.current.contains(e.target as Node)) {
        setProvSugAbierto(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const total = items.reduce((s, item) => s + item.cantidad * item.precioUnitario, 0);

  // Requiere al menos un insumo y que el total sea mayor que cero.
  const errorTotal = total > 0 ? undefined : "El total de la factura debe ser mayor que cero.";
  const formValido =
    !errorNumeroFactura && !errorFechaFactura && !errorItems && !errorTotal;

  const seleccionarProveedor = (p: ProveedorRef) => {
    setProvQuery(p.nombre);
    setProvSugAbierto(false);
  };

  const crearProveedor = (p: ProveedorRef) => {
    if (!proveedores.some((x) => x.nombre.toLowerCase() === p.nombre.toLowerCase())) {
      setProveedores((prev) => [...prev, p]);
    }
    setProvQuery(p.nombre);
    setMostrarNuevoProveedor(false);
    toast.success(`Proveedor "${p.nombre}" creado`);
  };

  const seleccionarInsumo = (ins: Insumo) => {
    setItemId(ins.id);
    setItemNombre(ins.nombre);
    setItemUnidad(UNIDADES.includes(ins.unidadMedida) ? ins.unidadMedida : UNIDADES[0]);
    setItemPrecio(ins.precioUnitario);
    setItemSugAbierto(false);
  };

  const agregarItem = () => {
    if (!itemNombre.trim()) {
      toast.error("Ingresa el nombre del insumo.");
      return;
    }
    if (itemCantidad <= 0) {
      toast.error("La cantidad debe ser mayor que cero.");
      return;
    }
    if (itemPrecio < 0) {
      toast.error("El precio unitario no puede ser negativo.");
      return;
    }
    if (items.some((item) => item.nombre.toLowerCase() === itemNombre.trim().toLowerCase())) {
      toast.error("Este insumo ya fue agregado a la factura.");
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        rowId: `fact-${Date.now()}`,
        idInsumo: itemId || `INS-FAC-${Date.now()}`,
        nombre: itemNombre.trim(),
        unidad: itemUnidad,
        cantidad: itemCantidad,
        precioUnitario: itemPrecio,
      },
    ]);

    setItemNombre("");
    setItemCantidad(1);
    setItemPrecio(0);
    setItemId("");
    setItemSugAbierto(false);
  };

  const eliminarItem = (rowId: string) => {
    setItems((prev) => prev.filter((item) => item.rowId !== rowId));
  };

  const actualizarItem = (
    rowId: string,
    patch: Partial<ItemFactura>
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.rowId === rowId ? { ...item, ...patch } : item))
    );
  };

  const guardar = () => {
    setIntentoGuardar(true);

    if (!numeroFactura.trim()) {
      toast.error("Ingresa el número de factura.");
      return;
    }
    if (!fechaFactura) {
      toast.error("Selecciona la fecha de la factura.");
      return;
    }
    // El proveedor es opcional: si se escribió, se usa; si no, queda vacío.
    if (items.length === 0) {
      toast.error("Agrega al menos un insumo recibido.");
      return;
    }
    if (total <= 0) {
      toast.error("El total recibido debe ser mayor que cero.");
      return;
    }

    onGuardar({
      proveedor: provQuery.trim(),
      numeroFactura: numeroFactura.trim(),
      fechaFactura,
      valorTotal: total,
      estado,
      items: items.map((item) => ({ ...item })),
    });
  };

  return (
    <>
      <div
        className={
          isPage
            ? `w-full p-6 ${FORM_MAXW} mx-auto h-full flex flex-col`
            : "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-hidden"
        }
      >
        <div
          className={
            isPage
              ? "w-full h-full flex flex-col"
              : "h-full flex items-center justify-center p-4"
          }
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`flex flex-col w-full ${FORM_MAXW}${
              isPage
                ? "h-full"
                : " max-h-[calc(100dvh-2rem)] bg-card rounded-2xl shadow-2xl border border-border my-4"
            }`}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="text-base font-bold text-foreground" style={{ fontFamily: SERIF }}>
                  {isView ? "Detalle de Compra" : "Nueva Compra"}
                </h3>
                {isView && compra && (
                  <p className="text-xs text-muted-foreground mt-0.5">Compra {compra.id}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isView && compra && <EstadoBadge e={compra.estado} />}
                {isPage ? (
                  <button
                    onClick={onClose}
                    title="Volver"
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div
              className={
                isPage
                  ? "flex-1 min-h-0 px-5 py-4 flex flex-col gap-4 overflow-hidden"
                  : "flex-1 min-h-0 px-5 py-5 space-y-5 overflow-y-auto"
              }
            >
              {/* Banners de estado */}
              {isView && compra?.estado === "Recibido" && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Compra registrada. Recibida el <strong className="ml-1">{compra.fechaFactura}</strong>.
                </div>
              )}
              {isView && compra?.estado === "Anulado" && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                  <Ban className="w-4 h-4 shrink-0" />
                  Esta compra ha sido anulada.
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 shrink-0">
                <div className={campoMedioCls}>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Número de factura {!isView && <span className="text-red-500">*</span>}
                  </label>
                  {isView ? (
                    <p className="text-sm font-semibold text-foreground py-2">{numeroFactura || "—"}</p>
                  ) : (
                    <input
                      value={numeroFactura}
                      onChange={(e) => setNumeroFactura(e.target.value)}
                      onBlur={() => marcarTocado("numeroFactura")}
                      placeholder="Ej: FAC-2026-0001"
                      className={campoCls(
                        (tocado.numeroFactura || intentoGuardar) ? errorNumeroFactura : undefined
                      )}
                      aria-invalid={!!((tocado.numeroFactura || intentoGuardar) && errorNumeroFactura)}
                      autoFocus
                    />
                  )}
                  {!isView && (tocado.numeroFactura || intentoGuardar) && errorNumeroFactura && (
                    <p className="text-xs text-red-500 mt-1 ml-0.5">{errorNumeroFactura}</p>
                  )}
                </div>

                <div className={campoLargoCls}>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Proveedor <span className="text-muted-foreground/70 font-normal">(opcional)</span>
                  </label>
                  {isView ? (
                    <p className="text-sm font-semibold text-foreground py-2">{provQuery || "—"}</p>
                  ) : (
                    <div className="relative" ref={provRef}>
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input
                        value={provQuery}
                        onChange={(e) => {
                          setProvQuery(e.target.value);
                          setProvSugAbierto(true);
                        }}
                        onFocus={() => setProvSugAbierto(true)}
                        placeholder="Buscar por nombre, NIT, asesor o email..."
                        className={`${iCls} pl-10`}
                      />
                      {provSugAbierto && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden">
                          {provSugs.map((p) => (
                            <button
                              key={p.nit}
                              type="button"
                              onMouseDown={() => seleccionarProveedor(p)}
                              className="w-full text-left px-3 py-2.5 text-xs hover:bg-muted cursor-pointer border-b border-border last:border-0"
                            >
                              <p className="font-semibold text-foreground">{p.nombre}</p>
                              <p className="text-muted-foreground">
                                NIT {p.nit}
                                {p.asesorComercial && <> · Asesor: {p.asesorComercial}</>}
                              </p>
                            </button>
                          ))}
                          {provSugs.length === 0 && provQuery.trim() !== "" && (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setProvSugAbierto(false);
                                setMostrarNuevoProveedor(true);
                              }}
                              className="w-full text-left px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary/10 cursor-pointer inline-flex items-center gap-2"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Crear proveedor “{provQuery.trim()}”
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className={campoCortoCls}>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Fecha de factura {!isView && <span className="text-red-500">*</span>}
                  </label>
                  {isView ? (
                    <p className="text-sm font-semibold text-foreground py-2">{fechaFactura || "—"}</p>
                  ) : (
                    <input
                      type="date"
                      value={fechaFactura}
                      onChange={(e) => setFechaFactura(e.target.value)}
                      onBlur={() => marcarTocado("fechaFactura")}
                      max={today}
                      className={campoCls(
                        (tocado.fechaFactura || intentoGuardar) ? errorFechaFactura : undefined
                      )}
                      aria-invalid={!!((tocado.fechaFactura || intentoGuardar) && errorFechaFactura)}
                    />
                  )}
                  {!isView && (tocado.fechaFactura || intentoGuardar) && errorFechaFactura && (
                    <p className="text-xs text-red-500 mt-1 ml-0.5">{errorFechaFactura}</p>
                  )}
                </div>

                {!isView && (
                  <div className={campoCortoCls}>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Estado
                    </label>
                    <select
                      value={estado}
                      onChange={(e) => setEstado(e.target.value as EstadoGestion)}
                      className={`${sCls} cursor-pointer`}
                    >
                      <option value="Recibido">Recibido</option>
                      <option value="Anulado">Anulado</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Agregar insumo — solo en el formulario de creación */}
              {!isView && (
                <div className="shrink-0">
                  <CompactInsumoForm
                    containerRef={itemRef}
                    titulo="Agregar insumo"
                    nombre={itemNombre}
                    onNombreChange={(value) => {
                      setItemNombre(value);
                      setItemId("");
                      setItemSugAbierto(true);
                    }}
                    onNombreFocus={() => setItemSugAbierto(true)}
                    cantidad={itemCantidad}
                    onCantidadChange={setItemCantidad}
                    unidad={itemUnidad}
                    onUnidadChange={setItemUnidad}
                    precio={itemPrecio}
                    onPrecioChange={setItemPrecio}
                    onAgregar={agregarItem}
                    suggestions={itemSugs}
                    showSuggestions={itemSugAbierto}
                    onSelectSuggestion={(suggestion) => seleccionarInsumo(suggestion as Insumo)}
                  />
                </div>
              )}

              {!isView && (errorItems || errorTotal) && (algunoTocado || intentoGuardar) && (
                <p className="text-xs text-red-500 ml-0.5 shrink-0">
                  {errorItems ?? errorTotal}
                </p>
              )}

              <InsumosSolicitadosTable
                items={items}
                showActions={!isView}
                onRemove={!isView ? eliminarItem : undefined}
                onUpdate={!isView ? actualizarItem : undefined}
                totalLabel="Total recibido"
                className={isPage ? "flex-1 min-h-0" : ""}
              />
            </div>

            {/* Footer — solo en creación; en detalle se cierra con la X del encabezado */}
            {!isView && (
              <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={!formValido}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
                >
                  <Check className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {mostrarNuevoProveedor && (
          <NuevoProveedorModal
            nombreInicial={provQuery.trim()}
            onGuardar={crearProveedor}
            onClose={() => setMostrarNuevoProveedor(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── NUEVA COMPRA — PÁGINA INDEPENDIENTE ─────────────────────────────────────

interface NuevaCompraPageProps {
  gestiones: GestionCompra[];
  setGestiones: React.Dispatch<React.SetStateAction<GestionCompra[]>>;
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  insumos: Insumo[];
  onBack: () => void;
}

export function NuevaCompraPage({
  gestiones,
  setGestiones,
  proveedores,
  setProveedores,
  insumos,
  onBack,
}: NuevaCompraPageProps) {
  const handleGuardar = (data: NuevaCompraData) => {
    const nuevoId = String(
      Math.max(0, ...gestiones.map((g) => parseInt(g.id, 10) || 0)) + 1
    ).padStart(3, "0");

    const nueva: GestionCompra = {
      id: nuevoId,
      ordenId: "",
      proveedor: data.proveedor,
      numeroFactura: data.numeroFactura,
      fechaFactura: data.fechaFactura,
      valorTotal: data.valorTotal,
      estado: data.estado,
      items: data.items.map((item) => ({ ...item })),
    };

    setGestiones((prev) => [nueva, ...prev]);
    toast.success(`Compra ${nueva.id} creada · Factura ${nueva.numeroFactura}`);
    onBack();
  };

  return (
    <CompraForm
      fullPage
      proveedores={proveedores}
      setProveedores={setProveedores}
      insumos={insumos}
      onClose={onBack}
      onGuardar={handleGuardar}
    />
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

interface Props {
  gestiones: GestionCompra[];
  setGestiones: React.Dispatch<React.SetStateAction<GestionCompra[]>>;
  ordenes: OrdenCompra[];
  setOrdenes: React.Dispatch<React.SetStateAction<OrdenCompra[]>>;
  insumos: Insumo[];
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  onNuevaCompra: () => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function GestionCompraScreen({
  gestiones, setGestiones, ordenes, setOrdenes, insumos, proveedores, setProveedores,
  onNuevaCompra,
  canCreate = true,
}: Props) {
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [detail, setDetail]   = useState<GestionCompra | null>(null);
  const [estadoConfirm, setEstadoConfirm] = useState<{ id: string; from: EstadoGestion; next: EstadoGestion } | null>(null);

  const filtered = useMemo(() =>
    gestiones.filter(g => {
      const q = search.toLowerCase();
      return !q || g.id.toLowerCase().includes(q)
        || g.ordenId.toLowerCase().includes(q)
        || g.numeroFactura.toLowerCase().includes(q);
    }),
    [gestiones, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const getOrden = (oid: string) => ordenes.find(o => o.id === oid);

  /** Orden de compra relacionada con la compra del diálogo de confirmación. */
  const estadoOrdenConfirm = estadoConfirm
    ? gestiones.find((g) => g.id === estadoConfirm.id)?.ordenId ?? ""
    : "";

  /** Pide confirmación antes de aplicar el cambio de estado. */
  const pedirCambiarEstado = (id: string, next: EstadoGestion) => {
    const actual = gestiones.find((g) => g.id === id)?.estado;

    // "Anulado" es definitivo: no se puede volver a "Recibido".
    if (!actual || actual === next || actual === "Anulado") {
      setEstadoConfirm(null);
      return;
    }

    setEstadoConfirm({ id, from: actual, next });
  };

  const handleCambiarEstado = (id: string, next: EstadoGestion) => {
    setGestiones((prev) => prev.map((x) => (x.id === id ? { ...x, estado: next } : x)));
    setEstadoConfirm(null);

    // Anular una factura anula también su orden de compra: queda cerrada y no
    // admite más facturas en "Recibido".
    const ordenId = next === "Anulado" ? gestiones.find((g) => g.id === id)?.ordenId : "";

    if (ordenId) {
      setOrdenes((prev) =>
        prev.map((o) =>
          o.id === ordenId ? { ...o, estado: "Anulado" as EstadoOrden } : o
        )
      );

      toast.success(`Compra ${id} y orden ${ordenId} anuladas`);
      return;
    }

    toast.success(`Estado cambiado a: ${next}`);
  };

  const handleDownload = () => {
    const rows: string[][] = [
      ["ID Gestión", "OC Asociada", "Proveedor", "N° Factura", "Fecha Factura", "Valor Total", "Estado"],
    ];
    gestiones.forEach(g => {
      const orden = getOrden(g.ordenId);
      rows.push([
        g.id, g.ordenId || "—", (orden?.proveedor ?? g.proveedor) || "—",
        g.numeroFactura, g.fechaFactura,
        String(g.valorTotal), g.estado,
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "gestiones_compra.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV descargado");
  };

  return (
    <div className="px-6 pt-5 pb-4 max-w-5xl mx-auto h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-4 mb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
            Gestión de Compras
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Registro de facturas vinculadas a órdenes completadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            title="Descargar CSV"
            className="inline-flex items-center gap-2 px-3 py-2.5 border border-border text-foreground font-semibold text-sm rounded-xl hover:bg-muted cursor-pointer transition-all"
          >
            <FileDown className="w-4 h-4" /> CSV
          </button>
          {canCreate && (
            <button
              onClick={onNuevaCompra}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Crear Compra
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por ID, OC o N° Factura..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-3">
        <div className="overflow-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["Proveedor", "Fecha de factura", "N° Factura", "Total", "Estado", "Acciones"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center text-muted-foreground">
                      <p className="text-4xl mb-3">📦</p>
                      <p className="font-medium">No hay gestiones de compra aún</p>
                      <p className="text-xs mt-1">
                        Se crean al recibir una Orden de Compra o manualmente con «+ Crear Compra»
                      </p>
                    </td>
                  </tr>
                )
                : paged.map(g => {
                  const orden = getOrden(g.ordenId);
                  return (
                    <tr key={g.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 text-sm text-foreground">
                        {(orden?.proveedor ?? g.proveedor) || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {g.fechaFactura || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {g.numeroFactura
                          ? <span className="font-mono font-semibold text-foreground">{g.numeroFactura}</span>
                          : <span className="text-amber-600 font-medium italic">Pendiente</span>}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-foreground whitespace-nowrap">
                        {g.valorTotal > 0
                          ? fmtCOP(g.valorTotal)
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => pedirCambiarEstado(g.id, "Anulado")}
                          disabled={g.estado === "Anulado"}
                          title={
                            g.estado === "Anulado"
                              ? "Una compra anulada no puede volver al estado Recibido"
                              : "Marcar como Anulado"
                          }
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                            g.estado === "Anulado"
                              ? `${ESTADO_CONFIG[g.estado]} opacity-80 cursor-not-allowed`
                              : `${ESTADO_CONFIG[g.estado]} cursor-pointer hover:brightness-95 active:scale-95`
                          }`}
                        >
                          {g.estado === "Anulado" && <Lock className="w-3 h-3" />}
                          {g.estado}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setDetail(g)}
                          title="Ver detalle"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {detail && (
          <CompraForm
            mode="view"
            compra={{
              ...detail,
              proveedor:
                detail.proveedor ?? getOrden(detail.ordenId)?.proveedor ?? "",
            }}
            proveedores={proveedores}
            setProveedores={setProveedores}
            insumos={insumos}
            onClose={() => setDetail(null)}
            onGuardar={() => {}}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {estadoConfirm && (
          <ConfirmModal
            title={`¿Cambiar el estado a ${estadoConfirm.next}?`}
            body={`La compra ${estadoConfirm.id} pasará de ${estadoConfirm.from} a ${estadoConfirm.next}.`}
            detail={
              estadoConfirm.next === "Anulado"
                ? estadoOrdenConfirm
                  ? `La orden ${estadoOrdenConfirm} también quedará anulada y no podrá recibir más facturas.`
                  : "Una compra anulada no puede volver al estado Recibido."
                : "Volverá a contar en los totales de Gestión de Compras."
            }
            confirmLabel={
              estadoConfirm.next === "Anulado" ? "Anular" : `Marcar ${estadoConfirm.next}`
            }
            danger={estadoConfirm.next === "Anulado"}
            icon={
              estadoConfirm.next === "Anulado" ? (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-red-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              )
            }
            onConfirm={() => handleCambiarEstado(estadoConfirm.id, estadoConfirm.next)}
            onCancel={() => setEstadoConfirm(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
