/**
 * Interior del panel institucional INPARQUES (fase 2), portado del HTML real
 * de Stitch.
 *
 * Fuentes:
 * - `50/p_gina_2_estructura_territorial` ("INPARQUES Control Panel -
 *   Estructura territorial") → `i.territorio`. Es la pantalla de dos paneles
 *   (árbol jerárquico a la izquierda, ficha del nodo seleccionado a la
 *   derecha) y marca el patrón visual del resto del panel: migaja de pan,
 *   encabezado con acciones y tarjetas blancas con borde.
 * - `50/p_gina_3_ficha_maestra_del_parque` → `i.parque`.
 * - `50/p_gina_4_directorio_nacional_de_negocios` → `i.negocios` (tabla densa
 *   con barra de herramientas de búsqueda y filtros).
 * - `stitch_inparques_comercial_portal_visitante/p_gina_5_usuarios_roles_y_mbitos`
 *   → `i.usuarios`, `i.roles`, `i.ambitos`.
 * - `stitch_inparques_comercial_portal_visitante/p_gina_7_reglas_globales`
 *   → `i.reglas`; `p_gina_8_integraciones` → `i.integraciones`;
 *   `p_gina_9_auditor_a_global` → `i.auditoria`;
 *   `los 25/p_gina_10_seguridad_y_sesiones` → `i.sesiones`.
 *
 * Estas rutas las comparten varios roles institucionales. Cada uno conserva
 * la barra lateral que Stitch le dibujó (la de superadministrador, la de
 * dirección comercial, etc.), igual que en el portal de comercio: el lienzo
 * es el mismo, el portal que lo enmarca no.
 */

import { esc } from '../componentes';
import { conCajonMovil } from '../stitch-shell';
import { mapaParque, leyendaMapa } from '../mapa';
import {
  barraLateralInparques, cabeceraInparques,
  NAV_SUPERADMIN, NAV_DIRECCION, NAV_FINANZAS, NAV_ADMIN_PARQUE, NAV_SOPORTE,
} from './stitch-inparques';
import type { Pagina, Render } from './tipos';
import { store } from '../../data/store';
import { sesion } from '../../app/session';
import { filtro } from '../estado-ui';
import { ROLES, ROLE_IDS } from '../../domain/roles';
import { PERMISOS_POR_ROL } from '../../domain/permissions';
import { resolverAmbito } from '../../domain/scope';
import { consultar } from '../../data/audit';
import { formatearUsd } from '../../domain/money';
import { fechaCorta, fechaHora, desde, pluralizar } from '../formato';
import { error404 } from './compartidas';
import type { Negocio, RoleId } from '../../domain/types';

function ambito() {
  const u = sesion.usuario();
  const e = store.leer();
  return u ? resolverAmbito(u, e) : { parqueIds: [], negocioIds: [], localIds: [], nacional: false };
}

const PORTAL_POR_ROL: Partial<Record<RoleId, { nav: Array<[string, string, string]>; subtitulo: string }>> = {
  'inparques.superadmin': { nav: NAV_SUPERADMIN, subtitulo: 'Superadministrador nacional' },
  'inparques.direccion_comercial': { nav: NAV_DIRECCION, subtitulo: 'Dirección comercial' },
  'inparques.finanzas': { nav: NAV_FINANZAS, subtitulo: 'Audit & Finance Panel' },
  'inparques.admin_parque': { nav: NAV_ADMIN_PARQUE, subtitulo: 'Portal Administrativo' },
  'inparques.soporte': { nav: NAV_SOPORTE, subtitulo: 'Administrative Portal' },
};

/** Envoltura del panel: barra lateral del rol + cabecera fija + lienzo. */
function marco(activo: string, titulo: string, cuerpo: string): string {
  const u = sesion.usuario()!;
  const portal = PORTAL_POR_ROL[u.rol] ?? { nav: NAV_SUPERADMIN, subtitulo: 'Panel institucional' };
  return `
${conCajonMovil(barraLateralInparques(activo, portal.nav, portal.subtitulo))}
${cabeceraInparques(titulo, u.nombre)}
<main class="pt-[88px] pl-4 lg:pl-80 pr-4 lg:pr-lg pb-xl min-h-screen">${cuerpo}</main>`;
}

/** Migaja + título + bajada + acciones: el encabezado del original. */
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

function insignia(texto: string, tono: 'exito' | 'alerta' | 'error' | 'neutro'): string {
  const clases: Record<string, string> = {
    exito: 'bg-primary-fixed text-on-primary-fixed',
    alerta: 'bg-tertiary-fixed text-on-tertiary-fixed',
    error: 'bg-error-container text-on-error-container',
    neutro: 'bg-surface-variant text-on-surface-variant',
  };
  return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${clases[tono]}">${
    tono === 'exito' ? '<span class="w-1.5 h-1.5 rounded-full bg-primary mr-1"></span>' : ''
  }${esc(texto)}</span>`;
}

/** Tarjeta blanca con cabecera, el contenedor de tabla del original. */
function panel(titulo: string, cuerpo: string, nota = ''): string {
  return `
<div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden">
  <div class="px-lg py-md border-b border-outline-variant bg-surface-container-lowest flex flex-wrap gap-2 justify-between items-center">
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
    <tr>
      ${cabeceras.map((c, i) => `<th class="py-sm px-lg font-label-md text-label-md text-on-surface-variant font-semibold whitespace-nowrap ${i === cabeceras.length - 1 ? 'text-right' : ''}">${esc(c)}</th>`).join('')}
    </tr>
  </thead>
  <tbody class="font-body-md text-body-md divide-y divide-outline-variant/50">${filas}</tbody>
</table>`;
}

function chip(clave: string, valor: string, texto: string, activo: string): string {
  return `<button type="button" data-accion="filtro-${esc(clave)}" data-valor="${esc(valor)}" class="h-[44px] px-md flex items-center gap-sm rounded-md font-label-md text-label-md transition-colors whitespace-nowrap ${
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

