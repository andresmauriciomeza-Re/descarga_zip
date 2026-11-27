export interface TablaDatos {
  titulo: string;
  columnas: string[];
  /** La primera celda de cada fila es el encabezado de la fila. */
  filas: string[][];
}

export interface FuenteOficial {
  nombre: string;
  url: string;
}

export interface Servicio {
  nombre: string;
  descripcion: string;
  terminos: string;
}

export interface LicenciaResumen {
  nombre: string;
  resumen: string;
  /** Texto completo oficial (SPDX). */
  url: string;
}

export interface SeccionIndice {
  id: string;
  titulo: string;
}
