/**
 * Interior del portal de comercio (fase 2), portado del HTML real de Stitch.
 *
 * Fuentes:
 * - `50/p_gina_2_mis_negocios` + `50/p_gina_3_detalle_del_negocio` → Expediente
 *   (`c.expediente`). El diseño de Stitch muestra una tarjeta por negocio;
 *   el modelo de datos de esta app da a cada propietario un solo negocio con
 *   varios locales, así que la grilla de tarjetas se adapta a "un local =
 *   una tarjeta" en vez de "un negocio = una tarjeta".
 * - `stitch_inparques_comercial_portal_visitante/p_gina_6_documentos_y_vigencias`
 *   → Documentos (`c.documentos`).
 * - `stitch_inparques_comercial_portal_visitante/p_gina_8_cuenta_bancaria_y_m_todos_de_cobro`
 *   → Cobro y cuenta bancaria (`c.cobro`, `c.cuenta_bancaria`).
 * - `stitch_inparques_comercial_portal_visitante/p_gina_9_equipo_y_accesos`
 *   → Equipo (`c.equipo` y subrutas).
 * - `stitch_inparques_comercial_portal_visitante/p_gina_5_cat_logo` → Catálogo
 *   (`c.catalogo`), compartida con `comercio.admin_local`.
 *
 * No hay página de Stitch dedicada a "Permisos" ni "Contratos" para el rol
 * `comercio.propietario` (la única carpeta con esos nombres pertenece al
 * portal de `inparques.direccion_comercial`, con otra barra lateral). Esas
 * vistas se arman con el mismo lenguaje visual (tarjetas, tokens, tipografía)
 * de las páginas de propietario ya confirmadas, en vez de inventar un layout
 * distinto.
 */

import { esc } from '../componentes';
import { avatar, barraLateral, barraLateralAdminLocal, barraSuperior } from './stitch-comercio';
import { conCajonMovil } from '../stitch-shell';
import type { Pagina, Render } from './tipos';
import { store } from '../../data/store';
import { sesion } from '../../app/session';
import { ROLES } from '../../domain/roles';
import { proyectarCuenta } from '../../domain/masking';
import { puedeVerBancario } from '../../domain/permissions';
import { formatearUsd, formatearVes } from '../../domain/money';
import { fechaCorta, fechaHora, diasHasta } from '../formato';
import { error403, error404 } from './compartidas';
import type { Negocio } from '../../domain/types';

function miNegocio(): Negocio {
  const e = store.leer();
  const u = sesion.usuario()!;
  return e.negocios.find((n) => n.id === u.scope.ids[0]) ?? e.negocios[0];
}

/** Envoltura de escritorio/móvil para el portal de propietario (barra + topbar). */
function marcoPropietario(activo: string, cuerpo: string): string {
  const u = sesion.usuario()!;
  return `
${conCajonMovil(barraLateral(activo))}
${barraSuperior(u.nombre)}
<main class="lg:ml-64 pt-16 min-h-screen bg-surface-container-lowest">${cuerpo}</main>`;
}

/**
 * Rutas como `/c/catalogo` las visitan tanto el propietario como el
 * administrador de local: cada uno ve la barra lateral real de su propio
 * portal (así lo generó Stitch para cada rol), no una compartida.
 */
function marcoComercio(activo: string, cuerpo: string): string {
  const u = sesion.usuario()!;
  if (u.rol === 'comercio.propietario') return marcoPropietario(activo, cuerpo);
  return `
${conCajonMovil(barraLateralAdminLocal(activo), false)}
<main class="md:ml-64 min-h-screen bg-background">
  <header class="md:hidden flex justify-between items-center w-full px-lg h-touch-target sticky top-0 z-30 bg-surface border-b border-outline-variant">
    <div class="flex items-center gap-sm">
      <button type="button" data-accion="abrir-cajon" aria-label="Abrir menú" class="min-h-touch-target min-w-[44px] flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full">
        <span class="material-symbols-outlined">menu</span>
      </button>
      <span class="font-headline-md text-headline-md font-bold text-primary">Parques Nacionales</span>
    </div>
    <button type="button" data-accion="ir" data-valor="/perfil" class="min-h-touch-target min-w-[44px] flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full">
      <span class="material-symbols-outlined">person</span>
    </button>
  </header>
  ${cuerpo}
</main>`;
}

function pestañas(activa: string): string {
  const items: Array<[string, string, string]> = [
    ['Resumen', '/c/expediente', 'expediente'],
    ['Documentos', '/c/expediente/documentos', 'documentos'],
    ['Permisos', '/c/permisos', 'permisos'],
    ['Contratos', '/c/contratos', 'contratos'],
  ];
  return `
<div class="flex overflow-x-auto hide-scrollbar gap-xl border-b border-outline-variant mb-lg">
  ${items
    .map(
      ([texto, ruta, id]) =>
        `<button type="button" data-accion="ir" data-valor="${ruta}" class="font-label-md text-label-md ${id === activa ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'} pb-3 px-1 whitespace-nowrap transition-colors">${texto}</button>`,
    )
    .join('')}
</div>`;
}

function insigniaEstado(texto: string, tono: 'exito' | 'alerta' | 'error' | 'neutro'): string {
  const clases: Record<string, string> = {
    exito: 'bg-primary-container/10 text-primary-container border border-primary-container/20',
    alerta: 'bg-tertiary-fixed text-on-tertiary-fixed',
    error: 'bg-error-container text-on-error-container',
    neutro: 'bg-surface-variant text-on-surface-variant',
  };
  return `<span class="px-3 py-1 rounded-full ${clases[tono]} font-label-sm text-label-sm inline-flex items-center gap-1">${esc(texto)}</span>`;
}

// ---------------------------------------------------------------- Expediente

