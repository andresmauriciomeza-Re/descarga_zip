import type { Usuario } from "@/features/users/utils/users";
import type { ApiErrorConEstado, UsuarioApi } from "@/types/api";
import type { Rol } from "@/features/roles/utils/roles";
import type { Screen } from "@/shared/utils/screen";
import { useRef, useState } from "react";
import { reenviarVerificacion } from "@/shared/services/verificationService";
import { toast } from "sonner";
import { useValidacionFormulario } from "@/shared/hooks/useFormValidation";
import { filtrarCorreo, MensajeError, PasswordField, validarCorreo } from "@/shared/components/FormInputs";
import { borrarToken, login as loginApi } from "@/shared/services/authService";
import { AnimatePresence, motion } from "motion/react";
import { AUTH_GLASS_BUTTON_SECONDARY, AUTH_GLASS_CARD, authInputCls } from "@/shared/styles/authGlass";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Logo } from "@/shared/components/Logo";
import { SERIF } from "@/shared/utils/fonts";
import { PrimaryBtn } from "@/shared/components/buttons/PrimaryButton";
import { AVATAR_PALETTE } from "@/shared/utils/avatar";
import { normalizarNombreRol } from "@/shared/utils/roleName";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { ForgotPasswordModal } from "@/features/auth/components/ForgotPasswordModal";
import { AceptacionTerminos } from "@/features/auth/components/AcceptTerms";

/** Puente API → estado local: arma la ficha `Usuario` que conoce el panel a
    partir del usuario que devolvió el backend y el rol local equivalente. */
