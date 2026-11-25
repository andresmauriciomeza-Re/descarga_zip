import { useId, type InputHTMLAttributes } from "react";
import { Search } from "lucide-react";

/** Buscador con etiqueta visible arriba («Buscar un …»). */
export function BuscadorGrande({
  etiqueta,
  ...input
}: { etiqueta: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const id = useId();
  return (
    <div className="pn-buscador">
      <label htmlFor={id} className="pn-etiqueta">
        {etiqueta}
      </label>
      <Search size={24} aria-hidden="true" />
      <input id={id} type="search" autoComplete="off" {...input} />
    </div>
  );
}
