// Genera los avisos legales de terceros y el inventario de dependencias.
//
//   node scripts/legal/generar-avisos.mjs [ruta-del-backend]
//
// Entradas: package-lock.json y node_modules/ del frontend y del backend
// (por defecto ../sivpro-backend, con `npm ci` hecho en ambos) y los textos de
// scripts/legal/upstream/ para paquetes que npm publica sin archivo de licencia.
// Salidas:  public/legal/THIRD-PARTY-NOTICES.txt
//           docs/legal/inventario-dependencias.csv
// Los textos se copian tal cual: no se traducen ni se resumen.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(aqui, "../..");
const backend = path.resolve(frontend, process.argv[2] ?? "../sivpro-backend");

// Dependencias de desarrollo cuyo código SÍ termina en el build publicado
// (service worker, registro de la PWA, CSS base y utilidades de Vite).
const EMITIDOS_EN_EL_BUILD = [
  "workbox-core", "workbox-precaching", "workbox-routing", "workbox-strategies",
  "workbox-expiration", "workbox-cacheable-response", "idb",
  "tailwindcss", "vite", "vite-plugin-pwa",
];

// Textos tomados del repositorio oficial (rama principal) porque el paquete de
// npm no los trae.
const UPSTREAM = [
  [/^@radix-ui\//, "radix-ui", "https://github.com/radix-ui/primitives/blob/main/LICENSE"],
  [/^input-otp$/, "input-otp", "https://github.com/guilhermerodz/input-otp/blob/master/LICENSE"],
  [/^react-resizable-panels$/, "react-resizable-panels", "https://github.com/bvaughn/react-resizable-panels/blob/main/LICENSE.md"],
  [/^embla-carousel(-react|-reactive-utils)?$/, "embla-carousel", "https://github.com/davidjerleke/embla-carousel/blob/master/LICENSE"],
  [/^react-remove-scroll-bar$/, "react-remove-scroll-bar", "https://github.com/theKashey/react-remove-scroll-bar/blob/master/LICENSE"],
  [/^saxes$/, "saxes", "https://github.com/lddubeau/saxes/blob/master/LICENSE"],
  [/^victory-vendor$/, "victory-vendor", "https://github.com/FormidableLabs/victory/blob/main/LICENSE.txt"],
];

// El texto completo (con aviso de autoría) está en el README del paquete.
const LICENCIA_EN_README = ["isarray", "agent-base", "https-proxy-agent", "pg-types", "pgpass"];

// Observaciones que dejan un componente como "por verificar".
const OBSERVACIONES = {
  buffers: "No declara licencia en package.json, README ni archivo propio; no se localizó un archivo LICENSE en su repositorio. Licencia PENDIENTE DE VERIFICAR.",
  binary: "Declara MIT, pero no publica el texto de la licencia ni el aviso de autoría. Texto PENDIENTE DE VERIFICAR.",
  chainsaw: "Declara MIT/X11, pero no publica el texto de la licencia ni el aviso de autoría. Texto PENDIENTE DE VERIFICAR.",
  "victory-vendor": "El paquete no incluye su propia licencia; la copiada es la del repositorio de origen. Aviso por contrastar (las de las bibliotecas d3 incorporadas sí vienen en el paquete).",
};

const leer = (f) => fs.readFileSync(f, "utf8").replace(/^﻿/, "").replace(/\r\n?/g, "\n").trim();
const orden = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function archivosDeLicencia(dir, base = dir) {
  const hallados = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules") hallados.push(...archivosDeLicencia(ruta, base));
    } else if (/^(licen[sc]e|copying|notice)([-._].*)?$/i.test(e.name) && !/\.([cm]?[jt]s|json|map)$/i.test(e.name)) {
      hallados.push({ fuente: path.relative(base, ruta).replace(/\\/g, "/"), texto: leer(ruta) });
    }
  }
  return hallados.sort((a, b) => orden(a.fuente, b.fuente));
}

