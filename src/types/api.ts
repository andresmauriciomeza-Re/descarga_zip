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

/** Error re-lanzado por el interceptor de `shared/services/api.ts`: conserva
    el status HTTP para que la UI distinga 401 / 429 / fallo de conexión. */
export interface ApiErrorConEstado extends Error {
  status?: number;
}
