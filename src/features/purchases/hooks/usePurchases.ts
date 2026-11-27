import { useState, useMemo, useEffect } from "react";
import { ordenarPorIdDescendente } from "@/shared/utils/sortById";
import type { GestionCompraScreen } from "@/features/purchases/pages/PurchasesScreen";

/** Búsqueda, filtro y paginación de compras. */
export function usePurchases(ordenes: Parameters<typeof GestionCompraScreen>[0]["ordenes"], gestiones: Parameters<typeof GestionCompraScreen>[0]["gestiones"]) {
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  /** Botones de filtro de la lista: todas, recibidas o anuladas. */
  const [chipEstado, setChipEstado] = useState("todas");
  // Se declara antes del `useMemo` de abajo porque la fábrica lo invoca durante
  // el render; como `const`, usarla desde allí la lanzaba en TDZ
  // ("Cannot access 'getOrden' before initialization") al escribir en el buscador.
  const getOrden = (oid: string) => ordenes.find(o => o.id === oid);
  const filtered = useMemo(() =>
    ordenarPorIdDescendente(gestiones.filter(g => {
      if (chipEstado !== "todas" && g.estado !== chipEstado) return false;
      const q = search.toLowerCase();
      if (!q) return true;
      // Proveedor vacío ⇒ cadena vacía: el `?? ""` evita el `undefined`.
      const proveedor = g.proveedor ?? "";
      return proveedor.toLowerCase().includes(q)
        || g.numeroFactura.toLowerCase().includes(q)
        || (g.ordenId ?? "").toLowerCase().includes(q)
        || g.estado.toLowerCase().includes(q);
    }), (gestion) => gestion.id),
    [gestiones, search, chipEstado]);
  // Filas por página según el alto disponible (ResizeObserver): la tabla nunca
  // hace scroll vertical, se pagina. Con la tabla oculta (<768px) queda en 5.
  const PER_PAGE = 10;
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageActual = Math.min(Math.max(page, 1), Math.max(1, totalPages));
  const paged = filtered.slice((pageActual - 1) * PER_PAGE, pageActual * PER_PAGE);
  // Si al recalcular filas por página la página actual queda fuera de rango,
  // se salta a la última página válida.
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  return { search, setSearch, setPage, chipEstado, setChipEstado, getOrden, filtered, PER_PAGE, pageActual, paged };
}
