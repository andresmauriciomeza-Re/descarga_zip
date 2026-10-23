import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Lock, X } from "lucide-react";
import {
  activarCuenta,
  obtenerActivacion,
} from "@/shared/services/authService";
import type { ActivacionDatos } from "@/types/api";
import {
  AUTH_GLASS_BUTTON_SECONDARY,
  AUTH_GLASS_CARD,
} from "@/shared/styles/authGlass";
import { PasoNuevaContrasena } from "@/shared/components/PasoNuevaContrasena";

const SERIF = "var(--font-titulo)";

/**
 * Modal "Crea tu contraseña" del enlace de invitación de empleado
 * (?activar=<token>). Reutiliza el MISMO paso de contraseña del "¿Olvidaste tu
 * contraseña?" y del "Cambiar contraseña" (mínimo 8, mayúscula, minúscula,
 * número y sin espacios), con el título y el saludo del alta de empleado.
 *
 * El token ya no vive en la URL (App lo limpió al leerlo); aquí se valida con
 * GET /auth/activacion/:token para mostrar el nombre y se guarda con
 * POST /auth/activacion. Enlace vencido o ya usado = mensaje claro y salida al
 * inicio de sesión.
 */
export function ActivarCuentaModal({
  token,
  onActivada,
  onCerrar,
  onIrALogin,
}: {
  /** Token de un solo uso que venía en ?activar=. */
  token: string;
  /** La contraseña quedó guardada: recibe el correo para precargar el login. */
  onActivada: (correo: string) => void;
  /** Cierra el modal sin más (X o Escape). */
  onCerrar: () => void;
  /** Salida explícita al inicio de sesión (enlace inválido o "Ir a iniciar sesión"). */
  onIrALogin: () => void;
}) {
  const [datos, setDatos] = useState<ActivacionDatos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      try {
        const respuesta = await obtenerActivacion(token);
        if (!cancelado) setDatos(respuesta);
      } catch (e) {
        if (!cancelado) setError((e as Error).message);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [token]);

  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [onCerrar]);

  const guardar = async (nueva: string) => {
    const { correo } = await activarCuenta(token, nueva);
    onActivada(correo);
  };

  return (
    // Overlay propio (no el compartido): z-[60] para quedar POR ENCIMA del
    // navbar (PublicNav/AdminTopBar usan z-50), centrado en ambos ejes, con
    // margen arriba/abajo (p-4 / p-6) y scroll interno en pantallas bajas.
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/30 backdrop-blur-sm p-4 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCerrar();
      }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18 }}
        className={`relative ${AUTH_GLASS_CARD} w-full max-w-sm p-7 max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto`}
      >
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar creación de contraseña"
          className={`absolute top-4 right-4 ${AUTH_GLASS_BUTTON_SECONDARY}`}
        >
          <X className="w-5 h-5" />
        </button>

        {cargando && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Validando el enlace…
          </p>
        )}

        {!cargando && error && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <h2
                className="text-xl font-bold text-foreground dark:text-white"
                style={{ fontFamily: SERIF }}
              >
                No pudimos abrir el enlace
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <button
              onClick={onIrALogin}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
            >
              Ir a iniciar sesión
            </button>
          </>
        )}

        {!cargando && !error && datos && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <h2
                className="text-xl font-bold text-foreground dark:text-white"
                style={{ fontFamily: SERIF }}
              >
                Crea tu contraseña
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Hola, <strong className="text-foreground">{datos.nombre}</strong>. Crea tu contraseña para activar tu cuenta
                {datos.correoEnmascarado ? (
                  <>
                    {" "}(<strong className="text-foreground">{datos.correoEnmascarado}</strong>)
                  </>
                ) : null}
                .
              </p>
            </div>
            <PasoNuevaContrasena
              onGuardar={guardar}
              labelConfirmar="Confirmar contraseña"
              labelBoton="Crear contraseña"
              labelBotonCargando="Creando..."
            />
          </>
        )}
      </motion.div>
    </div>
  );
}
