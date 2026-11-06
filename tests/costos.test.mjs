import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const requireVite = createRequire(import.meta.resolve("vite"));
const { build } = requireVite("esbuild");
const compilado = await build({
  entryPoints: [fileURLToPath(new URL("../src/shared/utils/costos.ts", import.meta.url))],
  alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { calcularCostoProducto, precioRecomendadoPorPorcion, recomendadoGrandeIgualado } =
  await import(`data:text/javascript;base64,${Buffer.from(compilado.outputFiles[0].text).toString("base64")}`);

const ficha = {
  version: 1,
  idReceta: "1",
  tiempoPreparacion: 60,
  porciones: 8,
  porcionesPorTamano: [
    { tamano: "Mediana", porciones: 8 },
    { tamano: "Grande", porciones: 6 },
  ],
  insumos: [{ insumoId: "1", nombre: "Harina", cantidad: 1, unidad: "kg" }],
  pasos: [],
  fechaInicio: "",
  fechaFin: null,
};
const parametros = {
  id_parametro: 1,
  mano_obra_hora: 4000,
  tarifa_gas_m3: 2000,
  consumo_gas_m3_hora: 1,
  margen_ganancia: 40,
  fecha_actualizacion: "",
};
const catalogo = (costoUnitario) => [
  { id: "1", nombre: "Harina", unidadMedida: "kg", costoUnitario },
];

test("recomendado usa el costo de pizza completa dividido entre 8 y 6 con margen", () => {
  const insumos = catalogo(18000);
  assert.equal(calcularCostoProducto(ficha, insumos, parametros, "Mediana").costoTotal, 24000);
  assert.equal(calcularCostoProducto(ficha, insumos, parametros, "Grande").costoTotal, 24000);
  assert.equal(precioRecomendadoPorPorcion(ficha, insumos, parametros, "Mediana"), 4200);
  assert.equal(precioRecomendadoPorPorcion(ficha, insumos, parametros, "Grande"), 5600);
  assert.equal(recomendadoGrandeIgualado(ficha, insumos, parametros), false);
});

test("redondea hacia arriba a la centena después de aplicar el margen", () => {
  const insumos = catalogo(6345);
  const ajustes = { ...parametros, margen_ganancia: 25 };
  assert.equal(calcularCostoProducto(ficha, insumos, ajustes).costoTotal, 12345);
  assert.equal(precioRecomendadoPorPorcion(ficha, insumos, ajustes, "Mediana"), 2000);
  assert.equal(precioRecomendadoPorPorcion(ficha, insumos, ajustes, "Grande"), 2600);
});

test("el recomendado Grande respeta al menos 10 % más que Mediana tras redondear", () => {
  const insumos = catalogo(100);
  const ajustes = { ...parametros, mano_obra_hora: 0, tarifa_gas_m3: 0, margen_ganancia: 0 };
  const mediana = precioRecomendadoPorPorcion(ficha, insumos, ajustes, "Mediana");
  const grande = precioRecomendadoPorPorcion(ficha, insumos, ajustes, "Grande");
  assert.equal(mediana, 100);
  assert.equal(grande, 200);
  assert.ok(grande >= mediana * 1.1);
  assert.equal(recomendadoGrandeIgualado(ficha, insumos, ajustes), true);
});
