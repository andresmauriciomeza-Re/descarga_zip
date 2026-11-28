import type { ChangeEvent, ReactNode } from "react";
import { AlertCircle, Check, ChevronDown } from "lucide-react";
import * as RadixSelect from "@radix-ui/react-select";
import { OpcionesBotones } from "@/shared/components/buttons/OptionButtons";
import { etiquetaTipoDocumento } from "@/shared/utils/documentTypes";
import { useSubirArchivo } from "@/shared/hooks/useFileUpload";
import {
  filtrarNit,
  filtrarNumeroDocumento,
  soloLetras,
  soloDigitos,
  soloDireccion,
  formatoNit,
  TIPOS_DOCUMENTO,
  TIPOS_SOCIEDAD,
  type ProveedorFormApi,
  type ProveedorFormValues,
} from "@/features/suppliers/hooks/useSupplierForm";

// Punto 1: campos compartidos de TODOS los formularios de proveedor (Nuevo
// Proveedor desde Orden de Compra y desde Compra, y Crear/Editar Proveedor del
// módulo Proveedores). Las reglas viven en `useProveedorForm`; aquí solo se
// pinta el formulario para que los tres sitios se comporten idéntico: filtro
// mientras se escribe, mensaje debajo del input con borde rojo mientras hay
// error y label con asterisco en los campos obligatorios.
//
// El formulario es CONDICIONAL por tipo de persona (punto 12) y respeta el
// orden exacto de la especificación:
//   · Persona Natural → Tipo de documento, Número de documento, Nombre
//     completo, Teléfono, Email, Dirección y Estado. SIN NIT y SIN DV.
//   · Persona Jurídica → Datos de la empresa, Representante legal y Contacto
//     comercial en columnas; Cámara de Comercio y Estado en una franja abajo.
// Como los tres módulos renderizan ESTE componente, el cambio se propaga solo.
//
// Estilo: títulos Montserrat (los de pantalla), textos/labels e inputs Poppins
// 14px (`labelCls` + `text-sm`), fondo claro por tokens y SIN cards con borde:
// las secciones se separan con una línea divisoria (`.pn-prov` en panel.css).

// El alto de los campos lo fija el panel (.pn-campo en panel.css).
const inputCls =
  "w-full px-3 py-2 min-h-[2.875rem] bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

const lecturaCls = "pn-lectura";

/** Rejilla de cada sección: 2 campos por fila cuando caben. */
const gridCls = "pn-grilla";

/** Label de cada campo: 14px (Poppins heredado del body). */
const labelCls = "pn-etiqueta";

/** Texto de ayuda bajo un campo (solo lectura, placeholders secundarios). */
const ayudaCls = "pn-campo__ayuda";

/** Aviso general (sin caja con borde: solo una línea lateral, como pide el
    estilo de "sin cards con borde"). */
const avisoCls = "text-lg text-muted-foreground border-l-4 border-primary/40 pl-3 py-1";

// Sin asteriscos: lo que no es obligatorio dice «(opcional)».
const req = null;

/** Campos de texto (todo menos el select de Estado). */
type CampoTexto = Exclude<keyof ProveedorFormValues, "estado">;

const OPCIONES_ESTADO = [
  { valor: "activo", etiqueta: "Activo" },
  { valor: "inactivo", etiqueta: "Inactivo" },
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
    // `data-prov-campo` es el ancla que usa `enfocarPrimeroInvalido` del hook
    // para poner el foco en el PRIMER campo con error en orden visual.
    <div className={`pn-campo ${form.obtenerError(campo) ? "pn-campo--error" : ""} ${className}`} data-prov-campo={campo}>
      <label className={labelCls}>{label}</label>
      {children}
      {form.obtenerError(campo) && (
        <p className="pn-campo__error" role="alert">
          <AlertCircle size={20} aria-hidden="true" />
          <span>{form.obtenerError(campo)}</span>
        </p>
      )}
    </div>
  );
}

/**
 * Sección (columna) del formulario con su título.
 * Vive fuera del componente para que React no remonte los inputs en cada render.
 */
function Bloque({
  titulo,
  children,
  className = "",
}: {
  titulo: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`pn-prov__seccion ${className}`}>
      <h2>{titulo}</h2>
      {children}
    </section>
  );
}

