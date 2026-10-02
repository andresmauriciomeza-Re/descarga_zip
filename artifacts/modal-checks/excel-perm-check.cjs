const { chromium } = require("playwright");
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ROLES_KEY = "sivpro.roles.v1";
const USUARIOS_KEY = "sivpro.usuarios.v1";
const APP = "http://127.0.0.1:5173";
const CRUD = ["Ver", "Crear", "Editar", "Eliminar"];
const TODAS = ["Dashboard::Dashboard","Configuración::Roles","Configuración::Usuarios",
  "Compras::Insumos","Compras::Proveedores","Compras::Orden de Compra","Compras::Compra",
  "Producción::Categoría de Producto","Producción::Productos","Producción::Orden de Producción",
  "Producción::Empleados","Producción::Producto No Conforme","Ventas::Clientes","Ventas::Ventas","Ventas::Devoluciones"];
const rol = (id, nombre, accesos) => ({ id, nombre, descripcion: "qa", activo: true, accesos });

// ROL-001 con los 4 CRUD y SIN "Descargar Excel": Administrador ya guardado en
// localStorage antes de que existiera el privilegio (caso de la migración).
const rolesBase = () => [
  rol("ROL-001","Administrador",Object.fromEntries(TODAS.map(k=>[k,k==="Dashboard::Dashboard"?["Ver"]:[...CRUD]]))),
  rol("ROL-002","Cliente",{"Ventas::Ventas":["Ver","Crear"]}),
  rol("ROL-003","Empleado",{"Ventas::Clientes":["Ver"]}),
];

const excel = (p) => p.locator('button[title="Descargar Excel"]');

async function abrir(browser, { roles, usuario }) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  await ctx.addInitScript(([rk, rv, uk, uv]) => {
    localStorage.setItem(rk, rv);
    if (uv) localStorage.setItem(uk, uv);
  }, [ROLES_KEY, JSON.stringify(roles), USUARIOS_KEY, usuario ? JSON.stringify([usuario]) : null]);
  const page = await ctx.newPage();
  page.on("pageerror", e => console.log("  [pageerror]", String(e).slice(0, 240)));
  await page.goto(APP, { waitUntil: "networkidle" });
  await page.getByText("Iniciar sesión", { exact: true }).first().click();
  await page.locator('input[type="email"]').fill(usuario ? usuario.correo : "gloria@lasirena.com");
  await page.locator('input[type="password"]').fill("123456");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await wait(2400);
  // Desplegar las secciones colapsadas del sidebar
  for (const h of ["CONFIGURACIÓN", "USUARIOS", "PRODUCCIÓN"]) {
    const b = page.locator("aside button").filter({ hasText: h }).first();
    if (await b.count()) { await b.click(); await wait(600); }
  }
  return { ctx, page };
}

// El sidebar tiene "Productos" y "Categoría Productos", y "Ventas" bajo
// VENTAS: se navega por coincidencia exacta. `:visible` porque el menú se
// renderiza dos veces (escritorio y móvil) y solo una está en pantalla.
async function nav(page, texto) {
  const ex = page.locator("aside button:visible").filter({ hasText: new RegExp(`^\\s*${texto}\\s*$`) });
  if (!(await ex.count())) throw new Error(`no existe la entrada de sidebar "${texto}"`);
  await ex.last().click();
  await wait(1000);
}

const medidas = (page) => excel(page).first().evaluate((el) => {
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const sib = el.parentElement?.querySelector("button:not([title='Descargar Excel'])");
  return {
    texto: el.innerText.replace(/\s+/g, " ").trim(),
    radio: s.borderRadius,
    borde: `${s.borderWidth} ${s.borderTopColor}`,
    fondo: s.backgroundColor,
    colorIcono: getComputedStyle(el.querySelector("svg")).color,
    padding: `${s.paddingTop} / ${s.paddingRight}`,
    alto: Math.round(r.height),
    hermano: sib?.innerText.replace(/\s+/g, " ").trim(),
    altoHermano: sib ? Math.round(sib.getBoundingClientRect().height) : null,
  };
});

