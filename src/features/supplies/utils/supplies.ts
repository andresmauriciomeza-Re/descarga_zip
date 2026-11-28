export const PER_PAGE = 10;

export interface Insumo {
  id: string;
  nombre: string;
  unidadMedida: string;
  /** Peso/cantidad exacta del insumo en su unidad de medida (ej. 1200 g).
      Opcional en el modelo: los insumos antiguos lo tienen en NULL hasta
      que se editan. */
  pesoMedida?: number | null;
  costoUnitario: number;
  precioUnitario: number | null;
  iva: number | null;
  tipo: string;
  stockActual: number;
  stockMinimo: number;
  categoriaId: string;
  estado: "activo" | "inactivo";
  /** ── Datos legacy ────────────────────────────────────────────────
      La ficha técnica única (fichas.ts) es la fuente de verdad desde la
      unificación. Estos tres campos ya no se editan ni se sincronizan: quedan
      como el respaldo de los registros creados antes de la unificación y solo
      los lee el fallback de Orden de Producción para líneas muy viejas. */
  composicion?: ProductoInsumoInsumo[];
  descripcion?: string;
  /** Tiempo de preparación legacy, en minutos. Solo aplica a
      `tipo === "ProductoInsumo"`; las órdenes nuevas lo toman del snapshot de
      la ficha. */
  tiempoPreparacion?: number;
}

export interface ProductoInsumoInsumo {
  id: string;
  categoriaId: string;
  nombre: string;
  cantidad: number;
  unidadMedida: string;
}

/** A5.5 — Cómo está el stock de un insumo: "sin-stock" (0 o menos),
    "bajo" (mayor a 0 y hasta el stock mínimo) u "ok". El listado pinta el
    badge según esto: "Sin stock" en ROJO, "Stock bajo" en ÁMBAR; el aviso
    del listado y su filtro cuentan los dos primeros. */
export const estadoStock = (insumo: Insumo): "sin-stock" | "bajo" | "ok" =>
  insumo.stockActual <= 0
    ? "sin-stock"
    : insumo.stockActual <= insumo.stockMinimo
      ? "bajo"
      : "ok";

export const SERIF = "var(--font-titulo)";

// ─────────────────────────── Categorías ───────────────────────────
export interface CategoriaInsumo {
  id: string;
  nombre: string;
  /** Solo lo traen las categorías de la API: `false` = categoría inactiva (no
      aparece en los selectores, pero sí en los listados). */
  estado?: boolean;
}

/** Catálogo local de categorías (fase 1). Sigue aquí por si se abre la
    pantalla sin API, pero desde la fase 2 las categorías vienen de
    GET /categorias-insumos y llegan por props. */
export const CATEGORIAS_INSUMO: CategoriaInsumo[] = [
  { id: "CINS-001", nombre: "Lácteos" },
  { id: "CINS-002", nombre: "Carnes y Embutidos" },
  { id: "CINS-003", nombre: "Vegetales y Hierbas" },
  { id: "CINS-004", nombre: "Harinas y Masas" },
  { id: "CINS-005", nombre: "Salsas y Condimentos" },
];

