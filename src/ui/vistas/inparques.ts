/**
 * Panel institucional. Prioriza tablas, filtros, drill-down y trazabilidad;
 * en teléfono las tablas ruedan dentro de su caja y la navegación baja a la
 * barra inferior, sin perder ninguna función.
 */

import {
  html, crudo, esc, boton, tarjeta, insignia, listaDatos, vacio, aviso, etiquetaDemo,
  seccion, chips, tabla, barraAccion, metrica, buscador,
} from '../componentes';
import type { Render } from './tipos';
import { store } from '../../data/store';
import { sesion } from '../../app/session';
import { filtro, texto } from '../estado-ui';
import { ROLES, ROLE_IDS } from '../../domain/roles';
import { PERMISOS_POR_ROL } from '../../domain/permissions';
import { resolverAmbito, filtrarPorAmbito } from '../../domain/scope';
import { consultar } from '../../data/audit';
import { ETIQUETA_ORDEN, ETIQUETA_PAGO, ETIQUETA_LIQUIDACION, TONO_ORDEN, TONO_PAGO } from '../../domain/state-machines';
import { formatearUsd, formatearVes, formatearTasa, calcularParticipacion } from '../../domain/money';
import { fechaCorta, fechaHora, desde, diasHasta, pluralizar } from '../formato';
import { error404 } from './compartidas';
import { inventarioAdaptadores } from '../../adapters/simulados';
import { conectividad } from '../../net/connectivity';
import type { Negocio, Orden } from '../../domain/types';

/** Etiquetas legibles de categoría; el valor interno nunca se muestra. */
const NOMBRE_CATEGORIA: Record<string, string> = {
  comida: 'Comida', bebidas: 'Bebidas', juguetes: 'Juguetes', artesania: 'Artesanía',
  recuerdos: 'Recuerdos', alquileres: 'Alquileres', atracciones: 'Atracciones', paseos: 'Paseos',
};

function ambito() {
  const u = sesion.usuario();
  const e = store.leer();
  return u ? resolverAmbito(u, e) : { parqueIds: [], negocioIds: [], localIds: [], nacional: false };
}

/** Nombra el ambito real del usuario: nacional, region o parque. */
function tituloAmbito(): string {
  const u = sesion.usuario();
  const e = store.leer();
  if (!u) return 'Panel';
  if (u.scope.level === 'nacional') return 'Panel nacional';
  if (u.scope.level === 'region') {
    const r = e.regiones.find((x) => x.id === u.scope.ids[0]);
    return r ? `Panel · ${r.nombre}` : 'Panel regional';
  }
  const p = e.parques.find((x) => x.id === u.scope.ids[0]);
  return p ? p.nombre : 'Panel';
}

function ordenesVisibles(): Orden[] {
  return filtrarPorAmbito(store.leer().ordenes, ambito());
}

function negociosVisibles(): Negocio[] {
  const a = ambito();
  const e = store.leer();
  const u = sesion.usuario();

  return e.negocios.filter((n) => {
    if (a.nacional || a.negocioIds.includes(n.id)) return true;

    // Un expediente en trámite todavía no tiene local asignado, así que el
    // filtro territorial no puede atribuirlo a ningún parque. Sin esta regla
    // las solicitudes quedarían invisibles justo para quien debe resolverlas.
    const sinLocal = !e.locales.some((l) => l.negocioId === n.id);
    const enTramite = n.estado === 'en_revision' || n.estado === 'borrador';
    const alcanceAmplio = u?.scope.level === 'region' || u?.scope.level === 'nacional';
    return sinLocal && enTramite && alcanceAmplio;
  });
}

// ----------------------------------------------------------------- Tableros

export const dashboard: Render = () => {
  const e = store.leer();
  const u = sesion.usuario()!;
  const a = ambito();
  const negocios = negociosVisibles();
  const ordenes = ordenesVisibles();
  const entregadas = ordenes.filter((o) => o.estado === 'entregada');
  const gmv = entregadas.reduce((s, o) => s + o.totalUsd, 0);
  const mostrador = entregadas.filter((o) => o.canal === 'mostrador');
  const pagos = e.pagos.filter((p) => ordenes.some((o) => o.id === p.ordenId));
  const porVerificar = pagos.filter((p) => p.estado === 'pendiente_verificacion');
  const permisosPorVencer = e.permisos.filter((p) => negocios.some((n) => n.id === p.negocioId) && p.estado === 'por_vencer');
  const disputasAbiertas = e.disputas.filter((d) => ['abierta', 'en_analisis'].includes(d.estado));
  const solicitudes = negocios.filter((n) => n.estado === 'en_revision');

  return {
    titulo: tituloAmbito(),
    subtitulo: ROLES[u.rol].nombre,
    contenido: html`
      ${!a.nacional ? crudo(aviso('info', 'Ámbito limitado', `Ve únicamente ${pluralizar(a.parqueIds.length, 'parque asignado', 'parques asignados')}.`)) : ''}

      ${crudo(seccion('Cobertura', html`<div class="rejilla">
        ${crudo(metrica(String(negocios.length), 'Negocios registrados'))}
        ${crudo(metrica(String(negocios.filter((n) => n.estado === 'activo').length), 'Activos'))}
        ${crudo(metrica(String(e.puntos.filter((p) => a.nacional || a.parqueIds.includes(p.parqueId)).filter((p) => p.estado === 'ocupado').length), 'Puntos ocupados'))}
        ${crudo(metrica(String(permisosPorVencer.length), 'Permisos por vencer', permisosPorVencer.length ? { texto: 'Atención', tono: 'alerta' } : undefined))}
      </div>`))}

      ${crudo(seccion('Ventas', html`<div class="rejilla">
        ${crudo(metrica(formatearUsd(gmv), 'GMV del periodo'))}
        ${crudo(metrica(String(entregadas.length), 'Órdenes'))}
        ${crudo(metrica(formatearUsd(entregadas.length ? gmv / entregadas.length : 0), 'Ticket promedio'))}
        ${crudo(metrica(`${entregadas.length ? Math.round((mostrador.length / entregadas.length) * 100) : 0} %`, 'De mostrador'))}
      </div>`, { texto: 'Reportes', ruta: '/i/reportes' }))}

      ${crudo(seccion('Operación', html`<div class="rejilla">
        ${crudo(metrica(String(ordenes.filter((o) => o.estado === 'pendiente_aceptacion').length), 'Por aceptar'))}
        ${crudo(metrica(String(ordenes.filter((o) => o.estado === 'cancelada').length), 'Canceladas'))}
        ${crudo(metrica(String(e.articulos.filter((x) => !x.disponible).length), 'Agotados'))}
        ${crudo(metrica(String(e.incidencias.filter((i) => i.estado !== 'cerrada').length), 'Incidencias abiertas'))}
      </div>`))}

      ${crudo(seccion('Finanzas', html`<div class="rejilla">
        ${crudo(metrica(String(porVerificar.length), 'Pagos por verificar', porVerificar.length ? { texto: 'Conciliar', tono: 'alerta' } : undefined))}
        ${crudo(metrica(String(e.liquidaciones.filter((l) => l.estado === 'cerrada').length), 'Liquidaciones cerradas'))}
        ${crudo(metrica(String(e.reembolsos.length), 'Reembolsos'))}
        ${crudo(metrica(String(disputasAbiertas.length), 'Disputas abiertas'))}
      </div>`, { texto: 'Contabilidad', ruta: '/i/contabilidad' }))}

      ${solicitudes.length
        ? crudo(seccion('Requieren su decisión', html`<div class="pila">
            ${solicitudes.map((n) => crudo(tarjeta(html`
              <div class="fila fila--sep">
                <div class="crece">
                  <div style="font-weight:650">${n.nombreComercial}</div>
                  <div class="tenue-2">Expediente en revisión · ${desde(n.creadoEn)}</div>
                </div>
                ${crudo(insignia('En revisión', 'alerta'))}
              </div>
            `, { accionIr: `/i/expediente/${n.id}` })))}
          </div>`, { texto: 'Ver todas', ruta: '/i/solicitudes' }))
        : ''}

      ${crudo(seccion('Parques', html`
        ${crudo(tabla(
          [
            { clave: 'n', titulo: 'Parque', render: (p: typeof e.parques[0]) => esc(p.nombre) },
            { clave: 'c', titulo: 'Comercios', render: (p) => String(e.locales.filter((l) => l.parqueId === p.id).length), numerica: true },
            { clave: 'o', titulo: 'Órdenes', render: (p) => String(e.ordenes.filter((o) => o.parqueId === p.id).length), numerica: true },
            { clave: 'e', titulo: 'Estado', render: (p) => insignia(p.piloto ? 'Piloto' : p.activo ? 'Activo' : 'Inactivo', p.piloto ? 'exito' : 'neutro') },
          ],
          e.parques.filter((p) => a.nacional || a.parqueIds.includes(p.id)),
          { rutaFila: (p) => `/i/parque/${p.id}` },
        ))}
      `))}

      <p class="tenue-2 centrado">${formatearTasa(e.tasaBcv)}</p>
    `,
  };
};

