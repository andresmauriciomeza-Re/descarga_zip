import type { Screen } from "@/shared/utils/screen";
import { useEffect, useState } from "react";
import { etiquetaTipoDocumento } from "@/shared/utils/documentTypes";
import { filtrarCorreo, validarCorreo, validarTelefono } from "@/shared/components/FormInputs";
import { toast } from "sonner";
import { SERIF } from "@/shared/utils/fonts";
import { ArrowLeft, Check, FileText, KeyRound, LogOut, Mail, Pencil, Phone, RefreshCw, ShieldCheck, User, X } from "lucide-react";
import { CambiarContrasenaModal } from "@/shared/components/ChangePasswordModal";

export function ClientProfileScreen({
  navigate,
  onLogout,
  loggedInUser,
  loggedInRoleName,
  isStaff,
  adminHomeScreen,
  onGuardarPerfil,
  onPasswordSaved,
  perfilCargando,
  perfilError,
  onReintentarPerfil,
  perfilPendiente,
}: {
  navigate: (s: Screen) => void;
  onLogout: () => void;
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
  isStaff: boolean;
  adminHomeScreen: Screen;
  /** Guarda correo y teléfono en el backend (PUT /auth/perfil). */
  onGuardarPerfil: (datos: {
    correo: string;
    telefono: string;
  }) => Promise<{ ok: boolean; campo?: "correo" | "telefono" | "general"; mensaje?: string }>;
  /** Tras guardar la contraseña con éxito: toast, cierre de sesión y login
   *  con el correo ya escrito. */
  onPasswordSaved?: (correo: string) => void;
  perfilCargando?: boolean;
  perfilError?: string | null;
  onReintentarPerfil?: () => void;
  perfilPendiente: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [showCambiarContrasena, setShowCambiarContrasena] = useState(false);
  const [correo, setCorreo] = useState(loggedInUser?.correo ?? "sebas@gmail.com");
  const [telefono, setTelefono] = useState(loggedInUser?.telefono ?? "3109876543");
  const [guardado, setGuardado] = useState({
    correo: loggedInUser?.correo ?? "sebas@gmail.com",
    telefono: loggedInUser?.telefono ?? "3109876543",
  });
  const [errores, setErrores] = useState<{
    correo?: string;
    telefono?: string;
  }>({});

  useEffect(() => {
    if (loggedInUser) {
      setCorreo(loggedInUser.correo);
      setTelefono(loggedInUser.telefono);
      setGuardado({ correo: loggedInUser.correo, telefono: loggedInUser.telefono });
    }
  }, [loggedInUser?.id]);

  const iCls = (err?: string) =>
    `w-full px-3 py-2.5 rounded-xl border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${err ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}`;

  const tipoDocumento = loggedInUser?.tipoDocumento
    ? etiquetaTipoDocumento(loggedInUser.tipoDocumento)
    : "—";

  const handleGuardar = async () => {
    const ec = validarCorreo(correo);
    const et = validarTelefono(telefono);
    if (ec || et) {
      setErrores({
        correo: ec ?? undefined,
        telefono: et ?? undefined,
      });
      return;
    }
    setGuardando(true);
    try {
      // Guardado real contra PUT /auth/perfil (no solo memoria local).
      const resultado = await onGuardarPerfil({
        correo: correo.trim().toLowerCase(),
        telefono: telefono.trim(),
      });
      if (!resultado.ok) {
        if (resultado.campo === "correo") setErrores({ correo: resultado.mensaje });
        else if (resultado.campo === "telefono") setErrores({ telefono: resultado.mensaje });
        else toast.error(resultado.mensaje ?? "No se pudo guardar el perfil. Inténtalo de nuevo.");
        return;
      }
      setGuardado({
        correo: correo.trim().toLowerCase(),
        telefono: telefono.trim(),
      });
      setEditando(false);
      setErrores({});
      toast.success("Perfil actualizado correctamente");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold text-foreground"
          style={{ fontFamily: SERIF }}
        >
          Mi Perfil
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tu información de cuenta
        </p>
      </div>
      {/* Carga / error de GET /auth/me: los datos locales se ven mientras
          llegan; si el servidor falla, se puede reintentar. */}
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
              className="max-md:min-h-11 max-md:inline-flex max-md:items-center max-md:justify-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer transition-colors disabled:opacity-60"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden />
              Reintentar
            </button>
          )}
        </div>
      )}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Avatar */}
        <div className="flex flex-wrap items-center gap-5 px-6 py-6 border-b border-border bg-muted/30">
          <div className={`w-16 h-16 rounded-full ${perfilPendiente ? "bg-muted border border-border" : loggedInUser?.avatarColor ?? "bg-blue-600"} text-white flex items-center justify-center text-2xl font-bold shrink-0 shadow-sm`}>
            {perfilPendiente ? null : loggedInUser?.iniciales ?? "S"}
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="text-xl font-bold text-foreground"
              style={{ fontFamily: SERIF }}
            >
              {loggedInUser?.nombre ?? (perfilPendiente ? "Cargando…" : "—")}
            </h2>
            <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {loggedInUser ? loggedInRoleName : "Cliente"}
            </span>
          </div>
          {!editando && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0 ml-auto">
              <button
                onClick={() => setShowCambiarContrasena(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 max-md:min-h-11 border border-border bg-white dark:bg-card text-foreground text-sm font-semibold rounded-xl hover:bg-muted active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <KeyRound className="w-4 h-4" />
                Cambiar contraseña
              </button>
              <button
                onClick={() => {
                  setCorreo(guardado.correo);
                  setTelefono(guardado.telefono);
                  setErrores({});
                  setEditando(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 max-md:min-h-11 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Pencil className="w-4 h-4" /> Editar
              </button>
            </div>
          )}
          {editando && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0 ml-auto">
              <button
                disabled
                title="Termina de editar tu perfil primero"
                className="inline-flex items-center gap-1.5 px-4 py-2 max-md:min-h-11 border border-border bg-white dark:bg-card text-foreground text-sm font-semibold rounded-xl opacity-60 cursor-not-allowed shrink-0"
              >
                <KeyRound className="w-4 h-4" />
                Cambiar contraseña
              </button>
            </div>
          )}
        </div>
        {/* Fields */}
        <div className="px-6 py-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                <FileText className="w-3.5 h-3.5" /> Tipo de documento
              </label>
              <input
                type="text"
                value={tipoDocumento}
                readOnly
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/40 text-sm font-medium text-muted-foreground focus:outline-none select-none"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Este campo no es editable
              </p>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                <FileText className="w-3.5 h-3.5" /> Número de documento
              </label>
              <input
                type="text"
                value={loggedInUser?.numeroDocumento ?? "—"}
                readOnly
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/40 text-sm font-medium text-muted-foreground focus:outline-none select-none"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Este campo no es editable
              </p>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
              <User className="w-3.5 h-3.5" /> Nombre completo
            </label>
            <div className="px-3 py-2.5 rounded-xl border border-border bg-muted/40 text-sm font-medium text-muted-foreground">
              {loggedInUser?.nombre ?? (perfilPendiente ? "Cargando…" : "—")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Este campo no es editable
            </p>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
              <Mail className="w-3.5 h-3.5" /> Correo
              electrónico
            </label>
            {editando ? (
              <>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => {
                    const value = filtrarCorreo(e.target.value);
                    setCorreo(value);
                    setErrores((p) => ({ ...p, correo: validarCorreo(value) ?? undefined }));
                  }}
                  className={iCls(errores.correo)}
                  autoFocus
                />
                {errores.correo && (
                  <p className="text-xs text-red-500 mt-1 leading-tight">
                    {errores.correo}
                  </p>
                )}
              </>
            ) : (
              <div className="px-3 py-2.5 rounded-xl border border-border bg-muted text-sm text-foreground font-medium">
                {guardado.correo}
              </div>
            )}
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
              <Phone className="w-3.5 h-3.5" /> Número de teléfono
            </label>
            {editando ? (
              <>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => {
                    setTelefono(e.target.value);
                    setErrores((p) => ({
                      ...p,
                      telefono: undefined,
                    }));
                  }}
                  className={iCls(errores.telefono)}
                />
                {errores.telefono && (
                  <p className="text-xs text-red-500 mt-1 leading-tight">
                    {errores.telefono}
                  </p>
                )}
              </>
            ) : (
              <div className="px-3 py-2.5 rounded-xl border border-border bg-muted text-sm text-foreground font-medium">
                {guardado.telefono}
              </div>
            )}
          </div>
        </div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex flex-col sm:flex-row gap-3">
          {editando ? (
            <>
              <button
                onClick={() => {
                  setEditando(false);
                  setErrores({});
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 max-md:min-h-11 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button
                onClick={() => void handleGuardar()}
                disabled={guardando}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 max-md:min-h-11 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 cursor-pointer transition-all disabled:opacity-60"
              >
                <Check className="w-4 h-4" /> {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => navigate("catalog")}
                className="flex items-center gap-2 px-5 py-2.5 max-md:min-h-11 bg-muted text-foreground rounded-xl text-sm font-semibold hover:bg-border cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Volver al Menú
              </button>
              {isStaff && (
                <button
                  onClick={() => navigate(adminHomeScreen)}
                  className="flex items-center gap-2 px-5 py-2.5 max-md:min-h-11 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-semibold hover:bg-primary/20 cursor-pointer transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" /> Ir a Administración
                </button>
              )}
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-5 py-2.5 max-md:min-h-11 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 cursor-pointer transition-colors sm:ml-auto"
              >
                <LogOut className="w-4 h-4" /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {showCambiarContrasena && loggedInUser && (
        <CambiarContrasenaModal
          correo={loggedInUser.correo}
          onClose={() => setShowCambiarContrasena(false)}
          onCambioExitoso={() => {
            // Éxito: se cierra el modal y se cierra la sesión (con el correo
            // ya escrito en la pantalla de Iniciar sesión).
            setShowCambiarContrasena(false);
            onPasswordSaved?.(loggedInUser.correo);
          }}
        />
      )}
    </div>
  );
}
