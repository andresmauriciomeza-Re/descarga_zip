import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Eye, X, ArrowLeft, ChevronLeft, ChevronRight,
  FileDown, Plus, Check,
} from "lucide-react";
import { toast } from "sonner";
import type { Insumo } from "./GestionInsumosScreen";
import { CompactInsumoForm, UNIDADES } from "../components/CompactInsumoForm";
import { InsumosSolicitadosTable } from "../components/InsumosSolicitadosTable";
import {
  NuevoProveedorModal,
  type GestionCompra,
  type OrdenCompra,
  type EstadoGestion,
  type ProveedorRef,
} from "./OrdenCompraScreen";

const SERIF = "'DM Serif Display', serif";
const PER_PAGE = 8;

const ESTADO_CONFIG: Record<EstadoGestion, string> = {
  "Recibido":   "bg-emerald-100 text-emerald-800",
  "Anulado":    "bg-red-100 text-red-800",
};

function fmtCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

// ─── NUEVA COMPRA ─────────────────────────────────────────────────────────────

const iCls =
  "w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const roCls = "w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl text-sm text-muted-foreground cursor-default";
const sCls = `${iCls} appearance-none`;

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

  const guardar = () => {
    if (!numeroFactura.trim()) {
      toast.error("Ingresa el número de factura.");
      return;
    }
    if (!fechaFactura) {
      toast.error("Selecciona la fecha de la factura.");
      return;
    }
    if (!provQuery.trim()) {
      toast.error("Selecciona o crea un proveedor.");
      return;
    }
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
      <div className={isPage ? "w-full p-6 max-w-5xl mx-auto" : "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto"}>
        <div className={isPage ? "w-full" : "flex min-h-full items-center justify-center p-4"}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`bg-card rounded-2xl w-full max-w-5xl shadow-2xl border border-border ${isPage ? "" : "my-4"}`}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground" style={{ fontFamily: SERIF }}>
                  {isView ? "Detalle de Compra" : "Nueva Compra"}
                </h3>
                {isView && compra && (
                  <p className="text-xs text-muted-foreground mt-0.5">Compra {compra.id}</p>
                )}
              </div>
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

            <div className="px-5 py-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Número de factura {!isView && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    value={numeroFactura}
                    onChange={(e) => setNumeroFactura(e.target.value)}
                    placeholder="Ej: FAC-2026-0001"
                    readOnly={isView}
                    className={isView ? roCls : iCls}
                    autoFocus={!isView}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Fecha de factura {!isView && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="date"
                    value={fechaFactura}
                    onChange={(e) => setFechaFactura(e.target.value)}
                    max={today}
                    disabled={isView}
                    className={isView ? roCls : iCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Proveedor {!isView && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative" ref={provRef}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      value={provQuery}
                      onChange={(e) => {
                        setProvQuery(e.target.value);
                        setProvSugAbierto(true);
                      }}
                      onFocus={isView ? undefined : () => setProvSugAbierto(true)}
                      placeholder="Buscar por nombre, NIT, asesor o email..."
                      readOnly={isView}
                      className={`${isView ? roCls : iCls} pl-10`}
                    />
                    {!isView && provSugAbierto && (
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
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Estado
                  </label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as EstadoGestion)}
                    disabled={isView}
                    className={isView ? roCls : `${sCls} cursor-pointer`}
                  >
                    <option value="Recibido">Recibido</option>
                    <option value="Anulado">Anulado</option>
                  </select>
                </div>
              </div>

              {/* Agregar insumo — solo en el formulario de creación */}
              {!isView && (
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
              )}

              <InsumosSolicitadosTable
                items={items}
                showActions={!isView}
                onRemove={!isView ? eliminarItem : undefined}
                totalLabel="Total recibido"
              />
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                {isView ? "Cerrar" : "Cancelar"}
              </button>
              {!isView && (
                <button
                  onClick={guardar}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all inline-flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Guardar Compra
                </button>
              )}
            </div>
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
  insumos: Insumo[];
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  onNuevaCompra: () => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function GestionCompraScreen({
  gestiones, setGestiones, ordenes, insumos, proveedores, setProveedores,
  onNuevaCompra,
  canCreate = true,
}: Props) {
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [detail, setDetail]   = useState<GestionCompra | null>(null);

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

  const handleCambiarEstado = (id: string, next: EstadoGestion) => {
    setGestiones((prev) => prev.map((x) => (x.id === id ? { ...x, estado: next } : x)));
    toast.success(`Estado cambiado a: ${next}`);
  };

  const handleDownload = () => {
    const rows: string[][] = [
      ["ID Gestión", "OC Asociada", "Proveedor", "N° Factura", "Fecha Factura", "Valor Total", "Estado"],
    ];
    gestiones.forEach(g => {
      const orden = getOrden(g.ordenId);
      rows.push([
        g.id, g.ordenId || "—", orden?.proveedor ?? g.proveedor ?? "—",
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
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

      <div className="flex flex-wrap items-center gap-3 mb-5">
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

      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
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
                        {orden?.proveedor ?? g.proveedor ?? "—"}
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
                        <select
                          value={g.estado}
                          onChange={(e) => handleCambiarEstado(g.id, e.target.value as EstadoGestion)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${ESTADO_CONFIG[g.estado]}`}
                          title="Cambiar estado"
                        >
                          <option value="Recibido">Recibido</option>
                          <option value="Anulado">Anulado</option>
                        </select>
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
        <div className="flex items-center justify-center mt-4">
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
    </div>
  );
}
