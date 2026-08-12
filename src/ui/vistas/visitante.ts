/**
 * PWA del visitante. Mobile-first y usable con una mano: acciones principales
 * en barra inferior, listas en una columna y hojas que suben desde abajo.
 */

import {
  html, crudo, esc, boton, tarjeta, insignia, listaDatos, vacio, aviso, etiquetaDemo,
  entradaTexto, areaTexto, seccion, precio, chips, buscador, lineaTiempo, barraAccion,
  contador, opcionRadio, metrica,
} from '../componentes';
import type { Pagina, Render } from './tipos';
import { store } from '../../data/store';
import { sesion } from '../../app/session';
import { estadoUi, filtro, texto } from '../estado-ui';
import { totalesCarrito, unidadesEnCarrito, extrasDeItem } from '../../domain/cart';
import { ETIQUETA_ORDEN, ETIQUETA_PAGO, TONO_ORDEN, TONO_PAGO } from '../../domain/state-machines';
import { formatearUsd, formatearVes, formatearTasa } from '../../domain/money';
import { fechaCorta, fechaHora, desde, pluralizar } from '../formato';
import { error404 } from './compartidas';
import type { Articulo, Local, Negocio } from '../../domain/types';
import { conectividad } from '../../net/connectivity';

const NOMBRE_CATEGORIA: Record<string, string> = {
  comida: 'Comida', bebidas: 'Bebidas', juguetes: 'Juguetes', artesania: 'Artesanía',
  recuerdos: 'Recuerdos', alquileres: 'Alquileres', atracciones: 'Atracciones', paseos: 'Paseos',
};

const ICONO_CATEGORIA: Record<string, string> = {
  comida: '☕', bebidas: '◒', juguetes: '◈', artesania: '❋',
  recuerdos: '✿', alquileres: '⚙', atracciones: '★', paseos: '⛵',
};

function parquePorDefecto(): string {
  return estadoUi.filtros['parque'] ?? 'pq_este';
}

function localesAbiertos(parqueId: string): Array<{ local: Local; negocio: Negocio }> {
  const e = store.leer();
  return e.locales
    .filter((l) => l.parqueId === parqueId)
    .map((l) => ({ local: l, negocio: e.negocios.find((n) => n.id === l.negocioId)! }))
    .filter((x) => x.negocio && (x.negocio.estado === 'activo' || x.negocio.estado === 'aprobado'));
}

function tarjetaComercio(local: Local, negocio: Negocio): string {
  const e = store.leer();
  const punto = e.puntos.find((p) => p.id === local.puntoId);
  const zona = e.zonas.find((z) => z.id === punto?.zonaId);
  const arts = e.articulos.filter((a) => a.localId === local.id);
  const disponibles = arts.filter((a) => a.disponible).length;
  const val = e.valoraciones.filter((v) => v.negocioId === negocio.id);
  const media = val.length ? (val.reduce((s, v) => s + v.estrellas, 0) / val.length).toFixed(1) : null;
  const prep = arts.length ? Math.round(arts.reduce((s, a) => s + a.tiempoPrepMin, 0) / arts.length) : 0;

  return tarjeta(
    html`<div class="fila">
      <span aria-hidden="true" style="font-size:28px;width:44px;text-align:center">${ICONO_CATEGORIA[negocio.categoria] ?? '◻'}</span>
      <div class="crece">
        <div class="fila fila--sep">
          <span style="font-weight:650;font-size:15.5px" class="recorte">${negocio.nombreComercial}</span>
          ${crudo(insignia(local.abierto ? 'Abierto' : 'Cerrado', local.abierto ? 'exito' : 'neutro'))}
        </div>
        <div class="tenue-2">${zona?.nombre ?? ''} · ${punto?.codigo ?? ''}</div>
        <div class="fila fila--envuelve tenue-2" style="gap:10px;margin-top:5px">
          ${media ? crudo(`<span><span aria-hidden="true">★</span> ${media}</span>`) : crudo('<span>Sin valoraciones</span>')}
          ${prep ? crudo(`<span><span aria-hidden="true">◷</span> ${prep} min</span>`) : ''}
          <span>${pluralizar(disponibles, 'artículo', 'artículos')}</span>
        </div>
      </div>
    </div>`,
    { accionIr: `/v/comercio/${negocio.id}` },
  );
}

// -------------------------------------------------------------------- Inicio

export const inicio: Render = () => {
  const e = store.leer();
  const parqueId = parquePorDefecto();
  const parque = e.parques.find((p) => p.id === parqueId)!;
  const lista = localesAbiertos(parqueId);
  const s = sesion.activa();
  const misOrdenes = e.ordenes.filter(
    (o) => (s?.usuarioId && o.clienteId === s.usuarioId) && o.estado !== 'entregada' && o.estado !== 'cancelada',
  );

  const categorias = [...new Set(lista.map((x) => x.negocio.categoria))];

  return {
    titulo: parque.nombre,
    subtitulo: parque.horario,
    acciones: `<button class="icono-bt" data-accion="ir" data-valor="/v/parques" aria-label="Cambiar de parque"><span aria-hidden="true">⇄</span></button>`,
    contenido: html`
      ${misOrdenes.length > 0
        ? crudo(seccion('En curso', html`<div class="pila">
            ${misOrdenes.map((o) =>
              crudo(tarjeta(html`
                <div class="fila fila--sep">
                  <div class="crece">
                    <div style="font-weight:650">${e.negocios.find((n) => n.id === o.negocioId)?.nombreComercial}</div>
                    <div class="tenue-2 mono">${o.codigo}</div>
                  </div>
                  ${crudo(insignia(ETIQUETA_ORDEN[o.estado], TONO_ORDEN[o.estado]))}
                </div>
              `, { accionIr: `/v/${o.tipo === 'reserva' ? 'reserva' : 'pedido'}/${o.id}` })),
            )}
          </div>`))
        : ''}

      ${crudo(buscador('q-inicio', 'Buscar comida, productos o paseos', '', 'buscar-inicio'))}

      <div class="rejilla rejilla--auto mb-2">
        ${crudo(tarjeta(html`<div class="centrado"><div style="font-size:24px" aria-hidden="true">⌗</div><div style="font-weight:650;font-size:13.5px;margin-top:4px">Escanear QR</div></div>`, { accionIr: '/v/qr', clase: 'tarjeta--plana' }))}
        ${crudo(tarjeta(html`<div class="centrado"><div style="font-size:24px" aria-hidden="true">◈</div><div style="font-weight:650;font-size:13.5px;margin-top:4px">Ver el mapa</div></div>`, { accionIr: `/v/mapa/${parqueId}`, clase: 'tarjeta--plana' }))}
      </div>

      ${crudo(seccion('Categorías', html`
        <div class="filtros">
          ${categorias.map(
            (c) => crudo(`<button class="chip" data-accion="ir" data-valor="/v/categorias?c=${esc(c)}">${esc(ICONO_CATEGORIA[c] ?? '')} ${esc(NOMBRE_CATEGORIA[c] ?? c)}</button>`),
          )}
        </div>
      `, { texto: 'Todas', ruta: '/v/categorias' }))}

      ${crudo(seccion(`Comercios en ${parque.nombre}`, html`
        <div class="pila">${lista.map((x) => crudo(tarjetaComercio(x.local, x.negocio)))}</div>
      `))}

      <p class="tenue-2 centrado mt-2">${formatearTasa(e.tasaBcv)}</p>
    `,
  };
};

export const escanearQr: Render = () => ({
  titulo: 'Escanear QR',
  atras: '/v',
  cabeceraClara: true,
  contenido: html`
    <h1 class="titulo-pag">Escanee el código del parque</h1>
    <p class="bajada">Encontrará el código en la entrada, en cada zona y en cada punto comercial.</p>
    <div style="aspect-ratio:1;background:var(--superficie-2);border:2px dashed var(--borde-fuerte);border-radius:var(--r-lg);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;margin-bottom:16px">
      <span aria-hidden="true" style="font-size:52px;color:var(--texto-3)">⌗</span>
      <p class="tenue" style="max-width:26ch;text-align:center">La cámara no está disponible en la demostración.</p>
    </div>
    ${crudo(aviso('info', 'Alternativa siempre disponible', 'Si no hay cámara o falla el permiso, puede escribir el código a mano. La cámara nunca es obligatoria.'))}
    <form class="mt-2" data-formulario="qr">
      ${crudo(entradaTexto('codigo', 'Código del punto', { valor: 'INP-PQ_ESTE-PT_JC_01', ayuda: 'Ejemplos: INP-PQ_ESTE-PT_JC_01, INP-PQ_ESTE-PT_LG_01' }))}
      <div id="error-qr"></div>
      ${crudo(boton('Continuar', { variante: 'principal', bloque: true, tipo: 'submit' }))}
    </form>
    <div class="mt-2">${crudo(boton('Elegir el parque de una lista', { variante: 'texto', bloque: true, accion: 'ir', valor: '/v/parques' }))}</div>
  `,
});

