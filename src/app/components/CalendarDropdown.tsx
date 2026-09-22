import { useState, useEffect, useRef } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const DIAS  = ["DO","LU","MA","MI","JU","VI","SA"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

export function CalendarDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today    = new Date();
  const selected = value ? new Date(value + "T12:00:00") : null;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const prevMonth = () => setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const nextMonth = () => setView(v => v.month === 11 ? { year: v.year + 1, month: 0  } : { ...v, month: v.month + 1 });

  const pick = (day: number) => {
    const d = new Date(view.year, view.month, day);
    onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
    setOpen(false);
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
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground hover:border-primary/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <span className={displayDate ? "text-foreground" : "text-muted-foreground"}>
          {displayDate || "DD/MM/AAAA"}
        </span>
        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-card border border-border rounded-xl shadow-xl overflow-hidden select-none w-64">
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
                    className={`w-7 h-7 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isSelected(day) ? "bg-primary text-white font-bold shadow-sm"
                      : isToday(day)  ? "border-2 border-primary text-primary font-bold"
                      : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {day}
                  </button>
                ) : <span />}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 border-t border-border">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}
              className="text-[11px] font-semibold text-muted-foreground hover:text-primary cursor-pointer">
              Borrar
            </button>
            <button type="button" onClick={() => {
              setView({ year: today.getFullYear(), month: today.getMonth() });
              pick(today.getDate());
            }}
              className="text-[11px] font-semibold text-primary hover:text-red-700 cursor-pointer">
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
