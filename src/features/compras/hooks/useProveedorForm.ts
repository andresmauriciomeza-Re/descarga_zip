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

  /** Persona Natural. */
  nombres?: string;
  apellidos?: string;
  tipoDocumento?: TipoDocumento | "";
  numeroDocumento?: string;
  /** DV (dígito de verificación): opcional en Natural, obligatorio en Jurídica. */
  dv?: string;
  /** Persona Jurídica. En el modelo NO existe como campo: se guarda en `nombre`. */
  razonSocial?: string;
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
  contactoEmail?: string;
  /** Representante legal (solo Persona Jurídica). */
  repLegalNombres?: string;
  repLegalApellidos?: string;
  repLegalTipoDocumento?: TipoDocumento | "";
  repLegalNumeroDocumento?: string;
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

/** DV al escribir: solo dígitos, 1 o 2 como pide la DIAN. */
export function filtrarDv(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, 2);
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
    camaraComercioNombre: v.camaraComercioNombre ?? "",
    camaraComercioArchivo: v.camaraComercioArchivo ?? "",
    fechaExpedicionCamara: v.fechaExpedicionCamara ?? "",
    contactoNombre: v.contactoNombre ?? "",
    contactoTelefono: v.contactoTelefono ?? "",
    contactoEmail: v.contactoEmail ?? "",
    repLegalNombres: v.repLegalNombres ?? "",
    repLegalApellidos: v.repLegalApellidos ?? "",
    repLegalTipoDocumento: v.repLegalTipoDocumento ?? "",
    repLegalNumeroDocumento: v.repLegalNumeroDocumento ?? "",
  };
}

/**
 * Completar el contacto comercial de Persona Jurídica en los campos VIEJOS que
 * siguen leyendo el resto de la app (compras, órdenes y listados muestran
 * asesor/teléfono/email del proveedor). En Persona Natural no hay contacto
 * comercial en el formulario, así que se quedan los valores que ya traía.
 */
export function contactoGuardado(
  v: ProveedorFormValues,
  previo: { asesorComercial?: string; telefono?: string; email?: string } = {},
) {
  const esJuridica = v.tipoPersona === "Persona Jurídica";
  return {
    asesorComercial: esJuridica ? (v.contactoNombre ?? "").trim() : (previo.asesorComercial ?? ""),
    telefono: esJuridica ? (v.contactoTelefono ?? "").trim() : (previo.telefono ?? ""),
    email: esJuridica ? (v.contactoEmail ?? "").trim() : (previo.email ?? ""),
  };
}

/** Asegura que los campos nuevos existan (nunca `undefined`): sin esto, un
 *  formulario montado desde Orden de Compra/Compra (que solo siembra los campos
 *  viejos) dejaría los inputs sin controlar y React perdería el valor. */
