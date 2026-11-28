import type { Venta } from "@/features/sales/utils/sales";

/** Etiqueta del estado que se ve en la fila — y con la que también busca el
    buscador: "Pendiente" o "Resuelta · <tipo de la devolución>". */
export const etiquetaEstadoDev = (dev: Venta): string =>
  !dev.devolucionResuelta
    ? "Pendiente"
    : dev.devolucionTipo === "dinero"
      ? "Resuelta · Dinero"
      : dev.devolucionTipo === "producto"
        ? "Resuelta · Canje"
        : "Resuelta · Mixta";
