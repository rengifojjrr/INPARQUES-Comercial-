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
