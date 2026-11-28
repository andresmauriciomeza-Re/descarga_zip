import { type Faltante, esFaltanteProductoInsumo, esInsumoInactivo } from "@/features/production-orders/utils/production-orders";
import type { Insumo } from "@/features/supplies/utils/supplies";
import { EstadoPill } from "@/shared/components/panel/StatusPill";
import { motivoFaltante, fmtCant } from "@/shared/utils/availability";

export function AvisoFaltantes({
  faltantes,
  onIrInsumos,
  insumos,
  onComprar,
  onPreparar,
}: {
  faltantes: Faltante[];
  onIrInsumos?: () => void;
  insumos?: Insumo[];
  onComprar?: (faltantes: Faltante[]) => void;
  onPreparar?: (faltante: Faltante) => void;
}) {
  if (faltantes.length === 0) return null;
  const reales = faltantes.filter((f) => !f.motivo && f.falta > 0);
  const productosInsumo = insumos ? reales.filter((f) => esFaltanteProductoInsumo(f, insumos)) : [];
  const crudos = reales.filter((f) => !productosInsumo.includes(f));
  return (
    <div className="pn-aviso" style={{ display: "block" }}>
      <h2 style={{ marginBottom: 6 }}>Faltan insumos para empezar</h2>
      <p style={{ fontSize: 18, marginBottom: 8 }}>No hay lo suficiente en la bodega. Baja la cantidad o compra lo que falta.</p>
      {faltantes.map((f) => (
        <div key={f.insumoId} className="text-lg" style={{ color: "var(--ambar-texto)" }}>
          {esInsumoInactivo(f) ? (
            <p>
              Insumo inactivo: {f.nombre}.{" "}
              <button
                type="button"
                onClick={onIrInsumos}
                className="pn-boton pn-boton--normal" style={{ minHeight: 46, marginLeft: 8 }}
              >
                Ir a Insumos
              </button>
            </p>
          ) : (
            <p className="flex flex-wrap items-center gap-3" style={{ margin: "4px 0" }}>
              <EstadoPill tono="rojo">Falta</EstadoPill>
              <span>
                {f.motivo
                  ? motivoFaltante(f)
                  : `${f.nombre}: faltan ${fmtCant(f.falta, f.unidad)} (hay ${fmtCant(f.stock, f.unidad)})`}
              </span>
            </p>
          )}
        </div>
      ))}
      {((onComprar && crudos.length > 0) || (onPreparar && productosInsumo.length > 0)) && (
        <div className="pt-2 flex flex-wrap gap-3">
          {onComprar && crudos.length > 0 && (
            <button
              type="button"
              onClick={() => onComprar(crudos)}
              className="pn-boton pn-boton--principal"
            >
              Comprar insumos faltantes
            </button>
          )}
          {onPreparar && productosInsumo.map((f) => (
            <button
              key={f.insumoId}
              type="button"
              onClick={() => onPreparar(f)}
              className="pn-boton pn-boton--principal"
            >
              Preparar {f.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
