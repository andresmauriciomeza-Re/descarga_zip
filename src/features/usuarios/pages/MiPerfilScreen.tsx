import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { User, Mail, Phone, ArrowLeft, Pencil, X, Check, LogOut, FileText, ShieldCheck, Briefcase, KeyRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { type Contratacion, ordenarContrataciones } from "@/features/empleados/pages/GestionEmpleadosScreen";
import { etiquetaTipoDocumento } from "@/shared/utils/tiposDocumento";
import { CambiarRolMenu } from "@/shared/components/CambiarRolMenu";
import { type Rol } from "@/features/roles/pages/GestionConfigScreen";
import { ETIQUETA_INICIO_EMPLEADO } from "@/shared/utils/screen";
import { filtrarCorreo, validarCorreo, validarTelefono } from "@/shared/components/campo";
import { CambiarContrasenaModal, type ErrorGuardarContrasena } from "@/shared/components/CambiarContrasenaModal";
import { cambiarContrasena } from "@/shared/services/authService";

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
  } | null;
  loggedInRoleName: string;
  adminHomeScreen: string;
  /** Guarda correo y teléfono en el backend (PUT /auth/perfil). Si falla,
   *  indica el campo para pintar el error ahí mismo. */
  onGuardarPerfil: (datos: {
    correo: string;
    telefono: string;
  }) => Promise<{ ok: boolean; campo?: "correo" | "telefono" | "general"; mensaje?: string }>;
  /** Se llama DESPUÉS de guardar la contraseña con éxito: muestra el toast,
   *  cierra la sesión y deja el correo escrito en Iniciar sesión. */
  onPasswordSaved?: (correo: string) => void;
  /** Estado de la carga del perfil desde GET /auth/me (App lo gestiona). */
  perfilCargando?: boolean;
  perfilError?: string | null;
  onReintentarPerfil?: () => void;
  inStore?: boolean;
  // Historial de contrataciones del empleado de la sesión, en solo lectura.
  // Lo resuelve App.tsx cruzando el correo de `loggedInUser` contra `empleados`.
  contrataciones?: Contratacion[];
  // Nombre del rol asociado a cada contratación (mismo criterio que el detalle
  // en la pantalla de Empleados). Sin esto el id crudo se vería en pantalla.
  rolNombreDe?: (rolId: string) => string;
  /** Roles distintos al activo que SÍ tienen pantallas: los que ofrece el
   *  menú "Cambiar de rol". */
  rolesParaCambiar?: Rol[];
  onCambiarRol?: (rolId: string) => void;
}

