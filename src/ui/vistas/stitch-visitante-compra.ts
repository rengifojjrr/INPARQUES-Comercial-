/**
 * Recorrido de compra del visitante, portado del HTML real de Stitch:
 * ficha del comercio + menú, personalizar producto, reservar servicio,
 * carrito, checkout, selección de pago y seguimiento del pedido/reserva.
 *
 * Toda la lógica real (carrito, totales, estado de la orden, formularios)
 * ya existía en visitante.ts; aquí solo se reconstruye el marcado con las
 * clases y la estructura de Stitch, reutilizando exactamente los mismos
 * `data-accion`/`data-formulario` que el despachador de acciones ya sabe
 * manejar — no se duplica ni se reinventa ningún comportamiento.
 */

import { esc } from '../componentes';
import { marcadorFoto } from '../stitch-comun';
import type { Pagina, Render } from './tipos';
import { store } from '../../data/store';
import { sesion } from '../../app/session';
import { estadoUi } from '../estado-ui';
import { totalesCarrito, unidadesEnCarrito, extrasDeItem } from '../../domain/cart';
import { ETIQUETA_ORDEN } from '../../domain/state-machines';
import { formatearUsd, formatearVes } from '../../domain/money';
import { fechaCorta, desde } from '../formato';
import { error404 } from './compartidas';

const NOMBRE_CATEGORIA: Record<string, string> = {
  comida: 'Comida', bebidas: 'Bebidas', juguetes: 'Juguetes', artesania: 'Artesanía',
  recuerdos: 'Recuerdos', alquileres: 'Alquileres', atracciones: 'Atracciones', paseos: 'Paseos',
};
const ICONO_CATEGORIA: Record<string, string> = {
  comida: 'restaurant', bebidas: 'local_cafe', juguetes: 'toys', artesania: 'palette',
  recuerdos: 'redeem', alquileres: 'pedal_bike', atracciones: 'star', paseos: 'hiking',
};

function cabeceraSimple(titulo: string, atras: string): string {
  return `
<header class="bg-surface border-b border-outline-variant flex justify-between items-center px-lg w-full h-14 sticky top-0 z-40">
  <button type="button" data-accion="ir" data-valor="${atras}" aria-label="Volver" class="h-touch-target w-touch-target flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors">
    <span class="material-symbols-outlined">arrow_back</span>
  </button>
  <span class="font-headline-md text-headline-md font-bold text-primary truncate">${esc(titulo)}</span>
  <div class="h-touch-target w-touch-target"></div>
</header>`;
}

// ------------------------------------------------------- Ficha + menú (v.comercio / v.catalogo)

export const fichaComercioStitch: Render = (ctx): Pagina => {
  const e = store.leer();
  const negocio = e.negocios.find((n) => n.id === ctx.params.negocioId);
  if (!negocio) return error404(ctx);
  const locales = e.locales.filter((l) => l.negocioId === negocio.id);
  const local = locales[0];
  const punto = e.puntos.find((p) => p.id === local?.puntoId);
  const zona = e.zonas.find((z) => z.id === punto?.zonaId);
  const val = e.valoraciones.filter((v) => v.negocioId === negocio.id);
  const media = val.length ? (val.reduce((s, v) => s + v.estrellas, 0) / val.length).toFixed(1) : null;

  const arts = e.articulos.filter((a) => locales.some((l) => l.id === a.localId));
  const categorias = [...new Set(arts.map((a) => a.categoria))];
  const unidades = unidadesEnCarrito(estadoUi.carrito);
  const totalCarritoUsd = totalesCarrito(estadoUi.carrito, e.tasaBcv.valor).totalUsd;

  const contenido = `
<header class="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-lg py-sm">
  <button type="button" data-accion="ir" data-valor="/v" aria-label="Volver" class="w-touch-target h-touch-target flex items-center justify-center bg-surface-container-lowest rounded-full shadow-sm text-on-surface hover:bg-surface-container-high transition-colors">
    <span class="material-symbols-outlined">arrow_back</span>
  </button>
</header>
<div class="relative w-full h-[220px] md:h-[300px] bg-surface-container-highest">
  ${marcadorFoto(ICONO_CATEGORIA[negocio.categoria] ?? 'storefront', 'w-full h-full')}
  <div class="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80"></div>
</div>
<main class="relative -mt-xl px-4 md:px-lg max-w-4xl mx-auto z-10 pb-[100px]">
  <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm mb-lg">
    <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-md">
      <div>
        <div class="flex items-center gap-xs mb-xs">
          <span class="bg-secondary-container text-on-secondary-container font-label-sm text-label-sm px-2 py-1 rounded-full flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">verified</span>
            Permiso Vigente
          </span>
          <span class="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2 py-1 rounded-full">${esc(NOMBRE_CATEGORIA[negocio.categoria] ?? negocio.categoria)}</span>
        </div>
        <h1 class="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface mb-xs">${esc(negocio.nombreComercial)}</h1>
        <div class="flex items-center gap-sm text-on-surface-variant font-body-md text-body-md">
          ${media ? `<div class="flex items-center gap-1"><span class="material-symbols-outlined text-[20px] text-primary icon-fill">star</span><span class="font-label-md text-label-md">${media}</span><span class="text-outline">(${val.length})</span></div><span class="w-1 h-1 bg-outline-variant rounded-full"></span>` : ''}
          <div class="flex items-center gap-1"><span class="material-symbols-outlined text-[20px]">location_on</span>${esc(zona?.nombre ?? '')}</div>
        </div>
      </div>
      <div class="bg-surface-container-low rounded-lg p-sm border border-outline-variant flex items-center gap-sm">
        <span class="material-symbols-outlined text-primary">schedule</span>
        <div>
          <p class="font-label-md text-label-md text-primary">${local?.abierto ? 'Abierto ahora' : 'Cerrado'}</p>
          <p class="font-body-md text-body-md text-on-surface-variant text-sm">Mar. a dom., 07:00 a 17:00</p>
        </div>
      </div>
    </div>
  </div>

  <div class="space-y-xl">
    ${arts.length === 0
      ? '<p class="font-body-md text-body-md text-on-surface-variant">Este comercio todavía no publicó artículos.</p>'
      : categorias.map((cat) => `
      <section>
        <h2 class="font-headline-md text-headline-md text-on-surface mb-md">${esc(NOMBRE_CATEGORIA[cat] ?? cat)}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
          ${arts.filter((a) => a.categoria === cat).map((a) => `
          <button type="button" data-accion="ir" data-valor="/v/${a.tipo === 'servicio' ? 'servicio' : 'articulo'}/${esc(a.id)}"
            class="bg-surface-container-lowest border border-outline-variant rounded-lg p-sm flex gap-md hover:shadow-sm transition-shadow text-left w-full">
            <div class="w-24 h-24 rounded-md shrink-0 overflow-hidden">${marcadorFoto(ICONO_CATEGORIA[cat] ?? 'restaurant', 'w-full h-full')}</div>
            <div class="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <h3 class="font-label-md text-label-md text-on-surface">${esc(a.nombre)}</h3>
                <p class="font-body-md text-body-md text-on-surface-variant text-sm line-clamp-2">${esc(a.descripcion)}</p>
              </div>
              <div class="flex justify-between items-center mt-sm">
                <span class="font-label-md text-label-md text-primary">${esc(formatearUsd(a.precioUsd))}</span>
                ${a.disponible
                  ? `<span class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center"><span class="material-symbols-outlined text-[20px]">add</span></span>`
                  : `<span class="font-label-sm text-label-sm text-error">Agotado</span>`}
              </div>
            </div>
          </button>`).join('')}
        </div>
      </section>`).join('')}
  </div>