// -------------------------------------------------------------- Territorio

export const territorioStitch: Render = (): Pagina => {
  const e = store.leer();
  const a = ambito();
  const parquesVisibles = e.parques.filter((p) => a.nacional || a.parqueIds.includes(p.id));
  const seleccionadoId = filtro('territorio-nodo', parquesVisibles[0]?.id ?? '');
  const seleccionado = parquesVisibles.find((p) => p.id === seleccionadoId) ?? parquesVisibles[0];

  const filas = e.regiones
    .map((r) => {
      const parques = parquesVisibles.filter((p) => p.regionId === r.id);
      if (parques.length === 0) return '';
      const filaRegion = `
<tr class="border-b border-outline-variant/50 hover:bg-surface-container/30 transition-colors">
  <td class="py-sm px-lg">
    <div class="flex items-center gap-xs">
      <span class="material-symbols-outlined text-on-surface-variant text-lg">map</span>
      <div>
        <div class="font-semibold text-on-surface">${esc(r.nombre)}</div>
        <div class="text-xs text-on-surface-variant font-mono">${esc(r.id.toUpperCase())}</div>
      </div>
    </div>
  </td>
  <td class="py-sm px-md"><span class="text-sm text-on-surface-variant">Región</span></td>
  <td class="py-sm px-md">${insignia('Activa', 'exito')}</td>
  <td class="py-sm px-md text-right"><span class="font-label-sm text-label-sm text-on-surface-variant">${pluralizar(parques.length, 'parque', 'parques')}</span></td>
</tr>`;
      const filasParque = parques
        .map((p) => {
          const activo = p.id === seleccionado?.id;
          const zonas = e.zonas.filter((z) => z.parqueId === p.id).length;
          return `
<tr class="border-b border-outline-variant/50 transition-colors cursor-pointer ${activo ? 'bg-surface-container-lowest' : 'hover:bg-surface-container/30'}"
  data-accion="filtro-territorio-nodo" data-valor="${esc(p.id)}">
  <td class="py-sm px-lg pl-12 ${activo ? 'border-l-4 border-primary' : ''}">
    <div class="flex items-center gap-xs">
      <span class="material-symbols-outlined ${activo ? 'text-primary' : 'text-on-surface-variant'} text-lg">park</span>
      <div>
        <div class="font-semibold ${activo ? 'text-primary' : 'text-on-surface'}">${esc(p.nombre)}</div>
        <div class="text-xs text-on-surface-variant font-mono">${esc(p.id.toUpperCase())}</div>
      </div>
    </div>
  </td>
  <td class="py-sm px-md"><span class="text-sm text-on-surface-variant">Parque</span></td>
  <td class="py-sm px-md">${insignia(p.activo ? 'Activo' : 'Inactivo', p.activo ? 'exito' : 'neutro')}</td>
  <td class="py-sm px-md text-right"><span class="font-label-sm text-label-sm text-on-surface-variant">${pluralizar(zonas, 'zona', 'zonas')}</span></td>
</tr>`;
        })
        .join('');
      return filaRegion + filasParque;
    })
    .join('');

  const zonasSel = seleccionado ? e.zonas.filter((z) => z.parqueId === seleccionado.id) : [];
  const puntosSel = seleccionado ? e.puntos.filter((p) => p.parqueId === seleccionado.id) : [];

  const cuerpo = `
${encabezado(
  'Estructura territorial',
  'Gestión de la estructura territorial',
  'Jerarquía administrativa: nacional › región › parque › zona › punto comercial › negocio › local. Los nodos con historial no se eliminan, se desactivan.',
  BOTON_EXPORTAR,
)}

<div class="grid grid-cols-12 gap-lg">
  <div class="col-span-12 xl:col-span-7">
    ${panel('Árbol de jerarquía', tabla(['Nodo / Código', 'Tipo', 'Estado', 'Contiene'], filas, 'No hay territorio visible en su ámbito.'))}
  </div>

  <div class="col-span-12 xl:col-span-5 flex flex-col gap-lg">
    ${
      seleccionado
        ? `<div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg">
            <div class="flex justify-between items-start mb-md gap-2">
              <div>
                <div class="flex items-center gap-xs mb-1">
                  <span class="material-symbols-outlined text-primary text-sm">park</span>
                  <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Nodo seleccionado</span>
                </div>
                <h3 class="font-headline-md text-headline-md text-on-surface font-bold">${esc(seleccionado.nombre)}</h3>
                <div class="font-mono text-sm text-on-surface-variant mt-1">ID: ${esc(seleccionado.id.toUpperCase())}</div>
              </div>
              ${insignia(seleccionado.activo ? 'Activo' : 'Inactivo', seleccionado.activo ? 'exito' : 'neutro')}
            </div>
            <div class="grid grid-cols-2 gap-md mb-lg">
              ${tarjetaDato('Zonas', String(zonasSel.length))}
              ${tarjetaDato('Puntos comerciales', String(puntosSel.length))}
              ${tarjetaDato('Puntos ocupados', String(puntosSel.filter((p) => p.estado === 'ocupado').length))}
              ${tarjetaDato('Horario', seleccionado.horario)}
            </div>
            <div class="flex gap-sm">
              <button type="button" data-accion="ir" data-valor="/i/parque/${esc(seleccionado.id)}" class="flex-1 h-touch-target rounded-lg bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center gap-xs hover:opacity-90 transition-opacity shadow-sm">
                <span class="material-symbols-outlined text-lg">visibility</span>
                Ver parque
              </button>
              <button type="button" data-accion="ir" data-valor="/i/dashboard/parque/${esc(seleccionado.id)}" class="h-touch-target px-md rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-label-md text-label-md flex items-center justify-center hover:bg-surface-container transition-colors shadow-sm" title="Tablero del parque">
                <span class="material-symbols-outlined text-lg">monitoring</span>
              </button>
            </div>
          </div>`
        : ''
    }
    ${
      seleccionado
        ? `<div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div class="px-lg py-md border-b border-outline-variant flex justify-between items-center">
              <h3 class="font-headline-md text-headline-md text-on-surface">Mapa del nodo</h3>
              <span class="material-symbols-outlined text-on-surface-variant">map</span>
            </div>
            <div class="overflow-x-auto"><div class="min-w-[420px]">${mapaParque(seleccionado.id, {
              rutaPunto: (negocioId) => `/i/negocio/${negocioId}`,
              rutaZona: () => `/i/zonas`,
              mostrarNoOcupados: true,
            })}</div></div>
            <div class="p-md border-t border-outline-variant bg-surface">${leyendaMapa(true)}</div>
          </div>`
        : ''
    }
    ${
      zonasSel.length
        ? panel(
            'Zonas del nodo',
            tabla(
              ['Zona', 'Puntos', 'Ocupados'],
              zonasSel
                .map((z) => {
                  const pz = puntosSel.filter((p) => p.zonaId === z.id);
                  return `<tr class="hover:bg-surface-container/30 transition-colors">
                    <td class="py-sm px-lg font-semibold text-on-surface">${esc(z.nombre)}</td>
                    <td class="py-sm px-lg">${pz.length}</td>
                    <td class="py-sm px-lg text-right">${pz.filter((p) => p.estado === 'ocupado').length}</td>
                  </tr>`;
                })
                .join(''),
            ),
          )
        : ''
    }
  </div>
</div>`;

  return { titulo: 'Estructura territorial', standalone: true, contenido: marco('/i/territorio', 'Estructura territorial', cuerpo) };
};

