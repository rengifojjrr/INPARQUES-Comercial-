/**
 * Finanzas del comercio, portadas del HTML real de Stitch.
 *
 * Fuentes (todas del portal "Park Commerce Finance" / "Finance Portal",
 * que es la identidad de `comercio.contador`):
 * - `50/canon_comisiones_y_estado_de_cuenta` → estado de cuenta
 *   (`c.estado_cuenta`) y solicitudes de ajuste (`c.ajustes`).
 * - `50/centro_de_conciliaci_n_bancaria` → conciliación (`c.conciliacion`).
 * - `50/gesti_n_de_facturas_y_notas_fiscales` → facturas (`c.facturas`,
 *   `c.factura`).
 * - `50/centro_de_exportaciones_de_datos` → exportaciones
 *   (`c.exportaciones`).
 * - `50/p_gina_2_libro_transaccional_de_ventas` → reportes (`c.reportes`) y
 *   comprobantes (`c.comprobantes`).
 *
 * La barra lateral de esas páginas está en inglés en el original (Summary,
 * Sales Books, Payments, Reconciliation, Invoices, Daily Closings,
 * Commissions, Export Manager, Support) y se conserva tal cual: es el
 * rótulo real del portal del contador, no una traducción pendiente. El
 * contenido del lienzo sí está en español en el original.
 *
 * Estas rutas también las abren `comercio.propietario` y (algunas)
 * `comercio.admin_local`. Cuando el rol no es contador se dibuja la barra
 * lateral de su propio portal, igual que en el resto de la fase 2.
 */

import { esc } from '../componentes';
import { avatar, barraLateral, barraLateralAdminLocal, barraLateralContador, barraSuperior } from './stitch-comercio';
import { conCajonMovil } from '../stitch-shell';
import type { Pagina, Render } from './tipos';
import { store } from '../../data/store';
import { sesion } from '../../app/session';
import { filtro } from '../estado-ui';
import { ETIQUETA_PAGO, TONO_PAGO, ETIQUETA_LIQUIDACION } from '../../domain/state-machines';
import { formatearUsd, formatearVes, calcularParticipacion } from '../../domain/money';
import { fechaCorta, fechaHora, desde } from '../formato';
import { error404 } from './compartidas';
import type { Local, Orden } from '../../domain/types';

function misLocales(): Local[] {
  const u = sesion.usuario();
  const e = store.leer();
  if (!u) return [];
  if (u.scope.level === 'local') return e.locales.filter((l) => u.scope.ids.includes(l.id));
  if (u.scope.level === 'negocio') return e.locales.filter((l) => u.scope.ids.includes(l.negocioId));
  return [];
}

function miNegocioId(): string | null {
  const u = sesion.usuario();
  if (!u) return null;
  if (u.scope.level === 'negocio') return u.scope.ids[0];
  return misLocales()[0]?.negocioId ?? null;
}

function misOrdenes(): Orden[] {
  const ids = misLocales().map((l) => l.id);
  return store.leer().ordenes.filter((o) => ids.includes(o.localId));
}

/**
 * El portal financiero de Stitch tiene barra lateral propia (Finance
 * Portal) y su propia barra superior. Pero estas rutas también las abren el
 * propietario y el administrador de local desde sus propios paneles, y cada
 * uno tiene en Stitch una barra lateral distinta. Se dibuja la que le
 * corresponde a cada rol en vez de imponer una sola: el lienzo es el mismo,
 * el portal que lo enmarca no.
 */
