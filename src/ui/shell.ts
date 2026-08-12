/**
 * Armazón de cada superficie.
 *
 * Visitante: PWA con barra inferior, pensada para el pulgar.
 * Comercio: barra inferior en teléfono y tablet, lateral en escritorio.
 * INPARQUES: lateral en escritorio, barra inferior en pantallas pequeñas.
 */

import { html, crudo, esc } from './componentes';
import type { RoleId } from '../domain/types';
import { ROLES } from '../domain/roles';
import { sesion } from '../app/session';
import { store } from '../data/store';
import { conectividad } from '../net/connectivity';
import { estadoUi } from './estado-ui';
import { unidadesEnCarrito } from '../domain/cart';

export interface ItemNav {
  ruta: string;
  icono: string;
  texto: string;
  globo?: number;
}

export interface OpcionesShell {
  titulo: string;
  subtitulo?: string;
  atras?: string;
  acciones?: string;
  /** Oculta la barra inferior en pantallas de flujo (checkout, formularios). */
  sinNav?: boolean;
  cabeceraClara?: boolean;
}

/** Campana en SVG: se ve igual en Android, iPhone y escritorio. */
const ICONO_CAMPANA = `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
</svg>`;

function navVisitante(): ItemNav[] {
  const u = unidadesEnCarrito(estadoUi.carrito);
  return [
    { ruta: '/v', icono: '⌂', texto: 'Inicio' },
    { ruta: '/v/buscar', icono: '⌕', texto: 'Buscar' },
    { ruta: '/v/carrito', icono: '▤', texto: 'Carrito', globo: u || undefined },
    { ruta: '/v/historial', icono: '≡', texto: 'Pedidos' },
    { ruta: '/v/perfil', icono: '☺', texto: 'Perfil' },
  ];
}

function navComercio(rol: RoleId): ItemNav[] {
  const base: ItemNav[] = [{ ruta: '/c', icono: '⌂', texto: 'Inicio' }];
  if (rol !== 'comercio.contador') {
    base.push({ ruta: '/c/pedidos', icono: '▤', texto: 'Pedidos', globo: pedidosPendientes() || undefined });
    base.push({ ruta: '/c/catalogo', icono: '☰', texto: 'Catálogo' });
    base.push({ ruta: '/c/caja', icono: '▦', texto: 'Caja' });
  } else {
    base.push({ ruta: '/c/facturas', icono: '▤', texto: 'Facturas' });
    base.push({ ruta: '/c/conciliacion', icono: '⇄', texto: 'Conciliar' });
    base.push({ ruta: '/c/reportes', icono: '▦', texto: 'Reportes' });
  }
  base.push({ ruta: '/c/mas', icono: '⋯', texto: 'Más' });
  return base;
}

function navInparques(rol: RoleId): ItemNav[] {
  const base: ItemNav[] = [{ ruta: '/i', icono: '▦', texto: 'Tablero' }];
  if (rol === 'inparques.inspector') {
    base.push({ ruta: '/i/inspecciones', icono: '✓', texto: 'Inspección' });
    base.push({ ruta: '/i/incidencias', icono: '⚠', texto: 'Incidencias' });
  } else if (rol === 'inparques.soporte') {
    base.push({ ruta: '/i/disputas', icono: '⚑', texto: 'Disputas' });
    base.push({ ruta: '/i/sla', icono: '◷', texto: 'SLA' });
  } else if (rol === 'inparques.finanzas') {
    base.push({ ruta: '/i/conciliacion', icono: '⇄', texto: 'Conciliar' });
    base.push({ ruta: '/i/cierres', icono: '▤', texto: 'Cierres' });
  } else {
    base.push({ ruta: '/i/negocios', icono: '☰', texto: 'Negocios' });
    base.push({ ruta: '/i/solicitudes', icono: '⚑', texto: 'Trámites' });
  }
  base.push({ ruta: '/i/mas', icono: '⋯', texto: 'Más' });
  return base;
}

function pedidosPendientes(): number {
  const s = sesion.activa();
  if (!s) return 0;
  const u = sesion.usuario();
  const locales = u?.scope.level === 'local' ? u.scope.ids : null;
  return store
    .leer()
    .ordenes.filter(
      (o) =>
        (o.estado === 'pendiente_aceptacion' || o.estado === 'creada') &&
        (!locales || locales.includes(o.localId)),
    ).length;
}

