/**
 * Mapa de rutas a vistas.
 *
 * La clave es el `id` del registro de vistas, no la ruta: así el registro
 * sigue siendo la fuente única de rutas y roles, y aquí solo se dice quién
 * dibuja cada una.
 */

import type { Render } from './tipos';
import * as c from './compartidas';
import * as v from './visitante';
import * as com from './comercio';
import * as inp from './inparques';
import { entradaStitch } from './stitch-acceso';
import { propietarioInicio, adminLocalInicio, operadorInicio, contadorInicio } from './stitch-comercio';
import { superadminInicio, direccionComercialInicio } from './stitch-inparques';
import { inicioVisitante } from './stitch-visitante';
import { sesion } from '../../app/session';

/**
 * Algunas rutas dibujan una pantalla distinta según el rol activo: el HTML
 * original de Stitch es una página por rol, no una plantilla compartida.
 * A medida que se portan más roles, este mapa crece; el resto sigue usando
 * la vista genérica hasta que le llegue su turno.
 */
function inicioComercioPorRol(): Render {
  return (ctx) => {
    if (sesion.rol() === 'comercio.propietario') return propietarioInicio(ctx);
    if (sesion.rol() === 'comercio.admin_local') return adminLocalInicio(ctx);
    if (sesion.rol() === 'comercio.operador') return operadorInicio(ctx);
    if (sesion.rol() === 'comercio.contador') return contadorInicio(ctx);
    return com.inicio(ctx);
  };
}

function inicioInparquesPorRol(): Render {
  return (ctx) => {
    if (sesion.rol() === 'inparques.superadmin') return superadminInicio(ctx);
    if (sesion.rol() === 'inparques.direccion_comercial') return direccionComercialInicio(ctx);
    return inp.dashboard(ctx);
  };
}

