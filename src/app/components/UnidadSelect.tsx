import React from "react";
import { Check, ChevronDown } from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { UNIDADES } from "./CompactInsumoForm";

/**
 * Select de "Unidad" (kg, g, lt, ml, und, paq, caja, bolsa).
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
}

const campoPorDefecto = "bg-muted border border-border text-foreground";

export function UnidadSelect({
  value,
  onChange,
  disabled = false,
  fieldClassName = campoPorDefecto,
  ariaLabel = "Unidad",
}: UnidadSelectProps) {
  return (
    <Select.Root value={value} onValueChange={onChange} disabled={disabled}>
      <Select.Trigger
        aria-label={ariaLabel}
        className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${fieldClassName} ${
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <Select.Value placeholder="Seleccionar..." />
        <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
      </Select.Trigger>

      <Select.Portal>
        {/* z-[100]: el menú va en un portal al <body>, por encima de los
            overlays de los modales (z-50) y de los ConfirmModal. */}
        <Select.Content
          position="popper"
          sideOffset={6}
          align="start"
          className="z-[100] min-w-[var(--radix-select-trigger-width)] bg-popover text-popover-foreground rounded-md shadow-lg border border-border overflow-hidden"
        >
          <Select.Viewport className="p-1">
            {UNIDADES.map((u) => {
              const seleccionada = u === value;
              return (
                <Select.Item
                  key={u}
                  value={u}
                  className={`relative flex w-full select-none items-center rounded-sm px-3 py-2 text-sm outline-none cursor-pointer transition-colors data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed ${
                    seleccionada ? "font-semibold" : "font-normal"
                  }`}
                >
                  <Select.ItemText>{u}</Select.ItemText>
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
