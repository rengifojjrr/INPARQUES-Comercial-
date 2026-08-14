/**
 * Concesiones y control operativo de INPARQUES (fase 2), portado del HTML
 * real de Stitch.
 *
 * Fuentes:
 * - `50/p_gina_2_bandeja_de_solicitudes` → `i.solicitudes`.
 * - `50/p_gina_3_revisi_n_de_expediente` y `50/p_gina_4_aprobaci_n_y_publicaci_n`
 *   → `i.expediente` / `i.revision` / `i.aprobaciones`.
 * - `stitch_inparques_comercial_portal_visitante/p_gina_5_contratos_y_permisos`
 *   → `i.permisos` y `i.contratos` (tarjetas con barra de estado superior,
 *   detalle en dos columnas y barra de cumplimiento).
 * - `stitch_inparques_comercial_portal_visitante/p_gina_7_condiciones_econ_micas`
 *   → `i.canones`.
 * - `stitch_inparques_comercial_portal_visitante/p_gina_8_renovaciones_y_vencimientos`
 *   → `i.vencimientos`.
 * - `stitch_inparques_comercial_portal_visitante/p_gina_9_inspecciones_comerciales`
 *   y `p_gina_7_historial_de_inspecciones` → `i.inspecciones` / `i.inspeccion`.
 * - `stitch_inparques_comercial_portal_visitante/p_gina_7_incidencias`
 *   → `i.incidencias`.
 * - `stitch_inparques_comercial_portal_visitante/p_gina_5_centro_de_operaci_n`
 *   → `i.operacion`.
 *
 * Comparte con `stitch-inparques-interior.ts` la misma envoltura de panel
 * (barra lateral del rol + cabecera fija) y los mismos componentes de
 * tarjeta y tabla, que es lo que hace Stitch: son páginas del mismo portal.
 */

import { esc } from '../componentes';
import { conCajonMovil } from '../stitch-shell';
import {
  barraLateralInparques, cabeceraInparques,
  NAV_SUPERADMIN, NAV_DIRECCION, NAV_FINANZAS, NAV_ADMIN_PARQUE, NAV_SOPORTE,
} from './stitch-inparques';
import type { Pagina, Render } from './tipos';
import { store } from '../../data/store';
import { sesion } from '../../app/session';
import { filtro } from '../estado-ui';
import { resolverAmbito } from '../../domain/scope';
import { ETIQUETA_ORDEN, TONO_ORDEN } from '../../domain/state-machines';
import { formatearUsd, calcularParticipacion } from '../../domain/money';
import { fechaCorta, fechaHora, desde, diasHasta } from '../formato';
import { error404 } from './compartidas';
import type { Negocio, Orden, RoleId } from '../../domain/types';

function ambito() {
  const u = sesion.usuario();
  const e = store.leer();
  return u ? resolverAmbito(u, e) : { parqueIds: [], negocioIds: [], localIds: [], nacional: false };
}

function negociosVisibles(): Negocio[] {
  const a = ambito();
  const e = store.leer();
  return e.negocios.filter((n) => {
    if (a.nacional || a.negocioIds.includes(n.id)) return true;
    const sinLocal = !e.locales.some((l) => l.negocioId === n.id);
    return sinLocal && (n.estado === 'en_revision' || n.estado === 'borrador');
  });
}

function ordenesVisibles(): Orden[] {
  const a = ambito();
  const e = store.leer();
  return e.ordenes.filter((o) => a.nacional || a.parqueIds.includes(o.parqueId));
}

const PORTAL_POR_ROL: Partial<Record<RoleId, { nav: Array<[string, string, string]>; subtitulo: string }>> = {
  'inparques.superadmin': { nav: NAV_SUPERADMIN, subtitulo: 'Superadministrador nacional' },
  'inparques.direccion_comercial': { nav: NAV_DIRECCION, subtitulo: 'Dirección comercial' },
  'inparques.finanzas': { nav: NAV_FINANZAS, subtitulo: 'Audit & Finance Panel' },
  'inparques.admin_parque': { nav: NAV_ADMIN_PARQUE, subtitulo: 'Portal Administrativo' },
  'inparques.soporte': { nav: NAV_SOPORTE, subtitulo: 'Administrative Portal' },
};

export function marcoInparques(activo: string, titulo: string, cuerpo: string): string {
  const u = sesion.usuario()!;
  const portal = PORTAL_POR_ROL[u.rol] ?? { nav: NAV_SUPERADMIN, subtitulo: 'Panel institucional' };
  return `
${conCajonMovil(barraLateralInparques(activo, portal.nav, portal.subtitulo))}
${cabeceraInparques(titulo, u.nombre)}
<main class="pt-[88px] pl-4 lg:pl-80 pr-4 lg:pr-lg pb-xl min-h-screen">${cuerpo}</main>`;
}

