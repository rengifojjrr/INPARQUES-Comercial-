/**
 * Mapa de puntos comerciales del visitante.
 *
 * Fuente: `stitch_inparques_comercial_portal_visitante/p_gina_6_mapa_de_puntos_comerciales`.
 * El original coloca una imagen de mapa generada por IA con un pin encima;
 * aquí el mapa es el componente SVG real de `ui/mapa.ts`, dibujado con las
 * coordenadas del propio modelo de datos y con cada punto navegable.
 */

import { esc } from '../componentes';
import { mapaParque, leyendaMapa } from '../mapa';
import { cabeceraVisitante, barraInferiorVisitante } from './stitch-visitante-nav';
import type { Pagina, Render } from './tipos';
import { store } from '../../data/store';
import { estadoUi } from '../estado-ui';
import { error404 } from './compartidas';

const ICONO_CATEGORIA: Record<string, string> = {
  comida: 'restaurant', bebidas: 'local_cafe', juguetes: 'toys', artesania: 'palette',
  recuerdos: 'redeem', alquileres: 'pedal_bike', atracciones: 'star', paseos: 'hiking',
};

export const mapaStitch: Render = (ctx): Pagina => {
  const e = store.leer();
  const parqueId = ctx.params.parqueId ?? estadoUi.filtros['parque'] ?? 'pq_este';
  const parque = e.parques.find((x) => x.id === parqueId);
  if (!parque) return error404(ctx);

  const zonas = e.zonas.filter((z) => z.parqueId === parqueId);
  const puntos = e.puntos.filter((p) => p.parqueId === parqueId);
  const ocupados = puntos.filter((p) => p.estado === 'ocupado');

  const contenido = `
${cabeceraVisitante('', 'Mapa del parque', '/v')}
<main class="max-w-6xl mx-auto w-full px-md md:px-lg py-lg">
  <div class="mb-lg">
    <h1 class="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface mb-base">${esc(parque.nombre)}</h1>
    <p class="font-body-md text-body-md text-on-surface-variant">Toque un punto para abrir el comercio que lo ocupa. El esquema es propio del parque: no usa ningún servicio de navegación externo.</p>
  </div>

  <div class="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm mb-lg">
    <div class="overflow-x-auto">
      <div class="min-w-[560px]">${mapaParque(parqueId)}</div>
    </div>
    <div class="p-md border-t border-outline-variant bg-surface">${leyendaMapa()}</div>
  </div>

  <div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
    <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-md">
      <p class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Zonas</p>
      <p class="font-headline-md text-headline-md text-on-surface">${zonas.length}</p>
    </div>
    <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-md">
      <p class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Comercios abiertos</p>
      <p class="font-headline-md text-headline-md text-primary">${ocupados.length}</p>
    </div>
    <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-md">
      <p class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Puntos totales</p>
      <p class="font-headline-md text-headline-md text-on-surface">${puntos.length}</p>
    </div>
    <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-md">
      <p class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Horario</p>
      <p class="font-body-md text-body-md text-on-surface">${esc(parque.horario)}</p>
    </div>
  </div>

  <h2 class="font-headline-md text-headline-md-mobile md:text-headline-md text-on-surface mb-md">Zonas del parque</h2>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
    ${zonas
      .map((z) => {
        const pz = puntos.filter((p) => p.zonaId === z.id);
        const negocios = pz
          .map((p) => e.locales.find((l) => l.puntoId === p.id))
          .filter(Boolean)
          .map((l) => e.negocios.find((n) => n.id === l!.negocioId))
          .filter(Boolean);
        return `
    <button type="button" data-accion="ir" data-valor="/v/zona/${esc(z.id)}"
      class="text-left bg-surface-container-lowest border border-outline-variant rounded-xl p-lg hover:shadow-md transition-shadow flex flex-col gap-sm">
      <div class="flex justify-between items-start">
        <h3 class="font-headline-md text-headline-md text-on-surface">${esc(z.nombre)}</h3>
        <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
      </div>
      <p class="font-body-md text-body-md text-on-surface-variant">${negocios.length} comercio${negocios.length === 1 ? '' : 's'} · ${pz.length} punto${pz.length === 1 ? '' : 's'}</p>
      <div class="flex flex-wrap gap-1 mt-xs">
        ${negocios
          .slice(0, 4)
          .map(
            (n) => `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary-container/40 text-on-secondary-container font-label-sm text-label-sm">
              <span class="material-symbols-outlined text-[14px]">${ICONO_CATEGORIA[n!.categoria] ?? 'storefront'}</span>
              ${esc(n!.nombreComercial)}
            </span>`,
          )
          .join('')}
        ${negocios.length === 0 ? '<span class="font-label-sm text-label-sm text-on-surface-variant">Sin comercios activos</span>' : ''}
      </div>
    </button>`;
      })
      .join('')}
  </div>
</main>
${barraInferiorVisitante('')}`;

  return { titulo: 'Mapa del parque', standalone: true, contenido };
};
