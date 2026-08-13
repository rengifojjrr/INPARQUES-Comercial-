/**
 * Finanzas y soporte de INPARQUES (fase 2), portado del HTML real de Stitch.
 *
 * Fuentes:
 * - `50/p_gina_2_libro_transaccional_de_ventas` ("Financial Audit Management
 *   - Sales") → `i.contabilidad`.
 * - `50/p_gina_4_centro_de_conciliaci_n_bancaria` → `i.conciliacion`.
 * - `stitch_inparques_comercial_portal_visitante/p_gina_6_gesti_n_de_cuentas_por_cobrar`
 *   → `i.por_cobrar`.
 * - `stitch_inparques_comercial_portal_visitante/p_gina_7_auditor_a_de_cierres_diarios`
 *   y `50/auditor_a_de_cierres_de_caja` → `i.cierres`.
 * - `stitch_inparques_comercial_portal_visitante/p_gina_8_gesti_n_de_reembolsos`
 *   → `i.reembolsos`; `los 25/p_gina_9_solicitudes_de_ajuste_financiero`
 *   → `i.ajustes`.
 * - `stitch_inparques_comercial_portal_visitante/p_gina_5_disputa_comercio_cliente`
 *   y `50/p_gina_2_detalle_del_caso` → `i.disputas` / `i.disputa`.
 * - `stitch_inparques_comercial_portal_visitante/p_gina_6_sla_y_carga_de_trabajo`
 *   → `i.sla`.
 * - `los 25/p_gina_10_reportes_comerciales` → `i.reportes`.
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
import { puedeVerBancario } from '../../domain/permissions';
import { ETIQUETA_ORDEN, ETIQUETA_PAGO, ETIQUETA_LIQUIDACION, TONO_ORDEN, TONO_PAGO } from '../../domain/state-machines';
import { formatearUsd, formatearVes } from '../../domain/money';
import { fechaCorta, fechaHora, desde } from '../formato';
import { error404 } from './compartidas';
import type { Orden, RoleId } from '../../domain/types';

function ambito() {
  const u = sesion.usuario();
  const e = store.leer();
  return u ? resolverAmbito(u, e) : { parqueIds: [], negocioIds: [], localIds: [], nacional: false };
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

function marco(activo: string, titulo: string, cuerpo: string): string {
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

const BOTON_EXPORTAR = `<button type="button" data-accion="exportar-csv" data-valor="ventas" class="h-touch-target px-md rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-label-md text-label-md flex items-center gap-xs hover:bg-surface-container transition-colors shadow-sm">
  <span class="material-symbols-outlined text-lg">download</span>
  Exportar datos
</button>`;

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

function tonoDe(t: string): 'exito' | 'alerta' | 'error' | 'progreso' | 'neutro' {
  if (t === 'exito' || t === 'error' || t === 'progreso' || t === 'alerta') return t;
  return 'neutro';
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

function tarjetaDato(rotulo: string, valor: string, tono = 'text-on-surface'): string {
  return `
<div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-md shadow-sm">
  <div class="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">${esc(rotulo)}</div>
  <div class="font-headline-md text-headline-md ${tono}">${esc(valor)}</div>
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

const NOTA_TRAZABILIDAD = `<div class="bg-surface-container-low border border-outline-variant rounded-lg p-lg flex gap-md items-start mt-lg">
  <span class="material-symbols-outlined text-tertiary">info</span>
  <p class="font-body-md text-body-md text-on-surface-variant">Cada cifra desciende hasta el parque, el negocio, la orden y el movimiento bancario. Si una cifra no es trazable, sirve para presentación, no para auditoría.</p>
</div>`;

// ------------------------------------------------------------- Contabilidad

export const contabilidadStitch: Render = (): Pagina => {
  const e = store.leer();
  const ordenes = ordenesVisibles().filter((o) => o.estado === 'entregada');
  const gmv = ordenes.reduce((s, o) => s + o.totalUsd, 0);
  const iva = ordenes.reduce((s, o) => s + o.impuestosUsd, 0);
  const liqs = e.liquidaciones;
  const devengado = liqs.reduce((s, l) => s + l.netoUsd, 0);

  const cuerpo = `
${encabezado('Contabilidad', 'Libro transaccional de ventas', 'Cada concepto por separado: ingreso, impuesto, comisión y canon.', BOTON_EXPORTAR)}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Ventas brutas', formatearUsd(gmv), 'text-primary')}
  ${tarjetaDato('IVA', formatearUsd(iva))}
  ${tarjetaDato('Devengado INPARQUES', formatearUsd(devengado), 'text-secondary')}
  ${tarjetaDato('Periodos cerrados', String(liqs.filter((l) => l.estado === 'cerrada').length))}
</div>

${panel(
  'Liquidaciones',
  tabla(
    ['Comercio', 'Periodo', 'Ventas', 'Comisión', 'Canon', 'Estado'],
    liqs
      .map(
        (l) => `<tr class="hover:bg-surface-container/30 transition-colors cursor-pointer" data-accion="ir" data-valor="/i/cierres">
          <td class="py-sm px-lg font-semibold text-on-surface">${esc(e.negocios.find((x) => x.id === l.negocioId)?.nombreComercial ?? '—')}</td>
          <td class="py-sm px-lg">${esc(fechaCorta(`${l.periodoDesde}T12:00:00`))} – ${esc(fechaCorta(`${l.periodoHasta}T12:00:00`))}</td>
          <td class="py-sm px-lg">${esc(formatearUsd(l.ventasUsd))}</td>
          <td class="py-sm px-lg text-error">${esc(formatearUsd(l.comisionUsd))}</td>
          <td class="py-sm px-lg text-error">${esc(formatearUsd(l.canonUsd))}</td>
          <td class="py-sm px-lg text-right">${insignia(ETIQUETA_LIQUIDACION[l.estado], l.estado === 'cerrada' ? 'exito' : l.estado === 'conciliada' ? 'progreso' : 'alerta')}</td>
        </tr>`,
      )
      .join(''),
    'Sin liquidaciones registradas.',
  ),
  `${liqs.length} periodo${liqs.length === 1 ? '' : 's'}`,
)}
${NOTA_TRAZABILIDAD}`;

  return { titulo: 'Contabilidad', standalone: true, contenido: marco('/i/contabilidad', 'Contabilidad', cuerpo) };
};

export const conciliacionStitch: Render = (): Pagina => {
  const e = store.leer();
  const ordenes = ordenesVisibles();
  const pagos = e.pagos.filter((p) => ordenes.some((o) => o.id === p.ordenId));
  const f = filtro('conc-inp', 'todos');
  let lista = pagos;
  if (f === 'pendientes') lista = pagos.filter((p) => p.estado === 'pendiente_verificacion');
  if (f === 'diferencias') lista = pagos.filter((p) => ['fallido', 'revertido'].includes(p.estado));

  const cuerpo = `
${encabezado('Conciliación', 'Centro de conciliación bancaria', 'Movimientos de cobro de todo su ámbito, contrastados contra la orden que los originó.', BOTON_EXPORTAR)}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Confirmados', String(pagos.filter((p) => p.estado === 'confirmado').length), 'text-primary')}
  ${tarjetaDato('Por verificar', String(pagos.filter((p) => p.estado === 'pendiente_verificacion').length), 'text-error')}
  ${tarjetaDato('Cobrado', formatearVes(pagos.filter((p) => p.estado === 'confirmado').reduce((s, p) => s + p.montoVes, 0)), 'text-secondary')}
  ${tarjetaDato('Reembolsados', String(pagos.filter((p) => p.estado === 'reembolsado').length))}
</div>

<div class="flex flex-wrap gap-sm mb-md">
  ${chip('conc-inp', 'todos', `Todos (${pagos.length})`, f)}
  ${chip('conc-inp', 'pendientes', 'Pendientes', f)}
  ${chip('conc-inp', 'diferencias', 'Diferencias', f)}
</div>

${panel(
  'Movimientos',
  tabla(
    ['Orden / Referencia', 'Método', 'Adaptador', 'Estado', 'Monto'],
    lista
      .map(
        (p) => `<tr class="hover:bg-surface-container/30 transition-colors">
          <td class="py-sm px-lg">
            <div class="font-semibold text-primary font-mono">${esc(ordenes.find((o) => o.id === p.ordenId)?.codigo ?? '—')}</div>
            <div class="text-xs text-on-surface-variant">Ref: ${esc(p.referencia ?? '—')}</div>
          </td>
          <td class="py-sm px-lg capitalize">${esc(p.metodo.replace('_', ' '))}</td>
          <td class="py-sm px-lg font-mono text-xs text-on-surface-variant">${esc(p.adaptador)}</td>
          <td class="py-sm px-lg">${insignia(ETIQUETA_PAGO[p.estado], tonoDe(TONO_PAGO[p.estado]))}</td>
          <td class="py-sm px-lg text-right">${esc(formatearVes(p.montoVes))}</td>
        </tr>`,
      )
      .join(''),
    'No hay pagos con este filtro.',
  ),
  `${lista.length} de ${pagos.length}`,
)}`;

  return { titulo: 'Conciliación', standalone: true, contenido: marco('/i/conciliacion', 'Conciliación bancaria', cuerpo) };
};

export const porCobrarStitch: Render = (): Pagina => {
  const e = store.leer();
  const lista = e.liquidaciones.filter((l) => ['por_cobrar', 'calculada'].includes(l.estado));
  const total = lista.reduce((s, l) => s + l.netoUsd, 0);

  const cuerpo = `
${encabezado('Cuentas por cobrar', 'Gestión de cuentas por cobrar', 'Obligaciones de los comercios con INPARQUES pendientes de conciliar.', BOTON_EXPORTAR)}

<div class="grid grid-cols-2 md:grid-cols-3 gap-md mb-lg">
  ${tarjetaDato('Periodos por cobrar', String(lista.length), 'text-error')}
  ${tarjetaDato('Monto pendiente', formatearUsd(total), 'text-primary')}
  ${tarjetaDato('Comercios involucrados', String(new Set(lista.map((l) => l.negocioId)).size))}
</div>

${
  lista.length === 0
    ? vacio('task_alt', 'Nada por cobrar', 'No hay obligaciones pendientes de cobro.')
    : panel(
        'Obligaciones pendientes',
        tabla(
          ['Comercio', 'Periodo', 'Monto', 'Estado', 'Acción'],
          lista
            .map(
              (l) => `<tr class="hover:bg-surface-container/30 transition-colors">
                <td class="py-sm px-lg font-semibold text-on-surface">${esc(e.negocios.find((x) => x.id === l.negocioId)?.nombreComercial ?? '—')}</td>
                <td class="py-sm px-lg">${esc(fechaCorta(`${l.periodoDesde}T12:00:00`))} – ${esc(fechaCorta(`${l.periodoHasta}T12:00:00`))}</td>
                <td class="py-sm px-lg font-semibold">${esc(formatearUsd(l.netoUsd))}</td>
                <td class="py-sm px-lg">${insignia(ETIQUETA_LIQUIDACION[l.estado], 'alerta')}</td>
                <td class="py-sm px-lg text-right">
                  <button type="button" data-accion="conciliar" data-valor="${esc(l.id)}" class="h-9 px-3 rounded-lg bg-primary-container text-on-primary font-label-sm text-label-sm hover:opacity-90 transition-opacity">Conciliar</button>
                </td>
              </tr>`,
            )
            .join(''),
        ),
      )
}`;

  return { titulo: 'Cuentas por cobrar', standalone: true, contenido: marco('/i/por_cobrar', 'Cuentas por cobrar', cuerpo) };
};

export const cierresStitch: Render = (): Pagina => {
  const e = store.leer();

  const cuerpo = `
${encabezado('Cierres', 'Auditoría de cierres', 'Un cierre no se edita ni se borra. Las correcciones se hacen con un ajuste, un reverso o una nota, dejando trazabilidad.', BOTON_EXPORTAR)}

<div class="bg-tertiary-fixed/40 border border-tertiary rounded-lg p-lg flex gap-md items-start mb-lg">
  <span class="material-symbols-outlined text-tertiary">lock</span>
  <p class="font-body-md text-body-md text-on-surface">Registros inmutables: no existe ninguna acción de "eliminar" ni de "editar cierre" en toda la aplicación.</p>
</div>

${panel(
  'Liquidaciones por periodo',
  tabla(
    ['Comercio', 'Periodo', 'Ventas', 'Neto', 'Estado', 'Acción'],
    e.liquidaciones
      .map(
        (l) => `<tr class="hover:bg-surface-container/30 transition-colors">
          <td class="py-sm px-lg font-semibold text-on-surface">${esc(e.negocios.find((x) => x.id === l.negocioId)?.nombreComercial ?? '—')}</td>
          <td class="py-sm px-lg">${esc(fechaCorta(`${l.periodoDesde}T12:00:00`))} – ${esc(fechaCorta(`${l.periodoHasta}T12:00:00`))}</td>
          <td class="py-sm px-lg">${esc(formatearUsd(l.ventasUsd))}</td>
          <td class="py-sm px-lg font-semibold">${esc(formatearUsd(l.netoUsd))}</td>
          <td class="py-sm px-lg">${insignia(ETIQUETA_LIQUIDACION[l.estado], l.estado === 'cerrada' ? 'exito' : 'alerta')}</td>
          <td class="py-sm px-lg text-right">
            ${
              l.estado === 'cerrada'
                ? '<span class="font-label-sm text-label-sm text-on-surface-variant">Solo ajuste</span>'
                : l.estado === 'conciliada'
                  ? `<button type="button" data-accion="cerrar-liquidacion" data-valor="${esc(l.id)}" class="h-9 px-3 rounded-lg bg-primary-container text-on-primary font-label-sm text-label-sm hover:opacity-90 transition-opacity">Cerrar</button>`
                  : `<button type="button" data-accion="conciliar" data-valor="${esc(l.id)}" class="h-9 px-3 rounded-lg border border-outline-variant text-on-surface font-label-sm text-label-sm hover:bg-surface-container transition-colors">Conciliar</button>`
            }
          </td>
        </tr>`,
      )
      .join(''),
    'Sin liquidaciones registradas.',
  ),
)}`;

  return { titulo: 'Cierres', standalone: true, contenido: marco('/i/cierres', 'Auditoría de cierres', cuerpo) };
};

export const reembolsosStitch: Render = (): Pagina => {
  const e = store.leer();

  const cuerpo = `
${encabezado('Reembolsos', 'Gestión de reembolsos', 'Los reembolsos altos exigen doble aprobación y verificación en dos pasos.')}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Solicitados', String(e.reembolsos.filter((r) => r.estado === 'solicitado').length), 'text-error')}
  ${tarjetaDato('Aprobados', String(e.reembolsos.filter((r) => r.estado === 'aprobado').length), 'text-primary')}
  ${tarjetaDato('Ejecutados', String(e.reembolsos.filter((r) => r.estado === 'ejecutado').length), 'text-secondary')}
  ${tarjetaDato('Monto total', formatearUsd(e.reembolsos.reduce((s, r) => s + r.montoUsd, 0)))}
</div>

${
  e.reembolsos.length === 0
    ? vacio('undo', 'Sin reembolsos', 'No se ha solicitado ningún reembolso.')
    : `<div class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        ${e.reembolsos
          .map((r) => {
            const o = e.ordenes.find((x) => x.id === r.ordenId);
            return `<div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg flex flex-col gap-sm relative overflow-hidden">
              <div class="absolute top-0 left-0 w-full h-1 ${r.estado === 'ejecutado' || r.estado === 'aprobado' ? 'bg-primary' : r.estado === 'rechazado' ? 'bg-error' : 'bg-tertiary'}"></div>
              <div class="flex justify-between items-start gap-2">
                <div>
                  <h3 class="font-headline-md text-headline-md text-on-surface">${esc(formatearUsd(r.montoUsd))}</h3>
                  <p class="font-label-sm text-label-sm text-on-surface-variant font-mono">${esc(o?.codigo ?? r.ordenId)}</p>
                </div>
                ${insignia(r.estado, r.estado === 'ejecutado' || r.estado === 'aprobado' ? 'exito' : r.estado === 'rechazado' ? 'error' : 'alerta')}
              </div>
              <div class="grid grid-cols-1 gap-2 py-sm border-t border-outline-variant">
                <div><p class="font-label-sm text-label-sm text-on-surface-variant">Motivo</p><p class="font-body-md text-body-md text-on-surface">${esc(r.motivo)}</p></div>
                ${r.evidencia ? `<div><p class="font-label-sm text-label-sm text-on-surface-variant">Evidencia</p><p class="font-body-md text-body-md text-on-surface font-mono">${esc(r.evidencia)}</p></div>` : ''}
                <div><p class="font-label-sm text-label-sm text-on-surface-variant">Solicitado por</p><p class="font-body-md text-body-md text-on-surface">${esc(e.usuarios.find((u) => u.id === r.solicitadoPor)?.nombre ?? '—')}</p></div>
                ${r.aprobadoPor ? `<div><p class="font-label-sm text-label-sm text-on-surface-variant">Aprobado por</p><p class="font-body-md text-body-md text-on-surface">${esc(e.usuarios.find((u) => u.id === r.aprobadoPor)?.nombre ?? '—')}</p></div>` : ''}
              </div>
              ${
                r.estado === 'solicitado'
                  ? `<button type="button" data-accion="aprobar-reembolso" data-valor="${esc(r.id)}" class="w-full h-touch-target rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity">Aprobar reembolso</button>`
                  : ''
              }
            </div>`;
          })
          .join('')}
      </div>`
}`;

  return { titulo: 'Reembolsos', standalone: true, contenido: marco('/i/reembolsos', 'Gestión de reembolsos', cuerpo) };
};

export const ajustesStitch: Render = (): Pagina => {
  const e = store.leer();

  const cuerpo = `
${encabezado('Ajustes', 'Solicitudes de ajuste financiero', 'Correcciones sobre periodos cerrados, siempre con motivo y evidencia. Un cierre nunca se edita en su lugar.')}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Solicitados', String(e.ajustes.filter((a) => a.estado === 'solicitado').length), 'text-error')}
  ${tarjetaDato('Aprobados', String(e.ajustes.filter((a) => a.estado === 'aprobado').length), 'text-primary')}
  ${tarjetaDato('Rechazados', String(e.ajustes.filter((a) => a.estado === 'rechazado').length))}
  ${tarjetaDato('Monto ajustado', formatearUsd(e.ajustes.filter((a) => a.estado === 'aprobado').reduce((s, a) => s + a.montoUsd, 0)))}
</div>

${
  e.ajustes.length === 0
    ? vacio('tune', 'Sin ajustes', 'No se ha registrado ningún ajuste.')
    : panel(
        'Solicitudes',
        tabla(
          ['Concepto', 'Monto', 'Motivo', 'Solicitado', 'Estado'],
          e.ajustes
            .map(
              (a) => `<tr class="hover:bg-surface-container/30 transition-colors">
                <td class="py-sm px-lg font-semibold text-on-surface">${esc(a.concepto)}</td>
                <td class="py-sm px-lg">${esc(formatearUsd(a.montoUsd))}</td>
                <td class="py-sm px-lg">${esc(a.motivo)}</td>
                <td class="py-sm px-lg">${esc(desde(a.creadoEn))}</td>
                <td class="py-sm px-lg text-right">${insignia(a.estado, a.estado === 'aprobado' ? 'exito' : a.estado === 'rechazado' ? 'error' : 'alerta')}</td>
              </tr>`,
            )
            .join(''),
        ),
      )
}`;

  return { titulo: 'Ajustes', standalone: true, contenido: marco('/i/ajustes', 'Solicitudes de ajuste', cuerpo) };
};

// --------------------------------------------------------------- Soporte

export const disputasStitch: Render = (): Pagina => {
  const e = store.leer();
  const f = filtro('disputas', 'abiertas');
  let lista = e.disputas;
  if (f === 'abiertas') lista = lista.filter((d) => ['abierta', 'en_analisis'].includes(d.estado));
  if (f === 'resueltas') lista = lista.filter((d) => d.estado.startsWith('resuelta'));

  const cuerpo = `
${encabezado('Disputas', 'Disputas comercio–cliente', 'Reclamos abiertos por visitantes sobre una orden. Cada caso tiene un compromiso de respuesta.')}

<div class="flex flex-wrap gap-sm mb-md">
  ${chip('disputas', 'abiertas', `Abiertas (${e.disputas.filter((d) => ['abierta', 'en_analisis'].includes(d.estado)).length})`, f)}
  ${chip('disputas', 'resueltas', 'Resueltas', f)}
  ${chip('disputas', 'todas', `Todas (${e.disputas.length})`, f)}
</div>

${
  lista.length === 0
    ? vacio('flag', 'Sin disputas', 'No hay reclamos con este filtro.')
    : `<div class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        ${lista
          .map((d) => {
            const o = e.ordenes.find((x) => x.id === d.ordenId);
            const horas = (Date.now() - new Date(d.creadaEn).getTime()) / 3600000;
            const vencido = !d.estado.startsWith('resuelta') && horas > d.slaHoras;
            return `<button type="button" data-accion="ir" data-valor="/i/disputa/${esc(d.id)}" class="text-left bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg flex flex-col gap-sm relative overflow-hidden hover:shadow-[0px_4px_12px_rgba(40,51,46,0.08)] transition-shadow">
              <div class="absolute top-0 left-0 w-full h-1 ${d.estado.startsWith('resuelta') ? 'bg-primary' : vencido ? 'bg-error' : 'bg-tertiary'}"></div>
              <div class="flex justify-between items-start gap-2">
                <div>
                  <h3 class="font-headline-md text-headline-md text-on-surface">${esc(d.motivo)}</h3>
                  <p class="font-label-sm text-label-sm text-on-surface-variant font-mono">${esc(o?.codigo ?? '')} · ${esc(desde(d.creadaEn))}</p>
                </div>
                ${insignia(d.estado.replace(/_/g, ' '), d.estado.startsWith('resuelta') ? 'exito' : d.estado === 'en_analisis' ? 'progreso' : 'alerta')}
              </div>
              <p class="font-body-md text-body-md text-on-surface-variant line-clamp-2">${esc(d.descripcion)}</p>
              <div class="flex items-center gap-xs pt-sm border-t border-outline-variant">
                <span class="material-symbols-outlined text-[16px] ${vencido ? 'text-error' : 'text-on-surface-variant'}">schedule</span>
                <span class="font-label-sm text-label-sm ${vencido ? 'text-error font-bold' : 'text-on-surface-variant'}">Compromiso ${d.slaHoras} h${vencido ? ' · vencido' : ''}</span>
              </div>
            </button>`;
          })
          .join('')}
      </div>`
}`;

  return { titulo: 'Disputas', standalone: true, contenido: marco('/i/disputas', 'Disputas', cuerpo) };
};

export const detalleDisputaStitch: Render = (ctx): Pagina => {
  const e = store.leer();
  const d = e.disputas.find((x) => x.id === ctx.params.disputaId);
  if (!d) return error404(ctx);
  const o = e.ordenes.find((x) => x.id === d.ordenId);
  const pago = e.pagos.find((p) => p.ordenId === d.ordenId);
  const u = sesion.usuario()!;

  const cuerpo = `
${encabezado('Detalle del caso', d.motivo, `Abierta ${esc(fechaHora(d.creadaEn))} · compromiso de ${d.slaHoras} horas`)}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Estado', d.estado.replace(/_/g, ' '))}
  ${tarjetaDato('Compromiso', `${d.slaHoras} h`)}
  ${tarjetaDato('Agente', e.usuarios.find((x) => x.id === d.agenteId)?.nombre ?? 'Sin asignar')}
  ${tarjetaDato('Orden', o?.codigo ?? '—')}
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-lg">
  <div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg">
    <h3 class="font-headline-md text-headline-md text-on-surface mb-md">Descripción del cliente</h3>
    <p class="font-body-md text-body-md text-on-surface-variant">${esc(d.descripcion)}</p>
    ${d.evidencia ? `<p class="font-label-sm text-label-sm text-on-surface-variant font-mono mt-md">Evidencia: ${esc(d.evidencia)}</p>` : ''}
  </div>
  ${
    o
      ? `<div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg">
          <h3 class="font-headline-md text-headline-md text-on-surface mb-md">Orden relacionada</h3>
          <div class="grid grid-cols-2 gap-md">
            ${tarjetaDato('Comercio', e.negocios.find((n) => n.id === o.negocioId)?.nombreComercial ?? '—')}
            ${tarjetaDato('Total', formatearUsd(o.totalUsd))}
          </div>
          <div class="flex flex-wrap gap-2 mt-md">
            ${insignia(ETIQUETA_ORDEN[o.estado], tonoDe(TONO_ORDEN[o.estado]))}
            ${pago ? insignia(ETIQUETA_PAGO[pago.estado], tonoDe(TONO_PAGO[pago.estado])) : ''}
          </div>
        </div>`
      : ''
  }
</div>

<div class="bg-surface-container-low border border-outline-variant rounded-lg p-lg flex gap-md items-start mb-lg">
  <span class="material-symbols-outlined text-tertiary">shield</span>
  <p class="font-body-md text-body-md text-on-surface-variant">El rol Soporte accede solo a lo indispensable para resolver el caso: no ve datos bancarios del comercio.</p>
</div>

${
  !d.estado.startsWith('resuelta') && !puedeVerBancario(u.rol)
    ? `<div class="flex flex-col sm:flex-row gap-sm">
        <button type="button" data-accion="resolver-disputa" data-valor="${esc(d.id)}|cliente" class="flex-1 h-touch-target rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity">Resolver a favor del cliente</button>
        <button type="button" data-accion="resolver-disputa" data-valor="${esc(d.id)}|comercio" class="h-touch-target px-lg rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors">A favor del comercio</button>
      </div>`
    : ''
}`;

  return { titulo: 'Disputa', standalone: true, contenido: marco('/i/disputas', 'Detalle del caso', cuerpo) };
};

export const slaStitch: Render = (): Pagina => {
  const e = store.leer();
  const abiertas = e.disputas.filter((d) => !d.estado.startsWith('resuelta'));
  const dentro = abiertas.filter((d) => (Date.now() - new Date(d.creadaEn).getTime()) / 3600000 < d.slaHoras);
  const resolucion = e.disputas.length ? Math.round((e.disputas.filter((d) => d.estado.startsWith('resuelta')).length / e.disputas.length) * 100) : 0;

  const cuerpo = `
${encabezado('SLA', 'SLA y carga de trabajo', 'Compromisos de respuesta de los casos abiertos, ordenados por urgencia.')}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Casos abiertos', String(abiertas.length))}
  ${tarjetaDato('Dentro del plazo', String(dentro.length), 'text-primary')}
  ${tarjetaDato('Fuera de plazo', String(abiertas.length - dentro.length), abiertas.length - dentro.length ? 'text-error' : 'text-on-surface')}
  ${tarjetaDato('Tasa de resolución', `${resolucion} %`, 'text-secondary')}
</div>

${panel(
  'Casos abiertos',
  tabla(
    ['Caso', 'Abierto', 'Compromiso', 'Estado'],
    abiertas
      .map((d) => {
        const h = (Date.now() - new Date(d.creadaEn).getTime()) / 3600000;
        return `<tr class="hover:bg-surface-container/30 transition-colors cursor-pointer" data-accion="ir" data-valor="/i/disputa/${esc(d.id)}">
          <td class="py-sm px-lg font-semibold text-on-surface">${esc(d.motivo)}</td>
          <td class="py-sm px-lg">${esc(desde(d.creadaEn))}</td>
          <td class="py-sm px-lg">${d.slaHoras} h</td>
          <td class="py-sm px-lg text-right">${insignia(h < d.slaHoras ? 'En plazo' : 'Vencido', h < d.slaHoras ? 'exito' : 'error')}</td>
        </tr>`;
      })
      .join(''),
    'Sin casos abiertos.',
  ),
)}`;

  return { titulo: 'SLA de soporte', standalone: true, contenido: marco('/i/sla', 'SLA y carga de trabajo', cuerpo) };
};

// ----------------------------------------------------------------- Reportes

export const reportesStitch: Render = (): Pagina => {
  const e = store.leer();
  const ordenes = ordenesVisibles().filter((o) => o.estado === 'entregada');
  const total = ordenes.reduce((s, o) => s + o.totalUsd, 0);
  const ticket = ordenes.length ? total / ordenes.length : 0;

  const porParque = e.parques
    .map((p) => {
      const os = ordenes.filter((o) => o.parqueId === p.id);
      return { parque: p, pedidos: os.length, total: os.reduce((s, o) => s + o.totalUsd, 0) };
    })
    .filter((x) => x.pedidos > 0)
    .sort((a, b) => b.total - a.total);

  const porCategoria = new Map<string, number>();
  for (const o of ordenes) {
    const n = e.negocios.find((x) => x.id === o.negocioId);
    if (n) porCategoria.set(n.categoria, (porCategoria.get(n.categoria) ?? 0) + o.totalUsd);
  }

  const cuerpo = `
${encabezado('Reportes', 'Reportes comerciales', 'Desempeño comercial del sistema de parques, con el detalle por parque y por categoría.', BOTON_EXPORTAR)}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Ventas totales', formatearUsd(total), 'text-primary')}
  ${tarjetaDato('Pedidos entregados', String(ordenes.length))}
  ${tarjetaDato('Ticket promedio', formatearUsd(ticket))}
  ${tarjetaDato('Parques con actividad', String(porParque.length), 'text-secondary')}
</div>

<div class="grid grid-cols-12 gap-lg">
  <div class="col-span-12 xl:col-span-7">
    ${panel(
      'Ventas por parque',
      tabla(
        ['Parque', 'Pedidos', 'Ventas'],
        porParque
          .map(
            (x) => `<tr class="hover:bg-surface-container/30 transition-colors cursor-pointer" data-accion="ir" data-valor="/i/parque/${esc(x.parque.id)}">
              <td class="py-sm px-lg font-semibold text-on-surface">${esc(x.parque.nombre)}</td>
              <td class="py-sm px-lg">${x.pedidos}</td>
              <td class="py-sm px-lg text-right font-semibold">${esc(formatearUsd(x.total))}</td>
            </tr>`,
          )
          .join(''),
        'Sin ventas registradas en su ámbito.',
      ),
    )}
  </div>
  <div class="col-span-12 xl:col-span-5">
    ${panel(
      'Ventas por categoría',
      tabla(
        ['Categoría', 'Ventas'],
        [...porCategoria.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(
            ([c, v]) => `<tr class="hover:bg-surface-container/30 transition-colors">
              <td class="py-sm px-lg font-semibold text-on-surface capitalize">${esc(c)}</td>
              <td class="py-sm px-lg text-right">${esc(formatearUsd(v))}</td>
            </tr>`,
          )
          .join(''),
        'Sin ventas por categoría.',
      ),
    )}
  </div>
</div>
${NOTA_TRAZABILIDAD}`;

  return { titulo: 'Reportes', standalone: true, contenido: marco('/i/reportes', 'Reportes comerciales', cuerpo) };
};
