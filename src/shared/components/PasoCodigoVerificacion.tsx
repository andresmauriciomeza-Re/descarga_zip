import { useEffect, useState } from "react";
import { CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { MensajeError } from "@/shared/components/campo";
import { CodigoVerificacionInput } from "@/shared/components/CodigoVerificacionInput";

const SERIF = "var(--font-titulo)";

/**
 * Paso "código" del flujo de contraseña (vidrio esmerilado). Es el MISMO
 * paso para el "¿Olvidaste tu contraseña?" del login y para el "Cambiar
 * contraseña" del perfil: solo cambia quién recibe las llamadas y si se
 * muestra el botón de volver al correo.
 *
 * El código vive en el padre (p. ej. para restablecer con el mismo código
 * en el paso siguiente); aquí se controla, se validan casillas incompletas
 * y se manejan el contador de reenvío y el spinner.
 */
export function PasoCodigoVerificacion({
  codigo,
  onCodigoChange,
  correoDestino,
  onVerificar,
  onReenviar,
  onVolverOtroCorreo,
  errorInicial,
  idPrefijo = "otp",
}: {
  codigo: string[];
  onCodigoChange: (siguiente: string[]) => void;
  /** Correo a mostrar en el texto (en el perfil es el de la sesión). */
  correoDestino: string;
  /** Verifica contra el backend. Si lanza, el mensaje se pinta bajo las casillas. */
  onVerificar: (codigo: string) => Promise<void>;
  /** Reenvía el código. Si lanza, el mensaje va como toast de error. */
  onReenviar: () => Promise<void>;
  /** Solo el flujo del login: "← Ingresar otro correo". */
  onVolverOtroCorreo?: () => void;
  /** Error que se muestra al montar (p. ej. el código caducó al guardar). */
  errorInicial?: string;
  idPrefijo?: string;
}) {
  const [errorCodigo, setErrorCodigo] = useState<string | undefined>(
    errorInicial,
  );
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [cooldown, setCooldown] = useState(30);

  // El contador arranca al montar: quien llama cambió de paso recién porque
  // el código salió recién (envío inicial o reenvío).
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const cambiarCodigo = (siguiente: string[]) => {
    onCodigoChange(siguiente);
    if (errorCodigo) setErrorCodigo(undefined);
  };

  const verificar = async () => {
    if (verificando) return;
    const completo = codigo.join("");
    if (completo.length < 6) {
      setErrorCodigo("Ingresa el código completo");
      const primeraVacia = codigo.findIndex((c) => !c);
      document
        .getElementById(`${idPrefijo}-${primeraVacia < 0 ? 5 : primeraVacia}`)
        ?.focus();
      return;
    }
    setErrorCodigo(undefined);
    setVerificando(true);
    try {
      await onVerificar(completo);
      // Éxito: quien llama cambia de paso (este componente se desmonta).
    } catch (e) {
      setErrorCodigo((e as Error).message);
    } finally {
      setVerificando(false);
    }
  };

  const reenviar = async () => {
    if (cooldown > 0 || reenviando) return;
    setReenviando(true);
    try {
      await onReenviar();
      toast.success("Si el correo está registrado, te enviamos un código.");
      setCooldown(30);
    } catch (e) {
      // El cooldown solo se reinicia si el backend aceptó la solicitud.
      toast.error((e as Error).message);
    } finally {
      setReenviando(false);
    }
  };

  return (
    <>
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-emerald-600" />
        </div>
        <h2
          className="text-xl font-bold text-foreground dark:text-white"
          style={{ fontFamily: SERIF }}
        >
          Código enviado
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ingresa el código de 6 dígitos enviado a{" "}
          <strong className="text-foreground">{correoDestino}</strong>
        </p>
      </div>
      <div className="mb-6">
        <CodigoVerificacionInput
          valor={codigo}
          onChange={cambiarCodigo}
          tieneError={Boolean(errorCodigo)}
          idPrefijo={idPrefijo}
          describedBy="code-error"
          onCodigoIncompleto={() => setErrorCodigo("Ingresa el código completo")}
        />
      </div>
      <div className="-mt-4 mb-4">
        <MensajeError id="code-error" err={errorCodigo} />
      </div>
      <button
        onClick={() => void verificar()}
        disabled={verificando}
        className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 mb-3"
      >
        {verificando ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : null}
        {verificando ? "Verificando..." : "Verificar código"}
      </button>
      <button
        onClick={() => void reenviar()}
        disabled={cooldown > 0 || reenviando}
        className="w-full py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-60 mb-0.5"
      >
        {cooldown > 0
          ? `Reenviar en 00:${String(cooldown).padStart(2, "0")}`
          : "Reenviar código"}
      </button>
      {onVolverOtroCorreo && (
        <button
          onClick={onVolverOtroCorreo}
          className="w-full py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          ← Ingresar otro correo
        </button>
      )}
    </>
  );
}
