import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  PARAMETROS_COSTOS_PREDETERMINADOS,
  type ParametrosCostos,
} from "@/shared/utils/costs";
import { BotonAccion } from "@/shared/components/buttons/ActionButton";
import type { ParametrosCostosPayload } from "@/features/products/services/costParametersApi";

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
  ayuda: string;
  paso: string;
}[] = [
  { clave: "mano_obra_hora", etiqueta: "Lo que se le paga a un cocinero por hora", ayuda: "Lo que cuesta una hora de trabajo de quien prepara.", paso: "0.01" },
  { clave: "tarifa_gas_m3", etiqueta: "Precio del metro cúbico de gas", ayuda: "Míralo en la factura del gas.", paso: "0.01" },
  { clave: "consumo_gas_m3_hora", etiqueta: "Gas que gasta el horno en una hora", ayuda: "En metros cúbicos por hora.", paso: "0.001" },
  { clave: "margen_ganancia", etiqueta: "¿Cuánto le quieres ganar a cada producto?", ayuda: "En porcentaje. Ejemplo: 30 quiere decir que ganas 30 pesos de cada 100 que te cuesta hacerlo.", paso: "0.01" },
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

  return (
    <div className="pn-dialogo-fondo" role="presentation" style={{ zIndex: 120 }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="parametros-costos-titulo"
        className="pn-dialogo"
        style={{ zIndex: 121, width: "min(94vw, 720px)" }}
      >
        <h2 id="parametros-costos-titulo">Costos de preparación</h2>
        <p className="pn-seccion__ayuda" style={{ marginTop: -6 }}>
          Con estos datos se calcula lo que cuesta hacer cada cosa y el precio que se recomienda.
        </p>

        {error && (
          <div className="pn-dialogo__caja pn-dialogo__caja--ambar">
            <strong>No pudimos cargar los costos</strong>
            {error}
            <div style={{ marginTop: 10 }}>
              <BotonAccion onClick={onReintentar}>Intentar de nuevo</BotonAccion>
            </div>
          </div>
        )}

        <form onSubmit={guardar}>
          <div className="pn-campo" style={{ display: "grid", gap: 18 }}>
            {CAMPOS.map(({ clave, etiqueta, ayuda, paso }) => (
              <div key={clave}>
                <label htmlFor={`parametro-${clave}`} className="pn-etiqueta">{etiqueta}</label>
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
                  disabled={cargando || !parametros || guardando || !puedeEditar}
                />
                <p className="pn-campo__ayuda">{ayuda}</p>
              </div>
            ))}
          </div>

          {(parametrosVista.tarifa_gas_m3 === 0 || parametrosVista.consumo_gas_m3_hora === 0) && (
            <div className="pn-dialogo__caja pn-dialogo__caja--ambar" style={{ marginTop: 16 }}>
              Falta anotar el precio del gas y lo que gasta el horno.
            </div>
          )}

          {!puedeEditar && (
            <p className="pn-seccion__ayuda" style={{ marginTop: 14 }}>
              Solo el administrador puede cambiar estos costos.
            </p>
          )}

          <div className="pn-dialogo__caja" style={{ marginTop: 16 }}>
            El costo de cada pizza se vuelve a calcular solo. Los precios del menú <strong style={{ display: "inline" }}>NO</strong> cambian solos.
          </div>

          <div className="pn-dialogo__botones">
            <BotonAccion variante="normal" onClick={onCerrar}>Cerrar</BotonAccion>
            <BotonAccion variante="principal" type="submit" disabled={cargando || !parametros || guardando || !puedeEditar}>
              {guardando ? "Guardando…" : "Guardar los costos"}
            </BotonAccion>
          </div>
        </form>
      </section>
    </div>
  );
}
