import type { Screen } from "@/shared/utils/screen";
import { productoACatalogo, limiteStockDe, estadoDeProducto, etiquetaEstadoMenu, type Product } from "@/shared/utils/catalog";
import { estadoDe } from "@/features/product-categories/utils/product-categories";
import type { CategoriaProducto } from "@/features/product-categories/utils/product-categories";
import type { Producto } from "@/features/products/utils/products";
import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useIsMobile } from "@/shared/components/ui/use-mobile";
import { useRef } from "react";
import pizzaHero from "@/assets/img/image-23.webp";
import { ArrowRight, ShoppingCart, Star } from "lucide-react";
import StatsMarquee from "@/layout/components/StatsMarquee";
import { getImageUrl, onErrorImagen } from "@/shared/utils/getImageUrl";
import { EstadoMenuBadge, AgotadoMenuBadge, NoDisponibleOverlay } from "@/shared/components/MenuStatusBadge";
import { PrimaryBtn } from "@/shared/components/buttons/PrimaryButton";
import imagenLocal from "@/assets/img/imagen_local.webp";
import { toast } from "sonner";
import { REVEAL_EASE, reveal, inclinarTarjetaProducto, reposarTarjetaProducto, desplazarFotoProducto, reposarFotoProducto } from "@/layout/hooks/useLandingAnimations";
import { SERIF, MONO } from "@/shared/utils/fonts";
import { precargar } from "@/shared/utils/lazyScreens";

