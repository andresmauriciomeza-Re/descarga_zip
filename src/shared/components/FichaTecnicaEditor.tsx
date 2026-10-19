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
import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Edit2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Insumo } from "@/features/insumos/pages/GestionInsumosScreen";
import { InsumoSearchField, resolverInsumo } from "@/features/productos/components/InsumoSearchField";
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
}

export function FichaTecnicaEditor({
  ficha,
  onChange,
  insumos,
  modo,
  inputCls = FICHA_INPUT_CLS,
  tamanoFijo,
}: FichaTecnicaEditorProps) {
  const esInsumo = modo === "insumo";

  // Búsqueda y alta de insumos (una sola fila a la vez).
  const [sel, setSel] = useState<Insumo | null>(null);
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [unidad, setUnidad] = useState(UNIDADES_FICHA[0]);
  // Fila de la tabla de insumos abierta en edición (solo una a la vez).
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null);
  const [paso, setPaso] = useState("");

  // Un Producto Insumo solo se prepara con insumos crudos (nunca con otro
  // Producto Insumo); un Producto del menú puede usar los dos.
  const catalogo = esInsumo ? insumos.filter((i) => i.tipo !== "ProductoInsumo") : insumos;

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
  // catálogo; sigue siendo editable a mano después.
  const seleccionarInsumo = (ins: Insumo) => {
    setSel(ins);
    setNombre(ins.nombre);
    setUnidad(UNIDADES_FICHA.includes(ins.unidadMedida) ? ins.unidadMedida : UNIDADES_FICHA[0]);
  };

  // Solo se agrega un insumo que exista en el catálogo: o se seleccionó del
  // buscador, o el texto escrito coincide exactamente con un insumo real.
  const addInsumo = () => {
    const ins = sel ?? resolverInsumo(catalogo, nombre);
    if (!ins) {
      toast.error("Selecciona un insumo del catálogo de Insumos");
      return;
    }
    if (ficha.insumos.some((i) => i.nombre === ins.nombre)) {
      toast.error("Este insumo ya está en la ficha; edítalo en la tabla");
      return;
    }
    onChange({
      ...ficha,
      insumos: [
        ...ficha.insumos,
        { insumoId: ins.id, nombre: ins.nombre, cantidad, unidad },
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
    <div className="space-y-4">
      {/* En producto la rejilla "Tiempo | Porciones" es 1 : 1.4 (la columna de
          porciones es más ancha: lleva las cajitas lado a lado); en insumo
          ("Tiempo | Rendimiento") se mantiene 50/50. */}
      <div className={`grid gap-3 ${esInsumo ? "grid-cols-2" : "grid-cols-[1fr_1.4fr]"}`}>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Tiempo de preparación (min)</label>
          {/* Como todos los numéricos del sistema (punto B1): el 0 se muestra
              vacío con placeholder "0", en producto y en insumo. */}
          <input type="number" min={0}
            value={ficha.tiempoPreparacion === 0 ? "" : ficha.tiempoPreparacion}
            placeholder="0"
            onChange={e => onChange({ ...ficha, tiempoPreparacion: numeroDeInput(limpiarNumeroInput(e.target.value)) })}
            className={inputCls} />
        </div>
        {esInsumo ? (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-0.5">Rendimiento (unidades por preparación)</label>
            {/* Vacío = rendimiento sin escribir (punto B1): al consumirlo los
                demás módulos usan `rendimientoDe`, que cae en 1 si es 0. */}
            <input type="number" min={0.1} step={0.1}
              value={ficha.rendimiento && ficha.rendimiento > 0 ? rendimientoDe(ficha) : ""}
              placeholder="0"
              aria-label="Rendimiento"
              onChange={e => onChange({ ...ficha, rendimiento: numeroDeInput(limpiarNumeroInput(e.target.value)) })}
              className={inputCls} />
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
      </div>

      {/* Insumos */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">Insumos</label>
        {ficha.insumos.length > 0 && (
          <div className="mb-3">
            <InsumosFichaTable
              insumos={ficha.insumos}
              editable={true}
              editandoIdx={editandoIdx}
              onEdit={setEditandoIdx}
              onChange={updateInsumo}
              onRemove={removeInsumo}
            />
          </div>
        )}
        {ficha.insumos.length === 0 && (
          <p className="text-xs text-muted-foreground italic mb-3">Sin insumos agregados</p>
        )}
        <div className="flex flex-wrap items-end gap-2">
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
            <select value={unidad} onChange={e => setUnidad(e.target.value)}
              className="w-full px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none cursor-pointer">
              {UNIDADES_FICHA.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <button onClick={addInsumo} title="Agregar insumo"
            className="px-3 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pasos de elaboración */}
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
}: {
  v: FichaVersion;
  readCls: string;
  modo?: "producto" | "insumo";
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
            {modo === "insumo" ? "Rendimiento (unidades)" : "Porciones por tamaño"}
          </p>
          {modo === "insumo" ? (
            <div className={readCls}>{rendimientoDe(v)}</div>
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
