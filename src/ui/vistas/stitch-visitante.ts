/**
 * Vista de inicio de la PWA del visitante, portada del HTML real de Stitch.
 *
 * Fuente: `50/p_gina_2_inicio_del_parque/code.html` ("INPARQUES Comercial -
 * Inicio"). Layout mobile-first con barra inferior fija: no tiene el
 * problema de la barra lateral de escritorio, así que no necesita
 * `conCajonMovil`, se porta tal cual.
 */

import { esc } from '../componentes';
import { marcadorFoto } from '../stitch-comun';
import type { Pagina, Render } from './tipos';
import { store } from '../../data/store';
import { estadoUi } from '../estado-ui';
import type { Local, Negocio } from '../../domain/types';

const NOMBRE_CATEGORIA: Record<string, string> = {
  comida: 'Comida', bebidas: 'Bebidas', juguetes: 'Juguetes', artesania: 'Artesanía',
  recuerdos: 'Recuerdos', alquileres: 'Alquileres', atracciones: 'Atracciones', paseos: 'Paseos',
};

const ICONO_CATEGORIA: Record<string, string> = {
  comida: 'restaurant', bebidas: 'local_cafe', juguetes: 'toys', artesania: 'palette',
  recuerdos: 'redeem', alquileres: 'pedal_bike', atracciones: 'star', paseos: 'hiking',
};

const RESERVABLES = new Set(['alquileres', 'atracciones', 'paseos']);

function parquePorDefecto(): string {
  return estadoUi.filtros['parque'] ?? 'pq_este';
}

function localesAbiertos(parqueId: string): Array<{ local: Local; negocio: Negocio }> {
  const e = store.leer();
  return e.locales
    .filter((l) => l.parqueId === parqueId)
    .map((l) => ({ local: l, negocio: e.negocios.find((n) => n.id === l.negocioId)! }))
    .filter((x) => x.negocio && (x.negocio.estado === 'activo' || x.negocio.estado === 'aprobado'));
}

function tarjetaNegocio(local: Local, negocio: Negocio): string {
  const e = store.leer();
  const punto = e.puntos.find((p) => p.id === local.puntoId);
  const zona = e.zonas.find((z) => z.id === punto?.zonaId);
  const val = e.valoraciones.filter((v) => v.negocioId === negocio.id);
  const media = val.length ? (val.reduce((s, v) => s + v.estrellas, 0) / val.length).toFixed(1) : null;
  const reservable = RESERVABLES.has(negocio.categoria);

  return `
<div class="bg-surface rounded-xl border border-outline-variant overflow-hidden hover:shadow-md transition-shadow flex flex-col sm:flex-row group cursor-pointer relative"
  data-accion="ir" data-valor="/v/comercio/${esc(negocio.id)}">
  <div class="h-48 sm:h-auto sm:w-2/5 relative overflow-hidden bg-surface-container-high">
    ${marcadorFoto(ICONO_CATEGORIA[negocio.categoria] ?? 'storefront')}
    ${media
      ? `<div class="absolute top-sm right-sm bg-surface/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
        <span class="material-symbols-outlined text-[14px] text-primary icon-fill">star</span>
        <span class="font-label-md text-label-md text-on-surface">${media}</span>
      </div>`
      : ''}
  </div>
  <div class="p-md flex-1 flex flex-col justify-between">
    <div>
      <div class="flex justify-between items-start mb-xs">
        <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">${esc(negocio.nombreComercial)}</h3>
        <span class="material-symbols-outlined text-outline-variant">favorite_border</span>
      </div>
      <p class="font-body-md text-body-md text-on-surface-variant mb-sm line-clamp-2">${esc(NOMBRE_CATEGORIA[negocio.categoria] ?? negocio.categoria)} en ${esc(zona?.nombre ?? 'el parque')}.</p>
      <div class="flex flex-wrap gap-2 mb-md">
        <span class="inline-flex items-center px-2 py-1 rounded-md bg-secondary-container/30 text-on-secondary-container font-label-sm text-label-sm">${esc(NOMBRE_CATEGORIA[negocio.categoria] ?? negocio.categoria)}</span>
        <span class="inline-flex items-center px-2 py-1 rounded-md bg-surface-container text-on-surface-variant font-label-sm text-label-sm"><span class="material-symbols-outlined text-[14px] mr-1">location_on</span> ${esc(zona?.nombre ?? '')}</span>
      </div>
    </div>
    <button type="button" class="w-full h-touch-target ${reservable ? 'bg-surface text-on-surface border border-outline-variant hover:bg-surface-container-low' : 'bg-primary text-on-primary hover:bg-surface-tint'} rounded-lg font-label-md text-label-md transition-colors"
      data-accion="ir" data-valor="/v/comercio/${esc(negocio.id)}">${reservable ? 'Reservar' : 'Ver menú'}</button>
  </div>
</div>`;
}

