import { limiteStockDe, verImagenCompleta, estadoDeProducto, productoDisponible, etiquetaEstadoMenu, type Product } from "@/shared/utils/catalog";
import type { Screen } from "@/shared/utils/screen";
import type { CartItem } from "@/types/cart";
import { useEffect, useRef, useState } from "react";
import { disponiblePizza } from "@/shared/utils/pizzaStock";
import { toast } from "sonner";
import fondoMenu from "@/assets/img/fondo_menu.webp";
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus, ShoppingCart } from "lucide-react";
import { getImageUrl, onErrorImagen } from "@/shared/utils/getImageUrl";
import { EstadoMenuBadge, AgotadoMenuBadge, NoDisponibleOverlay } from "@/shared/components/MenuStatusBadge";
import { SERIF, MONO } from "@/shared/utils/fonts";
import { PrimaryBtn } from "@/shared/components/buttons/PrimaryButton";
import { type LineaLimiteRef, type LimiteLinea, mensajeMaximoDe } from "@/features/catalog/utils/lineLimits";
import { sizeDe } from "@/features/catalog/data/products";
import { Badge } from "@/shared/components/Badge";
import { fmt } from "@/shared/utils/currency";
import { CantidadInput } from "@/features/catalog/components/QuantityInput";
import { AvisoStockBajo } from "@/features/catalog/components/LowStockNotice";

