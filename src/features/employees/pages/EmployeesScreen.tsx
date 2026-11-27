import { useState, useMemo, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, Briefcase, Lock, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { ordenarPorIdDescendente } from "@/shared/utils/sortById";
import { cambiarEstadoEmpleado, crearContratacion, crearEmpleado, editarEmpleado, reenviarInvitacion } from "@/shared/services/employeesService";
import type { ApiErrorConEstado, CrearEmpleadoResponse } from "@/types/api";
import { AvisoBanner } from "@/shared/components/panel/NoticeBanner";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import { BotonRuta } from "@/shared/components/buttons/BreadcrumbButton";
import { BuscadorGrande } from "@/shared/components/panel/LargeSearch";
import { CampoFormulario } from "@/shared/components/panel/FormField";
import { DatosDetalle } from "@/shared/components/panel/DetailData";
import { DialogoConfirmacion } from "@/shared/components/panel/ConfirmDialog";
import { EncabezadoPagina } from "@/shared/components/panel/PageHeader";
import { EstadoPill } from "@/shared/components/panel/StatusPill";
import { FiltrosChips } from "@/shared/components/panel/FilterChips";
import { OpcionesBotones } from "@/shared/components/buttons/OptionButtons";
import { PaginadorGrande } from "@/shared/components/panel/LargePaginator";
import { SeccionFormulario } from "@/shared/components/panel/FormSection";
import { TarjetaFila } from "@/shared/components/panel/RowCard";
import { VacioEstado } from "@/shared/components/panel/EmptyState";
import { filtrarCorreo, filtrarDocumento, filtrarNombre, normalizarNombre, soloDigitos, validarCorreo, validarDocumento, validarTelefonoOpcional } from "@/shared/components/FormInputs";
import { hoyISO } from "@/shared/utils/dates";
import { SelectorRoles } from "@/shared/components/RoleSelector";
import type { Rol } from "@/features/roles/utils/roles";
import { DOC_TIPOS, fmtDoc } from "@/features/users/pages/UsersScreen";
import type { Cliente } from "@/features/customers/utils/customers";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { type Empleado, mensajeError, type Contratacion } from "@/features/employees/utils/employees";

const SERIF = "var(--font-titulo)";
const MONO  = "var(--font-texto)";

// De la más reciente a la más antigua. Primero por fecha de inicio y, si empatan
// (dos contrataciones el mismo día), por id, que ya refleja el orden en que se
// fueron registrando.
export const ordenarContrataciones = (cs: Contratacion[]): Contratacion[] =>
  [...cs].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio) || Number(b.id) - Number(a.id) || b.id.localeCompare(a.id));

// ── Cuenta de super administrador (Gloria) ─────────────────────────────────
// La marca proviene del usuario autenticado/del API, no de la semilla local.
const esSuperAdmin = (e: Pick<Empleado, "esSuperAdmin">): boolean => e.esSuperAdmin === true;
const TITULO_SUPER_ADMIN = "Cuenta de super administrador";

