/**
 * Empaqueta la demo en un solo archivo HTML autocontenido.
 *
 * Sirve para publicarla como enlace o abrirla desde un teléfono sin servidor:
 * no queda ninguna petición a archivos externos, ni CSS, ni JS, ni fuentes.
 *
 * Uso: npm run build && npm run unico
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const DIST = join(RAIZ, 'dist');
const SALIDA = join(RAIZ, 'dist-unico');

const assets = await readdir(join(DIST, 'assets'));
const nombreCss = assets.find((f) => f.endsWith('.css'));
const nombreJs = assets.find((f) => f.endsWith('.js') && !f.endsWith('.map'));

if (!nombreCss || !nombreJs) {
  console.error('No se encontraron los archivos construidos. Ejecute primero: npm run build');
  process.exit(1);
}

const css = await readFile(join(DIST, 'assets', nombreCss), 'utf-8');
const js = await readFile(join(DIST, 'assets', nombreJs), 'utf-8');

// Una cadena que contenga "</script" cerraría la etiqueta antes de tiempo.
const jsSeguro = js.replace(/<\/script/gi, '<\\/script');

const html = `<meta charset="utf-8">
<title>INPARQUES Comercial</title>
<style>
${css}
</style>

<a class="salto-contenido" href="#contenido">Saltar al contenido</a>
<div id="app" role="application" aria-label="INPARQUES Comercial"></div>
<div id="anuncios" role="status" aria-live="polite" class="solo-lectores"></div>

<script>
// El contenedor de la página puede no declarar la escala móvil; se asegura
// aquí sin bloquear el zoom del usuario.
(function () {
  if (!document.querySelector('meta[name="viewport"]')) {
    var m = document.createElement('meta');
    m.name = 'viewport';
    m.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
    document.head.appendChild(m);
  }
  if (!document.querySelector('meta[name="color-scheme"]')) {
    var c = document.createElement('meta');
    c.name = 'color-scheme';
    c.content = 'light dark';
    document.head.appendChild(c);
  }
})();
</script>

<script type="module">
${jsSeguro}
</script>
`;

await mkdir(SALIDA, { recursive: true });
await writeFile(join(SALIDA, 'inparques-demo.html'), html, 'utf-8');

const kb = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(0);
console.log(`Archivo único generado: dist-unico/inparques-demo.html (${kb} kB)`);
