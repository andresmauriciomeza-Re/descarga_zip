import { useState, useMemo } from "react";
import { ordenarPorIdDescendente } from "@/shared/utils/sortById";
import { type EstadoNC, type Tipo, PER_PAGE } from "@/features/non-conforming-products/utils/non-conforming-products";
import type { NoConformidad } from "@/features/non-conforming-products/utils/non-conforming-products";

/** Búsqueda, filtros y paginación de productos no conformes. */
export function useNonConformingProducts(noConformidades: NoConformidad[]) {
  const [search, setSearch] = useState("");
  const [filterEst, setFilterEst] = useState<EstadoNC | "">("");
  /** Botón de origen: de la cocina, de un pedido o de un insumo. */
  const [filtroOrigen, setFiltroOrigen] = useState<Tipo | "">("");
  const [page, setPage] = useState(1);
  // Todo viene de la API: las pérdidas en venta son registros tipo "Venta" que
  // crea el backend al resolver una devolución con «Producto malo».
  const allItems = useMemo(() =>
    [...noConformidades]
      .sort((a, b) => {
        if (b.fechaRegistro !== a.fechaRegistro) return b.fechaRegistro.localeCompare(a.fechaRegistro);
        return parseInt(b.id, 10) - parseInt(a.id, 10);
      }),
  [noConformidades]);
  const filtered = useMemo(() =>
    ordenarPorIdDescendente(allItems.filter(i => {
      const q = search.toLowerCase();
      const matchQ = !q ||
        i.id.toLowerCase().includes(q) ||
        i.nombre.toLowerCase().includes(q) ||
        i.responsable.toLowerCase().includes(q) ||
        i.tipoNoConformidad.toLowerCase().includes(q);
      const matchEst = !filterEst || i.estado === filterEst;
      return matchQ && matchEst && (!filtroOrigen || i.tipo === filtroOrigen);
    }), (item) => item.id),
  [allItems, search, filterEst, filtroOrigen]);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return { search, setSearch, filterEst, setFilterEst, filtroOrigen, setFiltroOrigen, page, setPage, allItems, filtered, paged };
}
