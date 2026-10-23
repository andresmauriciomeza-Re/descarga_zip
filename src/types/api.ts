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

export interface RolSesionApi {
  id: string | number;
  nombre: string;
  permisos: PermisoApi[];
}

export interface UsuarioApi {
  id: string | number;
  nombre: string;
  correo: string;
  rol?: string;
  documento?: string;
  numeroDocumento?: string;
  tipoDocumento?: string;
  telefono?: string;
  esSuperAdmin?: boolean;
  permisos?: PermisoApi[];
  roles?: RolSesionApi[];
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

// ── Empleados: alta con invitación por correo ─────────────────────────────

/** POST /empleados. Sin contraseña: el empleado la crea con el enlace del
    correo. Los cargos viajan como NOMBRES de rol (los ids locales del panel no
    son los ids de la base). */
export interface CrearEmpleadoRequest {
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  correo: string;
  telefono: string;
  estado: boolean;
  cargos: string[];
  fechaInicio: string;
  fechaFinal: string;
}

export interface CrearEmpleadoResponse {
  mensaje: string;
  /** La persona ya tenía cuenta con contraseña (cliente registrado). */
  cuentaExistente: boolean;
  /** Correo real al que se envió la invitación o el aviso. */
  correo: string;
  /** false = el empleado se creó, pero el correo no se pudo enviar. */
  correoEnviado: boolean;
}

export interface ReenvioInvitacionResponse {
  mensaje: string;
  correo: string;
  correoEnviado: boolean;
}

/** GET /empleados/invitaciones: documentos con invitación pendiente. */
export interface InvitacionesPendientesResponse {
  pendientes: string[];
}

/** GET /auth/activacion/:token: solo lo que necesita el saludo del modal. */
export interface ActivacionDatos {
  nombre: string;
  correoEnmascarado: string;
}

/** POST /auth/activacion: `correo` real para precargar el inicio de sesión. */
export interface ActivacionResponse {
  mensaje: string;
  correo: string;
}

/** Error re-lanzado por el interceptor de `shared/services/api.ts`: conserva
    el status HTTP para que la UI distinga 401 / 429 / fallo de conexión. */
export interface ApiErrorConEstado extends Error {
  status?: number;
}