function seccionReadme(dir) {
  const readme = fs.readdirSync(dir).find((f) => /^readme/i.test(f));
  if (!readme) return null;
  const lineas = leer(path.join(dir, readme)).split("\n");
  const inicio = lineas.findIndex((l) => /^(#+\s*)?license\s*$/i.test(l));
  if (inicio < 0) return null;
  const texto = lineas.slice(inicio).filter((l) => !/^\[[^\]]+\]:\s/.test(l)).join("\n").trim();
  return /copyright/i.test(texto) ? { fuente: `${readme} (sección de licencia)`, texto } : null;
}

function inventariar(raiz, repo) {
  const lock = JSON.parse(leer(path.join(raiz, "package-lock.json")));
  const pkg = JSON.parse(leer(path.join(raiz, "package.json")));
  const directas = new Set(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }));
  return Object.entries(lock.packages)
    .filter(([ruta]) => ruta)
    .map(([ruta, info]) => {
      const nombre = ruta.split("node_modules/").pop();
      const dir = path.join(raiz, ruta);
      const instalado = fs.existsSync(path.join(dir, "package.json"));
      const meta = instalado ? JSON.parse(leer(path.join(dir, "package.json"))) : {};
      const desarrollo = Boolean(info.dev || info.devOptional);
      if (!instalado && !desarrollo) {
        throw new Error(`${repo}: falta instalar ${ruta}. Ejecuta "npm ci" antes de generar los avisos.`);
      }
      if (instalado && meta.version !== info.version) {
        throw new Error(`${repo}: ${ruta} instalado ${meta.version} y en el lockfile ${info.version}. Ejecuta "npm ci".`);
      }
      const declarada =
        info.license ??
        (typeof meta.license === "string" ? meta.license : meta.license?.type) ??
        meta.licenses?.map((l) => l.type).join(" OR ");

      const textos = instalado ? archivosDeLicencia(dir) : [];
      let origen = textos.length ? "archivo del paquete" : "no disponible";
      const propios = textos.some((t) => !t.fuente.includes("/"));
      if (!propios && instalado) {
        const upstream = UPSTREAM.find(([patron]) => patron.test(nombre));
        const readme = LICENCIA_EN_README.includes(nombre) ? seccionReadme(dir) : null;
        if (upstream) {
          textos.unshift({ fuente: upstream[2], texto: leer(path.join(aqui, "upstream", `${upstream[1]}.txt`)) });
          origen = "repositorio oficial";
        } else if (readme) {
          textos.unshift(readme);
          origen = "README del paquete";
        }
      }
      if (!instalado) origen = "no instalado en esta plataforma";

      return {
        repo, nombre, version: info.version, licencia: declarada ?? "SIN DECLARAR", textos, origen,
        ambito: desarrollo ? "desarrollo" : "producción",
        directa: ruta === `node_modules/${nombre}` && directas.has(nombre),
        opcional: Boolean(info.optional || info.devOptional),
        observacion: OBSERVACIONES[nombre] ?? "",
      };
    })
    .sort((a, b) => orden(a.nombre, b.nombre) || orden(a.version, b.version));
}

if (!fs.existsSync(path.join(backend, "package-lock.json"))) {
  throw new Error(`No se encontró el backend en ${backend}. Pásalo como argumento.`);
}
const web = inventariar(frontend, "frontend");
const api = inventariar(backend, "backend");

const emitido = (p) => p.repo === "frontend" && p.ambito === "desarrollo" && EMITIDOS_EN_EL_BUILD.includes(p.nombre);
const destino = (p) => {
  if (p.ambito === "desarrollo") return emitido(p) ? "incluido en el build" : "solo desarrollo";
  return p.repo === "backend" ? "servidor" : "navegador (dependencia de producción)";
};

// ── Inventario completo (CSV) ──
const celda = (v) => `"${String(v).replace(/"/g, '""')}"`;
const csv = [
  ["repositorio", "paquete", "version", "licencia_declarada", "ambito", "directa", "opcional", "destino", "texto_de_licencia", "observacion"],
  ...[...web, ...api].map((p) => [
    p.repo, p.nombre, p.version, p.licencia, p.ambito, p.directa ? "sí" : "no",
    p.opcional ? "sí" : "no", destino(p), p.origen, p.observacion,
  ]),
].map((fila) => fila.map(celda).join(",")).join("\n");

// ── Avisos (solo lo que se distribuye o se ejecuta en producción) ──
const REGLA = "=".repeat(78);
const SUBREGLA = "-".repeat(78);
const titulo = (t) => `${REGLA}\n${t}\n${REGLA}\n`;
const etiqueta = (p) => `${p.nombre}@${p.version} — ${p.licencia}`;

/** Agrupa los paquetes cuyos textos son idénticos; cada texto se imprime entero. */
function bloques(paquetes) {
  const grupos = new Map();
  for (const p of paquetes.filter((x) => x.textos.length)) {
    const clave = p.textos.map((t) => t.texto).join("\u0000");
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(p);
  }
  return [...grupos.values()].map((grupo) => {
    const nombres = [...new Set(grupo.map((p) => {
      const fuente = p.origen === "repositorio oficial" ? `  [texto tomado de ${p.textos[0].fuente}]` : "";
      return etiqueta(p) + fuente;
    }))];
    const textos = grupo[0].textos.map((t) =>
      `${/^https:/.test(t.fuente) ? "" : `--- ${t.fuente} ---\n\n`}${t.texto}`);
    return `${SUBREGLA}\n${nombres.join("\n")}\n${SUBREGLA}\n\n${textos.join("\n\n")}\n`;
  }).join("\n");
}

