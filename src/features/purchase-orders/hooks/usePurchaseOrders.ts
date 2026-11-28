import { useState, useMemo, useEffect } from "react";
import { ordenarPorIdDescendente } from "@/shared/utils/sortById";
import { claveEstado } from "@/features/purchase-orders/utils/purchase-orders";
import type React from "react";
import type { GestionCompra, OrdenCompra, ProveedorRef } from "@/features/purchase-orders/utils/purchase-orders";

/** Búsqueda, filtro y paginación de órdenes de compra. */
export function usePurchaseOrders(gestiones: GestionCompra[], ordenes: OrdenCompra[], proveedores: ProveedorRef[], page: number, setPage: React.Dispatch<React.SetStateAction<number>>) {
  const [search, setSearch] = useState("");
  /** Botones de filtro de la lista: todas, por llegar (Enviado), sin enviar (Borrador)… */
  const [chipEstado, setChipEstado] = useState("todas");
  const getFacturas = (oid: string) => gestiones.filter((g) => g.ordenId === oid && (g.numeroFactura ?? "") !== "");
  const filtered = useMemo(() =>
    ordenarPorIdDescendente(ordenes.filter(o => {
      if (chipEstado !== "todas" && claveEstado(o.estado) !== chipEstado) return false;
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const facturas = getFacturas(o.id);
      const facturasTexto = [...(o.facturas ?? []), ...facturas.map(f => f.numeroFactura ?? "")].join(" ");
      // Find provider NIT
      const prov = proveedores.find(p => p.nombre === o.proveedor);
      const nit = o.proveedorNit || prov?.nit || "";
      return (o.proveedor ?? "").toLowerCase().includes(q)
        || (o.id ?? "").toLowerCase().includes(q)
        || nit.toLowerCase().includes(q)
        || facturasTexto.toLowerCase().includes(q)
        || (o.estado ?? "").toLowerCase().includes(q)
        || (o.fecha ?? "").toLowerCase().includes(q);
    }), (orden) => orden.id),
    [ordenes, search, gestiones, proveedores, chipEstado]);
  // Filas por página según el alto disponible (ResizeObserver): la tabla nunca
  // hace scroll vertical, se pagina. Con la tabla oculta (<768px) queda en 5.
  const PER_PAGE = 10;
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageActual = Math.min(Math.max(page, 1), Math.max(1, totalPages));
  const paged = filtered.slice((pageActual - 1) * PER_PAGE, pageActual * PER_PAGE);
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [setPage, totalPages]);

  return { search, setSearch, chipEstado, setChipEstado, getFacturas, filtered, PER_PAGE, pageActual, paged };
}
