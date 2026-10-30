import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  AlertCircle,
  Check,
  ChevronDown,
  // Icono del indicador de imágenes múltiples del listado (P13).
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { FichaTecnicaDetalle, FichaTecnicaEditor } from "@/shared/components/FichaTecnicaEditor";
import {
  copiarFicha,
  emptyFichaVersion,
  fichaTieneCambios,
  numeroNuevoFicha,
  siguienteNumeroFicha,
  type FichaVersion,
  type FichasPorProducto,
  type PorcionesTamano,
} from "@/shared/utils/fichas";
// Cálculo de disponibilidad compartido con Orden de Producción: un Producto
// insumo no tiene stock propio, así que la celda Stock, Ver detalle y el
// Excel leen cuántas unidades admite preparar SU FICHA con el stock real de
// Insumos (mismo código que usan para validar y descontar al iniciar).
import {
  detalleDisponibilidad,
  fmtCant,
  motivoFaltante,
} from "@/shared/utils/disponibilidad";
import { BotonDescargarExcel } from "@/shared/components/BotonDescargarExcel";
import { Paginador } from "@/shared/components/Paginador";
import { exportarExcelEstilizado } from "@/shared/utils/exportExcelEstilizado";
import { ConfirmDeleteModal } from "@/shared/components/ConfirmDeleteModal";
import {
  EstadoBadge,
  ESTADOS_PRODUCTO,
  ESTADO_COLORES,
  type EstadoProducto,
} from "@/shared/components/EstadoProducto";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useSubirArchivo } from "@/shared/hooks/useSubirArchivo";
import { SearchInput } from "@/shared/components/SearchInput";
import { ActionIcons } from "@/shared/components/ActionIcons";
import type { Insumo } from "@/features/insumos/pages/GestionInsumosScreen";
import { estadoDe, type CategoriaProducto } from "@/features/categoria-productos/pages/CategoriaProductoScreen";
// Bloque 2.3: las reglas de una bebida (nombre único, contenido ml/L y
// unidades por paca/caja) viven en `erroresBebida`, compartido con el
// "+ Crear producto" de Compras — una sola copia de la validación.
import { erroresBebida } from "@/features/productos/components/CrearProductoModal";
import {
  CONFIG_CATEGORIA,
  configDeCategoria,
  type ConfigCategoria,
} from "@/shared/utils/configCategoria";
import { nombreBuscable, presentacionDe } from "@/shared/utils/presentacion";
// Bloque 1.1: una sola función para comparar nombres (sin tildes, mayúsculas
// ni espacios de más) compartida con Insumos y Compras.
import { mismoNombre, nombreLimpio, normalizarTexto } from "@/shared/utils/nombres";
import {
  mensajeErrorProductos,
  type EstadoProductoManual,
} from "@/features/productos/services/productosApi";
// Bloque 4: las fichas de producto se guardan contra la API (POST /fichas) y
// las guardadas en local (respaldo fase 1) se suben con "Subir ficha guardada".
import {
  crearFicha,
  leerFichasRespaldoFase1,
  mapearFichaApi,
  obtenerFichasDe,
  payloadFicha,
} from "@/features/productos/services/fichasApi";
import { idInsumoApiDesdeFront } from "@/shared/utils/fichas";

export { CONFIG_CATEGORIA, configDeCategoria } from "@/shared/utils/configCategoria";
export type { ConfigCategoria } from "@/shared/utils/configCategoria";

const SERIF = "var(--font-titulo)";
const MONO = "var(--font-texto)";

// ─────────────────────────── GESTIÓN PRODUCTOS ───────────────────────────

/** Los DOS tipos de producto. Quien los define es la CATEGORÍA del producto
    (ver `CONFIG_CATEGORIA`): las que se elaboran con insumos y llevan ficha
    técnica son "Producto insumo" (pizzas, lasañas) y las que se revenden tal
    como se compran son "Producto terminado" (gaseosas) — mismo vocabulario que
    usa Orden de Producción. */
export const TIPOS_PRODUCTO = ["Producto insumo", "Producto terminado"] as const;
export type TipoProducto = (typeof TIPOS_PRODUCTO)[number];

// ── Umbrales de stock bajo (SOLO bebidas / Producto terminado) ──────────────
// El profesor pidió 10 y 5 unidades. Viven en UN solo lugar para que el
// listado, "Ver detalle" y los tooltips no puedan divergir: se reemplazan los
// umbrales viejos (15 y 5). Productos Insumo (pizzas, lasañas) NO usan esto:
// ellos no tienen stock propio.
const STOCK_BAJO = 10;
const STOCK_CRITICO = 5;

/** Estado del stock de una bebida: color (con variante para modo oscuro) y la
    etiqueta que lo acompaña. 0 → "Agotado"; ≤ 5 → "Stock crítico" en rojo;
    ≤ 10 → "Stock bajo" en amarillo; más de 10 → verde sin etiqueta. */
const estadoStockBebida = (n: number): { cls: string; etiqueta: string } =>
  n <= 0
    ? { cls: "text-red-600 dark:text-red-400", etiqueta: "Agotado" }
    : n <= STOCK_CRITICO
      ? { cls: "text-red-600 dark:text-red-400", etiqueta: "Stock crítico" }
      : n <= STOCK_BAJO
        ? { cls: "text-yellow-600 dark:text-yellow-400", etiqueta: "Stock bajo" }
        : { cls: "text-emerald-600 dark:text-emerald-400", etiqueta: "" };

/** Texto explicativo de cada tipo, para los `title` de las pastillas y las
    líneas de ayuda bajo el selector de categoría. */
export const descTipo = (t: TipoProducto): string =>
  t === TIPOS_PRODUCTO[0]
    ? "Producto insumo: se elabora con insumos y lleva ficha técnica"
    : "Producto terminado: se revende tal como se compra, sin ficha";

/** Tipo del producto. Manda la categoría configurada (`configDeCategoria`),
    porque es ella quien define el tipo; si no tiene configuración, lo guardado
    cuando ya está en el vocabulario nuevo. El dato viejo "Producto de reventa"
    se traduce al índice 1 (el tipo sin ficha) y cualquier otro valor antiguo
    ("Producto") cae al respaldo por nombre y, sin configuración, al tipo sin
    ficha. `nombreCategoria` es el nombre visible de la categoría y habilita el
    respaldo por nombre. */
export const tipoDe = (
  p: {
    idCategoria: string;
    tipo?: TipoProducto | "Producto de reventa" | "Producto";
  },
  nombreCategoria?: string,
): TipoProducto => {
  const cfg = configDeCategoria(p.idCategoria, nombreCategoria);
  if (cfg) return cfg.tipo;
  if (p.tipo === TIPOS_PRODUCTO[0] || p.tipo === TIPOS_PRODUCTO[1]) return p.tipo;
  // Dato viejo ("Producto de reventa", "Producto"): tipo sin ficha (índice 1).
  return TIPOS_PRODUCTO[1];
};

/** Pastilla de color por tipo (índice, detalle, Crear/Editar). */
export const tipoPillCls = (t: TipoProducto): string =>
  t === TIPOS_PRODUCTO[0]
    ? "bg-orange-100 text-orange-800"
    : "bg-sky-100 text-sky-800";

// Los estados y sus colores viven en components/EstadoProducto.tsx (de ahí
// salen EstadoBadge y EstadoProductoSelect). Se reexportan para no romper
// importaciones existentes.
export { ESTADOS_PRODUCTO, ESTADO_COLORES } from "@/shared/components/EstadoProducto";
export type { EstadoProducto } from "@/shared/components/EstadoProducto";

/** Clases Tailwind del pill de estado de la tabla (diseño de Proveedores),
    con el mismo tono de ESTADO_COLORES y su variante dark translúcida. */
const ESTADO_PRODUCTO_CLASES: Record<EstadoProducto, string> = {
  Disponible: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  "No disponible": "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
  Descontinuado: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
};

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
  /** Precio especial de la pizza Grande; sin valor usa el recargo configurado. */
  precioGrande?: number;
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

/** La API almacena una URL de imagen por producto. */
export const MAX_IMAGENES = 1;

/** Imágenes de un producto como ARREGLO siempre: usa `imagenes` si existe;
    si no, la única `imagen` (dato viejo o de semilla). Es lo que pintan el
    indicador del listado y los formularios de Crear/Editar. */
export const imagenesDe = (p: { imagen: string; imagenes?: string[] }): string[] => {
  const lista = (p.imagenes ?? []).filter((s) => typeof s === "string" && s.trim() !== "");
  if (lista.length > 0) return lista;
  return p.imagen && p.imagen.trim() !== "" ? [p.imagen] : [];
};

/** Normaliza las imágenes al GUARDAR: quita vacías, respeta MAX_IMAGENES y
    sincroniza `imagen` = primera imagen. Ese es el contrato de compatibilidad
    del modelo nuevo con el campo único: el menú público y las tarjetas siguen
    leyendo `imagen` y ven la portada (la primera de la lista). */
export const sincronizarImagenes = <
  T extends { imagen: string; imagenes?: string[] },
>(
  p: T,
): T => {
  const lista = imagenesDe(p).slice(0, MAX_IMAGENES);
  return { ...p, imagenes: lista, imagen: lista[0] ?? "" };
};

const CATEGORIAS_PRODUCTO = [
  { id: "CAT-001", nombre: "Pizzas" },
  { id: "CAT-002", nombre: "Lasañas" },
  { id: "CAT-003", nombre: "Bebidas" },
];

export const INITIAL_PRODUCTOS: Producto[] = [
  // ── Pizzas (CAT-001): $14.000 pequeña, $16.000 grande ──
  // Las `imagen` apuntan a archivos EXISTENTES de src/assets/img (los .webp
  // del menú); antes usaban .png que ya no existen (o capturas de pantalla),
  // así la semilla local mostraba imágenes rotas.
  {
    id: "PROD-001",
    imagen: "/src/assets/img/pizza_peperoni.webp",
    nombre: "Pizza Peperoni",
    idCategoria: "CAT-001",
    tipo: TIPOS_PRODUCTO[0],
    costoUnitario: 14000, precioUnitario: 14000,
    unidadVenta: "und",
    stockDisponible: 50,
    estado: "Disponible",
  },
  {
    id: "PROD-002",
    imagen: "/src/assets/img/pizza_jamon_queso.webp",
    nombre: "Pizza Jamon",
    idCategoria: "CAT-001",
    tipo: TIPOS_PRODUCTO[0],
    costoUnitario: 14000, precioUnitario: 14000,
    unidadVenta: "und",
    stockDisponible: 45,
    estado: "Disponible",
  },
  {
    id: "PROD-003",
    imagen: "/src/assets/img/pizza_hawaii.webp",
    nombre: "Pizza Hawaiana",
    idCategoria: "CAT-001",
    tipo: TIPOS_PRODUCTO[0],
    costoUnitario: 14000, precioUnitario: 14000,
    unidadVenta: "und",
    stockDisponible: 40,
    estado: "Disponible",
  },
  {
    id: "PROD-004",
    imagen: "/src/assets/img/pizza_pollo.webp",
    nombre: "Pizza Pollo",
    idCategoria: "CAT-001",
    tipo: TIPOS_PRODUCTO[0],
    costoUnitario: 14000, precioUnitario: 14000,
    unidadVenta: "und",
    stockDisponible: 35,
    estado: "Disponible",
  },
  {
    id: "PROD-005",
    imagen: "/src/assets/img/pizza_cañon.webp",
    nombre: "Pizza Cañon",
    idCategoria: "CAT-001",
    tipo: TIPOS_PRODUCTO[0],
    costoUnitario: 14000, precioUnitario: 14000,
    unidadVenta: "und",
    stockDisponible: 30,
    estado: "Disponible",
  },
  {
    id: "PROD-006",
    imagen: "/src/assets/img/pizza_maicitos.webp",
    nombre: "Pizza Maicitos",
    idCategoria: "CAT-001",
    tipo: TIPOS_PRODUCTO[0],
    costoUnitario: 14000, precioUnitario: 14000,
    unidadVenta: "und",
    stockDisponible: 60,
    estado: "Disponible",
  },
  {
    id: "PROD-007",
    imagen: "/src/assets/img/pizza_carnes.webp",
    nombre: "Pizza Paisa",
    idCategoria: "CAT-001",
    tipo: TIPOS_PRODUCTO[0],
    costoUnitario: 14000, precioUnitario: 14000,
    unidadVenta: "und",
    stockDisponible: 25,
    estado: "Disponible",
  },
  {
    id: "PROD-008",
    imagen: "/src/assets/img/pizza_tocineta.webp",
    nombre: "Pizza Tocineta",
    idCategoria: "CAT-001",
    tipo: TIPOS_PRODUCTO[0],
    costoUnitario: 14000, precioUnitario: 14000,
    unidadVenta: "und",
    stockDisponible: 40,
    estado: "Disponible",
  },
  // ── Lasañas (CAT-002) ──
  {
    id: "PROD-009",
    imagen: "/src/assets/img/lasaña_carne.webp",
    nombre: "Lasaña Carne",
    idCategoria: "CAT-002",
    tipo: TIPOS_PRODUCTO[0],
    costoUnitario: 20000, precioUnitario: 20000,
    unidadVenta: "und",
    stockDisponible: 30,
    estado: "Disponible",
  },
  {
    id: "PROD-010",
    imagen: "/src/assets/img/lasaña_pollo.webp",
    nombre: "Lasaña Pollo",
    idCategoria: "CAT-002",
    tipo: TIPOS_PRODUCTO[0],
    costoUnitario: 20000, precioUnitario: 20000,
    unidadVenta: "und",
    stockDisponible: 25,
    estado: "Disponible",
  },
  {
    id: "PROD-011",
    imagen: "/src/assets/img/lasaña_mixta.webp",
    nombre: "Lasaña Mixta",
    idCategoria: "CAT-002",
    tipo: TIPOS_PRODUCTO[0],
    costoUnitario: 22000, precioUnitario: 22000,
    unidadVenta: "und",
    stockDisponible: 20,
    estado: "Disponible",
  },
  // ── Bebidas (CAT-003) ──
  {
    id: "PROD-012",
    imagen: "/src/assets/img/Quatro.webp",
    nombre: "Gaseosa Cuatro",
    idCategoria: "CAT-003",
    tipo: TIPOS_PRODUCTO[1],
    costoUnitario: 3000, precioUnitario: 3000,
    unidadVenta: "und",
    stockDisponible: 100,
    estado: "Disponible",
  },
  {
    id: "PROD-013",
    imagen: "/src/assets/img/Premio.webp",
    nombre: "Gaseosa Premium",
    idCategoria: "CAT-003",
    tipo: TIPOS_PRODUCTO[1],
    costoUnitario: 3500, precioUnitario: 3500,
    unidadVenta: "und",
    stockDisponible: 80,
    estado: "Disponible",
  },
  {
    id: "PROD-014",
    imagen: "/src/assets/img/Coca-Cola.webp",
    nombre: "Gaseosa Coca-Cola",
    idCategoria: "CAT-003",
    tipo: TIPOS_PRODUCTO[1],
    costoUnitario: 2500, precioUnitario: 2500,
    unidadVenta: "und",
    stockDisponible: 120,
    estado: "Disponible",
  },
  {
    id: "PROD-015",
    imagen: "/src/assets/img/Pepsi.webp",
    nombre: "Gaseosa Pepsi",
    idCategoria: "CAT-003",
    tipo: TIPOS_PRODUCTO[1],
    costoUnitario: 2500, precioUnitario: 2500,
    unidadVenta: "und",
    stockDisponible: 100,
    estado: "Disponible",
  },
];

