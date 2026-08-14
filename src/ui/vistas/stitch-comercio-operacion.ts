/**
 * Operación diaria del comercio (pedidos, reservas, caja), portada del HTML
 * real de Stitch, compartida por `comercio.propietario`, `comercio.admin_local`,
 * `comercio.operador` y `comercio.contador` (cada uno con su propio acceso,
 * ya controlado por `app/registry.ts`).
 *
 * Fuentes:
 * - `50/p_gina_2_centro_de_pedidos_tablero` ("Centro de Pedidos - Parques
 *   Nacionales") → tablero kanban, la vista de escritorio de admin_local.
 * - `50/p_gina_2_cola_de_pedidos` ("Operaciones Parque - Cola de Pedidos")
 *   → cola de tarjetas con pestañas, la vista móvil de operador.
 * - `50/p_gina_4_reservas` ("Parques Nacionales - Reservas") → listado de
 *   reservas.
 * - `stitch_inparques_comercial_portal_visitante/p_gina_9_caja_pos`
 *   ("Caja / POS - Parques Nacionales") → venta de mostrador.
 * - `los 25/p_gina_10_apertura_y_cierre_de_caja` → apertura/cierre de turno.
 *
 * Las columnas del tablero y las pestañas de la cola son exactamente los
 * estados reales de `EstadoOrden` (`domain/types.ts`): no se inventa un
 * estado nuevo, se reutiliza el que ya gobierna todo el ciclo de vida del
 * pedido (incluida la vista de seguimiento del visitante).
 */

import { esc } from '../componentes';
import { barraLateralAdminLocal } from './stitch-comercio';
import { conCajonMovil } from '../stitch-shell';
import type { Pagina, Render } from './tipos';
import { store } from '../../data/store';
import { sesion } from '../../app/session';
import { ROLES } from '../../domain/roles';
import { estadoUi, filtro } from '../estado-ui';
import { ETIQUETA_ORDEN, TONO_ORDEN } from '../../domain/state-machines';
import { formatearUsd, formatearVes } from '../../domain/money';
import { fechaCorta, fechaHora, horaCorta } from '../formato';
import { error403, error404 } from './compartidas';
import { alcanzaOrden } from '../../domain/ownership';
import { puede } from '../../domain/permissions';
import type { Local, Orden } from '../../domain/types';

function misLocales(): Local[] {
  const u = sesion.usuario();
  const e = store.leer();
  if (!u) return [];
  if (u.scope.level === 'local') return e.locales.filter((l) => u.scope.ids.includes(l.id));
  if (u.scope.level === 'negocio') return e.locales.filter((l) => u.scope.ids.includes(l.negocioId));
  return [];
}

function misOrdenes(): Orden[] {
  const ids = misLocales().map((l) => l.id);
  return store.leer().ordenes.filter((o) => ids.includes(o.localId));
}

/** Envoltura de escritorio/móvil del "Portal Admin" (sin topbar, cajón fijo). */
function marcoPortalAdmin(activo: string, cuerpo: string, tituloMovil = 'Parques Nacionales'): string {
  return `
${conCajonMovil(barraLateralAdminLocal(activo), false)}
<main class="md:ml-64 min-h-screen bg-background">
  <header class="md:hidden flex justify-between items-center w-full px-lg h-touch-target sticky top-0 z-30 bg-surface border-b border-outline-variant">
    <div class="flex items-center gap-sm">
      <button type="button" data-accion="abrir-cajon" aria-label="Abrir menú" class="min-h-touch-target min-w-[44px] flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full">
        <span class="material-symbols-outlined">menu</span>
      </button>
      <span class="font-headline-md text-headline-md font-bold text-primary">${esc(tituloMovil)}</span>
    </div>
    <button type="button" data-accion="ir" data-valor="/perfil" class="min-h-touch-target min-w-[44px] flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full">
      <span class="material-symbols-outlined">person</span>
    </button>
  </header>
  ${cuerpo}
</main>`;
}

function tiempoTranscurrido(o: Orden): string {
  const min = Math.round((Date.now() - new Date(o.creadaEn).getTime()) / 60000);
  return min < 60 ? `${Math.max(min, 0)}m` : `${Math.round(min / 60)}h`;
}

function resumenItems(o: Orden): string {
  return o.items.map((i) => `${i.cantidad}x ${i.nombre}`).join(', ');
}

// ------------------------------------------------------------------ Pedidos

const COLUMNAS: Array<[Orden['estado'] | 'finalizados', string, string]> = [
  ['pendiente_aceptacion', 'Nuevos', 'bg-error'],
  ['aceptada', 'Aceptados', 'bg-secondary'],
  ['preparando', 'Preparando', 'bg-primary-fixed-dim'],
  ['lista', 'Listos', 'bg-primary'],
  ['finalizados', 'Finalizados', 'bg-outline'],
];

const SIGUIENTE: Partial<Record<Orden['estado'], { destino: Orden['estado']; texto: string }>> = {
  pendiente_aceptacion: { destino: 'aceptada', texto: 'Aceptar' },
  aceptada: { destino: 'preparando', texto: 'A preparación' },
  preparando: { destino: 'lista', texto: 'Marcar listo' },
  lista: { destino: 'entregada', texto: 'Entregar' },
};

function tarjetaPedidoKanban(o: Orden): string {
  const paso = SIGUIENTE[o.estado];
  const terminada = o.estado === 'entregada' || o.estado === 'cancelada';
  return `
<div class="${terminada ? 'bg-surface-dim' : 'bg-surface'} rounded-lg p-md border border-outline-variant ${terminada ? 'shadow-none' : 'shadow-sm hover:shadow-md'} transition-shadow ${terminada ? '' : 'cursor-pointer'}" ${terminada ? '' : `data-accion="ir" data-valor="/c/pedido/${esc(o.id)}"`}>
  <div class="flex justify-between items-start mb-sm">
    <span class="font-label-md text-label-md font-bold ${terminada ? 'text-outline' : 'text-primary'}">${esc(o.codigo)}</span>
    <span class="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-base">
      <span class="material-symbols-outlined text-[16px]">${o.estado === 'cancelada' ? 'block' : terminada ? 'check_circle' : 'schedule'}</span>
      ${o.estado === 'cancelada' ? 'Cancelado' : tiempoTranscurrido(o)}
    </span>
  </div>
  <p class="font-body-md ${terminada ? 'text-outline' : 'text-on-surface'} line-clamp-2 mb-md">${esc(resumenItems(o))}</p>
  ${
    !terminada
      ? `<div class="flex flex-wrap gap-xs mb-md">
          <span class="bg-surface-variant text-on-surface-variant px-sm py-base rounded-full font-label-sm text-label-sm">${esc(o.clienteNombre)}</span>
          <span class="bg-surface-variant text-on-surface-variant px-sm py-base rounded-full font-label-sm text-label-sm">${o.canal === 'mostrador' ? 'Mostrador' : 'App'}</span>
        </div>`
      : ''
  }
  ${
    paso
      ? `<div class="flex gap-sm border-t border-outline-variant pt-sm mt-sm">
          <button type="button" data-accion="avanzar-orden" data-valor="${esc(o.id)}|${paso.destino}" class="flex-1 bg-primary-container text-on-primary h-10 rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity">${esc(paso.texto)}</button>
          <button type="button" data-accion="cancelar-orden" data-valor="${esc(o.id)}" class="w-10 h-10 flex items-center justify-center border border-outline-variant rounded-lg text-on-surface hover:bg-surface-variant transition-colors" aria-label="Cancelar">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>`
      : ''
  }
</div>`;
}

