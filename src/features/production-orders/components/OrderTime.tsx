import type { OrdenProduccion } from "@/features/production-orders/utils/production-orders";
import { formatearHora } from "@/shared/utils/time";
import { useState } from "react";
import { minutosPreparacionValidos, CampoTiempoPreparacion } from "@/shared/components/PrepTimeField";
import { actualizarOrdenProduccion, mensajeErrorOrdenes } from "@/features/production-orders/services/productionOrdersApi";
import { toast } from "sonner";

/** `unidadesCompatibles`, `convertirUnidad` y `fmtCant` se mudaron a
    `shared/utils/disponibilidad`: son el mismo cálculo con el que Gestión de
    Productos muestra "Se pueden preparar", así que vive en un solo lugar. */

export function EstimacionPedido({ orden }: { orden: OrdenProduccion }) {
  if (orden.tipo !== "pedido" || orden.finCalentamientoMs == null) return null;
  return (
    <div className="space-y-1 text-xs">
      <p>Listo aprox. a las {formatearHora(new Date(orden.finCalentamientoMs))}</p>
      {orden.listoDespuesRecogida && (
        <p className="font-medium text-amber-700 dark:text-amber-300">
          Con este tiempo, el pedido estaría listo después de la hora de recogida
        </p>
      )}
      {orden.cierreManualPorTiempo && (
        <p className="font-medium text-amber-700 dark:text-amber-300">
          El tiempo de preparación ya venció. Pulsa «Listo» para completar la orden.
        </p>
      )}
    </div>
  );
}

export function EditarTiempoPedido({ orden, onGuardar }: {
  orden: OrdenProduccion;
  onGuardar: (orden: OrdenProduccion) => void;
}) {
  const [valor, setValor] = useState(String(orden.tiempoPreparacionMin ?? 25));
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (guardando || !minutosPreparacionValidos(valor)) return;
    setGuardando(true);
    try {
      const actualizada = await actualizarOrdenProduccion(orden.id, { tiempo_preparacion_min: Number(valor) });
      onGuardar(actualizada);
      toast.success("Tiempo de preparación actualizado");
    } catch (error) {
      toast.error(mensajeErrorOrdenes(error, "No se pudo actualizar el tiempo de preparación."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-3">
      <CampoTiempoPreparacion valor={valor} onChange={setValor} deshabilitado={guardando} />
      <button
        type="button"
        className="mt-5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        disabled={guardando || !minutosPreparacionValidos(valor) || Number(valor) === orden.tiempoPreparacionMin}
        onClick={() => void guardar()}
      >
        {guardando ? "Guardando…" : "Guardar tiempo"}
      </button>
    </div>
  );
}
