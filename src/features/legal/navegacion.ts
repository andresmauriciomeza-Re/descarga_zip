// Integra la URL /licencias con la navegación por estado de App (sin router).
import { useEffect, useRef } from "react";
import type { Screen } from "@/shared/utils/screen";

export const RUTA_LICENCIAS = "/licencias";

export const esRutaLicencias = () =>
  window.location.pathname.replace(/\/+$/, "") === RUTA_LICENCIAS;

/** Desplaza hasta una sección y le pasa el foco (teclado y lector de pantalla). */
export const irASeccion = (id: string, behavior: ScrollBehavior = "auto") => {
  const seccion = document.getElementById(id);
  if (!seccion) return;
  seccion.scrollIntoView({ behavior, block: "start" });
  seccion.focus({ preventScroll: true });
};

/**
 * Mantiene la URL y el historial del navegador en sintonía con la pantalla de
 * licencias. El resto de pantallas sigue sin historial, como hasta ahora.
 */
export function useRutaLicencias(
  screen: Screen,
  navigate: (s: Screen, options?: { restaurar?: boolean }) => void,
) {
  const anterior = useRef<Screen>(screen);
  const actual = useRef({ screen, navigate });
  actual.current = { screen, navigate };

  useEffect(() => {
    const previa = anterior.current;
    anterior.current = screen;
    const enRuta = esRutaLicencias();
    if (screen === "licencias" && !enRuta) {
      window.history.replaceState({ sivproPantalla: previa }, "", window.location.href);
      window.history.pushState({ sivproPantalla: "licencias" }, "", RUTA_LICENCIAS);
    } else if (screen !== "licencias" && enRuta) {
      window.history.pushState({ sivproPantalla: screen }, "", "/");
    }
  }, [screen]);

  useEffect(() => {
    const alCambiarHistorial = (evento: PopStateEvent) => {
      const { screen: vista, navigate: ir } = actual.current;
      if (esRutaLicencias()) {
        if (vista !== "licencias") ir("licencias");
      } else if (vista === "licencias") {
        ir((evento.state?.sivproPantalla as Screen | undefined) ?? "landing", { restaurar: true });
      }
    };
    window.addEventListener("popstate", alCambiarHistorial);
    return () => window.removeEventListener("popstate", alCambiarHistorial);
  }, []);
}