export const construirUsuarioLocal = (usuarioApi: UsuarioApi, rolLocal: Rol): Usuario => {
  const partes = usuarioApi.nombre.trim().split(/\s+/);
  const iniciales = (
    partes.length > 1
      ? (partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")
      : (partes[0] ?? "").slice(0, 2)
  ).toUpperCase();
  return {
    id: String(usuarioApi.id),
    nombre: usuarioApi.nombre,
    iniciales,
    avatarColor: AVATAR_PALETTE[0],
    correo: usuarioApi.correo,
    telefono: usuarioApi.telefono ?? "",
    esSuperAdmin: usuarioApi.esSuperAdmin === true,
    rolCuentaApi: usuarioApi.rol,
    tipoDocumento: usuarioApi.tipoDocumento ?? (usuarioApi.documento ? "CC" : ""),
    numeroDocumento: usuarioApi.numeroDocumento ?? usuarioApi.documento ?? "",
    rolIds: [rolLocal.id],
    rolId: rolLocal.id,
    activo: true,
  };
};

export function LoginScreen({
  navigate,
  onLogin,
  usuarios,
  roles,
  onUsuarioNuevo,
  darkMode,
  loginNotice,
  initialEmail,
  mensajeExito,
}: {
  navigate: (s: Screen) => void;
  // Devuelve { ok, mensaje }: ok=false es la señal para que esta pantalla muestre
  // el motivo y NO considere la sesión iniciada (p. ej. sin roles activos).
  onLogin: (user: Usuario) => { ok: boolean; mensaje?: string };
  usuarios: Usuario[];
  /** Roles locales: con ellos el puente traduce `usuarios.rol` del API al id
      de rol del panel. */
  roles: Rol[];
  /** Registra en el estado `usuarios` la ficha armada con datos del API. */
  onUsuarioNuevo: (user: Usuario) => void;
  darkMode: boolean;
  loginNotice?: boolean;
  /** Correo que queda escrito al llegar desde el cambio de contraseña:
   *  la sesión acaba de cerrarse y así el usuario solo escribe la clave. */
  initialEmail?: string;
  /** Aviso verde bajo el formulario (p. ej. "Contraseña creada. Ya puedes
   *  iniciar sesión." al llegar de la invitación de empleado). */
  mensajeExito?: string;
}) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [terminosAceptados, setTerminosAceptados] = useState(false);
  const terminosRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    terminos?: string;
  }>({});
  // Motivo por el que App rechazó el login (sin roles activos, sin pantallas…):
  // se muestra como mensaje en la propia pantalla en lugar de un toast de éxito.
  const [rechazo, setRechazo] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  // Cuenta pendiente (403 "Tu cuenta aún no está activada"): se ofrece
  // "Reenviar correo de confirmación", con 60 s de espera entre envíos (el
  // backend aplica el mismo intervalo).
  const [cuentaPendiente, setCuentaPendiente] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [reenvioEnEspera, setReenvioEnEspera] = useState(false);

  const reenviarConfirmacion = async () => {
    if (reenviando || reenvioEnEspera) return;
    setReenviando(true);
    try {
      const { mensaje } = await reenviarVerificacion(email.trim().toLowerCase());
      toast.success(mensaje);
      setReenvioEnEspera(true);
      window.setTimeout(() => setReenvioEnEspera(false), 60_000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo reenviar el correo.");
    } finally {
      setReenviando(false);
    }
  };

  // Trampa de Tab, foco al primer inválido y aria (lógica compartida).
  const validacion = useValidacionFormulario(["email", "password"]);

  const validate = () => {
    const e: typeof errors = {};
    e.email = validarCorreo(email) ?? undefined;
    e.password = password ? undefined : "La contraseña es obligatoria";
    e.terminos = terminosAceptados ? undefined : "Debes aceptar los términos y condiciones";
    setErrors(e);
    if (e.email || e.password) validacion.enfocarPrimero(e);
    else if (e.terminos) terminosRef.current?.focus();
    return !e.email && !e.password && !e.terminos;
  };

  const handleLogin = async () => {
    if (!validate()) {
      return;
    }
    setRechazo(null);
    setCuentaPendiente(false);
    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const { usuario: usuarioApi } = await loginApi(trimmedEmail, password);

      // Puente de identidad local; roles y permisos de autorización vienen del API.
      const correoApi = (usuarioApi.correo || trimmedEmail).trim().toLowerCase();
      const usuarioLocal = usuarios.find(
        u => u.correo.trim().toLowerCase() === correoApi,
      );
      const user = usuarioLocal
        ? {
          ...usuarioLocal,
          esSuperAdmin: usuarioApi.esSuperAdmin === true,
          rolCuentaApi: usuarioApi.rol,
          rolesSesionApi: usuarioApi.roles ?? [],
        }
        : undefined;

      if (user && !user.activo) {
        borrarToken();
        setErrors({
          email: "Credenciales incorrectas",
          password: "Verifica tu correo y contraseña",
        });
        toast.error("Tu cuenta está inactiva. Contacta al administrador.");
        return;
      }

      let cuenta: Usuario;
      if (user) {
        cuenta = user;
      } else {
        const rolesApi = usuarioApi.roles ?? [];
        const rolPrincipalApi = rolesApi.find(r => normalizarNombreRol(r.nombre) === normalizarNombreRol(usuarioApi.rol ?? "")) ?? rolesApi[0];
        const rolLocal = roles.find(r => normalizarNombreRol(r.nombre) === normalizarNombreRol(rolPrincipalApi?.nombre ?? usuarioApi.rol ?? ""));
        if (!rolLocal) {
          borrarToken();
          toast.error("Tu cuenta no tiene un rol configurado en el panel.");
          return;
        }
        cuenta = { ...construirUsuarioLocal(usuarioApi, rolLocal), rolesSesionApi: rolesApi };
        onUsuarioNuevo(cuenta);
      }

      // Navigation and session state are handled by App.tsx.
      const respuesta = onLogin(cuenta);
      if (respuesta && respuesta.ok === false) {
        // El login fue RECHAZADO en App: muestra el motivo y no navega.
        borrarToken();
        const mensaje = respuesta.mensaje ?? "Tu cuenta no tiene roles activos. Contacta al administrador.";
        setRechazo(mensaje);
        toast.error(mensaje);
        return;
      }
      setRechazo(null);
      const firstName = cuenta.nombre.split(" ")[0];
      toast.success(`¡Bienvenid${firstName.endsWith("a") ? "a" : "o"}, ${firstName}!`, {
        description: "Has ingresado correctamente.",
      });
    } catch (err) {
      const status = (err as ApiErrorConEstado).status;
      const mensaje = err instanceof Error ? err.message : "No se pudo conectar con el servidor.";
      if (status === 401) {
        setErrors({
          email: "Credenciales incorrectas",
          password: "Verifica tu correo y contraseña",
        });
      } else if (status === 403) {
        // Cuenta sin activar (empleado invitado o cliente que aún no confirma
        // su correo): el backend manda el motivo ("Tu cuenta aún no está
        // activada. Revisa tu correo.") y se ofrece reenviar la confirmación.
        setRechazo(mensaje);
        setCuentaPendiente(true);
      } else {
        // 429 (mensaje del backend) y fallo de conexión: el interceptor ya
        // extrajo el texto que corresponde.
        toast.error(mensaje);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      contentClassName="items-start justify-center sm:justify-end px-4 py-6 lg:px-8 lg:pr-16 xl:pr-12"
      darkMode={darkMode}
      overlay={
        <AnimatePresence>
          {showForgot && (
            <ForgotPasswordModal
              onClose={() => setShowForgot(false)}
            />
          )}
        </AnimatePresence>
      }
    >
      {/* Contenido del login. El fondo por tema, el velo de movil y el
          `z-index` de esta capa viven en `AuthLayout` (mas arriba): aqui solo va
          la tarjeta y las clases de posicionamiento que se le pasan en
          `contentClassName`.

          `items-start` + `my-auto` en la tarjeta en vez de `items-center`: con
          el centrado clasico de flex, una tarjeta mas alta que la pantalla se
          empuja hacia arriba y la flecha de volver queda recortada sin forma de
          llegar a ella. Con `my-auto` los margenes automaticos absorben el
          espacio sobrante (centrado) y valen 0 cuando no hay, dejando la
          tarjeta arriba y todo accesible con scroll.

          `sm:justify-end` manda la tarjeta a la derecha ya desde 640px: el
          fondo de La Sirena ancla a la IZQUIERDA su logo y sus textos, y
          empujar la tarjeta al borde derecho cuanto antes es lo que evita que
          se monte sobre ellos. Por debajo de 640px la tarjeta es de ancho
          completo, asi que ahi el `justify-center` no se nota. `px-4` son los
          margenes laterales (16px) y `lg:px-8` los ensancha en escritorio.

          El ancho es `max-w-[480px]`, propio de esta pantalla: el login es un
          formulario corto (2 campos) y una tarjeta angosta no se monta sobre
          el logo de La Sirena ni sobre los tres beneficios del pie de la
          imagen. Crear cuenta usa `max-w-[540px]`, un poco mas ancho por su
          grilla de 2 columnas pero aun asi compacto para que quepe en un
          viewport de 1280x720. En movil `w-full` manda y la
          tarjeta llena el ancho disponible. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative my-auto ${AUTH_GLASS_CARD} w-full max-w-[480px] px-5 py-8 sm:px-10 sm:py-8`}
      >
        <button
          onClick={() => navigate("landing")}
          title="Volver al inicio"
          className={`absolute top-5 left-5 ${AUTH_GLASS_BUTTON_SECONDARY}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center mb-6">
          <Logo variante={darkMode ? "blanco" : "claro"} alt="S.I.V.PRO Logo" className="h-16 w-auto object-contain mx-auto mb-2" />

          <h1
            className="text-2xl font-bold text-foreground dark:text-white"
            style={{ fontFamily: SERIF }}
          >
            Bienvenido a La Sirena
          </h1>
          <p className="text-sm mt-2 text-foreground/75 dark:text-white/75">
            Ingresa tus datos para continuar
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleLogin();
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2 dark:text-white">
                Correo electrónico
              </label>
              <input
                value={email}
                onChange={(e) => {
                  const value = filtrarCorreo(e.target.value);
                  setEmail(value);
                  setErrors((p) => ({ ...p, email: validarCorreo(value) ?? undefined }));
                }}
                type="email"
                placeholder="correo@lasirena.com"
                aria-label="Correo electrónico"
                ref={validacion.refCampo("email")}
                onKeyDown={validacion.onKeyDownCampo("email", {
                  errores: errors,
                  validar: () => validarCorreo(email),
                  aplicar: (campo, err) =>
                    setErrors((p) => ({ ...p, [campo]: err ?? undefined })),
                })}
                className={authInputCls(errors.email, "h-12")}
                {...validacion.ariaCampo("email", errors.email)}
              />
              <MensajeError id={validacion.idError("email")} err={errors.email} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2 dark:text-white">
                Contraseña
              </label>
              <PasswordField
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  setErrors((p) => ({
                    ...p,
                    password: v ? undefined : "La contraseña es obligatoria",
                  }));
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                ariaLabel="Contraseña"
                inputRef={validacion.refCampo("password")}
                onKeyDown={validacion.onKeyDownCampo("password", {
                  errores: errors,
                  validar: () =>
                    password ? null : "La contraseña es obligatoria",
                  aplicar: (campo, err) =>
                    setErrors((p) => ({ ...p, [campo]: err ?? undefined })),
                })}
                ariaInvalid={Boolean(errors.password)}
                ariaDescribedBy={
                  errors.password ? validacion.idError("password") : undefined
                }
                cls={authInputCls(errors.password, "h-12")}
              />
              <MensajeError id={validacion.idError("password")} err={errors.password} />
            </div>
          </div>
          <div className="mt-3">
            <AceptacionTerminos inputRef={terminosRef} aceptados={terminosAceptados} error={errors.terminos} onChange={(aceptados) => {
              setTerminosAceptados(aceptados);
              setErrors((p) => ({ ...p, terminos: aceptados ? undefined : "Debes aceptar los términos y condiciones" }));
            }} />
          </div>
          <div className="text-right mt-2">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-sm text-primary font-medium hover:underline cursor-pointer max-md:inline-flex max-md:items-center max-md:min-h-11"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <PrimaryBtn
            type="submit"
            size="md"
            className="w-full mt-5 h-12"
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : null}
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </PrimaryBtn>
        </form>

        {rechazo && (
          <p className="text-center text-sm font-semibold text-red-600 mb-3">
            {rechazo}
          </p>
        )}

        {cuentaPendiente && (
          <div className="flex justify-center mb-3">
            <button
              type="button"
              onClick={() => void reenviarConfirmacion()}
              disabled={reenviando || reenvioEnEspera}
              className="text-sm font-semibold text-primary underline underline-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reenviando ? "Enviando..." : "Reenviar correo de confirmación"}
            </button>
          </div>
        )}

        {mensajeExito && (
          <p className="text-center text-sm font-semibold text-emerald-600 mb-3">
            {mensajeExito}
          </p>
        )}

        {loginNotice && (
          <p className="text-center text-sm font-semibold text-red-600 mb-3">
            Inicia sesión para terminar tu pedido. Tus productos quedan guardados.
          </p>
        )}

        <p className="text-center text-sm text-foreground/75 mt-4 dark:text-white/75">
          {"¿No tienes cuenta? "}
          <button
            onClick={() => navigate("register")}
            className="text-primary font-semibold hover:underline cursor-pointer max-md:inline-block max-md:py-3 max-md:-my-3"
          >
            Regístrate aquí
          </button>
        </p>
      </motion.div>
    </AuthLayout>
  );
}
