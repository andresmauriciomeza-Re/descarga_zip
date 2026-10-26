import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Briefcase, RefreshCw, Send, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  cambiarEstadoEmpleado,
  crearContratacion,
  crearEmpleado,
  editarEmpleado,
  listarCargos,
  listarEmpleados,
  reenviarInvitacion,
} from "@/shared/services/empleadosService";
import type { ApiErrorConEstado, ContratacionApi, CrearEmpleadoResponse, EmpleadoApi } from "@/types/api";
import {
  EstadoSelect,
  ESTADO_ACTIVO_COLOR,
  ESTADO_INACTIVO_COLOR,
} from "@/shared/components/EstadoSelect";
import { SearchInput } from "@/shared/components/SearchInput";
import { Paginador } from "@/shared/components/Paginador";
import { SegmentadoButtons } from "@/shared/components/SegmentadoButtons";
import { ActionIcons } from "@/shared/components/ActionIcons";
import { filtrarCorreo, filtrarDocumento, filtrarNombre, MarcaObligatorio, normalizarNombre, soloDigitos, validarCorreo, validarDocumento, validarNombre, validarTelefono, validarTelefonoOpcional } from "@/shared/components/campo";
import { SelectorRoles } from "@/shared/components/SelectorRoles";
import { type Rol } from "@/features/roles/pages/GestionConfigScreen";
import { DOC_TIPOS, fmtDoc } from "@/features/usuarios/pages/GestionUsuariosScreen";
import { type Cliente } from "@/features/clientes/pages/GestionClientesScreen";

const SERIF = "var(--font-titulo)";
const MONO  = "var(--font-texto)";

const AVATAR_COLORS = [
  "bg-red-500","bg-blue-500","bg-emerald-500",
  "bg-purple-500","bg-amber-500","bg-pink-500","bg-indigo-500","bg-teal-500",
];

// Una contratación del empleado. `Empleado.rolIds/fechaInicio/fechaFinal`
// guarda SOLO la contratación actual (lo que ve la tabla); aquí va el
// historial completo, para no perder los cambios de cargo ni los reingresos.
// CARGO = ROL: no existe un texto de cargo aparte, cada entrada guarda los
// roles (cargos) que el empleado tenía en ese período. Todos los ids vienen de
// la base (id_contrato / id_rol) y viajan como texto.
export interface Contratacion {
  id: string;           // id_contrato ("7")
  rolIds: string[];     // String(id_rol) de los cargos de esa contratación
  fechaInicio: string;  // YYYY-MM-DD
  fechaFinal: string;   // "" si no tiene fecha final
}

export interface Empleado {
  id: string;              // id_empleado de la base ("12"), NO el documento
  nombre: string;
  iniciales: string;
  avatarColor: string;
  correo: string;
  telefono: string;
  tipoDocumento: string;
  numeroDocumento: string;
  rolIds: string[];        // cargos/roles de la contratación actual
  activo: boolean;         // Tb_Empleado.Estado
  esSuperAdmin?: boolean;
  fechaInicio: string;     // Contratacion_empleado.Fecha_inicio (actual)
  fechaFinal: string;      // Contratacion_empleado.Fecha_final ("" si no tiene)
  /** La contratación actual sigue abierta (vigente o por empezar): solo esa se edita. */
  contratoAbierto?: boolean;
  /** La cuenta aún no se activó: se le puede reenviar la invitación. */
  invitacionPendiente?: boolean;
  contrataciones: Contratacion[]; // historial
}

// De la más reciente a la más antigua. Primero por fecha de inicio y, si empatan
// (dos contrataciones el mismo día), por id, que ya refleja el orden en que se
// fueron registrando.
export const ordenarContrataciones = (cs: Contratacion[]): Contratacion[] =>
  [...cs].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio) || Number(b.id) - Number(a.id) || b.id.localeCompare(a.id));

const mapearContratacionApi = (c: ContratacionApi): Contratacion => ({
  id: String(c.idContrato),
  rolIds: c.roles.map(r => String(r.idRol)),
  fechaInicio: c.fechaInicio,
  fechaFinal: c.fechaFinal ?? "",
});

/** Respuesta de la API → ficha de la pantalla. La contratación "actual" es la
 *  vigente; si no hay, la abierta más reciente (por empezar) y, si tampoco, la
 *  última del historial. */
export const mapearEmpleadoApi = (e: EmpleadoApi): Empleado => {
  const actual = e.contratacionVigente
    ?? e.contrataciones.find(c => c.abierta)
    ?? e.contrataciones[0]
    ?? null;
  return {
    id: String(e.idEmpleado),
    nombre: e.nombre,
    iniciales: e.nombre.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase(),
    avatarColor: AVATAR_COLORS[e.idEmpleado % AVATAR_COLORS.length],
    correo: e.correo,
    telefono: e.telefono,
    tipoDocumento: e.tipoDocumento,
    numeroDocumento: e.numeroDocumento,
    rolIds: actual ? actual.roles.map(r => String(r.idRol)) : [],
    activo: e.estado,
    esSuperAdmin: e.esSuperAdmin,
    fechaInicio: actual?.fechaInicio ?? "",
    fechaFinal: actual?.fechaFinal ?? "",
    contratoAbierto: actual?.abierta ?? false,
    invitacionPendiente: e.invitacionPendiente,
    contrataciones: e.contrataciones.map(mapearContratacionApi),
  };
};

/** Mensaje para el usuario a partir de un error de la API (403 y 409 con texto claro). */
const mensajeError = (error: unknown, porDefecto: string): string => {
  const e = error as ApiErrorConEstado;
  if (e?.status === 403) return e.message || "No tienes permiso para realizar esta acción.";
  return e?.message || porDefecto;
};

// ── Cuenta de super administrador (Gloria) ─────────────────────────────────
// La marca proviene del usuario autenticado/del API, no de la semilla local.
const esSuperAdmin = (e: Pick<Empleado, "esSuperAdmin">): boolean => e.esSuperAdmin === true;
const TITULO_SUPER_ADMIN = "Cuenta de super administrador";

