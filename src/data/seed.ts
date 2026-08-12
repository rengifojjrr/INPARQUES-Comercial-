/**
 * Conjunto de datos inicial de la demo.
 *
 * Los catalogos estables viven en `seed/*.json` para poder editarlos a mano.
 * Aqui se componen y se generan los registros transaccionales, que necesitan
 * referencias cruzadas y tasas congeladas coherentes.
 *
 * Parque piloto: "Parque del Este - piloto", zonas Entrada Norte, Lago,
 * Jardin Central y Area Infantil; negocios Café Los Cedros, Juguetes Orinoco
 * y Aventuras del Lago. Todos los nombres son ficticios.
 */

import territorio from './seed/territorio.json';
import comercios from './seed/comercios.json';
import catalogo from './seed/catalogo.json';
import usuariosJson from './seed/usuarios.json';

import type {
  Articulo,
  CuentaBancaria,
  DemoState,
  HorarioSemana,
  Local,
  Negocio,
  Orden,
  Parque,
  PuntoComercial,
  Region,
  User,
  Zona,
} from '../domain/types';
import { calcularTotales, calcularParticipacion, redondear, usdAVes } from '../domain/money';

export const VERSION_DATOS = 1;

/** Tasa BCV de demostracion. Las ventas historicas conservan la suya. */
export const TASA_BCV_INICIAL = { valor: 51.87, fecha: '2026-08-12T09:00:00.000Z', fuente: 'BCV (simulado)' };

/** Tasa vigente cuando se registraron las ventas de julio y agosto. */
const TASA_JULIO = 49.4;
const TASA_AGOSTO = 51.12;

const HORARIO_ESTANDAR: HorarioSemana = {
  0: [{ desde: '08:00', hasta: '16:00' }],
  2: [{ desde: '07:00', hasta: '16:30' }],
  3: [{ desde: '07:00', hasta: '16:30' }],
  4: [{ desde: '07:00', hasta: '16:30' }],
  5: [{ desde: '07:00', hasta: '17:00' }],
  6: [{ desde: '07:00', hasta: '17:00' }],
};

export function construirEstadoInicial(): DemoState {
  const regiones = territorio.regiones as Region[];
  const parques = territorio.parques as Parque[];
  const zonas = territorio.zonas as Zona[];
  const puntos = territorio.puntos as PuntoComercial[];

  const negocios = comercios.negocios as Negocio[];
  const cuentasBancarias = comercios.cuentasBancarias as CuentaBancaria[];
  const locales: Local[] = (comercios.locales as Omit<Local, 'horarios'>[]).map((l) => ({
    ...l,
    horarios: HORARIO_ESTANDAR,
  }));

  const articulos = catalogo.articulos as unknown as Articulo[];
  const usuarios = usuariosJson.usuarios as unknown as User[];

  const estado: DemoState = {
    version: VERSION_DATOS,
    regiones,
    parques,
    zonas,
    puntos,
    negocios,
    locales,
    articulos,
    cuentasBancarias,
    usuarios,
    sesiones: [],
    invitaciones: [
      {
        id: 'inv_manantial',
        correo: 'propietario@manantial.demo.ve',
        rol: 'comercio.propietario',
        scope: { level: 'negocio', ids: ['ng_manantial'] },
        emitidaPor: 'us_direccion',
        emitidaEn: '2026-07-28T16:25:00.000Z',
        expiraEn: '2026-08-27T16:25:00.000Z',
        codigo: 'DEMO-4821',
        estado: 'pendiente',
      },
      {
        id: 'inv_operador_orinoco',
        correo: 'mostrador@orinoco.demo.ve',
        rol: 'comercio.operador',
        scope: { level: 'local', ids: ['lc_orinoco_ai'] },
        emitidaPor: 'us_prop_orinoco',
        emitidaEn: '2026-08-05T10:00:00.000Z',
        expiraEn: '2026-09-04T10:00:00.000Z',
        codigo: 'DEMO-7390',
        estado: 'pendiente',
      },
    ],
    documentos: documentos(),
    permisos: permisos(),
    contratos: contratos(),
    franjas: franjas(),
    ordenes: [],
    pagos: [],
    facturas: [],
    reembolsos: [],
    liquidaciones: [],
    ajustes: [],
    turnos: turnos(),
    inspecciones: inspecciones(),
    incidencias: incidencias(),
    disputas: [],
    valoraciones: [],
    auditoria: [],
    notificaciones: [],
    tasaBcv: { ...TASA_BCV_INICIAL },
  };

  sembrarTransacciones(estado);
  return estado;
}

