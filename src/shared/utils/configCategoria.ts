import type { PorcionesTamano } from "@/shared/utils/fichas";
import type { TipoProducto } from "@/features/productos/pages/GestionProductosScreen";

/** Lo que la CATEGORÍA define del producto (sección 3): su tipo y los
    tamaños de su ficha técnica. Una categoría SIN entrada aquí es "sin
    configuración": el tipo lo responde el operador con "¿Tiene ficha
    técnica?" y su ficha lleva un único tamaño "Único" (etiqueta fija). */
export interface ConfigCategoria {
  tipo: TipoProducto;
  /** Filas de "Porciones por tamaño" con sus porciones precargadas, en el
      orden en que se muestran. `null` = sin ficha (Producto terminado). */
  tamanos: readonly PorcionesTamano[] | null;
}

/** Categorías fijas del módulo Categoría de Productos (CAT-001…003). */
export const CONFIG_CATEGORIA: Record<string, ConfigCategoria> = {
  // Pizzas: ficha con dos tamaños fijos (el primero es el que lee el resto
  // de la app como "porciones por unidad": una Mediana rinde 6).
  "CAT-001": {
    tipo: "Producto insumo",
    tamanos: [
      { tamano: "Mediana", porciones: 6 },
      { tamano: "Grande", porciones: 8 },
    ],
  },
  // Lasañas: presentación única.
  "CAT-002": {
    tipo: "Producto insumo",
    tamanos: [{ tamano: "Normal", porciones: 1 }],
  },
  // Bebidas: se revenden tal como se compran, sin ficha ni tamaños.
  "CAT-003": {
    tipo: "Producto terminado",
    tamanos: null,
  },
};

/** Nombre de categoría sin acentos ni mayúsculas, para compararlo. */
const nombreCategoriaNormalizado = (s: string): string =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Configuración de una categoría: primero por id (CAT-001…003) y, si el id
    no está, por nombre normalizado (una categoría propia llamada "Pizzas"
    hereda la configuración de CAT-001). `null` = sin configuración. */
export const configDeCategoria = (id: string, nombre?: string): ConfigCategoria | null => {
  if (id && CONFIG_CATEGORIA[id]) return CONFIG_CATEGORIA[id];
  const n = nombreCategoriaNormalizado(nombre ?? "");
  if (n.includes("pizza")) return CONFIG_CATEGORIA["CAT-001"];
  if (n.includes("lasana")) return CONFIG_CATEGORIA["CAT-002"];
  if (n.includes("bebida")) return CONFIG_CATEGORIA["CAT-003"];
  return null;
};