</main>
${unidades > 0
  ? `<div class="fixed bottom-0 left-0 w-full p-md bg-gradient-to-t from-surface-container-lowest to-transparent z-50 flex justify-center pb-safe">
      <button type="button" data-accion="ir" data-valor="/v/carrito" class="w-full max-w-md bg-primary text-on-primary rounded-full h-touch-target flex items-center justify-between px-lg shadow-lg hover:bg-surface-tint transition-colors">
        <div class="flex items-center gap-sm">
          <div class="bg-on-primary text-primary font-label-sm text-label-sm w-6 h-6 rounded-full flex items-center justify-center">${unidades}</div>
          <span class="font-label-md text-label-md">Ver carrito</span>
        </div>
        <span class="font-label-md text-label-md">${esc(formatearUsd(totalCarritoUsd))}</span>
      </button>
    </div>`
  : ''}`;

  return { titulo: negocio.nombreComercial, standalone: true, contenido };
};

// ---------------------------------------------------------- Personalizar producto (v.articulo)

export const articuloStitch: Render = (ctx): Pagina => {
  const e = store.leer();
  const a = e.articulos.find((x) => x.id === ctx.params.articuloId);
  if (!a) return error404(ctx);
  const negocio = e.negocios.find((n) => n.id === a.negocioId)!;
  const cantidad = Number(estadoUi.seleccion[`cant-${a.id}`] ?? '1');
  const total = a.precioUsd * cantidad;

  const contenido = `
${cabeceraSimple('INPARQUES Comercial', `/v/comercio/${a.negocioId}`)}
<main class="flex-1 overflow-y-auto w-full max-w-3xl mx-auto pb-24 md:pb-lg">
  <div class="w-full h-64 md:h-80 bg-surface-container-highest relative rounded-b-xl overflow-hidden shadow-sm">
    ${marcadorFoto(ICONO_CATEGORIA[negocio.categoria] ?? 'restaurant', 'w-full h-full')}
  </div>
  <div class="px-md md:px-lg py-lg space-y-lg">
    <div>
      <h1 class="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-primary mb-xs">${esc(a.nombre)}</h1>
      <p class="font-body-md text-body-md text-on-surface-variant">${esc(a.descripcion)}</p>
      <div class="mt-sm font-headline-md text-headline-md text-primary font-bold">${esc(formatearUsd(a.precioUsd))}</div>
    </div>
    <hr class="border-outline-variant opacity-50">
    ${!a.disponible ? `<div class="bg-error-container/20 border border-error/20 rounded-lg p-md font-body-md text-body-md text-error">Agotado: el comercio marcó este artículo como no disponible.</div>` : ''}
    ${a.alergenos.length ? `<div class="bg-tertiary-fixed/40 border border-tertiary/20 rounded-lg p-md font-body-md text-body-md text-on-surface">Contiene: ${esc(a.alergenos.join(', '))}</div>` : ''}
    <form id="product-form">
      ${a.variantes.map((v) => `
      <section class="mb-xl">
        <div class="flex justify-between items-center mb-md">
          <h2 class="font-headline-md text-headline-md text-on-surface">${esc(v.nombre)}</h2>
          <span class="bg-error-container text-on-error-container font-label-sm text-label-sm px-2 py-1 rounded-full uppercase tracking-wider">Requerido</span>
        </div>
        <div class="space-y-sm">
          ${v.opciones.map((o, i) => `
          <label class="flex items-center p-sm bg-surface-container-lowest border ${i === 0 ? 'border-primary' : 'border-outline-variant'} rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors ${!o.disponible ? 'opacity-50' : ''}">
            <input class="h-5 w-5 text-primary" type="radio" name="var-${esc(v.id)}" value="${esc(o.id)}" ${i === 0 ? 'checked' : ''} ${!o.disponible ? 'disabled' : ''}>
            <span class="ml-sm font-body-md text-body-md">${esc(o.nombre)}${o.deltaUsd ? ` (+ ${esc(formatearUsd(o.deltaUsd))})` : ''}</span>
          </label>`).join('')}
        </div>
      </section>`).join('')}
      ${a.modificadores.map((m) => `
      <section class="mb-xl">
        <div class="flex justify-between items-center mb-md">
          <h2 class="font-headline-md text-headline-md text-on-surface">${esc(m.nombre)}</h2>
          <span class="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">${m.obligatorio ? 'Requerido' : 'Opcional'}</span>
        </div>
        <div class="space-y-sm">
          ${m.opciones.map((o) => `
          <label class="flex items-center p-sm bg-surface-container-lowest border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors ${!o.disponible ? 'opacity-50' : ''}">
            <input class="h-5 w-5 text-primary rounded" type="radio" name="mod-${esc(m.id)}" value="${esc(o.id)}" ${!o.disponible ? 'disabled' : ''}>
            <div class="ml-sm flex-1 flex justify-between items-center">
              <span class="font-body-md text-body-md">${esc(o.nombre)}</span>
              ${o.deltaUsd ? `<span class="font-label-md text-label-md text-on-surface-variant">+ ${esc(formatearUsd(o.deltaUsd))}</span>` : ''}
            </div>
          </label>`).join('')}
        </div>
      </section>`).join('')}
    </form>
  </div>
