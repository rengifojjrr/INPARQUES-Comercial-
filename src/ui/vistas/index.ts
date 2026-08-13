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
import { superadminInicio, direccionComercialInicio, finanzasInicio, adminParqueInicio, inspectorInicio, soporteInicio } from './stitch-inparques';
import { inicioVisitante } from './stitch-visitante';
import * as stitchCompra from './stitch-visitante-compra';
import { mapaStitch } from './stitch-visitante-mapa';
import * as stitchComercioInterior from './stitch-comercio-interior';
import * as stitchComercioOp from './stitch-comercio-operacion';
import * as stitchComercioFin from './stitch-comercio-finanzas';
import * as stitchInp from './stitch-inparques-interior';
import * as stitchInpCon from './stitch-inparques-concesiones';
import * as stitchInpFin from './stitch-inparques-finanzas';
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
    if (sesion.rol() === 'inparques.finanzas') return finanzasInicio(ctx);
    if (sesion.rol() === 'inparques.admin_parque') return adminParqueInicio(ctx);
    if (sesion.rol() === 'inparques.inspector') return inspectorInicio(ctx);
    if (sesion.rol() === 'inparques.soporte') return soporteInicio(ctx);
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
  'v.mapa': mapaStitch,
  'v.zona': v.zona,
  'v.comercio': stitchCompra.fichaComercioStitch,
  'v.catalogo': stitchCompra.fichaComercioStitch,
  'v.articulo': stitchCompra.articuloStitch,
  'v.servicio': stitchCompra.servicioStitch,
  'v.como_llegar': v.comoLlegar,
  'v.carrito': stitchCompra.carritoStitch,
  'v.checkout': stitchCompra.checkoutStitch,
  'v.checkout.cumplimiento': stitchCompra.checkoutStitch,
  'v.checkout.pago': stitchCompra.seleccionPagoStitch,
  'v.pago.movil': stitchCompra.pagoMovilStitch,
  'v.pago.transferencia': stitchCompra.pagoTransferenciaStitch,
  'v.pago.tarjeta': stitchCompra.pagoTarjetaStitch,
  'v.pago.efectivo': stitchCompra.pagoEfectivoStitch,
  'v.confirmacion': v.confirmacion,
  'v.pedido': stitchCompra.seguimientoPedidoStitch,
  'v.reserva': stitchCompra.seguimientoReservaStitch,
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
  'c.expediente': stitchComercioInterior.expedienteStitch,
  'c.documentos': stitchComercioInterior.documentosStitch,
  'c.documento': stitchComercioInterior.detalleDocumentoStitch,
  'c.permisos': stitchComercioInterior.permisosStitch,
  'c.contratos': stitchComercioInterior.contratosStitch,
  'c.contrato': stitchComercioInterior.detalleContratoStitch,
  'c.cobro': stitchComercioInterior.cobroStitch,
  'c.cuenta_bancaria': stitchComercioInterior.cuentaBancariaStitch,
  'c.equipo': stitchComercioInterior.equipoStitch,
  'c.equipo.invitar': stitchComercioInterior.invitarEquipoStitch,
  'c.equipo.detalle': stitchComercioInterior.detalleEquipoStitch,
  'c.catalogo': stitchComercioInterior.catalogoStitch,
  'c.articulo': com.articuloComercio,
  'c.variantes': com.variantes,
  'c.modificadores': com.modificadores,
  'c.alergenos': com.alergenos,
  'c.horarios': com.horarios,
  'c.cupos': com.cupos,
  'c.inventario': com.inventario,
  'c.pedidos': stitchComercioOp.pedidosStitch,
  'c.pedido': stitchComercioOp.detallePedidoStitch,
  'c.reservas': stitchComercioOp.reservasStitch,
  'c.reserva': stitchComercioOp.detallePedidoStitch,
  'c.caja': stitchComercioOp.cajaStitch,
  'c.mostrador': stitchComercioOp.ventaMostradorStitch,
  'c.turno.abrir': stitchComercioOp.abrirTurnoStitch,
  'c.turno.cerrar': stitchComercioOp.cerrarTurnoStitch,
  'c.turno': stitchComercioOp.detalleTurnoStitch,
  'c.reportes': stitchComercioFin.reportesStitch,
  'c.conciliacion': stitchComercioFin.conciliacionStitch,
  'c.comprobantes': stitchComercioFin.comprobantesStitch,
  'c.facturas': stitchComercioFin.facturasStitch,
  'c.factura': stitchComercioFin.detalleFacturaStitch,
  'c.estado_cuenta': stitchComercioFin.estadoCuentaStitch,
  'c.ajustes': stitchComercioFin.ajustesStitch,
  'c.exportaciones': stitchComercioFin.exportacionesStitch,

  // ---------------------------------------------------------------- INPARQUES
  'i.inicio': inicioInparquesPorRol(),
  'i.mas': c.masOpciones('inparques'),
  'i.dashboard.parque': inp.dashboardParque,
  'i.territorio': stitchInp.territorioStitch,
  'i.parques': stitchInp.parquesStitch,
  'i.parque': stitchInp.detalleParqueStitch,
  'i.zonas': stitchInp.zonasStitch,
  'i.puntos': stitchInp.puntosStitch,
  'i.negocios': stitchInp.negociosStitch,
  'i.negocio': stitchInp.detalleNegocioStitch,
  'i.solicitudes': stitchInpCon.solicitudesStitch,
  'i.expediente': stitchInpCon.expedienteStitch,
  'i.revision': stitchInpCon.expedienteStitch,
  'i.aprobaciones': stitchInpCon.aprobacionesStitch,
  'i.permisos': stitchInpCon.permisosStitch,
  'i.contratos': stitchInpCon.contratosStitch,
  'i.canones': stitchInpCon.canonesStitch,
  'i.vencimientos': stitchInpCon.vencimientosStitch,
  'i.inspecciones': stitchInpCon.inspeccionesStitch,
  'i.inspeccion': stitchInpCon.detalleInspeccionStitch,
  'i.incidencias': stitchInpCon.incidenciasStitch,
  'i.operacion': stitchInpCon.operacionStitch,
  'i.contabilidad': stitchInpFin.contabilidadStitch,
  'i.conciliacion': stitchInpFin.conciliacionStitch,
  'i.por_cobrar': stitchInpFin.porCobrarStitch,
  'i.cierres': stitchInpFin.cierresStitch,
  'i.reembolsos': stitchInpFin.reembolsosStitch,
  'i.ajustes': stitchInpFin.ajustesStitch,
  'i.disputas': stitchInpFin.disputasStitch,
  'i.disputa': stitchInpFin.detalleDisputaStitch,
  'i.sla': stitchInpFin.slaStitch,
  'i.auditoria': stitchInp.auditoriaStitch,
  'i.usuarios': stitchInp.usuariosStitch,
  'i.roles': stitchInp.rolesStitch,
  'i.ambitos': stitchInp.ambitosStitch,
  'i.sesiones': stitchInp.sesionesStitch,
  'i.reglas': stitchInp.reglasStitch,
  'i.integraciones': stitchInp.integracionesStitch,
  'i.reportes': stitchInpFin.reportesStitch,
};
