import { type LineaOrden, esProductoInsumo, esPizzaProducto, fichaVigente, requeridosDeLinea, resumenNecesita, snapshotDeFicha, esDecimal, INPUT_LINEA_CLS, fmtMinutos } from "@/features/production-orders/utils/production-orders";
import type { Insumo } from "@/features/supplies/utils/supplies";
import type { Producto } from "@/features/products/utils/products";
import type { FichasPorProducto } from "@/shared/utils/technicalSheets";
import { tipoDe } from "@/features/products/utils/products";
import { useState } from "react";
import { esIdInsumo } from "@/shared/utils/technicalSheets";
import { type GrupoProductoInsumo, SelectorProductoInsumo } from "@/features/production-orders/components/ProductSupplySelector";
import { SegmentadoButtons } from "@/shared/components/buttons/SegmentedButtons";
import { numeroDeInput, limpiarNumeroInput } from "@/shared/utils/numberInput";
import { TablaInsumosRequeridos } from "@/features/production-orders/components/RequiredSuppliesTable";
import { Clock } from "lucide-react";

export function LineaPreparacion({
  linea,
  onChange,
  onRemove,
  puedeQuitar,
  insumos,
  productos,
  fichas,
}: {
  linea: LineaOrden;
  onChange: (l: LineaOrden) => void;
  onRemove: () => void;
  puedeQuitar: boolean;
  insumos: Insumo[];
  productos: Producto[];
  fichas: FichasPorProducto;
}) {
  const [tipoSelector, setTipoSelector] = useState<"insumo" | "producto">(
    () => (linea.idProducto && !esIdInsumo(linea.idProducto) ? "producto" : "insumo"),
  );
  const opcionesInsumos = insumos.filter((i) => esProductoInsumo(i) && i.estado === "activo");
  const opcionesProductos = productos;
  const pi = esIdInsumo(linea.idProducto)
    ? insumos.find((i) => i.id === linea.idProducto)
    : undefined;
  const productoSeleccionado = productos.find((p) => p.id === linea.idProducto);
  const esPizza = tipoSelector === "producto" && esPizzaProducto(productoSeleccionado);
  const bajo = !!pi && pi.stockActual < pi.stockMinimo;
  const ficha = fichaVigente(fichas, linea.idProducto);
  const requeridos = requeridosDeLinea(linea, fichas);
  // C8: "Necesita: …" de ESTA línea, con el mismo número que descuenta el
  // Inicio (factor de tamaño y unidades contables incluidos).
  const necesita = resumenNecesita(requeridos);
  const sinTamanos = esPizza && linea.cantidadEstimada < 1;

  const elegir = (id: string) => {
    const esInsumo = esIdInsumo(id);
    const elegidoInsumo = esInsumo ? insumos.find((i) => i.id === id) : undefined;
    const elegidoProducto = esInsumo ? undefined : productos.find((p) => p.id === id);
    const ficha = fichaVigente(fichas, id);
    onChange({
      ...linea,
      idProducto: id,
      nombre: elegidoInsumo?.nombre ?? elegidoProducto?.nombre ?? "",
      unidad: elegidoInsumo?.unidadMedida ?? "und",
      cantidadEstimada: 0,
      tamano: undefined,
      // Snapshot de la ficha: la descripción, el tiempo y los
      // insumos requeridos se leen de aquí, no de la ficha vigente.
      fichaSnapshot: ficha ? snapshotDeFicha(ficha) : undefined,
    });
  };

  const grupos: GrupoProductoInsumo[] = tipoSelector === "producto"
    ? (opcionesProductos.length > 0
        ? [{
            label: "Productos",
            opciones: opcionesProductos.map((p) => {
              const puedeProducirse =
                tipoDe(p, p.categoriaNombre) === "Producto insumo" && !!fichaVigente(fichas, p.id);
              return {
                id: p.id,
                label: `${p.nombre}${puedeProducirse ? "" : " · No disponible para producción"}`,
                disabled: !puedeProducirse,
              };
            }),
          }]
        : [])
    : (opcionesInsumos.length > 0
        ? [{
            label: "Producto insumo",
            opciones: opcionesInsumos.map((i) => ({
              id: i.id,
              label: `${i.nombre} · ${i.stockActual} ${i.unidadMedida} (mín ${i.stockMinimo})`,
            })),
          }]
        : []);

  return (
    <div className="p-6 border border-border rounded-[1.125rem] bg-card space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px_auto] gap-5 items-end">
        <div>
          <label className="pn-etiqueta">
            ¿Qué se va a preparar?
          </label>
          <SegmentadoButtons
            valor={tipoSelector}
            opciones={[
              { valor: "insumo", etiqueta: "Producto insumo" },
              { valor: "producto", etiqueta: "Producto" },
            ]}
            onChange={(valor) => {
              const nuevoTipo = valor as "insumo" | "producto";
              if (nuevoTipo === tipoSelector) return;
              setTipoSelector(nuevoTipo);
              onChange({
                ...linea,
                idProducto: "",
                nombre: "",
                unidad: "und",
                cantidadEstimada: 0,
                tamano: undefined,
                fichaSnapshot: undefined,
              });
            }}
            fullWidth
            className="mb-2"
          />
          <SelectorProductoInsumo
            value={linea.idProducto}
            placeholder={tipoSelector === "producto" ? "Buscar producto..." : "Buscar producto insumo..."}
            grupos={grupos}
            onSelect={elegir}
          />
          {bajo && (
            <span className="inline-block mt-1.5 text-base font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Stock bajo
            </span>
          )}
        </div>
        <div>
          <label className="pn-etiqueta">
            {esPizza ? "Cantidad de pizzas" : `¿Cuántos? (${tipoSelector === "producto" ? "und" : linea.unidad})`}
          </label>
          <>
              {/* 0 = vacío con placeholder "0" (punto B1); al guardar se cuenta
                  como 0. C6: mínimo 1 una vez elegido el producto, con error en
                  tiempo real y el botón Guardar bloqueado. */}
              <input
                type="number"
                min={1}
                step={esDecimal(linea.unidad) ? 0.1 : 1}
                value={linea.cantidadEstimada === 0 ? "" : linea.cantidadEstimada}
                placeholder="0"
                onChange={(e) => onChange({ ...linea, cantidadEstimada: numeroDeInput(limpiarNumeroInput(e.target.value)) })}
                className={INPUT_LINEA_CLS}
              />
              {linea.idProducto && linea.cantidadEstimada < 1 && (
                <p className="mt-1 text-base font-semibold text-amber-700">
                  La cantidad mínima es 1 {linea.unidad}
                </p>
              )}
          </>
        </div>
        {puedeQuitar && (
          <button type="button" onClick={onRemove} title="Quitar este producto" className="pn-boton pn-boton--peligro">
            Quitar
          </button>
        )}
      </div>

      {esPizza && (
        <p className="text-base text-muted-foreground">
          {linea.tamano ? `Orden antigua: corte ${linea.tamano}. ` : ""}
          Cada pizza da 8 porciones medianas o 6 porciones grandes
          {linea.cantidadEstimada > 0 && ` = hasta ${linea.cantidadEstimada * 8} medianas o ${linea.cantidadEstimada * 6} grandes`}.
        </p>
      )}

      {(pi || ficha) && (
        <div className="space-y-3">
          {sinTamanos ? (
            <p className="text-base text-muted-foreground">Agrega una cantidad para calcular los insumos</p>
          ) : (
            <>
              {necesita && (
                // C8: lo que esta línea gasta en total, con el factor de su
                // tamaño y con las unidades contables sin multiplicar. Es el
                // mismo número que descuenta Insumos al Iniciar.
                <p className="text-base text-muted-foreground">
                  Necesita: <span className="font-semibold text-foreground">{necesita}</span>
                </p>
              )}
              <div>
                <p className="text-base font-semibold text-muted-foreground mb-1.5">Insumos requeridos</p>
                <TablaInsumosRequeridos requeridos={requeridos} insumos={insumos} />
              </div>
            </>
          )}
          <div>
            <p className="text-base font-semibold text-muted-foreground mb-1.5">Descripción de la preparación</p>
            <p className="text-base text-foreground bg-muted/60 rounded-xl border border-border px-3 py-2 whitespace-pre-wrap leading-relaxed">
              {linea.fichaSnapshot?.pasos.join("\n") || (tipoSelector === "producto"
                ? "Este producto no tiene descripción de preparación."
                : "Este Producto Insumo no tiene descripción de preparación.")}
            </p>
          </div>
          <p className="flex items-center gap-1.5 text-base text-muted-foreground">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            Tiempo estimado:{" "}
            <strong className="text-foreground">
              {linea.fichaSnapshot?.tiempoPreparacion ? fmtMinutos(linea.fichaSnapshot.tiempoPreparacion) : "Sin tiempo definido"}
            </strong>
          </p>
        </div>
      )}
    </div>
  );
}