function marcoFinanzas(activo: string, cuerpo: string): string {
  const u = sesion.usuario()!;

  if (u.rol === 'comercio.propietario') {
    return `
${conCajonMovil(barraLateral('/c/estado-cuenta'))}
${barraSuperior(u.nombre)}
<main class="lg:ml-64 pt-16 min-h-screen bg-surface-container-lowest">${cuerpo}</main>`;
  }

  if (u.rol !== 'comercio.contador') {
    // Administrador de local y operador: portal "Portal Admin", cuya
    // entrada de Ventas apunta justamente a /c/reportes.
    return `
${conCajonMovil(barraLateralAdminLocal('/c/reportes'), false)}
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

  return `
${conCajonMovil(barraLateralContador(activo), false)}
<div class="flex-1 flex flex-col md:ml-64 min-h-screen">
  <header class="flex justify-between items-center pl-3 pr-lg h-[64px] sticky top-0 z-40 bg-surface border-b border-outline-variant gap-sm">
    <div class="flex items-center gap-xs min-w-0">
      <button type="button" data-accion="abrir-cajon" aria-label="Abrir menú" class="md:hidden shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant">
        <span class="material-symbols-outlined">menu</span>
      </button>
      <span class="font-headline-md text-headline-md font-bold text-primary truncate">Park Commerce Finance</span>
    </div>
    <div class="flex items-center gap-md">
      <button type="button" data-accion="ir" data-valor="/notificaciones" class="w-[44px] h-[44px] flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
        <span class="material-symbols-outlined">notifications</span>
      </button>
      <button type="button" data-accion="ir" data-valor="/perfil">${avatar(u.nombre, 'w-10 h-10 text-[13px]')}</button>
    </div>
  </header>
  <main class="flex-1 bg-background">${cuerpo}</main>
</div>`;
}

function chip(clave: string, valor: string, texto: string, activo: string): string {
  return `<button type="button" data-accion="filtro-${esc(clave)}" data-valor="${esc(valor)}" class="h-touch-target px-md rounded-full font-label-md text-label-md whitespace-nowrap transition-colors ${
    valor === activo ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface hover:bg-surface-variant'
  }">${esc(texto)}</button>`;
}

function encabezado(titulo: string, bajada: string, acciones = ''): string {
  return `
<div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-md mb-xl">
  <div>
    <h2 class="text-headline-lg font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">${esc(titulo)}</h2>
    <p class="text-body-md font-body-md text-on-surface-variant mt-2 max-w-2xl">${esc(bajada)}</p>
  </div>
  ${acciones ? `<div class="flex gap-md shrink-0">${acciones}</div>` : ''}
</div>`;
}

const BOTON_CSV = `<button type="button" data-accion="exportar-csv" data-valor="ventas" class="h-touch-target px-md flex items-center gap-sm border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-variant transition-colors bg-surface-container-lowest shadow-sm">
  <span class="material-symbols-outlined text-[20px]">download</span>
  Exportar CSV
</button>`;

const BOTON_IMPRIMIR = `<button type="button" data-accion="imprimir" class="h-touch-target px-md flex items-center gap-sm bg-primary-container text-on-primary font-label-md text-label-md rounded-lg hover:opacity-90 transition-opacity shadow-sm">
  <span class="material-symbols-outlined text-[20px]">print</span>
  Vista imprimible
</button>`;

/** Tarjeta de dato grande, el patrón "Reglas Económicas" del original. */
function tarjetaRegla(rotulo: string, valor: string, nota: string, icono: string): string {
  return `
<div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm flex flex-col gap-sm relative overflow-hidden">
  <div class="absolute top-0 right-0 p-lg opacity-10 pointer-events-none">
    <span class="material-symbols-outlined text-[64px]">${icono}</span>
  </div>
  <span class="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider relative z-10">${esc(rotulo)}</span>
  <div class="text-display-lg font-display-lg text-primary mt-auto relative z-10">${esc(valor)}</div>
  <p class="text-label-md font-label-md text-on-surface-variant relative z-10">${esc(nota)}</p>
</div>`;
}

/** Tarjeta de métrica compacta, el patrón "Resumen del Periodo". */
function tarjetaMetrica(rotulo: string, valor: string, icono: string, tono = 'text-on-surface'): string {
  return `
<div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-md shadow-sm">
  <div class="flex items-center gap-xs ${tono} mb-sm">
    <span class="material-symbols-outlined text-[16px]">${icono}</span>
    <span class="text-label-sm font-label-sm uppercase">${esc(rotulo)}</span>
  </div>
  <div class="text-headline-md font-headline-md ${tono}">${esc(valor)}</div>
</div>`;
}

