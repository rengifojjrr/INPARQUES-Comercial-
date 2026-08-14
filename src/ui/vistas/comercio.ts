/**
 * Portal del comercio. Funciona en teléfono, se ensancha en tablet y usa
 * navegación lateral en escritorio.
 */

import {
  html, crudo, esc, boton, tarjeta, insignia, listaDatos, vacio, aviso, etiquetaDemo,
  entradaTexto, areaTexto, seccion, chips, tabla, barraAccion, conmutador,
  metrica, buscador,
} from '../componentes';
import type { Pagina, Render } from './tipos';
import { store } from '../../data/store';
import { sesion } from '../../app/session';
import { filtro, texto } from '../estado-ui';
import { ROLES } from '../../domain/roles';
import { proyectarCuenta } from '../../domain/masking';
import { ETIQUETA_ORDEN, ETIQUETA_PAGO, TONO_ORDEN, TONO_PAGO } from '../../domain/state-machines';
import { formatearUsd, formatearVes, formatearTasa } from '../../domain/money';
import { fechaCorta, horaCorta, desde, diasHasta, pluralizar } from '../formato';
import { error404 } from './compartidas';
import type { Local, Orden } from '../../domain/types';

/** Locales que el usuario puede operar, según su ámbito. */
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

// -------------------------------------------------------------------- Inicio

export const inicio: Render = () => {
  const e = store.leer();
  const u = sesion.usuario()!;
  const negocio = e.negocios.find((n) => n.id === miNegocioId());
  const ordenes = misOrdenes();
  const hoy = new Date().toISOString().slice(0, 10);
  const deHoy = ordenes.filter((o) => o.creadaEn.slice(0, 10) === hoy);
  const pendientes = ordenes.filter((o) => o.estado === 'pendiente_aceptacion');
  const ventasHoy = deHoy.filter((o) => o.estado === 'entregada').reduce((s, o) => s + o.totalUsd, 0);
  const turno = e.turnos.find((t) => misLocales().some((l) => l.id === t.localId) && t.estado === 'abierto');
  const agotados = e.articulos.filter((a) => misLocales().some((l) => l.id === a.localId) && !a.disponible);
  const docsPorVencer = e.documentos.filter(
    (d) => d.negocioId === negocio?.id && d.vigenciaHasta && diasHasta(d.vigenciaHasta) < 45,
  );
  const permisosPorVencer = e.permisos.filter((p) => p.negocioId === negocio?.id && p.estado === 'por_vencer');
  const esOperador = u.rol === 'comercio.operador';
  const esContador = u.rol === 'comercio.contador';

  return {
    titulo: negocio?.nombreComercial ?? 'Mi comercio',
    subtitulo: ROLES[u.rol].nombre,
    contenido: html`
      ${permisosPorVencer.length || docsPorVencer.length
        ? crudo(aviso('alerta', 'Vencimientos próximos', `${permisosPorVencer.length ? `${pluralizar(permisosPorVencer.length, 'permiso', 'permisos')} por vencer. ` : ''}${docsPorVencer.length ? `${pluralizar(docsPorVencer.length, 'documento', 'documentos')} con vigencia próxima.` : ''}`))
        : ''}

      <div class="rejilla mb-2 mt-2">
        ${crudo(metrica(String(pendientes.length), 'Por aceptar', pendientes.length ? { texto: 'Requiere acción', tono: 'alerta' } : undefined))}
        ${crudo(metrica(String(deHoy.length), 'Pedidos de hoy'))}
        ${!esOperador ? crudo(metrica(formatearUsd(ventasHoy), 'Ventas de hoy')) : ''}
        ${crudo(metrica(String(agotados.length), 'Agotados', agotados.length ? { texto: 'Revisar', tono: 'alerta' } : undefined))}
      </div>

      ${turno
        ? crudo(tarjeta(html`
            <div class="fila fila--sep">
              <div class="crece">
                <div style="font-weight:650">Turno de caja abierto</div>
                <div class="tenue-2">Desde ${horaCorta(turno.abiertoEn)} · fondo ${formatearVes(turno.fondoInicialVes)}</div>
              </div>
              ${crudo(insignia('Abierto', 'exito'))}
            </div>
            <div class="fila mt-2" style="gap:8px">
              ${crudo(boton('Venta de mostrador', { variante: 'principal', pequeno: true, accion: 'ir', valor: '/c/caja/venta-mostrador' }))}
              ${crudo(boton('Ver caja', { variante: 'secundario', pequeno: true, accion: 'ir', valor: '/c/caja' }))}
            </div>
          `))
        : !esContador
          ? crudo(tarjeta(html`
              <div class="fila fila--sep">
                <div class="crece"><div style="font-weight:650">Sin turno abierto</div><div class="tenue-2">Abra el turno para registrar ventas de mostrador</div></div>
              </div>
              <div class="mt-2">${crudo(boton('Abrir turno', { variante: 'principal', pequeno: true, accion: 'ir', valor: '/c/caja/turno/abrir' }))}</div>
            `))
          : ''}

      ${pendientes.length
        ? crudo(seccion('Pedidos por aceptar', html`<div class="pila">
            ${pendientes.slice(0, 4).map((o) => crudo(filaPedido(o)))}
          </div>`, { texto: 'Ver todos', ruta: '/c/pedidos' }))
        : ''}

      ${crudo(seccion('Accesos rápidos', html`<div class="rejilla rejilla--auto">
        ${crudo(boton('Pedidos', { bloque: true, accion: 'ir', valor: '/c/pedidos', icono: '▤' }))}
        ${!esContador ? crudo(boton('Catálogo', { bloque: true, accion: 'ir', valor: '/c/catalogo', icono: '☰' })) : ''}
        ${crudo(boton('Caja', { bloque: true, accion: 'ir', valor: '/c/caja', icono: '▦' }))}
        ${!esOperador ? crudo(boton('Reportes', { bloque: true, accion: 'ir', valor: '/c/reportes', icono: '◫' })) : ''}
        ${crudo(boton('Expediente', { bloque: true, accion: 'ir', valor: '/c/expediente', icono: '≡' }))}
        ${crudo(boton('Todos los módulos', { bloque: true, accion: 'ir', valor: '/c/mas', icono: '⋯' }))}
      </div>`))}

      <p class="tenue-2 centrado">${formatearTasa(e.tasaBcv)}</p>
    `,
  };
};

