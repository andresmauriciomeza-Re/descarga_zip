export const partesPorPorcion = (tamano: string): number | undefined => {
  const normalizado = tamano.trim().toLowerCase();
  return normalizado === "mediana" ? 3 : normalizado === "grande" ? 4 : undefined;
};

export function disponiblePizza(
  partes: number,
  tamano: string,
  otras: readonly { tamano: string; cantidad: number }[],
): number {
  const factor = partesPorPorcion(tamano);
  if (!factor) return 0;
  const consumidas = otras.reduce((suma, linea) =>
    suma + linea.cantidad * (partesPorPorcion(linea.tamano) ?? 0), 0);
  return Math.max(0, Math.floor((partes - consumidas) / factor));
}
