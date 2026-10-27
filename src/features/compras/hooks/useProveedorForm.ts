import { useState, useMemo, useCallback } from "react";

// ─── Validaciones reutilizables para formularios de proveedor ─────────────────

/** Punto 12: tipo de persona del proveedor. Se guarda como el MISMO texto que
 *  se muestra en el listado y en el detalle, para no tener que traducir un
 *  código ("natural") en tres pantallas distintas. */
export type TipoPersona = "Persona Natural" | "Persona Jurídica";

/** Documentos de identidad del formulario (Persona Natural y representante
 *  legal de Persona Jurídica). Se guarda el texto visible ("Pasaporte") para
 *  que listado, detalle y edición no tengan que mapear un código. */
export type TipoDocumento = "CC" | "CE" | "Pasaporte";

/** Formas societarias del formulario de Persona Jurídica. Igual criterio:
 *  se persiste tal cual se pinta en el select. */
export type TipoSociedad = "S.A.S." | "S.A." | "Ltda." | "Fundación" | "S.C." | "Otra";

/** Opciones de los dos selects nuevos, en el orden que pidió el usuario.
 *  Se exportan para que el formulario y el detalle pinten la MISMA lista. */
export const TIPOS_DOCUMENTO: TipoDocumento[] = ["CC", "CE", "Pasaporte"];
export const TIPOS_SOCIEDAD: TipoSociedad[] = ["S.A.S.", "S.A.", "Ltda.", "Fundación", "S.C.", "Otra"];

const NIT_LENGTH = 10;
const TELEFONO_LENGTH = 10;
/** Mínimo del teléfono FIJO (opcional): la regla del celular sigue siendo
 *  exactamente `TELEFONO_LENGTH` dígitos, como ya era. */
const TELEFONO_MIN = 7;
/** Número de documento: entre 5 y 10 dígitos (cubren cédulas y CE antiguas sin
 *  aceptar cadenas cortas de relleno). El tope de 10 lo aplica el filtro al
 *  escribir; el mínimo solo lo revisa la validación. */
const DOCUMENTO_MIN = 5;
const DOCUMENTO_MAX = 10;
/** Adjunto de Cámara de Comercio: 5 MB. Un dataURL pesa ~4/3 del archivo, por
 *  eso el tope de caracteres es 5 MB × 4/3. */
const ADJUNTO_MAX_CHARS = Math.round((5 * 1024 * 1024 * 4) / 3);

/** Letras (con tildes y ñ) y espacios: nombres, apellidos y contacto. */
const RE_SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
/** Razón social: texto libre, pero sin signos exóticos que rompan los
 *  listados (admite "Quesos del Norte S.A.S." o "Fundación La Sirena"). */
const RE_RAZON_SOCIAL = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.,&()/#-]+$/;

export interface ProveedorFormValues {
  nombre: string;
  nit: string;
  telefono: string;
  email: string;
  asesorComercial: string;
  direccion: string;
  estado: "activo" | "inactivo";
  /** Punto 12: obligatorio. Arranca vacío en el alta para que la validación
   *  pueda exigirlo (el select solo admite las dos opciones de `TipoPersona`). */
  tipoPersona: TipoPersona | "";

  // ── Campos nuevos por tipo de persona ──────────────────────────────────────
  // TODOS opcionales a propósito: OrdenCompraScreen y GestionCompraScreen
  // ( archivos que este formulario no controla ) construyen `ProveedorFormValues`
  // SOLO con los campos viejos; si aquí se hicieran obligatorios, esos dos
  // formularios dejarían de compilar. La validación de abajo se encarga de
  // exigirlos cuando el tipo de persona los pide.

