import type { ReactNode } from "react";
import type { TonoPill } from "@/shared/components/panel/StatusPill";

const COLOR_TONO: Record<TonoPill, string> = {
  verde: "var(--verde-texto)",
  ambar: "var(--ambar-borde)",
  azul: "var(--azul-texto)",
  rojo: "var(--rojo)",
  gris: "var(--gris-texto)",
  morado: "var(--morado-texto)",
};

/** Reemplaza una fila de tabla: identificación, 1 a 3 datos, estado y acciones. */
export function TarjetaFila({
  avatar,
  centro,
  pre,
  nombre,
  detalle,
  datos = [],
  estado,
  acciones,
  resaltada,
}: {
  /** Círculo con iniciales u otra imagen, a la izquierda de todo. */
  avatar?: ReactNode;
  /** Bloque ancho en medio de la tarjeta (p. ej. una barra de stock). */
  centro?: ReactNode;
  /** Texto pequeño sobre el nombre (p. ej. «Orden #12»). */
  pre?: ReactNode;
  nombre: ReactNode;
  detalle?: ReactNode;
  datos?: { etiqueta: string; valor: ReactNode }[];
  /** Normalmente un <EstadoPill>. */
  estado?: ReactNode;
  /** Botones en columna: el principal arriba, «Ver …» debajo. */
  acciones?: ReactNode;
  /** Borde de 3px del color del estado. */
  resaltada?: TonoPill;
}) {
  return (
    <article
      className={`pn-fila${resaltada ? " pn-fila--resaltada" : ""}`}
      style={resaltada ? { borderColor: COLOR_TONO[resaltada] } : undefined}
    >
      {avatar}
      <div className="pn-fila__id">
        {pre && <div className="pn-fila__pre">{pre}</div>}
        <div className="pn-fila__nombre">{nombre}</div>
        {detalle && <div className="pn-fila__detalle">{detalle}</div>}
      </div>
      {centro && <div className="pn-fila__centro">{centro}</div>}
      {datos.slice(0, 3).map((d) => (
        <dl key={d.etiqueta} className="pn-fila__dato" style={{ margin: 0 }}>
          <dt>{d.etiqueta}</dt>
          <dd>{d.valor}</dd>
        </dl>
      ))}
      {estado && <div>{estado}</div>}
      {acciones && <div className="pn-fila__acciones">{acciones}</div>}
    </article>
  );
}
