import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type Opciones = {
  /** Filas por página máximo (5 por defecto). */
  max?: number;
  /** Filas por página mínimo, aunque quepan menos sin cortarse (3 por defecto). */
  min?: number;
  /** Alto de referencia cuando la tabla todavía no tiene filas medibles. */
  altoFilaRespaldo?: number;
};

/**
 * Calcula cuántas filas caben completas en el contenedor scrolleable de un
 * listado, para paginar en lugar de hacer scroll vertical.
 *
 * - Se mide con ResizeObserver sobre el contenedor (y la tabla), por eso se
 *   recalcula al redimensionar la ventana, al abrir/cerrar el menú lateral y
 *   al cambiar el zoom: todos esos gestos cambian el tamaño del contenedor.
 * - El alto de fila se toma como la fila MÁS ALTA de la página actual, para
 *   que ninguna quede cortada (hay filas de dos líneas, p. ej. proveedores).
 * - Se vuelve a medir tras cada render: si la página nueva tiene filas más
 *   altas que las que se midieron, se recorre una fila menos hasta que quepa.
 * - Si aun con el mínimo de filas el contenido desborda, se devuelve
 *   `permitirScrollY` para reactivar el scroll vertical sólo en ese caso.
 * - Con la tabla oculta (<768px, listado en tarjetas) devuelve `max`, igual
 *   que antes del cambio.
 */
export function useFilasPorPagina({
  max = 5,
  min = 3,
  altoFilaRespaldo = 64,
}: Opciones = {}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const tablaRef = useRef<HTMLTableElement | null>(null);
  const filasRef = useRef(max);
  const [filas, setFilas] = useState(max);
  const [permitirScrollY, setPermitirScrollY] = useState(false);

  const aplicarFilas = useCallback((siguiente: number) => {
    if (filasRef.current !== siguiente) {
      filasRef.current = siguiente;
      setFilas(siguiente);
    }
  }, []);

  const medir = useCallback(() => {
    const scroller = scrollerRef.current;
    const tabla = tablaRef.current;
    if (!scroller || !tabla) return;

    // Móvil: la tabla está en display:none y mandan las tarjetas.
    if (tabla.offsetParent === null) {
      setPermitirScrollY(false);
      aplicarFilas(max);
      return;
    }

    const altoThead = tabla.tHead?.getBoundingClientRect().height ?? 0;
    const cuerpo = tabla.tBodies[0];
    // La fila más alta de la página visible: con el promedio o con la primera
    // fila, una fila de dos líneas quedaba cortada al final del contenedor.
    let altoFila = 0;
    if (cuerpo) {
      for (let i = 0; i < cuerpo.rows.length; i++) {
        const alto = cuerpo.rows[i].getBoundingClientRect().height;
        if (alto > altoFila) altoFila = alto;
      }
    }
    if (altoFila <= 0) altoFila = altoFilaRespaldo;

    const disponible = scroller.clientHeight - altoThead;
    const caben = Math.floor(disponible / altoFila);
    aplicarFilas(Math.max(min, Math.min(max, caben)));
  }, [aplicarFilas, max, min, altoFilaRespaldo]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const observer = new ResizeObserver(medir);
    observer.observe(scroller);
    if (tablaRef.current) observer.observe(tablaRef.current);
    window.addEventListener("resize", medir);
    medir();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [medir]);

  // Tras cada render: se remide (el contenido de la página puede haber cambiado
  // y una fila nueva puede ser más alta) y, si aún desborda, se baja una fila.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const tabla = tablaRef.current;
    if (!scroller || !tabla) return;
    if (tabla.offsetParent === null) return;

    medir();

    if (scroller.scrollHeight > scroller.clientHeight + 1) {
      if (filasRef.current > min) aplicarFilas(filasRef.current - 1);
      else setPermitirScrollY(true);
    } else if (permitirScrollY) {
      setPermitirScrollY(false);
    }
  });

  return { scrollerRef, tablaRef, filasPorPagina: filas, permitirScrollY };
}
