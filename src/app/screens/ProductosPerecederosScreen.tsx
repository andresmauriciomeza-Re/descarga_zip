import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Search, Eye, Trash2, X, ChevronLeft, ChevronRight,
  AlertCircle, Upload, ShoppingCart, Download, BarChart2, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const SERIF = "'DM Serif Display', serif";
const PER_PAGE = 5;

type Tipo = "Producto" | "Insumo" | "Venta";
type EstadoNC = "Pendiente" | "En análisis" | "En proceso" | "Cerrado";

interface NoConformidad {
  id: string;
  tipo: Tipo;
  nombre: string;
  categoria: string;
  fechaRegistro: string;
  cantidadAfectada: number;
  unidadMedida: string;
  tipoNoConformidad: string;
  descripcionProblema: string;
  causa: string;
  evidencia?: string;
  areaProceso: string;
  proveedor?: string;
  lote?: string;
  responsable: string;
  estado: EstadoNC;
  accionTomada?: string;
  accionCorrectiva?: string;
  fechaLimite?: string;
  responsableAccion?: string;
  fechaCierre?: string;
  ventaRef?: string;
  ordenRef?: string;
}

interface VentaPerdida {
  id: string;
  usuario: string;
  fecha: string;
  productos: string;
  cantidad: number;
  total: number;
}

const ESTADO_CONFIG: Record<EstadoNC, string> = {
  Pendiente:     "bg-red-100 text-red-800",
  "En análisis": "bg-amber-100 text-amber-800",
  "En proceso":  "bg-blue-100 text-blue-800",
  Cerrado:       "bg-emerald-100 text-emerald-800",
};

const TIPOS_NC = [
  "Defecto de calidad",
  "Daño físico",
  "Vencimiento",
  "Contaminación",
  "Mal almacenamiento",
  "Incumplimiento de proveedor",
  "Pérdida en venta",
  "Otro",
];

const AREAS = ["Producción", "Compras", "Almacén", "Distribución", "Cocina", "Ventas"];
const UNIDADES = ["und", "kg", "g", "litros", "ml", "cajas"];
const CATEGORIAS = ["Pizzas", "Bebidas", "Lasaña", "Insumo seco", "Insumo fresco", "Ventas", "Otro"];

const PRODUCT_CATALOG: Array<{ pattern: RegExp; tipo: Tipo; unidad: string; categoria: string; area: string }> = [
  { pattern: /pizza|margarita|pepperoni|cuatro quesos|hawai|vegetal|especial/i, tipo: "Producto", unidad: "und", categoria: "Pizzas", area: "Producción" },
  { pattern: /lasaña|lasagna/i, tipo: "Producto", unidad: "und", categoria: "Lasaña", area: "Producción" },
  { pattern: /gaseosa|bebida|agua|jugo|refresco|cerveza/i, tipo: "Producto", unidad: "und", categoria: "Bebidas", area: "Distribución" },
  { pattern: /harina|azucar|sal|aceite|vinagre|levadura|condimento|especia/i, tipo: "Insumo", unidad: "kg", categoria: "Insumo seco", area: "Almacén" },
  { pattern: /queso|mozzarella|parmesano/i, tipo: "Insumo", unidad: "kg", categoria: "Insumo fresco", area: "Compras" },
  { pattern: /tomate|cebolla|ajo|piment|champi|albahaca|orégano/i, tipo: "Insumo", unidad: "kg", categoria: "Insumo fresco", area: "Compras" },
  { pattern: /pollo|carne|res|jam[oó]n|salchicha/i, tipo: "Insumo", unidad: "kg", categoria: "Insumo fresco", area: "Compras" },
  { pattern: /leche|crema|mantequilla|yogur/i, tipo: "Insumo", unidad: "litros", categoria: "Insumo fresco", area: "Compras" },
];

function autoDetect(nombre: string) {
  for (const e of PRODUCT_CATALOG) {
    if (e.pattern.test(nombre)) return { tipo: e.tipo, unidad: e.unidad, categoria: e.categoria, areaProceso: e.area };
  }
  return {};
}

