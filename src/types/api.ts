export type CarpetaUpload =
  | "productos"
  | "comprobantes"
  | "proveedores"
  | "no-conformes";

export interface UploadResponse {
  url: string;
  publicId: string;
}

export interface ApiErrorBody {
  error: {
    message: string;
    statusCode: number;
  };
}

export interface MensajeResponse {
  mensaje: string;
}

export interface PermisoApi {
  modulo: string;
  nombre: string;
  privilegios: string[];
}

export interface UsuarioApi {
  id: string | number;
  nombre: string;
  correo: string;
  rol?: string;
  documento?: string;
  tipoDocumento?: string;
  telefono?: string;
  permisos?: PermisoApi[];
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioApi;
}

/** Payload de POST /auth/register. */
export interface RegistroRequest {
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  correo: string;
  telefono: string;
  contrasena: string;
}

/** Respuesta de POST /auth/register: no trae token, solo la ficha creada. */
export interface RegistroResponse {
  usuario: {
    id: string;
    nombre: string;
    correo: string;
    rol: string;
  };
}

/** Error re-lanzado por el interceptor de `shared/services/api.ts`: conserva
    el status HTTP para que la UI distinga 401 / 429 / fallo de conexión. */
export interface ApiErrorConEstado extends Error {
  status?: number;
}