</main>
<div class="fixed bottom-0 left-0 w-full bg-surface border-t border-outline-variant shadow-[0_-4px_12px_rgba(40,51,46,0.08)] z-40 px-md py-sm pb-safe">
  <div class="flex items-center justify-between gap-md max-w-3xl mx-auto">
    <div class="flex items-center bg-surface-container-low rounded-lg border border-outline-variant">
      <button type="button" data-accion="cant-menos" data-valor="${esc(a.id)}" class="h-touch-target w-touch-target flex items-center justify-center text-on-surface hover:bg-surface-container-high rounded-l-lg transition-colors">
        <span class="material-symbols-outlined">remove</span>
      </button>
      <span class="font-headline-md text-headline-md w-12 text-center">${cantidad}</span>
      <button type="button" data-accion="cant-mas" data-valor="${esc(a.id)}" class="h-touch-target w-touch-target flex items-center justify-center text-on-surface hover:bg-surface-container-high rounded-r-lg transition-colors">
        <span class="material-symbols-outlined">add</span>
      </button>
    </div>
    <button type="button" data-accion="agregar-carrito" data-valor="${esc(a.id)}" ${!a.disponible ? 'disabled' : ''}
      class="flex-1 h-touch-target bg-primary text-on-primary font-label-md text-label-md rounded-lg flex items-center justify-center gap-sm disabled:opacity-50 transition-opacity hover:bg-surface-tint">
      <span class="material-symbols-outlined">shopping_cart</span>
      <span>${a.disponible ? `Agregar · ${esc(formatearUsd(total))}` : 'No disponible'}</span>
    </button>
  </div>
  <div id="error-agregar" class="max-w-3xl mx-auto"></div>
</div>`;

  return { titulo: a.nombre, standalone: true, contenido };
};

// -------------------------------------------------------------- Reservar servicio (v.servicio)

export const servicioStitch: Render = (ctx): Pagina => {
  const e = store.leer();
  const a = e.articulos.find((x) => x.id === ctx.params.articuloId);
  if (!a) return error404(ctx);
  const negocio = e.negocios.find((n) => n.id === a.negocioId)!;
  const hoy = new Date().toISOString().slice(0, 10);
  const fechaSel = estadoUi.seleccion[`fecha-${a.id}`] ?? hoy;
  const fechas = [...new Set(e.franjas.filter((f) => f.articuloId === a.id).map((f) => f.fecha))].slice(0, 7);
  const franjas = e.franjas.filter((f) => f.articuloId === a.id && f.fecha === fechaSel);
  const franjaSel = estadoUi.seleccion[`franja-${a.id}`];
  const cantidad = Number(estadoUi.seleccion[`cant-${a.id}`] ?? '1');
  const total = a.precioUsd * cantidad;

  const contenido = `
