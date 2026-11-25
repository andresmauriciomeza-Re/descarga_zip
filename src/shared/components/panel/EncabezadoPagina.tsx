import type { ReactNode } from "react";

/** Título de la pantalla + descripción + botones a la derecha (el principal de último). */
export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: ReactNode;
  /** Pásalos en orden: el principal va al final. En celular pasan abajo a ancho completo. */
  acciones?: ReactNode;
}) {
  return (
    <header className="pn-encabezado">
      <div style={{ minWidth: 0, flex: "1 1 320px" }}>
        <h1>{titulo}</h1>
        {descripcion && <p>{descripcion}</p>}
      </div>
      {acciones && <div className="pn-encabezado__acciones">{acciones}</div>}
    </header>
  );
}
