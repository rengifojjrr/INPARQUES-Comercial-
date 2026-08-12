/**
 * Vistas del panel institucional INPARQUES, portadas del HTML real de
 * Stitch. Estas pantallas se diseñaron sin ninguna conducta responsive
 * (barra lateral y cabecera fijas, `ml-72`/`pl-80` sin variantes `md:`),
 * asumiendo escritorio siempre. La superficie INPARQUES es "desktop-priority"
 * según el encargo, pero igual debe funcionar en un teléfono: se le aplica
 * el mismo cajón móvil que al resto (`conCajonMovil`) y se agregan los
 * prefijos `lg:` que le faltan a la cabecera y al contenido para que no
 * queden desplazados por una barra lateral invisible en móvil.
 */

import { esc } from '../componentes';
import { conCajonMovil } from '../stitch-shell';
import { avatar } from '../stitch-comun';
import type { Pagina, Render } from './tipos';
import { store } from '../../data/store';
import { sesion } from '../../app/session';
import { formatearVes, formatearUsd } from '../../domain/money';
import { diasHasta, desde } from '../formato';
import { resolverAmbito, filtrarPorAmbito } from '../../domain/scope';
import { consultar } from '../../data/audit';
import { conectividad } from '../../net/connectivity';
import { colaSincronizacion } from '../../net/sync-queue';

function barraLateralInparques(activo: string, items: Array<[string, string, string]>, subtitulo: string): string {
  return `
<aside class="bg-surface border-r border-outline-variant flex flex-col h-screen fixed left-0 top-0 overflow-y-auto px-xs py-md w-72 z-50">
  <div class="px-md pb-lg mb-md border-b border-outline-variant">
    <div class="flex items-center gap-md">
      <div class="w-12 h-12 bg-primary text-on-primary rounded-lg flex items-center justify-center">
        <span class="material-symbols-outlined text-2xl icon-fill">park</span>
      </div>
      <div>
        <h2 class="font-headline-md text-headline-md font-bold text-primary leading-tight">INPARQUES</h2>
        <p class="font-label-sm text-label-sm text-on-surface-variant">${esc(subtitulo)}</p>
      </div>
    </div>
  </div>
  <nav class="flex flex-col gap-xs flex-1">
    ${items
      .map(
        ([icono, texto, ruta]) => `<button type="button" data-accion="ir" data-valor="${ruta}"
        class="w-full flex items-center gap-md px-md py-sm rounded-r-full ${ruta === activo ? 'text-primary font-bold border-r-4 border-primary bg-surface-variant' : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'} transition-colors duration-200 text-left">
        <span class="material-symbols-outlined ${ruta === activo ? 'icon-fill' : ''}">${icono}</span>
        <span class="font-label-md text-label-md">${esc(texto)}</span>
      </button>`,
      )
      .join('')}
  </nav>
</aside>`;
}

function cabeceraInparques(titulo: string, nombreUsuario: string): string {
  return `
<header class="bg-white border-b border-outline-variant shadow-sm flex justify-between items-center w-full h-16 pl-16 lg:pl-80 pr-lg fixed top-0 z-40">
  <h1 class="font-headline-sm text-headline-sm font-bold text-primary truncate">${esc(titulo)}</h1>
  <div class="flex items-center gap-sm">
    <button type="button" data-accion="ir" data-valor="/notificaciones" class="w-touch-target h-touch-target flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors relative">
      <span class="material-symbols-outlined">notifications</span>
    </button>
    <button type="button" data-accion="ir" data-valor="/perfil/accesibilidad" class="w-touch-target h-touch-target hidden sm:flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors">
      <span class="material-symbols-outlined">verified_user</span>
    </button>
    <button type="button" data-accion="ir" data-valor="/perfil">${avatar(nombreUsuario, 'w-10 h-10 text-[13px]')}</button>
  </div>
</header>`;
}

// ---------------------------------------------------------------- Superadmin

const NAV_SUPERADMIN: Array<[string, string, string]> = [
  ['dashboard', 'Inicio nacional', '/i'],
  ['account_tree', 'Estructura territorial', '/i/territorio'],
  ['park', 'Parques', '/i/parques'],
  ['business_center', 'Negocios', '/i/negocios'],
  ['person_outline', 'Usuarios y roles', '/i/usuarios'],
  ['gavel', 'Reglas globales', '/i/reglas'],
  ['extension', 'Integraciones', '/i/integraciones'],
  ['history', 'Auditoría', '/i/auditoria'],
  ['security', 'Sesiones', '/i/sesiones'],
  ['settings', 'Ámbitos', '/i/ambitos'],
];