// ------------------------------------------------------------------ Parques

export const parquesStitch: Render = (): Pagina => {
  const e = store.leer();
  const a = ambito();
  const lista = e.parques.filter((p) => a.nacional || a.parqueIds.includes(p.id));

  const filas = lista
    .map(
      (p) => `<tr class="hover:bg-surface-container/30 transition-colors cursor-pointer" data-accion="ir" data-valor="/i/parque/${esc(p.id)}">
        <td class="py-sm px-lg">
          <div class="font-semibold text-on-surface">${esc(p.nombre)}</div>
          <div class="text-xs text-on-surface-variant font-mono">${esc(p.id.toUpperCase())}</div>
        </td>
        <td class="py-sm px-lg capitalize">${esc(p.tipo)}</td>
        <td class="py-sm px-lg">${esc(e.regiones.find((r) => r.id === p.regionId)?.nombre ?? '—')}</td>
        <td class="py-sm px-lg">${e.zonas.filter((z) => z.parqueId === p.id).length}</td>
        <td class="py-sm px-lg text-right">${insignia(p.activo ? 'Activo' : 'Inactivo', p.activo ? 'exito' : 'neutro')}</td>
      </tr>`,
    )
    .join('');

  const cuerpo = `
${encabezado('Parques', 'Parques nacionales', 'Parques bajo su ámbito, con su región, sus zonas y su estado operativo.', BOTON_EXPORTAR)}
${panel('Listado de parques', tabla(['Parque / Código', 'Tipo', 'Región', 'Zonas', 'Estado'], filas, 'No hay parques en su ámbito.'), `${lista.length} parque${lista.length === 1 ? '' : 's'}`)}`;

  return { titulo: 'Parques', standalone: true, contenido: marco('/i/parques', 'Parques', cuerpo) };
};

export const detalleParqueStitch: Render = (ctx): Pagina => {
  const e = store.leer();
  const p = e.parques.find((x) => x.id === ctx.params.parqueId);
  if (!p) return error404(ctx);
  const zonas = e.zonas.filter((z) => z.parqueId === p.id);
  const puntos = e.puntos.filter((x) => x.parqueId === p.id);
  const locales = e.locales.filter((l) => l.parqueId === p.id);

  const cuerpo = `
${encabezado(
  'Ficha del parque',
  p.nombre,
  `${esc(e.regiones.find((r) => r.id === p.regionId)?.nombre ?? 'Sin región')} · ${esc(p.tipo)} · ${esc(p.horario)}`,
  `<button type="button" data-accion="ir" data-valor="/i/dashboard/parque/${esc(p.id)}" class="h-touch-target px-md rounded-lg bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-xs hover:opacity-90 transition-opacity shadow-sm">
    <span class="material-symbols-outlined text-lg">monitoring</span>
    Tablero del parque
  </button>`,
)}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Zonas', String(zonas.length))}
  ${tarjetaDato('Puntos comerciales', String(puntos.length))}
  ${tarjetaDato('Puntos ocupados', String(puntos.filter((x) => x.estado === 'ocupado').length))}
  ${tarjetaDato('Locales activos', String(locales.filter((l) => l.abierto).length))}
</div>

<div class="grid grid-cols-12 gap-lg">
  <div class="col-span-12 xl:col-span-6">
    ${panel(
      'Zonas',
      tabla(
        ['Zona', 'Puntos', 'Ocupados'],
        zonas
          .map((z) => {
            const pz = puntos.filter((x) => x.zonaId === z.id);
            return `<tr class="hover:bg-surface-container/30 transition-colors">
              <td class="py-sm px-lg font-semibold text-on-surface">${esc(z.nombre)}</td>
              <td class="py-sm px-lg">${pz.length}</td>
              <td class="py-sm px-lg text-right">${pz.filter((x) => x.estado === 'ocupado').length}</td>
            </tr>`;
          })
          .join(''),
      ),
    )}
  </div>
  <div class="col-span-12 xl:col-span-6">
    ${panel(
      'Puntos comerciales',
      tabla(
        ['Código', 'Punto', 'Estado'],
        puntos
          .map(
            (x) => `<tr class="hover:bg-surface-container/30 transition-colors">
              <td class="py-sm px-lg font-mono text-sm text-on-surface-variant">${esc(x.codigo)}</td>
              <td class="py-sm px-lg font-semibold text-on-surface">${esc(x.nombre)}</td>
              <td class="py-sm px-lg text-right">${insignia(x.estado, x.estado === 'ocupado' ? 'exito' : x.estado === 'libre' ? 'neutro' : 'error')}</td>
            </tr>`,
          )
          .join(''),
      ),
    )}
  </div>
</div>`;

  return { titulo: p.nombre, standalone: true, contenido: marco('/i/parques', p.nombre, cuerpo) };
};

