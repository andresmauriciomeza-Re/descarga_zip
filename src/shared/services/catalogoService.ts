import api from './api';

export interface ProductoApi {
  id_producto: number;
  id_categoria: number;
  nombre: string;
  tipo: 'Elaborado' | 'Reventa' | string;
  precio_venta: number | string;
  costo_unitario?: number | string;
  unidad_venta: string;
  stock?: number;
  imagen: string | null;
  /** `imagen_data IS NOT NULL`: el binario NO viaja en el JSON; con true el
      menú pide la imagen a `GET /productos/:id/imagen`. */
  tiene_imagen?: boolean;
  estado: string;
  categoria_nombre: string;
  categoria_descripcion: string | null;
  categoria_emoji: string | null;
}

export interface CategoriaApi {
  id_categoria: number;
  nombre: string;
  descripcion: string | null;
  emoji: string | null;
  estado: boolean;
}

export const obtenerCatalogo = async () => {
  const [productos, categorias] = await Promise.all([
    api.get<ProductoApi[]>('/productos'),
    api.get<CategoriaApi[]>('/categorias-productos'),
  ]);
  return { productos: productos.data, categorias: categorias.data };
};
