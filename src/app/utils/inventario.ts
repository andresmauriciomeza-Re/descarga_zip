import type { Dispatch, SetStateAction } from "react";
import type { Insumo } from "../screens/GestionInsumosScreen";
import type { Producto } from "../screens/GestionProductosScreen";
import type { GestionCompra } from "../screens/OrdenCompraScreen";

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
 * Al SUMAR se aprovecha para rellenar `stockMaximo` cuando el insumo llegó sin
 * configurar (0 / vacío): recién entonces se conoce un techo real (el stock que
 * acaba de entrar). Si ya tiene techo NO se toca, aunque el stock lo supere: eso
 * es exactamente la alerta "Excede máx.", que avisa en vez de mover el límite.
 * Al RESTAR (anulación) `stockMaximo` tampoco se toca.
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
  // pasada para no depender del orden de los updates.
  const acumular = (lineas: ItemStock[]) => {
    const mapa = new Map<string, number>();
    for (const l of lineas) mapa.set(l.idInsumo, (mapa.get(l.idInsumo) ?? 0) + l.cantidad);
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
        // `stockMaximo` solo se rellena si venía vacío (0 / sin definir) y
        // únicamente al recibir; nunca se baja ni se sube después.
        const stockMaximo = signo > 0 && !i.stockMaximo ? stockActual : i.stockMaximo;
        return { ...i, stockActual, stockMaximo };
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
    unidades: lineasAfectadas.reduce((s, l) => s + Math.abs(l.cantidad), 0),
    nombres: [...new Set(lineasAfectadas.map((l) => l.nombre))],
  };
}

/**
 * Recalcula `costoMaximo` de cada insumo con las compras que hoy están en
 * "Recibido": es el mayor costo unitario facturado entre esas compras, o 0 si
 * ya no queda ninguna (todas anuladas o el insumo nunca se compró).
 *
 * Se recalcula SIEMPRE desde cero en vez de "subir el máximo" al recibir, para
 * que anular una compra devuelva el costo al valor anterior sin tener que
 * guardar el histórico de cada factura. Llamarlo con la lista de compras
 * DESPUÉS del cambio de estado (la compra anulada ya no debe contar).
 */
export function recalcularCostoMaximo(
  compras: GestionCompra[],
  setInsumos?: SetCatalogo<Insumo>
) {
  if (!setInsumos) return;

  const maximoPorInsumo = new Map<string, number>();
  for (const compra of compras) {
    if (compra.estado !== "Recibido") continue;
    for (const item of compra.items ?? []) {
      const costo = item.costoUnitario ?? 0;
      if (!costo) continue;
      const actual = maximoPorInsumo.get(item.idInsumo) ?? 0;
      if (costo > actual) maximoPorInsumo.set(item.idInsumo, costo);
    }
  }

  setInsumos((prev) =>
    prev.map((i) => {
      const nuevo = maximoPorInsumo.get(i.id) ?? 0;
      if ((i.costoMaximo ?? 0) === nuevo) return i;
      return { ...i, costoMaximo: nuevo };
    })
  );
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