function encabezado(migaja: string, titulo: string, bajada: string, acciones = ''): string {
  return `
<div class="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-md mb-lg">
  <div>
    <div class="flex items-center gap-2 text-on-surface-variant mb-1">
      <span class="font-label-sm text-label-sm">Panel institucional</span>
      <span class="material-symbols-outlined text-sm">chevron_right</span>
      <span class="font-label-sm text-label-sm font-bold text-primary">${esc(migaja)}</span>
    </div>
    <h2 class="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-on-background">${esc(titulo)}</h2>
    <p class="font-body-md text-body-md text-on-surface-variant mt-1 max-w-2xl">${esc(bajada)}</p>
  </div>
  ${acciones ? `<div class="flex gap-md shrink-0">${acciones}</div>` : ''}
</div>`;
}

function insignia(texto: string, tono: 'exito' | 'alerta' | 'error' | 'progreso' | 'neutro'): string {
  const clases: Record<string, string> = {
    exito: 'bg-primary-fixed text-on-primary-fixed',
    alerta: 'bg-tertiary-fixed text-on-tertiary-fixed',
    error: 'bg-error-container text-on-error-container',
    progreso: 'bg-secondary-container text-on-secondary-container',
    neutro: 'bg-surface-variant text-on-surface-variant',
  };
  return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${clases[tono]}">${esc(texto)}</span>`;
}

function panel(titulo: string, cuerpo: string, nota = ''): string {
  return `
<div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden">
  <div class="px-lg py-md border-b border-outline-variant flex flex-wrap gap-2 justify-between items-center">
    <h3 class="font-headline-md text-headline-md text-on-surface">${esc(titulo)}</h3>
    ${nota ? `<span class="font-label-md text-label-md text-on-surface-variant">${esc(nota)}</span>` : ''}
  </div>
  <div class="overflow-x-auto">${cuerpo}</div>
</div>`;
}

function tabla(cabeceras: string[], filas: string, vacio = 'Sin registros.'): string {
  if (!filas) return `<p class="p-lg font-body-md text-body-md text-on-surface-variant">${esc(vacio)}</p>`;
  return `
<table class="w-full text-left border-collapse">
  <thead class="bg-surface-container-low border-b border-outline-variant">
    <tr>${cabeceras.map((c, i) => `<th class="py-sm px-lg font-label-md text-label-md text-on-surface-variant font-semibold whitespace-nowrap ${i === cabeceras.length - 1 ? 'text-right' : ''}">${esc(c)}</th>`).join('')}</tr>
  </thead>
  <tbody class="font-body-md text-body-md divide-y divide-outline-variant/50">${filas}</tbody>
</table>`;
}

function chip(clave: string, valor: string, texto: string, activo: string): string {
  return `<button type="button" data-accion="filtro-${esc(clave)}" data-valor="${esc(valor)}" class="h-[44px] px-md flex items-center rounded-md font-label-md text-label-md transition-colors whitespace-nowrap ${
    valor === activo ? 'bg-primary-container text-on-primary-container' : 'bg-surface border border-outline-variant text-on-surface hover:bg-surface-container'
  }">${esc(texto)}</button>`;
}

function tarjetaDato(rotulo: string, valor: string): string {
  return `
<div class="bg-surface-container rounded-lg p-sm">
  <div class="text-xs text-on-surface-variant mb-1">${esc(rotulo)}</div>
  <div class="font-semibold text-on-surface">${esc(valor)}</div>
</div>`;
}

function vacio(icono: string, titulo: string, nota: string): string {
  return `
<div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-xl text-center">
  <span class="material-symbols-outlined text-[40px] text-outline mb-sm">${icono}</span>
  <p class="font-label-md text-label-md text-on-surface mb-1">${esc(titulo)}</p>
  <p class="font-body-md text-body-md text-on-surface-variant">${esc(nota)}</p>
</div>`;
}

// -------------------------------------------------------------- Solicitudes

