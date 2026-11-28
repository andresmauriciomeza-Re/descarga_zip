import type React from "react";
import fondoBienvenidoLight from "@/assets/img/bienvenido-la-sirena-light.webp";
import fondoBienvenidoDark from "@/assets/img/bienvenido-la-sirena-dark.webp";

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
  darkMode,
}: {
  children: React.ReactNode;
  overlay?: React.ReactNode;
  contentClassName: string;
  darkMode: boolean;
}) {
  const RELLENO_CLARO =
    "linear-gradient(to bottom, #85613f 0%, #b57740 15%, #4c4a08 35%, #944a1a 50%, #391101 66%, #ca7331 85%, #2a0c01 100%)";
  const RELLENO_OSCURO =
    "linear-gradient(to bottom, #1e120a 0%, #482710 15%, #17120a 30%, #391503 50%, #0a0200 66%, #401b08 85%, #000000 100%)";
  return (
    <div className="relative min-h-screen bg-muted">
      {/* Fondo unico de TODA la pantalla, con IMAGEN POR TEMA.

          `bienvenido-la-sirena-light.webp` (1994x789) y
          `bienvenido-la-sirena-dark.webp` (1993x789) son las dos versiones de la
          misma escena de bienvenida EXTENDIDA (~2.5:1): logo de Pizzeria La
          Sirena, titulo, subtitulo y tres beneficios a la IZQUIERDA; el lado
          derecho (horno y cocina) es decoracion pura y es donde se apoya la
          tarjeta. Su ratio ya cubre holgadamente cualquier escritorio, asi que
          NO hace falta relleno lateral, copia desenfocada ni mascara de
          fundido: una sola capa `cover` basta.

          Se usan los .webp (252 KB y 222 KB) y no los .png originales (2.42 MB
          y 2.20 MB) porque el peso al vuelo se reduce ~90%. Los .png siguen en
          `src/assets/img/` como respaldo, pero NO se importan, asi que no
          entran al build.

          POR QUE DOS CAPAS Y NO UN `src={darkMode ? a : b}`:
          con un solo `<img>` el cambio de tema obliga a descargar la imagen nueva
          en ese preciso instante, y hasta que llega se ve el `bg-muted` del
          contenedor (fondo "vacio"). Aqui las DOS capas estan siempre en el DOM,
          asi que el navegador las precarga al montar la pantalla. El cambio de
          tema es entonces solo un `opacity`, sin peticion nueva y sin parpadeo.

          `transition-opacity duration-500` da el fundido. `darkMode` llega por
          prop desde el `useState` de App, asi que al pulsar la luna la capa
          visible se cruza al instante y sin recargar la pagina.

          CADA CAPA ES UN SOLO DIV HIJO con la imagen del tema:

          - `background-size: cover` + `background-position: left center` +
            `background-repeat: no-repeat` llenan TODO el viewport manteniendo
            el ratio natural. Gracias al anclaje a la IZQUIERDA, el logo, el
            titulo, el subtitulo y los tres beneficios (que viven en esa banda
            izquierda de la foto) SIEMPRE se ven completos y nunca se recortan
            por ese lado. Cuando la ventana es mas ancha que ~2.5:1 lo que se
            recorta es solo decoracion por la derecha; `overflow-hidden` del
            exterior recorta ese desbordamiento.

          - El div exterior lleva `background: RELLENO_*`, un degradado VERTICAL
            cuyos paradas son los tonos muestreados en el borde derecho de cada
            imagen. Hoy es SOLO un respaldo por si la imagen tarda en cargar.

          El `bg-muted` del contenedor se conserva como red de seguridad para el
          breve instante en que aun no ha llegado ninguna de las dos.

          Sin `alt` ni `role="img"`: es decorativo y anunciarlo a un lector de
          pantalla es ruido. No se pierde nada porque TODO el texto de los
          formularios vive dentro de las tarjetas, que si se anuncian. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 z-0 overflow-hidden transition-opacity duration-500 ${darkMode ? "opacity-0" : "opacity-100"
          }`}
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
      <div
        aria-hidden="true"
        className={`absolute inset-0 z-0 overflow-hidden transition-opacity duration-500 ${darkMode ? "opacity-100" : "opacity-0"
          }`}
        style={{ background: RELLENO_OSCURO }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${fondoBienvenidoDark})`,
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
      <div className={`relative z-20 flex min-h-screen ${contentClassName}`}>
        {children}
      </div>

      {overlay}
    </div>
  );
}
