import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Check, Package, AlertTriangle, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { UnidadSelect } from "@/features/compras/components/UnidadSelect";
import { BotonDescargarExcel } from "@/shared/components/BotonDescargarExcel";
import { exportarExcelEstilizado } from "@/shared/utils/exportExcelEstilizado";
import {
  EstadoSelect,
  ESTADO_ACTIVO_COLOR,
  ESTADO_INACTIVO_COLOR,
} from "@/shared/components/EstadoSelect";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginador";
import { ActionIcons } from "@/shared/components/ActionIcons";
import { FichaTecnicaDetalle, FichaTecnicaEditor } from "@/shared/components/FichaTecnicaEditor";
import {
  copiarFicha,
  emptyFichaVersion,
  fichaDesdeLegacyInsumo,
  fichaTieneCambios,
  numeroNuevoFicha,
  siguienteNumeroFicha,
  type FichaVersion,
  type FichasPorProducto,
  type PorcionesTamano,
} from "@/shared/utils/fichas";
import { CONFIG_CATEGORIA } from "@/shared/utils/configCategoria";

const SERIF = "var(--font-titulo)";
const PER_PAGE = 5;

// ─────────────────────────── Categorías ───────────────────────────
export interface CategoriaInsumo {
  id: string;
  nombre: string;
}

export const CATEGORIAS_INSUMO: CategoriaInsumo[] = [
  { id: "CINS-001", nombre: "Lácteos" },
  { id: "CINS-002", nombre: "Carnes y Embutidos" },
  { id: "CINS-003", nombre: "Vegetales y Hierbas" },
  { id: "CINS-004", nombre: "Harinas y Masas" },
  { id: "CINS-005", nombre: "Salsas y Condimentos" },
];

export const categoriaNombre = (id: string): string =>
  CATEGORIAS_INSUMO.find(c => c.id === id)?.nombre ?? "";

// ─────────────────────────── Tipos ───────────────────────────
export interface Insumo {
  id: string;
  nombre: string;
  unidadMedida: string;
  costoUnitario: number;
  precioUnitario: number | null;
  iva: number | null;
  tipo: string;
  stockActual: number;
  stockMinimo: number;
  categoriaId: string;
  estado: "activo" | "inactivo";
  /** ── Datos legacy ────────────────────────────────────────────────
      La ficha técnica única (fichas.ts) es la fuente de verdad desde la
      unificación. Estos tres campos ya no se editan ni se sincronizan: quedan
      como el respaldo de los registros creados antes de la unificación y solo
      los lee el fallback de Orden de Producción para líneas muy viejas. */
  composicion?: ProductoInsumoInsumo[];
  descripcion?: string;
  /** Tiempo de preparación legacy, en minutos. Solo aplica a
      `tipo === "ProductoInsumo"`; las órdenes nuevas lo toman del snapshot de
      la ficha. */
  tiempoPreparacion?: number;
}

export interface ProductoInsumoInsumo {
  id: string;
  categoriaId: string;
  nombre: string;
  cantidad: number;
  unidadMedida: string;
}

export interface ProductoInsumo {
  id: string;
  nombre: string;
  descripcion: string;
  insumos: ProductoInsumoInsumo[];
  tipo: "ProductoInsumo";
}

export const INITIAL_INSUMOS: Insumo[] = [
  { id: "INS-001", nombre: "Queso Mozzarella", unidadMedida: "kg", costoUnitario: 18000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 25, stockMinimo: 10, categoriaId: "CINS-001", estado: "activo" },
  { id: "INS-003", nombre: "Pepperoni", unidadMedida: "kg", costoUnitario: 25000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 8, stockMinimo: 5, categoriaId: "CINS-002", estado: "activo" },
  { id: "INS-005", nombre: "Champiñones", unidadMedida: "kg", costoUnitario: 12000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 4, stockMinimo: 5, categoriaId: "CINS-003", estado: "activo" },
  { id: "INS-006", nombre: "Harina", unidadMedida: "kg", costoUnitario: 4500, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 40, stockMinimo: 20, categoriaId: "CINS-004", estado: "activo" },
  { id: "INS-007", nombre: "Agua", unidadMedida: "lt", costoUnitario: 400, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 120, stockMinimo: 40, categoriaId: "CINS-004", estado: "activo" },
  { id: "INS-008", nombre: "Aceite", unidadMedida: "lt", costoUnitario: 9000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 12, stockMinimo: 4, categoriaId: "CINS-004", estado: "activo" },
  { id: "INS-009", nombre: "Levadura", unidadMedida: "kg", costoUnitario: 12000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 2, stockMinimo: 1, categoriaId: "CINS-004", estado: "activo" },
  { id: "INS-010", nombre: "Aguacate", unidadMedida: "kg", costoUnitario: 9500, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 18, stockMinimo: 8, categoriaId: "CINS-003", estado: "activo" },
  { id: "INS-011", nombre: "Cebolla", unidadMedida: "kg", costoUnitario: 3500, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 6, stockMinimo: 3, categoriaId: "CINS-003", estado: "activo" },
  { id: "INS-012", nombre: "Limón", unidadMedida: "lt", costoUnitario: 5000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 4, stockMinimo: 2, categoriaId: "CINS-003", estado: "activo" },
  // Productos Insumo: lo que Gloria prepara en lote, refrigera y consume la
  // cocina. Cada uno lleva su receta (`composicion`, cantidades POR 1 unidad),
  // su descripción de preparación y su tiempo. Son los únicos que una orden
  // "Preparación en lote" puede producir.
  {
    id: "PIN-001", nombre: "Guacamole", unidadMedida: "lt", costoUnitario: 0,
    precioUnitario: null, iva: null, tipo: "ProductoInsumo",
    stockActual: 8, stockMinimo: 5, categoriaId: "-", estado: "activo",
    composicion: [
      { id: "INS-010", categoriaId: "CINS-003", nombre: "Aguacate", cantidad: 2, unidadMedida: "kg" },
      { id: "INS-011", categoriaId: "CINS-003", nombre: "Cebolla", cantidad: 0.2, unidadMedida: "kg" },
      { id: "INS-012", categoriaId: "CINS-003", nombre: "Limón", cantidad: 0.1, unidadMedida: "lt" },
    ],
    descripcion: "1. Triturar aguacate con limón para que no se oxide.\n2. Agregar cebolla picada fina.\n3. Ajustar sal y cilantro al gusto.\n4. Guardar en recipiente cerrado, en refrigeración.",
    tiempoPreparacion: 25,
  },
  {
    id: "PIN-002", nombre: "Salsa de Tomate", unidadMedida: "lt", costoUnitario: 0,
    precioUnitario: null, iva: null, tipo: "ProductoInsumo",
    stockActual: 30, stockMinimo: 15, categoriaId: "-", estado: "activo",
    composicion: [
      { id: "INS-005", categoriaId: "CINS-003", nombre: "Champiñones", cantidad: 1, unidadMedida: "kg" },
    ],
    descripcion: "Cocinar a fuego lento y triturar",
    tiempoPreparacion: 45,
  },
  {
    id: "PIN-003", nombre: "Masa Pre-elaborada", unidadMedida: "und", costoUnitario: 0,
    precioUnitario: null, iva: null, tipo: "ProductoInsumo",
    stockActual: 4, stockMinimo: 20, categoriaId: "-", estado: "activo",
    composicion: [
      { id: "INS-006", categoriaId: "CINS-004", nombre: "Harina", cantidad: 0.5, unidadMedida: "kg" },
      { id: "INS-007", categoriaId: "CINS-004", nombre: "Agua", cantidad: 0.3, unidadMedida: "lt" },
      { id: "INS-008", categoriaId: "CINS-004", nombre: "Aceite", cantidad: 0.05, unidadMedida: "lt" },
      { id: "INS-009", categoriaId: "CINS-004", nombre: "Levadura", cantidad: 0.01, unidadMedida: "kg" },
    ],
    descripcion: "1. Mezclar harina, agua, aceite y levadura hasta que quede homogénea.\n2. Amasar 10 minutos.\n3. Reposar 30 minutos tapada en refrigeración.\n4. Formar discos de 250 g de yogur.\n5. Refrigerar. Rinde 1 unidad por preparación.",
    tiempoPreparacion: 60,
  },
];

