import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Botón "Volver arriba" del catálogo público. Se ancla a `document.body` con
// un portal porque la pantalla se monta dentro de un `motion.div` con
// `transform`: un `position: fixed` dentro de un ancestro transformado se
// posiciona contra ese ancestro, no contra la ventana, y el botón acabaría
// bajando con el contenido en vez de quedarse pegado a la pantalla.
export function VolverArriba() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const inicio = document.getElementById("catalogo-inicio");
    if (!inicio) return;
    // El margen inferior deja el botón oculto hasta que también sale de vista
    // la fila del buscador y los filtros, que van justo debajo del título.
    const io = new IntersectionObserver(
      ([e]) => setVisible(!e.isIntersecting),
      { rootMargin: "0px 0px 220px 0px" },
    );
    io.observe(inicio);
    return () => io.disconnect();
  }, []);

  const irArriba = () => {
    const inicio = document.getElementById("catalogo-inicio");
    // El navbar es `fixed`, así que se resta su altura: sin esto el bloque
    // superior queda por debajo del navbar en vez de justo debajo de él. La
    // posición se mide con el rect más el scroll y no con `offsetTop`, que
    // depende del `offsetParent` y del `translateY` del contenedor animado.
    const navbar = document.querySelector<HTMLElement>("header.fixed");
    const navH = navbar ? navbar.getBoundingClientRect().height : 0;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const destino = inicio
      ? window.scrollY + inicio.getBoundingClientRect().top - navH
      : 0;
    window.scrollTo({
      top: Math.max(0, destino),
      behavior: suave ? "smooth" : "auto",
    });
  };

  return createPortal(
    <button
      type="button"
      onClick={irArriba}
      aria-label="Volver arriba"
      title="Volver arriba"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed right-4 bottom-20 md:bottom-6 z-30 w-12 h-12 rounded-full inline-flex items-center justify-center bg-primary text-primary-foreground shadow-lg shadow-black/20 hover:bg-primary/90 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      <ArrowUp className="w-5 h-5" />
    </button>,
    document.body,
  );
}