export const parques: Render = () => {
  const e = store.leer();
  return {
    titulo: 'Elegir parque',
    atras: '/v',
    cabeceraClara: true,
    contenido: html`
      <h1 class="titulo-pag">Parques</h1>
      <p class="bajada">La ubicación es opcional: puede elegir el parque a mano.</p>
      <div class="pila">
        ${e.parques.map((p) => {
          const n = localesAbiertos(p.id).length;
          return crudo(
            tarjeta(
              html`<div class="fila fila--sep">
                <div class="crece">
                  <div style="font-weight:650">${p.nombre}</div>
                  <div class="tenue-2">${p.horario}</div>
                </div>
                ${p.piloto ? crudo(insignia('Piloto', 'exito')) : crudo(insignia(n ? `${n} comercios` : 'Sin comercios', n ? 'neutro' : 'alerta'))}
              </div>`,
              { accionIr: `/v/parque/${p.id}` },
            ),
          );
        })}
      </div>
    `,
  };
};

export const parque: Render = (ctx) => {
  const e = store.leer();
  const p = e.parques.find((x) => x.id === ctx.params.parqueId);
  if (!p) return error404(ctx);
  estadoUi.filtros['parque'] = p.id;
  return inicio(ctx);
};

export const buscar: Render = () => {
  const e = store.leer();
  const q = texto('buscar').toLowerCase().trim();
  const parqueId = parquePorDefecto();
  const lista = localesAbiertos(parqueId);

  const negocios = q ? lista.filter((x) => x.negocio.nombreComercial.toLowerCase().includes(q)) : [];
  const articulos = q
    ? e.articulos.filter(
        (a) =>
          lista.some((x) => x.local.id === a.localId) &&
          (a.nombre.toLowerCase().includes(q) || a.descripcion.toLowerCase().includes(q) || a.categoria.toLowerCase().includes(q)),
      )
    : [];

  return {
    titulo: 'Buscar',
    contenido: html`
      ${crudo(buscador('q', 'Buscar comercios o artículos', texto('buscar'), 'buscar'))}
      ${!q
        ? crudo(vacio('⌕', 'Escriba para buscar', 'Puede buscar por nombre de comercio, de artículo o de categoría.'))
        : negocios.length + articulos.length === 0
          ? crudo(vacio('◌', 'Sin resultados', `No se encontró nada para "${q}". Pruebe con otra palabra.`))
          : crudo(html`
              ${negocios.length ? crudo(seccion(`Comercios (${negocios.length})`, html`<div class="pila">${negocios.map((x) => crudo(tarjetaComercio(x.local, x.negocio)))}</div>`)) : ''}
              ${articulos.length
                ? crudo(seccion(`Artículos (${articulos.length})`, html`<div class="pila">
                    ${articulos.map((a) => crudo(tarjetaArticulo(a)))}
                  </div>`))
                : ''}
            `)}
    `,
  };
};

function tarjetaArticulo(a: Articulo): string {
  const e = store.leer();
  const negocio = e.negocios.find((n) => n.id === a.negocioId);
  return tarjeta(
    html`<div class="fila">
      <div class="crece">
        <div style="font-weight:650;font-size:15px">${a.nombre}</div>
        <div class="tenue-2">${negocio?.nombreComercial ?? ''} · ${a.categoria}</div>
        ${a.alergenos.length ? crudo(`<div class="tenue-2 mt-1">Contiene: ${esc(a.alergenos.join(', '))}</div>`) : ''}
      </div>
      <div style="text-align:right">
        ${crudo(precio(a.precioUsd, e.tasaBcv.valor))}
        ${!a.disponible ? crudo(`<div class="mt-1">${insignia('Agotado', 'error')}</div>`) : ''}
      </div>
    </div>`,
    { accionIr: a.tipo === 'servicio' ? `/v/servicio/${a.id}` : `/v/articulo/${a.id}` },
  );
}

export const categorias: Render = (ctx) => {
  const sel = ctx.consulta.get('c') ?? filtro('categoria', 'todas');
  const lista = localesAbiertos(parquePorDefecto());
  const todas = [...new Set(lista.map((x) => x.negocio.categoria))];
  const filtrados = sel === 'todas' ? lista : lista.filter((x) => x.negocio.categoria === sel);

  return {
    titulo: 'Categorías',
    atras: '/v',
    contenido: html`
      ${crudo(chips(
        [{ valor: 'todas', texto: 'Todas' }, ...todas.map((c) => ({ valor: c, texto: `${ICONO_CATEGORIA[c] ?? ''} ${NOMBRE_CATEGORIA[c] ?? c}` }))],
        sel,
        'filtro-categoria',
      ))}
      <div class="fila fila--sep mb-1">
        <span class="tenue">${pluralizar(filtrados.length, 'comercio', 'comercios')}</span>
        ${crudo(boton('Filtros', { variante: 'texto', pequeno: true, accion: 'ir', valor: '/v/filtros' }))}
      </div>
      ${filtrados.length === 0
        ? crudo(vacio('◌', 'Nada en esta categoría', 'Todavía no hay comercios autorizados en esta categoría dentro del parque.'))
        : crudo(html`<div class="pila">${filtrados.map((x) => crudo(tarjetaComercio(x.local, x.negocio)))}</div>`)}
    `,
  };
};

export const filtros: Render = () => ({
  titulo: 'Filtros',
  atras: '/v/categorias',
  cabeceraClara: true,
  contenido: html`
    <h1 class="titulo-pag">Filtros</h1>
    ${crudo(seccion('Disponibilidad', html`
      ${crudo(opcionRadio('abierto', 'todos', 'Todos los comercios', undefined, filtro('abierto', 'todos') === 'todos'))}
      ${crudo(opcionRadio('abierto', 'abiertos', 'Solo abiertos ahora', undefined, filtro('abierto', 'todos') === 'abiertos'))}
    `))}
    ${crudo(seccion('Zona', html`
      ${store.leer().zonas.filter((z) => z.parqueId === parquePorDefecto()).map((z) =>
        crudo(opcionRadio('zona', z.id, z.nombre, undefined, filtro('zona', 'todas') === z.id)),
      )}
    `))}
    ${crudo(seccion('Modalidad', html`
      ${crudo(opcionRadio('cumpl', 'todas', 'Cualquiera', undefined, true))}
      ${crudo(opcionRadio('cumpl', 'retiro_inmediato', 'Retiro inmediato'))}
      ${crudo(opcionRadio('cumpl', 'retiro_programado', 'Retiro programado'))}
      ${crudo(opcionRadio('cumpl', 'mesa', 'Consumo en mesa'))}
    `))}
    ${crudo(aviso('info', 'Sin reparto', 'La beta no incluye delivery ni reparto a domicilio: solo retiro y consumo dentro del parque.'))}
    ${crudo(barraAccion([
      boton('Limpiar', { variante: 'secundario', accion: 'limpiar-filtros' }),
      boton('Aplicar', { variante: 'principal', accion: 'ir', valor: '/v/categorias' }),
    ]))}
  `,
});

export const mapa: Render = (ctx) => {
  const e = store.leer();
  const parqueId = ctx.params.parqueId ?? parquePorDefecto();
  const p = e.parques.find((x) => x.id === parqueId);
  if (!p) return error404(ctx);
  const zonas = e.zonas.filter((z) => z.parqueId === parqueId);
  const puntos = e.puntos.filter((x) => x.parqueId === parqueId && x.estado === 'ocupado');

  return {
    titulo: 'Mapa del parque',
    atras: '/v',
    contenido: html`
      <h1 class="titulo-pag">${p.nombre}</h1>
      <p class="bajada">Esquema interno de zonas y puntos comerciales.</p>
      <div class="mapa" role="img" aria-label="Esquema del parque con ${zonas.length} zonas y ${puntos.length} puntos comerciales">
        ${zonas.map((z) => crudo(`<button class="mapa__zona" style="left:${z.mapa.x}%;top:${z.mapa.y}%" data-accion="ir" data-valor="/v/zona/${esc(z.id)}">${esc(z.nombre)}</button>`))}
        ${puntos.map((pt) => {
          const local = e.locales.find((l) => l.puntoId === pt.id);
          return crudo(`<button class="mapa__punto" style="left:${pt.mapa.x}%;top:${pt.mapa.y}%" data-accion="ir" data-valor="${local ? `/v/comercio/${esc(local.negocioId)}` : '#'}" aria-label="${esc(pt.nombre)}"><span aria-hidden="true">●</span></button>`);
        })}
      </div>
      ${crudo(aviso('info', 'Esquema propio', 'No se usa ningún servicio de navegación pagado: el mapa es un esquema local del parque.'))}
      ${crudo(seccion('Zonas', html`<div class="pila">
        ${zonas.map((z) => {
          const n = e.locales.filter((l) => e.puntos.find((pt) => pt.id === l.puntoId)?.zonaId === z.id).length;
          return crudo(tarjeta(html`<div class="fila fila--sep">
            <div class="crece"><div style="font-weight:650">${z.nombre}</div><div class="tenue-2">${pluralizar(n, 'comercio', 'comercios')}</div></div>
            <span aria-hidden="true" style="color:var(--texto-3)">›</span>
          </div>`, { accionIr: `/v/zona/${z.id}` }));
        })}
      </div>`))}
    `,
  };
};

