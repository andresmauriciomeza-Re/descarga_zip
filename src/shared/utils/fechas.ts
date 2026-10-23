/**
 * Fechas en formato "YYYY-MM-DD".
 *
 * Todas las fechas de la app (ventas, facturas, órdenes, no conformidades)
 * se guardan como texto ISO de fecha, así que comparar con `<` / `>` o con
 * `localeCompare` ES comparación cronológica (comparación lexicográfica):
 * "2026-10-01" < "2026-10-15" < "2026-11-01". No hace falta parsear.
 */
export type FechaISO = string; // "YYYY-MM-DD"

/** "YYYY-MM-DD" de una Date local (no UTC: usa getFullYear/getMonth/getDate). */
export const fechaISO = (d: Date): FechaISO => {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
};

/**
 * "Hoy" con el calendario de Bogotá (America/Bogotá), sea cual sea la zona del
 * navegador. Devuelve una Date LOCAL cuyo día calendario es el día que corre en
 * Colombia, así que `fechaISO(hoyBogota())` da la fecha de Bogotá y todo el
 * corte de día/semana/mes (`rangoDePeriodo`/`enPeriodo`) queda en hora de
 * Colombia. Es la referencia por defecto del filtro Diario · Semanal · Mensual.
 */
export const hoyBogota = (): Date => {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
};

/** "YYYY-MM-DD" de HOY en Bogotá (misma referencia que el filtro de periodos:
    el "hoy" de la app es el de Colombia, no el del navegador). */
export const hoyISO = (): FechaISO => fechaISO(hoyBogota());

export const esFechaISO = (f: string | undefined | null): f is FechaISO =>
  typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f);

/** Comparación lexicográfica = cronológica para "YYYY-MM-DD". */
export const cmpFecha = (a: FechaISO, b: FechaISO): number => a.localeCompare(b);

/** true si `f` está dentro de [desde, hasta] inclusive (comparación lexicográfica). */
export const enRango = (f: FechaISO, desde: FechaISO, hasta: FechaISO): boolean =>
  desde <= f && f <= hasta;

export const agregarDias = (d: Date, dias: number): Date => {
  const c = new Date(d);
  c.setDate(c.getDate() + dias);
  return c;
};

/** Lunes 00:00 de la semana (semana laboral lun–dom) que contiene a `d`. */
export const lunesDe = (d: Date): Date => {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = c.getDay(); // 0 = domingo
  const desdeLunes = (dow + 6) % 7; // domingo -> 6, lunes -> 0
  return agregarDias(c, -desdeLunes);
};

/** Domingo (inclusive) de la semana que contiene a `d`. */
export const domingoDe = (d: Date): Date => agregarDias(lunesDe(d), 6);

export const inicioDeMes = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);
export const finDeMes = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 1, 0);

/** Filtro global del Dashboard y de Estadísticas: Diario · Semanal · Mensual. */
export type Periodo = "dia" | "semana" | "mes";

/** Rango ISO [desde, hasta] de un periodo. "dia" = hoy, "semana" = lunes a
    domingo de la semana actual, "mes" = mes actual. Por defecto el "hoy" es el
    de Bogotá (ver `hoyBogota`): el corte de día/semana/mes se calcula en hora de
    Colombia aunque el navegador esté en otra zona. */
export const rangoDePeriodo = (
  periodo: Periodo,
  ref: Date = hoyBogota(),
): { desde: FechaISO; hasta: FechaISO } => {
  if (periodo === "dia") {
    const hoy = fechaISO(ref);
    return { desde: hoy, hasta: hoy };
  }
  if (periodo === "semana") {
    const lunes = lunesDe(ref);
    return { desde: fechaISO(lunes), hasta: fechaISO(agregarDias(lunes, 6)) };
  }
  return { desde: fechaISO(inicioDeMes(ref)), hasta: fechaISO(finDeMes(ref)) };
};

/** true si la fecha (si es válida) cae dentro del periodo. */
export const enPeriodo = (
  fecha: string | undefined | null,
  periodo: Periodo,
  ref: Date = hoyBogota(),
): boolean => {
  if (!esFechaISO(fecha)) return false;
  const rango = rangoDePeriodo(periodo, ref);
  return enRango(fecha, rango.desde, rango.hasta);
};

/** 1..5 — semana del mes a la que pertenece la fecha (S1 = días 1-7). */
export const semanaDelMes = (fecha: FechaISO): number =>
  Math.ceil(Number(fecha.slice(8, 10)) / 7);

/** "2026-10" — clave de mes de una fecha ISO. */
export const mesDe = (fecha: FechaISO): string => fecha.slice(0, 7);

/** "2026" — clave de año de una fecha ISO. */
export const anioDe = (fecha: FechaISO): string => fecha.slice(0, 4);

/** Texto bajo cada número del Dashboard según el periodo activo. */
export const etiquetaPeriodo = (periodo: Periodo): string =>
  periodo === "dia" ? "Hoy" : periodo === "semana" ? "Esta semana" : "Este mes";
