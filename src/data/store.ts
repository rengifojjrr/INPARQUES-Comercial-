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

/**
 * Canal entre pestanas del mismo navegador.
 *
 * Cada pestana guardaba su copia entera del estado, asi que dos abiertas a la
 * vez se pisaban: la segunda en escribir borraba lo que habia hecho la
 * primera. Y es justo el montaje que se usa para ensenar la demo —el
 * visitante en una pestana, el comercio en otra—. Ahora cada escritura se
 * anuncia y las demas pestanas releen antes de seguir.
 */
const CANAL = 'inparques.demo.estado';

export class Store {
  private estado: DemoState;
  private oyentes = new Set<Oyente>();
  private guardadoPendiente: ReturnType<typeof setTimeout> | null = null;
  private canal: BroadcastChannel | null = null;
  /** Marca de la ultima escritura propia, para ignorar el eco. */
  private marca = Math.random().toString(36).slice(2);

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
    this.escucharOtrasPestanas();
    this.notificar();
    return this.estado;
  }

  /**
   * Otra pestana escribio: se relee lo persistido y se repinta.
   *
   * Se relee del almacen en vez de fiarse del mensaje porque el estado entero
   * no cabe comodamente en un mensaje y porque el almacen es la verdad.
   */
  private escucharOtrasPestanas(): void {
    if (typeof window === 'undefined' || this.canal) return;
    if (typeof BroadcastChannel === 'undefined') {
      // Navegador sin BroadcastChannel: el evento `storage` de localStorage
      // sirve igual, y solo llega a las *otras* pestanas.
      window.addEventListener('storage', (ev) => {
        if (ev.key === CANAL) void this.recargarDesdeAlmacen();
      });
      return;
    }
    this.canal = new BroadcastChannel(CANAL);
    this.canal.onmessage = (ev: MessageEvent<{ marca: string }>) => {
      if (ev.data?.marca === this.marca) return;   // es mi propio eco
      void this.recargarDesdeAlmacen();
    };

    // El aviso puede llegar tarde o perderse. Volver a una pestana es el
    // momento natural para releer: es justo antes de que el usuario actue,
    // que es cuando importa no partir de una copia vieja.
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.recargarDesdeAlmacen();
    });
    window.addEventListener('focus', () => void this.recargarDesdeAlmacen());

    // Y al cerrar o esconder la pestana se vuelca lo que quede pendiente: el
    // guardado va con 150 ms de retardo, asi que quien pagaba y cerraba de
    // inmediato —normal en un telefono— podia perder la ultima escritura.
    const volcar = (): void => {
      if (!this.guardadoPendiente) return;
      clearTimeout(this.guardadoPendiente);
      this.guardadoPendiente = null;
      void this.backend.escribir(this.estado);
    };
    window.addEventListener('pagehide', volcar);
    window.addEventListener('beforeunload', volcar);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') volcar();
    });
  }

  private async recargarDesdeAlmacen(): Promise<void> {
    const guardado = await this.backend.leer();
    if (guardado && guardado.version === VERSION_DATOS) {
      this.estado = guardado;
      this.notificar();
    }
  }

  private anunciarEscritura(): void {
    try {
      this.canal?.postMessage({ marca: this.marca });
      if (!this.canal && typeof window !== 'undefined' && 'localStorage' in window) {
        window.localStorage.setItem(CANAL, `${Date.now()}:${this.marca}`);
      }
    } catch {
      /* sin canal disponible: la pestana sigue funcionando sola */
    }
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
      void this.backend.escribir(this.estado).then(() => this.anunciarEscritura());
    }, 150);
  }
}

/** Instancia compartida por la aplicacion. Las pruebas crean la suya. */
export const store = new Store();

export function crearStoreDePrueba(): Store {
  return new Store(memoria());
}
