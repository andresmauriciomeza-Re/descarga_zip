import { useState, useMemo, type Dispatch, type SetStateAction } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Eye, Pencil, Trash2, X, ChevronLeft, ChevronRight, AlertCircle, Clock, Download, PackageX } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { CalendarDropdown } from "../components/CalendarDropdown";
import type { Producto } from "./GestionProductosScreen";

const SERIF = "'DM Serif Display', serif";

type EstadoOrden = "pendiente" | "en-proceso" | "completada" | "cancelada";

const ESTADO_COLOR: Record<EstadoOrden, string> = {
  pendiente:    "bg-yellow-100 text-yellow-800",
  "en-proceso": "bg-blue-100 text-blue-800",
  completada:   "bg-emerald-100 text-emerald-800",
  cancelada:    "bg-red-100 text-red-700",
};

const ESTADO_LABEL: Record<EstadoOrden, string> = {
  pendiente:    "Pendiente",
  "en-proceso": "En Proceso",
  completada:   "Completada",
  cancelada:    "Cancelada",
};

// Transiciones válidas de estado. "Cancelada" NO es seleccionable:
// solo se alcanza mediante el flujo de "Dar de baja".
export const VALID_TRANSITIONS: Record<EstadoOrden, EstadoOrden[]> = {
  pendiente:    ["en-proceso"],
  "en-proceso": ["completada"],
  completada:   [],
  cancelada:    [],
};

// Los 4 estados, en su orden natural de avance por el flujo de producción.
export const ORDEN_ESTADOS: EstadoOrden[] = ["pendiente", "en-proceso", "completada", "cancelada"];

// Qué estados pueden elegirse a mano desde un dropdown, dado el estado actual.
// Coincide con VALID_TRANSITIONS: se avanza en la cadena y nunca se retrocede.
// "Cancelada" queda fuera: solo se llega a ella por "Dar de baja".
export const esEstadoSeleccionable = (actual: EstadoOrden, destino: EstadoOrden): boolean => {
  if (destino === actual) return true;                    // el estado actual siempre visible
  if (destino === "cancelada") return false;              // solo vía "Dar de baja"
  return ORDEN_ESTADOS.indexOf(destino) > ORDEN_ESTADOS.indexOf(actual);
};

