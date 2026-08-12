/**
 * Adaptadores de integracion.
 *
 * Cada integracion externa se declara como una interfaz y se implementa hoy
 * con un simulador local. La demo no llama a ningun servicio remoto, no pide
 * claves y no requiere contratar nada.
 *
 * El objetivo del documento (seccion 09) es que manana un proveedor real
 * sustituya la implementacion sin tocar el resto del sistema: mismo contrato,
 * distinta clase.
 */

export const MODO_DEMOSTRACION = true;

export interface Adaptador {
  /** Identificador que queda grabado en cada registro que produce. */
  readonly id: string;
  readonly descripcion: string;
  readonly simulado: boolean;
}

// --- Banca -----------------------------------------------------------------

export interface IntencionPago {
  ordenId: string;
  montoVes: number;
  metodo: 'pago_movil' | 'transferencia' | 'tarjeta' | 'efectivo';
  referencia?: string;
  bancoEmisor?: string;
  telefono?: string;
  cedula?: string;
  /** Impide cobros duplicados al reintentar la misma operacion. */
  claveIdempotencia: string;
}

export type ResultadoPago =
  | { estado: 'pendiente_verificacion'; referencia: string; adaptador: string }
  | { estado: 'confirmado'; referencia: string; confirmadoEn: string; adaptador: string }
  | { estado: 'fallido'; motivo: string; adaptador: string };

export interface AdaptadorBanco extends Adaptador {
  crearIntencion(i: IntencionPago): Promise<ResultadoPago>;
  verificar(referencia: string): Promise<ResultadoPago>;
  revertir(referencia: string, motivo: string): Promise<{ ok: boolean; adaptador: string }>;
}

// --- Facturacion -----------------------------------------------------------

export interface SolicitudFactura {
  ordenId: string;
  emisorRif: string;
  emisorRazonSocial: string;
  baseImponibleUsd: number;
  ivaUsd: number;
  totalUsd: number;
  totalVes: number;
  tasaBcv: number;
}

export interface ResultadoFactura {
  numero: string;
  numeroControl: string;
  emitidaEn: string;
  adaptador: string;
}

export interface AdaptadorFiscal extends Adaptador {
  emitir(s: SolicitudFactura): Promise<ResultadoFactura>;
  notaDeCredito(facturaId: string, motivo: string): Promise<ResultadoFactura>;
}

// --- Mensajeria ------------------------------------------------------------

export interface Mensaje {
  canal: 'push' | 'sms' | 'correo' | 'whatsapp';
  destino: string;
  asunto?: string;
  cuerpo: string;
}

export interface AdaptadorMensajeria extends Adaptador {
  /** No envia nada: registra el mensaje para poder mostrarlo en la demo. */
  enviar(m: Mensaje): Promise<{ ok: true; registradoEn: string; adaptador: string }>;
  bandeja(): Mensaje[];
}

// --- Tasa BCV --------------------------------------------------------------

export interface AdaptadorTasa extends Adaptador {
  obtener(): Promise<{ valor: number; fecha: string; fuente: string }>;
}

// --- Identidad / MFA -------------------------------------------------------

export interface AdaptadorMfa extends Adaptador {
  emitirCodigo(usuarioId: string): Promise<{ pista: string }>;
  verificar(usuarioId: string, codigo: string): Promise<boolean>;
}

// --- Almacenamiento de evidencias -----------------------------------------

export interface AdaptadorArchivos extends Adaptador {
  guardar(nombre: string, contenido: Blob | string): Promise<{ id: string; nombre: string; url: string }>;
}

export interface Adaptadores {
  banco: AdaptadorBanco;
  fiscal: AdaptadorFiscal;
  mensajeria: AdaptadorMensajeria;
  tasa: AdaptadorTasa;
  mfa: AdaptadorMfa;
  archivos: AdaptadorArchivos;
}