export const zonasStitch: Render = (): Pagina => {
  const e = store.leer();
  const a = ambito();
  const lista = e.zonas.filter((z) => a.nacional || a.parqueIds.includes(z.parqueId));

  const filas = lista
    .map(
      (z) => `<tr class="hover:bg-surface-container/30 transition-colors">
        <td class="py-sm px-lg font-semibold text-on-surface">${esc(z.nombre)}</td>
        <td class="py-sm px-lg">${esc(e.parques.find((x) => x.id === z.parqueId)?.nombre ?? '—')}</td>
        <td class="py-sm px-lg text-right">${e.puntos.filter((x) => x.zonaId === z.id).length}</td>
      </tr>`,
    )
    .join('');

  const cuerpo = `
${encabezado('Zonas', 'Zonas de los parques', 'Subdivisiones internas de cada parque donde se ubican los puntos comerciales.')}
${panel('Listado de zonas', tabla(['Zona', 'Parque', 'Puntos'], filas, 'No hay zonas en su ámbito.'), `${lista.length} zona${lista.length === 1 ? '' : 's'}`)}`;

  return { titulo: 'Zonas', standalone: true, contenido: marco('/i/territorio', 'Zonas', cuerpo) };
};

export const puntosStitch: Render = (): Pagina => {
  const e = store.leer();
  const a = ambito();
  const f = filtro('puntos', 'todos');
  let lista = e.puntos.filter((p) => a.nacional || a.parqueIds.includes(p.parqueId));
  if (f !== 'todos') lista = lista.filter((p) => p.estado === f);

  const filas = lista
    .map((p) => {
      const l = e.locales.find((x) => x.puntoId === p.id);
      const ocupante = l ? e.negocios.find((n) => n.id === l.negocioId)?.nombreComercial : null;
      return `<tr class="hover:bg-surface-container/30 transition-colors">
        <td class="py-sm px-lg font-mono text-sm text-on-surface-variant">${esc(p.codigo)}</td>
        <td class="py-sm px-lg font-semibold text-on-surface">${esc(p.nombre)}</td>
        <td class="py-sm px-lg">${esc(e.zonas.find((z) => z.id === p.zonaId)?.nombre ?? '—')}</td>
        <td class="py-sm px-lg">${esc(ocupante ?? '—')}</td>
        <td class="py-sm px-lg text-right">${insignia(p.estado, p.estado === 'ocupado' ? 'exito' : p.estado === 'libre' ? 'neutro' : 'error')}</td>
      </tr>`;
    })
    .join('');

  const cuerpo = `
${encabezado('Puntos comerciales', 'Puntos comerciales', 'Ubicaciones habilitadas para operar dentro de cada zona, con su ocupante actual.', BOTON_EXPORTAR)}
<div class="flex flex-wrap gap-sm mb-md">
  ${chip('puntos', 'todos', 'Todos', f)}
  ${chip('puntos', 'ocupado', 'Ocupados', f)}
  ${chip('puntos', 'libre', 'Libres', f)}
  ${chip('puntos', 'inhabilitado', 'Inhabilitados', f)}
</div>
${panel('Listado de puntos', tabla(['Código', 'Punto', 'Zona', 'Ocupante', 'Estado'], filas, 'No hay puntos con este filtro.'), `${lista.length} punto${lista.length === 1 ? '' : 's'}`)}`;

  return { titulo: 'Puntos comerciales', standalone: true, contenido: marco('/i/territorio', 'Puntos comerciales', cuerpo) };
};

// ----------------------------------------------------------------- Negocios

function negociosVisibles(): Negocio[] {
  const a = ambito();
  const e = store.leer();
  return e.negocios.filter((n) => {
    if (a.nacional || a.negocioIds.includes(n.id)) return true;
    // Un expediente en trámite todavía no tiene local, así que el filtro
    // territorial no lo atribuye a ningún parque; sin esta regla quedaría
    // invisible justo para quien debe resolverlo.
    const sinLocal = !e.locales.some((l) => l.negocioId === n.id);
    return sinLocal && (n.estado === 'en_revision' || n.estado === 'borrador');
  });
}

const TONO_NEGOCIO: Record<Negocio['estado'], 'exito' | 'alerta' | 'error' | 'neutro'> = {
  activo: 'exito', aprobado: 'exito', en_revision: 'alerta', borrador: 'neutro', suspendido: 'error', rechazado: 'error',
};