export const zona: Render = (ctx) => {
  const e = store.leer();
  const z = e.zonas.find((x) => x.id === ctx.params.zonaId);
  if (!z) return error404(ctx);
  const puntos = e.puntos.filter((p) => p.zonaId === z.id);
  const locales = e.locales.filter((l) => puntos.some((p) => p.id === l.puntoId));

  return {
    titulo: z.nombre,
    atras: `/v/mapa/${z.parqueId}`,
    contenido: html`
      <h1 class="titulo-pag">${z.nombre}</h1>
      <p class="bajada">${pluralizar(locales.length, 'comercio', 'comercios')} en esta zona.</p>
      ${locales.length === 0
        ? crudo(vacio('◌', 'Zona sin comercios', 'Todavía no hay puntos comerciales activos en esta zona.'))
        : crudo(html`<div class="pila">
            ${locales.map((l) => crudo(tarjetaComercio(l, e.negocios.find((n) => n.id === l.negocioId)!)))}
          </div>`)}
    `,
  };
};

// --------------------------------------------------------------------- Oferta

export const fichaComercio: Render = (ctx) => {
  const e = store.leer();
  const negocio = e.negocios.find((n) => n.id === ctx.params.negocioId);
  if (!negocio) return error404(ctx);
  const locales = e.locales.filter((l) => l.negocioId === negocio.id);
  const local = locales[0];
  const punto = e.puntos.find((p) => p.id === local?.puntoId);
  const zona = e.zonas.find((z) => z.id === punto?.zonaId);
  const val = e.valoraciones.filter((v) => v.negocioId === negocio.id);
  const media = val.length ? (val.reduce((s, v) => s + v.estrellas, 0) / val.length).toFixed(1) : null;

  const modos = [
    local?.cumplimiento.retiroInmediato ? 'Retiro inmediato' : null,
    local?.cumplimiento.retiroProgramado ? 'Retiro programado' : null,
    local?.cumplimiento.mesa ? 'Consumo en mesa' : null,
  ].filter(Boolean);

  return {
    titulo: negocio.nombreComercial,
    atras: '/v',
    contenido: html`
      <div class="fila mb-2">
        <span aria-hidden="true" style="font-size:38px">${ICONO_CATEGORIA[negocio.categoria] ?? '◻'}</span>
        <div class="crece">
          <h1 style="font-size:20px">${negocio.nombreComercial}</h1>
          <div class="tenue">${zona?.nombre ?? ''} · ${punto?.codigo ?? ''}</div>
          <div class="fila fila--envuelve mt-1" style="gap:6px">
            ${crudo(insignia(local?.abierto ? 'Abierto ahora' : 'Cerrado', local?.abierto ? 'exito' : 'neutro'))}
            ${media ? crudo(insignia(`★ ${media}`, 'neutro')) : ''}
          </div>
        </div>
      </div>

      ${modos.length ? crudo(aviso('info', 'Modalidades disponibles', modos.join(' · '))) : ''}

      <div class="fila mt-2" style="gap:8px">
        ${crudo(boton('Ver catálogo', { variante: 'principal', accion: 'ir', valor: `/v/comercio/${negocio.id}/catalogo` }))}
        ${crudo(boton('Cómo llegar', { variante: 'secundario', accion: 'ir', valor: `/v/como-llegar/${local?.id ?? ''}` }))}
      </div>

      ${crudo(seccion('Información', html`${crudo(listaDatos([
        ['Razón social', esc(negocio.razonSocial)],
        ['Categoría', esc(NOMBRE_CATEGORIA[negocio.categoria] ?? negocio.categoria)],
        ['Punto comercial', esc(punto?.nombre ?? '—')],
        ['Horario', local ? 'Martes a domingo, 07:00 a 17:00' : '—'],
      ]))}`))}

      ${val.length
        ? crudo(seccion(`Valoraciones (${val.length})`, html`<div class="pila">
            ${val.slice(0, 3).map((v) => crudo(tarjeta(html`
              <div class="fila fila--sep">
                <span aria-hidden="true" style="color:var(--alerta)">${'★'.repeat(v.estrellas)}</span>
                <span class="tenue-2">${desde(v.creadaEn)}</span>
              </div>
              ${v.comentario ? crudo(`<p class="tenue mt-1">${esc(v.comentario)}</p>`) : ''}
            `, { clase: 'tarjeta--plana' })))}
          </div>`))
        : ''}
    `,
  };
};

export const catalogo: Render = (ctx) => {
  const e = store.leer();
  const negocio = e.negocios.find((n) => n.id === ctx.params.negocioId);
  if (!negocio) return error404(ctx);
  const locales = e.locales.filter((l) => l.negocioId === negocio.id);
  const arts = e.articulos.filter((a) => locales.some((l) => l.id === a.localId));
  const cats = [...new Set(arts.map((a) => a.categoria))];
  const sel = filtro(`cat-${negocio.id}`, 'todas');
  const mostrados = sel === 'todas' ? arts : arts.filter((a) => a.categoria === sel);
  const unidades = unidadesEnCarrito(estadoUi.carrito);

  return {
    titulo: negocio.nombreComercial,
    subtitulo: 'Catálogo',
    atras: `/v/comercio/${negocio.id}`,
    contenido: html`
      ${cats.length > 1
        ? crudo(chips([{ valor: 'todas', texto: 'Todo' }, ...cats.map((c) => ({ valor: c, texto: c }))], sel, `filtro-cat:${negocio.id}`))
        : ''}
      ${mostrados.length === 0
        ? crudo(vacio('◌', 'Catálogo vacío', 'Este comercio todavía no publicó artículos.'))
        : crudo(html`<div class="pila">${mostrados.map((a) => crudo(tarjetaArticulo(a)))}</div>`)}
      ${unidades > 0
        ? crudo(barraAccion([
            boton(`Ver carrito · ${pluralizar(unidades, 'artículo', 'artículos')}`, { variante: 'principal', bloque: true, accion: 'ir', valor: '/v/carrito' }),
          ]))
        : ''}
    `,
  };
};

