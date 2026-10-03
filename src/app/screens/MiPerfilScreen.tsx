import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { User, Mail, Phone, ArrowLeft, Pencil, X, Check, LogOut, FileText, ShieldCheck, Briefcase, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { type Contratacion, ordenarContrataciones } from "./GestionEmpleadosScreen";
import { DOC_TIPOS } from "./GestionUsuariosScreen";
import { filtrarCorreo, validarCorreo, validarTelefono, PasswordField, validarContrasena, faltantesContrasena, RequisitosContrasena, MensajeError } from "../components/campo";

const SERIF = "var(--font-titulo)";

interface Props {
  navigate: (s: string) => void;
  userRole: string;
  onLogout: () => void;
  isStaff: boolean;
  loggedInUser: {
    id: string;
    nombre: string;
    iniciales: string;
    avatarColor: string;
    correo: string;
    telefono: string;
    tipoDocumento: string;
    numeroDocumento: string;
    contrasena?: string;
  } | null;
  loggedInRoleName: string;
  adminHomeScreen: string;
  onUpdateUser: (id: string, data: { correo: string; telefono: string }) => void;
  /** Escribe la contraseña nueva en la lista `usuarios` (en memoria).
   *  Devuelve false si no se pudo guardar: en ese caso NO se cierra ni el
   *  modal ni la sesión. */
  onUpdatePassword?: (id: string, nuevaContrasena: string) => boolean;
  /** Se llama DESPUÉS de guardar con éxito: muestra el toast, cierra la sesión
   *  (misma función que el botón "Cerrar sesión") y deja el correo escrito en
   *  la pantalla de Iniciar sesión. */
  onPasswordSaved?: (correo: string) => void;
  inStore?: boolean;
  // Historial de contrataciones del empleado de la sesión, en solo lectura.
  // Lo resuelve App.tsx cruzando el correo de `loggedInUser` contra `empleados`.
  contrataciones?: Contratacion[];
  // Nombre del rol asociado a cada contratación (mismo criterio que el detalle
  // en la pantalla de Empleados). Sin esto el id crudo se vería en pantalla.
  rolNombreDe?: (rolId: string) => string;
}

export function MiPerfilScreen({ navigate, userRole, onLogout, isStaff, loggedInUser, loggedInRoleName, adminHomeScreen, onUpdateUser, onUpdatePassword, onPasswordSaved, inStore = false, contrataciones, rolNombreDe }: Props) {
  const [editando, setEditando] = useState(false);
  const [correo,   setCorreo]   = useState(loggedInUser?.correo   ?? "");
  const [telefono, setTelefono] = useState(loggedInUser?.telefono ?? "");
  const [guardado, setGuardado] = useState({ correo: loggedInUser?.correo ?? "", telefono: loggedInUser?.telefono ?? "" });
  const [errores,  setErrores]  = useState<{ correo?: string; telefono?: string }>({});
  const [showCambiarContrasena, setShowCambiarContrasena] = useState(false);

  // Sync when logged-in user changes (e.g. after login switch)
  useEffect(() => {
    if (loggedInUser) {
      setCorreo(loggedInUser.correo);
      setTelefono(loggedInUser.telefono);
      setGuardado({ correo: loggedInUser.correo, telefono: loggedInUser.telefono });
    }
  }, [loggedInUser?.id]);

  const iCls = (err?: string) =>
    `w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
      err ? "border-red-400 bg-red-50/30" : "bg-muted border-border"
    }`;

  // Historial del usuario de la sesión, de la más reciente a la más antigua.
  const misContrataciones = useMemo(
    () => ordenarContrataciones(contrataciones ?? []),
    [contrataciones],
  );

  const handleEditar = () => {
    setCorreo(guardado.correo);
    setTelefono(guardado.telefono);
    setErrores({});
    setEditando(true);
  };

  const handleCancelar = () => {
    setEditando(false);
    setErrores({});
  };

  const handleGuardar = () => {
    const ec = validarCorreo(correo);
    const et = validarTelefono(telefono);
    if (ec || et) { setErrores({ correo: ec ?? undefined, telefono: et ?? undefined }); return; }
    const newCorreo   = correo.trim().toLowerCase();
    const newTelefono = telefono.trim();
    setGuardado({ correo: newCorreo, telefono: newTelefono });
    if (loggedInUser) {
      onUpdateUser(loggedInUser.id, { correo: newCorreo, telefono: newTelefono });
    }
    setEditando(false);
    setErrores({});
    toast.success("Perfil actualizado correctamente", { description: "Los cambios han sido guardados." });
  };

  const nombre    = loggedInUser?.nombre    ?? "—";
  const iniciales = loggedInUser?.iniciales ?? "?";
  const avatarBg  = loggedInUser?.avatarColor ?? "bg-primary";
  const tipoDocumento = DOC_TIPOS.find(t => t.code === loggedInUser?.tipoDocumento)?.label
    ?? loggedInUser?.tipoDocumento
    ?? "—";

  const rolColor = loggedInRoleName === "Administrador"
    ? "bg-primary/10 text-primary"
    : "bg-blue-100 text-blue-800";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: SERIF }}>
          Mi Perfil
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Consulta y actualiza tu información de contacto
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-card border border-border rounded-2xl overflow-hidden"
      >
        {/* Avatar + nombre + rol */}
        <div className="flex items-center gap-5 px-6 py-6 border-b border-border bg-muted/30">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-sm ${avatarBg}`}>
            {iniciales}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate" style={{ fontFamily: SERIF }}>
              {nombre}
            </h2>
            <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${rolColor}`}>
              {loggedInRoleName}
            </span>
          </div>
          {!editando && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
              <button
                onClick={() => setShowCambiarContrasena(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-border bg-white dark:bg-card text-foreground text-sm font-semibold rounded-xl hover:bg-muted active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <KeyRound className="w-4 h-4" />
                Cambiar contraseña
              </button>
              <button
                onClick={handleEditar}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Pencil className="w-4 h-4" />
                Editar
              </button>
            </div>
          )}
          {editando && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
              <button
                disabled
                title="Termina de editar tu perfil primero"
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-border bg-white dark:bg-card text-foreground text-sm font-semibold rounded-xl opacity-60 cursor-not-allowed shrink-0"
              >
                <KeyRound className="w-4 h-4" />
                Cambiar contraseña
              </button>
            </div>
          )}
        </div>

        {/* Datos */}
        <div className="px-6 py-6 space-y-5">
          {/* Documento — solo lectura */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                <FileText className="w-3.5 h-3.5" />
                Tipo de documento
              </label>
              <input
                type="text"
                value={tipoDocumento}
                readOnly
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/40 text-sm font-medium text-muted-foreground focus:outline-none select-none"
              />
              <p className="text-[11px] text-muted-foreground mt-1 ml-0.5">Este campo no es editable</p>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                <FileText className="w-3.5 h-3.5" />
                Número de documento
              </label>
              <input
                type="text"
                value={loggedInUser?.numeroDocumento ?? "—"}
                readOnly
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/40 text-sm font-medium text-muted-foreground focus:outline-none select-none"
              />
              <p className="text-[11px] text-muted-foreground mt-1 ml-0.5">Este campo no es editable</p>
            </div>
          </div>

          {/* Nombre — solo lectura */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
              <User className="w-3.5 h-3.5" />
              Nombre completo
            </label>
            <div className="px-3 py-2.5 rounded-xl border border-border bg-muted/40 text-sm font-medium text-muted-foreground select-none">
              {nombre}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 ml-0.5">Este campo no es editable</p>
          </div>

          {/* Correo */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
              <Mail className="w-3.5 h-3.5" />
              Correo electrónico
            </label>
            {editando ? (
              <>
                <input
                  type="email"
                  value={correo}
                   onChange={e => { const value = filtrarCorreo(e.target.value); setCorreo(value); setErrores(p => ({ ...p, correo: validarCorreo(value) ?? undefined })); }}
                  placeholder="correo@ejemplo.com"
                  className={iCls(errores.correo)}
                  autoFocus
                />
                {errores.correo && <p className="text-xs text-red-500 mt-1 ml-0.5 leading-tight">{errores.correo}</p>}
              </>
            ) : (
              <div className="px-3 py-2.5 rounded-xl border border-border bg-muted text-sm text-foreground font-medium">
                {guardado.correo}
              </div>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
              <Phone className="w-3.5 h-3.5" />
              Número de teléfono
            </label>
            {editando ? (
              <>
                <input
                  type="tel"
                  value={telefono}
                  onChange={e => { setTelefono(e.target.value); if (errores.telefono) setErrores(p => ({ ...p, telefono: undefined })); }}
                  placeholder="3001234567"
                  className={iCls(errores.telefono)}
                />
                {errores.telefono && <p className="text-xs text-red-500 mt-1 ml-0.5 leading-tight">{errores.telefono}</p>}
              </>
            ) : (
              <div className="px-3 py-2.5 rounded-xl border border-border bg-muted text-sm text-foreground font-medium">
                {guardado.telefono}
              </div>
            )}
          </div>

          {/* Historial de contrataciones (solo lectura). Aparece solo si el
              usuario de la sesión es además un empleado: el resto de perfiles
              no tienen contrataciones que mostrar. */}
          {contrataciones && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                <Briefcase className="w-3.5 h-3.5" />
                Historial de contrataciones
              </label>
              {misContrataciones.length === 0 ? (
                <div className="px-3 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground">
                  Sin contrataciones registradas
                </div>
              ) : (
                <div className="space-y-2">
                  {misContrataciones.map((c, i) => (
                    <div key={c.id}
                      className={`rounded-xl border px-3 py-2.5 ${i === 0 ? "border-primary/30 bg-primary/5" : "border-border bg-muted/40"}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">{c.cargo}</span>
                        {i === 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide shrink-0">
                            Actual
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {rolNombreDe ? rolNombreDe(c.rolId) : c.rolId}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {c.fechaInicio} → {c.fechaFinal || "Continúa activo"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-border flex flex-col sm:flex-row gap-3">
          {editando ? (
            <>
              <button
                onClick={handleCancelar}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 cursor-pointer transition-all"
              >
                <Check className="w-4 h-4" />
                Guardar cambios
              </button>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => navigate(inStore ? "landing" : "dashboard")}
                className="flex items-center gap-2 px-5 py-2.5 bg-muted text-foreground rounded-xl text-sm font-semibold hover:bg-border cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al inicio
              </button>
              {inStore && isStaff && (
              <button
                onClick={() => navigate(adminHomeScreen)}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-semibold hover:bg-primary/20 cursor-pointer transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                Ir a Administración
              </button>
              )}
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 cursor-pointer transition-colors sm:ml-auto"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {showCambiarContrasena && loggedInUser && (
        <ChangePasswordModal
          correo={loggedInUser.correo}
          contrasenaActual={loggedInUser.contrasena ?? "123456"}
          onClose={() => setShowCambiarContrasena(false)}
          onSave={(nueva) => {
            // El orden importa: primero se escribe (si falla, aquí NO se cierra
            // nada y el modal sigue abierto con la sesión intacta), y solo
            // después se cierra el modal y se cierra la sesión.
            const ok = onUpdatePassword?.(loggedInUser.id, nueva) ?? false;
            if (!ok) {
              toast.error("No se pudo actualizar la contraseña, inténtalo de nuevo");
              return false;
            }
            setShowCambiarContrasena(false);
            onPasswordSaved?.(loggedInUser.correo);
            return true;
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────── CAMBIAR CONTRASEÑA ───────────────────────────
// El mismo modal de "Recuperar / Restablecer contraseña" (código por correo,
// 6 dígitos, luego nueva contraseña), aplicado al perfil actual. Reutiliza
// PasswordField, validarContrasena, RequisitosContrasena y MensajeError, y al
// guardar cierra la sesión con la misma función del botón "Cerrar sesión".

function ChangePasswordModal({
  correo,
  contrasenaActual,
  onClose,
  onSave,
}: {
  correo: string;
  contrasenaActual: string;
  onClose: () => void;
  /** Guarda y cierra. Devuelve false si no se pudo guardar (entonces el modal
   *  y la sesión siguen donde estaban). */
  onSave: (nueva: string) => boolean;
}) {
  const [step, setStep] = useState<"send" | "code" | "password">("send");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [onClose]);

  const startCooldown = () => {
    setResendCooldown(30);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const [local, domain] = correo.split("@");
  const correoEnmascarado = `${local[0] ?? ""}•••${domain ? `@${domain}` : ""}`;

  const sendCode = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("code");
      toast.success("Código enviado a " + correo);
      startCooldown();
    }, 1000);
  };

  const resendCode = () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Código reenviado a " + correo);
      startCooldown();
    }, 900);
  };

  const verifyCode = () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      setErrores({ code: "Código incorrecto" });
      return;
    }
    setErrores({});
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("password");
    }, 900);
  };

  // ── Validación en tiempo real ──────────────────────────────────────
  // Todo se deriva del valor mientras se escribe: no depende de un estado que
  // solo se rellena al pulsar el botón, así que los mensajes (y los bordes)
  // aparecen desde la primera tecla.
  const passwordError = newPass.length > 0 ? validarContrasena(newPass) : null;
  const confirmVacio = confirm.length === 0;
  const confirmCoincide = !confirmVacio && confirm === newPass;
  const confirmError = !confirmVacio && !confirmCoincide;
  const mismoQueActual = newPass.length > 0 && newPass === contrasenaActual;
  const todoValido =
    validarContrasena(newPass) === null && confirmCoincide && !mismoQueActual;

  // Es lo que se pinta SIEMPRE debajo del botón mientras esté deshabilitado:
  // un botón apagado nunca queda sin explicación.
  const faltan: string[] = [];
  if (newPass.length === 0) faltan.push("escribir la contraseña");
  else faltan.push(...faltantesContrasena(newPass));
  if (mismoQueActual) faltan.push("usar una contraseña distinta a la actual");
  if (confirmVacio) faltan.push("confirmar la contraseña");
  else if (confirmError) faltan.push("que las contraseñas coincidan");

  // Borde del campo: rojo si tiene error, verde si ya es válido, neutro vacío.
  const clsCampo = (estado: "ok" | "err" | "neutro") =>
    `w-full px-4 py-2 bg-muted rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${
      estado === "err"
        ? "border-red-400 bg-red-50/30"
        : estado === "ok"
          ? "border-emerald-500"
          : "border-border"
    }`;
  const estadoNew: "ok" | "err" | "neutro" =
    newPass.length === 0 ? "neutro" : passwordError || mismoQueActual ? "err" : "ok";
  const estadoConfirm: "ok" | "err" | "neutro" =
    confirmVacio ? "neutro" : confirmError ? "err" : "ok";

  const handleCodeInput = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[i] = val;
    setCode(next);
    if (errores.code) setErrores((p) => ({ ...p, code: "" }));
    if (val && i < 5) document.getElementById(`chg-otp-${i + 1}`)?.focus();
  };

  const handleCodeKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      document.getElementById(`chg-otp-${i - 1}`)?.focus();
    }
  };

  const guardar = () => {
    // El botón ya viene deshabilitado si algo falta; esta guarda es la que
    // cubre el Enter y cualquier intento de envío indirecto.
    if (loading || !todoValido) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // `onSave` hace el trabajo real (escribir en `usuarios`, cerrar sesión y
      // navegar). Si devuelve false NO se cierra nada: el modal y la sesión
      // siguen como estaban y el error ya lo avisó el propio `onSave`.
      onSave(newPass);
    }, 900);
  };

  /** Enter envía, pero solo cuando todo es válido (ver la guarda de arriba). */
  const enviarConEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") guardar();
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

        {step === "send" && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Cambiar contraseña</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Te enviaremos un código de 6 dígitos a {correoEnmascarado}
              </p>
            </div>
            <button
              onClick={sendCode}
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? "Enviando..." : "Enviar código"}
            </button>
          </>
        )}

        {step === "code" && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Código de verificación</h2>
              <p className="text-sm text-muted-foreground mt-1">Ingresa el código de 6 dígitos enviado a tu correo</p>
            </div>
            <div className="flex justify-center gap-2 mb-4">
              {code.map((digit, i) => (
                <input
                  key={i}
                  id={`chg-otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKey(i, e)}
                  className="w-10 h-12 text-center text-lg font-bold rounded-xl border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                />
              ))}
            </div>
            {errores.code && <MensajeError err={errores.code} />}
            <p className="text-center text-sm text-muted-foreground mb-4">
              ¿No lo recibiste?{" "}
              {resendCooldown > 0 ? (
                <span className="text-muted-foreground">Reenviar en {resendCooldown}s</span>
              ) : (
                <button onClick={resendCode} className="text-primary font-semibold hover:underline cursor-pointer">Reenviar código</button>
              )}
            </p>
            <button
              onClick={verifyCode}
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? "Verificando..." : "Verificar"}
            </button>
          </>
        )}

        {step === "password" && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: SERIF }}>Nueva contraseña</h2>
              <p className="text-sm text-muted-foreground mt-1">Elige una contraseña segura para tu cuenta</p>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Nueva contraseña</label>
                <PasswordField
                  value={newPass}
                  onChange={setNewPass}
                  onKeyDown={enviarConEnter}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  cls={clsCampo(estadoNew)}
                />
                {/* Requisitos que se marcan mientras se escribe. */}
                <RequisitosContrasena valor={newPass} />
                <MensajeError err={passwordError ?? undefined} />
                {mismoQueActual && (
                  <MensajeError err="La nueva contraseña debe ser diferente a la actual" />
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Confirmar contraseña</label>
                <PasswordField
                  value={confirm}
                  onChange={setConfirm}
                  onKeyDown={enviarConEnter}
                  placeholder="Repite tu contraseña"
                  autoComplete="new-password"
                  cls={clsCampo(estadoConfirm)}
                />
                {/* En rojo en cuanto difiere; en verde con check cuando coinciden. */}
                {confirmError && <MensajeError err="Las contraseñas no coinciden" />}
                {confirmCoincide && (
                  <p className="text-xs text-emerald-600 mt-1 ml-0.5 leading-tight flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    Las contraseñas coinciden
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={guardar}
              disabled={loading || !todoValido}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Guardar contraseña"}
            </button>
            {/* Nunca un botón deshabilitado sin decir qué falta. */}
            {!todoValido && (
              <p className="text-xs text-muted-foreground mt-2 leading-tight">
                Para guardar falta: {faltan.join(", ")}.
              </p>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
