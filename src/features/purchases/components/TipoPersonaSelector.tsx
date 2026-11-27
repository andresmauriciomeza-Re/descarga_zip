import { OpcionesBotones } from "@/shared/components/panel/OpcionesBotones";
import { EstadoPill } from "@/shared/components/panel/EstadoPill";
import type { TipoPersona } from "@/features/purchases/hooks/useProveedorForm";

// Selector "Empresa / Persona natural" de los formularios de proveedor (Crear,
// Editar, Nuevo Proveedor desde Orden de Compra y Compra). Los valores internos
// siguen siendo "Persona Natural" y "Persona Jurídica"; solo cambia lo que se lee.
//
//  · Crear  → botones activos (`onChange`).
//  · Editar → `disabled`: se ve el tipo actual marcado pero apagado, porque
//             el tipo de persona solo se elige al crear.
//  · Detalle → `comoEtiqueta`: etiqueta fija (sin botones).
//
// El envoltorio lleva `data-prov-campo="tipoPersona"` para que
// `enfocarPrimeroInvalido` del hook lo siga encontrando si falta el tipo.

const OPCIONES = [
  { valor: "Persona Jurídica", etiqueta: "Empresa" },
  { valor: "Persona Natural", etiqueta: "Persona natural" },
];

/** Cómo se lee el tipo de persona en pantalla. */
export const etiquetaTipoPersona = (tipo?: string | null) =>
  tipo === "Persona Jurídica" ? "Empresa" : tipo === "Persona Natural" ? "Persona" : "Sin tipo";

export function TipoPersonaSelector({
  valor,
  onChange,
  disabled = false,
  comoEtiqueta = false,
  error,
  className = "",
}: {
  valor: TipoPersona | "";
  onChange?: (valor: TipoPersona) => void;
  /** Editar: tipo actual marcado, no clicable y apagado. */
  disabled?: boolean;
  /** Detalle: se pinta como etiqueta fija, sin botones. */
  comoEtiqueta?: boolean;
  /** Mensaje de validación (p. ej. "Selecciona el tipo de persona."). */
  error?: string;
  className?: string;
}) {
  if (comoEtiqueta) {
    return (
      <span className={className}>
        <EstadoPill tono="azul">{etiquetaTipoPersona(valor)}</EstadoPill>
      </span>
    );
  }

  return (
    <div data-prov-campo="tipoPersona" className={className}>
      <OpcionesBotones
        etiqueta="Tipo de proveedor"
        valor={valor}
        deshabilitado={disabled || !onChange}
        onChange={(v) => onChange?.(v as TipoPersona)}
        opciones={OPCIONES}
      />
      <p className="pn-campo__ayuda">
        {disabled ? "Esto no se puede cambiar después de creado el proveedor." : "Según lo que escojas, cambian las preguntas."}
      </p>
      {error && <p className="pn-campo__error" role="alert"><span>{error}</span></p>}
    </div>
  );
}
