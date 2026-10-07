const { chromium } = require("playwright");
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const APP = "http://localhost:5173";

async function loginYEsperar(page, email) {
  await page.goto(APP, { waitUntil: "networkidle" });
  await page.getByText("Iniciar sesión", { exact: true }).first().click();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("123456");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await wait(2600);
}

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });

  // 1. Empleado multi-cargo → dashboard, nunca landing
  {
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
    const page = await ctx.newPage();
    page.on("pageerror", e => console.log("  [pageerror]", String(e).slice(0, 200)));
    await loginYEsperar(page, "maria.gonzalez@gmail.com");
    const estaEnPanel = await page.locator("aside").count();
    console.log("1) María (Cajero+Mesera) → panel visible:", estaEnPanel > 0 ? "OK" : "FALLO");
    // Cambiar de rol
    const btnCambioRol = page.locator("header button[title='Cambiar de rol']");
    console.log("2) Botón cambiar de rol presente:", (await btnCambioRol.count()) > 0 ? "OK" : "FALLO");
    if (await btnCambioRol.count()) {
      await btnCambioRol.first().click();
      await wait(800);
      const opciones = await page.locator("header div.absolute.z-40 button").allInnerTexts();
      console.log("3) Opciones del menú:", JSON.stringify(opciones));
      const mesera = page.locator("header div.absolute.z-40 button", { hasText: "Mesera" });
      if (await mesera.count()) {
        await mesera.first().click();
        await wait(1500);
        const toast = await page.locator("ol").allInnerTexts();
        console.log("4) Tras cambiar a Mesera, toast:", JSON.stringify(toast));
      } else {
        console.log("4) FALLO: no aparece la opción Mesera");
      }
    }
    await ctx.close();
  }

  // 2. Cliente público → landing
  {
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
    const page = await ctx.newPage();
    await loginYEsperar(page, "tomas.j@gmail.com");
    const enLanding = await page.locator("main section, main .landing").count().catch(() => 0);
    console.log("5) Tomás (solo Cliente) → sidebar NO visible:", (await page.locator("aside").count()) === 0 ? "OK" : "FALLO");
    await ctx.close();
  }

  // 3. Sin roles activos → no entra
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(APP, { waitUntil: "networkidle" });
    const esUsuario = "USR-099";
    await page.evaluate(() => {
      const key = "sivpro.usuarios.v1";
      try {
        const arr = JSON.parse(localStorage.getItem(key) ?? "[]");
        arr.push({
          id: "USR-099", nombre: "Sin Rol", iniciales: "SR", avatarColor: "bg-gray-500",
          correo: "sinrol@lasirena.com", telefono: "3001234567", tipoDocumento: "CC",
          numeroDocumento: "999000111", rolId: "ROL-NADA", rolIds: ["ROL-NADA"], activo: true,
          contrasena: "123456",
        });
        localStorage.setItem(key, JSON.stringify(arr));
      } catch (e) {}
    });
    await page.goto(APP, { waitUntil: "networkidle" });
    await page.getByText("Iniciar sesión", { exact: true }).first().click();
    await page.locator('input[type="email"]').fill("sinrol@lasirena.com");
    await page.locator('input[type="password"]').fill("123456");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await wait(3400);
    const msg = await page.locator("p.text-red-600, p[class*='text-red']").allInnerTexts();
    console.log("6) Usuario sin roles → mensaje:", JSON.stringify(msg.slice(-2)));
    const estaEnPanel = await page.locator("aside").count();
    console.log("7) NO entró al panel:", (await page.locator("aside").count()) === 0 ? "OK" : "FALLO");
    await ctx.close();
  }

  await browser.close();
  console.log("FIN");
})().catch(e => { console.error(e); process.exit(1); });
