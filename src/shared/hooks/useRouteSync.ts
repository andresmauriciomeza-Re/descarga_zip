import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router";
import { leerRuta, rutaDe } from "@/AppRoutes";
import type { Screen } from "@/shared/utils/screen";

const sinBarraFinal = (p: string) => p.replace(/(?!^)\/+$/, "");

/**
 * Mantiene la URL y el historial en sintonía con la pantalla de `App`:
 * - pantalla → URL: cada cambio de pantalla agrega (o reemplaza) una entrada.
 * - URL → pantalla: atrás/adelante del navegador llaman a `alVolver`.
 */
export function useRouteSync({
  screen,
  id,
  pausado,
  reemplazarRef,
  alVolver,
}: {
  screen: Screen;
  /** Registro abierto, para las rutas con `:id`. */
  id?: string | number | null;
  /** Mientras se restaura la sesión no se toca la URL pedida. */
  pausado: boolean;
  /** La siguiente escritura reemplaza la entrada actual en vez de agregarla. */
  reemplazarRef: MutableRefObject<boolean>;
  alVolver: (ruta: { screen: Screen; id?: string }) => void;
}) {
  const location = useLocation();
  const irA = useNavigate();
  const tipo = useNavigationType();
  const destino = rutaDe(screen, id);
  const claveAnterior = useRef(location.key);
  const primeraEscritura = useRef(true);
  const alVolverRef = useRef(alVolver);
  alVolverRef.current = alVolver;
  // Tras un atrás/adelante se vuelve a comparar la URL aunque la pantalla no
  // cambie (p. ej. volver a /login con la sesión abierta).
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    // La posición la restaura `navigate(..., { restaurar: true })`.
    window.history.scrollRestoration = "manual";
  }, []);

  useEffect(() => {
    if (location.key === claveAnterior.current) return;
    claveAnterior.current = location.key;
    if (tipo !== "POP") return;
    reemplazarRef.current = true;
    alVolverRef.current(leerRuta(location.pathname) ?? { screen: "landing" });
    setRevision((r) => r + 1);
  }, [location.key]);

  useEffect(() => {
    if (pausado) return;
    // La entrada con la que se abrió la app se corrige, no se duplica.
    const reemplazar = reemplazarRef.current || primeraEscritura.current;
    reemplazarRef.current = false;
    primeraEscritura.current = false;
    if (sinBarraFinal(window.location.pathname) === destino) return;
    // El enlace de factura se conserva mientras se inicia sesión.
    const conservar =
      (screen === "login" || screen === "mis-pedidos") &&
      new URLSearchParams(window.location.search).has("factura");
    irA(destino + (conservar ? window.location.search : ""), { replace: reemplazar });
  }, [destino, pausado, revision]);
}