export const solicitudesStitch: Render = (): Pagina => {
  const e = store.leer();
  const lista = negociosVisibles().filter((n) => ['en_revision', 'borrador'].includes(n.estado));

  const cuerpo = `
${encabezado('Solicitudes', 'Bandeja de solicitudes', 'Expedientes esperando revisión y decisión. Un expediente no se aprueba mientras tenga documentos sin revisar.')}
${
  lista.length === 0
    ? vacio('task_alt', 'Nada pendiente', 'No hay expedientes esperando revisión en su ámbito.')
    : `<div class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        ${lista
          .map((n) => {
            const docs = e.documentos.filter((d) => d.negocioId === n.id);
            const pend = docs.filter((d) => d.estado !== 'aprobado').length;
            const pct = docs.length ? Math.round(((docs.length - pend) / docs.length) * 100) : 0;
            return `<button type="button" data-accion="ir" data-valor="/i/expediente/${esc(n.id)}" class="text-left bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg flex flex-col gap-md relative overflow-hidden hover:shadow-[0px_4px_12px_rgba(40,51,46,0.08)] transition-shadow">
              <div class="absolute top-0 left-0 w-full h-1 ${pend ? 'bg-tertiary' : 'bg-primary'}"></div>
              <div class="flex justify-between items-start gap-2">
                <div>
                  <h3 class="font-headline-md text-headline-md text-on-surface">${esc(n.nombreComercial)}</h3>
                  <p class="font-body-md text-body-md text-on-surface-variant">${esc(n.razonSocial)} · RIF ${esc(n.rif)}</p>
                  <p class="font-label-sm text-label-sm text-on-surface-variant mt-1">Solicitado ${esc(desde(n.creadoEn))}</p>
                </div>
                ${insignia(`${pend} por revisar`, pend ? 'alerta' : 'exito')}
              </div>
              <div>
                <p class="font-label-sm text-label-sm text-on-surface-variant mb-xs">Documentación (${pct}%)</p>
                <div class="w-full bg-surface-container-highest rounded-full h-2">
                  <div class="${pend ? 'bg-tertiary' : 'bg-primary'} h-2 rounded-full" style="width: ${pct}%"></div>
                </div>
              </div>
            </button>`;
          })
          .join('')}
      </div>`
}`;

  return { titulo: 'Solicitudes', standalone: true, contenido: marcoInparques('/i/solicitudes', 'Bandeja de solicitudes', cuerpo) };
};

export const expedienteStitch: Render = (ctx): Pagina => {
  const e = store.leer();
  const n = e.negocios.find((x) => x.id === ctx.params.negocioId);
  if (!n) return error404(ctx);
  const docs = e.documentos.filter((d) => d.negocioId === n.id);
  const todosAprobados = docs.length > 0 && docs.every((d) => d.estado === 'aprobado');

  const cuerpo = `
${encabezado('Revisión de expediente', n.nombreComercial, `${esc(n.razonSocial)} · RIF ${esc(n.rif)} · ${esc(n.categoria)}`, `
  <button type="button" data-accion="ir" data-valor="/i/negocio/${esc(n.id)}" class="h-touch-target px-md rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-label-md text-label-md flex items-center gap-xs hover:bg-surface-container transition-colors shadow-sm">
    <span class="material-symbols-outlined text-lg">visibility</span>
    Ver ficha
  </button>`)}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Estado', n.estado.replace('_', ' '))}
  ${tarjetaDato('Documentos', `${docs.filter((d) => d.estado === 'aprobado').length}/${docs.length} aprobados`)}
  ${tarjetaDato('Observados', String(docs.filter((d) => d.estado === 'observado').length))}
  ${tarjetaDato('Alta', fechaCorta(n.creadoEn))}
</div>

${
  !todosAprobados
    ? `<div class="bg-tertiary-fixed/40 border border-tertiary rounded-lg p-lg flex gap-md items-start mb-lg">
        <span class="material-symbols-outlined text-tertiary">warning</span>
        <p class="font-body-md text-body-md text-on-surface">No debe aprobarse el expediente mientras haya documentos sin revisar.</p>
      </div>`
    : ''
}

<div class="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-lg">
  ${
    docs.length === 0
      ? vacio('folder_open', 'Sin documentos', 'Este expediente todavía no tiene documentos cargados.')
      : docs
          .map(
            (d) => `<div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg flex flex-col gap-sm">
              <div class="flex justify-between items-start gap-2">
                <div class="flex gap-md items-start">
                  <div class="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined">description</span>
                  </div>
                  <div>
                    <h4 class="font-headline-md text-headline-md text-on-surface capitalize">${esc(d.tipo.replace(/_/g, ' '))}</h4>
                    <p class="font-label-sm text-label-sm text-on-surface-variant font-mono">${esc(d.nombreArchivo)}</p>
                    ${d.vigenciaHasta ? `<p class="font-label-sm text-label-sm text-on-surface-variant">Vigencia hasta ${esc(fechaCorta(`${d.vigenciaHasta}T12:00:00`))}</p>` : ''}
                  </div>
                </div>
                ${insignia(d.estado.replace('_', ' '), d.estado === 'aprobado' ? 'exito' : d.estado === 'observado' ? 'error' : 'alerta')}
              </div>
              ${d.observacion ? `<p class="font-body-md text-body-md text-on-surface-variant bg-error-container/20 rounded-lg p-sm">${esc(d.observacion)}</p>` : ''}
              ${
                d.estado !== 'aprobado'
                  ? `<div class="flex gap-sm pt-sm border-t border-outline-variant">
                      <button type="button" data-accion="aprobar-documento" data-valor="${esc(d.id)}" class="flex-1 h-10 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity">Aprobar</button>
                      <button type="button" data-accion="observar-documento" data-valor="${esc(d.id)}" class="flex-1 h-10 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors">Observar</button>
                    </div>`
                  : ''
              }
            </div>`,
          )
          .join('')
  }
</div>

${
  n.estado === 'en_revision'
    ? `<div class="flex flex-col sm:flex-row gap-sm">
        <button type="button" data-accion="aprobar-expediente" data-valor="${esc(n.id)}" ${todosAprobados ? '' : 'disabled'} class="flex-1 h-touch-target rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
          <span class="material-symbols-outlined">check_circle</span>
          Aprobar y publicar expediente
        </button>
        <button type="button" data-accion="rechazar-expediente" data-valor="${esc(n.id)}" class="h-touch-target px-lg rounded-lg border border-outline-variant text-error font-label-md text-label-md hover:bg-error-container transition-colors">Rechazar</button>
      </div>`
    : ''
}`;

  return { titulo: 'Expediente', standalone: true, contenido: marcoInparques('/i/solicitudes', `Expediente · ${n.nombreComercial}`, cuerpo) };
};

