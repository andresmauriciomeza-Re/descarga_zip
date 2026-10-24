import api from "./api";
import type {
  CrearEmpleadoRequest,
  CrearEmpleadoResponse,
  EditarEmpleadoRequest,
  EditarEmpleadoResponse,
  InvitacionesPendientesResponse,
  ListarCargosResponse,
  ListarEmpleadosResponse,
  MensajeEmpleadoResponse,
  MiContratacionResponse,
  NuevaContratacionRequest,
  ReenvioInvitacionResponse,
} from "@/types/api";

// Empleados: alta con invitación por correo, listado, edición, estado y
// contrataciones. El formulario nunca manda contraseña: el backend crea la
// cuenta con un hash aleatorio y el empleado la define con el enlace
// ?activar=<token>.
//
// ¡OJO CON LOS IDENTIFICADORES! Hay DOS distintos y no se intercambian:
//  · `reenviarInvitacion` recibe el DOCUMENTO (id_usuario, 5 a 15 dígitos).
//  · TODAS las demás rutas con id (`editarEmpleado`, `cambiarEstadoEmpleado`,
//    `crearContratacion`) reciben el `idEmpleado` (id_empleado, entero de
//    tb_empleado), que es el que devuelve `listarEmpleados`.

/** POST /empleados: crea (o completa) la cuenta y la ficha del empleado y
 *  envía el correo que corresponde. `correoEnviado: false` significa que el
 *  empleado SÍ se creó pero el correo no se pudo enviar. */
export async function crearEmpleado(
  datos: CrearEmpleadoRequest,
): Promise<CrearEmpleadoResponse> {
  const { data } = await api.post<CrearEmpleadoResponse>("/empleados", datos);
  return data;
}

/** POST /empleados/:documento/reenviar-invitacion: genera un token nuevo (el
 *  enlace anterior deja de servir) y reenvía el correo. Recibe el NÚMERO DE
 *  DOCUMENTO, no el idEmpleado. */
export async function reenviarInvitacion(
  documento: string,
): Promise<ReenvioInvitacionResponse> {
  const { data } = await api.post<ReenvioInvitacionResponse>(
    `/empleados/${encodeURIComponent(documento)}/reenviar-invitacion`,
  );
  return data;
}

/** GET /empleados/invitaciones: documentos con invitación pendiente (quien no
 *  aparece ya activó su cuenta o nunca la tuvo por crear). */
export async function listarInvitacionesPendientes(): Promise<InvitacionesPendientesResponse> {
  const { data } = await api.get<InvitacionesPendientesResponse>(
    "/empleados/invitaciones",
  );
  return data;
}

/** GET /empleados: empleados con su contratación vigente y el historial. */
export async function listarEmpleados(): Promise<ListarEmpleadosResponse> {
  const { data } = await api.get<ListarEmpleadosResponse>("/empleados");
  return data;
}

/** GET /empleados/cargos: roles activos asignables como cargo (no exige el
 *  permiso de Roles). */
export async function listarCargos(): Promise<ListarCargosResponse> {
  const { data } = await api.get<ListarCargosResponse>("/empleados/cargos");
  return data;
}

/** GET /empleados/mi-contratacion: historial de contrataciones de la sesión. */
export async function obtenerMiContratacion(): Promise<MiContratacionResponse> {
  const { data } = await api.get<MiContratacionResponse>("/empleados/mi-contratacion");
  return data;
}

/** PUT /empleados/:idEmpleado: datos de la persona y, si se envían, cargos y
 *  fechas de la contratación abierta. `idEmpleado` = id_empleado, NO el documento. */
export async function editarEmpleado(
  idEmpleado: number,
  datos: EditarEmpleadoRequest,
): Promise<EditarEmpleadoResponse> {
  const { data } = await api.put<EditarEmpleadoResponse>(`/empleados/${idEmpleado}`, datos);
  return data;
}

/** PATCH /empleados/:idEmpleado/estado: activa o desactiva la ficha (no la
 *  cuenta). `idEmpleado` = id_empleado, NO el documento. */
export async function cambiarEstadoEmpleado(
  idEmpleado: number,
  estado: boolean,
): Promise<MensajeEmpleadoResponse> {
  const { data } = await api.patch<MensajeEmpleadoResponse>(
    `/empleados/${idEmpleado}/estado`,
    { estado },
  );
  return data;
}

/** POST /empleados/:idEmpleado/contrataciones: cierra sola la contratación
 *  abierta (fecha final = inicio nuevo − 1 día) y registra la nueva.
 *  `idEmpleado` = id_empleado, NO el documento. */
export async function crearContratacion(
  idEmpleado: number,
  datos: NuevaContratacionRequest,
): Promise<MensajeEmpleadoResponse> {
  const { data } = await api.post<MensajeEmpleadoResponse>(
    `/empleados/${idEmpleado}/contrataciones`,
    datos,
  );
  return data;
}
