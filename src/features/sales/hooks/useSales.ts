import { useEffect, useState, useMemo } from "react";
import { etiquetaEstadoVenta } from "@/features/sales/utils/sales";
import type { Venta } from "@/features/sales/utils/sales";

/** Búsqueda, filtro y paginación de ventas. */
export function useSales(pedidos: Venta[]) {
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;
  const filtered = useMemo(() => {
    const termino = search.toLowerCase();
    return pedidos.filter((p) =>
      (!estadoFiltro || p.estado === estadoFiltro) &&
      [p.id, p.usuario, p.productos, etiquetaEstadoVenta(p)].some(
        (valor) => valor.toLowerCase().includes(termino),
      ),
    );
  }, [pedidos, search, estadoFiltro]);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE,
  );
  // Si el buscador o un borrado reducen el total, `page` puede quedar apuntando
  // más allá de la última página: la tabla salía vacía sin mensaje de "sin
  // resultados" y "Siguiente" ya no avanzaba (hacía `min(totalPages, p + 1)`).
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  return { search, setSearch, estadoFiltro, setEstadoFiltro, page, setPage, PER_PAGE, filtered, paged };
}
