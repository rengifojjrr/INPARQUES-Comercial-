/**
 * Vistas del portal de comercio, portadas del HTML real de Stitch.
 *
 * Fuente: `50/p_gina_1_inicio_y_estado_de_habilitaci_n/code.html`
 * ("Portal de Concesionarios - Dashboard"). Layout de escritorio con barra
 * lateral fija; se le agrega el cajón móvil de `stitch-shell.ts` (ver esa
 * nota) y nada más cambia respecto al original.
 */

import { esc } from '../componentes';
import { conCajonMovil } from '../stitch-shell';
import type { Pagina, Render } from './tipos';
import { store } from '../../data/store';
import { sesion } from '../../app/session';
import { formatearUsd, formatearVes } from '../../domain/money';
import { diasHasta, fechaCorta, desde } from '../formato';
import { ETIQUETA_ORDEN, TONO_ORDEN } from '../../domain/state-machines';
import { conectividad } from '../../net/connectivity';

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

/** Avatar local: iniciales sobre un círculo de color, sin imagen externa. */
function avatar(nombre: string, clases = 'w-8 h-8 text-[11px]'): string {
  return `<div class="${clases} rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold shrink-0">${esc(iniciales(nombre))}</div>`;
}

function barraLateral(activo: string): string {
  const items: Array<[string, string, string]> = [
    ['dashboard', 'Resumen', '/c'],
    ['storefront', 'Negocios y locales', '/c/expediente'],
    ['folder_open', 'Expediente', '/c/expediente'],
    ['groups', 'Equipo', '/c/equipo'],
    ['payments', 'Finanzas', '/c/estado-cuenta'],
    ['settings', 'Configuración', '/c/cobro'],
  ];
  return `
<aside class="h-screen w-64 fixed left-0 top-0 border-r border-outline-variant bg-surface flex flex-col p-md z-50">
  <div class="flex items-center gap-sm mb-xl pt-sm px-2">
    <div class="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container">
      <span class="material-symbols-outlined icon-fill">nature</span>
    </div>
    <div class="flex flex-col">
      <span class="text-label-md font-label-md font-bold text-on-surface">Gestión Comercial</span>
      <span class="text-label-sm font-label-sm text-on-surface-variant">Parques Nacionales</span>
    </div>
  </div>
  <nav class="flex flex-col gap-1 flex-1">
    ${items
      .map(([icono, texto, ruta]) => {
        const on = ruta === activo;
        return `<button type="button" data-accion="ir" data-valor="${esc(ruta)}"
          class="flex items-center gap-3 px-4 py-3 rounded-lg font-bold min-h-[44px] transition-colors text-left w-full ${
            on ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-high'
          }">
          <span class="material-symbols-outlined ${on ? 'icon-fill' : ''}">${esc(icono)}</span>
          <span class="font-label-md text-label-md">${esc(texto)}</span>
        </button>`;
      })
      .join('')}
  </nav>
  <div class="mt-auto border-t border-outline-variant pt-4">
    <button type="button" data-accion="ir" data-valor="/ayuda"
      class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-lg min-h-[44px] w-full text-left">
      <span class="material-symbols-outlined">help</span>
      <span class="font-label-md text-label-md">Ayuda</span>
    </button>
    <button type="button" data-accion="cerrar-sesion"
      class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-lg min-h-[44px] w-full text-left">
      <span class="material-symbols-outlined">logout</span>
      <span class="font-label-md text-label-md">Cambiar de perfil</span>
    </button>
  </div>
</aside>`;
}

function barraSuperior(nombreUsuario: string): string {
  return `
<nav class="h-16 w-full lg:w-[calc(100%-16rem)] fixed top-0 right-0 z-40 border-b border-outline-variant bg-surface flex justify-between items-center pl-16 lg:pl-lg pr-lg shadow-sm">
  <div class="flex items-center gap-md">
    <div class="relative hidden sm:flex items-center">
      <span class="material-symbols-outlined absolute left-3 text-on-surface-variant text-[20px]">search</span>
      <input class="pl-10 pr-4 h-[44px] bg-surface-container-low border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors w-64 placeholder:text-on-surface-variant" placeholder="Buscar..." type="text" />
    </div>
    <span class="text-headline-md font-headline-md font-extrabold text-primary hidden lg:block ml-md">Portal de Concesionarios</span>
  </div>
  <div class="flex items-center gap-sm">
    <button type="button" data-accion="ir" data-valor="/notificaciones" aria-label="Notificaciones" class="w-[44px] h-[44px] flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors">
      <span class="material-symbols-outlined">notifications</span>
    </button>
    <button type="button" data-accion="ir" data-valor="/ayuda" aria-label="Ayuda" class="w-[44px] h-[44px] flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors">
      <span class="material-symbols-outlined">help</span>
    </button>
    <button type="button" data-accion="ir" data-valor="/perfil"
      class="ml-sm flex items-center gap-sm p-1 pr-3 rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors min-h-[44px]">
      ${avatar(nombreUsuario)}
      <span class="font-label-md text-label-md text-on-surface hidden md:block">Perfil</span>
      <span class="material-symbols-outlined text-on-surface-variant text-[18px]">expand_more</span>
    </button>
  </div>
</nav>`;
}

