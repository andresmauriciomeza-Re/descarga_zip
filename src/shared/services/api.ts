import axios, { AxiosError } from "axios";
import type { ApiErrorBody, ApiErrorConEstado } from "@/types/api";
import { borrarToken, obtenerToken } from "./authService";

declare module "axios" {
  export interface AxiosRequestConfig {
    checkoutAuth?: boolean;
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

const esLogin = (url?: string) => !!url && /\/auth\/login\/?$/.test(url);
const CODIGOS_SESION = new Set(["SESION_INVALIDADA", "TOKEN_EXPIRADO"]);
let manejadorCierreSesion: ((mensaje: string) => void) | null = null;
let tokenEnCierre: string | null = null;

export function crearError401Checkout(): ApiErrorConEstado {
  const error = new Error("Se requiere una sesión para pagar.") as ApiErrorConEstado;
  error.status = 401;
  error.code = "TOKEN_NO_PROPORCIONADO";
  return error;
}

export function es401GenericoCheckout(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const { status, code } = error as ApiErrorConEstado;
  return status === 401 && !CODIGOS_SESION.has(code ?? "");
}

export function registrarManejadorCierreSesion(
  manejador: (mensaje: string) => void,
): () => void {
  manejadorCierreSesion = manejador;
  return () => {
    if (manejadorCierreSesion === manejador) manejadorCierreSesion = null;
  };
}

api.interceptors.request.use((config) => {
  const token = obtenerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status;
    let mensaje =
      error.response?.data?.error?.message ??
      "No se pudo conectar con el servidor.";
    const codigo = error.response?.data?.error?.code;
    const token = obtenerToken();
    const checkout401Generico =
      error.config?.checkoutAuth === true &&
      status === 401 &&
      !CODIGOS_SESION.has(codigo ?? "");
    if (status === 401 && !esLogin(error.config?.url) && token && !checkout401Generico) {
      if (codigo === "SESION_INVALIDADA") {
        mensaje =
          "Tu contraseña fue cambiada o tu sesión ya no es válida. Inicia sesión con tu nueva contraseña.";
      } else if (codigo === "TOKEN_EXPIRADO") {
        mensaje = "Tu sesión expiró. Inicia sesión nuevamente.";
      }

      if (tokenEnCierre !== token) {
        tokenEnCierre = token;
        if (manejadorCierreSesion) {
          manejadorCierreSesion(mensaje);
        } else {
          borrarToken();
        }
      }
    }
    const err = new Error(mensaje) as ApiErrorConEstado;
    err.status = status;
    err.code = codigo;
    return Promise.reject(err);
  },
);

export default api;
