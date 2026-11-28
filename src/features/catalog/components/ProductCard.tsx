import { limiteStockDe, verImagenCompleta, estadoDeProducto, etiquetaEstadoMenu, type Product } from "@/shared/utils/catalog";
import type { CartItem } from "@/types/cart";
import { motion } from "motion/react";
import { getImageUrl, onErrorImagen } from "@/shared/utils/getImageUrl";
import { EstadoMenuBadge, AgotadoMenuBadge, NoDisponibleOverlay } from "@/shared/components/MenuStatusBadge";
import { SERIF, MONO } from "@/shared/utils/fonts";
import { ShoppingCart } from "lucide-react";
import { PrimaryBtn } from "@/shared/components/buttons/PrimaryButton";
import { type LineaLimiteRef, type LimiteLinea, mensajeMaximoDe } from "@/features/catalog/utils/lineLimits";
import { sizeDe } from "@/features/catalog/data/products";
import { fmt } from "@/shared/utils/currency";

// Tarjeta de producto del catálogo. Vive fuera de `CatalogScreen` porque el
// grid se pinta por dos caminos —grid único al elegir una categoría y grid por
// secciones con "Todas"— y los dos tienen que mostrar exactamente la misma
// tarjeta. `index` solo escalona la animación dentro de su propia fila.
export function ProductCard({
  product: p,
  index,
  onOpen,
  onQuickAdd,
  cart,
  limiteDe,
}: {
  product: Product;
  index: number;
  onOpen: (p: Product) => void;
  onQuickAdd: (p: Product) => void;
  cart: CartItem[];
  /** Sigue llegando desde CatalogScreen, pero ya no se usa acá: la tarjeta
      no tiene stepper [− cantidad +], solo el botón rápido de +1. */
  updateQty: (id: string, qty: number) => void;
  /** Bloque 5 — Tope de la línea que completaría el botón rápido, con TODO
      el carrito; lo calcula App (panel, fichas e insumos). */
  limiteDe: (linea: LineaLimiteRef) => LimiteLinea;
}) {
  // Estado real del producto (menú público). "Descontinuado" no llega acá:
  // CatalogScreen lo filtra antes de armar el grid.
  const estado = estadoDeProducto(p);
  const noDisponible = estado !== "Disponible";
  // Bloque 5 — El botón suma 1 con el tamaño por defecto, pero si ya hay una
  // línea sin extras de ESTE producto el +1 se acumula en ella (mismo
  // criterio que `quickAdd`), así que el tope es el de ESA línea.
  const tamanoDefecto = sizeDe(p, 0).label;
  const enCarrito = cart.find(
    (i) => i.product.id === p.id && i.size === tamanoDefecto && i.selectedExtras.length === 0,
  );
  const tope = limiteDe(enCarrito ?? { product: p, size: tamanoDefecto });
  const max = tope.max;
  const adicional =
    max === undefined ? undefined : max - (enCarrito?.quantity ?? 0);
  // Punto 6: no queda nada por agregar = "Agotado" (sin cambiar el estado
  // del producto; la etiqueta de estado sigue pintándose igual).
  const agotado = adicional !== undefined && adicional <= 0;
  const agotadoMenu = p.category.toLowerCase().includes("pizza")
    ? p.sizes.length > 0 && p.sizes.every((size) => {
      const disponible = limiteDe({ product: p, size: size.label }).max;
      return disponible !== undefined && disponible <= 0;
    })
    : agotado;
  // Una sola etiqueta de estado a la vez (ver `etiquetaEstadoMenu`).
  const etiqueta = etiquetaEstadoMenu(estado, agotadoMenu);
  // Precio atenuado cuando el cliente no puede pedirlo: estado no disponible
  // o sin stock ("Agotado"). La FOTO se atenúa solo con "No disponible" (se
  // ve inline en su className).
  const atenuada = etiqueta !== "disponible";
  const mensajeMax =
    max === undefined
      ? ""
      : max === 0
        ? "Agotado"
        : mensajeMaximoDe(
          p.name,
          max,
          enCarrito?.size || tamanoDefecto,
          tope.elaborado,
        );
  return (
    <motion.div
      data-producto-id={p.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onOpen(p)}
      className="group bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-all duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-lg cursor-pointer"
    >
      <button
        className={`relative w-full overflow-hidden h-48 bg-muted cursor-pointer block ${verImagenCompleta(p) ? "p-2" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          onOpen(p);
        }}
      >
        <img
          src={getImageUrl(p.image)}
          alt={p.name}
          onError={onErrorImagen}
          width={800}
          height={600}
          loading="lazy"
          decoding="async"
          className={`block w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${etiqueta === "no_disponible" ? "grayscale opacity-60" : ""
            } ${verImagenCompleta(p) ? "object-contain" : "object-cover"}`}
        />
        {/* Etiqueta de estado: fondo sólido, arriba a la izquierda con 12 px
            de separación, legible sobre cualquier foto (claras, oscuras o de
            cuadritos) y en ambos modos. Una sola a la vez: si está agotado se
            oculta el verde y el "Agotado" ocupa esta misma esquina. */}
        {etiqueta !== "agotado" && (
          <EstadoMenuBadge
            estado={estado}
            className="absolute top-3 left-3 z-10"
          />
        )}
        {/* Punto 6: máximo 0 = Agotado (sin cambiar el estado del producto).
            Ocupa la MISMA esquina superior izquierda y el mismo estilo de
            píldora que el badge de estado; `etiquetaEstadoMenu` garantiza que
            solo se pinta uno de los dos. */}
        {etiqueta === "agotado" && (
          <AgotadoMenuBadge className="absolute top-3 left-3 z-10" />
        )}
        {etiqueta === "no_disponible" && (
          <NoDisponibleOverlay className="absolute inset-0 z-10" />
        )}
      </button>
      <div className="p-4">
        <div className="mb-1">
          <h3
            className="font-bold text-base text-foreground"
            style={{ fontFamily: SERIF }}
          >
            {p.name}
          </h3>
        </div>
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2 leading-snug">
          {p.description}
        </p>
        <div className="flex items-center justify-between gap-3">
          {p.category.toLowerCase().includes("pizza") ? (
            <div className="min-w-0 space-y-1 text-sm font-semibold" style={{ fontFamily: MONO }}>
              {p.sizes.map((size) => {
                const stock = limiteStockDe(p, size.label);
                const agotadoTamano = stock === 0;
                return (
                  <p
                    key={size.label}
                    className={agotadoTamano || atenuada ? "text-muted-foreground opacity-60" : "text-foreground"}
                  >
                    {size.label} {fmt(size.price)} / porción{stock !== undefined && (agotadoTamano ? " · Agotado" : ` · Quedan ${stock} porciones`)}
                  </p>
                );
              })}
            </div>
          ) : (
            <div>
              <span className={`font-bold text-lg ${atenuada ? "text-muted-foreground opacity-60" : "text-foreground"}`} style={{ fontFamily: MONO }}>
                {fmt(p.price)}
              </span>
              {limiteStockDe(p) !== undefined && <p className="text-xs text-muted-foreground">{limiteStockDe(p) === 0 ? "Agotado" : `Quedan ${limiteStockDe(p)}`}</p>}
            </div>
          )}
          <div className="flex gap-2">
            {/* Solo ícono: el botón nunca se transforma. Cada clic suma 1
                unidad (quickAdd deduplica dentro de setCart) y dispara el
                toast, sin abrir el carrito. El tamaño se elige en el detalle
                ("Ver más" o la imagen). */}
            <button
              onClick={(event) => {
                event.stopPropagation();
                onQuickAdd(p);
              }}
              // Puntos 4 y 6: no disponible o sin nada que agregar (tope en
              // 0 o ya en el máximo) → el botón queda deshabilitado.
              disabled={noDisponible || agotado}
              title={
                noDisponible
                  ? "No disponible por ahora"
                  : agotado
                    ? mensajeMax
                    : "Agregar al carrito"
              }
              aria-label={
                noDisponible
                  ? `${p.name} no está disponible por ahora`
                  : agotado
                    ? `${p.name} agotado`
                    : `Agregar ${p.name} al carrito`
              }
              className="flex items-center justify-center min-w-[40px] min-h-[40px] max-md:min-w-11 max-md:min-h-11 p-2 bg-primary text-white rounded-xl hover:bg-red-700 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer motion-reduce:active:scale-100"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          </div>
        </div>
        <PrimaryBtn
          onClick={(event) => {
            event.stopPropagation();
            onOpen(p);
          }}
          size="sm"
          className="w-full mt-3 max-md:min-h-11"
        >
          Ver detalle
        </PrimaryBtn>
      </div>
    </motion.div>
  );
}