export const inicioVisitante: Render = (): Pagina => {
  const e = store.leer();
  const parqueId = parquePorDefecto();
  const parque = e.parques.find((p) => p.id === parqueId)!;
  const lista = localesAbiertos(parqueId);
  const zonas = e.zonas.filter((z) => z.parqueId === parqueId);
  const categorias = [...new Set(lista.map((x) => x.negocio.categoria))];
  const destacados = lista.slice(0, 4);

  const contenido = `
<header class="bg-surface top-0 border-b border-outline-variant flex justify-between items-center px-lg w-full h-14 sticky z-40">
  <div class="flex items-center gap-xs text-primary">
    <span class="material-symbols-outlined icon-fill">park</span>
  </div>
  <div class="font-headline-md text-headline-md-mobile md:text-headline-md font-bold text-primary">INPARQUES Comercial</div>
  <div class="flex items-center gap-xs text-primary">
    <span class="material-symbols-outlined p-1 rounded-full cursor-pointer" data-accion="ir" data-valor="/notificaciones">notifications</span>
  </div>
</header>
<!-- El envoltorio "stitch-pagina" de main.ts es flex-col: dentro de un
     contenedor flex, un margin:auto en el eje transversal desactiva el
     stretch por defecto y el ancho pasa a calcularse por contenido
     (fit-content), que aquí termina siendo más ancho que la pantalla. El
     w-full evita eso y deja que max-w-7xl/mx-auto actúen solo como tope y
     centrado en pantallas anchas, como en el original. -->
<main class="max-w-7xl mx-auto w-full pb-24 md:pb-8">
  <section class="px-md md:px-lg py-lg">
    <div class="flex justify-between items-start mb-md">
      <div>
        <h1 class="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface mb-base">${esc(parque.nombre)}</h1>
        <div class="flex items-center gap-2">
          <span class="inline-flex h-3 w-3 rounded-full ${parque.activo ? 'bg-primary' : 'bg-outline'}"></span>
          <span class="font-label-md text-label-md text-primary">${parque.activo ? 'Abierto ahora' : 'Cerrado temporalmente'} · ${esc(parque.horario)}</span>
        </div>
      </div>
    </div>

    <button type="button" class="relative w-full mb-lg group block text-left" data-accion="ir" data-valor="/v/buscar">
      <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
      <span class="w-full h-touch-target flex items-center pl-12 pr-4 bg-surface rounded-full border border-outline-variant font-body-md text-body-md text-on-surface-variant shadow-sm">¿Qué quieres encontrar?</span>
    </button>

    ${zonas.length
      ? `<div class="flex gap-sm overflow-x-auto hide-scrollbar pb-2 mb-md">
        <button type="button" class="whitespace-nowrap px-4 h-10 rounded-full bg-primary text-on-primary font-label-md text-label-md shadow-sm shrink-0" data-accion="ir" data-valor="/v/mapa/${esc(parqueId)}">Todas</button>
        ${zonas.map((z) => `<button type="button" class="whitespace-nowrap px-4 h-10 rounded-full bg-surface border border-outline-variant text-on-surface hover:bg-surface-container-low font-label-md text-label-md shrink-0 transition-colors" data-accion="ir" data-valor="/v/zona/${esc(z.id)}">${esc(z.nombre)}</button>`).join('')}
      </div>`
      : ''}
  </section>

  ${categorias.length
    ? `<section class="px-md md:px-lg mb-xl">
      <div class="grid grid-cols-3 md:grid-cols-6 gap-sm md:gap-md">
        ${categorias.map((c) => `
        <button type="button" class="flex flex-col items-center justify-center p-sm bg-surface rounded-lg border border-outline-variant hover:shadow-md transition-shadow aspect-square group" data-accion="ir" data-valor="/v/categorias?c=${esc(c)}">
          <div class="h-12 w-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <span class="material-symbols-outlined">${ICONO_CATEGORIA[c] ?? 'storefront'}</span>
          </div>
          <span class="font-label-md text-label-md text-on-surface text-center">${esc(NOMBRE_CATEGORIA[c] ?? c)}</span>
        </button>`).join('')}
      </div>
    </section>`
    : ''}

  <section class="px-md md:px-lg mb-xl">
    <div class="flex justify-between items-end mb-md">
      <h2 class="font-headline-md text-headline-md-mobile md:text-headline-md text-on-surface">Abiertos ahora</h2>
      <button type="button" class="font-label-md text-label-md text-primary hover:underline" data-accion="ir" data-valor="/v/categorias">Ver todos</button>
    </div>
    ${destacados.length
      ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-md">${destacados.map((x) => tarjetaNegocio(x.local, x.negocio)).join('')}</div>`
      : `<p class="font-body-md text-body-md text-on-surface-variant">Todavía no hay comercios abiertos en este parque.</p>`}
  </section>
</main>

<nav class="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 pb-safe bg-surface-container-lowest border-t border-outline-variant shadow-sm">
  <a class="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-4 py-1 scale-90 transition-all" href="#/v">
    <span class="material-symbols-outlined icon-fill">home</span>
    <span class="font-label-sm text-label-sm mt-1">Inicio</span>
  </a>
  <a class="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-high rounded-lg px-2 py-1 transition-colors" href="#/v/buscar">
    <span class="material-symbols-outlined">search</span>
    <span class="font-label-sm text-label-sm mt-1">Explorar</span>
  </a>
  <a class="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-high rounded-lg px-2 py-1 transition-colors" href="#/v/historial">
    <span class="material-symbols-outlined">shopping_bag</span>
    <span class="font-label-sm text-label-sm mt-1">Pedidos</span>
  </a>
  <a class="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-high rounded-lg px-2 py-1 transition-colors" href="#/ayuda">
    <span class="material-symbols-outlined">help</span>
    <span class="font-label-sm text-label-sm mt-1">Ayuda</span>
  </a>
  <a class="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-high rounded-lg px-2 py-1 transition-colors" href="#/v/perfil">
    <span class="material-symbols-outlined">person</span>
    <span class="font-label-sm text-label-sm mt-1">Perfil</span>
  </a>
</nav>`;

  return { titulo: parque.nombre, standalone: true, contenido };
};
