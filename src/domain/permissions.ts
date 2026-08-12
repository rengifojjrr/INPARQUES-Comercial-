/**
 * Permisos por ambito, no una aplicacion distinta por cargo.
 *
 * Documento, seccion 05: "Conviene usar permisos configurables por ambito, no
 * crear una aplicacion diferente para cada cargo."
 *
 * Un permiso es una cadena "modulo:accion". El router y la interfaz consultan
 * `puede()`; ninguna pantalla decide por su cuenta si un boton se muestra.
 */

import type { RoleId } from './types';
import { ROLES } from './roles';

export type Permiso =
  // Registro institucional y expedientes
  | 'expediente:ver' | 'expediente:editar' | 'expediente:revisar' | 'expediente:aprobar'
  | 'documento:cargar' | 'documento:revisar'
  | 'permiso:ver' | 'permiso:emitir' | 'permiso:suspender'
  | 'contrato:ver' | 'contrato:editar'
  // Territorio
  | 'territorio:ver' | 'territorio:editar' | 'punto:asignar'
  // Catalogo
  | 'catalogo:ver' | 'catalogo:editar' | 'catalogo:disponibilidad' | 'catalogo:precio'
  // Operacion
  | 'orden:ver' | 'orden:aceptar' | 'orden:preparar' | 'orden:entregar' | 'orden:cancelar'
  | 'reserva:ver' | 'reserva:validar'
  | 'caja:ver' | 'caja:vender' | 'caja:abrir' | 'caja:cerrar'
  // Finanzas
  | 'finanzas:ver' | 'finanzas:conciliar' | 'finanzas:liquidar' | 'finanzas:ajustar'
  | 'factura:ver' | 'factura:emitir' | 'factura:nota'
  | 'reembolso:solicitar' | 'reembolso:aprobar'
  | 'bancario:ver' | 'bancario:editar'
  | 'reporte:ver' | 'reporte:exportar'
  // Control
  | 'inspeccion:ver' | 'inspeccion:registrar'
  | 'incidencia:ver' | 'incidencia:registrar'
  | 'disputa:ver' | 'disputa:atender' | 'disputa:resolver'
  | 'auditoria:ver'
  // Administracion
  | 'usuario:ver' | 'usuario:invitar' | 'usuario:rol' | 'sesion:ver' | 'sesion:revocar'
  | 'reglas:ver' | 'reglas:editar' | 'integracion:ver'
  // Visitante
  | 'tienda:navegar' | 'carrito:usar' | 'pedido:crear' | 'pedido:seguir'
  | 'historial:propio' | 'valoracion:crear' | 'reclamo:crear';

const V: Permiso[] = [
  'tienda:navegar', 'carrito:usar', 'pedido:crear', 'pedido:seguir',
  'historial:propio', 'valoracion:crear', 'reclamo:crear', 'factura:ver',
];

const OPERADOR: Permiso[] = [
  'catalogo:ver', 'catalogo:disponibilidad',
  'orden:ver', 'orden:aceptar', 'orden:preparar', 'orden:entregar',
  'reserva:ver', 'reserva:validar',
  'caja:ver', 'caja:vender', 'caja:abrir',
];

const ADMIN_LOCAL: Permiso[] = [
  ...OPERADOR,
  'catalogo:editar', 'catalogo:precio',
  'orden:cancelar', 'caja:cerrar',
  'expediente:ver', 'permiso:ver',
  'reporte:ver', 'usuario:ver',
  'reembolso:solicitar',
];

const CONTADOR: Permiso[] = [
  'catalogo:ver', 'orden:ver', 'caja:ver',
  'finanzas:ver', 'finanzas:ajustar',
  'factura:ver', 'factura:emitir', 'factura:nota',
  'reporte:ver', 'reporte:exportar',
  'bancario:ver', 'contrato:ver', 'expediente:ver',
];

