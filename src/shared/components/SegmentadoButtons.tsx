import type { ReactNode } from "react";

// Control segmentado tipo píldora: el mismo diseño que ya usa el bloque
// "¿Los montos de la factura incluyen IVA?" de Compra (contenedor con
// `bg-muted` + borde, botones con `aria-pressed` y envoltorio <span> con el
// tooltip, que es lo que permite ver el motivo en botones deshabilitados),
// extraído a un componente compartido para sustituir a los <select> de 2-3
// opciones en FORMULARIOS.
//
// Reglas de uso (punto 3.2 del plan):
//  · Solo formularios con hasta 3 opciones (tipo de persona, tipo de
//    documento, tipo de ítem, tipo de solución, estado Activo/Inactivo).
//  · Los filtros de listado NO se migran: siguen siendo selects.
//  · El componente pinta SOLO el grupo de botones; la etiqueta y el mensaje
//    de error los pinta el formulario que lo usa (cada pantalla tiene su
//    clase de label y su MensajeError).

export interface SegmentadoOpcion {
  valor: string;
  etiqueta: ReactNode;
  /** Bloquea SOLO esta opción (p.ej. "Reembolso al cliente" sin venta
      relacionada). El motivo va en `titulo`. */
  deshabilitada?: boolean;
  /** Texto al pasar el cursor sobre la opción (motivo del bloqueo). */
  titulo?: string;
}

export function SegmentadoButtons({
  valor,
  opciones,
  onChange,
  disabled = false,
  title,
  className = "",
  fullWidth = false,
}: {
  valor: string;
  opciones: readonly SegmentadoOpcion[];
  onChange: (valor: string) => void;
  /** Bloquea TODO el grupo (p.ej. tipo de ítem mientras no se elige IVA, o
      estado de la super administradora). El motivo va en `title`. */
  disabled?: boolean;
  /** Texto al pasar el cursor sobre una opción bloqueada del grupo. */
  title?: string;
  className?: string;
  /** Ocupa todo el ancho disponible y reparte las opciones por igual. */
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`${
        fullWidth ? "flex w-full" : "inline-flex flex-wrap"
      } gap-1 p-1 bg-muted border border-border rounded-xl ${className}`}
    >
      {opciones.map((op) => {
        const elegida = valor === op.valor;
        const bloqueada = disabled || !!op.deshabilitada;
        // El tooltip vive en el <span> envoltorio (mismo motivo que el bloque
        // IVA): un <button disabled> no muestra su propio title.
        const tooltip = op.titulo ?? (bloqueada ? title : undefined);

        return (
          <span
            key={op.valor}
            title={tooltip}
            className={fullWidth ? "flex-1 min-w-0" : ""}
          >
            <button
              type="button"
              onClick={() => !bloqueada && onChange(op.valor)}
              aria-pressed={elegida}
              disabled={bloqueada}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                fullWidth ? "w-full" : ""
              } ${
                elegida
                  ? "bg-primary text-white shadow-sm"
                  : bloqueada
                    ? "bg-background text-muted-foreground/50 cursor-not-allowed"
                    : "text-muted-foreground hover:bg-background cursor-pointer"
              }`}
            >
              {op.etiqueta}
            </button>
          </span>
        );
      })}
    </div>
  );
}