// ---------------------------------------------------------------------------

function documentos(): DemoState['documentos'] {
  return [
    { id: 'dc_1', negocioId: 'ng_cedros', tipo: 'rif', nombreArchivo: 'rif-los-cedros.pdf', cargadoEn: '2026-03-04T09:30:00.000Z', vigenciaHasta: '2027-03-04', estado: 'aprobado', revisadoPor: 'us_direccion' },
    { id: 'dc_2', negocioId: 'ng_cedros', tipo: 'permiso_sanitario', nombreArchivo: 'sanitario-los-cedros.pdf', cargadoEn: '2026-03-04T09:35:00.000Z', vigenciaHasta: '2026-09-15', estado: 'aprobado', revisadoPor: 'us_admin_parque' },
    { id: 'dc_3', negocioId: 'ng_cedros', tipo: 'certificado_manipulacion', nombreArchivo: 'manipulacion-alimentos.pdf', cargadoEn: '2026-03-04T09:40:00.000Z', vigenciaHasta: '2026-08-30', estado: 'aprobado', revisadoPor: 'us_admin_parque' },
    { id: 'dc_4', negocioId: 'ng_orinoco', tipo: 'rif', nombreArchivo: 'rif-orinoco.pdf', cargadoEn: '2026-03-19T15:00:00.000Z', vigenciaHasta: '2027-03-19', estado: 'aprobado', revisadoPor: 'us_direccion' },
    { id: 'dc_5', negocioId: 'ng_orinoco', tipo: 'registro_mercantil', nombreArchivo: 'registro-orinoco.pdf', cargadoEn: '2026-03-19T15:05:00.000Z', estado: 'aprobado', revisadoPor: 'us_direccion' },
    { id: 'dc_6', negocioId: 'ng_aventuras', tipo: 'poliza', nombreArchivo: 'poliza-responsabilidad.pdf', cargadoEn: '2026-04-02T11:30:00.000Z', vigenciaHasta: '2026-08-20', estado: 'aprobado', revisadoPor: 'us_direccion' },
    { id: 'dc_7', negocioId: 'ng_aventuras', tipo: 'rif', nombreArchivo: 'rif-aventuras.pdf', cargadoEn: '2026-04-02T11:32:00.000Z', vigenciaHasta: '2027-04-02', estado: 'aprobado', revisadoPor: 'us_direccion' },
    { id: 'dc_8', negocioId: 'ng_manantial', tipo: 'rif', nombreArchivo: 'rif-manantial.pdf', cargadoEn: '2026-07-28T16:30:00.000Z', estado: 'en_revision' },
    { id: 'dc_9', negocioId: 'ng_manantial', tipo: 'cedula_responsable', nombreArchivo: 'cedula-responsable.pdf', cargadoEn: '2026-07-28T16:31:00.000Z', estado: 'observado', observacion: 'La imagen está cortada en el margen inferior. Cargue nuevamente el documento completo.', revisadoPor: 'us_admin_parque' },
    { id: 'dc_10', negocioId: 'ng_manantial', tipo: 'registro_mercantil', nombreArchivo: 'registro-manantial.pdf', cargadoEn: '2026-07-28T16:33:00.000Z', estado: 'pendiente' },
  ];
}

function permisos(): DemoState['permisos'] {
  return [
    { id: 'pm_cedros_jc', negocioId: 'ng_cedros', puntoId: 'pt_jc_01', tipo: 'concesion', numero: 'CON-2026-0041', desde: '2026-03-15', hasta: '2027-03-14', estado: 'vigente' },
    { id: 'pm_cedros_en', negocioId: 'ng_cedros', puntoId: 'pt_en_01', tipo: 'permiso_temporal', numero: 'PTE-2026-0112', desde: '2026-06-01', hasta: '2026-08-31', estado: 'por_vencer' },
    { id: 'pm_orinoco', negocioId: 'ng_orinoco', puntoId: 'pt_ai_01', tipo: 'concesion', numero: 'CON-2026-0052', desde: '2026-04-01', hasta: '2027-03-31', estado: 'vigente' },
    { id: 'pm_aventuras', negocioId: 'ng_aventuras', puntoId: 'pt_lg_01', tipo: 'concesion', numero: 'CON-2026-0063', desde: '2026-04-15', hasta: '2027-04-14', estado: 'vigente' },
  ];
}

