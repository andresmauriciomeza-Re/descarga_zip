import { useState, useMemo, useEffect } from "react";
import { listarClientes, type ClienteListadoApi } from "@/shared/services/authService";
import { ordenarPorIdDescendente } from "@/shared/utils/sortById";
import { type Cliente, AVATAR_COLORS } from "@/features/customers/pages/CustomersScreen";

function adaptarClienteApi(c: ClienteListadoApi, index: number): Cliente {
  const nombre = c.nombre ?? "";
  return {
    id: String(c.id_cliente), nombre,
    iniciales: nombre.trim().split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase(),
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length], correo: c.correo ?? "",
    tipoDocumento: c.tipo_documento ?? "", numeroDocumento: String(c.id_usuario),
    telefono: c.telefono ?? "", pedidos: Number(c.pedidos ?? 0), activo: c.cliente_estado && c.usuario_estado,
  };
}

/** Carga, búsqueda, filtro, orden y paginación de clientes. */
export function useCustomers() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const cargarClientes = async () => {
    setCargando(true); setErrorCarga("");
    try {
      const filas = await listarClientes();
      const cargados = filas.map(adaptarClienteApi);
      setClientes(cargados);
    } catch (error) {
      setErrorCarga(error instanceof Error ? error.message : "No se pudieron cargar los clientes.");
    } finally { setCargando(false); }
  };
  useEffect(() => { void cargarClientes(); }, []);
  const [search,       setSearch]     = useState("");
  const [filterEstado, setFiltro]     = useState("todos");
  const [sortBy,       setSortBy]     = useState("id");
  const [page,         setPage]       = useState(1);
  const total   = clientes.length;
  const activos = clientes.filter(c => c.activo).length;
  const inact   = clientes.filter(c => !c.activo).length;
  const filtered = useMemo(() => {
    let r = clientes.filter(c => {
      const q = search.toLowerCase();
      const matchQ = !q ||
        c.nombre.toLowerCase().includes(q) ||
        c.correo.toLowerCase().includes(q) ||
        c.numeroDocumento.toLowerCase().includes(q) ||
        `${c.tipoDocumento} ${c.numeroDocumento}`.toLowerCase().includes(q);
      const matchE = filterEstado === "todos" || (filterEstado === "activo" ? c.activo : !c.activo);
      return matchQ && matchE;
    });
    // El orden nunca depende de `activo`: con el filtro en "Todos los estados"
    // los activos y los inactivos quedan intercalados según el criterio elegido.
    // El desempate alfabético mantiene el orden determinista si dos clientes
    // tienen los mismos pedidos.
    if (sortBy === "pedidos") r = [...r].sort((a,b) => b.pedidos - a.pedidos || a.nombre.localeCompare(b.nombre));
    else if (sortBy === "nombre") r = [...r].sort((a,b) => a.nombre.localeCompare(b.nombre));
    return sortBy === "id" ? ordenarPorIdDescendente(r, (cliente) => cliente.id) : r;
  }, [clientes, search, filterEstado, sortBy]);
  // 5 clientes por página (unificado con el resto de listados): la tabla
  // nunca lleva scroll interno, la navegación es solo por el paginador.
  const PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  // La página efectiva nunca puede pasar de totalPages: si el conjunto filtrado
  // se reduce (p. ej. al apagar un switch con un filtro de estado activo) `page`
  // quedaría fuera de rango, la tabla saldría vacía y la paginación se ocultaría,
  // dejando al usuario sin forma de volver.
  const pageActual = Math.min(page, totalPages);
  const paged      = filtered.slice((pageActual-1)*PER_PAGE, pageActual*PER_PAGE);

  return { clientes, cargando, errorCarga, cargarClientes, search, setSearch, filterEstado, setFiltro, sortBy, setSortBy, setPage, total, inact, filtered, PER_PAGE, pageActual, paged };
}
