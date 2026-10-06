import type { ChangeEvent, ReactNode } from "react";
import { EstadoSelect, type EstadoOption } from "./EstadoSelect";
import { MensajeError } from "./campo";
import {
  filtrarNit,
  filtrarNumeroDocumento,
  filtrarDv,
  soloLetras,
  soloDigitos,
  formatoNit,
  TIPOS_DOCUMENTO,
  TIPOS_SOCIEDAD,
  type ProveedorFormApi,
  type ProveedorFormValues,
} from "./useProveedorForm";

// Punto 1: campos compartidos de TODOS los formularios de proveedor (Nuevo
// Proveedor desde Orden de Compra y desde Compra, y Crear/Editar Proveedor del
// módulo Proveedores). Las reglas viven en `useProveedorForm`; aquí solo se
// pinta el formulario para que los tres sitios se comporten idéntico: filtro
// mientras se escribe, mensaje debajo del input con borde rojo mientras hay
// error y label con asterisco en los campos obligatorios.
//
// El formulario es CONDICIONAL por tipo de persona (punto 12): Persona Natural
// pide sus 6 datos de identificación y Persona Jurídica pide los suyos
// (razón social, sociedad, cámara de comercio, contacto y representante legal).
// Como los tres módulos renderizan ESTE componente, el cambio se propaga solo.

const inputCls =
  "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

const lecturaCls =
  "w-full px-3 py-2.5 bg-muted/40 rounded-xl border border-border text-sm text-muted-foreground cursor-not-allowed select-none";

const seccionCls =
  "text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border";

const req = <span className="text-red-500">*</span>;

/** Campos de texto (todo menos el select de Estado). */
type CampoTexto = Exclude<keyof ProveedorFormValues, "estado">;

const OPCIONES_ESTADO: EstadoOption<"activo" | "inactivo">[] = [
  { value: "activo", label: "Activo", color: "bg-emerald-100 text-emerald-800" },
  { value: "inactivo", label: "Inactivo", color: "bg-red-100 text-red-700" },
];

// OJO: `Campo` debe vivir FUERA del componente. Si se define dentro, cada
// render crea un tipo nuevo y React desmonta/remonta todos los inputs (se
// pierden el valor del fill y el foco, y el autoFocus del Nombre se disparaba
// en cada remontaje).
function Campo({
  form,
  label,
  campo,
  children,
  className = "",
}: {
  form: ProveedorFormApi;
  label: ReactNode;
  campo: CampoTexto;
  children: ReactNode;
  /** Para que un campo pueda ocupar las dos columnas de la rejilla. */
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">{label}</label>
      {children}
      <MensajeError err={form.obtenerError(campo)} />
    </div>
  );
}

/** Select genérico: mismo estilo y misma validación en vivo que un input. */
function SelectCampo({
  form,
  label,
  campo,
  valor,
  opciones,
  vacio,
  autoFocus = false,
  className = "",
}: {
  form: ProveedorFormApi;
  label: ReactNode;
  campo: CampoTexto;
  valor: string;
  opciones: readonly string[];
  vacio: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <Campo form={form} label={label} campo={campo} className={className}>
      <select
        value={valor}
        onChange={(e) => {
          form.marcarTocado(campo);
          form.setCampo(campo, e.target.value);
        }}
        onBlur={() => form.marcarTocado(campo)}
        autoFocus={autoFocus}
        className={`${inputCls} cursor-pointer transition-colors ${form.campoCls(campo)}`}
      >
        <option value="">{vacio}</option>
        {opciones.map(op => <option key={op} value={op}>{op}</option>)}
      </select>
    </Campo>
  );
}

