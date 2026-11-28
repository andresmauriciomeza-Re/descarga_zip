import { useEffect, useState } from "react";
import { useValidacionFormulario } from "@/shared/hooks/useFormValidation";
import { filtrarCorreo, MensajeError, validarCorreo } from "@/shared/components/FormInputs";
import { restablecerContrasena, solicitarCodigoRecuperacion, verificarCodigoRecuperacion } from "@/shared/services/authService";
import { toast } from "sonner";
import type { ApiErrorConEstado } from "@/types/api";
import { AUTH_GLASS_BUTTON_SECONDARY, AUTH_GLASS_CARD, AUTH_GLASS_OVERLAY, AUTH_SELECTOR_IDIOMA, authGlassInputCls } from "@/shared/styles/authGlass";
import { LanguageSelector } from "@/shared/components/LanguageSelector";
import { motion } from "motion/react";
import { CheckCircle, Mail, RefreshCw, X } from "lucide-react";
import { SERIF } from "@/shared/utils/fonts";
import { PasoCodigoVerificacion } from "@/shared/components/VerificationCodeStep";
import { PasoNuevaContrasena } from "@/shared/components/NewPasswordStep";
import { useIdioma } from "@/shared/i18n";

export function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const { t, errorVisible } = useIdioma();
  const [step, setStep] = useState<
    "email" | "code" | "password" | "done"
  >("email");
  const [forgotEmail, setForgotEmail] = useState("");
  // El código vive aquí (no en el paso) porque lo necesita el restablecer.
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  // Error que el paso de código pinta al montar (p. ej. el código caducó
  // mientras se escribía la contraseña nueva).
  const [errorCodigo, setErrorCodigo] = useState<string | undefined>();

  // Trampa de Tab, foco al primer inválido y aria del paso de correo. Los
  // pasos de código y contraseña viven en componentes compartidos que ya
  // traen esta lógica consigo.
  const validacion = useValidacionFormulario(["forgotEmail"]);

  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      // Si el menú de idioma está abierto, Escape solo lo cierra a él.
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [onClose]);

  const sendCode = async () => {
    const err = validarCorreo(forgotEmail);
    if (err) {
      setErrores({ forgotEmail: err });
      validacion.enfocarPrimero({ forgotEmail: err });
      return;
    }
    // El backend siempre responde 200 exista o no el correo (para no revelar
    // cuentas), así que el aviso de éxito es neutro y no depende del resultado.
    const correo = forgotEmail.trim().toLowerCase();
    setErrores({});
    setLoading(true);
    try {
      await solicitarCodigoRecuperacion(correo);
      setErrorCodigo(undefined);
      setStep("code");
      toast.success(t("auth.v.codigoSiRegistrado"));
    } catch (e) {
      // 429 (demasiadas solicitudes) y fallo de conexión: el interceptor ya
      // extrajo el texto; no se avanza de paso.
      toast.error(errorVisible((e as Error).message));
    } finally {
      setLoading(false);
    }
  };

  // Los pasos de código y contraseña son los MISMOS componentes que usa el
  // modal de "Cambiar contraseña"; aquí solo se pegan las llamadas a la API.
  const reenviarCodigo = async () => {
    await solicitarCodigoRecuperacion(forgotEmail.trim().toLowerCase());
  };

  const verificarCodigo = async (codigoCompleto: string) => {
    try {
      const res = await verificarCodigoRecuperacion(
        forgotEmail.trim().toLowerCase(),
        codigoCompleto,
      );
      if (res.valido !== true) {
        // Defensa: el contrato manda 400, pero un 200 con valido=false se
        // trata igual que código inválido y no se avanza.
        throw new Error("El código es incorrecto o venció.");
      }
      setErrorCodigo(undefined);
      setStep("password");
    } catch (e) {
      const err = e as ApiErrorConEstado;
      if (err.message === "El código es incorrecto o venció.") {
        throw err; // el paso del código lo pinta bajo las casillas
      }
      // 429 y fallo de conexión: se avisa y se vuelve al correo, porque el
      // código no se pudo validar.
      toast.error(errorVisible(err.message));
      if (err.status === 429) setStep("email");
    }
  };

  const cambiarPassword = async (nueva: string) => {
    // Guardado real contra el backend: el código ya se verificó en el paso
    // anterior, pero el servidor lo vuelve a validar. La contraseña nueva no
    // se guarda en estado, localStorage ni consola.
    try {
      await restablecerContrasena(
        forgotEmail.trim().toLowerCase(),
        code.join(""),
        nueva,
      );
      setStep("done");
    } catch (e) {
      const err = e as ApiErrorConEstado;
      if (err.message === "El código es incorrecto o venció.") {
        // Caducó o quedó invalidado entre pasos: se pide de nuevo.
        setErrorCodigo(err.message);
        setStep("code");
        return;
      }
      if (err.status === 429) {
        // Demasiadas solicitudes: se reinicia el flujo desde el correo.
        toast.error(errorVisible(err.message));
        setCode(["", "", "", "", "", ""]);
        setStep("email");
        return;
      }
      // Fallo de conexión u otro error del servidor (p. ej. la contraseña
      // no cumple los requisitos): se reintenta desde este mismo paso sin
      // perder el código; el paso lo pinta bajo el campo.
      throw err;
    }
  };

  return (
    <div
      className={`${AUTH_GLASS_OVERLAY} max-md:pt-16!`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {/* El fondo del modal tapa el selector de la pantalla: va uno propio. */}
      <LanguageSelector className={AUTH_SELECTOR_IDIOMA} />
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className={`relative my-auto ${AUTH_GLASS_CARD} w-full max-w-sm p-7`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("auth.cerrarRecuperacion")}
          className={`absolute top-4 right-4 ${AUTH_GLASS_BUTTON_SECONDARY}`}
        >
          <X className="w-5 h-5" />
        </button>
        {/* ── Paso 1: Correo ── */}
        {step === "email" && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <h2
                className="text-xl font-bold text-foreground dark:text-white"
                style={{ fontFamily: SERIF }}
              >
                {t("auth.olvidaste")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("auth.teEnviaremosCodigo")}
              </p>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-semibold text-foreground dark:text-white mb-1.5">
                {t("auth.correo")}
              </label>
              <input
                value={forgotEmail}
                onChange={(e) => {
                  const value = filtrarCorreo(e.target.value);
                  setForgotEmail(value);
                  setErrores((p) => ({ ...p, forgotEmail: validarCorreo(value) ?? "" }));
                }}
                type="email"
                placeholder="correo@lasirena.com"
                ref={validacion.refCampo("forgotEmail")}
                onKeyDown={validacion.onKeyDownCampo("forgotEmail", {
                  errores,
                  validar: () => validarCorreo(forgotEmail),
                  aplicar: (campo, err) =>
                    setErrores((p) => ({ ...p, [campo]: err ?? "" })),
                })}
                className={authGlassInputCls(errores.forgotEmail ? "err" : "neutro")}
                {...validacion.ariaCampo("forgotEmail", errores.forgotEmail)}
              />
              <MensajeError id={validacion.idError("forgotEmail")} err={errores.forgotEmail} />
            </div>
            <button
              onClick={sendCode}
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 mb-3"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : null}
              {loading ? t("auth.enviando") : t("auth.enviarCodigo")}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 max-md:min-h-11 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              {t("auth.volverLogin")}
            </button>
          </>
        )}

        {/* ── Paso 2: Solo código OTP (componente compartido) ── */}
        {step === "code" && (
          <PasoCodigoVerificacion
            codigo={code}
            onCodigoChange={setCode}
            correoDestino={forgotEmail}
            onVerificar={verificarCodigo}
            onReenviar={reenviarCodigo}
            onVolverOtroCorreo={() => {
              setErrorCodigo(undefined);
              setStep("email");
            }}
            errorInicial={errorCodigo}
          />
        )}

        {/* ── Paso 3: Nueva contraseña (componente compartido) ── */}
        {step === "password" && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <h2
                className="text-xl font-bold text-foreground dark:text-white"
                style={{ fontFamily: SERIF }}
              >
                {t("auth.nuevaContrasena")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("auth.eligeSegura")}
              </p>
            </div>
            <PasoNuevaContrasena onGuardar={cambiarPassword} />
            <button
              onClick={onClose}
              className="w-full py-2.5 max-md:min-h-11 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              {t("auth.volverAIniciar")}
            </button>
          </>
        )}

        {/* ── Paso 4: Éxito ── */}
        {step === "done" && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2
              className="text-xl font-bold text-foreground dark:text-white mb-2"
              style={{ fontFamily: SERIF }}
            >
              {t("auth.actualizada")}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {t("auth.actualizadaTexto")}
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
            >
              {t("auth.irAIniciar")}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