function envoltorioTabla(titulo: string, nota: string, cabeceras: string[], filas: string): string {
  return `
<section class="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden">
  <div class="px-lg py-md border-b border-outline-variant bg-surface-container-low flex flex-wrap gap-2 justify-between items-center">
    <h4 class="text-body-lg font-body-lg font-bold text-on-surface">${esc(titulo)}</h4>
    <span class="text-label-md font-label-md text-on-surface-variant">${esc(nota)}</span>
  </div>
  <div class="overflow-x-auto">
    ${
      filas
        ? `<table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-outline-variant bg-surface-container-lowest text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                ${cabeceras.map((c, i) => `<th class="py-sm px-lg font-semibold ${i === cabeceras.length - 1 ? 'text-right' : ''}">${esc(c)}</th>`).join('')}
              </tr>
            </thead>
            <tbody class="text-body-md font-body-md text-on-surface divide-y divide-outline-variant">${filas}</tbody>
          </table>`
        : '<p class="p-lg font-body-md text-body-md text-on-surface-variant">Sin registros para este filtro.</p>'
    }
  </div>
</section>`;
}

// ----------------------------------------------------------------- Reportes

export const reportesStitch: Render = (): Pagina => {
  const e = store.leer();
  const ordenes = misOrdenes().filter((o) => o.estado === 'entregada');
  const f = filtro('reportes', 'mes');
  const desdeFecha =
    f === 'hoy'
      ? new Date().toISOString().slice(0, 10)
      : f === 'semana'
        ? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
        : new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const lista = ordenes.filter((o) => o.creadaEn.slice(0, 10) >= desdeFecha);

  const app = lista.filter((o) => o.canal === 'app');
  const mostrador = lista.filter((o) => o.canal === 'mostrador');
  const total = lista.reduce((s, o) => s + o.totalUsd, 0);
  const ticket = lista.length ? total / lista.length : 0;

  const porMetodo = new Map<string, number>();
  for (const o of lista) {
    const p = e.pagos.find((x) => x.ordenId === o.id);
    if (p) porMetodo.set(p.metodo, (porMetodo.get(p.metodo) ?? 0) + o.totalUsd);
  }

  const filas = lista
    .map(
      (o) => `<tr class="hover:bg-surface-container-low transition-colors cursor-pointer" data-accion="ir" data-valor="/c/pedido/${esc(o.id)}">
        <td class="py-md px-lg">${esc(fechaCorta(o.creadaEn))}</td>
        <td class="py-md px-lg">
          <div class="font-semibold text-primary font-mono">${esc(o.codigo)}</div>
          <div class="text-label-sm font-label-sm text-on-surface-variant">${esc(o.clienteNombre)}</div>
        </td>
        <td class="py-md px-lg">${o.canal === 'mostrador' ? 'Mostrador' : 'Aplicación'}</td>
        <td class="py-md px-lg text-right font-medium">${esc(formatearUsd(o.totalUsd))}</td>
      </tr>`,
    )
    .join('');

  const cuerpo = `
<div class="p-lg flex flex-col gap-xl">
  ${encabezado('Libro transaccional de ventas', 'Ventas entregadas del periodo, con su canal y su método de cobro.', BOTON_CSV + BOTON_IMPRIMIR)}

  <div class="flex gap-sm overflow-x-auto pb-1">
    ${chip('reportes', 'hoy', 'Hoy', f)}
    ${chip('reportes', 'semana', '7 días', f)}
    ${chip('reportes', 'mes', '30 días', f)}
  </div>

  <div class="grid grid-cols-2 md:grid-cols-4 gap-lg">
    ${tarjetaMetrica('Ventas', formatearUsd(total), 'payments', 'text-primary')}
    ${tarjetaMetrica('Pedidos', String(lista.length), 'receipt_long')}
    ${tarjetaMetrica('Ticket promedio', formatearUsd(ticket), 'monitoring')}
    ${tarjetaMetrica('De mostrador', String(mostrador.length), 'point_of_sale', 'text-secondary')}
  </div>

  <section>
    <h3 class="text-headline-md font-headline-md text-on-surface mb-md">Canal y método de cobro</h3>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-lg">
      ${tarjetaRegla('Aplicación', formatearUsd(app.reduce((s, o) => s + o.totalUsd, 0)), `${app.length} pedidos por la PWA del visitante.`, 'smartphone')}
      ${tarjetaRegla('Mostrador', formatearUsd(mostrador.reduce((s, o) => s + o.totalUsd, 0)), `${mostrador.length} ventas registradas en caja.`, 'storefront')}
      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm flex flex-col gap-sm">
        <span class="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Por método de pago</span>
        ${
          porMetodo.size === 0
            ? '<p class="font-body-md text-body-md text-on-surface-variant">Sin ventas en el periodo.</p>'
            : [...porMetodo.entries()]
                .map(
                  ([m, v]) => `<div class="flex justify-between font-body-md text-body-md">
                    <span class="text-on-surface-variant capitalize">${esc(m.replace('_', ' '))}</span>
                    <span class="text-on-surface font-medium">${esc(formatearUsd(v))}</span>
                  </div>`,
                )
                .join('')
        }
      </div>
    </div>
  </section>

  ${envoltorioTabla('Detalle de transacciones', `${lista.length} registro${lista.length === 1 ? '' : 's'}`, ['Fecha', 'Descripción / ID', 'Canal', 'Monto'], filas)}
</div>`;

  return { titulo: 'Reportes', standalone: true, contenido: marcoFinanzas('/c/reportes', cuerpo) };
};

