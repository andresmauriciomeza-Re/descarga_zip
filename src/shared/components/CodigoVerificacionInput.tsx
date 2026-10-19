import { type KeyboardEvent } from "react";
import { authGlassOtpCls } from "@/shared/styles/authGlass";
import { trampaTabOTP } from "@/shared/hooks/useValidacionFormulario";

/**
 * Casillas del código de verificación de 6 dígitos (vidrio esmerilado).
 * Controladas: el padre guarda el arreglo (lo necesita después, p. ej. para
 * restablecer la contraseña con el mismo código) y pinta el error debajo.
 *
 * Comportamiento (idéntico al que tenía inline el "¿Olvidaste tu contraseña?"):
 * - Solo dígitos; al escribir uno avanza el foco a la siguiente casilla.
 * - Backspace en casilla vacía vuelve a la anterior.
 * - Tab solo se mueve entre casillas; al salir de la ÚLTIMA con el código
 *   incompleto se intercepta, se avisa con `onCodigoIncompleto` y el foco
 *   regresa a la última. Shift+Tab nunca se intercepta.
 */
export function CodigoVerificacionInput({
  valor,
  onChange,
  tieneError = false,
  idPrefijo = "otp",
  disabled = false,
  describedBy,
  onCodigoIncompleto,
}: {
  valor: string[];
  onChange: (siguiente: string[]) => void;
  /** Pinta las casillas con borde de error (mismo rojo glass del login). */
  tieneError?: boolean;
  /** Prefijo de los ids (`otp-0`…`otp-5`): lo usa el padre para enfocar. */
  idPrefijo?: string;
  disabled?: boolean;
  /** `aria-describedby` de cada casilla (id del mensaje de error). */
  describedBy?: string;
  /** Avisa cuando se intenta salir de la última casilla con el código incompleto. */
  onCodigoIncompleto?: () => void;
}) {
  const enfocar = (i: number) => {
    document.getElementById(`${idPrefijo}-${i}`)?.focus();
  };

  const handleInput = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const siguiente = [...valor];
    siguiente[i] = val;
    onChange(siguiente);
    if (val && i < 5) enfocar(i + 1);
  };

  const handleKey = (i: number, e: KeyboardEvent) => {
    if (e.key === "Backspace" && !valor[i] && i > 0) {
      enfocar(i - 1);
    }
    if (trampaTabOTP(e, i === 5, valor.join("").length >= 6)) {
      onCodigoIncompleto?.();
      enfocar(5);
    }
  };

  return (
    // gap-1.5 (y no gap-2): con casillas de 48px, 6 cajas + 5 espacios de
    // 8px suman exactamente el ancho útil de la tarjeta y la sexta casilla
    // se iba de línea por el redondeo de píxel.
    <div className="flex justify-center gap-1.5 flex-wrap">
      {valor.map((c, i) => (
        <input
          key={i}
          id={`${idPrefijo}-${i}`}
          value={c}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          maxLength={1}
          inputMode="numeric"
          disabled={disabled}
          aria-label={`Dígito ${i + 1} de 6 del código de verificación`}
          aria-invalid={tieneError ? true : undefined}
          aria-describedby={tieneError ? describedBy : undefined}
          className={authGlassOtpCls(tieneError)}
        />
      ))}
    </div>
  );
}
