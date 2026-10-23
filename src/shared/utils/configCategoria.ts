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

// Pizzas: ficha con dos tamaños fijos (el primero es el que lee el resto
// de la app como "porciones por unidad": una Mediana rinde 6).
const CONFIG_PIZZA: ConfigCategoria = {
  tipo: "Producto insumo",
  tamanos: [
    { tamano: "Mediana", porciones: 6 },
    { tamano: "Grande", porciones: 8 },
  ],
};
// Lasañas: presentación única.
const CONFIG_LASANA: ConfigCategoria = {
  tipo: "Producto insumo",
  tamanos: [{ tamano: "Normal", porciones: 1 }],
};
// Bebidas: se revenden tal como se compran, sin ficha ni tamaños.
const CONFIG_BEBIDAS: ConfigCategoria = {
  tipo: "Producto terminado",
  tamanos: null,
};

/** Categorías fijas del módulo Categoría de Productos: ids 1 Pizza, 2 Lasaña
    y 3 Bebidas de tb_categoria_productos. Los "CAT-00x" son alias de los
    datos locales antiguos (semilla y migración). */
export const CONFIG_CATEGORIA: Record<string, ConfigCategoria> = {
  "1": CONFIG_PIZZA,
  "2": CONFIG_LASANA,
  "3": CONFIG_BEBIDAS,
  "CAT-001": CONFIG_PIZZA,
  "CAT-002": CONFIG_LASANA,
  "CAT-003": CONFIG_BEBIDAS,
};

/** Nombre de categoría sin acentos ni mayúsculas, para compararlo. */
const nombreCategoriaNormalizado = (s: string): string =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Configuración de una categoría: primero por id (1…3) y, si el id no
    está, por nombre normalizado (una categoría propia llamada "Pizzas"
    hereda la configuración de Pizza). `null` = sin configuración. */
export const configDeCategoria = (id: string, nombre?: string): ConfigCategoria | null => {
  if (id && CONFIG_CATEGORIA[id]) return CONFIG_CATEGORIA[id];
  const n = nombreCategoriaNormalizado(nombre ?? "");
  if (n.includes("pizza")) return CONFIG_PIZZA;
  if (n.includes("lasana")) return CONFIG_LASANA;
  if (n.includes("bebida")) return CONFIG_BEBIDAS;
  return null;
};
