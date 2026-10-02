import React from "react";
import { Check, ChevronDown } from "lucide-react";
import * as Select from "@radix-ui/react-select";

export interface EstadoOption<T extends string> {
  value: T;
  label: string;
  color: string; // clases Tailwind para el badge
}

interface EstadoSelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: EstadoOption<T>[];
  disabled?: boolean;
  className?: string;
}

export function EstadoSelect<T extends string>({
  value,
  onChange,
  options,
  disabled = false,
  className = "",
}: EstadoSelectProps<T>) {
  const seleccionada = options.find((o) => o.value === value);

  return (
    <Select.Root value={value} onValueChange={onChange} disabled={disabled}>
      <Select.Trigger
        aria-label="Estado"
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors ${
          seleccionada?.color || "bg-gray-100 text-gray-700"
        } ${disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"} ${className}`}
      >
        <Select.Value placeholder={seleccionada?.label || value} />
        {!disabled && <ChevronDown className="w-3 h-3 shrink-0" />}
      </Select.Trigger>
      <Select.Portal>
        {/* z-[100]: el menú va en un portal al <body>, por encima de los overlays
            de los modales (z-50), de ConfirmModal (z-[70]) y de NuevoProveedorModal
            (z-[80]). Con z-50 quedaba DETRÁS del fondo y los clics no llegaban. */}
        <Select.Content
          className="z-[100] bg-white rounded-xl shadow-xl border border-border overflow-hidden min-w-[150px]"
          sideOffset={6}
          position="popper"
        >
          <Select.Viewport className="p-1">
            {options.map((opt) => {
              const esSeleccionada = opt.value === value;
              const puntoColor = opt.color.match(/bg-[\w-]+/)?.[0] ?? "bg-gray-300";
              return (
                <Select.Item
                  key={opt.value}
                  value={opt.value}
                  className={`relative flex w-full select-none items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium outline-none cursor-pointer transition-colors data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[disabled]:opacity-50 ${
                    esSeleccionada ? "bg-primary/10 text-primary" : "text-foreground"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${puntoColor}`} />
                  <Select.ItemText>{opt.label}</Select.ItemText>
                  {esSeleccionada && <Check className="w-3.5 h-3.5 ml-auto shrink-0 text-primary" />}
                </Select.Item>
              );
            })}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}