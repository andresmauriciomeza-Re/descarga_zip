const { chromium } = require("playwright");
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ROLES_KEY = "sivpro.roles.v1";
const APP = process.env.APP || "http://localhost:5173";
const CRUD = ["Ver", "Crear", "Editar", "Eliminar"];
const TODAS = ["Dashboard::Dashboard","Configuración::Roles","Configuración::Usuarios",
  "Compras::Insumos","Compras::Proveedores","Compras::Orden de Compra","Compras::Compra",
  "Producción::Categoría de Producto","Producción::Productos","Producción::Orden de Producción",
  "Producción::Empleados","Producción::Producto No Conforme","Ventas::Clientes","Ventas::Ventas","Ventas::Devoluciones"];
const rol = (id, nombre, accesos) => ({ id, nombre, descripcion: "qa", activo: true, accesos });
const rolesBase = () => [
  rol("ROL-001","Administrador",Object.fromEntries(TODAS.map(k=>[k,k==="Dashboard::Dashboard"?["Ver"]:[...CRUD]]))),
];

const PANTALLAS = [
  { nav: "Orden de Compra", id: "oc" },
  { nav: "Compra", id: "gc" },
  { nav: "Proveedores", id: "prov" },
];

const problemas = [];
const fallo = (k) => problemas.push(k);

async function abrir(browser, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(([rk, rv]) => { localStorage.setItem(rk, rv); }, [ROLES_KEY, JSON.stringify(rolesBase())]);
  const page = await ctx.newPage();
  page.on("pageerror", e => console.log("  [pageerror]", String(e).slice(0, 240)));
  await page.goto(APP, { waitUntil: "networkidle" });
  await page.getByText("Iniciar sesión", { exact: true }).first().click();
  await page.locator('input[type="email"]').fill("gloria@lasirena.com");
  await page.locator('input[type="password"]').fill("123456");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await wait(2400);
  return { ctx, page };
}

async function nav(page, texto, width) {
  if (width < 768) {
    await page.locator("header.h-14 button").first().click();
    await wait(500);
  }
  const ex = page.locator("aside button:visible").filter({ hasText: new RegExp(`^\\s*${texto}\\s*$`) });
  if (!(await ex.count())) throw new Error(`no existe la entrada de sidebar "${texto}"`);
  await ex.last().click();
  await wait(1200);
}

// Geometría del listado: filas, alto de fila más alta, desborde vertical,
// overflow-y calculado y estado del paginador.
const medir = (page) => page.evaluate(() => {
  const visible = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden") return false;
    const b = el.getBoundingClientRect();
    return b.width > 0 && b.height > 0;
  };
  const main = document.querySelector("main");
  const pag = main ? main.querySelector("div.shrink-0.border-t") : null;
  const card = pag ? pag.closest("div.rounded-2xl")
    : (main?.querySelector("table")?.closest("div.rounded-2xl") || null);
  const scroller = card ? card.querySelector("div.overflow-x-auto") : null;
  const table = card ? card.querySelector("table") : null;
  const tarjetas = card ? card.querySelector('div[class*="md:hidden"]') : null;
  const filas = table ? [...table.querySelectorAll("tbody tr")] : [];
  const alturas = filas.map(tr => Math.round(tr.getBoundingClientRect().height * 10) / 10);
  const sumaFilas = Math.round(alturas.reduce((a, b) => a + b, 0) * 10) / 10;
  const thead = table?.tHead;
  const altoThead = thead ? Math.round(thead.getBoundingClientRect().height * 10) / 10 : 0;
  const nums = pag ? [...pag.querySelectorAll("button")].filter(b => /^\d+$/.test(b.innerText.trim())) : [];
  const actual = nums.find(b => b.getAttribute("aria-current") === "page" ||
    (b.className.includes("bg-primary") && !b.className.includes("hover")));
  return {
    filasVisibles: filas.length,
    filasTarjetas: tarjetas ? tarjetas.children.length : 0,
    tablaVisible: visible(table),
    altoMaxFila: alturas.length ? Math.max(...alturas) : 0,
    sumaFilas,
    altoThead,
    scrollerH: scroller ? scroller.clientHeight : null,
    scrollerScrollH: scroller ? scroller.scrollHeight : null,
    desbordaY: scroller ? scroller.scrollHeight - scroller.clientHeight : null,
    overflowY: scroller ? getComputedStyle(scroller).overflowY : null,
    overflowXComputed: scroller ? getComputedStyle(scroller).overflowX : null,
    zoom: document.documentElement.style.zoom || "",
    pagVisible: visible(pag),
    paginas: nums.map(b => b.innerText.trim()),
    paginaActual: actual ? actual.innerText.trim() : null,
    primeraFila: filas[0] ? filas[0].innerText.replace(/\s+/g, " ").trim().slice(0, 70) : null,
  };
});

