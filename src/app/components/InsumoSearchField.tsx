import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { Insumo } from "../screens/GestionInsumosScreen";

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
  placeholder?: string;
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
  placeholder = "Buscar insumo...",
}: InsumoSearchFieldProps) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const sugerencias = filtrarInsumos(insumos, valor);

  // Cierra el dropdown al hacer clic fuera del campo.
  useEffect(() => {
    if (!abierto) return;
    const onClickFuera = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, [abierto]);

  const mostrar = abierto && sugerencias.length > 0;

  return (
    <div ref={contenedorRef} className="relative flex-[2] min-w-[180px]">
      <label className="block text-xs font-semibold text-muted-foreground mb-1">
        Nombre
      </label>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />

        <input
          value={valor}
          onChange={(e) => {
            onValorChange(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          placeholder={placeholder}
          autoComplete="off"
          className={`${inputCls} pl-8`}
        />
      </div>

      {mostrar && (
        <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden">
          {sugerencias.map((ins) => (
            <button
              key={ins.id}
              type="button"
              // onMouseDown corre antes que el blur del input: evita que la
              // lista se cierre antes de registrar la selección.
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(ins);
                setAbierto(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted cursor-pointer border-b border-border last:border-0"
            >
              <span className="font-semibold text-foreground">{ins.nombre}</span>
              <span className="text-muted-foreground"> · {ins.unidadMedida}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
