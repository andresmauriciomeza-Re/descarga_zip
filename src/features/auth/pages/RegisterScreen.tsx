import type React from "react";
import type { Screen } from "@/shared/utils/screen";
import type { Usuario } from "@/features/users/utils/users";
import type { Cliente } from "@/features/customers/utils/customers";
import { useRef, useState } from "react";
import { filtrarCorreo, filtrarDocumento, filtrarNombre, normalizarNombre as normalizarNombrePersona, MarcaObligatorio, MensajeError, PasswordField, RequisitosContrasena, soloDigitos, validarContrasena, validarCorreo, validarDocumento, validarNombre, validarTelefono } from "@/shared/components/FormInputs";
import { useValidacionFormulario } from "@/shared/hooks/useFormValidation";
import { type RegistroConVerificacion } from "@/shared/services/verificationService";
import { registrarCliente } from "@/shared/services/authService";
import { toast } from "sonner";
import { motion } from "motion/react";
import { AUTH_GLASS_BUTTON_SECONDARY, AUTH_GLASS_CARD, authInputCls } from "@/shared/styles/authGlass";
import { ArrowLeft, CheckCircle, RefreshCw } from "lucide-react";
import logoBlanco from "@/assets/img/logo-blanco.webp";
import logoClaro from "@/assets/img/logoclaro2.webp";
import { SERIF } from "@/shared/utils/fonts";
import { OPCIONES_TIPO_DOCUMENTO } from "@/shared/utils/documentTypes";
import { PrimaryBtn } from "@/shared/components/buttons/PrimaryButton";
import { AVATAR_PALETTE } from "@/shared/utils/avatar";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { AceptacionTerminos } from "@/features/auth/components/AcceptTerms";

