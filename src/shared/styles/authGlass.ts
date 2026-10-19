/**
 * Clases "vidrio esmerilado" compartidas por las pantallas de autenticación
 * (Login y Registro) y los modales de contraseña. Un solo archivo para que los
 * modales usen EXACTAMENTE el mismo look and feel que las tarjetas de
 * Login/Registro sin duplicar las cadenas.
 */

/** Tarjeta de vidrio: fondo translúcido + backdrop-blur + borde/sombra.
 *  NO incluye ancho ni padding: cada pantalla aporta los suyos
 *  (`max-w-[480px] px-5 py-8 ...`) para que su apariencia no cambie. */
export const AUTH_GLASS_CARD =
  "rounded-2xl shadow-2xl border border-white/50 dark:border-white/10 bg-white/90 dark:bg-neutral-950/85 supports-[backdrop-filter:blur(1px)]:bg-white/65 dark:supports-[backdrop-filter:blur(1px)]:bg-neutral-950/55 backdrop-blur-xl backdrop-saturate-150";

/** Base de todo campo de texto sobre vidrio (sin ancho: `w-full` o `w-10` lo pide quien lo usa). */
export const AUTH_GLASS_INPUT_BASE =
  "px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Borde/fondo neutro sobre vidrio (equivale al `border-border bg-muted` de los formularios del panel). */
export const AUTH_GLASS_INPUT_OK =
  "border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/10";

/** Borde/fondo de error, idéntico al que ya usaba el login. */
export const AUTH_GLASS_INPUT_ERROR =
  "border-red-400 bg-red-50/50 dark:bg-red-950/50 dark:border-red-400/80";

/** Borde verde cuando el campo ya es válido (estados de los modales). */
export const AUTH_GLASS_INPUT_VALID = "border-emerald-500";

/** Texto y placeholder legibles sobre vidrio en los dos temas. */
export const AUTH_GLASS_INPUT_TEXT =
  "text-foreground dark:text-white placeholder:text-neutral-500 dark:placeholder:text-white/50";

/** Botón secundario de vidrio: la flecha "volver" del login/registro y la X de cerrar de los modales. */
export const AUTH_GLASS_BUTTON_SECONDARY =
  "p-2.5 rounded-xl border border-black/10 dark:border-white/20 bg-white/40 dark:bg-white/10 text-foreground/70 dark:text-white/70 hover:bg-white/60 dark:hover:bg-white/20 cursor-pointer transition-colors";

/** Fondo detrás de un modal: oscurecido y desenfocado, para que el vidrio
 *  se note también sobre pantallas blancas (p. ej. Mi perfil). */
export const AUTH_GLASS_OVERLAY =
  "fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/30 backdrop-blur-sm";

/** Fondo/borde de un campo según su estado (compartido por inputs y casillas OTP). */
function fondoDeEstado(estado: "ok" | "err" | "neutro"): string {
  if (estado === "err") return AUTH_GLASS_INPUT_ERROR;
  if (estado === "ok") return AUTH_GLASS_INPUT_VALID;
  return AUTH_GLASS_INPUT_OK;
}

/**
 * Clases glass de los inputs de Login y Registro (dos estados: error o
 * neutro). Espejo exacto de la `authInputCls` que vivía en App.tsx, con el
 * mismo set de tokens para que esas pantallas no cambien de aspecto.
 */
export function authInputCls(err?: string, base: string = ""): string {
  const propia = `w-full ${AUTH_GLASS_INPUT_BASE} ${
    err ? AUTH_GLASS_INPUT_ERROR : AUTH_GLASS_INPUT_OK
  } ${AUTH_GLASS_INPUT_TEXT}`;
  return `${propia}${base ? ` ${base}` : ""}`;
}

/**
 * Variante de tres estados (ok/err/neutro) para los modales de contraseña,
 * que pintan de verde un campo ya válido. Mismas piezas glass que Login.
 */
export function authGlassInputCls(
  estado: "ok" | "err" | "neutro" = "neutro",
  base: string = "",
): string {
  const propia = `w-full ${AUTH_GLASS_INPUT_BASE} ${fondoDeEstado(
    estado,
  )} ${AUTH_GLASS_INPUT_TEXT}`;
  return `${propia}${base ? ` ${base}` : ""}`;
}

/** Base de las casillas del código OTP (6 dígitos). A diferencia de
 *  `AUTH_GLASS_INPUT_BASE` NO lleva `px-4`: en Tailwind el orden de las
 *  clases en el atributo no decide (el CSS generado sí), así que `px-0` no
 *  pisaría al `px-4`. Sin padding el dígito se ve completo y centrado en la
 *  casilla angosta (`w-12 h-14`). */
export const AUTH_GLASS_OTP_BASE =
  "px-0 py-0 w-12 h-14 text-xl font-bold text-center leading-none rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Clases glass de una casilla OTP según su estado (borde rojo si hay error). */
export function authGlassOtpCls(tieneError?: boolean): string {
  return `${AUTH_GLASS_OTP_BASE} ${
    tieneError ? AUTH_GLASS_INPUT_ERROR : AUTH_GLASS_INPUT_OK
  } ${AUTH_GLASS_INPUT_TEXT}`;
}