export const dashboardParque: Render = (ctx) => {
  const e = store.leer();
  const p = e.parques.find((x) => x.id === ctx.params.parqueId);
  if (!p) return error404(ctx);
  const locales = e.locales.filter((l) => l.parqueId === p.id);
  const ordenes = e.ordenes.filter((o) => o.parqueId === p.id);
  const entregadas = ordenes.filter((o) => o.estado === 'entregada');

  return {
    titulo: p.nombre,
    subtitulo: 'Tablero del parque',
    atras: '/i',
    contenido: html`
      <div class="rejilla mb-2">
        ${crudo(metrica(String(locales.length), 'Locales'))}
        ${crudo(metrica(String(ordenes.length), 'Órdenes'))}
        ${crudo(metrica(formatearUsd(entregadas.reduce((s, o) => s + o.totalUsd, 0)), 'Ventas'))}
        ${crudo(metrica(String(e.zonas.filter((z) => z.parqueId === p.id).length), 'Zonas'))}
      </div>
      ${crudo(seccion('Comercios del parque', html`${crudo(tabla(
        [
          { clave: 'n', titulo: 'Comercio', render: (l: typeof locales[0]) => esc(e.negocios.find((n) => n.id === l.negocioId)?.nombreComercial ?? '') },
          { clave: 'p', titulo: 'Punto', render: (l) => esc(e.puntos.find((x) => x.id === l.puntoId)?.codigo ?? '') },
          { clave: 'e', titulo: 'Estado', render: (l) => insignia(l.abierto ? 'Abierto' : 'Cerrado', l.abierto ? 'exito' : 'neutro') },
          { clave: 'o', titulo: 'Órdenes', render: (l) => String(ordenes.filter((o) => o.localId === l.id).length), numerica: true },
        ],
        locales,
        { rutaFila: (l) => `/i/negocio/${l.negocioId}` },
      ))}`))}
    `,
  };
};

// --------------------------------------------------------------- Territorio

export const territorio: Render = () => {
  const e = store.leer();
  const a = ambito();
  return {
    titulo: 'Estructura territorial',
    contenido: html`
      <p class="bajada">Nacional › región › parque › zona › punto comercial › negocio › local.</p>
      ${e.regiones.map((r) => {
        const parques = e.parques.filter((p) => p.regionId === r.id && (a.nacional || a.parqueIds.includes(p.id)));
        if (parques.length === 0) return '';
        return crudo(seccion(r.nombre, html`<div class="pila">
          ${parques.map((p) => {
            const zonas = e.zonas.filter((z) => z.parqueId === p.id);
            return crudo(tarjeta(html`
              <div class="fila fila--sep">
                <div class="crece">
                  <div style="font-weight:650">${p.nombre}</div>
                  <div class="tenue-2">${pluralizar(zonas.length, 'zona', 'zonas')} · ${pluralizar(e.puntos.filter((x) => x.parqueId === p.id).length, 'punto', 'puntos')}</div>
                </div>
                ${p.piloto ? crudo(insignia('Piloto', 'exito')) : ''}
              </div>
            `, { accionIr: `/i/parque/${p.id}` }));
          })}
        </div>`));
      })}
    `,
  };
};

export const parques: Render = () => {
  const e = store.leer();
  const a = ambito();
  const lista = e.parques.filter((p) => a.nacional || a.parqueIds.includes(p.id));
  return {
    titulo: 'Parques',
    contenido: tabla(
      [
        { clave: 'n', titulo: 'Parque', render: (p: typeof lista[0]) => esc(p.nombre) },
        { clave: 't', titulo: 'Tipo', render: (p) => esc(p.tipo) },
        { clave: 'r', titulo: 'Región', render: (p) => esc(e.regiones.find((r) => r.id === p.regionId)?.nombre ?? '') },
        { clave: 'z', titulo: 'Zonas', render: (p) => String(e.zonas.filter((z) => z.parqueId === p.id).length), numerica: true },
        { clave: 'e', titulo: 'Estado', render: (p) => insignia(p.activo ? 'Activo' : 'Inactivo', p.activo ? 'exito' : 'neutro') },
      ],
      lista,
      { rutaFila: (p) => `/i/parque/${p.id}` },
    ),
  };
};


export const zonas: Render = () => {
  const e = store.leer();
  const a = ambito();
  const lista = e.zonas.filter((z) => a.nacional || a.parqueIds.includes(z.parqueId));
  return {
    titulo: 'Zonas',
    contenido: tabla(
      [
        { clave: 'n', titulo: 'Zona', render: (z: typeof lista[0]) => esc(z.nombre) },
        { clave: 'p', titulo: 'Parque', render: (z) => esc(e.parques.find((x) => x.id === z.parqueId)?.nombre ?? '') },
        { clave: 'pt', titulo: 'Puntos', render: (z) => String(e.puntos.filter((x) => x.zonaId === z.id).length), numerica: true },
      ],
      lista,
    ),
  };
};

export const puntos: Render = () => {
  const e = store.leer();
  const a = ambito();
  const f = filtro('puntos', 'todos');
  let lista = e.puntos.filter((p) => a.nacional || a.parqueIds.includes(p.parqueId));
  if (f !== 'todos') lista = lista.filter((p) => p.estado === f);

  return {
    titulo: 'Puntos comerciales',
    contenido: html`
      ${crudo(chips(
        [{ valor: 'todos', texto: 'Todos' }, { valor: 'ocupado', texto: 'Ocupados' }, { valor: 'libre', texto: 'Libres' }, { valor: 'inhabilitado', texto: 'Inhabilitados' }],
        f,
        'filtro-puntos',
      ))}
      ${crudo(tabla(
        [
          { clave: 'c', titulo: 'Código', render: (p: typeof lista[0]) => `<span class="mono">${esc(p.codigo)}</span>` },
          { clave: 'n', titulo: 'Punto', render: (p) => esc(p.nombre) },
          { clave: 'z', titulo: 'Zona', render: (p) => esc(e.zonas.find((z) => z.id === p.zonaId)?.nombre ?? '') },
          { clave: 'o', titulo: 'Ocupante', render: (p) => {
            const l = e.locales.find((x) => x.puntoId === p.id);
            return l ? esc(e.negocios.find((n) => n.id === l.negocioId)?.nombreComercial ?? '') : '—';
          } },
          { clave: 'e', titulo: 'Estado', render: (p) => insignia(p.estado, p.estado === 'ocupado' ? 'exito' : p.estado === 'libre' ? 'neutro' : 'error') },
          { clave: 'q', titulo: 'QR', render: (p) => `<span class="mono tenue-2">${esc(p.qr)}</span>` },
        ],
        lista,
      ))}
    `,
  };
};

