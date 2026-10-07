import puppeteer from "puppeteer";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "PASS" : "FAIL"} — ${label}`);
  if (!ok) failures++;
};

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox"],
  executablePath: CHROME,
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

// click exacto por texto (normalizando espacios); prefiere el sidebar
const clickText = (label) =>
  page.evaluate((label) => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const all = [...document.querySelectorAll("button, a")].filter(
      (e) => e.offsetParent !== null && norm(e.innerText) === label,
    );
    const sidebar = all.find((e) => e.getBoundingClientRect().left < 300);
    const target = sidebar || all[0];
    if (!target) return false;
    target.click();
    return true;
  }, label);

const nav = async (label) => {
  let ok = await clickText(label);
  if (!ok) {
    // expandir grupos del sidebar hasta encontrar el ítem
    const grupos = ["CONFIGURACIÓN", "USUARIOS", "COMPRAS", "PRODUCCIÓN", "VENTAS"];
    for (const g of grupos) {
      const abierto = await page.evaluate((g) => {
        const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
        const h = [...document.querySelectorAll("button, a")].find(
          (e) => e.getBoundingClientRect().left < 300 && norm(e.innerText) === g,
        );
        if (!h) return false;
        h.click();
        return true;
      }, g);
      if (!abierto) continue;
      await sleep(500);
      if (await clickText(label)) {
        ok = true;
        break;
      }
    }
  }
  console.log(ok ? `nav → ${label}` : `NAV FALLÓ: ${label}`);
  await sleep(1200);
  return ok;
};

// Stock de un producto en la pantalla Productos (con reintentos)
const leerStockDe = async (nombre) => {
  for (let i = 0; i < 8; i++) {
    const r = await page.evaluate((nombre) => {
      const row = [...document.querySelectorAll("tbody tr")].find(
        (tr) => tr.querySelector(`td[title="${nombre}"]`),
      );
      if (!row) {
        const h = [...document.querySelectorAll("h1, h2, h3")].map((x) => x.innerText.trim());
        return { stock: null, diag: `sin fila · headers=${JSON.stringify(h)}` };
      }
      const celdas = [...row.querySelectorAll("[title]")];
      const stock = celdas.find(
        (td) => /^\d+\s/.test(td.getAttribute("title") || "") && !/imagen/i.test(td.getAttribute("title") || ""),
      );
      return { stock: stock ? parseInt(stock.getAttribute("title"), 10) : null, diag: row.innerText.replace(/\s+/g, " ").slice(0, 140) };
    }, nombre);
    if (r.stock !== null) return r.stock;
    if (i === 7) console.log(`leerStockDe(${nombre}) diag:`, r.diag);
    await sleep(700);
  }
  return null;
};

// click por contenido de texto (tolerante a iconos, p. ej. "+ Nuevo pedido")
const clickTextContains = (frag) =>
  page.evaluate((frag) => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const all = [...document.querySelectorAll("button, a")].filter(
      (e) => e.offsetParent !== null && norm(e.innerText).includes(frag),
    );
    const t = all.find((e) => e.getBoundingClientRect().left < 300) || all[0];
    if (!t) return false;
    t.click();
    return true;
  }, frag);

const filasOp = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("tbody tr")].map((tr) =>
      tr.innerText.replace(/\s+/g, " ").trim(),
    ),
  );

try {
  // ── Arranque limpio: semilla de productos (45) ──
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle2" });
  await sleep(1500);

  // ── Login ──
  await clickText("Iniciar sesión");
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.type('input[type="email"]', "gloria@lasirena.com");
  const pw = await page.$('input[type="password"]');
  if (pw) await pw.type("123456");
  await clickText("Iniciar sesión");
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("button")].some(
        (b) =>
          (b.innerText || "").replace(/\s+/g, " ").trim() === "Ventas" &&
          b.getBoundingClientRect().left < 300,
      ),
    { timeout: 20000 },
  );
  console.log("login OK");

  // ── Stock inicial ──
  await nav("Productos");
  const stockInicial = await leerStockDe("Pizza Jamon");
  console.log("stock inicial Pizza Jamon:", stockInicial);
  check(stockInicial === 45, "stock inicial es 45");

  // ── OPs existentes (para identificar la nueva) ──
  await nav("Orden de Producción");
  const snapshot = await filasOp();
  console.log("OPs antes del pedido:", snapshot.length);

  // ── Nuevo pedido: 5 × Pizza Jamon Mediano ──
  await nav("Ventas");
  const abrioModal = await clickTextContains("Nuevo pedido");
  check(abrioModal, "botón Nuevo pedido pulsado");
  await page.waitForSelector('input[placeholder="Escribe el documento…"]', { timeout: 10000 });
  await page.type('input[placeholder="Escribe el documento…"]', "79999999");
  await page.type('input[placeholder="Escribe el nombre del cliente..."]', "Cliente Prueba E2E");
  await page.evaluate(() => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const b = [...document.querySelectorAll("button")].find(
      (e) => e.offsetParent !== null && norm(e.innerText).includes("Efectivo"),
    );
    b?.click();
  });
  await sleep(300);

  // abrir catálogo
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((e) =>
      /Seleccionar productos del catálogo/.test(e.innerText || ""),
    );
    b?.click();
  });
  await sleep(600);

  // seleccionar variante Mediano de Pizza Jamon
  const selProd = await page.evaluate(() => {
    const p = [...document.querySelectorAll("p")].find(
      (e) => e.offsetParent !== null && e.textContent.trim() === "Pizza Jamon",
    );
    if (!p) return false;
    const card = p.closest(".rounded-xl");
    const btn = [...card.querySelectorAll("button")].find((b) =>
      /^Mediano/.test((b.innerText || "").replace(/\s+/g, " ").trim()),
    );
    if (!btn) return false;
    btn.click();
    return true;
  });
  check(selProd, "Pizza Jamon Mediano seleccionado en el catálogo");
  await sleep(500);

  // cantidad → 5
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => {
      const row = [...document.querySelectorAll("div")].find(
        (d) =>
          (d.className || "").includes("bg-primary/5") &&
          [...d.querySelectorAll("span")].some((s) => s.textContent.trim() === "Pizza Jamon"),
      );
      const plus = row && [...row.querySelectorAll("button")].find((b) => b.innerText.trim() === "+");
      plus?.click();
    });
    await sleep(250);
  }
  const qty = await page.evaluate(() => {
    const row = [...document.querySelectorAll("div")].find(
      (d) =>
        (d.className || "").includes("bg-primary/5") &&
        [...d.querySelectorAll("span")].some((s) => s.textContent.trim() === "Pizza Jamon"),
    );
    const spans = row ? [...row.querySelectorAll("span")].map((s) => s.textContent.trim()) : [];
    return spans.find((t) => /^\d+$/.test(t)) ?? null;
  });
  check(qty === "5", `cantidad del renglón es 5 (obtenido: ${qty})`);

  // Guardar (dentro del modal "Nuevo pedido")
  const guardo = await page.evaluate(() => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const h3 = [...document.querySelectorAll("h3")].find((h) => norm(h.innerText) === "Nuevo pedido");
    const modal = h3 && h3.closest(".fixed");
    const btn =
      modal && [...modal.querySelectorAll("button")].find((b) => norm(b.innerText) === "Guardar");
    if (!btn || btn.disabled) return false;
    btn.click();
    return true;
  });
  check(guardo, "botón Guardar del modal pulsado");
  await sleep(2000);
  const modalCerrado = await page.evaluate(
    () =>
      ![...document.querySelectorAll("h3")].some(
        (h) => (h.innerText || "").replace(/\s+/g, " ").trim() === "Nuevo pedido",
      ),
  );
  check(modalCerrado, "modal de pedido cerrado tras guardar");

  // ── Iniciar producción de la OP nueva ──
  await nav("Orden de Producción");
  const nuevas = await page.evaluate((antes) => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    return [...document.querySelectorAll("tbody tr")]
      .map((tr) => norm(tr.innerText))
      .filter((t) => /Pizza Jamon/.test(t) && /Pendiente/.test(t) && !antes.includes(t));
  }, snapshot);
  console.log("OPs nuevas con Pizza Jamon:", JSON.stringify(nuevas, null, 1));
  check(nuevas.length >= 1, "se creó una OP pendiente por el pedido");

  const elTrig = await (
    await page.evaluateHandle((antes) => {
      const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
      const r = [...document.querySelectorAll("tbody tr")].find((tr) => {
        const t = norm(tr.innerText);
        return /Pizza Jamon/.test(t) && /Pendiente/.test(t) && !antes.includes(t);
      });
      return r ? r.querySelector('button[aria-label="Estado"]') : null;
    }, snapshot)
  ).asElement();
  if (!elTrig) throw new Error("No se encontró el pill de estado de la OP nueva");
  await elTrig.click();
  await sleep(700);

  const elOpt = await (
    await page.evaluateHandle(() => {
      const o = [...document.querySelectorAll('[role="option"]')].find((x) =>
        /En Proceso/.test(x.textContent || ""),
      );
      return o;
    })
  ).asElement();
  if (!elOpt) throw new Error("No se abrió el menú de estado (Radix Select)");
  await elOpt.click();
  await sleep(900);

  // modal de faltantes → "Iniciar de todas formas"
  const faltantes = await page.evaluate(() => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const h = [...document.querySelectorAll("h3")].find((x) => norm(x.innerText) === "Falta inventario");
    if (!h) return "none";
    const modal = h.closest("div.rounded-2xl");
    const b = [...modal.querySelectorAll("button")].find(
      (x) => norm(x.innerText) === "Iniciar de todas formas",
    );
    if (!b) return "modal-sin-boton";
    b.click();
    return "aceptado";
  });
  if (faltantes !== "none") console.log("modal faltantes:", faltantes);
  await sleep(1200);

  const opEstado = await page.evaluate((antes) => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const rows = [...document.querySelectorAll("tbody tr")].map((tr) => norm(tr.innerText));
    return rows.find((t) => /Pizza Jamon/.test(t) && !antes.includes(t)) ?? null;
  }, snapshot);
  console.log("OP tras iniciar:", opEstado);
  check(opEstado !== null && /En Proceso/.test(opEstado), "la OP quedó en En Proceso");

  // ── Verificar stock: 45 → 40 ──
  await nav("Productos");
  const stockFinal = await leerStockDe("Pizza Jamon");
  console.log("stock final Pizza Jamon:", stockFinal);
  check(stockFinal === 40, `stock descontado al iniciar producción (40), obtenido: ${stockFinal}`);

  // ══ Parte 2: devolución "Cambio de sabor" ══
  const hawaiAntes = await leerStockDe("Pizza Hawai");
  console.log("stock Pizza Hawai antes del canje:", hawaiAntes);

  // ── Registrar la devolución de la venta creada ──
  await nav("Ventas");
  const btnReg = await (
    await page.evaluateHandle(() => {
      const tr = [...document.querySelectorAll("tbody tr")].find((r) =>
        (r.innerText || "").includes("Cliente Prueba E2E"),
      );
      return tr ? tr.querySelector('button[title="Registrar devolución"]') : null;
    })
  ).asElement();
  if (!btnReg) throw new Error("No se encontró el botón Registrar devolución de la venta");
  await btnReg.click();
  await sleep(700);
  const confirmaReg = await page.evaluate(() => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const b = [...document.querySelectorAll("button")].find(
      (e) => e.offsetParent !== null && norm(e.innerText) === "Sí, confirmar",
    );
    if (!b) return false;
    b.click();
    return true;
  });
  check(confirmaReg, "confirmación de Registrar devolución pulsada");
  await sleep(1000);

  // ── Abrir "Gestionar devolución" ──
  const btnGes = await (
    await page.evaluateHandle(() => {
      const tr = [...document.querySelectorAll("tbody tr")].find((r) =>
        (r.innerText || "").includes("Cliente Prueba E2E"),
      );
      return tr ? tr.querySelector('button[title="Gestionar devolución"]') : null;
    })
  ).asElement();
  if (!btnGes) throw new Error("No se encontró el botón Gestionar devolución");
  await btnGes.click();
  await page.waitForFunction(
    () => (document.body.innerText || "").includes("Qué devuelve el cliente"),
    { timeout: 15000 },
  );
  console.log("modal Gestionar devolución abierto");

  // helper: fila de línea del producto devuelto en la columna izquierda
  const filaLinea = () =>
    page.evaluateHandle((nombre) => {
      const rows = [...document.querySelectorAll("div")].filter(
        (d) =>
          (d.className || "").includes("gap-2.5 px-2.5 py-2 rounded-xl border") &&
          (d.innerText || "").includes(nombre) &&
          [...d.querySelectorAll("button")].some((b) => (b.innerText || "").includes("Motivo")),
      );
      return rows[rows.length - 1] ?? null;
    }, "Pizza Jamon");

  // ── Marcar 5 unidades devueltas ──
  for (let i = 0; i < 5; i++) {
    const el = (await filaLinea()).asElement();
    if (!el) throw new Error("No se encontró la línea de Pizza Jamon en el modal");
    await page.evaluate((row) => {
      const sinTexto = [...row.querySelectorAll("button")].filter((b) => !b.innerText.trim());
      sinTexto[1]?.click(); // [0] = menos, [1] = más
    }, el);
    await sleep(250);
  }
  const devQty = await page.evaluate((row) => {
    const sinTexto = [...row.querySelectorAll("button")].filter((b) => !b.innerText.trim());
    return sinTexto[1]?.parentElement?.querySelector("span")?.innerText ?? null;
  }, (await filaLinea()).asElement());
  check(devQty === "5", `unidades devueltas = 5 (obtenido: ${devQty})`);

  // ── Motivo: "Cambio de sabor" ──
  const abrioMotivo = await page.evaluate((row) => {
    const b = [...row.querySelectorAll("button")].find((x) => (x.innerText || "").includes("Motivo"));
    if (!b || b.disabled) return false;
    b.click();
    return true;
  }, (await filaLinea()).asElement());
  check(abrioMotivo, "formulario de motivo abierto");
  await sleep(500);
  const motivoOk = await page.evaluate(() => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const opts = [...document.querySelectorAll("button")].filter(
      (e) => e.offsetParent !== null && norm(e.innerText) === "Cambio de sabor",
    );
    if (opts.length === 0) return false;
    opts[0].click();
    return true;
  });
  check(motivoOk, "motivo «Cambio de sabor» elegido");
  await sleep(400);
  await page.evaluate(() => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const b = [...document.querySelectorAll("button")].find(
      (e) => e.offsetParent !== null && norm(e.innerText) === "Listo",
    );
    b?.click();
  });
  await sleep(600);

  // ── Canje: 5 × Pizza Hawai Mediano ──
  const abrioCanje = await page.evaluate(() => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const b = [...document.querySelectorAll("button")].find(
      (e) => e.offsetParent !== null && norm(e.innerText).includes("Cambio de producto"),
    );
    if (!b) return false;
    b.click();
    return true;
  });
  check(abrioCanje, "panel «Cambio de producto» abierto");
  await sleep(600);
  for (let i = 0; i < 5; i++) {
    const ok = await page.evaluate(() => {
      const p = [...document.querySelectorAll("p")].find(
        (e) => e.offsetParent !== null && (e.textContent || "").trim() === "Pizza Hawai",
      );
      if (!p) return false;
      const card = p.closest(".rounded-xl");
      const celda = [...card.querySelectorAll("div")].find(
        (d) => (d.innerText || "").trim().startsWith("Mediano"),
      );
      if (!celda) return false;
      const sinTexto = [...celda.querySelectorAll("button")].filter((b) => !b.innerText.trim());
      const plus = sinTexto[1];
      if (!plus || plus.disabled) return false;
      plus.click();
      return true;
    });
    if (!ok && i > 0) break;
    await sleep(250);
  }
  await sleep(500);

  // ── Confirmar ──
  const confOk = await page.evaluate(() => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const b = [...document.querySelectorAll("button")].find(
      (e) => e.offsetParent !== null && norm(e.innerText) === "Confirmar",
    );
    if (!b || b.disabled) return false;
    b.click();
    return true;
  });
  check(confOk, "botón Confirmar habilitado y pulsado");
  await page.waitForFunction(
    () => (document.body.innerText || "").includes("Devolución confirmada"),
    { timeout: 15000 },
  ).catch(() => {});
  const resumenOk = await page.evaluate(() =>
    (document.body.innerText || "").includes("Devolución confirmada"),
  );
  check(resumenOk, "resumen «Devolución confirmada» visible");
  await page.evaluate(() => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const h = [...document.querySelectorAll("p")].find(
      (e) => norm(e.innerText) === "Devolución confirmada",
    );
    const modal = h && h.closest(".rounded-2xl");
    const b =
      modal && [...modal.querySelectorAll("button")].find((e) => norm(e.innerText) === "Cerrar");
    b?.click();
  });
  await sleep(1000);

  // ── Verificaciones finales ──
  await nav("Productos");
  const jamonPost = await leerStockDe("Pizza Jamon");
  const hawaiPost = await leerStockDe("Pizza Hawai");
  console.log("post-devolución → Pizza Jamon:", jamonPost, "| Pizza Hawai:", hawaiPost);
  check(jamonPost === 45, `stock de Pizza Jamon repuesto (45), obtenido: ${jamonPost}`);
  check(hawaiPost === hawaiAntes, `el canje NO descuenta Pizza Hawai (${hawaiAntes} → ${hawaiPost})`);

  await nav("Orden de Producción");
  const opsFinales = await page.evaluate(() =>
    [...document.querySelectorAll("tbody tr")].map((tr) =>
      (tr.innerText || "").replace(/\s+/g, " ").trim(),
    ),
  );
  const opOriginal = opsFinales.find((t) => /5 × Pizza Jamon/.test(t));
  console.log("OP original tras devolución:", opOriginal);
  check(!!opOriginal && /Cancelada/.test(opOriginal), "la OP de la venta quedó Cancelada");
  const opCanje = opsFinales.find((t) => /5 × Pizza Hawai/.test(t));
  console.log("OP de canje:", opCanje);
  check(!!opCanje && /Pendiente/.test(opCanje), "se creó la OP del canje (Pendiente)");
  const opSinCanje = opsFinales.find((t) => /1 × Pizza Jamon/.test(t));
  check(!!opSinCanje && /Pendiente/.test(opSinCanje), "la OP ajena al canje sigue intacta");
} catch (err) {
  console.log("ERROR:", err.message);
  failures++;
} finally {
  console.log(failures === 0 ? "\n=== TODO OK ===" : `\n=== ${failures} FALLOS ===`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
}
