const { chromium } = require("playwright");
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ROLES_KEY = "sivpro.roles.v1";
const CRUD = ["Ver","Crear","Editar","Eliminar"];
const TODAS = ["Dashboard::Dashboard","Configuración::Roles","Configuración::Usuarios",
  "Compras::Insumos","Compras::Proveedores","Compras::Orden de Compra","Compras::Compra",
  "Producción::Categoría de Producto","Producción::Productos","Producción::Orden de Producción",
  "Producción::Empleados","Producción::Producto No Conforme","Ventas::Clientes","Ventas::Ventas","Ventas::Devoluciones"];
const rol = (id,n,a)=>({id,nombre:n,descripcion:"qa",activo:true,accesos:a});

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
  await ctx.addInitScript(([rk,rv])=>localStorage.setItem(rk,rv), [ROLES_KEY, JSON.stringify([
    rol("ROL-001","Administrador",Object.fromEntries(TODAS.map(k=>[k,k==="Dashboard::Dashboard"?["Ver"]:[...CRUD]]))),
    rol("ROL-002","Cliente",{"Ventas::Ventas":["Ver","Crear"]}),
    rol("ROL-003","Empleado",{"Ventas::Clientes":["Ver"]}),
  ])]);
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:5173", { waitUntil:"networkidle" });
  await page.getByText("Iniciar sesión",{exact:true}).first().click();
  await page.locator('input[type="email"]').fill("gloria@lasirena.com");
  await page.locator('input[type="password"]').fill("123456");
  await page.getByRole("button",{name:"Iniciar sesión"}).click();
  await wait(2400);
  for (const sec of ["CONFIGURACIÓN","USUARIOS","PRODUCCIÓN"]) {
    const b = page.locator("aside button:visible").filter({hasText:sec}).first();
    if (await b.count()) { await b.click(); await wait(500); }
  }
  const vistas = ["Orden de Compra","Compra","Productos","Orden de Producción","CPN","Ventas"];
  for (const t of vistas) {
    await page.locator("aside button:visible").filter({hasText:new RegExp(`^\\s*${t}\\s*$`)}).last().click();
    await wait(1200);
    const btn = page.locator('button[title="Descargar Excel"]').first();
    if (!(await btn.count())) { console.log(`${t.padEnd(20)} SIN BOTON`); continue; }
    try {
      const [dl] = await Promise.all([ page.waitForEvent("download", { timeout: 15000 }), btn.click() ]);
      console.log(`${t.padEnd(20)} descarga: ${dl.suggestedFilename()}`);
      await dl.cancel();
    } catch (e) {
      console.log(`${t.padEnd(20)} SIN DESCARGA (${String(e).split("\n")[0]})`);
    }
    await wait(400);
  }
  await ctx.close(); await browser.close();
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
