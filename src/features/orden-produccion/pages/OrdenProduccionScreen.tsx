import { useState, useMemo, useEffect, type Dispatch, type SetStateAction } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Search, Trash2, X, Play, CheckCircle2, Ban,
  AlertCircle, AlertTriangle, Clock, Minus, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { CalendarDropdown } from "@/shared/components/CalendarDropdown";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginador";
import { ActionIcons } from "@/shared/components/ActionIcons";
import { BotonDescargarExcel } from "@/shared/components/BotonDescargarExcel";
import { exportarExcelEstilizado } from "@/shared/utils/exportExcelEstilizado";
import { limpiarNumeroInput, numeroDeInput } from "@/shared/utils/numeroInput";
import { hora12 } from "@/shared/utils/hora";
import { ConfirmDeleteModal } from "@/shared/components/ConfirmDeleteModal";
import { FichaTecnicaDetalle } from "@/shared/components/FichaTecnicaEditor";
import type { Insumo } from "@/features/insumos/pages/GestionInsumosScreen";
import type { Venta } from "@/features/ventas/pages/VentasScreen";
import { tipoDe, type Producto, type FichasPorProducto } from "@/features/productos/pages/GestionProductosScreen";
import { porcionesReferencia, esIdInsumo, idInsumoApiDesdeFront, type FichaVersion } from "@/shared/utils/fichas";
import {
  convertirUnidad,
  faltantesPara,
  fmtCant,
  motivoFaltante,
  requeridosPorUnidad,
  unidadesCompatibles,
  type FaltanteUnidad,
} from "@/shared/utils/disponibilidad";
import type { NoConformidad } from "@/features/cpn/pages/ProductosPerecederosScreen";
import {
  actualizarOrdenProduccion,
  completarOrdenProduccion,
  crearOrdenPreparacionApi,
  darBajaOrdenProduccion,
  eliminarOrdenProduccion,
  obtenerCalculoVerificacionOrden,
  obtenerCapacidadOrdenProduccion,
  iniciarOrdenProduccion,
  mapearFaltanteApi,
  mensajeErrorOrdenes,
  type CapacidadLineaApi,
  type CalculoVerificacionLineaApi,
  type ErrorConFaltantes,
} from "@/features/orden-produccion/services/ordenesProduccionApi";
import { mapearFichaApi, obtenerFichasDe } from "@/features/productos/services/fichasApi";

const SERIF = "var(--font-titulo)";

// ─────────────────────────── Tipos ───────────────────────────
export type EstadoOrden = "pendiente" | "en-proceso" | "por-verificar" | "completada" | "cancelada";

/** Las dos formas de trabajar en la cocina. */
export type TipoOrden = "preparacion" | "pedido";

export const TIPO_LABEL: Record<TipoOrden, string> = {
  preparacion: "Preparación",
  pedido: "Pedido",
};

function etiquetaAsignacion(o: OrdenProduccion, productos: Producto[]): string {
  if (o.tipo === "pedido") return "Por cocinar";
  const etiquetas = new Set(o.lineas.map((linea) => {
    const idProducto = linea.productoId ?? linea.idProducto;
    const producto = productos.find((p) => p.id === idProducto);
    const categoria = normalizarNombre(producto?.categoriaNombre ?? "");
    return categoria === "pizzas" || categoria === "lasanas" ? "Pre cocido" : "Preparación";
  }));
  return [...etiquetas].join(" / ") || "Preparación";
}

/** Tiempo fijo de una orden "Pedido de cliente": el plato solo pasa por el
    horno. El `tiempoPreparacion` de la ficha técnica es de "Preparación en
    lote" y NO se usa en las órdenes de pedido. */
const HORNEADO_MIN = 15;

