import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Edit,
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
  EstadoProductoSelect,
  ESTADOS_PRODUCTO,
  ESTADO_COLORES,
  type EstadoProducto,
} from "../components/EstadoProducto";
import type { Insumo } from "./GestionInsumosScreen";

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

export interface Producto {
  id: string;
  imagen: string;
  nombre: string;
  idCategoria: string;
  tipo: TipoProducto;
  costoUnitario: number;
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
export interface FichaVersion {
  version: number;
  idReceta: string;
  tiempoPreparacion: number;
  porciones: number;
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

// Fichas v1 de ejemplo para que Editar abra con contenido real. Usan insumos
// del catálogo de Insumos (INITIAL_INSUMOS): OJO, ese catálogo no trae
// "Harina de trigo", así que la masa se representa con "Masa Pre-elaborada".
const FECHA_SEMILLA_FICHA = "2026-01-15T00:00:00.000Z";

const fichaPizzaEjemplo = (extraInsumos: RInsumo[] = []): FichaVersion => ({
  version: 1,
  idReceta: "REC-001",
  tiempoPreparacion: 25,
  porciones: 8,
  insumos: [
    { nombre: "Masa Pre-elaborada", cantidad: 1, unidad: "und" },
    { nombre: "Salsa de Tomate", cantidad: 0.1, unidad: "lt" },
    { nombre: "Queso Mozzarella", cantidad: 0.15, unidad: "kg" },
    ...extraInsumos,
  ],
  pasos: [
    "Extender la masa sobre la mesa enharinada.",
    "Cubrir con salsa de tomate dejando 1 cm de borde.",
    "Repartir el queso mozzarella y los ingredientes.",
    "Hornear a 220 °C por 15 minutos y porcionar en 8.",
  ],
  fechaInicio: FECHA_SEMILLA_FICHA,
  fechaFin: null,
});

const fichaLasanaEjemplo = (): FichaVersion => ({
  version: 1,
  idReceta: "REC-001",
  tiempoPreparacion: 40,
  porciones: 4,
  insumos: [
    { nombre: "Masa Pre-elaborada", cantidad: 2, unidad: "und" },
    { nombre: "Salsa de Tomate", cantidad: 0.15, unidad: "lt" },
    { nombre: "Queso Mozzarella", cantidad: 0.2, unidad: "kg" },
  ],
  pasos: [
    "Precalentar el horno a 180 °C.",
    "Alternar capas de masa, salsa y queso en el molde.",
    "Hornear 30 minutos hasta gratinar.",
    "Reposar 5 minutos y servir en 4 porciones.",
  ],
  fechaInicio: FECHA_SEMILLA_FICHA,
  fechaFin: null,
});

/** Ficha v1 inicial por producto (pizzas y lasañas). Las gaseosas no llevan. */
export const INITIAL_FICHAS: FichasPorProducto = {
  "PROD-001": [fichaPizzaEjemplo([{ nombre: "Pepperoni", cantidad: 0.05, unidad: "kg" }])],
  "PROD-002": [fichaPizzaEjemplo()],
  "PROD-003": [fichaPizzaEjemplo()],
  "PROD-004": [fichaPizzaEjemplo()],
  "PROD-005": [fichaPizzaEjemplo()],
  "PROD-006": [fichaPizzaEjemplo()],
  "PROD-007": [fichaPizzaEjemplo()],
  "PROD-008": [fichaPizzaEjemplo()],
  "PROD-009": [fichaLasanaEjemplo()],
  "PROD-010": [fichaLasanaEjemplo()],
  "PROD-011": [fichaLasanaEjemplo()],
};

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
    idReceta: `REC-${String(n).padStart(3, "0")}`,
    tiempoPreparacion: 0,
    porciones: 1,
    insumos: [],
    pasos: [],
    fechaInicio: fechaInicio ?? new Date().toISOString(),
    fechaFin: null,
  };
}

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
    para las versiones históricas, la pantalla Editar. */