export const articulo: Render = (ctx) => {
  const e = store.leer();
  const a = e.articulos.find((x) => x.id === ctx.params.articuloId);
  if (!a) return error404(ctx);
  const negocio = e.negocios.find((n) => n.id === a.negocioId)!;
  const cantidad = Number(estadoUi.seleccion[`cant-${a.id}`] ?? '1');

  return {
    titulo: a.nombre,
    atras: `/v/comercio/${a.negocioId}/catalogo`,
    sinNav: true,
    contenido: html`
      <h1 class="titulo-pag">${a.nombre}</h1>
      <p class="bajada">${a.descripcion}</p>
      <div class="fila fila--sep mb-2">
        ${crudo(precio(a.precioUsd, e.tasaBcv.valor))}
        ${a.disponible
          ? crudo(insignia(typeof a.stock === 'number' ? `${a.stock} en existencia` : `${a.tiempoPrepMin} min`, typeof a.stock === 'number' && a.stock <= 3 ? 'alerta' : 'neutro'))
          : crudo(insignia('Agotado', 'error'))}
      </div>

      ${!a.disponible ? crudo(aviso('alerta', 'No disponible', 'El comercio marcó este artículo como agotado. Puede volver a intentar más tarde.')) : ''}

      ${a.alergenos.length ? crudo(aviso('alerta', 'Alérgenos', `Contiene ${a.alergenos.join(', ')}.`)) : ''}

      <form data-formulario="agregar" data-articulo="${a.id}">
        ${a.variantes.map((v) => crudo(seccion(v.nombre, html`
          ${v.opciones.map((o, i) =>
            crudo(opcionRadio(
              `var-${v.id}`, o.id, o.nombre,
              o.deltaUsd ? `+ ${formatearUsd(o.deltaUsd)}` : undefined,
              i === 0, !o.disponible,
            )),
          )}
        `)))}

        ${a.modificadores.map((m) => crudo(seccion(
          `${m.nombre}${m.obligatorio ? ' *' : ''}`,
          html`${m.opciones.map((o) =>
            crudo(opcionRadio(
              `mod-${m.id}`, o.id, o.nombre,
              o.deltaUsd ? `+ ${formatearUsd(o.deltaUsd)}` : undefined,
              false, !o.disponible,
            )),
          )}
          ${!m.obligatorio ? crudo('<p class="tenue-2 mt-1">Opcional</p>') : ''}`,
        )))}

        ${crudo(areaTexto('notas', 'Nota para el comercio', { marcador: 'Sin azúcar, para llevar…' }))}

        <div class="fila fila--sep mt-2">
          <span style="font-weight:600">Cantidad</span>
          ${crudo(contador(cantidad, 'cant-menos', 'cant-mas', a.id, a.stock))}
        </div>
        <div id="error-agregar" class="mt-1"></div>
      </form>

      ${crudo(barraAccion([
        boton(
          a.disponible ? `Agregar · ${formatearUsd(a.precioUsd * cantidad)}` : 'No disponible',
          { variante: 'principal', bloque: true, accion: 'agregar-carrito', valor: a.id, desactivado: !a.disponible },
        ),
      ]))}
      <p class="tenue-2 centrado mt-1">${negocio.nombreComercial}</p>
    `,
  };
};

export const servicio: Render = (ctx) => {
  const e = store.leer();
  const a = e.articulos.find((x) => x.id === ctx.params.articuloId);
  if (!a) return error404(ctx);
  const hoy = new Date().toISOString().slice(0, 10);
  const fechaSel = estadoUi.seleccion[`fecha-${a.id}`] ?? hoy;
  const franjas = e.franjas.filter((f) => f.articuloId === a.id && f.fecha === fechaSel);
  const franjaSel = estadoUi.seleccion[`franja-${a.id}`];
  const cantidad = Number(estadoUi.seleccion[`cant-${a.id}`] ?? '1');

  const fechas = [...new Set(e.franjas.filter((f) => f.articuloId === a.id).map((f) => f.fecha))].slice(0, 7);

  return {
    titulo: a.nombre,
    atras: `/v/comercio/${a.negocioId}/catalogo`,
    sinNav: true,
    contenido: html`
      <h1 class="titulo-pag">${a.nombre}</h1>
      <p class="bajada">${a.descripcion}</p>
      <div class="fila fila--sep mb-2">
        ${crudo(precio(a.precioUsd, e.tasaBcv.valor))}
        ${crudo(insignia(`${a.duracionMin} min`, 'neutro'))}
      </div>

      ${crudo(seccion('Fecha', html`
        <div class="filtros">
          ${fechas.map((f) => crudo(`<button class="chip" aria-pressed="${f === fechaSel}" data-accion="fecha-servicio" data-valor="${esc(a.id)}|${esc(f)}">${esc(fechaCorta(`${f}T12:00:00`))}</button>`))}
        </div>
      `))}

      ${crudo(seccion('Horario', html`
        ${franjas.length === 0
          ? crudo(vacio('◷', 'Sin horarios', 'No hay franjas publicadas para esta fecha.'))
          : crudo(html`<div class="rejilla rejilla--auto">
              ${franjas.map((f) => {
                const libre = f.cupoTotal - f.cupoTomado;
                const agotado = libre <= 0;
                const insuf = !agotado && libre < cantidad;
                return crudo(`<button class="opcion" style="flex-direction:column;align-items:flex-start;gap:2px${agotado || insuf ? ';opacity:.5' : ''}"
                  aria-checked="${f.id === franjaSel}" ${agotado || insuf ? 'disabled' : ''}
                  data-accion="franja-servicio" data-valor="${esc(a.id)}|${esc(f.id)}">
                  <span style="font-weight:650">${esc(f.desde)}</span>
                  <span class="tenue-2">${agotado ? 'Sin cupo' : `${libre} de ${f.cupoTotal}`}</span>
                </button>`);
              })}
            </div>`)}
      `))}

      <div class="fila fila--sep">
        <span style="font-weight:600">Personas</span>
        ${crudo(contador(cantidad, 'cant-menos', 'cant-mas', a.id, a.cupoPorFranja))}
      </div>

      ${crudo(aviso('info', 'Condiciones', 'Presentarse 10 minutos antes. Incluye equipo de seguridad. Cancelación sin costo hasta 2 horas antes.'))}
      <div id="error-agregar" class="mt-1"></div>

      ${crudo(barraAccion([
        boton(
          franjaSel ? `Reservar · ${formatearUsd(a.precioUsd * cantidad)}` : 'Elija un horario',
          { variante: 'principal', bloque: true, accion: 'agregar-servicio', valor: a.id, desactivado: !franjaSel },
        ),
      ]))}
    `,
  };
};

export const comoLlegar: Render = (ctx) => {
  const e = store.leer();
  const local = e.locales.find((l) => l.id === ctx.params.localId);
  if (!local) return error404(ctx);
  const punto = e.puntos.find((p) => p.id === local.puntoId)!;
  const zona = e.zonas.find((z) => z.id === punto.zonaId)!;
  const negocio = e.negocios.find((n) => n.id === local.negocioId)!;

  return {
    titulo: 'Cómo llegar',
    atras: `/v/comercio/${negocio.id}`,
    contenido: html`
      <h1 class="titulo-pag">${negocio.nombreComercial}</h1>
      <p class="bajada">${zona.nombre} · punto ${punto.codigo}</p>
      <div class="mapa" role="img" aria-label="Ubicación de ${negocio.nombreComercial} en la zona ${zona.nombre}">
        <div class="mapa__zona" style="left:${zona.mapa.x}%;top:${zona.mapa.y}%" aria-hidden="true">${zona.nombre}</div>
        <div class="mapa__punto" style="left:${punto.mapa.x}%;top:${punto.mapa.y}%;width:34px;height:34px" aria-hidden="true">●</div>
      </div>
      ${crudo(seccion('Indicaciones', html`
        ${crudo(lineaTiempo([
          { titulo: 'Entrada Norte', detalle: 'Punto de referencia inicial', estado: 'hecho' },
          { titulo: `Camine hacia ${zona.nombre}`, detalle: 'Siga la señalización interna del parque', estado: 'activo' },
          { titulo: punto.nombre, detalle: `Punto ${punto.codigo}`, estado: 'pendiente' },
        ]))}
      `))}
      ${crudo(aviso('info', 'Sin navegación externa', 'La demo usa el esquema interno del parque; no depende de ningún proveedor de mapas pagado.'))}
    `,
  };
};

// --------------------------------------------------------------------- Compra

export const carrito: Render = () => {
  const e = store.leer();
  const c = estadoUi.carrito;
  const negocio = c.negocioId ? e.negocios.find((n) => n.id === c.negocioId) : null;
  const t = totalesCarrito(c, e.tasaBcv.valor);

  if (c.items.length === 0) {
    return {
      titulo: 'Carrito',
      contenido: vacio('▤', 'Su carrito está vacío', 'Elija un comercio del parque y agregue lo que desee.', 'Ver comercios', '/v'),
    };
  }

  return {
    titulo: 'Carrito',
    subtitulo: negocio?.nombreComercial,
    contenido: html`
      ${crudo(aviso('info', 'Un comercio por pedido', `Este carrito es de ${negocio?.nombreComercial}. Para pedir en otro comercio deberá vaciarlo o terminar este pedido primero.`))}

      <div class="pila mt-2">
        ${c.items.map((i) => {
          const extras = extrasDeItem(i);
          const total = (i.precioUnitarioUsd + extras) * i.cantidad;
          return crudo(tarjeta(html`
            <div class="fila fila--sep">
              <div class="crece">
                <div style="font-weight:650">${i.nombre}</div>
                ${i.seleccionVariantes.map((v) => crudo(`<div class="tenue-2">${esc(v.nombre)}</div>`))}
                ${i.seleccionModificadores.map((m) => crudo(`<div class="tenue-2">+ ${esc(m.nombre)}</div>`))}
                ${i.notas ? crudo(`<div class="tenue-2">Nota: ${esc(i.notas)}</div>`) : ''}
              </div>
              <div style="text-align:right">${crudo(precio(total, e.tasaBcv.valor))}</div>
            </div>
            <div class="fila fila--sep mt-2">
              ${crudo(contador(i.cantidad, 'item-menos', 'item-mas', i.id))}
              ${crudo(boton('Quitar', { variante: 'texto', pequeno: true, accion: 'quitar-item', valor: i.id }))}
            </div>
          `));
        })}
      </div>

      ${crudo(seccion('Resumen', html`${crudo(listaDatos([
        ['Subtotal', formatearUsd(t.subtotalUsd)],
        ['IVA (16 %)', formatearUsd(t.impuestosUsd)],
        ['Total en USD', `<strong>${formatearUsd(t.totalUsd)}</strong>`],
        ['Monto pagadero', `<strong>${formatearVes(t.totalVes)}</strong>`],
      ]))}
      <p class="tenue-2 mt-1">${formatearTasa(e.tasaBcv)}</p>`))}

      ${crudo(barraAccion([
        boton('Continuar', { variante: 'principal', bloque: true, accion: 'ir', valor: '/v/checkout' }),
      ]))}
    `,
  };
};

