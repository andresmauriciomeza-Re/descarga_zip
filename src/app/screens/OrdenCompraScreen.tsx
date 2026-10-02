import React, { useState, useMemo, useRef, useEffect } from "react";
import type { Insumo } from "./GestionInsumosScreen";
import { motion, AnimatePresence } from "motion/react";
import { CompactInsumoForm, UNIDADES } from "../components/CompactInsumoForm";
import { InsumosSolicitadosTable } from "../components/InsumosSolicitadosTable";
import { EstadoSelect, type EstadoOption } from "../components/EstadoSelect";
import { EstadoHistorialTooltip } from "../components/EstadoHistorialTooltip";
import {
  Plus, Search, Eye, Pencil, Trash2, X, ArrowLeft, ChevronLeft, ChevronRight,
  AlertCircle, Send, Ban, Check, ClipboardCheck,
  AlertTriangle, CheckCircle2, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { exportToExcel } from "../utils/exportExcel";
import { BotonDescargarExcel } from "../components/BotonDescargarExcel";

const SERIF = "var(--font-titulo)";
const PER_PAGE = 5;

// ��������� TYPES ���������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

export type EstadoOrden = "Borrador" | "Enviado" | "Completado" | "Anulado";
export type EstadoGestion = "Recibido" | "Anulado";

export interface OrdenItem {
  rowId: string;
  idInsumo: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  costoUnitario: number;
  precioUnitario: number;
  iva: number;
  /** true = insumo agregado en recepción (no venía en la OC original) */
  esNoSolicitado?: boolean;
}

export interface ItemRecibido {
  rowId: string;
  idInsumo: string;
  nombre: string;
  cantidadSolicitada: number;
  cantidadRecibida: number;
  unidad: string;
  precioReferencia: number;
  costoUnitario: number;
  precioUnitario: number;
  iva: number;
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
  historialEstados?: { estado: EstadoOrden; fechaHora: string }[];
}

export interface GestionCompra {
  id: string;
  ordenId: string;
  proveedor?: string;
  numeroFactura: string;
  fechaFactura: string;
  valorTotal: number;
  estado: EstadoGestion;
  items?: OrdenItem[];
  compraCreada?: boolean;
}

// ��������� CONSTANTS ������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

export interface ProveedorRef {
  nombre: string;
  nit: string;
  asesorComercial: string;
  telefono: string;
  email: string;
  direccion: string;
  estado: "activo" | "inactivo";
}

export const PROVEEDORES_INIT: ProveedorRef[] = [
  { nombre: "Molinos del Valle", nit: "830.115.220-1", asesorComercial: "Carlos Mejía", telefono: "604 444 1001", email: "compras@molinosvalle.co", direccion: "Cra 50 #30-10, Medellín", estado: "activo" },
  { nombre: "Lácteos La Esperanza", nit: "900.456.789-2", asesorComercial: "Ana Restrepo", telefono: "604 444 1002", email: "ventas@lacteosesperanza.co", direccion: "Cll 80 #45-20, Bello", estado: "activo" },
  { nombre: "Distribuidora Sur", nit: "811.033.445-3", asesorComercial: "Jorge Ríos", telefono: "604 444 1003", email: "contacto@distribuidorasur.co", direccion: "Av. 33 #76-60, Medellín", estado: "activo" },
  { nombre: "Carnes Premium", nit: "901.552.118-4", asesorComercial: "Luisa Palacio", telefono: "604 444 1004", email: "ventas@carnespremium.co", direccion: "Cra 65 #12-40, Itagüí", estado: "activo" },
  { nombre: "Verduras Express", nit: "103.245.667-5", asesorComercial: "Mariana Ospina", telefono: "604 444 1005", email: "pedidos@verdurasexpress.co", direccion: "Cll 10 #37-50, Medellín", estado: "activo" },
];

const ESTADO_CONFIG: Record<EstadoOrden, string> = {
  Borrador: "bg-gray-100 text-gray-700",
  Enviado: "bg-blue-100 text-blue-800",
  Completado: "bg-emerald-100 text-emerald-800",
  Anulado: "bg-red-100 text-red-800",
};

/**
 * La Orden de Compra solo avanza: desde cada estado se ofrecen los siguientes.
 * Los estados finales (Completado/Anulado) quedan con una única opción y el
 * selector deshabilitado.
 */
const ESTADOS_ADELANTE: Record<EstadoOrden, EstadoOrden[]> = {
  Borrador: ["Borrador", "Enviado", "Completado", "Anulado"],
  Enviado: ["Enviado", "Completado", "Anulado"],
  Completado: ["Completado"],
  Anulado: ["Anulado"],
};

/** Opciones del selector de estado de una orden, con el color de su badge. */
const opcionesEstado = (estado: EstadoOrden): EstadoOption<EstadoOrden>[] =>
  ESTADOS_ADELANTE[estado].map((e) => ({ value: e, label: e, color: ESTADO_CONFIG[e] }));

/**
 * Ancho compartido por los formularios de Orden de Compra y de Gestión de Compras,
 * para que ambos módulos se vean igual de compactos.
 */
export const FORM_MAXW = "max-w-4xl";

// ��������� INITIAL DATA ���������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

export const INITIAL_ORDENES: OrdenCompra[] = [
  {
    id: "001",
    proveedor: "Molinos del Valle",
    fecha: "2024-02-05",
    estado: "Enviado",
    items: [
      { rowId: "r1", idInsumo: "INS-001", nombre: "Harina de trigo", cantidad: 100, unidad: "kg", costoUnitario: 3500, precioUnitario: 3500, iva: 0 },
      { rowId: "r2", idInsumo: "INS-006", nombre: "Levadura", cantidad: 5000, unidad: "g", costoUnitario: 80, precioUnitario: 80, iva: 0 },
    ],
  },
  {
    id: "002",
    proveedor: "Lácteos La Esperanza",
    fecha: "2024-02-08",
    estado: "Enviado",
    items: [
      { rowId: "r3", idInsumo: "INS-002", nombre: "Queso mozzarella", cantidad: 20, unidad: "kg", costoUnitario: 18000, precioUnitario: 18000, iva: 0 },
      { rowId: "r4", idInsumo: "INS-005", nombre: "Aceite de oliva", cantidad: 10, unidad: "lt", costoUnitario: 15000, precioUnitario: 15000, iva: 0 },
    ],
  },
  {
    id: "003",
    proveedor: "Distribuidora Sur",
    fecha: "2024-02-10",
    estado: "Borrador",
    items: [
      { rowId: "r5", idInsumo: "INS-003", nombre: "Salsa de tomate", cantidad: 30, unidad: "lt", costoUnitario: 5000, precioUnitario: 5000, iva: 0 },
      { rowId: "r6", idInsumo: "INS-004", nombre: "Pepperoni", cantidad: 15, unidad: "kg", costoUnitario: 22000, precioUnitario: 22000, iva: 0 },
    ],
  },
  {
    id: "004",
    proveedor: "Carnes Premium",
    fecha: "2024-02-01",
    estado: "Completado",
    items: [
      { rowId: "r7", idInsumo: "INS-008", nombre: "Jamón serrano", cantidad: 10, unidad: "kg", costoUnitario: 28000, precioUnitario: 28000, iva: 0 },
    ],
    recepcion: {
      fechaRecepcion: "2024-02-02",
      usarLotes: false,
      items: [
        { rowId: "rr1", idInsumo: "INS-008", nombre: "Jamón serrano", cantidadSolicitada: 10, cantidadRecibida: 10, unidad: "kg", precioReferencia: 28000, costoUnitario: 28000, precioUnitario: 28000, iva: 0 },
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
      { rowId: "r8", idInsumo: "INS-007", nombre: "Champiñones", cantidad: 25, unidad: "kg", costoUnitario: 12000, precioUnitario: 12000, iva: 0 },
    ],
  },
];

export const INITIAL_GESTIONES: GestionCompra[] = [
  {
    id: "001",
    ordenId: "",
    proveedor: "Distribuidora La Cosecha",
    numeroFactura: "FAC-2026-0301",
    fechaFactura: "2026-08-05",
    valorTotal: 410000,
    estado: "Recibido",
    items: [
      { rowId: "g001-1", idInsumo: "INS-001", nombre: "Tomate", cantidad: 40, unidad: "kg", costoUnitario: 7500, precioUnitario: 7500, iva: 0 },
      { rowId: "g001-2", idInsumo: "INS-002", nombre: "Cebolla", cantidad: 10, unidad: "kg", costoUnitario: 6500, precioUnitario: 6500, iva: 0 },
      { rowId: "g001-3", idInsumo: "INS-003", nombre: "Papa", cantidad: 15, unidad: "kg", costoUnitario: 3000, precioUnitario: 3000, iva: 0 },
    ],
  },
  {
    id: "002",
    ordenId: "",
    proveedor: "Quesos del Norte S.A.S.",
    numeroFactura: "FAC-2026-0318",
    fechaFactura: "2026-08-19",
    valorTotal: 560000,
    estado: "Recibido",
    items: [
      { rowId: "g002-1", idInsumo: "INS-011", nombre: "Queso mozzarella", cantidad: 20, unidad: "kg", costoUnitario: 18000, precioUnitario: 18000, iva: 0 },
      { rowId: "g002-2", idInsumo: "INS-012", nombre: "Queso gouda", cantidad: 20, unidad: "kg", costoUnitario: 10000, precioUnitario: 10000, iva: 0 },
    ],
  },
  {
    id: "003",
    ordenId: "",
    proveedor: "Carnes Premium Ltda.",
    numeroFactura: "FAC-2026-0329",
    fechaFactura: "2026-09-01",
    valorTotal: 190000,
    estado: "Anulado",
    items: [
      { rowId: "g003-1", idInsumo: "INS-021", nombre: "Res madurada", cantidad: 25, unidad: "kg", costoUnitario: 7600, precioUnitario: 7600, iva: 0 },
    ],
  },
  {
    id: "004",
    ordenId: "",
    proveedor: "Bebidas y Más",
    numeroFactura: "FAC-2026-0347",
    fechaFactura: "2026-09-12",
    valorTotal: 275500,
    estado: "Recibido",
    items: [
      { rowId: "g004-1", idInsumo: "INS-031", nombre: "Gaseosa cola 1.5 L", cantidad: 60, unidad: "und", costoUnitario: 3200, precioUnitario: 3200, iva: 0 },
      { rowId: "g004-2", idInsumo: "INS-032", nombre: "Agua en bolsa 500 ml", cantidad: 100, unidad: "und", costoUnitario: 835, precioUnitario: 835, iva: 0 },
    ],
  },
  {
    id: "005",
    ordenId: "",
    proveedor: "Molinos del Valle",
    numeroFactura: "FAC-2026-0360",
    fechaFactura: "2026-09-20",
    valorTotal: 750000,
    estado: "Recibido",
    items: [
      { rowId: "g005-1", idInsumo: "INS-041", nombre: "Harina de trigo", cantidad: 50, unidad: "kg", costoUnitario: 6000, precioUnitario: 6000, iva: 0 },
      { rowId: "g005-2", idInsumo: "INS-042", nombre: "Azúcar rubia", cantidad: 25, unidad: "kg", costoUnitario: 5200, precioUnitario: 5200, iva: 0 },
      { rowId: "g005-3", idInsumo: "INS-043", nombre: "Aceite vegetal", cantidad: 32, unidad: "lt", costoUnitario: 10000, precioUnitario: 10000, iva: 0 },
    ],
  },
];

// ��������� HELPERS ������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

function fmtCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function calcTotal(items: OrdenItem[]) {
  return items.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0);
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
  // Fecha local, no UTC: `dt` se movió en hora local, así que `toISOString()`
  // lo convertía a UTC y en Colombia (UTC-5) devolvía el día anterior.
  return dt.toLocaleDateString("en-CA");
}

/** Formatea fecha/hora en formato: 30/09/2026 3:45 p. m. */
function formatearFechaHora(fechaHora: string): string {
  try {
    // "2026-10-01" (solo fecha) se parsea como UTC y en Colombia (UTC-5)
    // caería al día anterior a las 7 p. m.: se lee como hora local.
    const esSoloFecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaHora.trim());
    const d = esSoloFecha ? new Date(`${fechaHora.trim()}T00:00:00`) : new Date(fechaHora);
    if (isNaN(d.getTime())) return fechaHora;
    const fecha = d.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const hora = d.toLocaleTimeString("es-CO", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${fecha} ${hora}`;
  } catch {
    return fechaHora;
  }
}

/**
 * Cambia el estado de una orden dejando en el historial la marca de tiempo del
 * cambio: es la fecha/hora que muestra el detalle de la orden junto al badge.
 */
function conHistorial(o: OrdenCompra, estado: EstadoOrden): OrdenCompra {
  if (o.estado === estado) return o;
  return {
    ...o,
    estado,
    historialEstados: [
      ...(o.historialEstados ?? []),
      { estado, fechaHora: new Date().toISOString() },
    ],
  };
}

/**
 * Fecha CON hora del último cambio de estado (01/10/2026 8:35 p. m.), la que se
 * muestra bajo el badge en el listado. Las órdenes sin historial caen en su
 * fecha de creación.
 */
function fechaUltimoCambio(o: OrdenCompra): string {
  const historial = o.historialEstados ?? [];
  const ultimo = historial[historial.length - 1];
  return formatearFechaHora(ultimo ? ultimo.fechaHora : o.fecha);
}

// ��������� SHARED UI ��������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

function EstadoBadge({ e }: { e: EstadoOrden }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ESTADO_CONFIG[e]}`}>
      {e}
    </span>
  );
}

