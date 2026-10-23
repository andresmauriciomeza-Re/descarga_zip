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
import { Fragment, useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { Check, ChevronDown, ChevronUp, Edit2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Insumo } from "@/features/insumos/pages/GestionInsumosScreen";
import { InsumoSearchField, resolverInsumo } from "@/features/productos/components/InsumoSearchField";
import { UnidadSelect, type OpcionUnidad } from "@/features/compras/components/UnidadSelect";
import { UNIDADES_INSUMO } from "@/shared/utils/unidades";
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
  return compatibles.some((u) => u.valor === unidadFila)
    ? compatibles
    : [...compatibles, { valor: unidadFila, etiqueta: unidadFila }];
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
  onSave: (r: RInsumo) => void;
  onCancel: () => void;
}) {
  const [cantidad, setCantidad] = useState(ins.cantidad);
  const [unidad, setUnidad] = useState(ins.unidad);
  // A5.2: en modo insumo solo unidades compatibles con la del catálogo; en
  // modo producto, la lista de siempre.
  const opcionesUnidad: readonly OpcionUnidad[] = opcionesMedidaFila(unidad, unidadCatalogo);
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
          />
        ) : (
          <select
            value={unidad}
            onChange={(e) => setUnidad(e.target.value)}
            className="px-2 py-1 bg-card rounded-lg border border-border text-sm font-mono text-foreground focus:outline-none cursor-pointer"
          >
            {UNIDADES_FICHA.map((u) => <option key={u}>{u}</option>)}
          </select>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Aceptar"
            onClick={() => onSave({ ...ins, cantidad, unidad })}
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
  onEdit,
  onChange,
  onRemove,
  contenedorClassName,
  contenedorRef,
  stickyHeader,
  erroresPorFila,
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
  onEdit: (idx: number | null) => void;
  onChange: (idx: number, patch: Partial<RInsumo>) => void;
  onRemove: (idx: number) => void;
  /** Clase extra del contenedor (p. ej. para el scroll interno del modal de
      Insumos). Por defecto solo hay scroll horizontal. */
  contenedorClassName?: string;
  /** Ref al contenedor con scroll (para bajar al último insumo agregado). */
  contenedorRef?: Ref<HTMLDivElement>;
  /** Encabezado sticky cuando el contenedor tiene scroll vertical. */
  stickyHeader?: boolean;
  /** Mensaje de validación por FILA (índice de `insumos`), en rojo debajo de
      la propia fila, con su cantidad también en rojo. Solo lo llena el modal
      de Crear Producto Insumo (modo "insumo"): las fichas de Productos del
      menú pasan sin esto y se ven exactamente igual que siempre. */
  erroresPorFila?: Record<number, string>;
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
          {insumos.map((ins, idx) => {
            const errorFila = erroresPorFila?.[idx];
            return (
            <Fragment key={`${ins.nombre}-${idx}`}>
            <tr className="bg-muted/40">
              {editable && editandoIdx === idx ? (
                <InsumoFilaEditable
                  key={idx}
                  ins={ins}
                  usarUnidadSelect={usarUnidadSelect}
                  /* A5.2: unidad del insumo del catálogo (por id real o, en
                     fichas viejas, por nombre normalizado) para filtrar las
                     medidas compatibles de la fila. */
                  unidadCatalogo={
                    insumosCatalogo
                      ? (insumosCatalogo.find((i) => i.id === ins.insumoId)?.unidadMedida ??
                        resolverInsumo(insumosCatalogo, ins.nombre)?.unidadMedida)
                      : undefined
                  }
                  onSave={(r) => {
                    onChange(idx, r);
                    onEdit(null);
                  }}
                  onCancel={() => onEdit(null)}
                />
              ) : (
                <>
                  <td className="px-3 py-2 text-sm font-medium text-foreground">{ins.nombre}</td>
                  <td className={`px-3 py-2 text-sm font-mono ${errorFila ? "text-red-600 dark:text-red-400 font-semibold" : "text-muted-foreground"}`}>{ins.cantidad}</td>
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
            {/* Mensaje de validación de ESTA fila (p. ej. el insumo no alcanza
                para la "Cantidad a hacer"): el `divide-y` de arriba queda entre
                la fila y su mensaje, como una continuación en rojo. */}
            {errorFila && (
              <tr>
                <td colSpan={editable ? 4 : 3} className="px-3 pb-2 text-xs font-semibold text-red-600 dark:text-red-400 leading-tight">
                  {errorFila}
                </td>
              </tr>
            )}
            </Fragment>
          );})}
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
  /** Unidad de medida del Producto Insumo ("kg", "lt", …). SOLO modo insumo:
      se muestra junto a "Cantidad a hacer" (la cantidad a hacer se expresa
      en esta unidad). Ausente = solo el número, como antes. */
  unidadCantidad?: string;
  /** Mensajes de validación en tiempo real (SOLO modo insumo). El padre
      decide cuándo mostrarlos (al tocar el campo o al intentar guardar);
      aquí solo se pintan con el estilo de error del sistema. */
  errorTiempo?: string;
  errorCantidad?: string;
  errorInsumos?: string;
  /** Mensaje de validación por FILA de "Insumos a usar" (índice de
      `ficha.insumos`), en rojo debajo de esa fila. SOLO modo insumo: el
      modal de Crear Producto Insumo avisa así cuando un insumo no alcanza
      en stock para la "Cantidad a hacer". En modo "producto" se ignora, así
      las fichas de los productos del menú se ven igual que siempre. */
  erroresInsumosFila?: Record<number, string>;
  /** Campo extra que el padre quiere ENTRE "Cantidad a hacer" e "Insumos a
      usar" (SOLO modo insumo): el modal de Compras > Insumos mete ahí el
      selector "Unidad de medida *" del Producto Insumo. */
  campoAdicional?: ReactNode;
}

export function FichaTecnicaEditor({
  ficha,
  onChange,
  insumos,
  modo,
  inputCls = FICHA_INPUT_CLS,
  tamanoFijo,
  unidadCantidad,
  errorTiempo,
  errorCantidad,
  errorInsumos,
  erroresInsumosFila,
  campoAdicional,
}: FichaTecnicaEditorProps) {
  const esInsumo = modo === "insumo";
  const filaInputCls = esInsumo ? `${inputCls} h-12` : inputCls;
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
  // Fila de la tabla de insumos abierta en edición (solo una a la vez).
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null);
  const [paso, setPaso] = useState("");

  // Un Producto Insumo solo se prepara con insumos crudos ACTIVOS (nunca con
  // otro Producto Insumo); un Producto del menú puede usar los dos.
  const catalogo = esInsumo
    ? insumos.filter((i) => i.tipo !== "ProductoInsumo" && i.estado === "activo")
    : insumos;

  // Filas de "Porciones por tamaño". Con `tamanoFijo` (la categoría del
  // producto manda los tamaños) se muestran EXACTAMENTE esas etiquetas: las
  // que el borrador trae conservan sus porciones y las que falten se
  // completan con 1 (los valores por defecto los precarga el padre al elegir
  // la categoría). Sin `tamanoFijo` sigue el modo libre de antes (fallback
  // para datos viejos).
  const filas: PorcionesTamano[] = tamanoFijo
    ? tamanoFijo.map((t) => ficha.porcionesPorTamano?.find((f) => f.tamano === t) ?? { tamano: t, porciones: 1 })
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
    setUnidad(
      esInsumo
        ? ins.unidadMedida
        : UNIDADES_FICHA.includes(ins.unidadMedida)
          ? ins.unidadMedida
          : UNIDADES_FICHA[0],
    );
  };

  // Solo se agrega un insumo que exista en el catálogo: o se seleccionó del
  // buscador, o el texto escrito coincide exactamente con un insumo real.
  const addInsumo = () => {
    const ins = sel ?? resolverInsumo(catalogo, nombre);
    if (!ins) {
      toast.error("Selecciona un insumo del catálogo de Insumos");
      return;
    }
    if (
      ficha.insumos.some(
        (i) => i.nombre === ins.nombre || (i.insumoId && i.insumoId === ins.id),
      )
    ) {
      toast.error("Este insumo ya está en la ficha; edítalo en la tabla");
      return;
    }
    onChange({
      ...ficha,
      insumos: [
        ...ficha.insumos,
        // A5.2: en modo insumo la fila debe quedar en una unidad
        // COMPATIBLE con la del catálogo (el resto del sistema solo convierte
        // kg↔g y lt↔ml); si se escribió otro insumo distinto al seleccionado
        // y la medida ya no corresponde, vuelve a la unidad del insumo.
        {
          insumoId: ins.id,
          nombre: ins.nombre,
          cantidad,
          unidad: esInsumo && !unidadesCompatibles(unidad, ins.unidadMedida) ? ins.unidadMedida : unidad,
        },
      ],
    });
    setNombre("");
    setCantidad(1);
    setSel(null);
  };
  const updateInsumo = (idx: number, patch: Partial<RInsumo>) =>
    onChange({
      ...ficha,
      insumos: ficha.insumos.map((ins, j) => (j === idx ? { ...ins, ...patch } : ins)),
    });
  const removeInsumo = (idx: number) =>
    onChange({ ...ficha, insumos: ficha.insumos.filter((_, j) => j !== idx) });

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
          Tiempo, Cantidad a hacer y Unidad de medida comparten una sola fila. */}
      <div
        className={`shrink-0 grid ${
          esInsumo
            ? "grid-cols-1 sm:grid-cols-3 items-end gap-4"
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
          <input type="number" min={0}
            value={ficha.tiempoPreparacion === 0 ? "" : ficha.tiempoPreparacion}
            placeholder="0"
            onChange={e => onChange({ ...ficha, tiempoPreparacion: numeroDeInput(limpiarNumeroInput(e.target.value)) })}
            className={esInsumo ? filaInputCls : inputCls} />
          {esInsumo && errorTiempo && (
            <p className="text-xs text-red-500 dark:text-red-400 leading-tight">{errorTiempo}</p>
          )}
        </div>
        {esInsumo ? (
          <div className="flex min-w-0 flex-col gap-2">
            <label className="flex min-h-[2.5rem] items-end text-xs font-semibold text-muted-foreground">
              Cantidad a hacer{unidadCantidad ? ` (${unidadCantidad})` : ""} *
            </label>
            {/* Vacío = cantidad sin escribir (punto B1): al consumirlo los
                demás módulos usan `rendimientoDe`, que cae en 1 si es 0. */}
            <input type="number" min={0.1} step={0.1}
              value={ficha.rendimiento && ficha.rendimiento > 0 ? rendimientoDe(ficha) : ""}
              placeholder="0"
              aria-label="Cantidad a hacer"
              onChange={e => onChange({ ...ficha, rendimiento: numeroDeInput(limpiarNumeroInput(e.target.value)) })}
              className={filaInputCls} />
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
                      onChange={e => updatePorcionesTamano(idx, Number(e.target.value))}
                      className="w-12 shrink-0 bg-transparent text-right text-sm font-bold text-foreground focus:outline-none" />
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
                      <button type="button" title="Quitar tamaño" onClick={() => removeTamano(idx)}
                        disabled={filas.length === 1}
                        className="w-6 shrink-0 p-1 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
        {esInsumo && campoAdicional}
      </div>

      {/* Insumos */}
      <div className={esInsumo ? "flex min-h-0 flex-col lg:flex-1" : ""}>
        <label className="shrink-0 block text-xs font-semibold text-muted-foreground mb-2">
          {esInsumo ? "Insumos a usar *" : "Insumos"}
        </label>
        {ficha.insumos.length > 0 ? (
          <div className={esInsumo ? "mb-3 flex min-h-0 flex-col lg:flex-1" : "mb-3"}>
            {/* SOLO en modo insumo la tabla tiene scroll interno: en el modal
                de Compras > Insumos es el único scroll permitido. */}
            <InsumosFichaTable
              insumos={ficha.insumos}
              editable={true}
              editandoIdx={editandoIdx}
              usarUnidadSelect={esInsumo}
              onEdit={setEditandoIdx}
              onChange={updateInsumo}
              onRemove={removeInsumo}
              contenedorClassName={
                esInsumo
                  ? "no-scrollbar max-h-60 overflow-y-auto lg:max-h-none lg:flex-1 lg:min-h-0"
                  : undefined
              }
              contenedorRef={esInsumo ? insumosScrollRef : undefined}
              stickyHeader={esInsumo}
              /* En modo insumo cada fila conoce la unidad de su insumo del
                 catálogo (A5.2); en modo producto se ignora. */
              insumosCatalogo={esInsumo ? insumos : undefined}
              /* Los mensajes por fila son exclusivos del modo insumo (el
                 modal de Crear Producto Insumo valida contra stock). */
              erroresPorFila={esInsumo ? erroresInsumosFila : undefined}
            />
          </div>
        ) : esInsumo ? (
          <div className="mb-3 flex min-h-[6rem] items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-3 text-xs italic text-muted-foreground lg:flex-1">
            Sin insumos agregados
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic mb-3">Sin insumos agregados</p>
        )}
        {esInsumo && errorInsumos && (
          <p className="shrink-0 text-xs text-red-500 dark:text-red-400 mt-1 mb-2 leading-tight">{errorInsumos}</p>
        )}
        <div className="flex flex-wrap items-end gap-2 shrink-0">
          <InsumoSearchField
            insumos={catalogo}
            valor={nombre}
            onValorChange={v => { setNombre(v); setSel(null); }}
            onSelect={seleccionarInsumo}
          />
          <div className="w-20">
            <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Cantidad</label>
            {/* Arranca en 1 (regla del alta de insumos) y borra a vacío sin
                volver a 0 (punto B1). */}
            <input type="number" min={0.1} step={0.1}
              value={cantidad === 0 ? "" : cantidad}
              placeholder="0"
              onChange={e => setCantidad(numeroDeInput(limpiarNumeroInput(e.target.value)))}
              className="w-full px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="w-24">
            <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Medida</label>
            {/* SOLO modo insumo: mismo UnidadSelect redondeado que "Unidad de
                medida", pero con la lista compartida UNIDADES_INSUMO y, una
                vez elegido el insumo, reducida a las unidades compatibles
                con la suya (A5.2). En modo producto el select nativo queda
                exactamente igual que antes. */}
            {esInsumo ? (
              <UnidadSelect
                value={unidad}
                onChange={setUnidad}
                unidades={
                  sel ? opcionesMedidaFila(unidad, sel.unidadMedida) : UNIDADES_INSUMO
                }
                ariaLabel="Medida"
              />
            ) : (
              <select value={unidad} onChange={e => setUnidad(e.target.value)}
                className="w-full px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none cursor-pointer">
                {UNIDADES_FICHA.map(u => <option key={u}>{u}</option>)}
              </select>
            )}
          </div>
          <button onClick={addInsumo} title="Agregar insumo"
            className="px-3 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
            <Plus className="w-4 h-4" />
          </button>
        </div>
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
                  <button onClick={() => moverPaso(idx, -1)} disabled={idx === 0} title="Subir paso"
                    className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moverPaso(idx, 1)} disabled={idx === ficha.pasos.length - 1} title="Bajar paso"
                    className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button onClick={() => removePaso(idx)} title="Eliminar paso"
                  className="p-1 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 cursor-pointer transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
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
            {modo === "insumo" ? "Cantidad a hacer" : "Porciones por tamaño"}
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
