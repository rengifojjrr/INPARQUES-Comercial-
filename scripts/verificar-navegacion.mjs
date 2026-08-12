/**
 * Verificacion de navegacion en un navegador real.
 *
 * Comprueba lo que las pruebas unitarias no pueden ver: que las rutas se
 * resuelven en el navegador, que escribir la URL de un modulo prohibido lleva
 * a la pantalla 403, que el MFA bloquea el acceso, que la sesion sobrevive a
 * una recarga y que no hay errores de consola ni desbordamiento horizontal.
 *
 * Uso:
 *   npm run build && npm run preview &
 *   npm run verificar
 *
 * Requiere Chromium. Si PLAYWRIGHT_CHROMIUM no esta definido, usa el que
 * Playwright encuentre por su cuenta.
 */

import { chromium } from 'playwright';

const BASE = process.env.DEMO_URL ?? 'http://localhost:4173/';
const errores = [];
const resultados = [];

const opciones = process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {};
const navegador = await chromium.launch(opciones);
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 } });

pagina.on('console', (m) => {
  if (m.type() === 'error') errores.push(`consola: ${m.text()}`);
});
pagina.on('pageerror', (e) => errores.push(`error de pagina: ${e.message}`));

async function ir(hash, recargar = false) {
  await pagina.goto(BASE + '#' + hash, { waitUntil: 'networkidle' });
  // Cambiar solo el hash no recarga el documento; tras escribir la sesion en
  // localStorage hay que forzar el arranque de nuevo.
  if (recargar) await pagina.reload({ waitUntil: 'networkidle' });
  await pagina.waitForTimeout(200);
  return pagina.textContent('#app');
}

function comprobar(nombre, condicion, detalle = '') {
  resultados.push({ nombre, ok: Boolean(condicion), detalle });
  console.log(`${condicion ? '  ok  ' : ' FALLA'}  ${nombre}${detalle ? ` — ${detalle}` : ''}`);
}

async function comoUsuario(usuarioId, rol, extra = {}) {
  await pagina.evaluate(
    ([usuarioId, rol, extra]) => {
      localStorage.setItem(
        'inparques.demo.sesion',
        JSON.stringify({
          usuarioId,
          rol,
          ambitoSeleccionado: null,
          mfaVerificado: true,
          iniciadaEn: new Date().toISOString(),
          invitado: false,
          ...extra,
        }),
      );
    },
    [usuarioId, rol, extra],
  );
}

console.log(`\nVerificando ${BASE}\n`);

// --- Indice tecnico interno ------------------------------------------------
let t = await ir('/__mapa');
comprobar('el indice tecnico interno carga', /Mapa del producto/.test(t));
const diagnostico = await pagina.textContent('#and-diagnostico');
comprobar('el registro de vistas no tiene errores de coherencia', /0 errores/.test(diagnostico));

// --- Rutas publicas y estados ---------------------------------------------
t = await ir('/v');
comprobar('la PWA del visitante es publica', !/Inicie sesion/.test(t));

t = await ir('/ruta/que/no/existe');
comprobar('una ruta inexistente muestra 404', /no encontrada/i.test(t));

t = await ir('/i/cierres');
comprobar('una ruta privada sin sesion pide acceso', /Inicie sesion/.test(t));

// --- Proteccion por rol ----------------------------------------------------
await comoUsuario('us_operador_cedros', 'comercio.operador', { ambitoSeleccionado: 'lc_cedros_jc' });

t = await ir('/c/pedidos', true);
comprobar('el operador entra a sus pedidos', /Pedidos/.test(t));

t = await ir('/c/cobro/cuenta-bancaria');
comprobar('el operador recibe 403 en datos bancarios', /No tiene permiso/.test(t));

t = await ir('/c/estado-cuenta');
comprobar('el operador recibe 403 en el estado de cuenta', /No tiene permiso/.test(t));

t = await ir('/i/contabilidad');
comprobar('el operador recibe 403 en el panel institucional', /No tiene permiso/.test(t));

await comoUsuario('us_inspector', 'inparques.inspector');
t = await ir('/i/inspecciones', true);
comprobar('el inspector entra a inspecciones', /Inspecciones/.test(t));

t = await ir('/i/cierres');
comprobar('el inspector recibe 403 en cierres financieros', /No tiene permiso/.test(t));

t = await ir('/c/caja');
comprobar('el inspector recibe 403 en la caja del comercio', /No tiene permiso/.test(t));

// --- Segundo factor --------------------------------------------------------
await comoUsuario('us_finanzas', 'inparques.finanzas', { mfaVerificado: false });
t = await ir('/i/cierres', true);
comprobar('un rol institucional sin MFA queda bloqueado', /segundo factor/i.test(t));

await comoUsuario('us_finanzas', 'inparques.finanzas', { mfaVerificado: true });
t = await ir('/i/cierres', true);
comprobar('con MFA verificado accede a cierres', /Cierres/.test(t));

// --- Persistencia y conectividad ------------------------------------------
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForTimeout(250);
const rolTrasRecarga = await pagina.evaluate(() => window.demoInparques?.sesion()?.rol ?? null);
comprobar('la sesion sobrevive a la recarga', rolTrasRecarga === 'inparques.finanzas', rolTrasRecarga ?? 'sin sesion');

const modos = await pagina.evaluate(() => {
  const a = window.demoInparques.conexion();
  const b = window.demoInparques.alternarConexion();
  const c = window.demoInparques.alternarConexion();
  return [a, b, c];
});
comprobar('el control de conexion alterna los tres modos', modos.join(' -> ') === 'conectado -> degradado -> sin_conexion', modos.join(' -> '));

await pagina.evaluate(() => window.demoInparques.alternarConexion());

// --- Responsive ------------------------------------------------------------
for (const [ancho, alto, etiqueta] of [
  [390, 844, 'movil 390px'],
  [820, 1180, 'tablet 820px'],
  [1440, 900, 'escritorio 1440px'],
]) {
  await pagina.setViewportSize({ width: ancho, height: alto });
  await ir('/__mapa');
  const desborda = await pagina.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  comprobar(`sin desbordamiento horizontal en ${etiqueta}`, !desborda);
}

// --- Consola ---------------------------------------------------------------
comprobar('sin errores de consola', errores.length === 0, errores.join(' | '));

await navegador.close();

const fallos = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} comprobaciones correctas.`);
if (fallos.length > 0) {
  console.error(`\n${fallos.length} comprobaciones fallaron.`);
  process.exit(1);
}
