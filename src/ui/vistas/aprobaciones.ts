/**
 * Bandeja de aprobaciones.
 *
 * Es la pantalla que le faltaba al control de cuatro ojos. Antes la segunda
 * firma se enviaba escrita en el codigo y nadie aprobaba nada; ahora la
 * accion se detiene aqui, con su motivo y su evidencia a la vista, hasta que
 * otra persona la firme o la rechace.
 *
 * Se muestran dos listas separadas a proposito: lo que *me toca firmar* y lo
 * que *yo pedi y sigue esperando*. Quien solicita ve su propia solicitud pero
 * no puede firmarla — el boton no aparece y, si lo forzara, la operacion lo
 * rechaza igual.
 */

import { esc } from '../componentes';
import type { Pagina, Render } from './tipos';
import { store } from '../../data/store';
import { sesion } from '../../app/session';
import { misSolicitudes, pendientesPara, NOMBRE_ACCION } from '../../domain/approvals';
import { fechaHora } from '../formato';
import type { SolicitudAprobacion } from '../../domain/types';

const TONO: Record<SolicitudAprobacion['estado'], [string, string]> = {
  pendiente: ['bg-tertiary-fixed text-on-tertiary-fixed', 'Pendiente de firma'],
  aprobada: ['bg-primary-container/20 text-primary', 'Aprobada'],
  rechazada: ['bg-error-container text-error', 'Rechazada'],
};

function tarjeta(s: SolicitudAprobacion, puedoFirmar: boolean): string {
  const [clases, etiqueta] = TONO[s.estado];
  return `
<article class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg">
  <div class="flex justify-between items-start gap-md mb-sm">
    <div>
      <h3 class="font-label-md text-label-md text-on-surface">${esc(s.resumen)}</h3>
      <p class="font-body-md text-body-md text-on-surface-variant text-sm mt-1">
        ${esc(NOMBRE_ACCION[s.accion] ?? s.accion)} · pedida por ${esc(s.solicitadaPorNombre)} · ${esc(fechaHora(s.solicitadaEn))}
      </p>
    </div>
    <span class="${clases} font-label-sm text-label-sm px-2 py-1 rounded-full shrink-0">${esc(etiqueta)}</span>
  </div>

  <dl class="grid grid-cols-1 sm:grid-cols-2 gap-sm mt-md">
    <div>
      <dt class="font-label-sm text-label-sm text-on-surface-variant">Motivo</dt>
      <dd class="font-body-md text-body-md text-on-surface">${esc(s.motivo)}</dd>
    </div>
    ${
      s.evidencia
        ? `<div>
            <dt class="font-label-sm text-label-sm text-on-surface-variant">Evidencia</dt>
            <dd class="font-body-md text-body-md text-on-surface">${esc(s.evidencia)}</dd>
          </div>`
        : ''
    }
    <div>
      <dt class="font-label-sm text-label-sm text-on-surface-variant">Segundo factor de quien la pidió</dt>
      <dd class="font-body-md text-body-md ${s.mfaVerificado ? 'text-primary' : 'text-error'}">${s.mfaVerificado ? 'verificado' : 'no verificado'}</dd>
    </div>
    ${
      s.resueltaPorNombre
        ? `<div>
            <dt class="font-label-sm text-label-sm text-on-surface-variant">Firmada por</dt>
            <dd class="font-body-md text-body-md text-on-surface">${esc(s.resueltaPorNombre)} · ${esc(fechaHora(s.resueltaEn ?? ''))}</dd>
          </div>`
        : ''
    }
  </dl>

  ${
    s.motivoResolucion
      ? `<p class="font-body-md text-body-md text-on-surface-variant text-sm mt-md border-t border-outline-variant pt-sm">Motivo del rechazo: ${esc(s.motivoResolucion)}</p>`
      : ''
  }

  ${
    puedoFirmar
      ? `<div class="flex flex-wrap gap-sm mt-md border-t border-outline-variant pt-md">
          <button type="button" data-accion="firmar-aprobacion" data-valor="${esc(s.id)}" class="min-h-touch-target px-4 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity">Firmar y ejecutar</button>
          <button type="button" data-accion="rechazar-aprobacion" data-valor="${esc(s.id)}" class="min-h-touch-target px-4 rounded-lg border border-error/40 text-error font-label-md text-label-md hover:bg-error-container/20 transition-colors">Rechazar</button>
        </div>`
      : s.estado === 'pendiente'
        ? '<p class="font-body-md text-body-md text-on-surface-variant text-sm mt-md border-t border-outline-variant pt-sm">Nadie puede firmar su propia solicitud. Espera la firma de otra persona autorizada.</p>'
        : ''
  }
</article>`;
}

function seccion(titulo: string, bajada: string, lista: SolicitudAprobacion[], puedoFirmar: boolean): string {
  return `
<section class="mb-xl">
  <h2 class="font-headline-md text-headline-md text-on-surface mb-1">${esc(titulo)}</h2>
  <p class="font-body-md text-body-md text-on-surface-variant mb-md">${esc(bajada)}</p>
  ${
    lista.length === 0
      ? `<div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg text-center">
          <p class="font-body-md text-body-md text-on-surface-variant">Nada por aquí.</p>
        </div>`
      : `<div class="flex flex-col gap-md">${lista.map((s) => tarjeta(s, puedoFirmar)).join('')}</div>`
  }
</section>`;
}

export const bandejaAprobaciones: Render = (): Pagina => {
  const e = store.leer();
  const u = sesion.usuario();
  const porFirmar = pendientesPara(e, u);
  const mias = misSolicitudes(e, u).sort((a, b) => b.solicitadaEn.localeCompare(a.solicitadaEn));

  return {
    titulo: 'Aprobaciones',
    contenido: `
<div class="max-w-3xl mx-auto">
  <h1 class="titulo-pag">Aprobaciones</h1>
  <p class="bajada">Las acciones sensibles no se completan solas: quedan aquí hasta que las firme una persona distinta de quien las pidió.</p>
  ${seccion('Esperan su firma', 'Puede firmarlas y se ejecutan al momento, o rechazarlas indicando por qué.', porFirmar, true)}
  ${seccion('Sus solicitudes', 'Lo que usted pidió y su estado.', mias, false)}
</div>`,
  };
};
