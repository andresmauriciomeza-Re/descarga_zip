const { chromium } = require("playwright");
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ROLES_KEY = "sivpro.roles.v1";
const USUARIOS_KEY = "sivpro.usuarios.v1";
const APP = "http://localhost:5173";
const CRUD = ["Ver", "Crear", "Editar", "Eliminar"];
const TODAS = ["Dashboard::Dashboard","Configuración::Roles","Configuración::Usuarios",
  "Compras::Insumos","Compras::Proveedores","Compras::Orden de Compra","Compras::Compra",
  "Producción::Categoría de Producto","Producción::Productos","Producción::Orden de Producción",
  "Producción::Empleados","Producción::Producto No Conforme","Ventas::Clientes","Ventas::Ventas","Ventas::Devoluciones"];
const rol = (id, nombre, accesos) => ({ id, nombre, descripcion: "qa", activo: true, accesos });
const rolesBase = () => [
  rol("ROL-001","Administrador",Object.fromEntries(TODAS.map(k=>[k,k==="Dashboard::Dashboard"?["Ver"]:[...CRUD]]))),
];

// Permite acotar la corrida con variables de entorno (p. ej. ANCHOS=768 SOLO=oc).
const ANCHOS = (process.env.ANCHOS || "1920,1536,1440,1280,1100,768,375").split(",").map(Number);
const SOLO = process.env.SOLO ? process.env.SOLO.split(",") : null;
const PANTALLAS = [
  { nav: "Orden de Compra", id: "oc" },
  { nav: "Compra", id: "gc" },
  { nav: "Proveedores", id: "prov" },
].filter(p => !SOLO || SOLO.includes(p.id));

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
    const burger = page.locator("header.h-14 button").first();
    await burger.click();
    await wait(500);
  }
  const ex = page.locator("aside button:visible").filter({ hasText: new RegExp(`^\\s*${texto}\\s*$`) });
  if (!(await ex.count())) throw new Error(`no existe la entrada de sidebar "${texto}"`);
  await ex.last().click();
  await wait(1200);
}

