import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Pencil, Trash2, X, Check, Package, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { UnidadSelect } from "../components/UnidadSelect";
import { BotonDescargarExcel } from "../components/BotonDescargarExcel";
import { exportarExcelEstilizado } from "../utils/exportExcelEstilizado";
import {
  EstadoSelect,
  ESTADO_ACTIVO_COLOR,
  ESTADO_INACTIVO_COLOR,
} from "../components/EstadoSelect";
import { SearchInput } from "../components/SearchInput";
import { ActionIcons } from "../components/ActionIcons";

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
  stockMaximo: number;
  categoriaId: string;
  estado: "activo" | "inactivo";
  composicion?: ProductoInsumoInsumo[];
  descripcion?: string;
  /** Tiempo de preparación del Producto Insumo, en minutos. Opcional: si queda
      vacío, las órdenes de "Preparación en lote" muestran "Sin tiempo definido".
      Solo aplica a `tipo === "ProductoInsumo"`. */
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
  { id: "INS-001", nombre: "Queso Mozzarella", unidadMedida: "kg", costoUnitario: 18000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 25, stockMinimo: 10, stockMaximo: 50, categoriaId: "CINS-001", estado: "activo" },
  { id: "INS-003", nombre: "Pepperoni", unidadMedida: "kg", costoUnitario: 25000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 8, stockMinimo: 5, stockMaximo: 20, categoriaId: "CINS-002", estado: "activo" },
  { id: "INS-005", nombre: "Champiñones", unidadMedida: "kg", costoUnitario: 12000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 4, stockMinimo: 5, stockMaximo: 15, categoriaId: "CINS-003", estado: "activo" },
  { id: "INS-006", nombre: "Harina", unidadMedida: "kg", costoUnitario: 4500, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 40, stockMinimo: 20, stockMaximo: 120, categoriaId: "CINS-004", estado: "activo" },
  { id: "INS-007", nombre: "Agua", unidadMedida: "lt", costoUnitario: 400, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 120, stockMinimo: 40, stockMaximo: 300, categoriaId: "CINS-004", estado: "activo" },
  { id: "INS-008", nombre: "Aceite", unidadMedida: "lt", costoUnitario: 9000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 12, stockMinimo: 4, stockMaximo: 30, categoriaId: "CINS-004", estado: "activo" },
  { id: "INS-009", nombre: "Levadura", unidadMedida: "kg", costoUnitario: 12000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 2, stockMinimo: 1, stockMaximo: 6, categoriaId: "CINS-004", estado: "activo" },
  { id: "INS-010", nombre: "Aguacate", unidadMedida: "kg", costoUnitario: 9500, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 18, stockMinimo: 8, stockMaximo: 40, categoriaId: "CINS-003", estado: "activo" },
  { id: "INS-011", nombre: "Cebolla", unidadMedida: "kg", costoUnitario: 3500, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 6, stockMinimo: 3, stockMaximo: 15, categoriaId: "CINS-003", estado: "activo" },
  { id: "INS-012", nombre: "Limón", unidadMedida: "lt", costoUnitario: 5000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 4, stockMinimo: 2, stockMaximo: 10, categoriaId: "CINS-003", estado: "activo" },
  // Productos Insumo: lo que Gloria prepara en lote, refrigera y consume la
  // cocina. Cada uno lleva su receta (`composicion`, cantidades POR 1 unidad),
  // su descripción de preparación y su tiempo. Son los únicos que una orden
  // "Preparación en lote" puede producir.
  {
    id: "PIN-001", nombre: "Guacamole", unidadMedida: "lt", costoUnitario: 0,
    precioUnitario: null, iva: null, tipo: "ProductoInsumo",
    stockActual: 8, stockMinimo: 5, stockMaximo: 20, categoriaId: "-", estado: "activo",
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
    stockActual: 30, stockMinimo: 15, stockMaximo: 60, categoriaId: "-", estado: "activo",
    composicion: [
      { id: "INS-005", categoriaId: "CINS-003", nombre: "Champiñones", cantidad: 1, unidadMedida: "kg" },
    ],
    descripcion: "Cocinar a fuego lento y triturar",
    tiempoPreparacion: 45,
  },
  {
    id: "PIN-003", nombre: "Masa Pre-elaborada", unidadMedida: "und", costoUnitario: 0,
    precioUnitario: null, iva: null, tipo: "ProductoInsumo",
    stockActual: 4, stockMinimo: 20, stockMaximo: 100, categoriaId: "-", estado: "activo",
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

// ─────────────────────────── Helpers ───────────────────────────
const fmtCOP = (n: number): string =>
  `$${n.toLocaleString("es-CO")}`;

const esStockBajo = (insumo: Insumo): boolean =>
  insumo.stockActual < insumo.stockMinimo;

const excedeMaximo = (insumo: Insumo): boolean =>
  insumo.stockActual > insumo.stockMaximo;

const formatearId = (id: string): string => {
  const match = id.match(/(\d+)$/);
  return match ? match[1] : id;
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
  productosInsumo?: ProductoInsumo[];
  setProductosInsumo?: React.Dispatch<React.SetStateAction<ProductoInsumo[]>>;
}

export function GestionInsumosScreen({ insumos, setInsumos, productosInsumo = [], setProductosInsumo }: Props) {
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
  const [stockMaximo, setStockMaximo] = useState(0);
  const [costoUnitario, setCostoUnitario] = useState(0);

  // Form state - Producto Insumo
  const [piNombre, setPiNombre] = useState("");
  const [piDescripcion, setPiDescripcion] = useState("");
  const [piInsumos, setPiInsumos] = useState<ProductoInsumoInsumo[]>([]);
  const [piEditandoIdx, setPiEditandoIdx] = useState<number | null>(null);
  const [piCategoriaId, setPiCategoriaId] = useState(CATEGORIAS_INSUMO[0].id);
  const [piInsumoId, setPiInsumoId] = useState("");
  const [piCantidad, setPiCantidad] = useState(1);
  const [piUnidad, setPiUnidad] = useState(UNIDADES[0]);
  const [piStockActual, setPiStockActual] = useState(0);
  const [piStockMinimo, setPiStockMinimo] = useState(0);
  const [piStockMaximo, setPiStockMaximo] = useState(0);
  const [piUnidadMedida, setPiUnidadMedida] = useState(UNIDADES[0]);
  // Tiempo de preparación en minutos. Opcional ("" = sin dato).
  const [piTiempo, setPiTiempo] = useState("");

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
        { header: "Stock Máximo", valor: (i) => i.stockMaximo, alineacion: "right" },
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
    setStockMaximo(0);
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
      setPiDescripcion(insumo.descripcion || "");
      setPiInsumos(insumo.composicion ? [...insumo.composicion] : []);
      setPiEditandoIdx(null);
      setPiCategoriaId(CATEGORIAS_INSUMO[0].id);
      setPiInsumoId("");
      setPiUnidad(UNIDADES[0]);
      setPiStockActual(insumo.stockActual);
      setPiStockMinimo(insumo.stockMinimo);
      setPiStockMaximo(insumo.stockMaximo);
      setPiUnidadMedida(insumo.unidadMedida);
      setPiTiempo(insumo.tiempoPreparacion ? String(insumo.tiempoPreparacion) : "");
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
      setStockMaximo(insumo.stockMaximo);
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
      // Punto 10: estas validaciones SOLO aplican en edición. En la creación
      // ya no se piden Stock máximo ni Costo unitario (quedan en 0 y se
      // cargan después), así que exigirles un valor bloqueaba el alta.
      if (stockMaximo <= 0) {
        toast.error("El stock máximo debe ser mayor a 0.");
        return;
      }
      if (stockMaximo < stockMinimo) {
        toast.error("El stock máximo no puede ser menor al stock mínimo.");
        return;
      }
      if (costoUnitario < 0) {
        toast.error("El costo unitario no puede ser negativo.");
        return;
      }

      // En edición solo se actualiza stockMaximo; el costoUnitario y los demás
      // campos conservan su valor original aunque el formulario los envíe
      // modificados (no se confía solo en el disabled del HTML).
      const original = insumos.find(i => i.id === editingId);
      if (!original) return;
      // Validación: el stock actual no puede exceder el nuevo máximo.
      if (original.stockActual > stockMaximo) {
        toast.error("El stock actual no puede exceder el nuevo stock máximo.");
        return;
      }
      setInsumos(prev => prev.map(i =>
        i.id === editingId
          ? { ...i, stockMaximo, costoUnitario: original.costoUnitario }
          : i
      ));
      if (esStockBajo(original)) {
        toast.warning(`Alerta: el stock de ${original.nombre} está bajo (${original.stockActual} ${original.unidadMedida}, mínimo ${original.stockMinimo} ${original.unidadMedida})`, { duration: 6000 });
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
        // en 0 (el stock se carga después de crear el insumo y el máximo y el
        // costo se escriben desde Editar). Los estados siguen en 0 porque
        // `openCreate` los limpia y los campos están ocultos.
        stockActual,
        stockMinimo,
        stockMaximo,
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
    setPiDescripcion("");
    setPiInsumos([]);
    setPiEditandoIdx(null);
    setPiCategoriaId(CATEGORIAS_INSUMO[0].id);
    setPiInsumoId("");
    setPiUnidad(UNIDADES[0]);
    setPiStockActual(0);
    setPiStockMinimo(0);
    setPiStockMaximo(0);
    setPiUnidadMedida(UNIDADES[0]);
    setPiTiempo("");
    setShowProductoModal(true);
  };

  const insumosFiltradosPorCategoria = useMemo(() => {
    return insumos.filter(i => i.categoriaId === piCategoriaId && i.estado === "activo");
  }, [insumos, piCategoriaId]);

  const agregarInsumoProducto = () => {
    if (!piInsumoId) {
      toast.error("Selecciona un insumo.");
      return;
    }
    if (piCantidad <= 0) {
      toast.error("La cantidad debe ser mayor a 0.");
      return;
    }
    const ins = insumos.find(i => i.id === piInsumoId);
    if (!ins) return;

    if (piEditandoIdx !== null) {
      setPiInsumos(prev => prev.map((p, idx) =>
        idx === piEditandoIdx
          ? { id: ins.id, categoriaId: piCategoriaId, nombre: ins.nombre, cantidad: piCantidad, unidadMedida: piUnidad }
          : p
      ));
      setPiEditandoIdx(null);
    } else {
      const existente = piInsumos.find(p => p.id === piInsumoId);
      if (existente) {
        setPiInsumos(prev => prev.map(p =>
          p.id === piInsumoId
            ? { ...p, cantidad: p.cantidad + piCantidad }
            : p
        ));
        toast.info(`Se sumó la cantidad a "${ins.nombre}"`);
      } else {
        setPiInsumos(prev => [...prev, { id: ins.id, categoriaId: piCategoriaId, nombre: ins.nombre, cantidad: piCantidad, unidadMedida: piUnidad }]);
      }
    }
    setPiInsumoId("");
    setPiCantidad(1);
    setPiUnidad(UNIDADES[0]);
  };

  const editarInsumoProducto = (idx: number) => {
    const item = piInsumos[idx];
    setPiEditandoIdx(idx);
    setPiCategoriaId(item.categoriaId);
    setPiInsumoId(item.id);
    setPiCantidad(item.cantidad);
    setPiUnidad(item.unidadMedida);
  };

  const eliminarInsumoProducto = (idx: number) => {
    setPiInsumos(prev => prev.filter((_, i) => i !== idx));
    if (piEditandoIdx === idx) {
      setPiEditandoIdx(null);
      setPiInsumoId("");
    }
  };

  const handleCrearProducto = () => {
    if (!piNombre.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    if (piStockMaximo <= 0) {
      toast.error("El stock máximo debe ser mayor a 0.");
      return;
    }
    if (piStockMaximo < piStockMinimo) {
      toast.error("El stock máximo no puede ser menor al stock mínimo.");
      return;
    }
    if (piStockActual > piStockMaximo) {
      toast.error("El stock actual no puede ser mayor al stock máximo.");
      return;
    }
    if (piInsumos.length === 0) {
      toast.error("Agrega al menos un insumo.");
      return;
    }
    if (piTiempo !== "" && (!Number.isFinite(Number(piTiempo)) || Number(piTiempo) < 0)) {
      toast.error("El tiempo de preparación debe ser un número de minutos válido.");
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
        // Editar producto insumo: solo actualizar stockMaximo, composicion y descripcion
        const original = insumos.find(i => i.id === editingId);
        if (!original) return;
        setInsumos(prev => prev.map(i =>
          i.id === editingId
            ? {
                ...i,
                stockMaximo: piStockMaximo,
                composicion: piInsumos,
                descripcion: piDescripcion.trim() || undefined,
                tiempoPreparacion: piTiempo === "" ? undefined : Number(piTiempo),
              }
            : i
        ));
        toast.success(`Producto Insumo "${original.nombre}" actualizado`);
        setShowProductoModal(false);
        setEditandoProducto(false);
        setPiNombre("");
        setPiDescripcion("");
        setPiTiempo("");
        setPiInsumos([]);
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
          stockMaximo: piStockMaximo,
          categoriaId: "-",
          estado: "activo",
          composicion: piInsumos,
          descripcion: piDescripcion.trim() || undefined,
          tiempoPreparacion: piTiempo === "" ? undefined : Number(piTiempo),
        };
        setInsumos(prev => [nuevo, ...prev]);
        toast.success(`Producto Insumo "${piNombre}" creado`);
        setShowProductoModal(false);
        setPiNombre("");
        setPiDescripcion("");
        setPiTiempo("");
        setPiInsumos([]);
      }
    } else if (confirmState.tipo === "cancelar-producto") {
      setShowProductoModal(false);
      setEditandoProducto(false);
      setPiNombre("");
      setPiDescripcion("");
      setPiTiempo("");
      setPiInsumos([]);
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

  // ─────────────────────────── Render ───────────────────────────
  return (
    <div className="px-6 pt-5 pb-4 max-w-6xl mx-auto h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5 shrink-0">
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
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: "8%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
            <tr>
              {["ID", "CATEGORÍA", "NOMBRE", "UNIDAD", "STOCK ACTUAL", "STOCK MÍN.", "STOCK MÁX.", "COSTO UNIT.", "ESTADO", "ACCIONES"].map(h => (
                <th key={h} className="px-3 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-14 text-center text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No hay resultados</p>
                </td>
              </tr>
            ) : paged.map(insumo => {
              const esProductoInsumo = insumo.tipo === "ProductoInsumo";
              const stockBajo = insumo.estado === "activo" && esStockBajo(insumo);
              const excede = insumo.estado === "activo" && excedeMaximo(insumo);
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
                      {excede && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 whitespace-nowrap">
                          Excede máx.
                        </span>
                      )}
                      {!stockBajo && !excede && insumo.estado === "activo" && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 whitespace-nowrap">
                          OK
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-sm font-mono text-muted-foreground">{insumo.stockMinimo}</td>
                  <td className="px-3 py-3.5 text-sm font-mono text-muted-foreground">{insumo.stockMaximo}</td>
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
                    <ActionIcons
                      onView={() => { setDetalleItem(insumo); setShowDetalleModal(true); }}
                      onEdit={() => openEdit(insumo)}
                      editDisabled={inactivo}
                      editTitle={inactivo ? "Activa el insumo para editarlo" : "Editar"}
                      onDelete={() => setConfirmState({ tipo: "eliminar", mensaje: "", id: insumo.id })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-center mt-4">
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
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
                  <p className="text-xs text-muted-foreground mt-1">Solo se puede modificar el stock máximo.</p>
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
                <div className="grid grid-cols-2 gap-3">
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
                {/* Punto 10: el Stock Actual solo se pide al EDITAR (al crear
                    el stock se carga después de dar de alta el insumo). */}
                <div className="grid grid-cols-2 gap-3">
                  {editingId && (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Stock Actual</label>
                      <input
                        type="number"
                        min={0}
                        value={stockActual}
                        onChange={e => setStockActual(Number(e.target.value))}
                        disabled={!!editingId}
                        className={`w-full px-3 py-2.5 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                          editingId ? "bg-muted/50 dark:bg-muted/30 text-muted-foreground cursor-not-allowed" : "bg-muted dark:bg-input"
                        }`}
                      />
                    </div>
                  )}
                  {/* En creación toma las dos columnas: no está el Stock Actual. */}
                  <div className={editingId ? "" : "col-span-2"}>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Stock Mínimo *</label>
                    <input
                      type="number"
                      min={0}
                      value={stockMinimo}
                      onChange={e => setStockMinimo(Number(e.target.value))}
                      disabled={!!editingId}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none ${
                        editingId
                          ? "bg-muted/50 dark:bg-muted/30 text-muted-foreground cursor-not-allowed"
                          : "bg-muted dark:bg-input text-foreground focus:ring-2 focus:ring-primary/30"
                      }`}
                    />
                    {!editingId && stockMinimo > stockMaximo && stockMaximo > 0 && (
                      <p className="text-xs text-red-500 mt-1">No puede ser mayor al stock máximo.</p>
                    )}
                  </div>
                </div>
                {/* Punto 10: Stock Máximo y Costo Unitario también se quitan
                    de la CREACIÓN; en la EDICIÓN siguen igual (el máximo es
                    el único campo editable del formulario). */}
                {editingId && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Stock Máximo *</label>
                    <input
                      type="number"
                      min={1}
                      value={stockMaximo}
                      onChange={e => setStockMaximo(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-muted dark:bg-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {stockActual > stockMaximo && stockMaximo > 0 && (
                      <p className="text-xs text-red-500 mt-1">El stock actual no puede ser mayor al stock máximo.</p>
                    )}
                  </div>
                )}
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

      {/* ─────────────────────────── Modal Crear Producto Insumo ─────────────────────────── */}
      <AnimatePresence>
        {showProductoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-card rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl border border-border flex flex-col"
            >
              <div className="px-6 py-4 border-b border-border shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
                    {editandoProducto ? "Editar Producto Insumo" : "Crear Producto Insumo"}
                  </h3>
                  <button onClick={() => setShowProductoModal(false)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {editandoProducto && (
                  <p className="text-xs text-muted-foreground mt-1">Solo se pueden modificar el stock máximo, los insumos que lo componen y la descripción.</p>
                )}
              </div>
              <div className="px-6 py-5 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nombre del Producto Insumo *</label>
                  <input
                    value={piNombre}
                    onChange={e => setPiNombre(e.target.value)}
                    placeholder="Ej: Salsa de tomate preparada"
                    disabled={editandoProducto}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none ${
                      editandoProducto
                        ? "bg-muted/50 dark:bg-muted/30 text-muted-foreground cursor-not-allowed"
                        : "bg-muted dark:bg-input text-foreground focus:ring-2 focus:ring-primary/30"
                    }`}
                  />
                </div>

                {/* Cantidad, Stock Mínimo, Stock Máximo, Unidad */}
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Cantidad (stock actual) *</label>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={piStockActual}
                      onChange={e => setPiStockActual(Number(e.target.value))}
                      disabled={editandoProducto}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none ${
                        editandoProducto
                          ? "bg-muted/50 dark:bg-muted/30 text-muted-foreground cursor-not-allowed"
                          : "bg-muted dark:bg-input text-foreground focus:ring-2 focus:ring-primary/30"
                      }`}
                    />
                    {!editandoProducto && piStockActual > piStockMaximo && piStockMaximo > 0 && (
                      <p className="text-xs text-red-500 mt-1">No puede ser mayor al stock máximo.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Stock Mínimo *</label>
                    <input
                      type="number"
                      min={0}
                      value={piStockMinimo}
                      onChange={e => setPiStockMinimo(Number(e.target.value))}
                      disabled={editandoProducto}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none ${
                        editandoProducto
                          ? "bg-muted/50 dark:bg-muted/30 text-muted-foreground cursor-not-allowed"
                          : "bg-muted dark:bg-input text-foreground focus:ring-2 focus:ring-primary/30"
                      }`}
                    />
                    {!editandoProducto && piStockMinimo > piStockMaximo && piStockMaximo > 0 && (
                      <p className="text-xs text-red-500 mt-1">No puede ser mayor al stock máximo.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Stock Máximo *</label>
                    <input
                      type="number"
                      min={1}
                      value={piStockMaximo}
                      onChange={e => setPiStockMaximo(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-muted dark:bg-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {editandoProducto && piStockActual > piStockMaximo && piStockMaximo > 0 && (
                      <p className="text-xs text-red-500 mt-1">El stock actual no puede ser mayor al stock máximo.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Unidad de Medida</label>
                    <select
                      value={piUnidadMedida}
                      onChange={e => setPiUnidadMedida(e.target.value)}
                      disabled={editandoProducto}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none ${
                        editandoProducto
                          ? "bg-muted/50 dark:bg-muted/30 text-muted-foreground cursor-not-allowed"
                          : "bg-muted dark:bg-input text-foreground cursor-pointer"
                      }`}
                    >
                      {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                {/* Bloque de agregar insumo - siempre visible */}
                <div className="p-4 bg-muted/40 dark:bg-muted/20 border border-border rounded-xl">
                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Categoría de Insumo</label>
                      <select
                        value={piCategoriaId}
                        onChange={e => { setPiCategoriaId(e.target.value); setPiInsumoId(""); }}
                        className="w-full px-3 py-2 bg-muted dark:bg-input rounded-xl text-sm text-foreground focus:outline-none cursor-pointer"
                      >
                        {CATEGORIAS_INSUMO.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nombre del Insumo</label>
                      <select
                        value={piInsumoId}
                        onChange={e => setPiInsumoId(e.target.value)}
                        className="w-full px-3 py-2 bg-muted dark:bg-input rounded-xl text-sm text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="">Seleccionar...</option>
                        {insumosFiltradosPorCategoria.map(i => (
                          <option key={i.id} value={i.id}>{i.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Cantidad</label>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={piCantidad}
                        onChange={e => setPiCantidad(Number(e.target.value))}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-muted dark:bg-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Unidad de Medida</label>
                      <select
                        value={piUnidad}
                        onChange={e => setPiUnidad(e.target.value)}
                        className="w-full px-3 py-2 bg-muted dark:bg-input rounded-xl text-sm text-foreground focus:outline-none cursor-pointer"
                      >
                        {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={agregarInsumoProducto}
                        className="w-full py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all"
                      >
                        {piEditandoIdx !== null ? "Actualizar" : "Agregar"}
                      </button>
                    </div>
                  </div>

                  {/* Lista de insumos agregados */}
                  {piInsumos.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {piInsumos.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 dark:bg-muted/20 border border-border rounded-xl">
                          <div>
                            <div className="text-sm font-semibold text-foreground">{item.nombre}</div>
                            <div className="text-xs text-muted-foreground">{categoriaNombre(item.categoriaId)} · {item.cantidad} {item.unidadMedida}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => editarInsumoProducto(idx)}
                              title="Editar"
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => eliminarInsumoProducto(idx)}
                              title="Eliminar"
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-muted-foreground hover:text-red-500 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Descripción de la preparación</label>
                  <textarea
                    value={piDescripcion}
                    onChange={e => setPiDescripcion(e.target.value)}
                    placeholder="Describe cómo se prepara este producto insumo..."
                    rows={3}
                    className="w-full px-3 py-2.5 bg-muted dark:bg-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                {/* Tiempo de preparación: lo consume la Orden de Producción
                    ("Preparación en lote") para calcular el tiempo estimado. */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Tiempo de preparación (min) <span className="text-muted-foreground/60">(opcional)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={piTiempo}
                    onChange={e => setPiTiempo(e.target.value)}
                    placeholder="Sin tiempo definido"
                    className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
                <button
                  onClick={handleCancelarProducto}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrearProducto}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all inline-flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {editandoProducto ? "Guardar cambios" : "Crear"}
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
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Descripción de la preparación</label>
                          {d.descripcion ? (
                            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{d.descripcion}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Sin descripción</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Tiempo de preparación</label>
                          <p className="text-sm text-foreground">
                            {d.tiempoPreparacion ? `${d.tiempoPreparacion} min` : <span className="text-muted-foreground italic">Sin tiempo definido</span>}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad</label>
                            <p className="text-sm font-mono font-bold text-foreground">{d.stockActual} {d.unidadMedida}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Unidad</label>
                            <p className="text-sm text-foreground">{d.unidadMedida}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Stock Mínimo</label>
                            <p className="text-sm font-mono text-muted-foreground">{d.stockMinimo}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Stock Máximo</label>
                            <p className="text-sm font-mono text-muted-foreground">{d.stockMaximo}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                            <p className={`text-sm font-mono font-bold ${d.estado === "activo" ? "text-emerald-600" : "text-gray-500"}`}>
                              {d.estado === "activo" ? "Activo" : "Inactivo"}
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Insumos</label>
                          <div className="space-y-1">
                            {d.composicion?.map((ins, idx) => (
                              <div key={idx} className="text-sm text-foreground">
                                {ins.nombre} · {ins.cantidad} {ins.unidadMedida}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
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
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Unidad</label>
                            <p className="text-sm text-foreground">{d.unidadMedida}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Stock Actual</label>
                            <p className="text-sm font-mono font-bold text-foreground">{d.stockActual}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Stock Mínimo</label>
                            <p className="text-sm font-mono text-muted-foreground">{d.stockMinimo}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Stock Máximo</label>
                            <p className="text-sm font-mono text-muted-foreground">{d.stockMaximo}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Costo Unitario</label>
                            <p className="text-sm font-mono font-bold text-foreground">{fmtCOP(d.costoUnitario)}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Precio Unitario</label>
                            <p className="text-sm font-mono font-bold text-foreground">{d.precioUnitario !== null ? fmtCOP(d.precioUnitario) : "-"}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">IVA</label>
                            <p className="text-sm font-mono font-bold text-foreground">{d.iva !== null ? `${d.iva}%` : "-"}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                            <p className="text-sm font-mono font-bold text-foreground">{d.estado === "activo" ? "Activo" : "Inactivo"}</p>
                          </div>
                        </div>
                      </>
                    );
                  }
                })()}
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border">
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
