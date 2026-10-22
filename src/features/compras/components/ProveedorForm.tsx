import type { ChangeEvent, ReactNode } from "react";
import { useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import * as RadixSelect from "@radix-ui/react-select";
import { EstadoSelect, type EstadoOption } from "@/shared/components/EstadoSelect";
import { SegmentadoButtons } from "@/shared/components/SegmentadoButtons";
import { MensajeError } from "@/shared/components/campo";
import { CalendarDropdown } from "@/shared/components/CalendarDropdown";
import { etiquetaTipoDocumento } from "@/shared/utils/tiposDocumento";
import { useSubirArchivo } from "@/shared/hooks/useSubirArchivo";
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
} from "@/features/compras/hooks/useProveedorForm";

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

/** Radix no admite `value=""` (lo reserva para "sin selección"), así que el
    ítem "vacío" lleva un valor sentinela y al elegirlo se guarda `""`. */
const SELECT_VACIO = "__vacio__";

/** Clases de cada opción del menú, idénticas en tono a las de `UnidadSelect`. */
const itemCls =
  "relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[state=checked]:bg-primary/10";

/**
 * Select genérico: mismo estilo y misma validación en vivo que un input.
 *
 * Usa el mismo Radix Select que `UnidadSelect`/`EstadoSelect` en lugar del
 * `<select>` nativo, que al desplegarse mostraba la lista CUADRADA y con el
 * azul del navegador. El trigger calza con `inputCls` para que el campo se vea
 * idéntico a los demás (redondeo 12px, foco con anillo) y el menú abre con
 * bordes redondeados, tokens de color y opción resaltada en el primario.
 */
