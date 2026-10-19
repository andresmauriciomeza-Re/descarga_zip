import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, RefreshCw, AlertTriangle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/shared/components/ConfirmDeleteModal";
import {
  EstadoSelect,
  ESTADO_ACTIVO_COLOR,
  ESTADO_INACTIVO_COLOR,
} from "@/shared/components/EstadoSelect";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginador";
import { SegmentadoButtons } from "@/shared/components/SegmentadoButtons";
import { ActionIcons } from "@/shared/components/ActionIcons";
import { type Rol, PermisosTablaDetalle, countAccesos, textoPermisosModulos, fullAccesos } from "@/features/roles/pages/GestionConfigScreen";
import { type Empleado } from "@/features/empleados/pages/GestionEmpleadosScreen";
import { type Cliente } from "@/features/clientes/pages/GestionClientesScreen";
import { filtrarCorreo, filtrarDocumento, filtrarNombre, soloDigitos, validarCorreo, validarDocumento, validarNombre, validarTelefono, validarTelefonoOpcional } from "@/shared/components/campo";
import { OPCIONES_TIPO_DOCUMENTO } from "@/shared/utils/tiposDocumento";
import { SelectorRoles } from "@/shared/components/SelectorRoles";
import { eliminarUsuario, listarUsuarios, type UsuarioListadoApi } from "@/shared/services/authService";

const SERIF = "var(--font-titulo)";

export const DOC_TIPOS = OPCIONES_TIPO_DOCUMENTO;

export const fmtDoc = (tipo: string, numero: string) => `${tipo} ${numero}`;

export interface Usuario {
  id: string;
  nombre: string;
  iniciales: string;
  avatarColor: string;
  correo: string;
  telefono: string;
  tipoDocumento: string;
  numeroDocumento: string;
  // `rolIds` es la lista de cargos/roles (multi-rol); `rolId` se conserva como
  // ESPEJO del primer elemento, para los flujos que todavía trabajan con un
  // solo rol (clientes, semillas, pantallas de solo lectura).
  rolIds: string[];
  rolId: string;
  rolInternoId?: string;
  activo: boolean;
  esEmpleado?: boolean;
}

// Colores de avatar para los usuarios de alta. La misma paleta que usa Clientes
// para que ambos listados se vean homogéneos.
const AVATAR_COLORS = [
  "bg-red-500","bg-blue-500","bg-emerald-500",
  "bg-purple-500","bg-amber-500","bg-pink-500","bg-indigo-500","bg-teal-500",
];

function adaptarUsuarioApi(u: UsuarioListadoApi, roles: Rol[], index: number): Usuario {
  const rol = roles.find(r => r.nombre.trim().toLowerCase() === u.rol.trim().toLowerCase());
  const nombre = u.nombre ?? "";
  return {
    id: String(u.id_usuario), nombre,
    iniciales: nombre.trim().split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase(),
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    correo: u.correo ?? "", telefono: u.telefono ?? "",
    tipoDocumento: u.tipo_documento ?? "", numeroDocumento: String(u.id_usuario),
    rolId: rol?.id ?? String(u.id_rol), rolIds: [rol?.id ?? String(u.id_rol)],
    activo: u.estado, esEmpleado: u.es_empleado,
  };
}

// Paleta de colores para roles (por índice de ROL-XXX)
const ROL_PALETTE = [
  "bg-red-100 text-red-800",
  "bg-gray-100 text-gray-700",
  "bg-blue-100 text-blue-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-teal-100 text-teal-800",
];

function rolColor(rol: Rol | null | undefined, esCliente: boolean, esEmpleado: boolean) {
  // "Administrador"/"Cliente" se reconocen POR NOMBRE (nunca por id): el
  // administrador puede renombrarlos o restaurar la semilla.
  const nombre = (rol?.nombre ?? "").trim().toLowerCase();
  if (nombre === "administrador") return "bg-red-100 text-red-800";
  if (esEmpleado || nombre === "empleado") return "bg-emerald-100 text-emerald-800";
  if (esCliente || nombre === "cliente") return "bg-gray-100 text-gray-700";
  const idx = parseInt((rol?.id ?? "").replace("ROL-",""), 10) - 1;
  return ROL_PALETTE[idx >= 0 ? idx % ROL_PALETTE.length : 0];
}

function rolLabel(u: Usuario, roles: Rol[], esCliente: boolean, esEmpleado: boolean): string {
  // P8: la cuenta de super administradora (Gloria, USR-001) se etiqueta SIEMPRE
  // como "Super Administrador", nunca como Cliente ni Empleado, para que la
  // vista de Usuarios no contradiga al módulo de Clientes.
  if (esSuperAdmin(u)) return "Super Administrador";
  const principal = roles.find(r => r.id === u.rolId);
  const nombre = (principal?.nombre ?? "").trim().toLowerCase();
  if (nombre === "administrador") return "Administrador";
  if (esEmpleado || nombre === "empleado") return "Cliente/Empleado";
  if (esCliente || nombre === "cliente") return "Cliente";
  return principal?.nombre ?? u.rolId;
}

// Clave de cruce Persona ↔ ficha (Empleado/Cliente/Usuario): tipo y número de
// documento, NUNCA el correo. Dos registros con el mismo correo pero distinto
// documento son personas distintas, y uno con el mismo documento es la misma
// aunque cambie de correo. "||" (ambos vacíos) no sirve como clave: sin
// documento no hay cruce.
export const claveDoc = (tipo?: string, numero?: string): string =>
  `${(tipo ?? "").trim().toLowerCase()}||${(numero ?? "").trim()}`;

export const docValida = (k: string) => k !== "||" && k !== "";

// Id con el que se guardan las fichas de Clientes: es el que `usuariosUnificados`
// (App.tsx) le asigna al unir los listados de Usuarios, Empleados y Clientes.
const ROL_CLIENTE = "ROL-002";

// El rol "Cliente" se busca POR NOMBRE en la lista guardada; el id de la
// semilla solo queda como último recurso si el rol fue renombrado/borrado.
export const idRolCliente = (roles: Rol[]) =>
  roles.find(r => r.nombre.trim().toLowerCase() === "cliente")?.id ?? ROL_CLIENTE;

// ── P7/P8 — Cuenta de super administrador ────────────────────────────────
// El perfil de Gloria (USR-001, gloria@lasirena.com) es la super
// administradora del sistema: NO se puede eliminar, editar ni cambiar su
// estado desde ningún flujo de esta pantalla. Se identifica por id/correo y
// nunca por rolId, porque `usuariosUnificados` (App.tsx) puede pisar el
// rolId a ROL-002 cuando la persona también figura en `clientes`.
const esSuperAdmin = (u: Usuario): boolean =>
  u.id === "12345678" || u.correo.trim().toLowerCase() === "gloria@lasirena.com";
