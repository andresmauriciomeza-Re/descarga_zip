import { convertirUnidad, requeridosPorUnidad } from "@/shared/utils/disponibilidad";
import type { FichaVersion, PorcionesTamano } from "@/shared/utils/fichas";

export interface ParametrosCostos {
  id_parametro: number;
  mano_obra_hora: number;
  tarifa_gas_m3: number;
  consumo_gas_m3_hora: number;
  margen_ganancia: number;
  fecha_actualizacion: string;
}

export interface InsumoCosto {
  id: string;
  nombre: string;
  unidadMedida: string;
  costoUnitario: number;
}

export interface AvisoCostoInsumo {
  nombre: string;
  tipo: "sin-costo" | "no-encontrado" | "unidad-incompatible";
}

export interface ResumenCostoProducto {
  insumos: number;
  manoObra: number;
  gas: number;
  costoTotal: number;
  precioRecomendado: number;
  avisos: AvisoCostoInsumo[];
}

export interface RequeridoCostoOrden {
  insumoId: string;
  nombre: string;
  cantidad: number;
  unidad: string;
}

export interface ResumenCostoOrden {
  insumos: number;
  manoObra: number;
  gas: number;
  costoTotal: number;
  avisos: AvisoCostoInsumo[];
}

export const PARAMETROS_COSTOS_PREDETERMINADOS: ParametrosCostos = {
  id_parametro: 1,
  mano_obra_hora: 12673,
  tarifa_gas_m3: 0,
  consumo_gas_m3_hora: 0,
  margen_ganancia: 40,
  fecha_actualizacion: "",
};

const normalizar = (valor: string): string =>
  valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const calcularCostoInsumos = (
  requeridos: readonly { insumoId: string; nombre: string; cantidad: number; unidad: string }[],
  insumosCatalogo: readonly InsumoCosto[],
): { costo: number; avisos: AvisoCostoInsumo[] } => {
  const avisos: AvisoCostoInsumo[] = [];
  let costo = 0;

  for (const requerido of requeridos) {
    const insumo =
      insumosCatalogo.find((item) => item.id === requerido.insumoId) ??
      insumosCatalogo.find((item) => normalizar(item.nombre) === normalizar(requerido.nombre));

    if (!insumo) {
      avisos.push({ nombre: requerido.nombre, tipo: "no-encontrado" });
      continue;
    }

    const cantidadConvertida = convertirUnidad(
      requerido.cantidad,
      requerido.unidad,
      insumo.unidadMedida,
    );
    if (cantidadConvertida === null) {
      avisos.push({ nombre: insumo.nombre, tipo: "unidad-incompatible" });
      continue;
    }

    const costoUnitario = Number(insumo.costoUnitario);
    if (!Number.isFinite(costoUnitario) || costoUnitario <= 0) {
      avisos.push({ nombre: insumo.nombre, tipo: "sin-costo" });
      continue;
    }

    costo += cantidadConvertida * costoUnitario;
  }

  return { costo, avisos };
};

export const calcularCostoProducto = (
  ficha: FichaVersion,
  insumosCatalogo: readonly InsumoCosto[],
  parametros: ParametrosCostos,
  tamano?: string,
  porcionesFallback?: readonly PorcionesTamano[],
): ResumenCostoProducto => {
  const fichaParaCalculo =
    ficha.porcionesPorTamano?.length || !porcionesFallback?.length
      ? ficha
      : { ...ficha, porcionesPorTamano: [...porcionesFallback] };
  const { costo: costoInsumos, avisos } = calcularCostoInsumos(
    requeridosPorUnidad(fichaParaCalculo, tamano),
    insumosCatalogo,
  );

  const minutos = Math.max(0, Number(ficha.tiempoPreparacion) || 0);
  const labor = (minutos * parametros.mano_obra_hora) / 60;
  const gas =
    (minutos / 60) * parametros.consumo_gas_m3_hora * parametros.tarifa_gas_m3;
  const total = costoInsumos + labor + gas;
  const precioConMargen = total * (1 + parametros.margen_ganancia / 100);

  return {
    insumos: costoInsumos,
    manoObra: labor,
    gas,
    costoTotal: total,
    precioRecomendado: Math.ceil(precioConMargen / 100) * 100,
    avisos,
  };
};