export const superadminInicio: Render = (): Pagina => {
  const e = store.leer();
  const u = sesion.usuario()!;

  const parquesActivos = e.parques.filter((p) => p.activo).length;
  const activos = e.negocios.filter((n) => n.estado === 'activo').length;
  const suspendidos = e.negocios.filter((n) => n.estado === 'suspendido').length;
  const ocupados = e.puntos.filter((p) => p.estado === 'ocupado').length;
  const capacidad = e.puntos.length ? Math.round((ocupados / e.puntos.length) * 100) : 0;

  const hoy = new Date().toISOString().slice(0, 7);
  const ingresosMesVes = e.ordenes
    .filter((o) => o.estado === 'entregada' && o.creadaEn.slice(0, 7) === hoy)
    .reduce((s, o) => s + o.totalVes, 0);
  const ordenesEntregadas = e.ordenes.filter((o) => o.estado === 'entregada').length;
  const liquidacionesPendientes = e.liquidaciones.filter((l) => !['conciliada', 'cerrada'].includes(l.estado)).length;

  const porZona = e.zonas.map((z) => {
    const puntos = e.puntos.filter((p) => p.zonaId === z.id).map((p) => p.id);
    const locales = e.locales.filter((l) => puntos.includes(l.puntoId));
    const negociosUnicos = new Set(locales.map((l) => l.negocioId));
    return { zona: z, negocios: negociosUnicos.size };
  }).sort((a, b) => b.negocios - a.negocios);

  const permisosPorVencer = e.permisos
    .filter((p) => p.estado === 'vigente' && diasHasta(p.hasta) <= 7 && diasHasta(p.hasta) >= 0)
    .length;
  const incidenciasAbiertas = e.incidencias.filter((i) => i.estado === 'abierta').length;

  const alertas: Array<{ titulo: string; detalle: string; color: string }> = [];
  if (permisosPorVencer > 0) {
    alertas.push({
      titulo: `Concesiones por vencer (${permisosPorVencer})`,
      detalle: 'Permisos vigentes que vencen dentro de los próximos 7 días en todo el territorio.',
      color: 'border-error',
    });
  }
  if (suspendidos > 0) {
    alertas.push({
      titulo: `Negocios suspendidos (${suspendidos})`,
      detalle: 'Negocios con estado suspendido que requieren revisión de la dirección comercial.',
      color: 'border-error',
    });
  }
  if (incidenciasAbiertas > 0) {
    alertas.push({
      titulo: `Incidencias abiertas (${incidenciasAbiertas})`,
      detalle: 'Reportes de inspectores y guardaparques todavía sin atender.',
      color: 'border-[#FFA500]',
    });
  }

  const contenido = `
${conCajonMovil(barraLateralInparques('/i', NAV_SUPERADMIN, 'Superadministrador nacional'))}
${cabeceraInparques('INPARQUES Control Panel', u.nombre)}
<main class="lg:ml-72 pt-16 p-lg">
  <div class="mb-xl flex flex-col sm:flex-row justify-between sm:items-end gap-md">
    <div>
      <h2 class="font-display-lg text-headline-lg-mobile lg:text-display-lg text-on-surface mb-xs">Panorama nacional</h2>
      <p class="font-body-lg text-body-lg text-on-surface-variant">Estado integral de todos los parques y la actividad comercial.</p>
    </div>
    <button type="button" data-accion="ir" data-valor="/i/reportes" class="h-touch-target px-md rounded-full bg-primary-container text-on-primary flex items-center gap-sm hover:opacity-90 transition-opacity self-start">
      <span class="material-symbols-outlined">download</span>
      <span class="font-label-md text-label-md">Ir a reportes</span>
    </button>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-4 gap-lg mb-xl">
    <div class="col-span-1 md:col-span-2 bg-white rounded-xl border border-outline-variant p-lg shadow-sm flex flex-col justify-between relative overflow-hidden">
      <div class="absolute -right-10 -top-10 opacity-5"><span class="material-symbols-outlined text-[160px]">park</span></div>
      <div>
        <h3 class="font-label-md text-label-md text-on-surface-variant flex items-center gap-sm mb-sm">
          <span class="material-symbols-outlined text-primary">public</span>
          Parques activos
        </h3>
        <div class="font-display-lg text-display-lg text-primary">${parquesActivos}</div>
      </div>
      <div class="flex items-end justify-between mt-lg">
        <button type="button" data-accion="ir" data-valor="/i/parques" class="text-primary hover:underline font-label-sm text-label-sm">Ver parques</button>
      </div>
    </div>
    <div class="bg-white rounded-xl border border-outline-variant p-lg shadow-sm flex flex-col justify-between">
      <div>
        <h3 class="font-label-md text-label-md text-on-surface-variant flex items-center gap-sm mb-sm">
          <span class="material-symbols-outlined text-secondary">storefront</span>
          Negocios registrados
        </h3>
        <div class="font-headline-lg text-headline-lg text-on-surface">${e.negocios.length}</div>
      </div>
      <div class="flex gap-sm mt-md">
        <span class="px-sm py-xs bg-secondary-fixed text-on-secondary-fixed rounded-md font-label-sm text-label-sm flex-1 text-center">${activos} activos</span>
        <span class="px-sm py-xs bg-error-container text-on-error-container rounded-md font-label-sm text-label-sm flex-1 text-center">${suspendidos} suspendidos</span>
      </div>
    </div>
    <div class="bg-white rounded-xl border border-outline-variant p-lg shadow-sm flex flex-col justify-between">
      <div>
        <h3 class="font-label-md text-label-md text-on-surface-variant flex items-center gap-sm mb-sm">
          <span class="material-symbols-outlined text-primary">location_on</span>
          Puntos ocupados
        </h3>
        <div class="font-headline-lg text-headline-lg text-on-surface">${ocupados} <span class="text-label-md text-on-surface-variant">/ ${e.puntos.length}</span></div>
      </div>
      <div class="mt-md">
        <div class="w-full bg-surface-variant rounded-full h-2 mb-xs"><div class="bg-primary h-2 rounded-full" style="width:${capacidad}%"></div></div>
        <p class="font-label-sm text-label-sm text-on-surface-variant text-right">${capacidad}% de capacidad</p>
      </div>
    </div>
    <div class="col-span-1 md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-lg">
      <div class="bg-white rounded-xl border border-outline-variant p-lg shadow-sm flex items-center gap-md">
        <div class="w-12 h-12 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary"><span class="material-symbols-outlined">payments</span></div>
        <div>
          <p class="font-label-sm text-label-sm text-on-surface-variant">Ingresos del mes</p>
          <p class="font-headline-md text-headline-md text-on-surface">${esc(formatearVes(ingresosMesVes))}</p>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-outline-variant p-lg shadow-sm flex items-center gap-md">
        <div class="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary"><span class="material-symbols-outlined">receipt_long</span></div>
        <div>
          <p class="font-label-sm text-label-sm text-on-surface-variant">Pedidos entregados</p>
          <p class="font-headline-md text-headline-md text-on-surface">${ordenesEntregadas}</p>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-outline-variant p-lg shadow-sm flex items-center gap-md">
        <div class="w-12 h-12 rounded-full bg-error-container flex items-center justify-center text-error"><span class="material-symbols-outlined">warning</span></div>
        <div>
          <p class="font-label-sm text-label-sm text-on-surface-variant">Liquidaciones pendientes</p>
          <p class="font-headline-md text-headline-md text-on-surface">${liquidacionesPendientes}</p>
        </div>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-lg">
    <div class="lg:col-span-2 bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
      <div class="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
        <h3 class="font-headline-md text-headline-md text-on-surface">Zonas con más actividad comercial</h3>
        <button type="button" data-accion="ir" data-valor="/i/territorio" class="font-label-md text-label-md text-primary hover:underline">Ver territorio</button>
      </div>
      <ul class="p-md space-y-sm">
        ${porZona.length === 0
          ? '<li class="font-body-md text-body-md text-on-surface-variant">Sin zonas registradas.</li>'
          : porZona
              .map(
                ({ zona, negocios }) => `<li class="flex justify-between items-center p-sm rounded-lg hover:bg-surface-container-lowest">
                <span class="font-body-md text-body-md flex items-center gap-xs"><span class="w-2 h-2 rounded-full bg-primary"></span> ${esc(zona.nombre)}</span>
                <span class="font-label-sm text-label-sm text-on-surface-variant">${negocios} negocio${negocios === 1 ? '' : 's'}</span>
              </li>`,
              )
              .join('')}
      </ul>
    </div>
    <div class="bg-white rounded-xl border border-outline-variant shadow-sm flex flex-col">
      <div class="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
        <h3 class="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
          <span class="material-symbols-outlined text-error">error</span>
          Alertas críticas
        </h3>
        ${alertas.length ? `<span class="px-sm py-xs bg-error-container text-on-error-container rounded-full font-label-sm text-label-sm">${alertas.length}</span>` : ''}
      </div>
      <div class="flex-1 overflow-y-auto p-md space-y-md bg-surface-container-lowest">
        ${alertas.length === 0
          ? '<p class="font-body-md text-body-md text-on-surface-variant">Sin alertas activas.</p>'
          : alertas
              .map(
                (a) => `<div class="p-md rounded-lg border-l-4 ${a.color} bg-surface flex flex-col gap-sm">
                <h4 class="font-label-md text-label-md text-on-surface">${esc(a.titulo)}</h4>
                <p class="font-body-sm text-body-sm text-on-surface-variant">${esc(a.detalle)}</p>
              </div>`,
              )
              .join('')}
      </div>
    </div>
  </div>
</main>`;

  return { titulo: 'INPARQUES Control Panel', standalone: true, contenido };
};