export const expedienteStitch: Render = (): Pagina => {
  const e = store.leer();
  const negocio = miNegocio();
  const locales = e.locales.filter((l) => l.negocioId === negocio.id);
  const docs = e.documentos.filter((d) => d.negocioId === negocio.id);
  const permisos = e.permisos.filter((p) => p.negocioId === negocio.id);
  const contratoVigente = e.contratos.find((c) => c.negocioId === negocio.id && c.estado === 'vigente');
  const responsable = e.usuarios.find((u) => u.id === negocio.responsableId);
  const ordenes = e.ordenes.filter((o) => o.negocioId === negocio.id && o.estado === 'entregada');

  const aprobados = docs.filter((d) => d.estado === 'aprobado').length;
  const progreso = docs.length ? Math.round((aprobados / docs.length) * 100) : 0;

  const tonoEstado: Record<Negocio['estado'], 'exito' | 'alerta' | 'error' | 'neutro'> = {
    activo: 'exito', aprobado: 'exito', en_revision: 'alerta', borrador: 'neutro', suspendido: 'error', rechazado: 'error',
  };
  const etiquetaEstado: Record<Negocio['estado'], string> = {
    activo: 'Operativo', aprobado: 'Aprobado', en_revision: 'En revisión', borrador: 'Borrador', suspendido: 'Suspendido', rechazado: 'Rechazado',
  };

  function ventasLocalVes(localId: string): number {
    return ordenes.filter((o) => o.localId === localId).reduce((s, o) => s + o.totalVes, 0);
  }

  const contenido = marcoPropietario(
    '/c/expediente',
    `
<div class="px-lg py-md lg:px-xl border-b border-surface-variant bg-surface-container-lowest sticky top-16 z-30">
  <div class="max-w-7xl mx-auto flex flex-col gap-2">
    <div class="flex items-center gap-4">
      <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background">${esc(negocio.nombreComercial)}</h2>
      ${insigniaEstado(etiquetaEstado[negocio.estado], tonoEstado[negocio.estado])}
    </div>
  </div>
</div>
<div class="p-lg lg:p-xl max-w-7xl mx-auto">
  ${pestañas('expediente')}

  <div class="grid grid-cols-1 md:grid-cols-12 gap-lg">
    <div class="col-span-1 md:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-lg flex flex-col gap-6">
      <div>
        <h3 class="font-headline-md text-headline-md text-on-background mb-1">Información Legal</h3>
        <p class="font-body-md text-body-md text-on-surface-variant">Datos principales de la entidad concesionaria registrada.</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div class="flex flex-col gap-1">
          <span class="font-label-sm text-label-sm text-outline">Razón Social</span>
          <span class="font-body-md text-body-md text-on-surface">${esc(negocio.razonSocial)}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="font-label-sm text-label-sm text-outline">RIF</span>
          <span class="font-body-md text-body-md text-on-surface font-mono">${esc(negocio.rif)}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="font-label-sm text-label-sm text-outline">Fecha de incorporación</span>
          <span class="font-body-md text-body-md text-on-surface">${esc(fechaCorta(negocio.creadoEn))}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="font-label-sm text-label-sm text-outline">Categoría</span>
          <span class="font-body-md text-body-md text-on-surface capitalize">${esc(negocio.categoria)}</span>
        </div>
      </div>
    </div>

    <div class="col-span-1 md:col-span-4 bg-primary-container text-on-primary-container rounded-xl shadow-[0px_4px_12px_rgba(40,51,46,0.08)] p-lg flex flex-col justify-between h-full relative overflow-hidden">
      <div class="absolute -right-6 -top-6 opacity-20 transform scale-150 pointer-events-none">
        <span class="material-symbols-outlined text-[120px]">folder_open</span>
      </div>
      <div class="z-10 flex flex-col gap-2">
        <h3 class="font-label-md text-label-md uppercase tracking-wider mb-2">Habilitación comercial</h3>
        <span class="font-display-lg text-display-lg font-extrabold">${progreso}%</span>
        <p class="font-body-md text-body-md opacity-90">${aprobados} de ${docs.length} documentos aprobados</p>
      </div>
      <div class="z-10 mt-6 pt-4 border-t border-on-primary-container/20">
        <button type="button" data-accion="ir" data-valor="/c/expediente/documentos" class="w-full font-label-md text-label-md flex items-center justify-between group">
          Ver documentos
          <span class="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </button>
      </div>
    </div>
  </div>

  <div class="mt-lg">
    <h3 class="font-headline-md text-headline-md text-on-surface mb-md">Locales y puntos de venta</h3>
    ${
      locales.length === 0
        ? '<p class="font-body-md text-body-md text-on-surface-variant">Este negocio todavía no tiene locales asignados.</p>'
        : `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            ${locales
              .map((l) => {
                const punto = e.puntos.find((p) => p.id === l.puntoId);
                const zona = e.zonas.find((z) => z.id === punto?.zonaId);
                return `<div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg flex flex-col h-full relative overflow-hidden">
                  <div class="absolute top-0 left-0 w-full h-1 ${l.abierto ? 'bg-primary' : 'bg-error'}"></div>
                  <div class="flex justify-between items-start mb-4">
                    <div>
                      <h4 class="font-headline-md text-headline-md text-on-surface mb-1">${esc(l.nombre)}</h4>
                      <div class="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
                        <span class="material-symbols-outlined !text-[16px]">location_on</span>
                        <span>${esc(zona?.nombre ?? 'Sin zona')}${punto ? ` · ${esc(punto.nombre)}` : ''}</span>
                      </div>
                    </div>
                    ${insigniaEstado(l.abierto ? 'Abierto' : 'Cerrado', l.abierto ? 'exito' : 'error')}
                  </div>
                  <div class="grid grid-cols-2 gap-4 mb-6 mt-4">
                    <div>
                      <p class="font-label-sm text-label-sm text-on-surface-variant mb-1">Permiso</p>
                      <p class="font-body-md text-body-md text-on-surface">${permisos.some((p) => p.puntoId === l.puntoId && p.estado === 'vigente') ? 'Vigente' : 'Sin permiso vigente'}</p>
                    </div>
                    <div>
                      <p class="font-label-sm text-label-sm text-on-surface-variant mb-1">Ventas del mes</p>
                      <p class="font-body-md text-body-md text-primary font-bold">${esc(formatearVes(ventasLocalVes(l.id)))}</p>
                    </div>
                  </div>
                  <div class="mt-auto pt-4 border-t border-outline-variant flex justify-end gap-2">
                    <button type="button" data-accion="ir" data-valor="/c/catalogo" class="h-touch-target px-4 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors font-label-md text-label-md flex items-center gap-2">
                      <span class="material-symbols-outlined">visibility</span>
                      Detalles
                    </button>
                  </div>
                </div>`;
              })
              .join('')}
          </div>`
    }
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-lg mt-lg">
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
      <h3 class="font-label-md text-label-md text-on-surface mb-4 flex items-center gap-2">
        <span class="material-symbols-outlined text-outline">person</span>
        Representante legal
      </h3>
      ${
        responsable
          ? `<div class="flex items-center gap-4 p-4 bg-surface-container-low rounded-lg border border-surface-variant">
              ${avatar(responsable.nombre, 'w-12 h-12 text-[14px]')}
              <div class="flex flex-col">
                <span class="font-label-md text-label-md text-on-surface">${esc(responsable.nombre)}</span>
                <span class="font-body-md text-body-md text-on-surface-variant text-sm">${esc(responsable.correo)}</span>
              </div>
            </div>`
          : '<p class="font-body-md text-body-md text-on-surface-variant">Sin representante asignado.</p>'
      }
    </div>
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
      <h3 class="font-label-md text-label-md text-on-surface mb-4 flex items-center gap-2">
        <span class="material-symbols-outlined text-outline">description</span>
        Contrato vigente
      </h3>
      ${
        contratoVigente
          ? `<button type="button" data-accion="ir" data-valor="/c/contrato/${esc(contratoVigente.id)}" class="flex items-start gap-4 p-4 bg-secondary-container/20 rounded-lg border border-secondary-container/50 text-left w-full hover:bg-secondary-container/30 transition-colors">
              <div class="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined">contract</span>
              </div>
              <div class="flex flex-col gap-1 w-full">
                <div class="flex justify-between items-start">
                  <span class="font-label-md text-label-md text-on-surface">Condiciones económicas</span>
                  <span class="bg-secondary/10 text-secondary font-label-sm text-label-sm px-2 py-0.5 rounded">Vigente</span>
                </div>
                <span class="font-body-md text-body-md text-on-surface-variant text-sm">Hasta ${esc(fechaCorta(`${contratoVigente.hasta}T12:00:00`))}</span>
              </div>
            </button>`
          : '<p class="font-body-md text-body-md text-on-surface-variant">Sin contrato vigente registrado.</p>'
      }
    </div>
  </div>
</div>`,
  );

  return { titulo: 'Expediente', standalone: true, contenido };
};