export const aprobacionesStitch: Render = (): Pagina => {
  const e = store.leer();
  const pendientes = [
    ...e.negocios.filter((n) => n.estado === 'en_revision').map((n) => ({ tipo: 'Expediente', icono: 'folder_open', nombre: n.nombreComercial, ruta: `/i/expediente/${n.id}`, en: n.creadoEn })),
    ...e.ajustes.filter((a) => a.estado === 'solicitado').map((a) => ({ tipo: 'Ajuste financiero', icono: 'tune', nombre: a.concepto, ruta: '/i/ajustes', en: a.creadoEn })),
    ...e.reembolsos.filter((r) => r.estado === 'solicitado').map((r) => ({ tipo: 'Reembolso', icono: 'undo', nombre: r.motivo, ruta: '/i/reembolsos', en: r.creadoEn })),
  ].sort((a, b) => b.en.localeCompare(a.en));

  const cuerpo = `
${encabezado('Aprobaciones', 'Aprobación y publicación', 'Todo lo que espera una decisión suya, en un solo lugar.')}
${
  pendientes.length === 0
    ? vacio('task_alt', 'Sin pendientes', 'No hay nada esperando su aprobación.')
    : panel(
        'Cola de aprobación',
        tabla(
          ['Concepto', 'Tipo', 'Solicitado', ''],
          pendientes
            .map(
              (p) => `<tr class="hover:bg-surface-container/30 transition-colors cursor-pointer" data-accion="ir" data-valor="${esc(p.ruta)}">
                <td class="py-sm px-lg">
                  <div class="flex items-center gap-sm">
                    <span class="material-symbols-outlined text-on-surface-variant">${p.icono}</span>
                    <span class="font-semibold text-on-surface">${esc(p.nombre)}</span>
                  </div>
                </td>
                <td class="py-sm px-lg">${esc(p.tipo)}</td>
                <td class="py-sm px-lg">${esc(desde(p.en))}</td>
                <td class="py-sm px-lg text-right"><span class="material-symbols-outlined text-on-surface-variant">chevron_right</span></td>
              </tr>`,
            )
            .join(''),
        ),
        `${pendientes.length} pendiente${pendientes.length === 1 ? '' : 's'}`,
      )
}`;

  return { titulo: 'Aprobaciones', standalone: true, contenido: marcoInparques('/i/aprobaciones', 'Aprobación y publicación', cuerpo) };
};

// --------------------------------------------------------------- Concesiones