// -------------------------------------------------------------- Concesiones

export const negocios: Render = () => {
  const e = store.leer();
  const f = filtro('negocios', 'todos');
  const q = texto('negocios').toLowerCase();
  let lista = negociosVisibles();
  if (f !== 'todos') lista = lista.filter((n) => n.estado === f);
  if (q) lista = lista.filter((n) => n.nombreComercial.toLowerCase().includes(q) || n.rif.toLowerCase().includes(q));

  return {
    titulo: 'Directorio de negocios',
    contenido: html`
      ${crudo(buscador('q-neg', 'Buscar por nombre o RIF', texto('negocios'), 'buscar-negocios'))}
      ${crudo(chips(
        [
          { valor: 'todos', texto: 'Todos' },
          { valor: 'activo', texto: 'Activos' },
          { valor: 'en_revision', texto: 'En revisión' },
          { valor: 'suspendido', texto: 'Suspendidos' },
        ],
        f,
        'filtro-negocios',
      ))}
      ${crudo(tabla(
        [
          { clave: 'n', titulo: 'Comercio', render: (n: Negocio) => esc(n.nombreComercial) },
          { clave: 'r', titulo: 'RIF', render: (n) => `<span class="mono">${esc(n.rif)}</span>` },
          { clave: 'c', titulo: 'Categoría', render: (n) => esc(NOMBRE_CATEGORIA[n.categoria] ?? n.categoria) },
          { clave: 'e', titulo: 'Estado', render: (n) => insignia(n.estado.replace('_', ' '), n.estado === 'activo' ? 'exito' : n.estado === 'suspendido' || n.estado === 'rechazado' ? 'error' : 'alerta') },
          { clave: 'o', titulo: 'Órdenes', render: (n) => String(e.ordenes.filter((o) => o.negocioId === n.id).length), numerica: true },
        ],
        lista,
        { rutaFila: (n) => `/i/negocio/${n.id}`, vacio: 'Ningún negocio coincide con el filtro.' },
      ))}
    `,
  };
};


export const solicitudes: Render = () => {
  const e = store.leer();
  const lista = negociosVisibles().filter((n) => ['en_revision', 'borrador'].includes(n.estado));
  return {
    titulo: 'Solicitudes',
    contenido: html`
      <p class="bajada">Expedientes esperando revisión y decisión.</p>
      ${lista.length === 0
        ? crudo(vacio('✓', 'Nada pendiente', 'No hay expedientes esperando revisión en su ámbito.'))
        : crudo(html`<div class="pila">${lista.map((n) => {
            const docs = e.documentos.filter((d) => d.negocioId === n.id);
            const pend = docs.filter((d) => d.estado !== 'aprobado').length;
            return crudo(tarjeta(html`
              <div class="fila fila--sep">
                <div class="crece">
                  <div style="font-weight:650">${n.nombreComercial}</div>
                  <div class="tenue-2">${NOMBRE_CATEGORIA[n.categoria] ?? n.categoria} · ${desde(n.creadoEn)}</div>
                </div>
                ${crudo(insignia(`${pend} por revisar`, pend ? 'alerta' : 'exito'))}
              </div>
            `, { accionIr: `/i/expediente/${n.id}` }));
          })}</div>`)}
    `,
  };
};

export const expediente: Render = (ctx) => {
  const e = store.leer();
  const n = e.negocios.find((x) => x.id === ctx.params.negocioId);
  if (!n) return error404(ctx);
  const docs = e.documentos.filter((d) => d.negocioId === n.id);
  const todosAprobados = docs.every((d) => d.estado === 'aprobado');

  return {
    titulo: 'Expediente',
    subtitulo: n.nombreComercial,
    atras: '/i/solicitudes',
    contenido: html`
      ${crudo(listaDatos([
        ['Comercio', esc(n.nombreComercial)],
        ['Razón social', esc(n.razonSocial)],
        ['RIF', `<span class="mono">${esc(n.rif)}</span>`],
        ['Categoría', esc(NOMBRE_CATEGORIA[n.categoria] ?? n.categoria)],
        ['Estado', insignia(n.estado.replace('_', ' '), n.estado === 'activo' ? 'exito' : 'alerta')],
      ]))}

      ${crudo(seccion('Documentos', html`<div class="pila">
        ${docs.map((d) => crudo(tarjeta(html`
          <div class="fila fila--sep">
            <div class="crece">
              <div style="font-weight:650">${d.tipo.replace(/_/g, ' ')}</div>
              <div class="tenue-2 mono">${d.nombreArchivo}</div>
            </div>
            ${crudo(insignia(d.estado, d.estado === 'aprobado' ? 'exito' : d.estado === 'observado' ? 'error' : 'alerta'))}
          </div>
          ${d.observacion ? crudo(`<p class="tenue mt-1">${esc(d.observacion)}</p>`) : ''}
          ${d.estado !== 'aprobado'
            ? crudo(`<div class="fila mt-2" style="gap:8px">
                ${boton('Aprobar', { variante: 'principal', pequeno: true, accion: 'aprobar-documento', valor: d.id })}
                ${boton('Observar', { variante: 'secundario', pequeno: true, accion: 'observar-documento', valor: d.id })}
              </div>`)
            : ''}
        `)))}
      </div>`))}

      ${!todosAprobados ? crudo(aviso('alerta', 'Documentos pendientes', 'No debe aprobarse el expediente mientras haya documentos sin revisar.')) : ''}

      ${n.estado === 'en_revision'
        ? crudo(barraAccion([
            boton('Aprobar expediente', { variante: 'principal', bloque: true, accion: 'aprobar-expediente', valor: n.id, desactivado: !todosAprobados }),
            boton('Rechazar', { variante: 'secundario', accion: 'rechazar-expediente', valor: n.id }),
          ]))
        : ''}
    `,
  };
};


export const aprobaciones: Render = () => {
  const e = store.leer();
  const pendientes = [
    ...e.negocios.filter((n) => n.estado === 'en_revision').map((n) => ({ tipo: 'Expediente', nombre: n.nombreComercial, ruta: `/i/expediente/${n.id}`, desdeFecha: n.creadoEn })),
    ...e.ajustes.filter((a) => a.estado === 'solicitado').map((a) => ({ tipo: 'Ajuste', nombre: a.concepto, ruta: '/i/ajustes', desdeFecha: a.creadoEn })),
    ...e.reembolsos.filter((r) => r.estado === 'solicitado').map((r) => ({ tipo: 'Reembolso', nombre: r.motivo, ruta: '/i/reembolsos', desdeFecha: r.creadoEn })),
  ];

  return {
    titulo: 'Aprobaciones',
    contenido: html`
      <p class="bajada">Todo lo que espera una decisión suya.</p>
      ${pendientes.length === 0
        ? crudo(vacio('✓', 'Sin pendientes', 'No hay nada esperando su aprobación.'))
        : crudo(html`<div class="pila">${pendientes.map((p) => crudo(tarjeta(html`
            <div class="fila fila--sep">
              <div class="crece">
                <div style="font-weight:650">${p.nombre}</div>
                <div class="tenue-2">${p.tipo} · ${desde(p.desdeFecha)}</div>
              </div>
              <span aria-hidden="true" style="color:var(--texto-3)">›</span>
            </div>
          `, { accionIr: p.ruta })))}</div>`)}
    `,
  };
};

