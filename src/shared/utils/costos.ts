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
