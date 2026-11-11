import { Check, ChevronDown } from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { useEffect, useRef, useState } from "react";
import { UNIDADES } from "@/shared/utils/unidades";

/**
 * Select de "Unidad" (kg, g, lt, ml, und, paq, paca, caja, bolsa, sixpack).
 *
 * Reemplaza al `<select>` nativo, que al desplegarse mostraba la lista
 * CUADRADA y con el azul del navegador. Usa el mismo Radix Select que
 * `EstadoSelect`, pero con el estilo de los inputs del formulario:
 * campo redondeado con flecha y menú desplegado con bordes redondeados
 * (12px), sombra suave y opciones con hover/redondeado suave.
 *
 * Los colores vienen de tokens (`bg-popover`, `text-popover-foreground`,
 * `border-border`), así que se ve bien en modo claro y oscuro.
 */
export interface OpcionUnidad {
  /** Valor que se GUARDA (la unidadMedida del registro: "kg", "lt", …). */
  valor: string;
  /** Texto visible en el menú. Por defecto es el propio valor. */
  etiqueta: string;
  /** Añade una división visual antes de la opción. */
  divisorAntes?: boolean;
  /** Etiqueta corta del trigger cuando el menú usa etiquetas descriptivas. */
  textoCorto?: string;
}

interface UnidadSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Bloquea el campo (p. ej. al editar un registro existente). */
  disabled?: boolean;
  /**
   * Clases del propio campo, para calzar con los inputs del formulario
   * que lo usa (por defecto, el estilo estándar `iCls` del proyecto).
   * No incluye redondeo ni foco: eso lo pone la base.
   */
  fieldClassName?: string;
  ariaLabel?: string;
  /**
   * Lista de unidades del desplegable. Por defecto, la lista completa de
   * `UNIDADES` (kg, g, lt, ml, und, paq, paca, caja, bolsa, sixpack). Un
   * contexto puede pasar una lista corta (p. ej. el Producto Insumo admite
   * solo kg/g/lt/und) con etiquetas largas ("Kilogramos (kg)"): el valor
   * guardado sigue siendo la unidad corta.
   */
  unidades?: readonly OpcionUnidad[];
  /** Texto del placeholder cuando `value` está vacío. */
  placeholder?: string;
  /** Muestra el valor guardado (p. ej. "kg") en vez de la etiqueta larga seleccionada. */
  mostrarValorSeleccionadoCorto?: boolean;
  /** Atributo de enfoque opcional para flujos de validación del formulario. */
  dataField?: string;
}

const campoPorDefecto = "bg-muted border border-border text-foreground";

export function UnidadSelect({
  value,
  onChange,
  disabled = false,
  fieldClassName = campoPorDefecto,
  ariaLabel = "Unidad",
  unidades,
  placeholder = "Seleccionar...",
  mostrarValorSeleccionadoCorto = false,
  dataField,
}: UnidadSelectProps) {
  /* Lista por defecto: las UNIDADES del catálogo de Compras, texto = valor.
     Se calcula AQUÍ (y no a nivel de módulo) para que este archivo no lea
     ningún import externo al cargar. */
  const listaUnidades: readonly OpcionUnidad[] =
    unidades ?? UNIDADES.map((u) => ({ valor: u, etiqueta: u }));
  const [abierto, setAbierto] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const frame = requestAnimationFrame(() => {
      viewportRef.current
        ?.querySelector<HTMLElement>('[data-state="checked"]')
        ?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [abierto]);

  return (
    // `undefined` (no "") deja el trigger en placeholder: así un campo vacío
    // se ve vacío y la validación "unidad elegida" tiene sentido visual.
    <Select.Root
      value={value || undefined}
      onValueChange={onChange}
      onOpenChange={setAbierto}
      disabled={disabled}
    >
      <Select.Trigger
        aria-label={ariaLabel}
        data-producto-insumo-campo={dataField}
        className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${fieldClassName} ${
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <Select.Value placeholder={placeholder}>
          {mostrarValorSeleccionadoCorto && value
            ? listaUnidades.find((unidad) => unidad.valor === value)?.textoCorto ?? value
            : undefined}
        </Select.Value>
        <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
      </Select.Trigger>

      <Select.Portal>
        {/* z-[100]: el menú va en un portal al <body>, por encima de los
            overlays de los modales (z-50) y de los ConfirmModal. */}
        <Select.Content
          position="popper"
          side="bottom"
          sideOffset={6}
          align="start"
          avoidCollisions
          collisionPadding={8}
          onWheel={(event) => event.stopPropagation()}
          style={{
            width: "var(--radix-select-trigger-width)",
            minWidth: "var(--radix-select-trigger-width)",
            maxHeight: "min(15rem, var(--radix-select-content-available-height))",
          }}
          className="z-[100] bg-popover text-popover-foreground rounded-md shadow-lg border border-border overflow-hidden"
        >
          <Select.Viewport
            ref={viewportRef}
            onWheel={(event) => event.stopPropagation()}
            className="max-h-full overflow-y-auto overscroll-contain p-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent"
          >
            {listaUnidades.map((u) => {
              const seleccionada = u.valor === value;
              return (
                <Select.Item
                  key={u.valor}
                  value={u.valor}
                  className={`relative flex w-full select-none items-center rounded-sm px-3 py-2 text-sm outline-none cursor-pointer transition-colors data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed ${
                    u.divisorAntes ? "mt-1 border-t border-border pt-3" : ""
                  } ${seleccionada ? "font-semibold" : "font-normal"}`}
                >
                  <Select.ItemText>{u.etiqueta}</Select.ItemText>
                  {seleccionada && (
                    <Check className="w-4 h-4 ml-auto shrink-0 text-primary" />
                  )}
                </Select.Item>
              );
            })}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
