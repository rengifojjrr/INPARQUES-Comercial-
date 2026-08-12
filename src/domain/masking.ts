/**
 * Enmascarado de datos sensibles.
 *
 * Dos niveles, no uno:
 *  - Roles autorizados reciben el dato enmascarado (ultimos 4 digitos).
 *  - Roles no autorizados (Inspector, Soporte, Operador, Administrador de
 *    parque) no reciben el campo en absoluto: `proyectarCuenta` lo elimina
 *    del objeto en lugar de sustituirlo por asteriscos.
 *
 * El segundo nivel importa: un campo presente aunque enmascarado sigue
 * confirmando que el negocio tiene cuenta en tal banco.
 */

import type { CuentaBancaria, RoleId } from './types';
import { puedeVerBancario } from './permissions';

export function enmascararCuenta(numero: string): string {
  const limpio = numero.replace(/\D/g, '');
  if (limpio.length <= 4) return '••••';
  return `•••• •••• •••• ${limpio.slice(-4)}`;
}

export function enmascararRif(rif: string): string {
  const m = rif.match(/^([A-Za-z])-?(\d+)-?(\d)$/);
  if (!m) return rif;
  return `${m[1]}-${m[2].slice(0, 2)}•••••-${m[3]}`;
}

export function enmascararCorreo(correo: string): string {
  const [u, d] = correo.split('@');
  if (!d) return correo;
  const visible = u.slice(0, 2);
  return `${visible}${'•'.repeat(Math.max(3, u.length - 2))}@${d}`;
}

export function enmascararTelefono(tel: string): string {
  const limpio = tel.replace(/\D/g, '');
  if (limpio.length < 4) return '••••';
  return `${'•'.repeat(limpio.length - 4)}${limpio.slice(-4)}`;
}

/** Cuenta bancaria tal como puede exponerse a un rol dado. */
export type CuentaProyectada =
  | { visible: true; id: string; negocioId: string; banco: string; titular: string; numeroEnmascarado: string; tipo: string; verificada: boolean }
  | { visible: false };

export function proyectarCuenta(cuenta: CuentaBancaria, rol: RoleId): CuentaProyectada {
  if (!puedeVerBancario(rol)) return { visible: false };
  return {
    visible: true,
    id: cuenta.id,
    negocioId: cuenta.negocioId,
    banco: cuenta.banco,
    titular: cuenta.titular,
    numeroEnmascarado: enmascararCuenta(cuenta.numero),
    tipo: cuenta.tipo,
    verificada: cuenta.verificada,
  };
}

export function proyectarCuentas(cuentas: CuentaBancaria[], rol: RoleId): CuentaProyectada[] {
  if (!puedeVerBancario(rol)) return [];
  return cuentas.map((c) => proyectarCuenta(c, rol));
}