function noLeidas(): number {
  const rol = sesion.rol();
  if (!rol) return 0;
  const s = sesion.activa();
  return store
    .leer()
    .notificaciones.filter(
      (n) => n.destinatarioRol === rol && !n.leida && (!n.destinatarioId || n.destinatarioId === s?.usuarioId),
    ).length;
}

export function navDe(rol: RoleId | null): ItemNav[] {
  if (!rol || rol === 'visitante.cliente') return navVisitante();
  if (rol.startsWith('comercio.')) return navComercio(rol);
  return navInparques(rol);
}

/** Envuelve el contenido con cabecera, navegación y avisos globales. */
export function marco(contenido: string, opciones: OpcionesShell, rutaActual: string): string {
  const rol = sesion.rol();
  const superficie = !rol || rol === 'visitante.cliente' ? 'visitante' : rol.startsWith('comercio.') ? 'comercio' : 'inparques';
  const items = navDe(rol);
  const conNav = !opciones.sinNav;
  const escritorio = superficie !== 'visitante';
  const pend = noLeidas();

  const clases = [
    'app',
    conNav ? 'app--con-nav' : '',
    escritorio ? 'app--escritorio' : '',
  ].filter(Boolean).join(' ');

  return html`<div class="${clases}">
    ${escritorio && conNav ? crudo(lateral(items, rutaActual, rol)) : ''}
    <div class="columna">
      <header class="cabecera ${opciones.cabeceraClara ? 'cabecera--claro' : ''}">
        <div class="cabecera__fila">
          ${opciones.atras
            ? crudo(`<button class="icono-bt" data-accion="ir" data-valor="${esc(opciones.atras)}" aria-label="Volver"><span aria-hidden="true">‹</span></button>`)
            : ''}
          <div class="cabecera__titulo">
            ${opciones.titulo}
            ${opciones.subtitulo ? crudo(`<span class="cabecera__sub">${esc(opciones.subtitulo)}</span>`) : ''}
          </div>
          ${opciones.acciones ? crudo(opciones.acciones) : ''}
          <button class="icono-bt" data-accion="ir" data-valor="/notificaciones" aria-label="Notificaciones${pend ? `, ${pend} sin leer` : ''}">
            ${crudo(ICONO_CAMPANA)}
            ${pend ? crudo(`<span class="icono-bt__punto">${pend}</span>`) : ''}
          </button>
        </div>
      </header>

      ${crudo(bandaConexion())}

      <main class="contenido" id="contenido">${crudo(contenido)}</main>
    </div>

    ${conNav ? crudo(navInferior(items, rutaActual)) : ''}
  </div>`;
}

function lateral(items: ItemNav[], rutaActual: string, rol: RoleId | null): string {
  const u = sesion.usuario();
  const extra = rol && rol.startsWith('comercio.') ? enlacesComercio(rol) : enlacesInparques(rol);
  return html`<nav class="lateral" aria-label="Navegación principal">
    <div style="padding:8px 12px 4px">
      <div style="font-weight:700;font-size:15px">INPARQUES Comercial</div>
      <div class="tenue-2">${u ? ROLES[u.rol].nombre : 'Visitante'}</div>
    </div>
    ${items
      .filter((i) => !i.ruta.endsWith('/mas'))
      .map((i) => crudo(itemLateral(i.ruta, i.icono, i.texto, rutaActual)))}
    ${extra.map(
      (g) => crudo(`<div class="lateral__gr">${esc(g.grupo)}</div>${g.items.map((i) => itemLateral(i.ruta, i.icono, i.texto, rutaActual)).join('')}`),
    )}
    <div class="lateral__gr">Cuenta</div>
    ${crudo(itemLateral('/perfil', '☺', 'Perfil', rutaActual))}
    ${crudo(itemLateral('/sesiones', '⧉', 'Sesiones', rutaActual))}
    ${crudo(itemLateral('/ayuda', '?', 'Ayuda', rutaActual))}
  </nav>`;
}

function itemLateral(ruta: string, icono: string, texto: string, actual: string): string {
  const activo = actual === ruta || (ruta !== '/c' && ruta !== '/i' && actual.startsWith(ruta));
  return `<button class="lateral__it" data-accion="ir" data-valor="${esc(ruta)}"${activo ? ' aria-current="page"' : ''}>
    <span aria-hidden="true" style="width:20px;text-align:center">${esc(icono)}</span>${esc(texto)}
  </button>`;
}

