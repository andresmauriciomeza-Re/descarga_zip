import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  AlertCircle,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { InsumoSearchField, resolverInsumo } from "../components/InsumoSearchField";
import { BotonDescargarExcel } from "../components/BotonDescargarExcel";
import { exportarExcelEstilizado } from "../utils/exportExcelEstilizado";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import {
  EstadoBadge,
  ESTADOS_PRODUCTO,
  ESTADO_COLORES,
  type EstadoProducto,
} from "../components/EstadoProducto";
import { EstadoSelect } from "../components/EstadoSelect";
import { SearchInput } from "../components/SearchInput";
import { ActionIcons } from "../components/ActionIcons";
import type { Insumo } from "./GestionInsumosScreen";
import { estadoDe, type CategoriaProducto } from "./CategoriaProductoScreen";

const SERIF = "var(--font-titulo)";
const MONO = "var(--font-texto)";

// ─────────────────────────── GESTIÓN PRODUCTOS ───────────────────────────

/** "Producto insumo": se elabora con insumos y lleva ficha técnica (pizzas,
    lasañas). "Producto": se revende tal como se compra, sin ficha (gaseosas). */
export const TIPOS_PRODUCTO = ["Producto insumo", "Producto"] as const;
export type TipoProducto = (typeof TIPOS_PRODUCTO)[number];

/** Tipo del producto con respaldo para datos viejos sin `tipo`: las
    categorías CAT-001 y CAT-002 son "Producto insumo" y el resto "Producto". */
export const tipoDe = (p: { idCategoria: string; tipo?: TipoProducto }): TipoProducto => {
  if (p.tipo === TIPOS_PRODUCTO[0] || p.tipo === TIPOS_PRODUCTO[1]) return p.tipo;
  return p.idCategoria === "CAT-001" || p.idCategoria === "CAT-002" ? TIPOS_PRODUCTO[0] : TIPOS_PRODUCTO[1];
};

/** Pastilla de color por tipo (índice, detalle, Crear/Editar). */
export const tipoPillCls = (t: TipoProducto): string =>
  t === TIPOS_PRODUCTO[0]
    ? "bg-orange-100 text-orange-800"
    : "bg-sky-100 text-sky-800";

// Los estados y sus colores viven en components/EstadoProducto.tsx (de ahí
// salen EstadoBadge y EstadoProductoSelect). Se reexportan para no romper
// importaciones existentes.
export { ESTADOS_PRODUCTO, ESTADO_COLORES } from "../components/EstadoProducto";
export type { EstadoProducto } from "../components/EstadoProducto";

/** Clases Tailwind del pill de estado de la tabla (diseño de Proveedores),
    con el mismo tono de ESTADO_COLORES y su variante dark translúcida. */
const ESTADO_PRODUCTO_CLASES: Record<EstadoProducto, string> = {
  Disponible: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  "No disponible": "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
  Descontinuado: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
};

export interface Producto {
  id: string;
  imagen: string;
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
      carrito). */
  precioUnitario: number;
  unidadVenta: string;
  stockDisponible: number;
  estado: EstadoProducto;
}

const CATEGORIAS_PRODUCTO = [
  { id: "CAT-001", nombre: "Pizzas" },
  { id: "CAT-002", nombre: "Lasañas" },
  { id: "CAT-003", nombre: "Bebidas" },
];

export const INITIAL_PRODUCTOS: Producto[] = [
  // ── Pizzas (CAT-001): $14.000 pequeña, $16.000 grande ──
  {
    id: "PROD-001",
    imagen: "/src/imports/pizzaDefinitiva.png",
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
    imagen: "/src/imports/pizzaDefinitivaCompleta.png",
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
    imagen: "/src/imports/pizzafondo-removebg-preview.png",
    nombre: "Pizza Hawai",
    idCategoria: "CAT-001",
    tipo: TIPOS_PRODUCTO[0],
    costoUnitario: 14000, precioUnitario: 14000,
    unidadVenta: "und",
    stockDisponible: 40,
    estado: "Disponible",
  },
  {
    id: "PROD-004",
    imagen: "/src/imports/image-1.png",
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
    imagen: "/src/imports/image-2.png",
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
    imagen: "/src/imports/image-3.png",
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
    imagen: "/src/imports/image-4.png",
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
    imagen: "/src/imports/image-5.png",
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
    imagen: "/src/imports/lasaña_carne.png",
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
    imagen: "/src/imports/lasaña_pollo.png",
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
    imagen: "/src/imports/lasaña_mixta.png",
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
    imagen: "/src/imports/Quatro.png",
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
    imagen: "/src/imports/Premio.png",
    nombre: "Gaseosa Premiun",
    idCategoria: "CAT-003",
    tipo: TIPOS_PRODUCTO[1],
    costoUnitario: 3500, precioUnitario: 3500,
    unidadVenta: "und",
    stockDisponible: 80,
    estado: "Disponible",
  },
  {
    id: "PROD-014",
    imagen: "/src/imports/Coca-Cola.png",
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
    imagen: "/src/imports/Pepsi.png",
    nombre: "Gaseosa Pepsi",
    idCategoria: "CAT-003",
    tipo: TIPOS_PRODUCTO[1],
    costoUnitario: 2500, precioUnitario: 2500,
    unidadVenta: "und",
    stockDisponible: 100,
    estado: "Disponible",
  },
];

export interface RInsumo { nombre: string; cantidad: number; unidad: string; }

/** Tamaños que admite la lista "Porciones por tamaño" de la ficha. */
export const TAMANOS_FICHA = ["Grande", "Mediana", "Normal"] as const;
export type TamanoFicha = (typeof TAMANOS_FICHA)[number];
export interface PorcionesTamano { tamano: TamanoFicha; porciones: number; }

export interface FichaVersion {
  version: number;
  idReceta: string;
  tiempoPreparacion: number;
  porciones: number;
  /** Porciones por tamaño (campo nuevo, opcional y solo de Crear). `porciones`
      siempre refleja la PRIMERA fila: es el que siguen leyendo Detalle,
      Editar, el cálculo de stock y Orden de Producción. */
  porcionesPorTamano?: PorcionesTamano[];
  insumos: RInsumo[];
  pasos: string[];
  fechaInicio: string;
  fechaFin: string | null;
}
/** Fichas técnicas por id de producto, indexadas por producto. Vive en App
    (lo consume OrdenProduccionScreen para calcular qué se consume en un pedido). */
export type FichasPorProducto = Record<string, FichaVersion[]>;

/** Ficha de ejemplo para que un pedido tenga insumos que descontar desde el
    primer arranque. Apunta a insumos REALES del catálogo: las fichas guardan el
    nombre del insumo (no su id) y ese nombre es el que se busca después. */
const UNIDADES_FICHA = ["kg", "g", "lt", "ml", "und", "paq", "caja"];

/** Copia profunda de una versión de ficha: el borrador de Editar nunca toca
    las versiones ya guardadas. */
export const copiarFicha = (v: FichaVersion): FichaVersion => ({
  ...v,
  insumos: v.insumos.map((i) => ({ ...i })),
  pasos: [...v.pasos],
});

/** Compara solo el contenido editable de la ficha (no versión ni fechas):
    si nada de esto cambió al guardar, no se crea una versión nueva. */
export const fichaTieneCambios = (a: FichaVersion, b: FichaVersion): boolean =>
  a.tiempoPreparacion !== b.tiempoPreparacion ||
  a.porciones !== b.porciones ||
  JSON.stringify(a.insumos) !== JSON.stringify(b.insumos) ||
  JSON.stringify(a.pasos) !== JSON.stringify(b.pasos);

/** Sin fichas de ejemplo: los productos de fábrica nacen SIN ficha técnica y la
    primera que se cree recibe el ID 001 (ver `siguienteNumeroFicha`). */
export const INITIAL_FICHAS: FichasPorProducto = {};

/** Mueve un elemento de una lista una posicion. Funcion pura: no muta la entrada. */
export function moverEnLista<T>(lista: T[], desde: number, dir: -1 | 1): T[] {
  const hasta = desde + dir;
  if (desde < 0 || desde >= lista.length || hasta < 0 || hasta >= lista.length) return lista;
  const copia = [...lista];
  [copia[desde], copia[hasta]] = [copia[hasta], copia[desde]];
  return copia;
}

/**
 * Fila en edición de un insumo de la ficha: la cantidad se corrige con un
 * input de borde visible y botones −/+, la unidad con un select visible, y se
 * confirma con ✓ o se descarta con ✗. Los cambios locales solo se aplican al
 * borrador al aceptar.
 */
function InsumoFilaEditable({
  ins,
  onSave,
  onCancel,
}: {
  ins: RInsumo;
  onSave: (r: RInsumo) => void;
  onCancel: () => void;
}) {
  const [cantidad, setCantidad] = useState(ins.cantidad);
  const [unidad, setUnidad] = useState(ins.unidad);
  const inputNumCls =
    "w-20 px-2 py-1 bg-card rounded-lg border border-border text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  return (
    <>
      <td className="px-3 py-2 text-sm font-medium text-foreground">{ins.nombre}</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Disminuir"
            onClick={() => setCantidad((c) => Math.max(0, Math.round((c - 0.1) * 100) / 100))}
            className="w-6 h-6 shrink-0 rounded-lg border border-border bg-card text-sm font-bold text-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            −
          </button>
          <input
            autoFocus
            type="number"
            min={0}
            step={0.1}
            value={cantidad}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n >= 0) setCantidad(n);
            }}
            className={inputNumCls}
          />
          <button
            type="button"
            title="Aumentar"
            onClick={() => setCantidad((c) => Math.round((c + 0.1) * 100) / 100)}
            className="w-6 h-6 shrink-0 rounded-lg border border-border bg-card text-sm font-bold text-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            +
          </button>
        </div>
      </td>
      <td className="px-3 py-2">
        <select
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
          className="px-2 py-1 bg-card rounded-lg border border-border text-sm font-mono text-foreground focus:outline-none cursor-pointer"
        >
          {UNIDADES_FICHA.map((u) => <option key={u}>{u}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Aceptar"
            onClick={() => onSave({ nombre: ins.nombre, cantidad, unidad })}
            className="p-1.5 rounded-lg hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600 cursor-pointer transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Cancelar"
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </>
  );
}

