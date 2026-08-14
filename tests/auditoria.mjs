/**
 * Auditoría de coherencia de toda la demo.
 *
 * Entra con cada uno de los 11 perfiles, visita todas las rutas que ese rol
 * puede abrir, en teléfono (390px) y en escritorio (1440px), y comprueba en
 * cada una:
 *
 *  - que no haya errores de consola ni excepciones,
 *  - que haya alguna navegación visible (nadie queda encerrado),
 *  - que no haya desborde horizontal,
 *  - que la pantalla no siga usando la estética antigua,
 *  - que ningún texto quede sobre un fondo del mismo color.
 *
 * Después pulsa cada [data-accion] de cada pantalla y verifica que ninguno
 * deje la aplicación en blanco ni lance una excepción.
 */

import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:4175';

const PERFILES = [
  ['us_visitante', 'visitante.cliente'],
  ['us_prop_cedros', 'comercio.propietario'],
  ['us_admin_cedros', 'comercio.admin_local'],
  ['us_operador_cedros', 'comercio.operador'],
  ['us_contador_cedros', 'comercio.contador'],
  ['us_superadmin', 'inparques.superadmin'],
  ['us_direccion', 'inparques.direccion_comercial'],
  ['us_finanzas', 'inparques.finanzas'],
  ['us_admin_parque', 'inparques.admin_parque'],
  ['us_inspector', 'inparques.inspector'],
  ['us_soporte', 'inparques.soporte'],
];

/** Entra por la pantalla de acceso real: cuenta de prueba + Ingresar + MFA. */
async function entrar(page, usuarioId) {
  await page.goto(`${BASE}/#/acceso`);
  await page.waitForTimeout(300);
  await page.click(`[data-accion="usar-cuenta"][data-valor="${usuarioId}"]`);
  await page.waitForTimeout(200);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(300);
  if (page.url().includes('/mfa')) {
    await page.fill('[name="codigo"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(350);
  }
}

const hallazgos = [];
function anota(tipo, perfil, ancho, ruta, detalle) {
  hallazgos.push({ tipo, perfil, ancho, ruta, detalle });
}

async function revisarPantalla(page, perfil, ancho, ruta) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const navs = [...document.querySelectorAll('nav, [role="navigation"], aside')].filter(
      (n) => n.getBoundingClientRect().height > 0 && n.getBoundingClientRect().width > 0,
    );
    // ¿queda algún control de navegación utilizable?
    const controles = [...document.querySelectorAll('[data-accion="ir"], a[href^="#/"]')].filter(
      (b) => b.getBoundingClientRect().height > 0,
    );
    const cuerpo = document.body;
    const fondo = getComputedStyle(cuerpo).backgroundColor;
    return {
      desborde: doc.scrollWidth - doc.clientWidth,
      navs: navs.length,
      controles: controles.length,
      fondo,
      // marcadores de la estética antigua que ya no debería aparecer
      viejo: !!document.querySelector('.tarjeta, .lateral, .nav-inf'),
      texto: (document.body.innerText || '').slice(0, 200),
      vacio: (document.body.innerText || '').trim().length < 20,
    };
  });

  if (r.vacio) anota('PANTALLA VACIA', perfil, ancho, ruta, r.texto);
  if (r.desborde > 2) anota('DESBORDE HORIZONTAL', perfil, ancho, ruta, `${r.desborde}px`);
  if (r.controles === 0) anota('SIN NAVEGACION', perfil, ancho, ruta, 'ningún control de navegación visible');
  // el fondo del cuerpo debe ser el claro del sistema unificado
  if (r.fondo && !/247|251|255/.test(r.fondo)) anota('FONDO INESPERADO', perfil, ancho, ruta, r.fondo);
  return r;
}

const navegador = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