const iCls = "w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const sCls = `${iCls} appearance-none`;

// ��������� CONFIRM MODAL ������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

export function ConfirmModal({
  title, body, detail, confirmLabel = "Confirmar", danger = false, icon, onConfirm, onCancel, showMotivo = false, motivo, onMotivoChange,
}: {
  // `body` es opcional: hay confirmaciones que solo llevan `detail` como
  // advertencia (p. ej. "¿Está seguro de los cambios?"). Antes era obligatorio y
  // esas 3 llamadas fallaban el typecheck mientras en runtime pintaban un <p> vacío.
  title: string; body?: string; detail?: string; confirmLabel?: string;
  danger?: boolean; icon?: React.ReactNode; onConfirm: () => void; onCancel: () => void;
  showMotivo?: boolean; motivo?: string; onMotivoChange?: (value: string) => void;
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
        {body && <p className="text-sm text-muted-foreground mb-1 leading-relaxed">{body}</p>}
        {detail && (
          <p className={`text-sm font-semibold mb-5 ${danger ? "text-red-600" : "text-amber-600"}`}>{detail}</p>
        )}
        {!detail && <div className="mb-5" />}
        {showMotivo && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Motivo de anulación</label>
            <textarea
              value={motivo || ""}
              onChange={e => onMotivoChange?.(e.target.value)}
              placeholder="Escribe el motivo de la anulación..."
              className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              rows={3}
            />
          </div>
        )}
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

// ��������� NUEVO PROVEEDOR MODAL ������������������������������������������������������������������������������������������������������������������������������������������������������������

export function NuevoProveedorModal({
  onGuardar, onClose, nombreInicial = "",
}: {
  onGuardar: (p: ProveedorRef) => void;
  onClose: () => void;
  nombreInicial?: string;
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [nit, setNit] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [asesorComercial, setAsesorComercial] = useState("");
  const [direccion, setDireccion] = useState("");
  const [estado, setEstado] = useState<ProveedorRef["estado"]>("activo");

  const submit = () => {
    if (!nombre.trim()) { toast.error("El nombre es obligatorio."); return; }
    if (!nit.trim()) { toast.error("El NIT es obligatorio."); return; }
    if (!telefono.trim()) { toast.error("El teléfono es obligatorio."); return; }
    if (!email.trim()) { toast.error("El email es obligatorio."); return; }
    onGuardar({
      nombre: nombre.trim(),
      nit: nit.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      asesorComercial: asesorComercial.trim(),
      direccion: direccion.trim(),
      estado,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-card rounded-2xl w-full max-w-2xl shadow-2xl border border-border my-4"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Nuevo Proveedor</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Completa la información de contacto del proveedor.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
              Identificación del proveedor
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">NIT *</label>
                <input value={nit} onChange={e => setNit(e.target.value)} placeholder="900.123.456-1" className={iCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nombre *</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus placeholder="Nombre del proveedor" className={iCls} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
              Contacto
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Asesor comercial</label>
                <input value={asesorComercial} onChange={e => setAsesorComercial(e.target.value)} placeholder="Ej: Carlos Mejía" className={iCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Teléfono *</label>
                <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="604 321 0001" className={iCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ventas@proveedor.co" className={iCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Dirección</label>
                <input value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Cra 50 #30-10, Medellín" className={iCls} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border">
              Configuración
            </p>
            <div className="w-full sm:w-1/2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Estado</label>
              <EstadoSelect<ProveedorRef["estado"]>
                value={estado}
                onChange={setEstado}
                options={[
                  { value: "activo", label: "Activo", color: "bg-emerald-100 text-emerald-800" },
                  { value: "inactivo", label: "Inactivo", color: "bg-red-100 text-red-700" },
                ]}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
            Cancelar
          </button>
          <button onClick={submit} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all">
            Crear Proveedor
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ��������� ORDEN MODAL ������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

export interface OrdenFormData {
  proveedor: string;
  fecha: string;
  estado: EstadoOrden | EstadoGestion;
  items: OrdenItem[];
  numeroFactura?: string;
}

export function OrdenModal({
  mode, orden, proveedores, insumos, tipo = "orden", fullPage = false, onClose, onGuardar, onNuevoProveedor,
}: {
  mode: "create" | "edit" | "view";
  orden?: OrdenCompra;
  proveedores: ProveedorRef[];
  insumos: Insumo[];
  /** "orden" = Orden de Compra · "compra" = Compra (Gestión de Compra) */
  tipo?: "orden" | "compra";
  /** Renderiza el formulario como una página independiente en vez de modal. */
  fullPage?: boolean;
  onClose: () => void;
  onGuardar: (d: OrdenFormData) => void;
  onNuevoProveedor: (p: ProveedorRef) => string;
}) {
  const isView = mode === "view";
  const isCompra = tipo === "compra";
  const isPage = fullPage;
  // Fecha local, no UTC: `toISOString()` en Colombia (UTC-5) después de las 19:00
  // daba el día siguiente, y `today` es el `max` del date-picker de vencimiento.
  const today = new Date().toLocaleDateString("en-CA");

  const [form, setForm] = useState<OrdenFormData>({
    proveedor: orden?.proveedor ?? "",
    fecha: orden?.fecha ?? today,
    estado: isCompra
      ? "Recibido"
      : (orden?.estado === "Enviado" ? "Enviado" : "Borrador"),
    items: orden?.items.map(i => ({ ...i })) ?? [],
    numeroFactura: "",
  });
  const pf = (p: Partial<OrdenFormData>) => setForm(f => ({ ...f, ...p }));

  const [showNuevoProv, setShowNuevoProv] = useState(false);
  const [showSendConf, setShowSendConf] = useState(false);

  // Historial de cambios de estado
  const [estadoHistorial, setEstadoHistorial] = useState<{ estado: EstadoOrden; fecha: string }[]>(() => {
    if (orden?.estado) {
      return [{ estado: orden.estado, fecha: orden.fecha }];
    }
    return [{ estado: "Borrador" as EstadoOrden, fecha: today }];
  });

  // Buscador de proveedor (autocomplete por nombre, NIT, asesor o email)
  const [provQuery, setProvQuery] = useState(mode === "create" ? "" : (orden?.proveedor ?? ""));
  const [showProvSug, setShowProvSug] = useState(false);
  const provRef = useRef<HTMLDivElement>(null);

  const provSugs = useMemo(() => {
    const q = provQuery.trim().toLowerCase();
    const base = q
      ? proveedores.filter(p =>
          p.nombre.toLowerCase().includes(q) ||
          p.nit.toLowerCase().includes(q) ||
          p.asesorComercial.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
        )
      : proveedores;
    return base.slice(0, 3);
  }, [proveedores, provQuery]);

  const provExiste = useMemo(
    () => provSugs.length > 0,
    [provSugs]
  );

  const [aNombre, setANombre] = useState("");
  const [aCant, setACant] = useState(1);
  const [aUnidad, setAUnidad] = useState(UNIDADES[0]);
  const [aPrecio, setAPrecio] = useState(0);
  const [aIva, setAIva] = useState(0);
  const [aFromCat, setAFromCat] = useState(false);
  // Id del insumo elegido del catálogo. Antes `addItem` fabricaba
  // `idInsumo: INS-${Date.now()}`, un id que no existía en el catálogo: se perdía
  // el enlace que Recepción usa para no volver a ofrecer un insumo ya recibido y
  // para agrupar las líneas por insumo.
  const [aInsumoId, setAInsumoId] = useState("");
  const [aShowSug, setAShowSug] = useState(false);
  const sugRef = useRef<HTMLDivElement>(null);

  // ������ Validación en tiempo real (patrón de MiPerfilScreen) ������������������������������������������������������
  const [tocado, setTocado] = useState({ proveedor: false, fecha: false });
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  // En "compra" el estado siempre trae un valor por defecto.
  const errorProveedor = form.proveedor.trim()
    ? undefined
    : "Selecciona o crea un proveedor.";
  const errorFecha = form.fecha ? undefined : "Selecciona la fecha de la orden.";
  const errorNumeroFactura =
    isCompra && !form.numeroFactura?.trim()
      ? "El número de factura es obligatorio."
      : undefined;
  const errorItems = form.items.length > 0 ? undefined : "Agrega al menos un insumo a la orden.";

  const formValido =
    !errorProveedor && !errorFecha && !errorNumeroFactura && !errorItems && !!form.estado;
  const algunoTocado = tocado.proveedor || tocado.fecha;
  const marcarTocado = (campo: "proveedor" | "fecha") =>
    setTocado((t) => ({ ...t, [campo]: true }));

  /** Clase del input: resalta en rojo cuando el campo visible es inválido. */
  const campoCls = (error?: string) =>
    `${iCls} transition-colors ${error ? "border-red-400 focus:ring-red-300" : ""}`;

  const suggestions = useMemo(() => {
    const soloInsumos = insumos.filter(i => (i.tipo ?? "Insumo") === "Insumo" && i.estado === "activo");
    if (aNombre.trim().length === 0) return soloInsumos.slice(0, 3);
    return soloInsumos.filter(i => i.nombre.toLowerCase().includes(aNombre.toLowerCase())).slice(0, 3);
  }, [insumos, aNombre]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (sugRef.current && !sugRef.current.contains(e.target as Node)) setAShowSug(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (provRef.current && !provRef.current.contains(e.target as Node)) setShowProvSug(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const selectSug = (ins: Insumo) => {
    setANombre(ins.nombre);
    setAUnidad(UNIDADES.includes(ins.unidadMedida) ? ins.unidadMedida : UNIDADES[0]);
    setAPrecio(ins.precioUnitario);
    setAIva(ins.iva);
    setAInsumoId(ins.id);
    setAFromCat(true);
    setAShowSug(false);
  };

  const addItem = () => {
    if (!aNombre.trim()) { toast.error("Ingresa el nombre del insumo."); return; }
    if (form.items.some(i => i.nombre.toLowerCase() === aNombre.trim().toLowerCase())) {
      toast.error("Este insumo ya está en la orden.");
      return;
    }
    // Se conserva el id del catálogo cuando la línea viene de una sugerencia; si
    // el nombre se escribió a mano se genera uno secuencial. `Date.now()` no sirve
    // como id de fila: dos additions en el mismo milisegundo colisionaban.
    const nextRow = form.items.reduce((max, i) => {
      const n = parseInt(i.rowId.replace(/^r/, ""), 10);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0) + 1;
    pf({
      items: [...form.items, {
        rowId: `r${nextRow}`,
        idInsumo: aInsumoId || `INS-M-${nextRow}`,
        nombre: aNombre.trim(),
        cantidad: aCant,
        unidad: aUnidad,
        costoUnitario: aPrecio,
        precioUnitario: aPrecio,
        iva: aIva,
      }],
    });
    setANombre(""); setACant(1); setAPrecio(0); setAIva(0); setAFromCat(false); setAInsumoId("");
  };

  const selectProv = (p: ProveedorRef) => {
    setProvQuery(p.nombre);
    pf({ proveedor: p.nombre });
    setShowProvSug(false);
  };

  const handleNuevoProv = (p: ProveedorRef) => {
    const nombre = onNuevoProveedor(p);
    setProvQuery(nombre);
    pf({ proveedor: nombre });
    setShowNuevoProv(false);
    toast.success(`Proveedor "${nombre}" creado`);
  };

  const handleGuardar = () => {
    setIntentoGuardar(true);

    if (!form.proveedor.trim()) { toast.error("Selecciona o crea un proveedor."); return; }
    if (!form.fecha) { toast.error("Selecciona la fecha de la orden."); return; }
    if (isCompra && !form.numeroFactura?.trim()) { toast.error("El número de factura es obligatorio."); return; }
    if (form.items.length === 0) { toast.error("Agrega al menos un insumo."); return; }
    onGuardar(form);
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
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="text-base font-bold text-foreground" style={{ fontFamily: SERIF }}>
                  {mode === "create"
                    ? (isCompra ? "Nueva Compra" : "Nueva Orden de Compra")
                    : mode === "edit" ? `Editar OC ${orden?.id}` : `Orden ${orden?.id}`}
                </h3>
                {orden && (
                  <p className="text-xs text-muted-foreground mt-0.5">{orden.proveedor} · {orden.fecha}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isView && orden && <EstadoBadge e={orden.estado} />}
                {isPage ? (
                  <button onClick={onClose} title="Volver" className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
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
                  Orden enviada al proveedor. Pendiente de Recepción.
                </div>
              )}
              {isView && orden?.estado === "Anulado" && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                  <Ban className="w-4 h-4 shrink-0" />
                  Esta orden ha sido anulada.
                </div>
              )}

              {/* Fields */}
              <div className="grid grid-cols-2 gap-4 shrink-0">
                {isCompra && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Número de factura <span className="text-red-500">*</span></label>
                    {isView
                      ? <p className="text-sm font-semibold text-foreground py-2">{form.numeroFactura || "—"}</p>
                      : (
                        <input
                          value={form.numeroFactura ?? ""}
                          onChange={e => pf({ numeroFactura: e.target.value })}
                          onBlur={() => setIntentoGuardar(true)}
                          placeholder="Ej: FAC-2024-0001"
                          className={campoCls(intentoGuardar ? errorNumeroFactura : undefined)}
                          aria-invalid={!!(intentoGuardar && errorNumeroFactura)}
                        />
                      )}
                    {!isView && intentoGuardar && errorNumeroFactura && (
                      <p className="text-xs text-red-500 mt-1 ml-0.5">{errorNumeroFactura}</p>
                    )}
                  </div>
                )}
                {orden?.id && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">N· Orden</label>
                    <input value={orden.id} readOnly className={`${iCls} opacity-60 cursor-default`} />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Proveedor {!isView && <span className="text-red-500">*</span>}</label>
                  {isView
                    ? <p className="text-sm font-semibold text-foreground py-2">{form.proveedor}</p>
                    : (
                      <div className="relative" ref={provRef}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input
                          value={provQuery}
                          onChange={e => {
                            setProvQuery(e.target.value);
                            pf({ proveedor: e.target.value });
                            setShowProvSug(true);
                          }}
                          onFocus={() => setShowProvSug(true)}
                          onBlur={() => marcarTocado("proveedor")}
                          placeholder="Buscar por nombre, NIT, asesor o email..."
                          className={`${campoCls((tocado.proveedor || intentoGuardar) ? errorProveedor : undefined)} pl-10`}
                          aria-invalid={!!((tocado.proveedor || intentoGuardar) && errorProveedor)}
                        />
                        {showProvSug && (
                          <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden">
                            {/* Opción "+ Crear proveedor" PRIMERA */}
                            <button
                              type="button"
                              onMouseDown={e => { e.preventDefault(); setShowProvSug(false); setShowNuevoProv(true); }}
                              className="w-full text-left px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary/10 cursor-pointer inline-flex items-center gap-2 border-b border-border"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Crear proveedor {provQuery.trim() && `"${provQuery.trim()}"`}
                            </button>
                            <hr className="my-0.5 border-border" />
                            {/* Resultados - máximo 3 */}
                            {provSugs.slice(0, 3).map(p => (
                              <button
                                key={p.nit}
                                type="button"
                                onMouseDown={() => selectProv(p)}
                                className={`w-full text-left px-3 py-2.5 text-xs hover:bg-muted cursor-pointer border-b border-border last:border-0 ${form.proveedor === p.nombre ? "bg-muted/60" : ""}`}
                              >
                                <p className="font-semibold text-foreground flex items-center gap-1.5">
                                  {p.nombre}
                                  {form.proveedor === p.nombre && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                </p>
                                <p className="text-muted-foreground">
                                  NIT {p.nit}
                                  {p.asesorComercial && <> · Asesor: {p.asesorComercial}</>}
                                </p>
                              </button>
                            ))}
                            {provSugs.length === 0 && (
                              <div className="px-3 py-2.5 text-xs text-muted-foreground text-center border-b border-border">
                                Sin resultados
                              </div>
                            )}
                            {provSugs.length > 3 && (
                              <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                                +{provSugs.length - 3} más...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  {!isView && (tocado.proveedor || intentoGuardar) && errorProveedor && (
                    <p className="text-xs text-red-500 mt-1 ml-0.5">{errorProveedor}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Fecha {!isView && <span className="text-red-500">*</span>}</label>
                  {isView
                    ? <p className="text-sm font-semibold text-foreground py-2">{form.fecha}</p>
                    : (
                      <input
                        type="date"
                        value={form.fecha}
                        onChange={e => pf({ fecha: e.target.value })}
                        onBlur={() => marcarTocado("fecha")}
                        readOnly
                        className={campoCls((tocado.fecha || intentoGuardar) ? errorFecha : undefined)}
                        aria-invalid={!!((tocado.fecha || intentoGuardar) && errorFecha)}
                      />
                    )}
                  {!isView && (tocado.fecha || intentoGuardar) && errorFecha && (
                    <p className="text-xs text-red-500 mt-1 ml-0.5">{errorFecha}</p>
                  )}
                </div>
                {!isView && (
                  <div onMouseDown={() => setShowProvSug(false)}>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Estado <span className="text-red-500">*</span></label>
                    {/* z-40: el desplegable de autocompletar del Proveedor (z-30) se
                        despliega hacia abajo y cubre este campo; sin este z-index el
                        clic lo absorbía ese desplegable y el menú no se abría. */}
                    <EstadoSelect
                      value={form.estado}
                      onChange={(nuevoEstado) => {
                        setEstadoHistorial(prev => [...prev, { estado: nuevoEstado as EstadoOrden, fecha: today }]);
                        pf({ estado: nuevoEstado });
                      }}
                      options={(
                        isCompra
                          ? [
                              { value: "Recibido" as EstadoGestion, label: "Recibido", color: "bg-emerald-100 text-emerald-800" },
                              { value: "Anulado" as EstadoGestion, label: "Anulado", color: "bg-red-100 text-red-800" },
                            ]
                          : opcionesEstado(form.estado as EstadoOrden)
                      )}
                      className="relative z-40"
                    />
                    {estadoHistorial.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {estadoHistorial[estadoHistorial.length - 1].fecha}
                      </p>
                    )}
                    {mode !== "create" && (
                      <button
                        type="button"
                        onClick={() => {
                          // Mostrar historial completo
                          alert(estadoHistorial.map(h => `${h.estado} - ${h.fecha}`).join('\n'));
                        }}
                        className="text-[11px] text-primary hover:underline mt-0.5"
                      >
                        Ver historial
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Agregar insumo */}
              {!isView && (
                <div className="shrink-0">
                  <CompactInsumoForm
                    containerRef={sugRef}
                    titulo="Agregar insumo"
                    nombre={aNombre}
                    onNombreChange={(value) => {
                      setANombre(value);
                      setAFromCat(false);
                      // El nombre ya no coincide con la sugerencia elegida, así que
                      // la línea deja de estar ligada a ese insumo del catálogo.
                      setAInsumoId("");
                      setAShowSug(true);
                    }}
                    onNombreFocus={() => setAShowSug(true)}
                    cantidad={aCant}
                    onCantidadChange={setACant}
                    unidad={aUnidad}
                    onUnidadChange={setAUnidad}
                    unidadDisabled={aFromCat}
                    precio={aPrecio}
                    onPrecioChange={setAPrecio}
                    iva={aIva}
                    onIvaChange={setAIva}
                    onAgregar={addItem}
                    suggestions={suggestions}
                    showSuggestions={aShowSug}
                    onSelectSuggestion={(suggestion) => selectSug(suggestion as Insumo)}
                  />
                </div>
              )}

              {!isView && errorItems && (algunoTocado || intentoGuardar) && (
                <p className="text-xs text-red-500 ml-0.5 shrink-0">{errorItems}</p>
              )}

              {/* Items table */}
              <InsumosSolicitadosTable
                items={form.items}
                showActions={!isView}
                onRemove={!isView ? (rowId) => pf({ items: form.items.filter((i) => i.rowId !== rowId) }) : undefined}
                onUpdate={!isView ? (rowId, patch) => pf({ items: form.items.map(i => i.rowId === rowId ? { ...i, ...patch } : i) }) : undefined}
                className={isPage ? "flex-1 min-h-0" : ""}
              />

              {/* Recepcion detail ��� acumulado de todas las facturas de la OC */}
              {isView && orden?.recepcion && (
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
                          <td className="px-3 py-2">{fmtCOP(item.costoUnitario)}</td>
                          <td className="px-3 py-2 font-semibold">{fmtCOP(item.cantidadRecibida * item.costoUnitario)}</td>
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
                            (s, i) => s + i.cantidadRecibida * i.costoUnitario, 0
                          ))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Footer ��� solo en creación; en detalle se cierra con la X del encabezado */}
            {!isView && (
              <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={!formValido}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
                >
                  Guardar
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showNuevoProv && (
          <NuevoProveedorModal
            nombreInicial={provQuery.trim()}
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

// ��������� NUEVA ORDEN COMPRA ��� PÁGINA INDEPENDIENTE ���������������������������������������������������������������������������������������������

interface NuevaOrdenCompraPageProps {
  ordenes: OrdenCompra[];
  setOrdenes: React.Dispatch<React.SetStateAction<OrdenCompra[]>>;
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  insumos: Insumo[];
  onNuevoProveedor?: (p: ProveedorRef) => void;
  onBack: () => void;
}

export function NuevaOrdenCompraPage({
  ordenes,
  setOrdenes,
  proveedores,
  setProveedores,
  insumos,
  onNuevoProveedor,
  onBack,
}: NuevaOrdenCompraPageProps) {
  const handleGuardar = (data: OrdenFormData) => {
    const nueva: OrdenCompra = {
      id: nextOrdenId(ordenes),
      proveedor: data.proveedor,
      fecha: data.fecha,
      estado: data.estado as EstadoOrden,
      items: data.items,
    };

    setOrdenes(prev => [nueva, ...prev]);
    toast.success(`OC ${nueva.id} guardada como ${nueva.estado}`);
    onBack();
  };

  const handleNuevoProveedor = (p: ProveedorRef) => {
    if (!proveedores.some(x => x.nombre.toLowerCase() === p.nombre.toLowerCase())) {
      setProveedores(prev => [...prev, p]);
    }
    onNuevoProveedor?.(p);
    return p.nombre;
  };

  return (
    <OrdenModal
      mode="create"
      tipo="orden"
      proveedores={proveedores}
      insumos={insumos}
      onClose={onBack}
      onGuardar={handleGuardar}
      onNuevoProveedor={handleNuevoProveedor}
    />
  );
}

// ��������� RECEPCION MODAL ������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

function RecepcionModal({
  orden, insumos, onGuardar, onAnular, onClose,
}: {
  orden: OrdenCompra;
  insumos: Insumo[];
  onGuardar: (rec: Recepcion) => void;
  onAnular: () => void;
  onClose: () => void;
}) {
  // Fecha local, no UTC (en Colombia tras las 19:00 `toISOString()` daba mañana).
  const today = new Date().toLocaleDateString("en-CA");

  type ItemRow = ItemRecibido & { malEstado: boolean };

  const [items, setItems] = useState<ItemRow[]>(() =>
    orden.items.map(i => ({
      rowId: i.rowId,
      idInsumo: i.idInsumo,
      nombre: i.nombre,
      cantidadSolicitada: i.cantidad,
      cantidadRecibida: i.cantidad,
      unidad: i.unidad,
      precioReferencia: i.costoUnitario,
      costoUnitario: i.costoUnitario,
      precioUnitario: i.precioUnitario,
      iva: i.iva,
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
    setItems(p => p.map(i => i.rowId === rowId ? { ...i, costoUnitario: v } : i));
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
      costoUnitario: exPrecio, precioUnitario: exPrecio, iva: 0
    }]);
    setExNombre(""); setExCant(1); setExPrecio(0);
  };

  const hayMal = items.some(i => i.malEstado);
  const totalRec = [...items, ...itemsExtra].reduce(
    (s, i) => s + i.cantidadRecibida * i.costoUnitario, 0
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
                    Hay insumos marcados en <strong>mal estado</strong>. Puede anular la OC o continuar con Recepción parcial.
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
                                type="number" min={0} value={item.costoUnitario}
                                onChange={e => updPrice(item.rowId, Number(e.target.value))}
                                className="w-28 px-2 py-1 bg-background border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-sm font-semibold">
                              {fmtCOP(item.cantidadRecibida * item.costoUnitario)}
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
                            <td className="px-3 py-2">{fmtCOP(item.costoUnitario)}</td>
                            <td className="px-3 py-2 font-semibold">
                              {fmtCOP(item.cantidadRecibida * item.costoUnitario)}
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
                              setExPrecio(ins.costoUnitario);
                              setExShowSug(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted cursor-pointer border-b border-border last:border-0"
                          >
                            <p className="font-semibold text-foreground">{ins.nombre}</p>
                            <p className="text-muted-foreground">
                              {ins.unidadMedida} · ${ins.costoUnitario.toLocaleString("es-CO")}
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
                    Asigna fecha de vencimiento automática (Recepción + 7 días)
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
                        {["Insumo", "Cant. recibida", "Fecha Recepción", "Fecha vencimiento"].map(h => (
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
            title="¿Está seguro de los cambios?"
            detail="Una vez guardado no se podrá modificar."
            confirmLabel="Confirmar"
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
            title="-+Anular Orden de Compra?"
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

// ��������� MAIN SCREEN ������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������������

interface Props {
  ordenes: OrdenCompra[];
  setOrdenes: React.Dispatch<React.SetStateAction<OrdenCompra[]>>;
  gestiones: GestionCompra[];
  setGestiones: React.Dispatch<React.SetStateAction<GestionCompra[]>>;
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  insumos: Insumo[];
  setInsumos?: React.Dispatch<React.SetStateAction<Insumo[]>>;
  onNuevoProveedor?: (p: ProveedorRef) => void;
  onAbrirRecepcion?: (orden: OrdenCompra) => void;
  onVerDetalle: (orden: OrdenCompra) => void;
  onNuevaOrden: () => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExportExcel?: boolean;
}

export function OrdenCompraScreen({
  ordenes, setOrdenes, gestiones, setGestiones,
  proveedores, setProveedores,
  insumos, setInsumos, onNuevoProveedor, onAbrirRecepcion, onVerDetalle, onNuevaOrden,
  canCreate = true, canEdit = true,
  canExportExcel = true,
}: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "view"; orden?: OrdenCompra } | null>(null);
  const [recepcionOrden, setRecepcionOrden] = useState<OrdenCompra | null>(null);
  const [sendConfirm, setSendConfirm] = useState<OrdenCompra | null>(null);
  const [anularConfirm, setAnularConfirm] = useState<OrdenCompra | null>(null);
  const [estadoConfirm, setEstadoConfirm] = useState<{ id: string; from: EstadoOrden; next: EstadoOrden } | null>(null);

  const getFacturas = (oid: string) => gestiones.filter((g) => g.ordenId === oid && (g.numeroFactura ?? "") !== "");

  const filtered = useMemo(() =>
    ordenes.filter(o => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const facturas = getFacturas(o.id);
      const facturasTexto = facturas.map(f => f.numeroFactura ?? "").join(" ");
      return (o.proveedor ?? "").toLowerCase().includes(q)
        || facturasTexto.toLowerCase().includes(q)
        || (o.estado ?? "").toLowerCase().includes(q)
        || (o.fecha ?? "").toLowerCase().includes(q);
    }),
    [ordenes, search, gestiones]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  /** Facturas (compras) registradas para una orden. */
  const facturasDeOrden = (oid: string) => gestiones.filter((g) => g.ordenId === oid);

  /** Ids de insumos ya registrados en compras no anuladas de la orden. */
  const registradosEnOrden = (oid: string) => {
    const set = new Set<string>();
    for (const g of gestiones) {
      if (g.ordenId !== oid) continue;
      if (g.estado === "Anulado") continue;
      for (const it of g.items ?? []) set.add(it.idInsumo);
    }
    return set;
  };

  const handleGuardarOrden = (data: OrdenFormData) => {
    if (modal?.mode === "create") {
      const n: OrdenCompra = {
        id: nextOrdenId(ordenes),
        proveedor: data.proveedor,
        fecha: data.fecha,
        estado: data.estado as EstadoOrden,
        items: data.items,
      };
      setOrdenes(p => [n, ...p]);
      toast.success(`OC ${n.id} guardada como ${n.estado}`);
    } else if (modal?.mode === "edit" && modal.orden) {
      setOrdenes(p => p.map(o => o.id === modal.orden!.id
        ? { ...o, proveedor: data.proveedor, fecha: data.fecha, estado: data.estado as EstadoOrden, items: data.items }
        : o));
      toast.success(`OC ${modal.orden.id} actualizada`);
    }
    setModal(null);
  };

  const handleNuevoProveedorLocal = (p: ProveedorRef): string => {
    if (!proveedores.some(x => x.nombre.toLowerCase() === p.nombre.toLowerCase())) {
      setProveedores(prev => [...prev, p]);
    }
    onNuevoProveedor?.(p);
    return p.nombre;
  };

  const handleEnviarOrden = (o: OrdenCompra) => {
    setOrdenes(p => p.map(x => x.id === o.id ? conHistorial(x, "Enviado") : x));
    setSendConfirm(null);
    toast.success(`OC ${o.id} enviada al proveedor`);
  };

  const handleAnularOrden = (o: OrdenCompra) => {
    setOrdenes(p => p.map(x => x.id === o.id ? conHistorial(x, "Anulado") : x));

    // Anular la orden anula también sus facturas: la compra queda cerrada y no
    // vuelve al estado "Recibido".
    const anuladas = facturasDeOrden(o.id);

    if (anuladas.length > 0) {
      setGestiones(p => p.map(g => g.ordenId === o.id ? { ...g, estado: "Anulado" as EstadoGestion } : g));
    }

    setAnularConfirm(null);
    setRecepcionOrden(null);
    toast.success(
      anuladas.length > 0
        ? `OC ${o.id} y sus compras anuladas`
        : `OC ${o.id} anulada`
    );
  };

  const handleCambiarEstado = (id: string, next: EstadoOrden) => {
    setOrdenes(p => p.map(x => x.id === id ? conHistorial(x, next) : x));
    setEstadoConfirm(null);
    toast.success(`Estado cambiado a: ${next}`);
  };

  const handleGuardarRecepcion = (o: OrdenCompra, rec: Recepcion) => {
    // Usar la misma lógica que registradosEnOrden pero inline
    const registradosAhora = new Set<string>();
    for (const g of gestiones) {
      if (g.ordenId !== o.id) continue;
      if (g.estado === "Anulado") continue;
      for (const it of g.items ?? []) registradosAhora.add(it.idInsumo);
    }
    [...rec.items, ...rec.itemsExtra].forEach(item => {
      if (item.cantidadRecibida > 0) registradosAhora.add(item.idInsumo);
    });
    const pendientes = o.items.filter(item => !registradosAhora.has(item.idInsumo));
    const estadoFinal = pendientes.length === 0 ? "Completado" as EstadoOrden : o.estado;

    setOrdenes(p => p.map(x => x.id === o.id
      ? conHistorial({ ...x, recepcion: rec }, estadoFinal)
      : x));
    
    const gc: GestionCompra = {
      id: nextGestionId(gestiones),
      ordenId: o.id,
      numeroFactura: "",
      fechaFactura: "",
      valorTotal: 0,
      estado: "Recibido",
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
    toast.success(`OC ${o.id} ${estadoFinal === "Completado" ? "completada" : "actualizada"} · Registra la factura en Gestión de Compras`);
  };

  const handleDownload = () => {
    exportToExcel(
      filtered.map(o => ({
        proveedor: o.proveedor,
        fecha: o.fecha,
        numeroFactura: getFacturas(o.id).map(f => f.numeroFactura).join(", ") || "—",
        total: fmtCOP(calcTotal(o.items)),
        estado: o.estado,
      })),
      [
        { key: "proveedor", label: "Proveedor" },
        { key: "fecha", label: "Fecha" },
        { key: "numeroFactura", label: "N° Factura" },
        { key: "total", label: "Total" },
        { key: "estado", label: "Estado" },
      ],
      "ordenes-de-compra"
    );
    toast.success("Excel descargado");
  };

  return (
    <div className="px-6 pt-5 pb-4 max-w-6xl mx-auto h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-4 mb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
            Órdenes de Compra
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Crea y gestiona las Órdenes de compra a proveedores
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExportExcel && <BotonDescargarExcel onClick={handleDownload} />}
          {canCreate && (
            <button
              onClick={onNuevaOrden}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Crear Orden
            </button>
          )}
        </div>
      </div>

      <div className="relative mb-4 max-w-sm shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por proveedor, fecha, N° factura o estado..."
          className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-3">
        <div className="overflow-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["Proveedor", "Fecha", "N° Factura", "Total", "Facturado", "Por facturar", "Estado"].map(h => (
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
                  const facturas = getFacturas(o.id);
                  const totalOrden = calcTotal(o.items);
                  const totalFacturado = facturas.reduce((s, f) => s + f.valorTotal, 0);
                  const porFacturar = Math.max(0, totalOrden - totalFacturado);
                  return (
                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 text-sm text-foreground">{o.proveedor}</td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{o.fecha}</td>
                      <td className="px-4 py-3.5 text-xs">
                        {facturas.length > 0 ? (
                          <>
                            {facturas.slice(0, 2).map((f) => (
                              <span key={f.id} className="block font-mono font-semibold text-emerald-700">
                                {f.numeroFactura}
                              </span>
                            ))}
                            {facturas.length > 2 && (
                              <span className="block text-muted-foreground">
                                +{facturas.length - 2} factura{facturas.length - 2 > 1 ? "s" : ""}
                              </span>
                            )}
                            <p className="mt-0.5 text-[11px] font-normal text-muted-foreground">
                              {facturas.length === 1
                                ? `Recibida: ${facturas[0].fechaFactura}`
                                : `${facturas.length} facturas recibidas`}
                            </p>
                          </>
                        ) : o.estado === "Completado" ? (
                          <span className="text-amber-600 font-medium">Pendiente</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-foreground">
                        {fmtCOP(totalOrden)}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-emerald-700 font-semibold">
                        {totalFacturado > 0 ? fmtCOP(totalFacturado) : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-amber-700 font-semibold">
                        {porFacturar > 0 ? fmtCOP(porFacturar) : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <EstadoSelect
                          value={o.estado}
                          onChange={(nuevoEstado) => {
                            if (nuevoEstado === o.estado) return;
                            setEstadoConfirm({ id: o.id, from: o.estado, next: nuevoEstado });
                          }}
                          options={opcionesEstado(o.estado)}
                          disabled={o.estado === "Anulado" || o.estado === "Completado"}
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">{fechaUltimoCambio(o)}</p>
                        {/* El tooltip envuelve SOLO el botón: el selector de estado (menú
                            en portal con z-[100]) queda fuera, así que el desplegable
                            nunca queda tapado por el cuadro del historial. */}
                        <EstadoHistorialTooltip
                          historial={o.historialEstados ?? []}
                          estadoColors={ESTADO_CONFIG}
                        >
                          <button
                            type="button"
                            className="text-[11px] text-primary hover:underline mt-0.5"
                          >
                            Ver historial
                          </button>
                        </EstadoHistorialTooltip>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            onClick={() => onVerDetalle(o)}
                            title="Ver detalle"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {o.estado === "Enviado" && o.items.some(item => !registradosEnOrden(o.id).has(item.idInsumo)) && (
                            <button
                              onClick={() => onAbrirRecepcion?.(o)}
                              title="Registrar recepción"
                              className="flex items-center gap-1.5 ml-0.5 px-2.5 py-1.5 rounded-lg border border-dashed border-blue-300 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 cursor-pointer transition-colors"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" /> OC
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
        {modal && (
          <OrdenModal
            mode={modal.mode}
            orden={modal.orden}
            proveedores={proveedores}
            insumos={insumos}
            onClose={() => setModal(null)}
            onGuardar={handleGuardarOrden}
            onNuevoProveedor={handleNuevoProveedorLocal}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sendConfirm && (
          <ConfirmModal
            title="-+Enviar Orden de Compra?"
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
            body={`-+Deseas anular la OC ${anularConfirm.id}?`}
            detail={
              facturasDeOrden(anularConfirm.id).length > 0
                ? `También se anularán sus ${facturasDeOrden(anularConfirm.id).length} factura(s) registradas en Gestión de Compras.`
                : "Esta acción no puede revertirse."
            }
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
        {estadoConfirm && (
          <ConfirmModal
            title={`-+Cambiar el estado a ${estadoConfirm.next}?`}
            body={`La orden ${estadoConfirm.id} pasará de ${estadoConfirm.from} a ${estadoConfirm.next}.`}
            detail={
              estadoConfirm.next === "Anulado"
                ? "Una orden anulada no puede volver a un estado anterior."
                : "La orden avanzará en el flujo de estados."
            }
            confirmLabel={estadoConfirm.next === "Anulado" ? "Anular" : `Cambiar a ${estadoConfirm.next}`}
            danger={estadoConfirm.next === "Anulado"}
            icon={
              estadoConfirm.next === "Anulado" ? (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-red-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Send className="w-5 h-5 text-blue-600" />
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

// ─── NUEVO INSUMO MODAL ───────────────────────────────────────────────────────

export function NuevoInsumoModal({
  onGuardar, onClose, nombreInicial = "", insumosExistentes = [],
}: {
  onGuardar: (ins: { id: string; nombre: string; unidadMedida: string; precioUnitario: number; iva: number }) => void;
  onClose: () => void;
  nombreInicial?: string;
  insumosExistentes?: { nombre: string }[];
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [unidad, setUnidad] = useState(UNIDADES[0]);
  const [precio, setPrecio] = useState(0);
  const [iva, setIva] = useState(0);
  const [tocado, setTocado] = useState({ nombre: false, unidad: false, precio: false, iva: false });
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  const errorNombre = nombre.trim()
    ? (insumosExistentes.some(i => i.nombre.toLowerCase() === nombre.trim().toLowerCase())
      ? "Este insumo ya existe."
      : undefined)
    : "El nombre es obligatorio.";
  const errorUnidad = unidad ? undefined : "Selecciona una unidad.";
  const errorPrecio = precio > 0 ? undefined : "El monto debe ser mayor que cero.";
  const errorIva = iva >= 0 && iva <= 100 ? undefined : "El IVA debe estar entre 0 y 100.";

  const formValido = !errorNombre && !errorUnidad && !errorPrecio && !errorIva;

  const marcarTocado = (campo: "nombre" | "unidad" | "precio" | "iva") =>
    setTocado((t) => ({ ...t, [campo]: true }));

  const submit = () => {
    setIntentoGuardar(true);
    if (!formValido) return;
    onGuardar({
      id: `INS-N-${Date.now()}`,
      nombre: nombre.trim(),
      unidadMedida: unidad,
      precioUnitario: precio,
      iva,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Nuevo Insumo</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Crea un insumo para agregar a la orden.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nombre *</label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onBlur={() => marcarTocado("nombre")}
              autoFocus
              placeholder="Nombre del insumo"
              className={`${iCls} transition-colors ${(tocado.nombre || intentoGuardar) && errorNombre ? "border-red-400 focus:ring-red-300" : ""}`}
            />
            {(tocado.nombre || intentoGuardar) && errorNombre && (
              <p className="text-xs text-red-500 mt-1 ml-0.5">{errorNombre}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Unidad</label>
              <select
                value={unidad}
                onChange={e => setUnidad(e.target.value)}
                onBlur={() => marcarTocado("unidad")}
                className={`${sCls} cursor-pointer`}
              >
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">IVA (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={iva}
                onChange={e => setIva(Number(e.target.value))}
                onBlur={() => marcarTocado("iva")}
                className={iCls}
              />
              {(tocado.iva || intentoGuardar) && errorIva && (
                <p className="text-xs text-red-500 mt-1 ml-0.5">{errorIva}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Precio unitario *</label>
            <input
              type="number"
              min={0}
              value={precio || ""}
              onChange={e => setPrecio(Number(e.target.value))}
              onBlur={() => marcarTocado("precio")}
              className={iCls}
            />
            {(tocado.precio || intentoGuardar) && errorPrecio && (
              <p className="text-xs text-red-500 mt-1 ml-0.5">{errorPrecio}</p>
            )}
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!formValido}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary transition-all"
          >
            Crear Insumo
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── ORDEN DETALLE PAGE ───────────────────────────────────────────────────────

interface OrdenDetallePageProps {
  orden: OrdenCompra;
  gestiones: GestionCompra[];
  onBack: () => void;
  onEditar: (orden: OrdenCompra) => void;
  onAbrirRecepcion: (orden: OrdenCompra) => void;
}

export function OrdenDetallePage({
  orden,
  gestiones,
  onBack,
  onVerFactura,
}: OrdenDetallePageProps & { onVerFactura?: (gestion: GestionCompra) => void }) {
  const facturas = gestiones.filter(g => g.ordenId === orden.id && (g.numeroFactura ?? "") !== "");
  const insumosFacturados = new Set(facturas.flatMap(g => (g.items ?? []).map(i => i.idInsumo)));
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<string | null>(facturas[0]?.id ?? null);

  const facturaActual = facturas.find(f => f.id === facturaSeleccionada) ?? facturas[0];

  /**
   * Regla del módulo: un insumo es "solicitado" si su id está en el detalle de
   * la Orden de Compra; todo lo que no esté (llegó de más en la recepción) es
   * "no solicitado". El `esNoSolicitado` del guardado queda como respaldo para
   * datos viejos sin id comparable.
   */
  const idsOrden = useMemo(() => new Set(orden.items.map(i => i.idInsumo)), [orden.items]);
  const esSolicitado = (i: OrdenItem) =>
    idsOrden.has(i.idInsumo) || (i.esNoSolicitado === false && idsOrden.size === 0);

  const itemsFactura = facturaActual?.items ?? [];
  const solicitados = itemsFactura.filter(i => esSolicitado(i));
  const noSolicitados = itemsFactura.filter(i => !esSolicitado(i));
  const totalPagado = itemsFactura.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0);

  /** Fecha y hora del último cambio de estado (sin prefijos). */
  const historial = orden.historialEstados ?? [];
  const ultimoCambio = historial[historial.length - 1];
  const fechaEstado = formatearFechaHora(
    ultimoCambio?.fechaHora ?? orden.recepcion?.fechaRecepcion ?? orden.fecha
  );

  /** Las tablas miden según sus filas; solo con muchas filas scrollean solas. */
  const FILAS_SCROLL = 15;
  const claseTabla = (filas: number) =>
    `rounded-xl border border-border ${filas > FILAS_SCROLL ? "max-h-[55vh] overflow-y-auto" : "overflow-hidden"}`;

  return (
    <div className="px-6 pt-5 pb-4 max-w-7xl mx-auto h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 mb-5 pb-5 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          title="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
            Orden {orden.id}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {orden.proveedor} · {orden.fecha}
          </p>
        </div>
        <div className="ml-auto">
          <EstadoBadge e={orden.estado} />
        </div>
      </div>

      {/* Dos columnas */}
      <div className="flex-1 min-h-0 flex gap-0 overflow-hidden">
        {/* Columna izquierda — Orden de Compra */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pr-6">
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Orden de Compra
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Info de la orden */}
          <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">N° Orden</p>
              <p className="text-sm font-semibold text-foreground">{orden.id}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Proveedor</p>
              <p className="text-sm font-semibold text-foreground">{orden.proveedor}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Fecha</p>
              <p className="text-sm font-semibold text-foreground">{orden.fecha}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Estado</p>
              <div className="flex items-center gap-2">
                <EstadoBadge e={orden.estado} />
                <span className="text-[11px] text-muted-foreground">{fechaEstado}</span>
              </div>
            </div>
          </div>

          {/* Tabla de insumos pedidos */}
          <div className="flex flex-col shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Insumos pedidos
              </h3>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className={claseTabla(orden.items.length)}>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider sticky top-0">
                  <tr>
                    {["Nombre", "Cantidad", "Unidad", "Monto unitario", "Subtotal"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orden.items.map(item => {
                    const facturado = insumosFacturados.has(item.idInsumo);
                    return (
                      <tr key={item.rowId} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {item.nombre}
                            {facturado && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                                Facturado
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.cantidad}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{item.unidad}</td>
                        <td className="px-4 py-3">{fmtCOP(item.precioUnitario)}</td>
                        <td className="px-4 py-3 font-semibold">{fmtCOP(item.cantidad * item.precioUnitario)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total de la orden */}
          <div className="mt-4 pt-4 border-t border-border shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total</span>
              <span className="text-lg font-bold text-foreground">{fmtCOP(calcTotal(orden.items))}</span>
            </div>
          </div>
        </div>

        {/* Línea vertical divisoria */}
        <div className="w-px bg-border mx-0" />

        {/* Columna derecha — Facturas */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pl-6">
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Facturas
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          {facturas.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Sin facturas registradas</p>
            </div>
          ) : (
            <>
              {/* Chips de facturas */}
              <div className="flex flex-wrap gap-2 mb-4 shrink-0">
                {facturas.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFacturaSeleccionada(f.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      f.id === facturaSeleccionada
                        ? "bg-primary text-white shadow-md"
                        : "bg-muted text-foreground hover:bg-border"
                    }`}
                  >
                    <span className="font-mono">{f.numeroFactura}</span>
                  </button>
                ))}
              </div>

              {/* Detalle de la factura seleccionada */}
              {facturaActual && (
                <div className="flex flex-col">
                  <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">N° Factura</p>
                      <p className="text-sm font-semibold text-foreground font-mono">{facturaActual.numeroFactura}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Fecha de recepción</p>
                      <p className="text-sm font-semibold text-foreground">{facturaActual.fechaFactura}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Estado</p>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${facturaActual.estado === "Recibido" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        {facturaActual.estado}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Total</p>
                      <p className="text-sm font-bold text-foreground">{fmtCOP(facturaActual.valorTotal)}</p>
                    </div>
                  </div>

                  {/* Tabla de insumos de la factura — separar solicitados y no solicitados */}
                  <div className="flex flex-col shrink-0">
                    {/* Insumos solicitados (los que estaban en la OC) */}
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Insumos solicitados
                        </h3>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <div className={claseTabla(solicitados.length)}>
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider sticky top-0">
                            <tr>
                              {["Nombre", "Cantidad", "Unidad", "Monto unitario", "Subtotal"].map(h => (
                                <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {solicitados.map(item => (
                              <tr key={item.rowId} className="hover:bg-muted/20">
                                <td className="px-4 py-3 font-medium text-foreground">{item.nombre}</td>
                                <td className="px-4 py-3 text-muted-foreground">{item.cantidad}</td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">{item.unidad}</td>
                                <td className="px-4 py-3">{fmtCOP(item.costoUnitario)}</td>
                                <td className="px-4 py-3 font-semibold">{fmtCOP(item.cantidad * item.costoUnitario)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-muted/50 border-t border-border">
                            <tr>
                              <td colSpan={4} className="px-4 py-2 text-xs font-bold text-muted-foreground text-right uppercase">
                                Subtotal solicitados
                              </td>
                              <td className="px-4 py-2 text-sm font-bold text-foreground">
                                {fmtCOP(solicitados.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Insumos no solicitados (agregados en la recepción) */}
                    {noSolicitados.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700">
                            Insumos no solicitados
                          </h3>
                          <div className="h-px flex-1 bg-amber-200" />
                        </div>
                        <div className={claseTabla(noSolicitados.length).replace("border-border", "border-amber-200")}>
                          <table className="w-full text-sm">
                            <thead className="bg-amber-50/50 text-xs text-amber-700 uppercase tracking-wider sticky top-0">
                              <tr>
                                {["Nombre", "Cantidad", "Unidad", "Monto unitario", "Subtotal"].map(h => (
                                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-100">
                              {noSolicitados.map(item => (
                                <tr key={item.rowId} className="hover:bg-amber-50/50">
                                  <td className="px-4 py-3 font-medium text-foreground">{item.nombre}</td>
                                  <td className="px-4 py-3 text-muted-foreground">{item.cantidad}</td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.unidad}</td>
                                  <td className="px-4 py-3">{fmtCOP(item.costoUnitario)}</td>
                                  <td className="px-4 py-3 font-semibold">{fmtCOP(item.cantidad * item.costoUnitario)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-amber-50/50 border-t border-amber-200">
                              <tr>
                                <td colSpan={4} className="px-4 py-2 text-xs font-bold text-amber-700 text-right uppercase">
                                  Subtotal no solicitados
                                </td>
                                <td className="px-4 py-2 text-sm font-bold text-amber-700">
                                  {fmtCOP(noSolicitados.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0))}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Total pagado (solicitados + no solicitados) */}
                    <div className="mt-4 pt-4 border-t border-border shrink-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total pagado</span>
                        <span className="text-lg font-bold text-foreground">{fmtCOP(totalPagado)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