export const VISTAS_POR_ID: Record<string, Render> = {
  // -------------------------------------------------------------- Compartidas
  'demo.perfiles': entradaStitch,
  'acceso.visitante': c.accesoVisitante,
  'acceso.comercio': c.accesoComercio,
  'acceso.inparques': c.accesoInparques,
  'registro.visitante': c.registroVisitante,
  'registro.invitado': c.compraInvitado,
  'invitacion.comercio': c.invitacionComercio,
  'invitacion.comercio.activar': c.activacionComercio,
  'invitacion.institucional': c.activacionInstitucional,
  'mfa.verificar': c.mfa,
  'mfa.configurar': c.mfaConfigurar,
  'recuperar.solicitud': c.recuperarSolicitud,
  'recuperar.codigo': c.recuperarCodigo,
  'recuperar.clave': c.recuperarClave,
  'sesiones.propias': c.sesiones,
  notificaciones: c.notificaciones,
  perfil: c.perfil,
  'perfil.accesibilidad': c.accesibilidad,
  'perfil.privacidad': c.privacidad,
  ayuda: c.ayuda,
  'error.403': c.error403,
  'error.404': c.error404,
  'error.sesion': c.sesionVencida,
  'error.mantenimiento': c.mantenimiento,
  'conexion.degradada': c.conexionDegradada,
  'conexion.cola': c.colaSincronizacionVista,
  'conexion.conflicto': c.conflictoSincronizacion,

  // ---------------------------------------------------------------- Visitante
  'v.inicio': inicioVisitante,
  'v.qr': v.escanearQr,
  'v.parques': v.parques,
  'v.parque': v.parque,
  'v.buscar': v.buscar,
  'v.categorias': v.categorias,
  'v.filtros': v.filtros,
  'v.mapa': v.mapa,
  'v.zona': v.zona,
  'v.comercio': v.fichaComercio,
  'v.catalogo': v.catalogo,
  'v.articulo': v.articulo,
  'v.servicio': v.servicio,
  'v.como_llegar': v.comoLlegar,
  'v.carrito': v.carrito,
  'v.checkout': v.checkout,
  'v.checkout.cumplimiento': v.checkout,
  'v.checkout.pago': v.seleccionPago,
  'v.pago.movil': v.pagoMovil,
  'v.pago.transferencia': v.pagoTransferencia,
  'v.pago.tarjeta': v.pagoTarjeta,
  'v.pago.efectivo': v.pagoEfectivo,
  'v.confirmacion': v.confirmacion,
  'v.pedido': v.seguimientoPedido,
  'v.reserva': v.seguimientoReserva,
  'v.retiro': v.codigoRetiro,
  'v.historial': v.historial,
  'v.comprobante': v.comprobante,
  'v.factura': v.facturaVisitante,
  'v.valorar': v.valorarVista,
  'v.reclamo': v.reclamo,
  'v.reclamos': v.reclamos,
  'v.perfil': v.perfilVisitante,

  // ----------------------------------------------------------------- Comercio
  'c.inicio': inicioComercioPorRol(),
  'c.mas': c.masOpciones('comercio'),
  'c.expediente': com.expediente,
  'c.documentos': com.documentos,
  'c.documento': com.detalleDocumento,
  'c.permisos': com.permisos,
  'c.contratos': com.contratos,
  'c.contrato': com.detalleContrato,
  'c.cobro': com.cobro,
  'c.cuenta_bancaria': com.cuentaBancaria,
  'c.equipo': com.equipo,
  'c.equipo.invitar': com.invitarEquipo,
  'c.equipo.detalle': com.detalleEquipo,
  'c.catalogo': com.catalogo,
  'c.articulo': com.articuloComercio,
  'c.variantes': com.variantes,
  'c.modificadores': com.modificadores,
  'c.alergenos': com.alergenos,
  'c.horarios': com.horarios,
  'c.cupos': com.cupos,
  'c.inventario': com.inventario,
  'c.pedidos': com.pedidos,
  'c.pedido': com.detallePedido,
  'c.reservas': com.reservas,
  'c.reserva': com.detalleReserva,
  'c.caja': com.caja,
  'c.mostrador': com.ventaMostrador,
  'c.turno.abrir': com.abrirTurnoVista,
  'c.turno.cerrar': com.cerrarTurnoVista,
  'c.turno': com.detalleTurno,
  'c.reportes': com.reportes,
  'c.conciliacion': com.conciliacion,
  'c.comprobantes': com.comprobantes,
  'c.facturas': com.facturas,
  'c.factura': com.detalleFactura,
  'c.estado_cuenta': com.estadoCuenta,
  'c.ajustes': com.ajustes,
  'c.exportaciones': com.exportaciones,

  // ---------------------------------------------------------------- INPARQUES
  'i.inicio': inicioInparquesPorRol(),
  'i.mas': c.masOpciones('inparques'),
  'i.dashboard.parque': inp.dashboardParque,
  'i.territorio': inp.territorio,
  'i.parques': inp.parques,
  'i.parque': inp.detalleParque,
  'i.zonas': inp.zonas,
  'i.puntos': inp.puntos,
  'i.negocios': inp.negocios,
  'i.negocio': inp.detalleNegocio,
  'i.solicitudes': inp.solicitudes,
  'i.expediente': inp.expediente,
  'i.revision': inp.revisionDocumental,
  'i.aprobaciones': inp.aprobaciones,
  'i.permisos': inp.permisos,
  'i.contratos': inp.contratos,
  'i.canones': inp.canones,
  'i.vencimientos': inp.vencimientos,
  'i.inspecciones': inp.inspecciones,
  'i.inspeccion': inp.detalleInspeccion,
  'i.incidencias': inp.incidencias,
  'i.operacion': inp.operacion,
  'i.contabilidad': inp.contabilidad,
  'i.conciliacion': inp.conciliacion,
  'i.por_cobrar': inp.cuentasPorCobrar,
  'i.cierres': inp.cierres,
  'i.reembolsos': inp.reembolsos,
  'i.ajustes': inp.ajustes,
  'i.disputas': inp.disputas,
  'i.disputa': inp.detalleDisputa,
  'i.sla': inp.sla,
  'i.auditoria': inp.auditoria,
  'i.usuarios': inp.usuarios,
  'i.roles': inp.roles,
  'i.ambitos': inp.ambitos,
  'i.sesiones': inp.sesionesAdmin,
  'i.reglas': inp.reglas,
  'i.integraciones': inp.integraciones,
  'i.reportes': inp.reportes,
};
