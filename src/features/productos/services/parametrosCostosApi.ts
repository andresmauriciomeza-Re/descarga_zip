import api from "@/shared/services/api";
import type { ParametrosCostos } from "@/shared/utils/costos";

export interface ParametrosCostosPayload {
  mano_obra_hora: number;
  tarifa_gas_m3: number;
  consumo_gas_m3_hora: number;
  margen_ganancia: number;
}

export const obtenerParametrosCostos = async (): Promise<ParametrosCostos> => {
  const { data } = await api.get<ParametrosCostos>("/parametros-costos");
  return data;
};

export const guardarParametrosCostos = async (
  payload: ParametrosCostosPayload,
): Promise<ParametrosCostos> => {
  const { data } = await api.put<ParametrosCostos>("/parametros-costos", payload);
  return data;
};
