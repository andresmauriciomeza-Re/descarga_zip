import type { CartItem } from "@/types/cart";
import { type Product } from "@/shared/utils/catalog";
import { PRODUCTS } from "@/features/catalog/data/products";

// ── Persistencia del carrito ───────────────────────────────────────────
// El carrito vivía solo en el `useState` de App: cualquier recarga, cambio de
// categoría o ida al detalle de otro producto lo borraba, y con él todo lo que
// el cliente había armado sin haber iniciado sesión. Ahora hay dos destinos:
//
//   · CARRITO_STORAGE_KEY      → el carrito de quien NO tiene sesión abierta.
//   · CARRITOS_USUARIOS_STORAGE_KEY → { userId: CartItem[] }, el carrito que
//     pertenece a cada cuenta, para que se recupere al volver a entrar.
//
// Las dos mitades nunca cuentan dos veces lo mismo: el carrito invitado se
// borra en cuanto la sesión lo absorbe, y la fusión descarta toda línea cuyo
// `id` ya esté en pantalla (ver `fusionarCarritos`), de modo que entrar y salir
// de la cuenta las veces que sea deja siempre el mismo carrito.
//
// Para volver a cero: localStorage.removeItem(CARRITO_STORAGE_KEY) y
// localStorage.removeItem(CARRITOS_USUARIOS_STORAGE_KEY).
export const CARRITO_STORAGE_KEY = "sivpro.carrito.v1";

export const CARRITOS_USUARIOS_STORAGE_KEY = "sivpro.carritos.usuarios.v1";

export const CHECKOUT_RETURN_STORAGE_KEY = "sivpro.checkout.return.v1";

export const guardarRetornoCheckout = () => {
  try {
    localStorage.setItem(
      CHECKOUT_RETURN_STORAGE_KEY,
      JSON.stringify({ autorizado: true }),
    );
  } catch {
    // El checkout sigue bloqueado si el navegador no permite persistir el retorno.
  }
};

export const consumirRetornoCheckout = (): boolean => {
  try {
    const raw = localStorage.getItem(CHECKOUT_RETURN_STORAGE_KEY);
    localStorage.removeItem(CHECKOUT_RETURN_STORAGE_KEY);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object"
    ) return false;
    if ("expira" in parsed && (typeof parsed.expira !== "number" || parsed.expira <= Date.now())) return false;
    if (!("autorizado" in parsed) || parsed.autorizado !== true) return false;
    return true;
  } catch {
    return false;
  }
};

export const borrarRetornoCheckout = () => {
  try {
    localStorage.removeItem(CHECKOUT_RETURN_STORAGE_KEY);
  } catch {
    // El navegador puede bloquear el almacenamiento.
  }
};

// Cartrito ligado a cada cuenta, indexado por `Usuario.id`.
export type CarritosPorUsuario = Record<string, CartItem[]>;

// Un item se acepta solo con lo que el carrito necesita para COBRAR y PINTAR la
// línea: producto, cantidad, tamaño y extras. El resto se normaliza después. Se
// evita exigirle todos los campos de `Product` porque un campo que solo afecta
// a la ficha del producto (rating, ventas, descripción) descartaría la línea
// entera —y con ella un producto que el cliente ya había elegido— por un
// detalle que no altera ni el cobro ni el carrito.
export const esCartItemValido = (i: unknown): i is CartItem => {
  if (!i || typeof i !== "object") return false;
  const item = i as CartItem;
  const prod = item.product;
  return (
    typeof item.id === "string" &&
    !!prod && typeof prod === "object" &&
    typeof prod.id === "number" &&
    typeof prod.name === "string" &&
    typeof item.quantity === "number" && item.quantity > 0 &&
    typeof item.size === "string" &&
    typeof item.sizePrice === "number" &&
    typeof item.extrasPrice === "number"
  );
};

export const hayIdsProductoLegacyEnCarritos = (): boolean => {
  try {
    const contieneLegacy = (raw: string | null) => {
      if (!raw) return false;
      const parsed: unknown = JSON.parse(raw);
      const contiene = (items: unknown[]) => items.some((item) => {
        if (!item || typeof item !== "object") return false;
        const producto = (item as { product?: { id?: unknown } }).product;
        return typeof producto?.id === "string" && /^PROD-/i.test(producto.id);
      });
      if (Array.isArray(parsed)) return contiene(parsed);
      if (parsed && typeof parsed === "object") {
        return Object.values(parsed).some((items) => Array.isArray(items) && contiene(items));
      }
      return false;
    };
    return contieneLegacy(localStorage.getItem(CARRITO_STORAGE_KEY)) ||
      contieneLegacy(localStorage.getItem(CARRITOS_USUARIOS_STORAGE_KEY));
  } catch {
    return false;
  }
};

