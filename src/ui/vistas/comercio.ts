/**
 * Portal del comercio. Funciona en teléfono, se ensancha en tablet y usa
 * navegación lateral en escritorio.
 */

import {
  html, crudo, esc, boton, tarjeta, insignia, listaDatos, vacio, aviso, etiquetaDemo,
  entradaTexto, areaTexto, seccion, chips, tabla, lineaTiempo, barraAccion, conmutador,
  metrica, opcionRadio, buscador,
} from '../componentes';
import type { Pagina, Render } from './tipos';
import { store } from '../../data/store';
import { sesion } from '../../app/session';
import { estadoUi, filtro, texto } from '../estado-ui';
import { ROLES } from '../../domain/roles';
import { proyectarCuenta } from '../../domain/masking';
import { puedeVerBancario } from '../../domain/permissions';
import { ETIQUETA_ORDEN, ETIQUETA_PAGO, TONO_ORDEN, TONO_PAGO, ETIQUETA_LIQUIDACION } from '../../domain/state-machines';
import { formatearUsd, formatearVes, formatearTasa, calcularParticipacion } from '../../domain/money';
import { fechaCorta, fechaHora, horaCorta, desde, diasHasta, pluralizar } from '../formato';
import { error403, error404 } from './compartidas';
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

export const detallePedido: Render = (ctx) => {
  const e = store.leer();
  const o = e.ordenes.find((x) => x.id === ctx.params.ordenId);
  if (!o) return error404(ctx);
  if (!misLocales().some((l) => l.id === o.localId)) return error403(ctx);

  const pago = e.pagos.find((p) => p.ordenId === o.id);
  const factura = e.facturas.find((f) => f.ordenId === o.id);
  const u = sesion.usuario()!;
  const puedeOperar = u.rol !== 'comercio.contador';

  const siguiente: Record<string, { destino: string; texto: string } | undefined> = {
    pendiente_aceptacion: { destino: 'aceptada', texto: 'Aceptar pedido' },
    aceptada: { destino: 'preparando', texto: 'Comenzar preparación' },
    preparando: { destino: 'lista', texto: 'Marcar como listo' },
    lista: { destino: 'entregada', texto: 'Confirmar entrega' },
  };
  const paso = siguiente[o.estado];

  return {
    titulo: o.codigo,
    subtitulo: o.clienteNombre,
    atras: '/c/pedidos',
    contenido: html`
      <div class="fila fila--envuelve mb-2" style="gap:6px">
        ${crudo(insignia(ETIQUETA_ORDEN[o.estado], TONO_ORDEN[o.estado]))}
        ${pago ? crudo(insignia(ETIQUETA_PAGO[pago.estado], TONO_PAGO[pago.estado])) : ''}
        ${crudo(insignia(o.canal === 'mostrador' ? 'Mostrador' : 'Aplicación', 'neutro'))}
      </div>

      ${pago?.estado === 'pendiente_verificacion'
        ? crudo(html`
            ${crudo(aviso('alerta', 'Pago sin verificar', 'No entregue el pedido hasta confirmar el pago con el banco. La captura del cliente no es prueba suficiente.'))}
            <div class="mt-1">${crudo(boton('Verificar pago con el banco', { variante: 'principal', bloque: true, accion: 'verificar-pago', valor: pago.id }))}</div>
          `)
        : ''}

      ${crudo(seccion('Artículos', html`<div class="pila">
        ${o.items.map((i) => crudo(tarjeta(html`
          <div class="fila fila--sep">
            <div class="crece">
              <div style="font-weight:650">${i.cantidad} × ${i.nombre}</div>
              ${i.seleccionVariantes.map((v) => crudo(`<div class="tenue-2">${esc(v.nombre)}</div>`))}
              ${i.seleccionModificadores.map((m) => crudo(`<div class="tenue-2">+ ${esc(m.nombre)}</div>`))}
              ${i.notas ? crudo(`<div class="tenue mt-1">Nota: ${esc(i.notas)}</div>`) : ''}
            </div>
            <span class="precio">${formatearUsd(i.precioUnitarioUsd * i.cantidad)}</span>
          </div>
        `, { clase: 'tarjeta--plana' })))}
      </div>`))}

      ${crudo(seccion('Importes', html`${crudo(listaDatos([
        ['Subtotal', formatearUsd(o.subtotalUsd)],
        ['IVA (16 %)', formatearUsd(o.impuestosUsd)],
        ['Total en USD', `<strong>${formatearUsd(o.totalUsd)}</strong>`],
        ['Monto pagadero', `<strong>${formatearVes(o.totalVes)}</strong>`],
        ['Tasa aplicada', `${o.tasaBcv.toFixed(2)} Bs/USD · ${fechaCorta(o.tasaBcvFecha)}`],
        pago ? ['Método', pago.metodo.replace('_', ' ')] : null,
        pago?.referencia ? ['Referencia', `<span class="mono">${esc(pago.referencia)}</span>`] : null,
      ]))}`))}

      ${crudo(seccion('Cumplimiento', html`${crudo(listaDatos([
        ['Modalidad', o.cumplimiento.replace(/_/g, ' ')],
        ['Código de retiro', `<span class="mono">${esc(o.codigoRetiro)}</span>`],
        o.programadaPara ? ['Programado para', fechaHora(o.programadaPara)] : null,
      ]))}`))}

      ${crudo(seccion('Documentos', html`${crudo(listaDatos([
        ['Factura', factura ? `${factura.numero} · ${factura.estado}` : 'No emitida'],
      ]))}
      ${!factura && o.estado === 'entregada' && puedeOperar
        ? crudo(`<div class="mt-1">${boton('Emitir factura', { variante: 'secundario', bloque: true, accion: 'emitir-factura', valor: o.id })}</div>`)
        : ''}`))}

      ${crudo(seccion('Historial', html`${crudo(lineaTiempo(o.historial.map((h) => ({
        titulo: ETIQUETA_ORDEN[h.a as keyof typeof ETIQUETA_ORDEN] ?? h.a,
        detalle: `${fechaHora(h.en)} · ${ROLES[h.porRol]?.nombre ?? h.porRol}${h.motivo ? ` · ${h.motivo}` : ''}`,
        estado: 'hecho' as const,
      }))))}`))}

      ${puedeOperar && (paso || !['entregada', 'cancelada'].includes(o.estado))
        ? crudo(barraAccion([
            ...(paso ? [boton(paso.texto, { variante: 'principal', bloque: true, accion: 'avanzar-orden', valor: `${o.id}|${paso.destino}` })] : []),
            ...(!['entregada', 'cancelada'].includes(o.estado)
              ? [boton('Cancelar', { variante: 'secundario', accion: 'cancelar-orden', valor: o.id })]
              : []),
          ]))
        : ''}
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

export const detalleReserva: Render = (ctx) => detallePedido(ctx);

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

export const ventaMostrador: Render = () => {
  const e = store.leer();
  const locales = misLocales();
  const turno = e.turnos.find((t) => locales.some((l) => l.id === t.localId) && t.estado === 'abierto');
  if (!turno) {
    return {
      titulo: 'Venta de mostrador',
      atras: '/c/caja',
      contenido: html`
        ${crudo(vacio('▦', 'Necesita un turno abierto', 'Toda venta de mostrador debe quedar dentro de un turno para poder cuadrar la caja.'))}
        <div class="centrado">${crudo(boton('Abrir turno', { variante: 'principal', accion: 'ir', valor: '/c/caja/turno/abrir' }))}</div>
      `,
    };
  }

  const arts = e.articulos.filter((a) => a.localId === turno.localId && a.disponible && a.tipo !== 'servicio');
  const sel: Record<string, number> = {};
  for (const [k, v] of Object.entries(estadoUi.seleccion)) {
    if (k.startsWith('mostrador-')) sel[k.replace('mostrador-', '')] = Number(v);
  }
  const total = Object.entries(sel).reduce((s, [id, n]) => {
    const a = arts.find((x) => x.id === id);
    return s + (a ? a.precioUsd * n : 0);
  }, 0);
  const totalConIva = Math.round(total * 1.16 * 100) / 100;

  return {
    titulo: 'Venta de mostrador',
    atras: '/c/caja',
    sinNav: true,
    contenido: html`
      <p class="bajada">Registre la venta para que entre en la caja, el cierre y los reportes.</p>
      <div class="pila">
        ${arts.map((a) => {
          const n = sel[a.id] ?? 0;
          return crudo(tarjeta(html`
            <div class="fila fila--sep">
              <div class="crece">
                <div style="font-weight:650">${a.nombre}</div>
                <div class="tenue-2">${formatearUsd(a.precioUsd)}${typeof a.stock === 'number' ? ` · ${a.stock} disp.` : ''}</div>
              </div>
              <div class="contador">
                <button data-accion="mostrador-menos" data-valor="${a.id}" aria-label="Quitar ${esc(a.nombre)}" ${n <= 0 ? crudo('disabled') : ''}>−</button>
                <span>${n}</span>
                <button data-accion="mostrador-mas" data-valor="${a.id}" aria-label="Agregar ${esc(a.nombre)}">+</button>
              </div>
            </div>
          `, { clase: 'tarjeta--plana' }));
        })}
      </div>

      ${crudo(seccion('Forma de cobro', html`
        ${crudo(opcionRadio('metodo-mostrador', 'efectivo', 'Efectivo', undefined, true))}
        ${crudo(opcionRadio('metodo-mostrador', 'pago_movil', 'Pago Móvil'))}
        ${crudo(opcionRadio('metodo-mostrador', 'tarjeta', 'Tarjeta'))}
      `))}

      ${crudo(listaDatos([
        ['Subtotal', formatearUsd(total)],
        ['IVA (16 %)', formatearUsd(Math.round(total * 0.16 * 100) / 100)],
        ['Total', `<strong>${formatearUsd(totalConIva)}</strong>`],
        ['Monto en bolívares', `<strong>${formatearVes(totalConIva * e.tasaBcv.valor)}</strong>`],
      ]))}
      <div id="error-mostrador" class="mt-1"></div>

      ${crudo(barraAccion([
        boton('Registrar venta', { variante: 'principal', bloque: true, accion: 'registrar-mostrador', valor: turno.localId, desactivado: total === 0 }),
      ]))}
    `,
  };
};

export const abrirTurnoVista: Render = () => {
  const locales = misLocales();
  return {
    titulo: 'Abrir turno',
    atras: '/c/caja',
    sinNav: true,
    contenido: html`
      <h1 class="titulo-pag">Apertura de caja</h1>
      <p class="bajada">Declare el fondo inicial para poder cuadrar al cierre.</p>
      <form data-formulario="abrir-turno">
        ${locales.length > 1
          ? crudo(seccion('Local', html`${locales.map((l, i) => crudo(opcionRadio('local', l.id, l.nombre, undefined, i === 0)))}`))
          : crudo(`<input type="hidden" name="local" value="${esc(locales[0]?.id ?? '')}" />`)}
        ${crudo(entradaTexto('fondo', 'Fondo inicial en bolívares', { modo: 'decimal', valor: '500', requerido: true }))}
        <div id="error-abrir-turno"></div>
      </form>
      ${crudo(barraAccion([boton('Abrir turno', { variante: 'principal', bloque: true, accion: 'confirmar-abrir-turno' })]))}
    `,
  };
};

export const cerrarTurnoVista: Render = () => {
  const e = store.leer();
  const locales = misLocales();
  const turno = e.turnos.find((t) => locales.some((l) => l.id === t.localId) && t.estado === 'abierto');
  if (!turno) {
    return { titulo: 'Cerrar turno', atras: '/c/caja', contenido: vacio('▦', 'No hay turno abierto', 'Debe existir un turno abierto para poder cerrarlo.') };
  }
  const esperado = turno.esperadoPorMetodo.efectivo + turno.fondoInicialVes;

  return {
    titulo: 'Cerrar turno',
    atras: '/c/caja',
    sinNav: true,
    contenido: html`
      <h1 class="titulo-pag">Cierre de caja</h1>
      <p class="bajada">El cierre es inmutable: una vez confirmado solo se corrige con un ajuste autorizado.</p>

      ${crudo(seccion('Ventas esperadas por método', html`${crudo(listaDatos([
        ['Pago Móvil', formatearVes(turno.esperadoPorMetodo.pago_movil)],
        ['Transferencia', formatearVes(turno.esperadoPorMetodo.transferencia)],
        ['Tarjeta', formatearVes(turno.esperadoPorMetodo.tarjeta)],
        ['Efectivo por ventas', formatearVes(turno.esperadoPorMetodo.efectivo)],
        ['Fondo inicial', formatearVes(turno.fondoInicialVes)],
        ['Efectivo esperado', `<strong>${formatearVes(esperado)}</strong>`],
      ]))}`))}

      <form data-formulario="cerrar-turno" data-turno="${turno.id}">
        ${crudo(entradaTexto('declarado', 'Efectivo contado en caja', { modo: 'decimal', requerido: true, valor: String(esperado), ayuda: 'Cuente el efectivo físico e introdúzcalo aquí.' }))}
        ${crudo(areaTexto('motivo', 'Observaciones del cierre', { requerido: true, marcador: 'Cierre normal de jornada…' }))}
        <div id="error-cerrar-turno"></div>
      </form>

      ${crudo(aviso('alerta', 'Acción con motivo obligatorio', 'El cierre queda registrado en la bitácora con responsable, diferencia y motivo.'))}
      ${crudo(barraAccion([boton('Confirmar cierre', { variante: 'principal', bloque: true, accion: 'confirmar-cerrar-turno', valor: turno.id })]))}
    `,
  };
};

export const detalleTurno: Render = (ctx) => {
  const e = store.leer();
  const t = e.turnos.find((x) => x.id === ctx.params.turnoId);
  if (!t) return error404(ctx);
  const ventas = e.ordenes.filter((o) => o.localId === t.localId && o.creadaEn >= t.abiertoEn && (!t.cerradoEn || o.creadaEn <= t.cerradoEn));

  return {
    titulo: `Turno ${fechaCorta(t.abiertoEn)}`,
    atras: '/c/caja',
    contenido: html`
      ${t.estado === 'cerrado' ? crudo(aviso('info', 'Cierre inmutable', 'Este turno está cerrado. No puede editarse ni borrarse: las correcciones se hacen con un ajuste que deja trazabilidad.')) : ''}

      <div class="mt-2">${crudo(listaDatos([
        ['Estado', t.estado],
        ['Apertura', fechaHora(t.abiertoEn)],
        t.cerradoEn ? ['Cierre', fechaHora(t.cerradoEn)] : null,
        ['Fondo inicial', formatearVes(t.fondoInicialVes)],
        ['Efectivo esperado', formatearVes(t.esperadoPorMetodo.efectivo + t.fondoInicialVes)],
        t.efectivoDeclaradoVes !== undefined ? ['Efectivo declarado', formatearVes(t.efectivoDeclaradoVes)] : null,
        t.diferenciaVes !== undefined ? ['Diferencia', insignia(formatearVes(t.diferenciaVes), t.diferenciaVes === 0 ? 'exito' : 'alerta')] : null,
        t.responsableCierreId ? ['Responsable', esc(e.usuarios.find((u) => u.id === t.responsableCierreId)?.nombre ?? '—')] : null,
        t.aprobadoPorId ? ['Aprobado por', esc(e.usuarios.find((u) => u.id === t.aprobadoPorId)?.nombre ?? '—')] : null,
      ]))}</div>

      ${crudo(seccion(`Ventas del turno (${ventas.length})`, html`
        ${ventas.length === 0
          ? crudo('<p class="tenue">Sin ventas registradas en este turno.</p>')
          : crudo(tabla(
              [
                { clave: 'c', titulo: 'Código', render: (o: Orden) => `<span class="mono">${esc(o.codigo)}</span>` },
                { clave: 'ca', titulo: 'Canal', render: (o) => (o.canal === 'mostrador' ? 'Mostrador' : 'App') },
                { clave: 'e', titulo: 'Estado', render: (o) => insignia(ETIQUETA_ORDEN[o.estado], TONO_ORDEN[o.estado]) },
                { clave: 't', titulo: 'Total', render: (o) => esc(formatearUsd(o.totalUsd)), numerica: true },
              ],
              ventas,
              { rutaFila: (o) => `/c/pedido/${o.id}` },
            ))}
      `))}
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

export const detalleFactura: Render = (ctx) => {
  const e = store.leer();
  const f = e.facturas.find((x) => x.id === ctx.params.facturaId);
  if (!f) return error404(ctx);
  const o = e.ordenes.find((x) => x.id === f.ordenId);

  return {
    titulo: `Factura ${f.numero}`,
    atras: '/c/facturas',
    contenido: html`
      ${f.estado === 'emitida' ? crudo(aviso('info', 'Documento inmutable', 'Una factura emitida no se edita ni se borra. Para corregirla se emite una nota de crédito o débito.')) : ''}
      <div class="mt-2">${crudo(listaDatos([
        ['Emisor', esc(f.emisorRazonSocial)],
        ['RIF', `<span class="mono">${esc(f.emisorRif)}</span>`],
        ['Número', `<span class="mono">${esc(f.numero)}</span>`],
        ['N.º de control', `<span class="mono">${esc(f.numeroControl)}</span>`],
        ['Estado', insignia(f.estado.replace('_', ' '), f.estado === 'emitida' ? 'exito' : 'alerta')],
        ['Orden', o ? `<span class="mono">${esc(o.codigo)}</span>` : '—'],
        ['Base imponible', formatearUsd(f.baseImponibleUsd)],
        ['IVA', formatearUsd(f.ivaUsd)],
        ['Total', `<strong>${formatearUsd(f.totalUsd)}</strong>`],
        ['Total en bolívares', formatearVes(f.totalVes)],
        ['Tasa aplicada', `${f.tasaBcv.toFixed(2)} Bs/USD`],
        ['Adaptador', `<span class="mono">${esc(f.adaptador)}</span>`],
        f.motivoNota ? ['Motivo de la nota', esc(f.motivoNota)] : null,
      ]))}</div>

      ${f.estado === 'emitida'
        ? crudo(barraAccion([
            boton('Emitir nota de crédito', { variante: 'secundario', bloque: true, accion: 'nota-credito', valor: f.id }),
          ]))
        : ''}
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

export const estadoCuenta: Render = () => {
  const e = store.leer();
  const negocioId = miNegocioId();
  const contrato = e.contratos.find((c) => c.negocioId === negocioId);
  const liqs = e.liquidaciones.filter((l) => l.negocioId === negocioId);
  const ventas = misOrdenes().filter((o) => o.estado === 'entregada').reduce((s, o) => s + o.totalUsd, 0);
  const p = contrato ? calcularParticipacion(ventas, contrato) : null;

  return {
    titulo: 'Estado de cuenta',
    atras: '/c/mas',
    contenido: html`
      <p class="bajada">Cada concepto por separado: ingreso, impuesto, comisión y canon.</p>
      ${contrato && p
        ? crudo(seccion('Periodo en curso', html`${crudo(listaDatos([
            ['Ventas acumuladas', formatearUsd(ventas)],
            ['Comisión sobre venta', `${contrato.porcentajeSobreVenta} % · ${formatearUsd(p.comisionUsd)}`],
            ['Canon fijo', formatearUsd(p.canonUsd)],
            ['Mínimo garantizado', formatearUsd(contrato.minimoGarantizadoUsd)],
            ['Obligación con INPARQUES', `<strong>${formatearUsd(p.totalUsd)}</strong>`],
          ]))}`))
        : crudo(aviso('alerta', 'Sin contrato vigente', 'No hay condiciones económicas registradas para este negocio.'))}

      ${crudo(seccion('Liquidaciones', html`
        ${liqs.length === 0
          ? crudo('<p class="tenue">Sin liquidaciones registradas.</p>')
          : crudo(html`<div class="pila">${liqs.map((l) => crudo(tarjeta(html`
              <div class="fila fila--sep">
                <div class="crece">
                  <div style="font-weight:650">${fechaCorta(`${l.periodoDesde}T12:00:00`)} – ${fechaCorta(`${l.periodoHasta}T12:00:00`)}</div>
                  <div class="tenue-2">Ventas ${formatearUsd(l.ventasUsd)}</div>
                </div>
                ${crudo(insignia(ETIQUETA_LIQUIDACION[l.estado], l.estado === 'cerrada' ? 'exito' : l.estado === 'conciliada' ? 'progreso' : 'alerta'))}
              </div>
              <div class="mt-2">${crudo(listaDatos([
                ['Comisión', formatearUsd(l.comisionUsd)],
                ['Canon', formatearUsd(l.canonUsd)],
                ['Neto', `<strong>${formatearUsd(l.netoUsd)}</strong>`],
              ]))}</div>
              ${l.estado === 'cerrada' ? crudo('<p class="tenue-2 mt-1">Cerrada: solo se corrige con un ajuste autorizado.</p>') : ''}
            `)))}</div>`)}
      `))}
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

export const detalleDocumento: Render = (ctx) => {
  const e = store.leer();
  const d = e.documentos.find((x) => x.id === ctx.params.documentoId);
  if (!d) return error404(ctx);
  return {
    titulo: d.tipo.replace(/_/g, ' '),
    atras: '/c/expediente/documentos',
    contenido: html`
      ${d.estado === 'observado' && d.observacion ? crudo(aviso('alerta', 'Documento observado', d.observacion)) : ''}
      <div class="mt-2">${crudo(listaDatos([
        ['Archivo', `<span class="mono">${esc(d.nombreArchivo)}</span>`],
        ['Estado', insignia(d.estado, d.estado === 'aprobado' ? 'exito' : d.estado === 'observado' ? 'error' : 'alerta')],
        ['Cargado', fechaHora(d.cargadoEn)],
        d.vigenciaHasta ? ['Vigencia', fechaCorta(`${d.vigenciaHasta}T12:00:00`)] : null,
        d.revisadoPor ? ['Revisado por', esc(e.usuarios.find((u) => u.id === d.revisadoPor)?.nombre ?? '—')] : null,
      ]))}</div>
      ${d.estado === 'observado'
        ? crudo(barraAccion([boton('Cargar nueva versión', { variante: 'principal', bloque: true, accion: 'cargar-documento' })]))
        : ''}
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

export const detalleContrato: Render = (ctx) => {
  const e = store.leer();
  const c = e.contratos.find((x) => x.id === ctx.params.contratoId);
  if (!c) return error404(ctx);
  return {
    titulo: 'Condiciones económicas',
    atras: '/c/contratos',
    contenido: html`
      ${crudo(listaDatos([
        ['Vigencia', `${fechaCorta(`${c.desde}T12:00:00`)} – ${fechaCorta(`${c.hasta}T12:00:00`)}`],
        ['Estado', insignia(c.estado, c.estado === 'vigente' ? 'exito' : 'neutro')],
        ['Canon fijo por periodo', formatearUsd(c.canonFijoUsd)],
        ['Porcentaje sobre venta', `${c.porcentajeSobreVenta} %`],
        ['Mínimo garantizado', formatearUsd(c.minimoGarantizadoUsd)],
      ]))}
      ${crudo(aviso('info', 'Modificación restringida', 'Cambiar las condiciones económicas exige motivo, evidencia y verificación en dos pasos, y solo puede hacerlo la Dirección Comercial.'))}
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

export const cuentaBancaria: Render = (ctx) => {
  const e = store.leer();
  const u = sesion.usuario()!;
  if (!puedeVerBancario(u.rol)) return error403(ctx);
  const cuenta = e.cuentasBancarias.find((c) => c.negocioId === miNegocioId());
  const proy = cuenta ? proyectarCuenta(cuenta, u.rol) : null;

  return {
    titulo: 'Cuenta bancaria',
    atras: '/c/cobro',
    sinNav: true,
    contenido: html`
      <h1 class="titulo-pag">Cambiar cuenta bancaria</h1>
      ${crudo(aviso('alerta', 'Cambio sensible', 'Exige motivo, evidencia documental, verificación en dos pasos y una segunda aprobación de INPARQUES.'))}

      ${proy && proy.visible
        ? crudo(html`<div class="mt-2">${crudo(seccion('Cuenta actual', html`${crudo(listaDatos([
            ['Banco', esc(proy.banco)],
            ['Cuenta', `<span class="mono">${esc(proy.numeroEnmascarado)}</span>`],
          ]))}`))}</div>`)
        : ''}

      <form data-formulario="cuenta-bancaria">
        ${crudo(entradaTexto('banco', 'Banco', { requerido: true, marcador: 'Banco Demo Central' }))}
        ${crudo(entradaTexto('titular', 'Titular de la cuenta', { requerido: true }))}
        ${crudo(entradaTexto('numero', 'Número de cuenta', { modo: 'numeric', requerido: true, marcador: '0102 0000 0000 0000 0000', ayuda: 'Datos ficticios. La demo no valida cuentas reales.' }))}
        ${crudo(areaTexto('motivo', 'Motivo del cambio', { requerido: true, marcador: 'Cierre de la cuenta anterior…' }))}
        ${crudo(entradaTexto('evidencia', 'Evidencia documental', { requerido: true, valor: 'carta-banco.pdf', ayuda: 'Nombre del documento que respalda el cambio.' }))}
        <div id="error-cuenta-bancaria"></div>
      </form>

      ${crudo(barraAccion([boton('Solicitar cambio', { variante: 'principal', bloque: true, accion: 'cambiar-cuenta' })]))}
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

export const invitarEquipo: Render = () => ({
  titulo: 'Invitar integrante',
  atras: '/c/equipo',
  sinNav: true,
  contenido: html`
    <h1 class="titulo-pag">Nueva invitación</h1>
    <p class="bajada">La persona recibe un código y define su propia contraseña.</p>
    <form data-formulario="invitar">
      ${crudo(entradaTexto('correo', 'Correo electrónico', { tipo: 'email', requerido: true }))}
      ${crudo(seccion('Rol', html`
        ${crudo(opcionRadio('rol', 'comercio.admin_local', 'Administrador de local', 'Catálogo, horarios, pedidos, caja y personal', true))}
        ${crudo(opcionRadio('rol', 'comercio.operador', 'Operador / cocina', 'Aceptar, preparar, marcar listo y validar entrega'))}
        ${crudo(opcionRadio('rol', 'comercio.contador', 'Contador', 'Facturas, cierres, reportes y conciliación'))}
      `))}
      <div id="error-invitar"></div>
    </form>
    ${crudo(aviso('info', 'Sin envío real', 'La demo no envía correos: el código aparecerá en pantalla.'))}
    ${crudo(barraAccion([boton('Enviar invitación', { variante: 'principal', bloque: true, accion: 'enviar-invitacion' })]))}
  `,
});

export const detalleEquipo: Render = (ctx) => {
  const e = store.leer();
  const m = e.usuarios.find((u) => u.id === ctx.params.usuarioId);
  if (!m) return error404(ctx);
  const d = ROLES[m.rol];

  return {
    titulo: m.nombre,
    atras: '/c/equipo',
    contenido: html`
      ${crudo(listaDatos([
        ['Rol', esc(d.nombre)],
        ['Correo', esc(m.correo)],
        ['Estado', insignia(m.estado, m.estado === 'activo' ? 'exito' : 'alerta')],
        ['Ámbito', esc(d.limite)],
        ['Segundo factor', d.requiereMfa ? 'Obligatorio' : 'No requerido'],
        ['Datos bancarios', d.puedeVerDatosBancarios ? 'Accesibles enmascarados' : 'No accesibles'],
        ['Último acceso', m.ultimoAcceso ? fechaHora(m.ultimoAcceso) : 'Nunca'],
      ]))}
      ${crudo(seccion('Permisos del rol', html`
        <div class="fila fila--envuelve" style="gap:6px">
          ${(d.nombre === 'Operador / cocina / servicio'
            ? ['Aceptar pedidos', 'Preparar', 'Marcar listo', 'Validar entrega', 'Venta de mostrador']
            : d.nombre === 'Contador'
              ? ['Facturas', 'Cierres', 'Reportes', 'Conciliación', 'Exportar']
              : ['Catálogo', 'Horarios', 'Pedidos', 'Caja', 'Personal']
          ).map((x) => crudo(insignia(x, 'neutro')))}
        </div>
      `))}
    `,
  };
};
