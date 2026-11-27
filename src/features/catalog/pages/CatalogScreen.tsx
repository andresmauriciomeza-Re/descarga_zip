import type { Screen } from "@/shared/utils/screen";
import { type Product } from "@/shared/utils/catalog";
import type { CartItem } from "@/types/cart";
import { type CategoriaProducto } from "@/features/product-categories/pages/ProductCategoriesScreen";
import { useIsMobile } from "@/shared/components/ui/use-mobile";
import { toast } from "sonner";
import fondoMenu from "@/assets/img/fondo_menu.webp";
import { SERIF } from "@/shared/utils/fonts";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { VolverArriba } from "@/shared/components/BackToTop";
import { type LineaLimiteRef, type LimiteLinea } from "@/features/catalog/utils/lineLimits";
import { sizeDe } from "@/features/catalog/data/products";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import { useCatalogFilters } from "@/features/catalog/hooks/useCatalogFilters";

export function CatalogScreen({
  navigate,
  setProduct,
  quickAdd,
  categoria,
  setCategoria,
  page,
  setPage,
  search,
  setSearch,
  productos,
  onOpenDetail,
  cart,
  updateQty,
  categorias,
  limiteDe,
}: {
  navigate: (s: Screen) => void;
  setProduct: (p: Product) => void;
  /** Bloque 5: devuelve si algo se agregó; si no, el mensaje de máximo. */
  quickAdd: (p: Product) => { agregado: boolean; mensaje?: string };
  categoria: string | null;
  setCategoria: (categoria: string) => void;
  /** Página del catálogo, controlada por App para que sobreviva al detalle. */
  page: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  /** Búsqueda del catálogo, controlada por App para que sobreviva al detalle. */
  search: string;
  setSearch: (s: string) => void;
  /** Productos del panel de administrador. */
  productos: Product[];
  /** Abre el detalle guardando la pantalla de origen. */
  onOpenDetail: (p: Product) => void;
  cart: CartItem[];
  updateQty: (id: string, delta: number) => void;
  /** Categorías del admin, para filtros dinámicos. */
  categorias: CategoriaProducto[];
  /** Bloque 5 — Tope por línea con TODO el carrito; lo calcula App. */
  limiteDe: (linea: LineaLimiteRef) => LimiteLinea;
}) {
  const isMobile = useIsMobile();







  const { productosSeguros, PER_PAGE, filtros, cat, filtered, totalPages, paged } = useCatalogFilters(productos, categorias, isMobile, categoria, search, page, setPage);
  const abrirDetalle = (p: Product) => {
    onOpenDetail(p);
  };

  const agregarAlCarrito = (p: Product) => {
    const r = quickAdd(p);
    // Bloque 5 (punto 4): si no se agregó nada —la línea ya está en su
    // máximo— solo sale el aviso; el toast nunca dice "agregada al carrito"
    // sin que se haya agregado nada.
    if (r.mensaje) {
      toast.warning(r.mensaje);
      return;
    }
    // Una pizza se agrega con su tamaño por defecto (Mediana) y eso se dice en
    // el toast; las lasañas y bebidas conservan su mensaje original.
    const tamano = p.sizes.length > 1 ? ` ${sizeDe(p, 0).label}` : "";
    toast.success(`${p.name}${tamano} agregada al carrito`, {
      action: {
        label: "Ver carrito",
        onClick: () => navigate("cart"),
      },
    });
  };

  const irAPagina = (n: number) => {
    setPage(n);
    // El grid arranca justo debajo del buscador: sin esto el número de página
    // quedaba pegado al borde superior de la ventana y el título del menú
    // quedaba fuera de vista al cambiar de página.
    window.requestAnimationFrame(() =>
      window.scrollTo({
        top: document.getElementById("catalogo-inicio")?.offsetTop ?? 0,
        behavior: "smooth",
      }),
    );
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
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8" id="catalogo-inicio">
        <h1
          className="text-3xl font-bold text-foreground"
          style={{ fontFamily: SERIF }}
        >
          Nuestro Menú
        </h1>
        <p className="text-muted-foreground mt-1">
          Elige tu pizza favorita y personalízala a tu gusto
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar pizza..."
            aria-label="Buscar pizza en el menú"
            className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            key="Todas"
            onClick={() => {
              setCategoria("Todas");
              setPage(1);
            }}
            className={`px-4 py-2.5 max-md:min-h-11 rounded-xl text-sm font-semibold transition-all cursor-pointer ${cat === "Todas" ? "bg-primary text-white shadow" : "bg-muted text-muted-foreground hover:bg-border"}`}>
            Todas
          </button>
          {filtros.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCategoria(c.id);
                setPage(1);
              }}
              className={`px-4 py-2.5 max-md:min-h-11 rounded-xl text-sm font-semibold transition-all cursor-pointer ${cat === c.id ? "bg-primary text-white shadow" : "bg-muted text-muted-foreground hover:bg-border"}`}>
              {c.nombre}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-6xl mb-4">🔍</p>
          <h3 className="text-xl font-bold mb-2 text-foreground">
            {productosSeguros.length === 0 ? "No hay productos disponibles" : "Sin resultados"}
          </h3>
          <p className="text-muted-foreground">
            {productosSeguros.length === 0
              ? "Vuelve a intentarlo más tarde."
              : "No encontramos pizzas con ese nombre. ¡Intenta con otro!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {paged.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              index={i}
              onOpen={abrirDetalle}
              onQuickAdd={agregarAlCarrito}
              cart={cart}
              updateQty={updateQty}
              limiteDe={limiteDe}
            />
          ))}
        </div>
      )}

      <div className="mt-8 pb-20 md:pb-4">
        <p className="text-sm text-muted-foreground text-center mb-3">
          Mostrando {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} de {filtered.length} producto{filtered.length === 1 ? "" : "s"}
        </p>
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => irAPagina(Math.max(1, page - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
              className="inline-flex items-center gap-1 px-3 py-2 min-h-[40px] max-md:min-h-11 rounded-lg border border-border text-sm font-semibold cursor-pointer hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (n) => (
                <button
                  key={n}
                  onClick={() => irAPagina(n)}
                  aria-current={n === page ? "page" : undefined}
                  className={`w-10 h-10 min-h-[40px] min-w-[40px] max-md:w-11 max-md:h-11 rounded-lg text-sm font-semibold cursor-pointer ${n === page
                      ? "bg-primary text-white"
                      : "border border-border text-muted-foreground hover:bg-muted"
                    }`}
                >
                  {n}
                </button>
              ),
            )}
            <button
              onClick={() => irAPagina(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              aria-label="Página siguiente"
              className="inline-flex items-center gap-1 px-3 py-2 min-h-[40px] max-md:min-h-11 rounded-lg border border-border text-sm font-semibold cursor-pointer hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <VolverArriba />
      </div>
    </div>
  );
}
