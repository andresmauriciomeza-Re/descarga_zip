import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useIdioma, type Idioma } from "@/shared/i18n";

// Banderas en SVG: en Windows los emojis de bandera no se ven.
function BanderaCO() {
  return (
    <svg viewBox="0 0 24 16" width="1.5em" height="1em" aria-hidden="true" className="shrink-0 rounded-sm">
      <rect width="24" height="8" fill="#FCD116" />
      <rect y="8" width="24" height="4" fill="#003893" />
      <rect y="12" width="24" height="4" fill="#CE1126" />
    </svg>
  );
}

function BanderaUS() {
  return (
    <svg viewBox="0 0 24 16" width="1.5em" height="1em" aria-hidden="true" className="shrink-0 rounded-sm">
      <rect width="24" height="16" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={(i * 16) / 13} width="24" height={16 / 13} fill="#B22234" />
      ))}
      <rect width="11" height={(7 * 16) / 13} fill="#3C3B6E" />
      {[1.5, 4.3, 7.1].flatMap((y) =>
        [1.5, 4.2, 6.9, 9.6].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.6" fill="#fff" />),
      )}
    </svg>
  );
}

/** Cada idioma se nombra en su propia lengua, por eso no se traduce. */
const IDIOMAS: { id: Idioma; nombre: string; Bandera: () => React.JSX.Element }[] = [
  { id: "es", nombre: "Español", Bandera: BanderaCO },
  { id: "en", nombre: "English", Bandera: BanderaUS },
];

/** Botón con la bandera del idioma actual que abre el menú Español / English. */
export function LanguageSelector({ className }: { className: string }) {
  const { idioma, setIdioma, t } = useIdioma();
  const actual = IDIOMAS.find((i) => i.id === idioma) ?? IDIOMAS[0];
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        type="button"
        className={className}
        aria-label={t("comun.idioma.cambiar", { idioma: actual.nombre })}
      >
        <actual.Bandera />
        <span>{actual.id.toUpperCase()}</span>
        <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[100] min-w-40">
        {IDIOMAS.map(({ id, nombre, Bandera }) => (
          <DropdownMenuItem
            key={id}
            lang={id}
            onSelect={() => setIdioma(id)}
            className="gap-2.5 py-2.5 text-base cursor-pointer"
          >
            <Bandera />
            <span className="flex-1">{nombre}</span>
            {id === idioma && <Check className="w-4 h-4" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