/** Precio recomendado por PORCIÓN de pizza: costo del tamaño ÷ porciones
    (Mediana 6, Grande 8) × (1 + margen), redondeado a la centena. */
const precioPorPorcionBruto = (
  ficha: FichaVersion,
  insumosCatalogo: readonly InsumoCosto[],
  parametros: ParametrosCostos,
  tamano: string,
  porcionesFallback?: readonly PorcionesTamano[],
): number => {
  const resumen = calcularCostoProducto(ficha, insumosCatalogo, parametros, tamano, porcionesFallback);
  const porciones = tamano.trim().toLowerCase() === "grande" ? 8 : 6;
  return Math.ceil(((resumen.costoTotal / porciones) * (1 + parametros.margen_ganancia / 100)) / 100) * 100;
};

/** La porción Grande vale como mínimo este recargo sobre la Mediana. */
export const RECARGO_MINIMO_GRANDE = 0.10;

/** Mínimo de la Grande: recomendado Mediana × (1 + recargo), a la centena
    hacia arriba (se redondea antes para evitar errores de coma flotante). */
const minimoGrandeDesde = (mediana: number): number =>
  Math.ceil(Math.round(mediana * (1 + RECARGO_MINIMO_GRANDE) * 1000) / 1000 / 100) * 100;

/** true cuando el recomendado de la Grande se subió por la regla del 10 %. */
export const recomendadoGrandeIgualado = (
  ficha: FichaVersion,
  insumosCatalogo: readonly InsumoCosto[],
  parametros: ParametrosCostos,
  porcionesFallback?: readonly PorcionesTamano[],
): boolean => {
  const mediana = precioPorPorcionBruto(ficha, insumosCatalogo, parametros, "Mediana", porcionesFallback);
  return precioPorPorcionBruto(ficha, insumosCatalogo, parametros, "Grande", porcionesFallback)
    < minimoGrandeDesde(mediana);
};

export const precioRecomendadoPorPorcion = (
  ficha: FichaVersion,
  insumosCatalogo: readonly InsumoCosto[],
  parametros: ParametrosCostos,
  tamano: string,
  porcionesFallback?: readonly PorcionesTamano[],
): number => {
  const precio = precioPorPorcionBruto(ficha, insumosCatalogo, parametros, tamano, porcionesFallback);
  if (tamano.trim().toLowerCase() !== "grande") return precio;
  const mediana = precioPorPorcionBruto(ficha, insumosCatalogo, parametros, "Mediana", porcionesFallback);
  return Math.max(precio, minimoGrandeDesde(mediana));
};

export const calcularCostoOrden = (
  requeridos: readonly RequeridoCostoOrden[],
  insumosCatalogo: readonly InsumoCosto[],
  parametros: ParametrosCostos,
  tiempoPreparacionMin: number,
): ResumenCostoOrden => {
  const { costo: insumos, avisos } = calcularCostoInsumos(requeridos, insumosCatalogo);
  const minutos = Math.max(0, Number(tiempoPreparacionMin) || 0);
  const manoObra = (minutos * parametros.mano_obra_hora) / 60;
  const gas =
    (minutos / 60) * parametros.consumo_gas_m3_hora * parametros.tarifa_gas_m3;

  return {
    insumos,
    manoObra,
    gas,
    costoTotal: insumos + manoObra + gas,
    avisos,
  };
};

export const margenRealPorcentaje = (precioVenta: number, costoTotal: number): number | null =>
  costoTotal > 0 ? ((precioVenta - costoTotal) / costoTotal) * 100 : null;

export const formatearCOP = (valor: number): string =>
  `$${Math.round(valor).toLocaleString("es-CO")}`;