export function GestionEmpleadosScreen({
  clientes,
  empleadoAAbrirDesdeUsuarios = null,
  onEmpleadoAbiertoDesdeUsuarios,
}: {
  clientes: Cliente[];
  empleadoAAbrirDesdeUsuarios?: { tipoDocumento: string; numeroDocumento: string } | null;
  onEmpleadoAbiertoDesdeUsuarios?: () => void;
}) {
  const [search,      setSearch]    = useState("");
  const [filterEstado,setFiltro]    = useState("todos");
  const [editErrors,  setEditErrors] = useState<Record<string, string | undefined>>({});
  const [sortBy,      setSortBy]    = useState("nombre");
  const [page,        setPage]      = useState(1);
  const [detailItem,  setDetailItem] = useState<Empleado | null>(null);
  const [editItem,    setEditItem]  = useState<Empleado | null>(null);
  const [showCreate,  setShowCreate] = useState(false);

  // Fuente de verdad = la base (API). Nada de esto se guarda en localStorage.
  const [empleados,   setEmpleados] = useState<Empleado[]>([]);
  const [cargosApi,   setCargosApi] = useState<{ id: string; nombre: string }[]>([]);
  const [nombresRoles, setNombresRoles] = useState<Map<string, string>>(new Map());
  const [cargando,    setCargando]  = useState(true);
  const [errorCarga,  setErrorCarga] = useState<string | null>(null);
  const [guardando,   setGuardando] = useState(false);
  const [guardandoCtr, setGuardandoCtr] = useState(false);

  // `mostrarCarga`: la primera carga y "Reintentar" reemplazan la tabla por el
  // estado de carga/error; las recargas posteriores a un cambio son silenciosas
  // (la lista se queda y, si fallan, avisan con un toast).
  const cargarEmpleados = async (mostrarCarga = true) => {
    if (mostrarCarga) { setCargando(true); setErrorCarga(null); }
    try {
      const [lista, cargos] = await Promise.all([listarEmpleados(), listarCargos()]);
      const nombres = new Map<string, string>();
      for (const emp of lista.empleados) {
        for (const c of emp.contrataciones) for (const r of c.roles) nombres.set(String(r.idRol), r.nombre);
      }
      setNombresRoles(nombres);
      setCargosApi(cargos.cargos.map(c => ({ id: String(c.idRol), nombre: c.nombre })));
      setEmpleados(lista.empleados.map(mapearEmpleadoApi));
    } catch (error) {
      const mensaje = mensajeError(error, "No se pudieron cargar los empleados.");
      if (mostrarCarga) setErrorCarga(mensaje); else toast.error(mensaje);
    } finally {
      if (mostrarCarga) setCargando(false);
    }
  };

  useEffect(() => { void cargarEmpleados(); }, []);

  // Catálogo para el selector y para pintar nombres: los cargos asignables vienen
  // de GET /empleados/cargos (no depende del permiso de Roles); los demás roles
  // que aparecen en las contrataciones (Cliente, un cargo ya desactivado…) solo
  // sirven para mostrar su nombre y quedan como no asignables.
  const roles: Rol[] = useMemo(() => {
    const asignables = new Set(cargosApi.map(c => c.id));
    const todos = new Map(nombresRoles);
    cargosApi.forEach(c => todos.set(c.id, c.nombre));
    return [...todos].map(([id, nombre]) => ({
      id, nombre, descripcion: "", accesos: {}, activo: asignables.has(id),
    }));
  }, [cargosApi, nombresRoles]);

  // Documentos con invitación pendiente: salen del mismo listado (el botón
  // "Reenviar invitación" solo se pinta para ellos).
  const invitacionesPendientes = useMemo(
    () => new Set(empleados.filter(e => e.invitacionPendiente).map(e => e.numeroDocumento)),
    [empleados],
  );

  // El detalle abierto se refresca solo cuando la lista se recarga.
  useEffect(() => {
    setDetailItem(d => (d ? empleados.find(x => x.id === d.id) ?? d : d));
  }, [empleados]);

  useEffect(() => {
    if (!empleadoAAbrirDesdeUsuarios || cargando) return;
    const empleado = empleados.find(e =>
      e.numeroDocumento === empleadoAAbrirDesdeUsuarios.numeroDocumento &&
      e.tipoDocumento === empleadoAAbrirDesdeUsuarios.tipoDocumento
    );
    if (empleado) {
      setEditItem({ ...empleado });
      setEditErrors({});
    }
    onEmpleadoAbiertoDesdeUsuarios?.();
  }, [empleadoAAbrirDesdeUsuarios, empleados, cargando]);

  // Modal "Nueva contratación": registra una entrada más en el historial del
  // empleado elegido y, con esos mismos datos, actualiza su contratación vigente.
  const [showContrat,       setShowContrat]      = useState(false);
  const [ctrEmpleadoId,     setCtrEmpleadoId]    = useState("");
  const [ctrActivo,         setCtrActivo]        = useState(true);
  const [ctrRolIds,         setCtrRolIds]        = useState<string[]>([]);
  const [ctrFechaInicio,    setCtrFechaInicio]   = useState("");
  const [ctrFechaFinal,     setCtrFechaFinal]    = useState("");
  const [ctrErrors,         setCtrErrors]        = useState<Record<string, string | undefined>>({});

  const [newNombre,       setNewNombre]       = useState("");
  const [newCorreo,       setNewCorreo]       = useState("");
  const [newTelefono,     setNewTelefono]     = useState("");
  const [newTipoDoc,      setNewTipoDoc]      = useState("CC");
  const [newDocumento,    setNewDocumento]    = useState("");
  const [newActivo,       setNewActivo]       = useState(true);
  const [newRolIds,       setNewRolIds]       = useState<string[]>([]);
  const [newFechaInicio,  setNewFechaInicio]  = useState("");
  const [newFechaFinal,   setNewFechaFinal]   = useState("");
  const [createErrors,    setCreateErrors]    = useState<Record<string, string | undefined>>({});

  // Quién está reenviando una invitación y si el alta está en curso.
  const [reenviando, setReenviando] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const rolInfo = (rolId: string) => roles.find(r => r.id === rolId) ?? null;
  // Nombre del rol para mostrar. Un empleado sin rol (id vacío o de un rol que
  // ya no existe) se muestra como "-", nunca como un id interno suelto.
  const rolNombre = (rolId: string) => rolInfo(rolId)?.nombre ?? "-";
  // Cargos = nombres de los roles indicados, en el MISMO orden en que se
  // guardaron (el primero es el cargo principal, el que usan el buscador y el
  // orden "por cargo"). Los ids de roles borrados simplemente no aportan texto.
  const cargosDe = (rolIds?: string[]) =>
    (rolIds ?? []).map(id => rolNombre(id)).filter(n => n !== "-");
  // Cargo visible = sólo los roles EXTRA (Cajero, Mesero, creados). Los base
  // (Empleado, Cliente, Administrador) no estorban: si no hay extra, el cargo
  // visible es "Empleado".
  const extrasDe = (rolIds?: string[]) =>
    cargosDe(rolIds).filter(n => {
      const x = n.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return x !== "empleado" && x !== "cliente" && x !== "administrador";
    });
  const cargosMostrados = (rolIds?: string[]) => {
    const ex = extrasDe(rolIds);
    return ex.length > 0 ? ex : ["Empleado"];
  };
  const primerCargo = (rolIds?: string[]) => cargosMostrados(rolIds)[0] ?? "-";

  // Chips de cargo (máximo 2 + "+N") usados en la tabla. `title` de la caja
  // lista TODOS los cargos, incluidos los que se ocultan tras el "+N".
  const chipsCargos = (rolIds: string[], extraCls = "") => {
    const nombres = cargosMostrados(rolIds);
    if (nombres.length === 0) return <span className="text-muted-foreground">—</span>;
    const visibles = nombres.slice(0, 2);
    const resto = nombres.slice(2);
    return (
      <span title={nombres.join(" · ")} className={`inline-flex flex-wrap items-center gap-1 ${extraCls}`}>
        {visibles.map(n => (
          <span key={n} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-muted border border-border text-foreground whitespace-nowrap">
            {n}
          </span>
        ))}
        {resto.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 border border-primary/20 text-primary whitespace-nowrap">
            +{resto.length}
          </span>
        )}
      </span>
    );
  };

  // Historial del empleado abierto en el modal de detalle, de la contratación
  // más reciente a la más antigua. Un `empleado` leído de una build anterior
  // podría no tener la lista, así que se tolerate como vacío.
  const detalleHistorial = useMemo(
    () => (detailItem ? ordenarContrataciones(detailItem.contrataciones ?? []) : []),
    [detailItem],
  );


  const filtered = useMemo(() => {
    let r = empleados.filter(e => {
      const q = search.toLowerCase();
      const est = e.activo ? "activo" : "inactivo";
      const cargos = cargosMostrados(e.rolIds).join(" ").toLowerCase();
      const matchQ =
        !q ||
        e.nombre.toLowerCase().includes(q) ||
        e.correo.toLowerCase().includes(q) ||
        e.numeroDocumento.toLowerCase().includes(q) ||
        `${e.tipoDocumento} ${e.numeroDocumento}`.toLowerCase().includes(q) ||
        cargos.includes(q) ||
        est.includes(q);
      const matchE = filterEstado === "todos" || (filterEstado === "activo" ? e.activo : !e.activo);
      return matchQ && matchE;
    });
    // Ni "nombre" ni "cargo" dependen de `activo`: con el filtro en "Todos los
    // estados" los activos y los inactivos quedan intercalados. Se eliminó la
    // ordenación por estado, que solo servía para agruparlos en bloques.
    // "Cargo" = primer cargo (= primer rol de `rolIds`), así que la búsqueda y
    // la ordenación por cargo leen de `cargosDe`/`primerCargo`. `roles` va en
    // las dependencias porque de él salen esos nombres: sin él, editar o
    // desactivar un rol dejaría la lista ordenada y filtrada por el nombre
    // anterior.
    if (sortBy === "cargo") r = [...r].sort((a,b) => primerCargo(a.rolIds).localeCompare(primerCargo(b.rolIds)));
    else                    r = [...r].sort((a,b) => a.nombre.localeCompare(b.nombre));
    return r;
  }, [empleados, roles, search, filterEstado, sortBy]);

  // 5 empleados por página (unificado con el resto de listados): la tabla
  // nunca lleva scroll interno, la navegación es solo por el paginador.
  const PER_PAGE = 5;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  // La página efectiva nunca puede pasar de totalPages: si el conjunto filtrado
  // se reduce (p. ej. al apagar un switch con un filtro de estado activo) `page`
  // quedaría fuera de rango, la tabla saldría vacía y la paginación se ocultaría,
  // dejando al usuario sin forma de volver.
  const pageActual = Math.min(page, totalPages);
  const paged      = filtered.slice((pageActual-1)*PER_PAGE, pageActual*PER_PAGE);

  const toggleEstado = async (id: string) => {
    const cur = empleados.find(e => e.id === id);
    if (!cur) return;
    // El super administrador no se desactiva (el backend también lo rechaza); si
    // por datos viejos estuviera inactivo, sí se puede reactivar.
    if (esSuperAdmin(cur) && cur.activo) {
      toast.error("La cuenta del super administrador no se puede desactivar");
      return;
    }
    try {
      await cambiarEstadoEmpleado(Number(cur.id), !cur.activo);
      toast.success("Estado del empleado actualizado");
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo cambiar el estado del empleado."));
    }
    await cargarEmpleados(false);
  };

  // Nombres de los cargos extra (sin Empleado, Cliente ni Administrador), que es
  // como los recibe el backend.
  const cargosParaApi = (rolIds: string[]) => extrasDe(rolIds);

  const handleEdit = async () => {
    if (!editItem || guardando) return;
    const e = { ...editItem, nombre: normalizarNombre(editItem.nombre) };
    const errs: Record<string, string> = {};
    if (!e.nombre.trim()) errs.nombre = "El nombre es obligatorio";
    else { const v = validarNombre(e.nombre); if (v) errs.nombre = v; }
    if (!e.correo.trim()) errs.correo = "El correo es obligatorio";
    else { const v = validarCorreo(e.correo); if (v) errs.correo = v; }
    // Teléfono opcional: vacío vale, con valor aplica la regla única del
    // sistema (solo números, 7 a 15 dígitos).
    if (e.telefono.trim()) {
      const et = validarTelefono(e.telefono);
      if (et) errs.telefono = et;
    }
    // Las fechas solo se validan si hay una contratación abierta que editar.
    if (e.contratoAbierto) {
      if (!e.fechaInicio) errs.fechaInicio = "La fecha de inicio es obligatoria";
      if (e.fechaInicio && e.fechaFinal && e.fechaFinal < e.fechaInicio)
        errs.fechaFinal = "La fecha final no puede ser anterior a la fecha de inicio";
    }

    if (Object.values(errs).some(Boolean)) { setEditErrors(errs); return; }

    const original = empleados.find(x => x.id === e.id);
    setGuardando(true);
    try {
      // Cargos y fechas solo viajan si hay contratación abierta; el documento no
      // se edita. El backend decide los duplicados de correo (409).
      const res = await editarEmpleado(Number(e.id), {
        nombre: e.nombre,
        correo: e.correo.trim(),
        telefono: e.telefono.trim(),
        ...(e.contratoAbierto
          ? { cargos: cargosParaApi(e.rolIds), fechaInicio: e.fechaInicio, fechaFinal: e.fechaFinal }
          : {}),
      });
      // El estado es otra ruta: solo se llama si cambió (y nunca para el super admin).
      if (original && !esSuperAdmin(e) && original.activo !== e.activo) {
        await cambiarEstadoEmpleado(Number(e.id), e.activo);
      }
      setEditItem(null);
      setEditErrors({});
      if (res.correoEnviado === false) toast.error("Empleado actualizado, pero no se pudo enviar la invitación al correo nuevo");
      else if (res.correoEnviado === true) toast.success("Empleado actualizado. Enviamos la invitación al correo nuevo");
      else toast.success("Empleado actualizado correctamente");
    } catch (error) {
      const err = error as ApiErrorConEstado;
      const mensaje = mensajeError(error, "No se pudo actualizar el empleado.");
      if (err.status === 409 && /correo/i.test(mensaje)) setEditErrors(p => ({ ...p, correo: mensaje }));
      else if (err.status === 400 && /fecha/i.test(mensaje)) {
        setEditErrors(p => ({ ...p, [/fecha final no puede/i.test(mensaje) ? "fechaFinal" : "fechaInicio"]: mensaje }));
      }
      else if (err.status === 400 && /rol|cargo/i.test(mensaje)) setEditErrors(p => ({ ...p, cargo: mensaje }));
      else toast.error(mensaje);
    } finally {
      setGuardando(false);
      await cargarEmpleados(false);
    }
  };

  const resetCreate = () => {
    setNewNombre(""); setNewCorreo(""); setNewTelefono(""); setNewTipoDoc("CC");
    setNewDocumento("");
    setNewActivo(true);
    setNewRolIds([]);
    setNewFechaInicio(""); setNewFechaFinal(""); setCreateErrors({});
  };

  const handleCreate = async () => {
    const nombreNormalizado = normalizarNombre(newNombre);
    const errs: Record<string, string> = {};
    if (!nombreNormalizado) errs.nombre = "El nombre es obligatorio";
    if (!newCorreo.trim()) { errs.correo = "El correo es obligatorio"; }
    else if (validarCorreo(newCorreo)) { errs.correo = validarCorreo(newCorreo) as string; }
    // Teléfono opcional con la regla única (solo números, 7 a 15 dígitos).
    const etAlt = validarTelefonoOpcional(newTelefono);
    if (etAlt) errs.telefono = etAlt;
    if (!newTipoDoc.trim()) { errs.tipoDocumento = "Selecciona el tipo de documento"; }
    if (!newDocumento.trim()) { errs.documento = "El número de documento es obligatorio"; }
    else { const v = validarDocumento(newDocumento, newTipoDoc); if (v) errs.documento = v; }
    // Cargo: no hay mínimo de extras, porque "Empleado" siempre acompaña.
    const rolIdsExtras = newRolIds.filter(Boolean);
    // CARGO = ROL: los cargos elegidos viajan como NOMBRES de rol (los ids
    // locales no son los de la base; el backend asigna SIEMPRE Empleado y
    // Cliente, y rechaza Administrador). NUNCA EN SILENCIO: si el formulario
    // tiene cargos, el payload los lleva todos o el alta se bloquea con error
    // visible en el campo Cargo (nada de listas a medias).
    const nombresCargos = rolIdsExtras.map(rolNombre);
    const cargos = nombresCargos.filter(n => n !== "-");
    if (nombresCargos.length > 0 && cargos.length === 0) {
      errs.cargo = "No se pudieron enviar los cargos seleccionados. Vuelve a elegirlos.";
    } else if (cargos.length !== nombresCargos.length) {
      errs.cargo = "Uno de los cargos seleccionados ya no existe en el catálogo. Vuelve a elegirlos.";
    }
    if (!newFechaInicio) errs.fechaInicio = "La fecha de inicio es obligatoria";
    if (newFechaInicio && newFechaFinal && newFechaFinal < newFechaInicio)
      errs.fechaFinal = "La fecha final no puede ser anterior a la fecha de inicio";

    if (Object.keys(errs).length) { setCreateErrors(errs); return; }

    const em = newCorreo.trim();
    const dm = newDocumento.trim();

    // El backend decide los duplicados: una persona que ya existe como cliente
    // NO se bloquea (es el caso especial: se le asigna el rol Empleado y se le
    // avisa por correo). Solo la cuenta se crea sin contraseña.
    setCreando(true);
    let respuesta: CrearEmpleadoResponse;
    try {
      respuesta = await crearEmpleado({
        tipoDocumento: newTipoDoc,
        numeroDocumento: dm,
        nombre: nombreNormalizado,
        correo: em,
        telefono: newTelefono.trim(),
        estado: newActivo,
        cargos,
        fechaInicio: newFechaInicio,
        fechaFinal: newFechaFinal,
      });
    } catch (error) {
      const e = error as ApiErrorConEstado;
      const mensaje = e.message || "No se pudo crear el empleado.";
      if (e.status === 409 && /correo/i.test(mensaje)) setCreateErrors(p => ({ ...p, correo: mensaje }));
      else if (e.status === 409) setCreateErrors(p => ({ ...p, documento: mensaje }));
      else if (/rol/i.test(mensaje)) setCreateErrors(p => ({ ...p, cargo: mensaje }));
      else toast.error(mensaje);
      return;
    } finally {
      setCreando(false);
    }

    void cargarEmpleados(false);
    setShowCreate(false);
    resetCreate();
    if (respuesta.cuentaExistente) {
      if (respuesta.correoEnviado) {
        toast.success(`Empleado creado. ${nombreNormalizado} ya tenía cuenta; le enviamos un correo a ${respuesta.correo} avisándole que ya es parte del equipo.`);
      } else {
        toast.error("Empleado creado, pero no se pudo enviar el correo de aviso");
      }
    } else if (respuesta.correoEnviado) {
      toast.success(`Empleado creado. Le enviamos un correo a ${respuesta.correo} para que cree su contraseña.`);
    } else {
      toast.error("Empleado creado, pero no se pudo enviar el correo");
    }
  };

  // Reenvía la invitación con un token NUEVO (el enlace anterior deja de servir).
  const reenviarInvitacionDe = async (e: Empleado) => {
    if (reenviando) return;
    setReenviando(e.numeroDocumento);
    try {
      const res = await reenviarInvitacion(e.numeroDocumento);
      if (res.correoEnviado) toast.success(`Invitación reenviada a ${res.correo}`);
      else toast.error("No se pudo enviar el correo. Intenta de nuevo.");
    } catch (error) {
      const err = error as ApiErrorConEstado;
      toast.error(err.message || "No se pudo reenviar la invitación.");
      if (err.status === 404 || err.status === 409) {
        // Ya no aplica (cuenta activada o empleado desaparecido): se oculta.
        void cargarEmpleados(false);
      }
    } finally {
      setReenviando(null);
    }
  };

  const resetContratacion = () => {
    setCtrEmpleadoId(""); setCtrActivo(true);
    setCtrRolIds([]);
    setCtrFechaInicio(""); setCtrFechaFinal("");
    setCtrErrors({});
  };

  // Registra una contratación nueva. Añade la entrada al historial SIN tocar las
  // anteriores y, a la vez, deja los campos de contrato del empleado reflejando
  // esta última contratación, que es lo que muestra la tabla.
  // El cargo ya no es texto libre: es el multi-select de cargos (CARGO = ROL).
  const handleNuevaContratacion = async () => {
    if (guardandoCtr) return;
    const errs: Record<string, string> = {};
    const emp = empleados.find(e => e.id === ctrEmpleadoId);

    if (!ctrEmpleadoId) errs.empleado = "Selecciona un empleado";
    else if (!emp) errs.empleado = "El empleado seleccionado no existe";

    if (!ctrFechaInicio) errs.fechaInicio = "La fecha de inicio es obligatoria";
    // Solo tiene sentido si la contratación ya empezó: comparar como texto ISO
    // (YYYY-MM-DD) es equivalente a comparar fechas.
    if (ctrFechaFinal && ctrFechaFinal < ctrFechaInicio) {
      errs.fechaFinal = "La fecha final no puede ser anterior a la fecha de inicio";
    }

    if (Object.keys(errs).length) { setCtrErrors(errs); return; }

    // El backend cierra solo la contratación abierta (fecha final = inicio nuevo
    // − 1 día) y asigna siempre Empleado y Cliente; aquí solo van los cargos.
    setGuardandoCtr(true);
    try {
      await crearContratacion(Number(emp!.id), {
        fechaInicio: ctrFechaInicio,
        fechaFinal: ctrFechaFinal,
        cargos: cargosParaApi(ctrRolIds),
        estado: esSuperAdmin(emp!) ? true : ctrActivo,
      });
      setShowContrat(false);
      resetContratacion();
      toast.success(`Contratación registrada para ${emp!.nombre}`);
    } catch (error) {
      const err = error as ApiErrorConEstado;
      const mensaje = mensajeError(error, "No se pudo registrar la contratación.");
      if (err.status === 400 && /fecha final/i.test(mensaje)) setCtrErrors(p => ({ ...p, fechaFinal: mensaje }));
      else if (err.status === 400 && /fecha/i.test(mensaje)) setCtrErrors(p => ({ ...p, fechaInicio: mensaje }));
      else if (err.status === 400 && /rol|cargo/i.test(mensaje)) setCtrErrors(p => ({ ...p, cargo: mensaje }));
      else toast.error(mensaje);
    } finally {
      setGuardandoCtr(false);
      await cargarEmpleados(false);
    }
  };

  const iCls = "px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer";
  const fCls = (err?: string) =>
    `w-full px-3 py-2 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${err ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`;

  // Empleado elegido en el modal "Nueva contratación". Si es Gloria, su
  // selector de Estado queda deshabilitado con el tooltip del super
  // administrador (la edición de los demás datos sigue permitida).
  const ctrEmpleado = ctrEmpleadoId
    ? empleados.find(e => e.id === ctrEmpleadoId) ?? null
    : null;
  const ctrEsSuperAdmin = !!ctrEmpleado && esSuperAdmin(ctrEmpleado);

  return (
    <div className="px-4 sm:px-6 pt-5 pb-4 h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Empleados</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Usuarios registrados con tipo empleado en La Sirena</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { resetContratacion(); setShowContrat(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
          >
            <Briefcase className="w-4 h-4" /> Nueva contratación
          </button>
          <button
            onClick={() => { resetCreate(); setShowCreate(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Crear empleado
          </button>
        </div>
      </div>



      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5 shrink-0">
        <SearchInput
          value={search}
          onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Buscar por nombre, correo, cargo, documento o estado..."
          wrapperClassName="w-full max-w-sm shrink-0"
        />
        <select value={filterEstado} onChange={e => { setFiltro(e.target.value); setPage(1); }} className={iCls}>
          <option value="todos">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
        <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }} className={iCls}>
          <option value="nombre">Ordenar por nombre</option>
          <option value="cargo">Ordenar por cargo</option>
        </select>
      </div>

      {/* Tabla — la tarjeta recorta las esquinas redondeadas y nunca hace scroll:
          el número de filas por página se calcula arriba para que siempre quepan
          enteras y la navegación sea solo por el paginador. Sin `flex-1 min-h-0`
          (punto 2.5): la card mide su contenido y el paginador queda debajo. */}
      {cargando ? (
        <div className="bg-card border border-border rounded-2xl px-4 py-14 text-center text-muted-foreground mb-2 shrink-0">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
          <p className="text-sm">Cargando empleados…</p>
        </div>
      ) : errorCarga ? (
        <div className="bg-card border border-border rounded-2xl px-4 py-14 text-center mb-2 shrink-0">
          <p className="text-sm font-semibold text-red-600">{errorCarga}</p>
          <button onClick={() => void cargarEmpleados()} className="mt-3 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer">Reintentar</button>
        </div>
      ) : (
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-2 shrink-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
            <tr>
              {["Empleado","Correo","Cargo","Estado","Acciones"].map(h => (
                <th key={h} className="px-4 py-1.5 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-14 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">👥</p><p>No se encontraron empleados</p>
                </td></tr>
              ) : paged.map(e => {
                const rol = rolInfo(e.rolIds?.[0] ?? "");
                const tienePerfilCliente = clientes.some(c =>
                  c.correo.trim().toLowerCase() === e.correo.trim().toLowerCase()
                );
                return (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${e.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {e.iniciales}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{e.nombre}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-mono text-muted-foreground">{fmtDoc(e.tipoDocumento, e.numeroDocumento)}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 ${rol && !rol.activo ? "opacity-50" : ""}`}>
                              {tienePerfilCliente ? "Cliente/Empleado" : "Empleado"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-1.5 text-sm text-muted-foreground">{e.correo}</td>
                    <td className="px-4 py-1.5 text-sm text-muted-foreground">{chipsCargos(e.rolIds)}</td>
                    <td className="px-4 py-1.5">
                      {/* Pill de estado (diseño de Proveedores): antes era un
                          badge y el switch vivía en Acciones.
                          P7: para Gloria el pill queda deshabilitado con el
                          tooltip que explica el motivo, igual que en
                          GestionUsuariosScreen. */}
                      <span title={esSuperAdmin(e) ? TITULO_SUPER_ADMIN : undefined} className="inline-flex">
                        <EstadoSelect
                          value={e.activo ? "activo" : "inactivo"}
                          disabled={esSuperAdmin(e)}
                          onChange={nuevoEstado => {
                            if ((nuevoEstado === "activo") === e.activo) return;
                            toggleEstado(e.id);
                          }}
                          options={[
                            { value: "activo", label: "Activo", color: ESTADO_ACTIVO_COLOR },
                            { value: "inactivo", label: "Inactivo", color: ESTADO_INACTIVO_COLOR },
                          ]}
                        />
                      </span>
                    </td>
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-1">
                        {/* Reenviar invitación: solo para quien aún no activa su
                            cuenta (crea un token nuevo y manda el correo otra vez). */}
                        {invitacionesPendientes.has(e.numeroDocumento) && (
                          <button
                            type="button"
                            title="Reenviar invitación"
                            aria-label="Reenviar invitación"
                            disabled={reenviando === e.numeroDocumento}
                            onClick={() => void reenviarInvitacionDe(e)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary cursor-pointer transition-colors disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        <ActionIcons
                          onView={() => setDetailItem(e)}
                          onEdit={() => { setEditItem({ ...e }); setEditErrors({}); }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Paginación (unificada, fuera de la card) */}
      {filtered.length > 0 && (
        <Paginador pagina={pageActual} totalPaginas={totalPages} onCambio={setPage} />
      )}

      {/* Modal: Nueva contratación */}
      <AnimatePresence>
        {showContrat && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
                 className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4">
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Nueva Contratación</h3>
                  <button onClick={() => { setShowContrat(false); resetContratacion(); }}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-4 py-3.5 grid grid-cols-2 gap-x-3 gap-y-3">
                  {/* Empleado al que se le registra la contratación */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Empleado <MarcaObligatorio />
                    </label>
                    <select value={ctrEmpleadoId} autoFocus
                      onChange={e => {
                        setCtrEmpleadoId(e.target.value);
                        // P7: al elegir a Gloria el estado se fuerza a Activo,
                        // para que el selector de Estado (deshabilitado más
                        // abajo) no arranque en "Inactivo" con datos viejos.
                        const empSel = empleados.find(x => x.id === e.target.value);
                        if (empSel && esSuperAdmin(empSel)) setCtrActivo(true);
                        if (ctrErrors.empleado) setCtrErrors(p => ({ ...p, empleado: undefined }));
                      }}
                      className={`${fCls(ctrErrors.empleado)} cursor-pointer`}>
                      <option value="">Selecciona un empleado…</option>
                      {empleados.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.nombre}
                        </option>
                      ))}
                    </select>
                    {ctrErrors.empleado && <p className="text-xs text-red-500 mt-1 leading-tight">{ctrErrors.empleado}</p>}
                  </div>

                  {/* Datos del empleado */}
                  <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-1.5">Datos del empleado</p>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                    {/* P7: si el empleado elegido es Gloria, el estado no se
                        puede tocar (el guard de handleNuevaContratacion además
                        lo fuerza a activo al guardar).
                        Punto 3.2: 2 opciones → control segmentado. */}
                    <SegmentadoButtons
                      valor={ctrActivo ? "activo" : "inactivo"}
                      onChange={valor => setCtrActivo(valor === "activo")}
                      disabled={ctrEsSuperAdmin}
                      title={ctrEsSuperAdmin ? TITULO_SUPER_ADMIN : undefined}
                      opciones={[
                        { valor: "activo", etiqueta: "Activo" },
                        { valor: "inactivo", etiqueta: "Inactivo" },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Cargo <MarcaObligatorio />
                    </label>
                    {/* CARGO = ROL: un solo campo con los cargos (roles) de esta
                        contratación; ya no hay un texto de cargo aparte. */}
                    <SelectorRoles
                      roles={roles}
                      value={ctrRolIds}
                      onChange={ids => { setCtrRolIds(ids); if (ctrErrors.cargo) setCtrErrors(p => ({ ...p, cargo: undefined })); }}
                      error={ctrErrors.cargo}
                    />
                  </div>

                  {/* Datos de Contratación */}
                  <p className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-1.5">Datos de Contratación</p>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Fecha de inicio <MarcaObligatorio />
                    </label>
                    <input type="date" value={ctrFechaInicio}
                      onChange={e => { setCtrFechaInicio(e.target.value); if (ctrErrors.fechaInicio) setCtrErrors(p => ({ ...p, fechaInicio: undefined })); }}
                      className={fCls(ctrErrors.fechaInicio)} />
                    {ctrErrors.fechaInicio && <p className="text-xs text-red-500 mt-1 leading-tight">{ctrErrors.fechaInicio}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Fecha final <span className="text-muted-foreground font-normal">(opcional)</span>
                    </label>
                    <input type="date" value={ctrFechaFinal}
                      onChange={e => { setCtrFechaFinal(e.target.value); if (ctrErrors.fechaFinal) setCtrErrors(p => ({ ...p, fechaFinal: undefined })); }}
                      className={fCls(ctrErrors.fechaFinal)} />
                    {ctrErrors.fechaFinal && <p className="text-xs text-red-500 mt-1 leading-tight">{ctrErrors.fechaFinal}</p>}
                  </div>
                </div>

                <div className="flex gap-3 px-4 py-3 border-t border-border">
                  <button onClick={() => { setShowContrat(false); resetContratacion(); }}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                    Cancelar
                  </button>
                  <button onClick={() => void handleNuevaContratacion()} disabled={guardandoCtr}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 disabled:opacity-60">
                    {guardandoCtr ? "Registrando..." : "Registrar"}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Ver detalle */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
            <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
              className="bg-card rounded-2xl w-full max-w-xl shadow-2xl border border-border">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Detalle Empleado</h3>
                <button onClick={() => setDetailItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center gap-4 pb-4 mb-4 border-b border-border">
                  <div className={`w-14 h-14 rounded-full ${detailItem.avatarColor} flex items-center justify-center text-white text-lg font-bold`}>
                    {detailItem.iniciales}
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-base">{detailItem.nombre}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{fmtDoc(detailItem.tipoDocumento, detailItem.numeroDocumento)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  <div className="space-y-2">
                    {[
                      { l: "Correo", v: detailItem.correo },
                      { l: "Teléfono", v: detailItem.telefono || "—" },
                      { l: "Tipo de documento", v: detailItem.tipoDocumento },
                      { l: "Número de documento", v: detailItem.numeroDocumento },
                    ].map(({ l, v }) => (
                      <div key={l} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-4">
                        <span className="text-sm text-muted-foreground font-medium shrink-0">{l}</span>
                        <span className="text-sm font-semibold text-foreground text-right break-all">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between py-2 border-b border-border gap-4">
                      <span className="text-sm text-muted-foreground font-medium shrink-0">Cargo</span>
                      <span className="text-sm font-semibold text-foreground text-right">{chipsCargos(detailItem.rolIds, "justify-end")}</span>
                    </div>
                    {[
                      { l: "Fecha inicio", v: detailItem.fechaInicio },
                      { l: "Fecha final", v: detailItem.fechaFinal || "Continúa activo" },
                      { l: "Estado", v: detailItem.activo ? "Activo" : "Inactivo" },
                    ].map(({ l, v }) => (
                      <div key={l} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-4">
                        <span className="text-sm text-muted-foreground font-medium shrink-0">{l}</span>
                        <span className="text-sm font-semibold text-foreground text-right break-all">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Historial de contrataciones a ancho completo. */}
                  <div className="sm:col-span-2 mt-2 pt-4 border-t border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                    Historial de contrataciones
                  </p>
                  {detalleHistorial.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin contrataciones registradas</p>
                  ) : (
                    <div className="space-y-2 pr-1">
                      {detalleHistorial.map((c, i) => (
                        <div key={c.id}
                          className={`rounded-xl border px-3 py-2.5 ${i === 0 ? "border-primary/30 bg-primary/5" : "border-border bg-muted/40"}`}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold text-foreground">{chipsCargos(c.rolIds)}</span>
                            {i === 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide shrink-0">
                                Actual
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{cargosMostrados(c.rolIds).join(" · ") || "—"}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            {c.fechaInicio} → {c.fechaFinal || "Continúa activo"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-border">
                <button onClick={() => setDetailItem(null)}
                  className="w-full py-2.5 bg-muted rounded-xl text-sm font-semibold text-foreground hover:bg-border cursor-pointer transition-colors">
                  Cerrar
                </button>
              </div>
            </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Crear empleado */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: .95, opacity: 0 }} transition={{ duration: .15 }}
               className="bg-card rounded-2xl w-full max-w-xl shadow-2xl border border-border my-4">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: SERIF }}>Crear Empleado</h3>
                  <button onClick={() => { setShowCreate(false); resetCreate(); }}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-4 py-3.5 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5">
                  {/* Datos de cuenta */}
                  <p className="sm:col-span-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-1.5 first:pt-0">Datos de cuenta</p>
                  <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-start gap-2">
                    <div className="w-full sm:w-56 shrink-0">
                       <label className="block text-xs font-semibold text-muted-foreground mb-1 whitespace-nowrap">Tipo de documento <MarcaObligatorio /></label>
                      <select value={newTipoDoc}
                       onChange={e => { setNewTipoDoc(e.target.value); setCreateErrors(p => ({ ...p, tipoDocumento: undefined, documento: newDocumento ? validarDocumento(newDocumento, e.target.value) ?? undefined : undefined })); }}
                        className={`${fCls(createErrors.tipoDocumento)} cursor-pointer`}>
                        {DOC_TIPOS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                      </select>
                      {createErrors.tipoDocumento && <p className="text-xs text-red-500 mt-1 leading-tight">{createErrors.tipoDocumento}</p>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        Número de documento <MarcaObligatorio />
                      </label>
                       <input type="text" inputMode="numeric" value={newDocumento} autoComplete="off"
                         onChange={e => { const v = filtrarDocumento(e.target.value, newTipoDoc); setNewDocumento(v); setCreateErrors(p => ({ ...p, documento: v ? validarDocumento(v, newTipoDoc) ?? undefined : undefined })); }}
                         placeholder="12345678"
                        className={fCls(createErrors.documento)} />
                      {createErrors.documento && <p className="text-xs text-red-500 mt-1 leading-tight">{createErrors.documento}</p>}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                       Nombre completo <MarcaObligatorio />
                    </label>
                    <input type="text" value={newNombre} autoFocus
                        onChange={e => { const v = filtrarNombre(e.target.value); setNewNombre(v); setCreateErrors(p => ({ ...p, nombre: undefined })); }}
                        onBlur={() => setNewNombre(normalizarNombre(newNombre))}
                      placeholder="Ej: Laura Martínez"
                      className={fCls(createErrors.nombre)} />
                    {createErrors.nombre && <p className="text-xs text-red-500 mt-1 leading-tight">{createErrors.nombre}</p>}
                  </div>
                  {/* Correo / Teléfono con la MISMA proporción que el
                      formulario de Registro (correo 4/6, teléfono 2/6 en una
                      grilla de 6). En celular cada campo ocupa todo el ancho. */}
                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-6 gap-x-3 gap-y-2.5">
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                         Correo electrónico <MarcaObligatorio />
                      </label>
                      <input type="email" value={newCorreo} autoComplete="off"
                         onChange={e => { const v = filtrarCorreo(e.target.value); setNewCorreo(v); setCreateErrors(p => ({ ...p, correo: validarCorreo(v) ?? undefined })); }}
                        placeholder="correo@ejemplo.com"
                        className={fCls(createErrors.correo)} />
                      {createErrors.correo && <p className="text-xs text-red-500 mt-1 leading-tight">{createErrors.correo}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        Teléfono <span className="text-muted-foreground font-normal">(opcional)</span>
                      </label>
                      <input type="tel" inputMode="numeric" value={newTelefono} autoComplete="off"
                        onChange={e => { setNewTelefono(soloDigitos(e.target.value)); if (createErrors.telefono) setCreateErrors(p => ({ ...p, telefono: undefined })); }}
                        placeholder="3001234567"
                        className={fCls(createErrors.telefono)} />
                      {createErrors.telefono && <p className="text-xs text-red-500 mt-1 leading-tight">{createErrors.telefono}</p>}
                    </div>
                  </div>
                  {/* Datos del empleado */}
                  <p className="sm:col-span-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-1.5">Datos del empleado</p>
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
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                       Cargo <MarcaObligatorio />
                    </label>
                    {/* CARGO = ROL: aquí se eligen los cargos (roles) del nuevo
                        empleado; no hay input de texto libre. */}
                    <SelectorRoles
                      roles={roles}
                      value={newRolIds}
                      onChange={ids => { setNewRolIds(ids); if (createErrors.cargo) setCreateErrors(p => ({ ...p, cargo: undefined })); }}
                      error={createErrors.cargo}
                    />
                  </div>

                  {/* Datos de Contratación */}
                  <p className="sm:col-span-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-1.5">Datos de Contratación</p>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                       Fecha de inicio <MarcaObligatorio />
                    </label>
                    <input type="date" value={newFechaInicio}
                      onChange={e => { setNewFechaInicio(e.target.value); if (createErrors.fechaInicio) setCreateErrors(p => ({ ...p, fechaInicio: undefined })); }}
                      className={fCls(createErrors.fechaInicio)} />
                    {createErrors.fechaInicio && <p className="text-xs text-red-500 mt-1 leading-tight">{createErrors.fechaInicio}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Fecha final <span className="text-muted-foreground font-normal">(opcional)</span>
                    </label>
                    <input type="date" value={newFechaFinal}
                      onChange={e => { setNewFechaFinal(e.target.value); if (createErrors.fechaFinal) setCreateErrors(p => ({ ...p, fechaFinal: undefined })); }}
                      className={fCls(createErrors.fechaFinal)} />
                    {createErrors.fechaFinal && <p className="text-xs text-red-500 mt-1 leading-tight">{createErrors.fechaFinal}</p>}
                  </div>
                </div>

                <div className="flex gap-3 px-4 py-3 border-t border-border">
                  <button onClick={() => { setShowCreate(false); resetCreate(); }}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                    Cancelar
                  </button>
                  <button onClick={() => void handleCreate()}
                    disabled={creando}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 disabled:opacity-60">
                    {creando ? "Creando..." : "Crear empleado"}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Editar empleado */}
      <AnimatePresence>
        {editItem && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
              exit={{ scale:.95, opacity:0 }} transition={{ duration:.15 }}
              className="bg-card rounded-2xl w-full max-w-md shadow-2xl border border-border my-4">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground" style={{fontFamily:SERIF}}>Editar Empleado</h3>
                <button onClick={() => setEditItem(null)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer text-muted-foreground">
                  <X className="w-4 h-4"/>
                </button>
              </div>
              {/* Misma proporción que el formulario de Registro: grilla de 6 con
                  el correo en 4/6 y el teléfono en 2/6; en celular cada campo
                  ocupa todo el ancho. */}
              <div className="px-4 py-3.5 grid grid-cols-1 sm:grid-cols-6 gap-x-3 gap-y-3">
                <div className="sm:col-span-6 flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${editItem.avatarColor} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {editItem.iniciales}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{editItem.nombre}</p>
                    <p className="text-xs font-mono text-muted-foreground">{fmtDoc(editItem.tipoDocumento, editItem.numeroDocumento)}</p>
                  </div>
                </div>
                <div className="sm:col-span-6 flex gap-2 items-start">
                  <div className="w-56 shrink-0">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1 whitespace-nowrap">Tipo de documento</label>
                    <select disabled value={editItem.tipoDocumento}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-muted/60 text-sm text-muted-foreground cursor-not-allowed">
                      {DOC_TIPOS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                    </select>
                    {editErrors.tipoDocumento && <p className="text-xs text-red-500 mt-1 leading-tight">{editErrors.tipoDocumento}</p>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Número de documento</label>
                    <input readOnly type="text" inputMode="numeric" value={editItem.numeroDocumento} autoComplete="off"
                      placeholder="12345678"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-muted/60 text-sm text-muted-foreground cursor-not-allowed" />
                    {editErrors.numeroDocumento && <p className="text-xs text-red-500 mt-1 leading-tight">{editErrors.numeroDocumento}</p>}
                  </div>
                </div>
                {[
                  { label: "Nombre completo", field: "nombre" as const, type: "text", full: true  },
                  { label: "Correo",          field: "correo" as const, type: "email" },
                  { label: "Teléfono",        field: "telefono" as const, type: "tel", numeric: true },
                ].map(({ label, field, type, numeric, full }) => (
                  <div key={field} className={full ? "sm:col-span-6" : field === "correo" ? "sm:col-span-4" : "sm:col-span-2"}>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
                    <input type={type} inputMode={numeric ? "numeric" : undefined} value={editItem[field]} autoComplete="off"
                        onChange={e => { const v = field === "correo" ? filtrarCorreo(e.target.value) : field === "nombre" ? filtrarNombre(e.target.value) : numeric ? soloDigitos(e.target.value) : e.target.value; setEditItem(x => x && ({ ...x, [field]: v })); setEditErrors(p => ({ ...p, [field]: field === "correo" ? validarCorreo(v) ?? undefined : undefined })); }}
                        onBlur={() => { if (field === "nombre") setEditItem(x => x && ({ ...x, nombre: normalizarNombre(x.nombre) })); }}
                      className={`w-full px-3 py-2 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${editErrors[field] ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`} />
                    {editErrors[field] && <p className="text-xs text-red-500 mt-1 leading-tight">{editErrors[field]}</p>}
                  </div>
                ))}
                <div className="sm:col-span-6">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                     Cargo <MarcaObligatorio />
                  </label>
                  <SelectorRoles
                    roles={roles}
                    value={editItem.rolIds ?? []}
                    disabled={!editItem.contratoAbierto}
                    onChange={ids => { setEditItem(x => x && ({ ...x, rolIds: ids })); if (editErrors.cargo) setEditErrors(p => ({ ...p, cargo: undefined })); }}
                    error={editErrors.cargo}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                  {/* P7: el estado de Gloria no se puede cambiar desde el
                      modal de edición tampoco (el resto de sus datos sí se
                      puede editar). El tooltip explica el motivo.
                      Punto 3.2: 2 opciones → control segmentado. */}
                  <SegmentadoButtons
                    disabled={esSuperAdmin(editItem)}
                    title={esSuperAdmin(editItem) ? TITULO_SUPER_ADMIN : undefined}
                    valor={esSuperAdmin(editItem) || editItem.activo ? "activo" : "inactivo"}
                    onChange={valor => setEditItem(x => x && ({ ...x, activo: valor === "activo" }))}
                    opciones={[
                      { valor: "activo", etiqueta: "Activo" },
                      { valor: "inactivo", etiqueta: "Inactivo" },
                    ]}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha de inicio</label>
                  <input type="date" disabled={!editItem.contratoAbierto} value={editItem.fechaInicio}
                    onChange={e => { setEditItem(x => x && ({ ...x, fechaInicio: e.target.value })); if (editErrors.fechaInicio) setEditErrors(p => ({ ...p, fechaInicio: undefined })); }}
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${editErrors.fechaInicio ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`} />
                  {editErrors.fechaInicio && <p className="text-xs text-red-500 mt-1 leading-tight">{editErrors.fechaInicio}</p>}
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha final</label>
                  <input type="date" disabled={!editItem.contratoAbierto} value={editItem.fechaFinal}
                    onChange={e => { setEditItem(x => x && ({ ...x, fechaFinal: e.target.value })); if (editErrors.fechaFinal) setEditErrors(p => ({ ...p, fechaFinal: undefined })); }}
                    className={`w-full px-3 py-2 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${editErrors.fechaFinal ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`} />
                  {editErrors.fechaFinal && <p className="text-xs text-red-500 mt-1 leading-tight">{editErrors.fechaFinal}</p>}
                </div>
              </div>
              <div className="flex gap-3 px-4 py-3 border-t border-border">
                <button onClick={() => setEditItem(null)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors">
                  Cancelar
                </button>
                <button onClick={() => void handleEdit()} disabled={guardando}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors active:scale-95 disabled:opacity-60">
                  {guardando ? "Guardando..." : "Guardar cambios"}
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