// ----------------------------------------------------------- Dirección comercial

/**
 * Rutas reales que este rol puede abrir (`INP_CONCESIONES` en
 * app/registry.ts): ni "Inspecciones" (`/i/inspecciones`, solo
 * superadmin/inspector/admin_parque) ni "Configuración" apuntan al literal
 * del HTML original (`/i/ajustes` son solicitudes de ajuste financiero, no
 * ajustes generales, y tampoco está en su lista de acceso) — se enlazan a
 * la página accesible más cercana en vez de a una ruta que le daría 403.
 * "Expedientes" tampoco tiene una lista propia (`/i/expediente/:negocioId`
 * exige un negocio); usa la misma página que "Solicitudes", que ya cubre
 * ambos conceptos ("Solicitudes y expedientes" en el registro de rutas).
 */
const NAV_DIRECCION: Array<[string, string, string]> = [
  ['dashboard', 'Resumen Comercial', '/i'],
  ['description', 'Solicitudes', '/i/solicitudes'],
  ['folder_open', 'Expedientes', '/i/solicitudes'],
  ['assignment_turned_in', 'Contratos y Permisos', '/i/contratos'],
  ['map', 'Puntos Comerciales', '/i/puntos'],
  ['monetization_on', 'Condiciones Económicas', '/i/canones'],
  ['history', 'Prórrogas', '/i/vencimientos'],
  ['verified_user', 'Inspecciones', '/i/reportes'],
  ['analytics', 'Reportes', '/i/reportes'],
  ['settings', 'Configuración', '/perfil/accesibilidad'],
];