// ------------------------------------------------------------- Conciliación

export const conciliacionStitch: Render = (): Pagina => {
  const e = store.leer();
  const ordenes = misOrdenes();
  const pagos = e.pagos.filter((p) => ordenes.some((o) => o.id === p.ordenId));
  const f = filtro('conciliacion', 'todos');
  let lista = pagos;
  if (f === 'pendientes') lista = pagos.filter((p) => p.estado === 'pendiente_verificacion');
  if (f === 'confirmados') lista = pagos.filter((p) => p.estado === 'confirmado');
  if (f === 'incidencias') lista = pagos.filter((p) => ['fallido', 'revertido', 'reembolsado'].includes(p.estado));

  const pendientes = pagos.filter((p) => p.estado === 'pendiente_verificacion');
  const confirmados = pagos.filter((p) => p.estado === 'confirmado');

  const filas = lista
    .map((p) => {
      const o = ordenes.find((x) => x.id === p.ordenId);
      const tono = TONO_PAGO[p.estado];
      return `<tr class="hover:bg-surface-container-low transition-colors cursor-pointer" data-accion="ir" data-valor="/c/pedido/${esc(p.ordenId)}">
        <td class="py-md px-lg">
          <div class="font-semibold text-primary font-mono">${esc(o?.codigo ?? '—')}</div>
          <div class="text-label-sm font-label-sm text-on-surface-variant">Referencia: ${esc(p.referencia ?? '—')}</div>
        </td>
        <td class="py-md px-lg capitalize">${esc(p.metodo.replace('_', ' '))}</td>
        <td class="py-md px-lg">
          <span class="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            tono === 'exito' ? 'bg-secondary-container text-on-secondary-container' : tono === 'error' ? 'bg-error-container text-on-error-container' : 'bg-surface-variant text-on-surface-variant'
          }">${esc(ETIQUETA_PAGO[p.estado])}</span>
        </td>
        <td class="py-md px-lg text-right font-medium">${esc(formatearVes(p.montoVes))}</td>
      </tr>`;
    })
    .join('');

  const cuerpo = `
<div class="p-lg flex flex-col gap-xl">
  ${encabezado('Centro de conciliación bancaria', 'La conciliación mira el pago, no la orden: una orden entregada puede tener un pago aún sin verificar.', BOTON_CSV)}

  <div class="grid grid-cols-2 md:grid-cols-3 gap-lg">
    ${tarjetaMetrica('Pendientes de verificar', String(pendientes.length), 'pending_actions', pendientes.length ? 'text-error' : 'text-on-surface')}
    ${tarjetaMetrica('Confirmados', String(confirmados.length), 'task_alt', 'text-primary')}
    ${tarjetaMetrica('Total conciliado', formatearVes(confirmados.reduce((s, p) => s + p.montoVes, 0)), 'account_balance', 'text-secondary')}
  </div>

  <div class="flex gap-sm overflow-x-auto pb-1">
    ${chip('conciliacion', 'todos', `Todos (${pagos.length})`, f)}
    ${chip('conciliacion', 'pendientes', `Pendientes (${pendientes.length})`, f)}
    ${chip('conciliacion', 'confirmados', 'Confirmados', f)}
    ${chip('conciliacion', 'incidencias', 'Incidencias', f)}
  </div>

  ${envoltorioTabla('Movimientos', `${lista.length} de ${pagos.length} pagos`, ['Orden / Referencia', 'Método', 'Estado', 'Monto'], filas)}
</div>`;

  return { titulo: 'Conciliación', standalone: true, contenido: marcoFinanzas('/c/conciliacion', cuerpo) };
};

