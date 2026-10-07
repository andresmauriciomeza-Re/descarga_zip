const { chromium } = require("playwright");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ROLES_KEY = "sivpro.roles.v1";
const APP = "http://localhost:5173";
const CRUD = ["Ver", "Crear", "Editar", "Eliminar"];
const TODAS = [
  "Dashboard::Dashboard",
  "Configuración::Roles",
  "Configuración::Usuarios",
  "Compras::Insumos",
  "Compras::Proveedores",
  "Compras::Orden de Compra",
  "Compras::Compra",
  "Producción::Categoría de Producto",
  "Producción::Productos",
  "Producción::Orden de Producción",
  "Producción::Empleados",
  "Producción::Producto No Conforme",
  "Ventas::Clientes",
  "Ventas::Ventas",
  "Ventas::Devoluciones",
];
const rol = (id, nombre, accesos) => ({
  id,
  nombre,
  descripcion: "qa",
  activo: true,
  accesos,
});
const rolesBase = () => [
  rol(
    "ROL-001",
    "Administrador",
    Object.fromEntries(
      TODAS.map((k) => [k, k === "Dashboard::Dashboard" ? ["Ver"] : [...CRUD]])
    )
  ),
  rol("ROL-002", "Cliente", { "Ventas::Ventas": ["Ver", "Crear"] }),
];

async function abrir(browser, width = 1600, height = 950) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(
    ([rk, rv]) => localStorage.setItem(rk, rv),
    [ROLES_KEY, JSON.stringify(rolesBase())]
  );
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  [pageerror]", String(e).slice(0, 240)));
  await page.goto(APP, { waitUntil: "networkidle" });
  await page.getByText("Iniciar sesión", { exact: true }).first().click();
  await page.locator('input[type="email"]').fill("gloria@lasirena.com");
  await page.locator('input[type="password"]').fill("123456");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await wait(2400);
  return { ctx, page };
}

async function nav(page, texto) {
  const re = new RegExp(`^\\s*${texto}\\s*$`);
  const item = () => page.locator("aside button:visible").filter({ hasText: re });
  const todas = () => page.locator("aside button:visible");
  // Los grupos del sidebar se abren/cierran al hacer clic: si tras un clic
  // hay MENOS botones es que acabamos de cerrar uno abierto, así que se
  // vuelve a pulsar para dejarlo como estaba.
  for (const g of ["CONFIGURACI", "USUARIOS", "COMPRAS", "PRODUCCI", "VENTAS"]) {
    if (await item().count()) break;
    const btn = todas().filter({ hasText: new RegExp(`^\\s*${g}`, "i") }).first();
    if (!(await btn.count())) continue;
    const antes = await todas().count();
    await btn.click().catch(() => {});
    await wait(450);
    if ((await todas().count()) < antes) {
      await btn.click().catch(() => {});
      await wait(350);
    }
  }
  if (!(await item().count())) throw new Error(`no existe la entrada de sidebar "${texto}"`);
  await item().last().click();
  await wait(1300);
}