export const propietarioInicio: Render = (): Pagina => {
  const e = store.leer();
  const u = sesion.usuario()!;
  const negocio = e.negocios.find((n) => n.id === u.scope.ids[0]) ?? e.negocios[0];
  const locales = e.locales.filter((l) => l.negocioId === negocio.id);
  const docs = e.documentos.filter((d) => d.negocioId === negocio.id);
  const permisos = e.permisos.filter((p) => p.negocioId === negocio.id);
  const ordenes = e.ordenes.filter((o) => o.negocioId === negocio.id);
  const entregadas = ordenes.filter((o) => o.estado === 'entregada');
  const ventasUsd = entregadas.reduce((s, o) => s + o.totalUsd, 0);
  const tasa = e.tasaBcv.valor;
  const activas = ordenes.filter((o) => !['entregada', 'cancelada'].includes(o.estado));

  const aprobados = docs.filter((d) => d.estado === 'aprobado').length;
  const totalChecklist = Math.max(docs.length, 1);
  const progreso = Math.round((aprobados / totalChecklist) * 100);

  const vencimientos = [
    ...docs.filter((d) => d.vigenciaHasta).map((d) => ({ tipo: d.tipo.replace(/_/g, ' '), hasta: d.vigenciaHasta! })),
    ...permisos.map((p) => ({ tipo: p.tipo.replace(/_/g, ' '), hasta: p.hasta })),
  ]
    .sort((a, b) => a.hasta.localeCompare(b.hasta))
    .slice(0, 3);

  const checklistItems: Array<[string, string, boolean]> = [
    ['badge', 'Identidad', true],
    ['account_balance', 'RIF', true],
    ['description', 'Documentos', docs.every((d) => d.estado === 'aprobado')],
    ['handshake', 'Contrato', permisos.some((p) => p.estado === 'vigente')],
    ['account_balance_wallet', 'Cuenta', Boolean(e.cuentasBancarias.find((c) => c.negocioId === negocio.id)?.verificada)],
    ['inventory_2', 'Catálogo', e.articulos.some((a) => a.negocioId === negocio.id)],
  ];

  const contenido = `
${conCajonMovil(barraLateral('/c'))}
${barraSuperior(u.nombre)}
<main class="lg:ml-64 pt-16 p-lg min-h-screen flex flex-col gap-lg">
  <header class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-sm">
    <div>
      <h1 class="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-on-background mb-1">Buenos días, ${esc(u.nombre.split(' ')[0])}</h1>
      <p class="font-body-md text-body-md text-on-surface-variant">Aquí está el resumen de sus operaciones en ${esc(negocio.nombreComercial)}.</p>
    </div>
    <div class="flex items-center gap-sm ${progreso === 100 ? 'bg-secondary-container/40 border-secondary/30' : 'bg-error-container/20 border-error/30'} border rounded-lg px-4 py-2">
      <span class="material-symbols-outlined ${progreso === 100 ? 'text-secondary' : 'text-error'} text-[20px]">${progreso === 100 ? 'check_circle' : 'warning'}</span>
      <div>
        <span class="block font-label-md text-label-md text-on-surface">${progreso === 100 ? 'Cuenta habilitada' : 'Habilitación en curso'}</span>
        <span class="block font-label-sm text-label-sm ${progreso === 100 ? 'text-secondary' : 'text-error'}">${progreso}% completado</span>
      </div>
    </div>
  </header>

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-lg">
    <section class="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col shadow-[0px_4px_12px_rgba(40,51,46,0.02)]">
      <div class="flex justify-between items-center mb-md">
        <h2 class="font-headline-md text-headline-md text-on-surface">Habilitación Comercial</h2>
        <span class="font-label-md text-label-md bg-surface-variant text-on-surface-variant px-3 py-1 rounded-full">Progreso: ${progreso}%</span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-sm flex-1">
        ${checklistItems
          .map(([icono, texto, ok]) =>
            ok
              ? `<div class="p-4 border border-outline-variant rounded-lg bg-surface flex flex-col justify-between">
                  <div class="flex justify-between items-start mb-2">
                    <span class="material-symbols-outlined text-primary">${esc(icono)}</span>
                    <span class="material-symbols-outlined text-primary icon-fill text-[20px]">check_circle</span>
                  </div>
                  <span class="font-label-md text-label-md text-on-surface">${esc(texto)}</span>
                </div>`
              : `<div class="p-4 border-2 border-error-container rounded-lg bg-error-container/10 flex flex-col justify-between relative overflow-hidden">
                  <div class="absolute right-0 top-0 w-8 h-8 bg-error-container rounded-bl-lg flex items-center justify-center">
                    <span class="material-symbols-outlined text-error text-[16px]">priority_high</span>
                  </div>
                  <div class="flex justify-between items-start mb-2">
                    <span class="material-symbols-outlined text-error">${esc(icono)}</span>
                  </div>
                  <div>
                    <span class="font-label-md text-label-md text-on-surface block">${esc(texto)}</span>
                    <span class="font-label-sm text-label-sm text-error">Por completar</span>
                  </div>
                </div>`,
          )
          .join('')}
      </div>
    </section>

    <section class="lg:col-span-4 flex flex-col gap-sm">
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex-1 shadow-[0px_4px_12px_rgba(40,51,46,0.02)]">
        <h2 class="font-headline-md text-headline-md text-on-surface mb-md">Acciones Rápidas</h2>
        <div class="flex flex-col gap-3">
          <button type="button" data-accion="ir" data-valor="/c/expediente/documentos"
            class="w-full flex items-center justify-center gap-2 bg-primary-container text-on-primary font-label-md text-label-md rounded-lg min-h-[44px] hover:bg-primary transition-colors">
            <span class="material-symbols-outlined text-[20px]">upload_file</span>
            Renovar Documentos
          </button>
          <button type="button" data-accion="ir" data-valor="/c/caja/venta-mostrador"
            class="w-full flex items-center justify-center gap-2 bg-secondary-container text-on-secondary-container font-label-md text-label-md rounded-lg min-h-[44px] hover:bg-secondary hover:text-on-secondary transition-colors">
            <span class="material-symbols-outlined text-[20px]">add_shopping_cart</span>
            Nueva Venta
          </button>
          <button type="button" data-accion="ir" data-valor="/c/catalogo"
            class="w-full flex items-center justify-center gap-2 border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg min-h-[44px] hover:bg-surface-variant transition-colors">
            <span class="material-symbols-outlined text-[20px]">list_alt</span>
            Ver Catálogo
          </button>
        </div>
      </div>
    </section>
  </div>

  <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col gap-2 hover:shadow-[0px_4px_12px_rgba(40,51,46,0.08)] transition-shadow">
      <div class="flex justify-between items-center text-on-surface-variant">
        <span class="font-label-md text-label-md">Ventas del mes</span>
        <span class="material-symbols-outlined">payments</span>
      </div>
      <div class="font-headline-lg text-headline-lg text-on-surface">${esc(formatearVes(ventasUsd * tasa))}</div>
      <div class="flex items-center gap-1 text-primary">
        <span class="material-symbols-outlined text-[16px]">trending_up</span>
        <span class="font-label-sm text-label-sm">${esc(formatearUsd(ventasUsd))} equivalente</span>
      </div>
    </div>
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col gap-2 hover:shadow-[0px_4px_12px_rgba(40,51,46,0.08)] transition-shadow">
      <div class="flex justify-between items-center text-on-surface-variant">
        <span class="font-label-md text-label-md">Órdenes activas</span>
        <span class="material-symbols-outlined">receipt_long</span>
      </div>
      <div class="font-headline-lg text-headline-lg text-on-surface">${activas.length}</div>
      <div class="flex items-center gap-1 text-on-surface-variant">
        <span class="font-label-sm text-label-sm">${entregadas.length} entregadas en total</span>
      </div>
    </div>
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col gap-2 hover:shadow-[0px_4px_12px_rgba(40,51,46,0.08)] transition-shadow">
      <div class="flex justify-between items-center text-on-surface-variant">
        <span class="font-label-md text-label-md">Locales activos</span>
        <span class="material-symbols-outlined">store</span>
      </div>
      <div class="font-headline-lg text-headline-lg text-on-surface">${locales.filter((l) => l.abierto).length} <span class="text-headline-md text-on-surface-variant">/ ${locales.length}</span></div>
      <div class="flex items-center gap-1 ${locales.some((l) => !l.abierto) ? 'text-error' : 'text-primary'}">
        <span class="material-symbols-outlined text-[16px]">${locales.some((l) => !l.abierto) ? 'info' : 'check_circle'}</span>
        <span class="font-label-sm text-label-sm">${locales.some((l) => !l.abierto) ? '1 requiere atención' : 'Todos operando'}</span>
      </div>
    </div>
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col gap-2 hover:shadow-[0px_4px_12px_rgba(40,51,46,0.08)] transition-shadow">
      <div class="flex justify-between items-center text-on-surface-variant">
        <span class="font-label-md text-label-md">Documentos aprobados</span>
        <span class="material-symbols-outlined">account_balance</span>
      </div>
      <div class="font-headline-lg text-headline-lg text-on-surface">${aprobados} <span class="text-headline-md text-on-surface-variant">/ ${docs.length}</span></div>
      <div class="flex items-center gap-1 text-primary">
        <span class="material-symbols-outlined text-[16px]">check_circle</span>
        <span class="font-label-sm text-label-sm">Actualizado hoy</span>
      </div>
    </div>
  </section>

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-lg mb-xl">
    <section class="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-[0px_4px_12px_rgba(40,51,46,0.02)] flex flex-col">
      <div class="flex justify-between items-center mb-6">
        <h2 class="font-headline-md text-headline-md text-on-surface">Pedidos recientes</h2>
      </div>
      ${
        ordenes.length === 0
          ? '<p class="font-body-md text-body-md text-on-surface-variant">Sin pedidos registrados todavía.</p>'
          : `<div class="flex flex-col gap-2">
              ${ordenes
                .slice(0, 5)
                .map(
                  (o) => `<button type="button" data-accion="ir" data-valor="/c/pedido/${esc(o.id)}"
                    class="flex items-center justify-between gap-3 p-3 border border-outline-variant rounded-lg hover:bg-surface-container-high transition-colors text-left w-full">
                    <div>
                      <span class="font-label-md text-label-md text-on-surface block">${esc(o.codigo)}</span>
                      <span class="font-label-sm text-label-sm text-on-surface-variant">${esc(o.clienteNombre)}</span>
                    </div>
                    <span class="font-label-md text-label-md text-on-surface">${esc(formatearUsd(o.totalUsd))}</span>
                  </button>`,
                )
                .join('')}
            </div>`
      }
    </section>
    <section class="lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-[0px_4px_12px_rgba(40,51,46,0.02)]">
      <div class="flex justify-between items-center mb-md">
        <h2 class="font-headline-md text-headline-md text-on-surface">Próximos vencimientos</h2>
        <span class="material-symbols-outlined text-on-surface-variant">event</span>
      </div>
      ${
        vencimientos.length === 0
          ? '<p class="font-body-md text-sm text-on-surface-variant">Sin vencimientos próximos.</p>'
          : `<ul class="flex flex-col gap-3">
              ${vencimientos
                .map((v) => {
                  const dias = diasHasta(v.hasta);
                  const urgente = dias < 15;
                  return `<li class="flex items-start gap-3 p-3 ${urgente ? 'bg-error-container/10 border-error-container' : 'bg-surface border-outline-variant'} border rounded-lg">
                    <span class="material-symbols-outlined ${urgente ? 'text-error' : 'text-on-surface-variant'} mt-0.5">${urgente ? 'warning' : 'description'}</span>
                    <div>
                      <span class="block font-label-md text-label-md text-on-surface capitalize">${esc(v.tipo)}</span>
                      <span class="block font-body-md text-sm ${urgente ? 'text-error font-bold' : 'text-on-surface-variant'}">${dias > 0 ? `Vence en ${dias} días` : 'Vencido'} · ${esc(fechaCorta(`${v.hasta}T12:00:00`))}</span>
                    </div>
                  </li>`;
                })
                .join('')}
            </ul>`
      }
      <button type="button" data-accion="ir" data-valor="/c/expediente" class="w-full mt-4 text-primary font-label-md text-label-md hover:underline text-center">Ver todo el expediente</button>
    </section>
  </div>
</main>`;

  return { titulo: 'Portal de Concesionarios', standalone: true, contenido };
};

