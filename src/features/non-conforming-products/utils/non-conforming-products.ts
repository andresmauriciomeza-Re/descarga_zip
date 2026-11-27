export const PER_PAGE = 10;

export type Tipo = "Producto" | "Producto insumo" | "Venta";

export type EstadoNC = "Pendiente" | "Completado";

export interface NoConformidad {
  id: string;
  tipo: Tipo;
  nombre: string;
  categoria: string;
  fechaRegistro: string;
  cantidadAfectada: number;
  unidadMedida: string;
  tamano?: "Mediana" | "Grande";
  tipoNoConformidad: string;
  descripcionProblema: string;
  causa: string;
  evidencia?: string;
  areaProceso: string;
  proveedor?: string;
  lote?: string;
  responsable: string;
  estado: EstadoNC;
  accionTomada?: string;
  accionCorrectiva?: string;
  fechaLimite?: string;
  responsableAccion?: string;
  fechaCierre?: string;
  tipoSolucion?: string;
  solucion?: string;
  ventaRef?: string;
  ordenRef?: string;
  /** Ids reales del catálogo (vienen de la API). Producto: id_producto como
      texto; Producto insumo: "INS-###". */
  idProducto?: string;
  idInsumo?: string;
  /** id_orden_produccion de la merma (el detalle de la orden la busca así). */
  idOrdenProduccion?: number;
  /** Merma de producción o devolución: los crea el backend y no se eliminan. */
  generadoPorSistema?: boolean;
}

export const ESTADO_CONFIG: Record<EstadoNC, string> = {
  Pendiente:  "bg-amber-100 text-amber-800",
  Completado: "bg-emerald-100 text-emerald-800",
};
