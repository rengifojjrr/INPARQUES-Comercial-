/**
 * Compuerta de acciones sensibles.
 *
 * Documento, seccion 05 (Controles obligatorios): "MFA para personal
 * institucional y propietarios; doble aprobacion para cambios bancarios,
 * reembolsos altos y cierres; sesiones registradas; trazabilidad de cada
 * cambio."
 *
 * Ninguna pantalla decide por si misma que exigir. Toda accion sensible se
 * declara aqui y la interfaz consulta `requisitosDe()` para armar el modal.
 */

import type { RoleId } from './types';
import { ROLES } from './roles';

export type AccionSensible =
  | 'bancario.cambiar_cuenta'
  | 'reembolso.aprobar'
  | 'reembolso.solicitar'
  | 'finanzas.ajuste'
  | 'caja.cierre_excepcional'
  | 'caja.cerrar_turno'
  | 'negocio.suspender'
  | 'negocio.reactivar'
  | 'permiso.suspender'
  | 'usuario.cambiar_rol'
  | 'usuario.revocar_sesion'
  | 'factura.nota_credito'
  | 'liquidacion.cerrar'
  | 'orden.cancelar'
  | 'contrato.editar'
  | 'reglas.editar';

export interface Requisitos {
  /** Todas las acciones sensibles piden confirmacion explicita. */
  confirmacion: true;
  motivo: boolean;
  evidencia: boolean;
  mfa: boolean;
  dobleAprobacion: boolean;
  /** Roles habilitados para dar la segunda aprobacion, cuando aplica. */
  aprobadores: RoleId[];
  etiqueta: string;
}

const NINGUNO: RoleId[] = [];
const APROBADORES_FINANZAS: RoleId[] = ['inparques.finanzas', 'inparques.superadmin'];
const APROBADORES_CONCESIONES: RoleId[] = ['inparques.direccion_comercial', 'inparques.superadmin'];
const APROBADORES_COMERCIO: RoleId[] = ['comercio.propietario', 'comercio.admin_local'];

const CATALOGO: Record<AccionSensible, Omit<Requisitos, 'confirmacion'>> = {
  'bancario.cambiar_cuenta': {
    motivo: true, evidencia: true, mfa: true, dobleAprobacion: true,
    aprobadores: APROBADORES_CONCESIONES, etiqueta: 'Cambio de cuenta bancaria',
  },
  'reembolso.aprobar': {
    motivo: true, evidencia: true, mfa: true, dobleAprobacion: false,
    aprobadores: APROBADORES_FINANZAS, etiqueta: 'Aprobacion de reembolso',
  },
  'reembolso.solicitar': {
    motivo: true, evidencia: true, mfa: false, dobleAprobacion: false,
    aprobadores: APROBADORES_FINANZAS, etiqueta: 'Solicitud de reembolso',
  },
  'finanzas.ajuste': {
    motivo: true, evidencia: true, mfa: true, dobleAprobacion: true,
    aprobadores: APROBADORES_FINANZAS, etiqueta: 'Ajuste financiero',
  },
  'caja.cierre_excepcional': {
    motivo: true, evidencia: true, mfa: true, dobleAprobacion: true,
    aprobadores: APROBADORES_COMERCIO, etiqueta: 'Cierre excepcional de caja',
  },
  'caja.cerrar_turno': {
    motivo: true, evidencia: false, mfa: false, dobleAprobacion: false,
    aprobadores: APROBADORES_COMERCIO, etiqueta: 'Cierre de turno de caja',
  },
  'negocio.suspender': {
    motivo: true, evidencia: true, mfa: true, dobleAprobacion: true,
    aprobadores: APROBADORES_CONCESIONES, etiqueta: 'Suspension de negocio',
  },
  'negocio.reactivar': {
    motivo: true, evidencia: false, mfa: true, dobleAprobacion: false,
    aprobadores: APROBADORES_CONCESIONES, etiqueta: 'Reactivacion de negocio',
  },
  'permiso.suspender': {
    motivo: true, evidencia: true, mfa: true, dobleAprobacion: false,
    aprobadores: APROBADORES_CONCESIONES, etiqueta: 'Suspension de permiso',
  },
  'usuario.cambiar_rol': {
    motivo: true, evidencia: false, mfa: true, dobleAprobacion: true,
    aprobadores: ['inparques.superadmin'], etiqueta: 'Cambio de permisos de usuario',
  },
  'usuario.revocar_sesion': {
    motivo: true, evidencia: false, mfa: false, dobleAprobacion: false,
    aprobadores: NINGUNO, etiqueta: 'Revocacion de sesion',
  },
  'factura.nota_credito': {
    motivo: true, evidencia: true, mfa: false, dobleAprobacion: false,
    aprobadores: APROBADORES_FINANZAS, etiqueta: 'Emision de nota de credito',
  },
  'liquidacion.cerrar': {
    motivo: true, evidencia: false, mfa: true, dobleAprobacion: true,
    aprobadores: APROBADORES_FINANZAS, etiqueta: 'Cierre de liquidacion',
  },
  'orden.cancelar': {
    motivo: true, evidencia: false, mfa: false, dobleAprobacion: false,
    aprobadores: NINGUNO, etiqueta: 'Cancelacion de orden',
  },
  'contrato.editar': {
    motivo: true, evidencia: true, mfa: true, dobleAprobacion: false,
    aprobadores: APROBADORES_CONCESIONES, etiqueta: 'Modificacion de condiciones economicas',
  },
  'reglas.editar': {
    motivo: true, evidencia: false, mfa: true, dobleAprobacion: true,
    aprobadores: ['inparques.superadmin'], etiqueta: 'Cambio de reglas globales',
  },
};