const INITIAL: NoConformidad[] = [
  {
    id: "1", tipo: "Producto", nombre: "Pizza Pepperoni", categoria: "Pizzas",
    fechaRegistro: "2024-01-15", cantidadAfectada: 4, unidadMedida: "und",
    tipoNoConformidad: "Vencimiento",
    descripcionProblema: "Pizzas preparadas encontradas fuera del tiempo de refrigeración permitido (más de 24 h). Presentan cambio de color y olor.",
    causa: "Falla en rotación de producto terminado en nevera",
    areaProceso: "Producción", lote: "L-2024-015", responsable: "Carlos Gómez",
    estado: "Pendiente", accionTomada: "Producto separado y retirado de nevera",
    accionCorrectiva: "Implementar control de fechas FIFO en área de refrigeración",
    fechaLimite: "2024-01-20", responsableAccion: "María López",
  },
  {
    id: "2", tipo: "Insumo", nombre: "Harina de trigo", categoria: "Insumo seco",
    fechaRegistro: "2024-01-18", cantidadAfectada: 50, unidadMedida: "kg",
    tipoNoConformidad: "Mal almacenamiento",
    descripcionProblema: "Sacos de harina con humedad excesiva al abrir. La masa elaborada presenta grumos y no desarrolla bien la fermentación.",
    causa: "Filtración de humedad por goteras en zona de almacén",
    areaProceso: "Almacén", proveedor: "Molinos del Valle", lote: "L-2024-042", responsable: "Ana Torres",
    estado: "En análisis", accionTomada: "Sacos afectados separados; muestra enviada a cocina para prueba",
    accionCorrectiva: "Reparación de techo en bodega y reubicación del almacenamiento",
    fechaLimite: "2024-01-25", responsableAccion: "Juan Ríos",
  },
  {
    id: "3", tipo: "Producto", nombre: "Gaseosa 400ml", categoria: "Bebidas",
    fechaRegistro: "2024-01-10", cantidadAfectada: 12, unidadMedida: "und",
    tipoNoConformidad: "Vencimiento",
    descripcionProblema: "Botellas de gaseosa vencidas encontradas en la nevera de exhibición. Fecha de vencimiento: 05/01/2024.",
    causa: "Falla en revisión periódica de fechas en nevera de exhibición",
    areaProceso: "Distribución", lote: "L-2023-210", responsable: "Pedro Salazar",
    estado: "Cerrado", accionTomada: "Producto dado de baja y destruido",
    accionCorrectiva: "Revisión diaria de fechas de vencimiento en nevera de exhibición",
    fechaLimite: "2024-01-12", responsableAccion: "Pedro Salazar", fechaCierre: "2024-01-12",
  },
  {
    id: "4", tipo: "Producto", nombre: "Lasaña Bolognesa", categoria: "Lasaña",
    fechaRegistro: "2024-01-22", cantidadAfectada: 2, unidadMedida: "und",
    tipoNoConformidad: "Defecto de calidad",
    descripcionProblema: "Dos lasañas devueltas por clientes por presencia de carne mal cocida en el centro. Temperatura interna insuficiente al servir.",
    causa: "Tiempo de cocción insuficiente por horno con falla de temperatura",
    areaProceso: "Cocina", lote: "L-2024-022", responsable: "Luis Herrera",
    estado: "En proceso", accionTomada: "Producto retirado; se ofreció reposición al cliente",
    accionCorrectiva: "Calibración del horno y protocolo de verificación de temperatura interna",
    fechaLimite: "2024-01-27", responsableAccion: "Luis Herrera",
  },
  {
    id: "5", tipo: "Insumo", nombre: "Queso mozzarella", categoria: "Insumo fresco",
    fechaRegistro: "2024-01-25", cantidadAfectada: 8, unidadMedida: "kg",
    tipoNoConformidad: "Incumplimiento de proveedor",
    descripcionProblema: "Queso recibido con empaque roto y signos de inicio de deterioro. Presenta olor ácido fuera de lo normal para el producto.",
    causa: "Transporte sin cadena de frío adecuada por parte del proveedor",
    areaProceso: "Compras", proveedor: "Lácteos La Esperanza", lote: "L-2024-089", responsable: "Ana Torres",
    estado: "Pendiente", accionTomada: "Insumo rechazado y devuelto al proveedor",
    accionCorrectiva: "Solicitar certificado de cadena de frío en cada entrega y evaluar cambio de proveedor",
    fechaLimite: "2024-01-30", responsableAccion: "Carlos Gómez",
  },
  {
    id: "6", tipo: "Producto", nombre: "Pizza Margarita", categoria: "Pizzas",
    fechaRegistro: "2024-01-28", cantidadAfectada: 1, unidadMedida: "und",
    tipoNoConformidad: "Contaminación",
    descripcionProblema: "Cliente reportó presencia de cuerpo extraño (trozo de plástico) dentro de la pizza al momento de servirla.",
    causa: "Residuo de empaque de ingrediente no retirado antes del proceso",
    areaProceso: "Producción", lote: "L-2024-028", responsable: "Luis Herrera",
    estado: "En análisis", accionTomada: "Producto separado para análisis; cliente informado y compensado",
    accionCorrectiva: "Reforzar inspección visual de ingredientes antes del ensamble de pizzas",
    fechaLimite: "2024-02-03", responsableAccion: "María López",
  },
];

