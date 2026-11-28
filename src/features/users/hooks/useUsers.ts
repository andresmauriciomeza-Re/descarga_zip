import { useEffect, useMemo, useState } from "react";
import { listarUsuarios } from "@/shared/services/authService";
import { ordenarPorIdDescendente } from "@/shared/utils/sortById";
import type { UsuarioListadoApi } from "@/shared/services/authService";
import { type UsuarioGestion, normalizar } from "@/features/users/utils/users";

function adaptarUsuarioApi(u: UsuarioListadoApi, index: number): UsuarioGestion {
  const nombre = u.nombre ?? "";
  return {
    ...u,
    id: String(u.id_usuario),
    nombre,
    correo: u.correo ?? "",
    telefono: u.telefono ?? "",
    tipo_documento: u.tipo_documento ?? "",
    iniciales: nombre.trim().split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase(),
    avatarColor: ["bg-red-500", "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500"][index % 8],
    rolesExtra: Array.isArray(u.rolesExtra) ? u.rolesExtra : [],
    esCliente: Boolean(u.esCliente),
    esEmpleado: Boolean(u.esEmpleado),
    esSuperAdmin: Boolean(u.esSuperAdmin),
  } as UsuarioGestion;
}

/** Carga, búsqueda, filtros y paginación de usuarios. */
export function useUsers(canVer: boolean) {
  const [usuarios, setUsuarios] = useState<UsuarioGestion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [search, setSearch] = useState("");
  const [filterRol, setFilterRol] = useState("todos");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [page, setPage] = useState(1);
  const cargarUsuarios = async () => {
    setCargando(true);
    setErrorCarga("");
    try {
      const filas = await listarUsuarios();
      setUsuarios(filas.map(adaptarUsuarioApi));
    } catch (error) {
      setErrorCarga(error instanceof Error ? error.message : "No se pudieron cargar los usuarios.");
    } finally { setCargando(false); }
  };
  useEffect(() => { if (canVer) void cargarUsuarios(); }, [canVer]);
  const filtrados = useMemo(() => {
    const q = normalizar(search);
    return ordenarPorIdDescendente(usuarios.filter(u => {
      const etiquetas = [u.rol, ...(u.rolesExtra ?? []), ...(u.esCliente ? ["Cliente"] : []), ...(u.esEmpleado ? ["Empleado"] : [])];
      const coincideTexto = !q || [u.nombre, u.correo, u.tipo_documento, String(u.id_usuario), `${u.tipo_documento} ${u.id_usuario}`, ...etiquetas].some(v => normalizar(String(v ?? "")).includes(q));
      const coincideRol = filterRol === "todos" || etiquetas.some(r => normalizar(r) === normalizar(filterRol));
      const coincideEstado = filterEstado === "todos" || (filterEstado === "activo" ? u.estado : !u.estado);
      return coincideTexto && coincideRol && coincideEstado;
    }), (usuario) => usuario.id_usuario);
  }, [usuarios, search, filterRol, filterEstado]);
  const porPagina = 10;
  const paginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaActual = Math.min(page, paginas);
  const paginados = filtrados.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  return { cargando, errorCarga, search, setSearch, filterRol, setFilterRol, filterEstado, setFilterEstado, setPage, cargarUsuarios, filtrados, porPagina, paginaActual, paginados };
}
