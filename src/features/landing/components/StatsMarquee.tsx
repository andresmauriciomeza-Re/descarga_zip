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
    <div className="flex flex-col items-center gap-2 text-center w-52 shrink-0">
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
    <>
      {/* Diseño original estático: solo visible con prefers-reduced-motion */}
      <div className="hidden motion-reduce:block">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            {DATOS.map((d, i) => (
              <div
                key={d.label}
                className={`flex flex-col items-center gap-2 text-center ${
                  i === 2 ? "col-span-2 md:col-span-1" : ""
                }`}
              >
                <span className="text-4xl leading-none">{d.emoji}</span>
                <p
                  className="text-3xl md:text-4xl font-bold text-white mt-1 leading-none"
                  style={{ fontFamily: MONO }}
                >
                  {d.value}
                </p>
                <p className="text-white/75 text-sm font-medium">{d.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Letrero en movimiento: de derecha a izquierda, continuo */}
      <div className="stats-marquee-mask motion-reduce:hidden">
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
    </>
  );
}