function SelectCampo({
  form,
  label,
  campo,
  valor,
  opciones,
  vacio,
  etiquetas,
  ariaLabel,
  className = "",
}: {
  form: ProveedorFormApi;
  label: ReactNode;
  campo: CampoTexto;
  valor: string;
  opciones: readonly string[];
  vacio: string;
  /**
   * Punto 3.1: texto visible distinto del valor guardado ("CC" se ve como
   * "Cédula de Ciudadanía" y se GUARDA igual). Sin esto el ítem pintaría
   * el código interno. El `value` siempre es `op`.
   */
  etiquetas?: (valor: string) => string;
  /**
   * Nombre accesible del disparador (hoy es un `<button>`, no un `<select>`,
   * y `Campo` no enlaza el label por `htmlFor`). Si no se pasa, el menú queda
   * sin nombre para los lectores de pantalla.
   */
  ariaLabel?: string;
  className?: string;
}) {
  const etiquetaDe = (op: string) => (etiquetas ? etiquetas(op) : op);

  return (
    <Campo form={form} label={label} campo={campo} className={className}>
      <RadixSelect.Root
        value={valor || undefined}
        onValueChange={(v) => {
          form.marcarTocado(campo);
          form.setCampo(campo, v === SELECT_VACIO ? "" : v);
        }}
      >
        <RadixSelect.Trigger
          aria-label={ariaLabel}
          className={`${inputCls} flex w-full cursor-pointer items-center justify-between gap-2 text-left transition-colors ${form.campoCls(campo)}`}
        >
          <RadixSelect.Value placeholder={vacio} />
          <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          {/* z-[100]: el menú va en un portal al <body>, por encima de los
              overlays de los modales (z-50) y de ConfirmModal. */}
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className="z-[100] min-w-[var(--radix-select-trigger-width)] rounded-xl border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden"
          >
            <RadixSelect.Viewport className="p-1">
              <RadixSelect.Item value={SELECT_VACIO} className={itemCls}>
                <RadixSelect.ItemText>{vacio}</RadixSelect.ItemText>
              </RadixSelect.Item>
              {opciones.map((op) => {
                const seleccionada = op === valor;
                return (
                  <RadixSelect.Item key={op} value={op} className={itemCls}>
                    <RadixSelect.ItemText>{etiquetaDe(op)}</RadixSelect.ItemText>
                    {seleccionada && (
                      <Check className="w-4 h-4 ml-auto shrink-0 text-primary" />
                    )}
                  </RadixSelect.Item>
                );
              })}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
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

  // CalendarDropdown reemplaza el input nativo de fecha

  /**
   * Cámara de Comercio (adjunto). El archivo se sube al backend y la URL
   * resultante se guarda en `camaraComercioArchivo`; el nombre del archivo
   * se guarda en `camaraComercioNombre` para mostrarlo.
   * El archivo se rechaza ANTES de subirlo: un PDF de 40 MB no debería
   * intentarse subir; en ese caso se guarda solo el nombre y
   * `useProveedorForm` lo convierte en el error que se pinta debajo.
   */
  const alAdjuntar = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    form.marcarTocado("camaraComercioArchivo");
    const tipoOk = file.type === "application/pdf" || file.type.startsWith("image/");
    const extensionOk = /\.(pdf|jpe?g|png|webp)$/i.test(file.name);
    if ((!tipoOk && !extensionOk) || file.size > 5 * 1024 * 1024) {
      form.setCampo("camaraComercioNombre", file.name);
      form.setCampo("camaraComercioArchivo", "");
      e.target.value = "";
      return;
    }
    e.target.value = "";
    void subir(file, "proveedores").then((url) => {
      if (url) {
        form.setCampo("camaraComercioNombre", file.name);
        form.setCampo("camaraComercioArchivo", url);
      } else {
        form.setCampo("camaraComercioNombre", file.name);
        form.setCampo("camaraComercioArchivo", "");
      }
    });
  };

  /** Quitar el adjunto. La fecha se limpia con él: deja de tener sentido
   *  documentar la expedencia de un documento que ya no está. */
  const quitarAdjunto = () => {
    form.marcarTocado("camaraComercioArchivo");
    form.setCampo("camaraComercioNombre", "");
    form.setCampo("camaraComercioArchivo", "");
    form.setCampo("fechaExpedicionCamara", "");
  };

  const { subir, subiendo } = useSubirArchivo();

  const v = form.values;
  const esNatural = v.tipoPersona === "Persona Natural";
  const esJuridica = v.tipoPersona === "Persona Jurídica";
  const hayTipo = esNatural || esJuridica;
  // En edición no hay input de NIT (queda congelado arriba): el módulo no
  // permite modificarlo después de creado el proveedor.
  const pideNit = nitLectura === undefined;

  return (
    // Dos columnas en pantallas anchas: la identificación a la izquierda y la
    // documentación, el contacto y el representante a la derecha. Así el
    // formulario entra en el alto del modal y el cuerpo no necesita scroll en
    // escritorio (en móvil vuelve a una columna).
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-6 items-start">
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
              los tres formularios. De aquí cuelgan los dos bloques de campos.
              Punto 3.1: dos opciones → control segmentado con aria-pressed. */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Tipo de persona {req}
            </label>
            <SegmentadoButtons
              valor={v.tipoPersona}
              onChange={(valor) => {
                form.marcarTocado("tipoPersona");
                form.setCampo("tipoPersona", valor as ProveedorFormValues["tipoPersona"]);
              }}
              opciones={[
                { valor: "Persona Natural", etiqueta: "Persona Natural" },
                { valor: "Persona Jurídica", etiqueta: "Persona Jurídica" },
              ]}
            />
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
              {/* Punto 3.1: CC/CE/Pasaporte pasan a `<select>` como ya lo
                  estaba "Tipo de sociedad": 3 botones en línea se rompían en la
                  columna izquierda. Se pinta la etiqueta completa y se GUARDA
                  el mismo código de siempre. */}
              <SelectCampo
                form={form}
                label={<>Tipo de documento {req}</>}
                campo="tipoDocumento"
                valor={v.tipoDocumento ?? ""}
                opciones={TIPOS_DOCUMENTO}
                etiquetas={etiquetaTipoDocumento}
                vacio="Elegir documento"
                ariaLabel="Tipo de documento"
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
                ariaLabel="Tipo de sociedad"
              />
            </>
          )}
        </div>
      </div>

      {/* Columna DERECHA: lo que va después de la identificación. En Persona
          Natural solo queda la configuración; la rejilla alinea las dos
          columnas por arriba, así que el hueco no desordena el formulario. */}
      <div className="space-y-6">
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
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={alAdjuntar}
                  disabled={subiendo}
                  className={`${inputCls} file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-muted file:text-xs file:font-semibold file:text-foreground cursor-pointer ${form.campoCls("camaraComercioArchivo")} ${subiendo ? "opacity-50 cursor-not-allowed" : ""}`}
                />
                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <span className="text-[10px] text-muted-foreground truncate" title={v.camaraComercioNombre || ""}>
                    {subiendo ? "Subiendo..." : (v.camaraComercioNombre || "PDF o imagen (JPG, PNG, WEBP) hasta 5 MB")}
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
                <CalendarDropdown
                  value={v.fechaExpedicionCamara ?? ""}
                  onChange={(val) => {
                    form.marcarTocado("fechaExpedicionCamara");
                    form.setCampo("fechaExpedicionCamara", val);
                  }}
                  error={!!form.obtenerError("fechaExpedicionCamara")}
                  onBlur={alTocar("fechaExpedicionCamara")}
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
              {/* Punto 3.1: mismo control que el tipo de documento de Persona
                  Natural (lista vertical con la etiqueta completa). */}
              <SelectCampo
                form={form}
                label={<>Tipo de documento {req}</>}
                campo="repLegalTipoDocumento"
                valor={v.repLegalTipoDocumento ?? ""}
                opciones={TIPOS_DOCUMENTO}
                etiquetas={etiquetaTipoDocumento}
                vacio="Elegir documento"
                ariaLabel="Tipo de documento del representante legal"
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
    </div>
  );
}
