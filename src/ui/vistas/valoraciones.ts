/**
 * Valoraciones: las dos caras que faltaban.
 *
 * El visitante ya podia valorar, pero nadie podia hacer nada con eso: el
 * comercio no tenia donde responder y INPARQUES no tenia donde retirar una
 * valoracion difamatoria. En una plataforma del Estado eso no es una carencia
 * de producto, es un problema legal —una reseña injuriosa publicada bajo el
 * dominio de INPARQUES y sin via de retirada—.
 *
 * Una sola pantalla sirve a las dos superficies, porque el contenido es el
 * mismo y lo unico que cambia es que puede hacer cada quien: responder (el
 * comercio valorado) o retirar con motivo (soporte y direccion comercial).
 * Retirar no borra: marca `oculta` y deja el motivo en la bitacora.
 */

import { esc } from '../componentes';
import type { Pagina, Render } from './tipos';
import { store } from '../../data/store';
import { sesion } from '../../app/session';
import { puede } from '../../domain/permissions';
import { resolverAmbito } from '../../domain/scope';
import { fechaCorta } from '../formato';
import { marcoFinanzas } from './stitch-comercio-finanzas';
import { marcoInparques } from './stitch-inparques-concesiones';
import type { Valoracion } from '../../domain/types';

function estrellas(n: number): string {
  return `<span aria-label="${n} de 5 estrellas">${'★'.repeat(n)}<span class="text-outline">${'★'.repeat(5 - n)}</span></span>`;
}

function tarjeta(v: Valoracion, puedeResponder: boolean, puedeModerar: boolean): string {
  const e = store.leer();
  const orden = e.ordenes.find((o) => o.id === v.ordenId);
  const negocio = e.negocios.find((n) => n.id === v.negocioId);
  return `
<article class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg ${v.oculta ? 'opacity-60' : ''}">
  <div class="flex justify-between items-start gap-md mb-sm">
    <div>
      <p class="font-label-md text-label-md text-primary text-lg">${estrellas(v.estrellas)}</p>
      <p class="font-body-md text-body-md text-on-surface-variant text-sm mt-1">
        ${esc(negocio?.nombreComercial ?? '')} · pedido ${esc(orden?.codigo ?? '—')} · ${esc(fechaCorta(v.creadaEn))}
      </p>
    </div>
    ${v.oculta ? '<span class="bg-error-container text-error font-label-sm text-label-sm px-2 py-1 rounded-full shrink-0">Retirada</span>' : ''}
  </div>

  ${v.comentario ? `<p class="font-body-md text-body-md text-on-surface">${esc(v.comentario)}</p>` : '<p class="font-body-md text-body-md text-outline">Sin comentario.</p>'}

  ${
    v.oculta
      ? `<p class="font-body-md text-body-md text-on-surface-variant text-sm mt-md border-t border-outline-variant pt-sm">Motivo de la moderación: ${esc(v.motivoModeracion ?? '—')}</p>`
      : ''
  }

  ${
    v.respuesta
      ? `<div class="mt-md border-l-2 border-primary pl-md">
          <p class="font-label-sm text-label-sm text-primary">Respuesta del comercio</p>
          <p class="font-body-md text-body-md text-on-surface mt-1">${esc(v.respuesta)}</p>
        </div>`
      : ''
  }

  <div class="flex flex-wrap gap-sm mt-md">
    ${
      puedeResponder && !v.respuesta && !v.oculta
        ? `<button type="button" data-accion="responder-valoracion" data-valor="${esc(v.id)}" class="min-h-touch-target px-4 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity">Responder</button>`
        : ''
    }
    ${
      puedeModerar && !v.oculta
        ? `<button type="button" data-accion="moderar-valoracion" data-valor="${esc(v.id)}" class="min-h-touch-target px-4 rounded-lg border border-error/40 text-error font-label-md text-label-md hover:bg-error-container/20 transition-colors">Retirar</button>`
        : ''
    }
  </div>
</article>`;
}

function cuerpo(lista: Valoracion[], puedeResponder: boolean, puedeModerar: boolean, bajada: string): string {
  const visibles = lista.filter((v) => !v.oculta);
  const media = visibles.length
    ? (visibles.reduce((s, v) => s + v.estrellas, 0) / visibles.length).toFixed(1)
    : '—';
  const sinResponder = visibles.filter((v) => !v.respuesta).length;

  return `
<div class="p-lg lg:p-xl max-w-4xl mx-auto">
  <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">Valoraciones</h2>
  <p class="font-body-md text-body-md text-on-surface-variant mb-lg">${esc(bajada)}</p>

  <div class="grid grid-cols-3 gap-md mb-lg">
    ${[
      ['Promedio', media],
      ['Publicadas', String(visibles.length)],
      [puedeResponder ? 'Sin responder' : 'Retiradas', String(puedeResponder ? sinResponder : lista.length - visibles.length)],
    ]
      .map(
        ([t, n]) => `<div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-md">
          <p class="font-body-md text-body-md text-on-surface-variant text-sm">${esc(t)}</p>
          <p class="font-headline-md text-headline-md text-on-surface mt-1">${esc(n)}</p>
        </div>`,
      )
      .join('')}
  </div>

  ${
    lista.length === 0
      ? `<div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-xl text-center">
          <span class="material-symbols-outlined text-[40px] text-outline">star</span>
          <p class="font-body-md text-body-md text-on-surface-variant mt-sm">Todavía no hay valoraciones.</p>
        </div>`
      : `<div class="flex flex-col gap-md">${lista.map((v) => tarjeta(v, puedeResponder, puedeModerar)).join('')}</div>`
  }
</div>`;
}

/** Portal del comercio: sus propias valoraciones, con opción de responder. */
export const valoracionesComercio: Render = (): Pagina => {
  const e = store.leer();
  const u = sesion.usuario()!;
  const ambito = resolverAmbito(u, e);
  const lista = e.valoraciones
    .filter((v) => ambito.nacional || ambito.negocioIds.includes(v.negocioId))
    .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));

  return {
    titulo: 'Valoraciones',
    standalone: true,
    contenido: marcoFinanzas(
      '/c/valoraciones',
      cuerpo(
        lista,
        puede(u.rol, 'valoracion:responder'),
        false,
        'Lo que opinan quienes le compraron. Responder en público suele valer más que la propia estrella.',
      ),
    ),
  };
};

/** Panel institucional: todas las del ámbito, con moderación. */
export const valoracionesInparques: Render = (): Pagina => {
  const e = store.leer();
  const u = sesion.usuario()!;
  const ambito = resolverAmbito(u, e);
  const negociosDelAmbito = new Set(
    e.negocios.filter((n) => ambito.nacional || ambito.negocioIds.includes(n.id)).map((n) => n.id),
  );
  const lista = e.valoraciones
    .filter((v) => negociosDelAmbito.has(v.negocioId))
    .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));

  return {
    titulo: 'Valoraciones',
    standalone: true,
    contenido: marcoInparques(
      '/i/valoraciones',
      'Valoraciones',
      cuerpo(
        lista,
        false,
        puede(u.rol, 'valoracion:moderar'),
        'Retirar una valoración no la borra: deja de mostrarse y el motivo queda en la bitácora.',
      ),
    ),
  };
};
