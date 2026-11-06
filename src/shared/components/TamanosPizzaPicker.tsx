import { useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { limpiarNumeroInput, numeroDeInput } from "@/shared/utils/numeroInput";

export type TamanoPizza = "Mediana" | "Grande";

const PORCIONES: Record<TamanoPizza, number> = { Mediana: 8, Grande: 6 };
const TAMANOS: TamanoPizza[] = ["Mediana", "Grande"];

export const porcionesDeTamano = (tamano: TamanoPizza, pizzas: number): number =>
  pizzas * PORCIONES[tamano];

const CAMPO_CLS =
  "h-11 w-full min-w-0 px-3 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Tamaños a preparar de una pizza (mismo estilo que agregar insumo a la
    ficha técnica). Guarda una cantidad por tamaño; sumar a un tamaño ya
    agregado incrementa su fila. */
export function TamanosPizzaPicker({
  mediana,
  grande,
  onChange,
}: {
  mediana: number;
  grande: number;
  onChange: (mediana: number, grande: number) => void;
}) {
  const [tamano, setTamano] = useState<TamanoPizza>("Mediana");
  const [cantidad, setCantidad] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<TamanoPizza | null>(null);
  const [valorEdicion, setValorEdicion] = useState(0);

  const cantidades: Record<TamanoPizza, number> = { Mediana: mediana, Grande: grande };
  const filas = TAMANOS.filter((t) => cantidades[t] > 0);
  const totalPorciones = filas.reduce((s, t) => s + porcionesDeTamano(t, cantidades[t]), 0);

  const aplicar = (t: TamanoPizza, nueva: number) =>
    onChange(t === "Mediana" ? nueva : mediana, t === "Grande" ? nueva : grande);

  const agregar = () => {
    if (!cantidad || cantidad <= 0) {
      setError("Ingresa una cantidad mayor a 0");
      return;
    }
    if (!Number.isSafeInteger(cantidad)) {
      setError("La cantidad de pizzas debe ser un entero");
      return;
    }
    aplicar(tamano, cantidades[tamano] + cantidad);
    setCantidad(0);
    setError(null);
  };

  const guardarEdicion = () => {
    if (editando && Number.isSafeInteger(valorEdicion) && valorEdicion > 0) {
      aplicar(editando, valorEdicion);
    }
    setEditando(null);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1fr_auto] items-start gap-3">
        <div className="min-w-0">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Tamaño de pizza</label>
          <select
            value={tamano}
            onChange={(e) => setTamano(e.target.value as TamanoPizza)}
            className={`${CAMPO_CLS} cursor-pointer`}
          >
            <option value="Mediana">Mediana (8 porciones)</option>
            <option value="Grande">Grande (6 porciones)</option>
          </select>
        </div>
        <div className="min-w-0">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">
            Cantidad a producir (pizzas)
          </label>
          <input
            type="number"
            min={1}
            step={1}
            value={cantidad === 0 ? "" : cantidad}
            placeholder="0"
            onChange={(e) => {
              setCantidad(numeroDeInput(limpiarNumeroInput(e.target.value)));
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregar();
              }
            }}
            className={CAMPO_CLS}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            = {porcionesDeTamano(tamano, cantidad || 0)} porciones
          </p>
          {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400 leading-tight">{error}</p>}
        </div>
        <button
          type="button"
          onClick={agregar}
          title="Agregar tamaño"
          className="mt-6 h-11 w-11 shrink-0 inline-flex items-center justify-center bg-primary text-white rounded-full text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Tamaños a preparar</p>
        {filas.length === 0 ? (
          <div className="flex min-h-16 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-3 text-xs italic text-muted-foreground">
            Sin tamaños agregados
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border">
            {filas.map((t) => {
              const pizzas = cantidades[t];
              return (
                <div key={t} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  {editando === t ? (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{t}</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        autoFocus
                        value={valorEdicion === 0 ? "" : valorEdicion}
                        aria-label={`Pizzas ${t}`}
                        onChange={(e) => setValorEdicion(numeroDeInput(limpiarNumeroInput(e.target.value)))}
                        onBlur={guardarEdicion}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") guardarEdicion();
                          if (e.key === "Escape") setEditando(null);
                        }}
                        className="h-9 w-24 px-2 bg-card rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <span className="text-muted-foreground">pizzas</span>
                    </div>
                  ) : (
                    <p className="text-foreground">
                      <span className="font-semibold">{t}</span>
                      {" · "}{pizzas} {pizzas === 1 ? "pizza" : "pizzas"}
                      {" · "}{porcionesDeTamano(t, pizzas)} porciones
                    </p>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Cambiar cantidad"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setEditando(t);
                        setValorEdicion(pizzas);
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Quitar tamaño"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (editando === t) setEditando(null);
                        aplicar(t, 0);
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            <p className="px-3 py-2 text-sm font-bold text-foreground">Total: {totalPorciones} porciones</p>
          </div>
        )}
      </div>
    </div>
  );
}
