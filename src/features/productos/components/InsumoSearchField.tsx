import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { Insumo } from "@/features/insumos/pages/GestionInsumosScreen";

// Rango de marcas diacríticas combinantes (U+0300–U+036F) que NFD separa de la
// letra base. Se escribe con escapes para que no dependa de caracteres literales.
const DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

// Compara sin distinguir mayúsculas ni tildes, para que "pimenton"
// encuentre "Pimentón" y "SALSA" encuentre "Salsa de Tomate".
const normalizar = (s: string) => s.normalize("NFD").replace(DIACRITICOS, "").toLowerCase().trim();

// Búsqueda del catálogo de insumos (módulo Compras > Insumos).
// Función pura y exportada para poder verificar la regla "solo insumos reales".
export function filtrarInsumos(insumos: Insumo[], texto: string, limite = 8): Insumo[] {
  const q = normalizar(texto);
  const base = q
    ? insumos.filter((i) => normalizar(i.nombre).includes(q))
    : insumos;
  return base.slice(0, limite);
}

// Resuelve el texto escrito a un insumo REAL del catálogo: coincidencia exacta.
// Es lo que impide agregar un nombre que no exista en Insumos.
export function resolverInsumo(insumos: Insumo[], texto: string): Insumo | null {
  const n = normalizar(texto);
  if (!n) return null;
  return insumos.find((i) => normalizar(i.nombre) === n) ?? null;
}

// Estilo de los inputs de Ficha Técnica (rounded-xl / text-sm), que es el
// lenguaje visual del formulario donde se inserta este buscador.
const inputCls =
  "w-full px-3 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export interface InsumoSearchFieldProps {
  insumos: Insumo[];
  /** Texto visible en el campo (lo que el usuario lleva escrito). */
  valor: string;
  onValorChange: (valor: string) => void;
  /** Se dispara al elegir un insumo del dropdown. */
  onSelect: (insumo: Insumo) => void;
  label?: string;
  placeholder?: string;
  direction?: "up" | "down";
  excluirIds?: readonly string[];
  maxResultados?: number;
  mensajeSinResultados?: string;
  dataField?: string;
}

/**
 * Combobox buscador de insumos para la Ficha Técnica del producto.
 * Mismo comportamiento visual que CompactInsumoForm (Compras): label arriba,
 * ícono de lupa a la izquierda y lista de coincidencias debajo. Solo permite
 * elegir insumos que ya existen en el catálogo de Insumos.
 */
export function InsumoSearchField({
  insumos,
  valor,
  onValorChange,
  onSelect,
  label = "Nombre",
  placeholder = "Buscar insumo...",
  direction = "up",
  excluirIds = [],
  maxResultados = 8,
  mensajeSinResultados = "Sin resultados",
  dataField,
}: InsumoSearchFieldProps) {
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const excluidos = new Set(excluirIds);
  const sugerencias = filtrarInsumos(
    insumos.filter((insumo) => !excluidos.has(insumo.id)),
    valor,
    maxResultados,
  );

  // Cierra el dropdown al hacer clic fuera del campo.
  useEffect(() => {
    if (!abierto) return;
    const onClickFuera = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, [abierto]);

  const elegir = (insumo: Insumo) => {
    onSelect(insumo);
    setAbierto(false);
    setIndiceActivo(-1);
  };

  return (
    <div ref={contenedorRef} className="relative flex-[2] min-w-[180px]">
      <label className="block text-xs font-semibold text-muted-foreground mb-1">
        {label}
      </label>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />

        <input
          role="combobox"
          aria-label={label}
          aria-expanded={abierto}
          aria-controls="insumo-resultados"
          aria-activedescendant={
            abierto && indiceActivo >= 0 && sugerencias[indiceActivo]
              ? `insumo-sugerencia-${sugerencias[indiceActivo].id}`
              : undefined
          }
          data-producto-insumo-campo={dataField}
          value={valor}
          onChange={(e) => {
            onValorChange(e.target.value);
            setAbierto(true);
            setIndiceActivo(-1);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && sugerencias.length > 0) {
              e.preventDefault();
              setAbierto(true);
              setIndiceActivo((actual) => (actual + 1) % sugerencias.length);
            } else if (e.key === "ArrowUp" && sugerencias.length > 0) {
              e.preventDefault();
              setAbierto(true);
              setIndiceActivo((actual) => (actual <= 0 ? sugerencias.length - 1 : actual - 1));
            } else if (e.key === "Enter" && abierto && indiceActivo >= 0 && sugerencias[indiceActivo]) {
              e.preventDefault();
              elegir(sugerencias[indiceActivo]);
            } else if (e.key === "Escape") {
              setAbierto(false);
              setIndiceActivo(-1);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={`${inputCls} pl-8`}
        />
      </div>

      {abierto && (
        <div
          id="insumo-resultados"
          className={`absolute left-0 w-full max-h-60 overflow-y-auto overscroll-contain no-scrollbar bg-card border border-border rounded-xl shadow-xl z-[70] ${
            direction === "down" ? "top-full mt-2" : "bottom-full mb-2"
          }`}
          role="listbox"
          onWheel={(e) => e.stopPropagation()}
        >
          {sugerencias.length > 0 ? (
            sugerencias.map((ins, index) => (
              <button
                key={ins.id}
                id={`insumo-sugerencia-${ins.id}`}
                type="button"
                role="option"
                aria-selected={index === indiceActivo}
                onMouseEnter={() => setIndiceActivo(index)}
                // onMouseDown corre antes que el blur del input: evita que la
                // lista se cierre antes de registrar la selección.
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(ins);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted cursor-pointer border-b border-border last:border-0 ${
                  index === indiceActivo ? "bg-muted" : ""
                }`}
              >
                <span className="font-semibold text-foreground">{ins.nombre}</span>
                <span className="text-muted-foreground"> · {ins.unidadMedida}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm italic text-muted-foreground">
              {mensajeSinResultados}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
