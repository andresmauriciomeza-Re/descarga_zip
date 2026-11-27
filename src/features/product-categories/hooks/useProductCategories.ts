import { useEffect, useState, useMemo } from "react";
import { ordenarPorIdDescendente } from "@/shared/utils/sortById";
import type { CategoriaProductoScreen } from "@/features/product-categories/pages/ProductCategoriesScreen";

/** Búsqueda y paginación de categorías de producto. */
export function useProductCategories(categorias: Parameters<typeof CategoriaProductoScreen>[0]["categorias"]) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;
  const filtered = useMemo(
    () =>
      ordenarPorIdDescendente(categorias.filter(
        (c) =>
          c.id.toLowerCase().includes(search.toLowerCase()) ||
          c.nombre.toLowerCase().includes(search.toLowerCase()),
      ), (categoria) => categoria.id),
    [categorias, search],
  );
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

  return { search, setSearch, page, setPage, PER_PAGE, filtered, totalPages, paged };
}
