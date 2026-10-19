import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Lock, ShieldQuestion, X } from "lucide-react";
import { toast } from "sonner";
import {
  restablecerContrasena,
  solicitarCodigoRecuperacion,
  verificarCodigoRecuperacion,
} from "@/shared/services/authService";
import type { ApiErrorConEstado } from "@/types/api";
import {
  AUTH_GLASS_BUTTON_SECONDARY,
  AUTH_GLASS_CARD,
  AUTH_GLASS_OVERLAY,
} from "@/shared/styles/authGlass";
import { PasoCodigoVerificacion } from "@/shared/components/PasoCodigoVerificacion";
import { PasoNuevaContrasena } from "@/shared/components/PasoNuevaContrasena";

const SERIF = "var(--font-titulo)";

/**
 * Modal de "Cambiar contraseña" desde el perfil (cliente, empleados y
 * administrador). Tres pasos con el MISMO vidrio esmerilado y los MISMOS
 * componentes que el "¿Olvidaste tu contraseña?" del login:
 *
 *   1. Confirmación → aviso con el correo enmascarado y botón "Sí, enviar código".
 *   2. Código       → las 6 casillas (el correo es el de la sesión, no editable).
 *   3. Contraseña   → solo la nueva (sin la actual); el backend aplica el cambio
 *                     con POST /auth/recuperar/restablecer.
 *
 * Éxito: quien llama recibe `onCambioExitoso` y hace toast + cierre de
 * sesión con el correo ya precargado en Iniciar sesión (como hasta ahora).
 */
export function CambiarContrasenaModal({
  correo,
  onClose,
  onCambioExitoso,
}: {
  correo: string;
  onClose: () => void;
  /** El cambio se aplicó: cierra y continúa (toast + logout + precarga). */
  onCambioExitoso: () => void;
}) {
  const [paso, setPaso] = useState<"confirmar" | "codigo" | "password">(
    "confirmar",
  );
  // El código vive en el modal porque lo necesita el restablecer del paso 3.
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [errorCodigo, setErrorCodigo] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [onClose]);

  const [local, domain] = correo.split("@");
  const correoEnmascarado = `${local[0] ?? ""}•••${domain ? `@${domain}` : ""}`;

  const enviarCodigo = async () => {
    if (enviando) return;
    setEnviando(true);
    try {
      await solicitarCodigoRecuperacion(correo.trim().toLowerCase());
      setErrorCodigo(undefined);
      setPaso("codigo");
      toast.success("Si el correo está registrado, te enviamos un código.");
    } catch (e) {
      // 429 (demasiadas solicitudes) y fallo de conexión: el interceptor ya
      // extrajo el texto; no se avanza de paso.
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  // Los pasos 2 y 3 son los MISMOS componentes del "¿Olvidaste tu
  // contraseña?"; aquí solo se pegan las llamadas a la API con el correo
  // de la sesión (no se pide ni se puede editar).
  const reenviarCodigo = async () => {
    await solicitarCodigoRecuperacion(correo.trim().toLowerCase());
  };

  const verificarCodigo = async (codigoCompleto: string) => {
    try {
      const res = await verificarCodigoRecuperacion(
        correo.trim().toLowerCase(),
        codigoCompleto,
      );
      if (res.valido !== true) {
        // Defensa: el contrato manda 400, pero un 200 con valido=false se
        // trata igual que código inválido y no se avanza.
        throw new Error("El código es incorrecto o venció.");
      }
      setErrorCodigo(undefined);
      setPaso("password");
    } catch (e) {
      const err = e as ApiErrorConEstado;
      if (err.message === "El código es incorrecto o venció.") {
        throw err; // el paso del código lo pinta bajo las casillas
      }
      // 429 y fallo de conexión: se avisa y se vuelve al aviso, porque el
      // código no se pudo validar.
      toast.error(err.message);
      if (err.status === 429) setPaso("confirmar");
    }
  };

  const guardarPassword = async (nueva: string) => {
    try {
      await restablecerContrasena(
        correo.trim().toLowerCase(),
        code.join(""),
        nueva,
      );
      onCambioExitoso();
    } catch (e) {
      const err = e as ApiErrorConEstado;
      if (err.message === "El código es incorrecto o venció.") {
        // Caducó o quedó invalidado entre pasos: se pide de nuevo.
        setErrorCodigo(err.message);
        setPaso("codigo");
        return;
      }
      if (err.status === 429) {
        // Demasiadas solicitudes: se reinicia el flujo desde el aviso.
        toast.error(err.message);
        setCode(["", "", "", "", "", ""]);
        setPaso("confirmar");
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
      className={AUTH_GLASS_OVERLAY}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18 }}
        className={`relative my-auto ${AUTH_GLASS_CARD} w-full max-w-sm p-7`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar cambio de contraseña"
          className={`absolute top-4 right-4 ${AUTH_GLASS_BUTTON_SECONDARY}`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── Paso 1: Confirmación ── */}
        {paso === "confirmar" && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <ShieldQuestion className="w-7 h-7 text-primary" />
              </div>
              <h2
                className="text-xl font-bold text-foreground dark:text-white"
                style={{ fontFamily: SERIF }}
              >
                ¿Estás seguro de cambiar la contraseña?
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Te enviaremos un código de verificación a{" "}
                <strong className="text-foreground">{correoEnmascarado}</strong>.
              </p>
            </div>
            <button
              onClick={() => void enviarCodigo()}
              disabled={enviando}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer disabled:opacity-60 mb-3"
            >
              {enviando ? "Enviando..." : "Sí, enviar código"}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              Cancelar
            </button>
          </>
        )}

        {/* ── Paso 2: Código (compartido con la recuperación) ── */}
        {paso === "codigo" && (
          <PasoCodigoVerificacion
            codigo={code}
            onCodigoChange={setCode}
            correoDestino={correo}
            onVerificar={verificarCodigo}
            onReenviar={reenviarCodigo}
            errorInicial={errorCodigo}
          />
        )}

        {/* ── Paso 3: Nueva contraseña (compartida con la recuperación) ── */}
        {paso === "password" && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <h2
                className="text-xl font-bold text-foreground dark:text-white"
                style={{ fontFamily: SERIF }}
              >
                Nueva contraseña
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Elige una contraseña segura para tu cuenta.
              </p>
            </div>
            <PasoNuevaContrasena
              onGuardar={guardarPassword}
              labelConfirmar="Confirmar nueva contraseña"
            />
          </>
        )}
      </motion.div>
    </div>
  );
}
