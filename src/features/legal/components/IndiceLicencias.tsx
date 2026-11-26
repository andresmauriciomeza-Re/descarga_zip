import type { MouseEvent } from "react";
import type { SeccionIndice } from "../types/licencias.types";
import { irASeccion } from "../navegacion";

export function IndiceLicencias({ secciones }: { secciones: SeccionIndice[] }) {
  const alPulsar = (evento: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
    evento.preventDefault();
    // Se reemplaza la entrada del historial: así "Atrás" sale de la página en
    // vez de recorrer una por una las secciones consultadas.
    window.history.replaceState(window.history.state, "", `#${id}`);
    irASeccion(id, "smooth");
  };

  return (
    <nav
      aria-label="Índice de contenido"
      className="rounded-xl border border-border bg-card p-4 lg:sticky lg:top-24 lg:border-0 lg:bg-transparent lg:p-0"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Contenido
      </p>
      <ul className="mt-2">
        {secciones.map(({ id, titulo }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(evento) => alPulsar(evento, id)}
              className="block rounded-sm py-1.5 max-md:py-2.5 text-sm leading-snug text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {titulo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