// ---------------------------------------------------------------- Documentos

export const documentosStitch: Render = (): Pagina => {
  const e = store.leer();
  const negocio = miNegocio();
  const docs = e.documentos.filter((d) => d.negocioId === negocio.id);

  const vigentes = docs.filter((d) => d.estado === 'aprobado').length;
  const porVencer = docs.filter((d) => d.vigenciaHasta && diasHasta(d.vigenciaHasta) < 30 && diasHasta(d.vigenciaHasta) >= 0).length;
  const enRevision = docs.filter((d) => d.estado === 'en_revision' || d.estado === 'pendiente').length;

  const proximo = docs
    .filter((d) => d.vigenciaHasta)
    .sort((a, b) => a.vigenciaHasta!.localeCompare(b.vigenciaHasta!))[0];

  const tonoFila: Record<string, string> = {
    aprobado: 'bg-primary-container/10 text-primary-container',
    observado: 'bg-error-container text-error',
    en_revision: 'bg-tertiary-fixed text-on-tertiary-fixed',
    pendiente: 'bg-tertiary-fixed text-on-tertiary-fixed',
    vencido: 'bg-surface-variant text-on-surface-variant',
  };
  const etiquetaFila: Record<string, string> = {
    aprobado: 'Vigente', observado: 'Observado', en_revision: 'En revisión', pendiente: 'Pendiente', vencido: 'Vencido',
  };

  const contenido = marcoPropietario(
    '/c/expediente',
    `
<div class="p-lg lg:p-xl max-w-7xl mx-auto">
  ${pestañas('documentos')}
  <div class="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
    <div>
      <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">Expediente de Documentos</h2>
      <p class="font-body-lg text-body-lg text-on-surface-variant">Gestión y control de vigencias de permisos y registros comerciales.</p>
    </div>
    <button type="button" data-accion="cargar-documento" class="bg-primary-container text-on-primary min-h-[44px] px-6 rounded-lg font-label-md text-label-md hover:bg-primary transition-colors flex items-center justify-center gap-2 shadow-sm">
      <span class="material-symbols-outlined">upload_file</span>
      Subir nuevo documento
    </button>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-lg">
    <div class="lg:col-span-1 flex flex-col gap-lg">
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-[0px_4px_12px_rgba(40,51,46,0.08)]">
        <h3 class="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
          <span class="material-symbols-outlined text-primary">analytics</span>
          Estado General
        </h3>
        <div class="flex flex-col gap-4">
          <div class="flex justify-between items-center p-3 bg-secondary-fixed/30 rounded-lg">
            <span class="font-body-md text-body-md">Documentos vigentes</span>
            <span class="font-headline-md text-headline-md text-primary font-bold">${vigentes}</span>
          </div>
          <div class="flex justify-between items-center p-3 bg-error-container/50 rounded-lg">
            <span class="font-body-md text-body-md">Por vencer (&lt; 30 días)</span>
            <span class="font-headline-md text-headline-md text-error font-bold">${porVencer}</span>
          </div>
          <div class="flex justify-between items-center p-3 bg-tertiary-fixed/40 rounded-lg">
            <span class="font-body-md text-body-md">En revisión</span>
            <span class="font-headline-md text-headline-md text-tertiary font-bold">${enRevision}</span>
          </div>
        </div>
      </div>
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-primary-container/10 to-transparent z-0"></div>
        <div class="relative z-10">
          <h3 class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-2">Siguiente vencimiento</h3>
          ${
            proximo
              ? `<p class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1 capitalize">${esc(proximo.tipo.replace(/_/g, ' '))}</p>
                <p class="font-body-md text-body-md ${diasHasta(proximo.vigenciaHasta!) < 30 ? 'text-error font-bold' : 'text-on-surface-variant'} flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">${diasHasta(proximo.vigenciaHasta!) < 30 ? 'warning' : 'event'}</span>
                  ${diasHasta(proximo.vigenciaHasta!) >= 0 ? `Vence en ${diasHasta(proximo.vigenciaHasta!)} días` : 'Vencido'} (${esc(fechaCorta(`${proximo.vigenciaHasta}T12:00:00`))})
                </p>`
              : '<p class="font-body-md text-body-md text-on-surface-variant">Sin vencimientos registrados.</p>'
          }
        </div>
      </div>
    </div>

    <div class="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div class="p-lg border-b border-outline-variant bg-surface">
        <h3 class="font-headline-md text-headline-md text-on-surface">Listado de documentos</h3>
      </div>
      <div class="overflow-x-auto">
        ${
          docs.length === 0
            ? '<p class="p-lg font-body-md text-body-md text-on-surface-variant">Sin documentos registrados todavía.</p>'
            : `<table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-label-md text-label-md">
                    <th class="p-4 font-semibold">Tipo de documento</th>
                    <th class="p-4 font-semibold">Cargado</th>
                    <th class="p-4 font-semibold">Vencimiento</th>
                    <th class="p-4 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant font-body-md text-body-md">
                  ${docs
                    .map(
                      (d) => `<tr class="hover:bg-surface-container-lowest transition-colors cursor-pointer" data-accion="ir" data-valor="/c/expediente/documento/${esc(d.id)}">
                        <td class="p-4">
                          <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-lg bg-secondary-fixed/50 flex items-center justify-center text-primary">
                              <span class="material-symbols-outlined">description</span>
                            </div>
                            <div>
                              <p class="font-bold text-on-surface capitalize">${esc(d.tipo.replace(/_/g, ' '))}</p>
                              <p class="text-on-surface-variant text-sm">${esc(d.nombreArchivo)}</p>
                            </div>
                          </div>
                        </td>
                        <td class="p-4 text-on-surface-variant">${esc(fechaCorta(d.cargadoEn))}</td>
                        <td class="p-4 text-on-surface-variant">${d.vigenciaHasta ? esc(fechaCorta(`${d.vigenciaHasta}T12:00:00`)) : '—'}</td>
                        <td class="p-4">
                          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${tonoFila[d.estado] ?? 'bg-surface-variant text-on-surface-variant'} font-label-sm text-label-sm">${esc(etiquetaFila[d.estado] ?? d.estado)}</span>
                        </td>
                      </tr>`,
                    )
                    .join('')}
                </tbody>
              </table>`
        }
      </div>
    </div>
  </div>
</div>`,
  );

  return { titulo: 'Documentos', standalone: true, contenido };
};