export const INITIAL_INSUMOS: Insumo[] = [
  { id: "INS-001", nombre: "Queso Mozzarella", unidadMedida: "kg", costoUnitario: 18000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 25, stockMinimo: 10, categoriaId: "CINS-001", estado: "activo" },
  { id: "INS-003", nombre: "Pepperoni", unidadMedida: "kg", costoUnitario: 25000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 8, stockMinimo: 5, categoriaId: "CINS-002", estado: "activo" },
  { id: "INS-005", nombre: "Champiñones", unidadMedida: "kg", costoUnitario: 12000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 4, stockMinimo: 5, categoriaId: "CINS-003", estado: "activo" },
  { id: "INS-006", nombre: "Harina", unidadMedida: "kg", costoUnitario: 4500, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 40, stockMinimo: 20, categoriaId: "CINS-004", estado: "activo" },
  { id: "INS-007", nombre: "Agua", unidadMedida: "lt", costoUnitario: 400, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 120, stockMinimo: 40, categoriaId: "CINS-004", estado: "activo" },
  { id: "INS-008", nombre: "Aceite", unidadMedida: "lt", costoUnitario: 9000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 12, stockMinimo: 4, categoriaId: "CINS-004", estado: "activo" },
  { id: "INS-009", nombre: "Levadura", unidadMedida: "kg", costoUnitario: 12000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 2, stockMinimo: 1, categoriaId: "CINS-004", estado: "activo" },
  { id: "INS-010", nombre: "Aguacate", unidadMedida: "kg", costoUnitario: 9500, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 18, stockMinimo: 8, categoriaId: "CINS-003", estado: "activo" },
  { id: "INS-011", nombre: "Cebolla", unidadMedida: "kg", costoUnitario: 3500, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 6, stockMinimo: 3, categoriaId: "CINS-003", estado: "activo" },
  { id: "INS-012", nombre: "Limón", unidadMedida: "lt", costoUnitario: 5000, precioUnitario: null, iva: null, tipo: "Insumo", stockActual: 4, stockMinimo: 2, categoriaId: "CINS-003", estado: "activo" },
  // Productos Insumo: lo que Gloria prepara en lote, refrigera y consume la
  // cocina. Cada uno lleva su receta (`composicion`, cantidades POR 1 unidad),
  // su descripción de preparación y su tiempo. Son los únicos que una orden
  // "Preparación en lote" puede producir.
  {
    id: "PIN-001", nombre: "Guacamole", unidadMedida: "lt", costoUnitario: 0,
    precioUnitario: null, iva: null, tipo: "ProductoInsumo",
    stockActual: 8, stockMinimo: 5, categoriaId: "-", estado: "activo",
    composicion: [
      { id: "INS-010", categoriaId: "CINS-003", nombre: "Aguacate", cantidad: 2, unidadMedida: "kg" },
      { id: "INS-011", categoriaId: "CINS-003", nombre: "Cebolla", cantidad: 0.2, unidadMedida: "kg" },
      { id: "INS-012", categoriaId: "CINS-003", nombre: "Limón", cantidad: 0.1, unidadMedida: "lt" },
    ],
    descripcion: "1. Triturar aguacate con limón para que no se oxide.\n2. Agregar cebolla picada fina.\n3. Ajustar sal y cilantro al gusto.\n4. Guardar en recipiente cerrado, en refrigeración.",
    tiempoPreparacion: 25,
  },
  {
    id: "PIN-002", nombre: "Salsa de Tomate", unidadMedida: "lt", costoUnitario: 0,
    precioUnitario: null, iva: null, tipo: "ProductoInsumo",
    stockActual: 30, stockMinimo: 15, categoriaId: "-", estado: "activo",
    composicion: [
      { id: "INS-005", categoriaId: "CINS-003", nombre: "Champiñones", cantidad: 1, unidadMedida: "kg" },
    ],
    descripcion: "Cocinar a fuego lento y triturar",
    tiempoPreparacion: 45,
  },
  {
    id: "PIN-003", nombre: "Masa Pre-elaborada", unidadMedida: "und", costoUnitario: 0,
    precioUnitario: null, iva: null, tipo: "ProductoInsumo",
    stockActual: 4, stockMinimo: 20, categoriaId: "-", estado: "activo",
    composicion: [
      { id: "INS-006", categoriaId: "CINS-004", nombre: "Harina", cantidad: 0.5, unidadMedida: "kg" },
      { id: "INS-007", categoriaId: "CINS-004", nombre: "Agua", cantidad: 0.3, unidadMedida: "lt" },
      { id: "INS-008", categoriaId: "CINS-004", nombre: "Aceite", cantidad: 0.05, unidadMedida: "lt" },
      { id: "INS-009", categoriaId: "CINS-004", nombre: "Levadura", cantidad: 0.01, unidadMedida: "kg" },
    ],
    descripcion: "1. Mezclar harina, agua, aceite y levadura hasta que quede homogénea.\n2. Amasar 10 minutos.\n3. Reposar 30 minutos tapada en refrigeración.\n4. Formar discos de 250 g de yogur.\n5. Refrigerar. Rinde 1 unidad por preparación.",
    tiempoPreparacion: 60,
  },
];