// ----------------------------------------------------------------- Facturas

export const facturasStitch: Render = (): Pagina => {
  const e = store.leer();
  const ordenes = misOrdenes();
  const lista = e.facturas.filter((f) => ordenes.some((o) => o.id === f.ordenId));

  const filas = lista
    .map(
      (f) => `<tr class="hover:bg-surface-container-low transition-colors cursor-pointer" data-accion="ir" data-valor="/c/factura/${esc(f.id)}">
        <td class="py-md px-lg">
          <div class="font-semibold text-primary font-mono">${esc(f.numero)}</div>
          <div class="text-label-sm font-label-sm text-on-surface-variant">Control: ${esc(f.numeroControl)}</div>
        </td>
        <td class="py-md px-lg">${f.emitidaEn ? esc(fechaCorta(f.emitidaEn)) : '—'}</td>
        <td class="py-md px-lg">
          <span class="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            f.estado === 'emitida' ? 'bg-secondary-container text-on-secondary-container' : f.estado === 'anulada' ? 'bg-error-container text-on-error-container' : 'bg-surface-variant text-on-surface-variant'
          }">${esc(f.estado.replace('_', ' '))}</span>
        </td>
        <td class="py-md px-lg text-right font-medium">${esc(formatearUsd(f.totalUsd))}</td>
      </tr>`,
    )
    .join('');

  const cuerpo = `
<div class="p-lg flex flex-col gap-xl">
  ${encabezado('Gestión de facturas y notas fiscales', 'Documentos emitidos por el comercio. INPARQUES no es el emisor fiscal.', BOTON_CSV)}

  <div class="grid grid-cols-2 md:grid-cols-3 gap-lg">
    ${tarjetaMetrica('Emitidas', String(lista.filter((f) => f.estado === 'emitida').length), 'receipt_long', 'text-primary')}
    ${tarjetaMetrica('Anuladas', String(lista.filter((f) => f.estado === 'anulada').length), 'block', 'text-error')}
    ${tarjetaMetrica('Monto facturado', formatearUsd(lista.filter((f) => f.estado === 'emitida').reduce((s, f) => s + f.totalUsd, 0)), 'payments', 'text-secondary')}
  </div>

  ${envoltorioTabla('Documentos', `${lista.length} documento${lista.length === 1 ? '' : 's'}`, ['Número / Control', 'Emitida', 'Estado', 'Total'], filas)}
</div>`;

  return { titulo: 'Facturas', standalone: true, contenido: marcoFinanzas('/c/facturas', cuerpo) };
};

export const detalleFacturaStitch: Render = (ctx): Pagina => {
  const e = store.leer();
  const f = e.facturas.find((x) => x.id === ctx.params.facturaId);
  if (!f) return error404(ctx);
  const o = e.ordenes.find((x) => x.id === f.ordenId);

  const dato = (rotulo: string, valor: string, mono = false) => `
<div class="flex flex-col gap-1">
  <span class="font-label-sm text-label-sm text-outline">${esc(rotulo)}</span>
  <span class="font-body-md text-body-md text-on-surface ${mono ? 'font-mono' : ''}">${esc(valor)}</span>
</div>`;

  const cuerpo = `
<div class="p-lg max-w-3xl mx-auto">
  <button type="button" data-accion="ir" data-valor="/c/facturas" class="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors w-fit mb-md">
    <span class="material-symbols-outlined text-[18px]">arrow_back</span>
    <span class="font-label-sm text-label-sm">Volver a facturas</span>
  </button>
  <h2 class="text-headline-lg font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-lg">Factura ${esc(f.numero)}</h2>

  ${
    f.estado === 'emitida'
      ? `<div class="bg-surface-container-low border border-outline-variant rounded-lg p-lg flex gap-md items-start mb-lg">
          <span class="material-symbols-outlined text-tertiary">lock</span>
          <p class="font-body-md text-body-md text-on-surface-variant">Una factura emitida no se edita ni se borra. Para corregirla se emite una nota de crédito o débito.</p>
        </div>`
      : ''
  }

  <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg grid grid-cols-1 sm:grid-cols-2 gap-6 mb-lg">
    ${dato('Emisor', f.emisorRazonSocial)}
    ${dato('RIF', f.emisorRif, true)}
    ${dato('Número', f.numero, true)}
    ${dato('N.º de control', f.numeroControl, true)}
    ${dato('Estado', f.estado.replace('_', ' '))}
    ${dato('Orden', o?.codigo ?? '—', true)}
    ${dato('Base imponible', formatearUsd(f.baseImponibleUsd))}
    ${dato('IVA', formatearUsd(f.ivaUsd))}
    ${dato('Total', formatearUsd(f.totalUsd))}
    ${dato('Total en bolívares', formatearVes(f.totalVes))}
    ${dato('Tasa aplicada', `${f.tasaBcv.toFixed(2)} Bs/USD`)}
    ${f.motivoNota ? dato('Motivo de la nota', f.motivoNota) : ''}
  </div>

  ${
    f.estado === 'emitida'
      ? `<button type="button" data-accion="nota-credito" data-valor="${esc(f.id)}" class="w-full h-touch-target border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2">
          <span class="material-symbols-outlined">edit_note</span>
          Emitir nota de crédito
        </button>`
      : ''
  }
</div>`;

  return { titulo: `Factura ${f.numero}`, standalone: true, contenido: marcoFinanzas('/c/facturas', cuerpo) };
};

