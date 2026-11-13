import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Compila un .ts del frontend con esbuild (mismo patrón que costos.test.mjs)
// y lo importa como módulo ESM para poder testearlo con node:test.
const requireVite = createRequire(import.meta.resolve("vite"));
const { build } = requireVite("esbuild");

const compilar = async (rutaRelativa) => {
  const compilado = await build({
    entryPoints: [fileURLToPath(new URL(rutaRelativa, import.meta.url))],
    alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
  });
  return import(`data:text/javascript;base64,${Buffer.from(compilado.outputFiles[0].text).toString("base64")}`);
};

const {
  MODOS_IVA,
  ayudaModoIva,
  calcularLineaIva,
  derivarIvaIncluidoGlobal,
  formatearChipIva,
  formatearModoIva,
  normalizarModoIva,
  redondearDosDecimales,
  resolverModoIva,
  sumarTotales,
} = await compilar("../src/features/compras/services/iva.ts");
const { UNIDADES, etiquetaPresentacion } = await compilar("../src/shared/utils/unidades.ts");
const { InsumosSolicitadosTable } = await compilar("../src/features/compras/components/InsumosSolicitadosTable.tsx");

// ---------------------------------------------------------------------------
// Catálogos (deben coincidir con el backend)
// ---------------------------------------------------------------------------

test("catálogo de unidades de Compras: paca y sixpack, en el orden del backend", () => {
  assert.deepEqual(UNIDADES, ["kg", "g", "lt", "ml", "und", "paq", "paca", "caja", "bolsa", "sixpack"]);
});

test("MODOS_IVA tiene los tres modos, en el orden del backend", () => {
  assert.deepEqual([...MODOS_IVA], ["incluido", "mas_iva", "exento"]);
});

test("etiquetas, chips y ayudas distinguen IVA adicional de Sin IVA", () => {
  assert.equal(formatearModoIva("incluido", 19), "IVA incluido 19 %");
  assert.equal(formatearModoIva("mas_iva", 0), "IVA adicional 0 %");
  assert.equal(formatearModoIva("exento", 19), "Sin IVA");
  assert.equal(formatearChipIva("incluido", 19), "Incl. 19 %");
  assert.equal(formatearChipIva("mas_iva", 19), "+19 %");
  assert.equal(formatearChipIva("exento", 0), "Sin IVA");
  assert.equal(ayudaModoIva("incluido"), "IVA incluido: el monto ya trae el IVA");
  assert.equal(ayudaModoIva("mas_iva"), "IVA adicional: el IVA se suma al monto");
  assert.equal(ayudaModoIva("exento"), "Sin IVA: no lleva IVA");
});

test("la tabla de orden muestra el tipo de IVA bajo el nombre de cada ítem", () => {
  const items = [
    { rowId: "1", nombre: "Aceite", modoIva: "incluido", iva: 19 },
    { rowId: "2", nombre: "Gaseosa", tipoItem: "producto", modoIva: "mas_iva", iva: 5 },
    { rowId: "3", nombre: "Harina", modoIva: "exento", iva: 0 },
    { rowId: "4", nombre: "Tomate", modoIva: "mas_iva" },
  ].map((item) => ({
    idInsumo: item.rowId,
    cantidad: 1,
    unidad: "und",
    precioUnitario: 100,
    ...item,
  }));
  const html = renderToStaticMarkup(React.createElement(InsumosSolicitadosTable, { items }));
  const texto = html.replace(/<[^>]*>/g, " ");
  // Punto 8: bajo el nombre va SÓLO el modo de IVA, sin porcentaje.
  assert.match(texto, /Aceite\s+IVA incluido\s+1\s+und/);
  assert.match(texto, /Gaseosa\s+Producto ·\s+IVA adicional\s+1\s+und/);
  assert.match(texto, /Harina\s+Sin IVA/);
  assert.match(texto, /Tomate\s+IVA adicional\s+1\s+und/);
  // Punto 8: la columna IVA pierde el prefijo "Incl."; "+5 %" se conserva.
  assert.doesNotMatch(texto, /Incl\./);
  assert.match(texto, /\$\s100\s+19\s%/);
  assert.match(texto, /\+5\s%/);
  assert.match(texto, /Ingresa el IVA\./);
});

