import { useState } from "react";
import { normalizarTexto } from "@/shared/utils/names";
import { compararIdsDesc } from "@/shared/utils/sortById";
import { etiquetaEstadoDev } from "@/features/returns/pages/ReturnsScreen";
import type { Venta } from "@/features/sales/pages/SalesScreen";

/** Búsqueda y filtro de la lista de devoluciones. */
export function useReturnsFilter(pendientes: Venta[], resueltas: Venta[]) {
  // Buscador del listado (mismo SearchInput que Ventas, Proveedores, etc.).
  // Filtra en tiempo real sobre los campos que se ven en la fila (número de
  // venta, cliente, fecha, productos, pago y estado), sin distinguir mayúsculas
  // ni tildes. El contador del header sigue contando el total, no el filtrado.
  const [search, setSearch] = useState("");
  /** Botones de la lista: sin resolver, resueltas o todas. */
  const [chipDev, setChipDev] = useState("pendientes");
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

  return { search, setSearch, chipDev, setChipDev, visibles };
}
