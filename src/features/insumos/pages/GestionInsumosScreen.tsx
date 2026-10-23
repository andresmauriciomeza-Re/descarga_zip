import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Check, Package, AlertTriangle, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { UnidadSelect } from "@/features/compras/components/UnidadSelect";
import { UNIDADES_INSUMO } from "@/shared/utils/unidades";
import { BotonDescargarExcel } from "@/shared/components/BotonDescargarExcel";
import { exportarExcelEstilizado } from "@/shared/utils/exportExcelEstilizado";
import { limpiarNumeroInput, numeroDeInput } from "@/shared/utils/numeroInput";
// Bloque 3: limpieza y comparación de nombres compartidas con Gestión de
// Productos y el "+ Crear insumo" de Compras (una sola copia de las reglas).
import { mismoNombre, nombreLimpio, nombreParaGuardar, normalizarTexto } from "@/shared/utils/nombres";
import {
  EstadoSelect,
  ESTADO_ACTIVO_COLOR,
  ESTADO_INACTIVO_COLOR,
} from "@/shared/components/EstadoSelect";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginador";
import { ActionIcons } from "@/shared/components/ActionIcons";
import { SegmentadoButtons } from "@/shared/components/SegmentadoButtons";
import { FichaTecnicaDetalle, FichaTecnicaEditor } from "@/shared/components/FichaTecnicaEditor";
import {
  copiarFicha,
  emptyFichaVersion,
  fichaDesdeLegacyInsumo,
  fichaTieneCambios,
  idInsumoApiDesdeFront,
  numeroNuevoFicha,
  siguienteNumeroFicha,
  type FichaVersion,
  type FichasPorProducto,
} from "@/shared/utils/fichas";
import {
  actualizarInsumo,
  cambiarEstadoInsumo,
  crearInsumo,
  eliminarInsumo,
  mensajeErrorInsumos,
} from "@/features/insumos/services/insumosApi";
import { crearFicha, mapearFichaApi, obtenerFichasDe, payloadFicha } from "@/features/productos/services/fichasApi";
import {
  convertirUnidad,
  faltantesPara,
  fmtCant,
  motivoFaltante,
  requeridosPorUnidad,
  unidadesCompatibles,
  type FaltanteUnidad,
  type RequeridoUnidad,
} from "@/shared/utils/disponibilidad";

const SERIF = "var(--font-titulo)";
const PER_PAGE = 5;

/** Estilo de los inputs del modal (comparte lenguaje visual con
    FichaTecnicaEditor, cuya clase por defecto es casi idéntica). */
const ICLS_MODAL =
  "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

// ─────────────────────────── Categorías ───────────────────────────
export interface CategoriaInsumo {
  id: string;
  nombre: string;
  /** Solo lo traen las categorías de la API: `false` = categoría inactiva (no
      aparece en los selectores, pero sí en los listados). */
  estado?: boolean;
}

/** Catálogo local de categorías (fase 1). Sigue aquí por si se abre la
    pantalla sin API, pero desde la fase 2 las categorías vienen de
    GET /categorias-insumos y llegan por props. */
export const CATEGORIAS_INSUMO: CategoriaInsumo[] = [
  { id: "CINS-001", nombre: "Lácteos" },
  { id: "CINS-002", nombre: "Carnes y Embutidos" },
  { id: "CINS-003", nombre: "Vegetales y Hierbas" },
  { id: "CINS-004", nombre: "Harinas y Masas" },
  { id: "CINS-005", nombre: "Salsas y Condimentos" },
];

/** Nombre de la categoría con el catálogo que se pasa por props (API). */
export const categoriaNombreEn = (categorias: CategoriaInsumo[], id: string): string =>
  categorias.find(c => c.id === id)?.nombre ?? "";

/** Categoría lista para mostrar: el nombre solo si el id EXISTE en el
    catálogo; "-" para ids inválidos (los Productos Insumo viejos traen
    "-", u otros ajenos como "CAT-001" de Pizzas). */
export const categoriaDeEn = (categorias: CategoriaInsumo[], id: string): string =>
  categorias.some(c => c.id === id) ? categoriaNombreEn(categorias, id) : "-";

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

/** ¿Este Producto Insumo tiene ficha vigente? Las fichas viven en App
    (prop de este componente), no en el módulo. */
const fichaVigente = (fichas: FichasPorProducto, insumo: Insumo): boolean =>
  (fichas[insumo.id] ?? []).some((v) => !v.fechaFin);

// ─────────────────────────── Helpers ───────────────────────────
const fmtCOP = (n: number): string =>
  `$${n.toLocaleString("es-CO")}`;

/** A5.5 — Cómo está el stock de un insumo: "sin-stock" (0 o menos),
    "bajo" (mayor a 0 y hasta el stock mínimo) u "ok". El listado pinta el
    badge según esto: "Sin stock" en ROJO, "Stock bajo" en ÁMBAR; el aviso
    del listado y su filtro cuentan los dos primeros. */
const estadoStock = (insumo: Insumo): "sin-stock" | "bajo" | "ok" =>
  insumo.stockActual <= 0
    ? "sin-stock"
    : insumo.stockActual <= insumo.stockMinimo
      ? "bajo"
      : "ok";

const formatearId = (id: string): string => {
  const match = id.match(/(\d+)$/);
  return match ? match[1] : id;
};

// ─── Producto Insumo: limpieza de nombres ───────────────────────────────────
// Bloque 3: `nombreLimpio`, `nombreParaGuardar` (mayúscula inicial, sólo al
// CREAR: los insumos existentes conservan su nombre tal cual) y las claves de
// comparación `normalizarTexto` / `mismoNombre` (sin tildes ni mayúsculas,
// para que "Salsa  de TOMATE" y "salsa de tomate" cuenten como el mismo
// nombre) ahora viven compartidos en `shared/utils/nombres`, junto al
// "+ Crear insumo" de Compras. Antes esta pantalla tenía su propia copia.

/**
 * Diálogo de confirmación del módulo. Se extrajo del JSX inline que usaban
 * "Crear", "Cancelar" y activar/inactivar para que el flujo de eliminar
 * reutilice exactamente el mismo estilo (fondo del tema, rounded-2xl y dos
 * botones del mismo ancho). `titulo` e `icono` son opcionales: los flujos
 * preexistentes se pintan igual que siempre. Con `soloConfirmar` se pinta un
 * ÚNICO botón (diálogo informativo, p. ej. "no se puede eliminar");
 * `cerrarConEscYOverlay` / `enfocarCancelar` solo se activan en los diálogos
 * de eliminar para no alterar el comportamiento de los demás flujos.
 */