test("la tabla muestra el factor del empaque en la unidad base sin alterar unidades sueltas", () => {
  const items = [
    { rowId: "1", nombre: "Harina", unidad: "caja", factorPresentacion: 2, unidadBase: "kg" },
    { rowId: "2", nombre: "Aceite", unidad: "lt" },
  ].map((item) => ({
    idInsumo: item.rowId,
    cantidad: 1,
    precioUnitario: 100,
    iva: 0,
    ...item,
  }));
  const html = renderToStaticMarkup(React.createElement(InsumosSolicitadosTable, { items }));
  assert.match(html, /caja × 2 kg/);
  assert.match(html, />lt<\/span>/);
  assert.equal(etiquetaPresentacion("bolsa", 0.125, "kg"), "bolsa × 0,125 kg");
  assert.equal(etiquetaPresentacion("caja", undefined, "kg"), "caja");
  assert.equal(etiquetaPresentacion("kg", 2, "kg"), "kg");
});

test("redondearDosDecimales es el redondeo del backend (2 decimales)", () => {
  assert.equal(redondearDosDecimales(16806.719999999999), 16806.72);
  assert.equal(redondearDosDecimales(3193.2800000000002), 3193.28);
  assert.equal(redondearDosDecimales(127120), 127120);
});

// ---------------------------------------------------------------------------
// Fórmulas por modo (regla 2.1) — mismos casos que tests/iva-por-item.test.mjs
// ---------------------------------------------------------------------------

test("modo incluido: el monto unitario ya trae el IVA", () => {
  // 2 lt × 10.000 con 19 % incluido → subtotal 20.000,00
  const r = calcularLineaIva({ cantidad: 2, montoUnitario: 10000, porcentajeIva: 19, ivaIncluido: true });
  assert.equal(r.subtotalConIva, 20000);
  assert.equal(r.baseSinIva, 16806.72);
  assert.equal(r.montoIva, 3193.28);
  assert.equal(r.baseSinIva + r.montoIva, r.subtotalConIva);
});

test("modo mas_iva: el monto unitario es la base y el IVA se suma", () => {
  // 4 × 12.000 con 19 % más IVA → base 48.000, IVA 9.120, subtotal 57.120
  const r = calcularLineaIva({ cantidad: 4, montoUnitario: 12000, porcentajeIva: 19, ivaIncluido: false });
  assert.equal(r.baseSinIva, 48000);
  assert.equal(r.montoIva, 9120);
  assert.equal(r.subtotalConIva, 57120);
  assert.equal(r.baseSinIva + r.montoIva, r.subtotalConIva);
});

test("modo exento: tarifa 0 % aunque el ítem traiga otro porcentaje", () => {
  const r = calcularLineaIva({ cantidad: 1, montoUnitario: 50000, porcentajeIva: 19, modoIva: "exento" });
  assert.equal(r.baseSinIva, 50000);
  assert.equal(r.montoIva, 0);
  assert.equal(r.subtotalConIva, 50000);
});

test("redondeo a 2 decimales (antes redondeaba a entero)", () => {
  // 3 × 1.234,56 con 19 % incluido → subtotal 3.703,68 (no entero)
  const r = calcularLineaIva({ cantidad: 3, montoUnitario: 1234.56, porcentajeIva: 19, modoIva: "incluido" });
  assert.equal(r.subtotalConIva, 3703.68);
  assert.equal(Number.isInteger(r.subtotalConIva * 100), true);
  // La identidad se cumple con el redondeo a 2 decimales que fija el backend.
  assert.equal(redondearDosDecimales(r.baseSinIva + r.montoIva), r.subtotalConIva);
});

test("modoIva del ítem manda sobre el booleano ivaIncluido", () => {
  const base = { cantidad: 1, montoUnitario: 50000, porcentajeIva: 19 };
  assert.deepEqual(
    calcularLineaIva({ ...base, modoIva: "exento", ivaIncluido: true }),
    calcularLineaIva({ ...base, modoIva: "exento" }),
  );
  assert.equal(calcularLineaIva({ ...base, modoIva: "mas_iva", ivaIncluido: true }).subtotalConIva, 59500);
});

// ---------------------------------------------------------------------------
// Ejemplo 2.3 (obligatorio): factura con los tres modos a la vez
// ---------------------------------------------------------------------------