export function ProveedorFormCampos({
  form,
  autoFocusNombre = true,
  nitLectura,
}: {
  form: ProveedorFormApi;
  autoFocusNombre?: boolean;
  /**
   * Modo edición del módulo Proveedores: si se pasa, el NIT se pinta como
   * solo lectura (regla del módulo: el NIT no se modifica después de creado)
   * y se omite el input de NIT de la rama correspondiente.
   */
  nitLectura?: string;
}) {
  /** Escribe con el filtro del campo y marca tocado: el mensaje aparece
      mientras se escribe y desaparece en cuanto el valor es válido. */
  const alEscribir = (campo: CampoTexto, filtro: (v: string) => string) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      form.marcarTocado(campo);
      form.setCampo(campo, filtro(e.target.value));
    };

  const alTocar = (campo: CampoTexto) => () => form.marcarTocado(campo);

  /**
   * Cámara de Comercio (adjunto). Mismo patrón de FileReader que la evidencia
   * de ProductosPerecederos/App: el archivo se guarda en dos campos,
   * `camaraComercioNombre` (para mostrarlo) y `camaraComercioArchivo` (dataURL).
   * El archivo se rechaza ANTES de leerlo: convertir un PDF de 40 MB en dataURL
   * dejaría el estado de React pesado; en ese caso se guarda solo el nombre y
   * `useProveedorForm` lo convierte en el error que se pinta debajo.
   */
  const alAdjuntar = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    form.marcarTocado("camaraComercioArchivo");
    const tipoOk = file.type === "application/pdf" || file.type.startsWith("image/");
    const extensionOk = /\.(pdf|jpe?g|png|webp)$/i.test(file.name);
    if ((!tipoOk && !extensionOk) || file.size > 5 * 1024 * 1024) {
      // Se guardan juntos (React 18 agrupa los dos setCampo): el nombre queda
      // y el contenido en "", que es lo que la validación traduce en error.
      form.setCampo("camaraComercioNombre", file.name);
      form.setCampo("camaraComercioArchivo", "");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    // Nombre y contenido se escriben en el MISMO turno: si el nombre se
    // guardara antes, habría un render intermedio con nombre y sin archivo y
    // se parpadearía el error "No se pudo cargar el archivo".
    reader.onload = ev => {
      form.setCampo("camaraComercioNombre", file.name);
      form.setCampo("camaraComercioArchivo", String(ev.target?.result ?? ""));
    };
    reader.onerror = () => {
      form.setCampo("camaraComercioNombre", file.name);
      form.setCampo("camaraComercioArchivo", "");
    };
    reader.readAsDataURL(file);
  };

  /** Quitar el adjunto. La fecha se limpia con él: deja de tener sentido
   *  documentar la expedencia de un documento que ya no está. */
  const quitarAdjunto = () => {
    form.marcarTocado("camaraComercioArchivo");
    form.setCampo("camaraComercioNombre", "");
    form.setCampo("camaraComercioArchivo", "");
    form.setCampo("fechaExpedicionCamara", "");
  };

  const v = form.values;
  const esNatural = v.tipoPersona === "Persona Natural";
  const esJuridica = v.tipoPersona === "Persona Jurídica";
  const hayTipo = esNatural || esJuridica;
  // En edición no hay input de NIT (queda congelado arriba): el módulo no
  // permite modificarlo después de creado el proveedor.
  const pideNit = nitLectura === undefined;

  return (
    <div className="space-y-6">
      <div>
        <p className={seccionCls}>
          Identificación del proveedor
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Modo edición: el NIT queda congelado (regla del módulo), por eso
              no se vuelve a pintar como input más abajo. Si el proveedor se
              creó SIN NIT (Persona Natural puede llevarlo vacío) no hay nada
              que congelar y el input sigue disponible para agregarlo. */}
          {nitLectura !== undefined && nitLectura.trim() !== "" && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">NIT</label>
              <div className={lecturaCls}>{formatoNit(nitLectura)}</div>
              <p className="text-[10px] text-muted-foreground mt-1">
                El NIT no se puede modificar después de creado el proveedor
              </p>
            </div>
          )}

          {/* Punto 12: Tipo de persona (obligatorio). Ocupa las dos columnas
              para no despegar la identificación de la rejilla de 2 que comparten
              los tres formularios. De aquí cuelgan los dos bloques de campos. */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Tipo de persona {req}
            </label>
            <select
              value={v.tipoPersona}
              onChange={(e) => {
                form.marcarTocado("tipoPersona");
                form.setCampo("tipoPersona", e.target.value as ProveedorFormValues["tipoPersona"]);
              }}
              onBlur={() => form.marcarTocado("tipoPersona")}
              className={`${inputCls} cursor-pointer transition-colors ${form.campoCls("tipoPersona")}`}
            >
              <option value="">Selecciona el tipo de persona</option>
              <option value="Persona Natural">Persona Natural</option>
              <option value="Persona Jurídica">Persona Jurídica</option>
            </select>
            <MensajeError err={form.obtenerError("tipoPersona")} />
          </div>

          {!hayTipo && (
            <p className="sm:col-span-2 text-xs text-muted-foreground bg-muted/60 border border-border rounded-xl px-3 py-2.5">
              Selecciona el tipo de persona para ver los datos que se piden.
            </p>
          )}

          {/* ── Persona Natural ───────────────────────────────────────────── */}
          {esNatural && (
            <>
              <Campo form={form} label={<>Nombres {req}</>} campo="nombres">
                <input
                  value={v.nombres ?? ""}
                  onChange={alEscribir("nombres", soloLetras)}
                  onBlur={alTocar("nombres")}
                  placeholder="Nombres"
                  autoFocus={autoFocusNombre}
                  className={`${inputCls} transition-colors ${form.campoCls("nombres")}`}
                />
              </Campo>
              <Campo form={form} label={<>Apellidos {req}</>} campo="apellidos">
                <input
                  value={v.apellidos ?? ""}
                  onChange={alEscribir("apellidos", soloLetras)}
                  onBlur={alTocar("apellidos")}
                  placeholder="Apellidos"
                  className={`${inputCls} transition-colors ${form.campoCls("apellidos")}`}
                />
              </Campo>
              <SelectCampo
                form={form}
                label={<>Tipo de documento {req}</>}
                campo="tipoDocumento"
                valor={v.tipoDocumento ?? ""}
                opciones={TIPOS_DOCUMENTO}
                vacio="Selecciona el tipo de documento"
              />
              <Campo form={form} label={<>Número de documento {req}</>} campo="numeroDocumento">
                <input
                  value={v.numeroDocumento ?? ""}
                  onChange={alEscribir("numeroDocumento", filtrarNumeroDocumento)}
                  onBlur={alTocar("numeroDocumento")}
                  placeholder="Sin puntos ni espacios"
                  inputMode="numeric"
                  maxLength={10}
                  className={`${inputCls} transition-colors ${form.campoCls("numeroDocumento")}`}
                />
              </Campo>
              {/* NIT opcional en Persona Natural: si se llena, la validación
                  exige 10 dígitos y que no esté repetido. */}
              {pideNit && (
                <Campo
                  form={form}
                  label={<>NIT <span className="font-normal">(opcional)</span></>}
                  campo="nit"
                >
                  <input
                    value={v.nit}
                    onChange={alEscribir("nit", filtrarNit)}
                    onBlur={alTocar("nit")}
                    placeholder="Solo números"
                    inputMode="numeric"
                    className={`${inputCls} transition-colors ${form.campoCls("nit")}`}
                  />
                </Campo>
              )}
              <Campo
                form={form}
                label={<>DV <span className="font-normal">(dígito de verificación, opcional)</span></>}
                campo="dv"
              >
                <input
                  value={v.dv ?? ""}
                  onChange={alEscribir("dv", filtrarDv)}
                  onBlur={alTocar("dv")}
                  placeholder="1 a 2 dígitos"
                  inputMode="numeric"
                  maxLength={2}
                  className={`${inputCls} transition-colors ${form.campoCls("dv")}`}
                />
              </Campo>
            </>
          )}

          {/* ── Persona Jurídica ──────────────────────────────────────────── */}
          {esJuridica && (
            <>
              <Campo form={form} label={<>Razón social {req}</>} campo="razonSocial" className="sm:col-span-2">
                <input
                  value={v.razonSocial ?? ""}
                  onChange={alEscribir("razonSocial", (x) => x)}
                  onBlur={alTocar("razonSocial")}
                  placeholder="Ej: Quesos del Norte S.A.S."
                  autoFocus={autoFocusNombre}
                  className={`${inputCls} transition-colors ${form.campoCls("razonSocial")}`}
                />
              </Campo>
              {pideNit && (
                <Campo form={form} label={<>NIT {req}</>} campo="nit">
                  <input
                    value={v.nit}
                    onChange={alEscribir("nit", filtrarNit)}
                    onBlur={alTocar("nit")}
                    placeholder="9001234561"
                    inputMode="numeric"
                    // Sin maxLength: truncaría un NIT pegado con formato
                    // ("900.123.456-1" → "900.123.45") ANTES de poder quitarle
                    // los signos. El tope de 10 dígitos lo aplica filtrarNit.
                    className={`${inputCls} transition-colors ${form.campoCls("nit")}`}
                  />
                </Campo>
              )}
              <Campo form={form} label={<>DV {req}</>} campo="dv">
                <input
                  value={v.dv ?? ""}
                  onChange={alEscribir("dv", filtrarDv)}
                  onBlur={alTocar("dv")}
                  placeholder="1 a 2 dígitos"
                  inputMode="numeric"
                  maxLength={2}
                  className={`${inputCls} transition-colors ${form.campoCls("dv")}`}
                />
              </Campo>
              <SelectCampo
                form={form}
                label={<>Tipo de sociedad {req}</>}
                campo="tipoSociedad"
                valor={v.tipoSociedad ?? ""}
                opciones={TIPOS_SOCIEDAD}
                vacio="Selecciona el tipo de sociedad"
              />
            </>
          )}
        </div>
      </div>

      {/* ── Persona Jurídica: documentación, contacto y representante ─────── */}
      {esJuridica && (
        <>
          <div>
            <p className={seccionCls}>Cámara de Comercio</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo
                form={form}
                label={<>Cámara de Comercio <span className="font-normal">(adjunto, opcional)</span></>}
                campo="camaraComercioArchivo"
              >
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={alAdjuntar}
                  className={`${inputCls} file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-muted file:text-xs file:font-semibold file:text-foreground cursor-pointer ${form.campoCls("camaraComercioArchivo")}`}
                />
                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <span className="text-[10px] text-muted-foreground truncate" title={v.camaraComercioNombre || ""}>
                    {v.camaraComercioNombre || "PDF o imagen (JPG, PNG) hasta 5 MB"}
                  </span>
                  {v.camaraComercioNombre && (
                    <button
                      type="button"
                      onClick={quitarAdjunto}
                      className="text-[10px] font-semibold text-red-500 hover:text-red-600 cursor-pointer shrink-0"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </Campo>
              {/* Decisión: la fecha solo es obligatoria si hay adjunto (ver
                  validación en useProveedorForm); sin archivo queda opcional
                  para no bloquear registros antiguos. */}
              <Campo
                form={form}
                label={
                  <>Fecha de expedición {v.camaraComercioNombre ? req : <span className="font-normal">(opcional)</span>}</>
                }
                campo="fechaExpedicionCamara"
              >
                <input
                  type="date"
                  value={v.fechaExpedicionCamara ?? ""}
                  onChange={alEscribir("fechaExpedicionCamara", (x) => x)}
                  onBlur={alTocar("fechaExpedicionCamara")}
                  className={`${inputCls} transition-colors ${form.campoCls("fechaExpedicionCamara")}`}
                />
              </Campo>
            </div>
          </div>

          <div>
            <p className={seccionCls}>Contacto comercial</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo form={form} label={<>Nombre {req}</>} campo="contactoNombre">
                <input
                  value={v.contactoNombre ?? ""}
                  onChange={alEscribir("contactoNombre", soloLetras)}
                  onBlur={alTocar("contactoNombre")}
                  placeholder="Persona de contacto"
                  className={`${inputCls} transition-colors ${form.campoCls("contactoNombre")}`}
                />
              </Campo>
              <Campo form={form} label={<>Teléfono {req}</>} campo="contactoTelefono">
                <input
                  type="tel"
                  value={v.contactoTelefono ?? ""}
                  onChange={alEscribir("contactoTelefono", soloDigitos)}
                  onBlur={alTocar("contactoTelefono")}
                  placeholder="6043210001"
                  inputMode="numeric"
                  maxLength={10}
                  className={`${inputCls} transition-colors ${form.campoCls("contactoTelefono")}`}
                />
              </Campo>
              <Campo form={form} label={<>Correo {req}</>} campo="contactoEmail">
                <input
                  type="email"
                  value={v.contactoEmail ?? ""}
                  onChange={alEscribir("contactoEmail", (x) => x)}
                  onBlur={alTocar("contactoEmail")}
                  placeholder="ventas@proveedor.co"
                  className={`${inputCls} transition-colors ${form.campoCls("contactoEmail")}`}
                />
              </Campo>
            </div>
          </div>

          <div>
            <p className={seccionCls}>Representante legal</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo form={form} label={<>Nombres {req}</>} campo="repLegalNombres">
                <input
                  value={v.repLegalNombres ?? ""}
                  onChange={alEscribir("repLegalNombres", soloLetras)}
                  onBlur={alTocar("repLegalNombres")}
                  placeholder="Nombres"
                  className={`${inputCls} transition-colors ${form.campoCls("repLegalNombres")}`}
                />
              </Campo>
              <Campo form={form} label={<>Apellidos {req}</>} campo="repLegalApellidos">
                <input
                  value={v.repLegalApellidos ?? ""}
                  onChange={alEscribir("repLegalApellidos", soloLetras)}
                  onBlur={alTocar("repLegalApellidos")}
                  placeholder="Apellidos"
                  className={`${inputCls} transition-colors ${form.campoCls("repLegalApellidos")}`}
                />
              </Campo>
              <SelectCampo
                form={form}
                label={<>Tipo de documento {req}</>}
                campo="repLegalTipoDocumento"
                valor={v.repLegalTipoDocumento ?? ""}
                opciones={TIPOS_DOCUMENTO}
                vacio="Selecciona el tipo de documento"
              />
              <Campo form={form} label={<>Número de documento {req}</>} campo="repLegalNumeroDocumento">
                <input
                  value={v.repLegalNumeroDocumento ?? ""}
                  onChange={alEscribir("repLegalNumeroDocumento", filtrarNumeroDocumento)}
                  onBlur={alTocar("repLegalNumeroDocumento")}
                  placeholder="Sin puntos ni espacios"
                  inputMode="numeric"
                  maxLength={10}
                  className={`${inputCls} transition-colors ${form.campoCls("repLegalNumeroDocumento")}`}
                />
              </Campo>
            </div>
          </div>
        </>
      )}

      <div>
        <p className={seccionCls}>Configuración</p>
        <div className="w-full sm:w-1/2">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Estado</label>
          <EstadoSelect
            value={v.estado}
            onChange={(nuevoEstado) => form.setCampo("estado", nuevoEstado)}
            options={OPCIONES_ESTADO}
          />
        </div>
      </div>
    </div>
  );
}
