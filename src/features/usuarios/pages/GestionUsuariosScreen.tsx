import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/shared/components/ConfirmDeleteModal";
import { EstadoSelect, ESTADO_ACTIVO_COLOR, ESTADO_INACTIVO_COLOR } from "@/shared/components/EstadoSelect";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginador";
import { ActionIcons } from "@/shared/components/ActionIcons";
import type { Rol } from "@/features/roles/pages/GestionConfigScreen";
import type { UsuarioListadoApi } from "@/shared/services/authService";
import { cambiarEstadoUsuario, eliminarUsuario, listarUsuarios } from "@/shared/services/authService";

const SERIF = "var(--font-titulo)";
export const DOC_TIPOS = [
  { code: "CC", label: "Cédula de Ciudadanía" },
  { code: "CE", label: "Cédula de Extranjería" },
  { code: "PP", label: "Pasaporte" },
];
export const fmtDoc = (tipo: string, numero: string) => `${tipo} ${numero}`;
export const claveDoc = (tipo?: string, numero?: string) => `${(tipo ?? "").trim().toLowerCase()}||${(numero ?? "").trim()}`;
export const docValida = (clave: string) => clave !== "||" && clave !== "";
export const idRolCliente = (roles: Rol[]) => roles.find(r => r.nombre.trim().toLowerCase() === "cliente")?.id ?? "ROL-002";

export interface Usuario {
  id: string;
  nombre: string;
  iniciales: string;
  avatarColor: string;
  correo: string;
  telefono: string;
  tipoDocumento: string;
  numeroDocumento: string;
  rolIds: string[];
  rolId: string;
  rolInternoId?: string;
  activo: boolean;
  esCliente?: boolean;
  esEmpleado?: boolean;
  rolesExtra?: string[];
  esSuperAdmin?: boolean;
}

export type UsuarioGestion = Omit<UsuarioListadoApi, "tipo_documento" | "correo" | "telefono" | "rolesExtra"> & {
  id: string;
  tipo_documento: string;
  correo: string;
  telefono: string;
  rolesExtra: string[];
  iniciales: string;
  avatarColor: string;
};

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

const normalizar = (s: string) => s.trim().toLocaleLowerCase();
const esAdministrador = (u: UsuarioGestion) =>
  u.esSuperAdmin || normalizar(u.rol || "") === "administrador" || (u.rolesExtra ?? []).some(r => normalizar(r) === "administrador");

function RolesBadges({ usuario }: { usuario: UsuarioGestion }) {
  const extra = [...new Set((usuario.rolesExtra ?? []).filter(r => !["cliente", "empleado", "administrador"].includes(normalizar(r))))];
  const rolesGenerales = [...new Set([usuario.rol, ...(usuario.rolesExtra ?? [])].filter(Boolean))];
  const admin = esAdministrador(usuario);
  const etiquetasExtra = rolesGenerales.filter(r => !["cliente", "empleado", "administrador"].includes(normalizar(r)));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {admin && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">{usuario.esSuperAdmin ? "Super Administrador" : "Administrador"}</span>}
      {usuario.esEmpleado && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Empleado</span>}
      {usuario.esCliente && (
        <span className="relative px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
          Cliente
          {extra.length > 0 && <span title={extra.join(", ")} className="absolute -right-[8px] -top-[6px] inline-flex items-center justify-center h-[17px] min-w-[17px] px-1 rounded-full bg-primary text-white text-[10px] font-bold leading-none whitespace-nowrap">+{extra.length}</span>}
        </span>
      )}
      {!admin && !usuario.esEmpleado && !usuario.esCliente && rolesGenerales.map(r => (
        <span key={r} className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{r}</span>
      ))}
      {!admin && etiquetasExtra.filter(r => normalizar(r) === "administrador").map(r => (
        <span key={r} className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Administrador</span>
      ))}
    </div>
  );
}

