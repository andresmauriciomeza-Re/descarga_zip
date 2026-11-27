const MONO = "var(--font-texto)";

interface Dato {
  emoji: string;
  value: string;
  label: string;
}

const DATOS: Dato[] = [
  { emoji: "📦", value: "+5.200", label: "Ventas entregadas" },
  { emoji: "⚡", value: "25 min", label: "Entrega promedio" },
  { emoji: "🏆", value: "30 años", label: "De tradición" },
];

function Estadistica({ emoji, value, label }: Dato) {
  return (
    /* Ancho por breakpoint (punto B2): w-40 en móvil, w-52 en md y w-56
       en lg; cada media en animations.css ajusta la duración para que la
       velocidad se mantenga en ~50 px/s en todos los anchos. */
    <div className="flex flex-col items-center gap-2 text-center w-40 md:w-52 lg:w-56 shrink-0">
      <span className="text-4xl leading-none">{emoji}</span>
      <p
        className="text-3xl md:text-4xl font-bold text-white mt-1 leading-none"
        style={{ fontFamily: MONO }}
      >
        {value}
      </p>
      <p className="text-white/75 text-sm font-medium">{label}</p>
    </div>
  );
}

function Grupo({ oculto = false }: { oculto?: boolean }) {
  return (
    <div className="flex shrink-0" aria-hidden={oculto || undefined}>
      {DATOS.map((d) => (
        <Estadistica key={d.label} {...d} />
      ))}
    </div>
  );
}

export default function StatsMarquee() {
  return (
    /* Letrero en movimiento: de derecha a izquierda, continuo. El diseño
       estático que existía solo para prefers-reduced-motion se unificó aquí
       (punto B2): la pausa al pasar el cursor/teclado sigue disponible y es
       el control de accesibilidad del movimiento. */
    <div className="stats-marquee-mask">
      <div className="stats-marquee-track">
        {/* Primer conjunto: el primer grupo queda accesible para lectores
            de pantalla; el resto del conjunto es decorativo. */}
        <Grupo />
        {[...Array(4)].map((_, i) => (
          <Grupo key={`c1-g${i + 2}`} oculto />
        ))}
        {/* Segundo conjunto: réplica visual exacta del primero, toda
            aria-hidden, para que el bucle a -50% empalme sin saltos. */}
        {[...Array(5)].map((_, i) => (
          <Grupo key={`c2-g${i + 1}`} oculto />
        ))}
      </div>
    </div>
  );
}