// ------------------------------------------------------------- Comprobantes

export const comprobantesStitch: Render = (): Pagina => {
  const ordenes = misOrdenes().filter((o) => o.estado === 'entregada');

  const filas = ordenes
    .map(
      (o) => `<tr class="hover:bg-surface-container-low transition-colors cursor-pointer" data-accion="ir" data-valor="/c/pedido/${esc(o.id)}">
        <td class="py-md px-lg font-semibold text-primary font-mono">${esc(o.codigo)}</td>
        <td class="py-md px-lg">${esc(o.clienteNombre)}</td>
        <td class="py-md px-lg">${esc(fechaCorta(o.creadaEn))}</td>
        <td class="py-md px-lg text-right font-medium">${esc(formatearUsd(o.totalUsd))}</td>
      </tr>`,
    )
    .join('');

  const cuerpo = `
<div class="p-lg flex flex-col gap-xl">
  ${encabezado('Comprobantes de pedido', 'Comprobantes de entrega. No son facturas fiscales.', BOTON_CSV)}
  ${envoltorioTabla('Pedidos entregados', `${ordenes.length} comprobante${ordenes.length === 1 ? '' : 's'}`, ['Código', 'Cliente', 'Fecha', 'Total'], filas)}
</div>`;

  return { titulo: 'Comprobantes', standalone: true, contenido: marcoFinanzas('/c/comprobantes', cuerpo) };
};

// ---------------------------------------------------------- Estado de cuenta