function ConfirmDialog({
  mensaje,
  titulo,
  icono,
  textoConfirmar = "Confirmar",
  soloConfirmar = false,
  cerrarConEscYOverlay = false,
  enfocarCancelar = false,
  onConfirmar,
  onCancelar,
}: {
  mensaje: React.ReactNode;
  titulo?: string;
  icono?: React.ReactNode;
  textoConfirmar?: string;
  /** true = un solo botón (el informativo), sin "Cancelar". */
  soloConfirmar?: boolean;
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

  // Foco inicial en el único botón (informativo) o en Cancelar: Enter nunca
  // elimina por accidente.
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
        <div className="flex gap-3">
          {!soloConfirmar && (
            <button
              ref={cancelRef}
              onClick={onCancelar}
              className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            ref={soloConfirmar ? cancelRef : undefined}
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
  /** Categorías de insumos desde la API (GET /categorias-insumos). En los
      selectores solo entran las activas; en los listados se muestran todas. */
  categorias: CategoriaInsumo[];
  /** Estado de la carga inicial y su error: "Reintentar" vuelve a llamar a la
      API, nunca a datos de ejemplo. */
  cargando?: boolean;
  errorCarga?: string | null;
  onReintentar?: () => void;
  /** Fichas técnicas única por id de registro (PROD-### / PIN-###). */
  fichas: FichasPorProducto;
  setFichas: React.Dispatch<React.SetStateAction<FichasPorProducto>>;
  /** IDs de registros que pueden tener ficha (productos del menú y Productos
      Insumo): con ellos se numera la siguiente ficha sin huecos. */
  idsConFicha: string[];
  /** Productos del menú (solo id y nombre), para nombrarlos en el diálogo de
      "no se puede eliminar" cuando su ficha vigente usa un registro. */
  productosMenu?: { id: string; nombre: string }[];
  /** Navega a Orden de Producción con el modal ya abierto y este producto
      preseleccionado. */
  abrirOrdenProduccion?: (idProductoInsumo: string) => void;
  /** Recarga insumos, fichas y órdenes desde la API después de una acción que
      movió stock o creó registros (crear producto insumo, cambiar estado…). */
  recargarProduccion?: () => Promise<void>;
  /** "Ver orden" del toast: navega a Orden de Producción con el detalle de
      esa orden ya abierto. */
  verOrdenProduccion?: (idOrden: string) => void;
}

export function GestionInsumosScreen({ insumos, setInsumos, categorias, cargando, errorCarga, onReintentar, fichas, setFichas, idsConFicha, productosMenu = [], abrirOrdenProduccion, recargarProduccion, verOrdenProduccion }: Props) {
  // Categorías con las que trabajan el buscador y los selectores: las de la
  // API (por props) o, si la pantalla se abre sin API, el catálogo local.
  const cats = categorias.length > 0 ? categorias : CATEGORIAS_INSUMO;
  const categoriaNombre = (id: string) => categoriaNombreEn(cats, id);
  const categoriaDe = (id: string) => categoriaDeEn(cats, id);
  /** Solo las categorías activas entran en los selectores. */
  const categoriasActivas = cats.filter((c) => c.estado !== false);
  /** id_insumo de la API de una fila de ficha que no trae `insumoId` (fichas
      viejas): resuelve por nombre normalizado contra el catálogo. */
  const idInsumoDeNombre = (nombreFila: string): number | null => {
    const clave = normalizarTexto(nombreFila);
    const ins = insumos.find((i) => normalizarTexto(i.nombre) === clave);
    return ins ? idInsumoApiDesdeFront(ins.id) : null;
  };
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [detalleItem, setDetalleItem] = useState<Insumo | ProductoInsumo | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "activos" | "inactivos">("todos");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "insumos" | "productos">("todos");
  // A5.5 — Aviso de stock bajo: al apretar el aviso el listado queda
  // mostrando SOLO esos insumos; el segundo clic lo apaga (el aviso se
  // mantiene visible mientras el filtro esté activo, para poder salir).
  const [filtroStockBajo, setFiltroStockBajo] = useState(false);
  /** true = el registro en edición es un Producto Insumo (el tipo del
      formulario queda bloqueado y solo se modifica la ficha técnica). */
  const [editandoProducto, setEditandoProducto] = useState(false);

  // Tipo del formulario del modal: "Insumo" o "Producto insumo".
  const [tipoForm, setTipoForm] = useState<"insumo" | "producto-insumo">("insumo");

  // Form state - compartidos por los dos tipos del modal. La categoría
  // arranca VACÍA y es obligatoria (A5.1): antes venía "Lácteos" ya elegida
  // y se guardaba sin que nadie la eligiera.
  const [nombre, setNombre] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [stockMinimo, setStockMinimo] = useState(0);

  // Form state - solo Insumo
  const [unidad, setUnidad] = useState(UNIDADES_INSUMO[0].valor);
  const [stockActual, setStockActual] = useState(0);
  const [costoUnitario, setCostoUnitario] = useState(0);

  // Form state - solo Producto Insumo. La ficha técnica única (la comparte
  // con Producción > Productos y con Orden de Producción) es donde vive todo
  // lo editable del PI: tiempo, cantidad a hacer e insumos. La unidad de la
  // ficha es la unidadMedida del registro.
  const [piFicha, setPiFicha] = useState<FichaVersion>(emptyFichaVersion(1));
  const [piUnidadMedida, setPiUnidadMedida] = useState("");

  // Validación en tiempo real: qué campos ya tocó el operador y si ya intentó
  // guardar. Los mensajes se muestran al tocar o al intentar guardar, nunca
  // al abrir el modal con todo vacío.
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  // Confirmación
  const [confirmState, setConfirmState] = useState<{
    tipo: "crear-producto" | "cancelar-producto" | "cambiar-estado" | "eliminar" | "no-eliminar" | null;
    mensaje: string;
    id?: string;
    nuevoEstado?: "activo" | "inactivo";
    /** Nombres de los registros (productos del menú o productos insumo) cuya
        ficha VIGENTE usa al registro: solo en el diálogo "no-eliminar". */
    usadosEn?: string[];
  }>({ tipo: null, mensaje: "" });
  /** "Guardando…" mientras habla la API: bloquea el doble clic. */
  const [guardando, setGuardando] = useState(false);

  // Alerta de stock bajo al cargar (A5.5): solo activos, contando los que
  // están en 0 ("Sin stock") y los que llegaron al mínimo ("Stock bajo").
  useEffect(() => {
    const bajos = insumos.filter(i => i.estado === "activo" && estadoStock(i) !== "ok");
    if (bajos.length > 0) {
      const nombres = bajos.map(b => b.nombre).join(", ");
      toast.warning(
        bajos.length === 1
          ? `1 insumo con stock bajo: ${nombres}`
          : `${bajos.length} insumos con stock bajo: ${nombres}`,
        { duration: 2000, icon: <AlertTriangle className="w-4 h-4" /> }
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
    // A5.5: filtro del aviso de stock bajo (solo activos, igual que el aviso).
    if (filtroStockBajo)
      result = result.filter(i => i.estado === "activo" && estadoStock(i) !== "ok");
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
  }, [insumos, search, filtroEstado, filtroTipo, filtroStockBajo]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  /** A5.5 — Insumos activos que hoy están en "Sin stock" o "Stock bajo":
      los que cuentan el aviso del listado y los que muestra su filtro. */
  const insumosStockBajo = useMemo(
    () => insumos.filter(i => i.estado === "activo" && estadoStock(i) !== "ok"),
    [insumos],
  );

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
        { header: "Categoría", valor: (i) => categoriaDe(i.categoriaId) },
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

  // ─────────────────────────── Validación en tiempo real ───────────────────
  /** ¿Existe ya un insumo o producto insumo con este nombre? Compara con el
      nombre LIMPIO (sin dobles espacios) y sin mayúsculas ni tildes, y
      excluye el registro que se está editando. No usa `resolverInsumo` porque
      ese solo hace trim y no detecta "Salsa  de tomate" como duplicado. */
  const nombreDuplicado = (limpio: string): boolean => {
    const clave = normalizarTexto(limpio);
    if (!clave) return false;
    return insumos.some(
      i => i.id !== editingId && normalizarTexto(i.nombre) === clave,
    );
  };

  /** Errores del formulario del modal, recalculados en cada cambio. */
  const errores = useMemo(() => {
    const e: {
      nombre?: string;
      categoria?: string;
      stockMinimo?: string;
      tiempo?: string;
      cantidad?: string;
      unidad?: string;
      insumos?: string;
      filas?: string;
    } = {};
    const limpio = nombreLimpio(nombre);
    if (!limpio) e.nombre = "El nombre es obligatorio.";
    else if (nombreDuplicado(limpio))
      e.nombre = "Ya existe un insumo con ese nombre";
    // A5.1: la categoría arranca vacía y hay que elegirla. En edición el
    // campo viene bloqueado con la categoría del registro, así que nunca
    // queda vacío ahí.
    if (!categoriaId) e.categoria = "Selecciona una categoría.";
    if (!Number.isFinite(stockMinimo) || stockMinimo < 0)
      e.stockMinimo = "El stock mínimo no puede ser negativo.";
    if (tipoForm === "producto-insumo") {
      if (!(piFicha.tiempoPreparacion > 0))
        e.tiempo = "El tiempo de preparación debe ser mayor a 0.";
      if (!(piFicha.rendimiento && piFicha.rendimiento > 0))
        e.cantidad = "La cantidad a hacer debe ser mayor a 0.";
      if (!piUnidadMedida) e.unidad = "Selecciona una unidad de medida.";
      if (!piFicha.insumos.some(r => r.cantidad > 0))
        e.insumos = "Agrega al menos un insumo con cantidad mayor a 0.";
      // A5.4: ninguna fila puede quedar en 0 (o vacía o negativa). El
      // mensaje se pinta FILA POR FILA (`erroresFilaPI`); aquí solo se
      // bloquea el guardado.
      if (piFicha.insumos.some(r => !(r.cantidad > 0)))
        e.filas = "Hay filas con cantidad 0.";
    }
    return e;
  }, [nombre, categoriaId, editingId, stockMinimo, tipoForm, piFicha, piUnidadMedida, insumos]);

  /** Marca un campo como tocado (habilita su mensaje de error en vivo). */
  const tocar = (campo: string) =>
    setTocado(t => (t[campo] ? t : { ...t, [campo]: true }));

  /** Mensaje a mostrar bajo un campo: solo si ya se tocó o se intentó
      guardar; nunca al abrir el modal con todo vacío. */
  const errorDe = (campo: string, msg?: string): string | undefined =>
    intentoGuardar || tocado[campo] ? msg : undefined;

  /** Cambia el borrador de la ficha del PI y marca como tocados SOLO los
      campos que realmente cambiaron: así, al agregar un insumo no aparece el
      error del tiempo, y viceversa. */
  const cambiarFichaPI = (sig: FichaVersion) => {
    setTocado(t => ({
      ...t,
      tiempo: t.tiempo || sig.tiempoPreparacion !== piFicha.tiempoPreparacion,
      cantidad: t.cantidad || (sig.rendimiento ?? 0) !== (piFicha.rendimiento ?? 0),
      insumos:
        t.insumos ||
        JSON.stringify(sig.insumos) !== JSON.stringify(piFicha.insumos),
    }));
    setPiFicha(sig);
  };

  // ───────── Validación de stock al CREAR un Producto Insumo (A1) ─────────
  /** Mientras se arma la ficha de un Producto Insumo NUEVO, cada insumo de
      "Insumos a usar" se compara contra el stock del catálogo para la
      "Cantidad a hacer" completa. Es el MISMO cálculo compartido que usan
      Productos y Orden de Producción (`requeridosPorUnidad` + `faltantesPara`):
      cantidad × lo que pide la ficha ÷ rendimiento, con cada fila convertida
      a la unidad del catálogo con `convertirUnidad`. Si la ficha repite un
      insumo, sus filas se SUMAN antes de comparar (A1.5).
      Solo aplica al CREAR: al editar un producto insumo existente no se
      valida contra stock ni se crea orden —allí solo nace la versión nueva
      de siempre—, porque el producto ya existe y su producción se programa
      desde "Programar producción". */
  const validacionStockPI = useMemo(() => {
    const vacio = {
      faltantes: [] as FaltanteUnidad[],
      porFila: {} as Record<number, string>,
      aviso: "",
    };
    if (tipoForm !== "producto-insumo" || editandoProducto) return vacio;
    const veces = piFicha.rendimiento && piFicha.rendimiento > 0 ? piFicha.rendimiento : 0;
    // Sin "Cantidad a hacer" manda el error clásico ("debe ser mayor a 0"),
    // no el de faltantes.
    if (!(veces > 0)) return vacio;

    // Requeridos de UNA unidad × la "Cantidad a hacer": la misma fórmula con
    // la que la orden va a descontar los insumos al iniciarse.
    const requeridos = requeridosPorUnidad(piFicha).map((r) => ({
      ...r,
      cantidad: (r.cantidad || 0) * veces,
    }));

    // Agrupa por insumo del catálogo, medido en SU unidad de medida, para
    // que un insumo repetido en la ficha se compare por la suma de sus filas.
    const grupo = new Map<string, RequeridoUnidad>();
    const sueltos: RequeridoUnidad[] = [];
    for (const r of requeridos) {
      if (!(r.cantidad > 0)) continue;
      const ins = insumos.find((i) => i.id === r.insumoId)
        ?? insumos.find((i) => mismoNombre(i.nombre, r.nombre));
      // Inexistente, inactivo o unidades que no se pueden convertir: la fila
      // pasa tal cual para que `faltantesPara` avise con su motivo claro.
      const cantidadEnCatalogo = ins
        && ins.estado !== "inactivo"
        && unidadesCompatibles(r.unidad, ins.unidadMedida)
        ? convertirUnidad(r.cantidad, r.unidad, ins.unidadMedida)
        : null;
      if (!ins || cantidadEnCatalogo === null) {
        sueltos.push(r);
        continue;
      }
      const previo = grupo.get(ins.id);
      grupo.set(ins.id, previo
        ? { ...previo, cantidad: previo.cantidad + cantidadEnCatalogo }
        : { insumoId: ins.id, nombre: r.nombre, cantidad: cantidadEnCatalogo, unidad: ins.unidadMedida });
    }

    const faltantes = faltantesPara([...grupo.values(), ...sueltos], 1, insumos);
    if (faltantes.length === 0) return vacio;

    // Mensaje por FILA de "Insumos a usar": a cada fila se le busca su
    // faltante con el mismo criterio con que `faltantesPara` resuelve (id
    // real y, si no, nombre normalizado). Si el mismo insumo tiene un faltante
    // con motivo (unidad incompatible, inactivo) manda ese.
    const porFila: Record<number, string> = {};
    piFicha.insumos.forEach((fila, idx) => {
      if (!(fila.cantidad > 0)) return;
      const r = requeridos[idx];
      if (!r) return;
      const ins = insumos.find((i) => i.id === r.insumoId)
        ?? insumos.find((i) => mismoNombre(i.nombre, r.nombre));
      const clave = ins?.id ?? r.insumoId;
      const f = faltantes.find((x) => x.insumoId === clave && x.motivo)
        ?? faltantes.find((x) => x.insumoId === clave);
      if (!f) return;
      porFila[idx] = f.motivo
        ? motivoFaltante(f)
        : `No tiene la cantidad para hacer ese producto insumo. Hay ${fmtCant(f.stock, f.unidad)}.`;
    });

    const nombrePI = nombreLimpio(nombre) || "este producto insumo";
    return {
      faltantes,
      porFila,
      aviso: `No hay la cantidad suficiente de insumos. Por favor, disminuye la cantidad de ${nombrePI}.`,
    };
  }, [tipoForm, editandoProducto, piFicha, insumos, nombre]);

  /** A5.4 + A1 — Mensajes por FILA de la ficha del Producto Insumo: una fila
      con cantidad 0 (o vacía o negativa) no puede guardarse, y las filas que
      no alcanzan en stock conservan su mensaje de A1. En edición de un
      producto insumo existente también aplica la regla de cantidad > 0 (es
      calidad de dato, no validación de stock). Las fichas de pizzas/lasañas
      no pasan por aquí: el modo "producto" ignora estos mensajes. */
  const erroresFilaPI = useMemo(() => {
    if (tipoForm !== "producto-insumo") return {};
    const cantidades: Record<number, string> = {};
    piFicha.insumos.forEach((fila, idx) => {
      if (!(fila.cantidad > 0)) cantidades[idx] = "La cantidad debe ser mayor a 0.";
    });
    return { ...validacionStockPI.porFila, ...cantidades };
  }, [tipoForm, piFicha, validacionStockPI]);

  /** Escribe el nombre sin saltos de línea (tampoco al pegar texto). */
  const escribirNombre = (valor: string) => {
    setNombre(valor.replace(/[\r\n]+/g, " "));
    tocar("nombre");
  };

  // ─────────────────────────── Insumo CRUD (API) ───────────────────────────
  /** Limpia por completo el formulario del modal (al abrir en blanco, al
      guardar y al cancelar el flujo del Producto Insumo). */
  const limpiarFormulario = () => {
    setEditingId(null);
    setEditandoProducto(false);
    setTipoForm("insumo");
    setNombre("");
    setCategoriaId("");
    setStockMinimo(0);
    setUnidad(UNIDADES_INSUMO[0].valor);
    setStockActual(0);
    setCostoUnitario(0);
    setPiFicha(emptyFichaVersion(1));
    setPiUnidadMedida("");
    setTocado({});
    setIntentoGuardar(false);
  };

  const openCreate = () => {
    limpiarFormulario();
    setShowModal(true);
  };

  const openEdit = (insumo: Insumo) => {
    if (insumo.estado === "inactivo") {
      toast.error("Activa el insumo para editarlo.");
      return;
    }
    limpiarFormulario();
    setEditingId(insumo.id);
    setNombre(insumo.nombre);
    setStockMinimo(insumo.stockMinimo);
    if (insumo.tipo === "ProductoInsumo") {
      // Editar producto insumo: el modal abre con el Tipo bloqueado y solo
      // se modifica la ficha técnica (tiempo, cantidad a hacer e insumos).
      setEditandoProducto(true);
      setTipoForm("producto-insumo");
      // Los registros viejos traen categoriaId "-" (u otra ajena al catálogo
      // de insumos): se muestra la primera categoría. En edición no se guarda.
      setCategoriaId(
        cats.some(c => c.id === insumo.categoriaId)
          ? insumo.categoriaId
          : cats[0].id,
      );
      // La ficha sale de las versiones guardadas (borrador = copia de la
      // última) o, si aún no existe, de los campos legacy del propio insumo.
      const guardadas = (fichas[insumo.id] ?? []).map(copiarFicha);
      const ultima = guardadas[guardadas.length - 1];
      const base = ultima ?? fichaDesdeLegacyInsumo(insumo);
      const borrador: FichaVersion = base
        ? { ...base, destino: { tipo: "producto-insumo", insumoId: insumo.id } }
        : { ...emptyFichaVersion(1), destino: { tipo: "producto-insumo", insumoId: insumo.id } };
      setPiFicha(borrador);
      setPiUnidadMedida(insumo.unidadMedida);
    } else {
      // Editar insumo normal. Los registros viejos pueden traer un
      // categoriaId ajeno al catálogo: en edición solo se MUESTRA (no se
      // guarda), así que se pinta el primero en vez de un vacío.
      setCategoriaId(
        cats.some(c => c.id === insumo.categoriaId)
          ? insumo.categoriaId
          : cats[0].id,
      );
      setUnidad(insumo.unidadMedida);
      setStockActual(insumo.stockActual);
      setCostoUnitario(insumo.costoUnitario);
    }
    setShowModal(true);
  };

  /** Cierra el modal y olvida el formulario. */
  const cerrarModal = () => {
    setShowModal(false);
    limpiarFormulario();
  };

  // Bloque 2.4: el historial de versiones de la ficha se pide a la API al abrir
  // el detalle (el estado solo trae la vigente de GET /fichas/vigentes).
  useEffect(() => {
    if (!detalleItem || detalleItem.tipo !== "ProductoInsumo") return;
    const id = detalleItem.id;
    if (!id || !id.startsWith("INS-")) return;
    let cancelado = false;
    void (async () => {
      try {
        const filas = await obtenerFichasDe({ id_insumo: idInsumoApiDesdeFront(id) });
        const versiones = filas
          .map((f) => mapearFichaApi(f, null))
          .sort((a, b) => a.version - b.version);
        if (cancelado || versiones.length === 0) return;
        setFichas((prev) => ({ ...prev, [id]: versiones }));
      } catch {
        // Sin historial se queda con la vigente del estado.
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [detalleItem]);

  const handleSave = async () => {
    setIntentoGuardar(true);
    // Si hay errores no se guarda: quedan visibles bajo cada campo.
    if (!nombreLimpio(nombre) || !categoriaId || nombreDuplicado(nombreLimpio(nombre)) || !(stockMinimo >= 0)) return;
    if (guardando) return;

    if (editingId) {
      if (costoUnitario < 0) {
        toast.error("El costo unitario no puede ser negativo.");
        return;
      }

      // En edición solo se actualiza el stock mínimo: el stock actual lo
      // mueven Compras (suma) y Producción (resta), nunca este formulario.
      // El costoUnitario y los demás campos conservan su valor original
      // aunque el formulario los envíe modificados (no se confía solo en el
      // disabled del HTML).
      const original = insumos.find(i => i.id === editingId);
      if (!original) return;
      setGuardando(true);
      try {
        const actualizado = await actualizarInsumo(editingId, { stock_minimo: stockMinimo });
        setInsumos(prev => prev.map(i => (i.id === editingId ? actualizado : i)));
        if (estadoStock(actualizado) !== "ok") {
          toast.warning(`Alerta: el stock de ${actualizado.nombre} está bajo (${actualizado.stockActual} ${actualizado.unidadMedida}, mínimo ${actualizado.stockMinimo} ${actualizado.unidadMedida})`, { duration: 2000 });
        } else {
          toast.success(`Insumo "${actualizado.nombre}" actualizado`);
        }
        cerrarModal();
      } catch (error) {
        toast.error(mensajeErrorInsumos(error, "No se pudo actualizar el insumo."));
      } finally {
        setGuardando(false);
      }
      return;
    }

    // Crear insumo normal: el stock nace en 0 (el formulario ya no lo pide) y
    // el registro se arma con la RESPUESTA del servidor.
    setGuardando(true);
    try {
      const creado = await crearInsumo({
        nombre: nombreParaGuardar(nombre),
        tipo: "Insumo",
        id_categoria_insumo: Number(categoriaId),
        unidad_medida: unidad,
        stock_minimo: stockMinimo,
        costo_unitario: costoUnitario,
      });
      setInsumos(prev => [creado.insumo, ...prev]);
      // El stock nace en 0 por diseño, así que solo se avisa si el stock
      // MÍNIMO pedido queda por encima; el aviso permanente es el badge del
      // listado.
      if (creado.insumo.stockActual < creado.insumo.stockMinimo) {
        toast.warning(`Alerta: el stock de ${creado.insumo.nombre} está bajo (${creado.insumo.stockActual} ${creado.insumo.unidadMedida}, mínimo ${creado.insumo.stockMinimo} ${creado.insumo.unidadMedida})`, { duration: 2000 });
      } else {
        toast.success(`Insumo "${creado.insumo.nombre}" creado`);
      }
      cerrarModal();
    } catch (error) {
      // 409 (nombre repetido) o 400: el mensaje del servidor se muestra en el
      // modal y el formulario queda abierto para corregir.
      toast.error(mensajeErrorInsumos(error, "No se pudo crear el insumo."));
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async (id: string) => {
    const reg = insumos.find(i => i.id === id);
    try {
      await eliminarInsumo(id);
    } catch (error) {
      // Con historial el servidor responde 409 ("…tiene historial. Desactívalo.").
      toast.error(mensajeErrorInsumos(error, "No se pudo eliminar el insumo."));
      return;
    }
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
  /** Cambia el tipo del formulario del modal. Conserva el Nombre escrito (y
      la categoría y el stock mínimo, que son comunes a los dos tipos) y
      limpia los campos propios del tipo que se abandona. */
  const cambiarTipo = (siguiente: string) => {
    if (editingId) return; // al editar el tipo queda bloqueado
    const tipo = siguiente as "insumo" | "producto-insumo";
    if (tipo === tipoForm) return;
    if (tipo === "producto-insumo") {
      // Campos propios del insumo normal que no aplican aquí.
      setUnidad(UNIDADES_INSUMO[0].valor);
      setStockActual(0);
      setCostoUnitario(0);
      // La unidad de la ficha arranca vacía: es un campo obligatorio.
      setPiUnidadMedida("");
    } else {
      // Campos propios del producto insumo que no aplican aquí.
      setPiFicha(emptyFichaVersion(1));
      setPiUnidadMedida("");
    }
    setTipoForm(tipo);
    setTocado({});
    setIntentoGuardar(false);
  };

  const handleGuardarProducto = () => {
    setIntentoGuardar(true);
    // Si hay errores no se abre la confirmación: quedan visibles en vivo.
    const e = errores;
    if (e.nombre || e.categoria || e.stockMinimo || e.tiempo || e.cantidad || e.unidad || e.insumos || e.filas) return;
    // A1: mientras falte insumo para la "Cantidad a hacer" no se crea el
    // producto (la orden que se mandaría a Producción quedaría sin sustento).
    // Al EDITAR un producto insumo existente no se valida contra stock.
    if (!editandoProducto && validacionStockPI.faltantes.length > 0) return;
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

  const ejecutarConfirmacion = async () => {
    if (confirmState.tipo === "crear-producto") {
      if (guardando) return;
      if (editandoProducto) {
        if (!editingId) return;
        // Editar producto insumo: la ficha técnica se guarda contra la API
        // como VERSIÓN NUEVA (el servidor responde `sinCambios` si el
        // contenido era el mismo y entonces no hay versión que mostrar).
        const original = insumos.find(i => i.id === editingId);
        if (!original) return;
        setGuardando(true);
        try {
          const fichaNueva = await crearFicha(
            payloadFicha(
              piFicha,
              { id_insumo: idInsumoApiDesdeFront(editingId), unidadMedida: piUnidadMedida },
              (fila) =>
                fila.insumoId?.startsWith("INS-")
                  ? idInsumoApiDesdeFront(fila.insumoId)
                  : idInsumoDeNombre(fila.nombre),
            ),
          );
          setFichas(prev => ({ ...prev, [editingId]: [mapearFichaApi(fichaNueva, null)] }));
          toast.success(
            fichaNueva.sinCambios
              ? `Producto Insumo "${original.nombre}" actualizado (la ficha no cambió)`
              : `Producto Insumo "${original.nombre}" actualizado`,
          );
          cerrarModal();
        } catch (error) {
          toast.error(mensajeErrorInsumos(error, "No se pudo guardar la ficha técnica."));
        } finally {
          setGuardando(false);
        }
      } else {
        // Crear producto insumo: POST /insumos con su ficha y
        // `crear_orden_produccion: true` (el servidor crea la orden
        // "Preparación en lote" con la "Cantidad a hacer"). Un 409 trae los
        // faltantes: se muestran los mensajes ya existentes por fila y bajo
        // "Cantidad a hacer" (la validación en vivo se mantiene) y el modal
        // queda abierto.
        setGuardando(true);
        try {
          const creado = await crearInsumo({
            nombre: nombreParaGuardar(nombre),
            tipo: "Producto insumo",
            id_categoria_insumo: Number(categoriaId),
            unidad_medida: piUnidadMedida,
            stock_minimo: stockMinimo,
            ficha: {
              cantidad: piFicha.rendimiento && piFicha.rendimiento > 0 ? piFicha.rendimiento : 1,
              tiempo_preparacion: piFicha.tiempoPreparacion,
              pasos: piFicha.pasos,
              insumos: piFicha.insumos
                .filter((r) => r.cantidad > 0)
                .map((r) => ({
                  id_insumo: idInsumoDeNombre(r.nombre) ?? (r.insumoId ? idInsumoApiDesdeFront(r.insumoId) : 0),
                  cantidad: r.cantidad,
                  medida: r.unidad,
                })),
            },
            crear_orden_produccion: true,
          });
          setInsumos(prev => [creado.insumo, ...prev]);
          if (creado.ficha) {
            const fichaV1 = creado.ficha;
            setFichas(prev => ({ ...prev, [creado.insumo.id]: [fichaV1] }));
          }
          // Las órdenes cambiaron (nació la de este producto insumo).
          await recargarProduccion?.();
          toast.success(
            creado.ordenId
              ? `Producto insumo «${creado.insumo.nombre}» creado y enviado a Orden de Producción (${creado.ordenId})`
              : `Producto Insumo "${creado.insumo.nombre}" creado`,
            creado.ordenId
              ? {
                  action: {
                    label: "Ver orden",
                    onClick: () => verOrdenProduccion?.(creado.ordenId!),
                  },
                }
              : {
                  action: {
                    label: "Programar producción",
                    onClick: () => abrirOrdenProduccion?.(creado.insumo.id),
                  },
                },
          );
          cerrarModal();
        } catch (error) {
          // 409 con faltantes (o nombre repetido): el mensaje del servidor y
          // los avisos por fila que ya calcula el formulario.
          setTocado((t) => ({ ...t, tiempo: true, cantidad: true, unidad: true, insumos: true, filas: true }));
          toast.error(mensajeErrorInsumos(error, "No se pudo crear el producto insumo."));
        } finally {
          setGuardando(false);
        }
      }
    } else if (confirmState.tipo === "cancelar-producto") {
      cerrarModal();
    } else if (confirmState.tipo === "cambiar-estado" && confirmState.id && confirmState.nuevoEstado) {
      const id = confirmState.id;
      const nuevoEstado = confirmState.nuevoEstado;
      setGuardando(true);
      try {
        const actualizado = await cambiarEstadoInsumo(id, nuevoEstado === "activo");
        setInsumos(prev => prev.map(i => (i.id === id ? actualizado : i)));
        toast.success(`Estado actualizado`);
      } catch (error) {
        toast.error(mensajeErrorInsumos(error, "No se pudo actualizar el estado."));
      } finally {
        setGuardando(false);
      }
    } else if (confirmState.tipo === "eliminar" && confirmState.id) {
      // Reutiliza handleDelete: mantiene el retroceso de página si queda
      // vacía, filtros y buscador intactos, y el recálculo de stock bajo.
      await handleDelete(confirmState.id);
    }
    setConfirmState({ tipo: null, mensaje: "" });
  };

  const cancelarConfirmacion = () => {
    setConfirmState({ tipo: null, mensaje: "" });
  };

  /** Al hacer clic en el basurero: si el registro está en ALGUNA ficha
      técnica VIGENTE (versión con fechaFin === null, de un producto insumo o
      de un producto del menú) NO se puede eliminar: se abre el diálogo
      informativo "no-eliminar" con los nombres reales de los que lo usan.
      Una fila de ficha "usa" al registro por insumoId; las fichas viejas sin
      insumoId comparan por nombre normalizado (`normalizarTexto`, mismo
      criterio que `mismoNombre`). */
  const intentarEliminar = (id: string) => {
    const reg = insumos.find(i => i.id === id);
    if (!reg) return;
    const clave = normalizarTexto(reg.nombre);
    const usadosEn: string[] = [];
    for (const [idRegistro, versiones] of Object.entries(fichas)) {
      const vigente = versiones.find(v => v.fechaFin === null);
      if (!vigente) continue;
      const loUsa = vigente.insumos.some(r =>
        r.insumoId ? r.insumoId === id : normalizarTexto(r.nombre) === clave,
      );
      if (!loUsa) continue;
      const nombreDueno =
        insumos.find(i => i.id === idRegistro)?.nombre ??
        productosMenu.find(p => p.id === idRegistro)?.nombre;
      if (nombreDueno && !usadosEn.includes(nombreDueno)) usadosEn.push(nombreDueno);
    }
    if (usadosEn.length > 0) {
      setConfirmState({ tipo: "no-eliminar", mensaje: "", id, usadosEn });
      return;
    }
    setConfirmState({ tipo: "eliminar", mensaje: "", id });
  };

  // Registro que espera el diálogo de "eliminar" (si ese es el flujo activo).
  const regAEliminar =
    confirmState.tipo === "eliminar" && confirmState.id
      ? insumos.find(i => i.id === confirmState.id) ?? null
      : null;

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

      {/* A5.5 — Aviso de stock bajo (solo insumos activos): el texto es un
          BOTÓN que filtra el listado y muestra solo esos insumos; el segundo
          clic lo apaga. Sigue a la vista mientras el filtro esté activo, así
          que siempre se puede salir. El detalle completo de los nombres queda
          en el `title`. */}
      {insumosStockBajo.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setFiltroStockBajo(v => !v);
            setPage(1);
          }}
          aria-pressed={filtroStockBajo}
          title={`${insumosStockBajo.length} insumo${insumosStockBajo.length === 1 ? "" : "s"} con stock bajo: ${insumosStockBajo
            .map(i => `${i.nombre} (${fmtCant(i.stockActual, i.unidadMedida)}${estadoStock(i) === "sin-stock" ? ", sin stock" : ""})`)
            .join(" · ")}${filtroStockBajo ? " — clic para quitar el filtro" : " — clic para filtrar el listado"}`}
          className={`inline-flex max-w-full items-center gap-2 mb-4 px-4 py-2 rounded-xl border text-sm cursor-pointer transition-all ${
            filtroStockBajo
              ? "bg-amber-500 border-amber-600 text-white shadow-md font-bold"
              : "bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-500/15 dark:border-amber-500/40 dark:text-amber-300 font-semibold hover:bg-amber-200 dark:hover:bg-amber-500/25"
          }`}
        >
          {filtroStockBajo && <span aria-hidden>✓</span>}
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-bold whitespace-nowrap">
            {insumosStockBajo.length} insumo{insumosStockBajo.length === 1 ? "" : "s"} con stock bajo
          </span>
          <span className="truncate">
            · {insumosStockBajo.slice(0, 3).map(i => i.nombre).join(", ")}
            {insumosStockBajo.length > 3 ? ` y ${insumosStockBajo.length - 3} más` : ""}
          </span>
        </button>
      )}

      {/* Carga desde la API: mientras carga o si falla se muestra el estado
          con "Reintentar"; nunca se vuelve a datos de ejemplo. */}
      {cargando ? (
        <div className="bg-white dark:bg-card border border-border rounded-2xl px-4 py-14 text-center text-muted-foreground mb-3">
          Cargando insumos…
        </div>
      ) : errorCarga ? (
        <div className="bg-white dark:bg-card border border-border rounded-2xl px-4 py-14 text-center text-muted-foreground mb-3">
          <p className="font-semibold text-foreground">{errorCarga}</p>
          {onReintentar && (
            <button
              type="button"
              onClick={onReintentar}
              className="mt-3 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer"
            >
              Reintentar
            </button>
          )}
        </div>
      ) : (
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
              // A5.5: "Sin stock" en rojo cuando vale 0; "Stock bajo" en
              // ámbar solo si es mayor a 0 y llegó al mínimo.
              const stock = estadoStock(insumo);
              const inactivo = insumo.estado === "inactivo";
              return (
                <tr key={insumo.id} className={`hover:bg-muted/20 dark:hover:bg-muted/10 transition-colors ${inactivo ? "opacity-50" : ""}`}>
                  <td className="px-3 py-3.5 text-sm font-mono font-bold text-foreground">{formatearId(insumo.id)}</td>
                  <td className="px-3 py-3.5 text-sm text-foreground break-words">
                    {categoriaDe(insumo.categoriaId)}
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
                      {insumo.estado === "activo" && stock === "sin-stock" && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 whitespace-nowrap">
                          Sin stock
                        </span>
                      )}
                      {insumo.estado === "activo" && stock === "bajo" && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 whitespace-nowrap">
                          Stock bajo
                        </span>
                      )}
                      {insumo.estado === "activo" && stock === "ok" && (
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
                        onDelete={() => intentarEliminar(insumo.id)}
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
      )}

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
              /* El modal se ensancha SOLO cuando el tipo es "Producto insumo"
                 (dos columnas); el cambio de ancho tiene transición suave.
                 max-h de seguridad: el contenido está diseñado para caber (la
                 única lista con scroll es la de insumos de la ficha). */
              className={`bg-white dark:bg-card rounded-2xl w-full max-h-[90dvh] shadow-2xl border border-border flex flex-col transition-[max-width] duration-300 ease-out ${
                tipoForm === "producto-insumo" ? "max-w-4xl" : "max-w-md"
              }`}
            >
              <div className="px-6 py-4 border-b border-border shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
                    {editingId
                      ? editandoProducto ? "Editar Producto Insumo" : "Editar Insumo"
                      : tipoForm === "producto-insumo" ? "Crear Producto Insumo" : "Crear Insumo"}
                  </h3>
                  <button
                    onClick={tipoForm === "producto-insumo" ? handleCancelarProducto : cerrarModal}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {editingId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {editandoProducto
                      ? "Solo se puede modificar la ficha técnica."
                      : "Solo se puede modificar el stock mínimo."}
                  </p>
                )}
              </div>

              {/* Tipo * — fila superior fija, a todo el ancho. Al editar queda
                  bloqueado (no se puede cambiar de categoría a mitad de edición). */}
              <div className="shrink-0 px-6 pt-4">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Tipo *</label>
                <SegmentadoButtons
                  valor={tipoForm}
                  opciones={[
                    { valor: "insumo", etiqueta: "Insumo" },
                    { valor: "producto-insumo", etiqueta: "Producto insumo" },
                  ]}
                  onChange={cambiarTipo}
                  disabled={!!editingId}
                  title={editingId ? "El tipo no se puede cambiar al editar" : undefined}
                  fullWidth={tipoForm === "producto-insumo"}
                />
              </div>

              {tipoForm === "producto-insumo" ? (
                /* ── Producto Insumo: grid de dos columnas de igual alto, con
                    divisor vertical y scroll interno independiente. ── */
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[38%_62%] divide-y lg:divide-y-0 lg:divide-x divide-border overflow-y-auto lg:overflow-visible">
                  {/* Columna izquierda: Datos + resumen */}
                  <div className="flex min-h-0 flex-col gap-4 px-6 py-4 lg:overflow-y-auto">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Datos
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nombre *</label>
                        <input
                          value={nombre}
                          onChange={e => escribirNombre(e.target.value)}
                          placeholder="Ej: Guacamole"
                          disabled={!!editingId}
                          className={`${ICLS_MODAL} ${
                            editingId ? "text-muted-foreground cursor-not-allowed" : ""
                          }`}
                        />
                        {errorDe("nombre", errores.nombre) && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1 leading-tight">{errores.nombre}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Categoría *</label>
                        <select
                          value={categoriaId}
                          onChange={e => { setCategoriaId(e.target.value); tocar("categoria"); }}
                          onBlur={() => tocar("categoria")}
                          disabled={!!editingId}
                          className={`${ICLS_MODAL} ${
                            editingId ? "text-muted-foreground cursor-not-allowed" : "cursor-pointer"
                          }`}
                        >
                          <option value="">Selecciona una categoría</option>
                          {categoriasActivas.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                        {errorDe("categoria", errores.categoria) && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1 leading-tight">{errores.categoria}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Stock Mínimo *</label>
                        <input
                          type="number"
                          min={0}
                          value={stockMinimo === 0 ? "" : stockMinimo}
                          placeholder="0"
                          onChange={e => {
                            setStockMinimo(numeroDeInput(limpiarNumeroInput(e.target.value)));
                            tocar("stockMinimo");
                          }}
                          onBlur={() => tocar("stockMinimo")}
                          disabled={!!editingId}
                          className={`${ICLS_MODAL} ${
                            editingId ? "text-muted-foreground cursor-not-allowed" : ""
                          }`}
                        />
                        {errorDe("stockMinimo", errores.stockMinimo) && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1 leading-tight">{errores.stockMinimo}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto rounded-xl border border-border bg-muted/40 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Resumen
                      </p>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Insumos agregados</span>
                          <span className="font-semibold text-foreground">{piFicha.insumos.length}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Tiempo de preparación</span>
                          <span className="font-semibold text-foreground">
                            {piFicha.tiempoPreparacion > 0 ? `${piFicha.tiempoPreparacion} min` : "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Rendimiento</span>
                          <span className="font-semibold text-foreground">
                            {piFicha.rendimiento && piFicha.rendimiento > 0
                              ? `${piFicha.rendimiento}${piUnidadMedida ? ` ${piUnidadMedida}` : ""}`
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Columna derecha: Ficha técnica */}
                  <div className="flex min-h-0 flex-col px-6 py-4">
                    <p className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                      Ficha Técnica
                    </p>
                    <div className="min-h-0 lg:flex-1">
                      <FichaTecnicaEditor
                        ficha={piFicha}
                        onChange={cambiarFichaPI}
                        insumos={insumos}
                        modo="insumo"
                        inputCls={ICLS_MODAL}
                        /* La cantidad a hacer se expresa en la unidad elegida
                           aquí al lado (la del propio Producto Insumo). */
                        unidadCantidad={piUnidadMedida || undefined}
                        errorTiempo={errorDe("tiempo", errores.tiempo)}
                        /* Bajo "Cantidad a hacer", además del error clásico,
                           avisa si la "Cantidad a hacer" no se puede producir
                           con el stock de hoy (A1). */
                        errorCantidad={
                          errorDe("cantidad", errores.cantidad) ??
                          (validacionStockPI.faltantes.length > 0 ? validacionStockPI.aviso : undefined)
                        }
                        errorInsumos={errorDe("insumos", errores.insumos)}
                        /* Mensaje en rojo por fila: insumo que no alcanza en
                           stock (A1) o fila en cantidad 0 (A5.4). */
                        erroresInsumosFila={erroresFilaPI}
                        /* Tercera columna de la fila superior: junto a Tiempo
                           y Cantidad a hacer. */
                        campoAdicional={
                          <div className="flex min-w-0 flex-col gap-2">
                            <label className="flex min-h-[2.5rem] items-end text-xs font-semibold text-muted-foreground">Unidad de medida *</label>
                            <UnidadSelect
                              value={piUnidadMedida}
                              onChange={v => { setPiUnidadMedida(v); tocar("unidad"); }}
                              disabled={editandoProducto}
                              /* A5.2: la MISMA lista compartida que Crear
                                 Insumo y que la "Medida" de cada fila. */
                              unidades={UNIDADES_INSUMO}
                              placeholder="Seleccionar unidad..."
                              ariaLabel="Unidad de medida"
                              fieldClassName={`h-12 border border-border ${
                                editandoProducto
                                  ? "bg-muted/50 dark:bg-muted/30 text-muted-foreground"
                                  : "bg-muted dark:bg-input text-foreground"
                              }`}
                            />
                            {errorDe("unidad", errores.unidad) && (
                              <p className="text-xs text-red-500 dark:text-red-400 leading-tight">{errores.unidad}</p>
                            )}
                          </div>
                        }
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Insumo normal: un solo campo, exactamente como siempre ── */
                <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="px-6 py-5 space-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nombre *</label>
                    <input
                      value={nombre}
                      onChange={e => escribirNombre(e.target.value)}
                      placeholder="Ej: Queso Mozzarella"
                      disabled={!!editingId}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none ${
                        editingId
                          ? "bg-muted/50 dark:bg-muted/30 text-muted-foreground cursor-not-allowed"
                          : "bg-muted dark:bg-input text-foreground focus:ring-2 focus:ring-primary/30"
                      }`}
                    />
                    {errorDe("nombre", errores.nombre) && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1 leading-tight">{errores.nombre}</p>
                    )}
                  </div>
                  {/* Categoría + Unidad */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Categoría *</label>
                      <select
                        value={categoriaId}
                        onChange={e => { setCategoriaId(e.target.value); tocar("categoria"); }}
                        onBlur={() => tocar("categoria")}
                        disabled={!!editingId}
                        className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none ${
                          editingId
                            ? "bg-muted/50 dark:bg-muted/30 text-muted-foreground cursor-not-allowed"
                            : "bg-muted dark:bg-input text-foreground focus:ring-2 focus:ring-primary/30 cursor-pointer"
                        }`}
                      >
                        <option value="">Selecciona una categoría</option>
                        {categoriasActivas.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                      {errorDe("categoria", errores.categoria) && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1 leading-tight">{errores.categoria}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Unidad de Medida *</label>
                      {/* Select personalizado (Radix, igual que los estados): el
                          `<select>` nativo desplegaba la lista CUADRADA y con el
                          azul del navegador. */}
                      {/* A5.2: UNA sola lista de unidades (UNIDADES_INSUMO),
                          la misma que la del Producto Insumo y la de cada
                          fila de la ficha. */}
                      <UnidadSelect
                        value={unidad}
                        onChange={setUnidad}
                        disabled={!!editingId}
                        unidades={UNIDADES_INSUMO}
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
                      SOLO LECTURA: el stock lo mueven Compras (suma) y
                      Producción (resta); aquí solo se edita el Stock Mínimo. */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {editingId && (
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Stock Actual</label>
                        {/* 0 = vacío (punto B1): al borrar no reaparece el 0. */}
                        <input
                          type="number"
                          min={0}
                          value={stockActual === 0 ? "" : stockActual}
                          placeholder="0"
                          disabled
                          className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 dark:bg-muted/30 text-muted-foreground cursor-not-allowed"
                        />
                      </div>
                    )}
                    {/* En creación toma las dos columnas: no está el Stock Actual. */}
                    <div className={editingId ? "" : "sm:col-span-2"}>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Stock Mínimo *</label>
                      <input
                        type="number"
                        min={0}
                        value={stockMinimo === 0 ? "" : stockMinimo}
                        placeholder="0"
                        onChange={e => {
                          setStockMinimo(numeroDeInput(limpiarNumeroInput(e.target.value)));
                          tocar("stockMinimo");
                        }}
                        onBlur={() => tocar("stockMinimo")}
                        className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted dark:bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      {errorDe("stockMinimo", errores.stockMinimo) && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1 leading-tight">{errores.stockMinimo}</p>
                      )}
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
                </div>
              )}

              <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
                <button
                  onClick={tipoForm === "producto-insumo" ? handleCancelarProducto : cerrarModal}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={tipoForm === "producto-insumo" ? handleGuardarProducto : handleSave}
                  /* A1: mientras falte insumo para la "Cantidad a hacer", el
                     producto insumo nuevo no se puede crear. */
                  disabled={
                    guardando ||
                    (tipoForm === "producto-insumo" &&
                      !editandoProducto &&
                      validacionStockPI.faltantes.length > 0)
                  }
                  className={`flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 ${
                    guardando ||
                    (tipoForm === "producto-insumo" &&
                      !editandoProducto &&
                      validacionStockPI.faltantes.length > 0)
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-red-700 cursor-pointer active:scale-95"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {guardando
                    ? "Guardando…"
                    : editingId
                      ? "Guardar"
                      : tipoForm === "producto-insumo" ? "Crear Producto Insumo" : "Crear Insumo"}
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
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Categoría</label>
                          <p className="text-sm text-foreground">{categoriaDe(d.categoriaId)}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Stock actual</label>
                            <p className="text-sm font-mono font-bold text-foreground">{d.stockActual} {d.unidadMedida}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Stock mínimo</label>
                            <p className="text-sm font-mono text-muted-foreground">{d.stockMinimo}</p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                          <p className={`text-sm font-mono font-bold ${d.estado === "activo" ? "text-emerald-600" : "text-gray-500"}`}>
                            {d.estado === "activo" ? "Activo" : "Inactivo"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Ficha técnica</label>
                          {fv ? (
                            <FichaTecnicaDetalle
                              v={fv}
                              readCls="w-full px-3 py-2 bg-muted/50 rounded-xl border border-border text-sm text-foreground"
                              modo="insumo"
                              unidadCantidad={d.unidadMedida}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Sin ficha técnica</p>
                          )}
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
                          <p className="text-sm text-foreground">{categoriaDe(d.categoriaId)}</p>
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
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Costo Unitario</label>
                          <p className="text-sm font-mono font-bold text-foreground">{fmtCOP(d.costoUnitario)}</p>
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
        {confirmState.tipo === "no-eliminar" && (() => {
          const reg = confirmState.id ? insumos.find(i => i.id === confirmState.id) : null;
          return (
            <ConfirmDialog
              titulo="No se puede eliminar"
              icono={
                <span className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </span>
              }
              mensaje={
                <>
                  No se puede eliminar «{reg?.nombre}» porque se usa en:{" "}
                  {(confirmState.usadosEn ?? []).join(", ")}. Puedes inactivarlo.
                </>
              }
              soloConfirmar
              textoConfirmar="Entendido"
              cerrarConEscYOverlay
              enfocarCancelar
              onConfirmar={cancelarConfirmacion}
              onCancelar={cancelarConfirmacion}
            />
          );
        })()}
        {confirmState.tipo && confirmState.tipo !== "no-eliminar" && (
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
            textoConfirmar={
              guardando
                ? "Guardando…"
                : confirmState.tipo === "eliminar" ? "Eliminar" : "Confirmar"
            }
            cerrarConEscYOverlay={confirmState.tipo === "eliminar"}
            enfocarCancelar={confirmState.tipo === "eliminar"}
            onConfirmar={() => {
              if (guardando) return;
              void ejecutarConfirmacion();
            }}
            onCancelar={cancelarConfirmacion}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