export const detalleDocumentoStitch: Render = (ctx): Pagina => {
  const e = store.leer();
  const d = e.documentos.find((x) => x.id === ctx.params.documentoId);
  if (!d) return error404(ctx);

  const contenido = marcoPropietario(
    '/c/expediente',
    `
<div class="p-lg lg:p-xl max-w-3xl mx-auto">
  <button type="button" data-accion="ir" data-valor="/c/expediente/documentos" class="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors w-fit mb-md">
    <span class="material-symbols-outlined text-[18px]">arrow_back</span>
    <span class="font-label-sm text-label-sm">Volver a documentos</span>
  </button>
  <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-lg capitalize">${esc(d.tipo.replace(/_/g, ' '))}</h2>

  ${
    d.estado === 'observado' && d.observacion
      ? `<div class="bg-error-container/20 border border-error-container rounded-lg p-lg flex gap-md items-start mb-lg">
          <span class="material-symbols-outlined text-error">warning</span>
          <div>
            <p class="font-label-md text-label-md text-on-surface">Documento observado</p>
            <p class="font-body-md text-body-md text-on-surface-variant mt-1">${esc(d.observacion)}</p>
          </div>
        </div>`
      : ''
  }

  <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg grid grid-cols-1 sm:grid-cols-2 gap-6">
    <div class="flex flex-col gap-1">
      <span class="font-label-sm text-label-sm text-outline">Archivo</span>
      <span class="font-body-md text-body-md text-on-surface font-mono">${esc(d.nombreArchivo)}</span>
    </div>
    <div class="flex flex-col gap-1">
      <span class="font-label-sm text-label-sm text-outline">Estado</span>
      <span class="font-body-md text-body-md text-on-surface capitalize">${esc(d.estado.replace(/_/g, ' '))}</span>
    </div>
    <div class="flex flex-col gap-1">
      <span class="font-label-sm text-label-sm text-outline">Cargado</span>
      <span class="font-body-md text-body-md text-on-surface">${esc(fechaHora(d.cargadoEn))}</span>
    </div>
    ${
      d.vigenciaHasta
        ? `<div class="flex flex-col gap-1">
            <span class="font-label-sm text-label-sm text-outline">Vigencia</span>
            <span class="font-body-md text-body-md text-on-surface">${esc(fechaCorta(`${d.vigenciaHasta}T12:00:00`))}</span>
          </div>`
        : ''
    }
    ${
      d.revisadoPor
        ? `<div class="flex flex-col gap-1">
            <span class="font-label-sm text-label-sm text-outline">Revisado por</span>
            <span class="font-body-md text-body-md text-on-surface">${esc(e.usuarios.find((u) => u.id === d.revisadoPor)?.nombre ?? '—')}</span>
          </div>`
        : ''
    }
  </div>

  ${
    d.estado === 'observado'
      ? `<button type="button" data-accion="cargar-documento" class="w-full mt-lg h-touch-target bg-primary-container text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary transition-colors flex items-center justify-center gap-2">
          <span class="material-symbols-outlined">upload_file</span>
          Cargar nueva versión
        </button>`
      : ''
  }
</div>`,
  );

  return { titulo: d.tipo.replace(/_/g, ' '), standalone: true, contenido };
};

// ------------------------------------------------------------------ Permisos

export const permisosStitch: Render = (): Pagina => {
  const e = store.leer();
  const negocio = miNegocio();
  const lista = e.permisos.filter((p) => p.negocioId === negocio.id);

  const tono: Record<string, 'exito' | 'alerta' | 'error'> = { vigente: 'exito', por_vencer: 'alerta', vencido: 'error', suspendido: 'error' };

  const contenido = marcoPropietario(
    '/c/expediente',
    `
<div class="p-lg lg:p-xl max-w-7xl mx-auto">
  ${pestañas('permisos')}
  <div class="mb-lg">
    <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">Permisos y Concesiones</h2>
    <p class="font-body-lg text-body-lg text-on-surface-variant">Autorizaciones de uso de espacio vigentes para este negocio.</p>
  </div>
  ${
    lista.length === 0
      ? '<p class="font-body-md text-body-md text-on-surface-variant">Sin permisos registrados.</p>'
      : `<div class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
          ${lista
            .map((p) => {
              const dias = diasHasta(p.hasta);
              const punto = e.puntos.find((x) => x.id === p.puntoId);
              return `<div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col gap-md relative overflow-hidden shadow-sm">
                <div class="absolute top-0 left-0 w-full h-1 ${tono[p.estado] === 'exito' ? 'bg-primary' : tono[p.estado] === 'alerta' ? 'bg-tertiary' : 'bg-error'}"></div>
                <div class="flex justify-between items-start">
                  <div>
                    <div class="flex items-center gap-sm mb-xs">
                      <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-mono">${esc(p.numero)}</span>
                      ${insigniaEstado(p.estado.replace('_', ' '), tono[p.estado] ?? 'neutro')}
                    </div>
                    <h3 class="font-headline-md text-headline-md text-on-surface capitalize">${esc(p.tipo.replace(/_/g, ' '))}</h3>
                    <p class="font-body-md text-body-md text-on-surface-variant">${esc(punto?.nombre ?? 'Punto sin asignar')}</p>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-md py-sm border-t border-outline-variant">
                  <div>
                    <p class="font-label-sm text-label-sm text-on-surface-variant">Vigencia</p>
                    <p class="font-body-md text-body-md text-on-surface">${esc(fechaCorta(`${p.desde}T12:00:00`))} – ${esc(fechaCorta(`${p.hasta}T12:00:00`))}</p>
                  </div>
                  <div>
                    <p class="font-label-sm text-label-sm text-on-surface-variant">Días restantes</p>
                    <p class="font-body-md text-body-md ${dias < 30 ? 'text-error font-bold' : 'text-on-surface'}">${dias > 0 ? dias : 'Vencido'}</p>
                  </div>
                </div>
              </div>`;
            })
            .join('')}
        </div>`
  }
  ${
    lista.some((p) => p.estado === 'por_vencer')
      ? `<div class="mt-lg bg-error-container/20 border border-error-container rounded-lg p-lg flex gap-md items-start">
          <span class="material-symbols-outlined text-error">warning</span>
          <p class="font-body-md text-body-md text-on-surface">Un permiso vencido suspende automáticamente la publicación del comercio.</p>
        </div>`
      : ''
  }
</div>`,
  );

  return { titulo: 'Permisos', standalone: true, contenido };
};

// ----------------------------------------------------------------- Contratos

export const contratosStitch: Render = (): Pagina => {
  const e = store.leer();
  const negocio = miNegocio();
  const lista = e.contratos.filter((c) => c.negocioId === negocio.id);

  const contenido = marcoPropietario(
    '/c/expediente',
    `
<div class="p-lg lg:p-xl max-w-7xl mx-auto">
  ${pestañas('contratos')}
  <div class="mb-lg">
    <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">Contratos</h2>
    <p class="font-body-lg text-body-lg text-on-surface-variant">Condiciones económicas de la concesión.</p>
  </div>
  ${
    lista.length === 0
      ? '<p class="font-body-md text-body-md text-on-surface-variant">No hay condiciones económicas registradas.</p>'
      : `<div class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
          ${lista
            .map(
              (c) => `<button type="button" data-accion="ir" data-valor="/c/contrato/${esc(c.id)}" class="text-left bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col gap-md hover:shadow-[0px_4px_12px_rgba(40,51,46,0.08)] transition-shadow">
                <div class="flex justify-between items-start">
                  <div>
                    <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-mono">CT-${esc(c.id.slice(-4))}</span>
                    <h3 class="font-headline-md text-headline-md text-on-surface mt-xs">Condiciones económicas</h3>
                  </div>
                  ${insigniaEstado(c.estado, c.estado === 'vigente' ? 'exito' : 'neutro')}
                </div>
                <div class="grid grid-cols-2 gap-md py-sm border-t border-outline-variant">
                  <div>
                    <p class="font-label-sm text-label-sm text-on-surface-variant">Vigencia</p>
                    <p class="font-body-md text-body-md text-on-surface">${esc(fechaCorta(`${c.desde}T12:00:00`))} – ${esc(fechaCorta(`${c.hasta}T12:00:00`))}</p>
                  </div>
                  <div>
                    <p class="font-label-sm text-label-sm text-on-surface-variant">Canon fijo</p>
                    <p class="font-body-md text-body-md text-on-surface">${esc(formatearUsd(c.canonFijoUsd))}</p>
                  </div>
                </div>
              </button>`,
            )
            .join('')}
        </div>`
  }
</div>`,
  );

  return { titulo: 'Contratos', standalone: true, contenido };
};