export const permisosStitch: Render = (): Pagina => {
  const e = store.leer();
  const visibles = negociosVisibles().map((n) => n.id);
  const f = filtro('permisos', 'todos');
  const todos = e.permisos.filter((p) => visibles.includes(p.negocioId));
  const lista = f === 'todos' ? todos : todos.filter((p) => p.estado === f);

  const cuerpo = `
${encabezado('Contratos y permisos', 'Permisos y concesiones', 'Registro de concesiones activas, ordenadas por proximidad de vencimiento. Gestione renovaciones y auditorías.')}

<div class="flex flex-wrap gap-sm mb-md">
  ${chip('permisos', 'todos', `Todos (${todos.length})`, f)}
  ${chip('permisos', 'vigente', 'Vigentes', f)}
  ${chip('permisos', 'por_vencer', `Por vencer (${todos.filter((p) => p.estado === 'por_vencer').length})`, f)}
  ${chip('permisos', 'vencido', 'Vencidos', f)}
</div>

${
  lista.length === 0
    ? vacio('assignment_turned_in', 'Sin permisos', 'No hay permisos con este filtro.')
    : `<div class="grid grid-cols-1 xl:grid-cols-2 gap-lg">
        ${[...lista]
          .sort((a, b) => a.hasta.localeCompare(b.hasta))
          .map((p) => {
            const negocio = e.negocios.find((n) => n.id === p.negocioId);
            const punto = e.puntos.find((x) => x.id === p.puntoId);
            const dias = diasHasta(p.hasta);
            const urgente = p.estado === 'por_vencer' || dias < 30;
            return `<div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg flex flex-col gap-md relative overflow-hidden">
              <div class="absolute top-0 left-0 w-full h-1 ${p.estado === 'vigente' ? 'bg-primary' : urgente ? 'bg-error' : 'bg-outline'}"></div>
              <div class="flex justify-between items-start gap-2">
                <div>
                  <div class="flex items-center gap-sm mb-xs">
                    <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-mono">${esc(p.numero)}</span>
                    ${insignia(dias > 0 ? `${p.estado.replace('_', ' ')} (${dias} días)` : 'Vencido', p.estado === 'vigente' ? 'exito' : p.estado === 'por_vencer' ? 'alerta' : 'error')}
                  </div>
                  <h3 class="font-headline-md text-headline-md text-on-surface">${esc(negocio?.nombreComercial ?? 'Negocio')}</h3>
                  <p class="font-body-md text-body-md text-on-surface-variant capitalize">${esc(p.tipo.replace(/_/g, ' '))}</p>
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-md py-sm border-t border-b border-outline-variant">
                <div class="space-y-sm">
                  <div>
                    <p class="font-label-sm text-label-sm text-on-surface-variant">Vencimiento</p>
                    <p class="font-body-md text-body-md ${urgente ? 'text-error font-semibold' : 'text-on-surface'}">${esc(fechaCorta(`${p.hasta}T12:00:00`))}</p>
                  </div>
                  <div>
                    <p class="font-label-sm text-label-sm text-on-surface-variant">Desde</p>
                    <p class="font-body-md text-body-md text-on-surface">${esc(fechaCorta(`${p.desde}T12:00:00`))}</p>
                  </div>
                </div>
                <div>
                  <p class="font-label-sm text-label-sm text-on-surface-variant mb-xs">Punto asignado</p>
                  <div class="flex gap-sm items-center bg-surface-container rounded-lg p-xs">
                    <div class="w-12 h-12 rounded bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                      <span class="material-symbols-outlined">location_on</span>
                    </div>
                    <div>
                      <p class="font-label-md text-label-md text-on-surface">${esc(punto?.nombre ?? 'Sin punto')}</p>
                      <p class="font-body-md text-[12px] text-on-surface-variant font-mono">${esc(punto?.codigo ?? '—')}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="mt-auto flex justify-end">
                <button type="button" data-accion="ir" data-valor="/i/negocio/${esc(p.negocioId)}" class="h-10 px-md border border-outline-variant bg-surface-container-lowest text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container transition-colors">Ver expediente</button>
              </div>
            </div>`;
          })
          .join('')}
      </div>`
}`;

  return { titulo: 'Permisos y concesiones', standalone: true, contenido: marcoInparques('/i/permisos', 'Contratos y permisos', cuerpo) };
};

export const contratosStitch: Render = (): Pagina => {
  const e = store.leer();
  const visibles = negociosVisibles().map((n) => n.id);
  const lista = e.contratos.filter((c) => visibles.includes(c.negocioId));

  const filas = lista
    .map(
      (c) => `<tr class="hover:bg-surface-container/30 transition-colors cursor-pointer" data-accion="ir" data-valor="/i/negocio/${esc(c.negocioId)}">
        <td class="py-sm px-lg font-semibold text-on-surface">${esc(e.negocios.find((n) => n.id === c.negocioId)?.nombreComercial ?? '—')}</td>
        <td class="py-sm px-lg">${esc(formatearUsd(c.canonFijoUsd))}</td>
        <td class="py-sm px-lg">${c.porcentajeSobreVenta} %</td>
        <td class="py-sm px-lg">${esc(formatearUsd(c.minimoGarantizadoUsd))}</td>
        <td class="py-sm px-lg">${esc(fechaCorta(`${c.hasta}T12:00:00`))}</td>
        <td class="py-sm px-lg text-right">${insignia(c.estado, c.estado === 'vigente' ? 'exito' : 'neutro')}</td>
      </tr>`,
    )
    .join('');

  const cuerpo = `
${encabezado('Contratos', 'Contratos y condiciones económicas', 'Condiciones económicas acordadas con cada concesionario. Modificarlas exige motivo, evidencia y verificación en dos pasos.')}
${panel('Contratos vigentes', tabla(['Comercio', 'Canon fijo', '% sobre venta', 'Mínimo', 'Vence', 'Estado'], filas, 'No hay contratos en su ámbito.'), `${lista.length} contrato${lista.length === 1 ? '' : 's'}`)}`;

  return { titulo: 'Contratos', standalone: true, contenido: marcoInparques('/i/contratos', 'Contratos', cuerpo) };
};

