import type { Venta } from "@/features/sales/utils/sales";
import type { Producto } from "@/features/products/utils/products";
import type { FichasPorProducto } from "@/shared/utils/technicalSheets";
import { type FichaVersion, porcionesReferencia } from "@/shared/utils/technicalSheets";
import type { Insumo } from "@/features/supplies/utils/supplies";
import { type FaltanteUnidad, requeridosPorUnidad, fmtCant } from "@/shared/utils/availability";

export type EstadoOrden = "pendiente" | "en-proceso" | "completada" | "cancelada";

/** Las dos formas de trabajar en la cocina. */
export type TipoOrden = "preparacion" | "pedido";

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
  /** Se llenan al completar la orden. */
  cantidadReal?: number | null;
  pizzasMedianas?: number;
  pizzasGrandes?: number;
  cantidadDebida?: number | null;
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

export interface TransicionEstado {
  de: EstadoOrden | null; // null = paso inicial (Orden creada)
  a: EstadoOrden;
  fechaHora: string; // ISO
  /** Motivo del paso, cuando no es un cambio de estado (p. ej. "Creada desde
      Insumos" en las órdenes que nacen al crear un Producto Insumo). Opcional:
      las órdenes viejas y las transiciones normales no lo traen y se pintan
      igual que siempre. */
  detalle?: string;
  automatico?: boolean;
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
  ventaLocal?: boolean;
  estadoVenta?: Venta["estado"];
  ventaNumero?: string | null;
  cliente?: string | null;
  fechaSolicitada: string;   // "YYYY-MM-DD"
  horaSolicitada: string;    // "HH:MM"
  fechaLimite?: string | null; // timestamp local de Bogotá, sin zona en PostgreSQL
  estadoOrden: EstadoOrden;
  observacion: string;
  creadaEn: string;          // ISO — columna "Fecha/Hora de estado" si aún no hubo cambio
  inicioProduccion: string | null;
  finCalentamientoMs?: number;
  listoDespuesRecogida?: boolean;
  cierreManualPorTiempo?: boolean;
  finPreparacionMs?: number;
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

export const PER_PAGE = 10;

export const INPUT_LINEA_CLS = "w-full h-[54px] px-[18px] bg-muted border border-border text-base text-foreground rounded-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Tiempo fijo de una orden "Pedido de cliente": el plato solo pasa por el
    horno. El `tiempoPreparacion` de la ficha técnica es de "Preparación en
    lote" y NO se usa en las órdenes de pedido. */
export const HORNEADO_MIN = 25;

// ─────────────────────────── Helpers ───────────────────────────
export const UNIDADES_DECIMALES = ["kg", "g", "lt", "litros", "ml"];

export const esDecimal = (unidad: string) => UNIDADES_DECIMALES.includes(unidad);

export function fmtMinutos(min: number): string {
  if (min <= 0) return "0 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Compara sin distinguir mayúsculas, tildes ni espacios sobrantes. Se exporta
    porque App la necesita para resolver el producto del catálogo de una venta. */
export const normalizarNombre = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export const normalizar = normalizarNombre;

export const esPizzaProducto = (producto?: Producto | null): boolean =>
  producto?.idCategoria === "1"
  || producto?.idCategoria === "CAT-001"
  || normalizar(producto?.categoriaNombre ?? "").includes("pizza");

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
export function snapshotDeFicha(ficha: FichaVersion): NonNullable<LineaOrden["fichaSnapshot"]> {
  return {
    version: ficha.version,
    rendimiento: ficha.rendimiento ?? 1,
    insumos: ficha.insumos,
    tiempoPreparacion: ficha.tiempoPreparacion,
    pasos: ficha.pasos,
  };
}

export const esProductoInsumo = (i: Insumo) => i.tipo === "ProductoInsumo";

/** Un insumo que no alcanza: lo que se pide, lo que hay y lo que falta. Sale
    del cálculo compartido `faltantesPara` (shared/utils/disponibilidad), que
    además avisa con un `motivo` cuando el insumo no está en el catálogo, está
    inactivo o sus unidades no se pueden convertir. */
export type Faltante = FaltanteUnidad;

/** El faltante es una preparación (Producto Insumo): no se compra, se prepara. */
export const esFaltanteProductoInsumo = (f: Faltante, insumos: Insumo[]): boolean => {
  const i = insumos.find((x) => x.id === f.insumoId);
  return !!i && esProductoInsumo(i);
};

export interface OrdenForm {
  tipo: TipoOrden;
  lineas: LineaOrden[];
  ventaId: string | null;
  fechaSolicitada: string;
  horaSolicitada: string;
  observacion: string;
}

/** Insumos que consume una línea, para UNA unidad y con el factor de su
    tamaño. Manda el SNAPSHOT de la línea (la foto de la ficha al crear o
    editar la orden: sus filas y su rendimiento); solo para el factor de
    tamaño —que el snapshot no guarda— se leen los tamaños de la ficha
    vigente. Sin snapshot se cae a la ficha vigente. Es el cálculo
    compartido: `lineasDeVenta`, `crearOrdenReemplazo`, Productos y el
    control de faltantes usan la misma fórmula. */
export function requeridosDeLinea(linea: LineaOrden, fichas: FichasPorProducto): InsumoRequerido[] {
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
export function resumenNecesita(requeridos: InsumoRequerido[]): string {
  if (requeridos.length === 0) return "";
  return requeridos.map((r) => `${fmtCant(r.cantidad, r.unidad)} ${r.nombre}`).join(" · ");
}

/** Bloque 4 — Aviso de faltantes dentro de los modales Crear/Editar de una
    Preparación en lote: el mensaje exacto + la lista, igual que al crear un
    producto insumo en Gestión de Insumos. Mientras este bloque se muestre,
    el botón Crear/Guardar viene DESHABILITADO: no existe "Guardar igual"
    para preparaciones (eso es solo para pedidos, que vienen de una venta ya
    pagada). Con insumo ausente/inactivo/unidad incompatible manda el motivo
    (`motivoFaltante`), que ya trae el nombre del insumo. */
export const esInsumoInactivo = (faltante: Faltante) =>
  faltante.motivo === "inactivo" || /insumo .+ está inactivo/i.test(faltante.motivoTexto ?? "");

/** Líneas de una orden "Pedido de cliente", en solo lectura, desde el detalle
    de la venta. Cada línea trae sus insumos y el consumo se multiplica por la
    cantidad de platos. */
export function lineasDeVenta(
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
    const pizza = esPizzaProducto(producto);

    lineas.push({
      idProducto: producto?.id ?? "",
      productoId: producto?.id ?? null,
      nombre: producto?.nombre ?? base,
      unidad: "und",
      cantidadEstimada: d.cantidad,
      tamano,
      porciones: pizza
        ? d.cantidad
        : ficha ? d.cantidad * (porcionesReferencia(ficha) || 0) : undefined,
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