export const checkout: Render = () => {
  const e = store.leer();
  const c = estadoUi.carrito;
  if (c.items.length === 0) return carrito({ params: {}, consulta: new URLSearchParams(), ruta: '/v/carrito' });

  const local = e.locales.find((l) => l.id === c.localId)!;
  const negocio = e.negocios.find((n) => n.id === c.negocioId)!;
  const t = totalesCarrito(c, e.tasaBcv.valor);
  const s = sesion.activa();
  const u = sesion.usuario();

  return {
    titulo: 'Confirmar pedido',
    atras: '/v/carrito',
    sinNav: true,
    contenido: html`
      <form data-formulario="checkout">
        ${crudo(seccion('Comercio', html`${crudo(listaDatos([
          ['Comercio', esc(negocio.nombreComercial)],
          ['Punto', esc(e.puntos.find((p) => p.id === local.puntoId)?.nombre ?? '—')],
          ['Artículos', String(unidadesEnCarrito(c))],
        ]))}`))}

        ${crudo(seccion('Cómo lo retira', html`
          ${local.cumplimiento.retiroInmediato ? crudo(opcionRadio('cumplimiento', 'retiro_inmediato', 'Retiro inmediato', 'Listo en unos minutos, retira en el mostrador', true)) : ''}
          ${local.cumplimiento.retiroProgramado ? crudo(opcionRadio('cumplimiento', 'retiro_programado', 'Retiro programado', 'Elige la hora de retiro', !local.cumplimiento.retiroInmediato)) : ''}
          ${local.cumplimiento.mesa ? crudo(opcionRadio('cumplimiento', 'mesa', 'Consumo en mesa', 'Le llevan el pedido a la mesa del local')) : ''}
          <p class="tenue-2 mt-1">Este local no ofrece reparto: la beta solo contempla retiro y consumo dentro del parque.</p>
        `))}

        ${crudo(seccion('Sus datos', html`
          ${crudo(entradaTexto('nombre', 'Nombre para el pedido', {
            requerido: true,
            valor: u?.nombre ?? '',
            autocompletar: 'name',
            ayuda: s?.invitado ? 'Compra como invitado: solo se guarda el nombre.' : undefined,
          }))}
        `))}

        ${crudo(seccion('Resumen', html`${crudo(listaDatos([
          ['Subtotal', formatearUsd(t.subtotalUsd)],
          ['IVA (16 %)', formatearUsd(t.impuestosUsd)],
          ['Total en USD', `<strong>${formatearUsd(t.totalUsd)}</strong>`],
          ['Monto pagadero', `<strong>${formatearVes(t.totalVes)}</strong>`],
        ]))}`))}

        <div id="error-checkout"></div>
      </form>

      ${crudo(barraAccion([
        boton('Elegir forma de pago', { variante: 'principal', bloque: true, accion: 'ir-pago' }),
      ]))}
    `,
  };
};

export const seleccionPago: Render = () => {
  const e = store.leer();
  const t = totalesCarrito(estadoUi.carrito, e.tasaBcv.valor);
  return {
    titulo: 'Forma de pago',
    atras: '/v/checkout',
    sinNav: true,
    contenido: html`
      <h1 class="titulo-pag">¿Cómo desea pagar?</h1>
      <p class="bajada">Monto pagadero: <strong>${formatearVes(t.totalVes)}</strong> · ${formatearUsd(t.totalUsd)}</p>
      ${crudo(etiquetaDemo())}
      <div class="pila mt-2">
        ${crudo(tarjeta(html`<div class="fila"><span aria-hidden="true" style="font-size:22px">▣</span><div class="crece"><div style="font-weight:650">Pago Móvil</div><div class="tenue-2">Se verifica con el banco antes de confirmar</div></div><span aria-hidden="true">›</span></div>`, { accionIr: '/v/checkout/pago/pago-movil' }))}
        ${crudo(tarjeta(html`<div class="fila"><span aria-hidden="true" style="font-size:22px">⇄</span><div class="crece"><div style="font-weight:650">Transferencia</div><div class="tenue-2">Para montos mayores; conciliación por referencia</div></div><span aria-hidden="true">›</span></div>`, { accionIr: '/v/checkout/pago/transferencia' }))}
        ${crudo(tarjeta(html`<div class="fila"><span aria-hidden="true" style="font-size:22px">▤</span><div class="crece"><div style="font-weight:650">Tarjeta</div><div class="tenue-2">Débito o crédito</div></div><span aria-hidden="true">›</span></div>`, { accionIr: '/v/checkout/pago/tarjeta' }))}
        ${crudo(tarjeta(html`<div class="fila"><span aria-hidden="true" style="font-size:22px">◎</span><div class="crece"><div style="font-weight:650">Efectivo en el punto</div><div class="tenue-2">Paga al retirar; queda registrado en caja</div></div><span aria-hidden="true">›</span></div>`, { accionIr: '/v/checkout/pago/efectivo' }))}
      </div>
      ${crudo(aviso('info', 'Nunca se piden datos reales', 'La demo no almacena números completos de tarjeta ni códigos de seguridad. Todos los pagos los resuelve un adaptador simulado.'))}
    `,
  };
};

function paginaPago(metodo: string, titulo: string, campos: string, nota: string): Pagina {
  const e = store.leer();
  const t = totalesCarrito(estadoUi.carrito, e.tasaBcv.valor);
  return {
    titulo,
    atras: '/v/checkout/pago',
    sinNav: true,
    contenido: html`
      <h1 class="titulo-pag">${titulo}</h1>
      <p class="bajada">Monto pagadero: <strong>${formatearVes(t.totalVes)}</strong></p>
      ${crudo(etiquetaDemo())}
      <form class="mt-2" data-formulario="pago" data-metodo="${metodo}">
        ${crudo(campos)}
        <div id="error-pago"></div>
      </form>
      ${crudo(aviso('info', 'Cómo se comporta la demo', nota))}
      ${crudo(barraAccion([
        boton(`Pagar ${formatearVes(t.totalVes)}`, { variante: 'principal', bloque: true, accion: 'pagar', valor: metodo }),
      ]))}
    `,
  };
}

export const pagoMovil: Render = () =>
  paginaPago(
    'pago_movil',
    'Pago Móvil',
    html`${crudo(listaDatos([
      ['Banco receptor', 'Banco Demo Nacional'],
      ['RIF', 'J-41025896-7'],
      ['Teléfono', '0414-0000000'],
    ]))}
    <div class="mt-2">
      ${crudo(entradaTexto('referencia', 'Número de referencia', { modo: 'numeric', requerido: true, marcador: '123456', ayuda: 'Escriba 000000 para probar un pago fallido.' }))}
      ${crudo(entradaTexto('telefono', 'Teléfono emisor', { tipo: 'tel', modo: 'tel', marcador: '0414-0000000' }))}
    </div>`,
    'El pago queda pendiente de verificación: el documento advierte que nunca debe aceptarse la captura como prueba final. El comercio lo verifica contra el banco.',
  );

export const pagoTransferencia: Render = () =>
  paginaPago(
    'transferencia',
    'Transferencia',
    html`${crudo(listaDatos([
      ['Banco', 'Banco Demo Nacional'],
      ['Cuenta', '0102 •••• •••• 1234'],
      ['Titular', 'Inversiones Los Cedros, C.A.'],
    ]))}
    <div class="mt-2">
      ${crudo(entradaTexto('referencia', 'Referencia bancaria', { modo: 'numeric', requerido: true, ayuda: 'Escriba 000000 para probar un pago fallido.' }))}
    </div>`,
    'La transferencia se concilia por referencia, monto y fecha. Hasta que el banco confirme, el pago aparece como pendiente de verificación.',
  );

