/** Helpers de hora compartidos por el checkout, el Dashboard y las pantallas
    que muestran la hora de recogida. */

/** Horario de atención para la recogida, en minutos desde medianoche:
    de 4:00 p. m. (960) a 10:00 p. m. (1320). */
export const HORA_APERTURA = 16 * 60; // 4:00 p. m.
export const HORA_CIERRE = 22 * 60; // 10:00 p. m.

/** Último horario seleccionable de recogida: 9:45 p. m. El cierre de cocina
    es a las 10:00 p. m., así que no se ofrece nada a partir de las 9:45. */
export const HORA_ULTIMA_RECOGIDA = 21 * 60 + 45;

/** Minutos ofrecidos por el selector de hora de recogida (intervalos de 15). */
export const MINUTOS_RECOGIDA = [0, 15, 30, 45];

/** Convierte "16:00", "6:00 p. m." o "06:00 PM" a minutos desde medianoche.
    Devuelve null cuando la hora no se puede leer. */
export const minutosDeHora = (texto?: string): number | null => {
  if (!texto) return null;
  const m = texto
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})[:.]?(\d{2})?\s*(a\.?\s?m\.?|p\.?\s?m\.?|am|pm)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const sufijo = (m[3] ?? "").replace(/\s|\./g, "");
  if (sufijo.startsWith("p") && h < 12) h += 12;
  if (sufijo.startsWith("a") && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

/** "18:30", "6:30 p. m." o "4:22 PM" → "6:30 p. m.". Si la hora no se puede
    leer devuelve el texto tal cual. Es el formato en el que se guarda y se
    muestra la hora de recogida. */
export const hora12 = (valor?: string): string => {
  if (!valor) return "";
  const minutos = minutosDeHora(valor);
  if (minutos === null) return valor;
  const h24 = Math.floor(minutos / 60);
  const m = minutos % 60;
  const h12 = h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24;
  return `${h12}:${String(m).padStart(2, "0")} ${h24 >= 12 ? "p. m." : "a. m."}`;
};
