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

/** Fecha ficticia con esa hora, para pintarla con `formatoFecha` según el idioma.
    Devuelve null si el texto no es una hora. */
export const fechaDeHora = (texto?: string): Date | null => {
  const minutos = minutosDeHora(texto);
  return minutos === null ? null : new Date(2000, 0, 1, Math.floor(minutos / 60), minutos % 60);
};

const relojBogota = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

type ValorFecha = string | Date | null | undefined;

function partesBogota(valor: string | Date) {
  // Los timestamps sin zona ya representan la hora local de Bogotá.
  const fecha = typeof valor === "string"
    ? new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(valor) ? valor : valor.replace(" ", "T") + "-05:00")
    : valor;
  if (Number.isNaN(fecha.getTime())) return null;
  return Object.fromEntries(relojBogota.formatToParts(fecha).map(({ type, value }) => [type, value]));
}

export function formatearHora(valor: ValorFecha, { sinMinutos = false } = {}): string {
  if (!valor) return "";
  const texto = typeof valor === "string" ? valor.trim() : "";
  const partes = valor instanceof Date || /^\d{4}-\d{2}-\d{2}[T ]/.test(texto)
    ? partesBogota(texto || valor)
    : null;
  const minutos = partes
    ? Number(partes.hour) * 60 + Number(partes.minute)
    : minutosDeHora(texto.replace(/^(\d{1,2}:\d{2}):\d{2}(?:\.\d+)?$/, "$1"));
  if (minutos === null) return texto;
  const h24 = Math.floor(minutos / 60);
  const h12 = h24 % 12 || 12;
  const m = String(minutos % 60).padStart(2, "0");
  return `${h12}${sinMinutos ? "" : ":" + m} ${h24 >= 12 ? "p. m." : "a. m."}`;
}

export function formatearFechaHora(valor: ValorFecha, hora?: string | null): string {
  if (!valor) return formatearHora(hora) || "—";
  if (typeof valor === "string") {
    const texto = valor.trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
    if (iso || /^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
      const fecha = iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : texto;
      return [fecha, formatearHora(hora)].filter(Boolean).join(" ");
    }
  }
  const partes = partesBogota(typeof valor === "string" ? valor.trim() : valor);
  if (!partes) return typeof valor === "string" ? valor : "—";
  return `${partes.day}/${partes.month}/${partes.year} ${formatearHora(hora || `${partes.hour}:${partes.minute}`)}`;
}