// ── Dropdown de "Estado Orden" para los modales de Crear/Editar ─────────
// Replica el dropdown de la columna "Estado Orden" del listado: mismo badge de
// color por estado (ESTADO_COLOR). Siempre muestra los 4 estados; los que no
// aplican van deshabilitados en vez de desaparecer.
function EstadoOrdenSelect({
  value,
  onChange,
}: {
  value: EstadoOrden;
  onChange: (e: EstadoOrden) => void;
}) {
  // Sin transiciones posibles (Completada / Cancelada): se muestra, no se mueve.
  const bloqueado = VALID_TRANSITIONS[value].length === 0;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as EstadoOrden)}
      disabled={bloqueado}
      className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 focus:outline-none ${
        bloqueado ? "cursor-not-allowed opacity-80" : "cursor-pointer"
      } ${ESTADO_COLOR[value]}`}
    >
      {ORDEN_ESTADOS.map((e) => (
        <option key={e} value={e} disabled={!esEstadoSeleccionable(value, e)}>
          {ESTADO_LABEL[e]}
        </option>
      ))}
    </select>
  );
}

// Catálogo de productos (mismos IDs y nombres del módulo Productos).
// El sistema carga internamente el tiempo de preparación de la última
// versión de la ficha técnica de cada producto (nunca se muestra un ID externo).
const PRODUCTOS = [
  { id: "PROD-001", nombre: "Margarita Clásica",   tiempoPrep: 20 },
  { id: "PROD-002", nombre: "Pepperoni Premium",   tiempoPrep: 25 },
  { id: "PROD-003", nombre: "Cuatro Quesos",       tiempoPrep: 30 },
  { id: "PROD-004", nombre: "Especial La Sirena",  tiempoPrep: 35 },
  { id: "PROD-005", nombre: "Veggie Mediterránea", tiempoPrep: 20 },
];

const UNIDADES = ["und", "kg", "g", "litros", "ml", "cajas"];
const MOTIVOS = [
  "Defecto de calidad",
  "Daño físico",
  "Vencimiento",
  "Contaminación",
  "Mal almacenamiento",
  "Incumplimiento de proveedor",
  "Pérdida en venta",
  "Otro",
];

interface LineaProducto {
  idProducto: string;
  cantidad: number;
}

interface TransicionEstado {
  de: EstadoOrden;
  a: EstadoOrden;
  fechaHora: string; // ISO
}

export interface OrdenProduccion {
  id: string;
  lineas: LineaProducto[];
  fechaSolicitada: string;   // "YYYY-MM-DD" (opcional, referencial)
  horaSolicitada: string;    // "HH:MM" (opcional, referencial)
  estadoOrden: EstadoOrden;
  observacion: string;
  inicioProduccion: string | null;  // fecha/hora real al pasar a "En Proceso"
  entregaEstimada: string | null;   // entrega real estimada (se fija al iniciar)
  historial: TransicionEstado[];    // cada transición con fecha/hora
  // Marca contable interna (no se muestra en la UI): true cuando la producción
  // de esta orden ya se sumó al stock de sus productos. Garantiza que el stock
  // se sume UNA sola vez por orden. Ausente = todavía no se ha sumando.
  stockAplicado?: boolean;
}

interface OrdenForm {
  lineas: LineaProducto[];
  fechaSolicitada: string;
  horaSolicitada: string;
  estadoOrden: EstadoOrden;   // editable en el modal; "Pendiente" por defecto
  observacion: string;
}

const INITIAL_ORDENES: OrdenProduccion[] = [
  {
    id: "ORD-001",
    lineas: [{ idProducto: "PROD-001", cantidad: 20 }],
    fechaSolicitada: "2024-01-15", horaSolicitada: "19:00",
    estadoOrden: "completada", observacion: "Turno mañana sin novedades.",
    inicioProduccion: "2024-01-15T06:00:00", entregaEstimada: "2024-01-15T06:20:00",
    historial: [
      { de: "pendiente", a: "en-proceso", fechaHora: "2024-01-15T06:00:00" },
      { de: "en-proceso", a: "completada", fechaHora: "2024-01-15T09:00:00" },
    ],
  },
  {
    id: "ORD-002",
    lineas: [{ idProducto: "PROD-002", cantidad: 15 }],
    fechaSolicitada: "2024-01-15", horaSolicitada: "20:30",
    estadoOrden: "en-proceso", observacion: "Pendiente revisión de calidad.",
    inicioProduccion: "2024-01-15T08:10:00", entregaEstimada: "2024-01-15T08:35:00",
    historial: [
      { de: "pendiente", a: "en-proceso", fechaHora: "2024-01-15T08:10:00" },
    ],
  },
  {
    id: "ORD-003",
    lineas: [{ idProducto: "PROD-003", cantidad: 10 }],
    fechaSolicitada: "2024-01-16", horaSolicitada: "18:00",
    estadoOrden: "pendiente", observacion: "",
    inicioProduccion: null, entregaEstimada: null, historial: [],
  },
  {
    id: "ORD-004",
    lineas: [{ idProducto: "PROD-004", cantidad: 12 }],
    fechaSolicitada: "2024-01-16", horaSolicitada: "21:00",
    estadoOrden: "cancelada", observacion: "Falta mozzarella.",
    inicioProduccion: "2024-01-16T11:00:00", entregaEstimada: null,
    historial: [
      { de: "pendiente", a: "en-proceso", fechaHora: "2024-01-16T11:00:00" },
      { de: "en-proceso", a: "cancelada",  fechaHora: "2024-01-16T11:20:00" },
    ],
  },
  {
    id: "ORD-005",
    lineas: [{ idProducto: "PROD-005", cantidad: 8 }],
    fechaSolicitada: "2024-01-17", horaSolicitada: "19:30",
    estadoOrden: "en-proceso", observacion: "",
    inicioProduccion: "2024-01-17T09:00:00", entregaEstimada: "2024-01-17T09:20:00",
    historial: [
      { de: "pendiente", a: "en-proceso", fechaHora: "2024-01-17T09:00:00" },
    ],
  },
];

const PER_PAGE = 5;

const emptyForm = (): OrdenForm => ({
  lineas: [{ idProducto: "PROD-001", cantidad: 1 }],
  fechaSolicitada: "",
  horaSolicitada: "",
  estadoOrden: "pendiente",
  observacion: "",
});

const productById = (id: string) => PRODUCTOS.find(p => p.id === id);
const totalCantidad = (lineas: LineaProducto[]) => lineas.reduce((s, l) => s + (l.cantidad || 0), 0);
const totalTiempoPrep = (lineas: LineaProducto[]) =>
  lineas.reduce((s, l) => s + ((productById(l.idProducto)?.tiempoPrep ?? 0) * (l.cantidad || 0)), 0);

function fmtMinutos(min: number): string {
  if (min <= 0) return "0 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function fmtDT(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${MM}/${d.getFullYear()} ${hh}:${mm}`;
}