// ------------------------------------------------------- Administrador de local

/**
 * Fuente: `50/p_gina_1_resumen_operativo/code.html` ("Parques Nacionales -
 * Resumen Operativo"). A diferencia del Portal de Concesionarios, esta
 * pantalla no tiene barra superior en escritorio: la barra lateral fija va
 * directo al lienzo de contenido, y en móvil aparece una cabecera propia con
 * el botón de menú. Se respeta esa estructura tal cual.
 *
 * El original trae `<main class="flex-1 md:ml-64 w-full ...">`. Ese `w-full`
 * es el mismo tipo de error técnico que el cajón móvil: fuerza el ancho a
 * 100% del contenedor y luego el margen de 256px lo desborda 256px a la
 * derecha (el `<aside>` es `fixed`, así que no cuenta como hermano flex y no
 * hay quien absorba ese margen). Se omite `w-full`; sin él, el ancho se
 * resuelve automáticamente restando el margen, sin desbordar.
 */
function barraLateralAdminLocal(): string {
  const items: Array<[string, string, string]> = [
    ['dashboard', 'Resumen', '/c'],
    ['shopping_cart', 'Pedidos', '/c/pedidos'],
    ['calendar_today', 'Reservas', '/c/reservas'],
    ['menu_book', 'Catálogo', '/c/catalogo'],
    ['event_available', 'Disponibilidad', '/c/cupos'],
    ['account_balance_wallet', 'Caja', '/c/caja'],
    ['payments', 'Ventas', '/c/reportes'],
    ['group', 'Equipo operativo', '/c/equipo'],
    ['settings', 'Configuración del local', '/c/horarios'],
  ];
  return `
<aside class="flex flex-col p-md gap-xs bg-surface-container-low border-r border-outline-variant h-screen w-64 fixed left-0 top-0 z-40">
  <div class="flex items-center gap-sm mb-lg px-xs py-sm">
    <div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center shrink-0 text-on-primary-container">
      <span class="material-symbols-outlined icon-fill">park</span>
    </div>
    <div>
      <h1 class="font-headline-md text-headline-md font-bold text-primary truncate">Portal Admin</h1>
      <p class="font-label-sm text-label-sm text-on-surface-variant truncate">Administración de Parque</p>
    </div>
  </div>
  <nav class="flex-1 overflow-y-auto space-y-base">
    ${items
      .map(
        ([icono, texto, ruta]) => `<button type="button" data-accion="ir" data-valor="${ruta}"
        class="w-full flex items-center gap-sm px-sm py-xs min-h-touch-target ${ruta === '/c' ? 'bg-secondary-container text-on-secondary-container font-bold' : 'text-on-surface-variant hover:bg-surface-variant'} rounded-lg transition-all duration-200 ease-in-out font-label-md text-label-md text-left">
        <span class="material-symbols-outlined" ${ruta === '/c' ? "style=\"font-variation-settings: 'FILL' 1;\"" : ''}>${icono}</span>
        ${esc(texto)}
      </button>`,
      )
      .join('')}
  </nav>
</aside>`;
}