export const pagoTarjeta: Render = () =>
  paginaPago(
    'tarjeta',
    'Tarjeta',
    html`${crudo(entradaTexto('titular', 'Nombre en la tarjeta', { requerido: true, autocompletar: 'cc-name' }))}
    ${crudo(entradaTexto('numero', 'Número de tarjeta', { modo: 'numeric', requerido: true, marcador: '4111 1111 1111 1111', ayuda: 'Datos ficticios. No se almacena el número.' }))}
    <div class="fila" style="gap:10px">
      <div class="crece">${crudo(entradaTexto('vence', 'Vence', { marcador: 'MM/AA' }))}</div>
      <div class="crece">${crudo(entradaTexto('cvv', 'Código', { modo: 'numeric', marcador: '123' }))}</div>
    </div>`,
    'La plataforma no almacena el número completo ni el código de seguridad: en producción se usaría el token del adquirente.',
  );

export const pagoEfectivo: Render = () =>
  paginaPago(
    'efectivo',
    'Efectivo en el punto',
    html`${crudo(aviso('alerta', 'Pague al retirar', 'El pedido se prepara y usted paga en el mostrador. El operador registra el cobro en la caja.'))}`,
    'El efectivo se confirma en el punto, no por el banco, y entra en el cierre de turno del local junto con las ventas de la aplicación.',
  );

export const confirmacion: Render = (ctx) => {
  const e = store.leer();
  const ordenId = ctx.consulta.get('orden') ?? '';
  const orden = e.ordenes.find((o) => o.id === ordenId);
  if (!orden) return error404(ctx);
  const pago = e.pagos.find((p) => p.ordenId === orden.id)!;
  const fallido = pago.estado === 'fallido';

  return {
    titulo: fallido ? 'Pago no completado' : 'Pedido recibido',
    sinNav: true,
    cabeceraClara: true,
    contenido: html`
      <div class="centrado" style="padding:26px 0 12px">
        <div style="font-size:52px;color:${crudo(fallido ? 'var(--error)' : 'var(--exito)')}" aria-hidden="true">${fallido ? '✕' : '✓'}</div>
        <h1 style="font-size:21px;margin-top:8px">${fallido ? 'El pago no se completó' : '¡Listo!'}</h1>
        <p class="tenue mt-1">${fallido ? 'El banco no reporta el movimiento. Puede reintentar con otra referencia.' : 'El comercio recibió su pedido.'}</p>
      </div>

      ${crudo(listaDatos([
        ['Código', `<span class="mono">${esc(orden.codigo)}</span>`],
        ['Comercio', esc(e.negocios.find((n) => n.id === orden.negocioId)?.nombreComercial ?? '')],
        ['Estado del pedido', ETIQUETA_ORDEN[orden.estado]],
        ['Estado del pago', ETIQUETA_PAGO[pago.estado]],
        ['Total', `${formatearUsd(orden.totalUsd)} · ${formatearVes(orden.totalVes)}`],
      ]))}

      ${!fallido && pago.estado === 'pendiente_verificacion'
        ? crudo(html`<div class="mt-2">${crudo(aviso('alerta', 'Pago pendiente de verificación', 'El comercio confirmará el pago con el banco. El pedido avanza por separado del pago.'))}</div>`)
        : ''}

      ${crudo(barraAccion(
        fallido
          ? [boton('Reintentar el pago', { variante: 'principal', bloque: true, accion: 'ir', valor: '/v/checkout/pago' })]
          : [boton('Seguir mi pedido', { variante: 'principal', bloque: true, accion: 'ir', valor: `/v/${orden.tipo === 'reserva' ? 'reserva' : 'pedido'}/${orden.id}` })],
      ))}
    `,
  };
};

// ---------------------------------------------------------------- Seguimiento

function paginaSeguimiento(ctx: Parameters<Render>[0], esReserva: boolean): Pagina {
  const e = store.leer();
  const orden = e.ordenes.find((o) => o.id === ctx.params.ordenId);
  if (!orden) return error404(ctx);
  const pago = e.pagos.find((p) => p.ordenId === orden.id);
  const factura = e.facturas.find((f) => f.ordenId === orden.id);
  const negocio = e.negocios.find((n) => n.id === orden.negocioId)!;

  const secuencia: Array<[string, string]> = esReserva
    ? [['pendiente_aceptacion', 'Reserva recibida'], ['aceptada', 'Confirmada'], ['lista', 'Lista para el turno'], ['entregada', 'Completada']]
    : [['pendiente_aceptacion', 'Recibido'], ['aceptada', 'Aceptado'], ['preparando', 'En preparación'], ['lista', 'Listo para retirar'], ['entregada', 'Entregado']];

  const idx = secuencia.findIndex(([s]) => s === orden.estado);
  const pasos = secuencia.map(([, titulo], i) => ({
    titulo,
    estado: (orden.estado === 'cancelada' ? 'pendiente' : i < idx ? 'hecho' : i === idx ? 'activo' : 'pendiente') as 'hecho' | 'activo' | 'pendiente',
  }));

  return {
    titulo: orden.codigo,
    subtitulo: negocio.nombreComercial,
    atras: '/v/historial',
    contenido: html`
      ${orden.estado === 'cancelada' ? crudo(aviso('error', 'Pedido cancelado', 'Consulte el historial de la operación para ver el motivo.')) : ''}

      ${orden.estado === 'lista'
        ? crudo(tarjeta(html`
            <div class="centrado">
              <p class="tenue">Presente este código en el punto</p>
              <div class="mono" style="font-size:30px;font-weight:700;letter-spacing:0.1em;margin:8px 0">${orden.codigoRetiro}</div>
              ${crudo(boton('Ver código QR', { variante: 'principal', accion: 'ir', valor: `/v/pedido/${orden.id}/qr` }))}
            </div>
          `))
        : ''}

      ${crudo(seccion('Estado del pedido', html`${crudo(lineaTiempo(pasos))}`))}

      ${crudo(seccion('Estados por separado', html`${crudo(listaDatos([
        ['Pedido', insignia(ETIQUETA_ORDEN[orden.estado], TONO_ORDEN[orden.estado])],
        ['Pago', pago ? insignia(ETIQUETA_PAGO[pago.estado], TONO_PAGO[pago.estado]) : '—'],
        ['Factura', factura ? insignia(factura.estado === 'emitida' ? 'Emitida' : factura.estado, factura.estado === 'emitida' ? 'exito' : 'neutro') : insignia('Pendiente', 'neutro')],
      ]))}
      <p class="tenue-2 mt-1">El pedido, el pago y la factura avanzan por separado: uno puede estar listo mientras otro sigue pendiente.</p>`))}

      ${crudo(seccion('Detalle', html`
        <div class="pila">
          ${orden.items.map((i) => crudo(tarjeta(html`
            <div class="fila fila--sep">
              <div class="crece">
                <div style="font-weight:600">${i.cantidad} × ${i.nombre}</div>
                ${i.seleccionVariantes.map((v) => crudo(`<div class="tenue-2">${esc(v.nombre)}</div>`))}
                ${i.seleccionModificadores.map((m) => crudo(`<div class="tenue-2">+ ${esc(m.nombre)}</div>`))}
              </div>
              <span class="precio">${formatearUsd((i.precioUnitarioUsd + extrasDeItem(i)) * i.cantidad)}</span>
            </div>
          `, { clase: 'tarjeta--plana' })))}
        </div>
        <div class="mt-2">${crudo(listaDatos([
          ['Total en USD', formatearUsd(orden.totalUsd)],
          ['Monto pagado', formatearVes(orden.totalVes)],
          ['Tasa aplicada', `${orden.tasaBcv.toFixed(2)} Bs/USD · ${fechaCorta(orden.tasaBcvFecha)}`],
        ]))}</div>
        <p class="tenue-2 mt-1">La tasa quedó congelada al registrar la venta y no se recalcula.</p>
      `))}

      ${crudo(seccion('Historial de la operación', html`
        ${crudo(lineaTiempo(orden.historial.map((h) => ({
          titulo: ETIQUETA_ORDEN[h.a as keyof typeof ETIQUETA_ORDEN] ?? h.a,
          detalle: `${fechaHora(h.en)}${h.motivo ? ` · ${h.motivo}` : ''}`,
          estado: 'hecho' as const,
        }))))}
      `))}

      <div class="pila mt-2">
        ${crudo(boton('Ver comprobante', { bloque: true, accion: 'ir', valor: `/v/comprobante/${orden.id}` }))}
        ${factura ? crudo(boton('Ver factura del comercio', { bloque: true, accion: 'ir', valor: `/v/factura/${orden.id}` })) : ''}
        ${orden.estado === 'entregada' ? crudo(boton('Valorar', { bloque: true, accion: 'ir', valor: `/v/valorar/${orden.id}` })) : ''}
        ${crudo(boton('Tengo un problema', { variante: 'texto', bloque: true, accion: 'ir', valor: `/v/reclamo/${orden.id}` }))}
      </div>
    `,
  };
}

