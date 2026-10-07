import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, UserCog, User } from "lucide-react";
import { type Rol } from "../screens/GestionConfigScreen";

// Menú "Cambiar de rol" del encabezado (y de Mi perfil).
//
// El padre solo pasa los roles que SE PUEDEN ofrecer: activos, con pantalla
// asignada y distintos del rol activo. Los roles sin pantallas no aparecen
// aquí, así que no se puede entrar a un rol vacío desde este menú.
export function CambiarRolMenu({
  roles,
  rolActivoNombre,
  onSelect,
}: {
  roles: Rol[];
  rolActivoNombre: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fuera = (ev: MouseEvent) => {
      if (box.current && !box.current.contains(ev.target as Node)) setOpen(false);
    };
    const esc = (ev: KeyboardEvent) => { if (ev.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (roles.length === 0) return null;

  return (
    <div className="relative" ref={box} onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Cambiar de rol"
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
      >
        <UserCog className="w-4 h-4 text-primary" />
        <span className="hidden sm:inline max-w-[140px] truncate">{rolActivoNombre}</span>
        <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-1.5 w-64 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
            Cambiar de rol
          </p>
          <div className="max-h-72 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => { setOpen(false); }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left cursor-pointer text-primary font-semibold bg-primary/10 rounded-lg"
            >
              <span className="truncate">{rolActivoNombre} (actual)</span>
              <Check className="w-4 h-4 shrink-0" />
            </button>
            {roles.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setOpen(false); onSelect(r.id); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-foreground hover:bg-muted cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{r.nombre}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
