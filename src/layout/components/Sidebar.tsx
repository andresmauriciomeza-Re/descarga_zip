import type React from "react";
import type { Screen } from "@/shared/utils/screen";
import type { AccesosMap } from "@/features/roles/utils/roles";
import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Home, Menu, Search, X } from "lucide-react";
import { Logo } from "@/shared/components/Logo";
import { canViewPermission, NAV_SECTIONS } from "@/shared/utils/navigation";
import { SERIF } from "@/shared/utils/fonts";

export function Sidebar({
  current,
  navigate,
  abierto,
  userName,
  menuButtonRef,
  onToggleMenu,
  accesos,
  esSuperAdminSesion,
  hasDashboardAccess,
  esMovil = false,
  onCerrarMovil,
  firstNavRef,
  onExpandir,
}: {
  current: Screen;
  navigate: (s: Screen) => void;
  /** Escritorio: true = menú completo; false = franja de iconos.
   *  Celular: true = menú visible; false = fuera de pantalla. */
  abierto: boolean;
  /** Expande el menú de escritorio sin mover el foco a la flecha. */
  onExpandir?: () => void;
  /** Cierra el menú (escritorio) y devuelve el foco a la flecha. */
  onClose?: () => void;
  darkMode?: boolean;
  userRole?: string;
  /** Nombre de quien inició sesión («Hola, {nombre}»). */
  userName?: string;
  /** Flecha de contraer/expandir (escritorio) o botón «Menú» (celular). */
  menuButtonRef?: { current: HTMLButtonElement | null };
  onToggleMenu?: () => void;
  accesos: AccesosMap;
  esSuperAdminSesion: boolean;
  hasDashboardAccess: boolean;
  /** true en viewport ≤ 820px: franja roja arriba + menú a pantalla completa. */
  esMovil?: boolean;
  onCerrarMovil?: () => void;
  /** Ref mutable que recibe la primera opción del menú al abrir (para el foco). */
  firstNavRef?: { current: HTMLButtonElement | null };
}) {
  // Grupos del menú: todos cerrados al entrar; cada módulo se abre solo con
  // clic (no hay ningún efecto que los reabra según la pantalla activa).
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (k: string) =>
    setOpen((p) => ({ ...p, [k]: !p[k] }));
  // En móvil navegar cierra el panel para que no tape la pantalla.
  const ir = (s: Screen) => {
    navigate(s);
    if (esMovil) onCerrarMovil?.();
  };
  const asideRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  // En escritorio el menú nunca sale de pantalla: se contrae a una franja.
  const visible = esMovil ? abierto : true;
  const contraido = !esMovil && !abierto;
  // En celular, cerrado queda fuera de pantalla pero seguiría siendo enfocable
  // con Tab: se marca inert + aria-hidden. Al abrir se registra la primera
  // opción para mover el foco desde el botón «Menú».
  useLayoutEffect(() => {
    const el = asideRef.current;
    if (!el) return;
    if (visible) {
      el.removeAttribute("inert");
      el.removeAttribute("aria-hidden");
      if (firstNavRef) {
        firstNavRef.current = navRef.current?.querySelector("button") ?? null;
      }
    } else {
      el.setAttribute("inert", "");
      el.setAttribute("aria-hidden", "true");
      if (firstNavRef) firstNavRef.current = null;
    }
  }, [visible, firstNavRef]);
  const active = (s: Screen) =>
    current === s ||
    (s === "orden-compra" && current === "nueva-orden-compra") ||
    (s === "gestion-compra" && current === "nueva-compra");

  // Returns true if the current user can "Ver" the given permission key. Es la
  // misma regla que aplica el guard de ruta y el Dashboard: rol semilla o
  // permiso; el único acceso total excepcional corresponde a superadmin.
  const canView = (permKey: string) =>
    canViewPermission(accesos, permKey);

  const [busqueda, setBusqueda] = useState("");
  // La franja contraída muestra todos los grupos, sin el filtro del buscador.
  const q = contraido ? "" : busqueda.trim().toLowerCase();
  const nombrePila = (userName ?? "").trim().split(/\s+/)[0] ?? "";

  // Módulos visibles para este usuario (misma regla de permisos de siempre).
  const modulos = NAV_SECTIONS.map((sec) => {
    // Todos los ítems de NAV_SECTIONS declaran permKey, así que la
    // decisión es siempre por permisos. El fallback solo cubre un ítem
    // futuro sin permKey, que quedaría restringido al rol semilla.
    const items: { screen: Screen; label: string; Icon: typeof Home; permKey?: string }[] =
      ((sec as any).items ?? []).filter((it: any) =>
        sec.key === "dashboard"
          ? hasDashboardAccess
          : sec.key === "inicio"
            ? !hasDashboardAccess
            : it.permKey
              ? canView(it.permKey)
              : esSuperAdminSesion
      );
    return { sec, items };
  })
    // Un módulo sin opciones visibles no se muestra.
    .filter((m) => m.items.length > 0)
    // Con texto en el buscador solo quedan las opciones (o módulos) que coinciden.
    .map((m) => {
      if (!q) return m;
      const modCoincide = m.sec.label.toLowerCase().includes(q);
      return { ...m, items: modCoincide ? m.items : m.items.filter((it) => it.label.toLowerCase().includes(q)) };
    })
    .filter((m) => m.items.length > 0);

  /** Desde la franja contraída: expande el menú con ese grupo abierto. */
  const expandirGrupo = (key: string) => {
    setBusqueda("");
    setOpen((p) => ({ ...p, [key]: true }));
    onExpandir?.();
    requestAnimationFrame(() => document.getElementById(`menu-grupo-${key}`)?.focus());
  };
  const flechaRef = menuButtonRef as React.Ref<HTMLButtonElement>;

  // `hija`: módulo dentro de un grupo en escritorio (segundo nivel).
  const opcion = (it: { screen: Screen; label: string; Icon: typeof Home }, hija = false) => (
    <button
      key={it.screen}
      type="button"
      onClick={() => ir(it.screen)}
      aria-current={active(it.screen) ? "page" : undefined}
      className={hija ? "pn-sidebar__opcion pn-sidebar__opcion--hija" : "pn-sidebar__opcion"}
    >
      <it.Icon size={hija ? 18 : 22} aria-hidden="true" className="shrink-0" />
      <span>{it.label}</span>
    </button>
  );

  return (
    <>
      {/* Celular/tableta (≤ 820px): franja roja arriba con el logo y «Menú». */}
      {esMovil && (
        <div className="pn-tira">
          <div className="pn-tira__logo">
            <Logo variante="claro" alt="S.I.V.PRO" />
          </div>
          <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "1.3125rem" }}>La Sirena</span>
          <button
            ref={menuButtonRef as React.Ref<HTMLButtonElement>}
            type="button"
            className="pn-tira__btn"
            onClick={onToggleMenu}
            aria-expanded={abierto}
          >
            {abierto ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
            <span>{abierto ? "Cerrar" : "Menú"}</span>
          </button>
        </div>
      )}
      <aside
        ref={asideRef}
        role="navigation"
        aria-label="Menú principal"
        className={`pn-sidebar flex flex-col shadow-xl transition-transform duration-200 motion-reduce:transition-none ${esMovil
          ? "fixed left-0 right-0 bottom-0 top-16 z-30"
          : `fixed left-0 top-0 h-full z-30 ${contraido ? "w-[var(--ancho-menu-contraido)]" : "w-[var(--ancho-menu)]"}`
          } ${visible ? "translate-x-0" : "-translate-x-full"}`}
      >
        {contraido && (
          <div className="pn-sidebar__franja">
            <div className="pn-sidebar__logo pn-sidebar__logo--chico">
              <Logo variante="claro" alt="S.I.V.PRO Logo" />
            </div>
            <button
              ref={flechaRef}
              type="button"
              className="pn-sidebar__icono"
              onClick={onToggleMenu}
              aria-label="Expandir menú"
              aria-expanded={false}
              title="Expandir menú"
            >
              <ChevronRight size={24} aria-hidden="true" />
            </button>
            {modulos.map(({ sec, items }) => {
              const directo = sec.key === "dashboard" || sec.key === "inicio";
              // Recibir y ver un pedido no tienen opción propia, pero son de Compras.
              const actual = items.some((it) => active(it.screen)) ||
                (sec.key === "compras" && (current === "recepcion-compra" || current === "orden-detalle"));
              return (
                <button
                  key={sec.key}
                  type="button"
                  className="pn-sidebar__icono"
                  onClick={() => (directo ? ir(items[0].screen) : expandirGrupo(sec.key))}
                  aria-current={actual ? (directo ? "page" : "true") : undefined}
                  aria-label={sec.label}
                  title={sec.label}
                >
                  <sec.Icon size={22} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}

        {!contraido && (
          <>
        {/* Logo, nombre y saludo */}
        {!esMovil && (
          <div className="flex items-center gap-3 px-4 py-5 shrink-0">
            <div className="pn-sidebar__logo">
              <Logo variante="claro" alt="S.I.V.PRO Logo" />
            </div>
            <div className="min-w-0 flex-1">
              <p style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "1.3125rem", lineHeight: 1.2 }}>La Sirena</p>
              {nombrePila && (
                <p style={{ fontSize: "1.125rem", lineHeight: 1.3 }} className="truncate">
                  Hola, {nombrePila}
                </p>
              )}
            </div>
            <button
              ref={flechaRef}
              type="button"
              className="pn-sidebar__icono pn-sidebar__flecha"
              onClick={onToggleMenu}
              aria-label="Contraer menú"
              aria-expanded={true}
              title="Contraer menú"
            >
              <ChevronLeft size={24} aria-hidden="true" />
            </button>
          </div>
        )}
        {esMovil && nombrePila && (
          <p style={{ fontSize: "1.125rem", padding: "1rem 1.75rem 0.75rem" }}>Hola, {nombrePila}</p>
        )}

        {/* Buscador de módulos */}
        <div className="pn-sidebar__buscador">
          <Search size={22} aria-hidden="true" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en el menú"
            aria-label="Buscar un módulo del menú"
            autoComplete="off"
          />
        </div>

        {/* Menú con scroll */}
        <nav
          ref={navRef}
          className="flex-1 overflow-y-auto pb-4"
          style={{ scrollbarWidth: "none" }}
        >
          {modulos.length === 0 && (
            <p className="pn-sidebar__vacio">No hay ninguna opción con ese nombre.</p>
          )}
          {modulos.map(({ sec, items }) => {
            if (sec.key === "dashboard" || sec.key === "inicio") {
              return <div key={sec.key}>{items.map((it) => opcion(it))}</div>;
            }
            const abiertoGrupo = q ? true : !!open[sec.key];
            return (
              <div key={sec.key}>
                <div className="pn-sidebar__sep" />
                <button
                  id={`menu-grupo-${sec.key}`}
                  type="button"
                  onClick={() => toggle(sec.key)}
                  className="pn-sidebar__grupo"
                  aria-expanded={abiertoGrupo}
                >
                  <sec.Icon size={22} aria-hidden="true" className="shrink-0" />
                  <span className="flex-1">{sec.label}</span>
                  <ChevronDown
                    size={20}
                    aria-hidden="true"
                    className={`transition-transform ${abiertoGrupo ? "rotate-180" : ""}`}
                  />
                </button>
                {abiertoGrupo && (esMovil
                  ? items.map((it) => opcion(it))
                  : <div className="pn-sidebar__sub">{items.map((it) => opcion(it, true))}</div>)}
              </div>
            );
          })}
        </nav>
          </>
        )}
      </aside>
    </>
  );
}