export const detalleContratoStitch: Render = (ctx): Pagina => {
  const e = store.leer();
  const c = e.contratos.find((x) => x.id === ctx.params.contratoId);
  if (!c) return error404(ctx);

  const contenido = marcoPropietario(
    '/c/expediente',
    `
<div class="p-lg lg:p-xl max-w-3xl mx-auto">
  <button type="button" data-accion="ir" data-valor="/c/contratos" class="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors w-fit mb-md">
    <span class="material-symbols-outlined text-[18px]">arrow_back</span>
    <span class="font-label-sm text-label-sm">Volver a contratos</span>
  </button>
  <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-lg">Condiciones económicas</h2>

  <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg grid grid-cols-1 sm:grid-cols-2 gap-6 mb-lg">
    <div class="flex flex-col gap-1">
      <span class="font-label-sm text-label-sm text-outline">Vigencia</span>
      <span class="font-body-md text-body-md text-on-surface">${esc(fechaCorta(`${c.desde}T12:00:00`))} – ${esc(fechaCorta(`${c.hasta}T12:00:00`))}</span>
    </div>
    <div class="flex flex-col gap-1">
      <span class="font-label-sm text-label-sm text-outline">Estado</span>
      ${insigniaEstado(c.estado, c.estado === 'vigente' ? 'exito' : 'neutro')}
    </div>
    <div class="flex flex-col gap-1">
      <span class="font-label-sm text-label-sm text-outline">Canon fijo por periodo</span>
      <span class="font-body-md text-body-md text-on-surface">${esc(formatearUsd(c.canonFijoUsd))}</span>
    </div>
    <div class="flex flex-col gap-1">
      <span class="font-label-sm text-label-sm text-outline">Porcentaje sobre venta</span>
      <span class="font-body-md text-body-md text-on-surface">${c.porcentajeSobreVenta}%</span>
    </div>
    <div class="flex flex-col gap-1">
      <span class="font-label-sm text-label-sm text-outline">Mínimo garantizado</span>
      <span class="font-body-md text-body-md text-on-surface">${esc(formatearUsd(c.minimoGarantizadoUsd))}</span>
    </div>
  </div>

  <div class="bg-surface-container-low border border-outline-variant rounded-lg p-lg flex gap-md items-start">
    <span class="material-symbols-outlined text-tertiary">info</span>
    <p class="font-body-md text-body-md text-on-surface-variant">Cambiar las condiciones económicas exige motivo, evidencia y verificación en dos pasos, y solo puede hacerlo la Dirección Comercial.</p>
  </div>
</div>`,
  );

  return { titulo: 'Condiciones económicas', standalone: true, contenido };
};

// --------------------------------------------------------------------- Cobro

export const cobroStitch: Render = (): Pagina => {
  const e = store.leer();
  const negocio = miNegocio();
  const u = sesion.usuario()!;
  const cuenta = e.cuentasBancarias.find((c) => c.negocioId === negocio.id);
  const proy = cuenta ? proyectarCuenta(cuenta, u.rol) : null;

  const metodos: Array<[string, string, boolean]> = [
    ['account_balance', 'Transferencia bancaria', true],
    ['smartphone', 'Pago móvil', true],
    ['credit_card', 'Tarjeta', false],
    ['payments', 'Efectivo en el punto', true],
  ];

  const contenido = marcoPropietario(
    '/c/estado-cuenta',
    `
<div class="p-lg lg:p-xl max-w-5xl mx-auto space-y-xl">
  <div>
    <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">Configuración de cobro</h2>
    <p class="font-body-lg text-body-lg text-on-surface-variant">Métodos aceptados y cuenta de liquidación.</p>
  </div>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-lg">
    <div class="lg:col-span-2 space-y-lg">
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg relative overflow-hidden">
        <div class="absolute -right-16 -top-16 w-48 h-48 bg-secondary-container rounded-full opacity-50 blur-3xl"></div>
        <div class="relative z-10">
          ${
            proy && proy.visible
              ? `<div class="flex justify-between items-start mb-xl">
                  <div>
                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary-container text-on-secondary-container font-label-sm text-label-sm mb-4">
                      <span class="material-symbols-outlined text-[16px]">check_circle</span> Cuenta de liquidación
                    </span>
                    <h3 class="font-headline-md text-headline-md text-on-surface mb-1">${esc(proy.titular)}</h3>
                    <p class="font-body-md text-body-md text-on-surface-variant flex items-center gap-2">
                      <span class="material-symbols-outlined text-[20px]">account_balance</span>
                      ${esc(proy.banco)}
                    </p>
                  </div>
                  <div class="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center border border-outline-variant">
                    <span class="material-symbols-outlined text-on-surface-variant text-[24px]">account_balance_wallet</span>
                  </div>
                </div>
                <div class="bg-surface p-4 rounded-lg border border-outline-variant flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p class="font-label-sm text-label-sm text-on-surface-variant mb-1">NÚMERO DE CUENTA</p>
                    <p class="font-headline-md text-headline-md text-on-surface tracking-widest">${esc(proy.numeroEnmascarado)}</p>
                  </div>
                  ${insigniaEstado(proy.verificada ? 'Verificada' : 'Sin verificar', proy.verificada ? 'exito' : 'alerta')}
                </div>
                <p class="font-label-sm text-label-sm text-on-surface-variant mt-sm">El número se muestra siempre enmascarado, incluso para el propietario.</p>`
              : `<p class="font-body-md text-body-md text-on-surface-variant">Su rol no tiene acceso a los datos bancarios del negocio.</p>`
          }
        </div>
      </div>
      <button type="button" data-accion="ir" data-valor="/c/cobro/cuenta-bancaria" class="w-full h-touch-target px-6 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors font-label-md text-label-md flex items-center justify-center gap-2">
        <span class="material-symbols-outlined">edit_document</span>
        Solicitar cambio de cuenta bancaria
      </button>
    </div>
    <div class="space-y-lg">
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
        <h3 class="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-2">
          <span class="material-symbols-outlined text-secondary">point_of_sale</span>
          Métodos de cobro
        </h3>
        <div class="space-y-4">
          ${metodos
            .map(
              ([icono, nombre, activo]) => `<div class="p-4 rounded-lg border border-outline-variant bg-surface">
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                      <span class="material-symbols-outlined text-[18px]">${icono}</span>
                    </div>
                    <h4 class="font-label-md text-label-md text-on-surface">${esc(nombre)}</h4>
                  </div>
                  <span class="w-2 h-2 rounded-full ${activo ? 'bg-primary' : 'bg-outline-variant'}" title="${activo ? 'Activo' : 'Inactivo'}"></span>
                </div>
                <div class="flex justify-between items-center pt-3 border-t border-outline-variant">
                  <span class="font-label-sm text-label-sm text-on-surface-variant">Estado</span>
                  ${insigniaEstado(activo ? 'Activo' : 'Inactivo', activo ? 'exito' : 'neutro')}
                </div>
              </div>`,
            )
            .join('')}
        </div>
      </div>
      <p class="font-label-sm text-label-sm text-on-surface-variant text-center">Liquidación directa al comercio · modelo A (demo)</p>
    </div>
  </div>
</div>`,
  );

  return { titulo: 'Configuración de cobro', standalone: true, contenido };
};

