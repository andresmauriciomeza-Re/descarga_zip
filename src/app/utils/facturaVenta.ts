/**
 * Generación de la factura de una venta.
 *
 * La aplicación es solo frontend: no hay servidor ni proveedor de
 * facturación electrónica, así que la "factura electrónica" se entrega como un
 * documento HTML autocontenido que el usuario descarga y puede abrir o
 * convertir a PDF. La "física" usa el mismo documento con el ancho de un ticket
 * de 80 mm y lo manda a la impresora del sistema.
 */

/** Datos mínimos de la venta necesarios para emitir la factura. */
export interface FacturaVenta {
  id: string;
  usuario: string;
  documento?: string;
  fecha: string;
  total: number;
  metodoPago?: string;
  detalle?: {
    nombre: string;
    precio: number;
    cantidad: number;
    tamaño?: string;
    extras?: string[];
  }[];
}

const EMPRESA = {
  nombre: "La Sirena",
  nit: "900.123.456-7",
  direccion: "Cra. 45 # 12-30, El Poblado, Medellín",
  telefono: "(604) 555 0134",
  email: "facturacion@lasirena.co",
};

const fmtCOP = (n: number) => `$${n.toLocaleString("es-CO")}`;

/** Escapa texto para poder interpolarlo dentro del HTML sin romperlo. */
const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const nombreArchivo = (v: FacturaVenta) =>
  `Factura-${v.id}-${(v.fecha || "").replace(/[^0-9]/g, "") || "sin-fecha"}`;

/**
 * @param ticket `true` genera el ancho de un rollo de 80 mm (impresión física);
 *               `false` genera la hoja A4 con los datos fiscales (electrónica).
 */
function cuerpoHTML(v: FacturaVenta, ticket: boolean): string {
  const lineas = (v.detalle ?? [])
    .map((d) => {
      const tam = d.tamaño ? ` (${d.tamaño})` : "";
      const extras = d.extras?.length ? ` · ${d.extras.join(", ")}` : "";
      const total = d.precio * d.cantidad;
      return `
        <tr>
          <td>${esc(d.nombre)}${esc(tam)}${esc(extras)}</td>
          <td class="num">${d.cantidad}</td>
          <td class="num">${fmtCOP(d.precio)}</td>
          <td class="num">${fmtCOP(total)}</td>
        </tr>`;
    })
    .join("");

  return `
    <header class="cab">
      <h1>${esc(EMPRESA.nombre)}</h1>
      <p>NIT ${esc(EMPRESA.nit)}</p>
      <p>${esc(EMPRESA.direccion)}</p>
      <p>Tel. ${esc(EMPRESA.telefono)} · ${esc(EMPRESA.email)}</p>
    </header>

    <section class="datos">
      <div><span>Factura</span><strong>${esc(nombreArchivo(v))}</strong></div>
      <div><span>Fecha</span><strong>${esc(v.fecha || "—")}</strong></div>
      <div><span>Cliente</span><strong>${esc(v.usuario || "—")}</strong></div>
      <div><span>Documento</span><strong>${esc(v.documento || "No registrado")}</strong></div>
      <div><span>Método de pago</span><strong>${esc(v.metodoPago || "No registrado")}</strong></div>
    </section>

    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th class="num">Cant.</th>
          <th class="num">Precio</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>${lineas || '<tr><td colspan="4">Sin productos registrados</td></tr>'}</tbody>
    </table>

    <section class="total">
      <span>TOTAL</span>
      <strong>${fmtCOP(v.total)}</strong>
    </section>

    <footer class="pie">
      ${
        ticket
          ? "<p>¡Gracias por su compra!</p><p>Conserve este comprobante</p>"
          : `<p>Documento generado electrónicamente por ${esc(EMPRESA.nombre)}.</p>
             <p>Este archivo no ha sido validado ante la DIAN.</p>`
      }
    </footer>`;
}

/** Documento completo, listo para descargar o imprimir. */
function documentoHTML(v: FacturaVenta, ticket: boolean): string {
  // El ticket se arma con fuentes y medidas de un rollo de 80 mm; la factura
  // electrónica usa una hoja A4 con tipografía normal.
  const medidas = ticket
    ? `body{width:72mm;padding:4mm;font-size:11px}
      h1{font-size:15px}
      table{font-size:10px}
      th:nth-child(3),td:nth-child(3){display:none}`
    : `@page{size:A4;margin:16mm} body{width:auto;padding:0;font-size:13px}`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${esc(nombreArchivo(v))}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#111;margin:0 auto}
  .cab{text-align:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:12px}
  .cab h1{margin:0 0 4px;font-size:20px;letter-spacing:1px}
  .cab p{margin:1px 0;font-size:11px;color:#444}
  .datos{margin-bottom:14px;font-size:12px}
  .datos div{display:flex;justify-content:space-between;gap:10px;padding:2px 0}
  .datos span{color:#555}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border-bottom:1px solid #ddd;padding:5px 4px;text-align:left}
  th{background:#f2f2f2;font-size:11px;text-transform:uppercase;letter-spacing:.4px}
  .num{text-align:right;white-space:nowrap}
  .total{display:flex;justify-content:space-between;align-items:center;
    margin-top:14px;padding:10px 12px;background:#111;color:#fff;border-radius:6px}
  .total span{font-size:12px;letter-spacing:1px}
  .total strong{font-size:18px}
  .pie{margin-top:16px;text-align:center;font-size:10px;color:#555}
  .pie p{margin:2px 0}
  ${medidas}
</style>
</head>
<body>${cuerpoHTML(v, ticket)}</body>
</html>`;
}

/**
 * Descarga la factura como documento HTML autocontenido. Se abre en cualquier
 * navegador y desde ahí se puede guardar como PDF.
 */
export function descargarFactura(v: FacturaVenta): void {
  const blob = new Blob([documentoHTML(v, false)], {
    type: "text/html;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombreArchivo(v)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Se libera en el siguiente turno: si se revoca de inmediato, algunos
  // navegadores cancelan la descarga antes de que arranque.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Manda la factura a la impresora del sistema con el ancho de un ticket de
 * 80 mm. Se usa un iframe oculto en vez de imprimir la página para que salga
 * solo el comprobante y no la aplicación de fondo.
 */
export function imprimirFactura(v: FacturaVenta): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(documentoHTML(v, true));
  doc.close();

  // El layout necesita un turno para aplicarse antes de abrir el diálogo.
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 150);
}
