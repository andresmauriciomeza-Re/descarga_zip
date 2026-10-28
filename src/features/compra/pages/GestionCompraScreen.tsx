import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Eye, X, ArrowLeft,
  Plus, Check, Ban, CheckCircle2, HelpCircle, Pencil, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { exportarMultiExcelEstilizado, exportarGestionComprasConInsumosExcel, type GestionCompraConInsumos } from "@/shared/utils/exportExcelEstilizado";
import { calcularLineaIva } from "@/features/compras/services/iva";
import type { CategoriaInsumo, Insumo } from "@/features/insumos/pages/GestionInsumosScreen";
import type { Producto } from "@/features/productos/pages/GestionProductosScreen";
import { CompactInsumoForm, type InsumoSuggestion } from "@/features/compras/components/CompactInsumoForm";
// Bloque 2: "+ Crear producto" desde el desplegable de ítems de la compra.
import { CrearProductoModal } from "@/features/productos/components/CrearProductoModal";
import type { CategoriaProducto } from "@/features/categoria-productos/pages/CategoriaProductoScreen";
import { InsumosSolicitadosTable } from "@/features/compras/components/InsumosSolicitadosTable";
import { EstadoSelect } from "@/shared/components/EstadoSelect";
import { SegmentadoButtons } from "@/shared/components/SegmentadoButtons";
import { SearchInput } from "@/shared/components/SearchInput";
import { ActionIcons, CLASE_BASE, CLASE_HOVER } from "@/shared/components/ActionIcons";
import { CalendarDropdown } from "@/shared/components/CalendarDropdown";
import { limpiarNumeroInput, numeroDeInput } from "@/shared/utils/numeroInput";
import { Paginador } from "@/shared/components/Paginador";
import { BotonDescargarExcel } from "@/shared/components/BotonDescargarExcel";
import {
  NuevoProveedorModal,
  NuevoInsumoModal,
  ConfirmModal,
  FORM_MAXW,
  type GestionCompra,
  type OrdenItem,
  type OrdenCompra,
  type EstadoGestion,
  type EstadoOrden,
  type ProveedorRef,
} from "@/features/orden-compra/pages/OrdenCompraScreen";
import {
  historialCompraDe,
  esLineaProducto,
  textoStockActualizado,
  unidadesPorLinea,
  type SetCatalogo,
} from "@/features/compras/services/inventario";
import {
  anularCompra as anularCompraApi,
  crearCompra,
  mensajeErrorCompras,
} from "@/features/compras/services/comprasApi";
import { obtenerOrdenCompra } from "@/features/orden-compra/services/ordenesCompraApi";
import {
  contenidoDe,
  empaqueDe,
  nombreBuscable,
  presentacionCompra,
} from "@/shared/utils/presentacion";

// ─── CONTROL DE STOCK DE LAS COMPRAS ─────────────────────────────────────────
// Las funciones de inventario (sumar/revertir stock) viven en
// `services/inventario.ts` para que la Recepción de compra comparta
// EXACTAMENTE el mismo camino sin tener que importar esta pantalla.

/**
 * `GestionCompra` se declara en OrdenCompraScreen.tsx (archivo que este cambio
 * no puede tocar), así que se amplía con *module augmentation*: TypeScript
 * fusiona estos dos campos con la interfaz original en todo el proyecto sin
 * duplicar el modelo.
 *
 * - `stockAplicado`: la compra ya sumó sus ítems al inventario. Marca de
 *   control para aplicar el stock UNA sola vez (guardar/reintentar dos veces
 *   no debe duplicar la suma).
 * - `stockRevertido`: esa suma ya se devolvió al anular. Guard para que una
 *   segunda anulación (o un reintentos) no reste dos veces la misma compra.
 */
declare module "@/features/orden-compra/pages/OrdenCompraScreen" {
  interface GestionCompra {
    stockAplicado?: boolean;
    stockRevertido?: boolean;
  }
}

const SERIF = "var(--font-titulo)";

const ESTADO_CONFIG: Record<EstadoGestion, string> = {
  "Recibido":   "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  "Anulado":    "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
};