export const negociosStitch: Render = (): Pagina => {
  const e = store.leer();
  const f = filtro('negocios', 'todos');
  let lista = negociosVisibles();
  if (f !== 'todos') lista = lista.filter((n) => n.estado === f);

  const filas = lista
    .map((n) => {
      const local = e.locales.find((l) => l.negocioId === n.id);
      const parque = local ? e.parques.find((p) => p.id === local.parqueId) : null;
      const permiso = e.permisos.find((p) => p.negocioId === n.id);
      const docs = e.documentos.filter((d) => d.negocioId === n.id);
      const aprobados = docs.filter((d) => d.estado === 'aprobado').length;
      return `<tr class="hover:bg-surface-container/30 transition-colors cursor-pointer" data-accion="ir" data-valor="/i/negocio/${esc(n.id)}">
        <td class="py-sm px-lg">
          <div class="font-semibold text-on-surface">${esc(n.razonSocial)}</div>
          <div class="text-xs text-on-surface-variant">${esc(n.nombreComercial)}</div>
        </td>
        <td class="py-sm px-lg font-mono text-sm text-on-surface-variant">${esc(n.rif)}</td>
        <td class="py-sm px-lg">${esc(parque?.nombre ?? 'Sin asignar')}</td>
        <td class="py-sm px-lg capitalize">${esc(n.categoria)}</td>
        <td class="py-sm px-lg">${docs.length ? `${aprobados}/${docs.length}` : '—'}</td>
        <td class="py-sm px-lg">${permiso ? insignia(permiso.estado.replace('_', ' '), permiso.estado === 'vigente' ? 'exito' : permiso.estado === 'por_vencer' ? 'alerta' : 'error') : '—'}</td>
        <td class="py-sm px-lg text-right">${insignia(n.estado.replace('_', ' '), TONO_NEGOCIO[n.estado])}</td>
      </tr>`;
    })
    .join('');

  const todos = negociosVisibles();
  const cuerpo = `
${encabezado(
  'Negocios',
  'Directorio nacional de negocios',
  'Entidades comerciales, concesiones y permisos que operan dentro del sistema de parques. Seleccione una fila para abrir el expediente completo.',
  BOTON_EXPORTAR,
)}
<div class="flex flex-wrap gap-sm mb-md">
  ${chip('negocios', 'todos', `Todos (${todos.length})`, f)}
  ${chip('negocios', 'activo', 'Activos', f)}
  ${chip('negocios', 'en_revision', `En revisión (${todos.filter((n) => n.estado === 'en_revision').length})`, f)}
  ${chip('negocios', 'suspendido', 'Suspendidos', f)}
</div>
${panel('Entidades registradas', tabla(['Razón social', 'RIF', 'Parque', 'Categoría', 'Documentos', 'Permiso', 'Estado'], filas, 'No hay negocios con este filtro.'), `${lista.length} de ${todos.length}`)}`;

  return { titulo: 'Negocios', standalone: true, contenido: marco('/i/negocios', 'Directorio nacional de negocios', cuerpo) };
};

export const detalleNegocioStitch: Render = (ctx): Pagina => {
  const e = store.leer();
  const n = e.negocios.find((x) => x.id === ctx.params.negocioId);
  if (!n) return error404(ctx);
  const locales = e.locales.filter((l) => l.negocioId === n.id);
  const docs = e.documentos.filter((d) => d.negocioId === n.id);
  const permisos = e.permisos.filter((p) => p.negocioId === n.id);
  const contrato = e.contratos.find((c) => c.negocioId === n.id && c.estado === 'vigente');
  const responsable = e.usuarios.find((u) => u.id === n.responsableId);
  const ventas = e.ordenes.filter((o) => o.negocioId === n.id && o.estado === 'entregada').reduce((s, o) => s + o.totalUsd, 0);

  const cuerpo = `
${encabezado('Expediente del negocio', n.nombreComercial, `${esc(n.razonSocial)} · RIF ${esc(n.rif)}`, `
  <button type="button" data-accion="ir" data-valor="/i/expediente/${esc(n.id)}" class="h-touch-target px-md rounded-lg bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-xs hover:opacity-90 transition-opacity shadow-sm">
    <span class="material-symbols-outlined text-lg">folder_open</span>
    Revisar expediente
  </button>`)}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Estado', n.estado.replace('_', ' '))}
  ${tarjetaDato('Locales', String(locales.length))}
  ${tarjetaDato('Documentos aprobados', `${docs.filter((d) => d.estado === 'aprobado').length}/${docs.length}`)}
  ${tarjetaDato('Ventas acumuladas', formatearUsd(ventas))}
</div>

<div class="grid grid-cols-12 gap-lg">
  <div class="col-span-12 xl:col-span-7 flex flex-col gap-lg">
    ${panel(
      'Documentos del expediente',
      tabla(
        ['Tipo', 'Vigencia', 'Estado'],
        docs
          .map(
            (d) => `<tr class="hover:bg-surface-container/30 transition-colors">
              <td class="py-sm px-lg">
                <div class="font-semibold text-on-surface capitalize">${esc(d.tipo.replace(/_/g, ' '))}</div>
                <div class="text-xs text-on-surface-variant font-mono">${esc(d.nombreArchivo)}</div>
              </td>
              <td class="py-sm px-lg">${d.vigenciaHasta ? esc(fechaCorta(`${d.vigenciaHasta}T12:00:00`)) : '—'}</td>
              <td class="py-sm px-lg text-right">${insignia(d.estado.replace('_', ' '), d.estado === 'aprobado' ? 'exito' : d.estado === 'observado' ? 'error' : 'alerta')}</td>
            </tr>`,
          )
          .join(''),
        'Sin documentos cargados.',
      ),
    )}
    ${panel(
      'Permisos y concesiones',
      tabla(
        ['Número', 'Tipo', 'Vigencia', 'Estado'],
        permisos
          .map(
            (p) => `<tr class="hover:bg-surface-container/30 transition-colors">
              <td class="py-sm px-lg font-mono text-sm text-on-surface-variant">${esc(p.numero)}</td>
              <td class="py-sm px-lg capitalize">${esc(p.tipo.replace(/_/g, ' '))}</td>
              <td class="py-sm px-lg">${esc(fechaCorta(`${p.hasta}T12:00:00`))}</td>
              <td class="py-sm px-lg text-right">${insignia(p.estado.replace('_', ' '), p.estado === 'vigente' ? 'exito' : p.estado === 'por_vencer' ? 'alerta' : 'error')}</td>
            </tr>`,
          )
          .join(''),
        'Sin permisos registrados.',
      ),
    )}
  </div>

  <div class="col-span-12 xl:col-span-5 flex flex-col gap-lg">
    <div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg">
      <h3 class="font-label-md text-label-md text-on-surface mb-4 flex items-center gap-2">
        <span class="material-symbols-outlined text-outline">person</span>
        Representante legal
      </h3>
      ${
        responsable
          ? `<div class="flex flex-col gap-1">
              <span class="font-label-md text-label-md text-on-surface">${esc(responsable.nombre)}</span>
              <span class="font-body-md text-body-md text-on-surface-variant text-sm">${esc(responsable.correo)}</span>
            </div>`
          : '<p class="font-body-md text-body-md text-on-surface-variant">Sin representante asignado.</p>'
      }
    </div>
    <div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg">
      <h3 class="font-label-md text-label-md text-on-surface mb-4 flex items-center gap-2">
        <span class="material-symbols-outlined text-outline">description</span>
        Condiciones económicas
      </h3>
      ${
        contrato
          ? `<div class="grid grid-cols-2 gap-md">
              ${tarjetaDato('Porcentaje sobre venta', `${contrato.porcentajeSobreVenta}%`)}
              ${tarjetaDato('Canon fijo', formatearUsd(contrato.canonFijoUsd))}
              ${tarjetaDato('Mínimo garantizado', formatearUsd(contrato.minimoGarantizadoUsd))}
              ${tarjetaDato('Vence', fechaCorta(`${contrato.hasta}T12:00:00`))}
            </div>`
          : '<p class="font-body-md text-body-md text-on-surface-variant">Sin contrato vigente.</p>'
      }
    </div>
    ${panel(
      'Locales',
      tabla(
        ['Local', 'Parque', 'Estado'],
        locales
          .map(
            (l) => `<tr class="hover:bg-surface-container/30 transition-colors">
              <td class="py-sm px-lg font-semibold text-on-surface">${esc(l.nombre)}</td>
              <td class="py-sm px-lg">${esc(e.parques.find((p) => p.id === l.parqueId)?.nombre ?? '—')}</td>
              <td class="py-sm px-lg text-right">${insignia(l.abierto ? 'Abierto' : 'Cerrado', l.abierto ? 'exito' : 'neutro')}</td>
            </tr>`,
          )
          .join(''),
        'Sin locales asignados.',
      ),
    )}
  </div>
</div>`;

  return { titulo: n.nombreComercial, standalone: true, contenido: marco('/i/negocios', n.nombreComercial, cuerpo) };
};