  /** Persona Natural.
   *  `nombreCompleto` es el ÚNICO campo que pinta el formulario (la spec pide
   *  un solo campo "Nombre completo"): al escribirlo se rellenan `nombres`
   *  con el texto y `apellidos` vacío, de modo que el payload sigue armando
   *  `nombre = nombres + " " + apellidos` igual que siempre. Al editar se
   *  siembra uniendo los dos (ver `conCamposNuevos`). */
  nombres?: string;
  apellidos?: string;
  nombreCompleto?: string;
  tipoDocumento?: TipoDocumento | "";
  numeroDocumento?: string;
  /** DV (dígito de verificación): solo aplica a Persona Jurídica. */
  dv?: string;
  /** Persona Jurídica. En el modelo NO existe como campo: se guarda en `nombre`. */
  razonSocial?: string;
  /** Persona Jurídica (bloque Razón social). Hoy NO tiene columna en la BD:
   *  se pinta y se valida pero no se persiste (aviso en la fase 4). */
  nombreComercial?: string;
  tipoSociedad?: TipoSociedad | "";
  /** Adjunto PDF/imagen de la Cámara de Comercio: nombre + contenido en dataURL. */
  camaraComercioNombre?: string;
  camaraComercioArchivo?: string;
  fechaExpedicionCamara?: string;
  /** Persona Jurídica: persona de contacto comercial. Al guardar se copia a
   *  `asesorComercial` / `telefono` / `email`, que son los que siguen leyendo
   *  compras y órdenes de compra. */
  contactoNombre?: string;
  contactoTelefono?: string;
  /** Teléfono fijo del contacto comercial (bloque Contacto comercial). Hoy NO
   *  tiene columna en la BD: se pinta y se valida pero no se persiste. */
  contactoTelefonoFijo?: string;
  contactoEmail?: string;
  /** Representante legal (solo Persona Jurídica). Igual que en Natural,
   *  `repLegalNombreCompleto` es el único campo pintado y alimenta
   *  `repLegalNombres`/`repLegalApellidos` (el payload los vuelve a unir). */
  repLegalNombres?: string;
  repLegalApellidos?: string;
  repLegalNombreCompleto?: string;
  repLegalTipoDocumento?: TipoDocumento | "";
  repLegalNumeroDocumento?: string;
  /** Teléfono y email del representante legal: sin columna en la BD hoy. */
  repLegalTelefono?: string;
  repLegalEmail?: string;
}

export type ProveedorFormErrors = Partial<Record<keyof ProveedorFormValues, string>>;

/** Filtra el NIT: solo números, máximo 10 dígitos. */
export function filtrarNit(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, NIT_LENGTH);
}

/** Número de documento al escribir: solo dígitos y máximo 10. */
export function filtrarNumeroDocumento(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, DOCUMENTO_MAX);
}

/** DV al escribir: solo dígitos y UNO solo (el DV de la DIAN es de 1 dígito). */
export function filtrarDv(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, 1);
}

/**
 * NIT para mostrar, SIEMPRE con el mismo formato para todos los proveedores
 * (987.654.321-1). Es idempotente: un NIT que ya viene formateado en la
 * semilla ("901.777.888-4") sale igual, y uno guardado en dígitos puros
 * ("9876543211") se formatea aquí. Solo cambia la presentación: lo guardado
 * sigue siendo lo que manda (el campo de alta sigue pidiendo 10 dígitos).
 * Si no tiene 10 dígitos se devuelve tal cual, para no inventar datos.
 */
export function formatoNit(nit: string): string {
  const digitos = (nit ?? "").replace(/\D/g, "");
  if (digitos.length !== NIT_LENGTH) return nit ?? "";
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

/**
 * Siguiente id de proveedor. Regla del sistema: ids numéricos, sin letras ni
 * prefijos (1, 2, 3…), igual que el Id_Proveedor INT de la base de datos.
 * Tolera ids heredados con formato viejo ("PROV-007") o ausentes: se quedan
 * con los dígitos y, si no hay ninguno, arranca en 1. Es el ÚNICO punto donde
 * se genera el id, así los tres formularios de alta guardan la misma estructura.
 */
export function siguienteProveedorId(proveedores: { id?: string }[] = []): string {
  const max = proveedores.reduce((mayor, p) => {
    const n = parseInt(String(p.id ?? "").replace(/\D/g, ""), 10) || 0;
    return Math.max(mayor, n);
  }, 0);
  return String(max + 1);
}

/** Filtra texto de nombres: solo letras y espacios (con tildes y ñ). */
export function soloLetras(valor: string): string {
  return valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "");
}

/** Filtra teléfono: solo números. */
export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Filtra dirección: letras (con tildes y ñ), números, espacios y los símbolos # - . , ° /. */
export function soloDireccion(valor: string): string {
  return valor.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s#\-.,°\/]/g, "");
}

/** Valida una dirección: mínimo 5 caracteres, máximo 100. */
export function validarDireccion(direccion: string): string | null {
  const d = direccion.trim();
  if (!d) return "La dirección es obligatoria.";
  if (d.length < 5) return "Ingresa una dirección válida (ej. Cra 50 #30-10).";
  if (d.length > 100) return "La dirección no puede tener más de 100 caracteres.";
  return null;
}

/** Valida formato de correo. */
export function validarCorreo(email: string): string | null {
  if (!email.trim()) return "El correo es obligatorio.";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim())) return "Ingresa un correo válido.";
  return null;
}

/** Normaliza texto para comparar sin mayúsculas, tildes ni espacios extra. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Derivaciones: qué se guarda en los campos viejos ─────────────────────────

/**
 * `nombre` es el dato que leen listados, compras y órdenes de compra, y el
 * formulario ya NO pide un nombre libre: se deriva de la identificación.
 *   · Persona Natural  → "Nombres Apellidos"
 *   · Persona Jurídica → Razón social
 * Devuelve "" cuando todavía no hay con qué derivar (tipo sin elegir o campos
 * vacíos); `nombreGuardado` es el que resuelve el "" con lo que ya se tenía.
 */
