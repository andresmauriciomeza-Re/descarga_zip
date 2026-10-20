import { useState, useMemo, useEffect, type Dispatch, type SetStateAction } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Search, Trash2, X,
  AlertCircle, Clock, PackageX, ChefHat, ShoppingBag, Minus, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { CalendarDropdown } from "@/shared/components/CalendarDropdown";
import { EstadoSelect } from "@/shared/components/EstadoSelect";
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
import type { Producto, FichasPorProducto } from "@/features/productos/pages/GestionProductosScreen";
import { porcionesReferencia, type FichaVersion } from "@/shared/utils/fichas";
import { nextNoConformidadId, type NoConformidad } from "@/features/cpn/pages/ProductosPerecederosScreen";

const SERIF = "var(--font-titulo)";

// ─────────────────────────── Tipos ───────────────────────────
export type EstadoOrden = "pendiente" | "en-proceso" | "completada" | "cancelada";

/** Las dos formas de trabajar en la cocina. */
export type TipoOrden = "preparacion" | "pedido";

export const TIPO_LABEL: Record<TipoOrden, string> = {
  preparacion: "Preparación",
  pedido: "Pedido",
};

/** Tiempo fijo de una orden "Pedido de cliente": el plato solo pasa por el
    horno. El `tiempoPreparacion` de la ficha técnica es de "Preparación en
    lote" y NO se usa en las órdenes de pedido. */
const HORNEADO_MIN = 15;

const ESTADO_COLOR: Record<EstadoOrden, string> = {
  pendiente:    "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300",
  "en-proceso": "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  completada:   "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  cancelada:    "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
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
  /** Solo Forma 2: id del producto del catálogo y tamaño elegido por el cliente. */
  productoId?: string | null;
  tamano?: string;
  /** Solo Forma 2: porciones = cantidad × porciones de la ficha vigente. */
  porciones?: number;
  /** Solo Forma 2: el producto no tiene ficha técnica (gaseosas, bebidas). */
  sinFicha?: boolean;
  /** Solo Forma 2: pasos de la ficha vigente, en solo lectura. */
  pasos?: string[];
  /** Se llenan al completar la orden (modal "Registrar producción real"). */
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
}

export interface OrdenProduccion {
  id: string; // "OP-001"
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
      Las tres se escriben al COMPLETAR la orden (Iniciar ya no mueve stock).
      Un flag ya encendido = ese movimiento ya se aplicó antes (orden legacy
      que descontaba al Iniciar) y NO se vuelve a aplicar. */
  insumosDescontados?: boolean;
  /** El stock de Productos terminados (pizza del menú) ya salió al completar. */
  productosDescontados?: boolean;
  /** La cantidad real producida ya sumó stock al Producto Insumo. */
  stockAplicado?: boolean;
  /** Nota de los faltantes con los que se completó igual (solo Forma 2). */
  notasFaltantes?: string;
}

// ─────────────────────────── Helpers ───────────────────────────
const UNIDADES_DECIMALES = ["kg", "g", "lt", "litros", "ml"];

const esDecimal = (unidad: string) => UNIDADES_DECIMALES.includes(unidad);

/** ¿Se pueden convertir estas dos unidades? Solo masa (kg↔g) y volumen
    (lt↔ml); cualquier otro par es incompatibles. */
const unidadesCompatibles = (de: string, a: string): boolean =>
  de === a ||
  ([de, a].includes("kg") && [de, a].includes("g")) ||
  ([de, a].includes("lt") && [de, a].includes("ml"));

/** Cantidad llevada a la unidad con que mide el inventario. Si las unidades
    son incompatibles devuelve `null` — nunca la misma cantidad, para que el
    descuento no se haga con una cifra falsa. */
function convertirUnidad(cantidad: number, de: string, a: string): number | null {
  if (de === a) return cantidad;
  if ([de, a].includes("kg") && [de, a].includes("g")) {
    return de === "kg" ? cantidad * 1000 : cantidad / 1000;
  }
  if ([de, a].includes("lt") && [de, a].includes("ml")) {
    return de === "lt" ? cantidad * 1000 : cantidad / 1000;
  }
  return null;
}

/** Cantidad con su unidad: "48 kg", "96 und". Sin decimales de relleno. */
function fmtCant(n: number | null | undefined, unidad: string): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const txt = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  return `${txt} ${unidad}`;
}

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

const nowISO = () => new Date().toISOString();
const addMinutesISO = (iso: string, min: number) =>
  new Date(new Date(iso).getTime() + min * 60000).toISOString();

/** Fecha local "YYYY-MM-DD" (en Colombia después de las 19:00 `toISOString()`
    ya devuelve el día siguiente). */
const hoyLocal = () => new Date().toLocaleDateString("en-CA");

/** Compara sin distinguir mayúsculas, tildes ni espacios sobrantes. Se exporta
    porque App la necesita para resolver el producto del catálogo de una venta. */
export const normalizarNombre = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const normalizar = normalizarNombre;