export const estadoCuentaStitch: Render = (): Pagina => {
  const e = store.leer();
  const negocioId = miNegocioId();
  const contrato = e.contratos.find((c) => c.negocioId === negocioId);
  const liqs = e.liquidaciones
    .filter((l) => l.negocioId === negocioId)
    .sort((a, b) => b.periodoHasta.localeCompare(a.periodoHasta));
  const ventas = misOrdenes().filter((o) => o.estado === 'entregada').reduce((s, o) => s + o.totalUsd, 0);
  const p = contrato ? calcularParticipacion(ventas, contrato) : null;

  const porCobrar = liqs.filter((l) => l.estado === 'por_cobrar').reduce((s, l) => s + l.netoUsd, 0);
  const porPagar = liqs.filter((l) => l.estado === 'por_pagar').reduce((s, l) => s + l.netoUsd, 0);
  const conciliado = liqs.filter((l) => l.estado === 'conciliada').reduce((s, l) => s + l.netoUsd, 0);
  const cerrado = liqs.filter((l) => l.estado === 'cerrada').reduce((s, l) => s + l.netoUsd, 0);

  const filas = liqs
    .map(
      (l) => `<tr class="hover:bg-surface-container-low transition-colors">
        <td class="py-md px-lg">
          <div class="font-semibold text-primary">${esc(fechaCorta(`${l.periodoDesde}T12:00:00`))} – ${esc(fechaCorta(`${l.periodoHasta}T12:00:00`))}</div>
          <div class="text-label-sm font-label-sm text-on-surface-variant">Ventas ${esc(formatearUsd(l.ventasUsd))}</div>
        </td>
        <td class="py-md px-lg text-error">-${esc(formatearUsd(l.comisionUsd))}</td>
        <td class="py-md px-lg text-error">-${esc(formatearUsd(l.canonUsd))}</td>
        <td class="py-md px-lg">
          <span class="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            l.estado === 'cerrada' ? 'bg-secondary-container text-on-secondary-container' : l.estado === 'conciliada' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-variant text-on-surface-variant'
          }">${esc(ETIQUETA_LIQUIDACION[l.estado])}</span>
        </td>
        <td class="py-md px-lg text-right font-medium">${esc(formatearUsd(l.netoUsd))}</td>
      </tr>`,
    )
    .join('');

  const cuerpo = `
<div class="p-lg flex flex-col gap-xl">
  ${encabezado('Canon, comisiones y estado de cuenta', 'Reglas económicas vigentes y estado de cuenta por periodo de la concesión.', BOTON_CSV + BOTON_IMPRIMIR)}

  <section>
    <h3 class="text-headline-md font-headline-md text-on-surface mb-md">Reglas económicas vigentes</h3>
    ${
      contrato
        ? `<div class="grid grid-cols-1 md:grid-cols-3 gap-lg">
            ${tarjetaRegla('Porcentaje sobre venta', `${contrato.porcentajeSobreVenta}%`, 'Aplicado sobre las ventas brutas declaradas del periodo.', 'account_balance_wallet')}
            ${tarjetaRegla('Canon fijo por periodo', formatearUsd(contrato.canonFijoUsd), 'Monto fijo acordado en el contrato de concesión.', 'point_of_sale')}
            ${tarjetaRegla('Mínimo garantizado', formatearUsd(contrato.minimoGarantizadoUsd), 'Piso de la obligación con INPARQUES en el periodo.', 'monitoring')}
          </div>`
        : `<div class="bg-error-container/20 border border-error-container rounded-lg p-lg flex gap-md items-start">
            <span class="material-symbols-outlined text-error">warning</span>
            <p class="font-body-md text-body-md text-on-surface">No hay condiciones económicas registradas para este negocio.</p>
          </div>`
    }
  </section>

  ${
    p
      ? `<section>
          <h3 class="text-headline-md font-headline-md text-on-surface mb-md">Periodo en curso</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-lg">
            ${tarjetaMetrica('Ventas acumuladas', formatearUsd(ventas), 'trending_up')}
            ${tarjetaMetrica('Comisión sobre venta', formatearUsd(p.comisionUsd), 'percent', 'text-error')}
            ${tarjetaMetrica('Canon', formatearUsd(p.canonUsd), 'receipt', 'text-error')}
            ${tarjetaMetrica('Obligación total', formatearUsd(p.totalUsd), 'account_balance', 'text-primary')}
          </div>
        </section>`
      : ''
  }

  <section>
    <h3 class="text-headline-md font-headline-md text-on-surface mb-md">Resumen por estado</h3>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-lg">
      ${tarjetaMetrica('Monto por cobrar', formatearUsd(porCobrar), 'pending_actions')}
      ${tarjetaMetrica('Monto por pagar', formatearUsd(porPagar), 'outbound', 'text-error')}
      ${tarjetaMetrica('Conciliado', formatearUsd(conciliado), 'task_alt', 'text-primary')}
      ${tarjetaMetrica('Cerrado', formatearUsd(cerrado), 'lock', 'text-secondary')}
    </div>
  </section>

  ${envoltorioTabla('Liquidaciones', `${liqs.length} periodo${liqs.length === 1 ? '' : 's'}`, ['Periodo', 'Comisión', 'Canon', 'Estado', 'Neto'], filas)}

  <p class="font-label-sm text-label-sm text-on-surface-variant text-center">Una liquidación cerrada no se edita: se corrige con un ajuste autorizado.</p>
</div>`;

  return { titulo: 'Estado de cuenta', standalone: true, contenido: marcoFinanzas('/c/estado-cuenta', cuerpo) };
};

// ------------------------------------------------------------------ Ajustes

