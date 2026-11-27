import type { Dispatch, SetStateAction } from "react";
import type { Insumo } from "@/features/supplies/pages/SuppliesScreen";
import type { Producto } from "@/features/products/pages/ProductsScreen";
import type { EstadoProducto } from "@/shared/components/ProductStatus";
import type { EntradaCompraApi } from "@/features/products/services/productsApi";
import { mismoNombre } from "@/shared/utils/names";

/** Estado React de un catálogo del panel (insumos / productos). */
export type SetCatalogo<T> = Dispatch<SetStateAction<T[]>>;

/** Lo mínimo que necesita el cálculo de stock de una línea de factura: lo
 *  comparten `ItemFactura` (formulario) y `OrdenItem` (lo que queda guardado
 *  en `GestionCompra.items`), así que la misma función sirve para aplicar y
 *  para revertir. */
export type ItemStock = {
  idInsumo: string;
  nombre: string;
  cantidad: number;
  /** P14: si la línea es insumo o producto. Opcional para las compras viejas,
   *  que solo tenían insumos. */
  tipoItem?: "insumo" | "producto";
  /** Ajuste de presentación de bebidas: unidades que trae la paca/caja
   *  comprada (ej. 12). Sólo lo traen las líneas de producto compradas en
   *  paca/caja; las de unidad suelta y las compras viejas no lo traen y se
   *  leen como 1, así que su stock no cambia. */
  unidadesPorEmpaque?: number;
  rowId?: string;
  stockApiAplicado?: boolean;
  stockApiRevertido?: boolean;
  stockApiPendiente?: boolean;
  stockApiPendienteReversa?: boolean;
};

export interface ErrorLineaProducto {
  nombre: string;
  mensaje: string;
  indice: number;
}

const productoDeLineaCompra = (linea: ItemStock, productos: Producto[]) =>
  productos.find((p) => p.id === linea.idInsumo)
    ?? productos.find((p) => mismoNombre(p.nombre, linea.nombre));

export const esLineaProducto = (linea: ItemStock) =>
  linea.tipoItem === "producto" || (linea.tipoItem == null && /^PROD-/i.test(linea.idInsumo));

const payloadEntradaDeLinea = (
  linea: ItemStock & { precioUnitario?: number; precioVenta?: number; iva?: number },
  ivaIncluido: boolean,
): EntradaCompraApi => {
  const factor = unidadesPorLinea(linea);
  const montoPresentacion = Number(linea.precioUnitario ?? 0);
  const iva = Number(linea.iva ?? 0);
  const unidades = Number(linea.cantidad) * factor;
  if (!Number.isSafeInteger(unidades) || unidades <= 0) {
    throw new Error("La cantidad de bebidas debe ser un número entero mayor que cero.");
  }
  const totalConIva = ivaIncluido ? montoPresentacion : montoPresentacion * (1 + iva / 100);
  const montoSinIva = ivaIncluido ? montoPresentacion / (1 + iva / 100) : montoPresentacion;
  return {
    unidades,
    costo_unitario: Math.round((totalConIva / factor) * 100) / 100,
    precio_venta: Number(linea.precioVenta ?? 0),
    ultimo_monto_sin_iva: Math.round(montoSinIva * 100) / 100,
    ultimo_iva_compra: iva,
    // Punto C2: el monto digitado TAL CUAL (por presentación, sin dividir por
    // IVA) para precargarlo la próxima vez que se elija el producto.
    ultimo_monto_digitado: montoPresentacion,
  };
};



/**
 * Unidades por presentación de compra de la línea: `unidadesPorEmpaque` (> 1
 * cuando se compró en paca/caja) o 1 para unidad suelta y datos viejos.
 * `cantidad` de una línea en paca equivale a `cantidad × unidades` sueltas.
 */
export const unidadesPorLinea = (l: Pick<ItemStock, "unidadesPorEmpaque">): number => {
  const n = Math.trunc(Number(l.unidadesPorEmpaque ?? 1));
  return Number.isFinite(n) && n > 1 ? n : 1;
};

export interface OpcionesStock {
  /** Catálogos ACTUALES: son los que dicen a qué ítem corresponde cada línea. */
  insumos?: Insumo[];
  productos?: Producto[];
  /** Sin setters no hay forma de escribir el inventario: la compra se guarda
   *  igual y el stock simplemente no se aplica (nadie se entera de nada roto). */
  setInsumos?: SetCatalogo<Insumo>;
  setProductos?: SetCatalogo<Producto>;
}