function filaPedido(o: Orden): string {
  const e = store.leer();
  const pago = e.pagos.find((p) => p.ordenId === o.id);
  return tarjeta(
    html`<div class="fila fila--sep">
      <div class="crece">
        <div style="font-weight:650">${o.codigo} · ${o.clienteNombre}</div>
        <div class="tenue-2">${pluralizar(o.items.length, 'línea', 'líneas')} · ${desde(o.creadaEn)} · ${o.canal === 'mostrador' ? 'Mostrador' : 'App'}</div>
      </div>
      <div style="text-align:right">
        <div class="precio">${formatearUsd(o.totalUsd)}</div>
      </div>
    </div>
    <div class="fila fila--envuelve mt-2" style="gap:6px">
      ${crudo(insignia(ETIQUETA_ORDEN[o.estado], TONO_ORDEN[o.estado]))}
      ${pago ? crudo(insignia(ETIQUETA_PAGO[pago.estado], TONO_PAGO[pago.estado])) : ''}
    </div>`,
    { accionIr: `/c/pedido/${o.id}` },
  );
}

// ------------------------------------------------------------------ Pedidos

export const pedidos: Render = () => {
  const f = filtro('pedidos', 'activos');
  let lista = misOrdenes().filter((o) => o.tipo === 'pedido').sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));

  if (f === 'activos') lista = lista.filter((o) => !['entregada', 'cancelada'].includes(o.estado));
  if (f === 'por_aceptar') lista = lista.filter((o) => o.estado === 'pendiente_aceptacion');
  if (f === 'listos') lista = lista.filter((o) => o.estado === 'lista');
  if (f === 'historial') lista = lista.filter((o) => ['entregada', 'cancelada'].includes(o.estado));

  return {
    titulo: 'Pedidos',
    contenido: html`
      ${crudo(chips(
        [
          { valor: 'activos', texto: 'Activos' },
          { valor: 'por_aceptar', texto: 'Por aceptar' },
          { valor: 'listos', texto: 'Listos' },
          { valor: 'historial', texto: 'Historial' },
        ],
        f,
        'filtro-pedidos',
      ))}
      ${lista.length === 0
        ? crudo(vacio('▤', 'Sin pedidos', f === 'por_aceptar' ? 'No hay pedidos esperando aceptación.' : 'No hay pedidos que coincidan con este filtro.'))
        : crudo(html`<div class="pila">${lista.map((o) => crudo(filaPedido(o)))}</div>`)}
    `,
  };
};


export const reservas: Render = () => {
  const lista = misOrdenes().filter((o) => o.tipo === 'reserva').sort((a, b) => (a.programadaPara ?? '').localeCompare(b.programadaPara ?? ''));
  return {
    titulo: 'Reservas',
    contenido: html`
      ${lista.length === 0
        ? crudo(vacio('◷', 'Sin reservas', 'Las reservas de servicios aparecerán aquí con su franja horaria.'))
        : crudo(html`<div class="pila">${lista.map((o) => crudo(filaPedido(o)))}</div>`)}
    `,
  };
};


// ------------------------------------------------------------------ Catálogo

export const catalogo: Render = () => {
  const e = store.leer();
  const locales = misLocales();
  const arts = e.articulos.filter((a) => locales.some((l) => l.id === a.localId));
  const f = filtro('cat-comercio', 'todos');
  const q = texto('catalogo').toLowerCase();
  let lista = arts;
  if (f === 'disponibles') lista = lista.filter((a) => a.disponible);
  if (f === 'agotados') lista = lista.filter((a) => !a.disponible);
  if (f === 'servicios') lista = lista.filter((a) => a.tipo === 'servicio');
  if (q) lista = lista.filter((a) => a.nombre.toLowerCase().includes(q));

  const u = sesion.usuario()!;
  const puedeEditar = u.rol === 'comercio.propietario' || u.rol === 'comercio.admin_local';

  return {
    titulo: 'Catálogo',
    contenido: html`
      ${crudo(buscador('q-cat', 'Buscar artículo', texto('catalogo'), 'buscar-catalogo'))}
      ${crudo(chips(
        [
          { valor: 'todos', texto: `Todos (${arts.length})` },
          { valor: 'disponibles', texto: 'Disponibles' },
          { valor: 'agotados', texto: `Agotados (${arts.filter((a) => !a.disponible).length})` },
          { valor: 'servicios', texto: 'Servicios' },
        ],
        f,
        'filtro-catalogo',
      ))}
      ${lista.length === 0
        ? crudo(vacio('☰', 'Sin artículos', 'No hay artículos que coincidan con el filtro.'))
        : crudo(html`<div class="pila">
            ${lista.map((a) => crudo(tarjeta(html`
              <div class="fila fila--sep">
                <div class="crece">
                  <div style="font-weight:650">${a.nombre}</div>
                  <div class="tenue-2">${a.categoria} · ${formatearUsd(a.precioUsd)}${typeof a.stock === 'number' ? ` · ${a.stock} en existencia` : ''}</div>
                </div>
                <span class="precio">${formatearUsd(a.precioUsd)}</span>
              </div>
              <div class="fila fila--sep mt-2">
                ${crudo(insignia(a.disponible ? 'Disponible' : 'Agotado', a.disponible ? 'exito' : 'error'))}
                <div class="fila" style="gap:8px">
                  ${puedeEditar || u.rol === 'comercio.operador'
                    ? crudo(conmutador(`disp-${a.id}`, '', a.disponible, 'toggle-disponible', a.id))
                    : ''}
                  ${puedeEditar ? crudo(boton('Editar', { variante: 'texto', pequeno: true, accion: 'ir', valor: `/c/catalogo/articulo/${a.id}` })) : ''}
                </div>
              </div>
            `)))}
          </div>`)}
      ${crudo(aviso('info', 'Efecto inmediato', 'Al marcar un artículo como agotado, el visitante deja de poder pedirlo al instante.'))}
    `,
  };
};