${cabeceraSimple(a.nombre, `/v/comercio/${a.negocioId}`)}
<main class="flex-1 flex flex-col pb-[120px]">
  <div class="w-full h-48 relative">${marcadorFoto(ICONO_CATEGORIA[negocio.categoria] ?? 'hiking', 'w-full h-full')}</div>
  <div class="px-md md:px-lg max-w-3xl mx-auto w-full -mt-md relative z-10 flex flex-col gap-xl">
    <section>
      <div class="flex items-center gap-sm mb-xs">
        <span class="flex items-center text-on-surface-variant font-label-sm text-label-sm"><span class="material-symbols-outlined text-[16px] mr-base">schedule</span> ${a.duracionMin} min</span>
      </div>
      <h2 class="font-headline-lg text-headline-lg-mobile text-on-surface mb-xs">${esc(a.nombre)}</h2>
      <p class="font-body-md text-body-md text-on-surface-variant">${esc(a.descripcion)}</p>
    </section>
    <section>
      <h3 class="font-label-md text-label-md text-on-surface mb-sm flex items-center gap-xs"><span class="material-symbols-outlined">calendar_month</span> Fecha de reserva</h3>
      ${fechas.length === 0
        ? '<p class="font-body-md text-body-md text-on-surface-variant">Sin fechas publicadas.</p>'
        : `<div class="flex gap-sm overflow-x-auto pb-sm">
          ${fechas.map((f) => `<button type="button" data-accion="fecha-servicio" data-valor="${esc(a.id)}|${esc(f)}"
            class="shrink-0 w-[72px] h-[88px] flex flex-col items-center justify-center rounded-lg border ${f === fechaSel ? 'border-2 border-primary bg-primary-container text-on-primary-container shadow-sm' : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container'} transition-colors">
            <span class="font-label-sm text-label-sm uppercase ${f === fechaSel ? '' : 'text-on-surface-variant'}">${esc(fechaCorta(`${f}T12:00:00`).slice(0, 3))}</span>
            <span class="font-headline-md text-headline-md-mobile">${f.slice(-2)}</span>
          </button>`).join('')}
        </div>`}
    </section>
    <section>
      <h3 class="font-label-md text-label-md text-on-surface mb-sm flex items-center gap-xs"><span class="material-symbols-outlined">schedule</span> Franjas horarias</h3>
      ${franjas.length === 0
        ? '<p class="font-body-md text-body-md text-on-surface-variant">No hay franjas publicadas para esta fecha.</p>'
        : `<div class="grid grid-cols-2 md:grid-cols-4 gap-sm">
          ${franjas.map((f) => {
            const libre = f.cupoTotal - f.cupoTomado;
            const agotado = libre <= 0;
            const insuf = !agotado && libre < cantidad;
            const desactivado = agotado || insuf;
            const activo = f.id === franjaSel;
            return `<button type="button" ${desactivado ? 'disabled' : `data-accion="franja-servicio" data-valor="${esc(a.id)}|${esc(f.id)}"`}
              class="min-h-touch-target rounded-lg border ${activo ? 'border-2 border-primary bg-primary-container text-on-primary-container shadow-sm' : desactivado ? 'border-surface-variant bg-surface-container-highest text-on-surface-variant opacity-60 cursor-not-allowed' : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary hover:bg-surface-container'} font-label-md text-label-md flex items-center justify-center transition-colors">
              ${agotado ? `<span class="line-through mr-xs">${esc(f.desde)}</span><span class="text-[10px] uppercase font-bold text-error">Agotado</span>` : esc(f.desde)}
            </button>`;
          }).join('')}
        </div>`}
    </section>
    <section class="bg-surface-container-lowest p-md rounded-lg border border-outline-variant shadow-sm">
      <h3 class="font-label-md text-label-md text-on-surface mb-lg flex items-center gap-xs"><span class="material-symbols-outlined">group</span> Personas</h3>
      <div class="flex items-center justify-between">
        <div class="font-body-md text-body-md text-on-surface font-semibold">${esc(formatearUsd(a.precioUsd))} c/u</div>
        <div class="flex items-center gap-md">
          <button type="button" data-accion="cant-menos" data-valor="${esc(a.id)}" class="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors">
            <span class="material-symbols-outlined text-[20px]">remove</span>
          </button>
          <span class="font-headline-md text-headline-md-mobile text-on-surface w-6 text-center">${cantidad}</span>
          <button type="button" data-accion="cant-mas" data-valor="${esc(a.id)}" class="w-9 h-9 flex items-center justify-center rounded-full bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed transition-colors">
            <span class="material-symbols-outlined text-[20px]">add</span>
          </button>
        </div>
      </div>
    </section>
    <div class="bg-secondary-container/20 border border-secondary/20 rounded-lg p-md font-body-md text-body-md text-on-surface">Presentarse 10 minutos antes. Cancelación sin costo hasta 2 horas antes.</div>
    <div id="error-agregar"></div>
  </div>
</main>
<div class="fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant p-md pb-safe shadow-[0_-4px_12px_rgba(40,51,46,0.08)] z-50">
  <div class="max-w-3xl mx-auto flex items-center justify-between gap-md">
    <button type="button" data-accion="agregar-servicio" data-valor="${esc(a.id)}" ${!franjaSel ? 'disabled' : ''}
      class="flex-1 h-touch-target bg-primary text-on-primary font-label-md text-label-md rounded-full flex items-center justify-center gap-sm disabled:opacity-50 transition-opacity hover:bg-surface-tint">
      ${franjaSel ? `Reservar · ${esc(formatearUsd(total))}` : 'Elija un horario'}
    </button>
  </div>
</div>`;

  return { titulo: a.nombre, standalone: true, contenido };
};

// --------------------------------------------------------------------- Carrito

export const carritoStitch: Render = (): Pagina => {
  const e = store.leer();
  const c = estadoUi.carrito;
  const negocio = c.negocioId ? e.negocios.find((n) => n.id === c.negocioId) : null;
  const t = totalesCarrito(c, e.tasaBcv.valor);

  if (c.items.length === 0) {
    const contenido = `
${cabeceraSimple('Mi Carrito', '/v')}
<main class="flex-1 flex flex-col items-center justify-center gap-md p-xl text-center">
  <span class="material-symbols-outlined text-[64px] text-outline-variant">shopping_cart</span>
  <h1 class="font-headline-lg text-headline-lg text-on-surface">Su carrito está vacío</h1>
  <p class="font-body-md text-body-md text-on-surface-variant max-w-xs">Elija un comercio del parque y agregue lo que desee.</p>
  <button type="button" data-accion="ir" data-valor="/v" class="bg-primary text-on-primary font-label-md text-label-md h-touch-target px-lg rounded-full">Ver comercios</button>
</main>`;
    return { titulo: 'Carrito', standalone: true, contenido };
  }

  const contenido = `