/** Radix no admite `value=""` (lo reserva para "sin selección"), así que el
    ítem "vacío" lleva un valor sentinela y al elegirlo se guarda `""`. */
const SELECT_VACIO = "__vacio__";

/** Clases de cada opción del menú, idénticas en tono a las de `UnidadSelect`. */
const itemCls =
  "relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-3 min-h-12 text-lg outline-none transition-colors data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[state=checked]:bg-primary/10";

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
  autoFocus = false,
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
  /** Recibe el cursor al aparecer. */
  autoFocus?: boolean;
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
          autoFocus={autoFocus}
          className={`${inputCls} flex w-full cursor-pointer items-center justify-between gap-2 text-left transition-colors ${form.campoCls(campo)}`}
        >
          <RadixSelect.Value placeholder={vacio} />
          <ChevronDown className="w-5 h-5 shrink-0 text-muted-foreground" />
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
                      <Check className="w-5 h-5 ml-auto shrink-0 text-primary" />
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

  /** Quitar el adjunto. La fecha de expedición (que ya no se pinta) se limpia
   *  con él: deja de tener sentido documentar la expedencia de un documento
   *  que ya no está. */
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
  // En edición no hay input de NIT (queda congelado): el módulo no permite
  // modificarlo después de creado el proveedor.
  const pideNit = nitLectura === undefined;

  return (
    // Columnas lado a lado cuando el recuadro es ancho; si no, apiladas. El orden
    // del DOM (y del Tab) va sección por sección.
    //
    // El selector "Tipo de persona" vive en el ENCABEZADO de cada pantalla/modal
    // con `TipoPersonaSelector` (misma fila del título).
    <div className="pn-prov">
    <div className={`pn-prov__columnas${esJuridica ? " pn-prov__columnas--empresa" : ""}`}>
      {!hayTipo && (
        <p className={avisoCls}>
          Escoge arriba si es empresa o persona natural para ver las preguntas.
        </p>
      )}

          {/* ── Persona Natural ── 7 campos en el orden de la spec, SIN NIT y
              SIN DV. DOS por fila (`md:grid-cols-2`); en móvil, 1 columna. El
              octavo campo (Estado) queda solo en su fila, a la izquierda, con
              el mismo ancho que los demás (así lo pinta el grid). ─────────── */}
          {esNatural && (
            <>
            <Bloque titulo="2 · Datos de la persona">
              <div className={gridCls}>
                {pideNit ? (
                  <>
                    {/* 1. Tipo de documento */}
                    <SelectCampo
                      form={form}
                      label={<>Tipo de documento {req}</>}
                      campo="tipoDocumento"
                      valor={v.tipoDocumento ?? ""}
                      opciones={TIPOS_DOCUMENTO}
                      etiquetas={etiquetaTipoDocumento}
                      vacio="Elegir documento"
                      ariaLabel="Tipo de documento"
                      autoFocus={autoFocusNombre}
                    />
                    {/* 2. Número de documento */}
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
                  </>
                ) : (
                  <>
                    {/* 1. Tipo de documento (solo lectura en edición) */}
                    <div>
                      <label className={labelCls}>Tipo de documento</label>
                      <div className={lecturaCls}>
                        {v.tipoDocumento ? (etiquetaTipoDocumento[v.tipoDocumento] ?? v.tipoDocumento) : "—"}
                      </div>
                      <p className={ayudaCls}>
                        El documento no se puede modificar después de creado el proveedor
                      </p>
                    </div>
                    {/* 2. Número de documento (solo lectura en edición) */}
                    <div>
                      <label className={labelCls}>Número de documento</label>
                      <div className={lecturaCls}>{(v.numeroDocumento ?? "").trim() || "—"}</div>
                      <p className={ayudaCls}>
                        El documento no se puede modificar después de creado el proveedor
                      </p>
                    </div>
                  </>
                )}
                {/* 3. Nombre completo: UN solo campo (al escribirlo alimenta
                    `nombres` + `apellidos` en el hook, ver setCampo). */}
                {pideNit ? (
                  <Campo form={form} label={<>Nombre completo {req}</>} campo="nombreCompleto">
                    <input
                      value={v.nombreCompleto ?? ""}
                      onChange={alEscribir("nombreCompleto", soloLetras)}
                      onBlur={alTocar("nombreCompleto")}
                      placeholder="Nombre y apellidos"
                      className={`${inputCls} transition-colors ${form.campoCls("nombreCompleto")}`}
                    />
                  </Campo>
                ) : (
                  <div>
                    <label className={labelCls}>Nombre completo</label>
                    <div className={lecturaCls}>{(v.nombreCompleto ?? v.nombre ?? "").trim() || "—"}</div>
                    <p className={ayudaCls}>
                      El nombre no se puede modificar después de creado el proveedor
                    </p>
                  </div>
                )}
              </div>
            </Bloque>
            <Bloque titulo="3 · ¿Con quién hablamos para pedir?">
              <div className={gridCls}>
                {/* 4. Teléfono */}
                <Campo form={form} label={<>Teléfono {req}</>} campo="telefono">
                  <input
                    type="tel"
                    value={v.telefono ?? ""}
                    onChange={alEscribir("telefono", soloDigitos)}
                    onBlur={alTocar("telefono")}
                    placeholder="10 dígitos sin espacios"
                    inputMode="numeric"
                    maxLength={10}
                    className={`${inputCls} transition-colors ${form.campoCls("telefono")}`}
                  />
                </Campo>
                {/* 5. Email */}
                <Campo form={form} label={<>Email {req}</>} campo="email">
                  <input
                    type="email"
                    value={v.email ?? ""}
                    onChange={alEscribir("email", (x) => x)}
                    onBlur={alTocar("email")}
                    placeholder="nombre@proveedor.co"
                    className={`${inputCls} transition-colors ${form.campoCls("email")}`}
                  />
                </Campo>
                {/* 6. Dirección */}
                <Campo form={form} label={<>Dirección {req}</>} campo="direccion">
                  <input
                    value={v.direccion ?? ""}
                    onChange={alEscribir("direccion", soloDireccion)}
                    onBlur={alTocar("direccion")}
                    placeholder="Cra 50 #30-10"
                    className={`${inputCls} transition-colors ${form.campoCls("direccion")}`}
                  />
                </Campo>
                {/* 7. Estado */}
                <div>
                  <p className={labelCls}>¿El proveedor está activo?</p>
                  <OpcionesBotones
                    etiqueta="Estado del proveedor"
                    valor={v.estado}
                    onChange={(nuevoEstado) => form.setCampo("estado", nuevoEstado as "activo" | "inactivo")}
                    opciones={OPCIONES_ESTADO}
                  />
                </div>
              </div>
            </Bloque>
            </>
          )}

          {/* ── Persona Jurídica: secciones APILADAS (Representante legal,
              Razón social, Contacto comercial) + Cámara de Comercio. Cada
              sección pinta DOS inputs por fila (`md:grid-cols-2`); en móvil
              pasan a 1 columna. ─────────────────────────────────────────── */}
          {esJuridica && (
            <>
                {/* Sección 2 — Razón social */}
                <Bloque titulo="2 · Datos de la empresa">
                  <div className={gridCls}>
                    {pideNit ? (
                      <Campo form={form} label={<>Nombre o razón social {req}</>} campo="razonSocial">
                        <input
                          value={v.razonSocial ?? ""}
                          onChange={alEscribir("razonSocial", (x) => x)}
                          onBlur={alTocar("razonSocial")}
                          placeholder="Ej: Quesos del Norte S.A.S."
                          autoFocus={autoFocusNombre}
                          className={`${inputCls} transition-colors ${form.campoCls("razonSocial")}`}
                        />
                      </Campo>
                    ) : (
                      <div>
                        <label className={labelCls}>Nombre o razón social</label>
                        <div className={lecturaCls}>{(v.razonSocial || v.nombre || "").trim() || "—"}</div>
                        <p className={ayudaCls}>
                          La razón social no se puede modificar después de creado el proveedor
                        </p>
                      </div>
                    )}
                    <Campo form={form} label={<>Nombre comercial <span className="font-normal">(opcional)</span></>} campo="nombreComercial">
                      <input
                        value={v.nombreComercial ?? ""}
                        onChange={alEscribir("nombreComercial", (x) => x)}
                        onBlur={alTocar("nombreComercial")}
                        placeholder="Como lo conocen"
                        className={`${inputCls} transition-colors ${form.campoCls("nombreComercial")}`}
                      />
                    </Campo>
                    {/* Alta: input de NIT. Edición: NIT congelado (el módulo no
                        lo permite modificar después de creado). */}
                    {pideNit ? (
                      <Campo form={form} label={<>NIT {req}</>} campo="nit">
                        <input
                          value={v.nit}
                          onChange={alEscribir("nit", filtrarNit)}
                          onBlur={alTocar("nit")}
                          placeholder="Ej: 9001234561"
                          inputMode="numeric"
                          // Sin maxLength: truncaría un NIT pegado con formato
                          // ("900.123.456-1" → "900.123.45") ANTES de poder
                          // quitarle los signos. El tope de 10 lo aplica filtrarNit.
                          className={`${inputCls} transition-colors ${form.campoCls("nit")}`}
                        />
                        <p className={ayudaCls}>Sin el número de verificación</p>
                      </Campo>
                    ) : (
                      nitLectura !== undefined && nitLectura.trim() !== "" && (
                        <div>
                          <label className={labelCls}>NIT</label>
                          <div className={lecturaCls}>{formatoNit(nitLectura)}</div>
                          <p className={ayudaCls}>
                            El NIT no se puede modificar después de creado el proveedor
                          </p>
                        </div>
                      )
                    )}
                    {/* DV: fuera del diseño (decisión). Su valor sigue viajando
                        en el payload desde el estado, sin pintarse ni validarse. */}
                    <SelectCampo
                      form={form}
                      label={<>Tipo de sociedad {req}</>}
                      campo="tipoSociedad"
                      valor={v.tipoSociedad ?? ""}
                      opciones={TIPOS_SOCIEDAD}
                      vacio="Elige el tipo"
                      ariaLabel="Tipo de sociedad"
                    />
                  </div>
                </Bloque>

                {/* Sección 1 — Representante legal */}
                <Bloque titulo="3 · Representante legal">
                  <div className={gridCls}>
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
                    {/* UN solo campo "Nombre completo" (alimenta
                        repLegalNombres + repLegalApellidos en el hook). */}
                    <Campo form={form} label={<>Nombre completo {req}</>} campo="repLegalNombreCompleto">
                      <input
                        value={v.repLegalNombreCompleto ?? ""}
                        onChange={alEscribir("repLegalNombreCompleto", soloLetras)}
                        onBlur={alTocar("repLegalNombreCompleto")}
                        placeholder="Nombre y apellidos"
                        className={`${inputCls} transition-colors ${form.campoCls("repLegalNombreCompleto")}`}
                      />
                    </Campo>
                    <Campo form={form} label={<>Teléfono {req}</>} campo="repLegalTelefono">
                      <input
                        type="tel"
                        value={v.repLegalTelefono ?? ""}
                        onChange={alEscribir("repLegalTelefono", soloDigitos)}
                        onBlur={alTocar("repLegalTelefono")}
                        placeholder="10 dígitos sin espacios"
                        inputMode="numeric"
                        maxLength={10}
                        className={`${inputCls} transition-colors ${form.campoCls("repLegalTelefono")}`}
                      />
                    </Campo>
                    <Campo form={form} label={<>Email {req}</>} campo="repLegalEmail">
                      <input
                        type="email"
                        value={v.repLegalEmail ?? ""}
                        onChange={alEscribir("repLegalEmail", (x) => x)}
                        onBlur={alTocar("repLegalEmail")}
                        placeholder="nombre@proveedor.co"
                        className={`${inputCls} transition-colors ${form.campoCls("repLegalEmail")}`}
                      />
                    </Campo>
                  </div>
                </Bloque>

                {/* Sección 3 — Contacto comercial */}
                <Bloque titulo="4 · ¿Con quién hablamos para pedir?">
                  <div className={gridCls}>
                    <Campo form={form} label={<>Teléfono celular {req}</>} campo="contactoTelefono">
                      <input
                        type="tel"
                        value={v.contactoTelefono ?? ""}
                        onChange={alEscribir("contactoTelefono", soloDigitos)}
                        onBlur={alTocar("contactoTelefono")}
                        placeholder="10 dígitos sin espacios"
                        inputMode="numeric"
                        maxLength={10}
                        className={`${inputCls} transition-colors ${form.campoCls("contactoTelefono")}`}
                      />
                    </Campo>
                    <Campo form={form} label={<>Teléfono fijo <span className="font-normal">(opcional)</span></>} campo="contactoTelefonoFijo">
                      <input
                        type="tel"
                        value={v.contactoTelefonoFijo ?? ""}
                        onChange={alEscribir("contactoTelefonoFijo", soloDigitos)}
                        onBlur={alTocar("contactoTelefonoFijo")}
                        placeholder="6043210000"
                        inputMode="numeric"
                        maxLength={10}
                        className={`${inputCls} transition-colors ${form.campoCls("contactoTelefonoFijo")}`}
                      />
                    </Campo>
                    <Campo form={form} label={<>Email {req}</>} campo="contactoEmail">
                      <input
                        type="email"
                        value={v.contactoEmail ?? ""}
                        onChange={alEscribir("contactoEmail", (x) => x)}
                        onBlur={alTocar("contactoEmail")}
                        placeholder="ventas@proveedor.co"
                        className={`${inputCls} transition-colors ${form.campoCls("contactoEmail")}`}
                      />
                    </Campo>
                    <Campo form={form} label={<>Nombre del contacto {req}</>} campo="contactoNombre">
                      <input
                        value={v.contactoNombre ?? ""}
                        onChange={alEscribir("contactoNombre", soloLetras)}
                        onBlur={alTocar("contactoNombre")}
                        placeholder="Persona de contacto"
                        className={`${inputCls} transition-colors ${form.campoCls("contactoNombre")}`}
                      />
                    </Campo>
                    <Campo form={form} label={<>Dirección comercial {req}</>} campo="direccion">
                      <input
                        value={v.direccion ?? ""}
                        onChange={alEscribir("direccion", soloDireccion)}
                        onBlur={alTocar("direccion")}
                        placeholder="Cra 50 #30-10"
                        className={`${inputCls} transition-colors ${form.campoCls("direccion")}`}
                      />
                    </Campo>
                  </div>
                </Bloque>

              <div className="pn-prov__franja">
              {/* Sección 4 — Cámara de Comercio */}
              <Bloque titulo="5 · Cámara de Comercio" className="pn-prov__camara">
                <div>
                  <Campo
                    form={form}
                    label={<>Archivo de la Cámara de Comercio <span className="font-normal">(opcional)</span></>}
                    campo="camaraComercioArchivo"
                  >
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      onChange={alAdjuntar}
                      disabled={subiendo}
                      className={`${inputCls} file:mr-3 file:py-0 file:px-4 file:rounded-lg file:border-0 file:bg-muted file:text-base file:font-semibold file:text-foreground cursor-pointer ${form.campoCls("camaraComercioArchivo")} ${subiendo ? "opacity-50 cursor-not-allowed" : ""}`}
                    />
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-base text-muted-foreground truncate" title={v.camaraComercioNombre || ""}>
                        {subiendo ? "Subiendo..." : (v.camaraComercioNombre || "PDF o imagen (JPG, PNG, WEBP) hasta 5 MB")}
                      </span>
                      {v.camaraComercioNombre && (
                        <button
                          type="button"
                          onClick={quitarAdjunto}
                          className="pn-boton pn-boton--peligro shrink-0"
                          style={{ minHeight: "2.875rem" }}
                        >
                          Quitar el archivo
                        </button>
                      )}
                    </div>
                  </Campo>
                </div>
              </Bloque>

              {/* Estado: último elemento del formulario, sin barra de título */}
              <div>
                  <p className={labelCls}>¿El proveedor está activo?</p>
                  <OpcionesBotones
                    etiqueta="Estado del proveedor"
                    valor={v.estado}
                    onChange={(nuevoEstado) => form.setCampo("estado", nuevoEstado as "activo" | "inactivo")}
                    opciones={OPCIONES_ESTADO}
                  />
              </div>
              </div>
            </>
          )}
    </div>
    </div>
  );
}