// ─────────────────────────── Modelo de la ficha técnica ───────────────────────────
// El modelo único vive en `@/shared/utils/fichas` (lo comparten este módulo,
// Compras > Insumos y el componente FichaTecnicaEditor). Aquí solo se
// reexportan los símbolos que ya importaban App y Orden de Producción.
export { INITIAL_FICHAS, normalizarIdsFicha } from "@/shared/utils/fichas";
export type { FichaVersion, FichasPorProducto } from "@/shared/utils/fichas";

/** Etiqueta del tamaño único de una ficha cuya categoría no está en
    CONFIG_CATEGORIA: una sola fila con la etiqueta fija "Único" (solo se
    editan sus porciones). */
const TAMANO_UNICO = "Único";

/** Filas de "Porciones por tamaño" de una categoría: las que define
    CONFIG_CATEGORIA (con sus porciones precargadas) o, sin configuración,
    la fila única "Único" con 1 porción. */
const filasTamanoDe = (cfg: ConfigCategoria | null): PorcionesTamano[] =>
  cfg?.tamanos ? cfg.tamanos.map((f) => ({ ...f })) : [{ tamano: TAMANO_UNICO, porciones: 1 }];

/** Las etiquetas fijas que recibe `FichaTecnicaEditor.tamanoFijo` para una
    categoría (el orden de CONFIG_CATEGORIA o ["Único"]). */
const tamanoFijoDe = (cfg: ConfigCategoria | null): string[] =>
  filasTamanoDe(cfg).map((f) => f.tamano);

/** Borrador de la ficha en Crear: v1 vacía con las filas de tamaño de la
    categoría elegida (o "Único" si todavía no hay categoría). El resto de
    pantallas sigue usando `emptyFichaVersion`. */
const nuevoBorradorFicha = (cfg: ConfigCategoria | null = null): FichaVersion => {
  const filas = filasTamanoDe(cfg);
  return { ...emptyFichaVersion(1), porcionesPorTamano: filas, porciones: filas[0].porciones };
};

/** Ajusta las filas de tamaño de un BORRADOR a la categoría elegida:
    el resultado tiene EXACTAMENTE las etiquetas de CONFIG_CATEGORIA (una
    fila "Normal" de pizza desaparece, por ejemplo) conservando las
    porciones cuya etiqueta siga existiendo y completando las que falten con
    el valor por defecto; `porciones` (la que leen Detalle, el stock y
    Orden de Producción) sigue siendo la PRIMERA fila. Fuera de
    CONFIG_CATEGORIA colapsa a la fila única "Único" con la etiqueta fija.
    Solo se aplica a borradores: las versiones guardadas no se tocan. */
const ajustarFilasTamano = (v: FichaVersion, cfg: ConfigCategoria | null): FichaVersion => {
  const actuales = v.porcionesPorTamano ?? [];
  if (cfg?.tamanos) {
    const filas = cfg.tamanos.map((d) => actuales.find((a) => a.tamano === d.tamano) ?? { ...d });
    return { ...v, porcionesPorTamano: filas, porciones: filas[0].porciones };
  }
  if (cfg) {
    // Reventa (Bebidas): la ficha no se muestra, las filas quedan intactas.
    return v;
  }
  // Sin configuración: fila única "Único" (etiqueta fija); las porciones de
  // la primera fila actual se conservan.
  const unica: PorcionesTamano = { tamano: TAMANO_UNICO, porciones: actuales[0]?.porciones ?? 1 };
  return { ...v, porcionesPorTamano: [unica], porciones: unica.porciones };
};

/** Regla mínima de una ficha de Producto insumo: al menos un insumo y
    porciones >= 1 (en el campo único y en cada fila por tamaño). */
const fichaCumpleMinimo = (v: FichaVersion): boolean =>
  v.insumos.length > 0 &&
  v.porciones >= 1 &&
  (v.porcionesPorTamano ?? []).every((f) => f.porciones >= 1);

/** Indica si un borrador de ficha tiene contenido real que valga la pena
    guardar (sirve para Crear, donde la ficha es opcional al crear). */
const fichaConContenido = (v: FichaVersion): boolean =>
  v.insumos.length > 0 || v.tiempoPreparacion > 0 || v.porciones > 1 || v.pasos.length > 0;

const fmtFechaFicha = (iso: string): string =>
  new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Rango de vigencia de una versión: "12/09/2026 – 20/09/2026" o, si es la
    vigente (sin fechaFin), "12/09/2026 – vigente". */
const rangoVersion = (v: FichaVersion): string =>
  `${fmtFechaFicha(v.fechaInicio)} – ${v.fechaFin ? fmtFechaFicha(v.fechaFin) : "vigente"}`;

/** Selector de versiones de la ficha: pastillas con clic que muestran el
    número y el rango de fechas de cada versión. */
