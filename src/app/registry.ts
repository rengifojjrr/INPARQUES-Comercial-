/**
 * Registro de vistas: la fuente unica de rutas, roles y estado de cada
 * pantalla. El router, los menus y el indice tecnico interno leen de aqui.
 *
 * Dos cosas distintas, que conviene no confundir:
 *
 *  - `estado` describe si la vista existe y funciona en la demo. Todas estan
 *    en 'implementada': se dibujan con datos reales y sus controles operan.
 *  - `htmlRef` apunta al HTML original de referencia. Esta vacio porque las
 *    plantillas del cliente todavia no se han recibido; el aspecto actual es
 *    provisional y se sustituira sin tocar la logica.
 *
 * Las rutas se derivaron del documento de investigacion y de los recorridos
 * descritos en el encargo. La cifra de 119 vistas proviene del enunciado;
 * este inventario propone 137 rutas y la diferencia solo puede reconciliarse
 * comparando con los archivos entregados.
 */

import type { RoleId, Surface } from '../domain/types';
import { ROLE_IDS, ROLES } from '../domain/roles';
import { ROLES_APROBADORES } from '../domain/approvals';

/**
 * pendiente_html : registrada, sin vista que la dibuje.
 * implementada   : funciona con aspecto provisional.
 * conectada      : montada sobre el HTML original del cliente.
 * revisada       : comparada contra el original en movil, tablet y escritorio.
 * bloqueada      : no puede completarse; el motivo va en `notas`.
 */
export type EstadoVista = 'pendiente_html' | 'implementada' | 'conectada' | 'revisada' | 'bloqueada';

export interface Vista {
  id: string;
  ruta: string;
  titulo: string;
  superficie: Surface | 'compartida';
  grupo: string;
  /** Roles autorizados. Vacio = ruta publica sin sesion. */
  roles: RoleId[];
  /** Nombre del HTML original. Se completa al recibir las plantillas. */
  htmlRef: string;
  estado: EstadoVista;
  /** Rutas a las que esta vista puede llevar. Sirve para detectar huerfanas. */
  salidas?: string[];
  notas?: string;
}

const INPARQUES_TODOS: RoleId[] = ROLE_IDS.filter((r) => ROLES[r].superficie === 'inparques');
const COMERCIO_TODOS: RoleId[] = ROLE_IDS.filter((r) => ROLES[r].superficie === 'comercio');
const VISITANTE: RoleId[] = ['visitante.cliente'];
const PUBLICO: RoleId[] = [];
const TODOS: RoleId[] = [...ROLE_IDS];

const COMERCIO_GESTION: RoleId[] = ['comercio.propietario', 'comercio.admin_local'];
const COMERCIO_FINANZAS: RoleId[] = ['comercio.propietario', 'comercio.contador'];
const INP_CONCESIONES: RoleId[] = ['inparques.superadmin', 'inparques.direccion_comercial'];
const INP_FINANZAS: RoleId[] = ['inparques.superadmin', 'inparques.finanzas'];
const INP_CONTROL: RoleId[] = ['inparques.superadmin', 'inparques.inspector', 'inparques.admin_parque'];
const INP_SOPORTE: RoleId[] = ['inparques.superadmin', 'inparques.soporte'];

function v(
  id: string,
  ruta: string,
  titulo: string,
  superficie: Vista['superficie'],
  grupo: string,
  roles: RoleId[],
  extra: Partial<Vista> = {},
): Vista {
  return { id, ruta, titulo, superficie, grupo, roles, htmlRef: '', estado: 'implementada', ...extra };
}

// ---------------------------------------------------------------------------
// Superficie compartida: acceso, identidad, estados y conectividad
// ---------------------------------------------------------------------------

