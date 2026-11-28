import type React from "react";
import fondoBienvenidoLight from "@/assets/img/bienvenido-la-sirena-light.webp";
import { LanguageSelector } from "@/shared/components/LanguageSelector";
import { AUTH_SELECTOR_IDIOMA } from "@/shared/styles/authGlass";

/**
 * Fondo comun de TODO el flujo de autenticacion: login, registro y las
 * pantallas de recuperacion / cambio de contrasena (que son los pasos del modal
 * `ForgotPasswordModal`).
 *
 * Antes cada pantalla repetia el `div` raiz y las dos imagenes, asi que cambiar
 * el fondo obligaba a editar N sitios y era facil que se desincronizasen. Ahora
 * el fondo vive aqui una sola vez y cada pantalla aporta solo:
 *
 *   - `contentClassName`: como se coloca la tarjeta (`items-start`,
 *     `justify-center`, `lg:justify-end`, `px-4 py-6 lg:px-8`...).
 *   - `children`: la tarjeta.
 *   - `overlay`: contenido `fixed` que debe quedar por ENCIMA de la tarjeta.
 *
 * `contentClassName` DEBE llevar `lg:justify-end` en escritorio. El ancho de la
 * pizza se calcula sobre el hueco que deja la tarjeta a la izquierda
 * (`100vw - 584px`); si una pantalla centra la tarjeta, la pizza se le mete
 * debajo. Ese hueco esta calibrado para una tarjeta de hasta 512px (los 448px
 * de la de registro entran de sobra), asi que mientras la tarjeta no crezca de
 * 512px el margen sigue siendo correcto.
 *
 * `overlay` va como hermano del wrapper `z-20`, no dentro, a proposito: asi un
 * modal que se abre desde dentro de una pantalla de auth sigue resolviendo su
 * `fixed inset-0 z-50` contra la raiz y no queda atrapado en la pila de la
 * tarjeta. Si se metiera dentro, el modal tendria que subir su `z-index` por
 * encima de 50 para no quedar debajo.
 */
export function AuthLayout({
  children,
  overlay,
  contentClassName,
}: {
  children: React.ReactNode;
  overlay?: React.ReactNode;
  contentClassName: string;
}) {
  const RELLENO_CLARO =
    "linear-gradient(to bottom, #85613f 0%, #b57740 15%, #4c4a08 35%, #944a1a 50%, #391101 66%, #ca7331 85%, #2a0c01 100%)";
  return (
    <div className="relative min-h-screen bg-muted">
      {/* Fondo unico de TODA la pantalla: la escena de bienvenida (~2.5:1) con
          logo, titulo y beneficios a la IZQUIERDA y decoracion a la derecha.
          `cover` anclado a la izquierda llena el viewport sin recortar los
          textos de la foto. `RELLENO_CLARO` y el `bg-muted` del contenedor son
          el respaldo mientras la imagen carga. Se usa el .webp por peso.
          Es decorativo: sin `alt` ni `role="img"`. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 overflow-hidden"
        style={{ background: RELLENO_CLARO }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${fondoBienvenidoLight})`,
            backgroundSize: "cover",
            backgroundPosition: "left center",
            backgroundRepeat: "no-repeat",
          }}
        />
      </div>

      {/* Velo SOLO EN MOVIL Y TABLET (`lg:hidden`).

          A partir de 1024px la tarjeta se ancla a la derecha (`sm:justify-end`
          + `lg:justify-end`) y hay ancho de sobra para que convivan la tarjeta y
          la zona izquierda de la imagen, que es la que lleva logo y textos.

          Por debajo de eso la tarjeta ocupa casi todo el ancho y queda montada
          sobre la imagen completa, donde ademas puede recortarse la parte
          superior/inferior del texto segun la altura del viewport. El velo baja
          el contraste del fondo para que la tarjeta (opaca: `bg-card`) separe
          claramente del fondo en AMBOS temas.

          Va en negro para los dos temas a proposito: en claro un velo claro
          (p. ej. `bg-background/60`, blanco) acercaria el fondo al color de la
          tarjeta y empeoraria justo el separacion que se quiere lograr. En
          oscuro la imagen ya es oscura, pero el velo refuerza el contraste con
          los textos claros del formulario. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 bg-black/30 dark:bg-black/55 lg:hidden"
      />

      {/* Capa del contenido, la mas alta de las tres (fondo `z-0`, velo `z-10`,
          contenido `z-20`). El orden va explicito en el `z-index` y no depende
          del orden del DOM.

          `min-h-screen` y no `h-screen`: asi la pagina hace scroll normal cuando
          la tarjeta no cabe, en vez de recortarse, y el fondo la acompana
          porque las capas son `inset-0` del contenedor: al crecer este, crecen
          ellas y con `auto 100%` la foto vuelve a ocupar el alto completo. */}
      <LanguageSelector className={AUTH_SELECTOR_IDIOMA} />

      <div className={`relative z-20 flex min-h-screen max-md:pt-16! ${contentClassName}`}>
        {children}
      </div>

      {overlay}
    </div>
  );
}