export const articuloComercio: Render = (ctx) => {
  const e = store.leer();
  const a = e.articulos.find((x) => x.id === ctx.params.articuloId);
  if (!a) return error404(ctx);

  return {
    titulo: a.nombre,
    atras: '/c/catalogo',
    contenido: html`
      <form data-formulario="articulo" data-articulo="${a.id}">
        ${crudo(entradaTexto('nombre', 'Nombre', { valor: a.nombre, requerido: true }))}
        ${crudo(areaTexto('descripcion', 'Descripción', { valor: a.descripcion }))}
        ${crudo(entradaTexto('precio', 'Precio en USD', { valor: String(a.precioUsd), modo: 'decimal', requerido: true, ayuda: `Equivale a ${formatearVes(a.precioUsd * e.tasaBcv.valor)} a la tasa vigente.` }))}
        ${typeof a.stock === 'number' ? crudo(entradaTexto('stock', 'Existencias', { valor: String(a.stock), modo: 'numeric' })) : ''}
        ${crudo(entradaTexto('prep', 'Tiempo de preparación (min)', { valor: String(a.tiempoPrepMin), modo: 'numeric' }))}
        <div id="error-articulo"></div>
      </form>

      ${crudo(tarjeta(html`${crudo(conmutador(`d-${a.id}`, 'Disponible para la venta', a.disponible, 'toggle-disponible', a.id))}`))}

      ${crudo(seccion('Variantes', html`
        ${a.variantes.length === 0
          ? crudo('<p class="tenue">Sin variantes definidas.</p>')
          : crudo(html`<div class="pila">${a.variantes.map((v) => crudo(tarjeta(html`
              <div style="font-weight:650">${v.nombre}</div>
              ${v.opciones.map((o) => crudo(`<div class="fila fila--sep tenue" style="padding:4px 0"><span>${esc(o.nombre)}</span><span>${o.deltaUsd ? `+ ${esc(formatearUsd(o.deltaUsd))}` : 'Sin recargo'}</span></div>`))}
            `, { clase: 'tarjeta--plana' })))}</div>`)}
      `, { texto: 'Gestionar', ruta: `/c/catalogo/articulo/${a.id}/variantes` }))}

      ${crudo(seccion('Modificadores', html`
        ${a.modificadores.length === 0
          ? crudo('<p class="tenue">Sin modificadores definidos.</p>')
          : crudo(html`<div class="pila">${a.modificadores.map((m) => crudo(tarjeta(html`
              <div class="fila fila--sep">
                <span style="font-weight:650">${m.nombre}</span>
                ${crudo(insignia(m.obligatorio ? 'Obligatorio' : 'Opcional', m.obligatorio ? 'alerta' : 'neutro'))}
              </div>
              ${m.opciones.map((o) => crudo(`<div class="fila fila--sep tenue" style="padding:4px 0"><span>${esc(o.nombre)}${o.disponible ? '' : ' (no disponible)'}</span><span>${o.deltaUsd ? `+ ${esc(formatearUsd(o.deltaUsd))}` : '—'}</span></div>`))}
            `, { clase: 'tarjeta--plana' })))}</div>`)}
      `, { texto: 'Gestionar', ruta: `/c/catalogo/articulo/${a.id}/modificadores` }))}

      ${crudo(seccion('Alérgenos', html`
        ${a.alergenos.length ? crudo(`<div class="fila fila--envuelve" style="gap:6px">${a.alergenos.map((x) => insignia(x, 'alerta')).join('')}</div>`) : crudo('<p class="tenue">Sin alérgenos declarados.</p>')}
      `))}

      ${crudo(barraAccion([boton('Guardar cambios', { variante: 'principal', bloque: true, accion: 'guardar-articulo', valor: a.id })]))}
    `,
  };
};

function paginaListaSimple(titulo: string, atras: string, contenido: string, bajada?: string): Pagina {
  return { titulo, atras, contenido: html`${bajada ? crudo(`<p class="bajada">${esc(bajada)}</p>`) : ''}${crudo(contenido)}` };
}

export const variantes: Render = (ctx) => {
  const a = store.leer().articulos.find((x) => x.id === ctx.params.articuloId);
  if (!a) return error404(ctx);
  return paginaListaSimple(
    'Variantes',
    `/c/catalogo/articulo/${a.id}`,
    a.variantes.length === 0
      ? vacio('◈', 'Sin variantes', 'Las variantes permiten ofrecer tamaños o tipos distintos del mismo artículo.')
      : html`<div class="pila">${a.variantes.map((v) => crudo(tarjeta(html`
          <div style="font-weight:650;margin-bottom:8px">${v.nombre}</div>
          ${crudo(listaDatos(v.opciones.map((o) => [o.nombre, o.deltaUsd ? `+ ${formatearUsd(o.deltaUsd)}` : 'Sin recargo'] as [string, string])))}
        `)))}</div>`,
    a.nombre,
  );
};