export const cuentaBancariaStitch: Render = (ctx): Pagina => {
  const e = store.leer();
  const negocio = miNegocio();
  const u = sesion.usuario()!;
  if (!puedeVerBancario(u.rol)) return error403(ctx);
  const cuenta = e.cuentasBancarias.find((c) => c.negocioId === negocio.id);
  const proy = cuenta ? proyectarCuenta(cuenta, u.rol) : null;

  const contenido = marcoPropietario(
    '/c/estado-cuenta',
    `
<div class="p-lg lg:p-xl max-w-3xl mx-auto">
  <button type="button" data-accion="ir" data-valor="/c/cobro" class="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors w-fit mb-md">
    <span class="material-symbols-outlined text-[18px]">arrow_back</span>
    <span class="font-label-sm text-label-sm">Volver a cobro</span>
  </button>

  <div class="bg-surface-container-low p-4 rounded-lg flex items-start gap-3 border border-outline-variant mb-lg">
    <span class="material-symbols-outlined text-error">warning</span>
    <div>
      <p class="font-label-md text-label-md text-on-surface">Cambio sensible</p>
      <p class="font-body-md text-body-md text-on-surface-variant text-sm">Exige motivo, evidencia documental, verificación en dos pasos y una segunda aprobación de INPARQUES.</p>
    </div>
  </div>

  ${
    proy && proy.visible
      ? `<div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg mb-lg">
          <h3 class="font-label-md text-label-md text-on-surface-variant mb-sm">Cuenta actual</h3>
          <p class="font-headline-md text-headline-md text-on-surface">${esc(proy.banco)} · <span class="font-mono">${esc(proy.numeroEnmascarado)}</span></p>
        </div>`
      : ''
  }

  <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
    <h3 class="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
      <span class="material-symbols-outlined text-primary">edit_document</span>
      Solicitar cambio de cuenta
    </h3>
    <div class="space-y-md">
      <div>
        <label class="block font-label-md text-label-md text-on-surface mb-2" for="cb-banco">Banco</label>
        <input class="w-full h-touch-target px-4 rounded border border-outline-variant bg-surface focus:border-2 focus:border-primary focus:outline-none font-body-md text-body-md" id="cb-banco" name="banco" placeholder="Banco Demo Central" type="text">
      </div>
      <div>
        <label class="block font-label-md text-label-md text-on-surface mb-2" for="cb-titular">Titular de la cuenta</label>
        <input class="w-full h-touch-target px-4 rounded border border-outline-variant bg-surface focus:border-2 focus:border-primary focus:outline-none font-body-md text-body-md" id="cb-titular" name="titular" type="text">
      </div>
      <div>
        <label class="block font-label-md text-label-md text-on-surface mb-2" for="cb-numero">Número de cuenta</label>
        <input class="w-full h-touch-target px-4 rounded border border-outline-variant bg-surface focus:border-2 focus:border-primary focus:outline-none font-body-md text-body-md font-mono" id="cb-numero" inputmode="numeric" name="numero" placeholder="0102 0000 0000 0000 0000" type="text">
        <p class="font-label-sm text-label-sm text-on-surface-variant mt-1">Datos ficticios. La demo no valida cuentas reales.</p>
      </div>
      <div>
        <label class="block font-label-md text-label-md text-on-surface mb-2" for="cb-motivo">Motivo del cambio</label>
        <select class="w-full h-touch-target px-4 rounded border border-outline-variant bg-surface focus:border-2 focus:border-primary focus:outline-none font-body-md text-body-md" id="cb-motivo" name="motivo">
          <option value="">Seleccione un motivo…</option>
          <option>Cierre de la cuenta anterior</option>
          <option>Cambio de entidad bancaria</option>
          <option>Actualización corporativa</option>
        </select>
      </div>
      <div>
        <label class="block font-label-md text-label-md text-on-surface mb-2">Evidencia documental</label>
        <div class="border-2 border-dashed border-outline-variant rounded-lg p-6 flex items-center gap-3 bg-surface-container-lowest">
          <span class="material-symbols-outlined text-primary">description</span>
          <span class="font-label-md text-label-md text-on-surface">carta-banco.pdf</span>
          <input name="evidencia" type="hidden" value="carta-banco.pdf">
        </div>
        <p class="font-label-sm text-label-sm text-on-surface-variant mt-1">La demo no sube archivos reales; se usa un nombre de documento de muestra.</p>
      </div>
      <div class="bg-surface-container-low p-4 rounded-lg flex items-start gap-3 border border-outline-variant">
        <span class="material-symbols-outlined text-tertiary">security</span>
        <div>
          <p class="font-label-md text-label-md text-on-surface">Autenticación multifactor (MFA) requerida</p>
          <p class="font-body-md text-body-md text-on-surface-variant text-sm">Se enviará un código de verificación al dispositivo registrado del representante legal para confirmar esta acción.</p>
        </div>
      </div>
      <div id="error-cuenta-bancaria"></div>
      <div class="pt-2 flex justify-end">
        <button type="button" data-accion="cambiar-cuenta" class="h-touch-target px-6 rounded bg-primary-container text-on-primary hover:bg-primary transition-colors font-label-md text-label-md flex items-center gap-2">
          <span class="material-symbols-outlined text-[20px]">send</span>
          Solicitar cambio
        </button>
      </div>
    </div>
  </div>
</div>`,
  );

  return { titulo: 'Cuenta bancaria', standalone: true, contenido };
};

// -------------------------------------------------------------------- Equipo

