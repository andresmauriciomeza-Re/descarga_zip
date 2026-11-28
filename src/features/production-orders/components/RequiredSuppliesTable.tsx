import { type InsumoRequerido, type Faltante, esFaltanteProductoInsumo, esInsumoInactivo, normalizar } from "@/features/production-orders/utils/production-orders";
import type { Insumo } from "@/features/supplies/utils/supplies";
import { faltantesPara, fmtCant, motivoFaltante } from "@/shared/utils/availability";
import { EstadoPill } from "@/shared/components/panel/StatusPill";
import { AlertCircle } from "lucide-react";

// ─────────────────────────── Piezas de UI ───────────────────────────

/** Tabla de solo lectura con los insumos que se van a consumir y el stock de
    hoy de cada uno. Lo que no alcanza sale en rojo. */
export function TablaInsumosRequeridos({
  requeridos,
  insumos,
  descontados = false,
  onIrCompras,
  onIrInsumos,
  onPreparar,
}: {
  requeridos: InsumoRequerido[];
  insumos: Insumo[];
  descontados?: boolean;
  onIrCompras?: (faltantes: Faltante[]) => void;
  onIrInsumos?: () => void;
  onPreparar?: (faltante: Faltante) => void;
}) {
  if (requeridos.length === 0) {
    return (
      <p className="px-3 py-3 bg-muted/60 rounded-xl border border-border text-sm text-muted-foreground">
        No hay insumos que consumir: la receta está vacía o el producto no tiene ficha
        técnica.
      </p>
    );
  }
  const faltantesCompra = descontados
    ? []
    : faltantesPara(requeridos, 1, insumos).filter(
        (faltante) => !faltante.motivo && faltante.falta > 0,
      );
  const faltantesCrudos = faltantesCompra.filter((f) => !esFaltanteProductoInsumo(f, insumos));
  const faltantesPreparar = faltantesCompra.filter((f) => esFaltanteProductoInsumo(f, insumos));
  const inactivos = descontados
    ? []
    : faltantesPara(requeridos, 1, insumos).filter(esInsumoInactivo);
  const hayAviso = (onIrCompras || onPreparar || onIrInsumos)
    && (faltantesCompra.length > 0 || inactivos.length > 0);
  return (
    <div className="space-y-3">
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="grid grid-cols-5 gap-2 px-3 py-2 bg-muted/60 text-base font-bold uppercase tracking-wide text-muted-foreground">
        <span className="col-span-2">Insumo</span>
        <span className="text-right">Requerido</span>
        <span className="text-right">Stock actual</span>
        <span className="text-right">Estado</span>
      </div>
      {requeridos.map((r) => {
        const insumo = insumos.find((i) => i.id === r.insumoId)
          ?? insumos.find((i) => normalizar(i.nombre) === normalizar(r.nombre));
        const stock = insumo?.stockActual;
        // Un insumo que la receta menciona y no está en el catálogo no es un
        // faltante: se avisa distinto para que no se bloquee la orden por un alta
        // que falta en Gestión de Insumos.
        const noExiste = stock === undefined;
        const calculoFaltante = descontados ? undefined : faltantesPara([r], 1, insumos)[0];
        const inactivo = !descontados && (insumo?.estado === "inactivo" || calculoFaltante?.motivo === "inactivo");
        const unidadIncompatible = !descontados && calculoFaltante?.motivo === "unidad-incompatible";
        const falta = !descontados && !inactivo && !noExiste && calculoFaltante?.motivo !== "unidad-incompatible"
          ? calculoFaltante?.falta ?? 0
          : 0;
        return (
          <div key={r.insumoId} className={`grid grid-cols-5 gap-2 px-3 py-2 text-base border-t border-border items-center ${!descontados && (noExiste || inactivo || unidadIncompatible) ? "bg-amber-50/60" : falta > 0 ? "bg-red-50/60" : ""}`}>
            <span className="col-span-2 font-medium text-foreground truncate">{r.nombre}</span>
            <span className="text-right tabular-nums font-semibold text-foreground">{fmtCant(r.cantidad, r.unidad)}</span>
            <span className="text-right tabular-nums text-muted-foreground">{noExiste ? "—" : fmtCant(stock, insumo?.unidadMedida ?? r.unidad)}</span>
            <span className="flex flex-col items-end gap-1 text-right">
              {descontados
                ? <EstadoPill tono="verde">Descontado ✓</EstadoPill>
                : noExiste
                ? <span className="text-amber-600 font-semibold" title="El insumo no está dado de alta en Gestión de Insumos">No está en el catálogo</span>
                : inactivo
                  ? <>
                      <span className="text-red-600 font-semibold">Insumo inactivo</span>
                    </>
                : unidadIncompatible
                  ? <span className="text-amber-600 font-semibold">{motivoFaltante(calculoFaltante!)}</span>
                : falta > 0
                  ? <EstadoPill tono="rojo">Falta {fmtCant(falta, calculoFaltante?.unidad ?? r.unidad)}</EstadoPill>
                  : <EstadoPill tono="verde">✓ Alcanza</EstadoPill>}
            </span>
          </div>
        );
      })}
    </div>
    {hayAviso && (
      <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-1.5">
        <p className="text-sm font-semibold text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Faltan insumos para iniciar esta orden</span>
        </p>
        {inactivos.map((f) => (
          <div key={`i-${f.insumoId}`} className="pl-6 text-base text-red-700 flex flex-wrap items-center gap-2">
            <span>· Insumo inactivo: {f.nombre}</span>
            {onIrInsumos && (
              <button
                type="button"
                onClick={onIrInsumos}
                className="pn-boton pn-boton--principal"
              >
                Ir a Insumos
              </button>
            )}
          </div>
        ))}
        {faltantesCrudos.map((f) => (
          <p key={`c-${f.insumoId}`} className="text-lg" style={{ color: "var(--ambar-texto)" }}>
            · Debes comprar {fmtCant(f.falta, f.unidad)} de {f.nombre}
          </p>
        ))}
        {faltantesPreparar.map((f) => (
          <p key={`p-${f.insumoId}`} className="text-lg" style={{ color: "var(--ambar-texto)" }}>
            · Debes preparar {fmtCant(f.falta, f.unidad)} de {f.nombre}
          </p>
        ))}
        {((onIrCompras && faltantesCrudos.length > 0) || (onPreparar && faltantesPreparar.length > 0)) && (
          <div className="pt-2 flex flex-wrap gap-3">
            {onIrCompras && faltantesCrudos.length > 0 && (
              <button
                type="button"
                onClick={() => onIrCompras(faltantesCrudos)}
                className="pn-boton pn-boton--principal"
              >
                Comprar insumos faltantes
              </button>
            )}
            {onPreparar && faltantesPreparar.map((f) => (
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
    )}
    </div>
  );
}