// Geometría del modal del proveedor (tarjeta .bg-card.redondeada dentro del último overlay)
const medirModal = (page) =>
  page
    .locator("div.fixed.inset-0")
    .last()
    .locator("div.bg-card.rounded-2xl")
    .first()
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      const kids = [...el.children];
      const body = kids[1] || null;
      const footer = kids[2] || null;
      const sect = (frag) =>
        [...el.querySelectorAll("p")].find((p) => p.textContent.includes(frag));
      const px = (frag) => {
        const s = sect(frag);
        return s ? Math.round(s.getBoundingClientRect().x) : null;
      };
      const th = document.documentElement;
      return {
        ancho: Math.round(r.width),
        alto: Math.round(r.height),
        viewport: { w: window.innerWidth, h: window.innerHeight },
        cuerpoOverflowY: body ? getComputedStyle(body).overflowY : null,
        cuerpoScrollable: body ? body.scrollHeight > body.clientHeight : null,
        cuerpoTieneClaseOverflowHiddenLg: body
          ? /lg:overflow-hidden/.test(body.className)
          : null,
        footerDentroDePantalla: footer
          ? footer.getBoundingClientRect().bottom <= th.clientHeight + 1
          : null,
        xIdentificacion: px("Identificación"),
        xConfiguracion: px("Configuraci"),
        xCamara: px("mara"),
        xContacto: px("Contacto"),
      };
    });

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const out = {};

  // ── M6: ancho del listado de Categoría Producto ──
  {
    const { ctx, page } = await abrir(browser);
    await nav(page, "Categor.a Productos");
    out.m6_categoria = await page.evaluate(() => {
      const t = document.querySelector("main table");
      const card = t?.closest(".rounded-2xl") || t?.parentElement;
      const b = card.getBoundingClientRect();
      const desc = document.querySelector("main table tbody td:nth-child(3) span");
      return {
        anchoTabla: Math.round(b.width),
        anchoDescripcion: desc ? Math.round(desc.getBoundingClientRect().width) : null,
        columnas: [...document.querySelectorAll("main table thead th")].map((h) =>
          h.textContent.trim()
        ),
      };
    });
    await page.screenshot({
      path: "artifacts/modal-checks/m6-categoria-productos.png",
      fullPage: false,
    });
    await ctx.close();
  }

  // ── M5: modal Crear Proveedor en SuppliersScreen ──
  {
    const { ctx, page } = await abrir(browser);
    await nav(page, "Proveedores");
    await page.getByRole("button", { name: /Crear Proveedor/i }).first().click();
    await wait(900);
    out.m5_crear = await medirModal(page);
    await page.screenshot({ path: "artifacts/modal-checks/m5-proveedor-crear.png" });

    // Persona Jurídica: se abren las secciones de la columna derecha
    await page
      .locator('div.fixed.inset-0 select')
      .first()
      .selectOption({ label: "Persona Jurídica" });
    await wait(700);
    out.m5_crear_juridica = await medirModal(page);
    await page.screenshot({
      path: "artifacts/modal-checks/m5-proveedor-crear-juridica.png",
    });
    await page.keyboard.press("Escape");
    await page
      .locator("div.fixed.inset-0")
      .last()
      .locator("button")
      .first()
      .click()
      .catch(() => {});
    await wait(700);

    // Modal Editar
    const editar = page.locator('button[title*="Editar" i]');
    if (await editar.count()) {
      await editar.first().click();
      await wait(900);
      out.m5_editar = await medirModal(page);
      await page.screenshot({
        path: "artifacts/modal-checks/m5-proveedor-editar.png",
      });
    }
    await ctx.close();
  }

  // ── M5: modal "Nuevo Proveedor" (Gestión de Compra) ──
  {
    const { ctx, page } = await abrir(browser);
    await nav(page, "Compra");
    const nueva = page.getByRole("button", { name: /Crear Compra/i }).first();
    if (!(await nueva.count())) {
      out.m5_nuevoDesdeCompra = "BOTON CREAR COMPRA NO VISIBLE";
    } else {
      await nueva.click();
      await wait(1600);
      const input = page
        .locator('input[placeholder*="Buscar por nombre" i]')
        .first();
      if (!(await input.count())) {
        out.m5_nuevoDesdeCompra = "INPUT PROVEEDOR NO ENCONTRADO";
      } else {
        await input.click();
        await input.fill("qa");
        await wait(700);
        const opt = page.getByText(/Crear proveedor/).first();
        if (await opt.count()) {
          await opt.click();
          await wait(900);
          out.m5_nuevoDesdeCompra = await medirModal(page);
          await page.screenshot({
            path: "artifacts/modal-checks/m5-nuevo-proveedor-compra.png",
          });
        } else {
          out.m5_nuevoDesdeCompra = "OPCION NO VISIBLE";
        }
      }
    }
    await ctx.close();
  }

  // ── M1: estado editable en Ventas (sin eliminar) ──
  {
    const { ctx, page } = await abrir(browser);
    await nav(page, "Ventas");
    out.m1_ventas = await page.evaluate(() => {
      const triggers = [...document.querySelectorAll('main button[aria-label="Estado"]')];
      const eliminar = [
        ...document.querySelectorAll(
          'main button[title*="liminar" i], main button[aria-label*="liminar" i]'
        ),
      ];
      return {
        pastillasEstado: triggers.length,
        deshabilitadas: triggers.filter((t) => t.disabled).length,
        botonesEliminar: eliminar.length,
      };
    });
    if (out.m1_ventas.pastillasEstado) {
      await page.locator('main button[aria-label="Estado"]').first().click();
      await wait(500);
      out.m1_ventas.opcionesMenu = await page.evaluate(
        () => document.querySelectorAll('[role="option"]').length
      );
      await page.screenshot({ path: "artifacts/modal-checks/m1-ventas-estado.png" });
    }
    await ctx.close();
  }

  // ── M2: bloqueo de estado en Clientes ──
  {
    const { ctx, page } = await abrir(browser);
    await nav(page, "Clientes");
    out.m2_clientes = await page.evaluate(() => {
      const triggers = [...document.querySelectorAll('main button[aria-label="Estado"]')];
      return {
        pastillas: triggers.length,
        deshabilitadas: triggers.filter((t) => t.disabled).length,
        filas: document.querySelectorAll("main table tbody tr").length,
      };
    });
    await page.screenshot({ path: "artifacts/modal-checks/m2-clientes.png" });
    await ctx.close();
  }

  // ── M4: columna COSTO MÁX. en Gestión de Insumos ──
  {
    const { ctx, page } = await abrir(browser);
    await nav(page, "Insumos");
    out.m4_insumos = await page.evaluate(() => ({
      cabeceras: [...document.querySelectorAll("main table thead th")].map((h) =>
        h.textContent.trim()
      ),
    }));
    await page.screenshot({ path: "artifacts/modal-checks/m4-insumos.png" });
    await ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})();
