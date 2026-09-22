import React, { useState, useMemo, useRef, useEffect } from "react";
import type { Insumo } from "./GestionInsumosScreen";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Search, Eye, Pencil, Trash2, X, ChevronLeft, ChevronRight,
  AlertCircle, Send, Ban, Check, FileDown, ClipboardCheck,
  AlertTriangle, CheckCircle2, Lock,
} from "lucide-react";
import { toast } from "sonner";

const SERIF = "'DM Serif Display', serif";
const PER_PAGE = 8;

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type EstadoOrden = "Borrador" | "Enviado" | "Completado" | "Anulado";
export type EstadoGestion = "En Proceso" | "Recibido" | "Anulado";

export interface OrdenItem {
  rowId: string;
  idInsumo: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
}

export interface ItemRecibido {
  rowId: string;
  idInsumo: string;
  nombre: string;
  cantidadSolicitada: number;
  cantidadRecibida: number;
  unidad: string;
  precioReferencia: number;
  precioUnitario: number;
}

export interface Recepcion {
  items: ItemRecibido[];
  itemsExtra: ItemRecibido[];
  usarLotes: boolean;
  fechaRecepcion: string;
}

export interface OrdenCompra {
  id: string;
  proveedor: string;
  fecha: string;
  estado: EstadoOrden;
  items: OrdenItem[];
  recepcion?: Recepcion;
}

