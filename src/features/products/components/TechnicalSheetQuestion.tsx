/** Pregunta "¿Tiene ficha técnica?" de las categorías SIN configuración en
    `CONFIG_CATEGORIA`. Va SIEMPRE como hijo directo de la cuadrícula de
    `FormFields` (por eso trae `sm:col-span-2`). `error` es la validación de
    Crear; `bloqueada` impide responder en Editar cuando ya hay historial. */
export function PreguntaTieneFicha({
  valor,
  onElegir,
  error = "",
  bloqueada = false,
}: {
  valor: "si" | "no" | null;
  onElegir: (v: "si" | "no") => void;
  error?: string;
  bloqueada?: boolean;
}) {
  return (
    <div className="sm:col-span-2 mt-1">
      <label className="block text-xs font-semibold text-muted-foreground mb-0.5">
        ¿Tiene ficha técnica? *
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        {(["si", "no"] as const).map((op) => (
          <button
            key={op}
            type="button"
            disabled={bloqueada}
            title={bloqueada ? "Este producto ya tiene historial de ficha técnica" : undefined}
            onClick={() => onElegir(op)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              valor === op
                ? "bg-primary text-white border-primary"
                : "bg-muted text-muted-foreground border-border hover:bg-border"
            } ${bloqueada ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {op === "si" ? "Sí" : "No"}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-500 mt-1 leading-tight">{error}</p>}
      {bloqueada && (
        <p className="text-[11px] text-muted-foreground mt-1 italic">
          Bloqueado: el producto ya tiene historial de ficha técnica.
        </p>
      )}
    </div>
  );
}