export function RegisterScreen({
  navigate,
  usuarios,
  setUsuarios,
  clientes,
  setClientes,
  darkMode,
  onRegistrado,
}: {
  navigate: (s: Screen) => void;
  usuarios: Usuario[];
  setUsuarios: React.Dispatch<React.SetStateAction<Usuario[]>>;
  clientes: Cliente[];
  setClientes: React.Dispatch<React.SetStateAction<Cliente[]>>;
  darkMode: boolean;
  /** Cuenta creada y pendiente de confirmar el correo: App lleva al login con
   *  el correo escrito y el aviso. `correoEnviado` = salió "Confirma tu correo". */
  onRegistrado: (correo: string, correoEnviado: boolean) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    docType: "CC",
    docNum: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [terminosAceptados, setTerminosAceptados] = useState(false);
  const terminosRef = useRef<HTMLInputElement>(null);
  const setVal =
    (k: keyof typeof form) =>
      (v: string) => {
        const value = k === "email" ? filtrarCorreo(v) : k === "name" ? filtrarNombre(v) : v;
        setForm((p) => ({ ...p, [k]: value }));
        setErrores((prev) => {
          const next = { ...prev };
          if (k === "email") next.email = "";
          if (k === "phone") next.phone = value ? validarTelefono(value) ?? "" : "";
          if (k === "docNum") next.docNum = value ? validarDocumento(value, form.docType) ?? "" : "";
          if (k === "password") {
            next.password = value ? validarContrasena(value) ?? "" : "";
            // Al escribir la contraseña se recalcula también el confirm: si el
            // usuario repitió la contraseña antes y luego cambió la primera,
            // el mensaje de "no coinciden" no debe quedarse pegado (ni ocultar
            // un desajuste que acaba de producirse).
            next.confirm = form.confirm
              ? value === form.confirm
                ? ""
                : "Las contraseñas no coinciden"
              : "";
          }
          if (k === "confirm") next.confirm = value ? value === form.password ? "" : "Las contraseñas no coinciden" : "";
          if (k === "name") next.name = validarNombre(value) ?? "";
          return next;
        });
      };
  const set =
    (k: keyof typeof form) =>
      (e: React.ChangeEvent<HTMLInputElement>) =>
        setVal(k)(e.target.value);
  // Igual que `set`, pero dejando solo dígitos: el teléfono nunca debe poder
  // guardar letras ni símbolos aunque se peguen desde el portapapeles.
  const setDigitos =
    (k: keyof typeof form) =>
      (e: React.ChangeEvent<HTMLInputElement>) =>
        setVal(k)(soloDigitos(e.target.value));

  // El botón "Crear cuenta" queda apagado hasta que todos los campos
  // obligatorios estén llenos, la contraseña cumpla las 5 reglas y el
  // confirmar coincida. Se recalcula en cada render a partir del estado,
  // así el check de la lista y el botón nunca se contradicen.
  const formValido =
    form.docType !== "" &&
    form.docNum.trim() !== "" &&
    form.name.trim() !== "" &&
    form.email.trim() !== "" &&
    form.phone.trim() !== "" &&
    form.password !== "" &&
    form.confirm !== "" &&
    validarContrasena(form.password) === null &&
    form.password === form.confirm;

  // ── Trampa de Tab, foco al primer inválido y aria ──
  // Lógica compartida en src/shared/hooks/useFormValidation.ts. El
  // orden coincide con el del tabulador de la tarjeta.
  const validacion = useValidacionFormulario([
    "docType", "docNum", "name", "email", "phone", "password", "confirm",
  ]);

  /** Validador en vivo de cada campo, para que la trampa de Tab no dependa
   *  de que el error ya esté calculado en `errores` (campo vacío y sin
   *  tocar todavía). Mismas reglas que `register`. */
  const validadorDe = (k: string): (() => string | null) => {
    switch (k) {
      case "docType":
        return () => (form.docType ? null : "Selecciona el tipo de documento");
      case "docNum":
        return () => validarDocumento(form.docNum, form.docType);
      case "name":
        return () => validarNombre(form.name);
      case "email":
        return () => validarCorreo(form.email);
      case "phone":
        return () => validarTelefono(form.phone);
      case "password":
        return () => validarContrasena(form.password);
      case "confirm":
        return () =>
          form.password !== form.confirm ? "Las contraseñas no coinciden" : null;
    }
  };

  /** onKeyDown de cada campo: Tab con error no sale del campo (el error se
   *  escribe en `errores` para pintarlo) y Enter en las contraseñas envía,
   *  igual que antes. Shift+Tab y el clic con el mouse no se tocan. */
  const teclaEnRegistro =
    (campo: string) =>
      (e: React.KeyboardEvent<HTMLElement>) => {
        validacion.onKeyDownCampo(campo, {
          errores,
          validar: validadorDe(campo),
          aplicar: (c, err) => setErrores((p) => ({ ...p, [c]: err ?? "" })),
        })(e);
        if (e.key === "Enter" && (campo === "password" || campo === "confirm"))
          register();
      };

  const register = async () => {
    const errs: Record<string, string> = {};

    if (!form.name.trim()) errs.name = "El nombre es obligatorio";
    else errs.name = validarNombre(form.name) ?? undefined;
    if (!form.email) errs.email = "El correo electrónico es obligatorio";
    else errs.email = validarCorreo(form.email) ?? undefined;
    if (!form.phone) errs.phone = "El número de teléfono es obligatorio";
    else errs.phone = validarTelefono(form.phone) ?? undefined;
    if (!form.docType) errs.docType = "Selecciona el tipo de documento";

    const docTrim = form.docNum.trim();
    if (!docTrim) errs.docNum = "El número de documento es obligatorio";
    else if (form.docType === "CC" && !/^\d{6,10}$/.test(docTrim))
      errs.docNum = "La CC debe tener entre 6 y 10 dígitos";
    else errs.docNum = validarDocumento(docTrim, form.docType) ?? undefined;

    if (!errs.docNum) {
      const clave = `${form.docType}||${docTrim}`.toLowerCase();
      // §1.3: un documento que solo existe en un cliente (o usuario) SIN correo
      // — el que nació en una venta — no bloquea el registro: se completa esa
      // misma persona con sus datos al final. Con correo ya puesto sí cuenta
      // como documento registrado.
      const docDuplicado =
        usuarios.some(u => `${u.tipoDocumento}||${u.numeroDocumento}`.toLowerCase() === clave && u.correo.trim() !== "") ||
        clientes.some(c => `${c.tipoDocumento}||${c.numeroDocumento}`.toLowerCase() === clave && c.correo.trim() !== "");
      if (docDuplicado) errs.docNum = "Este documento ya está registrado";
    }

    if (!errs.email) {
      const em = form.email.trim().toLowerCase();
      // Un correo vacío nunca coincide con otro correo vacío: si no, todos los
      // registros sin correo serían "la misma persona".
      const correoDuplicado =
        usuarios.some(u => u.correo.trim() !== "" && u.correo.trim().toLowerCase() === em) ||
        clientes.some(c => c.correo.trim() !== "" && c.correo.trim().toLowerCase() === em);
      if (correoDuplicado) errs.email = "Este correo ya está registrado";
    }

    // Mismas reglas que el resto de formularios (fuente única en campo.tsx).
    const passwordError = validarContrasena(form.password);
    if (passwordError) errs.password = passwordError;
    if (form.password !== form.confirm)
      errs.confirm = "Las contraseñas no coinciden";
    if (!terminosAceptados) errs.terminos = "Debes aceptar los términos y condiciones";

    setErrores(errs);
    if (Object.values(errs).some(Boolean)) {
      // Con errores no se envía: se muestran todos y el foco va al primer
      // campo inválido (los mensajes ya se pintan desde `errores`).
      validacion.enfocarPrimero(errs);
      if (errs.terminos && !Object.entries(errs).some(([campo, error]) => campo !== "terminos" && error)) terminosRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const registro: RegistroConVerificacion = await registrarCliente({
        tipoDocumento: form.docType,
        numeroDocumento: form.docNum.trim(),
        nombre: normalizarNombrePersona(form.name),
        correo: form.email.trim().toLowerCase(),
        telefono: form.phone.trim(),
        contrasena: form.password,
      });

      const correoNuevo = form.email.trim().toLowerCase();
      // §1.3: si el documento pertenece a un cliente creado desde una venta
      // (sin correo), el registro lo COMPLETA en vez de duplicarlo: se llena
      // su correo — obligatorio, o la sincronización volvería a dejar el
      // usuario sin correo — y el usuario que creó esa sincronización se
      // actualiza (correo, teléfono y contraseña) en lugar de crearse otro.
      const claveDocRegistro = `${form.docType}||${docTrim}`.toLowerCase();
      const mismaDoc = (x: { tipoDocumento: string; numeroDocumento: string }) =>
        `${x.tipoDocumento}||${x.numeroDocumento}`.toLowerCase() === claveDocRegistro;
      const clienteSinCorreo = clientes.find(c => mismaDoc(c) && c.correo.trim() === "");
      if (clienteSinCorreo) {
        setClientes(prev =>
          prev.map(c => (c.id === clienteSinCorreo.id ? { ...c, correo: correoNuevo } : c)),
        );
      }
      const usuarioExistente = usuarios.find(
        u => u.correo.trim().toLowerCase() === correoNuevo && u.correo.trim() !== "",
      );
      if (!usuarioExistente) {
        const usuarioPorDoc = usuarios.find(u => mismaDoc(u) && u.correo.trim() === "");
        if (usuarioPorDoc) {
          // Misma persona ya presente en Gestión de Usuarios (vino de la
          // sincronización con el cliente): se actualiza, no se duplica.
          setUsuarios(p =>
            p.map(u =>
              u.id === usuarioPorDoc.id
                ? {
                  ...u,
                  correo: correoNuevo,
                  telefono: form.phone.trim(),
                  contrasena: form.password,
                }
                : u,
            ),
          );
        } else {
          const maxId = usuarios.reduce((max, u) => {
            const n = parseInt(u.id.replace("USR-", ""), 10);
            return Number.isNaN(n) ? max : Math.max(max, n);
          }, 0);
          const nameParts = form.name.trim().split(/\s+/);
          const iniciales =
            (nameParts.length > 1
              ? (nameParts[0][0] ?? "") + (nameParts[1][0] ?? "")
              : nameParts[0].slice(0, 2)
            ).toUpperCase();
          const nuevoUsuario: Usuario = {
            id: "USR-" + (maxId + 1),
            nombre: normalizarNombrePersona(form.name),
            iniciales,
            avatarColor: AVATAR_PALETTE[usuarios.length % AVATAR_PALETTE.length],
            correo: correoNuevo,
            telefono: form.phone.trim(),
            tipoDocumento: form.docType,
            numeroDocumento: form.docNum.trim(),
            rolId: "ROL-002",
            rolIds: ["ROL-002"],
            activo: true,
          };
          setUsuarios((p) => [...p, nuevoUsuario]);
        }
      }
      // La cuenta queda pendiente hasta confirmar el correo.
      onRegistrado(correoNuevo, registro.correoEnviado !== false);
    } catch (e) {
      const mensaje =
        e instanceof Error ? e.message : "No se pudo conectar con el servidor.";
      // Llaves del mapa verificadas contra `errs` de las validaciones locales
      // y contra el JSX de RegisterScreen: docType y docNum se leen en sus
      // inputs y name/email/phone/password en el map de campos; son las
      // mismas llaves, así que el texto del backend cae en su <MensajeError>.
      const mapa: Record<string, { campo: string; texto: string }> = {
        "Este documento ya está registrado.": {
          campo: "docNum",
          texto: "Este documento ya está registrado",
        },
        "El número de documento no es válido.": {
          campo: "docNum",
          texto: "El número de documento no es válido",
        },
        "Tipo de documento no válido.": {
          campo: "docType",
          texto: "Tipo de documento no válido",
        },
        "El nombre no es válido.": {
          campo: "name",
          texto: "El nombre no es válido",
        },
        "Este correo ya está registrado.": {
          campo: "email",
          texto: "Este correo ya está registrado",
        },
        "Ingresa un correo válido y sin espacios.": {
          campo: "email",
          texto: "Ingresa un correo válido y sin espacios",
        },
        "El teléfono debe tener solo números, entre 7 y 15 dígitos.": {
          campo: "phone",
          texto: "El teléfono debe tener solo números, entre 7 y 15 dígitos",
        },
        "La contraseña no cumple los requisitos.": {
          campo: "password",
          texto: "La contraseña no cumple los requisitos",
        },
      };
      const hit = mapa[mensaje];
      if (hit) {
        setErrores((prev) => ({ ...prev, [hit.campo]: hit.texto }));
        // El selector de tipo doc borra su error inline al cambiar de tipo,
        // así que su mensaje del servidor se refuerza además en toast.
        if (hit.campo === "docType") toast.error(mensaje);
      } else {
        // 429, sin conexión, 500, 503 u otros: el texto ya viene del
        // interceptor y no se navega.
        toast.error(mensaje);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout contentClassName="items-start justify-center sm:justify-end px-4 py-3 lg:px-8 lg:pr-16 xl:pr-12" darkMode={darkMode}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative my-auto ${AUTH_GLASS_CARD} w-full max-w-[540px] px-5 py-6 sm:px-7 sm:py-4`}
      >
        <button
          onClick={() => navigate("landing")}
          title="Volver al inicio"
          className={`absolute top-5 left-5 ${AUTH_GLASS_BUTTON_SECONDARY}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center mb-2">
          <img src={darkMode ? logoBlanco : logoClaro} alt="S.I.V.PRO Logo" className="h-16 w-auto object-contain mx-auto mb-1" />
          <h1
            className="text-xl font-bold text-foreground dark:text-white"
            style={{ fontFamily: SERIF }}
          >
            Crear cuenta
          </h1>
        </div>

        {/* Grid y no `space-y`: hace falta para que los campos puedan COMPARTIR
            fila. Fila 1 = Tipo doc + Numero (grid `3fr_2fr` dentro de una celda
            de ancho completo: Tipo doc mas ancho para que el label del select
            no se corte, Numero mas corto), Fila 2 = Nombre completo (ancho
            completo), Fila 3 = Correo + Telefono, Fila 4 = Contrasena +
            Confirmar, Fila 5 = checklist de requisitos. El flag `full` de cada
            descriptor marca los campos que se llevan las 2 columnas (hoy solo
            "Nombre completo"). En movil (<640px) el grid cae a 1 columna y
            todo se apila.

            `gap-x-3` (12px) separa las dos columnas y `gap-y-2` (8px) las
            filas; `mb-1` (4px) dentro de cada celda separa label e input. */}
        <div className="grid gap-x-3 gap-y-1 grid-cols-1 sm:grid-cols-6">
          <div className="sm:col-span-6 grid gap-3 grid-cols-1 sm:grid-cols-[3fr_2fr]">
            <div className="min-w-0">
              <label className="block text-sm font-semibold mb-1 text-foreground dark:text-white whitespace-nowrap">
                Tipo doc.
                <MarcaObligatorio />
              </label>
              <select
                value={form.docType}
                ref={validacion.refCampo("docType")}
                aria-label="Tipo de documento"
                onChange={(e) => {
                  setForm((p) => ({ ...p, docType: e.target.value }));
                  if (form.docNum) {
                    setErrores((p) => ({ ...p, docNum: form.docNum ? validarDocumento(form.docNum, e.target.value) ?? "" : "" }));
                  }
                  if (errores.docType) setErrores((p) => ({ ...p, docType: "" }));
                }}
                onKeyDown={teclaEnRegistro("docType")}
                className={`${authInputCls(errores.docType, "cursor-pointer h-10 pl-3 pr-8")} [&>option]:bg-white [&>option]:text-neutral-900 dark:[&>option]:bg-neutral-800 dark:[&>option]:text-white`}
                {...validacion.ariaCampo("docType", errores.docType)}
              >
                {OPCIONES_TIPO_DOCUMENTO.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <MensajeError id={validacion.idError("docType")} err={errores.docType} />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-semibold mb-1 text-foreground dark:text-white whitespace-nowrap">
                Número de documento
                <MarcaObligatorio />
              </label>
              <input
                value={form.docNum}
                onChange={(e) => setVal("docNum")(filtrarDocumento(e.target.value, form.docType))}
                type="text"
                inputMode="numeric"
                placeholder="Ej: 12345678"
                aria-label="Número de documento"
                ref={validacion.refCampo("docNum")}
                onKeyDown={teclaEnRegistro("docNum")}
                className={authInputCls(errores.docNum, "h-10")}
                {...validacion.ariaCampo("docNum", errores.docNum)}
              />
              <MensajeError id={validacion.idError("docNum")} err={errores.docNum} />
            </div>
          </div>
          {[

            {
              label: "Nombre completo",
              key: "name" as const,
              placeholder: "Gloria Muñoz",
              type: "text",
              full: true,
            },
            {
              label: "Correo electrónico",
              key: "email" as const,
              placeholder: "gloria@gmail.com",
              type: "email",
            },
            {
              label: "Teléfono",
              key: "phone" as const,
              placeholder: "3101234567",
              type: "tel",
              numeric: true,
            },
            {
              label: "Contraseña",
              key: "password" as const,
              placeholder: "Mínimo 8 caracteres",
              type: "password",
            },
            {
              label: "Confirmar contraseña",
              key: "confirm" as const,
              placeholder: "Repite tu contraseña",
              type: "password",
            },
          ].map(({ label, key, placeholder, type, numeric, full }) => (
            <div key={key} className={full ? "sm:col-span-6 min-w-0" : key === "email" ? "sm:col-span-4 min-w-0" : key === "phone" ? "sm:col-span-2 min-w-0" : "sm:col-span-3 min-w-0"}>
              <label className="block text-sm font-semibold mb-1 text-foreground dark:text-white">
                {label}
                <MarcaObligatorio />
              </label>
              {type === "password" ? (
                <PasswordField
                  value={form[key]}
                  onChange={setVal(key)}
                  onKeyDown={teclaEnRegistro(key)}
                  placeholder={placeholder}
                  autoComplete="new-password"
                  ariaLabel={label}
                  cls={authInputCls(errores[key], "h-10")}
                  pad="pr-9"
                  inputRef={validacion.refCampo(key)}
                  ariaInvalid={Boolean(errores[key])}
                  ariaDescribedBy={errores[key] ? validacion.idError(key) : undefined}
                />
              ) : (
                <input
                  value={form[key]}
                  onChange={numeric ? setDigitos(key) : set(key)}
                  type={type}
                  inputMode={numeric ? "numeric" : undefined}
                  placeholder={placeholder}
                  aria-label={label}
                  ref={validacion.refCampo(key)}
                  onBlur={key === "name" ? () => setForm(p => ({ ...p, name: normalizarNombrePersona(p.name) })) : undefined}
                  onKeyDown={teclaEnRegistro(key)}
                  className={authInputCls(errores[key], "h-10")}
                  {...validacion.ariaCampo(key, errores[key])}
                />
              )}
              <MensajeError id={validacion.idError(key)} err={key === "email" && errores[key]?.includes("registrado") ? "Este correo ya está registrado" : errores[key]} />
            </div>
          ))}

          {/* Lista de requisitos en tiempo real, como FILA PROPIA de ancho
              completo justo debajo de la pareja Contraseña / Confirmar.

              `grid` de 3 columnas `max-content` (fila 1 = mayuscula, largo,
              espacios; fila 2 = minuscula, numero) alineadas en columna:
              mayuscula/minuscula en la col 1, largo/numero en la col 2.
              `justify-start` las alinea a la izquierda. En movil (<640px)
              cae a `grid-cols-1`. Los `order-*` por `nth-child` reordenan
              solo A LA VISTA el array de REGLAS_CONTRASENA (que va numero
              antes que minuscula, y espacios al final) sin tocar campo.tsx,
              donde ese orden sigue sirviendo a las demas pantallas que
              listan los requisitos en vertical. */}
          <div className="sm:col-span-2 min-w-0">
            <RequisitosContrasena
              valor={form.password}
              className="mt-1 grid grid-cols-1 sm:grid-cols-[max-content_max-content_max-content] justify-start gap-x-3 gap-y-1 [&>li:nth-child(2)]:order-1 [&>li:nth-child(1)]:order-2 [&>li:nth-child(5)]:order-3 [&>li:nth-child(4)]:order-4 [&>li:nth-child(3)]:order-5 [&>li.text-muted-foreground]:text-foreground/75 [&>li.text-emerald-600]:text-emerald-900 dark:[&>li.text-emerald-600]:text-emerald-400"
            />
          </div>
        </div>

        <div className="mt-2">
          <AceptacionTerminos inputRef={terminosRef} aceptados={terminosAceptados} error={errores.terminos} onChange={(aceptados) => {
            setTerminosAceptados(aceptados);
            setErrores((p) => ({ ...p, terminos: aceptados ? "" : "Debes aceptar los términos y condiciones" }));
          }} />
        </div>
        <PrimaryBtn
          onClick={register}
          size="md"
          className="w-full mt-2 h-10 max-md:h-11 min-h-0!"
          disabled={loading || !formValido}
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </PrimaryBtn>

        <p className="text-center text-sm text-foreground/75 mt-2 dark:text-white/75">
          {"¿Ya tienes cuenta? "}
          <button
            onClick={() => navigate("login")}
            className="text-primary font-semibold hover:underline cursor-pointer max-md:inline-block max-md:py-3 max-md:-my-3"
          >
            Ingresar
          </button>
        </p>
      </motion.div>
    </AuthLayout>
  );
}
