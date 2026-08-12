/**
 * Catalogo de los once roles base y sus limites.
 *
 * Fuente: documento de investigacion, seccion 05 "Roles y control de acceso".
 * La columna "Limite" del documento se traduce aqui en banderas verificables,
 * no en texto informativo.
 */

import type { RoleId, ScopeLevel, Surface } from './types';

export interface RoleDefinition {
  id: RoleId;
  nombre: string;
  superficie: Surface;
  ambito: string;
  /** Nivel maximo de la jerarquia que el rol puede alcanzar. */
  nivelScope: ScopeLevel;
  limite: string;
  /** El documento exige MFA para personal institucional y propietarios. */
  requiereMfa: boolean;
  /** Las cuentas institucionales y de comercio no se registran en publico. */
  soloPorInvitacion: boolean;
  /** false = el rol nunca recibe el numero de cuenta, ni enmascarado parcial. */
  puedeVerDatosBancarios: boolean;
}

export const ROLES: Record<RoleId, RoleDefinition> = {
  'inparques.superadmin': {
    id: 'inparques.superadmin',
    nombre: 'Superadministrador nacional',
    superficie: 'inparques',
    ambito: 'INPARQUES',
    nivelScope: 'nacional',
    limite: 'No puede borrar transacciones cerradas',
    requiereMfa: true,
    soloPorInvitacion: true,
    puedeVerDatosBancarios: true,
  },
  'inparques.direccion_comercial': {
    id: 'inparques.direccion_comercial',
    nombre: 'Dirección comercial / concesiones',
    superficie: 'inparques',
    ambito: 'INPARQUES',
    nivelScope: 'region',
    limite: 'Nacional o regional',
    requiereMfa: true,
    soloPorInvitacion: true,
    puedeVerDatosBancarios: true,
  },
  'inparques.finanzas': {
    id: 'inparques.finanzas',
    nombre: 'Finanzas / auditoría',
    superficie: 'inparques',
    ambito: 'INPARQUES',
    nivelScope: 'nacional',
    limite: 'Lectura o aprobacion separada',
    requiereMfa: true,
    soloPorInvitacion: true,
    puedeVerDatosBancarios: true,
  },
  'inparques.admin_parque': {
    id: 'inparques.admin_parque',
    nombre: 'Administrador de parque',
    superficie: 'inparques',
    ambito: 'INPARQUES',
    nivelScope: 'parque',
    limite: 'Solo parques asignados',
    requiereMfa: true,
    soloPorInvitacion: true,
    puedeVerDatosBancarios: false,
  },
  'inparques.inspector': {
    id: 'inparques.inspector',
    nombre: 'Inspector / guardaparque',
    superficie: 'inparques',
    ambito: 'INPARQUES',
    nivelScope: 'parque',
    limite: 'Sin datos bancarios completos',
    requiereMfa: true,
    soloPorInvitacion: true,
    puedeVerDatosBancarios: false,
  },
  'inparques.soporte': {
    id: 'inparques.soporte',
    nombre: 'Soporte / disputas',
    superficie: 'inparques',
    ambito: 'INPARQUES',
    nivelScope: 'nacional',
    limite: 'Datos minimos necesarios',
    requiereMfa: true,
    soloPorInvitacion: true,
    puedeVerDatosBancarios: false,
  },
  'comercio.propietario': {
    id: 'comercio.propietario',
    nombre: 'Propietario legal',
    superficie: 'comercio',
    ambito: 'Comercio',
    nivelScope: 'negocio',
    limite: 'Solo su entidad / negocios',
    requiereMfa: true,
    soloPorInvitacion: true,
    puedeVerDatosBancarios: true,
  },
  'comercio.admin_local': {
    id: 'comercio.admin_local',
    nombre: 'Administrador de local',
    superficie: 'comercio',
    ambito: 'Comercio',
    nivelScope: 'local',
    limite: 'Solo locales asignados',
    requiereMfa: false,
    soloPorInvitacion: true,
    puedeVerDatosBancarios: false,
  },
  'comercio.operador': {
    id: 'comercio.operador',
    nombre: 'Operador / cocina / servicio',
    superficie: 'comercio',
    ambito: 'Comercio',
    nivelScope: 'local',
    limite: 'Sin finanzas sensibles',
    requiereMfa: false,
    soloPorInvitacion: true,
    puedeVerDatosBancarios: false,
  },
  'comercio.contador': {
    id: 'comercio.contador',
    nombre: 'Contador',
    superficie: 'comercio',
    ambito: 'Comercio',
    nivelScope: 'negocio',
    limite: 'Lectura / exportacion; ajustes autorizados',
    requiereMfa: false,
    soloPorInvitacion: true,
    puedeVerDatosBancarios: true,
  },
  'visitante.cliente': {
    id: 'visitante.cliente',
    nombre: 'Visitante / cliente',
    superficie: 'visitante',
    ambito: 'Visitante',
    nivelScope: 'propio',
    limite: 'Sus propios datos y ordenes',
    requiereMfa: false,
    soloPorInvitacion: false,
    puedeVerDatosBancarios: false,
  },
};

export const ROLE_IDS = Object.keys(ROLES) as RoleId[];

export function rolesDeSuperficie(s: Surface): RoleDefinition[] {
  return ROLE_IDS.map((r) => ROLES[r]).filter((r) => r.superficie === s);
}

/**
 * Roles que jamas deben recibir datos bancarios, segun el enunciado de
 * control: Inspector, Soporte, Operador y Administrador de parque.
 */
export const ROLES_SIN_DATOS_BANCARIOS: RoleId[] = ROLE_IDS.filter(
  (r) => !ROLES[r].puedeVerDatosBancarios,
);