function nombreDeIdentificacion(v: ProveedorFormValues): string {
  if (v.tipoPersona === "Persona Natural") {
    return [v.nombres ?? "", v.apellidos ?? ""]
      .map(x => x.trim())
      .filter(Boolean)
      .join(" ");
  }
  if (v.tipoPersona === "Persona Jurídica") {
    return (v.razonSocial ?? "").trim();
  }
  return "";
}

/**
 * Nombre a persistir. Si la identificación aún no da nada (registro antiguo
 * editado sin tocar nombres/razón social, o tipo de persona vacío) se conserva
 * el nombre anterior: nunca se deja el proveedor en blanco.
 */
export function nombreGuardado(v: ProveedorFormValues, previo = ""): string {
  return nombreDeIdentificacion(v) || (v.nombre ?? "").trim() || previo.trim();
}

/**
 * Campos nuevos del modelo (ver `Supplier` en SuppliersScreen). Se copian tal
 * cual del formulario: lo que se capturó o "" cuando el tipo de persona no los
 * usa, para que el objeto guardado siempre tenga los mismos llavados.
 * `razonSocial` no aparece porque en el modelo vive dentro de `nombre`.
 */
export function datosNuevosProveedor(v: ProveedorFormValues) {
  return {
    nombres: v.nombres ?? "",
    apellidos: v.apellidos ?? "",
    tipoDocumento: v.tipoDocumento ?? "",
    numeroDocumento: v.numeroDocumento ?? "",
    dv: v.dv ?? "",
    tipoSociedad: v.tipoSociedad ?? "",
    nombreComercial: v.nombreComercial ?? "",
    camaraComercioNombre: v.camaraComercioNombre ?? "",
    camaraComercioArchivo: v.camaraComercioArchivo ?? "",
    fechaExpedicionCamara: v.fechaExpedicionCamara ?? "",
    contactoNombre: v.contactoNombre ?? "",
    contactoTelefono: v.contactoTelefono ?? "",
    contactoTelefonoFijo: v.contactoTelefonoFijo ?? "",
    contactoEmail: v.contactoEmail ?? "",
    repLegalNombres: v.repLegalNombres ?? "",
    repLegalApellidos: v.repLegalApellidos ?? "",
    repLegalTipoDocumento: v.repLegalTipoDocumento ?? "",
    repLegalNumeroDocumento: v.repLegalNumeroDocumento ?? "",
    repLegalTelefono: v.repLegalTelefono ?? "",
    repLegalEmail: v.repLegalEmail ?? "",
  };
}

/**
 * Rellena los campos VIEJOS que siguen leyendo el resto de la app (compras,
 * órdenes y listados muestran asesor/teléfono/email del proveedor) y que el
 * backend exige obligatorios:
 *  · Persona Jurídica → del bloque Contacto comercial.
 *  · Persona Natural  → de SUS propios Teléfono/Email, y como asesor va el
 *    Nombre completo (decisión: la persona natural es su propio contacto).
 * Si un registro viejo no trae dato, se conserva el anterior (`previo`).
 */
export function contactoGuardado(
  v: ProveedorFormValues,
  previo: { asesorComercial?: string; telefono?: string; email?: string } = {},
) {
  const esJuridica = v.tipoPersona === "Persona Jurídica";
  if (esJuridica) {
    return {
      asesorComercial: (v.contactoNombre ?? "").trim(),
      telefono: (v.contactoTelefono ?? "").trim(),
      email: (v.contactoEmail ?? "").trim(),
    };
  }
  const asesor =
    (v.nombreCompleto ?? "").trim() ||
    [v.nombres ?? "", v.apellidos ?? ""].map(x => x.trim()).filter(Boolean).join(" ") ||
    (v.nombre ?? "").trim() ||
    (previo.asesorComercial ?? "");
  return {
    asesorComercial: asesor,
    telefono: (v.telefono ?? "").trim() || (previo.telefono ?? ""),
    email: (v.email ?? "").trim() || (previo.email ?? ""),
  };
}

/** Asegura que los campos nuevos existan (nunca `undefined`): sin esto, un
 *  formulario montado desde Orden de Compra/Compra (que solo siembra los campos
 *  viejos) dejaría los inputs sin controlar y React perdería el valor. */
