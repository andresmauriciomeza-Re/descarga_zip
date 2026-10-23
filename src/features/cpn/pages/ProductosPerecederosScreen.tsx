import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, X,
  Upload, ShoppingCart, ChevronDown, CheckCircle2, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginador";
import { ActionIcons } from "@/shared/components/ActionIcons";
import { SegmentadoButtons } from "@/shared/components/SegmentadoButtons";
import * as XLSX from "xlsx";
import { ConfirmDeleteModal } from "@/shared/components/ConfirmDeleteModal";
import { BotonDescargarExcel } from "@/shared/components/BotonDescargarExcel";
import type { Insumo } from "@/features/insumos/pages/GestionInsumosScreen";
import type { Producto } from "@/features/productos/pages/GestionProductosScreen";
import type { OrdenProduccion } from "@/features/orden-produccion/pages/OrdenProduccionScreen";
import { useSubirArchivo } from "@/shared/hooks/useSubirArchivo";
import { limpiarNumeroInput, numeroDeInput } from "@/shared/utils/numeroInput";
import {
  actualizarNoConformidad,
  completarNoConformidad,
  crearNoConformidad,
  eliminarNoConformidad,
  mensajeErrorNoConformes,
} from "@/features/cpn/services/noConformesApi";

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
  /** Ids reales del catálogo (vienen de la API). Producto: id_producto como
      texto; Producto insumo: "INS-###". */
  idProducto?: string;
  idInsumo?: string;
  /** id_orden_produccion de la merma (el detalle de la orden la busca así). */
  idOrdenProduccion?: number;
  /** Merma de producción o devolución: los crea el backend y no se eliminan. */
  generadoPorSistema?: boolean;
}

/** Venta que se puede enlazar a una no conformidad (buscador del formulario). */
interface VentaSugerida {
  id: string;
  usuario: string;
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
  /** Ventas que se pueden enlazar como «Venta relacionada» (buscador). */
  ventasSugeridas: VentaSugerida[];
  insumos: Insumo[];
  productos: Producto[];
  ordenesProduccion: OrdenProduccion[];
  noConformidades: NoConformidad[];
  setNoConformidades: React.Dispatch<React.SetStateAction<NoConformidad[]>>;
  /** Carga de la lista desde la API y su error ("Reintentar"): nunca datos
      de ejemplo. */
  cargando?: boolean;
  errorCarga?: string | null;
  onReintentar?: () => void;
  /** Crear o eliminar un registro manual mueve stock en la base (producto de
      reventa o insumo): App recarga productos e insumos. */
  onInventarioCambiado?: () => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExportExcel?: boolean;
}