function claseTono(tono: string): string {
  switch (tono) {
    case 'exito': return 'bg-secondary-container/20 text-on-secondary-container';
    case 'error': return 'bg-error-container/20 text-error';
    case 'alerta': return 'bg-tertiary-fixed text-on-tertiary-fixed';
    case 'progreso': return 'bg-primary-fixed-dim/40 text-on-primary-fixed-variant';
    default: return 'bg-surface-variant text-on-surface-variant';
  }
}

export const adminLocalInicio: Render = (): Pagina => {
  const e = store.leer();
  const u = sesion.usuario()!;
  const localesIds = u.scope.ids;
  const ordenes = e.ordenes.filter((o) => localesIds.includes(o.localId));
  const articulos = e.articulos.filter((a) => localesIds.includes(a.localId));
  const hoy = new Date().toISOString().slice(0, 10);

  const pedidosActivos = ordenes.filter((o) => o.tipo === 'pedido' && !['entregada', 'cancelada'].includes(o.estado));
  const reservasVigentes = ordenes.filter((o) => o.tipo === 'reserva' && o.estado !== 'cancelada');
  const ventasHoyVes = ordenes
    .filter((o) => o.estado === 'entregada' && o.creadaEn.slice(0, 10) === hoy)
    .reduce((s, o) => s + o.totalVes, 0);
  const prepPromedio = articulos.length
    ? Math.round(articulos.reduce((s, a) => s + a.tiempoPrepMin, 0) / articulos.length)
    : 0;

  const turnos = e.turnos.filter((t) => localesIds.includes(t.localId) && t.diferenciaVes !== undefined);
  const ultimoTurno = turnos.sort((a, b) => (b.cerradoEn ?? '').localeCompare(a.cerradoEn ?? ''))[0];
  const diferencia = ultimoTurno?.diferenciaVes ?? 0;

  const actividad = ordenes
    .flatMap((o) => o.historial.map((h) => ({ ...h, orden: o })))
    .sort((a, b) => b.en.localeCompare(a.en))
    .slice(0, 4);

  const agotados = articulos.filter((a) => !a.disponible).map((a) => a.nombre);
  const cuposBajos = articulos.filter((a) => a.tipo === 'servicio' && (a.cupoPorFranja ?? 99) <= 3);

  const contenido = `
${conCajonMovil(barraLateralAdminLocal(), false)}
<main class="md:ml-64 min-h-screen">
  <header class="md:hidden flex justify-between items-center w-full px-lg h-touch-target sticky top-0 z-30 bg-surface border-b border-outline-variant">
    <div class="flex items-center gap-sm">
      <button type="button" data-accion="abrir-cajon" aria-label="Abrir menú" class="min-h-touch-target min-w-[44px] flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full">
        <span class="material-symbols-outlined">menu</span>
      </button>
      <span class="font-headline-md text-headline-md font-bold text-primary">Parques Nacionales</span>
    </div>
    <div class="flex items-center gap-xs">
      <button type="button" data-accion="ir" data-valor="/notificaciones" class="min-h-touch-target min-w-[44px] flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full">
        <span class="material-symbols-outlined">notifications</span>
      </button>
      <button type="button" data-accion="ir" data-valor="/c/expediente" class="min-h-touch-target min-w-[44px] flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full">
        <span class="material-symbols-outlined">storefront</span>
      </button>
      <button type="button" data-accion="ir" data-valor="/perfil" class="min-h-touch-target min-w-[44px] flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full">
        <span class="material-symbols-outlined">person</span>
      </button>
    </div>
  </header>

  <div class="p-md md:p-lg space-y-lg max-w-7xl mx-auto">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
      <div>
        <h2 class="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background">Resumen Operativo</h2>
        <p class="font-body-md text-body-md text-on-surface-variant mt-xs">Vista general de la actividad de hoy en el parque.</p>
      </div>
      <div class="flex flex-wrap gap-sm">
        <button type="button" data-accion="ir" data-valor="/c/caja/venta-mostrador" class="flex items-center justify-center gap-xs min-h-touch-target px-md rounded-lg font-label-md text-label-md bg-secondary text-on-secondary hover:opacity-90 transition-opacity">
          <span class="material-symbols-outlined">point_of_sale</span>
          Registrar venta
        </button>
        <button type="button" data-accion="ir" data-valor="/c/pedidos" class="flex items-center justify-center gap-xs min-h-touch-target px-md rounded-lg font-label-md text-label-md bg-primary-container text-on-primary-container hover:opacity-90 transition-opacity">
          <span class="material-symbols-outlined">receipt_long</span>
          Abrir pedidos
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
      <div class="bg-surface-container-lowest border border-surface-variant rounded-xl p-lg flex flex-col justify-between hover:shadow-[0px_4px_12px_rgba(40,51,46,0.08)] transition-shadow">
        <div class="flex justify-between items-start mb-md">
          <span class="font-label-md text-label-md text-on-surface-variant">Ventas del día</span>
          <div class="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
            <span class="material-symbols-outlined">payments</span>
          </div>
        </div>
        <div>
          <div class="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background mb-base">${esc(formatearVes(ventasHoyVes))}</div>
        </div>
      </div>
      <div class="bg-surface-container-lowest border border-surface-variant rounded-xl p-lg flex flex-col justify-between hover:shadow-[0px_4px_12px_rgba(40,51,46,0.08)] transition-shadow">
        <div class="flex justify-between items-start mb-md">
          <span class="font-label-md text-label-md text-on-surface-variant">Pedidos activos</span>
          <div class="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
            <span class="material-symbols-outlined">pending_actions</span>
          </div>
        </div>
        <div>
          <div class="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background mb-base">${pedidosActivos.length}</div>
          ${prepPromedio ? `<div class="flex items-center gap-xs font-label-sm text-label-sm text-on-surface-variant">
            <span class="material-symbols-outlined text-[16px]">schedule</span>
            <span>Promedio: ${prepPromedio} min</span>
          </div>` : ''}
        </div>
      </div>
      <div class="bg-surface-container-lowest border border-surface-variant rounded-xl p-lg flex flex-col justify-between hover:shadow-[0px_4px_12px_rgba(40,51,46,0.08)] transition-shadow">
        <div class="flex justify-between items-start mb-md">
          <span class="font-label-md text-label-md text-on-surface-variant">Reservas vigentes</span>
          <div class="w-10 h-10 rounded-full bg-primary-fixed-dim flex items-center justify-center text-on-primary-fixed">
            <span class="material-symbols-outlined">calendar_month</span>
          </div>
        </div>
        <div>
          <div class="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background mb-base">${reservasVigentes.length}</div>
        </div>
      </div>
      <div class="bg-surface-container-lowest border border-surface-variant rounded-xl p-lg flex flex-col justify-between hover:shadow-[0px_4px_12px_rgba(40,51,46,0.08)] transition-shadow">
        <div class="flex justify-between items-start mb-md">
          <span class="font-label-md text-label-md text-on-surface-variant">Diferencia de Caja</span>
          <div class="w-10 h-10 rounded-full ${diferencia === 0 ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'} flex items-center justify-center">
            <span class="material-symbols-outlined">account_balance_wallet</span>
          </div>
        </div>
        <div>
          <div class="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background mb-base">${esc(formatearVes(diferencia))}</div>
          <div class="flex items-center gap-xs font-label-sm text-label-sm ${diferencia === 0 ? 'text-primary' : 'text-error'}">
            <span class="material-symbols-outlined text-[16px]">${diferencia === 0 ? 'check_circle' : 'warning'}</span>
            <span>${diferencia === 0 ? 'Sin diferencias' : 'Requiere revisión'}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-md">
      <div class="lg:col-span-2 bg-surface-container-lowest border border-surface-variant rounded-xl flex flex-col overflow-hidden">
        <div class="p-lg border-b border-surface-variant flex justify-between items-center bg-surface-bright">
          <h3 class="font-headline-md text-headline-md text-on-background">Actividad Operativa Reciente</h3>
          <button type="button" data-accion="ir" data-valor="/c/pedidos" class="min-h-touch-target px-sm rounded-lg font-label-md text-label-md text-primary hover:bg-surface-container-low transition-colors">Ver todo</button>
        </div>
        <div class="p-0 overflow-y-auto max-h-[400px]">
          ${actividad.length === 0
            ? '<p class="p-md font-body-md text-body-md text-on-surface-variant">Sin actividad registrada todavía.</p>'
            : actividad
                .map(
                  (h) => `<button type="button" data-accion="ir" data-valor="/c/${h.orden.tipo === 'reserva' ? 'reserva' : 'pedido'}/${esc(h.orden.id)}"
                  class="w-full flex items-center gap-md p-md border-b border-surface-variant hover:bg-surface-container-lowest transition-colors text-left">
                  <div class="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0">
                    <span class="material-symbols-outlined">${h.orden.tipo === 'reserva' ? 'event_seat' : 'local_dining'}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-label-md text-label-md text-on-background truncate">${esc(h.orden.codigo)} → ${esc(ETIQUETA_ORDEN[h.orden.estado])}</p>
                    <p class="font-body-sm text-body-sm text-on-surface-variant truncate">${esc(h.orden.clienteNombre)}</p>
                  </div>
                  <div class="text-right">
                    <p class="font-label-sm text-label-sm text-on-surface-variant">${esc(desde(h.en))}</p>
                    <span class="inline-flex mt-base px-2 py-1 rounded-full ${claseTono(TONO_ORDEN[h.orden.estado])} font-label-sm text-[10px]">${esc(ETIQUETA_ORDEN[h.orden.estado])}</span>
                  </div>
                </button>`,
                )
                .join('')}
        </div>
      </div>

      <div class="bg-surface-container-lowest border border-surface-variant rounded-xl flex flex-col overflow-hidden">
        <div class="p-lg border-b border-surface-variant bg-error-container/10">
          <h3 class="font-headline-md text-headline-md text-error flex items-center gap-sm">
            <span class="material-symbols-outlined">notification_important</span>
            Alertas Críticas
          </h3>
        </div>
        <div class="p-md space-y-md">
          ${agotados.length === 0 && cuposBajos.length === 0
            ? '<p class="font-body-md text-body-md text-on-surface-variant">Sin alertas activas.</p>'
            : ''}
          ${agotados.length
            ? `<div class="bg-error-container rounded-lg p-md flex gap-md items-start">
                <span class="material-symbols-outlined text-on-error-container mt-base">inventory_2</span>
                <div>
                  <h4 class="font-label-md text-label-md text-on-error-container">Artículos agotados</h4>
                  <p class="font-body-sm text-body-sm text-on-error-container/80 mt-base">${esc(agotados.slice(0, 3).join(', '))}</p>
                  <button type="button" data-accion="ir" data-valor="/c/inventario" class="mt-sm font-label-sm text-label-sm text-on-error-container underline">Reponer stock</button>
                </div>
              </div>`
            : ''}
          ${cuposBajos.length
            ? `<div class="bg-tertiary-fixed rounded-lg p-md flex gap-md items-start">
                <span class="material-symbols-outlined text-on-tertiary-fixed mt-base">group_off</span>
                <div>
                  <h4 class="font-label-md text-label-md text-on-tertiary-fixed">Cupos bajos: ${esc(cuposBajos[0].nombre)}</h4>
                  <p class="font-body-sm text-body-sm text-on-tertiary-fixed/80 mt-base">Solo quedan ${cuposBajos[0].cupoPorFranja} lugares por franja.</p>
                  <button type="button" data-accion="ir" data-valor="/c/cupos" class="mt-sm font-label-sm text-label-sm text-on-tertiary-fixed underline">Editar disponibilidad</button>
                </div>
              </div>`
            : ''}
        </div>
      </div>
    </div>
  </div>
</main>`;

  return { titulo: 'Resumen Operativo', standalone: true, contenido };
};

