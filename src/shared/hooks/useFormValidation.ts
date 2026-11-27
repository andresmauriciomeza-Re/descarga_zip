import { useRef, useState, type KeyboardEvent } from "react";

// Lógica compartida de validación de formularios: trampa de Tab en campos
// obligatorios inválidos, foco al primer campo inválido al enviar y atributos
// aria. La se usa en los cuatro formularios de auth (Registro, Login,
// Olvidé mi contraseña y cliente invitado del checkout) para que el mismo
// comportamiento esté escrito una sola vez.
//
// Principios:
// - Tab sin shift con error → no sale del campo: se previene el movimiento,
//   se muestra el error y el foco se queda ahí.
// - Shift+Tab NUNCA se intercepta: siempre se puede volver atrás.
// - Clic con el mouse no se intercepta: cambiar de campo con el puntero
//   siempre funciona, haya error o no.
// - Enter no se toca: quien lo necesite (enviar con Enter) lo compone en su
//   propio handler.
// - Los errores siguen su ciclo normal en cada formulario (en tiempo real);
//   el hook solo decide cuándo mostrar/gestionarlos, no los calcula.

export type MapaErrores = Record<string, string | undefined>;

/** Opciones del handler Tab de un campo. */
type OpcionesCampo = {
  /** Estado de errores actual del formulario (incluye los de envío, p. ej. duplicados). */
  errores?: MapaErrores;
  /** Validación en vivo: se ejecuta al momento de pulsar Tab, para no
   *  depender de que el error ya esté calculado en estado (campo vacío
   *  aún no tocado). */
  validar?: () => string | null;
  /** Escribe el error detectado en el estado del formulario, para que se
   *  pinte debajo del campo. */
  aplicar?: (campo: string, err: string | null) => void;
};

export function useValidacionFormulario(orden: string[]) {
  /** Campos cuyo error ya debe mostrarse aunque el formulario tarde en pintarlo. */
  const [visibles, setVisibles] = useState<Record<string, boolean>>({});
  const refs = useRef<Record<string, HTMLElement | null>>({});

  /** Callback ref: se registra como `ref={f.refCampo("email")}` en cada campo
   *  del orden de tabulación para poder enfocarlo después. */
  const refCampo =
    (campo: string) =>
    (el: HTMLElement | null): void => {
      refs.current[campo] = el;
    };

  const mostrarCampo = (campo: string): void => {
    setVisibles((p) => (p[campo] ? p : { ...p, [campo]: true }));
  };

  const estaVisible = (campo: string): boolean => Boolean(visibles[campo]);

  /** Marca todos los campos como visibles (envío fallido): así aparecen
   *  todos los errores juntos aunque el campo no se haya tocado. */
  const marcarTodos = (): void => {
    setVisibles(Object.fromEntries(orden.map((c) => [c, true])));
  };

  /** Muestra todos los errores y lleva el foco al primer campo inválido
   *  según el orden de tabulación. Devuelve su nombre, o null si todo era
   *  válido. */
  const enfocarPrimero = (errs: MapaErrores): string | null => {
    marcarTodos();
    const primero = orden.find((c) => errs[c]) ?? null;
    if (primero) refs.current[primero]?.focus();
    return primero;
  };

  /** Handler `onKeyDown` de un campo obligatorio: solo intercepta Tab. */
  const onKeyDownCampo =
    (campo: string, ops: OpcionesCampo = {}) =>
    (e: KeyboardEvent<HTMLElement>): void => {
      if (e.key !== "Tab" || e.shiftKey) return;
      const err = ops.errores?.[campo] || ops.validar?.() || null;
      if (!err) return;
      e.preventDefault();
      mostrarCampo(campo);
      ops.aplicar?.(campo, err);
      refs.current[campo]?.focus();
    };

  /** Atributos aria del campo: `aria-invalid` y `aria-describedby` apuntando
   *  al id del mensaje de error (ver `idError`). */
  const ariaCampo = (campo: string, errVisible?: string | null) => ({
    "aria-invalid": errVisible ? true : undefined,
    "aria-describedby": errVisible ? idError(campo) : undefined,
  });

  /** Id del párrafo de error: debe coincidir con el `id` de MensajeError. */
  const idError = (campo: string): string => `${campo}-error`;

  return {
    refCampo,
    mostrarCampo,
    estaVisible,
    marcarTodos,
    enfocarPrimero,
    onKeyDownCampo,
    ariaCampo,
    idError,
  };
}

/**
 * Tab dentro del código OTP (6 casillas): se mueve libremente entre ellas y
 * solo se bloquea al salir de la ÚLTIMA casilla cuando el código está
 * incompleto. Devuelve true cuando se interceptó el Tab (el llamador pinta el
 * error y reenfoca la última casilla). Shift+Tab siempre pasa.
 */
export function trampaTabOTP(e: KeyboardEvent, esUltima: boolean, codigoCompleto: boolean): boolean {
  if (e.key !== "Tab" || e.shiftKey || !esUltima || codigoCompleto) return false;
  e.preventDefault();
  return true;
}
