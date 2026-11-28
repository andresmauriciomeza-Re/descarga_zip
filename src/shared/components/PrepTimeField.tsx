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
      <label htmlFor={id} className="pn-etiqueta">
        ¿Cuántos minutos se demora?
      </label>
      <input
        id={id}
        className="w-full rounded-[14px] border-2 border-[var(--borde-campo)] bg-white px-4 min-h-[56px] text-lg"
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
      {invalido && <p id={id + "-error"} style={{ fontSize: 18, fontWeight: 600, color: "var(--rojo-texto)", margin: "6px 0 0" }} role="alert">{MENSAJE}</p>}
    </div>
  );
}