/** Tablero kanban de escritorio (admin_local, propietario, contador). */
function pedidosKanban(): string {
  const ordenes = misOrdenes().filter((o) => o.tipo === 'pedido');
  const hoy = new Date().toISOString().slice(0, 10);
  const finalizadosHoy = ordenes.filter((o) => ['entregada', 'cancelada'].includes(o.estado) && o.creadaEn.slice(0, 10) === hoy);

  const cuerpo = `
<div class="bg-surface border-b border-outline-variant p-lg shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
  <div>
    <h2 class="font-headline-lg text-headline-lg text-on-surface">Centro de Pedidos</h2>
    <p class="text-on-surface-variant font-body-md mt-base">Gestión en tiempo real de operaciones</p>
  </div>
</div>
<div class="overflow-x-auto overflow-y-hidden p-lg bg-surface-container-lowest">
  <div class="flex gap-lg h-full pb-md min-w-[1200px]">
    ${COLUMNAS.map(([estado, titulo, punto]) => {
      const lista =
        estado === 'finalizados'
          ? finalizadosHoy
          : ordenes.filter((o) => o.estado === estado);
      return `
      <div class="flex flex-col w-[280px] shrink-0 bg-surface-container-low rounded-xl border border-outline-variant overflow-hidden ${estado === 'finalizados' ? 'opacity-75' : ''}">
        <div class="p-md bg-surface-container border-b border-outline-variant flex justify-between items-center shrink-0">
          <div class="flex items-center gap-sm">
            <div class="w-3 h-3 rounded-full ${punto}"></div>
            <h3 class="font-headline-md text-label-md font-bold text-on-surface">${titulo}</h3>
          </div>
          <span class="bg-surface-variant text-on-surface-variant px-sm py-base rounded-full font-label-sm text-label-sm">${estado === 'finalizados' ? `Hoy: ${lista.length}` : lista.length}</span>
        </div>
        <div class="flex-1 overflow-y-auto p-sm flex flex-col gap-sm max-h-[70vh]">
          ${
            lista.length === 0
              ? `<div class="flex flex-col items-center justify-center opacity-50 py-lg">
                  <span class="material-symbols-outlined text-[36px] text-outline mb-sm">inbox</span>
                  <p class="font-body-md text-on-surface-variant text-center px-sm">Sin pedidos aquí</p>
                </div>`
              : lista.map(tarjetaPedidoKanban).join('')
          }
        </div>
      </div>`;
    }).join('')}
  </div>
</div>`;

  return marcoPortalAdmin('/c/pedidos', cuerpo);
}

/**
 * Barra inferior del portal "Operaciones Parque".
 *
 * El original (`50/p_gina_2_cola_de_pedidos`) la trae con cinco destinos:
 * Pedidos, Reservas, Venta, Disponibilidad e Incidencias. Aquí se conservan
 * los cinco, pero apuntando a rutas que el operador sí puede abrir según
 * `app/registry.ts`: "Disponibilidad" va al catálogo (que es lo que el
 * operador puede tocar de la oferta) y "Más" sustituye a "Incidencias",
 * que en esta aplicación no es un módulo del comercio.
 *
 * Sin esta barra la cola de pedidos quedaba sin ninguna navegación: el
 * operador entraba y no podía salir.
 */
function barraOperador(activa: string): string {
  const destinos: Array<[string, string, string]> = [
    ['receipt_long', 'Pedidos', '/c/pedidos'],
    ['calendar_today', 'Reservas', '/c/reservas'],
    ['bolt', 'Venta', '/c/caja/venta-mostrador'],
    ['menu_book', 'Catálogo', '/c/catalogo'],
    ['list_alt', 'Más', '/c/mas'],
  ];
  return `
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center bg-surface border-t border-outline-variant shadow-sm pb-safe pt-xs" aria-label="Navegación principal">
  ${destinos
    .map(([icono, texto, ruta]) => {
      const on = ruta === activa;
      return `<button type="button" data-accion="ir" data-valor="${ruta}"
        class="flex flex-col items-center justify-center w-16 py-1 rounded-lg transition-colors ${
          on ? 'text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-high'
        }"${on ? ' aria-current="page"' : ''}>
        <span class="flex items-center justify-center rounded-full px-3 py-0.5 mb-0.5 ${on ? 'bg-secondary-container' : ''}">
          <span class="material-symbols-outlined ${on ? 'icon-fill' : ''}">${icono}</span>
        </span>
        <span class="font-label-sm text-[10px]">${esc(texto)}</span>
      </button>`;
    })
    .join('')}
</nav>`;
}