const TITULO_SUPER_ADMIN = "Cuenta de super administrador";

// Roles reales de una persona para la vista de detalle: los que trae su
// `Usuario.rolIds` (o el espejo `rolId`) y, si además está registrada como
// empleado o como cliente, los de esa ficha. El cruce con las fichas es por
// TIPO Y NÚMERO DE DOCUMENTO (nunca por correo). Siempre se leen de `roles`
// —la lista guardada, no una semilla— y se dedupican por id, así que quien
// solo tiene un rol, que es el caso normal, ve una sola tabla de permisos.
const rolesDeUsuario = (
  usuario: Usuario,
  roles: Rol[],
  _empleados: Empleado[],
  _clientes: Cliente[],
): Rol[] => {
  const ids: string[] = usuario.rolIds?.length
    ? [...usuario.rolIds]
    : [usuario.rolId];
  // P8: el perfil de super administrador conserva el rol Administrador aunque
  // `usuariosUnificados` le haya pisado el rolId a ROL-002 al aparecer en
  // `clientes`; sin esto, el detalle dejaría de mostrar sus permisos reales.
  if (esSuperAdmin(usuario) && !ids.includes("ROL-001")) ids.unshift("ROL-001");

  const unicos: Rol[] = [];
  const vistos = new Set<string>();
  for (const id of ids) {
    const rol = roles.find(r => r.id === id);
    if (!rol || vistos.has(rol.id)) continue;
    vistos.add(rol.id);
    unicos.push(rol);
  }
  return unicos;
};

