import api from "@/shared/services/api";
import { idInsumoApiDesdeFront, idInsumoFront } from "@/shared/utils/fichas";
import type { NoConformidad } from "@/features/cpn/pages/ProductosPerecederosScreen";

/** Registro tal como lo devuelve el backend (tb_productos_no_conformes). */
export interface NoConformidadApi {
  id_producto_no_conforme: number | string;
  fecha_registro: string;
  tipo_no_conformidad: "Producto" | "Producto insumo" | "Venta";
  id_producto: number | string | null;
  id_insumo: number | string | null;
  id_orden_produccion: number | string | null;
  id_venta: number | string | null;
  cantidad_afectada: number | string;
  unidad_medida: string;
  motivo: string;
  descripcion_detallada: string | null;
  tipo_solucion: "Reposicion" | "Reproceso" | "Reembolso" | null;
  solucion_aplicada: string | null;
  foto_evidencia: string | null;
  estado: "Pendiente" | "Completado";
  nombre: string | null;
  categoria: string | null;
  causa: string | null;
  area_proceso: string | null;
  proveedor: string | null;
  lote: string | null;
  responsable: string | null;
  accion_tomada: string | null;
  accion_correctiva: string | null;
  fecha_limite: string | null;
  responsable_accion: string | null;
  fecha_cierre: string | null;
  venta_ref: string | null;
  orden_ref: string | null;
  generado_por_sistema?: boolean;
}

/** Etiqueta del frontend ↔ valor del CHECK ck_pnc_solucion. */
const SOLUCION_A_API: Record<string, "Reposicion" | "Reproceso" | "Reembolso"> = {
  "Reposición del producto": "Reposicion",
  "Reproceso": "Reproceso",
  "Reembolso al cliente": "Reembolso",
};
const SOLUCION_DESDE_API: Record<string, string> = {
  Reposicion: "Reposición del producto",
  Reproceso: "Reproceso",
  Reembolso: "Reembolso al cliente",
};

export const solucionAApi = (etiqueta: string | undefined) =>
  etiqueta ? SOLUCION_A_API[etiqueta] ?? null : null;

/** "OP-005", igual que el id de las órdenes en el frontend. */
export const idOrdenFront = (id: number | string) =>
  `OP-${String(Number(id)).padStart(3, "0")}`;
const idOrdenApi = (ref: string | undefined): number | null => {
  const n = Number(String(ref ?? "").replace(/\D+/g, ""));
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};
const idVentaApi = (ref: string | undefined): number | null => {
  const n = Number(String(ref ?? "").trim());
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

export const mensajeErrorNoConformes = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

export const mapearNoConformidadApi = (row: NoConformidadApi): NoConformidad => ({
  id: String(row.id_producto_no_conforme),
  tipo: row.tipo_no_conformidad,
  nombre: row.nombre ?? "",
  categoria: row.categoria ?? "",
  fechaRegistro: row.fecha_registro,
  cantidadAfectada: Number(row.cantidad_afectada),
  unidadMedida: row.unidad_medida,
  // En el frontend `tipoNoConformidad` es el MOTIVO (texto).
  tipoNoConformidad: row.motivo,
  descripcionProblema: row.descripcion_detallada ?? "",
  causa: row.causa ?? "",
  evidencia: row.foto_evidencia ?? undefined,
  areaProceso: row.area_proceso ?? "",
  proveedor: row.proveedor ?? "",
  lote: row.lote ?? "",
  responsable: row.responsable ?? "",
  estado: row.estado,
  accionTomada: row.accion_tomada ?? "",
  accionCorrectiva: row.accion_correctiva ?? "",
  fechaLimite: row.fecha_limite ?? "",
  responsableAccion: row.responsable_accion ?? "",
  fechaCierre: row.fecha_cierre ?? "",
  tipoSolucion: row.tipo_solucion ? SOLUCION_DESDE_API[row.tipo_solucion] : "",
  solucion: row.solucion_aplicada ?? "",
  ventaRef: row.id_venta != null ? String(row.id_venta) : row.venta_ref ?? "",
  ordenRef: row.id_orden_produccion != null ? idOrdenFront(row.id_orden_produccion) : row.orden_ref ?? "",
  idProducto: row.id_producto != null ? String(row.id_producto) : undefined,
  idInsumo: row.id_insumo != null ? idInsumoFront(row.id_insumo) : undefined,
  idOrdenProduccion: row.id_orden_produccion != null ? Number(row.id_orden_produccion) : undefined,
  generadoPorSistema: row.generado_por_sistema === true,
});

/** Campos descriptivos y de solución (comunes a crear y editar). */
const camposComunes = (f: Omit<NoConformidad, "id">) => ({
  descripcion_detallada: f.descripcionProblema || null,
  categoria: f.categoria || null,
  causa: f.causa || null,
  area_proceso: f.areaProceso || null,
  proveedor: f.proveedor || null,
  lote: f.lote || null,
  responsable: f.responsable || null,
  accion_tomada: f.accionTomada || null,
  accion_correctiva: f.accionCorrectiva || null,
  fecha_limite: f.fechaLimite || null,
  responsable_accion: f.responsableAccion || null,
  tipo_solucion: solucionAApi(f.tipoSolucion),
  solucion_aplicada: f.solucion || null,
  foto_evidencia: f.evidencia || null,
});

export const listarNoConformidades = async (): Promise<NoConformidad[]> => {
  const { data } = await api.get<NoConformidadApi[]>("/productos-no-conformes");
  return data.map(mapearNoConformidadApi);
};

/** Registro manual: el backend toma nombre, unidad y categoría del catálogo y
 *  descuenta el stock (producto de reventa o insumo). */
export const crearNoConformidad = async (f: Omit<NoConformidad, "id">): Promise<NoConformidad> => {
  const { data } = await api.post<NoConformidadApi>("/productos-no-conformes", {
    tipo_no_conformidad: f.tipo,
    id_producto: f.tipo === "Producto" && f.idProducto ? Number(f.idProducto) : null,
    id_insumo: f.tipo === "Producto insumo" && f.idInsumo ? idInsumoApiDesdeFront(f.idInsumo) : null,
    id_orden_produccion: idOrdenApi(f.ordenRef),
    id_venta: idVentaApi(f.ventaRef),
    fecha_registro: f.fechaRegistro,
    cantidad_afectada: f.cantidadAfectada,
    motivo: f.tipoNoConformidad,
    ...camposComunes(f),
  });
  return mapearNoConformidadApi(data);
};

export const actualizarNoConformidad = async (
  id: string,
  f: Omit<NoConformidad, "id">,
): Promise<NoConformidad> => {
  const { data } = await api.put<NoConformidadApi>(`/productos-no-conformes/${id}`, camposComunes(f));
  return mapearNoConformidadApi(data);
};

export const completarNoConformidad = async (
  id: string,
  tipoSolucion: string,
  solucion: string,
): Promise<NoConformidad> => {
  const { data } = await api.patch<NoConformidadApi>(`/productos-no-conformes/${id}/estado`, {
    estado: "Completado",
    tipo_solucion: solucionAApi(tipoSolucion),
    solucion_aplicada: solucion,
  });
  return mapearNoConformidadApi(data);
};

export const eliminarNoConformidad = async (id: string): Promise<void> => {
  await api.delete(`/productos-no-conformes/${id}`);
};
