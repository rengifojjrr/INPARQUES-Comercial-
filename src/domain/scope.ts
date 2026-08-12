/**
 * Resolucion de ambito.
 *
 * Documento, seccion 02: "Nacional -> region/estado -> parque -> zona ->
 * punto comercial -> negocio legal -> local/catalogo. Esta jerarquia permite
 * que un usuario vea unicamente la informacion de su ambito y que un mismo
 * negocio opere en mas de un punto."
 *
 * El filtrado ocurre aqui, sobre los datos, no en la vista. Una tabla que
 * recibe una lista ya filtrada no puede filtrar de menos por descuido.
 */

import type { DemoState, ID, Scope, User } from './types';

export interface AmbitoResuelto {
  parqueIds: ID[];
  negocioIds: ID[];
  localIds: ID[];
  /** true = alcance nacional sin restriccion de parque. */
  nacional: boolean;
}

export function resolverAmbito(usuario: User, estado: DemoState): AmbitoResuelto {
  const { scope } = usuario;

  const todoParques = estado.parques.map((p) => p.id);
  const todoNegocios = estado.negocios.map((n) => n.id);
  const todoLocales = estado.locales.map((l) => l.id);

  switch (scope.level) {
    case 'nacional':
      return { parqueIds: todoParques, negocioIds: todoNegocios, localIds: todoLocales, nacional: true };

    case 'region': {
      const parqueIds = estado.parques.filter((p) => scope.ids.includes(p.regionId)).map((p) => p.id);
      return conParques(parqueIds, estado);
    }

    case 'parque':
      return conParques(scope.ids, estado);

    case 'zona': {
      const parqueIds = [
        ...new Set(estado.zonas.filter((z) => scope.ids.includes(z.id)).map((z) => z.parqueId)),
      ];
      const localIds = estado.locales
        .filter((l) => {
          const punto = estado.puntos.find((p) => p.id === l.puntoId);
          return punto ? scope.ids.includes(punto.zonaId) : false;
        })
        .map((l) => l.id);
      const negocioIds = [
        ...new Set(estado.locales.filter((l) => localIds.includes(l.id)).map((l) => l.negocioId)),
      ];
      return { parqueIds, negocioIds, localIds, nacional: false };
    }

    case 'punto': {
      const locales = estado.locales.filter((l) => scope.ids.includes(l.puntoId));
      return {
        parqueIds: [...new Set(locales.map((l) => l.parqueId))],
        negocioIds: [...new Set(locales.map((l) => l.negocioId))],
        localIds: locales.map((l) => l.id),
        nacional: false,
      };
    }

    case 'negocio': {
      const locales = estado.locales.filter((l) => scope.ids.includes(l.negocioId));
      return {
        parqueIds: [...new Set(locales.map((l) => l.parqueId))],
        negocioIds: [...scope.ids],
        localIds: locales.map((l) => l.id),
        nacional: false,
      };
    }

    case 'local': {
      const locales = estado.locales.filter((l) => scope.ids.includes(l.id));
      return {
        parqueIds: [...new Set(locales.map((l) => l.parqueId))],
        negocioIds: [...new Set(locales.map((l) => l.negocioId))],
        localIds: locales.map((l) => l.id),
        nacional: false,
      };
    }

    case 'propio':
    default:
      // El visitante no tiene ambito institucional: ve la oferta publica y
      // sus propias ordenes. El filtrado por pertenencia va aparte.
      return { parqueIds: todoParques, negocioIds: [], localIds: [], nacional: false };
  }
}

function conParques(parqueIds: ID[], estado: DemoState): AmbitoResuelto {
  const locales = estado.locales.filter((l) => parqueIds.includes(l.parqueId));
  return {
    parqueIds: [...parqueIds],
    negocioIds: [...new Set(locales.map((l) => l.negocioId))],
    localIds: locales.map((l) => l.id),
    nacional: false,
  };
}

// --- Comprobaciones puntuales ---------------------------------------------

export function alcanzaParque(a: AmbitoResuelto, parqueId: ID): boolean {
  return a.nacional || a.parqueIds.includes(parqueId);
}

export function alcanzaNegocio(a: AmbitoResuelto, negocioId: ID): boolean {
  return a.nacional || a.negocioIds.includes(negocioId);
}

export function alcanzaLocal(a: AmbitoResuelto, localId: ID): boolean {
  return a.nacional || a.localIds.includes(localId);
}

/** Filtra cualquier coleccion que declare parque, negocio o local. */
export function filtrarPorAmbito<T extends { parqueId?: ID; negocioId?: ID; localId?: ID }>(
  filas: T[],
  a: AmbitoResuelto,
): T[] {
  if (a.nacional) return filas;
  return filas.filter((f) => {
    if (f.localId !== undefined) return a.localIds.includes(f.localId);
    if (f.negocioId !== undefined) return a.negocioIds.includes(f.negocioId);
    if (f.parqueId !== undefined) return a.parqueIds.includes(f.parqueId);
    return false;
  });
}

// --- Selector de ambito ----------------------------------------------------

export interface OpcionAmbito {
  id: ID;
  etiqueta: string;
  tipo: 'parque' | 'negocio' | 'local';
}

/**
 * Opciones del selector. Solo se muestra cuando hay mas de una: un usuario
 * con un unico parque no necesita elegir.
 */
export function opcionesDeAmbito(usuario: User, estado: DemoState): OpcionAmbito[] {
  const a = resolverAmbito(usuario, estado);

  if (usuario.rol.startsWith('comercio.')) {
    if (usuario.scope.level === 'negocio') {
      return estado.negocios
        .filter((n) => a.negocioIds.includes(n.id))
        .map((n) => ({ id: n.id, etiqueta: n.nombreComercial, tipo: 'negocio' as const }));
    }
    return estado.locales
      .filter((l) => a.localIds.includes(l.id))
      .map((l) => ({ id: l.id, etiqueta: l.nombre, tipo: 'local' as const }));
  }

  return estado.parques
    .filter((p) => a.nacional || a.parqueIds.includes(p.id))
    .map((p) => ({ id: p.id, etiqueta: p.nombre, tipo: 'parque' as const }));
}

export function scopeDe(level: Scope['level'], ...ids: ID[]): Scope {
  return { level, ids };
}
