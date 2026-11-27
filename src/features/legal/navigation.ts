import { rutaDe } from "@/AppRoutes";

export const RUTA_LICENCIAS = rutaDe("licencias");

export const esRutaLicencias = () =>
  window.location.pathname.replace(/\/+$/, "") === RUTA_LICENCIAS;

/** Desplaza hasta una sección y le pasa el foco (teclado y lector de pantalla). */
export const irASeccion = (id: string, behavior: ScrollBehavior = "auto") => {
  const seccion = document.getElementById(id);
  if (!seccion) return;
  seccion.scrollIntoView({ behavior, block: "start" });
  seccion.focus({ preventScroll: true });
};