function FichaReadOnly({ v, readCls }: { v: FichaVersion; readCls: string }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1">ID Ficha Técnica</p>
        <div className={readCls}>{v.idReceta}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Tiempo de preparación (min)</p>
          <div className={readCls}>{v.tiempoPreparacion}</div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Porciones</p>
          <div className={readCls}>{v.porciones}</div>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Insumos</p>
        {v.insumos.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Sin insumos registrados</p>
        ) : (
          <div className="space-y-1.5">
            {v.insumos.map((ins, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-xl border border-border">
                <span className="flex-1 text-sm font-medium text-foreground">{ins.nombre}</span>
                <span className="text-xs text-muted-foreground font-mono">{ins.cantidad} {ins.unidad}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Preparación (pasos de elaboración)</p>
        {(v.pasos ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Sin pasos registrados</p>
        ) : (
          <ol className="space-y-1.5">
            {(v.pasos ?? []).map((paso, idx) => (
              <li key={idx} className="flex items-start gap-2 px-3 py-2 bg-muted/40 rounded-xl border border-border">
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
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExportExcel?: boolean;
}) {
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
    idCategoria: "CAT-001",
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
  // el producto (ya no existe "Guardar Ficha Técnica" ni se crean versiones
  // antes de que el producto exista).
  const [fichaBorrador, setFichaBorrador] = useState<FichaVersion>(emptyFichaVersion(1));
  const [fichaInsumoNombre, setFichaInsumoNombre] = useState("");
  const [fichaInsumoCantidad, setFichaInsumoCantidad] = useState(1);
  const [fichaInsumoUnidad, setFichaInsumoUnidad] = useState("kg");
  // Insumo elegido en el buscador. Mientras sea null solo hay texto escrito, y
  // esa búsqueda no cuenta como selección al agregar.
  const [fichaInsumoSel, setFichaInsumoSel] = useState<Insumo | null>(null);
  // Fila de la tabla de insumos abierta en edición (crear). Solo una a la vez.
  const [fichaEditandoIdx, setFichaEditandoIdx] = useState<number | null>(null);
  const [fichaPaso, setFichaPaso] = useState("");

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
    setFichaBorrador(emptyFichaVersion(1));
    setFichaInsumoNombre("");
    setFichaInsumoCantidad(1);
    setFichaInsumoUnidad("kg");
    setFichaInsumoSel(null);
    setFichaPaso("");
  };

  const updateFichaField = (field: keyof Omit<FichaVersion, "insumos" | "version">, value: string | number) =>
    setFichaBorrador(prev => ({ ...prev, [field]: value }));

  // Al elegir del buscador se autocompleta la "Medida" con la unidad del
  // catálogo; sigue siendo editable a mano después.
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
    "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const catName = (id: string) =>
    CATEGORIAS_PRODUCTO.find((c) => c.id === id)?.nombre ?? id;

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
    // porciones >= 1. Un Producto (reventa) nunca guarda ficha.
    if (tipoDe(form) === TIPOS_PRODUCTO[0]) {
      if (fichaBorrador.insumos.length === 0 || fichaBorrador.porciones < 1) {
        // Si la ficha estaba oculta, se vuelve a mostrar sola con el error.
        setFichaOculta(false);
        toast.error("Un producto insumo necesita su ficha técnica con al menos un insumo");
        return;
      }
      setFichas(prev => ({
        ...prev,
        [newId]: [{ ...fichaBorrador, version: 1, idReceta: "REC-001", fechaInicio: new Date().toISOString(), fechaFin: null }],
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
              idReceta: `REC-${String(n).padStart(3, "0")}`,
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
        [editItem.id]: [{ ...editFichaBorrador, version: 1, idReceta: "REC-001", fechaInicio: new Date().toISOString(), fechaFin: null }],
      }));
    }
    setEditItem(null);
    toast.success("Producto actualizado");
  };

  const handleDelete = (id: string) => {
    setProductos((p) => p.filter((x) => x.id !== id));
    setDeleteId(null);
    toast.success("Producto eliminado");
  };

  const roCls = "w-full px-3 py-2.5 bg-muted/50 rounded-xl border border-border text-sm text-foreground cursor-not-allowed";
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Nombre */}
      <div className="sm:col-span-2">
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
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
      {/* Tipo (solo lectura aquí; en Crear/Editar se define con "¿Tiene ficha técnica?") */}
      <div className="sm:col-span-2">
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Tipo
        </label>
        <div>
          <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold ${tipoPillCls(tipoDe(values))}`}>
            {tipoDe(values)}
          </span>
        </div>
      </div>
      {/* Estado (solo lectura; se cambia desde la lista del index) */}
      <div className="sm:col-span-2">
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Estado
        </label>
        <div>
          <EstadoBadge estado={values.estado} />
        </div>
      </div>
      {/* Imagen */}
      <div className="sm:col-span-2">
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Imagen del producto
        </label>
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
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Categoría *
        </label>
        <select
          value={values.idCategoria}
          onChange={(e) => onChange("idCategoria", e.target.value)}
          disabled={readOnly}
          className={readOnly ? roCls : inputCls + " cursor-pointer"}
        >
          {CATEGORIAS_PRODUCTO.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>
      {/* Precio unitario */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Precio unitario (COP)
        </label>
        <input
          type="number"
          value={values.costoUnitario}
          onChange={(e) => onChange("costoUnitario", Number(e.target.value))}
          readOnly={readOnly}
          className={readOnly ? roCls : inputCls}
        />
      </div>
      {/* Unidad de venta */}
      {!hideUnidad && (
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
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
                <label className="block text-xs font-semibold text-muted-foreground mb-1">¿Tiene ficha técnica? *</label>
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
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: Margarita Clásica" className={iCls} />
              </div>
              {/* Imagen */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Imagen del producto</label>
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
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Categoría *</label>
                <select value={form.idCategoria} onChange={e => setForm(p => ({ ...p, idCategoria: e.target.value }))}
                  className={iCls + " cursor-pointer"}>
                  {CATEGORIAS_PRODUCTO.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              {/* Precio (el stock NO se escribe aquí: todo producto nuevo
                  empieza en 0 y lo actualiza el sistema) */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Precio unitario (COP)</label>
                <input type="number" value={form.costoUnitario}
                  onChange={e => setForm(p => ({ ...p, costoUnitario: Number(e.target.value) }))} className={iCls} />
              </div>
            </div>
            </div>
          </div>

          {/* ── COLUMNA DERECHA: ficha técnica ── */}
          {/* La ficha técnica scrollea por dentro. Se guarda con el mismo
              botón "Crear" del encabezado (ya no hay "Guardar Ficha Técnica"
              aparte). Solo se activa si "¿Tiene ficha técnica?" es Sí. Al
              ocultarla, la columna colapsa con una animación de 0,2 s y NO se
              borra lo diligenciado. */}
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
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ficha Técnica</p>
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary">
                  Nueva versión (borrador)
                </span>
              </div>

              <p className="text-[11px] text-muted-foreground mb-3 bg-muted/40 px-3 py-1.5 rounded-lg">
                La ficha se guarda como <span className="font-bold text-foreground">v1</span> junto con el producto.
              </p>

              <div className="space-y-4">
                {/* ID Ficha Técnica + Tiempo + Porciones */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">ID Ficha Técnica</label>
                  <input value={activeV.idReceta} readOnly tabIndex={-1}
                    className="w-full px-3 py-2.5 bg-muted/50 rounded-xl border border-border text-sm text-foreground cursor-not-allowed" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Tiempo de preparación (min)</label>
                    <input type="number" min={0} value={activeV.tiempoPreparacion}
                      onChange={e => updateFichaField("tiempoPreparacion", Number(e.target.value))} className={iCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Porciones</label>
                    <input type="number" min={1} value={activeV.porciones}
                      onChange={e => updateFichaField("porciones", Number(e.target.value))} className={iCls} />
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
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad</label>
                      <input type="number" min={0.1} step={0.1} value={fichaInsumoCantidad}
                        onChange={e => setFichaInsumoCantidad(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Medida</label>
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
          </div>
        </div>
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
    const readCls = "w-full px-3 py-2.5 bg-muted/50 rounded-xl border border-border text-sm text-foreground";
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
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

        <div className="flex divide-x divide-border" style={{ minHeight: "calc(100vh - 73px)" }}>

          {/* COLUMNA IZQUIERDA: datos del producto */}
          <div className={tipoDe(detailItem) === TIPOS_PRODUCTO[0] ? "w-1/2 px-8 py-6 overflow-y-auto" : "w-full max-w-2xl mx-auto px-8 py-6 overflow-y-auto"}>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Datos del producto</p>
            {FormFields({
              values: detailItem,
              onChange: () => {},
              readOnly: true,
            })}
            
            {/* Stock: unidades, porciones por unidad (según la ficha VIGENTE)
                y total de porciones. Solo lectura: lo actualiza el sistema. */}
            {(() => {
              const vigente = fichaVigente(detailItem.id);
              const conFicha = tipoDe(detailItem) === TIPOS_PRODUCTO[0] && vigente;
              return (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Stock</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border">
                      <span className="text-sm font-medium text-foreground">Unidades</span>
                      <span className={`text-sm font-bold ${detailItem.stockDisponible <= 5 ? "text-red-600" : detailItem.stockDisponible <= 15 ? "text-yellow-600" : "text-emerald-600"}`}>
                        {detailItem.stockDisponible} {palabraStock(detailItem, detailItem.stockDisponible)}
                      </span>
                    </div>
                    {conFicha && (
                      <>
                        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border">
                          <span className="text-sm font-medium text-foreground">Porciones por unidad (según ficha v{vigente.version})</span>
                          <span className="text-sm font-bold text-foreground">{vigente.porciones}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border">
                          <span className="text-sm font-medium text-foreground">Total de porciones</span>
                          <span className="text-sm font-bold text-foreground">{detailItem.stockDisponible * vigente.porciones}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">{ayudaStock(detailItem)}</p>
                </div>
              );
            })()}
          </div>

          {/* COLUMNA DERECHA: ficha técnica (solo Producto insumo; un
              "Producto" de reventa no lleva ficha y no se muestra la sección) */}
          {tipoDe(detailItem) === TIPOS_PRODUCTO[0] && (
          <div className="w-1/2 px-8 py-6 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-4">
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
              <div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold mb-3 ${
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
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
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

        <div className="flex divide-x divide-border" style={{ minHeight: "calc(100vh - 73px)" }}>

          {/* COLUMNA IZQUIERDA: datos editables. Con la ficha oculta ocupa el
              ancho (max-w-2xl centrado) con animación de 0,2 s. */}
          <div className={`${fichaOculta ? "flex-1" : "w-1/2"} px-8 py-6 overflow-y-auto transition-all duration-200`}>
            <div className={fichaOculta ? "max-w-2xl mx-auto" : ""}>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Datos del producto</p>
            {/* ¿Tiene ficha técnica? — bloqueado si ya hay versiones guardadas */}
            {(() => {
              const tieneHistorialFicha = (fichas[editItem.id]?.length ?? 0) > 0;
              return (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">¿Tiene ficha técnica? *</label>
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

          {/* COLUMNA DERECHA: ficha técnica. Solo el borrador es editable;
              las versiones guardadas se ven en solo lectura con fondo gris.
              Un "Producto" de reventa no lleva ficha: la sección queda
              deshabilitada con el mensaje correspondiente. Al ocultarla, la
              columna colapsa con animación de 0,2 s sin borrar los datos. */}
          {tipoDe(editItem) !== TIPOS_PRODUCTO[0] ? (
            <div className={`py-6 overflow-y-auto flex flex-col transition-all duration-200 ${
              fichaOculta ? "w-0 px-0 opacity-0 overflow-hidden border-l-0" : "w-1/2 px-8 opacity-100"
            }`}>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Ficha Técnica</p>
              <div className="flex-1 flex flex-col items-center justify-center text-center bg-muted/40 rounded-2xl border border-border p-6 select-none">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-sm font-semibold text-muted-foreground">Este producto no lleva ficha técnica</p>
              </div>
            </div>
          ) : (() => {
            const activeEV = editFichaBorrador;
            const vSel = editFichaSel === "borrador" ? null : editFichaVersiones[editFichaSel];
            return (
              <div className={`py-6 overflow-y-auto flex flex-col transition-all duration-200 ${
                fichaOculta ? "w-0 px-0 opacity-0 overflow-hidden border-l-0" : "w-1/2 px-8 opacity-100"
              }`}>
                <div className="flex items-center justify-between mb-2">
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
                    <FichaReadOnly
                      v={vSel}
                      readCls="w-full px-3 py-2.5 bg-muted/60 rounded-xl border border-border text-sm text-muted-foreground"
                    />
                  </div>
                ) : (
                <div className="space-y-4 flex-1">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">ID Ficha Técnica</label>
                    <input value={activeEV.idReceta} readOnly tabIndex={-1}
                      className="w-full px-3 py-2.5 bg-muted/50 rounded-xl border border-border text-sm text-foreground cursor-not-allowed" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Tiempo de preparación (min)</label>
                      <input type="number" min={0} value={activeEV.tiempoPreparacion}
                        onChange={e => updateEditFichaField("tiempoPreparacion", Number(e.target.value))} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Porciones</label>
                      <input type="number" min={1} value={activeEV.porciones}
                        onChange={e => updateEditFichaField("porciones", Number(e.target.value))} className={inputCls} />
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
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad</label>
                        <input type="number" min={0.1} step={0.1} value={editFichaInsumoCantidad}
                          onChange={e => setEditFichaInsumoCantidad(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Medida</label>
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
    <div className="p-6 max-w-6xl mx-auto">
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
            {productos.length} productos registrados
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
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, categoría o tipo..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
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
          <table className="w-full">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                {[
                  "Imagen",
                  "Nombre",
                  "Tipo",
                  "Ficha técnica",
                  "Categoría",
                  "Precio de venta",
                  "Stock",
                  "Estado",
                  "Acciones",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-semibold whitespace-nowrap"
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
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                        {p.imagen ? (
                          <img
                            src={p.imagen}
                            alt={p.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            —
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-foreground">
                      {p.nombre}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${tipoPillCls(tipoDe(p))}`}>
                        {tipoDe(p)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
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
                    <td className="px-4 py-3.5 text-sm text-foreground">
                      {catName(p.idCategoria)}
                    </td>
                    {/* Precio de venta al público (precioUnitario), NO el
                        costo: antes esta columna pintaba costoUnitario. */}
                    <td
                      className="px-4 py-3.5 text-sm font-bold text-foreground"
                      style={{ fontFamily: MONO }}
                    >
                      {fmtCOP(p.precioUnitario)}
                    </td>
                    <td className="px-4 py-3.5" title={ayudaStock(p)}>
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`text-sm font-bold ${p.stockDisponible <= 5 ? "text-red-600" : p.stockDisponible <= 15 ? "text-yellow-600" : "text-emerald-600"}`}
                        >
                          {p.stockDisponible} {palabraStock(p, p.stockDisponible)}
                        </span>
                        {/* Producto insumo con ficha: total de porciones según
                            la versión VIGENTE. Producto o sin ficha: solo
                            unidades (no se muestra nada más). */}
                        {tipoDe(p) === TIPOS_PRODUCTO[0] && fichaVigente(p.id) && (
                          <span className="text-xs text-muted-foreground">
                            {p.stockDisponible * fichaVigente(p.id)!.porciones} porciones ({fichaVigente(p.id)!.porciones} por {palabraStock(p, 1)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {/* El estado se elige de una lista redondeada (ya no
                          alterna); al elegir, se confirma en el modal
                          "pasará de X a Y". Sin permiso de edición solo se ve
                          el badge, sin flecha. */}
                      <EstadoProductoSelect
                        value={p.estado}
                        disabled={!canEdit}
                        onChange={(next) =>
                          setConfirmEstado({ id: p.id, nombre: p.nombre, current: p.estado, next })
                        }
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setDetailItem(p);
                            // Abre mostrando la versión vigente (la última).
                            setDetailVIdx(Math.max(0, (fichas[p.id]?.length ?? 1) - 1));
                          }}
                          title="Ver detalle"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => openEdit(p)}
                            title="Editar"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteId(p.id)}
                            title="Eliminar"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