export const seguimientoPedido: Render = (ctx) => paginaSeguimiento(ctx, false);
export const seguimientoReserva: Render = (ctx) => paginaSeguimiento(ctx, true);

export const codigoRetiro: Render = (ctx) => {
  const e = store.leer();
  const orden = e.ordenes.find((o) => o.id === ctx.params.ordenId);
  if (!orden) return error404(ctx);

  // Cuadrícula determinista a partir del código: representa el QR sin
  // depender de ninguna librería externa.
  const celdas: string[] = [];
  const semilla = orden.codigoRetiro.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  for (let i = 0; i < 169; i++) {
    const activo = (i * 7 + semilla * 13 + Math.floor(i / 13) * 31) % 3 === 0;
    celdas.push(`<div style="background:${activo ? 'var(--texto)' : 'transparent'}"></div>`);
  }

  return {
    titulo: 'Código de retiro',
    atras: `/v/pedido/${orden.id}`,
    sinNav: true,
    cabeceraClara: true,
    contenido: html`
      <div class="centrado">
        <h1 class="titulo-pag">${orden.codigo}</h1>
        <p class="bajada">Muestre este código al retirar</p>
        <div style="display:grid;grid-template-columns:repeat(13,1fr);gap:2px;width:min(80vw,260px);aspect-ratio:1;margin:0 auto;padding:14px;background:#fff;border-radius:var(--r-md);border:1px solid var(--borde)"
          role="img" aria-label="Código QR del pedido ${orden.codigo}">
          ${crudo(celdas.join(''))}
        </div>
        <div class="mono" style="font-size:26px;font-weight:700;letter-spacing:0.1em;margin-top:16px">${orden.codigoRetiro}</div>
        <p class="tenue-2 mt-1">Si el lector falla, el operador puede escribir el código.</p>
      </div>
    `,
  };
};

export const historial: Render = () => {
  const e = store.leer();
  const s = sesion.activa();
  const f = filtro('historial', 'todos');
  let mias = e.ordenes.filter((o) => (s?.usuarioId && o.clienteId === s.usuarioId) || (s?.invitado && o.invitado && o.canal === 'app'));
  mias = mias.sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));

  if (f === 'curso') mias = mias.filter((o) => o.estado !== 'entregada' && o.estado !== 'cancelada');
  if (f === 'completados') mias = mias.filter((o) => o.estado === 'entregada');

  return {
    titulo: 'Mis pedidos',
    contenido: html`
      ${crudo(chips(
        [{ valor: 'todos', texto: 'Todos' }, { valor: 'curso', texto: 'En curso' }, { valor: 'completados', texto: 'Completados' }],
        f,
        'filtro-historial',
      ))}
      ${mias.length === 0
        ? crudo(vacio('▤', 'Todavía no hay pedidos', s?.invitado ? 'Las compras como invitado no se conservan al cerrar el navegador.' : 'Cuando haga un pedido aparecerá aquí.', 'Ver comercios', '/v'))
        : crudo(html`<div class="pila">
            ${mias.map((o) => {
              const pago = e.pagos.find((p) => p.ordenId === o.id);
              return crudo(tarjeta(html`
                <div class="fila fila--sep">
                  <div class="crece">
                    <div style="font-weight:650">${e.negocios.find((n) => n.id === o.negocioId)?.nombreComercial}</div>
                    <div class="tenue-2 mono">${o.codigo} · ${desde(o.creadaEn)}</div>
                  </div>
                  <div style="text-align:right">
                    <div class="precio">${formatearUsd(o.totalUsd)}</div>
                  </div>
                </div>
                <div class="fila fila--envuelve mt-2" style="gap:6px">
                  ${crudo(insignia(ETIQUETA_ORDEN[o.estado], TONO_ORDEN[o.estado]))}
                  ${pago ? crudo(insignia(ETIQUETA_PAGO[pago.estado], TONO_PAGO[pago.estado])) : ''}
                </div>
              `, { accionIr: `/v/${o.tipo === 'reserva' ? 'reserva' : 'pedido'}/${o.id}` }));
            })}
          </div>`)}
    `,
  };
};

export const comprobante: Render = (ctx) => {
  const e = store.leer();
  const o = e.ordenes.find((x) => x.id === ctx.params.ordenId);
  if (!o) return error404(ctx);
  const pago = e.pagos.find((p) => p.ordenId === o.id);
  const negocio = e.negocios.find((n) => n.id === o.negocioId)!;

  return {
    titulo: 'Comprobante',
    atras: `/v/pedido/${o.id}`,
    contenido: html`
      ${crudo(aviso('alerta', 'Esto no es una factura fiscal', 'El comprobante del pedido y la factura son documentos distintos. La factura la emite el comercio.'))}
      <div class="mt-2">${crudo(tarjeta(html`
        <div class="centrado mb-2">
          <div style="font-weight:700;font-size:17px">${negocio.nombreComercial}</div>
          <div class="tenue-2">Comprobante de pedido</div>
          <div class="mono tenue-2">${o.codigo}</div>
        </div>
        <hr class="sep" />
        ${o.items.map((i) => crudo(`<div class="fila fila--sep" style="padding:5px 0">
          <span class="crece">${i.cantidad} × ${esc(i.nombre)}</span>
          <span class="precio">${esc(formatearUsd((i.precioUnitarioUsd + extrasDeItem(i)) * i.cantidad))}</span>
        </div>`))}
        <hr class="sep" />
        ${crudo(listaDatos([
          ['Subtotal', formatearUsd(o.subtotalUsd)],
          ['IVA (16 %)', formatearUsd(o.impuestosUsd)],
          ['Total', `<strong>${formatearUsd(o.totalUsd)}</strong>`],
          ['Pagado', formatearVes(o.totalVes)],
          ['Tasa', `${o.tasaBcv.toFixed(2)} Bs/USD`],
          ['Método', pago ? pago.metodo.replace('_', ' ') : '—'],
          ['Referencia', pago?.referencia ?? 'No aplica'],
          ['Fecha', fechaHora(o.creadaEn)],
        ]))}
      `))}</div>
      <div class="mt-2">${crudo(boton('Imprimir o guardar', { bloque: true, accion: 'imprimir' }))}</div>
    `,
  };
};

export const facturaVisitante: Render = (ctx) => {
  const e = store.leer();
  const o = e.ordenes.find((x) => x.id === ctx.params.ordenId);
  if (!o) return error404(ctx);
  const f = e.facturas.find((x) => x.ordenId === o.id);
  if (!f) {
    return {
      titulo: 'Factura',
      atras: `/v/pedido/${o.id}`,
      contenido: vacio('▤', 'Todavía sin factura', 'El comercio aún no ha emitido la factura de este pedido.'),
    };
  }

  return {
    titulo: 'Factura',
    atras: `/v/pedido/${o.id}`,
    contenido: html`
      ${crudo(aviso('info', 'Emitida por el comercio', `El emisor fiscal es ${f.emisorRazonSocial}, no INPARQUES. Documento de prueba generado por un adaptador simulado.`))}
      <div class="mt-2">${crudo(tarjeta(html`
        <div class="centrado mb-2">
          <div style="font-weight:700">${f.emisorRazonSocial}</div>
          <div class="tenue-2 mono">RIF ${f.emisorRif}</div>
        </div>
        <hr class="sep" />
        ${crudo(listaDatos([
          ['Factura N.º', `<span class="mono">${esc(f.numero)}</span>`],
          ['N.º de control', `<span class="mono">${esc(f.numeroControl)}</span>`],
          ['Fecha', f.emitidaEn ? fechaHora(f.emitidaEn) : '—'],
          ['Base imponible', formatearUsd(f.baseImponibleUsd)],
          ['IVA (16 %)', formatearUsd(f.ivaUsd)],
          ['Total', `<strong>${formatearUsd(f.totalUsd)}</strong>`],
          ['Total en bolívares', formatearVes(f.totalVes)],
          ['Tasa aplicada', `${f.tasaBcv.toFixed(2)} Bs/USD`],
          ['Emisor técnico', `<span class="mono">${esc(f.adaptador)}</span>`],
        ]))}
      `))}</div>
      <div class="mt-2">${crudo(boton('Imprimir o guardar', { bloque: true, accion: 'imprimir' }))}</div>
    `,
  };
};