function contratos(): DemoState['contratos'] {
  return [
    { id: 'ct_cedros', negocioId: 'ng_cedros', permisoId: 'pm_cedros_jc', desde: '2026-03-15', hasta: '2027-03-14', canonFijoUsd: 120, porcentajeSobreVenta: 8, minimoGarantizadoUsd: 150, estado: 'vigente' },
    { id: 'ct_orinoco', negocioId: 'ng_orinoco', permisoId: 'pm_orinoco', desde: '2026-04-01', hasta: '2027-03-31', canonFijoUsd: 90, porcentajeSobreVenta: 6, minimoGarantizadoUsd: 110, estado: 'vigente' },
    { id: 'ct_aventuras', negocioId: 'ng_aventuras', permisoId: 'pm_aventuras', desde: '2026-04-15', hasta: '2027-04-14', canonFijoUsd: 150, porcentajeSobreVenta: 10, minimoGarantizadoUsd: 200, estado: 'vigente' },
  ];
}

function franjas(): DemoState['franjas'] {
  const salida: DemoState['franjas'] = [];
  const base = new Date('2026-08-12T00:00:00.000Z');
  for (let d = 0; d < 7; d++) {
    const fecha = new Date(base.getTime() + d * 86400000).toISOString().slice(0, 10);
    const horas = ['09:00', '10:00', '11:00', '14:00', '15:00'];
    horas.forEach((h, i) => {
      salida.push({
        id: `fr_lancha_${d}_${i}`,
        articuloId: 'ar_paseo_lancha',
        fecha,
        desde: h,
        hasta: `${String(Number(h.slice(0, 2))).padStart(2, '0')}:30`,
        cupoTotal: 12,
        // La primera franja del dia 0 llega casi llena, para poder mostrar el
        // estado "cupo insuficiente" sin tener que fabricarlo a mano.
        cupoTomado: d === 0 && i === 0 ? 11 : d === 0 && i === 1 ? 12 : 0,
      });
      salida.push({
        id: `fr_bici_${d}_${i}`,
        articuloId: 'ar_bicicleta',
        fecha,
        desde: h,
        hasta: `${String(Number(h.slice(0, 2)) + 1).padStart(2, '0')}:00`,
        cupoTotal: 8,
        cupoTomado: d === 0 && i === 0 ? 3 : 0,
      });
    });
  }
  return salida;
}

function turnos(): DemoState['turnos'] {
  return [
    {
      id: 'tn_cedros_11ago',
      localId: 'lc_cedros_jc',
      operadorId: 'us_operador_cedros',
      abiertoEn: '2026-08-11T11:00:00.000Z',
      cerradoEn: '2026-08-11T21:05:00.000Z',
      fondoInicialVes: 500,
      efectivoDeclaradoVes: 1729.4,
      esperadoPorMetodo: { pago_movil: 2470.0, transferencia: 0, tarjeta: 0, efectivo: 1729.4 },
      diferenciaVes: 0,
      responsableCierreId: 'us_admin_cedros',
      aprobadoPorId: 'us_prop_cedros',
      estado: 'cerrado',
    },
    {
      id: 'tn_cedros_hoy',
      localId: 'lc_cedros_jc',
      operadorId: 'us_operador_cedros',
      abiertoEn: '2026-08-12T11:00:00.000Z',
      fondoInicialVes: 500,
      esperadoPorMetodo: { pago_movil: 0, transferencia: 0, tarjeta: 0, efectivo: 0 },
      estado: 'abierto',
    },
  ];
}

function inspecciones(): DemoState['inspecciones'] {
  return [
    {
      id: 'in_1',
      negocioId: 'ng_cedros',
      localId: 'lc_cedros_jc',
      inspectorId: 'us_inspector',
      fecha: '2026-07-22T13:00:00.000Z',
      resultado: 'conforme',
      hallazgos: ['Permiso sanitario a la vista', 'Cadena de frío dentro del rango'],
    },
    {
      id: 'in_2',
      negocioId: 'ng_aventuras',
      localId: 'lc_aventuras_lg',
      inspectorId: 'us_inspector',
      fecha: '2026-08-04T10:30:00.000Z',
      resultado: 'observado',
      hallazgos: ['Dos chalecos sin revisión vigente', 'Falta señalización de capacidad en el muelle'],
    },
  ];
}

