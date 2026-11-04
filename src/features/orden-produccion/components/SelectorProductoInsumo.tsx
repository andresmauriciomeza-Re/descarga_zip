import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { normalizarTexto } from "@/shared/utils/nombres";

export type OpcionProductoInsumo = {
  id: string;
  label: string;
  disabled?: boolean;
};

export type GrupoProductoInsumo = {
  label: string;
  opciones: OpcionProductoInsumo[];
};

const coincideNombre = (nombre: string, filtro: string): boolean => {
  const normalizado = normalizarTexto(nombre);
  if (normalizado.includes(filtro)) return true;
  if (filtro.length < 5 || normalizado.length < filtro.length) return false;
  for (let inicio = 0; inicio <= normalizado.length - filtro.length; inicio += 1) {
    let diferencias = 0;
    for (let indice = 0; indice < filtro.length && diferencias < 2; indice += 1) {
      if (normalizado[inicio + indice] !== filtro[indice]) diferencias += 1;
    }
    if (diferencias === 1) return true;
  }
  return false;
};

export function SelectorProductoInsumo({
  value,
  placeholder,
  grupos,
  onSelect,
}: {
  value: string;
  placeholder: string;
  grupos: GrupoProductoInsumo[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filtrando, setFiltrando] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pos, setPos] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);
  const trigger = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const opcionRefs = useRef(new Map<string, HTMLButtonElement>());

  const opciones = grupos.flatMap((g) => g.opciones);
  const seleccionada = opciones.find((o) => o.id === value);
  const label = seleccionada?.label;
  const textoFiltro = normalizarTexto(query.trim());
  const gruposVisibles = grupos
    .map((grupo) => ({
      ...grupo,
      opciones: filtrando && textoFiltro
        ? grupo.opciones.filter((opcion) =>
            coincideNombre(opcion.label.split(" · ")[0], textoFiltro),
          )
        : grupo.opciones,
    }))
    .filter((grupo) => grupo.opciones.length > 0);
  const opcionesHabilitadas = gruposVisibles.flatMap((grupo) =>
    grupo.opciones.filter((opcion) => !opcion.disabled),
  );
  const idsHabilitados = opcionesHabilitadas.map((opcion) => opcion.id).join("|");

  useEffect(() => {
    if (!open) {
      setQuery(label ?? "");
      setFiltrando(false);
    }
  }, [label, open]);

  const ubicar = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const debajo = Math.max(0, window.innerHeight - rect.bottom - 8);
    const arriba = Math.max(0, rect.top - 8);
    const abrirArriba = debajo < Math.min(256, arriba);
    const espacio = abrirArriba ? arriba : debajo;
    setPos({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
      width: rect.width,
      maxHeight: Math.min(256, espacio),
      ...(abrirArriba
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    });
  };

  const cerrar = () => {
    setOpen(false);
    setQuery(label ?? "");
    setFiltrando(false);
    setActiveId(null);
  };

  const abrir = () => {
    setQuery(label ?? "");
    setFiltrando(false);
    setOpen(true);
    const actualHabilitada = opcionesHabilitadas.find((opcion) => opcion.id === value);
    setActiveId(actualHabilitada?.id ?? opcionesHabilitadas[0]?.id ?? null);
    ubicar();
  };

  useEffect(() => {
    if (!open) return;
    ubicar();
    const fuera = (ev: MouseEvent) => {
      const destino = ev.target as Node;
      if (trigger.current?.contains(destino) || menu.current?.contains(destino)) return;
      cerrar();
    };
    document.addEventListener("mousedown", fuera);
    window.addEventListener("scroll", ubicar, true);
    window.addEventListener("resize", ubicar);
    return () => {
      document.removeEventListener("mousedown", fuera);
      window.removeEventListener("scroll", ubicar, true);
      window.removeEventListener("resize", ubicar);
    };
  }, [open, label]);

  useEffect(() => {
    if (!open) return;
    if (!opcionesHabilitadas.some((opcion) => opcion.id === activeId)) {
      setActiveId(opcionesHabilitadas[0]?.id ?? null);
    }
  }, [open, idsHabilitados, activeId]);

  useEffect(() => {
    if (!open || !activeId) return;
    opcionRefs.current.get(activeId)?.scrollIntoView({ block: "nearest" });
  }, [open, activeId, idsHabilitados]);

  const moverActivo = (direccion: 1 | -1) => {
    if (!opcionesHabilitadas.length) return;
    const indice = opcionesHabilitadas.findIndex((opcion) => opcion.id === activeId);
    const siguiente =
      indice < 0
        ? (direccion === 1 ? 0 : opcionesHabilitadas.length - 1)
        : (indice + direccion + opcionesHabilitadas.length) % opcionesHabilitadas.length;
    setActiveId(opcionesHabilitadas[siguiente].id);
  };

  const seleccionar = (id: string) => {
    const opcion = opciones.find((item) => item.id === id);
    if (!opcion || opcion.disabled) return;
    onSelect(id);
    setQuery(opcion.label);
    setFiltrando(false);
    setOpen(false);
    setActiveId(null);
  };

  const alTeclado = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      if (!open) {
        abrir();
        return;
      }
      moverActivo(ev.key === "ArrowDown" ? 1 : -1);
    } else if (ev.key === "Enter" && open) {
      ev.preventDefault();
      if (activeId) seleccionar(activeId);
    } else if (ev.key === "Escape" && open) {
      ev.preventDefault();
      cerrar();
    }
  };

  return (
    <>
      <div
        ref={trigger}
        className={`relative h-[54px] w-full rounded-[14px] bg-muted border focus-within:ring-2 focus-within:ring-primary/30 ${
          open ? "border-primary" : "border-border"
        }`}
      >
        <Search className="absolute left-[18px] top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open}
          value={query}
          placeholder={placeholder}
          onClick={() => {
            if (!open) abrir();
          }}
          onChange={(ev) => {
            setQuery(ev.target.value);
            setFiltrando(true);
            setOpen(true);
            ubicar();
          }}
          onKeyDown={alTeclado}
          className="h-full w-full rounded-[14px] bg-transparent pl-[46px] pr-[46px] text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <ChevronDown
          className={`absolute right-[18px] top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform pointer-events-none ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>

      {open && pos && createPortal(
        <div
          ref={menu}
          role="listbox"
          onWheel={(ev) => ev.stopPropagation()}
          style={{
            position: "fixed",
            left: pos.left,
            width: pos.width,
            top: pos.top,
            bottom: pos.bottom,
            maxHeight: pos.maxHeight,
          }}
          className="z-[60] overflow-y-auto overscroll-contain bg-card border border-border rounded-2xl shadow-2xl p-2 text-foreground"
        >
          {gruposVisibles.length === 0 ? (
            <p className="px-3.5 py-3 text-sm text-muted-foreground">
              No se encontraron productos
            </p>
          ) : (
            gruposVisibles.map((grupo) => (
              <div key={grupo.label}>
                <div className="text-sm font-semibold px-3.5 pt-3 pb-1.5">{grupo.label}</div>
                {grupo.opciones.map((opcion) => (
                  <button
                    key={opcion.id}
                    ref={(element) => {
                      if (element) opcionRefs.current.set(opcion.id, element);
                      else opcionRefs.current.delete(opcion.id);
                    }}
                    type="button"
                    role="option"
                    aria-selected={opcion.id === value}
                    disabled={opcion.disabled}
                    onMouseEnter={() => {
                      if (!opcion.disabled) setActiveId(opcion.id);
                    }}
                    onClick={() => seleccionar(opcion.id)}
                    className={`w-full text-left px-3.5 py-2.5 text-[15px] rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                      opcion.disabled
                        ? "text-muted-foreground cursor-not-allowed"
                        : opcion.id === activeId
                          ? "bg-primary/10 cursor-pointer"
                          : "hover:bg-primary/10 cursor-pointer"
                    }`}
                  >
                    {opcion.label}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