// ------------------------------------------------------------------ Operador

/**
 * Fuente: `50/p_gina_1_turno_operativo/code.html` ("Inicio de Turno"). Es
 * una pantalla transaccional de una sola tarjeta centrada, no un panel con
 * navegación persistente: el cajón lateral original es un `<aside>` que ya
 * trae su propio ancho (`w-80`), así que no necesita la corrección de
 * `conCajonMovil` (esa corrección era solo para asides `fixed` sin ancho
 * propio dentro de un contenedor que colapsa a 0). El HTML original abre y
 * cierra ese cajón con un `<script>` inline; los `<script>` inyectados por
 * `innerHTML` no se ejecutan en el navegador, así que aquí se cablea con el
 * mismo mecanismo `data-cajon` / `abrir-cajon` / `cerrar-cajon` que ya usan
 * las demás vistas portadas, en vez de duplicar ese script.
 */
export const operadorInicio: Render = (): Pagina => {
  const e = store.leer();
  const u = sesion.usuario()!;
  const localesIds = u.scope.ids;
  const locales = e.locales.filter((l) => localesIds.includes(l.id));
  const ordenes = e.ordenes.filter((o) => localesIds.includes(o.localId));

  const nuevos = ordenes.filter((o) => o.tipo === 'pedido' && ['creada', 'pendiente_aceptacion'].includes(o.estado)).length;
  const enPreparacion = ordenes.filter((o) => o.tipo === 'pedido' && ['aceptada', 'preparando'].includes(o.estado)).length;
  const listos = ordenes.filter((o) => o.tipo === 'pedido' && o.estado === 'lista').length;
  const reservasProx = ordenes.filter((o) => o.tipo === 'reserva' && o.estado !== 'cancelada').length;

  const enLinea = conectividad.hayRed();

  const contenido = `
<header class="w-full top-0 sticky border-b border-outline-variant bg-surface hidden md:flex justify-between items-center px-md h-touch-target max-w-full">
  <div class="flex items-center gap-sm">
    <button type="button" data-accion="abrir-cajon" aria-label="Abrir menú" class="hover:bg-surface-container-high transition-colors rounded-full p-xs">
      <span class="material-symbols-outlined text-primary">menu</span>
    </button>
    <h1 class="font-headline-md text-headline-md font-bold text-primary tracking-tight">Operaciones Parque</h1>
  </div>
  <button type="button" data-accion="ir" data-valor="/perfil" aria-label="Perfil" class="hover:bg-surface-container-high transition-colors rounded-full p-xs">
    <span class="material-symbols-outlined text-primary">account_circle</span>
  </button>
</header>
<main class="flex-grow overflow-y-auto px-md md:px-lg py-lg flex flex-col justify-center items-center min-h-screen">
  <div class="w-full max-w-2xl bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-lg flex flex-col gap-xl">
    <div class="flex flex-col gap-sm text-center">
      <h2 class="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Bienvenido, ${esc(u.nombre.split(' ')[0])}</h2>
      <p class="font-body-md text-body-md text-on-surface-variant">Confirme sus datos para iniciar el turno operativo.</p>
      <div class="inline-flex items-center justify-center gap-base mt-sm ${enLinea ? 'bg-[#e8f5e9] text-[#1b5e20]' : 'bg-error-container text-on-error-container'} px-sm py-base rounded-full self-center">
        <span class="material-symbols-outlined text-[16px]">${enLinea ? 'wifi' : 'wifi_off'}</span>
        <span class="font-label-sm text-label-sm">${esc(conectividad.etiqueta())}</span>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
      <div class="flex flex-col gap-base">
        <span class="font-label-md text-label-md text-on-surface">Local Asignado</span>
        ${locales.length > 1
          ? `<div class="relative">
              <select class="w-full h-touch-target bg-surface-container-lowest border border-outline-variant rounded-lg px-md font-body-md text-body-md text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                ${locales.map((l) => `<option>${esc(l.nombre)}</option>`).join('')}
              </select>
              <span class="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
            </div>`
          : `<div class="h-touch-target flex items-center px-md bg-surface-container-low rounded-lg border border-transparent font-body-md text-body-md text-on-surface-variant">${esc(locales[0]?.nombre ?? 'Sin local asignado')}</div>`}
      </div>
      <div class="flex flex-col gap-base">
        <span class="font-label-md text-label-md text-on-surface">Responsable de Turno</span>
        <div class="h-touch-target flex items-center px-md bg-surface-container-low rounded-lg border border-transparent font-body-md text-body-md text-on-surface-variant">${esc(u.nombre)}</div>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-sm">
      <div class="bg-surface-container-low rounded-lg p-sm border border-outline-variant flex flex-col items-center justify-center text-center">
        <span class="material-symbols-outlined text-primary mb-xs icon-fill">receipt_long</span>
        <span class="font-headline-md text-headline-md text-on-surface">${nuevos}</span>
        <span class="font-label-sm text-label-sm text-on-surface-variant">Pedidos Nuevos</span>
      </div>
      <div class="bg-surface-container-low rounded-lg p-sm border border-outline-variant flex flex-col items-center justify-center text-center">
        <span class="material-symbols-outlined text-tertiary-container mb-xs">cooking</span>
        <span class="font-headline-md text-headline-md text-on-surface">${enPreparacion}</span>
        <span class="font-label-sm text-label-sm text-on-surface-variant">En Preparación</span>
      </div>
      <div class="bg-surface-container-low rounded-lg p-sm border border-outline-variant flex flex-col items-center justify-center text-center">
        <span class="material-symbols-outlined text-secondary mb-xs icon-fill">check_circle</span>
        <span class="font-headline-md text-headline-md text-on-surface">${listos}</span>
        <span class="font-label-sm text-label-sm text-on-surface-variant">Listos</span>
      </div>
      <div class="bg-surface-container-low rounded-lg p-sm border border-outline-variant flex flex-col items-center justify-center text-center">
        <span class="material-symbols-outlined text-primary mb-xs icon-fill">calendar_today</span>
        <span class="font-headline-md text-headline-md text-on-surface">${reservasProx}</span>
        <span class="font-label-sm text-label-sm text-on-surface-variant">Reservas Próx.</span>
      </div>
    </div>

    <div class="pt-sm">
      <button type="button" data-accion="ir" data-valor="/c/caja/turno/abrir"
        class="w-full h-16 bg-primary-container text-on-primary rounded-full font-headline-md text-headline-md hover:bg-[#125a3a] transition-colors active:scale-95 duration-100 flex items-center justify-center gap-sm shadow-md">
        <span class="material-symbols-outlined">play_arrow</span>
        Iniciar Turno
      </button>
    </div>
  </div>
</main>
<div data-cajon="fondo" class="fixed inset-0 bg-black/50 z-40 hidden" data-accion="cerrar-cajon"></div>
<aside data-cajon="panel" class="fixed inset-y-0 left-0 -translate-x-full transition-transform duration-300 z-50 h-full w-80 rounded-r-xl bg-surface-container shadow-lg flex flex-col p-md gap-sm">
  <div class="flex items-center gap-md mb-lg">
    <div class="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-headline-md">${esc(iniciales(u.nombre))}</div>
    <div>
      <h3 class="font-headline-md text-headline-md-mobile text-primary">${esc(u.nombre)}</h3>
      <p class="font-body-md text-body-md text-on-surface-variant">${esc(locales[0]?.nombre ?? '')}</p>
    </div>
  </div>
  <nav class="flex flex-col gap-base">
    <button type="button" data-accion="ir" data-valor="/perfil" class="flex items-center gap-md p-sm text-on-surface-variant hover:bg-surface-container-highest rounded-lg transition-colors text-left">
      <span class="material-symbols-outlined">person</span>
      <span class="font-body-md text-body-md">Perfil Usuario</span>
    </button>
    <button type="button" data-accion="ir" data-valor="/c/caja/turno/cerrar" class="flex items-center gap-md p-sm text-on-surface-variant hover:bg-surface-container-highest rounded-lg transition-colors text-left">
      <span class="material-symbols-outlined">sync_alt</span>
      <span class="font-body-md text-body-md">Cambio de Turno</span>
    </button>
    <button type="button" data-accion="ir" data-valor="/v/qr" class="flex items-center gap-md p-sm text-on-surface-variant hover:bg-surface-container-highest rounded-lg transition-colors text-left">
      <span class="material-symbols-outlined">qr_code_scanner</span>
      <span class="font-body-md text-body-md">Validar QR</span>
    </button>
    <hr class="border-outline-variant my-sm">
    <button type="button" data-accion="cerrar-sesion" class="flex items-center gap-md p-sm text-on-surface-variant hover:bg-surface-container-highest rounded-lg transition-colors text-left">
      <span class="material-symbols-outlined">logout</span>
      <span class="font-body-md text-body-md">Cerrar Sesión</span>
    </button>
  </nav>
</aside>`;

  return { titulo: 'Inicio de Turno', standalone: true, contenido };
};