const PROPIETARIO: Permiso[] = [
  ...ADMIN_LOCAL, ...CONTADOR,
  'expediente:editar', 'documento:cargar',
  'contrato:ver', 'bancario:ver', 'bancario:editar',
  'usuario:invitar', 'usuario:rol', 'sesion:ver',
];

const INSPECTOR: Permiso[] = [
  'territorio:ver', 'permiso:ver', 'expediente:ver',
  'inspeccion:ver', 'inspeccion:registrar',
  'incidencia:ver', 'incidencia:registrar',
  'catalogo:ver',
];

const ADMIN_PARQUE: Permiso[] = [
  'territorio:ver', 'territorio:editar', 'punto:asignar',
  'expediente:ver', 'expediente:revisar',
  'permiso:ver', 'documento:revisar',
  'orden:ver', 'catalogo:ver',
  'inspeccion:ver', 'incidencia:ver', 'incidencia:registrar',
  'reporte:ver', 'usuario:ver',
];

const SOPORTE: Permiso[] = [
  'orden:ver', 'pedido:seguir',
  'disputa:ver', 'disputa:atender', 'disputa:resolver',
  'reembolso:solicitar',
  'incidencia:ver', 'factura:ver',
];

const FINANZAS: Permiso[] = [
  'finanzas:ver', 'finanzas:conciliar', 'finanzas:liquidar', 'finanzas:ajustar',
  'factura:ver', 'factura:nota',
  'reembolso:aprobar',
  'reporte:ver', 'reporte:exportar',
  'bancario:ver', 'contrato:ver', 'expediente:ver',
  'orden:ver', 'caja:ver', 'auditoria:ver', 'territorio:ver',
];

const DIRECCION: Permiso[] = [
  'territorio:ver', 'territorio:editar', 'punto:asignar',
  'expediente:ver', 'expediente:revisar', 'expediente:aprobar',
  'documento:revisar',
  'permiso:ver', 'permiso:emitir', 'permiso:suspender',
  'contrato:ver', 'contrato:editar',
  'reporte:ver', 'reporte:exportar', 'auditoria:ver',
  'usuario:ver', 'usuario:invitar',
  'orden:ver', 'catalogo:ver', 'inspeccion:ver',
];

const SUPERADMIN: Permiso[] = [
  ...DIRECCION, ...FINANZAS, ...SOPORTE, ...INSPECTOR,
  'usuario:rol', 'sesion:ver', 'sesion:revocar',
  'reglas:ver', 'reglas:editar', 'integracion:ver',
  'bancario:editar',
];

export const PERMISOS_POR_ROL: Record<RoleId, Permiso[]> = {
  'visitante.cliente': unicos(V),
  'comercio.operador': unicos(OPERADOR),
  'comercio.admin_local': unicos(ADMIN_LOCAL),
  'comercio.contador': unicos(CONTADOR),
  'comercio.propietario': unicos(PROPIETARIO),
  'inparques.inspector': unicos(INSPECTOR),
  'inparques.admin_parque': unicos(ADMIN_PARQUE),
  'inparques.soporte': unicos(SOPORTE),
  'inparques.finanzas': unicos(FINANZAS),
  'inparques.direccion_comercial': unicos(DIRECCION),
  'inparques.superadmin': unicos(SUPERADMIN),
};

function unicos(p: Permiso[]): Permiso[] {
  return [...new Set(p)];
}

export function puede(rol: RoleId, permiso: Permiso): boolean {
  return PERMISOS_POR_ROL[rol]?.includes(permiso) ?? false;
}

export function puedeAlguno(rol: RoleId, permisos: Permiso[]): boolean {
  return permisos.some((p) => puede(rol, p));
}

/**
 * Regla dura: los roles marcados sin acceso bancario no reciben el dato ni
 * enmascarado. Se comprueba aqui y no en cada pantalla.
 */
export function puedeVerBancario(rol: RoleId): boolean {
  return ROLES[rol].puedeVerDatosBancarios && puede(rol, 'bancario:ver');
}
