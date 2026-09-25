import React from "react";
import { Plus, Search } from "lucide-react";

const SERIF = "'DM Serif Display', serif";

export const UNIDADES = ["kg", "g", "lt", "ml", "und", "paq", "caja", "bolsa"];

const compactInputCls =
  "w-full px-2.5 py-2 bg-muted border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
const readOnlyInputCls =
  "w-full px-2.5 py-2 bg-muted/40 border border-border rounded-lg text-xs text-muted-foreground cursor-default";

export interface InsumoSuggestion {
  id: string;
  nombre: string;
  unidadMedida: string;
  precioUnitario: number;
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
  onAgregar: () => void;
  suggestions: InsumoSuggestion[];
  showSuggestions: boolean;
  onSelectSuggestion: (suggestion: InsumoSuggestion) => void;
  containerRef?: React.Ref<HTMLDivElement>;
  readOnly?: boolean;
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
  onAgregar,
  suggestions,
  showSuggestions,
  onSelectSuggestion,
  containerRef,
  readOnly = false,
  placeholder = "Buscar insumo...",
  buttonLabel = "Agregar",
}: CompactInsumoFormProps) {
  return (
    <div
      ref={containerRef}
      className="p-4 bg-muted/40 border border-border rounded-xl"
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
              onFocus={readOnly ? undefined : onNombreFocus}
              placeholder={readOnly ? "Solo lectura" : placeholder}
              readOnly={readOnly}
              className={`${readOnly ? readOnlyInputCls : compactInputCls} pl-8`}
            />
          </div>

          {!readOnly && showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden">
              {suggestions.map((ins) => (
                <button
                  key={ins.id}
                  type="button"
                  onMouseDown={() => onSelectSuggestion(ins)}
                  className="w-full text-left px-3 py-2.5 text-xs hover:bg-muted cursor-pointer border-b border-border last:border-0"
                >
                  <p className="font-semibold text-foreground">{ins.nombre}</p>
                  <p className="text-muted-foreground">
                    {ins.unidadMedida} · {fmtCompactCOP(ins.precioUnitario)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cantidad */}
        <div className="w-[72px]">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Cantidad
          </label>

          <input
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => onCantidadChange(Number(e.target.value))}
            disabled={readOnly}
            className={readOnly ? readOnlyInputCls : compactInputCls}
          />
        </div>

        {/* Medida */}
        <div className="w-[78px]">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Medida
          </label>

          <select
            value={unidad}
            onChange={(e) => onUnidadChange(e.target.value)}
            disabled={readOnly || unidadDisabled}
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
            Precio unitario
          </label>

          <input
            type="number"
            min={0}
            value={precio || ""}
            onChange={(e) => onPrecioChange(Number(e.target.value))}
            placeholder="0"
            disabled={readOnly}
            className={readOnly ? readOnlyInputCls : compactInputCls}
          />
        </div>

        <button
          type="button"
          onClick={onAgregar}
          disabled={readOnly}
          className={`inline-flex h-[36px] items-center justify-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-lg transition-colors ${readOnly ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-red-700"}`}
        >
          <Plus className="w-3.5 h-3.5" />
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
