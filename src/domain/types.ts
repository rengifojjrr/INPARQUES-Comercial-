/**
 * Modelo de dominio de INPARQUES Comercial.
 *
 * Fuente funcional: documento de investigacion, seccion 10 "Datos y tableros".
 * Los grupos de entidades siguen esa tabla: Territorio, Comercial, Identidad,
 * Oferta, Transaccion, Finanzas y Control.
 *
 * Regla estructural del documento (seccion 02): la jerarquia minima es
 * Nacional -> region/estado -> parque -> zona -> punto comercial ->
 * negocio legal -> local/catalogo.
 */

export type ID = string;
export type ISODateTime = string;

// ---------------------------------------------------------------------------
// Identidad y ambito
// ---------------------------------------------------------------------------

/** Los once roles base definidos en la seccion 05 del documento. */
export type RoleId =
  // Ambito INPARQUES
  | 'inparques.superadmin'
  | 'inparques.direccion_comercial'
  | 'inparques.finanzas'
  | 'inparques.admin_parque'
  | 'inparques.inspector'
  | 'inparques.soporte'
  // Ambito Comercio
  | 'comercio.propietario'
  | 'comercio.admin_local'
  | 'comercio.operador'
  | 'comercio.contador'
  // Ambito Visitante
  | 'visitante.cliente';

/** Las tres superficies minimas (seccion 04 del documento). */
export type Surface = 'visitante' | 'comercio' | 'inparques';

/** Nivel de la jerarquia sobre el que un rol tiene alcance. */
export type ScopeLevel =
  | 'nacional'
  | 'region'
  | 'parque'
  | 'zona'
  | 'punto'
  | 'negocio'
  | 'local'
  | 'propio';

export interface Scope {
  level: ScopeLevel;
  /** Identificadores concretos del nivel. Vacio en 'nacional' = todo. */
  ids: ID[];
}

export interface User {
  id: ID;
  nombre: string;
  correo: string;
  telefono?: string;
  rol: RoleId;
  scope: Scope;
  /** Las cuentas institucionales y de comercio nacen por invitacion. */
  origen: 'invitacion' | 'registro_publico';
  estado: 'invitado' | 'activo' | 'suspendido';
  mfaHabilitado: boolean;
  creadoEn: ISODateTime;
  ultimoAcceso?: ISODateTime;
}

export interface Sesion {
  id: ID;
  usuarioId: ID;
  dispositivo: string;
  iniciadaEn: ISODateTime;
  ultimaActividad: ISODateTime;
  vigente: boolean;
  /** true cuando la sesion aun no supero el segundo factor. */
  mfaPendiente: boolean;
}

export interface Invitacion {
  id: ID;
  correo: string;
  rol: RoleId;
  scope: Scope;
  emitidaPor: ID;
  emitidaEn: ISODateTime;
  expiraEn: ISODateTime;
  /** Codigo de activacion simulado; nunca se envia por un canal real. */
  codigo: string;
  estado: 'pendiente' | 'aceptada' | 'expirada' | 'revocada';
}

// ---------------------------------------------------------------------------
// Territorio
// ---------------------------------------------------------------------------

export interface Region {
  id: ID;
  nombre: string;
}

export interface Parque {
  id: ID;
  regionId: ID;
  nombre: string;
  tipo: 'nacional' | 'monumento' | 'recreacion';
  piloto: boolean;
  horario: string;
  activo: boolean;
}

export interface Zona {
  id: ID;
  parqueId: ID;
  nombre: string;
  /** Coordenadas del esquema interno del parque, en porcentaje del lienzo. */
  mapa: { x: number; y: number };
}

export interface PuntoComercial {
  id: ID;
  zonaId: ID;
  parqueId: ID;
  codigo: string;
  nombre: string;
  mapa: { x: number; y: number };
  estado: 'libre' | 'ocupado' | 'inhabilitado';
  /** QR institucional del punto. */
  qr: string;
}

// ---------------------------------------------------------------------------
// Comercial: negocio legal, expediente, permisos, contratos
// ---------------------------------------------------------------------------

export type CategoriaNegocio =
  | 'comida'
  | 'bebidas'
  | 'juguetes'
  | 'artesania'
  | 'recuerdos'
  | 'alquileres'
  | 'atracciones'
  | 'paseos';

export interface Negocio {
  id: ID;
  nombreComercial: string;
  razonSocial: string;
  rif: string;
  categoria: CategoriaNegocio;
  responsableId: ID;
  estado: 'borrador' | 'en_revision' | 'aprobado' | 'activo' | 'suspendido' | 'rechazado';
  creadoEn: ISODateTime;
}

export interface Local {
  id: ID;
  negocioId: ID;
  puntoId: ID;
  parqueId: ID;
  nombre: string;
  /** Modalidades habilitadas por local; no hay delivery en la beta. */
  cumplimiento: { retiroInmediato: boolean; retiroProgramado: boolean; mesa: boolean };
  horarios: HorarioSemana;
  abierto: boolean;
}