/** Cola móvil por pestañas (operador). */
function pedidosCola(): string {
  const ordenes = misOrdenes().filter((o) => o.tipo === 'pedido' && !['entregada', 'cancelada'].includes(o.estado));
  const f = filtro('pedidos-cola', 'nuevos');
  const nuevos = ordenes.filter((o) => o.estado === 'pendiente_aceptacion');
  const preparando = ordenes.filter((o) => ['aceptada', 'preparando'].includes(o.estado));
  const listos = ordenes.filter((o) => o.estado === 'lista');
  const lista = f === 'nuevos' ? nuevos : f === 'preparando' ? preparando : listos;

  const pestana = (valor: string, texto: string, n: number) =>
    `<button type="button" data-accion="filtro-pedidos-cola" data-valor="${valor}" class="flex-1 ${f === valor ? 'bg-primary-container text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'} rounded-lg py-xs px-sm flex items-center justify-center gap-xs font-label-md text-label-md transition-colors">
      ${texto}
      <span class="${f === valor ? 'bg-error text-on-error' : 'bg-surface-variant text-on-surface-variant'} rounded-full px-2 py-0.5 text-[10px] font-bold">${n}</span>
    </button>`;

  const cuerpo = `
<div class="md:hidden bg-surface flex justify-between items-center w-full px-lg h-touch-target sticky top-0 z-40 border-b border-outline-variant">
  <h1 class="font-headline-md text-headline-md-mobile font-bold text-primary">Operaciones Parque</h1>
</div>
<nav class="bg-surface sticky top-[44px] md:top-0 z-30 border-b border-surface-variant px-md pt-sm pb-sm">
  <div class="flex bg-surface-container-low rounded-lg p-base">
    ${pestana('nuevos', 'Nuevos', nuevos.length)}
    ${pestana('preparando', 'Preparando', preparando.length)}
    ${pestana('listos', 'Listos', listos.length)}
  </div>
</nav>
<main class="flex-1 p-md container mx-auto">
  ${
    lista.length === 0
      ? `<div class="flex flex-col items-center justify-center py-xxl opacity-60">
          <span class="material-symbols-outlined text-[48px] text-outline mb-sm">inbox</span>
          <p class="font-body-md text-on-surface-variant">Sin pedidos en esta cola</p>
        </div>`
      : `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
          ${lista
            .map((o) => {
              const paso = SIGUIENTE[o.estado];
              return `<article class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm flex flex-col gap-sm">
                <header class="flex justify-between items-start mb-xs">
                  <div>
                    <h2 class="font-headline-md text-headline-md-mobile text-on-surface font-bold">${esc(o.codigo)}</h2>
                    <span class="font-label-sm text-label-sm text-on-surface-variant">${esc(o.clienteNombre)} · ${o.canal === 'mostrador' ? 'Mostrador' : 'App'}</span>
                  </div>
                  <div class="bg-secondary-container text-on-secondary-container px-sm py-xs rounded-full flex items-center gap-xs font-label-md text-label-md">
                    <span class="material-symbols-outlined text-[18px]">timer</span>
                    ${tiempoTranscurrido(o)}
                  </div>
                </header>
                <div class="flex-1 bg-surface-container-low rounded p-sm">
                  <ul class="flex flex-col gap-xs font-body-md text-body-md text-on-surface">
                    ${o.items.map((i) => `<li class="flex justify-between border-b border-surface-variant last:border-0 pb-base">${i.cantidad}x ${esc(i.nombre)}</li>`).join('')}
                  </ul>
                </div>
                <footer class="flex gap-sm mt-sm">
                  ${
                    paso
                      ? `<button type="button" data-accion="avanzar-orden" data-valor="${esc(o.id)}|${paso.destino}" class="flex-1 min-h-[44px] bg-primary text-on-primary rounded font-label-md text-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center justify-center">${esc(paso.texto)}</button>`
                      : ''
                  }
                  <button type="button" data-accion="cancelar-orden" data-valor="${esc(o.id)}" class="flex-1 min-h-[44px] border border-outline-variant text-on-surface rounded font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center justify-center">Rechazar</button>
                  <button type="button" data-accion="ir" data-valor="/c/pedido/${esc(o.id)}" class="min-h-[44px] px-sm border border-outline-variant text-on-surface-variant rounded hover:bg-surface-container-high transition-colors flex items-center justify-center" aria-label="Ver detalle">
                    <span class="material-symbols-outlined text-[18px]">visibility</span>
                  </button>
                </footer>
              </article>`;
            })
            .join('')}
        </div>`
  }
</main>`;

  return `<div class="min-h-screen flex flex-col pb-[86px]">${cuerpo}${barraOperador('/c/pedidos')}</div>`;
}

export const pedidosStitch: Render = (): Pagina => {
  const u = sesion.usuario()!;
  const contenido = u.rol === 'comercio.operador' ? pedidosCola() : pedidosKanban();
  return { titulo: 'Pedidos', standalone: true, contenido };
};

