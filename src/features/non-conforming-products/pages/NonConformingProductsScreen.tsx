import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, X,
  Upload, ShoppingCart, ChevronDown, CheckCircle2, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import { ClipboardCheck, Download } from "lucide-react";
import { AvisoBanner } from "@/shared/components/panel/NoticeBanner";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { BuscadorGrande } from "@/shared/components/panel/LargeSearch";
import { CampoFormulario } from "@/shared/components/panel/FormField";
import { DatosDetalle } from "@/shared/components/panel/DetailData";
import { DialogoConfirmacion } from "@/shared/components/panel/ConfirmDialog";
import { EncabezadoPagina } from "@/shared/components/panel/PageHeader";
import { EstadoPill } from "@/shared/components/panel/StatusPill";
import { FiltrosChips } from "@/shared/components/panel/FilterChips";
import { OpcionesBotones } from "@/shared/components/buttons/OptionButtons";
import { PaginadorGrande } from "@/shared/components/panel/LargePaginator";
import { SeccionFormulario } from "@/shared/components/panel/FormSection";
import { TarjetaFila } from "@/shared/components/panel/RowCard";
import { VacioEstado } from "@/shared/components/panel/EmptyState";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginator";
import { ActionIcons } from "@/shared/components/buttons/ActionIcons";
import { SegmentadoButtons } from "@/shared/components/buttons/SegmentedButtons";
import * as XLSX from "xlsx";
import { ConfirmDeleteModal } from "@/shared/components/ConfirmDeleteModal";
import { BotonDescargarExcel } from "@/shared/components/buttons/DownloadExcelButton";
import type { Insumo } from "@/features/supplies/pages/SuppliesScreen";
import type { Producto } from "@/features/products/pages/ProductsScreen";
import type { OrdenProduccion } from "@/features/production-orders/pages/ProductionOrdersScreen";
import { useSubirArchivo } from "@/shared/hooks/useFileUpload";
import { limpiarNumeroInput, numeroDeInput } from "@/shared/utils/numberInput";
import {
  actualizarNoConformidad,
  completarNoConformidad,
  crearNoConformidad,
  eliminarNoConformidad,
  mensajeErrorNoConformes,
} from "@/features/non-conforming-products/services/nonConformingApi";
import { useNonConformingProducts } from "@/features/non-conforming-products/hooks/useNonConformingProducts";

const SERIF = "var(--font-titulo)";
export const PER_PAGE = 10;
const SOLUCION_TXT: Record<string, string> = {
  "Reposición del producto": "Se repuso",
  Reproceso: "Se rehizo",
  "Reembolso al cliente": "Se devolvió la plata",
};

export type Tipo = "Producto" | "Producto insumo" | "Venta";
export type EstadoNC = "Pendiente" | "Completado";

export interface NoConformidad {
  id: string;
  tipo: Tipo;
  nombre: string;
  categoria: string;
  fechaRegistro: string;
  cantidadAfectada: number;
  unidadMedida: string;
  tamano?: "Mediana" | "Grande";
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
  tamano: undefined,
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
    <span className={`text-base font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ESTADO_CONFIG[e]}`}>
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
    <span className={`text-base font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${cfg[tipo]}`}>
      {tipo}
    </span>
  );
}

