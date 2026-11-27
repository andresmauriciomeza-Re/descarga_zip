import type { UsuarioListadoApi } from "@/shared/services/authService";

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
