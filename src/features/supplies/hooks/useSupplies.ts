import { useState, useMemo } from "react";
import { ordenarPorIdDescendente } from "@/shared/utils/sortById";
import { estadoStock, PER_PAGE } from "@/features/supplies/pages/SuppliesScreen";
import type { GestionInsumosScreen } from "@/features/supplies/pages/SuppliesScreen";

const formatearId = (id: string): string => {
  const match = id.match(/(\d+)$/);
  return match ? match[1] : id;
};

/** Búsqueda, filtros, paginación y stock bajo de insumos. */
export function useSupplies(insumos: Parameters<typeof GestionInsumosScreen>[0]["insumos"], categoriaNombre: (id: string) => string) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "activos" | "inactivos">("todos");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "insumos" | "productos">("todos");
  // A5.5 — Aviso de stock bajo: al apretar el aviso el listado queda
  // mostrando SOLO esos insumos; el segundo clic lo apaga (el aviso se
  // mantiene visible mientras el filtro esté activo, para poder salir).
  const [filtroStockBajo, setFiltroStockBajo] = useState(false);
  /** Filtro por categoría (botones de la lista). "" = todas. */
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = insumos;
    if (filtroEstado === "activos") result = result.filter(i => i.estado === "activo");
    if (filtroEstado === "inactivos") result = result.filter(i => i.estado === "inactivo");
    if (filtroTipo === "insumos") result = result.filter(i => i.tipo !== "ProductoInsumo");
    if (filtroTipo === "productos") result = result.filter(i => i.tipo === "ProductoInsumo");
    // A5.5: filtro del aviso de stock bajo (solo activos, igual que el aviso).
    if (filtroStockBajo)
      result = result.filter(i => i.estado === "activo" && estadoStock(i) !== "ok");
    if (filtroCategoria) result = result.filter(i => i.categoriaId === filtroCategoria);
    if (q) {
      result = result.filter(i =>
        i.nombre.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        formatearId(i.id).includes(q) ||
        categoriaNombre(i.categoriaId).toLowerCase().includes(q)
      );
    }
    return ordenarPorIdDescendente(result, (insumo) => insumo.id);
  }, [insumos, search, filtroEstado, filtroTipo, filtroStockBajo, filtroCategoria]);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  /** A5.5 — Insumos activos que hoy están en "Sin stock" o "Stock bajo":
      los que cuentan el aviso del listado y los que muestra su filtro. */
  const insumosStockBajo = useMemo(
    () => insumos.filter(i => i.estado === "activo" && estadoStock(i) !== "ok"),
    [insumos],
  );

  return { search, setSearch, page, setPage, filtroEstado, setFiltroEstado, filtroTipo, setFiltroTipo, filtroStockBajo, setFiltroStockBajo, filtroCategoria, setFiltroCategoria, filtered, paged, insumosStockBajo };
}
