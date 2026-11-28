export interface MesDisponible {
  clave: string;
  etiqueta: string;
}

export const SERIF = "var(--font-titulo)";

// ── Build week structure dynamically (datos reales) ──────────────────
export interface DayEntry {
  day: number;
  label: string;
  unidades: number;
  porciones: number;
  revenue: number;
  isToday: boolean;
  isFuture: boolean;
}

export interface WeekEntry {
  idx: number;
  label: string;
  range: string;
  days: DayEntry[];
  totalVentas: number;
  totalUnidades: number;
  totalPorciones: number;
  totalRevenue: number;
  /** true = todos los días de la semana ya pasaron (solo entonces se muestra %). */
  terminada: boolean;
}

// ── Bar color helper ─────────────────────────────────────────────────
export function barFill(d: DayEntry) {
  if (d.isFuture) return "var(--border)";
  if (d.isToday)  return "#ef5350";
  return "#991B1B";
}