const COMPARTIDAS: Vista[] = [
  v('demo.perfiles', '/acceso', 'Selector de perfiles de demostracion', 'compartida', 'Acceso', PUBLICO),
  v('acceso.visitante', '/acceso/visitante', 'Ingreso de visitante', 'compartida', 'Acceso', PUBLICO),
  v('acceso.comercio', '/acceso/comercio', 'Ingreso de comercio', 'compartida', 'Acceso', PUBLICO),
  v('acceso.inparques', '/acceso/inparques', 'Ingreso institucional', 'compartida', 'Acceso', PUBLICO),
  v('registro.visitante', '/registro/visitante', 'Registro de visitante', 'compartida', 'Acceso', PUBLICO),
  v('registro.invitado', '/registro/invitado', 'Continuar como invitado', 'compartida', 'Acceso', PUBLICO),
  v('invitacion.comercio', '/invitacion/comercio', 'Invitacion de usuario de comercio', 'compartida', 'Acceso', PUBLICO),
  v('invitacion.comercio.activar', '/invitacion/comercio/activar', 'Activacion de usuario de comercio', 'compartida', 'Acceso', PUBLICO),
  v('invitacion.institucional', '/invitacion/institucional', 'Activacion institucional por invitacion', 'compartida', 'Acceso', PUBLICO, {
    notas: 'Las cuentas institucionales nunca se crean por registro publico.',
  }),
  v('mfa.verificar', '/mfa', 'Verificacion de segundo factor', 'compartida', 'Acceso', TODOS),
  v('mfa.configurar', '/mfa/configurar', 'Configuracion de segundo factor', 'compartida', 'Acceso', TODOS),
  v('recuperar.solicitud', '/acceso/recuperar', 'Recuperacion de acceso', 'compartida', 'Acceso', PUBLICO),
  v('recuperar.codigo', '/acceso/recuperar/codigo', 'Codigo de recuperacion', 'compartida', 'Acceso', PUBLICO),
  v('recuperar.clave', '/acceso/recuperar/nueva-clave', 'Nueva contrasena', 'compartida', 'Acceso', PUBLICO),
  v('sesiones.propias', '/sesiones', 'Mis sesiones activas', 'compartida', 'Cuenta', TODOS),
  v('aprobaciones', '/aprobaciones', 'Aprobaciones pendientes', 'compartida', 'Cuenta', ROLES_APROBADORES, {
    notas: 'Segunda firma real: la accion espera aqui hasta que la firme otra persona.',
  }),
  v('notificaciones', '/notificaciones', 'Centro de notificaciones', 'compartida', 'Cuenta', TODOS),
  v('perfil', '/perfil', 'Perfil', 'compartida', 'Cuenta', TODOS),
  v('perfil.accesibilidad', '/perfil/accesibilidad', 'Accesibilidad', 'compartida', 'Cuenta', TODOS),
  v('perfil.privacidad', '/perfil/privacidad', 'Privacidad y datos', 'compartida', 'Cuenta', TODOS),
  v('ayuda', '/ayuda', 'Ayuda', 'compartida', 'Cuenta', TODOS),
  v('error.403', '/error/403', 'Acceso no autorizado', 'compartida', 'Estados', TODOS),
  v('error.404', '/error/404', 'Pagina no encontrada', 'compartida', 'Estados', TODOS),
  v('error.sesion', '/error/sesion-vencida', 'Sesion vencida', 'compartida', 'Estados', PUBLICO),
  v('error.mantenimiento', '/error/mantenimiento', 'Mantenimiento', 'compartida', 'Estados', PUBLICO),
  v('conexion.degradada', '/conexion/degradada', 'Conexion degradada', 'compartida', 'Conectividad', TODOS),
  v('conexion.cola', '/conexion/cola', 'Cola de sincronizacion', 'compartida', 'Conectividad', [...COMERCIO_TODOS, ...INPARQUES_TODOS]),
  v('conexion.conflicto', '/conexion/conflicto', 'Conflicto de sincronizacion', 'compartida', 'Conectividad', [...COMERCIO_TODOS, ...INPARQUES_TODOS]),
];

// ---------------------------------------------------------------------------
// Superficie visitante (PWA)
// ---------------------------------------------------------------------------