export const detallePedidoStitch: Render = (ctx): Pagina => {
  const e = store.leer();
  const o = e.ordenes.find((x) => x.id === ctx.params.ordenId);
  if (!o) return error404(ctx);
  const u = sesion.usuario()!;
  // Sin esto, escribir la URL del pedido de otro comercio lo abría entero
  // —cliente, artículos, pago— y con los botones de avance funcionando.
  if (!alcanzaOrden(u, o, e)) return error403(ctx);
  const puedeOperar = u.rol !== 'comercio.contador';
  const pagoConfirmado = e.pagos.find((x) => x.ordenId === o.id)?.estado === 'confirmado';
  const yaHayReembolso = e.reembolsos.some((r) => r.ordenId === o.id && r.estado !== 'rechazado');
  const puedeReembolsar = puede(u.rol, 'reembolso:solicitar') && pagoConfirmado && !yaHayReembolso;
  const pago = e.pagos.find((p) => p.ordenId === o.id);
  const paso = SIGUIENTE[o.estado];

  const cuerpo = `
<div class="p-lg lg:p-xl max-w-3xl mx-auto">
  <button type="button" data-accion="ir" data-valor="${o.tipo === 'reserva' ? '/c/reservas' : '/c/pedidos'}" class="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors w-fit mb-md">
    <span class="material-symbols-outlined text-[18px]">arrow_back</span>
    <span class="font-label-sm text-label-sm">Volver</span>
  </button>
  <div class="flex justify-between items-start mb-lg gap-4">
    <div>
      <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">${esc(o.codigo)}</h2>
      <p class="font-body-md text-body-md text-on-surface-variant">${esc(o.clienteNombre)} · ${o.canal === 'mostrador' ? 'Mostrador' : 'Aplicación'}</p>
    </div>
    <span class="px-3 py-1 rounded-full ${TONO_ORDEN[o.estado] === 'exito' ? 'bg-primary-container/10 text-primary-container' : TONO_ORDEN[o.estado] === 'error' ? 'bg-error-container text-error' : 'bg-tertiary-fixed text-on-tertiary-fixed'} font-label-sm text-label-sm shrink-0">${esc(ETIQUETA_ORDEN[o.estado])}</span>
  </div>

  ${
    pago?.estado === 'pendiente_verificacion'
      ? `<div class="bg-error-container/20 border border-error-container rounded-lg p-lg flex gap-md items-start mb-lg">
          <span class="material-symbols-outlined text-error">warning</span>
          <div class="flex-1">
            <p class="font-label-md text-label-md text-on-surface">Pago sin verificar</p>
            <p class="font-body-md text-body-md text-on-surface-variant mt-1">No entregue el pedido hasta confirmar el pago con el banco.</p>
            <button type="button" data-accion="verificar-pago" data-valor="${esc(pago.id)}" class="mt-sm h-touch-target px-4 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-colors">Verificar pago con el banco</button>
          </div>
        </div>`
      : ''
  }

  <div class="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden mb-lg">
    <div class="p-lg border-b border-outline-variant bg-surface"><h3 class="font-headline-md text-headline-md text-on-surface">Artículos</h3></div>
    <div class="divide-y divide-outline-variant">
      ${o.items
        .map(
          (i) => `<div class="p-lg flex justify-between items-start gap-4">
            <div>
              <p class="font-label-md text-label-md text-on-surface">${i.cantidad}x ${esc(i.nombre)}</p>
              ${i.seleccionVariantes.map((v) => `<p class="font-label-sm text-label-sm text-on-surface-variant">${esc(v.nombre)}</p>`).join('')}
              ${i.seleccionModificadores.map((m) => `<p class="font-label-sm text-label-sm text-on-surface-variant">+ ${esc(m.nombre)}</p>`).join('')}
              ${i.notas ? `<p class="font-label-sm text-label-sm text-tertiary mt-1">Nota: ${esc(i.notas)}</p>` : ''}
            </div>
            <span class="font-label-md text-label-md text-on-surface shrink-0">${esc(formatearUsd(i.precioUnitarioUsd * i.cantidad))}</span>
          </div>`,
        )
        .join('')}
    </div>
    <div class="p-lg bg-surface-container-low border-t border-outline-variant space-y-1">
      <div class="flex justify-between font-body-md text-body-md text-on-surface-variant"><span>Subtotal</span><span>${esc(formatearUsd(o.subtotalUsd))}</span></div>
      <div class="flex justify-between font-body-md text-body-md text-on-surface-variant"><span>IVA (16%)</span><span>${esc(formatearUsd(o.impuestosUsd))}</span></div>
      <div class="flex justify-between font-headline-md text-headline-md text-on-surface pt-1"><span>Total</span><span>${esc(formatearUsd(o.totalUsd))} <span class="font-body-md text-body-md text-on-surface-variant">(${esc(formatearVes(o.totalVes))})</span></span></div>
    </div>
  </div>

  <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg mb-lg">
    <h3 class="font-headline-md text-headline-md text-on-surface mb-md">Historial</h3>
    <ul class="space-y-3">
      ${o.historial
        .map(
          (h) => `<li class="flex gap-3">
            <span class="material-symbols-outlined text-primary text-[20px] mt-0.5">check_circle</span>
            <div>
              <p class="font-label-md text-label-md text-on-surface">${esc(ETIQUETA_ORDEN[h.a as keyof typeof ETIQUETA_ORDEN] ?? h.a)}</p>
              <p class="font-label-sm text-label-sm text-on-surface-variant">${esc(fechaHora(h.en))} · ${esc(ROLES[h.porRol]?.nombre ?? h.porRol)}${h.motivo ? ` · ${esc(h.motivo)}` : ''}</p>
            </div>
          </li>`,
        )
        .join('')}
    </ul>
  </div>

  ${
    puedeOperar && (paso || !['entregada', 'cancelada'].includes(o.estado))
      ? `<div class="flex gap-sm">
          ${paso ? `<button type="button" data-accion="avanzar-orden" data-valor="${esc(o.id)}|${paso.destino}" class="flex-1 h-touch-target bg-primary-container text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary transition-colors">${esc(paso.texto)}</button>` : ''}
          ${!['entregada', 'cancelada'].includes(o.estado) ? `<button type="button" data-accion="cancelar-orden" data-valor="${esc(o.id)}" class="h-touch-target px-6 border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors">Cancelar</button>` : ''}
        </div>`
      : ''
  }

  ${
    // Devolver el dinero era imposible: no existía forma de crear un
    // reembolso en ninguna pantalla.
    puedeReembolsar
      ? `<div class="mt-md border-t border-outline-variant pt-md">
          <button type="button" data-accion="solicitar-reembolso" data-valor="${esc(o.id)}" class="h-touch-target px-6 border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors">Solicitar reembolso</button>
          <p class="font-body-md text-body-md text-on-surface-variant text-sm mt-sm">Lo revisa Finanzas de INPARQUES.</p>
        </div>`
      : ''
  }
</div>`;

  return { titulo: o.codigo, standalone: true, contenido: marcoPortalAdmin(o.tipo === 'reserva' ? '/c/reservas' : '/c/pedidos', cuerpo) };
};

// ----------------------------------------------------------------- Reservas

export const reservasStitch: Render = (): Pagina => {
  const lista = misOrdenes()
    .filter((o) => o.tipo === 'reserva')
    .sort((a, b) => (a.programadaPara ?? '').localeCompare(b.programadaPara ?? ''));

  const cuerpo = `
<div class="bg-surface border-b border-outline-variant p-lg">
  <h2 class="font-headline-lg text-headline-lg text-on-surface">Reservas</h2>
  <p class="text-on-surface-variant font-body-md mt-base">Servicios y actividades programadas.</p>
</div>
<div class="p-lg max-w-5xl mx-auto">
  ${
    lista.length === 0
      ? '<p class="font-body-md text-body-md text-on-surface-variant">Sin reservas registradas.</p>'
      : `<div class="grid grid-cols-1 md:grid-cols-2 gap-md">
          ${lista
            .map(
              (o) => `<button type="button" data-accion="ir" data-valor="/c/reserva/${esc(o.id)}" class="text-left bg-surface-container-lowest border border-outline-variant rounded-lg p-lg hover:shadow-md transition-shadow flex flex-col gap-sm">
                <div class="flex justify-between items-start">
                  <div>
                    <span class="font-label-md text-label-md font-bold text-primary">${esc(o.codigo)}</span>
                    <p class="font-body-md text-body-md text-on-surface">${esc(o.clienteNombre)}</p>
                  </div>
                  <span class="px-3 py-1 rounded-full ${TONO_ORDEN[o.estado] === 'exito' ? 'bg-primary-container/10 text-primary-container' : TONO_ORDEN[o.estado] === 'error' ? 'bg-error-container text-error' : 'bg-tertiary-fixed text-on-tertiary-fixed'} font-label-sm text-label-sm">${esc(ETIQUETA_ORDEN[o.estado])}</span>
                </div>
                <p class="font-body-md text-body-md text-on-surface-variant">${esc(resumenItems(o))}</p>
                ${o.programadaPara ? `<p class="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">event</span>${esc(fechaHora(o.programadaPara))}</p>` : ''}
              </button>`,
            )
            .join('')}
        </div>`
  }
</div>`;

  return { titulo: 'Reservas', standalone: true, contenido: marcoPortalAdmin('/c/reservas', cuerpo) };
};