// ------------------------------------------------------------------ Contador

const ETIQUETA_LIQUIDACION: Record<string, string> = {
  calculada: 'Calculada',
  por_cobrar: 'Por cobrar',
  por_pagar: 'Liquidación pendiente',
  conciliada: 'Conciliada',
  cerrada: 'Liquidación cerrada',
};

function barraLateralContador(): string {
  const items: Array<[string, string, string]> = [
    ['dashboard', 'Summary', '/c'],
    ['book_2', 'Sales Books', '/c/reportes'],
    ['payments', 'Payments', '/c/estado-cuenta'],
  ];
  const pie: Array<[string, string, string]> = [
    ['ios_share', 'Export Manager', '/c/exportaciones'],
    ['help', 'Support', '/ayuda'],
  ];
  const item = ([icono, texto, ruta]: [string, string, string]) => `<li>
    <button type="button" data-accion="ir" data-valor="${ruta}"
      class="w-full flex items-center gap-sm px-sm py-sm rounded-lg ${ruta === '/c' ? 'bg-secondary-container text-on-secondary-container font-bold' : 'text-on-surface-variant hover:bg-surface-variant'} transition-all duration-200 ease-in-out text-left">
      <span class="material-symbols-outlined ${ruta === '/c' ? 'icon-fill' : ''}">${icono}</span>
      <span class="font-label-md text-label-md">${esc(texto)}</span>
    </button>
  </li>`;
  return `
<aside class="flex flex-col h-full w-64 fixed left-0 top-0 bg-surface-container-low py-md px-sm border-r border-outline-variant z-50">
  <div class="flex items-center gap-sm mb-xl px-sm">
    <div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container shrink-0">
      <span class="material-symbols-outlined icon-fill">account_balance</span>
    </div>
    <div>
      <h1 class="font-headline-sm text-headline-sm font-extrabold text-on-secondary-fixed">Finance Portal</h1>
      <p class="font-label-sm text-label-sm text-on-surface-variant">Audit &amp; Integrity</p>
    </div>
  </div>
  <ul class="flex flex-col gap-xs flex-grow">${items.map(item).join('')}</ul>
  <div class="mt-auto">
    <ul class="flex flex-col gap-xs pt-sm border-t border-outline-variant">${pie.map(item).join('')}</ul>
  </div>
</aside>`;
}

