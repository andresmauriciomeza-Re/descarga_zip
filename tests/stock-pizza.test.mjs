import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const requireVite = createRequire(import.meta.resolve("vite"));
const { build } = requireVite("esbuild");
const compilado = await build({
  entryPoints: [fileURLToPath(new URL("../src/shared/utils/stockPizza.ts", import.meta.url))],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { disponiblePizza } = await import(
  `data:text/javascript;base64,${Buffer.from(compilado.outputFiles[0].text).toString("base64")}`
);

test("una mediana de 24 partes deja 7 medianas o 5 grandes", () => {
  const carrito = [{ tamano: "Mediana", cantidad: 1 }];
  assert.equal(disponiblePizza(24, "Mediana", carrito), 7);
  assert.equal(disponiblePizza(24, "Grande", carrito), 5);
});

test("el stock compartido resta ambos tamaños y no baja de cero", () => {
  const carrito = [{ tamano: "Mediana", cantidad: 2 }, { tamano: "Grande", cantidad: 3 }];
  assert.equal(disponiblePizza(24, "Mediana", carrito), 2);
  assert.equal(disponiblePizza(24, "Grande", carrito), 1);
  assert.equal(disponiblePizza(3, "Grande", []), 0);
  assert.equal(disponiblePizza(4, "Mediana", carrito), 0);
});

test("al editar una línea se cuentan las demás, no la propia", () => {
  const otras = [{ tamano: "Grande", cantidad: 3 }];
  assert.equal(disponiblePizza(24, "Mediana", otras), 4);
  assert.equal(disponiblePizza(24, "Grande", [{ tamano: "Mediana", cantidad: 4 }]), 3);
});
