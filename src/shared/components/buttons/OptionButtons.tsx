export interface OpcionBoton {
  valor: string;
  etiqueta: string;
  /** Apaga solo esta opción (con `titulo` explicando por qué). */
  deshabilitada?: boolean;
  titulo?: string;
}

/** 2 a 5 botones grandes para escoger una opción (en vez de un select). */
export function OpcionesBotones({
  opciones,
  valor,
  onChange,
  etiqueta,
  deshabilitado,
}: {
  opciones: OpcionBoton[];
  valor: string;
  onChange: (valor: string) => void;
  /** Nombre del grupo para lectores de pantalla. */
  etiqueta: string;
  /** Bloquea todo el grupo (p. ej. un campo que no se puede cambiar al editar). */
  deshabilitado?: boolean;
}) {
  return (
    <div className="pn-opciones" role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          className="pn-opcion"
          aria-pressed={o.valor === valor}
          disabled={deshabilitado || o.deshabilitada}
          title={o.titulo}
          onClick={() => onChange(o.valor)}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}