// ------------------------------------------------------- Usuarios y accesos

export const usuariosStitch: Render = (): Pagina => {
  const e = store.leer();
  const f = filtro('usuarios', 'todos');
  let lista = e.usuarios;
  if (f === 'inparques') lista = lista.filter((u) => u.rol.startsWith('inparques.'));
  if (f === 'comercio') lista = lista.filter((u) => u.rol.startsWith('comercio.'));
  if (f === 'visitante') lista = lista.filter((u) => u.rol.startsWith('visitante.'));

  const conMfa = e.usuarios.filter((u) => u.mfaHabilitado).length;

  const filas = lista
    .map(
      (u) => `<tr class="hover:bg-surface-container/30 transition-colors">
        <td class="py-sm px-lg">
          <div class="font-semibold text-on-surface">${esc(u.nombre)}</div>
          <div class="text-xs text-on-surface-variant">${esc(u.correo)}</div>
        </td>
        <td class="py-sm px-lg">${esc(ROLES[u.rol].nombre)}</td>
        <td class="py-sm px-lg capitalize">${esc(u.scope.level)}</td>
        <td class="py-sm px-lg">
          <span class="inline-flex items-center gap-1 ${u.mfaHabilitado ? 'text-primary' : 'text-on-surface-variant'}">
            <span class="material-symbols-outlined text-[16px]">${u.mfaHabilitado ? 'verified' : 'shield'}</span>
            ${u.mfaHabilitado ? 'Activo' : 'No requerido'}
          </span>
        </td>
        <td class="py-sm px-lg text-right">${insignia(u.estado, u.estado === 'activo' ? 'exito' : 'alerta')}</td>
      </tr>`,
    )
    .join('');

  const cuerpo = `
${encabezado('Usuarios y roles', 'Usuarios, roles y ámbitos', 'Cada persona con su propio usuario y su propio ámbito. Las cuentas institucionales nacen por invitación, nunca por registro público.', BOTON_EXPORTAR)}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Usuarios totales', String(e.usuarios.length))}
  ${tarjetaDato('Con segundo factor', `${conMfa} de ${e.usuarios.length}`)}
  ${tarjetaDato('Institucionales', String(e.usuarios.filter((u) => u.rol.startsWith('inparques.')).length))}
  ${tarjetaDato('De comercio', String(e.usuarios.filter((u) => u.rol.startsWith('comercio.')).length))}
</div>

<div class="flex flex-wrap gap-sm mb-md">
  ${chip('usuarios', 'todos', 'Todos', f)}
  ${chip('usuarios', 'inparques', 'INPARQUES', f)}
  ${chip('usuarios', 'comercio', 'Comercio', f)}
  ${chip('usuarios', 'visitante', 'Visitantes', f)}
</div>
${panel('Cuentas', tabla(['Usuario', 'Rol', 'Ámbito', 'Segundo factor', 'Estado'], filas, 'No hay usuarios con este filtro.'), `${lista.length} cuenta${lista.length === 1 ? '' : 's'}`)}`;

  return { titulo: 'Usuarios y roles', standalone: true, contenido: marco('/i/usuarios', 'Usuarios, roles y ámbitos', cuerpo) };
};