const UNIDADES = ["kg", "lt", "und"];

/** ¿Este Producto Insumo tiene ficha vigente? Las fichas viven en App
    (prop de este componente), no en el módulo. */
const fichaVigente = (fichas: FichasPorProducto, insumo: Insumo): boolean =>
  (fichas[insumo.id] ?? []).some((v) => !v.fechaFin);

// ─────────────────────────── Helpers ───────────────────────────
const fmtCOP = (n: number): string =>
  `$${n.toLocaleString("es-CO")}`;

const esStockBajo = (insumo: Insumo): boolean =>
  insumo.stockActual < insumo.stockMinimo;

const formatearId = (id: string): string => {
  const match = id.match(/(\d+)$/);
  return match ? match[1] : id;
};

// ─── Producto Insumo: categoría y tamaños de la ficha ───────────────────────
/** Categorías admitidas para un Producto Insumo: solo las que llevan ficha
    (Pizzas y Lasañas). Bebidas (reventa) queda fuera de este módulo. */
const CATEGORIAS_PI = [
  { id: "CAT-001", nombre: "Pizzas" },
  { id: "CAT-002", nombre: "Lasañas" },
] as const;

const categoriaPIValida = (id: string): boolean =>
  CATEGORIAS_PI.some(c => c.id === id);

/** Filas "Porciones por tamaño" que define la categoría del Producto Insumo
    (CONFIG_CATEGORIA): Mediana/Grande para Pizzas, Normal para Lasañas. */
const filasDeCategoriaPI = (categoriaId: string): PorcionesTamano[] =>
  CONFIG_CATEGORIA[categoriaId]?.tamanos?.map(f => ({ ...f })) ?? [];

/** Ajusta el borrador de la ficha a la categoría elegida: las filas quedan
    EXACTAMENTE con las etiquetas de CONFIG_CATEGORIA (conservando las
    porciones de las que sigan existiendo y completando las que falten con el
    valor precargado); `porciones` sigue siendo la PRIMERA fila. */
const ajustarFilasPI = (v: FichaVersion, categoriaId: string): FichaVersion => {
  const actuales = v.porcionesPorTamano ?? [];
  const filas = filasDeCategoriaPI(categoriaId).map(
    d => actuales.find(a => a.tamano === d.tamano) ?? { ...d },
  );
  if (filas.length === 0) return v;
  return { ...v, porcionesPorTamano: filas, porciones: filas[0].porciones };
};

/**
 * Diálogo de confirmación del módulo. Se extrajo del JSX inline que usaban
 * "Crear", "Cancelar" y activar/inactivar para que el flujo de eliminar
 * reutilice exactamente el mismo estilo (fondo del tema, rounded-2xl y dos
 * botones del mismo ancho). `titulo`, `icono` y `advertencia` son
 * opcionales: los flujos preexistentes se pintan igual que siempre, y
 * `cerrarConEscYOverlay` / `enfocarCancelar` solo se activan en el diálogo
 * de eliminar para no alterar el comportamiento de los demás flujos.
 */
