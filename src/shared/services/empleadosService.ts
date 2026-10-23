import api from "./api";
import type {
  CrearEmpleadoRequest,
  CrearEmpleadoResponse,
  InvitacionesPendientesResponse,
  ReenvioInvitacionResponse,
} from "@/types/api";

// Empleados: alta con invitación por correo y reenvío de la invitación. El
// formulario nunca manda contraseña: el backend crea la cuenta con un hash
// aleatorio y el empleado la define con el enlace ?activar=<token>.

/** POST /empleados: crea (o completa) la cuenta y la ficha del empleado y
 *  envía el correo que corresponde. `correoEnviado: false` significa que el
 *  empleado SÍ se creó pero el correo no se pudo enviar. */
export async function crearEmpleado(
  datos: CrearEmpleadoRequest,
): Promise<CrearEmpleadoResponse> {
  const { data } = await api.post<CrearEmpleadoResponse>("/empleados", datos);
  return data;
}

/** POST /empleados/:id/reenviar-invitacion: genera un token nuevo (el enlace
 *  anterior deja de servir) y reenvía el correo. `id` = número de documento. */
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