export const direccionComercialInicio: Render = (): Pagina => {
  const e = store.leer();
  const u = sesion.usuario()!;
  const a = resolverAmbito(u, e);
  const alcanceAmplio = u.scope.level === 'region' || u.scope.level === 'nacional';

  const negociosAmbito = e.negocios.filter((n) => {
    if (a.negocioIds.includes(n.id)) return true;
    const sinLocal = !e.locales.some((l) => l.negocioId === n.id);
    return sinLocal && alcanceAmplio && ['en_revision', 'borrador'].includes(n.estado);
  });
  const solicitudesNuevas = negociosAmbito.filter((n) => n.estado === 'borrador').length;
  const solicitudesRevision = negociosAmbito.filter((n) => n.estado === 'en_revision').length;

  const puntosAmbito = filtrarPorAmbito(e.puntos, a);
  const ocupados = puntosAmbito.filter((p) => p.estado === 'ocupado').length;
  const capacidad = puntosAmbito.length ? Math.round((ocupados / puntosAmbito.length) * 100) : 0;

  const permisosAmbito = filtrarPorAmbito(e.permisos, a);
  const porVencer = permisosAmbito.filter((p) => p.estado === 'vigente' && diasHasta(p.hasta) <= 30 && diasHasta(p.hasta) >= 0);
  const suspendidos = permisosAmbito.filter((p) => p.estado === 'suspendido').length;

  const contratosAmbito = filtrarPorAmbito(e.contratos, a).filter((c) => c.estado === 'vigente');
  const canonProyectadoUsd = contratosAmbito.reduce((s, c) => s + c.canonFijoUsd, 0);

  type Tarea = { titulo: string; detalle: string; estado: string; color: string; ruta: string };
  const tareas: Tarea[] = [];
  for (const p of porVencer.slice(0, 3)) {
    const n = e.negocios.find((x) => x.id === p.negocioId);
    const dias = diasHasta(p.hasta);
    tareas.push({
      titulo: `Vencimiento de ${p.tipo.replace(/_/g, ' ')} — ${n?.nombreComercial ?? p.numero}`,
      detalle: `Permiso ${p.numero}`,
      estado: dias === 0 ? 'Vence hoy' : `Vence en ${dias} días`,
      color: dias <= 3 ? 'bg-error' : 'bg-tertiary',
      ruta: '/i/vencimientos',
    });
  }
  for (const n of negociosAmbito.filter((x) => x.estado === 'en_revision').slice(0, 2)) {
    tareas.push({
      titulo: `Aprobación pendiente — ${n.nombreComercial}`,
      detalle: `Expediente en revisión`,
      estado: 'En Revisión',
      color: 'bg-primary',
      ruta: `/i/expediente/${n.id}`,
    });
  }

  const actividad = consultar(e, {})
    .filter((ev) => ['negocio', 'contrato', 'permiso'].includes(ev.entidad))
    .sort((x, y) => y.en.localeCompare(x.en))
    .slice(0, 3);

  const contenido = `
${conCajonMovil(barraLateralInparques('/i', NAV_DIRECCION, 'Dirección comercial'))}
${cabeceraInparques('Parques Nacionales | Dirección Comercial', u.nombre)}
<main class="lg:ml-72 pt-16 p-lg lg:p-xl">
  <div class="mb-lg">
    <h2 class="font-headline-lg text-headline-lg text-on-background mb-xs">Resumen Comercial</h2>
    <p class="text-on-surface-variant font-body-md text-body-md">Panorama general de gestión y puntos de concesión.</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mb-xl">
    <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm hover:shadow-md transition-shadow">
      <div class="flex justify-between items-start mb-md">
        <div>
          <p class="font-label-md text-label-md text-on-surface-variant">Solicitudes</p>
          <h3 class="font-display-lg text-display-lg text-on-background mt-xs">${negociosAmbito.length}</h3>
        </div>
        <div class="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center"><span class="material-symbols-outlined">description</span></div>
      </div>
      <div class="flex gap-sm text-sm">
        <span class="flex items-center gap-xs text-primary"><span class="material-symbols-outlined text-[16px]">fiber_new</span> ${solicitudesNuevas} Nuevas</span>
        <span class="text-outline">|</span>
        <span class="flex items-center gap-xs text-tertiary"><span class="material-symbols-outlined text-[16px]">pending</span> ${solicitudesRevision} Revisión</span>
      </div>
    </div>
    <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm hover:shadow-md transition-shadow">
      <div class="flex justify-between items-start mb-md">
        <div>
          <p class="font-label-md text-label-md text-on-surface-variant">Puntos Comerciales</p>
          <h3 class="font-display-lg text-display-lg text-on-background mt-xs">${capacidad}%</h3>
        </div>
        <div class="w-10 h-10 rounded-full bg-tertiary-container text-on-tertiary flex items-center justify-center"><span class="material-symbols-outlined">map</span></div>
      </div>
      <div class="w-full bg-surface-container-highest rounded-full h-2 mb-sm"><div class="bg-primary h-2 rounded-full" style="width:${capacidad}%"></div></div>
      <div class="flex justify-between font-label-sm text-label-sm">
        <span class="text-on-surface-variant">${ocupados} Ocupados</span>
        <span class="text-error">${puntosAmbito.length - ocupados} Vacantes</span>
      </div>
    </div>
    <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm hover:shadow-md transition-shadow">
      <div class="flex justify-between items-start mb-md">
        <div>
          <p class="font-label-md text-label-md text-on-surface-variant">Estado de Permisos</p>
          <h3 class="font-display-lg text-display-lg text-on-background mt-xs">${porVencer.length}</h3>
        </div>
        <div class="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center"><span class="material-symbols-outlined">warning</span></div>
      </div>
      <p class="font-label-sm text-label-sm text-on-surface-variant mb-xs">Por vencer (próximos 30 días)</p>
      <div class="flex gap-sm mt-auto">
        <span class="bg-error/10 text-error px-xs py-[2px] rounded font-label-sm text-label-sm">${suspendidos} Suspendidos</span>
      </div>
    </div>
    <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      <div class="absolute -right-4 -top-4 w-24 h-24 bg-primary-fixed/20 rounded-full blur-xl"></div>
      <div class="flex justify-between items-start mb-md relative z-10">
        <div>
          <p class="font-label-md text-label-md text-on-surface-variant">Canon Proyectado (Mes)</p>
          <h3 class="font-headline-lg text-headline-lg text-on-background mt-xs">${esc(formatearUsd(canonProyectadoUsd))}</h3>
        </div>
        <div class="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center"><span class="material-symbols-outlined">trending_up</span></div>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-lg">
    <div class="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm flex flex-col">
      <div class="p-lg border-b border-outline-variant flex justify-between items-center">
        <h3 class="font-headline-md text-headline-md text-on-background flex items-center gap-sm"><span class="material-symbols-outlined text-primary">priority</span> Bandeja Priorizada</h3>
        <button type="button" data-accion="ir" data-valor="/i/vencimientos" class="text-primary font-label-md text-label-md hover:underline min-h-[44px] px-sm">Ver todas</button>
      </div>
      <div class="flex-1 p-md space-y-sm">
        ${tareas.length === 0
          ? '<p class="font-body-md text-body-md text-on-surface-variant p-sm">Sin tareas pendientes en su ámbito.</p>'
          : tareas
              .map(
                (t) => `<button type="button" data-accion="ir" data-valor="${t.ruta}" class="w-full p-md rounded-lg border border-outline-variant bg-surface hover:shadow-md transition-shadow cursor-pointer flex gap-md items-start text-left">
                <div class="w-2 h-full min-h-[40px] ${t.color} rounded-full shrink-0"></div>
                <div class="flex-1">
                  <div class="flex justify-between items-start mb-xs gap-sm">
                    <h4 class="font-label-md text-label-md text-on-background">${esc(t.titulo)}</h4>
                    <span class="bg-error/10 text-error px-sm py-[2px] rounded-full font-label-sm text-label-sm whitespace-nowrap">${esc(t.estado)}</span>
                  </div>
                  <p class="text-on-surface-variant text-sm">${esc(t.detalle)}</p>
                </div>
              </button>`,
              )
              .join('')}
      </div>
    </div>
    <div class="bg-surface-container border border-outline-variant rounded-lg p-lg shadow-sm flex flex-col">
      <h3 class="font-headline-md text-headline-md text-on-background mb-md">Actividad Reciente</h3>
      <div class="relative pl-md border-l-2 border-surface-dim space-y-md flex-1">
        ${actividad.length === 0
          ? '<p class="font-body-md text-body-md text-on-surface-variant">Sin actividad reciente.</p>'
          : actividad
              .map(
                (ev) => `<div class="relative">
                <div class="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-surface-container"></div>
                <p class="font-label-md text-label-md text-on-background">${esc(ev.accion)}</p>
                <p class="text-sm text-on-surface-variant">${esc(ev.usuarioNombre)}</p>
                <p class="text-xs text-outline mt-1">${esc(desde(ev.en))}</p>
              </div>`,
              )
              .join('')}
      </div>
      <button type="button" data-accion="ir" data-valor="/i/auditoria" class="mt-md w-full border border-outline-variant text-on-surface font-label-md text-label-md py-xs rounded hover:bg-surface-container-lowest min-h-[44px]">Ver historial completo</button>
    </div>
  </div>
</main>`;

  return { titulo: 'Resumen Comercial', standalone: true, contenido };
};

// ------------------------------------------------------------------ Finanzas

const NAV_FINANZAS: Array<[string, string, string]> = [
  ['dashboard', 'Financial Overview', '/i'],
  ['payments', 'Sales', '/i/contabilidad'],
  ['account_balance', 'Reconciliation', '/i/conciliacion'],
  ['percent', 'Fees/Commissions', '/i/canones'],
  ['receipt_long', 'Accounts Receivable', '/i/cuentas-por-cobrar'],
  ['inventory_2', 'Daily Closings', '/i/cierres'],
  ['undo', 'Refunds', '/i/reembolsos'],
  ['edit_document', 'Adjustments', '/i/ajustes'],
  ['verified_user', 'Audit', '/i/auditoria'],
  ['file_export', 'Exports', '/i/reportes'],
];

