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

/** Pantallas de dos paneles (hacer un pedido y anotar una factura): formulario
 *  a la izquierda y lista a la derecha desde 1200px; por debajo se apilan. El
 *  alto y las tarjetas de celular están en panel.css (`.pn-pedido`). */
export const CLASES_DOS_PANELES = {
  pagina: "pn-pedido pn-pagina-con-barra",
  interior: "w-full min-[1200px]:h-full",
  caja: "min-[1200px]:h-full min-[1200px]:min-h-0",
  cuerpo: "pt-3 grid grid-cols-[minmax(0,1fr)] gap-4 min-[1200px]:flex-1 min-[1200px]:min-h-0 min-[1200px]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] min-[1200px]:grid-rows-[minmax(0,1fr)]",
  formulario: "pn-pedido__form min-w-0 flex flex-col gap-4 p-4 bg-card border border-border rounded-2xl min-[1200px]:min-h-0 min-[1200px]:overflow-y-auto",
  lista: "min-w-0 flex flex-col bg-card border border-border rounded-2xl overflow-hidden min-[1200px]:min-h-0",
};

/** Título y contador del panel de la lista. */
export function CabeceraLista({ titulo, contador }: { titulo: string; contador: ReactNode }) {
  return (
    <div className="shrink-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 border-b border-border">
      <h2 className="text-xl font-bold m-0">{titulo}</h2>
      <span className="text-base font-medium text-muted-foreground">{contador}</span>
    </div>
  );
}

/** Celular: total y acciones fijos abajo. */
export function BarraTotalCelular({
  etiqueta,
  total,
  children,
}: {
  etiqueta: string;
  total: string;
  children: ReactNode;
}) {
  return (
    <div className="pn-barra-guardar pn-pedido__barra">
      <p className="pn-barra-guardar__total">
        <span>{etiqueta}</span>
        <strong>{total}</strong>
      </p>
      <div className="pn-barra-guardar__botones">{children}</div>
    </div>
  );
}
