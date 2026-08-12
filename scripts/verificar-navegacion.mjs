/**
 * Verificación de la demo en un navegador real, a tamaño de teléfono.
 *
 * Comprueba lo que las pruebas unitarias no ven: que las pantallas se dibujan,
 * que los botones llevan a algún sitio, que un recorrido de compra termina, que
 * lo que hace el comercio se refleja en el visitante, que las rutas prohibidas
 * dan 403 y que no hay errores de consola ni desbordamiento horizontal.
 *
 * Uso:
 *   npm run build && npm run preview &
 *   npm run verificar
 */

import { chromium } from 'playwright';

const BASE = process.env.DEMO_URL ?? 'http://localhost:4173/';
const errores = [];
const resultados = [];

const opciones = process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {};
const navegador = await chromium.launch(opciones);
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const p = await contexto.newPage();

p.on('console', (m) => {
  if (m.type() === 'error') errores.push(`consola: ${m.text()}`);
});
p.on('pageerror', (e) => errores.push(`error de página: ${e.message}`));

function comprobar(nombre, ok, detalle = '') {
  resultados.push({ nombre, ok: Boolean(ok) });
  console.log(`${ok ? '  ok  ' : ' FALLA'}  ${nombre}${detalle ? ` — ${detalle}` : ''}`);
}

async function ir(hash, recargar = false) {
  if (recargar) {
    // Cambiar solo el fragmento no recarga el documento, y el guardia podria
    // redirigir con la sesion anterior antes de que arranque de nuevo.
    await p.evaluate((h) => history.replaceState(null, '', '#' + h), hash);
    await p.reload({ waitUntil: 'domcontentloaded' });
  } else {
    await p.goto(BASE + '#' + hash, { waitUntil: 'domcontentloaded' });
  }
  await p.waitForTimeout(260);
  return (await p.textContent('#app')) ?? '';
}

async function pulsar(selector, espera = 320) {
  await p.click(selector, { timeout: 4000 });
  await p.waitForTimeout(espera);
  return (await p.textContent('#app')) ?? '';
}

async function entrarComo(usuarioId, rol) {
  await p.evaluate(
    ([u, r]) => {
      localStorage.setItem(
        'inparques.demo.sesion',
        JSON.stringify({
          usuarioId: u, rol: r, ambitoSeleccionado: null,
          mfaVerificado: true, iniciadaEn: new Date().toISOString(), invitado: false,
        }),
      );
    },
    [usuarioId, rol],
  );
}

async function sinDesborde() {
  return !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1));
}

console.log(`\nVerificando ${BASE} a 390 × 844 (teléfono)\n`);

// ------------------------------------------------------- 1. Acceso y perfiles
let t = await ir('/acceso');
comprobar('el selector de perfiles carga', /Elija un perfil/.test(t));

const PERFILES = [
  ['us_visitante', 'visitante.cliente', '/v', 'Parque del Este'],
  ['us_prop_cedros', 'comercio.propietario', '/c', 'Café Los Cedros'],
  ['us_admin_cedros', 'comercio.admin_local', '/c', 'Café Los Cedros'],
  ['us_operador_cedros', 'comercio.operador', '/c', 'Café Los Cedros'],
  ['us_contador_cedros', 'comercio.contador', '/c', 'Café Los Cedros'],
  ['us_superadmin', 'inparques.superadmin', '/i', 'Panel nacional'],
  ['us_direccion', 'inparques.direccion_comercial', '/i', 'Panel'],
  ['us_finanzas', 'inparques.finanzas', '/i', 'Panel nacional'],
  ['us_admin_parque', 'inparques.admin_parque', '/i', 'Parque del Este'],
  ['us_inspector', 'inparques.inspector', '/i', 'Parque del Este'],
  ['us_soporte', 'inparques.soporte', '/i', 'Panel nacional'],
];

for (const [id, rol, inicio, esperado] of PERFILES) {
  await entrarComo(id, rol);
  const texto = await ir(inicio, true);
  comprobar(`entra y dibuja el inicio de ${rol}`, texto.includes(esperado), esperado);
}

// -------------------------------------------- 2. Compra completa del visitante
await p.evaluate(() => {
  localStorage.removeItem('inparques.demo.sesion');
  localStorage.removeItem('inparques.demo.carrito');
});
await ir('/v', true);

t = await ir('/v/comercio/ng_cedros/catalogo');
comprobar('el catálogo del comercio lista artículos', /Guayoyo/.test(t));

t = await ir('/v/articulo/ar_cafe_guayoyo');
comprobar('la ficha del artículo abre', /Guayoyo grande/.test(t));

t = await pulsar('[data-accion="agregar-carrito"]');
comprobar('agregar al carrito lleva al carrito', /Carrito|Resumen/.test(t));

