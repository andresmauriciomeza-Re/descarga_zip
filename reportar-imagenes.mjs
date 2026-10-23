// Temporal: reporta dimensiones y peso de los assets para planear la conversión.
import sharp from 'sharp';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'src', 'assets', 'img');
const files = readdirSync(dir).filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f));

const rows = [];
for (const f of files) {
  const p = join(dir, f);
  try {
    const meta = await sharp(p).metadata();
    rows.push({
      file: f,
      w: meta.width,
      h: meta.height,
      fmt: meta.format,
      kb: Math.round(statSync(p).size / 1024),
    });
  } catch (e) {
    rows.push({ file: f, w: '?', h: '?', fmt: 'ERR', kb: Math.round(statSync(p).size / 1024) });
  }
}
rows.sort((a, b) => b.kb - a.kb);
for (const r of rows) {
  console.log(`${String(r.kb).padStart(6)} KB  ${String(r.w).padStart(5)}x${String(r.h).padEnd(5)}  ${r.fmt.padEnd(5)}  ${r.file}`);
}