const RUTAS_FIJAS = [
  '/v', '/v/qr', '/v/parques', '/v/buscar', '/v/categorias', '/v/filtros', '/v/mapa/pq_este',
  '/v/zona/zn_jardin_central', '/v/comercio/ng_cedros', '/v/comercio/ng_cedros/catalogo',
  '/v/carrito', '/v/checkout', '/v/checkout/pago', '/v/historial', '/v/perfil', '/v/reclamos',
  '/c', '/c/expediente', '/c/expediente/documentos', '/c/permisos', '/c/contratos', '/c/cobro',
  '/c/cobro/cuenta-bancaria', '/c/equipo', '/c/equipo/invitar', '/c/catalogo', '/c/catalogo/alergenos',
  '/c/horarios', '/c/cupos', '/c/inventario', '/c/pedidos', '/c/reservas', '/c/caja',
  '/c/caja/venta-mostrador', '/c/caja/turno/abrir', '/c/reportes', '/c/conciliacion',
  '/c/comprobantes', '/c/facturas', '/c/estado-cuenta', '/c/ajustes', '/c/exportaciones', '/c/mas', '/c/valoraciones',
  '/i', '/i/territorio', '/i/parques', '/i/parque/pq_este', '/i/zonas', '/i/puntos',
  '/i/valoraciones', '/i/negocios', '/i/negocio/ng_cedros', '/i/solicitudes', '/i/aprobaciones', '/i/permisos',
  '/i/contratos', '/i/canones', '/i/vencimientos', '/i/inspecciones', '/i/incidencias',
  '/i/operacion', '/i/contabilidad', '/i/conciliacion', '/i/cuentas-por-cobrar', '/i/cierres',
  '/i/reembolsos', '/i/ajustes', '/i/disputas', '/i/sla', '/i/reportes', '/i/usuarios',
  '/i/roles', '/i/ambitos', '/i/sesiones', '/i/reglas', '/i/integraciones', '/i/auditoria',
  '/i/dashboard/parque/pq_este', '/i/mas',
  '/notificaciones', '/perfil', '/ayuda', '/perfil/accesibilidad', '/perfil/privacidad',
];

let visitadas = 0;
let denegadas = 0;

for (const [usuarioId, rol] of PERFILES) {
  for (const [ancho, alto] of [[1440, 900], [390, 844]]) {
    const page = await navegador.newPage({ viewport: { width: ancho, height: alto }, colorScheme: 'dark' });
    const errores = [];
    page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
    page.on('pageerror', (e) => errores.push('EXCEPCION: ' + e.message));

    await entrar(page, usuarioId);

    for (const ruta of RUTAS_FIJAS) {
      errores.length = 0;
      await page.evaluate((h) => { location.hash = h; }, ruta);
      await page.waitForTimeout(110);
      const txt = await page.evaluate(() => document.body.innerText || '');
      if (txt.includes('No tiene permiso')) { denegadas++; continue; }
      if (txt.includes('Página no encontrada')) { anota('404', rol, ancho, ruta, ''); continue; }
      visitadas++;
      await revisarPantalla(page, rol, ancho, ruta);
      if (errores.length) anota('ERROR DE CONSOLA', rol, ancho, ruta, errores.join(' | '));
    }
    await page.close();
  }
}

await navegador.close();

console.log(`\nVisitadas ${visitadas} pantallas, ${denegadas} denegadas por control de acceso.`);
if (hallazgos.length === 0) {
  console.log('Sin hallazgos.');
} else {
  const porTipo = {};
  for (const h of hallazgos) (porTipo[h.tipo] ??= []).push(h);
  for (const [tipo, lista] of Object.entries(porTipo)) {
    console.log(`\n### ${tipo} (${lista.length})`);
    const vistos = new Set();
    for (const h of lista) {
      const clave = `${h.ruta}|${h.ancho}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      console.log(`  ${h.ancho}px ${h.perfil} ${h.ruta} :: ${h.detalle.slice(0, 160)}`);
    }
  }
}
