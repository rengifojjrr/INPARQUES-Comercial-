/**
 * Regla monetaria del documento (seccion 07):
 * "Guardar siempre moneda de lista, monto en bolivares, tasa BCV utilizada,
 *  fecha/hora, vigencia de la cotizacion y monto efectivamente pagado.
 *  No recalcular una venta historica con una tasa nueva."
 *
 * Por eso `convertir` exige siempre una tasa explicita: no existe una funcion
 * que tome "la tasa actual" de forma implicita.
 */

import type { TasaBcv } from './types';

/**
 * Redondeo a dos decimales, aplicado despues de cada operacion para que el
 * error de coma flotante no se acumule linea a linea.
 *
 * (El comentario anterior decia que se trabajaba en centimos, y no era cierto:
 * se trabaja en unidades con redondeo. Se deja dicho lo que hace el codigo,
 * porque un comentario que miente es peor que ninguno.)
 */
export function redondear(monto: number, decimales = 2): number {
  const f = 10 ** decimales;
  // El signo se separa para que -2.345 y 2.345 redondeen igual de lejos del
  // cero: `Math.round` empata siempre hacia +infinito y trataria distinto a
  // un reembolso que a un cobro del mismo importe.
  const signo = monto < 0 ? -1 : 1;
  return (signo * Math.round(Math.abs(monto) * f + Number.EPSILON)) / f;
}

export function usdAVes(montoUsd: number, tasa: number): number {
  return redondear(montoUsd * tasa, 2);
}

export function vesAUsd(montoVes: number, tasa: number): number {
  return redondear(montoVes / tasa, 2);
}

const fmtUsd = new Intl.NumberFormat('es-VE', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const fmtVes = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatearUsd(monto: number): string {
  return fmtUsd.format(monto).replace('US$', '$');
}

export function formatearVes(monto: number): string {
  return `Bs. ${fmtVes.format(monto)}`;
}

/**
 * Importe claro: USD es referencia de lista, VES es el monto pagadero.
 * Las vistas nunca muestran una cifra sin decir de que moneda es.
 */
export function importeDoble(montoUsd: number, tasa: number): string {
  return `${formatearUsd(montoUsd)} · ${formatearVes(usdAVes(montoUsd, tasa))}`;
}

export function formatearTasa(tasa: TasaBcv): string {
  const f = new Date(tasa.fecha);
  const fecha = f.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = f.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  return `Tasa BCV ${fmtVes.format(tasa.valor)} Bs/USD · ${fecha} ${hora}`;
}

/** Calculo de totales de una orden. El IVA se separa del ingreso siempre. */
export interface TotalesOrden {
  subtotalUsd: number;
  impuestosUsd: number;
  descuentoUsd: number;
  totalUsd: number;
  totalVes: number;
}

export const IVA = 0.16;

export function calcularTotales(
  lineas: Array<{ cantidad: number; precioUnitarioUsd: number; extrasUsd: number }>,
  tasa: number,
  descuentoUsd = 0,
): TotalesOrden {
  const subtotalUsd = redondear(
    lineas.reduce((s, l) => s + l.cantidad * (l.precioUnitarioUsd + l.extrasUsd), 0),
  );
  const base = Math.max(0, redondear(subtotalUsd - descuentoUsd));
  const impuestosUsd = redondear(base * IVA);
  const totalUsd = redondear(base + impuestosUsd);
  return {
    subtotalUsd,
    impuestosUsd,
    descuentoUsd: redondear(descuentoUsd),
    totalUsd,
    totalVes: usdAVes(totalUsd, tasa),
  };
}

/**
 * Participacion de INPARQUES. Las reglas son configurables por contrato
 * (canon fijo, porcentaje, minimo garantizado) y se calculan por separado del
 * ingreso del comercio, como exige la seccion 08.
 */
export function calcularParticipacion(
  ventasUsd: number,
  contrato: { canonFijoUsd: number; porcentajeSobreVenta: number; minimoGarantizadoUsd: number },
): { comisionUsd: number; canonUsd: number; totalUsd: number } {
  const comisionUsd = redondear(ventasUsd * (contrato.porcentajeSobreVenta / 100));
  const canonUsd = redondear(contrato.canonFijoUsd);
  const bruto = redondear(comisionUsd + canonUsd);
  const totalUsd = Math.max(bruto, redondear(contrato.minimoGarantizadoUsd));
  return { comisionUsd, canonUsd, totalUsd };
}