function incidencias(): DemoState['incidencias'] {
  return [
    {
      id: 'ic_1',
      parqueId: 'pq_este',
      negocioId: 'ng_aventuras',
      reportadaPor: 'us_inspector',
      tipo: 'seguridad',
      descripcion: 'Muelle sin cartel de capacidad máxima durante la inspección del 4 de agosto.',
      estado: 'en_atencion',
      creadaEn: '2026-08-04T10:45:00.000Z',
    },
    {
      id: 'ic_2',
      parqueId: 'pq_este',
      reportadaPor: 'us_admin_parque',
      tipo: 'infraestructura',
      descripcion: 'Falla intermitente de energía en el módulo AI-02; punto inhabilitado hasta nueva revisión.',
      estado: 'abierta',
      creadaEn: '2026-08-09T08:15:00.000Z',
    },
  ];
}

// ---------------------------------------------------------------------------
// Transacciones de ejemplo: cubren los cuatro procesos en estados distintos
// ---------------------------------------------------------------------------

function sembrarTransacciones(e: DemoState): void {
  // 1. Pedido entregado, pagado por Pago Movil, facturado y ya liquidado.
  crearOrdenDemo(e, {
    id: 'or_1001',
    codigo: 'PE-1001',
    fecha: '2026-08-11T13:20:00.000Z',
    localId: 'lc_cedros_jc',
    canal: 'app',
    clienteId: 'us_visitante',
    clienteNombre: 'Daniela Ochoa',
    lineas: [
      { articuloId: 'ar_cafe_guayoyo', nombre: 'Guayoyo grande', cantidad: 2, precioUnitarioUsd: 1.2 },
      { articuloId: 'ar_cachito', nombre: 'Cachito de jamón', cantidad: 1, precioUnitarioUsd: 1.5 },
    ],
    tasa: TASA_AGOSTO,
    estadoOrden: 'entregada',
    estadoPago: 'confirmado',
    metodo: 'pago_movil',
    conFactura: true,
  });

  // 2. Pedido listo para retirar; el pago aun no esta verificado.
  //    Sirve para comprobar que orden y pago son procesos distintos.
  crearOrdenDemo(e, {
    id: 'or_1002',
    codigo: 'PE-1002',
    fecha: '2026-08-12T12:05:00.000Z',
    localId: 'lc_cedros_jc',
    canal: 'app',
    clienteNombre: 'Invitado',
    invitado: true,
    lineas: [{ articuloId: 'ar_cachito', nombre: 'Cachito de jamón', cantidad: 3, precioUnitarioUsd: 1.5 }],
    tasa: TASA_BCV_INICIAL.valor,
    estadoOrden: 'lista',
    estadoPago: 'pendiente_verificacion',
    metodo: 'transferencia',
    conFactura: false,
  });

  // 3. Venta de mostrador en efectivo: debe aparecer en caja y en reportes.
  crearOrdenDemo(e, {
    id: 'or_1003',
    codigo: 'MO-1003',
    fecha: '2026-08-12T12:40:00.000Z',
    localId: 'lc_cedros_jc',
    canal: 'mostrador',
    clienteNombre: 'Venta de mostrador',
    lineas: [{ articuloId: 'ar_jugo_en', nombre: 'Jugo natural de parchita', cantidad: 1, precioUnitarioUsd: 1.8 }],
    tasa: TASA_BCV_INICIAL.valor,
    estadoOrden: 'entregada',
    estadoPago: 'confirmado',
    metodo: 'efectivo',
    conFactura: true,
  });

  // 4. Reserva de servicio pagada, pendiente de consumo.
  crearOrdenDemo(e, {
    id: 'or_1004',
    codigo: 'RE-1004',
    fecha: '2026-08-12T09:30:00.000Z',
    localId: 'lc_aventuras_lg',
    canal: 'app',
    clienteId: 'us_visitante',
    clienteNombre: 'Daniela Ochoa',
    tipo: 'reserva',
    cumplimiento: 'retiro_programado',
    franjaId: 'fr_lancha_0_0',
    programadaPara: '2026-08-12T09:00:00.000Z',
    lineas: [{ articuloId: 'ar_paseo_lancha', nombre: 'Paseo en lancha por el lago', cantidad: 1, precioUnitarioUsd: 5 }],
    tasa: TASA_BCV_INICIAL.valor,
    estadoOrden: 'aceptada',
    estadoPago: 'confirmado',
    metodo: 'pago_movil',
    conFactura: false,
  });

  // 5. Pedido de julio, cerrado y conciliado: conserva la tasa de julio.
  crearOrdenDemo(e, {
    id: 'or_0987',
    codigo: 'PE-0987',
    fecha: '2026-07-24T15:10:00.000Z',
    localId: 'lc_orinoco_ai',
    canal: 'app',
    clienteId: 'us_visitante',
    clienteNombre: 'Daniela Ochoa',
    lineas: [{ articuloId: 'ar_rompecabezas', nombre: 'Rompecabezas fauna del parque', cantidad: 1, precioUnitarioUsd: 6.5 }],
    tasa: TASA_JULIO,
    estadoOrden: 'entregada',
    estadoPago: 'confirmado',
    metodo: 'pago_movil',
    conFactura: true,
  });

  // 6. Pedido cancelado con pago revertido.
  crearOrdenDemo(e, {
    id: 'or_0990',
    codigo: 'PE-0990',
    fecha: '2026-07-30T16:00:00.000Z',
    localId: 'lc_cedros_jc',
    canal: 'app',
    clienteNombre: 'Invitado',
    invitado: true,
    lineas: [{ articuloId: 'ar_tequeyoyo', nombre: 'Tequeños (6 unidades)', cantidad: 1, precioUnitarioUsd: 3 }],
    tasa: TASA_JULIO,
    estadoOrden: 'cancelada',
    estadoPago: 'revertido',
    metodo: 'pago_movil',
    conFactura: false,
  });

  liquidaciones(e);
  valoracionesYDisputas(e);
  notificacionesIniciales(e);
}