export const ajustesStitch: Render = (): Pagina => {
  const e = store.leer();
  const negocioId = miNegocioId();
  const lista = e.ajustes.filter((a) => {
    const l = e.liquidaciones.find((x) => x.id === a.liquidacionId);
    return !a.liquidacionId || l?.negocioId === negocioId;
  });

  const cuerpo = `
<div class="p-lg flex flex-col gap-xl">
  ${encabezado(
    'Solicitudes de ajuste',
    'Los cierres no se editan. Toda corrección pasa por un ajuste con motivo y evidencia.',
    `<button type="button" data-accion="solicitar-ajuste" class="h-touch-target px-md flex items-center gap-sm bg-primary-container text-on-primary font-label-md text-label-md rounded-lg hover:opacity-90 transition-opacity shadow-sm">
      <span class="material-symbols-outlined text-[20px]">add</span>
      Solicitar ajuste
    </button>`,
  )}

  ${
    lista.length === 0
      ? `<div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-xl text-center">
          <span class="material-symbols-outlined text-[40px] text-outline mb-sm">tune</span>
          <p class="font-label-md text-label-md text-on-surface mb-1">Sin solicitudes</p>
          <p class="font-body-md text-body-md text-on-surface-variant">No ha solicitado ningún ajuste sobre sus liquidaciones.</p>
        </div>`
      : `<div class="grid grid-cols-1 lg:grid-cols-2 gap-lg">
          ${lista
            .map(
              (a) => `<div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm flex flex-col gap-sm">
                <div class="flex justify-between items-start gap-2">
                  <div>
                    <h4 class="font-headline-md text-headline-md text-on-surface">${esc(a.concepto)}</h4>
                    <p class="font-label-sm text-label-sm text-on-surface-variant">${esc(desde(a.creadoEn))}</p>
                  </div>
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                    a.estado === 'aprobado' ? 'bg-secondary-container text-on-secondary-container' : a.estado === 'rechazado' ? 'bg-error-container text-on-error-container' : 'bg-surface-variant text-on-surface-variant'
                  }">${esc(a.estado)}</span>
                </div>
                <div class="grid grid-cols-2 gap-md py-sm border-t border-outline-variant">
                  <div><p class="font-label-sm text-label-sm text-on-surface-variant">Monto</p><p class="font-body-md text-body-md text-on-surface">${esc(formatearUsd(a.montoUsd))}</p></div>
                  <div><p class="font-label-sm text-label-sm text-on-surface-variant">Solicitado</p><p class="font-body-md text-body-md text-on-surface">${esc(fechaHora(a.creadoEn))}</p></div>
                </div>
                <p class="font-body-md text-body-md text-on-surface-variant">${esc(a.motivo)}</p>
              </div>`,
            )
            .join('')}
        </div>`
  }
</div>`;

  return { titulo: 'Solicitudes de ajuste', standalone: true, contenido: marcoFinanzas('/c/estado-cuenta', cuerpo) };
};

// ------------------------------------------------------------ Exportaciones

export const exportacionesStitch: Render = (): Pagina => {
  const exportables: Array<[string, string, string, string]> = [
    ['ventas', 'receipt_long', 'Ventas', 'Todas las órdenes con su canal, estado, totales y tasa aplicada.'],
    ['pagos', 'payments', 'Pagos', 'Movimientos de cobro con método, referencia y estado de conciliación.'],
    ['catalogo', 'menu_book', 'Catálogo', 'Artículos, precios, disponibilidad y existencias del comercio.'],
  ];

  const cuerpo = `
<div class="p-lg flex flex-col gap-xl">
  ${encabezado('Centro de exportaciones de datos', 'Descargue sus datos en CSV. La exportación completa evita la dependencia del proveedor.', BOTON_IMPRIMIR)}

  <div class="grid grid-cols-1 md:grid-cols-3 gap-lg">
    ${exportables
      .map(
        ([valor, icono, titulo, nota]) => `<div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm flex flex-col gap-md">
          <div class="w-12 h-12 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
            <span class="material-symbols-outlined">${icono}</span>
          </div>
          <div class="flex-1">
            <h4 class="font-headline-md text-headline-md text-on-surface mb-1">${esc(titulo)}</h4>
            <p class="font-body-md text-body-md text-on-surface-variant">${esc(nota)}</p>
          </div>
          <button type="button" data-accion="exportar-csv" data-valor="${esc(valor)}" class="w-full h-touch-target bg-primary-container text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[20px]">download</span>
            Descargar CSV
          </button>
        </div>`,
      )
      .join('')}
  </div>
</div>`;

  return { titulo: 'Exportaciones', standalone: true, contenido: marcoFinanzas('/c/exportaciones', cuerpo) };
};