export function GestionUsuariosScreen({
  canVer = true,
  canEdit = true,
  canDelete = true,
  onEditarCliente,
  onEditarEmpleado,
}: {
  canVer?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onEditarCliente: (usuario: UsuarioGestion) => void;
  onEditarEmpleado: (usuario: UsuarioGestion) => boolean;
}) {
  const [usuarios, setUsuarios] = useState<UsuarioGestion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [search, setSearch] = useState("");
  const [filterRol, setFilterRol] = useState("todos");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<UsuarioGestion | null>(null);
  const [deleteItem, setDeleteItem] = useState<UsuarioGestion | null>(null);
  const [actualizando, setActualizando] = useState<string | null>(null);

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

  const rolesDisponibles = useMemo(() => [...new Set(usuarios.flatMap(u => [u.rol, ...(u.rolesExtra ?? []), ...(u.esCliente ? ["Cliente"] : []), ...(u.esEmpleado ? ["Empleado"] : [])]).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [usuarios]);
  const filtrados = useMemo(() => {
    const q = normalizar(search);
    return usuarios.filter(u => {
      const etiquetas = [u.rol, ...(u.rolesExtra ?? []), ...(u.esCliente ? ["Cliente"] : []), ...(u.esEmpleado ? ["Empleado"] : [])];
      const coincideTexto = !q || [u.nombre, u.correo, u.tipo_documento, String(u.id_usuario), `${u.tipo_documento} ${u.id_usuario}`, ...etiquetas].some(v => normalizar(String(v ?? "")).includes(q));
      const coincideRol = filterRol === "todos" || etiquetas.some(r => normalizar(r) === normalizar(filterRol));
      const coincideEstado = filterEstado === "todos" || (filterEstado === "activo" ? u.estado : !u.estado);
      return coincideTexto && coincideRol && coincideEstado;
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [usuarios, search, filterRol, filterEstado]);

  const porPagina = 5;
  const paginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaActual = Math.min(page, paginas);
  const paginados = filtrados.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  const editar = (u: UsuarioGestion) => {
    if (u.esEmpleado) {
      if (!onEditarEmpleado(u)) toast.info("Este empleado se podrá editar cuando Gestión de Empleados esté conectada a la base");
      return;
    }
    if (u.esCliente) { onEditarCliente(u); return; }
    toast.info("Este usuario no tiene una ficha editable en Clientes o Empleados.");
  };

  const cambiarEstado = async (u: UsuarioGestion, nuevoEstado: boolean) => {
    if (nuevoEstado === u.estado) return;
    setActualizando(u.id);
    try {
      const respuesta = await cambiarEstadoUsuario(String(u.id_usuario), nuevoEstado);
      await cargarUsuarios();
      setDetail(current => current?.id === u.id ? { ...current, estado: nuevoEstado } : current);
      toast.success(respuesta.mensaje);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado del usuario.");
    } finally { setActualizando(null); }
  };

  const eliminar = async () => {
    if (!deleteItem) return;
    try {
      const respuesta = await eliminarUsuario(String(deleteItem.id_usuario));
      await cargarUsuarios();
      setDeleteItem(null);
      setDetail(null);
      toast.success(respuesta.mensaje);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el usuario.");
    }
  };

  const inputClass = "px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer";
  if (!canVer) return <div className="flex flex-col items-center justify-center py-32 px-6 text-center"><div className="text-6xl mb-4">🔒</div><h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: SERIF }}>Acceso restringido</h2><p className="text-muted-foreground">No tienes permiso para ver Gestión Usuarios. Pide acceso al administrador.</p></div>;

  return (
    <div className="px-4 sm:px-6 pt-5 pb-4 h-full flex flex-col overflow-hidden">
      <div className="mb-3 shrink-0"><h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Usuarios</h1><p className="text-muted-foreground text-sm mt-0.5">Todas las personas registradas en el sistema</p></div>
      <div className="flex flex-wrap gap-3 mb-5 shrink-0">
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Buscar por nombre, correo, rol o documento..." wrapperClassName="w-full max-w-sm shrink-0" />
        <select value={filterRol} onChange={e => { setFilterRol(e.target.value); setPage(1); }} className={inputClass}><option value="todos">Todos los roles</option>{rolesDisponibles.map(r => <option key={r} value={r}>{r}</option>)}</select>
        <select value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1); }} className={inputClass}><option value="todos">Todos los estados</option><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-2 shrink-0">
        <div className="overflow-x-auto"><table className="w-full min-w-[720px]"><thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider"><tr>{["Nombre", "Correo", "Rol actual", "Estado", "Acciones"].map(h => <th key={h} className="px-4 py-1.5 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            {cargando ? <tr><td colSpan={5} className="px-4 py-14 text-center text-muted-foreground">Cargando usuarios…</td></tr> : errorCarga ? <tr><td colSpan={5} role="alert" className="px-4 py-14 text-center text-muted-foreground">{errorCarga}<button className="underline ml-2" onClick={() => void cargarUsuarios()}>Reintentar</button></td></tr> : paginados.length === 0 ? <tr><td colSpan={5} className="px-4 py-14 text-center text-muted-foreground"><p className="text-4xl mb-3">👤</p><p>No se encontraron usuarios</p></td></tr> : paginados.map(u => (
              <tr key={u.id_usuario} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-1.5"><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-full ${u.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{u.iniciales}</div><div><p className="text-sm font-semibold text-foreground">{u.nombre}</p><p className="text-xs font-mono text-muted-foreground">{fmtDoc(u.tipo_documento, String(u.id_usuario))}</p></div></div></td>
                <td className="px-4 py-1.5 text-sm text-muted-foreground">{u.correo || "—"}</td>
                <td className="px-4 py-1.5"><RolesBadges usuario={u} /></td>
                <td className="px-4 py-1.5">{canEdit ? <EstadoSelect value={u.estado ? "activo" : "inactivo"} disabled={Boolean(u.esSuperAdmin) || actualizando === u.id} onChange={v => void cambiarEstado(u, v === "activo")} options={[{ value: "activo", label: "Activo", color: ESTADO_ACTIVO_COLOR }, { value: "inactivo", label: "Inactivo", color: ESTADO_INACTIVO_COLOR }]} /> : <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${u.estado ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{u.estado ? "Activo" : "Inactivo"}</span>}</td>
                <td className="px-4 py-1.5"><ActionIcons onView={() => setDetail(u)} onEdit={canEdit ? () => editar(u) : undefined} editDisabled={Boolean(u.esSuperAdmin)} editTitle={u.esSuperAdmin ? "Cuenta de super administrador" : "Editar en Clientes o Empleados"} onDelete={canDelete ? () => setDeleteItem(u) : undefined} deleteDisabled={Boolean(u.esSuperAdmin)} deleteTitle={u.esSuperAdmin ? "Cuenta de super administrador" : "Eliminar usuario"} /></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
      {filtrados.length > 0 && <Paginador pagina={paginaActual} totalPaginas={paginas} onCambio={setPage} />}

      <AnimatePresence>{detail && <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4"><motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .95, opacity: 0 }} className="bg-card rounded-2xl w-full max-w-xl shadow-2xl border border-border my-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border"><div><h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Detalle — {detail.nombre}</h3><p className="text-xs font-mono text-muted-foreground">{fmtDoc(detail.tipo_documento, String(detail.id_usuario))}</p></div><button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground"><X className="w-4 h-4" /></button></div>
        <div className="p-5 space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[{ label: "Correo", value: detail.correo }, { label: "Teléfono", value: detail.telefono }, { label: "Estado de cuenta", value: detail.estado ? "Activo" : "Inactivo" }, { label: "Roles", value: "" }].map(item => <div key={item.label}><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>{item.label === "Roles" ? <RolesBadges usuario={detail} /> : <p className="text-sm font-semibold text-foreground break-words">{item.value || "—"}</p>}</div>)}</div>
          {canEdit && <button disabled={Boolean(detail.esSuperAdmin) || actualizando === detail.id} onClick={() => void cambiarEstado(detail, !detail.estado)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted disabled:opacity-50"><RefreshCw className="w-4 h-4" />{detail.estado ? "Desactivar usuario" : "Activar usuario"}</button>}
          {canEdit && <button onClick={() => { const target = detail; setDetail(null); editar(target); }} disabled={Boolean(detail.esSuperAdmin)} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-red-700 disabled:opacity-50">Editar en Clientes o Empleados</button>}
          <button onClick={() => setDetail(null)} className="w-full py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-muted">Cerrar</button>
        </div>
      </motion.div></div></div>}</AnimatePresence>
      <AnimatePresence>{deleteItem && <ConfirmDeleteModal title="Eliminar usuario" message={<>¿Seguro que deseas eliminar a <strong className="text-foreground">{deleteItem.nombre}</strong>? Esta acción no se puede deshacer.</>} onConfirm={() => void eliminar()} onCancel={() => setDeleteItem(null)} />}</AnimatePresence>
    </div>
  );
}