export function GestionEmpleadosScreen({
  clientes,
}: {
  clientes: Cliente[];
}) {
  const [search,      setSearch]    = useState("");
  const [filterEstado,setFiltro]    = useState("todos");
  const [editErrors,  setEditErrors] = useState<Record<string, string | undefined>>({});
  const [sortBy,      setSortBy]    = useState("id");
  const [page,        setPage]      = useState(1);
  const [detailItem,  setDetailItem] = useState<Empleado | null>(null);
  const [editItem,    setEditItem]  = useState<Empleado | null>(null);
  const [showCreate,  setShowCreate] = useState(false);

  const { empleados, cargosApi, nombresRoles, cargando, errorCarga, cargarEmpleados } = useEmployees();
  const [guardando,   setGuardando] = useState(false);
  const [guardandoCtr, setGuardandoCtr] = useState(false);



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
    else if (sortBy === "nombre") r = [...r].sort((a,b) => a.nombre.localeCompare(b.nombre));
    return sortBy === "id" ? ordenarPorIdDescendente(r, (empleado) => empleado.id) : r;
  }, [empleados, roles, search, filterEstado, sortBy]);

  // 5 empleados por página (unificado con el resto de listados): la tabla
  // nunca lleva scroll interno, la navegación es solo por el paginador.
  const PER_PAGE = 10;

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

  // ── Edición de empleado (solo INACTIVO) ─────────────────────────────────
  // Los datos de la persona (nombre, correo, teléfono, documento y fecha de
  // inicio) son de solo lectura: aquí solo se editan cargos, estado y fecha
  // final. Cargos y fecha final se guardan si hay contratación abierta o si el
  // guardado deja al empleado Activo (en ese caso el backend crea una
  // contratación nueva con inicio = hoy, hora de Bogotá).
  const puedeEditarContrato = (e: Empleado) => !!e.contratoAbierto || e.activo;

  // Validación en tiempo real del formulario, recalculada en cada cambio de
  // `editItem` (pintada bajo cada campo y bloqueando "Guardar cambios").
  const erroresDeEdicion = (e: Empleado): Record<string, string | undefined> => {
    const errs: Record<string, string | undefined> = {};
    if (e.activo) {
      // Para quedar Activo hace falta al menos un cargo…
      if (extrasDe(e.rolIds).length === 0) errs.cargo = "Debe tener al menos un cargo para quedar activo.";
      // …y la fecha final no puede quedar en el pasado.
      if (e.fechaFinal && e.fechaFinal < hoyISO()) errs.fechaFinal = "La fecha final no puede ser anterior a hoy.";
    }
    // Solo la contratación abierta tiene fecha de inicio editable-visible con
    // la que comparar (la regla del formulario no cambia respecto de antes).
    if (e.contratoAbierto && e.fechaInicio && e.fechaFinal && e.fechaFinal < e.fechaInicio)
      errs.fechaFinal = errs.fechaFinal ?? "La fecha final no puede ser anterior a la fecha de inicio";
    return errs;
  };

  const handleEdit = async () => {
    if (!editItem || guardando) return;
    const e = editItem;
    const errs = erroresDeEdicion(e);
    if (Object.values(errs).some(Boolean)) { setEditErrors(errs); return; }

    setGuardando(true);
    try {
      // Solo cargos, estado y fecha final; sin PATCH extra: el estado viaja
      // dentro del mismo PUT. Cargos/fechaFinal solo cuando hay contratación
      // abierta o cuando el guardado deja al empleado Activo.
      const enviarContrato = puedeEditarContrato(e);
      const res = await editarEmpleado(Number(e.id), {
        estado: e.activo,
        ...(enviarContrato
          ? { cargos: cargosParaApi(e.rolIds), fechaFinal: e.fechaFinal }
          : {}),
      });
      setEditItem(null);
      setEditErrors({});
      if (res.correoEnviado === false) toast.error("Empleado actualizado, pero no se pudo enviar el correo");
      else if (res.correoEnviado === true) toast.success("Empleado actualizado. Enviamos un correo de aviso");
      else toast.success("Empleado actualizado correctamente");
    } catch (error) {
      const err = error as ApiErrorConEstado;
      const mensaje = mensajeError(error, "No se pudo actualizar el empleado.");
      if (err.status === 400 && /fecha/i.test(mensaje)) {
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
        toast.warning("Empleado creado, pero no se pudo enviar el correo de aviso");
      }
    } else if (respuesta.correoEnviado) {
      toast.success(`Empleado creado. Le enviamos un correo a ${respuesta.correo} para que cree su contraseña.`);
    } else {
      toast.warning("Empleado creado, pero no se pudo enviar el correo");
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

  // Empleado elegido en el formulario "Nueva contratación". Si es Gloria, su
  // selector de Estado queda deshabilitado con el tooltip del super
  // administrador (la edición de los demás datos sigue permitida).
  const ctrEmpleado = ctrEmpleadoId
    ? empleados.find(e => e.id === ctrEmpleadoId) ?? null
    : null;
  const ctrEsSuperAdmin = !!ctrEmpleado && esSuperAdmin(ctrEmpleado);

  // ── Piezas para las tarjetas ──
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  /** "2027-01-31" → "31 de enero de 2027" (sin pasar por Date: no se corre un día). */
  const fechaLarga = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
    return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}` : iso || "—";
  };
  const contratoTexto = (e: Empleado) =>
    !e.fechaFinal
      ? "Contrato sin fecha de fin"
      : e.fechaFinal < hoyISO()
        ? `El contrato terminó el ${fechaLarga(e.fechaFinal)}`
        : `Contrato hasta el ${fechaLarga(e.fechaFinal)}`;
  const cargoTexto = (rolIds?: string[]) => cargosMostrados(rolIds).join(" · ");
  const documentoLegible = (tipo: string, numero: string) =>
    `${tipo ? `${tipo} ` : ""}${/^\d+$/.test(numero) ? Number(numero).toLocaleString("es-CO") : numero}`;
  const Avatar = ({ e, tam }: { e: Empleado; tam: number }) => (
    <div
      className={`${e.avatarColor} text-white font-bold shrink-0 flex items-center justify-center rounded-full`}
      style={{ width: tam, height: tam, fontSize: tam * 0.36 }}
      aria-hidden="true"
    >
      {e.iniciales}
    </div>
  );
  const EstadoTrabajo = ({ activo }: { activo: boolean }) => (
    <EstadoPill tono={activo ? "verde" : "gris"}>{activo ? "Trabajando" : "Ya no trabaja"}</EstadoPill>
  );

  const [reenviarItem, setReenviarItem] = useState<Empleado | null>(null);
  const [desactivarItem, setDesactivarItem] = useState<Empleado | null>(null);
  const abrirContratoNuevo = (e: Empleado) => {
    resetContratacion();
    setCtrEmpleadoId(e.id);
    setShowContrat(true);
  };

  /** Botones de una persona según la regla de siempre. */
  const botonesEmpleado = (e: Empleado) => {
    const verDatos = <BotonAccion key="ver" variante="normal" onClick={() => setDetailItem(e)}>Ver datos</BotonAccion>;
    if (invitacionesPendientes.has(e.numeroDocumento)) {
      return (
        <>
          <BotonAccion
            variante="principal"
            disabled={reenviando === e.numeroDocumento}
            onClick={() => setReenviarItem(e)}
          >
            Mandar la invitación otra vez
          </BotonAccion>
          {verDatos}
        </>
      );
    }
    if (e.activo) {
      return (
        <>
          {verDatos}
          <BotonAccion
            variante="peligro"
            disabled={esSuperAdmin(e)}
            title={esSuperAdmin(e) ? TITULO_SUPER_ADMIN : undefined}
            onClick={() => setDesactivarItem(e)}
          >
            Desactivar
          </BotonAccion>
        </>
      );
    }
    return (
      <>
        <BotonAccion variante="principal" onClick={() => abrirContratoNuevo(e)}>Darle un contrato nuevo</BotonAccion>
        <BotonAccion variante="normal" onClick={() => { setEditItem({ ...e }); setEditErrors({}); }}>Corregir sus datos</BotonAccion>
        {verDatos}
      </>
    );
  };

  const cerrarCrear = () => { setShowCreate(false); resetCreate(); };
  const cerrarContrat = () => { setShowContrat(false); resetContratacion(); };
  const chipEstado = filterEstado === "activo" ? "activo" : filterEstado === "inactivo" ? "inactivo" : "todos";

  const dialogos = (
    <>
      <DialogoConfirmacion
        abierto={!!reenviarItem}
        onCambiarAbierto={a => { if (!a) setReenviarItem(null); }}
        titulo={`¿Mandar otra vez la invitación a ${reenviarItem?.nombre.split(" ")[0] ?? ""}?`}
        queVaAPasar={[`Le llega un correo nuevo a ${reenviarItem?.correo ?? ""}`, "El enlace anterior deja de servir"]}
        textoAccion="Sí, mandarla otra vez"
        onConfirmar={() => { if (reenviarItem) void reenviarInvitacionDe(reenviarItem); }}
      />
      <DialogoConfirmacion
        abierto={!!desactivarItem}
        onCambiarAbierto={a => { if (!a) setDesactivarItem(null); }}
        titulo={`¿Desactivar a ${desactivarItem?.nombre ?? ""}?`}
        queVaAPasar={[
          `Ya no podrá entrar al panel como ${desactivarItem ? cargoTexto(desactivarItem.rolIds).toLowerCase() : "empleado"}`,
          "Su cargo y su contrato quedan guardados",
          "Puede seguir comprando como cliente",
        ]}
        textoAccion="Sí, desactivar"
        onConfirmar={() => { if (desactivarItem) void toggleEstado(desactivarItem.id); }}
      />
    </>
  );

  // ── Formularios (agregar, corregir y nuevo contrato) ──
  const sino = [{ valor: "activo", etiqueta: "Sí" }, { valor: "inactivo", etiqueta: "No" }];
  const editErrs = editItem ? { ...editErrors, ...erroresDeEdicion(editItem) } : {};
  const editBloqueado = editItem ? Object.values(erroresDeEdicion(editItem)).some(Boolean) : false;
  const editaContrato = editItem ? puedeEditarContrato(editItem) : false;
  const historialCtr = ctrEmpleado ? ordenarContrataciones(ctrEmpleado.contrataciones ?? []) : [];

  const formularios = (
    <>
      {showCreate && (
        <Dialog.Root open onOpenChange={a => { if (!a) cerrarCrear(); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="pn-dialogo-fondo" />
            <Dialog.Content className="pn-modal pn-modal--medio" aria-describedby={undefined}>
              <div className="pn-modal__cab"><Dialog.Title className="pn-modal__titulo">Agregar un empleado</Dialog.Title></div>
              <div className="grid gap-5">
                <SeccionFormulario numero={1} titulo="Datos de la persona">
                  <div className="pn-grilla">
                    <CampoFormulario etiqueta="Tipo de documento" error={createErrors.tipoDocumento}>
                      {(p) => (
                        <select {...p} value={newTipoDoc}
                          onChange={e => { setNewTipoDoc(e.target.value); setCreateErrors(prev => ({ ...prev, tipoDocumento: undefined, documento: newDocumento ? validarDocumento(newDocumento, e.target.value) ?? undefined : undefined })); }}>
                          {DOC_TIPOS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                        </select>
                      )}
                    </CampoFormulario>
                    <CampoFormulario etiqueta="Número de documento" ayuda="Solo números, sin puntos" error={createErrors.documento}>
                      {(p) => (
                        <input {...p} type="text" inputMode="numeric" value={newDocumento} autoComplete="off" placeholder="12345678"
                          onChange={e => { const v = filtrarDocumento(e.target.value, newTipoDoc); setNewDocumento(v); setCreateErrors(prev => ({ ...prev, documento: v ? validarDocumento(v, newTipoDoc) ?? undefined : undefined })); }} />
                      )}
                    </CampoFormulario>
                    <CampoFormulario etiqueta="Nombre completo" error={createErrors.nombre}>
                      {(p) => (
                        <input {...p} type="text" value={newNombre} autoFocus placeholder="Ej: Laura Martínez"
                          onChange={e => { const v = filtrarNombre(e.target.value); setNewNombre(v); setCreateErrors(prev => ({ ...prev, nombre: undefined })); }}
                          onBlur={() => setNewNombre(normalizarNombre(newNombre))} />
                      )}
                    </CampoFormulario>
                    <CampoFormulario etiqueta="Correo" ayuda="Aquí le llega la invitación" error={createErrors.correo}>
                      {(p) => (
                        <input {...p} type="email" value={newCorreo} autoComplete="off" placeholder="correo@gmail.com"
                          onChange={e => { const v = filtrarCorreo(e.target.value); setNewCorreo(v); setCreateErrors(prev => ({ ...prev, correo: validarCorreo(v) ?? undefined })); }} />
                      )}
                    </CampoFormulario>
                    <CampoFormulario etiqueta="Celular" opcional error={createErrors.telefono}>
                      {(p) => (
                        <input {...p} type="tel" inputMode="numeric" value={newTelefono} autoComplete="off" placeholder="3001234567"
                          onChange={e => { setNewTelefono(soloDigitos(e.target.value)); if (createErrors.telefono) setCreateErrors(prev => ({ ...prev, telefono: undefined })); }} />
                      )}
                    </CampoFormulario>
                  </div>
                </SeccionFormulario>
                <SeccionFormulario numero={2} titulo="Su trabajo">
                  <div className="pn-grilla">
                    <div style={{ gridColumn: "1 / -1" }}>
                      <p className="pn-etiqueta">Cargo</p>
                      <SelectorRoles roles={roles} value={newRolIds}
                        onChange={ids => { setNewRolIds(ids); if (createErrors.cargo) setCreateErrors(prev => ({ ...prev, cargo: undefined })); }}
                        error={createErrors.cargo} />
                    </div>
                    <CampoFormulario etiqueta="Empieza a trabajar" error={createErrors.fechaInicio}>
                      {(p) => <input {...p} type="date" value={newFechaInicio} onChange={e => { setNewFechaInicio(e.target.value); if (createErrors.fechaInicio) setCreateErrors(prev => ({ ...prev, fechaInicio: undefined })); }} />}
                    </CampoFormulario>
                    <CampoFormulario etiqueta="Termina el contrato" opcional error={createErrors.fechaFinal}>
                      {(p) => <input {...p} type="date" value={newFechaFinal} onChange={e => { setNewFechaFinal(e.target.value); if (createErrors.fechaFinal) setCreateErrors(prev => ({ ...prev, fechaFinal: undefined })); }} />}
                    </CampoFormulario>
                    <div>
                      <p className="pn-etiqueta">¿Ya está trabajando?</p>
                      <OpcionesBotones etiqueta="Estado del empleado" valor={newActivo ? "activo" : "inactivo"} onChange={v => setNewActivo(v === "activo")} opciones={sino} />
                    </div>
                  </div>
                </SeccionFormulario>
                <div className="pn-dialogo__botones" style={{ justifyContent: "flex-start" }}>
                  <BotonAccion variante="normal" onClick={cerrarCrear}>Cancelar</BotonAccion>
                  <BotonAccion variante="principal" disabled={creando} onClick={() => void handleCreate()}>
                    {creando ? "Agregando…" : "Agregar y mandar la invitación"}
                  </BotonAccion>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {editItem && (
        <Dialog.Root open onOpenChange={a => { if (!a) setEditItem(null); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="pn-dialogo-fondo" />
            <Dialog.Content className="pn-modal pn-modal--medio" aria-describedby={undefined}>
              <div className="pn-modal__cab"><Dialog.Title className="pn-modal__titulo">Corregir los datos de {editItem.nombre}</Dialog.Title></div>
              <div className="grid gap-5">
                <SeccionFormulario titulo="Sus datos">
                  <div className="pn-grilla">
                    <div>
                      <p className="pn-etiqueta">Documento</p>
                      <div className="pn-lectura"><Lock size={20} aria-hidden="true" style={{ marginRight: 10 }} />{documentoLegible(editItem.tipoDocumento, editItem.numeroDocumento)}</div>
                      <p className="pn-campo__ayuda">No se puede cambiar</p>
                    </div>
                    <div>
                      <p className="pn-etiqueta">Nombre</p>
                      <div className="pn-lectura"><Lock size={20} aria-hidden="true" style={{ marginRight: 10 }} />{editItem.nombre}</div>
                    </div>
                    <div>
                      <p className="pn-etiqueta">Correo</p>
                      <div className="pn-lectura"><Lock size={20} aria-hidden="true" style={{ marginRight: 10 }} />{editItem.correo}</div>
                    </div>
                    <div>
                      <p className="pn-etiqueta">Celular</p>
                      <div className="pn-lectura"><Lock size={20} aria-hidden="true" style={{ marginRight: 10 }} />{editItem.telefono || "—"}</div>
                    </div>
                  </div>
                  <p className="pn-campo__ayuda" style={{ marginTop: 14 }}>Estos datos los cambia cada persona desde su perfil.</p>
                </SeccionFormulario>
                <SeccionFormulario titulo="Su trabajo">
                  <div className="pn-grilla">
                    <div style={{ gridColumn: "1 / -1" }}>
                      <p className="pn-etiqueta">Cargo</p>
                      <SelectorRoles roles={roles} value={editItem.rolIds ?? []} disabled={!editaContrato}
                        onChange={ids => { setEditItem(x => x && ({ ...x, rolIds: ids })); if (editErrors.cargo) setEditErrors(p => ({ ...p, cargo: undefined })); }}
                        error={editErrs.cargo} />
                      {!editaContrato && <p className="pn-campo__ayuda">Sin contrato abierto: los cargos y la fecha final se guardan cuando vuelva a trabajar.</p>}
                    </div>
                    <div>
                      <p className="pn-etiqueta">¿Está trabajando?</p>
                      <OpcionesBotones etiqueta="Estado del empleado" deshabilitado={esSuperAdmin(editItem)}
                        valor={esSuperAdmin(editItem) || editItem.activo ? "activo" : "inactivo"}
                        onChange={v => setEditItem(x => x && ({ ...x, activo: v === "activo" }))} opciones={sino} />
                    </div>
                    <div>
                      <p className="pn-etiqueta">Empezó a trabajar</p>
                      <div className="pn-lectura">{fechaLarga(editItem.fechaInicio)}</div>
                      <p className="pn-campo__ayuda">No se cambia aquí</p>
                    </div>
                    <CampoFormulario etiqueta="Termina el contrato" error={editErrs.fechaFinal}>
                      {(p) => (
                        <input {...p} type="date" disabled={!editaContrato} value={editItem.fechaFinal}
                          onChange={e => { setEditItem(x => x && ({ ...x, fechaFinal: e.target.value })); if (editErrors.fechaFinal) setEditErrors(p2 => ({ ...p2, fechaFinal: undefined })); }} />
                      )}
                    </CampoFormulario>
                  </div>
                </SeccionFormulario>
                <div className="pn-dialogo__botones" style={{ justifyContent: "flex-start" }}>
                  <BotonAccion variante="normal" onClick={() => setEditItem(null)}>Cancelar</BotonAccion>
                  <BotonAccion variante="principal" disabled={guardando || editBloqueado} onClick={() => void handleEdit()}>
                    {guardando ? "Guardando…" : "Guardar cambios"}
                  </BotonAccion>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {showContrat && (
        <Dialog.Root open onOpenChange={a => { if (!a) cerrarContrat(); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="pn-dialogo-fondo" />
            <Dialog.Content className="pn-modal pn-modal--medio" aria-describedby={undefined}>
              <div className="pn-modal__cab"><Dialog.Title className="pn-modal__titulo">Nuevo contrato</Dialog.Title></div>
              <div className="grid gap-5">
                <SeccionFormulario titulo="El contrato nuevo">
                  <div className="pn-grilla">
                    <CampoFormulario etiqueta="¿A quién?" error={ctrErrors.empleado}>
                      {(p) => (
                        <select {...p} value={ctrEmpleadoId}
                          onChange={e => {
                            setCtrEmpleadoId(e.target.value);
                            const empSel = empleados.find(x => x.id === e.target.value);
                            if (empSel && esSuperAdmin(empSel)) setCtrActivo(true);
                            if (ctrErrors.empleado) setCtrErrors(prev => ({ ...prev, empleado: undefined }));
                          }}>
                          <option value="">Escoge a la persona…</option>
                          {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                        </select>
                      )}
                    </CampoFormulario>
                    <div>
                      <p className="pn-etiqueta">¿Vuelve a trabajar ya?</p>
                      <OpcionesBotones etiqueta="Estado del empleado" deshabilitado={ctrEsSuperAdmin}
                        valor={ctrActivo ? "activo" : "inactivo"} onChange={v => setCtrActivo(v === "activo")} opciones={sino} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <p className="pn-etiqueta">Cargo</p>
                      <SelectorRoles roles={roles} value={ctrRolIds}
                        onChange={ids => { setCtrRolIds(ids); if (ctrErrors.cargo) setCtrErrors(prev => ({ ...prev, cargo: undefined })); }}
                        error={ctrErrors.cargo} />
                    </div>
                    <CampoFormulario etiqueta="Empieza a trabajar" error={ctrErrors.fechaInicio}>
                      {(p) => <input {...p} type="date" value={ctrFechaInicio} onChange={e => { setCtrFechaInicio(e.target.value); if (ctrErrors.fechaInicio) setCtrErrors(prev => ({ ...prev, fechaInicio: undefined })); }} />}
                    </CampoFormulario>
                    <CampoFormulario etiqueta="Termina el contrato" opcional error={ctrErrors.fechaFinal}>
                      {(p) => <input {...p} type="date" value={ctrFechaFinal} onChange={e => { setCtrFechaFinal(e.target.value); if (ctrErrors.fechaFinal) setCtrErrors(prev => ({ ...prev, fechaFinal: undefined })); }} />}
                    </CampoFormulario>
                  </div>
                </SeccionFormulario>
                {ctrEmpleado && (
                  <SeccionFormulario titulo="Contratos anteriores">
                    {historialCtr.length === 0 ? (
                      <p className="pn-seccion__ayuda">Todavía no tiene contratos.</p>
                    ) : (
                      <div className="pn-permisos">
                        {historialCtr.map(c => (
                          <div key={c.id} className="pn-permisos__fila" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr)" }}>
                            <strong>{cargoTexto(c.rolIds)}</strong>
                            <span>{fechaLarga(c.fechaInicio)} → {c.fechaFinal ? fechaLarga(c.fechaFinal) : "sin fecha de fin"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </SeccionFormulario>
                )}
                <div className="pn-dialogo__botones" style={{ justifyContent: "flex-start" }}>
                  <BotonAccion variante="normal" onClick={cerrarContrat}>Cancelar</BotonAccion>
                  <BotonAccion variante="principal" disabled={guardandoCtr} onClick={() => void handleNuevaContratacion()}>
                    {guardandoCtr ? "Guardando…" : "Guardar y activarla"}
                  </BotonAccion>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  );

  // ── Detalle ──
  if (detailItem) {
    const d = detailItem;
    const anteriores = detalleHistorial.slice(1);
    return (
      <div className="pn-contenido" style={{ maxWidth: 950 }}>
        <BotonRuta>
          <BotonAccion icono={ArrowLeft} onClick={() => setDetailItem(null)}>Volver a la lista</BotonAccion>
        </BotonRuta>
        <div className="flex flex-wrap items-center gap-5 mb-1">
          <Avatar e={d} tam={80} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 style={{ font: "700 34px/1.15 var(--font-titulo)", margin: 0, overflowWrap: "anywhere" }}>{d.nombre}</h1>
              <EstadoTrabajo activo={d.activo} />
            </div>
            <p className="pn-seccion__ayuda" style={{ margin: "6px 0 0" }}>{cargoTexto(d.rolIds)} · {contratoTexto(d).toLowerCase()}</p>
          </div>
        </div>
        <div className="grid gap-5 mt-6">
          <SeccionFormulario titulo="Sus datos">
            <DatosDetalle datos={[
              { etiqueta: "Documento", valor: documentoLegible(d.tipoDocumento, d.numeroDocumento) },
              { etiqueta: "Correo", valor: d.correo },
              { etiqueta: "Celular", valor: d.telefono || "—" },
              { etiqueta: "Su cuenta", valor: d.invitacionPendiente ? "Todavía no abre la invitación" : "✓ Ya entró al sistema" },
            ]} />
            <p className="pn-campo__ayuda" style={{ fontSize: 17, marginTop: 16 }}>
              Los cambia la misma persona en su perfil mientras trabaje aquí.
            </p>
          </SeccionFormulario>
          <SeccionFormulario titulo="Contrato actual">
            <DatosDetalle datos={[
              { etiqueta: "Cargo", valor: cargoTexto(d.rolIds) },
              { etiqueta: "Empezó", valor: fechaLarga(d.fechaInicio) },
              { etiqueta: "Termina", valor: d.fechaFinal ? fechaLarga(d.fechaFinal) : "Sin fecha de fin" },
            ]} />
          </SeccionFormulario>
          <SeccionFormulario titulo="Contratos anteriores">
            {anteriores.length === 0 ? (
              <p className="pn-seccion__ayuda">Todavía no tiene contratos anteriores.</p>
            ) : (
              <div className="pn-permisos">
                {anteriores.map(c => (
                  <div key={c.id} className="pn-permisos__fila" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr)" }}>
                    <strong>{cargoTexto(c.rolIds)}</strong>
                    <span>{fechaLarga(c.fechaInicio)} → {c.fechaFinal ? fechaLarga(c.fechaFinal) : "sin fecha de fin"}</span>
                  </div>
                ))}
              </div>
            )}
          </SeccionFormulario>
          <div className="pn-dialogo__botones" style={{ justifyContent: "flex-start" }}>{botonesEmpleado(d)}</div>
        </div>
        {dialogos}
        {formularios}
      </div>
    );
  }

  // ── Lista ──
  return (
    <div className="pn-contenido">
      <EncabezadoPagina
        titulo="Empleados"
        descripcion="Las personas que trabajan en La Sirena, su cargo y hasta cuándo va su contrato"
        acciones={
          <>
            <BotonAccion icono={Briefcase} onClick={() => { resetContratacion(); setShowContrat(true); }}>
              Nuevo contrato a alguien que ya trabajó
            </BotonAccion>
            <BotonAccion variante="principal" icono={UserPlus} onClick={() => { resetCreate(); setShowCreate(true); }}>
              Agregar un empleado
            </BotonAccion>
          </>
        }
      />

      <div className="grid gap-4 mb-6">
        <BuscadorGrande
          etiqueta="Buscar un empleado"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Escribe el nombre, la cédula, el correo o el cargo"
        />
        <FiltrosChips
          valor={chipEstado}
          onChange={v => { setFiltro(v); setPage(1); }}
          opciones={[
            { valor: "todos", etiqueta: "Todos", contador: empleados.length },
            { valor: "activo", etiqueta: "Trabajando", contador: empleados.filter(e => e.activo).length },
            { valor: "inactivo", etiqueta: "Ya no trabajan", contador: empleados.filter(e => !e.activo).length },
          ]}
        />
        <FiltrosChips
          titulo="Ordenar por:"
          valor={sortBy}
          onChange={v => { setSortBy(v); setPage(1); }}
          opciones={[
            { valor: "id", etiqueta: "Los más nuevos" },
            { valor: "nombre", etiqueta: "Nombre" },
            { valor: "cargo", etiqueta: "Cargo" },
          ]}
        />
      </div>

      {cargando ? (
        <p role="status" className="pn-nota">Cargando los empleados…</p>
      ) : errorCarga ? (
        <AvisoBanner
          titulo="No pudimos cargar a los empleados"
          boton={<BotonAccion onClick={() => void cargarEmpleados()}>Intentar de nuevo</BotonAccion>}
        >
          {errorCarga}
        </AvisoBanner>
      ) : paged.length === 0 ? (
        <VacioEstado icono={Users} titulo="No encontramos a ningún empleado">
          Revisa cómo lo escribiste, cambia el filtro o agrega uno nuevo.
        </VacioEstado>
      ) : (
        <div className="pn-lista">
          {paged.map(e => (
            <TarjetaFila
              key={e.id}
              resaltada={e.invitacionPendiente ? "ambar" : undefined}
              avatar={<Avatar e={e} tam={56} />}
              nombre={e.nombre}
              detalle={`${documentoLegible(e.tipoDocumento, e.numeroDocumento)} · ${e.correo}`}
              datos={[
                { etiqueta: "Cargo", valor: cargoTexto(e.rolIds) },
                { etiqueta: "Contrato", valor: contratoTexto(e) },
              ]}
              estado={
                <div className="grid gap-2 justify-items-start">
                  <EstadoTrabajo activo={e.activo} />
                  {e.invitacionPendiente
                    ? <EstadoPill tono="ambar">No ha abierto el correo de invitación</EstadoPill>
                    : <span style={{ fontSize: 17, color: "var(--verde-texto)", fontWeight: 600 }}>✓ Ya entró al sistema</span>}
                </div>
              }
              acciones={botonesEmpleado(e)}
            />
          ))}
        </div>
      )}

      <PaginadorGrande pagina={pageActual} total={filtered.length} porPagina={PER_PAGE} onCambiar={setPage} />
      {dialogos}
      {formularios}
    </div>
  );
}
