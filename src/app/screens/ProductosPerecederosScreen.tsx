import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, X, ChevronLeft, ChevronRight,
  Upload, ShoppingCart, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { SearchInput } from "../components/SearchInput";
import { ActionIcons } from "../components/ActionIcons";
import * as XLSX from "xlsx";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { BotonDescargarExcel } from "../components/BotonDescargarExcel";
import type { Insumo } from "./GestionInsumosScreen";
import type { Producto } from "./GestionProductosScreen";
import type { OrdenProduccion } from "./OrdenProduccionScreen";

const SERIF = "var(--font-titulo)";
const PER_PAGE = 5;

type Tipo = "Producto" | "Producto insumo" | "Venta";
type EstadoNC = "Pendiente" | "Completado";

export interface NoConformidad {
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
  tipoSolucion?: string;
  solucion?: string;
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
  Pendiente:  "bg-amber-100 text-amber-800",
  Completado: "bg-emerald-100 text-emerald-800",
};

const AREAS = ["Producción", "Compras", "Almacén", "Distribución", "Cocina", "Ventas"];
const TIPOS_SOLUCION = [
  "Reposición del producto", "Reproceso", "Reembolso al cliente",
];
const CATEGORIAS = ["Pizzas", "Bebidas", "Lasaña", "Insumo seco", "Insumo fresco", "Ventas", "Otro"];



export const INITIAL_NO_CONFORMIDADES: NoConformidad[] = [
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
    id: "2", tipo: "Producto insumo", nombre: "Harina de trigo", categoria: "Insumo seco",
    fechaRegistro: "2024-01-18", cantidadAfectada: 50, unidadMedida: "kg",
    tipoNoConformidad: "Mal almacenamiento",
    descripcionProblema: "Sacos de harina con humedad excesiva al abrir. La masa elaborada presenta grumos y no desarrolla bien la fermentación.",
    causa: "Filtración de humedad por goteras en zona de almacén",
    areaProceso: "Almacén", proveedor: "Molinos del Valle", lote: "L-2024-042", responsable: "Ana Torres",
    estado: "Pendiente", accionTomada: "Sacos afectados separados; muestra enviada a cocina para prueba",
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
    estado: "Completado", accionTomada: "Producto dado de baja y destruido",
    accionCorrectiva: "Revisión diaria de fechas de vencimiento en nevera de exhibición",
    tipoSolucion: "Reposición del producto",
    solucion: "Producto dado de baja y destruido por fecha vencida; se repuso el stock.",
    fechaLimite: "2024-01-12", responsableAccion: "Pedro Salazar", fechaCierre: "2024-01-12",
  },
  {
    id: "4", tipo: "Producto", nombre: "Lasaña Bolognesa", categoria: "Lasaña",
    fechaRegistro: "2024-01-22", cantidadAfectada: 2, unidadMedida: "und",
    tipoNoConformidad: "Defecto de calidad",
    descripcionProblema: "Dos lasañas devueltas por clientes por presencia de carne mal cocida en el centro. Temperatura interna insuficiente al servir.",
    causa: "Tiempo de cocción insuficiente por horno con falla de temperatura",
    areaProceso: "Cocina", lote: "L-2024-022", responsable: "Luis Herrera",
    estado: "Pendiente", accionTomada: "Producto retirado; se ofreció reposición al cliente",
    accionCorrectiva: "Calibración del horno y protocolo de verificación de temperatura interna",
    fechaLimite: "2024-01-27", responsableAccion: "Luis Herrera",
  },
  {
    id: "5", tipo: "Producto insumo", nombre: "Queso mozzarella", categoria: "Insumo fresco",
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
    estado: "Pendiente", accionTomada: "Producto separado para análisis; cliente informado y compensado",
    accionCorrectiva: "Reforzar inspección visual de ingredientes antes del ensamble de pizzas",
    fechaLimite: "2024-02-03", responsableAccion: "María López",
  },
];

