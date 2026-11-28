import type { UsuarioListadoApi } from "@/shared/services/authService";
import type { TonoPill } from "@/shared/components/panel/StatusPill";

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