const VISITANTE_VISTAS: Vista[] = [
  v('v.inicio', '/v', 'Inicio', 'visitante', 'Descubrimiento', PUBLICO),
  v('v.qr', '/v/qr', 'Escanear QR del parque', 'visitante', 'Descubrimiento', PUBLICO, {
    notas: 'Debe permitir ingreso manual del codigo cuando no hay camara.',
  }),
  v('v.parques', '/v/parques', 'Elegir parque', 'visitante', 'Descubrimiento', PUBLICO),
  v('v.parque', '/v/parque/:parqueId', 'Inicio del parque', 'visitante', 'Descubrimiento', PUBLICO),
  v('v.buscar', '/v/buscar', 'Buscar', 'visitante', 'Descubrimiento', PUBLICO),
  v('v.categorias', '/v/categorias', 'Categorias', 'visitante', 'Descubrimiento', PUBLICO),
  v('v.filtros', '/v/filtros', 'Filtros', 'visitante', 'Descubrimiento', PUBLICO),
  v('v.mapa', '/v/mapa/:parqueId', 'Mapa esquematico de zonas', 'visitante', 'Descubrimiento', PUBLICO, {
    notas: 'Esquema local del parque. Sin proveedor de navegacion pagado.',
  }),
  v('v.zona', '/v/zona/:zonaId', 'Zona', 'visitante', 'Descubrimiento', PUBLICO),
  v('v.comercio', '/v/comercio/:negocioId', 'Ficha del comercio', 'visitante', 'Oferta', PUBLICO),
  v('v.catalogo', '/v/comercio/:negocioId/catalogo', 'Menu o catalogo', 'visitante', 'Oferta', PUBLICO),
  v('v.articulo', '/v/articulo/:articuloId', 'Detalle y personalizacion', 'visitante', 'Oferta', PUBLICO),
  v('v.servicio', '/v/servicio/:articuloId', 'Reserva de servicio', 'visitante', 'Oferta', PUBLICO),
  v('v.como_llegar', '/v/como-llegar/:localId', 'Como llegar', 'visitante', 'Oferta', PUBLICO),
  v('v.carrito', '/v/carrito', 'Carrito', 'visitante', 'Compra', PUBLICO, {
    notas: 'Un solo comercio por carrito. Modal de conflicto al mezclar.',
  }),
  v('v.checkout', '/v/checkout', 'Checkout', 'visitante', 'Compra', PUBLICO),
  v('v.checkout.cumplimiento', '/v/checkout/cumplimiento', 'Metodo de cumplimiento', 'visitante', 'Compra', PUBLICO, {
    notas: 'Retiro inmediato, retiro programado o mesa. Sin delivery.',
  }),
  v('v.checkout.pago', '/v/checkout/pago', 'Seleccion de pago', 'visitante', 'Compra', PUBLICO),
  v('v.pago.movil', '/v/checkout/pago/pago-movil', 'Pago Movil', 'visitante', 'Compra', PUBLICO),
  v('v.pago.transferencia', '/v/checkout/pago/transferencia', 'Transferencia', 'visitante', 'Compra', PUBLICO),
  v('v.pago.tarjeta', '/v/checkout/pago/tarjeta', 'Tarjeta', 'visitante', 'Compra', PUBLICO),
  v('v.pago.efectivo', '/v/checkout/pago/efectivo', 'Efectivo en el punto', 'visitante', 'Compra', PUBLICO),
  v('v.confirmacion', '/v/checkout/confirmacion', 'Confirmacion', 'visitante', 'Compra', PUBLICO),
  v('v.pedido', '/v/pedido/:ordenId', 'Seguimiento del pedido', 'visitante', 'Seguimiento', PUBLICO),
  v('v.reserva', '/v/reserva/:ordenId', 'Seguimiento de la reserva', 'visitante', 'Seguimiento', PUBLICO),
  v('v.retiro', '/v/pedido/:ordenId/qr', 'Codigo de retiro', 'visitante', 'Seguimiento', PUBLICO),
  v('v.historial', '/v/historial', 'Historial', 'visitante', 'Cuenta', VISITANTE),
  v('v.comprobante', '/v/comprobante/:ordenId', 'Comprobante de pedido', 'visitante', 'Cuenta', PUBLICO, {
    notas: 'El comprobante no es la factura fiscal.',
  }),
  v('v.factura', '/v/factura/:ordenId', 'Factura del comercio', 'visitante', 'Cuenta', PUBLICO),
  v('v.valorar', '/v/valorar/:ordenId', 'Valorar', 'visitante', 'Cuenta', VISITANTE),
  v('v.reclamo', '/v/reclamo/:ordenId', 'Abrir reclamo', 'visitante', 'Cuenta', PUBLICO),
  v('v.reclamos', '/v/reclamos', 'Mis reclamos', 'visitante', 'Cuenta', VISITANTE),
  v('v.perfil', '/v/perfil', 'Mi perfil', 'visitante', 'Cuenta', VISITANTE),
];

