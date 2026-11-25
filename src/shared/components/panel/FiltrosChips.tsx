export interface OpcionFiltro {
  valor: string;
  etiqueta: string;
  /** Cantidad opcional: se muestra como «(2)». */
  contador?: number;
}

/** «Mostrar:» + botones tipo píldora. El activo va en negro con texto blanco. */
export function FiltrosChips({
  opciones,
  valor,
  onChange,
  titulo = "Mostrar:",
}: {
  opciones: OpcionFiltro[];
  valor: string;
  onChange: (valor: string) => void;
  titulo?: string;
}) {
  return (
    <div className="pn-filtros" role="group" aria-label={titulo.replace(/:$/, "")}>
      <span className="pn-filtros__titulo">{titulo}</span>
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          className="pn-chip"
          aria-pressed={o.valor === valor}
          onClick={() => onChange(o.valor)}
        >
          {o.etiqueta}
          {o.contador !== undefined && ` (${o.contador})`}
        </button>
      ))}
    </div>
  );
}
