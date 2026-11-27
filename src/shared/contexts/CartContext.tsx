import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { leerCarritoGuardado, leerCarritosDeUsuarios } from "@/features/cart/utils/cartStorage";
import { useAuth } from "@/shared/contexts/AuthContext";
import type { CartItem } from "@/types/cart";

const CartContext = createContext<{
  cart: CartItem[];
  setCart: Dispatch<SetStateAction<CartItem[]>>;
} | null>(null);

/** Estado del carrito. Debe ir dentro de `AuthProvider`: el carrito inicial
    depende de si hay una sesión guardada. */
export function CartProvider({ children }: { children: ReactNode }) {
  const { sesionActiva } = useAuth();
  // El carrito arranca desde lo que quedó guardado: sin esto, recargar la
  // página, cambiar de categoría o abrir el detalle de otro producto borraba
  // lo que el cliente había agregado sin haber iniciado sesión. El catálogo y
  // la compra no cambian: solo se recupera el estado que ya estaba en pantalla.
  const [cart, setCart] = useState<CartItem[]>(() =>
    sesionActiva ? leerCarritosDeUsuarios()[sesionActiva.userId] ?? [] : leerCarritoGuardado(),
  );
  return <CartContext.Provider value={{ cart, setCart }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const contexto = useContext(CartContext);
  if (!contexto) throw new Error("useCart debe usarse dentro de <CartProvider>.");
  return contexto;
}
