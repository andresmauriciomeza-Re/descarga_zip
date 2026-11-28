import { cargarOpcional } from "@/shared/utils/optionalImport";

/** Cargas de las pantallas públicas más usadas: `App` las usa con `lazy()` y los
    botones que llevan a ellas las adelantan. No lo deben importar las pantallas. */
export const cargarPantalla = {
  login: () => import("@/features/auth/pages/LoginScreen"),
  catalog: () => import("@/features/catalog/pages/CatalogScreen"),
  cart: () => import("@/features/cart/pages/CartScreen"),
};

/** Props para un botón: pide el archivo de la pantalla al pasar el mouse o dar foco. */
export const precargar = (pantalla: keyof typeof cargarPantalla) => {
  const traer = () => {
    cargarOpcional<unknown>(cargarPantalla[pantalla]).catch(() => {});
  };
  return { onPointerEnter: traer, onFocus: traer };
};