export const modificadores: Render = (ctx) => {
  const a = store.leer().articulos.find((x) => x.id === ctx.params.articuloId);
  if (!a) return error404(ctx);
  return paginaListaSimple(
    'Modificadores',
    `/c/catalogo/articulo/${a.id}`,
    a.modificadores.length === 0
      ? vacio('＋', 'Sin modificadores', 'Los modificadores permiten agregados y preparaciones sobre el mismo artículo.')
      : html`<div class="pila">${a.modificadores.map((m) => crudo(tarjeta(html`
          <div class="fila fila--sep mb-1">
            <span style="font-weight:650">${m.nombre}</span>
            ${crudo(insignia(m.obligatorio ? 'Obligatorio' : 'Opcional', m.obligatorio ? 'alerta' : 'neutro'))}
          </div>
          ${crudo(listaDatos(m.opciones.map((o) => [`${o.nombre}${o.disponible ? '' : ' · no disponible'}`, o.deltaUsd ? `+ ${formatearUsd(o.deltaUsd)}` : 'Sin recargo'] as [string, string])))}
        `)))}</div>`,
    a.nombre,
  );
};

export const alergenos: Render = () => {
  const e = store.leer();
  const arts = e.articulos.filter((a) => misLocales().some((l) => l.id === a.localId));
  const conAlergenos = arts.filter((a) => a.alergenos.length > 0);
  return {
    titulo: 'Alérgenos',
    atras: '/c/catalogo',
    contenido: html`
      <p class="bajada">Declaración de alérgenos por artículo. El visitante la ve antes de agregar al carrito.</p>
      ${conAlergenos.length === 0
        ? crudo(vacio('⚕', 'Sin alérgenos declarados', 'Ningún artículo del catálogo declara alérgenos.'))
        : crudo(html`<div class="pila">${conAlergenos.map((a) => crudo(tarjeta(html`
            <div style="font-weight:650">${a.nombre}</div>
            <div class="fila fila--envuelve mt-1" style="gap:6px">${a.alergenos.map((x) => crudo(insignia(x, 'alerta')))}</div>
          `)))}</div>`)}
    `,
  };
};

export const horarios: Render = () => {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const locales = misLocales();
  return {
    titulo: 'Horarios',
    atras: '/c/mas',
    contenido: html`
      <p class="bajada">Cuándo el comercio aparece como abierto para el visitante.</p>
      ${locales.map((l) => crudo(seccion(l.nombre, html`
        ${crudo(listaDatos(dias.map((d, i) => {
          const franjas = l.horarios[i];
          return [d, franjas?.length ? franjas.map((f) => `${f.desde} – ${f.hasta}`).join(', ') : 'Cerrado'] as [string, string];
        })))}
        <div class="mt-1">${crudo(conmutador(`ab-${l.id}`, 'Abierto ahora', l.abierto, 'toggle-abierto', l.id))}</div>
      `)))}
    `,
  };
};

export const cupos: Render = () => {
  const e = store.leer();
  const servicios = e.articulos.filter((a) => a.tipo === 'servicio' && misLocales().some((l) => l.id === a.localId));
  const hoy = new Date().toISOString().slice(0, 10);

  return {
    titulo: 'Cupos',
    atras: '/c/mas',
    contenido: html`
      <p class="bajada">Disponibilidad por franja horaria de los servicios.</p>
      ${servicios.length === 0
        ? crudo(vacio('◷', 'Sin servicios', 'Este comercio no ofrece servicios con reserva.'))
        : crudo(html`${servicios.map((s) => {
            const franjas = e.franjas.filter((f) => f.articuloId === s.id && f.fecha === hoy);
            return crudo(seccion(s.nombre, html`
              ${franjas.length === 0
                ? crudo('<p class="tenue">Sin franjas publicadas para hoy.</p>')
                : crudo(tabla(
                    [
                      { clave: 'h', titulo: 'Franja', render: (f: typeof franjas[0]) => `${esc(f.desde)} – ${esc(f.hasta)}` },
                      { clave: 't', titulo: 'Cupo total', render: (f) => String(f.cupoTotal), numerica: true },
                      { clave: 'o', titulo: 'Tomado', render: (f) => String(f.cupoTomado), numerica: true },
                      { clave: 'l', titulo: 'Libre', render: (f) => {
                        const libre = f.cupoTotal - f.cupoTomado;
                        return insignia(String(libre), libre === 0 ? 'error' : libre <= 2 ? 'alerta' : 'exito');
                      }, numerica: true },
                    ],
                    franjas,
                  ))}
            `));
          })}`)}
    `,
  };
};

export const inventario: Render = () => {
  const e = store.leer();
  const arts = e.articulos.filter((a) => typeof a.stock === 'number' && misLocales().some((l) => l.id === a.localId));
  return {
    titulo: 'Inventario',
    atras: '/c/mas',
    contenido: html`
      <p class="bajada">Control básico por artículo. La beta no incluye inventario por ingrediente ni compras.</p>
      ${arts.length === 0
        ? crudo(vacio('▣', 'Sin inventario', 'Ningún artículo de este comercio lleva control de existencias.'))
        : crudo(tabla(
            [
              { clave: 'n', titulo: 'Artículo', render: (a: typeof arts[0]) => esc(a.nombre) },
              { clave: 's', titulo: 'Existencias', render: (a) => String(a.stock ?? 0), numerica: true },
              { clave: 'e', titulo: 'Estado', render: (a) => {
                const s = a.stock ?? 0;
                return insignia(s === 0 ? 'Agotado' : s <= 3 ? 'Bajo' : 'Normal', s === 0 ? 'error' : s <= 3 ? 'alerta' : 'exito');
              } },
              { clave: 'p', titulo: 'Precio', render: (a) => esc(formatearUsd(a.precioUsd)), numerica: true },
            ],
            arts,
            { rutaFila: (a) => `/c/catalogo/articulo/${a.id}` },
          ))}
    `,
  };
};

