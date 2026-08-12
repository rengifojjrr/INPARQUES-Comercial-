/**
 * Almacen unico de la demo.
 *
 * Una sola base de datos para las tres superficies: lo que cambia el operador
 * lo ve el visitante y lo ve INPARQUES, porque leen el mismo estado.
 *
 * Persistencia: IndexedDB cuando esta disponible, localStorage como respaldo
 * y memoria en las pruebas. El backend se elige solo; el resto del codigo no
 * sabe cual esta activo.
 */

import type { DemoState } from '../domain/types';
import { construirEstadoInicial, VERSION_DATOS } from './seed';

const CLAVE = 'inparques.demo.estado';
const DB_NOMBRE = 'inparques-comercial';
const DB_ALMACEN = 'estado';

// ---------------------------------------------------------------------------
// Backends
// ---------------------------------------------------------------------------

export interface Backend {
  nombre: string;
  leer(): Promise<DemoState | null>;
  escribir(estado: DemoState): Promise<void>;
  limpiar(): Promise<void>;
}

const memoria = (): Backend => {
  let dato: DemoState | null = null;
  return {
    nombre: 'memoria',
    async leer() { return dato; },
    async escribir(e) { dato = e; },
    async limpiar() { dato = null; },
  };
};

const local = (): Backend => ({
  nombre: 'localStorage',
  async leer() {
    const crudo = window.localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as DemoState) : null;
  },
  async escribir(e) {
    window.localStorage.setItem(CLAVE, JSON.stringify(e));
  },
  async limpiar() {
    window.localStorage.removeItem(CLAVE);
  },
});

const indexado = (): Backend => {
  const abrir = () =>
    new Promise<IDBDatabase>((res, rej) => {
      const req = window.indexedDB.open(DB_NOMBRE, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(DB_ALMACEN)) {
          req.result.createObjectStore(DB_ALMACEN);
        }
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });

  const tx = async <T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> => {
    const db = await abrir();
    return new Promise<T>((res, rej) => {
      const t = db.transaction(DB_ALMACEN, modo);
      const req = fn(t.objectStore(DB_ALMACEN));
      req.onsuccess = () => res(req.result as T);
      req.onerror = () => rej(req.error);
      t.oncomplete = () => db.close();
    });
  };

  return {
    nombre: 'indexedDB',
    async leer() {
      return (await tx<DemoState | undefined>('readonly', (s) => s.get(CLAVE))) ?? null;
    },
    async escribir(e) {
      await tx('readwrite', (s) => s.put(e, CLAVE));
    },
    async limpiar() {
      await tx('readwrite', (s) => s.delete(CLAVE));
    },
  };
};

export function elegirBackend(): Backend {
  if (typeof window === 'undefined') return memoria();
  try {
    if ('indexedDB' in window && window.indexedDB) return indexado();
  } catch {
    /* algunos navegadores lanzan al consultar indexedDB en modo privado */
  }
  try {
    if ('localStorage' in window) return local();
  } catch {
    /* sin almacenamiento disponible */
  }
  return memoria();
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

type Oyente = (estado: DemoState) => void;

export class Store {
  private estado: DemoState;
  private oyentes = new Set<Oyente>();
  private guardadoPendiente: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly backend: Backend = elegirBackend(),
    estadoInicial?: DemoState,
  ) {
    this.estado = estadoInicial ?? construirEstadoInicial();
  }

  get backendNombre(): string {
    return this.backend.nombre;
  }

  /** Carga lo persistido; si no hay nada o cambio la version, siembra. */
  async iniciar(): Promise<DemoState> {
    const guardado = await this.backend.leer();
    if (guardado && guardado.version === VERSION_DATOS) {
      this.estado = guardado;
    } else {
      this.estado = construirEstadoInicial();
      await this.backend.escribir(this.estado);
    }
    this.notificar();
    return this.estado;
  }

  leer(): DemoState {
    return this.estado;
  }

  /**
   * Unica via de escritura. Recibe una funcion que muta un borrador; asi
   * ninguna vista puede escribir el estado sin pasar por aqui.
   */
  actualizar(fn: (borrador: DemoState) => void): DemoState {
    const borrador: DemoState = structuredClone(this.estado);
    fn(borrador);
    this.estado = borrador;
    this.notificar();
    this.programarGuardado();
    return this.estado;
  }

  suscribir(o: Oyente): () => void {
    this.oyentes.add(o);
    return () => this.oyentes.delete(o);
  }

  /** Restablece la demo a sus datos iniciales. */
  async restablecer(): Promise<DemoState> {
    await this.backend.limpiar();
    this.estado = construirEstadoInicial();
    await this.backend.escribir(this.estado);
    this.notificar();
    return this.estado;
  }

  /** Fuerza el guardado inmediato; util antes de recargar o exportar. */
  async guardarAhora(): Promise<void> {
    if (this.guardadoPendiente) {
      clearTimeout(this.guardadoPendiente);
      this.guardadoPendiente = null;
    }
    await this.backend.escribir(this.estado);
  }

  exportarJson(): string {
    return JSON.stringify(this.estado, null, 2);
  }

  private notificar(): void {
    for (const o of this.oyentes) o(this.estado);
  }

  private programarGuardado(): void {
    if (typeof setTimeout !== 'function') return;
    if (this.guardadoPendiente) clearTimeout(this.guardadoPendiente);
    this.guardadoPendiente = setTimeout(() => {
      this.guardadoPendiente = null;
      void this.backend.escribir(this.estado);
    }, 150);
  }
}

/** Instancia compartida por la aplicacion. Las pruebas crean la suya. */
export const store = new Store();

export function crearStoreDePrueba(): Store {
  return new Store(memoria());
}
