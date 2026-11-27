import { useState, useMemo, useEffect } from "react";
import { listarPermisosRoles, listarRoles as listarRolesApi } from "@/shared/services/authService";
import { toast } from "sonner";
import { ordenarPorIdDescendente } from "@/shared/utils/sortById";
import { type Rol, MENU_TREE, KEY, adaptarRolApi, mensajeError } from "@/features/roles/utils/roles";

/** Carga, búsqueda y paginación de roles. */
export function useRoles(canVer: boolean) {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [page,       setPage]      = useState(1);
  const PER_PAGE = 10;
  const [search,     setSearch]    = useState("");
  const cargarRoles = async () => {
    setCargando(true);
    setErrorCarga("");
    try {
      const [rolesApi, permisosApi] = await Promise.all([listarRolesApi(), listarPermisosRoles()]);
      const catalogoApi = new Set(permisosApi.map(p => `${p.modulo}::${p.nombre}`));
      const faltantes = MENU_TREE.flatMap(({ modulo, subs }) =>
        subs.filter(sub => !catalogoApi.has(KEY(modulo, sub))).map(sub => KEY(modulo, sub)),
      );
      if (faltantes.length) {
        throw new Error(`El catálogo de permisos no contiene: ${faltantes.join(", ")}.`);
      }
      setRoles(rolesApi.map(adaptarRolApi));
    } catch (error) {
      const mensaje = mensajeError(error, "No se pudieron cargar los roles.");
      setErrorCarga(mensaje);
      toast.error(mensaje);
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => {
    if (canVer) void cargarRoles();
  }, [canVer]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtrados = !q ? roles : roles.filter(r =>
      r.nombre.toLowerCase().includes(q) ||
      (r.descripcion ?? "").toLowerCase().includes(q)
    );
    return ordenarPorIdDescendente(filtrados, (rol) => rol.id);
  }, [roles, search]);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  return { roles, setRoles, cargando, errorCarga, page, setPage, PER_PAGE, search, setSearch, cargarRoles, filtered, paged };
}
