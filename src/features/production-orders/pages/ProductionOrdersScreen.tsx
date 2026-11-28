import { ChefHat, Download } from "lucide-react";
import { AvisoBanner } from "@/shared/components/panel/NoticeBanner";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { BuscadorGrande } from "@/shared/components/panel/LargeSearch";
import { DialogoConfirmacion } from "@/shared/components/panel/ConfirmDialog";
import { EncabezadoPagina } from "@/shared/components/panel/PageHeader";
import { EstadoPill, type TonoPill } from "@/shared/components/panel/StatusPill";
import { FiltrosChips } from "@/shared/components/panel/FilterChips";
import { PaginadorGrande } from "@/shared/components/panel/LargePaginator";
import { SeccionFormulario } from "@/shared/components/panel/FormSection";
import { TarjetaFila } from "@/shared/components/panel/RowCard";
import { VacioEstado } from "@/shared/components/panel/EmptyState";
import { useState, useMemo, useEffect, useCallback, type Dispatch, type SetStateAction } from "react";
import { tiempoRestante, useRefrescarAlVencer } from "@/shared/hooks/useRefreshOnExpire";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, X, Play, CheckCircle2, Ban, Calculator, AlertCircle, AlertTriangle, Clock, Minus, Layers } from "lucide-react";
import { toast } from "sonner";
import { CalendarDropdown } from "@/shared/components/CalendarDropdown";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginator";
import { ActionIcons } from "@/shared/components/buttons/ActionIcons";
import { BotonDescargarExcel } from "@/shared/components/buttons/DownloadExcelButton";
import { exportarExcelEstilizado } from "@/shared/utils/styledExcelExport";
import { limpiarNumeroInput, numeroDeInput } from "@/shared/utils/numberInput";
import { formatearFechaHora } from "@/shared/utils/time";
import { ConfirmDeleteModal } from "@/shared/components/ConfirmDeleteModal";
import { FichaTecnicaDetalle } from "@/shared/components/TechnicalSheetEditor";
import type { Insumo } from "@/features/supplies/utils/supplies";
import type { Venta } from "@/features/sales/utils/sales";
import type { FichasPorProducto } from "@/shared/utils/technicalSheets";
import { tipoDe } from "@/features/products/utils/products";
import type { Producto } from "@/features/products/utils/products";
import { esIdInsumo, idInsumoApiDesdeFront, type FichaVersion } from "@/shared/utils/technicalSheets";
import { convertirUnidad, faltantesPara, fmtCant, motivoFaltante, unidadesCompatibles } from "@/shared/utils/availability";
import type { NoConformidad } from "@/features/non-conforming-products/utils/non-conforming-products";
import {
  actualizarOrdenProduccion,
  completarOrdenProduccion,
  crearOrdenPreparacionApi,
  darBajaOrdenProduccion,
  eliminarOrdenProduccion,
  obtenerCalculoVerificacionOrden,
  iniciarOrdenProduccion,
  mapearFaltanteApi,
  mensajeErrorOrdenes,
  type CalculoVerificacionLineaApi,
  type ErrorConFaltantes,
} from "@/features/production-orders/services/productionOrdersApi";
import { mapearFichaApi, obtenerFichasDe } from "@/features/products/services/technicalSheetsApi";
import {
  guardarParametrosCostos,
  obtenerParametrosCostos,
  type ParametrosCostosPayload,
} from "@/features/products/services/costParametersApi";
import { ParametrosCostosModal } from "@/features/products/components/CostParametersModal";
import {
  calcularCostoOrden,
  formatearCOP,
  calcularCostoProducto,
  precioRecomendadoPorPorcion,
  recomendadoGrandeIgualado,
  type ParametrosCostos,
} from "@/shared/utils/costs";
import { useProductionOrders } from "@/features/production-orders/hooks/useProductionOrders";
import { type TipoOrden, type EstadoOrden, PER_PAGE, type OrdenProduccion, type LineaOrden, type InsumoRequerido } from "@/features/production-orders/utils/production-orders";
import { EstimacionPedido, EditarTiempoPedido } from "@/features/production-orders/components/OrderTime";
import { AvisoFaltantes } from "@/features/production-orders/components/ShortageNotice";
import { TablaInsumosRequeridos } from "@/features/production-orders/components/RequiredSuppliesTable";
import { LineaPreparacion } from "@/features/production-orders/components/PreparationLine";
import { CamposPedido } from "@/features/production-orders/components/OrderFields";
import { HORNEADO_MIN, esDecimal, fmtMinutos, normalizarNombre, normalizar, esPizzaProducto, fichaVigente, snapshotDeFicha, type Faltante, type OrdenForm, requeridosDeLinea, resumenNecesita } from "@/features/production-orders/utils/production-orders";
import { hoyLocal, siguienteOrdenId } from "@/features/production-orders/utils/production-orders";

const SERIF = "var(--font-titulo)";

const OBS_CREAR_CLS = "w-full min-h-[6.875rem] px-[1.125rem] py-4 bg-muted border border-border text-base text-foreground rounded-[0.875rem] resize-none focus:outline-none focus:ring-2 focus:ring-primary/30";

// ─────────────────────────── Tipos ───────────────────────────
export const TIPO_LABEL: Record<TipoOrden, string> = {
  preparacion: "Preparación",
  pedido: "Pedido",
};

function etiquetaAsignacion(o: OrdenProduccion, productos: Producto[]): string {
  if (o.tipo === "pedido") return "Para calentar";
  const etiquetas = new Set(o.lineas.map((linea) => {
    const idProducto = linea.productoId ?? linea.idProducto;
    const producto = productos.find((p) => p.id === idProducto);
    const categoria = normalizarNombre(producto?.categoriaNombre ?? "");
    return categoria === "pizzas" || categoria === "lasanas" ? "Pre cocido" : "Preparación";
  }));
  return [...etiquetas].join(" / ") || "Preparación";
}

const ESTADO_COLOR: Record<EstadoOrden, string> = {
  pendiente:    "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300",
  "en-proceso": "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  completada:   "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  cancelada:    "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

const ESTADO_LABEL: Record<EstadoOrden, string> = {
  pendiente:    "Pendiente",
  "en-proceso": "En proceso",
  completada:   "Completada",
  cancelada:    "Cancelada",
};

// Cancelada solo se alcanza mediante el flujo de "Dar de baja".
export const VALID_TRANSITIONS: Record<EstadoOrden, EstadoOrden[]> = {
  pendiente:    ["en-proceso", "cancelada"],
  "en-proceso": ["completada", "cancelada"],
  completada:   [],
  cancelada:    [],
};

export const ORDEN_ESTADOS: EstadoOrden[] = ["pendiente", "en-proceso", "completada", "cancelada"];

// Qué estados pueden elegirse a mano desde el listado, dado el estado actual.

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

const TIENE_ZONA = /(Z|[+-]\d{2}(:?\d{2})?)$/i;

/** Instante en ms. Sin zona (timestamp de Bogotá del backend) se toma como
    hora de Bogotá (UTC-5); con "Z" u offset es un instante absoluto. */
function epochOrden(iso: string): number {
  const t = iso.trim().replace(" ", "T");
  const conZona = TIENE_ZONA.test(t.slice(10));
  const ms = Date.parse(conZona ? t : `${t}-05:00`);
  return Number.isNaN(ms) ? 0 : ms;
}

const addMinutesISO = (iso: string, min: number) =>
  new Date(new Date(iso).getTime() + min * 60000).toISOString();

const fechaHoraBogotaDesdeEpoch = (epoch: number, incluirSegundos = false) => {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(incluirSegundos ? { second: "2-digit" as const } : {}),
    hourCycle: "h23",
  }).formatToParts(new Date(epoch));
  const fecha = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return `${fecha.year}-${fecha.month}-${fecha.day}T${fecha.hour}:${fecha.minute}${incluirSegundos ? `:${fecha.second}` : ""}`;
};

const porcionesPorPizza = (tamano?: string | null): number =>
  normalizar(tamano ?? "") === "grande" ? 6 : 8;

/** Ficha que muestra "Ver ficha del producto": primero la versión que USÓ la
    orden (la del snapshot, buscada en el catálogo por número de versión) y,
    si la orden es vieja y no trae snapshot, la ficha vigente —mismo criterio
    que `requeridosDeLinea`. `reconstruida` avisa que esa versión ya no está
    en el catálogo y lo que se ve sale solo de la foto guardada en la orden. */
function fichaParaVer(
  linea: LineaOrden,
  fichas: FichasPorProducto,
): { ficha: FichaVersion | null; reconstruida: boolean } {
  const clave = linea.productoId ?? linea.idProducto;
  const snap = linea.fichaSnapshot;
  if (!clave) return { ficha: null, reconstruida: false };
  if (snap) {
    const guardada = fichas[clave]?.find(v => v.version === snap.version);
    if (guardada) return { ficha: guardada, reconstruida: false };
    // Versión borrada del catálogo: se arma desde la foto de la orden.
    return {
      ficha: {
        version: snap.version,
        idReceta: "",
        tiempoPreparacion: snap.tiempoPreparacion,
        rendimiento: snap.rendimiento,
        porciones: 0,
        insumos: snap.insumos,
        pasos: snap.pasos,
        fechaInicio: "",
        fechaFin: null,
      },
      reconstruida: true,
    };
  }
  return { ficha: fichaVigente(fichas, clave), reconstruida: false };
}

/** Producto de una línea del pedido: por id y, si la línea es vieja o el id ya
    no está en Productos, por nombre normalizado (el detalle trae el tamaño
    pegado con " — "). Mismo criterio que `lineasDeVenta`. */
function productoDeLinea(l: LineaOrden, productos: Producto[]): Producto | undefined {
  const porId = l.productoId ? productos.find((p) => p.id === l.productoId) : undefined;
  const base = l.nombre.split(" — ")[0].trim();
  return porId ?? productos.find((p) => normalizar(p.nombre) === normalizar(base));
}

/** ¿Es la línea una bebida (gaseosa, jugo…)? Es la ÚNICA línea de un pedido
    que baja `stockDisponible` (pizza y lasaña se preparan con sus insumos) y
    la ÚNICA que no pide insumos al Iniciar. Se decide por el TAMAÑO de la
    línea: las bebidas llegan sin tamaño y pizzas y lasañas con Mediana,
    Grande o Normal. Si la línea tiene tamaño pero su producto NO se encuentra
    en Productos, NO se asume bebida: `iniciar` la bloquea con su aviso (mismo
    espíritu que una pizza o lasaña sin ficha). */
function esBebida(l: LineaOrden, productos: Producto[]): boolean {
  // Sin tamaño = bebida: no pide insumos ni descuenta stock de insumos.
  if (!l.tamano) return true;
  // Con tamaño solo puede ser pizza o lasaña. Si el producto existe, manda su
  // TIPO ("Producto terminado" llega tal cual, sin ficha); si no existe, la
  // línea NO es bebida y el bloqueo lo hace `iniciar` al recalcular.
  const producto = productoDeLinea(l, productos);
  if (!producto) return false;
  return tipoDe(producto) === "Producto terminado";
}

const emptyForm = (tipo: TipoOrden = "preparacion"): OrdenForm => ({
  tipo,
  lineas: [nuevaLinea(tipo)],
  ventaId: null,
  fechaSolicitada: "",
  horaSolicitada: "",
  observacion: "",
});

function nuevaLinea(tipo: TipoOrden): LineaOrden {
  return { idProducto: "", nombre: "", unidad: "und", cantidadEstimada: 0 };
}

/** C6 — En "Preparación en lote" cada línea necesita un Producto Insumo
    elegido y una cantidad MAYOR O IGUAL A 1. Mientras eso no se cumpla, la
    línea pinta su error en tiempo real y Guardar queda bloqueado. */
const preparacionInvalida = (lineas: LineaOrden[], productos: Producto[], exigirTamano = true): boolean =>
  lineas.some((l) => {
    const pizza = esPizzaProducto(productos.find((p) => p.id === l.idProducto));
    if (pizza) {
      return !l.idProducto
        || !Number.isSafeInteger(l.cantidadEstimada)
        || l.cantidadEstimada < 0 || (exigirTamano && l.cantidadEstimada < 1);
    }
    return !l.idProducto || l.cantidadEstimada < 1;
  });

const totalEstimado = (lineas: LineaOrden[]) =>
  lineas.reduce((s, l) => s + (l.cantidadEstimada || 0), 0);
const totalReal = (lineas: LineaOrden[]) =>
  lineas.reduce((s, l) => s + (l.cantidadReal ?? 0), 0);
const totalMerma = (lineas: LineaOrden[]) =>
  lineas.reduce((s, l) => s + (l.merma ?? 0), 0);

/** Mermas de la orden agrupadas por la UNIDAD de cada línea ("0.5 lt" o
    "0.5 lt · 2 und"): cada línea mide su merma en su propia unidad, así que
    un total único con una sola unidad mentía en el listado y en el Excel
    (la orden de Guacamole decía "−0.5 und merma" siendo "0.5 lt"). */
const resumenMerma = (lineas: LineaOrden[]): string => {
  const acc = new Map<string, number>();
  for (const l of lineas) {
    const m = l.merma ?? 0;
    if (m <= 0) continue;
    acc.set(l.unidad, (acc.get(l.unidad) ?? 0) + m);
  }
  return [...acc.entries()].map(([unidad, cant]) => fmtCant(cant, unidad)).join(" · ");
};

/** Insumos legacy: solo para líneas SIN fichaSnapshot ya creadas. */
function requeridosDePreparacion(linea: LineaOrden, insumos: Insumo[]): InsumoRequerido[] {
  const pi = insumos.find((i) => i.id === linea.idProducto);
  if (!pi?.composicion) return [];
  const acc = new Map<string, InsumoRequerido>();
  for (const c of pi.composicion) {
    const cantidad = (linea.cantidadEstimada || 0) * c.cantidad;
    const prev = acc.get(c.id);
    acc.set(c.id, prev
      ? { ...prev, cantidad: prev.cantidad + cantidad }
      : { insumoId: c.id, nombre: c.nombre, cantidad, unidad: c.unidadMedida });
  }
  return [...acc.values()];
}

/** Líneas de preparación con su `fichaSnapshot` cargado: la que ya lo trae
    (viene de editar) se conserva; la que no, lo toma de la ficha vigente.
    Lo usan `guardarOrden` y la validación de insumos al crear/editar (bloque
    4), para que lo que se AVISA y lo que se GUARDA sea el mismo cálculo. */
function prepararLineasSnapshot(lineas: LineaOrden[], fichas: FichasPorProducto): LineaOrden[] {
  return lineas.map((l) => {
    if (l.fichaSnapshot) return l;
    const ficha = fichaVigente(fichas, l.idProducto);
    if (!ficha) return l;
    return {
      ...l,
      fichaSnapshot: {
        version: ficha.version,
        rendimiento: ficha.rendimiento ?? 1,
        insumos: ficha.insumos,
        tiempoPreparacion: ficha.tiempoPreparacion,
        pasos: ficha.pasos,
      },
    };
  });
}

/** Suma de los insumos que piden TODAS las líneas de preparación: del
    snapshot si existe, si no legacy (`requeridosDePreparacion`). Mismo
    criterio que pinta cada línea, así lo que se muestra, lo que se guarda y
    lo que avisa la validación al crear/editar nunca dan distinto. */
