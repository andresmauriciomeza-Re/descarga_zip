import api from "@/shared/services/api";
import type { Producto } from "@/features/productos/pages/GestionProductosScreen";

export interface ProductoApi {
  id_producto: number | string;
  id_categoria: number | string;
  categoria_nombre?: string | null;
  nombre: string;
  tipo: "Elaborado" | "Reventa" | string;
  precio_venta: number | string;
  precio_grande?: number | string | null;
  costo_unitario?: number | string | null;
  unidad_venta: string;
  imagen?: string | null;
  /** `imagen_data IS NOT NULL`: ¿la BD tiene los bytes de la imagen? El
      binario no viaja en el JSON; con true el menú pide
      `GET /productos/:id/imagen`. */
  tiene_imagen?: boolean | null;
  estado: string;
  stock?: number | string | null;
  contenido?: number | string | null;
  contenido_unidad?: "ml" | "L" | null;
  unidad_compra?: "und" | "paca" | "caja" | null;
  unidades_por_empaque?: number | string | null;
  ultimo_monto_sin_iva?: number | string | null;
  ultimo_iva_compra?: number | string | null;
  /** Punto C1: último monto digitado (tal cual, sin convertir IVA). */
  ultimo_monto_digitado?: number | string | null;
}

export interface ProductoApiCreacion {
  id_categoria: number;
  nombre: string;
  tipo: "Elaborado" | "Reventa";
  unidad_venta: string;
  imagen?: string;
  precio_venta?: number;
  precio_grande?: number | null;
  contenido?: number;
  contenido_unidad?: "ml" | "L";
  unidad_compra?: "und" | "paca" | "caja";
  unidades_por_empaque?: number;
}

export interface EntradaCompraApi {
  unidades: number;
  costo_unitario: number;
  precio_venta: number;
  ultimo_monto_sin_iva: number;
  ultimo_iva_compra: number;
  /** Punto C1: monto unitario tal cual se digitó en la línea (sin convertir
   *  por IVA). Opcional en el tipo por compatibilidad; la API lo acepta como
   *  nullable. */
  ultimo_monto_digitado?: number;
}

const idCategoriaNumero = (id: string): number => {
  const n = Number(id);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error("Selecciona una categoría válida.");
  return n;
};

export const productoPanelACreacion = (p: Producto): ProductoApiCreacion => {
  const reventa = p.tipo === "Producto terminado";
  return {
    id_categoria: idCategoriaNumero(p.idCategoria),
    nombre: p.nombre.trim(),
    tipo: reventa ? "Reventa" : "Elaborado",
    unidad_venta: reventa ? "und" : p.unidadVenta,
    ...(p.imagen ? { imagen: p.imagen } : {}),
    ...(reventa
      ? {
          contenido: Number(p.contenido ?? 0),
          contenido_unidad: p.contenidoUnidad ?? "ml",
          unidad_compra: p.unidadCompra ?? "und",
          ...(p.unidadCompra && p.unidadCompra !== "und"
            ? { unidades_por_empaque: Number(p.unidadesPorEmpaque ?? 0) }
            : {}),
        }
      : {
          precio_venta: Number(p.precioUnitario),
          ...(p.precioGrande == null ? {} : { precio_grande: Number(p.precioGrande) }),
        }),
  };
};

export const productoPanelAEdicion = (p: Producto): Partial<Omit<ProductoApiCreacion, "tipo">> => {
  const reventa = p.tipo === "Producto terminado";
  const esPizza = (p.categoriaNombre ?? "").toLowerCase().includes("pizza");
  return {
    id_categoria: idCategoriaNumero(p.idCategoria),
    nombre: p.nombre.trim(),
    unidad_venta: reventa ? "und" : p.unidadVenta,
    imagen: p.imagen,
    ...(reventa
      ? {
          ...(Number(p.contenido ?? 0) > 0
            ? {
                contenido: Number(p.contenido),
                contenido_unidad: p.contenidoUnidad ?? "ml",
              }
            : {}),
          unidad_compra: p.unidadCompra ?? "und",
          ...(p.unidadCompra && p.unidadCompra !== "und"
            ? { unidades_por_empaque: Number(p.unidadesPorEmpaque ?? 0) }
            : { unidades_por_empaque: undefined }),
        }
      : {
          precio_venta: Number(p.precioUnitario),
          precio_grande: esPizza && p.precioGrande != null ? Number(p.precioGrande) : null,
        }),
  };
};

