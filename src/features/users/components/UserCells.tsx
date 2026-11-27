import { type UsuarioGestion, rolesDeUsuario, tonoRol } from "@/features/users/utils/users";
import { EstadoPill } from "@/shared/components/panel/StatusPill";

export function Avatar({ u, tam }: { u: UsuarioGestion; tam: number }) {
  return (
    <div
      className={`${u.avatarColor} text-white font-bold shrink-0 flex items-center justify-center rounded-full`}
      style={{ width: tam, height: tam, fontSize: tam * 0.36 }}
      aria-hidden="true"
    >
      {u.iniciales}
    </div>
  );
}

export function RolesPills({ usuario }: { usuario: UsuarioGestion }) {
  const roles = rolesDeUsuario(usuario);
  if (roles.length === 0) return <EstadoPill tono="gris">Sin cargo</EstadoPill>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {roles.map(r => <EstadoPill key={r} tono={tonoRol(r)}>{r}</EstadoPill>)}
    </div>
  );
}

export const EstadoEntrada = ({ activo }: { activo: boolean }) => (
  <EstadoPill tono={activo ? "verde" : "gris"}>
    {activo ? "Activo · puede entrar" : "Inactivo · no puede entrar"}
  </EstadoPill>
);
