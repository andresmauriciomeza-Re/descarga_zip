import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User, Mail, Phone, ArrowLeft, Pencil, X, Check, LogOut, FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const SERIF = "'DM Serif Display', serif";

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
  onUpdateUser: (id: string, data: { correo: string; telefono: string }) => void;
  inStore?: boolean;
}

function validarCorreo(c: string): string | null {
  if (!c.trim()) return "El correo es obligatorio";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return "Formato de correo no válido";
  return null;
}

function validarTelefono(t: string): string | null {
  if (!t.trim()) return "El teléfono es obligatorio";
  if (!/^\d{7,15}$/.test(t.replace(/\s/g, ""))) return "Solo números, entre 7 y 15 dígitos";
  return null;
}

export function MiPerfilScreen({ navigate, userRole, onLogout, isStaff, loggedInUser, loggedInRoleName, onUpdateUser, inStore = false }: Props) {
  const [editando, setEditando] = useState(false);
  const [correo,   setCorreo]   = useState(loggedInUser?.correo   ?? "");
  const [telefono, setTelefono] = useState(loggedInUser?.telefono ?? "");
  const [guardado, setGuardado] = useState({ correo: loggedInUser?.correo ?? "", telefono: loggedInUser?.telefono ?? "" });
  const [errores,  setErrores]  = useState<{ correo?: string; telefono?: string }>({});

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
    const newCorreo   = correo.trim();
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
            <button
              onClick={handleEditar}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
            >
              <Pencil className="w-4 h-4" />
              Editar
            </button>
          )}
        </div>

        {/* Datos */}
        <div className="px-6 py-6 space-y-5">
          {/* Documento — solo lectura */}
          <div className="grid grid-cols-1 sm:grid-cols-[9rem_1fr] gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                <FileText className="w-3.5 h-3.5" />
                Tipo de documento
              </label>
              <div className="px-3 py-2.5 rounded-xl border border-border bg-muted/40 text-sm font-mono text-muted-foreground select-none">
                {loggedInUser?.tipoDocumento ?? "—"}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                <FileText className="w-3.5 h-3.5" />
                Número de documento
              </label>
              <div className="px-3 py-2.5 rounded-xl border border-border bg-muted/40 text-sm font-mono text-muted-foreground select-none">
                {loggedInUser?.numeroDocumento ?? "—"}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2 ml-0.5">El documento no es editable</p>

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
                  onChange={e => { setCorreo(e.target.value); if (errores.correo) setErrores(p => ({ ...p, correo: undefined })); }}
                  placeholder="correo@ejemplo.com"
                  className={iCls(errores.correo)}
                  autoFocus
                />
                {errores.correo && <p className="text-xs text-red-500 mt-1 ml-0.5">{errores.correo}</p>}
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
                {errores.telefono && <p className="text-xs text-red-500 mt-1 ml-0.5">{errores.telefono}</p>}
              </>
            ) : (
              <div className="px-3 py-2.5 rounded-xl border border-border bg-muted text-sm text-foreground font-medium">
                {guardado.telefono}
              </div>
            )}
          </div>
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
              {isStaff && (
              <button
                onClick={() => navigate(inStore ? "dashboard" : "users")}
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
    </div>
  );
}