export const contadorInicio: Render = (): Pagina => {
  const e = store.leer();
  const u = sesion.usuario()!;
  const negocioId = u.scope.ids[0];
  const negocio = e.negocios.find((n) => n.id === negocioId);
  const ordenes = e.ordenes.filter((o) => o.negocioId === negocioId);
  const entregadas = ordenes.filter((o) => o.estado === 'entregada');
  const ventasBrutasUsd = entregadas.reduce((s, o) => s + o.totalUsd, 0);

  const pagos = e.pagos.filter((p) => ordenes.some((o) => o.id === p.ordenId));
  const pagosConfirmadosUsd = pagos.filter((p) => p.estado === 'confirmado').reduce((s, p) => s + p.montoUsd, 0);
  const tasaConversion = ventasBrutasUsd > 0 ? Math.round((pagosConfirmadosUsd / ventasBrutasUsd) * 100) : 0;

  const liquidaciones = e.liquidaciones
    .filter((l) => l.negocioId === negocioId)
    .sort((a, b) => b.periodoHasta.localeCompare(a.periodoHasta));
  const ultima = liquidaciones[0];
  const conciliada = liquidaciones.find((l) => l.estado === 'conciliada' || l.estado === 'cerrada');

  const contenido = `
${conCajonMovil(barraLateralContador(), false)}
<div class="flex-1 flex flex-col md:ml-64 min-h-screen">
  <header class="flex justify-between items-center pl-3 pr-lg h-[64px] sticky top-0 z-40 bg-surface border-b border-outline-variant gap-sm">
    <div class="flex items-center gap-xs min-w-0">
      <button type="button" data-accion="abrir-cajon" aria-label="Abrir menú" class="md:hidden shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant">
        <span class="material-symbols-outlined">menu</span>
      </button>
      <span class="md:hidden font-headline-md text-headline-md font-bold text-primary truncate">Park Commerce Finance</span>
      <h2 class="hidden md:block font-headline-md text-headline-md text-on-surface">Resumen Financiero</h2>
    </div>
    <div class="flex items-center gap-md">
      <button type="button" data-accion="ir" data-valor="/notificaciones" class="w-[44px] h-[44px] flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
        <span class="material-symbols-outlined">notifications</span>
      </button>
      <button type="button" data-accion="ir" data-valor="/perfil/accesibilidad" class="w-[44px] h-[44px] flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
        <span class="material-symbols-outlined">settings</span>
      </button>
      <button type="button" data-accion="ir" data-valor="/perfil">${avatar(u.nombre, 'w-10 h-10 text-[13px]')}</button>
    </div>
  </header>
  <main class="flex-1 overflow-y-auto p-lg pb-[100px] md:pb-lg">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md mb-xl">
      <div class="flex items-center gap-sm bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md text-body-md rounded-lg px-md h-[44px]">
        ${esc(negocio?.nombreComercial ?? 'Negocio')}
      </div>
      <div class="flex items-center gap-sm font-label-md text-label-md text-on-surface-variant bg-surface-container px-md py-sm rounded-full w-full sm:w-auto justify-center">
        <span class="material-symbols-outlined text-primary">check_circle</span>
        ${conciliada ? `Última conciliación: ${esc(fechaCorta(`${conciliada.periodoHasta}T12:00:00`))}` : 'Sin conciliaciones registradas'}
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg">
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col gap-md hover:card-shadow transition-shadow">
        <div class="flex justify-between items-start">
          <span class="font-label-md text-label-md text-on-surface-variant">Ventas Brutas</span>
          <div class="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-primary-container">
            <span class="material-symbols-outlined text-sm">point_of_sale</span>
          </div>
        </div>
        <div class="font-headline-lg text-headline-lg text-on-surface">${esc(formatearVes(ventasBrutasUsd * e.tasaBcv.valor))}</div>
        <div class="font-label-sm text-label-sm text-on-surface-variant">${esc(formatearUsd(ventasBrutasUsd))} equivalente</div>
      </div>
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col gap-md hover:card-shadow transition-shadow">
        <div class="flex justify-between items-start">
          <span class="font-label-md text-label-md text-on-surface-variant">Pagos Confirmados</span>
          <div class="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-primary-container">
            <span class="material-symbols-outlined text-sm">verified</span>
          </div>
        </div>
        <div class="font-headline-lg text-headline-lg text-on-surface">${esc(formatearVes(pagosConfirmadosUsd * e.tasaBcv.valor))}</div>
        <div class="font-label-sm text-label-sm text-on-surface-variant">${tasaConversion}% tasa de conversión</div>
      </div>
      <div class="bg-surface-container-lowest border border-primary rounded-xl p-lg flex flex-col gap-md lg:col-span-2 shadow-sm relative overflow-hidden">
        <div class="absolute right-0 bottom-0 opacity-5 pointer-events-none">
          <span class="material-symbols-outlined text-[120px]">account_balance_wallet</span>
        </div>
        <div class="flex justify-between items-start relative z-10">
          <span class="font-label-md text-label-md text-on-surface-variant font-bold">Monto Neto Disponible</span>
          <span class="px-sm py-xs rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm">${ultima ? esc(ETIQUETA_LIQUIDACION[ultima.estado]) : 'Sin liquidaciones'}</span>
        </div>
        <div class="font-display-lg text-display-lg text-primary relative z-10">${esc(formatearVes((ultima?.netoUsd ?? 0) * e.tasaBcv.valor))}</div>
        <div class="font-label-sm text-label-sm text-on-surface-variant relative z-10">Después de comisiones, cánones y ajustes</div>
      </div>
    </div>
  </main>
</div>`;

  return { titulo: 'Resumen Financiero', standalone: true, contenido };
};
