export type EstadoEntrega = "listo" | "entregado";

export interface ProductoTerminado {
  id: string;
  idReceta: string;
  nombreReceta: string;
  fechaEntrega: string;
  horaEntrega: string;
  cantidad: number;
  tamano: "Mediana" | "Grande";
  estadoEntrega: EstadoEntrega;
  recalentado?: boolean;
  fechaEntregaReal?: string;
}
