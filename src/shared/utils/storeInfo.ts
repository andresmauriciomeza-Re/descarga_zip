import { HORA_ULTIMA_RECOGIDA } from "@/shared/utils/time";
import { HORA_APERTURA, HORA_CIERRE, formatearHora } from "@/shared/utils/time";

/** Dirección única del local, usada en el pie de la Landing, en la tarjeta
    "Dónde recoger tu pedido" y en las órdenes de demostración. El mapa de
    Google Maps se arma con esta misma cadena (ver `DIRECCION_LOCAL_MAPA`). */
export const DIRECCION_LOCAL = "Cra. 45 #104-30, Laureles, Medellín, Antioquia";

export const aperturaRecogidaTexto = formatearHora(HORA_APERTURA / 60 + ":00");

export const cierreRecogidaTexto = formatearHora(HORA_CIERRE / 60 + ":00");

/** WhatsApp del local (número colombiano, sin prefijo). El enlace usa el
    prefijo 57 y el texto visible se agrupa como "320 882 0029". */
export const WHATSAPP_LOCAL = "3208820029";

export const WHATSAPP_LOCAL_VISIBLE = WHATSAPP_LOCAL.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");

export const WHATSAPP_LOCAL_URL = `https://wa.me/57${WHATSAPP_LOCAL}`;

export const ultimaRecogidaTexto = formatearHora(
  Math.floor(HORA_ULTIMA_RECOGIDA / 60) + ":" + String(HORA_ULTIMA_RECOGIDA % 60).padStart(2, "0"),
);