function conCamposNuevos(v: ProveedorFormValues): ProveedorFormValues {
  /** Une dos palabras en blanco ("Ana" + "María" → "Ana María"); vacío si no
   *  hay con qué (registros antiguos o alta nueva). */
  const unir = (a?: string, b?: string) =>
    [a ?? "", b ?? ""].map(x => x.trim()).filter(Boolean).join(" ");
  // Semilla del campo "Nombre completo": primero los dos campos del modelo
  // (así al editar un proveedor viejo no se pierde el apellido) y, si no hay,
  // el `nombre` que trae el alta desde el buscador de Orden de Compra/Compra
  // (el hook monta con tipoPersona = Natural y esos formularios solo siembran
  // `nombre`: sin esto el campo se vería vacío con un nombre ya escrito).
  const semillaNombre = unir(v.nombres, v.apellidos) ||
    (v.tipoPersona === "Persona Jurídica" ? "" : (v.nombre ?? "").trim());
  return {
    ...v,
    nombres: v.nombres ?? "",
    apellidos: v.apellidos ?? "",
    // El formulario pinta UN solo campo: se siembra desde los dos campos del
    // modelo para que al editar un proveedor viejo no se pierda el apellido.
    nombreCompleto: v.nombreCompleto ?? semillaNombre,
    tipoDocumento: v.tipoDocumento ?? "",
    numeroDocumento: v.numeroDocumento ?? "",
    dv: v.dv ?? "",
    razonSocial: v.razonSocial ?? "",
    nombreComercial: v.nombreComercial ?? "",
    tipoSociedad: v.tipoSociedad ?? "",
    camaraComercioNombre: v.camaraComercioNombre ?? "",
    camaraComercioArchivo: v.camaraComercioArchivo ?? "",
    fechaExpedicionCamara: v.fechaExpedicionCamara ?? "",
    contactoNombre: v.contactoNombre ?? "",
    contactoTelefono: v.contactoTelefono ?? "",
    contactoTelefonoFijo: v.contactoTelefonoFijo ?? "",
    contactoEmail: v.contactoEmail ?? "",
    repLegalNombres: v.repLegalNombres ?? "",
    repLegalApellidos: v.repLegalApellidos ?? "",
    repLegalNombreCompleto: v.repLegalNombreCompleto ?? unir(v.repLegalNombres, v.repLegalApellidos),
    repLegalTipoDocumento: v.repLegalTipoDocumento ?? "",
    repLegalNumeroDocumento: v.repLegalNumeroDocumento ?? "",
    repLegalTelefono: v.repLegalTelefono ?? "",
    repLegalEmail: v.repLegalEmail ?? "",
  };
}

// ─── Validadores pequeños reutilizados por las dos ramas ──────────────────────

/** Texto obligatorio, solo letras y espacios. */
function exigirLetras(e: ProveedorFormErrors, campo: keyof ProveedorFormValues, valor: string | undefined, vacio: string, invalido: string) {
  const v = (valor ?? "").trim();
  if (!v) e[campo] = vacio;
  else if (!RE_SOLO_LETRAS.test(v)) e[campo] = invalido;
}

/** Número de documento: obligatorio si `obligatorio`, solo dígitos y 5–10. */
function validarNumeroDocumento(e: ProveedorFormErrors, campo: keyof ProveedorFormValues, valor: string | undefined, obligatorio: boolean) {
  const d = (valor ?? "").trim();
  if (!d) {
    if (obligatorio) e[campo] = "El número de documento es obligatorio.";
    return;
  }
  if (!/^\d+$/.test(d)) e[campo] = "El número de documento solo puede contener dígitos.";
  else if (d.length > DOCUMENTO_MAX) e[campo] = `El número de documento no puede tener más de ${DOCUMENTO_MAX} dígitos.`;
  else if (d.length < DOCUMENTO_MIN) e[campo] = `El número de documento debe tener al menos ${DOCUMENTO_MIN} dígitos.`;
}

/** Select de tipo de documento (CC / CE / Pasaporte). */
function validarTipoDocumento(e: ProveedorFormErrors, campo: keyof ProveedorFormValues, valor: string | undefined) {
  const v = (valor ?? "").trim();
  if (!v) e[campo] = "Selecciona el tipo de documento.";
  else if (!TIPOS_DOCUMENTO.includes(v as TipoDocumento)) e[campo] = "Selecciona un tipo de documento válido.";
}

/**
 * Teléfono (celular / fijo del proveedor): solo dígitos y, si es obligatorio,
 * exactamente `TELEFONO_LENGTH` — la MISMA regla que ya usaba el contacto
 * comercial de Persona Jurídica (se aplica también a Persona Natural).
 */
function validarTelefonoCampo(
  e: ProveedorFormErrors,
  campo: keyof ProveedorFormValues,
  valor: string | undefined,
  obligatorio: boolean,
  etiqueta = "El teléfono",
) {
  const t = (valor ?? "").replace(/\s/g, "");
  if (!t) {
    if (obligatorio) e[campo] = `${etiqueta} es obligatorio.`;
    return;
  }
  if (!/^\d+$/.test(t)) e[campo] = `${etiqueta} solo puede contener números.`;
  else if (t.length !== TELEFONO_LENGTH) e[campo] = `${etiqueta} debe tener exactamente ${TELEFONO_LENGTH} dígitos.`;
}