export function MiPerfilScreen({ navigate, userRole, onLogout, isStaff, loggedInUser, loggedInRoleName, adminHomeScreen, onGuardarPerfil, onPasswordSaved, perfilCargando, perfilError, onReintentarPerfil, inStore = false, contrataciones, rolNombreDe, rolesParaCambiar, onCambiarRol }: Props) {
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
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

  const handleGuardar = async () => {
    const ec = validarCorreo(correo);
    const et = validarTelefono(telefono);
    if (ec || et) { setErrores({ correo: ec ?? undefined, telefono: et ?? undefined }); return; }
    const newCorreo   = correo.trim().toLowerCase();
    const newTelefono = telefono.trim();
    setGuardando(true);
    try {
      // El guardado real es del BACKEND (PUT /auth/perfil); la lista local
      // se actualiza en App con la respuesta del servidor.
      const resultado = await onGuardarPerfil({ correo: newCorreo, telefono: newTelefono });
      if (!resultado.ok) {
        if (resultado.campo === "correo") setErrores({ correo: resultado.mensaje });
        else if (resultado.campo === "telefono") setErrores({ telefono: resultado.mensaje });
        else toast.error(resultado.mensaje ?? "No se pudo guardar el perfil. Inténtalo de nuevo.");
        return;
      }
      setGuardado({ correo: newCorreo, telefono: newTelefono });
      setEditando(false);
      setErrores({});
      toast.success("Perfil actualizado correctamente", { description: "Los cambios han sido guardados." });
    } finally {
      setGuardando(false);
    }
  };

  const nombre    = loggedInUser?.nombre    ?? "—";
  const iniciales = loggedInUser?.iniciales ?? "?";
  const avatarBg  = loggedInUser?.avatarColor ?? "bg-primary";
  const tipoDocumento = loggedInUser?.tipoDocumento
    ? etiquetaTipoDocumento(loggedInUser.tipoDocumento)
    : "—";

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

      {/* Carga / error de GET /auth/me: los datos locales se ven mientras
          llegan; si el servidor falla, se puede reintentar sin perder nada. */}
      {perfilCargando && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" aria-hidden />
          Cargando tu información desde el servidor…
        </div>
      )}
      {perfilError && (
        <div className="mb-4 flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50/60 text-sm text-red-700">
          <span className="flex-1 min-w-[200px]">{perfilError}</span>
          {onReintentarPerfil && (
            <button
              onClick={onReintentarPerfil}
              disabled={perfilCargando}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer transition-colors disabled:opacity-60"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden />
              Reintentar
            </button>
          )}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-card border border-border rounded-2xl overflow-hidden"
      >
        {/* Avatar + nombre + rol */}
        <div className="flex flex-wrap items-center gap-5 px-6 py-6 border-b border-border bg-muted/30">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-sm ${avatarBg}`}>
            {iniciales}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate" style={{ fontFamily: SERIF }}>
              {nombre}
            </h2>
            {rolesParaCambiar && rolesParaCambiar.length > 0 && onCambiarRol ? (
              <CambiarRolMenu
                roles={rolesParaCambiar}
                rolActivoNombre={loggedInRoleName}
                onSelect={onCambiarRol}
              />
            ) : (
              <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${rolColor}`}>
                {loggedInRoleName}
              </span>
            )}
          </div>
          {!editando && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0 ml-auto">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0 ml-auto">
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
                        <span className="flex items-center gap-1 flex-wrap">
                          {c.rolIds.map(id => (
                            <span key={id} className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted border border-border text-foreground">
                              {rolNombreDe ? rolNombreDe(id) : id}
                            </span>
                          ))}
                        </span>
                        {i === 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide shrink-0">
                            Actual
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {c.rolIds.map(id => (rolNombreDe ? rolNombreDe(id) : id)).join(" · ") || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
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
                onClick={() => void handleGuardar()}
                disabled={guardando}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 cursor-pointer transition-all disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => navigate(isStaff ? adminHomeScreen : inStore ? "landing" : "dashboard")}
                className="flex items-center gap-2 px-5 py-2.5 bg-muted text-foreground rounded-xl text-sm font-semibold hover:bg-border cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {isStaff
                  ? adminHomeScreen === "dashboard"
                    ? "Volver al Dashboard"
                    : `Volver al ${ETIQUETA_INICIO_EMPLEADO}`
                  : "Volver al inicio"}
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
        <CambiarContrasenaModal
          correo={loggedInUser.correo}
          onClose={() => setShowCambiarContrasena(false)}
          onGuardar={async (actual, nueva): Promise<ErrorGuardarContrasena | null> => {
            try {
              // Guardado real contra PUT /auth/cambiar-contrasena.
              await cambiarContrasena(actual, nueva);
            } catch (e) {
              const mensaje =
                e instanceof Error ? e.message : "No se pudo cambiar la contraseña.";
              if (/contraseña actual/i.test(mensaje)) return { campo: "actual", mensaje };
              if (/nueva contraseña/i.test(mensaje)) return { campo: "nueva", mensaje };
              return { campo: "general", mensaje };
            }
            // Éxito: se cierra el modal y se cierra la sesión (con el correo
            // ya escrito en la pantalla de Iniciar sesión).
            setShowCambiarContrasena(false);
            onPasswordSaved?.(loggedInUser.correo);
            return null;
          }}
        />
      )}
    </div>
  );
}