const nowISO = () => new Date().toISOString();
const addMinutesISO = (iso: string, min: number) =>
  new Date(new Date(iso).getTime() + min * 60000).toISOString();

const nombresDeLineas = (lineas: LineaProducto[]) => lineas.map(l => productById(l.idProducto)?.nombre ?? l.idProducto);

// ── Regla contable: stock que aporta una orden al completarse ──────────
// Función pura: recibe la orden en su estado ANTERIOR a la transición y
// devuelve el incremento por producto, o null si no se debe sumar nada.
// Ser pura permite verificar la regla "una sola vez por orden" sin UI.
export function calcularStockProducido(orden: OrdenProduccion): Map<string, number> | null {
  // 1) Idempotencia: si esta orden ya aportó su producción, no vuelve a sumar.
  if (orden.stockAplicado) return null;
  // 2) Si ya estaba en "Completada", no hay cambio de estado que contabilizar.
  if (orden.estadoOrden === "completada") return null;

  // 3) Acumula por producto: la misma orden puede traer un producto en varias
  //    líneas, y varias líneas del mismo producto deben sumar su total.
  const producido = new Map<string, number>();
  for (const l of orden.lineas) {
    if (l.idProducto && l.cantidad > 0) {
      producido.set(l.idProducto, (producido.get(l.idProducto) ?? 0) + l.cantidad);
    }
  }
  return producido.size > 0 ? producido : null;
}

function exportExcel(ordenes: OrdenProduccion[]) {
  const headers = [
    "ID Orden", "Producto(s)", "Detalle", "Cantidad Total",
    "Fecha solicitada", "Hora solicitada", "Inicio Producción",
    "Entrega Estimada", "Estado", "Observación",
  ];
  const rows = ordenes.map(o => [
    o.id,
    nombresDeLineas(o.lineas).join(", "),
    o.lineas.map(l => `${l.cantidad} × ${productById(l.idProducto)?.nombre ?? l.idProducto}`).join("; "),
    totalCantidad(o.lineas),
    o.fechaSolicitada || "",
    o.horaSolicitada || "",
    o.inicioProduccion ? fmtDT(o.inicioProduccion) : "",
    o.entregaEstimada ? fmtDT(o.entregaEstimada) : "",
    ESTADO_LABEL[o.estadoOrden],
    o.observacion,
  ]);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [
    { wch: 10 }, { wch: 26 }, { wch: 36 }, { wch: 12 },
    { wch: 15 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
    { wch: 12 }, { wch: 32 },
  ];
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws, "Ordenes");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `ordenes-produccion-${date}.xlsx`);
  toast.success("Archivo Excel descargado");
}