// ---------------------------------------------------------------------- Caja

export const caja: Render = () => {
  const e = store.leer();
  const locales = misLocales();
  const turno = e.turnos.find((t) => locales.some((l) => l.id === t.localId) && t.estado === 'abierto');
  const cerrados = e.turnos.filter((t) => locales.some((l) => l.id === t.localId) && t.estado === 'cerrado');
  const u = sesion.usuario()!;

  return {
    titulo: 'Caja',
    contenido: html`
      ${turno
        ? crudo(html`
            ${crudo(tarjeta(html`
              <div class="fila fila--sep mb-2">
                <div class="crece">
                  <div style="font-weight:650">Turno abierto</div>
                  <div class="tenue-2">Desde ${horaCorta(turno.abiertoEn)}</div>
                </div>
                ${crudo(insignia('Abierto', 'exito'))}
              </div>
              ${crudo(listaDatos([
                ['Fondo inicial', formatearVes(turno.fondoInicialVes)],
                ['Pago Móvil', formatearVes(turno.esperadoPorMetodo.pago_movil)],
                ['Transferencia', formatearVes(turno.esperadoPorMetodo.transferencia)],
                ['Tarjeta', formatearVes(turno.esperadoPorMetodo.tarjeta)],
                ['Efectivo', formatearVes(turno.esperadoPorMetodo.efectivo)],
                ['Efectivo esperado en caja', `<strong>${formatearVes(turno.esperadoPorMetodo.efectivo + turno.fondoInicialVes)}</strong>`],
              ]))}
            `))}
            <div class="fila mt-2" style="gap:8px">
              ${crudo(boton('Venta de mostrador', { variante: 'principal', accion: 'ir', valor: '/c/caja/venta-mostrador' }))}
              ${u.rol !== 'comercio.operador' ? crudo(boton('Cerrar turno', { variante: 'secundario', accion: 'ir', valor: '/c/caja/turno/cerrar' })) : ''}
            </div>
          `)
        : crudo(html`
            ${crudo(vacio('▦', 'Sin turno abierto', 'Abra un turno para registrar ventas de mostrador y poder cerrar la caja del día.'))}
            <div class="centrado">${crudo(boton('Abrir turno', { variante: 'principal', accion: 'ir', valor: '/c/caja/turno/abrir' }))}</div>
          `)}

      ${crudo(seccion('Turnos cerrados', html`
        ${cerrados.length === 0
          ? crudo('<p class="tenue">Todavía no hay cierres registrados.</p>')
          : crudo(html`<div class="pila">${cerrados.map((t) => crudo(tarjeta(html`
              <div class="fila fila--sep">
                <div class="crece">
                  <div style="font-weight:650">${fechaCorta(t.abiertoEn)}</div>
                  <div class="tenue-2">Cerrado ${t.cerradoEn ? horaCorta(t.cerradoEn) : ''}</div>
                </div>
                ${crudo(insignia(t.diferenciaVes === 0 ? 'Sin diferencia' : `Dif. ${formatearVes(t.diferenciaVes ?? 0)}`, t.diferenciaVes === 0 ? 'exito' : 'alerta'))}
              </div>
            `, { accionIr: `/c/caja/turno/${t.id}` })))}</div>`)}
      `))}

      ${crudo(aviso('info', 'Un solo libro', 'Las ventas de mostrador entran en la misma caja, el mismo cierre y los mismos reportes que las ventas de la aplicación.'))}
    `,
  };
};





// ------------------------------------------------------------------ Finanzas

export const reportes: Render = () => {
  const e = store.leer();
  const ordenes = misOrdenes().filter((o) => o.estado === 'entregada');
  const f = filtro('reportes', 'mes');
  const desdeFecha = f === 'hoy' ? new Date().toISOString().slice(0, 10) : f === 'semana' ? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10) : '2026-08-01';
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

  return {
    titulo: 'Reportes',
    contenido: html`
      ${crudo(chips(
        [{ valor: 'hoy', texto: 'Hoy' }, { valor: 'semana', texto: '7 días' }, { valor: 'mes', texto: 'Este mes' }],
        f,
        'filtro-reportes',
      ))}
      <div class="rejilla mb-2">
        ${crudo(metrica(formatearUsd(total), 'Ventas'))}
        ${crudo(metrica(String(lista.length), 'Pedidos'))}
        ${crudo(metrica(formatearUsd(ticket), 'Ticket promedio'))}
        ${crudo(metrica(String(mostrador.length), 'De mostrador'))}
      </div>

      ${crudo(seccion('Canal de venta', html`${crudo(listaDatos([
        ['Aplicación', `${app.length} · ${formatearUsd(app.reduce((s, o) => s + o.totalUsd, 0))}`],
        ['Mostrador', `${mostrador.length} · ${formatearUsd(mostrador.reduce((s, o) => s + o.totalUsd, 0))}`],
      ]))}
      <p class="tenue-2 mt-1">Las ventas de mostrador aparecen aquí junto con las de la aplicación.</p>`))}

      ${crudo(seccion('Método de pago', html`
        ${porMetodo.size === 0
          ? crudo('<p class="tenue">Sin ventas en el periodo.</p>')
          : crudo(listaDatos([...porMetodo.entries()].map(([m, v]) => [m.replace('_', ' '), formatearUsd(v)] as [string, string])))}
      `))}

      ${crudo(seccion('Exportar', html`<div class="pila">
        ${crudo(boton('Descargar CSV', { bloque: true, accion: 'exportar-csv', valor: 'ventas' }))}
        ${crudo(boton('Vista imprimible', { bloque: true, accion: 'imprimir' }))}
      </div>`))}
    `,
  };
};

