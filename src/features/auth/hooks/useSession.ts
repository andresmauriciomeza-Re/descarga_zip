import { KEY, type AccesosMap, type Accion, type Rol } from "@/features/roles/utils/roles";
import { normalizarNombreRol } from "@/shared/utils/roleName";
import { claveDoc, docValida, type Usuario } from "@/features/users/pages/UsersScreen";
import { AVATAR_PALETTE } from "@/shared/utils/avatar";

// Named roles that belong to the public catalog (not the admin panel)
export const PUBLIC_ROLE_NAMES = ["Cliente"];

export const esRolCliente = (rol: Rol | null | undefined) =>
  !!rol && normalizarNombreRol(rol.nombre) === "cliente";

// Roles de la sesión a partir de lo que manda la API (`usuario.roles`). El
// catálogo local solo aporta la presentación (id y descripción); si el rol no
// está en la copia local —p. ej. se creó en otro PC— entra igual, con el id de
// la base y los permisos de la API.
export const armarRolesSesion = (rolesApi: Usuario["rolesSesionApi"], catalogo: Rol[]): Rol[] =>
  (rolesApi ?? []).map(rolApi => {
    const accesos: AccesosMap = {};
    for (const permiso of rolApi.permisos ?? []) {
      accesos[KEY(permiso.modulo, permiso.nombre)] = permiso.privilegios as Accion[];
    }
    const rolCatalogo = catalogo.find(r => normalizarNombreRol(r.nombre) === normalizarNombreRol(rolApi.nombre));
    return rolCatalogo
      ? { ...rolCatalogo, accesos, activo: true }
      : { id: String(rolApi.id), nombre: rolApi.nombre, descripcion: "", accesos, activo: true };
  });

// Clave de persona para el cruce Usuario ↔ Empleado: tipo y número de
// documento, que el usuario NO puede editar (a diferencia del correo). Si el
// documento no está, se cae al correo minúsculo como último recurso.
export const clavePersona = (tipoDocumento: string, numeroDocumento: string, correo: string): string => {
  const k = claveDoc(tipoDocumento, numeroDocumento);
  return docValida(k) ? `doc:${k}` : `correo:${correo.trim().toLowerCase()}`;
};

// Rol manual persistido por usuario. Solo se consulta al restaurar una sesión
// existente tras F5; un login nuevo determina el rol según la respuesta API.
export const ROL_ACTIVO_STORAGE_KEY = "sivpro.rolActivo.v1";

export const leerRolActivo = (usuarioId: string | null | undefined): string | null => {
  if (!usuarioId) return null;
  try {
    const raw = localStorage.getItem(ROL_ACTIVO_STORAGE_KEY);
    if (!raw) return null;
    const m: unknown = JSON.parse(raw);
    if (m && typeof m === "object" && !Array.isArray(m)) {
      const v = (m as Record<string, unknown>)[usuarioId];
      return typeof v === "string" && v ? v : null;
    }
  } catch {
    // Dato corrupto: no hay rol guardado, se usa el primero de la persona.
  }
  return null;
};

export const escribirRolActivo = (usuarioId: string | null | undefined, rolId: string | null) => {
  if (!usuarioId) return;
  try {
    const raw = localStorage.getItem(ROL_ACTIVO_STORAGE_KEY);
    const m: Record<string, string> = raw
      ? (JSON.parse(raw) as Record<string, string>)
      : {};
    if (rolId) m[usuarioId] = rolId;
    else delete m[usuarioId];
    localStorage.setItem(ROL_ACTIVO_STORAGE_KEY, JSON.stringify(m));
  } catch {
    // localStorage bloqueado: el cambio de rol vive solo en memoria.
  }
};

// La sesión (usuario + rol activo + pantalla) se guarda en localStorage para
// que F5 no la borre, y se cierra sola tras 15 minutos de inactividad. La
// clave es compartida entre pestañas: la actividad de cualquier pestaña mantiene
// viva la sesión y cerrarla en una la cierra en todas (evento `storage`).
export const SESION_STORAGE_KEY = "sivpro.sesion.v1";

export const INACTIVIDAD_MS = 15 * 60 * 1000;

/** Mínimo entre escrituras de `ultimaActividad` para no saturar localStorage. */
export const ACTIVIDAD_THROTTLE_MS = 30 * 1000;

export interface SesionGuardada {
  userId: string;
  rolActivo: string | null;
  /** Última pantalla vista, para restaurarla tras recargar. */
  screen: string;
  ultimaActividad: number;
  avatarInicial?: string;
  avatarColor?: string;
}

export const leerSesionGuardada = (): SesionGuardada | null => {
  try {
    const raw = localStorage.getItem(SESION_STORAGE_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as Partial<SesionGuardada> | null;
    if (
      m &&
      typeof m === "object" &&
      typeof m.userId === "string" &&
      m.userId &&
      typeof m.ultimaActividad === "number"
    ) {
      const avatarInicial =
        typeof m.avatarInicial === "string" && /^[A-ZÁÉÍÓÚÜÑ]$/i.test(m.avatarInicial)
          ? m.avatarInicial.toUpperCase()
          : undefined;
      const avatarColor =
        typeof m.avatarColor === "string" && AVATAR_PALETTE.includes(m.avatarColor)
          ? m.avatarColor
          : undefined;
      return {
        userId: m.userId,
        rolActivo: typeof m.rolActivo === "string" ? m.rolActivo : null,
        screen: typeof m.screen === "string" ? m.screen : "",
        ultimaActividad: m.ultimaActividad,
        avatarInicial,
        avatarColor,
      };
    }
  } catch {
    // Dato corrupto: no hay sesión que restaurar.
  }
  return null;
};

export const escribirSesionGuardada = (s: SesionGuardada) => {
  try {
    localStorage.setItem(SESION_STORAGE_KEY, JSON.stringify(s));
  } catch {
    // localStorage bloqueado: la sesión vive solo en memoria.
  }
};

export const borrarSesionGuardada = () => {
  try {
    localStorage.removeItem(SESION_STORAGE_KEY);
  } catch {
    // localStorage bloqueado.
  }
};