// --------------------------------------------------------------------- Caja

export const cajaStitch: Render = (): Pagina => {
  const e = store.leer();
  const locales = misLocales();
  const turno = e.turnos.find((t) => locales.some((l) => l.id === t.localId) && t.estado === 'abierto');
  const cerrados = e.turnos
    .filter((t) => locales.some((l) => l.id === t.localId) && t.estado === 'cerrado')
    .sort((a, b) => (b.cerradoEn ?? '').localeCompare(a.cerradoEn ?? ''));
  const u = sesion.usuario()!;

  const cuerpo = `
<div class="p-lg max-w-4xl mx-auto space-y-lg">
  <div>
    <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">Caja</h2>
    <p class="font-body-md text-body-md text-on-surface-variant">Ventas de mostrador, turnos y cierres.</p>
  </div>

  ${
    turno
      ? `<div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
          <div class="flex justify-between items-center mb-md">
            <div>
              <p class="font-label-md text-label-md text-on-surface font-bold">Turno abierto</p>
              <p class="font-body-md text-body-md text-on-surface-variant">Desde ${esc(horaCorta(turno.abiertoEn))}</p>
            </div>
            <span class="px-3 py-1 rounded-full bg-primary-container/10 text-primary-container font-label-sm text-label-sm">Abierto</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-md py-sm border-t border-outline-variant">
            <div><p class="font-label-sm text-label-sm text-on-surface-variant">Pago Móvil</p><p class="font-body-md text-body-md text-on-surface">${esc(formatearVes(turno.esperadoPorMetodo.pago_movil))}</p></div>
            <div><p class="font-label-sm text-label-sm text-on-surface-variant">Transferencia</p><p class="font-body-md text-body-md text-on-surface">${esc(formatearVes(turno.esperadoPorMetodo.transferencia))}</p></div>
            <div><p class="font-label-sm text-label-sm text-on-surface-variant">Tarjeta</p><p class="font-body-md text-body-md text-on-surface">${esc(formatearVes(turno.esperadoPorMetodo.tarjeta))}</p></div>
            <div><p class="font-label-sm text-label-sm text-on-surface-variant">Fondo inicial</p><p class="font-body-md text-body-md text-on-surface">${esc(formatearVes(turno.fondoInicialVes))}</p></div>
            <div class="col-span-2 sm:col-span-1"><p class="font-label-sm text-label-sm text-on-surface-variant">Efectivo esperado</p><p class="font-body-md text-body-md text-primary font-bold">${esc(formatearVes(turno.esperadoPorMetodo.efectivo + turno.fondoInicialVes))}</p></div>
          </div>
          <div class="flex gap-sm mt-md">
            <button type="button" data-accion="ir" data-valor="/c/caja/venta-mostrador" class="flex-1 h-touch-target bg-primary-container text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary transition-colors flex items-center justify-center gap-2">
              <span class="material-symbols-outlined">point_of_sale</span>
              Venta de mostrador
            </button>
            ${
              u.rol !== 'comercio.operador'
                ? `<button type="button" data-accion="ir" data-valor="/c/caja/turno/cerrar" class="h-touch-target px-6 border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors">Cerrar turno</button>`
                : ''
            }
          </div>
        </div>`
      : `<div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg text-center">
          <span class="material-symbols-outlined text-[40px] text-outline mb-sm">account_balance_wallet</span>
          <p class="font-label-md text-label-md text-on-surface mb-1">Sin turno abierto</p>
          <p class="font-body-md text-body-md text-on-surface-variant mb-md">Abra un turno para registrar ventas de mostrador y poder cerrar la caja del día.</p>
          <button type="button" data-accion="ir" data-valor="/c/caja/turno/abrir" class="h-touch-target px-6 bg-primary-container text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary transition-colors">Abrir turno</button>
        </div>`
  }

  <div>
    <h3 class="font-headline-md text-headline-md text-on-surface mb-md">Turnos cerrados</h3>
    ${
      cerrados.length === 0
        ? '<p class="font-body-md text-body-md text-on-surface-variant">Todavía no hay cierres registrados.</p>'
        : `<div class="space-y-2">
            ${cerrados
              .map(
                (t) => `<button type="button" data-accion="ir" data-valor="/c/caja/turno/${esc(t.id)}" class="w-full text-left flex items-center justify-between p-md bg-surface-container-lowest border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors">
                  <div>
                    <p class="font-label-md text-label-md text-on-surface">${esc(fechaCorta(t.abiertoEn))}</p>
                    <p class="font-label-sm text-label-sm text-on-surface-variant">Cerrado ${t.cerradoEn ? esc(horaCorta(t.cerradoEn)) : ''}</p>
                  </div>
                  <span class="px-3 py-1 rounded-full ${t.diferenciaVes === 0 ? 'bg-primary-container/10 text-primary-container' : 'bg-tertiary-fixed text-on-tertiary-fixed'} font-label-sm text-label-sm">${t.diferenciaVes === 0 ? 'Sin diferencia' : `Dif. ${esc(formatearVes(t.diferenciaVes ?? 0))}`}</span>
                </button>`,
              )
              .join('')}
          </div>`
    }
  </div>

  <p class="font-label-sm text-label-sm text-on-surface-variant text-center">Las ventas de mostrador entran en la misma caja, el mismo cierre y los mismos reportes que las ventas de la aplicación.</p>
</div>`;

  return { titulo: 'Caja', standalone: true, contenido: marcoPortalAdmin('/c/caja', cuerpo) };
};

