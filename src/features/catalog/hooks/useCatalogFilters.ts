import { useEffect, useMemo } from "react";
import { estadoDeProducto, productoDisponible, type Product } from "@/shared/utils/catalog";
import { normalizarNombre } from "@/features/production-orders/utils/production-orders";
import type { CategoriaProducto } from "@/features/product-categories/utils/product-categories";

/** Filtro por categoría, búsqueda y paginación del menú. */
export function useCatalogFilters(productos: Product[], categorias: CategoriaProducto[], isMobile: boolean, categoria: string | null, search: string, page: number, setPage: (p: number | ((prev: number) => number)) => void) {
  const productosSeguros = Array.isArray(productos) ? productos : [];
  const categoriasSeguras = Array.isArray(categorias) ? categorias : [];
  // 9 = 3 columnas del grid, así cada página cierra en filas completas.
  // En móvil: 6 por página (2 columnas de 3).
  const PER_PAGE = isMobile ? 6 : 9;
  // Productos que el menú público SÍ muestra: los descontinuados se ocultan
  // en todos los lugares del menú (catálogo, favoritas y detalle). Los
  // botones de filtro se derivan de esta misma lista, así una categoría cuyo
  // único producto se descontinuó deja de ofrecer su filtro vacío.
  const visibles = useMemo(
    () => productosSeguros.filter((p) => estadoDeProducto(p) !== "Descontinuado"),
    [productosSeguros],
  );
  // Botones de filtro. Se derivan de los PRODUCTOS que se están listando y no
  // de la lista de categorías del admin: así, aunque una categoría se haya
  // guardado con otro id o quede marcada como inactiva en localStorage, el menú
  // siempre muestra sus botones (antes no salía ninguno y solo se veía "Todas").
  const filtros = useMemo(() => {
    const porId = new Map<string, string>();
    visibles.forEach((p) => {
      const id = p.idCategoria ?? "";
      if (!id || porId.has(id)) return;
      const nombre =
        categoriasSeguras.find((c) => c.id === id)?.nombre ||
        p.category ||
        "Otros";
      porId.set(id, nombre);
    });
    return [...porId.entries()].map(([id, nombre]) => ({ id, nombre }));
  }, [visibles, categoriasSeguras]);
  const filtroActivo = categoria === "Todas" ? undefined : filtros.find((f) =>
    f.id === categoria || normalizarNombre(f.nombre) === normalizarNombre(categoria ?? "Pizzas"));
  const cat = categoria === "Todas" ? "Todas" : filtroActivo?.id ?? "Todas";
  const nombreFiltroActivo = filtroActivo?.nombre;
  // Del filtro de categoría/búsqueda salen SOLO productos visibles (sin
  // descontinuados) y ordenados: primero los disponibles y al final los no
  // disponibles, conservando el orden original dentro de cada grupo (el sort
  // de JS es estable), así "sin cambiar el resto del orden".
  const filtered = useMemo(() => {
    const porCategoriaYBusqueda = visibles.filter(
      (p) =>
        (cat === "Todas" ||
          p.idCategoria === cat ||
          (nombreFiltroActivo !== undefined && p.category === nombreFiltroActivo)) &&
        (search === "" ||
          (p.name ?? "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (p.description ?? "")
            .toLowerCase()
            .includes(search.toLowerCase())),
    );
    const peso = (p: Product) => (productoDisponible(p) ? 0 : 1);
    return [...porCategoriaYBusqueda].sort((a, b) => peso(a) - peso(b));
  }, [search, cat, nombreFiltroActivo, visibles]);
  // Sin paginado el menú volcaba los 13 productos de una vez, así que al
  // llegar a la última categoría había que hacer scroll largo para volver
  // arriba. Se corta
  // `filtered` ANTES de agrupar por secciones: de ese modo una página nunca
  // parte una sección a la mitad y los títulos siguen correspondiendo a lo que
  // hay debajo.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );
  // La página vuelve a 1 solo en los handlers de categoría y búsqueda, no en un
  // efecto de montaje: al montar, `page` puede ser 2 (guardada de una visita
  // anterior) y este efecto la borraba antes de que el usuario viera nada.
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  return { productosSeguros, PER_PAGE, filtros, cat, filtered, totalPages, paged };
}
