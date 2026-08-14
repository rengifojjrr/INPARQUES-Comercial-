/**
 * Pertenencia: "¿esto es tuyo?", que no es lo mismo que "¿qué rol tienes?".
 *
 * El router responde lo segundo y `resolverAmbito` filtra las listas, pero
 * hasta ahora ninguna escritura respondia lo primero. El resultado era que un
 * operador de un comercio podia escribir la URL del pedido de otro comercio y
 * operarlo: la pantalla se abria entera —cliente, articulos, pago— con los
 * botones vivos, y el historial quedaba firmado por el. Y un visitante podia
 * abrir el pedido de otro y leer su codigo de retiro, que es lo que se
 * presenta para llevarse la comida.
 *
 * Filtrar listas nunca fue suficiente: esconde el registro, no lo protege.
 * Aqui esta la comprobacion, una sola vez, sobre el dato y no sobre la
 * pantalla. Las vistas la usan para devolver 403 en vez de pintar, y las
 * operaciones para negarse a escribir. Una vista nueva que se olvide de
 * llamarla sigue estando mal, pero la operacion que hay detras ya no.
 */

import type { DemoState, ID, Orden, User } from './types';
import { resolverAmbito } from './scope';

/**
 * Comprobacion "este pedido anonimo lo hizo este dispositivo".
 *
 * El dominio no puede saberlo por si mismo —no hay identidad que consultar—,
 * asi que la interfaz la instala al arrancar. Por defecto niega: si nadie la
 * instala, ningun pedido de invitado se da por propio, que es el lado seguro.
 */
let esDeEsteInvitado: (ordenId: ID) => boolean = () => false;

export function instalarRegistroInvitado(fn: (ordenId: ID) => boolean): void {
  esDeEsteInvitado = fn;
}

export class FueraDeAmbito extends Error {
  constructor(public readonly entidad: string, public readonly entidadId: ID) {
    super(`El registro ${entidad}:${entidadId} esta fuera del ambito del usuario.`);
    this.name = 'FueraDeAmbito';
  }
}

/** Roles institucionales: su alcance es el ambito, no la propiedad. */
function esInstitucional(u: User): boolean {
  return u.rol.startsWith('inparques.');
}

function esComercio(u: User): boolean {
  return u.rol.startsWith('comercio.');
}

// --- Ordenes ---------------------------------------------------------------

/**
 * Quien puede *ver* una orden:
 *  - el visitante que la hizo (o el invitado que la creo en este dispositivo),
 *  - el comercio dueno del local donde se pidio,
 *  - el rol institucional cuyo ambito cubre ese parque.
 */
export function alcanzaOrden(usuario: User | null, orden: Orden, estado: DemoState, invitado = false): boolean {
  // Un invitado no tiene id estable: la unica prueba de que el pedido es suyo
  // es que lo hizo desde este dispositivo. `esDeEsteInvitado` la aporta la
  // interfaz, que es quien lleva ese registro.
  if (!usuario) return invitado && Boolean(orden.invitado) && esDeEsteInvitado(orden.id);

  if (usuario.rol === 'visitante.cliente') {
    if (orden.clienteId === usuario.id) return true;
    return invitado && Boolean(orden.invitado) && esDeEsteInvitado(orden.id);
  }

  const ambito = resolverAmbito(usuario, estado);
  if (ambito.nacional) return true;

  if (esComercio(usuario)) {
    // El comercio ve lo de sus locales; el propietario, lo de todo su negocio.
    return ambito.localIds.includes(orden.localId) || ambito.negocioIds.includes(orden.negocioId);
  }

  if (esInstitucional(usuario)) return ambito.parqueIds.includes(orden.parqueId);

  return false;
}

/** Igual que `alcanzaOrden`, pero lanza. Para las operaciones de escritura. */
export function exigirOrdenPropia(usuario: User | null, orden: Orden, estado: DemoState, invitado = false): void {
  if (!alcanzaOrden(usuario, orden, estado, invitado)) throw new FueraDeAmbito('orden', orden.id);
}

// --- Locales, negocios y articulos -----------------------------------------

export function alcanzaLocalDe(usuario: User | null, localId: ID, estado: DemoState): boolean {
  if (!usuario) return false;
  const a = resolverAmbito(usuario, estado);
  return a.nacional || a.localIds.includes(localId);
}

export function alcanzaNegocioDe(usuario: User | null, negocioId: ID, estado: DemoState): boolean {
  if (!usuario) return false;
  const a = resolverAmbito(usuario, estado);
  return a.nacional || a.negocioIds.includes(negocioId);
}

export function alcanzaArticulo(usuario: User | null, articuloId: ID, estado: DemoState): boolean {
  const art = estado.articulos.find((x) => x.id === articuloId);
  if (!art) return false;
  return alcanzaLocalDe(usuario, art.localId, estado);
}

export function exigirArticuloPropio(usuario: User | null, articuloId: ID, estado: DemoState): void {
  if (!alcanzaArticulo(usuario, articuloId, estado)) throw new FueraDeAmbito('articulo', articuloId);
}

export function exigirLocalPropio(usuario: User | null, localId: ID, estado: DemoState): void {
  if (!alcanzaLocalDe(usuario, localId, estado)) throw new FueraDeAmbito('local', localId);
}

export function exigirNegocioPropio(usuario: User | null, negocioId: ID, estado: DemoState): void {
  if (!alcanzaNegocioDe(usuario, negocioId, estado)) throw new FueraDeAmbito('negocio', negocioId);
}

// --- Turnos de caja --------------------------------------------------------

export function exigirTurnoPropio(usuario: User | null, turnoId: ID, estado: DemoState): void {
  const t = estado.turnos.find((x) => x.id === turnoId);
  if (!t || !alcanzaLocalDe(usuario, t.localId, estado)) throw new FueraDeAmbito('turno', turnoId);
}