${cabeceraSimple('INPARQUES Comercial', '/v')}
<main class="flex-grow w-full max-w-7xl mx-auto px-4 md:px-lg py-lg md:py-xl grid grid-cols-1 lg:grid-cols-12 gap-lg pb-24 md:pb-lg">
  <section class="lg:col-span-8 space-y-md">
    <div class="flex justify-between items-end mb-md">
      <h1 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Mi Carrito</h1>
      <span class="font-label-md text-label-md text-on-surface-variant">${c.items.length} artículo${c.items.length === 1 ? '' : 's'}</span>
    </div>
    ${c.items.map((i) => {
      const extras = extrasDeItem(i);
      const totalItem = (i.precioUnitarioUsd + extras) * i.cantidad;
      return `
    <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-md flex flex-col sm:flex-row gap-md items-start sm:items-center relative">
      <div class="w-24 h-24 rounded-md flex-shrink-0 overflow-hidden">${marcadorFoto('restaurant', 'w-full h-full')}</div>
      <div class="flex-grow min-w-0">
        <h3 class="font-headline-md text-headline-md-mobile text-on-surface">${esc(i.nombre)}</h3>
        ${i.seleccionVariantes.map((v) => `<p class="font-body-md text-body-md text-on-surface-variant text-sm">${esc(v.nombre)}</p>`).join('')}
        ${i.seleccionModificadores.map((m) => `<p class="font-body-md text-body-md text-on-surface-variant text-sm">+ ${esc(m.nombre)}</p>`).join('')}
        <div class="flex items-center gap-4 mt-2">
          <div class="flex items-center border border-outline-variant rounded-md">
            <button type="button" data-accion="item-menos" data-valor="${esc(i.id)}" class="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low"><span class="material-symbols-outlined text-sm">remove</span></button>
            <span class="w-8 text-center font-label-md text-label-md">${i.cantidad}</span>
            <button type="button" data-accion="item-mas" data-valor="${esc(i.id)}" class="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low"><span class="material-symbols-outlined text-sm">add</span></button>
          </div>
          <button type="button" data-accion="quitar-item" data-valor="${esc(i.id)}" class="text-error font-label-md text-label-md flex items-center gap-1 hover:underline"><span class="material-symbols-outlined text-sm">delete</span> Eliminar</button>
        </div>
      </div>
      <div class="text-right sm:ml-auto">
        <p class="font-headline-md text-headline-md-mobile text-on-surface">${esc(formatearUsd(totalItem))}</p>
        <p class="font-body-md text-body-md text-on-surface-variant text-sm">${esc(formatearVes(totalItem * e.tasaBcv.valor))}</p>
      </div>
    </div>`;
    }).join('')}
    <button type="button" data-accion="ir" data-valor="/v" class="inline-flex items-center gap-2 text-primary font-label-md text-label-md hover:underline mt-sm">
      <span class="material-symbols-outlined text-sm">arrow_back</span> Seguir comprando
    </button>
  </section>
  <section class="lg:col-span-4">
    <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm">
      <h2 class="font-headline-md text-headline-md-mobile text-on-surface mb-md pb-xs border-b border-outline-variant">Resumen del Pedido</h2>
      <div class="space-y-sm mb-lg">
        <div class="flex justify-between font-body-md text-body-md text-on-surface-variant"><span>Subtotal</span><span>${esc(formatearUsd(t.subtotalUsd))}</span></div>
        <div class="flex justify-between font-body-md text-body-md text-on-surface-variant"><span>IVA (16 %)</span><span>${esc(formatearUsd(t.impuestosUsd))}</span></div>
      </div>
      <div class="border-t border-outline-variant pt-sm mb-lg">
        <div class="flex justify-between items-end"><span class="font-headline-md text-headline-md-mobile text-on-surface">Total USD</span><span class="font-headline-lg text-headline-lg-mobile text-primary font-bold">${esc(formatearUsd(t.totalUsd))}</span></div>
        <div class="flex justify-between items-end mt-1"><span class="font-body-md text-body-md text-on-surface-variant">Total VES</span><span class="font-body-md text-body-md text-on-surface-variant">${esc(formatearVes(t.totalVes))}</span></div>
      </div>
      <p class="font-body-md text-body-md text-on-surface-variant text-sm mb-md">${negocio ? `Este carrito es de ${esc(negocio.nombreComercial)}.` : ''}</p>
      <button type="button" data-accion="ir" data-valor="/v/checkout" class="w-full bg-primary text-on-primary font-label-md text-label-md py-3 rounded-lg min-h-[44px] hover:bg-primary-container transition-colors shadow-sm">Continuar</button>
    </div>
  </section>
</main>`;

  return { titulo: 'Carrito', standalone: true, contenido };
};

// -------------------------------------------------------------------- Checkout

export const checkoutStitch: Render = (ctx): Pagina => {
  const e = store.leer();
  const c = estadoUi.carrito;
  if (c.items.length === 0) return carritoStitch(ctx);
  const local = e.locales.find((l) => l.id === c.localId)!;
  const negocio = e.negocios.find((n) => n.id === c.negocioId)!;
  const t = totalesCarrito(c, e.tasaBcv.valor);
  const s = sesion.activa();
  const u = sesion.usuario();

  const opcionesCumplimiento: Array<[string, string, string]> = [
    ...(local.cumplimiento.retiroInmediato ? [['retiro_inmediato', 'storefront', 'Retiro inmediato'] as [string, string, string]] : []),
    ...(local.cumplimiento.retiroProgramado ? [['retiro_programado', 'schedule', 'Retiro programado'] as [string, string, string]] : []),
    ...(local.cumplimiento.mesa ? [['mesa', 'restaurant', 'Consumo en mesa'] as [string, string, string]] : []),
  ];

  const contenido = `
