import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const { build } = createRequire(import.meta.resolve("vite"))("esbuild");
const compilado = await build({
  entryPoints: [fileURLToPath(new URL("../src/shared/utils/catalog.ts", import.meta.url))],
  bundle: true, write: false, format: "esm", platform: "node",
  plugins: [{
    name: "dependencias-catalogo",
    setup(build) {
      build.onResolve({ filter: /^@\// }, args => ({ path: args.path, namespace: "prueba" }));
      build.onLoad({ filter: /.*/, namespace: "prueba" }, args => ({
        contents: args.path.includes("/assets/")
          ? 'export default "imagen";'
          : 'export const getImageUrl = x => x, IMAGEN_DEFAULT = "", imagenEnApi = () => "", mapearProductoApi = x => x;',
        loader: "js",
      }));
    },
  }],
});
const { productoACatalogo, limiteStockDe } = await import(
  `data:text/javascript;base64,${Buffer.from(compilado.outputFiles[0].text).toString("base64")}`
);

test("el catálogo conserva stock de unidades y porciones por tamaño", () => {
  const bebida = productoACatalogo({ id: "3", idCategoria: "3", nombre: "Bebida", estado: "Disponible", precioUnitario: 1000, stockApi: 8 }, [{ id: "3", nombre: "Bebidas" }]);
  assert.equal(limiteStockDe(bebida), 8);
  const pizza = productoACatalogo({ id: "1", idCategoria: "1", nombre: "Pizza", estado: "Disponible", precioUnitario: 1000, precioGrande: 2000, stockMediana: 12, stockGrande: 9 }, [{ id: "1", nombre: "Pizzas" }]);
  assert.equal(limiteStockDe(pizza, "Mediana"), 12);
  assert.equal(limiteStockDe(pizza, "Grande"), 9);
  assert.equal(limiteStockDe({ ...bebida, stockApi: 0 }), 0);
});