export const canonesStitch: Render = (): Pagina => {
  const e = store.leer();
  const filas = negociosVisibles().map((n) => {
    const contrato = e.contratos.find((c) => c.negocioId === n.id);
    const ventas = e.ordenes.filter((o) => o.negocioId === n.id && o.estado === 'entregada').reduce((s, o) => s + o.totalUsd, 0);
    const p = contrato ? calcularParticipacion(ventas, contrato) : null;
    return { negocio: n, ventas, comision: p?.comisionUsd ?? 0, canon: p?.canonUsd ?? 0, total: p?.totalUsd ?? 0 };
  });

  const totalVentas = filas.reduce((s, f) => s + f.ventas, 0);
  const totalComision = filas.reduce((s, f) => s + f.comision, 0);
  const totalCanon = filas.reduce((s, f) => s + f.canon, 0);
  const totalObligacion = filas.reduce((s, f) => s + f.total, 0);

  const cuerpo = `
${encabezado('Condiciones económicas', 'Cánones y comisiones', 'La obligación con INPARQUES se calcula por separado del ingreso del comercio: cada concepto va en su propia línea.')}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Ventas del sistema', formatearUsd(totalVentas))}
  ${tarjetaDato('Comisiones', formatearUsd(totalComision))}
  ${tarjetaDato('Cánones', formatearUsd(totalCanon))}
  ${tarjetaDato('Obligación total', formatearUsd(totalObligacion))}
</div>

${panel(
  'Detalle por concesionario',
  tabla(
    ['Comercio', 'Ventas', 'Comisión', 'Canon', 'Total'],
    filas
      .map(
        (f) => `<tr class="hover:bg-surface-container/30 transition-colors cursor-pointer" data-accion="ir" data-valor="/i/negocio/${esc(f.negocio.id)}">
          <td class="py-sm px-lg font-semibold text-on-surface">${esc(f.negocio.nombreComercial)}</td>
          <td class="py-sm px-lg">${esc(formatearUsd(f.ventas))}</td>
          <td class="py-sm px-lg text-error">${esc(formatearUsd(f.comision))}</td>
          <td class="py-sm px-lg text-error">${esc(formatearUsd(f.canon))}</td>
          <td class="py-sm px-lg text-right font-semibold">${esc(formatearUsd(f.total))}</td>
        </tr>`,
      )
      .join(''),
    'No hay concesionarios en su ámbito.',
  ),
)}`;

  return { titulo: 'Cánones y comisiones', standalone: true, contenido: marcoInparques('/i/canones', 'Cánones y comisiones', cuerpo) };
};

export const vencimientosStitch: Render = (): Pagina => {
  const e = store.leer();
  const visibles = negociosVisibles().map((n) => n.id);
  const docs = e.documentos
    .filter((d) => visibles.includes(d.negocioId) && d.vigenciaHasta)
    .map((d) => ({ tipo: 'Documento', icono: 'description', nombre: d.tipo.replace(/_/g, ' '), negocioId: d.negocioId, hasta: d.vigenciaHasta! }));
  const perms = e.permisos
    .filter((p) => visibles.includes(p.negocioId))
    .map((p) => ({ tipo: 'Permiso', icono: 'assignment_turned_in', nombre: p.numero, negocioId: p.negocioId, hasta: p.hasta }));
  const todos = [...docs, ...perms].sort((a, b) => a.hasta.localeCompare(b.hasta));

  const vencidos = todos.filter((x) => diasHasta(x.hasta) < 0).length;
  const criticos = todos.filter((x) => diasHasta(x.hasta) >= 0 && diasHasta(x.hasta) < 30).length;

  const cuerpo = `
${encabezado('Renovaciones', 'Renovaciones y vencimientos', 'Documentos y permisos de todo su ámbito ordenados por fecha de vencimiento. Un permiso vencido suspende la publicación del comercio.')}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Vencidos', String(vencidos))}
  ${tarjetaDato('Vencen en 30 días', String(criticos))}
  ${tarjetaDato('Permisos', String(perms.length))}
  ${tarjetaDato('Documentos', String(docs.length))}
</div>

${panel(
  'Calendario de vencimientos',
  tabla(
    ['Concepto', 'Tipo', 'Comercio', 'Vence', 'Días'],
    todos
      .map((x) => {
        const d = diasHasta(x.hasta);
        return `<tr class="hover:bg-surface-container/30 transition-colors cursor-pointer ${d < 0 ? 'bg-error-container/10' : ''}" data-accion="ir" data-valor="/i/negocio/${esc(x.negocioId)}">
          <td class="py-sm px-lg">
            <div class="flex items-center gap-sm">
              <span class="material-symbols-outlined text-on-surface-variant text-lg">${x.icono}</span>
              <span class="font-semibold text-on-surface capitalize">${esc(x.nombre)}</span>
            </div>
          </td>
          <td class="py-sm px-lg">${esc(x.tipo)}</td>
          <td class="py-sm px-lg">${esc(e.negocios.find((n) => n.id === x.negocioId)?.nombreComercial ?? '—')}</td>
          <td class="py-sm px-lg">${esc(fechaCorta(`${x.hasta}T12:00:00`))}</td>
          <td class="py-sm px-lg text-right">${insignia(d > 0 ? `${d} días` : 'Vencido', d < 0 ? 'error' : d < 45 ? 'alerta' : 'exito')}</td>
        </tr>`;
      })
      .join(''),
    'No hay vencimientos registrados.',
  ),
)}`;

  return { titulo: 'Vencimientos', standalone: true, contenido: marcoInparques('/i/vencimientos', 'Renovaciones y vencimientos', cuerpo) };
};

