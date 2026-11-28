import type { ReactNode } from "react";
import { useIdioma } from "@/shared/i18n";

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
  // `modulo` y `pantalla` llegan en español y así se comparan; solo se traducen al pintarlos.
  const { t, tf } = useIdioma();
  return (
    <nav className="pn-ruta" aria-label={t("menu.dondeEstas")}>
      <p style={{ margin: 0 }}>
        {t("menu.estasEn")} {modulo && modulo !== pantalla ? <>{tf(modulo)} › </> : null}
        <strong>{tf(pantalla)}</strong>
      </p>
      {boton}
      <span id="pn-ruta-boton" style={{ display: "contents" }} />
    </nav>
  );
}