export const ventaMostradorStitch: Render = (): Pagina => {
  const e = store.leer();
  const locales = misLocales();
  const turno = e.turnos.find((t) => locales.some((l) => l.id === t.localId) && t.estado === 'abierto');

  if (!turno) {
    const cuerpo = `
<div class="p-lg max-w-2xl mx-auto text-center">
  <span class="material-symbols-outlined text-[40px] text-outline mb-sm">account_balance_wallet</span>
  <p class="font-label-md text-label-md text-on-surface mb-1">Necesita un turno abierto</p>
  <p class="font-body-md text-body-md text-on-surface-variant mb-md">Toda venta de mostrador debe quedar dentro de un turno para poder cuadrar la caja.</p>
  <button type="button" data-accion="ir" data-valor="/c/caja/turno/abrir" class="h-touch-target px-6 bg-primary-container text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary transition-colors">Abrir turno</button>
</div>`;
    return { titulo: 'Venta de mostrador', standalone: true, contenido: marcoPortalAdmin('/c/caja', cuerpo) };
  }

  const arts = e.articulos.filter((a) => a.localId === turno.localId && a.disponible && a.tipo !== 'servicio');
  const sel: Record<string, number> = {};
  for (const [k, v] of Object.entries(estadoUi.seleccion)) {
    if (k.startsWith('mostrador-')) sel[k.replace('mostrador-', '')] = Number(v);
  }
  const metodo = filtro('metodo-mostrador', 'efectivo');
  const total = Object.entries(sel).reduce((s, [id, n]) => {
    const a = arts.find((x) => x.id === id);
    return s + (a ? a.precioUsd * n : 0);
  }, 0);
  const iva = Math.round(total * 0.16 * 100) / 100;
  const totalConIva = Math.round((total + iva) * 100) / 100;
  const metodos: Array<[string, string, string]> = [
    ['efectivo', 'payments', 'Efectivo'],
    ['pago_movil', 'phone_iphone', 'Pago Móvil'],
    ['tarjeta', 'credit_card', 'Tarjeta'],
  ];

  const cuerpo = `
<div class="flex flex-col lg:flex-row h-full">
  <section class="flex-1 flex flex-col p-lg lg:border-r border-outline-variant">
    <h2 class="font-headline-md text-headline-md text-on-surface mb-md">Artículos disponibles</h2>
    ${
      arts.length === 0
        ? '<p class="font-body-md text-body-md text-on-surface-variant">Sin artículos disponibles en este local.</p>'
        : `<div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
            ${arts
              .map((a) => {
                const n = sel[a.id] ?? 0;
                return `<div class="bg-surface-container-lowest border ${n > 0 ? 'border-primary' : 'border-outline-variant'} rounded-lg p-sm flex flex-col">
                  <div class="w-full h-24 bg-surface-variant rounded-md mb-sm flex items-center justify-center">
                    <span class="material-symbols-outlined text-3xl text-on-surface-variant">local_mall</span>
                  </div>
                  <h3 class="font-label-md text-on-surface truncate">${esc(a.nombre)}</h3>
                  <p class="font-body-md text-primary font-bold mt-auto mb-sm">${esc(formatearUsd(a.precioUsd))}</p>
                  <div class="flex items-center justify-center gap-xs">
                    <button type="button" data-accion="mostrador-menos" data-valor="${esc(a.id)}" class="w-8 h-8 flex items-center justify-center rounded-full bg-surface-variant text-on-surface hover:bg-outline-variant transition-colors" ${n <= 0 ? 'disabled' : ''}>
                      <span class="material-symbols-outlined text-sm">remove</span>
                    </button>
                    <span class="font-label-md w-5 text-center">${n}</span>
                    <button type="button" data-accion="mostrador-mas" data-valor="${esc(a.id)}" class="w-8 h-8 flex items-center justify-center rounded-full bg-surface-variant text-on-surface hover:bg-outline-variant transition-colors">
                      <span class="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                </div>`;
              })
              .join('')}
          </div>`
    }
  </section>
  <section class="w-full lg:w-96 bg-surface-container-lowest flex flex-col shrink-0 border-t lg:border-t-0 border-outline-variant">
    <div class="p-lg border-b border-outline-variant bg-surface"><h2 class="font-headline-md text-on-surface">Carrito actual</h2></div>
    <div class="flex-1 p-md flex flex-col gap-sm">
      ${
        Object.keys(sel).length === 0
          ? '<p class="font-body-md text-body-md text-on-surface-variant p-sm">Sin artículos seleccionados.</p>'
          : Object.entries(sel)
              .map(([id, n]) => {
                const a = arts.find((x) => x.id === id);
                if (!a) return '';
                return `<div class="flex items-center justify-between p-sm rounded-lg bg-surface border border-outline-variant">
                  <div class="flex-1"><h4 class="font-label-md text-on-surface">${esc(a.nombre)}</h4><p class="font-body-md text-on-surface-variant text-sm">${esc(formatearUsd(a.precioUsd))} c/u</p></div>
                  <span class="font-label-md w-6 text-center">${n}</span>
                  <div class="w-16 text-right font-label-md text-primary">${esc(formatearUsd(a.precioUsd * n))}</div>
                </div>`;
              })
              .join('')
      }
    </div>
    <div class="p-lg bg-surface-container-low border-t border-outline-variant mt-auto">
      <div class="flex justify-between items-center mb-xs"><span class="font-body-md text-on-surface-variant">Subtotal</span><span class="font-body-md text-on-surface">${esc(formatearUsd(total))}</span></div>
      <div class="flex justify-between items-center mb-sm"><span class="font-body-md text-on-surface-variant">Impuestos (16%)</span><span class="font-body-md text-on-surface">${esc(formatearUsd(iva))}</span></div>
      <div class="flex justify-between items-center mb-lg border-t border-outline-variant pt-sm">
        <span class="font-headline-md text-on-surface font-bold">Total</span>
        <span class="font-headline-md text-primary font-bold">${esc(formatearUsd(totalConIva))}</span>
      </div>
      <p class="font-label-sm text-on-surface-variant mb-xs uppercase tracking-wider">Método de pago</p>
      <div class="grid grid-cols-3 gap-xs mb-lg">
        ${metodos
          .map(
            ([valor, icono, nombre]) => `<label class="h-touch-target rounded-lg border ${metodo === valor ? 'border-primary bg-primary-container/10 ring-1 ring-primary' : 'border-outline-variant bg-surface hover:bg-surface-variant'} flex flex-col items-center justify-center transition-all cursor-pointer">
              <input class="sr-only" name="metodo-mostrador" type="radio" value="${valor}" data-accion="filtro-metodo-mostrador" data-valor="${valor}" ${metodo === valor ? 'checked' : ''}>
              <span class="material-symbols-outlined ${metodo === valor ? 'text-primary' : 'text-on-surface'} mb-1 text-sm">${icono}</span>
              <span class="font-label-sm ${metodo === valor ? 'text-primary font-bold' : 'text-on-surface'}">${nombre}</span>
            </label>`,
          )
          .join('')}
      </div>
      <div id="error-mostrador"></div>
      <button type="button" data-accion="registrar-mostrador" data-valor="${esc(turno.localId)}" ${total === 0 ? 'disabled' : ''} class="w-full h-touch-target bg-primary-container text-on-primary rounded-lg font-label-md flex items-center justify-center gap-sm hover:opacity-90 transition-all shadow-sm disabled:opacity-50">
        <span class="material-symbols-outlined">point_of_sale</span>
        Registrar venta
      </button>
    </div>
  </section>
</div>`;

  return { titulo: 'Venta de mostrador', standalone: true, contenido: marcoPortalAdmin('/c/caja', cuerpo) };
};