function requeridosDePreparaciones(
  lineas: LineaOrden[],
  fichas: FichasPorProducto,
  insumos: Insumo[],
): InsumoRequerido[] {
  const acc = new Map<string, InsumoRequerido>();
  for (const l of lineas) {
    const req = l.fichaSnapshot
      ? requeridosDeLinea(l, fichas)
      : requeridosDePreparacion(l, insumos);
    for (const r of req) {
      const prev = acc.get(r.insumoId);
      acc.set(r.insumoId, prev
        ? { ...prev, cantidad: prev.cantidad + r.cantidad }
        : r);
    }
  }
  return [...acc.values()];
}

async function exportExcel(ordenes: OrdenProduccion[]) {
  const fecha = new Date();
  const archivo = await exportarExcelEstilizado({
    datos: ordenes,
    titulo: "Orden Producción",
    nombreHoja: "Ordenes",
    nombreArchivo: "Ordenes_Produccion",
    fecha,
    coloresEstado: {
      Completada: { texto: "FF065F46", fondo: "FFD1FAE5" },
      "En Proceso": { texto: "FF1E40AF", fondo: "FFDBEAFE" },
      Pendiente: { texto: "FF854D0E", fondo: "FFFEF9C3" },
      Cancelada: { texto: "FFB91C1C", fondo: "FFFEE2E2" },
    },
    columnas: [
      { header: "ID Orden", valor: (o) => o.id },
      { header: "Tipo", valor: (o) => TIPO_LABEL[o.tipo] },
      { header: "Venta", valor: (o) => (o.ventaNumero ? `Venta ${o.ventaNumero}` : "") },
      {
        header: "Producto(s)",
        valor: (o) => o.lineas.map((l) => `${l.cantidadEstimada} × ${l.nombre}`).join("; "),
      },
      { header: "Cant. estimada", valor: (o) => o.lineas.map((l) => fmtCant(l.cantidadEstimada, l.unidad)).join("; ") },
      {
        header: "Cant. real",
        valor: (o) => (o.estadoOrden === "completada" && o.lineas.every((l) => l.cantidadReal != null)
          ? o.lineas.map((l) => fmtCant(l.cantidadReal ?? 0, l.unidad)).join("; ")
          : "—"),
      },
      { header: "Pérdida", valor: (o) => (totalMerma(o.lineas) > 0 ? resumenMerma(o.lineas) : "0"), numFmt: "#,##0.00" },
      { header: "Estado", valor: (o) => ESTADO_LABEL[o.estadoOrden], esEstado: true },
      { header: "Fecha/Hora de estado", valor: (o) => formatearFechaHora(o.historial[o.historial.length - 1]?.fechaHora ?? o.creadaEn) },
      { header: "Observación", valor: (o) => o.observacion },
    ],
  });
  toast.success(`Archivo Excel descargado (${archivo})`);
}

