import { useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import {
  MensajeError,
  PasswordField,
  RequisitosContrasena,
  faltantesContrasena,
  validarContrasena,
} from "@/shared/components/campo";
import { authGlassInputCls } from "@/shared/styles/authGlass";
import { useValidacionFormulario } from "@/shared/hooks/useValidacionFormulario";

/**
 * Paso "nueva contraseña" del flujo de contraseña (vidrio esmerilado). Es
 * el MISMO paso para el "¿Olvidaste tu contraseña?" del login y para el
 * "Cambiar contraseña" del perfil: solo campos nuevos (sin la contraseña
 * actual), checklist en tiempo real y botón deshabilitado hasta que todo
 * sea válido. El título/cabecera lo pone quien lo monta.
 */
export function PasoNuevaContrasena({
  onGuardar,
  labelConfirmar = "Confirmar contraseña",
  labelBoton = "Cambiar contraseña",
  labelBotonCargando = "Cambiando...",
}: {
  /** Aplica la contraseña nueva (con el código ya verificado). Si lanza,
   *  el mensaje se pinta bajo el campo de la nueva contraseña. */
  onGuardar: (nueva: string) => Promise<void>;
  /** Los dos flujos comparten el paso; solo cambia el texto del label. */
  labelConfirmar?: string;
  /** Texto del botón y del botón cargando (el alta de empleado dice
   *  "Crear contraseña" en vez de "Cambiar contraseña"). */
  labelBoton?: string;
  labelBotonCargando?: string;
}) {
  const [nueva, setNueva] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const validacion = useValidacionFormulario(["newPass", "confirm"]);

  // ── Validación en tiempo real (mismo patrón que el resto del flujo) ──
  const passwordError = nueva.length > 0 ? validarContrasena(nueva) : null;
  const confirmVacio = confirm.length === 0;
  const confirmCoincide = !confirmVacio && confirm === nueva;
  const confirmError = !confirmVacio && !confirmCoincide;
  const todoValido = validarContrasena(nueva) === null && confirmCoincide;
  const faltan: string[] = [];
  if (nueva.length === 0) faltan.push("escribir la contraseña");
  else faltan.push(...faltantesContrasena(nueva));
  if (confirmVacio) faltan.push("confirmar la contraseña");
  else if (confirmError) faltan.push("que las contraseñas coincidan");

  const estadoNew: "ok" | "err" | "neutro" =
    passwordError || errorGuardado ? "err" : nueva.length === 0 ? "neutro" : "ok";
  const estadoConfirm: "ok" | "err" | "neutro" =
    confirmError ? "err" : confirmVacio ? "neutro" : "ok";
  const clsCampo = (estado: "ok" | "err" | "neutro") => authGlassInputCls(estado);

  const guardar = async () => {
    if (loading || !todoValido) return;
    setLoading(true);
    setErrorGuardado(null);
    try {
      await onGuardar(nueva);
      // Éxito: quien llama cambia de paso o cierra (este componente se
      // desmonta sin más acciones).
    } catch (e) {
      setErrorGuardado((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const enviarConEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") void guardar();
  };

  return (
    <>
      <div className="space-y-3 mb-5">
        <div>
          <label className="block text-sm font-semibold text-foreground dark:text-white mb-1.5">
            Nueva contraseña
          </label>
          <PasswordField
            value={nueva}
            onChange={(v) => {
              setNueva(v);
              setErrorGuardado(null);
            }}
            onKeyDown={(e) => {
              validacion.onKeyDownCampo("newPass", {
                validar: () => validarContrasena(nueva),
              })(e);
              enviarConEnter(e);
            }}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            cls={clsCampo(estadoNew)}
            inputRef={validacion.refCampo("newPass")}
            ariaInvalid={Boolean(passwordError ?? errorGuardado)}
            ariaDescribedBy={
              passwordError ?? errorGuardado
                ? validacion.idError("newPass")
                : undefined
            }
          />
          {/* Lista de requisitos que se marca mientras se escribe. */}
          <RequisitosContrasena valor={nueva} />
          <MensajeError
            id={validacion.idError("newPass")}
            err={passwordError ?? errorGuardado ?? undefined}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground dark:text-white mb-1.5">
            {labelConfirmar}
          </label>
          <PasswordField
            value={confirm}
            onChange={setConfirm}
            onKeyDown={(e) => {
              validacion.onKeyDownCampo("confirm", {
                validar: () =>
                  confirm === nueva ? null : "Las contraseñas no coinciden",
              })(e);
              enviarConEnter(e);
            }}
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            cls={clsCampo(estadoConfirm)}
            inputRef={validacion.refCampo("confirm")}
            ariaInvalid={Boolean(confirmError)}
            ariaDescribedBy={
              confirmError ? validacion.idError("confirm") : undefined
            }
          />
          {confirmError && (
            <MensajeError
              id={validacion.idError("confirm")}
              err="Las contraseñas no coinciden"
            />
          )}
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
        className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 mb-3"
      >
        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
        {loading ? labelBotonCargando : labelBoton}
      </button>
      {/* Un botón deshabilitado nunca queda sin explicación. */}
      {!todoValido && (
        <p className="text-xs text-muted-foreground mb-3 leading-tight">
          Para guardar falta: {faltan.join(", ")}.
        </p>
      )}
    </>
  );
}