const emptyForm = (): Omit<NoConformidad, "id"> => ({
  tipo: "Producto",
  nombre: "",
  categoria: CATEGORIAS[0],
  fechaRegistro: new Date().toISOString().slice(0, 10),
  cantidadAfectada: 1,
  unidadMedida: "und",
  tipoNoConformidad: TIPOS_NC[0],
  descripcionProblema: "",
  causa: "",
  evidencia: undefined,
  areaProceso: AREAS[0],
  proveedor: "",
  lote: "",
  responsable: "",
  estado: "Pendiente",
  accionTomada: "",
  accionCorrectiva: "",
  fechaLimite: "",
  responsableAccion: "",
  fechaCierre: "",
  ventaRef: "",
  ordenRef: "",
});

function nextId(items: NoConformidad[]) {
  const nums = items
    .filter(i => /^\d+$/.test(i.id))
    .map(i => parseInt(i.id, 10))
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return String(max + 1);
}

function downloadXLSX(data: NoConformidad[]) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Resumen general ──
  const resumenHeaders = [
    "ID", "Tipo", "Producto / Insumo", "Categoría", "Fecha Registro",
    "Cantidad", "Unidad", "Motivo principal", "Descripción detallada",
    "Área de proceso", "Proveedor", "Lote", "Responsable", "Estado",
    "Acción tomada", "Acción correctiva", "Fecha límite",
    "Responsable acción", "Fecha cierre", "Referencia venta", "Referencia orden producción",
  ];
  const resumenRows = data.map(i => [
    i.id, i.tipo, i.nombre, i.categoria, i.fechaRegistro,
    i.cantidadAfectada, i.unidadMedida, i.tipoNoConformidad, i.descripcionProblema,
    i.areaProceso, i.proveedor || "", i.lote || "", i.responsable, i.estado,
    i.accionTomada || "", i.accionCorrectiva || "",
    i.fechaLimite || "", i.responsableAccion || "", i.fechaCierre || "",
    i.ventaRef || "", i.ordenRef || "",
  ]);
  const ws1 = XLSX.utils.aoa_to_sheet([resumenHeaders, ...resumenRows]);
  ws1["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
    { wch: 9 },  { wch: 8 },  { wch: 26 }, { wch: 40 },
    { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 12 },
    { wch: 30 }, { wch: 30 }, { wch: 13 }, { wch: 20 }, { wch: 13 },
    { wch: 18 }, { wch: 24 },
  ];
  ws1["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws1, "Todas las NC");

  // ── Sheet 2: Solo pendientes / en análisis ──
  const activos = data.filter(i => i.estado === "Pendiente" || i.estado === "En análisis");
  const activosRows = activos.map(i => [
    i.id, i.tipo, i.nombre, i.fechaRegistro, i.tipoNoConformidad,
    i.descripcionProblema, i.responsable, i.estado, i.fechaLimite || "",
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([
    ["ID", "Tipo", "Producto / Insumo", "Fecha", "Motivo", "Descripción", "Responsable", "Estado", "Fecha límite"],
    ...activosRows,
  ]);
  ws2["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 13 }, { wch: 26 },
    { wch: 40 }, { wch: 18 }, { wch: 12 }, { wch: 13 },
  ];
  ws2["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws2, "Pendientes");

  // ── Sheet 3: Por tipo ──
  const tipoMap: Record<Tipo, NoConformidad[]> = { Producto: [], Insumo: [], Venta: [] };
  data.forEach(i => tipoMap[i.tipo].push(i));
  const tipoResumen: (string | number)[][] = [
    ["Tipo", "Total registros", "Pendientes", "En análisis", "En proceso", "Cerrados"],
    ...Object.entries(tipoMap).map(([tipo, arr]) => [
      tipo,
      arr.length,
      arr.filter(i => i.estado === "Pendiente").length,
      arr.filter(i => i.estado === "En análisis").length,
      arr.filter(i => i.estado === "En proceso").length,
      arr.filter(i => i.estado === "Cerrado").length,
    ]),
  ];
  const motivoCount: Record<string, number> = {};
  data.forEach(i => { motivoCount[i.tipoNoConformidad] = (motivoCount[i.tipoNoConformidad] || 0) + 1; });
  const motivoRows = Object.entries(motivoCount)
    .sort((a, b) => b[1] - a[1])
    .map(([m, c]) => [m, c]);
  const ws3 = XLSX.utils.aoa_to_sheet([
    ...tipoResumen,
    [], [],
    ["Motivo más frecuente", "Ocurrencias"],
    ...motivoRows,
  ]);
  ws3["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Resumen por tipo");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `no-conformidades-${date}.xlsx`);
  toast.success("Archivo Excel descargado");
}

function weekOfMonth(dateStr: string): number {
  const d = new Date(dateStr + "T12:00:00");
  const firstDow = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  return Math.ceil((d.getDate() + firstDow) / 7);
}

function monthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
    .replace(/^\w/, c => c.toUpperCase());
}

function topMotive(entries: NoConformidad[]): string | null {
  if (!entries.length) return null;
  const counts: Record<string, number> = {};
  entries.forEach(e => { counts[e.tipoNoConformidad] = (counts[e.tipoNoConformidad] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function EstadoBadge({ e }: { e: EstadoNC }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${ESTADO_CONFIG[e]}`}>
      {e}
    </span>
  );
}

function TipoBadge({ tipo }: { tipo: Tipo }) {
  const cfg: Record<Tipo, string> = {
    Producto: "bg-blue-100 text-blue-800",
    Insumo:   "bg-amber-100 text-amber-800",
    Venta:    "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg[tipo]}`}>
      {tipo}
    </span>
  );
}

const iCls = "w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50";
const sCls = `${iCls} appearance-none cursor-pointer`;
const tCls = `${iCls} resize-y`;

interface Props {
  ventasPerdidas: VentaPerdida[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function ProductosPerecederosScreen({ ventasPerdidas, canCreate: _canCreate = true, canDelete = true }: Props) {
  const [items, setItems] = useState<NoConformidad[]>(INITIAL);
  const [search, setSearch] = useState("");
  const [filterEst, setFilterEst] = useState<EstadoNC | "">("");
  const [page, setPage] = useState(1);

  const [viewItem, setViewItem] = useState<NoConformidad | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NoConformidad | null>(null);
  const [form, setForm] = useState<Omit<NoConformidad, "id">>(emptyForm());

  // Autocomplete state for ventaRef
  const [showVentaSugg, setShowVentaSugg] = useState(false);

  // Analytics
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsMonthIdx, setAnalyticsMonthIdx] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);

  const ventasNC: NoConformidad[] = useMemo(() =>
    ventasPerdidas.map((v, idx) => ({
      id: `${idx + 1}-${v.id}`,
      tipo: "Venta" as Tipo,
      nombre: v.productos,
      categoria: "Ventas",
      fechaRegistro: v.fecha,
      cantidadAfectada: v.cantidad,
      unidadMedida: "und",
      tipoNoConformidad: "Pérdida en venta",
      descripcionProblema: `Total: $${v.total.toLocaleString("es-CO")}`,
      causa: `Registrado por: ${v.usuario}`,
      areaProceso: "Ventas",
      responsable: v.usuario,
      estado: "Pendiente" as EstadoNC,
      ventaRef: String(v.id),
    })),
  [ventasPerdidas]);

  const allItems = useMemo(() =>
    [...ventasNC, ...items].sort((a, b) => {
      if (b.fechaRegistro !== a.fechaRegistro) return b.fechaRegistro.localeCompare(a.fechaRegistro);
      return parseInt(b.id, 10) - parseInt(a.id, 10);
    }),
  [ventasNC, items]);

  const filtered = useMemo(() =>
    allItems.filter(i => {
      const q = search.toLowerCase();
      const matchQ = !q ||
        i.id.toLowerCase().includes(q) ||
        i.nombre.toLowerCase().includes(q) ||
        i.responsable.toLowerCase().includes(q) ||
        i.tipoNoConformidad.toLowerCase().includes(q);
      const matchEst = !filterEst || i.estado === filterEst;
      return matchQ && matchEst;
    }), [allItems, search, filterEst]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const set = (patch: Partial<Omit<NoConformidad, "id">>) =>
    setForm(f => ({ ...f, ...patch }));

  const handleNombreChange = (nombre: string) => {
    const detected = autoDetect(nombre);
    set({ nombre, ...detected });
  };

  const handleCreate = () => {
    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio."); return; }
    const newItem: NoConformidad = { id: nextId(items), ...form };
    setItems(prev => [newItem, ...prev]);
    setShowCreate(false);
    setForm(emptyForm());
    setShowVentaSugg(false);
    toast.success(`No conformidad ${newItem.id} registrada`);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setItems(prev => prev.filter(i => i.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success(`${deleteTarget.id} eliminado`);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set({ evidencia: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  // Venta suggestions for autocomplete
  const ventaSuggestions = useMemo(() => {
    const q = (form.ventaRef || "").toLowerCase();
    return ventasPerdidas
      .map(v => ({ id: String(v.id), label: `${v.id} — ${v.productos}` }))
      .filter(s => !q || s.id.includes(q) || s.label.toLowerCase().includes(q));
  }, [ventasPerdidas, form.ventaRef]);

  // Analytics
  const analytics = useMemo(() => {
    const monthMap: Record<string, Record<number, NoConformidad[]>> = {};
    allItems.forEach(item => {
      const ym = item.fechaRegistro.slice(0, 7);
      if (!monthMap[ym]) monthMap[ym] = {};
      const w = weekOfMonth(item.fechaRegistro);
      if (!monthMap[ym][w]) monthMap[ym][w] = [];
      monthMap[ym][w].push(item);
    });
    return Object.entries(monthMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([ym, weeks]) => ({
        ym,
        label: monthLabel(ym),
        weeks: Object.entries(weeks)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([wk, wItems]) => ({
            week: Number(wk),
            total: wItems.length,
            byTipo: {
              Producto: { items: wItems.filter(i => i.tipo === "Producto"), top: topMotive(wItems.filter(i => i.tipo === "Producto")) },
              Insumo:   { items: wItems.filter(i => i.tipo === "Insumo"),   top: topMotive(wItems.filter(i => i.tipo === "Insumo")) },
              Venta:    { items: wItems.filter(i => i.tipo === "Venta"),    top: topMotive(wItems.filter(i => i.tipo === "Venta")) },
            },
          })),
      }));
  }, [allItems]);

  const safeMonthIdx = Math.min(analyticsMonthIdx, Math.max(0, analytics.length - 1));
  const currentMonth = analytics[safeMonthIdx];

  // ── FormBody rendered as plain function call (not JSX component) to preserve focus ──
  const renderFormBody = (readOnly: boolean, previewId?: string) => {
    const nombreLabel = form.tipo === "Insumo" ? "Nombre del insumo" : "Nombre del producto";
    return (
      <div className="space-y-4 px-5 py-5 max-h-[68vh] overflow-y-auto">
        {previewId && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">ID</label>
            <input value={previewId} readOnly className={`${iCls} opacity-60 cursor-default`} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo</label>
            {readOnly
              ? <p className="text-sm font-semibold text-foreground py-2">{form.tipo}</p>
              : <select value={form.tipo} onChange={e => set({ tipo: e.target.value as Tipo })} className={sCls}>
                  <option>Producto</option>
                  <option>Insumo</option>
                </select>
            }
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Unidad de medida</label>
            {readOnly
              ? <p className="text-sm font-semibold text-foreground py-2">{form.unidadMedida}</p>
              : <select value={form.unidadMedida} onChange={e => set({ unidadMedida: e.target.value })} className={sCls}>
                  {UNIDADES.map(u => <option key={u}>{u}</option>)}
                </select>
            }
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">{nombreLabel}</label>
          {readOnly
            ? <div>
                <p className="text-sm font-semibold text-foreground py-2">{form.nombre}</p>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {form.tipo === "Producto" ? "Producto terminado" : form.tipo === "Insumo" ? "Insumo de producción" : "Pérdida en venta"}
                </span>
              </div>
            : <input
                value={form.nombre}
                onChange={e => handleNombreChange(e.target.value)}
                placeholder={form.tipo === "Insumo" ? "Ej: Harina de trigo" : "Ej: Pizza Pepperoni"}
                className={iCls}
              />
          }
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad afectada</label>
            {readOnly
              ? <p className="text-sm font-semibold text-foreground py-2">{form.cantidadAfectada} {form.unidadMedida}</p>
              : <input type="number" min={1} value={form.cantidadAfectada}
                  onChange={e => set({ cantidadAfectada: Number(e.target.value) })} className={iCls} />
            }
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha de registro</label>
            {readOnly
              ? <p className="text-sm font-semibold text-foreground py-2">{form.fechaRegistro}</p>
              : <input type="date" value={form.fechaRegistro}
                  onChange={e => set({ fechaRegistro: e.target.value })} className={iCls} />
            }
          </div>
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-muted/60 border-b border-border">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Descripción de la no conformidad</p>
          </div>
          <div className="p-3 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Título / motivo principal</label>
              {readOnly
                ? <span className="inline-block text-xs font-semibold px-3 py-1 bg-primary/10 text-primary rounded-full">{form.tipoNoConformidad}</span>
                : <select value={form.tipoNoConformidad} onChange={e => set({ tipoNoConformidad: e.target.value })} className={sCls}>
                    {TIPOS_NC.map(t => <option key={t}>{t}</option>)}
                  </select>
              }
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Descripción detallada</label>
              {readOnly
                ? <p className="text-sm text-foreground leading-relaxed py-1 whitespace-pre-wrap">{form.descripcionProblema || <span className="italic text-muted-foreground/50">Sin descripción</span>}</p>
                : <textarea
                    rows={4}
                    value={form.descripcionProblema}
                    onChange={e => set({ descripcionProblema: e.target.value })}
                    placeholder="Describe detalladamente qué ocurrió, síntomas observados, impacto..."
                    className={tCls}
                  />
              }
            </div>
          </div>
        </div>

        {!readOnly && (
          <div className="grid grid-cols-2 gap-3">
            {/* Venta reference with autocomplete */}
            <div className="relative">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Referencia de venta (opcional)</label>
              <input
                value={form.ventaRef || ""}
                onChange={e => { set({ ventaRef: e.target.value }); setShowVentaSugg(true); }}
                onFocus={() => setShowVentaSugg(true)}
                onBlur={() => setTimeout(() => setShowVentaSugg(false), 150)}
                placeholder="Buscar por ID o nombre..."
                autoComplete="off"
                className={iCls}
              />
              {showVentaSugg && ventaSuggestions.length > 0 && (
                <ul className="absolute z-30 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-44 overflow-y-auto">
                  {ventaSuggestions.map(s => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onMouseDown={() => { set({ ventaRef: s.id }); setShowVentaSugg(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer"
                      >
                        <span className="font-mono font-bold text-primary">{s.id}</span>
                        <span className="text-muted-foreground ml-2 text-xs truncate">{s.label.split("—")[1]?.trim()}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Referencia orden producción (opcional)</label>
              <input
                value={form.ordenRef || ""}
                onChange={e => set({ ordenRef: e.target.value })}
                placeholder="Ej: OP-001"
                className={iCls}
              />
            </div>
          </div>
        )}

        {readOnly && (form.ventaRef || form.ordenRef) && (
          <div className="grid grid-cols-2 gap-3">
            {form.ventaRef && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Venta de origen</label>
                <p className="text-sm font-semibold text-foreground font-mono">{form.ventaRef}</p>
              </div>
            )}
            {form.ordenRef && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Orden de producción</label>
                <p className="text-sm font-semibold text-foreground font-mono">{form.ordenRef}</p>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Foto de evidencia</label>
          {readOnly
            ? form.evidencia
              ? <img src={form.evidencia} alt="evidencia" className="w-full max-h-48 object-cover rounded-xl border border-border mt-1" />
              : <p className="text-sm text-muted-foreground/50 italic py-2">Sin evidencia adjunta</p>
            : <>
                <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={handleFile} />
                {form.evidencia ? (
                  <div className="relative rounded-xl overflow-hidden border border-border h-32">
                    <img src={form.evidencia} alt="evidencia" className="w-full h-full object-cover" />
                    <button onClick={() => set({ evidencia: undefined })}
                      className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-0.5 cursor-pointer hover:bg-black/80">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-border rounded-xl py-5 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-muted/40 transition-colors cursor-pointer">
                    <Upload className="w-5 h-5" />
                    <span className="text-xs font-medium">Subir imagen de evidencia</span>
                  </button>
                )}
              </>
          }
        </div>
      </div>
    );
  };

  // ── VentaDetail also rendered as plain function ──
  const renderVentaDetail = (item: NoConformidad) => (
    <div className="space-y-4 px-5 py-5">
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
        <ShoppingCart className="w-5 h-5 text-red-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-red-800">Pérdida originada en Ventas</p>
          <p className="text-xs text-red-600">Este registro se generó automáticamente al marcar la venta como pérdida.</p>
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">Información de la venta</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">ID Venta</label>
            <p className="text-sm font-semibold text-foreground font-mono">{item.ventaRef || item.id.split("-")[1] || item.id}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha</label>
            <p className="text-sm font-semibold text-foreground">{item.fechaRegistro}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Responsable</label>
            <p className="text-sm font-semibold text-foreground">{item.responsable}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad</label>
            <p className="text-sm font-semibold text-foreground">{item.cantidadAfectada} und</p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Productos</label>
          <p className="text-sm font-semibold text-foreground">{item.nombre}</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Motivo registrado</label>
          <span className="inline-block text-xs font-semibold px-3 py-1 bg-red-100 text-red-700 rounded-full">{item.tipoNoConformidad}</span>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Descripción</label>
          <p className="text-sm text-foreground leading-relaxed">{item.descripcionProblema}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground whitespace-nowrap" style={{ fontFamily: SERIF }}>
            Productos No Conformes
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {allItems.length} registros · {allItems.filter(i => i.estado === "Pendiente").length} pendientes
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => downloadXLSX(allItems)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-muted border border-border text-foreground font-semibold text-sm rounded-xl hover:bg-muted/80 active:scale-95 transition-all cursor-pointer shadow-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Descargar Excel
          </button>
          {_canCreate && (
            <button
              onClick={() => { setForm(emptyForm()); setShowCreate(true); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nueva no conformidad
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por ID, nombre, responsable, motivo..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={filterEst} onChange={e => { setFilterEst(e.target.value as EstadoNC | ""); setPage(1); }}
          className="px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none cursor-pointer appearance-none min-w-36">
          <option value="">Todo estado</option>
          <option>Pendiente</option>
          <option>En análisis</option>
          <option>En proceso</option>
          <option>Cerrado</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["ID", "Tipo", "Producto / Insumo", "Fecha", "Cantidad", "Motivo", "Origen", "Acciones"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-muted-foreground">
                    <p className="text-4xl mb-3">📋</p>
                    <p>No se encontraron registros</p>
                  </td>
                </tr>
              ) : paged.map(item => {
                const isVenta = item.tipo === "Venta";
                const origen = item.ventaRef
                  ? `Venta #${item.ventaRef}`
                  : item.ordenRef
                  ? `OP ${item.ordenRef}`
                  : isVenta
                  ? `Venta #${item.ventaRef || item.id.split("-")[1] || item.id}`
                  : null;
                return (
                  <tr key={item.id} className={`hover:bg-muted/20 transition-colors ${isVenta ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-3.5 text-xs font-mono font-bold text-foreground whitespace-nowrap">{item.id}</td>
                    <td className="px-4 py-3.5"><TipoBadge tipo={item.tipo} /></td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-foreground">{item.nombre}</p>
                      <p className="text-xs text-muted-foreground">{item.categoria}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{item.fechaRegistro}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-center text-foreground">
                      {item.cantidadAfectada} <span className="text-xs font-normal text-muted-foreground">{item.unidadMedida}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-foreground max-w-36">
                      <p className="font-semibold">{item.tipoNoConformidad}</p>
                      <p className="text-muted-foreground truncate text-[10px] mt-0.5">{item.descripcionProblema}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      {origen
                        ? <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-muted rounded-lg text-muted-foreground whitespace-nowrap">{origen}</span>
                        : <span className="text-xs text-muted-foreground/40 italic">—</span>
                      }
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { const { id: _id, ...rest } = item; setForm(rest); setViewItem(item); }}
                          title="Visualizar"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canDelete && !isVenta && (
                          <button onClick={() => setDeleteTarget(item)} title="Eliminar"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 cursor-pointer transition-colors">
                            <Trash2 className="w-4 h-4" />
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

      {/* Pagination */}
      {filtered.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center mt-4">
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>{n}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Analytics panel */}
      <div className="mt-6 bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowAnalytics(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <BarChart2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground" style={{ fontFamily: SERIF }}>
              Análisis por semana y mes
            </span>
            <span className="text-xs text-muted-foreground">— motivos de pérdida más frecuentes</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showAnalytics ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {showAnalytics && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5">
                {analytics.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin datos para analizar</p>
                ) : (
                  <>
                    {/* Month navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => setAnalyticsMonthIdx(i => Math.min(i + 1, analytics.length - 1))}
                        disabled={safeMonthIdx >= analytics.length - 1}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-sm font-semibold text-muted-foreground transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Anterior
                      </button>
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground" style={{ fontFamily: SERIF }}>{currentMonth?.label}</p>
                        <p className="text-xs text-muted-foreground">{currentMonth?.weeks.reduce((s, w) => s + w.total, 0)} registros en este mes</p>
                      </div>
                      <button
                        onClick={() => setAnalyticsMonthIdx(i => Math.max(i - 1, 0))}
                        disabled={safeMonthIdx <= 0}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-sm font-semibold text-muted-foreground transition-colors"
                      >
                        Siguiente
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {currentMonth && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted-foreground uppercase tracking-wider">
                              <th className="text-left py-2 pr-4 font-semibold whitespace-nowrap">Semana</th>
                              <th className="text-left py-2 pr-4 font-semibold">
                                <span className="inline-flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                                  Producto
                                </span>
                              </th>
                              <th className="text-left py-2 pr-4 font-semibold">
                                <span className="inline-flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                                  Insumo
                                </span>
                              </th>
                              <th className="text-left py-2 font-semibold">
                                <span className="inline-flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                                  Venta
                                </span>
                              </th>
                              <th className="text-right py-2 font-semibold text-muted-foreground/60">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {currentMonth.weeks.map(wk => (
                              <tr key={wk.week} className="hover:bg-muted/20 transition-colors">
                                <td className="py-2.5 pr-4 font-bold text-foreground whitespace-nowrap">Semana {wk.week}</td>
                                <td className="py-2.5 pr-4">
                                  {wk.byTipo.Producto.items.length > 0 ? (
                                    <div>
                                      <span className="font-semibold text-blue-700">{wk.byTipo.Producto.top}</span>
                                      <span className="text-muted-foreground ml-1">({wk.byTipo.Producto.items.length})</span>
                                    </div>
                                  ) : <span className="text-muted-foreground/40 italic">—</span>}
                                </td>
                                <td className="py-2.5 pr-4">
                                  {wk.byTipo.Insumo.items.length > 0 ? (
                                    <div>
                                      <span className="font-semibold text-amber-700">{wk.byTipo.Insumo.top}</span>
                                      <span className="text-muted-foreground ml-1">({wk.byTipo.Insumo.items.length})</span>
                                    </div>
                                  ) : <span className="text-muted-foreground/40 italic">—</span>}
                                </td>
                                <td className="py-2.5">
                                  {wk.byTipo.Venta.items.length > 0 ? (
                                    <div>
                                      <span className="font-semibold text-red-700">{wk.byTipo.Venta.top}</span>
                                      <span className="text-muted-foreground ml-1">({wk.byTipo.Venta.items.length})</span>
                                    </div>
                                  ) : <span className="text-muted-foreground/40 italic">—</span>}
                                </td>
                                <td className="py-2.5 text-right font-bold text-foreground">{wk.total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── MODAL: VIEW ── */}
      <AnimatePresence>
        {viewItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}
                className="bg-card rounded-2xl w-full max-w-2xl shadow-2xl border border-border my-4"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div>
                    <h3 className="text-base font-bold text-foreground" style={{ fontFamily: SERIF }}>
                      {viewItem.id} — {viewItem.nombre}
                    </h3>
                    <p className="text-xs text-muted-foreground">{viewItem.categoria} · {viewItem.areaProceso}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TipoBadge tipo={viewItem.tipo} />
                    <EstadoBadge e={viewItem.estado} />
                    <button onClick={() => setViewItem(null)}
                      className="ml-2 p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
                  </div>
                </div>

                {viewItem.tipo === "Venta"
                  ? renderVentaDetail(viewItem)
                  : renderFormBody(true, viewItem.id)
                }

                <div className="px-5 py-4 border-t border-border">
                  <button onClick={() => setViewItem(null)}
                    className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors">
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: CREATE ── */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}
                className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border my-4"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h3 className="text-base font-bold text-foreground" style={{ fontFamily: SERIF }}>Nueva no conformidad</h3>
                  <button onClick={() => setShowCreate(false)}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
                </div>
                {renderFormBody(false)}
                <div className="flex gap-3 px-5 py-4 border-t border-border">
                  <button onClick={() => setShowCreate(false)}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleCreate}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                    Registrar
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: DELETE ── */}
      <AnimatePresence>
        {deleteTarget && (
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
                <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: SERIF }}>¿Eliminar registro?</h3>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Se eliminará <strong>{deleteTarget.id}</strong> — <strong>{deleteTarget.nombre}</strong>. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button onClick={handleDelete}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors cursor-pointer active:scale-95">
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
