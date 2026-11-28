import { m } from "motion/react";
import { Logo } from "@/shared/components/Logo";
import { Mail, MapPin, Phone } from "lucide-react";
import { RUTA_LICENCIAS } from "@/features/legal/navigation";
import type { Screen } from "@/shared/utils/screen";
import { SERIF } from "@/shared/utils/fonts";
import { reveal } from "@/layout/hooks/useLandingAnimations";
import { DIRECCION_LOCAL, aperturaRecogidaTexto, cierreRecogidaTexto } from "@/shared/utils/storeInfo";
import { useIdioma } from "@/shared/i18n";
import { fechaDeHora } from "@/shared/utils/time";

export function Footer({ navigate }: { navigate: (s: Screen) => void }) {
  const { t, formatoFecha } = useIdioma();
  const hora = (texto: string) => formatoFecha(fechaDeHora(texto) ?? texto, { hour: "numeric", minute: "2-digit" });
  return (
    <footer
      style={{ backgroundColor: "#000000" }}
      className="py-12 rounded-t-3xl"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-8">
          {/* Brand */}
          <m.div {...reveal(0, 12, 0.15)} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Logo
                variante="blanco"
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
              {t("tienda.footerTexto")}
            </p>
          </m.div>
          {/* Contacto */}
          <m.div {...reveal(0.08, 12, 0.15)} className="flex flex-col gap-3">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">
              {t("tienda.contacto")}
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
          </m.div>
          {/* Horario */}
          <m.div {...reveal(0.16, 12, 0.15)} className="flex flex-col gap-3">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">
              {t("tienda.horario")}
            </h3>
            <div
              className="space-y-1.5 text-sm"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              <div className="flex justify-between">
                <span>{t("tienda.lunMie")}</span>
                <span
                  className="font-medium"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  {t("tienda.cerrado")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t("tienda.jueDom")}</span>
                <span className="font-semibold text-white">
                  {hora(aperturaRecogidaTexto)} – {hora(cierreRecogidaTexto)}
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
                {t("tienda.soloPresencial")}
              </p>
            </div>
          </m.div>
        </div>
        <m.div
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
            {t("tienda.derechos")}
          </p>
          <p
            className="text-xs"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {t("tienda.nit")}
          </p>
        </m.div>
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
            {t("tienda.licencias")}
          </a>
        </div>
      </div>
    </footer>
  );
}