export interface ResumenStock {
  /** Unidades totales sumadas (signo +1) o restadas (signo -1). */
  unidades: number;
  /** Nombres de los ítems que coincidieron con un insumo/producto del catálogo. */
  nombres: string[];
}

/** Redondeo a 3 decimales: evita el desfase binario de punto flotante
 *  (0.1 + 0.2 = 0.30000000000000004) al acumular stock. */
export const redondear3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Suma (signo 1) o resta (signo -1) en el inventario las cantidades de los
 * ítems de una compra.
 *
 * Por qué existe: guardar una compra es el hecho que incrementa el stock de lo
 * comprado, y anularla debe devolver el inventario al estado previo. Los updates
 * son SIEMPRE funcionales (`prev => ...`) para no pisar estados concurrentes
 * (otra pantalla del panel puede estar actualizando el mismo catálogo en el
 * mismo lote de render).
 *
 * Devuelve `null` cuando no hay setters que tocar y, si los hay, el resumen de
 * lo realmente aplicado (para armar el toast).
 */
export function aplicarStockCompra(
  items: ItemStock[],
  signo: 1 | -1,
  { insumos, productos, setInsumos, setProductos }: OpcionesStock
): ResumenStock | null {
  // Sin setters no se puede escribir el catálogo: no se rompe nada, la compra
  // se guarda igual y aquí no se aplica stock (el llamador además decide no
  // marcar `stockAplicado`, para que después no intente revertir algo que
  // nunca sumó).
  if (!setInsumos && !setProductos) return null;

  // A qué catálogo pertenece cada línea. Si trae `tipoItem` (P14) el dato
  // manda; si es una compra vieja sin tipo, decide la coincidencia de id. Las
  // líneas de texto libre (id sintético `INS-FAC-…`) o las de un insumo ya
  // dado de baja no coinciden con nada: quedan fuera porque no hay stock que
  // mover en ningún catálogo.
  const lineasInsumo: ItemStock[] = [];
  const lineasProducto: ItemStock[] = [];
  for (const item of items) {
    if (!item.cantidad) continue;
    const enInsumo = (insumos ?? []).some((i) => i.id === item.idInsumo);
    const enProducto = (productos ?? []).some((p) => p.id === item.idInsumo);
    if (item.tipoItem === "producto") {
      if (enProducto) lineasProducto.push(item);
    } else if (item.tipoItem === "insumo") {
      if (enInsumo) lineasInsumo.push(item);
    } else if (enInsumo) {
      lineasInsumo.push(item);
    } else if (enProducto) {
      lineasProducto.push(item);
    }
  }

  // El resumen sólo cuenta lo que SE PUEDE aplicar (catálogo + setter presente).
  const lineasAfectadas = [
    ...(setInsumos ? lineasInsumo : []),
    ...(setProductos ? lineasProducto : []),
  ];
  if (lineasAfectadas.length === 0) return { unidades: 0, nombres: [] };

  // Si la factura trae dos líneas del mismo insumo, se acumulan en una sola
  // pasada para no depender del orden de los updates. Una línea de producto
  // comprada en paca/caja cuenta por sus unidades (`unidadesPorLinea`), así
  // que stockDisponible sigue midiendo UNIDADES sueltas; las líneas de
  // insumo y las viejas traen factor 1 y no cambian.
  const acumular = (lineas: ItemStock[]) => {
    const mapa = new Map<string, number>();
    for (const l of lineas)
      mapa.set(l.idInsumo, (mapa.get(l.idInsumo) ?? 0) + l.cantidad * unidadesPorLinea(l));
    return mapa;
  };
  const cantInsumo = acumular(lineasInsumo);
  const cantProducto = acumular(lineasProducto);

  if (setInsumos && cantInsumo.size > 0) {
    setInsumos((prev) =>
      prev.map((i) => {
        const cant = cantInsumo.get(i.id);
        if (!cant) return i;
        const total = i.stockActual + signo * cant;
        const stockActual = signo < 0 ? Math.max(0, redondear3(total)) : redondear3(total);
        return { ...i, stockActual };
      })
    );
  }

  if (setProductos && cantProducto.size > 0) {
    setProductos((prev) =>
      prev.map((p) => {
        const cant = cantProducto.get(p.id);
        if (!cant) return p;
        const total = p.stockDisponible + signo * cant;
        // Mismo criterio que en insumos: redondeo a 3 decimales y mínimo 0.
        return { ...p, stockDisponible: signo < 0 ? Math.max(0, redondear3(total)) : redondear3(total) };
      })
    );
  }

  return {
    unidades: lineasAfectadas.reduce((s, l) => s + Math.abs(l.cantidad) * unidadesPorLinea(l), 0),
    nombres: [...new Set(lineasAfectadas.map((l) => l.nombre))],
  };
}

