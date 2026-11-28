import type { UsuarioListadoApi } from "@/shared/services/authService";
import type { TonoPill } from "@/shared/components/panel/StatusPill";
import type { Rol } from "@/features/roles/utils/roles";

export type UsuarioGestion = Omit<UsuarioListadoApi, "tipo_documento" | "correo" | "telefono" | "rolesExtra"> & {
  id: string;
  tipo_documento: string;
  correo: string;
  telefono: string;
  rolesExtra: string[];
  iniciales: string;
  avatarColor: string;
};

export const normalizar = (s: string) => s.trim().toLocaleLowerCase();

export const esAdministrador = (u: UsuarioGestion) =>
  u.esSuperAdmin || normalizar(u.rol || "") === "administrador" || (u.rolesExtra ?? []).some(r => normalizar(r) === "administrador");

/** Nombres visibles de TODOS los roles del usuario, sin repetir: primero los
 * roles base (Administrador, Empleado, Cliente) y luego los roles extra. */
export const rolesDeUsuario = (u: UsuarioGestion): string[] => {
  const nombres: string[] = [];
  const claves = new Set<string>();
  const agregar = (nombre?: string | null) => {
    const n = (nombre ?? "").trim();
    if (!n) return;
    // "Super Administrador" y "Administrador" cuentan como un solo rol.
    const clave = normalizar(n).replace(/^super\s+/, "");
    if (claves.has(clave)) return;
    claves.add(clave);
    nombres.push(n);
  };
  if (esAdministrador(u)) agregar(u.esSuperAdmin ? "Super Administrador" : "Administrador");
  if (u.esEmpleado) agregar("Empleado");
  if (u.esCliente) agregar("Cliente");
  [u.rol, ...(u.rolesExtra ?? [])].forEach(agregar);
  return nombres;
};

/** Roles: Administrador rojo suave, Empleado verde, Cliente y roles extra grises. */
export const tonoRol = (rol: string): TonoPill => {
  const n = normalizar(rol);
  if (n.includes("administrador")) return "rojo";
  if (n === "empleado") return "verde";
  return "gris";
};

export const DOC_TIPOS = [
  { code: "CC", label: "Cédula de Ciudadanía" },
  { code: "CE", label: "Cédula de Extranjería" },
  { code: "PP", label: "Pasaporte" },
];

export const fmtDoc = (tipo: string, numero: string) => `${tipo} ${numero}`;

export const claveDoc = (tipo?: string, numero?: string) => `${(tipo ?? "").trim().toLowerCase()}||${(numero ?? "").trim()}`;

export const docValida = (clave: string) => clave !== "||" && clave !== "";

export const idRolCliente = (roles: Rol[]) => roles.find(r => r.nombre.trim().toLowerCase() === "cliente")?.id ?? "ROL-002";

export interface Usuario {
  id: string;
  nombre: string;
  iniciales: string;
  avatarColor: string;
  correo: string;
  telefono: string;
  tipoDocumento: string;
  numeroDocumento: string;
  rolIds: string[];
  rolId: string;
  rolInternoId?: string;
  /** Rol primario informado por el backend en login o /auth/me. */
  rolCuentaApi?: string;
  activo: boolean;
  esCliente?: boolean;
  esEmpleado?: boolean;
  rolesExtra?: string[];
  esSuperAdmin?: boolean;
  /** Roles y permisos asignados por el backend para la sesión actual. */
  rolesSesionApi?: import("@/types/api").RolSesionApi[];
}
