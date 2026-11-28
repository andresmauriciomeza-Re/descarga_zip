import { useState, useMemo } from "react";
import { ordenarPorIdDescendente } from "@/shared/utils/sortById";
import { type TipoOrden, type EstadoOrden, PER_PAGE } from "@/features/production-orders/utils/production-orders";
import type { OrdenProduccion } from "@/features/production-orders/utils/production-orders";

/** Búsqueda, filtros y paginación de órdenes de producción. */
export function useProductionOrders(ordenes: OrdenProduccion[]) {
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | TipoOrden>("todos");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | EstadoOrden>("todos");
  const [page, setPage] = useState(1);
  const filtradas = useMemo(() =>
    ordenarPorIdDescendente(ordenes.filter((o) => {
      if (filtroTipo !== "todos" && o.tipo !== filtroTipo) return false;
      if (filtroEstado !== "todos" && o.estadoOrden !== filtroEstado) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return o.id.toLowerCase().includes(q)
        || (o.ventaNumero ?? "").toLowerCase().includes(q)
        || (o.cliente ?? "").toLowerCase().includes(q)
        || o.lineas.some((l) => l.nombre.toLowerCase().includes(q));
    }), (orden) => orden.id),
    [ordenes, search, filtroTipo, filtroEstado]);
  const totalPages = Math.ceil(filtradas.length / PER_PAGE);
  const paged = filtradas.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return { search, setSearch, filtroTipo, setFiltroTipo, filtroEstado, setFiltroEstado, page, setPage, filtradas };
}
