import type { Screen } from "@/shared/utils/screen";
import { useEffect, useState } from "react";
import { Logo } from "@/shared/components/Logo";
import { ShoppingCart } from "lucide-react";
import { useIdioma } from "@/shared/i18n";
import { LanguageSelector } from "@/shared/components/LanguageSelector";
import { m } from "motion/react";
import type { CartItem } from "@/types/cart";
import { SERIF } from "@/shared/utils/fonts";
import { precargar } from "@/shared/utils/lazyScreens";

export function PublicNav({
  navigate,
  onLogin,
  cart,
  isLoggedIn,
  isStaff,
  loggedInUser,
  perfilPendiente,
  onLogout,
}: {
  navigate: (s: Screen) => void;
  cart: CartItem[];
  onLogin: () => void;
  isLoggedIn: boolean;
  isStaff: boolean;
  loggedInUser: { iniciales: string; avatarColor: string } | null;
  perfilPendiente: boolean;
  onLogout: () => void;
}) {
  const { t } = useIdioma();
  const count = cart.reduce((s, i) => s + i.quantity, 0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, {
      passive: true,
    });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-20 transition-all duration-400 rounded-b-3xl ${scrolled
          ? "bg-card/85 backdrop-blur-xl shadow-lg shadow-black/[0.06] border-b border-border"
          : "bg-card shadow-sm"
        }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex flex-wrap items-center justify-between gap-x-3">
        {/* Logo */}
        <button
          onClick={() => navigate("landing")}
          className="flex items-center gap-3 cursor-pointer group min-w-0"
        >
          <Logo variante="claro" alt="S.I.V.PRO Logo" className="object-contain shrink-0 w-11 h-11 md:w-14 md:h-14 lg:w-16 lg:h-16" />
          {/* Punto 1.1: `min-w-0` + `truncate` — a 375 px el texto cede y se
              corta con puntos en vez de empujar el selector de idioma fuera de la
              pantalla. */}
          <div className="leading-none min-w-0">
            <p
              className="font-bold text-[17px] text-foreground leading-tight truncate"
              style={{ fontFamily: SERIF }}
            >
              La Sirena
            </p>
            <p className="hidden sm:block text-[11px] text-muted-foreground font-medium tracking-wide mt-0.5 truncate">
              {t("tienda.desde")}
            </p>
          </div>
        </button>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-8 absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => navigate("landing")}
            className="text-foreground hover:text-[var(--rojo)] transition-colors cursor-pointer text-sm font-semibold tracking-wide"
          >
            {t("tienda.inicio")}
          </button>
          <button
            onClick={() => navigate("catalog")}
            {...precargar("catalog")}
            className="text-foreground hover:text-[var(--rojo)] transition-colors cursor-pointer text-sm font-semibold tracking-wide"
          >
            {t("tienda.verMenu")}
          </button>
          {isLoggedIn && (
            <button
              onClick={() => navigate("mis-pedidos")}
              className="text-foreground hover:text-[var(--rojo)] transition-colors cursor-pointer text-sm font-semibold tracking-wide"
            >
              {t("tienda.pedidos")}
            </button>
          )}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Idioma */}
          <LanguageSelector className="inline-flex items-center justify-center gap-1.5 max-[361px]:min-w-11 max-[361px]:[&>:not(:first-child)]:hidden h-10 max-md:h-11 px-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer" />

          {/* Cart */}
          <button
            onClick={() => navigate("cart")}
            {...precargar("cart")}
            className="relative inline-flex items-center gap-2 px-4 py-2.5 max-md:min-h-11 bg-[var(--rojo)] text-white rounded-xl font-semibold text-sm hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-900/20 cursor-pointer"
            aria-label={count > 0 ? t("tienda.verCarritoCon", { n: count }) : t("tienda.verCarrito")}
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">{t("tienda.carrito")}</span>
            {count > 0 && (
              <m.span
                key={count}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-[var(--rojo)] text-[0.625rem] font-bold rounded-full flex items-center justify-center border-2 border-red-100 shadow-sm"
              >
                {count}
              </m.span>
            )}
          </button>

          {/* Profile / Login — en móvil (<768 px) el acceso a sesión lo da la
              barra inferior ("Ingresar"), así que este botón del header solo
              existe desde md para que nunca se vean las dos opciones a la vez. */}
          {isLoggedIn ? (perfilPendiente && !loggedInUser ? (
            <div
              className="hidden md:flex w-10 h-10 rounded-full bg-muted border border-border"
              role="status"
              aria-label={t("tienda.cargandoPerfil")}
            />
          ) : (
            <button
              onClick={() =>
                navigate(isStaff ? "store-profile" : "client-profile")
              }
              className={`hidden md:flex w-10 h-10 rounded-full items-center justify-center transition-colors cursor-pointer shadow-sm font-bold text-sm text-white ${loggedInUser?.avatarColor ?? (isStaff ? "bg-primary hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700")
                }`}
              title={t("tienda.miPerfil")}
            >
              {(loggedInUser?.iniciales.charAt(0) ?? (isStaff ? "G" : "S")).toUpperCase()}
            </button>
          )) : (
            <button
              onClick={onLogin}
              {...precargar("login")}
              className="hidden md:inline-flex px-3 sm:px-4 py-2.5 bg-[var(--rojo)] text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md shadow-red-900/20 whitespace-nowrap"
            >
              {t("tienda.iniciarSesion")}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