export const rolesStitch: Render = (): Pagina => {
  const cuerpo = `
${encabezado('Roles y permisos', 'Detalle de rol y permisos', 'Los once roles del sistema, con su límite de ámbito y los permisos exactos que otorga cada uno.')}

<div class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
  ${ROLE_IDS.map((id) => {
    const d = ROLES[id];
    const permisos = PERMISOS_POR_ROL[id] ?? [];
    return `<div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg flex flex-col gap-sm">
      <div class="flex justify-between items-start gap-2">
        <div>
          <h3 class="font-headline-md text-headline-md text-on-surface">${esc(d.nombre)}</h3>
          <p class="font-label-sm text-label-sm text-on-surface-variant font-mono">${esc(id)}</p>
        </div>
        ${d.requiereMfa ? insignia('MFA obligatorio', 'alerta') : insignia('Sin MFA', 'neutro')}
      </div>
      <div class="grid grid-cols-2 gap-md py-sm border-y border-outline-variant">
        ${tarjetaDato('Ámbito', d.limite)}
        ${tarjetaDato('Datos bancarios', d.puedeVerDatosBancarios ? 'Enmascarados' : 'Sin acceso')}
      </div>
      <div class="flex flex-wrap gap-1">
        ${permisos.slice(0, 12).map((p) => `<span class="px-2 py-1 rounded bg-surface-variant text-on-surface-variant font-label-sm text-[11px] font-mono">${esc(p)}</span>`).join('')}
        ${permisos.length > 12 ? `<span class="px-2 py-1 font-label-sm text-[11px] text-on-surface-variant">+${permisos.length - 12} más</span>` : ''}
      </div>
    </div>`;
  }).join('')}
</div>`;

  return { titulo: 'Roles y permisos', standalone: true, contenido: marco('/i/usuarios', 'Roles y permisos', cuerpo) };
};

export const ambitosStitch: Render = (): Pagina => {
  const e = store.leer();
  const porNivel = new Map<string, number>();
  for (const u of e.usuarios) porNivel.set(u.scope.level, (porNivel.get(u.scope.level) ?? 0) + 1);

  const filas = e.usuarios
    .filter((u) => u.rol.startsWith('inparques.') || u.rol.startsWith('comercio.'))
    .map((u) => {
      const nombres = u.scope.ids
        .map(
          (id) =>
            e.parques.find((p) => p.id === id)?.nombre ??
            e.negocios.find((n) => n.id === id)?.nombreComercial ??
            e.locales.find((l) => l.id === id)?.nombre ??
            id,
        )
        .join(', ');
      return `<tr class="hover:bg-surface-container/30 transition-colors">
        <td class="py-sm px-lg">
          <div class="font-semibold text-on-surface">${esc(u.nombre)}</div>
          <div class="text-xs text-on-surface-variant">${esc(ROLES[u.rol].nombre)}</div>
        </td>
        <td class="py-sm px-lg capitalize">${esc(u.scope.level)}</td>
        <td class="py-sm px-lg text-right">${esc(nombres || 'Todo el territorio')}</td>
      </tr>`;
    })
    .join('');

  const cuerpo = `
${encabezado('Ámbitos', 'Ámbitos de acceso', 'Cada usuario ve solo lo que su ámbito le permite. Un ámbito nacional vacío significa todo el territorio; uno de parque, negocio o local se limita a los identificadores listados.')}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${[...porNivel.entries()].map(([nivel, n]) => tarjetaDato(nivel, String(n))).join('')}
</div>

${panel('Asignaciones', tabla(['Usuario', 'Nivel', 'Alcance'], filas, 'Sin asignaciones de ámbito.'))}`;

  return { titulo: 'Ámbitos', standalone: true, contenido: marco('/i/ambitos', 'Ámbitos de acceso', cuerpo) };
};

export const sesionesStitch: Render = (): Pagina => {
  const e = store.leer();
  const vigentes = e.sesiones.filter((s) => s.vigente);

  const filas = e.sesiones
    .map((s) => {
      const u = e.usuarios.find((x) => x.id === s.usuarioId);
      return `<tr class="hover:bg-surface-container/30 transition-colors">
        <td class="py-sm px-lg">
          <div class="font-semibold text-on-surface">${esc(u?.nombre ?? s.usuarioId)}</div>
          <div class="text-xs text-on-surface-variant">${esc(u ? ROLES[u.rol].nombre : '—')}</div>
        </td>
        <td class="py-sm px-lg">${esc(s.dispositivo)}</td>
        <td class="py-sm px-lg">${esc(desde(s.iniciadaEn))}</td>
        <td class="py-sm px-lg">${insignia(s.vigente ? 'Vigente' : 'Cerrada', s.vigente ? 'exito' : 'neutro')}</td>
        <td class="py-sm px-lg text-right">
          ${s.vigente ? `<button type="button" data-accion="revocar-sesion" data-valor="${esc(s.id)}" class="h-9 px-3 rounded-lg border border-outline-variant text-error font-label-sm text-label-sm hover:bg-error-container transition-colors">Revocar</button>` : ''}
        </td>
      </tr>`;
    })
    .join('');

  const cuerpo = `
${encabezado('Seguridad', 'Seguridad y sesiones', 'Sesiones abiertas en todo el sistema. Revocar una sesión cierra el acceso de ese dispositivo de inmediato.')}

<div class="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
  ${tarjetaDato('Sesiones vigentes', String(vigentes.length))}
  ${tarjetaDato('Sesiones registradas', String(e.sesiones.length))}
  ${tarjetaDato('Usuarios con MFA', String(e.usuarios.filter((u) => u.mfaHabilitado).length))}
  ${tarjetaDato('Roles con MFA obligatorio', String(ROLE_IDS.filter((r) => ROLES[r].requiereMfa).length))}
</div>

${panel('Sesiones', tabla(['Usuario', 'Dispositivo', 'Iniciada', 'Estado', 'Acción'], filas, 'Sin sesiones registradas.'))}`;

  return { titulo: 'Seguridad y sesiones', standalone: true, contenido: marco('/i/sesiones', 'Seguridad y sesiones', cuerpo) };
};

