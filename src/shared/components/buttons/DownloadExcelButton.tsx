import { FileSpreadsheet } from "lucide-react";

/**
 * Botón de descarga de Excel de los listados.
 *
 * Un único componente para los 6 módulos que exportan (Orden de Compra, Compra,
 * Productos, Orden de Producción, Producto No Conforme y Ventas), para que el
 * diseño no dependa de cada pantalla. El diseño sale del botón de "Gestión
 * Producto": fondo del color de la tarjeta, borde verde de 1px, forma de
 * píldora, icono de hoja de cálculo a la izquierda y el mismo ancho de
 * contenido y separación que el botón de "Crear ..." que tiene al lado.
 *
 * Altura: el "Crear ..." de al lado mide 44px y este botón tiene que medir lo
 * mismo, así que los dos van alineados al centro sin escalones. Con `box-sizing:
 * border-box`, `py-3` (12px) más el borde de 1px daría 46px, 2px más alto que
 * su vecino; por eso el padding vertical es de 11px y el horizontal sigue siendo
 * `px-5`, el del "Crear ...". El icono es de `w-4 h-4` como el suyo, así que el
 * alto no depende de él. `bg-card`/`text-foreground` son tokens del tema, por lo
 * que el botón también funciona en modo oscuro sin reglas extra.
 *
 * Montarlo es la propia autorización: quien no tenga el permiso
 * "Descargar Excel" no llega a renderizarlo, así que no hay forma de disparar
 * la exportación desde la interfaz.
 */
export function BotonDescargarExcel({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Descargar Excel"
      className="inline-flex items-center gap-2 px-5 py-[11px] bg-card border border-[#2E7D32] text-foreground font-semibold text-sm rounded-full hover:bg-[#2E7D32]/10 active:scale-95 transition-all cursor-pointer shadow-sm whitespace-nowrap shrink-0"
    >
      <FileSpreadsheet className="w-4 h-4 text-[#2E7D32] shrink-0" />
      Descargar Excel
    </button>
  );
}
