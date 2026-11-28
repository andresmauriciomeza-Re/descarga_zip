/** Colores del pill de estado de la tabla. Incluye los valores del tipo
    (`disponible`/`no disponible`, con el que nacen los productos) y los del
    desplegable (`activo`/`agotado`/`pausado`), que es lo que hoy se puede
    elegir en Manage Products. */
export const PROD_STATUS_COLOR: Record<string, string> = {
  disponible: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  "no disponible": "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  activo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  agotado: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  pausado: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
};

export const PROD_STATUS_LABEL: Record<string, string> = {
  disponible: "Activo",
  "no disponible": "No disponible",
  activo: "Activo",
  agotado: "Agotado",
  pausado: "Pausado",
};

/** Estados que ofrece el desplegable (los de siempre de Manage Products). */
export const PROD_STATUS_OPCIONES = ["activo", "agotado", "pausado"] as const;
