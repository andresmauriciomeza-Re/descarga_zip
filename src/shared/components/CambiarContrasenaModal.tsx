import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import {
  MensajeError,
  PasswordField,
  RequisitosContrasena,
  faltantesContrasena,
  validarContrasena,
} from "@/shared/components/campo";

const SERIF = "var(--font-titulo)";

/** Error que devuelve `onGuardar` para que el modal lo muestre debajo del
 *  campo correspondiente (o genérico, si no pertenece a ninguno). */
export type ErrorGuardarContrasena = {
  campo: "actual" | "nueva" | "general";
  mensaje: string;
};

/**
 * Modal compartido de "Cambiar contraseña" (panel y perfil del cliente).
 * Tres campos con ojo: contraseña actual, nueva y confirmar. NO depende de
 * la contraseña guardada en el estado: "la nueva debe ser distinta a la
 * actual" se compara con lo que el usuario ESCRIBE en los dos campos, y la
 * corrección de la actual la hace el backend (PUT /auth/cambiar-contrasena),
 * que responde 400 con "La contraseña actual es incorrecta.".
 */
export function CambiarContrasenaModal({
  correo,
  onClose,
  onGuardar,
}: {
  correo: string;
  onClose: () => void;
  /** Guarda contra el backend. Devuelve null si todo salió bien; si hay
   *  error, indica el campo para pintarlo ahí mismo. */
  onGuardar: (
    actual: string,
    nueva: string,
  ) => Promise<ErrorGuardarContrasena | null>;
}) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorActual, setErrorActual] = useState<string | undefined>();
  const [errorNueva, setErrorNueva] = useState<string | undefined>();
  const [errorGeneral, setErrorGeneral] = useState<string | undefined>();

  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [onClose]);

  const [local, domain] = correo.split("@");
  const correoEnmascarado = `${local[0] ?? ""}•••${domain ? `@${domain}` : ""}`;

  // ── Validación en tiempo real (mismo patrón que el modal del panel) ──
  const passwordError = nueva.length > 0 ? validarContrasena(nueva) : null;
  const mismoQueActual = nueva.length > 0 && nueva === actual;
  const confirmVacio = confirm.length === 0;
  const confirmCoincide = !confirmVacio && confirm === nueva;
  const confirmError = !confirmVacio && !confirmCoincide;
  const todoValido =
    actual.length > 0 &&
    validarContrasena(nueva) === null &&
    !mismoQueActual &&
    confirmCoincide;

  const faltan: string[] = [];
  if (actual.length === 0) faltan.push("escribir la contraseña actual");
  if (nueva.length === 0) faltan.push("escribir la contraseña nueva");
  else faltan.push(...faltantesContrasena(nueva));
  if (mismoQueActual) faltan.push("usar una contraseña distinta a la actual");
  if (confirmVacio) faltan.push("confirmar la contraseña");
  else if (confirmError) faltan.push("que las contraseñas coincidan");

  const clsCampo = (estado: "ok" | "err" | "neutro") =>
    `w-full px-4 py-2 bg-muted rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${
      estado === "err"
        ? "border-red-400 bg-red-50/30"
        : estado === "ok"
          ? "border-emerald-500"
          : "border-border"
    }`;
  const estadoActual: "ok" | "err" | "neutro" =
    errorActual ? "err" : actual.length === 0 ? "neutro" : "ok";
  const estadoNueva: "ok" | "err" | "neutro" =
    nueva.length === 0
      ? "neutro"
      : passwordError || mismoQueActual || errorNueva
        ? "err"
        : "ok";
  const estadoConfirm: "ok" | "err" | "neutro" =
    confirmVacio ? "neutro" : confirmError ? "err" : "ok";

  const guardar = async () => {
    if (loading || !todoValido) return;
    setLoading(true);
    setErrorActual(undefined);
    setErrorNueva(undefined);
    setErrorGeneral(undefined);
    try {
      const error = await onGuardar(actual, nueva);
      if (error) {
        if (error.campo === "actual") setErrorActual(error.mensaje);
        else if (error.campo === "nueva") setErrorNueva(error.mensaje);
        else setErrorGeneral(error.mensaje);
        return;
      }
      // Éxito: quien llama cierra el modal y continúa (toast + logout).
    } finally {
      setLoading(false);
    }
  };

  const enviarConEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") void guardar();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/35 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="relative my-auto bg-card rounded-2xl shadow-2xl border border-border w-full max-w-sm p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar cambio de contraseña"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <h2
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: SERIF }}
          >
            Cambiar contraseña
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Confirma tu contraseña actual y elige una nueva para {correoEnmascarado}
          </p>
        </div>

        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Contraseña actual
            </label>
            <PasswordField
              value={actual}
              onChange={(v) => {
                setActual(v);
                if (errorActual) setErrorActual(undefined);
              }}
              onKeyDown={enviarConEnter}
              placeholder="Tu contraseña actual"
              autoComplete="current-password"
              cls={clsCampo(estadoActual)}
              ariaInvalid={!!errorActual}
            />
            <MensajeError err={errorActual} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Nueva contraseña
            </label>
            <PasswordField
              value={nueva}
              onChange={(v) => {
                setNueva(v);
                if (errorNueva) setErrorNueva(undefined);
              }}
              onKeyDown={enviarConEnter}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              cls={clsCampo(estadoNueva)}
              ariaInvalid={!!passwordError || mismoQueActual || !!errorNueva}
            />
            <RequisitosContrasena valor={nueva} />
            <MensajeError err={passwordError ?? undefined} />
            {mismoQueActual && (
              <MensajeError err="La nueva contraseña debe ser diferente a la actual" />
            )}
            <MensajeError err={errorNueva} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Confirmar nueva contraseña
            </label>
            <PasswordField
              value={confirm}
              onChange={setConfirm}
              onKeyDown={enviarConEnter}
              placeholder="Repite tu contraseña"
              autoComplete="new-password"
              cls={clsCampo(estadoConfirm)}
              ariaInvalid={!!confirmError}
            />
            {confirmError && <MensajeError err="Las contraseñas no coinciden" />}
            {confirmCoincide && (
              <p className="text-xs text-emerald-600 mt-1 leading-tight flex items-center gap-1">
                <Check className="w-3.5 h-3.5 shrink-0" aria-hidden />
                Las contraseñas coinciden
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => void guardar()}
          disabled={loading || !todoValido}
          className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar contraseña"}
        </button>
        {errorGeneral && (
          <p className="text-xs text-red-500 mt-2 leading-tight">{errorGeneral}</p>
        )}
        {!todoValido && (
          <p className="text-xs text-muted-foreground mt-2 leading-tight">
            Para guardar falta: {faltan.join(", ")}.
          </p>
        )}
      </motion.div>
    </div>
  );
}
