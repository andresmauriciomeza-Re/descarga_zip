import type { Periodo } from "@/shared/utils/dates";
import type { MesDisponible } from "@/features/dashboard/utils/dashboard";

export function SelectorMes({
  periodo,
  mes,
  meses,
  onChange,
}: {
  periodo: Periodo;
  mes: string;
  meses: MesDisponible[];
  onChange: (mes: string) => void;
}) {
  if (periodo !== "mes") return null;
  const indiceEncontrado = meses.findIndex((opcion) => opcion.clave === mes);
  const indice = indiceEncontrado < 0 ? meses.length - 1 : indiceEncontrado;
  const seleccionado = meses[indice];
  const mesAnterior = meses[indice - 1];
  const mesSiguiente = meses[indice + 1];
  if (!seleccionado) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Seleccionar mes">
      <button
        type="button"
        onClick={() => {
          if (mesAnterior) onChange(mesAnterior.clave);
        }}
        disabled={indice === 0}
        className="pn-chip disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ‹ Mes anterior
      </button>
      <span className="min-w-[8rem] text-center text-[17px] font-semibold text-foreground" aria-live="polite">
        {seleccionado.etiqueta}
      </span>
      <button
        type="button"
        onClick={() => {
          if (mesSiguiente) onChange(mesSiguiente.clave);
        }}
        disabled={indice === meses.length - 1}
        className="pn-chip disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Mes siguiente ›
      </button>
    </div>
  );
}
