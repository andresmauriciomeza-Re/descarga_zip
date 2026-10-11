import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ─── Tooltip de historial de estados al hover (y al toque en móvil/tablet) ───

export interface HistorialEntry {
  estado: string;
  fechaHora: string; // ISO string
}

interface EstadoHistorialTooltipProps {
  historial: HistorialEntry[];
  estadoColors: Record<string, string>;
  children: React.ReactNode;
}

const ANCHO_PANEL = 288; // w-72

function formatearFechaHora(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const fecha = d.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const hora = d.toLocaleTimeString("es-CO", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${fecha} ${hora}`;
  } catch {
    return iso;
  }
}

/**
 * Tooltip con el historial de estados.
 *
 * El cuadro se pinta en un portal al <body> con posición fija calculada desde
 * el disparador: así nunca queda recortado por el `overflow` de la tabla ni
 * tapado por el footer. Se abre al pasar el cursor en escritorio y con un
 * toque (tap) en celular/tablet; se cierra con Escape, con un clic fuera o al
 * hacer scroll.
 */
export function EstadoHistorialTooltip({
  historial,
  estadoColors,
  children,
}: EstadoHistorialTooltipProps) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Dispositivos sin cursor (celular/tablet): el tooltip se abre con toque,
  // no con hover (en táctil el hover emulado abriría y el clic cerraría).
  const [táctil] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(hover: none)").matches
  );

  const abrir = useCallback(() => setAbierto(true), []);
  const cerrar = useCallback(() => setAbierto(false), []);
  const alternar = useCallback(() => setAbierto(v => !v), []);

  // Coloca el panel junto al disparador: abajo si hay sitio, arriba si no,
  // y siempre dentro del ancho de la ventana.
  useLayoutEffect(() => {
    if (!abierto || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const alto = panelRef.current?.offsetHeight ?? 220;
    const espacioAbajo = window.innerHeight - r.bottom;
    const espacioArriba = r.top;
    const arriba = espacioAbajo < alto + 16 && espacioArriba > espacioAbajo;
    const top = arriba
      ? Math.max(8, r.top - alto - 8)
      : Math.min(window.innerHeight - 8, r.bottom + 8);
    const left = Math.min(
      Math.max(8, r.right - ANCHO_PANEL),
      Math.max(8, window.innerWidth - ANCHO_PANEL - 8)
    );
    setPos({ top, left });
  }, [abierto, historial]);

  // Cierre: clic/tap fuera, Escape, scroll (la posición fija quedaría vieja)
  // y resize de la ventana.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: Event) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    const alScroll = (e: Event) => {
      // El propio panel scrollea (historial largo): eso no debe cerrarlo.
      const t = e.target as Node | null;
      if (t && panelRef.current?.contains(t)) return;
      setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    document.addEventListener("scroll", alScroll, true);
    window.addEventListener("resize", alScroll);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("scroll", alScroll, true);
      window.removeEventListener("resize", alScroll);
    };
  }, [abierto]);

  if (historial.length === 0) {
    return <>{children}</>;
  }

  // Ordenar: más reciente arriba
  const ordenado = [...historial].sort(
    (a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
  );

  const eventos = táctil
    ? {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          alternar();
        },
      }
    : {
        onMouseEnter: abrir,
        onMouseLeave: cerrar,
        onFocus: abrir,
        onBlur: cerrar,
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          abrir();
        },
      };

  return (
    <span
      ref={triggerRef}
      className="inline-block"
      {...eventos}
    >
      {children}
      {abierto &&
        createPortal(
          <div
            ref={panelRef}
            role="tooltip"
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-[110] w-72 max-w-[calc(100vw-16px)] bg-card text-foreground rounded-xl shadow-lg border border-border p-4 max-h-[60vh] overflow-y-auto"
          >
            <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">
              Historial de estados
            </p>
            <div className="space-y-0">
              {ordenado.map((entry, idx) => {
                const color = estadoColors[entry.estado] || "bg-gray-400";
                const esUltimo = idx === 0;
                return (
                  <div key={idx} className="flex gap-3">
                    {/* Línea de tiempo */}
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${color} ${esUltimo ? "ring-2 ring-offset-1 ring-muted" : ""}`} />
                      {idx < ordenado.length - 1 && (
                        <div className="w-0.5 h-6 bg-border" />
                      )}
                    </div>
                    {/* Contenido */}
                    <div className="pb-3 -mt-0.5">
                      <p className="text-xs font-semibold text-foreground">{entry.estado}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatearFechaHora(entry.fechaHora)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </span>
  );
}