export const permisos: Render = () => {
  const e = store.leer();
  const visibles = negociosVisibles().map((n) => n.id);
  const f = filtro('permisos', 'todos');
  let lista = e.permisos.filter((p) => visibles.includes(p.negocioId));
  if (f !== 'todos') lista = lista.filter((p) => p.estado === f);

  return {
    titulo: 'Permisos y concesiones',
    contenido: html`
      ${crudo(chips(
        [{ valor: 'todos', texto: 'Todos' }, { valor: 'vigente', texto: 'Vigentes' }, { valor: 'por_vencer', texto: 'Por vencer' }, { valor: 'vencido', texto: 'Vencidos' }],
        f,
        'filtro-permisos',
      ))}
      ${crudo(tabla(
        [
          { clave: 'n', titulo: 'Número', render: (p: typeof lista[0]) => `<span class="mono">${esc(p.numero)}</span>` },
          { clave: 'c', titulo: 'Comercio', render: (p) => esc(e.negocios.find((n) => n.id === p.negocioId)?.nombreComercial ?? '') },
          { clave: 't', titulo: 'Tipo', render: (p) => esc(p.tipo.replace(/_/g, ' ')) },
          { clave: 'h', titulo: 'Vence', render: (p) => esc(fechaCorta(`${p.hasta}T12:00:00`)) },
          { clave: 'd', titulo: 'Días', render: (p) => String(diasHasta(p.hasta)), numerica: true },
          { clave: 'e', titulo: 'Estado', render: (p) => insignia(p.estado.replace('_', ' '), p.estado === 'vigente' ? 'exito' : p.estado === 'por_vencer' ? 'alerta' : 'error') },
        ],
        lista,
        { rutaFila: (p) => `/i/negocio/${p.negocioId}` },
      ))}
    `,
  };
};

export const contratos: Render = () => {
  const e = store.leer();
  const visibles = negociosVisibles().map((n) => n.id);
  const lista = e.contratos.filter((c) => visibles.includes(c.negocioId));
  return {
    titulo: 'Contratos',
    contenido: tabla(
      [
        { clave: 'c', titulo: 'Comercio', render: (c: typeof lista[0]) => esc(e.negocios.find((n) => n.id === c.negocioId)?.nombreComercial ?? '') },
        { clave: 'k', titulo: 'Canon', render: (c) => esc(formatearUsd(c.canonFijoUsd)), numerica: true },
        { clave: 'p', titulo: '% venta', render: (c) => `${c.porcentajeSobreVenta} %`, numerica: true },
        { clave: 'm', titulo: 'Mínimo', render: (c) => esc(formatearUsd(c.minimoGarantizadoUsd)), numerica: true },
        { clave: 'h', titulo: 'Vence', render: (c) => esc(fechaCorta(`${c.hasta}T12:00:00`)) },
        { clave: 'e', titulo: 'Estado', render: (c) => insignia(c.estado, c.estado === 'vigente' ? 'exito' : 'neutro') },
      ],
      lista,
      { rutaFila: (c) => `/i/negocio/${c.negocioId}` },
    ),
  };
};

export const canones: Render = () => {
  const e = store.leer();
  const visibles = negociosVisibles();
  const filas = visibles.map((n) => {
    const contrato = e.contratos.find((c) => c.negocioId === n.id);
    const ventas = e.ordenes.filter((o) => o.negocioId === n.id && o.estado === 'entregada').reduce((s, o) => s + o.totalUsd, 0);
    const p = contrato ? calcularParticipacion(ventas, contrato) : null;
    return { negocio: n, ventas, comision: p?.comisionUsd ?? 0, canon: p?.canonUsd ?? 0, total: p?.totalUsd ?? 0 };
  });

  return {
    titulo: 'Cánones y comisiones',
    contenido: html`
      <p class="bajada">La obligación con INPARQUES se calcula por separado del ingreso del comercio.</p>
      ${crudo(tabla(
        [
          { clave: 'c', titulo: 'Comercio', render: (f: typeof filas[0]) => esc(f.negocio.nombreComercial) },
          { clave: 'v', titulo: 'Ventas', render: (f) => esc(formatearUsd(f.ventas)), numerica: true },
          { clave: 'co', titulo: 'Comisión', render: (f) => esc(formatearUsd(f.comision)), numerica: true },
          { clave: 'ca', titulo: 'Canon', render: (f) => esc(formatearUsd(f.canon)), numerica: true },
          { clave: 't', titulo: 'Total', render: (f) => `<strong>${esc(formatearUsd(f.total))}</strong>`, numerica: true },
        ],
        filas,
        { rutaFila: (f) => `/i/negocio/${f.negocio.id}` },
      ))}
    `,
  };
};

export const vencimientos: Render = () => {
  const e = store.leer();
  const visibles = negociosVisibles().map((n) => n.id);
  const docs = e.documentos
    .filter((d) => visibles.includes(d.negocioId) && d.vigenciaHasta)
    .map((d) => ({ tipo: 'Documento', nombre: d.tipo.replace(/_/g, ' '), negocioId: d.negocioId, hasta: d.vigenciaHasta! }));
  const perms = e.permisos
    .filter((p) => visibles.includes(p.negocioId))
    .map((p) => ({ tipo: 'Permiso', nombre: p.numero, negocioId: p.negocioId, hasta: p.hasta }));
  const todos = [...docs, ...perms].sort((a, b) => a.hasta.localeCompare(b.hasta));

  return {
    titulo: 'Vencimientos',
    contenido: html`
      <p class="bajada">Documentos y permisos ordenados por fecha de vencimiento.</p>
      ${crudo(tabla(
        [
          { clave: 't', titulo: 'Tipo', render: (x: typeof todos[0]) => esc(x.tipo) },
          { clave: 'n', titulo: 'Concepto', render: (x) => esc(x.nombre) },
          { clave: 'c', titulo: 'Comercio', render: (x) => esc(e.negocios.find((n) => n.id === x.negocioId)?.nombreComercial ?? '') },
          { clave: 'f', titulo: 'Vence', render: (x) => esc(fechaCorta(`${x.hasta}T12:00:00`)) },
          { clave: 'd', titulo: 'Días', render: (x) => {
            const d = diasHasta(x.hasta);
            return insignia(d > 0 ? String(d) : 'Vencido', d < 0 ? 'error' : d < 45 ? 'alerta' : 'exito');
          }, numerica: true },
        ],
        todos,
        { rutaFila: (x) => `/i/negocio/${x.negocioId}` },
      ))}
    `,
  };
};

// ------------------------------------------------------------------ Control

export const inspecciones: Render = () => {
  const e = store.leer();
  const visibles = negociosVisibles().map((n) => n.id);
  const lista = e.inspecciones.filter((i) => visibles.includes(i.negocioId));

  return {
    titulo: 'Inspecciones',
    contenido: html`
      ${lista.length === 0
        ? crudo(vacio('✓', 'Sin inspecciones', 'Todavía no se ha registrado ninguna inspección en su ámbito.'))
        : crudo(html`<div class="pila">${lista.map((i) => crudo(tarjeta(html`
            <div class="fila fila--sep">
              <div class="crece">
                <div style="font-weight:650">${e.negocios.find((n) => n.id === i.negocioId)?.nombreComercial ?? ''}</div>
                <div class="tenue-2">${fechaCorta(i.fecha)} · ${e.usuarios.find((u) => u.id === i.inspectorId)?.nombre ?? ''}</div>
              </div>
              ${crudo(insignia(i.resultado.replace('_', ' '), i.resultado === 'conforme' ? 'exito' : i.resultado === 'observado' ? 'alerta' : 'error'))}
            </div>
          `, { accionIr: `/i/inspeccion/${i.id}` })))}</div>`)}
      ${crudo(barraAccion([boton('Registrar inspección', { variante: 'principal', bloque: true, accion: 'nueva-inspeccion' })]))}
    `,
  };
};


