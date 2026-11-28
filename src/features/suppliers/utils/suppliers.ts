import type { TipoPersona, TipoDocumento, TipoSociedad } from "@/features/suppliers/hooks/useSupplierForm";

export type SupplierStatus = "activo" | "inactivo";

export interface Supplier {
  id: string;
  nit: string;
  /** Nombre DERIVADO: Persona Natural → "Nombres Apellidos", Persona Jurídica
   *  → Razón social. Es el dato que leen listados, compras y órdenes. */
  nombre: string;
  // Campos de contacto viejos: hoy son OPCIONALES porque el formulario ya no
  // los pide a Persona Natural (los cubre el contacto comercial de Jurídica).
  // Los proveedores antiguos sí los traen y al editar se conservan.
  telefono?: string;
  email?: string;
  direccion?: string;
  asesorComercial?: string;
  estado: SupplierStatus;
  /** Punto 12: opcional (los registros antiguos no lo traen); el alta lo
   *  pide siempre. "" = sin elegir, se muestra como "—" en listado/detalle. */
  tipoPersona?: TipoPersona | "";
  // ── Datos nuevos por tipo de persona (todos opcionales: los registros
  // antiguos no los traen y los formularios de Orden/Compra no los generan). ──
  /** Persona Natural. */
  nombres?: string;
  apellidos?: string;
  tipoDocumento?: TipoDocumento | "";
  numeroDocumento?: string;
  /** DV (dígito de verificación). */
  dv?: string;
  /** Persona Jurídica: forma societaria. La razón social NO se guarda aquí,
   *  vive en `nombre` (es su valor derivado). */
  tipoSociedad?: TipoSociedad | "";
  /** Persona Jurídica → bloque Razón social (`nombre_comercial` en la BD). */
  nombreComercial?: string;
  /** Adjunto de la Cámara de Comercio: nombre del archivo + dataURL/URL. */
  camaraComercioNombre?: string;
  camaraComercioArchivo?: string;
  fechaExpedicionCamara?: string;
  /** Persona Jurídica: contacto comercial (en Natural queda vacío). Al
   *  guardar se copia a asesor/telefono/email para el resto de la app. */
  contactoNombre?: string;
  contactoTelefono?: string;
  /** Teléfono FIJO del contacto (`contacto_telefono_fijo` en la BD). */
  contactoTelefonoFijo?: string;
  contactoEmail?: string;
  /** Representante legal (solo Persona Jurídica). */
  repLegalNombres?: string;
  repLegalApellidos?: string;
  repLegalTipoDocumento?: TipoDocumento | "";
  repLegalNumeroDocumento?: string;
  /** Teléfono y email del representante legal (`rep_legal_telefono` y `rep_legal_email` en la BD). */
  repLegalTelefono?: string;
  repLegalEmail?: string;
}

export const INITIAL_SUPPLIERS: Supplier[] = [];

export const SERIF = "var(--font-titulo)";
