import React from "react";
import { ChevronDown } from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { createPortal } from "react-dom";

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

const colorBg = (color: string) => {
  // Extraer el color base (ej. "bg-emerald-100" -> "emerald")
  const match = color.match(/bg-(\w+)-\d+/);
  return match ? match[1] : "gray";
};

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
      <Select.Trigger className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border-0 focus:outline-none transition-colors ${
        seleccionada?.color || "bg-gray-100 text-gray-700"
      } ${disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"} ${className}`}>
        <Select.Value placeholder={seleccionada?.label || value} />
        {!disabled && <ChevronDown className="w-3 h-3" />}
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="bg-white rounded-xl shadow-lg border border-border py-1 min-w-[140px] z-50"
          sideOffset={4}
          position="popper"
        >
          <Select.Viewport>
            {options.map((opt) => {
              const esSeleccionada = opt.value === value;
              const colorBase = colorBg(opt.color);
              return (
                <Select.Item
                  key={opt.value}
                  value={opt.value}
                  className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-xs font-medium outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary ${
                    esSeleccionada ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span className={`absolute left-2 flex h-3.5 w-3.5 items-center justify-center ${opt.color.split(" ")[0].replace("bg-", "bg-").replace("text-", "text-")}`}>
                    <span className={`w-2 h-2 rounded-full ${opt.color.split(" ")[0].replace("bg-", "bg-")}`} />
                  </span>
                  <Select.ItemText>{opt.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${opt.color.split(" ")[0]}`} />
                  </Select.ItemIndicator>
                </Select.Item>
              );
            })}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}