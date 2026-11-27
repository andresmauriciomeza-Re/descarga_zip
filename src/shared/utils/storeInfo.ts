import { HORA_APERTURA, HORA_CIERRE, formatearHora } from "@/shared/utils/time";

/** Dirección única del local, usada en el pie de la Landing, en la tarjeta
    "Dónde recoger tu pedido" y en las órdenes de demostración. El mapa de
    Google Maps se arma con esta misma cadena (ver `DIRECCION_LOCAL_MAPA`). */
export const DIRECCION_LOCAL = "Cra. 45 #104-30, Laureles, Medellín, Antioquia";

export const aperturaRecogidaTexto = formatearHora(HORA_APERTURA / 60 + ":00");

export const cierreRecogidaTexto = formatearHora(HORA_CIERRE / 60 + ":00");