export const conciliacion: Render = () => {
  const e = store.leer();
  const ordenes = misOrdenes();
  const pagos = e.pagos.filter((p) => ordenes.some((o) => o.id === p.ordenId));
  const f = filtro('conciliacion', 'todos');
  let lista = pagos;
  if (f === 'pendientes') lista = pagos.filter((p) => p.estado === 'pendiente_verificacion');
  if (f === 'confirmados') lista = pagos.filter((p) => p.estado === 'confirmado');
  if (f === 'incidencias') lista = pagos.filter((p) => ['fallido', 'revertido', 'reembolsado'].includes(p.estado));

  return {
    titulo: 'Conciliación',
    contenido: html`
      ${crudo(chips(
        [
          { valor: 'todos', texto: 'Todos' },
          { valor: 'pendientes', texto: `Pendientes (${pagos.filter((p) => p.estado === 'pendiente_verificacion').length})` },
          { valor: 'confirmados', texto: 'Confirmados' },
          { valor: 'incidencias', texto: 'Incidencias' },
        ],
        f,
        'filtro-conciliacion',
      ))}
      ${crudo(tabla(
        [
          { clave: 'o', titulo: 'Orden', render: (p: typeof pagos[0]) => `<span class="mono">${esc(ordenes.find((o) => o.id === p.ordenId)?.codigo ?? '')}</span>` },
          { clave: 'm', titulo: 'Método', render: (p) => esc(p.metodo.replace('_', ' ')) },
          { clave: 'r', titulo: 'Referencia', render: (p) => `<span class="mono">${esc(p.referencia ?? '—')}</span>` },
          { clave: 'e', titulo: 'Estado', render: (p) => insignia(ETIQUETA_PAGO[p.estado], TONO_PAGO[p.estado]) },
          { clave: 'v', titulo: 'Monto', render: (p) => esc(formatearVes(p.montoVes)), numerica: true },
        ],
        lista,
        { rutaFila: (p) => `/c/pedido/${p.ordenId}`, vacio: 'No hay pagos con este filtro.' },
      ))}
      ${crudo(aviso('info', 'Cuatro procesos distintos', 'La conciliación mira el pago, no la orden. Una orden entregada puede tener un pago aún sin verificar.'))}
    `,
  };
};

export const facturas: Render = () => {
  const e = store.leer();
  const ordenes = misOrdenes();
  const lista = e.facturas.filter((f) => ordenes.some((o) => o.id === f.ordenId));
  return {
    titulo: 'Facturas',
    contenido: html`
      <p class="bajada">Documentos emitidos por el comercio. INPARQUES no es el emisor fiscal.</p>
      ${crudo(tabla(
        [
          { clave: 'n', titulo: 'Número', render: (f: typeof lista[0]) => `<span class="mono">${esc(f.numero)}</span>` },
          { clave: 'c', titulo: 'Control', render: (f) => `<span class="mono">${esc(f.numeroControl)}</span>` },
          { clave: 'e', titulo: 'Estado', render: (f) => insignia(f.estado.replace('_', ' '), f.estado === 'emitida' ? 'exito' : f.estado === 'anulada' ? 'error' : 'alerta') },
          { clave: 'f', titulo: 'Fecha', render: (f) => (f.emitidaEn ? esc(fechaCorta(f.emitidaEn)) : '—') },
          { clave: 't', titulo: 'Total', render: (f) => esc(formatearUsd(f.totalUsd)), numerica: true },
        ],
        lista,
        { rutaFila: (f) => `/c/factura/${f.id}`, vacio: 'Todavía no se ha emitido ninguna factura.' },
      ))}
    `,
  };
};


export const comprobantes: Render = () => {
  const ordenes = misOrdenes().filter((o) => o.estado === 'entregada');
  return {
    titulo: 'Comprobantes',
    atras: '/c/mas',
    contenido: html`
      <p class="bajada">Comprobantes de pedido. No son facturas fiscales.</p>
      ${crudo(tabla(
        [
          { clave: 'c', titulo: 'Código', render: (o: Orden) => `<span class="mono">${esc(o.codigo)}</span>` },
          { clave: 'cl', titulo: 'Cliente', render: (o) => esc(o.clienteNombre) },
          { clave: 'f', titulo: 'Fecha', render: (o) => esc(fechaCorta(o.creadaEn)) },
          { clave: 't', titulo: 'Total', render: (o) => esc(formatearUsd(o.totalUsd)), numerica: true },
        ],
        ordenes,
        { rutaFila: (o) => `/c/pedido/${o.id}`, vacio: 'Sin pedidos entregados todavía.' },
      ))}
    `,
  };
};