export const incidencias: Render = () => {
  const e = store.leer();
  const a = ambito();
  const lista = e.incidencias.filter((i) => a.nacional || a.parqueIds.includes(i.parqueId));

  return {
    titulo: 'Incidencias',
    contenido: html`
      ${lista.length === 0
        ? crudo(vacio('⚠', 'Sin incidencias', 'No hay incidencias abiertas en su ámbito.'))
        : crudo(html`<div class="pila">${lista.map((i) => crudo(tarjeta(html`
            <div class="fila fila--sep">
              <div class="crece">
                <div style="font-weight:650">${i.tipo}</div>
                <div class="tenue-2">${e.parques.find((p) => p.id === i.parqueId)?.nombre ?? ''} · ${desde(i.creadaEn)}</div>
              </div>
              ${crudo(insignia(i.estado.replace('_', ' '), i.estado === 'resuelta' || i.estado === 'cerrada' ? 'exito' : i.estado === 'en_atencion' ? 'progreso' : 'alerta'))}
            </div>
            <p class="tenue mt-1">${i.descripcion}</p>
          `)))}</div>`)}
      ${crudo(barraAccion([boton('Reportar incidencia', { variante: 'principal', bloque: true, accion: 'nueva-incidencia' })]))}
    `,
  };
};

export const operacion: Render = () => {
  const e = store.leer();
  const ordenes = ordenesVisibles();
  const activas = ordenes.filter((o) => !['entregada', 'cancelada'].includes(o.estado));

  return {
    titulo: 'Operación del parque',
    contenido: html`
      <div class="rejilla mb-2">
        ${crudo(metrica(String(activas.length), 'Órdenes activas'))}
        ${crudo(metrica(String(e.locales.filter((l) => l.abierto).length), 'Locales abiertos'))}
        ${crudo(metrica(String(e.articulos.filter((a) => !a.disponible).length), 'Artículos agotados'))}
        ${crudo(metrica(String(e.turnos.filter((t) => t.estado === 'abierto').length), 'Cajas abiertas'))}
      </div>
      ${crudo(seccion('Órdenes en curso', html`${crudo(tabla(
        [
          { clave: 'c', titulo: 'Código', render: (o: Orden) => `<span class="mono">${esc(o.codigo)}</span>` },
          { clave: 'n', titulo: 'Comercio', render: (o) => esc(e.negocios.find((x) => x.id === o.negocioId)?.nombreComercial ?? '') },
          { clave: 'e', titulo: 'Estado', render: (o) => insignia(ETIQUETA_ORDEN[o.estado], TONO_ORDEN[o.estado]) },
          { clave: 't', titulo: 'Total', render: (o) => esc(formatearUsd(o.totalUsd)), numerica: true },
        ],
        activas,
        { vacio: 'No hay órdenes en curso.' },
      ))}`))}
    `,
  };
};

// ----------------------------------------------------------------- Finanzas

export const contabilidad: Render = () => {
  const e = store.leer();
  const ordenes = ordenesVisibles().filter((o) => o.estado === 'entregada');
  const gmv = ordenes.reduce((s, o) => s + o.totalUsd, 0);
  const iva = ordenes.reduce((s, o) => s + o.impuestosUsd, 0);
  const liqs = e.liquidaciones;
  const devengado = liqs.reduce((s, l) => s + l.netoUsd, 0);

  return {
    titulo: 'Contabilidad',
    contenido: html`
      <p class="bajada">Cada concepto por separado: ingreso, impuesto, comisión y canon.</p>
      <div class="rejilla mb-2">
        ${crudo(metrica(formatearUsd(gmv), 'Ventas brutas'))}
        ${crudo(metrica(formatearUsd(iva), 'IVA'))}
        ${crudo(metrica(formatearUsd(devengado), 'Devengado INPARQUES'))}
        ${crudo(metrica(String(liqs.filter((l) => l.estado === 'cerrada').length), 'Periodos cerrados'))}
      </div>

      ${crudo(seccion('Liquidaciones', html`${crudo(tabla(
        [
          { clave: 'n', titulo: 'Comercio', render: (l: typeof liqs[0]) => esc(e.negocios.find((x) => x.id === l.negocioId)?.nombreComercial ?? '') },
          { clave: 'p', titulo: 'Periodo', render: (l) => `${esc(l.periodoDesde)} – ${esc(l.periodoHasta)}` },
          { clave: 'v', titulo: 'Ventas', render: (l) => esc(formatearUsd(l.ventasUsd)), numerica: true },
          { clave: 'c', titulo: 'Comisión', render: (l) => esc(formatearUsd(l.comisionUsd)), numerica: true },
          { clave: 'k', titulo: 'Canon', render: (l) => esc(formatearUsd(l.canonUsd)), numerica: true },
          { clave: 'e', titulo: 'Estado', render: (l) => insignia(ETIQUETA_LIQUIDACION[l.estado], l.estado === 'cerrada' ? 'exito' : l.estado === 'conciliada' ? 'progreso' : 'alerta') },
        ],
        liqs,
        { rutaFila: () => '/i/cierres' },
      ))}`))}

      ${crudo(aviso('info', 'Trazabilidad hasta la evidencia', 'Cada cifra puede descender hasta el parque, el negocio, la orden y el movimiento bancario. Si una cifra no es trazable, sirve para presentación, no para auditoría.'))}
    `,
  };
};

export const conciliacion: Render = () => {
  const e = store.leer();
  const ordenes = ordenesVisibles();
  const pagos = e.pagos.filter((p) => ordenes.some((o) => o.id === p.ordenId));
  const f = filtro('conc-inp', 'todos');
  let lista = pagos;
  if (f === 'pendientes') lista = pagos.filter((p) => p.estado === 'pendiente_verificacion');
  if (f === 'diferencias') lista = pagos.filter((p) => ['fallido', 'revertido'].includes(p.estado));

  return {
    titulo: 'Conciliación',
    contenido: html`
      ${crudo(chips(
        [{ valor: 'todos', texto: 'Todos' }, { valor: 'pendientes', texto: 'Pendientes' }, { valor: 'diferencias', texto: 'Diferencias' }],
        f,
        'filtro-conc-inp',
      ))}
      <div class="rejilla mb-2">
        ${crudo(metrica(String(pagos.filter((p) => p.estado === 'confirmado').length), 'Confirmados'))}
        ${crudo(metrica(String(pagos.filter((p) => p.estado === 'pendiente_verificacion').length), 'Por verificar'))}
        ${crudo(metrica(formatearVes(pagos.filter((p) => p.estado === 'confirmado').reduce((s, p) => s + p.montoVes, 0)), 'Cobrado'))}
        ${crudo(metrica(String(pagos.filter((p) => p.estado === 'reembolsado').length), 'Reembolsados'))}
      </div>
      ${crudo(tabla(
        [
          { clave: 'o', titulo: 'Orden', render: (p: typeof pagos[0]) => `<span class="mono">${esc(ordenes.find((o) => o.id === p.ordenId)?.codigo ?? '')}</span>` },
          { clave: 'm', titulo: 'Método', render: (p) => esc(p.metodo.replace('_', ' ')) },
          { clave: 'r', titulo: 'Referencia', render: (p) => `<span class="mono">${esc(p.referencia ?? '—')}</span>` },
          { clave: 'e', titulo: 'Estado', render: (p) => insignia(ETIQUETA_PAGO[p.estado], TONO_PAGO[p.estado]) },
          { clave: 'a', titulo: 'Adaptador', render: (p) => `<span class="mono tenue-2">${esc(p.adaptador)}</span>` },
          { clave: 'v', titulo: 'Monto', render: (p) => esc(formatearVes(p.montoVes)), numerica: true },
        ],
        lista,
      ))}
    `,
  };
};