const emptyForm = (): Omit<NoConformidad, "id"> => ({
  tipo: "Producto",
  nombre: "",
  categoria: CATEGORIAS[0],
      // Fecha local, no UTC (en Colombia tras las 19:00 `toISOString()` daba mañana).
      fechaRegistro: new Date().toLocaleDateString("en-CA"),
  cantidadAfectada: 1,
  unidadMedida: "und",
  tipoNoConformidad: "",
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
  tipoSolucion: "",
  solucion: "",
  ventaRef: "",
  ordenRef: "",
});

export function nextNoConformidadId(items: NoConformidad[]) {
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
    "N.º", "Tipo", "Producto / Insumo", "Categoría", "Fecha Registro",
    "Cantidad", "Unidad", "Motivo", "Descripción detallada",
    "Área de proceso", "Proveedor", "Lote", "Responsable", "Estado",
    "Acción tomada", "Acción correctiva", "Fecha límite",
    "Responsable acción", "Fecha cierre", "Venta relacionada", "Orden de producción relacionada",
    "Tipo de solución", "Solución",
  ];
  const resumenRows = data.map(i => [
    i.id, i.tipo, i.nombre, i.categoria, i.fechaRegistro,
    i.cantidadAfectada, i.unidadMedida, i.tipoNoConformidad, i.descripcionProblema,
    i.areaProceso, i.proveedor || "", i.lote || "", i.responsable, i.estado,
    i.accionTomada || "", i.accionCorrectiva || "",
    i.fechaLimite || "", i.responsableAccion || "", i.fechaCierre || "",
    i.ventaRef || "", i.ordenRef || "", i.tipoSolucion || "", i.solucion || "",
  ]);
  const ws1 = XLSX.utils.aoa_to_sheet([resumenHeaders, ...resumenRows]);
  ws1["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
    { wch: 9 },  { wch: 8 },  { wch: 26 }, { wch: 40 },
    { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 12 },
    { wch: 30 }, { wch: 30 }, { wch: 13 }, { wch: 20 }, { wch: 13 },
    { wch: 18 }, { wch: 24 }, { wch: 22 }, { wch: 40 },
  ];
  ws1["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws1, "Todas las NC");

  // ── Sheet 2: Solo pendientes ──
  const activos = data.filter(i => i.estado === "Pendiente");
  const activosRows = activos.map(i => [
    i.id, i.tipo, i.nombre, i.fechaRegistro, i.tipoNoConformidad,
    i.descripcionProblema, i.responsable, i.estado, i.fechaLimite || "",
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([
    ["N.º", "Tipo", "Producto / Insumo", "Fecha", "Motivo", "Descripción", "Responsable", "Estado", "Fecha límite"],
    ...activosRows,
  ]);
  ws2["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 13 }, { wch: 26 },
    { wch: 40 }, { wch: 18 }, { wch: 12 }, { wch: 13 },
  ];
  ws2["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws2, "Pendientes");

  // ── Sheet 3: Por tipo ──
  const tipoMap: Record<Tipo, NoConformidad[]> = { Producto: [], "Producto insumo": [], Venta: [] };
  data.forEach(i => tipoMap[i.tipo].push(i));
  const tipoResumen: (string | number)[][] = [
    ["Tipo", "Total registros", "Pendientes", "Completados"],
    ...Object.entries(tipoMap).map(([tipo, arr]) => [
      tipo,
      arr.length,
      arr.filter(i => i.estado === "Pendiente").length,
      arr.filter(i => i.estado === "Completado").length,
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
  ws3["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Resumen por tipo");

  // Fecha local, no UTC: `toISOString()` en Colombia (UTC-5) después de las 19:00
  // fechaba la merma con el día siguiente.
  const date = new Date().toLocaleDateString("en-CA");
  XLSX.writeFile(wb, `no-conformidades-${date}.xlsx`);
  toast.success("Archivo Excel descargado");
}

function EstadoBadge({ e }: { e: EstadoNC }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ESTADO_CONFIG[e]}`}>
      {e}
    </span>
  );
}

function TipoBadge({ tipo }: { tipo: Tipo }) {
  const cfg: Record<Tipo, string> = {
    Producto: "bg-blue-100 text-blue-800",
    "Producto insumo":   "bg-amber-100 text-amber-800",
    Venta:    "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${cfg[tipo]}`}>
      {tipo}
    </span>
  );
}

const iCls = "w-full px-3 py-2.5 bg-muted dark:bg-input border border-transparent rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50";
const sCls = `${iCls} appearance-none cursor-pointer`;
const tCls = `${iCls} resize-y`;

interface Props {
  ventasPerdidas: VentaPerdida[];
  insumos: Insumo[];
  productos: Producto[];
  /**
   * Escritor del catálogo de productos que vive en App (P17b). Opcional para
   * no romper el render actual: mientras App no lo pase, registrar la
   * no conformidad funciona igual y solo falta el movimiento de stock.
   */
  setProductos?: React.Dispatch<React.SetStateAction<Producto[]>>;
  ordenesProduccion: OrdenProduccion[];
  noConformidades: NoConformidad[];
  setNoConformidades: React.Dispatch<React.SetStateAction<NoConformidad[]>>;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExportExcel?: boolean;
}

export function ProductosPerecederosScreen({ ventasPerdidas, insumos, productos, setProductos, ordenesProduccion, noConformidades, setNoConformidades, canCreate: _canCreate = true, canDelete = true, canExportExcel = true }: Props) {
  const [search, setSearch] = useState("");
  const [filterEst, setFilterEst] = useState<EstadoNC | "">("");
  const [page, setPage] = useState(1);

  const [viewItem, setViewItem] = useState<NoConformidad | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NoConformidad | null>(null);
  const [form, setForm] = useState<Omit<NoConformidad, "id">>(emptyForm());

  // Autocomplete state for ventaRef
  const [showVentaSugg, setShowVentaSugg] = useState(false);
  const [showOrdenSugg, setShowOrdenSugg] = useState(false);

  // Buscador de ventas: número de venta + nombre del cliente.
  const ventaSuggestions = useMemo(() => {
    const q = (form.ventaRef || "").toLowerCase();
    return ventasPerdidas
      .map(v => ({ id: String(v.id), label: `${v.id} · ${v.usuario}` }))
      .filter(s => !q || s.id.includes(q) || s.label.toLowerCase().includes(q));
  }, [ventasPerdidas, form.ventaRef]);

  // Buscador de órdenes: solo las del tipo que corresponde a la no conformidad.
  const tipoOrdenBuscado = form.tipo === "Producto insumo" ? "preparacion" : "pedido";
  const ordenSuggestions = useMemo(() => {
    const q = (form.ordenRef || "").toLowerCase();
    return ordenesProduccion
      .filter(o => o.tipo === tipoOrdenBuscado)
      .map(o => ({ id: o.id, label: `${o.id} · ${o.lineas[0]?.nombre ?? o.cliente ?? "Orden"}` }))
      .filter(s => !q || s.id.includes(q) || s.label.toLowerCase().includes(q));
  }, [ordenesProduccion, form.ordenRef, tipoOrdenBuscado]);


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
    [...ventasNC, ...noConformidades]
      .sort((a, b) => {
        if (b.fechaRegistro !== a.fechaRegistro) return b.fechaRegistro.localeCompare(a.fechaRegistro);
        return parseInt(b.id, 10) - parseInt(a.id, 10);
      }),
  [ventasNC, noConformidades]);

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

  /**
   * Movimiento de stock al registrar un producto no conforme (P17b).
   *
   * Una no conformidad de tipo "Producto" es una MERMA: esas unidades dejan
   * de estar disponibles, así que el stock del producto elegido baja aquí
   * (nunca por debajo de 0, igual que en Orden de Producción).
   *
   * Punto de integración con VENTAS: esta pantalla solo recibe las ventas ya
   * marcadas como pérdida (`ventasPerdidas`) y SIN detalle por producto, y
   * llegan después de que la venta existió; por eso el descuento por venta no
   * puede vivir acá. Lo debe hacer el flujo que CONFIRMA la venta
   * (VentasScreen / App, al crearla) sobre `setProductos`, con la misma regla
   * stock = max(0, stock − cantidad vendida): así cada venta descuenta una
   * sola vez y este formulario no duplica el movimiento.
   *
   * Mientras App no pase `setProductos`, esta función no hace nada y el
   * registro de la no conformidad sigue funcionando tal cual.
   *
   * Alcance: solo tipo "Producto". Las no conformidades de "Producto insumo"
   * afectan el `stockActual` del módulo Insumos y necesitarían su propio
   * `setInsumos`, que esta pantalla no recibe.
   */
  const descontarStockMerma = (nombre: string, cantidad: number) => {
    if (!setProductos) return;
    if (!nombre.trim() || !Number.isFinite(cantidad) || cantidad <= 0) return;
    const producto = productos.find(p => p.nombre === nombre);
    if (!producto) return;
    const antes = producto.stockDisponible;
    const despues = Math.max(0, Math.round((antes - cantidad) * 100) / 100);
    if (despues === antes) return;
    setProductos(prev =>
      prev.map(p => (p.id === producto.id ? { ...p, stockDisponible: despues } : p)),
    );
    toast.success(`Stock de ${nombre}: ${antes} → ${despues}`);
  };

  const handleCreate = () => {
    if (!form.nombre.trim()) { toast.error("Selecciona un producto."); return; }
    if (!form.tipoNoConformidad.trim()) { toast.error("El motivo es obligatorio."); return; }
    const hoy = new Date().toLocaleDateString("en-CA");
    if (form.fechaRegistro > hoy) { toast.error("La fecha de registro no puede ser futura."); return; }
    const newItem: NoConformidad = { id: nextNoConformidadId(noConformidades), ...form };
    setNoConformidades(prev => [newItem, ...prev]);
    // Merma: el producto registrado sale del stock (P17b).
    if (newItem.tipo === "Producto") {
      descontarStockMerma(newItem.nombre, newItem.cantidadAfectada);
    }
    setShowCreate(false);
    setForm(emptyForm());
    setShowVentaSugg(false);
    setShowOrdenSugg(false);
    toast.success(`No conformidad ${newItem.id} registrada`);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setNoConformidades(prev => prev.filter(i => i.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success(`${deleteTarget.id} eliminado`);
  };


  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const esImagenValida = ["image/jpeg", "image/jpg", "image/png"].includes(file.type);
    if (!esImagenValida) {
      toast.error("Solo se permiten imágenes JPG o PNG.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar los 5 MB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => set({ evidencia: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  // ── FormBody rendered as plain function call (not JSX component) to preserve focus ──
  const renderFormBody = (readOnly: boolean, previewId?: string) => {
    // En modo consulta lee el registro (viewItem); en modo alta usa el formulario.
    const f = readOnly && viewItem ? viewItem : form;
    // Selector de producto EXISTENTE (P17b): siempre es un <select> con el
    // catálogo, nunca texto libre. Se muestra el stock porque es el que baja
    // cuando la merma se registra (ver descontarStockMerma).
    const opcionesProducto = f.tipo === "Producto insumo"
      ? insumos.filter(i => i.tipo === "ProductoInsumo").map(i => ({ nombre: i.nombre, unidad: i.unidadMedida, stock: i.stockActual }))
      : productos.filter(p => p.estado !== "Descontinuado").map(p => ({ nombre: p.nombre, unidad: p.unidadVenta || "und", stock: p.stockDisponible }));
    return (
      <div className="space-y-4 px-6 py-5">
        {previewId && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">N.º</label>
            <p className="text-sm font-semibold text-foreground py-2">{previewId}</p>
          </div>
        )}

        {/* Fila 1: Fecha de registro | Tipo */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha de registro</label>
            {readOnly
              ? <p className="text-sm font-semibold text-foreground py-2">{f.fechaRegistro}</p>
              : <input type="date" value={f.fechaRegistro}
                  max={new Date().toLocaleDateString("en-CA")}
                  onChange={e => set({ fechaRegistro: e.target.value })} className={iCls} />
            }
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo</label>
            {readOnly
              ? <p className="text-sm font-semibold text-foreground py-2">{f.tipo}</p>
              : <div className="relative">
                  <select value={f.tipo} onChange={e => {
                    const t = e.target.value as Tipo;
                    set({ tipo: t, nombre: "", unidadMedida: t === "Producto" ? "und" : "", ventaRef: "", ordenRef: "" });
                  }} className={sCls}>
                    <option value="Producto">Producto</option>
                    <option value="Producto insumo">Producto insumo</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 text-muted-foreground" />
                </div>
            }
          </div>
        </div>

        {/* Fila 2: Orden de producción relacionada | Venta relacionada (según el tipo) */}
        {!readOnly && (
          <div className="grid grid-cols-2 gap-3">
            <div className={`relative ${f.tipo === "Producto insumo" ? "col-span-2" : ""}`}>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Orden de producción relacionada (opcional)</label>
              <input
                value={f.ordenRef || ""}
                onChange={e => { set({ ordenRef: e.target.value }); setShowOrdenSugg(true); }}
                onFocus={() => setShowOrdenSugg(true)}
                onBlur={() => setTimeout(() => setShowOrdenSugg(false), 150)}
                placeholder="Buscar por número de orden o producto…"
                autoComplete="off"
                className={iCls}
              />
              {showOrdenSugg && ordenSuggestions.length > 0 && (
                <ul className="absolute z-30 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-44 overflow-y-auto">
                  {ordenSuggestions.map(s => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onMouseDown={() => { set({ ordenRef: s.id }); setShowOrdenSugg(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer"
                      >
                        <span className="font-mono font-bold text-primary">{s.id}</span>
                        <span className="text-muted-foreground ml-2 text-xs truncate">{s.label.split("·").slice(1).join("·").trim()}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {f.tipo === "Producto" && (
              <div className="relative">
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Venta relacionada (opcional)</label>
                <input
                  value={f.ventaRef || ""}
                  onChange={e => { set({ ventaRef: e.target.value }); setShowVentaSugg(true); }}
                  onFocus={() => setShowVentaSugg(true)}
                  onBlur={() => setTimeout(() => setShowVentaSugg(false), 150)}
                  placeholder="Buscar por número de venta o cliente…"
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
                          <span className="text-muted-foreground ml-2 text-xs truncate">{s.label.split("·").slice(1).join("·").trim()}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Fila 3: Producto (selector, ancho completo) */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Producto</label>
          {readOnly
            ? <div>
                <p className="text-sm font-semibold text-foreground py-2">{f.nombre}</p>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {f.tipo === "Producto" ? "Producto del menú" : f.tipo === "Producto insumo" ? "Producto insumo" : "Pérdida en venta"}
                </span>
              </div>
            : <div className="relative">
                {/* SELECT de productos existentes (P17b): el valor que sale
                    del combo es el nombre exacto del catálogo, así que nunca
                    se puede escribir un producto que no exista. */}
                <select value={f.nombre} onChange={e => {
                  const sel = opcionesProducto.find(o => o.nombre === e.target.value);
                  if (sel) set({ nombre: sel.nombre, unidadMedida: sel.unidad });
                  else set({ nombre: "", unidadMedida: f.tipo === "Producto" ? "und" : "" });
                }} className={sCls}>
                  <option value="">Selecciona…</option>
                  {opcionesProducto.map(o => (
                    <option key={o.nombre} value={o.nombre}>
                      {o.nombre} · {o.stock} {o.unidad} en stock
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 text-muted-foreground" />
              </div>
          }
          {/* Deja visible el movimiento de stock que implica el registro (P17b). */}
          {!readOnly && f.tipo === "Producto" && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Al registrar, las unidades afectadas se descuentan del stock de este producto.
            </p>
          )}
        </div>

        {/* Fila 4: Cantidad afectada | Unidad de medida (automática, solo lectura) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad afectada</label>
            {readOnly
              ? <p className="text-sm font-semibold text-foreground py-2">{f.cantidadAfectada} {f.unidadMedida}</p>
              : <input type="number" min={1} value={f.cantidadAfectada}
                  onChange={e => set({ cantidadAfectada: Number(e.target.value) })} className={iCls} />
            }
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Unidad de medida</label>
            {readOnly
              ? <p className="text-sm font-semibold text-foreground py-2">{f.unidadMedida}</p>
              : <input value={f.unidadMedida} readOnly placeholder="—"
                  className={`${iCls} opacity-70 cursor-default`} />
            }
          </div>
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-muted/60 border-b border-border">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Descripción de la no conformidad</p>
          </div>
          <div className="p-3 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Motivo</label>
              {readOnly
                ? <span className="inline-block text-xs font-semibold px-3 py-1 bg-primary/10 text-primary rounded-full">{f.tipoNoConformidad}</span>
                : <input
                    value={f.tipoNoConformidad}
                    onChange={e => set({ tipoNoConformidad: e.target.value })}
                    placeholder="Ej: Masa con sabor ácido"
                    className={iCls}
                  />
              }
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Descripción detallada</label>
              {readOnly
                ? <p className="text-sm text-foreground leading-relaxed py-1 whitespace-pre-wrap">{f.descripcionProblema || <span className="italic text-muted-foreground/50">Sin descripción</span>}</p>
                : <textarea
                    rows={2}
                    value={f.descripcionProblema}
                    onChange={e => set({ descripcionProblema: e.target.value })}
                    placeholder="Describe qué pasó, qué se observó y a qué afectó…"
                    className={tCls}
                  />
              }
            </div>
          </div>
        </div>

        {!readOnly && (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-muted/60 border-b border-border">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Solución de la no conformidad</p>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo de solución</label>
                <select value={f.tipoSolucion ?? ""} onChange={e => set({ tipoSolucion: e.target.value })} className={sCls}>
                  <option value="">Selecciona…</option>
                  {TIPOS_SOLUCION.map(t => {
                    const bloqueado = t === "Reembolso al cliente" && !(f.tipo === "Producto" && f.ventaRef);
                    return <option key={t} value={t} disabled={bloqueado} title={bloqueado ? "Requiere una venta relacionada" : undefined}>{t}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Solución aplicada</label>
                <textarea rows={2} value={f.solucion ?? ""} onChange={e => set({ solucion: e.target.value })}
                  placeholder="Describe qué se hizo o se hará para resolver la no conformidad..." className={tCls} />
              </div>
            </div>
          </div>
        )}

        {readOnly && (f.ventaRef || f.ordenRef) && (
          <div className="grid grid-cols-2 gap-3">
            {f.ventaRef && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Venta de origen</label>
                <p className="text-sm font-semibold text-foreground font-mono">{f.ventaRef}</p>
              </div>
            )}
            {f.ordenRef && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Orden de producción</label>
                <p className="text-sm font-semibold text-foreground font-mono">{f.ordenRef}</p>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Foto de evidencia</label>
          {readOnly
            ? f.evidencia
              ? <img src={f.evidencia} alt="evidencia" className="w-full max-h-48 object-cover rounded-xl border border-border mt-1" />
              : <p className="text-sm text-muted-foreground/50 italic py-2">Sin evidencia adjunta</p>
            : <>
                <input type="file" accept="image/jpeg,image/png" ref={fileRef} className="hidden" onChange={handleFile} />
                {f.evidencia ? (
                  <div className="relative rounded-xl overflow-hidden border border-border h-32">
                    <img src={f.evidencia} alt="evidencia" className="w-full h-full object-cover" />
                    <button onClick={() => set({ evidencia: undefined })}
                      className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-0.5 cursor-pointer hover:bg-black/80">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => fileRef.current?.click()}
                      className="w-full border-2 border-dashed border-border rounded-xl py-4 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-muted/40 transition-colors cursor-pointer">
                      <Upload className="w-5 h-5" />
                      <span className="text-xs font-medium">Subir imagen de evidencia</span>
                    </button>
                    <p className="text-[11px] text-muted-foreground mt-1.5 text-center">JPG o PNG · máx 5 MB</p>
                  </>
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
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Número de venta</label>
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

  const renderSolucionPanel = () => {
    if (!viewItem) return null;
    // Siempre de solo lectura en el detalle: texto, nunca inputs editables.
    return (
      <div className="mx-5 mb-5 border border-emerald-200 rounded-xl overflow-hidden">
        <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-200">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Solución de la no conformidad</p>
        </div>
        <div className="p-3 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo de solución</label>
            <p className="text-sm font-semibold text-foreground py-1">{viewItem.tipoSolucion || "—"}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Solución aplicada</label>
            <p className="text-sm text-foreground leading-relaxed py-1 whitespace-pre-wrap">{viewItem.solucion || "—"}</p>
          </div>
          {viewItem.fechaCierre && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha de cierre</label>
              <p className="text-sm font-semibold text-foreground py-1">{viewItem.fechaCierre}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

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
          {canExportExcel && <BotonDescargarExcel onClick={() => downloadXLSX(allItems)} />}
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
        <SearchInput
          value={search}
          onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Buscar por número, nombre, responsable, motivo..."
          wrapperClassName="flex-1 min-w-48 max-w-sm"
        />
        <select value={filterEst} onChange={e => { setFilterEst(e.target.value as EstadoNC | ""); setPage(1); }}
          className="px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none cursor-pointer appearance-none min-w-36">
          <option value="">Todo estado</option>
          <option>Pendiente</option>
          <option>Completado</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Mismo patrón de tabla que el resto del panel (P16): cabecera
                text-xs en mayúsculas, th px-4 py-2, celdas px-4 py-2.5 con
                texto text-sm y filas de 61 px (igual que Gestión de Producto
                y Categoría de Producto). */}
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["N.º", "Tipo", "Producto / Insumo", "Fecha", "Cantidad", "Motivo", "Origen", "Acciones"].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
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
                  <tr key={item.id} className={`hover:bg-muted/20 transition-colors h-[61px] ${isVenta ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-2.5 text-sm font-mono font-bold text-foreground whitespace-nowrap">{item.id}</td>
                    <td className="px-4 py-2.5"><TipoBadge tipo={item.tipo} /></td>
                    <td className="px-4 py-2.5">
                      <p className="text-sm font-medium text-foreground">{item.nombre}</p>
                      <p className="text-xs text-muted-foreground">{item.categoria}</p>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground whitespace-nowrap">{item.fechaRegistro}</td>
                    <td className="px-4 py-2.5 text-sm font-bold text-center text-foreground">
                      {item.cantidadAfectada} <span className="text-xs font-normal text-muted-foreground">{item.unidadMedida}</span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-foreground max-w-36">
                      <p className="font-semibold">{item.tipoNoConformidad}</p>
                      <p className="text-muted-foreground truncate text-xs mt-0.5">{item.descripcionProblema}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      {origen
                        ? <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-muted rounded-lg text-muted-foreground whitespace-nowrap">{origen}</span>
                        : <span className="text-xs text-muted-foreground/40 italic">—</span>
                      }
                    </td>
                    <td className="px-4 py-2.5">
                      <ActionIcons
                        onView={() => setViewItem(item)}
                        onDelete={canDelete && !isVenta ? () => setDeleteTarget(item) : undefined}
                      />
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


      {/* ── MODAL: VIEW ── */}
      <AnimatePresence>
        {viewItem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm overflow-y-auto p-4"
          >
            <div className="flex min-h-full items-center justify-center">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}
              className="bg-card rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl border border-border flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
                  {viewItem.id} · {viewItem.nombre}
                </h3>
                <p className="text-xs text-muted-foreground">{viewItem.categoria} · {viewItem.areaProceso}</p>
              </div>
              <div className="flex items-center gap-2">
                <TipoBadge tipo={viewItem.tipo} />
                <EstadoBadge e={viewItem.estado} />
                <button onClick={() => setViewItem(null)}
                  className="ml-2 p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {viewItem.tipo === "Venta"
                ? renderVentaDetail(viewItem)
                : renderFormBody(true, viewItem.id)
              }

              {renderSolucionPanel()}
            </div>

            <div className="px-6 py-4 border-t border-border shrink-0">
              <button onClick={() => setViewItem(null)}
                className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors">
                Cerrar
              </button>
            </div>
            </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: CREATE ── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm overflow-y-auto p-4"
          >
            <div className="flex min-h-full items-center justify-center">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}
              className="bg-card rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl border border-border flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Registrar producto no conforme</h3>
              <button onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {renderFormBody(false)}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
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
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── MODAL: DELETE ── */}
      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDeleteModal
            title="¿Eliminar registro?"
            message={<>Se eliminará <strong>{deleteTarget.id}</strong> — <strong>{deleteTarget.nombre}</strong>. Esta acción no se puede deshacer.</>}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
