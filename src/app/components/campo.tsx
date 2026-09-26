import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

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

/**
 * Parrafo de error debajo del campo. No ocupa espacio cuando no hay error.
 * `leading-tight` recorta la altura cuando el texto envuelve a dos lineas, que
 * es lo que descuadraba las grillas de dos columnas.
 */
export function MensajeError({ err }: { err?: string }) {
  if (!err) return null;
  return <p className="text-xs text-red-500 mt-1 ml-0.5 leading-tight">{err}</p>;
}

/**
 * Campo de contraseña con el icono de mostrar/ocultar. Envuelve solo el input:
 * el label y el mensaje de error siguen siendo del formulario, para no obligar
 * a reescribir el JSX de cada pantalla.
 *
 * `cls` es obligatoria a proposito: los modales de administracion usan un
 * `fCls` local con `px-3 py-2`, distinto del `inputCls` de aqui, y el campo no
 * debe cambiar de tamano al recibir el icono.
 */
export function PasswordField({
  value,
  onChange,
  placeholder,
  cls,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  cls: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${cls} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
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

// --- Filtros de escritura ---
// Se usan en el onChange de los campos numericos: dejan pasar solo el digito
// mientras se escribe, en vez de dejar que la letra entre al formulario y
// esperar al envio para avisar. Se complementan con `validarDocumento` /
// `validarTelefono`, que siguen siendo la red de seguridad del onSubmit.

/** Deja solo digitos 0-9. Se usa en numero de documento y en telefono. */
export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/**
 * Numero de documento al escribir. El pasaporte (`PP`) conserva el criterio
 * previo, que admite letras (`AB123456`); el resto de tipos se queda solo con
 * digitos. Los espacios y los puntos se siguen descartando para todos, igual
 * que antes.
 */
export function filtrarDocumento(valor: string, tipoDocumento: string): string {
  return tipoDocumento === "PP" ? valor.replace(/[\s.]/g, "") : soloDigitos(valor);
}
