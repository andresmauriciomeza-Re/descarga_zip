import type { ChangeEvent, ReactNode } from "react";
import { EstadoSelect, type EstadoOption } from "./EstadoSelect";
import { MensajeError } from "./campo";
import {
  filtrarNit,
  soloLetras,
  soloDigitos,
  soloDireccion,
  type ProveedorFormApi,
  type ProveedorFormValues,
} from "./useProveedorForm";

// Punto 1: campos compartidos de TODOS los formularios de proveedor (Nuevo
// Proveedor desde Orden de Compra y desde Compra, y Crear Proveedor del módulo
// Proveedores). Las reglas viven en `useProveedorForm`; aquí solo se pinta el
// formulario para que los tres sitios se comporten idéntico: filtro mientras se
// escribe, mensaje debajo del input con borde rojo mientras hay error y label
// con asterisco en los campos obligatorios.

const inputCls =
  "w-full px-3 py-2.5 bg-muted rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

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
}: {
  form: ProveedorFormApi;
  label: ReactNode;
  campo: CampoTexto;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">{label}</label>
      {children}
      <MensajeError err={form.obtenerError(campo)} />
    </div>
  );
}

export function ProveedorFormCampos({
  form,
  autoFocusNombre = true,
}: {
  form: ProveedorFormApi;
  autoFocusNombre?: boolean;
}) {
  /** Escribe con el filtro del campo y marca tocado: el mensaje aparece
      mientras se escribe y desaparece en cuanto el valor es válido. */
  const alEscribir = (campo: CampoTexto, filtro: (v: string) => string) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      form.marcarTocado(campo);
      form.setCampo(campo, filtro(e.target.value));
    };

  const alTocar = (campo: CampoTexto) => () => form.marcarTocado(campo);

  return (
    <div className="space-y-6">
      <div>
        <p className={seccionCls}>
          Identificación del proveedor
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo form={form} label={<>NIT {req}</>} campo="nit">
            <input
              value={form.values.nit}
              onChange={alEscribir("nit", filtrarNit)}
              onBlur={alTocar("nit")}
              placeholder="9001234561"
              inputMode="numeric"
              // Sin maxLength: truncaría un NIT pegado con formato
              // ("900.123.456-1" → "900.123.45") ANTES de poder quitarle los
              // signos. El tope de 10 dígitos lo aplica filtrarNit.
              className={`${inputCls} transition-colors ${form.campoCls("nit")}`}
            />
          </Campo>
          <Campo form={form} label={<>Nombre {req}</>} campo="nombre">
            <input
              value={form.values.nombre}
              onChange={alEscribir("nombre", soloLetras)}
              onBlur={alTocar("nombre")}
              placeholder="Nombre del proveedor"
              autoFocus={autoFocusNombre}
              className={`${inputCls} transition-colors ${form.campoCls("nombre")}`}
            />
          </Campo>
        </div>
      </div>

      <div>
        <p className={seccionCls}>Contacto</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo form={form} label={<>Asesor comercial {req}</>} campo="asesorComercial">
            <input
              value={form.values.asesorComercial}
              onChange={alEscribir("asesorComercial", soloLetras)}
              onBlur={alTocar("asesorComercial")}
              placeholder="Ej: Carlos Mejía"
              className={`${inputCls} transition-colors ${form.campoCls("asesorComercial")}`}
            />
          </Campo>
          <Campo form={form} label={<>Teléfono {req}</>} campo="telefono">
            <input
              type="tel"
              value={form.values.telefono}
              onChange={alEscribir("telefono", soloDigitos)}
              onBlur={alTocar("telefono")}
              placeholder="6043210001"
              inputMode="numeric"
              maxLength={10}
              className={`${inputCls} transition-colors ${form.campoCls("telefono")}`}
            />
          </Campo>
          <Campo form={form} label={<>Email {req}</>} campo="email">
            <input
              type="email"
              value={form.values.email}
              onChange={alEscribir("email", (v) => v)}
              onBlur={alTocar("email")}
              placeholder="ventas@proveedor.co"
              className={`${inputCls} transition-colors ${form.campoCls("email")}`}
            />
          </Campo>
          <Campo form={form} label={<>Dirección {req}</>} campo="direccion">
            <input
              value={form.values.direccion}
              onChange={alEscribir("direccion", soloDireccion)}
              onBlur={alTocar("direccion")}
              placeholder="Cra 50 #30-10, Medellín"
              className={`${inputCls} transition-colors ${form.campoCls("direccion")}`}
            />
          </Campo>
        </div>
      </div>

      <div>
        <p className={seccionCls}>Configuración</p>
        <div className="w-full sm:w-1/2">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Estado</label>
          <EstadoSelect
            value={form.values.estado}
            onChange={(nuevoEstado) => form.setCampo("estado", nuevoEstado)}
            options={OPCIONES_ESTADO}
          />
        </div>
      </div>
    </div>
  );
}