export function Content({
  navigate,
  setProduct,
  onCategoryNavigate,
  categorias,
  productos,
  onOpenDetail,
}: {
  navigate: (s: Screen) => void;
  setProduct: (p: Product) => void;
  onCategoryNavigate: (cat: string) => void;
  /** Categorías creadas en el módulo del admin. Las tres originales NO entran
      acá: su ícono y su nombre están en las tarjetas de arriba. Solo se suman
      las que trae su propio ícono, es decir las nuevas. */
  categorias: CategoriaProducto[];
  /** Productos del panel de administración: es el mismo estado `Producto[]`
      de Gestión de Productos, así que el nombre real vive en `nombre`. */
  productos: Producto[];
  /** Abre el detalle guardando la pantalla de origen. */
  onOpenDetail: (p: Product) => void;
}) {
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const heroRef = useRef<HTMLElement | null>(null);
  const historiaRef = useRef<HTMLElement | null>(null);
  /** La profundidad ligada al scroll se reserva para escritorio: en móvil el
      desplazamiento ya es corto y conviene mantener la composición estable. */
  const profundidadActiva = !isMobile && !reduceMotion;

  const { scrollYProgress: heroProgreso } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroFotoY = useTransform(heroProgreso, [0, 1], ["0%", "6%"]);
  const heroFotoEscala = useTransform(heroProgreso, [0, 1], [1, 1.12]);
  const heroContenidoY = useTransform(heroProgreso, [0, 0.65], [0, -22]);
  const heroContenidoOpacidad = useTransform(
    heroProgreso,
    [0, 0.48, 0.76],
    [1, 1, 0],
  );

  const { scrollYProgress: historiaProgreso } = useScroll({
    target: historiaRef,
    offset: ["start end", "end start"],
  });
  const historiaFotoY = useTransform(historiaProgreso, [0, 1], ["0%", "2%"]);
  const historiaFotoEscala = useTransform(historiaProgreso, [0, 1], [1, 1.04]);
  const historiaContenidoY = useTransform(
    historiaProgreso,
    [0, 1],
    [12, -12],
  );
  const revealHeroLine = (delay: number) => ({
    initial: reduceMotion ? { y: 0 } : { y: "110%" },
    animate: { y: 0 },
    transition: reduceMotion
      ? { duration: 0 }
      : { duration: 0.72, delay, ease: REVEAL_EASE },
  });

  return (
    <>
      {/* Hero – full width con imagen de fondo */}
      <section ref={heroRef} className="relative w-full min-h-screen overflow-hidden">
        {/* Imagen de fondo full-bleed. Es el LCP de la página: por eso lleva
            fetchpriority="high", dimensiones explícitas (anticlásico) y NO lazy.
            La escala y el desplazamiento están compensados (la imagen crece lo
            mismo que se desplaza) para que nunca se vean bordes vacíos. El
            movimiento va en el contenedor para no interferir con la carga. */}
        <m.div
          aria-hidden="true"
          style={profundidadActiva ? { y: heroFotoY, scale: heroFotoEscala } : undefined}
          className="absolute inset-0"
        >
          <img
            src={pizzaHero}
            alt="Pizza pepperoni artesanal La Sirena recién horneada"
            width={1536}
            height={1024}
            {...{ fetchpriority: "high" }}
            decoding="async"
            className="w-full h-full object-cover object-center"
          />
        </m.div>

        {/* Velo oscuro en degradado (lado izquierdo, donde va el texto) para
            garantizar el contraste del texto blanco sobre la foto, sin tocar
            los colores de marca. El lado derecho queda limpio para ver la pizza. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[1] bg-gradient-to-r from-black/65 via-black/30 to-transparent"
        />

        {/* Contenido sobre la zona oscura izquierda */}
        <div className="relative z-10 w-full min-h-screen flex items-center">
          <m.div
            style={
              profundidadActiva
                ? { y: heroContenidoY, opacity: heroContenidoOpacidad }
                : undefined
            }
            className="px-5 sm:px-10 md:px-16 lg:px-20 pt-24 pb-16 max-w-xl"
          >
            <div>
              {/* Badge */}
              <m.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, delay: 0.06, ease: REVEAL_EASE }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white text-sm font-bold rounded-full mb-8 shadow-lg shadow-red-900/30"
              >
                ⭐ Artesanal · Medellín · Desde 1994
              </m.div>

              {/* Main title */}
              <m.h1
                initial={{ y: 28 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.75, delay: 0.14, ease: REVEAL_EASE }}
                className="text-[clamp(3rem,8vw,5.5rem)] font-bold text-white leading-[1.0] mb-6"
                style={{ fontFamily: SERIF }}
              >
                <span className="block overflow-hidden">
                  <m.span {...revealHeroLine(0.2)} className="block">
                    La Sirena
                  </m.span>
                </span>
                <span className="block overflow-hidden">
                  <m.span {...revealHeroLine(0.3)} className="block text-[#DC2626]">
                    El sabor que
                  </m.span>
                </span>
                <span className="block overflow-hidden">
                  <m.span {...revealHeroLine(0.4)} className="block">
                    conquista
                  </m.span>
                </span>
              </m.h1>

              {/* Description */}
              <m.p
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.65, delay: 0.24, ease: REVEAL_EASE }}
                className="text-white/70 text-lg md:text-xl leading-relaxed mb-10"
              >
                Pizzas artesanales horneadas con tradición
                familiar. Ingredientes frescos, masa propia y
                treinta años de amor.
              </m.p>

              {/* CTAs — en columna solo por debajo de `sm`; en escritorio van
                  siempre en la misma fila. `flex-col` estira los dos botones al
                  ancho del contenido, así que apilados se ven del mismo tamaño;
                  `sm:items-center` les devuelve su ancho natural en fila.
                  Por debajo de `md` este botón lleva un velo oscuro propio
                  (`max-md:bg-black/45`): sin fondo dependía de lo que se viera
                  detrás de la imagen del hero y en móvil se veía transparente. */}
              <m.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.32, ease: REVEAL_EASE }}
                className="flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <button
                  onClick={() => navigate("catalog")}
                  {...precargar("catalog")}
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#DC2626] text-white font-bold text-base rounded-xl hover:bg-red-700 active:scale-95 transition-all duration-200 shadow-2xl shadow-red-900/40 cursor-pointer"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Ordenar ahora
                </button>
                <button
                  onClick={() => navigate("catalog")}
                  {...precargar("catalog")}
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 max-md:bg-black/45 border-2 border-white/70 text-white font-bold text-base rounded-xl hover:bg-white/10 hover:border-white active:scale-95 transition-all duration-200 cursor-pointer backdrop-blur-sm"
                >
                  Ver menú completo
                  <ArrowRight className="w-5 h-5" />
                </button>
              </m.div>

              {/* Estadísticas del hero — tarjeta oscura con divisores, NO la
                  franja roja de ancho completo de más abajo: esa se mantiene
                  igual y las dos conviven. Va dentro de la columna izquierda,
                  debajo de los botones. */}
              {/* grid de 3 columnas IGUALES en una sola fila (antes flex-wrap,
                  que a 360 px bajaba "30 años / De tradición" a una segunda
                  fila). `divide-x` conserva los divisores verticales; `min-w-0`
                  en cada celda evita que la cifra o la etiqueta desborden. */}
              <m.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4, ease: REVEAL_EASE }}
                className="mt-10 w-full grid grid-cols-3 items-stretch rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 px-1.5 sm:px-3 py-4 divide-x divide-white/15"
              >
                {[
                  {
                    value: "+5.200",
                    label: "Ventas entregadas",
                  },
                  {
                    value: "25 min",
                    label: "Preparación promedio",
                  },
                  {
                    value: "30 años",
                    label: "De tradición",
                  },
                ].map(({ value, label }) => (
                  <div
                    key={label}
                    className="min-w-0 px-1.5 sm:px-5 text-center"
                  >
                    <p
                      // `clamp` en vez de pasos fijos: las tres celdas se
                      // reparten el ancho de la columna del hero, así que la
                      // cifra tiene que encogerse en pantallas muy angostas
                      // para que el bloque nunca desborde ni se corte.
                      className="text-[clamp(1rem,4.6vw,1.5rem)] font-bold text-white leading-none"
                      style={{ fontFamily: MONO }}
                    >
                      {value}
                    </p>
                    <p className="text-[clamp(0.625rem,2.6vw,0.75rem)] text-white/70 font-medium mt-1.5 leading-snug">
                      {label}
                    </p>
                  </div>
                ))}
              </m.div>
            </div>
          </m.div>
        </div>
      </section>

      {/* ── SECCIÓN 1: Estadísticas ── */}
      <section className="bg-[#DC2626] py-12 md:py-14">
        <StatsMarquee />
      </section>

      {/* ── SECCIÓN 2: Categorías ── */}
      <section className="bg-muted pt-16 md:pt-20 pb-10 md:pb-12">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          {/* Heading */}
          <m.div {...reveal(0, 14, 0.3)} className="text-center mb-12">
            <h2
              className="text-4xl md:text-5xl font-bold text-foreground mb-3"
              style={{ fontFamily: SERIF }}
            >
              Nuestras categorías
            </h2>
            <p className="text-muted-foreground text-base md:text-lg">
              Descubre todo lo que tenemos para ti
            </p>
          </m.div>

          {/* Cards — grid 3/2/1 columnas al ancho completo del contenedor
              (mismo ancho que "Las favoritas"), cards de alto mínimo generoso. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categorias
              .filter((c) => estadoDe(c) !== "Inactivo")
              .map((c, i) => (
                <m.button
                  key={c.id}
                  {...reveal(
                    (i % 3) * 0.06,
                    i % 2 === 0 ? 18 : 24,
                    0.25,
                    i % 3 === 0 ? -10 : i % 3 === 2 ? 10 : 0,
                    0.97,
                  )}
                  whileHover={{ y: -4, scale: 1.03, transition: { duration: 0.2, ease: "easeOut" } }}
                  whileTap={{ scale: 0.99, transition: { duration: 0.1 } }}
                  onClick={() => onCategoryNavigate(c.nombre)}
                  className="group min-h-[220px] md:min-h-[260px] bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg transition-shadow duration-200 cursor-pointer flex flex-col items-center justify-center gap-3 px-4 py-6"
                >
                  {/* Emoji de la categoría (columna emoji), también en las
                      originales: texto grande, el mismo tamaño de siempre. */}
                  {c.icono && (
                    <span
                      aria-hidden="true"
                      className="text-[96px] leading-none transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-hover:rotate-0"
                    >
                      {c.icono}
                    </span>
                  )}
                  <p
                    className="text-xl font-bold text-foreground text-center leading-snug"
                    style={{ fontFamily: SERIF }}
                  >
                    {c.nombre}
                  </p>
                </m.button>
              ))}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 3: Las favoritas de nuestros clientes ── */}
      <section className="bg-muted pt-10 md:pt-12 pb-16 md:pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          {/* Header row */}
          <m.div {...reveal(0, 14, 0.25)} className="flex flex-wrap items-center justify-between gap-3 mb-10">
            <h2
              className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground"
              style={{ fontFamily: SERIF }}
            >
              Las favoritas de nuestros clientes
            </h2>
            <button
              onClick={() => navigate("catalog")}
              {...precargar("catalog")}
              className="text-[#DC2626] font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all cursor-pointer shrink-0 max-md:min-h-11"
            >
              Ver todas <ArrowRight className="w-4 h-4" />
            </button>
          </m.div>

          {/* Cards — punto 2.2: en móvil pasan a grid de 1 columna (antes
              carrusel con `overflow-x-auto`, donde la última tarjeta quedaba
              cortada a 360 px). Escritorio sin cambios. */}
          <div
            className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4"
          >
            {(() => {
              const normalizar = (valor: string | undefined) =>
                (valor ?? "")
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .trim()
                  .replace(/^pizza\s+/, "");
              const favoritas = ["Pizza Cañón", "Pizza Hawaiana", "Pizza Jamón", "Pizza Maicitos"];
              const lista = productos ?? [];
              return favoritas.map((nombre, i) => {
                const objetivo = normalizar(nombre);
                const producto = lista.find((p) => {
                  const actual = normalizar(p.nombre);
                  return (
                    actual !== "" &&
                    objetivo !== "" &&
                    actual === objetivo
                  );
                });
                if (!producto) return null;
                const favorita = productoACatalogo(producto, categorias);
                // Un producto descontinuado no se muestra en ningún lugar del
                // menú público, tampoco acá.
                if (estadoDeProducto(favorita) === "Descontinuado") return null;
                // Stock FÍSICO total del producto (mismo criterio que
                // `limiteDeLinea`: sin tamaños); `undefined` = sin límite, no
                // se marca agotado. Una sola etiqueta de estado a la vez.
                const stock = limiteStockDe(producto) ?? producto.stockDisponible;
                const agotado = stock <= 0;
                const etiqueta = etiquetaEstadoMenu(
                  estadoDeProducto(favorita),
                  agotado,
                );
                const noDisponible = etiqueta === "no_disponible";
                // Precio atenuado cuando el cliente no puede pedirlo: estado
                // no disponible o sin stock ("Agotado"). La FOTO se atenúa solo
                // con "No disponible" (se ve inline en su className).
                const atenuada = etiqueta !== "disponible";
                return (
                  <m.div
                    key={producto.id}
                    initial={reduceMotion ? "visible" : "hidden"}
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={{
                      hidden: {
                        opacity: 0,
                        y: i % 2 === 0 ? 20 : 26,
                        scale: 0.97,
                      },
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: {
                          duration: 0.5,
                          delay: i * 0.09,
                          ease: REVEAL_EASE,
                        },
                      },
                    }}
                    whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.22, ease: "easeOut" } }}
                    whileTap={{ scale: 0.995, transition: { duration: 0.1 } }}
                    onClick={() => onOpenDetail(favorita)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Ver detalles de ${favorita.name}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenDetail(favorita);
                      }
                    }}
                    onPointerMove={reduceMotion ? undefined : inclinarTarjetaProducto}
                    onPointerLeave={reposarTarjetaProducto}
                    onPointerCancel={reposarTarjetaProducto}
                    className="favorite-card-frame group w-full md:w-auto bg-card rounded-[20px] overflow-hidden shadow-sm hover:shadow-2xl transition-shadow duration-200 ease-out cursor-pointer flex flex-col"
                  >
                    <div className="favorite-card-surface flex flex-col flex-1">
                      {/* Image */}
                      <div
                        className="relative h-52 bg-muted overflow-hidden"
                        onPointerMove={desplazarFotoProducto}
                        onPointerLeave={reposarFotoProducto}
                        onPointerCancel={reposarFotoProducto}
                      >
                        <m.img
                          src={getImageUrl(favorita.image)}
                          alt={favorita.name}
                          onError={onErrorImagen}
                          width={800}
                          height={600}
                          loading="lazy"
                          decoding="async"
                          variants={{
                            hidden: { clipPath: "inset(0 0 100% 0)" },
                            visible: {
                              clipPath: "inset(0 0 0% 0)",
                              transition: {
                                duration: 0.72,
                                delay: 0.08,
                                ease: REVEAL_EASE,
                              },
                            },
                          }}
                          className={`favorite-foto w-full h-full object-cover ${etiqueta === "no_disponible" ? "grayscale opacity-60" : ""}`}
                        />
                        {/* Estado del producto (arriba a la izquierda, 12 px)
                            y, debajo, la insignia "Favorita" de siempre. Una
                            sola etiqueta a la vez: si está agotado se oculta el
                            verde y se pinta el "Agotado" rojo en su lugar. */}
                        <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-2">
                          {etiqueta !== "agotado" && estadoDeProducto(favorita) !== "Disponible" && (
                            <EstadoMenuBadge estado={estadoDeProducto(favorita)} />
                          )}
                          {etiqueta === "agotado" && (
                            <AgotadoMenuBadge />
                          )}
                          <div className="flex items-center gap-1 bg-[#DC2626] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-md ring-1 ring-white/40">
                            <Star className="w-3 h-3 fill-white text-white" />
                            Favorita
                          </div>
                        </div>
                        {noDisponible && (
                          <NoDisponibleOverlay className="absolute inset-0 z-[5]" />
                        )}
                      </div>

                      {/* Body */}
                      <div className="p-5 flex flex-col flex-1">
                        <h3
                          className="text-foreground font-bold text-base mb-1.5 leading-snug"
                          style={{ fontFamily: SERIF }}
                        >
                          {favorita.name}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 flex-1 mb-4">
                          {favorita.description}
                        </p>

                        <div className="mt-auto space-y-3">
                          <div className="space-y-1 text-sm font-semibold" style={{ fontFamily: MONO }}>
                            {favorita.sizes.map((size) => {
                              const stockTamano = limiteStockDe(favorita, size.label);
                              const agotadoTamano = stockTamano === 0;
                              return (
                                <p
                                  key={size.label}
                                  className={agotadoTamano || atenuada ? "text-muted-foreground opacity-60" : "text-[#DC2626]"}
                                >
                                  {size.label} $ {size.price.toLocaleString("es-CO")} / porción
                                  {stockTamano !== undefined && (agotadoTamano ? " · Agotado" : ` · Quedan ${stockTamano} porciones`)}
                                </p>
                              );
                            })}
                          </div>
                          <PrimaryBtn
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenDetail(favorita);
                            }}
                            size="sm"
                            className="w-full max-md:min-h-11"
                          >
                            Ver detalle
                          </PrimaryBtn>
                        </div>
                      </div>
                    </div>
                  </m.div>
                );
              });
            })()}
          </div>
        </div>
      </section>

      {/* ── Nuestra Historia ── */}
      <section ref={historiaRef} className="bg-card py-16 md:py-24">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left — image with floating founder card */}
            <m.div
              initial={reduceMotion ? "visible" : "hidden"}
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5, ease: REVEAL_EASE },
                },
              }}
              className="relative"
            >
              <div className="rounded-[24px] overflow-hidden shadow-xl aspect-[4/3]">
                <m.img
                  src={imagenLocal}
                  alt="Interior de La Sirena Pizza — Medellín"
                  width={1200}
                  height={675}
                  loading="lazy"
                  decoding="async"
                  style={profundidadActiva ? { y: historiaFotoY, scale: historiaFotoEscala } : undefined}
                  variants={{
                    hidden: { clipPath: "inset(0 0 100% 0)" },
                    visible: {
                      clipPath: "inset(0 0 0% 0)",
                      transition: { duration: 0.85, ease: REVEAL_EASE },
                    },
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating founder card */}
              <m.div
                {...reveal(0.22, 8)}
                className="absolute bottom-5 left-5 bg-card rounded-2xl shadow-xl px-5 py-4 max-w-[220px]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full bg-[#DC2626] flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ fontFamily: SERIF }}
                  >
                    G
                  </div>
                  <div>
                    <p
                      className="text-[#DC2626] font-bold text-sm leading-tight"
                      style={{ fontFamily: SERIF }}
                    >
                      Gloria Inés Vargas
                    </p>
                    <p className="text-muted-foreground text-[11px] mt-0.5 leading-tight">
                      Fundadora · La Sirena Pizza 1994
                    </p>
                  </div>
                </div>
              </m.div>
            </m.div>

            {/* Right — text content */}
            <m.div
              style={profundidadActiva ? { y: historiaContenidoY } : undefined}
              className="flex flex-col gap-6"
            >
              {/* Badge */}
              <m.div {...reveal(0.06, 14)} className="inline-flex">
                <span className="px-4 py-1.5 bg-red-50 text-[#DC2626] text-sm font-semibold rounded-full border border-red-100">
                  Nuestra historia
                </span>
              </m.div>

              {/* Title */}
              <m.h2
                {...reveal(0.12, 20)}
                className="text-4xl md:text-5xl font-bold text-foreground leading-[1.1]"
                style={{ fontFamily: SERIF }}
              >
                30 años de pasión por la pizza artesanal
              </m.h2>

              {/* Body */}
              <m.p
                {...reveal(0.2, 16)}
                className="text-muted-foreground text-base md:text-lg leading-relaxed"
              >
                En 1994, Gloria Inés abrió La Sirena con una
                receta familiar y el sueño de compartir el mejor
                sabor con Medellín. Hoy, tres décadas después,
                seguimos horneando cada pizza con el mismo amor
                de siempre.
              </m.p>
              <m.p
                {...reveal(0.28, 16)}
                className="text-muted-foreground text-base md:text-lg leading-relaxed"
              >
                Masa elaborada a mano, ingredientes
                seleccionados y el secreto inconfesable de
                nuestra salsa artesanal. Eso es La Sirena.
              </m.p>

              {/* CTAs */}
              <m.div {...reveal(0.36, 14)} className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => navigate("catalog")}
                  {...precargar("catalog")}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#DC2626] text-white font-semibold rounded-xl hover:bg-red-700 active:scale-95 transition-all duration-200 shadow-md shadow-red-900/20 cursor-pointer text-sm"
                >
                  🍕 Pedir ahora
                </button>
                <button
                  onClick={() =>
                    toast.info("Llámanos: 604 234 5678")
                  }
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-card text-foreground font-semibold rounded-xl border border-border hover:bg-muted active:scale-95 transition-all duration-200 cursor-pointer text-sm"
                >
                  📞 Llamar
                </button>
              </m.div>
            </m.div>
          </div>
        </div>
      </section>

      {/* ── Por qué La Sirena ── */}
      <section className="bg-muted py-16">
        <div className="max-w-6xl mx-auto px-6">
          <m.h2
            {...reveal(0, 14)}
            className="text-3xl font-bold text-center mb-12 text-foreground"
            style={{ fontFamily: SERIF }}
          >
            ¿Por qué La Sirena?
          </m.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {[
              {
                icon: "🍕",
                title: "30 años de tradición",
                desc: "Desde 1994 haciendo las mejores pizzas de Medellín con la misma receta artesanal de siempre.",
              },
              {
                icon: "🌿",
                title: "Ingredientes frescos",
                desc: "Seleccionamos los mejores ingredientes locales cada día para garantizar calidad en cada mordida.",
              },
            ].map(({ icon, title, desc }, i) => (
              <m.div
                key={title}
                {...reveal(0.08 + i * 0.09, 16, 0.25, i === 0 ? -24 : 24, 0.98)}
                className="group bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow duration-200 text-center"
              >
                <div className="text-4xl mb-4 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-6 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-hover:rotate-0">
                  {icon}
                </div>
                <h3 className="text-lg font-bold mb-2 text-foreground">
                  {title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {desc}
                </p>
              </m.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
