import React from "react";
import { Plus, Search, Minus } from "lucide-react";

const SERIF = "var(--font-titulo)";

export const UNIDADES = ["kg", "g", "lt", "ml", "und", "paq", "caja", "bolsa"];

const compactInputCls =
  "w-full px-2.5 py-2 bg-muted border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
const readOnlyInputCls =
  "w-full px-2.5 py-2 bg-muted/40 border border-border rounded-lg text-xs text-muted-foreground cursor-default";

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
  placeholder = "Buscar insumo...",
  buttonLabel = "Agregar",
}: CompactInsumoFormProps) {
  /** `readOnly` y `disabled` bloquean los controles; el primero es solo lectura
      visual, el segundo deshabilita por completo (p. ej. falta elegir el IVA). */
  const bloqueado = readOnly || disabled;

  return (
    <div
      ref={containerRef}
      className={`p-4 bg-muted/40 border border-border rounded-xl transition-opacity ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: SERIF }}>
        {titulo}
      </h3>

      <div className="flex flex-wrap items-end gap-2">
        {/* Nombre */}
        <div className="relative flex-[2] min-w-[180px]">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Nombre
          </label>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />

            <input
              value={nombre}
              onChange={(e) => onNombreChange(e.target.value)}
              onFocus={bloqueado ? undefined : onNombreFocus}
              placeholder={readOnly ? "Solo lectura" : placeholder}
              readOnly={readOnly}
              disabled={disabled}
              className={`${readOnly ? readOnlyInputCls : compactInputCls} pl-8`}
            />
          </div>

          {!readOnly && !disabled && showSuggestions && (
            <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              {/* Punto 5: "+ Crear insumo" es SIEMPRE la primera opción, estén o no
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
        <div className="w-[108px]">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Cantidad
          </label>

          <div className="flex items-stretch">
            <button
              type="button"
              onClick={() => onCantidadChange(Math.max(1, cantidad - 1))}
              disabled={bloqueado}
              className="flex items-center justify-center w-8 bg-muted border border-border rounded-l-lg text-muted-foreground hover:bg-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => onCantidadChange(Math.max(1, Number(e.target.value)))}
              disabled={bloqueado}
              className="w-full min-w-0 px-1 py-2 bg-muted border-y border-border text-xs text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => onCantidadChange(cantidad + 1)}
              disabled={bloqueado}
              className="flex items-center justify-center w-8 bg-muted border border-border rounded-r-lg text-muted-foreground hover:bg-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Medida */}
        <div className="w-[78px]">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Medida
          </label>

          <select
            value={unidad}
            onChange={(e) => onUnidadChange(e.target.value)}
            disabled={bloqueado || unidadDisabled}
            className={readOnly ? readOnlyInputCls : `${compactInputCls} cursor-pointer`}
          >
            {UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {/* Precio */}
        <div className="w-[112px]">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Monto unitario
          </label>

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
        <div className="w-[72px]">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            IVA (%)
          </label>

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
          className={`inline-flex h-[36px] items-center justify-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-lg transition-colors ${bloqueado ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-red-700"}`}
        >
          <Plus className="w-3.5 h-3.5" />
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