export const finanzasInicio: Render = (): Pagina => {
  const e = store.leer();
  const u = sesion.usuario()!;

  const ordenesRegistradas = e.ordenes.filter((o) => o.estado !== 'cancelada');
  const gmvVes = ordenesRegistradas.reduce((s, o) => s + o.totalVes, 0);

  const confirmadosVes = e.pagos.filter((p) => p.estado === 'confirmado').reduce((s, p) => s + p.montoVes, 0);
  const negociosConciliados = new Set(
    e.liquidaciones.filter((l) => l.estado === 'conciliada' || l.estado === 'cerrada').map((l) => l.negocioId),
  );
  const conciliadosVes = e.pagos
    .filter((p) => p.estado === 'confirmado')
    .filter((p) => {
      const o = e.ordenes.find((x) => x.id === p.ordenId);
      return o && negociosConciliados.has(o.negocioId);
    })
    .reduce((s, p) => s + p.montoVes, 0);
  const pctConfirmados = gmvVes > 0 ? Math.min(100, Math.round((confirmadosVes / gmvVes) * 100)) : 0;
  const pctConciliados = gmvVes > 0 ? Math.min(100, Math.round((conciliadosVes / gmvVes) * 100)) : 0;

  const diferenciasVes = e.turnos.reduce((s, t) => s + Math.abs(t.diferenciaVes ?? 0), 0);
  const reembolsosVes = e.reembolsos.reduce((s, r) => s + r.montoUsd * e.tasaBcv.valor, 0);

  const devengadaUsd = e.liquidaciones.reduce((s, l) => s + l.comisionUsd + l.canonUsd, 0);
  const cobradaUsd = e.liquidaciones
    .filter((l) => l.estado === 'conciliada' || l.estado === 'cerrada')
    .reduce((s, l) => s + l.comisionUsd + l.canonUsd, 0);
  const porCobrarUsd = e.liquidaciones
    .filter((l) => l.estado === 'por_cobrar')
    .reduce((s, l) => s + l.comisionUsd + l.canonUsd, 0);

  const mesActual = new Intl.DateTimeFormat('es-VE', { month: 'long', year: 'numeric' }).format(new Date());

  const contenido = `
${conCajonMovil(barraLateralInparques('/i', NAV_FINANZAS, 'Audit & Finance Panel'))}
${cabeceraInparques('Financial Audit Management', u.nombre)}
<main class="lg:ml-72 pt-16 p-md lg:p-lg">
  <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-md mb-xl">
    <div>
      <h2 class="font-headline-lg text-headline-lg text-on-surface mb-xs">Dashboard nacional</h2>
      <p class="font-body-md text-body-md text-on-surface-variant">Desempeño financiero consolidado de todas las áreas protegidas.</p>
    </div>
    <div class="flex flex-wrap gap-sm items-center">
      <div class="flex items-center gap-xs bg-surface-container-lowest border border-outline-variant rounded-lg px-md h-touch-target">
        <span class="font-label-md text-label-md text-on-surface">Alcance: Nacional</span>
      </div>
      <div class="flex items-center gap-xs bg-surface-container-lowest border border-outline-variant rounded-lg px-md h-touch-target">
        <span class="material-symbols-outlined text-on-surface-variant">calendar_today</span>
        <span class="font-label-md text-label-md text-on-surface capitalize">${esc(mesActual)}</span>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-lg mb-xl">
    <div class="col-span-1 md:col-span-2 xl:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col justify-between">
      <div class="flex items-center gap-sm mb-xl">
        <div class="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center"><span class="material-symbols-outlined">trending_up</span></div>
        <h3 class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Valor Bruto de Mercancía (GMV)</h3>
      </div>
      <div>
        <div class="flex items-baseline gap-sm"><span class="font-display-lg text-display-lg text-on-surface">${esc(formatearVes(gmvVes))}</span></div>
        <p class="font-body-md text-body-md text-on-surface-variant mt-xs">Valor total de todas las transacciones comerciales registradas, sin contar canceladas.</p>
      </div>
    </div>
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col justify-between">
      <h3 class="font-label-md text-label-md text-on-surface-variant mb-md">Estado de Pagos</h3>
      <div class="space-y-sm">
        <div>
          <div class="flex justify-between font-label-sm text-label-sm mb-1"><span class="text-on-surface">Confirmados</span><span class="text-primary font-bold">${esc(formatearVes(confirmadosVes))}</span></div>
          <div class="w-full bg-surface-variant rounded-full h-2"><div class="bg-primary h-2 rounded-full" style="width:${pctConfirmados}%"></div></div>
        </div>
        <div>
          <div class="flex justify-between font-label-sm text-label-sm mb-1"><span class="text-on-surface">Conciliados (Banco)</span><span class="text-secondary font-bold">${esc(formatearVes(conciliadosVes))}</span></div>
          <div class="w-full bg-surface-variant rounded-full h-2"><div class="bg-secondary h-2 rounded-full" style="width:${pctConciliados}%"></div></div>
        </div>
      </div>
    </div>
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col justify-between">
      <h3 class="font-label-md text-label-md text-on-surface-variant mb-md">Excepciones</h3>
      <div class="grid grid-cols-2 gap-sm">
        <div class="bg-error-container/20 p-sm rounded-lg border border-error/10">
          <span class="font-label-sm text-label-sm text-error block mb-1">Diferencias de caja</span>
          <span class="font-headline-md text-headline-md text-on-surface">${esc(formatearVes(diferenciasVes))}</span>
        </div>
        <div class="bg-surface-variant p-sm rounded-lg">
          <span class="font-label-sm text-label-sm text-on-surface-variant block mb-1">Reembolsos</span>
          <span class="font-headline-md text-headline-md text-on-surface">${esc(formatearVes(reembolsosVes))}</span>
        </div>
      </div>
    </div>
  </div>

  <h3 class="font-headline-md text-headline-md text-on-surface mb-md">Análisis de Canon / Comisión</h3>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-lg">
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex items-center justify-between">
      <div><span class="font-label-md text-label-md text-on-surface-variant block mb-xs">Devengada (Calculada)</span><span class="font-headline-lg text-headline-lg text-on-surface">${esc(formatearUsd(devengadaUsd))}</span></div>
      <div class="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center text-outline"><span class="material-symbols-outlined">calculate</span></div>
    </div>
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex items-center justify-between">
      <div><span class="font-label-md text-label-md text-on-surface-variant block mb-xs">Cobrada (Efectiva)</span><span class="font-headline-lg text-headline-lg text-primary">${esc(formatearUsd(cobradaUsd))}</span></div>
      <div class="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center"><span class="material-symbols-outlined">account_balance_wallet</span></div>
    </div>
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex items-center justify-between">
      <div><span class="font-label-md text-label-md text-on-surface-variant block mb-xs">Por Cobrar</span><span class="font-headline-lg text-headline-lg text-tertiary">${esc(formatearUsd(porCobrarUsd))}</span></div>
      <div class="w-12 h-12 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center"><span class="material-symbols-outlined">hourglass_empty</span></div>
    </div>
  </div>
</main>`;

  return { titulo: 'Dashboard Financiero Nacional', standalone: true, contenido };
};

