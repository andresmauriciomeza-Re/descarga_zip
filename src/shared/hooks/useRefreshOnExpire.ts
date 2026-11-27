import { useEffect, useRef } from "react";

export function tiempoRestante(fin: number, ahora: number): string {
  const segundos = Math.max(0, Math.ceil((fin - ahora) / 1000));
  return `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;
}

export function useRefrescarAlVencer(plazos: Array<number | undefined>, refrescar: () => Promise<boolean | void>) {
  const refrescarRef = useRef(refrescar);
  refrescarRef.current = refrescar;
  const clave = plazos.filter((plazo): plazo is number => plazo != null && Number.isFinite(plazo)).sort((a, b) => a - b).join(",");

  useEffect(() => {
    if (!clave) return;
    let cancelado = false;
    let id: ReturnType<typeof setTimeout>;
    const primerPlazo = Number(clave.split(",")[0]);
    const intentar = async () => {
      try {
        const resultado = await refrescarRef.current();
        if (resultado === false) console.error("No se pudieron refrescar los estados de calentamiento.");
      } catch (error) {
        console.error("No se pudieron refrescar los estados de calentamiento:", error);
      }
      if (!cancelado) id = setTimeout(intentar, 5000);
    };
    id = setTimeout(intentar, Math.max(0, primerPlazo - Date.now()) + 100);
    return () => { cancelado = true; clearTimeout(id); };
  }, [clave]);
}