export const cierres: Render = () => {
  const e = store.leer();
  return {
    titulo: 'Cierres',
    contenido: html`
      ${crudo(aviso('alerta', 'Registros inmutables', 'Un cierre no se edita ni se borra. Las correcciones se hacen con un ajuste, un reverso o una nota, dejando trazabilidad.'))}
      <div class="mt-2">${crudo(tabla(
        [
          { clave: 'n', titulo: 'Comercio', render: (l: typeof e.liquidaciones[0]) => esc(e.negocios.find((x) => x.id === l.negocioId)?.nombreComercial ?? '') },
          { clave: 'p', titulo: 'Periodo', render: (l) => `${esc(l.periodoDesde)} – ${esc(l.periodoHasta)}` },
          { clave: 'v', titulo: 'Ventas', render: (l) => esc(formatearUsd(l.ventasUsd)), numerica: true },
          { clave: 'net', titulo: 'Neto', render: (l) => esc(formatearUsd(l.netoUsd)), numerica: true },
          { clave: 'e', titulo: 'Estado', render: (l) => insignia(ETIQUETA_LIQUIDACION[l.estado], l.estado === 'cerrada' ? 'exito' : 'alerta') },
          { clave: 'a', titulo: 'Acción', render: (l) =>
            l.estado === 'cerrada'
              ? '<span class="tenue-2">Solo ajuste</span>'
              : l.estado === 'conciliada'
                ? boton('Cerrar', { variante: 'texto', pequeno: true, accion: 'cerrar-liquidacion', valor: l.id })
                : boton('Conciliar', { variante: 'texto', pequeno: true, accion: 'conciliar', valor: l.id }) },
        ],
        e.liquidaciones,
      ))}</div>
      <p class="tenue-2 mt-2">No existe ninguna acción de "eliminar" ni de "editar cierre" en toda la aplicación.</p>
    `,
  };
};

export const reembolsos: Render = () => {
  const e = store.leer();
  return {
    titulo: 'Reembolsos',
    contenido: html`
      <p class="bajada">Los reembolsos altos exigen doble aprobación y verificación en dos pasos.</p>
      ${e.reembolsos.length === 0
        ? crudo(vacio('↩', 'Sin reembolsos', 'No se ha solicitado ningún reembolso.'))
        : crudo(html`<div class="pila">${e.reembolsos.map((r) => {
            const o = e.ordenes.find((x) => x.id === r.ordenId);
            return crudo(tarjeta(html`
              <div class="fila fila--sep">
                <div class="crece">
                  <div style="font-weight:650">${formatearUsd(r.montoUsd)}</div>
                  <div class="tenue-2 mono">${o?.codigo ?? r.ordenId}</div>
                </div>
                ${crudo(insignia(r.estado, r.estado === 'ejecutado' || r.estado === 'aprobado' ? 'exito' : r.estado === 'rechazado' ? 'error' : 'alerta'))}
              </div>
              <div class="mt-1">${crudo(listaDatos([
                ['Motivo', esc(r.motivo)],
                r.evidencia ? ['Evidencia', `<span class="mono">${esc(r.evidencia)}</span>`] : null,
                ['Solicitado por', esc(e.usuarios.find((u) => u.id === r.solicitadoPor)?.nombre ?? '')],
                r.aprobadoPor ? ['Aprobado por', esc(e.usuarios.find((u) => u.id === r.aprobadoPor)?.nombre ?? '')] : null,
              ]))}</div>
              ${r.estado === 'solicitado'
                ? crudo(`<div class="mt-2">${boton('Aprobar reembolso', { variante: 'principal', pequeno: true, accion: 'aprobar-reembolso', valor: r.id })}</div>`)
                : ''}
            `));
          })}</div>`)}
    `,
  };
};

export const ajustes: Render = () => {
  const e = store.leer();
  return {
    titulo: 'Ajustes',
    contenido: html`
      <p class="bajada">Correcciones sobre periodos cerrados, siempre con motivo y evidencia.</p>
      ${e.ajustes.length === 0
        ? crudo(vacio('⚙', 'Sin ajustes', 'No se ha registrado ningún ajuste.'))
        : crudo(html`<div class="pila">${e.ajustes.map((a) => crudo(tarjeta(html`
            <div class="fila fila--sep">
              <div class="crece">
                <div style="font-weight:650">${a.concepto}</div>
                <div class="tenue-2">${desde(a.creadoEn)}</div>
              </div>
              ${crudo(insignia(a.estado, a.estado === 'aprobado' ? 'exito' : a.estado === 'rechazado' ? 'error' : 'alerta'))}
            </div>
            <div class="mt-1">${crudo(listaDatos([
              ['Monto', formatearUsd(a.montoUsd)],
              ['Motivo', esc(a.motivo)],
              a.evidencia ? ['Evidencia', `<span class="mono">${esc(a.evidencia)}</span>`] : null,
            ]))}</div>
          `)))}</div>`)}
      ${crudo(barraAccion([boton('Registrar ajuste', { variante: 'principal', bloque: true, accion: 'nuevo-ajuste' })]))}
    `,
  };
};

// ------------------------------------------------------------------ Soporte

export const disputas: Render = () => {
  const e = store.leer();
  const f = filtro('disputas', 'abiertas');
  let lista = e.disputas;
  if (f === 'abiertas') lista = lista.filter((d) => ['abierta', 'en_analisis'].includes(d.estado));
  if (f === 'resueltas') lista = lista.filter((d) => d.estado.startsWith('resuelta'));

  return {
    titulo: 'Disputas',
    contenido: html`
      ${crudo(chips(
        [{ valor: 'abiertas', texto: 'Abiertas' }, { valor: 'resueltas', texto: 'Resueltas' }, { valor: 'todas', texto: 'Todas' }],
        f,
        'filtro-disputas',
      ))}
      ${lista.length === 0
        ? crudo(vacio('⚑', 'Sin disputas', 'No hay reclamos con este filtro.'))
        : crudo(html`<div class="pila">${lista.map((d) => {
            const o = e.ordenes.find((x) => x.id === d.ordenId);
            return crudo(tarjeta(html`
              <div class="fila fila--sep">
                <div class="crece">
                  <div style="font-weight:650">${d.motivo}</div>
                  <div class="tenue-2 mono">${o?.codigo ?? ''} · ${desde(d.creadaEn)}</div>
                </div>
                ${crudo(insignia(d.estado.replace(/_/g, ' '), d.estado.startsWith('resuelta') ? 'exito' : d.estado === 'en_analisis' ? 'progreso' : 'alerta'))}
              </div>
            `, { accionIr: `/i/disputa/${d.id}` }));
          })}</div>`)}
    `,
  };
};


