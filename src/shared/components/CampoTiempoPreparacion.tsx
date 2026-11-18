import { useId } from "react";

const MINIMO = 5;
const MAXIMO = 180;
const MENSAJE = "Ingresa un número entero entre 5 y 180 minutos.";

export function minutosPreparacionValidos(valor: string) {
  const minutos = Number(valor);
  return Number.isInteger(minutos) && minutos >= MINIMO && minutos <= MAXIMO;
}

export function CampoTiempoPreparacion({ valor, onChange, deshabilitado }: {
  valor: string;
  onChange: (valor: string) => void;
  deshabilitado?: boolean;
}) {
  const id = useId();
  const invalido = !minutosPreparacionValidos(valor);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted-foreground">
        Tiempo de preparación (minutos)
      </label>
      <input
        id={id}
        className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm"
        type="number"
        min={MINIMO}
        max={MAXIMO}
        step={1}
        required
        value={valor}
        onChange={e => onChange(e.target.value)}
        disabled={deshabilitado}
        aria-invalid={invalido}
        aria-describedby={invalido ? id + "-error" : undefined}
      />
      {invalido && <p id={id + "-error"} className="mt-1 text-xs text-red-600" role="alert">{MENSAJE}</p>}
    </div>
  );
}