${cabeceraSimple('Identificación y Checkout', '/v/carrito')}
<main class="container mx-auto px-md md:px-lg py-xl max-w-4xl pb-24 md:pb-xl">
  <div class="mb-lg">
    <h2 class="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-base">Identificación y Checkout</h2>
    <p class="font-body-md text-body-md text-on-surface-variant">Complete sus datos para finalizar el pedido.</p>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-12 gap-lg">
    <div class="md:col-span-7 flex flex-col gap-lg">
      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm">
        <h3 class="font-headline-md text-headline-md text-primary mb-md">Datos del Visitante</h3>
        ${s?.invitado ? '<p class="font-body-md text-body-md text-on-surface-variant mb-md">Compra como invitado: solo se guarda el nombre.</p>' : ''}
        <div class="flex flex-col gap-md">
          <div>
            <label class="block font-label-md text-label-md text-on-surface mb-xs" for="nombre">Nombre para el pedido</label>
            <input class="w-full h-touch-target px-md border border-outline-variant rounded-md bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" id="nombre" name="nombre" placeholder="Ej. Juan Pérez" type="text" value="${esc(u?.nombre ?? '')}" required>
          </div>
        </div>
      </section>
      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm">
        <h3 class="font-headline-md text-headline-md text-primary mb-md">Cómo lo retira</h3>
        <div class="grid grid-cols-2 gap-sm">
          ${opcionesCumplimiento.map(([valor, icono, texto], i) => `
          <label class="relative flex cursor-pointer rounded-lg border ${i === 0 ? 'border-primary bg-secondary-container' : 'border-outline-variant'} bg-surface-container-lowest p-sm hover:bg-surface-container-low">
            <input class="sr-only" name="cumplimiento" type="radio" value="${valor}" ${i === 0 ? 'checked' : ''}>
            <div class="flex flex-col items-center justify-center w-full">
              <span class="material-symbols-outlined mb-1 ${i === 0 ? 'text-primary' : ''}">${icono}</span>
              <span class="font-label-md text-label-sm text-center ${i === 0 ? 'text-primary' : ''}">${esc(texto)}</span>
            </div>
          </label>`).join('')}
        </div>
        <p class="font-body-md text-body-md text-on-surface-variant text-sm mt-md">Este local no ofrece reparto: la beta solo contempla retiro y consumo dentro del parque.</p>
      </section>
      <div id="error-checkout"></div>
    </div>
    <div class="md:col-span-5 flex flex-col gap-lg">
      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm">
        <h3 class="font-headline-md text-headline-md text-primary mb-md border-b border-outline-variant pb-xs">Resumen del Pedido</h3>
        <div class="py-md border-b border-outline-variant">
          <h4 class="font-label-md text-label-md text-on-surface mb-sm">${esc(negocio.nombreComercial)}</h4>
          <p class="font-body-md text-body-md text-on-surface-variant text-sm">${esc(e.puntos.find((p) => p.id === local.puntoId)?.nombre ?? '—')} · ${unidadesEnCarrito(c)} artículos</p>
        </div>
        <div class="py-md flex justify-between items-center font-headline-md text-headline-md text-on-surface"><span>Total:</span><span class="text-primary">${esc(formatearUsd(t.totalUsd))}</span></div>
        <p class="font-body-md text-body-md text-on-surface-variant text-sm">${esc(formatearVes(t.totalVes))}</p>
        <button type="button" data-accion="ir-pago" class="w-full bg-primary text-on-primary font-label-md text-label-md h-touch-target rounded-full hover:bg-surface-tint transition-colors flex items-center justify-center gap-sm mt-md shadow-md">
          Elegir método de pago
          <span class="material-symbols-outlined text-[20px]">payment</span>
        </button>
      </section>
    </div>
  </div>
</main>`;

  return { titulo: 'Checkout', standalone: true, contenido };
};

// --------------------------------------------------------------- Selección de pago

const METODOS_PAGO: Array<[string, string, string, string]> = [
  ['pago_movil', 'smartphone', 'Pago Móvil', 'Inmediato'],
  ['transferencia', 'account_balance', 'Transferencia', 'Hasta 24 hrs'],
  ['tarjeta', 'credit_card', 'Tarjeta', 'Simulado'],
  ['efectivo', 'payments', 'Efectivo', 'En mostrador'],
];

export const seleccionPagoStitch: Render = (): Pagina => {
  const e = store.leer();
  const t = totalesCarrito(estadoUi.carrito, e.tasaBcv.valor);

  const contenido = `
${cabeceraSimple('Pago', '/v/checkout')}
<main class="flex-1 max-w-3xl mx-auto w-full p-md md:p-xl pb-24 md:pb-xl">
  <div class="mb-lg">
    <h1 class="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">Método de Pago</h1>
    <p class="font-body-md text-body-md text-on-surface-variant">Monto pagadero: <strong>${esc(formatearVes(t.totalVes))}</strong> · ${esc(formatearUsd(t.totalUsd))}</p>
  </div>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-md">
    ${METODOS_PAGO.map(([valor, icono, titulo, nota]) => `
    <button type="button" data-accion="ir" data-valor="/v/checkout/pago/${valor.replace('_', '-')}" class="text-left border border-outline-variant bg-surface rounded-lg p-md flex items-center gap-md hover:border-outline hover:shadow-sm transition-all h-full">
      <div class="w-10 h-10 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center flex-shrink-0"><span class="material-symbols-outlined">${icono}</span></div>
      <div class="flex-1"><h3 class="font-label-md text-label-md text-on-surface">${esc(titulo)}</h3><p class="font-body-md text-sm text-on-surface-variant">${esc(nota)}</p></div>
      <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
    </button>`).join('')}
  </div>
  <div class="bg-secondary-container/20 border border-secondary/20 rounded-lg p-md font-body-md text-body-md text-on-surface mt-lg">Nunca se piden datos reales: la demo no almacena números completos de tarjeta ni códigos de seguridad. Todos los pagos los resuelve un adaptador simulado.</div>
</main>`;

  return { titulo: 'Forma de pago', standalone: true, contenido };
};

function paginaPagoStitch(metodo: string, titulo: string, icono: string, campos: string, nota: string): Pagina {
  const e = store.leer();
  const t = totalesCarrito(estadoUi.carrito, e.tasaBcv.valor);
  const contenido = `
${cabeceraSimple(titulo, '/v/checkout/pago')}
<main class="flex-1 max-w-2xl mx-auto w-full p-md md:p-xl pb-24 md:pb-xl">
  <div class="mb-lg flex items-center gap-md">
    <div class="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center"><span class="material-symbols-outlined">${icono}</span></div>
    <div>
      <h1 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">${esc(titulo)}</h1>
      <p class="font-body-md text-body-md text-on-surface-variant">Monto pagadero: <strong>${esc(formatearVes(t.totalVes))}</strong></p>
    </div>
  </div>
  <form data-formulario="pago" data-metodo="${esc(metodo)}" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm flex flex-col gap-md">
    ${campos}
    <div id="error-pago"></div>
  </form>
  <div class="bg-secondary-container/20 border border-secondary/20 rounded-lg p-md font-body-md text-body-md text-on-surface mt-lg">${esc(nota)}</div>
  <button type="button" data-accion="pagar" data-valor="${esc(metodo)}" class="w-full bg-primary text-on-primary font-label-md text-label-md h-touch-target rounded-full hover:bg-surface-tint transition-colors mt-lg shadow-md">
    Pagar ${esc(formatearVes(t.totalVes))}
  </button>