/** Badge de estado, con el mismo estilo que el detalle de Orden de Compra. */
function EstadoBadge({ e }: { e: EstadoGestion }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ESTADO_CONFIG[e]}`}>
      {e}
    </span>
  );
}

function fmtCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

// ─── NUEVA COMPRA ─────────────────────────────────────────────────────────────

const iCls =
  "w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

// Anchos compactos de los campos superiores, en línea con el detalle de Orden de Compra
const campoCortoCls = "max-w-[180px]"; // Fecha de factura · Estado
const campoMedioCls = "max-w-[240px]"; // Número de factura
const campoLargoCls = "max-w-xs"; // Proveedor (búsqueda)

/** Sección con título pequeño en mayúsculas y línea divisoria: mismo estilo
 *  que el formulario Nuevo Proveedor. */
const seccionCls =
  "text-[11px] leading-none font-bold uppercase tracking-widest text-muted-foreground pb-1.5 border-b border-border";

/** Labels de las guías: 13px en gris oscuro (pantalla completa). */
const labelPaginaCls = "block text-[13px] leading-tight font-medium text-foreground/70 mb-1";
const labelModalCls = "block text-xs font-semibold text-muted-foreground mb-1.5";

/** Inputs en pantalla completa: mismo estilo que `iCls` pero con 40px EXACTOS
 *  (py-2.5 + border da 42px, y la fila de insumos y el selector de IVA van a
 *  40px, así todos los controles del formulario miden lo mismo). */
const iPaginaCls =
  "w-full h-10 px-3 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Tooltip de la opción de IVA no elegida, bloqueada con insumos en la tabla. */
const MSJ_IVA_BLOQUEADO = "Elimina los ítems agregados para cambiar esta opción";

/** Ayuda del ícono (?) junto a la pregunta del selector de precios. */
const MSJ_IVA_AYUDA =
  "Mira la parte de abajo de la factura. Si aparece una línea de IVA que se SUMA al subtotal, elige “Precios sin IVA”. Si no aparece esa línea o dice “IVA incluido”, elige “Precios con IVA incluido”.";

/** Error rojo bajo las tarjetas al intentar agregar o guardar sin elegir. */
const MSJ_IVA_FALTA = "Elige cómo vienen los precios en la factura";

/** Aviso de la sección "Agregar insumo" mientras no se ha elegido nada. */
const MSJ_SIN_PRECIOS = "Primero elige cómo vienen los precios en la factura";

/** Las dos tarjetas del selector (solo pantalla completa). */
const OPCIONES_IVA = [
  {
    valor: true,
    titulo: "Con IVA incluido",
    tag: "Más común",
    desc: "El IVA ya está en el precio",
  },
  {
    valor: false,
    titulo: "Sin IVA",
    tag: "",
    desc: "El IVA se suma al final",
  },
] as const;

/** P14: qué se está agregando a la factura de compra. Mismos valores que
 *  `OrdenItem.tipoItem`, para que el dato guardado sea compatible con las
 *  compras que nacen de una Orden de Compra. */
type TipoItem = "insumo" | "producto";

type ItemFactura = {
  rowId: string;
  idInsumo: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  costoUnitario: number;
  precioUnitario: number;
  /** Porcentaje de IVA de la línea (0–100). */
  iva: number;
  /** Valores guardados de la línea (se recalculan en el backend). */
  baseSinIva?: number;
  montoIva?: number;
  /** P14: insumo del catálogo o producto del módulo de productos. */
  tipoItem?: TipoItem;
  /** Precio de VENTA al público del producto (sólo `tipoItem === "producto"`).
   *  Se copia del catálogo al agregar el ítem y se muestra como
   *  "Producto · Venta: $ X" bajo el nombre. Opcional: las líneas antiguas
   *  y las de insumos no lo traen. */
  precioVenta?: number;
  /** Ajuste de bebidas: unidades que trae la paca/caja de ESTA línea (12 si
   *  se compró "Paca x12"). Opcional: las líneas viejas y las de unidad
   *  suelta no lo traen y se leen como 1. */
  unidadesPorEmpaque?: number;
  stockApiAplicado?: boolean;
  stockApiRevertido?: boolean;
  stockApiPendiente?: boolean;
  stockApiPendienteReversa?: boolean;
};

export interface NuevaCompraData {
  proveedor: string;
  proveedorId?: string;
  numeroFactura: string;
  fechaFactura: string;
  valorTotal: number;
  estado: EstadoGestion;
  items: ItemFactura[];
  /** true = los montos de la factura ya incluyen el IVA. */
  ivaIncluido: boolean;
  /** Suma de las bases (sin IVA) de las líneas. */
  subtotalSinIva: number;
  /** Suma del IVA de las líneas. */
  totalIva: number;
  /** Total pagado = subtotalSinIva + totalIva (= valorTotal). */
  totalPagado: number;
}

// ─── P14: TABLA DE ÍTEMAS DE LA FACTURA ──────────────────────────────────────

/**
 * P14: tabla de los ítems agregados en la Nueva compra.
 *
 * Punto 3.3: columnas LITERALES del plan — Nombre | Cantidad | Medida |
 * Monto unitario | IVA | Acciones (editar/eliminar) — con el resumen
 * Subtotal / IVA / Total debajo.
 *
 * Es LOCAL y no reutiliza `InsumosSolicitadosTable`: la edición es EN LÍNEA
 * en la propia fila (borrador con ✓ / ✗, punto B3), mientras que el
 * formulario de la izquierda siempre queda en modo "Agregar". Los cálculos
 * son los mismos: `calcularLineaIva` con la opción de precios elegida, de
 * modo que la suma incluye por igual insumos y productos.
 */
function TablaItemsFactura({
  items,
  onEdit,
  onCommit,
  onCancelarEdicion,
  onRemove,
  modoIva = false,
  ivaIncluido = true,
  enPagina = false,
  rowEditando = null,
  className = "",
}: {
  items: ItemFactura[];
  /** Lápiz: abre la edición en línea de la fila y avisa al formulario. */
  onEdit: (row: ItemFactura) => void;
  /** ✓: aplica el borrador de la fila (con las mismas validaciones que al agregar). */
  onCommit: (rowId: string, patch: Partial<ItemFactura>) => void;
  /** ✗: descarta el borrador y sale de la edición de esa fila. */
  onCancelarEdicion: () => void;
  onRemove: (rowId: string) => void;
  modoIva?: boolean;
  ivaIncluido?: boolean;
  /** Misma estructura que la tabla compartida: sin card ni título. */
  enPagina?: boolean;
  /** Fila en edición en línea (se resalta y muestra ✓ / ✗). */
  rowEditando?: string | null;
  className?: string;
}) {
  /** Borrador de la fila en edición (punto B3): cantidad, monto, IVA y — en
   *  líneas de producto — precio de venta; nombre y medida son texto porque
   *  los define el ítem del catálogo. */
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draft, setDraft] = useState<
    Pick<ItemFactura, "cantidad" | "precioUnitario" | "iva"> & {
      precioVenta?: number;
    }
  | null>(null);

  // Si el padre cancela la edición desde afuera (p. ej. al agregar otra fila,
  // que deja el formulario en "Agregar"), el borrador se descarta con él.
  useEffect(() => {
    if (rowEditando === null) {
      setDraftId(null);
      setDraft(null);
    }
  }, [rowEditando]);

  const startEdit = (row: ItemFactura) => {
    setDraftId(row.rowId);
    setDraft({
      cantidad: row.cantidad,
      precioUnitario: row.precioUnitario,
      iva: row.iva,
      precioVenta: row.precioVenta,
    });
    onEdit(row);
  };

  const cancelEdit = () => {
    setDraftId(null);
    setDraft(null);
    onCancelarEdicion();
  };

  const commitEdit = (rowId: string) => {
    if (!draft) return;
    // Mismas validaciones que al agregar una fila nueva.
    if (draft.cantidad <= 0) {
      toast.error("La cantidad debe ser mayor que cero.");
      return;
    }
    if (draft.precioUnitario < 0) {
      toast.error("El precio unitario no puede ser negativo.");
      return;
    }
    if (draft.iva < 0 || draft.iva > 100) {
      toast.error("El IVA debe estar entre 0 % y 100 %.");
      return;
    }
    // Punto B2 + punto 3 + ajuste: en edición en línea el precio de venta de
    // un producto sigue siendo obligatorio (> 0 y > costo POR UNIDAD con
    // IVA), igual que al agregarlo. El costo con IVA usa el modo de precios
    // de la factura y, con paca/caja, se divide en las unidades de la fila.
    const fila = items.find((r) => r.rowId === rowId);
    if (fila && (fila.tipoItem ?? "insumo") === "producto") {
      const pv = draft.precioVenta ?? 0;
      const costo =
        (modoIva && ivaIncluido
          ? draft.precioUnitario
          : draft.precioUnitario * (1 + draft.iva / 100)) / unidadesPorLinea(fila);
      if (pv <= 0) {
        toast.error("El precio de venta del producto debe ser mayor que cero.");
        return;
      }
      if (pv <= costo) {
        toast.error("El precio de venta debe ser mayor que el costo por unidad con IVA.");
        return;
      }
    }
    onCommit(rowId, draft);
    setDraftId(null);
    setDraft(null);
  };

  const linea = (row: ItemFactura) =>
    modoIva
      ? calcularLineaIva({
          cantidad: row.cantidad,
          montoUnitario: row.precioUnitario,
          porcentajeIva: row.iva,
          ivaIncluido,
        })
      : (() => {
          const base = row.cantidad * row.precioUnitario;
          const monto = Math.round((base * row.iva) / 100);
          return { baseSinIva: base, montoIva: monto, subtotalConIva: base + monto };
        })();

  // Los totales incluyen el borrador de la fila en edición, así el pie se
  // mueve al escribir y no hace que "no cuadre" hasta pulsar ✓.
  const filasVisibles = items.map((row) =>
    row.rowId === draftId && draft ? { ...row, ...draft } : row
  );

  const totales = filasVisibles.reduce(
    (acc, row) => {
      const l = linea(row);
      acc.baseSinIva += l.baseSinIva;
      acc.montoIva += l.montoIva;
      acc.total += l.subtotalConIva;
      return acc;
    },
    { baseSinIva: 0, montoIva: 0, total: 0 }
  );

  // Input numérico de las celdas en edición: mismo estilo de celda que
  // `InsumosSolicitadosTable`, sin spinners (el ancho de la columna es fijo).
  const inputCelda =
    "w-full h-8 px-1.5 bg-muted border border-border rounded-xl text-sm text-foreground text-right focus:outline-none focus:ring-2 focus:ring-primary/30 " +
    "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  // Punto 3.3: columnas LITERALES del plan. La suma de anchos fijos (248 px +
  // acciones) deja ~250 px de sobra para "Nombre" a 1366×768, así que la tabla
  // NO muestra scroll horizontal; la Medida va en su propia columna.
  // Punto 2.8c: se agrega "Subtotal" a la lista (antes sólo se veía en el pie)
  // y las columnas de dinero se alinean a la derecha.
  const headers = ["Nombre", "Cantidad", "Medida", "Monto unitario", "IVA", "Subtotal"];
  const ANCHOS: Record<string, number> = {
    Cantidad: 64,
    Medida: 56,
    "Monto unitario": 68,
    IVA: 60,
    Subtotal: 88,
  };
  const ANCHO_ACCIONES = 64;
  const columnCount = headers.length + 1;
  const td = "align-middle px-1.5 " + (enPagina ? "py-1.5" : "py-2.5");
  /** Columnas numéricas: se alinean a la derecha para que las cifras se lean
      como columnas de datos (punto 2.8c). */
  const NUMERICA = new Set(["Cantidad", "Monto unitario", "IVA", "Subtotal"]);

  return (
    <div
      className={
        (enPagina
          ? "flex flex-col flex-1 min-h-0 "
          : "rounded-xl border border-border bg-muted/30 overflow-hidden flex flex-col ") +
        className
      }
    >
      {!enPagina && (
        <div className="px-3 py-2 border-b border-border bg-muted/30 shrink-0">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Ítems de la factura
          </p>
        </div>
      )}

      <div
        className={
          // Punto 2.8c: sin `flex items-center` cuando está vacío — centraba
          // el mensaje en toda la altura restante y dejaba EL HUECO GRANDE
          // entre "Precios con IVA incluido" y la tabla. Ahora el aviso queda
          // pegado a la cabecera.
          "flex-1 min-h-0 overflow-auto"
        }
      >
        {/* Punto 2.8c: sin `[&_td]:py-2` en página — esa regla pisaba el
            `py-1.5` de las celdas y las filas no se compactaban. */}
        <table
          className={"table-fixed w-full min-w-[500px] text-sm "}
        >
          <colgroup>
            {headers.map((h) => (
              <col key={h} style={{ width: ANCHOS[h] }} />
            ))}
            <col style={{ width: ANCHO_ACCIONES }} />
          </colgroup>
          <thead
            className={
              "text-[10px] uppercase tracking-wider " +
              (enPagina
                ? "sticky top-0 z-10 border-b border-border bg-muted text-muted-foreground"
                : "bg-muted/50 text-muted-foreground")
            }
          >
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className={
                    "px-1.5 font-semibold " +
                    (NUMERICA.has(h) ? "text-right " : "text-left ") +
                    (enPagina ? "py-1.5 bg-muted" : "py-2.5")
                  }
                >
                  {h}
                </th>
              ))}
              <th className={"px-1.5 " + (enPagina ? "py-1.5 bg-muted" : "py-2.5")} />
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="text-center text-[11px] font-medium text-muted-foreground/80 px-3 py-6"
                >
                  {enPagina ? "Aún no has agregado ítems" : "Sin ítems agregados"}
                </td>
              </tr>
            ) : (
              filasVisibles.map((row) => {
                const l = linea(row);
                const editandoFila = rowEditando === row.rowId && draft !== null;
                return (
                  <tr
                    key={row.rowId}
                    className={`hover:bg-muted/20 transition-colors ${
                      editandoFila ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className={td + " text-sm font-medium text-foreground"}>
                      {/* El nombre NO se edita en línea: lo define el ítem
                          agregado (punto B3). */}
                      <div className="line-clamp-2 break-words" title={row.nombre}>
                        {row.nombre}
                      </div>
                      {/* P14: si la línea salió del catálogo de productos se
                          deja ver el precio de venta al público. En EDICIÓN
                          en línea ese precio se edita aquí mismo (punto B3):
                          es obligatorio y debe superar al monto unitario. */}
                      {(row.tipoItem ?? "insumo") === "producto" && (
                        <div className="text-[11px] font-normal text-muted-foreground mt-0.5">
                          Producto
                          {editandoFila && draft ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span>Venta</span>
                              <input
                                type="number"
                                min={0}
                                value={draft.precioVenta || ""}
                                placeholder="0"
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    precioVenta: numeroDeInput(
                                      limpiarNumeroInput(e.target.value)
                                    ),
                                  })
                                }
                                className={inputCelda + " w-[110px] h-7"}
                              />
                            </div>
                          ) : (
                            row.precioVenta != null && row.precioVenta > 0 && (
                              <>· Venta: {fmtCOP(row.precioVenta)}</>
                            )
                          )}
                        </div>
                      )}
                    </td>
                    {/* Punto 2.8c: columnas numéricas alineadas a la derecha.
                        Punto B3: en edición el 0 se muestra vacío (placeholder
                        "0") y los ceros a la izquierda se limpian al teclear. */}
                    <td className={td + " text-sm text-right"}>
                      {editandoFila && draft ? (
                        <input
                          type="number"
                          min={0}
                          autoFocus
                          value={draft.cantidad === 0 ? "" : draft.cantidad}
                          placeholder="0"
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              cantidad: numeroDeInput(limpiarNumeroInput(e.target.value)),
                            })
                          }
                          className={inputCelda}
                        />
                      ) : (
                        row.cantidad
                      )}
                    </td>
                    {/* Punto 3.3: Medida en su propia columna (solo lectura;
                        la define el ítem del catálogo). */}
                    <td className={td + " text-xs text-muted-foreground"}>{row.unidad}</td>
                    <td className={td + " text-sm text-right whitespace-nowrap"}>
                      {editandoFila && draft ? (
                        <input
                          type="number"
                          min={0}
                          value={draft.precioUnitario === 0 ? "" : draft.precioUnitario}
                          placeholder="0"
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              precioUnitario: numeroDeInput(limpiarNumeroInput(e.target.value)),
                            })
                          }
                          className={inputCelda}
                        />
                      ) : (
                        fmtCOP(row.precioUnitario)
                      )}
                    </td>
                    <td className={td + " text-xs text-muted-foreground text-right"}>
                      {editandoFila && draft ? (
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            // Vacío = 0 % (punto B1): el 0 es un valor válido y
                            // los subtotales de la fila nunca quedan en NaN.
                            value={draft.iva === 0 ? "" : draft.iva}
                            placeholder="0"
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                iva: numeroDeInput(limpiarNumeroInput(e.target.value)),
                              })
                            }
                            className={inputCelda + " pr-4"}
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-[11px] text-muted-foreground">
                            %
                          </span>
                        </div>
                      ) : (
                        <>
                          <span className="text-[13px] text-foreground/80">{row.iva}%</span>
                          {/* Mientras se edita no se pinta el monto: quedaba
                              "$ 0" debajo del input y agrandaba la fila. */}
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {fmtCOP(l.montoIva)}
                          </p>
                        </>
                      )}
                    </td>
                    {/* Punto 2.8c: el subtotal de la línea se veía sólo en el
                        pie; ahora tiene su columna, junto a IVA. En edición
                        sigue el borrador para que reaccione al escribir. */}
                    <td className={td + " text-sm font-semibold text-foreground text-right whitespace-nowrap"}>
                      {fmtCOP(l.subtotalConIva)}
                    </td>
                    <td className={td + " whitespace-nowrap"}>
                      <div className="flex items-center gap-1">
                        {editandoFila ? (
                          <>
                            <button
                              type="button"
                              onClick={() => commitEdit(row.rowId)}
                              title="Confirmar cambios"
                              className="p-1 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              title="Cancelar edición"
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(row)}
                              title="Editar ítem"
                              className={`${CLASE_BASE} ${CLASE_HOVER}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemove(row.rowId)}
                              title="Eliminar ítem"
                              className={`${CLASE_BASE} ${CLASE_HOVER}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Punto 2.8c: el pie de totales vive DENTRO del scroller, pegado a la
            última fila. Antes era hermano del scroller y quedaba anclado al
            fondo de la columna, dejando un hueco grande (medido: 345 px a
            1366×768 con 1 ítem) entre la tabla y "Total pagado". Con muchas
            filas el scroller sigue absorbiendo el desborde. */}
        {items.length > 0 && (
          <div
            className={
              "flex flex-wrap items-baseline justify-end gap-x-5 gap-y-1 px-3 py-2 border-t border-border" +
              (enPagina ? " min-w-[500px]" : "")
            }
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {modoIva ? "Subtotal sin IVA" : "Subtotal"}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {fmtCOP(totales.baseSinIva)}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              IVA
            </span>
            <span className="text-sm font-semibold text-foreground">{fmtCOP(totales.montoIva)}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total pagado
            </span>
            <span className="text-lg font-bold text-foreground">{fmtCOP(totales.total)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CompraForm({
  proveedores,
  setProveedores,
  insumos,
  productos,
  categorias,
  gestiones,
  mode = "create",
  compra,
  fullPage = false,
  ordenes,
  onClose,
  onGuardar,
  onCrearProducto,
  categoriasInsumo,
}: {
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  insumos: Insumo[];
  /** Bloque 2.2: categorías de insumos desde la API para el "+ Crear insumo". */
  categoriasInsumo?: CategoriaInsumo[];
  /** P14: catálogo de productos del módulo de Productos: son la otra mitad
   *  del selector "Tipo" de la Nueva compra. */
  productos?: Producto[];
  /** Bloque 2: categorías del panel para el "+ Crear producto" (sólo las de
   *  tipo "Producto terminado" se ofrecen). */
  categorias?: CategoriaProducto[];
  /** Gestiones de compra existentes para validar factura única. */
  gestiones: GestionCompra[];
  mode?: "create" | "view";
  compra?: GestionCompra;
  fullPage?: boolean;
  /** Órdenes de compra: necesarias para separar solicitados / no solicitados. */
  ordenes?: OrdenCompra[];
  onClose: () => void;
  onGuardar: (data: NuevaCompraData) => void | Promise<void>;
  /** Bloque 2: alta de productos desde "+ Crear producto" (callback de App:
   *  agrega el producto al catálogo del panel; sin él el atajo no se muestra). */
  onCrearProducto?: (p: Producto) => Promise<Producto>;
}) {
  const isView = mode === "view";
  const isPage = fullPage;
  // `toISOString()` devuelve la fecha en UTC: en Colombia (UTC-5) después de las
  // 19:00 devolvía el día siguiente, así que las facturas de hoy quedaban
  // bloqueadas por el `max` del date-picker. Se usa la fecha local, que es la
  // convención del proyecto (App.tsx, ProductosPerecederosScreen).
  const today = new Date().toLocaleDateString("en-CA");

  const [numeroFactura, setNumeroFactura] = useState(compra?.numeroFactura ?? "");
  const [fechaFactura, setFechaFactura] = useState(compra?.fechaFactura || today);
  const [items, setItems] = useState<ItemFactura[]>((compra?.items ?? []).map(item => ({
    rowId: item.rowId,
    idInsumo: item.idInsumo,
    nombre: item.nombre,
    unidad: item.unidad,
    cantidad: item.cantidad,
    costoUnitario: item.costoUnitario,
    precioUnitario: item.precioUnitario,
    iva: item.iva,
    baseSinIva: item.baseSinIva,
    montoIva: item.montoIva,
    // P14: se arrastran el catálogo y el precio de venta para que el detalle
    // pueda seguir mostrando "Producto · Venta" al reabrir la compra.
    tipoItem: item.tipoItem,
    precioVenta: item.precioVenta,
  })));

  // "¿Los montos de la factura incluyen IVA?".
  // Al CREAR ninguna opción viene seleccionada: hay que elegir una antes de
  // poder agregar insumos o guardar. En DETALLE se lee el valor guardado y las
  // compras antiguas, sin el campo, se leen como "Sí, IVA incluido"
  // (con IVA 0 % se ven exactamente igual que antes).
  const [ivaIncluido, setIvaIncluido] = useState<boolean | null>(
    compra ? compra.ivaIncluido ?? true : null
  );

  /**
   * Con al menos un insumo en la tabla, la opción de IVA NO elegida queda
   * bloqueada (deshabilitada y en gris). Si se borran todos los insumos, la
   * otra opción vuelve a desbloquearse.
   */
  const ivaBloqueada = (opcion: boolean) =>
    items.length > 0 && ivaIncluido !== null && ivaIncluido !== opcion;

  const [itemNombre, setItemNombre] = useState("");
  const [itemCantidad, setItemCantidad] = useState(1);
  // P11: la Medida ya no se elige a mano en la compra, así que el valor por
  // defecto es "und" y al guardar se toma SIEMPRE la unidad del insumo o del
  // producto seleccionado (ver `unidadElegida`).
  const [itemUnidad, setItemUnidad] = useState("und");
  // Ajuste de bebidas: unidades por paca/caja de la línea que se está
  // agregando (undefined = unidad suelta). Se carga del producto elegido y
  // se guarda en `ItemFactura.unidadesPorEmpaque`.
  const [itemEmpaque, setItemEmpaque] = useState<number | undefined>(undefined);
  const [itemPrecio, setItemPrecio] = useState(0);
  const [itemIva, setItemIva] = useState(0);
  const [itemId, setItemId] = useState("");
  // P14: qué se está agregando, insumo del catálogo o producto del módulo.
  const [itemTipo, setItemTipo] = useState<TipoItem>("insumo");
  // Bloque 2: "+ Crear producto" del desplegable de ítems.
  const [showNuevoProducto, setShowNuevoProducto] = useState(false);
  // Precio de VENTA al público del producto elegido (sólo se captura cuando
  // el tipo es "producto"; con insumos queda en 0 y no se guarda).
  const [itemPrecioVenta, setItemPrecioVenta] = useState(0);
  // Ajuste (bloque 2): el % de ganancia se quitó de la pantalla; el precio de
  // venta se escribe a mano y se valida contra el costo por unidad con IVA.
  const [itemSugAbierto, setItemSugAbierto] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  /** Input de Nombre: recupera el foco tras agregar o actualizar una fila. */
  const nombreRef = useRef<HTMLInputElement>(null);
  /** Fecha de factura: `abrirPicker` la abre con clic/foco (Chrome ya no
      despliega el calendario sólo con enfocar el campo — punto 2.8b). */
  const fechaFacturaRef = useRef<HTMLInputElement>(null);
  /** Fila en edición EN LÍNEA (punto B3): el lápiz de la tabla abre el
   *  borrador en la propia fila; el formulario de la izquierda siempre
   *  queda en modo "Agregar". */
  const [editando, setEditando] = useState<string | null>(null);

  // Factura única: normalización y validación de duplicados
  const normalizarFactura = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");
  const facturaActualNormalizada = normalizarFactura(numeroFactura);
  const facturaDuplicada = gestiones.some(
    (g) =>
      g.numeroFactura &&
      normalizarFactura(g.numeroFactura) === facturaActualNormalizada &&
      g.id !== (compra?.id ?? ""),
  );
  const [facturaTocada, setFacturaTocada] = useState(false);

  const [provQuery, setProvQuery] = useState(compra?.proveedor ?? "");
  const [provId, setProvId] = useState(compra?.proveedorId ?? "");
  const [provSugAbierto, setProvSugAbierto] = useState(false);
  const [mostrarNuevoProveedor, setMostrarNuevoProveedor] = useState(false);
  const [showGuardarConf, setShowGuardarConf] = useState(false);
  const [guardandoCompra, setGuardandoCompra] = useState(false);
  const [showNuevoInsumo, setShowNuevoInsumo] = useState(false);
  const provRef = useRef<HTMLDivElement>(null);

  /** Cerrar: vuelve directo al listado sin confirmación. */
  const salir = () => {
    onClose();
  };

  // ── Separación solicitados / no solicitados (solo detalle) ─────────────────
  // Regla del módulo: es "solicitado" el insumo cuyo id está en el detalle de
  // la Orden de Compra; todo lo demás llegó de más en la recepción.
  const orden = useMemo(
    () => ordenes?.find((o) => o.id === compra?.ordenId),
    [ordenes, compra?.ordenId]
  );
  const idsOrden = useMemo(
    () => new Set((orden?.items ?? []).map((i) => i.idInsumo)),
    [orden]
  );
  const solicitados = useMemo(
    () => (orden ? items.filter((i) => idsOrden.has(i.idInsumo)) : []),
    [orden, items, idsOrden]
  );
  const noSolicitados = useMemo(
    () => (orden ? items.filter((i) => !idsOrden.has(i.idInsumo)) : []),
    [orden, items, idsOrden]
  );
  // Punto 1: totales con la fórmula única `calcularLineaIva`.
  // Orden siempre: Subtotal sin IVA → IVA → Total pagado, y por construcción
  // subtotalSinIva + totalIva === totalPagado.
  const lineasIva = items.map((item) =>
    calcularLineaIva({
      cantidad: item.cantidad,
      montoUnitario: item.precioUnitario,
      porcentajeIva: item.iva,
      // Mientras no se elija ninguna opción no hay ítems, así que el `?? true`
      // solo evita el `null` del estado (nunca altera un cálculo real).
      ivaIncluido: ivaIncluido ?? true,
    })
  );
  const subtotalSinIva = lineasIva.reduce((s, l) => s + l.baseSinIva, 0);
  const totalIva = lineasIva.reduce((s, l) => s + l.montoIva, 0);
  const totalPagado = lineasIva.reduce((s, l) => s + l.subtotalConIva, 0);
  const total = subtotalSinIva + totalIva;

  // P14: reparto por tipo de ítem, para el contador de la cabecera de la
  // tabla ("5 ítems · 3 insumos · 2 productos").
  const nProductos = items.filter((i) => (i.tipoItem ?? "insumo") === "producto").length;
  const nInsumos = items.length - nProductos;

  // ── Validación en tiempo real (patrón de MiPerfilScreen) ──────────────────
  const [tocado, setTocado] = useState({ numeroFactura: false, fechaFactura: false });
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  /** Marca el intento de agregar/guardar sin haber elegido los precios: es lo
   *  que muestra el error rojo bajo las tarjetas (no aparece al abrir). */
  const [ivaIntentado, setIvaIntentado] = useState(false);

  const errorNumeroFactura = numeroFactura.trim()
    ? facturaDuplicada
      ? "Ya existe una compra con este número de factura"
      : undefined
    : "Ingresa el número de factura.";
  const errorFechaFactura = fechaFactura ? undefined : "Selecciona la fecha de la factura.";
  // El proveedor es opcional en este formulario.
  const errorItems = items.length > 0 ? undefined : "Agrega al menos un ítem a la factura.";

  const algunoTocado = tocado.numeroFactura || tocado.fechaFactura;
  const marcarTocado = (campo: "numeroFactura" | "fechaFactura") =>
    setTocado((t) => ({ ...t, [campo]: true }));

  /** Labels: 13px en gris oscuro en pantalla completa; xs gris en el modal. */
  const labelCls = isPage ? labelPaginaCls : labelModalCls;

  /** Etiqueta del campo de monto: según la opción elegida dice de qué valor
   *  se trata ("con IVA" / "sin IVA") para saber qué copiar de la factura. */
  const labelMonto =
    ivaIncluido === null
      ? "Monto unitario"
      : ivaIncluido
        ? "Monto unitario (con IVA)"
        : "Monto unitario (sin IVA)";

  /** Clase del input: resalta en rojo cuando el campo visible es inválido. */
  const campoCls = (error?: string) =>
    `${isPage ? iPaginaCls : iCls} transition-colors ${
      error ? "border-red-400 focus:ring-red-300" : ""
    }`;

  const provSugs = useMemo(() => {
    const q = provQuery.trim().toLowerCase();
    const base = q
      ? proveedores.filter((p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.nit.toLowerCase().includes(q) ||
          p.asesorComercial.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
        )
      : proveedores;
    return base.slice(0, 3);
  }, [proveedores, provQuery]);

  const itemSugs = useMemo<InsumoSuggestion[]>(() => {
    const q = itemNombre.trim().toLowerCase();

    // P14: el buscador mira un catálogo u otro según el tipo de ítem elegido.
    if (itemTipo === "producto") {
      // Bloque 2.5: se compran productos aunque estén "No disponible" (los
      // recién creados con "+ Crear producto" nacen así); sólo se excluyen
      // los DESCONTINUADOS, que ya no vuelven a comprarse. Punto 3.2: además
      // sólo "Producto terminado" (bebidas y reventa); los "Producto insumo"
      // (Pizzas, Lasañas) se producen, no se compran.
      const base = (productos ?? []).filter(
        (p) => p.estado !== "Descontinuado" && p.tipo === "Producto terminado",
      );
      // El buscador mira también el contenido ("coca 1.5") para distinguir
      // presentaciones del mismo producto.
      const filtrados = q
        ? base.filter((p) => nombreBuscable(p).toLowerCase().includes(q))
        : base;
      // Punto B1 + ajuste de bebidas: el monto de la línea es SIEMPRE el
      // costo (`costoUnitario`, que en el catálogo es POR UNIDAD) por las
      // unidades de la presentación: con "Paca x12" se precarga el precio
      // de la paca. Si viene en 0 (pendiente de calcular) el usuario lo
      // escribe a mano. Antes se caía al precio de venta y el producto
      // quedaba "gratis" en la factura.
      return filtrados.slice(0, 3).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        contenido: contenidoDe(p) || undefined,
        unidadMedida: presentacionCompra(p),
        costoUnitario: Number(p.costoUnitario || 0) * empaqueDe(p),
      }));
    }

    // Filtrar solo por tipo "Insumo" y estado "activo"
    const soloInsumos = insumos.filter(i => (i.tipo ?? "Insumo") === "Insumo" && i.estado === "activo");
    // Si el campo está vacío, mostrar los primeros 3 insumos disponibles
    if (!q) return soloInsumos.slice(0, 3);
    return soloInsumos.filter((i) => i.nombre.toLowerCase().includes(q)).slice(0, 3);
  }, [insumos, productos, itemNombre, itemTipo]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setItemSugAbierto(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (provRef.current && !provRef.current.contains(e.target as Node)) {
        setProvSugAbierto(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // Requiere al menos un insumo, que el total sea mayor que cero y haber
  // elegido si los montos de la factura incluyen IVA.
  const errorTotal = total > 0 ? undefined : "El total de la factura debe ser mayor que cero.";
  const camposOk =
    !errorNumeroFactura && !errorFechaFactura && !errorItems && !errorTotal;
  const faltaIva = ivaIncluido === null;
  // Guardar queda habilitado aunque falte elegir el IVA: en ese caso el clic
  // muestra el mensaje rojo bajo el selector (y el toast) sin abrir el confirm.
  const botonGuardarOk =
    camposOk && !facturaDuplicada &&
    // Con una fila en edición en línea no se guarda: primero se confirma (✓)
    // o se descarta (✗) el borrador, así la factura nunca se guarda con una
    // edición a medias (punto B3).
    editando === null;

  const seleccionarProveedor = (p: ProveedorRef) => {
    setProvQuery(p.nombre);
    setProvId(p.id);
    setProvSugAbierto(false);
  };

  const crearProveedor = (p: ProveedorRef) => {
    // Actualizar el estado global de proveedores en App.tsx para que el
    // listado de Proveedores lo vea inmediatamente.
    setProveedores((prev) => [p, ...prev.filter((x) => x.id !== p.id && x.nombre.toLowerCase() !== p.nombre.toLowerCase())]);
    setProvQuery(p.nombre);
    setProvId(p.id);
    setMostrarNuevoProveedor(false);
    toast.success(`Proveedor "${p.nombre}" creado`);
  };

  const seleccionarInsumo = (ins: Insumo) => {
    // Punto 2: el precio del catálogo viene en `costoUnitario` (number), que es
    // el mismo que muestra la lista desplegable. `precioUnitario` es null en las
    // semillas, por eso el Monto unitario quedaba en 0.
    setItemId(ins.id);
    setItemNombre(ins.nombre);
    // P11: la unidad es la del insumo (no hay select de Medida en la compra);
    // si viniera vacía se guarda "und" para no dejar la fila en blanco.
    setItemUnidad(ins.unidadMedida?.trim() || "und");
    setItemPrecio(Number(ins.costoUnitario ?? ins.precioUnitario ?? 0));
    setItemIva(Number(ins.iva ?? 0));
    setItemSugAbierto(false);
  };

  /** P14: catálogo de productos. Igual que con el insumo, se copian nombre,
   *  unidad de venta y monto; el producto no tiene IVA propio, así que sin
   *  historial de compra la línea queda en 0 % y el usuario puede ajustarlo
   *  en el formulario (con historial se trae ese %). */
  const seleccionarProducto = (p: Producto) => {
    setItemId(p.id);
    setItemNombre(p.nombre);
    // Ajuste de bebidas: la Medida muestra la presentación de compra
    // ("Paca x12", "Caja x6" o la unidad de venta) y la línea guarda el
    // empaque para saber cuántas unidades trae.
    setItemUnidad(presentacionCompra(p));
    const factor = empaqueDe(p);
    setItemEmpaque(factor > 1 ? factor : undefined);
    // Punto B1: el monto es SIEMPRE `costoUnitario` (que en el catálogo es
    // POR UNIDAD); nunca el precio de venta. Con paca/caja la línea se
    // cotiza por presentación: costoUnitario × unidades de la paca.
    const costoUnit = Number(p.costoUnitario || 0);
    const pv = Number(p.precioUnitario || 0);
    // Ajuste: con historial de compra se precarga el último monto SIN IVA (y
    // su %) según el modo elegido: "Sin IVA" va tal cual y "Con IVA incluido"
    // trae el IVA sumado al monto. Sin historial (productos viejos) manda el
    // costo del catálogo por presentación, como siempre.
    const hist = historialCompraDe(p);
    const monto = hist
      ? ivaIncluido === false
        ? hist.montoSinIva
        : Math.round(hist.montoSinIva * (1 + hist.iva / 100) * 100) / 100
      : costoUnit * factor;
    setItemPrecio(monto);
    setItemIva(hist ? hist.iva : 0);
    // Precio de VENTA al público: es `precioUnitario` del catálogo de
    // productos (el costo es `costoUnitario` POR UNIDAD, y el precio de
    // venta también se define por unidad suelta). Se guarda aparte del
    // monto unitario de la factura para poder mostrarlo en el detalle.
    setItemPrecioVenta(pv);
    setItemSugAbierto(false);
  };

  /** Punto 3: costo de referencia = costo unitario CON IVA. Con IVA
   *  incluido el monto ya lo trae; sin IVA incluido se le suma el % de la
   *  línea. Es contra ese costo que se valida que el precio de venta lo
   *  superpase. */
  const costoConIva = (monto: number, iva: number) =>
    ivaIncluido === false ? monto * (1 + iva / 100) : monto;

  /** Costo con IVA del ítem del formulario (lo ve el usuario bajo el campo):
   *  POR UNIDAD — si la línea es de paca/caja el monto (por presentación) se
   *  divide en `itemFactor`; unidad suelta ⇒ factor 1, sin cambios. */
  const itemFactor = unidadesPorLinea({ unidadesPorEmpaque: itemEmpaque });
  const costoRef = costoConIva(itemPrecio, itemIva) / itemFactor;

  const onMontoChange = (v: number) => setItemPrecio(v);

  const onIvaChange = (v: number) => setItemIva(v);

  /** Escribir el precio de venta a mano (sin % de ganancia: el precio manda
   *  y se valida contra el costo con IVA). */
  const onPrecioVentaChange = (v: number) => setItemPrecioVenta(v);

  /** Costo con IVA POR UNIDAD de una línea YA agregada (punto 3 + ajuste +
   *  backstop de guardar): con paca/caja el monto es por presentación. */
  const costoConIvaDeLinea = (i: ItemFactura) =>
    (ivaIncluido === false ? i.precioUnitario * (1 + i.iva / 100) : i.precioUnitario) /
    unidadesPorLinea(i);

  /** Punto B2 + punto 3 + ajuste: precio de venta OBLIGATORIO en líneas de
   *  producto: vacío, 0 o ≤ al costo por unidad CON IVA es un error en
   *  tiempo real; el botón Agregar queda deshabilitado y no existe
   *  "respaldo" de precio = costo. */
  const errorPrecioVenta =
    itemTipo === "producto" && itemNombre.trim()
      ? itemPrecioVenta <= 0
        ? "Ingresa el precio de venta del producto."
        : itemPrecioVenta <= costoRef
          ? "El precio de venta debe ser mayor que el costo por unidad con IVA."
          : undefined
      : undefined;

  /** P11 + ajuste: unidad que se guarda en la fila. SIEMPRE la del catálogo
   *  del ítem seleccionado — para productos, su presentación de compra
   *  ("Paca x12"); sólo si no hay nada seleccionado se cae en lo que tenga
   *  el campo o en "und". */
  const unidadElegida = () => {
    const delCatalogo =
      itemTipo === "producto"
        ? (() => {
            const p = productos?.find((x) => x.id === itemId);
            return p ? presentacionCompra(p) : undefined;
          })()
        : insumos.find((i) => i.id === itemId)?.unidadMedida;
    return delCatalogo?.trim() || itemUnidad.trim() || "und";
  };

  const agregarItem = () => {
    // Sin elegir cómo vienen los precios no se puede agregar nada: se marca el
    // intento y aparece el aviso rojo bajo las tarjetas (la sección está a la
    // mitad de opacidad y los campos, deshabilitados).
    if (ivaIncluido === null) {
      setIvaIntentado(true);
      return;
    }

    // Edición en línea (punto B3): el lápiz ya no carga la fila en el
    // formulario, así que aquí SIEMPRE se agrega una fila nueva y se
    // descarta cualquier borrador abierto en la tabla.
    if (!itemNombre.trim()) {
      toast.error("Ingresa el nombre del ítem.");
      return;
    }
    if (itemCantidad <= 0) {
      toast.error("La cantidad debe ser mayor que cero.");
      return;
    }
    if (itemPrecio < 0) {
      toast.error("El precio unitario no puede ser negativo.");
      return;
    }
    // Punto B2 + punto 3: en PRODUCTOS el precio de venta es obligatorio y
    // tiene que quedar por encima del costo por unidad CON IVA: sin esto la
    // línea no se agrega y la bebida seguiría sin precio de venta en el
    // catálogo.
    if (itemTipo === "producto") {
      if (itemPrecioVenta <= 0) {
        toast.error("El precio de venta del producto debe ser mayor que cero.");
        return;
      }
      if (itemPrecioVenta <= costoRef) {
        toast.error("El precio de venta debe ser mayor que el costo por unidad con IVA.");
        return;
      }
    }
    if (
      items.some(
        (item) =>
          (item.tipoItem ?? "insumo") === itemTipo &&
          item.nombre.toLowerCase() === itemNombre.trim().toLowerCase()
      )
    ) {
      toast.error("Este ítem ya fue agregado a la factura.");
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        rowId: `fact-${Date.now()}`,
        idInsumo: itemId || `INS-FAC-${Date.now()}`,
        nombre: itemNombre.trim(),
        // P11: unidad del insumo/producto seleccionado, o "und".
        unidad: unidadElegida(),
        cantidad: itemCantidad,
        costoUnitario: itemPrecio,
        precioUnitario: itemPrecio,
        iva: itemIva,
        // P14: se guarda el tipo para poder mostrarlo en el detalle.
        tipoItem: itemTipo,
        // Precio de venta al público, sólo para líneas de producto (ya
        // validado arriba: siempre > 0 y > costo por unidad con IVA). El
        // empaque (paca/caja) sólo lo guardan las líneas de producto con
        // presentación; unidad suelta ⇒ sin el dato (se lee como 1).
        ...(itemTipo === "producto"
          ? {
              precioVenta: itemPrecioVenta,
              ...(itemEmpaque && itemEmpaque > 1
                ? { unidadesPorEmpaque: itemEmpaque }
                : {}),
            }
          : {}),
      },
    ]);

    limpiarFilaInsumo();
  };

  /** Deja la fila "Agregar insumo" lista para el siguiente insumo: campos en
   *  cero y foco de vuelta en el buscador de Nombre.
   *  P11 + ajuste: la Medida vuelve a "und" para insumos y queda VACÍA para
   *  productos (la define el catálogo al elegir uno: "Paca x12"); el
   *  empaque se limpia siempre. El TIPO se conserva para poder agregar
   *  varios productos seguidos sin volver a elegirlo, salvo que el que
   *  llama pase el tipo nuevo (cambio de Insumo/Producto: se le pasa
   *  EXPLÍCITO porque por closure llegaría el valor viejo del estado). */
  const limpiarFilaInsumo = (tipo: TipoItem = itemTipo) => {
    setItemNombre("");
    setItemCantidad(1);
    setItemUnidad(tipo === "producto" ? "" : "und");
    setItemEmpaque(undefined);
    setItemPrecio(0);
    setItemIva(0);
    setItemId("");
    setItemPrecioVenta(0);
    setItemSugAbierto(false);
    setEditando(null);
    nombreRef.current?.focus();
  };

  /** Lápiz de la tabla (punto B3): abre la edición EN LÍNEA en la fila; el
   *  formulario de la izquierda se deja limpio para seguir agregando ítems.
   *  P14: también el tipo, para que el buscador siga mirando el catálogo
   *  correcto mientras se edita (y la Medida se limpia según ESE tipo). */
  const editarItem = (row: ItemFactura) => {
    limpiarFilaInsumo(row.tipoItem ?? "insumo");
    setItemTipo(row.tipoItem ?? "insumo");
    setEditando(row.rowId);
  };

  const eliminarItem = (rowId: string) => {
    // Si se borra la fila que estaba en edición, el borrador se cierra con ella.
    if (editando === rowId) setEditando(null);
    setItems((prev) => prev.filter((item) => item.rowId !== rowId));
  };

  const actualizarItem = (
    rowId: string,
    patch: Partial<ItemFactura>
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              ...patch,
              // `costoUnitario` es el precio que consumen el listado, el PDF y
              // la persistencia de la compra: si cambia el monto unitario hay
              // que moverlo también o los totales quedan con el precio viejo.
              costoUnitario: patch.precioUnitario ?? item.costoUnitario,
            }
          : item
      )
    );
  };

  const guardar = () => {
    setIntentoGuardar(true);

    if (!numeroFactura.trim()) {
      toast.error("Ingresa el número de factura.");
      return;
    }
    if (facturaDuplicada) {
      toast.error("Ya existe una compra con este número de factura");
      return;
    }
    if (!fechaFactura) {
      toast.error("Selecciona la fecha de la factura.");
      return;
    }
    // El proveedor es opcional: si se escribió, se usa; si no, queda vacío.
    if (items.length === 0) {
      toast.error("Agrega al menos un ítem a la factura.");
      return;
    }
    if (total <= 0) {
      toast.error("El total recibido debe ser mayor que cero.");
      return;
    }
    if (faltaIva) {
      // Con el formulario completo pero sin elegir los precios el botón está
      // habilitado: aquí se avisa en rojo bajo las tarjetas y no se guarda.
      setIvaIntentado(true);
      toast.error(MSJ_IVA_FALTA);
      return;
    }
    // Punto B2 + punto 3 + ajuste: backstop de precios de venta. Ninguna
    // línea de producto se guarda sin precio de venta válido (> 0 y > costo
    // POR UNIDAD con IVA), aunque haya llegado de una compra vieja o de una
    // Orden de Compra.
    const lineaPrecioMala = items.find((i) => {
      if ((i.tipoItem ?? "insumo") !== "producto") return false;
      const pv = i.precioVenta ?? 0;
      return pv <= 0 || pv <= costoConIvaDeLinea(i);
    });
    if (lineaPrecioMala) {
      toast.error(
        (lineaPrecioMala.precioVenta ?? 0) <= 0
          ? `«${lineaPrecioMala.nombre}»: falta el precio de venta del producto.`
          : `«${lineaPrecioMala.nombre}»: el precio de venta debe ser mayor que el costo por unidad con IVA.`
      );
      return;
    }

    setShowGuardarConf(true);
  };

  const confirmarGuardar = async () => {
    if (guardandoCompra) return;
    setGuardandoCompra(true);
    try {
      await onGuardar({
      proveedor: provQuery.trim(),
      proveedorId: provId,
      numeroFactura: numeroFactura.trim(),
      fechaFactura,
      valorTotal: total,
      // Punto 4: la compra se guarda siempre con estado "Recibido".
      estado: "Recibido",
      // Punto 1: cada línea guarda sus valores de IVA; los totales de la
      // factura se guardan aparte (y el backend los recalcula).
      items: items.map((item, i) => ({
        ...item,
        baseSinIva: lineasIva[i].baseSinIva,
        montoIva: lineasIva[i].montoIva,
      })),
      ivaIncluido: ivaIncluido ?? true,
      subtotalSinIva,
      totalIva,
      totalPagado,
      });
      setShowGuardarConf(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la compra.");
    } finally {
      setGuardandoCompra(false);
    }
  };

  /** Subtítulo de la cabecera (solo cuando aporta algo). */
  const subtitulo = isView
    ? compra
      ? `Compra ${compra.id}`
      : ""
    : isPage
      ? "Registra una factura de proveedor"
      : "";

  return (
    <>
      <div
        className={
          isPage
            ? "w-full px-4 sm:px-6 py-4 h-full flex flex-col overflow-hidden"
            : "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-hidden"
        }
      >
        <div
          className={
            isPage
              ? "w-full h-full flex flex-col"
              : "h-full flex items-center justify-center p-4"
          }
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`flex flex-col w-full ${isPage ? "max-w-[1200px]" : FORM_MAXW}${
              isPage
                ? " h-full"
                : " max-h-[calc(100dvh-2rem)] bg-card rounded-2xl shadow-2xl border border-border my-4"
            }`}
          >
            {/* Cabecera: ← + título + subtítulo en pantalla completa; X en el
                modal. Volver pide confirmación si hay datos escritos. */}
            <div className={`flex items-center justify-between gap-3 px-5 ${isPage ? "py-1.5" : "py-4"} border-b border-border shrink-0`}>
              <div className="flex items-center gap-3 min-w-0">
                {isPage && (
                  <button
                    onClick={salir}
                    title="Volver"
                    className="shrink-0 p-2 -ml-1 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="min-w-0">
                  <h3
                    className={`${isPage ? "text-lg" : "text-base"} font-bold text-foreground`}
                    style={{ fontFamily: SERIF }}
                  >
                    {isView ? "Detalle de Compra" : "Nueva Compra"}
                  </h3>
                  {subtitulo && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitulo}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isView && compra && <EstadoBadge e={compra.estado} />}
                {!isPage && (
                  <button
                    onClick={salir}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div
              className={
                isPage
                  ? "flex-1 min-h-0 px-5 py-3 flex flex-col lg:flex-row overflow-y-auto overflow-x-clip"
                  : "flex-1 min-h-0 px-5 py-5 flex flex-col gap-5 overflow-y-auto"
              }
            >
              {/* Columna IZQUIERDA — formulario (50 %). En el modal es solo un
                  grupo vertical: mantiene el mismo flujo de antes. Punto 2.8a:
                  en página NO scrollea por dentro cuando el formulario entero
                  cabe (así no queda un hueco muerto); si algo no cabe — móvil,
                  donde la columna apila y se suma la tabla — el
                  `overflow-y-auto` del contenedor deja alcanzables "Agregar" y
                  el pie Cancelar/Guardar. */}
               <div
                className={
                  isPage
                    ? "w-full lg:w-[50%] shrink-0 lg:pr-6 min-h-0 flex flex-col gap-6 lg:h-full"
                    : "flex flex-col gap-5"
                }
              >
              {/* Banners de estado */}
              {isView && compra?.estado === "Anulado" && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                  <Ban className="w-4 h-4 shrink-0" />
                  Esta compra ha sido anulada.
                </div>
              )}

              {/* Sección 1 — "Datos de la factura" (el título solo existe en
                  pantalla completa; en el modal el `<section>` solo agrupa
                  para mantener el mismo espaciado de antes). */}
              <section
                className={`flex flex-col ${isPage ? "gap-2 shrink-0" : "gap-5"}`}
              >
                {isPage && <p className={seccionCls}>Datos de la factura</p>}

                {/* Detalle (vista): 3 columnas. Creación en pantalla completa:
                    Fila 1: Número de factura * | Proveedor (opcional)
                    Fila 2: Fecha de factura * | Estado (badge Recibido)
                    En el modal se conserva la rejilla original. */}
                <div
                  className={`grid gap-4 shrink-0 ${
                    isView
                      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                      : isPage
                        ? "grid-cols-1 sm:grid-cols-2"
                        : "grid-cols-1 md:grid-cols-3"
                  }`}
                >
                  <div className="relative">
                    <label className={labelCls}>
                      Número de factura {!isView && <span className="text-red-500">*</span>}
                    </label>
                    {isView ? (
                      <p className="text-sm font-semibold text-foreground py-2">{numeroFactura || "—"}</p>
                    ) : (
                      <input
                        value={numeroFactura}
                        onChange={(e) => setNumeroFactura(e.target.value)}
                        onBlur={() => { marcarTocado("numeroFactura"); setFacturaTocada(true); }}
                        placeholder="Ej: FAC-2026-0001"
                        className={campoCls(
                          (tocado.numeroFactura || facturaTocada || intentoGuardar) ? errorNumeroFactura : undefined
                        )}
                        aria-invalid={!!((tocado.numeroFactura || facturaTocada || intentoGuardar) && errorNumeroFactura)}
                        autoFocus
                      />
                    )}
                    {!isView && (tocado.numeroFactura || facturaTocada || intentoGuardar) && errorNumeroFactura && (
                      <p className={isPage ? "absolute left-0 top-full text-xs text-red-500" : "text-xs text-red-500 mt-1 ml-0.5"}>{errorNumeroFactura}</p>
                    )}
                  </div>

                  <div className="relative">
                    <label className={labelCls}>
                      Proveedor <span className="text-muted-foreground/70 font-normal">(opcional)</span>
                    </label>
                    {isView ? (
                      <p className="text-sm font-semibold text-foreground py-2">{provQuery || "—"}</p>
                    ) : (
                      <div className="relative" ref={provRef}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input
                          value={provQuery}
                          onChange={(e) => {
                            setProvQuery(e.target.value);
                            setProvSugAbierto(true);
                          }}
                          onFocus={() => setProvSugAbierto(true)}
                          placeholder="Buscar por nombre, NIT, asesor o email..."
                          className={`${isPage ? iPaginaCls : iCls} pl-10`}
                        />
                        {/* Punto 6: el desplegable va por encima de todo el formulario. */}
                        {provSugAbierto && (
                          <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                            {/* Opción "+ Crear proveedor" PRIMERA */}
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setProvSugAbierto(false);
                                setMostrarNuevoProveedor(true);
                              }}
                              className="w-full text-left px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary/10 cursor-pointer inline-flex items-center gap-2 border-b border-border"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Crear proveedor {provQuery.trim() && `“${provQuery.trim()}”`}
                            </button>
                            <hr className="my-0.5 border-border" />
                            {/* Resultados - máximo 3 */}
                            {provSugs.slice(0, 3).map((p) => (
                              <button
                                key={p.nit}
                                type="button"
                                onMouseDown={() => seleccionarProveedor(p)}
                                className="w-full text-left px-3 py-2.5 text-xs hover:bg-muted cursor-pointer border-b border-border last:border-0"
                              >
                                <p className="font-semibold text-foreground">{p.nombre}</p>
                                <p className="text-muted-foreground">
                                  NIT {p.nit}
                                  {p.asesorComercial && <> · Asesor: {p.asesorComercial}</>}
                                </p>
                              </button>
                            ))}
                            {provSugs.length === 0 && (
                              <div className="px-3 py-2.5 text-xs text-muted-foreground text-center border-b border-border">
                                Sin resultados
                              </div>
                            )}
                            {provSugs.length > 3 && (
                              <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                                +{provSugs.length - 3} más...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                      {!isView && isPage && (
                    <>
                      <div className="relative">
                        <label className={labelCls}>
                          Fecha de factura <span className="text-red-500">*</span>
                        </label>
                        <CalendarDropdown
                          value={fechaFactura}
                          onChange={(v) => setFechaFactura(v)}
                          max={today}
                          error={!!((tocado.fechaFactura || intentoGuardar) && errorFechaFactura)}
                          onBlur={() => marcarTocado("fechaFactura")}
                        />
                        {(tocado.fechaFactura || intentoGuardar) && errorFechaFactura && (
                          <p className="absolute left-0 top-full text-xs text-red-500">{errorFechaFactura}</p>
                        )}
                      </div>

                      <div className="relative">
                        <label className={labelCls}>Estado</label>
                        {/* Badge "Recibido" alineado a la izquierda, centrado verticalmente a la altura del input */}
                        <div className="h-10 flex items-center">
                          <EstadoBadge e="Recibido" />
                        </div>
                      </div>
                    </>
                  )}

                      {!isView && !isPage && (
                    <>
                      <div className={campoCortoCls}>
                        <label className={labelCls}>
                          Fecha de factura <span className="text-red-500">*</span>
                        </label>
                        <CalendarDropdown
                          value={fechaFactura}
                          onChange={(v) => setFechaFactura(v)}
                          max={today}
                          error={!!((tocado.fechaFactura || intentoGuardar) && errorFechaFactura)}
                          onBlur={() => marcarTocado("fechaFactura")}
                        />
                        {(tocado.fechaFactura || intentoGuardar) && errorFechaFactura && (
                          <p className="text-xs text-red-500 mt-1 ml-0.5">{errorFechaFactura}</p>
                        )}
                      </div>

                      <div className={campoCortoCls}>
                        <label className={labelCls}>Estado</label>
                        <div className="py-2">
                          <EstadoBadge e="Recibido" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* IVA de la factura — solo el modal conserva el control
                      segmentado original. Reglas compartidas: al crear NINGUNA
                      opción viene seleccionada, y con insumos en la tabla la
                      opción no elegida queda bloqueada. */}
                  {!isView && !isPage && (
                    <div className="md:col-span-2">
                      <label className={labelCls}>
                        ¿Los montos de la factura incluyen IVA?
                      </label>

                      <div className="inline-flex gap-1 p-1 bg-muted border border-border rounded-xl">
                        {([true, false] as const).map((opcion) => {
                          const elegida = ivaIncluido === opcion;
                          const bloqueada = ivaBloqueada(opcion);

                          return (
                            <span
                              key={String(opcion)}
                              className={`inline-flex ${bloqueada ? "cursor-not-allowed" : ""}`}
                              title={bloqueada ? MSJ_IVA_BLOQUEADO : undefined}
                            >
                              <button
                                type="button"
                                onClick={() => setIvaIncluido(opcion)}
                                aria-pressed={elegida}
                                disabled={bloqueada}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                  elegida
                                    ? "bg-primary text-white shadow-sm"
                                    : bloqueada
                                      ? "bg-background text-muted-foreground/50 cursor-not-allowed pointer-events-none"
                                      : "text-muted-foreground hover:bg-background cursor-pointer"
                                }`}
                              >
                                {opcion ? "Sí, IVA incluido" : "No, sin IVA"}
                              </button>
                            </span>
                          );
                        })}
                      </div>

                      {ivaIncluido === null && intentoGuardar ? (
                        <p className="text-xs text-red-500 mt-1">Selecciona si los montos de la factura incluyen IVA</p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          {ivaIncluido === null
                            ? "Indica cómo vienen los montos en la factura"
                            : ivaIncluido
                              ? "El monto unitario de cada línea ya trae el IVA adentro."
                              : "El monto unitario de cada línea es base y el IVA se suma aparte."}
                        </p>
                      )}
                    </div>
                  )}
                </div>

              {/* Selector de precios (pantalla completa): dos tarjetas tipo
                  radio, en la MISMA fila. NINGUNA viene elegida al abrir; con
                  al menos un insumo la no elegida queda bloqueada y su tooltip
                  explica cómo desbloquearla. El error en ROJO solo aparece
                  cuando el usuario intenta agregar o guardar. */}
              {!isView && isPage && (
                <div className="shrink-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[13px] leading-tight font-medium text-foreground/70">
                      ¿Cómo vienen los precios en la factura?{" "}
                      <span className="text-red-500">*</span>
                    </span>
                    {/* Ayuda: el tooltip entra por tokens, así que se lee bien
                        en modo claro y en modo oscuro. */}
                    <span className="group relative inline-flex">
                      <HelpCircle
                        aria-hidden
                        className="w-4 h-4 text-muted-foreground cursor-help"
                      />
                      <span className="sr-only">Ayuda sobre los precios de la factura</span>
                      <span className="pointer-events-none absolute left-0 max-sm:left-auto max-sm:right-0 top-full mt-2 z-50 w-[280px] max-sm:w-[calc(100vw-4rem)] rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-3 text-xs leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity">
                        {MSJ_IVA_AYUDA}
                      </span>
                    </span>
                  </div>

                  <div
                    role="radiogroup"
                    aria-label="Cómo vienen los precios en la factura"
                    className="flex gap-2"
                  >
                    {OPCIONES_IVA.map(({ valor, titulo, tag, desc }) => {
                      const elegida = ivaIncluido === valor;
                      const bloqueada = ivaBloqueada(valor);

                      return (
                        <button
                          key={String(valor)}
                          type="button"
                          role="radio"
                          aria-checked={elegida}
                          disabled={bloqueada}
                          title={bloqueada ? MSJ_IVA_BLOQUEADO : undefined}
                          onClick={() => {
                            if (bloqueada) return;
                            setIvaIncluido(valor);
                            setIvaIntentado(false);
                          }}
                          className={`flex-1 flex items-start gap-2 px-2 py-2 rounded-xl border text-left transition-colors ${
                            elegida
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background"
                          } ${
                            bloqueada
                              ? "opacity-60 cursor-not-allowed"
                              : "cursor-pointer hover:border-primary/40"
                          }`}
                        >
                          <span
                            className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                              elegida ? "border-primary" : "border-muted-foreground/40"
                            }`}
                          >
                            {elegida && <span className="w-2 h-2 rounded-full bg-primary" />}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="text-[12px] font-semibold text-foreground">
                                {titulo}
                              </span>
                              {tag && (
                                <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                  {tag}
                                </span>
                              )}
                            </span>
                            <span className="block text-[11px] leading-snug text-muted-foreground mt-0.5">
                              {desc}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {ivaIncluido === null && (ivaIntentado || intentoGuardar) && (
                    <p className="text-xs text-red-500 mt-1.5">{MSJ_IVA_FALTA}</p>
                  )}
                </div>
              )}
              </section>

              {/* Sección 2 — "Agregar ítem": fila con buscador, stepper y
                  botón en una sola línea. En pantalla completa es el ÚLTIMO
                  bloque de la columna izquierda (la tabla vive en la derecha). */}
              {!isView && (
                <section className={`flex flex-col ${isPage ? "gap-3 shrink-0" : "gap-5"}`}>
                  {/* Punto 2.6: en página el "Tipo" sube a la fila de
                      título (a la derecha) en vez de ocupar el hueco de Medida;
                      el formulario ya no lo recibe (`campoExtra` solo en el
                      modal, donde el título sigue dentro de la card). */}
                  {isPage ? (
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className={seccionCls}>Agregar ítem</p>
                      <div className="flex items-center gap-2">
                        <label className="block text-[11px] font-semibold text-muted-foreground">
                          Tipo
                        </label>
                        <SegmentadoButtons
                          valor={itemTipo}
                          onChange={(valor) => {
                            const nuevo = valor as TipoItem;
                            if (nuevo === itemTipo) return;
                            setItemTipo(nuevo);
                            // Al cambiar de catálogo el ítem cargado ya no
                            // sirve: se limpia la fila (la Medida según el
                            // tipo NUEVO) y el buscador empieza a mirar la
                            // otra lista.
                            limpiarFilaInsumo(nuevo);
                          }}
                          disabled={ivaIncluido === null}
                          opciones={[
                            { valor: "insumo", etiqueta: "Insumo" },
                            { valor: "producto", etiqueta: "Producto" },
                          ]}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className={seccionCls}>Agregar ítem</p>
                  )}
                  <CompactInsumoForm
                    containerRef={itemRef}
                    titulo={isPage ? "" : "Agregar ítem"}
                    nombre={itemNombre}
                    onNombreChange={(value) => {
                      setItemNombre(value);
                      setItemId("");
                      // Escribir a mano suelta la presentación elegida: la
                      // Medida queda vacía (producto) o "und" (insumo) y el
                      // empaque de la paca/caja se limpia.
                      setItemUnidad(itemTipo === "producto" ? "" : "und");
                      setItemEmpaque(undefined);
                      setItemSugAbierto(true);
                    }}
                    onNombreFocus={() => setItemSugAbierto(true)}
                    cantidad={itemCantidad}
                    onCantidadChange={setItemCantidad}
                    unidad={itemUnidad}
                    onUnidadChange={setItemUnidad}
                    disabled={ivaIncluido === null}
                    precio={itemPrecio}
                    onPrecioChange={onMontoChange}
                    iva={itemIva}
                    onIvaChange={onIvaChange}
                    // Punto 3: costo de referencia CON IVA que se muestra
                    // debajo del monto y contra el que se valida el precio
                    // de venta.
                    costoConIva={costoRef}
                    // Precio de venta al público: sólo para líneas de producto.
                    mostrarPrecioVenta={itemTipo === "producto"}
                    precioVenta={itemPrecioVenta}
                    onPrecioVentaChange={onPrecioVentaChange}
                    errorPrecioVenta={errorPrecioVenta}
                    onAgregar={agregarItem}
                    suggestions={itemSugs}
                    showSuggestions={itemSugAbierto}
                    onSelectSuggestion={(suggestion) => {
                      if (itemTipo === "producto") {
                        const p = (productos ?? []).find((x) => x.id === suggestion.id);
                        // Guarda por si el catálogo cambió mientras estaba
                        // abierto el desplegable.
                        if (p) seleccionarProducto(p);
                        return;
                      }
                      seleccionarInsumo(suggestion as Insumo);
                    }}
                    onCrearInsumo={() => {
                      // Al abrir el modal se cierra el desplegable de
                      // sugerencias: si queda abierto quedaría por encima del
                      // formulario de "Nuevo Insumo" e interceptaría los clics.
                      setItemSugAbierto(false);
                      setShowNuevoInsumo(true);
                    }}
                    // Bloque 2: el atajo "+ Crear producto" del desplegable
                    // (al final y sólo sin coincidencias) abre el modal.
                    onCrearProducto={() => {
                      setItemSugAbierto(false);
                      setShowNuevoProducto(true);
                    }}
                    compacto={isPage}
                    // Punto B3: el formulario SIEMPRE es "Agregar"; la edición
                    // de una fila existente ocurre en línea, en la tabla.
                    buttonLabel="Agregar"
                    variante="compacta"
                    // P11 + punto 2.6 + ajuste: en el modal la Medida sigue
                    // oculta para INSUMOS (la unidad la define el insumo);
                    // para PRODUCTOS se muestra siempre como texto de solo
                    // lectura con la presentación de compra ("Paca x12"). En
                    // página es solo lectura para los dos tipos, igual que en
                    // Orden de Compra, para no tener dos controles de medida.
                    ocultarMedida={!isPage && itemTipo !== "producto"}
                    medidaSoloLectura={isPage || itemTipo === "producto"}
                    // P14: el atajo "+ Crear insumo" sólo aplica a insumos.
                    ocultarCrearInsumo={itemTipo === "producto"}
                    // Bloque 2: el atajo "+ Crear producto" sólo aplica a
                    // productos (el insumo se crea con "+ Crear insumo").
                    ocultarCrearProducto={itemTipo !== "producto"}
                    placeholder={
                      itemTipo === "producto" ? "Buscar producto..." : "Buscar insumo..."
                    }
                    // Punto 2.6: el selector de tipo vive en el hueco de
                    // Medida SOLO en el modal; en página ya subió a la fila de
                    // título de arriba, así que no se pasa `campoExtra`.
                    campoExtra={
                      isPage ? undefined : (
                      <div className="min-w-[118px]">
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                          Tipo
                        </label>
                        <SegmentadoButtons
                          valor={itemTipo}
                          onChange={(valor) => {
                            const nuevo = valor as TipoItem;
                            if (nuevo === itemTipo) return;
                            setItemTipo(nuevo);
                            // Al cambiar de catálogo el ítem cargado ya no
                            // sirve: se limpia la fila (la Medida según el
                            // tipo NUEVO) y el buscador empieza a mirar la
                            // otra lista.
                            limpiarFilaInsumo(nuevo);
                          }}
                          disabled={ivaIncluido === null}
                          opciones={[
                            { valor: "insumo", etiqueta: "Insumo" },
                            { valor: "producto", etiqueta: "Producto" },
                          ]}
                        />
                      </div>
                      )
                    }
                  />
                  {/* Aviso de insumos/total: en pantalla completa va justo
                      debajo de la fila (solo empuja la tabla al aparecer); en
                      el modal, con el mismo margen de 20px de antes. */}
                  {(errorItems || errorTotal) && (algunoTocado || intentoGuardar) && (
                    <p className={`text-xs text-red-500 ${isPage ? "mt-1 ml-0.5" : "mt-5 ml-0.5"}`}>
                      {errorItems ?? errorTotal}
                    </p>
                  )}
                </section>
              )}
              </div>

              {/* Columna DERECHA (50 %) — insumos agregados, totales y
                  botones. Separada de la izquierda por una línea vertical. */}
              <div
                className={
                  isPage
                    ? "w-full lg:w-[50%] min-w-0 min-h-0 flex flex-col gap-3 lg:border-l lg:border-border lg:pl-6 lg:h-full"
                    : "flex flex-col gap-5"
                }
              >
                {/* Cabecera de la tabla: contador y, debajo, un recordatorio
                    de la opción de precios elegida. */}
                {isPage && !isView && (
                  <div className="shrink-0">
                    <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-border">
                      <p className="text-[11px] leading-none font-bold uppercase tracking-widest text-muted-foreground">
                        Ítems de la factura
                      </p>
                      {/* P14: el contador desglosa por tipo para que se vea
                          de insumos y de cuántos productos se trata. */}
                      <span className="text-xs font-medium text-muted-foreground">
                        {items.length} {items.length === 1 ? "ítem" : "ítems"}
                        {nProductos > 0 &&
                          ` · ${nInsumos} ${nInsumos === 1 ? "insumo" : "insumos"} · ${nProductos} ${
                            nProductos === 1 ? "producto" : "productos"
                          }`}
                      </span>
                    </div>
                    {ivaIncluido !== null && (
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {ivaIncluido ? "Precios con IVA incluido" : "Precios sin IVA"}
                      </p>
                    )}
                  </div>
                )}
                {/* Compras aún no está conectada a la API: el stock de
                    insumos se suma solo en local. */}
                {!isView && nInsumos > 0 && (
                  <p className="shrink-0 text-[11px] text-muted-foreground">
                    El stock de insumos se guardará en la base cuando se conecte Compras
                  </p>
                )}

              {isView ? (
                <div className="flex flex-col gap-4">
                  {/* Punto 1: el detalle indica si los montos guardados traen
                      IVA incluido o no. */}
                  <div className="shrink-0">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-muted border border-border text-muted-foreground">
                      {ivaIncluido ? "Montos con IVA incluido" : "Montos sin IVA"}
                    </span>
                  </div>
                  {orden ? (
                    <>
                      <InsumosSolicitadosTable
                        items={solicitados}
                        showActions={false}
                        titulo="Insumos solicitados"
                        subtotalLabel="Subtotal solicitados"
                        mostrarIva
                        mostrarTotal={false}
                        modoIva
                        ivaIncluido={ivaIncluido ?? true}
                        className={isPage ? "flex-1 min-h-0" : ""}
                      />
                      {noSolicitados.length > 0 && (
                        <InsumosSolicitadosTable
                          items={noSolicitados}
                          showActions={false}
                          tono="amber"
                          titulo="Insumos no solicitados"
                          subtotalLabel="Subtotal no solicitados"
                          mostrarIva
                          mostrarTotal={false}
                          modoIva
                          ivaIncluido={ivaIncluido ?? true}
                        />
                      )}
                    </>
                  ) : (
                    <InsumosSolicitadosTable
                      items={items}
                      showActions={false}
                      titulo="Insumos recibidos"
                      subtotalLabel="Subtotal"
                      mostrarIva
                      mostrarTotal={false}
                      modoIva
                      ivaIncluido={ivaIncluido ?? true}
                      className={isPage ? "flex-1 min-h-0" : ""}
                    />
                  )}

                  {/* Total pagado */}
                  <div className="flex justify-between items-center px-1 pt-1 border-t border-border shrink-0">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Total pagado
                    </span>
                    <span className="text-lg font-bold text-foreground">
                      {fmtCOP(totalPagado)}
                    </span>
                  </div>
                </div>
              ) : (
                // P14: tabla propia con la columna "Tipo": muestra insumos y
                // productos con cantidad, monto e IVA, y suma LOS DOS con la
                // misma fórmula (`calcularLineaIva`), así el total de la
                // factura nunca se queda corto.
                <TablaItemsFactura
                  items={items}
                  onEdit={editarItem}
                  onCommit={(rowId, patch) => {
                    actualizarItem(rowId, patch);
                    setEditando(null);
                  }}
                  onCancelarEdicion={() => setEditando(null)}
                  onRemove={eliminarItem}
                  modoIva
                  ivaIncluido={ivaIncluido ?? true}
                  enPagina={isPage}
                  rowEditando={editando}
                  className={isPage ? "flex-1 min-h-0 flex flex-col" : ""}
                />
              )}

                {/* Acciones: en pantalla completa van al final de ESTA columna
                    (siempre visibles); en el modal siguen en el pie general. */}
                {isPage && !isView && (
                  <div className="flex gap-3 shrink-0 mt-auto pt-2">
                    <button
                      onClick={salir}
                      className="flex-1 h-10 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={guardar}
                      disabled={!botonGuardarOk}
                      className="flex-1 h-10 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
                    >
                      <Check className="w-4 h-4" />
                      Guardar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer del modal — solo en creación; en detalle se cierra con
                la X del encabezado. */}
            {!isView && !isPage && (
              <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
                <button
                  onClick={salir}
                  className="flex-1 h-10 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={!botonGuardarOk}
                  className="flex-1 h-10 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
                >
                  <Check className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {mostrarNuevoProveedor && (
          <NuevoProveedorModal
            nombreInicial={provQuery.trim()}
            existentes={proveedores}
            onGuardar={crearProveedor}
            onClose={() => setMostrarNuevoProveedor(false)}
          />
        )}
      </AnimatePresence>

      {/* Punto 2: Modal de nuevo insumo */}
      <AnimatePresence>
        {showNuevoInsumo && (
          <NuevoInsumoModal
            nombreInicial={itemNombre}
            insumosExistentes={insumos}
            categoriasInsumo={categoriasInsumo}
            onGuardar={(ins) => {
              setItemNombre(ins.nombre);
              setItemUnidad(ins.unidadMedida);
              setItemPrecio(ins.precioUnitario);
              setItemId(ins.id);
              setShowNuevoInsumo(false);
              toast.success(`Insumo "${ins.nombre}" creado`);
            }}
            onClose={() => setShowNuevoInsumo(false)}
          />
        )}
      </AnimatePresence>

      {/* Bloque 2: Modal de nuevo producto ("+ Crear producto"). */}
      <AnimatePresence>
        {showNuevoProducto && (
          <CrearProductoModal
            nombreInicial={itemNombre.trim()}
            productos={productos ?? []}
            categorias={categorias ?? []}
            onGuardar={async (p) => {
              const creado = await onCrearProducto?.(p);
              if (!creado) throw new Error("No se pudo crear el producto en el servidor.");
              // Queda seleccionado en la fila para seguir con cantidad,
              // monto e IVA (mismo camino que elegirlo del desplegable).
              seleccionarProducto(creado);
              setShowNuevoProducto(false);
              toast.success(`Producto "${creado.nombre}" creado`);
              return creado;
            }}
            onClose={() => setShowNuevoProducto(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGuardarConf && (
          <ConfirmModal
            title="¿Está seguro de los cambios?"
            detail="Una vez guardado no se podrá modificar."
            confirmLabel="Confirmar"
            loading={guardandoCompra}
            icon={
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            }
            onConfirm={confirmarGuardar}
            onCancel={() => setShowGuardarConf(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── NUEVA COMPRA — PÁGINA INDEPENDIENTE ─────────────────────────────────────

interface NuevaCompraPageProps {
  gestiones: GestionCompra[];
  setGestiones: React.Dispatch<React.SetStateAction<GestionCompra[]>>;
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  insumos: Insumo[];
  /** P14: catálogo de productos para poder facturar productos en la compra. */
  productos?: Producto[];
  /** Bloque 2: categorías y alta de productos desde "+ Crear producto" (el
   *  callback viene de App y agrega al catálogo del panel). */
  categorias?: CategoriaProducto[];
  /** Bloque 2.2: categorías de insumos desde la API para el "+ Crear insumo". */
  categoriasInsumo?: CategoriaInsumo[];
  onCrearProducto?: (p: Producto) => Promise<Producto>;
  /** Control de inventario al guardar la compra. Opcionales: sin ellos la
   *  compra se guarda igual y simplemente no se suma el stock (ver
   *  `handleGuardar`). */
  setInsumos?: SetCatalogo<Insumo>;
  setProductos?: SetCatalogo<Producto>;
  onRecargarCatalogo?: () => Promise<void>;
  onBack: () => void;
}

export function NuevaCompraPage({
  gestiones,
  setGestiones,
  proveedores,
  setProveedores,
  insumos,
  productos,
  categorias,
  categoriasInsumo,
  onCrearProducto,
  setInsumos,
  setProductos,
  onRecargarCatalogo,
  onBack,
}: NuevaCompraPageProps) {
  const handleGuardar = async (data: NuevaCompraData) => {
    try {
      // 6.1: la compra directa la crea el backend, que además suma el stock de
      // insumos (convertidos a su unidad) y de productos (bebidas × empaque),
      // actualiza costos y deja la bebida sin precio en "Disponible". Sin
      // puentes temporales ni suma local de stock.
      const creada = await crearCompra({
        n_factura: data.numeroFactura,
        fecha: data.fechaFactura,
        id_proveedor: data.proveedorId ? Number(data.proveedorId) : null,
        iva_incluido: Boolean(data.ivaIncluido),
        items: data.items.filter((i) => i.idInsumo && i.cantidad > 0),
      });
      setGestiones((prev) => [creada, ...prev]);
      toast.success(`Compra ${creada.id} creada · Factura ${creada.numeroFactura}`);
      // El stock de insumos y productos cambió en la base.
      await onRecargarCatalogo?.();
      onBack();
    } catch (error) {
      toast.error(mensajeErrorCompras(error, "No se pudo crear la compra."));
    }
  };

  return (
    <CompraForm
      // Pantalla completa dentro del panel (no modal).
      fullPage
      proveedores={proveedores}
      setProveedores={setProveedores}
      insumos={insumos}
      productos={productos}
      // Bloque 2: "+ Crear producto" del desplegable de ítems.
      categorias={categorias}
      categoriasInsumo={categoriasInsumo}
      onCrearProducto={onCrearProducto}
      gestiones={gestiones}
      onClose={onBack}
      onGuardar={handleGuardar}
    />
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

interface Props {
  gestiones: GestionCompra[];
  setGestiones: React.Dispatch<React.SetStateAction<GestionCompra[]>>;
  ordenes: OrdenCompra[];
  setOrdenes: React.Dispatch<React.SetStateAction<OrdenCompra[]>>;
  insumos: Insumo[];
  /** Catálogo de productos: necesario para devolver el stock de las líneas
   *  marcadas como "producto" al anular una compra. */
  productos?: Producto[];
  /** Bloque 2: categorías y alta de productos (se pasan a CompraForm; el
   *  modal de detalle es de sólo lectura pero se mantienen iguales las
   *  dos pantallas que renderizan CompraForm). */
  categorias?: CategoriaProducto[];
  /** Bloque 2.2: categorías de insumos desde la API para el "+ Crear insumo". */
  categoriasInsumo?: CategoriaInsumo[];
  onCrearProducto?: (p: Producto) => Promise<Producto>;
  proveedores: ProveedorRef[];
  setProveedores: React.Dispatch<React.SetStateAction<ProveedorRef[]>>;
  /** Control de inventario al anular. Opcionales: sin ellos la anulación
   *  sólo cambia el estado y NO se revierte stock (no se rompe nada). */
  setInsumos?: SetCatalogo<Insumo>;
  setProductos?: SetCatalogo<Producto>;
  onRecargarCatalogo?: () => Promise<void>;
  onNuevaCompra: () => void;
  /** Carga de la lista desde la API y su error ("Reintentar"): nunca datos de
      ejemplo cuando falla. */
  cargando?: boolean;
  errorCarga?: string | null;
  onReintentar?: () => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExportExcel?: boolean;
}

export function GestionCompraScreen({
  gestiones, setGestiones, ordenes, setOrdenes, insumos, productos, proveedores, setProveedores,
  categorias, categoriasInsumo, onCrearProducto,
  setInsumos, setProductos,
  onRecargarCatalogo,
  onNuevaCompra,
  cargando = false,
  errorCarga,
  onReintentar,
  canCreate = true,
  canExportExcel = true,
}: Props) {
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [detail, setDetail]   = useState<GestionCompra | null>(null);
  const [estadoConfirm, setEstadoConfirm] = useState<{ id: string; from: EstadoGestion; next: EstadoGestion } | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");

  // Se declara antes del `useMemo` de abajo porque la fábrica lo invoca durante
  // el render; como `const`, usarla desde allí la lanzaba en TDZ
  // ("Cannot access 'getOrden' before initialization") al escribir en el buscador.
  const getOrden = (oid: string) => ordenes.find(o => o.id === oid);

  // Depuración (solo DEV): imprime el JSON que recibe el detalle de la compra
  // (lo mismo que "devolvería" el GET del detalle) al abrir el ojo.
  useEffect(() => {
    if (import.meta.env.DEV && detail) {
      // Debug logging removed
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);

  const filtered = useMemo(() =>
    gestiones.filter(g => {
      const q = search.toLowerCase();
      if (!q) return true;
      const proveedor = g.proveedor ?? getOrden(g.ordenId)?.proveedor ?? "";
      return proveedor.toLowerCase().includes(q)
        || g.numeroFactura.toLowerCase().includes(q)
        || g.estado.toLowerCase().includes(q);
    }),
    [gestiones, search, ordenes]);

  // Filas por página según el alto disponible (ResizeObserver): la tabla nunca
  // hace scroll vertical, se pagina. Con la tabla oculta (<768px) queda en 5.
  const PER_PAGE = 5;

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageActual = Math.min(Math.max(page, 1), Math.max(1, totalPages));
  const paged = filtered.slice((pageActual - 1) * PER_PAGE, pageActual * PER_PAGE);

  // Si al recalcular filas por página la página actual queda fuera de rango,
  // se salta a la última página válida.
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  /** Orden de compra relacionada con la compra del diálogo de confirmación. */
  const estadoOrdenConfirm = estadoConfirm
    ? gestiones.find((g) => g.id === estadoConfirm.id)?.ordenId ?? ""
    : "";

  /** Pide confirmación antes de aplicar el cambio de estado. */
  const pedirCambiarEstado = (id: string, next: EstadoGestion) => {
    const actual = gestiones.find((g) => g.id === id)?.estado;

    // "Anulado" es definitivo: no se puede volver a "Recibido".
    if (!actual || actual === next || actual === "Anulado") {
      setEstadoConfirm(null);
      return;
    }

    // Punto 6: el diálogo siempre arranca con el motivo vacío (si no, el botón
    // "Anular" se habilitaría con el motivo de una anulación anterior).
    setMotivoAnulacion("");
    setEstadoConfirm({ id, from: actual, next });
  };

  const handleCambiarEstado = async (id: string, next: EstadoGestion, motivo?: string) => {
    const compra = gestiones.find((g) => g.id === id);

    // ANULACIÓN (6.2): la hace el backend, que devuelve al inventario lo que
    // la compra sumó (insumos y productos). Un 409 ("ya se usaron/vendieron
    // unidades de «X»") muestra su mensaje y NO se anula nada.
    if (next === "Anulado") {
      try {
        const anulada = await anularCompraApi(id, (motivo ?? "").trim());
        setGestiones((prev) => prev.map((x) => (x.id === id ? anulada : x)));
        // El stock cambió en la base: se recargan insumos y productos.
        await onRecargarCatalogo?.();

        // El backend anula la Orden de Compra cuando ésta tenía una sola
        // compra asociada: aquí solo se refleja su estado (con recarga).
        const ordenId = compra?.ordenId ?? "";
        if (!ordenId) {
          toast.success(`Compra ${id} anulada`);
        } else {
          try {
            const orden = await obtenerOrdenCompra(ordenId);
            setOrdenes((prev) => prev.map((o) => (o.id === ordenId ? orden : o)));
            toast.success(
              orden.estado === "Anulado"
                ? `Compra ${id} y orden ${ordenId} anuladas`
                : `Compra ${id} anulada`,
            );
          } catch {
            // La compra ya quedó anulada: se informa solo eso.
            toast.success(`Compra ${id} anulada`);
          }
        }
      } catch (error) {
        toast.error(mensajeErrorCompras(error, "No se pudo anular la compra."));
      } finally {
        setEstadoConfirm(null);
        setMotivoAnulacion("");
      }
      return;
    }

    // Solo se actualiza el estado de la Compra puntual (por su ID).
    setGestiones((prev) => prev.map((x) => (x.id === id ? { ...x, estado: next } : x)));
    setEstadoConfirm(null);
    setMotivoAnulacion("");
    toast.success(`Estado cambiado a: ${next}`);
  };

  const handleDownload = async () => {
    // Preparar datos agrupados: cada compra con sus insumos debajo
    const comprasParaExcel: GestionCompraConInsumos[] = filtered.map(g => {
      const orden = getOrden(g.ordenId);
      // Buscar proveedor por ID primero (JOIN correcto), luego por nombre como fallback
      const prov = g.proveedorId
        ? proveedores.find(p => p.id === g.proveedorId)
        : proveedores.find(p => 
            p.nombre === (orden?.proveedor ?? g.proveedor) || 
            p.nombre.toLowerCase() === (orden?.proveedor ?? g.proveedor)?.toLowerCase() ||
            p.nombre.toLowerCase().includes((orden?.proveedor ?? g.proveedor)?.toLowerCase() || '') ||
            (orden?.proveedor ?? g.proveedor)?.toLowerCase().includes(p.nombre.toLowerCase() || '')
          );
      const idsOrden = new Set(orden?.items.map(i => i.idInsumo) ?? []);
      
      const items = (g.items ?? []).map(item => {
        const esSolicitado = idsOrden.has(item.idInsumo) || (item.esNoSolicitado === false && idsOrden.size === 0);
        let tipo: "Solicitado" | "No solicitado" | "—";
        if (orden && idsOrden.size > 0) {
          tipo = esSolicitado ? "Solicitado" : "No solicitado";
        } else {
          tipo = "—";
        }
        return {
          nombre: item.nombre,
          tipo,
          cantidad: item.cantidad,
          unidad: item.unidad,
          costoUnitario: item.costoUnitario,
          iva: item.iva ?? 0,
        };
      });

      return {
        id: g.id,
        numeroFactura: g.numeroFactura || "—",
        proveedor: prov?.nombre ?? orden?.proveedor ?? g.proveedor ?? "—",
        nit: prov?.nit ?? "",
        fechaFactura: g.fechaFactura,
        estado: g.estado,
        subtotalSinIva: g.subtotalSinIva ?? 0,
        totalIva: g.totalIva ?? 0,
        totalPagado: g.totalPagado ?? g.valorTotal,
        motivoAnulacion: g.motivoAnulacion,
        items,
      };
    });

    await exportarGestionComprasConInsumosExcel({
      compras: comprasParaExcel,
      nombreArchivo: "gestion-de-compras",
    });
    toast.success("Excel descargado");
  };

  return (
    <div className="px-4 md:px-6 pt-5 pb-4 h-full min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
            Gestión de Compras
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Registro de facturas vinculadas a órdenes completadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExportExcel && <BotonDescargarExcel onClick={handleDownload} />}
          {canCreate && (
            <button
              onClick={onNuevaCompra}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Crear Compra
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
        <SearchInput
          value={search}
          onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Buscar por ID, OC o N° Factura..."
          wrapperClassName="w-full max-w-sm shrink-0"
        />
      </div>

      {/* Carga desde la API y su error con "Reintentar": nunca datos de
          ejemplo cuando falla. */}
      {cargando ? (
        <div className="bg-card border border-border rounded-2xl px-4 py-14 text-center text-muted-foreground shrink-0">
          Cargando compras…
        </div>
      ) : errorCarga ? (
        <div className="bg-card border border-border rounded-2xl px-4 py-14 text-center text-muted-foreground shrink-0">
          <p className="font-semibold text-foreground">{errorCarga}</p>
          {onReintentar && (
            <button
              type="button"
              onClick={onReintentar}
              className="mt-3 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer"
            >
              Reintentar
            </button>
          )}
        </div>
      ) : (
      <div className="flex flex-col bg-card border border-border rounded-2xl overflow-hidden shrink-0">
        <div className="overflow-x-auto">
          {/* Escritorio/tablet (>=768px): tabla. La columna Fecha sólo existe
              desde 1440px; por debajo va bajo el N° de Factura. */}
          <table className="hidden md:table w-full table-fixed md:min-w-[720px]">
            <thead className="bg-muted text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap sticky top-0 left-0 z-30 bg-muted w-[17%] min-[1440px]:w-[13%]">N° Factura</th>
                <th className="hidden min-[1440px]:table-cell px-4 py-3 text-left font-semibold whitespace-nowrap sticky top-0 z-20 bg-muted w-[10%]">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap sticky top-0 z-20 bg-muted w-[30%] min-[1440px]:w-[28%]">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap sticky top-0 z-20 bg-muted w-[18%] min-[1440px]:w-[15%]">Total</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap sticky top-0 z-20 bg-muted w-[20%] min-[1440px]:w-[19%]">Estado</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap sticky top-0 right-0 z-30 bg-muted w-[15%] min-[1440px]:w-[15%]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-14 text-center text-muted-foreground">
                      <p className="text-4xl mb-3">📦</p>
                      <p className="font-medium">No hay gestiones de compra aún</p>
                      <p className="text-xs mt-1">
                        Se crean al recibir una Orden de Compra o manualmente con «+ Crear Compra»
                      </p>
                    </td>
                  </tr>
                )
                : paged.map(g => {
                  const orden = getOrden(g.ordenId);

                  // Buscar proveedor por ID primero (JOIN correcto), luego por nombre como fallback
                  const prov = g.proveedorId
                    ? proveedores.find(p => p.id === g.proveedorId)
                    : proveedores.find(p =>
                        p.nombre === (g.proveedor || orden?.proveedor) ||
                        p.nombre.toLowerCase() === (g.proveedor || orden?.proveedor)?.toLowerCase() ||
                        p.nombre.toLowerCase().includes((g.proveedor || orden?.proveedor)?.toLowerCase() || '') ||
                        (g.proveedor || orden?.proveedor)?.toLowerCase().includes(p.nombre.toLowerCase() || '')
                      );
                  const nit = prov?.nit ?? "";
                  const nombreMostrar = prov?.nombre || g.proveedor || orden?.proveedor || "—";
                  return (
                    <tr key={g.id} className="group hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 text-xs sticky left-0 z-10 bg-card group-hover:bg-muted/20">
                        {g.numeroFactura
                          ? <span className="font-mono font-semibold text-foreground">{g.numeroFactura}</span>
                          : <span className="text-muted-foreground">—</span>}
                        {/* Sólo hasta 1439px: la fecha va bajo el N° de factura */}
                        <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-nowrap min-[1440px]:hidden">
                          {g.fechaFactura || "—"}
                        </p>
                      </td>
                      <td className="hidden min-[1440px]:table-cell px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {g.fechaFactura || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-sm overflow-hidden">
                        <p className="text-sm text-foreground break-words" title={nombreMostrar}>{nombreMostrar}</p>
                        {nit && <p className="text-[11px] text-muted-foreground font-mono truncate" title={`NIT ${nit}`}>NIT {nit}</p>}
                      </td>
                      <td className="px-3 py-3.5 text-sm font-semibold text-foreground whitespace-nowrap">
                        {g.valorTotal > 0
                          ? fmtCOP(g.valorTotal)
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3.5 overflow-hidden">
                        <EstadoSelect
                          value={g.estado}
                          onChange={(nuevoEstado) => {
                            if (nuevoEstado === g.estado) return;
                            pedirCambiarEstado(g.id, nuevoEstado);
                          }}
                          options={[
                            { value: "Recibido" as EstadoGestion, label: "Recibido", color: ESTADO_CONFIG.Recibido },
                            { value: "Anulado" as EstadoGestion, label: "Anulado", color: ESTADO_CONFIG.Anulado },
                          ]}
                          disabled={g.estado === "Anulado"}
                        />
                      </td>
                      <td className="px-4 py-3.5 sticky right-0 z-10 bg-card group-hover:bg-muted/20">
                        <button
                          onClick={() => setDetail(g)}
                          title="Ver detalle"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {/* Celular (<768px): cada compra como tarjeta. */}
          <div className="md:hidden divide-y divide-border">
            {paged.length === 0
              ? (
                <div className="px-4 py-12 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">📦</p>
                  <p className="font-medium">No hay gestiones de compra aún</p>
                  <p className="text-xs mt-1">
                    Se crean al recibir una Orden de Compra o manualmente con «+ Crear Compra»
                  </p>
                </div>
              )
              : paged.map(g => {
                const orden = getOrden(g.ordenId);

                const prov = g.proveedorId
                  ? proveedores.find(p => p.id === g.proveedorId)
                  : proveedores.find(p =>
                      p.nombre === (g.proveedor || orden?.proveedor) ||
                      p.nombre.toLowerCase() === (g.proveedor || orden?.proveedor)?.toLowerCase() ||
                      p.nombre.toLowerCase().includes((g.proveedor || orden?.proveedor)?.toLowerCase() || '') ||
                      (g.proveedor || orden?.proveedor)?.toLowerCase().includes(p.nombre.toLowerCase() || '')
                    );
                const nit = prov?.nit ?? "";
                const nombreMostrar = prov?.nombre || g.proveedor || orden?.proveedor || "—";
                return (
                  <div key={g.id} className="p-4">
                    {/* N° de factura y estado arriba */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {g.numeroFactura
                          ? <p className="text-sm font-mono font-semibold text-foreground">{g.numeroFactura}</p>
                          : <p className="text-sm text-muted-foreground">—</p>}
                        <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-nowrap">{g.fechaFactura || "—"}</p>
                      </div>
                      <EstadoSelect
                        value={g.estado}
                        onChange={(nuevoEstado) => {
                          if (nuevoEstado === g.estado) return;
                          pedirCambiarEstado(g.id, nuevoEstado);
                        }}
                        options={[
                          { value: "Recibido" as EstadoGestion, label: "Recibido", color: ESTADO_CONFIG.Recibido },
                          { value: "Anulado" as EstadoGestion, label: "Anulado", color: ESTADO_CONFIG.Anulado },
                        ]}
                        disabled={g.estado === "Anulado"}
                        className="shrink-0"
                      />
                    </div>

                    {/* Proveedor con NIT */}
                    <div className="mt-2.5 min-w-0">
                      <p className="text-sm text-foreground break-words">{nombreMostrar}</p>
                      {nit && <p className="text-[11px] text-muted-foreground font-mono">NIT {nit}</p>}
                    </div>

                    {/* Total */}
                    <div className="mt-2.5 flex items-center justify-between gap-3 rounded-xl bg-muted/50 border border-border px-3 py-2">
                      <span className="text-xs text-muted-foreground">Total</span>
                      <span className="text-sm font-semibold text-foreground">
                        {g.valorTotal > 0
                          ? fmtCOP(g.valorTotal)
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </span>
                    </div>

                    {/* Ver detalle */}
                    <div className="mt-2.5 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDetail(g)}
                        title="Ver detalle"
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      )}

      {/* Paginador fuera y debajo de la card (unificado). */}
      {filtered.length > 0 && (
        <Paginador pagina={pageActual} totalPaginas={totalPages} onCambio={setPage} />
      )}

      <AnimatePresence>
        {detail && (
          <CompraForm
            mode="view"
            compra={{
              ...detail,
              proveedor:
                detail.proveedor ?? getOrden(detail.ordenId)?.proveedor ?? "",
            }}
            proveedores={proveedores}
            setProveedores={setProveedores}
            insumos={insumos}
            // Bloque 2: mismos props que en la página Nueva Compra (en modo
            // vista el formulario es de sólo lectura).
            categorias={categorias} categoriasInsumo={categoriasInsumo}
            onCrearProducto={onCrearProducto}
            gestiones={gestiones}
            ordenes={ordenes}
            onClose={() => setDetail(null)}
            onGuardar={() => {}}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {estadoConfirm && (
          <ConfirmModal
            title={`¿Cambiar el estado a ${estadoConfirm.next}?`}
            body={`La compra ${estadoConfirm.id} pasará de ${estadoConfirm.from} a ${estadoConfirm.next}.`}
            detail={
              estadoConfirm.next === "Anulado"
                ? estadoOrdenConfirm
                  ? `La orden ${estadoOrdenConfirm} también quedará anulada y no podrá recibir más facturas.`
                  : "Una compra anulada no puede volver al estado Recibido."
                : "Volverá a contar en los totales de Gestión de Compras."
            }
            confirmLabel={
              estadoConfirm.next === "Anulado" ? "Anular" : `Marcar ${estadoConfirm.next}`
            }
            danger={estadoConfirm.next === "Anulado"}
            icon={
              estadoConfirm.next === "Anulado" ? (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-red-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              )
            }
            showMotivo={estadoConfirm.next === "Anulado"}
            motivo={motivoAnulacion}
            onMotivoChange={setMotivoAnulacion}
            onConfirm={() => handleCambiarEstado(estadoConfirm.id, estadoConfirm.next, motivoAnulacion)}
            onCancel={() => {
              setEstadoConfirm(null);
              setMotivoAnulacion("");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