/** Texto del toast al sumar stock: con una línea se nombra el insumo/producto
 *  y con varias se resume (no se satura el toast con 20 nombres). */
export const textoStockActualizado = (r: ResumenStock) => {
  if (r.nombres.length === 1) {
    return `Stock actualizado: ${r.unidades} unidades de «${r.nombres[0]}» añadidas al inventario`;
  }
  const mostrados = r.nombres.slice(0, 3);
  const resto = r.nombres.length - mostrados.length;
  return `Stock actualizado: ${r.nombres.length} ítems añadidos al inventario (${mostrados
    .map((n) => `«${n}»`)
    .join(", ")}${resto > 0 ? `, +${resto} más` : ""})`;
};

/** Línea con precio de venta: lo comparten `ItemFactura` (formulario de la
 *  Nueva compra) y `OrdenItem` (lo que queda guardado / lo que llega de una
 *  Orden de Compra). El resto de campos de stock vienen de `ItemStock`. */
export type LineaPrecio = ItemStock & {
  /** Monto unitario de la línea: base (sin IVA) o con IVA, según el modo de
   *  la factura (`ivaIncluido` del tercer argumento). */
  precioUnitario?: number;
  /** Porcentaje de IVA de la línea (0–100). */
  iva?: number;
  /** Precio de VENTA al público elegido en la compra (sólo productos). */
  precioVenta?: number;
};

export interface ResumenPrecios {
  /** Productos cuyo precio de venta se escribió en el catálogo. */
  nombres: string[];
  /** Cuántos pasaron de "No disponible" a "Disponible" por tener precio nuevo. */
  disponibles: number;
}

/**
 * Ajuste de bebidas: historial de compra del producto — el último monto de la
 * presentación (paca/caja) SIN IVA y el % de IVA de esa línea, tal como los
 * escribe `aplicarPreciosCompra`. Al elegir el producto de nuevo en Nueva
 * compra, Orden de Compra o Recepción se precarga ese monto (y ese %): con el
 * modo "Sin IVA" va tal cual y en "Con IVA incluido" se le suma el %. Los
 * productos sin historial (datos viejos) devuelven `null` y el llamador
 * precarga como siempre (costo del catálogo por presentación).
 *
 * Punto C2: `montoDigitado` es el último monto unitario TAL CUAL lo digitó el
 * usuario (sin convertir por IVA, ej. 4000). Si existe, las tres pantallas lo
 * precargan en "Monto unitario"; si no (productos viejos), sigue mandando el
 * comportamiento anterior (`montoSinIva` según el modo de IVA).
 */
export const historialCompraDe = (
  p: Pick<Producto, "ultimoMontoSinIva" | "ultimoIvaCompra" | "ultimoMontoDigitado">
): { montoSinIva: number; iva: number; montoDigitado?: number } | null => {
  if (
    typeof p.ultimoMontoSinIva !== "number" ||
    !Number.isFinite(p.ultimoMontoSinIva) ||
    typeof p.ultimoIvaCompra !== "number" ||
    !Number.isFinite(p.ultimoIvaCompra)
  ) {
    return null;
  }
  const base = { montoSinIva: p.ultimoMontoSinIva, iva: p.ultimoIvaCompra };
  // Sólo se expone como "digitado" un número válido y > 0.
  return typeof p.ultimoMontoDigitado === "number" &&
    Number.isFinite(p.ultimoMontoDigitado) &&
    p.ultimoMontoDigitado > 0
    ? { ...base, montoDigitado: p.ultimoMontoDigitado }
    : base;
};
