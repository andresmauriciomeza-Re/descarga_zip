/**
 * FichaTecnicaEditor — el ÚNICO formulario de ficha técnica del sistema.
 *
 * Antes había tres formas de registrar la misma receta: el bloque de insumos
 * del modal "Crear Producto Insumo" (Compras > Insumos) y, duplicados entre
 * sí, los bloques de "Ficha Técnica" de Crear y de Editar en Producción >
 * Productos. Este componente los reemplaza a los tres: recibe la ficha, la
 * edita y la devuelve por `onChange`; el padre es quien la guarda (como v1 al
 * crear, como versión N+1 al editar).
 *
 * Dos modos:
 *   - "producto": ficha de un Producto del menú → tiempo + porciones por
 *     tamaño + insumos (crudos y Productos Insumo) + pasos.
 *   - "insumo": ficha de un Producto Insumo → tiempo + rendimiento por
 *     preparación + insumos (SOLO crudos) + pasos.
 */
import { Fragment, useEffect, useRef, useState, type Ref } from "react";
import { Check, ChevronDown, ChevronUp, Edit2, Plus, Trash2, X } from "lucide-react";

import { IconTooltip } from "./IconTooltip";
import { toast } from "sonner";
import type { Insumo } from "@/features/insumos/pages/GestionInsumosScreen";
import { InsumoSearchField, resolverInsumo } from "@/features/productos/components/InsumoSearchField";
import { UnidadSelect, type OpcionUnidad } from "@/features/compras/components/UnidadSelect";
import { PRESENTACIONES_INSUMO, UNIDADES_INSUMO } from "@/shared/utils/unidades";
import { unidadesCompatibles } from "@/shared/utils/disponibilidad";
import { limpiarNumeroInput, numeroDeInput } from "@/shared/utils/numeroInput";
import {
  TAMANOS_FICHA,
  UNIDADES_FICHA,
  moverEnLista,
  rendimientoDe,
  type FichaVersion,
  type PorcionesTamano,
  type RInsumo,
  type TamanoFicha,
} from "@/shared/utils/fichas";

/** Clase de los inputs del formulario (los contextos de Crear/Editar pasan la
    suya; el modal de Insumos usa esta por defecto). */
export const FICHA_INPUT_CLS =
  "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const formatoCantidadFicha = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const OTRA_PRESENTACION = "Otra presentación…";

interface PresentacionFila {
  medida: string;
  cantidadOriginal: number;
  etiqueta: string;
  contenido: number;
  unidadBase: "g" | "ml";
  contenidoPersonalizado?: number;
}

const familiaDeUnidad = (unidad: string): { base: "g" | "ml"; unidades: string[] } | null => {
  if (unidad === "kg" || unidad === "g") return { base: "g", unidades: ["kg", "g"] };
  if (unidad === "lt" || unidad === "ml") return { base: "ml", unidades: ["lt", "ml"] };
  return null;
};

const resolverPresentacion = (
  medida: string,
  unidadCatalogo: string,
  contenidoPersonalizado: number,
): Omit<PresentacionFila, "cantidadOriginal" | "medida"> | null => {
  const fija = PRESENTACIONES_INSUMO.find((p) => p.valor === medida);
  if (fija) return { etiqueta: fija.etiqueta, contenido: fija.contenido, unidadBase: fija.unidadBase };
  if (medida !== OTRA_PRESENTACION || !(contenidoPersonalizado > 0)) return null;
  const familia = familiaDeUnidad(unidadCatalogo);
  if (!familia) return null;
  return {
    etiqueta: `${formatoCantidadFicha.format(contenidoPersonalizado)} ${familia.base}`,
    contenido: contenidoPersonalizado,
    unidadBase: familia.base,
    contenidoPersonalizado,
  };
};

/** A5.2 — Lista de "Medida" para una fila de la ficha, según el modo:
    - Modo INSUMO: solo las unidades COMPATIBLES con la del insumo del
      catálogo (kg↔g, lt↔ml o la misma unidad), empezando por la del propio
      insumo. Así una fila no puede quedar con una medida que el sistema no
      sabría convertir al descontar stock. Si la fila trae un valor legacy
      fuera de esa lista se agrega al final: se puede ver y corregir sin
      perderlo de vista.
    - Modo PRODUCTO: la lista histórica UNIDADES_FICHA, exactamente igual que
      siempre (las fichas de pizzas/lasañas no cambian). */
const opcionesMedidaFila = (
  unidadFila: string,
  unidadCatalogo?: string,
): readonly OpcionUnidad[] => {
  if (!unidadCatalogo) return UNIDADES_FICHA.map((u) => ({ valor: u, etiqueta: u }));
  const compatibles: readonly OpcionUnidad[] = UNIDADES_INSUMO.filter((u) =>
    unidadesCompatibles(u.valor, unidadCatalogo),
  );
  const familia = familiaDeUnidad(unidadCatalogo);
  const presentaciones = familia
    ? PRESENTACIONES_INSUMO
        .filter((p) => p.unidadBase === familia.base)
        .map(({ valor, etiqueta }) => ({ valor, etiqueta, textoCorto: etiqueta }))
    : [];
  const opciones = [
    ...compatibles,
    ...presentaciones,
    ...(familia
      ? [{
          valor: OTRA_PRESENTACION,
          etiqueta: `Otra presentación… ${familia.base}`,
          textoCorto: `Otra presentación… ${familia.base}`,
        }]
      : []),
  ];
  return opciones.some((u) => u.valor === unidadFila)
    ? opciones
    : [...opciones, { valor: unidadFila, etiqueta: unidadFila }];
};

