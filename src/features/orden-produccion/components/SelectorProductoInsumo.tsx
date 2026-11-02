import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export type OpcionProductoInsumo = {
  id: string;
  label: string;
  disabled?: boolean;
};

export type GrupoProductoInsumo = {
  label: string;
  opciones: OpcionProductoInsumo[];
};

export function SelectorProductoInsumo({
  value,
  placeholder,
  grupos,
  onSelect,
}: {
  value: string;
  placeholder: string;
  grupos: GrupoProductoInsumo[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
  } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const label = grupos
    .flatMap((g) => g.opciones)
    .find((o) => o.id === value)?.label;

  const ubicar = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    if (window.innerHeight - rect.bottom < 300) {
      setPos({ left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + 6 });
    } else {
      setPos({ left: rect.left, width: rect.width, top: rect.bottom + 6 });
    }
  };

  useEffect(() => {
    if (!open) return;
    ubicar();
    const fuera = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (trigger.current?.contains(t) || menu.current?.contains(t)) return;
      setOpen(false);
    };
    const esc = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", ubicar, true);
    window.addEventListener("resize", ubicar);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", ubicar, true);
      window.removeEventListener("resize", ubicar);
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          ubicar();
          setOpen((o) => !o);
        }}
        className={`h-[54px] w-full px-[18px] rounded-[14px] bg-muted border text-base text-left flex items-center justify-between gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 cursor-pointer ${
          open ? "border-primary" : "border-border"
        }`}
      >
        <span className={`truncate ${label ? "text-foreground" : "text-muted-foreground"}`}>
          {label ?? placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && pos && createPortal(
        <div
          ref={menu}
          role="listbox"
          style={{
            position: "fixed",
            left: pos.left,
            width: pos.width,
            top: pos.top,
            bottom: pos.bottom,
          }}
          className="z-[60] max-h-[340px] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl p-2 text-foreground"
        >
          {grupos.map((g) => (
            <div key={g.label}>
              <div className="text-sm font-semibold px-3.5 pt-3 pb-1.5">{g.label}</div>
              {g.opciones.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="option"
                  aria-selected={o.id === value}
                  disabled={o.disabled}
                  onClick={() => {
                    onSelect(o.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-[15px] rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                    o.disabled
                      ? "text-muted-foreground cursor-not-allowed"
                      : "hover:bg-primary/10 cursor-pointer"
                  } ${o.id === value ? "bg-primary/10" : ""}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