// Mide la geometría de la pantalla actual.
const medir = (page) => page.evaluate(() => {
  const r = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
             bottom: Math.round(b.bottom), right: Math.round(b.right) };
  };
  const visible = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden") return false;
    const b = el.getBoundingClientRect();
    return b.width > 0 && b.height > 0;
  };
  const doc = document.documentElement;
  const header = document.querySelector("header.h-14");
  const footer = document.querySelector("footer");
  const h1 = document.querySelector("main h1");
  // La card del listado: contenedor del paginador o, si no hay, del scroller.
  const ant = document.querySelector('button[aria-label="Página anterior"]');
  // El paginador es el bloque con borde superior dentro de la card (todas las
  // pantallas lo renderizan igual, con o sin aria-label en sus flechas).
  const pagDiv = document.querySelector("main div.shrink-0.border-t");
  const card = pagDiv ? pagDiv.closest("div.rounded-2xl")
    : (document.querySelector("main table")?.closest("div.rounded-2xl")
       || document.querySelector('main div[class*="md:hidden"]')?.parentElement?.closest("div.rounded-2xl"));
  const scroller = card ? card.querySelector("div.overflow-x-auto") : document.querySelector("main div.overflow-x-auto");
  const table = card ? card.querySelector("table") : null;
  const cards = card ? card.querySelector('div[class*="md:hidden"]') : null;
  const ths = table ? [...table.querySelectorAll("thead th")].map(th => ({
    texto: th.innerText.trim(), visible: visible(th), pos: getComputedStyle(th).position })) : [];
  const firstTd = table ? table.querySelector("tbody td") : null;
  const search = document.querySelector("main input") || document.querySelector("main [class*='max-w-sm']");
  const burger = document.querySelector("header.h-14 button");
  const aside = document.querySelector("aside");
  const pag = pagDiv;
  const pagBox = r(pag);
  const cardBox = r(card);
  const searchBox = r(search);
  const headerBox = r(header);
  const footerBox = r(footer);

  return {
    viewport: { w: window.innerWidth, h: window.innerHeight },
    overflowX: doc.scrollWidth - doc.clientWidth,
    h1: h1 ? h1.innerText.trim() : null,
    header: headerBox, search: searchBox, card: cardBox, footer: footerBox,
    tableVisible: visible(table), cardsVisible: visible(cards),
    tableScroll: scroller ? { scrollW: scroller.scrollWidth, clientW: scroller.clientWidth,
      scrollL: scroller.scrollLeft, overflow: scroller.scrollWidth - scroller.clientWidth } : null,
    ths,
    thPrimerPos: ths[0]?.pos || null,
    tdPrimer: firstTd ? { pos: getComputedStyle(firstTd).position, x: Math.round(firstTd.getBoundingClientRect().x) } : null,
    pag: pagBox,
    pagVisible: !!pag && visible(pag),
    pagEnViewport: pagBox ? pagBox.y >= 0 && pagBox.bottom <= window.innerHeight : null,
    pagSobreFooter: pagBox && footerBox ? pagBox.bottom <= footerBox.y : null,
    cardBajoHeader: cardBox && headerBox ? cardBox.y >= headerBox.bottom : null,
    cardTrasBuscador: cardBox && searchBox ? cardBox.y >= searchBox.bottom : null,
    burgerVisible: visible(burger),
    aside: aside ? { ...r(aside), x: Math.round(aside.getBoundingClientRect().x) } : null,
    filas: table ? table.querySelectorAll("tbody tr").length : (cards ? cards.children.length : 0),
  };
});

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const out = {};
  const problemas = [];
  const nota = (k, v) => { (out[k] ||= []).push(v); };

  for (const width of ANCHOS) {
    const { ctx, page } = await abrir(browser, width, width < 768 ? 780 : 950);
    out[`W${width}`] = {};
    for (const p of PANTALLAS) {
      await nav(page, p.nav, width);
      await wait(500);
      const m = await medir(page);
      const key = `${p.id}@${width}`;
      out[`W${width}`][p.id] = {
        h1: m.h1, filas: m.filas, overflowX: m.overflowX,
        tabla: m.tableVisible, tarjetas: m.cardsVisible,
        scrollInterno: m.tableScroll, pag: m.pag, pagVisible: m.pagVisible,
        pagEnViewport: m.pagEnViewport, pagSobreFooter: m.pagSobreFooter,
        cardBajoHeader: m.cardBajoHeader, cardTrasBuscador: m.cardTrasBuscador,
        burger: m.burgerVisible, asideX: m.aside?.x,
        ths: m.ths.map(t => `${t.texto}:${t.visible ? "ok" : "off"}`).join("|"),
        stickyTh: m.thPrimerPos, stickyTd: m.tdPrimer,
      };
      // ── Aserciones ──
      if (m.overflowX > 0) problemas.push(`${key}: overflow horizontal de página (${m.overflowX}px)`);
      if (m.cardBajoHeader === false) problemas.push(`${key}: la card toca/monta sobre el header`);
      if (m.cardTrasBuscador === false) problemas.push(`${key}: la card monta sobre el buscador`);
      if (width >= 768 && !m.tableVisible) problemas.push(`${key}: tabla NO visible (>=768)`);
      if (width >= 768 && m.cardsVisible) problemas.push(`${key}: tarjetas visibles en >=768`);
      if (width < 768 && m.tableVisible) problemas.push(`${key}: tabla visible en <768`);
      if (width < 768 && !m.cardsVisible) problemas.push(`${key}: tarjetas NO visibles en <768`);
      if (width < 768 && m.burgerVisible === false) problemas.push(`${key}: sin botón de menú en móvil`);
      if (width < 768 && m.aside && m.aside.x + m.aside.w > 1) problemas.push(`${key}: el sidebar no está oculto en móvil (x=${m.aside.x}, w=${m.aside.w})`);
      if (m.pagVisible) {
        if (!m.pagEnViewport) problemas.push(`${key}: el paginador queda fuera del viewport`);
        if (!m.pagSobreFooter) problemas.push(`${key}: el paginador queda por debajo/encima mal del footer`);
      }
      if (width >= 768 && m.thPrimerPos !== "sticky") problemas.push(`${key}: thead no sticky (${m.thPrimerPos})`);
      // Columnas colapsadas (innerText trae el texto YA en mayúsculas si la
      // celda está visible, así que se normaliza a minúsculas).
      const thMap = m.ths.map(t => `${t.texto.trim().toLowerCase()}:${t.visible ? "ok" : "off"}`);
      const oculto = (n) => thMap.includes(`${n.toLowerCase()}:off`);
      const presente = (n) => thMap.includes(`${n.toLowerCase()}:ok`);
      if (width >= 1440 && p.id === "oc") {
        if (!(presente("Fecha") && presente("Facturado") && presente("Por facturar"))) problemas.push(`${key}: faltan columnas en >=1440 [${thMap.join("|")}]`);
      }
      if (width < 1440 && width >= 768 && p.id === "oc") {
        if (!(oculto("Fecha") && oculto("Facturado") && oculto("Por facturar"))) problemas.push(`${key}: las 3 columnas no se colapsaron en 1100-1439 [${thMap.join("|")}]`);
      }
      if (width < 1440 && width >= 768 && p.id === "gc" && !oculto("Fecha")) problemas.push(`${key}: Fecha no se colapsó en <1440 [${thMap.join("|")}]`);
      if (width >= 1440 && p.id === "gc" && !presente("Fecha")) problemas.push(`${key}: Fecha ausente en >=1440 [${thMap.join("|")}]`);
      if (width < 1440 && width >= 768 && p.id === "prov" && !oculto("Teléfono")) problemas.push(`${key}: Teléfono no se colapsó en <1440 [${thMap.join("|")}]`);
      if (width >= 1440 && p.id === "prov" && !presente("Teléfono")) problemas.push(`${key}: Teléfono ausente en >=1440 [${thMap.join("|")}]`);
      // Scroll horizontal esperado en tablet angosta
      if (width >= 768 && m.tableScroll) {
        const debeScroll = m.tableScroll.clientW < m.tableScroll.scrollW;
        if (width === 768 && !debeScroll) problemas.push(`${key}: sin scroll horizontal interno en 768 (clientW=${m.tableScroll.clientW}, scrollW=${m.tableScroll.scrollW})`);
        if (width >= 1100 && debeScroll) problemas.push(`${key}: scroll horizontal innecesario en ${width} (clientW=${m.tableScroll.clientW}, scrollW=${m.tableScroll.scrollW})`);
      }
      await page.screenshot({ path: `artifacts/modal-checks/resp-${p.id}-${width}.png` });
    }
    // Drawer en móvil
    if (width < 768) {
      const burger = page.locator("header.h-14 button").first();
      await burger.click();
      await wait(600);
      const abierto = await page.evaluate(() => {
        const a = document.querySelector("aside");
        const b = a.getBoundingClientRect();
        const fondo = document.querySelector('div[class*="bg-black/50"]');
        return { x: Math.round(b.x), w: Math.round(b.width), fondo: !!fondo };
      });
      out[`W${width}`].drawerAbierto = abierto;
      if (abierto.x < 0) problemas.push(`drawer@${width}: no se abrió (x=${abierto.x})`);
      if (!abierto.fondo) problemas.push(`drawer@${width}: falta el fondo oscuro`);
      await page.screenshot({ path: `artifacts/modal-checks/resp-drawer-${width}.png` });
      // Navegar desde el drawer debe cerrarlo
      const entrada = page.locator("aside button:visible").filter({ hasText: /^\s*Proveedores\s*$/ });
      if (await entrada.count()) {
        await entrada.first().click();
        await wait(900);
        const cerrado = await page.evaluate(() => Math.round(document.querySelector("aside").getBoundingClientRect().x));
        out[`W${width}`].drawerCerradoTrasNav = cerrado;
        if (cerrado > -10) problemas.push(`drawer@${width}: no se cerró tras navegar (x=${cerrado})`);
      }
    }
    await ctx.close();
  }

  out.__problemas = problemas.length ? problemas : "NINGUNO";
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
  if (problemas.length) process.exit(2);
})().catch(e => { console.error(e.stack || e); process.exit(1); });
