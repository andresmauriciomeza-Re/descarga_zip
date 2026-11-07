import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "./ui/utils";

type IconTooltipTone = "default" | "danger" | "blocked";

interface IconTooltipProps {
  label: string;
  children: ReactNode;
  tone?: IconTooltipTone;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  className?: string;
}

export function IconTooltip({
  label,
  children,
  tone = "default",
  side = "top",
  sideOffset = 8,
  className,
}: IconTooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <span className="inline-flex">{children}</span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={sideOffset}
            className={cn(
              "z-[140] rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg",
              tone === "blocked" && "max-w-[220px]",
              "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              className,
            )}
          >
            {tone === "blocked" ? (
              <span className="flex items-start gap-1.5">
                <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span className="max-w-[220px] whitespace-normal break-words font-medium">{label}</span>
              </span>
            ) : tone === "danger" ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 shrink-0 rounded-full bg-red-400" aria-hidden="true" />
                {label}
              </span>
            ) : (
              label
            )}
            <TooltipPrimitive.Arrow className="size-2.5 fill-stone-900" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