</main>`;
  return { titulo, standalone: true, contenido };
}

function campoDato(icono: string, etiqueta: string, valor: string): string {
  return `<div class="bg-surface-container p-md rounded-md border border-outline-variant flex items-center gap-sm">
    <span class="material-symbols-outlined text-on-surface-variant">${icono}</span>
    <div><p class="font-label-sm text-label-sm text-on-surface-variant">${esc(etiqueta)}</p><p class="font-body-md text-body-md font-semibold text-on-surface">${esc(valor)}</p></div>
  </div>`;
}

function campoTexto(id: string, etiqueta: string, marcador: string, ayuda?: string, modo?: string): string {
  return `<div>
    <label class="block font-label-md text-label-md text-on-surface mb-xs" for="${esc(id)}">${esc(etiqueta)}</label>
    <input class="w-full h-touch-target px-md border border-outline-variant rounded-md bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" id="${esc(id)}" name="${esc(id)}" placeholder="${esc(marcador)}" ${modo ? `inputmode="${esc(modo)}"` : ''} required>
    ${ayuda ? `<p class="font-body-md text-body-md text-on-surface-variant text-sm mt-1">${esc(ayuda)}</p>` : ''}
  </div>`;
}

export const pagoMovilStitch: Render = (): Pagina =>
  paginaPagoStitch(
    'pago_movil', 'Pago Móvil', 'smartphone',
    `<div class="grid grid-cols-1 md:grid-cols-2 gap-md mb-md">
      ${campoDato('account_balance', 'Banco receptor', 'Banco Demo Nacional')}
      ${campoDato('badge', 'RIF', 'J-41025896-7')}
      ${campoDato('call', 'Teléfono', '0414-0000000')}
    </div>
    ${campoTexto('referencia', 'Número de referencia', '123456', 'Escriba 000000 para probar un pago fallido.', 'numeric')}
    ${campoTexto('telefono', 'Teléfono emisor', '0414-0000000', undefined, 'tel')}`,
    'El pago queda pendiente de verificación: nunca se acepta la captura como prueba final, el comercio lo verifica contra el banco.',
  );

export const pagoTransferenciaStitch: Render = (): Pagina =>
  paginaPagoStitch(
    'transferencia', 'Transferencia', 'account_balance',
    `<div class="grid grid-cols-1 md:grid-cols-2 gap-md mb-md">
      ${campoDato('account_balance', 'Banco', 'Banco Demo Nacional')}
      ${campoDato('pin', 'Cuenta', '0102 •••• •••• 1234')}
      ${campoDato('storefront', 'Titular', 'Inversiones Los Cedros, C.A.')}
    </div>
    ${campoTexto('referencia', 'Referencia bancaria', '000000000', 'Escriba 000000 para probar un pago fallido.', 'numeric')}`,
    'La transferencia se concilia por referencia, monto y fecha. Hasta que el banco confirme, el pago aparece como pendiente de verificación.',
  );

export const pagoTarjetaStitch: Render = (): Pagina =>
  paginaPagoStitch(
    'tarjeta', 'Tarjeta', 'credit_card',
    `${campoTexto('numero', 'Número de tarjeta', '4111 1111 1111 1111', undefined, 'numeric')}
    <div class="grid grid-cols-2 gap-md">
      ${campoTexto('vencimiento', 'Vencimiento', 'MM/AA')}
      ${campoTexto('cvv', 'CVV', '123', undefined, 'numeric')}
    </div>`,
    'La demo nunca guarda el número completo ni el CVV: el adaptador simulado solo valida el formato y aprueba o rechaza según los datos de prueba documentados.',
  );

export const pagoEfectivoStitch: Render = (): Pagina =>
  paginaPagoStitch(
    'efectivo', 'Efectivo en el punto', 'payments',
    `<div class="bg-surface-container-lowest p-md rounded-md border border-outline-variant font-body-md text-body-md text-on-surface">Pague en efectivo al retirar su pedido en el punto comercial. El operador registrará el cobro en caja.</div>`,
    'El pedido queda confirmado y pendiente de cobro en caja; el operador marca el pago cuando lo recibe físicamente.',
  );

// -------------------------------------------------------- Seguimiento de pedido/reserva

function seguimientoStitch(ctx: Parameters<Render>[0], esReserva: boolean): Pagina {
  const e = store.leer();
  const orden = e.ordenes.find((o) => o.id === ctx.params.ordenId);
  if (!orden) return error404(ctx);
  const negocio = e.negocios.find((n) => n.id === orden.negocioId)!;
  const local = e.locales.find((l) => l.id === orden.localId);
  const punto = e.puntos.find((p) => p.id === local?.puntoId);

  const secuencia: Array<[string, string, string]> = esReserva
    ? [['pendiente_aceptacion', 'done', 'Reserva recibida'], ['aceptada', 'event_available', 'Confirmada'], ['lista', 'schedule', 'Lista para el turno'], ['entregada', 'shopping_bag', 'Completada']]
    : [['pendiente_aceptacion', 'done', 'Recibido'], ['aceptada', 'checklist', 'Orden Aceptada'], ['preparando', 'soup_kitchen', 'Preparando'], ['lista', 'shopping_bag', 'Listo para retirar'], ['entregada', 'task_alt', 'Entregado']];
  const idx = secuencia.findIndex(([s]) => s === orden.estado);

  const contenido = `