/** Ficha técnica vigente de un producto: la que sigue sin fecha de fin. */
function fichaVigente(fichas: FichasPorProducto, productoId: string) {
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

/** Un insumo que no alcanza: lo que se pide, lo que hay y lo que falta. */
export interface Faltante extends InsumoRequerido {
  stock: number;
  falta: number;
}

/** Insumos que la orden va a consumir según el catálogo actual, ya medidos en
    la unidad con que mide el inventario. Los que la receta menciona y no
    existen en el catálogo se dejan fuera: no son faltantes. Las unidades
    incompatibles tampoco se evalúan aquí: el completado las bloquea antes
    (`unidadesCompatibles`), para no informar una cifra falsa. */
export function faltantesDe(orden: OrdenProduccion, insumos: Insumo[]): Faltante[] {
  const salida: Faltante[] = [];
  for (const r of orden.insumosRequeridos) {
    if (r.noEncontrado) continue;
    const ins = insumos.find((i) => i.id === r.insumoId);
    if (!ins) {
      // Sigue mencionado en la ficha pero ya no está en el catálogo: se
      // compara en la unidad de la ficha contra un stock de 0.
      const falta = Math.max(0, Math.round(r.cantidad * 1000) / 1000);
      if (falta > 0.0001) salida.push({ ...r, stock: 0, falta });
      continue;
    }
    if (!unidadesCompatibles(r.unidad, ins.unidadMedida)) continue;
    const requerido = convertirUnidad(r.cantidad, r.unidad, ins.unidadMedida);
    if (requerido === null) continue;
    const falta = Math.max(0, Math.round((requerido - ins.stockActual) * 1000) / 1000);
    if (falta > 0.0001) {
      salida.push({ ...r, cantidad: requerido, unidad: ins.unidadMedida, stock: ins.stockActual, falta });
    }
  }
  return salida;
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
      { idProducto: "PROD-013", productoId: "PROD-013", nombre: "Gaseosa Cuatro", unidad: "und", cantidadEstimada: 1, sinFicha: true },
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

const totalEstimado = (lineas: LineaOrden[]) =>
  lineas.reduce((s, l) => s + (l.cantidadEstimada || 0), 0);
const totalReal = (lineas: LineaOrden[]) =>
  lineas.reduce((s, l) => s + (l.cantidadReal ?? 0), 0);
const totalMerma = (lineas: LineaOrden[]) =>
  lineas.reduce((s, l) => s + (l.merma ?? 0), 0);

/** Insumos que consume una línea de "Preparación en lote":
    cantidadEstimada / rendimiento × cantidad del insumo. Manda el SNAPSHOT de
    la línea (la foto de la ficha al crear o editar la orden); la ficha vigente
    solo entra en las líneas viejas que todavía no traen snapshot. */
function requeridosDeLinea(linea: LineaOrden, fichas: FichasPorProducto, insumos: Insumo[]): InsumoRequerido[] {
  const snap = linea.fichaSnapshot;
  const ficha = snap ? null : fichaVigente(fichas, linea.idProducto);
  const filas = snap?.insumos ?? ficha?.insumos;
  if (!filas) return [];
  const rendimiento = snap
    ? (snap.rendimiento > 0 ? snap.rendimiento : 1)
    : (ficha?.rendimiento && ficha.rendimiento > 0 ? ficha.rendimiento : 1);
  return filas.map(r => {
    const cat = insumos.find((i) => i.id === r.insumoId);
    return {
      insumoId: r.insumoId ?? cat?.id ?? r.nombre,
      nombre: r.nombre,
      cantidad: linea.cantidadEstimada / rendimiento * r.cantidad,
      unidad: r.unidad,
    };
  });
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
    // TODO factor por tamaño: Mediana y Grande usan la misma ficha. Cuando
    // exista, aquí se multiplica la receta por ese factor.
    for (const r of ficha.insumos) {
      const cantidad = d.cantidad * (r.cantidad || 0);
      // La ficha guarda {nombre, cantidad, unidad}, no el id del insumo: se
      // busca en Gestión de Insumos por nombre (mismo criterio que
      // `resolverInsumo`) para descontar contra el stock real.
      const ins = insumos.find((i) => normalizar(i.nombre) === normalizar(r.nombre));
      const clave = ins?.id ?? normalizar(r.nombre);
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
    cliente se lleva. Nace en "pendiente": el stock del producto nuevo baja
    recién al COMPLETAR la orden (§5), igual que en cualquier pedido. */
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
    for (const r of ficha.insumos) {
      const req = cantidad * (r.cantidad || 0);
      const ins = ctx.insumos.find((i) => normalizar(i.nombre) === normalizar(r.nombre));
      const clave = ins?.id ?? normalizar(r.nombre);
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
        valor: (o) => (o.estadoOrden === "completada"
          ? o.lineas.map((l) => fmtCant(l.cantidadReal ?? 0, l.unidad)).join("; ")
          : "—"),
      },
      { header: "Merma", valor: (o) => (totalMerma(o.lineas) > 0 ? fmtCant(totalMerma(o.lineas), "und") : "0"), numFmt: "#,##0.00" },
      { header: "Estado", valor: (o) => ESTADO_LABEL[o.estadoOrden], esEstado: true },
      { header: "Fecha/Hora de estado", valor: (o) => fmtDT(o.historial[o.historial.length - 1]?.fechaHora ?? o.creadaEn) },
      { header: "Observación", valor: (o) => o.observacion },
    ],
  });
  toast.success(`Archivo Excel descargado (${archivo})`);
}

// ─────────────────────────── Piezas de UI ───────────────────────────

