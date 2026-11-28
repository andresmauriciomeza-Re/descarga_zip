import { Package } from "lucide-react";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";

export function TarjetaIndicador({
  label,
  value,
  sub,
  Icon,
  onClick,
  enlace,
  alerta,
}: {
  label: string;
  value: string;
  sub: string;
  Icon: typeof Package;
  /** Ya no se usan (la tarjeta nueva usa los colores del panel); se aceptan por compatibilidad. */
  bg?: string;
  ic?: string;
  onClick?: () => void;
  /** Texto del botón-enlace («Ver las ventas»). */
  enlace?: string;
  /** Tarjeta en ámbar (hay algo que atender). */
  alerta?: boolean;
}) {
  return (
    <article className={`pn-kpi${alerta ? " pn-kpi--alerta" : ""}`}>
      <p className="pn-kpi__valor">{value}</p>
      <p className="pn-kpi__etiqueta">
        <Icon size={22} aria-hidden="true" className="shrink-0" />
        <span>{label}</span>
      </p>
      <p className="pn-kpi__sub">{sub}</p>
      {onClick && enlace && (
        <BotonAccion variante="normal" onClick={onClick}>
          {enlace} ›
        </BotonAccion>
      )}
    </article>
  );
}
