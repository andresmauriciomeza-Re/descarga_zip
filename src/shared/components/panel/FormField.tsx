import { useId, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

export interface PropsControl {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

/**
 * Etiqueta arriba + control + ayuda + error. `children` puede ser un nodo
 * (si le pones tú el id) o una función que recibe los atributos de accesibilidad:
 *   <CampoFormulario etiqueta="Nombre">{(p) => <input {...p} />}</CampoFormulario>
 */
export function CampoFormulario({
  etiqueta,
  opcional,
  ayuda,
  error,
  children,
}: {
  etiqueta: string;
  /** Si no es obligatorio, la etiqueta dice «(opcional)». Sin asteriscos. */
  opcional?: boolean;
  ayuda?: string;
  /** Una frase que diga cómo arreglarlo. */
  error?: string;
  children: ReactNode | ((p: PropsControl) => ReactNode);
}) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const describe = [ayuda ? idAyuda : "", error ? idError : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`pn-campo${error ? " pn-campo--error" : ""}`}>
      <label htmlFor={id} className="pn-etiqueta">
        {etiqueta}
        {opcional && <span style={{ fontWeight: 400 }}> (opcional)</span>}
      </label>
      {typeof children === "function"
        ? children({ id, "aria-describedby": describe, "aria-invalid": error ? true : undefined })
        : children}
      {ayuda && <p id={idAyuda} className="pn-campo__ayuda">{ayuda}</p>}
      {error && (
        <p id={idError} className="pn-campo__error" role="alert">
          <AlertCircle size={20} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
