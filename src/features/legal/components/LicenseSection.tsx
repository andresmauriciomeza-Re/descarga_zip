import type { ReactNode } from "react";
import { CLASE_ENLACE } from "@/features/legal/utils/legal";
import { SECCIONES } from "@/features/legal/data/licenses";

export function EnlaceExterno({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={CLASE_ENLACE}>
      {children}
      <span className="sr-only"> (se abre en una pestaña nueva)</span>
    </a>
  );
}

export function Seccion({ indice, children }: { indice: number; children: ReactNode }) {
  const { id, titulo } = SECCIONES[indice];
  return (
    <section
      id={id}
      tabIndex={-1}
      aria-labelledby={`${id}-titulo`}
      className="scroll-mt-24 border-t border-border py-8 first:border-t-0 first:pt-0 focus:outline-none"
    >
      <h2 id={`${id}-titulo`} className="mb-4 text-xl text-foreground">
        {titulo}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