const ESTADO_COLOR: Record<EstadoOrden, string> = {
  pendiente:    "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300",
  "en-proceso": "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  "por-verificar": "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
  completada:   "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  cancelada:    "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

const ESTADO_LABEL: Record<EstadoOrden, string> = {
  pendiente:    "Pendiente",
  "en-proceso": "En proceso",
  "por-verificar": "Por verificar",
  completada:   "Completada",
  cancelada:    "Cancelada",
};

// Transiciones válidas de estado. "Cancelada" NO es seleccionable:
// solo se alcanza mediante el flujo de "Dar de baja".
export const VALID_TRANSITIONS: Record<EstadoOrden, EstadoOrden[]> = {
  pendiente:    ["en-proceso"],
  "en-proceso": ["por-verificar"],
  "por-verificar": ["completada"],
  completada:   [],
  cancelada:    [],
};

// Los 5 estados, en su orden natural de avance por el flujo de producción.
export const ORDEN_ESTADOS: EstadoOrden[] = ["pendiente", "en-proceso", "por-verificar", "completada", "cancelada"];

// Qué estados pueden elegirse a mano desde el listado, dado el estado actual.
export const esEstadoSeleccionable = (actual: EstadoOrden, destino: EstadoOrden): boolean => {
  if (destino === actual) return true;                    // el estado actual siempre visible
  if (destino === "cancelada") return false;              // solo vía "Dar de baja"
  return ORDEN_ESTADOS.indexOf(destino) > ORDEN_ESTADOS.indexOf(actual);
};

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

/** Una línea de la orden. La forma del dato depende de `OrdenProduccion.tipo`:
    en "preparacion" `idProducto` es un Producto Insumo de Gestión de Insumos y
    se mide en su unidad; en "pedido" es un producto del catálogo de Productos y
    se mide en platos (con sus porciones informativas). */
export interface LineaOrden {
  idProducto: string;
  nombre: string;
  unidad: string;
  cantidadEstimada: number;
  cantidadDebida?: number | null;
  /** Solo Forma 2: id del producto del catálogo y tamaño elegido por el cliente. */
  productoId?: string | null;
  tamano?: string;
  /** id real de la línea en `tb_detalle_orden_produccion` (API): es el que
      pide `POST /:id/completar` al registrar la cantidad que salió. */
  idDetalleOp?: number;
  /** Ficha congelada en la línea según la API (`id_ft`); se usa para pedir la
      versión real al abrir "Ver ficha". */
  idFt?: number | null;
  versionFicha?: number | null;
  /** Solo Forma 2: porciones = cantidad × porciones de la ficha vigente. */
  porciones?: number;
  /** Solo Forma 2: el producto no tiene ficha técnica (gaseosas, bebidas). */
  sinFicha?: boolean;
  /** Solo Forma 2: pasos de la ficha vigente, en solo lectura. */
  pasos?: string[];
  /** Se llenan al verificar la orden. */
  cantidadReal?: number | null;
  merma?: number;
  /** Snapshot de la ficha al momento de crear/editar la orden. Si existe,
      requeridos y tiempo salen SIEMPRE de aquí, nunca de la ficha vigente. */
  fichaSnapshot?: {
    version: number;
    rendimiento: number;
    insumos: { insumoId?: string; nombre: string; cantidad: number; unidad: string }[];
    tiempoPreparacion: number;
    pasos: string[];
  };
}

/** Insumo que la orden va a consumir, con la cantidad YA calculada. Es una
    foto del momento en que se creó la orden: si después cambia la receta o el
    stock, la orden sigue diciendo qué se pidió. El stock, en cambio, se lee
    siempre del catálogo para poder avisar de los faltantes. */
export interface InsumoRequerido {
  insumoId: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  /** La receta menciona un insumo que NO está en el catálogo de Gestión de
      Insumos. Se avisa en pantalla, pero no cuenta como faltante: no es que falte
      stock, es que el insumo está dado de alta (o mal escrito) en la ficha. */
  noEncontrado?: boolean;
}

interface TransicionEstado {
  de: EstadoOrden;
  a: EstadoOrden;
  fechaHora: string; // ISO
  /** Motivo del paso, cuando no es un cambio de estado (p. ej. "Creada desde
      Insumos" en las órdenes que nacen al crear un Producto Insumo). Opcional:
      las órdenes viejas y las transiciones normales no lo traen y se pintan
      igual que siempre. */
  detalle?: string;
}

export interface OrdenProduccion {
  id: string; // "OP-001"
  /** Número real de `tb_orden_produccion` (API). Ausente en las órdenes que
      nacieron en local antes de conectar. */
  idApi?: number;
  tipo: TipoOrden;
  lineas: LineaOrden[];
  /** Foto de los insumos que la orden consume. Vacío = no se descuenta nada. */
  insumosRequeridos: InsumoRequerido[];
  /** Solo Forma 2. Una venta = una sola orden; este vínculo la bloquea. */
  ventaId?: string | null;
  ventaNumero?: string | null;
  cliente?: string | null;
  fechaSolicitada: string;   // "YYYY-MM-DD"
  horaSolicitada: string;    // "HH:MM"
  fechaLimite?: string | null; // timestamp local de Bogotá, sin zona en PostgreSQL
  estadoOrden: EstadoOrden;
  observacion: string;
  creadaEn: string;          // ISO — columna "Fecha/Hora de estado" si aún no hubo cambio
  inicioProduccion: string | null;
  entregaEstimada: string | null;
  historial: TransicionEstado[];
  /** Solo Forma 1: descripción de la preparación y tiempo, copiados del
      Producto Insumo al crear la orden, para que el histórico no cambie. */
  descripcionPreparacion?: string;
  tiempoPreparacionMin?: number | null;
  /** Marcas contables: garantizan que un movimiento se aplique UNA sola vez.
      `insumosDescontados` se pone al INICIAR (ahí se valida el inventario y
      se descuentan los insumos); `productosDescontados` y `stockAplicado`,
      al COMPLETAR. Un flag ya encendido = ese movimiento ya se aplicó (orden
      legacy, o Iniciar y Completar en la misma orden) y NO se vuelve a
      aplicar. */
  insumosDescontados?: boolean;
  /** El stock de las líneas de bebida de un pedido ya salió al completar. */
  productosDescontados?: boolean;
  /** La cantidad real producida ya sumó stock al Producto Insumo. */
  stockAplicado?: boolean;
  /** Nota de los faltantes con los que se completó (órdenes viejas: el
      camino "completar igual" se eliminó y ya no se escribe). */
  notasFaltantes?: string;
}

// ─────────────────────────── Helpers ───────────────────────────
const UNIDADES_DECIMALES = ["kg", "g", "lt", "litros", "ml"];

const esDecimal = (unidad: string) => UNIDADES_DECIMALES.includes(unidad);

/** `unidadesCompatibles`, `convertirUnidad` y `fmtCant` se mudaron a
    `shared/utils/disponibilidad`: son el mismo cálculo con el que Gestión de
    Productos muestra "Se pueden preparar", así que vive en un solo lugar. */

function fmtMinutos(min: number): string {
  if (min <= 0) return "0 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function fmtDT(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${MM}/${d.getFullYear()} ${hh}:${mm}`;
}

function fmtFechaHoraLocal(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [fecha, hora] = iso.split("T");
  if (!fecha || !hora) return "—";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio} ${hora.slice(0, 5)}`;
}

const nowISO = () => new Date().toISOString();
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
const fechaHoraBogotaMasMinuto = () =>
  fechaHoraBogotaDesdeEpoch(Math.ceil((Date.now() + 60_000) / 60_000) * 60_000);
const fechaHoraBogotaActual = () => fechaHoraBogotaDesdeEpoch(Date.now(), true);

function fechaRecogidaLocalBogota(orden: OrdenProduccion): string | null {
  if (!orden.horaSolicitada) return null;
  const hora = orden.horaSolicitada.length === 5
    ? `${orden.horaSolicitada}:00`
    : orden.horaSolicitada.slice(0, 8);
  return `${orden.fechaSolicitada}T${hora}`;
}

/** Fecha local "YYYY-MM-DD" (en Colombia después de las 19:00 `toISOString()`
    ya devuelve el día siguiente). */
const hoyLocal = () => new Date().toLocaleDateString("en-CA");

/** Compara sin distinguir mayúsculas, tildes ni espacios sobrantes. Se exporta
    porque App la necesita para resolver el producto del catálogo de una venta. */
export const normalizarNombre = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const normalizar = normalizarNombre;

/** Ficha técnica vigente de un producto: la que sigue sin fecha de fin.
    Se exporta porque App la usa para el tope de unidades del carrito
    (Bloque 5): un producto insumo sin ficha queda SIN límite. */
export function fichaVigente(fichas: FichasPorProducto, productoId: string) {
  const versiones = fichas?.[productoId];
  if (!versiones || versiones.length === 0) return null;
  return versiones.find((v) => !v.fechaFin) ?? versiones[versiones.length - 1];
}

/** Foto de la ficha que queda guardada EN LA LÍNEA de la orden: al crearse la
    línea (al elegir el Producto Insumo o al venir prellenada desde Insumos) y
    al guardar. Desde ese momento la orden no vuelve a leer la ficha vigente. */
function snapshotDeFicha(ficha: FichaVersion): NonNullable<LineaOrden["fichaSnapshot"]> {
  return {
    version: ficha.version,
    rendimiento: ficha.rendimiento ?? 1,
    insumos: ficha.insumos,
    tiempoPreparacion: ficha.tiempoPreparacion,
    pasos: ficha.pasos,
  };
}

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

const esProductoInsumo = (i: Insumo) => i.tipo === "ProductoInsumo";

/** Un insumo que no alcanza: lo que se pide, lo que hay y lo que falta. Sale
    del cálculo compartido `faltantesPara` (shared/utils/disponibilidad), que
    además avisa con un `motivo` cuando el insumo no está en el catálogo, está
    inactivo o sus unidades no se pueden convertir. */
export type Faltante = FaltanteUnidad;

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

// ─────────────────────────── Semilla de órdenes ───────────────────────────
// Las tres órdenes ya vienen con sus marcas contables puestas y conviven con los datos semilla y trae sus
// marcas contables puestas: una orden guardada no vuelve a mover el stock, ni
// aunque se vuelva a abrir el historial.
const haceHoras = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const INITIAL_ORDENES: OrdenProduccion[] = [
  {
    id: "OP-001",
    tipo: "preparacion",
    lineas: [{ idProducto: "INS-004", nombre: "Masa Pre-elaborada", unidad: "und", cantidadEstimada: 96 }],
    insumosRequeridos: [
      { insumoId: "INS-006", nombre: "Harina", cantidad: 48, unidad: "kg" },
      { insumoId: "INS-007", nombre: "Agua", cantidad: 28.8, unidad: "lt" },
      { insumoId: "INS-008", nombre: "Aceite", cantidad: 4.8, unidad: "lt" },
      { insumoId: "INS-009", nombre: "Levadura", cantidad: 0.96, unidad: "kg" },
    ],
    ventaId: null,
    cliente: null,
    fechaSolicitada: hoyLocal(),
    horaSolicitada: "",
    estadoOrden: "pendiente",
    observacion: "Lote para surtir el fin de semana.",
    creadaEn: haceHoras(3),
    inicioProduccion: null,
    entregaEstimada: null,
    historial: [],
    descripcionPreparacion: "1. Mezclar harina, agua, aceite y levadura hasta que quede homogénea.\n2. Amasar 10 minutos.\n3. Reposar 30 minutos tapada en refrigeración.\n4. Formar discos de 250 g de yogur.\n5. Refrigerar. Rinde 1 unidad por preparación.",
    tiempoPreparacionMin: 60,
  },
  {
    id: "OP-002",
    tipo: "preparacion",
    lineas: [{ idProducto: "PIN-001", nombre: "Guacamole", unidad: "lt", cantidadEstimada: 8, cantidadReal: 7.5, merma: 0.5 }],
    insumosRequeridos: [
      { insumoId: "INS-010", nombre: "Aguacate", cantidad: 16, unidad: "kg" },
      { insumoId: "INS-011", nombre: "Cebolla", cantidad: 1.6, unidad: "kg" },
      { insumoId: "INS-012", nombre: "Limón", cantidad: 0.8, unidad: "lt" },
    ],
    ventaId: null,
    cliente: null,
    fechaSolicitada: hoyLocal(),
    horaSolicitada: "",
    estadoOrden: "completada",
    observacion: "",
    creadaEn: haceHoras(26),
    inicioProduccion: haceHoras(25),
    entregaEstimada: haceHoras(24),
    historial: [
      { de: "pendiente", a: "en-proceso", fechaHora: haceHoras(25) },
      { de: "en-proceso", a: "completada", fechaHora: haceHoras(24) },
    ],
    descripcionPreparacion: "1. Triturar aguacate con limón para que no se oxide.\n2. Agregar cebolla picada fina.\n3. Ajustar sal y cilantro al gusto.\n4. Guardar en recipiente cerrado, en refrigeración.",
    tiempoPreparacionMin: 25,
    insumosDescontados: true,
    stockAplicado: true,
  },
  {
    id: "OP-003",
    tipo: "pedido",
    lineas: [
      { idProducto: "PROD-001", productoId: "PROD-001", nombre: "Pizza Peperoni", unidad: "und", cantidadEstimada: 2, tamano: "Mediana", porciones: 16, sinFicha: false },
      { idProducto: "PROD-012", productoId: "PROD-012", nombre: "Gaseosa Cuatro", unidad: "und", cantidadEstimada: 1, sinFicha: true },
    ],
    insumosRequeridos: [
      { insumoId: "INS-004", nombre: "Masa Pre-elaborada", cantidad: 2, unidad: "und" },
      { insumoId: "INS-002", nombre: "Salsa de Tomate", cantidad: 0.4, unidad: "lt" },
      { insumoId: "INS-001", nombre: "Queso Mozzarella", cantidad: 0.5, unidad: "kg" },
      { insumoId: "INS-003", nombre: "Pepperoni", cantidad: 0.3, unidad: "kg" },
    ],
    ventaId: "1",
    ventaNumero: "1",
    cliente: "María González",
    fechaSolicitada: hoyLocal(),
    horaSolicitada: "18:30",
    estadoOrden: "pendiente",
    observacion: "",
    creadaEn: haceHoras(2),
    inicioProduccion: null,
    entregaEstimada: null,
    historial: [],
  },
];

const PER_PAGE = 5;

const emptyForm = (tipo: TipoOrden = "preparacion"): OrdenForm => ({
  tipo,
  lineas: [nuevaLinea(tipo)],
  ventaId: null,
  fechaSolicitada: "",
  horaSolicitada: "",
  observacion: "",
});

interface OrdenForm {
  tipo: TipoOrden;
  lineas: LineaOrden[];
  ventaId: string | null;
  fechaSolicitada: string;
  horaSolicitada: string;
  observacion: string;
}

function nuevaLinea(tipo: TipoOrden): LineaOrden {
  return { idProducto: "", nombre: "", unidad: "und", cantidadEstimada: 0 };
}

/** C6 — En "Preparación en lote" cada línea necesita un Producto Insumo
    elegido y una cantidad MAYOR O IGUAL A 1. Mientras eso no se cumpla, la
    línea pinta su error en tiempo real y Guardar queda bloqueado. */
const preparacionInvalida = (lineas: LineaOrden[]): boolean =>
  lineas.some((l) => !l.idProducto || l.cantidadEstimada < 1);

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

/** Insumos que consume una línea, para UNA unidad y con el factor de su
    tamaño. Manda el SNAPSHOT de la línea (la foto de la ficha al crear o
    editar la orden: sus filas y su rendimiento); solo para el factor de
    tamaño —que el snapshot no guarda— se leen los tamaños de la ficha
    vigente. Sin snapshot se cae a la ficha vigente. Es el cálculo
    compartido: `lineasDeVenta`, `crearOrdenReemplazo`, Productos y el
    control de faltantes usan la misma fórmula. */
function requeridosDeLinea(linea: LineaOrden, fichas: FichasPorProducto): InsumoRequerido[] {
  const snap = linea.fichaSnapshot;
  const ficha = fichaVigente(fichas, linea.idProducto);
  const base = snap
    ? { insumos: snap.insumos, rendimiento: snap.rendimiento, porcionesPorTamano: ficha?.porcionesPorTamano }
    : ficha;
  if (!base) return [];
  const cantidad = linea.cantidadEstimada || 0;
  return requeridosPorUnidad(base, linea.tamano).map((r) => ({
    ...r,
    cantidad: cantidad * r.cantidad,
  }));
}

/** "Necesita: 1 masa · 0,2 kg queso mozzarella" de UNA línea, a partir de los
    requeridos que ya salieron de `requeridosDeLinea` (× cantidad × factor de
    tamaño, con rendimiento y con unidades contables sin multiplicar). Es el
    mismo número que descuenta Insumos al Iniciar, así que el texto nunca
    miente. Las líneas sin ficha (bebidas) no necesitan nada → texto vacío. */
function resumenNecesita(requeridos: InsumoRequerido[]): string {
  if (requeridos.length === 0) return "";
  return requeridos.map((r) => `${fmtCant(r.cantidad, r.unidad)} ${r.nombre}`).join(" · ");
}

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

/** Bloque 4 — Aviso de faltantes dentro de los modales Crear/Editar de una
    Preparación en lote: el mensaje exacto + la lista, igual que al crear un
    producto insumo en Gestión de Insumos. Mientras este bloque se muestre,
    el botón Crear/Guardar viene DESHABILITADO: no existe "Guardar igual"
    para preparaciones (eso es solo para pedidos, que vienen de una venta ya
    pagada). Con insumo ausente/inactivo/unidad incompatible manda el motivo
    (`motivoFaltante`), que ya trae el nombre del insumo. */
function AvisoFaltantes({ faltantes }: { faltantes: Faltante[] }) {
  if (faltantes.length === 0) return null;
  return (
    <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-1.5">
      <p className="text-sm font-semibold text-red-700 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>No hay la cantidad suficiente de insumos. Por favor, disminuye la cantidad.</span>
      </p>
      {faltantes.map((f) => (
        <p key={f.insumoId} className="pl-6 text-xs text-red-700">
          {f.motivo
            ? motivoFaltante(f)
            : `Faltan ${fmtCant(f.falta, f.unidad)} de ${f.nombre} (hay ${fmtCant(f.stock, f.unidad)})`}
        </p>
      ))}
    </div>
  );
}

/** Líneas de una orden "Pedido de cliente", en solo lectura, desde el detalle
    de la venta. Cada línea trae sus insumos y el consumo se multiplica por la
    cantidad de platos. */
function lineasDeVenta(
  venta: Venta,
  productos: Producto[],
  fichas: FichasPorProducto,
  insumos: Insumo[],
): { lineas: LineaOrden[]; insumos: InsumoRequerido[] } {
  const detalle = venta.detalle ?? [];
  const lineas: LineaOrden[] = [];
  const acc = new Map<string, InsumoRequerido>();

  for (const d of detalle) {
    // El detalle guarda el nombre del producto con el tamaño pegado ("Pizza
    // Peperoni — Mediana"). Se resuelve el id por `productoId` y, si la venta
    // es vieja y no lo trae, por nombre.
    const porId = d.productoId ? productos.find((p) => p.id === d.productoId) : undefined;
    const base = d.nombre.split(" — ")[0].trim();
    const porNombre = productos.find((p) => normalizar(p.nombre) === normalizar(base));
    const producto = porId ?? porNombre ?? null;
    const tamano = d.tamaño ?? (d.nombre.includes(" — ") ? d.nombre.split(" — ")[1].trim() : "");
    const ficha = producto ? fichaVigente(fichas, producto.id) : null;

    lineas.push({
      idProducto: producto?.id ?? "",
      productoId: producto?.id ?? null,
      nombre: producto?.nombre ?? base,
      unidad: "und",
      cantidadEstimada: d.cantidad,
      tamano,
      porciones: ficha ? d.cantidad * (porcionesReferencia(ficha) || 0) : undefined,
      sinFicha: !ficha,
      pasos: ficha?.pasos?.length ? [...ficha.pasos] : undefined,
      fichaSnapshot: ficha ? {
        version: ficha.version,
        rendimiento: ficha.rendimiento ?? 1,
        insumos: ficha.insumos,
        tiempoPreparacion: ficha.tiempoPreparacion,
        pasos: ficha.pasos,
      } : undefined,
    });

    if (!ficha) continue;
    // Insumos del cálculo compartido (`requeridosPorUnidad`), que ya trae la
    // receta con el factor del tamaño de la venta y su rendimiento.
    for (const r of requeridosPorUnidad(ficha, tamano)) {
      const cantidad = d.cantidad * r.cantidad;
      // La ficha guarda {nombre, cantidad, unidad} y, desde la unificación,
      // también el id del insumo: se resuelve contra Gestión de Insumos por id
      // y, si no, por nombre (mismo criterio que `resolverInsumo`) para
      // descontar contra el stock real.
      const ins = insumos.find((i) => i.id === r.insumoId)
        ?? insumos.find((i) => normalizar(i.nombre) === normalizar(r.nombre));
      const clave = ins?.id ?? r.insumoId;
      const previa = acc.get(clave);
      acc.set(clave, previa
        ? { ...previa, cantidad: previa.cantidad + cantidad }
        : {
            insumoId: clave,
            nombre: r.nombre,
            cantidad,
            unidad: r.unidad,
            noEncontrado: !ins,
          });
    }
  }

  return { lineas, insumos: [...acc.values()] };
}

/** Siguiente número de orden libre. `length + 1` reutilizaría un id si se borró
    una orden del medio; se toma el mayor sufijo numérico, como en Usuarios. */
export const siguienteOrdenId = (ordenes: OrdenProduccion[]) => {
  const max = ordenes.reduce((m, o) => Math.max(m, parseInt(o.id.replace("OP-", ""), 10) || 0), 0);
  return `OP-${String(max + 1).padStart(3, "0")}`;
};

/** Arma la orden "Pedido de cliente" de una venta: líneas del detalle en solo
    lectura, insumos que consumen sus fichas y fecha/hora de recogida. La usa el
    buscador manual de la pantalla y la creación automática de App. */
export function crearOrdenPedido(
  venta: Venta,
  ctx: { productos: Producto[]; fichas: FichasPorProducto; insumos: Insumo[] },
  id: string,
): OrdenProduccion {
  const armado = lineasDeVenta(venta, ctx.productos, ctx.fichas, ctx.insumos);
  return {
    id,
    tipo: "pedido",
    lineas: armado.lineas,
    insumosRequeridos: armado.insumos,
    ventaId: venta.id,
    ventaNumero: venta.id,
    cliente: venta.usuario,
    fechaSolicitada: venta.fecha,
    horaSolicitada: venta.horaRecogida ?? "",
    estadoOrden: "pendiente",
    observacion: "",
    creadaEn: nowISO(),
    inicioProduccion: null,
    entregaEstimada: null,
    historial: [],
  };
}

/** Ítem de canje de una devolución: producto del menú elegido como reemplazo.
    El nombre es el del catálogo público (mismo `nombre` que trae el `Producto`
    del panel, porque el catálogo se arma con `productoACatalogo`). */
export type ItemReemplazo = { nombre: string; cantidad: number; tamaño?: string };

/** Orden "Pedido de cliente" para el CANJE de una devolución: la OP anterior
    (vinculada por `ventaId`) queda cancelada y esta reemplaza lo que el
    cliente se lleva. Nace en "pendiente": al INICIAR descuenta sus insumos
    (si alcanza el inventario) y al COMPLETAR solo baja el stock de las líneas
    de bebida, igual que cualquier pedido. */
export function crearOrdenReemplazo(
  venta: Venta,
  items: ItemReemplazo[],
  ctx: { productos: Producto[]; fichas: FichasPorProducto; insumos: Insumo[] },
  id: string,
): OrdenProduccion {
  const lineas: LineaOrden[] = [];
  const acc = new Map<string, InsumoRequerido>();

  for (const it of items) {
    const cantidad = it.cantidad || 0;
    if (cantidad <= 0) continue;
    const base = it.nombre.split(" — ")[0].trim();
    const producto =
      ctx.productos.find((p) => normalizar(p.nombre) === normalizar(base)) ?? null;
    const ficha = producto ? fichaVigente(ctx.fichas, producto.id) : null;

    lineas.push({
      idProducto: producto?.id ?? "",
      productoId: producto?.id ?? null,
      nombre: producto?.nombre ?? base,
      unidad: "und",
      cantidadEstimada: cantidad,
      tamano: it.tamaño ?? "",
      porciones: ficha ? cantidad * (porcionesReferencia(ficha) || 0) : undefined,
      sinFicha: !ficha,
      pasos: ficha?.pasos?.length ? [...ficha.pasos] : undefined,
      // La línea del canje queda congelada con la ficha del momento: la línea
      // original de la venta (`venta.detalle`) no guarda snapshot, así que se
      // usa la ficha vigente del producto. Desde aquí la orden no vuelve a
      // leer la ficha vigente (mismo criterio que `lineasDeVenta`).
      fichaSnapshot: ficha ? snapshotDeFicha(ficha) : undefined,
    });

    if (!ficha) continue;
    // Mismo cálculo compartido que `lineasDeVenta`, con el factor del tamaño
    // que eligió el cliente en el canje.
    for (const r of requeridosPorUnidad(ficha, it.tamaño)) {
      const req = cantidad * r.cantidad;
      const ins = ctx.insumos.find((i) => i.id === r.insumoId)
        ?? ctx.insumos.find((i) => normalizar(i.nombre) === normalizar(r.nombre));
      const clave = ins?.id ?? r.insumoId;
      const previa = acc.get(clave);
      acc.set(clave, previa
        ? { ...previa, cantidad: previa.cantidad + req }
        : { insumoId: clave, nombre: r.nombre, cantidad: req, unidad: r.unidad, noEncontrado: !ins });
    }
  }

  return {
    id,
    tipo: "pedido",
    lineas,
    insumosRequeridos: [...acc.values()],
    ventaId: venta.id,
    ventaNumero: venta.id,
    cliente: venta.usuario,
    fechaSolicitada: venta.fecha,
    horaSolicitada: venta.horaRecogida ?? "",
    estadoOrden: "pendiente",
    observacion: "Canje por devolución",
    creadaEn: nowISO(),
    inicioProduccion: null,
    entregaEstimada: null,
    historial: [],
  };
}

/** Orden "Preparación en lote" de UN Producto Insumo, con la "Cantidad a
    hacer" de su ficha. La crea Gestión de Insumos al crear un producto insumo
    NUEVO (A2): nace "pendiente" con la foto de la ficha en la línea, sus
    insumos requeridos ya calculados —el MISMO cálculo de `requeridosDeLinea`,
    así lo que se ve y lo que se descuenta dan igual— y, en el historial, el
    motivo "Creada desde Insumos". NO descuenta nada al crearse: el stock baja
    al INICIAR la orden, con la validación de inventario de siempre.
    La ficha llega como ARGUMENTO (la v1 recién creada) porque al ser el mismo
    clic, el estado `fichas` de App todavía no la contiene. */
export function crearOrdenPreparacion(
  pi: Insumo,
  ficha: FichaVersion | null,
  ctx: { fichas: FichasPorProducto },
  id: string,
): OrdenProduccion {
  const ahora = nowISO();
  const linea: LineaOrden = {
    idProducto: pi.id,
    nombre: pi.nombre,
    unidad: pi.unidadMedida,
    // La "Cantidad a hacer" de la ficha es lo que se va a producir. El
    // mínimo válido de una línea de preparación es 1, así que una ficha sin
    // rendimiento (no debería pasar: el modal lo exige) cae ahí.
    cantidadEstimada:
      ficha && ficha.rendimiento && ficha.rendimiento > 0 ? ficha.rendimiento : 1,
    // Foto de la ficha v1: desde aquí la orden no vuelve a leer la vigente.
    fichaSnapshot: ficha ? snapshotDeFicha(ficha) : undefined,
  };
  return {
    id,
    tipo: "preparacion",
    lineas: [linea],
    insumosRequeridos: requeridosDeLinea(linea, ctx.fichas),
    ventaId: null,
    ventaNumero: null,
    cliente: null,
    fechaSolicitada: hoyLocal(),
    horaSolicitada: "",
    estadoOrden: "pendiente",
    observacion: "",
    creadaEn: ahora,
    inicioProduccion: null,
    entregaEstimada: null,
    historial: [{ de: "pendiente", a: "pendiente", fechaHora: ahora, detalle: "Creada desde Insumos" }],
    descripcionPreparacion: ficha?.pasos.join("\n") || undefined,
    tiempoPreparacionMin: ficha ? ficha.tiempoPreparacion : null,
  };
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
      "Por verificar": { texto: "FF9A3412", fondo: "FFFFEDD5" },
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
        valor: (o) => (o.estadoOrden === "completada"
          ? o.lineas.map((l) => fmtCant(l.cantidadReal ?? 0, l.unidad)).join("; ")
          : "—"),
      },
      { header: "Merma", valor: (o) => (totalMerma(o.lineas) > 0 ? resumenMerma(o.lineas) : "0"), numFmt: "#,##0.00" },
      { header: "Estado", valor: (o) => ESTADO_LABEL[o.estadoOrden], esEstado: true },
      { header: "Fecha/Hora de estado", valor: (o) => fmtDT(o.historial[o.historial.length - 1]?.fechaHora ?? o.creadaEn) },
      { header: "Observación", valor: (o) => o.observacion },
    ],
  });
  toast.success(`Archivo Excel descargado (${archivo})`);
}

// ─────────────────────────── Piezas de UI ───────────────────────────

/** Tabla de solo lectura con los insumos que se van a consumir y el stock de
    hoy de cada uno. Lo que no alcanza sale en rojo. */
function TablaInsumosRequeridos({
  requeridos,
  insumos,
}: {
  requeridos: InsumoRequerido[];
  insumos: Insumo[];
}) {
  if (requeridos.length === 0) {
    return (
      <p className="px-3 py-3 bg-muted/60 rounded-xl border border-border text-sm text-muted-foreground">
        No hay insumos que consumir: la receta está vacía o el producto no tiene ficha
        técnica.
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="grid grid-cols-5 gap-2 px-3 py-2 bg-muted/60 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <span className="col-span-2">Insumo</span>
        <span className="text-right">Requerido</span>
        <span className="text-right">Stock actual</span>
        <span className="text-right">Estado</span>
      </div>
      {requeridos.map((r) => {
        const stock = insumos.find((i) => i.id === r.insumoId)?.stockActual;
        // Un insumo que la receta menciona y no está en el catálogo no es un
        // faltante: se avisa distinto para que no se bloquee la orden por un alta
        // que falta en Gestión de Insumos.
        const noExiste = stock === undefined;
        const falta = noExiste ? 0 : Math.max(0, Math.round((r.cantidad - stock) * 1000) / 1000);
        return (
          <div key={r.insumoId} className={`grid grid-cols-5 gap-2 px-3 py-2 text-xs border-t border-border items-center ${noExiste ? "bg-amber-50/60" : falta > 0 ? "bg-red-50/60" : ""}`}>
            <span className="col-span-2 font-medium text-foreground truncate">{r.nombre}</span>
            <span className="text-right tabular-nums font-semibold text-foreground">{fmtCant(r.cantidad, r.unidad)}</span>
            <span className="text-right tabular-nums text-muted-foreground">{noExiste ? "—" : fmtCant(stock, r.unidad)}</span>
            <span className="text-right">
              {noExiste
                ? <span className="text-amber-600 font-semibold" title="El insumo no está dado de alta en Gestión de Insumos">No está en el catálogo</span>
                : falta > 0
                  ? <span className="text-red-600 font-semibold">Faltan {fmtCant(falta, r.unidad)}</span>
                  : <span className="text-emerald-600 font-semibold">Alcanza</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LineaPreparacion({
  linea,
  onChange,
  onRemove,
  puedeQuitar,
  insumos,
  productos,
  fichas,
}: {
  linea: LineaOrden;
  onChange: (l: LineaOrden) => void;
  onRemove: () => void;
  puedeQuitar: boolean;
  insumos: Insumo[];
  productos: Producto[];
  fichas: FichasPorProducto;
}) {
  const opcionesInsumos = insumos.filter((i) => esProductoInsumo(i) && i.estado === "activo");
  const opcionesProductos = productos;
  const pi = esIdInsumo(linea.idProducto)
    ? insumos.find((i) => i.id === linea.idProducto)
    : undefined;
  const bajo = !!pi && pi.stockActual < pi.stockMinimo;
  const ficha = fichaVigente(fichas, linea.idProducto);
  const requeridos = requeridosDeLinea(linea, fichas);
  // C8: "Necesita: …" de ESTA línea, con el mismo número que descuenta el
  // Inicio (factor de tamaño y unidades contables incluidos).
  const necesita = resumenNecesita(requeridos);

  const elegir = (id: string) => {
    const esInsumo = esIdInsumo(id);
    const elegidoInsumo = esInsumo ? insumos.find((i) => i.id === id) : undefined;
    const elegidoProducto = esInsumo ? undefined : productos.find((p) => p.id === id);
    const ficha = fichaVigente(fichas, id);
    onChange({
      ...linea,
      idProducto: id,
      nombre: elegidoInsumo?.nombre ?? elegidoProducto?.nombre ?? "",
      unidad: elegidoInsumo?.unidadMedida ?? "und",
      cantidadEstimada: 0,
      // La línea nace con su foto de la ficha: la descripción, el tiempo y los
      // insumos requeridos se leen de aquí, no de la ficha vigente.
      fichaSnapshot: ficha ? snapshotDeFicha(ficha) : undefined,
    });
  };

  return (
    <div className="p-4 border border-border rounded-2xl bg-card space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Producto Insumo a preparar
          </label>
          <select
            value={linea.idProducto}
            onChange={(e) => elegir(e.target.value)}
            className="w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none cursor-pointer"
          >
            <option value="">Selecciona un Producto Insumo</option>
            {opcionesProductos.length > 0 && (
              <optgroup label="Productos">
                {opcionesProductos.map((p) => {
                  const puedeProducirse =
                    tipoDe(p, p.categoriaNombre) === "Producto insumo" && !!fichaVigente(fichas, p.id);
                  return (
                    <option key={p.id} value={p.id} disabled={!puedeProducirse}>
                      {p.nombre}{puedeProducirse ? "" : " · No disponible para producción"}
                    </option>
                  );
                })}
              </optgroup>
            )}
            {opcionesInsumos.length > 0 && (
              <optgroup label="Insumos">
                {opcionesInsumos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre} · {i.stockActual} {i.unidadMedida} (mín {i.stockMinimo})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {bajo && (
            <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Stock bajo
            </span>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Cantidad a producir ({linea.unidad})
          </label>
          {/* 0 = vacío con placeholder "0" (punto B1); al guardar se cuenta
              como 0. C6: mínimo 1 una vez elegido el producto, con error en
              tiempo real y el botón Guardar bloqueado. */}
          <input
            type="number"
            min={1}
            step={esDecimal(linea.unidad) ? 0.1 : 1}
            value={linea.cantidadEstimada === 0 ? "" : linea.cantidadEstimada}
            placeholder="0"
            onChange={(e) => onChange({ ...linea, cantidadEstimada: numeroDeInput(limpiarNumeroInput(e.target.value)) })}
            className="w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {linea.idProducto && linea.cantidadEstimada < 1 && (
            <p className="mt-1 text-[11px] font-semibold text-amber-700">
              La cantidad mínima es 1 {linea.unidad}
            </p>
          )}
        </div>
        {puedeQuitar && (
          <button
            type="button"
            onClick={onRemove}
            title="Quitar línea"
            className="p-2.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {(pi || ficha) && (
        <div className="space-y-3">
          {necesita && (
            // C8: lo que esta línea gasta en total, con el factor de su
            // tamaño y con las unidades contables sin multiplicar. Es el
            // mismo número que descuenta Insumos al Iniciar.
            <p className="text-[11px] text-muted-foreground">
              Necesita: <span className="font-semibold text-foreground">{necesita}</span>
            </p>
          )}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Insumos requeridos</p>
            <TablaInsumosRequeridos requeridos={requeridos} insumos={insumos} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Descripción de la preparación</p>
            <p className="text-xs text-foreground bg-muted/60 rounded-xl border border-border px-3 py-2 whitespace-pre-wrap leading-relaxed">
              {linea.fichaSnapshot?.pasos.join("\n") || "Este Producto Insumo no tiene descripción de preparación."}
            </p>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            Tiempo estimado:{" "}
            <strong className="text-foreground">
              {linea.fichaSnapshot?.tiempoPreparacion ? fmtMinutos(linea.fichaSnapshot.tiempoPreparacion) : "Sin tiempo definido"}
            </strong>
          </p>
        </div>
      )}
    </div>
  );
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
  canCreate = true,
  canDelete = true,
  canExportExcel = true,
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
  recargarProduccion?: () => Promise<void>;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExportExcel?: boolean;
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
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | TipoOrden>("todos");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | EstadoOrden>("todos");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<OrdenProduccion | null>(null);
  const [detailItem, setDetailItem] = useState<OrdenProduccion | null>(null);
  const [verFicha, setVerFicha] = useState<{ ordenId: string; lineaIdx: number } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<OrdenForm>(emptyForm());

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

  // Estado del modal de Verificar para las cantidades reales y debidas.
  const [completarItem, setCompletarItem] = useState<OrdenProduccion | null>(null);
  const [reales, setReales] = useState<Record<number, string>>({});
  const [calculosDebidos, setCalculosDebidos] = useState<Record<number, CalculoVerificacionLineaApi>>({});
  const [cargandoCalculoDebido, setCargandoCalculoDebido] = useState(false);
  const [generarItem, setGenerarItem] = useState<OrdenProduccion | null>(null);
  const [cantidadesGenerar, setCantidadesGenerar] = useState<Record<number, string>>({});
  const [fechaLimiteGenerar, setFechaLimiteGenerar] = useState("");
  const [minFechaLimiteGenerar, setMinFechaLimiteGenerar] = useState(fechaHoraBogotaMasMinuto);
  const [ahoraBogotaGenerar, setAhoraBogotaGenerar] = useState(fechaHoraBogotaActual);
  const [capacidadGenerar, setCapacidadGenerar] = useState<{
    cantidades_bloqueadas: boolean;
    lineas: CapacidadLineaApi[];
  } | null>(null);
  const [cargandoCapacidadGenerar, setCargandoCapacidadGenerar] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [faltantesGenerar, setFaltantesGenerar] = useState<Faltante[]>([]);

  useEffect(() => {
    if (!generarItem) return;
    const actualizarHora = () => {
      setMinFechaLimiteGenerar(fechaHoraBogotaMasMinuto());
      setAhoraBogotaGenerar(fechaHoraBogotaActual());
    };
    actualizarHora();
    const intervalo = window.setInterval(actualizarHora, 15_000);
    return () => window.clearInterval(intervalo);
  }, [generarItem]);

  const fechaRecogidaGenerar = generarItem?.tipo === "pedido"
    ? fechaRecogidaLocalBogota(generarItem)
    : null;
  const recogidaFuturaGenerar = !!fechaRecogidaGenerar
    && fechaRecogidaGenerar > ahoraBogotaGenerar;
  const recogidaVencidaGenerar = generarItem?.tipo === "pedido"
    && !!generarItem.horaSolicitada
    && !recogidaFuturaGenerar;

  const maximosGenerar = useMemo(() => {
    if (!capacidadGenerar || capacidadGenerar.cantidades_bloqueadas) return {};
    return Object.fromEntries(capacidadGenerar.lineas.map((linea) => {
      if (linea.requeridos_por_unidad.length === 0) return [linea.id_detalle_op, null];
      let maximo = Number.POSITIVE_INFINITY;
      for (const requerido of linea.requeridos_por_unidad) {
        if (requerido.motivo || requerido.stock == null || requerido.requerido <= 0) {
          maximo = 0;
          break;
        }
        const consumidoPorOtrasLineas = capacidadGenerar.lineas
          .filter((otra) => otra.id_detalle_op !== linea.id_detalle_op)
          .reduce((total, otra) => {
            const recurso = otra.requeridos_por_unidad.find((item) => item.id_insumo === requerido.id_insumo);
            return total + (recurso?.requerido ?? 0) * Number(cantidadesGenerar[otra.id_detalle_op] ?? 0);
          }, 0);
        const disponible = requerido.stock - consumidoPorOtrasLineas;
        maximo = Math.min(maximo, Math.max(0, Math.floor((disponible + 0.000001) / requerido.requerido)));
      }
      return [linea.id_detalle_op, Number.isFinite(maximo) ? maximo : null];
    }));
  }, [capacidadGenerar, cantidadesGenerar]);

  const cantidadesGenerarValidas = !!generarItem && generarItem.lineas.every((linea) => {
    if (generarItem.tipo === "pedido") return true;
    const idDetalle = linea.idDetalleOp;
    if (idDetalle == null) return false;
    const texto = cantidadesGenerar[idDetalle] ?? "";
    const cantidad = Number(texto);
    if (texto.trim() === "" || !Number.isFinite(cantidad) || cantidad < 1) return false;
    if (!esIdInsumo(linea.idProducto) && !Number.isSafeInteger(cantidad)) return false;
    const maximo = maximosGenerar[idDetalle];
    return maximo == null || cantidad <= maximo;
  });
  const capacidadGenerarCompleta = !!generarItem && !!capacidadGenerar
    && capacidadGenerar.lineas.length === generarItem.lineas.length
    && generarItem.lineas.every((linea) =>
      capacidadGenerar.lineas.some((capacidad) => capacidad.id_detalle_op === linea.idDetalleOp));
  const generacionValida =
    !!fechaLimiteGenerar &&
    fechaLimiteGenerar >= minFechaLimiteGenerar &&
    (generarItem?.tipo !== "pedido" ||
      !recogidaFuturaGenerar ||
      (!!fechaRecogidaGenerar && fechaLimiteGenerar <= fechaRecogidaGenerar.slice(0, 16))) &&
    cantidadesGenerarValidas &&
    !cargandoCapacidadGenerar &&
    capacidadGenerarCompleta &&
    !generando;
  // Faltantes detectados al INICIAR: abren el modal "Inventario insuficiente"
  // (lista de "Faltan X de Y (hay Z)" con su motivo) y la orden se queda
  // Pendiente: no se descuenta nada ni cambia de estado.
  const [faltantesIniciar, setFaltantesIniciar] = useState<
    { ordenId: string; faltantes: Faltante[] } | null
  >(null);
  // Bloque 4 — Pedido (viene de una venta pagada): NUNCA se bloquea al
  // guardar. El aviso lista los faltantes de insumos y/o las líneas cuya
  // receta no se pudo calcular (pizza sin ficha técnica, producto del menú
  // sin resolver) y se confirma con "Guardar igual": la orden queda Pendiente
  // con su badge "Faltan insumos" y el bloqueo real sigue en Iniciar.
  // (La preparación en lote no pasa por aquí: ella bloquea con el botón
  // Crear/Guardar deshabilitado — ver `faltantesForm` y `AvisoFaltantes`.)
  const [avisoGuardar, setAvisoGuardar] = useState<
    { faltantes: Faltante[]; avisos: string[]; onConfirm: () => void } | null
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

  const [darBajaItem, setDarBajaItem] = useState<OrdenProduccion | null>(null);
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
  // Mismo campo solo lectura que usa la ficha detalle de Gestión de Productos.
  const readCls = "w-full px-3 py-2 bg-muted/50 rounded-xl border border-border text-sm text-foreground";

  // ── Listado ────────────────────────────────────────────────────────
  const ultimoCambio = (o: OrdenProduccion) =>
    o.historial[o.historial.length - 1]?.fechaHora ?? o.creadaEn;

  const resumenProductos = (o: OrdenProduccion) => {
    const nombres = o.lineas.map((l) => l.nombre);
    if (nombres.length === 0) return "—";
    return nombres.length === 1 ? nombres[0] : `${nombres[0]} +${nombres.length - 1} más`;
  };

  const filtradas = useMemo(() =>
    ordenes.filter((o) => {
      if (filtroTipo !== "todos" && o.tipo !== filtroTipo) return false;
      if (filtroEstado !== "todos" && o.estadoOrden !== filtroEstado) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return o.id.toLowerCase().includes(q)
        || (o.ventaNumero ?? "").toLowerCase().includes(q)
        || (o.cliente ?? "").toLowerCase().includes(q)
        || o.lineas.some((l) => l.nombre.toLowerCase().includes(q));
    }), [ordenes, search, filtroTipo, filtroEstado]);

  const totalPages = Math.ceil(filtradas.length / PER_PAGE);
  const paged = filtradas.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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
        : { id_producto: Number(l.idProducto), cantidad: l.cantidadEstimada });
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
    const venta = form.tipo === "pedido" && form.ventaId
      ? ventas.find((v) => v.id === form.ventaId)
      : undefined;
    const armado = venta
      ? lineasDeVenta(venta, productos, fichasPorProducto, insumos)
      : null;
    // Requeridos del MISMO modo que los guarda `guardarOrden`: pedidos desde
    // el detalle de la venta; preparaciones con su snapshot cargado.
    const requeridos = armado
      ? armado.insumos
      : requeridosDePreparaciones(
          prepararLineasSnapshot(form.lineas, fichasPorProducto),
          fichasPorProducto,
          insumos,
        );

    // Preparación en lote: bloqueo. El mensaje y la lista ya están a la
    // vista en el formulario (botón deshabilitado), el toast evita atajos.
    if (form.tipo === "preparacion") {
      if (faltantesPara(requeridos, 1, insumos).length > 0) {
        toast.error("No hay la cantidad suficiente de insumos. Por favor, disminuye la cantidad.");
        return;
      }
      guardarOrden(form);
      return;
    }

    // Pedido: avisos de receta no calculable (nunca bloquean)…
    const avisos: string[] = [];
    if (armado) {
      for (const l of armado.lineas) {
        if (esBebida(l, productos)) continue;
        if (!productoDeLinea(l, productos)) {
          avisos.push(`No se encontró «${l.nombre}» en Productos: revisa que el nombre sea igual al del menú`);
          continue;
        }
        const clave = l.productoId ?? l.idProducto;
        const conFicha = l.fichaSnapshot ?? (clave ? fichaVigente(fichasPorProducto, clave) : null);
        if (!conFicha) avisos.push(`«${l.nombre}» no tiene ficha técnica`);
      }
    }
    // …y faltantes de insumos: ninguno de los dos corta el guardado.
    const faltantes = faltantesPara(requeridos, 1, insumos);
    if (faltantes.length > 0 || avisos.length > 0) {
      setAvisoGuardar({ faltantes, avisos, onConfirm: () => guardarOrden(form) });
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
    } else if (preparacionInvalida(form.lineas)) {
      // C6: producto elegido y cantidad ≥ 1 en cada línea. El error ya se
      // pinta en la propia línea y el botón Crear viene bloqueado.
      toast.error("Elige un Producto Insumo y una cantidad mayor o igual a 1 en cada línea");
      return;
    }
    guardarConValidacion(form);
  };

  const handleEdit = () => {
    if (!editItem) return;
    if (editItem.tipo === "preparacion" && preparacionInvalida(editItem.lineas)) {
      toast.error("Elige un Producto Insumo y una cantidad mayor o igual a 1 en cada línea");
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

  const abrirGenerar = async (orden: OrdenProduccion) => {
    if (orden.lineas.some((linea) => linea.idDetalleOp == null)) {
      toast.error("No se pudieron cargar los detalles de la orden. Recarga el listado e inténtalo de nuevo.");
      return;
    }
    setGenerarItem(orden);
    setCantidadesGenerar(Object.fromEntries(orden.lineas.map((linea) => [
      linea.idDetalleOp as number,
      String(linea.cantidadEstimada),
    ])));
    const recogida = orden.tipo === "pedido" ? fechaRecogidaLocalBogota(orden) : null;
    setFechaLimiteGenerar(
      recogida && recogida > fechaHoraBogotaActual()
        ? recogida.slice(0, 16)
        : "",
    );
    setCapacidadGenerar(null);
    setFaltantesGenerar([]);
    setCargandoCapacidadGenerar(true);
    try {
      setCapacidadGenerar(await obtenerCapacidadOrdenProduccion(orden.id));
    } catch (error) {
      setGenerarItem(null);
      toast.error(mensajeErrorOrdenes(error, "No se pudo calcular la capacidad de producción."));
    } finally {
      setCargandoCapacidadGenerar(false);
    }
  };

  /** Generar (Pendiente → En proceso) actualiza cantidades, valida la fecha
      límite, bloquea y descuenta insumos dentro de la transacción del backend. */
  const confirmarGenerar = async () => {
    if (!generarItem || !generacionValida) return;
    const orden = generarItem;
    setGenerando(true);
    setFaltantesGenerar([]);
    try {
      const actualizada = await iniciarOrdenProduccion(orden.id, {
        fechaEntregaEstimada: fechaLimiteGenerar,
        ...(orden.tipo === "preparacion"
          ? {
              lineas: orden.lineas.map((linea) => ({
                idDetalleOp: linea.idDetalleOp as number,
                cantidad: Number(cantidadesGenerar[linea.idDetalleOp as number]),
              })),
            }
          : {}),
      });
      setOrdenes((p) => p.map((o) => (o.id === orden.id ? actualizada : o)));
      toast.success(
        orden.tipo === "preparacion" && actualizada.insumosDescontados
          ? `${orden.id} en proceso — insumos descontados`
          : `${orden.id} en proceso`,
      );
      setGenerarItem(null);
      setCapacidadGenerar(null);
      await recargarProduccion?.();
    } catch (error) {
      const faltantes = ((error as ErrorConFaltantes).faltantes ?? []).map(mapearFaltanteApi);
      if (faltantes.length > 0) {
        setFaltantesGenerar(faltantes);
        return;
      }
      toast.error(mensajeErrorOrdenes(error, "No se pudo generar la orden."));
    } finally {
      setGenerando(false);
    }
  };

  const abrirCompletar = async (id: string) => {
    const orden = ordenes.find((o) => o.id === id);
    if (!orden) return;
    setCompletarItem(orden);
    setReales({});
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
        && calculo.cantidad_debida >= 0;
    });
  const completarEsPedido = completarItem?.tipo === "pedido";
  const completarOk = !completarItem || completarEsPedido
    || (!cargandoCalculoDebido && cantidadesVerificacionOk(completarItem));

  /** Verifica la producción; el backend aplica stock y registra la merma en
      la misma transacción. */
  const confirmarCompletar = async () => {
    if (!completarItem) return;
    const orden = ordenes.find((o) => o.id === completarItem.id);
    if (!orden) return;

    if (orden.tipo === "preparacion" && !cantidadesVerificacionOk(orden)) {
      toast.error("Indica una cantidad real entera mayor o igual a cero.");
      return;
    }

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
      );
      setOrdenes((p) => p.map((o) => (o.id === orden.id ? actualizada : o)));
      toast.success(`${orden.id} completada`);

      // Merma: solo "Preparación en lote". El registro ya lo creó el backend;
      // aquí solo se avisa por línea (esa cantidad nunca entró al stock).
      if (orden.tipo === "preparacion") {
        orden.lineas.forEach((l, i) => {
          const calculo = l.idDetalleOp == null ? undefined : calculosDebidos[l.idDetalleOp];
          const merma = Math.max(0, Number(calculo?.cantidad_debida ?? 0) - Number(reales[i]));
          if (merma > 0) toast.success(`Se registró la merma de ${l.nombre} en Productos no conformes`);
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
  const Modal = ({ title, onClose, onConfirm, label, ancho, deshabilitado, children }: {
    title: string; onClose: () => void; onConfirm: () => void; label: string;
    ancho?: string;
    /** C6: bloquea el botón de confirmar (preparaciones con cantidad < 1). */
    deshabilitado?: boolean;
    children: React.ReactNode;
  }) => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
        className={`bg-card rounded-2xl w-full ${ancho ?? "max-w-lg"} shadow-2xl border border-border max-h-[90vh] flex flex-col my-4`}>
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        <div className="shrink-0 flex gap-3 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">Cancelar</button>
          <button onClick={onConfirm} disabled={deshabilitado}
            className={`flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold transition-colors active:scale-95 ${
              deshabilitado ? "opacity-50 cursor-not-allowed" : "hover:bg-red-700 cursor-pointer"
            }`}>{label}</button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Orden Producción</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{ordenes.length} órdenes registradas</p>
        </div>
        <div className="flex items-center gap-3">
          {canExportExcel && <BotonDescargarExcel onClick={() => exportExcel(ordenes)} />}
          {canCreate && (
            <button onClick={() => { setForm(emptyForm()); setShowCreate(true); }}
              className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md text-sm">
              <Plus className="w-4 h-4" /> Crear Orden de Producción
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Buscar por ID, venta, cliente o producto..."
          wrapperClassName="flex-1 max-w-sm"
        />
        <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value as typeof filtroTipo); setPage(1); }}
          aria-label="Filtrar por tipo" className={sCls + " sm:w-48"}>
          <option value="todos">Todo tipo</option>
          <option value="preparacion">Preparación</option>
          <option value="pedido">Pedido</option>
        </select>
        <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value as typeof filtroEstado); setPage(1); }}
          aria-label="Filtrar por estado" className={sCls + " sm:w-48"}>
          <option value="todos">Todo estado</option>
          {ORDEN_ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
        </select>
      </div>

      {/* Listado. La carga desde la API y su error se muestran con
          "Reintentar": nunca se vuelve a datos de ejemplo. */}
      {cargando ? (
        <div className="bg-card border border-border rounded-2xl px-4 py-14 text-center text-muted-foreground mb-3">
          Cargando órdenes de producción…
        </div>
      ) : errorCarga ? (
        <div className="bg-card border border-border rounded-2xl px-4 py-14 text-center text-muted-foreground mb-3">
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
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-3">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {["ID", "Tipo", "Producto(s)", "Cant. estimada", "Cant. real", "Estado", "Fecha/Hora de estado", "Acciones"].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-14 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">👨‍🍳</p><p>No se encontraron órdenes</p>
                </td></tr>
              ) : paged.map(o => {
                const soloPendiente = o.estadoOrden === "pendiente";
                const puedeCancelar = o.estadoOrden === "en-proceso";
                const merma = totalMerma(o.lineas);
                const completada = o.estadoOrden === "completada";
                // Bloque 4: ¿faltan insumos para esta orden según el stock de
                // hoy? Misma foto que usa Iniciar (`insumosRequeridos` guardado
                // vs `insumos` actual). Solo en Pendiente: al pasar a En
                // proceso los insumos ya se descontaron y comparar otra vez
                // daría faltantes falsos.
                const faltantesFila = soloPendiente
                  ? faltantesPara(o.insumosRequeridos, 1, insumos)
                  : [];
                return (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2">
                      {/* Solo el número: de "OP-004" muestra "004". `o.id` y
                          `o.ventaNumero` no cambian: los siguen usando el
                          buscador, el Excel, el detalle y la creación. */}
                      <p className="text-sm font-mono font-semibold text-foreground whitespace-nowrap">{o.id.replace("OP-", "")}</p>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
                        o.tipo === "preparacion" ? "bg-purple-100 text-purple-800" : "bg-teal-100 text-teal-800"
                      }`}>
                        {etiquetaAsignacion(o, productos)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <p className="text-sm font-medium text-foreground">{resumenProductos(o)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {o.lineas.map((l) => `${l.cantidadEstimada} × ${l.nombre}`).join(", ")}
                      </p>
                    </td>
                    <td className="px-4 py-2 text-sm font-semibold text-foreground whitespace-nowrap">
                      {o.lineas.length === 1
                        ? fmtCant(o.lineas[0].cantidadEstimada, o.lineas[0].unidad)
                        : fmtCant(totalEstimado(o.lineas), "und")}
                    </td>
                    <td className="px-4 py-2 text-sm whitespace-nowrap">
                      {!completada ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <>
                          <span className="font-semibold text-foreground tabular-nums">
                            {o.lineas.length === 1
                              ? fmtCant(o.lineas[0].cantidadReal ?? 0, o.lineas[0].unidad)
                              : fmtCant(totalReal(o.lineas), "und")}
                          </span>
                          {merma > 0 && (
                            <p className="text-[11px] font-semibold text-red-600 tabular-nums">−{resumenMerma(o.lineas)} merma</p>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${ESTADO_COLOR[o.estadoOrden]}`}>
                          {ESTADO_LABEL[o.estadoOrden]}
                        </span>
                        {/* Bloque 4: la fila dice enseguida si a la orden aún
                            no le alcanza el inventario (solo Pendientes).
                            El título detalla cada faltante al pasar el mouse. */}
                        {faltantesFila.length > 0 && (
                          <span
                            title={faltantesFila
                              .map(f => `Faltan ${fmtCant(f.falta, f.unidad)} de ${f.nombre} (hay ${fmtCant(f.stock, f.unidad)})${f.motivo ? ` — ${motivoFaltante(f)}` : ""}`)
                              .join("\n")}
                            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap"
                          >
                            <AlertTriangle className="w-3 h-3" /> Faltan insumos
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {fmtDT(ultimoCambio(o))}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {o.estadoOrden === "pendiente" && (
                          <button
                            type="button"
                            onClick={() => {
                              void abrirGenerar(o);
                            }}
                            title="Generar orden de producción"
                            aria-label="Generar orden de producción"
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {o.estadoOrden === "por-verificar" && (
                          <button
                            type="button"
                            onClick={() => abrirCompletar(o.id)}
                            title="Verificar producción"
                            aria-label="Verificar producción"
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <ActionIcons
                          onView={() => setDetailItem(o)}
                          onDelete={canDelete && soloPendiente && o.tipo !== "pedido" ? () => setDeleteId(o.id) : undefined}
                          deleteTitle={
                            o.tipo === "pedido"
                              ? "Los pedidos no se eliminan: usa Dar de baja"
                              : "Eliminar preparación pendiente"
                          }
                        />
                        {puedeCancelar && (
                          <button
                            type="button"
                            onClick={() => openDarBaja(o)}
                            title="Cancelar orden"
                            aria-label="Cancelar orden"
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Ban className="w-4 h-4" />
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

      {/* Paginación (unificada, fuera de la card) */}
      {filtradas.length > 0 && (
        <Paginador pagina={page} totalPaginas={totalPages} onCambio={setPage} />
      )}

      <AnimatePresence>
        {generarItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ scale: .95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: .95, opacity: 0 }}
                transition={{ duration: .15 }}
                className="bg-card rounded-2xl w-full max-w-2xl shadow-2xl border border-border my-4"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div>
                    <h3 className="text-base font-bold text-foreground" style={{ fontFamily: SERIF }}>
                      Generar orden — {generarItem.id}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {generarItem.tipo === "pedido" ? "Pedido · cantidades bloqueadas" : "Preparación · ajusta las cantidades según el inventario"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGenerarItem(null)}
                    aria-label="Cerrar generación de orden"
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-4 px-5 py-5 max-h-[68vh] overflow-y-auto">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Fecha y hora límite (hora de Bogotá)
                    </label>
                    <input
                      type="datetime-local"
                      required
                      min={minFechaLimiteGenerar}
                      max={generarItem.tipo === "pedido" && recogidaFuturaGenerar
                        ? fechaRecogidaGenerar?.slice(0, 16)
                        : undefined}
                      value={fechaLimiteGenerar}
                      onChange={(event) => setFechaLimiteGenerar(event.target.value)}
                      className={iCls}
                    />
                    {!fechaLimiteGenerar && (
                      <p role="alert" className="mt-1 text-xs font-semibold text-red-600">
                        Indica la fecha y hora límite
                      </p>
                    )}
                    {generarItem.tipo === "pedido" && recogidaFuturaGenerar
                      && fechaLimiteGenerar > (fechaRecogidaGenerar?.slice(0, 16) ?? "") && (
                        <p role="alert" className="mt-1 text-xs font-semibold text-red-600">
                          La fecha límite no puede ser posterior a la hora de recogida.
                        </p>
                      )}
                  </div>
                  {recogidaVencidaGenerar && (
                    <p role="status" className="text-xs font-semibold text-amber-700">
                      La hora de recogida ya pasó; esta orden va retrasada
                    </p>
                  )}
                  {cargandoCapacidadGenerar ? (
                    <p className="text-sm text-muted-foreground">Calculando máximo producible…</p>
                  ) : generarItem.lineas.map((linea) => {
                    const idDetalle = linea.idDetalleOp as number;
                    const cantidad = Number(cantidadesGenerar[idDetalle] ?? "");
                    const maximo = maximosGenerar[idDetalle];
                    const excedeMaximo = generarItem.tipo === "preparacion"
                      && maximo != null
                      && Number.isFinite(cantidad)
                      && cantidad > maximo;
                    return (
                      <div key={idDetalle} className="p-4 border border-border rounded-2xl bg-card space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">{linea.nombre}</p>
                          {maximo != null && generarItem.tipo === "preparacion" && (
                            <span className="text-xs font-semibold text-muted-foreground text-right">
                              Máximo: {fmtCant(maximo, linea.unidad)}
                            </span>
                          )}
                        </div>
                        <label className="block text-xs font-semibold text-muted-foreground">
                          Cantidad a producir ({linea.unidad})
                        </label>
                        <input
                          type="number"
                          min={generarItem.tipo === "pedido" ? linea.cantidadEstimada : 1}
                          max={generarItem.tipo === "pedido" ? linea.cantidadEstimada : maximo ?? undefined}
                          step={esDecimal(linea.unidad) ? "0.01" : "1"}
                          value={cantidadesGenerar[idDetalle] ?? String(linea.cantidadEstimada)}
                          readOnly={generarItem.tipo === "pedido"}
                          onChange={(event) => {
                            setCantidadesGenerar((actual) => ({ ...actual, [idDetalle]: limpiarNumeroInput(event.target.value) }));
                            setFaltantesGenerar([]);
                          }}
                          className={iCls + (excedeMaximo ? " ring-2 ring-red-400" : "")}
                        />
                        {excedeMaximo && (
                          <p role="alert" className="text-xs font-semibold text-red-700">
                            Solo hay insumos para {fmtCant(maximo, linea.unidad)} de {linea.nombre}. Disminuye la cantidad para continuar.
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {faltantesGenerar.length > 0 && <AvisoFaltantes faltantes={faltantesGenerar} />}
                  {generarItem.tipo === "preparacion" && generarItem.lineas.some((linea) => {
                    const maximo = maximosGenerar[linea.idDetalleOp as number];
                    return maximo === 0;
                  }) && (
                    <p role="alert" className="text-xs font-semibold text-red-700">
                      El inventario actual no permite producir la cantidad mínima de una o más líneas.
                    </p>
                  )}
                </div>
                <div className="flex gap-3 px-5 py-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setGenerarItem(null)}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!generacionValida}
                    onClick={() => void confirmarGenerar()}
                    className={`flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold transition-colors ${
                      generacionValida ? "hover:bg-red-700 cursor-pointer" : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {generando ? "Generando…" : "Generar orden"}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Crear ── */}
      <AnimatePresence>
        {showCreate && Modal({
          title: "Crear Orden de Producción",
          onClose: () => setShowCreate(false),
          onConfirm: handleCreate,
          label: "Crear Orden",
          ancho: "max-w-2xl",
          // C6: Crear bloqueado mientras alguna línea no tenga producto o su
          // cantidad sea menor a 1; Bloque 4: también mientras falten insumos
          // para la preparación (igual que al crear producto insumo en Insumos).
          deshabilitado: form.tipo === "preparacion"
            && (preparacionInvalida(form.lineas) || faltantesForm.length > 0),
          children: (
            <div className="space-y-4">
              {/* Solo se crean Preparaciones en lote: los pedidos los crea el
                  backend al aceptar una venta. */}
              <p className="text-xs font-semibold text-muted-foreground">Preparación en lote (Producto Insumo)</p>
              <div className="space-y-3">
                {form.lineas.map((l, idx) => (
                  <LineaPreparacion
                    key={idx}
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
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-border rounded-xl text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Agregar Producto Insumo
              </button>

              {/* Bloque 4: mientras falten insumos el botón Crear viene
                  deshabilitado y aquí se ven el mensaje y la lista. */}
              <AvisoFaltantes faltantes={faltantesForm} />

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Observación</label>
                <textarea value={form.observacion} onChange={e => setForm(p => ({ ...p, observacion: e.target.value }))}
                  rows={2} placeholder="Notas adicionales sobre esta orden..." className={tCls} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Toda orden nace Pendiente. Se avanza a En proceso, luego a Por verificar y finalmente a Completada.
              </p>
            </div>
          ),
        })}
      </AnimatePresence>

      {/* ── Modal: Editar (solo Pendiente) ── */}
      <AnimatePresence>
        {editItem && Modal({
          title: `Editar — ${editItem.id}`,
          onClose: () => setEditItem(null),
          onConfirm: handleEdit,
          label: "Guardar",
          ancho: "max-w-2xl",
          // C6: ídem Crear; Bloque 4: además deshabilitado mientras falten
          // insumos para la preparación (sin "Guardar igual": eso es de pedido).
          deshabilitado: editItem.tipo === "preparacion"
            && (preparacionInvalida(editItem.lineas) || faltantesForm.length > 0),
          children: (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/60 rounded-xl border border-border">
                <span className="text-xs font-semibold text-muted-foreground">Tipo</span>
                <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
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
                    <Plus className="w-3.5 h-3.5" /> Agregar Producto Insumo
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
              <AvisoFaltantes faltantes={faltantesForm} />

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Observación</label>
                <textarea value={editItem.observacion} onChange={e => setEditItem(x => x && ({ ...x, observacion: e.target.value }))}
                  rows={2} className={tCls} />
              </div>
            </div>
          ),
        })}
      </AnimatePresence>

      {/* ── Modal: Verificar ── */}
      <AnimatePresence>
        {completarItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
              className="bg-card rounded-2xl w-full max-w-2xl shadow-2xl border border-border max-h-[90vh] flex flex-col my-4">
              <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
                  Verificar orden — {completarItem.id}
                </h3>
                <button onClick={() => { setCompletarItem(null); setReales({}); setCalculosDebidos({}); }} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted p-3">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">Tipo</p>
                    <p className="text-sm font-semibold text-foreground">{completarEsPedido ? "Pedido" : "Preparación"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      {completarEsPedido ? "Fecha/hora de recogida" : "Fecha límite"}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {completarEsPedido
                        ? `${completarItem.fechaSolicitada.split("-").reverse().join("/")}${completarItem.horaSolicitada ? ` ${hora12(completarItem.horaSolicitada)}` : ""}`
                        : fmtFechaHoraLocal(completarItem.fechaLimite)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {completarEsPedido
                    ? "Revisa los productos y confirma la orden. El pedido no modifica cantidades ni merma."
                    : "La cantidad que debí hacer se calcula con los insumos usados al Generar y no se puede editar. La merma es esa cantidad menos la cantidad real, mínimo 0."}
                </p>
                {cargandoCalculoDebido && !completarEsPedido && (
                  <p role="status" className="text-sm text-muted-foreground">Calculando la cantidad que debí hacer…</p>
                )}
                {completarEsPedido && completarItem.lineas.some((linea) => esBebida(linea, productos)) && (
                  <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
                    El stock de las bebidas se descontó al aceptar la venta.
                  </p>
                )}
                {completarItem.lineas.map((l, i) => completarEsPedido ? (
                  <div key={i} className="p-4 border border-border rounded-2xl bg-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{l.nombre}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Cantidad estimada</p>
                        <p className="text-base font-bold text-foreground tabular-nums">{fmtCant(l.cantidadEstimada, l.unidad)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  (() => {
                    const realTxt = reales[i] ?? "";
                    const calculo = l.idDetalleOp == null ? undefined : calculosDebidos[l.idDetalleOp];
                    const debida = calculo?.cantidad_debida;
                    const real = Number(realTxt);
                    const realInvalida = realTxt.trim() === "" || !Number.isSafeInteger(real) || real < 0;
                    const invalido = realInvalida || debida == null;
                    const merma = invalido ? 0 : Math.max(0, debida - real);
                    const sobrante = !invalido && real > debida;
                    return (
                      <div key={i} className="p-4 border border-border rounded-2xl bg-card space-y-2">
                        <p className="text-sm font-semibold text-foreground">{l.nombre}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad estimada original</label>
                            <input value={fmtCant(l.cantidadEstimada, l.unidad)} readOnly className={iCls + " opacity-70 cursor-default"} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">
                              Cantidad que debí hacer ({l.unidad})
                            </label>
                            <input value={debida == null ? "" : fmtCant(debida, l.unidad)} readOnly className={iCls + " opacity-70 cursor-default"} />
                            {calculo?.calculada_al_verificar && (
                              <p className="mt-1 text-[11px] text-muted-foreground">Calculada al verificar para esta orden antigua.</p>
                            )}
                            {debida != null && debida < l.cantidadEstimada && (
                              <p className="mt-1 text-[11px] font-semibold text-red-600">
                                El cálculo es menor que la cantidad estimada; la merma se calcula desde este valor.
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">
                              Cantidad real hecha ({l.unidad})
                            </label>
                            <input
                              type="number" min={0} step={1}
                              value={realTxt}
                              placeholder="0"
                              onChange={e => setReales(p => ({ ...p, [i]: limpiarNumeroInput(e.target.value) }))}
                              className={iCls + (realInvalida ? " ring-2 ring-red-400" : "")}
                            />
                            {realInvalida && (
                              <p className="mt-1 text-[11px] font-semibold text-red-600">
                                Ingresa un entero mayor o igual a cero.
                              </p>
                            )}
                          </div>
                        </div>
                        {!invalido && (
                          <p className={`text-xs font-semibold ${sobrante ? "text-blue-600" : merma > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                            {sobrante
                              ? `Sobrante: ${fmtCant(real - debida, l.unidad)} — la merma queda en 0`
                              : `Merma: ${fmtCant(merma, l.unidad)}`}
                          </p>
                        )}
                      </div>
                    );
                  })()
                ))}
              </div>
              <div className="shrink-0 flex gap-3 px-5 py-4 border-t border-border">
                <button onClick={() => { setCompletarItem(null); setReales({}); setCalculosDebidos({}); }}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                  Cancelar
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
                          !window.confirm("Se registrará todo como merma. ¿Completar la orden?")) return;
                      const haySobrante = completarItem.lineas.some((linea, i) => {
                        const debida = linea.idDetalleOp == null
                          ? 0
                          : calculosDebidos[linea.idDetalleOp]?.cantidad_debida ?? 0;
                        return Number(reales[i]) > debida;
                      });
                      if (haySobrante && !window.confirm(
                        "Hay líneas con más producción que la estimada. La merma de esas líneas queda en 0. ¿Completar la orden?",
                      )) return;
                    }
                    confirmarCompletar();
                  }}
                  className={`flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold transition-colors active:scale-95 ${
                    completarOk ? "hover:bg-red-700 cursor-pointer" : "opacity-50 cursor-not-allowed"
                  }`}>
                  Verificar orden
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Inventario insuficiente al Iniciar (C1) ── Lista de
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
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" /> Inventario insuficiente
                </h3>
                <button onClick={() => setFaltantesIniciar(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  La orden <strong className="text-foreground">{faltantesIniciar.ordenId}</strong> se queda{" "}
                  <strong className="text-foreground">Pendiente</strong>: no se descontó nada ni cambió de estado.
                </p>
                {faltantesIniciar.faltantes.map((f) => (
                  <div key={f.insumoId} className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-0.5">
                    <p className="text-sm font-semibold text-red-700 flex items-start gap-2">
                      <Minus className="w-3.5 h-3.5 shrink-0 mt-1" />
                      <span>Faltan {fmtCant(f.falta, f.unidad)} de {f.nombre} (hay {fmtCant(f.stock, f.unidad)})</span>
                    </p>
                    {f.motivo && (
                      <p className="pl-6 text-[11px] text-red-700">{motivoFaltante(f)}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="shrink-0 px-5 py-4 border-t border-border">
                <button onClick={() => setFaltantesIniciar(null)}
                  className="w-full py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Aviso al GUARDAR un PEDIDO (Bloque 4) ── NUNCA bloquea:
          lista los faltantes de insumos y/o las líneas cuya receta no se
          pudo calcular (pizza sin ficha, producto del menú sin resolver) y
          se confirma con "Guardar igual". La preparación en lote no pasa
          por aquí: ella bloquea con el botón deshabilitado y el mensaje +
          lista dentro de su propio modal (`AvisoFaltantes`). */}
      <AnimatePresence>
        {avisoGuardar && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border max-h-[90vh] flex flex-col my-4">
              <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2" style={{ fontFamily: SERIF }}>
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  {avisoGuardar.faltantes.length > 0 ? "Faltan insumos" : "Aviso al guardar"}
                </h3>
                <button onClick={() => setAvisoGuardar(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Este pedido viene de una venta ya pagada: se puede guardar igual. Queda{" "}
                  <strong className="text-foreground">Pendiente</strong>, se marcará con el badge{" "}
                  <strong className="text-foreground">"Faltan insumos"</strong> si le faltan insumos, y al{" "}
                  <strong className="text-foreground">Iniciarla</strong> vuelve a validarse contra el inventario de ese
                  momento (ahí ya no se avanza si falta algo).
                </p>
                {avisoGuardar.avisos.map((a, i) => (
                  <div key={i} className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-sm font-semibold text-amber-800 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-1" />
                      <span>{a}</span>
                    </p>
                  </div>
                ))}
                {avisoGuardar.faltantes.map((f) => (
                  <div key={f.insumoId} className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-0.5">
                    <p className="text-sm font-semibold text-red-700 flex items-start gap-2">
                      <Minus className="w-3.5 h-3.5 shrink-0 mt-1" />
                      <span>Faltan {fmtCant(f.falta, f.unidad)} de {f.nombre} (hay {fmtCant(f.stock, f.unidad)})</span>
                    </p>
                    {f.motivo && (
                      <p className="pl-6 text-[11px] text-red-700">{motivoFaltante(f)}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="shrink-0 px-5 py-4 border-t border-border flex gap-3">
                <button onClick={() => setAvisoGuardar(null)}
                  className="flex-1 py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">
                  Cancelar
                </button>
                <button onClick={() => { const guardar = avisoGuardar.onConfirm; setAvisoGuardar(null); guardar(); }}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors">
                  Guardar igual
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
              <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Detalle — {detailItem.id}</h3>
                <button onClick={() => setDetailItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${detailItem.tipo === "preparacion" ? "bg-purple-100 text-purple-800" : "bg-teal-100 text-teal-800"}`}>{etiquetaAsignacion(detailItem, productos)}</span>
                  <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_COLOR[detailItem.estadoOrden]}`}>{ESTADO_LABEL[detailItem.estadoOrden]}</span>
                  <span className="text-[11px] text-muted-foreground sm:ml-auto">Estado desde {fmtDT(ultimoCambio(detailItem))}</span>
                </div>

                {detailItem.tipo === "pedido" && (
                  <div className="flex items-center justify-between py-2 border-b border-border gap-4">
                    <span className="text-sm text-muted-foreground font-medium shrink-0">Venta asociada</span>
                    <span className="text-sm font-semibold text-foreground text-right">{detailItem.ventaNumero ? `${detailItem.ventaNumero}${detailItem.cliente ? ` · ${detailItem.cliente}` : ""}` : "—"}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { l: "Fecha/hora solicitada", v: detailItem.fechaSolicitada ? `${detailItem.fechaSolicitada}${detailItem.horaSolicitada ? ` ${hora12(detailItem.horaSolicitada)}` : ""}` : "—" },
                    { l: "Inicio de producción", v: fmtDT(detailItem.inicioProduccion) },
                    { l: "Fecha límite", v: fmtDT(detailItem.fechaLimite) },
                    { l: "Entrega estimada", v: fmtDT(detailItem.entregaEstimada) },
                  ].map(({ l, v }) => (
                    <div key={l}>
                      <p className="text-[11px] font-semibold text-muted-foreground">{l}</p>
                      <p className="text-sm font-semibold text-foreground">{v}</p>
                    </div>
                  ))}
                </div>

                {(() => {
                  const mermas = noConformidades.filter(
                    (n) => n.ordenRef === detailItem.id && n.tipoNoConformidad === "Merma de cocina",
                  );
                  if (mermas.length === 0) return null;
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs font-semibold text-amber-800">Merma registrada en Productos no conformes</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {mermas.map((m) => `${m.nombre} · ${m.cantidadAfectada} ${m.unidadMedida}`).join(", ")}
                      </p>
                    </div>
                  );
                })()}

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Líneas de la orden</p>
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
                            <p className="text-sm font-semibold text-foreground">{l.nombre}</p>
                            {(l.tamano || l.porciones) && (
                              <p className="text-[11px] text-muted-foreground">
                                {[l.tamano ? `Tamaño ${l.tamano}` : null, l.porciones ? `${l.porciones} porciones` : null].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Estimada</p>
                            <p className="text-base font-bold text-foreground tabular-nums">{fmtCant(l.cantidadEstimada, l.unidad)}</p>
                            {l.cantidadDebida != null && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Debí hacer: {fmtCant(l.cantidadDebida, l.unidad)}
                              </p>
                            )}
                            {l.cantidadReal != null && (
                              <>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Real: {fmtCant(l.cantidadReal, l.unidad)}</p>
                                {(l.merma ?? 0) > 0 && (
                                  <p className="text-[11px] font-semibold text-red-600">−{fmtCant(l.merma ?? 0, l.unidad)} merma</p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {l.sinFicha && (
                          <p className="mt-1.5 text-[11px] text-muted-foreground italic">Sin preparación · se entrega directo</p>
                        )}
                        {necesita && (
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            Necesita: <span className="font-semibold text-foreground">{necesita}</span>
                          </p>
                        )}
                        {l.pasos && l.pasos.length > 0 && (
                          <ol className="mt-1.5 list-decimal list-inside text-[11px] text-muted-foreground space-y-0.5">
                            {l.pasos.map((p, j) => <li key={j}>{p}</li>)}
                          </ol>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                    {detailItem.tipo === "preparacion" ? "Insumos usados" : "Insumos a usar"}
                  </p>
                  <TablaInsumosRequeridos requeridos={detailItem.insumosRequeridos} insumos={insumos} />
                </div>

                {detailItem.tipo === "preparacion" && (
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <p className="text-xs font-semibold text-muted-foreground">Descripción de la preparación</p>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        Tiempo estimado:{" "}
                        <strong className="text-foreground">
                          {detailItem.tiempoPreparacionMin ? fmtMinutos(detailItem.tiempoPreparacionMin) : "Sin tiempo definido"}
                        </strong>
                      </span>
                    </div>
                    <p className="text-xs text-foreground bg-muted/60 rounded-xl border border-border px-3 py-2 whitespace-pre-wrap leading-relaxed">
                      {detailItem.descripcionPreparacion || "Sin descripción"}
                    </p>
                  </div>
                )}

                {detailItem.tipo === "pedido" && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Preparación</p>
                    <p className="text-xs text-foreground bg-muted/60 rounded-xl border border-border px-3 py-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                      Horneado: <strong>{fmtMinutos(HORNEADO_MIN)}</strong>
                    </p>
                  </div>
                )}

                {detailItem.notasFaltantes && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Notas de faltantes</p>
                    <p className="text-xs text-red-700 bg-red-50 rounded-xl border border-red-200 px-3 py-2">{detailItem.notasFaltantes}</p>
                  </div>
                )}

                {(() => {
                  // En 2 columnas solo cuando la línea de tiempo está vacía: con
                  // transiciones, la lista se lleva el ancho completo.
                  const enColumnas = detailItem.historial.length === 0 && !!detailItem.observacion;
                  const lineaTiempos = (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">Línea de tiempo de estados</p>
                      {detailItem.historial.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic bg-muted rounded-xl px-3 py-2">
                          Sin transiciones. Creada el {fmtDT(detailItem.creadaEn)}.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 bg-muted rounded-xl px-3 py-2">
                            <span className="text-xs font-semibold text-foreground">Orden creada</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">{fmtDT(detailItem.creadaEn)}</span>
                          </div>
                          {detailItem.historial.map((h, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 bg-muted rounded-xl px-3 py-2">
                              {h.detalle ? (
                                // Paso sin cambio de estado (p. ej. "Creada
                                // desde Insumos"): manda el motivo, no la
                                // flecha de transiciones.
                                <span className="text-xs font-semibold text-foreground">{h.detalle}</span>
                              ) : (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[h.de]}`}>{ESTADO_LABEL[h.de]}</span>
                                  <span className="text-muted-foreground text-xs">→</span>
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[h.a]}`}>{ESTADO_LABEL[h.a]}</span>
                                </div>
                              )}
                              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{fmtDT(h.fechaHora)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                  const observacion = detailItem.observacion ? (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Observación</p>
                      <p className="text-sm text-foreground bg-muted rounded-xl px-3 py-2">{detailItem.observacion}</p>
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
                <button onClick={() => setDetailItem(null)} className="w-32 shrink-0 py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">Cerrar</button>
                <button onClick={() => setVerFicha({ ordenId: detailItem.id, lineaIdx: 0 })} className="flex-1 py-2.5 bg-primary rounded-xl text-sm font-semibold text-white hover:bg-red-700 cursor-pointer transition-colors">Ver ficha del producto</button>
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
            ? { ...ficha, pasos: ficha.pasos.map(p => p.replace(/^\s*\d+\s*[.)]\s+/, "")).filter(p => p.trim()) }
            : null;
          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
                className="bg-card rounded-2xl w-full max-w-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]">
                <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
                  <h3 className="text-lg font-bold text-foreground min-w-0 truncate" style={{ fontFamily: SERIF }}>Ficha técnica — {linea.nombre}</h3>
                  <button onClick={() => setVerFicha(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground shrink-0"><X className="w-4 h-4" /></button>
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
                          modo={detailItem.tipo === "preparacion" ? "insumo" : "producto"}
                          /* En una preparación, la unidad de la línea es la del
                             Producto Insumo: acompaña a "Cantidad a hacer". */
                          unidadCantidad={detailItem.tipo === "preparacion" ? linea.unidad : undefined} />
                      </div>
                    </>
                  )}
                </div>
                <div className="shrink-0 px-5 py-4 border-t border-border">
                  <button onClick={() => setVerFicha(null)} className="w-full py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">Cerrar</button>
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
                  <h3 className="text-base font-bold text-foreground" style={{ fontFamily: SERIF }}>Dar de baja — {darBajaItem.id}</h3>
                  <button onClick={() => { setDarBajaItem(null); setDarBajaForm(null); }}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
                </div>

                <div className="space-y-4 px-5 py-5 max-h-[68vh] overflow-y-auto">
                  {/* C7: la marca dice si hay algo por devolver. Hoy
                      `confirmarDarBaja` solo cancela la orden —nunca devuelve
                      stock—, así que el texto aclara qué pasó con los insumos. */}
                  <p className={`text-xs rounded-xl px-3 py-2 border ${
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
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo</label>
                      <p className="text-sm font-semibold text-foreground py-2">{TIPO_LABEL[darBajaItem.tipo]}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Unidad de medida</label>
                      <select value={darBajaForm.unidadMedida} onChange={e => setDarBajaForm(f => f && ({ ...f, unidadMedida: e.target.value }))} className={sCls}>
                        {UNIDADES.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Producto</label>
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
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {darBajaItem.tipo === "preparacion" ? "Producto insumo" : "Producto terminado"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad afectada</label>
                      {/* Nace con la cantidad estimada de la línea; borra a
                          vacío sin volver a 0 (punto B1). */}
                      <input type="number" min={1}
                        value={darBajaForm.cantidad === 0 ? "" : darBajaForm.cantidad}
                        placeholder="0"
                        onChange={e => setDarBajaForm(f => f && ({ ...f, cantidad: numeroDeInput(limpiarNumeroInput(e.target.value)) }))}
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

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Origen</label>
                    <input value={`Orden #${darBajaItem.id}`} readOnly className={iCls + " opacity-60 cursor-default"} />
                  </div>
                </div>

                <div className="flex gap-3 px-5 py-4 border-t border-border">
                  <button onClick={() => { setDarBajaItem(null); setDarBajaForm(null); }}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                    Cancelar
                  </button>
                  <button onClick={confirmarDarBaja}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors active:scale-95">
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
        {deleteId && (
          <ConfirmDeleteModal
            title="Eliminar orden"
            message={<>¿Seguro que deseas eliminar la orden <strong>{deleteId}</strong>? Esta acción no se puede deshacer.</>}
            onConfirm={() => handleDelete(deleteId)}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────── Forma 2: Pedido de cliente ───────────────────────────
/** Buscador de ventas pagadas sin orden + vista en solo lectura del detalle.
    Las líneas NO se editan: salen del detalle de la venta. */
function CamposPedido({
  form,
  set,
  ventas,
  ventasSinOrden,
  ordenes,
  productos,
  fichas,
  insumos,
}: {
  form: OrdenForm;
  set: (f: OrdenForm) => void;
  ventas: Venta[];
  ventasSinOrden: Venta[];
  ordenes: OrdenProduccion[];
  productos: Producto[];
  fichas: FichasPorProducto;
  insumos: Insumo[];
}) {
  const [q, setQ] = useState("");
  const venta = ventas.find((v) => v.id === form.ventaId);

  const lista = ventasSinOrden.filter((v) => {
    if (!q.trim()) return true;
    const t = normalizar(q);
    return normalizar(v.id).includes(t) || normalizar(v.usuario).includes(t) || normalizar(v.productos).includes(t);
  });

  const elegidas = venta ? lineasDeVenta(venta, productos, fichas, insumos) : { lineas: [] as LineaOrden[], insumos: [] as InsumoRequerido[] };

  // Se muestran también las ventas que YA tienen orden, para que se vea que
  // existen pero no se pueden volver a crear (una venta = una orden).
  const yaConOrden = ordenes.filter((o) => o.ventaId && o.ventaId !== form.ventaId).map((o) => o.ventaId as string);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
          Venta a preparar <span className="text-muted-foreground/60">(solo ventas pagadas, en preparación)</span>
        </label>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por número de venta, cliente o producto..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="max-h-48 overflow-y-auto rounded-xl border border-border divide-y divide-border">
          {lista.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              No hay ventas pagadas sin orden de producción.
            </p>
          ) : lista.map(v => (
            <button key={v.id} type="button"
              onClick={() => set({ ...form, ventaId: v.id })}
              className={`w-full text-left px-3 py-2.5 transition-colors cursor-pointer ${
                form.ventaId === v.id ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-muted/60"
              }`}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">Venta {v.id}</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">${(v.total ?? 0).toLocaleString("es-CO")}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {v.usuario} · {v.fecha}{v.horaRecogida ? ` ${hora12(v.horaRecogida)}` : ""}
              </p>
            </button>
          ))}
        </div>
        {yaConOrden.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Las ventas {yaConOrden.map((v) => v).join(", ")} ya tienen orden de producción.
          </p>
        )}
      </div>

      {venta && (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-3 py-2 bg-muted/60 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Detalle de la venta (solo lectura)
            </div>
            {elegidas.lineas.map((l, i) => {
              // C8: lo que ESTA línea va a gastar al Iniciar (con el factor
              // de su tamaño y con las unidades contables sin multiplicar).
              // Las bebidas no llevan ficha y no piden insumos.
              const necesita = resumenNecesita(requeridosDeLinea(l, fichas));
              return (
              <div key={i} className="flex items-start justify-between gap-3 px-3 py-2 border-t border-border">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{l.nombre}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {l.tamano ? `Tamaño ${l.tamano} · ` : ""}{l.cantidadEstimada} und
                    {l.porciones ? ` · ${l.porciones} porciones` : ""}
                  </p>
                  {l.sinFicha && (
                    <p className="text-[11px] text-muted-foreground italic mt-0.5">Sin preparación · se entrega directo</p>
                  )}
                  {necesita && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Necesita: <span className="font-semibold text-foreground">{necesita}</span>
                    </p>
                  )}
                </div>
                {l.sinFicha ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">Sin ficha</span>
                ) : (
                  <Layers className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                )}
              </div>
              );
            })}
            <div className="px-3 py-2 border-t border-border bg-muted/40 text-[11px] text-muted-foreground">
              Fecha y hora solicitadas: <strong className="text-foreground">{venta.fecha}{venta.horaRecogida ? ` ${hora12(venta.horaRecogida)}` : ""}</strong> (recogida del cliente)
            </div>
            {/* Tiempo fijo del pedido: NO sale del tiempoPreparacion de la
                ficha (eso es de "Preparación en lote"). */}
            <div className="px-3 py-2 border-t border-border bg-muted/40 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Horneado: <strong className="text-foreground">{fmtMinutos(HORNEADO_MIN)}</strong>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Insumos a usar</p>
            <TablaInsumosRequeridos requeridos={elegidas.insumos} insumos={insumos} />
          </div>
        </>
      )}
    </div>
  );
}
