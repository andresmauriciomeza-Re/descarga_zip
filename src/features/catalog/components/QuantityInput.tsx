import { useState } from "react";
import { toast } from "sonner";

/** Campo de cantidad entre − y + (Bloque 5, punto 3): escribible con el
    teclado, mínimo 1; si se escribe más del máximo se ajusta solo y sale
    el mensaje. `max` undefined = sin límite. */
export function CantidadInput({
  value,
  max,
  mensajeMaximo,
  onChange,
}: {
  value: number;
  /** undefined = sin límite. */
  max: number | undefined;
  /** Texto que avisa si se escribe sobre el máximo. */
  mensajeMaximo: string;
  onChange: (nueva: number) => void;
}) {
  // Texto en edición: permite borrar al vacío sin pelearse con el valor
  // controlado; al salir del campo vuelve a mostrar la cantidad real.
  const [texto, setTexto] = useState<string | null>(null);
  const tope = Math.max(1, max ?? Infinity);
  return (
    <input
      type="number"
      min={1}
      value={texto ?? String(value)}
      aria-label="Cantidad"
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw.trim() === "") {
          setTexto("");
          return;
        }
        const n = Number(raw);
        if (!Number.isFinite(n)) {
          setTexto(raw);
          return;
        }
        const entero = Math.round(n);
        // Punto 3: se escribe más del máximo → se ajusta sola y sale el aviso.
        if (entero > tope) toast.warning(mensajeMaximo);
        const ajustada = Math.min(Math.max(1, entero), tope);
        setTexto(String(ajustada));
        if (ajustada !== value) onChange(ajustada);
      }}
      onBlur={() => setTexto(null)}
      className="w-12 text-center text-sm max-md:text-base max-md:min-h-11 font-bold bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-lg py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}
