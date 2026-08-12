/**
 * Cuatro maquinas de estado independientes.
 *
 * Documento, seccion 04: "Estados que nunca deben confundirse".
 * Orden, pago, factura y liquidacion avanzan por separado. Una orden entregada
 * puede tener un pago pendiente de verificacion; una factura emitida no
 * implica una liquidacion conciliada.
 */

import type {
  EstadoFactura,
  EstadoLiquidacion,
  EstadoOrden,
  EstadoPago,
} from './types';

export class TransicionInvalida extends Error {
  constructor(
    public readonly proceso: string,
    public readonly desde: string,
    public readonly hacia: string,
  ) {
    super(`Transicion invalida en ${proceso}: ${desde} -> ${hacia}`);
    this.name = 'TransicionInvalida';
  }
}

// --- Orden -----------------------------------------------------------------

export const TRANSICIONES_ORDEN: Record<EstadoOrden, EstadoOrden[]> = {
  creada: ['pendiente_aceptacion', 'cancelada'],
  pendiente_aceptacion: ['aceptada', 'cancelada'],
  aceptada: ['preparando', 'cancelada'],
  preparando: ['lista', 'cancelada'],
  lista: ['entregada', 'cancelada'],
  entregada: [],
  cancelada: [],
};

// --- Pago ------------------------------------------------------------------

export const TRANSICIONES_PAGO: Record<EstadoPago, EstadoPago[]> = {
  iniciado: ['pendiente_verificacion', 'fallido'],
  pendiente_verificacion: ['confirmado', 'fallido'],
  confirmado: ['revertido', 'reembolsado'],
  fallido: ['iniciado'],
  revertido: [],
  reembolsado: [],
};

// --- Factura ---------------------------------------------------------------

export const TRANSICIONES_FACTURA: Record<EstadoFactura, EstadoFactura[]> = {
  pendiente: ['emitida', 'anulada'],
  // Una factura emitida no se edita ni se borra: se corrige con nota.
  emitida: ['nota_credito', 'nota_debito'],
  nota_credito: [],
  nota_debito: [],
  anulada: [],
};

// --- Liquidacion -----------------------------------------------------------

export const TRANSICIONES_LIQUIDACION: Record<EstadoLiquidacion, EstadoLiquidacion[]> = {
  calculada: ['por_cobrar', 'por_pagar'],
  por_cobrar: ['conciliada'],
  por_pagar: ['conciliada'],
  conciliada: ['cerrada'],
  // Estado terminal: se corrige con un ajuste, nunca editando el cierre.
  cerrada: [],
};

// --- API comun -------------------------------------------------------------

type Mapa<T extends string> = Record<T, T[]>;

function comprobar<T extends string>(mapa: Mapa<T>, proceso: string, desde: T, hacia: T): void {
  if (!(mapa[desde] ?? []).includes(hacia)) {
    throw new TransicionInvalida(proceso, desde, hacia);
  }
}

export const ordenPuedeIr = (d: EstadoOrden, h: EstadoOrden) => TRANSICIONES_ORDEN[d].includes(h);
export const pagoPuedeIr = (d: EstadoPago, h: EstadoPago) => TRANSICIONES_PAGO[d].includes(h);
export const facturaPuedeIr = (d: EstadoFactura, h: EstadoFactura) => TRANSICIONES_FACTURA[d].includes(h);
export const liquidacionPuedeIr = (d: EstadoLiquidacion, h: EstadoLiquidacion) =>
  TRANSICIONES_LIQUIDACION[d].includes(h);

export const exigirOrden = (d: EstadoOrden, h: EstadoOrden) => comprobar(TRANSICIONES_ORDEN, 'orden', d, h);
export const exigirPago = (d: EstadoPago, h: EstadoPago) => comprobar(TRANSICIONES_PAGO, 'pago', d, h);
export const exigirFactura = (d: EstadoFactura, h: EstadoFactura) =>
  comprobar(TRANSICIONES_FACTURA, 'factura', d, h);
export const exigirLiquidacion = (d: EstadoLiquidacion, h: EstadoLiquidacion) =>
  comprobar(TRANSICIONES_LIQUIDACION, 'liquidacion', d, h);

/** Estados terminales: nada mas puede ocurrir sobre el registro. */
export function esTerminal(mapa: Record<string, string[]>, estado: string): boolean {
  return (mapa[estado] ?? []).length === 0;
}

// --- Etiquetas en espanol, sin ambiguedad ----------------------------------

export const ETIQUETA_ORDEN: Record<EstadoOrden, string> = {
  creada: 'Creada',
  pendiente_aceptacion: 'Pendiente de aceptacion',
  aceptada: 'Aceptada',
  preparando: 'Preparando',
  lista: 'Lista para retirar',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
};

export const ETIQUETA_PAGO: Record<EstadoPago, string> = {
  iniciado: 'Pago iniciado',
  pendiente_verificacion: 'Pago pendiente de verificacion',
  confirmado: 'Pago confirmado',
  fallido: 'Pago fallido',
  revertido: 'Pago revertido',
  reembolsado: 'Pago reembolsado',
};

export const ETIQUETA_FACTURA: Record<EstadoFactura, string> = {
  pendiente: 'Factura pendiente',
  emitida: 'Factura emitida',
  nota_credito: 'Nota de credito',
  nota_debito: 'Nota de debito',
  anulada: 'Factura anulada',
};

export const ETIQUETA_LIQUIDACION: Record<EstadoLiquidacion, string> = {
  calculada: 'Liquidacion calculada',
  por_cobrar: 'Por cobrar',
  por_pagar: 'Por pagar',
  conciliada: 'Conciliada',
  cerrada: 'Cerrada',
};

/**
 * El color no puede ser el unico indicador de estado: cada estado lleva
 * ademas un tono semantico y un simbolo textual que las vistas reutilizan.
 */
export type Tono = 'neutro' | 'progreso' | 'exito' | 'alerta' | 'error';

export const TONO_ORDEN: Record<EstadoOrden, Tono> = {
  creada: 'neutro',
  pendiente_aceptacion: 'alerta',
  aceptada: 'progreso',
  preparando: 'progreso',
  lista: 'exito',
  entregada: 'exito',
  cancelada: 'error',
};

export const TONO_PAGO: Record<EstadoPago, Tono> = {
  iniciado: 'neutro',
  pendiente_verificacion: 'alerta',
  confirmado: 'exito',
  fallido: 'error',
  revertido: 'error',
  reembolsado: 'alerta',
};
