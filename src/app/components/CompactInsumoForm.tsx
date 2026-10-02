import React from "react";
import { Plus, Search, Minus } from "lucide-react";
import { UnidadSelect } from "./UnidadSelect";

const SERIF = "var(--font-titulo)";

export const UNIDADES = ["kg", "g", "lt", "ml", "und", "paq", "caja", "bolsa"];

/** Labels de las guías: 13px en gris oscuro (los títulos de sección van en
 *  `seccionCls` de cada formulario). */
const labelCls = "block text-[13px] font-medium text-foreground/70 mb-1.5";

/** Mismo estilo que los inputs del formulario pero con 40px EXACTOS de alto:
 *  `px-3 py-2.5` con border da 42px, así que aquí se fija `h-10` (todos los
 *  controles de la fila miden lo mismo, incluido el botón). */
const compactInputCls =
  "w-full h-10 px-3 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const readOnlyInputCls =
  "w-full h-10 px-3 bg-muted/40 border border-border rounded-xl text-sm text-muted-foreground cursor-default";

/** Select de Medida a la misma altura (40px) que el resto de la fila. */
const unidadCampoCls = "bg-muted border border-border text-foreground h-10";

export interface InsumoSuggestion {
  id: string;
  nombre: string;
  unidadMedida: string;
  costoUnitario: number;
}

function fmtCompactCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export interface CompactInsumoFormProps {
  titulo: string;
  nombre: string;
  onNombreChange: (value: string) => void;
  onNombreFocus: () => void;
  cantidad: number;
  onCantidadChange: (value: number) => void;
  unidad: string;
  onUnidadChange: (value: string) => void;
  unidadDisabled?: boolean;
  precio: number;
  onPrecioChange: (value: number) => void;
  iva: number;
  onIvaChange: (value: number) => void;
  onAgregar: () => void;
  suggestions: InsumoSuggestion[];
  showSuggestions: boolean;
  onSelectSuggestion: (suggestion: InsumoSuggestion) => void;
  onCrearInsumo?: () => void;
  containerRef?: React.Ref<HTMLDivElement>;
  readOnly?: boolean;
  /** Bloquea todo el bloque "Agregar insumo" (campos y botón). */
  disabled?: boolean;
  /** Pantalla completa: el mismo bloque con un poco menos de aire (p-3 y
   *  mb-2) para que el formulario entero quepa en 1366×768 sin scroll. */
  compacto?: boolean;
  placeholder?: string;
  buttonLabel?: string;
}