// ------------------------------------------------------------------- Control

export const inspeccionesStitch: Render = (): Pagina => {
  const e = store.leer();
  const visibles = negociosVisibles().map((n) => n.id);
  const lista = e.inspecciones.filter((i) => visibles.includes(i.negocioId)).sort((a, b) => b.fecha.localeCompare(a.fecha));

  const cuerpo = `
${encabezado(
  'Inspecciones',
  'Inspecciones comerciales',
  'Historial de inspecciones en su ámbito, con su resultado y sus hallazgos.',
  `<button type="button" data-accion="nueva-inspeccion" class="h-touch-target px-md rounded-lg bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-xs hover:opacity-90 transition-opacity shadow-sm">
    <span class="material-symbols-outlined text-lg">add</span>
    Registrar inspección
  </button>`,
)}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Total', String(lista.length))}
  ${tarjetaDato('Conformes', String(lista.filter((i) => i.resultado === 'conforme').length))}
  ${tarjetaDato('Observadas', String(lista.filter((i) => i.resultado === 'observado').length))}
  ${tarjetaDato('No conformes', String(lista.filter((i) => i.resultado === 'no_conforme').length))}
</div>

${
  lista.length === 0
    ? vacio('verified_user', 'Sin inspecciones', 'Todavía no se ha registrado ninguna inspección en su ámbito.')
    : panel(
        'Historial',
        tabla(
          ['Comercio', 'Inspector', 'Fecha', 'Hallazgos', 'Resultado'],
          lista
            .map(
              (i) => `<tr class="hover:bg-surface-container/30 transition-colors cursor-pointer" data-accion="ir" data-valor="/i/inspeccion/${esc(i.id)}">
                <td class="py-sm px-lg font-semibold text-on-surface">${esc(e.negocios.find((n) => n.id === i.negocioId)?.nombreComercial ?? '—')}</td>
                <td class="py-sm px-lg">${esc(e.usuarios.find((u) => u.id === i.inspectorId)?.nombre ?? '—')}</td>
                <td class="py-sm px-lg">${esc(fechaCorta(i.fecha))}</td>
                <td class="py-sm px-lg">${i.hallazgos.length}</td>
                <td class="py-sm px-lg text-right">${insignia(i.resultado.replace('_', ' '), i.resultado === 'conforme' ? 'exito' : i.resultado === 'observado' ? 'alerta' : 'error')}</td>
              </tr>`,
            )
            .join(''),
        ),
        `${lista.length} inspección${lista.length === 1 ? '' : 'es'}`,
      )
}`;

  return { titulo: 'Inspecciones', standalone: true, contenido: marcoInparques('/i/inspecciones', 'Inspecciones comerciales', cuerpo) };
};

export const detalleInspeccionStitch: Render = (ctx): Pagina => {
  const e = store.leer();
  const i = e.inspecciones.find((x) => x.id === ctx.params.inspeccionId);
  if (!i) return error404(ctx);
  const negocio = e.negocios.find((n) => n.id === i.negocioId);

  const cuerpo = `
${encabezado('Inspección', `Inspección · ${negocio?.nombreComercial ?? ''}`, `${esc(fechaHora(i.fecha))} · ${esc(e.usuarios.find((u) => u.id === i.inspectorId)?.nombre ?? '')}`)}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Comercio', negocio?.nombreComercial ?? '—')}
  ${tarjetaDato('Local', e.locales.find((l) => l.id === i.localId)?.nombre ?? '—')}
  ${tarjetaDato('Resultado', i.resultado.replace('_', ' '))}
  ${tarjetaDato('Hallazgos', String(i.hallazgos.length))}
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
  <div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg">
    <h3 class="font-headline-md text-headline-md text-on-surface mb-md">Hallazgos</h3>
    ${
      i.hallazgos.length === 0
        ? '<p class="font-body-md text-body-md text-on-surface-variant">Sin hallazgos registrados.</p>'
        : `<ul class="space-y-3">${i.hallazgos
            .map(
              (h) => `<li class="flex gap-3">
                <span class="material-symbols-outlined text-tertiary text-[20px] mt-0.5">flag</span>
                <span class="font-body-md text-body-md text-on-surface">${esc(h)}</span>
              </li>`,
            )
            .join('')}</ul>`
    }
  </div>
  <div class="bg-surface-container-low border border-outline-variant rounded-xl p-lg flex gap-md items-start h-fit">
    <span class="material-symbols-outlined text-tertiary">shield</span>
    <div>
      <p class="font-label-md text-label-md text-on-surface">Sin datos bancarios</p>
      <p class="font-body-md text-body-md text-on-surface-variant mt-1">El rol Inspector nunca recibe datos bancarios del comercio, ni siquiera enmascarados.</p>
    </div>
  </div>
</div>`;

  return { titulo: 'Inspección', standalone: true, contenido: marcoInparques('/i/inspecciones', 'Detalle de inspección', cuerpo) };
};

