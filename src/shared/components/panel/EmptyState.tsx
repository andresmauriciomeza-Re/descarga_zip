import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Pantalla sin resultados: ícono, título y una frase que dice qué hacer. */
export function VacioEstado({
  icono: Icono,
  titulo,
  children,
  accion,
}: {
  icono: LucideIcon;
  titulo: string;
  children?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <section className="pn-vacio">
      <div className="pn-vacio__icono">
        <Icono size={40} aria-hidden="true" />
      </div>
      <h2>{titulo}</h2>
      {children && <p>{children}</p>}
      {accion}
    </section>
  );
}