/** Umbral por encima del cual un reembolso exige ademas doble aprobacion. */
export const UMBRAL_REEMBOLSO_ALTO_USD = 50;

export function requisitosDe(accion: AccionSensible, contexto?: { montoUsd?: number }): Requisitos {
  const base = CATALOGO[accion];
  const req: Requisitos = { confirmacion: true, ...base };

  if (
    (accion === 'reembolso.aprobar' || accion === 'reembolso.solicitar') &&
    (contexto?.montoUsd ?? 0) >= UMBRAL_REEMBOLSO_ALTO_USD
  ) {
    req.dobleAprobacion = true;
    req.mfa = true;
  }
  return req;
}

export interface IntentoAccion {
  accion: AccionSensible;
  rol: RoleId;
  /** Quien ejecuta. Necesario para que nadie se apruebe a si mismo. */
  usuarioId?: string;
  motivo?: string;
  evidencia?: string;
  mfaVerificado?: boolean;
  aprobadoPor?: { usuarioId: string; rol: RoleId };
  montoUsd?: number;
}

export type Validacion =
  | { ok: true }
  | { ok: false; faltan: Array<'motivo' | 'evidencia' | 'mfa' | 'aprobacion'>; mensaje: string };

export function validarAccion(intento: IntentoAccion): Validacion {
  const req = requisitosDe(intento.accion, { montoUsd: intento.montoUsd });
  const faltan: Array<'motivo' | 'evidencia' | 'mfa' | 'aprobacion'> = [];

  if (req.motivo && !intento.motivo?.trim()) faltan.push('motivo');
  if (req.evidencia && !intento.evidencia?.trim()) faltan.push('evidencia');
  // El MFA solo se exige a roles que lo tienen habilitado por definicion.
  if (req.mfa && ROLES[intento.rol].requiereMfa && !intento.mfaVerificado) faltan.push('mfa');
  if (req.dobleAprobacion) {
    // La segregacion de funciones es entre *personas*, no entre cargos.
    //
    // Antes se exigia que el aprobador tuviera un rol distinto al de quien
    // actuaba, y eso dejaba dos acciones muertas: `usuario.cambiar_rol` y
    // `reglas.editar` solo admiten aprobadores superadmin, asi que un
    // superadmin no podia completarlas nunca —no existe aprobador valido con
    // otro rol—. Con la regla por persona, dos superadministradores se
    // aprueban entre si y ninguno se aprueba a si mismo, que es justo lo que
    // pide un control de cuatro ojos.
    const a = intento.aprobadoPor;
    const mismaPersona = Boolean(a && intento.usuarioId && a.usuarioId === intento.usuarioId);
    const valido = a && req.aprobadores.includes(a.rol) && !mismaPersona;
    if (!valido) faltan.push('aprobacion');
  }

  if (faltan.length === 0) return { ok: true };

  const textos: Record<string, string> = {
    motivo: 'indicar el motivo',
    evidencia: 'adjuntar evidencia',
    mfa: 'verificar el segundo factor',
    aprobacion: 'contar con una segunda aprobacion',
  };
  return {
    ok: false,
    faltan,
    mensaje: `Para completar "${req.etiqueta}" falta ${faltan.map((f) => textos[f]).join(', ')}.`,
  };
}

/**
 * Registros que nunca admiten borrado ni edicion directa.
 * El intento se rechaza en el modelo, no ocultando el boton en la vista.
 */
export const ENTIDADES_INMUTABLES = [
  'auditoria',
  'cierre',
  'turno_cerrado',
  'liquidacion_cerrada',
  'factura_emitida',
  'pago_confirmado',
] as const;

export class OperacionProhibida extends Error {
  constructor(entidad: string, operacion: string, alternativa: string) {
    super(
      `No se permite ${operacion} sobre ${entidad}. Corrija mediante ${alternativa} para conservar la trazabilidad.`,
    );
    this.name = 'OperacionProhibida';
  }
}

export function exigirMutable(entidad: string, operacion: 'borrar' | 'editar'): void {
  if ((ENTIDADES_INMUTABLES as readonly string[]).includes(entidad)) {
    const alternativa =
      entidad === 'auditoria'
        ? 'un nuevo evento de auditoria'
        : entidad === 'factura_emitida'
          ? 'una nota de credito o debito'
          : 'un ajuste o reverso autorizado';
    throw new OperacionProhibida(entidad, operacion, alternativa);
  }
}