interface GrupoEnlaces { grupo: string; items: ItemNav[] }

export function enlacesComercio(rol: RoleId): GrupoEnlaces[] {
  const gestion = rol === 'comercio.propietario' || rol === 'comercio.admin_local';
  const finanzas = rol === 'comercio.propietario' || rol === 'comercio.contador';
  const g: GrupoEnlaces[] = [];

  if (gestion) {
    g.push({
      grupo: 'Oferta',
      items: [
        { ruta: '/c/catalogo', icono: '☰', texto: 'Catálogo' },
        { ruta: '/c/inventario', icono: '▣', texto: 'Inventario' },
        { ruta: '/c/horarios', icono: '◷', texto: 'Horarios' },
        { ruta: '/c/cupos', icono: '▤', texto: 'Cupos' },
        { ruta: '/c/catalogo/alergenos', icono: '⚕', texto: 'Alérgenos' },
      ],
    });
  }
  g.push({
    grupo: 'Operación',
    items: [
      { ruta: '/c/pedidos', icono: '▤', texto: 'Pedidos' },
      { ruta: '/c/reservas', icono: '◷', texto: 'Reservas' },
      { ruta: '/c/caja', icono: '▦', texto: 'Caja' },
      { ruta: '/c/caja/venta-mostrador', icono: '＋', texto: 'Venta de mostrador' },
    ],
  });
  if (finanzas) {
    g.push({
      grupo: 'Finanzas',
      items: [
        { ruta: '/c/reportes', icono: '▦', texto: 'Reportes' },
        { ruta: '/c/conciliacion', icono: '⇄', texto: 'Conciliación' },
        { ruta: '/c/facturas', icono: '▤', texto: 'Facturas' },
        { ruta: '/c/comprobantes', icono: '▤', texto: 'Comprobantes' },
        { ruta: '/c/estado-cuenta', icono: '≡', texto: 'Estado de cuenta' },
        { ruta: '/c/ajustes', icono: '⚙', texto: 'Ajustes' },
        { ruta: '/c/exportaciones', icono: '↓', texto: 'Exportaciones' },
      ],
    });
  }
  const registro: ItemNav[] = [
    { ruta: '/c/expediente', icono: '▤', texto: 'Expediente' },
    { ruta: '/c/permisos', icono: '✓', texto: 'Permisos' },
  ];
  if (finanzas) registro.push({ ruta: '/c/contratos', icono: '≡', texto: 'Contratos' }, { ruta: '/c/cobro', icono: '▣', texto: 'Cobro' });
  if (gestion) registro.push({ ruta: '/c/equipo', icono: '☺', texto: 'Equipo' });
  g.push({ grupo: 'Registro', items: registro });
  return g;
}

