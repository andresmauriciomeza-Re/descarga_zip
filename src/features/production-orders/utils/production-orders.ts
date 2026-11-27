import type { Venta } from "@/features/sales/utils/sales";

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
