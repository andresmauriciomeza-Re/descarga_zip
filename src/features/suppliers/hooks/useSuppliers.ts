import { useEffect, useState, useMemo } from "react";
import { ordenarPorIdDescendente } from "@/shared/utils/sortById";
import { INITIAL_SUPPLIERS, type Supplier } from "@/features/suppliers/utils/suppliers";
import type React from "react";
import type { ProveedorRef } from "@/features/purchase-orders/utils/purchase-orders";

/** Lista de proveedores (global o local), búsqueda y paginación. */
export function useSuppliers(proveedoresProp: ProveedorRef[] | undefined, setProveedoresProp: React.Dispatch<React.SetStateAction<ProveedorRef[]>> | undefined) {
  // Usar el estado global de proveedores si está disponible, si no, usar datos locales
  const [suppliersLocal, setSuppliersLocal] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const suppliers = proveedoresProp ?? suppliersLocal;
  const setSuppliers = setProveedoresProp ?? setSuppliersLocal;
  const [search,    setSearch]    = useState("");
  const [page, setPage] = useState(1);
  // 5 proveedores por página (unificado con el resto de listados).
  const PER_PAGE = 10;
  // Nota: La lógica anterior que consultaba si el proveedor tenía compras u
  // órdenes asociadas para decidir si se podían editar el NIT y el nombre fue
  // eliminada. Ahora el NIT y el nombre NUNCA se pueden editar después de creado
  // el proveedor, tenga o no compras u órdenes asociadas.

  const filtered = useMemo(
    () => ordenarPorIdDescendente(suppliers.filter(s =>
      s.nombre.toLowerCase().includes(search.toLowerCase()) ||
      s.nit.toLowerCase().includes(search.toLowerCase()) ||
      // Los campos de contacto son opcionales en el modelo (Persona Natural no
      // los pide): se buscan sobre "" para no romper con un registro sin ellos.
      (s.telefono ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.asesorComercial ?? "").toLowerCase().includes(search.toLowerCase()) ||
      s.estado.toLowerCase().includes(search.toLowerCase())
    ), (supplier) => supplier.id),
    [suppliers, search],
  );
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  // Página efectiva recortada al rango: si el total baja (borrado o filtro),
  // `page` puede quedar fuera de rango durante un render y la tabla saldría
  // vacía. Así nunca se pinta una página inexistente.
  const pageActual = Math.min(Math.max(page, 1), Math.max(1, totalPages));
  const paged = filtered.slice((pageActual - 1) * PER_PAGE, pageActual * PER_PAGE);
  // Si el buscador o un borrado reducen el total, `page` puede quedar apuntando
  // más allá de la última página: la tabla salía vacía sin mensaje de "sin
  // resultados" y "Siguiente" ya no avanzaba (hacía `min(totalPages, p + 1)`).
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  return { suppliers, setSuppliers, search, setSearch, setPage, PER_PAGE, filtered, pageActual, paged };
}