// --------------------------------------------------------------- Admin de parque

const ICONO_INCIDENCIA: Record<string, string> = {
  seguridad: 'security',
  higiene: 'cleaning_services',
  permiso: 'description',
  infraestructura: 'construction',
  otro: 'report_problem',
};

/**
 * Rutas accesibles para este rol (`INP_CONTROL` / explícitas en
 * app/registry.ts): "Horarios" no tiene ruta propia en INPARQUES (solo
 * comercio la tiene) y se lleva a Operación; "Usuarios locales" apuntaba a
 * `/i/usuarios`, que en este código es exclusiva de
 * superadmin/dirección comercial, así que se lleva a Reportes en su lugar;
 * "Ajustes" no es configuración general sino solicitudes de ajuste
 * financiero (`INP_FINANZAS`, sin este rol), se lleva al selector de
 * accesibilidad del perfil.
 */
const NAV_ADMIN_PARQUE: Array<[string, string, string]> = [
  ['dashboard', 'Inicio', '/i'],
  ['map', 'Zonas y puntos', '/i/zonas'],
  ['storefront', 'Negocios', '/i/negocios'],
  ['settings_applications', 'Operación', '/i/operacion'],
  ['schedule', 'Horarios', '/i/operacion'],
  ['report_problem', 'Incidencias', '/i/incidencias'],
  ['verified', 'Inspecciones', '/i/inspecciones'],
  ['analytics', 'Desempeño', '/i/reportes'],
  ['badge', 'Usuarios locales', '/i/reportes'],
  ['settings', 'Ajustes', '/perfil/accesibilidad'],
];

export const adminParqueInicio: Render = (): Pagina => {
  const e = store.leer();
  const u = sesion.usuario()!;
  const a = resolverAmbito(u, e);
  const parque = e.parques.find((p) => p.id === u.scope.ids[0]);

  const negociosActivos = e.negocios.filter((n) => (a.nacional || a.negocioIds.includes(n.id)) && n.estado === 'activo').length;
  const hoy = new Date().toISOString().slice(0, 10);
  const ordenesParque = filtrarPorAmbito(e.ordenes, a);
  const pedidosHoy = ordenesParque.filter((o) => o.creadaEn.slice(0, 10) === hoy).length;
  const ventasTotalesVes = ordenesParque.filter((o) => o.estado === 'entregada').reduce((s, o) => s + o.totalVes, 0);

  const puntosParque = filtrarPorAmbito(e.puntos, a);
  const ocupados = puntosParque.filter((p) => p.estado === 'ocupado').length;
  const capacidad = puntosParque.length ? Math.round((ocupados / puntosParque.length) * 100) : 0;

  const incidenciasAbiertas = filtrarPorAmbito(e.incidencias, a).filter((i) => i.estado === 'abierta');
  const haceMediaHora = Date.now() - 30 * 60 * 1000;
  const retrasados = ordenesParque.filter(
    (o) => ['pendiente_aceptacion', 'aceptada', 'preparando'].includes(o.estado) && new Date(o.creadaEn).getTime() < haceMediaHora,
  ).length;

  const contenido = `
${conCajonMovil(barraLateralInparques('/i', NAV_ADMIN_PARQUE, 'Portal Administrativo'))}
${cabeceraInparques(`Gestión de Parques${parque ? ` · ${parque.nombre}` : ''}`, u.nombre)}
<main class="lg:ml-64 pt-16 p-lg bg-background min-h-screen">
  <div class="flex flex-col sm:flex-row justify-between sm:items-end gap-md mb-lg">
    <div>
      <h2 class="font-headline-lg text-headline-lg text-on-surface font-bold">Dashboard</h2>
      <p class="font-body-md text-body-md text-on-surface-variant mt-xs">Resumen general de operaciones del parque.</p>
    </div>
    <div class="flex gap-sm">
      <div class="bg-primary text-on-primary px-sm py-1 rounded-full flex items-center gap-xs font-label-md text-label-md">
        <span class="w-2 h-2 rounded-full bg-on-primary animate-pulse"></span>
        ${parque?.activo ? 'Abierto' : 'Cerrado'}
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-12 gap-lg">
    <div class="col-span-12 md:col-span-3 bg-surface border border-outline-variant rounded-lg p-lg shadow-sm">
      <div class="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-md"><span class="material-symbols-outlined">storefront</span></div>
      <p class="font-label-md text-label-md text-on-surface-variant">Negocios Activos</p>
      <h3 class="font-display-lg text-display-lg text-on-surface">${negociosActivos}</h3>
    </div>
    <div class="col-span-12 md:col-span-3 bg-surface border border-outline-variant rounded-lg p-lg shadow-sm">
      <div class="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-md"><span class="material-symbols-outlined">receipt_long</span></div>
      <p class="font-label-md text-label-md text-on-surface-variant">Pedidos Hoy</p>
      <h3 class="font-display-lg text-display-lg text-on-surface">${pedidosHoy}</h3>
    </div>
    <div class="col-span-12 md:col-span-3 bg-surface border border-outline-variant rounded-lg p-lg shadow-sm">
      <div class="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-md"><span class="material-symbols-outlined">payments</span></div>
      <p class="font-label-md text-label-md text-on-surface-variant">Ventas Totales</p>
      <h3 class="font-headline-lg text-headline-lg font-bold text-on-surface mt-2">${esc(formatearVes(ventasTotalesVes))}</h3>
    </div>
    <div class="col-span-12 md:col-span-3 bg-surface border border-outline-variant rounded-lg p-lg shadow-sm relative overflow-hidden">
      <div class="relative z-10">
        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-md"><span class="material-symbols-outlined">map</span></div>
        <p class="font-label-md text-label-md text-on-surface-variant">Puntos Ocupados</p>
        <h3 class="font-display-lg text-display-lg text-primary">${capacidad}%</h3>
      </div>
      <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-xl"></div>
    </div>

    <div class="col-span-12 md:col-span-4 bg-surface border border-outline-variant rounded-lg p-lg shadow-sm">
      <h3 class="font-headline-md text-headline-md text-on-surface mb-md">Estado Crítico</h3>
      <div class="flex flex-col gap-md">
        <div class="flex justify-between items-center p-md ${incidenciasAbiertas.length ? 'bg-error-container/20 border-error/20' : 'bg-surface-container-low border-outline-variant'} rounded-lg border">
          <div class="flex items-center gap-sm"><span class="material-symbols-outlined ${incidenciasAbiertas.length ? 'text-error' : 'text-on-surface-variant'}">report</span><span class="font-label-md text-label-md text-on-surface">Incidencias Abiertas</span></div>
          <span class="font-headline-md text-headline-md font-bold ${incidenciasAbiertas.length ? 'text-error' : 'text-on-surface'}">${incidenciasAbiertas.length}</span>
        </div>
        <div class="flex justify-between items-center p-md ${retrasados ? 'bg-[#FFF3E0] border-[#FFE0B2]' : 'bg-surface-container-low border-outline-variant'} rounded-lg border">
          <div class="flex items-center gap-sm"><span class="material-symbols-outlined ${retrasados ? 'text-[#E65100]' : 'text-on-surface-variant'}">timer</span><span class="font-label-md text-label-md text-on-surface">Retrasos en Pedidos</span></div>
          <span class="font-headline-md text-headline-md font-bold ${retrasados ? 'text-[#E65100]' : 'text-on-surface'}">${retrasados}</span>
        </div>
      </div>
    </div>

    <div class="col-span-12 md:col-span-8 bg-surface border border-outline-variant rounded-lg p-lg shadow-sm">
      <h3 class="font-headline-md text-headline-md text-on-surface mb-md">Accesos Directos</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-sm">
        <button type="button" data-accion="ir" data-valor="/i/negocios" class="flex flex-col items-center justify-center gap-sm p-md bg-surface-container-low border border-outline-variant rounded-lg hover:bg-surface-container transition-colors h-32">
          <span class="material-symbols-outlined text-[32px] text-primary">store</span><span class="font-label-md text-label-md text-center text-on-surface">Revisar negocio</span>
        </button>
        <button type="button" data-accion="ir" data-valor="/i/operacion" class="flex flex-col items-center justify-center gap-sm p-md bg-surface-container-low border border-outline-variant rounded-lg hover:bg-surface-container transition-colors h-32">
          <span class="material-symbols-outlined text-[32px] text-primary">settings_applications</span><span class="font-label-md text-label-md text-center text-on-surface">Ver operación</span>
        </button>
        <button type="button" data-accion="ir" data-valor="/i/incidencias" class="flex flex-col items-center justify-center gap-sm p-md bg-surface-container-low border border-outline-variant rounded-lg hover:bg-surface-container transition-colors h-32">
          <span class="material-symbols-outlined text-[32px] text-error">warning</span><span class="font-label-md text-label-md text-center text-on-surface">Crear incidencia</span>
        </button>
        <button type="button" data-accion="ir" data-valor="/i/operacion" class="flex flex-col items-center justify-center gap-sm p-md bg-surface-container-low border border-outline-variant rounded-lg hover:bg-surface-container transition-colors h-32">
          <span class="material-symbols-outlined text-[32px] text-primary">edit_calendar</span><span class="font-label-md text-label-md text-center text-on-surface">Gestionar horario especial</span>
        </button>
      </div>
    </div>

    <div class="col-span-12 bg-surface border border-outline-variant rounded-lg p-lg shadow-sm mb-xl">
      <div class="flex justify-between items-center mb-md">
        <h3 class="font-headline-md text-headline-md text-on-surface">Alertas Operativas</h3>
        <button type="button" data-accion="ir" data-valor="/i/incidencias" class="font-label-md text-label-md text-primary hover:underline">Ver todas</button>
      </div>
      <div class="divide-y divide-outline-variant/50">
        ${incidenciasAbiertas.length === 0
          ? '<p class="py-md font-body-md text-body-md text-on-surface-variant">Sin incidencias abiertas en este parque.</p>'
          : incidenciasAbiertas
              .slice(0, 3)
              .map(
                (i) => `<div class="py-md flex items-start gap-md">
                <div class="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[20px]">${ICONO_INCIDENCIA[i.tipo] ?? 'report_problem'}</span></div>
                <div class="flex-1">
                  <h4 class="font-label-md text-label-md text-on-surface capitalize">${esc(i.tipo)}</h4>
                  <p class="font-body-md text-body-md text-on-surface-variant">${esc(i.descripcion)}</p>
                </div>
                <span class="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">${esc(desde(i.creadaEn))}</span>
              </div>`,
              )
              .join('')}
      </div>
    </div>
  </div>
</main>`;

  return { titulo: 'Gestión de Parques', standalone: true, contenido };
};

