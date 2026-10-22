import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const DIAS  = ["DO","LU","MA","MI","JU","VI","SA"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

export function CalendarDropdown({
  value,
  onChange,
  max,
  min,
  error = false,
  onBlur,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  max?: string;
  min?: string;
  error?: boolean;
  onBlur?: () => void;
  onClose?: () => void;
}) {
  const today    = new Date();
  const selected = value ? new Date(value + "T12:00:00") : null;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    if (selected) return { year: selected.getFullYear(), month: selected.getMonth() };
    return { year: today.getFullYear(), month: today.getMonth() };
  });
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Posición (viewport, `fixed`) del panel: el cuadro se pinta en un portal a
  // <body> para que ningún contenedor padre con overflow lo recorte, y se
  // ancla al borde del campo midiendo su rectángulo (ver `reposicionar`).
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  /** Ancla el panel DEBAJO del botón, alineado a su borde izquierdo. Sólo se
   *  abre hacia arriba si no cabe abajo en la ventana y sí cabe arriba. */
  const reposicionar = () => {
    const btn = triggerRef.current;
    const panel = panelRef.current;
    if (!btn || !panel) return;
    const r = btn.getBoundingClientRect();
    const gap = 4; // mb-1 / mt-1
    const altoPanel = Math.min(panel.offsetHeight, window.innerHeight - 2 * gap);
    const cabeAbajo = window.innerHeight - r.bottom - gap >= altoPanel;
    const cabeArriba = r.top - gap >= altoPanel;
    const abajo = cabeAbajo || !cabeArriba;
    const top = abajo ? r.bottom + gap : Math.max(gap, r.top - gap - altoPanel);
    // Nunca sale del borde derecho de la ventana (si no cabe a la derecha se
    // desplaza a la izquierda manteniendo el ancho).
    const left = Math.max(
      gap,
      Math.min(r.left, window.innerWidth - panel.offsetWidth - gap),
    );
    setPos({ top, left });
  };

  // Al abrir: mide y coloca ANTES del pintado (useLayoutEffect) para que no se
  // vea el panel en una posición provisional; al cerrar se borra la posición.
  useLayoutEffect(() => {
    if (open) reposicionar();
    else setPos(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reubica al cambiar de mes (el alto del cuadro varía con 5 o 6 filas).
  useEffect(() => {
    if (open) reposicionar();
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mientras esté abierto sigue al campo en scroll (de cualquier contenedor,
  // por eso `capture`) y en resize de la ventana.
  useEffect(() => {
    if (!open) return;
    const onMove = () => reposicionar();
    window.addEventListener("scroll", onMove, { capture: true, passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, { capture: true });
      window.removeEventListener("resize", onMove);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // El panel vive en un portal (fuera del árbol del campo), así que el
      // clic "fuera" es fuera del campo Y fuera del cuadro.
      const dentroDelCampo = ref.current?.contains(e.target as Node);
      const dentroDelPanel = panelRef.current?.contains(e.target as Node);
      if (!dentroDelCampo && !dentroDelPanel) {
        setOpen(false);
        onClose?.();
        onBlur?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onBlur, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        onClose?.();
        onBlur?.();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onBlur, onClose]);

  useEffect(() => {
    if (open && selected) {
      setView({ year: selected.getFullYear(), month: selected.getMonth() });
    } else if (open && !selected) {
      setView({ year: today.getFullYear(), month: today.getMonth() });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevMonth = () => setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const nextMonth = () => setView(v => v.month === 11 ? { year: v.year + 1, month: 0  } : { ...v, month: v.month + 1 });

  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

  const isDisabled = (day: number) => {
    const d = new Date(view.year, view.month, day);
    const iso = toIso(d);
    if (max && iso > max) return true;
    if (min && iso < min) return true;
    return false;
  };

  const pick = (day: number) => {
    if (isDisabled(day)) return;
    const d = new Date(view.year, view.month, day);
    onChange(toIso(d));
    setOpen(false);
    onClose?.();
    onBlur?.();
  };

  const isSelected = (day: number) =>
    selected && selected.getFullYear() === view.year &&
    selected.getMonth() === view.month && selected.getDate() === day;

  const isToday = (day: number) =>
    today.getFullYear() === view.year && today.getMonth() === view.month && today.getDate() === day;

  const firstDay    = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const displayDate = selected
    ? `${String(selected.getDate()).padStart(2,"0")}/${String(selected.getMonth()+1).padStart(2,"0")}/${selected.getFullYear()}`
    : "";

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        ref={triggerRef}
        onClick={() => {
          setOpen(o => {
            const next = !o;
            if (!next) {
              onClose?.();
              onBlur?.();
            }
            return next;
          });
        }}
        onBlur={(e) => {
          // Only blur if focus leaves the component
          if (!ref.current?.contains(e.relatedTarget as Node)) {
            if (!open) onBlur?.();
          }
        }}
        aria-invalid={error}
        className={`w-full flex items-center justify-between px-3 py-2.5 bg-muted rounded-xl border text-sm text-foreground hover:border-primary/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 ${
          error ? "border-red-400 focus:ring-red-300" : "border-border"
        }`}
      >
        <span className={displayDate ? "text-foreground" : "text-muted-foreground"}>
          {displayDate || "DD/MM/AAAA"}
        </span>
        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            // z-[100]: mismo nivel que los portales de los selects del panel
            // (EstadoSelect/UnidadSelect), por encima de los overlays z-50.
            className="fixed z-[100] bg-card border border-border rounded-xl shadow-xl overflow-hidden select-none w-64"
            style={{
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              // Invisible hasta medir la posición (useLayoutEffect): evita el
              // parpadeo del cuadro en la esquina antes de anclarlo al campo.
              visibility: pos ? "visible" : "hidden",
              maxHeight: "calc(100vh - 200px)",
              overflowY: "auto",
            }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-bold text-foreground capitalize">
                {MESES[view.month]} de {view.year}
              </span>
              <div className="flex gap-0.5">
                <button type="button" onClick={prevMonth}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted cursor-pointer text-foreground">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={nextMonth}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted cursor-pointer text-foreground">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 px-2 pt-1.5">
              {DIAS.map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-0.5">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 px-2 pb-1.5">
              {cells.map((day, i) => (
                <div key={i} className="flex items-center justify-center p-0.5">
                  {day ? (
                    <button
                      type="button"
                      onClick={() => pick(day)}
                      disabled={isDisabled(day)}
                      className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                        isDisabled(day)
                          ? "text-muted-foreground/40 cursor-not-allowed"
                          : isSelected(day)
                            ? "bg-primary text-white font-bold shadow-sm cursor-pointer"
                            : isToday(day)
                              ? "border-2 border-primary text-primary font-bold cursor-pointer"
                              : "text-foreground hover:bg-muted cursor-pointer"
                      }`}
                    >
                      {day}
                    </button>
                  ) : <span />}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 border-t border-border">
              <button type="button" onClick={() => { onChange(""); setOpen(false); onClose?.(); onBlur?.(); }}
                className="text-[11px] font-semibold text-muted-foreground hover:text-primary cursor-pointer">
                Borrar
              </button>
              <button type="button" onClick={() => {
                // No se delega en `pick`: leería el `view` viejo del closure, ya
                // que `setView` es asíncrono, así que si el usuario estaba viendo
                // otro mes la fecha se armaba en ese mes y "Hoy" podía caer en el
                // mes siguiente (ver el 31 de enero sobre febrero, p. ej.).
                const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const isoToday = toIso(d);
                if (max && isoToday > max) return;
                if (min && isoToday < min) return;
                setView({ year: d.getFullYear(), month: d.getMonth() });
                onChange(isoToday);
                setOpen(false);
                onClose?.();
                onBlur?.();
              }}
                className="text-[11px] font-semibold text-primary hover:text-red-700 cursor-pointer">
                Hoy
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
