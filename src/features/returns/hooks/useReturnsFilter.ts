import { useState } from "react";
import { REGISTROS_POR_PAGINA } from "@/shared/components/panel/LargePaginator";
import { normalizarTexto } from "@/shared/utils/names";
import { compararIdsDesc } from "@/shared/utils/sortById";
import { etiquetaEstadoDev } from "@/features/returns/utils/returns";
import type { Venta } from "@/features/sales/utils/sales";

/** Búsqueda, filtro y paginación de la lista de devoluciones. */
export function useReturnsFilter(pendientes: Venta[], resueltas: Venta[]) {
  // Buscador del listado (mismo SearchInput que Ventas, Proveedores, etc.).
  // Filtra en tiempo real sobre los campos que se ven en la fila (número de
  // venta, cliente, fecha, productos, pago y estado), sin distinguir mayúsculas
  // ni tildes. El contador del header sigue contando el total, no el filtrado.
  const [search, setSearchValor] = useState("");
  /** Botones de la lista: sin resolver, resueltas o todas. */
  const [chipDev, setChipValor] = useState("pendientes");
  const [page, setPage] = useState(1);
  // Buscar o cambiar de filtro vuelve a la primera página.
  const setSearch = (valor: string) => { setSearchValor(valor); setPage(1); };
  const setChipDev = (valor: string) => { setChipValor(valor); setPage(1); };
  const busqueda = normalizarTexto(search);
  const visibles = (() => {
    const ordenadas = chipDev === "pendientes" ? pendientes : chipDev === "resueltas" ? resueltas : [...pendientes, ...resueltas];
    if (!busqueda) return ordenadas;
    return ordenadas.filter((dev) =>
      normalizarTexto(
        [
          `#${dev.id}`,
          dev.id,
          dev.usuario,
          dev.fecha,
          dev.productos,
          dev.metodoPago ?? "",
          dev.metodoReembolso ?? "",
          etiquetaEstadoDev(dev),
        ].join(" "),
      ).includes(busqueda),
    );
  })().sort((a, b) => {
    if (a.idDevolucion != null && b.idDevolucion != null) {
      return compararIdsDesc(a.idDevolucion, b.idDevolucion);
    }
    const porFecha = (b.devolucionFecha ?? b.fecha).localeCompare(a.devolucionFecha ?? a.fecha);
    return porFecha || compararIdsDesc(a.idDevolucion ?? 0, b.idDevolucion ?? 0);
  });

  // Si la lista se acorta (al resolver una), no queda en una página vacía.
  const pageActual = Math.min(page, Math.max(1, Math.ceil(visibles.length / REGISTROS_POR_PAGINA)));
  const paged = visibles.slice((pageActual - 1) * REGISTROS_POR_PAGINA, pageActual * REGISTROS_POR_PAGINA);

  return { search, setSearch, chipDev, setChipDev, visibles, paged, pageActual, setPage };
}
