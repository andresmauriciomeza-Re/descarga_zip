import type { ContratacionApi, EmpleadoApi, ApiErrorConEstado } from "@/types/api";

export const AVATAR_COLORS = [
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

export const mapearContratacionApi = (c: ContratacionApi): Contratacion => ({
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
export const mensajeError = (error: unknown, porDefecto: string): string => {
  const e = error as ApiErrorConEstado;
  if (e?.status === 403) return e.message || "No tienes permiso para realizar esta acción.";
  return e?.message || porDefecto;
};