export const ajustes: Render = () => {
  const e = store.leer();
  const negocioId = miNegocioId();
  const lista = e.ajustes.filter((a) => {
    const l = e.liquidaciones.find((x) => x.id === a.liquidacionId);
    return !a.liquidacionId || l?.negocioId === negocioId;
  });

  return {
    titulo: 'Solicitudes de ajuste',
    atras: '/c/mas',
    contenido: html`
      <p class="bajada">Los cierres no se editan. Toda corrección pasa por un ajuste con motivo y evidencia.</p>
      ${lista.length === 0
        ? crudo(vacio('⚙', 'Sin solicitudes', 'No ha solicitado ningún ajuste sobre sus liquidaciones.'))
        : crudo(html`<div class="pila">${lista.map((a) => crudo(tarjeta(html`
            <div class="fila fila--sep">
              <div class="crece">
                <div style="font-weight:650">${a.concepto}</div>
                <div class="tenue-2">${desde(a.creadoEn)}</div>
              </div>
              ${crudo(insignia(a.estado, a.estado === 'aprobado' ? 'exito' : a.estado === 'rechazado' ? 'error' : 'alerta'))}
            </div>
            <div class="mt-1">${crudo(listaDatos([['Monto', formatearUsd(a.montoUsd)], ['Motivo', esc(a.motivo)]]))}</div>
          `)))}</div>`)}
      ${crudo(barraAccion([boton('Solicitar ajuste', { variante: 'principal', bloque: true, accion: 'solicitar-ajuste' })]))}
    `,
  };
};

export const exportaciones: Render = () => ({
  titulo: 'Exportaciones',
  atras: '/c/mas',
  contenido: html`
    <p class="bajada">Descargue sus datos. La exportación completa evita la dependencia del proveedor.</p>
    <div class="pila">
      ${crudo(boton('Ventas en CSV', { bloque: true, accion: 'exportar-csv', valor: 'ventas', icono: '↓' }))}
      ${crudo(boton('Pagos en CSV', { bloque: true, accion: 'exportar-csv', valor: 'pagos', icono: '↓' }))}
      ${crudo(boton('Catálogo en CSV', { bloque: true, accion: 'exportar-csv', valor: 'catalogo', icono: '↓' }))}
      ${crudo(boton('Vista imprimible', { bloque: true, accion: 'imprimir', icono: '⎙' }))}
    </div>
  `,
});

// ------------------------------------------------------------------ Registro

export const expediente: Render = () => {
  const e = store.leer();
  const negocio = e.negocios.find((n) => n.id === miNegocioId());
  if (!negocio) return { titulo: 'Expediente', contenido: vacio('≡', 'Sin negocio asignado', 'Su usuario no tiene un negocio asociado.') };
  const docs = e.documentos.filter((d) => d.negocioId === negocio.id);
  const permisos = e.permisos.filter((p) => p.negocioId === negocio.id);

  return {
    titulo: 'Expediente',
    contenido: html`
      <div class="fila fila--sep mb-2">
        <h1 style="font-size:20px">${negocio.nombreComercial}</h1>
        ${crudo(insignia(negocio.estado, negocio.estado === 'activo' ? 'exito' : negocio.estado === 'suspendido' ? 'error' : 'alerta'))}
      </div>

      ${crudo(listaDatos([
        ['Razón social', esc(negocio.razonSocial)],
        ['RIF', `<span class="mono">${esc(negocio.rif)}</span>`],
        ['Categoría', esc(negocio.categoria)],
        ['Alta', fechaCorta(negocio.creadoEn)],
      ]))}

      ${crudo(seccion('Documentos', html`
        ${crudo(listaDatos(docs.map((d) => [
          d.tipo.replace(/_/g, ' '),
          insignia(d.estado, d.estado === 'aprobado' ? 'exito' : d.estado === 'observado' ? 'error' : 'alerta'),
        ] as [string, string])))}
      `, { texto: 'Gestionar', ruta: '/c/expediente/documentos' }))}

      ${crudo(seccion('Permisos', html`
        ${crudo(listaDatos(permisos.map((p) => [
          p.numero,
          insignia(p.estado.replace('_', ' '), p.estado === 'vigente' ? 'exito' : p.estado === 'por_vencer' ? 'alerta' : 'error'),
        ] as [string, string])))}
      `, { texto: 'Ver', ruta: '/c/permisos' }))}
    `,
  };
};

export const documentos: Render = () => {
  const e = store.leer();
  const docs = e.documentos.filter((d) => d.negocioId === miNegocioId());
  return {
    titulo: 'Documentos',
    atras: '/c/expediente',
    contenido: html`
      <p class="bajada">Estado y vigencia de cada documento del expediente.</p>
      <div class="pila">
        ${docs.map((d) => {
          const dias = d.vigenciaHasta ? diasHasta(d.vigenciaHasta) : null;
          return crudo(tarjeta(html`
            <div class="fila fila--sep">
              <div class="crece">
                <div style="font-weight:650">${d.tipo.replace(/_/g, ' ')}</div>
                <div class="tenue-2 mono">${d.nombreArchivo}</div>
              </div>
              ${crudo(insignia(d.estado, d.estado === 'aprobado' ? 'exito' : d.estado === 'observado' ? 'error' : 'alerta'))}
            </div>
            ${d.vigenciaHasta
              ? crudo(`<div class="tenue-2 mt-1">Vence ${esc(fechaCorta(`${d.vigenciaHasta}T12:00:00`))}${dias !== null && dias < 45 ? ` · quedan ${dias} días` : ''}</div>`)
              : ''}
            ${d.observacion ? crudo(`<div class="mt-2">${aviso('alerta', 'Observado', d.observacion)}</div>`) : ''}
          `, { accionIr: `/c/expediente/documento/${d.id}` }));
        })}
      </div>
      ${crudo(barraAccion([boton('Cargar documento', { variante: 'principal', bloque: true, accion: 'cargar-documento' })]))}
    `,
  };
};


