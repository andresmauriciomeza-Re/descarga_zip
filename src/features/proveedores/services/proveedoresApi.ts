import api from "@/shared/services/api";
import type { ProveedorRef } from "@/features/orden-compra/pages/OrdenCompraScreen";
import type { TipoDocumento, TipoPersona, TipoSociedad } from "@/features/compras/hooks/useProveedorForm";
import type { Supplier, SupplierStatus } from "@/features/proveedores/pages/SuppliersScreen";

/** Proveedor completo: el modelo del panel (`Supplier`, con los datos por tipo
    de persona) y lo que leen Compras/Órdenes (`ProveedorRef`). */
export type ProveedorCompleto = Supplier & ProveedorRef;

/** Proveedor tal como lo devuelve el backend (`tb_proveedores`). */
export interface ProveedorApi {
  id_proveedor: number | string;
  tipo_persona: "Natural" | "Juridica";
  nit: string;
  dv: string | null;
  nombre: string;
  nombre_comercial?: string | null;
  tipo_documento: string | null;
  numero_documento: string | null;
  tipo_sociedad: string | null;
  camara_comercio: string | null;
  fecha_exp_camara: string | null;
  rep_legal_nombre: string | null;
  rep_legal_tipo_doc: string | null;
  rep_legal_num_doc: string | null;
  rep_legal_telefono?: string | null;
  rep_legal_email?: string | null;
  asesor_comercial: string | null;
  telefono: string | null;
  contacto_telefono_fijo?: string | null;
  email: string | null;
  direccion: string | null;
  estado: boolean;
}

/** Helper de error (mismo patrón que `mensajeErrorProductos`): los 409/400
    conservan su mensaje ("Ya existe un proveedor con ese NIT", …). */
export const mensajeErrorProveedores = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const tipoPersonaAFront = (v: string): TipoPersona =>
  v === "Juridica" ? "Persona Jurídica" : "Persona Natural";
const tipoPersonaAApi = (v: string): "Natural" | "Juridica" =>
  v === "Persona Jurídica" ? "Juridica" : "Natural";

/** Separa un nombre completo en nombres y apellidos: con 2–3 palabras la
    última es el apellido; con 4 o más, las dos últimas. El usuario puede
    corregirlo al editar. */
export const separarNombre = (nombre: string): { nombres: string; apellidos: string } => {
  const palabras = (nombre ?? "").trim().split(/\s+/).filter(Boolean);
  if (palabras.length <= 1) return { nombres: palabras[0] ?? "", apellidos: "" };
  const desde = palabras.length <= 3 ? palabras.length - 1 : palabras.length - 2;
  return {
    nombres: palabras.slice(0, desde).join(" "),
    apellidos: palabras.slice(desde).join(" "),
  };
};

/** Nombre del archivo de un adjunto a partir de su URL. */
const nombreDeUrl = (url: string | null): string => {
  if (!url) return "";
  const ultima = url.split("?")[0].split("/").filter(Boolean).pop() ?? "";
  try {
    return decodeURIComponent(ultima);
  } catch {
    return ultima;
  }
};

/** Proveedor del backend → modelo del panel (`Supplier` + `ProveedorRef`). */
export const mapearProveedorApi = (row: ProveedorApi): ProveedorCompleto => {
  const esJuridica = row.tipo_persona === "Juridica";
  const identidad = esJuridica
    ? { nombres: row.nombre ?? "", apellidos: "" }
    : separarNombre(row.nombre ?? "");
  const repLegal = separarNombre(row.rep_legal_nombre ?? "");
  const nitRaw = (row.nit ?? "").trim();
  const nitDigitos = nitRaw.replace(/\D/g, "");
  const dvDigito = (row.dv ?? "").replace(/\D/g, "").slice(0, 1);
  const nitMapeado = esJuridica
    ? nitDigitos.length === 9 && dvDigito
      ? `${nitDigitos}${dvDigito}`
      : nitDigitos || nitRaw
    : row.numero_documento || nitRaw.replace(/^(CC|CE|PA)-/i, "");

  return {
    id: String(row.id_proveedor),
    nit: nitMapeado,
    nombre: row.nombre ?? "",
    nombreComercial: row.nombre_comercial ?? "",
    telefono: row.telefono ?? "",
    email: row.email ?? "",
    direccion: row.direccion ?? "",
    asesorComercial: row.asesor_comercial ?? "",
    estado: (row.estado ? "activo" : "inactivo") as SupplierStatus,
    tipoPersona: tipoPersonaAFront(row.tipo_persona),
    nombres: identidad.nombres,
    apellidos: identidad.apellidos,
    tipoDocumento: (row.tipo_documento as TipoDocumento) || "",
    numeroDocumento: row.numero_documento ?? "",
    dv: row.dv ?? (esJuridica && nitMapeado.length === 10 ? nitMapeado[9] : ""),
    tipoSociedad: (row.tipo_sociedad as TipoSociedad) || "",
    camaraComercioNombre: nombreDeUrl(row.camara_comercio),
    camaraComercioArchivo: row.camara_comercio ?? "",
    fechaExpedicionCamara: row.fecha_exp_camara ? String(row.fecha_exp_camara).slice(0, 10) : "",
    contactoNombre: row.asesor_comercial ?? "",
    contactoTelefono: row.telefono ?? "",
    contactoTelefonoFijo: row.contacto_telefono_fijo ?? "",
    contactoEmail: row.email ?? "",
    repLegalNombres: repLegal.nombres,
    repLegalApellidos: repLegal.apellidos,
    repLegalTipoDocumento: (row.rep_legal_tipo_doc as TipoDocumento) || "",
    repLegalNumeroDocumento: row.rep_legal_num_doc ?? "",
    repLegalTelefono: row.rep_legal_telefono ?? "",
    repLegalEmail: row.rep_legal_email ?? "",
  };
};

