import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import comun from "./comun";
import menu from "./menu";
import dashboard from "./dashboard";
import tienda from "./tienda";
import auth from "./auth";

export type Idioma = "es" | "en";
export type Variables = Record<string, string | number>;

/** Para traducir un módulo nuevo: crear `[modulo].ts` y sumarlo a esta lista. */
const AREAS = [comun, menu, dashboard, tienda, auth];

export const diccionarios: Record<Idioma, Record<string, string>> = {
  es: Object.assign({}, ...AREAS.map((a) => a.es)),
  en: Object.assign({}, ...AREAS.map((a) => a.en)),
};

/** Frase en español → clave, para los textos que viven en datos o en el estado. */
const CLAVE_DE_FRASE = new Map(Object.entries(diccionarios.es).map(([clave, frase]) => [frase, clave]));

const CLAVE = "sivpro.idioma.v1";
const LOCALES: Record<Idioma, string> = { es: "es-CO", en: "en-US" };

function idiomaGuardado(): Idioma {
  try {
    return localStorage.getItem(CLAVE) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

export function crearApi(idioma: Idioma, setIdioma: (i: Idioma) => void) {
  const locale = LOCALES[idioma];
  /** Texto por clave, con variables `{nombre}`. Sin traducción cae al español. */
  const t = (clave: string, variables?: Variables): string => {
    const texto = diccionarios[idioma][clave] ?? diccionarios.es[clave] ?? clave;
    if (!variables) return texto;
    return texto.replace(/\{(\w+)\}/g, (todo, nombre) => String(variables[nombre] ?? todo));
  };
  return {
    idioma,
    setIdioma,
    t,
    /** SOLO para mostrar: traduce una frase que la app guarda en español. Lo que
        no esté en los diccionarios (datos, mensajes del backend) sale igual. */
    tf(frase: string): string {
      if (idioma === "es") return frase;
      const clave = CLAVE_DE_FRASE.get(frase);
      return clave ? t(clave) : frase;
    },
    /** Para pintar un error: traduce SOLO el aviso de conexión que genera la web
        (shared/services/api.ts). Cualquier otro mensaje, como los del backend,
        sale tal como llega. */
    errorVisible(mensaje: string): string {
      return mensaje === diccionarios.es["auth.v.sinConexion"] ? t("auth.v.sinConexion") : mensaje;
    },
    /** La moneda es siempre COP; solo cambia el formato de los números. */
    formatoMoneda(valor: number): string {
      if (idioma === "es") return `$${valor.toLocaleString(locale)}`;
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "COP",
        currencyDisplay: "narrowSymbol",
        maximumFractionDigits: 0,
      }).format(valor);
    },
    formatoFecha(fecha: Date | string, opciones?: Intl.DateTimeFormatOptions): string {
      // "AAAA-MM-DD" a secas se lee como UTC y correría la fecha un día.
      const d = typeof fecha === "string"
        ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `${fecha}T00:00:00` : fecha)
        : fecha;
      if (Number.isNaN(d.getTime())) return String(fecha);
      // Solo con hora y minutos, toLocaleDateString agregaría también la fecha.
      const soloHora = opciones?.hour && !opciones.day && !opciones.month && !opciones.year && !opciones.weekday;
      return soloHora ? d.toLocaleTimeString(locale, opciones) : d.toLocaleDateString(locale, opciones);
    },
  };
}

export type ApiIdioma = ReturnType<typeof crearApi>;

// Sin provider (p. ej. en las pruebas) todo se muestra en español.
const Contexto = createContext<ApiIdioma>(crearApi("es", () => {}));

export function IdiomaProvider({ children }: { children: ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>(idiomaGuardado);

  useEffect(() => {
    document.documentElement.lang = idioma;
    try {
      localStorage.setItem(CLAVE, idioma);
    } catch {
      // almacenamiento no disponible (modo privado, cuota llena, etc.)
    }
  }, [idioma]);

  const api = useMemo(() => crearApi(idioma, setIdioma), [idioma]);
  return <Contexto.Provider value={api}>{children}</Contexto.Provider>;
}

export const useIdioma = () => useContext(Contexto);
