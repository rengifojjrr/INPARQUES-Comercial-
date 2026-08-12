/**
 * Conectividad degradada.
 *
 * Documento, seccion 06: "Conectividad degradada no es todo offline. El
 * comercio puede consultar datos cacheados y encolar cambios; sin conexion no
 * se puede prometer verificacion bancaria ni factura digital en tiempo real."
 *
 * De ahi los tres modos: conectado, degradado (lectura de cache + cola) y sin
 * conexion. Y de ahi la regla dura de `puedePrometer()`.
 */

export type ModoConexion = 'conectado' | 'degradado' | 'sin_conexion';

type Oyente = (modo: ModoConexion) => void;

class Conectividad {
  private modo: ModoConexion = 'conectado';
  private oyentes = new Set<Oyente>();
  /** true cuando el modo lo fijo el control de demostracion, no el navegador. */
  private forzado = false;

  iniciar(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => {
      if (!this.forzado) this.establecer('conectado');
    });
    window.addEventListener('offline', () => {
      if (!this.forzado) this.establecer('sin_conexion');
    });
    if (!this.forzado && typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.modo = 'sin_conexion';
    }
  }

  actual(): ModoConexion {
    return this.modo;
  }

  hayRed(): boolean {
    return this.modo === 'conectado';
  }

  establecer(modo: ModoConexion, forzado = false): void {
    if (this.modo === modo && this.forzado === forzado) return;
    this.modo = modo;
    this.forzado = forzado;
    for (const o of this.oyentes) o(modo);
  }

  /** Control de demostracion: alterna sin desconectar el equipo. */
  alternarDemo(): ModoConexion {
    const siguiente: ModoConexion =
      this.modo === 'conectado' ? 'degradado' : this.modo === 'degradado' ? 'sin_conexion' : 'conectado';
    this.establecer(siguiente, siguiente !== 'conectado');
    return siguiente;
  }

  suscribir(o: Oyente): () => void {
    this.oyentes.add(o);
    return () => this.oyentes.delete(o);
  }

  /**
   * Regla dura: sin conexion no puede prometerse un pago confirmado, una
   * factura emitida ni una liquidacion conciliada. La interfaz debe mostrar
   * esos registros como pendientes de sincronizacion, nunca como cerrados.
   */
  puedePrometer(promesa: 'pago_confirmado' | 'factura_emitida' | 'liquidacion_conciliada'): boolean {
    void promesa;
    return this.modo === 'conectado';
  }

  etiqueta(): string {
    return {
      conectado: 'Conectado',
      degradado: 'Conexion degradada',
      sin_conexion: 'Sin conexion',
    }[this.modo];
  }
}

export const conectividad = new Conectividad();
