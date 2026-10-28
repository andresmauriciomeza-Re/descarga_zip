import { SegmentadoButtons } from "@/shared/components/SegmentadoButtons";
import type { TipoPersona } from "@/features/compras/hooks/useProveedorForm";

// Selector "Persona Natural / Persona Jurídica" del ENCABEZADO de los
// formularios de proveedor (Crear, Editar, Nuevo Proveedor desde Orden de
// Compra y Compra). Se sacó del cuerpo del formulario para que viva en la
// misma fila del título, alineado a la derecha.
//
//  · Crear  → botones activos (`onChange`).
//  · Editar → `disabled`: se ve el tipo actual marcado pero atenuado, porque
//             el tipo de persona solo se elige al crear.
//  · Detalle → `comoEtiqueta`: etiqueta fija (sin botones).
//
// El envoltorio lleva `data-prov-campo="tipoPersona"` para que
// `enfocarPrimeroInvalido` del hook lo siga encontrando si falta el tipo.

const OPCIONES = [
  { valor: "Persona Natural", etiqueta: "Persona Natural" },
  { valor: "Persona Jurídica", etiqueta: "Persona Jurídica" },
] as const;

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
  /** Editar: tipo actual marcado, no clicable y atenuado. */
  disabled?: boolean;
  /** Detalle: se pinta como etiqueta fija, sin botones. */
  comoEtiqueta?: boolean;
  /** Mensaje de validación (p. ej. "Selecciona el tipo de persona."). */
  error?: string;
  className?: string;
}) {
  if (comoEtiqueta) {
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold whitespace-nowrap ${className}`}
      >
        {valor || "Sin tipo de persona"}
      </span>
    );
  }

  return (
    <div
      data-prov-campo="tipoPersona"
      className={`flex flex-col items-end ${className}`}
      aria-label="Tipo de persona"
    >
      <SegmentadoButtons
        valor={valor}
        disabled={disabled || !onChange}
        title={disabled ? "El tipo de persona no se puede cambiar al editar" : undefined}
        className={disabled ? "opacity-60" : ""}
        onChange={(v) => onChange?.(v as TipoPersona)}
        opciones={OPCIONES}
      />
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}