interface EntradaOrden {
  id: string;
  codigo: string;
  fecha: string;
  localId: string;
  canal: 'app' | 'mostrador';
  clienteId?: string;
  clienteNombre: string;
  invitado?: boolean;
  tipo?: 'pedido' | 'reserva';
  cumplimiento?: Orden['cumplimiento'];
  programadaPara?: string;
  franjaId?: string;
  lineas: Array<{ articuloId: string; nombre: string; cantidad: number; precioUnitarioUsd: number }>;
  tasa: number;
  estadoOrden: Orden['estado'];
  estadoPago: DemoState['pagos'][number]['estado'];
  metodo: DemoState['pagos'][number]['metodo'];
  conFactura: boolean;
}

function crearOrdenDemo(e: DemoState, d: EntradaOrden): void {
  const local = e.locales.find((l) => l.id === d.localId)!;
  const punto = e.puntos.find((p) => p.id === local.puntoId)!;
  const negocio = e.negocios.find((n) => n.id === local.negocioId)!;

  const totales = calcularTotales(
    d.lineas.map((l) => ({ cantidad: l.cantidad, precioUnitarioUsd: l.precioUnitarioUsd, extrasUsd: 0 })),
    d.tasa,
  );

  const orden: Orden = {
    id: d.id,
    codigo: d.codigo,
    negocioId: negocio.id,
    localId: local.id,
    parqueId: local.parqueId,
    puntoId: punto.id,
    clienteId: d.clienteId,
    clienteNombre: d.clienteNombre,
    invitado: d.invitado ?? false,
    canal: d.canal,
    tipo: d.tipo ?? 'pedido',
    cumplimiento: d.cumplimiento ?? 'retiro_inmediato',
    programadaPara: d.programadaPara,
    franjaId: d.franjaId,
    items: d.lineas.map((l, i) => ({
      id: `${d.id}_it${i}`,
      articuloId: l.articuloId,
      nombre: l.nombre,
      cantidad: l.cantidad,
      precioUnitarioUsd: l.precioUnitarioUsd,
      seleccionVariantes: [],
      seleccionModificadores: [],
    })),
    estado: d.estadoOrden,
    subtotalUsd: totales.subtotalUsd,
    impuestosUsd: totales.impuestosUsd,
    descuentoUsd: 0,
    totalUsd: totales.totalUsd,
    tasaBcv: d.tasa,
    tasaBcvFecha: d.fecha,
    totalVes: totales.totalVes,
    codigoRetiro: d.codigo.replace('-', ''),
    operadorId: d.canal === 'mostrador' ? 'us_operador_cedros' : undefined,
    creadaEn: d.fecha,
    historial: [
      { en: d.fecha, de: null, a: 'creada', porUsuarioId: d.clienteId ?? 'invitado', porRol: 'visitante.cliente' },
      { en: d.fecha, de: 'creada', a: d.estadoOrden, porUsuarioId: 'us_operador_cedros', porRol: 'comercio.operador' },
    ],
  };
  e.ordenes.push(orden);

  e.pagos.push({
    id: `pg_${d.id}`,
    ordenId: d.id,
    metodo: d.metodo,
    estado: d.estadoPago,
    montoVes: totales.totalVes,
    montoUsd: totales.totalUsd,
    tasaBcv: d.tasa,
    referencia: d.metodo === 'efectivo' ? undefined : `REF${d.id.slice(-6)}`,
    bancoEmisor: d.metodo === 'efectivo' ? undefined : 'Banco Demo Nacional',
    adaptador: d.metodo === 'efectivo' ? 'caja.local' : 'banco.simulado',
    claveIdempotencia: `idem_${d.id}`,
    creadoEn: d.fecha,
    confirmadoEn: d.estadoPago === 'confirmado' ? d.fecha : undefined,
    historial: [{ en: d.fecha, de: null, a: d.estadoPago, porUsuarioId: 'sistema', porRol: 'comercio.operador' }],
  });

  if (d.conFactura) {
    e.facturas.push({
      id: `fc_${d.id}`,
      ordenId: d.id,
      negocioId: negocio.id,
      emisorRif: negocio.rif,
      emisorRazonSocial: negocio.razonSocial,
      numero: `00-${d.id.slice(-4)}`,
      numeroControl: `CTRL-${d.id.slice(-4)}`,
      estado: 'emitida',
      baseImponibleUsd: totales.subtotalUsd,
      ivaUsd: totales.impuestosUsd,
      totalUsd: totales.totalUsd,
      totalVes: totales.totalVes,
      tasaBcv: d.tasa,
      emitidaEn: d.fecha,
      adaptador: 'fiscal.simulado',
    });
  }
}

