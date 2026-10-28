import api from "@/shared/services/api";
import type { CategoriaApi } from "@/shared/services/catalogoService";
import { categoriaApiACategoria } from "@/shared/utils/catalogo";
import type { CategoriaProducto } from "@/features/categoria-productos/pages/CategoriaProductoScreen";
import type { ApiErrorConEstado } from "@/types/api";

/** Fila de GET /categorias-productos/gestion: la categoría (activa o
    inactiva) con sus productos asociados. */
export interface CategoriaGestionApi extends CategoriaApi {
  total_productos: number | string;
  /** Productos que hoy salen en el menú público (se ocultan al inactivar). */
  productos_menu: number | string;
}

/** Lo que envían Crear y Editar. `emoji` lleva el emoji elegido. */
export interface CategoriaPayload {
  nombre?: string;
  emoji?: string;
  descripcion?: string | null;
  estado?: boolean;
}

export const mapearCategoriaGestion = (row: CategoriaGestionApi): CategoriaProducto => ({
  ...categoriaApiACategoria(row),
  totalProductos: Number(row.total_productos) || 0,
  productosMenu: Number(row.productos_menu) || 0,
});

export const mensajeErrorCategorias = (error: unknown, fallback: string): string => {
  const status = (error as ApiErrorConEstado | undefined)?.status;
  const mensaje = error instanceof Error ? error.message : "";
  if (status === 403 && !mensaje) return "No tienes permiso para esta acción.";
  return mensaje || fallback;
};

export const listarCategoriasGestion = async (): Promise<CategoriaProducto[]> => {
  const { data } = await api.get<CategoriaGestionApi[]>("/categorias-productos/gestion");
  return data.map(mapearCategoriaGestion);
};

export const crearCategoria = async (datos: CategoriaPayload): Promise<CategoriaProducto> => {
  const { data } = await api.post<CategoriaGestionApi>("/categorias-productos", datos);
  return mapearCategoriaGestion(data);
};

export const editarCategoria = async (id: string, datos: CategoriaPayload): Promise<CategoriaProducto> => {
  const { data } = await api.put<CategoriaGestionApi>(`/categorias-productos/${id}`, datos);
  return mapearCategoriaGestion(data);
};

export const cambiarEstadoCategoria = async (id: string, estado: boolean): Promise<CategoriaProducto> => {
  const { data } = await api.patch<CategoriaGestionApi>(`/categorias-productos/${id}/estado`, { estado });
  return mapearCategoriaGestion(data);
};

export const eliminarCategoria = async (id: string): Promise<void> => {
  await api.delete(`/categorias-productos/${id}`);
};
