import { motion } from "motion/react";
import logoBlanco from "@/assets/img/logo-blanco.webp";
import { Mail, MapPin, Phone } from "lucide-react";
import { RUTA_LICENCIAS } from "@/features/legal/navigation";
import type { Screen } from "@/shared/utils/screen";
import { SERIF } from "@/shared/utils/fonts";
import { reveal } from "@/layout/hooks/useLandingAnimations";
import { DIRECCION_LOCAL, aperturaRecogidaTexto, cierreRecogidaTexto } from "@/shared/utils/storeInfo";

export function Footer({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <footer
      style={{ backgroundColor: "#000000" }}
      className="py-12 rounded-t-3xl"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-8">
          {/* Brand */}
          <motion.div {...reveal(0, 12, 0.15)} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <img
                src={logoBlanco}
                alt="Logo"
                className="w-11 h-11 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full object-contain shrink-0"
              />
              <span
                className="font-bold text-lg text-white"
                style={{ fontFamily: SERIF }}
              >
                La Sirena Pizza
              </span>
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Desde 1994 horneando las mejores pizzas
              artesanales de Medellín con receta familiar y
              amor auténtico.
            </p>
          </motion.div>
          {/* Contacto */}
          <motion.div {...reveal(0.08, 12, 0.15)} className="flex flex-col gap-3">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">
              Contacto
            </h3>
            <div
              className="space-y-2 text-sm"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0 text-red-400" />
                <span>604 234 5678</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0 text-red-400" />
                <span>info@lasirena.com.co</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{DIRECCION_LOCAL}</span>
              </div>
            </div>
          </motion.div>
          {/* Horario */}
          <motion.div {...reveal(0.16, 12, 0.15)} className="flex flex-col gap-3">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">
              Horario de atención
            </h3>
            <div
              className="space-y-1.5 text-sm"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              <div className="flex justify-between">
                <span>Lunes – Miércoles</span>
                <span
                  className="font-medium"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Cerrado
                </span>
              </div>
              <div className="flex justify-between">
                <span>Jueves – Domingo</span>
                <span className="font-semibold text-white">
                  {aperturaRecogidaTexto} – {cierreRecogidaTexto}
                </span>
              </div>
              <p
                className="text-xs mt-2 pt-2"
                style={{
                  borderTop:
                    "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                Solo pedidos presenciales en local
              </p>
            </div>
          </motion.div>
        </div>
        <motion.div
          {...reveal(0.24, 10, 0.15)}
          className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <p
            className="text-xs"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            © 2026 La Sirena Pizza · Medellín, Colombia ·
            Desde 1994
          </p>
          <p
            className="text-xs"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            NIT: 900.123.456-7 · Establecimiento de comercio
            registrado
          </p>
        </motion.div>
        <div className="mt-3 flex justify-center md:justify-start">
          <a
            href={RUTA_LICENCIAS}
            onClick={(e) => {
              // Ctrl/Cmd/Mayús + clic conserva el comportamiento del navegador.
              if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              navigate("licencias");
            }}
            className="inline-flex items-center max-md:min-h-11 rounded-sm text-xs text-white/55 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Licencias y reconocimientos
          </a>
        </div>
      </div>
    </footer>
  );
}