export interface HorarioSemana {
  /** 0 = domingo. Cada dia puede tener varias franjas. */
  [dia: number]: Array<{ desde: string; hasta: string }>;
}

export type TipoDocumento =
  | 'rif'
  | 'cedula_responsable'
  | 'registro_mercantil'
  | 'permiso_sanitario'
  | 'poliza'
  | 'solvencia'
  | 'certificado_manipulacion';

export interface DocumentoExpediente {
  id: ID;
  negocioId: ID;
  tipo: TipoDocumento;
  nombreArchivo: string;
  cargadoEn: ISODateTime;
  vigenciaHasta?: string;
  estado: 'pendiente' | 'en_revision' | 'aprobado' | 'observado' | 'vencido';
  observacion?: string;
  revisadoPor?: ID;
}

export interface Permiso {
  id: ID;
  negocioId: ID;
  puntoId: ID;
  tipo: 'concesion' | 'permiso_temporal' | 'autorizacion_evento';
  numero: string;
  desde: string;
  hasta: string;
  estado: 'vigente' | 'por_vencer' | 'vencido' | 'suspendido';
}

/**
 * Condiciones economicas configurables (seccion 08 del documento:
 * "Reglas que deben ser configurables").
 */
export interface Contrato {
  id: ID;
  negocioId: ID;
  permisoId: ID;
  desde: string;
  hasta: string;
  canonFijoUsd: number;
  porcentajeSobreVenta: number;
  minimoGarantizadoUsd: number;
  estado: 'borrador' | 'vigente' | 'vencido' | 'resuelto';
}

/**
 * Datos bancarios del negocio. El numero de cuenta se guarda completo en el
 * almacen pero solo se expone enmascarado; los roles Inspector, Soporte,
 * Operador y Administrador de parque no lo reciben en ningun formato.
 */
export interface CuentaBancaria {
  id: ID;
  negocioId: ID;
  banco: string;
  titular: string;
  numero: string;
  tipo: 'corriente' | 'ahorro';
  verificada: boolean;
  actualizadaEn: ISODateTime;
}

// ---------------------------------------------------------------------------
// Oferta
// ---------------------------------------------------------------------------

export interface Articulo {
  id: ID;
  localId: ID;
  negocioId: ID;
  tipo: 'producto' | 'comida' | 'servicio';
  nombre: string;
  descripcion: string;
  categoria: string;
  precioUsd: number;
  disponible: boolean;
  /** Solo productos: control basico de inventario. */
  stock?: number;
  /** Solo servicios: cupo por franja y duracion en minutos. */
  cupoPorFranja?: number;
  duracionMin?: number;
  alergenos: string[];
  variantes: Variante[];
  modificadores: Modificador[];
  tiempoPrepMin: number;
}

export interface Variante {
  id: ID;
  nombre: string;
  opciones: Array<{ id: ID; nombre: string; deltaUsd: number; disponible: boolean }>;
}

export interface Modificador {
  id: ID;
  nombre: string;
  obligatorio: boolean;
  maxSelecciones: number;
  opciones: Array<{ id: ID; nombre: string; deltaUsd: number; disponible: boolean }>;
}

export interface FranjaServicio {
  id: ID;
  articuloId: ID;
  fecha: string;
  desde: string;
  hasta: string;
  cupoTotal: number;
  cupoTomado: number;
}

// ---------------------------------------------------------------------------
// Transaccion: los cuatro procesos separados
// ---------------------------------------------------------------------------

/** Seccion 04: "Estados que nunca deben confundirse". */
export type EstadoOrden =
  | 'creada'
  | 'pendiente_aceptacion'
  | 'aceptada'
  | 'preparando'
  | 'lista'
  | 'entregada'
  | 'cancelada';

export type EstadoPago =
  | 'iniciado'
  | 'pendiente_verificacion'
  | 'confirmado'
  | 'fallido'
  | 'revertido'
  | 'reembolsado';

export type EstadoFactura = 'pendiente' | 'emitida' | 'nota_credito' | 'nota_debito' | 'anulada';

export type EstadoLiquidacion = 'calculada' | 'por_cobrar' | 'por_pagar' | 'conciliada' | 'cerrada';

export type MetodoCumplimiento = 'retiro_inmediato' | 'retiro_programado' | 'mesa';

export type CanalVenta = 'app' | 'mostrador';

export interface ItemOrden {
  id: ID;
  articuloId: ID;
  nombre: string;
  cantidad: number;
  precioUnitarioUsd: number;
  seleccionVariantes: Array<{ varianteId: ID; opcionId: ID; nombre: string; deltaUsd: number }>;
  seleccionModificadores: Array<{ modificadorId: ID; opcionId: ID; nombre: string; deltaUsd: number }>;
  notas?: string;
}