test("ejemplo 2.3: factura mixta con totales exactos", () => {
  const lineas = [
    { nombre: "Arroz", cantidad: 1, medida: "paca", precio: 50000, iva: 0, modo: "exento" },
    { nombre: "Aceite", cantidad: 2, medida: "lt", precio: 10000, iva: 19, modo: "incluido" },
    { nombre: "Gaseosa", cantidad: 4, medida: "sixpack", precio: 12000, iva: 19, modo: "mas_iva" },
  ].map((l) => ({
    ...l,
    importe: calcularLineaIva({
      cantidad: l.cantidad,
      montoUnitario: l.precio,
      porcentajeIva: l.iva,
      modoIva: l.modo,
    }),
  }));

  const [arroz, aceite, gaseosa] = lineas;

  // Arroz: exento
  assert.equal(arroz.importe.baseSinIva, 50000);
  assert.equal(arroz.importe.montoIva, 0);
  assert.equal(arroz.importe.subtotalConIva, 50000);

  // Aceite: incluido
  assert.equal(aceite.importe.baseSinIva, 16806.72);
  assert.equal(aceite.importe.montoIva, 3193.28);
  assert.equal(aceite.importe.subtotalConIva, 20000);

  // Gaseosa: más IVA
  assert.equal(gaseosa.importe.baseSinIva, 48000);
  assert.equal(gaseosa.importe.montoIva, 9120);
  assert.equal(gaseosa.importe.subtotalConIva, 57120);

  // Totales (los mismos que el backend)
  const totales = sumarTotales(lineas.map((l) => l.importe));
  assert.equal(totales.totalSinIva, 114806.72);
  assert.equal(totales.totalIva, 12313.28);
  assert.equal(totales.totalPagado, 127120);
  assert.equal(totales.totalSinIva + totales.totalIva, totales.totalPagado);
});

// ---------------------------------------------------------------------------
// Retrocompatibilidad (regla 2.1)
// ---------------------------------------------------------------------------

test("normalizarModoIva interpreta booleanos: true → incluido, false → mas_iva", () => {
  assert.equal(normalizarModoIva(true), "incluido");
  assert.equal(normalizarModoIva(false), "mas_iva");
  assert.equal(normalizarModoIva(undefined), "incluido");
  assert.equal(normalizarModoIva(null), "incluido");
  assert.equal(normalizarModoIva(" exento "), "exento");
  assert.throws(() => normalizarModoIva("otro"), /no es válido/);
});

test("calcularLineaIva acepta el booleano antiguo (comportamiento previo)", () => {
  const linea = { cantidad: 4, montoUnitario: 12000, porcentajeIva: 19 };
  assert.deepEqual(
    calcularLineaIva({ ...linea, ivaIncluido: true }),
    calcularLineaIva({ ...linea, modoIva: "incluido" }),
  );
  assert.deepEqual(
    calcularLineaIva({ ...linea, ivaIncluido: false }),
    calcularLineaIva({ ...linea, modoIva: "mas_iva" }),
  );
  // Sin booleano ni modo se comporta como antes con iva_incluido = true
  // (así calculaban las órdenes de compra).
  assert.deepEqual(calcularLineaIva(linea), calcularLineaIva({ ...linea, modoIva: "incluido" }));
});

test("resolverModoIva usa el modo de la línea y, si no viene, el global", () => {
  assert.equal(resolverModoIva({ modoIva: "exento" }, true), "exento");
  assert.equal(resolverModoIva({}, true), "incluido");
  assert.equal(resolverModoIva({}, false), "mas_iva");
  assert.equal(resolverModoIva({}, undefined), "incluido");
  assert.equal(resolverModoIva({ modoIva: "mas_iva" }, true), "mas_iva");
  assert.equal(resolverModoIva(null, false), "mas_iva");
});

test("derivarIvaIncluidoGlobal: true si todas incluido, false si todas mas_iva, null si mezcla", () => {
  assert.equal(derivarIvaIncluidoGlobal([{ modoIva: "incluido" }, { modoIva: "incluido" }], undefined), true);
  assert.equal(derivarIvaIncluidoGlobal([{ modoIva: "mas_iva" }, { modoIva: "mas_iva" }], undefined), false);
  assert.equal(derivarIvaIncluidoGlobal([{ modoIva: "incluido" }, { modoIva: "mas_iva" }], undefined), null);
  assert.equal(derivarIvaIncluidoGlobal([{ modoIva: "exento" }], undefined), null);
  // Petición antigua: sin modos por línea y con global → se respeta el global
  assert.equal(derivarIvaIncluidoGlobal([{}, {}], true), true);
  assert.equal(derivarIvaIncluidoGlobal([{}, {}], false), false);
  assert.equal(derivarIvaIncluidoGlobal([], true), true);
  assert.equal(derivarIvaIncluidoGlobal([], undefined), null);
});
