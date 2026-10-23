// Conversión de assets PNG → WebP/AVIF para mejorar LCP y peso.
// Es una herramienta de desarrollo (no entra al bundle de producción).
// Uso: node convertir-imagenes.mjs
// Los PNG originales se conservan como fuente; solo dejan de referenciarse.
import sharp from 'sharp';
import { join } from 'node:path';

const dir = join(process.cwd(), 'src', 'assets', 'img');

// out: nombre de salida. width: ancho máximo (mantiene proporción, sin ampliar).
// fmt: 'webp' | 'avif'. quality: calidad objetivo.
const tareas = [
  // HERO (LCP): imagen a pantalla completa. WebP mantiene la etiqueta <img> simple.
  { in: 'image-23.png', out: 'image-23.webp', width: 1536, fmt: 'webp', quality: 72 },
  // Local ("Dónde recoger tu pedido")
  { in: 'imagen_local.png', out: 'imagen_local.webp', width: 1200, fmt: 'webp', quality: 75 },
  // Logos (se muestran máx. 64px)
  { in: 'logo-blanco.png', out: 'logo-blanco.webp', width: 128, fmt: 'webp', quality: 85 },
  { in: 'logoclaro2.png', out: 'logoclaro2.webp', width: 128, fmt: 'webp', quality: 85 },
  // Bebidas (botellas verticales 1024x1536)
  { in: 'Coca-Cola.png', out: 'Coca-Cola.webp', width: 600, fmt: 'webp', quality: 78 },
  { in: 'Pepsi.png', out: 'Pepsi.webp', width: 600, fmt: 'webp', quality: 78 },
  { in: 'Premio.png', out: 'Premio.webp', width: 600, fmt: 'webp', quality: 78 },
  { in: 'Quatro.png', out: 'Quatro.webp', width: 600, fmt: 'webp', quality: 78 },
  // Lasañas
  { in: 'lasaña_carne.png', out: 'lasaña_carne.webp', width: 900, fmt: 'webp', quality: 78 },
  { in: 'lasaña_pollo.png', out: 'lasaña_pollo.webp', width: 900, fmt: 'webp', quality: 78 },
  { in: 'lasaña_mixta.png', out: 'lasaña_mixta.webp', width: 900, fmt: 'webp', quality: 78 },
  // Pizzas
  { in: 'pizza_cañon.png', out: 'pizza_cañon.webp', width: 900, fmt: 'webp', quality: 78 },
  { in: 'pizza_carnes.png', out: 'pizza_carnes.webp', width: 900, fmt: 'webp', quality: 78 },
  { in: 'pizza_hawaii.png', out: 'pizza_hawaii.webp', width: 900, fmt: 'webp', quality: 78 },
  { in: 'pizza_jamon_queso.png', out: 'pizza_jamon_queso.webp', width: 900, fmt: 'webp', quality: 78 },
  { in: 'pizza_maicitos.png', out: 'pizza_maicitos.webp', width: 900, fmt: 'webp', quality: 78 },
  { in: 'pizza_peperoni.png', out: 'pizza_peperoni.webp', width: 900, fmt: 'webp', quality: 78 },
  { in: 'pizza_pollo.png', out: 'pizza_pollo.webp', width: 900, fmt: 'webp', quality: 78 },
  { in: 'pizza_tocineta.png', out: 'pizza_tocineta.webp', width: 900, fmt: 'webp', quality: 78 },
];

const fmtBytes = (b) => `${(b / 1024).toFixed(0)} KB`;

for (const t of tareas) {
  const input = join(dir, t.in);
  const output = join(dir, t.out);
  let pipeline = sharp(input).resize({ width: t.width, withoutEnlargement: true });
  if (t.fmt === 'avif') pipeline = pipeline.avif({ quality: t.quality });
  else pipeline = pipeline.webp({ quality: t.quality });
  const info = await pipeline.toFile(output);
  console.log(`${t.out.padEnd(26)} ${String(info.width).padStart(5)}x${String(info.height).padEnd(5)} ${fmtBytes(info.size)}`);
}
console.log('\nConversión completada.');
