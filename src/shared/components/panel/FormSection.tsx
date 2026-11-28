import type { ReactNode } from "react";

/** Tarjeta de formulario con título numerado: «1 · ¿Quién compra?». */
export function SeccionFormulario({
  numero,
  titulo,
  ayuda,
  plano = false,
  children,
}: {
  numero?: number;
  titulo: string;
  ayuda?: string;
  /** Sin tarjeta propia: subtítulo + línea divisoria, para ir dentro de un recuadro. */
  plano?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={plano ? "pn-seccion pn-seccion--plana" : "pn-seccion"}>
      <h2>{numero !== undefined ? `${numero} · ${titulo}` : titulo}</h2>
      {ayuda && <p className="pn-seccion__ayuda">{ayuda}</p>}
      {children}
    </section>
  );
}

/** Grilla responsive para los campos de una sección. */
export function GrillaCampos({ children }: { children: ReactNode }) {
  return <div className="pn-grilla">{children}</div>;
}
