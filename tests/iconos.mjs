/**
 * Comprueba que cada ícono usado en el código exista en el subconjunto de
 * Material Symbols que se autohospeda.
 *
 * La fuente no trae los 3.000 símbolos: se recortó a los que usaban las
 * pantallas en su momento. Si una pantalla nueva pide uno que no está, el
 * navegador no encuentra la ligadura y **dibuja el nombre en texto** ("apps"
 * en vez del cuadrito). Es un fallo silencioso: no da error de consola.
 *
 * Se detecta midiendo: un glifo ocupa aproximadamente el tamaño de fuente;
 * la palabra escrita ocupa bastante más.
 */

import { chromium } from 'playwright';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE ?? 'http://localhost:4175';

function archivos(dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...archivos(p));
    else if (/\.(ts|html)$/.test(n)) out.push(p);
  }
  return out;
}

// Nombres de ícono tal como aparecen dentro de un <span material-symbols…>.
const iconos = new Set();
for (const f of archivos('src')) {
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(/material-symbols-outlined[^>]*>\s*([a-z0-9_]+)\s*</g)) iconos.add(m[1]);
  // Los que se pasan como dato (tablas de navegación, mapas de categoría).
  for (const m of s.matchAll(/\[\s*'([a-z0-9_]+)'\s*,\s*'[^']+'\s*,\s*'\//g)) iconos.add(m[1]);
  for (const m of s.matchAll(/(?:icono|icon):\s*'([a-z0-9_]+)'/g)) iconos.add(m[1]);
}

const lista = [...iconos].sort();
console.log(`Íconos distintos referenciados en el código: ${lista.length}`);

const navegador = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await navegador.newPage();
await page.goto(`${BASE}/#/acceso`);
await page.waitForTimeout(600);
await page.evaluate(() => document.fonts.ready);

const faltan = await page.evaluate((nombres) => {
  const caja = document.createElement('div');
  caja.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden';
  document.body.appendChild(caja);
  const malos = [];
  for (const n of nombres) {
    const s = document.createElement('span');
    s.className = 'material-symbols-outlined';
    s.style.fontSize = '24px';
    s.textContent = n;
    caja.appendChild(s);
    // Un glifo mide ~24px de ancho; la palabra escrita mide mucho más.
    if (s.getBoundingClientRect().width > 34) malos.push(n);
    caja.removeChild(s);
  }
  caja.remove();
  return malos;
}, lista);

await navegador.close();

if (faltan.length === 0) {
  console.log('Todos los íconos existen en la fuente.');
} else {
  console.log(`\nFALTAN ${faltan.length} en el subconjunto de la fuente:`);
  for (const n of faltan) console.log('  ' + n);
  process.exitCode = 1;
}