/**
 * Tabla "Insumos de la receta", con el mismo patrón de la tabla de insumos de
 * Orden de Compra: lápiz (Editar) y basurero (Eliminar). Con el lápiz la fila
 * pasa a edición en el sitio (solo una fila a la vez). En versiones
 * históricas (`editable = false`) no se muestran ni lápiz ni basurero.
 */
function InsumosFichaTable({
  insumos,
  editable,
  editandoIdx,
  onEdit,
  onChange,
  onRemove,
}: {
  insumos: RInsumo[];
  editable: boolean;
  editandoIdx: number | null;
  onEdit: (idx: number | null) => void;
  onChange: (idx: number, patch: Partial<RInsumo>) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full">
        <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Insumo</th>
            <th className="px-3 py-2 text-left font-semibold">Cantidad</th>
            <th className="px-3 py-2 text-left font-semibold">Unidad</th>
            {editable && <th className="px-3 py-2 text-left font-semibold">Acciones</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {insumos.map((ins, idx) => (
            <tr key={`${ins.nombre}-${idx}`} className="bg-muted/40">
              {editable && editandoIdx === idx ? (
                <InsumoFilaEditable
                  key={idx}
                  ins={ins}
                  onSave={(r) => {
                    onChange(idx, r);
                    onEdit(null);
                  }}
                  onCancel={() => onEdit(null)}
                />
              ) : (
                <>
                  <td className="px-3 py-2 text-sm font-medium text-foreground">{ins.nombre}</td>
                  <td className="px-3 py-2 text-sm text-muted-foreground font-mono">{ins.cantidad}</td>
                  <td className="px-3 py-2 text-sm text-muted-foreground font-mono">{ins.unidad}</td>
                  {editable && (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => onEdit(idx)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={() => onRemove(idx)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function emptyFichaVersion(n: number, fechaInicio?: string): FichaVersion {
  return {
    version: n,
    // Vacío: el ID real se asigna al GUARDAR (número de ficha consecutivo y
    // único). Mientras tanto la pantalla muestra el que le tocaría.
    idReceta: "",
    tiempoPreparacion: 0,
    porciones: 1,
    insumos: [],
    pasos: [],
    fechaInicio: fechaInicio ?? new Date().toISOString(),
    fechaFin: null,
  };
}

/** Número de una ficha, tal como se muestra: "001". Es el ÚNICO punto donde el
    dato se convierte en texto visible, así que también tolera los IDs viejos
    guardados como "REC-001". */
export const numeroDeFicha = (idReceta: string): string =>
  idReceta.replace("REC-", "").padStart(3, "0").trim();

/** Número con que se vería una ficha recién guardada. */
const numeroNuevoFicha = (n: number): string => String(n).padStart(3, "0");

/** Siguiente número de ficha: mayor sufijo + 1, calculado SOBRE LAS FICHAS DE
    PRODUCTOS QUE EXISTEN. Las huérfanas (de un producto ya borrado) no consumen
    número, así la secuencia se mantiene consecutiva, sin huecos y arrancando
    en 001. */
export const siguienteNumeroFicha = (fichas: FichasPorProducto, productos: Producto[]): number => {
  const existentes = new Set(productos.map((p) => p.id));
  return (
    Object.entries(fichas)
      .filter(([idProducto]) => existentes.has(idProducto))
      .flatMap(([, versiones]) => versiones.map((v) => parseInt(numeroDeFicha(v.idReceta), 10) || 0))
      .reduce((max, n) => Math.max(max, n), 0) + 1
  );
};

/** ID visible de una ficha: su número si ya existe; si es un borrador sin
    guardar (producto sin ficha), el que le tocará al guardarse. */
export const idFichaVisible = (v: FichaVersion, fichas: FichasPorProducto, productos: Producto[]): string =>
  v.idReceta ? numeroDeFicha(v.idReceta) : numeroNuevoFicha(siguienteNumeroFicha(fichas, productos));

/** Fechas fijas con que venían las fichas de ejemplo del código: la primera
    semilla usaba "2024-01-01" y las siguientes "2026-01-15T00:00:00.000Z".
    Una ficha real siempre guarda `new Date().toISOString()`, así que con estas
    dos marcas se reconocen las fichas semilla que quedaron en localStorage y
    se descartan al cargar: no deben seguir ocupando número. */
const FECHAS_FICHA_SEMILLA = ["2024-01-01", "2026-01-15T00:00:00.000Z"];

/** Limpia y reasigna los ID de las fichas leídas de localStorage. Se aplican
    dos reglas, en este orden:
    1. Se DESCARTAN las fichas de productos que ya no existen (huérfanas) y
       las fichas semilla del código viejo: ninguna debe seguir consumiendo
       número de ficha.
    2. A las que quedan se les reasigna un ID único y consecutivo siguiendo el
       orden del id de producto: todas las versiones de un producto comparten
       el mismo número. Solo cambia `idReceta`; versiones, fechas y contenido
       quedan intactos. Así también se corrigen los "REC-001" duplicados que
       dejó el dato viejo. */
export const normalizarIdsFicha = (fichas: FichasPorProducto, idsExistentes?: string[]): FichasPorProducto => {
  const ordenId = (id: string) => parseInt(id.replace(/\D+/g, ""), 10) || 0;
  const existentes = idsExistentes ? new Set(idsExistentes) : null;
  const salida: FichasPorProducto = {};
  let n = 1;
  for (const id of Object.keys(fichas).sort((a, b) => ordenId(a) - ordenId(b))) {
    if (existentes && !existentes.has(id)) continue;
    const versiones = fichas[id].filter((v) => !FECHAS_FICHA_SEMILLA.includes(v.fechaInicio));
    if (versiones.length === 0) continue;
    const idFicha = numeroNuevoFicha(n++);
    salida[id] = versiones.map((v) => ({ ...v, idReceta: idFicha }));
  }
  return salida;
};

/** Borrador de la ficha en Crear: v1 vacía con la primera fila de
    "Porciones por tamaño" (Grande, 1 porción, igual que el valor único de
    antes). El resto de pantallas sigue usando `emptyFichaVersion`. */
const nuevoBorradorFicha = (): FichaVersion => ({
  ...emptyFichaVersion(1),
  porcionesPorTamano: [{ tamano: TAMANOS_FICHA[0], porciones: 1 }],
});

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

/** Vista de solo lectura de una versión de la ficha: la usan Ver detalle y,
    para las versiones históricas, la pantalla Editar.
    En Ver detalle la columna derecha no tiene scroll: los bloques de arriba
    son `shrink-0` y la LISTA DE PASOS (y solo ella) crece con el espacio
    libre y desplaza dentro de su propio recuadro cuando la receta es larga. */
function FichaReadOnly({ v, readCls }: { v: FichaVersion; readCls: string }) {
  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
      <div className="shrink-0">
        <p className="text-xs font-semibold text-muted-foreground mb-0.5">ID</p>
        {/* Solo el número ("001"): el dato viejo con prefijo lo limpia la misma función. */}
        <div className={readCls}>{numeroDeFicha(v.idReceta)}</div>
      </div>
      {/* Tiempo de preparación y Porciones en una sola fila (2 columnas). */}
      <div className="shrink-0 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-0.5">Tiempo de preparación (min)</p>
          <div className={readCls}>{v.tiempoPreparacion}</div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-0.5">Porciones por tamaño</p>
          {v.porcionesPorTamano?.map((pt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{pt.tamano}</span>
              <span className="text-sm text-foreground">{pt.porciones}</span>
            </div>
          ))}
          {!v.porcionesPorTamano?.length && (
            <span className="text-xs text-muted-foreground">Normal: {v.porciones}</span>
          )}
        </div>
      </div>
      {/* Insumos: tabla compacta (Insumo | Cantidad | Unidad) con filas de
          menor alto en lugar de las tarjetas apiladas. */}
      <div className="shrink-0">
        <p className="text-xs font-semibold text-muted-foreground mb-1">Insumos</p>
        {v.insumos.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Sin insumos registrados</p>
        ) : (
          <div className="rounded-xl overflow-hidden border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="px-3 py-1 text-left font-semibold">Insumo</th>
                  <th className="px-3 py-1 text-right font-semibold">Cantidad</th>
                  <th className="px-3 py-1 text-right font-semibold">Unidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-muted/40">
                {v.insumos.map((ins, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-1 font-medium text-foreground">{ins.nombre}</td>
                    <td className="px-3 py-1 text-right text-xs text-muted-foreground font-mono">{ins.cantidad}</td>
                    <td className="px-3 py-1 text-right text-xs text-muted-foreground font-mono">{ins.unidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Pasos: lista numerada compacta. Es el ÚNICO scroller del detalle. */}
      <div className="flex flex-col min-h-0 flex-1">
        <p className="shrink-0 text-xs font-semibold text-muted-foreground mb-1">Preparación (pasos de elaboración)</p>
        {(v.pasos ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Sin pasos registrados</p>
        ) : (
          <ol className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1">
            {(v.pasos ?? []).map((paso, idx) => (
              <li key={idx} className="flex items-start gap-2 px-3 py-1 bg-muted/40 rounded-xl border border-border">
                <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">{idx + 1}</span>
                <span className="flex-1 text-sm text-foreground leading-snug">{paso}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export function GestionProductosScreen({
  productos,
  setProductos,
  insumos,
  fichas: fichasExternas,
  setFichas: setFichasExternas,
  categorias,
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
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExportExcel?: boolean;
}) {
  const opcionesCategoriaBase = categorias ?? CATEGORIAS_PRODUCTO;
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"Todos" | TipoProducto>("Todos");
  const [filtroEstado, setFiltroEstado] = useState<"Todos" | EstadoProducto>("Todos");
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
    id: string; nombre: string; current: EstadoProducto; next: EstadoProducto;
  } | null>(null);

  const emptyForm = (): Omit<Producto, "id"> => ({
    imagen: "",
    nombre: "",
    idCategoria: "",
    tipo: TIPOS_PRODUCTO[0],
    costoUnitario: 0, precioUnitario: 0,
    unidadVenta: "und",
    stockDisponible: 0,
    estado: "Disponible",
  });
  const [form, setForm] = useState(emptyForm());
  // "¿Tiene ficha técnica?" (Crear): null = sin selección; de ahí sale el tipo
  // (Sí = Producto insumo, No = Producto). Se valida en tiempo real.
  const [formTieneFicha, setFormTieneFicha] = useState<"si" | "no" | null>(null);
  const [tieneFichaError, setTieneFichaError] = useState("");
  // Oculta la columna de ficha en Crear/Editar sin borrar lo diligenciado:
  // la ficha se guarda igual con el botón principal.
  const [fichaOculta, setFichaOculta] = useState(false);

  // Ficha técnica state
  const fichas = fichasExternas;
  const setFichas = setFichasExternas;
  const elegirTieneFicha = (v: "si" | "no") => {
    setFormTieneFicha(v);
    setTieneFichaError("");
    setForm((p) => ({ ...p, tipo: v === "si" ? TIPOS_PRODUCTO[0] : TIPOS_PRODUCTO[1] }));
  };

  // Ficha técnica de Crear: un solo BORRADOR que se guarda como v1 junto con
  // el producto (no se crean versiones antes de que el producto exista). El
  // botón "Guardar Ficha Técnica" solo valida y lo marca como guardado.
  const [fichaBorrador, setFichaBorrador] = useState<FichaVersion>(nuevoBorradorFicha);
  const [fichaInsumoNombre, setFichaInsumoNombre] = useState("");
  const [fichaInsumoCantidad, setFichaInsumoCantidad] = useState(1);
  const [fichaInsumoUnidad, setFichaInsumoUnidad] = useState("kg");
  // Insumo elegido en el buscador. Mientras sea null solo hay texto escrito, y
  // esa búsqueda no cuenta como selección al agregar.
  const [fichaInsumoSel, setFichaInsumoSel] = useState<Insumo | null>(null);
  // Fila de la tabla de insumos abierta en edición (crear). Solo una a la vez.
  const [fichaEditandoIdx, setFichaEditandoIdx] = useState<number | null>(null);
  const [fichaPaso, setFichaPaso] = useState("");
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
  const [editFichaInsumoNombre, setEditFichaInsumoNombre] = useState("");
  const [editFichaInsumoCantidad, setEditFichaInsumoCantidad] = useState(1);
  const [editFichaInsumoUnidad, setEditFichaInsumoUnidad] = useState("kg");
  const [editFichaInsumoSel, setEditFichaInsumoSel] = useState<Insumo | null>(null);
  // Fila de la tabla de insumos abierta en edición (editar). Solo una a la vez.
  const [editFichaEditandoIdx, setEditFichaEditandoIdx] = useState<number | null>(null);
  const [editFichaPaso, setEditFichaPaso] = useState("");

  const resetFichaForm = () => {
    setFichaBorrador(nuevoBorradorFicha());
    setFichaInsumoNombre("");
    setFichaInsumoCantidad(1);
    setFichaInsumoUnidad("kg");
    setFichaInsumoSel(null);
    setFichaPaso("");
    setConfirmGuardarFicha(false);
    setFichaGuardadaEn(null);
  };

  const updateFichaField = (field: keyof Omit<FichaVersion, "insumos" | "version">, value: string | number) =>
    setFichaBorrador(prev => ({ ...prev, [field]: value }));

  // ── "Porciones por tamaño" (solo el borrador de Crear) ─────────────
  const filasTamano = (): PorcionesTamano[] =>
    fichaBorrador.porcionesPorTamano ?? [{ tamano: TAMANOS_FICHA[0], porciones: fichaBorrador.porciones }];

  /** Escribe las filas y mantiene `porciones` = primera fila, para que el
      resto de pantallas siga leyendo el campo de siempre. */
  const setFilasTamano = (filas: PorcionesTamano[]) =>
    setFichaBorrador(prev => ({ ...prev, porcionesPorTamano: filas, porciones: filas[0].porciones }));

  const addTamano = () => {
    const usados = filasTamano().map((f) => f.tamano);
    const libre = TAMANOS_FICHA.find((t) => !usados.includes(t));
    if (!libre) return;
    setFilasTamano([...filasTamano(), { tamano: libre, porciones: 1 }]);
  };

  const removeTamano = (idx: number) => {
    const filas = filasTamano();
    if (filas.length > 1) setFilasTamano(filas.filter((_, i) => i !== idx));
  };

  // Elige el tamaño de una fila; un tamaño ya usado en otra fila queda
  // deshabilitado y aquí se descarta por seguridad.
  const updateTamano = (idx: number, tamano: TamanoFicha) => {
    const filas = filasTamano();
    if (filas.some((f, i) => i !== idx && f.tamano === tamano)) return;
    setFilasTamano(filas.map((f, i) => (i === idx ? { ...f, tamano } : f)));
  };

  const updatePorcionesTamano = (idx: number, n: number) => {
    if (!Number.isFinite(n) || n < 0) return;
    setFilasTamano(filasTamano().map((f, i) => (i === idx ? { ...f, porciones: n } : f)));
  };

  // ── "Porciones por tamaño" para Editar (igual que Crear, pero sobre
  //     editFichaBorrador). Si la ficha antigua solo tenía un número de
  //     porciones, se muestra como una fila con tamaño "Normal". ─────
  const editFilasTamano = (): PorcionesTamano[] =>
    editFichaBorrador.porcionesPorTamano ??
    [{ tamano: TAMANOS_FICHA[2], porciones: editFichaBorrador.porciones }];

  const editSetFilasTamano = (filas: PorcionesTamano[]) =>
    setEditFichaBorrador(prev => ({ ...prev, porcionesPorTamano: filas, porciones: filas[0].porciones }));

  const editAddTamano = () => {
    const usados = editFilasTamano().map((f) => f.tamano);
    const libre = TAMANOS_FICHA.find((t) => !usados.includes(t));
    if (!libre) return;
    editSetFilasTamano([...editFilasTamano(), { tamano: libre, porciones: 1 }]);
  };

  const editRemoveTamano = (idx: number) => {
    const filas = editFilasTamano();
    if (filas.length > 1) editSetFilasTamano(filas.filter((_, i) => i !== idx));
  };

  // Elige el tamaño de una fila; un tamaño ya usado en otra fila queda
  // deshabilitado y aquí se descarta por seguridad.
  const editUpdateTamano = (idx: number, tamano: TamanoFicha) => {
    const filas = editFilasTamano();
    if (filas.some((f, i) => i !== idx && f.tamano === tamano)) return;
    editSetFilasTamano(filas.map((f, i) => (i === idx ? { ...f, tamano } : f)));
  };

  const editUpdatePorcionesTamano = (idx: number, n: number) => {
    if (!Number.isFinite(n) || n < 0) return;
    editSetFilasTamano(
      editFilasTamano().map((f, i) => (i === idx ? { ...f, porciones: n } : f)),
    );
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

  // Al elegir del buscador se autocompleta la "Medida" con la unidad
  // del catálogo; sigue siendo editable a mano después.
  const seleccionarFichaInsumo = (ins: Insumo) => {
    setFichaInsumoSel(ins);
    setFichaInsumoNombre(ins.nombre);
    setFichaInsumoUnidad(
      UNIDADES_FICHA.includes(ins.unidadMedida) ? ins.unidadMedida : UNIDADES_FICHA[0]
    );
  };

  const seleccionarEditFichaInsumo = (ins: Insumo) => {
    setEditFichaInsumoSel(ins);
    setEditFichaInsumoNombre(ins.nombre);
    setEditFichaInsumoUnidad(
      UNIDADES_FICHA.includes(ins.unidadMedida) ? ins.unidadMedida : UNIDADES_FICHA[0]
    );
  };

  // Solo se agrega un insumo que exista en el catálogo: o se seleccionó del
  // buscador, o el texto escrito coincide exactamente con un insumo real.
  // Nunca se admite texto libre.
  const addFichaInsumo = () => {
    const ins = fichaInsumoSel ?? resolverInsumo(insumos, fichaInsumoNombre);
    if (!ins) {
      toast.error("Selecciona un insumo del catálogo de Insumos");
      return;
    }
    // No se puede repetir un insumo en la ficha: se edita en la tabla.
    if (fichaBorrador.insumos.some((i) => i.nombre === ins.nombre)) {
      toast.error("Este insumo ya está en la ficha; edítalo en la tabla");
      return;
    }
    setFichaBorrador(prev => ({
      ...prev,
      insumos: [...prev.insumos, { nombre: ins.nombre, cantidad: fichaInsumoCantidad, unidad: fichaInsumoUnidad }],
    }));
    setFichaInsumoNombre(""); setFichaInsumoCantidad(1); setFichaInsumoSel(null);
  };

  const removeFichaInsumo = (idx: number) =>
    setFichaBorrador(prev => ({ ...prev, insumos: prev.insumos.filter((_, j) => j !== idx) }));

  // Corrige en el sitio la cantidad/unidad de un insumo ya agregado.
  const updateFichaInsumo = (idx: number, patch: Partial<RInsumo>) =>
    setFichaBorrador(prev => ({
      ...prev,
      insumos: prev.insumos.map((ins, j) => (j === idx ? { ...ins, ...patch } : ins)),
    }));

  // Reordena los pasos de preparacion. El numero de cada paso se recalcula solo
  // porque la lista se renderiza con la posicion (idx + 1).
  const moverFichaPaso = (idx: number, dir: -1 | 1) =>
    setFichaBorrador(prev => ({ ...prev, pasos: moverEnLista(prev.pasos, idx, dir) }));

  const addFichaPaso = () => {
    if (!fichaPaso.trim()) return;
    setFichaBorrador(prev => ({ ...prev, pasos: [...prev.pasos, fichaPaso.trim()] }));
    setFichaPaso("");
  };

  const removeFichaPaso = (idx: number) =>
    setFichaBorrador(prev => ({ ...prev, pasos: prev.pasos.filter((_, j) => j !== idx) }));

  // ── Edit-ficha helpers (todo escribe sobre el borrador) ──────────
  const openEdit = (p: Producto) => {
    setEditItem({ ...p });
    const guardadas = (fichas[p.id] ?? []).map(copiarFicha);
    setEditFichaVersiones(guardadas);
    // El borrador arranca como copia de la última versión guardada; si el
    // producto aún no tiene ficha, parte de una v1 vacía.
    setEditFichaBorrador(guardadas.length > 0 ? copiarFicha(guardadas[guardadas.length - 1]) : emptyFichaVersion(1));
    setEditFichaSel("borrador");
    setFichaOculta(false);
    setEditFichaInsumoNombre("");
    setEditFichaInsumoCantidad(1);
    setEditFichaInsumoUnidad("kg");
    setEditFichaInsumoSel(null);
    setEditFichaPaso("");
  };

  const updateEditFichaField = (field: keyof Omit<FichaVersion, "insumos" | "version">, value: string | number) =>
    setEditFichaBorrador(prev => ({ ...prev, [field]: value }));

  const addEditFichaInsumo = () => {
    const ins = editFichaInsumoSel ?? resolverInsumo(insumos, editFichaInsumoNombre);
    if (!ins) {
      toast.error("Selecciona un insumo del catálogo de Insumos");
      return;
    }
    // No se puede repetir un insumo en la ficha: se edita en la tabla.
    if (editFichaBorrador.insumos.some((i) => i.nombre === ins.nombre)) {
      toast.error("Este insumo ya está en la ficha; edítalo en la tabla");
      return;
    }
    setEditFichaBorrador(prev => ({
      ...prev,
      insumos: [...prev.insumos, { nombre: ins.nombre, cantidad: editFichaInsumoCantidad, unidad: editFichaInsumoUnidad }],
    }));
    setEditFichaInsumoNombre(""); setEditFichaInsumoCantidad(1); setEditFichaInsumoSel(null);
  };

  const removeEditFichaInsumo = (idx: number) =>
    setEditFichaBorrador(prev => ({ ...prev, insumos: prev.insumos.filter((_, j) => j !== idx) }));

  const updateEditFichaInsumo = (idx: number, patch: Partial<RInsumo>) =>
    setEditFichaBorrador(prev => ({
      ...prev,
      insumos: prev.insumos.map((ins, j) => (j === idx ? { ...ins, ...patch } : ins)),
    }));

  const moverEditFichaPaso = (idx: number, dir: -1 | 1) =>
    setEditFichaBorrador(prev => ({ ...prev, pasos: moverEnLista(prev.pasos, idx, dir) }));

  const addEditFichaPaso = () => {
    if (!editFichaPaso.trim()) return;
    setEditFichaBorrador(prev => ({ ...prev, pasos: [...prev.pasos, editFichaPaso.trim()] }));
    setEditFichaPaso("");
  };

  const removeEditFichaPaso = (idx: number) =>
    setEditFichaBorrador(prev => ({ ...prev, pasos: prev.pasos.filter((_, j) => j !== idx) }));

  const fmtCOP = (n: number) => `$${n.toLocaleString("es-CO")}`;
  const inputCls =
    "w-full px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  /** Nombre visible de una categoría: el del listado del módulo Categoría de
      Productos; si el id ya no existe ahí, "Sin categoría" (nunca el código
      CAT-###, ni en la lista, ni en el buscador ni en el Excel). */
  const catName = (id: string) =>
    opcionesCategoriaBase.find((c) => c.id === id)?.nombre ?? "Sin categoría";

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

  /** Palabra con que se muestra el stock ("2 pizzas", "1 lasaña", "24 und"). */
  const palabraStock = (p: { idCategoria: string; unidadVenta: string }, n: number): string => {
    if (p.idCategoria === "CAT-001") return n === 1 ? "pizza" : "pizzas";
    if (p.idCategoria === "CAT-002") return n === 1 ? "lasaña" : "lasañas";
    return p.unidadVenta || "und";
  };

  /** Versión vigente de la ficha (la última: es la que tiene fechaFin null). */
  const fichaVigente = (id: string): FichaVersion | null => {
    const l = fichas[id];
    return l && l.length > 0 ? l[l.length - 1] : null;
  };

  const ayudaStock = (p: Producto): string =>
    tipoDe(p) === TIPOS_PRODUCTO[0]
      ? "Se actualiza al completar órdenes de producción"
      : // TODO: el stock de los productos de reventa se actualizará con las
        // compras (módulo Compras). No implementado aún.
        "Se actualizará con las compras";

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
        { header: "Tipo", valor: (p) => tipoDe(p) },
        { header: "Categoría", valor: (p) => catName(p.idCategoria) },
        { header: "Precio de venta", valor: (p) => p.precioUnitario, numFmt: '"$"#,##0' },
        { header: "Stock", valor: (p) => p.stockDisponible, numFmt: "#,##0" },
        { header: "Estado", valor: (p) => p.estado, esEstado: true },
      ],
    });
    toast.success(`Archivo Excel descargado (${archivo})`);
  };

  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    // El buscador busca por nombre, categoría y tipo; NO por id (el id es
    // interno y ya no se muestra).
    return productos.filter(
      (p) =>
        (filtroTipo === "Todos" || tipoDe(p) === filtroTipo) &&
        (filtroEstado === "Todos" || p.estado === filtroEstado) &&
        (p.nombre.toLowerCase().includes(q) ||
          catName(p.idCategoria).toLowerCase().includes(q) ||
          tipoDe(p).toLowerCase().includes(q)),
    );
  }, [productos, search, filtroTipo, filtroEstado]);

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

  const handleCreate = () => {
    // "¿Tiene ficha técnica?" es lo primero que se decide y es obligatorio.
    if (formTieneFicha === null) {
      setTieneFichaError("Selecciona si el producto tiene ficha técnica");
      toast.error("Selecciona si el producto tiene ficha técnica");
      return;
    }
    if (!form.nombre || !form.idCategoria) {
      toast.error("Nombre y categoría son obligatorios");
      return;
    }
    // `length + 1` reutilizaba un id existente si se había borrado un producto del
    // medio: quedaban dos filas con la misma clave y editar/borrar una afectaba a
    // la otra. Se toma el mayor sufijo numérico, como en Usuarios.
    const nextNum = productos.reduce((max, p) => {
      const n = parseInt(p.id.replace("PROD-", ""), 10) || 0;
      return Math.max(max, n);
    }, 0) + 1;
    const newId = `PROD-${String(nextNum).padStart(3, "0")}`;
    // Un Producto insumo no se guarda sin su ficha: al menos 1 insumo y
    // porciones >= 1 en cada tamaño. Un Producto (reventa) nunca guarda ficha.
    if (tipoDe(form) === TIPOS_PRODUCTO[0]) {
      if (!fichaCumpleMinimo(fichaBorrador)) {
        // Si la ficha estaba oculta, se vuelve a mostrar sola con el error.
        setFichaOculta(false);
        toast.error("Un producto insumo necesita su ficha técnica con al menos un insumo y porciones de 1 en adelante");
        return;
      }
      setFichas(prev => ({
        ...prev,
        [newId]: [{ ...fichaBorrador, version: 1, idReceta: numeroNuevoFicha(siguienteNumeroFicha(fichas, productos)), fechaInicio: new Date().toISOString(), fechaFin: null }],
      }));
    }
    setProductos((p) => [{ id: newId, ...form }, ...p]);
    setShowCreate(false);
    setForm(emptyForm());
    resetFichaForm();
    setFormTieneFicha(null);
    setTieneFichaError("");
    toast.success("Producto creado correctamente");
  };

  const handleEdit = () => {
    if (!editItem) return;
    // Un Producto insumo con historial de ficha no puede pasar a "Producto".
    const original = productos.find((x) => x.id === editItem.id);
    if (
      original &&
      tipoDe(original) === TIPOS_PRODUCTO[0] &&
      tipoDe(editItem) === TIPOS_PRODUCTO[1] &&
      (fichas[editItem.id]?.length ?? 0) > 0
    ) {
      toast.error("No se puede cambiar el tipo porque este producto ya tiene historial de ficha técnica");
      return;
    }
    if (tipoDe(editItem) === TIPOS_PRODUCTO[0] && (editFichaBorrador.insumos.length === 0 || editFichaBorrador.porciones < 1)) {
      // Si la ficha estaba oculta, se vuelve a mostrar sola con el error.
      setFichaOculta(false);
      toast.error("Un producto insumo necesita su ficha técnica con al menos un insumo");
      return;
    }
    setProductos((p) =>
      p.map((x) => (x.id === editItem.id ? editItem : x)),
    );
    // Un solo "Guardar" para producto y ficha: si el borrador cambió frente a
    // la última versión guardada, se cierra esa versión (fechaFin = ahora) y
    // el borrador entra como la versión N+1. Si no cambió, no se crea nada y
    // las versiones guardadas quedan intactas. Un "Producto" nunca guarda
    // versiones.
    const ultima = editFichaVersiones[editFichaVersiones.length - 1];
    if (tipoDe(editItem) === TIPOS_PRODUCTO[0] && ultima) {
      if (fichaTieneCambios(editFichaBorrador, ultima)) {
        const now = new Date().toISOString();
        const n = ultima.version + 1;
        setFichas(prev => ({
          ...prev,
          [editItem.id]: [
            ...editFichaVersiones.map((v, i) =>
              i === editFichaVersiones.length - 1 ? { ...v, fechaFin: now } : v
            ),
            {
              ...editFichaBorrador,
              version: n,
              // El ID identifica a la FICHA, no a la versión: las versiones
              // siguientes conservan el mismo número.
              idReceta: ultima.idReceta,
              fechaInicio: now,
              fechaFin: null,
            },
          ],
        }));
      }
    } else if (tipoDe(editItem) === TIPOS_PRODUCTO[0] && fichaConContenido(editFichaBorrador)) {
      // El producto no tenía ficha: el borrador se guarda como v1.
      setFichas(prev => ({
        ...prev,
          [editItem.id]: [{ ...editFichaBorrador, version: 1, idReceta: numeroNuevoFicha(siguienteNumeroFicha(fichas, productos)), fechaInicio: new Date().toISOString(), fechaFin: null }],
      }));
    }
    setEditItem(null);
    toast.success("Producto actualizado");
  };

  const handleDelete = (id: string) => {
    setProductos((p) => p.filter((x) => x.id !== id));
    // La ficha del producto borrado también se retira: si queda, es una
    // huérfana que ya no ve nadie pero seguiría ocupando número de ID.
    setFichas((prev) => {
      if (!(id in prev)) return prev;
      const sinFicha = { ...prev };
      delete sinFicha[id];
      return sinFicha;
    });
    setDeleteId(null);
    toast.success("Producto eliminado");
  };

  const roCls = "w-full px-3 py-2 bg-muted/50 rounded-xl border border-border text-sm text-foreground cursor-not-allowed";
  const FormFields = ({
    values,
    onChange,
    hideUnidad = false,
    readOnly = false,
    lockNombre = false,
  }: {
    values: Omit<Producto, "id">;
    onChange: (f: keyof Omit<Producto, "id">, v: string | number) => void;
    hideUnidad?: boolean;
    readOnly?: boolean;
    lockNombre?: boolean;
  }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {/* Nombre */}
      <div className="sm:col-span-2">
        <label className="block text-xs font-semibold text-muted-foreground mb-0.5">
          Nombre *
        </label>
        <input
          value={values.nombre}
          onChange={(e) => onChange("nombre", e.target.value)}
          placeholder="Ej: Margarita Clásica"
          readOnly={readOnly || lockNombre}
          className={readOnly || lockNombre ? roCls : inputCls}
        />
      </div>
      {/* Tipo (solo lectura aquí; en Crear/Editar se define con "¿Tiene ficha
          técnica?"). Comparte fila con Estado en la cuadrícula de 2 columnas. */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-0.5">
          Tipo
        </label>
        <div>
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${tipoPillCls(tipoDe(values))}`}>
            {tipoDe(values)}
          </span>
        </div>
      </div>
      {/* Estado (solo lectura; se cambia desde la lista del index). Comparte
          fila con Tipo. */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-0.5">
          Estado
        </label>
        <div>
          <EstadoBadge estado={values.estado} />
        </div>
      </div>
      {/* Imagen. En Ver detalle (solo lectura) la etiqueta no se muestra: la
          foto ya es evidente y el requisito de ese diseño separa la imagen
          (fija, 160 px) de la cuadrícula de datos. */}
      <div className="sm:col-span-2">
        {!readOnly && (
          <label className="block text-xs font-semibold text-muted-foreground mb-0.5">
            Imagen del producto
          </label>
        )}
        {!readOnly && (
          <div className="flex gap-2 mb-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-muted border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Subir archivo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onChange("imagen", URL.createObjectURL(file));
                }}
              />
            </label>
            <span className="flex items-center text-xs text-muted-foreground">o</span>
            <input
              value={values.imagen.startsWith("blob:") ? "" : values.imagen}
              onChange={(e) => onChange("imagen", e.target.value)}
              placeholder="Pega una URL de imagen..."
              className="flex-1 px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}
        {values.imagen && (
          <div className="relative w-full h-40 rounded-xl overflow-hidden bg-muted border border-border">
            <img src={values.imagen} alt="Vista previa" className="w-full h-full object-cover" />
            {!readOnly && (
              <button
                type="button"
                onClick={() => onChange("imagen", "")}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
      {/* Categoría (se muestra solo el nombre; el id queda interno) */}
      <div>
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
      </div>
      {/* Precio de venta al público (precioUnitario): es el precio que
          muestran el listado, el Excel y el menú público. El costo
          (costoUnitario) no se edita aquí: ver el TODO de la interfaz. */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-0.5">
          Precio de venta (COP)
        </label>
        <input
          type="number"
          value={values.precioUnitario}
          onChange={(e) => onChange("precioUnitario", Number(e.target.value))}
          readOnly={readOnly}
          className={readOnly ? roCls : inputCls}
        />
      </div>
      {/* Unidad de venta */}
      {!hideUnidad && (
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
      {/* El stock disponible NO se escribe en el producto: sigue en la
          interfaz y lo actualiza el sistema (órdenes de producción / compras).
          En el index y en Ver detalle se muestra como solo lectura. */}
    </div>
  );

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

  // ── Pantalla completa Crear Producto ──────────────────────────────
  if (showCreate) {
    const activeV = fichaBorrador;
    const filasTam = filasTamano();
    const iCls = "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
    return (
      /* La pantalla vive dentro de `<main>`, que ya está bajado por el
         AdminTopBar (`h-14` = 3.5rem) y seguido por el footer del admin, así
         que el alto se calcula sobre el viewport menos ambos: con `h-screen`
         la pantalla medía 56px más que la ventana (scroll de página) y el
         footer la empujaba fuera del viewport. Cada columna scrollea por
         dentro, nunca la página. */
      <div className="h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-3.5rem-7.25rem)] xl:h-[calc(100dvh-3.5rem-4.3125rem)] bg-background flex flex-col overflow-hidden">
        {/* Cabecera fija: no crece ni genera scroll */}
        <div className="shrink-0 bg-card border-b border-border px-6 py-2.5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Crear Producto</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Completa los datos del producto y su ficha técnica</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFichaOculta(v => !v)}
              disabled={formTieneFicha === "no"}
              title={formTieneFicha === "no" ? "Este producto no lleva ficha técnica" : undefined}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {fichaOculta ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {fichaOculta ? "Mostrar ficha técnica" : "Ocultar ficha técnica"}
            </button>
            <button onClick={() => { setShowCreate(false); setForm(emptyForm()); resetFichaForm(); setFormTieneFicha(null); setTieneFichaError(""); }}
              className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
              Cancelar
            </button>
            <button onClick={handleCreate}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
              Crear
            </button>
          </div>
        </div>

        {/* Two columns: cada columna scrollea por dentro, nunca la página */}
        <div className="flex-1 min-h-0 flex divide-x divide-border overflow-hidden">

          {/* ── COLUMNA IZQUIERDA: datos del producto ── */}
          {/* Con la ficha oculta, los datos ocupan el ancho (max-w-2xl
              centrado); la animación de 0,2 s la da transition-all. */}
          <div className={`${fichaOculta ? "flex-1" : "w-1/2"} px-6 py-4 flex flex-col min-h-0 transition-all duration-200`}>
            <div className={`flex flex-col flex-1 min-h-0 w-full ${fichaOculta ? "max-w-2xl mx-auto" : ""}`}>
            <p className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Datos del producto</p>
            {/* Los campos reparten el espacio libre de la columna (`justify-between`)
                hasta `27rem`; más allá el sobrante queda abajo para no abrir huecos
                exagerados entre los campos ni obligar a scroll con la imagen puesta. */}
            <div className="flex-1 min-h-0 max-h-[27rem] overflow-y-auto flex flex-col justify-between gap-4">
              {/* ¿Tiene ficha técnica? — obligatorio, define el tipo */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-0.5">¿Tiene ficha técnica? *</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {(["si", "no"] as const).map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => elegirTieneFicha(op)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${
                        formTieneFicha === op
                          ? "bg-primary text-white border-primary"
                          : "bg-muted text-muted-foreground border-border hover:bg-border"
                      }`}
                    >
                      {op === "si" ? "Sí" : "No"}
                    </button>
                  ))}
                  {formTieneFicha && (
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${tipoPillCls(tipoDe(form))}`}
                      title={tipoDe(form) === TIPOS_PRODUCTO[0] ? "Producto insumo: se elabora con insumos" : "Producto: se revende tal como se compra"}
                    >
                      {tipoDe(form)}
                    </span>
                  )}
                </div>
                {formTieneFicha && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {tipoDe(form) === TIPOS_PRODUCTO[0]
                      ? "Producto insumo: se elabora con insumos"
                      : "Producto: se revende tal como se compra"}
                  </p>
                )}
                {tieneFichaError && (
                  <p className="text-xs text-red-500 mt-1 leading-tight">{tieneFichaError}</p>
                )}
              </div>
              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: Margarita Clásica" className={iCls} />
              </div>
              {/* Imagen */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Imagen del producto</label>
                <div className="flex gap-2 mb-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-muted border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Subir archivo
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) setForm(p => ({ ...p, imagen: URL.createObjectURL(file) }));
                    }} />
                  </label>
                  <span className="flex items-center text-xs text-muted-foreground">o</span>
                  <input value={form.imagen.startsWith("blob:") ? "" : form.imagen}
                    onChange={e => setForm(p => ({ ...p, imagen: e.target.value }))}
                    placeholder="Pega una URL de imagen..."
                    className="flex-1 px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                {form.imagen && (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden bg-muted border border-border">
                    <img src={form.imagen} alt="Vista previa" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setForm(p => ({ ...p, imagen: "" }))}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {/* Categoría (se muestra solo el nombre; el id queda interno) */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Categoría *</label>
                <select value={form.idCategoria} onChange={e => setForm(p => ({ ...p, idCategoria: e.target.value }))}
                  className={iCls + " cursor-pointer"}>
                  <option value="" disabled>Selecciona una categoría</option>
                  {opcionesCategoria(form.idCategoria).map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              {/* Precio de venta (precioUnitario; el stock NO se escribe aquí:
                  todo producto nuevo empieza en 0 y lo actualiza el sistema).
                  El costo no se toca: ver el TODO de la interfaz Producto. */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Precio de venta (COP)</label>
                <input type="number" value={form.precioUnitario}
                  onChange={e => setForm(p => ({ ...p, precioUnitario: Number(e.target.value) }))} className={iCls} />
              </div>
            </div>
            </div>
          </div>

          {/* ── COLUMNA DERECHA: ficha técnica ── */}
          {/* La ficha técnica scrollea por dentro; el botón "Guardar Ficha
              Técnica" vive FUERA del scroller (footer de la columna), así que
              siempre queda visible y nunca tapa el input de pasos. Solo se
              activa si "¿Tiene ficha técnica?" es Sí. Al ocultarla, la columna
              colapsa con una animación de 0,2 s y NO se borra lo diligenciado. */}
          <div className={`py-4 flex flex-col min-h-0 transition-all duration-200 ${
            fichaOculta ? "w-0 px-0 opacity-0 overflow-hidden border-l-0" : "w-1/2 px-6 opacity-100"
          }`}>
            {formTieneFicha !== "si" ? (
              <div className="flex-1 min-h-0 flex flex-col">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Ficha Técnica</p>
                <div className="flex-1 flex flex-col items-center justify-center text-center bg-muted/40 rounded-2xl border border-border p-6 select-none">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                    <span className="text-2xl">📋</span>
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">
                    {formTieneFicha === "no"
                      ? "Este producto no lleva ficha técnica"
                      : "Primero indica arriba si el producto tiene ficha técnica"}
                  </p>
                </div>
              </div>
            ) : (
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ficha Técnica</p>
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
              </div>

              <p className="text-[11px] text-muted-foreground mb-3 bg-muted/40 px-3 py-1.5 rounded-lg">
                La ficha se guarda como <span className="font-bold text-foreground">v1</span> junto con el producto.
              </p>

              <div className="space-y-4">
                {/* El ID se asigna al guardar: el número que sigue (001, 002, …)
                    sobre todas las fichas. Aquí se previsualiza, en solo lectura,
                    con el mismo formato que muestran Editar y Ver detalle. */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-0.5">ID</label>
                  <input value={idFichaVisible(activeV, fichas, productos)} readOnly tabIndex={-1}
                    className="w-full px-3 py-2.5 bg-muted/50 rounded-xl border border-border text-sm text-foreground cursor-not-allowed" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Tiempo de preparación (min)</label>
                    <input type="number" min={0} value={activeV.tiempoPreparacion}
                      onChange={e => updateFichaField("tiempoPreparacion", Number(e.target.value))} className={iCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Porciones por tamaño</label>
                    <div className="flex gap-2 text-[11px] font-semibold text-muted-foreground mb-1">
                      <span className="flex-1 min-w-0">Tamaño</span>
                      <span className="w-20 shrink-0">Porciones</span>
                      <span className="w-6 shrink-0" />
                    </div>
                    <div className="space-y-2">
                      {filasTam.map((fila, idx) => (
                        <div key={fila.tamano} className="flex items-center gap-2">
                          <select
                            value={fila.tamano}
                            onChange={e => updateTamano(idx, e.target.value as TamanoFicha)}
                            aria-label="Tamaño"
                            className="flex-1 min-w-0 px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                            {TAMANOS_FICHA.map(t => (
                              <option key={t} value={t} disabled={filasTam.some((f, i) => i !== idx && f.tamano === t)}>{t}</option>
                            ))}
                          </select>
                          <input type="number" min={1} value={fila.porciones} aria-label="Porciones"
                            onChange={e => updatePorcionesTamano(idx, Number(e.target.value))}
                            className="w-20 shrink-0 px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                          <button type="button" title="Quitar tamaño" onClick={() => removeTamano(idx)}
                            disabled={filasTam.length === 1}
                            className="w-6 shrink-0 p-1 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={addTamano} disabled={filasTam.length === TAMANOS_FICHA.length}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Agregar tamaño
                    </button>
                  </div>
                </div>

                {/* Insumos */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2">Insumos</label>
                  {activeV.insumos.length > 0 && (
                    <div className="mb-3">
                      <InsumosFichaTable
                        insumos={activeV.insumos}
                        editable={true}
                        editandoIdx={fichaEditandoIdx}
                        onEdit={setFichaEditandoIdx}
                        onChange={updateFichaInsumo}
                        onRemove={removeFichaInsumo}
                      />
                    </div>
                  )}
                  {activeV.insumos.length === 0 && (
                    <p className="text-xs text-muted-foreground italic mb-3">Sin insumos agregados</p>
                  )}
                  {/* Add insumo row */}
                  <div className="flex items-end gap-2">
                    <InsumoSearchField
                      insumos={insumos}
                      valor={fichaInsumoNombre}
                      onValorChange={v => { setFichaInsumoNombre(v); setFichaInsumoSel(null); }}
                      onSelect={seleccionarFichaInsumo}
                    />
                    <div className="w-20">
                      <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Cantidad</label>
                      <input type="number" min={0.1} step={0.1} value={fichaInsumoCantidad}
                        onChange={e => setFichaInsumoCantidad(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Medida</label>
                      <select value={fichaInsumoUnidad} onChange={e => setFichaInsumoUnidad(e.target.value)}
                        className="w-full px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none cursor-pointer">
                        {UNIDADES_FICHA.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                    <button onClick={addFichaInsumo} title="Agregar insumo"
                      className="px-3 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Pasos de elaboración */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2">Preparación (pasos de elaboración)</label>
                  {activeV.pasos.length > 0 && (
                    <ol className="space-y-1.5 mb-3">
                      {activeV.pasos.map((paso, idx) => (
                        <li key={idx} className="flex items-start gap-2 px-3 py-2 bg-muted/40 rounded-xl border border-border">
                          <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">{idx + 1}</span>
                          <span className="flex-1 text-sm text-foreground leading-snug">{paso}</span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={() => moverFichaPaso(idx, -1)} disabled={idx === 0} title="Subir paso"
                              className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors">
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => moverFichaPaso(idx, 1)} disabled={idx === activeV.pasos.length - 1} title="Bajar paso"
                              className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors">
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button onClick={() => removeFichaPaso(idx)} title="Eliminar paso"
                            className="p-1 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 cursor-pointer transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                  {activeV.pasos.length === 0 && (
                    <p className="text-xs text-muted-foreground italic mb-3">Sin pasos agregados</p>
                  )}
                  <div className="flex gap-2">
                    <input value={fichaPaso} onChange={e => setFichaPaso(e.target.value)}
                      placeholder="Describe un paso de la elaboración"
                      onKeyDown={e => e.key === "Enter" && addFichaPaso()}
                      className="flex-1 px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <button onClick={addFichaPaso}
                      className="px-3 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}
            {formTieneFicha === "si" && (
              <div className="shrink-0 pt-4">
                <button type="button" onClick={solicitarGuardarFicha}
                  className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                  Guardar Ficha Técnica
                </button>
              </div>
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
    return (
      /* Igual que Crear: altura fija sobre el viewport menos el AdminTopBar
         (h-14) y el footer del admin. La pantalla ocupa exactamente el alto de
         la ventana y la página NUNCA desplaza; las columnas tienen su propio
         espacio: la izquierda scrollea solo como respaldo y en la derecha la
         única barra posible es la de la lista de pasos (recetas largas). */
      <div className="h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-3.5rem-7.25rem)] xl:h-[calc(100dvh-3.5rem-4.3125rem)] bg-background flex flex-col overflow-hidden">
        <div className="shrink-0 bg-card border-b border-border px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Detalle — {detailItem.nombre}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Información del producto y su ficha técnica</p>
          </div>
          <div className="flex gap-3">
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

        <div className="flex-1 min-h-0 flex divide-x divide-border overflow-hidden">

          {/* COLUMNA IZQUIERDA: datos del producto. `overflow-y-auto` es solo
              respaldo: con los datos compactados caben sin barra en las dos
              resoluciones objetivo; si algo no cupiera, desplaza la columna
              (nunca la página). */}
          <div className={`${tipoDe(detailItem) === TIPOS_PRODUCTO[0] ? "w-1/2" : "w-full max-w-2xl mx-auto"} px-8 py-4 min-h-0 overflow-y-auto`}>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Datos del producto</p>
            {FormFields({
              values: detailItem,
              onChange: () => {},
              readOnly: true,
            })}
            
            {/* Stock: unidades, total de porciones y porciones por unidad
                (según la ficha VIGENTE), en líneas cortas para que el bloque
                quepa en 1366×768 sin barra en la columna. */}
            {(() => {
              const vigente = fichaVigente(detailItem.id);
              const conFicha = tipoDe(detailItem) === TIPOS_PRODUCTO[0] && vigente;
              return (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Stock</p>
                  <div className="flex flex-wrap items-baseline gap-x-3 text-sm">
                    <span className={`font-bold ${detailItem.stockDisponible <= 5 ? "text-red-600" : detailItem.stockDisponible <= 15 ? "text-yellow-600" : "text-emerald-600"}`}>
                      {detailItem.stockDisponible} {palabraStock(detailItem, detailItem.stockDisponible)}
                    </span>
                    {conFicha && (
                      <>
                        <span className="text-muted-foreground">
                          · {detailItem.stockDisponible * vigente.porciones} porciones
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({vigente.porciones} porciones por unidad, ficha v{vigente.version})
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{ayudaStock(detailItem)}</p>
                </div>
              );
            })()}
          </div>

          {/* COLUMNA DERECHA: ficha técnica (solo Producto insumo; un
              "Producto" de reventa no lleva ficha y no se muestra la sección).
              Sin scroll propio: la única barra posible es la de la lista de
              pasos, dentro de su recuadro, cuando la receta es larga. */}
          {tipoDe(detailItem) === TIPOS_PRODUCTO[0] && (
          <div className="w-1/2 px-8 py-4 min-h-0 flex flex-col overflow-hidden">
            <div className="shrink-0 flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ficha Técnica</p>
              {ficha && ficha.length > 0 && (
                <VersionPills versiones={ficha} activo={vIdx} onSelect={setDetailVIdx} />
              )}
            </div>
            {!fichaV ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Sin ficha técnica</p>
                <p className="text-xs text-muted-foreground">Este producto no tiene ficha técnica registrada</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col">
                <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold mb-2 ${
                  fichaV.fechaFin ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {fichaV.fechaFin ? "Versión histórica" : "Versión vigente"}
                </span>
                <FichaReadOnly v={fichaV} readCls={readCls} />
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    );
  }

  // ── Pantalla completa Editar Producto ─────────────────────────────
  if (editItem) {
    return (
      /* Misma estructura que Crear Producto: alto fijo sobre el viewport
         (AdminTopBar h-14 + footer del admin) y cada columna scrollea
         por dentro; la página nunca scrollea. */
      <div className="h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-3.5rem-7.25rem)] xl:h-[calc(100dvh-3.5rem-4.3125rem)] bg-background flex flex-col overflow-hidden">
        {/* Cabecera fija: no crece ni genera scroll */}
        <div className="shrink-0 bg-card border-b border-border px-6 py-2.5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Editar — {editItem.id}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Modifica los datos del producto</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFichaOculta(v => !v)}
              disabled={tipoDe(editItem) !== TIPOS_PRODUCTO[0]}
              title={tipoDe(editItem) !== TIPOS_PRODUCTO[0] ? "Este producto no lleva ficha técnica" : undefined}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {fichaOculta ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {fichaOculta ? "Mostrar ficha técnica" : "Ocultar ficha técnica"}
            </button>
            <button onClick={() => setEditItem(null)}
              className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
              Cancelar
            </button>
            <button onClick={handleEdit}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
              Guardar
            </button>
          </div>
        </div>

        {/* Dos columnas: cada columna scrollea por dentro, nunca la página */}
        <div className="flex-1 min-h-0 flex divide-x divide-border overflow-hidden">

          {/* COLUMNA IZQUIERDA: datos editables. Con la ficha oculta ocupa
              el ancho (max-w-2xl centrado) con animación de 0,2 s. Los
              datos scrollean por dentro de la columna, nunca la página. */}
          <div className={`${fichaOculta ? "flex-1" : "w-1/2"} px-6 py-4 flex flex-col min-h-0 transition-all duration-200`}>
            <div className={`flex flex-col flex-1 min-h-0 w-full ${fichaOculta ? "max-w-2xl mx-auto" : ""}`}>
            <p className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Datos del producto</p>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            {/* ¿Tiene ficha técnica? — bloqueado si ya hay versiones guardadas */}
            {(() => {
              const tieneHistorialFicha = (fichas[editItem.id]?.length ?? 0) > 0;
              return (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-muted-foreground mb-0.5">¿Tiene ficha técnica? *</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(["si", "no"] as const).map((op) => {
                      const activo = (tipoDe(editItem) === TIPOS_PRODUCTO[0]) === (op === "si");
                      return (
                        <button
                          key={op}
                          type="button"
                          disabled={tieneHistorialFicha}
                          title={tieneHistorialFicha ? "Este producto ya tiene historial de ficha técnica" : undefined}
                          onClick={() =>
                            setEditItem((x) =>
                              x && { ...x, tipo: op === "si" ? TIPOS_PRODUCTO[0] : TIPOS_PRODUCTO[1] }
                            )
                          }
                          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                            activo
                              ? "bg-primary text-white border-primary"
                              : "bg-muted text-muted-foreground border-border hover:bg-border"
                          } ${tieneHistorialFicha ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          {op === "si" ? "Sí" : "No"}
                        </button>
                      );
                    })}
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${tipoPillCls(tipoDe(editItem))}`}
                      title={tipoDe(editItem) === TIPOS_PRODUCTO[0] ? "Producto insumo: se elabora con insumos" : "Producto: se revende tal como se compra"}
                    >
                      {tipoDe(editItem)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tipoDe(editItem) === TIPOS_PRODUCTO[0]
                      ? "Producto insumo: se elabora con insumos"
                      : "Producto: se revende tal como se compra"}
                  </p>
                  {tieneHistorialFicha && (
                    <p className="text-[11px] text-muted-foreground mt-1 italic">
                      Bloqueado: el producto ya tiene historial de ficha técnica.
                    </p>
                  )}
                </div>
              );
            })()}
            {FormFields({
              values: editItem,
              onChange: (f, v) => setEditItem((x) => x && { ...x, [f]: v }),
              lockNombre: true,
            })}
            </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: ficha técnica. Solo el borrador es editable;
              las versiones guardadas se ven en solo lectura con fondo gris.
              Un "Producto" de reventa no lleva ficha: la sección queda
              deshabilitada con el mensaje correspondiente. Al ocultarla, la
              columna colapsa con animación de 0,2 s sin borrar los datos. */}
          {tipoDe(editItem) !== TIPOS_PRODUCTO[0] ? (
            <div className={`py-4 flex flex-col min-h-0 transition-all duration-200 ${
              fichaOculta ? "w-0 px-0 opacity-0 overflow-hidden border-l-0" : "w-1/2 px-6 opacity-100"
            }`}>
              <div className="flex-1 min-h-0 flex flex-col">
              <p className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Ficha Técnica</p>
              <div className="flex-1 flex flex-col items-center justify-center text-center bg-muted/40 rounded-2xl border border-border p-6 select-none">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-sm font-semibold text-muted-foreground">Este producto no lleva ficha técnica</p>
              </div>
              </div>
            </div>
          ) : (() => {
            const activeEV = editFichaBorrador;
            const vSel = editFichaSel === "borrador" ? null : editFichaVersiones[editFichaSel];
            return (
              <div className={`py-4 flex flex-col min-h-0 transition-all duration-200 ${
                fichaOculta ? "w-0 px-0 opacity-0 overflow-hidden border-l-0" : "w-1/2 px-6 opacity-100"
              }`}>
                <div className="shrink-0 flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ficha Técnica</p>
                  <div className="flex items-center gap-1 flex-wrap justify-end">
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
                </div>

                {editFichaVersiones.length > 0 && (
                  <p className="shrink-0 text-[11px] text-muted-foreground mb-3 bg-muted/40 px-3 py-1.5 rounded-lg">
                    Esta ficha tiene {editFichaVersiones.length} {editFichaVersiones.length === 1 ? "versión" : "versiones"}. Las versiones anteriores no se pueden modificar.
                  </p>
                )}

                {vSel ? (
                  <div className="flex-1 min-h-0 overflow-y-auto">
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
                    <FichaReadOnly
                      v={vSel}
                      readCls="w-full px-3 py-2.5 bg-muted/60 rounded-xl border border-border text-sm text-muted-foreground"
                    />
                  </div>
                  </div>
                ) : (
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
                <div className="space-y-4 flex-1">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-0.5">ID</label>
                    <input value={idFichaVisible(activeEV, fichas, productos)} readOnly tabIndex={-1}
                      className="w-full px-3 py-2.5 bg-muted/50 rounded-xl border border-border text-sm text-foreground cursor-not-allowed" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Tiempo de preparación (min)</label>
                      <input type="number" min={0} value={activeEV.tiempoPreparacion}
                        onChange={e => updateEditFichaField("tiempoPreparacion", Number(e.target.value))} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Porciones por tamaño</label>
                      <div className="flex gap-2 text-[11px] font-semibold text-muted-foreground mb-1">
                        <span className="flex-1 min-w-0">Tamaño</span>
                        <span className="w-20 shrink-0">Porciones</span>
                        <span className="w-6 shrink-0" />
                      </div>
                      <div className="space-y-2">
                        {editFilasTamano().map((fila, idx) => (
                          <div key={fila.tamano} className="flex items-center gap-2">
                            <select
                              value={fila.tamano}
                              onChange={e => editUpdateTamano(idx, e.target.value as TamanoFicha)}
                              aria-label="Tamaño"
                              className="flex-1 min-w-0 px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                              {TAMANOS_FICHA.map(t => (
                                <option key={t} value={t} disabled={editFilasTamano().some((f, i) => i !== idx && f.tamano === t)}>{t}</option>
                              ))}
                            </select>
                            <input type="number" min={1} value={fila.porciones} aria-label="Porciones"
                              onChange={e => editUpdatePorcionesTamano(idx, Number(e.target.value))}
                              className="w-20 shrink-0 px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                            <button type="button" title="Quitar tamaño" onClick={() => editRemoveTamano(idx)}
                              disabled={editFilasTamano().length === 1}
                              className="w-6 shrink-0 p-1 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={editAddTamano} disabled={editFilasTamano().length === TAMANOS_FICHA.length}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Agregar tamaño
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-2">Insumos</label>
                    {activeEV.insumos.length > 0 && (
                      <div className="mb-3">
                        <InsumosFichaTable
                          insumos={activeEV.insumos}
                          editable={true}
                          editandoIdx={editFichaEditandoIdx}
                          onEdit={setEditFichaEditandoIdx}
                          onChange={updateEditFichaInsumo}
                          onRemove={removeEditFichaInsumo}
                        />
                      </div>
                    )}
                    {activeEV.insumos.length === 0 && (
                      <p className="text-xs text-muted-foreground italic mb-3">Sin insumos agregados</p>
                    )}
                    <div className="flex items-end gap-2">
                      <InsumoSearchField
                        insumos={insumos}
                        valor={editFichaInsumoNombre}
                        onValorChange={v => { setEditFichaInsumoNombre(v); setEditFichaInsumoSel(null); }}
                        onSelect={seleccionarEditFichaInsumo}
                      />
                      <div className="w-20">
                        <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Cantidad</label>
                        <input type="number" min={0.1} step={0.1} value={editFichaInsumoCantidad}
                          onChange={e => setEditFichaInsumoCantidad(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Medida</label>
                        <select value={editFichaInsumoUnidad} onChange={e => setEditFichaInsumoUnidad(e.target.value)}
                          className="w-full px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none cursor-pointer">
                          {UNIDADES_FICHA.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                      <button onClick={addEditFichaInsumo} title="Agregar insumo"
                        className="px-3 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Pasos de elaboración */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-2">Preparación (pasos de elaboración)</label>
                    {activeEV.pasos.length > 0 && (
                      <ol className="space-y-1.5 mb-3">
                        {activeEV.pasos.map((paso, idx) => (
                          <li key={idx} className="flex items-start gap-2 px-3 py-2 bg-muted/40 rounded-xl border border-border">
                            <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">{idx + 1}</span>
                            <span className="flex-1 text-sm text-foreground leading-snug">{paso}</span>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button onClick={() => moverEditFichaPaso(idx, -1)} disabled={idx === 0} title="Subir paso"
                                className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors">
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => moverEditFichaPaso(idx, 1)} disabled={idx === activeEV.pasos.length - 1} title="Bajar paso"
                                className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors">
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <button onClick={() => removeEditFichaPaso(idx)} title="Eliminar paso"
                              className="p-1 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 cursor-pointer transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ol>
                    )}
                    {activeEV.pasos.length === 0 && (
                      <p className="text-xs text-muted-foreground italic mb-3">Sin pasos agregados</p>
                    )}
                    <div className="flex gap-2">
                      <input value={editFichaPaso} onChange={e => setEditFichaPaso(e.target.value)}
                        placeholder="Describe un paso de la elaboración"
                        onKeyDown={e => e.key === "Enter" && addEditFichaPaso()}
                        className="flex-1 px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      <button onClick={addEditFichaPaso}
                        className="px-3 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                   </div>
                 </div>
                 </div>
                )}

                {/* La ficha se guarda con el botón "Guardar" del encabezado. */}
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-5 max-w-6xl mx-auto">
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
                resetFichaForm();
                setFormTieneFicha(null);
                setTieneFichaError("");
                setFichaOculta(false);
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
          onChange={setSearch}
          placeholder="Buscar por nombre, categoría o tipo..."
          wrapperClassName="max-w-sm flex-1"
        />
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as "Todos" | TipoProducto)}
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
          onChange={(e) => setFiltroEstado(e.target.value as "Todos" | EstadoProducto)}
          aria-label="Filtrar por estado"
          className="px-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
        >
          <option value="Todos">Todos los estados</option>
          {ESTADOS_PRODUCTO.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {/* Sin columna "Imagen": la foto se ve en Ver detalle y en
                    Crear/Editar (aquí solo ocupaba ancho y alto). */}
                {/* Los anchos suman SIEMPRE 100 %: la tabla es `w-full
                    table-fixed`, así que el ancho total no cambia y no
                    aparece scroll horizontal. El ID entra primero (5,5 %) y
                    se compensa sobre todo en Stock, que era la que más
                    sobrante tenía. Estado y Acciones quedan intactas. */}
                {[
                  { h: "ID", w: "w-[5.5%]" },
                  { h: "Nombre", w: "w-[11%]" },
                  { h: "Tipo", w: "w-[14.5%]" },
                  { h: "Ficha técnica", w: "w-[9.5%]" },
                  { h: "Categoría", w: "w-[7.5%]" },
                  { h: "Precio de venta", w: "w-[9%]" },
                  { h: "Stock", w: "w-[15%]", pl: "pl-10" },
                  { h: "Estado", w: "w-[16%]" },
                  { h: "Acciones", w: "w-[12%]" },
                ].map(({ h, w, pl }) => (
                  <th
                    key={h}
                    className={`px-4 py-2 text-left font-semibold whitespace-nowrap ${w} ${pl ?? ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y divide-border ${filtered.length > 0 ? "min-h-[305px]" : ""}`}>
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
                    <td className="px-4 py-2.5 text-sm font-medium text-foreground whitespace-nowrap">
                      {p.id.replace(/\D/g, "")}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-medium text-foreground truncate" title={p.nombre}>
                      {p.nombre}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${tipoPillCls(tipoDe(p))}`}>
                        {tipoDe(p)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {tipoDe(p) === TIPOS_PRODUCTO[0] ? (
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
                    <td className="pl-10 pr-4 py-2.5 align-middle" title={ayudaStock(p)}>
                      {/* Stock en DOS líneas: arriba las unidades (negrita y
                          color, igual que antes) y debajo las porciones en
                          gris y más pequeño, sin el "·" y sin recorte.
                          `align-middle` + la altura fija de la fila (61 px,
                          más que los 56 px que ocupan las dos líneas) hacen
                          que todas las filas midan igual en todas las
                          páginas. El detalle completo queda en el tooltip. */}
                      <span
                        className="block"
                        title={`${p.stockDisponible} ${palabraStock(p, p.stockDisponible)}${tipoDe(p) === TIPOS_PRODUCTO[0] && fichaVigente(p.id) ? ` · ${p.stockDisponible * fichaVigente(p.id)!.porciones} porciones` : ""}`}
                      >
                        <span
                          className={`block text-sm font-bold leading-5 whitespace-nowrap ${p.stockDisponible <= 5 ? "text-red-600" : p.stockDisponible <= 15 ? "text-yellow-600" : "text-emerald-600"}`}
                        >
                          {p.stockDisponible} {palabraStock(p, p.stockDisponible)}
                        </span>
                        {tipoDe(p) === TIPOS_PRODUCTO[0] && fichaVigente(p.id) && (
                          <span className="block text-xs leading-4 text-muted-foreground whitespace-nowrap">
                            {p.stockDisponible * fichaVigente(p.id)!.porciones} porciones
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {/* Pill de estado (diseño de Proveedores). El estado se
                          elige de la lista; al elegir se confirma en el modal
                          "pasará de X a Y". Sin permiso de edición queda la
                          pill sin menú. */}
                      <EstadoSelect
                        value={p.estado}
                        disabled={!canEdit}
                        onChange={(next) =>
                          setConfirmEstado({ id: p.id, nombre: p.nombre, current: p.estado, next })
                        }
                        options={ESTADOS_PRODUCTO.map((e) => ({
                          value: e,
                          label: e,
                          color: ESTADO_PRODUCTO_CLASES[e],
                        }))}
                      />
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
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-center mt-4">
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setPage((p) => Math.max(1, p - 1))
                }
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from(
                { length: totalPages },
                (_, i) => i + 1,
              ).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold cursor-pointer ${n === page ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}


      {/* ── Eliminar ── */}
      <AnimatePresence>
        {deleteId && (
          <ConfirmDeleteModal
            title="Eliminar producto"
            message={`¿Seguro que deseas eliminar el producto ${productos.find((x) => x.id === deleteId)?.nombre ?? deleteId}? Esta acción no se puede deshacer.`}
            onConfirm={() => handleDelete(deleteId)}
            onCancel={() => setDeleteId(null)}
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
                <EstadoBadge estado={confirmEstado.next} />
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
                <button onClick={() => {
                  setProductos((prev) =>
                    prev.map((x) => x.id === confirmEstado.id ? { ...x, estado: confirmEstado.next } : x)
                  );
                  setConfirmEstado(null);
                  toast.success(`Estado cambiado a: ${confirmEstado.next}`);
                }}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