/** Cuerpo de POST/PUT /api/proveedores desde el modelo del panel. */
export const payloadProveedor = (
  s: Supplier,
): {
  tipo_persona: "Natural" | "Juridica";
  nit: string;
  dv: string | null;
  nombre: string;
  nombre_comercial?: string | null;
  tipo_documento?: string | null;
  numero_documento?: string | null;
  tipo_sociedad?: string | null;
  contacto_telefono_fijo?: string | null;
  rep_legal_nombre?: string | null;
  rep_legal_tipo_doc?: string | null;
  rep_legal_num_doc?: string | null;
  rep_legal_telefono?: string | null;
  rep_legal_email?: string | null;
  camara_comercio: string | null;
  fecha_exp_camara: string | null;
  asesor_comercial: string;
  telefono: string;
  email: string;
  direccion: string;
  estado: boolean;
} => {
  const esJuridica = s.tipoPersona === "Persona Jurídica";
  const nombre = esJuridica
    ? (s.nombre ?? "").trim()
    : `${(s.nombres ?? "").trim()} ${(s.apellidos ?? "").trim()}`.trim() || (s.nombre ?? "").trim();
  const nitDigitos = (s.nit ?? "").replace(/\D/g, "");
  const dvCalculado = esJuridica
    ? (s.dv ?? "").replace(/\D/g, "").slice(0, 1) || (nitDigitos.length === 10 ? nitDigitos[9] : null)
    : null;
  const telefonoPrincipal = esJuridica
    ? s.contactoTelefono || s.telefono || ""
    : s.telefono || "";
  const emailPrincipal = esJuridica
    ? s.contactoEmail || s.email || ""
    : s.email || "";
  const asesorComercial = esJuridica
    ? (s.contactoNombre || s.asesorComercial || "").trim()
    : (s.asesorComercial || "").trim() || nombre.slice(0, 50);

  return {
    tipo_persona: tipoPersonaAApi(s.tipoPersona || "Persona Natural"),
    nit: esJuridica ? nitDigitos : "",
    dv: esJuridica ? dvCalculado : null,
    nombre,
    estado: s.estado ? s.estado === "activo" : true,
    ...(esJuridica
      ? {
          nombre_comercial: (s.nombreComercial ?? "").trim() || null,
          tipo_sociedad: s.tipoSociedad || null,
          contacto_telefono_fijo: (s.contactoTelefonoFijo ?? "").replace(/\D/g, "") || null,
          rep_legal_nombre: `${(s.repLegalNombres ?? "").trim()} ${(s.repLegalApellidos ?? "").trim()}`.trim(),
          rep_legal_tipo_doc: s.repLegalTipoDocumento || null,
          rep_legal_num_doc: (s.repLegalNumeroDocumento ?? "").replace(/\D/g, "") || null,
          rep_legal_telefono: (s.repLegalTelefono ?? "").replace(/\D/g, "") || null,
          rep_legal_email: (s.repLegalEmail ?? "").trim() || null,
        }
      : {
          tipo_documento: s.tipoDocumento || null,
          numero_documento: (s.numeroDocumento ?? "").replace(/\D/g, "") || null,
        }),
    camara_comercio: esJuridica ? (s.camaraComercioArchivo ?? "").trim() || null : null,
    fecha_exp_camara: esJuridica ? (s.fechaExpedicionCamara ?? "").trim() || null : null,
    asesor_comercial: asesorComercial,
    telefono: telefonoPrincipal.replace(/\D/g, ""),
    email: emailPrincipal.trim(),
    direccion: (s.direccion ?? "").trim(),
  };
};

export const listarProveedores = async (estado?: boolean): Promise<ProveedorCompleto[]> => {
  const params: Record<string, string> = {};
  if (estado !== undefined) params.estado = String(estado);
  const { data } = await api.get<ProveedorApi[]>("/proveedores", { params });
  return data.map(mapearProveedorApi);
};

export const crearProveedor = async (s: Supplier): Promise<ProveedorCompleto> => {
  const { data } = await api.post<ProveedorApi>("/proveedores", payloadProveedor(s));
  return mapearProveedorApi(data);
};

/** Edición: `tipo_persona` no cambia (lo garantiza el servidor). */
export const actualizarProveedor = async (s: Supplier): Promise<ProveedorCompleto> => {
  const { data } = await api.put<ProveedorApi>(
    `/proveedores/${Number(s.id)}`,
    payloadProveedor(s),
  );
  return mapearProveedorApi(data);
};

export const cambiarEstadoProveedor = async (id: string, estado: boolean): Promise<ProveedorCompleto> => {
  const { data } = await api.patch<ProveedorApi>(`/proveedores/${Number(id)}/estado`, { estado });
  return mapearProveedorApi(data);
};

export const eliminarProveedor = async (id: string): Promise<void> => {
  await api.delete(`/proveedores/${Number(id)}`);
};
