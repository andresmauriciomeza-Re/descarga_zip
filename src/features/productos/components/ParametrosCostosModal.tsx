import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  PARAMETROS_COSTOS_PREDETERMINADOS,
  type ParametrosCostos,
} from "@/shared/utils/costos";
import type { ParametrosCostosPayload } from "@/features/productos/services/parametrosCostosApi";

type ValoresFormulario = Record<keyof ParametrosCostosPayload, string>;

const aFormulario = (parametros: ParametrosCostos): ValoresFormulario => ({
  mano_obra_hora: String(parametros.mano_obra_hora),
  tarifa_gas_m3: String(parametros.tarifa_gas_m3),
  consumo_gas_m3_hora: String(parametros.consumo_gas_m3_hora),
  margen_ganancia: String(parametros.margen_ganancia),
});

const CAMPOS: {
  clave: keyof ValoresFormulario;
  etiqueta: string;
  paso: string;
}[] = [
  { clave: "mano_obra_hora", etiqueta: "Mano de obra ($ por hora)", paso: "0.01" },
  { clave: "tarifa_gas_m3", etiqueta: "Tarifa de gas ($/m³)", paso: "0.01" },
  { clave: "consumo_gas_m3_hora", etiqueta: "Consumo del horno (m³/h)", paso: "0.001" },
  { clave: "margen_ganancia", etiqueta: "Margen de ganancia (%)", paso: "0.01" },
];

export function ParametrosCostosModal({
  parametros,
  cargando,
  error,
  puedeEditar,
  onReintentar,
  onCerrar,
  onGuardar,
}: {
  parametros: ParametrosCostos | null;
  cargando: boolean;
  error: string | null;
  puedeEditar: boolean;
  onReintentar: () => void;
  onCerrar: () => void;
  onGuardar: (datos: ParametrosCostosPayload) => Promise<void>;
}) {
  const [valores, setValores] = useState<ValoresFormulario>(() =>
    aFormulario(parametros ?? PARAMETROS_COSTOS_PREDETERMINADOS),
  );
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (parametros) setValores(aFormulario(parametros));
  }, [parametros]);

  const numeros: ParametrosCostosPayload = {
    mano_obra_hora: Number(valores.mano_obra_hora),
    tarifa_gas_m3: Number(valores.tarifa_gas_m3),
    consumo_gas_m3_hora: Number(valores.consumo_gas_m3_hora),
    margen_ganancia: Number(valores.margen_ganancia),
  };
  const parametrosVista = parametros
    ? { ...parametros, ...numeros }
    : PARAMETROS_COSTOS_PREDETERMINADOS;

  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!parametros || Object.values(numeros).some((n) => !Number.isFinite(n) || n < 0)) {
      toast.error("Revisa los parámetros: deben ser números iguales o mayores que cero.");
      return;
    }
    setGuardando(true);
    try {
      await onGuardar(numeros);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "No se pudieron guardar los parámetros.");
    } finally {
      setGuardando(false);
    }
  };

  const clsInput =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="parametros-costos-titulo"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="parametros-costos-titulo" className="text-xl font-bold text-foreground">
              Parámetros de costos
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Estos valores se usan para estimar la mano de obra, el gas y el precio recomendado.
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            <p>{error}</p>
            <button type="button" onClick={onReintentar} className="mt-2 font-semibold underline">
              Reintentar carga
            </button>
          </div>
        )}

        <form onSubmit={guardar}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CAMPOS.map(({ clave, etiqueta, paso }) => (
              <div key={clave} className={clave === "mano_obra_hora" ? "sm:col-span-2" : ""}>
                <label htmlFor={`parametro-${clave}`} className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {etiqueta}
                </label>
                <input
                  id={`parametro-${clave}`}
                  type="number"
                  min="0"
                  step={paso}
                  required
                  value={valores[clave]}
                  onChange={(event) =>
                    setValores((prev) => ({ ...prev, [clave]: event.target.value }))
                  }
                  className={clsInput}
                  disabled={cargando || !parametros || guardando || !puedeEditar}
                />
                {clave === "mano_obra_hora" && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Costo de una hora de trabajo del personal de preparación
                  </p>
                )}
              </div>
            ))}
          </div>

          {(parametrosVista.tarifa_gas_m3 === 0 || parametrosVista.consumo_gas_m3_hora === 0) && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Configura la tarifa del gas (factura EPM) y el consumo del horno.
            </p>
          )}

          {!puedeEditar && (
            <p className="mt-3 text-sm text-muted-foreground">
              Solo el Administrador puede modificar estos parámetros.
            </p>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={onCerrar} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
              Cerrar
            </button>
            <button
              type="submit"
              disabled={cargando || !parametros || guardando || !puedeEditar}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar parámetros"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
