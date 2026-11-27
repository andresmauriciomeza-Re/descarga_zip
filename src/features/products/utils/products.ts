import type { EstadoProducto } from "@/shared/components/ProductStatus";
import { imagenEnApi } from "@/shared/utils/getImageUrl";
import type { FichaVersion } from "@/shared/utils/technicalSheets";

export type EstadoEntrega = "listo" | "entregado";

export interface ProductoTerminado {
  id: string;
  idReceta: string;
  nombreReceta: string;
  fechaEntrega: string;
  horaEntrega: string;
  cantidad: number;
  tamano: "Mediana" | "Grande";
  estadoEntrega: EstadoEntrega;
  recalentado?: boolean;
  fechaEntregaReal?: string;
}

// ─────────────────────────── GESTIÓN PRODUCTOS ───────────────────────────

/** Los DOS tipos de producto. Quien los define es la CATEGORÍA del producto
    (ver `CONFIG_CATEGORIA`): las que se elaboran con insumos y llevan ficha
    técnica son "Producto insumo" (pizzas, lasañas) y las que se revenden tal
    como se compran son "Producto terminado" (gaseosas) — mismo vocabulario que
    usa Orden de Producción. */
export const TIPOS_PRODUCTO = ["Producto insumo", "Producto terminado"] as const;

export type TipoProducto = (typeof TIPOS_PRODUCTO)[number];

export interface Producto {
  id: string;
  /** Imagen "portada": la que leen el menú público, las tarjetas, el carrito
      y Ver detalle. Se mantiene SIEMPRE sincronizada con la PRIMERA posición
      de `imagenes` (ver `sincronizarImagenes`), así el resto de la app que
      todavía usa el campo único no se rompe. */
  imagen: string;
  /** Lista de compatibilidad de imagen. Los datos antiguos pueden traer varias;
      la API y el formulario nuevo conservan una sola URL. */
  imagenes?: string[];
  nombre: string;
  idCategoria: string;
  tipo: TipoProducto;
  /** Costo de producir el producto. NO se escribe desde el formulario: el
      campo de precio escribe solo `precioUnitario` (costo y precio de venta
      son conceptos distintos y aquí no se mezclan). */
  // TODO: calcular desde los insumos de la ficha técnica vigente.
  costoUnitario: number;
  /** Precio de venta al público: lo que paga el cliente. Es el que muestran
      el listado, el Excel, Ver detalle y el menú público (tarjeta, detalle y
      carrito). En Bebidas ("Producto terminado") NO se escribe aquí: el precio
       se define en Compras. */
  precioUnitario: number;
  /** Precio por porción Grande para pizzas. */
  precioGrande?: number;
  /** Existencias de pizza por tamaño, expresadas en porciones. */
  stockMediana?: number;
  stockGrande?: number;
  stockPartes?: number;
  /** Nombre recibido del backend para que el catálogo local de categorías
      no pierda la categoría numérica de productos recién sincronizados. */
  categoriaNombre?: string;
  unidadVenta: string;
  /** Presentación de la bebida (ej. 400 ml, 1.5 L). Opcional en el modelo
      para no romper productos viejos de localStorage; en Crear es
      obligatorio para Bebidas. */
  contenido?: number;
  /** Unidad de `contenido`: "ml" o "L". */
  contenidoUnidad?: "ml" | "L";
  /** Ajuste de presentación de compra (sólo bebidas): cómo se COMPRA al
   *  proveedor — Unidad suelta ("und", por defecto), Paca o Caja. Las bebidas
   *  se VENDEN siempre sueltas (`unidadVenta` queda "und"). Opcional para no
   *  romper productos viejos de localStorage (se leen como "und"). */
  unidadCompra?: "und" | "paca" | "caja";
  /** Unidades que trae la paca/caja (ej. 12). Obligatorio y mayor que 1
   *  cuando `unidadCompra` es "paca" o "caja"; vacío/1 con "und". */
  unidadesPorEmpaque?: number;
  /** Ajuste: último monto de la paca/caja comprado SIN IVA y el % de IVA de
    *  esa línea. Los escribe `entradaCompra` al guardar la compra, y al
   *  volver a elegir el producto en Nueva compra / Orden de Compra /
   *  Recepción se precarga ese mismo monto (y ese %). Opcional: los productos
   *  sin historial (datos viejos) se precargan como siempre. */
  ultimoMontoSinIva?: number;
  ultimoIvaCompra?: number;
  /** Punto C1: último monto unitario digitado por el usuario en la compra de
    *  este producto, TAL CUAL (sin dividir por IVA; ej. 4000). Lo escribe la
    *  entrada de compra en la BD y, al volver a elegir el producto en Nueva
    *  Compra / Orden de Compra / Recepción, es lo que se precarga en
    *  "Monto unitario" (si existe, manda él sobre `ultimoMontoSinIva`).
    *  Opcional: los productos sin historial se precargan como siempre. */
  ultimoMontoDigitado?: number;
  stockDisponible: number;
  /** ¿La BD tiene los BYTES de la imagen (`tb_productos.imagen_data`)?
      Lo informa `GET /productos` y `GET /productos/gestion` como
      `imagen_data IS NOT NULL AS tiene_imagen` (el binario NUNCA viaja en el
      JSON). Si es true, el menú pide la imagen al backend con
      `imagenEnApi(id)` en vez de resolver el nombre de archivo local. */
  tieneImagen?: boolean;
  /** Stock que trajo el backend (`GET /productos`). `undefined` = la API no
      lo envió: el menú público y el carrito no limitan la cantidad (ver
      `productoApiAProducto` / `limiteStockDe`). No confundir con
      `stockDisponible`, que es el stock del panel (siempre un número). */
  stockApi?: number;
  estado: EstadoProducto;
}

/** La API almacena las URL de la galería (máx. 4: la primera es la
    portada del menú). */
export const MAX_IMAGENES = 4;

/** Imágenes de un producto como ARREGLO siempre: usa `imagenes` si existe;
    si no, la única `imagen` (dato viejo o de semilla). Es lo que pintan el
    indicador del listado y los formularios de Crear/Editar. */
export const imagenesDe = (p: {
  imagen: string;
  imagenes?: string[];
  id?: string;
  tieneImagen?: boolean;
}): string[] => {
  if (p.imagenes) return p.imagenes.filter((s) => typeof s === "string" && s.trim() !== "");
  if (p.imagen?.trim()) return [p.imagen];
  return p.tieneImagen && p.id ? [imagenEnApi(p.id)] : [];
};

export const fmtFechaFicha = (iso: string): string =>
  new Date(iso).toLocaleDateString("es-CO", {
    timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric",
  });

/** Rango de vigencia de una versión: "12/09/2026 – 20/09/2026" o, si es la
    vigente (sin fechaFin), "12/09/2026 – vigente". */
export const rangoVersion = (v: FichaVersion): string =>
  `${fmtFechaFicha(v.fechaInicio)} – ${v.fechaFin ? fmtFechaFicha(v.fechaFin) : "vigente"}`;