export function ProductDetailScreen({
  product,
  catalogProducts,
  onOpenRelated,
  navigate,
  addDetailed,
  limiteDe,
  onBack,
  backLabel,
}: {
  product: Product;
  catalogProducts: Product[];
  onOpenRelated: (product: Product) => void;
  navigate: (s: Screen, options?: { restaurar?: boolean }) => void;
  /** Bloque 5 — Devuelve si algo se agregó; si no, el mensaje de máximo (el
      toast jamás dice "agregada" si no se agregó nada). */
  addDetailed: (item: CartItem) => { agregado: boolean; mensaje?: string };
  /** Bloque 5 — Tope de ESTE producto/tamaño considerando TODO lo que ya hay
      en el carrito (el detalle no tiene id: todo el carrito cuenta, así `max`
      son las unidades que se pueden AGREGAR); lo calcula App. */
  limiteDe: (linea: LineaLimiteRef) => LimiteLinea;
  onBack: () => void;
  backLabel: string;
}) {
  const [sizeIdx, setSizeIdx] = useState(0);
  const [extras, setExtras] = useState<string[]>([]);
  const [qty, setQty] = useState(1);

  const [imageIndex, setImageIndex] = useState(0);
  const imageDialogRef = useRef<HTMLDialogElement>(null);
  const images = product.images?.length ? product.images : [product.image];
  const activeImageIndex = imageIndex < images.length ? imageIndex : 0;
  const currentImage = images[activeImageIndex];
  const moveImage = (direction: number) => {
    setImageIndex((activeImageIndex + direction + images.length) % images.length);
  };

  const availableProducts = catalogProducts.filter((candidate) => {
    if (candidate.id === product.id || !productoDisponible(candidate)) return false;
    if (!candidate.sizes.length) return limiteStockDe(candidate) !== 0;
    return candidate.sizes.some(({ label }) => {
      if (candidate.stockPartes != null && /^(Mediana|Grande)$/.test(label)) {
        return disponiblePizza(candidate.stockPartes, label, []) > 0;
      }
      return (limiteStockDe(candidate, label) ?? candidate.stockApi) !== 0;
    });
  });
  const relatedProducts = [
    ...availableProducts.filter((candidate) => candidate.idCategoria === product.idCategoria),
    ...availableProducts.filter((candidate) => candidate.idCategoria !== product.idCategoria),
  ].slice(0, 4);

  const extrasPrice = extras.reduce(
    (sum, ex) =>
      sum +
      (product.extras.find((e) => e.label === ex)?.price ?? 0),
    0,
  );
  const sizePrice = sizeDe(product, sizeIdx).price;
  const total = (sizePrice + extrasPrice) * qty;
  // Estado del producto en el menú: la etiqueta se muestra igual que en la
  // tarjeta y, si no está disponible, el pedido se bloquea desde acá (el
  // botón "Agregar al carrito" antes ignoraba el estado).
  const estado = estadoDeProducto(product);
  const noDisponible = estado !== "Disponible";
  const esPizza = product.category.toLowerCase().includes("pizza");
  // Bloque 5 — Tope de ESTE producto/tamaño considerando TODO lo que ya hay
  // en el carrito (el detalle no tiene id: todas las líneas cuentan como
  // ajenas, así `max` son las unidades que se pueden AGREGAR ahora).
  // undefined = sin límite (sin ficha, sin stock o fuera del panel).
  const tamanoElegido = sizeDe(product, sizeIdx).label;
  const limite = limiteDe({ product, size: tamanoElegido });
  const max = limite.max;
  // La cantidad se ajusta sola si el máximo baja —al cambiar de tamaño o al
  // bajar el stock— y nunca baja de 1.
  const tope = Math.max(1, max ?? Infinity);
  useEffect(() => {
    setQty((q) => Math.max(1, Math.min(q, tope)));
  }, [tope]);
  // Punto 6: máximo 0 = Agotado (sin cambiar el estado del producto).
  const agotado = max === 0;
  // Una sola etiqueta de estado a la vez (ver `etiquetaEstadoMenu`).
  const etiqueta = etiquetaEstadoMenu(estado, agotado);
  // Punto 4: al llegar al máximo el + queda deshabilitado y sale el mensaje.
  const enTope = max !== undefined && qty >= max;
  const mensajeMax =
    max === undefined
      ? ""
      : max === 0
        ? "Agotado"
        : mensajeMaximoDe(product.name, max, tamanoElegido, limite.elaborado);
  // Punto 5: bebida con 10 o menos disponibles avisa acá (ámbar ≤10, rojo
  // ≤5); los productos insumo se rigen por su ficha técnica.
  const bajoStock =
    !limite.elaborado && max !== undefined && max > 0 && max <= 10;


  const handleAdd = () => {
    // Red de seguridad además del `disabled` del botón.
    if (noDisponible) {
      toast.error("Este producto no está disponible por ahora");
      return;
    }
    const size = sizeDe(product, sizeIdx);
    // Bloque 5: la cantidad se ajusta sola al máximo permitido (mínimo 1).
    const cantidad = Math.max(1, Math.min(qty, tope));
    const r = addDetailed({
      id: `${product.id}-${Date.now()}`,
      product,
      quantity: cantidad,
      size: size.label,
      sizePrice,
      selectedExtras: extras,
      extrasPrice,
    });
    // Punto 4: si no se agregó nada, solo el aviso de máximo; el toast nunca
    // dice "agregada al carrito" sin que se haya agregado nada.
    if (r.mensaje) {
      toast.warning(r.mensaje);
      return;
    }
    setQty(1);
    toast.success(`${product.name} ${size.label} × ${cantidad} agregada al carrito`, {
      action: {
        label: "Ver carrito",
        onClick: () => navigate("cart"),
      },
    });
  };

  return (
    <div className="relative min-h-[calc(100dvh-80px)]">
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-fixed dark:brightness-[0.2]"
        style={{
          backgroundImage: `url(${fondoMenu})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 max-md:min-h-11 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Image */}
        <div className={`grid gap-3 self-start ${images.length > 1 ? "md:grid-cols-[4rem_minmax(0,1fr)]" : ""}`}>
          <div className={`relative overflow-hidden rounded-2xl bg-muted h-80 md:h-[420px] ${images.length > 1 ? "md:col-start-2 md:row-start-1" : ""}`}>
            <button
              type="button"
              aria-label={`Ampliar imagen de ${product.name}`}
              onClick={() => imageDialogRef.current?.showModal()}
              className={`block h-full w-full cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${verImagenCompleta(product) ? "p-3" : ""}`}
            >
              <img
                key={currentImage}
                src={getImageUrl(currentImage)}
                alt={product.name}
                onError={onErrorImagen}
                className={`block w-full h-full ${verImagenCompleta(product) ? "object-contain" : "object-cover"} ${etiqueta === "no_disponible" ? "grayscale opacity-60" : ""}`}
              />
            </button>
            {/* Mismo estado que en la tarjeta del catálogo: fondo sólido,
                arriba a la izquierda con 12 px de separación. Una sola etiqueta
                a la vez: si está agotado se oculta el verde. */}
            {etiqueta !== "agotado" && (
              <EstadoMenuBadge
                estado={estado}
                className="pointer-events-none absolute top-3 left-3 z-10"
              />
            )}
            {/* Punto 6: máximo 0 = Agotado (sin cambiar el estado). Ocupa la
                MISMA esquina superior izquierda y el mismo estilo de píldora que
                el badge de estado. */}
            {etiqueta === "agotado" && (
              <AgotadoMenuBadge className="pointer-events-none absolute top-3 left-3 z-10" />
            )}
            {etiqueta === "no_disponible" && (
              <NoDisponibleOverlay className="pointer-events-none absolute inset-0 z-10" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 md:col-start-1 md:row-start-1 md:flex-col" role="group" aria-label="Imágenes del producto">
              {images.map((image, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Ver imagen ${index + 1}`}
                  aria-pressed={index === activeImageIndex}
                  onClick={() => setImageIndex(index)}
                  className="size-16 overflow-hidden rounded-lg border-2 border-border bg-muted cursor-pointer aria-pressed:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <img src={getImageUrl(image)} alt="" onError={onErrorImagen} className="size-full object-contain" />
                </button>
              ))}
            </div>
          )}
          <dialog
            ref={imageDialogRef}
            aria-label={`Imágenes de ${product.name}`}
            className="fixed inset-0 m-auto w-[min(94vw,64rem)] max-w-none rounded-xl bg-neutral-950 p-4 text-white backdrop:bg-black/85"
            onKeyDown={(event) => {
              if (images.length < 2) return;
              if (event.key === "ArrowLeft") moveImage(-1);
              if (event.key === "ArrowRight") moveImage(1);
            }}
          >
            <div className="mb-3 flex justify-end">
              <button autoFocus type="button" onClick={() => imageDialogRef.current?.close()} className="rounded-lg bg-white/15 px-3 py-2 hover:bg-white/25">
                Cerrar
              </button>
            </div>
            <div className="relative">
              <img key={currentImage} src={getImageUrl(currentImage)} alt={product.name} loading="lazy" onError={onErrorImagen} className="mx-auto max-h-[74dvh] w-full object-contain" />
              {images.length > 1 && (
                <>
                  <button type="button" aria-label="Imagen anterior" onClick={() => moveImage(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-black/75 p-2 hover:bg-black">
                    <ChevronLeft className="size-6" />
                  </button>
                  <button type="button" aria-label="Imagen siguiente" onClick={() => moveImage(1)} className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-black/75 p-2 hover:bg-black">
                    <ChevronRight className="size-6" />
                  </button>
                </>
              )}
            </div>
          </dialog>
        </div>

        {/* Info */}
        <div>
          <Badge className="mb-3 bg-muted text-muted-foreground">
            {product.category}
          </Badge>
          <h1
            className="text-4xl font-bold mb-2 text-foreground leading-tight"
            style={{ fontFamily: SERIF }}
          >
            {product.name}
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-6">
            {product.description}
          </p>
          {esPizza && (
            <p className="mb-6 rounded-xl border border-border bg-muted/70 px-3 py-2 text-sm text-muted-foreground">
              Se vende por porción. Mediana: 1/8 de pizza · Grande: 1/6 de pizza (más grande).
            </p>
          )}

          {/* Tamaño: las bebidas no tienen selector (botella 2.5 L) y las
              lasañas tienen una única presentación fija "Normal". Solo las
              pizzas ofrecen una elección real entre Mediana y Grande. */}
          {product.sizes.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold mb-3 text-foreground">
                {product.sizes.length === 1 && !esPizza
                  ? "Presentación"
                  : "Elige el tamaño"}
              </h3>
              {product.sizes.length === 1 ? (
                <div className="flex items-center justify-between p-3.5 rounded-xl border-2 border-primary bg-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <span className="font-medium text-foreground">
                      {product.sizes[0].label}
                    </span>
                  </div>
                  <span
                    className="font-bold text-foreground"
                    style={{ fontFamily: MONO }}
                  >
                    {fmt(product.sizes[0].price)}
                    {product.category.toLowerCase().includes("pizza") ? " / porción" : ""}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {product.sizes.map((s, i) => (
                    (() => {
                      const limiteTamano = esPizza
                        ? limiteDe({ product, size: s.label })
                        : undefined;
                      const agotadoTamano = limiteTamano?.max === 0;
                      return <label
                      key={s.label}
                      className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${agotadoTamano ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${sizeIdx === i ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${sizeIdx === i ? "border-primary" : "border-muted-foreground"}`}
                        >
                          {sizeIdx === i && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <input
                          type="radio"
                          name="size"
                          className="sr-only"
                          checked={sizeIdx === i}
                          disabled={agotadoTamano}
                          onChange={() => {
                            if (!agotadoTamano) setSizeIdx(i);
                          }}
                        />
                        <span className="font-medium text-foreground">
                          {esPizza ? `${s.label} — ${fmt(s.price)} por porción` : s.label}
                          {esPizza && sizeIdx === i && (
                            <span className="block text-xs font-normal text-muted-foreground mt-1">
                              {limiteTamano?.max == null
                                ? "Disponibilidad no informada"
                                : limiteTamano.max === 0
                                  ? "Agotado"
                                  : `Disponibles: ${limiteTamano.max} ${limiteTamano.max === 1 ? "porción" : "porciones"}`}
                            </span>
                          )}
                          {esPizza && agotadoTamano && sizeIdx !== i && (
                            <span className="block text-xs font-semibold text-red-600 mt-1">Agotado</span>
                          )}
                        </span>
                      </div>
                      {!esPizza && <span
                        className="font-bold text-foreground"
                        style={{ fontFamily: MONO }}
                      >
                        {fmt(s.price)}
                      </span>}
                    </label>
                    })()
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cantidad */}
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <span className="font-bold text-foreground">
                {esPizza ? "Porciones" : "Cantidad"}
              </span>
              <div className="flex items-center gap-2 bg-muted rounded-xl p-1">
                <button
                  onClick={() =>
                    setQty((q) => Math.max(1, q - 1))
                  }
                  className="w-9 h-9 max-md:w-11 max-md:h-11 rounded-lg bg-card flex items-center justify-center hover:bg-border transition-colors cursor-pointer shadow-sm"
                >
                  <Minus className="w-4 h-4" />
                </button>
                {/* Bloque 5 (punto 3): campo editable con el teclado; si se
                    escribe más del máximo se ajusta solo y avisa. */}
                <CantidadInput
                  value={qty}
                  max={max}
                  mensajeMaximo={mensajeMax}
                  onChange={setQty}
                />
                {/* Punto 4: al estar en el máximo el + queda deshabilitado y
                    el título del botón (y el mensaje de abajo) lo dicen. */}
                <button
                  onClick={() => setQty((q) => Math.min(q + 1, tope))}
                  disabled={agotado || enTope}
                  title={
                    agotado
                      ? "Agotado"
                      : enTope
                        ? mensajeMax
                        : "Aumentar cantidad"
                  }
                  className="w-9 h-9 max-md:w-11 max-md:h-11 rounded-lg bg-card flex items-center justify-center hover:bg-border transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Puntos 4 y 5: mensaje de máximo y aviso de stock bajo de
                bebidas, visibles sin tener que pasar el cursor. */}
            {!agotado && enTope && (
              <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                {mensajeMax}
              </p>
            )}
            {bajoStock && (
              <AvisoStockBajo max={max} className="mt-2 inline-block" />
            )}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-xl mb-4">
            <span className="text-muted-foreground font-medium">
              Total a pagar
            </span>
            <span
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: MONO }}
            >
              {fmt(total)}
            </span>
          </div>
          <PrimaryBtn
            onClick={handleAdd}
            size="lg"
            // Puntos 4 y 6: no disponible o agotado → sin agregar.
            disabled={noDisponible || agotado}
            className="w-full"
          >
            <ShoppingCart className="w-5 h-5" />{" "}
            {noDisponible
              ? "No disponible por ahora"
              : agotado
                ? "Agotado"
                : esPizza
                  ? `Agregar ${qty} ${qty === 1 ? "porción" : "porciones"} al carrito`
                  : "Agregar al carrito"}
          </PrimaryBtn>
        </div>
      </div>
      {relatedProducts.length > 0 && (
        <section className="mt-10" aria-labelledby="related-products-heading">
          <h2 id="related-products-heading" className="mb-4 text-2xl font-bold text-foreground">
            También te puede gustar
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {relatedProducts.map((related) => (
              <button
                key={related.id}
                type="button"
                onClick={() => onOpenRelated(related)}
                className="overflow-hidden rounded-xl border border-border bg-card text-left cursor-pointer hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
              >
                <img
                  src={related.image}
                  alt=""
                  loading="lazy"
                  className={`aspect-[4/3] w-full ${verImagenCompleta(related) ? "object-contain" : "object-cover"}`}
                />
                <div className="p-3">
                  <p className="font-semibold text-foreground">{related.name}</p>
                  <p className="text-sm font-semibold text-primary">{fmt(related.price)}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
