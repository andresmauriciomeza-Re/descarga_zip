/** Tipos de documento compartidos por todos los formularios del sistema.
 *  Solo cambia el texto visible (label); el valor interno guardado es el
 *  código (CC, CE, PP) para no romper datos existentes, validaciones ni el
 *  cruce por documento. */
export const OPCIONES_TIPO_DOCUMENTO = [
  { code: "CC", label: "Cédula de Ciudadanía" },
  { code: "CE", label: "Cédula de Extranjería" },
  { code: "PP", label: "Pasaporte" },
];

/** Nombre completo del tipo de documento. Para valores no listados (p. ej.
 *  "Pasaporte" literal de Proveedores o "NIT") devuelve el valor tal cual. */
export const etiquetaTipoDocumento = (valor: string): string =>
  OPCIONES_TIPO_DOCUMENTO.find((o) => o.code === valor)?.label ?? valor;