export const permisos: Render = () => {
  const e = store.leer();
  const lista = e.permisos.filter((p) => p.negocioId === miNegocioId());
  return {
    titulo: 'Permisos',
    atras: '/c/mas',
    contenido: html`
      <div class="pila">
        ${lista.map((p) => {
          const dias = diasHasta(p.hasta);
          return crudo(tarjeta(html`
            <div class="fila fila--sep">
              <div class="crece">
                <div style="font-weight:650">${p.tipo.replace(/_/g, ' ')}</div>
                <div class="tenue-2 mono">${p.numero}</div>
              </div>
              ${crudo(insignia(p.estado.replace('_', ' '), p.estado === 'vigente' ? 'exito' : p.estado === 'por_vencer' ? 'alerta' : 'error'))}
            </div>
            <div class="mt-1">${crudo(listaDatos([
              ['Vigencia', `${fechaCorta(`${p.desde}T12:00:00`)} – ${fechaCorta(`${p.hasta}T12:00:00`)}`],
              ['Días restantes', dias > 0 ? String(dias) : 'Vencido'],
              ['Punto', esc(e.puntos.find((x) => x.id === p.puntoId)?.nombre ?? '—')],
            ]))}</div>
          `));
        })}
      </div>
      ${lista.some((p) => p.estado === 'por_vencer')
        ? crudo(aviso('alerta', 'Renovación próxima', 'Un permiso vencido suspende automáticamente la publicación del comercio.'))
        : ''}
    `,
  };
};

export const contratos: Render = () => {
  const e = store.leer();
  const lista = e.contratos.filter((c) => c.negocioId === miNegocioId());
  return {
    titulo: 'Contratos',
    atras: '/c/mas',
    contenido: html`
      ${lista.length === 0
        ? crudo(vacio('≡', 'Sin contratos', 'No hay condiciones económicas registradas.'))
        : crudo(html`<div class="pila">${lista.map((c) => crudo(tarjeta(html`
            <div class="fila fila--sep">
              <div class="crece">
                <div style="font-weight:650">Contrato ${c.id.slice(-4)}</div>
                <div class="tenue-2">${fechaCorta(`${c.desde}T12:00:00`)} – ${fechaCorta(`${c.hasta}T12:00:00`)}</div>
              </div>
              ${crudo(insignia(c.estado, c.estado === 'vigente' ? 'exito' : 'neutro'))}
            </div>
          `, { accionIr: `/c/contrato/${c.id}` })))}</div>`)}
    `,
  };
};


export const cobro: Render = () => {
  const e = store.leer();
  const u = sesion.usuario()!;
  const cuenta = e.cuentasBancarias.find((c) => c.negocioId === miNegocioId());
  const proy = cuenta ? proyectarCuenta(cuenta, u.rol) : null;

  return {
    titulo: 'Configuración de cobro',
    atras: '/c/mas',
    contenido: html`
      <p class="bajada">Métodos aceptados y cuenta de liquidación.</p>
      ${crudo(seccion('Métodos aceptados', html`
        ${crudo(tarjeta(html`<div class="pila">
          ${crudo(conmutador('m-pm', 'Pago Móvil', true, 'nada', 'pm'))}
          <hr class="sep" />
          ${crudo(conmutador('m-tr', 'Transferencia', true, 'nada', 'tr'))}
          <hr class="sep" />
          ${crudo(conmutador('m-ta', 'Tarjeta', false, 'nada', 'ta'))}
          <hr class="sep" />
          ${crudo(conmutador('m-ef', 'Efectivo en el punto', true, 'nada', 'ef'))}
        </div>`))}
      `))}

      ${crudo(seccion('Cuenta de liquidación', html`
        ${proy && proy.visible
          ? crudo(html`
              ${crudo(listaDatos([
                ['Banco', esc(proy.banco)],
                ['Titular', esc(proy.titular)],
                ['Cuenta', `<span class="mono">${esc(proy.numeroEnmascarado)}</span>`],
                ['Tipo', esc(proy.tipo)],
                ['Estado', insignia(proy.verificada ? 'Verificada' : 'Sin verificar', proy.verificada ? 'exito' : 'alerta')],
              ]))}
              <div class="mt-2">${crudo(boton('Cambiar cuenta bancaria', { variante: 'secundario', bloque: true, accion: 'ir', valor: '/c/cobro/cuenta-bancaria' }))}</div>
              <p class="tenue-2 mt-1">El número se muestra siempre enmascarado, incluso para el propietario.</p>
            `)
          : crudo(aviso('info', 'Dato no disponible para su rol', 'Su rol no tiene acceso a los datos bancarios del negocio.'))}
      `))}

      ${crudo(etiquetaDemo('Liquidación directa al comercio · modelo A'))}
    `,
  };
};


export const equipo: Render = () => {
  const e = store.leer();
  const negocioId = miNegocioId();
  const locales = e.locales.filter((l) => l.negocioId === negocioId).map((l) => l.id);
  const miembros = e.usuarios.filter(
    (u) => u.rol.startsWith('comercio.') && (u.scope.ids.includes(negocioId ?? '') || u.scope.ids.some((i) => locales.includes(i))),
  );

  return {
    titulo: 'Equipo',
    atras: '/c/mas',
    contenido: html`
      <p class="bajada">Cada persona con su propio usuario. Las cuentas compartidas no están permitidas.</p>
      <div class="pila">
        ${miembros.map((m) => crudo(tarjeta(html`
          <div class="fila fila--sep">
            <div class="crece">
              <div style="font-weight:650">${m.nombre}</div>
              <div class="tenue-2">${ROLES[m.rol].nombre}</div>
              <div class="tenue-2">${m.correo}</div>
            </div>
            ${crudo(insignia(m.estado, m.estado === 'activo' ? 'exito' : 'alerta'))}
          </div>
        `, { accionIr: `/c/equipo/${m.id}` })))}
      </div>
      ${crudo(barraAccion([boton('Invitar integrante', { variante: 'principal', bloque: true, accion: 'ir', valor: '/c/equipo/invitar' })]))}
    `,
  };
};


