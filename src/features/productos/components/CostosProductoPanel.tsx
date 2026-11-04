import type { Insumo } from "@/features/insumos/pages/GestionInsumosScreen";
import {
  calcularCostoProducto,
  formatearCOP,
  margenRealPorcentaje,
  type ParametrosCostos,
} from "@/shared/utils/costos";
import type { FichaVersion, PorcionesTamano } from "@/shared/utils/fichas";

const porcentaje = (valor: number): string =>
  `${valor.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;

export function CostosProductoPanel({
  ficha,
  insumos,
  parametros,
  porcionesFallback,
  precioMediana,
  precioGrande,
  soloLectura = false,
  onUsarPrecio,
  cargando = false,
  error,
  onReintentar,
}: {
  ficha: FichaVersion;
  insumos: Insumo[];
  parametros: ParametrosCostos | null;
  porcionesFallback?: readonly PorcionesTamano[];
  precioMediana: number;
  precioGrande?: number;
  soloLectura?: boolean;
  onUsarPrecio?: (precio: number, tamano: string) => void;
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
}) {
  const tamanos = ficha.porcionesPorTamano?.length
    ? ficha.porcionesPorTamano
    : porcionesFallback?.length
      ? porcionesFallback
      : [{ tamano: "Único", porciones: ficha.porciones }];

  if (!parametros) {
    return (
      <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3 text-sm">
        <p className="font-semibold text-foreground">Costo y precio</p>
        <p className="mt-1 text-muted-foreground">
          {cargando ? "Cargando parámetros de costos..." : error ?? "No se pudieron cargar los parámetros de costos."}
        </p>
        {error && onReintentar && (
          <button type="button" onClick={onReintentar} className="mt-2 text-primary underline">
            Reintentar
          </button>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Los parámetros se configuran en Orden de producción.
        </p>
      </div>
    );
  }

  const resultados = tamanos.map((tamano, index) => {
    const resumen = calcularCostoProducto(
      ficha,
      insumos,
      parametros,
      tamano.tamano,
      porcionesFallback ?? tamanos,
    );
    const esGrande = tamano.tamano.trim().toLowerCase() === "grande";
    const precio = esGrande ? (precioGrande ?? 0) : precioMediana;
    const margen = margenRealPorcentaje(precio, resumen.costoTotal);
    const nombre = tamanos.length > 1 ? tamano.tamano : "";
    return {
      key: `${tamano.tamano}-${index}`,
      nombre,
      tamano: tamano.tamano,
      resumen,
      precio,
      margen,
    };
  });

  return (
    <section className="mt-4 rounded-xl border border-border bg-muted/30 p-3" aria-label="Costo y precio">
      <h3 className="mb-2 text-sm font-bold text-foreground">Costo y precio</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {resultados.map(({ key, nombre, tamano, resumen, precio, margen }) => (
          <div key={key} className="rounded-lg border border-border bg-card p-3 text-xs">
            {nombre && <p className="mb-2 font-bold text-foreground">{nombre}</p>}
            <div className="space-y-1">
              <p className="flex justify-between gap-3"><span>Insumos</span><strong>{formatearCOP(resumen.insumos)}</strong></p>
              <p className="flex justify-between gap-3"><span>Mano de obra</span><strong>{formatearCOP(resumen.manoObra)}</strong></p>
              <p className="flex justify-between gap-3"><span>Gas</span><strong>{formatearCOP(resumen.gas)}</strong></p>
              <p className="flex justify-between gap-3 border-t border-border pt-1 font-bold">
                <span>COSTO TOTAL</span><strong>{formatearCOP(resumen.costoTotal)}</strong>
              </p>
              <p className="flex justify-between gap-3 pt-1">
                <span>Precio recomendado (margen {porcentaje(parametros.margen_ganancia)})</span>
                <strong>{formatearCOP(resumen.precioRecomendado)}</strong>
              </p>
              <p className={`flex justify-between gap-3 ${((margen !== null && margen < parametros.margen_ganancia) || precio < resumen.costoTotal) ? "text-red-600" : "text-emerald-700"}`}>
                <span>Margen real con el precio escrito{precio ? ` (${formatearCOP(precio)})` : ""}</span>
                <strong>{margen === null ? "—" : porcentaje(margen)}</strong>
              </p>
            </div>
            {!soloLectura && onUsarPrecio && (
              <button
                type="button"
                onClick={() => onUsarPrecio(resumen.precioRecomendado, tamano)}
                className="mt-2 rounded-lg bg-primary px-3 py-1.5 font-semibold text-white hover:bg-red-700"
              >
                Usar precio recomendado
              </button>
            )}
            {resumen.avisos.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-border pt-2 text-[11px] text-red-600">
                {resumen.avisos.map((aviso, idx) => (
                  <p key={`${aviso.nombre}-${idx}`}>
                    {aviso.tipo === "sin-costo"
                      ? `${aviso.nombre} sin costo: regístralo en una compra.`
                      : aviso.tipo === "unidad-incompatible"
                        ? `${aviso.nombre}: no se puede convertir la unidad de la ficha al insumo.`
                        : `${aviso.nombre}: no se encontró en el catálogo de Insumos.`}
                  </p>
                ))}
                <p>El costo de insumos está incompleto.</p>
              </div>
            )}
          </div>
        ))}
      </div>
      {!Number(parametros.tarifa_gas_m3) || !Number(parametros.consumo_gas_m3_hora) ? (
        <p className="mt-2 text-[11px] text-amber-700">
          Configura la tarifa del gas (factura EPM) y el consumo del horno.
        </p>
      ) : null}
      <p className="mt-2 text-[11px] text-muted-foreground">
        Los parámetros se configuran en Orden de producción.
      </p>
    </section>
  );
}
