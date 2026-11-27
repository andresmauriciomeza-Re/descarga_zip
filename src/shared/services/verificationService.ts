import api from "./api";
import type { RegistroResponse } from "@/types/api";

// ── Verificación de correo del registro público (rutas sin sesión) ────────

/** Respuesta de POST /auth/register con la verificación de correo: la cuenta
 *  queda pendiente y `correoEnviado` dice si salió "Confirma tu correo". */
export type RegistroConVerificacion = RegistroResponse & {
  pendienteVerificacion?: boolean;
  correoEnviado?: boolean;
};

/** Confirma el enlace ?verificar=<token>. Devuelve el correo de la cuenta para
 *  precargar el inicio de sesión; si el enlace venció o ya fue usado, el
 *  backend responde 400 con el mensaje que se muestra. */
export async function verificarCorreo(
  token: string,
): Promise<{ mensaje: string; correo: string }> {
  const { data } = await api.post<{ mensaje: string; correo: string }>(
    "/auth/verificacion",
    { token },
  );
  return data;
}

/** Pide un correo de confirmación nuevo. El backend responde siempre el mismo
 *  mensaje, exista o no la cuenta. */
export async function reenviarVerificacion(
  correo: string,
): Promise<{ mensaje: string }> {
  const { data } = await api.post<{ mensaje: string }>(
    "/auth/verificacion/reenviar",
    { correo },
  );
  return data;
}
