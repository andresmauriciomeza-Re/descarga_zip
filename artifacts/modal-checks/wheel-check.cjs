const { chromium } = require("playwright");

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const results = [];

  const state = () => page.evaluate(() => {
    const overlay = [...document.querySelectorAll("*")].find(element => {
      const style = getComputedStyle(element);
      return style.position === "fixed" && element.classList.contains("inset-0") && element.className.includes("bg-black");
    });
    const modal = overlay?.querySelector("[class*='bg-card']");
    const scrollables = [...document.querySelectorAll("*")]
      .filter(element => {
        const style = getComputedStyle(element);
        return /(auto|scroll)/.test(style.overflowY);
      })
      .map(element => ({
        tag: element.tagName,
        className: element.className?.toString().slice(0, 180),
        scrollTop: element.scrollTop,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        overflowY: getComputedStyle(element).overflowY,
      }));
    return {
      documentScrollTop: document.scrollingElement?.scrollTop ?? 0,
      bodyScrollTop: document.body.scrollTop,
      overlay: overlay ? { scrollTop: overlay.scrollTop, scrollHeight: overlay.scrollHeight, clientHeight: overlay.clientHeight } : null,
      modal: modal ? { scrollTop: modal.scrollTop, scrollHeight: modal.scrollHeight, clientHeight: modal.clientHeight } : null,
      scrollables,
    };
  });

  const check = async (name, open, hoverSelector = "[class*='bg-card']") => {
    await open();
    await wait(250);
    const before = await state();
    const target = page.locator(hoverSelector).last();
    await target.hover();
    await page.mouse.wheel(0, 600);
    await wait(250);
    const down = await state();
    await page.mouse.wheel(0, -600);
    await wait(250);
    const after = await state();
    results.push({ name, before, afterWheelDown: down, afterWheelUp: after });
    const close = page.getByRole("button", { name: /Cerrar|Cancelar/i }).last();
    if (await close.count()) await close.click();
    await wait(200);
  };

  await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
  await page.getByText("Iniciar sesión", { exact: true }).first().click();
  await page.locator('input[type="email"]').fill("gloria@lasirena.com");
  await page.locator('input[type="password"]').fill("123456");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await wait(1900);

  await page.locator("aside button").filter({ hasText: "Usuarios" }).first().click();
  await page.locator("aside button").filter({ hasText: "Usuarios" }).last().click();
  await wait(250);
  await check("Detalle Usuario", async () => page.locator('button[title="Ver detalle"]').first().click());
  await check("Editar Usuario", async () => page.locator('button[title="Editar"]').first().click());
  await check("Crear Usuario", async () => page.getByRole("button", { name: /Crear usuario/i }).click());

  await page.locator("aside button").filter({ hasText: "Empleados" }).click();
  await wait(250);
  await check("Detalle Empleado", async () => page.locator('button[title="Ver detalle"]').first().click());
  await check("Editar Empleado", async () => page.locator('button[title="Editar"]').first().click());
  await check("Crear Empleado", async () => page.getByRole("button", { name: /Crear empleado/i }).click());

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
