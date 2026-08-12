/**
 * Bitacora de auditoria append-only.
 *
 * Documento, seccion 09: "Auditoria append-only para precios, cuentas
 * bancarias, permisos, reembolsos y cierres."
 *
 * Este modulo expone `registrar` y consultas. No expone borrado ni edicion:
 * la ausencia de esas funciones es el control, no un boton oculto.
 */

import type { DemoState, EventoAuditoria, RoleId, Scope, User } from '../domain/types';
import { exigirMutable } from '../domain/sensitive-actions';

let contador = 0;

function nuevoId(): string {
  contador += 1;
  return `au_${Date.now().toString(36)}_${contador.toString(36)}`;
}

export interface EntradaAuditoria {
  usuario: Pick<User, 'id' | 'nombre' | 'rol'> & { scope: Scope };
  accion: string;
  entidad: string;
  entidadId: string;
  antes?: unknown;
  despues?: unknown;
  motivo?: string;
  evidencia?: string;
  mfaVerificado?: boolean;
  aprobadoPor?: string;
}

export function registrar(estado: DemoState, entrada: EntradaAuditoria): EventoAuditoria {
  const evento: EventoAuditoria = {
    id: nuevoId(),
    en: new Date().toISOString(),
    usuarioId: entrada.usuario.id,
    usuarioNombre: entrada.usuario.nombre,
    rol: entrada.usuario.rol,
    scope: entrada.usuario.scope,
    accion: entrada.accion,
    entidad: entrada.entidad,
    entidadId: entrada.entidadId,
    antes: entrada.antes,
    despues: entrada.despues,
    motivo: entrada.motivo,
    evidencia: entrada.evidencia,
    mfaVerificado: entrada.mfaVerificado ?? false,
    aprobadoPor: entrada.aprobadoPor,
  };
  estado.auditoria.push(evento);
  return evento;
}

export interface FiltroAuditoria {
  desde?: string;
  hasta?: string;
  rol?: RoleId;
  usuarioId?: string;
  entidad?: string;
  entidadId?: string;
  accion?: string;
  texto?: string;
}

export function consultar(estado: DemoState, filtro: FiltroAuditoria = {}): EventoAuditoria[] {
  return estado.auditoria
    .filter((e) => {
      if (filtro.desde && e.en < filtro.desde) return false;
      if (filtro.hasta && e.en > filtro.hasta) return false;
      if (filtro.rol && e.rol !== filtro.rol) return false;
      if (filtro.usuarioId && e.usuarioId !== filtro.usuarioId) return false;
      if (filtro.entidad && e.entidad !== filtro.entidad) return false;
      if (filtro.entidadId && e.entidadId !== filtro.entidadId) return false;
      if (filtro.accion && !e.accion.includes(filtro.accion)) return false;
      if (filtro.texto) {
        const t = filtro.texto.toLowerCase();
        const heno = `${e.usuarioNombre} ${e.accion} ${e.entidad} ${e.entidadId} ${e.motivo ?? ''}`.toLowerCase();
        if (!heno.includes(t)) return false;
      }
      return true;
    })
    .sort((a, b) => b.en.localeCompare(a.en));
}

/** Historial de una entidad concreta, en orden cronologico. */
export function historialDe(estado: DemoState, entidad: string, entidadId: string): EventoAuditoria[] {
  return consultar(estado, { entidad, entidadId }).reverse();
}

/**
 * Guardia explicita. Si algun modulo intenta borrar o editar un registro
 * inmutable, falla aqui con el mensaje que explica la via correcta.
 */
export function comprobarInmutabilidad(entidad: string, operacion: 'borrar' | 'editar'): void {
  exigirMutable(entidad, operacion);
  if (entidad === 'auditoria') {
    throw new Error('La bitacora de auditoria es append-only: no admite borrado ni edicion.');
  }
}
