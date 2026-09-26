// Piezas compartidas del patron de validacion inline.
//
// El proyecto ya tenía este patron implementado a mano en cinco pantallas
// (MiPerfilScreen, ClientProfileScreen, GestionUsuariosScreen,
// GestionEmpleadosScreen, GestionClientesScreen y el RolModal de
// GestionConfigScreen). Lo unico que se centraliza aqui son las tres piezas que
// se repiten: el clase builder del input, el parrafo del mensaje y los
// validadores de correo/telefono.
//
// No se envuelve el input en un componente a proposito: los formularios ya
// escritos usan JSX propio (labels, iconos, help text, grids de dos columnas)
// y envolverlos obligaria a reescribirlos enteros. Aqui solo seLiga el error.

/**
 * Clases del input segun tenga error. La rama con error usa exactamente los
 * mismos tokens que ya usaban los formularios migrados
 * (`border-red-400 bg-red-50/30`), para que el cambio sea invisible.
 */
export function inputCls(err?: string, base: string = ""): string {
  const propia =
    "w-full px-4 py-3 bg-muted rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const estado = err ? "border-red-400 bg-red-50/30" : "border-border";
  return `${propia} ${estado}${base ? ` ${base}` : ""}`;
}

/** Parrafo de error debajo del campo. No ocupa espacio cuando no hay error. */
export function MensajeError({ err }: { err?: string }) {
  if (!err) return null;
  return <p className="text-xs text-red-500 mt-1 ml-0.5">{err}</p>;
}

// ─────────────────────────── Validadores ───────────────────────────
// Reglas preexistentes: no cambian que se considera valido, solo evitan que
// el mismo regex este copiado en cada pantalla.

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_TELEFONO = /^\d{7,15}$/;
const RE_TELEFONO_FLEXIBLE = /^[\d\s+()\-]+$/;

export const MIN_CONTRASENA = 6;

export function validarCorreo(v: string): string | null {
  if (!v.trim()) return "El correo es obligatorio";
  if (!RE_CORREO.test(v.trim())) return "Ingresa un correo electrónico válido (ej: nombre@dominio.com)";
  return null;
}

export function validarTelefono(v: string): string | null {
  if (!v.trim()) return "El teléfono es obligatorio";
  if (!RE_TELEFONO.test(v.replace(/\s/g, ""))) return "El teléfono debe tener entre 7 y 15 dígitos";
  return null;
}

/** Telefono opcional: si viene vacio no hay error, si viene debe ser numerico. */
export function validarTelefonoOpcional(v: string): string | null {
  if (!v.trim()) return null;
  if (!RE_TELEFONO_FLEXIBLE.test(v.trim())) return "El teléfono solo debe contener números";
  return null;
}

export function validarContrasena(v: string): string | null {
  if (v.length < MIN_CONTRASENA)
    return `La contraseña debe tener al menos ${MIN_CONTRASENA} caracteres`;
  return null;
}

/**
 * Numero de documento. `PP` (pasaporte) admite letras, el resto solo digitos:
 * es el mismo criterio que ya usaban los formularios de alta.
 */
export function validarDocumento(valor: string, tipoDocumento: string): string | null {
  if (!valor.trim()) return "El número de documento es obligatorio";
  if (tipoDocumento !== "PP" && !/^\d+$/.test(valor.trim()))
    return "El número de documento solo debe contener números";
  return null;
}