function conCamposNuevos(v: ProveedorFormValues): ProveedorFormValues {
  return {
    ...v,
    nombres: v.nombres ?? "",
    apellidos: v.apellidos ?? "",
    tipoDocumento: v.tipoDocumento ?? "",
    numeroDocumento: v.numeroDocumento ?? "",
    dv: v.dv ?? "",
    razonSocial: v.razonSocial ?? "",
    tipoSociedad: v.tipoSociedad ?? "",
    camaraComercioNombre: v.camaraComercioNombre ?? "",
    camaraComercioArchivo: v.camaraComercioArchivo ?? "",
    fechaExpedicionCamara: v.fechaExpedicionCamara ?? "",
    contactoNombre: v.contactoNombre ?? "",
    contactoTelefono: v.contactoTelefono ?? "",
    contactoEmail: v.contactoEmail ?? "",
    repLegalNombres: v.repLegalNombres ?? "",
    repLegalApellidos: v.repLegalApellidos ?? "",
    repLegalTipoDocumento: v.repLegalTipoDocumento ?? "",
    repLegalNumeroDocumento: v.repLegalNumeroDocumento ?? "",
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

  /**
   * Único punto de escritura. Además de guardar el campo, mantiene los
   * DERIVADOS para que el resto de la app siga leyendo lo de siempre:
   *  · `nombre` ← Nombres + Apellidos (Natural) o Razón social (Jurídica).
   *    Así Orden de Compra y Compra, que guardan `form.values.nombre` sin
   *    conocer los campos nuevos, persisten el nombre correcto.
   *  · asesor/teléfono/email ← contacto comercial (solo Jurídica).
   */
  const setCampo = useCallback(<K extends keyof ProveedorFormValues>(campo: K, valor: ProveedorFormValues[K]) => {
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
          } else if (valor === "Persona Jurídica" && !(next.razonSocial ?? "").trim()) {
            next.razonSocial = actual;
          }
        }
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

    // ── NIT: obligatorio en Jurídica (y en los flujos heredados sin tipo),
    // OPCIONAL en Persona Natural; en todos los casos, si se llena tiene que
    // ser válido y no puede estar repetido. ──
    const nit = (values.nit ?? "").trim();
    if (!nit) {
      if (esJuridica || sinTipo) e.nit = "El NIT es obligatorio.";
    } else if (nit.length !== NIT_LENGTH) {
      e.nit = `El NIT debe tener exactamente ${NIT_LENGTH} dígitos.`;
    } else if (existentes.some(x => filtrarNit(x.nit) === nit)) {
      // Se compara solo dígitos: las semillas guardan el NIT con formato
      // ("830.115.220-1") y el campo siempre trae 10 dígitos ("8301152201"),
      // por lo que la comparación literal nunca detectaba el duplicado.
      e.nit = "Ya existe un proveedor con este NIT.";
    }

    // ── DV (dígito de verificación): 1 o 2 dígitos. Obligatorio solo en
    // Persona Jurídica; en Natural es un dato opcional. ──
    const dv = (values.dv ?? "").trim();
    if (!dv) {
      if (esJuridica) e.dv = "El DV es obligatorio.";
    } else if (!/^\d{1,2}$/.test(dv)) {
      e.dv = "El DV debe tener 1 o 2 dígitos.";
    }

    // ── Nombre (derivado de la identificación): sigue obligatorio porque es
    // lo que muestran listados, compras y órdenes. En Jurídica usa la regla
    // de la razón social, que admite puntos ("Quesos del Norte S.A.S."). ──
    const nombre = (values.nombre ?? "").trim();
    if (!nombre) {
      e.nombre = "El nombre es obligatorio.";
    } else if (esJuridica) {
      if (!RE_RAZON_SOCIAL.test(nombre)) e.nombre = "La razón social contiene caracteres no permitidos.";
      else if (nombre.length > 120) e.nombre = "La razón social no puede tener más de 120 caracteres.";
    } else if (!RE_SOLO_LETRAS.test(nombre)) {
      e.nombre = "El nombre solo puede contener letras y espacios.";
    }

    // ── Persona Natural: exactamente los 6 campos del formulario. ──
    if (esNatural) {
      exigirLetras(e, "nombres", values.nombres, "Los nombres son obligatorios.", "Los nombres solo pueden contener letras y espacios.");
      exigirLetras(e, "apellidos", values.apellidos, "Los apellidos son obligatorios.", "Los apellidos solo pueden contener letras y espacios.");
      validarTipoDocumento(e, "tipoDocumento", values.tipoDocumento);
      validarNumeroDocumento(e, "numeroDocumento", values.numeroDocumento, true);
      // NIT y DV opcionales: la rama de arriba ya exige validez si se llenan.
    }

    // ── Persona Jurídica: exactamente los campos del formulario. ──
    if (esJuridica) {
      const razon = (values.razonSocial ?? "").trim();
      if (!razon) e.razonSocial = "La razón social es obligatoria.";
      else if (!RE_RAZON_SOCIAL.test(razon)) e.razonSocial = "La razón social solo puede contener letras, números y los caracteres . , & ( ) / - #.";
      else if (razon.length > 120) e.razonSocial = "La razón social no puede tener más de 120 caracteres.";

      const sociedad = (values.tipoSociedad ?? "").trim();
      if (!sociedad) e.tipoSociedad = "Selecciona el tipo de sociedad.";
      else if (!TIPOS_SOCIEDAD.includes(sociedad as TipoSociedad)) e.tipoSociedad = "Selecciona un tipo de sociedad válido.";

      // Adjunto de Cámara de Comercio: opcional. Si existe, tiene que ser un
      // PDF o una imagen y haberse podido cargar completo.
      const archivo = (values.camaraComercioNombre ?? "").trim();
      if (archivo) {
        if (!/\.(pdf|jpe?g|png|webp)$/i.test(archivo)) {
          e.camaraComercioArchivo = "Adjunta un archivo PDF o una imagen (JPG, PNG).";
        } else if (!(values.camaraComercioArchivo ?? "")) {
          e.camaraComercioArchivo = "No se pudo cargar el archivo: máximo 5 MB.";
        } else if ((values.camaraComercioArchivo ?? "").length > ADJUNTO_MAX_CHARS) {
          e.camaraComercioArchivo = "El archivo no puede superar los 5 MB.";
        }
      }
      // Decisión: la fecha de expedición es obligatoria SOLO cuando se adjuntó
      // la Cámara de Comercio. Sin archivo no hay de qué fecha hablar y hacerla
      // obligatoria dejaría bloqueado el formulario (sobre todo al editar
      // registros antiguos que nunca tuvieron el documento).
      if (archivo && !(values.fechaExpedicionCamara ?? "").trim()) {
        e.fechaExpedicionCamara = "La fecha de expedición es obligatoria.";
      }

      // Persona de contacto comercial.
      exigirLetras(e, "contactoNombre", values.contactoNombre, "El nombre de contacto es obligatorio.", "El nombre de contacto solo puede contener letras y espacios.");
      const tel = (values.contactoTelefono ?? "").replace(/\s/g, "");
      if (!tel) e.contactoTelefono = "El teléfono es obligatorio.";
      else if (!/^\d+$/.test(tel)) e.contactoTelefono = "El teléfono solo puede contener números.";
      else if (tel.length !== TELEFONO_LENGTH) e.contactoTelefono = `El teléfono debe tener exactamente ${TELEFONO_LENGTH} dígitos.`;
      const correoErr = validarCorreo(values.contactoEmail ?? "");
      if (correoErr) e.contactoEmail = correoErr;

      // Representante legal.
      exigirLetras(e, "repLegalNombres", values.repLegalNombres, "Los nombres del representante legal son obligatorios.", "Los nombres solo pueden contener letras y espacios.");
      exigirLetras(e, "repLegalApellidos", values.repLegalApellidos, "Los apellidos del representante legal son obligatorios.", "Los apellidos solo pueden contener letras y espacios.");
      validarTipoDocumento(e, "repLegalTipoDocumento", values.repLegalTipoDocumento);
      validarNumeroDocumento(e, "repLegalNumeroDocumento", values.repLegalNumeroDocumento, true);
    }

    // NOTA: los campos viejos (teléfono, email, asesor comercial y dirección)
    // ya NO se validan en ninguna rama: el formulario no los pide (los cubre
    // el contacto comercial en Jurídica y no existen en Natural), y exigirlos
    // aquí dejaría sin guardar cualquier registro antiguo que no los traiga.

    return e;
  }, [values, existentes]);

  const formValido = Object.keys(errors).length === 0;

  const obtenerError = (campo: keyof ProveedorFormValues): string | undefined => {
    if (opciones.bloquearNombre && campo === "nombre") return undefined;
    if (opciones.bloquearNit && campo === "nit") return undefined;
    return (tocado[campo] || intentoGuardar) ? errors[campo] : undefined;
  };

  const campoCls = (campo: keyof ProveedorFormValues): string => {
    const err = obtenerError(campo);
    return err ? "border-red-400 focus:ring-red-300" : "";
  };

  const reset = useCallback(() => {
    setValues(conCamposNuevos(inicial));
    setTocado({});
    setIntentoGuardar(false);
  }, [inicial]);

  return {
    values,
    setCampo,
    marcarTocado,
    errors,
    formValido,
    obtenerError,
    campoCls,
    reset,
    setIntentoGuardar,
    intentoGuardar,
  };
}

/** API del hook: la usan los componentes que renderizan los campos. */
export type ProveedorFormApi = ReturnType<typeof useProveedorForm>;