// ---------------------------------------------------------------------------
// Superficie comercio (portal)
// ---------------------------------------------------------------------------

const COMERCIO_VISTAS: Vista[] = [
  v('c.inicio', '/c', 'Inicio del comercio', 'comercio', 'Panel', COMERCIO_TODOS),
  v('c.mas', '/c/mas', 'Todos los módulos', 'comercio', 'Panel', COMERCIO_TODOS, {
    notas: 'Acceso a los módulos del rol en teléfono; en escritorio equivale al lateral.',
  }),
  v('c.valoraciones', '/c/valoraciones', 'Valoraciones de clientes', 'comercio', 'Panel', COMERCIO_TODOS, {
    notas: 'El comercio responde en publico a quien le valoro.',
  }),
  v('c.expediente', '/c/expediente', 'Expediente del negocio', 'comercio', 'Registro', [...COMERCIO_GESTION, 'comercio.contador']),
  v('c.documentos', '/c/expediente/documentos', 'Documentos y vigencias', 'comercio', 'Registro', COMERCIO_GESTION),
  v('c.documento', '/c/expediente/documento/:documentoId', 'Detalle de documento', 'comercio', 'Registro', COMERCIO_GESTION),
  v('c.permisos', '/c/permisos', 'Permisos y concesiones', 'comercio', 'Registro', COMERCIO_GESTION),
  v('c.contratos', '/c/contratos', 'Contratos', 'comercio', 'Registro', COMERCIO_FINANZAS),
  v('c.contrato', '/c/contrato/:contratoId', 'Condiciones economicas', 'comercio', 'Registro', COMERCIO_FINANZAS),
  v('c.cobro', '/c/cobro', 'Configuracion de cobro', 'comercio', 'Registro', COMERCIO_FINANZAS),
  v('c.cuenta_bancaria', '/c/cobro/cuenta-bancaria', 'Cuenta bancaria', 'comercio', 'Registro', ['comercio.propietario'], {
    notas: 'Cambio sensible: motivo, evidencia, MFA y doble aprobacion.',
  }),
  v('c.equipo', '/c/equipo', 'Equipo y accesos', 'comercio', 'Registro', COMERCIO_GESTION),
  v('c.equipo.invitar', '/c/equipo/invitar', 'Invitar integrante', 'comercio', 'Registro', ['comercio.propietario']),
  v('c.equipo.detalle', '/c/equipo/:usuarioId', 'Detalle de integrante', 'comercio', 'Registro', COMERCIO_GESTION),
  v('c.catalogo', '/c/catalogo', 'Catalogo', 'comercio', 'Oferta', [...COMERCIO_GESTION, 'comercio.operador']),
  v('c.articulo', '/c/catalogo/articulo/:articuloId', 'Articulo o servicio', 'comercio', 'Oferta', COMERCIO_GESTION),
  v('c.variantes', '/c/catalogo/articulo/:articuloId/variantes', 'Variantes', 'comercio', 'Oferta', COMERCIO_GESTION),
  v('c.modificadores', '/c/catalogo/articulo/:articuloId/modificadores', 'Modificadores', 'comercio', 'Oferta', COMERCIO_GESTION),
  v('c.alergenos', '/c/catalogo/alergenos', 'Alergenos', 'comercio', 'Oferta', COMERCIO_GESTION),
  v('c.horarios', '/c/horarios', 'Horarios', 'comercio', 'Oferta', COMERCIO_GESTION),
  v('c.cupos', '/c/cupos', 'Cupos de servicios', 'comercio', 'Oferta', COMERCIO_GESTION),
  v('c.inventario', '/c/inventario', 'Inventario basico', 'comercio', 'Oferta', COMERCIO_GESTION),
  v('c.pedidos', '/c/pedidos', 'Pedidos', 'comercio', 'Operacion', COMERCIO_TODOS),
  v('c.pedido', '/c/pedido/:ordenId', 'Detalle del pedido', 'comercio', 'Operacion', COMERCIO_TODOS),
  v('c.reservas', '/c/reservas', 'Reservas', 'comercio', 'Operacion', COMERCIO_TODOS),
  v('c.reserva', '/c/reserva/:ordenId', 'Detalle de la reserva', 'comercio', 'Operacion', COMERCIO_TODOS),
  v('c.caja', '/c/caja', 'Caja', 'comercio', 'Caja', [...COMERCIO_GESTION, 'comercio.operador', 'comercio.contador']),
  v('c.mostrador', '/c/caja/venta-mostrador', 'Venta de mostrador', 'comercio', 'Caja', [...COMERCIO_GESTION, 'comercio.operador'], {
    notas: 'Toda venta de mostrador debe aparecer en caja, cierre y reportes.',
  }),
  v('c.turno.abrir', '/c/caja/turno/abrir', 'Apertura de turno', 'comercio', 'Caja', [...COMERCIO_GESTION, 'comercio.operador']),
  v('c.turno.cerrar', '/c/caja/turno/cerrar', 'Cierre de turno', 'comercio', 'Caja', COMERCIO_GESTION),
  v('c.turno', '/c/caja/turno/:turnoId', 'Detalle del turno', 'comercio', 'Caja', [...COMERCIO_GESTION, 'comercio.contador'], {
    notas: 'Un turno cerrado no se edita ni se borra.',
  }),
  v('c.reportes', '/c/reportes', 'Reportes', 'comercio', 'Finanzas', [...COMERCIO_GESTION, 'comercio.contador']),
  v('c.conciliacion', '/c/conciliacion', 'Conciliacion', 'comercio', 'Finanzas', COMERCIO_FINANZAS),
  v('c.comprobantes', '/c/comprobantes', 'Comprobantes', 'comercio', 'Finanzas', COMERCIO_FINANZAS),
  v('c.facturas', '/c/facturas', 'Facturas', 'comercio', 'Finanzas', COMERCIO_FINANZAS),
  v('c.factura', '/c/factura/:facturaId', 'Detalle de factura', 'comercio', 'Finanzas', COMERCIO_FINANZAS),
  v('c.estado_cuenta', '/c/estado-cuenta', 'Estado de cuenta', 'comercio', 'Finanzas', COMERCIO_FINANZAS),
  v('c.ajustes', '/c/ajustes', 'Solicitudes de ajuste', 'comercio', 'Finanzas', COMERCIO_FINANZAS),
  v('c.exportaciones', '/c/exportaciones', 'Exportaciones', 'comercio', 'Finanzas', COMERCIO_FINANZAS),
];