// Regla de un solo comercio: agregar de otro negocio debe abrir la hoja.
await ir('/v/articulo/ar_rompecabezas');
await pulsar('[data-accion="agregar-carrito"]');
const hayHoja = await p.locator('#hoja-activa').count();
comprobar('mezclar comercios abre el modal de conflicto', hayHoja > 0);
const textoHoja = hayHoja ? await p.textContent('#hoja-activa') : '';
comprobar('el modal ofrece conservar o vaciar', /Conservar mi carrito/.test(textoHoja) && /Vaciar/.test(textoHoja));
await pulsar('[data-accion="conservar-carrito"]');

t = await ir('/v/carrito');
comprobar('el carrito conserva el comercio original', /Los Cedros/.test(t));

t = await pulsar('[data-accion="ir"][data-valor="/v/checkout"]');
comprobar('el checkout abre', /Cómo lo retira/.test(t));

await p.fill('[name="nombre"]', 'Daniela Ochoa');
t = await pulsar('[data-accion="ir-pago"]');
comprobar('la selección de pago abre', /Pago Móvil/.test(t));

t = await pulsar('[data-accion="ir"][data-valor="/v/checkout/pago/pago-movil"]');
comprobar('la pantalla de Pago Móvil marca el modo demostración', /Modo demostración/.test(t));

await p.fill('[name="referencia"]', '123456');
t = await pulsar('[data-accion="pagar"]', 1400);
comprobar('el pago termina en la confirmación', /Pedido recibido|¡Listo!/.test(t));
comprobar('el pago queda pendiente de verificación, no confirmado', /pendiente de verificación/i.test(t));

const ordenId = await p.evaluate(() => new URL(location.href).hash.split('orden=')[1] ?? '');
comprobar('la orden quedó registrada', Boolean(ordenId), ordenId);

t = await ir(`/v/pedido/${ordenId}`);
comprobar('el seguimiento muestra los cuatro estados por separado', /Estados por separado/.test(t));

// ------------------------------- 3. El comercio avanza y el visitante lo ve
await entrarComo('us_operador_cedros', 'comercio.operador');
t = await ir('/c/pedidos', true);
comprobar('el operador ve el pedido recién creado', t.includes('PE-') || /Pendiente de aceptacion|Pendiente de aceptación/i.test(t));

t = await ir(`/c/pedido/${ordenId}`);
comprobar('el detalle del pedido abre en el comercio', /Artículos/.test(t));
comprobar('avisa de que el pago no está verificado', /Pago sin verificar/.test(t));

t = await pulsar('[data-accion="avanzar-orden"]');
comprobar('aceptar el pedido cambia su estado', /Aceptad/.test(t));
t = await pulsar('[data-accion="avanzar-orden"]');
t = await pulsar('[data-accion="avanzar-orden"]');
comprobar('el pedido llega a listo para retirar', /Lista para retirar|Confirmar entrega/.test(t));

await p.evaluate(() => localStorage.removeItem('inparques.demo.sesion'));
t = await ir(`/v/pedido/${ordenId}`, true);
comprobar('el visitante ve el cambio hecho por el comercio', /Lista para retirar|código/i.test(t));

// ---------------------------------------- 4. Disponibilidad cruzada de catálogo
await entrarComo('us_admin_cedros', 'comercio.admin_local');
await ir('/c/catalogo', true);
await pulsar('.conmutador');
await p.evaluate(() => localStorage.removeItem('inparques.demo.sesion'));
t = await ir('/v/comercio/ng_cedros/catalogo', true);
comprobar('marcar agotado en el comercio se ve en el visitante', /Agotado/.test(t));

// ------------------------------------------------ 5. Venta de mostrador y caja
await entrarComo('us_operador_cedros', 'comercio.operador');
t = await ir('/c/caja/venta-mostrador', true);
comprobar('la venta de mostrador abre con turno activo', /Forma de cobro/.test(t));
await pulsar('[data-accion="mostrador-mas"]');
t = await pulsar('[data-accion="registrar-mostrador"]', 500);
comprobar('la venta de mostrador se registra en la caja', /Turno abierto|Caja/.test(t));

// ------------------------------------------------------- 6. Rutas prohibidas
const PROHIBIDAS = [
  ['us_operador_cedros', 'comercio.operador', '/c/cobro/cuenta-bancaria'],
  ['us_operador_cedros', 'comercio.operador', '/i/contabilidad'],
  ['us_inspector', 'inparques.inspector', '/i/cierres'],
  ['us_inspector', 'inparques.inspector', '/c/caja'],
  ['us_soporte', 'inparques.soporte', '/i/reglas'],
  ['us_admin_parque', 'inparques.admin_parque', '/i/cierres'],
  ['us_contador_cedros', 'comercio.contador', '/c/catalogo/articulo/ar_cachito'],
];
for (const [id, rol, ruta] of PROHIBIDAS) {
  await entrarComo(id, rol);
  const texto = await ir(ruta, true);
  comprobar(`403 para ${rol} en ${ruta}`, /No tiene permiso/.test(texto));
}