function ConfirmDialog({
  mensaje,
  titulo,
  icono,
  advertencia,
  textoConfirmar = "Confirmar",
  cerrarConEscYOverlay = false,
  enfocarCancelar = false,
  onConfirmar,
  onCancelar,
}: {
  mensaje: React.ReactNode;
  titulo?: string;
  icono?: React.ReactNode;
  advertencia?: React.ReactNode;
  textoConfirmar?: string;
  cerrarConEscYOverlay?: boolean;
  enfocarCancelar?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  // Esc cierra sin eliminar, igual que pulsar "Cancelar".
  useEffect(() => {
    if (!cerrarConEscYOverlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cerrarConEscYOverlay, onCancelar]);

  // Foco inicial en Cancelar: Enter nunca elimina por accidente.
  useEffect(() => {
    if (enfocarCancelar) cancelRef.current?.focus();
  }, [enfocarCancelar]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4"
      onClick={
        cerrarConEscYOverlay
          ? (e) => {
              // Solo un clic en el overlay (fuera del diálogo) lo cierra.
              if (e.target === e.currentTarget) onCancelar();
            }
          : undefined
      }
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border p-6"
      >
        {icono && <div className="mb-3">{icono}</div>}
        {titulo && (
          <h3 className="text-lg font-bold text-foreground mb-2" style={{ fontFamily: SERIF }}>
            {titulo}
          </h3>
        )}
        <p className={`text-sm mb-5 ${titulo ? "text-muted-foreground" : "text-foreground"}`}>
          {mensaje}
        </p>
        {advertencia && (
          <div className="-mt-3 mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-snug break-words text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            {advertencia}
          </div>
        )}
        <div className="flex gap-3">
          <button
            ref={cancelRef}
            onClick={onCancelar}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all"
          >
            {textoConfirmar}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────── Componente ───────────────────────────
interface Props {
  insumos: Insumo[];
  setInsumos: React.Dispatch<React.SetStateAction<Insumo[]>>;
  /** Fichas técnicas única por id de registro (PROD-### / PIN-###). */
  fichas: FichasPorProducto;
  setFichas: React.Dispatch<React.SetStateAction<FichasPorProducto>>;
  /** IDs de registros que pueden tener ficha (productos del menú y Productos
      Insumo): con ellos se numera la siguiente ficha sin huecos. */
  idsConFicha: string[];
  productosInsumo?: ProductoInsumo[];
  setProductosInsumo?: React.Dispatch<React.SetStateAction<ProductoInsumo[]>>;
  /** Navega a Orden de Producción con el modal ya abierto y este producto
      preseleccionado. */
  abrirOrdenProduccion?: (idProductoInsumo: string) => void;
}

export function GestionInsumosScreen({ insumos, setInsumos, fichas, setFichas, idsConFicha, productosInsumo = [], setProductosInsumo, abrirOrdenProduccion }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showProductoModal, setShowProductoModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [detalleItem, setDetalleItem] = useState<Insumo | ProductoInsumo | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "activos" | "inactivos">("todos");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "insumos" | "productos">("todos");
  const [editandoProducto, setEditandoProducto] = useState(false);

  // Form state - Insumo
  const [nombre, setNombre] = useState("");
  const [categoriaId, setCategoriaId] = useState(CATEGORIAS_INSUMO[0].id);
  const [unidad, setUnidad] = useState(UNIDADES[0]);
  const [stockActual, setStockActual] = useState(0);
  const [stockMinimo, setStockMinimo] = useState(0);
  const [costoUnitario, setCostoUnitario] = useState(0);

  // Form state - Producto Insumo
  const [piNombre, setPiNombre] = useState("");
  // Categoría del Producto Insumo (solo Pizzas/Lasañas): define los tamaños
  // fijos de su ficha técnica vía CONFIG_CATEGORIA.
  const [piCategoriaId, setPiCategoriaId] = useState<string>(CATEGORIAS_PI[0].id);
  // Ficha técnica única del Producto Insumo (la comparte con Producción >
  // Productos y con Orden de Producción). Todo lo editable vive aquí.
  const [piFicha, setPiFicha] = useState<FichaVersion>(emptyFichaVersion(1));
  const [piStockActual, setPiStockActual] = useState(0);
  const [piStockMinimo, setPiStockMinimo] = useState(0);
  const [piUnidadMedida, setPiUnidadMedida] = useState(UNIDADES[0]);

  // Confirmación
  const [confirmState, setConfirmState] = useState<{
    tipo: "crear-producto" | "cancelar-producto" | "cambiar-estado" | "eliminar" | null;
    mensaje: string;
    id?: string;
    nuevoEstado?: "activo" | "inactivo";
  }>({ tipo: null, mensaje: "" });

  // Alerta de stock bajo al cargar
  useEffect(() => {
    const bajos = insumos.filter(i => i.estado === "activo" && esStockBajo(i));
    if (bajos.length > 0) {
      const nombres = bajos.map(b => b.nombre).join(", ");
      toast.warning(
        bajos.length === 1
          ? `1 insumo con stock bajo: ${nombres}`
          : `${bajos.length} insumos con stock bajo: ${nombres}`,
        { duration: 8000, icon: <AlertTriangle className="w-4 h-4" /> }
      );
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = insumos;
    if (filtroEstado === "activos") result = result.filter(i => i.estado === "activo");
    if (filtroEstado === "inactivos") result = result.filter(i => i.estado === "inactivo");
    if (filtroTipo === "insumos") result = result.filter(i => i.tipo !== "ProductoInsumo");
    if (filtroTipo === "productos") result = result.filter(i => i.tipo === "ProductoInsumo");
    if (q) {
      result = result.filter(i =>
        i.nombre.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        formatearId(i.id).includes(q) ||
        categoriaNombre(i.categoriaId).toLowerCase().includes(q)
      );
    }
    // Orden por defecto: se RESPETA el orden del array (orden de creación) y ya
    // no se reordena por ID. Antes había un `sort((a, b) => a.id.localeCompare(b.id))`
    // que mandaba el insumo recién creado al FINAL, porque se inserta con
    // `setInsumos(prev => [nuevo, ...prev])` al inicio y su ID es la más baja
    // de la lista (INS-001, INS-002…): el usuario quiere ver LO ÚLTIMO CREADO
    // ARRIBA, así que manda el orden de creación. Paginación, filtros y la
    // descarga a Excel siguen funcionando igual: solo cambia el orden de las filas.
    return result;
  }, [insumos, search, filtroEstado, filtroTipo]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Descarga del listado completo (buscador + estado + tipo, sin importar
  // la página actual del paginador).
  const exportExcel = async () => {
    if (filtered.length === 0) {
      toast.error("No hay datos para exportar.");
      return;
    }
    const archivo = await exportarExcelEstilizado({
      datos: filtered,
      nombreHoja: "Insumos",
      nombreArchivo: "insumos",
      titulo: "Insumos",
      columnas: [
        { header: "ID", valor: (i) => i.id },
        { header: "Tipo", valor: (i) => (i.tipo === "ProductoInsumo" ? "Producto insumo" : "Insumo") },
        { header: "Categoría", valor: (i) => (i.tipo === "ProductoInsumo" ? "-" : categoriaNombre(i.categoriaId)) },
        { header: "Nombre", valor: (i) => i.nombre },
        { header: "Unidad", valor: (i) => i.unidadMedida },
        { header: "Stock Actual", valor: (i) => i.stockActual, alineacion: "right" },
        { header: "Stock Mínimo", valor: (i) => i.stockMinimo, alineacion: "right" },
        { header: "Costo Unitario", valor: (i) => (i.tipo === "ProductoInsumo" ? "-" : i.costoUnitario), numFmt: "$#,##0", alineacion: "right" },
        { header: "Estado", valor: (i) => (i.estado === "activo" ? "Activo" : "Inactivo"), esEstado: true },
      ],
    });
    void archivo;
    toast.success("Archivo Excel descargado");
  };

  // ─────────────────────────── Insumo CRUD ───────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setNombre("");
    setCategoriaId(CATEGORIAS_INSUMO[0].id);
    setUnidad(UNIDADES[0]);
    setStockActual(0);
    setStockMinimo(0);
    setCostoUnitario(0);
    setShowModal(true);
  };

  const openEdit = (insumo: Insumo) => {
    if (insumo.estado === "inactivo") {
      toast.error("Activa el insumo para editarlo.");
      return;
    }
    if (insumo.tipo === "ProductoInsumo") {
      // Editar producto insumo
      setEditingId(insumo.id);
      setEditandoProducto(true);
      setPiNombre(insumo.nombre);
      // La ficha sale de las versiones guardadas (borrador = copia de la
      // última) o, si aún no existe, de los campos legacy del propio insumo.
      const guardadas = (fichas[insumo.id] ?? []).map(copiarFicha);
      const ultima = guardadas[guardadas.length - 1];
      const base = ultima ?? fichaDesdeLegacyInsumo(insumo);
      // Categoría guardada si es de las admitidas (Pizzas/Lasañas); los
      // registros viejos (categoriaId "-") nacen como Pizzas.
      const catId = categoriaPIValida(insumo.categoriaId)
        ? insumo.categoriaId
        : CATEGORIAS_PI[0].id;
      setPiCategoriaId(catId);
      const borrador: FichaVersion = base
        ? { ...base, destino: { tipo: "producto-insumo", insumoId: insumo.id } }
        : { ...emptyFichaVersion(1), destino: { tipo: "producto-insumo", insumoId: insumo.id } };
      // Los tamaños del borrador se ajustan a la categoría (misma regla que
      // Crear/Editar Producto en Producción > Productos).
      setPiFicha(ajustarFilasPI(borrador, catId));
      setPiStockActual(insumo.stockActual);
      setPiStockMinimo(insumo.stockMinimo);
      setPiUnidadMedida(insumo.unidadMedida);
      setShowProductoModal(true);
    } else {
      // Editar insumo normal
      setEditingId(insumo.id);
      setEditandoProducto(false);
      setNombre(insumo.nombre);
      setCategoriaId(insumo.categoriaId);
      setUnidad(insumo.unidadMedida);
      setStockActual(insumo.stockActual);
      setStockMinimo(insumo.stockMinimo);
      setCostoUnitario(insumo.costoUnitario);
      setShowModal(true);
    }
  };

  const handleSave = () => {
    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }

    if (editingId) {
      if (costoUnitario < 0) {
        toast.error("El costo unitario no puede ser negativo.");
        return;
      }

      // En edición solo se actualizan el stock actual y el stock mínimo; el
      // costoUnitario y los demás campos conservan su valor original aunque
      // el formulario los envíe modificados (no se confía solo en el disabled
      // del HTML).
      const original = insumos.find(i => i.id === editingId);
      if (!original) return;
      setInsumos(prev => prev.map(i =>
        i.id === editingId
          ? { ...i, stockActual, stockMinimo }
          : i
      ));
      const actualizado: Insumo = { ...original, stockActual, stockMinimo };
      if (esStockBajo(actualizado)) {
        toast.warning(`Alerta: el stock de ${actualizado.nombre} está bajo (${actualizado.stockActual} ${actualizado.unidadMedida}, mínimo ${actualizado.stockMinimo} ${actualizado.unidadMedida})`, { duration: 6000 });
      } else {
        toast.success(`Insumo "${original.nombre}" actualizado`);
      }
    } else {
      const maxNum = insumos.reduce((max, i) => {
        const n = parseInt(i.id.replace("INS-", ""), 10) || 0;
        return Math.max(max, n);
      }, 0);
      const newId = `INS-${String(maxNum + 1).padStart(3, "0")}`;
      const nuevo: Insumo = {
        id: newId,
        nombre: nombre.trim(),
        categoriaId,
        unidadMedida: unidad,
        // Punto 10: la creación ya no pide estos tres campos, así que nacen
        // en 0 (el stock se carga después de crear el insumo y el costo se
        // escribe desde Editar). Los estados siguen en 0 porque `openCreate`
        // los limpia y los campos están ocultos.
        stockActual,
        stockMinimo,
        costoUnitario,
        precioUnitario: null,
        iva: null,
        tipo: "Insumo",
        estado: "activo",
      };
      setInsumos(prev => [nuevo, ...prev]);
      if (esStockBajo(nuevo)) {
        toast.warning(`Alerta: el stock de ${nuevo.nombre} está bajo (${nuevo.stockActual} ${nuevo.unidadMedida}, mínimo ${nuevo.stockMinimo} ${nuevo.unidadMedida})`, { duration: 6000 });
      } else {
        toast.success(`Insumo "${nombre}" creado`);
      }
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    const reg = insumos.find(i => i.id === id);
    setInsumos(prev => {
      const next = prev.filter(i => i.id !== id);
      // Si la página actual queda vacía, retroceder
      const totalPagesAfter = Math.ceil(next.length / PER_PAGE);
      if (page > totalPagesAfter && totalPagesAfter > 0) {
        setPage(totalPagesAfter);
      }
      return next;
    });
    toast.success(
      reg?.tipo === "ProductoInsumo"
        ? "Producto insumo eliminado correctamente"
        : "Insumo eliminado correctamente",
    );
  };

  // ─────────────────────────── Estado Activo/Inactivo ───────────────────────────
  const toggleEstado = (id: string) => {
    const insumo = insumos.find(i => i.id === id);
    if (!insumo) return;
    const nuevoEstado = insumo.estado === "activo" ? "inactivo" : "activo";
    setConfirmState({
      tipo: "cambiar-estado",
      mensaje: nuevoEstado === "inactivo"
        ? `¿Deseas inactivar el insumo "${insumo.nombre}"?`
        : `¿Deseas activar el insumo "${insumo.nombre}"?`,
      id,
      nuevoEstado,
    });
  };

  // ─────────────────────────── Producto Insumo ───────────────────────────
  const openCreateProducto = () => {
    setPiNombre("");
    setPiCategoriaId(CATEGORIAS_PI[0].id);
    // Borrador con las filas de la categoría por defecto (Pizzas: Mediana y
    // Grande), igual que "Crear Producto" en Producción > Productos.
    const filas = filasDeCategoriaPI(CATEGORIAS_PI[0].id);
    setPiFicha({
      ...emptyFichaVersion(1),
      porcionesPorTamano: filas,
      porciones: filas[0]?.porciones ?? 1,
    });
    setPiStockActual(0);
    setPiStockMinimo(0);
    setPiUnidadMedida(UNIDADES[0]);
    setShowProductoModal(true);
  };

  const handleCrearProducto = () => {
    if (!piNombre.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    if (piFicha.insumos.length === 0) {
      toast.error("Agrega al menos un insumo.");
      return;
    }
    setConfirmState({
      tipo: "crear-producto",
      mensaje: editandoProducto ? "¿Deseas guardar los cambios?" : "¿Deseas crear este producto insumo?",
    });
  };

  const handleCancelarProducto = () => {
    setConfirmState({
      tipo: "cancelar-producto",
      mensaje: "¿Deseas cancelar? Se perderán los datos ingresados.",
    });
  };

  const ejecutarConfirmacion = () => {
    if (confirmState.tipo === "crear-producto") {
      if (editandoProducto) {
        if (!editingId) return;
        // Editar producto insumo: ficha técnica única. Las versiones solo
        // crecen si el borrador cambió frente a la última.
        const original = insumos.find(i => i.id === editingId);
        if (!original) return;
        const versiones = fichas[editingId] ?? [];
        const ultima = versiones[versiones.length - 1];
        const ahora = new Date().toISOString();
        if (!ultima) {
          // Nunca tuvo ficha guardada: el borrador entra como v1.
          setFichas(prev => ({
            ...prev,
            [editingId]: [{
              ...piFicha,
              version: 1,
              idReceta: numeroNuevoFicha(siguienteNumeroFicha(fichas, idsConFicha)),
              destino: { tipo: "producto-insumo", insumoId: editingId },
              fechaInicio: ahora,
              fechaFin: null,
            }],
          }));
        } else if (fichaTieneCambios(piFicha, ultima)) {
          setFichas(prev => ({
            ...prev,
            [editingId]: [
              ...versiones.map((v, i) =>
                i === versiones.length - 1 ? { ...v, fechaFin: ahora } : v
              ),
              {
                ...piFicha,
                version: ultima.version + 1,
                idReceta: ultima.idReceta,
                destino: { tipo: "producto-insumo", insumoId: editingId },
                fechaInicio: ahora,
                fechaFin: null,
              },
            ],
          }));
        }
        toast.success(`Producto Insumo "${original.nombre}" actualizado`);
        setShowProductoModal(false);
        setEditandoProducto(false);
        setPiNombre("");
        setPiFicha(emptyFichaVersion(1));
      } else {
        // Crear nuevo producto insumo
        const maxNum = insumos.reduce((max, i) => {
          if (!i.id.startsWith("PIN-")) return max;
          const n = parseInt(i.id.replace("PIN-", ""), 10) || 0;
          return Math.max(max, n);
        }, 0);
        const newId = `PIN-${String(maxNum + 1).padStart(3, "0")}`;
        const nuevo: Insumo = {
          id: newId,
          nombre: piNombre.trim(),
          unidadMedida: piUnidadMedida,
          costoUnitario: 0,
          precioUnitario: null,
          iva: null,
          tipo: "ProductoInsumo",
          stockActual: piStockActual,
          stockMinimo: piStockMinimo,
          categoriaId: piCategoriaId,
          estado: "activo",
        };
        setInsumos(prev => [nuevo, ...prev]);
        // La ficha del Producto Insumo nace junto con el registro, con el
        // siguiente número de la serie compartida (001, 002, …).
        setFichas(prev => ({
          ...prev,
          [newId]: [{
            ...piFicha,
            version: 1,
            idReceta: numeroNuevoFicha(siguienteNumeroFicha(fichas, idsConFicha)),
            destino: { tipo: "producto-insumo", insumoId: newId },
            fechaInicio: new Date().toISOString(),
            fechaFin: null,
          }],
        }));
        toast.success(`Producto Insumo "${piNombre}" creado`, {
          action: {
            label: "Programar producción",
            onClick: () => abrirOrdenProduccion?.(newId),
          },
        });
        setShowProductoModal(false);
        setPiNombre("");
        setPiFicha(emptyFichaVersion(1));
      }
    } else if (confirmState.tipo === "cancelar-producto") {
      setShowProductoModal(false);
      setEditandoProducto(false);
      setPiNombre("");
      setPiFicha(emptyFichaVersion(1));
    } else if (confirmState.tipo === "cambiar-estado" && confirmState.id && confirmState.nuevoEstado) {
      setInsumos(prev => prev.map(i =>
        i.id === confirmState.id ? { ...i, estado: confirmState.nuevoEstado! } : i
      ));
      toast.success(`Estado actualizado`);
    } else if (confirmState.tipo === "eliminar" && confirmState.id) {
      // Reutiliza handleDelete: mantiene el retroceso de página si queda
      // vacía, filtros y buscador intactos, y el recálculo de stock bajo.
      handleDelete(confirmState.id);
    }
    setConfirmState({ tipo: null, mensaje: "" });
  };

  const cancelarConfirmacion = () => {
    setConfirmState({ tipo: null, mensaje: "" });
  };

  // Registro que espera el diálogo de "eliminar" (si ese es el flujo activo)
  // y productos insumo cuya composición lo incluyen: solo una advertencia
  // visible, nunca bloquea la acción.
  const regAEliminar =
    confirmState.tipo === "eliminar" && confirmState.id
      ? insumos.find(i => i.id === confirmState.id) ?? null
      : null;
  const usadosEnProductos =
    regAEliminar && regAEliminar.tipo !== "ProductoInsumo"
      ? insumos.filter(
          p => p.tipo === "ProductoInsumo" && (p.composicion ?? []).some(c => c.id === regAEliminar.id),
        )
      : [];

  // ── Pantalla completa Crear/Editar Producto Insumo ──────────────────────
  // Calca de "Crear Producto" (Producción > Productos): early-return, alto
  // exacto sobre el viewport y dos columnas con divide-x. La ficha técnica
  // siempre está visible a la derecha (sin botón ocultar); sus tamaños los
  // define la categoría elegida vía CONFIG_CATEGORIA (Pizzas: Mediana y
  // Grande · Lasañas: Normal).
  if (showProductoModal) {
    const iCls = "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
    const tamanosPI = filasDeCategoriaPI(piCategoriaId).map(f => f.tamano);
    const confirmPI =
      confirmState.tipo === "crear-producto" || confirmState.tipo === "cancelar-producto";
    return (
      /* Igual que Crear Producto: el alto es el viewport menos el AdminTopBar
         (3.5rem) y el footer del admin en cada breakpoint; cada columna
         scrollea por dentro, nunca la página. */
      <div className="h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-3.5rem-7.25rem)] xl:h-[calc(100dvh-3.5rem-4.3125rem)] bg-background flex flex-col overflow-hidden">
        {/* Cabecera fija: no crece ni genera scroll */}
        <div className="shrink-0 bg-card border-b border-border px-6 py-2.5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
              {editandoProducto ? "Editar Producto Insumo" : "Crear Producto Insumo"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editandoProducto
                ? "Solo se puede modificar la ficha técnica"
                : "Completa los datos del producto y su ficha técnica"}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancelarProducto}
              className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCrearProducto}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
            >
              {editandoProducto ? "Guardar cambios" : "Crear"}
            </button>
          </div>
        </div>

        {/* Two columns: cada columna scrollea por dentro, nunca la página */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border overflow-y-auto lg:overflow-hidden">
          {/* ── COLUMNA IZQUIERDA: datos del producto insumo ── */}
          <div className="w-full lg:w-1/2 px-6 py-4 flex flex-col min-h-0">
            <div className="flex flex-col flex-1 min-h-0 w-full max-w-2xl">
              <p className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Datos del producto insumo
              </p>
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
                {/* Categoría — solo Pizzas y Lasañas: define los tamaños de
                    la ficha técnica (Bebidas, de reventa, queda fuera). */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Categoría *</label>
                  <select
                    value={piCategoriaId}
                    onChange={e => {
                      const sig = e.target.value;
                      setPiCategoriaId(sig);
                      setPiFicha(prev => ajustarFilasPI(prev, sig));
                    }}
                    disabled={editandoProducto}
                    className={iCls + (editandoProducto ? " text-muted-foreground cursor-not-allowed" : " cursor-pointer")}
                  >
                    {CATEGORIAS_PI.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    La ficha técnica se muestra con sus tamaños: {tamanosPI.join(" / ") || "—" }.
                  </p>
                </div>
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Nombre del Producto Insumo *</label>
                  <input
                    value={piNombre}
                    onChange={e => setPiNombre(e.target.value)}
                    placeholder="Ej: Salsa de tomate preparada"
                    disabled={editandoProducto}
                    className={iCls + (editandoProducto ? " text-muted-foreground cursor-not-allowed" : "")}
                  />
                </div>
                {/* Stock actual + Stock mínimo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Cantidad (stock actual) *</label>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={piStockActual}
                      onChange={e => setPiStockActual(Number(e.target.value))}
                      disabled={editandoProducto}
                      className={iCls + (editandoProducto ? " text-muted-foreground cursor-not-allowed" : "")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Stock Mínimo *</label>
                    <input
                      type="number"
                      min={0}
                      value={piStockMinimo}
                      onChange={e => setPiStockMinimo(Number(e.target.value))}
                      disabled={editandoProducto}
                      className={iCls + (editandoProducto ? " text-muted-foreground cursor-not-allowed" : "")}
                    />
                  </div>
                </div>
                {/* Unidad de medida */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Unidad de Medida</label>
                  <select
                    value={piUnidadMedida}
                    onChange={e => setPiUnidadMedida(e.target.value)}
                    disabled={editandoProducto}
                    className={iCls + (editandoProducto ? " text-muted-foreground cursor-not-allowed" : " cursor-pointer")}
                  >
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── COLUMNA DERECHA: ficha técnica (siempre visible) ── */}
          <div className="w-full lg:w-1/2 px-6 py-4 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
              <p className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Ficha Técnica
              </p>
              <FichaTecnicaEditor
                ficha={piFicha}
                onChange={setPiFicha}
                insumos={insumos}
                modo="insumo"
                inputCls={iCls}
                /* Los tamaños los define la categoría (CONFIG_CATEGORIA). */
                tamanoFijo={tamanosPI}
              />
            </div>
          </div>
        </div>

        {/* ── Confirmación del flujo (crear / cancelar) ── */}
        <AnimatePresence>
          {confirmPI && (
            <ConfirmDialog
              mensaje={confirmState.mensaje}
              onConfirmar={ejecutarConfirmacion}
              onCancelar={cancelarConfirmacion}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─────────────────────────── Render ───────────────────────────
  return (
    <div className="px-4 sm:px-6 pt-5 pb-4 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
            Gestión de Insumos
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Catálogo de insumos disponibles
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BotonDescargarExcel onClick={exportExcel} />
          <button
            onClick={openCreateProducto}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-card border border-border text-foreground font-semibold text-sm rounded-xl hover:bg-muted active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Crear Producto Insumo
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Crear Insumo
          </button>
        </div>
      </div>

      {/* Search + Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
        <SearchInput
          value={search}
          onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Buscar por nombre, ID o categoría..."
          wrapperClassName="w-full max-w-sm shrink-0"
        />
        <select
          value={filtroEstado}
          onChange={e => { setFiltroEstado(e.target.value as "todos" | "activos" | "inactivos"); setPage(1); }}
          aria-label="Filtrar por estado"
          className="px-4 py-2.5 bg-muted dark:bg-input rounded-full border border-border text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer appearance-none"
        >
          <option value="todos">Todos los estados</option>
          <option value="activos">Activo</option>
          <option value="inactivos">Inactivo</option>
        </select>
        <select
          value={filtroTipo}
          onChange={e => { setFiltroTipo(e.target.value as "todos" | "insumos" | "productos"); setPage(1); }}
          aria-label="Filtrar por tipo"
          className="px-4 py-2.5 bg-muted dark:bg-input rounded-full border border-border text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer appearance-none"
        >
          <option value="todos">Todos los tipos</option>
          <option value="insumos">Insumos</option>
          <option value="productos">Productos insumo</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-card border border-border rounded-2xl overflow-hidden mb-3">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <colgroup>
            <col style={{ width: "7%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "23%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
            <tr>
              {["ID", "CATEGORÍA", "NOMBRE", "UNIDAD", "STOCK ACTUAL", "STOCK MÍN.", "COSTO UNIT.", "ESTADO", "ACCIONES"].map(h => (
                <th key={h} className="px-3 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-14 text-center text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No hay resultados</p>
                </td>
              </tr>
            ) : paged.map(insumo => {
              const esProductoInsumo = insumo.tipo === "ProductoInsumo";
              const stockBajo = insumo.estado === "activo" && esStockBajo(insumo);
              const inactivo = insumo.estado === "inactivo";
              return (
                <tr key={insumo.id} className={`hover:bg-muted/20 dark:hover:bg-muted/10 transition-colors ${inactivo ? "opacity-50" : ""}`}>
                  <td className="px-3 py-3.5 text-sm font-mono font-bold text-foreground">{formatearId(insumo.id)}</td>
                  <td className="px-3 py-3.5 text-sm text-foreground break-words">
                    {esProductoInsumo ? "-" : categoriaNombre(insumo.categoriaId)}
                  </td>
                  <td className="px-3 py-3.5 text-sm text-foreground break-words">
                    <div>{insumo.nombre}</div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                      {esProductoInsumo ? "Producto insumo" : "Insumo"}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-sm text-muted-foreground">{insumo.unidadMedida}</td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xs font-mono font-bold text-foreground">{insumo.stockActual}</span>
                      {stockBajo && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 whitespace-nowrap">
                          Stock bajo
                        </span>
                      )}
                      {!stockBajo && insumo.estado === "activo" && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 whitespace-nowrap">
                          OK
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-sm font-mono text-muted-foreground">{insumo.stockMinimo}</td>
                  <td className="px-3 py-3.5 text-sm font-mono font-bold text-foreground">{esProductoInsumo ? "-" : fmtCOP(insumo.costoUnitario)}</td>
                  <td className="px-3 py-3.5">
                    {/* Pill de estado (diseño de Proveedores). Mantiene el
                        flujo de siempre: elegir la opción contraria pide la
                        confirmación y si es la actual no hace nada. */}
                    <EstadoSelect
                      value={insumo.estado}
                      onChange={nuevoEstado => {
                        if (nuevoEstado === insumo.estado) return;
                        toggleEstado(insumo.id);
                      }}
                      options={[
                        { value: "activo", label: "Activo", color: ESTADO_ACTIVO_COLOR },
                        { value: "inactivo", label: "Inactivo", color: ESTADO_INACTIVO_COLOR },
                      ]}
                    />
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <ActionIcons
                        onView={() => { setDetalleItem(insumo); setShowDetalleModal(true); }}
                        onEdit={() => openEdit(insumo)}
                        editDisabled={inactivo}
                        editTitle={inactivo ? "Activa el insumo para editarlo" : "Editar"}
                        onDelete={() => setConfirmState({ tipo: "eliminar", mensaje: "", id: insumo.id })}
                      />
                      {esProductoInsumo && (
                        <button
                          onClick={() => abrirOrdenProduccion?.(insumo.id)}
                          disabled={!fichaVigente(fichas, insumo) || inactivo}
                          title={
                            inactivo ? "Producto Insumo inactivo" :
                            !fichaVigente(fichas, insumo) ? "Registra su ficha técnica primero" :
                            "Programar producción"
                          }
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChefHat className="w-4 h-4" />
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
      {filtered.length > 0 && (
        <Paginador pagina={page} totalPaginas={totalPages} onCambio={setPage} />
      )}

      {/* ─────────────────────────── Modal Crear/Editar Insumo ─────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border"
            >
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
                    {editingId ? "Editar Insumo" : "Crear Insumo"}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {editingId && (
                  <p className="text-xs text-muted-foreground mt-1">Solo se pueden modificar el stock actual y el stock mínimo.</p>
                )}
              </div>
              <div className="px-6 py-5 space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nombre *</label>
                  <input
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Ej: Queso Mozzarella"
                    disabled={!!editingId}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none ${
                      editingId
                        ? "bg-muted/50 dark:bg-muted/30 text-muted-foreground cursor-not-allowed"
                        : "bg-muted dark:bg-input text-foreground focus:ring-2 focus:ring-primary/30"
                    }`}
                  />
                </div>
                {/* Categoría + Unidad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Categoría</label>
                    <select
                      value={categoriaId}
                      onChange={e => setCategoriaId(e.target.value)}
                      disabled={!!editingId}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none ${
                        editingId
                          ? "bg-muted/50 dark:bg-muted/30 text-muted-foreground cursor-not-allowed"
                          : "bg-muted dark:bg-input text-foreground cursor-pointer"
                      }`}
                    >
                      {CATEGORIAS_INSUMO.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Unidad de Medida</label>
                    {/* Select personalizado (Radix, igual que los estados): el
                        `<select>` nativo desplegaba la lista CUADRADA y con el
                        azul del navegador. */}
                    <UnidadSelect
                      value={unidad}
                      onChange={setUnidad}
                      disabled={!!editingId}
                      fieldClassName={
                        editingId
                          ? "bg-muted/50 dark:bg-muted/30 text-muted-foreground"
                          : "bg-muted dark:bg-input text-foreground"
                      }
                    />
                  </div>
                </div>
                {/* Punto 10: el Stock Actual solo aparece al EDITAR (al crear
                    el stock se carga después de dar de alta el insumo). Es
                    editable, igual que el Stock Mínimo: son los únicos campos
                    que cambian en edición. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {editingId && (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Stock Actual</label>
                      <input
                        type="number"
                        min={0}
                        value={stockActual}
                        onChange={e => setStockActual(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-foreground bg-muted dark:bg-input focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  )}
                  {/* En creación toma las dos columnas: no está el Stock Actual. */}
                  <div className={editingId ? "" : "sm:col-span-2"}>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Stock Mínimo *</label>
                    <input
                      type="number"
                      min={0}
                      value={stockMinimo}
                      onChange={e => setStockMinimo(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted dark:bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                {editingId && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Costo Unitario (COP)</label>
                    <input
                      type="number"
                      min={0}
                      value={costoUnitario || ""}
                      disabled={!!editingId}
                      onChange={e => setCostoUnitario(Number(e.target.value))}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none ${
                        editingId
                          ? "bg-muted/50 dark:bg-muted/30 text-muted-foreground cursor-not-allowed"
                          : "bg-muted dark:bg-input text-foreground focus:ring-2 focus:ring-primary/30"
                      }`}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all inline-flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {editingId ? "Guardar" : "Crear Insumo"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────── Modal Detalle ─────────────────────────── */}
      <AnimatePresence>
        {showDetalleModal && detalleItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <h3
                  className="min-w-0 flex-1 pr-3 text-lg font-bold text-foreground break-words"
                  style={{ fontFamily: SERIF }}
                >
                  {/* Título según el campo `tipo` del registro (no por el
                      prefijo del ID): un solo modal, un solo título dinámico. */}
                  {detalleItem.tipo === "ProductoInsumo" ? "Detalle de Producto Insumo" : "Detalle de Insumo"}
                </h3>
                <button onClick={() => setShowDetalleModal(false)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-3 overflow-y-auto">
                {(() => {
                  if ("tipo" in detalleItem && (detalleItem as ProductoInsumo).tipo === "ProductoInsumo") {
                    const d = detalleItem as Insumo;
                    const guardadas = fichas[d.id] ?? [];
                    const fv = guardadas.length > 0 ? guardadas[guardadas.length - 1] : fichaDesdeLegacyInsumo(d);
                    return (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">ID</label>
                          <p className="text-sm font-mono font-bold text-foreground">{formatearId(d.id)}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre</label>
                          <p className="text-sm text-foreground">{d.nombre}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Ficha técnica</label>
                          {fv ? (
                            <FichaTecnicaDetalle
                              v={fv}
                              readCls="w-full px-3 py-2 bg-muted/50 rounded-xl border border-border text-sm text-foreground"
                              modo="insumo"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Sin ficha técnica</p>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad</label>
                            <p className="text-sm font-mono font-bold text-foreground">{d.stockActual} {d.unidadMedida}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Unidad</label>
                            <p className="text-sm text-foreground">{d.unidadMedida}</p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Stock Mínimo</label>
                          <p className="text-sm font-mono text-muted-foreground">{d.stockMinimo}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                            <p className={`text-sm font-mono font-bold ${d.estado === "activo" ? "text-emerald-600" : "text-gray-500"}`}>
                              {d.estado === "activo" ? "Activo" : "Inactivo"}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Costo Unitario</label>
                            <p className="text-sm font-mono font-bold text-foreground">-</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">IVA</label>
                            <p className="text-sm font-mono font-bold text-foreground">-</p>
                          </div>
                        </div>
                      </>
                    );
                  } else {
                    const d = detalleItem as Insumo;
                    return (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">ID</label>
                          <p className="text-sm font-mono font-bold text-foreground">{formatearId(d.id)}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre</label>
                          <p className="text-sm text-foreground">{d.nombre}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Categoría</label>
                          <p className="text-sm text-foreground">{categoriaNombre(d.categoriaId)}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Unidad</label>
                            <p className="text-sm text-foreground">{d.unidadMedida}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Stock Actual</label>
                            <p className="text-sm font-mono font-bold text-foreground">{d.stockActual}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Stock Mínimo</label>
                            <p className="text-sm font-mono text-muted-foreground">{d.stockMinimo}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">IVA</label>
                            <p className="text-sm font-mono font-bold text-foreground">{d.iva !== null ? `${d.iva}%` : "-"}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Costo Unitario</label>
                            <p className="text-sm font-mono font-bold text-foreground">{fmtCOP(d.costoUnitario)}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Precio Unitario</label>
                            <p className="text-sm font-mono font-bold text-foreground">{d.precioUnitario !== null ? fmtCOP(d.precioUnitario) : "-"}</p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                          <p className="text-sm font-mono font-bold text-foreground">{d.estado === "activo" ? "Activo" : "Inactivo"}</p>
                        </div>
                      </>
                    );
                  }
                })()}
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border">
                {(() => {
                  if (!("tipo" in detalleItem && (detalleItem as ProductoInsumo).tipo === "ProductoInsumo")) return null;
                  const d = detalleItem as Insumo;
                  return (
                    <button
                      onClick={() => { setShowDetalleModal(false); abrirOrdenProduccion?.(d.id); }}
                      disabled={!fichaVigente(fichas, d) || d.estado === "inactivo"}
                      title={d.estado === "inactivo" ? "Producto Insumo inactivo" : !fichaVigente(fichas, d) ? "Registra su ficha técnica primero" : "Programar producción"}
                      className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Programar producción
                    </button>
                  );
                })()}
                <button
                  onClick={() => setShowDetalleModal(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────── Modal Confirmación ─────────────────────────── */}
      <AnimatePresence>
        {confirmState.tipo && (
          <ConfirmDialog
            mensaje={
              regAEliminar
                ? `Vas a eliminar «${regAEliminar.nombre}» (ID ${regAEliminar.id}). Esta acción no se puede deshacer.`
                : confirmState.mensaje
            }
            titulo={
              confirmState.tipo === "eliminar"
                ? regAEliminar?.tipo === "ProductoInsumo"
                  ? "¿Eliminar producto insumo?"
                  : "¿Eliminar insumo?"
                : undefined
            }
            icono={
              confirmState.tipo === "eliminar" ? (
                <span className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </span>
              ) : undefined
            }
            advertencia={
              usadosEnProductos.length > 0
                ? `Este insumo se usa en los productos insumo: ${usadosEnProductos.map(p => p.nombre).join(", ")}`
                : undefined
            }
            textoConfirmar={confirmState.tipo === "eliminar" ? "Eliminar" : "Confirmar"}
            cerrarConEscYOverlay={confirmState.tipo === "eliminar"}
            enfocarCancelar={confirmState.tipo === "eliminar"}
            onConfirmar={ejecutarConfirmacion}
            onCancelar={cancelarConfirmacion}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