// ─────────────────────────── Pantalla ───────────────────────────
export function OrdenProduccionScreen({
  productos,
  insumos,
  setInsumos,
  ventas,
  fichasPorProducto,
  ordenes,
  setOrdenes,
  noConformidades,
  cargando = false,
  errorCarga,
  onReintentar,
  recargarProduccion,
  onPedidoListo,
  onNavigateTo,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canExportExcel = true,
  esAdministradorSesion = false,
  abrirOrdenId,
  setOrdenAAbrir,
  detalleOrdenId,
  setDetalleOrdenAAbrir,
}: {
  productos: Producto[];
  insumos: Insumo[];
  setInsumos: Dispatch<SetStateAction<Insumo[]>>;
  ventas: Venta[];
  /** Fichas técnicas por producto, subidas a App (las crea Gestión de Productos). */
  fichasPorProducto: FichasPorProducto;
  ordenes: OrdenProduccion[];
  setOrdenes: Dispatch<SetStateAction<OrdenProduccion[]>>;
  /** Productos no conformes (API): el detalle muestra la merma de la orden. */
  noConformidades: NoConformidad[];
  /** Carga de la lista desde la API y su error ("Reintentar"): nunca datos
      de ejemplo. */
  cargando?: boolean;
  errorCarga?: string | null;
  onReintentar?: () => void;
  /** Recarga insumos, fichas y órdenes tras una acción que movió stock. */
  recargarProduccion?: () => Promise<boolean | void>;
  onPedidoListo?: (orden: OrdenProduccion) => void;
  onNavigateTo?: (screen: "orden-compra" | "supplies", faltantes?: Faltante[]) => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExportExcel?: boolean;
  esAdministradorSesion?: boolean;
  /** id de Producto Insumo desde Insumos: abre Crear orden ya prellenado. */
  abrirOrdenId?: string | null;
  /** Limpia `abrirOrdenId` apenas se consume: si queda guardado, cada vuelta
      a esta pantalla reabriría el modal con el último producto programado. */
  setOrdenAAbrir?: Dispatch<SetStateAction<string | null>>;
  /** id de una orden EXISTENTE cuyo DETALLE hay que abrir (A2.3): lo usa
      Insumos tras crear la orden automática de un producto insumo nuevo,
      cuando el toast dice "Ver orden". */
  detalleOrdenId?: string | null;
  /** Limpia `detalleOrdenId` apenas se consume, por el mismo motivo que
      `setOrdenAAbrir`. */
  setDetalleOrdenAAbrir?: Dispatch<SetStateAction<string | null>>;
}) {
  const { search, setSearch, filtroTipo, setFiltroTipo, filtroEstado, setFiltroEstado, page, setPage, filtradas } = useProductionOrders(ordenes);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<OrdenProduccion | null>(null);
  const [detailItem, setDetailItem] = useState<OrdenProduccion | null>(null);
  const [ordenLista, setOrdenLista] = useState<OrdenProduccion | null>(null);
  const [marcandoLista, setMarcandoLista] = useState(false);
  const [ahoraCalentamiento, setAhoraCalentamiento] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhoraCalentamiento(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useRefrescarAlVencer(
    ordenes.filter((o) => o.tipo === "pedido" && o.estadoOrden === "en-proceso" && !o.cierreManualPorTiempo).map((o) => o.finCalentamientoMs),
    async () => recargarProduccion?.(),
  );
  useRefrescarAlVencer(
    ordenes.filter((o) => o.tipo === "preparacion" && o.estadoOrden === "en-proceso").map((o) => o.finPreparacionMs),
    async () => recargarProduccion?.(),
  );
  useEffect(() => {
    setDetailItem((actual) => {
      if (!actual) return null;
      const actualizada = ordenes.find((o) => o.id === actual.id);
      return actualizada ? { ...actual, ...actualizada } : actual;
    });
  }, [ordenes]);
  const [verFicha, setVerFicha] = useState<{ ordenId: string; lineaIdx: number } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<OrdenForm>(emptyForm());
  const [mostrarParametrosCostos, setMostrarParametrosCostos] = useState(false);
  const [parametrosCostos, setParametrosCostos] = useState<ParametrosCostos | null>(null);
  const [parametrosCostosCargando, setParametrosCostosCargando] = useState(true);
  const [parametrosCostosError, setParametrosCostosError] = useState<string | null>(null);

  const cargarParametrosCostos = useCallback(async () => {
    setParametrosCostosCargando(true);
    setParametrosCostosError(null);
    try {
      setParametrosCostos(await obtenerParametrosCostos());
    } catch (error) {
      setParametrosCostosError(
        `No se pudieron cargar los parámetros de costos: ${
          error instanceof Error ? error.message : "error desconocido"
        }`,
      );
    } finally {
      setParametrosCostosCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarParametrosCostos();
  }, [cargarParametrosCostos]);

  const guardarCostos = async (datos: ParametrosCostosPayload) => {
    const guardados = await guardarParametrosCostos(datos);
    setParametrosCostos(guardados);
    setMostrarParametrosCostos(false);
    toast.success("Parámetros de costos actualizados");
  };

  // Al cerrar el detalle se olvida el modal de ficha: si se vuelve a abrir la
  // misma orden, la ficha no reaparece sola.
  useEffect(() => {
    if (!detailItem) setVerFicha(null);
  }, [detailItem]);

  // "Ver ficha": la versión que USÓ la línea (su `id_ft`) se pide a la API al
  // abrirla y se congela como `fichaSnapshot`; hasta que llega se muestra la
  // ficha vigente del estado. Si falla, se queda con esa.
  useEffect(() => {
    if (!verFicha || !detailItem) return;
    const linea = detailItem.lineas[verFicha.lineaIdx];
    if (!linea || linea.fichaSnapshot || linea.idFt == null) return;
    let cancelado = false;
    void (async () => {
      try {
        const fichas = await obtenerFichasDe(
          esIdInsumo(linea.idProducto)
            ? { id_insumo: idInsumoApiDesdeFront(linea.idProducto) }
            : { id_producto: Number(linea.idProducto) },
        );
        const version = fichas
          .map((f) => mapearFichaApi(f, null))
          .find((v) => v.idFt === linea.idFt);
        if (cancelado || !version) return;
        const snap = snapshotDeFicha(version);
        setDetailItem((prev) => (prev
          ? {
              ...prev,
              lineas: prev.lineas.map((l, i) =>
                i === verFicha.lineaIdx && !l.fichaSnapshot ? { ...l, fichaSnapshot: snap } : l,
              ),
            }
          : prev));
      } catch {
        // Sin la versión histórica se muestra la ficha vigente.
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [verFicha, detailItem]);

  // Cuando llega abrirOrdenId desde Insumos, abrir Crear orden con el
  // Producto Insumo preseleccionado y su ficha vigente ya en la línea.
  useEffect(() => {
    if (!abrirOrdenId) return;
    const pi = insumos.find((i) => i.id === abrirOrdenId);
    // Se consume de una vez: no puede quedar pendiente para la próxima
    // entrada a la pantalla.
    setOrdenAAbrir?.(null);
    if (!pi) return;
    const ficha = fichaVigente(fichasPorProducto, pi.id);
    setForm({
      tipo: "preparacion",
      lineas: [{
        idProducto: pi.id,
        nombre: pi.nombre,
        unidad: pi.unidadMedida,
        cantidadEstimada: 0,
        fichaSnapshot: ficha ? snapshotDeFicha(ficha) : undefined,
      }],
      ventaId: null,
      fechaSolicitada: "",
      horaSolicitada: "",
      observacion: "",
    });
    setShowCreate(true);
  }, [abrirOrdenId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cuando llega detalleOrdenId (Insumos creó la orden automática de un
  // producto insumo nuevo), se abre su detalle. Se consume de una vez: no
  // puede quedar pendiente para la próxima entrada a la pantalla.
  useEffect(() => {
    if (!detalleOrdenId) return;
    setDetalleOrdenAAbrir?.(null);
    const orden = ordenes.find((o) => o.id === detalleOrdenId);
    if (orden) setDetailItem(orden);
  }, [detalleOrdenId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Estado del modal de completar para las cantidades reales y debidas.
  const [completarItem, setCompletarItem] = useState<OrdenProduccion | null>(null);
  const [reales, setReales] = useState<Record<number, string>>({});
  const [preciosCompletar, setPreciosCompletar] = useState<Record<string, string>>({});
  const [calculosDebidos, setCalculosDebidos] = useState<Record<number, CalculoVerificacionLineaApi>>({});
  const [cargandoCalculoDebido, setCargandoCalculoDebido] = useState(false);
  const [iniciandoId, setIniciandoId] = useState<string | null>(null);
  // Faltantes detectados al INICIAR: abren el modal "Inventario insuficiente"
  // (lista de "Faltan X de Y (hay Z)" con su motivo) y la orden se queda
  // Pendiente: no se descuenta nada ni cambia de estado.
  const [faltantesIniciar, setFaltantesIniciar] = useState<
    { ordenId: string; faltantes: Faltante[] } | null
  >(null);
  /** Bloque 4 — Faltantes EN VIVO de la preparación en lote que se está
      creando o editando: mientras haya, el botón Crear/Guardar queda
      deshabilitado y se muestran el mensaje + la lista de faltantes dentro
      del modal (mismo criterio A1 que al crear un producto insumo en
      Insumos). Un pedido NUNCA bloquea: `lineas` queda null y da []. */
  const faltantesForm = useMemo(() => {
    const lineas = editItem
      ? (editItem.tipo === "preparacion" ? editItem.lineas : null)
      : (form.tipo === "preparacion" ? form.lineas : null);
    if (!lineas) return [] as Faltante[];
    const requeridos = requeridosDePreparaciones(
      prepararLineasSnapshot(lineas, fichasPorProducto),
      fichasPorProducto,
      insumos,
    );
    return faltantesPara(requeridos, 1, insumos);
  }, [editItem, form.tipo, form.lineas, fichasPorProducto, insumos]);

  const [versionForm, setVersionForm] = useState(0);

  // Faltante que es un Producto Insumo: se prepara, no se compra. Abre Crear
  // orden con ese producto y la cantidad que falta.
  const prepararFaltante = (f: Faltante, desdeCrear: boolean) => {
    const pi = insumos.find((i) => i.id === f.insumoId);
    if (!pi) return;
    const ficha = fichaVigente(fichasPorProducto, pi.id);
    setDetailItem(null);
    setVersionForm((v) => v + 1);
    setForm({
      tipo: "preparacion",
      lineas: [{
        idProducto: pi.id,
        nombre: pi.nombre,
        unidad: pi.unidadMedida,
        cantidadEstimada: esDecimal(pi.unidadMedida) ? Math.ceil(f.falta * 1000) / 1000 : Math.ceil(f.falta),
        fichaSnapshot: ficha ? snapshotDeFicha(ficha) : undefined,
      }],
      ventaId: null,
      fechaSolicitada: "",
      horaSolicitada: "",
      observacion: "",
    });
    setShowCreate(true);
  };

  const comprarDesdeCrear = (faltantes: Faltante[]) => {
    setShowCreate(false);
    onNavigateTo?.("orden-compra", faltantes);
  };

  const [darBajaItem, setDarBajaItem] = useState<OrdenProduccion | null>(null);
  const [darBajaForm, setDarBajaForm] = useState<{
    idProducto: string;
    unidadMedida: string;
    cantidad: number;
    fechaRegistro: string;
    motivo: string;
    descripcion: string;
  } | null>(null);

  const iCls = "w-full px-3 py-2.5 max-md:min-h-11 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const sCls = iCls + " cursor-pointer";
  const tCls = iCls + " resize-none";
  // Mismo campo solo lectura que usa la ficha detalle de Gestión de Productos.
  const readCls = "w-full px-3 py-2 bg-muted/50 rounded-xl border border-border text-sm text-foreground";

  // ── Listado ────────────────────────────────────────────────────────
  const ultimoCambio = (o: OrdenProduccion) =>
    o.historial[o.historial.length - 1]?.fechaHora ?? o.creadaEn;

  const esPizzaOrdenLinea = (linea: LineaOrden) =>
    esPizzaProducto(productoDeLinea(linea, productos));

  const nombreLineaOrden = (linea: LineaOrden) =>
    esPizzaOrdenLinea(linea) && linea.tamano
      ? `${linea.nombre} — ${linea.tamano}`
      : linea.nombre;

  const cantidadLineaOrden = (
    orden: OrdenProduccion,
    linea: LineaOrden,
    cantidad = linea.cantidadEstimada,
  ): string => {
    if (!esPizzaOrdenLinea(linea)) return fmtCant(cantidad, linea.unidad);
    if (orden.tipo === "pedido") return `${cantidad} porciones — ${linea.tamano ?? "Tamaño no definido"}`;
    return `${cantidad} ${cantidad === 1 ? "pizza" : "pizzas"}`;
  };

  const resumenCortes = (linea: LineaOrden): string | null => {
    const mediana = linea.pizzasMedianas;
    const grande = linea.pizzasGrandes;
    if (mediana == null && grande == null) return null;
    return `${(mediana ?? 0) * 8} medianas + ${(grande ?? 0) * 6} grandes`;
  };
  const totalPorcionesPizza = (orden: OrdenProduccion, real = false) =>
    orden.lineas.reduce((total, linea) => {
      if (!esPizzaOrdenLinea(linea)) return total;
      const cantidad = real ? linea.cantidadReal ?? 0 : linea.cantidadEstimada;
      return total + cantidad;
    }, 0);
  const resumenCantidadPizzas = (orden: OrdenProduccion, real = false) => {
    const cantidad = totalPorcionesPizza(orden, real);
    if (orden.tipo === "pedido") return `${cantidad} porc.`;
    const cortesTexto = real ? orden.lineas.map(resumenCortes).filter(Boolean).join(" · ") : "";
    return `${cantidad} ${cantidad === 1 ? "pizza" : "pizzas"}${cortesTexto ? ` (${cortesTexto})` : ""}`;
  };

  const resumenProductos = (o: OrdenProduccion) => {
    const nombres = o.lineas.map((linea) => linea.nombre);
    if (nombres.length === 0) return "—";
    return nombres.length === 1 ? nombres[0] : `${nombres[0]} +${nombres.length - 1} más`;
  };



  // ── Numeración ─────────────────────────────────────────────────────
  const siguienteId = () => siguienteOrdenId(ordenes);

  /** Venta pagada y Por entregar que todavía no tiene orden.
      Una venta = una sola orden: el buscador manual y la creación automática
      de App comparten esta lista, así que no se puede duplicar. El estado
      Por entregar también se ofrece si una venta pagada quedó sin orden. */
  const ventasSinOrden = useMemo(() => {
    const conOrden = new Set(ordenes.map((o) => o.ventaId).filter(Boolean) as string[]);
    return ventas.filter(
      (v) => v.estado === "Por entregar" && !conOrden.has(v.id),
    );
  }, [ventas, ordenes]);

  // ── Guardar (compartido por Crear y Editar) contra la API ─────────
  // La validación de insumos en vivo (bloque 4) se mantiene: este guardado es
  // el que habla con el servidor y, si responde 409 con faltantes, se abren en
  // el modal "Inventario insuficiente".
  const guardarOrden = async (form: OrdenForm) => {
    const editando = editItem;
    // Los pedidos de venta los crea el backend al aceptarla: el POST de la API
    // solo registra Preparaciones.
    if (!editando && form.tipo === "pedido") {
      toast.error("Los pedidos de venta los crea el backend al aceptar la venta. Recarga la lista para verla.");
      return;
    }
    const lineasPayload = form.lineas
      .filter((l) => l.idProducto && l.cantidadEstimada > 0)
      .map((l) => esIdInsumo(l.idProducto)
        ? { id: l.idProducto, cantidad: l.cantidadEstimada }
        : {
            id_producto: Number(l.idProducto),
            cantidad: l.cantidadEstimada,
            ...(l.tamano ? { tamano: l.tamano as "Mediana" | "Grande" } : {}),
          });
    try {
      const guardada = editando
        ? await actualizarOrdenProduccion(editando.id, editando.tipo === "pedido"
            // Un pedido solo admite cambiar la observación.
            ? { observacion: form.observacion }
            : {
                fecha_solicitada: form.fechaSolicitada,
                hora_solicitada: form.horaSolicitada || null,
                observacion: form.observacion,
                lineas: lineasPayload,
              })
        : await crearOrdenPreparacionApi({
            fecha_solicitada: form.fechaSolicitada,
            hora_solicitada: form.horaSolicitada || null,
            observacion: form.observacion,
            lineas: lineasPayload,
          });
      setOrdenes((p) => (editando ? p.map((o) => (o.id === guardada.id ? guardada : o)) : [guardada, ...p]));
      setShowCreate(false);
      setEditItem(null);
      setForm(emptyForm());
      toast.success(editando ? `Orden ${guardada.id} actualizada` : `Orden de producción ${guardada.id} creada`);
    } catch (error) {
      const faltantes = ((error as ErrorConFaltantes).faltantes ?? []).map(mapearFaltanteApi);
      if (faltantes.length > 0) {
        setFaltantesIniciar({ ordenId: editando?.id ?? "", faltantes });
        return;
      }
      toast.error(mensajeErrorOrdenes(error, "No se pudo guardar la orden."));
    }
  };

  /** Bloque 4 — Validación de insumos al GUARDAR (crear y editar):
      • PREPARACIÓN en lote: si faltan insumos NO se guarda. El botón ya
        viene deshabilitado con el mensaje "No hay la cantidad suficiente de
        insumos. Por favor, disminuye la cantidad." y su lista dentro del
        modal (mismo criterio A1 que al crear un producto insumo en Insumos);
        este toque evita cualquier atajo. No existe "Guardar igual".
      • PEDIDO (viene de una venta pagada): NUNCA bloquea. Los faltantes y
        las líneas cuya receta no se pudo calcular (pizza sin ficha técnica,
        producto del menú sin resolver) abren el aviso con "Guardar igual";
        la orden queda Pendiente con su badge y el bloqueo real sigue en
        Iniciar (flujo ya existente). */
  const guardarConValidacion = (form: OrdenForm) => {
    if (form.tipo === "pedido") {
      guardarOrden(form);
      return;
    }

    const requeridos = requeridosDePreparaciones(
      prepararLineasSnapshot(form.lineas, fichasPorProducto),
      fichasPorProducto,
      insumos,
    );
    if (faltantesPara(requeridos, 1, insumos).length > 0) {
      toast.error("No hay la cantidad suficiente de insumos. Por favor, disminuye la cantidad.");
      return;
    }
    guardarOrden(form);
  };

  const handleCreate = () => {
    if (form.tipo === "pedido") {
      if (!form.ventaId) {
        toast.error("Elige la venta que se va a preparar");
        return;
      }
      const estadoVenta = ventas.find((v) => v.id === form.ventaId)?.estado;
      if (estadoVenta !== "Por entregar") {
        toast.error("Solo se puede preparar una venta pagada (Por entregar)");
        return;
      }
      if (ordenes.some((o) => o.ventaId === form.ventaId)) {
        toast.error("Esa venta ya tiene una orden de producción");
        return;
      }
    } else if (preparacionInvalida(form.lineas, productos)) {
      // C6: producto elegido y cantidad ≥ 1 en cada línea. El error ya se
      // pinta en la propia línea y el botón Crear viene bloqueado.
      toast.error("Elige el producto y una cantidad entera mayor o igual a 1 en cada línea");
      return;
    }
    guardarConValidacion(form);
  };

  const handleEdit = () => {
    if (!editItem) return;
    if (editItem.tipo === "preparacion" && preparacionInvalida(editItem.lineas, productos)) {
      toast.error("Elige producto y una cantidad entera mayor o igual a 1 en cada línea");
      return;
    }
    guardarConValidacion({
      tipo: editItem.tipo,
      lineas: editItem.lineas,
      ventaId: editItem.ventaId ?? null,
      fechaSolicitada: editItem.fechaSolicitada,
      horaSolicitada: editItem.horaSolicitada,
      observacion: editItem.observacion,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await eliminarOrdenProduccion(id);
    } catch (error) {
      // El backend solo deja eliminar Preparaciones Pendientes (un pedido → 409).
      toast.error(mensajeErrorOrdenes(error, "No se pudo eliminar la orden."));
      setDeleteId(null);
      return;
    }
    setOrdenes((p) => p.filter((o) => o.id !== id));
    setDeleteId(null);
    toast.success("Orden eliminada");
  };

  // ── Movimientos de inventario ─────────────────────────────────────
  // Regla: los insumos se descuentan AL INICIAR —después de validar que
  // alcanzan— y el resto (stock de bebidas y producción del Producto Insumo)
  // AL COMPLETAR. Cada movimiento lleva su propia marca en la orden
  // (`insumosDescontados`, `productosDescontados`, `stockAplicado`), así que
  // se aplica UNA sola vez: con la marca encendida no se repite (orden
  // legacy, u orden que se vuelve a completar). Los cálculos se hacen FUERA
  // de los updaters de setState, nunca dentro de un updater.

  /** Descuento de insumos y Productos Insumo (la masa de la pizza cuenta como
      insumo): recibe los requeridos YA calculados. Al INICIAR salen del
      recálculo del pedido (o de la foto guardada en preparación en lote) y al
      COMPLETAR solo en órdenes legacy sin `insumosDescontados` (C2), desde la
      foto de la orden. El stock nunca baja de 0. */
  const descontarInsumos = (requeridos: InsumoRequerido[]) => {
    const aDescontar = new Map<string, number>();
    for (const r of requeridos) {
      // Resuelve igual que `faltantesPara`: primero por id real y, si la fila
      // de la ficha no lo trae, por nombre normalizado — así lo que pasó la
      // validación del Inicio es exactamente lo que se descuenta.
      const ins = insumos.find((i) => i.id === r.insumoId)
        ?? insumos.find((i) => normalizar(i.nombre) === normalizar(r.nombre));
      if (!ins) continue;
      const cant = convertirUnidad(r.cantidad, r.unidad, ins.unidadMedida);
      // Unidades incompatibles no llegan hasta acá: el Inicio las bloquea con
      // el modal de faltantes (motivo "unidad-incompatible").
      if (cant === null) continue;
      aDescontar.set(ins.id, (aDescontar.get(ins.id) ?? 0) + cant);
    }
    setInsumos((prev) => prev.map((i) => {
      const cant = aDescontar.get(i.id);
      if (cant === undefined) return i;
      // Con faltantes confirmados nunca se deja el stock en negativo: baja a 0.
      return { ...i, stockActual: Math.max(0, Math.round((i.stockActual - cant) * 1000) / 1000) };
    }));
  };

  const tiempoTotalOrden = (o: OrdenProduccion) => {
    if (o.tipo === "preparacion") {
      // Tiempo del snapshot de cada línea (si existe), si no, legacy.
      return o.lineas.reduce((s, l) => s + (l.fichaSnapshot?.tiempoPreparacion ?? insumos.find((i) => i.id === l.idProducto)?.tiempoPreparacion ?? 0), 0);
    }
    // Pedido de cliente: horneado fijo. El `tiempoPreparacion` de la ficha
    // técnica es de "Preparación en lote" y aquí no aplica.
    return HORNEADO_MIN;
  };

  /** Inicia la orden sin formulario: el backend toma cantidades y fecha límite de la propia orden. */
  const iniciarDirecto = async (orden: OrdenProduccion) => {
    if (iniciandoId) return;
    setIniciandoId(orden.id);
    try {
      const actualizada = await iniciarOrdenProduccion(orden.id, {});
      setOrdenes((p) => p.map((o) => (o.id === orden.id ? actualizada : o)));
      toast.success("Se inició la orden de producción");
      await recargarProduccion?.();
    } catch (error) {
      const faltantes = ((error as ErrorConFaltantes).faltantes ?? []).map(mapearFaltanteApi);
      if (faltantes.length > 0) {
        setFaltantesIniciar({ ordenId: orden.id, faltantes });
        return;
      }
      toast.error(mensajeErrorOrdenes(error, "No se pudo iniciar la orden."));
    } finally {
      setIniciandoId(null);
    }
  };

  const abrirCompletar = async (id: string) => {
    const orden = ordenes.find((o) => o.id === id);
    if (!orden) return;
    setCompletarItem(orden);
    setReales({});
    setPreciosCompletar({});
    setCalculosDebidos({});
    if (orden.tipo !== "preparacion") return;
    setCargandoCalculoDebido(true);
    try {
      const { lineas } = await obtenerCalculoVerificacionOrden(orden.id);
      setCalculosDebidos(Object.fromEntries(lineas.map((linea) => [linea.id_detalle_op, linea])));
    } catch (error) {
      toast.error(mensajeErrorOrdenes(error, "No se pudo calcular la cantidad que debió hacerse."));
    } finally {
      setCargandoCalculoDebido(false);
    }
  };

  const cantidadesVerificacionOk = (o: OrdenProduccion | null): boolean =>
    !!o && o.lineas.every((linea, i) => {
      const realTexto = (reales[i] ?? "").trim();
      const real = Number(realTexto);
      const calculo = linea.idDetalleOp == null ? undefined : calculosDebidos[linea.idDetalleOp];
      return realTexto !== ""
        && Number.isSafeInteger(real)
        && real >= 0
        && calculo != null
        && Number.isSafeInteger(calculo.cantidad_debida)
        && calculo.cantidad_debida >= 0
        && real <= calculo.cantidad_debida;
    });
  const completarEsPedido = completarItem?.tipo === "pedido";
  // Precios por porción: una sección por cada pizza distinta de la preparación.
  const pizzasCompletar: Producto[] = completarItem?.tipo === "preparacion"
    ? Array.from(new Set(completarItem.lineas.map((l) => l.idProducto)))
        .map((id) => productos.find((p) => p.id === id))
        .filter((p): p is Producto => !!p && esPizzaProducto(p))
    : [];
  const preciosActualesDe = (p: Producto) => ({
    Mediana: Number(p.precioUnitario ?? 0),
    Grande: Number(p.precioGrande ?? 0),
  });
  const precioRecomendadoPizza = (p: Producto, tamano: "Mediana" | "Grande"): number => {
    const ficha = fichaVigente(fichasPorProducto, p.id);
    if (!ficha || !parametrosCostos) return 0;
    return precioRecomendadoPorPorcion(ficha, insumos, parametrosCostos, tamano);
  };
  /** Costo de una porción del tamaño y tiempo de la ficha: explican de dónde
      sale el recomendado. */
  const detalleCostoPizza = (p: Producto, tamano: "Mediana" | "Grande") => {
    const ficha = fichaVigente(fichasPorProducto, p.id);
    if (!ficha || !parametrosCostos) return null;
    const resumen = calcularCostoProducto(ficha, insumos, parametrosCostos, tamano);
    return {
      resumen,
      sinTiempo: !(Number(ficha.tiempoPreparacion) > 0),
      igualado: tamano === "Grande" && recomendadoGrandeIgualado(ficha, insumos, parametrosCostos),
    };
  };
  const valorPrecioCompletar = (p: Producto, tamano: "Mediana" | "Grande"): string => {
    const escrito = preciosCompletar[`${p.id}:${tamano}`];
    if (escrito !== undefined) return escrito;
    const actual = preciosActualesDe(p)[tamano];
    const base = actual > 0 ? actual : precioRecomendadoPizza(p, tamano);
    return base > 0 ? String(base) : "";
  };
  const tamanosDeOrden = (_p: Producto): Set<"Mediana" | "Grande"> =>
    new Set(["Mediana", "Grande"]);
  /** Precio que quedaría guardado: el de pantalla para los tamaños de la orden
      (o escritos) y el ya guardado para el otro tamaño. */
  const precioEfectivoPizza = (p: Producto, tamano: "Mediana" | "Grande"): number => {
    if (tamanosDeOrden(p).has(tamano)) {
      return Number(valorPrecioCompletar(p, tamano));
    }
    return preciosActualesDe(p)[tamano];
  };
  const grandeNoMayorQueMediana = (p: Producto): boolean => {
    const m = precioEfectivoPizza(p, "Mediana");
    const g = precioEfectivoPizza(p, "Grande");
    return m > 0 && g > 0 && g <= m;
  };
  const mostrarTamanoPizza = (p: Producto, tamano: "Mediana" | "Grande"): boolean =>
    tamanosDeOrden(p).has(tamano);
  const pizzasConPrecioCompletar = pizzasCompletar.filter(pizza => tamanosDeOrden(pizza).size > 0);
  const cantidadesCompletar = completarEsPedido ? [] : (completarItem?.lineas ?? []).map((l, i) => {
    const realTxt = reales[i] ?? "";
    const calculo = l.idDetalleOp == null ? undefined : calculosDebidos[l.idDetalleOp];
    const debida = calculo?.cantidad_debida;
    const real = Number(realTxt);
    const realInvalida = realTxt.trim() === "" || !Number.isSafeInteger(real) || real < 0;
    const realExcede = !realInvalida && debida != null && real > debida;
    const invalido = realInvalida || debida == null;
    const merma = invalido ? 0 : Math.max(0, debida - real);
    return { realTxt, calculo, debida, real, realInvalida, realExcede, invalido, merma };
  });
  const preciosCompletarOk = pizzasCompletar.every((p) =>
    Array.from(tamanosDeOrden(p)).every((t) => precioEfectivoPizza(p, t) > 0)
    && !grandeNoMayorQueMediana(p));
  const completarOk = !completarItem || completarEsPedido
    || (!cargandoCalculoDebido && cantidadesVerificacionOk(completarItem) && preciosCompletarOk);

  /** Completa la producción; el backend aplica stock y registra la merma en
      la misma transacción. */
  const confirmarCompletar = async () => {
    if (!completarItem) return;
    const orden = ordenes.find((o) => o.id === completarItem.id);
    if (!orden) return;

    if (orden.tipo === "preparacion" && !cantidadesVerificacionOk(orden)) {
      toast.error("Indica una cantidad real entera mayor o igual a cero.");
      return;
    }

    // Solo viajan los precios que cambian o que aún están en 0.
    const preciosPizzas = pizzasCompletar.flatMap((p) => {
      const actuales = preciosActualesDe(p);
      const enOrden = tamanosDeOrden(p);
      const enviar = (t: "Mediana" | "Grande") => {
        if (!enOrden.has(t)) return undefined;
        const valor = Number(valorPrecioCompletar(p, t));
        return valor > 0 && (actuales[t] <= 0 || valor !== actuales[t]) ? valor : undefined;
      };
      const mediana = enviar("Mediana");
      const grande = enviar("Grande");
      const item = {
        idProducto: Number(p.id),
        ...(mediana !== undefined ? { precioMediana: mediana } : {}),
        ...(grande !== undefined ? { precioGrande: grande } : {}),
      };
      return item.precioMediana !== undefined || item.precioGrande !== undefined ? [item] : [];
    });

    try {
      const actualizada = await completarOrdenProduccion(
        orden.id,
        orden.tipo === "preparacion"
          ? orden.lineas
              .map((l, i) => ({
                idDetalleOp: l.idDetalleOp ?? 0,
                cantidadReal: Number(reales[i]),
              }))
              .filter((l) => l.idDetalleOp > 0)
          : undefined,
        preciosPizzas,
      );
      setOrdenes((p) => p.map((o) => (o.id === orden.id ? actualizada : o)));
      toast.success(`${orden.id} completada`);

      // Merma: solo "Preparación en lote". El registro ya lo creó el backend;
      // aquí solo se avisa por línea (esa cantidad nunca entró al stock).
      if (orden.tipo === "preparacion") {
        orden.lineas.forEach((l, i) => {
          const calculo = l.idDetalleOp == null ? undefined : calculosDebidos[l.idDetalleOp];
          const merma = Math.max(0, Number(calculo?.cantidad_debida ?? 0) - Number(reales[i]));
          if (merma > 0) toast.success(`Se registró la pérdida de ${l.nombre} en Productos no conformes`);
        });
      }
      setCompletarItem(null);
      setReales({});
      setCalculosDebidos({});
      // El stock de los insumos cambió en la base.
      await recargarProduccion?.();
    } catch (error) {
      toast.error(mensajeErrorOrdenes(error, "No se pudo completar la orden."));
    }
  };

  // ── Dar de baja (no se toca el flujo) ──────────────────────────────
  const openDarBaja = (o: OrdenProduccion) => {
    const primera = o.lineas[0];
    setDarBajaItem(o);
    setDarBajaForm({
      idProducto: primera?.idProducto ?? "",
      unidadMedida: primera?.unidad ?? "und",
      cantidad: primera?.cantidadEstimada ?? 1,
      fechaRegistro: new Date().toLocaleDateString("en-CA"),
      motivo: MOTIVOS[0],
      descripcion: "",
    });
  };

  const confirmarDarBaja = async () => {
    if (!darBajaForm || !darBajaItem) return;
    if (!darBajaForm.descripcion.trim()) {
      toast.error("Describe el motivo de la baja");
      return;
    }
    try {
      // El motivo y la descripción van al backend, que los guarda en el
      // historial de la orden (dar de baja no crea un producto no conforme).
      const actualizada = await darBajaOrdenProduccion(
        darBajaItem.id,
        darBajaForm.motivo,
        darBajaForm.descripcion.trim(),
      );
      setOrdenes((p) => p.map((o) => (o.id === actualizada.id ? actualizada : o)));
      toast.success(`Orden ${actualizada.id} dada de baja`);
      await recargarProduccion?.();
    } catch (error) {
      toast.error(mensajeErrorOrdenes(error, "No se pudo dar de baja la orden."));
      return;
    }
    setDarBajaItem(null);
    setDarBajaForm(null);
  };

  // ── Modales ────────────────────────────────────────────────────────
  const Modal = ({ title, onClose, onConfirm, label, deshabilitado, children }: {
    title: string; onClose: () => void; onConfirm: () => void; label: string;
    ancho?: string;
    /** C6: bloquea el botón de confirmar (preparaciones con cantidad < 1). */
    deshabilitado?: boolean;
    crear?: boolean;
    children: React.ReactNode;
  }) => (
    <>
      <div className="pn-dialogo-fondo" onClick={onClose} />
      <div className="pn-modal pn-modal--medio" role="dialog" aria-modal="true" aria-label={title} style={{ width: "min(96vw, 56.25rem)" }}>
        <div className="pn-modal__cab"><h2 className="pn-modal__titulo">{title}</h2></div>
        <div className="pn-campo">{children}</div>
        <div className="pn-dialogo__botones" style={{ marginTop: "1.125rem", justifyContent: "flex-start" }}>
          <BotonAccion variante="normal" onClick={onClose}>Cancelar</BotonAccion>
          <BotonAccion variante="principal" onClick={onConfirm} disabled={deshabilitado}>{label}</BotonAccion>
        </div>
      </div>
    </>
  );

  const confirmarPedidoListo = async () => {
    if (!ordenLista || marcandoLista) return;
    setMarcandoLista(true);
    try {
      const actualizada = await completarOrdenProduccion(ordenLista.id);
      setOrdenes((prev) => prev.map((o) => o.id === actualizada.id ? actualizada : o));
      onPedidoListo?.(actualizada);
      setOrdenLista(null);
      const numero = actualizada.ventaNumero ?? actualizada.ventaId;
      toast.success(`Pedido listo${actualizada.estadoVenta === "Completado" ? ` · venta ${numero} completada` : actualizada.estadoVenta === "Por entregar" && !actualizada.ventaLocal ? " · la venta se completará a la hora de recogida" : ""}`);
    } catch (error) {
      toast.error(mensajeErrorOrdenes(error, "No se pudo marcar el pedido como listo."));
    } finally {
      setMarcandoLista(false);
    }
  };

  const accionesListado = (o: OrdenProduccion, tieneFaltantes: boolean) => (
    <div className="flex items-center gap-1 whitespace-nowrap">
      {o.estadoOrden === "pendiente" && !tieneFaltantes && (
        <button type="button" onClick={() => void iniciarDirecto(o)} disabled={iniciandoId !== null}
          title="Iniciar orden de producción" aria-label="Iniciar orden de producción"
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          <Play className="w-4 h-4" />
        </button>
      )}
      {o.estadoOrden === "en-proceso" && o.tipo !== "pedido" && (
        <button type="button" onClick={() => abrirCompletar(o.id)}
          title="Completar orden" aria-label="Completar orden"
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
          <CheckCircle2 className="w-4 h-4" />
        </button>
      )}
      {canEdit && o.tipo === "pedido" && o.estadoOrden === "en-proceso" && (
        <button type="button" onClick={() => setOrdenLista(o)} disabled={marcandoLista}
          title="Marcar como listo" aria-label="Marcar como listo"
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          <CheckCircle2 className="w-4 h-4" />
        </button>
      )}
      <ActionIcons
        onView={() => setDetailItem(o)}
        onDelete={canDelete && o.estadoOrden === "pendiente" && o.tipo !== "pedido" ? () => setDeleteId(o.id) : undefined}
        deleteTitle={o.tipo === "pedido" ? "Los pedidos no se eliminan: usa Dar de baja" : "Eliminar preparación pendiente"}
      />
      {(o.estadoOrden === "pendiente" || o.estadoOrden === "en-proceso") && (
        <button type="button" onClick={() => openDarBaja(o)}
          title="Cancelar orden" aria-label="Cancelar orden"
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
          <Ban className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  // ── Lista como la ve la cocina ──
  const [verOtras, setVerOtras] = useState(false);
  const [empezarItem, setEmpezarItem] = useState<OrdenProduccion | null>(null);
  const [bloqueoEmpezar, setBloqueoEmpezar] = useState<{ orden: OrdenProduccion; faltantes: ReturnType<typeof faltantesPara> } | null>(null);
  const hoyLocal = new Date().toLocaleDateString("en-CA");
  const esHoy = (iso: string) => !!iso && new Date(iso).toLocaleDateString("en-CA") === hoyLocal;
  const numeroOP = (id: string) => id.replace("OP-", "");
  const enCocina = filtradas.filter((o) => o.estadoOrden === "en-proceso");
  const porEmpezar = filtradas.filter((o) => o.estadoOrden === "pendiente");
  const terminadasHoy = filtradas.filter((o) => o.estadoOrden === "completada" && esHoy(ultimoCambio(o)));
  const idsAgrupadas = new Set([...enCocina, ...porEmpezar, ...terminadasHoy].map((o) => o.id));
  const otras = filtradas.filter((o) => !idsAgrupadas.has(o.id));
  const totalPagesOtras = Math.ceil(otras.length / PER_PAGE);
  const pagedOtras = otras.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const ESTADO_GLORIA: Record<EstadoOrden, string> = {
    pendiente: "Por empezar",
    "en-proceso": "En la cocina",
    completada: "Terminada",
    cancelada: "Cancelada",
  };
  const TONO_ESTADO: Record<EstadoOrden, TonoPill> = { pendiente: "ambar", "en-proceso": "azul", completada: "verde", cancelada: "gris" };

  const faltantesDe = (o: OrdenProduccion) =>
    o.tipo === "preparacion" && o.estadoOrden === "pendiente" ? faltantesPara(o.insumosRequeridos, 1, insumos) : [];

  const tarjetaOrden = (o: OrdenProduccion) => {
    const falt = faltantesDe(o);
    const esPedido = o.tipo === "pedido";
    const productosTxt = o.lineas.map((l) => l.nombre).join(", ") || "—";
    const paraQuien = esPedido
      ? `Para ${o.cliente ?? "un cliente"}${o.ventaNumero ? ` · pedido #${o.ventaNumero}` : ""}${o.fechaSolicitada ? ` · recoge ${formatearFechaHora(o.fechaSolicitada, o.horaSolicitada)}` : ""}${o.ventaLocal ? " · venta del local" : ""}`
      : o.observacion?.trim() || "Para tener listo en la bodega";
    const tiempo =
      o.estadoOrden === "en-proceso"
        ? (esPedido && o.finCalentamientoMs != null
            ? `Listo en ${tiempoRestante(o.finCalentamientoMs, ahoraCalentamiento)}`
            : !esPedido && o.finPreparacionMs != null
              ? `Listo en ${tiempoRestante(o.finPreparacionMs, ahoraCalentamiento)}`
              : "Se está preparando")
        : o.estadoOrden === "completada"
          ? `Terminada ${formatearFechaHora(ultimoCambio(o))}`
          : o.estadoOrden === "cancelada"
            ? `Cancelada ${formatearFechaHora(ultimoCambio(o))}`
            : o.tiempoPreparacionMin
              ? `Tiempo de preparación ${o.tiempoPreparacionMin} minutos`
              : "Por empezar";
    return (
      <TarjetaFila
        key={o.id}
        resaltada={o.estadoOrden === "en-proceso" ? "azul" : undefined}
        pre={
          <span className="inline-flex flex-wrap items-center gap-2">
            Orden OP-{numeroOP(o.id)}
            <EstadoPill tono={esPedido ? "azul" : "ambar"}>{esPedido ? "Pedido de cliente" : "Para tener listo"}</EstadoPill>
          </span>
        }
        nombre={productosTxt}
        detalle={paraQuien}
        datos={[{ etiqueta: "Tiempo", valor: <span style={{ color: o.estadoOrden === "en-proceso" ? "var(--azul-texto)" : o.estadoOrden === "completada" ? "var(--verde-texto)" : undefined }}>{tiempo}</span> }]}
        estado={
          <div className="grid gap-2 justify-items-start">
            <EstadoPill tono={TONO_ESTADO[o.estadoOrden]}>{ESTADO_GLORIA[o.estadoOrden]}</EstadoPill>
            {falt.length > 0 && <EstadoPill tono="ambar">Faltan insumos</EstadoPill>}
            <EstimacionPedido orden={o} />
          </div>
        }
        acciones={
          <>
            {o.estadoOrden === "pendiente" && (
              <BotonAccion
                variante="principal"
                disabled={iniciandoId !== null}
                onClick={() => (falt.length > 0 ? setBloqueoEmpezar({ orden: o, faltantes: falt }) : setEmpezarItem(o))}
              >
                Empezar a preparar
              </BotonAccion>
            )}
            {o.estadoOrden === "en-proceso" && o.tipo !== "pedido" && (
              <BotonAccion variante="bien" onClick={() => abrirCompletar(o.id)}>Ya está listo</BotonAccion>
            )}
            {canEdit && o.estadoOrden === "en-proceso" && esPedido && (
              <BotonAccion variante="bien" disabled={marcandoLista} onClick={() => setOrdenLista(o)}>Ya está listo</BotonAccion>
            )}
            {o.estadoOrden === "completada" && (
              <BotonAccion variante="principal" onClick={() => setDetailItem(o)}>Ver qué se usó</BotonAccion>
            )}
            <BotonAccion variante="normal" onClick={() => setDetailItem(o)}>Ver la orden</BotonAccion>
            {(o.estadoOrden === "pendiente" || o.estadoOrden === "en-proceso") && (
              <BotonAccion variante="peligro" onClick={() => openDarBaja(o)}>Dar de baja</BotonAccion>
            )}
            {canDelete && o.estadoOrden === "pendiente" && o.tipo !== "pedido" && (
              <BotonAccion variante="peligro" onClick={() => setDeleteId(o.id)}>Borrar</BotonAccion>
            )}
          </>
        }
      />
    );
  };

  const grupo = (titulo: string, lista: OrdenProduccion[]) =>
    lista.length === 0 ? null : (
      <section key={titulo} style={{ marginBottom: "1.75rem" }}>
        <h2 className="pn-h2" style={{ marginBottom: "0.75rem" }}>{titulo}</h2>
        <div className="pn-lista">{lista.map(tarjetaOrden)}</div>
      </section>
    );

  return (
    <div className="pn-contenido">
      <EncabezadoPagina
        titulo="Orden de Producción"
        descripcion="Lo que la cocina tiene que preparar: los pedidos de los clientes y lo que se hace para tener listo"
        acciones={
          <>
            <BotonAccion icono={Calculator} onClick={() => setMostrarParametrosCostos(true)}>Costos de preparación</BotonAccion>
            {canExportExcel && <BotonAccion icono={Download} onClick={() => exportExcel(ordenes)}>Descargar en Excel</BotonAccion>}
            {canCreate && (
              <BotonAccion
                variante="principal"
                icono={Plus}
                onClick={async () => {
                  try {
                    const recargaExitosa = await recargarProduccion?.();
                    if (recargaExitosa === false) {
                      toast.warning("No se pudieron actualizar los productos y fichas. Se abrirá el formulario con los datos actuales.");
                    }
                  } catch {
                    toast.warning("No se pudieron actualizar los productos y fichas. Se abrirá el formulario con los datos actuales.");
                  } finally {
                    setForm(emptyForm());
                    setShowCreate(true);
                  }
                }}
              >
                Mandar a preparar
              </BotonAccion>
            )}
          </>
        }
      />

      {mostrarParametrosCostos && (
        <ParametrosCostosModal
          parametros={parametrosCostos}
          cargando={parametrosCostosCargando}
          error={parametrosCostosError}
          puedeEditar={esAdministradorSesion}
          onReintentar={() => void cargarParametrosCostos()}
          onCerrar={() => setMostrarParametrosCostos(false)}
          onGuardar={guardarCostos}
        />
      )}

      <div className="grid gap-4 mb-6">
        <BuscadorGrande
          etiqueta="Buscar una orden"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Escribe el número, el pedido, el cliente o el producto"
        />
        {verOtras && (
          <>
            <FiltrosChips
              titulo="Clase:"
              valor={filtroTipo}
              onChange={(v) => { setFiltroTipo(v as typeof filtroTipo); setPage(1); }}
              opciones={[
                { valor: "todos", etiqueta: "Todas" },
                { valor: "pedido", etiqueta: "Pedidos de clientes" },
                { valor: "preparacion", etiqueta: "Para tener listo" },
              ]}
            />
            <FiltrosChips
              valor={filtroEstado}
              onChange={(v) => { setFiltroEstado(v as typeof filtroEstado); setPage(1); }}
              opciones={[{ valor: "todos", etiqueta: "Todos" }, ...ORDEN_ESTADOS.map((e) => ({ valor: e, etiqueta: ESTADO_GLORIA[e] }))]}
            />
          </>
        )}
      </div>

      {cargando ? (
        <p role="status" className="pn-nota">Cargando las órdenes…</p>
      ) : errorCarga ? (
        <AvisoBanner
          titulo="No pudimos cargar las órdenes"
          boton={onReintentar ? <BotonAccion onClick={onReintentar}>Intentar de nuevo</BotonAccion> : undefined}
        >
          {errorCarga}
        </AvisoBanner>
      ) : (
        <>
          {enCocina.length + porEmpezar.length + terminadasHoy.length === 0 && !verOtras && (
            <VacioEstado icono={ChefHat} titulo="La cocina está tranquila">
              No hay nada en la cocina ni por empezar. Cuando llegue un pedido o mandes a preparar algo, aparecerá aquí.
            </VacioEstado>
          )}
          {grupo("En la cocina ahora", enCocina)}
          {grupo("Por empezar", porEmpezar)}
          {grupo("Terminadas hoy", terminadasHoy)}

          <div style={{ margin: "0.5rem 0 1.25rem" }}>
            <BotonAccion variante="normal" onClick={() => { setVerOtras((v) => !v); setPage(1); }}>
              {verOtras ? "Esconder las órdenes de días anteriores" : "Ver órdenes de días anteriores y canceladas"}
            </BotonAccion>
          </div>
          {verOtras && (
            <section>
              <h2 className="pn-h2" style={{ marginBottom: "0.75rem" }}>Días anteriores y canceladas</h2>
              {otras.length === 0 ? (
                <p className="pn-nota">No hay más órdenes con estos filtros.</p>
              ) : (
                <div className="pn-lista">{pagedOtras.map(tarjetaOrden)}</div>
              )}
              <PaginadorGrande pagina={page} total={otras.length} porPagina={PER_PAGE} onCambiar={setPage} />
            </section>
          )}
        </>
      )}

      {/* Confirmaciones */}
      <DialogoConfirmacion
        abierto={!!ordenLista}
        onCambiarAbierto={(a) => { if (!a && !marcandoLista) setOrdenLista(null); }}
        titulo={`¿El pedido #${ordenLista?.ventaNumero ?? ordenLista?.ventaId ?? ""} ya está listo?`}
        queVaAPasar={["La orden queda terminada", "Se descuentan de la bodega los insumos usados", "La venta sigue su camino hacia la entrega"]}
        textoSeguro="No, todavía no"
        textoAccion={marcandoLista ? "Guardando…" : "Sí, ya está listo"}
        onConfirmar={() => void confirmarPedidoListo()}
      />
      <DialogoConfirmacion
        abierto={!!empezarItem}
        onCambiarAbierto={(a) => { if (!a) setEmpezarItem(null); }}
        titulo={`¿Empezar la orden OP-${numeroOP(empezarItem?.id ?? "")}?`}
        queVaAPasar={[
          empezarItem?.tiempoPreparacionMin ? `El tiempo empieza a correr: ${empezarItem.tiempoPreparacionMin} minutos` : "El tiempo empieza a correr",
          "Se descuentan de la bodega los insumos que necesita",
        ]}
        textoSeguro="No, todavía no"
        textoAccion="Sí, empezar"
        onConfirmar={() => { if (empezarItem) void iniciarDirecto(empezarItem); }}
      />
      {bloqueoEmpezar && (
        <DialogoConfirmacion
          variante="bloqueo"
          abierto
          onCambiarAbierto={(a) => { if (!a) setBloqueoEmpezar(null); }}
          titulo={`No alcanza para empezar la orden OP-${numeroOP(bloqueoEmpezar.orden.id)}`}
          porQueNo={bloqueoEmpezar.faltantes.map((f) => `Faltan ${fmtCant(f.falta, f.unidad)} de ${f.nombre} (hay ${fmtCant(f.stock, f.unidad)})`)}
          textoEntendido="Cerrar"
          textoAlternativa="Pedirlo al proveedor"
          onAlternativa={() => onNavigateTo?.("orden-compra")}
        />
      )}
      <DialogoConfirmacion
        abierto={!!deleteId}
        onCambiarAbierto={(a) => { if (!a) setDeleteId(null); }}
        titulo={`¿Borrar la orden OP-${numeroOP(deleteId ?? "")}?`}
        queVaAPasar={["No se ha empezado", "No se puede deshacer"]}
        textoAccion="Sí, borrar la orden"
        onConfirmar={() => { if (deleteId) void handleDelete(deleteId); }}
      />

      {/* ── Modal: Crear ── */}
      <AnimatePresence>
        {showCreate && Modal({
          title: "Mandar a preparar",
          onClose: () => setShowCreate(false),
          onConfirm: handleCreate,
          label: "Mandar a la cocina",
          ancho: "max-w-[50rem]",
          crear: true,
          // C6: Crear bloqueado mientras alguna línea no tenga producto o su
          // cantidad sea menor a 1; Bloque 4: también mientras falten insumos
          // para la preparación (igual que al crear producto insumo en Insumos).
          deshabilitado: form.tipo === "preparacion"
            && (preparacionInvalida(form.lineas, productos, false) || faltantesForm.length > 0),
          children: (
            <div className="space-y-6">
              {/* Solo se crean Preparaciones en lote: los pedidos los crea el
                  backend al aceptar una venta. */}
              <h3 className="text-xl font-bold" style={{ fontFamily: SERIF }}>1 · ¿Qué hay que preparar?</h3>
              <div className="space-y-4">
                {form.lineas.map((l, idx) => (
                  <LineaPreparacion
                    key={`${versionForm}-${idx}`}
                    linea={l}
                    insumos={insumos}
                    productos={productos}
                    fichas={fichasPorProducto}
                    puedeQuitar={form.lineas.length > 1}
                    onChange={(nl) => setForm(p => ({ ...p, lineas: p.lineas.map((x, i) => i === idx ? nl : x) }))}
                    onRemove={() => setForm(p => ({ ...p, lineas: p.lineas.filter((_, i) => i !== idx) }))}
                  />
                ))}
              </div>
              <button type="button"
                onClick={() => setForm(p => ({ ...p, lineas: [...p.lineas, nuevaLinea("preparacion")] }))}
                className="inline-flex items-center justify-center gap-2.5 w-full h-[3.375rem] border-[1.5px] border-dashed border-border rounded-[0.875rem] text-[0.9375rem] font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
                <Plus className="w-[1.125rem] h-[1.125rem]" /> Agregar otro producto
              </button>

              {/* Bloque 4: mientras falten insumos el botón Crear viene
                  deshabilitado y aquí se ven el mensaje y la lista. */}
              <h3 className="text-xl font-bold" style={{ fontFamily: SERIF }}>2 · ¿Alcanza lo de la bodega?</h3>
              {faltantesForm.length === 0 && (
                <p className="flex items-center gap-3 text-lg" style={{ margin: 0 }}>
                  <EstadoPill tono="verde">✓ Alcanza</EstadoPill>
                  <span>Hay insumos suficientes para lo que escogiste.</span>
                </p>
              )}
              <AvisoFaltantes
                faltantes={faltantesForm}
                onIrInsumos={() => onNavigateTo?.("supplies")}
                insumos={insumos}
                onComprar={comprarDesdeCrear}
                onPreparar={(f) => prepararFaltante(f, true)}
              />

              <h3 className="text-xl font-bold" style={{ fontFamily: SERIF }}>3 · Detalles</h3>
              <div>
                <label className="pn-etiqueta">Nota para la cocina <span style={{ fontWeight: 400 }}>(opcional)</span></label>
                <textarea value={form.observacion} onChange={e => setForm(p => ({ ...p, observacion: e.target.value }))}
                  rows={2} placeholder="Notas adicionales sobre esta orden..." className={OBS_CREAR_CLS} />
              </div>
            </div>
          ),
        })}
      </AnimatePresence>

      {/* ── Modal: Editar (solo Pendiente) ── */}
      <AnimatePresence>
        {editItem && Modal({
          title: `Cambiar la orden OP-${editItem.id.replace("OP-", "")}`,
          onClose: () => setEditItem(null),
          onConfirm: handleEdit,
          label: "Guardar cambios",
          ancho: "max-w-2xl",
          // C6: ídem Crear; Bloque 4: además deshabilitado mientras falten
          // insumos para la preparación (sin "Guardar igual": eso es de pedido).
          deshabilitado: editItem.tipo === "preparacion"
            && (preparacionInvalida(editItem.lineas, productos) || faltantesForm.length > 0),
          children: (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/60 rounded-xl border border-border">
                <span className="text-xs font-semibold text-muted-foreground">Tipo</span>
                <span className={`inline-block text-[0.625rem] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
                  editItem.tipo === "preparacion" ? "bg-purple-100 text-purple-800" : "bg-teal-100 text-teal-800"}`}>
                  {TIPO_LABEL[editItem.tipo]}
                </span>
                {editItem.ventaNumero && <span className="text-xs text-muted-foreground">· Venta {editItem.ventaNumero}</span>}
              </div>

              {editItem.tipo === "preparacion" ? (
                <div className="space-y-3">
                  {editItem.lineas.map((l, idx) => (
                    <LineaPreparacion
                      key={idx}
                      linea={l}
                      insumos={insumos}
                      productos={productos}
                      fichas={fichasPorProducto}
                      puedeQuitar={editItem.lineas.length > 1}
                      onChange={(nl) => setEditItem(x => x && ({ ...x, lineas: x.lineas.map((y, i) => i === idx ? nl : y) }))}
                      onRemove={() => setEditItem(x => x && ({ ...x, lineas: x.lineas.filter((_, i) => i !== idx) }))}
                    />
                  ))}
                  <button type="button"
                    onClick={() => setEditItem(x => x && ({ ...x, lineas: [...x.lineas, nuevaLinea("preparacion")] }))}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-border rounded-xl text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
                    <Plus className="w-4 h-4" /> Agregar otro producto
                  </button>
                </div>
              ) : (
                <CamposPedido
                  form={{
                    tipo: "pedido",
                    lineas: editItem.lineas,
                    ventaId: editItem.ventaId ?? null,
                    fechaSolicitada: editItem.fechaSolicitada,
                    horaSolicitada: editItem.horaSolicitada,
                    observacion: editItem.observacion,
                  }}
                  set={(f) => setEditItem(x => x && ({
                    ...x,
                    lineas: f.lineas,
                    observacion: f.observacion,
                  }))}
                  ventas={ventas}
                  ventasSinOrden={ventas.filter((v) => v.id === editItem.ventaId)}
                  ordenes={ordenes}
                  productos={productos}
                  fichas={fichasPorProducto}
                  insumos={insumos}
                />
              )}

              {/* Bloque 4: ídem Crear — mensaje y lista mientras falten
                  insumos; el botón Guardar queda deshabilitado. */}
              <h3 className="text-xl font-bold" style={{ fontFamily: SERIF }}>¿Alcanza lo de la bodega?</h3>
              {faltantesForm.length === 0 && (
                <p className="flex items-center gap-3 text-lg" style={{ margin: 0 }}>
                  <EstadoPill tono="verde">✓ Alcanza</EstadoPill>
                  <span>Hay insumos suficientes para lo que escogiste.</span>
                </p>
              )}
              <AvisoFaltantes faltantes={faltantesForm} onIrInsumos={() => onNavigateTo?.("supplies")} />

              <div>
                <label className="pn-etiqueta">Nota para la cocina <span style={{ fontWeight: 400 }}>(opcional)</span></label>
                <textarea value={editItem.observacion} onChange={e => setEditItem(x => x && ({ ...x, observacion: e.target.value }))}
                  rows={2} className={tCls} />
              </div>
            </div>
          ),
        })}
      </AnimatePresence>

      {/* ── Modal: Completar ── */}
      <AnimatePresence>
        {completarItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
              className="bg-card rounded-2xl w-full max-w-2xl shadow-2xl border border-border max-h-[90vh] flex flex-col my-4">
              <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
                  Terminar la orden OP-{completarItem.id.replace("OP-", "")}
                </h3>
                <button onClick={() => { setCompletarItem(null); setReales({}); setCalculosDebidos({}); }} className="p-1.5 max-md:p-3.5 max-md:-m-2 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 pn-campo">
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted p-3">
                  <div>
                    <p className="text-base font-semibold text-muted-foreground">Tipo</p>
                    <p className="text-sm font-semibold text-foreground">{completarEsPedido ? "Pedido" : "Preparación"}</p>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-muted-foreground">
                      {completarItem.ventaLocal ? "Origen" : completarEsPedido ? "Fecha/hora de recogida" : "Fecha límite"}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {completarItem.ventaLocal
                        ? "Venta en el local"
                        : completarEsPedido
                        ? formatearFechaHora(completarItem.fechaSolicitada, completarItem.horaSolicitada)
                        : formatearFechaHora(completarItem.fechaLimite)}
                    </p>
                  </div>
                </div>
                <p className="text-base text-muted-foreground">
                  {completarEsPedido
                    ? "Revisa los productos y confirma la orden. El pedido no modifica cantidades ni pérdida."
                    : "La cantidad que debí hacer se calcula con los insumos usados al Generar y no se puede editar. La pérdida es esa cantidad menos la cantidad real, mínimo 0."}
                </p>
                {cargandoCalculoDebido && !completarEsPedido && (
                  <p role="status" className="text-sm text-muted-foreground">Calculando la cantidad que debí hacer…</p>
                )}
                {completarEsPedido && completarItem.lineas.some((linea) => esBebida(linea, productos)) && (
                  <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-base font-semibold text-blue-800">
                    El stock de las bebidas se descontó al aceptar la venta.
                  </p>
                )}
                <SeccionFormulario
                  numero={completarEsPedido ? undefined : 1}
                  titulo={completarEsPedido ? "Revisa lo que se hizo" : "¿Cuántas salieron bien?"}
                >
                  <div className="grid gap-3">
                    {completarItem.lineas.map((l, i) => completarEsPedido ? (
                      <div key={i} className="p-4 border border-border rounded-2xl bg-card">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-foreground">{nombreLineaOrden(l)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">Cantidad estimada</p>
                            <p className="text-base font-bold text-foreground tabular-nums">
                              {cantidadLineaOrden(completarItem, l)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      (() => {
                        const { realTxt, calculo, debida, real, realInvalida, realExcede } = cantidadesCompletar[i];
                        return (
                          <div key={i} className="p-4 border border-border rounded-2xl bg-card space-y-2">
                            <p className="text-base font-semibold text-foreground">{nombreLineaOrden(l)}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="pn-etiqueta">
                                  Se iban a hacer{esPizzaOrdenLinea(l) ? " (pizzas)" : ""}
                                </label>
                                <input
                                  value={esPizzaOrdenLinea(l) ? `${l.cantidadEstimada} ${l.cantidadEstimada === 1 ? "pizza" : "pizzas"}` : fmtCant(l.cantidadEstimada, l.unidad)}
                                  readOnly
                                  className={iCls + " opacity-70 cursor-default"}
                                />
                              </div>
                              <div>
                                <label className="pn-etiqueta">
                                  Debían salir ({esPizzaOrdenLinea(l) ? "pizzas" : l.unidad})
                                </label>
                                <input
                                  value={debida == null ? "" : esPizzaOrdenLinea(l)
                                    ? `${debida} ${debida === 1 ? "pizza" : "pizzas"}`
                                    : fmtCant(debida, l.unidad)}
                                  readOnly
                                  className={iCls + " opacity-70 cursor-default"}
                                />
                                {calculo?.calculada_al_verificar && (
                                  <p className="mt-1 text-base text-muted-foreground">
                                    Calculada al completar esta orden antigua.
                                  </p>
                                )}
                                {debida != null && debida < l.cantidadEstimada && (
                                  <p className="mt-1 text-base font-semibold text-red-600">
                                    El cálculo es menor que la cantidad estimada; la pérdida se calcula desde este valor.
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className="pn-etiqueta">
                                  ¿Cuántas salieron bien? ({esPizzaOrdenLinea(l) ? "pizzas" : l.unidad})
                                </label>
                                <input
                                  type="number" min={0} max={debida ?? undefined} step={1}
                                  value={realTxt}
                                  placeholder="0"
                                  onChange={e => setReales(p => ({ ...p, [i]: limpiarNumeroInput(e.target.value) }))}
                                  className={iCls + (realInvalida || realExcede ? " ring-2 ring-red-400" : "")}
                                />
                                {esPizzaOrdenLinea(l) && !realInvalida && !realExcede && (
                                  <p className="mt-1 text-base font-semibold text-emerald-700">
                                    Ingresan {real} × 24 partes = hasta {real * 8} porciones medianas o {real * 6} grandes.
                                  </p>
                                )}
                                {realExcede && (
                                  <p className="mt-1 text-base font-semibold text-red-600">
                                    No puede ser mayor que la cantidad que debías hacer ({debida}).
                                  </p>
                                )}
                                {realInvalida && (
                                  <p className="mt-1 text-base font-semibold text-red-600">
                                    Ingresa un entero mayor o igual a cero.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ))}
                  </div>
                </SeccionFormulario>
                {!completarEsPedido && (
                  <SeccionFormulario numero={2} titulo="¿Qué pasó con las que faltan?">
                    <ul className="grid gap-2 text-base">
                      {completarItem.lineas.map((linea, i) => {
                        const { invalido, realExcede, merma } = cantidadesCompletar[i];
                        return (
                          <li key={i} className="rounded-xl bg-muted p-3">
                            <strong>{nombreLineaOrden(linea)}</strong>
                            {invalido || realExcede ? (
                              <p className="text-muted-foreground">La pérdida se muestra cuando la cantidad sea válida.</p>
                            ) : merma > 0 ? (
                              <p className="font-semibold text-red-600">Se anotan como pérdida: {fmtCant(merma, linea.unidad)}</p>
                            ) : (
                              <p className="text-muted-foreground">No hay pérdida</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </SeccionFormulario>
                )}
                {pizzasConPrecioCompletar.length > 0 && (
                  <SeccionFormulario numero={3} titulo="Precio de la pizza por porción">
                    <div className="grid gap-3">
                      {pizzasConPrecioCompletar.map((pz) => (
                        <div key={pz.id} className="p-4 border border-border rounded-2xl bg-card space-y-2">
                          <p className="text-base font-semibold text-foreground">{pz.nombre}</p>
                          {grandeNoMayorQueMediana(pz) && !(tamanosDeOrden(pz).has("Mediana") && tamanosDeOrden(pz).has("Grande")) && (
                            <p className="text-base font-semibold text-red-600">
                              La porción Grande ({formatearCOP(precioEfectivoPizza(pz, "Grande"))}) quedaría igual o más barata que la Mediana
                              ({formatearCOP(precioEfectivoPizza(pz, "Mediana"))}). Ajusta el precio del tamaño producido o el otro precio en Editar producto.
                            </p>
                          )}
                          <div className={`grid grid-cols-1 gap-3 ${(["Mediana", "Grande"] as const).filter((t) => mostrarTamanoPizza(pz, t)).length > 1 ? "sm:grid-cols-2" : ""}`}>
                            {(["Mediana", "Grande"] as const).filter((t) => mostrarTamanoPizza(pz, t)).map((t) => {
                              const rec = precioRecomendadoPizza(pz, t);
                              const actual = preciosActualesDe(pz)[t];
                              const detalle = detalleCostoPizza(pz, t);
                              const invalido = !(Number(valorPrecioCompletar(pz, t)) > 0);
                              return (
                                <div key={t} className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
                                  <p className="text-base font-bold text-foreground">{t}</p>
                                  <p className="text-base text-muted-foreground">
                                    Precio actual: {formatearCOP(actual)}
                                  </p>
                                  {detalle && (
                                    <div className="space-y-0.5 text-base">
                                      {([
                                        ["Insumos", detalle.resumen.insumos],
                                        ["Mano de obra", detalle.resumen.manoObra],
                                        ["Gas", detalle.resumen.gas],
                                      ] as const).map(([etiqueta, valor]) => (
                                        <div key={etiqueta} className="flex items-center justify-between gap-2">
                                          <span className="text-muted-foreground">{etiqueta}</span>
                                          <span className="font-semibold text-foreground tabular-nums">{formatearCOP(valor)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <p className="text-base font-bold text-emerald-700">
                                    Precio recomendado: {rec > 0 ? formatearCOP(rec) : "—"}
                                  </p>
                                  {detalle && (
                                    <p className="text-base text-muted-foreground">
                                      Pizza completa: {formatearCOP(detalle.resumen.costoTotal)}
                                    </p>
                                  )}
                                  {t === "Grande" && detalle?.igualado && (
                                    <p className="text-base font-semibold text-amber-700">Ajustado: 10 % más que la porción Mediana</p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <input
                                      type="number" min={0} step={100}
                                      aria-label={`Precio por porción ${t}`}
                                      value={valorPrecioCompletar(pz, t)}
                                      onChange={(e) => setPreciosCompletar((p) => ({ ...p, [`${pz.id}:${t}`]: limpiarNumeroInput(e.target.value) }))}
                                      className={iCls + (invalido ? " ring-2 ring-red-400" : "")}
                                    />
                                    <button
                                      type="button"
                                      disabled={rec <= 0}
                                      onClick={() => setPreciosCompletar((p) => ({ ...p, [`${pz.id}:${t}`]: String(rec) }))}
                                      className="shrink-0 min-h-14 px-3 py-2 rounded-xl border border-border text-base font-semibold text-foreground hover:bg-muted cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Usar recomendado
                                    </button>
                                  </div>
                                  {!invalido && (
                                    <p className="text-base text-muted-foreground">
                                      Con este precio, la pizza completa vale {formatearCOP(Number(valorPrecioCompletar(pz, t)) * porcionesPorPizza(t))}
                                    </p>
                                  )}
                                  {t === "Grande" && !invalido
                                    && Number(valorPrecioCompletar(pz, t)) <= precioEfectivoPizza(pz, "Mediana")
                                    && precioEfectivoPizza(pz, "Mediana") > 0 && (
                                    <p className="text-base font-semibold text-red-600">
                                      Debe ser mayor que el precio de la porción Mediana ({formatearCOP(precioEfectivoPizza(pz, "Mediana"))})
                                    </p>
                                  )}
                                  {invalido && (
                                    <p className="text-base font-semibold text-red-600">Ingresa un precio mayor a 0.</p>
                                  )}
                                  {detalle?.sinTiempo && (
                                    <p className="text-base font-semibold text-amber-700">
                                      La ficha no tiene tiempo de preparación: el recomendado no incluye mano de obra ni gas
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </SeccionFormulario>
                )}
              </div>
              <div className="shrink-0 flex gap-3 px-5 py-4 border-t border-border">
                <button onClick={() => { setCompletarItem(null); setReales({}); setCalculosDebidos({}); }}
                  className="flex-1 py-4 min-h-[3.5rem] border-2 border-black rounded-2xl text-lg font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                  Todavía no
                </button>
                <button
                  disabled={!completarOk || cargandoCalculoDebido}
                  onClick={() => {
                    if (!completarOk) return;
                    if (!completarEsPedido) {
                      if (completarItem.lineas.some((linea, i) => {
                        const debida = linea.idDetalleOp == null
                          ? 0
                          : calculosDebidos[linea.idDetalleOp]?.cantidad_debida ?? 0;
                        return Number(reales[i]) === 0 && debida > 0;
                      }) &&
                          !window.confirm("Se registrará todo como pérdida. ¿Completar la orden?")) return;
                    }
                    confirmarCompletar();
                  }}
                  className={`flex-1 py-4 min-h-[3.5rem] bg-primary text-white rounded-2xl text-lg font-semibold transition-colors active:scale-95 ${
                    completarOk ? "hover:bg-red-700 cursor-pointer" : "opacity-50 cursor-not-allowed"
                  }`}>
                  Terminar y sumar a lo que hay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: No alcanza para empezar al Iniciar (C1) ── Lista de
          faltantes con su motivo y SOLO botón Cerrar: la orden se queda
          Pendiente y no se descuenta nada. */}
      <AnimatePresence>
        {faltantesIniciar && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border max-h-[90vh] flex flex-col my-4">
              <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2" style={{ fontFamily: SERIF }}>
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" /> No alcanza para empezar
                </h3>
                <button onClick={() => setFaltantesIniciar(null)} className="p-1.5 max-md:p-3.5 max-md:-m-2 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                <p className="text-base text-muted-foreground">
                  La orden <strong className="text-foreground">{faltantesIniciar.ordenId}</strong> se queda{" "}
                  <strong className="text-foreground">Pendiente</strong>: no se descontó nada ni cambió de estado.
                </p>
                {faltantesIniciar.faltantes.map((f) => (
                  <div key={f.insumoId} className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-0.5">
                    <p className="text-lg font-semibold text-red-700 flex items-start gap-2">
                      <Minus className="w-3.5 h-3.5 shrink-0 mt-1" />
                      <span>Faltan {fmtCant(f.falta, f.unidad)} de {f.nombre} (hay {fmtCant(f.stock, f.unidad)})</span>
                    </p>
                    {f.motivo && (
                      <p className="pl-6 text-base text-red-700">{motivoFaltante(f)}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="shrink-0 px-5 py-4 border-t border-border">
                <button onClick={() => setFaltantesIniciar(null)}
                  className="pn-boton pn-boton--oscuro">
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Ver detalle ── */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
              className="bg-card rounded-2xl w-full max-w-2xl shadow-2xl border border-border my-4 max-h-[90vh] flex flex-col">
              <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
                <div className="min-w-0">
                  <h3 style={{ font: "700 1.625rem/1.2 var(--font-titulo)", margin: 0, overflowWrap: "anywhere" }}>
                    {detailItem.lineas.map((l) => l.nombre).join(", ") || `Orden OP-${detailItem.id.replace("OP-", "")}`}
                    {detailItem.tipo === "pedido" && detailItem.cliente ? ` para ${detailItem.cliente}` : ""}
                  </h3>
                  <p style={{ fontSize: "1.125rem", color: "var(--gris-texto)", margin: "0.375rem 0 0" }}>
                    {detailItem.tipo === "pedido"
                      ? `Pedido de cliente${detailItem.ventaNumero ? ` #${detailItem.ventaNumero}` : ""}${detailItem.ventaLocal ? " · venta del local" : detailItem.fechaSolicitada ? ` · recoge ${formatearFechaHora(detailItem.fechaSolicitada, detailItem.horaSolicitada)}` : ""}`
                      : `Para tener listo · Orden OP-${detailItem.id.replace("OP-", "")}`}
                  </p>
                </div>
                <BotonAccion variante="normal" onClick={() => setDetailItem(null)}>Cerrar</BotonAccion>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Los tres pasos de la cocina */}
                <ol className="pn-pasos" aria-label="En qué paso va la orden" style={{ margin: 0 }}>
                  {(["Recibida", "En la cocina", "Lista para entregar"] as const).map((paso, i) => {
                    const actual = detailItem.estadoOrden === "completada" ? 2 : detailItem.estadoOrden === "en-proceso" ? 1 : 0;
                    const hecho = detailItem.estadoOrden === "cancelada" ? i === 0 : i < actual || (i === 2 && actual === 2);
                    return (
                      <li key={paso} aria-current={i === actual && detailItem.estadoOrden !== "cancelada" ? "step" : undefined}
                        style={{ fontWeight: i === actual ? 700 : 400, color: i === actual ? "var(--texto)" : undefined }}>
                        {hecho ? "✓ " : ""}{paso}
                      </li>
                    );
                  })}
                  {detailItem.estadoOrden === "cancelada" && <li><EstadoPill tono="gris">Cancelada</EstadoPill></li>}
                </ol>

                {/* Contador grande mientras está en la cocina */}
                {detailItem.estadoOrden === "en-proceso" && (() => {
                  const fin = detailItem.tipo === "pedido" ? detailItem.finCalentamientoMs : detailItem.finPreparacionMs;
                  return (
                    <section style={{ border: "3px solid var(--azul-texto)", background: "var(--azul-suave)", borderRadius: "1.25rem", padding: "1.125rem 1.375rem" }}>
                      <p style={{ fontSize: "1.1875rem", fontWeight: 600, margin: 0, color: "var(--azul-texto)" }}>Estará lista en</p>
                      {fin != null ? (
                        <>
                          <p style={{ font: "700 3.25rem/1.1 var(--font-titulo)", margin: "0.25rem 0", color: "var(--azul-texto)" }} className="tabular-nums" aria-live="polite">
                            {tiempoRestante(fin, ahoraCalentamiento)}
                          </p>
                          <p style={{ fontSize: "1.125rem", margin: 0 }}>
                            Más o menos a las {new Date(fin).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </>
                      ) : (
                        <p style={{ fontSize: "1.25rem", margin: "0.25rem 0 0" }}>Se está preparando.</p>
                      )}
                      <div style={{ marginTop: "0.75rem" }}><EstimacionPedido orden={detailItem} /></div>
                      {esAdministradorSesion && canEdit && detailItem.tipo === "pedido" && (
                        <div style={{ marginTop: "0.875rem" }}>
                          <p style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.375rem" }}>¿Se va a demorar más o menos?</p>
                          <EditarTiempoPedido
                            key={detailItem.id}
                            orden={detailItem}
                            onGuardar={actualizada => {
                              setOrdenes(prev => prev.map(o => o.id === actualizada.id ? actualizada : o));
                              setDetailItem(prev => prev?.id === actualizada.id ? actualizada : prev);
                            }}
                          />
                        </div>
                      )}
                      {canEdit && detailItem.tipo === "pedido" && (
                        <div style={{ marginTop: "1rem" }}>
                          <BotonAccion variante="bien" className="pn-boton--grande" onClick={() => { const o = detailItem; setDetailItem(null); setOrdenLista(o); }}>
                            Ya está listo para entregar
                          </BotonAccion>
                        </div>
                      )}
                    </section>
                  );
                })()}

                {detailItem.estadoOrden === "pendiente" && (
                  <>
                    <EstimacionPedido orden={detailItem} />
                    {esAdministradorSesion && canEdit && detailItem.tipo === "pedido" && (
                      <EditarTiempoPedido
                        key={detailItem.id}
                        orden={detailItem}
                        onGuardar={actualizada => {
                          setOrdenes(prev => prev.map(o => o.id === actualizada.id ? actualizada : o));
                          setDetailItem(prev => prev?.id === actualizada.id ? actualizada : prev);
                        }}
                      />
                    )}
                  </>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <EstadoPill tono={detailItem.estadoOrden === "en-proceso" ? "azul" : detailItem.estadoOrden === "completada" ? "verde" : detailItem.estadoOrden === "cancelada" ? "gris" : "ambar"}>
                    {detailItem.estadoOrden === "pendiente" ? "Por empezar" : detailItem.estadoOrden === "en-proceso" ? "En la cocina" : detailItem.estadoOrden === "completada" ? "Terminada" : "Cancelada"}
                  </EstadoPill>
                  <span style={{ fontSize: "1rem", color: "var(--gris-texto)" }}>Desde {formatearFechaHora(ultimoCambio(detailItem))}</span>
                </div>

                {detailItem.tipo === "pedido" && (
                  <div className="flex items-center justify-between py-2 border-b border-border gap-4">
                    <span className="text-lg text-muted-foreground font-medium shrink-0">Venta asociada</span>
                    <span className="text-lg font-semibold text-foreground text-right">{detailItem.ventaNumero ? `${detailItem.ventaNumero}${detailItem.cliente ? ` · ${detailItem.cliente}` : ""}` : "—"}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    ...(detailItem.ventaLocal ? [] : [{ l: "Fecha/hora solicitada", v: formatearFechaHora(detailItem.fechaSolicitada, detailItem.horaSolicitada) }]),
                    { l: "Inicio de producción", v: formatearFechaHora(detailItem.inicioProduccion) },
                    { l: "Fecha límite", v: formatearFechaHora(detailItem.fechaLimite) },
                    { l: "Entrega estimada", v: formatearFechaHora(detailItem.entregaEstimada) },
                  ].map(({ l, v }) => (
                    <div key={l}>
                      <p className="text-base font-semibold text-muted-foreground">{l}</p>
                      <p className="text-lg font-semibold text-foreground">{v}</p>
                    </div>
                  ))}
                </div>

                {(() => {
                  const mermas = noConformidades.filter(
                    (n) => n.ordenRef === detailItem.id && n.tipoNoConformidad === "Pérdida en cocina",
                  );
                  if (mermas.length === 0) return null;
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-base font-semibold text-amber-800">Pérdida registrada en Productos no conformes</p>
                      <p className="text-base text-amber-700 mt-0.5">
                        {mermas.map((m) => `${m.nombre} · ${m.cantidadAfectada} ${m.unidadMedida}`).join(", ")}
                      </p>
                    </div>
                  );
                })()}

                <div>
                  <p className="text-base font-semibold text-muted-foreground mb-1.5">Cantidades estimadas</p>
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-lg text-left">
                      <thead className="bg-muted text-base text-muted-foreground">
                        <tr><th className="p-3">Producto o insumo</th><th className="p-3">Cantidad estimada</th><th className="p-3">Unidad</th></tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {detailItem.lineas.map((linea, i) => (
                          <tr key={i}>
                            <td className="p-3">{nombreLineaOrden(linea)}</td>
                            <td className="p-3 tabular-nums">{linea.cantidadEstimada.toLocaleString("es-CO")}</td>
                            <td className="p-3">{esPizzaOrdenLinea(linea) ? (detailItem.tipo === "pedido" ? "porciones" : "pizzas") : linea.unidad}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <p className="text-base font-semibold text-muted-foreground mb-1.5">Líneas de la orden</p>
                  <div className="space-y-1.5">
                    {detailItem.lineas.map((l, i) => {
                      // C8: lo que gasta ESTA línea (con el factor de su
                      // tamaño y las unidades contables sin multiplicar): el
                      // mismo número que descuenta Insumos al Iniciar. Las
                      // líneas de bebida no piden nada y no lo pintan.
                      const necesita = resumenNecesita(requeridosDeLinea(l, fichasPorProducto));
                      return (
                      <div key={i} className="p-3 bg-muted rounded-xl">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-lg font-semibold text-foreground">
                              {nombreLineaOrden(l)}
                            </p>
                            {(l.tamano || l.porciones) && !esPizzaOrdenLinea(l) && (
                              <p className="text-base text-muted-foreground">
                                {[l.tamano ? `Tamaño ${l.tamano}` : null, l.porciones ? `${l.porciones} porciones` : null].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {l.cantidadDebida != null && (
                              <p className="text-base text-muted-foreground mt-0.5">
                                Debí hacer: {esPizzaOrdenLinea(l)
                                  ? `${l.cantidadDebida} ${l.cantidadDebida === 1 ? "pizza" : "pizzas"}`
                                  : fmtCant(l.cantidadDebida, l.unidad)}
                              </p>
                            )}
                            {l.cantidadReal != null && (
                              <>
                                <p className="text-base text-muted-foreground mt-0.5">
                                  Real: {cantidadLineaOrden(detailItem, l, l.cantidadReal)}
                                </p>
                                {detailItem.tipo === "preparacion" && esPizzaOrdenLinea(l) && resumenCortes(l) && (
                                  <p className="text-base font-semibold text-foreground">{resumenCortes(l)}</p>
                                )}
                                {(l.merma ?? 0) > 0 && (
                                  <p className="text-base font-semibold text-red-600">
                                    −{esPizzaOrdenLinea(l)
                                      ? cantidadLineaOrden(detailItem, l, l.merma)
                                      : fmtCant(l.merma ?? 0, l.unidad)} de pérdida
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {detailItem.tipo === "preparacion" && l.sinFicha && (
                          <p className="mt-1.5 text-base text-muted-foreground italic">Sin preparación · se entrega directo</p>
                        )}
                        {detailItem.tipo === "preparacion" && necesita && (
                          <p className="mt-1.5 text-base text-muted-foreground">
                            Necesita: <span className="font-semibold text-foreground">{necesita}</span>
                          </p>
                        )}
                        {detailItem.tipo === "preparacion" && l.pasos && l.pasos.length > 0 && (
                          <ol className="mt-1.5 list-decimal list-inside text-base text-muted-foreground space-y-0.5">
                            {l.pasos.map((p, j) => <li key={j}>{p}</li>)}
                          </ol>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>

                {detailItem.tipo === "preparacion" && (
                  <div>
                    <p className="text-base font-semibold text-muted-foreground mb-1.5">Insumos usados</p>
                    <TablaInsumosRequeridos
                      requeridos={detailItem.insumosRequeridos}
                      insumos={insumos}
                      descontados={detailItem.insumosDescontados}
                      onIrCompras={(faltantes) => onNavigateTo?.("orden-compra", faltantes)}
                      onPreparar={(f) => prepararFaltante(f, false)}
                      onIrInsumos={() => onNavigateTo?.("supplies")}
                    />
                  </div>
                )}

                <div>
                  <p className="text-base font-semibold text-muted-foreground mb-1.5">Costo de la orden</p>
                  {parametrosCostosError ? (
                    <p className="text-base text-red-700 bg-red-50 rounded-xl border border-red-200 px-3 py-2">
                      {parametrosCostosError}
                    </p>
                  ) : !parametrosCostos ? (
                    <p className="text-base text-muted-foreground bg-muted/60 rounded-xl border border-border px-3 py-2">
                      Cargando parámetros de costos…
                    </p>
                  ) : (() => {
                    const resumen = (() => {
                      if (detailItem.tipo !== "preparacion") {
                        return calcularCostoOrden(detailItem.insumosRequeridos, insumos, parametrosCostos, tiempoTotalOrden(detailItem));
                      }
                      // Por línea, con la ficha de la orden (snapshot) o la vigente:
                      // mismo cálculo y tiempo que "Completar orden".
                      const acumulado = { insumos: 0, manoObra: 0, gas: 0, costoTotal: 0, avisos: [] as ReturnType<typeof calcularCostoOrden>["avisos"] };
                      for (const linea of detailItem.lineas) {
                        const { ficha } = fichaParaVer(linea, fichasPorProducto);
                        if (!ficha) return calcularCostoOrden(detailItem.insumosRequeridos, insumos, parametrosCostos, tiempoTotalOrden(detailItem));
                        const r = calcularCostoProducto(ficha, insumos, parametrosCostos, esPizzaOrdenLinea(linea) ? linea.tamano ?? undefined : undefined);
                        const rend = Number(ficha.rendimiento) > 0 ? Number(ficha.rendimiento) : 1;
                        const cant = linea.cantidadEstimada || 0;
                        // Pizza: tiempo por pizza. Producto insumo: tiempo por tanda (rendimiento).
                        const veces = esPizzaOrdenLinea(linea) ? cant : cant / rend;
                        const ins = r.insumos * cant;
                        const mo = r.manoObra * veces;
                        const gs = r.gas * veces;
                        acumulado.insumos += ins;
                        acumulado.manoObra += mo;
                        acumulado.gas += gs;
                        acumulado.costoTotal += ins + mo + gs;
                        for (const a of r.avisos) {
                          if (!acumulado.avisos.some((x) => x.nombre === a.nombre && x.tipo === a.tipo)) acumulado.avisos.push(a);
                        }
                      }
                      return acumulado;
                    })();
                    const cantidadEstimada = totalEstimado(detailItem.lineas);
                    const unidades = new Set(detailItem.lineas.map((linea) => linea.unidad));
                    const unidadCosto = unidades.size === 1
                      ? `por ${detailItem.lineas[0]?.unidad ?? "unidad"}`
                      : "por unidad estimada (unidades mixtas)";
                    const soloPizzasPrep = detailItem.tipo === "preparacion"
                      && detailItem.lineas.length > 0 && detailItem.lineas.every(esPizzaOrdenLinea);
                    const lineaPizzaUnica = soloPizzasPrep
                      || (detailItem.lineas.length === 1 && esPizzaOrdenLinea(detailItem.lineas[0]));
                    const cantidadPizzaBase = soloPizzasPrep
                      ? detailItem.lineas.reduce((s, l) => s + (l.cantidadEstimada || 0), 0)
                      : lineaPizzaUnica
                        ? detailItem.lineas[0].cantidadEstimada
                        : 0;
                    const porcionesPizzaBase = lineaPizzaUnica
                        ? porcionesPorPizza(detailItem.lineas[0].tamano)
                        : 0;
                    const costoUnidadPizza = lineaPizzaUnica && cantidadPizzaBase > 0
                      ? detailItem.tipo === "pedido"
                        ? resumen.costoTotal / cantidadPizzaBase * porcionesPizzaBase
                        : resumen.costoTotal / cantidadPizzaBase
                      : 0;
                    return (
                      <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <p className="text-base uppercase tracking-wide text-muted-foreground">Insumos</p>
                            <p className="text-lg font-semibold text-foreground tabular-nums">{formatearCOP(resumen.insumos)}</p>
                          </div>
                          <div>
                            <p className="text-base uppercase tracking-wide text-muted-foreground">Mano de obra</p>
                            <p className="text-lg font-semibold text-foreground tabular-nums">{formatearCOP(resumen.manoObra)}</p>
                          </div>
                          <div>
                            <p className="text-base uppercase tracking-wide text-muted-foreground">Gas</p>
                            <p className="text-lg font-semibold text-foreground tabular-nums">{formatearCOP(resumen.gas)}</p>
                          </div>
                          <div>
                            <p className="text-base uppercase tracking-wide text-muted-foreground">
                              {lineaPizzaUnica ? "Costo por pizza" : "Costo por unidad"}
                            </p>
                            <p className="text-lg font-semibold text-foreground tabular-nums">
                              {lineaPizzaUnica
                                ? cantidadPizzaBase > 0 ? formatearCOP(costoUnidadPizza) : "—"
                                : cantidadEstimada > 0
                                  ? `${formatearCOP(resumen.costoTotal / cantidadEstimada)} ${unidadCosto}`
                                  : "—"}
                            </p>
                            {lineaPizzaUnica && detailItem.tipo === "preparacion" && cantidadPizzaBase > 0 && (
                              <p className="mt-1 text-base font-semibold text-muted-foreground">
                                Costo por porción: {formatearCOP(costoUnidadPizza / 8)} mediana · {formatearCOP(costoUnidadPizza / 6)} grande
                              </p>
                            )}
                            {lineaPizzaUnica && detailItem.tipo === "pedido" && porcionesPizzaBase > 0 && (
                              <p className="mt-1 text-base font-semibold text-muted-foreground">
                                Costo por porción: {cantidadPizzaBase > 0
                                  ? formatearCOP(costoUnidadPizza / porcionesPizzaBase)
                                  : "—"}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="border-t border-border pt-2 flex items-center justify-between gap-3">
                          <span className="text-base font-bold text-foreground uppercase tracking-wide">Costo total</span>
                          <span className="text-lg font-bold text-foreground tabular-nums">{formatearCOP(resumen.costoTotal)}</span>
                        </div>
                        {resumen.avisos.length > 0 && (
                          <div className="space-y-1">
                            {resumen.avisos.map((aviso, index) => (
                              <p key={`${aviso.nombre}-${index}`} className="text-base text-amber-700">
                                {aviso.tipo === "sin-costo"
                                  ? `${aviso.nombre} sin costo: regístralo en una compra`
                                  : aviso.tipo === "no-encontrado"
                                    ? `${aviso.nombre}: no se encontró en el catálogo de insumos`
                                    : `${aviso.nombre}: unidad incompatible para calcular el costo`}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {detailItem.tipo === "preparacion" && (
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <p className="text-base font-semibold text-muted-foreground">Descripción de la preparación</p>
                      <span className="text-base text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        Tiempo estimado:{" "}
                        <strong className="text-foreground">
                          {detailItem.tiempoPreparacionMin ? fmtMinutos(detailItem.tiempoPreparacionMin) : "Sin tiempo definido"}
                        </strong>
                        {detailItem.estadoOrden === "en-proceso" && detailItem.finPreparacionMs != null && (
                          <strong className="ml-2 text-lg tabular-nums">⏱ {tiempoRestante(detailItem.finPreparacionMs, ahoraCalentamiento)}</strong>
                        )}
                      </span>
                    </div>
                    <p className="text-base text-foreground bg-muted/60 rounded-xl border border-border px-3 py-2 whitespace-pre-wrap leading-relaxed">
                      {detailItem.descripcionPreparacion || "Sin descripción"}
                    </p>
                  </div>
                )}

                {detailItem.tipo === "pedido" && (
                  <div>
                    <p className="text-base font-semibold text-muted-foreground mb-1.5">Preparación</p>
                    <p className="text-base text-foreground bg-muted/60 rounded-xl border border-border px-3 py-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                      Tiempo estimado: <strong>{fmtMinutos(HORNEADO_MIN)}</strong>
                      {detailItem.estadoOrden === "en-proceso" && detailItem.finCalentamientoMs != null && (
                        <strong className="ml-2 text-lg tabular-nums">⏱ {tiempoRestante(detailItem.finCalentamientoMs, ahoraCalentamiento)}</strong>
                      )}
                    </p>
                  </div>
                )}

                {detailItem.notasFaltantes && (
                  <div>
                    <p className="text-base font-semibold text-muted-foreground mb-1.5">Notas de faltantes</p>
                    <p className="text-base text-red-700 bg-red-50 rounded-xl border border-red-200 px-3 py-2">{detailItem.notasFaltantes}</p>
                  </div>
                )}

                {(() => {
                  // En 2 columnas solo cuando la línea de tiempo está vacía: con
                  // transiciones, la lista se lleva el ancho completo.
                  const enColumnas = detailItem.historial.length === 0 && !!detailItem.observacion;
                  const lineaTiempos = (
                    <div>
                      <p className="text-base font-semibold text-muted-foreground mb-1.5">Línea de tiempo de estados</p>
                      {detailItem.historial.length === 0 ? (
                        <p className="text-lg text-muted-foreground italic bg-muted rounded-xl px-3 py-2">
                          Sin transiciones. Creada el {formatearFechaHora(detailItem.creadaEn)}.
                        </p>
                      ) : (() => {
                        // Más antigua → más reciente. "Orden creada" va primero y
                        // se omite si el historial ya trae su paso inicial.
                        const pasos = [...detailItem.historial].sort((a, b) => epochOrden(a.fechaHora) - epochOrden(b.fechaHora));
                        const traeInicial = pasos.some((h) => h.de === null);
                        return (
                        <div className="space-y-1.5">
                          {!traeInicial && (
                            <div className="flex items-center justify-between gap-2 bg-muted rounded-xl px-3 py-2">
                              <span className="text-base font-semibold text-foreground">Orden creada</span>
                              <span className="text-base text-muted-foreground shrink-0">{formatearFechaHora(detailItem.creadaEn)}</span>
                            </div>
                          )}
                          {pasos.map((h, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 bg-muted rounded-xl px-3 py-2">
                              {h.detalle ? (
                                // Paso sin cambio de estado (p. ej. "Creada
                                // desde Insumos"): manda el motivo, no la
                                // flecha de transiciones.
                                <span className="text-base font-semibold text-foreground">{h.detalle}</span>
                              ) : (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {h.de === null ? (
                                    <span className="text-base font-semibold text-foreground">Orden creada</span>
                                  ) : (
                                    <span className={`text-base font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[h.de]}`}>{ESTADO_LABEL[h.de]}</span>
                                  )}
                                  <span className="text-muted-foreground text-base">→</span>
                                  <span className={`text-base font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[h.a]}`}>{ESTADO_LABEL[h.a]}</span>
                                  {h.automatico && <span className="text-base text-muted-foreground">(automático)</span>}
                                </div>
                              )}
                              <span className="text-base text-muted-foreground shrink-0 tabular-nums">{formatearFechaHora(h.fechaHora)}</span>
                            </div>
                          ))}
                        </div>
                        );
                      })()}
                    </div>
                  );
                  const observacion = detailItem.observacion ? (
                    <div>
                      <p className="text-base font-semibold text-muted-foreground mb-1">Observación</p>
                      <p className="text-lg text-foreground bg-muted rounded-xl px-3 py-2">{detailItem.observacion}</p>
                    </div>
                  ) : null;
                  return enColumnas ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{lineaTiempos}{observacion}</div>
                  ) : (
                    <>{lineaTiempos}{observacion}</>
                  );
                })()}
              </div>
              <div className="shrink-0 px-5 py-4 border-t border-border flex gap-3">
                <button onClick={() => setDetailItem(null)} className="w-32 shrink-0 py-2.5 bg-muted rounded-xl text-lg font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">Cerrar</button>
                <button onClick={() => setVerFicha({ ordenId: detailItem.id, lineaIdx: 0 })} className="flex-1 py-2.5 max-md:min-h-11 bg-primary rounded-xl text-lg font-semibold text-white hover:bg-red-700 cursor-pointer transition-colors">Ver ficha del producto</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Ver ficha del producto (solo lectura, sobre el detalle) ── */}
      <AnimatePresence>
        {detailItem && verFicha && verFicha.ordenId === detailItem.id && (() => {
          const linea = detailItem.lineas[verFicha.lineaIdx] ?? detailItem.lineas[0];
          if (!linea) return null;
          const { ficha, reconstruida } = fichaParaVer(linea, fichasPorProducto);
          const clave = linea.productoId ?? linea.idProducto;
          const vigente = clave ? fichaVigente(fichasPorProducto, clave) : null;
          // Copia solo para mostrar: los pasos que ya traen "1." o "1)" no
          // deben duplicar el círculo numerado que pinta FichaTecnicaDetalle.
          const fichaVista = ficha
            ? {
                ...ficha,
                ...(detailItem.tipo === "preparacion" && esPizzaOrdenLinea(linea)
                  ? { porciones: 8, porcionesPorTamano: [{ tamano: "Mediana", porciones: 8 }, { tamano: "Grande", porciones: 6 }] }
                  : {}),
                pasos: ficha.pasos.map(p => p.replace(/^\s*\d+\s*[.)]\s+/, "")).filter(p => p.trim()),
              }
            : null;
          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
                className="bg-card rounded-2xl w-full max-w-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]">
                <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
                  <h3 className="text-lg font-bold text-foreground min-w-0 truncate" style={{ fontFamily: SERIF }}>Ficha técnica — {linea.nombre}</h3>
                  <button onClick={() => setVerFicha(null)} className="p-1.5 max-md:p-3.5 max-md:-m-2 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground shrink-0"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 min-h-0 flex flex-col px-5 py-4 space-y-3">
                  {detailItem.lineas.length > 1 && (
                    <div className="shrink-0 flex flex-wrap gap-1.5">
                      {detailItem.lineas.map((l, i) => (
                        <button key={i} type="button"
                          onClick={() => setVerFicha(v => v && ({ ...v, lineaIdx: i }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                            i === verFicha.lineaIdx
                              ? "bg-primary text-white"
                              : "bg-muted text-muted-foreground hover:bg-border"
                          }`}>
                          {l.nombre}{l.tamano ? ` · ${l.tamano}` : ""}
                        </button>
                      ))}
                    </div>
                  )}
                  {!fichaVista || linea.sinFicha ? (
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center">
                      <p className="text-sm font-semibold text-foreground">Este producto no tiene ficha técnica</p>
                      <p className="text-xs text-muted-foreground mt-1">{linea.nombre}</p>
                    </div>
                  ) : (
                    <>
                      <span className={`shrink-0 self-start inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        reconstruida ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {reconstruida
                          ? `Versión v${fichaVista.version} guardada en la orden`
                          : linea.fichaSnapshot
                            ? `Versión v${fichaVista.version} usada en esta orden`
                            : `Versión v${fichaVista.version} vigente`}
                      </span>
                      {vigente && vigente.version > fichaVista.version && (
                        <p className="shrink-0 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                          Existe una versión más nueva (v{vigente.version}) en el catálogo.
                        </p>
                      )}
                      {reconstruida && (
                        <p className="shrink-0 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                          Esta versión ya no está en el catálogo: se muestra la foto guardada en la orden.
                        </p>
                      )}
                      {!linea.fichaSnapshot && (
                        <p className="shrink-0 text-xs text-muted-foreground">
                          Esta orden no guardó su versión de ficha: se muestra la vigente del producto.
                        </p>
                      )}
                      {(linea.cantidadEstimada > 0 || linea.tamano) && (
                        <p className="shrink-0 text-xs text-muted-foreground">
                          Esta orden pide:{" "}
                          {linea.cantidadEstimada > 0 && (
                            <strong className="text-foreground">{fmtCant(linea.cantidadEstimada, linea.unidad)}</strong>
                          )}
                          {linea.tamano ? `${linea.cantidadEstimada > 0 ? " · " : ""}Tamaño: ${linea.tamano}` : null}
                        </p>
                      )}
                      <div className="flex-1 min-h-0 flex flex-col">
                        <FichaTecnicaDetalle v={fichaVista} readCls={readCls}
                          modo={detailItem.tipo === "preparacion" && !esPizzaOrdenLinea(linea) ? "insumo" : "producto"}
                          /* En una preparación, la unidad de la línea es la del
                             Producto Insumo: acompaña a "Cantidad a hacer". */
                          unidadCantidad={detailItem.tipo === "preparacion" ? linea.unidad : undefined} />
                      </div>
                    </>
                  )}
                </div>
                <div className="shrink-0 px-5 py-4 border-t border-border">
                  <button onClick={() => setVerFicha(null)} className="w-full py-2.5 max-md:min-h-11 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">Cerrar</button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Modal: Dar de baja ── */}
      <AnimatePresence>
        {darBajaItem && darBajaForm && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
                className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border my-4">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Dar de baja la orden OP-{darBajaItem.id.replace("OP-", "")}</h3>
                  <button onClick={() => { setDarBajaItem(null); setDarBajaForm(null); }}
                    className="p-1.5 max-md:p-3.5 max-md:-m-2 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
                </div>

                <div className="space-y-4 px-5 py-5 max-h-[68vh] overflow-y-auto">
                  {/* C7: la marca dice si hay algo por devolver. Hoy
                      `confirmarDarBaja` solo cancela la orden —nunca devuelve
                      stock—, así que el texto aclara qué pasó con los insumos. */}
                  <p className={`text-base rounded-xl px-3 py-2 border ${
                    darBajaItem.insumosDescontados
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-muted border-border text-muted-foreground"
                  }`}>
                    {darBajaItem.insumosDescontados
                      ? "Los insumos ya se descontaron al iniciar: no se devuelven"
                      : "Todavía no descontó insumos: no hay nada que devolver"}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="pn-etiqueta">Tipo</label>
                      <p className="text-lg font-semibold text-foreground py-2">{TIPO_LABEL[darBajaItem.tipo]}</p>
                    </div>
                    <div>
                      <label className="pn-etiqueta">Se mide en</label>
                      <select value={darBajaForm.unidadMedida} onChange={e => setDarBajaForm(f => f && ({ ...f, unidadMedida: e.target.value }))} className={sCls}>
                        {UNIDADES.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="pn-etiqueta">Producto</label>
                    <select value={darBajaForm.idProducto}
                      onChange={e => {
                        const pid = e.target.value;
                        const linea = darBajaItem.lineas.find(l => l.idProducto === pid);
                        setDarBajaForm(f => f && ({
                          ...f,
                          idProducto: pid,
                          unidadMedida: linea?.unidad ?? f.unidadMedida,
                          cantidad: linea?.cantidadEstimada ?? f.cantidad,
                        }));
                      }}
                      className={sCls}>
                      {darBajaItem.lineas.map(l => (
                        <option key={l.idProducto} value={l.idProducto}>{l.nombre}</option>
                      ))}
                    </select>
                    <span className="text-base font-semibold uppercase tracking-wide text-muted-foreground">
                      {darBajaItem.tipo === "preparacion" ? "Producto insumo" : "Producto terminado"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="pn-etiqueta">¿Cuántas se dañaron?</label>
                      {/* Nace con la cantidad estimada de la línea; borra a
                          vacío sin volver a 0 (punto B1). */}
                      <input type="number" min={1}
                        value={darBajaForm.cantidad === 0 ? "" : darBajaForm.cantidad}
                        placeholder="0"
                        onChange={e => setDarBajaForm(f => f && ({ ...f, cantidad: numeroDeInput(limpiarNumeroInput(e.target.value)) }))}
                        className={iCls} />
                    </div>
                    <div>
                      <label className="pn-etiqueta">Fecha</label>
                      <input value={formatearFechaHora(darBajaForm.fechaRegistro)} readOnly className={iCls + " opacity-60 cursor-default"} />
                    </div>
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-muted/60 border-b border-border">
                      <p className="text-base font-bold uppercase tracking-wide text-muted-foreground">Qué salió mal</p>
                    </div>
                    <div className="p-3 space-y-3">
                      <div>
                        <label className="pn-etiqueta">¿Por qué se da de baja?</label>
                        <select value={darBajaForm.motivo} onChange={e => setDarBajaForm(f => f && ({ ...f, motivo: e.target.value }))} className={sCls}>
                          {MOTIVOS.map(m => <option key={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="pn-etiqueta">Cuéntanos qué pasó</label>
                        <textarea rows={4} value={darBajaForm.descripcion}
                          onChange={e => setDarBajaForm(f => f && ({ ...f, descripcion: e.target.value }))}
                          placeholder="Describe detalladamente qué ocurrió, síntomas observados, impacto..."
                          className={tCls} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="pn-etiqueta">Origen</label>
                    <input value={`Orden #${darBajaItem.id}`} readOnly className={iCls + " opacity-60 cursor-default"} />
                  </div>
                </div>

                <div className="flex gap-3 px-5 py-4 border-t border-border">
                  <button onClick={() => { setDarBajaItem(null); setDarBajaForm(null); }}
                    className="pn-boton pn-boton--oscuro">
                    No, dejarla como está
                  </button>
                  <button onClick={confirmarDarBaja}
                    className="pn-boton pn-boton--peligro">
                    Sí, dar de baja la orden
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