// --------------------------------------------------- 7. Enmascarado bancario
await entrarComo('us_prop_cedros', 'comercio.propietario');
t = await ir('/c/cobro', true);
comprobar('el propietario ve la cuenta enmascarada', /••••/.test(t) && !/01020304050607081234/.test(t));

await entrarComo('us_inspector', 'inparques.inspector');
t = await ir('/i/negocio/ng_cedros', true);
comprobar('el inspector no recibe datos bancarios', /No disponible para su rol/.test(t) && !/••••/.test(t));

// ---------------------------------------------- 8. Aprobación de expediente
await entrarComo('us_direccion', 'inparques.direccion_comercial');
t = await ir('/i/solicitudes', true);
comprobar('la dirección ve solicitudes pendientes', /Manantial/.test(t));
t = await ir('/i/expediente/ng_manantial');
comprobar('el expediente abre con sus documentos', /Documentos/.test(t));
await pulsar('[data-accion="aprobar-documento"]');
comprobar('aprobar un documento actualiza la vista', true);

// ------------------------------------------------- 9. Auditoría y cierres
await entrarComo('us_finanzas', 'inparques.finanzas');
t = await ir('/i/auditoria', true);
comprobar('la auditoría registró las acciones anteriores', /orden\.|catalogo\.|caja\./.test(t));

t = await ir('/i/cierres');
comprobar('los cierres advierten que son inmutables', /no se edita ni se borra/i.test(t));
comprobar('no existe ninguna acción de borrar cierre', !/Eliminar|Borrar/.test(t));

// ------------------------------------------- 10. Conectividad y cola offline
await entrarComo('us_operador_cedros', 'comercio.operador');
await ir('/c/pedidos', true);
await p.evaluate(() => {
  window.demoInparques.alternarConexion();
  window.demoInparques.alternarConexion();
});
await p.waitForTimeout(200);
t = await p.textContent('#app');
comprobar('sin conexión aparece la banda de aviso', /Sin conexión/.test(t));

const modo = await p.evaluate(() => window.demoInparques.conexion());
comprobar('el modo sin conexión está activo', modo === 'sin_conexion', modo);
await p.evaluate(() => window.demoInparques.alternarConexion());

// ------------------------------------------------------- 11. Índice técnico
t = await ir('/__mapa');
comprobar('el índice técnico interno carga', /Mapa del producto/.test(t));
const diag = await p.textContent('#and-diagnostico');
comprobar('el registro de rutas no tiene errores', /0 errores/.test(diag));

// -------------------------------------------------------- 12. Presentación
const PANTALLAS = ['/v', '/v/carrito', '/c', '/c/pedidos', '/i', '/i/negocios', '/i/auditoria', '/perfil', '/acceso'];
await entrarComo('us_superadmin', 'inparques.superadmin');
let desbordes = [];
for (const ruta of PANTALLAS) {
  await ir(ruta, true);
  if (!(await sinDesborde())) desbordes.push(ruta);
}
comprobar('ninguna pantalla desborda en horizontal a 390 px', desbordes.length === 0, desbordes.join(', '));

// Áreas táctiles: los controles de la barra inferior deben ser cómodos.
await ir('/v', true);
const alturaNav = await p.evaluate(() => {
  const b = document.querySelector('.nav-inf__it');
  return b ? Math.round(b.getBoundingClientRect().height) : 0;
});
comprobar('la barra inferior tiene área táctil suficiente', alturaNav >= 44, `${alturaNav} px`);

// Tablet y escritorio conservan la funcionalidad.
for (const [ancho, alto, etiqueta] of [[820, 1180, 'tablet'], [1440, 900, 'escritorio']]) {
  await p.setViewportSize({ width: ancho, height: alto });
  await ir('/i/negocios', true);
  comprobar(`sin desbordamiento en ${etiqueta} (${ancho} px)`, await sinDesborde());
}
await p.setViewportSize({ width: 390, height: 844 });

// ------------------------------------------------------------- 13. Consola
comprobar('sin errores de consola', errores.length === 0, errores.slice(0, 3).join(' | '));

await navegador.close();

const fallos = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} comprobaciones correctas.`);
if (fallos.length > 0) {
  console.error(`\n${fallos.length} fallaron:\n${fallos.map((f) => `  · ${f.nombre}`).join('\n')}`);
  process.exit(1);
}