const iCls = "w-full px-3 py-2.5 max-md:min-h-11 bg-muted dark:bg-input border border-transparent rounded-xl text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50";
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

  const { search, setSearch, filterEst, setFilterEst, filtroOrigen, setFiltroOrigen, page, setPage, allItems, filtered, paged } = useNonConformingProducts(noConformidades);
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
    const productoPizza = form.tipo === "Producto"
      ? productos.find((p) => p.id === idCatalogo)?.categoriaNombre?.toLowerCase().includes("pizza") ?? false
      : false;
    if (productoPizza && !form.tamano) { toast.error("Selecciona el tamaño de la pizza."); return; }
    if (productoPizza && !Number.isSafeInteger(form.cantidadAfectada)) {
      toast.error("La cantidad de porciones debe ser un entero mayor que cero.");
      return;
    }
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
  const renderFormBody = (_readOnly: boolean, _previewId?: string, edicion = false) => {
    const f = form;
    // En edición, lo que identifica el registro (fecha, tipo, producto,
    // cantidad, motivo y relaciones) queda en solo lectura: cambiarlo movería
    // stock. Solo se editan descripción, solución y foto.
    const fijo = edicion;
    // Selector de producto EXISTENTE (P17b): siempre es un <select> con el
    // catálogo, nunca texto libre, y envía el id real.
    const opcionesProducto: {
      id: string;
      nombre: string;
      unidad: string;
      stock: number | null;
      pizza: boolean;
      stockMediana?: number;
      stockGrande?: number;
    }[] = f.tipo === "Producto insumo"
      ? insumos.filter(i => i.estado === "activo").map(i => ({ id: i.id, nombre: i.nombre, unidad: i.unidadMedida, stock: i.stockActual as number | null, pizza: false }))
      : productos.filter(p => p.estado !== "Descontinuado").map(p => ({
          id: p.id,
          nombre: p.nombre,
          unidad: p.unidadVenta || "und",
          stock: p.tipo === "Producto terminado" ? p.stockDisponible : null,
          pizza: p.categoriaNombre?.toLowerCase().includes("pizza") ?? false,
          stockMediana: p.stockMediana ?? 0,
          stockGrande: p.stockGrande ?? 0,
        }));
    const idSeleccionado = (f.tipo === "Producto insumo" ? f.idInsumo : f.idProducto) ?? "";
    const productoSeleccionado = opcionesProducto.find(o => o.id === idSeleccionado);
    const esPizzaSeleccionada = f.tipo === "Producto" && productoSeleccionado?.pizza === true;

    const sugerencias = (lista: { id: string; label: string }[], mostrar: boolean, elegir: (id: string) => void, cerrar: () => void) =>
      mostrar && lista.length > 0 ? (
        <ul className="absolute z-30 top-full mt-1 w-full bg-card border-2 border-border rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {lista.map(s => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={() => { elegir(s.id); cerrar(); }}
                className="w-full text-left px-4 py-3 text-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <strong>{s.id}</strong>
                <span className="text-muted-foreground ml-2 text-base">{s.label.split("·").slice(1).join("·").trim()}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null;

    return (
      <div className="grid gap-5">
        <SeccionFormulario numero={1} titulo="¿Qué pasó?">
          <div className="grid gap-5">
            <div>
              <p className="pn-etiqueta">¿De dónde viene?</p>
              {fijo ? (
                <div className="pn-lectura">{ORIGEN_TXT[f.tipo]}</div>
              ) : (
                <OpcionesBotones
                  etiqueta="De dónde viene"
                  valor={f.tipo}
                  onChange={(v) => {
                    const t = v as Tipo;
                    set({ tipo: t, nombre: "", idProducto: undefined, idInsumo: undefined, unidadMedida: t === "Producto" ? "und" : "", ventaRef: "", ordenRef: "" });
                  }}
                  opciones={[
                    { valor: "Producto", etiqueta: "De la cocina" },
                    { valor: "Producto insumo", etiqueta: "De un insumo" },
                  ]}
                />
              )}
            </div>

            <div className="pn-grilla">
              <CampoFormulario etiqueta="¿Qué día pasó?">
                {(p) => fijo
                  ? <div className="pn-lectura">{fechaCorta(f.fechaRegistro)}</div>
                  : <input {...p} type="date" value={f.fechaRegistro} max={new Date().toLocaleDateString("en-CA")} onChange={e => set({ fechaRegistro: e.target.value })} />}
              </CampoFormulario>

              <CampoFormulario
                etiqueta="Producto"
                ayuda={fijo ? undefined : f.tipo === "Producto"
                  ? "En pizzas, escoge el tamaño y cuenta porciones: se descuentan de lo que hay."
                  : "Lo que se pierde se descuenta del insumo."}
              >
                {(p) => fijo
                  ? <div className="pn-lectura">{f.nombre}</div>
                  : (
                    <select
                      {...p}
                      value={idSeleccionado}
                      onChange={e => {
                        const sel = opcionesProducto.find(o => o.id === e.target.value);
                        const ids = f.tipo === "Producto insumo"
                          ? { idInsumo: sel?.id, idProducto: undefined }
                          : { idProducto: sel?.id, idInsumo: undefined };
                        if (sel) set({
                          ...ids,
                          nombre: sel.nombre,
                          unidadMedida: sel.pizza ? "porciones" : sel.unidad,
                          tamano: sel.pizza ? "Mediana" : undefined,
                        });
                        else set({ ...ids, nombre: "", unidadMedida: f.tipo === "Producto" ? "und" : "", tamano: undefined });
                      }}
                    >
                      <option value="">Escoge el producto…</option>
                      {opcionesProducto.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.pizza
                            ? `${o.nombre} · medianas ${o.stockMediana ?? 0} · grandes ${o.stockGrande ?? 0}`
                            : o.stock === null ? o.nombre : `${o.nombre} · hay ${o.stock} ${o.unidad}`}
                        </option>
                      ))}
                    </select>
                  )}
              </CampoFormulario>

              {esPizzaSeleccionada && (
                <div>
                  <p className="pn-etiqueta">Tamaño</p>
                  {fijo ? (
                    <div className="pn-lectura">{f.tamano ?? "—"}</div>
                  ) : (
                    <OpcionesBotones
                      etiqueta="Tamaño de la pizza"
                      valor={f.tamano ?? ""}
                      onChange={(v) => set({ tamano: v === "Mediana" || v === "Grande" ? v : undefined, unidadMedida: "porciones" })}
                      opciones={[{ valor: "Mediana", etiqueta: "Mediana" }, { valor: "Grande", etiqueta: "Grande" }]}
                    />
                  )}
                </div>
              )}

              <CampoFormulario
                etiqueta={esPizzaSeleccionada ? "¿Cuántas porciones?" : `¿Cuánto se perdió?${f.unidadMedida ? ` (${f.unidadMedida})` : ""}`}
                ayuda={fijo ? undefined : "Se descuentan de lo que hay"}
              >
                {(p) => fijo
                  ? <div className="pn-lectura">{f.cantidadAfectada} {f.unidadMedida}</div>
                  : (
                    <input
                      {...p}
                      type="number"
                      min={1}
                      value={f.cantidadAfectada === 0 ? "" : f.cantidadAfectada}
                      placeholder="0"
                      onChange={e => set({ cantidadAfectada: numeroDeInput(limpiarNumeroInput(e.target.value)) })}
                    />
                  )}
              </CampoFormulario>
            </div>

            <CampoFormulario etiqueta="Motivo">
              {(p) => fijo
                ? <div className="pn-lectura">{f.tipoNoConformidad}</div>
                : <input {...p} value={f.tipoNoConformidad} onChange={e => set({ tipoNoConformidad: e.target.value })} placeholder="Ej: Masa con sabor ácido" />}
            </CampoFormulario>

            <CampoFormulario etiqueta="Cuéntalo con tus palabras" opcional>
              {(p) => (
                <textarea
                  {...p}
                  rows={3}
                  value={f.descripcionProblema}
                  onChange={e => set({ descripcionProblema: e.target.value })}
                  placeholder="Qué pasó, qué se vio y a qué afectó…"
                />
              )}
            </CampoFormulario>

            {!fijo && (
              <div className="pn-grilla">
                <div className="relative pn-campo">
                  <label className="pn-etiqueta">Orden de cocina relacionada <span style={{ fontWeight: 400 }}>(opcional)</span></label>
                  <input
                    value={f.ordenRef || ""}
                    onChange={e => { set({ ordenRef: e.target.value }); setShowOrdenSugg(true); }}
                    onFocus={() => setShowOrdenSugg(true)}
                    onBlur={() => setTimeout(() => setShowOrdenSugg(false), 150)}
                    placeholder="Número de la orden o producto"
                    autoComplete="off"
                  />
                  {sugerencias(ordenSuggestions, showOrdenSugg, (id) => set({ ordenRef: id }), () => setShowOrdenSugg(false))}
                </div>
                {f.tipo === "Producto" && (
                  <div className="relative pn-campo">
                    <label className="pn-etiqueta">Pedido relacionado <span style={{ fontWeight: 400 }}>(opcional)</span></label>
                    <input
                      value={f.ventaRef || ""}
                      onChange={e => { set({ ventaRef: e.target.value }); setShowVentaSugg(true); }}
                      onFocus={() => setShowVentaSugg(true)}
                      onBlur={() => setTimeout(() => setShowVentaSugg(false), 150)}
                      placeholder="Número del pedido o cliente"
                      autoComplete="off"
                    />
                    {sugerencias(ventaSuggestions, showVentaSugg, (id) => set({ ventaRef: id }), () => setShowVentaSugg(false))}
                  </div>
                )}
              </div>
            )}
          </div>
        </SeccionFormulario>

        {!fijo && (
          <SeccionFormulario titulo="Cómo se solucionó" ayuda="Si todavía no lo sabes, déjalo vacío: lo completas después.">
            <div className="grid gap-4">
              <OpcionesBotones
                etiqueta="Cómo se solucionó"
                valor={f.tipoSolucion ?? ""}
                onChange={(valor) => set({ tipoSolucion: valor })}
                opciones={TIPOS_SOLUCION.map(t => ({
                  valor: t,
                  etiqueta: SOLUCION_TXT[t] ?? t,
                  deshabilitada: t === "Reembolso al cliente" && !f.ventaRef,
                  titulo: t === "Reembolso al cliente" && !f.ventaRef ? "Solo si el reporte viene de un pedido" : undefined,
                }))}
              />
              <CampoFormulario etiqueta="¿Qué se hizo?" opcional>
                {(p) => <textarea {...p} rows={2} value={f.solucion ?? ""} onChange={e => set({ solucion: e.target.value })} placeholder="Qué se hizo o se hará para resolverlo" />}
              </CampoFormulario>
            </div>
          </SeccionFormulario>
        )}

        <SeccionFormulario numero={2} titulo="Foto">
          <input type="file" accept="image/jpeg,image/png,image/webp" ref={fileRef} className="hidden" onChange={handleFile} disabled={subiendo} />
          {f.evidencia ? (
            <div className="grid gap-3 justify-items-start">
              <img src={f.evidencia} alt="Foto del reporte" style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 16, border: "2px solid var(--borde-suave)" }} />
              <BotonAccion variante="peligro" onClick={() => set({ evidencia: undefined })}>Quitar la foto</BotonAccion>
            </div>
          ) : (
            <div className="grid gap-2 justify-items-start">
              <BotonAccion icono={Upload} disabled={subiendo} onClick={() => fileRef.current?.click()}>
                {subiendo ? "Subiendo…" : "Subir una foto (opcional)"}
              </BotonAccion>
              <p className="pn-campo__ayuda">JPG, PNG o WEBP · máximo 5 MB</p>
            </div>
          )}
        </SeccionFormulario>
      </div>
    );
  };

  // ── VentaDetail also rendered as plain function ──
  const renderVentaDetail = (item: NoConformidad) => (
    <div className="space-y-4 px-5 py-5">
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
        <ShoppingCart className="w-5 h-5 text-red-600 shrink-0" />
        <div>
          <p className="text-base font-bold text-red-800">Pérdida originada en Ventas</p>
          <p className="text-base text-red-600">Este registro se generó automáticamente al resolver una devolución con «Producto malo».</p>
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-base font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">Información de la venta</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-base font-semibold text-muted-foreground mb-1">Número de venta</label>
            <p className="text-base font-semibold text-foreground font-mono">{item.ventaRef || "—"}</p>
          </div>
          <div>
            <label className="block text-base font-semibold text-muted-foreground mb-1">Fecha</label>
            <p className="text-base font-semibold text-foreground">{item.fechaRegistro}</p>
          </div>
          <div>
            <label className="block text-base font-semibold text-muted-foreground mb-1">Responsable</label>
            <p className="text-base font-semibold text-foreground">{item.responsable || "—"}</p>
          </div>
          <div>
            <label className="block text-base font-semibold text-muted-foreground mb-1">Cantidad</label>
            <p className="text-base font-semibold text-foreground">
              {item.cantidadAfectada} {item.tamano ? `porc. · ${item.tamano}` : item.unidadMedida}
            </p>
          </div>
        </div>
        <div>
          <label className="block text-base font-semibold text-muted-foreground mb-1">Productos</label>
          <p className="text-base font-semibold text-foreground">{item.nombre}</p>
        </div>
        <div>
          <label className="block text-base font-semibold text-muted-foreground mb-1">Motivo registrado</label>
          <span className="inline-block text-base font-semibold px-3 py-1 bg-red-100 text-red-700 rounded-full">{item.tipoNoConformidad}</span>
        </div>
        <div>
          <label className="block text-base font-semibold text-muted-foreground mb-1">Descripción</label>
          <p className="text-base text-foreground leading-relaxed">{item.descripcionProblema}</p>
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
          <p className="text-base font-bold uppercase tracking-wide text-emerald-800">Solución de la no conformidad</p>
        </div>
        <div className="p-3 space-y-3">
          <div>
            <label className="block text-base font-semibold text-muted-foreground mb-1">Tipo de solución</label>
            <p className="text-base font-semibold text-foreground py-1">{viewItem.tipoSolucion || "—"}</p>
          </div>
          <div>
            <label className="block text-base font-semibold text-muted-foreground mb-1">Solución aplicada</label>
            <p className="text-base text-foreground leading-relaxed py-1 whitespace-pre-wrap">{viewItem.solucion || "—"}</p>
          </div>
          {viewItem.fechaCierre && (
            <div>
              <label className="block text-base font-semibold text-muted-foreground mb-1">Fecha de cierre</label>
              <p className="text-base font-semibold text-foreground py-1">{viewItem.fechaCierre}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Piezas de una fila de producto no conforme. Las usan la tabla (desde 768 px) y las
  // tarjetas (menos de 768 px) para mostrar exactamente los mismos botones y datos.
  const origenDe = (item: NoConformidad) =>
    item.ventaRef ? `Venta #${item.ventaRef}` : item.ordenRef ? `OP ${item.ordenRef}` : null;
  const productoCpn = (item: NoConformidad) => (<><p className="text-base font-medium text-foreground">{item.nombre}</p>
                      <p className="text-base text-muted-foreground">{item.categoria}</p></>);
  const cantidadCpn = (item: NoConformidad) => (<>{item.cantidadAfectada} <span className="text-base font-normal text-muted-foreground">
                        {item.tamano ? `porc. · ${item.tamano}` : item.unidadMedida}
                      </span></>);
  const motivoCpn = (item: NoConformidad) => (<><p className="font-semibold">{item.tipoNoConformidad}</p>
                      <p className="text-muted-foreground truncate text-base mt-0.5">{item.descripcionProblema}</p></>);
  const origenCpn = (item: NoConformidad) => {
    const origen = origenDe(item);
    return (<>{origen
                        ? <span className="text-base font-mono font-semibold px-2 py-0.5 bg-muted rounded-lg text-muted-foreground whitespace-nowrap">{origen}</span>
                        : <span className="text-base text-muted-foreground/40 italic">—</span>
                      }</>);
  };
  const accionesCpn = (item: NoConformidad) => {
    const pendiente = item.estado === "Pendiente";
    return (<div className="flex items-center gap-1.5">
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
                        {canEdit && pendiente && (
                          <button onClick={() => abrirCompletar(item)}
                            title="Completar registro pendiente"
                            className="p-1.5 max-md:p-3.5 rounded-lg text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>);
  };

  // ── Lista con tarjetas ──
  const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  /** "2026-11-21" → "21 nov" */
  const fechaCorta = (iso?: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
    return m ? `${Number(m[3])} ${MESES_CORTOS[Number(m[2]) - 1]}` : iso || "—";
  };
  const ORIGEN_TXT: Record<Tipo, string> = { Producto: "De la cocina", Venta: "De un pedido", "Producto insumo": "De un insumo" };
  const origenPill = (item: NoConformidad) =>
    item.ventaRef ? `Pedido #${item.ventaRef}` : item.ordenRef ? `Cocina · ${item.ordenRef}` : item.tipo === "Producto insumo" ? "Insumo" : ORIGEN_TXT[item.tipo];
  const conteoTipo = (t: Tipo) => allItems.filter((i) => i.tipo === t).length;
  const pendientes = allItems.filter((i) => i.estado === "Pendiente").length;
  const chip = filterEst === "Pendiente" ? "pendiente" : filtroOrigen || "todos";
  const cambiarChip = (v: string) => {
    setPage(1);
    setFilterEst(v === "pendiente" ? "Pendiente" : "");
    setFiltroOrigen(v === "Producto" || v === "Venta" || v === "Producto insumo" ? (v as Tipo) : "");
  };
  const textoCantidad = (item: NoConformidad) =>
    `${item.cantidadAfectada} ${item.tamano ? `${item.cantidadAfectada === 1 ? "porción" : "porciones"} · ${item.tamano}` : item.unidadMedida}`;

  return (
    <div className="pn-contenido">
      <EncabezadoPagina
        titulo="Productos no conformes"
        descripcion="Lo que salió mal: pizzas que se dañaron en la cocina, insumos vencidos o pedidos que el cliente reclamó"
        acciones={
          <>
            {canExportExcel && <BotonAccion icono={Download} onClick={() => downloadXLSX(allItems)}>Descargar en Excel</BotonAccion>}
            {_canCreate && (
              <BotonAccion variante="principal" icono={Plus} onClick={() => { setForm(emptyForm()); setShowCreate(true); }}>
                Reportar algo que salió mal
              </BotonAccion>
            )}
          </>
        }
      />

      <div className="grid gap-4 mb-6">
        <BuscadorGrande
          etiqueta="Buscar un reporte"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Escribe el número, el producto o el motivo"
        />
        <FiltrosChips
          valor={chip}
          onChange={cambiarChip}
          opciones={[
            { valor: "todos", etiqueta: "Todos", contador: allItems.length },
            { valor: "pendiente", etiqueta: "Falta completar", contador: pendientes },
            { valor: "Producto", etiqueta: "De la cocina", contador: conteoTipo("Producto") },
            { valor: "Venta", etiqueta: "De pedidos", contador: conteoTipo("Venta") },
            { valor: "Producto insumo", etiqueta: "De insumos", contador: conteoTipo("Producto insumo") },
          ]}
        />
      </div>

      {cargando ? (
        <p role="status" className="pn-nota">Cargando los reportes…</p>
      ) : errorCarga ? (
        <AvisoBanner
          titulo="No pudimos cargar los reportes"
          boton={onReintentar ? <BotonAccion onClick={onReintentar}>Intentar de nuevo</BotonAccion> : undefined}
        >
          {errorCarga}
        </AvisoBanner>
      ) : paged.length === 0 ? (
        <VacioEstado icono={ClipboardCheck} titulo="No encontramos ningún reporte">
          Revisa cómo lo escribiste, cambia el filtro o reporta algo nuevo.
        </VacioEstado>
      ) : (
        <div className="pn-lista">
          {paged.map((item) => {
            const pendiente = item.estado === "Pendiente";
            return (
              <TarjetaFila
                key={item.id}
                resaltada={pendiente ? "ambar" : undefined}
                pre={
                  <span className="inline-flex flex-wrap items-center gap-2">
                    N.° {item.id} · {fechaCorta(item.fechaRegistro)}
                    <EstadoPill tono="gris">{origenPill(item)}</EstadoPill>
                  </span>
                }
                nombre={item.tamano ? `${item.nombre} · ${item.tamano}` : item.nombre}
                detalle={
                  <>
                    Motivo: <strong>{item.tipoNoConformidad}</strong>
                    {item.descripcionProblema ? ` · ${item.descripcionProblema}` : ""}
                  </>
                }
                datos={[{ etiqueta: "Cantidad", valor: textoCantidad(item) }]}
                estado={
                  <div className="grid gap-1 justify-items-start">
                    <EstadoPill tono={pendiente ? "ambar" : "verde"}>{pendiente ? "Falta completar" : "Cerrado"}</EstadoPill>
                    <span style={{ fontSize: 16, color: "var(--gris-texto)" }}>
                      {pendiente ? "Escribe qué se hizo" : item.fechaCierre ? `Cerrado el ${fechaCorta(item.fechaCierre)}` : "Reporte cerrado"}
                    </span>
                  </div>
                }
                acciones={
                  <>
                    {canEdit && pendiente && <BotonAccion variante="principal" onClick={() => abrirCompletar(item)}>Completar</BotonAccion>}
                    <BotonAccion variante="normal" onClick={() => setViewItem(item)}>Ver detalle</BotonAccion>
                    {canEdit && pendiente && <BotonAccion variante="normal" onClick={() => abrirEditar(item)}>Cambiar datos</BotonAccion>}
                    {canDelete && pendiente && !item.generadoPorSistema && (
                      <BotonAccion variante="peligro" onClick={() => setDeleteTarget(item)}>Borrar</BotonAccion>
                    )}
                  </>
                }
              />
            );
          })}
        </div>
      )}

      <PaginadorGrande pagina={page} total={filtered.length} porPagina={PER_PAGE} onCambiar={setPage} />
      <p className="pn-nota">
        Lo que se daña en la cocina queda cerrado de una vez. Lo que viene de una devolución queda en «Falta completar» hasta que escribas qué se hizo.
      </p>


      {/* ── Ver el reporte ── */}
      {viewItem && (
        <Dialog.Root open onOpenChange={(a) => { if (!a) setViewItem(null); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="pn-dialogo-fondo" />
            <Dialog.Content className="pn-modal pn-modal--medio" aria-describedby={undefined} style={{ width: "min(96vw, 900px)" }}>
              <div className="pn-modal__cab">
                <Dialog.Title className="pn-modal__titulo">Reporte N.° {viewItem.id} · {viewItem.nombre}</Dialog.Title>
                <EstadoPill tono={viewItem.estado === "Pendiente" ? "ambar" : "verde"}>{viewItem.estado === "Pendiente" ? "Falta completar" : "Cerrado"}</EstadoPill>
              </div>
              <p className="pn-seccion__ayuda" style={{ marginTop: -8 }}>
                {ORIGEN_TXT[viewItem.tipo]} · {origenPill(viewItem)} · {fechaCorta(viewItem.fechaRegistro)}
              </p>
              <div className="grid gap-4">
                <SeccionFormulario titulo="Qué pasó">
                  <DatosDetalle datos={[
                    { etiqueta: "De dónde viene", valor: ORIGEN_TXT[viewItem.tipo] },
                    { etiqueta: "Producto", valor: viewItem.nombre },
                    { etiqueta: "Cantidad", valor: textoCantidad(viewItem) },
                    { etiqueta: "Motivo", valor: viewItem.tipoNoConformidad },
                    { etiqueta: "Registrado", valor: fechaCorta(viewItem.fechaRegistro) },
                    { etiqueta: "Pedido u orden", valor: viewItem.ventaRef ? `Pedido #${viewItem.ventaRef}` : viewItem.ordenRef ?? "—" },
                    { etiqueta: "Responsable", valor: viewItem.responsable || "—" },
                  ]} />
                  <div className="pn-dialogo__caja" style={{ marginTop: 16, marginBottom: 0 }}>
                    <strong>Lo que se contó:</strong>
                    {viewItem.descripcionProblema || "Sin descripción"}
                  </div>
                </SeccionFormulario>
                <SeccionFormulario titulo="Cómo se solucionó">
                  {viewItem.estado === "Pendiente" ? (
                    <p className="pn-seccion__ayuda" style={{ margin: 0 }}>Pendiente: todavía falta escribir qué se hizo.</p>
                  ) : (
                    <DatosDetalle datos={[
                      { etiqueta: "Solución", valor: SOLUCION_TXT[viewItem.tipoSolucion ?? ""] ?? (viewItem.tipoSolucion || "—") },
                      { etiqueta: "Qué se hizo", valor: viewItem.solucion || "—" },
                      { etiqueta: "Cerrado", valor: viewItem.fechaCierre ? fechaCorta(viewItem.fechaCierre) : "—" },
                    ]} />
                  )}
                </SeccionFormulario>
                <SeccionFormulario titulo="Foto">
                  {viewItem.evidencia
                    ? <img src={viewItem.evidencia} alt="Foto del reporte" style={{ maxWidth: "100%", maxHeight: 420, borderRadius: 16, border: "2px solid var(--borde-suave)" }} />
                    : <p className="pn-seccion__ayuda" style={{ margin: 0 }}>Sin foto</p>}
                </SeccionFormulario>
              </div>
              <div className="pn-dialogo__botones" style={{ marginTop: 18, justifyContent: "flex-start" }}>
                {canEdit && viewItem.estado === "Pendiente" && (
                  <BotonAccion variante="principal" onClick={() => { const it = viewItem; setViewItem(null); abrirCompletar(it); }}>Completar</BotonAccion>
                )}
                {canEdit && viewItem.estado === "Pendiente" && (
                  <BotonAccion variante="normal" onClick={() => { const it = viewItem; setViewItem(null); abrirEditar(it); }}>Cambiar datos</BotonAccion>
                )}
                {canDelete && viewItem.estado === "Pendiente" && !viewItem.generadoPorSistema && (
                  <BotonAccion variante="peligro" onClick={() => { const it = viewItem; setViewItem(null); setDeleteTarget(it); }}>Borrar</BotonAccion>
                )}
                <BotonAccion variante="oscuro" onClick={() => setViewItem(null)}>Cerrar</BotonAccion>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {/* ── Reportar algo que salió mal / cambiar un reporte ── */}
      {(showCreate || editItem) && (
        <Dialog.Root open onOpenChange={(a) => { if (!a) { setShowCreate(false); setEditItem(null); } }}>
          <Dialog.Portal>
            <Dialog.Overlay className="pn-dialogo-fondo" />
            <Dialog.Content className="pn-modal" aria-describedby={undefined} onInteractOutside={(e) => e.preventDefault()}>
              <div className="pn-modal__cab">
                <Dialog.Title className="pn-modal__titulo">{editItem ? `Cambiar el reporte N.° ${editItem.id}` : "Reportar algo que salió mal"}</Dialog.Title>
              </div>
              <div style={{ maxWidth: 900 }}>
                {renderFormBody(false, editItem?.id, !!editItem)}
                <div className="pn-dialogo__botones" style={{ marginTop: 18, justifyContent: "flex-start" }}>
                  <BotonAccion variante="normal" onClick={() => { setShowCreate(false); setEditItem(null); }}>Cancelar</BotonAccion>
                  <BotonAccion variante="principal" disabled={guardando || subiendo} onClick={() => void (editItem ? handleEdit() : handleCreate())}>
                    {guardando ? "Guardando…" : editItem ? "Guardar cambios" : "Guardar el reporte"}
                  </BotonAccion>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {/* ── Completar el reporte ── */}
      {completarItem && (
        <Dialog.Root open onOpenChange={(a) => { if (!a) setCompletarItem(null); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="pn-dialogo-fondo" />
            <Dialog.Content className="pn-modal pn-modal--medio" aria-describedby={undefined} style={{ width: "min(96vw, 720px)" }}>
              <div className="pn-modal__cab">
                <Dialog.Title className="pn-modal__titulo">Completar el reporte N.° {completarItem.id} · {completarItem.nombre}</Dialog.Title>
              </div>
              <div className="grid gap-5">
                <SeccionFormulario titulo="¿Cómo se solucionó?">
                  <OpcionesBotones
                    etiqueta="Cómo se solucionó"
                    valor={completarForm.tipoSolucion}
                    onChange={(valor) => setCompletarForm((p) => ({ ...p, tipoSolucion: valor }))}
                    opciones={TIPOS_SOLUCION.map((t) => ({
                      valor: t,
                      etiqueta: SOLUCION_TXT[t] ?? t,
                      deshabilitada: t === "Reembolso al cliente" && !completarItem.ventaRef,
                      titulo: t === "Reembolso al cliente" && !completarItem.ventaRef ? "Solo si el reporte viene de un pedido" : undefined,
                    }))}
                  />
                  <div style={{ marginTop: 18 }}>
                    <CampoFormulario etiqueta="¿Qué se hizo?" ayuda="Cuéntalo con tus palabras. Al guardar, el reporte queda cerrado y ya no se puede cambiar.">
                      {(p) => (
                        <textarea
                          {...p}
                          rows={4}
                          value={completarForm.solucion}
                          placeholder="Ej: Se hizo otra pizza y se entregó al cliente"
                          onChange={(e) => setCompletarForm((prev) => ({ ...prev, solucion: e.target.value }))}
                        />
                      )}
                    </CampoFormulario>
                  </div>
                </SeccionFormulario>
                <div className="pn-dialogo__botones" style={{ justifyContent: "flex-start" }}>
                  <BotonAccion variante="normal" onClick={() => setCompletarItem(null)}>Todavía no</BotonAccion>
                  <BotonAccion variante="principal" disabled={guardando} onClick={() => void handleCompletar()}>
                    {guardando ? "Guardando…" : "Guardar y cerrar"}
                  </BotonAccion>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {/* ── Borrar el reporte ── */}
      <DialogoConfirmacion
        abierto={!!deleteTarget}
        onCambiarAbierto={(a) => { if (!a) setDeleteTarget(null); }}
        titulo={`¿Borrar el reporte N.° ${deleteTarget?.id ?? ""}?`}
        queVaAPasar={["Solo se pueden borrar reportes que faltan completar", "Lo que se había descontado de la bodega vuelve a sumarse", "Se borra para siempre"]}
        textoAccion="Sí, borrar el reporte"
        onConfirmar={() => void handleDelete()}
      />
    </div>
  );
}