/** Único mapeo de la representación de la API al modelo usado por el panel. */
export const mapearProductoApi = (p: ProductoApi): Producto => ({
  id: String(p.id_producto),
  imagen: p.imagen ?? "",
  tieneImagen: p.tiene_imagen ?? false,
  nombre: p.nombre,
  idCategoria: String(p.id_categoria),
  categoriaNombre: p.categoria_nombre ?? undefined,
  tipo: p.tipo === "Elaborado" ? "Producto insumo" : "Producto terminado",
  costoUnitario: Number(p.costo_unitario ?? 0),
  precioUnitario: Number(p.precio_venta ?? 0),
  ...(p.precio_grande == null ? {} : { precioGrande: Number(p.precio_grande) }),
  unidadVenta: p.unidad_venta,
  contenido: p.contenido == null ? undefined : Number(p.contenido),
  contenidoUnidad: p.contenido_unidad ?? undefined,
  unidadCompra: p.unidad_compra ?? undefined,
  unidadesPorEmpaque: p.unidades_por_empaque == null ? undefined : Number(p.unidades_por_empaque),
  ultimoMontoSinIva: p.ultimo_monto_sin_iva == null ? undefined : Number(p.ultimo_monto_sin_iva),
  ultimoIvaCompra: p.ultimo_iva_compra == null ? undefined : Number(p.ultimo_iva_compra),
  ultimoMontoDigitado:
    p.ultimo_monto_digitado == null ? undefined : Number(p.ultimo_monto_digitado),
  stockDisponible: Number(p.stock ?? 0),
  stockApi: p.stock == null ? undefined : Number(p.stock),
  estado: p.estado as Producto["estado"],
});

export const mensajeErrorProductos = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const productoDeRespuesta = (data: ProductoApi | { producto: ProductoApi }): Producto =>
  mapearProductoApi("producto" in data ? data.producto : data);

const pareceProductoApi = (data: unknown): data is ProductoApi =>
  !!data && typeof data === "object" && "id_producto" in data;

export const listarGestion = async (): Promise<Producto[]> => {
  const { data } = await api.get<ProductoApi[]>("/productos/gestion");
  return data.map(mapearProductoApi);
};

export const crearProducto = async (payload: ProductoApiCreacion): Promise<Producto> => {
  const { data } = await api.post<ProductoApi | { producto: ProductoApi }>("/productos", payload);
  return productoDeRespuesta(data);
};

export const editarProducto = async (
  id: string,
  payload: Partial<Omit<ProductoApiCreacion, "tipo">>,
): Promise<Producto> => {
  const { data } = await api.put<ProductoApi | { producto: ProductoApi }>(
    `/productos/${encodeURIComponent(id)}`,
    payload,
  );
  return productoDeRespuesta(data);
};

export const cambiarEstadoProducto = async (
  id: string,
  estado: Producto["estado"],
): Promise<Producto> => {
  const { data } = await api.patch<ProductoApi | { producto: ProductoApi } | { mensaje?: string }>(
    `/productos/${encodeURIComponent(id)}/estado`,
    { estado },
  );
  if (pareceProductoApi(data) || (data && "producto" in data)) return productoDeRespuesta(data as ProductoApi | { producto: ProductoApi });
  const listado = await listarGestion();
  const actualizado = listado.find((p) => p.id === id);
  if (!actualizado) throw new Error("El producto se actualizó, pero no apareció en la respuesta del servidor.");
  return actualizado;
};

export const entradaCompra = async (id: string, payload: EntradaCompraApi): Promise<Producto> => {
  const { data } = await api.post<ProductoApi | { producto: ProductoApi }>(
    `/productos/${encodeURIComponent(id)}/entrada-compra`,
    payload,
  );
  return productoDeRespuesta(data);
};

export const reversaCompra = async (id: string, unidades: number): Promise<Producto | null> => {
  const { data } = await api.post<ProductoApi | { producto: ProductoApi } | { mensaje?: string }>(
    `/productos/${encodeURIComponent(id)}/reversa-compra`,
    { unidades },
  );
  if (pareceProductoApi(data) || (data && "producto" in data)) return productoDeRespuesta(data as ProductoApi | { producto: ProductoApi });
  try {
    const listado = await listarGestion();
    return listado.find((p) => p.id === id) ?? null;
  } catch {
    // El POST ya confirmó la reversa. No se reporta como fallida solo porque
    // el GET de refresco no respondió, para evitar repetir el descuento.
    return null;
  }
};
