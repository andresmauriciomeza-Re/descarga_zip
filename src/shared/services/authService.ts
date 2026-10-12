import api from "./api";
import type { LoginResponse, UsuarioApi } from "@/types/api";

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