export interface Orden {
  id: ID;
  codigo: string;
  /** Regla beta: un carrito solo contiene articulos de un comercio. */
  negocioId: ID;
  localId: ID;
  parqueId: ID;
  puntoId: ID;
  clienteId?: ID;
  clienteNombre: string;
  invitado: boolean;
  canal: CanalVenta;
  tipo: 'pedido' | 'reserva';
  cumplimiento: MetodoCumplimiento;
  /** Reservas y retiros programados. */
  programadaPara?: ISODateTime;
  franjaId?: ID;
  items: ItemOrden[];
  estado: EstadoOrden;
  subtotalUsd: number;
  impuestosUsd: number;
  descuentoUsd: number;
  totalUsd: number;
  /** Regla monetaria (seccion 07): la tasa se congela al registrar la venta. */
  tasaBcv: number;
  tasaBcvFecha: ISODateTime;
  totalVes: number;
  codigoRetiro: string;
  operadorId?: ID;
  creadaEn: ISODateTime;
  historial: EventoEstado[];
}

export interface EventoEstado {
  en: ISODateTime;
  de: string | null;
  a: string;
  porUsuarioId: ID;
  porRol: RoleId;
  motivo?: string;
}

export type MetodoPago = 'pago_movil' | 'transferencia' | 'tarjeta' | 'efectivo';

export interface Pago {
  id: ID;
  ordenId: ID;
  metodo: MetodoPago;
  estado: EstadoPago;
  montoVes: number;
  montoUsd: number;
  tasaBcv: number;
  referencia?: string;
  bancoEmisor?: string;
  /** Identificador del adaptador simulado que atendio la operacion. */
  adaptador: string;
  /** Clave de idempotencia: impide cobros duplicados al reintentar. */
  claveIdempotencia: string;
  creadoEn: ISODateTime;
  confirmadoEn?: ISODateTime;
  historial: EventoEstado[];
}

export interface Factura {
  id: ID;
  ordenId: ID;
  negocioId: ID;
  /** El emisor fiscal es el comercio, nunca INPARQUES (seccion 08). */
  emisorRif: string;
  emisorRazonSocial: string;
  numero: string;
  numeroControl: string;
  estado: EstadoFactura;
  baseImponibleUsd: number;
  ivaUsd: number;
  totalUsd: number;
  totalVes: number;
  tasaBcv: number;
  emitidaEn?: ISODateTime;
  notaDe?: ID;
  motivoNota?: string;
  adaptador: string;
}

export interface Reembolso {
  id: ID;
  ordenId: ID;
  pagoId: ID;
  montoUsd: number;
  motivo: string;
  evidencia?: string;
  solicitadoPor: ID;
  aprobadoPor?: ID;
  estado: 'solicitado' | 'aprobado' | 'rechazado' | 'ejecutado';
  creadoEn: ISODateTime;
}

// ---------------------------------------------------------------------------
// Finanzas
// ---------------------------------------------------------------------------

export interface Liquidacion {
  id: ID;
  negocioId: ID;
  periodoDesde: string;
  periodoHasta: string;
  ventasUsd: number;
  comisionUsd: number;
  canonUsd: number;
  ajustesUsd: number;
  netoUsd: number;
  estado: EstadoLiquidacion;
  /** Una liquidacion cerrada no se edita: se corrige con un ajuste. */
  cerradaEn?: ISODateTime;
  historial: EventoEstado[];
}

export interface Ajuste {
  id: ID;
  liquidacionId?: ID;
  cierreId?: ID;
  concepto: string;
  montoUsd: number;
  motivo: string;
  evidencia?: string;
  solicitadoPor: ID;
  aprobadoPor?: ID;
  estado: 'solicitado' | 'aprobado' | 'rechazado';
  creadoEn: ISODateTime;
}

export interface TurnoCaja {
  id: ID;
  localId: ID;
  operadorId: ID;
  abiertoEn: ISODateTime;
  cerradoEn?: ISODateTime;
  fondoInicialVes: number;
  efectivoDeclaradoVes?: number;
  esperadoPorMetodo: Record<MetodoPago, number>;
  diferenciaVes?: number;
  responsableCierreId?: ID;
  aprobadoPorId?: ID;
  /** Un cierre confirmado es inmutable. */
  estado: 'abierto' | 'en_cierre' | 'cerrado';
}

// ---------------------------------------------------------------------------
// Control
// ---------------------------------------------------------------------------

export interface Inspeccion {
  id: ID;
  negocioId: ID;
  localId: ID;
  inspectorId: ID;
  fecha: ISODateTime;
  resultado: 'conforme' | 'observado' | 'no_conforme';
  hallazgos: string[];
  evidencia?: string;
}