export const sla: Render = () => {
  const e = store.leer();
  const abiertas = e.disputas.filter((d) => !d.estado.startsWith('resuelta'));
  const dentro = abiertas.filter((d) => (Date.now() - new Date(d.creadaEn).getTime()) / 3600000 < d.slaHoras);

  return {
    titulo: 'SLA de soporte',
    contenido: html`
      <div class="rejilla mb-2">
        ${crudo(metrica(String(abiertas.length), 'Casos abiertos'))}
        ${crudo(metrica(String(dentro.length), 'Dentro del plazo'))}
        ${crudo(metrica(String(abiertas.length - dentro.length), 'Fuera de plazo', abiertas.length - dentro.length ? { texto: 'Atender', tono: 'error' } : undefined))}
        ${crudo(metrica(`${e.disputas.length ? Math.round((e.disputas.filter((d) => d.estado.startsWith('resuelta')).length / e.disputas.length) * 100) : 0} %`, 'Resolución'))}
      </div>
      ${crudo(tabla(
        [
          { clave: 'm', titulo: 'Caso', render: (d: typeof abiertas[0]) => esc(d.motivo) },
          { clave: 'a', titulo: 'Abierto', render: (d) => esc(desde(d.creadaEn)) },
          { clave: 's', titulo: 'Compromiso', render: (d) => `${d.slaHoras} h`, numerica: true },
          { clave: 'e', titulo: 'Estado', render: (d) => {
            const h = (Date.now() - new Date(d.creadaEn).getTime()) / 3600000;
            return insignia(h < d.slaHoras ? 'En plazo' : 'Vencido', h < d.slaHoras ? 'exito' : 'error');
          } },
        ],
        abiertas,
        { rutaFila: (d) => `/i/disputa/${d.id}`, vacio: 'Sin casos abiertos.' },
      ))}
    `,
  };
};

// ----------------------------------------------------------- Administración

/** Cuántos eventos se muestran de una vez. */
const PAGINA_AUDITORIA = 60;

export const auditoria: Render = () => {
  const e = store.leer();
  const u = sesion.usuario()!;
  const q = texto('auditoria');
  // La bitácora respeta el ámbito como todo lo demás: Dirección Comercial
  // tiene alcance regional y antes veía el país entero.
  const todos = filtrarAuditoriaPorAmbito(consultar(e, q ? { texto: q } : {}), u, e);
  // Y ya no se cortan los eventos antiguos en seco: se van mostrando más.
  const tope = Number(filtro('auditoria-tope', String(PAGINA_AUDITORIA)));
  const eventos = todos.slice(0, tope);

  return {
    titulo: 'Bitácora de auditoría',
    contenido: html`
      <p class="bajada">Registro append-only. No admite borrado ni edición. ${todos.length} evento(s) en su ámbito.</p>
      ${crudo(buscador('q-aud', 'Buscar por usuario, acción o motivo', q, 'buscar-auditoria'))}
      ${eventos.length === 0
        ? crudo(vacio('▤', 'Sin eventos', q ? 'Ningún evento coincide con la búsqueda.' : 'Todavía no se han registrado acciones. Opere en cualquier panel y vuelva aquí.'))
        : crudo(html`<div class="pila">${eventos.slice(0, 60).map((ev) => crudo(tarjeta(html`
            <div class="fila fila--sep">
              <div class="crece">
                <div style="font-weight:650;font-size:14.5px" class="mono">${ev.accion}</div>
                <div class="tenue-2">${ev.usuarioNombre} · ${ROLES[ev.rol]?.nombre ?? ev.rol}</div>
              </div>
              <span class="tenue-2">${desde(ev.en)}</span>
            </div>
            <div class="mt-1">${crudo(listaDatos([
              ['Entidad', `<span class="mono">${esc(ev.entidad)} · ${esc(ev.entidadId)}</span>`],
              ev.motivo ? ['Motivo', esc(ev.motivo)] : null,
              ev.evidencia ? ['Evidencia', `<span class="mono">${esc(ev.evidencia)}</span>`] : null,
              ['Segundo factor', ev.mfaVerificado ? 'Verificado' : 'No aplica'],
              ev.aprobadoPor ? ['Aprobado por', esc(e.usuarios.find((u) => u.id === ev.aprobadoPor)?.nombre ?? ev.aprobadoPor)] : null,
              ['Fecha', fechaHora(ev.en)],
            ]))}</div>
          `)))}</div>`)}
      ${todos.length > eventos.length
        ? crudo(`<div class="mt-2" style="text-align:center">
            ${boton(`Ver ${Math.min(PAGINA_AUDITORIA, todos.length - eventos.length)} más de ${todos.length - eventos.length}`, {
              variante: 'secundario',
              accion: 'filtro-auditoria-tope',
              valor: String(tope + PAGINA_AUDITORIA),
            })}
          </div>`)
        : ''}
    `,
  };
};

/**
 * La bitácora vista desde el ámbito de quien mira.
 *
 * Un evento pertenece a un ámbito por la entidad que toca. Los que no se
 * pueden situar —cambios de reglas, sesiones, acciones de alcance nacional—
 * solo los ve quien tiene alcance nacional.
 */
function filtrarAuditoriaPorAmbito(
  eventos: ReturnType<typeof consultar>,
  usuario: Parameters<typeof resolverAmbito>[0],
  estado: Parameters<typeof resolverAmbito>[1],
) {
  const a = resolverAmbito(usuario, estado);
  if (a.nacional) return eventos;

  const localDe = (negocioId: string) => estado.locales.filter((l) => l.negocioId === negocioId).map((l) => l.id);
  const alcanza = (entidad: string, id: string): boolean => {
    switch (entidad) {
      case 'negocio':
      case 'cuenta_bancaria':
        return a.negocioIds.includes(id) || localDe(id).some((l) => a.localIds.includes(l));
      case 'orden': {
        const o = estado.ordenes.find((x) => x.id === id);
        return Boolean(o && (a.localIds.includes(o.localId) || a.negocioIds.includes(o.negocioId) || a.parqueIds.includes(o.parqueId)));
      }
      case 'articulo': {
        const art = estado.articulos.find((x) => x.id === id);
        return Boolean(art && a.localIds.includes(art.localId));
      }
      case 'turno': {
        const t = estado.turnos.find((x) => x.id === id);
        return Boolean(t && a.localIds.includes(t.localId));
      }
      case 'liquidacion': {
        const l = estado.liquidaciones.find((x) => x.id === id);
        return Boolean(l && a.negocioIds.includes(l.negocioId));
      }
      case 'inspeccion': {
        const i = estado.inspecciones.find((x) => x.id === id);
        return Boolean(i && a.localIds.includes(i.localId));
      }
      default:
        // Sin forma de situarlo, solo lo ve el alcance nacional.
        return false;
    }
  };
  return eventos.filter((ev) => alcanza(ev.entidad, ev.entidadId));
}

export const usuarios: Render = () => {
  const e = store.leer();
  const f = filtro('usuarios', 'todos');
  let lista = e.usuarios;
  if (f === 'inparques') lista = lista.filter((u) => u.rol.startsWith('inparques.'));
  if (f === 'comercio') lista = lista.filter((u) => u.rol.startsWith('comercio.'));
  if (f === 'visitante') lista = lista.filter((u) => u.rol === 'visitante.cliente');

  return {
    titulo: 'Usuarios',
    contenido: html`
      ${crudo(chips(
        [{ valor: 'todos', texto: 'Todos' }, { valor: 'inparques', texto: 'INPARQUES' }, { valor: 'comercio', texto: 'Comercio' }, { valor: 'visitante', texto: 'Visitantes' }],
        f,
        'filtro-usuarios',
      ))}
      ${crudo(tabla(
        [
          { clave: 'n', titulo: 'Nombre', render: (u: typeof lista[0]) => esc(u.nombre) },
          { clave: 'r', titulo: 'Rol', render: (u) => esc(ROLES[u.rol].nombre) },
          { clave: 'a', titulo: 'Ámbito', render: (u) => esc(u.scope.level) },
          { clave: 'o', titulo: 'Origen', render: (u) => (u.origen === 'invitacion' ? 'Invitación' : 'Registro público') },
          { clave: 'm', titulo: 'MFA', render: (u) => insignia(u.mfaHabilitado ? 'Sí' : 'No', u.mfaHabilitado ? 'exito' : 'neutro') },
          { clave: 'e', titulo: 'Estado', render: (u) => insignia(u.estado, u.estado === 'activo' ? 'exito' : 'alerta') },
        ],
        lista,
      ))}
      ${crudo(aviso('info', 'Sin cuentas compartidas', 'Cada persona tiene su propio usuario. Las cuentas institucionales solo se crean por invitación.'))}
    `,
  };
};

