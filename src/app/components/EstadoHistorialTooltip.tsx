import React, { useEffect, useRef, useState } from "react";

// ─── Tooltip de historial de estados al hover ────────────────────────────────

export interface HistorialEntry {
  estado: string;
  fechaHora: string; // ISO string
}

interface EstadoHistorialTooltipProps {
  historial: HistorialEntry[];
  estadoColors: Record<string, string>;
  children: React.ReactNode;
}

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
 * Tooltip que muestra el historial de estados al pasar el cursor.
 * Bordes redondeados, sombra suave, línea de tiempo vertical.
 */
export function EstadoHistorialTooltip({
  historial,
  estadoColors,
  children,
}: EstadoHistorialTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [posicion, setPosicion] = useState<"abajo" | "arriba">("abajo");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const espacioAbajo = window.innerHeight - rect.bottom;
      const espacioArriba = rect.top;
      // Si hay menos de 200px abajo, mostrar arriba
      if (espacioAbajo < 200 && espacioArriba > espacioAbajo) {
        setPosicion("arriba");
      } else {
        setPosicion("abajo");
      }
    }
  }, [visible]);

  if (historial.length === 0) {
    return <>{children}</>;
  }

  // Ordenar: más reciente arriba
  const ordenado = [...historial].sort(
    (a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
  );

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={`absolute z-50 w-72 bg-white rounded-xl shadow-lg border border-border p-4 ${
            posicion === "abajo" ? "top-full mt-2" : "bottom-full mb-2"
          } right-0`}
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
                    <div className={`w-3 h-3 rounded-full ${color} ${esUltimo ? "ring-2 ring-offset-1 ring-gray-200" : ""}`} />
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
        </div>
      )}
    </div>
  );
}