/** Las dos tarjetas con las que arranca "Crear Orden de Producción". */
function TarjetasTipo({
  value,
  onChange,
}: {
  value: TipoOrden;
  onChange: (t: TipoOrden) => void;
}) {
  const opc: { tipo: TipoOrden; icono: React.ReactNode; titulo: string; texto: string }[] = [
    {
      tipo: "preparacion",
      icono: <ChefHat className="w-5 h-5" />,
      titulo: "Preparación en lote",
      texto: "Preparar un Producto Insumo (masa, guacamole, guisos) para surtir inventario de la cocina.",
    },
    {
      tipo: "pedido",
      icono: <ShoppingBag className="w-5 h-5" />,
      titulo: "Pedido de cliente",
      texto: "Preparar los platos de una venta ya pagada: se calienta y se arma con lo precocido.",
    },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {opc.map((o) => {
        const activo = value === o.tipo;
        return (
          <button
            key={o.tipo}
            type="button"
            onClick={() => onChange(o.tipo)}
            className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
              activo
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${activo ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                {o.icono}
              </span>
              <span className="text-sm font-bold text-foreground">{o.titulo}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{o.texto}</p>
          </button>
        );
      })}
    </div>
  );
}

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
  fichas,
}: {
  linea: LineaOrden;
  onChange: (l: LineaOrden) => void;
  onRemove: () => void;
  puedeQuitar: boolean;
  insumos: Insumo[];
  fichas: FichasPorProducto;
}) {
  const opciones = insumos.filter((i) => esProductoInsumo(i) && i.estado === "activo");
  const pi = insumos.find((i) => i.id === linea.idProducto);
  const bajo = !!pi && pi.stockActual < pi.stockMinimo;
  const requeridos = requeridosDeLinea(linea, fichas, insumos);

  const elegir = (id: string) => {
    const elegido = insumos.find((i) => i.id === id);
    const ficha = fichaVigente(fichas, id);
    onChange({
      ...linea,
      idProducto: id,
      nombre: elegido?.nombre ?? "",
      unidad: elegido?.unidadMedida ?? "und",
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
            {opciones.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre} · {i.stockActual} {i.unidadMedida} (mín {i.stockMinimo})
              </option>
            ))}
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
          {/* 0 = vacío con placeholder "0" (punto B1); al guardar se cuenta como 0. */}
          <input
            type="number"
            min={0}
            step={esDecimal(linea.unidad) ? 0.1 : 1}
            value={linea.cantidadEstimada === 0 ? "" : linea.cantidadEstimada}
            placeholder="0"
            onChange={(e) => onChange({ ...linea, cantidadEstimada: numeroDeInput(limpiarNumeroInput(e.target.value)) })}
            className="w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
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

      {pi && (
        <div className="space-y-3">
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
  setProductos,
  insumos,
  setInsumos,
  ventas,
  fichasPorProducto,
  ordenes,
  setOrdenes,
  noConformidades,
  setNoConformidades,
  onVentaLista,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canExportExcel = true,
  abrirOrdenId,
  setOrdenAAbrir,
}: {
  productos: Producto[];
  /** Stock de Productos terminados: al iniciar una orden tipo "Pedido" se
      descuenta lo que esa orden va a entregar (el producto solo se calienta,
      no se genera desde cero). */
  setProductos: Dispatch<SetStateAction<Producto[]>>;
  insumos: Insumo[];
  setInsumos: Dispatch<SetStateAction<Insumo[]>>;
  ventas: Venta[];
  /** Fichas técnicas por producto, subidas a App (las crea Gestión de Productos). */
  fichasPorProducto: FichasPorProducto;
  ordenes: OrdenProduccion[];
  setOrdenes: Dispatch<SetStateAction<OrdenProduccion[]>>;
  noConformidades: NoConformidad[];
  setNoConformidades: Dispatch<SetStateAction<NoConformidad[]>>;
  /** Punto C2: avisa a App cuando se completa una orden que pertenece a una
      venta (`ventaId`), para que esa venta quede Por entregar
      ("Por entregar"). Sin callback la pantalla sigue funcionando igual. */
  onVentaLista?: (ventaId: string) => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExportExcel?: boolean;
  /** id de Producto Insumo desde Insumos: abre Crear orden ya prellenado. */
  abrirOrdenId?: string | null;
  /** Limpia `abrirOrdenId` apenas se consume: si queda guardado, cada vuelta
      a esta pantalla reabriría el modal con el último producto programado. */
  setOrdenAAbrir?: Dispatch<SetStateAction<string | null>>;
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

  // Estado del modal "Registrar producción real" (§5).
  const [completarItem, setCompletarItem] = useState<OrdenProduccion | null>(null);
  const [reales, setReales] = useState<Record<number, string>>({});
  // Faltantes detectados al completar: se pintan en el modal y el guardado
  // espera una segunda confirmación (§5, paso 2).
  const [faltantesCompletar, setFaltantesCompletar] = useState<Faltante[] | null>(null);

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

  // ── Guardar (compartido por Crear y Editar) ────────────────────────
  const guardarOrden = (form: OrdenForm) => {
    const editando = editItem;
    const id = editando ? editando.id : siguienteId();
    const pedidos = form.tipo === "pedido" && form.ventaId
      ? ventas.find((v) => v.id === form.ventaId)
      : undefined;

    let lineas = form.lineas;
    let insumosRequeridos: InsumoRequerido[] = editando?.insumosRequeridos ?? [];
    let descripcionPreparacion: string | undefined;
    let tiempoPreparacionMin: number | null | undefined;

    if (pedidos) {
      const armado = lineasDeVenta(pedidos, productos, fichasPorProducto, insumos);
      lineas = armado.lineas;
      insumosRequeridos = armado.insumos;
    } else {
      // Forma 1: cada línea es un Producto Insumo. Si ya tiene fichaSnapshot
      // (viene de editar), se conserva; si no, se crea desde la ficha vigente.
      const acc = new Map<string, InsumoRequerido>();
      lineas = form.lineas.map((l) => {
        if (l.fichaSnapshot) return l;
        const ficha = fichaVigente(fichasPorProducto, l.idProducto);
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
      // Requeridos: SIEMPRE del snapshot si existe, si no, legacy.
      for (const l of lineas) {
        if (l.fichaSnapshot) {
          const rend = l.fichaSnapshot.rendimiento > 0 ? l.fichaSnapshot.rendimiento : 1;
          for (const r of l.fichaSnapshot.insumos) {
            const cat = insumos.find((i) => i.id === r.insumoId);
            const insumoId = r.insumoId ?? cat?.id ?? r.nombre;
            const cantidad = l.cantidadEstimada / rend * r.cantidad;
            const prev = acc.get(insumoId);
            acc.set(insumoId, prev
              ? { ...prev, cantidad: prev.cantidad + cantidad }
              : { insumoId, nombre: r.nombre, cantidad, unidad: r.unidad });
          }
        } else {
          requeridosDePreparacion(l, insumos).forEach((r) => {
            const prev = acc.get(r.insumoId);
            acc.set(r.insumoId, prev ? { ...prev, cantidad: prev.cantidad + r.cantidad } : r);
          });
        }
      }
      insumosRequeridos = [...acc.values()];
      // Tiempo y descripción: del snapshot de la primera línea con ficha.
      const snap = lineas.find((l) => l.fichaSnapshot)?.fichaSnapshot;
      descripcionPreparacion = snap?.pasos.join("\n") || undefined;
      tiempoPreparacionMin = snap ? snap.tiempoPreparacion : null;
    }

    const nueva: OrdenProduccion = {
      id,
      tipo: form.tipo,
      lineas,
      insumosRequeridos,
      ventaId: pedidos?.id ?? null,
      ventaNumero: pedidos?.id ?? null,
      cliente: pedidos?.usuario ?? null,
      fechaSolicitada: pedidos?.fecha ?? form.fechaSolicitada,
      horaSolicitada: pedidos?.horaRecogida ?? form.horaSolicitada,
// Editar solo se ofrece en Pendiente (§7), pero si algún día se abre en
      // otro estado no se debe rebobinar la orden: se conserva el estado real.
      estadoOrden: editando?.estadoOrden ?? "pendiente",
      observacion: form.observacion,
      creadaEn: editando?.creadaEn ?? nowISO(),
      inicioProduccion: editando?.inicioProduccion ?? null,
      entregaEstimada: editando?.entregaEstimada ?? null,
      historial: editando?.historial ?? [],
      descripcionPreparacion,
      tiempoPreparacionMin,
      insumosDescontados: editando?.insumosDescontados,
      productosDescontados: editando?.productosDescontados,
      stockAplicado: editando?.stockAplicado,
      notasFaltantes: editando?.notasFaltantes,
    };

    if (editando) setOrdenes((p) => p.map((o) => (o.id === id ? nueva : o)));
    else setOrdenes((p) => [nueva, ...p]);
    setShowCreate(false);
    setEditItem(null);
    setForm(emptyForm());
    toast.success(editando ? `Orden ${id} actualizada` : `Orden de producción ${id} creada`);
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
    } else if (form.lineas.some((l) => !l.idProducto) || form.lineas.every((l) => l.cantidadEstimada <= 0)) {
      toast.error("Elige un Producto Insumo y una cantidad mayor a 0");
      return;
    }
    guardarOrden(form);
  };

  const handleEdit = () => {
    if (!editItem) return;
    if (editItem.tipo === "preparacion" &&
        (editItem.lineas.some((l) => !l.idProducto) || editItem.lineas.every((l) => l.cantidadEstimada <= 0))) {
      toast.error("Elige un Producto Insumo y una cantidad mayor a 0");
      return;
    }
    guardarOrden({
      tipo: editItem.tipo,
      lineas: editItem.lineas,
      ventaId: editItem.ventaId ?? null,
      fechaSolicitada: editItem.fechaSolicitada,
      horaSolicitada: editItem.horaSolicitada,
      observacion: editItem.observacion,
    });
  };

  const handleDelete = (id: string) => {
    setOrdenes((p) => p.filter((o) => o.id !== id));
    setDeleteId(null);
    toast.success("Orden eliminada");
  };

  // ── Movimientos de inventario (§5) ────────────────────────────────
  // Regla: TODO el inventario se mueve AL COMPLETAR, nunca al Iniciar. Cada
  // movimiento lleva su propia marca en la orden (`insumosDescontados`,
  // `productosDescontados`, `stockAplicado`), así que se aplica UNA sola vez:
  // con la marca encendida no se repite (orden legacy que ya descontaba al
  // Iniciar, u orden que se vuelve a guardar o a abrir). Los cálculos se
  // hacen FUERA de los updaters de setState, nunca dentro de un updater.

  /** Descuento de insumos y Productos Insumo requeridos. Las cantidades salen
      de `insumosRequeridos`, la foto congelada desde el SNAPSHOT de la línea
      al crear/guardar la orden: aquí NUNCA se lee la ficha vigente. Cada
      cantidad se lleva a la unidad del catálogo (kg↔g, lt↔ml). */
  const descontarInsumos = (orden: OrdenProduccion) => {
    const aDescontar = new Map<string, number>();
    for (const r of orden.insumosRequeridos) {
      if (r.noEncontrado) continue;
      const ins = insumos.find((i) => i.id === r.insumoId);
      if (!ins) continue;
      const cant = convertirUnidad(r.cantidad, r.unidad, ins.unidadMedida);
      // Unidades incompatibles no llegan hasta acá: el completado las bloquea.
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

  /** Descuento del stock de Productos terminados al COMPLETAR una orden
      "Pedido de cliente": es lo que esa orden entrega (la pizza solo se
      calienta) y baja exactamente una vez, mientras `productosDescontados`
      siga apagado. Las órdenes "Preparación en lote" no tocan este stock: sus
      líneas son Productos Insumo. Devuelve el resumen para el toast. */
  const descontarProductos = (orden: OrdenProduccion): string[] => {
    if (orden.tipo !== "pedido" || orden.productosDescontados) return [];
    const req = new Map<string, number>();
    for (const l of orden.lineas) {
      const cantidad = l.cantidadEstimada || 0;
      if (cantidad <= 0) continue;
      // Mismo criterio que `lineasDeVenta`: por id y, si la línea es vieja, por
      // nombre normalizado (el detalle trae el tamaño pegado con " — ").
      const porId = l.productoId ? productos.find((p) => p.id === l.productoId) : undefined;
      const base = l.nombre.split(" — ")[0].trim();
      const porNombre = productos.find((p) => normalizar(p.nombre) === normalizar(base));
      const producto = porId ?? porNombre;
      if (!producto) continue;
      req.set(producto.id, (req.get(producto.id) ?? 0) + cantidad);
    }
    if (req.size === 0) return [];
    // El resumen se calcula FUERA del updater para no duplicarlo si React lo
    // invoca dos veces (modo estricto); el descuento en sí es idempotente
    // porque vive en la marca `productosDescontados`.
    const resumen: string[] = [];
    for (const [pid, cant] of req) {
      const p = productos.find((x) => x.id === pid);
      if (!p) continue;
      const despues = Math.max(0, Math.round((p.stockDisponible - cant) * 1000) / 1000);
      resumen.push(`${p.nombre} ${despues - p.stockDisponible}`);
    }
    setProductos((prev) => prev.map((p) => {
      const cant = req.get(p.id);
      if (!cant) return p;
      // Nunca por debajo de 0, igual que insumos y mermas.
      const despues = Math.max(0, Math.round((p.stockDisponible - cant) * 1000) / 1000);
      return { ...p, stockDisponible: despues };
    }));
    return resumen;
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

  const iniciar = (id: string) => {
    const orden = ordenes.find((o) => o.id === id);
    if (!orden) return;
    // Iniciar SOLO cambia el estado y registra el historial: no descuenta
    // insumos, no baja el stock de Productos ni suma producción (§5: eso pasa
    // recién en `confirmarCompletar`).
    const now = nowISO();
    const actualizado: OrdenProduccion = {
      ...orden,
      estadoOrden: "en-proceso",
      inicioProduccion: now,
      entregaEstimada: addMinutesISO(now, tiempoTotalOrden(orden)),
      historial: [...orden.historial, { de: orden.estadoOrden, a: "en-proceso", fechaHora: now }],
    };
    setOrdenes((p) => p.map((o) => (o.id === id ? actualizado : o)));
    toast.success(`${id} en proceso`);
  };

  const abrirCompletar = (id: string) => {
    const orden = ordenes.find((o) => o.id === id);
    if (!orden) return;
    setCompletarItem(orden);
    // La cantidad real arranca precargada con la estimada, y la confirmación
    // de faltantes se limpia en cada apertura del modal.
    const precarga: Record<number, string> = {};
    orden.lineas.forEach((l, i) => { precarga[i] = String(l.cantidadEstimada); });
    setReales(precarga);
    setFaltantesCompletar(null);
  };

  /** Completa la orden: registra la producción real y aplica TODO el
      inventario que la orden consume/produce, en este orden:
      1) insumos y Productos Insumo requeridos (bajan, convertidos a la unidad
         del catálogo),
      2) Productos terminados del menú (solo tipo "pedido", es lo que se
         entrega),
      3) stock del Producto Insumo producido (solo tipo "preparación", solo
         la cantidad real).
      Cada paso queda marcado con su bandera, así que repetir el guardado no
      vuelve a mover stock ni se duplica al reabrir la orden. Las unidades
      incompatibles bloquean ANTES de tocar nada; los faltantes se piden una
      sola vez y el stock nunca baja de 0. */
  const confirmarCompletar = () => {
    if (!completarItem) return;
    const orden = ordenes.find((o) => o.id === completarItem.id);
    if (!orden) return;

    // 1) Unidades incompatibles: bloquean el completado antes de mover stock.
    const incompatibles: { nombre: string; unidadFicha: string; unidadCatalogo: string }[] = [];
    for (const r of orden.insumosRequeridos) {
      if (r.noEncontrado) continue;
      const ins = insumos.find((i) => i.id === r.insumoId);
      if (!ins || unidadesCompatibles(r.unidad, ins.unidadMedida)) continue;
      incompatibles.push({ nombre: r.nombre, unidadFicha: r.unidad, unidadCatalogo: ins.unidadMedida });
    }
    if (incompatibles.length > 0) {
      toast.error(
        `No se puede completar: unidades incompatibles — ${incompatibles
          .map((x) => `${x.nombre} (${x.unidadFicha} en la ficha, ${x.unidadCatalogo} en el catálogo)`)
          .join(", ")}`,
      );
      return;
    }

    // 2) Faltantes: si los hay y todavía no se confirmaron, se avisa y se
    // pide una segunda confirmación (el modal queda abierto).
    const faltantes = faltantesDe(orden, insumos);
    if (faltantes.length > 0 && !faltantesCompletar) {
      setFaltantesCompletar(faltantes);
      return;
    }

    const lineas: LineaOrden[] = orden.lineas.map((l, i) => {
      const real = Number(reales[i]);
      if (!Number.isFinite(real) || real < 0) return l;
      // Si lo real supera lo estimado no hay merma: es sobrante, y la merma
      // queda en 0 (la confirmación se pide en el modal).
      const merma = Math.max(0, Math.round((l.cantidadEstimada - real) * 1000) / 1000);
      return { ...l, cantidadReal: real, merma };
    });

    // Marca cada movimiento que se va a aplicar AHORA. Si la marca ya estaba
    // encendida, ese movimiento ocurrió antes (orden legacy que descontaba al
    // Iniciar, o una orden que se completa dos veces) y NO se repite.
    const aplicarInsumos = !orden.insumosDescontados;
    const aplicarProductos = orden.tipo === "pedido" && !orden.productosDescontados;
    const aplicarStock = orden.tipo === "preparacion" && !orden.stockAplicado;

    const now = nowISO();
    const actualizado: OrdenProduccion = {
      ...orden,
      lineas,
      estadoOrden: "completada",
      historial: [...orden.historial, { de: orden.estadoOrden, a: "completada", fechaHora: now }],
      insumosDescontados: orden.insumosDescontados || aplicarInsumos,
      productosDescontados: orden.productosDescontados || aplicarProductos,
      stockAplicado: orden.stockAplicado || aplicarStock,
      notasFaltantes: faltantes.length > 0
        ? `Completó con faltantes: ${faltantes.map((f) => `${f.nombre} (faltan ${fmtCant(f.falta, f.unidad)})`).join(", ")}`
        : orden.notasFaltantes,
    };
    setOrdenes((p) => p.map((o) => (o.id === orden.id ? actualizado : o)));

    // Punto C2: si la orden pertenece a una venta, al completarse ésta sale
    // de cocina y pasa a "Por entregar" (transición en-preparacion → venta,
    // registrada en services/estadosVenta.ts). Es el paso que antes no estaba
    // cableado: la venta y su orden avanzaban por separado.
    if (orden.ventaId) onVentaLista?.(orden.ventaId);

    if (faltantes.length > 0) {
      toast.warning(actualizado.notasFaltantes ?? "Completó con faltantes");
    }

    // ── a) Insumos y Productos Insumo consumidos (§5) ──
    if (aplicarInsumos) descontarInsumos(orden);

    // ── b) Productos terminados del menú (solo pedidos de cliente) ──
    const bajaron = aplicarProductos ? descontarProductos(orden) : [];

    // ── c) Stock del Producto Insumo producido (solo preparación en lote) ──
    // Al stock del Producto Insumo SUBE solo la cantidad real (la merma no
    // existe como producto).
    if (aplicarStock) {
      const produccion = new Map<string, number>();
      lineas.forEach((l, i) => {
        const real = Number(reales[i]);
        if (!Number.isFinite(real)) return;
        produccion.set(l.idProducto, (produccion.get(l.idProducto) ?? 0) + real);
      });
      setInsumos((prev) => prev.map((ins) => {
        const cant = produccion.get(ins.id);
        if (cant === undefined) return ins;
        return { ...ins, stockActual: Math.round((ins.stockActual + cant) * 1000) / 1000 };
      }));
      toast.success(
        `${orden.id} completada — ${[...produccion.entries()]
          .map(([pid, c]) => `${insumos.find((i) => i.id === pid)?.nombre ?? pid} +${c}`)
          .join(" · ")}`,
      );
    } else {
      toast.success(`${orden.id} completada${bajaron.length ? ` — productos: ${bajaron.join(", ")}` : ""}`);
    }
    // Merma como no conformidad: solo órdenes "Preparación en lote" (las de
    // "Pedido de cliente" entregan platos, no Productos Insumo). El dedupe
    // vive dentro del updater funcional para que ni un doble clic ni el doble
    // render de React la dupliquen. Esa cantidad NO se descuenta del stock:
    // nunca entró al inventario (solo entró la cantidad real).
    if (orden.tipo === "preparacion") {
      setNoConformidades((prev) => {
        const nuevas: NoConformidad[] = [];
        orden.lineas.forEach((l, i) => {
          const real = Number(reales[i]);
          if (!Number.isFinite(real)) return;
          const merma = Math.max(0, Math.round((l.cantidadEstimada - real) * 1000) / 1000);
          if (merma <= 0) return;
          const yaExiste = prev.some(
            (n) => n.ordenRef === orden.id && n.nombre === l.nombre && n.tipoNoConformidad === "Merma de cocina",
          );
          if (yaExiste) return;
          nuevas.push({
            id: nextNoConformidadId([...prev, ...nuevas]),
            tipo: "Producto insumo",
            nombre: l.nombre,
            categoria: "Producto insumo",
            fechaRegistro: new Date().toLocaleDateString("en-CA"),
            cantidadAfectada: merma,
            unidadMedida: l.unidad,
            tipoNoConformidad: "Merma de cocina",
            descripcionProblema: `Se planificaron ${l.cantidadEstimada} ${l.unidad} y se obtuvieron ${real} ${l.unidad}.`,
            causa: "",
            areaProceso: "Producción",
            responsable: "",
            estado: "Pendiente",
            tipoSolucion: "",
            solucion: "",
            ordenRef: orden.id,
          });
        });
        nuevas.forEach((n) =>
          toast.success(`Se registró la merma de ${n.nombre} en Productos no conformes`),
        );
        return nuevas.length > 0 ? [...nuevas, ...prev] : prev;
      });
    }
    setCompletarItem(null);
    setFaltantesCompletar(null);
    setReales({});
  };

  /** Cambio de estado desde el listado. "Completado" pasa por el modal de
      producción real; "Cancelada" solo llega por el flujo de Dar de baja. */
  const applyTransition = (id: string, next: EstadoOrden) => {
    const orden = ordenes.find((o) => o.id === id);
    if (!orden) return;
    if (next === "en-proceso") return iniciar(id);
    if (next === "completada") return abrirCompletar(id);
    const now = nowISO();
    setOrdenes((p) => p.map((o) => o.id === id
      ? {
          ...o,
          estadoOrden: next,
          historial: [...o.historial, { de: o.estadoOrden, a: next, fechaHora: now }],
        }
      : o));
    toast.success(`Estado cambiado a: ${ESTADO_LABEL[next]}`);
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

  const confirmarDarBaja = () => {
    if (!darBajaForm || !darBajaItem) return;
    if (!darBajaForm.descripcion.trim()) {
      toast.error("Describe el motivo de la baja");
      return;
    }
    setOrdenes((p) => p.map((o) => o.id === darBajaItem.id
      ? {
          ...o,
          estadoOrden: "cancelada",
          historial: [...o.historial, { de: o.estadoOrden, a: "cancelada", fechaHora: nowISO() }],
        }
      : o));
    setDarBajaItem(null);
    setDarBajaForm(null);
    toast.success(`Orden ${darBajaItem.id} dada de baja`);
  };

  // ── Modales ────────────────────────────────────────────────────────
  const Modal = ({ title, onClose, onConfirm, label, ancho, children }: {
    title: string; onClose: () => void; onConfirm: () => void; label: string;
    ancho?: string; children: React.ReactNode;
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
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">{label}</button>
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

      {/* Listado */}
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
                const puedeBaja = o.estadoOrden === "pendiente" || o.estadoOrden === "en-proceso";
                const merma = totalMerma(o.lineas);
                const completada = o.estadoOrden === "completada";
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
                        {TIPO_LABEL[o.tipo]}
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
                            <p className="text-[11px] font-semibold text-red-600 tabular-nums">−{fmtCant(merma, "und")} merma</p>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {/* Pill de estado (diseño de Proveedores). La transición
                          se aplica igual que antes; sin transiciones (estados
                          finales) la pill queda sin menú. */}
                      <EstadoSelect
                        value={o.estadoOrden}
                        onChange={next => {
                          if (next === o.estadoOrden) return;
                          applyTransition(o.id, next);
                        }}
                        options={[
                          { value: o.estadoOrden, label: ESTADO_LABEL[o.estadoOrden], color: ESTADO_COLOR[o.estadoOrden] },
                          ...VALID_TRANSITIONS[o.estadoOrden].map(n => ({
                            value: n, label: ESTADO_LABEL[n], color: ESTADO_COLOR[n],
                          })),
                        ]}
                        disabled={VALID_TRANSITIONS[o.estadoOrden].length === 0}
                      />
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {fmtDT(ultimoCambio(o))}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <ActionIcons
                          onView={() => setDetailItem(o)}
                          onEdit={canEdit ? () => setEditItem({ ...o }) : undefined}
                          editDisabled={!soloPendiente}
                          editTitle={soloPendiente ? "Editar" : "Solo se puede editar en estado Pendiente"}
                          onDelete={canDelete ? () => setDeleteId(o.id) : undefined}
                          deleteDisabled={!soloPendiente}
                          deleteTitle={soloPendiente ? "Eliminar" : "Solo se puede eliminar en estado Pendiente"}
                        />
                        <button onClick={() => puedeBaja && openDarBaja(o)}
                          disabled={!puedeBaja}
                          title={puedeBaja ? "Dar de baja" : "No se puede dar de baja en este estado"}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
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

      {/* Paginación (unificada, fuera de la card) */}
      {filtradas.length > 0 && (
        <Paginador pagina={page} totalPaginas={totalPages} onCambio={setPage} />
      )}

      {/* ── Modal: Crear ── */}
      <AnimatePresence>
        {showCreate && Modal({
          title: "Crear Orden de Producción",
          onClose: () => setShowCreate(false),
          onConfirm: handleCreate,
          label: "Crear Orden",
          ancho: "max-w-2xl",
          children: (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">¿Qué se va a preparar?</label>
                <TarjetasTipo
                  value={form.tipo}
                  onChange={(t) => setForm(p => ({ ...emptyForm(t), observacion: p.observacion }))}
                />
              </div>

              {form.tipo === "preparacion" ? (
                <>
                  <div className="space-y-3">
                    {form.lineas.map((l, idx) => (
                      <LineaPreparacion
                        key={idx}
                        linea={l}
                        insumos={insumos}
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
                </>
              ) : (
                <CamposPedido
                  form={form}
                  set={setForm}
                  ventas={ventas}
                  ventasSinOrden={ventasSinOrden}
                  ordenes={ordenes}
                  productos={productos}
                  fichas={fichasPorProducto}
                  insumos={insumos}
                />
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Observación</label>
                <textarea value={form.observacion} onChange={e => setForm(p => ({ ...p, observacion: e.target.value }))}
                  rows={2} placeholder="Notas adicionales sobre esta orden..." className={tCls} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Toda orden nace <strong>Pendiente</strong>. Se avanza a En proceso y luego a Completada.
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

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Observación</label>
                <textarea value={editItem.observacion} onChange={e => setEditItem(x => x && ({ ...x, observacion: e.target.value }))}
                  rows={2} className={tCls} />
              </div>
            </div>
          ),
        })}
      </AnimatePresence>

      {/* ── Modal: Registrar producción real ── */}
      <AnimatePresence>
        {completarItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
              className="bg-card rounded-2xl w-full max-w-2xl shadow-2xl border border-border max-h-[90vh] flex flex-col my-4">
              <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
                  Registrar producción real — {completarItem.id}
                </h3>
                <button onClick={() => { setCompletarItem(null); setFaltantesCompletar(null); }} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  {completarItem.tipo === "preparacion"
                    ? "Al completar, al stock del Producto Insumo sube solo la cantidad real; la merma no existe como producto."
                    : "Al completar se registra la producción real y la merma. No se suma stock a ningún producto."}
                </p>
                {faltantesCompletar && faltantesCompletar.length > 0 && (
                  <div className="p-4 border border-red-300 rounded-2xl bg-red-50 space-y-1">
                    <p className="text-sm font-bold text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" /> Inventario insuficiente
                    </p>
                    {faltantesCompletar.map((f) => (
                      <p key={f.insumoId} className="text-sm text-red-700 flex items-center gap-2">
                        <Minus className="w-3.5 h-3.5 shrink-0" />
                        Faltan {fmtCant(f.falta, f.unidad)} de {f.nombre} (hay {fmtCant(f.stock, f.unidad)})
                      </p>
                    ))}
                    <p className="text-xs text-red-700 pt-1">
                      Si completas igual, el stock baja hasta 0 y la orden guarda la nota de los faltantes.
                    </p>
                  </div>
                )}
                {completarItem.lineas.map((l, i) => {
                  const real = Number(reales[i]);
                  const ok = Number.isFinite(real);
                  const sobra = ok && real > l.cantidadEstimada;
                  const merma = ok ? Math.max(0, Math.round((l.cantidadEstimada - real) * 1000) / 1000) : 0;
                  return (
                    <div key={i} className="p-4 border border-border rounded-2xl bg-card space-y-2">
                      <p className="text-sm font-semibold text-foreground">{l.nombre}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad estimada</label>
                          <input value={fmtCant(l.cantidadEstimada, l.unidad)} readOnly className={iCls + " opacity-70 cursor-default"} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">
                            Cantidad real {l.unidad}
                          </label>
                          <input
                            type="number" min={0}
                            step={esDecimal(l.unidad) ? 0.01 : 1}
                            // Texto con vacío permitido (punto B1); se limpian
                            // los ceros a la izquierda al teclear.
                            value={reales[i] ?? ""}
                            placeholder="0"
                            onChange={e => setReales(p => ({ ...p, [i]: limpiarNumeroInput(e.target.value) }))}
                            className={iCls}
                          />
                        </div>
                      </div>
                      <p className={`text-xs font-semibold ${sobra ? "text-blue-600" : merma > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                        {sobra
                          ? `Sobrante: ${fmtCant(real - l.cantidadEstimada, l.unidad)} — se confirma al completar y la merma queda en 0`
                          : `Merma: ${fmtCant(merma, l.unidad)}`}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="shrink-0 flex gap-3 px-5 py-4 border-t border-border">
                <button onClick={() => { setCompletarItem(null); setFaltantesCompletar(null); }}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                  Cancelar
                </button>
                <button onClick={() => {
                  const haySobrante = completarItem.lineas.some((l, i) => Number(reales[i]) > l.cantidadEstimada);
                  if (haySobrante && !window.confirm(
                    "Hay líneas con más producción que la estimada. La merma de esas líneas queda en 0. ¿Completar la orden?",
                  )) return;
                  confirmarCompletar();
                }}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                  {faltantesCompletar && faltantesCompletar.length > 0
                    ? "Completar de todas formas"
                    : "Completar orden"}
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
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${detailItem.tipo === "preparacion" ? "bg-purple-100 text-purple-800" : "bg-teal-100 text-teal-800"}`}>{TIPO_LABEL[detailItem.tipo]}</span>
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
                    {detailItem.lineas.map((l, i) => (
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
                        {l.pasos && l.pasos.length > 0 && (
                          <ol className="mt-1.5 list-decimal list-inside text-[11px] text-muted-foreground space-y-0.5">
                            {l.pasos.map((p, j) => <li key={j}>{p}</li>)}
                          </ol>
                        )}
                      </div>
                    ))}
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
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[h.de]}`}>{ESTADO_LABEL[h.de]}</span>
                                <span className="text-muted-foreground text-xs">→</span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[h.a]}`}>{ESTADO_LABEL[h.a]}</span>
                              </div>
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
                          modo={detailItem.tipo === "preparacion" ? "insumo" : "producto"} />
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
            {elegidas.lineas.map((l, i) => (
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
                </div>
                {l.sinFicha ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">Sin ficha</span>
                ) : (
                  <Layers className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                )}
              </div>
            ))}
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