// ---------------------------------------------------------------------------
// Superficie INPARQUES (panel institucional)
// ---------------------------------------------------------------------------

const INPARQUES_VISTAS: Vista[] = [
  v('i.inicio', '/i', 'Dashboard nacional', 'inparques', 'Tableros', INPARQUES_TODOS),
  v('i.mas', '/i/mas', 'Todos los módulos', 'inparques', 'Tableros', INPARQUES_TODOS, {
    notas: 'Acceso a los módulos del rol en teléfono; en escritorio equivale al lateral.',
  }),
  v('i.dashboard.parque', '/i/dashboard/parque/:parqueId', 'Dashboard por parque', 'inparques', 'Tableros', INPARQUES_TODOS),
  v('i.territorio', '/i/territorio', 'Estructura territorial', 'inparques', 'Territorio', INPARQUES_TODOS),
  v('i.parques', '/i/parques', 'Parques', 'inparques', 'Territorio', INPARQUES_TODOS),
  v('i.parque', '/i/parque/:parqueId', 'Detalle del parque', 'inparques', 'Territorio', INPARQUES_TODOS),
  v('i.zonas', '/i/zonas', 'Zonas', 'inparques', 'Territorio', INPARQUES_TODOS),
  v('i.puntos', '/i/puntos', 'Puntos comerciales', 'inparques', 'Territorio', INPARQUES_TODOS),
  v('i.negocios', '/i/negocios', 'Directorio de negocios', 'inparques', 'Concesiones', INPARQUES_TODOS),
  v('i.negocio', '/i/negocio/:negocioId', 'Detalle del negocio', 'inparques', 'Concesiones', INPARQUES_TODOS),
  v('i.solicitudes', '/i/solicitudes', 'Solicitudes y expedientes', 'inparques', 'Concesiones', [...INP_CONCESIONES, 'inparques.admin_parque']),
  v('i.expediente', '/i/expediente/:negocioId', 'Expediente', 'inparques', 'Concesiones', [...INP_CONCESIONES, 'inparques.admin_parque']),
  v('i.revision', '/i/revision-documental/:negocioId', 'Revision documental', 'inparques', 'Concesiones', [...INP_CONCESIONES, 'inparques.admin_parque']),
  v('i.aprobaciones', '/i/aprobaciones', 'Aprobaciones', 'inparques', 'Concesiones', INP_CONCESIONES),
  v('i.permisos', '/i/permisos', 'Permisos y concesiones', 'inparques', 'Concesiones', [...INP_CONCESIONES, 'inparques.inspector', 'inparques.admin_parque']),
  v('i.contratos', '/i/contratos', 'Contratos', 'inparques', 'Concesiones', [...INP_CONCESIONES, 'inparques.finanzas']),
  v('i.canones', '/i/canones', 'Canones y comisiones', 'inparques', 'Concesiones', [...INP_CONCESIONES, 'inparques.finanzas']),
  v('i.vencimientos', '/i/vencimientos', 'Vencimientos', 'inparques', 'Concesiones', [...INP_CONCESIONES, 'inparques.admin_parque']),
  v('i.inspecciones', '/i/inspecciones', 'Inspecciones', 'inparques', 'Control', INP_CONTROL),
  v('i.inspeccion', '/i/inspeccion/:inspeccionId', 'Detalle de inspeccion', 'inparques', 'Control', INP_CONTROL),
  v('i.incidencias', '/i/incidencias', 'Incidencias', 'inparques', 'Control', INP_CONTROL),
  v('i.operacion', '/i/operacion', 'Operacion del parque', 'inparques', 'Control', ['inparques.superadmin', 'inparques.admin_parque']),
  v('i.contabilidad', '/i/contabilidad', 'Contabilidad', 'inparques', 'Finanzas', INP_FINANZAS),
  v('i.conciliacion', '/i/conciliacion', 'Conciliacion', 'inparques', 'Finanzas', INP_FINANZAS),
  v('i.por_cobrar', '/i/cuentas-por-cobrar', 'Cuentas por cobrar', 'inparques', 'Finanzas', INP_FINANZAS),
  v('i.cierres', '/i/cierres', 'Cierres', 'inparques', 'Finanzas', INP_FINANZAS, {
    notas: 'Un cierre no se edita ni se borra: se corrige con un ajuste.',
  }),
  v('i.reembolsos', '/i/reembolsos', 'Reembolsos', 'inparques', 'Finanzas', [...INP_FINANZAS, 'inparques.soporte']),
  v('i.ajustes', '/i/ajustes', 'Ajustes', 'inparques', 'Finanzas', INP_FINANZAS),
  v('i.disputas', '/i/disputas', 'Disputas', 'inparques', 'Soporte', INP_SOPORTE),
  v('i.valoraciones', '/i/valoraciones', 'Valoraciones y moderacion', 'inparques', 'Soporte', [...INP_SOPORTE, 'inparques.direccion_comercial'], {
    notas: 'Retirar no borra: marca la valoracion como oculta con su motivo.',
  }),
  v('i.disputa', '/i/disputa/:disputaId', 'Detalle de disputa', 'inparques', 'Soporte', INP_SOPORTE),
  v('i.sla', '/i/sla', 'SLA de soporte', 'inparques', 'Soporte', INP_SOPORTE),
  v('i.auditoria', '/i/auditoria', 'Bitacora de auditoria', 'inparques', 'Administracion', ['inparques.superadmin', 'inparques.finanzas', 'inparques.direccion_comercial', 'inparques.admin_parque'], {
    notas: 'Cada rol ve solo los eventos de su ambito. El administrador de parque tenia el permiso y no la ruta.',
  }),
  v('i.usuarios', '/i/usuarios', 'Usuarios', 'inparques', 'Administracion', ['inparques.superadmin', 'inparques.direccion_comercial']),
  v('i.roles', '/i/roles', 'Roles y permisos', 'inparques', 'Administracion', ['inparques.superadmin']),
  v('i.ambitos', '/i/ambitos', 'Ambitos', 'inparques', 'Administracion', ['inparques.superadmin']),
  v('i.sesiones', '/i/sesiones', 'Sesiones', 'inparques', 'Administracion', ['inparques.superadmin']),
  v('i.reglas', '/i/reglas', 'Reglas globales', 'inparques', 'Administracion', ['inparques.superadmin']),
  v('i.integraciones', '/i/integraciones', 'Integraciones', 'inparques', 'Administracion', ['inparques.superadmin'], {
    notas: 'Todas las integraciones son adaptadores simulados en la demo.',
  }),
  v('i.reportes', '/i/reportes', 'Reportes', 'inparques', 'Tableros', INPARQUES_TODOS),
];