export interface Incidencia {
  id: ID;
  parqueId: ID;
  negocioId?: ID;
  reportadaPor: ID;
  tipo: 'seguridad' | 'higiene' | 'permiso' | 'infraestructura' | 'otro';
  descripcion: string;
  estado: 'abierta' | 'en_atencion' | 'resuelta' | 'cerrada';
  creadaEn: ISODateTime;
}

export interface Disputa {
  id: ID;
  ordenId: ID;
  clienteId?: ID;
  motivo: string;
  descripcion: string;
  evidencia?: string;
  estado: 'abierta' | 'en_analisis' | 'resuelta_favor_cliente' | 'resuelta_favor_comercio' | 'cerrada';
  slaHoras: number;
  creadaEn: ISODateTime;
  agenteId?: ID;
}

export interface Valoracion {
  id: ID;
  ordenId: ID;
  negocioId: ID;
  estrellas: number;
  comentario?: string;
  creadaEn: ISODateTime;
  /** Respuesta publica del comercio valorado. */
  respuesta?: string;
  respondidaEn?: ISODateTime;
  /** Moderacion: la valoracion deja de mostrarse, pero no se borra. */
  oculta?: boolean;
  motivoModeracion?: string;
}

/**
 * Solicitud que espera una segunda firma.
 *
 * La doble aprobacion no puede resolverse en el mismo clic de quien actua:
 * antes la interfaz mandaba una firma escrita en el codigo (`us_direccion`,
 * `us_superadmin`) y nadie aprobaba nada. Ahora la accion queda aqui,
 * pendiente, hasta que otra persona con rol aprobador la firme, y solo
 * entonces se ejecuta.
 */
export interface SolicitudAprobacion {
  id: ID;
  /** Accion sensible que se ejecutara al aprobarse. */
  accion: string;
  /** Descripcion legible para quien tiene que decidir. */
  resumen: string;
  /** Datos que necesita la operacion cuando se ejecute. */
  carga: Record<string, unknown>;
  entidad: string;
  entidadId: ID;
  solicitadaPor: ID;
  solicitadaPorNombre: string;
  solicitadaPorRol: RoleId;
  solicitadaEn: ISODateTime;
  motivo: string;
  evidencia?: string;
  mfaVerificado: boolean;
  /** Roles habilitados para firmar. */
  aprobadores: RoleId[];
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  resueltaPor?: ID;
  resueltaPorNombre?: string;
  resueltaEn?: ISODateTime;
  motivoResolucion?: string;
}

/** Bitacora append-only. No existe operacion de borrado ni de edicion. */
export interface EventoAuditoria {
  id: ID;
  en: ISODateTime;
  usuarioId: ID;
  usuarioNombre: string;
  rol: RoleId;
  scope: Scope;
  accion: string;
  entidad: string;
  entidadId: ID;
  antes?: unknown;
  despues?: unknown;
  motivo?: string;
  evidencia?: string;
  mfaVerificado: boolean;
  aprobadoPor?: ID;
}

export interface Notificacion {
  id: ID;
  destinatarioRol: RoleId;
  destinatarioId?: ID;
  ambitoId?: ID;
  titulo: string;
  cuerpo: string;
  tipo: 'orden' | 'pago' | 'documento' | 'permiso' | 'inspeccion' | 'disputa' | 'sistema';
  rutaDestino?: string;
  leida: boolean;
  creadaEn: ISODateTime;
}

// ---------------------------------------------------------------------------
// Tasa BCV
// ---------------------------------------------------------------------------

export interface TasaBcv {
  valor: number;
  fecha: ISODateTime;
  fuente: string;
}

// ---------------------------------------------------------------------------
// Estado completo de la demo
// ---------------------------------------------------------------------------

export interface DemoState {
  version: number;
  regiones: Region[];
  parques: Parque[];
  zonas: Zona[];
  puntos: PuntoComercial[];
  negocios: Negocio[];
  locales: Local[];
  documentos: DocumentoExpediente[];
  permisos: Permiso[];
  contratos: Contrato[];
  cuentasBancarias: CuentaBancaria[];
  usuarios: User[];
  sesiones: Sesion[];
  invitaciones: Invitacion[];
  articulos: Articulo[];
  franjas: FranjaServicio[];
  ordenes: Orden[];
  pagos: Pago[];
  facturas: Factura[];
  reembolsos: Reembolso[];
  liquidaciones: Liquidacion[];
  ajustes: Ajuste[];
  turnos: TurnoCaja[];
  inspecciones: Inspeccion[];
  incidencias: Incidencia[];
  disputas: Disputa[];
  aprobaciones: SolicitudAprobacion[];
  valoraciones: Valoracion[];
  auditoria: EventoAuditoria[];
  notificaciones: Notificacion[];
  tasaBcv: TasaBcv;
}
