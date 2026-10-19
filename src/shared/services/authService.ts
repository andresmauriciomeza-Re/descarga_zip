import api from "./api";
import type {
  LoginResponse,
  MensajeResponse,
  RegistroRequest,
  RegistroResponse,
  UsuarioApi,
} from "@/types/api";

const TOKEN_KEY = "sivpro.token.v1";

export function obtenerToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // Almacenamiento bloqueado: se comporta como si no hubiera token.
    return null;
  }
}

export function guardarToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Sin cuota o almacenamiento deshabilitado: la sesión vive en memoria.
  }
}

export function borrarToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Almacenamiento bloqueado: no hay nada que borrar.
  }
}

/** Autentica contra el backend y deja el token guardado en localStorage. */
export async function login(
  correo: string,
  contrasena: string,
): Promise<{ token: string; usuario: UsuarioApi }> {
  const { data } = await api.post<LoginResponse>("/auth/login", {
    correo,
    contrasena,
  });
  if (!data?.token || !data?.usuario) {
    throw new Error("Respuesta de autenticación inválida. Intenta de nuevo.");
  }
  guardarToken(data.token);
  return { token: data.token, usuario: data.usuario };
}

/** Perfil completo del usuario autenticado (GET /auth/me): trae nombre,
 *  correo, teléfono, tipo y número de documento. Nunca la contraseña. */
export async function obtenerPerfil(): Promise<UsuarioApi> {
  const { data } = await api.get<UsuarioApi>("/auth/me");
  return data;
}

/** Guarda SOLO correo y teléfono en el backend (PUT /auth/perfil). */
export async function actualizarPerfil(datos: {
  correo: string;
  telefono: string;
}): Promise<UsuarioApi> {
  const { data } = await api.put<UsuarioApi>("/auth/perfil", datos);
  return data;
}

}

/** Pide un código de recuperación. El backend responde 200 exista o no el
 *  correo (para no revelar cuentas); 429 si llegan demasiadas solicitudes.
 *  No guarda token: la recuperación ocurre con el código, no con sesión. */
export async function solicitarCodigoRecuperacion(
  correo: string,
): Promise<MensajeResponse> {
  const { data } = await api.post<MensajeResponse>(
    "/auth/recuperar/solicitar",
    { correo },
  );
  return data;
}

/** Confirma que el código de 6 dígitos corresponde a ese correo y sigue vivo. */
export async function verificarCodigoRecuperacion(
  correo: string,
  codigo: string,
): Promise<{ valido: boolean }> {
  const { data } = await api.post<{ valido: boolean }>(
    "/auth/recuperar/verificar",
    { correo, codigo },
  );
  return data;
}

/** Aplica la contraseña nueva con el código ya verificado. */
export async function restablecerContrasena(
  correo: string,
  codigo: string,
  contrasena: string,
): Promise<MensajeResponse> {
  const { data } = await api.post<MensajeResponse>(
    "/auth/recuperar/restablecer",
    { correo, codigo, contrasena },
  );
  return data;
}

/** Crea la cuenta contra POST /auth/register. El endpoint no devuelve token,
 *  así que aquí no se guarda nada en localStorage ni se toca la sesión. */
export async function registrarCliente(
  datos: RegistroRequest,
): Promise<RegistroResponse> {
  const { data } = await api.post<RegistroResponse>("/auth/register", datos);
  return data;
}