function liquidaciones(e: DemoState): void {
  for (const contrato of e.contratos) {
    const ventas = e.ordenes
      .filter((o) => o.negocioId === contrato.negocioId && o.estado === 'entregada')
      .filter((o) => o.creadaEn < '2026-08-01')
      .reduce((s, o) => s + o.totalUsd, 0);
    if (ventas === 0) continue;

    const p = calcularParticipacion(ventas, contrato);
    e.liquidaciones.push({
      id: `lq_${contrato.negocioId}_julio`,
      negocioId: contrato.negocioId,
      periodoDesde: '2026-07-01',
      periodoHasta: '2026-07-31',
      ventasUsd: redondear(ventas),
      comisionUsd: p.comisionUsd,
      canonUsd: p.canonUsd,
      ajustesUsd: 0,
      netoUsd: p.totalUsd,
      estado: 'cerrada',
      cerradaEn: '2026-08-05T12:00:00.000Z',
      historial: [
        { en: '2026-08-01T09:00:00.000Z', de: null, a: 'calculada', porUsuarioId: 'sistema', porRol: 'inparques.finanzas' },
        { en: '2026-08-02T09:00:00.000Z', de: 'calculada', a: 'por_cobrar', porUsuarioId: 'us_finanzas', porRol: 'inparques.finanzas' },
        { en: '2026-08-04T09:00:00.000Z', de: 'por_cobrar', a: 'conciliada', porUsuarioId: 'us_finanzas', porRol: 'inparques.finanzas' },
        { en: '2026-08-05T12:00:00.000Z', de: 'conciliada', a: 'cerrada', porUsuarioId: 'us_finanzas', porRol: 'inparques.finanzas', motivo: 'Cierre mensual de julio 2026' },
      ],
    });
  }

  // Periodo de agosto en curso, aun sin cerrar.
  const ventasAgosto = e.ordenes
    .filter((o) => o.negocioId === 'ng_cedros' && o.estado === 'entregada' && o.creadaEn >= '2026-08-01')
    .reduce((s, o) => s + o.totalUsd, 0);
  const contratoCedros = e.contratos.find((c) => c.negocioId === 'ng_cedros')!;
  const p = calcularParticipacion(ventasAgosto, contratoCedros);
  e.liquidaciones.push({
    id: 'lq_ng_cedros_agosto',
    negocioId: 'ng_cedros',
    periodoDesde: '2026-08-01',
    periodoHasta: '2026-08-31',
    ventasUsd: redondear(ventasAgosto),
    comisionUsd: p.comisionUsd,
    canonUsd: p.canonUsd,
    ajustesUsd: 0,
    netoUsd: p.totalUsd,
    estado: 'calculada',
    historial: [
      { en: '2026-08-12T06:00:00.000Z', de: null, a: 'calculada', porUsuarioId: 'sistema', porRol: 'inparques.finanzas' },
    ],
  });
}

