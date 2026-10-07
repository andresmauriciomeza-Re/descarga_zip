const { chromium } = require("playwright");
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ROLES_KEY = "sivpro.roles.v1";
const APP = "http://localhost:5173";
const CRUD = ["Ver", "Crear", "Editar", "Eliminar"];
const TODAS = ["Dashboard::Dashboard","Configuración::Roles","Configuración::Usuarios",
  "Compras::Insumos","Compras::Proveedores","Compras::Orden de Compra","Compras::Compra",
  "Producción::Categoría de Producto","Producción::Productos","Producción::Orden de Producción",
  "Producción::Empleados","Producción::Producto No Conforme","Ventas::Clientes","Ventas::Ventas","Ventas::Devoluciones"];
const roles = [{ id:"ROL-001", nombre:"Administrador", descripcion:"qa", activo:true,
  accesos: Object.fromEntries(TODAS.map(k=>[k,k==="Dashboard::Dashboard"?["Ver"]:[...CRUD]])) }];

async function abrir(browser, { width, height, hasTouch = false }) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch });
  await ctx.addInitScript(([rk, rv]) => localStorage.setItem(rk, rv), [ROLES_KEY, JSON.stringify(roles)]);
  const page = await ctx.newPage();
  page.on("pageerror", e => console.log("  [pageerror]", String(e).slice(0, 200)));
  await page.goto(APP, { waitUntil: "networkidle" });
  await page.getByText("Iniciar sesión", { exact: true }).first().click();
  await page.locator('input[type="email"]').fill("gloria@lasirena.com");
  await page.locator('input[type="password"]').fill("123456");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await wait(2400);
  return { ctx, page };
}

async function nav(page, texto, width) {
  if (width < 768) { await page.locator("header.h-14 button").first().click(); await wait(500); }
  await page.locator("aside button:visible").filter({ hasText: new RegExp(`^\\s*${texto}\\s*$`) }).last().click();
  await wait(1200);
}

// El cuadro del tooltip debe vivir en un hijo directo del <body> (portal), con
// posición fixed y completamente dentro del viewport (nadie lo recorta).
const inspeccionar = (page) => page.evaluate(() => {
  // El cuadro se porta al <body> con `fixed z-[110] w-72 ...`.
  const caja = [...document.body.children]
    .find(el => el.classList && el.classList.contains("fixed") && el.classList.contains("w-72")) || null;
  if (!caja) return { encontrado: false };
  const r = caja.getBoundingClientRect();
  const s = getComputedStyle(caja);
  // ¿Algo tapa el centro del cuadro?
  const centro = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  const dentro = !!centro && (centro === caja || caja.contains(centro));
  return {
    encontrado: true,
    hijoDeBody: caja.parentElement === document.body,
    position: s.position,
    rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    enViewport: r.x >= 0 && r.y >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
    visibleEnCentro: dentro,
    z: s.zIndex,
    lineas: (caja.innerText || "").split("\n").length,
  };
});

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const out = {};

  // ── Escritorio: apertura con hover ──
  {
    const { ctx, page } = await abrir(browser, { width: 1440, height: 950 });
    await nav(page, "Orden de Compra", 1440);
    const btn = page.locator("main button:visible").filter({ hasText: "Ver historial" }).first();
    await btn.hover();
    await wait(700);
    out.escritorio_hover = await inspeccionar(page);
    await page.screenshot({ path: "artifacts/modal-checks/tooltip-hover-1440.png" });
    // Se cierra al scrollear la tabla (el listener va con capture en document;
    // se fuerza el evento porque con 5 filas la tabla no tiene desborde vertical)
    const scrollInfo = await page.evaluate(() => {
      const sc = document.querySelector("main div.overflow-x-auto") || document.querySelector("main div.overflow-auto");
      if (!sc) return { scrollY: null, scrollH: null, clientH: null };
      sc.scrollTop = 120;
      sc.dispatchEvent(new Event("scroll"));
      return { scrollY: sc.scrollTop, scrollH: sc.scrollHeight, clientH: sc.clientHeight };
    });
    await wait(600);
    out.scrollInfo = scrollInfo;
    out.escritorio_trasScroll = await inspeccionar(page);
    await ctx.close();
  }

  // ── Celular con touch: apertura con toque ──
  {
    const { ctx, page } = await abrir(browser, { width: 375, height: 780, hasTouch: true });
    await nav(page, "Orden de Compra", 375);
    const btn = page.locator("main button:visible").filter({ hasText: "Ver historial" }).first();
    await btn.tap();
    await wait(700);
    out.celular_tap = await inspeccionar(page);
    await page.screenshot({ path: "artifacts/modal-checks/tooltip-tap-375.png" });
    // Escape lo cierra
    await page.keyboard.press("Escape");
    await wait(500);
    out.celular_trasEscape = await inspeccionar(page);
    await ctx.close();
  }

  // ── Menú de estado (Radix portal) dentro de la card en celular ──
  {
    const { ctx, page } = await abrir(browser, { width: 375, height: 780, hasTouch: true });
    await nav(page, "Orden de Compra", 375);
    const trigger = page.locator('button[aria-label="Estado"]:visible').first();
    await trigger.tap();
    await wait(600);
    out.estadoSelect = await page.evaluate(() => {
      const content = document.querySelector('[data-radix-popper-content-wrapper]');
      if (!content) return { abierto: false };
      const r = content.getBoundingClientRect();
      return { abierto: true, hijoDeBody: content.parentElement === document.body || !!content.closest("body"),
        enViewport: r.x >= -1 && r.y >= -1 && r.right <= window.innerWidth + 1 && r.bottom <= window.innerHeight + 1,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
    });
    await page.screenshot({ path: "artifacts/modal-checks/estado-select-375.png" });
    await ctx.close();
  }

  const problemas = [];
  for (const [k, v] of Object.entries(out)) {
    if (v === undefined) continue;
    if (v.encontrado === false && k !== "escritorio_trasScroll" && k !== "celular_trasEscape") problemas.push(`${k}: cuadro no encontrado`);
    if (v.encontrado) {
      if (!v.hijoDeBody) problemas.push(`${k}: no es hijo directo del body`);
      if (v.position !== "fixed") problemas.push(`${k}: position=${v.position}`);
      if (!v.enViewport) problemas.push(`${k}: fuera del viewport ${JSON.stringify(v.rect)}`);
      if (!v.visibleEnCentro) problemas.push(`${k}: tapado en el centro`);
    }
  }
  if (out.estadoSelect && !out.estadoSelect.abierto) problemas.push("estadoSelect: no abrió");
  if (out.estadoSelect && out.estadoSelect.abierto && !out.estadoSelect.enViewport) problemas.push("estadoSelect: fuera del viewport");
  if (out.escritorio_trasScroll && out.escritorio_trasScroll.encontrado) problemas.push("escritorio_trasScroll: no se cerró con scroll");
  if (out.celular_trasEscape && out.celular_trasEscape.encontrado) problemas.push("celular_trasEscape: no se cerró con Escape");

  console.log(JSON.stringify(out, null, 2));
  console.log("__problemas:", problemas.length ? problemas : "NINGUNO");
  await browser.close();
  if (problemas.length) process.exit(2);
})().catch(e => { console.error(e.stack || e); process.exit(1); });
