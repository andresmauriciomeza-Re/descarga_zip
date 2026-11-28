export interface CategoriaProducto {
  id: string;
  nombre: string;
  /**
   * Emoji que representa a la categoría en el landing, en la tabla y en el
   * detalle. Viaja en la columna `emoji` de tb_categoria_productos (también
   * en las tres originales, ids 1, 2 y 3, que conservan su emoji de siempre).
   */
  icono?: string;
  /**
   * Activo / Inactivo. Opcional: el dato guardado antes de que existiera el
   * campo sigue siendo Activo (ver `estadoDe`). Una Inactiva sigue en este
   * listado, pero no se muestra en el landing ni en el selector de Categoría
   * de producto.
   */
  estado?: EstadoCategoria;
  /**
   * Texto libre para explicar qué agrupa la categoría (P17a). OPCIONAL y sin
   * validación: solo el nombre es obligatorio. No lo llevan las categorías
   * creadas antes de existir el campo.
   */
  descripcion?: string;
  /** Productos asociados, de cualquier estado (solo en la gestión). */
  totalProductos?: number;
  /** Productos que hoy salen en el menú público: los que se ocultan al
      inactivar la categoría (solo en la gestión). */
  productosMenu?: number;
}

export type EstadoCategoria = "Activo" | "Inactivo";

export const SERIF = "var(--font-titulo)";

// ─────────────────────────── CATEGORÍA PRODUCTO ───────────────────────────

/** Estado de una categoría, con el que no lo tiene todavía: Activo. */
export const estadoDe = (c?: CategoriaProducto): EstadoCategoria =>
  c?.estado ?? "Activo";