function valoracionesYDisputas(e: DemoState): void {
  e.valoraciones.push({
    id: 'vl_1',
    ordenId: 'or_1001',
    negocioId: 'ng_cedros',
    estrellas: 5,
    comentario: 'El pedido estaba listo cuando llegué al mostrador.',
    creadaEn: '2026-08-11T14:00:00.000Z',
  });
  e.disputas.push({
    id: 'ds_1',
    ordenId: 'or_0990',
    clienteId: undefined,
    motivo: 'Producto no disponible al retirar',
    descripcion: 'El local informó que no había tequeños después de confirmar el pago.',
    estado: 'en_analisis',
    slaHoras: 48,
    creadaEn: '2026-07-30T17:00:00.000Z',
    agenteId: 'us_soporte',
  });
  e.reembolsos.push({
    id: 'rb_1',
    ordenId: 'or_0990',
    pagoId: 'pg_or_0990',
    montoUsd: e.ordenes.find((o) => o.id === 'or_0990')!.totalUsd,
    motivo: 'Producto no disponible tras confirmar el pago.',
    evidencia: 'captura-chat-soporte.png',
    solicitadoPor: 'us_soporte',
    aprobadoPor: 'us_finanzas',
    estado: 'ejecutado',
    creadoEn: '2026-07-30T17:30:00.000Z',
  });
}

function notificacionesIniciales(e: DemoState): void {
  e.notificaciones.push(
    {
      id: 'nt_1',
      destinatarioRol: 'comercio.operador',
      ambitoId: 'lc_cedros_jc',
      titulo: 'Pedido PE-1002 en espera',
      cuerpo: 'Un pedido de 3 cachitos espera aceptación.',
      tipo: 'orden',
      leida: false,
      creadaEn: '2026-08-12T12:05:00.000Z',
    },
    {
      id: 'nt_2',
      destinatarioRol: 'inparques.direccion_comercial',
      titulo: 'Permiso PTE-2026-0112 por vencer',
      cuerpo: 'El permiso temporal de Café Los Cedros - Entrada Norte vence el 31 de agosto de 2026.',
      tipo: 'permiso',
      leida: false,
      creadaEn: '2026-08-10T07:00:00.000Z',
    },
    {
      id: 'nt_3',
      destinatarioRol: 'inparques.admin_parque',
      ambitoId: 'pq_este',
      titulo: 'Expediente de Artesanía Manantial en revisión',
      cuerpo: 'Un documento fue observado y espera corrección del comercio.',
      tipo: 'documento',
      leida: false,
      creadaEn: '2026-07-28T16:35:00.000Z',
    },
    {
      id: 'nt_4',
      destinatarioRol: 'inparques.soporte',
      titulo: 'Disputa DS-1 dentro del SLA',
      cuerpo: 'Quedan 12 horas para responder la disputa de la orden PE-0990.',
      tipo: 'disputa',
      leida: false,
      creadaEn: '2026-07-31T09:00:00.000Z',
    },
    {
      id: 'nt_5',
      destinatarioRol: 'visitante.cliente',
      destinatarioId: 'us_visitante',
      titulo: 'Tu reserva de las 09:00 está confirmada',
      cuerpo: 'Presenta el código RE1004 en el Embarcadero del Lago.',
      tipo: 'orden',
      leida: false,
      creadaEn: '2026-08-12T09:31:00.000Z',
    },
  );
}

/** Totales de referencia usados por las pruebas para detectar regresiones. */
export function resumenSeed(e: DemoState) {
  return {
    ordenes: e.ordenes.length,
    ventasMostrador: e.ordenes.filter((o) => o.canal === 'mostrador').length,
    pagosConfirmados: e.pagos.filter((p) => p.estado === 'confirmado').length,
    facturasEmitidas: e.facturas.filter((f) => f.estado === 'emitida').length,
    liquidacionesCerradas: e.liquidaciones.filter((l) => l.estado === 'cerrada').length,
    totalVesOrden1001: usdAVes(e.ordenes.find((o) => o.id === 'or_1001')!.totalUsd, TASA_AGOSTO),
  };
}