export const valorarVista: Render = (ctx) => {
  const e = store.leer();
  const o = e.ordenes.find((x) => x.id === ctx.params.ordenId);
  if (!o) return error404(ctx);
  const ya = e.valoraciones.find((v) => v.ordenId === o.id);

  if (ya) {
    return {
      titulo: 'Valoración',
      atras: `/v/pedido/${o.id}`,
      contenido: html`
        ${crudo(vacio('★', 'Ya valoró este pedido', `Le dio ${ya.estrellas} de 5 estrellas.`))}
        ${ya.comentario ? crudo(tarjeta(html`<p class="tenue">${ya.comentario}</p>`)) : ''}
      `,
    };
  }

  const sel = Number(estadoUi.seleccion[`estrellas-${o.id}`] ?? '0');

  return {
    titulo: 'Valorar',
    atras: `/v/pedido/${o.id}`,
    sinNav: true,
    contenido: html`
      <h1 class="titulo-pag">¿Cómo estuvo su pedido?</h1>
      <p class="bajada">${e.negocios.find((n) => n.id === o.negocioId)?.nombreComercial} · ${o.codigo}</p>
      <div class="fila centrado" style="justify-content:center;gap:6px;margin:20px 0" role="radiogroup" aria-label="Calificación de 1 a 5 estrellas">
        ${[1, 2, 3, 4, 5].map((n) => crudo(`<button class="icono-bt" style="font-size:34px;color:${n <= sel ? 'var(--alerta)' : 'var(--borde-fuerte)'};width:52px;height:52px"
          data-accion="estrellas" data-valor="${esc(o.id)}|${n}" role="radio" aria-checked="${n <= sel}" aria-label="${n} estrella${n > 1 ? 's' : ''}">★</button>`))}
      </div>
      <form data-formulario="valorar" data-orden="${o.id}">
        ${crudo(areaTexto('comentario', 'Comentario (opcional)', { marcador: 'Cuéntenos qué tal estuvo…' }))}
        <div id="error-valorar"></div>
      </form>
      ${crudo(barraAccion([
        boton('Enviar valoración', { variante: 'principal', bloque: true, accion: 'enviar-valoracion', valor: o.id, desactivado: sel === 0 }),
      ]))}
    `,
  };
};

export const reclamo: Render = (ctx) => {
  const e = store.leer();
  const o = e.ordenes.find((x) => x.id === ctx.params.ordenId);
  if (!o) return error404(ctx);

  return {
    titulo: 'Abrir reclamo',
    atras: `/v/pedido/${o.id}`,
    sinNav: true,
    contenido: html`
      <h1 class="titulo-pag">¿Qué ocurrió?</h1>
      <p class="bajada">Pedido ${o.codigo} · ${e.negocios.find((n) => n.id === o.negocioId)?.nombreComercial}</p>
      <form data-formulario="reclamo" data-orden="${o.id}">
        ${crudo(seccion('Motivo', html`
          ${crudo(opcionRadio('motivo', 'No recibí el pedido', 'No recibí el pedido', undefined, true))}
          ${crudo(opcionRadio('motivo', 'Producto no disponible al retirar', 'Producto no disponible al retirar'))}
          ${crudo(opcionRadio('motivo', 'El pedido llegó incompleto', 'El pedido llegó incompleto'))}
          ${crudo(opcionRadio('motivo', 'Cobro incorrecto', 'Cobro incorrecto'))}
          ${crudo(opcionRadio('motivo', 'Otro', 'Otro'))}
        `))}
        ${crudo(areaTexto('descripcion', 'Cuéntenos con detalle', { requerido: true, marcador: 'Describa lo ocurrido…' }))}
        ${crudo(aviso('info', 'Tiempo de respuesta', 'Soporte responde dentro de 48 horas. Podrá seguir el caso desde "Mis reclamos".'))}
        <div id="error-reclamo"></div>
      </form>
      ${crudo(barraAccion([
        boton('Enviar reclamo', { variante: 'principal', bloque: true, accion: 'enviar-reclamo', valor: o.id }),
      ]))}
    `,
  };
};

export const reclamos: Render = () => {
  const e = store.leer();
  const s = sesion.activa();
  const mios = e.disputas.filter((d) => {
    const o = e.ordenes.find((x) => x.id === d.ordenId);
    return o && ((s?.usuarioId && o.clienteId === s.usuarioId) || (s?.invitado && o.invitado));
  });

  const tono = (est: string) =>
    est === 'abierta' ? 'alerta' : est === 'en_analisis' ? 'progreso' : est.startsWith('resuelta') ? 'exito' : 'neutro';

  return {
    titulo: 'Mis reclamos',
    atras: '/v/perfil',
    contenido: html`
      ${mios.length === 0
        ? crudo(vacio('⚑', 'Sin reclamos', 'No ha abierto ningún reclamo. Puede hacerlo desde el detalle de un pedido.', 'Ver mis pedidos', '/v/historial'))
        : crudo(html`<div class="pila">
            ${mios.map((d) => {
              const o = e.ordenes.find((x) => x.id === d.ordenId);
              return crudo(tarjeta(html`
                <div class="fila fila--sep">
                  <div class="crece">
                    <div style="font-weight:650">${d.motivo}</div>
                    <div class="tenue-2 mono">${o?.codigo ?? ''} · ${desde(d.creadaEn)}</div>
                  </div>
                  ${crudo(insignia(d.estado.replace(/_/g, ' '), tono(d.estado) as never))}
                </div>
                <p class="tenue mt-1">${d.descripcion}</p>
                <div class="tenue-2 mt-1">Respuesta comprometida: ${d.slaHoras} horas</div>
              `));
            })}
          </div>`)}
    `,
  };
};

export const perfilVisitante: Render = () => {
  const e = store.leer();
  const u = sesion.usuario();
  const s = sesion.activa();
  const mias = e.ordenes.filter((o) => s?.usuarioId && o.clienteId === s.usuarioId);
  const gasto = mias.filter((o) => o.estado === 'entregada').reduce((t, o) => t + o.totalUsd, 0);

  return {
    titulo: 'Mi perfil',
    contenido: html`
      <div class="fila mb-2">
        <span aria-hidden="true" style="font-size:38px;width:56px;text-align:center">☺</span>
        <div class="crece">
          <h1 style="font-size:19px">${u?.nombre ?? 'Invitado'}</h1>
          <div class="tenue">${u?.correo ?? 'Compra sin cuenta'}</div>
        </div>
      </div>

      ${u
        ? crudo(html`<div class="rejilla mb-2">
            ${crudo(metrica(String(mias.length), 'Pedidos'))}
            ${crudo(metrica(formatearUsd(gasto), 'Total gastado'))}
          </div>`)
        : crudo(aviso('info', 'Sin cuenta', 'Cree una cuenta para conservar su historial, sus comprobantes y sus reclamos.'))}

      ${crudo(seccion('Mi actividad', html`<div class="pila">
        ${crudo(boton('Mis pedidos', { bloque: true, accion: 'ir', valor: '/v/historial', icono: '▤' }))}
        ${crudo(boton('Mis reclamos', { bloque: true, accion: 'ir', valor: '/v/reclamos', icono: '⚑' }))}
        ${crudo(boton('Notificaciones', { bloque: true, accion: 'ir', valor: '/notificaciones', icono: '◔' }))}
      </div>`))}

      ${crudo(seccion('Preferencias', html`<div class="pila">
        ${crudo(boton('Accesibilidad', { bloque: true, accion: 'ir', valor: '/perfil/accesibilidad', icono: '◑' }))}
        ${crudo(boton('Privacidad y datos', { bloque: true, accion: 'ir', valor: '/perfil/privacidad', icono: '⚿' }))}
        ${crudo(boton('Ayuda', { bloque: true, accion: 'ir', valor: '/ayuda', icono: '?' }))}
      </div>`))}

      ${crudo(seccion('Demostración', html`<div class="pila">
        ${crudo(boton('Cambiar de perfil', { variante: 'principal', bloque: true, accion: 'cerrar-sesion' }))}
        ${crudo(boton(`Conexión: ${conectividadEtiqueta()}`, { bloque: true, accion: 'alternar-conexion' }))}
        ${crudo(boton('Índice técnico', { bloque: true, accion: 'ir', valor: '/__mapa' }))}
        ${crudo(boton('Restablecer la demo', { variante: 'peligro', bloque: true, accion: 'restablecer' }))}
      </div>`))}
    `,
  };
};

function conectividadEtiqueta(): string {
  return conectividad.etiqueta();
}
