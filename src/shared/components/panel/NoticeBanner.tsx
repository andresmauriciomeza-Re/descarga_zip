import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

/** Aviso ámbar con título, texto y un botón a la derecha (pásalo como `boton`). */
export function AvisoBanner({
  titulo,
  children,
  boton,
}: {
  titulo: string;
  children?: ReactNode;
  /** Un <BotonAccion>; el banner lo pinta con fondo ámbar oscuro y texto blanco. */
  boton?: ReactNode;
}) {
  return (
    <section className="pn-aviso" role="alert">
      <AlertTriangle size={34} aria-hidden="true" style={{ flex: "none" }} />
      <div className="pn-aviso__texto">
        <h2>{titulo}</h2>
        {children && <p>{children}</p>}
      </div>
      {boton}
    </section>
  );
}
