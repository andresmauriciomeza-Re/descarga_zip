import { useState, useMemo } from "react";
import { ordenarPorIdDescendente } from "@/shared/utils/sortById";
import type { ProductoTerminado } from "@/features/products/pages/FinishedProductScreen";

const INITIAL_PRODUCTOS: ProductoTerminado[] = [
  { id:"ORD-001", idReceta:"REC-001", nombreReceta:"Margarita Clásica",   fechaEntrega:"2024-01-15", horaEntrega:"19:00", cantidad:20, tamano:"Mediana", estadoEntrega:"entregado", recalentado:true,  fechaEntregaReal:"2024-01-15" },
  { id:"ORD-002", idReceta:"REC-002", nombreReceta:"Pepperoni Premium",   fechaEntrega:"2024-01-15", horaEntrega:"20:30", cantidad:15, tamano:"Grande", estadoEntrega:"listo" },
  { id:"ORD-003", idReceta:"REC-003", nombreReceta:"Cuatro Quesos",       fechaEntrega:"2024-01-16", horaEntrega:"18:00", cantidad:10, tamano:"Mediana", estadoEntrega:"listo" },
  { id:"ORD-005", idReceta:"REC-005", nombreReceta:"Veggie Mediterránea", fechaEntrega:"2024-01-17", horaEntrega:"19:30", cantidad:8,  tamano:"Grande", estadoEntrega:"listo" },
];

const PER_PAGE = 5;

/** Productos terminados: búsqueda, paginación y conteos. */
export function useFinishedProducts() {
  const [productos, setProductos] = useState<ProductoTerminado[]>(INITIAL_PRODUCTOS);
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(1);
  const filtered = useMemo(() =>
    ordenarPorIdDescendente(productos.filter(p =>
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.nombreReceta.toLowerCase().includes(search.toLowerCase())
    ), (producto) => producto.id), [productos, search]);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const listos    = productos.filter(p => p.estadoEntrega === "listo").length;
  const entregados = productos.filter(p => p.estadoEntrega === "entregado").length;

  return { productos, setProductos, search, setSearch, page, setPage, filtered, totalPages, paged, listos, entregados };
}
