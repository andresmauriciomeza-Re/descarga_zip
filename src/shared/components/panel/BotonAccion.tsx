import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type VarianteBoton = "principal" | "normal" | "peligro" | "bien" | "oscuro";

type Comun = {
  variante?: VarianteBoton;
  /** Ícono lucide opcional, siempre a la izquierda del texto. */
  icono?: LucideIcon;
  children: ReactNode;
  className?: string;
};
type ComoBoton = Comun & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & { href?: undefined };
type ComoEnlace = Comun & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className"> & { href: string };

/** Botón grande con texto siempre visible. Con `href` se pinta como enlace. */
export function BotonAccion(props: ComoBoton | ComoEnlace) {
  const { variante = "normal", icono: Icono, children, className = "", ...resto } = props;
  const clases = `pn-boton pn-boton--${variante} ${className}`.trim();
  const contenido = (
    <>
      {Icono && <Icono size={22} aria-hidden="true" />}
      <span>{children}</span>
    </>
  );
  if ("href" in resto && resto.href !== undefined) {
    return (
      <a className={clases} {...(resto as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {contenido}
      </a>
    );
  }
  const { type = "button", ...b } = resto as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} className={clases} {...b}>
      {contenido}
    </button>
  );
}
