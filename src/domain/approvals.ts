/**
 * Segunda firma de verdad.
 *
 * Antes la interfaz mandaba a `validarAccion` una firma escrita en el codigo
 * —`us_direccion`, `us_superadmin`— y la comprobacion pasaba sin que nadie
 * hubiera aprobado nada. El control de cuatro ojos existia en el formulario
 * (motivo, evidencia, MFA) y no en la realidad.
 *
 * La correccion no es cambiar la validacion, es cambiar el momento: una
 * accion que exige doble aprobacion no puede completarse en el clic de quien
 * la pide. Queda como solicitud pendiente y espera a que **otra persona** con
 * rol aprobador la firme. Solo entonces se ejecuta.
 *
 * Aqui vive el catalogo de que hace cada solicitud al aprobarse. La ejecucion
 * concreta la aporta `ui/operaciones.ts`, que es quien sabe escribir; este
 * modulo solo decide si se puede y quien puede.
 */

import type { DemoState, RoleId, SolicitudAprobacion, User } from './types';

/** Quien puede firmar una solicitud: rol habilitado y persona distinta. */
export function puedeFirmar(solicitud: SolicitudAprobacion, usuario: User | null): boolean {
  if (!usuario) return false;
  if (solicitud.estado !== 'pendiente') return false;
  if (solicitud.solicitadaPor === usuario.id) return false;
  return solicitud.aprobadores.includes(usuario.rol);
}

/** Motivo por el que no se puede firmar, para poder decirlo en pantalla. */
export function porQueNoPuedeFirmar(solicitud: SolicitudAprobacion, usuario: User | null): string | null {
  if (!usuario) return 'Necesita iniciar sesión.';
  if (solicitud.estado !== 'pendiente') return 'Esta solicitud ya está resuelta.';
  if (solicitud.solicitadaPor === usuario.id) return 'Nadie puede firmar su propia solicitud.';
  if (!solicitud.aprobadores.includes(usuario.rol)) return 'Su rol no está habilitado para firmar esta acción.';
  return null;
}

/** Solicitudes que este usuario podria firmar ahora mismo. */
export function pendientesPara(estado: DemoState, usuario: User | null): SolicitudAprobacion[] {
  if (!usuario) return [];
  return estado.aprobaciones.filter((s) => puedeFirmar(s, usuario));
}

/** Solicitudes que este usuario pidio y siguen esperando firma. */
export function misSolicitudes(estado: DemoState, usuario: User | null): SolicitudAprobacion[] {
  if (!usuario) return [];
  return estado.aprobaciones.filter((s) => s.solicitadaPor === usuario.id);
}

/** Etiqueta legible de cada accion, para la bandeja de aprobaciones. */
export const NOMBRE_ACCION: Record<string, string> = {
  'bancario.cambiar_cuenta': 'Cambio de cuenta bancaria',
  'negocio.suspender': 'Suspensión de negocio',
  'liquidacion.cerrar': 'Cierre de liquidación',
  'reembolso.aprobar': 'Aprobación de reembolso',
  'finanzas.ajuste': 'Ajuste financiero',
  'usuario.cambiar_rol': 'Cambio de permisos de usuario',
  'reglas.editar': 'Cambio de reglas globales',
  'caja.cierre_excepcional': 'Cierre excepcional de caja',
};

/** Roles que ve la bandeja de aprobaciones, para el registro de rutas. */
export const ROLES_APROBADORES: RoleId[] = [
  'inparques.superadmin',
  'inparques.direccion_comercial',
  'inparques.finanzas',
  'comercio.propietario',
  'comercio.admin_local',
];