/**
 * Campos que PINTA y VALIDA cada tipo de persona. Sirve para limpiar, al
 * alternar con los botones, lo que quedó tocado del tipo que se dejó (regla de
 * exclusión): así un error viejo del otro tipo no reaparece al volver.
 */
const CAMPOS_POR_TIPO: Record<TipoPersona, (keyof ProveedorFormValues)[]> = {
  "Persona Natural": [
    "tipoPersona", "tipoDocumento", "numeroDocumento", "nombreCompleto",
    "nombres", "apellidos", "nombre", "telefono", "email", "direccion", "estado",
  ],
  "Persona Jurídica": [
    "tipoPersona", "razonSocial", "nombreComercial", "nit", "tipoSociedad",
    "nombre", "estado", "contactoNombre", "contactoTelefono", "contactoTelefonoFijo",
    "contactoEmail", "direccion", "camaraComercioArchivo", "camaraComercioNombre",
    "repLegalTipoDocumento", "repLegalNumeroDocumento",
    "repLegalNombreCompleto", "repLegalNombres", "repLegalApellidos",
    "repLegalTelefono", "repLegalEmail",
  ],
};

/**
 * Hook reutilizable para formularios de proveedor.
 * Centraliza todas las validaciones para que todos los formularios se comporten igual.
 */
