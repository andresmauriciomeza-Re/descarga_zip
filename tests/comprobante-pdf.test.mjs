import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const { build } = createRequire(import.meta.resolve("vite"))("esbuild");
async function importar(ruta) {
  const compilado = await build({ entryPoints: [fileURLToPath(new URL(ruta, import.meta.url))], bundle: true, write: false, format: "esm", platform: "node" });
  return import(`data:text/javascript;base64,${Buffer.from(compilado.outputFiles[0].text).toString("base64")}`);
}
const { validarArchivo, ARCHIVO_MAX_BYTES } = await importar("../src/shared/utils/validarArchivo.ts");
const { esComprobantePdf } = await importar("../src/shared/utils/comprobante.ts");

test("valida PDF y límite de tamaño para comprobantes", () => {
  const pdf = { name: "pago.pdf", type: "application/pdf", size: 100 };
  assert.doesNotThrow(() => validarArchivo(pdf, true));
  assert.throws(() => validarArchivo(pdf), /solo se permiten en comprobantes/);
  assert.throws(() => validarArchivo({ ...pdf, size: ARCHIVO_MAX_BYTES + 1 }, true), /5 MB/);
  assert.throws(() => validarArchivo({ ...pdf, type: "application/x-msdownload" }, true), /no permitido/);
});

test("identifica PDF incluso si la URL tiene parámetros", () => {
  assert.equal(esComprobantePdf("https://res.cloudinary.com/demo/raw/upload/pago.pdf?x=1"), true);
  assert.equal(esComprobantePdf("https://res.cloudinary.com/demo/image/upload/pago.jpg"), false);
});
