import type { ReactNode } from "react";

/** Franja «Estás en: Módulo › Pantalla» con un botón opcional a la derecha. */
export function RutaPagina({
  modulo,
  pantalla,
  boton,
}: {
  modulo?: string;
  pantalla: string;
  /** Normalmente un <BotonAccion> «Volver a …» o «Salir sin guardar». */
  boton?: ReactNode;
}) {
  return (
    <nav className="pn-ruta" aria-label="Dónde estás">
      <p style={{ margin: 0 }}>
        Estás en: {modulo && modulo !== pantalla ? <>{modulo} › </> : null}
        <strong>{pantalla}</strong>
      </p>
      {boton}
      <span id="pn-ruta-boton" style={{ display: "contents" }} />
    </nav>
  );
}
