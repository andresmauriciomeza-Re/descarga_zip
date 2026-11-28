import type { Screen } from "@/shared/utils/screen";
import { useEffect, useState } from "react";
import { Logo } from "@/shared/components/Logo";
import { Moon, ShoppingCart, Sun } from "lucide-react";
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
  darkMode,
  setDarkMode,
}: {
  navigate: (s: Screen) => void;
  cart: CartItem[];
  onLogin: () => void;
  isLoggedIn: boolean;
  isStaff: boolean;
  loggedInUser: { iniciales: string; avatarColor: string } | null;
  perfilPendiente: boolean;
  onLogout: () => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
}) {
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
          <Logo variante={darkMode ? "blanco" : "claro"} alt="S.I.V.PRO Logo" className="object-contain shrink-0 w-11 h-11 md:w-14 md:h-14 lg:w-16 lg:h-16" />
          {/* Punto 1.1: `min-w-0` + `truncate` — a 375 px el texto cede y se
              corta con puntos en vez de empujar el botón de tema fuera de la
              pantalla. */}
          <div className="leading-none min-w-0">
            <p
              className="font-bold text-[17px] text-foreground leading-tight truncate"
              style={{ fontFamily: SERIF }}
            >
              La Sirena
            </p>
            <p className="hidden sm:block text-[11px] text-muted-foreground font-medium tracking-wide mt-0.5 truncate">
              Pizza · Desde 1994
            </p>
          </div>
        </button>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => navigate("landing")}
            className="text-foreground hover:text-[var(--rojo)] transition-colors cursor-pointer text-sm font-semibold tracking-wide"
          >
            Inicio
          </button>
          <button
            onClick={() => navigate("catalog")}
            {...precargar("catalog")}
            className="text-foreground hover:text-[var(--rojo)] transition-colors cursor-pointer text-sm font-semibold tracking-wide"
          >
            Ver Menú
          </button>
          {isLoggedIn && (
            <button
              onClick={() => navigate("mis-pedidos")}
              className="text-foreground hover:text-[var(--rojo)] transition-colors cursor-pointer text-sm font-semibold tracking-wide"
            >
              Pedidos
            </button>
          )}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Cart */}
          <button
            onClick={() => navigate("cart")}
            {...precargar("cart")}
            className="relative inline-flex items-center gap-2 px-4 py-2.5 max-md:min-h-11 bg-[var(--rojo)] text-white rounded-xl font-semibold text-sm hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-900/20 cursor-pointer"
            aria-label={count > 0 ? `Ver carrito (${count} productos)` : "Ver carrito"}
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Carrito</span>
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
              aria-label="Cargando perfil"
            />
          ) : (
            <button
              onClick={() =>
                navigate(isStaff ? "store-profile" : "client-profile")
              }
              className={`hidden md:flex w-10 h-10 rounded-full items-center justify-center transition-colors cursor-pointer shadow-sm font-bold text-sm text-white ${loggedInUser?.avatarColor ?? (isStaff ? "bg-primary hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700")
                }`}
              title="Mi perfil"
            >
              {(loggedInUser?.iniciales.charAt(0) ?? (isStaff ? "G" : "S")).toUpperCase()}
            </button>
          )) : (
            <button
              onClick={onLogin}
              {...precargar("login")}
              className="hidden md:inline-flex px-3 sm:px-4 py-2.5 bg-[var(--rojo)] text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md shadow-red-900/20 whitespace-nowrap"
            >
              Iniciar sesión
            </button>
          )}

          {/* Dark mode */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-10 h-10 max-md:w-11 max-md:h-11 rounded-full border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Cambiar tema"
            aria-label={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            {darkMode ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
