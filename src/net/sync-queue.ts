/**
 * Cola de sincronizacion.
 *
 * Acciones operativas que el comercio puede encolar sin conexion: aceptar un
 * pedido, marcarlo listo, registrar una venta de mostrador, cambiar la
 * disponibilidad de un articulo.
 *
 * Lo que nunca se encola como hecho: confirmar un pago, emitir una factura o
 * conciliar una liquidacion. Esas requieren red y quedan en espera explicita.
 *
 * Cada entrada lleva clave de idempotencia y version del registro de origen,
 * para poder detectar el conflicto cuando el servidor ya cambio.
 */

import { conectividad } from './connectivity';

export type TipoAccionCola =
  | 'orden.aceptar'
  | 'orden.preparar'
  | 'orden.listo'
  | 'orden.entregar'
  | 'catalogo.disponibilidad'
  | 'caja.venta_mostrador'
  | 'inspeccion.registrar';

export interface AccionEncolada {
  id: string;
  tipo: TipoAccionCola;
  entidadId: string;
  carga: Record<string, unknown>;
  claveIdempotencia: string;
  /** Valor del campo que se pretende cambiar, tal como estaba al encolar. */
  versionOrigen: string;
  encoladaEn: string;
  intentos: number;
  estado: 'pendiente' | 'sincronizando' | 'sincronizada' | 'conflicto' | 'error';
  detalle?: string;
}

export interface Conflicto {
  accion: AccionEncolada;
  valorEsperado: string;
  valorActual: string;
  descripcion: string;
}

type Oyente = (cola: AccionEncolada[]) => void;

/** Resuelve el estado actual del registro para detectar conflictos. */
export type ResolutorVersion = (tipo: TipoAccionCola, entidadId: string) => string | null;

/** Aplica la accion sobre el estado cuando la sincronizacion tiene exito. */
export type Aplicador = (accion: AccionEncolada) => void;

class ColaSincronizacion {
  private cola: AccionEncolada[] = [];
  private oyentes = new Set<Oyente>();
  private n = 0;
  private resolutor: ResolutorVersion = () => null;
  private aplicador: Aplicador = () => {};

  configurar(resolutor: ResolutorVersion, aplicador: Aplicador): void {
    this.resolutor = resolutor;
    this.aplicador = aplicador;
  }

  listar(): AccionEncolada[] {
    return [...this.cola];
  }

  pendientes(): AccionEncolada[] {
    return this.cola.filter((a) => a.estado === 'pendiente' || a.estado === 'conflicto');
  }

  conflictos(): AccionEncolada[] {
    return this.cola.filter((a) => a.estado === 'conflicto');
  }

  encolar(
    tipo: TipoAccionCola,
    entidadId: string,
    carga: Record<string, unknown>,
    versionOrigen: string,
  ): AccionEncolada {
    this.n += 1;
    const clave = `${tipo}:${entidadId}:${versionOrigen}`;

    // Idempotencia: la misma accion sobre la misma version no se duplica.
    const existente = this.cola.find((a) => a.claveIdempotencia === clave && a.estado === 'pendiente');
    if (existente) return existente;

    const accion: AccionEncolada = {
      id: `sq_${this.n}`,
      tipo,
      entidadId,
      carga,
      claveIdempotencia: clave,
      versionOrigen,
      encoladaEn: new Date().toISOString(),
      intentos: 0,
      estado: 'pendiente',
    };
    this.cola.push(accion);
    this.notificar();
    return accion;
  }

  /**
   * Sincroniza todo lo pendiente. Devuelve el resumen para que la interfaz
   * muestre resultados y conflictos, no un simple "listo".
   */
  async sincronizar(): Promise<{ sincronizadas: number; conflictos: Conflicto[]; errores: number }> {
    if (!conectividad.hayRed()) {
      return { sincronizadas: 0, conflictos: [], errores: 0 };
    }

    const conflictos: Conflicto[] = [];
    let sincronizadas = 0;
    let errores = 0;

    for (const accion of this.cola) {
      if (accion.estado !== 'pendiente' && accion.estado !== 'conflicto') continue;

      accion.estado = 'sincronizando';
      accion.intentos += 1;
      this.notificar();

      const actual = this.resolutor(accion.tipo, accion.entidadId);

      if (actual === null) {
        accion.estado = 'error';
        accion.detalle = 'El registro ya no existe.';
        errores += 1;
        continue;
      }

      if (actual !== accion.versionOrigen) {
        accion.estado = 'conflicto';
        accion.detalle = `Se esperaba "${accion.versionOrigen}" y el registro esta en "${actual}".`;
        conflictos.push({
          accion,
          valorEsperado: accion.versionOrigen,
          valorActual: actual,
          descripcion: `La accion se encolo cuando el registro estaba en "${accion.versionOrigen}". Ahora esta en "${actual}".`,
        });
        continue;
      }

      try {
        this.aplicador(accion);
        accion.estado = 'sincronizada';
        sincronizadas += 1;
      } catch (e) {
        accion.estado = 'error';
        accion.detalle = e instanceof Error ? e.message : 'Error desconocido';
        errores += 1;
      }
    }

    this.notificar();
    return { sincronizadas, conflictos, errores };
  }

  /** Resolucion de conflicto: descartar la accion local. */
  descartar(id: string): void {
    this.cola = this.cola.filter((a) => a.id !== id);
    this.notificar();
  }

  /** Resolucion de conflicto: reintentar sobre el estado actual. */
  forzar(id: string): void {
    const a = this.cola.find((x) => x.id === id);
    if (!a) return;
    const actual = this.resolutor(a.tipo, a.entidadId);
    if (actual === null) return;
    a.versionOrigen = actual;
    a.claveIdempotencia = `${a.tipo}:${a.entidadId}:${actual}`;
    a.estado = 'pendiente';
    a.detalle = undefined;
    this.notificar();
  }

  limpiarSincronizadas(): void {
    this.cola = this.cola.filter((a) => a.estado !== 'sincronizada');
    this.notificar();
  }

  vaciar(): void {
    this.cola = [];
    this.notificar();
  }

  suscribir(o: Oyente): () => void {
    this.oyentes.add(o);
    return () => this.oyentes.delete(o);
  }

  private notificar(): void {
    for (const o of this.oyentes) o(this.listar());
  }
}

export const colaSincronizacion = new ColaSincronizacion();