export const abrirTurnoStitch: Render = (): Pagina => {
  const locales = misLocales();

  const cuerpo = `
<div class="p-lg max-w-xl mx-auto">
  <button type="button" data-accion="ir" data-valor="/c/caja" class="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors w-fit mb-md">
    <span class="material-symbols-outlined text-[18px]">arrow_back</span>
    <span class="font-label-sm text-label-sm">Volver a caja</span>
  </button>
  <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">Apertura de caja</h2>
  <p class="font-body-md text-body-md text-on-surface-variant mb-lg">Declare el fondo inicial para poder cuadrar al cierre.</p>

  <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg space-y-lg">
    ${
      locales.length > 1
        ? `<div>
            <span class="block font-label-md text-label-md text-on-surface mb-2">Local</span>
            <div class="space-y-2">
              ${locales
                .map(
                  (l, i) => `<label class="flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low cursor-pointer transition-colors">
                    <input name="local" type="radio" value="${esc(l.id)}" ${i === 0 ? 'checked' : ''}>
                    <span class="font-label-md text-label-md text-on-surface">${esc(l.nombre)}</span>
                  </label>`,
                )
                .join('')}
            </div>
          </div>`
        : `<input name="local" type="hidden" value="${esc(locales[0]?.id ?? '')}">`
    }
    <div>
      <label class="block font-label-md text-label-md text-on-surface mb-2" for="fondo">Fondo inicial en bolívares</label>
      <input class="w-full h-touch-target px-4 rounded border border-outline-variant bg-surface focus:border-2 focus:border-primary focus:outline-none font-body-md text-body-md" id="fondo" inputmode="decimal" name="fondo" type="text" value="500">
    </div>
    <div id="error-abrir-turno"></div>
    <button type="button" data-accion="confirmar-abrir-turno" class="w-full h-touch-target bg-primary-container text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary transition-colors flex items-center justify-center gap-2">
      <span class="material-symbols-outlined">play_arrow</span>
      Abrir turno
    </button>
  </div>
</div>`;

  return { titulo: 'Abrir turno', standalone: true, contenido: marcoPortalAdmin('/c/caja', cuerpo) };
};

export const cerrarTurnoStitch: Render = (): Pagina => {
  const e = store.leer();
  const locales = misLocales();
  const turno = e.turnos.find((t) => locales.some((l) => l.id === t.localId) && t.estado === 'abierto');

  if (!turno) {
    const cuerpo = `<div class="p-lg max-w-xl mx-auto text-center">
      <span class="material-symbols-outlined text-[40px] text-outline mb-sm">account_balance_wallet</span>
      <p class="font-body-md text-body-md text-on-surface-variant">Debe existir un turno abierto para poder cerrarlo.</p>
    </div>`;
    return { titulo: 'Cerrar turno', standalone: true, contenido: marcoPortalAdmin('/c/caja', cuerpo) };
  }

  const esperado = turno.esperadoPorMetodo.efectivo + turno.fondoInicialVes;

  const cuerpo = `
<div class="p-lg max-w-xl mx-auto">
  <button type="button" data-accion="ir" data-valor="/c/caja" class="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors w-fit mb-md">
    <span class="material-symbols-outlined text-[18px]">arrow_back</span>
    <span class="font-label-sm text-label-sm">Volver a caja</span>
  </button>
  <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">Cierre de caja</h2>
  <p class="font-body-md text-body-md text-on-surface-variant mb-lg">El cierre es inmutable: una vez confirmado solo se corrige con un ajuste autorizado.</p>

  <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg mb-lg space-y-2">
    <h3 class="font-label-md text-label-md text-on-surface mb-2">Ventas esperadas por método</h3>
    <div class="flex justify-between font-body-md text-body-md"><span class="text-on-surface-variant">Pago Móvil</span><span class="text-on-surface">${esc(formatearVes(turno.esperadoPorMetodo.pago_movil))}</span></div>
    <div class="flex justify-between font-body-md text-body-md"><span class="text-on-surface-variant">Transferencia</span><span class="text-on-surface">${esc(formatearVes(turno.esperadoPorMetodo.transferencia))}</span></div>
    <div class="flex justify-between font-body-md text-body-md"><span class="text-on-surface-variant">Tarjeta</span><span class="text-on-surface">${esc(formatearVes(turno.esperadoPorMetodo.tarjeta))}</span></div>
    <div class="flex justify-between font-body-md text-body-md"><span class="text-on-surface-variant">Efectivo por ventas</span><span class="text-on-surface">${esc(formatearVes(turno.esperadoPorMetodo.efectivo))}</span></div>
    <div class="flex justify-between font-body-md text-body-md"><span class="text-on-surface-variant">Fondo inicial</span><span class="text-on-surface">${esc(formatearVes(turno.fondoInicialVes))}</span></div>
    <div class="flex justify-between font-label-md text-label-md pt-2 border-t border-outline-variant"><span class="text-on-surface">Efectivo esperado</span><span class="text-primary font-bold">${esc(formatearVes(esperado))}</span></div>
  </div>

  <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg space-y-lg">
    <div>
      <label class="block font-label-md text-label-md text-on-surface mb-2" for="declarado">Efectivo contado en caja</label>
      <input class="w-full h-touch-target px-4 rounded border border-outline-variant bg-surface focus:border-2 focus:border-primary focus:outline-none font-body-md text-body-md" id="declarado" inputmode="decimal" name="declarado" type="text" value="${esc(String(esperado))}">
      <p class="font-label-sm text-label-sm text-on-surface-variant mt-1">Cuente el efectivo físico e introdúzcalo aquí.</p>
    </div>
    <div>
      <label class="block font-label-md text-label-md text-on-surface mb-2" for="motivo">Observaciones del cierre</label>
      <textarea class="w-full min-h-[88px] p-4 rounded border border-outline-variant bg-surface focus:border-2 focus:border-primary focus:outline-none font-body-md text-body-md" id="motivo" name="motivo" placeholder="Cierre normal de jornada…"></textarea>
    </div>
    <div id="error-cerrar-turno"></div>
    <div class="bg-tertiary-fixed/40 p-4 rounded-lg flex items-start gap-3">
      <span class="material-symbols-outlined text-tertiary">warning</span>
      <p class="font-body-md text-body-md text-on-surface">El cierre queda registrado en la bitácora con responsable, diferencia y motivo.</p>
    </div>
    <button type="button" data-accion="confirmar-cerrar-turno" data-valor="${esc(turno.id)}" class="w-full h-touch-target bg-primary-container text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary transition-colors flex items-center justify-center gap-2">
      <span class="material-symbols-outlined">lock</span>
      Confirmar cierre
    </button>
  </div>
</div>`;

  return { titulo: 'Cerrar turno', standalone: true, contenido: marcoPortalAdmin('/c/caja', cuerpo) };
};

