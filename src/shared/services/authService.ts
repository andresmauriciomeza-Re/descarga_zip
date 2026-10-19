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

/** Elimina la cuenta en el backend (DELETE /usuarios/:id). El backend decide:
 *  sin registros asociados la borra de verdad; con ventas o contrataciones
 *  la desactiva en su lugar. `id` es el número de documento (el id real de
 *  la cuenta en tb_usuarios). */
export async function eliminarUsuario(
  id: string,
): Promise<{ accion: "eliminado" | "desactivado"; mensaje: string }> {
  const { data } = await api.delete<{
    accion: "eliminado" | "desactivado";
    mensaje: string;
  }>(`/usuarios/${encodeURIComponent(id)}`);
  return data;
}

export interface UsuarioListadoApi {
  id_usuario: string | number;
  tipo_documento: string | null;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  estado: boolean;
  id_rol: string | number;
  rol: string;
  rol_estado: boolean;
  es_empleado: boolean;
}

export interface ClienteListadoApi {
  id_cliente: string | number;
  id_usuario: string | number;
  cliente_estado: boolean;
  tipo_documento: string | null;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  usuario_estado: boolean;
  id_rol: string | number;
  rol: string;
  rol_estado: boolean;
}

export async function listarUsuarios(): Promise<UsuarioListadoApi[]> {
  const { data } = await api.get<UsuarioListadoApi[]>("/usuarios");
  return data;
}

export async function listarClientes(): Promise<ClienteListadoApi[]> {
  const { data } = await api.get<ClienteListadoApi[]>("/clientes");
  return data;
}

export async function crearCliente(datos: {
  tipoDocumento: string; numeroDocumento: string; nombre: string;
  correo: string; telefono: string; estado: boolean;
}): Promise<void> {
  await api.post('/clientes', datos);
}

export async function editarCliente(id: string, datos: {
  nombre: string; correo: string; telefono: string;
}): Promise<void> {
  await api.put(`/clientes/${encodeURIComponent(id)}`, datos);
}

export async function cambiarEstadoCliente(id: string, estado: boolean): Promise<void> {
  await api.patch(`/clientes/${encodeURIComponent(id)}/estado`, { estado });
}

export interface ClientePorDocumentoApi {
  documento: string | number;
  tipoDocumento: string;
  nombre: string;
  telefono: string | null;
  estado: boolean;
}

export async function buscarClientePorDocumento(
  documento: string,
  tipoDocumento: string,
): Promise<ClientePorDocumentoApi> {
  const { data } = await api.get<ClientePorDocumentoApi>(
    `/clientes/documento/${encodeURIComponent(documento)}`,
    { params: { tipoDocumento } },
  );
  return data;
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