export const VISTAS: Vista[] = [
  ...COMPARTIDAS,
  ...VISITANTE_VISTAS,
  ...COMERCIO_VISTAS,
  ...INPARQUES_VISTAS,
];

/** Cifra declarada en el enunciado, conservada para poder contrastarla. */
export const VISTAS_ESPERADAS_SEGUN_ENUNCIADO = 119;

// --- Consultas -------------------------------------------------------------

export function vistaPorRuta(ruta: string): Vista | undefined {
  return VISTAS.find((v_) => v_.ruta === ruta);
}

export function vistaPorId(id: string): Vista | undefined {
  return VISTAS.find((v_) => v_.id === id);
}

export function vistasDeRol(rol: RoleId): Vista[] {
  return VISTAS.filter((v_) => v_.roles.length === 0 || v_.roles.includes(rol));
}

export function vistasDeSuperficie(s: Vista['superficie']): Vista[] {
  return VISTAS.filter((v_) => v_.superficie === s);
}

export function gruposDe(s: Vista['superficie']): string[] {
  return [...new Set(vistasDeSuperficie(s).map((v_) => v_.grupo))];
}

export function resumenCobertura() {
  const porEstado: Record<EstadoVista, number> = {
    pendiente_html: 0, implementada: 0, conectada: 0, revisada: 0, bloqueada: 0,
  };
  for (const v_ of VISTAS) porEstado[v_.estado] += 1;
  return {
    total: VISTAS.length,
    esperadasSegunEnunciado: VISTAS_ESPERADAS_SEGUN_ENUNCIADO,
    diferencia: VISTAS.length - VISTAS_ESPERADAS_SEGUN_ENUNCIADO,
    porEstado,
    porSuperficie: {
      compartida: vistasDeSuperficie('compartida').length,
      visitante: vistasDeSuperficie('visitante').length,
      comercio: vistasDeSuperficie('comercio').length,
      inparques: vistasDeSuperficie('inparques').length,
    },
    sinHtml: VISTAS.filter((v_) => !v_.htmlRef).map((v_) => v_.id),
  };
}
