import { createContext, useContext, useState, type ReactNode } from "react";
import {
  INACTIVIDAD_MS,
  borrarSesionGuardada,
  leerRolActivo,
  leerSesionGuardada,
} from "@/features/auth/hooks/useSession";

/** Estado de la sesión. La lógica de entrada, salida y persistencia sigue en
    `App`, porque cruza carrito, roles y navegación. */
const useEstadoSesion = () => {
  /** Snapshot de la sesión al cargar la página, leído UNA sola vez.
      Permite que F5 no borre la sesión (se restaura usuario, rol y pantalla)
      y detectar una sesión expirada por inactividad para avisar. */
  const [sesionArranque] = useState(() => {
    const s = leerSesionGuardada();
    if (!s) return { estado: "ninguna" as const };
    if (Date.now() - s.ultimaActividad >= INACTIVIDAD_MS) {
      borrarSesionGuardada();
      return { estado: "expirada" as const };
    }
    return { estado: "activa" as const, s };
  });
  const sesionActiva = sesionArranque.estado === "activa" ? sesionArranque.s : null;
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(sesionActiva !== null);
  // La sesión persistida no se invalida hasta recibir /auth/me. Así el primer
  // render con `usuarios` todavía vacío no se confunde con una sesión inválida.
  const [restauracionSesionLista, setRestauracionSesionLista] = useState(!sesionActiva);
  const [userRole, setUserRole] = useState("Administrador");
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(sesionActiva?.userId ?? null);
  // Id del rol ACTIVO de la sesión. Se inicializa en el login y lo cambia el
  // menú "Cambiar de rol"; también se persiste en `sivpro.rolActivo.v1`.
  const [rolActivoId, setRolActivoId] = useState<string | null>(() =>
    sesionActiva
      ? sesionActiva.rolActivo ?? leerRolActivo(sesionActiva.userId)
      : null,
  );

  return {
    sesionArranque,
    sesionActiva,
    isLoggedIn,
    setIsLoggedIn,
    restauracionSesionLista,
    setRestauracionSesionLista,
    userRole,
    setUserRole,
    loggedInUserId,
    setLoggedInUserId,
    rolActivoId,
    setRolActivoId,
  };
};

const AuthContext = createContext<ReturnType<typeof useEstadoSesion> | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={useEstadoSesion()}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth debe usarse dentro de <AuthProvider>.");
  return contexto;
}
