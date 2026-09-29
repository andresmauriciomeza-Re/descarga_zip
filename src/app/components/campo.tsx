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
    "w-full px-4 py-2 bg-muted rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
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

export const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "lasirena.com",
] as const;

const RE_CORREO = /^[A-Za-z0-9._-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
const RE_NOMBRE = /^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ]+(?: [A-Za-zÁÉÍÓÚáéíóúÜüÑñ]+)*$/;
const RE_TELEFONO = /^3\d{9}$/;
const RE_TELEFONO_FLEXIBLE = /^[\d\s+()\-]+$/;

export const MIN_CONTRASENA = 8;

export function validarCorreo(v: string): string | null {
  if (!v.trim()) return "El correo es obligatorio";
  if (v !== v.trim() || v.includes(" ")) return "Ingresa un correo válido y sin espacios";
  if (!RE_CORREO.test(v) || (v.match(/@/g) ?? []).length !== 1)
    return "Ingresa un correo válido y sin espacios";
  const [local, domain] = v.toLowerCase().split("@");
  if (!local || local.startsWith(".") || local.endsWith("."))
    return "La parte antes del @ no puede estar vacía ni empezar o terminar con punto";
  if (!ALLOWED_EMAIL_DOMAINS.includes(domain as (typeof ALLOWED_EMAIL_DOMAINS)[number]))
    return "Solo se permiten correos @gmail.com, @outlook.com, @hotmail.com o @lasirena.com";
  return null;
}

export function filtrarCorreo(valor: string): string {
  const filtrado = valor.replace(/[^A-Za-z0-9._@-]/g, "").toLowerCase();
  const arroba = filtrado.indexOf("@");
  if (arroba < 0) return filtrado;
  return `${filtrado.slice(0, arroba)}@${filtrado.slice(arroba + 1).replace(/@/g, "")}`;
}

export function validarNombre(v: string): string | null {
  if (!v.trim()) return "El nombre completo es obligatorio";
  if (!RE_NOMBRE.test(v)) return "Usa solo letras y espacios, sin espacios dobles";
  return null;
}

export function filtrarNombre(valor: string): string {
  return valor
    .replace(/[^A-Za-zÁÉÍÓÚáéíóúÜüÑñ ]/g, "")
    .replace(/^ +/, "")
    .replace(/ {2,}/g, " ");
}

export function validarTelefono(v: string): string | null {
  if (!v.trim()) return "El teléfono es obligatorio";
  const limpio = v.replace(/\s/g, "");
  if (!RE_TELEFONO.test(limpio)) return "El teléfono debe tener 10 dígitos y comenzar por 3";
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
  if (!/[A-Z]/.test(v) || !/[a-z]/.test(v) || !/\d/.test(v))
    return "Debe incluir mayúscula, minúscula y número";
  return null;
}

/**
 * Numero de documento. CE y PP son numericos; se mantienen las longitudes
 * existentes para CC y NIT.
 */
export function validarDocumento(valor: string, tipoDocumento: string): string | null {
  if (!valor.trim()) return "El número de documento es obligatorio";
  const documento = valor.trim();
  if (tipoDocumento === "CC" && !/^\d{6,10}$/.test(documento))
    return "La CC debe tener entre 6 y 10 dígitos";
  if ((tipoDocumento === "CE" || tipoDocumento === "PP") && !/^\d{6,12}$/.test(documento))
    return `La ${tipoDocumento} debe tener entre 6 y 12 dígitos`;
  if (tipoDocumento === "NIT" && !/^\d{9,10}(?:-\d)?$/.test(documento))
    return "El NIT debe tener 9 o 10 dígitos y un guion opcional";
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
 * Deja solo letras (incluyendo acentos), espacios y algunos caracteres comunes
 * en nombres propios (guion, punto, apóstrofo). Se usa en campos como Nombre,
 * Asesor Comercial, Dirección, etc.
 */
export function soloLetras(valor: string): string {
  return valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-'.]/g, "");
}

/**
 * Numero de documento al escribir. CC, CE y PP solo admiten digitos.
 * NIT conserva digitos y guiones; los demas caracteres se descartan.
 */
export function filtrarDocumento(valor: string, tipoDocumento: string): string {
  if (tipoDocumento === "CC") return soloDigitos(valor).slice(0, 10);
  if (tipoDocumento === "NIT") return valor.replace(/[^\d-]/g, "").slice(0, 12);
  return soloDigitos(valor).slice(0, 12);
}
