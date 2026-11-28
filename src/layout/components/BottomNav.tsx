import type { Screen } from "@/shared/utils/screen";
import { Grid, Home, ShoppingBag, UserCircle } from "lucide-react";
import { useIdioma } from "@/shared/i18n";

export function BottomNav({
  navigate,
  current,
  isLoggedIn,
  isStaff,
  loggedInUser,
  onLogin,
}: {
  navigate: (s: Screen) => void;
  current: Screen;
  isLoggedIn: boolean;
  isStaff: boolean;
  loggedInUser: { iniciales: string; avatarColor: string } | null;
  /** Abre el modal de Iniciar sesión (lo que hacía el botón "Más"). */
  onLogin: () => void;
}) {
  const { t } = useIdioma();
  const items = [
    { s: "landing" as Screen, Icon: Home, label: t("tienda.inicio") },
    ...(isLoggedIn
      ? [{ s: "mis-pedidos" as Screen, Icon: ShoppingBag, label: t("tienda.misPedidos") }]
      : []),
    { s: "catalog" as Screen, Icon: Grid, label: t("tienda.menu") },
  ];
  // Punto 2.1: "Carrito" y "Más" dejan la barra inferior. El carrito ya vive
  // en el botón rojo del header (y en el badge del contenido), y lo que antes
  // abría el cajón "Más" ahora es "Perfil": mismo destino que el avatar del
  // header (`store-profile` para staff / `client-profile` para cliente, para
  // no chocar con el guard de rutas del panel).
  const perfilScreen: Screen = isStaff ? "store-profile" : "client-profile";
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16">
        {items.map(({ s, Icon, label }) => (
          <button
            key={s}
            onClick={() => navigate(s)}
            className={`flex flex-col items-center gap-1 py-2 px-3 cursor-pointer transition-colors ${current === s ? "text-primary" : "text-muted-foreground"}`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium min-w-0 truncate max-w-[5rem]">{label}</span>
          </button>
        ))}
        {isLoggedIn ? (
          <button
            onClick={() => navigate(perfilScreen)}
            className={`flex flex-col items-center gap-1 py-2 px-3 cursor-pointer transition-colors ${current === perfilScreen ? "text-primary" : "text-muted-foreground"}`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold leading-none shadow-sm ${loggedInUser?.avatarColor ?? "bg-primary"}`}
            >
              {(loggedInUser?.iniciales.charAt(0) ?? "U").toUpperCase()}
            </span>
            <span className="text-xs font-medium min-w-0 truncate max-w-[5rem]">{t("tienda.perfil")}</span>
          </button>
        ) : (
          <button
            onClick={onLogin}
            className="flex flex-col items-center gap-1 py-2 px-3 cursor-pointer text-muted-foreground"
          >
            <UserCircle className="w-5 h-5" />
            <span className="text-xs font-medium min-w-0 truncate max-w-[5rem]">{t("tienda.ingresar")}</span>
          </button>
        )}
      </div>
    </nav>
  );
}
