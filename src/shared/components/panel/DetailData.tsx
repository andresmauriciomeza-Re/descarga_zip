import type { ReactNode } from "react";

/** Lista de datos en grilla: etiqueta pequeña arriba, valor en negrita. */
export function DatosDetalle({ datos }: { datos: { etiqueta: string; valor: ReactNode }[] }) {
  return (
    <dl className="pn-datos">
      {datos.map((d) => (
        <div key={d.etiqueta}>
          <dt>{d.etiqueta}</dt>
          <dd>{d.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Línea de tiempo: punto verde si ya pasó, gris si falta. */
export function Historial({
  pasos,
}: {
  pasos: { titulo: string; hora?: string; hecho: boolean }[];
}) {
  return (
    <ol className="pn-historial">
      {pasos.map((p) => (
        <li key={p.titulo} data-hecho={p.hecho}>
          <span className="pn-historial__punto" aria-hidden="true" />
          <div className="pn-historial__titulo">
            {p.titulo}
            <span className="sr-only">{p.hecho ? " (ya pasó)" : " (falta)"}</span>
          </div>
          {p.hora && <div className="pn-historial__hora">{p.hora}</div>}
        </li>
      ))}
    </ol>
  );
}