function revisar(m, clave, { esperarPaginador, minFilas = 3 } = {}) {
  if (!m.tablaVisible) { fallo(`${clave}: tabla no visible en >=768`); return; }
  if (m.filasVisibles === 0) { fallo(`${clave}: 0 filas visibles con datos`); return; }
  if (m.filasVisibles > 5) fallo(`${clave}: ${m.filasVisibles} filas visibles (máx 5)`);
  if (m.filasVisibles < minFilas) fallo(`${clave}: ${m.filasVisibles} filas visibles (mín ${minFilas})`);
  // Nunca scroll vertical y ninguna fila cortada: la suma real de las filas
  // (la última incluida) tiene que caber en el contenedor.
  if (m.desbordaY > 1) fallo(`${clave}: desborde vertical de ${m.desbordaY}px (scrollY=${m.overflowY})`);
  const cortada = m.altoThead + m.sumaFilas - m.scrollerH;
  // Con `zoom` en el documento las rectangulos salen escaladas y los
  // client/scrollHeight no: en ese caso manda sólo desbordaY.
  if (!m.zoom && cortada > 1) fallo(`${clave}: filas cortadas (+${cortada.toFixed(1)}px sobre ${m.scrollerH}px)`);
  if (esperarPaginador === true && !m.pagVisible) fallo(`${clave}: sin paginador y no caben todas las filas`);
  if (esperarPaginador === false && m.pagVisible) fallo(`${clave}: paginador innecesario (sólo ${m.filasVisibles} filas)`);
}

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const out = {};

  // ── 1) Badge del catálogo (pantalla pública, antes del login) ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();
    await page.goto(APP, { waitUntil: "networkidle" });
    await wait(1500);
    // Ir al catálogo público desde el landing y quitar el filtro de categoría
    // para que se vean todos los productos (los de "Pizzas" sólo salen si el
    // producto trae esa categoría exacta).
    await page.getByRole("button", { name: new RegExp("ver men", "i") }).first().click();
    await wait(1500);
    const todas = page.locator("main button", { hasText: /^Todas$/ }).first();
    if (await todas.count()) { await todas.click(); await wait(1200); }
    const badges = await page.evaluate(() => {
      const cards = [...document.querySelectorAll("[data-producto-id]")];
      return cards.map(c => {
        const badge = [...c.querySelectorAll("span")].find(s => {
          const t = s.innerText.trim();
          return t === "Disponible" || t === "No disponible";
        });
        if (!badge) return null;
        badge.scrollIntoView({ block: "center" });
        const b = badge.getBoundingClientRect();
        const cb = c.getBoundingClientRect();
        const s = getComputedStyle(badge);
        const punto = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
        return {
          texto: badge.innerText.trim(),
          bg: s.backgroundColor, color: s.color, radius: s.borderRadius,
          posicion: s.position, z: s.zIndex || "",
          sobreFoto: !!(punto && (punto === badge || badge.contains(punto) || punto.contains(badge))),
          dentroTarjeta: b.top >= cb.top - 1 && b.right <= cb.right + 1 && b.left >= cb.left - 1,
          ancho: Math.round(b.width), alto: Math.round(b.height),
        };
      }).filter(Boolean);
    });
    out.badge = { total: badges.length, muestras: badges.slice(0, 6) };
    if (!badges.length) fallo("badge: no se encontró ningún badge de estado en el catálogo");
    for (const b of badges) {
      const transparente = b.bg === "rgba(0, 0, 0, 0)" || b.bg === "transparent";
      if (transparente) fallo(`badge "${b.texto}": sin fondo (${b.bg})`);
      if (b.texto === "Disponible") {
        if (!/^rgba\(46, 125, 50/.test(b.bg)) fallo(`badge Disponible: fondo no verde (#2E7D321A) → ${b.bg}`);
        if (b.color !== "rgb(46, 125, 50)") fallo(`badge Disponible: texto no #2E7D32 → ${b.color}`);
      } else if (b.texto === "No disponible") {
        if (!/^rgba\(230, 81, 0/.test(b.bg)) fallo(`badge No disponible: fondo no #E651001A → ${b.bg}`);
        if (b.color !== "rgb(230, 81, 0)") fallo(`badge No disponible: texto no #E65100 → ${b.color}`);
      }
      if (parseFloat(b.radius) < 8) fallo(`badge "${b.texto}": no es píldora (radius=${b.radius})`);
      if (!b.sobreFoto) fallo(`badge "${b.texto}": no queda por encima de la foto`);
      if (!b.dentroTarjeta) fallo(`badge "${b.texto}": sale de la tarjeta`);
    }
    await page.screenshot({ path: "artifacts/modal-checks/badge-catalogo.png" });
    await ctx.close();
  }

  // ── 2) Listados: filas por página + paginador en 3 alturas ──
  for (const width of [1920, 1440, 1280]) {
    const { ctx, page } = await abrir(browser, width, 950);
    for (const p of PANTALLAS) {
      await nav(page, p.nav, width);
      await wait(600);

      // Altura completa
      await page.setViewportSize({ width, height: 950 });
      await wait(900);
      const alto = await medir(page);
      revisar(alto, `${p.id}@${width}h950`);
      await page.screenshot({ path: `artifacts/modal-checks/pag-${p.id}-${width}.png` });

      // Altura corta: deben caber menos filas (3-5) y aparecer el paginador
      await page.setViewportSize({ width, height: 620 });
      await wait(1100);
      const corto = await medir(page);
      revisar(corto, `${p.id}@${width}h620`, { esperarPaginador: true });
      if (corto.filasVisibles > alto.filasVisibles) {
        fallo(`${p.id}@${width}: al reducir la altura subieron las filas (${alto.filasVisibles}→${corto.filasVisibles})`);
      }
      await page.screenshot({ path: `artifacts/modal-checks/pag-${p.id}-${width}-corto.png` });

      // Zoom: cambia el tamaño en CSS px, debe recalcular sin desbordar
      await page.evaluate(() => { document.documentElement.style.zoom = "1.15"; });
      await wait(900);
      const zoom = await medir(page);
      revisar(zoom, `${p.id}@${width}zoom`);
      await page.evaluate(() => { document.documentElement.style.zoom = ""; });
      await wait(700);

      // Navegación del paginador (si está visible en altura corta)
      if (corto.pagVisible) {
        await page.setViewportSize({ width, height: 620 });
        await wait(800);
        const antes = await medir(page);
        const num2 = page.locator('main div.shrink-0.border-t button:has-text("2")').first();
        if (await num2.count()) {
          await num2.click();
          await wait(700);
          const despues = await medir(page);
          out[`${p.id}@${width}.pagina`] = { antes: { p: antes.paginaActual, fila: antes.primeraFila, n: antes.filasVisibles },
                                              despues: { p: despues.paginaActual, fila: despues.primeraFila, n: despues.filasVisibles } };
          revisar(despues, `${p.id}@${width}p2`, { minFilas: 1 });
          if (despues.paginaActual !== "2") fallo(`${p.id}@${width}: no avanzó a la página 2 (${despues.paginaActual})`);
          if (despues.primeraFila === antes.primeraFila) fallo(`${p.id}@${width}: la página 2 muestra la misma primera fila`);
        } else {
          fallo(`${p.id}@${width}: paginador visible pero sin botón "2"`);
        }
      }

      out[`${p.id}@${width}`] = {
        alto: { filas: alto.filasVisibles, maxFila: alto.altoMaxFila, scrollerH: alto.scrollerH, desbordaY: alto.desbordaY, pag: alto.pagVisible, paginas: alto.paginas },
        corto: { filas: corto.filasVisibles, maxFila: corto.altoMaxFila, scrollerH: corto.scrollerH, desbordaY: corto.desbordaY, pag: corto.pagVisible, paginas: corto.paginas, overflowY: corto.overflowY },
        zoom: { filas: zoom.filasVisibles, desbordaY: zoom.desbordaY },
      };
    }
    await ctx.close();
  }

  // ── 3) Móvil: las tarjetas siguen scrolleando en vertical ──
  {
    const { ctx, page } = await abrir(browser, 375, 780);
    for (const p of PANTALLAS) {
      await nav(page, p.nav, 375);
      await wait(600);
      const m = await page.evaluate(() => {
        const main = document.querySelector("main");
        const card = main?.querySelector('div[class*="md:hidden"]')?.closest("div.rounded-2xl");
        const scroller = card ? card.querySelector("div.overflow-x-auto") : null;
        const tarjetas = card ? card.querySelector('div[class*="md:hidden"]') : null;
        return {
          overflowY: scroller ? getComputedStyle(scroller).overflowY : null,
          scrollable: scroller ? scroller.scrollHeight >= scroller.clientHeight : null,
          tarjetas: tarjetas ? tarjetas.children.length : 0,
          tablaVisible: !!(card && card.querySelector("table") && getComputedStyle(card.querySelector("table")).display !== "none"),
        };
      });
      out[`movil-${p.id}`] = m;
      if (m.tarjetas === 0) fallo(`movil-${p.id}: sin tarjetas`);
      if (m.tablaVisible) fallo(`movil-${p.id}: la tabla sigue visible en <768`);
      if (m.overflowY !== "auto") fallo(`movil-${p.id}: las tarjetas perdieron el scroll vertical (${m.overflowY})`);
      await page.screenshot({ path: `artifacts/modal-checks/pag-movil-${p.id}.png` });
    }
    await ctx.close();
  }

  out.__problemas = problemas.length ? problemas : "NINGUNO";
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
  if (problemas.length) process.exit(2);
})().catch(e => { console.error(e.stack || e); process.exit(1); });