export interface GestionCompra {
  id: string;
  ordenId: string;
  numeroFactura: string;
  fechaFactura: string;
  valorTotal: number;
  estado: EstadoGestion;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

export const PROVEEDORES_INIT = [
  "Molinos del Valle",
  "Lácteos La Esperanza",
  "Distribuidora Sur",
  "Carnes Premium",
  "Verduras Express",
];

const UNIDADES = ["kg", "g", "lt", "ml", "und", "paq", "caja", "bolsa"];

const ESTADO_CONFIG: Record<EstadoOrden, string> = {
  Borrador: "bg-gray-100 text-gray-700",
  Enviado: "bg-blue-100 text-blue-800",
  Completado: "bg-emerald-100 text-emerald-800",
  Anulado: "bg-red-100 text-red-800",
};

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────

export const INITIAL_ORDENES: OrdenCompra[] = [
  {
    id: "001",
    proveedor: "Molinos del Valle",
    fecha: "2024-02-05",
    estado: "Enviado",
    items: [
      { rowId: "r1", idInsumo: "INS-001", nombre: "Harina de trigo", cantidad: 100, unidad: "kg", precioUnitario: 3500 },
      { rowId: "r2", idInsumo: "INS-006", nombre: "Levadura", cantidad: 5000, unidad: "g", precioUnitario: 80 },
    ],
  },
  {
    id: "002",
    proveedor: "Lácteos La Esperanza",
    fecha: "2024-02-08",
    estado: "Enviado",
    items: [
      { rowId: "r3", idInsumo: "INS-002", nombre: "Queso mozzarella", cantidad: 20, unidad: "kg", precioUnitario: 18000 },
      { rowId: "r4", idInsumo: "INS-005", nombre: "Aceite de oliva", cantidad: 10, unidad: "lt", precioUnitario: 15000 },
    ],
  },
  {
    id: "003",
    proveedor: "Distribuidora Sur",
    fecha: "2024-02-10",
    estado: "Borrador",
    items: [
      { rowId: "r5", idInsumo: "INS-003", nombre: "Salsa de tomate", cantidad: 30, unidad: "lt", precioUnitario: 5000 },
      { rowId: "r6", idInsumo: "INS-004", nombre: "Pepperoni", cantidad: 15, unidad: "kg", precioUnitario: 22000 },
    ],
  },
  {
    id: "004",
    proveedor: "Carnes Premium",
    fecha: "2024-02-01",
    estado: "Completado",
    items: [
      { rowId: "r7", idInsumo: "INS-008", nombre: "Jamón serrano", cantidad: 10, unidad: "kg", precioUnitario: 28000 },
    ],
    recepcion: {
      fechaRecepcion: "2024-02-02",
      usarLotes: false,
      items: [
        { rowId: "rr1", idInsumo: "INS-008", nombre: "Jamón serrano", cantidadSolicitada: 10, cantidadRecibida: 10, unidad: "kg", precioReferencia: 28000, precioUnitario: 28000 },
      ],
      itemsExtra: [],
    },
  },
  {
    id: "005",
    proveedor: "Verduras Express",
    fecha: "2024-01-28",
    estado: "Anulado",
    items: [
      { rowId: "r8", idInsumo: "INS-007", nombre: "Champiñones", cantidad: 25, unidad: "kg", precioUnitario: 12000 },
    ],
  },
];

export const INITIAL_GESTIONES: GestionCompra[] = [
  {
    id: "001",
    ordenId: "004",
    numeroFactura: "FAC-2024-0432",
    fechaFactura: "2024-02-03",
    valorTotal: 280000,
    estado: "Recibido",
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fmtCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function calcTotal(items: OrdenItem[]) {
  return items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
}

function nextOrdenId(items: OrdenCompra[]) {
  const nums = items.map(i => parseInt(i.id, 10)).filter(x => !isNaN(x));
  return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
}

function nextGestionId(items: GestionCompra[]) {
  const nums = items.map(i => parseInt(i.id, 10)).filter(x => !isNaN(x));
  return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
}

function addDays(d: string, days: number) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────

function EstadoBadge({ e }: { e: EstadoOrden }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ESTADO_CONFIG[e]}`}>
      {e}
    </span>
  );
}

const iCls = "w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const sCls = `${iCls} appearance-none`;

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────

function ConfirmModal({
  title, body, detail, confirmLabel = "Confirmar", danger = false, icon, onConfirm, onCancel,
}: {
  title: string; body: string; detail?: string; confirmLabel?: string;
  danger?: boolean; icon?: React.ReactNode; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border"
      >
        {icon && <div className="mb-3">{icon}</div>}
        <h3 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: SERIF }}>{title}</h3>
        <p className="text-sm text-muted-foreground mb-1 leading-relaxed">{body}</p>
        {detail && (
          <p className={`text-sm font-semibold mb-5 ${danger ? "text-red-600" : "text-amber-600"}`}>{detail}</p>
        )}
        {!detail && <div className="mb-5" />}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-colors active:scale-95 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-red-700"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── NUEVO PROVEEDOR MODAL ────────────────────────────────────────────────────

function NuevoProveedorModal({
  onGuardar, onClose,
}: {
  onGuardar: (nombre: string, telefono: string) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  const submit = () => {
    if (!nombre.trim()) { toast.error("El nombre es obligatorio."); return; }
    onGuardar(nombre.trim(), telefono.trim());
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-foreground" style={{ fontFamily: SERIF }}>Nuevo Proveedor</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nombre *</label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              autoFocus
              placeholder="Nombre del proveedor"
              className={iCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Teléfono / Contacto</label>
            <input
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              placeholder="Opcional"
              className={iCls}
            />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all"
          >
            Crear Proveedor
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── ORDEN MODAL ──────────────────────────────────────────────────────────────

interface OrdenFormData {
  proveedor: string;
  fecha: string;
  estado: "Borrador" | "Enviado";
  items: OrdenItem[];
}

function OrdenModal({
  mode, orden, proveedores, insumos, onClose, onGuardar, onNuevoProveedor,
  onEnviarDesdeVista, onAnularDesdeVista,
}: {
  mode: "create" | "edit" | "view";
  orden?: OrdenCompra;
  proveedores: string[];
  insumos: Insumo[];
  onClose: () => void;
  onGuardar: (d: OrdenFormData) => void;
  onNuevoProveedor: (nombre: string, telefono: string) => string;
  onEnviarDesdeVista?: (o: OrdenCompra) => void;
  onAnularDesdeVista?: (o: OrdenCompra) => void;
}) {
  const isView = mode === "view";
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<OrdenFormData>({
    proveedor: orden?.proveedor ?? (proveedores[0] ?? ""),
    fecha: orden?.fecha ?? today,
    estado: (orden?.estado === "Enviado" ? "Enviado" : "Borrador") as "Borrador" | "Enviado",
    items: orden?.items.map(i => ({ ...i })) ?? [],
  });
  const pf = (p: Partial<OrdenFormData>) => setForm(f => ({ ...f, ...p }));

  const [showNuevoProv, setShowNuevoProv] = useState(false);
  const [showSendConf, setShowSendConf] = useState(false);

  const [aNombre, setANombre] = useState("");
  const [aCant, setACant] = useState(1);
  const [aUnidad, setAUnidad] = useState(UNIDADES[0]);
  const [aPrecio, setAPrecio] = useState(0);
  const [aFromCat, setAFromCat] = useState(false);
  const [aShowSug, setAShowSug] = useState(false);
  const sugRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() =>
    aNombre.trim().length >= 1
      ? insumos.filter(i => i.nombre.toLowerCase().includes(aNombre.toLowerCase())).slice(0, 6)
      : [],
    [insumos, aNombre]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (sugRef.current && !sugRef.current.contains(e.target as Node)) setAShowSug(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const selectSug = (ins: Insumo) => {
    setANombre(ins.nombre);
    setAUnidad(UNIDADES.includes(ins.unidadMedida) ? ins.unidadMedida : UNIDADES[0]);
    setAPrecio(ins.precioUnitario);
    setAFromCat(true);
    setAShowSug(false);
  };

  const addItem = () => {
    if (!aNombre.trim()) { toast.error("Ingresa el nombre del insumo."); return; }
    if (form.items.some(i => i.nombre.toLowerCase() === aNombre.trim().toLowerCase())) {
      toast.error("Este insumo ya está en la orden.");
      return;
    }
    pf({
      items: [...form.items, {
        rowId: `r${Date.now()}`,
        idInsumo: `INS-${Date.now()}`,
        nombre: aNombre.trim(),
        cantidad: aCant,
        unidad: aUnidad,
        precioUnitario: aPrecio,
      }],
    });
    setANombre(""); setACant(1); setAPrecio(0); setAFromCat(false);
  };

  const handleProvChange = (v: string) => {
    if (v === "__NUEVO__") setShowNuevoProv(true);
    else pf({ proveedor: v });
  };

  const handleNuevoProv = (nombre: string, tel: string) => {
    pf({ proveedor: onNuevoProveedor(nombre, tel) });
    setShowNuevoProv(false);
    toast.success(`Proveedor "${nombre}" creado`);
  };

  const handleGuardar = () => {
    if (form.items.length === 0) { toast.error("Agrega al menos un insumo."); return; }
    if (form.estado === "Enviado") { setShowSendConf(true); return; }
    onGuardar(form);
  };

  const subtotal = form.items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-card rounded-2xl w-full max-w-3xl shadow-2xl border border-border my-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground" style={{ fontFamily: SERIF }}>
                  {mode === "create" ? "Nueva Orden de Compra" : mode === "edit" ? `Editar OC ${orden?.id}` : `Orden ${orden?.id}`}
                </h3>
                {orden && (
                  <p className="text-xs text-muted-foreground mt-0.5">{orden.proveedor} · {orden.fecha}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isView && orden && <EstadoBadge e={orden.estado} />}
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-5 py-5 space-y-5">
              {/* Status banners */}
              {isView && orden?.estado === "Completado" && orden.recepcion && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Recepción guardada el <strong className="ml-1">{orden.recepcion.fechaRecepcion}</strong>. Esta orden ya no es editable.
                </div>
              )}
              {isView && orden?.estado === "Enviado" && (
                <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Orden enviada al proveedor. Pendiente de recepción.
                </div>
              )}
              {isView && orden?.estado === "Anulado" && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                  <Ban className="w-4 h-4 shrink-0" />
                  Esta orden ha sido anulada.
                </div>
              )}

              {/* Fields */}
              <div className="grid grid-cols-2 gap-4">
                {orden?.id && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">N° Orden</label>
                    <input value={orden.id} readOnly className={`${iCls} opacity-60 cursor-default`} />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Proveedor</label>
                  {isView
                    ? <p className="text-sm font-semibold text-foreground py-2">{form.proveedor}</p>
                    : (
                      <select value={form.proveedor} onChange={e => handleProvChange(e.target.value)} className={sCls}>
                        {proveedores.map(p => <option key={p} value={p}>{p}</option>)}
                        <option value="__NUEVO__">+ Nuevo proveedor...</option>
                      </select>
                    )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Fecha</label>
                  {isView
                    ? <p className="text-sm font-semibold text-foreground py-2">{form.fecha}</p>
                    : <input type="date" value={form.fecha} onChange={e => pf({ fecha: e.target.value })} className={iCls} />}
                </div>
                {!isView && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Estado</label>
                    <select value={form.estado} onChange={e => pf({ estado: e.target.value as "Borrador" | "Enviado" })} className={sCls}>
                      <option value="Borrador">Borrador</option>
                      <option value="Enviado">Enviado</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Add-item row */}
              {!isView && (
                <div ref={sugRef} className="p-3 bg-muted/40 border border-border rounded-xl flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    <input
                      value={aNombre}
                      onChange={e => { setANombre(e.target.value); setAFromCat(false); setAShowSug(true); }}
                      onFocus={() => setAShowSug(true)}
                      placeholder="Buscar insumo..."
                      className="pl-7 pr-2 py-1.5 w-44 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    {aShowSug && suggestions.length > 0 && (
                      <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden">
                        {suggestions.map(ins => (
                          <button key={ins.id} type="button" onMouseDown={() => selectSug(ins)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted cursor-pointer border-b border-border last:border-0">
                            <p className="font-semibold text-foreground">{ins.nombre}</p>
                            <p className="text-muted-foreground">{ins.unidadMedida} · ${ins.precioUnitario.toLocaleString("es-CO")}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="number" min={1} value={aCant}
                    onChange={e => setACant(Number(e.target.value))}
                    placeholder="Cant."
                    className="w-16 px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <select
                    value={aUnidad} onChange={e => setAUnidad(e.target.value)} disabled={aFromCat}
                    className={`w-16 px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none cursor-pointer ${aFromCat ? "bg-muted/40" : "bg-background"}`}
                  >
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input
                    type="number" value={aPrecio || ""}
                    onChange={e => setAPrecio(Number(e.target.value))}
                    placeholder="P. unit."
                    className="w-24 px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    onClick={addItem}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-red-700 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </div>
              )}

              {/* Items table */}
              <div className="bg-muted/30 rounded-xl border border-border overflow-hidden">
                <div className="px-3 py-2 border-b border-border bg-muted/30">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Insumos solicitados</p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                    <tr>
                      {["Nombre", "Cantidad", "Unidad", "P. unitario", "Subtotal"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>
                      ))}
                      {!isView && <th className="px-3 py-2.5" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {form.items.length === 0
                      ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-xs text-muted-foreground">
                            Sin insumos agregados
                          </td>
                        </tr>
                      )
                      : form.items.map(item => (
                        <tr key={item.rowId} className="hover:bg-muted/20">
                          <td className="px-3 py-2.5 text-sm font-medium text-foreground">{item.nombre}</td>
                          <td className="px-3 py-2.5 text-sm">{item.cantidad}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{item.unidad}</td>
                          <td className="px-3 py-2.5 text-sm">{fmtCOP(item.precioUnitario)}</td>
                          <td className="px-3 py-2.5 text-sm font-semibold">{fmtCOP(item.cantidad * item.precioUnitario)}</td>
                          {!isView && (
                            <td className="px-3 py-2.5">
                              <button
                                onClick={() => pf({ items: form.items.filter(i => i.rowId !== item.rowId) })}
                                className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                  {form.items.length > 0 && (
                    <tfoot className="bg-muted/50 border-t border-border">
                      <tr>
                        <td colSpan={isView ? 4 : 5} className="px-3 py-2 text-xs font-bold text-muted-foreground text-right uppercase tracking-wider">
                          Total estimado
                        </td>
                        <td className="px-3 py-2 text-sm font-bold text-foreground">{fmtCOP(subtotal)}</td>
                        {!isView && <td />}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Recepcion detail (Completado view) */}
              {isView && orden?.estado === "Completado" && orden.recepcion && (
                <div className="bg-emerald-50/40 rounded-xl border border-emerald-200 overflow-hidden">
                  <div className="px-3 py-2 border-b border-emerald-200 bg-emerald-100/60">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Insumos recibidos</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground uppercase tracking-wider">
                      <tr>
                        {["Nombre", "Solicitado", "Recibido", "Unidad", "P. real", "Subtotal"].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100">
                      {[...orden.recepcion.items, ...orden.recepcion.itemsExtra].map(item => (
                        <tr key={item.rowId}>
                          <td className="px-3 py-2 font-medium text-foreground">
                            {item.nombre}
                            {item.cantidadSolicitada === 0 && (
                              <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full">
                                No solicitado
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">{item.cantidadSolicitada || "—"}</td>
                          <td className="px-3 py-2 font-semibold">{item.cantidadRecibida}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{item.unidad}</td>
                          <td className="px-3 py-2">{fmtCOP(item.precioUnitario)}</td>
                          <td className="px-3 py-2 font-semibold">{fmtCOP(item.cantidadRecibida * item.precioUnitario)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-emerald-100/60 border-t border-emerald-200">
                      <tr>
                        <td colSpan={5} className="px-3 py-2 text-xs font-bold text-muted-foreground text-right uppercase">
                          Total recibido
                        </td>
                        <td className="px-3 py-2 text-sm font-bold text-foreground">
                          {fmtCOP([...orden.recepcion.items, ...orden.recepcion.itemsExtra].reduce(
                            (s, i) => s + i.cantidadRecibida * i.precioUnitario, 0
                          ))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                {isView ? "Cerrar" : "Cancelar"}
              </button>
              {isView && orden?.estado === "Borrador" && onEnviarDesdeVista && (
                <button
                  onClick={() => { onClose(); onEnviarDesdeVista(orden); }}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 cursor-pointer active:scale-95 inline-flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Enviar a Proveedor
                </button>
              )}
              {isView && orden?.estado === "Enviado" && onAnularDesdeVista && (
                <button
                  onClick={() => { onClose(); onAnularDesdeVista(orden); }}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 inline-flex items-center justify-center gap-2"
                >
                  <Ban className="w-4 h-4" /> Anular Orden
                </button>
              )}
              {!isView && (
                <button
                  onClick={handleGuardar}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95"
                >
                  Guardar
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showNuevoProv && (
          <NuevoProveedorModal
            onGuardar={handleNuevoProv}
            onClose={() => setShowNuevoProv(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSendConf && (
          <ConfirmModal
            title="¿Confirmas el envío?"
            body={`Enviar OC a ${form.proveedor}.`}
            detail="No podrás editarla después del envío."
            confirmLabel="Enviar"
            icon={
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
            }
            onConfirm={() => { onGuardar(form); setShowSendConf(false); }}
            onCancel={() => setShowSendConf(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── RECEPCION MODAL ──────────────────────────────────────────────────────────

function RecepcionModal({
  orden, insumos, onGuardar, onAnular, onClose,
}: {
  orden: OrdenCompra;
  insumos: Insumo[];
  onGuardar: (rec: Recepcion) => void;
  onAnular: () => void;
  onClose: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  type ItemRow = ItemRecibido & { malEstado: boolean };

  const [items, setItems] = useState<ItemRow[]>(() =>
    orden.items.map(i => ({
      rowId: i.rowId,
      idInsumo: i.idInsumo,
      nombre: i.nombre,
      cantidadSolicitada: i.cantidad,
      cantidadRecibida: i.cantidad,
      unidad: i.unidad,
      precioReferencia: i.precioUnitario,
      precioUnitario: i.precioUnitario,
      malEstado: false,
    }))
  );
  const [itemsExtra, setItemsExtra] = useState<ItemRecibido[]>([]);
  const [usarLotes, setUsarLotes] = useState(false);
  const [showGuardarConf, setShowGuardarConf] = useState(false);
  const [showAnularConf, setShowAnularConf] = useState(false);

  const [exNombre, setExNombre] = useState("");
  const [exCant, setExCant] = useState(1);
  const [exUnidad, setExUnidad] = useState(UNIDADES[0]);
  const [exPrecio, setExPrecio] = useState(0);
  const [exShowSug, setExShowSug] = useState(false);
  const exRef = useRef<HTMLDivElement>(null);

  const exSugs = useMemo(() =>
    exNombre.trim().length >= 1
      ? insumos.filter(i => i.nombre.toLowerCase().includes(exNombre.toLowerCase())).slice(0, 6)
      : [],
    [insumos, exNombre]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (exRef.current && !exRef.current.contains(e.target as Node)) setExShowSug(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const updRec = (rowId: string, v: number) =>
    setItems(p => p.map(i => i.rowId === rowId ? { ...i, cantidadRecibida: v } : i));
  const updPrice = (rowId: string, v: number) =>
    setItems(p => p.map(i => i.rowId === rowId ? { ...i, precioUnitario: v } : i));
  const togMal = (rowId: string) =>
    setItems(p => p.map(i => i.rowId === rowId ? { ...i, malEstado: !i.malEstado } : i));

  const addExtra = () => {
    if (!exNombre.trim()) { toast.error("Ingresa el nombre del insumo."); return; }
    setItemsExtra(p => [...p, {
      rowId: `ex-${Date.now()}`,
      idInsumo: `INS-EX-${Date.now()}`,
      nombre: exNombre.trim(),
      cantidadSolicitada: 0,
      cantidadRecibida: exCant,
      unidad: exUnidad,
      precioReferencia: exPrecio,
      precioUnitario: exPrecio,
    }]);
    setExNombre(""); setExCant(1); setExPrecio(0);
  };

  const hayMal = items.some(i => i.malEstado);
  const totalRec = [...items, ...itemsExtra].reduce(
    (s, i) => s + i.cantidadRecibida * i.precioUnitario, 0
  );

  const doGuardar = () => {
    onGuardar({
      items: items.map(({ malEstado: _m, ...rest }) => rest),
      itemsExtra,
      usarLotes,
      fechaRecepcion: today,
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-card rounded-2xl w-full max-w-5xl shadow-2xl border border-border my-4"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground" style={{ fontFamily: SERIF }}>
                  Formulario de Recepción
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  OC {orden.id} · {orden.proveedor} · Fecha: {today}
                </p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-5">
              {/* Mal estado banner */}
              {hayMal && (
                <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Hay insumos marcados en <strong>mal estado</strong>. Puede anular la OC o continuar con recepción parcial.
                  </span>
                  <button
                    onClick={() => setShowAnularConf(true)}
                    className="ml-auto shrink-0 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-red-700"
                  >
                    Anular OC
                  </button>
                </div>
              )}

              {/* Items table */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Insumos del pedido
                </p>
                <div className="bg-muted/30 rounded-xl border border-border overflow-x-auto">
                  <table className="w-full text-sm min-w-[780px]">
                    <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                      <tr>
                        {["Nombre", "Solicitado", "Recibido", "Unidad", "P. referencia", "P. real", "Subtotal", "Mal estado"].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map(item => {
                        const parcial = item.cantidadRecibida > 0 && item.cantidadRecibida < item.cantidadSolicitada;
                        const sinEnt = item.cantidadRecibida === 0;
                        return (
                          <tr
                            key={item.rowId}
                            className={`${item.malEstado ? "bg-red-50/70" : sinEnt ? "bg-amber-50/40" : parcial ? "bg-yellow-50/30" : ""}`}
                          >
                            <td className="px-3 py-2.5 font-medium text-foreground">{item.nombre}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{item.cantidadSolicitada}</td>
                            <td className="px-3 py-2.5">
                              <input
                                type="number" min={0} value={item.cantidadRecibida}
                                onChange={e => updRec(item.rowId, Number(e.target.value))}
                                className="w-20 px-2 py-1 bg-background border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">{item.unidad}</td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtCOP(item.precioReferencia)}</td>
                            <td className="px-3 py-2.5">
                              <input
                                type="number" min={0} value={item.precioUnitario}
                                onChange={e => updPrice(item.rowId, Number(e.target.value))}
                                className="w-28 px-2 py-1 bg-background border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-sm font-semibold">
                              {fmtCOP(item.cantidadRecibida * item.precioUnitario)}
                            </td>
                            <td className="px-3 py-2.5">
                              <button
                                onClick={() => togMal(item.rowId)}
                                title="Marcar mal estado"
                                className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${item.malEstado ? "bg-red-500 text-white" : "bg-muted text-muted-foreground hover:bg-red-100 hover:text-red-600"}`}
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-muted/50 border-t border-border">
                      <tr>
                        <td colSpan={6} className="px-3 py-2 text-xs font-bold text-muted-foreground text-right uppercase tracking-wider">
                          Total recibido
                        </td>
                        <td className="px-3 py-2 text-sm font-bold text-foreground">{fmtCOP(totalRec)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Extra items */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Insumos adicionales recibidos
                </p>
                {itemsExtra.length > 0 && (
                  <div className="bg-violet-50/40 rounded-xl border border-violet-200 overflow-hidden mb-3">
                    <table className="w-full text-sm">
                      <thead className="bg-violet-100/60 text-xs text-muted-foreground uppercase tracking-wider">
                        <tr>
                          {["Nombre", "Cant. recibida", "Unidad", "P. unitario", "Subtotal", ""].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-violet-100">
                        {itemsExtra.map(item => (
                          <tr key={item.rowId}>
                            <td className="px-3 py-2 font-medium text-foreground">{item.nombre}</td>
                            <td className="px-3 py-2">{item.cantidadRecibida}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{item.unidad}</td>
                            <td className="px-3 py-2">{fmtCOP(item.precioUnitario)}</td>
                            <td className="px-3 py-2 font-semibold">
                              {fmtCOP(item.cantidadRecibida * item.precioUnitario)}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => setItemsExtra(p => p.filter(i => i.rowId !== item.rowId))}
                                className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div ref={exRef} className="p-3 bg-muted/40 border border-border rounded-xl flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-muted-foreground w-full">
                    Agregar insumo no pedido:
                  </p>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    <input
                      value={exNombre}
                      onChange={e => { setExNombre(e.target.value); setExShowSug(true); }}
                      onFocus={() => setExShowSug(true)}
                      placeholder="Buscar insumo..."
                      className="pl-7 pr-2 py-1.5 w-44 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    {exShowSug && exSugs.length > 0 && (
                      <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden">
                        {exSugs.map(ins => (
                          <button
                            key={ins.id}
                            type="button"
                            onMouseDown={() => {
                              setExNombre(ins.nombre);
                              setExUnidad(ins.unidadMedida);
                              setExPrecio(ins.precioUnitario);
                              setExShowSug(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted cursor-pointer border-b border-border last:border-0"
                          >
                            <p className="font-semibold text-foreground">{ins.nombre}</p>
                            <p className="text-muted-foreground">
                              {ins.unidadMedida} · ${ins.precioUnitario.toLocaleString("es-CO")}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="number" min={1} value={exCant}
                    onChange={e => setExCant(Number(e.target.value))}
                    placeholder="Cant."
                    className="w-16 px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <select
                    value={exUnidad}
                    onChange={e => setExUnidad(e.target.value)}
                    className="w-16 px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none cursor-pointer"
                  >
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input
                    type="number" value={exPrecio || ""}
                    onChange={e => setExPrecio(Number(e.target.value))}
                    placeholder="P. unit."
                    className="w-24 px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    onClick={addExtra}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-red-700 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </div>
              </div>

              {/* Lotes toggle */}
              <div className="flex items-center justify-between px-4 py-3.5 bg-muted/30 rounded-xl border border-border">
                <div>
                  <p className="text-sm font-semibold text-foreground">Usar lotes</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Asigna fecha de vencimiento automática (recepción + 7 días)
                  </p>
                </div>
                <button
                  onClick={() => setUsarLotes(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${usarLotes ? "bg-primary" : "bg-muted border border-border"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${usarLotes ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              {usarLotes && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-amber-50/40 border border-amber-200 rounded-xl overflow-hidden"
                >
                  <div className="px-4 py-2 bg-amber-100/60 border-b border-amber-200">
                    <p className="text-xs font-semibold text-amber-800">
                      Fechas de vencimiento asignadas automáticamente
                    </p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr>
                        {["Insumo", "Cant. recibida", "Fecha recepción", "Fecha vencimiento"].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {items.map(item => (
                        <tr key={item.rowId}>
                          <td className="px-3 py-2 font-medium">{item.nombre}</td>
                          <td className="px-3 py-2">
                            {item.cantidadRecibida}{" "}
                            <span className="text-xs text-muted-foreground">{item.unidad}</span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{today}</td>
                          <td className="px-3 py-2 font-semibold text-amber-800">{addDays(today, 7)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
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
                onClick={() => setShowGuardarConf(true)}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 inline-flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Guardar Recepción
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showGuardarConf && (
          <ConfirmModal
            title="¿Guardar recepción?"
            body="¿Está seguro que desea guardar estos datos?"
            detail="Una vez guardado no se podrá modificar."
            confirmLabel="Guardar"
            icon={
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            }
            onConfirm={doGuardar}
            onCancel={() => setShowGuardarConf(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAnularConf && (
          <ConfirmModal
            title="¿Anular Orden de Compra?"
            body="Se anulará la OC por insumos en mal estado (devolución al proveedor)."
            detail="Esta acción no puede revertirse."
            confirmLabel="Anular OC"
            danger={true}
            icon={
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
            }
            onConfirm={onAnular}
            onCancel={() => setShowAnularConf(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

interface Props {
  ordenes: OrdenCompra[];
  setOrdenes: React.Dispatch<React.SetStateAction<OrdenCompra[]>>;
  gestiones: GestionCompra[];
  setGestiones: React.Dispatch<React.SetStateAction<GestionCompra[]>>;
  insumos: Insumo[];
  setInsumos?: React.Dispatch<React.SetStateAction<Insumo[]>>;
  onNuevoProveedor?: (nombre: string, telefono: string) => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function OrdenCompraScreen({
  ordenes, setOrdenes, gestiones, setGestiones,
  insumos, setInsumos, onNuevoProveedor,
  canCreate = true, canEdit = true,
}: Props) {
  const [proveedores, setProveedores] = useState<string[]>(PROVEEDORES_INIT);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "view"; orden?: OrdenCompra } | null>(null);
  const [recepcionOrden, setRecepcionOrden] = useState<OrdenCompra | null>(null);
  const [sendConfirm, setSendConfirm] = useState<OrdenCompra | null>(null);
  const [anularConfirm, setAnularConfirm] = useState<OrdenCompra | null>(null);

  const filtered = useMemo(() =>
    ordenes.filter(o => {
      const q = search.toLowerCase();
      return !q || o.id.includes(q) || o.proveedor.toLowerCase().includes(q);
    }),
    [ordenes, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const getFactura = (oid: string) => gestiones.find(g => g.ordenId === oid && g.numeroFactura);

  const handleGuardarOrden = (data: OrdenFormData) => {
    if (modal?.mode === "create") {
      const n: OrdenCompra = { id: nextOrdenId(ordenes), ...data };
      setOrdenes(p => [n, ...p]);
      toast.success(`OC ${n.id} guardada como ${data.estado}`);
    } else if (modal?.mode === "edit" && modal.orden) {
      setOrdenes(p => p.map(o => o.id === modal.orden!.id ? { ...o, ...data } : o));
      toast.success(`OC ${modal.orden.id} actualizada`);
    }
    setModal(null);
  };

  const handleNuevoProveedorLocal = (nombre: string, telefono: string): string => {
    if (!proveedores.includes(nombre)) setProveedores(p => [...p, nombre]);
    onNuevoProveedor?.(nombre, telefono);
    return nombre;
  };

  const handleEnviarOrden = (o: OrdenCompra) => {
    setOrdenes(p => p.map(x => x.id === o.id ? { ...x, estado: "Enviado" as EstadoOrden } : x));
    setSendConfirm(null);
    toast.success(`OC ${o.id} enviada al proveedor`);
  };

  const handleAnularOrden = (o: OrdenCompra) => {
    setOrdenes(p => p.map(x => x.id === o.id ? { ...x, estado: "Anulado" as EstadoOrden } : x));
    setAnularConfirm(null);
    setRecepcionOrden(null);
    toast.success(`OC ${o.id} anulada`);
  };

  const handleGuardarRecepcion = (o: OrdenCompra, rec: Recepcion) => {
    setOrdenes(p => p.map(x => x.id === o.id ? { ...x, estado: "Completado" as EstadoOrden, recepcion: rec } : x));
    const gc: GestionCompra = {
      id: nextGestionId(gestiones),
      ordenId: o.id,
      numeroFactura: "",
      fechaFactura: "",
      valorTotal: 0,
      estado: "En Proceso",
    };
    setGestiones(p => [...p, gc]);
    if (setInsumos) {
      setInsumos(prev => {
        const next = [...prev];
        [...rec.items, ...rec.itemsExtra].forEach(item => {
          if (item.cantidadRecibida <= 0) return;
          const idx = next.findIndex(i => i.nombre.toLowerCase() === item.nombre.toLowerCase());
          if (idx >= 0) {
            next[idx] = { ...next[idx], stockActual: next[idx].stockActual + item.cantidadRecibida };
          }
        });
        return next;
      });
    }
    setRecepcionOrden(null);
    toast.success(`OC ${o.id} completada · Registra la factura en Gestión de Compras`);
  };

  const handleDownload = () => {
    const rows: string[][] = [
      ["N° OC", "Proveedor", "Estado", "Fecha", "Nombre Insumo", "Cantidad", "Unidad", "P. Unitario", "Subtotal"],
    ];
    ordenes.forEach(o => {
      if (!o.items.length) {
        rows.push([o.id, o.proveedor, o.estado, o.fecha, "", "", "", "", ""]);
      } else {
        o.items.forEach(i => rows.push([
          o.id, o.proveedor, o.estado, o.fecha,
          i.nombre, String(i.cantidad), i.unidad,
          String(i.precioUnitario), String(i.cantidad * i.precioUnitario),
        ]));
      }
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ordenes_compra.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV descargado");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
            Órdenes de Compra
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Crea y gestiona las órdenes de compra a proveedores
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
              onClick={() => setModal({ mode: "create" })}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nueva Orden
            </button>
          )}
        </div>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por N° o proveedor..."
          className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["N° OC", "Proveedor", "Estado", "Fecha", "N° Factura", "Total", "Acciones"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center text-muted-foreground">
                      <p className="text-4xl mb-3">📋</p>
                      <p className="font-medium">No se encontraron órdenes</p>
                    </td>
                  </tr>
                )
                : paged.map(o => {
                  const factura = getFactura(o.id);
                  return (
                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 text-xs font-mono font-bold text-foreground">{o.id}</td>
                      <td className="px-4 py-3.5 text-sm text-foreground">{o.proveedor}</td>
                      <td className="px-4 py-3.5"><EstadoBadge e={o.estado} /></td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{o.fecha}</td>
                      <td className="px-4 py-3.5 text-xs">
                        {o.estado === "Completado"
                          ? factura?.numeroFactura
                            ? <span className="font-mono font-semibold text-emerald-700">{factura.numeroFactura}</span>
                            : <span className="text-amber-600 font-medium">Pendiente</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-foreground">
                        {fmtCOP(calcTotal(o.items))}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            onClick={() => setModal({ mode: "view", orden: o })}
                            title="Ver detalle"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {o.estado === "Borrador" && canEdit && (
                            <button
                              onClick={() => setModal({ mode: "edit", orden: o })}
                              title="Editar"
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 cursor-pointer transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {o.estado === "Borrador" && (
                            <button
                              onClick={() => setSendConfirm(o)}
                              title="Enviar a proveedor"
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 cursor-pointer transition-colors"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          {o.estado === "Enviado" && (
                            <button
                              onClick={() => setAnularConfirm(o)}
                              title="Anular"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 cursor-pointer transition-colors"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          {o.estado === "Completado" && (
                            <span className="p-1.5 text-muted-foreground/40" title="Orden bloqueada">
                              <Lock className="w-4 h-4" />
                            </span>
                          )}
                          {o.estado === "Enviado" && (
                            <button
                              onClick={() => setRecepcionOrden(o)}
                              title="Registrar recepción"
                              className="flex items-center gap-1.5 ml-0.5 px-2.5 py-1.5 rounded-lg border border-dashed border-blue-300 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 cursor-pointer transition-colors"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" /> Recibido
                            </button>
                          )}
                        </div>
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
        {modal && (
          <OrdenModal
            mode={modal.mode}
            orden={modal.orden}
            proveedores={proveedores}
            insumos={insumos}
            onClose={() => setModal(null)}
            onGuardar={handleGuardarOrden}
            onNuevoProveedor={handleNuevoProveedorLocal}
            onEnviarDesdeVista={o => setSendConfirm(o)}
            onAnularDesdeVista={o => setAnularConfirm(o)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {recepcionOrden && (
          <RecepcionModal
            orden={recepcionOrden}
            insumos={insumos}
            onGuardar={rec => handleGuardarRecepcion(recepcionOrden, rec)}
            onAnular={() => handleAnularOrden(recepcionOrden)}
            onClose={() => setRecepcionOrden(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sendConfirm && (
          <ConfirmModal
            title="¿Enviar Orden de Compra?"
            body={`Enviar OC ${sendConfirm.id} a ${sendConfirm.proveedor}.`}
            detail="No podrás editarla después del envío."
            confirmLabel="Enviar"
            icon={
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
            }
            onConfirm={() => handleEnviarOrden(sendConfirm)}
            onCancel={() => setSendConfirm(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {anularConfirm && (
          <ConfirmModal
            title="Anular Orden"
            body={`¿Deseas anular la OC ${anularConfirm.id}?`}
            detail="Esta acción no puede revertirse."
            confirmLabel="Anular"
            danger={true}
            icon={
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
            }
            onConfirm={() => handleAnularOrden(anularConfirm)}
            onCancel={() => setAnularConfirm(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