// El producto guardado se re-resuelve contra PRODUCTS por id, igual que hacen
// `imagenDeProducto` y `precioDeProducto`: las fotos del menú son imports de
// Vite y su URL cambia en cada build, así que un carrito arrastrado desde una
// sesión anterior apuntaría a un archivo que ya no existe. Se toma el producto
// del catálogo y no al revés porque el precio que se cobra es el de la LÍNEA
// (`sizePrice` + `extrasPrice`), el que el cliente vio al agregarla. Si el id
// ya no está en el catálogo se conserva el producto guardado antes que perder
// la línea.
export const productoDeCarrito = (p: Product): Product =>
  PRODUCTS.find((x) => x.id === p.id) ?? p;

// `selectedExtras` se normaliza en vez de exigirse: un carrito guardado por una
// build anterior a esta feature puede no traerlo, y un extra ausente es "sin
// extras", no una línea inválida.
export const normalizarCartItem = (i: CartItem): CartItem => ({
  ...i,
  product: productoDeCarrito(i.product),
  selectedExtras: Array.isArray(i.selectedExtras)
    ? i.selectedExtras.filter((e) => typeof e === "string")
    : [],
});

export const leerCarritoGuardado = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(CARRITO_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(esCartItemValido).map(normalizarCartItem);
    }
  } catch {
    // Datos corruptos o localStorage bloqueado: se arranca con carrito vacío.
  }
  return [];
};

export const escribirCarritoGuardado = (items: CartItem[]) => {
  try {
    localStorage.setItem(CARRITO_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Sin cuota o con el almacenamiento deshabilitado: el carrito sigue
    // funcionando en memoria, simplemente no sobrevive a la recarga.
  }
};

export const borrarCarritoGuardado = () => {
  try {
    localStorage.removeItem(CARRITO_STORAGE_KEY);
  } catch {
    // localStorage bloqueado: no hay nada que borrar.
  }
};

export const leerCarritosDeUsuarios = (): CarritosPorUsuario => {
  try {
    const raw = localStorage.getItem(CARRITOS_USUARIOS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const carritos: CarritosPorUsuario = {};
      for (const [userId, items] of Object.entries(parsed as Record<string, unknown>)) {
        if (Array.isArray(items)) {
          carritos[userId] = items.filter(esCartItemValido).map(normalizarCartItem);
        }
      }
      return carritos;
    }
  } catch {
    // Datos corruptos o localStorage bloqueado: se empieza sin carritos.
  }
  return {};
};

export const escribirCarritosDeUsuarios = (carritos: CarritosPorUsuario) => {
  try {
    localStorage.setItem(CARRITOS_USUARIOS_STORAGE_KEY, JSON.stringify(carritos));
  } catch {
    // Sin cuota o con el almacenamiento deshabilitado: el carrito sigue
    // funcionando en memoria, simplemente no sobrevive a la recarga.
  }
};

// Dos líneas son "el mismo producto con la misma configuración" cuando
// coinciden el producto, el tamaño y el conjunto de extras. El orden de los
// extras no cuenta: se comparan ordenados porque un cliente puede haberlos
// ticked en distinto orden en dos visitas al detalle. Es el mismo criterio con
// el que `quickAdd` agrupa las unidades de un producto sin extras, así que
// fusionar no desagrupa nada que ya se viera junto en pantalla.
export const mismaConfig = (a: CartItem, b: CartItem) =>
  a.product.id === b.product.id &&
  a.size === b.size &&
  [...a.selectedExtras].sort().join("|") ===
  [...b.selectedExtras].sort().join("|");

// Al iniciar sesión, el carrito que el cliente ya tenía en pantalla (`base`, el
// local sin sesión) es el que manda: conserva su id de línea y su precio, o sea
// lo que se ve al volver al carrito. Lo que venía guardado en la cuenta se le
// suma encima cuando coincide producto, tamaño y extras, o se agrega al final
// como línea propia cuando es un producto distinto. Nada se descarta en
// ninguno de los dos casos.
export const fusionarCarritos = (
  base: CartItem[],
  guardado: CartItem[],
): CartItem[] => {
  if (guardado.length === 0) return base;
  const fusionado = [...base];
  for (const item of guardado) {
    // Una línea con el MISMO id es la misma línea que ya está en pantalla, no
    // una unidad más: los ids se generan con marca de tiempo al agregar el
    // producto y sobreviven a la persistencia, así que un id repetido solo
    // puede ser la misma línea. Se conserva la de `base`, que es la que refleja
    // lo que el cliente acaba de hacer. Esto además hace la fusión
    // idempotente: entrar en la cuenta, salir y volver a entrar no duplica el
    // carrito.
    if (fusionado.some((x) => x.id === item.id)) continue;
    const i = fusionado.findIndex((x) => mismaConfig(x, item));
    if (i === -1) {
      fusionado.push(item);
    } else {
      fusionado[i] = {
        ...fusionado[i],
        quantity: fusionado[i].quantity + item.quantity,
      };
    }
  }
  return fusionado;
};