export function CompactInsumoForm({
  titulo,
  nombre,
  onNombreChange,
  onNombreFocus,
  cantidad,
  onCantidadChange,
  unidad,
  onUnidadChange,
  unidadDisabled = false,
  precio,
  onPrecioChange,
  iva,
  onIvaChange,
  onAgregar,
  suggestions,
  showSuggestions,
  onSelectSuggestion,
  onCrearInsumo,
  containerRef,
  readOnly = false,
  disabled = false,
  compacto = false,
  placeholder = "Buscar insumo...",
  buttonLabel = "Agregar",
}: CompactInsumoFormProps) {
  /** `readOnly` y `disabled` bloquean los controles; el primero es solo lectura
      visual, el segundo deshabilita por completo (p. ej. falta elegir el IVA). */
  const bloqueado = readOnly || disabled;

  return (
    <div
      ref={containerRef}
      className={`${compacto ? "p-1.5" : "p-4"} bg-muted/40 border border-border rounded-xl`}
    >
      <h3
        className={`text-sm font-bold text-foreground ${compacto ? "mb-0.5" : "mb-3"}`}
        style={{ fontFamily: SERIF }}
      >
        {titulo}
      </h3>

      {/* La fila va en UNA sola línea (si no, el botón salta a otra fila y la
          tarjeta crece): Nombre ~35% con `grow` y el resto con anchos fijos
          que también entran en el modal de Editar OC (max-w-4xl). */}
      <div className="relative">
        <div className={`flex flex-wrap items-end gap-4 ${disabled ? "opacity-50" : ""}`}>
          {/* Nombre */}
          <div className="relative basis-[26%] min-w-[180px] grow">
            <label className={labelCls}>Nombre</label>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />

              <input
                value={nombre}
                onChange={(e) => onNombreChange(e.target.value)}
                onFocus={bloqueado ? undefined : onNombreFocus}
                placeholder={readOnly ? "Solo lectura" : placeholder}
                readOnly={readOnly}
                disabled={disabled}
                className={`${readOnly ? readOnlyInputCls : compactInputCls} pl-9`}
              />
            </div>

            {!readOnly && !disabled && showSuggestions && (
              <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                {/* "+ Crear insumo" es SIEMPRE la primera opción, estén o no
                    resultados de búsqueda, y va separado del resto de la lista. */}
                <button
                  type="button"
                  onMouseDown={onCrearInsumo ? () => onCrearInsumo() : undefined}
                  className="w-full text-left px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary/10 cursor-pointer inline-flex items-center gap-2 border-b border-border"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Crear insumo {nombre.trim() && `“${nombre.trim()}”`}
                </button>
                {suggestions.map((ins) => (
                  <button
                    key={ins.id}
                    type="button"
                    onMouseDown={() => onSelectSuggestion(ins)}
                    className="w-full text-left px-3 py-2.5 text-xs hover:bg-muted cursor-pointer border-b border-border last:border-0"
                  >
                    <p className="font-semibold text-foreground">{ins.nombre}</p>
                    <p className="text-muted-foreground">
                      {ins.unidadMedida} · {fmtCompactCOP(ins.costoUnitario)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cantidad — stepper con botones +/- */}
          <div className="w-[112px]">
            <label className={labelCls}>Cantidad</label>

            <div className="flex items-stretch h-10">
              <button
                type="button"
                onClick={() => onCantidadChange(Math.max(1, cantidad - 1))}
                disabled={bloqueado}
                className="flex items-center justify-center w-9 bg-muted border border-border rounded-l-xl text-muted-foreground hover:bg-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => onCantidadChange(Math.max(1, Number(e.target.value)))}
                disabled={bloqueado}
                className="w-full min-w-0 px-1 bg-muted border-y border-border text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => onCantidadChange(cantidad + 1)}
                disabled={bloqueado}
                className="flex items-center justify-center w-9 bg-muted border border-border rounded-r-xl text-muted-foreground hover:bg-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Medida — select redondeado personalizado (Radix), NO nativo */}
          <div className="w-[96px]">
            <label className={labelCls}>Medida</label>

            <UnidadSelect
              value={unidad}
              onChange={onUnidadChange}
              disabled={bloqueado || unidadDisabled}
              ariaLabel="Medida"
              fieldClassName={
                readOnly
                  ? "bg-muted/40 border border-border text-foreground h-10"
                  : unidadCampoCls
              }
            />
          </div>

          {/* Precio */}
          <div className="w-[116px]">
            <label className={labelCls}>Monto unitario</label>

            <input
              type="number"
              min={0}
              value={precio || ""}
              onChange={(e) => onPrecioChange(Number(e.target.value))}
              placeholder="0"
              disabled={bloqueado}
              className={readOnly ? readOnlyInputCls : compactInputCls}
            />
          </div>

          {/* IVA */}
          <div className="w-[76px]">
            <label className={labelCls}>IVA %</label>

            <input
              type="number"
              min={0}
              max={100}
              value={iva}
              onChange={(e) => onIvaChange(Math.min(100, Math.max(0, Number(e.target.value))))}
              placeholder="0"
              disabled={bloqueado}
              className={readOnly ? readOnlyInputCls : compactInputCls}
            />
          </div>

          <button
            type="button"
            onClick={onAgregar}
            disabled={bloqueado}
            className={`ml-auto inline-flex h-10 items-center justify-center gap-1.5 px-4 bg-primary text-white text-sm font-semibold rounded-xl transition-colors ${bloqueado ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-red-700"}`}
          >
            <Plus className="w-4 h-4" />
            {buttonLabel}
          </button>
        </div>

        {/* Sin elegir el IVA: la fila queda al 50% y encima, en gris, avisa
            qué falta. El texto va FUERA de la capa con opacidad. */}
        {disabled && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <span className="px-3 py-2 rounded-xl bg-background/90 border border-border text-xs font-semibold text-muted-foreground shadow-sm">
              Primero indica si los montos de la factura incluyen IVA
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
