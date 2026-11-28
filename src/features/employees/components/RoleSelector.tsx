import { Check, Lock } from "lucide-react";
import type { Rol } from "@/features/roles/utils/roles";

function esRolBase(nombre: string) {
  const normalizado = nombre.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return ["administrador", "cliente", "empleado"].includes(normalizado);
}

export function SelectorRoles({
  roles,
  value,
  onChange,
  error,
  disabled,
  autoFocus,
  id,
}: {
  roles: Rol[];
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
}) {
  const seleccion = value.filter(Boolean);
  const rolesPorId = new Map(roles.map(rol => [rol.id, rol]));
  const disponibles = roles.filter(rol => rol.activo && !esRolBase(rol.nombre));
  const elegidos = seleccion
    .filter(rolId => !esRolBase(rolesPorId.get(rolId)?.nombre ?? rolId))
    .map(rolId => rolesPorId.get(rolId) ?? { id: rolId, nombre: rolId, activo: false });
  const usarSelect = disponibles.length > 5;
  const botones = usarSelect
    ? elegidos
    : [...disponibles, ...elegidos.filter(rol => !rol.activo)];

  return (
    <div id={id} role="group" aria-label="Cargo" className="space-y-2">
      {usarSelect && (
        <select
          aria-label="Agregar un cargo"
          autoFocus={autoFocus}
          disabled={disabled || disponibles.every(rol => seleccion.includes(rol.id))}
          value=""
          onChange={event => onChange([...seleccion, event.target.value])}
          className="w-full rounded-xl border-2 border-border bg-background px-3 text-base min-h-[2.875rem]"
        >
          <option value="" disabled>Agregar un cargo</option>
          {disponibles.filter(rol => !seleccion.includes(rol.id)).map(rol => (
            <option key={rol.id} value={rol.id}>{rol.nombre}</option>
          ))}
        </select>
      )}
      <div className="pn-opciones">
        <span className="pn-opcion opacity-75">
          <Lock size={18} aria-hidden="true" />
          Empleado
        </span>
        {botones.map((rol, index) => {
          const elegido = seleccion.includes(rol.id);
          return (
            <button
              key={rol.id}
              type="button"
              autoFocus={!usarSelect && autoFocus && index === 0}
              className="pn-opcion"
              aria-pressed={elegido}
              disabled={disabled}
              onClick={() => onChange(elegido
                ? seleccion.filter(rolId => rolId !== rol.id)
                : [...seleccion, rol.id])}
            >
              {elegido && <Check size={18} aria-hidden="true" />}
              {rol.nombre}{!rol.activo && " (inactivo)"}
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="pn-campo__error">{error}</p>}
    </div>
  );
}