${cabeceraSimple('INPARQUES Comercial', '/v/historial')}
<main class="max-w-4xl mx-auto px-md py-lg md:px-lg grid grid-cols-1 md:grid-cols-12 gap-lg pb-24 md:pb-lg">
  <div class="md:col-span-12 flex flex-col items-center justify-center text-center py-sm">
    <p class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Seguimiento de ${esReserva ? 'Reserva' : 'Pedido'}</p>
    <h1 class="font-display-lg text-display-lg text-primary mt-base">${esc(orden.codigo)}</h1>
    <div class="mt-xs inline-flex items-center ${orden.estado === 'cancelada' ? 'bg-error-container text-error' : 'bg-primary-container/10 text-primary'} px-sm py-1 rounded-full border ${orden.estado === 'cancelada' ? 'border-error/20' : 'border-primary/20'}">
      <span class="material-symbols-outlined text-[16px] mr-1">${orden.estado === 'cancelada' ? 'cancel' : 'check_circle'}</span>
      <span class="font-label-sm text-label-sm">${esc(ETIQUETA_ORDEN[orden.estado])}</span>
    </div>
  </div>
  <div class="md:col-span-7 flex flex-col gap-lg">
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm">
      <h2 class="font-headline-md text-headline-md-mobile text-on-surface mb-md">Estado del ${esReserva ? 'de la reserva' : 'Pedido'}</h2>
      <div class="relative pl-6 border-l-2 border-primary-container/30 space-y-8">
        ${secuencia.map(([, icono, titulo], i) => {
          const estado = orden.estado === 'cancelada' ? 'pendiente' : i < idx ? 'hecho' : i === idx ? 'activo' : 'pendiente';
          const clases = estado === 'hecho'
            ? 'bg-primary-container text-on-primary-container'
            : estado === 'activo'
            ? 'bg-primary text-on-primary shadow-[0_0_0_2px_rgba(23,107,69,0.2)]'
            : 'bg-surface-container-highest text-outline border border-outline-variant';
          return `<div class="relative">
            <div class="absolute -left-[35px] top-0 w-6 h-6 ${clases} rounded-full flex items-center justify-center z-10 ring-4 ring-surface-container-lowest">
              <span class="material-symbols-outlined text-[14px]">${icono}</span>
            </div>
            <p class="${estado === 'activo' ? 'font-headline-md text-headline-md-mobile text-primary' : 'font-label-md text-label-md ' + (estado === 'pendiente' ? 'text-outline' : 'text-on-surface')}">${esc(titulo)}</p>
          </div>`;
        }).join('')}
      </div>
    </section>
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm">
      <h2 class="font-headline-md text-headline-md-mobile text-on-surface mb-md">Detalle</h2>
      <div class="space-y-sm">
        ${orden.items.map((i) => `<div class="flex justify-between font-body-md text-body-md text-on-surface border-b border-outline-variant/50 pb-sm"><span>${i.cantidad} × ${esc(i.nombre)}</span><span>${esc(formatearUsd((i.precioUnitarioUsd + extrasDeItem(i)) * i.cantidad))}</span></div>`).join('')}
      </div>
      <div class="flex justify-between font-headline-md text-headline-md-mobile text-on-surface mt-md pt-sm border-t border-outline-variant"><span>Total</span><span class="text-primary">${esc(formatearUsd(orden.totalUsd))}</span></div>
      <p class="font-label-sm text-label-sm text-on-surface-variant mt-1">Tasa aplicada: ${orden.tasaBcv.toFixed(2)} Bs/USD · ${esc(fechaCorta(orden.tasaBcvFecha))}</p>
    </section>
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm">
      <h2 class="font-headline-md text-headline-md-mobile text-on-surface mb-md">Historial de la operación</h2>
      <div class="space-y-sm">
        ${orden.historial.map((h) => `<div class="flex justify-between font-body-md text-body-md text-on-surface-variant"><span>${esc(ETIQUETA_ORDEN[h.a as keyof typeof ETIQUETA_ORDEN] ?? h.a)}</span><span>${esc(desde(h.en))}</span></div>`).join('')}
      </div>
    </section>
  </div>
  <div class="md:col-span-5 flex flex-col gap-lg">
    ${orden.estado === 'lista'
      ? `<section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm flex flex-col items-center text-center">
          <h3 class="font-headline-md text-headline-md-mobile text-on-surface mb-sm">Código de Retiro</h3>
          <p class="font-body-md text-body-md text-on-surface-variant mb-lg">Muestra este código al concesionario cuando tu pedido esté listo.</p>
          <button type="button" data-accion="ir" data-valor="/v/pedido/${esc(orden.id)}/qr" class="bg-surface-container p-md rounded-xl border border-outline-variant/50 w-40 h-40 flex flex-col items-center justify-center gap-sm hover:bg-surface-container-high transition-colors">
            <span class="material-symbols-outlined text-[48px] text-primary">qr_code_scanner</span>
            <span class="font-headline-md text-headline-md-mobile text-primary">${esc(orden.codigoRetiro)}</span>
          </button>
          <div class="mt-lg pt-md border-t border-outline-variant w-full text-left flex items-start gap-sm">
            <span class="material-symbols-outlined text-on-surface-variant mt-1">storefront</span>
            <div><p class="font-label-md text-label-md text-on-surface">${esc(negocio.nombreComercial)}</p><p class="font-body-md text-body-md text-on-surface-variant text-sm">${esc(punto?.nombre ?? '')}</p></div>
          </div>
        </section>`
      : `<section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm flex flex-col gap-md">
          <div class="flex items-start gap-sm">
            <span class="material-symbols-outlined text-on-surface-variant mt-1">storefront</span>
            <div><p class="font-label-md text-label-md text-on-surface">${esc(negocio.nombreComercial)}</p><p class="font-body-md text-body-md text-on-surface-variant text-sm">${esc(punto?.nombre ?? '')}</p></div>
          </div>
        </section>`}
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm flex flex-col gap-md">
      <button type="button" data-accion="ir" data-valor="/ayuda" class="w-full min-h-touch-target bg-surface-container-lowest border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors">
        <span class="material-symbols-outlined">support_agent</span> Contactar soporte
      </button>
    </section>
  </div>
</main>`;

  return { titulo: orden.codigo, standalone: true, contenido };
}

export const seguimientoPedidoStitch: Render = (ctx) => seguimientoStitch(ctx, false);
export const seguimientoReservaStitch: Render = (ctx) => seguimientoStitch(ctx, true);