export function enlacesInparques(rol: RoleId | null): GrupoEnlaces[] {
  if (!rol) return [];
  const g: GrupoEnlaces[] = [];
  const es = (...r: RoleId[]) => r.includes(rol);

  g.push({
    grupo: 'Territorio',
    items: [
      { ruta: '/i/territorio', icono: '▦', texto: 'Estructura' },
      { ruta: '/i/parques', icono: '▣', texto: 'Parques' },
      { ruta: '/i/zonas', icono: '◈', texto: 'Zonas' },
      { ruta: '/i/puntos', icono: '◉', texto: 'Puntos comerciales' },
    ],
  });
  if (es('inparques.superadmin', 'inparques.direccion_comercial', 'inparques.admin_parque', 'inparques.finanzas')) {
    g.push({
      grupo: 'Concesiones',
      items: [
        { ruta: '/i/negocios', icono: '☰', texto: 'Directorio' },
        { ruta: '/i/solicitudes', icono: '⚑', texto: 'Solicitudes' },
        { ruta: '/i/aprobaciones', icono: '✓', texto: 'Aprobaciones' },
        { ruta: '/i/permisos', icono: '▤', texto: 'Permisos' },
        { ruta: '/i/contratos', icono: '≡', texto: 'Contratos' },
        { ruta: '/i/canones', icono: '％', texto: 'Cánones' },
        { ruta: '/i/vencimientos', icono: '◷', texto: 'Vencimientos' },
      ].filter((i) => rol !== 'inparques.finanzas' || ['/i/negocios', '/i/contratos', '/i/canones'].includes(i.ruta)),
    });
  }
  if (es('inparques.superadmin', 'inparques.inspector', 'inparques.admin_parque')) {
    g.push({
      grupo: 'Control',
      items: [
        { ruta: '/i/inspecciones', icono: '✓', texto: 'Inspecciones' },
        { ruta: '/i/incidencias', icono: '⚠', texto: 'Incidencias' },
        ...(es('inparques.superadmin', 'inparques.admin_parque') ? [{ ruta: '/i/operacion', icono: '▦', texto: 'Operación' }] : []),
      ],
    });
  }
  if (es('inparques.superadmin', 'inparques.finanzas')) {
    g.push({
      grupo: 'Finanzas',
      items: [
        { ruta: '/i/contabilidad', icono: '▦', texto: 'Contabilidad' },
        { ruta: '/i/conciliacion', icono: '⇄', texto: 'Conciliación' },
        { ruta: '/i/cuentas-por-cobrar', icono: '≡', texto: 'Por cobrar' },
        { ruta: '/i/cierres', icono: '▤', texto: 'Cierres' },
        { ruta: '/i/reembolsos', icono: '↩', texto: 'Reembolsos' },
        { ruta: '/i/ajustes', icono: '⚙', texto: 'Ajustes' },
      ],
    });
  }
  if (es('inparques.superadmin', 'inparques.soporte')) {
    g.push({
      grupo: 'Soporte',
      items: [
        { ruta: '/i/disputas', icono: '⚑', texto: 'Disputas' },
        { ruta: '/i/sla', icono: '◷', texto: 'SLA' },
      ],
    });
  }
  const admin: ItemNav[] = [{ ruta: '/i/reportes', icono: '▦', texto: 'Reportes' }];
  if (es('inparques.superadmin', 'inparques.finanzas', 'inparques.direccion_comercial')) admin.push({ ruta: '/i/auditoria', icono: '▤', texto: 'Auditoría' });
  if (es('inparques.superadmin', 'inparques.direccion_comercial')) admin.push({ ruta: '/i/usuarios', icono: '☺', texto: 'Usuarios' });
  if (es('inparques.superadmin')) {
    admin.push(
      { ruta: '/i/roles', icono: '⚿', texto: 'Roles' },
      { ruta: '/i/ambitos', icono: '◈', texto: 'Ámbitos' },
      { ruta: '/i/sesiones', icono: '⧉', texto: 'Sesiones' },
      { ruta: '/i/reglas', icono: '⚙', texto: 'Reglas globales' },
      { ruta: '/i/integraciones', icono: '⇄', texto: 'Integraciones' },
    );
  }
  g.push({ grupo: 'Administración', items: admin });
  return g;
}

function navInferior(items: ItemNav[], rutaActual: string): string {
  return html`<nav class="nav-inf" aria-label="Navegación principal">
    ${items.map((i) => {
      const activo = i.ruta === rutaActual || (i.ruta !== '/v' && i.ruta !== '/c' && i.ruta !== '/i' && rutaActual.startsWith(i.ruta));
      return crudo(`<button class="nav-inf__it" data-accion="ir" data-valor="${esc(i.ruta)}"${activo ? ' aria-current="page"' : ''}>
        <span class="nav-inf__ic" aria-hidden="true">${esc(i.icono)}</span>
        <span>${esc(i.texto)}</span>
        ${i.globo ? `<span class="nav-inf__globo" aria-label="${i.globo} pendientes">${i.globo}</span>` : ''}
      </button>`);
    })}
  </nav>`;
}

/** Banda visible cuando la conexión no es plena. */
function bandaConexion(): string {
  const modo = conectividad.actual();
  if (modo === 'conectado') return '';
  const pendientes = estadoUi.colaPendientes;
  const texto =
    modo === 'sin_conexion'
      ? 'Sin conexión. Puede consultar lo ya cargado; los cambios quedan en cola.'
      : 'Conexión degradada. Pagos y facturas no se confirman hasta recuperar la red.';
  return html`<div style="background:var(--alerta-fondo);color:var(--alerta);padding:9px 14px;font-size:13px;display:flex;gap:8px;align-items:center;border-bottom:1px solid currentColor" role="status">
    <span aria-hidden="true">⚠</span>
    <span class="crece">${texto}</span>
    ${pendientes ? crudo(`<button class="bt bt--pequeno bt--tenue" data-accion="ir" data-valor="/conexion/cola">${pendientes} en cola</button>`) : ''}
  </div>`;
}