export const equipoStitch: Render = (): Pagina => {
  const e = store.leer();
  const negocio = miNegocio();
  const locales = e.locales.filter((l) => l.negocioId === negocio.id).map((l) => l.id);
  const miembros = e.usuarios.filter(
    (u) => u.rol.startsWith('comercio.') && (u.scope.ids.includes(negocio.id) || u.scope.ids.some((i) => locales.includes(i))),
  );
  const conMfa = miembros.filter((m) => m.mfaHabilitado).length;
  const pctMfa = miembros.length ? Math.round((conMfa / miembros.length) * 100) : 0;

  const contenido = marcoPropietario(
    '/c/equipo',
    `
<div class="p-lg lg:p-xl max-w-7xl mx-auto space-y-lg">
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div>
      <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">Equipo y Accesos</h2>
      <p class="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">Gestiona los permisos y roles de los miembros de tu equipo comercial.</p>
    </div>
    <button type="button" data-accion="ir" data-valor="/c/equipo/invitar" class="h-touch-target px-6 rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-2 shadow-sm shrink-0">
      <span class="material-symbols-outlined">person_add</span>
      Invitar miembro
    </button>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-lg">
    <div class="lg:col-span-3 space-y-4">
      <div class="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-label-md text-label-md text-on-surface-variant">Total miembros</h3>
          <div class="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
            <span class="material-symbols-outlined text-[20px]">groups</span>
          </div>
        </div>
        <p class="font-display-lg text-display-lg text-on-surface">${miembros.length}</p>
      </div>
      <div class="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-label-md text-label-md text-on-surface-variant">Seguridad (MFA)</h3>
          <div class="w-8 h-8 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container">
            <span class="material-symbols-outlined text-[20px]">shield_locked</span>
          </div>
        </div>
        <div class="flex items-baseline gap-2">
          <p class="font-display-lg text-display-lg text-on-surface">${pctMfa}%</p>
          <span class="font-body-md text-body-md text-on-surface-variant">activos</span>
        </div>
        <div class="w-full bg-surface-container-high rounded-full h-2 mt-3">
          <div class="bg-primary h-2 rounded-full" style="width: ${pctMfa}%"></div>
        </div>
      </div>
    </div>

    <div class="lg:col-span-9 bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden flex flex-col">
      <div class="overflow-x-auto">
        ${
          miembros.length === 0
            ? '<p class="p-lg font-body-md text-body-md text-on-surface-variant">Sin integrantes registrados todavía.</p>'
            : `<table class="w-full whitespace-nowrap">
                <thead class="bg-surface-container-low font-label-md text-label-md text-on-surface-variant">
                  <tr>
                    <th class="p-4 text-left">Nombre de usuario</th>
                    <th class="p-4 text-left">Rol asignado</th>
                    <th class="p-4 text-left">Estado MFA</th>
                    <th class="p-4 text-left">Último acceso</th>
                  </tr>
                </thead>
                <tbody class="font-body-md text-body-md">
                  ${miembros
                    .map(
                      (m) => `<tr class="hover:bg-surface-container-low transition-colors cursor-pointer" data-accion="ir" data-valor="/c/equipo/${esc(m.id)}">
                        <td class="p-4">
                          <div class="flex items-center gap-3">
                            ${avatar(m.nombre, 'w-10 h-10 text-[13px]')}
                            <div>
                              <p class="font-label-md text-label-md text-on-surface">${esc(m.nombre)}</p>
                              <p class="text-sm text-on-surface-variant">${esc(m.correo)}</p>
                            </div>
                          </div>
                        </td>
                        <td class="p-4">
                          <span class="inline-flex items-center px-2 py-1 rounded-md bg-tertiary-container/10 text-tertiary-container font-label-sm text-label-sm">${esc(ROLES[m.rol].nombre)}</span>
                        </td>
                        <td class="p-4">
                          <span class="inline-flex items-center gap-1 ${m.mfaHabilitado ? 'text-primary' : 'text-error'}">
                            <span class="material-symbols-outlined text-[16px]">${m.mfaHabilitado ? 'verified' : 'error'}</span>
                            ${m.mfaHabilitado ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td class="p-4 text-on-surface-variant">${m.ultimoAcceso ? esc(fechaHora(m.ultimoAcceso)) : 'Nunca'}</td>
                      </tr>`,
                    )
                    .join('')}
                </tbody>
              </table>`
        }
      </div>
    </div>
  </div>
</div>`,
  );

  return { titulo: 'Equipo', standalone: true, contenido };
};

export const invitarEquipoStitch: Render = (): Pagina => {
  const contenido = marcoPropietario(
    '/c/equipo',
    `
<div class="p-lg lg:p-xl max-w-2xl mx-auto">
  <button type="button" data-accion="ir" data-valor="/c/equipo" class="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors w-fit mb-md">
    <span class="material-symbols-outlined text-[18px]">arrow_back</span>
    <span class="font-label-sm text-label-sm">Volver a equipo</span>
  </button>
  <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">Nueva invitación</h2>
  <p class="font-body-lg text-body-lg text-on-surface-variant mb-lg">La persona recibe un código y define su propia contraseña. La demo no envía correos: el código aparecerá en pantalla.</p>

  <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg space-y-lg">
    <div>
      <label class="block font-label-md text-label-md text-on-surface mb-2" for="inv-correo">Correo electrónico</label>
      <input class="w-full h-touch-target px-4 rounded border border-outline-variant bg-surface focus:border-2 focus:border-primary focus:outline-none font-body-md text-body-md" id="inv-correo" name="correo" type="email">
    </div>
    <div>
      <span class="block font-label-md text-label-md text-on-surface mb-2">Rol</span>
      <div class="space-y-2">
        ${[
          ['comercio.admin_local', 'Administrador de local', 'Catálogo, horarios, pedidos, caja y personal', true],
          ['comercio.operador', 'Operador / cocina', 'Aceptar, preparar, marcar listo y validar entrega', false],
          ['comercio.contador', 'Contador', 'Facturas, cierres, reportes y conciliación', false],
        ]
          .map(
            ([valor, titulo, ayuda, marcado]) => `<label class="flex items-start gap-3 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low cursor-pointer transition-colors">
              <input class="mt-1" name="rol" type="radio" value="${valor}" ${marcado ? 'checked' : ''}>
              <span>
                <span class="block font-label-md text-label-md text-on-surface">${titulo}</span>
                <span class="block font-body-md text-body-md text-on-surface-variant text-sm">${ayuda}</span>
              </span>
            </label>`,
          )
          .join('')}
      </div>
    </div>
    <div id="error-invitar"></div>
    <button type="button" data-accion="enviar-invitacion" class="w-full h-touch-target bg-primary-container text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary transition-colors flex items-center justify-center gap-2">
      <span class="material-symbols-outlined">send</span>
      Enviar invitación
    </button>
  </div>
</div>`,
  );

  return { titulo: 'Invitar integrante', standalone: true, contenido };
};

