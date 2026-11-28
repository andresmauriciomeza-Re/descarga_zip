import type { Supplier } from "@/features/suppliers/utils/suppliers";
import { SeccionFormulario } from "@/shared/components/panel/FormSection";
import { DatosDetalle } from "@/shared/components/panel/DetailData";
import { formatoNit } from "@/features/suppliers/hooks/useSupplierForm";

/**
 * Cuerpo del detalle: pinta EXACTAMENTE los campos que pide cada tipo de
 * persona (misma sección y mismo orden que el formulario), así lo que se guardó
 * es lo que se ve. Los campos sin dato salen "—". Los proveedores antiguos sin
 * tipo siguen mostrando el bloque de contacto viejo.
 */
export function DetalleContenido({ s }: { s: Supplier }) {
  const esNatural = s.tipoPersona === "Persona Natural";
  const esJuridica = s.tipoPersona === "Persona Jurídica";
  const v = (x?: string) => (x ?? "").trim() || "—";
  const nombreCompleto = [s.nombres ?? "", s.apellidos ?? ""]
    .map(x => x.trim())
    .filter(Boolean)
    .join(" ") || (s.nombre ?? "");
  const documento = (tipo?: string, numero?: string) =>
    [tipo, numero].map(x => (x ?? "").trim()).filter(Boolean).join(" ") || "—";

  return (
    <div className="grid">
      {esNatural && (
        <>
          <SeccionFormulario plano numero={1} titulo="Datos del proveedor">
            <DatosDetalle datos={[
              { etiqueta: "Nombre completo", valor: v(nombreCompleto) },
              { etiqueta: "Documento", valor: documento(s.tipoDocumento, s.numeroDocumento) },
            ]} />
          </SeccionFormulario>
          <SeccionFormulario plano numero={2} titulo="Con quién hablar para pedir">
            <DatosDetalle datos={[
              { etiqueta: "Teléfono", valor: v(s.telefono) },
              { etiqueta: "Correo", valor: v(s.email) },
              { etiqueta: "Dirección", valor: v(s.direccion) },
            ]} />
          </SeccionFormulario>
        </>
      )}

      {esJuridica && (
        <>
          <SeccionFormulario plano numero={1} titulo="Datos de la empresa">
            <DatosDetalle datos={[
              /* En Jurídica el nombre guardado ES la razón social. */
              { etiqueta: "Razón social", valor: v(s.nombre) },
              { etiqueta: "Nombre comercial", valor: v(s.nombreComercial) },
              { etiqueta: "NIT", valor: formatoNit(s.nit) || "—" },
              { etiqueta: "Tipo de sociedad", valor: v(s.tipoSociedad) },
              {
                etiqueta: "Cámara de Comercio",
                valor: s.camaraComercioArchivo ? (
                  <a
                    href={s.camaraComercioArchivo}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline break-all"
                    title={s.camaraComercioNombre}
                  >
                    {s.camaraComercioNombre || "Ver el archivo"}
                  </a>
                ) : v(s.camaraComercioNombre),
              },
              { etiqueta: "Fecha de la Cámara de Comercio", valor: v(s.fechaExpedicionCamara) },
            ]} />
          </SeccionFormulario>
          <SeccionFormulario plano numero={2} titulo="Representante legal">
            <DatosDetalle datos={[
              {
                etiqueta: "Nombre",
                valor: v([s.repLegalNombres ?? "", s.repLegalApellidos ?? ""].map(x => x.trim()).filter(Boolean).join(" ")),
              },
              { etiqueta: "Documento", valor: documento(s.repLegalTipoDocumento, s.repLegalNumeroDocumento) },
              { etiqueta: "Celular", valor: v(s.repLegalTelefono) },
              { etiqueta: "Correo", valor: v(s.repLegalEmail) },
            ]} />
          </SeccionFormulario>
          <SeccionFormulario plano numero={3} titulo="Con quién hablar para pedir">
            <DatosDetalle datos={[
              { etiqueta: "Asesor", valor: v(s.contactoNombre || s.asesorComercial) },
              { etiqueta: "Teléfono", valor: v(s.contactoTelefono || s.telefono) },
              { etiqueta: "Teléfono fijo", valor: v(s.contactoTelefonoFijo) },
              { etiqueta: "Correo", valor: v(s.contactoEmail || s.email) },
              { etiqueta: "Dirección", valor: v(s.direccion) },
            ]} />
          </SeccionFormulario>
        </>
      )}

      {/* Proveedor antiguo sin tipo de persona registrado. */}
      {!esNatural && !esJuridica && (
        <SeccionFormulario plano numero={1} titulo="Datos del proveedor">
          <DatosDetalle datos={[
            { etiqueta: "Nombre", valor: v(s.nombre) },
            { etiqueta: "Asesor", valor: v(s.asesorComercial) },
            { etiqueta: "Teléfono", valor: v(s.telefono) },
            { etiqueta: "Correo", valor: v(s.email) },
            { etiqueta: "Dirección", valor: v(s.direccion) },
          ]} />
        </SeccionFormulario>
      )}
    </div>
  );
}