// -------------------------------------------------------- Reglas y auditoría

export const reglasStitch: Render = (): Pagina => {
  const e = store.leer();
  const reglas: Array<[string, string, string, string]> = [
    ['percent', 'IVA aplicado', '16 %', 'Impuesto al valor agregado sobre la base imponible de cada orden.'],
    ['currency_exchange', 'Tasa BCV vigente', `${e.tasaBcv.valor.toFixed(2)} Bs/USD`, `Congelada al registrar la venta. Última actualización: ${fechaCorta(e.tasaBcv.fecha)}.`],
    ['shopping_cart', 'Un comercio por carrito', 'Obligatorio', 'Un carrito solo puede contener artículos de un mismo comercio.'],
    ['lock', 'Cierres inmutables', 'Obligatorio', 'Un cierre de caja o una liquidación cerrada no se edita: se corrige con un ajuste con motivo y evidencia.'],
    ['receipt_long', 'Emisor fiscal', 'El comercio', 'INPARQUES nunca es el emisor fiscal de la factura al visitante.'],
    ['verified_user', 'Segundo factor institucional', 'Obligatorio', 'Todas las cuentas institucionales exigen verificación en dos pasos.'],
  ];

  const cuerpo = `
${encabezado('Reglas globales', 'Reglas globales del sistema', 'Parámetros que gobiernan toda la plataforma. Cambiarlos exige motivo, evidencia y verificación en dos pasos.')}

<div class="grid grid-cols-1 md:grid-cols-2 gap-lg">
  ${reglas
    .map(
      ([icono, titulo, valor, nota]) => `<div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg flex gap-md items-start">
        <div class="w-12 h-12 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined">${icono}</span>
        </div>
        <div class="flex-1">
          <div class="flex justify-between items-start gap-2 mb-1">
            <h3 class="font-headline-md text-headline-md text-on-surface">${esc(titulo)}</h3>
            <span class="font-label-md text-label-md text-primary font-bold shrink-0">${esc(valor)}</span>
          </div>
          <p class="font-body-md text-body-md text-on-surface-variant">${esc(nota)}</p>
        </div>
      </div>`,
    )
    .join('')}
</div>`;

  return { titulo: 'Reglas globales', standalone: true, contenido: marco('/i/reglas', 'Reglas globales', cuerpo) };
};

export const auditoriaStitch: Render = (): Pagina => {
  const registros = consultar(store.leer()).slice(0, 100);

  const filas = registros
    .map(
      (r) => `<tr class="hover:bg-surface-container/30 transition-colors">
        <td class="py-sm px-lg whitespace-nowrap">${esc(fechaHora(r.en))}</td>
        <td class="py-sm px-lg font-mono text-sm text-primary">${esc(r.accion)}</td>
        <td class="py-sm px-lg">${esc(ROLES[r.rol as RoleId]?.nombre ?? r.rol)}</td>
        <td class="py-sm px-lg font-mono text-xs text-on-surface-variant">${esc(r.entidad)}${r.entidadId ? ` · ${esc(r.entidadId)}` : ''}</td>
        <td class="py-sm px-lg text-right">${r.motivo ? esc(r.motivo) : '—'}</td>
      </tr>`,
    )
    .join('');

  const cuerpo = `
${encabezado('Auditoría', 'Auditoría global', 'Bitácora inmutable de acciones sensibles: quién, cuándo, sobre qué y con qué motivo. No se edita ni se borra.', BOTON_EXPORTAR)}
${panel('Registros', tabla(['Fecha', 'Acción', 'Rol', 'Entidad', 'Motivo'], filas, 'Sin registros de auditoría todavía.'), `${registros.length} registro${registros.length === 1 ? '' : 's'} más recientes`)}`;

  return { titulo: 'Auditoría', standalone: true, contenido: marco('/i/auditoria', 'Auditoría global', cuerpo) };
};

export const integracionesStitch: Render = (): Pagina => {
  const integraciones: Array<[string, string, string, string]> = [
    ['payments', 'Pasarela de pago', 'Simulada', 'Adaptador local que emula pago móvil, transferencia, tarjeta y efectivo sin salir del navegador.'],
    ['receipt_long', 'Facturación fiscal', 'Simulada', 'Genera número y número de control; el emisor sigue siendo el comercio.'],
    ['currency_exchange', 'Tasa BCV', 'Simulada', 'Fuente de la tasa oficial que se congela en cada venta.'],
    ['sms', 'Mensajería', 'Simulada', 'Correo y SMS de invitación, códigos y avisos; en la demo el código aparece en pantalla.'],
    ['shield_locked', 'Segundo factor', 'Simulado', 'Emisión y verificación del código de seis dígitos.'],
    ['qr_code_scanner', 'Códigos QR', 'Nativo', 'Lectura de QR de punto comercial y de retiro sin dependencia externa.'],
  ];

  const cuerpo = `
${encabezado('Integraciones', 'Integraciones del sistema', 'Servicios externos que la plataforma consume. En esta demostración todos corren como adaptadores simulados en el propio navegador.')}

<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg">
  ${integraciones
    .map(
      ([icono, titulo, estado, nota]) => `<div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg flex flex-col gap-md">
        <div class="flex justify-between items-start">
          <div class="w-12 h-12 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
            <span class="material-symbols-outlined">${icono}</span>
          </div>
          ${insignia(estado, 'neutro')}
        </div>
        <div>
          <h3 class="font-headline-md text-headline-md text-on-surface mb-1">${esc(titulo)}</h3>
          <p class="font-body-md text-body-md text-on-surface-variant">${esc(nota)}</p>
        </div>
      </div>`,
    )
    .join('')}
</div>`;

  return { titulo: 'Integraciones', standalone: true, contenido: marco('/i/integraciones', 'Integraciones', cuerpo) };
};