/**
 * Fila en edición de un insumo de la ficha: la cantidad se corrige con un
 * input de borde visible y botones −/+, la unidad con un select visible, y se
 * confirma con ✓ o se descarta con ✗. Los cambios locales solo se aplican al
 * borrador al aceptar.
 */
function InsumoFilaEditable({
  ins,
  usarUnidadSelect,
  unidadCatalogo,
  presentacionFila,
  onSave,
  onCancel,
}: {
  ins: RInsumo;
  /** true = la unidad se elige con UnidadSelect (modo insumo, mismo estilo
      redondeado que "Unidad de medida"); false = select nativo (modo
      producto, sin cambios). */
  usarUnidadSelect?: boolean;
  /** Unidad de medida del insumo del catálogo (SOLO modo insumo): la
      "Medida" de la fila ofrece solo las unidades compatibles con ella
      (A5.2). Ausente = lista histórica UNIDADES_FICHA (modo producto). */
  unidadCatalogo?: string;
  presentacionFila?: PresentacionFila;
  onSave: (r: RInsumo, presentacion?: PresentacionFila | null) => void;
  onCancel: () => void;
}) {
  const [cantidad, setCantidad] = useState(presentacionFila?.cantidadOriginal ?? ins.cantidad);
  const [unidad, setUnidad] = useState(presentacionFila?.medida ?? ins.unidad);
  const [contenidoPersonalizado, setContenidoPersonalizado] = useState(
    presentacionFila?.contenidoPersonalizado ?? 0,
  );
  // Las medidas deben ser compatibles con la unidad del insumo seleccionado.
  const opcionesUnidad: readonly OpcionUnidad[] = opcionesMedidaFila(unidad, unidadCatalogo);
  const detallePresentacion = usarUnidadSelect && unidadCatalogo
    ? resolverPresentacion(unidad, unidadCatalogo, contenidoPersonalizado)
    : null;
  const puedeGuardar =
    cantidad > 0 && (unidad !== OTRA_PRESENTACION || Boolean(detallePresentacion));
  const guardar = () => {
    if (detallePresentacion) {
      const meta: PresentacionFila = {
        medida: unidad,
        cantidadOriginal: cantidad,
        ...detallePresentacion,
      };
      onSave({
        ...ins,
        cantidad: cantidad * detallePresentacion.contenido,
        unidad: detallePresentacion.unidadBase,
      }, meta);
      return;
    }
    onSave({ ...ins, cantidad, unidad }, null);
  };
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
            // 0 = vacío (punto B1): si el usuario borra el campo queda en
            // blanco; los botones − / + tratan ese vacío como 0.
            value={cantidad === 0 ? "" : cantidad}
            placeholder="0"
            onChange={(e) => setCantidad(numeroDeInput(limpiarNumeroInput(e.target.value)))}
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
        {usarUnidadSelect ? (
          <UnidadSelect
            value={unidad}
            onChange={setUnidad}
            unidades={opcionesUnidad}
            ariaLabel="Medida"
            fieldClassName="bg-card text-foreground"
            mostrarValorSeleccionadoCorto
          />
        ) : (
          <select
            value={unidad}
            onChange={(e) => setUnidad(e.target.value)}
            className="px-2 py-1 bg-card rounded-lg border border-border text-sm font-mono text-foreground focus:outline-none cursor-pointer"
          >
            {(unidadCatalogo
              ? UNIDADES_FICHA.filter((opcion) => unidadesCompatibles(opcion, unidadCatalogo))
              : UNIDADES_FICHA
            ).map((u) => <option key={u}>{u}</option>)}
          </select>
        )}
        {usarUnidadSelect && unidad === OTRA_PRESENTACION && (
          <div className="relative mt-1">
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={contenidoPersonalizado || ""}
              placeholder="Contenido"
              aria-label="Contenido"
              onChange={(e) => setContenidoPersonalizado(numeroDeInput(limpiarNumeroInput(e.target.value)))}
              className="w-full rounded-lg border border-border bg-card px-2 py-1 pr-9 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {familiaDeUnidad(unidadCatalogo ?? "")?.base}
            </span>
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <IconTooltip label="Aceptar">
            <button
              type="button"
              disabled={usarUnidadSelect && !puedeGuardar}
              onClick={guardar}
              aria-label="Aceptar"
              className="p-1.5 rounded-lg hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
          </IconTooltip>
          <IconTooltip label="Cancelar">
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancelar"
              className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </IconTooltip>
        </div>
      </td>
    </>
  );
}

/**
 * Tabla "Insumos de la ficha", con el mismo patrón de la tabla de insumos de
 * Orden de Compra: lápiz (Editar) y basurero (Eliminar). Con el lápiz la fila
 * pasa a edición en el sitio (solo una fila a la vez). En versiones
 * históricas (`editable = false`) no se muestran ni lápiz ni basurero.
 */
function InsumosFichaTable({
  insumos,
  editable,
  editandoIdx,
  usarUnidadSelect,
  insumosCatalogo,
  presentaciones,
  onEdit,
  onChange,
  onRemove,
  onPresentationChange,
  contenedorClassName,
  contenedorRef,
  stickyHeader,
}: {
  insumos: RInsumo[];
  editable: boolean;
  editandoIdx: number | null;
  /** true = la fila en edición usa UnidadSelect para la unidad (modo insumo). */
  usarUnidadSelect?: boolean;
  /** Catálogo COMPLETO de Insumos (SOLO modo insumo): con él cada fila
      resuelve la unidad de medida de su insumo y la "Medida" en edición
      ofrece solo las unidades compatibles (A5.2). Ausente = modo producto,
      sin cambios. */
  insumosCatalogo?: Insumo[];
  /** Metadatos de presentaciones vigentes solo durante esta sesión de edición. */
  presentaciones?: Record<string, PresentacionFila>;
  onEdit: (idx: number | null) => void;
  onChange: (idx: number, patch: Partial<RInsumo>) => void;
  onRemove: (idx: number) => void;
  onPresentationChange?: (key: string, presentacion: PresentacionFila | null) => void;
  /** Clase extra del contenedor (p. ej. para el scroll interno del modal de
      Insumos). Por defecto solo hay scroll horizontal. */
  contenedorClassName?: string;
  /** Ref al contenedor con scroll (para bajar al último insumo agregado). */
  contenedorRef?: Ref<HTMLDivElement>;
  /** Encabezado sticky cuando el contenedor tiene scroll vertical. */
  stickyHeader?: boolean;
}) {
  return (
    <div
      ref={contenedorRef}
      className={`overflow-x-auto rounded-xl border border-border ${contenedorClassName ?? ""}`}
    >
      <table className="w-full">
        <thead
          className={`text-xs text-muted-foreground uppercase tracking-wider ${
            stickyHeader ? "sticky top-0 z-10 bg-muted" : "bg-muted/50"
          }`}
        >
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Insumo</th>
            <th className="px-3 py-2 text-left font-semibold">Cantidad</th>
            <th className="px-3 py-2 text-left font-semibold">Unidad</th>
            {editable && <th className="px-3 py-2 text-left font-semibold">Acciones</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {insumos.map((ins, idx) => (
            <Fragment key={`${ins.nombre}-${idx}`}>
            <tr className="bg-muted/40">
              {editable && editandoIdx === idx ? (
                <InsumoFilaEditable
                  key={idx}
                  ins={ins}
                  usarUnidadSelect={usarUnidadSelect}
                  presentacionFila={presentaciones?.[ins.insumoId ?? ins.nombre]}
                  /* A5.2: unidad del insumo del catálogo (por id real o, en
                     fichas viejas, por nombre normalizado) para filtrar las
                     medidas compatibles de la fila. */
                  unidadCatalogo={
                    insumosCatalogo
                      ? (insumosCatalogo.find((i) => i.id === ins.insumoId)?.unidadMedida ??
                        resolverInsumo(insumosCatalogo, ins.nombre)?.unidadMedida)
                      : undefined
                  }
                  onSave={(r, presentacion) => {
                    onChange(idx, r);
                    onPresentationChange?.(r.insumoId ?? r.nombre, presentacion ?? null);
                    onEdit(null);
                  }}
                  onCancel={() => onEdit(null)}
                />
              ) : (
                <>
                  <td className="px-3 py-2 text-sm font-medium text-foreground">{ins.nombre}</td>
                  <td className="px-3 py-2 text-sm font-mono text-muted-foreground">
                    {presentaciones?.[ins.insumoId ?? ins.nombre] ? (
                      <div>
                        <div>{formatoCantidadFicha.format(ins.cantidad)}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatoCantidadFicha.format(presentaciones[ins.insumoId ?? ins.nombre].cantidadOriginal)} ×{" "}
                          {presentaciones[ins.insumoId ?? ins.nombre].etiqueta}
                        </div>
                      </div>
                    ) : ins.cantidad}
                  </td>
                  <td className="px-3 py-2 text-sm text-muted-foreground font-mono">{ins.unidad}</td>
                  {editable && (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <IconTooltip label="Editar">
                          <button
                            type="button"
                            onClick={() => onEdit(idx)}
                            aria-label="Editar"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </IconTooltip>
                        <IconTooltip label="Eliminar" tone="danger">
                          <button
                            type="button"
                            onClick={() => onRemove(idx)}
                            aria-label="Eliminar"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </IconTooltip>
                      </div>
                    </td>
                  )}
                </>
              )}
            </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface FichaTecnicaEditorProps {
  /** Borrador de la ficha que se está editando (nunca una versión guardada). */
  ficha: FichaVersion;
  /** Escribe el borrador completo. El padre decide dónde persistirlo. */
  onChange: (siguiente: FichaVersion) => void;
  /** Catálogo de Compras > Insumos, tal como llega del estado de App. */
  insumos: Insumo[];
  /** "producto" = Producto del menú; "insumo" = Producto Insumo. */
  modo: "producto" | "insumo";
  /** Clase de los inputs (los dos contextos usan padding distinto). */
  inputCls?: string;
  /** Etiquetas fijas de "Porciones por tamaño" que define la categoría del
      producto: las filas se muestran exactamente con estos nombres y NO se
      pueden agregar ni quitar (sin selector, sin "+ Agregar tamaño" ni la
      papelera); solo se editan sus porciones. Si la categoría no está
      configurada, el padre pasa un único elemento ("Único"). Ausente =
      modo libre (fallback de datos viejos). */
  tamanoFijo?: readonly string[];
  /** Unidad de medida del Producto Insumo, visible junto a "Cantidad a hacer". */
  unidadCantidad?: string;
  /** Presentación del Producto Insumo; solo se usa en modo "insumo". */
  presentacionCantidad?: {
    contenido: number;
    unidadBase: "g" | "ml";
    etiquetaContenido: string;
  };
  /** Mensajes de validación (SOLO modo insumo). El padre decide cuándo
      mostrarlos; el formulario de Producto Insumo los muestra al guardar;
      aquí solo se pintan con el estilo de error del sistema. */
  errorTiempo?: string;
  errorCantidad?: string;
  errorInsumos?: string;
}

export function FichaTecnicaEditor({
  ficha,
  onChange,
  insumos,
  modo,
  inputCls = FICHA_INPUT_CLS,
  tamanoFijo,
  unidadCantidad,
  presentacionCantidad,
  errorTiempo,
  errorCantidad,
  errorInsumos,
}: FichaTecnicaEditorProps) {
  const esInsumo = modo === "insumo";
  const filaInputCls = esInsumo ? `${inputCls} h-11` : inputCls;
  const insumosScrollRef = useRef<HTMLDivElement>(null);
  const insumosCantidadRef = useRef(ficha.insumos.length);

  useEffect(() => {
    if (!esInsumo) return;
    if (ficha.insumos.length > insumosCantidadRef.current) {
      const contenedor = insumosScrollRef.current;
      if (contenedor) {
        contenedor.scrollTo({ top: contenedor.scrollHeight, behavior: "smooth" });
      }
    }
    insumosCantidadRef.current = ficha.insumos.length;
  }, [ficha.insumos.length, esInsumo]);

  // Búsqueda y alta de insumos (una sola fila a la vez).
  const [sel, setSel] = useState<Insumo | null>(null);
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [unidad, setUnidad] = useState(UNIDADES_FICHA[0]);
  const [contenidoOtraPresentacion, setContenidoOtraPresentacion] = useState(0);
  const [presentacionesFila, setPresentacionesFila] = useState<Record<string, PresentacionFila>>({});
  // Fila de la tabla de insumos abierta en edición (solo una a la vez).
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null);
  const [paso, setPaso] = useState("");

  // Un Producto Insumo solo se prepara con insumos crudos ACTIVOS (nunca con
  // otro Producto Insumo); un Producto del menú puede usar los dos.
  const catalogo = esInsumo
    ? insumos.filter((i) => i.tipo !== "ProductoInsumo" && i.estado === "activo")
    : insumos;
  const idsInsumosAgregados = ficha.insumos
    .map((fila) => fila.insumoId ?? resolverInsumo(catalogo, fila.nombre)?.id)
    .filter((id): id is string => Boolean(id));
  const detallePresentacion = sel
    ? resolverPresentacion(unidad, sel.unidadMedida, contenidoOtraPresentacion)
    : null;
  const resumenPresentacion = detallePresentacion && cantidad > 0
    ? `${formatoCantidadFicha.format(cantidad)} × ${detallePresentacion.etiqueta} = ${formatoCantidadFicha.format(cantidad * detallePresentacion.contenido)} ${detallePresentacion.unidadBase}${
        detallePresentacion.unidadBase === "ml" && cantidad * detallePresentacion.contenido >= 1000
          ? ` (${formatoCantidadFicha.format((cantidad * detallePresentacion.contenido) / 1000)} lt)`
          : ""
      }`
    : null;

  // Filas de "Porciones por tamaño". Con `tamanoFijo` (la categoría del
  // producto manda los tamaños) se muestran EXACTAMENTE esas etiquetas: las
  // que el borrador trae conservan sus porciones y las que falten se
  // completan con 1 (los valores por defecto los precarga el padre al elegir
  // la categoría). Sin `tamanoFijo` sigue el modo libre de antes (fallback
  // para datos viejos). La Grande de pizza va fija en 8 y en solo lectura:
  // la base solo guarda las porciones del primer tamaño.
  const porcionesFijas = (idx: number, tamano: string) =>
    !!tamanoFijo && idx > 0 && tamano === "Grande";
  const filas: PorcionesTamano[] = tamanoFijo
    ? tamanoFijo.map((t, idx) =>
        porcionesFijas(idx, t)
          ? { tamano: t, porciones: 8 }
          : ficha.porcionesPorTamano?.find((f) => f.tamano === t) ?? { tamano: t, porciones: 1 })
    : (ficha.porcionesPorTamano ?? [{ tamano: TAMANOS_FICHA[2], porciones: ficha.porciones }]);
  const setFilas = (nuevas: PorcionesTamano[]) =>
    onChange({ ...ficha, porcionesPorTamano: nuevas, porciones: nuevas[0].porciones });
  const addTamano = () => {
    const usados = filas.map((f) => f.tamano);
    const libre = TAMANOS_FICHA.find((t) => !usados.includes(t));
    if (!libre) return;
    setFilas([...filas, { tamano: libre, porciones: 1 }]);
  };
  const removeTamano = (idx: number) => {
    if (filas.length > 1) setFilas(filas.filter((_, i) => i !== idx));
  };
  // Elige el tamaño de una fila (modo libre); un tamaño ya usado en otra fila
  // queda deshabilitado y aquí se descarta por seguridad.
  const updateTamano = (idx: number, tamano: string) => {
    if (filas.some((f, i) => i !== idx && f.tamano === tamano)) return;
    setFilas(filas.map((f, i) => (i === idx ? { ...f, tamano } : f)));
  };
  // Porciones enteras >= 1: es la regla mínima de la ficha, así que el input
  // no admite 0 ni decimales (fichaCumpleMinimo la vuelve a validar al
  // guardar).
  const updatePorcionesTamano = (idx: number, n: number) => {
    if (!Number.isFinite(n)) return;
    setFilas(filas.map((f, i) => (i === idx ? { ...f, porciones: Math.max(1, Math.round(n)) } : f)));
  };

  // Al elegir del buscador se autocompleta la "Medida" con la unidad del
  // catálogo; sigue siendo editable a mano después. A5.2: en modo insumo la
  // "Medida" arranca SIEMPRE con la unidad del propio insumo elegido (antes
  // podía quedar "kg" fijo), y su lista se reduce a las compatibles.
  const seleccionarInsumo = (ins: Insumo) => {
    setSel(ins);
    setNombre(ins.nombre);
    setContenidoOtraPresentacion(0);
    setUnidad(
      esInsumo
        ? ins.unidadMedida
        : UNIDADES_FICHA.includes(ins.unidadMedida)
          ? ins.unidadMedida
          : UNIDADES_FICHA.find((opcion) => unidadesCompatibles(opcion, ins.unidadMedida))
            ?? UNIDADES_FICHA[0],
    );
  };

  // Solo se agrega un insumo que exista en el catálogo: o se seleccionó del
  // buscador, o el texto escrito coincide exactamente con un insumo real.
  const addInsumo = () => {
    const ins = esInsumo ? sel : sel ?? resolverInsumo(catalogo, nombre);
    if (!ins) {
      if (!esInsumo) toast.error("Selecciona un insumo del catálogo de Insumos");
      return;
    }
    if (
      ficha.insumos.some(
        (i) => i.nombre === ins.nombre || (i.insumoId && i.insumoId === ins.id),
      )
    ) {
      if (!esInsumo) toast.error("Este insumo ya está en la ficha; edítalo en la tabla");
      return;
    }
    const presentacion = esInsumo
      ? resolverPresentacion(unidad, ins.unidadMedida, contenidoOtraPresentacion)
      : null;
    const fila: RInsumo = {
      insumoId: ins.id,
      nombre: ins.nombre,
      cantidad: presentacion ? cantidad * presentacion.contenido : cantidad,
      unidad: presentacion
        ? presentacion.unidadBase
        : esInsumo && !unidadesCompatibles(unidad, ins.unidadMedida)
          ? ins.unidadMedida
          : unidad,
    };
    onChange({
      ...ficha,
      insumos: [...ficha.insumos, fila],
    });
    if (presentacion) {
      setPresentacionesFila((actuales) => ({
        ...actuales,
        [ins.id]: { medida: unidad, cantidadOriginal: cantidad, ...presentacion },
      }));
    }
    setNombre("");
    setCantidad(1);
    setSel(null);
    setContenidoOtraPresentacion(0);
  };
  const puedeAgregarInsumo = Boolean(
    sel &&
    cantidad > 0 &&
    !idsInsumosAgregados.includes(sel.id) &&
    (unidad !== OTRA_PRESENTACION || detallePresentacion),
  );
  const updateInsumo = (idx: number, patch: Partial<RInsumo>) =>
    onChange({
      ...ficha,
      insumos: ficha.insumos.map((ins, j) => (j === idx ? { ...ins, ...patch } : ins)),
    });
  const removeInsumo = (idx: number) => {
    const fila = ficha.insumos[idx];
    if (fila) {
      setPresentacionesFila((actuales) => {
        const siguientes = { ...actuales };
        delete siguientes[fila.insumoId ?? fila.nombre];
        return siguientes;
      });
    }
    onChange({ ...ficha, insumos: ficha.insumos.filter((_, j) => j !== idx) });
  };
  const guardarPresentacionFila = (key: string, presentacion: PresentacionFila | null) =>
    setPresentacionesFila((actuales) => {
      const siguientes = { ...actuales };
      if (presentacion) siguientes[key] = presentacion;
      else delete siguientes[key];
      return siguientes;
    });

  const addPaso = () => {
    if (!paso.trim()) return;
    onChange({ ...ficha, pasos: [...ficha.pasos, paso.trim()] });
    setPaso("");
  };
  const removePaso = (idx: number) =>
    onChange({ ...ficha, pasos: ficha.pasos.filter((_, j) => j !== idx) });
  // Reordena los pasos: el número de cada paso se recalcula solo porque la
  // lista se renderiza con la posición (idx + 1).
  const moverPaso = (idx: number, dir: -1 | 1) =>
    onChange({ ...ficha, pasos: moverEnLista(ficha.pasos, idx, dir) });

  return (
    <div className={esInsumo ? "flex min-h-0 flex-col gap-4 lg:h-full" : "space-y-4"}>
      {/* En producto la rejilla "Tiempo | Porciones" es 1 : 1.4 (la columna de
          porciones es más ancha: lleva las cajitas lado a lado). En insumo,
          Tiempo y Cantidad a hacer comparten una fila. */}
      <div
        className={`shrink-0 grid ${
          esInsumo
            ? "grid-cols-1 sm:grid-cols-2 items-start gap-4"
            : "grid-cols-[1fr_1.4fr] gap-3"
        }`}
      >
        <div className={esInsumo ? "flex min-w-0 flex-col gap-2" : undefined}>
          <label
            className={
              esInsumo
                ? "flex min-h-[2.5rem] items-end text-xs font-semibold text-muted-foreground"
                : "block text-xs font-semibold text-muted-foreground mb-0.5"
            }
          >
            {esInsumo ? "Tiempo (min) *" : "Tiempo de preparación (min)"}
          </label>
          {/* Como todos los numéricos del sistema (punto B1): el 0 se muestra
              vacío con placeholder "0", en producto y en insumo. */}
          <input
            type="number"
            min={0}
            aria-label="Tiempo de preparación"
            data-producto-insumo-campo={esInsumo ? "tiempo" : undefined}
            value={ficha.tiempoPreparacion === 0 ? "" : ficha.tiempoPreparacion}
            placeholder="0"
            onChange={e => onChange({ ...ficha, tiempoPreparacion: numeroDeInput(limpiarNumeroInput(e.target.value)) })}
            className={esInsumo ? filaInputCls : inputCls} />
          {esInsumo && errorTiempo && (
            <p className="text-xs text-red-500 dark:text-red-400 leading-tight">{errorTiempo}</p>
          )}
        </div>
        {esInsumo ? (
          <div className="flex min-w-0 flex-col">
            <label className="flex min-h-[2.5rem] items-end text-xs font-semibold text-muted-foreground mb-2">
              {`Cantidad a hacer${presentacionCantidad ? ` (× ${presentacionCantidad.etiquetaContenido})` : unidadCantidad ? ` (${unidadCantidad})` : ""} *`}
            </label>
            {/* Vacío = cantidad sin escribir (punto B1): al consumirlo los
                demás módulos usan `rendimientoDe`, que cae en 1 si es 0. */}
            <div className="relative">
              <input type="number" min={0.1} step={0.1}
                value={ficha.rendimiento && ficha.rendimiento > 0 ? rendimientoDe(ficha) : ""}
                placeholder="0"
                aria-label="Cantidad a hacer"
                data-producto-insumo-campo="cantidad"
                onChange={e => onChange({ ...ficha, rendimiento: numeroDeInput(limpiarNumeroInput(e.target.value)) })}
                className={`${filaInputCls} ${unidadCantidad && !presentacionCantidad ? "pr-16" : ""}`} />
              {unidadCantidad && !presentacionCantidad ? (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {unidadCantidad}
                </span>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Elige la unidad de medida en Datos
                </p>
              )}
            </div>
            {presentacionCantidad && ficha.rendimiento > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatoCantidadFicha.format(ficha.rendimiento)} × {presentacionCantidad.etiquetaContenido} ={" "}
                {formatoCantidadFicha.format(ficha.rendimiento * presentacionCantidad.contenido)} {presentacionCantidad.unidadBase}
                {presentacionCantidad.unidadBase === "ml" && ficha.rendimiento * presentacionCantidad.contenido >= 1000
                  ? ` (${formatoCantidadFicha.format((ficha.rendimiento * presentacionCantidad.contenido) / 1000)} lt)`
                  : ""}
              </p>
            )}
            {errorCantidad && (
              <p className="text-xs text-red-500 dark:text-red-400 leading-tight">{errorCantidad}</p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Porciones por tamaño</label>
            {tamanoFijo ? (
              /* Tamaño fijo por categoría (Pizzas, Lasañas): la categoría
                 define los tamaños, no se agregan ni se quitan. UNA sola fila
                 de cajitas lado a lado, con la misma piel y altura que el
                 input de tiempo: nombre a la izquierda y porciones editables
                 a la derecha. Sin fila de encabezados. */
              <div className="flex flex-wrap gap-2">
                {filas.map((fila, idx) => (
                  <div key={idx}
                    className="flex-1 min-w-[9rem] flex items-center justify-between gap-2 px-3 py-2.5 bg-muted rounded-xl border border-border focus-within:ring-2 focus-within:ring-primary/30">
                    <span className="min-w-0 truncate text-sm font-medium text-foreground">{fila.tamano}</span>
                    <input type="number" min={1} step={1} value={fila.porciones}
                      aria-label={`Porciones de ${fila.tamano}`}
                      readOnly={porcionesFijas(idx, fila.tamano)}
                      title={porcionesFijas(idx, fila.tamano) ? "La Grande va fija en 8 porciones" : undefined}
                      onChange={e => {
                        if (porcionesFijas(idx, fila.tamano)) return;
                        updatePorcionesTamano(idx, Number(e.target.value));
                      }}
                      className={`w-12 shrink-0 bg-transparent text-right text-sm font-bold focus:outline-none ${
                        porcionesFijas(idx, fila.tamano) ? "text-muted-foreground cursor-not-allowed" : "text-foreground"
                      }`} />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="flex gap-2 text-[11px] font-semibold text-muted-foreground mb-1">
                  <span className="flex-1 min-w-0">Tamaño</span>
                  <span className="w-20 shrink-0">Porciones</span>
                  <span className="w-6 shrink-0" />
                </div>
                <div className="space-y-2">
                  {filas.map((fila, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={fila.tamano}
                        onChange={e => updateTamano(idx, e.target.value as TamanoFicha)}
                        aria-label="Tamaño"
                        className="flex-1 min-w-0 px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                        {TAMANOS_FICHA.map(t => (
                          <option key={t} value={t} disabled={filas.some((f, i) => i !== idx && f.tamano === t)}>{t}</option>
                        ))}
                      </select>
                      <input type="number" min={1} step={1} value={fila.porciones} aria-label="Porciones"
                        onChange={e => updatePorcionesTamano(idx, Number(e.target.value))}
                        className="w-20 shrink-0 px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      <IconTooltip label="Quitar tamaño" tone="danger">
                        <button type="button" onClick={() => removeTamano(idx)}
                          disabled={filas.length === 1}
                          aria-label="Quitar tamaño"
                          className="w-6 shrink-0 p-1 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </IconTooltip>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addTamano} disabled={filas.length === TAMANOS_FICHA.length}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Agregar tamaño
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Insumos */}
      <div className={esInsumo ? "relative z-10 flex min-h-0 flex-col gap-4 lg:flex-1" : ""}>
        {esInsumo ? (
          <>
            <label className="shrink-0 block text-xs font-semibold text-muted-foreground">
              Insumos a usar *
            </label>
            <div className="relative z-20 shrink-0">
              <InsumoSearchField
                insumos={catalogo}
                valor={nombre}
                onValorChange={v => { setNombre(v); setSel(null); }}
                onSelect={seleccionarInsumo}
                label="Buscar insumo"
                placeholder="Buscar insumo por nombre..."
                direction="down"
                excluirIds={idsInsumosAgregados}
                maxResultados={6}
                mensajeSinResultados="No se encontraron insumos"
                dataField="insumos"
              />
            </div>
            <div className="shrink-0 grid grid-cols-[1fr_1fr_auto] items-end gap-3">
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad</label>
                <input type="number" min={0.1} step={0.1}
                  value={cantidad === 0 ? "" : cantidad}
                  placeholder="0"
                  onChange={e => setCantidad(numeroDeInput(limpiarNumeroInput(e.target.value)))}
                  className="h-11 w-full min-w-0 px-3 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="min-w-0 [&_button]:h-11 [&_button_span]:min-w-0 [&_button_span]:truncate">
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Medida</label>
                <UnidadSelect
                  value={unidad}
                  onChange={setUnidad}
                  unidades={sel ? opcionesMedidaFila(unidad, sel.unidadMedida) : UNIDADES_INSUMO}
                  ariaLabel="Medida"
                  mostrarValorSeleccionadoCorto
                />
                {sel && unidad === OTRA_PRESENTACION && (
                  <div className="relative mt-1">
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={contenidoOtraPresentacion || ""}
                      placeholder="Contenido"
                      aria-label="Contenido"
                      onChange={(e) => setContenidoOtraPresentacion(numeroDeInput(limpiarNumeroInput(e.target.value)))}
                      className="h-11 w-full rounded-xl border border-border bg-muted px-2 pr-9 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {familiaDeUnidad(sel.unidadMedida)?.base}
                    </span>
                  </div>
                )}
              </div>
              <IconTooltip label="Agregar insumo">
                <button
                  type="button"
                  onClick={addInsumo}
                  disabled={!puedeAgregarInsumo}
                  aria-label="Agregar insumo"
                  className="h-11 w-11 shrink-0 inline-flex items-center justify-center bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:bg-muted disabled:text-muted-foreground disabled:hover:bg-muted disabled:cursor-not-allowed cursor-pointer transition-colors active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </IconTooltip>
            </div>
            {resumenPresentacion && (
              <p className="shrink-0 -mt-2 text-xs text-muted-foreground">{resumenPresentacion}</p>
            )}
            {errorInsumos && (
              <p className="shrink-0 text-xs text-red-500 dark:text-red-400 leading-tight">{errorInsumos}</p>
            )}
            {ficha.insumos.length > 0 ? (
              <div className="mt-4 min-h-0 lg:flex-1">
                <InsumosFichaTable
                  insumos={ficha.insumos}
                  editable
                  editandoIdx={editandoIdx}
                  usarUnidadSelect
                  presentaciones={presentacionesFila}
                  onEdit={setEditandoIdx}
                  onChange={updateInsumo}
                  onRemove={removeInsumo}
                  onPresentationChange={guardarPresentacionFila}
                  contenedorClassName="no-scrollbar max-h-60 overflow-y-auto overscroll-contain lg:max-h-60"
                  contenedorRef={insumosScrollRef}
                  stickyHeader
                  insumosCatalogo={insumos}
                />
              </div>
            ) : (
              <div className="mt-4 flex min-h-16 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-3 text-xs italic text-muted-foreground">
                Sin insumos agregados
              </div>
            )}
          </>
        ) : (
          <>
            <label className="shrink-0 block text-xs font-semibold text-muted-foreground mb-2">Insumos</label>
            {ficha.insumos.length > 0 ? (
              <div className="mb-3">
                <InsumosFichaTable
                  insumos={ficha.insumos}
                  editable
                  editandoIdx={editandoIdx}
                  onEdit={setEditandoIdx}
                  onChange={updateInsumo}
                  onRemove={removeInsumo}
                  insumosCatalogo={insumos}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic mb-3">Sin insumos agregados</p>
            )}
            <div className="shrink-0 flex flex-nowrap items-end gap-2">
              <InsumoSearchField
                insumos={catalogo}
                valor={nombre}
                onValorChange={v => { setNombre(v); setSel(null); }}
                onSelect={seleccionarInsumo}
                direction="down"
              />
              <div className="w-20">
                <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Cantidad</label>
                <input type="number" min={0.1} step={0.1}
                  value={cantidad === 0 ? "" : cantidad}
                  placeholder="0"
                  onChange={e => setCantidad(numeroDeInput(limpiarNumeroInput(e.target.value)))}
                  className="w-full px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="w-24">
                <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Medida</label>
                <select value={unidad} onChange={e => setUnidad(e.target.value)}
                  className="w-full px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none cursor-pointer">
                  {(sel
                    ? UNIDADES_FICHA.filter((opcion) => unidadesCompatibles(opcion, sel.unidadMedida))
                    : UNIDADES_FICHA
                  ).map((opcion) => <option key={opcion}>{opcion}</option>)}
                </select>
              </div>
              <IconTooltip label="Agregar insumo">
                <button type="button" onClick={addInsumo}
                  disabled={!puedeAgregarInsumo}
                  aria-label="Agregar insumo"
                  className="shrink-0 px-3 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors active:scale-95">
                  <Plus className="w-4 h-4" />
                </button>
              </IconTooltip>
            </div>
          </>
        )}
      </div>

      {/* Pasos de elaboración — SOLO en modo producto. Un Producto Insumo
          registra tiempo, cantidad a hacer e insumos; sus pasos históricos se
          conservan en la ficha pero no se editan aquí. */}
      {!esInsumo && (
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">Preparación (pasos de elaboración)</label>
        {ficha.pasos.length > 0 && (
          <ol className="space-y-1.5 mb-3">
            {ficha.pasos.map((p, idx) => (
              <li key={idx} className="flex items-start gap-2 px-3 py-2 bg-muted/40 rounded-xl border border-border">
                <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">{idx + 1}</span>
                <span className="flex-1 text-sm text-foreground leading-snug">{p}</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <IconTooltip label="Subir paso">
                    <button onClick={() => moverPaso(idx, -1)} disabled={idx === 0}
                      aria-label="Subir paso"
                      className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  </IconTooltip>
                  <IconTooltip label="Bajar paso">
                    <button onClick={() => moverPaso(idx, 1)} disabled={idx === ficha.pasos.length - 1}
                      aria-label="Bajar paso"
                      className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </IconTooltip>
                </div>
                <IconTooltip label="Eliminar paso" tone="danger">
                  <button onClick={() => removePaso(idx)}
                    aria-label="Eliminar paso"
                    className="p-1 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 cursor-pointer transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </IconTooltip>
              </li>
            ))}
          </ol>
        )}
        {ficha.pasos.length === 0 && (
          <p className="text-xs text-muted-foreground italic mb-3">Sin pasos agregados</p>
        )}
        <div className="flex gap-2">
          <input value={paso} onChange={e => setPaso(e.target.value)}
            placeholder="Describe un paso de la elaboración"
            onKeyDown={e => e.key === "Enter" && addPaso()}
            className="flex-1 px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <button onClick={addPaso}
            className="px-3 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

/**
 * Vista de solo lectura de una versión de la ficha: la usan Ver detalle,
 * las versiones históricas de Editar y el detalle del Producto Insumo.
 * En Ver detalle la columna derecha no tiene scroll: los bloques de arriba
 * son `shrink-0` y la LISTA DE PASOS (y solo ella) crece con el espacio
 * libre y desplaza dentro de su propio recuadro cuando la receta es larga.
 * No muestra ID técnico: el operador trabaja con el nombre del registro.
 */
export function FichaTecnicaDetalle({
  v,
  readCls,
  modo = "producto",
  unidadCantidad,
}: {
  v: FichaVersion;
  readCls: string;
  modo?: "producto" | "insumo";
  /** Unidad de la "Cantidad a hacer" ("kg", "lt", …). SOLO modo insumo. */
  unidadCantidad?: string;
}) {
  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
      {/* Tiempo de preparación y el dato de rendimiento/porciones en una fila.
          En producto la proporción es 1 : 1.4 (como en el editor); en insumo
          se mantiene 50/50. */}
      <div className={`shrink-0 grid gap-3 ${modo === "insumo" ? "grid-cols-2" : "grid-cols-[1fr_1.4fr]"}`}>
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-0.5">Tiempo de preparación (min)</p>
          <div className={readCls}>{v.tiempoPreparacion}</div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-0.5">
            {modo === "insumo" ? "Unidades (porciones)" : "Porciones por tamaño"}
          </p>
          {modo === "insumo" ? (
            <div className={readCls}>
              {rendimientoDe(v)}{unidadCantidad ? ` ${unidadCantidad}` : ""}
            </div>
          ) : v.porcionesPorTamano?.length ? (
            /* Mismo patrón de cajitas que el editor: nombre a la izquierda,
               porciones en negrita a la derecha, solo lectura. La piel sale
               de readCls para calzar con la caja de Tiempo de cada pantalla. */
            <div className="flex flex-wrap gap-2">
              {v.porcionesPorTamano.map((pt, idx) => (
                <div key={idx} className={`${readCls} flex flex-1 min-w-[9rem] items-center justify-between gap-2`}>
                  <span className="min-w-0 truncate font-medium">{pt.tamano}</span>
                  <span className="font-bold">{pt.porciones}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Normal: {v.porciones}</span>
          )}
        </div>
      </div>
      {/* Insumos: tabla compacta (Insumo | Cantidad | Unidad) con filas de
          menor alto en lugar de las tarjetas apiladas. */}
      <div className="shrink-0">
        <p className="text-xs font-semibold text-muted-foreground mb-1">
          {modo === "insumo" ? "Insumos a usar" : "Insumos"}
        </p>
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
