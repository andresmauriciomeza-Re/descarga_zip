import axios, { AxiosError } from "axios";
import type { ApiErrorBody, ApiErrorConEstado } from "@/types/api";
import { borrarToken, obtenerToken } from "./authService";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

const esLogin = (url?: string) => !!url && /\/auth\/login\/?$/.test(url);

api.interceptors.request.use((config) => {
  const token = obtenerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status;
    const mensaje =
      error.response?.data?.error?.message ??
      "No se pudo conectar con el servidor.";
    // Sesión inválida en cualquier ruta fuera del login: se borra el token y
    // se recarga para volver al arranque con la sesión cerrada. Solo si había
    // token: un 401 sin sesión no tiene nada que limpiar ni por qué recargar.
    if (status === 401 && !esLogin(error.config?.url) && obtenerToken()) {
      borrarToken();
      window.location.reload();
    }
    const err = new Error(mensaje) as ApiErrorConEstado;
    err.status = status;
    return Promise.reject(err);
  },
);

export default api;