export function GestionUsuariosScreen({
  userRole,
  roles,
  usuarios: _usuarios,
  setUsuarios: _setUsuarios,
  empleados,
  setEmpleados,
  clientes,
  setClientes,
  canVer = true,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: {
  userRole: string;
  roles: Rol[];
  usuarios: Usuario[];
  setUsuarios: React.Dispatch<React.SetStateAction<Usuario[]>>;
  empleados: Empleado[];
  setEmpleados: React.Dispatch<React.SetStateAction<Empleado[]>>;
  clientes: Cliente[];
  setClientes: React.Dispatch<React.SetStateAction<Cliente[]>>;
  canVer?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const cargarUsuarios = async () => {
    setCargando(true);
    setErrorCarga("");
    try {
      const filas = await listarUsuarios();
      setUsuarios(filas.map((u, index) => adaptarUsuarioApi(u, roles, index)));
    } catch (error) {
      setErrorCarga(error instanceof Error ? error.message : "No se pudieron cargar los usuarios.");
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { if (canVer) void cargarUsuarios(); }, [canVer]);
  const [search,     setSearch]    = useState("");
  const [filterRol,  setFiltroR]   = useState("todos");
  const [filterEst,  setFiltroE]   = useState("todos");
  const [page,       setPage]      = useState(1);
  const [detail,     setDetail]    = useState<Usuario | null>(null);
  const [editItem,   setEditItem]  = useState<Usuario | null>(null);
  const [editPrevCorreo, setEditPrevCorreo] = useState<string | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string | undefined>>({});
  const [deleteId,   setDeleteId]  = useState<string | null>(null);

  // Formulario de alta (modal "Crear usuario"). Se guarda con un prefijo `new`
  // para no chocar con el `editItem`, que lleva el mismo tipo de datos.
  const [showCreate,   setShowCreate]   = useState(false);
  const [newNombre,    setNewNombre]    = useState("");
  const [newCorreo,    setNewCorreo]    = useState("");
  const [newTelefono,  setNewTelefono]  = useState("");
  const [newTipoDoc,   setNewTipoDoc]   = useState("CC");
  const [newDocumento, setNewDocumento] = useState("");
  const [newRolId,     setNewRolId]     = useState("");
  const [newActivo,    setNewActivo]    = useState(true);
  const [createErrors, setCreateErrors] = useState<Record<string, string | undefined>>({});
  const [rolSearch,    setRolSearch]    = useState("");

  const rolInfo = (rolId: string): Rol | null =>
    roles.find(r => r.id === rolId) ?? null;

  const usuariosUnicos = useMemo(() => {
    const unicos = new Map<string, Usuario>();
    usuarios.forEach(usuario => {
      const tipoDocumento = usuario.tipoDocumento.trim().toLowerCase();
      const numeroDocumento = usuario.numeroDocumento.trim();
      const correo = usuario.correo.trim().toLowerCase();
      const clave = numeroDocumento
        ? `doc:${tipoDocumento}||${numeroDocumento}`
        : correo
          ? `correo:${correo}`
          : `id:${usuario.id}`;
      if (!unicos.has(clave)) unicos.set(clave, usuario);
    });
    return Array.from(unicos.values());
  }, [usuarios]);

  // Métricas. "Administradores" = personas con ALGÚN rol cuyo nombre sea
  // Administrador (multi-rol), no solo el `rolId` principal.
  const total = usuariosUnicos.length;
  const nAdm  = usuariosUnicos.filter(u =>
    rolesDeUsuario(u, roles, empleados, clientes).some(r => r.nombre.trim().toLowerCase() === "administrador")
  ).length;
  const nEmp  = empleados.length;
  const nCli  = clientes.length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return usuariosUnicos.filter(u => {
      const correo = u.correo.trim().toLowerCase();
      const claveUU = claveDoc(u.tipoDocumento, u.numeroDocumento);
      const esCliente = docValida(claveUU) && clientes.some(c => claveDoc(c.tipoDocumento, c.numeroDocumento) === claveUU);
      const esEmpleado = docValida(claveUU) && empleados.some(e => claveDoc(e.tipoDocumento, e.numeroDocumento) === claveUU);
      // P6: la búsqueda y el filtro de rol trabajan con TODOS los roles de la
      // persona (rolesDeUsuario), no solo con el rolId principal, para que un
      // usuario con varios roles se encuentre por cualquiera de ellos.
      const rolesActuales = rolesDeUsuario(u, roles, empleados, clientes);
      const nombresRoles = rolesActuales.map(r => r.nombre.toLowerCase());
      const esSuper = esSuperAdmin(u);
      const matchQ = !q
        || u.nombre.toLowerCase().includes(q)
        || u.correo.toLowerCase().includes(q)
        || u.numeroDocumento.toLowerCase().includes(q)
        || `${u.tipoDocumento} ${u.numeroDocumento}`.toLowerCase().includes(q)
        || nombresRoles.some(n => n.includes(q))
        // P8: "super" o "super administrador" también encuentran a Gloria.
        || (esSuper && "super administrador".includes(q));
      const matchR = filterRol === "todos" || rolesActuales.some(r => r.id === filterRol) || (esSuper && filterRol === "ROL-001");
      const matchE = filterEst === "todos" || (filterEst === "activo" ? u.activo : !u.activo);
      return matchQ && matchR && matchE;
    });
  }, [usuariosUnicos, search, filterRol, filterEst, roles, clientes, empleados]);

  // 5 usuarios por página (unificado con el resto de listados): la tabla
  // nunca lleva scroll interno, la navegación es solo por el paginador.
  const PER_PAGE = 5;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  // La página efectiva nunca puede pasar de totalPages: si el conjunto filtrado
  // se reduce (p. ej. al apagar un switch con un filtro de estado activo, o al
  // eliminar un usuario) `page` quedaría fuera de rango, la tabla saldría vacía
  // y la paginación se ocultaría, dejando al usuario sin forma de volver.
  const pageActual = Math.min(page, totalPages);
  const paged = filtered.slice((pageActual - 1) * PER_PAGE, pageActual * PER_PAGE);

  const updateUsuario = (id: string, patch: Partial<Usuario>) => {
    setUsuarios(p => p.map(u => u.id === id ? { ...u, ...patch } : u));
    setDetail(prev => prev && prev.id === id ? { ...prev, ...patch } : prev);
  };

  // Ficha de Empleado de una persona, por TIPO Y NÚMERO DE DOCUMENTO.
  const fichaEmpleadoDe = (p: { tipoDocumento: string; numeroDocumento: string }) => {
    const k = claveDoc(p.tipoDocumento, p.numeroDocumento);
    if (!docValida(k)) return undefined;
    return empleados.find(e => claveDoc(e.tipoDocumento, e.numeroDocumento) === k);
  };

  // ¿Esta persona (con los roles que quedarán guardados) tiene ficha de
  // empleado? Sin ficha no se pueden editar sus cargos desde Usuarios.
  const tieneFicha = (u: Usuario) => !!fichaEmpleadoDe(u);

  // Abre el modal de edición con los cargos que mandan: los de la ficha de
  // empleado (fuente de verdad) si existe; si no, los del propio usuario.
  const abrirEdicion = (u: Usuario) => {
    const ficha = fichaEmpleadoDe(u);
    setEditItem({ ...u, rolIds: ficha?.rolIds?.length ? [...ficha.rolIds] : (u.rolIds?.length ? [...u.rolIds] : [u.rolId]) });
    setEditPrevCorreo(u.correo);
    setEditErrors({});
  };

  // Refleja en el registro Empleado vinculado los cambios hechos desde "Usuarios".
  // El cruce es por DOCUMENTO; los `rolIds` además se copian a la contratación
  // VIGENTE del historial (fechaFinal vacía), igual que al editar en Empleados.
  const updateEmpleadoLinked = (
    buscar: { tipoDocumento: string; numeroDocumento: string },
    patch: Partial<Pick<Empleado, "nombre" | "correo" | "telefono" | "tipoDocumento" | "numeroDocumento" | "rolIds" | "activo">>,
  ) => {
    const k = claveDoc(buscar.tipoDocumento, buscar.numeroDocumento);
    if (!docValida(k)) return;
    setEmpleados(p => p.map(e => {
      if (claveDoc(e.tipoDocumento, e.numeroDocumento) !== k) return e;
      const nombre = patch.nombre ?? e.nombre;
      const iniciales = nombre.trim().split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();
      const rolIds = patch.rolIds;
      const contrataciones = rolIds
        ? (e.contrataciones ?? []).map(c => c.fechaFinal === "" ? { ...c, rolIds: [...rolIds] } : c)
        : e.contrataciones;
      return { ...e, ...patch, nombre, iniciales, contrataciones };
    }));
  };

  // ¿Este rol tiene TODOS los permisos y privilegios?
  const rolInfoTotal = (rolId: string) => {
    const r = roles.find(x => x.id === rolId);
    if (!r) return false;
    const full = fullAccesos();
    return Object.entries(full).every(([k, acts]) => (r.accesos?.[k] ?? []).length > 0 && acts.every(a => r.accesos[k]?.includes(a)));
  };
  // Usuarios ACTIVOS con ALGÚN rol total (multi-rol), para nunca dejar el
  // sistema sin nadie con acceso total.
  const usuarioEsTotal = (u: Usuario) =>
    rolesDeUsuario(u, roles, empleados, clientes).some(r => rolInfoTotal(r.id));
  const totalesActivos = usuariosUnicos.filter(u => u.activo && usuarioEsTotal(u));

  // Misma regla y mismos efectos para cambiar el estado, sea desde el detalle
  // o desde la pill de la tabla: nunca al usuario actual si es el último con
  // todos los permisos, y siempre actualizando el empleado vinculado.
  const aplicarCambioEstado = (usuario: Usuario, nuevoEstado: boolean) => {
    if (nuevoEstado === usuario.activo) return;
    toast.info("Disponible próximamente");
  };

  const cambiarEstado = () => {
    if (!detail) return;
    aplicarCambioEstado(detail, !detail.activo);
  };

  const handleEdit = () => {
    toast.info("Disponible próximamente");
    return;
    const errs: Record<string, string> = {};
    if (!editItem.nombre.trim()) errs.nombre = "El nombre es obligatorio";
    else { const v = validarNombre(editItem.nombre); if (v) errs.nombre = v; }
    if (!editItem.correo.trim()) errs.correo = "El correo es obligatorio";
    else { const v = validarCorreo(editItem.correo); if (v) errs.correo = v; }
    if (!editItem.tipoDocumento.trim()) errs.tipoDocumento = "El tipo de documento es obligatorio";
    if (!editItem.numeroDocumento.trim()) errs.numeroDocumento = "El número de documento es obligatorio";
    else { const v = validarDocumento(editItem.numeroDocumento, editItem.tipoDocumento); if (v) errs.numeroDocumento = v; }
    // Teléfono opcional en edición: vacío vale, con valor aplica la regla
    // única del sistema (solo números, 7 a 15 dígitos).
    if (editItem.telefono.trim()) {
      const et = validarTelefono(editItem.telefono);
      if (et) errs.telefono = et;
    }
    // CARGO = ROL. Los cargos solo se editan si la persona tiene ficha de
    // Empleado (ahí vive `rolIds`); sin ficha el campo queda de solo lectura y
    // se conserva el rol que ya traía.
    const ficha = fichaEmpleadoDe(editItem);
    let rolIdsFinal = (editItem.rolIds ?? []).filter(Boolean);
    if (ficha && rolIdsFinal.length === 0) errs.rolIds = "Asigna al menos un cargo al empleado";
    if (!ficha && rolIdsFinal.length === 0) rolIdsFinal = editItem.rolId ? [editItem.rolId] : [];
    if (editItem.nombre.trim() && editItem.correo.trim() && editItem.numeroDocumento.trim()) {
      const em = editItem.correo.trim().toLowerCase();
      const dm = editItem.numeroDocumento.trim();
      const clave = `${editItem.tipoDocumento}||${dm}`.toLowerCase();
      const ancla = editPrevCorreo?.trim().toLowerCase();
      const otro = (correo: string) => correo.trim().toLowerCase() !== ancla;
      // Un correo vacío nunca coincide con otro vacío: sin el `!== ""`, todos
      // los registros sin correo serían "la misma persona".
      const correoDup =
        usuarios.some(u => u.id !== editItem.id && otro(u.correo) && u.correo.trim() !== "" && u.correo.trim().toLowerCase() === em) ||
        empleados.some(e => otro(e.correo) && e.correo.trim() !== "" && e.correo.trim().toLowerCase() === em) ||
        clientes.some(c => otro(c.correo) && c.correo.trim() !== "" && c.correo.trim().toLowerCase() === em);
      const docDup =
        usuarios.some(u => u.id !== editItem.id && otro(u.correo) && `${u.tipoDocumento}||${u.numeroDocumento}`.toLowerCase() === clave) ||
        empleados.some(e => otro(e.correo) && `${e.tipoDocumento}||${e.numeroDocumento}`.toLowerCase() === clave) ||
        clientes.some(c => otro(c.correo) && `${c.tipoDocumento}||${c.numeroDocumento}`.toLowerCase() === clave);
      if (correoDup) errs.correo = "Este correo ya está registrado";
      if (docDup) errs.numeroDocumento = "Este documento ya está registrado";
    }
    if (Object.keys(errs).length) { setEditErrors(errs); return; }
    // No quitar el último usuario activo con todos los permisos cambiando sus
    // roles (multi-rol: basta con que conserve UN rol total).
    const anterior = usuarios.find(u => u.id === editItem.id);
    const borrador: Usuario = {
      ...editItem,
      rolIds: rolIdsFinal,
      rolId: rolIdsFinal[0] ?? editItem.rolId,
    };
    const eraTotal = anterior ? usuarioEsTotal(anterior) : false;
    const seraTotal = usuarioEsTotal(borrador);
    if (eraTotal && !seraTotal && totalesActivos.length === 1) {
      toast.error("No se puede: el sistema debe tener al menos un usuario activo con todos los permisos.");
      return;
    }
    // Se recalculan las iniciales al renombrar: antes se guardaba `editItem` tal
    // cual y el avatar de la tabla, del detalle y de la vista previa seguían
    // mostrando las del nombre viejo. Empleados y Clientes ya lo hacían así.
    const nuevasIniciales = editItem.nombre.trim().split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();
    setUsuarios(p => p.map(u => u.id === editItem.id ? { ...borrador, iniciales: nuevasIniciales } : u));
    const patch: Partial<Pick<Empleado, "nombre" | "correo" | "telefono" | "tipoDocumento" | "numeroDocumento" | "rolIds" | "activo">> = {
      nombre: editItem.nombre,
      correo: editItem.correo,
      telefono: editItem.telefono,
      tipoDocumento: editItem.tipoDocumento,
      numeroDocumento: editItem.numeroDocumento,
      activo: editItem.activo,
    };
    // Solo con ficha se escriben los cargos (y su contratación vigente).
    if (ficha) patch.rolIds = rolIdsFinal;
    updateEmpleadoLinked(editItem, patch);
    setEditItem(null);
    setEditPrevCorreo(null);
    setEditErrors({});
    toast.success("Usuario actualizado correctamente");
  };

  const handleDelete = async (id: string) => {
    const objetivo = usuarios.find(u => u.id === id);
    // P7: la cuenta de super administrador nunca se puede eliminar, ni desde
    // la fila de la tabla ni desde ningún otro flujo.
    if (objetivo && esSuperAdmin(objetivo)) {
      toast.error(`${TITULO_SUPER_ADMIN}: no se puede eliminar.`);
      return;
    }
    if (objetivo && objetivo.activo && usuarioEsTotal(objetivo) && totalesActivos.length === 1) {
      toast.error("No se puede: el sistema debe tener al menos un usuario activo con todos los permisos.");
      return;
    }

    // El id real de la cuenta en la base de datos es el número de documento
    // (así lo crea el registro); sin documento la cuenta solo vive en el panel.
    try {
      const res = await eliminarUsuario(objetivo?.numeroDocumento || id);
      await cargarUsuarios();
      setDeleteId(null);
      toast.success(res.mensaje);
    } catch (error) {
      setDeleteId(null);
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el usuario.");
    }
  };

  const resetCreate = () => {
    setNewNombre(""); setNewCorreo(""); setNewTelefono(""); setNewTipoDoc("CC");
    setNewDocumento(""); setNewRolId(""); setNewActivo(true); setCreateErrors({});
  };

  // Alta de usuario. Mismo criterio que la validación de "Crear cliente": los
  // duplicados de correo y de documento se buscan en las TRES colecciones
  // (usuarios, empleados y clientes) porque un mismo correo o cédula no puede
  // representar a dos personas distintas dentro del sistema.
  const handleCreate = () => {
    const errs: Record<string, string> = {};
    toast.info("Disponible próximamente");
    return;

    if (!newNombre.trim()) errs.nombre = "El nombre es obligatorio";
    else { const v = validarNombre(newNombre); if (v) errs.nombre = v; }

    if (!newCorreo.trim()) {
      errs.correo = "El correo es obligatorio";
    } else if (validarCorreo(newCorreo)) {
      errs.correo = validarCorreo(newCorreo) as string;
    } else {
      const em = newCorreo.trim().toLowerCase();
      const dupCorreo =
        usuarios.some(u => u.correo.trim() !== "" && u.correo.trim().toLowerCase() === em) ||
        empleados.some(e => e.correo.trim() !== "" && e.correo.trim().toLowerCase() === em) ||
        clientes.some(c => c.correo.trim() !== "" && c.correo.trim().toLowerCase() === em);
      if (dupCorreo) errs.correo = "Este correo ya está registrado";
    }

    // Teléfono obligatorio con la regla única (solo números, 7 a 15 dígitos).
    if (!newTelefono.trim()) {
      errs.telefono = "El teléfono es obligatorio";
    } else {
      const et = validarTelefono(newTelefono);
      if (et) errs.telefono = et;
    }

    // Un usuario no puede quedar sin rol: sin él no tendría permisos y la
    // etiqueta de la tabla saldría con el id crudo.
    const rolElegido = roles.find(r => r.id === newRolId);
    if (!newRolId) {
      errs.rolId = "Selecciona un rol";
    } else if (!rolElegido) {
      errs.rolId = "El rol seleccionado no existe";
    } else if (!rolElegido.activo) {
      errs.rolId = "El rol seleccionado está inactivo";
    }

    if (!newTipoDoc.trim()) {
      errs.tipoDocumento = "Selecciona el tipo de documento";
    }
    const dm = newDocumento.trim();
    if (!dm) {
      errs.numeroDocumento = "El número de documento es obligatorio";
    } else if (newTipoDoc !== "PP" && !/^\d+$/.test(dm)) {
      errs.numeroDocumento = "El número de documento solo debe contener números";
    } else {
      const clave = `${newTipoDoc}||${dm}`.toLowerCase();
      const dupDoc =
        usuarios.some(u => `${u.tipoDocumento}||${u.numeroDocumento}`.toLowerCase() === clave) ||
        empleados.some(e => `${e.tipoDocumento}||${e.numeroDocumento}`.toLowerCase() === clave) ||
        clientes.some(c => `${c.tipoDocumento}||${c.numeroDocumento}`.toLowerCase() === clave);
      if (dupDoc) errs.numeroDocumento = "Este documento ya está registrado";
    }

    if (Object.keys(errs).length) { setCreateErrors(errs); return; }

    // El id sigue la numeración más alta existente y no el largo del array: si
    // se borra un usuario intermedio, `length + 1` reutilizaría su id.
    const maxNum = usuarios.reduce((max, u) => {
      const n = parseInt(u.id.replace("USR-", ""), 10) || 0;
      return Math.max(max, n);
    }, 0);
    const newId = `USR-${String(maxNum + 1).padStart(3, "0")}`;
    const iniciales = newNombre.trim().split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();
    const avatarColor = AVATAR_COLORS[usuarios.length % AVATAR_COLORS.length];

    setUsuarios(prev => [
      {
        id: newId,
        nombre: newNombre.trim(),
        iniciales,
        avatarColor,
        correo: newCorreo.trim(),
        telefono: newTelefono,
        tipoDocumento: newTipoDoc,
        numeroDocumento: dm,
        rolId: newRolId,
        rolIds: [newRolId],
        activo: newActivo,
      },
      ...prev,
    ]);
    setShowCreate(false);
    resetCreate();
    toast.success(`Usuario ${newNombre.trim()} creado correctamente`);
  };

  const iCls = "px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer";

  if (!canVer) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: SERIF }}>Acceso restringido</h2>
        <p className="text-muted-foreground">No tienes permiso para ver Gestión Usuarios. Pide acceso al administrador.</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 pt-5 pb-4 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Usuarios</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Todos los usuarios registrados en el sistema</p>
        </div>
        {canCreate && <button disabled title="Disponible próximamente" onClick={() => toast.info("Disponible próximamente")} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold opacity-60 cursor-not-allowed shadow-sm"><UserPlus className="w-4 h-4"/> Crear usuario</button>}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5 shrink-0">
        <SearchInput
          value={search}
          onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Buscar por nombre, correo, rol o documento..."
          wrapperClassName="w-full max-w-sm shrink-0"
        />
        <select value={filterRol} onChange={e => { setFiltroR(e.target.value); setPage(1); }} className={iCls}>
          <option value="todos">Todos los roles</option>
          {roles.filter(r => r.activo).map(r => (
            <option key={r.id} value={r.id}>{r.nombre}</option>
          ))}
        </select>
        <select value={filterEst} onChange={e => { setFiltroE(e.target.value); setPage(1); }} className={iCls}>
          <option value="todos">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>

      {/* Tabla — la tarjeta recorta las esquinas redondeadas y nunca hace scroll:
          el número de filas por página se calcula arriba para que siempre quepan
          enteras y la navegación sea solo por el paginador. Sin `flex-1 min-h-0`
          (punto 2.5): en pantalla locked la card se estiraba hasta el fondo y
          dejaba un hueco vacío bajo la última fila. */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-2 shrink-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
            <tr>
              {["Usuario","Correo","Rol actual","Estado","Acciones"].map(h => (
                <th key={h} className="px-4 py-1.5 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cargando ? (
                <tr><td colSpan={5} className="px-4 py-14 text-center text-muted-foreground">Cargando usuarios…</td></tr>
              ) : errorCarga ? (
                <tr><td colSpan={5} role="alert" className="px-4 py-14 text-center text-muted-foreground">{errorCarga} <button className="underline ml-2" onClick={() => void cargarUsuarios()}>Reintentar</button></td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-14 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">👤</p><p>No se encontraron usuarios</p>
                </td></tr>
              ) : paged.map(u => {
                const rolesFila = rolesDeUsuario(u, roles, empleados, clientes);
                const rolInactivo = rolesFila.some(r => !r.activo);
                const claveU = claveDoc(u.tipoDocumento, u.numeroDocumento);
                const esCliente = rolesFila.some(r => r.nombre.trim().toLowerCase() === "cliente");
                const esEmpleado = !!u.esEmpleado;
                const esAdmin = esSuperAdmin(u) || rolesFila.some(r => r.nombre.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === "administrador");
                const extrasFila = rolesFila.filter(r => {
                  const n = r.nombre.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  return n !== "administrador" && n !== "cliente" && n !== "empleado";
                });
                return (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${u.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {u.iniciales}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{u.nombre}</p>
                          <p className="text-xs font-mono text-muted-foreground">{fmtDoc(u.tipoDocumento, u.numeroDocumento)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-1.5 text-sm text-muted-foreground">{u.correo}</td>
                    <td className="px-4 py-1.5">
                      {/* Columna "Rol actual": sólo los chips semánticos (sin lista
                          larga). Administrador → "Super Administrador"; empleado →
                          "Empleado" + "Cliente" con contador de extras "+N";
                          sólo cliente → "Cliente". */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {esAdmin ? (
                          <>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Super Administrador</span>
                            {esCliente && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">Cliente</span>
                            )}
                          </>
                        ) : esEmpleado ? (
                          <>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Empleado</span>
                            <span className="relative px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                              Cliente
                              {extrasFila.length > 0 && (
                                <span title={extrasFila.map(r => r.nombre).join(", ")}
                                  className="absolute -right-[8px] -top-[6px] inline-flex items-center justify-center h-[17px] min-w-[17px] px-1 rounded-full bg-primary text-white text-[10px] font-bold leading-none whitespace-nowrap">
                                  +{extrasFila.length}
                                </span>
                              )}
                            </span>
                          </>
                        ) : (
                          rolesFila.map(r => (
                            <span key={r.id} className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${rolColor(r, esCliente, esEmpleado)} ${!r.activo ? "opacity-50" : ""}`}>
                              {r.nombre}
                            </span>
                          ))
                        )}
                        {rolInactivo && !esAdmin && !esEmpleado && (
                          <span title="Rol inactivo" className="flex items-center shrink-0">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-1.5">
                      {/* Pill de estado (diseño de Proveedores). Aplica el
                          MISMO cambio que el botón del detalle, con la misma
                          regla del último usuario con todos los permisos.
                          P7: para la super administradora el pill queda
                          deshabilitado con su explicación. */}
                      <span title="Disponible próximamente" className="inline-flex">
                        <EstadoSelect
                          value={u.activo ? "activo" : "inactivo"}
                          disabled
                          onChange={nuevoEstado => {
                            if ((nuevoEstado === "activo") === u.activo) return;
                            aplicarCambioEstado(u, nuevoEstado === "activo");
                          }}
                          options={[
                            { value: "activo", label: "Activo", color: ESTADO_ACTIVO_COLOR },
                            { value: "inactivo", label: "Inactivo", color: ESTADO_INACTIVO_COLOR },
                          ]}
                        />
                      </span>
                    </td>
                    <td className="px-4 py-1.5">
                      {/* P7: editar y eliminar quedan deshabilitados para la
                          cuenta de super administrador, con el tooltip que
                          explica el motivo. */}
                      <ActionIcons
                        onView={() => setDetail(u)}
                        onEdit={canEdit ? () => toast.info("Disponible próximamente") : undefined}
                        editDisabled={canEdit}
                        editTitle="Disponible próximamente"
                        onDelete={canDelete ? () => setDeleteId(u.id) : undefined}
                        deleteDisabled={canDelete && esSuperAdmin(u)}
                        deleteTitle={TITULO_SUPER_ADMIN}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación (unificada, fuera de la card) */}
      {filtered.length > 0 && (
        <Paginador pagina={pageActual} totalPaginas={totalPages} onCambio={setPage} />
      )}

      {/* ── Modal: Ver detalle ──
          Misma estructura que "Detalle — {rol}" de Configuración > Roles: título
          con el nombre de la persona (nunca el id técnico), datos en cuadrícula de
          2 columnas, cuerpo con scroll interno para la tabla de permisos y pie
          siempre visible con los dos botones. */}
      <AnimatePresence>
        {detail && (() => {
    const correo = detail.correo.trim().toLowerCase();
    const claveD = claveDoc(detail.tipoDocumento, detail.numeroDocumento);
          const rolesDetalle = rolesDeUsuario(detail, roles, empleados, clientes);
          const esCliente = rolesDetalle.some(r => r.nombre.trim().toLowerCase() === "cliente");
          const esEmpleado = !!detail.esEmpleado;
          return (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto overflow-x-hidden">
              <div className="flex min-h-full items-center justify-center p-4">
              <motion.div initial={{scale:.95,opacity:0}} animate={{scale:1,opacity:1}}
                exit={{scale:.95,opacity:0}} transition={{duration:.15}}
                className="bg-card rounded-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] shadow-2xl border border-border my-4 flex flex-col overflow-hidden">

                <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full ${detail.avatarColor} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                      {detail.iniciales}
                    </div>
                    {/* Solo el nombre: el id técnico (USR-00X) no se muestra. */}
                    <h3 className="text-lg font-bold text-foreground truncate" style={{fontFamily:SERIF}}>Detalle — {detail.nombre}</h3>
                  </div>
                  <button onClick={() => setDetail(null)}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground shrink-0">
                    <X className="w-4 h-4"/>
                  </button>
                </div>

                {/* Todo el cuerpo (datos + tablas) vive en el área con scroll
                    interno; el pie queda fuera, así "Editar usuario" y "Cerrar"
                    siempre se ven aunque la lista de permisos sea larga. */}
                <div className="px-5 pb-4 flex-1 min-h-0 overflow-y-auto">
                  <div className="pt-4 space-y-4">
                  {/* Datos en cuadrícula de 2 columnas: Tipo de documento | Número
                      de documento / Nombre completo | Teléfono / Rol | Estado /
                      (Correo, el único dato de texto libre y largo, ocupa las 2). */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {[
                      { l: "Tipo de documento",   v: detail.tipoDocumento,   ancho: false, chip: undefined, chips: undefined },
                      { l: "Número de documento", v: detail.numeroDocumento, ancho: false, chip: undefined, chips: undefined },
                      { l: "Nombre completo",     v: detail.nombre,           ancho: false, chip: undefined, chips: undefined },
                      { l: "Teléfono",            v: detail.telefono,         ancho: false, chip: undefined, chips: undefined },
                      {
                        // P6: se listan TODOS los roles que la persona posee
                        // en este momento (rolId + ficha de empleado + Cliente
                        // si está en `clientes`), con chip por cada uno.
                        // P8: la super administradora se etiqueta como
                        // "Super Administrador".
                        l: "Roles", v: "", ancho: false, chip: undefined,
                        chips: rolesDetalle.map(r => ({
                          label: esSuperAdmin(detail) && r.nombre.trim().toLowerCase() === "administrador" ? "Super Administrador" : r.nombre,
                          color: rolColor(r, esCliente, esEmpleado),
                          aviso: !r.activo,
                        })),
                      },
                      {
                        l: "Estado", v: detail.activo ? "Activo" : "Inactivo", ancho: false,
                        chip: { color: detail.activo ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600", aviso: false },
                        chips: undefined,
                      },
                      { l: "Correo", v: detail.correo, ancho: true, chip: undefined, chips: undefined },
                    ].map(({ l, v, ancho, chip, chips }) => (
                      <div key={l} className={`flex flex-col gap-0.5 min-w-0 ${ancho ? "col-span-2" : ""}`}>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{l}</span>
                        {chips ? (
                          <span className="flex items-center gap-1.5 flex-wrap">
                            {chips.map(c => (
                              <span key={c.label} className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.color} ${c.aviso ? "opacity-60" : ""}`}>{c.label}</span>
                            ))}
                            {chips.some(c => c.aviso) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                <AlertTriangle className="w-3 h-3" /> Rol inactivo
                              </span>
                            )}
                          </span>
                        ) : chip ? (
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${chip.color} ${chip.aviso ? "opacity-60" : ""}`}>{v || "—"}</span>
                            {chip.aviso && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                <AlertTriangle className="w-3 h-3" /> Rol inactivo
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-foreground break-words">{v || "—"}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Permisos de los roles reales de la persona. Se reutiliza tal
                      cual `PermisosTablaDetalle`, la misma tabla de solo lectura
                      del detalle de rol: sin acordeón y sin un solo clic, con
                      todos los módulos, sub-módulos y privilegios a la vista. Si
                      la persona tiene más de un rol, se dibuja una tabla por
                      cada uno, con su propio título y su propio contador. */}
                  {rolesDetalle.map(rol => (
                    <div key={rol.id}>
                      <div className="flex items-center justify-between gap-3 pb-2 border-b border-border">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Permisos del rol {rol.nombre}
                        </p>
                        <span className="text-xs text-primary font-semibold shrink-0">
                          {textoPermisosModulos(rol.accesos)}
                        </span>
                      </div>
                      {countAccesos(rol.accesos) === 0 ? (
                        <p className="pt-2 text-sm text-muted-foreground italic">Este rol no tiene permisos asignados</p>
                      ) : (
                        <PermisosTablaDetalle accesos={rol.accesos} />
                      )}
                    </div>
                  ))}

                  {/* Cambiar estado — P7: deshabilitado para la cuenta de
                      super administrador, con el tooltip que explica el
                      motivo. */}
                  {canEdit && (
                  <button onClick={cambiarEstado}
                    disabled={esSuperAdmin(detail)}
                    title={esSuperAdmin(detail) ? TITULO_SUPER_ADMIN : undefined}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors active:scale-95 ${
                      esSuperAdmin(detail)
                        ? "opacity-50 cursor-not-allowed border-border text-muted-foreground"
                        : detail.activo
                          ? "border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer"
                          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                    }`}>
                    <RefreshCw className="w-4 h-4" />
                    {detail.activo ? "Desactivar usuario" : "Activar usuario"}
                  </button>
                  )}
                  </div>
                </div>

                <div className="flex gap-3 px-5 py-3 border-t border-border shrink-0">
                  {canEdit && (
                  <button onClick={() => { setDetail(null); abrirEdicion(detail); }}
                    // P7: la super administradora no se puede editar desde
                    // ningún flujo, incluido este acceso rápido del detalle.
                    disabled={esSuperAdmin(detail)}
                    title={esSuperAdmin(detail) ? TITULO_SUPER_ADMIN : undefined}
                    className={`flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold transition-colors ${esSuperAdmin(detail) ? "opacity-50 cursor-not-allowed text-muted-foreground" : "text-foreground hover:bg-muted cursor-pointer"}`}>
                    Editar usuario
                  </button>
                  )}
                  <button onClick={() => setDetail(null)}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors">
                    Cerrar
                  </button>
                </div>
              </motion.div>
              </div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Modal: Editar usuario ── */}
     {/* ── Modal: Editar usuario ── */}
      <AnimatePresence>
        {editItem && (
           <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto overflow-x-hidden">
            <div className="flex min-h-full items-center justify-center p-4">
            <motion.div initial={{scale:.95,opacity:0}} animate={{scale:1,opacity:1}}
              exit={{scale:.95,opacity:0}} transition={{duration:.15}}
               className="bg-card rounded-2xl w-full max-w-xl shadow-2xl border border-border my-4">

              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <h3 className="text-lg font-bold text-foreground" style={{fontFamily:SERIF}}>Editar Usuario</h3>
                <button onClick={() => setEditItem(null)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                  <X className="w-4 h-4"/>
                </button>
              </div>

              <div className="px-5 py-4 space-y-4 overflow-visible">
                {/* Avatar preview */}
                <div className="flex items-center gap-3 pb-2">
                  <div className={`w-12 h-12 rounded-full ${editItem.avatarColor} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {editItem.iniciales}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{editItem.nombre}</p>
                    <p className="text-xs font-mono text-muted-foreground">{fmtDoc(editItem.tipoDocumento, editItem.numeroDocumento)}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="w-full sm:w-56 shrink-0">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1 whitespace-nowrap">Tipo de documento <span className="text-primary">*</span></label>
                    <select
                      disabled
                      value={editItem.tipoDocumento}
                      onChange={e => { setEditItem(x => x && ({ ...x, tipoDocumento: e.target.value })); if (editErrors.tipoDocumento) setEditErrors(p => ({ ...p, tipoDocumento: undefined })); }}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/60 text-sm text-muted-foreground cursor-not-allowed"
                    >
                      {DOC_TIPOS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                    </select>
                    {editErrors.tipoDocumento && <p className="text-xs text-red-500 mt-1 leading-tight">{editErrors.tipoDocumento}</p>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Número de documento <span className="text-primary">*</span></label>
                    <input
                      type="text"
                       inputMode="numeric"
                      value={editItem.numeroDocumento}
                      readOnly
                      autoComplete="off"
                       placeholder="12345678"
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/60 text-sm text-muted-foreground cursor-not-allowed"
                    />
                    {editErrors.numeroDocumento && <p className="text-xs text-red-500 mt-1 leading-tight">{editErrors.numeroDocumento}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-4">
                {[
                  { label: "Nombre completo", field: "nombre"    as const, type: "text", full: true  },
                  { label: "Correo",          field: "correo"    as const, type: "email" },
                  { label: "Teléfono",        field: "telefono"  as const, type: "tel", numeric: true },
                ].map(({ label, field, type, numeric, full }) => (
                  <div key={field} className={full ? "sm:col-span-2" : "min-w-0"}>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
                    <input
                      type={type}
                      inputMode={numeric ? "numeric" : undefined}
                      value={editItem[field]}
                      autoComplete="off"
                       onChange={e => { const v = field === "correo" ? filtrarCorreo(e.target.value) : field === "nombre" ? filtrarNombre(e.target.value) : numeric ? soloDigitos(e.target.value) : e.target.value; setEditItem(x => x && ({ ...x, [field]: v })); setEditErrors(p => ({ ...p, [field]: field === "correo" ? validarCorreo(v) ?? undefined : field === "nombre" ? validarNombre(v) ?? undefined : undefined })); }}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${editErrors[field] ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    />
                    {editErrors[field] && <p className="text-xs text-red-500 mt-1 leading-tight">{editErrors[field]}</p>}
                  </div>
                ))}

                <div>
                  {/* CARGO = ROL (multi-rol). Con ficha de Empleado se editan los
                      cargos con el mismo selector que usa la pantalla de
                      Empleados, y al guardar se reflejan también en la
                      contratación vigente. Sin ficha el campo es de solo
                      lectura: para asignar roles hay que registrar primero la
                      ficha en Gestión de Empleados. */}
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Cargos (roles) <span className="text-primary">*</span>
                  </label>
                  {(() => {
                    const ficha = fichaEmpleadoDe(editItem);
                    if (ficha && !esSuperAdmin(editItem)) {
                      return (
                        <SelectorRoles
                          roles={roles}
                          value={editItem.rolIds ?? []}
                          onChange={ids => { setEditItem(x => x && ({ ...x, rolIds: ids })); if (editErrors.rolIds) setEditErrors(p => ({ ...p, rolIds: undefined })); }}
                          error={editErrors.rolIds}
                        />
                      );
                    }
                    return (
                      <>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {(() => {
                            const actuales = rolesDeUsuario(editItem, roles, empleados, clientes);
                            return actuales.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">Sin roles registrados</span>
                            ) : actuales.map(r => (
                              <span key={r.id} className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${!r.activo ? "opacity-50" : ""} ${
                                esSuperAdmin(editItem) && r.nombre.trim().toLowerCase() === "administrador"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-muted text-foreground border border-border"
                              }`}>
                                {esSuperAdmin(editItem) && r.nombre.trim().toLowerCase() === "administrador" ? "Super Administrador" : r.nombre}
                                {!r.activo ? " (Inactivo)" : ""}
                              </span>
                            ));
                          })()}
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">
                          {esSuperAdmin(editItem)
                            ? "La cuenta de super administrador no puede cambiar sus cargos."
                            : "Este usuario no tiene ficha de empleado. Para asignarle roles, regístralo en Gestión de Empleados."}
                        </p>
                      </>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                  {/* P7: el estado de la super administradora no se puede
                      cambiar desde el modal de edición tampoco.
                      Punto 3.2: 2 opciones → control segmentado. */}
                  <SegmentadoButtons
                    disabled={esSuperAdmin(editItem)}
                    title={esSuperAdmin(editItem) ? TITULO_SUPER_ADMIN : undefined}
                    valor={editItem.activo ? "activo" : "inactivo"}
                    onChange={valor => setEditItem(x => x && ({ ...x, activo: valor === "activo" }))}
                    opciones={[
                      { valor: "activo", etiqueta: "Activo" },
                      { valor: "inactivo", etiqueta: "Inactivo" },
                    ]}
                  />
                </div>
                </div>
              </div>

              <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
                <button onClick={() => setEditItem(null)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                  Cancelar
                </button>
                <button onClick={handleEdit}
                  // P7: doble barrera — además de los guards de handleEdit,
                  // el botón viene deshabilitado para la super administradora.
                  disabled={esSuperAdmin(editItem)}
                  title={esSuperAdmin(editItem) ? TITULO_SUPER_ADMIN : undefined}
                  className={`flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold transition-colors active:scale-95 ${esSuperAdmin(editItem) ? "opacity-50 cursor-not-allowed" : "hover:bg-red-700 cursor-pointer"}`}>
                  Guardar cambios
                </button>
              </div>
            </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
      {/* ── Modal: Confirmar eliminación ── */}
      <AnimatePresence>
        {deleteId && (
          <ConfirmDeleteModal
            title="Eliminar usuario"
            message={<>¿Seguro que deseas eliminar a <strong className="text-foreground">{usuarios.find(u => u.id === deleteId)?.nombre}</strong>? Esta acción no se puede deshacer.</>}
            onConfirm={() => handleDelete(deleteId)}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Modal: Crear usuario ── */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
                exit={{ scale:.95, opacity:0 }} transition={{ duration:.15 }}
                className="bg-card rounded-2xl w-full max-w-xl shadow-2xl border border-border my-4">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Crear Usuario</h3>
                  <button onClick={() => { setShowCreate(false); resetCreate(); }}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {/* Documento */}
                   <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="w-full sm:w-56 shrink-0">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1 whitespace-nowrap">
                        Tipo de documento <span className="text-primary">*</span>
                      </label>
                      <select
                        value={newTipoDoc}
                         onChange={e => { setNewTipoDoc(e.target.value); setCreateErrors(p => ({ ...p, tipoDocumento: undefined, numeroDocumento: newDocumento ? validarDocumento(newDocumento, e.target.value) ?? undefined : undefined })); }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer ${createErrors.tipoDocumento ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                      >
                        {DOC_TIPOS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                      </select>
                      {createErrors.tipoDocumento && <p className="text-xs text-red-500 mt-1 leading-tight">{createErrors.tipoDocumento}</p>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        Número de documento <span className="text-primary">*</span>
                      </label>
                      <input
                        type="text"
                         inputMode="numeric"
                        value={newDocumento}
                       autoComplete="off"
                         onChange={e => { const v = filtrarDocumento(e.target.value, newTipoDoc); setNewDocumento(v); setCreateErrors(p => ({ ...p, numeroDocumento: v ? validarDocumento(v, newTipoDoc) ?? undefined : undefined })); }}
                         placeholder="12345678"
                        className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${createErrors.numeroDocumento ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                      />
                      {createErrors.numeroDocumento && <p className="text-xs text-red-500 mt-1 leading-tight">{createErrors.numeroDocumento}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-4">
                  {/* Nombre */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Nombre completo <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      value={newNombre}
                       onChange={e => { const v = filtrarNombre(e.target.value); setNewNombre(v); setCreateErrors(p => ({ ...p, nombre: validarNombre(v) ?? undefined })); }}
                      placeholder="Ej: Laura Martínez"
                      autoFocus
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${createErrors.nombre ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    />
                    {createErrors.nombre && <p className="text-xs text-red-500 mt-1 leading-tight">{createErrors.nombre}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Correo electrónico <span className="text-primary">*</span>
                    </label>
                    <input
                      type="email"
                      value={newCorreo}
                      autoComplete="off"
                       onChange={e => { const v = filtrarCorreo(e.target.value); setNewCorreo(v); setCreateErrors(p => ({ ...p, correo: validarCorreo(v) ?? undefined })); }}
                      placeholder="correo@ejemplo.com"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${createErrors.correo ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    />
                    {createErrors.correo && <p className="text-xs text-red-500 mt-1 leading-tight">{createErrors.correo}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Número de teléfono <span className="text-primary">*</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={newTelefono}
                      autoComplete="off"
                      onChange={e => { setNewTelefono(soloDigitos(e.target.value)); if (createErrors.telefono) setCreateErrors(p => ({ ...p, telefono: undefined })); }}
                      placeholder="3001234567"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${createErrors.telefono ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    />
                    {createErrors.telefono && <p className="text-xs text-red-500 mt-1 leading-tight">{createErrors.telefono}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Rol <span className="text-primary">*</span>
                    </label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        value={rolSearch}
                        onChange={e => setRolSearch(e.target.value)}
                        placeholder="Buscar rol por nombre..."
                        className="w-full pl-10 pr-4 py-2 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <select
                      value={newRolId}
                      onChange={e => { setNewRolId(e.target.value); if (createErrors.rolId) setCreateErrors(p => ({ ...p, rolId: undefined })); }}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer ${createErrors.rolId ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`}
                    >
                      <option value="">Selecciona un rol…</option>
                      {roles.filter(r => r.activo && r.nombre.toLowerCase().includes(rolSearch.toLowerCase())).map(r => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                    {createErrors.rolId && <p className="text-xs text-red-500 mt-1 leading-tight">{createErrors.rolId}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                    {/* Punto 3.2: 2 opciones → control segmentado */}
                    <SegmentadoButtons
                      valor={newActivo ? "activo" : "inactivo"}
                      onChange={valor => setNewActivo(valor === "activo")}
                      opciones={[
                        { valor: "activo", etiqueta: "Activo" },
                        { valor: "inactivo", etiqueta: "Inactivo" },
                      ]}
                    />
                  </div>
                  </div>
                </div>

                <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
                  <button onClick={() => { setShowCreate(false); resetCreate(); }}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleCreate}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95">
                    Crear usuario
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
