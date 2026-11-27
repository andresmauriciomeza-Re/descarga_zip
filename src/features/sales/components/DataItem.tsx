import type { LucideIcon } from "lucide-react";

export function Dato({
  Icon,
  titulo,
  valor,
}: {
  Icon: LucideIcon;
  titulo: string;
  valor: string;
}) {
  return (
    <div className="flex items-start gap-3 bg-muted/50 rounded-xl px-4 py-3">
      <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <div>
        <p className="text-xs text-muted-foreground font-medium">{titulo}</p>
        <p className="text-base font-semibold text-foreground">{valor}</p>
      </div>
    </div>
  );
}
