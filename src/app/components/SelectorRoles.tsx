import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Lock, Search, X } from "lucide-react";
import { type Rol } from "../screens/GestionConfigScreen";

// CARGO = ROL. Este selector es el único campo de "Cargo" que queda en todo el
// sistema (antes había un input de texto libre): la lista de cargos del
// empleado se deriva SIEMPRE de `value` (los `rolIds`), así que el listado, el
// detalle y el historial no pueden quedar desincronizados.
//
// Reglas del usuario:
//  · Solo se ofertan roles ACTIVOS; un rol inactivo ya elegido se conserva en
//    la lista (marcado) para que guardar no lo borre sin querer.
//  · "Administrador" y "Cliente" se excluyen POR NOMBRE, nunca por id (el
//    administrador puede renombrar roles o restaurar la semilla).
//  · Un "Administrador" presente en la selección se pinta como chip con
//    candado: no se quita ni se reemplaza desde acá.
//  · Mínimo un cargo: el mensaje de error lo define el formulario padre
//    ("Asigna al menos un cargo al empleado").
export function SelectorRoles({
  roles,
  value,
  onChange,
  error,
  disabled,
  autoFocus,
  id,
}: {
  roles: Rol[];
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);

  // Cierra el panel al hacer clic fuera (y al pulsar Escape).
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

  const nombreDe = useMemo(() => {
    const m = new Map(roles.map(r => [r.id, r.nombre]));
    return (id: string) => m.get(id) ?? id;
  }, [roles]);

  const esBase = (nombre: string) => {
    const n = nombre.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return n === "administrador" || n === "cliente" || n === "empleado";
  };

  const seleccion = value.filter(Boolean);
  const empLockedNombre = "Empleado";
  const opciones = useMemo(() => {
    const qn = q.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return roles.filter(r => {
      // Oferta = roles EXTRA ACTIVOS (sin Empleado/Cliente/Administrador).
      if (!r.activo && !seleccion.includes(r.id)) return false;
      if (esBase(r.nombre) && !seleccion.includes(r.id)) return false;
      const nombreNorm = r.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (qn && !nombreNorm.includes(qn)) return false;
      return true;
    });
  }, [roles, seleccion, q]);

  const alternar = (id: string) => {
    if (disabled) return;
    const r = roles.find(x => x.id === id);
    // Nunca se añade un rol base desde acá (solo se muestran si ya venían).
    if (r && esBase(r.nombre)) return;
    onChange(seleccion.includes(id) ? seleccion.filter(x => x !== id) : [...seleccion, id]);
  };

  const quitar = (id: string) => {
    if (disabled) return;
    const r = roles.find(x => x.id === id);
    // Chip de candado: el rol base no se quita (si hace falta, se cambia desde
    // Gestión de Usuarios / Clientes, que es donde vive ese dato).
    if (r && esBase(r.nombre)) return;
    onChange(seleccion.filter(x => x !== id));
  };

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        id={id}
        autoFocus={autoFocus}
        disabled={disabled}
        onClick={() => { setQ(""); setOpen(o => !o); }}
        className={`w-full min-h-[42px] px-3 py-2 rounded-xl border text-sm text-left flex items-center justify-between gap-2 cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-primary/30
          ${error ? "border-red-400 bg-red-50/30" : "bg-muted border-border"}
          ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
      >
        <span className="flex flex-wrap items-center gap-1.5 min-w-0">
          {/* Chip "Empleado" SIEMPRE con candado y sin "x": no se puede quitar. */}
          <span title="No se puede quitar este rol"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-foreground/5 text-foreground border-border">
            <Lock className="w-3 h-3" />
            {empLockedNombre}
          </span>
          {seleccion.filter(rid => !esBase(nombreDe(rid))).map(rid => {
            const r = roles.find(x => x.id === rid);
            const nombre = nombreDe(rid);
            return (
              <span key={rid}
                title={!r || !r.activo ? "Rol inactivo" : undefined}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border
                  bg-primary/10 text-primary border-primary/20
                  ${!r || !r.activo ? "opacity-60" : ""}`}>
                {nombre}
                {!disabled && (
                  <button type="button" onClick={e => { e.stopPropagation(); quitar(rid); }}
                    className="hover:text-red-600 cursor-pointer" title="Quitar">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            );
          })}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              value={q} onChange={e => setQ(e.target.value)} autoFocus
              placeholder="Buscar cargo…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {opciones.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">Sin cargos disponibles</p>
            )}
            {opciones.map(r => {
              const sel = seleccion.includes(r.id);
              return (
                <button key={r.id} type="button" onClick={() => alternar(r.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-muted cursor-pointer
                    ${sel ? "text-primary font-semibold" : "text-foreground"}`}>
                  <span className="truncate">
                    {r.nombre}
                    {!r.activo && <span className="text-muted-foreground font-normal"> (Inactivo)</span>}
                  </span>
                  {sel && <Check className="w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1 leading-tight">{error}</p>}
    </div>
  );
}