export const detalleTurnoStitch: Render = (ctx): Pagina => {
  const e = store.leer();
  const t = e.turnos.find((x) => x.id === ctx.params.turnoId);
  if (!t) return error404(ctx);
  const ventas = e.ordenes.filter((o) => o.localId === t.localId && o.creadaEn >= t.abiertoEn && (!t.cerradoEn || o.creadaEn <= t.cerradoEn));

  const cuerpo = `
<div class="p-lg max-w-3xl mx-auto">
  <button type="button" data-accion="ir" data-valor="/c/caja" class="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors w-fit mb-md">
    <span class="material-symbols-outlined text-[18px]">arrow_back</span>
    <span class="font-label-sm text-label-sm">Volver a caja</span>
  </button>
  <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-lg">Turno ${esc(fechaCorta(t.abiertoEn))}</h2>

  ${
    t.estado === 'cerrado'
      ? `<div class="bg-surface-container-low border border-outline-variant rounded-lg p-lg flex gap-md items-start mb-lg">
          <span class="material-symbols-outlined text-tertiary">lock</span>
          <p class="font-body-md text-body-md text-on-surface-variant">Este turno está cerrado. No puede editarse ni borrarse: las correcciones se hacen con un ajuste que deja trazabilidad.</p>
        </div>`
      : ''
  }

  <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg grid grid-cols-1 sm:grid-cols-2 gap-6 mb-lg">
    <div class="flex flex-col gap-1"><span class="font-label-sm text-label-sm text-outline">Estado</span><span class="font-body-md text-body-md text-on-surface capitalize">${esc(t.estado)}</span></div>
    <div class="flex flex-col gap-1"><span class="font-label-sm text-label-sm text-outline">Apertura</span><span class="font-body-md text-body-md text-on-surface">${esc(fechaHora(t.abiertoEn))}</span></div>
    ${t.cerradoEn ? `<div class="flex flex-col gap-1"><span class="font-label-sm text-label-sm text-outline">Cierre</span><span class="font-body-md text-body-md text-on-surface">${esc(fechaHora(t.cerradoEn))}</span></div>` : ''}
    <div class="flex flex-col gap-1"><span class="font-label-sm text-label-sm text-outline">Fondo inicial</span><span class="font-body-md text-body-md text-on-surface">${esc(formatearVes(t.fondoInicialVes))}</span></div>
    <div class="flex flex-col gap-1"><span class="font-label-sm text-label-sm text-outline">Efectivo esperado</span><span class="font-body-md text-body-md text-on-surface">${esc(formatearVes(t.esperadoPorMetodo.efectivo + t.fondoInicialVes))}</span></div>
    ${t.efectivoDeclaradoVes !== undefined ? `<div class="flex flex-col gap-1"><span class="font-label-sm text-label-sm text-outline">Efectivo declarado</span><span class="font-body-md text-body-md text-on-surface">${esc(formatearVes(t.efectivoDeclaradoVes))}</span></div>` : ''}
    ${t.diferenciaVes !== undefined ? `<div class="flex flex-col gap-1"><span class="font-label-sm text-label-sm text-outline">Diferencia</span><span class="font-body-md text-body-md ${t.diferenciaVes === 0 ? 'text-primary' : 'text-error'}">${esc(formatearVes(t.diferenciaVes))}</span></div>` : ''}
    ${t.responsableCierreId ? `<div class="flex flex-col gap-1"><span class="font-label-sm text-label-sm text-outline">Responsable</span><span class="font-body-md text-body-md text-on-surface">${esc(e.usuarios.find((u) => u.id === t.responsableCierreId)?.nombre ?? '—')}</span></div>` : ''}
  </div>

  <div class="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
    <div class="p-lg border-b border-outline-variant bg-surface"><h3 class="font-headline-md text-headline-md text-on-surface">Ventas del turno (${ventas.length})</h3></div>
    ${
      ventas.length === 0
        ? '<p class="p-lg font-body-md text-body-md text-on-surface-variant">Sin ventas registradas en este turno.</p>'
        : `<div class="divide-y divide-outline-variant">
            ${ventas
              .map(
                (o) => `<button type="button" data-accion="ir" data-valor="/c/pedido/${esc(o.id)}" class="w-full text-left flex items-center justify-between p-lg hover:bg-surface-container-lowest transition-colors">
                  <div><span class="font-label-md text-label-md text-on-surface font-mono">${esc(o.codigo)}</span><span class="font-label-sm text-label-sm text-on-surface-variant ml-2">${o.canal === 'mostrador' ? 'Mostrador' : 'App'}</span></div>
                  <span class="font-label-md text-label-md text-on-surface">${esc(formatearUsd(o.totalUsd))}</span>
                </button>`,
              )
              .join('')}
          </div>`
    }
  </div>
</div>`;

  return { titulo: `Turno ${fechaCorta(t.abiertoEn)}`, standalone: true, contenido: marcoPortalAdmin('/c/caja', cuerpo) };
};