export function ProductosPerecederosScreen({ ventasSugeridas, insumos, productos, ordenesProduccion, noConformidades, setNoConformidades, cargando = false, errorCarga, onReintentar, onInventarioCambiado, canCreate: _canCreate = true, canEdit = true, canDelete = true, canExportExcel = true }: Props) {
  const [search, setSearch] = useState("");
  const [filterEst, setFilterEst] = useState<EstadoNC | "">("");
  const [page, setPage] = useState(1);

  const [viewItem, setViewItem] = useState<NoConformidad | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  // Edición (solo Pendiente): reutiliza el formulario con los datos de
  // identidad (producto, cantidad, motivo…) en solo lectura.
  const [editItem, setEditItem] = useState<NoConformidad | null>(null);
  // Cierre: Pendiente → Completado con tipo de solución y solución aplicada.
  const [completarItem, setCompletarItem] = useState<NoConformidad | null>(null);
  const [completarForm, setCompletarForm] = useState({ tipoSolucion: "", solucion: "" });
  const [deleteTarget, setDeleteTarget] = useState<NoConformidad | null>(null);
  const [form, setForm] = useState<Omit<NoConformidad, "id">>(emptyForm());
  const [guardando, setGuardando] = useState(false);
  const { subir, subiendo } = useSubirArchivo();

  // Autocomplete state for ventaRef
  const [showVentaSugg, setShowVentaSugg] = useState(false);
  const [showOrdenSugg, setShowOrdenSugg] = useState(false);

  // Buscador de ventas: número de venta + nombre del cliente.
  const ventaSuggestions = useMemo(() => {
    const q = (form.ventaRef || "").toLowerCase();
    return ventasSugeridas
      .map(v => ({ id: String(v.id), label: `${v.id} · ${v.usuario}` }))
      .filter(s => !q || s.id.includes(q) || s.label.toLowerCase().includes(q));
  }, [ventasSugeridas, form.ventaRef]);

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

  // Todo viene de la API: las pérdidas en venta son registros tipo "Venta" que
  // crea el backend al resolver una devolución con «Producto malo».
  const allItems = useMemo(() =>
    [...noConformidades]
      .sort((a, b) => {
        if (b.fechaRegistro !== a.fechaRegistro) return b.fechaRegistro.localeCompare(a.fechaRegistro);
        return parseInt(b.id, 10) - parseInt(a.id, 10);
      }),
  [noConformidades]);

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

  /** Alta contra la API. El stock lo mueve el backend en la misma transacción
      (producto de reventa o insumo; los elaborados no tienen stock propio) y
      rechaza la cantidad si supera el stock actual. */
  const handleCreate = async () => {
    const idCatalogo = form.tipo === "Producto" ? form.idProducto : form.idInsumo;
    if (!idCatalogo || !form.nombre.trim()) { toast.error("Selecciona un producto."); return; }
    if (!form.tipoNoConformidad.trim()) { toast.error("El motivo es obligatorio."); return; }
    if (!(form.cantidadAfectada > 0)) { toast.error("La cantidad afectada debe ser mayor que cero."); return; }
    const hoy = new Date().toLocaleDateString("en-CA");
    if (form.fechaRegistro > hoy) { toast.error("La fecha de registro no puede ser futura."); return; }
    if (guardando) return;
    setGuardando(true);
    try {
      const creada = await crearNoConformidad(form);
      setNoConformidades(prev => [creada, ...prev]);
      setShowCreate(false);
      setForm(emptyForm());
      setShowVentaSugg(false);
      setShowOrdenSugg(false);
      toast.success(`No conformidad ${creada.id} registrada`);
      onInventarioCambiado?.();
    } catch (error) {
      toast.error(mensajeErrorNoConformes(error, "No se pudo registrar la no conformidad."));
    } finally {
      setGuardando(false);
    }
  };

  /** Edición (solo Pendiente): descripción, solución y foto. */
  const abrirEditar = (item: NoConformidad) => {
    const { id: _id, ...datos } = item;
    setForm({ ...datos });
    setEditItem(item);
  };

  const handleEdit = async () => {
    if (!editItem || guardando) return;
    setGuardando(true);
    try {
      const actualizada = await actualizarNoConformidad(editItem.id, form);
      setNoConformidades(prev => prev.map(i => (i.id === actualizada.id ? actualizada : i)));
      setEditItem(null);
      setForm(emptyForm());
      toast.success(`No conformidad ${actualizada.id} actualizada`);
    } catch (error) {
      toast.error(mensajeErrorNoConformes(error, "No se pudo actualizar la no conformidad."));
    } finally {
      setGuardando(false);
    }
  };

  const abrirCompletar = (item: NoConformidad) => {
    setCompletarForm({ tipoSolucion: item.tipoSolucion ?? "", solucion: item.solucion ?? "" });
    setCompletarItem(item);
  };

  /** Pendiente → Completado: el backend guarda la fecha de cierre (hoy, Bogotá). */
  const handleCompletar = async () => {
    if (!completarItem || guardando) return;
    if (!completarForm.tipoSolucion) { toast.error("Elige el tipo de solución."); return; }
    if (!completarForm.solucion.trim()) { toast.error("Describe la solución aplicada."); return; }
    setGuardando(true);
    try {
      const completada = await completarNoConformidad(
        completarItem.id,
        completarForm.tipoSolucion,
        completarForm.solucion.trim(),
      );
      setNoConformidades(prev => prev.map(i => (i.id === completada.id ? completada : i)));
      setCompletarItem(null);
      toast.success(`No conformidad ${completada.id} completada`);
    } catch (error) {
      toast.error(mensajeErrorNoConformes(error, "No se pudo completar la no conformidad."));
    } finally {
      setGuardando(false);
    }
  };

  /** Solo Pendientes manuales; el backend devuelve el stock descontado. */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const objetivo = deleteTarget;
    try {
      await eliminarNoConformidad(objetivo.id);
    } catch (error) {
      toast.error(mensajeErrorNoConformes(error, "No se pudo eliminar el registro."));
      setDeleteTarget(null);
      return;
    }
    setNoConformidades(prev => prev.filter(i => i.id !== objetivo.id));
    setDeleteTarget(null);
    toast.success(`${objetivo.id} eliminado`);
    onInventarioCambiado?.();
  };


  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const esImagenValida = ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type);
    if (!esImagenValida) {
      toast.error("Solo se permiten imágenes JPG, PNG o WEBP.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar los 5 MB.");
      e.target.value = "";
      return;
    }
    e.target.value = "";
    void subir(file, "no-conformes").then((url) => {
      if (url) set({ evidencia: url });
    });
  };

  // ── FormBody rendered as plain function call (not JSX component) to preserve focus ──
  const renderFormBody = (readOnly: boolean, previewId?: string, edicion = false) => {
    // En modo consulta lee el registro (viewItem); en alta y edición usa el formulario.
    const f = readOnly && viewItem ? viewItem : form;
    // En edición, lo que identifica el registro (fecha, tipo, producto,
    // cantidad, motivo y relaciones) queda en solo lectura: cambiarlo movería
    // stock. Solo se editan descripción, solución y foto.
    const fijo = readOnly || edicion;
    // Selector de producto EXISTENTE (P17b): siempre es un <select> con el
    // catálogo, nunca texto libre, y envía el id real. En "Producto insumo"
    // entran insumos crudos y productos insumo. `stock` es null en los
    // productos elaborados (pizzas, lasañas): no tienen stock propio.
    const opcionesProducto = f.tipo === "Producto insumo"
      ? insumos.filter(i => i.estado === "activo").map(i => ({ id: i.id, nombre: i.nombre, unidad: i.unidadMedida, stock: i.stockActual as number | null }))
      : productos.filter(p => p.estado !== "Descontinuado").map(p => ({
          id: p.id,
          nombre: p.nombre,
          unidad: p.unidadVenta || "und",
          stock: p.tipo === "Producto terminado" ? p.stockDisponible : null,
        }));
    const idSeleccionado = (f.tipo === "Producto insumo" ? f.idInsumo : f.idProducto) ?? "";
    return (
      <div className="space-y-4 px-6 py-5">
        {previewId && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">N.º</label>
            <p className="text-sm font-semibold text-foreground py-2">{previewId}</p>
          </div>
        )}

        {/* Fila 1: Fecha de registro | Tipo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha de registro</label>
            {fijo
              ? <p className="text-sm font-semibold text-foreground py-2">{f.fechaRegistro}</p>
              : <input type="date" value={f.fechaRegistro}
                  max={new Date().toLocaleDateString("en-CA")}
                  onChange={e => set({ fechaRegistro: e.target.value })} className={iCls} />
            }
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo</label>
            {fijo
              ? <p className="text-sm font-semibold text-foreground py-2">{f.tipo}</p>
              : <div className="relative">
                  <select value={f.tipo} onChange={e => {
                    const t = e.target.value as Tipo;
                    set({ tipo: t, nombre: "", idProducto: undefined, idInsumo: undefined, unidadMedida: t === "Producto" ? "und" : "", ventaRef: "", ordenRef: "" });
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
        {!fijo && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`relative ${f.tipo === "Producto insumo" ? "sm:col-span-2" : ""}`}>
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
          {fijo
            ? <div>
                <p className="text-sm font-semibold text-foreground py-2">{f.nombre}</p>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {f.tipo === "Producto" ? "Producto del menú" : f.tipo === "Producto insumo" ? "Producto insumo" : "Pérdida en venta"}
                </span>
              </div>
            : <div className="relative">
                {/* SELECT de productos existentes (P17b): el valor es el id
                    real del catálogo, así que nunca se puede registrar un
                    producto que no exista. */}
                <select value={idSeleccionado} onChange={e => {
                  const sel = opcionesProducto.find(o => o.id === e.target.value);
                  const ids = f.tipo === "Producto insumo"
                    ? { idInsumo: sel?.id, idProducto: undefined }
                    : { idProducto: sel?.id, idInsumo: undefined };
                  if (sel) set({ ...ids, nombre: sel.nombre, unidadMedida: sel.unidad });
                  else set({ ...ids, nombre: "", unidadMedida: f.tipo === "Producto" ? "und" : "" });
                }} className={sCls}>
                  <option value="">Selecciona…</option>
                  {opcionesProducto.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.stock === null ? o.nombre : `${o.nombre} · ${o.stock} ${o.unidad} en stock`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 text-muted-foreground" />
              </div>
          }
          {/* Deja visible el movimiento de stock que implica el registro (P17b). */}
          {!fijo && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {f.tipo === "Producto"
                ? "Si es un producto de reventa, las unidades afectadas se descuentan de su stock. Los productos elaborados no tienen stock propio."
                : "Al registrar, la cantidad afectada se descuenta del stock del insumo."}
            </p>
          )}
        </div>

        {/* Fila 4: Cantidad afectada | Unidad de medida (automática, solo lectura) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad afectada</label>
            {fijo
              ? <p className="text-sm font-semibold text-foreground py-2">{f.cantidadAfectada} {f.unidadMedida}</p>
              : <input type="number" min={1}
                  // Nace en 1 (regla del alta); borra a vacío sin volver a 0
                  // y limpia ceros a la izquierda (punto B1).
                  value={f.cantidadAfectada === 0 ? "" : f.cantidadAfectada}
                  placeholder="0"
                  onChange={e => set({ cantidadAfectada: numeroDeInput(limpiarNumeroInput(e.target.value)) })} className={iCls} />
            }
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Unidad de medida</label>
            {fijo
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
              {fijo
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
                {/* Punto 3.2: 3 opciones → control segmentado; "Reembolso"
                    sigue bloqueado sin venta relacionada (motivo en tooltip). */}
                <SegmentadoButtons
                  valor={f.tipoSolucion ?? ""}
                  onChange={valor => set({ tipoSolucion: valor })}
                  opciones={TIPOS_SOLUCION.map(t => {
                    const bloqueado = t === "Reembolso al cliente" && !f.ventaRef;
                    return {
                      valor: t,
                      etiqueta: t,
                      deshabilitada: bloqueado,
                      titulo: bloqueado ? "Requiere una venta relacionada" : undefined,
                    };
                  })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Solución aplicada</label>
                <textarea rows={2} value={f.solucion ?? ""} onChange={e => set({ solucion: e.target.value })}
                  placeholder="Describe qué se hizo o se hará para resolver la no conformidad..." className={tCls} />
              </div>
            </div>
          </div>
        )}

        {fijo && (f.ventaRef || f.ordenRef) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <input type="file" accept="image/jpeg,image/png,image/webp" ref={fileRef} className="hidden" onChange={handleFile} disabled={subiendo} />
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
                    <button onClick={() => fileRef.current?.click()} disabled={subiendo}
                      className="w-full border-2 border-dashed border-border rounded-xl py-4 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-muted/40 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                      <Upload className="w-5 h-5" />
                      <span className="text-xs font-medium">{subiendo ? "Subiendo..." : "Subir imagen de evidencia"}</span>
                    </button>
                    <p className="text-[11px] text-muted-foreground mt-1.5 text-center">JPG, PNG o WEBP · máx 5 MB</p>
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
          <p className="text-xs text-red-600">Este registro se generó automáticamente al resolver una devolución con «Producto malo».</p>
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">Información de la venta</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Número de venta</label>
            <p className="text-sm font-semibold text-foreground font-mono">{item.ventaRef || "—"}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha</label>
            <p className="text-sm font-semibold text-foreground">{item.fechaRegistro}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Responsable</label>
            <p className="text-sm font-semibold text-foreground">{item.responsable || "—"}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad</label>
            <p className="text-sm font-semibold text-foreground">{item.cantidadAfectada} {item.unidadMedida}</p>
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
    <div className="px-4 sm:px-6 py-6">
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

      {/* Carga y error de la API (igual que Insumos y Orden de Producción):
          nunca se muestran datos de ejemplo. */}
      {cargando ? (
        <div className="bg-card border border-border rounded-2xl px-4 py-14 text-center text-muted-foreground mb-4">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
          <p className="text-sm">Cargando productos no conformes…</p>
        </div>
      ) : errorCarga ? (
        <div className="bg-card border border-border rounded-2xl px-4 py-14 text-center mb-4">
          <p className="text-sm font-semibold text-red-600">{errorCarga}</p>
          {onReintentar && (
            <button onClick={onReintentar}
              className="mt-3 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer">
              Reintentar
            </button>
          )}
        </div>
      ) : (
      <>
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
                const pendiente = item.estado === "Pendiente";
                const origen = item.ventaRef
                  ? `Venta #${item.ventaRef}`
                  : item.ordenRef
                  ? `OP ${item.ordenRef}`
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
                      <div className="flex items-center gap-1.5">
                        {/* Editar y Completar: solo Pendiente. Eliminar: solo
                            Pendientes registrados a mano (la merma de
                            producción y las devoluciones las crea el sistema). */}
                        <ActionIcons
                          onView={() => setViewItem(item)}
                          onEdit={canEdit ? () => abrirEditar(item) : undefined}
                          editDisabled={!pendiente}
                          editTitle={pendiente ? "Editar" : "Solo se puede editar en estado Pendiente"}
                          onDelete={canDelete && !item.generadoPorSistema ? () => setDeleteTarget(item) : undefined}
                          deleteDisabled={!pendiente}
                          deleteTitle={pendiente ? "Eliminar" : "Solo se puede eliminar en estado Pendiente"}
                        />
                        {canEdit && (
                          <button onClick={() => pendiente && abrirCompletar(item)}
                            disabled={!pendiente}
                            title={pendiente ? "Completar" : "Ya está completado"}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                            <CheckCircle2 className="w-4 h-4" />
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

      {/* Pagination (unificada) */}
      {filtered.length > 0 && (
        <Paginador pagina={page} totalPaginas={totalPages} onCambio={setPage} />
      )}
      </>
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
              <button onClick={() => void handleCreate()} disabled={guardando || subiendo}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {guardando ? "Registrando..." : "Registrar"}
              </button>
            </div>
            </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: EDIT (solo Pendiente) ── */}
      <AnimatePresence>
        {editItem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm overflow-y-auto p-4"
          >
            <div className="flex min-h-full items-center justify-center">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}
              className="bg-card rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl border border-border flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Editar — {editItem.id}</h3>
              <button onClick={() => setEditItem(null)}
                className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {renderFormBody(false, editItem.id, true)}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
              <button onClick={() => setEditItem(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                Cancelar
              </button>
              <button onClick={() => void handleEdit()} disabled={guardando || subiendo}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
            </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: COMPLETAR (Pendiente → Completado) ── */}
      <AnimatePresence>
        {completarItem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm overflow-y-auto p-4"
          >
            <div className="flex min-h-full items-center justify-center">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}
              className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
                Completar — {completarItem.id} · {completarItem.nombre}
              </h3>
              <button onClick={() => setCompletarItem(null)}
                className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo de solución</label>
                <SegmentadoButtons
                  valor={completarForm.tipoSolucion}
                  onChange={valor => setCompletarForm(p => ({ ...p, tipoSolucion: valor }))}
                  opciones={TIPOS_SOLUCION.map(t => {
                    const bloqueado = t === "Reembolso al cliente" && !completarItem.ventaRef;
                    return {
                      valor: t,
                      etiqueta: t,
                      deshabilitada: bloqueado,
                      titulo: bloqueado ? "Requiere una venta relacionada" : undefined,
                    };
                  })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Solución aplicada</label>
                <textarea rows={3} value={completarForm.solucion}
                  onChange={e => setCompletarForm(p => ({ ...p, solucion: e.target.value }))}
                  placeholder="Describe qué se hizo para resolver la no conformidad..." className={tCls} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Al completar se guarda la fecha de cierre de hoy y el registro ya no se puede editar ni eliminar.
              </p>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
              <button onClick={() => setCompletarItem(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                Cancelar
              </button>
              <button onClick={() => void handleCompletar()} disabled={guardando}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {guardando ? "Guardando..." : "Completar"}
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