// ------------------------------------------------------------------ Inspector

/**
 * Fuente: `50/p_gina_1_jornada_de_inspecci_n/code.html` ("Jornada de
 * Inspección - Inparques Ranger"). Es la única de las 119 páginas con
 * `<body class="... md:hidden ...">`: Stitch la diseñó exclusivamente para
 * el teléfono del guardaparque en campo y ni siquiera intentó una versión
 * de escritorio. `md:hidden` en el propio `<body>` dejaría la pantalla
 * completamente en blanco en cualquier ventana ≥768px — no es una
 * preferencia de diseño, es que la interfaz no funciona ahí. Se quita esa
 * clase y, en su lugar, el contenido se centra en una columna de ancho
 * móvil (`md:max-w-md md:mx-auto`) para que siga viéndose como la tarjeta
 * de campo que es, en vez de estirarse a todo el ancho del escritorio.
 */
export const inspectorInicio: Render = (): Pagina => {
  const e = store.leer();
  const u = sesion.usuario()!;
  const a = resolverAmbito(u, e);
  const parque = e.parques.find((p) => p.id === u.scope.ids[0]);

  const incidenciasAmbito = filtrarPorAmbito(e.incidencias, a);
  const tareasPendientes = incidenciasAmbito.filter((i) => ['abierta', 'en_atencion'].includes(i.estado)).length;
  const permisosAmbito = filtrarPorAmbito(e.permisos, a);
  const vencidas = permisosAmbito.filter((p) => p.estado === 'vencido').length;
  const urgentes = incidenciasAmbito.filter((i) => i.tipo === 'seguridad' && i.estado === 'abierta').length;

  const enLinea = conectividad.hayRed();
  const porSincronizar = colaSincronizacion.pendientes().length;

  const contenido = `
<div class="md:max-w-md md:mx-auto md:my-lg md:border md:border-outline-variant md:rounded-xl md:overflow-hidden md:shadow-sm">
<header class="bg-surface md:relative fixed md:top-auto top-0 md:w-auto w-full z-40 border-b border-outline-variant flex justify-between items-center px-md h-touch-target">
  <div class="flex items-center gap-sm">
    <div class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border border-outline-variant">
      <span class="material-symbols-outlined text-on-surface-variant text-sm">person</span>
    </div>
    <h1 class="font-headline-md text-headline-md text-primary tracking-tight">Inparques Ranger</h1>
  </div>
  <button type="button" data-accion="ir" data-valor="/perfil/accesibilidad" class="w-touch-target h-touch-target flex items-center justify-center text-primary hover:bg-surface-container-high transition-colors duration-200 rounded-full">
    <span class="material-symbols-outlined">settings</span>
  </button>
</header>
<main class="flex-1 md:pt-lg pt-[72px] pb-[96px] md:pb-lg px-md flex flex-col gap-lg">
  <section class="flex flex-col gap-xs pt-sm">
    <p class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Sector Actual</p>
    <h2 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface flex items-center gap-xs">
      <span class="material-symbols-outlined text-primary icon-fill">park</span>
      ${esc(parque?.nombre ?? 'Parque asignado')}
    </h2>
    <div class="flex flex-wrap gap-sm mt-sm">
      <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${enLinea ? 'bg-secondary-container/40 border-secondary/30' : 'bg-error-container/20 border-error-container'} border">
        <span class="material-symbols-outlined text-[16px] ${enLinea ? 'text-secondary' : 'text-error'}">${enLinea ? 'wifi' : 'wifi_off'}</span>
        <span class="font-label-md text-label-md ${enLinea ? 'text-secondary' : 'text-error'}">${esc(conectividad.etiqueta())}</span>
      </div>
      <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high border border-outline-variant">
        <span class="material-symbols-outlined text-[16px] text-on-surface-variant">cloud_sync</span>
        <span class="font-label-md text-label-md text-on-surface-variant">${porSincronizar} por sincronizar</span>
      </div>
    </div>
  </section>

  <section class="grid grid-cols-2 gap-sm">
    <button type="button" data-accion="ir" data-valor="/i/inspecciones" class="col-span-2 flex items-center justify-center gap-sm bg-primary-container text-on-primary rounded-lg min-h-[64px] shadow-sm hover:shadow-md transition-shadow">
      <span class="material-symbols-outlined text-[24px]">explore</span>
      <span class="font-label-md text-label-md text-lg">Iniciar recorrido</span>
    </button>
    <button type="button" data-accion="ir" data-valor="/i/inspecciones" class="col-span-2 flex items-center justify-center gap-sm bg-surface-container-lowest border border-outline-variant text-on-surface rounded-lg min-h-[56px] shadow-sm hover:bg-surface-container transition-colors">
      <span class="material-symbols-outlined text-[24px] text-primary">qr_code_scanner</span>
      <span class="font-label-md text-label-md">Escanear QR</span>
    </button>
  </section>

  <section class="grid grid-cols-2 gap-sm">
    <button type="button" data-accion="ir" data-valor="/i/incidencias" class="col-span-2 bg-surface-container-lowest border border-outline-variant rounded-lg p-md shadow-sm flex items-center justify-between text-left">
      <div class="flex items-center gap-sm">
        <div class="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container"><span class="material-symbols-outlined">assignment</span></div>
        <div>
          <p class="font-label-sm text-label-sm text-on-surface-variant">TAREAS ASIGNADAS</p>
          <p class="font-headline-md text-headline-md text-on-surface">${tareasPendientes} Pendientes</p>
        </div>
      </div>
      <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
    </button>
    <button type="button" data-accion="ir" data-valor="/i/vencimientos" class="bg-error-container/10 border border-error-container/30 rounded-lg p-md shadow-sm flex flex-col gap-sm text-left">
      <div class="w-8 h-8 rounded-full bg-error text-on-error flex items-center justify-center"><span class="material-symbols-outlined text-sm">schedule</span></div>
      <div>
        <p class="font-headline-md text-headline-md text-error">${vencidas}</p>
        <p class="font-label-sm text-label-sm text-error/80 leading-tight">Permisos<br>Vencidos</p>
      </div>
    </button>
    <button type="button" data-accion="ir" data-valor="/i/incidencias" class="bg-surface-container-lowest border border-error/50 rounded-lg p-md shadow-sm flex flex-col gap-sm relative overflow-hidden text-left">
      <div class="absolute top-0 right-0 w-16 h-16 bg-error/5 rounded-bl-full"></div>
      <div class="w-8 h-8 rounded-full bg-error-container text-on-error-container flex items-center justify-center"><span class="material-symbols-outlined text-sm">report_problem</span></div>
      <div>
        <p class="font-headline-md text-headline-md text-on-surface">${urgentes}</p>
        <p class="font-label-sm text-label-sm text-on-surface-variant leading-tight">Incidentes<br>Urgentes</p>
      </div>
    </button>
  </section>
</main>
<nav class="fixed md:relative bottom-0 md:bottom-auto left-0 md:left-auto w-full z-50 flex justify-around items-center h-xxl bg-surface px-xs pb-safe border-t border-outline-variant shadow-[0_-2px_8px_rgba(40,51,46,0.04)]">
  <a class="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-4 py-1 scale-95 transition-transform duration-150 min-w-[64px] min-h-[44px]" href="#/i">
    <span class="material-symbols-outlined text-[24px] icon-fill">home</span>
    <span class="font-label-sm text-label-sm mt-0.5">Home</span>
  </a>
  <a class="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 hover:bg-surface-container scale-95 transition-transform duration-150 min-w-[64px] min-h-[44px] rounded-full" href="#/i/inspecciones">
    <span class="material-symbols-outlined text-[24px]">qr_code_scanner</span>
    <span class="font-label-sm text-label-sm mt-0.5">Scan</span>
  </a>
  <a class="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 hover:bg-surface-container scale-95 transition-transform duration-150 min-w-[64px] min-h-[44px] rounded-full" href="#/i/inspecciones">
    <span class="material-symbols-outlined text-[24px]">assignment</span>
    <span class="font-label-sm text-label-sm mt-0.5">Inspections</span>
  </a>
  <a class="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 hover:bg-surface-container scale-95 transition-transform duration-150 min-w-[64px] min-h-[44px] rounded-full" href="#/i/incidencias">
    <span class="material-symbols-outlined text-[24px]">report_problem</span>
    <span class="font-label-sm text-label-sm mt-0.5">Incidents</span>
  </a>
  <a class="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 hover:bg-surface-container scale-95 transition-transform duration-150 min-w-[64px] min-h-[44px] rounded-full relative" href="#/conexion/cola">
    <span class="material-symbols-outlined text-[24px]">sync</span>
    ${porSincronizar > 0 ? '<span class="absolute top-1 right-3 w-2 h-2 bg-error rounded-full border border-surface"></span>' : ''}
    <span class="font-label-sm text-label-sm mt-0.5">Sync</span>
  </a>
</nav>
</div>`;

  return { titulo: 'Inparques Ranger', standalone: true, contenido };
};
