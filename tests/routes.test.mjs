import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rmSync, writeFileSync } from "node:fs";

// Compila la tabla de rutas con esbuild (mismo patrón que los otros tests).
// React y el router quedan fuera del paquete, así que el resultado se importa
// desde un archivo temporal dentro de tests/ para que Node los resuelva.
const requireVite = createRequire(import.meta.resolve("vite"));
const { build } = requireVite("esbuild");
const compilado = await build({
  entryPoints: [fileURLToPath(new URL("../src/AppRoutes.tsx", import.meta.url))],
  alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  jsx: "automatic",
  external: ["react", "react/jsx-runtime", "react-router"],
});
const temporal = fileURLToPath(new URL("./.rutas-compiladas.mjs", import.meta.url));
writeFileSync(temporal, compilado.outputFiles[0].text);
const { RUTAS, leerRuta, rutaDe } = await import(pathToFileURL(temporal));
rmSync(temporal);

test("cada ruta sin parámetros vuelve a una pantalla con esa misma URL", () => {
  for (const [screen, patron] of Object.entries(RUTAS)) {
    if (patron.includes(":id")) continue;
    assert.deepEqual(leerRuta(patron), { screen, id: undefined }, patron);
  }
});

test("no hay dos pantallas con la misma URL", () => {
  const patrones = Object.values(RUTAS);
  assert.equal(new Set(patrones).size, patrones.length);
});

test("las rutas de detalle llevan el id y las fijas ganan", () => {
  assert.equal(rutaDe("product-detail", 7), "/menu/7");
  assert.equal(rutaDe("recepcion-compra", "OC-001"), "/admin/purchase-orders/OC-001/reception");
  assert.deepEqual(leerRuta("/admin/purchase-orders/OC-001"), { screen: "orden-detalle", id: "OC-001" });
  assert.equal(leerRuta("/admin/purchase-orders/new").screen, "nueva-orden-compra");
});

test("sin id, una pantalla de detalle cae a su listado", () => {
  assert.equal(rutaDe("product-detail"), "/menu");
  assert.equal(rutaDe("orden-detalle", null), "/admin/purchase-orders");
  assert.equal(rutaDe("recepcion-compra"), "/admin/purchase-orders");
});

test("la dirección anterior de licencias sigue funcionando y lo desconocido no", () => {
  assert.equal(leerRuta("/licencias").screen, "licencias");
  assert.equal(leerRuta("/licencias/").screen, "licencias");
  assert.equal(leerRuta("/no-existe"), null);
});