export function useProveedorForm(
  inicial: ProveedorFormValues,
  existentes: { nit: string; nombre: string }[] = [],
  opciones: { bloquearNombre?: boolean; bloquearNit?: boolean } = {},
) {
  const [values, setValues] = useState<ProveedorFormValues>(() => conCamposNuevos(inicial));
  const [tocado, setTocado] = useState<Partial<Record<keyof ProveedorFormValues, boolean>>>({});
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  /** Errores que vienen del SERVIDOR (409 "Ya existe un proveedor con ese
      NIT", "…con ese correo"…): se pintan bajo su campo junto a los locales y
      se limpian al editar ese campo. */
  const [erroresServidor, setErroresServidor] = useState<ProveedorFormErrors>({});

  /**
   * Único punto de escritura. Además de guardar el campo, mantiene los
   * DERIVADOS para que el resto de la app siga leyendo lo de siempre:
   *  · `nombre` ← Nombres + Apellidos (Natural) o Razón social (Jurídica).
   *    Así Orden de Compra y Compra, que guardan `form.values.nombre` sin
   *    conocer los campos nuevos, persisten el nombre correcto.
   *  · asesor/teléfono/email ← contacto comercial (solo Jurídica).
   */
  const setCampo = useCallback(<K extends keyof ProveedorFormValues>(campo: K, valor: ProveedorFormValues[K]) => {
    // Al editar un campo se limpia el error del servidor que vivía en él
    // (p. ej. "Ya existe un proveedor con ese NIT").
    setErroresServidor(prev => {
      if (!prev[campo]) return prev;
      const next = { ...prev };
      delete next[campo];
      return next;
    });

    // Regla de exclusión al alternar Persona Natural ↔ Persona Jurídica: se
    // borran TODOS los errores del servidor (el 409 de NIT/correo dejo de
    // aplicar) y lo que quedó tocado de los campos del tipo que se dejó. Así
    // no queda ningún error invisible apagando el botón de guardar.
    if (campo === "tipoPersona") {
      setErroresServidor({});
      const aplicables = new Set<keyof ProveedorFormValues>([
        "tipoPersona",
        ...(CAMPOS_POR_TIPO[valor as TipoPersona] ?? []),
      ]);
      setTocado(prev => {
        const next: Partial<Record<keyof ProveedorFormValues, boolean>> = {};
        (Object.keys(prev) as (keyof ProveedorFormValues)[]).forEach(k => {
          if (aplicables.has(k)) next[k] = true;
        });
        return next;
      });
    }
    setValues(prev => {
      const next: ProveedorFormValues = { ...prev, [campo]: valor };

      // Al elegir tipo de persona se "siembra" la identificación con el nombre
      // que ya se tenía (en Orden de Compra/Compra el nombre llega en la caja
      // de búsqueda): si no, al pasar a Natural/Jurídica el prellenado se
      // perdería de un plumazo.
      if (campo === "tipoPersona") {
        const actual = (prev.nombre ?? "").trim();
        if (actual && !(next.nombres ?? "").trim() && !(next.apellidos ?? "").trim()) {
          if (valor === "Persona Natural") {
            const partes = actual.split(/\s+/);
            next.nombres = partes[0] ?? "";
            next.apellidos = partes.slice(1).join(" ");
            // El formulario Natural pinta UN solo campo: se rellena con el
            // nombre completo para que el prellenado del buscador no se pierda.
            next.nombreCompleto = actual;
          } else if (valor === "Persona Jurídica" && !(next.razonSocial ?? "").trim()) {
            next.razonSocial = actual;
          }
        }
      }

      // "Nombre completo" (Persona Natural) y "Nombre completo" del
      // representante legal: en pantalla es UN campo y aquí se desdobla en los
      // dos llavados del modelo, de modo que el payload sigue armando
      // `nombre` / `rep_legal_nombre` con "nombres + apellidos" como siempre.
      if (campo === "nombreCompleto") {
        const texto = String(valor ?? "");
        next.nombres = texto;
        next.apellidos = "";
        if (texto.trim()) next.nombre = texto.trim();
      }
      if (campo === "repLegalNombreCompleto") {
        const texto = String(valor ?? "");
        next.repLegalNombres = texto;
        next.repLegalApellidos = "";
      }

      // Recalcular el nombre derivado SOLO cuando el tipo ya permite derivarlo
      // y el resultado no queda vacío: así no se borra el nombre mientras el
      // usuario tiene el campo de identificación momentáneamente en blanco.
      if (campo === "tipoPersona" || campo === "nombres" || campo === "apellidos" || campo === "razonSocial") {
        const derivado = nombreDeIdentificacion(next);
        if (derivado) next.nombre = derivado;
      }

      // Persona Jurídica: el contacto comercial alimenta los campos viejos.
      if (
        next.tipoPersona === "Persona Jurídica" &&
        (campo === "contactoNombre" || campo === "contactoTelefono" || campo === "contactoEmail")
      ) {
        const texto = String(valor ?? "");
        if (campo === "contactoNombre") next.asesorComercial = texto;
        if (campo === "contactoTelefono") next.telefono = texto;
        if (campo === "contactoEmail") next.email = texto;
      }

      return next;
    });
  }, []);

  const marcarTocado = useCallback((campo: keyof ProveedorFormValues) => {
    setTocado(prev => ({ ...prev, [campo]: true }));
  }, []);

  const errors: ProveedorFormErrors = useMemo(() => {
    const e: ProveedorFormErrors = {};

    const esNatural = values.tipoPersona === "Persona Natural";
    const esJuridica = values.tipoPersona === "Persona Jurídica";
    // "" = sin elegir todavía: solo se exige el tipo (el formulario no pinta
    // campos hasta que el usuario elige, así que nada más puede validarse).
    const sinTipo = !esNatural && !esJuridica;

    // Punto 12: tipo de persona: obligatorio. El select no deja escribir otra
    // cosa, pero el chequeo cubre el alta con el campo sin tocar ("" inicial).
    if (sinTipo) e.tipoPersona = "Selecciona el tipo de persona.";

    // ────────────────────────────────────────────────────────────────────────
    // REGLA DE EXCLUSIÓN (crítica): lo que sigue solo se revisa cuando el tipo
    // de persona lo pide. Persona Natural NO valida ni pide nada de Jurídica y
    // viceversa; al alternar con los botones, `setCampo("tipoPersona")` limpia
    // lo tocado y los errores del servidor del tipo que se dejó.
    // ────────────────────────────────────────────────────────────────────────

    // ── Persona Natural: los 7 campos del formulario. SIN NIT y SIN DV: ni se
    // piden ni se validan (aunque un registro viejo traiga valor guardado). ──
    if (esNatural) {
      validarTipoDocumento(e, "tipoDocumento", values.tipoDocumento);
      validarNumeroDocumento(e, "numeroDocumento", values.numeroDocumento, true);
      exigirLetras(
        e, "nombreCompleto", values.nombreCompleto,
        "El nombre completo es obligatorio.",
        "El nombre completo solo puede contener letras y espacios.",
      );
      validarTelefonoCampo(e, "telefono", values.telefono, true, "El teléfono");
      const correoNatural = validarCorreo(values.email ?? "");
      if (correoNatural) e.email = correoNatural;
      const dirNatural = validarDireccion(values.direccion ?? "");
      if (dirNatural) e.direccion = dirNatural;
    }

    // ── Persona Jurídica: NIT y DV obligatorios y válidos SOLO aquí. ──
    if (esJuridica) {
      const nit = (values.nit ?? "").trim();
      if (!nit) {
        e.nit = "El NIT es obligatorio.";
      } else if (nit.length !== NIT_LENGTH) {
        e.nit = `El NIT debe tener exactamente ${NIT_LENGTH} dígitos.`;
      } else if (existentes.some(x => filtrarNit(x.nit) === nit)) {
        // Se compara solo dígitos: las semillas guardan el NIT con formato
        // ("830.115.220-1") y el campo siempre trae 10 dígitos ("8301152201"),
        // por lo que la comparación literal nunca detectaba el duplicado.
        e.nit = "Ya existe un proveedor con este NIT.";
      }
      // DV: FUERA del diseño y de la validación del cliente (decisión). Su
      // valor sigue en el estado y se envía en el payload, sin exigirse aquí.
    }

    // ── Nombre (derivado de la identificación): sigue obligatorio porque es
    // lo que muestran listados, compras y órdenes. En Jurídica usa la regla
    // de la razón social, que admite puntos ("Quesos del Norte S.A.S."); en
    // Natural es el mismo texto del campo "Nombre completo" (solo letras).
    // Sin tipo todavía no se valida: el único error pintable es el de tipo. ──
    if (!sinTipo) {
      const nombre = (values.nombre ?? "").trim();
      if (!nombre) {
        e.nombre = "El nombre es obligatorio.";
      } else if (esJuridica) {
        if (!RE_RAZON_SOCIAL.test(nombre)) e.nombre = "La razón social contiene caracteres no permitidos.";
        else if (nombre.length > 120) e.nombre = "La razón social no puede tener más de 120 caracteres.";
      } else if (!RE_SOLO_LETRAS.test(nombre)) {
        e.nombre = "El nombre solo puede contener letras y espacios.";
      }
    }

    // ── Persona Jurídica: los campos de los tres bloques. ──
    if (esJuridica) {
      const razon = (values.razonSocial ?? "").trim();
      if (!razon) e.razonSocial = "La razón social es obligatoria.";
      else if (!RE_RAZON_SOCIAL.test(razon)) e.razonSocial = "La razón social solo puede contener letras, números y los caracteres . , & ( ) / - #.";
      else if (razon.length > 120) e.razonSocial = "La razón social no puede tener más de 120 caracteres.";

      // Nombre comercial (opcional): mismo repertorio que la razón social.
      const comercial = (values.nombreComercial ?? "").trim();
      if (comercial) {
        if (!RE_RAZON_SOCIAL.test(comercial)) e.nombreComercial = "El nombre comercial solo puede contener letras, números y los caracteres . , & ( ) / - #.";
        else if (comercial.length > 100) e.nombreComercial = "El nombre comercial no puede tener más de 100 caracteres.";
      }

      const sociedad = (values.tipoSociedad ?? "").trim();
      if (!sociedad) e.tipoSociedad = "Selecciona el tipo de sociedad.";
      else if (!TIPOS_SOCIEDAD.includes(sociedad as TipoSociedad)) e.tipoSociedad = "Selecciona un tipo de sociedad válido.";

      // Dirección comercial (bloque Contacto comercial).
      const dirJur = validarDireccion(values.direccion ?? "");
      if (dirJur) e.direccion = dirJur.replace("La dirección es", "La dirección comercial es");

      // Adjunto de Cámara de Comercio: opcional. Si existe, tiene que ser un
      // PDF o una imagen y haberse podido cargar completo.
      const archivo = (values.camaraComercioNombre ?? "").trim();
      if (archivo) {
        if (!/\.(pdf|jpe?g|png|webp)$/i.test(archivo)) {
          e.camaraComercioArchivo = "Adjunta un archivo PDF o una imagen (JPG, PNG, WEBP).";
        } else if (!(values.camaraComercioArchivo ?? "")) {
          e.camaraComercioArchivo = "No se pudo cargar el archivo: máximo 5 MB.";
        } else if ((values.camaraComercioArchivo ?? "").length > ADJUNTO_MAX_CHARS) {
          e.camaraComercioArchivo = "El archivo no puede superar los 5 MB.";
        }
      }
      // Fecha de expedición: FUERA del diseño y de la validación del cliente
      // (decisión). El valor existente se conserva en el estado sin pintarse.

      // ── Contacto comercial: email, celular, fijo (opcional), dirección y
      // el nombre, que se conserva por ser obligatorio en el backend. ──
      const correoContacto = validarCorreo(values.contactoEmail ?? "");
      if (correoContacto) e.contactoEmail = correoContacto;
      validarTelefonoCampo(e, "contactoTelefono", values.contactoTelefono, true, "El teléfono celular");
      // Fijo: opcional; si se llena aplica la misma regla de dígitos.
      const fijo = (values.contactoTelefonoFijo ?? "").replace(/\s/g, "");
      if (fijo) {
        if (!/^\d+$/.test(fijo)) e.contactoTelefonoFijo = "El teléfono fijo solo puede contener números.";
        else if (fijo.length < TELEFONO_MIN || fijo.length > TELEFONO_LENGTH) {
          e.contactoTelefonoFijo = `El teléfono fijo debe tener entre ${TELEFONO_MIN} y ${TELEFONO_LENGTH} dígitos.`;
        }
      }
      exigirLetras(e, "contactoNombre", values.contactoNombre, "El nombre de contacto es obligatorio.", "El nombre de contacto solo puede contener letras y espacios.");

      // ── Representante legal: un solo campo de nombre completo + sus docs. ──
      validarTipoDocumento(e, "repLegalTipoDocumento", values.repLegalTipoDocumento);
      validarNumeroDocumento(e, "repLegalNumeroDocumento", values.repLegalNumeroDocumento, true);
      exigirLetras(
        e, "repLegalNombreCompleto", values.repLegalNombreCompleto,
        "El nombre completo del representante legal es obligatorio.",
        "El nombre completo solo puede contener letras y espacios.",
      );
      validarTelefonoCampo(e, "repLegalTelefono", values.repLegalTelefono, true, "El teléfono del representante legal");
      const repEmail = (values.repLegalEmail ?? "").trim();
      if (!repEmail) e.repLegalEmail = "El email del representante legal es obligatorio.";
      else {
        const repErr = validarCorreo(repEmail);
        if (repErr) e.repLegalEmail = repErr;
      }
    }

    // NOTA: los campos viejos (teléfono, email y asesor comercial de la
    // persona JURÍDICA) no se validan: los pinta el contacto comercial
    // (contactoTelefono/contactoEmail/contactoNombre) y exigirlos aquí
    // dejaría sin guardar cualquier registro antiguo que no los traiga.
    // En Persona Natural SÍ se validan `telefono` y `email` porque el
    // formulario los pide y el backend los exige.

    return e;
  }, [values, existentes]);

  const formValido = Object.keys({ ...errors, ...erroresServidor }).length === 0;

  const obtenerError = (campo: keyof ProveedorFormValues): string | undefined => {
    if (opciones.bloquearNombre && campo === "nombre") return undefined;
    if (opciones.bloquearNit && campo === "nit") return undefined;
    if (erroresServidor[campo]) return erroresServidor[campo];
    return (tocado[campo] || intentoGuardar) ? errors[campo] : undefined;
  };

  const campoCls = (campo: keyof ProveedorFormValues): string => {
    const err = obtenerError(campo);
    return err ? "border-red-400 focus:ring-red-300" : "";
  };

  /**
   * FASE 2: el botón NO envía con errores y enfoca el PRIMER campo inválido.
   * Marca el formulario como intentado (para que se pinten todos los mensajes
   * que falten) y recorre los campos PINTADOS en orden visual (`data-prov-campo`
   * es el atributo que pinta `ProveedorFormCampos`), así el foco cae en lo que
   * el usuario ve primero, no en el orden interno de las validaciones.
   *
   * Devuelve `true` si había errores: quien llama NO debe enviar el formulario.
   * `excluir` son llaves que el formulario no pinta como editables (el NIT y
   * el nombre heredado al editar del módulo Proveedores).
   */
  const enfocarPrimeroInvalido = useCallback(
    (excluir: (keyof ProveedorFormValues)[] = []): boolean => {
      setIntentoGuardar(true);
      const err: ProveedorFormErrors = { ...errors, ...erroresServidor };
      const pendientes = (Object.keys(err) as (keyof ProveedorFormValues)[])
        .filter(c => !excluir.includes(c));
      if (pendientes.length === 0) return false;

      const nodos = document.querySelectorAll<HTMLElement>("[data-prov-campo]");
      for (const nodo of nodos) {
        const campo = (nodo.getAttribute("data-prov-campo") ?? "") as keyof ProveedorFormValues;
        if (!campo || !pendientes.includes(campo)) continue;
        const foco = nodo.matches("input, select, textarea, button")
          ? nodo
          : nodo.querySelector<HTMLElement>("input, select, textarea, button");
        foco?.focus({ preventScroll: true });
        nodo.scrollIntoView({ block: "center", behavior: "smooth" });
        return true;
      }
      // Hay errores pero el campo no está pintado (p. ej. solo el NIT): se
      // bloquea igual el envío y el caller muestra su aviso.
      return true;
    },
    [errors, erroresServidor],
  );

  const reset = useCallback(() => {
    setValues(conCamposNuevos(inicial));
    setTocado({});
    setIntentoGuardar(false);
    setErroresServidor({});
  }, [inicial]);

  /** Marca un error del SERVIDOR bajo su campo (NIT/correo repetidos, etc.). */
  const setErrorServidor = useCallback((campo: keyof ProveedorFormValues, mensaje: string) => {
    setErroresServidor(prev => ({ ...prev, [campo]: mensaje }));
    setTocado(prev => ({ ...prev, [campo]: true }));
  }, []);

  return {
    values,
    setCampo,
    marcarTocado,
    errors: { ...errors, ...erroresServidor },
    formValido,
    obtenerError,
    campoCls,
    enfocarPrimeroInvalido,
    reset,
    setErrorServidor,
    setIntentoGuardar,
    intentoGuardar,
  };
}

/** API del hook: la usan los componentes que renderizan los campos. */
export type ProveedorFormApi = ReturnType<typeof useProveedorForm>;