export const incidenciasStitch: Render = (): Pagina => {
  const e = store.leer();
  const a = ambito();
  const lista = e.incidencias.filter((i) => a.nacional || a.parqueIds.includes(i.parqueId)).sort((x, y) => y.creadaEn.localeCompare(x.creadaEn));

  const ICONO: Record<string, string> = {
    seguridad: 'security', higiene: 'sanitizer', permiso: 'gavel', infraestructura: 'construction', otro: 'help',
  };

  const cuerpo = `
${encabezado(
  'Incidencias',
  'Incidencias operativas',
  'Eventos reportados en los parques de su ámbito, con su estado de atención.',
  `<button type="button" data-accion="nueva-incidencia" class="h-touch-target px-md rounded-lg bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-xs hover:opacity-90 transition-opacity shadow-sm">
    <span class="material-symbols-outlined text-lg">add</span>
    Reportar incidencia
  </button>`,
)}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Abiertas', String(lista.filter((i) => i.estado === 'abierta').length))}
  ${tarjetaDato('En atención', String(lista.filter((i) => i.estado === 'en_atencion').length))}
  ${tarjetaDato('Resueltas', String(lista.filter((i) => i.estado === 'resuelta').length))}
  ${tarjetaDato('Cerradas', String(lista.filter((i) => i.estado === 'cerrada').length))}
</div>

${
  lista.length === 0
    ? vacio('report_problem', 'Sin incidencias', 'No hay incidencias abiertas en su ámbito.')
    : `<div class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        ${lista
          .map(
            (i) => `<div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg flex flex-col gap-sm relative overflow-hidden">
              <div class="absolute top-0 left-0 w-full h-1 ${i.estado === 'abierta' ? 'bg-error' : i.estado === 'en_atencion' ? 'bg-tertiary' : 'bg-primary'}"></div>
              <div class="flex justify-between items-start gap-2">
                <div class="flex gap-md items-start">
                  <div class="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined">${ICONO[i.tipo] ?? 'help'}</span>
                  </div>
                  <div>
                    <h3 class="font-headline-md text-headline-md text-on-surface capitalize">${esc(i.tipo)}</h3>
                    <p class="font-label-sm text-label-sm text-on-surface-variant">${esc(e.parques.find((p) => p.id === i.parqueId)?.nombre ?? '')} · ${esc(desde(i.creadaEn))}</p>
                  </div>
                </div>
                ${insignia(i.estado.replace('_', ' '), i.estado === 'resuelta' || i.estado === 'cerrada' ? 'exito' : i.estado === 'en_atencion' ? 'progreso' : 'alerta')}
              </div>
              <p class="font-body-md text-body-md text-on-surface-variant">${esc(i.descripcion)}</p>
            </div>`,
          )
          .join('')}
      </div>`
}`;

  return { titulo: 'Incidencias', standalone: true, contenido: marcoInparques('/i/incidencias', 'Incidencias operativas', cuerpo) };
};

export const operacionStitch: Render = (): Pagina => {
  const e = store.leer();
  const ordenes = ordenesVisibles();
  const activas = ordenes.filter((o) => !['entregada', 'cancelada'].includes(o.estado));

  const cuerpo = `
${encabezado('Operación', 'Centro de operación', 'Estado en vivo de la operación comercial en los parques de su ámbito.')}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Órdenes activas', String(activas.length))}
  ${tarjetaDato('Locales abiertos', String(e.locales.filter((l) => l.abierto).length))}
  ${tarjetaDato('Artículos agotados', String(e.articulos.filter((a) => !a.disponible).length))}
  ${tarjetaDato('Cajas abiertas', String(e.turnos.filter((t) => t.estado === 'abierto').length))}
</div>

${panel(
  'Órdenes en curso',
  tabla(
    ['Código', 'Comercio', 'Cliente', 'Total', 'Estado'],
    activas
      .map(
        (o) => `<tr class="hover:bg-surface-container/30 transition-colors">
          <td class="py-sm px-lg font-mono text-sm text-primary">${esc(o.codigo)}</td>
          <td class="py-sm px-lg font-semibold text-on-surface">${esc(e.negocios.find((x) => x.id === o.negocioId)?.nombreComercial ?? '—')}</td>
          <td class="py-sm px-lg">${esc(o.clienteNombre)}</td>
          <td class="py-sm px-lg">${esc(formatearUsd(o.totalUsd))}</td>
          <td class="py-sm px-lg text-right">${insignia(ETIQUETA_ORDEN[o.estado], TONO_ORDEN[o.estado] === 'exito' ? 'exito' : TONO_ORDEN[o.estado] === 'error' ? 'error' : 'alerta')}</td>
        </tr>`,
      )
      .join(''),
    'No hay órdenes en curso ahora mismo.',
  ),
  `${activas.length} en curso`,
)}`;

  return { titulo: 'Operación del parque', standalone: true, contenido: marcoInparques('/i/operacion', 'Centro de operación', cuerpo) };
};
