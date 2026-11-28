// ── Bloque 5: topes del carrito ──

/** Lo que el tope necesita saber de una línea del carrito: el producto, su
    tamaño y —si ya está en el carrito— su id, para excluir la línea de los
    consumos ajenos. `CartItem` lo cumple tal cual. */
export type LineaLimiteRef = {
  id?: string;
  product: { name: string };
  size?: string;
};

/** Tope de UNA línea del carrito (Bloque 5): `max` es el TOTAL de unidades
    que esa línea puede tener (undefined = sin límite), `elaborado` dice si
    es un producto insumo (para elegir el mensaje de máximo) y `stock` es el
    STOCK REAL del catálogo público SIN descontar el carrito (undefined = la
    API no lo envió). `stock` es lo que el menú pinta como "Agotado":
    `max === 0` también ocurre con stock > 0 cuando el carrito ya se llevó
    todas las unidades, y eso NO es agotado. */
export type LimiteLinea = { max: number | undefined; elaborado: boolean; stock?: number };

/** Mensaje exacto al llegar al máximo (Bloque 5, punto 4): tanto pizzas/
    lasañas (pre-hechas) como bebidas se limitan por su STOCK FÍSICO, así que
    ambos hablan de unidades disponibles. */
export const mensajeMaximoDe = (
  nombre: string,
  max: number,
  tamano: string | undefined,
  elaborado: boolean,
): string =>
  elaborado
  ? ["Mediana", "Grande"].includes(tamano ?? "")
    ? `Solo ${max === 1 ? "queda" : "quedan"} ${max} ${max === 1 ? "porción" : "porciones"} de ${nombre} ${tamano} ${max === 1 ? "disponible" : "disponibles"}`
    : `Solo quedan ${max} ${nombre}${tamano ? ` ${tamano}` : ""} disponibles`
    : `Máximo disponible: ${max}. No hay más unidades de ${nombre}`;

/** Cantidad ajustada al rango permitido: nunca baja de 1 y nunca pasa del
    máximo (si se pasa —escribiendo o sumando— se ajusta sola y el aviso lo
    dispara quien la recibe). `max` undefined = sin límite. */
export const ajustarCantidad = (cantidad: number, max?: number): number =>
  Math.min(
    Math.max(1, Math.round(cantidad) || 1),
    Math.max(1, max ?? Infinity),
  );

/** Bebida con poco stock (Bloque 5, punto 5): ≤10 disponibles ámbar,
    ≤5 rojo. Solo aplica a productos terminados. */
export const avisoStockBajoCls = (max: number): string =>
  max <= 5
    ? "bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400"
    : "bg-amber-100 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400";