const VISTAS = [["Orden de Compra","orden-compra"],["Compra","gestion-compra"],["Productos","gestion-productos"],
  ["Orden de Producción","production-orders"],["CPN","perecederos"],["Ventas","ventas-pedidos"]];

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const out = {};
  const qaUser = { id:"USR-900", nombre:"QA Tester", iniciales:"QT", avatarColor:"bg-blue-500",
    correo:"qa@gmail.com", telefono:"3000000000", tipoDocumento:"CC", numeroDocumento:"99999999",
    rolId:"ROL-004", activo:true };

  // ── T1 · rol NO admin SIN el permiso → botón oculto, el resto sigue igual ──
  {
    const roles = [...rolesBase(), rol("ROL-004","QA Sin Excel",{"Ventas::Ventas":["Ver","Crear"]})];
    const { ctx, page } = await abrir(browser, { roles, usuario: qaUser });
    await nav(page, "Ventas");
    out.T1_sinPermiso = {
      pantalla: (await page.locator("h1").first().innerText()).trim(),
      botonExcel: await excel(page).count(),
      nuevoPedido: await page.getByRole("button", { name: /Nuevo pedido/i }).count(),
    };
    await page.screenshot({ path: "artifacts/modal-checks/excel-T1-sin-permiso.png" });
    await ctx.close();
  }

  // ── T2 · rol NO admin CON el permiso → botón visible ──────────────────────
  {
    const roles = [...rolesBase(), rol("ROL-004","QA Con Excel",{"Ventas::Ventas":["Ver","Crear","Descargar Excel"]})];
    const { ctx, page } = await abrir(browser, { roles, usuario: qaUser });
    await nav(page, "Ventas");
    out.T2_conPermiso = {
      botonExcel: await excel(page).count(),
      nuevoPedido: await page.getByRole("button", { name: /Nuevo pedido/i }).count(),
      estilos: await excel(page).count() ? await medidas(page) : null,
    };
    await page.screenshot({ path: "artifacts/modal-checks/excel-T2-con-permiso.png" });
    await ctx.close();
  }

  // ── T3 · Administrador persistido sin el permiso → migración + diseño ─────
  {
    const { ctx, page } = await abrir(browser, { roles: rolesBase() });
    out.T3_adminMigrado = {};
    for (const [texto, id] of VISTAS) {
      await nav(page, texto);
      const n = await excel(page).count();
      out.T3_adminMigrado[id] = n ? await medidas(page) : "BOTON AUSENTE";
      if (n) {
        const box = await excel(page).first().boundingBox();
        await page.screenshot({ path: `artifacts/modal-checks/excel-T3-${id}.png`,
          clip: { x: Math.max(0, box.x - 215), y: Math.max(0, box.y - 26), width: 530, height: 74 } });
      }
    }
    // Modo oscuro
    await nav(page, "Ventas");
    const toggle = page.locator('button[title*="scuro" i], button[aria-label*="scuro" i]');
    if (await toggle.count()) { await toggle.first().click(); await wait(900); }
    out.T3_modoOscuro = {
      applied: await excel(page).count() > 0,
      html: await page.locator("html").getAttribute("class"),
      estilos: await excel(page).count() ? await excel(page).first().evaluate(el => {
        const s = getComputedStyle(el);
        return { fondo: s.backgroundColor, texto: s.color, borde: s.borderTopColor };
      }) : null,
    };
    await excel(page).first().screenshot({ path: "artifacts/modal-checks/excel-T3-modo-oscuro.png" }).catch(()=>{});
    await ctx.close();
  }

  // ── T4 · chips del editor de roles: "Descargar Excel" solo en los 6 ───────
  {
    const { ctx, page } = await abrir(browser, { roles: rolesBase() });
    await nav(page, "Roles");
    await page.locator('button[title*="Editar" i]').first().click();
    await wait(1100);
    const modal = page.locator("div.fixed.inset-0").last();
    out.T4_chips = {};
    for (const celda of ["Dashboard", "Configuración", "Usuarios", "Compras", "Producción", "Ventas"]) {
      // La grilla de módulos son divs con role="button" + aria-pressed; dentro
      // hay un <button> anidado que es el checkbox de "todos", así que se hace
      // clic en la celda y no en el primer button.
      const card = modal.locator('div[role="button"][aria-pressed]').filter({ hasText: celda }).first();
      if (!(await card.count())) { out.T4_chips[celda] = "celda no encontrada"; continue; }
      await card.click();
      await wait(800);
      const txt = await modal.innerText();
      const n = (txt.match(/Descargar Excel/g) || []).length;
      // Cuántas sub-opciones del módulo se listan en el panel de permisos
      out.T4_chips[celda] = { lineasConExcel: n, ofrece: n > 0 };
      await page.screenshot({ path: `artifacts/modal-checks/excel-T4-${celda.replace(/\s+/g,"")}.png` });
    }
    await ctx.close();
  }

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch(e => { console.error(e.stack || e); process.exit(1); });
