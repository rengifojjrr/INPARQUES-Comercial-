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
import { diasHasta, fechaCorta } from '../formato';

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