export function OrdenProduccionScreen({
  productos,
  setProductos,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: {
  productos: Producto[];
  setProductos: Dispatch<SetStateAction<Producto[]>>;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [ordenes,       setOrdenes]    = useState<OrdenProduccion[]>(INITIAL_ORDENES);
  const [search,        setSearch]     = useState("");
  const [page,          setPage]       = useState(1);
  const [showCreate,    setShowCreate] = useState(false);
  const [editItem,      setEditItem]   = useState<OrdenProduccion | null>(null);
  const [detailItem,    setDetailItem] = useState<OrdenProduccion | null>(null);
  const [deleteId,      setDeleteId]   = useState<string | null>(null);
  const [form,          setForm]       = useState<OrdenForm>(emptyForm());
  const [darBajaItem,   setDarBajaItem] = useState<OrdenProduccion | null>(null);
  const [confirmEstado, setConfirmEstado] = useState<{
    id: string; current: EstadoOrden; next: EstadoOrden;
  } | null>(null);

  const [darBajaForm, setDarBajaForm] = useState<{
    idProducto: string;
    unidadMedida: string;
    cantidad: number;
    fechaRegistro: string;
    motivo: string;
    descripcion: string;
  } | null>(null);

  const iCls = "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const sCls = iCls + " cursor-pointer";
  const tCls = iCls + " resize-none";

  const filtered = useMemo(() =>
    ordenes.filter(o =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      nombresDeLineas(o.lineas).some(n => n.toLowerCase().includes(search.toLowerCase()))
    ), [ordenes, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ── Stock por producción ─────────────────────────────────────────────
  // Al completarse una orden, el "Stock disponible" de cada producto producido
  // sube solo, en la fuente de datos compartida (estado de App.tsx), sin que el
  // administrador toque el input "Stock disponible" del formulario de producto.
  // La regla de "una sola vez por orden" vive en calcularStockProducido.
  const sumarStockProducido = (orden: OrdenProduccion): boolean => {
    const producido = calcularStockProducido(orden);
    if (!producido) return false;

    const nombreDe = (pid: string) =>
      productos.find(p => p.id === pid)?.nombre ?? productById(pid)?.nombre ?? pid;

    setProductos(prev => prev.map(p => {
      const cant = producido.get(p.id);
      if (!cant) return p;
      return { ...p, stockDisponible: Math.max(0, (p.stockDisponible || 0) + cant) };
    }));

    const detalle = [...producido.entries()]
      .map(([pid, cant]) => `${nombreDe(pid)} +${cant}`)
      .join(" · ");
    toast.success(`Stock disponible actualizado — ${detalle}`);

    // Líneas sin producto homónimo en el catálogo: se avisa en vez de fallar en silencio.
    const sinCatalogo = [...producido.keys()].filter(pid => !productos.some(p => p.id === pid));
    if (sinCatalogo.length > 0) {
      toast.warning(`Sin actualizar: ${sinCatalogo.join(", ")} no existe(n) en Productos`);
    }
    return true;
  };

  // ── Reglas de transición de estado ────────────────────────────────────
  // Única fuente de verdad, compartida por el dropdown del listado y por el de
  // los modales Crear/Editar: registra fecha/hora de la transición, fija la
  // entrega estimada real al pasar a "En Proceso" y suma el stock al pasar a
  // "Completada". Recibe la orden en su estado ANTERIOR y devuelve la nueva.
  const aplicarTransicion = (orden: OrdenProduccion, next: EstadoOrden): OrdenProduccion => {
    if (orden.estadoOrden === next) return orden;

    const now = nowISO();
    const historial = [...orden.historial, { de: orden.estadoOrden, a: next, fechaHora: now }];
    let patched: OrdenProduccion = { ...orden, estadoOrden: next, historial };

    if (next === "en-proceso") {
      patched = {
        ...patched,
        inicioProduccion: now,
        entregaEstimada: addMinutesISO(now, totalTiempoPrep(orden.lineas)),
      };
    }
    // Se evalúa sobre la orden previa: si ya estaba contabilizada, no repite.
    if (next === "completada" && sumarStockProducido(orden)) {
      patched = { ...patched, stockAplicado: true };
    }
    return patched;
  };

  const handleCreate = () => {
    if (form.lineas.length === 0 || form.lineas.every(l => !l.idProducto || l.cantidad <= 0)) {
      toast.error("Agrega al menos un producto con cantidad");
      return;
    }
    const newId = `ORD-${String(ordenes.length + 1).padStart(3, "0")}`;
    // Toda orden nace "Pendiente"; si en el modal se eligió otro estado, se
    // registra la transición con las mismas reglas que usa el listado.
    const base: OrdenProduccion = {
      id: newId,
      lineas: form.lineas.map(l => ({ ...l })),
      fechaSolicitada: form.fechaSolicitada,
      horaSolicitada: form.horaSolicitada,
      estadoOrden: "pendiente",
      observacion: form.observacion,
      inicioProduccion: null,
      entregaEstimada: null,
      historial: [],
    };
    const ord = aplicarTransicion(base, form.estadoOrden);
    setOrdenes(p => [ord, ...p]);
    setShowCreate(false); setForm(emptyForm());
    toast.success("Orden de producción creada");
  };

  const handleEdit = () => {
    if (!editItem) return;
    if (editItem.lineas.length === 0 || editItem.lineas.every(l => !l.idProducto || l.cantidad <= 0)) {
      toast.error("Agrega al menos un producto con cantidad");
      return;
    }
    // Se parte de la orden ya guardada (estado previo real) y se le aplican los
    // campos editados; así el dropdown puede compararla contra el estado real.
    const previo = ordenes.find(o => o.id === editItem.id);
    const base: OrdenProduccion = previo
      ? {
          ...previo,
          lineas: editItem.lineas.map(l => ({ ...l })),
          fechaSolicitada: editItem.fechaSolicitada,
          horaSolicitada: editItem.horaSolicitada,
          observacion: editItem.observacion,
        }
      : { ...editItem };
    setOrdenes(p => p.map(o => o.id === editItem.id ? aplicarTransicion(base, editItem.estadoOrden) : o));
    setEditItem(null);
    toast.success("Orden actualizada");
  };

  const handleDelete = (id: string) => {
    setOrdenes(p => p.filter(o => o.id !== id));
    setDeleteId(null);
    toast.success("Orden eliminada");
  };

  const applyTransition = (id: string, next: EstadoOrden) => {
    const orden = ordenes.find(o => o.id === id);
    if (orden) {
      // La suma de stock se dispara desde aplicarTransicion. Se resuelve fuera
      // del updater de setOrdenes a propósito: dentro de un reducer se
      // ejecutaría dos veces en modo estricto.
      setOrdenes(p => p.map(o => o.id === id ? aplicarTransicion(o, next) : o));
    }
    setConfirmEstado(null);
    toast.success(`Estado cambiado a: ${ESTADO_LABEL[next]}`);
  };

  const confirmarDarBaja = () => {
    if (!darBajaForm || !darBajaItem) return;
    if (!darBajaForm.descripcion.trim()) {
      toast.error("Describe el motivo de la baja");
      return;
    }
    setOrdenes(p => p.map(o => o.id === darBajaItem.id
      ? { ...o, estadoOrden: "cancelada", historial: [...o.historial, { de: o.estadoOrden, a: "cancelada", fechaHora: nowISO() }] }
      : o));
    setDarBajaItem(null); setDarBajaForm(null);
    toast.success(`Orden ${darBajaItem.id} dada de baja`);
  };

  const openDarBaja = (o: OrdenProduccion) => {
    const primera = o.lineas[0];
    setDarBajaItem(o);
    setDarBajaForm({
      idProducto: primera.idProducto,
      unidadMedida: "und",
      cantidad: primera.cantidad,
      fechaRegistro: new Date().toISOString().slice(0, 10),
      motivo: MOTIVOS[0],
      descripcion: "",
    });
  };

  // ── Campos compartidos del formulario de orden (crear / editar) ──
  const OrdenFormFields = ({ v, set }: { v: OrdenForm; set: (f: OrdenForm) => void }) => {
    const prepTotal = totalTiempoPrep(v.lineas);
    const cantTotal = totalCantidad(v.lineas);

    const updateLinea = (idx: number, patch: Partial<LineaProducto>) =>
      set({ ...v, lineas: v.lineas.map((l, i) => i === idx ? { ...l, ...patch } : l) });

    const addLinea = () =>
      set({ ...v, lineas: [...v.lineas, { idProducto: PRODUCTOS[0].id, cantidad: 1 }] });

    const removeLinea = (idx: number) =>
      set({ ...v, lineas: v.lineas.filter((_, i) => i !== idx) });

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Líneas de producto */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-muted-foreground mb-2">Producto(s) de la orden</label>
          <div className="space-y-2">
            {v.lineas.map((l, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select value={l.idProducto} onChange={e => updateLinea(idx, { idProducto: e.target.value })}
                  className={sCls + " flex-1"}>
                  {PRODUCTOS.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <input
                  type="number" min={1} value={l.cantidad}
                  onChange={e => updateLinea(idx, { cantidad: Number(e.target.value) })}
                  title="Cantidad"
                  className={iCls + " w-24"}
                />
                {v.lineas.length > 1 && (
                  <button type="button" onClick={() => removeLinea(idx)} title="Quitar producto"
                    className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addLinea}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-border rounded-xl text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Agregar producto
          </button>
        </div>

        {/* Fecha/hora solicitada por el cliente (opcional, referencial) */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Fecha/hora solicitada por el cliente <span className="text-muted-foreground/60">(opcional, referencial)</span>
          </label>
          <CalendarDropdown value={v.fechaSolicitada} onChange={f => set({ ...v, fechaSolicitada: f })} />
        </div>
        <div className="flex flex-col justify-end">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Hora (HH:MM) — opcional</label>
          <input
            type="time"
            value={v.horaSolicitada}
            onChange={e => set({ ...v, horaSolicitada: e.target.value })}
            className={iCls}
          />
        </div>

        {/* Tiempo estimado (readonly) */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Tiempo estimado / Entrega estimada</label>
          <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/60 rounded-xl border border-border text-sm text-foreground">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-semibold">{fmtMinutos(prepTotal)}</span>
            <span className="text-xs text-muted-foreground">
              (suma del tiempo de preparación × cantidad de cada producto — se fija como entrega real al iniciar producción)
            </span>
          </div>
        </div>

        {/* Cantidad producida (resumen) */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad Producida (resumen)</label>
          <input value={cantTotal} readOnly className={iCls + " opacity-70 cursor-default"} />
        </div>

        {/* Observación */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Observación</label>
          <textarea value={v.observacion} onChange={e => set({ ...v, observacion: e.target.value })}
            rows={3} placeholder="Notas adicionales sobre esta orden..."
            className={tCls} />
        </div>
      </div>
    );
  };

  // Modal wrapper
  const Modal = ({ title, onClose, onConfirm, label, children }: {
    title: string; onClose: () => void; onConfirm: () => void; label: string; children: React.ReactNode;
  }) => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
          className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border my-4">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="px-5 py-4">{children}</div>
          <div className="flex gap-3 px-5 py-4 border-t border-border">
            <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">Cancelar</button>
            <button onClick={onConfirm} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">{label}</button>
          </div>
        </motion.div>
      </div>
    </div>
  );

  // Confirm delete modal
  const ConfirmDelete = ({ id, onCancel }: { id: string; onCancel: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
        className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Eliminar orden</h3>
        </div>
        <p className="text-muted-foreground mb-6">¿Seguro que deseas eliminar la orden <strong>{id}</strong>? Esta acción no se puede deshacer.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">Cancelar</button>
          <button onClick={() => handleDelete(id)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 cursor-pointer active:scale-95">Eliminar</button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Orden Producción</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{ordenes.length} órdenes registradas</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => exportExcel(ordenes)}
            className="inline-flex items-center gap-2 px-5 py-3 border border-border font-semibold rounded-xl hover:bg-muted active:scale-95 transition-all cursor-pointer text-sm text-foreground">
            <Download className="w-4 h-4" /> Descargar Excel
          </button>
          {canCreate && (
            <button onClick={() => { setForm(emptyForm()); setShowCreate(true); }}
              className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md text-sm">
              <Plus className="w-4 h-4" /> Crear Orden de Producción
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por ID orden o producto..."
          className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["ID Orden","Producto(s)","Fecha solicitada","Entrega estimada","Cant. Producida","Estado Orden","Acciones"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-14 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">👨‍🍳</p><p>No se encontraron órdenes</p>
                </td></tr>
              ) : paged.map(o => {
                const nombres = nombresDeLineas(o.lineas);
                const soloPendiente = o.estadoOrden === "pendiente";
                const puedeBaja = o.estadoOrden === "pendiente" || o.estadoOrden === "en-proceso";
                return (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 text-sm font-mono font-semibold text-foreground">{o.id}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-foreground">
                        {nombres.length === 1 ? nombres[0] : `${nombres.length} productos`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {o.lineas.map(l => `${l.cantidad} × ${productById(l.idProducto)?.nombre ?? l.idProducto}`).join(", ")}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                      {o.fechaSolicitada || "—"}{o.horaSolicitada ? ` ${o.horaSolicitada}` : ""}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          {o.entregaEstimada
                            ? fmtDT(o.entregaEstimada)
                            : <span className="text-muted-foreground font-normal italic text-xs">Por iniciar</span>}
                        </span>
                      </div>
                      {(o.fechaSolicitada || o.horaSolicitada) && (
                        <p className="text-[10px] text-muted-foreground mt-0.5" title="Hora solicitada por el cliente">
                          Solicitada: {o.fechaSolicitada || "—"}{o.horaSolicitada ? ` ${o.horaSolicitada}` : ""}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-bold text-center text-foreground">{totalCantidad(o.lineas)}</td>
                    <td className="px-4 py-3.5">
                      {VALID_TRANSITIONS[o.estadoOrden].length === 0 ? (
                        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_COLOR[o.estadoOrden]}`}>
                          {ESTADO_LABEL[o.estadoOrden]}
                        </span>
                      ) : (
                        <select value={o.estadoOrden}
                          onChange={e => {
                            const next = e.target.value as EstadoOrden;
                            if (next === o.estadoOrden) return;
                            e.target.value = o.estadoOrden;
                            setConfirmEstado({ id: o.id, current: o.estadoOrden, next });
                          }}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${ESTADO_COLOR[o.estadoOrden]}`}>
                          <option value={o.estadoOrden}>{ESTADO_LABEL[o.estadoOrden]}</option>
                          {VALID_TRANSITIONS[o.estadoOrden].map(n => (
                            <option key={n} value={n}>{ESTADO_LABEL[n]}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setDetailItem(o)} title="Ver detalle"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer"><Eye className="w-4 h-4" /></button>
                        {canEdit && (
                          <button onClick={() => soloPendiente && setEditItem({ ...o })}
                            disabled={!soloPendiente}
                            title={soloPendiente ? "Editar" : "Solo se puede editar en estado Pendiente"}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => soloPendiente && setDeleteId(o.id)}
                            disabled={!soloPendiente}
                            title={soloPendiente ? "Eliminar" : "Solo se puede eliminar en estado Pendiente"}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => puedeBaja && openDarBaja(o)}
                          disabled={!puedeBaja}
                          title={puedeBaja ? "Dar de baja" : "No se puede dar de baja en este estado"}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                          <PackageX className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-center">
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: totalPages }, (_, i) => i+1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n===page?"bg-primary text-white":"hover:bg-muted text-muted-foreground"}`}>{n}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      )}

      {/* Modal: Crear */}
      <AnimatePresence>
        {showCreate && Modal({
          title: "Crear Orden de Producción",
          onClose: () => setShowCreate(false),
          onConfirm: handleCreate,
          label: "Crear Orden",
          children: (
            <>
              <div className="flex items-center justify-between mb-4 px-3 py-2 bg-muted/60 rounded-xl border border-border">
                <span className="text-xs font-semibold text-muted-foreground">Estado Orden</span>
                <EstadoOrdenSelect
                  value={form.estadoOrden}
                  onChange={e => setForm(p => ({ ...p, estadoOrden: e }))}
                />
              </div>
              <OrdenFormFields v={form} set={setForm} />
            </>
          )
        })}
      </AnimatePresence>

      {/* Modal: Editar */}
      <AnimatePresence>
        {editItem && Modal({
          title: `Editar — ${editItem.id}`,
          onClose: () => setEditItem(null),
          onConfirm: handleEdit,
          label: "Guardar",
          children: (
            <>
              <div className="flex items-center justify-between mb-4 px-3 py-2 bg-muted/60 rounded-xl border border-border">
                <span className="text-xs font-semibold text-muted-foreground">Estado Orden</span>
                <EstadoOrdenSelect
                  value={editItem.estadoOrden}
                  onChange={e => setEditItem(x => x && ({ ...x, estadoOrden: e }))}
                />
              </div>
              <OrdenFormFields
                v={{
                  lineas: editItem.lineas,
                  fechaSolicitada: editItem.fechaSolicitada,
                  horaSolicitada: editItem.horaSolicitada,
                  estadoOrden: editItem.estadoOrden,
                  observacion: editItem.observacion,
                }}
                set={nv => setEditItem(x => x && ({
                  ...x,
                  lineas: nv.lineas,
                  fechaSolicitada: nv.fechaSolicitada,
                  horaSolicitada: nv.horaSolicitada,
                  observacion: nv.observacion,
                }))}
              />
            </>
          )
        })}
      </AnimatePresence>

      {/* Modal: Ver detalle */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Detalle — {detailItem.id}</h3>
                <button onClick={() => setDetailItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="px-5 py-4 space-y-2">
                {[
                  { l: "ID Orden", v: detailItem.id },
                  { l: "Fecha/hora solicitada", v: detailItem.fechaSolicitada ? `${detailItem.fechaSolicitada}${detailItem.horaSolicitada ? ` ${detailItem.horaSolicitada}` : ""}` : "—" },
                  { l: "Inicio de producción",  v: fmtDT(detailItem.inicioProduccion) },
                  { l: "Entrega estimada",      v: fmtDT(detailItem.entregaEstimada) },
                  { l: "Cantidad producida",    v: `${totalCantidad(detailItem.lineas)} und.` },
                  { l: "Estado Orden",          v: ESTADO_LABEL[detailItem.estadoOrden] },
                ].map(({ l, v }) => (
                  <div key={l} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-4">
                    <span className="text-sm text-muted-foreground font-medium shrink-0">{l}</span>
                    <span className="text-sm font-semibold text-foreground text-right">{v}</span>
                  </div>
                ))}

                <div className="pt-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Producto(s)</p>
                  <div className="space-y-1">
                    {detailItem.lineas.map((l, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-muted rounded-xl px-3 py-2">
                        <span className="font-semibold text-foreground">{productById(l.idProducto)?.nombre ?? l.idProducto}</span>
                        <span className="text-muted-foreground">{l.cantidad} und.</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Historial de estado</p>
                  {detailItem.historial.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic bg-muted rounded-xl px-3 py-2">Sin transiciones registradas.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {detailItem.historial.map((h, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 bg-muted rounded-xl px-3 py-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[h.de]}`}>{ESTADO_LABEL[h.de]}</span>
                            <span className="text-muted-foreground text-xs">→</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[h.a]}`}>{ESTADO_LABEL[h.a]}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">{fmtDT(h.fechaHora)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {detailItem.observacion && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Observación</p>
                    <p className="text-sm text-foreground bg-muted rounded-xl px-3 py-2">{detailItem.observacion}</p>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-border">
                <button onClick={() => setDetailItem(null)} className="w-full py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">Cerrar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Dar de baja */}
      <AnimatePresence>
        {darBajaItem && darBajaForm && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
                className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border my-4">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h3 className="text-base font-bold text-foreground" style={{ fontFamily: SERIF }}>Dar de baja — {darBajaItem.id}</h3>
                  <button onClick={() => { setDarBajaItem(null); setDarBajaForm(null); }}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
                </div>

                <div className="space-y-4 px-5 py-5 max-h-[68vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo</label>
                      <p className="text-sm font-semibold text-foreground py-2">Producto</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Unidad de medida</label>
                      <select value={darBajaForm.unidadMedida} onChange={e => setDarBajaForm(f => f && ({ ...f, unidadMedida: e.target.value }))} className={sCls}>
                        {UNIDADES.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre del producto</label>
                    <select value={darBajaForm.idProducto}
                      onChange={e => {
                        const pid = e.target.value;
                        const linea = darBajaItem.lineas.find(l => l.idProducto === pid);
                        setDarBajaForm(f => f && ({ ...f, idProducto: pid, cantidad: linea?.cantidad ?? f.cantidad }));
                      }}
                      className={sCls}>
                      {darBajaItem.lineas.map(l => (
                        <option key={l.idProducto} value={l.idProducto}>{productById(l.idProducto)?.nombre ?? l.idProducto}</option>
                      ))}
                    </select>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Producto terminado</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad afectada</label>
                      <input type="number" min={1} value={darBajaForm.cantidad}
                        onChange={e => setDarBajaForm(f => f && ({ ...f, cantidad: Number(e.target.value) }))}
                        className={iCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha de registro</label>
                      <input value={darBajaForm.fechaRegistro} readOnly className={iCls + " opacity-60 cursor-default"} />
                    </div>
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-muted/60 border-b border-border">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Descripción de la no conformidad</p>
                    </div>
                    <div className="p-3 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Título / motivo principal</label>
                        <select value={darBajaForm.motivo} onChange={e => setDarBajaForm(f => f && ({ ...f, motivo: e.target.value }))} className={sCls}>
                          {MOTIVOS.map(m => <option key={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Descripción detallada</label>
                        <textarea rows={4} value={darBajaForm.descripcion}
                          onChange={e => setDarBajaForm(f => f && ({ ...f, descripcion: e.target.value }))}
                          placeholder="Describe detalladamente qué ocurrió, síntomas observados, impacto..."
                          className={tCls} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Origen</label>
                      <input value={`Orden #${darBajaItem.id}`} readOnly className={iCls + " opacity-60 cursor-default"} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 px-5 py-4 border-t border-border">
                  <button onClick={() => { setDarBajaItem(null); setDarBajaForm(null); }}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                    Cancelar
                  </button>
                  <button onClick={confirmarDarBaja}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                    Registrar
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm delete */}
      <AnimatePresence>
        {deleteId && ConfirmDelete({ id: deleteId, onCancel: () => setDeleteId(null) })}
      </AnimatePresence>

      {/* Confirm estado change */}
      <AnimatePresence>
        {confirmEstado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
              className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>¿Desea cambiar el estado de la orden?</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                La orden <strong className="text-foreground">{confirmEstado.id}</strong> pasará de:
              </p>
              <div className="flex items-center gap-3 mb-5 px-3 py-3 rounded-xl bg-muted/50 border border-border">
                <span className={`font-semibold px-2.5 py-1 rounded-full text-xs ${ESTADO_COLOR[confirmEstado.current]}`}>{ESTADO_LABEL[confirmEstado.current]}</span>
                <span className="text-muted-foreground text-sm">→</span>
                <span className={`font-semibold px-2.5 py-1 rounded-full text-xs ${ESTADO_COLOR[confirmEstado.next]}`}>{ESTADO_LABEL[confirmEstado.next]}</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmEstado(null)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                  Cancelar
                </button>
                <button onClick={() => applyTransition(confirmEstado.id, confirmEstado.next)}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}