const navegador = web.filter((p) => p.ambito === "producción");
const enBuild = web.filter(emitido);
const faltantes = EMITIDOS_EN_EL_BUILD.filter((n) => !enBuild.some((p) => p.nombre === n));
if (faltantes.length) throw new Error(`Revisa EMITIDOS_EN_EL_BUILD: no están ${faltantes.join(", ")}`);

const sinTexto = [...navegador, ...enBuild, ...api.filter((p) => p.ambito === "producción")]
  .filter((p) => !p.textos.length || p.observacion);

const manual = (archivo) => leer(path.join(aqui, "upstream", archivo));

const avisos = `${titulo("S.I.V.PRO — AVISOS LEGALES DE TERCEROS (THIRD-PARTY NOTICES)")}
Este archivo reúne las licencias y avisos de autoría de componentes de terceros.
Los textos se reproducen en su idioma original, sin traducir ni resumir. No
concede ni modifica ninguna licencia sobre el código propio de S.I.V.PRO.

Archivo generado con scripts/legal/generar-avisos.mjs a partir de los
package-lock.json del frontend y del backend. No editar a mano.

ALCANCE
  A. Dependencias de producción del frontend. Se listan todas, aunque algunas
     puedan no quedar incluidas en el paquete final que recibe el navegador.
  B. Herramientas cuyo código queda incluido en los archivos publicados.
  C. Componentes incorporados al código fuente.
  D. Tipografías.
  E. Dependencias del servidor (backend). No se distribuyen al navegador.
  F. Elementos pendientes de verificación.
Las herramientas usadas solo durante el desarrollo no se distribuyen y no se
reproducen aquí.

Los textos marcados "texto tomado de <URL>" provienen de la rama principal del
repositorio oficial, porque el paquete publicado en npm no los incluye.

${titulo("A. FRONTEND — DEPENDENCIAS DE PRODUCCIÓN")}
${bloques(navegador)}
${titulo("B. FRONTEND — CÓDIGO DE HERRAMIENTAS INCLUIDO EN EL BUILD")}
${bloques(enBuild)}
${titulo("C. COMPONENTES INCORPORADOS: shadcn/ui")}
Fuente: https://github.com/shadcn-ui/ui/blob/main/LICENSE.md

${manual("shadcn-ui.txt")}

${titulo("D. TIPOGRAFÍAS (servidas por Google Fonts)")}
${SUBREGLA}
Montserrat — https://github.com/google/fonts/blob/main/ofl/montserrat/OFL.txt
${SUBREGLA}

${manual("montserrat.txt")}

${SUBREGLA}
Poppins — https://github.com/google/fonts/blob/main/ofl/poppins/OFL.txt
${SUBREGLA}

${manual("poppins.txt")}

${titulo("E. BACKEND — DEPENDENCIAS DEL SERVIDOR (no se distribuyen al navegador)")}
${bloques(api.filter((p) => p.ambito === "producción"))}
${titulo("F. PENDIENTE DE VERIFICACIÓN")}
${sinTexto.map((p) => `- [${p.repo}] ${etiqueta(p)}\n  ${p.observacion || "No se localizó el texto de su licencia."}`).join("\n")}
- Fotografías e imágenes del aplicativo: no se ha documentado el origen, autor ni
  licencia de cada archivo de src/assets/img/ y public/. Las fotografías tomadas
  de Unsplash se rigen por https://unsplash.com/license.
- Logotipos y marcas de terceros (por ejemplo, de bebidas): pertenecen a sus
  titulares; no se ha documentado autorización específica de uso.
`;

const salidas = [
  [path.join(frontend, "public/legal/THIRD-PARTY-NOTICES.txt"), avisos],
  [path.join(frontend, "docs/legal/inventario-dependencias.csv"), `﻿${csv}\n`],
];
for (const [archivo, contenido] of salidas) {
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, contenido);
}

console.log(`Inventario: frontend ${web.length}, backend ${api.length}, total ${web.length + api.length}`);
console.log(`Avisos: navegador ${navegador.length}, en build ${enBuild.length}, servidor ${api.filter((p) => p.ambito === "producción").length}`);
console.log(`Pendientes: ${sinTexto.map((p) => `${p.repo}:${p.nombre}`).join(", ")}`);