function VersionPills({
  versiones,
  activo,
  onSelect,
}: {
  versiones: FichaVersion[];
  /** Índice seleccionado dentro de `versiones`; -1 cuando lo activo es el
      borrador (pantalla Editar), que se pinta aparte. */
  activo: number;
  onSelect: (idx: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {versiones.map((v, i) => (
        <button
          key={v.version}
          type="button"
          onClick={() => onSelect(i)}
          title={rangoVersion(v)}
          className={`flex flex-col items-start px-3 py-1 rounded-lg cursor-pointer transition-colors ${
            i === activo ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-border"
          }`}
        >
          <span className="text-xs font-bold leading-tight">v{v.version}</span>
          <span className={`text-[10px] leading-tight ${i === activo ? "text-white/80" : ""}`}>
            {rangoVersion(v)}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Campo de imagen única del producto: una casilla —la portada— más el alta con
 * "Subir archivo" (fila completa) y, debajo, una fila con la URL y "Agregar
 * imagen". Al llegar al límite los controles y las casillas vacías quedan
 * atenuados. Las casillas vacías son decorativas: no cargan ni quitan nada.
 * En solo lectura (Ver detalle) solo se pinta la cuadrícula; sin fotos no se
 * pinta nada.
 */
function CampoImagenes({
  imagenes,
  onChange,
  readOnly = false,
  inputCls,
  llenarAlto = false,
}: {
  imagenes: string[];
  onChange: (imgs: string[]) => void;
  readOnly?: boolean;
  /** Clase del input de URL (la del formulario que lo usa: Crear usa iCls y
      FormFields usa inputCls). */
  inputCls: string;
  /** Dos columnas con la ficha visible (solo Crear lo activa ahora): la
      cuadrícula crece en alto para que la tarjeta empareje el fondo con la de
      la derecha. Con columna única o en móvil no hay alto libre y las casillas
      se quedan en su mínimo (el alto actual). */
  llenarAlto?: boolean;
}) {
  // URL pendiente de agregar. Estado propio para no tener que escribir en el
  // producto mientras se teclea (antes el input escribía `imagen` en vivo).
  const [url, setUrl] = useState("");
  const { subir, subiendo } = useSubirArchivo();
  const completa = imagenes.length >= MAX_IMAGENES;

  const agregar = (valor: string) => {
    const v = valor.trim();
    if (!v) return;
    if (completa) {
      toast.error(`Un producto admite máximo ${MAX_IMAGENES} imágenes`);
      return;
    }
    onChange([...imagenes, v]);
    setUrl("");
  };

  // Solo lectura (Ver detalle): sin controles y sin fotos no se pinta nada.
  if (readOnly && imagenes.length === 0) return null;

  const casillas = Array.from({ length: MAX_IMAGENES }, (_, i) => i);
  // Con `llenarAlto` las casillas bajan su alto a un MÍNIMO (el actual) y
  // estiran con la rejilla; sin él, alto fijo como siempre.
  const altoCasilla = llenarAlto ? "min-h-24" : "h-24";

  return (
    <div className={llenarAlto ? "flex flex-col h-full" : ""}>
      {/* La casilla muestra la foto (portada); si está vacía es decorativa y queda atenuada en
          solo lectura o al estar el límite alcanzado. */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${llenarAlto ? "flex-1" : ""}`}>
        {casillas.map((idx) => {
          const src = imagenes[idx];
          const esPortada = idx === 0;
          if (src) {
            return (
              <div
                key={`imagen-${idx}`}
                className={`relative ${altoCasilla} rounded-xl overflow-hidden bg-muted border border-border ${
                  esPortada ? "ring-2 ring-primary" : ""
                }`}
              >
                {/* La foto va absoluta para no aportar alto intrínseco: la
                    casilla crece solo con la rejilla (llenarAlto). */}
                <img src={src} alt={`Imagen ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                {esPortada && (
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-black/60 text-[10px] font-semibold text-white">
                    Portada
                  </span>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    title="Quitar imagen"
                    onClick={() => onChange(imagenes.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          }
          return (
            <div
              key={`vacia-${idx}`}
              className={`${altoCasilla} rounded-xl flex items-center justify-center ${
                esPortada
                  ? "bg-primary/10 border border-primary/40"
                  : "border border-dashed border-border"
              } ${readOnly || completa ? "opacity-40" : ""}`}
            >
              {esPortada ? (
                <span className="px-1.5 py-0.5 rounded-md bg-primary/15 text-[10px] font-semibold text-primary">
                  Portada
                </span>
              ) : (
                <Plus className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>
      {!readOnly && (
        <>
          {/* Fila 1: alta desde el equipo, a ancho completo. */}
          <label
            className={`flex w-full items-center justify-center gap-1.5 mt-2 px-3 py-2 bg-muted border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-border cursor-pointer transition-colors ${
              completa || subiendo ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            {subiendo ? "Subiendo..." : "Subir archivo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={subiendo || completa}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) {
                  void subir(file, "productos").then((nuevaUrl) => {
                    if (nuevaUrl) agregar(nuevaUrl);
                  });
                }
              }}
            />
          </label>
          {/* Fila 2: pegar una URL y agregarla. */}
          <div className="flex gap-2 mt-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && agregar(url)}
              placeholder="Pega una URL de imagen..."
              className={`flex-1 min-w-0 ${inputCls}`}
            />
            <button
              type="button"
              onClick={() => agregar(url)}
              disabled={completa || !url.trim()}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar imagen
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {imagenes.length}/{MAX_IMAGENES} imágenes · la primera es la portada del menú
          </p>
        </>
      )}
    </div>
  );
}

/** Indicador de cuántas imágenes tiene un producto, en la segunda línea de la
    columna Nombre del listado (P13). Va debajo del nombre (y no a su lado)
    para no ensanchar la columna ni recortar el nombre. Sin imágenes no se
    pinta nada, para dejar intactas las filas de los productos de antes. */
function BadgeImagenes({ p }: { p: Producto }) {
  const n = imagenesDe(p).length;
  if (n === 0) return null;
  return (
    <span
      className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground whitespace-nowrap"
      title={`${n} ${n === 1 ? "imagen" : "imágenes"} del producto · la primera es la portada`}
    >
      <ImageIcon className="w-3 h-3" />
      {n} {n === 1 ? "imagen" : "imágenes"}
    </span>
  );
}

/** Sección con estilo de tarjeta (Opción A): fondo `bg-card`, borde y esquinas
    redondeadas, con el título a la izquierda y un slot opcional a la derecha
    (`acciones`: pastillas de versión, badges…). El contenido scrollea dentro
    de la tarjeta solo con `scrollInterno` (columna derecha); `footer` queda
    FUERA de ese scroll, siempre visible. En la columna izquierda las tarjetas
    se apilan sin scroll propio (scrollea la columna). */
function Tarjeta({
  titulo,
  acciones,
  children,
  footer,
  scrollInterno = false,
  className = "",
}: {
  titulo: string;
  acciones?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollInterno?: boolean;
  className?: string;
}) {
  return (
    <section className={`bg-card border border-border rounded-2xl flex flex-col ${className}`}>
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-5 pt-4 pb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{titulo}</p>
        {acciones}
      </div>
      {/* `flex-1` siempre: en tarjetas de alto natural no cambia nada (el
          mínimo automático la fija al contenido) y en la tarjeta estirada
          (Imágenes con `llenarAlto`) permite que el contenido llene el fondo. */}
      <div className={`px-4 sm:px-5 pb-4 flex-1 ${scrollInterno ? "min-h-0 overflow-y-auto pt-3" : ""}`}>
        {children}
      </div>
      {footer && <div className="shrink-0 border-t border-border px-4 sm:px-5 py-3">{footer}</div>}
    </section>
  );
}

/** Tarjeta "Imágenes del producto": le da a `CampoImagenes` el mismo marco que
    el resto de secciones. En solo lectura (Ver detalle) solo se pinta cuando
    hay al menos una imagen: decide el que la llama. */
function TarjetaImagenes({
  imagenes,
  onChange,
  readOnly = false,
  inputCls,
  llenarAlto = false,
}: {
  imagenes: string[];
  onChange: (imgs: string[]) => void;
  readOnly?: boolean;
  inputCls: string;
  /** Dos columnas con ficha visible (solo Crear ahora): la tarjeta crece
      (grow, sin encogerse) hasta el fondo y las casillas estiran su alto. */
  llenarAlto?: boolean;
}) {
  return (
    <Tarjeta titulo="Imágenes del producto" className={llenarAlto ? "grow shrink-0" : ""}>
      <CampoImagenes
        imagenes={imagenes}
        onChange={onChange}
        readOnly={readOnly}
        inputCls={inputCls}
        llenarAlto={llenarAlto}
      />
    </Tarjeta>
  );
}

/** Pregunta "¿Tiene ficha técnica?" de las categorías SIN configuración en
    `CONFIG_CATEGORIA`. Va SIEMPRE como hijo directo de la cuadrícula de
    `FormFields` (por eso trae `sm:col-span-2`). `error` es la validación de
    Crear; `bloqueada` impide responder en Editar cuando ya hay historial. */
function PreguntaTieneFicha({
  valor,
  onElegir,
  error = "",
  bloqueada = false,
}: {
  valor: "si" | "no" | null;
  onElegir: (v: "si" | "no") => void;
  error?: string;
  bloqueada?: boolean;
}) {
  return (
    <div className="sm:col-span-2 mt-1">
      <label className="block text-xs font-semibold text-muted-foreground mb-0.5">
        ¿Tiene ficha técnica? *
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        {(["si", "no"] as const).map((op) => (
          <button
            key={op}
            type="button"
            disabled={bloqueada}
            title={bloqueada ? "Este producto ya tiene historial de ficha técnica" : undefined}
            onClick={() => onElegir(op)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              valor === op
                ? "bg-primary text-white border-primary"
                : "bg-muted text-muted-foreground border-border hover:bg-border"
            } ${bloqueada ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {op === "si" ? "Sí" : "No"}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-500 mt-1 leading-tight">{error}</p>}
      {bloqueada && (
        <p className="text-[11px] text-muted-foreground mt-1 italic">
          Bloqueado: el producto ya tiene historial de ficha técnica.
        </p>
      )}
    </div>
  );
}

/** Precio de venta: un 0 no se muestra (evitaba el "06767" del valor inicial
    con `type="number"`) y ocupa su lugar el placeholder "$ 0". El dato sigue
    siendo un número al guardar: vaciar el campo escribe 0. */
function CampoPrecio({
  valor,
  onCambio,
  readOnly = false,
  cls,
}: {
  valor: number;
  onCambio: (n: number) => void;
  readOnly?: boolean;
  cls: string;
}) {
  return (
    <input
      type="number"
      value={valor === 0 ? "" : valor}
      placeholder="$ 0"
      onChange={(e) => onCambio(Number(e.target.value))}
      readOnly={readOnly}
      className={cls}
    />
  );
}

/** Una cifra de "se pueden preparar": las pizzas llevan una por tamaño
    (Mediana y Grande) y las lasañas o cualquier ficha sin tamaños, una sola. */
type CifraPrep = {
  tamano?: string;
  cantidad: number;
  /** Texto completo del insumo que limita ("Queso mozzarella (hay 2 kg en
      Insumos)"): es lo que va en el tooltip y en el "No alcanza" detallado. */
  limitante?: string;
  /** true cuando ESTE tamaño se queda en 0: ahí el mensaje va en rojo y
      dice "No alcanza"; si no, gris y "Limita". */
  agotado: boolean;
  /** Nombres de los insumos que marcan el mínimo de ESTE tamaño (con empate
      puede haber más de uno). */
  limita: string[];
};

/** Una fila del desglose de `detalleDisponibilidad` (Ver detalle, B3). */
type FilaDetalle = ReturnType<typeof detalleDisponibilidad>["filas"][number];

export function GestionProductosScreen({
  productos,
  setProductos,
  insumos,
  fichas: fichasExternas,
  setFichas: setFichasExternas,
  categorias,
  cargandoProductos = false,
  errorProductos,
  onReintentarCarga,
  onCrearEnServidor,
  onEditarEnServidor,
  onCambiarEstadoEnServidor,
  onDescontinuarEnServidor,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canExportExcel = true,
}: {
  productos: Producto[];
  setProductos: React.Dispatch<React.SetStateAction<Producto[]>>;
  /** Catálogo real del módulo Compras > Insumos: solo lectura, para el buscador. */
  insumos: Insumo[];
  /** Fichas técnicas. Las guarda App porque Orden de Producción las necesita
      para saber qué insumos consume cada plato de un pedido. */
  fichas: FichasPorProducto;
  setFichas: React.Dispatch<React.SetStateAction<FichasPorProducto>>;
  /** Categorías del módulo Categoría de Productos: alimentan el selector de
      Categoría (sin las Inactivas) y el nombre que se muestra en la lista.
      Si no llega, se usa la lista local de las tres originales. */
  categorias?: CategoriaProducto[];
  cargandoProductos?: boolean;
  errorProductos?: string | null;
  onReintentarCarga?: () => void;
  onCrearEnServidor?: (producto: Producto) => Promise<Producto>;
  onEditarEnServidor?: (producto: Producto) => Promise<Producto>;
  onCambiarEstadoEnServidor?: (id: string, estado: EstadoProductoManual) => Promise<Producto>;
  onDescontinuarEnServidor?: (id: string) => Promise<Producto>;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExportExcel?: boolean;
}) {
  const opcionesCategoriaBase = categorias ?? CATEGORIAS_PRODUCTO;
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"Todos" | TipoProducto>("Todos");
  const [filtroEstado, setFiltroEstado] = useState<"Todos" | EstadoProducto>("Todos");
  // Aviso de stock bajo: al apretar el aviso el listado queda mostrando SOLO
  // esas bebidas; el segundo clic lo apaga (el aviso se mantiene visible
  // mientras el filtro esté activo, para poder salir de él).
  const [filtroStockBajo, setFiltroStockBajo] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Producto | null>(
    null,
  );
  const [detailItem, setDetailItem] = useState<Producto | null>(
    null,
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Versión de la ficha seleccionada en Ver detalle (índice en la lista).
  const [detailVIdx, setDetailVIdx] = useState(0);
  // En Editar: qué se muestra a la derecha. "borrador" es el único editable;
  // un número es una versión guardada, que se ve en solo lectura.
  const [editFichaSel, setEditFichaSel] = useState<number | "borrador">("borrador");
  const [confirmEstado, setConfirmEstado] = useState<{
    id: string; nombre: string; current: EstadoProducto; next: EstadoProductoManual;
  } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);
  const [errorNombreServidor, setErrorNombreServidor] = useState("");

  // ── Bloque 4: fichas guardadas en local (respaldo de la fase 1) ──
  // NO se suben solas: solo habilitan el botón "Subir ficha guardada" en la
  // fila de un producto que la tenga y que todavía no tenga ficha en la API.
  const [fichasRespaldo] = useState<Record<string, FichaVersion[]>>(() => leerFichasRespaldoFase1());
  const [subiendoFicha, setSubiendoFicha] = useState<string | null>(null);

  /** id_insumo de la API de una fila de ficha: por su id ("INS-###") o, si la
      ficha es vieja y no lo trae, por nombre normalizado. */
  const resolverIdInsumoDeFicha = (fila: { insumoId?: string; nombre: string }): number | null => {
    if (fila.insumoId?.startsWith("INS-")) return idInsumoApiDesdeFront(fila.insumoId);
    const clave = normalizarTexto(fila.nombre);
    const ins = insumos.find((i) => normalizarTexto(i.nombre) === clave);
    return ins ? idInsumoApiDesdeFront(ins.id) : null;
  };

  /** Sube a la API la ficha que quedó guardada en local de este producto.
      Cada insumo se convierte por nombre normalizado al `INS-` de la API; si
      alguno no existe en Insumos NO se sube y se dice cuál falta. */
  const subirFichaGuardada = async (p: Producto) => {
    const versiones = fichasRespaldo[p.id] ?? [];
    const guardada = versiones.find((v) => v.fechaFin === null) ?? versiones[versiones.length - 1];
    if (!guardada) return;
    const faltantes = guardada.insumos
      .map((r) => r.nombre)
      .filter((nombre) => resolverIdInsumoDeFicha({ nombre }) == null);
    if (faltantes.length > 0) {
      toast.error(
        `No se puede subir la ficha de «${p.nombre}»: no están en Insumos ${faltantes
          .map((n) => `«${n}»`)
          .join(", ")}`,
      );
      return;
    }
    setSubiendoFicha(p.id);
    try {
      const creada = await crearFicha(
        payloadFicha(guardada, { id_producto: Number(p.id) }, resolverIdInsumoDeFicha),
      );
      setFichas((prev) => ({ ...prev, [p.id]: [mapearFichaApi(creada, cfgDe(p.idCategoria))] }));
      toast.success(`Ficha guardada de «${p.nombre}» subida a la API`);
    } catch (error) {
      toast.error(mensajeErrorProductos(error, "No se pudo subir la ficha guardada."));
    } finally {
      setSubiendoFicha(null);
    }
  };

  // Bloque 2.4: el historial de versiones de la ficha se pide a la API al abrir
  // "Ver detalle" (el estado solo trae la vigente de GET /fichas/vigentes).
  useEffect(() => {
    if (!detailItem) return;
    const id = detailItem.id;
    if (!id || Number.isNaN(Number(id))) return;
    let cancelado = false;
    void (async () => {
      try {
        const filas = await obtenerFichasDe({ id_producto: Number(id) });
        const versiones = filas
          .map((f) => mapearFichaApi(f, cfgDe(detailItem.idCategoria)))
          .sort((a, b) => a.version - b.version);
        if (cancelado || versiones.length === 0) return;
        setFichas((prev) => ({ ...prev, [id]: versiones }));
        setDetailVIdx(versiones.length - 1);
      } catch {
        // Sin historial se queda con la vigente del estado.
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [detailItem]);

  const emptyForm = (): Omit<Producto, "id"> => ({
    imagen: "",
    // Lista vacía: las imágenes se agregan una a una con CampoImagenes.
    imagenes: [],
    nombre: "",
    idCategoria: "",
    tipo: TIPOS_PRODUCTO[0],
    costoUnitario: 0, precioUnitario: 0,
    unidadVenta: "und",
    contenido: undefined,
    contenidoUnidad: "ml",
    // Presentación de compra: por defecto se compra por unidad suelta.
    unidadCompra: "und",
    unidadesPorEmpaque: undefined,
    stockDisponible: 0,
    estado: "No disponible",
  });
  const [form, setForm] = useState(emptyForm());
    // "¿Tiene ficha técnica?" (Crear): solo aparece cuando la categoría NO está
  // en CONFIG_CATEGORIA; null = sin respuesta. De ahí sale el tipo (Sí =
  // Producto insumo, No = Producto terminado). Con categoría configurada
  // el tipo lo da la categoría y este estado queda en null.
  const [formTieneFicha, setFormTieneFicha] = useState<"si" | "no" | null>(null);
  const [tieneFichaError, setTieneFichaError] = useState("");
  // Oculta la columna de ficha en Crear/Editar sin borrar lo diligenciado:
  // la ficha se guarda igual con el botón principal.
  const [fichaOculta, setFichaOculta] = useState(false);
  // Cambio de categoría en Crear pendiente de confirmación (nueva categoría
  // elegida); el select solo se actualiza cuando se confirma.
  const [confirmCategoria, setConfirmCategoria] = useState<string | null>(null);
  // Igual, para Editar.
  const [confirmCategoriaEdit, setConfirmCategoriaEdit] = useState<string | null>(null);

  // Ficha técnica state
  const fichas = fichasExternas;
  const setFichas = setFichasExternas;
  // Respuesta a "¿Tiene ficha técnica?" (solo categorías sin configuración):
  // además de marcar la respuesta, fija el tipo del producto.
  const elegirTieneFicha = (v: "si" | "no") => {
    setFormTieneFicha(v);
    setTieneFichaError("");
    setForm((p) => ({ ...p, tipo: v === "si" ? TIPOS_PRODUCTO[0] : TIPOS_PRODUCTO[1] }));
  };

  // Ficha técnica de Crear: un solo BORRADOR que se guarda como v1 junto con
  // el producto (no se crean versiones antes de que el producto exista). El
  // botón "Guardar Ficha Técnica" solo valida y lo marca como guardado.
  const [fichaBorrador, setFichaBorrador] = useState<FichaVersion>(nuevoBorradorFicha);
  // Confirmación del modal "Guardar Ficha Técnica" y marca de guardada: se
  // compara con el borrador actual, así que cualquier edición posterior la
  // invalida sola.
  const [confirmGuardarFicha, setConfirmGuardarFicha] = useState(false);
  const [fichaGuardadaEn, setFichaGuardadaEn] = useState<string | null>(null);
  const fichaGuardada = fichaGuardadaEn !== null && fichaGuardadaEn === JSON.stringify(fichaBorrador);

  // Edit-ficha: las versiones guardadas son de SOLO LECTURA (nunca se
  // modifican); los cambios se escriben en `editFichaBorrador`, una copia
  // profunda de la última versión. Al guardar, si el borrador cambió, se
  // cierra la versión vigente y el borrador queda como la versión N+1.
  const [editFichaVersiones, setEditFichaVersiones] = useState<FichaVersion[]>([]);
  const [editFichaBorrador, setEditFichaBorrador] = useState<FichaVersion>(emptyFichaVersion(1));
  const resetFichaForm = () => {
    setFichaBorrador(nuevoBorradorFicha());
    setConfirmGuardarFicha(false);
    setFichaGuardadaEn(null);
  };

  // ── Guardar ficha técnica (Crear) ──────────────────────────────────
  const solicitarGuardarFicha = () => {
    if (!fichaCumpleMinimo(fichaBorrador)) {
      toast.error("La ficha necesita al menos un insumo y porciones de 1 en adelante");
      return;
    }
    setConfirmGuardarFicha(true);
  };

  // El producto todavía no existe, así que aquí no se escribe en `fichas`:
  // la escritura real sigue siendo la de "Crear" (handleCreate).
  const confirmarGuardarFicha = () => {
    setConfirmGuardarFicha(false);
    setFichaGuardadaEn(JSON.stringify(fichaBorrador));
    toast.success("Ficha técnica guardada");
  };

  // ── Edit-ficha helpers (todo escribe sobre el borrador) ──────────
  const openEdit = (p: Producto) => {
    setErrorNombreServidor("");
    // Materializa la lista de imágenes: los productos viejos solo traen
    // `imagen`, y el editor siempre debe trabajar sobre un arreglo.
    setEditItem({ ...p, imagenes: imagenesDe(p) });
    const guardadas = (fichas[p.id] ?? []).map(copiarFicha);
    setEditFichaVersiones(guardadas);
    // El borrador arranca como copia de la última versión guardada; si el
    // producto aún no tiene ficha, parte de una v1 vacía. Los tamaños se
    // ajustan a la categoría del producto SOLO en este borrador: las
    // versiones guardadas nunca se tocan.
    const base = guardadas.length > 0 ? copiarFicha(guardadas[guardadas.length - 1]) : emptyFichaVersion(1);
    setEditFichaBorrador(ajustarFilasTamano(base, configDeCategoria(p.idCategoria, catName(p.idCategoria))));
    setEditFichaSel("borrador");
    setFichaOculta(false);
    setConfirmCategoriaEdit(null);
  };

  const fmtCOP = (n: number) => `$${n.toLocaleString("es-CO")}`;
  const inputCls =
    "w-full px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  /** Nombre visible de una categoría: el del listado del módulo Categoría de
      Productos; si el id ya no existe ahí, "Sin categoría" (nunca el código
      CAT-###, ni en la lista, ni en el buscador ni en el Excel). */
  const catName = (id: string) =>
    opcionesCategoriaBase.find((c) => c.id === id)?.nombre
      ?? productos.find((p) => p.idCategoria === id)?.categoriaNombre
      ?? "Sin categoría";

  /** Opciones del selector de Categoría (Crear y Editar): las activas del
      módulo Categoría de Productos. Al editar se añade la actual aunque esté
      Inactiva (para no cambiarle el dato al guardar) o, si su id ya no existe
      en el listado, la etiqueta "Sin categoría". En Crear (valor vacío) salen
      solo las activas: ahí manda el placeholder "Selecciona una categoría". */
  const opcionesCategoria = (valorActual: string): CategoriaProducto[] => {
    const activas = opcionesCategoriaBase.filter((c) => estadoDe(c) !== "Inactivo");
    if (!valorActual) return activas;
    if (activas.some((c) => c.id === valorActual)) return activas;
    const actual = opcionesCategoriaBase.find((c) => c.id === valorActual);
    return [...activas, actual ?? { id: valorActual, nombre: "Sin categoría" }];
  };

  /** Configuración de una categoría con los nombres visibles de este módulo
      (id primero y nombre como respaldo, ver `configDeCategoria`). */
  const cfgDe = (id: string): ConfigCategoria | null =>
    configDeCategoria(id, catName(id));

  // ── Cambio de categoría en Crear ─────────────────────────────────
  // La categoría define el tipo del producto y los tamaños de su ficha: si el
  // borrador ya tiene contenido o porciones se pide confirmación antes de
  // reajustar los tamaños; el select solo cambia al confirmar.
  const solicitarCambioCategoriaCrear = (nueva: string) => {
    if (nueva === form.idCategoria) return;
    if (!fichaConContenido(fichaBorrador)) {
      aplicarCategoriaCrear(nueva);
      return;
    }
    setConfirmCategoria(nueva);
  };
  const aplicarCategoriaCrear = (nueva: string) => {
    const cfg = configDeCategoria(nueva, catName(nueva));
    setForm((p) => ({
      ...p,
      idCategoria: nueva,
      // Con categoría configurada el tipo es de la categoría; sin ella queda
      // en Producto insumo hasta que se responda "¿Tiene ficha técnica?".
      tipo: cfg ? cfg.tipo : TIPOS_PRODUCTO[0],
    }));
    setFormTieneFicha(null);
    setTieneFichaError("");
    setFichaBorrador((v) => ajustarFilasTamano(v, cfg));
    // La marca de "ficha guardada" compara contra el borrador anterior.
    setConfirmGuardarFicha(false);
    setFichaGuardadaEn(null);
    setConfirmCategoria(null);
  };

  // ── Cambio de categoría en Editar ─────────────────────────────────
  // Misma regla que en Crear; además, un producto con historial de ficha no
  // puede cambiarse a una categoría sin ficha (perdería su historial).
  const solicitarCambioCategoriaEdit = (nueva: string) => {
    if (!editItem || nueva === editItem.idCategoria) return;
    const cfgNueva = configDeCategoria(nueva, catName(nueva));
    const conHistorial = (fichas[editItem.id]?.length ?? 0) > 0;
    if (cfgNueva?.tipo === TIPOS_PRODUCTO[1] && conHistorial) {
      toast.error(`No se puede cambiar a ${catName(nueva)} porque este producto ya tiene historial de ficha técnica`);
      return;
    }
    if (!fichaConContenido(editFichaBorrador)) {
      aplicarCategoriaEdit(nueva);
      return;
    }
    setConfirmCategoriaEdit(nueva);
  };
  const aplicarCategoriaEdit = (nueva: string) => {
    const cfg = configDeCategoria(nueva, catName(nueva));
    setEditItem((x) => x && ({ ...x, idCategoria: nueva, tipo: cfg ? cfg.tipo : x.tipo }));
    setEditFichaBorrador((v) => ajustarFilasTamano(v, cfg));
    setEditFichaSel("borrador");
    setConfirmCategoriaEdit(null);
  };

  /** Palabra con que se muestra el stock ("2 pizzas", "1 lasaña", "24 und"). */
    const palabraStock = (p: { idCategoria: string; unidadVenta: string }, n: number): string => {
    // Se resuelve por NOMBRE de categoría (no por id): así funciona igual con
    // los ids locales "CAT-00x" y con los ids numéricos que trae la API.
    const nombre = catName(p.idCategoria)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (nombre.includes("pizza")) return n === 1 ? "pizza" : "pizzas";
    if (nombre.includes("lasana")) return n === 1 ? "lasaña" : "lasañas";
    return p.unidadVenta || "und";
  };

  /** Texto de stock de una BEBIDA, igual en la celda, en "Ver detalle" y en
      los tooltips: "12 und · Stock bajo" — y SOLO "Agotado" cuando vale 0
      (en vez de "0 und"). Usa los umbrales ÚNICOS de arriba. */
  const textoStockBebida = (p: Producto): string => {
    const est = estadoStockBebida(p.stockDisponible);
    if (p.stockDisponible <= 0) return est.etiqueta;
    const base = `${p.stockDisponible} ${palabraStock(p, p.stockDisponible)}`;
    return est.etiqueta ? `${base} · ${est.etiqueta}` : base;
  };

  /** Versión vigente de la ficha (la última: es la que tiene fechaFin null). */
  const fichaVigente = (id: string): FichaVersion | null => {
    const l = fichas[id];
    return l && l.length > 0 ? l[l.length - 1] : null;
  };

  const ayudaStock = (p: Producto): string => {
    if (tipoDe(p, catName(p.idCategoria)) === TIPOS_PRODUCTO[0]) {
      // B4: un Producto insumo no tiene stock propio que suba con compras
      // ni que baje con ventas: sale de su ficha y de Insumos.
      return fichaVigente(p.id)
        ? "Se calcula con la ficha técnica y el stock de Insumos"
        : "Registra la ficha para poder prepararla";
    }
    // Bebidas: a la explicación de siempre se le agrega el estado del stock,
    // con los MISMOS umbrales que la celda y "Ver detalle" (un solo lugar).
    const est = estadoStockBebida(p.stockDisponible);
    return `Sube con las compras y baja con las ventas${est.etiqueta ? ` · ${est.etiqueta}` : ""}`;
  };

  /** ¿Debe entrar esta bebida en el aviso de stock bajo y en su filtro?
      Regla ÚNICA para los dos (no pueden divergir): tipo "Producto terminado",
      estado NO "Descontinuado" y stock ≤ 10. */
  const esBebidaEnStockBajo = (p: Producto): boolean =>
    tipoDe(p, catName(p.idCategoria)) === TIPOS_PRODUCTO[1] &&
    p.estado !== "Descontinuado" &&
    p.stockDisponible <= STOCK_BAJO;

  /** Las bebidas que hoy están en stock bajo, para el aviso del listado. */
  const bebidasStockBajo = useMemo(
    () => productos.filter(esBebidaEnStockBajo),
    [productos],
  );

  /** Lo que admite preparar un Producto insumo HOY: la MISMA función que usa
      Orden de Producción al iniciar (`disponibilidadPorFicha`) con su ficha
      vigente y el stock real de Insumos. Las pizzas llevan una cifra por
      tamaño ("8 Mediana · 5 Grande") y las lasañas (un solo tamaño), una
      sola. `null` = no tiene ficha vigente → badge "Sin ficha técnica".
      `stockDisponible` NO entra en el cálculo: sigue guardado en el producto
      (B6), solo deja de mostrarse para estos productos. */
  const prepararDe = (
    p: Producto,
  ): { cifras: CifraPrep[]; agotado: boolean } | null => {
    const ficha = fichaVigente(p.id);
    if (!ficha) return null;
    const tam = ficha.porcionesPorTamano ?? [];
    // Varias filas (pizzas: Mediana y Grande) → un cálculo por tamaño; una
    // sola o ninguna → factor 1 y una cifra, exactamente como antes.
    const etiquetas: (string | undefined)[] =
      tam.length > 1 ? tam.map((t) => t.tamano) : [undefined];
    const cifras: CifraPrep[] = etiquetas.map((etiqueta) => {
      // `detalleDisponibilidad` trae la cifra, el motivo y las filas con su
      // `limita` POR TAMAÑO, así el insumo limitante puede ser distinto en
      // Mediana y en Grande.
      const d = detalleDisponibilidad(ficha, insumos, etiqueta);
      return {
        tamano: etiqueta,
        cantidad: d.cantidad,
        limitante: d.limitante,
        agotado: d.cantidad === 0,
        limita: d.filas.filter((f) => f.limita).map((f) => f.nombre),
      };
    });
    return { cifras, agotado: cifras.some((c) => c.agotado) };
  };

  /** El texto del insumo limitante, con su color:
      "Limita: Queso mozzarella" en gris cuando todo alcanza (informativo) y
      "No alcanza: Queso mozzarella" en rojo SOLO para los tamaños que se
      quedan en 0. Si el limitante cambia por tamaño se nombra cada uno:
      "Limita Mediana: Masa · Grande: Queso". */
  const textoLimite = (cifras: CifraPrep[]): { texto: string; rojo: boolean } => {
    const agotadas = cifras.filter((c) => c.agotado);
    const relevantes = agotadas.length > 0 ? agotadas : cifras;
    const rojo = agotadas.length > 0;
    const partes = relevantes.map((c) => ({
      tamano: c.tamano,
      nombre: c.limita.length > 0 ? c.limita.join(" + ") : (c.limitante ?? ""),
    }));
    if (partes.length === 0 || !partes[0].nombre) return { texto: "", rojo };
    const prefijo = rojo ? "No alcanza" : "Limita";
    const mismo = partes.every((x) => x.nombre === partes[0].nombre);
    if (mismo) return { texto: `${prefijo}: ${partes[0].nombre}`, rojo };
    return {
      texto: partes
        .map((x, i) => `${i === 0 ? `${prefijo} ` : ""}${x.tamano ?? ""}: ${x.nombre}`)
        .join(" · "),
      rojo,
    };
  };

  /** Las cifras "8 Mediana · 5 Grande" (o "12 lasañas"), cada una en rojo
      cuando vale 0. La usan la celda del listado y Ver detalle. */
  const pintarCifras = (p: Producto, cifras: CifraPrep[]): React.ReactNode => (
    <>
      {cifras.map((c, i) => (
        <React.Fragment key={c.tamano ?? "único"}>
          {i > 0 && (
            <span className="text-muted-foreground font-normal"> · </span>
          )}
          <span className={c.cantidad === 0 ? "text-red-600" : "text-emerald-600"}>
            {c.cantidad}
            {c.tamano ? ` ${c.tamano}` : ` ${palabraStock(p, c.cantidad)}`}
          </span>
        </React.Fragment>
      ))}
    </>
  );

  const exportExcel = async () => {
    const fecha = new Date();
    const archivo = await exportarExcelEstilizado({
      datos: productos,
      titulo: "Gestión Producto",
      nombreHoja: "Productos",
      nombreArchivo: "Gestion_Productos",
      fecha,
      // Los colores salen de ESTADO_COLORES: un solo lugar para los tres
      // estados ("FF" es el alfa opaco que pide el formato del Excel).
      coloresEstado: Object.fromEntries(
        ESTADOS_PRODUCTO.map((e) => [e, { texto: "FFFFFFFF", fondo: `FF${ESTADO_COLORES[e].slice(1)}` }]),
      ),
      columnas: [
        { header: "Nombre", valor: (p) => p.nombre },
        { header: "Tipo", valor: (p) => tipoDe(p, catName(p.idCategoria)) },
        { header: "Categoría", valor: (p) => catName(p.idCategoria) },
        { header: "Precio Mediana / venta", valor: (p) => p.precioUnitario, numFmt: '"$"#,##0' },
        { header: "Precio Grande", valor: (p) => catName(p.idCategoria).toLowerCase().includes("pizza") ? (p.precioGrande ?? p.precioUnitario + 2000) : "", numFmt: '"$"#,##0' },
        {
          header: "Stock",
          // B5: un Producto insumo NO exporta su `stockDisponible` (ese
          // número ya no significa nada) sino lo que admite preparar hoy con
          // su ficha vigente y el stock de Insumos — en pizzas, la cantidad
          // del primer tamaño, Mediana, que es la de referencia de la ficha.
          // Sin ficha todavía, el aviso. Las bebidas siguen exportando su
          // número de siempre.
          valor: (p) => {
            if (tipoDe(p, catName(p.idCategoria)) !== TIPOS_PRODUCTO[0]) {
              return p.stockDisponible;
            }
            const prep = prepararDe(p);
            if (!prep) return "Sin ficha técnica";
            return `Se pueden preparar: ${prep.cifras[0]?.cantidad ?? 0}`;
          },
          numFmt: "#,##0",
        },
        { header: "Estado", valor: (p) => p.estado, esEstado: true },
      ],
    });
    toast.success(`Archivo Excel descargado (${archivo})`);
  };

  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    // El buscador busca por nombre (con su presentación: bebidas →
    // "Coca-Cola · 1.5 L · Paca x12" y "Coca-Cola 1.5 L"), categoría y
    // tipo; NO por id (el id es interno y ya no se muestra).
    return productos.filter(
      (p) =>
        // Filtro del aviso de stock bajo: solo esas bebidas (el resto de
        // condiciones sigue aplicando para que los otros filtros manden igual).
        (!filtroStockBajo || esBebidaEnStockBajo(p)) &&
        (filtroTipo === "Todos" || tipoDe(p, catName(p.idCategoria)) === filtroTipo) &&
        (filtroEstado === "Todos" || p.estado === filtroEstado) &&
        (presentacionDe(p).toLowerCase().includes(q) ||
          nombreBuscable(p).toLowerCase().includes(q) ||
          catName(p.idCategoria).toLowerCase().includes(q) ||
          tipoDe(p, catName(p.idCategoria)).toLowerCase().includes(q)),
    );
  }, [productos, search, filtroTipo, filtroEstado, filtroStockBajo]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE,
  );

  // Si el buscador o un borrado reducen el total, `page` puede quedar apuntando
  // más allá de la última página: la tabla salía vacía sin mensaje de "sin
  // resultados" y "Siguiente" ya no avanzaba (hacía `min(totalPages, p + 1)`).
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  // IDs que ya tienen ficha propia: los productos del menú y los Productos
  // Insumo de Compras comparten el mismo mapa `fichas`, así que la numeración
  // de fichas (001, 002, …) tiene que contar los dos tipos de registro.
  const idsConFicha = [
    ...productos.map((p) => p.id),
    ...insumos.filter((i) => i.tipo === "ProductoInsumo").map((i) => i.id),
  ];

  /** Bloque 1.1: ¿ya existe un producto con este nombre? Compara SIN tildes,
      mayúsculas ni espacios de más (en la base de datos el nombre es único,
      así que sin esta barrera la API rechazaría el guardado). Al editar se
      excluye el propio producto para no compararse consigo mismo. */
  const nombreRepetido = (nombre: string, excluirId?: string): boolean =>
    nombreLimpio(nombre) !== "" &&
    productos.some((p) => p.id !== excluirId && mismoNombre(p.nombre, nombre));

  const handleCreate = async () => {
    if (guardandoRef.current) return;
    // Primero la categoría (es la que define el tipo y los tamaños) y el
    // nombre; la pregunta "¿Tiene ficha técnica?" solo aplica cuando la
    // categoría NO está en CONFIG_CATEGORIA.
    if (!form.nombre || !form.idCategoria) {
      toast.error("Nombre y categoría son obligatorios");
      return;
    }
    // Bloque 1.1: el error ya se pinta en tiempo real bajo el campo Nombre;
    // acá se bloquea el Crear por si el formulario llega por otro camino.
    if (nombreRepetido(form.nombre)) {
      toast.error("Ya existe un producto con ese nombre");
      return;
    }
    const cfg = cfgDe(form.idCategoria);
    if (!cfg && formTieneFicha === null) {
      setTieneFichaError("Selecciona si el producto tiene ficha técnica");
      toast.error("Selecciona si el producto tiene ficha técnica");
      return;
    }
    // Tipo final: de la categoría cuando está configurada; si no, de la
    // respuesta a "¿Tiene ficha técnica?" (Sí = Producto insumo, No =
    // Producto terminado).
    const tipoFinal: TipoProducto =
      cfg ? cfg.tipo : formTieneFicha === "si" ? TIPOS_PRODUCTO[0] : TIPOS_PRODUCTO[1];
    if (!esTerminado(tipoFinal) && (!Number.isFinite(form.precioUnitario) || form.precioUnitario <= 0)) {
      toast.error("El precio de venta debe ser mayor a 0");
      return;
    }
    // Bebidas ("Producto terminado"): la presentación es obligatoria (ej. 400
    // ml, 1.5 L). Sin contenido no se puede guardar la bebida. Bloque 2.3:
    // mismas reglas que el "+ Crear producto" de Compras (helper compartido).
    if (tipoFinal === TIPOS_PRODUCTO[1]) {
      const err = erroresBebida({
        nombre: form.nombre,
        contenido: form.contenido ?? 0,
        contenidoUnidad: form.contenidoUnidad,
        unidadCompra: form.unidadCompra,
        unidadesPorEmpaque: form.unidadesPorEmpaque,
      });
      // El nombre ya se validó arriba (obligatorio y no repetido): acá solo
      // interesan los campos de presentación, en su orden de siempre.
      const primero = err.contenido ?? err.contenidoUnidad ?? err.empaque;
      if (primero) {
        toast.error(primero);
        return;
      }
    }
    // El precio de una bebida solo lo pone Compras (monto de compra + % de
    // ganancia, bloque B4): aunque el form traiga un precio de antes de
    // cambiar de categoría, se guarda 0 y la bebida nace "No disponible".
    const esTerminadoFinal = tipoFinal === TIPOS_PRODUCTO[1];
    // Presentación de compra normalizada: sólo Producto terminado la guarda
    // (las bebidas se compran por unidad/paca/caja); el resto queda "und".
    const ucFinal =
      esTerminadoFinal && (form.unidadCompra === "paca" || form.unidadCompra === "caja")
        ? form.unidadCompra
        : "und";
    const nFinal = ucFinal === "und" ? undefined : Math.trunc(Number(form.unidadesPorEmpaque));
    // Un Producto insumo no se guarda sin su ficha: al menos 1 insumo y
    // porciones >= 1 en cada tamaño. Un Producto terminado nunca guarda ficha.
    if (tipoFinal === TIPOS_PRODUCTO[0]) {
      if (!fichaCumpleMinimo(fichaBorrador)) {
        // Si la ficha estaba oculta, se vuelve a mostrar sola con el error.
        setFichaOculta(false);
        toast.error("Un producto insumo necesita su ficha técnica con al menos un insumo y porciones de 1 en adelante");
        return;
      }
    }
    guardandoRef.current = true;
    setGuardando(true);
    setErrorNombreServidor("");
    try {
      const creado = await onCrearEnServidor?.(sincronizarImagenes({
        id: "",
        ...form,
        tipo: tipoFinal,
        ...(esTerminadoFinal
          ? {
              precioUnitario: 0,
              estado: "No disponible" as EstadoProducto,
              // Las bebidas se VENDEN siempre sueltas; el empaque de compra
              // es un dato aparte (unidadCompra / unidadesPorEmpaque).
              unidadVenta: "und",
              unidadCompra: ucFinal,
              unidadesPorEmpaque: nFinal,
            }
          : { unidadCompra: "und" as const, unidadesPorEmpaque: undefined }),
      }));
      if (!creado) throw new Error("No se pudo guardar el producto en el servidor.");
      if (tipoFinal === TIPOS_PRODUCTO[0]) {
        // Bloque 4: la ficha del producto nuevo se guarda contra la API
        // (POST /fichas con `id_producto`); la respuesta (con su id_ft y su
        // número de ficha) es la que entra al estado.
        try {
          const creada = await crearFicha(
            payloadFicha(
              fichaBorrador,
              { id_producto: Number(creado.id) },
              resolverIdInsumoDeFicha,
            ),
          );
          setFichas((prev) => ({
            ...prev,
            [creado.id]: [mapearFichaApi(creada, cfgDe(creado.idCategoria))],
          }));
        } catch (error) {
          toast.error(mensajeErrorProductos(error, "El producto se creó pero su ficha técnica no se pudo guardar."));
        }
      }
      setShowCreate(false);
      setForm(emptyForm());
      resetFichaForm();
      setFormTieneFicha(null);
      setTieneFichaError("");
      setConfirmCategoria(null);
      toast.success("Producto creado correctamente");
    } catch (error) {
      const mensaje = mensajeErrorProductos(error, "No se pudo crear el producto.");
      if ((error as { status?: number })?.status === 409 || mensaje.toLowerCase().includes("ya existe un producto")) {
        setErrorNombreServidor(mensaje);
      } else {
        toast.error(mensaje);
      }
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  const esTerminado = (tipo: TipoProducto) => tipo === TIPOS_PRODUCTO[1];

  const handleEdit = async () => {
    if (guardandoRef.current) return;
    if (!editItem) return;
    // Bloque 1.1: mismo control que al crear, sin compararse consigo mismo.
    // Se permite renombrar; las referencias heredadas se resuelven también por
    // nombre normalizado y el menú se refresca con la respuesta del servidor.
    if (nombreRepetido(editItem.nombre, editItem.id)) {
      toast.error("Ya existe un producto con ese nombre");
      return;
    }
    const cfg = cfgDe(editItem.idCategoria);
    // Tipo final: con categoría configurada manda la categoría (y corrige
    // cualquier `tipo` viejo guardado); sin configuración, la respuesta a
    // "¿Tiene ficha técnica?" o la derivación de `tipoDe`.
    const tipoFinal: TipoProducto =
      cfg ? cfg.tipo : tipoDe(editItem, catName(editItem.idCategoria));
    const original = productos.find((x) => x.id === editItem.id);
    if (original && tipoFinal !== original.tipo) {
      toast.error("El tipo de producto no se puede cambiar al editar");
      return;
    }
    if (!esTerminado(tipoFinal) && (!Number.isFinite(editItem.precioUnitario) || editItem.precioUnitario <= 0)) {
      toast.error("El precio de venta debe ser mayor a 0");
      return;
    }
    // Bebidas que ya existen sin contenido se pueden guardar igual (el campo
    // solo es obligatorio al CREAR): aquí solo se valida el formato cuando el
    // usuario lo llena.
    if (
      tipoFinal === TIPOS_PRODUCTO[1] &&
      editItem.contenido != null &&
      editItem.contenido !== 0
    ) {
      const contenido = Number(editItem.contenido);
      if (!Number.isFinite(contenido) || contenido <= 0) {
        toast.error("El contenido debe ser un número mayor a 0 (ej. 400 ml o 1.5 L)");
        return;
      }
      if (editItem.contenidoUnidad !== "ml" && editItem.contenidoUnidad !== "L") {
        toast.error("Selecciona la unidad del contenido (ml o L)");
        return;
      }
    }
    // Presentación de compra: si la bebida se compra en paca/caja, el
    // empaque debe estar bien cargado (> 1 entero). Con "Unidad" no se pide.
    const ucEdit =
      tipoFinal === TIPOS_PRODUCTO[1] &&
      (editItem.unidadCompra === "paca" || editItem.unidadCompra === "caja")
        ? editItem.unidadCompra
        : "und";
    const nEdit = ucEdit === "und" ? undefined : Math.trunc(Number(editItem.unidadesPorEmpaque));
    if (
      ucEdit !== "und" &&
      (!Number.isFinite(Number(editItem.unidadesPorEmpaque)) || !Number.isInteger(nEdit) || nEdit <= 1)
    ) {
      toast.error(`Indica cuántas unidades trae la ${ucEdit === "paca" ? "paca" : "caja"} (mínimo 2)`);
      return;
    }
    // Un producto con historial de ficha no puede pasar a una categoría sin
    // ficha: perdería su historial. Es el respaldo del bloqueo que ya hace
    // `solicitarCambioCategoriaEdit` al elegir la categoría.
    if (
      original &&
      tipoDe(original, catName(original.idCategoria)) === TIPOS_PRODUCTO[0] &&
      tipoFinal === TIPOS_PRODUCTO[1] &&
      (fichas[editItem.id]?.length ?? 0) > 0
    ) {
      toast.error(`No se puede cambiar a ${catName(editItem.idCategoria)} porque este producto ya tiene historial de ficha técnica`);
      return;
    }
    if (tipoFinal === TIPOS_PRODUCTO[0] && !fichaCumpleMinimo(editFichaBorrador)) {
      // Si la ficha estaba oculta, se vuelve a mostrar sola con el error.
      setFichaOculta(false);
      toast.error("Un producto insumo necesita su ficha técnica con al menos un insumo y porciones de 1 en adelante");
      return;
    }
    guardandoRef.current = true;
    setGuardando(true);
    setErrorNombreServidor("");
    try {
      const actualizado = await onEditarEnServidor?.(sincronizarImagenes({
        ...editItem,
        tipo: tipoFinal,
        categoriaNombre: catName(editItem.idCategoria),
        ...(tipoFinal === TIPOS_PRODUCTO[1]
          ? { unidadVenta: "und", unidadCompra: ucEdit, unidadesPorEmpaque: nEdit }
          : { unidadCompra: "und" as const, unidadesPorEmpaque: undefined }),
      }));
      if (!actualizado) throw new Error("No se pudo actualizar el producto en el servidor.");
    } catch (error) {
      const mensaje = mensajeErrorProductos(error, "No se pudo actualizar el producto.");
      if ((error as { status?: number })?.status === 409 || mensaje.toLowerCase().includes("ya existe un producto")) {
        setErrorNombreServidor(mensaje);
      } else {
        toast.error(mensaje);
      }
      guardandoRef.current = false;
      setGuardando(false);
      return;
    }
    // Un solo "Guardar" para producto y ficha: la ficha se envía a la API como
    // versión nueva (POST /fichas con `id_producto`); si el contenido no cambió
    // el servidor responde `sinCambios` y la versión vigente sigue siendo la
    // misma. Un Producto terminado nunca guarda ficha.
    if (tipoFinal === TIPOS_PRODUCTO[0]) {
      try {
        const creada = await crearFicha(
          payloadFicha(
            editFichaBorrador,
            { id_producto: Number(editItem.id) },
            resolverIdInsumoDeFicha,
          ),
        );
        setFichas((prev) => ({
          ...prev,
          [editItem.id]: [mapearFichaApi(creada, cfgDe(editItem.idCategoria))],
        }));
      } catch (error) {
        toast.error(mensajeErrorProductos(error, "El producto se actualizó pero su ficha técnica no se pudo guardar."));
      }
    }
    setEditItem(null);
    setConfirmCategoriaEdit(null);
    toast.success("Producto actualizado");
    guardandoRef.current = false;
    setGuardando(false);
  };

  /** Bloque 1.2: "Descontinuar" reemplaza a "Eliminar": el producto sale del
      menú pero se conservan su historial y su ficha técnica (el profesor pidió
      que no se borre nada; hoy el basurero borraba producto Y ficha aunque
      tuviera ventas, órdenes o compras detrás). Se puede volver a "Disponible"
      o "No disponible" desde la pastilla de estado de la lista. */
  const handleDescontinuar = async (id: string) => {
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    try {
      if (!onDescontinuarEnServidor) throw new Error("No está disponible la conexión con Productos API.");
      await onDescontinuarEnServidor(id);
      setDeleteId(null);
      toast.success("Producto descontinuado: salió del menú y su ficha técnica se conserva");
    } catch (error) {
      toast.error(mensajeErrorProductos(error, "No se pudo descontinuar el producto."));
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  const roCls = "w-full px-3 py-2 bg-muted/50 rounded-xl border border-border text-sm text-foreground cursor-not-allowed";
  const FormFields = ({
    values,
    onChange,
    hideUnidad = false,
    readOnly = false,
    lockNombre = false,
    mostrarEstado = true,
    mostrarTipo = true,
    esCrear = false,
    errorNombre = "",
    trasCategoria,
  }: {
    values: Omit<Producto, "id">;
    onChange: (f: keyof Omit<Producto, "id">, v: string | number) => void;
    hideUnidad?: boolean;
    readOnly?: boolean;
    lockNombre?: boolean;
    /** Estado (solo lectura; se cambia desde la lista del index). Crear no lo
        muestra: un producto nuevo siempre nace "Disponible". */
    mostrarEstado?: boolean;
    /** Pastilla del tipo + descripción bajo Categoría. Crear la calla hasta
        que el tipo esté definido (categoría configurada o "¿Tiene ficha
        técnica?" ya respondida). */
    mostrarTipo?: boolean;
    /** true solo en la pantalla de Crear: el precio de venta de una Bebida
        ("Producto terminado") no se pide aquí, el contenido pasa a ser
        obligatorio y Unidad de venta se muestra únicamente para Bebidas. */
    esCrear?: boolean;
    /** Texto de error bajo el campo Nombre (bloque 1.1: nombre repetido);
        lo calcula la pantalla según los productos cargados. */
    errorNombre?: string;
    /** Bloque que va INMEDIATAMENTE después de Categoría (Editar pasa aquí
        la pregunta "¿Tiene ficha técnica?" de las categorías sin config). */
    trasCategoria?: React.ReactNode;
  }) => {
    const tipo = tipoDe(values, catName(values.idCategoria));
    /** Bebida / reventa: el precio de venta se define en Compras, no aquí. */
    const esTerminado = tipo === TIPOS_PRODUCTO[1];
    /** El campo Precio de venta se pinta salvo al CREAR una bebida. */
    const mostrarPrecio = !(esCrear && esTerminado);
    /** Una bebida nunca se edita a mano: en Editar y Ver detalle queda solo
        lectura con la ayuda "Se define en Compras". */
    const precioSoloLectura = readOnly || esTerminado;
    /** En Crear, Unidad de venta ya NO se muestra (tampoco antes lo hacía
        para insumos: la decide FormFields con esCrear). Las bebidas
        ("Producto terminado") tampoco la usan: se VENDEN siempre sueltas
        ("und") y aquí sólo se muestra cómo se COMPRAN (bloque de más
        abajo). En Editar/Detalle sigue el flag para los insumos. */
    const mostrarUnidad = !esTerminado && (esCrear ? false : !hideUnidad);
    /** Presentación de compra (ajuste de bebidas): con paca/caja hay que
        decir cuántas unidades trae la presentación. */
    const compraPorEmpaque =
      esTerminado && (values.unidadCompra === "paca" || values.unidadCompra === "caja");
    const nEmpaque = Number(values.unidadesPorEmpaque);
    const empaqueVacio =
      !Number.isFinite(nEmpaque) || !Number.isInteger(nEmpaque) || nEmpaque <= 1;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Categoría: PRIMER campo de "Datos del producto" (se muestra solo el
            nombre; el id queda interno) porque es la que define el tipo del
            producto y los tamaños de su ficha técnica. Ocupa el ANCHO COMPLETO
            (sm:col-span-2) porque debajo va la pastilla del tipo con su
            descripción en una sola línea: lo define la categoría
            (CONFIG_CATEGORIA) o, sin configuración, la pregunta
            "¿Tiene ficha técnica?". */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-muted-foreground mb-0.5">
            Categoría *
          </label>
          <select
            value={values.idCategoria}
            onChange={(e) => onChange("idCategoria", e.target.value)}
            disabled={readOnly}
            className={readOnly ? roCls : inputCls + " cursor-pointer"}
          >
            <option value="" disabled>Selecciona una categoría</option>
            {opcionesCategoria(values.idCategoria).map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          {values.idCategoria && mostrarTipo && (
            /* Pastilla del tipo + descripción en UNA sola línea (sin wrap):
               la pastilla a la izquierda y la ayuda a su lado. El `title` de
               la pastilla conserva el texto completo de `descTipo`; en
               pantalla se quita el prefijo ("Producto insumo: ") porque la
               pastilla ya dice el tipo. */
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`shrink-0 inline-flex px-3 py-1 rounded-full text-xs font-semibold ${tipoPillCls(tipo)}`}
                title={descTipo(tipo)}
              >
                {tipo}
              </span>
              <span className="min-w-0 truncate text-xs text-muted-foreground">
                {descTipo(tipo).replace(`${tipo}: `, "")}
              </span>
            </div>
          )}
        </div>
        {trasCategoria}
        {/* Nombre y Precio de venta lado a lado (60/40 en sm+; en móvil se
            apilan). El precio NO muestra el 0 inicial: ver `CampoPrecio`. El
            costo (costoUnitario) no se edita aquí. Al CREAR una bebida el
            precio no se pide (se define en Compras) y el nombre ocupa todo. */}
        <div className="sm:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            <div className={mostrarPrecio ? "sm:col-span-3" : "sm:col-span-5"}>
              <label className="block text-xs font-semibold text-muted-foreground mb-0.5">
                Nombre *
              </label>
              <input
                value={values.nombre}
                onChange={(e) => onChange("nombre", e.target.value)}
                placeholder={esTerminado ? "Ej: Coca-Cola" : "Ej: Margarita Clásica"}
                readOnly={readOnly || lockNombre}
                className={
                  readOnly || lockNombre
                    ? roCls
                    : `${inputCls}${errorNombre ? " border-red-400 focus:ring-red-300" : ""}`
                }
              />
              {/* Bloque 1.1: aviso en TIEMPO REAL si el nombre ya existe
                  (sin tildes, mayúsculas ni espacios de más). */}
              {errorNombre && (
                <p className="text-xs text-red-500 mt-0.5">{errorNombre}</p>
              )}
            </div>
            {mostrarPrecio && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-muted-foreground mb-0.5">
                  Precio de venta (COP)
                </label>
                <CampoPrecio
                  valor={values.precioUnitario}
                  onCambio={(n) => onChange("precioUnitario", n)}
                  readOnly={precioSoloLectura}
                  cls={precioSoloLectura ? roCls : inputCls}
                />
                {esTerminado && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Se define en Compras
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Contenido de la bebida (ej. 400 ml, 1.5 L). Obligatorio en Crear;
            en Editar/Ver detalle se muestra y se puede ajustar. Las pizzas y
            lasañas no lo llevan. */}
        {esTerminado && (
          <div className="sm:col-span-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-0.5">
                  Contenido {esCrear && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={values.contenido ?? ""}
                  placeholder="Ej: 400 o 1.5"
                  onChange={(e) =>
                    onChange(
                      "contenido",
                      e.target.value === "" ? 0 : Number(e.target.value),
                    )
                  }
                  disabled={readOnly}
                  className={readOnly ? roCls : inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-0.5">
                  Unidad de contenido
                </label>
                <select
                  value={values.contenidoUnidad ?? "ml"}
                  onChange={(e) =>
                    onChange("contenidoUnidad", e.target.value as "ml" | "L")
                  }
                  disabled={readOnly}
                  className={readOnly ? roCls : inputCls + " cursor-pointer"}
                >
                  <option value="ml">ml</option>
                  <option value="L">L</option>
                </select>
              </div>
            </div>
          </div>
        )}
        {/* Estado (solo lectura; se cambia desde la lista del index). */}
        {mostrarEstado && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-0.5">
              Estado
            </label>
            <div>
              <EstadoBadge estado={values.estado} />
            </div>
          </div>
        )}
        {/* Unidad de venta (sólo productos NO terminado: pizzas, insumos…) */}
        {mostrarUnidad && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-0.5">
              Unidad de venta
            </label>
            <select
              value={values.unidadVenta}
              onChange={(e) => onChange("unidadVenta", e.target.value)}
              disabled={readOnly}
              className={readOnly ? roCls : inputCls + " cursor-pointer"}
            >
              {["und", "kg", "lt", "paq", "pza", "caja"].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        )}
        {/* Presentación de compra de la bebida (ajuste): se VENDE siempre
            suelta ("und" se guarda solo) pero se COMPRA por Unidad, Paca o
            Caja; con paca/caja hay que decir cuántas unidades trae. */}
        {esTerminado && (
          <div className="sm:col-span-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-0.5">
                  Se compra por {esCrear && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={values.unidadCompra ?? "und"}
                  onChange={(e) => {
                    onChange("unidadCompra", e.target.value);
                    // Volver a "Unidad" limpia el empaque que no aplica.
                    if (e.target.value === "und") onChange("unidadesPorEmpaque", 0);
                  }}
                  disabled={readOnly}
                  className={readOnly ? roCls : inputCls + " cursor-pointer"}
                >
                  <option value="und">Unidad</option>
                  <option value="paca">Paca</option>
                  <option value="caja">Caja</option>
                </select>
              </div>
              {compraPorEmpaque && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-0.5">
                    Unidades por {values.unidadCompra === "paca" ? "paca" : "caja"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={2}
                    step={1}
                    value={values.unidadesPorEmpaque || ""}
                    placeholder="Ej: 12"
                    onChange={(e) =>
                      onChange(
                        "unidadesPorEmpaque",
                        e.target.value === "" ? 0 : Number(e.target.value),
                      )
                    }
                    disabled={readOnly}
                    className={readOnly ? roCls : inputCls}
                  />
                  {empaqueVacio && (
                    <p className="text-[11px] text-red-500 mt-1">
                      Mínimo 2 unidades por presentación
                    </p>
                  )}
                </div>
              )}
            </div>
            {esTerminado && !compraPorEmpaque && (
              <p className="text-[11px] text-muted-foreground mt-1">
                La bebida se vende suelta (und); el empaque es sólo para comprarla al proveedor
              </p>
            )}
          </div>
        )}
        {/* El stock disponible NO se escribe en el producto: sigue en la
            interfaz y lo actualiza el sistema (órdenes de producción / compras).
            En el index y en Ver detalle se muestra como solo lectura. */}
      </div>
    );
  };

  const ModalWrap = ({
    title,
    onClose,
    onConfirm,
    confirmLabel,
    children,
  }: {
    title: string;
    onClose: () => void;
    onConfirm: () => void;
    confirmLabel: string;
    children: React.ReactNode;
  }) => (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.16 }}
        className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border my-6"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3
            className="text-lg font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="flex gap-3 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
      </div>
    </div>
  );

  if (cargandoProductos || errorProductos) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-bold text-foreground">Gestión de Productos</h1>
          {cargandoProductos ? (
            <p className="mt-3 text-sm text-muted-foreground">Cargando productos…</p>
          ) : (
            <>
              <p className="mt-3 text-sm text-red-600">{errorProductos}</p>
              <button
                type="button"
                onClick={onReintentarCarga}
                className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Reintentar
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Pantalla completa Crear Producto ──────────────────────────────
  if (showCreate) {
    const iCls = "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
    // Categoría elegida: define el tipo y los tamaños de la ficha. La pregunta
    // "¿Tiene ficha técnica?" solo existe para categorías SIN configuración.
    const cfgCrear = cfgDe(form.idCategoria);
    const mostrarPregunta = form.idCategoria !== "" && !cfgCrear;
    const llevaFichaCrear = cfgCrear
      ? cfgCrear.tipo === TIPOS_PRODUCTO[0]
      : formTieneFicha === "si";
    const mostrarEditor = form.idCategoria !== "" && llevaFichaCrear;
    // Reventa definida (por categoría o por la respuesta): no hay ficha que
    // ocultar/mostrar, así que el botón queda deshabilitado.
    const sinFichaDefinitiva = (cfgCrear?.tipo === TIPOS_PRODUCTO[1]) || formTieneFicha === "no";
    // Bloque 1.1: error en TIEMPO REAL bajo el campo Nombre; mientras exista,
    // el botón Crear queda deshabilitado (además del toast de handleCreate).
    const errorNombreCrear = nombreRepetido(form.nombre)
      ? "Ya existe un producto con ese nombre"
      : errorNombreServidor;
    return (
      /* La pantalla vive dentro de `<main>`, que ya está bajado por el
         AdminTopBar (`h-14` = 3.5rem) y seguido por el footer del admin, así
         que el alto se calcula sobre el viewport menos ambos: con `h-screen`
         la pantalla medía 56px más que la ventana (scroll de página) y el
         footer la empujaba fuera del viewport. Cada columna scrollea por
         dentro, nunca la página. */
      <div className="h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-3.5rem-7.25rem)] xl:h-[calc(100dvh-3.5rem-4.3125rem)] bg-muted/30 flex flex-col overflow-hidden">
        {/* Cabecera fija: no crece ni genera scroll */}
        <div className="shrink-0 bg-card border-b border-border px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Crear producto</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Completa los datos del producto y su ficha técnica</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setFichaOculta(v => !v)}
              disabled={sinFichaDefinitiva}
              title={sinFichaDefinitiva ? "Este producto no lleva ficha técnica" : undefined}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {fichaOculta ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {fichaOculta ? "Mostrar ficha técnica" : "Ocultar ficha técnica"}
            </button>
            <button onClick={() => { setShowCreate(false); setForm(emptyForm()); resetFichaForm(); setFormTieneFicha(null); setTieneFichaError(""); setConfirmCategoria(null); }}
              className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
              Cancelar
            </button>
            <button onClick={() => void handleCreate()}
              disabled={guardando || errorNombreCrear !== ""}
              title={errorNombreCrear || undefined}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              {guardando ? "Guardando…" : "Crear"}
            </button>
          </div>
        </div>

        {/* Dos columnas de tarjetas: el fondo `bg-muted/30` y el `p-4` de cada
            columna son el aire alrededor (ya no hay línea divisoria). Cada
            columna scrollea por dentro, nunca la página. */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">

          {/* ── COLUMNA IZQUIERDA: tarjeta de datos + tarjeta de imágenes ── */}
          {/* Con la ficha oculta, las tarjetas ocupan el ancho (max-w-2xl
              centrado); la animación de 0,2 s la da transition-all. */}
          <div className={`${fichaOculta ? "flex-1" : "w-full md:w-1/2"} p-4 flex flex-col min-h-0 transition-all duration-200`}>
            <div className={`flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto w-full ${fichaOculta ? "max-w-2xl mx-auto" : ""}`}>
              {/* Datos mantiene su alto natural; Imágenes crece (llenarAlto)
                  solo cuando hay dos columnas con el editor visible, para que
                  ambos fondos caigan parejos. Con la ficha oculta o sin ficha
                  no se estira nada (alto natural). */}
              <Tarjeta titulo="Datos del producto" className="shrink-0">
                {FormFields({
                  values: form,
                  onChange: (f, v) => {
                    // La categoría tiene regla propia: pide confirmación antes
                    // de reajustar los tamaños de la ficha.
                    if (f === "idCategoria") {
                      solicitarCambioCategoriaCrear(String(v));
                      return;
                    }
                    setErrorNombreServidor("");
                    const siguiente = { ...form, [f]: v };
                    setForm(siguiente);
                  },
                  // Crear no muestra Estado (nace "Disponible"). Unidad de
                  // venta solo aparece para Bebidas (la decide FormFields con
                  // esCrear); las imágenes viven en su propia tarjeta.
                  esCrear: true,
                  mostrarEstado: false,
                  // Bloque 1.1: nombre repetido en tiempo real bajo el campo.
                  errorNombre: errorNombreCrear,
                  // La pastilla del tipo espera a tener el tipo definido.
                  mostrarTipo: !mostrarPregunta || formTieneFicha !== null,
                  trasCategoria: mostrarPregunta ? (
                    <PreguntaTieneFicha
                      valor={formTieneFicha}
                      onElegir={elegirTieneFicha}
                      error={tieneFichaError}
                    />
                  ) : null,
                })}
              </Tarjeta>
              <TarjetaImagenes
                imagenes={imagenesDe(form)}
                onChange={(imgs) => setForm((p) => ({ ...p, imagenes: imgs, imagen: imgs[0] ?? "" }))}
                inputCls={iCls}
                llenarAlto={!fichaOculta && mostrarEditor}
              />
            </div>
          </div>

          {/* ── COLUMNA DERECHA: tarjeta de ficha técnica ── */}
          {/* La tarjeta scrollea por dentro y el botón "Guardar Ficha
              Técnica" queda en su footer, FUERA del scroller, así que siempre
              se ve y nunca tapa el input de pasos. Solo aparece si el producto
              lleva ficha (categoría con ficha, o respuesta "Sí" en categorías
              sin configuración). Al ocultarla, la columna colapsa con una
              animación de 0,2 s y NO se borra lo diligenciado. */}
          <div className={`flex flex-col min-h-0 transition-all duration-200 ${
            fichaOculta ? "w-0 p-0 opacity-0 overflow-hidden" : "w-full md:w-1/2 p-4 opacity-100"
          }`}>
            {/* Sin ficha definitiva (o categoría sin elegir): tarjeta compacta
                con el mensaje del caso, sin botón de guardar. */}
            {!mostrarEditor ? (
              <Tarjeta titulo="Ficha técnica">
                <div className="flex flex-col items-center justify-center text-center bg-muted/40 rounded-xl border border-border p-5 select-none">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                    <span className="text-2xl">📋</span>
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">
                    {!form.idCategoria
                      ? "Primero elige la categoría del producto"
                      : cfgCrear?.tipo === TIPOS_PRODUCTO[1] || formTieneFicha === "no"
                        ? "Este producto no lleva ficha técnica"
                        : "Responde arriba si el producto tiene ficha técnica"}
                  </p>
                </div>
              </Tarjeta>
            ) : (
              <Tarjeta
                titulo="Ficha técnica"
                className="flex-1 min-h-0"
                scrollInterno
                acciones={
                  <div className="flex items-center gap-2">
                    {fichaGuardada && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
                        <Check className="w-3.5 h-3.5" /> Ficha guardada
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary">
                      Nueva versión (borrador)
                    </span>
                  </div>
                }
                footer={
                  <button type="button" onClick={solicitarGuardarFicha}
                    className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                    Guardar Ficha Técnica
                  </button>
                }
              >
                <p className="text-[11px] text-muted-foreground mb-3 bg-muted/40 px-3 py-1.5 rounded-lg">
                  La ficha se guarda como <span className="font-bold text-foreground">v1</span> junto con el producto.
                </p>
                <FichaTecnicaEditor
                  ficha={fichaBorrador}
                  onChange={setFichaBorrador}
                  insumos={insumos}
                  modo="producto"
                  inputCls={iCls}
                  /* Los tamaños los define la categoría (o la fila única
                     "Único" de etiqueta fija, si no está configurada). */
                  tamanoFijo={tamanoFijoDe(cfgCrear)}
                />
              </Tarjeta>
            )}
          </div>
        </div>

        {/* ── Confirmar guardado de la ficha técnica ── */}
        <AnimatePresence>
          {confirmGuardarFicha && (
            <ConfirmDeleteModal
              title="Guardar ficha técnica"
              message="¿Estás seguro de guardar la ficha técnica?"
              confirmLabel="Sí"
              onConfirm={confirmarGuardarFicha}
              onCancel={() => setConfirmGuardarFicha(false)}
            />
          )}
          {/* ── Confirmar cambio de categoría (reajusta los tamaños de la
               ficha; solo se llega aquí si el borrador ya tiene contenido) ── */}
          {confirmCategoria && (
            <ConfirmDeleteModal
              title="Cambiar categoría"
              message="Los tamaños de la ficha técnica se ajustarán a la nueva categoría. ¿Cambiar de categoría?"
              confirmLabel="Sí"
              onConfirm={() => aplicarCategoriaCrear(confirmCategoria)}
              onCancel={() => setConfirmCategoria(null)}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Pantalla completa Ver Detalle ────────────────────────────────
  if (detailItem) {
    const ficha = fichas[detailItem.id] ?? null;
    // Índice de la versión elegida en las pastillas, acotado por si la lista
    // cambió mientras el detalle estaba abierto.
    const vIdx = ficha ? Math.min(detailVIdx, ficha.length - 1) : 0;
    const fichaV = ficha ? ficha[vIdx] : null;
    const readCls = "w-full px-3 py-2 bg-muted/50 rounded-xl border border-border text-sm text-foreground";
    const tipoDetalle = tipoDe(detailItem, catName(detailItem.idCategoria));
    const llevaFichaDetalle = tipoDetalle === TIPOS_PRODUCTO[0];
    // Stock: la ficha VIGENTE manda, igual que en el listado.
    const vigente = fichaVigente(detailItem.id);
    // B3: para un Producto insumo el dato que se muestra es lo que admite
    // preparar hoy (mismo cálculo que la celda del listado) y, debajo, el
    // desglose fila por fila de la ficha contra el stock de Insumos. Con
    // varios tamaños (pizzas) el desglose se calcula uno por tamaño.
    const preparacion = llevaFichaDetalle ? prepararDe(detailItem) : null;
    // El insumo que limita puede ser distinto por tamaño (p. ej. la masa
    // limita la Mediana y el queso la Grande): el texto lo nombra por tamaño
    // y la tabla pone una píldora por cada uno.
    const limiteDetalle = preparacion ? textoLimite(preparacion.cifras) : null;
    const desglose: { tamano?: string; filas: FilaDetalle[] }[] =
      preparacion && vigente
        ? (vigente.porcionesPorTamano ?? []).length > 1
          ? (vigente.porcionesPorTamano ?? []).map((t) => ({
              tamano: t.tamano,
              filas: detalleDisponibilidad(vigente, insumos, t.tamano).filas,
            }))
          : [{ filas: detalleDisponibilidad(vigente, insumos).filas }]
        : [];
    const imagenesDetalle = imagenesDe(detailItem);
    return (
      /* Igual que Crear y Editar: altura fija sobre el viewport menos el
         AdminTopBar (h-14) y el footer del admin; fondo bg-muted/30 y cada
         columna con sus tarjetas, scrolleando por dentro solo como respaldo.
         La página NUNCA desplaza. */
      <div className="h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-3.5rem-7.25rem)] xl:h-[calc(100dvh-3.5rem-4.3125rem)] bg-muted/30 flex flex-col overflow-hidden">
        <div className="shrink-0 bg-card border-b border-border px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
              Detalle —{" "}
              {tipoDe(detailItem, catName(detailItem.idCategoria)) === TIPOS_PRODUCTO[1]
                ? presentacionDe(detailItem)
                : detailItem.nombre}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Información del producto y su ficha técnica</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setDetailItem(null)}
              className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
              Cerrar
            </button>
            {canEdit && (
              <button onClick={() => { openEdit(detailItem); setDetailItem(null); }}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                Editar
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">

          {/* ── COLUMNA IZQUIERDA: tarjeta de datos + tarjeta de imágenes ── */}
          {/* Todo va en tarjetas (igual que Crear y Editar); la columna
              scrollea por dentro si algo no cabe, nunca la página. */}
          <div className="w-full md:w-1/2 p-4 flex flex-col min-h-0">
            <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto w-full">
              <Tarjeta titulo="Datos del producto" className="shrink-0">
                {FormFields({
                  values: detailItem,
                  onChange: () => {},
                  readOnly: true,
                  mostrarEstado: true,
                })}
                {/* Stock: unidades, total de porciones y porciones por unidad
                    (según la ficha VIGENTE), en líneas cortas para que el
                    bloque quepa en 1366×768 sin barra en la columna. */}
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Stock</p>
                  {/* B1/B3/B6: un Producto insumo NO tiene stock propio: aquí
                      no se pinta `stockDisponible` (sigue guardado en el
                      producto, solo deja de mostrarse para estos productos)
                      sino cuántas unidades admite preparar HOY su ficha
                      vigente con el stock real de Insumos; sin ficha, el
                      aviso para registrarla. Las bebidas quedan como siempre
                      (sus "porciones" nunca se mostraban acá). */}
                  {llevaFichaDetalle ? (
                    preparacion ? (
                      <div className="flex flex-wrap items-baseline gap-x-3 text-sm">
                        <span className="font-bold">
                          Se pueden preparar:{" "}
                          {pintarCifras(detailItem, preparacion.cifras)}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">
                        Sin ficha técnica
                      </span>
                    )
                  ) : (
                    <div className="flex flex-wrap items-baseline gap-x-3 text-sm">
                      {/* Bebidas: umbrales únicos (0 Agotado · ≤5 crítico ·
                          ≤10 bajo · más verde), con variante oscuro. */}
                      <span className={`font-bold ${estadoStockBebida(detailItem.stockDisponible).cls}`}>
                        {textoStockBebida(detailItem)}
                      </span>
                    </div>
                  )}
                  {limiteDetalle?.texto && (
                    <p
                      className={`text-xs mt-1 ${limiteDetalle.rojo ? "font-semibold text-red-600" : "text-muted-foreground"}`}
                    >
                      {limiteDetalle.texto}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{ayudaStock(detailItem)}</p>
                  {/* B3: qué pide la ficha por unidad (uno por tamaño cuando
                      la ficha tiene varios), cuánto hay hoy en Insumos y qué
                      insumo marca el límite EN CADA TAMAÑO: con el ajuste de
                      "Limita"/"No alcanza" la píldora sale por tamaño
                      ("Limita Mediana", "Limita Grande"). */}
                  {desglose.length > 0 && (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground text-left border-b border-border">
                            <th className="py-1.5 pr-2 font-semibold">Insumo</th>
                            <th className="py-1.5 pr-2 font-semibold text-right">
                              Requerido por unidad
                            </th>
                            <th className="py-1.5 pr-2 font-semibold text-right">
                              Stock actual
                            </th>
                            <th className="py-1.5 font-semibold text-right">Límite</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {desglose[0].filas.map((f, i) => {
                            // Tamaños en los que ESTE insumo marca el mínimo
                            // (con el ajuste pueden ser varios, y cada uno con
                            // su píldora: "Limita Mediana", "Limita Grande").
                            const limitaEn = desglose
                              .filter((d) => d.filas[i]?.limita)
                              .map((d) => d.tamano);
                            return (
                            <tr key={`${f.insumoId}-${i}`}>
                              <td className="py-1.5 pr-2 align-top">
                                <span className="block text-foreground">{f.nombre}</span>
                                {f.motivo && (
                                  <span className="block text-[10px] text-red-600">
                                    {motivoFaltante(f)}
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 pr-2 text-right align-top tabular-nums text-foreground whitespace-nowrap">
                                {desglose.map((d) => (
                                  <span
                                    key={d.tamano ?? "único"}
                                    className="block leading-4"
                                  >
                                    {d.tamano ? `${d.tamano}: ` : ""}
                                    {fmtCant(
                                      d.filas[i]?.cantidad,
                                      d.filas[i]?.unidad ?? f.unidad,
                                    )}
                                  </span>
                                ))}
                              </td>
                              <td className="py-1.5 pr-2 text-right align-top tabular-nums text-muted-foreground whitespace-nowrap">
                                {fmtCant(f.stock, f.unidadStock)}
                              </td>
                              <td className="py-1.5 text-right align-top whitespace-nowrap">
                                {limitaEn.length > 0 ? (
                                  limitaEn.map((t) => (
                                    <span
                                      key={t ?? "único"}
                                      className="inline-flex px-1.5 py-0.5 mr-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                    >
                                      Limita{t ? ` ${t}` : ""}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Tarjeta>
              {/* Con 1+ imágenes se muestran las 4 casillas (portada
                  resaltada, vacías apagadas, sin X ni controles); con 0 no se
                  pinta la tarjeta. `llenarAlto` empareja el fondo con la
                  derecha cuando el producto lleva ficha. */}
              {imagenesDetalle.length > 0 && (
                <TarjetaImagenes
                  imagenes={imagenesDetalle}
                  onChange={() => {}}
                  readOnly
                  inputCls={readCls}
                  llenarAlto={llevaFichaDetalle}
                />
              )}
            </div>
          </div>

          {/* ── COLUMNA DERECHA: tarjeta de ficha técnica ── */}
          {/* Un Producto terminado no lleva ficha: tarjeta compacta con el
              mensaje del caso (igual que Crear y Editar). El Producto insumo
              muestra la ficha vigente o la versión elegida en las pastillas,
              con scroll interno en el cuerpo. */}
          <div className="w-full md:w-1/2 p-4 flex flex-col min-h-0">
            {!llevaFichaDetalle ? (
              <Tarjeta titulo="Ficha técnica">
                <div className="flex flex-col items-center justify-center text-center bg-muted/40 rounded-xl border border-border p-5 select-none">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                    <span className="text-2xl">📋</span>
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">Este producto no lleva ficha técnica</p>
                </div>
              </Tarjeta>
            ) : (
              <Tarjeta
                titulo="Ficha técnica"
                className="flex-1 min-h-0"
                scrollInterno
                acciones={
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {ficha && ficha.length > 0 && (
                      <VersionPills versiones={ficha} activo={vIdx} onSelect={setDetailVIdx} />
                    )}
                    {fichaV && (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        fichaV.fechaFin ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {fichaV.fechaFin ? "Versión histórica" : "Versión vigente"}
                      </span>
                    )}
                  </div>
                }
              >
                {/* Sin versión registrada: el estado vive DENTRO de la
                    tarjeta, bajo su encabezado. */}
                {!fichaV ? (
                  <div className="flex flex-col items-center justify-center text-center bg-muted/40 rounded-xl border border-border p-5 select-none">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                      <span className="text-2xl">📋</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">Sin ficha técnica</p>
                    <p className="text-xs text-muted-foreground">Este producto no tiene ficha técnica registrada</p>
                  </div>
                ) : (
                  <FichaTecnicaDetalle v={fichaV} readCls={readCls} modo="producto" />
                )}
              </Tarjeta>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Pantalla completa Editar Producto ─────────────────────────────
  if (editItem) {
    // La categoría define el tipo y los tamaños de la ficha; sin
    // configuración manda la respuesta a "¿Tiene ficha técnica?".
    const cfgEditar = cfgDe(editItem.idCategoria);
    const tipoEditar: TipoProducto =
      cfgEditar ? cfgEditar.tipo : tipoDe(editItem, catName(editItem.idCategoria));
    const llevaFichaEditar = tipoEditar === TIPOS_PRODUCTO[0];
    // Pregunta "¿Tiene ficha técnica?" (solo categorías SIN configuración):
    // bloqueada cuando el producto ya tiene versiones guardadas.
    const tieneHistorialFicha = (fichas[editItem.id]?.length ?? 0) > 0;
    // Bloque 1.1: nombre repetido en tiempo real, excluyéndose a sí mismo.
    // El nombre hoy está bloqueado en el form (lockNombre: el menú y el panel
    // se emparejan por nombre), así que solo saltaría con duplicados viejos en
    // los datos; queda listo por si se desbloquea al conectar la API.
    const errorNombreEdit = nombreRepetido(editItem.nombre, editItem.id)
      ? "Ya existe un producto con ese nombre"
      : errorNombreServidor;
    // Versión histórica seleccionada (null = borrador editable).
    const vSel = editFichaSel === "borrador" ? null : editFichaVersiones[editFichaSel];
    return (
      /* Misma estructura que Crear Producto: alto fijo sobre el viewport
         (AdminTopBar h-14 + footer del admin), fondo bg-muted/30 y cada
         columna scrollea por dentro; la página nunca scrollea. */
      <div className="h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-3.5rem-7.25rem)] xl:h-[calc(100dvh-3.5rem-4.3125rem)] bg-muted/30 flex flex-col overflow-hidden">
        {/* Cabecera fija: no crece ni genera scroll */}
        <div className="shrink-0 bg-card border-b border-border px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Editar — {editItem.nombre}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Completa los datos del producto y su ficha técnica</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setFichaOculta(v => !v)}
              disabled={!llevaFichaEditar}
              title={!llevaFichaEditar ? "Este producto no lleva ficha técnica" : undefined}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {fichaOculta ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {fichaOculta ? "Mostrar ficha técnica" : "Ocultar ficha técnica"}
            </button>
            <button onClick={() => { setEditItem(null); setConfirmCategoriaEdit(null); }}
              className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
              Cancelar
            </button>
            <button onClick={() => void handleEdit()}
              disabled={guardando || errorNombreEdit !== ""}
              title={errorNombreEdit || undefined}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>

        {/* Dos columnas de tarjetas: el fondo `bg-muted/30` y el `p-4` de cada
            columna son el aire alrededor (ya no hay línea divisoria). Cada
            columna scrollea por dentro, nunca la página. */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">

          {/* ── COLUMNA IZQUIERDA: tarjeta de datos + tarjeta de imágenes ── */}
          {/* Con la ficha oculta, las tarjetas ocupan el ancho (max-w-2xl
              centrado); la animación de 0,2 s la da transition-all. */}
          <div className={`${fichaOculta ? "flex-1" : "w-full md:w-1/2"} p-4 flex flex-col min-h-0 transition-all duration-200`}>
            <div className={`flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto w-full ${fichaOculta ? "max-w-2xl mx-auto" : ""}`}>
              <Tarjeta titulo="Datos del producto" className="shrink-0">
                {FormFields({
                  values: editItem,
                  onChange: (f, v) => {
                    // La categoría tiene reglas propias (confirmación al cambiar
                    // y bloqueo hacia categorías sin ficha con historial).
                    if (f === "idCategoria") {
                      solicitarCambioCategoriaEdit(String(v));
                      return;
                    }
                    if (!editItem) return;
                    const siguiente = { ...editItem, [f]: v };
                    setEditItem(siguiente);
                    setErrorNombreServidor("");
                  },
                  mostrarEstado: true,
                  lockNombre: false,
                  // Bloque 1.1: nombre repetido en tiempo real bajo el campo.
                  errorNombre: errorNombreEdit,
                  // "¿Tiene ficha técnica?" — solo para categorías SIN
                  // configuración (si no, el tipo lo da la categoría) y
                  // bloqueada si ya hay versiones guardadas.
                  trasCategoria: cfgEditar ? null : (
                    <PreguntaTieneFicha
                      valor={tipoEditar === TIPOS_PRODUCTO[0] ? "si" : "no"}
                      onElegir={(op) =>
                        setEditItem((x) =>
                          x && { ...x, tipo: op === "si" ? TIPOS_PRODUCTO[0] : TIPOS_PRODUCTO[1] }
                        )
                      }
                      bloqueada={tieneHistorialFicha}
                    />
                  ),
                })}
              </Tarjeta>
              {/* La tarjeta de Imágenes crece hasta el fondo solo con dos
                  columnas y el editor visible (igual que Crear). */}
              <TarjetaImagenes
                imagenes={imagenesDe(editItem)}
                onChange={(imgs) => setEditItem((x) => x && { ...x, imagenes: imgs, imagen: imgs[0] ?? "" })}
                inputCls={inputCls}
                llenarAlto={!fichaOculta && llevaFichaEditar}
              />
            </div>
          </div>

          {/* ── COLUMNA DERECHA: tarjeta de ficha técnica ── */}
          {/* Solo el borrador es editable; las versiones guardadas se ven en
              solo lectura. Un Producto terminado no lleva ficha: tarjeta
              compacta con el mensaje del caso (igual que Crear). La ficha se
              guarda con el botón "Guardar" del encabezado, así que la
              tarjeta va SIN footer. Al ocultarla, la columna colapsa con
              animación de 0,2 s sin borrar lo diligenciado. */}
          {!llevaFichaEditar ? (
            <div className={`flex flex-col min-h-0 transition-all duration-200 ${
              fichaOculta ? "w-0 p-0 opacity-0 overflow-hidden" : "w-full md:w-1/2 p-4 opacity-100"
            }`}>
              <Tarjeta titulo="Ficha técnica">
                <div className="flex flex-col items-center justify-center text-center bg-muted/40 rounded-xl border border-border p-5 select-none">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                    <span className="text-2xl">📋</span>
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">Este producto no lleva ficha técnica</p>
                </div>
              </Tarjeta>
            </div>
          ) : (
            <div className={`flex flex-col min-h-0 transition-all duration-200 ${
              fichaOculta ? "w-0 p-0 opacity-0 overflow-hidden" : "w-full md:w-1/2 p-4 opacity-100"
            }`}>
              <Tarjeta
                titulo="Ficha técnica"
                className="flex-1 min-h-0"
                scrollInterno
                acciones={
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <VersionPills
                      versiones={editFichaVersiones}
                      activo={editFichaSel === "borrador" ? -1 : (editFichaSel as number)}
                      onSelect={(i) => setEditFichaSel(i)}
                    />
                    <button
                      type="button"
                      onClick={() => setEditFichaSel("borrador")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        editFichaSel === "borrador" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-border"
                      }`}
                    >
                      Nueva versión (borrador)
                    </button>
                  </div>
                }
              >
                {editFichaVersiones.length > 0 && (
                  <p className="text-[11px] text-muted-foreground mb-3 bg-muted/40 px-3 py-1.5 rounded-lg">
                    Esta ficha tiene {editFichaVersiones.length} {editFichaVersiones.length === 1 ? "versión" : "versiones"}. Las versiones anteriores no se pueden modificar.
                  </p>
                )}
                {vSel ? (
                  <div className="rounded-2xl border border-border bg-muted/50 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                        Versión histórica · solo lectura
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditFichaBorrador(copiarFicha(vSel));
                          setEditFichaSel("borrador");
                          toast.success(`Contenido de v${vSel.version} copiado al borrador`);
                        }}
                        className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
                      >
                        Usar como base
                      </button>
                    </div>
                    <FichaTecnicaDetalle
                      v={vSel}
                      readCls="w-full px-3 py-2.5 bg-muted/60 rounded-xl border border-border text-sm text-muted-foreground"
                      modo="producto"
                    />
                  </div>
                ) : (
                  <FichaTecnicaEditor
                    ficha={editFichaBorrador}
                    onChange={setEditFichaBorrador}
                    insumos={insumos}
                    modo="producto"
                    inputCls={inputCls}
                    /* Los tamaños los define la categoría (o la fila única
                       "Único" de etiqueta fija, si no está configurada). */
                    tamanoFijo={tamanoFijoDe(cfgEditar)}
                  />
                )}
              </Tarjeta>
            </div>
          )}
        </div>

        {/* ── Confirmar cambio de categoría (reajusta los tamaños de la
             ficha; solo se llega aquí si el borrador ya tiene contenido) ── */}
        <AnimatePresence>
          {confirmCategoriaEdit && (
            <ConfirmDeleteModal
              title="Cambiar categoría"
              message="Los tamaños de la ficha técnica se ajustarán a la nueva categoría. ¿Cambiar de categoría?"
              confirmLabel="Sí"
              onConfirm={() => aplicarCategoriaEdit(confirmCategoriaEdit)}
              onCancel={() => setConfirmCategoriaEdit(null)}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            Gestión Producto
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {productos.length} producto{productos.length === 1 ? "" : "s"} registrado{productos.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canExportExcel && <BotonDescargarExcel onClick={exportExcel} />}
          {canCreate && (
            <button
              onClick={() => {
                setForm(emptyForm());
                setErrorNombreServidor("");
                resetFichaForm();
                setFormTieneFicha(null);
                setTieneFichaError("");
                setFichaOculta(false);
                setConfirmCategoria(null);
                setShowCreate(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md text-sm"
            >
              <Plus className="w-4 h-4" /> Crear Producto
            </button>
          )}
        </div>
      </div>

      {/* Search + filtro por tipo */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar por nombre, categoría o tipo..."
          wrapperClassName="max-w-sm flex-1"
        />
        <select
          value={filtroTipo}
          onChange={(e) => {
            setFiltroTipo(e.target.value as "Todos" | TipoProducto);
            setPage(1);
          }}
          aria-label="Filtrar por tipo"
          className="px-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
        >
          <option value="Todos">Todos</option>
          {TIPOS_PRODUCTO.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => {
            setFiltroEstado(e.target.value as "Todos" | EstadoProducto);
            setPage(1);
          }}
          aria-label="Filtrar por estado"
          className="px-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
        >
          <option value="Todos">Todos los estados</option>
          {ESTADOS_PRODUCTO.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      {/* Aviso de stock bajo (SOLO bebidas activas, sin descontinuadas): el
          texto es un BOTÓN que filtra el listado y muestra solo esas bebidas;
          el segundo clic lo apaga. Sigue a la vista mientras el filtro esté
          activo, así que siempre se puede salir. El detalle completo de los
          nombres queda en el `title`. */}
      {bebidasStockBajo.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setFiltroStockBajo((v) => !v);
            setPage(1);
          }}
          aria-pressed={filtroStockBajo}
          title={`${bebidasStockBajo.length} bebida${bebidasStockBajo.length === 1 ? "" : "s"} con stock bajo: ${bebidasStockBajo
            .map((p) => `${p.nombre} (${p.stockDisponible} ${palabraStock(p, p.stockDisponible)})`)
            .join(" · ")}${filtroStockBajo ? " — clic para quitar el filtro" : " — clic para filtrar el listado"}`}
          className={`inline-flex max-w-full items-center gap-2 mb-4 px-4 py-2 rounded-xl border text-sm cursor-pointer transition-all ${
            filtroStockBajo
              ? "bg-yellow-500 border-yellow-600 text-white shadow-md font-bold"
              : "bg-yellow-100 border-yellow-300 text-yellow-900 dark:bg-yellow-500/15 dark:border-yellow-500/40 dark:text-yellow-300 font-semibold hover:bg-yellow-200 dark:hover:bg-yellow-500/25"
          }`}
        >
          {filtroStockBajo && <span aria-hidden>✓</span>}
          <span className="font-bold whitespace-nowrap">
            {bebidasStockBajo.length} bebida{bebidasStockBajo.length === 1 ? "" : "s"} con stock bajo
          </span>
          <span className="truncate">
            · {bebidasStockBajo.slice(0, 3).map((p) => p.nombre).join(", ")}
            {bebidasStockBajo.length > 3 ? ` y ${bebidasStockBajo.length - 3} más` : ""}
          </span>
        </button>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[900px]">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {/* Sin columna "Imagen": la foto se ve en Ver detalle y en
                    Crear/Editar (aquí solo ocupaba ancho y alto). */}
                {/* Los anchos suman SIEMPRE 100 % de la tabla. `min-w-[900px]`
                    hace que por debajo de ese ancho aparezca scroll horizontal
                    en vez de apretar las columnas. El ID entra primero (5,5 %) y
                    se compensa sobre todo en Stock, que era la que más
                    sobrante tenía. Estado y Acciones quedan intactas. */}
                {[
                  { h: "Nombre", w: "w-[16.5%]" },
                  { h: "Tipo", w: "w-[14.5%]" },
                  { h: "Ficha técnica", w: "w-[12%]" },
                  { h: "Categoría", w: "w-[9%]" },
                  { h: "Precio de venta", w: "w-[9%]" },
                  { h: "Stock", w: "w-[11%]", pl: "pl-10" },
                  { h: "Estado", w: "w-[16%]" },
                  { h: "Acciones", w: "w-[12%]" },
                ].map(({ h, w, pl }) => (
                  <th
                    key={h}
                    className={`px-4 py-2 text-left font-semibold whitespace-normal break-words leading-tight ${w} ${pl ?? ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    <p className="text-4xl mb-3">📦</p>
                    <p>No se encontraron productos</p>
                  </td>
                </tr>
              ) : (
                paged.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-muted/20 transition-colors h-[61px]"
                  >
                    {/* ID numérico sin letras: de "PROD-001" muestra "001".
                        Solo cambia la presentación; `p.id` sigue siendo el
                        identificador interno (Excel, detalle, edición y
                        borrado lo siguen usando tal cual). */}
                    <td className="px-4 py-2.5 text-sm font-medium text-foreground" title={tipoDe(p, catName(p.idCategoria)) === TIPOS_PRODUCTO[1] ? presentacionDe(p) : p.nombre}>
                      {/* Nombre y, debajo, el indicador de imágenes múltiples
                          (P13): "3 imágenes". Va en su propia línea para no
                          robarle ancho al nombre de la columna fija. Las
                          bebidas muestran su presentación completa
                          ("Coca-Cola · 1.5 L · Paca x12"). */}
                      <span className="block truncate">
                        {tipoDe(p, catName(p.idCategoria)) === TIPOS_PRODUCTO[1]
                          ? presentacionDe(p)
                          : p.nombre}
                      </span>
                      <BadgeImagenes p={p} />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${tipoPillCls(tipoDe(p, catName(p.idCategoria)))}`}>
                        {tipoDe(p, catName(p.idCategoria))}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {tipoDe(p, catName(p.idCategoria)) === TIPOS_PRODUCTO[0] ? (
                        (fichas[p.id]?.length ?? 0) > 0 ? (
                          <button
                            onClick={() => {
                              setDetailItem(p);
                              setDetailVIdx(Math.max(0, (fichas[p.id]?.length ?? 1) - 1));
                            }}
                            title="Ver ficha técnica"
                            className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer transition-colors"
                          >
                            v{fichas[p.id][fichas[p.id].length - 1].version}
                          </button>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            Sin ficha
                          </span>
                        )
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                          No aplica
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-foreground truncate" title={catName(p.idCategoria)}>
                      {catName(p.idCategoria)}
                    </td>
                    {/* Precio de venta al público (precioUnitario), NO el
                        costo: antes esta columna pintaba costoUnitario. */}
                    <td
                      className="px-4 py-2.5 text-sm font-bold text-foreground"
                      style={{ fontFamily: MONO }}
                    >
                      {fmtCOP(p.precioUnitario)}
                    </td>
                    <td
                      className="pl-10 pr-4 py-2.5 align-middle"
                      title={
                        tipoDe(p, catName(p.idCategoria)) === TIPOS_PRODUCTO[0]
                          ? `${p.stockDisponible} ${palabraStock(p, p.stockDisponible)}`
                          : textoStockBebida(p)
                      }
                    >
                      {/* Producto insumo (pizzas/lasañas): solo la cantidad
                          real de stock (`stockDisponible`), tal cual se veía
                          antes: ej. "50". Con los umbrales viejos de color:
                          ≤5 rojo, ≤15 amarillo, más de 15 verde. Las bebidas
                          quedan EXACTAMENTE como estaban. "Ver detalle" y el
                          Excel siguen usando el cálculo "Se pueden preparar". */}
                      {tipoDe(p, catName(p.idCategoria)) === TIPOS_PRODUCTO[0] ? (
                        <span
                          className={`block text-sm font-bold leading-5 whitespace-nowrap ${p.stockDisponible <= 5 ? "text-red-600 dark:text-red-400" : p.stockDisponible <= 15 ? "text-yellow-600 dark:text-yellow-400" : "text-emerald-600 dark:text-emerald-400"}`}
                        >
                          {p.stockDisponible}
                        </span>
                      ) : (
                        <span
                          className="block"
                          title={textoStockBebida(p)}
                        >
                          <span
                            className={`block text-sm font-bold leading-5 whitespace-nowrap ${estadoStockBebida(p.stockDisponible).cls}`}
                          >
                            {textoStockBebida(p)}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {canEdit ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Acciones de estado (actual: ${p.estado}) para ${p.nombre}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold whitespace-nowrap cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
                              style={{
                                backgroundColor: `${ESTADO_COLORES[p.estado]}1A`,
                                color: ESTADO_COLORES[p.estado],
                                fontSize: 13,
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ESTADO_COLORES[p.estado] }} />
                              {p.estado}
                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              disabled={p.estado === "Descontinuado"}
                              onSelect={() => setConfirmEstado({
                                id: p.id,
                                nombre: p.nombre,
                                current: p.estado,
                                next: "Descontinuado",
                              })}
                            >
                              Descontinuado
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => setConfirmEstado({
                                id: p.id,
                                nombre: p.nombre,
                                current: p.estado,
                                next: "Automático",
                              })}
                            >
                              Disponible
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <EstadoBadge estado={p.estado} />
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <ActionIcons
                        onView={() => {
                          setDetailItem(p);
                          // Abre mostrando la versión vigente (la última).
                          setDetailVIdx(Math.max(0, (fichas[p.id]?.length ?? 1) - 1));
                        }}
                        onEdit={canEdit ? () => openEdit(p) : undefined}
                        onDelete={canDelete ? () => setDeleteId(p.id) : undefined}
                        // Bloque 1.2: la acción es "Descontinuar", no borrar.
                        deleteLabel="Descontinuar"
                        deleteTitle={
                          p.estado === "Descontinuado"
                            ? "Ya está descontinuado"
                            : "Descontinuar"
                        }
                        deleteDisabled={p.estado === "Descontinuado"}
                      />
                      {/* Bloque 4: la ficha vieja guardada en este navegador se
                          sube a mano; nunca sola. */}
                      {(fichasRespaldo[p.id]?.length ?? 0) > 0 &&
                        (fichas[p.id]?.length ?? 0) === 0 && (
                          <button
                            type="button"
                            onClick={() => void subirFichaGuardada(p)}
                            disabled={subiendoFicha === p.id}
                            title="Subir a la API la ficha guardada en este navegador"
                            className="mt-1 px-2 py-1 rounded-lg bg-card border border-border text-[10px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {subiendoFicha === p.id ? "Subiendo…" : "Subir ficha guardada"}
                          </button>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > 0 && (
        <Paginador pagina={page} totalPaginas={totalPages} onCambio={setPage} />
      )}


      {/* ── Descontinuar (bloque 1.2; antes era "Eliminar producto") ── */}
      <AnimatePresence>
        {deleteId && (
          <ConfirmDeleteModal
            title="Descontinuar producto"
            message={
              <>
                ¿Seguro que deseas descontinuar el producto{" "}
                <strong className="text-foreground">
                  {productos.find((x) => x.id === deleteId)?.nombre ?? deleteId}
                </strong>
                ? El producto sale del menú pero se conserva su historial y su
                ficha técnica.
              </>
            }
            confirmLabel="Descontinuar"
            loading={guardando}
            onConfirm={() => handleDescontinuar(deleteId)}
            onCancel={() => !guardando && setDeleteId(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Confirmar cambio de estado ── */}
      <AnimatePresence>
        {confirmEstado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
              className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>
                  ¿Desea cambiar el estado del producto?
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                El producto <strong className="text-foreground">{confirmEstado.nombre}</strong> pasará de:
              </p>
              <div className="flex items-center gap-3 mb-5 px-3 py-3 rounded-xl bg-muted/50 border border-border">
                <EstadoBadge estado={confirmEstado.current} />
                <span className="text-muted-foreground text-sm">→</span>
                {confirmEstado.next === "Descontinuado" ? (
                  <EstadoBadge estado={confirmEstado.next} />
                ) : (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold whitespace-nowrap ${ESTADO_PRODUCTO_CLASES["No disponible"]}`} style={{ fontSize: 13 }}>
                    Automático
                  </span>
                )}
              </div>
              {confirmEstado.next === "Descontinuado" && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">
                  El producto dejará de mostrarse en el menú.
                </p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setConfirmEstado(null)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                  Cancelar
                </button>
                <button disabled={guardando} onClick={() => {
                  if (guardandoRef.current) return;
                  if (!onCambiarEstadoEnServidor) {
                    toast.error("No está disponible la conexión con Productos API.");
                    return;
                  }
                  guardandoRef.current = true;
                  setGuardando(true);
                  void (async () => {
                    try {
                      const actualizado = await onCambiarEstadoEnServidor(confirmEstado.id, confirmEstado.next);
                      setConfirmEstado(null);
                      toast.success(
                        confirmEstado.next === "Automático"
                          ? `Estado recalculado: ${actualizado.estado}`
                          : `Estado cambiado a: ${actualizado.estado}`,
                      );
                    } catch (error) {
                      toast.error(mensajeErrorProductos(error, "No se pudo cambiar el estado."));
                    } finally {
                      guardandoRef.current = false;
                      setGuardando(false);
                    }
                  })();
                }}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 disabled:opacity-50">
                  {guardando ? "Guardando…" : "Confirmar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