export const detalleEquipoStitch: Render = (ctx): Pagina => {
  const e = store.leer();
  const m = e.usuarios.find((u) => u.id === ctx.params.usuarioId);
  if (!m) return error404(ctx);
  const d = ROLES[m.rol];
  const permisosRol =
    d.nombre === 'Operador / cocina / servicio'
      ? ['Aceptar pedidos', 'Preparar', 'Marcar listo', 'Validar entrega', 'Venta de mostrador']
      : d.nombre === 'Contador'
        ? ['Facturas', 'Cierres', 'Reportes', 'Conciliación', 'Exportar']
        : ['Catálogo', 'Horarios', 'Pedidos', 'Caja', 'Personal'];

  const contenido = marcoPropietario(
    '/c/equipo',
    `
<div class="p-lg lg:p-xl max-w-2xl mx-auto">
  <button type="button" data-accion="ir" data-valor="/c/equipo" class="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors w-fit mb-md">
    <span class="material-symbols-outlined text-[18px]">arrow_back</span>
    <span class="font-label-sm text-label-sm">Volver a equipo</span>
  </button>
  <div class="flex items-center gap-4 mb-lg">
    ${avatar(m.nombre, 'w-14 h-14 text-[16px]')}
    <div>
      <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">${esc(m.nombre)}</h2>
      <p class="font-body-md text-body-md text-on-surface-variant">${esc(m.correo)}</p>
    </div>
  </div>

  <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg grid grid-cols-1 sm:grid-cols-2 gap-6 mb-lg">
    <div class="flex flex-col gap-1">
      <span class="font-label-sm text-label-sm text-outline">Rol</span>
      <span class="font-body-md text-body-md text-on-surface">${esc(d.nombre)}</span>
    </div>
    <div class="flex flex-col gap-1">
      <span class="font-label-sm text-label-sm text-outline">Estado</span>
      ${insigniaEstado(m.estado, m.estado === 'activo' ? 'exito' : 'alerta')}
    </div>
    <div class="flex flex-col gap-1">
      <span class="font-label-sm text-label-sm text-outline">Ámbito</span>
      <span class="font-body-md text-body-md text-on-surface">${esc(d.limite)}</span>
    </div>
    <div class="flex flex-col gap-1">
      <span class="font-label-sm text-label-sm text-outline">Segundo factor</span>
      <span class="font-body-md text-body-md text-on-surface">${d.requiereMfa ? 'Obligatorio' : 'No requerido'}</span>
    </div>
    <div class="flex flex-col gap-1">
      <span class="font-label-sm text-label-sm text-outline">Datos bancarios</span>
      <span class="font-body-md text-body-md text-on-surface">${d.puedeVerDatosBancarios ? 'Accesibles enmascarados' : 'No accesibles'}</span>
    </div>
    <div class="flex flex-col gap-1">
      <span class="font-label-sm text-label-sm text-outline">Último acceso</span>
      <span class="font-body-md text-body-md text-on-surface">${m.ultimoAcceso ? esc(fechaHora(m.ultimoAcceso)) : 'Nunca'}</span>
    </div>
  </div>

  <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
    <h3 class="font-label-md text-label-md text-on-surface mb-4">Permisos del rol</h3>
    <div class="flex flex-wrap gap-2">
      ${permisosRol.map((p) => `<span class="px-3 py-1 rounded-full bg-surface-variant text-on-surface-variant font-label-sm text-label-sm">${esc(p)}</span>`).join('')}
    </div>
  </div>
</div>`,
  );

  return { titulo: m.nombre, standalone: true, contenido };
};

// ------------------------------------------------------------------ Catálogo

export const catalogoStitch: Render = (): Pagina => {
  const e = store.leer();
  const u = sesion.usuario()!;
  const locales =
    u.scope.level === 'local'
      ? e.locales.filter((l) => u.scope.ids.includes(l.id))
      : e.locales.filter((l) => u.scope.ids.includes(l.negocioId));
  const localesIds = locales.map((l) => l.id);
  const arts = e.articulos.filter((a) => localesIds.includes(a.localId));

  const categorias = [...new Set(arts.map((a) => a.categoria))];
  const puedeEditar = u.rol === 'comercio.propietario' || u.rol === 'comercio.admin_local';

  function tarjetaArticulo(a: (typeof arts)[number]): string {
    return `
<article class="bg-surface border border-outline-variant rounded-lg p-lg hover:shadow-md transition-shadow flex flex-col gap-md relative">
  <div class="flex justify-between items-start">
    <div class="flex gap-md">
      <div class="w-20 h-20 rounded-md overflow-hidden bg-surface-container-low shrink-0 border border-surface-variant flex items-center justify-center text-outline">
        <span class="material-symbols-outlined text-4xl">${a.tipo === 'servicio' ? 'confirmation_number' : 'restaurant'}</span>
      </div>
      <div>
        <h3 class="font-headline-md text-headline-md text-on-surface">${esc(a.nombre)}</h3>
        <p class="font-label-sm text-label-sm text-on-surface-variant mt-base capitalize">${esc(a.categoria)}</p>
        <div class="mt-xs inline-flex items-center px-2 py-1 rounded-full ${a.disponible ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'} font-label-sm text-label-sm">
          ${a.disponible ? 'En stock' : 'Agotado'}
        </div>
      </div>
    </div>
  </div>
  <div class="grid grid-cols-2 gap-sm py-sm border-y border-surface-variant mt-auto">
    <div>
      <span class="font-label-sm text-label-sm text-on-surface-variant block">Precio</span>
      <span class="font-body-lg text-body-lg text-on-surface font-semibold">${esc(formatearUsd(a.precioUsd))}</span>
    </div>
    <div>
      <span class="font-label-sm text-label-sm text-on-surface-variant block">${a.tipo === 'servicio' ? 'Cupo/franja' : 'Existencias'}</span>
      <span class="font-body-lg text-body-lg text-on-surface font-semibold">${typeof a.stock === 'number' ? `${a.stock} und.` : typeof a.cupoPorFranja === 'number' ? `${a.cupoPorFranja} cupos` : '—'}</span>
    </div>
  </div>
  <div class="flex justify-between items-center pt-xs">
    <div class="flex items-center gap-sm">
      <span class="font-label-md text-label-md text-on-surface">${a.disponible ? 'Disponible' : 'Agotado'}</span>
      ${
        puedeEditar || u.rol === 'comercio.operador'
          ? `<button type="button" data-accion="toggle-disponible" data-valor="${esc(a.id)}" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${a.disponible ? 'bg-primary' : 'bg-surface-variant'}">
              <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${a.disponible ? 'translate-x-6' : 'translate-x-1'}"></span>
            </button>`
          : ''
      }
    </div>
    ${
      puedeEditar
        ? `<button type="button" data-accion="ir" data-valor="/c/catalogo/articulo/${esc(a.id)}" class="p-2 rounded hover:bg-surface-variant text-on-surface-variant transition-colors" title="Editar">
            <span class="material-symbols-outlined">edit</span>
          </button>`
        : ''
    }
  </div>
</article>`;
  }

  const cuerpo = `
<header class="sticky ${u.rol === 'comercio.propietario' ? 'top-16' : 'top-0'} z-30 bg-background/95 backdrop-blur-sm border-b border-surface-variant px-lg py-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
  <div>
    <h1 class="font-display-lg text-display-lg text-primary">Catálogo</h1>
    <p class="font-body-md text-body-md text-on-surface-variant mt-base">Gestión de productos, servicios y disponibilidad.</p>
  </div>
</header>
<div class="p-lg max-w-7xl mx-auto space-y-lg">
  ${
    arts.length === 0
      ? '<p class="font-body-md text-body-md text-on-surface-variant">Sin artículos en el catálogo todavía.</p>'
      : categorias
          .map(
            (cat) => `<div>
              <h2 class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-sm">${esc(cat)}</h2>
              <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-md">
                ${arts.filter((a) => a.categoria === cat).map(tarjetaArticulo).join('')}
              </div>
            </div>`,
          )
          .join('')
  }
</div>`;

  return { titulo: 'Catálogo', standalone: true, contenido: marcoComercio('/c/catalogo', cuerpo) };
};