export const roles: Render = () => ({
  titulo: 'Roles y permisos',
  contenido: html`
    <p class="bajada">Los once roles base con su ámbito y sus límites.</p>
    <div class="pila">
      ${ROLE_IDS.map((r) => {
        const d = ROLES[r];
        return crudo(tarjeta(html`
          <div class="fila fila--sep">
            <div class="crece">
              <div style="font-weight:650">${d.nombre}</div>
              <div class="tenue-2">${d.ambito} · ${d.nivelScope}</div>
            </div>
            ${crudo(insignia(`${PERMISOS_POR_ROL[r].length} permisos`, 'neutro'))}
          </div>
          <div class="mt-2">${crudo(listaDatos([
            ['Límite', esc(d.limite)],
            ['Segundo factor', d.requiereMfa ? 'Obligatorio' : 'No requerido'],
            ['Alta', d.soloPorInvitacion ? 'Solo por invitación' : 'Registro público'],
            ['Datos bancarios', d.puedeVerDatosBancarios ? 'Enmascarados' : 'Sin acceso'],
          ]))}</div>
        `));
      })}
    </div>
  `,
});

export const ambitos: Render = () => {
  const e = store.leer();
  return {
    titulo: 'Ámbitos',
    contenido: html`
      <p class="bajada">Qué alcanza cada usuario dentro de la jerarquía territorial.</p>
      ${crudo(tabla(
        [
          { clave: 'n', titulo: 'Usuario', render: (u: typeof e.usuarios[0]) => esc(u.nombre) },
          { clave: 'r', titulo: 'Rol', render: (u) => esc(ROLES[u.rol].nombre) },
          { clave: 'l', titulo: 'Nivel', render: (u) => esc(u.scope.level) },
          { clave: 'i', titulo: 'Alcance', render: (u) => (u.scope.ids.length === 0 ? 'Todo el sistema' : `<span class="mono tenue-2">${esc(u.scope.ids.join(', '))}</span>`) },
        ],
        e.usuarios.filter((u) => u.rol !== 'visitante.cliente'),
      ))}
    `,
  };
};


export const reglas: Render = () => {
  const e = store.leer();
  return {
    titulo: 'Reglas globales',
    contenido: html`
      <p class="bajada">Parámetros del sistema. Cambiarlos exige motivo, MFA y doble aprobación.</p>
      ${crudo(seccion('Monetario', html`${crudo(listaDatos([
        ['Tasa BCV vigente', `${e.tasaBcv.valor.toFixed(2)} Bs/USD`],
        ['Actualizada', fechaHora(e.tasaBcv.fecha)],
        ['Fuente', esc(e.tasaBcv.fuente)],
        ['IVA', '16 %'],
      ]))}`))}
      ${crudo(seccion('Reglas de la beta', html`${crudo(listaDatos([
        ['Carrito multicomercio', 'Deshabilitado'],
        ['Reparto a domicilio', 'No disponible'],
        ['Modelo de liquidación', 'A · pago directo al comercio'],
        ['Umbral de reembolso alto', formatearUsd(50)],
        ['Borrado de transacciones', 'Prohibido en todo el sistema'],
      ]))}`))}
      ${crudo(seccion('Control', html`${crudo(listaDatos([
        ['MFA institucional', 'Obligatorio'],
        ['Doble aprobación bancaria', 'Obligatoria'],
        ['Auditoría', 'Append-only'],
        ['Cuentas compartidas', 'Prohibidas'],
      ]))}`))}
      ${crudo(aviso('alerta', 'Cambio sensible', 'Modificar una regla global requiere motivo, verificación en dos pasos y aprobación de un segundo superadministrador.'))}
    `,
  };
};

export const integraciones: Render = () => ({
  titulo: 'Integraciones',
  contenido: html`
    <p class="bajada">Todas las integraciones son adaptadores simulados. Ninguna hace peticiones de red.</p>
    ${crudo(etiquetaDemo('Ningún proveedor real conectado'))}
    <div class="pila mt-2">
      ${inventarioAdaptadores().map((a) => crudo(tarjeta(html`
        <div class="fila fila--sep">
          <div class="crece">
            <div style="font-weight:650" class="mono">${a.id}</div>
            <div class="tenue mt-1">${a.descripcion}</div>
          </div>
          ${crudo(insignia('Simulado', 'alerta'))}
        </div>
      `)))}
    </div>
    ${crudo(aviso('info', 'Sustitución sin rehacer', 'Cada adaptador implementa una interfaz. Conectar un proveedor real es reemplazar la implementación, sin tocar el resto del sistema.'))}
    <div class="mt-2">${crudo(listaDatos([
      ['Conexión actual', conectividad.etiqueta()],
      ['Almacenamiento', store.backendNombre],
    ]))}</div>
  `,
});

export const reportes: Render = () => {
  const e = store.leer();
  const ordenes = ordenesVisibles().filter((o) => o.estado === 'entregada');
  const porParque = new Map<string, number>();
  for (const o of ordenes) porParque.set(o.parqueId, (porParque.get(o.parqueId) ?? 0) + o.totalUsd);
  const porCategoria = new Map<string, number>();
  for (const o of ordenes) {
    const n = e.negocios.find((x) => x.id === o.negocioId);
    if (n) porCategoria.set(n.categoria, (porCategoria.get(n.categoria) ?? 0) + o.totalUsd);
  }

  return {
    titulo: 'Reportes',
    contenido: html`
      ${crudo(seccion('Ventas por parque', html`
        ${porParque.size === 0
          ? crudo('<p class="tenue">Sin ventas registradas.</p>')
          : crudo(listaDatos([...porParque.entries()].map(([id, v]) => [
              e.parques.find((p) => p.id === id)?.nombre ?? id,
              formatearUsd(v),
            ] as [string, string])))}
      `))}
      ${crudo(seccion('Ventas por categoría', html`
        ${porCategoria.size === 0
          ? crudo('<p class="tenue">Sin ventas registradas.</p>')
          : crudo(listaDatos([...porCategoria.entries()].map(([c, v]) => [c, formatearUsd(v)] as [string, string])))}
      `))}
      ${crudo(seccion('Canal', html`${crudo(listaDatos([
        ['Aplicación', formatearUsd(ordenes.filter((o) => o.canal === 'app').reduce((s, o) => s + o.totalUsd, 0))],
        ['Mostrador', formatearUsd(ordenes.filter((o) => o.canal === 'mostrador').reduce((s, o) => s + o.totalUsd, 0))],
      ]))}`))}
      ${crudo(seccion('Exportar', html`<div class="pila">
        ${crudo(boton('Ventas en CSV', { bloque: true, accion: 'exportar-csv', valor: 'ventas' }))}
        ${crudo(boton('Negocios en CSV', { bloque: true, accion: 'exportar-csv', valor: 'negocios' }))}
        ${crudo(boton('Auditoría en CSV', { bloque: true, accion: 'exportar-csv', valor: 'auditoria' }))}
        ${crudo(boton('Vista imprimible', { bloque: true, accion: 'imprimir' }))}
      </div>`))}
    `,
  };
};
